/**
 * Request Coalescing - Deduplicate In-Flight Requests
 *
 * When cache misses, 1000 users hitting the same endpoint = 1000 identical DB queries.
 * Coalescing combines them into ONE request, all waiters get the same result.
 *
 * This is what Dataloader does, but for any async operation.
 *
 * @example
 * ```typescript
 * const coalescer = new RequestCoalescer<User>();
 *
 * // 100 concurrent calls for user:123 → ONE database query
 * const results = await Promise.all([
 *   coalescer.execute('user:123', () => fetchUser(123)),
 *   coalescer.execute('user:123', () => fetchUser(123)),
 *   coalescer.execute('user:123', () => fetchUser(123)),
 *   // ... 97 more
 * ]);
 *
 * // All 100 get the same result from 1 query
 * console.log(coalescer.getStats()); // { dedupedRequests: 99, actualRequests: 1 }
 * ```
 *
 * @example With TTL Cache
 * ```typescript
 * const coalescer = new RequestCoalescer<User>({
 *   cacheTtlMs: 5000,  // Cache result for 5s
 * });
 *
 * await coalescer.execute('user:123', fetchUser); // Fetches
 * await coalescer.execute('user:123', fetchUser); // Returns cached
 * await sleep(6000);
 * await coalescer.execute('user:123', fetchUser); // Fetches again (expired)
 * ```
 */

import { Result, Ok, Err } from '../result';
import { metrics, generateTraceId } from '../metrics';
import { sanitizeName, validateCoalescerConfig, checkRegistrySize, LIMITS } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface CoalescerConfig {
  /** Cache successful results for this long (ms). 0 = no caching. Default: 0 */
  cacheTtlMs?: number;
  /** Cache errors too? Default: false */
  cacheErrors?: boolean;
  /** Error cache TTL if different from success TTL. Default: 1000 */
  errorCacheTtlMs?: number;
  /** Max entries in cache (LRU eviction). Default: 1000 */
  maxCacheSize?: number;
  /** Name for metrics. Default: 'coalescer' */
  name?: string;
}

export interface CoalescerStats {
  name: string;
  /** Requests that were deduplicated (piggy-backed on existing) */
  dedupedRequests: number;
  /** Requests that triggered actual execution */
  actualRequests: number;
  /** Cache hits */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
  /** Currently in-flight requests */
  inFlight: number;
  /** Current cache size */
  cacheSize: number;
  /** Dedup ratio (higher = more efficient) */
  dedupRatio: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  waiters: number;
  startTime: number;
}

interface CachedResult<T> {
  value: T | Error;
  isError: boolean;
  expiresAt: number;
  cachedAt: number;
}

// ============================================================================
// REQUEST COALESCER
// ============================================================================

export class RequestCoalescer<T> {
  private readonly config: Required<CoalescerConfig>;
  private readonly inFlight = new Map<string, InFlightRequest<T>>();
  private readonly cache = new Map<string, CachedResult<T>>();
  private readonly cacheOrder: string[] = []; // For LRU

  private stats = {
    dedupedRequests: 0,
    actualRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config: CoalescerConfig = {}) {
    // Validate all config through security layer
    const validated = validateCoalescerConfig(
      config.name ?? 'coalescer',
      config as Record<string, unknown>
    );

    this.config = validated;
  }

  /**
   * Execute an operation, coalescing with any identical in-flight request.
   *
   * @param key - Unique key for this request (e.g., 'user:123')
   * @param operation - The operation to execute
   */
  async execute(
    key: string,
    operation: () => T | Promise<T>
  ): Promise<Result<T, Error>> {
    const traceId = generateTraceId();

    // Check cache first
    const cached = this.getFromCache(key);
    if (cached !== null) {
      this.stats.cacheHits++;
      if (cached.isError) {
        return Err(cached.value as Error);
      }
      return Ok(cached.value as T);
    }
    this.stats.cacheMisses++;

    // Check for in-flight request with same key
    const existing = this.inFlight.get(key);
    if (existing) {
      this.stats.dedupedRequests++;
      existing.waiters++;

      try {
        const value = await existing.promise;
        return Ok(value);
      } catch (error) {
        return Err(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Execute new request
    this.stats.actualRequests++;
    const startTime = Date.now();

    const promise = (async () => {
      try {
        const value = await operation();

        // Cache success
        if (this.config.cacheTtlMs > 0) {
          this.setCache(key, value, false, this.config.cacheTtlMs);
        }

        const elapsed = Date.now() - startTime;
        const waiterCount = this.inFlight.get(key)?.waiters ?? 0;

        metrics.emitSuccess({
          operation: this.config.name,
          attempts: 1,
          elapsed,
          fromFallback: false,
          labels: {
            operation: this.config.name,
            trace_id: traceId,
          },
          timestamp: Date.now(),
          traceId,
        });

        if (waiterCount > 0) {
          // Log coalescing efficiency
          metrics.emitSuccess({
            operation: `${this.config.name}:coalesced`,
            attempts: waiterCount + 1,
            elapsed: 0,
            fromFallback: false,
            labels: {
              operation: this.config.name,
              trace_id: traceId,
            },
            timestamp: Date.now(),
            traceId,
          });
        }

        return value;
      } catch (error) {
        // Cache error if configured
        if (this.config.cacheErrors && this.config.errorCacheTtlMs > 0) {
          this.setCache(
            key,
            error instanceof Error ? error : new Error(String(error)),
            true,
            this.config.errorCacheTtlMs
          );
        }

        throw error;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, {
      promise,
      waiters: 0,
      startTime,
    });

    try {
      const value = await promise;
      return Ok(value);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Execute with a custom key generator.
   */
  async executeWithKey<Args extends unknown[]>(
    keyFn: (...args: Args) => string,
    operation: (...args: Args) => T | Promise<T>,
    ...args: Args
  ): Promise<Result<T, Error>> {
    const key = keyFn(...args);
    return this.execute(key, () => operation(...args));
  }

  /**
   * Invalidate a cached entry.
   */
  invalidate(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    const orderIndex = this.cacheOrder.indexOf(key);
    if (orderIndex !== -1) {
      this.cacheOrder.splice(orderIndex, 1);
    }
    return existed;
  }

  /**
   * Invalidate entries matching a pattern.
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.invalidate(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache and reset stats.
   */
  clear(): void {
    this.cache.clear();
    this.cacheOrder.length = 0;
    this.stats = {
      dedupedRequests: 0,
      actualRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Get current stats.
   */
  getStats(): CoalescerStats {
    const totalRequests = this.stats.actualRequests + this.stats.dedupedRequests;
    const totalCacheAccess = this.stats.cacheHits + this.stats.cacheMisses;

    return {
      name: this.config.name,
      dedupedRequests: this.stats.dedupedRequests,
      actualRequests: this.stats.actualRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      inFlight: this.inFlight.size,
      cacheSize: this.cache.size,
      dedupRatio: totalRequests > 0
        ? this.stats.dedupedRequests / totalRequests
        : 0,
      cacheHitRatio: totalCacheAccess > 0
        ? this.stats.cacheHits / totalCacheAccess
        : 0,
    };
  }

  /**
   * Get all in-flight request keys.
   */
  getInFlightKeys(): string[] {
    return Array.from(this.inFlight.keys());
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getFromCache(key: string): CachedResult<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check expiry
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      const orderIndex = this.cacheOrder.indexOf(key);
      if (orderIndex !== -1) {
        this.cacheOrder.splice(orderIndex, 1);
      }
      return null;
    }

    // Move to end (most recently used)
    const orderIndex = this.cacheOrder.indexOf(key);
    if (orderIndex !== -1) {
      this.cacheOrder.splice(orderIndex, 1);
      this.cacheOrder.push(key);
    }

    return cached;
  }

  private setCache(key: string, value: T | Error, isError: boolean, ttlMs: number): void {
    // Evict if at capacity (LRU)
    while (this.cache.size >= this.config.maxCacheSize && this.cacheOrder.length > 0) {
      const oldest = this.cacheOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      value,
      isError,
      expiresAt: Date.now() + ttlMs,
      cachedAt: Date.now(),
    });

    // Add to order (most recent at end)
    const existingIndex = this.cacheOrder.indexOf(key);
    if (existingIndex !== -1) {
      this.cacheOrder.splice(existingIndex, 1);
    }
    this.cacheOrder.push(key);
  }
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Create a coalescer for API calls with automatic key generation.
 */
export function createApiCoalescer<T>(
  name: string,
  config: Omit<CoalescerConfig, 'name'> = {}
): RequestCoalescer<T> {
  return new RequestCoalescer<T>({
    ...config,
    name,
    cacheTtlMs: config.cacheTtlMs ?? 5000, // Default 5s cache for APIs
  });
}

/**
 * Create a coalescer for database queries.
 */
export function createDbCoalescer<T>(
  name: string,
  config: Omit<CoalescerConfig, 'name'> = {}
): RequestCoalescer<T> {
  return new RequestCoalescer<T>({
    ...config,
    name,
    cacheTtlMs: config.cacheTtlMs ?? 1000, // Shorter cache for DB
    maxCacheSize: config.maxCacheSize ?? 5000, // Larger cache
  });
}

// ============================================================================
// GLOBAL COALESCER REGISTRY
// ============================================================================

const coalescerRegistry = new Map<string, RequestCoalescer<unknown>>();

/**
 * Get or create a shared coalescer.
 */
export function getCoalescer<T>(name: string, config?: CoalescerConfig): RequestCoalescer<T> {
  const sanitizedName = sanitizeName(name);
  let coalescer = coalescerRegistry.get(sanitizedName) as RequestCoalescer<T> | undefined;
  if (!coalescer) {
    // Prevent registry exhaustion attack
    checkRegistrySize(coalescerRegistry, sanitizedName);
    coalescer = new RequestCoalescer<T>({ ...config, name: sanitizedName });
    coalescerRegistry.set(sanitizedName, coalescer as RequestCoalescer<unknown>);
  }
  return coalescer;
}

/**
 * Get stats from all coalescers.
 */
export function getAllCoalescerStats(): CoalescerStats[] {
  return Array.from(coalescerRegistry.values()).map(c => c.getStats());
}

/**
 * Clear all coalescers (for testing).
 */
export function clearCoalescerRegistry(): void {
  coalescerRegistry.forEach(c => c.clear());
  coalescerRegistry.clear();
}

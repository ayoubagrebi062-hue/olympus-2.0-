/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   REQUEST DEDUPLICATION - One Call, Many Callers                              ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Problem:                                                                    ║
 * ║   - User clicks button twice                                                 ║
 * ║   - React re-renders trigger duplicate requests                              ║
 * ║   - Multiple components need same data                                       ║
 * ║                                                                               ║
 * ║   Without dedup:                                                              ║
 * ║     Request A ──────────────────▶ API ──▶ Response                           ║
 * ║     Request A ──────────────────▶ API ──▶ Response (wasted!)                 ║
 * ║     Request A ──────────────────▶ API ──▶ Response (wasted!)                 ║
 * ║                                                                               ║
 * ║   With dedup:                                                                 ║
 * ║     Request A ──┬───────────────▶ API ──▶ Response                           ║
 * ║     Request A ──┤                              ▼                              ║
 * ║     Request A ──┴─────────────────────────────▶ (same response)              ║
 * ║                                                                               ║
 * ║   "The fastest API call is the one you don't make."                          ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { Result, VisionError, createError, VisionErrorCode, Err } from './result';
import { RequestContext } from './context';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface InFlightRequest<T> {
  promise: Promise<Result<T, VisionError>>;
  key: string;
  startedAt: number;
  callerCount: number;
}

export interface DedupOptions {
  /** How to generate a cache key from arguments */
  keyFn?: (...args: unknown[]) => string;

  /** Maximum time to keep a request in-flight (ms) */
  maxAgeMs?: number;

  /** Called when a request is deduplicated */
  onDedup?: (key: string, callerCount: number) => void;
}

export interface DedupStats {
  inFlightCount: number;
  totalRequests: number;
  deduplicatedRequests: number;
  dedupRate: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// REQUEST DEDUPLICATOR
// ════════════════════════════════════════════════════════════════════════════════

export class RequestDeduplicator<T> {
  private inFlight = new Map<string, InFlightRequest<T>>();
  private stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
  };

  private readonly keyFn: (...args: unknown[]) => string;
  private readonly maxAgeMs: number;
  private readonly onDedup?: (key: string, callerCount: number) => void;

  constructor(options: DedupOptions = {}) {
    this.keyFn = options.keyFn ?? defaultKeyFn;
    this.maxAgeMs = options.maxAgeMs ?? 60000; // 1 minute default
    this.onDedup = options.onDedup;
  }

  /**
   * Execute a function, deduplicating concurrent identical requests
   */
  async execute(
    fn: () => Promise<Result<T, VisionError>>,
    ctx?: RequestContext,
    ...keyArgs: unknown[]
  ): Promise<Result<T, VisionError>> {
    this.stats.totalRequests++;
    this.pruneStale();

    const key = this.keyFn(...keyArgs);

    // Check if there's already an in-flight request
    const existing = this.inFlight.get(key);
    if (existing) {
      existing.callerCount++;
      this.stats.deduplicatedRequests++;
      this.onDedup?.(key, existing.callerCount);
      return existing.promise;
    }

    // Start new request
    const promise = this.executeWithCleanup(fn, key, ctx);

    this.inFlight.set(key, {
      promise,
      key,
      startedAt: Date.now(),
      callerCount: 1,
    });

    return promise;
  }

  /**
   * Check if a request with this key is in-flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Get current statistics
   */
  getStats(): DedupStats {
    const total = this.stats.totalRequests;
    const deduped = this.stats.deduplicatedRequests;

    return {
      inFlightCount: this.inFlight.size,
      totalRequests: total,
      deduplicatedRequests: deduped,
      dedupRate: total > 0 ? deduped / total : 0,
    };
  }

  /**
   * Cancel all in-flight requests (they'll return a cancelled error)
   */
  cancelAll(): void {
    // Note: This doesn't actually cancel the underlying promises,
    // it just clears our tracking. The promises will complete but
    // their results won't be used.
    this.inFlight.clear();
  }

  /**
   * Clear statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────────

  private async executeWithCleanup(
    fn: () => Promise<Result<T, VisionError>>,
    key: string,
    ctx?: RequestContext
  ): Promise<Result<T, VisionError>> {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      return Err(
        createError(
          VisionErrorCode.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          {
            cause: error instanceof Error ? error : undefined,
            traceId: ctx?.traceId,
          }
        )
      );
    } finally {
      this.inFlight.delete(key);
    }
  }

  private pruneStale(): void {
    const now = Date.now();
    for (const [key, request] of Array.from(this.inFlight)) {
      if (now - request.startedAt > this.maxAgeMs) {
        this.inFlight.delete(key);
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GLOBAL DEDUPLICATOR
// ════════════════════════════════════════════════════════════════════════════════

const deduplicators = new Map<string, RequestDeduplicator<unknown>>();

/**
 * Get or create a deduplicator by name
 */
export function getDeduplicator<T>(name: string, options?: DedupOptions): RequestDeduplicator<T> {
  let dedup = deduplicators.get(name);
  if (!dedup) {
    dedup = new RequestDeduplicator<T>(options);
    deduplicators.set(name, dedup);
  }
  return dedup as RequestDeduplicator<T>;
}

/**
 * Get all deduplicators and their stats
 */
export function getAllDeduplicatorStats(): Map<string, DedupStats> {
  const stats = new Map<string, DedupStats>();
  for (const [name, dedup] of Array.from(deduplicators)) {
    stats.set(name, dedup.getStats());
  }
  return stats;
}

// ════════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════════

function defaultKeyFn(...args: unknown[]): string {
  return JSON.stringify(args);
}

/**
 * Create a stable hash key from request parameters
 */
export function createRequestKey(params: {
  prompt: string;
  pageType?: string;
  features?: string[];
  style?: unknown;
}): string {
  const normalized = {
    p: params.prompt.trim().toLowerCase().substring(0, 500),
    t: params.pageType || null,
    f: params.features?.slice().sort() || null,
    s: params.style ? JSON.stringify(params.style) : null,
  };

  return JSON.stringify(normalized);
}

/**
 * Decorator to add deduplication to a function
 */
export function deduplicated<T, Args extends unknown[]>(
  name: string,
  fn: (...args: Args) => Promise<Result<T, VisionError>>,
  options?: DedupOptions & { keyFn?: (...args: Args) => string }
): (...args: Args) => Promise<Result<T, VisionError>> {
  const dedup = getDeduplicator<T>(name, options);

  return async (...args: Args) => {
    const key = options?.keyFn ? options.keyFn(...args) : JSON.stringify(args);
    return dedup.execute(() => fn(...args), undefined, key);
  };
}

/**
 * OLYMPUS - BoundedCache Utility
 *
 * SECURITY FIX: Cluster #7 - Static Accumulation Without Cleanup
 * Provides TTL-based expiration, max size limits, and LRU eviction.
 *
 * @version 1.0.0
 */

export interface BoundedCacheConfig {
  /** Maximum number of entries (default: 1000) */
  maxSize: number;
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs: number;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupIntervalMs: number;
  /** Enable automatic cleanup timer (default: true) */
  autoCleanup: boolean;
}

interface CacheEntry<V> {
  value: V;
  createdAt: number;
  lastAccessedAt: number;
}

const DEFAULT_CONFIG: BoundedCacheConfig = {
  maxSize: 1000,
  ttlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  autoCleanup: true,
};

/**
 * A bounded cache with TTL expiration and LRU eviction.
 * Prevents memory leaks from unbounded static collections.
 */
export class BoundedCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private config: BoundedCacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<BoundedCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last accessed time (LRU tracking)
    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  /**
   * Set a value in the cache
   * Evicts LRU entries if max size exceeded
   */
  set(key: K, value: V): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Run cleanup - remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all keys (non-expired)
   */
  keys(): K[] {
    const now = Date.now();
    const result: K[] = [];

    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry, now)) {
        result.push(key);
      }
    }

    return result;
  }

  /**
   * Get all values (non-expired)
   */
  values(): V[] {
    const now = Date.now();
    const result: V[] = [];

    for (const entry of this.cache.values()) {
      if (!this.isExpired(entry, now)) {
        result.push(entry.value);
      }
    }

    return result;
  }

  /**
   * Stop the cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttlMs: this.config.ttlMs,
    };
  }

  // ─────────────── PRIVATE ───────────────

  private isExpired(entry: CacheEntry<V>, now: number = Date.now()): boolean {
    return now - entry.createdAt > this.config.ttlMs;
  }

  private evictLRU(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

/**
 * A bounded array with max size limit.
 * New items push out oldest items when at capacity.
 */
export class BoundedArray<T> {
  private items: T[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift(); // Remove oldest
    }
  }

  get length(): number {
    return this.items.length;
  }

  get all(): T[] {
    return [...this.items];
  }

  slice(start?: number, end?: number): T[] {
    return this.items.slice(start, end);
  }

  clear(): void {
    this.items = [];
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }
}

export default BoundedCache;

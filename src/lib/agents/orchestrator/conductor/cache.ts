/**
 * CACHE
 *
 * In-memory cache with LRU eviction.
 *
 * LESSON: Encapsulation
 * The cache internals are hidden. Users only see:
 * - get(key)
 * - set(key, value)
 * - clear()
 *
 * The implementation (Map, eviction strategy, etc.)
 * can change without affecting callers.
 */

import type { Quality, CacheEntry } from './types';
import { MAX_CACHE_SIZE, CACHE_TTL_MS } from './config';

// ============================================================================
// CACHE STATE
// ============================================================================

/**
 * The actual cache storage.
 *
 * WHY Map?
 * - O(1) get/set operations
 * - Maintains insertion order (for LRU)
 * - Built-in iteration support
 */
const cache = new Map<string, CacheEntry>();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get a cached result.
 *
 * @param key - Cache key (hash of the task)
 * @returns Cached entry or undefined if not found/expired
 */
export function get(key: string): CacheEntry | undefined {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  // Check if expired
  if (isExpired(entry)) {
    cache.delete(key);
    return undefined;
  }

  // Move to end for LRU (delete and re-add)
  cache.delete(key);
  cache.set(key, entry);

  return entry;
}

/**
 * Set a cached result.
 *
 * @param key - Cache key (hash of the task)
 * @param code - Extracted code
 * @param raw - Raw API response
 * @param quality - Quality assessment
 */
export function set(key: string, code: string, raw: string, quality: Quality): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    evictOldest();
  }

  cache.set(key, {
    code,
    raw,
    quality,
    timestamp: Date.now(),
  });
}

/**
 * Check if a key exists in cache (and is not expired).
 */
export function has(key: string): boolean {
  return get(key) !== undefined;
}

/**
 * Delete a specific entry.
 */
export function remove(key: string): boolean {
  return cache.delete(key);
}

/**
 * Clear all cached entries.
 */
export function clear(): void {
  cache.clear();
}

/**
 * Get cache statistics.
 */
export function getStats(): {
  size: number;
  maxSize: number;
  oldestAge: number | null;
} {
  let oldestTimestamp: number | null = null;

  for (const entry of cache.values()) {
    if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  }

  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    oldestAge: oldestTimestamp ? Date.now() - oldestTimestamp : null,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Check if a cache entry has expired.
 */
function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

/**
 * Evict the oldest entry (LRU).
 *
 * WHY LRU?
 * - Simple to implement with Map (first key is oldest)
 * - Good heuristic: old = less likely to be used
 * - O(1) eviction
 */
function evictOldest(): void {
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
}

/**
 * Prune all expired entries.
 *
 * Call this periodically or before operations
 * that iterate the whole cache.
 */
export function pruneExpired(): number {
  let pruned = 0;

  for (const [key, entry] of cache.entries()) {
    if (isExpired(entry)) {
      cache.delete(key);
      pruned++;
    }
  }

  return pruned;
}

// ============================================================================
// WARMING
// ============================================================================

/**
 * Pre-populate cache with common entries.
 *
 * LESSON: Cache warming can improve UX
 * by ensuring common requests are instant.
 *
 * @param entries - Entries to pre-populate
 */
export function warm(
  entries: Array<{
    key: string;
    code: string;
    raw: string;
    quality: Quality;
  }>
): void {
  for (const entry of entries) {
    // Don't exceed capacity
    if (cache.size >= MAX_CACHE_SIZE) {
      break;
    }

    // Don't overwrite existing entries
    if (!cache.has(entry.key)) {
      cache.set(entry.key, {
        code: entry.code,
        raw: entry.raw,
        quality: entry.quality,
        timestamp: Date.now(),
      });
    }
  }
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Export cache to JSON for persistence.
 *
 * LESSON: Allow cache to survive restarts.
 */
export function toJSON(): string {
  const entries: Array<[string, CacheEntry]> = [];

  for (const [key, entry] of cache.entries()) {
    if (!isExpired(entry)) {
      entries.push([key, entry]);
    }
  }

  return JSON.stringify(entries);
}

/**
 * Import cache from JSON.
 */
export function fromJSON(json: string): number {
  try {
    const entries: Array<[string, CacheEntry]> = JSON.parse(json);
    let imported = 0;

    for (const [key, entry] of entries) {
      if (!isExpired(entry) && cache.size < MAX_CACHE_SIZE) {
        cache.set(key, entry);
        imported++;
      }
    }

    return imported;
  } catch {
    return 0;
  }
}

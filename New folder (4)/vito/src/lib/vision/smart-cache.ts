/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   SMART CACHE - Content-Addressed Storage                                      ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   Enterprise caching that remembers what you've built:                        ║
 * ║   - Content-addressed (same prompt = instant cache hit)                       ║
 * ║   - LRU eviction with configurable size limits                                ║
 * ║   - TTL support with automatic expiration                                     ║
 * ║   - Persistence across sessions                                               ║
 * ║   - Semantic similarity matching (optional)                                   ║
 * ║   - Detailed statistics and hit rate tracking                                 ║
 * ║                                                                               ║
 * ║   "The fastest generation is the one you don't have to do"                    ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CacheEntry, CacheStats } from './types';

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_SIZE_MB = 500;
const DEFAULT_MAX_ENTRIES = 10000; // Prevent unbounded growth
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const DEFAULT_CACHE_DIR = './data/cache';
const PERSIST_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
const CLEANUP_INTERVAL_MS = 1000 * 60 * 10; // 10 minutes - cleanup expired items

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface SmartCacheOptions {
  maxSizeMB?: number;
  maxEntries?: number;
  defaultTTL?: number;
  cacheDir?: string;
  persistEnabled?: boolean;
}

interface CacheItem<T> {
  key: string;
  contentHash: string;
  value: T;
  size: number;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  hits: number;
  metadata?: Record<string, unknown>;
}

interface CacheIndex {
  version: number;
  items: {
    key: string;
    contentHash: string;
    size: number;
    createdAt: number;
    expiresAt: number;
    hits: number;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// SMART CACHE
// ════════════════════════════════════════════════════════════════════════════════

export class SmartCache<T = unknown> {
  private items: Map<string, CacheItem<T>> = new Map();
  private hashToKey: Map<string, string> = new Map();
  private maxSizeBytes: number;
  private maxEntries: number;
  private currentSizeBytes: number = 0;
  private defaultTTL: number;
  private cacheDir: string;
  private persistEnabled: boolean;
  private persistTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private initialized = false;
  private isShuttingDown = false;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  constructor(options: SmartCacheOptions = {}) {
    this.maxSizeBytes = (options.maxSizeMB ?? DEFAULT_MAX_SIZE_MB) * 1024 * 1024;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.defaultTTL = options.defaultTTL ?? DEFAULT_TTL_MS;
    this.cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    this.persistEnabled = options.persistEnabled ?? true;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized || this.isShuttingDown) return;

    if (this.persistEnabled) {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadFromDisk();
      this.startPersistTimer();
    }

    // Always start cleanup timer to prevent memory leaks
    this.startCleanupTimer();
    this.initialized = true;
  }

  private startPersistTimer(): void {
    if (this.persistTimer || this.isShuttingDown) return;

    this.persistTimer = setInterval(async () => {
      if (this.isShuttingDown) return;
      try {
        await this.persistToDisk();
      } catch (error) {
        console.error('[SmartCache] Persist failed:', error);
      }
    }, PERSIST_INTERVAL_MS);

    // Prevent timer from keeping process alive
    if (this.persistTimer.unref) {
      this.persistTimer.unref();
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer || this.isShuttingDown) return;

    this.cleanupTimer = setInterval(() => {
      if (this.isShuttingDown) return;
      try {
        this.evictExpired();
      } catch (error) {
        console.error('[SmartCache] Cleanup failed:', error);
      }
    }, CLEANUP_INTERVAL_MS);

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CORE OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────────

  async set(
    key: string,
    value: T,
    options?: { ttl?: number; metadata?: Record<string, unknown> }
  ): Promise<void> {
    await this.initialize();

    const contentHash = this.hashContent(value);
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');
    const now = Date.now();

    // Check if we already have this exact content
    const existingKey = this.hashToKey.get(contentHash);
    if (existingKey && existingKey !== key) {
      // Reuse existing entry with new key
      const existing = this.items.get(existingKey);
      if (existing && existing.expiresAt > now) {
        this.items.set(key, { ...existing, key });
        this.hashToKey.set(contentHash, key);
        return;
      }
    }

    // Evict if necessary (size-based)
    while (this.currentSizeBytes + size > this.maxSizeBytes && this.items.size > 0) {
      this.evictLRU();
    }

    // Evict if necessary (entry count-based)
    while (this.items.size >= this.maxEntries) {
      this.evictLRU();
    }

    const item: CacheItem<T> = {
      key,
      contentHash,
      value,
      size,
      createdAt: now,
      expiresAt: now + (options?.ttl ?? this.defaultTTL),
      lastAccessed: now,
      hits: 0,
      metadata: options?.metadata,
    };

    // Remove old entry if exists
    const oldItem = this.items.get(key);
    if (oldItem) {
      this.currentSizeBytes -= oldItem.size;
      this.hashToKey.delete(oldItem.contentHash);
    }

    this.items.set(key, item);
    this.hashToKey.set(contentHash, key);
    this.currentSizeBytes += size;
  }

  async get(key: string): Promise<T | null> {
    await this.initialize();

    const item = this.items.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (item.expiresAt < Date.now()) {
      this.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    // Update access time and hit count
    item.lastAccessed = Date.now();
    item.hits++;
    this.stats.hits++;

    return item.value;
  }

  async getByContent(value: T): Promise<T | null> {
    await this.initialize();

    const contentHash = this.hashContent(value);
    const key = this.hashToKey.get(contentHash);

    if (!key) {
      return null;
    }

    return this.get(key);
  }

  delete(key: string): boolean {
    const item = this.items.get(key);
    if (!item) return false;

    this.items.delete(key);
    this.hashToKey.delete(item.contentHash);
    this.currentSizeBytes -= item.size;

    return true;
  }

  has(key: string): boolean {
    const item = this.items.get(key);
    if (!item) return false;
    if (item.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SEMANTIC SIMILARITY (Content-Based Lookup)
  // ──────────────────────────────────────────────────────────────────────────────

  async findSimilar(
    prompt: string,
    threshold: number = 0.8
  ): Promise<CacheEntry<T>[]> {
    await this.initialize();

    const results: CacheEntry<T>[] = [];
    const promptWords = new Set(prompt.toLowerCase().split(/\s+/));

    for (const item of Array.from(this.items.values())) {
      if (item.expiresAt < Date.now()) continue;

      // Simple Jaccard similarity
      const itemMetadata = item.metadata;
      if (itemMetadata && typeof itemMetadata.prompt === 'string') {
        const itemWords = new Set(itemMetadata.prompt.toLowerCase().split(/\s+/));
        const intersection = new Set(Array.from(promptWords).filter((x) => itemWords.has(x)));
        const union = new Set([...Array.from(promptWords), ...Array.from(itemWords)]);
        const similarity = intersection.size / union.size;

        if (similarity >= threshold) {
          results.push({
            key: item.key,
            value: item.value,
            createdAt: new Date(item.createdAt).toISOString(),
            expiresAt: new Date(item.expiresAt).toISOString(),
            hits: item.hits,
            size: item.size,
            contentHash: item.contentHash,
          });
        }
      }
    }

    return results.sort((a, b) => b.hits - a.hits);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EVICTION
  // ──────────────────────────────────────────────────────────────────────────────

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of Array.from(this.items)) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, item] of Array.from(this.items)) {
      if (item.expiresAt < now) {
        this.delete(key);
        evicted++;
      }
    }

    this.stats.expirations += evicted;
    return evicted;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PERSISTENCE
  // ──────────────────────────────────────────────────────────────────────────────

  private async loadFromDisk(): Promise<void> {
    try {
      const indexPath = path.join(this.cacheDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index: CacheIndex = JSON.parse(indexData);

      const now = Date.now();
      for (const itemMeta of index.items) {
        if (itemMeta.expiresAt < now) continue;

        try {
          const valuePath = path.join(this.cacheDir, `${itemMeta.contentHash}.json`);
          const valueData = await fs.readFile(valuePath, 'utf-8');
          const value = JSON.parse(valueData);

          const item: CacheItem<T> = {
            key: itemMeta.key,
            contentHash: itemMeta.contentHash,
            value,
            size: itemMeta.size,
            createdAt: itemMeta.createdAt,
            expiresAt: itemMeta.expiresAt,
            lastAccessed: now,
            hits: itemMeta.hits,
          };

          this.items.set(item.key, item);
          this.hashToKey.set(item.contentHash, item.key);
          this.currentSizeBytes += item.size;
        } catch {
          // Skip corrupted entries
        }
      }
    } catch {
      // No cache to load
    }
  }

  async persistToDisk(): Promise<void> {
    if (!this.persistEnabled) return;

    const index: CacheIndex = {
      version: 1,
      items: [],
    };

    const now = Date.now();
    for (const item of Array.from(this.items.values())) {
      if (item.expiresAt < now) continue;

      index.items.push({
        key: item.key,
        contentHash: item.contentHash,
        size: item.size,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        hits: item.hits,
      });

      // Persist value
      const valuePath = path.join(this.cacheDir, `${item.contentHash}.json`);
      await fs.writeFile(valuePath, JSON.stringify(item.value));
    }

    // Persist index
    const indexPath = path.join(this.cacheDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    // Clean up orphaned files
    await this.cleanupOrphans(new Set(index.items.map((i) => i.contentHash)));
  }

  private async cleanupOrphans(validHashes: Set<string>): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file === 'index.json') continue;
        const hash = file.replace('.json', '');
        if (!validHashes.has(hash)) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch {
      // Cleanup is best-effort
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ──────────────────────────────────────────────────────────────────────────────

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.items.size,
      totalSize: this.currentSizeBytes,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictions: this.stats.evictions,
    };
  }

  getDetailedStats(): {
    stats: CacheStats;
    topHits: { key: string; hits: number }[];
    ageDistribution: { bucket: string; count: number }[];
    sizeDistribution: { bucket: string; count: number }[];
  } {
    const stats = this.getStats();
    const now = Date.now();

    // Top hits
    const topHits = Array.from(this.items.values())
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map((item) => ({ key: item.key, hits: item.hits }));

    // Age distribution
    const ageDistribution = [
      { bucket: '<1h', count: 0 },
      { bucket: '1-6h', count: 0 },
      { bucket: '6-24h', count: 0 },
      { bucket: '>24h', count: 0 },
    ];

    for (const item of Array.from(this.items.values())) {
      const ageHours = (now - item.createdAt) / (1000 * 60 * 60);
      if (ageHours < 1) ageDistribution[0].count++;
      else if (ageHours < 6) ageDistribution[1].count++;
      else if (ageHours < 24) ageDistribution[2].count++;
      else ageDistribution[3].count++;
    }

    // Size distribution
    const sizeDistribution = [
      { bucket: '<10KB', count: 0 },
      { bucket: '10-100KB', count: 0 },
      { bucket: '100KB-1MB', count: 0 },
      { bucket: '>1MB', count: 0 },
    ];

    for (const item of Array.from(this.items.values())) {
      const sizeKB = item.size / 1024;
      if (sizeKB < 10) sizeDistribution[0].count++;
      else if (sizeKB < 100) sizeDistribution[1].count++;
      else if (sizeKB < 1024) sizeDistribution[2].count++;
      else sizeDistribution[3].count++;
    }

    return {
      stats,
      topHits,
      ageDistribution,
      sizeDistribution,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────────

  private hashContent(value: T): string {
    const serialized = JSON.stringify(value);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  clear(): void {
    this.items.clear();
    this.hashToKey.clear();
    this.currentSizeBytes = 0;
    this.stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    // Clear all timers
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = undefined;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Final persist before shutdown
    if (this.persistEnabled) {
      await this.persistToDisk();
    }

    // Clear memory
    this.clear();
    this.initialized = false;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ITERATION
  // ──────────────────────────────────────────────────────────────────────────────

  keys(): IterableIterator<string> {
    return this.items.keys();
  }

  values(): IterableIterator<T> {
    const self = this;
    return (function* () {
      for (const item of Array.from(self.items.values())) {
        if (item.expiresAt > Date.now()) {
          yield item.value;
        }
      }
    })();
  }

  entries(): IterableIterator<[string, T]> {
    const self = this;
    return (function* () {
      for (const item of Array.from(self.items.values())) {
        if (item.expiresAt > Date.now()) {
          yield [item.key, item.value] as [string, T];
        }
      }
    })();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SPECIALIZED CACHES
// ════════════════════════════════════════════════════════════════════════════════

export class ImageCache extends SmartCache<string> {
  constructor() {
    super({
      maxSizeMB: 1000, // 1GB for images
      defaultTTL: 1000 * 60 * 60 * 24 * 7, // 7 days
      cacheDir: './data/cache/images',
    });
  }
}

export class CodeCache extends SmartCache<string> {
  constructor() {
    super({
      maxSizeMB: 200, // 200MB for code
      defaultTTL: 1000 * 60 * 60 * 24, // 24 hours
      cacheDir: './data/cache/code',
    });
  }
}

export class AnalysisCache extends SmartCache<unknown> {
  constructor() {
    super({
      maxSizeMB: 100, // 100MB for analysis results
      defaultTTL: 1000 * 60 * 60, // 1 hour
      cacheDir: './data/cache/analysis',
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

const cacheInstances: Map<string, SmartCache> = new Map();

export function getSmartCache<T>(name: string = 'default'): SmartCache<T> {
  if (!cacheInstances.has(name)) {
    cacheInstances.set(name, new SmartCache<T>());
  }
  return cacheInstances.get(name) as SmartCache<T>;
}

export function getImageCache(): ImageCache {
  if (!cacheInstances.has('images')) {
    cacheInstances.set('images', new ImageCache());
  }
  return cacheInstances.get('images') as ImageCache;
}

export function getCodeCache(): CodeCache {
  if (!cacheInstances.has('code')) {
    cacheInstances.set('code', new CodeCache());
  }
  return cacheInstances.get('code') as CodeCache;
}

/**
 * Shutdown all cache instances and clear the registry.
 * Call this when shutting down the application to prevent memory leaks.
 */
export async function shutdownAllCaches(): Promise<void> {
  const shutdownPromises: Promise<void>[] = [];

  for (const cache of Array.from(cacheInstances.values())) {
    shutdownPromises.push(cache.shutdown());
  }

  await Promise.all(shutdownPromises);
  cacheInstances.clear();
}

/**
 * Remove a specific cache instance from the registry.
 * Useful for cleaning up caches that are no longer needed.
 */
export async function removeCache(name: string): Promise<void> {
  const cache = cacheInstances.get(name);
  if (cache) {
    await cache.shutdown();
    cacheInstances.delete(name);
  }
}

// Cleanup on process exit (best-effort, async operations may not complete)
if (typeof process !== 'undefined') {
  const cleanup = () => {
    for (const cache of Array.from(cacheInstances.values())) {
      try {
        // Synchronous cleanup - clear timers
        cache.shutdown().catch(() => {});
      } catch {
        // Best effort
      }
    }
    cacheInstances.clear();
  };

  process.on('beforeExit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

export default SmartCache;

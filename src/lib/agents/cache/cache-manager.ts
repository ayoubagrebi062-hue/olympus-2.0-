/**
 * OLYMPUS 50X - Cache Manager
 *
 * Multi-tier caching for:
 * - Embeddings (expensive to compute)
 * - RAG results (semantic search results)
 * - Generated screenshots (vision validation)
 * - LLM responses (for retry scenarios)
 */

import { createHash } from 'crypto';

// ============================================
// TYPES
// ============================================

export type CacheKey = string;
export type CacheNamespace = 'embedding' | 'rag' | 'screenshot' | 'llm' | 'component';

export interface CacheEntry<T = unknown> {
  key: CacheKey;
  value: T;
  namespace: CacheNamespace;
  createdAt: number;
  expiresAt: number;
  hits: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  byNamespace: Record<CacheNamespace, { entries: number; size: number; hits: number }>;
}

export interface CacheConfig {
  maxSize: number; // Max total size in bytes
  maxEntries: number; // Max entries
  defaultTTL: number; // Default TTL in ms
  ttlByNamespace: Partial<Record<CacheNamespace, number>>;
  enableCompression: boolean;
  enableStats: boolean;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 10000,
  defaultTTL: 3600000, // 1 hour
  ttlByNamespace: {
    embedding: 86400000, // 24 hours (embeddings rarely change)
    rag: 3600000, // 1 hour (search results)
    screenshot: 1800000, // 30 minutes (screenshots)
    llm: 300000, // 5 minutes (LLM responses)
    component: 86400000, // 24 hours (generated components)
  },
  enableCompression: true,
  enableStats: true,
};

// ============================================
// CACHE MANAGER (In-Memory Implementation)
// ============================================

export class CacheManager {
  private cache: Map<CacheKey, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate cache key from input
   */
  generateKey(namespace: CacheNamespace, input: string | object): CacheKey {
    const data = typeof input === 'string' ? input : JSON.stringify(input);
    const hash = createHash('sha256').update(data).digest('hex').substring(0, 16);
    return `${namespace}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hits
    entry.hits++;
    this.stats.hits++;

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: CacheKey,
    value: T,
    options: { namespace?: CacheNamespace; ttl?: number } = {}
  ): Promise<void> {
    const namespace = options.namespace || this.extractNamespace(key);
    const ttl = options.ttl || this.config.ttlByNamespace[namespace] || this.config.defaultTTL;

    // Calculate size
    const size = this.calculateSize(value);

    // Check if we need to evict
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      key,
      value,
      namespace,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
      size,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete from cache
   */
  async delete(key: CacheKey): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists
   */
  async has(key: CacheKey): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or compute value
   */
  async getOrCompute<T>(
    key: CacheKey,
    compute: () => Promise<T>,
    options: { namespace?: CacheNamespace; ttl?: number } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clear namespace
   */
  async clearNamespace(namespace: CacheNamespace): Promise<number> {
    let cleared = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.namespace === namespace) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const byNamespace: CacheStats['byNamespace'] = {
      embedding: { entries: 0, size: 0, hits: 0 },
      rag: { entries: 0, size: 0, hits: 0 },
      screenshot: { entries: 0, size: 0, hits: 0 },
      llm: { entries: 0, size: 0, hits: 0 },
      component: { entries: 0, size: 0, hits: 0 },
    };

    let totalSize = 0;

    for (const entry of this.cache.values()) {
      byNamespace[entry.namespace].entries++;
      byNamespace[entry.namespace].size += entry.size;
      byNamespace[entry.namespace].hits += entry.hits;
      totalSize += entry.size;
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      byNamespace,
    };
  }

  /**
   * Extract namespace from key
   */
  private extractNamespace(key: CacheKey): CacheNamespace {
    const parts = key.split(':');
    return (parts[0] as CacheNamespace) || 'llm';
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (Buffer.isBuffer(value)) return value.length;
    if (typeof value === 'string') return value.length * 2;
    if (Array.isArray(value) && typeof value[0] === 'number') {
      return value.length * 8; // Float64 for embeddings
    }
    return JSON.stringify(value).length * 2;
  }

  /**
   * Ensure capacity for new entry
   */
  private async ensureCapacity(neededSize: number): Promise<void> {
    // Check entry count
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Check size
    let currentSize = 0;
    for (const entry of this.cache.values()) {
      currentSize += entry.size;
    }

    while (currentSize + neededSize > this.config.maxSize && this.cache.size > 0) {
      const evicted = this.evictLRU();
      if (evicted) {
        currentSize -= evicted.size;
      } else {
        break;
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): CacheEntry | null {
    let oldest: CacheEntry | null = null;
    let oldestKey: CacheKey | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.hits < oldest.hits) {
        oldest = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }

    return oldest;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================
// SPECIALIZED CACHE HELPERS
// ============================================

/**
 * Cache for embeddings
 */
export class EmbeddingCache {
  private manager: CacheManager;

  constructor(manager: CacheManager) {
    this.manager = manager;
  }

  async get(text: string): Promise<number[] | null> {
    const key = this.manager.generateKey('embedding', text);
    return this.manager.get<number[]>(key);
  }

  async set(text: string, embedding: number[]): Promise<void> {
    const key = this.manager.generateKey('embedding', text);
    await this.manager.set(key, embedding, { namespace: 'embedding' });
  }

  async getOrCompute(text: string, compute: () => Promise<number[]>): Promise<number[]> {
    const key = this.manager.generateKey('embedding', text);
    return this.manager.getOrCompute(key, compute, { namespace: 'embedding' });
  }
}

/**
 * Cache for RAG results
 */
export class RAGCache {
  private manager: CacheManager;

  constructor(manager: CacheManager) {
    this.manager = manager;
  }

  async get(query: string, category?: string): Promise<unknown[] | null> {
    const key = this.manager.generateKey('rag', { query, category });
    return this.manager.get<unknown[]>(key);
  }

  async set(query: string, results: unknown[], category?: string): Promise<void> {
    const key = this.manager.generateKey('rag', { query, category });
    await this.manager.set(key, results, { namespace: 'rag' });
  }
}

/**
 * Cache for generated components
 */
export class ComponentCache {
  private manager: CacheManager;

  constructor(manager: CacheManager) {
    this.manager = manager;
  }

  async get(prompt: string, framework: string): Promise<string | null> {
    const key = this.manager.generateKey('component', { prompt, framework });
    return this.manager.get<string>(key);
  }

  async set(prompt: string, code: string, framework: string): Promise<void> {
    const key = this.manager.generateKey('component', { prompt, framework });
    await this.manager.set(key, code, { namespace: 'component' });
  }
}

// ============================================
// SINGLETON
// ============================================

let cacheInstance: CacheManager | null = null;
let embeddingCache: EmbeddingCache | null = null;
let ragCache: RAGCache | null = null;
let componentCache: ComponentCache | null = null;

/**
 * Get singleton cache manager
 */
export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(config);
  }
  return cacheInstance;
}

/**
 * Get embedding cache
 */
export function getEmbeddingCache(): EmbeddingCache {
  if (!embeddingCache) {
    embeddingCache = new EmbeddingCache(getCacheManager());
  }
  return embeddingCache;
}

/**
 * Get RAG cache
 */
export function getRAGCache(): RAGCache {
  if (!ragCache) {
    ragCache = new RAGCache(getCacheManager());
  }
  return ragCache;
}

/**
 * Get component cache
 */
export function getComponentCache(): ComponentCache {
  if (!componentCache) {
    componentCache = new ComponentCache(getCacheManager());
  }
  return componentCache;
}

export default CacheManager;

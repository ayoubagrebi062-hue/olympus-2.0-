/**
 * OLYMPUS 3.0 - Query Optimization Utilities
 * Batch queries, deduplication, and connection pooling helpers
 */

// ============================================================================
// TYPES
// ============================================================================

interface BatchConfig {
  maxBatchSize: number;
  maxWaitMs: number;
  cacheResults?: boolean;
}

interface PendingQuery<T> {
  key: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// ============================================================================
// QUERY BATCHER
// ============================================================================

/**
 * Batches multiple queries into a single request
 * Useful for N+1 query prevention
 */
export function createQueryBatcher<K, V>(
  batchFn: (keys: K[]) => Promise<Map<K, V>>,
  config: Partial<BatchConfig> = {}
) {
  const { maxBatchSize = 100, maxWaitMs = 10, cacheResults = true } = config;

  let pendingQueries: PendingQuery<V>[] = [];
  let pendingKeys: K[] = [];
  let timeout: NodeJS.Timeout | null = null;
  const cache = new Map<string, V>();

  async function executeBatch(): Promise<void> {
    const queries = pendingQueries;
    const keys = pendingKeys;

    pendingQueries = [];
    pendingKeys = [];
    timeout = null;

    if (keys.length === 0) return;

    try {
      const results = await batchFn(keys);

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const key = keys[i];
        const result = results.get(key);

        if (result !== undefined) {
          if (cacheResults) {
            cache.set(query.key, result);
          }
          query.resolve(result);
        } else {
          query.reject(new Error(`No result for key: ${String(key)}`));
        }
      }
    } catch (error) {
      for (const query of queries) {
        query.reject(error as Error);
      }
    }
  }

  return {
    load(key: K): Promise<V> {
      const cacheKey = JSON.stringify(key);

      // Check cache first
      if (cacheResults && cache.has(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey)!);
      }

      return new Promise<V>((resolve, reject) => {
        pendingQueries.push({ key: cacheKey, resolve, reject });
        pendingKeys.push(key);

        // Execute immediately if batch is full
        if (pendingKeys.length >= maxBatchSize) {
          if (timeout) clearTimeout(timeout);
          executeBatch();
        } else if (!timeout) {
          // Schedule batch execution
          timeout = setTimeout(executeBatch, maxWaitMs);
        }
      });
    },

    loadMany(keys: K[]): Promise<V[]> {
      return Promise.all(keys.map(key => this.load(key)));
    },

    clear(): void {
      cache.clear();
    },

    clearKey(key: K): void {
      cache.delete(JSON.stringify(key));
    },

    prime(key: K, value: V): void {
      cache.set(JSON.stringify(key), value);
    },
  };
}

// ============================================================================
// QUERY DEDUPLICATOR
// ============================================================================

const inflightQueries = new Map<string, Promise<unknown>>();

/**
 * Deduplicates concurrent identical queries
 * Only one query runs, others wait for the same result
 */
export async function deduplicateQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  // Check if query is already in flight
  const existing = inflightQueries.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Execute query and track it
  const promise = queryFn().finally(() => {
    inflightQueries.delete(key);
  });

  inflightQueries.set(key, promise);
  return promise;
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
  };
}

/**
 * Optimized pagination with cursor support
 */
export function paginateResults<T extends { id: string }>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const totalPages = Math.ceil(total / limit);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextCursor: items.length > 0 ? items[items.length - 1].id : undefined,
    },
  };
}

// ============================================================================
// QUERY TIMEOUT
// ============================================================================

/**
 * Wraps a query with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Query timeout'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ============================================================================
// QUERY RETRY
// ============================================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Retries a query with exponential backoff
 */
export async function withRetry<T>(
  queryFn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 100, maxDelayMs = 5000, backoffMultiplier = 2 } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(backoffMultiplier, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// SELECT FIELDS OPTIMIZER
// ============================================================================

/**
 * Builds optimized SELECT clause based on requested fields
 */
export function optimizeSelect<T extends Record<string, unknown>>(
  requestedFields?: string[]
): string {
  if (!requestedFields || requestedFields.length === 0) {
    return '*';
  }

  // Always include id for relationships
  const fields = new Set(requestedFields);
  fields.add('id');

  return Array.from(fields).join(', ');
}

// ============================================================================
// QUERY STATS
// ============================================================================

interface QueryStats {
  totalQueries: number;
  avgDurationMs: number;
  slowQueries: number;
  errors: number;
}

const queryStats: QueryStats = {
  totalQueries: 0,
  avgDurationMs: 0,
  slowQueries: 0,
  errors: 0,
};

const SLOW_QUERY_THRESHOLD_MS = 1000;

/**
 * Tracks query performance
 */
export async function trackQuery<T>(name: string, queryFn: () => Promise<T>): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    // Update stats
    queryStats.totalQueries++;
    queryStats.avgDurationMs =
      (queryStats.avgDurationMs * (queryStats.totalQueries - 1) + duration) /
      queryStats.totalQueries;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      queryStats.slowQueries++;
      console.warn(`[query] Slow query detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    queryStats.errors++;
    throw error;
  }
}

export function getQueryStats(): QueryStats {
  return { ...queryStats };
}

export function resetQueryStats(): void {
  queryStats.totalQueries = 0;
  queryStats.avgDurationMs = 0;
  queryStats.slowQueries = 0;
  queryStats.errors = 0;
}

/**
 * OLYMPUS 3.0 - Performance Utilities
 * Caching, query optimization, and performance monitoring
 */

// Cache utilities
export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidateByTag,
  cacheGetOrSet,
  cacheSWR,
  getCacheStats,
  Cached,
} from './cache';

// Query optimization
export {
  createQueryBatcher,
  deduplicateQuery,
  paginateResults,
  withTimeout,
  withRetry,
  optimizeSelect,
  trackQuery,
  getQueryStats,
  resetQueryStats,
} from './query-optimizer';

// ============================================================================
// LAZY LOADING HELPERS
// ============================================================================

/**
 * Lazy load a module only when needed
 */
export function lazyLoad<T>(importFn: () => Promise<{ default: T }>): () => Promise<T> {
  let cached: T | null = null;

  return async () => {
    if (cached) return cached;
    const module = await importFn();
    cached = module.default;
    return cached;
  };
}

/**
 * Preload a module in the background
 */
export function preload(importFn: () => Promise<unknown>): void {
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => importFn());
    } else {
      setTimeout(() => importFn(), 100);
    }
  }
}

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

// ============================================================================
// RESOURCE HINTS
// ============================================================================

/**
 * Add DNS prefetch hint
 */
export function dnsPrefetch(domain: string): void {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  }
}

/**
 * Add preconnect hint
 */
export function preconnect(origin: string): void {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

// ============================================================================
// BUNDLE SIZE HELPERS
// ============================================================================

/**
 * Check if we're in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if we're in a server environment
 */
export const isServer = typeof window === 'undefined';

/**
 * Dynamic import with error boundary
 */
export async function safeImport<T>(importFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    console.warn('[performance] Dynamic import failed:', error);
    return fallback;
  }
}

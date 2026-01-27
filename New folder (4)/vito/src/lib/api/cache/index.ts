/**
 * OLYMPUS 2.0 - Cache Module
 */

// Config
export {
  CACHE_TTL,
  CACHE_PREFIX,
  CACHE_TAGS,
  buildCacheKey,
  tenantCacheKey,
  userCacheKey,
  type EndpointCacheConfig,
} from './config';

// Redis client
export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheInvalidateTag,
  cacheInvalidateTags,
  cacheGetOrSet,
  cacheHas,
  cacheTTL,
} from './client';

// HTTP caching
export {
  addCacheHeaders,
  withCache,
  noCacheHeaders,
  handleConditionalRequest,
  addConditionalHeaders,
  generateETag,
} from './http';

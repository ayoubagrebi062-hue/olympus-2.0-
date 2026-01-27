/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   VISION CORE - World-Class Foundations                                       ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   The building blocks of production-grade systems:                            ║
 * ║                                                                               ║
 * ║   Result<T, E>          → Errors as values, not exceptions                    ║
 * ║   RequestContext        → Tracing, deadlines, cancellation                    ║
 * ║   CircuitBreaker        → Fail fast, recover gracefully                       ║
 * ║   RequestDeduplicator   → One call, many callers                              ║
 * ║   RateLimiter           → Protect from abuse, control costs                   ║
 * ║                                                                               ║
 * ║   "These patterns separate weekend projects from production systems."         ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Result Type
export {
  VisionErrorCode,
  type VisionError,
  type Result,
  createError,
  Ok,
  Err,
  isOk,
  isErr,
  map,
  flatMap,
  unwrapOr,
  unwrap,
  collect,
  partition,
  fromPromise,
  withRetry,
} from './result';

// Request Context
export {
  type RequestContext,
  type ContextOptions,
  createContext,
  childContext,
  retryContext,
  isDone,
  remainingTime,
  checkContext,
  assertNotDone,
  withDeadline,
  deadlineSignal,
  formatContext,
} from './context';

// Circuit Breaker
export {
  type CircuitState,
  type CircuitBreakerOptions,
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitBreakers,
  resetAllCircuitBreakers,
  withCircuitBreaker,
} from './circuit-breaker';

// Request Deduplication
export {
  type DedupOptions,
  type DedupStats,
  RequestDeduplicator,
  getDeduplicator,
  getAllDeduplicatorStats,
  createRequestKey,
  deduplicated,
} from './dedup';

// Rate Limiting
export {
  type RateLimiterOptions,
  type RateLimiterStats,
  type SlidingWindowOptions,
  RateLimiter,
  SlidingWindowRateLimiter,
  CompositeRateLimiter,
  getRateLimiter,
  getAllRateLimiterStats,
  withRateLimit,
} from './rate-limiter';

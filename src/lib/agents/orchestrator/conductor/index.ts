/**
 * VITO v1.0.0 - The Code Generator That Feels Human
 *
 * A modular, teachable architecture for AI-powered code generation.
 *
 * ARCHITECTURE:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  index.ts         - This file (public API)                       │
 * │  vito.ts          - Main orchestrator (composes all modules)     │
 * │  types.ts         - All type definitions                         │
 * │  config.ts        - Configuration with documented WHYs           │
 * │  errors.ts        - Typed error classes                          │
 * │  quality.ts       - Code quality assessment                      │
 * │  cache.ts         - LRU cache with TTL                           │
 * │  personality.ts   - Vito's voice and messages                    │
 * │  api.ts           - Anthropic API with streaming                 │
 * │  utils.ts         - Pure utility functions                       │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * LESSON: Clean Architecture
 * - Each module has a single responsibility
 * - Dependencies flow inward (vito imports others, not vice versa)
 * - Types are shared through types.ts
 * - Configuration is centralized in config.ts
 *
 * @example Basic usage
 * ```typescript
 * import { vito, VERSION } from "./conductor";
 *
 * const { code, quality } = await vito("Create a login form");
 * console.log(`Quality: ${quality.score}/100 - ${quality.assessment}`);
 * ```
 *
 * @example With streaming
 * ```typescript
 * await vito("Create a dashboard", {
 *   onToken: (t) => process.stdout.write(t),
 *   onProgress: (p) => console.log(`${p.emoji} ${p.percent}%`),
 * });
 * ```
 *
 * @example Continuations ("that" refers to previous request)
 * ```typescript
 * await vito("Create a card");
 * await vito("Add a shadow to that");
 * ```
 *
 * @example Cancellable requests
 * ```typescript
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * await vito("Build something", { signal: controller.signal });
 * ```
 *
 * @example Quality gate (auto-retry if below threshold)
 * ```typescript
 * await vito("Create a complex form", { minQuality: 80 });
 * ```
 *
 * @example Telemetry for monitoring
 * ```typescript
 * await vito("Create a button", {
 *   onTelemetry: (e) => analytics.track(e.type, e),
 * });
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// MAIN EXPORTS (from the orchestrator)
// ============================================================================

export {
  // The main function - this is all most users need
  vito,

  // Version & metadata
  VERSION,
  BUILD,

  // Utilities for UI integration
  formatForCopy,
  getStatus,
  getPersonality,
  getCacheStats,
  processPending,
  reset,

  // Types re-exported for convenience
  type Result,
  type Quality,
  type QualityChecks,
  type Progress,
  type Options,
  type TelemetryEvent,
  type ProgressCallback,
  type TokenCallback,
  type TelemetryCallback,
} from './vito';

// ============================================================================
// ADVANCED EXPORTS (for power users)
// ============================================================================

// Configuration (for customization)
export {
  VERSION as CONFIG_VERSION,
  BUILD as CONFIG_BUILD,
  MAX_CACHE_SIZE,
  CACHE_TTL_MS,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  CIRCUIT_THRESHOLD,
  CIRCUIT_RESET_MS,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  DEFAULT_MODEL,
  MAX_TOKENS,
  DEFAULT_MIN_QUALITY,
  QUALITY_THRESHOLDS,
  createConfig,
} from './config';

// Errors (for custom error handling)
export {
  VitoError,
  RateLimitError,
  AuthenticationError,
  CancellationError,
  NetworkError,
  ServerError,
  TimeoutError,
  CircuitOpenError,
  ValidationError,
  QualityError,
  createError,
  isVitoError,
  isRetryable,
} from './errors';

// Quality (for custom assessment)
export { assessQuality, defaultChecks, meetsThreshold } from './quality';

// Cache (for direct cache manipulation)
export * as cache from './cache';

// Personality (for UI customization)
export {
  VITO,
  random,
  getGreeting,
  getCelebration,
  getEncouragement,
  getStreamingMessage,
  getRecoveryMessage,
  getMilestoneCelebration,
  getSuggestion,
  PROGRESS_MESSAGES,
  getProgressMessage,
} from './personality';

// API (for direct API access)
export {
  streamGeneration,
  tryLocalGeneration,
  checkConnection,
  setClient,
  resetClient,
} from './api';

// Utils (for reusable helpers)
export {
  hash,
  sanitize,
  extractCode,
  detectLanguage,
  formatForCopy as formatCodeForCopy,
  sleep,
  calculateBackoff,
  validateTask,
  isContinuation,
  buildContinuationPrompt,
} from './utils';

// ============================================================================
// TYPES (for TypeScript users)
// ============================================================================

export type {
  Status,
  ProgressStage,
  TelemetryType,
  CacheEntry,
  PendingItem,
  StreamingResponse,
} from './types';

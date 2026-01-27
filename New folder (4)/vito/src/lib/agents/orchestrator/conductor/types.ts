/**
 * TYPES
 *
 * All type definitions in one place.
 * This makes it easy to understand the shape of data
 * flowing through the system.
 *
 * WHY separate file?
 * - Types are contracts between modules
 * - Changes here ripple through the codebase
 * - Easy to find and review all types
 * - No circular dependency issues
 */

// ============================================================================
// CORE RESULT TYPE
// ============================================================================

/**
 * The result of every Vito request.
 *
 * WHY so many fields?
 * Each field serves a specific UI need:
 * - code: What the developer actually needs
 * - quality: Build trust by showing the score
 * - message: Human feedback, not error codes
 * - suggestion: Proactive help, not reactive
 */
export interface Result {
  /** Did the request succeed? Check this first. */
  ok: boolean;

  /** Clean code, extracted from markdown. Ready to copy. */
  code: string;

  /** Raw API response. Useful for debugging. */
  raw: string;

  /** Quality assessment with score and breakdown. */
  quality: Quality;

  /** Current status for UI state management. */
  status: Status;

  /** Human-friendly message. Never technical jargon. */
  message: string;

  /** Encouragement. Everyone needs a boost. */
  encouragement: string;

  /** What to do next. Clear, actionable. */
  nextStep: string;

  /** Milestone celebration. undefined for normal results. */
  celebration?: string;

  /** Smart suggestion based on what was built. */
  suggestion?: string;

  /** Was this a continuation of the previous request? */
  continued?: boolean;

  /** Progress for loading states. */
  progress?: Progress;

  /** Was the request saved locally (cache/queue)? */
  savedLocally: boolean;

  /** Will it auto-retry when online? */
  willRetryWhenOnline: boolean;

  /** Position in offline queue. */
  queuePosition?: number;

  /** Detected programming language. */
  language: string;

  /** Number of lines in the code. */
  lineCount: number;

  /** Total tokens used (input + output). */
  tokensUsed: number;

  /** Time from request to response in milliseconds. */
  latency: number;
}

// ============================================================================
// QUALITY ASSESSMENT
// ============================================================================

/**
 * Quality assessment of generated code.
 *
 * WHY score code?
 * - Builds trust: users know what they're getting
 * - Enables auto-retry: low score = try again
 * - Provides feedback: specific areas to improve
 */
export interface Quality {
  /** Overall score 0-100. Human-interpretable. */
  score: number;

  /** Individual quality checks. */
  checks: QualityChecks;

  /** Human-readable summary. */
  assessment: string;
}

/**
 * Individual quality checks.
 *
 * WHY these specific checks?
 * - hasTypes: TypeScript's main value proposition
 * - hasExports: Code that can be imported is more useful
 * - isComplete: Partial code wastes time
 * - hasErrorHandling: Production code handles failures
 * - matchesRequest: Did we actually solve the problem?
 */
export interface QualityChecks {
  hasTypes: boolean;
  hasExports: boolean;
  isComplete: boolean;
  hasErrorHandling: boolean;
  matchesRequest: boolean;
}

// ============================================================================
// PROGRESS & STATUS
// ============================================================================

/**
 * Status values for state management.
 *
 * WHY explicit status?
 * UI needs to render different states:
 * - success: Show the code
 * - streaming: Show tokens arriving
 * - waiting: Show countdown
 * - offline: Show queue position
 * - cancelled: Show "ready when you are"
 * - error: Show friendly message
 */
export type Status =
  | "success"
  | "streaming"
  | "waiting"
  | "offline"
  | "cancelled"
  | "error";

/**
 * Progress during generation.
 *
 * WHY progress stages?
 * Users hate silent waits. Each stage:
 * - Sets expectations
 * - Shows activity
 * - Enables progress bars
 */
export interface Progress {
  stage: ProgressStage;
  message: string;
  percent: number;
  emoji: string;
  tokensGenerated?: number;
}

export type ProgressStage =
  | "starting"
  | "thinking"
  | "streaming"
  | "validating"
  | "done";

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

/**
 * Options for the vito function.
 *
 * WHY optional callbacks?
 * - Simple use: just pass the task
 * - Advanced use: add streaming, progress, cancellation
 * - Composable: mix and match what you need
 */
export interface Options {
  /** Called for each token during streaming. */
  onToken?: TokenCallback;

  /** Called when progress changes. */
  onProgress?: ProgressCallback;

  /** AbortSignal to cancel the request. */
  signal?: AbortSignal;

  /** Override the default model. */
  model?: string;

  /** Additional context (file contents, etc). */
  context?: string;

  /**
   * Minimum quality score to accept (0-100).
   * Below this triggers an automatic retry.
   * Default: 60
   */
  minQuality?: number;

  /** Telemetry callback for monitoring. */
  onTelemetry?: TelemetryCallback;
}

// ============================================================================
// CALLBACKS
// ============================================================================

/** Called for each token during streaming. */
export type TokenCallback = (token: string) => void;

/** Called when progress changes. */
export type ProgressCallback = (progress: Progress) => void;

/** Called for telemetry events. */
export type TelemetryCallback = (event: TelemetryEvent) => void;

// ============================================================================
// TELEMETRY
// ============================================================================

/**
 * Telemetry event for monitoring.
 *
 * WHY telemetry?
 * - Track success/error rates
 * - Measure latency
 * - Monitor quality scores
 * - Debug issues in production
 */
export interface TelemetryEvent {
  type: TelemetryType;
  timestamp: number;
  latency?: number;
  quality?: number;
  tokens?: number;
  error?: string;
}

export type TelemetryType =
  | "request"
  | "success"
  | "error"
  | "cache_hit"
  | "offline"
  | "retry";

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** Cached result structure. */
export interface CacheEntry {
  code: string;
  raw: string;
  quality: Quality;
  timestamp: number;
}

/** Pending queue item. */
export interface PendingItem {
  task: string;
  attempts: number;
  backoff: number;
  createdAt: number;
}

/** API response from streaming. */
export interface StreamingResponse {
  content: string;
  tokens: number;
}

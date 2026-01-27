/**
 * VITO - The Orchestrator
 *
 * This is the conductor that brings all modules together.
 * Each piece does ONE thing well. This file composes them.
 *
 * LESSON: Composition Over Inheritance
 * Don't build one giant class. Build small modules
 * and compose them into a complete solution.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                          VITO                               │
 * │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
 * │  │  API    │ │ CACHE   │ │ QUALITY │ │PERSONAL │           │
 * │  │streaming│ │   LRU   │ │ scoring │ │  ity    │           │
 * │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
 * │       │           │           │           │                │
 * │  ┌────┴───────────┴───────────┴───────────┴────┐           │
 * │  │               ORCHESTRATOR                   │           │
 * │  │  - Validates input                           │           │
 * │  │  - Checks cache                              │           │
 * │  │  - Calls API with streaming                  │           │
 * │  │  - Assesses quality                          │           │
 * │  │  - Handles errors gracefully                 │           │
 * │  │  - Returns friendly result                   │           │
 * │  └─────────────────────────────────────────────┘           │
 * └─────────────────────────────────────────────────────────────┘
 */

// ============================================================================
// IMPORTS - Each module has a single responsibility
// ============================================================================

import type {
  Result,
  Quality,
  Progress,
  Options,
  TelemetryEvent,
  PendingItem,
} from "./types";

import {
  VERSION,
  BUILD,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  CIRCUIT_THRESHOLD,
  CIRCUIT_RESET_MS,
  DEFAULT_MIN_QUALITY,
  CONNECTION_CHECK_INTERVAL_MS,
} from "./config";

import {
  VitoError,
  createError,
} from "./errors";

import { assessQuality, defaultChecks } from "./quality";
import * as cache from "./cache";
import {
  VITO,
  getGreeting,
  getCelebration,
  getEncouragement,
  getRecoveryMessage,
  getMilestoneCelebration,
  getSuggestion,
  getProgressMessage,
} from "./personality";
import {
  streamGeneration,
  tryLocalGeneration,
  checkConnection as checkApiConnection,
} from "./api";
import {
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
} from "./utils";

// ============================================================================
// STATE
// ============================================================================

/**
 * Module-level state.
 *
 * WHY module state instead of a class?
 * - Simpler API: just call vito()
 * - No need to pass instances around
 * - State is encapsulated in this module
 *
 * WHY not put this in a separate state module?
 * - State is tightly coupled to orchestration logic
 * - Moving it would add complexity without benefit
 */

/** Pending queue for offline requests */
const pending = new Map<string, PendingItem>();

/** Rate limiting timestamps */
let timestamps: number[] = [];

/** Circuit breaker state */
let failures = 0;
let circuitOpen = false;
let circuitOpenedAt = 0;

/** Online status */
let isOnline = true;
let lastOnlineCheck = 0;

/** Request counter for milestones */
let requestCount = 0;

/** Context memory for continuations */
let lastTask = "";
let lastCode = "";

// ============================================================================
// THE MAIN FUNCTION
// ============================================================================

/**
 * Generate code with Vito.
 *
 * This is the ONLY function users need to know.
 * Everything else is internal implementation.
 *
 * @param task - What to build (e.g., "a login form with email and password")
 * @param options - Configuration for streaming, progress, cancellation, etc.
 * @returns Result with code, quality score, and metadata
 *
 * @example Basic usage
 * ```typescript
 * const { code, quality } = await vito("Create a login form");
 * console.log(`Quality: ${quality.score}/100`);
 * ```
 *
 * @example With streaming
 * ```typescript
 * await vito("Create a dashboard", {
 *   onToken: (token) => process.stdout.write(token),
 *   onProgress: (p) => console.log(`${p.emoji} ${p.percent}%`),
 * });
 * ```
 *
 * @example With cancellation
 * ```typescript
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * await vito("Build something", { signal: controller.signal });
 * ```
 */
export async function vito(
  task: string,
  options: Options = {}
): Promise<Result> {
  const startTime = Date.now();
  const {
    onToken,
    onProgress,
    signal,
    context,
    minQuality = DEFAULT_MIN_QUALITY,
    onTelemetry,
    model,
  } = options;

  const isFirstTime = requestCount === 0;
  requestCount++;

  // ─────────────────────────────────────────────────────────────────────────
  // TELEMETRY HELPER
  // ─────────────────────────────────────────────────────────────────────────

  const emit = (event: Omit<TelemetryEvent, "timestamp">) => {
    onTelemetry?.({ ...event, timestamp: Date.now() });
  };

  emit({ type: "request" });

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS HELPER
  // ─────────────────────────────────────────────────────────────────────────

  let tokensGenerated = 0;

  const emitProgress = (
    stage: Progress["stage"],
    percent: number,
    customMessage?: string
  ) => {
    const progressInfo = getProgressMessage(stage);
    onProgress?.({
      stage,
      message: customMessage || progressInfo.message,
      percent,
      emoji: progressInfo.emoji,
      tokensGenerated: stage === "streaming" ? tokensGenerated : undefined,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELLATION CHECK
  // ─────────────────────────────────────────────────────────────────────────

  if (signal?.aborted) {
    return buildCancelledResult(startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST TIME WELCOME
  // ─────────────────────────────────────────────────────────────────────────

  if (isFirstTime && !task?.trim()) {
    return buildWaitingResult(
      getGreeting(),
      "Tell me what you'd like to build.",
      "Try: 'a login form with email and password'",
      startTime
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  const validation = validateTask(task);
  if (!validation.valid) {
    return buildWaitingResult(
      validation.userMessage || "I'm ready!",
      "Even a rough idea works.",
      "Describe what you need",
      startTime
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTINUATION DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  const hasPreviousCode = lastCode.length > 0;
  const continued = isContinuation(task, hasPreviousCode);

  let fullTask = task;
  if (continued) {
    fullTask = buildContinuationPrompt(task, lastCode);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SANITIZE & HASH
  // ─────────────────────────────────────────────────────────────────────────

  const clean = sanitize(fullTask);
  const key = hash(clean);

  // ─────────────────────────────────────────────────────────────────────────
  // CACHE CHECK
  // ─────────────────────────────────────────────────────────────────────────

  const cached = cache.get(key);
  if (cached) {
    lastTask = task;
    lastCode = cached.code;
    emit({ type: "cache_hit" });

    return {
      ok: true,
      code: cached.code,
      raw: cached.raw,
      quality: cached.quality,
      status: "success",
      message: "Found it! Remembered this one.",
      encouragement: "Smart - reusing what worked!",
      nextStep: "Ready to copy",
      celebration: "⚡ Instant!",
      suggestion: getSuggestion(task),
      continued,
      savedLocally: true,
      willRetryWhenOnline: false,
      language: detectLanguage(cached.code),
      lineCount: cached.code.split("\n").length,
      tokensUsed: 0,
      latency: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // START PROGRESS
  // ─────────────────────────────────────────────────────────────────────────

  emitProgress("starting", 5);

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECTION CHECK
  // ─────────────────────────────────────────────────────────────────────────

  await updateConnectionStatus(signal);

  if (signal?.aborted) {
    return buildCancelledResult(startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OFFLINE HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOnline) {
    emit({ type: "offline" });
    emitProgress("thinking", 20);

    const localResult = await tryLocalGeneration(clean, onToken, signal);
    if (localResult) {
      return handleLocalSuccess(
        localResult,
        task,
        key,
        continued,
        startTime,
        () => emitProgress("done", 100)
      );
    }

    // Queue for later
    pending.set(key, {
      task: clean,
      attempts: 0,
      backoff: BASE_BACKOFF_MS,
      createdAt: Date.now(),
    });

    return buildOfflineResult(pending.size, startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMIT CHECK
  // ─────────────────────────────────────────────────────────────────────────

  cleanupTimestamps();
  const now = Date.now();

  if (timestamps.length >= RATE_LIMIT) {
    const oldest = timestamps[0];
    const waitMs = RATE_WINDOW_MS - (now - oldest);
    const waitSeconds = Math.ceil(waitMs / 1000);

    return buildWaitingResult(
      `Quick breather - ${waitSeconds}s`,
      "You've been productive!",
      waitSeconds <= 10 ? "Almost ready..." : "Check your recent work",
      startTime,
      {
        stage: "starting",
        message: `Ready in ${waitSeconds}s`,
        percent: 0,
        emoji: "⏳",
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CIRCUIT BREAKER CHECK
  // ─────────────────────────────────────────────────────────────────────────

  if (circuitOpen) {
    if (now - circuitOpenedAt > CIRCUIT_RESET_MS) {
      // Reset circuit
      circuitOpen = false;
      failures = 0;
    } else {
      // Try local fallback
      emitProgress("thinking", 20);

      const localResult = await tryLocalGeneration(clean, onToken, signal);
      if (localResult) {
        return handleLocalSuccess(
          localResult,
          task,
          key,
          continued,
          startTime,
          () => emitProgress("done", 100),
          getRecoveryMessage()
        );
      }

      const waitSeconds = Math.ceil(
        (CIRCUIT_RESET_MS - (now - circuitOpenedAt)) / 1000
      );

      return buildWaitingResult(
        `Service recovering - ${waitSeconds}s`,
        "It'll be back shortly!",
        "Take a quick break",
        startTime
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN API CALL WITH STREAMING
  // ─────────────────────────────────────────────────────────────────────────

  timestamps.push(now);
  emitProgress("thinking", 15);

  try {
    const { content: raw, tokens } = await streamGeneration(
      clean,
      context,
      model,
      (token) => {
        tokensGenerated++;
        onToken?.(token);

        // Update progress every 25 tokens
        if (tokensGenerated % 25 === 0) {
          const percent = Math.min(15 + Math.floor(tokensGenerated / 10), 80);
          emitProgress("streaming", percent);
        }
      },
      signal
    );

    if (signal?.aborted) {
      return buildCancelledResult(startTime);
    }

    emitProgress("validating", 85);

    // Extract and assess
    const extracted = extractCode(raw);
    const quality = assessQuality(extracted, task);

    // Quality gate - retry if too low
    if (quality.score < minQuality && !continued) {
      emit({ type: "retry", quality: quality.score });

      const retryResult = await handleQualityRetry(
        clean,
        context,
        model,
        task,
        key,
        continued,
        quality,
        tokens,
        startTime,
        onToken,
        signal,
        emit,
        () => emitProgress("done", 100)
      );

      if (retryResult) {
        return retryResult;
      }
    }

    // Success!
    cache.set(key, extracted, raw, quality);
    lastTask = task;
    lastCode = extracted;
    failures = 0;

    // Process any pending requests
    processPendingQueue();
    emitProgress("done", 100);

    emit({
      type: "success",
      latency: Date.now() - startTime,
      quality: quality.score,
      tokens,
    });

    return buildSuccessResult(
      extracted,
      raw,
      quality,
      task,
      continued,
      tokens,
      startTime
    );
  } catch (err) {
    if (signal?.aborted) {
      return buildCancelledResult(startTime);
    }

    // Track failures for circuit breaker
    failures++;
    if (failures >= CIRCUIT_THRESHOLD) {
      circuitOpen = true;
      circuitOpenedAt = Date.now();
    }

    const error = createError(err);
    emit({ type: "error", error: error.message });

    // Try local fallback
    const localResult = await tryLocalGeneration(clean, onToken, signal);
    if (localResult) {
      return handleLocalSuccess(
        localResult,
        task,
        key,
        continued,
        startTime,
        () => emitProgress("done", 100),
        getRecoveryMessage()
      );
    }

    // Queue for retry
    pending.set(key, {
      task: clean,
      attempts: 1,
      backoff: BASE_BACKOFF_MS,
      createdAt: Date.now(),
    });

    return buildErrorResult(error, pending.size, startTime);
  }
}

// ============================================================================
// RESULT BUILDERS
// ============================================================================

/**
 * Build a success result.
 *
 * LESSON: Builder Pattern
 * Complex objects with many fields benefit from builder functions.
 * This ensures consistency and reduces errors.
 */
function buildSuccessResult(
  code: string,
  raw: string,
  quality: Quality,
  task: string,
  continued: boolean,
  tokens: number,
  startTime: number
): Result {
  return {
    ok: true,
    code,
    raw,
    quality,
    status: "success",
    message: getCelebration(),
    encouragement: getEncouragement(),
    nextStep: "Copy the code and make it yours",
    celebration: getMilestoneCelebration(requestCount),
    suggestion: getSuggestion(task),
    continued,
    savedLocally: true,
    willRetryWhenOnline: false,
    language: detectLanguage(code),
    lineCount: code.split("\n").length,
    tokensUsed: tokens,
    latency: Date.now() - startTime,
  };
}

/**
 * Build a cancelled result.
 */
function buildCancelledResult(startTime: number): Result {
  return {
    ok: false,
    code: "",
    raw: "",
    quality: { score: 0, checks: defaultChecks(), assessment: "Cancelled" },
    status: "cancelled",
    message: "Cancelled.",
    encouragement: "Ready when you are!",
    nextStep: "Try again anytime",
    savedLocally: false,
    willRetryWhenOnline: false,
    language: "typescript",
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

/**
 * Build a waiting result.
 */
function buildWaitingResult(
  message: string,
  encouragement: string,
  nextStep: string,
  startTime: number,
  progress?: Progress
): Result {
  return {
    ok: false,
    code: "",
    raw: "",
    quality: { score: 0, checks: defaultChecks(), assessment: "Waiting" },
    status: "waiting",
    message,
    encouragement,
    nextStep,
    progress,
    savedLocally: false,
    willRetryWhenOnline: false,
    language: "typescript",
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

/**
 * Build an offline result.
 */
function buildOfflineResult(queuePosition: number, startTime: number): Result {
  return {
    ok: false,
    code: "",
    raw: "",
    quality: { score: 0, checks: defaultChecks(), assessment: "Pending" },
    status: "offline",
    message: "You're offline, but I saved this.",
    encouragement: "I'll create it when you're back online.",
    nextStep: "Keep working",
    savedLocally: true,
    willRetryWhenOnline: true,
    queuePosition,
    language: "typescript",
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

/**
 * Build an error result.
 */
function buildErrorResult(
  error: VitoError,
  queuePosition: number,
  startTime: number
): Result {
  return {
    ok: false,
    code: "",
    raw: "",
    quality: { score: 0, checks: defaultChecks(), assessment: "Error" },
    status: "error",
    message: error.userMessage,
    encouragement: "Saved your request - I'll keep trying.",
    nextStep: "Try again in a moment",
    savedLocally: true,
    willRetryWhenOnline: error.retryable,
    queuePosition,
    language: "typescript",
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Handle successful local generation.
 */
function handleLocalSuccess(
  localResult: string,
  task: string,
  key: string,
  continued: boolean,
  startTime: number,
  onDone: () => void,
  customMessage?: string
): Result {
  const extracted = extractCode(localResult);
  const quality = assessQuality(extracted, task);

  cache.set(key, extracted, localResult, quality);
  lastTask = task;
  lastCode = extracted;

  onDone();

  return {
    ok: true,
    code: extracted,
    raw: localResult,
    quality,
    status: "success",
    message: customMessage || "Created offline - no internet needed!",
    encouragement: "Work from anywhere. ✈️🏔️🏖️",
    nextStep: "Ready to copy",
    celebration: customMessage ? "🔄 Plan B!" : "🔌 Offline magic!",
    suggestion: getSuggestion(task),
    continued,
    savedLocally: true,
    willRetryWhenOnline: false,
    language: detectLanguage(extracted),
    lineCount: extracted.split("\n").length,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

/**
 * Handle quality retry when score is below threshold.
 */
async function handleQualityRetry(
  clean: string,
  context: string | undefined,
  model: string | undefined,
  task: string,
  key: string,
  continued: boolean,
  originalQuality: Quality,
  originalTokens: number,
  startTime: number,
  onToken: ((token: string) => void) | undefined,
  signal: AbortSignal | undefined,
  emit: (event: Omit<TelemetryEvent, "timestamp">) => void,
  onDone: () => void
): Promise<Result | null> {
  // More explicit retry prompt
  const retryPrompt = `${clean}\n\nIMPORTANT: Generate complete, production-ready code. Include all necessary types and error handling.`;

  try {
    const { content: retryRaw, tokens: retryTokens } = await streamGeneration(
      retryPrompt,
      context,
      model,
      onToken || (() => {}),
      signal
    );

    const retryExtracted = extractCode(retryRaw);
    const retryQuality = assessQuality(retryExtracted, task);

    // Only use retry if it's actually better
    if (retryQuality.score > originalQuality.score) {
      cache.set(key, retryExtracted, retryRaw, retryQuality);
      lastTask = task;
      lastCode = retryExtracted;
      failures = 0;

      processPendingQueue();
      onDone();

      emit({
        type: "success",
        latency: Date.now() - startTime,
        quality: retryQuality.score,
        tokens: originalTokens + retryTokens,
      });

      return buildSuccessResult(
        retryExtracted,
        retryRaw,
        retryQuality,
        task,
        continued,
        originalTokens + retryTokens,
        startTime
      );
    }
  } catch {
    // Retry failed, continue with original
  }

  return null;
}

/**
 * Update connection status.
 */
async function updateConnectionStatus(signal?: AbortSignal): Promise<void> {
  const now = Date.now();
  if (now - lastOnlineCheck < CONNECTION_CHECK_INTERVAL_MS) {
    return;
  }
  lastOnlineCheck = now;

  isOnline = await checkApiConnection(signal);

  if (isOnline && pending.size > 0) {
    processPendingQueue();
  }
}

/**
 * Clean up old timestamps for rate limiting.
 */
function cleanupTimestamps(): void {
  const now = Date.now();
  timestamps = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
}

/**
 * Process pending queue when back online.
 */
async function processPendingQueue(): Promise<void> {
  if (!isOnline || pending.size === 0) return;

  for (const [key, item] of Array.from(pending.entries())) {
    if (item.attempts >= MAX_RETRIES) {
      pending.delete(key);
      continue;
    }

    // Exponential backoff
    const waitTime = calculateBackoff(item.attempts, item.backoff, MAX_BACKOFF_MS);
    await sleep(waitTime);

    try {
      const { content } = await streamGeneration(
        item.task,
        undefined,
        undefined,
        () => {},
        undefined
      );

      const extracted = extractCode(content);
      const quality = assessQuality(extracted, item.task);

      cache.set(key, extracted, content, quality);
      pending.delete(key);
    } catch {
      item.attempts++;
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get current Vito status.
 *
 * Useful for debugging and monitoring.
 */
export function getStatus(): {
  version: string;
  online: boolean;
  pendingCount: number;
  cacheCount: number;
  totalBuilds: number;
  lastTask: string;
  circuitOpen: boolean;
} {
  return {
    version: VERSION,
    online: isOnline,
    pendingCount: pending.size,
    cacheCount: cache.getStats().size,
    totalBuilds: requestCount,
    lastTask,
    circuitOpen,
  };
}

/**
 * Reset all state.
 *
 * Useful for testing and clean starts.
 */
export function reset(): void {
  cache.clear();
  pending.clear();
  timestamps = [];
  failures = 0;
  circuitOpen = false;
  circuitOpenedAt = 0;
  requestCount = 0;
  lastTask = "";
  lastCode = "";
  isOnline = true;
}

/**
 * Format code for copying with metadata.
 */
export function formatForCopy(code: string): {
  full: string;
  preview: string;
  lineCount: number;
  language: string;
} {
  return formatCodeForCopy(code);
}

/**
 * Get Vito's personality for UI.
 */
export function getPersonality(): typeof VITO {
  return VITO;
}

/**
 * Manually trigger pending queue processing.
 */
export function processPending(): Promise<void> {
  return processPendingQueue();
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  oldestAge: number | null;
} {
  return cache.getStats();
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { VERSION, BUILD } from "./config";
export type {
  Result,
  Quality,
  QualityChecks,
  Progress,
  Options,
  TelemetryEvent,
  TokenCallback,
  ProgressCallback,
  TelemetryCallback,
} from "./types";

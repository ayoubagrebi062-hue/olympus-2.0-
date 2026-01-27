/**
 * VITO - The Code Generator That Feels Human
 *
 * Built for production. Built for scale. Built to last.
 *
 * @example
 * ```typescript
 * import { vito, VERSION } from "./conductor";
 *
 * // Simple
 * const { code, quality } = await vito("Create a login form");
 * console.log(`Quality: ${quality.score}/100`);
 *
 * // Streaming with progress
 * await vito("Create a dashboard", {
 *   onToken: (t) => process.stdout.write(t),
 *   onProgress: (p) => updateUI(p.percent),
 * });
 *
 * // Continuations
 * await vito("Create a card");
 * await vito("Add hover effects to that");
 *
 * // Cancellable
 * const controller = new AbortController();
 * await vito("Build something", { signal: controller.signal });
 * ```
 *
 * @packageDocumentation
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// VERSION & METADATA
// ============================================================================

/** Semantic version of Vito */
export const VERSION = '1.0.0' as const;

/** Build metadata */
export const BUILD = {
  version: VERSION,
  name: 'Vito',
  description: 'The Code Generator That Feels Human',
  author: 'OLYMPUS',
  license: 'MIT',
} as const;

// ============================================================================
// TYPES
// ============================================================================

/** Quality assessment of generated code */
export interface Quality {
  /** Overall score 0-100 */
  score: number;

  /** Individual checks */
  checks: {
    hasTypes: boolean;
    hasExports: boolean;
    isComplete: boolean;
    hasErrorHandling: boolean;
    matchesRequest: boolean;
  };

  /** Human-readable assessment */
  assessment: string;
}

/** The result of a Vito request */
export interface Result {
  /** Whether the request succeeded */
  ok: boolean;

  /** The generated code - clean, extracted from markdown */
  code: string;

  /** Raw response before extraction */
  raw: string;

  /** Quality assessment */
  quality: Quality;

  /** Current status */
  status: 'success' | 'streaming' | 'waiting' | 'offline' | 'cancelled' | 'error';

  /** Human-friendly message */
  message: string;

  /** Encouragement */
  encouragement: string;

  /** What to do next */
  nextStep: string;

  /** Milestone celebration */
  celebration?: string;

  /** Smart suggestion based on what was built */
  suggestion?: string;

  /** Was this a continuation? */
  continued?: boolean;

  /** Progress state */
  progress?: Progress;

  /** Saved locally for offline? */
  savedLocally: boolean;

  /** Will retry when online? */
  willRetryWhenOnline: boolean;

  /** Queue position if offline */
  queuePosition?: number;

  /** Detected language */
  language: string;

  /** Line count */
  lineCount: number;

  /** Token count used */
  tokensUsed: number;

  /** Generation time in ms */
  latency: number;
}

/** Progress during generation */
export interface Progress {
  stage: 'starting' | 'thinking' | 'streaming' | 'validating' | 'done';
  message: string;
  percent: number;
  emoji: string;
  tokensGenerated?: number;
}

/** Configuration options */
export interface Options {
  /** Called for each token during streaming */
  onToken?: (token: string) => void;

  /** Called when progress changes */
  onProgress?: (progress: Progress) => void;

  /** AbortSignal to cancel the request */
  signal?: AbortSignal;

  /** Override the model */
  model?: string;

  /** Additional context */
  context?: string;

  /** Minimum quality score to accept (0-100, default 60) */
  minQuality?: number;

  /** Enable telemetry callback */
  onTelemetry?: (event: TelemetryEvent) => void;
}

/** Telemetry event for monitoring */
export interface TelemetryEvent {
  type: 'request' | 'success' | 'error' | 'cache_hit' | 'offline' | 'retry';
  timestamp: number;
  latency?: number;
  quality?: number;
  tokens?: number;
  error?: string;
}

/** Callback types */
export type ProgressCallback = (progress: Progress) => void;
export type TokenCallback = (token: string) => void;
export type TelemetryCallback = (event: TelemetryEvent) => void;

// ============================================================================
// THE SYSTEM PROMPT - Crafted for excellence
// ============================================================================

const SYSTEM_PROMPT = `You are Vito, an expert TypeScript/React code generator.

YOUR MANDATE:
- Generate production-ready code, not prototypes
- Every component must be complete and functional
- Types must be strict and comprehensive
- Styling uses Tailwind CSS with good defaults
- Error handling where appropriate
- Accessibility basics included (aria labels, semantic HTML)

CODE STANDARDS:
- TypeScript strict mode compatible
- React functional components with hooks
- Named exports preferred
- Props interfaces defined
- No 'any' types unless absolutely necessary
- Comments only for non-obvious logic

OUTPUT FORMAT:
- Return ONLY a single code block
- No explanations before or after
- No "Here's the code" or similar phrases
- The code block should be the entire response

EXAMPLE OUTPUT:
\`\`\`tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({
  label,
  onClick,
  variant = "primary",
  disabled = false
}: ButtonProps) {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`\${baseStyles} \${variants[variant]}\`}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}
\`\`\``;

// ============================================================================
// PERSONALITY
// ============================================================================

const VITO = {
  name: 'Vito',

  greetings: [
    "Hey! Let's build something great.",
    'Ready when you are!',
    'What are we creating?',
    "Let's make something amazing.",
  ],

  celebrations: [
    '🎉 Nailed it!',
    '✨ Beautiful work!',
    '🚀 Ship it!',
    '💪 Solid code!',
    "⭐ That's clean!",
    '🎯 Exactly right!',
  ],

  encouragements: [
    "You're on a roll!",
    'This is coming together.',
    'Great instincts!',
    'Looking good!',
    'Nice choice!',
    "This'll work great.",
  ],

  streamingPhrases: ['Writing...', 'Coding...', 'Building...', 'Creating...'],

  recoveryPhrases: [
    'Found another way!',
    'Plan B worked!',
    'Got it from backup!',
    'Switched to local!',
  ],

  qualityMessages: {
    excellent: 'This is production-ready code.',
    good: 'Solid code, ready to use.',
    acceptable: 'Good foundation to build on.',
    needsWork: 'Might need some tweaks.',
  },

  suggestions: {
    form: [
      'Consider adding form validation',
      'Loading states would be nice',
      'Error messages for edge cases?',
    ],
    button: [
      'A loading spinner variant?',
      'Hover animations add polish',
      'Consider a disabled state',
    ],
    modal: ['Escape key to close?', 'Click outside to dismiss?', 'Focus trap for accessibility'],
    card: [
      'Skeleton loader for loading state?',
      'Hover shadow adds depth',
      'Consider responsive sizing',
    ],
    table: ['Pagination for large datasets', 'Sortable columns?', 'Row selection might help'],
    nav: ['Mobile hamburger menu?', 'Active state styling', 'Keyboard navigation?'],
    list: ['Empty state message?', 'Loading skeletons?', 'Infinite scroll option?'],
    input: ['Validation feedback?', 'Character counter?', 'Clear button?'],
    default: ['Looking great!', 'Solid foundation.', 'Ready for the next feature!'],
  },
};

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// STATE
// ============================================================================

const cache = new Map<string, { code: string; raw: string; quality: Quality }>();
const pending = new Map<string, { task: string; attempts: number; backoff: number }>();
let timestamps: number[] = [];

let failures = 0;
let circuitOpen = false;
let circuitOpenedAt = 0;
let isOnline = true;
let lastOnlineCheck = 0;
let requestCount = 0;

// Context memory for continuations
let lastTask = '';
let lastCode = '';

// Configuration
const MAX_CACHE = 500;
const RATE_LIMIT = 50;
const RATE_WINDOW = 60000;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET = 30000;
const OLLAMA_URL = 'http://localhost:11434';
const MAX_RETRIES = 3;
const BASE_BACKOFF = 1000;

// ============================================================================
// THE MAIN FUNCTION
// ============================================================================

/**
 * Generate code with Vito.
 *
 * @param task - What to build
 * @param options - Configuration options
 * @returns Result with code, quality score, and metadata
 */
export async function vito(task: string, options: Options = {}): Promise<Result> {
  const startTime = Date.now();
  const { onToken, onProgress, signal, context, minQuality = 60, onTelemetry } = options;

  const isFirstTime = requestCount === 0;
  requestCount++;

  // Emit telemetry
  const emit = (event: Omit<TelemetryEvent, 'timestamp'>) => {
    onTelemetry?.({ ...event, timestamp: Date.now() });
  };

  emit({ type: 'request' });

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELLATION CHECK
  // ─────────────────────────────────────────────────────────────────────────

  if (signal?.aborted) {
    return cancelled(startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST TIME WELCOME
  // ─────────────────────────────────────────────────────────────────────────

  if (isFirstTime && !task?.trim()) {
    return waiting(
      `Hi! I'm ${VITO.name}. ${random(VITO.greetings)}`,
      "Tell me what you'd like to build.",
      "Try: 'a login form with email and password'",
      startTime
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  if (!task?.trim()) {
    return waiting(
      "I'm ready! What would you like?",
      'Even a rough idea works.',
      'Describe what you need',
      startTime
    );
  }

  if (task.length < 3) {
    return waiting(
      'Tell me a bit more?',
      'A few more words help me understand.',
      'What should it do?',
      startTime
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTINUATION DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  const continuationWords = /\b(that|it|this|the same|previous|last one|above)\b/i;
  const isContinuation = continuationWords.test(task) && lastCode.length > 0;

  let fullTask = task;
  if (isContinuation) {
    fullTask = `Modify this existing code:\n\`\`\`\n${lastCode}\n\`\`\`\n\nRequested change: ${task}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SANITIZE
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
    emit({ type: 'cache_hit' });

    return {
      ok: true,
      code: cached.code,
      raw: cached.raw,
      quality: cached.quality,
      status: 'success',
      message: 'Found it! Remembered this one.',
      encouragement: 'Smart - reusing what worked!',
      nextStep: 'Ready to copy',
      celebration: '⚡ Instant!',
      suggestion: getSuggestion(task),
      continued: isContinuation,
      savedLocally: true,
      willRetryWhenOnline: false,
      language: detectLanguage(cached.code),
      lineCount: cached.code.split('\n').length,
      tokensUsed: 0,
      latency: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROGRESS SYSTEM
  // ─────────────────────────────────────────────────────────────────────────

  let tokensGenerated = 0;

  const emitProgress = (stage: Progress['stage'], percent: number, customMessage?: string) => {
    const stages: Record<Progress['stage'], { message: string; emoji: string }> = {
      starting: { message: 'Getting ready...', emoji: '🎯' },
      thinking: { message: 'Planning the approach...', emoji: '🧠' },
      streaming: { message: customMessage || random(VITO.streamingPhrases), emoji: '✍️' },
      validating: { message: 'Checking quality...', emoji: '🔍' },
      done: { message: 'Complete!', emoji: '🎉' },
    };

    const { message, emoji } = stages[stage];
    onProgress?.({
      stage,
      message: customMessage || message,
      percent,
      emoji,
      tokensGenerated: stage === 'streaming' ? tokensGenerated : undefined,
    });
  };

  emitProgress('starting', 5);

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECTION CHECK
  // ─────────────────────────────────────────────────────────────────────────

  await checkConnection(signal);

  if (signal?.aborted) {
    return cancelled(startTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OFFLINE HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOnline) {
    emit({ type: 'offline' });
    emitProgress('thinking', 20);

    const localResult = await tryLocalModel(clean, onToken, signal);
    if (localResult) {
      const extracted = extractCode(localResult);
      const quality = assessQuality(extracted, task);

      cacheResult(key, extracted, localResult, quality);
      lastTask = task;
      lastCode = extracted;

      emitProgress('done', 100);

      return {
        ok: true,
        code: extracted,
        raw: localResult,
        quality,
        status: 'success',
        message: 'Created offline - no internet needed!',
        encouragement: 'Work from anywhere. ✈️🏔️🏖️',
        nextStep: 'Ready to copy',
        celebration: '🔌 Offline magic!',
        suggestion: getSuggestion(task),
        continued: isContinuation,
        savedLocally: true,
        willRetryWhenOnline: false,
        language: detectLanguage(extracted),
        lineCount: extracted.split('\n').length,
        tokensUsed: 0,
        latency: Date.now() - startTime,
      };
    }

    // Queue for later
    pending.set(key, { task: clean, attempts: 0, backoff: BASE_BACKOFF });

    return {
      ok: false,
      code: '',
      raw: '',
      quality: { score: 0, checks: defaultChecks(), assessment: 'Pending' },
      status: 'offline',
      message: "You're offline, but I saved this.",
      encouragement: "I'll create it when you're back online.",
      nextStep: 'Keep working',
      savedLocally: true,
      willRetryWhenOnline: true,
      queuePosition: pending.size,
      language: 'typescript',
      lineCount: 0,
      tokensUsed: 0,
      latency: Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMIT
  // ─────────────────────────────────────────────────────────────────────────

  cleanupTimestamps();
  const now = Date.now();

  if (timestamps.length >= RATE_LIMIT) {
    const oldest = timestamps[0];
    const waitMs = RATE_WINDOW - (now - oldest);
    const waitSeconds = Math.ceil(waitMs / 1000);

    return waiting(
      `Quick breather - ${waitSeconds}s`,
      "You've been productive!",
      waitSeconds <= 10 ? 'Almost ready...' : 'Check your recent work',
      startTime,
      { stage: 'starting', message: `Ready in ${waitSeconds}s`, percent: 0, emoji: '⏳' }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CIRCUIT BREAKER
  // ─────────────────────────────────────────────────────────────────────────

  if (circuitOpen) {
    if (now - circuitOpenedAt > CIRCUIT_RESET) {
      circuitOpen = false;
      failures = 0;
    } else {
      emitProgress('thinking', 20);

      const localResult = await tryLocalModel(clean, onToken, signal);
      if (localResult) {
        const extracted = extractCode(localResult);
        const quality = assessQuality(extracted, task);

        cacheResult(key, extracted, localResult, quality);
        lastTask = task;
        lastCode = extracted;

        emitProgress('done', 100);

        return {
          ok: true,
          code: extracted,
          raw: localResult,
          quality,
          status: 'success',
          message: `${random(VITO.recoveryPhrases)}`,
          encouragement: 'Main service resting, backup worked!',
          nextStep: 'Ready to copy',
          celebration: '🔄 Plan B!',
          suggestion: getSuggestion(task),
          continued: isContinuation,
          savedLocally: true,
          willRetryWhenOnline: false,
          language: detectLanguage(extracted),
          lineCount: extracted.split('\n').length,
          tokensUsed: 0,
          latency: Date.now() - startTime,
        };
      }

      const waitSeconds = Math.ceil((CIRCUIT_RESET - (now - circuitOpenedAt)) / 1000);

      return waiting(
        `Service recovering - ${waitSeconds}s`,
        "It'll be back shortly!",
        'Take a quick break',
        startTime
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN API CALL WITH STREAMING
  // ─────────────────────────────────────────────────────────────────────────

  timestamps.push(now);
  emitProgress('thinking', 15);

  try {
    const { content: raw, tokens } = await callAPIStreaming(
      clean,
      context,
      options.model,
      token => {
        tokensGenerated++;
        onToken?.(token);

        if (tokensGenerated % 25 === 0) {
          const percent = Math.min(15 + Math.floor(tokensGenerated / 10), 80);
          emitProgress('streaming', percent);
        }
      },
      signal
    );

    if (signal?.aborted) {
      return cancelled(startTime);
    }

    emitProgress('validating', 85);

    // Extract and validate
    const extracted = extractCode(raw);
    const quality = assessQuality(extracted, task);

    // Quality gate - retry if too low
    if (quality.score < minQuality && !isContinuation) {
      emit({ type: 'retry', quality: quality.score });

      // One retry with more explicit prompt
      const retryPrompt = `${clean}\n\nIMPORTANT: Generate complete, production-ready code. Include all necessary types and error handling.`;

      const { content: retryRaw, tokens: retryTokens } = await callAPIStreaming(
        retryPrompt,
        context,
        options.model,
        onToken || (() => {}),
        signal
      );

      const retryExtracted = extractCode(retryRaw);
      const retryQuality = assessQuality(retryExtracted, task);

      if (retryQuality.score > quality.score) {
        cacheResult(key, retryExtracted, retryRaw, retryQuality);
        lastTask = task;
        lastCode = retryExtracted;
        failures = 0;

        processPendingQueue();
        emitProgress('done', 100);

        emit({
          type: 'success',
          latency: Date.now() - startTime,
          quality: retryQuality.score,
          tokens: tokens + retryTokens,
        });

        return successResult(
          retryExtracted,
          retryRaw,
          retryQuality,
          task,
          isContinuation,
          tokens + retryTokens,
          startTime
        );
      }
    }

    // Cache and return
    cacheResult(key, extracted, raw, quality);
    lastTask = task;
    lastCode = extracted;
    failures = 0;

    processPendingQueue();
    emitProgress('done', 100);

    emit({ type: 'success', latency: Date.now() - startTime, quality: quality.score, tokens });

    return successResult(extracted, raw, quality, task, isContinuation, tokens, startTime);
  } catch (err) {
    if (signal?.aborted) {
      return cancelled(startTime);
    }

    failures++;
    if (failures >= CIRCUIT_THRESHOLD) {
      circuitOpen = true;
      circuitOpenedAt = Date.now();
    }

    emit({ type: 'error', error: err instanceof Error ? err.message : 'Unknown' });

    // Try local fallback
    const localResult = await tryLocalModel(clean, onToken, signal);
    if (localResult) {
      const extracted = extractCode(localResult);
      const quality = assessQuality(extracted, task);

      cacheResult(key, extracted, localResult, quality);
      lastTask = task;
      lastCode = extracted;

      emitProgress('done', 100);

      return {
        ok: true,
        code: extracted,
        raw: localResult,
        quality,
        status: 'success',
        message: `${random(VITO.recoveryPhrases)}`,
        encouragement: 'Found another way!',
        nextStep: 'Ready to copy',
        celebration: '🛟 Saved!',
        suggestion: getSuggestion(task),
        continued: isContinuation,
        savedLocally: true,
        willRetryWhenOnline: false,
        language: detectLanguage(extracted),
        lineCount: extracted.split('\n').length,
        tokensUsed: 0,
        latency: Date.now() - startTime,
      };
    }

    // Queue for retry
    pending.set(key, { task: clean, attempts: 1, backoff: BASE_BACKOFF });

    const errorMessage = err instanceof Error ? err.message : '';

    return {
      ok: false,
      code: '',
      raw: '',
      quality: { score: 0, checks: defaultChecks(), assessment: 'Error' },
      status: 'error',
      message: friendlyError(errorMessage),
      encouragement: "Saved your request - I'll keep trying.",
      nextStep: 'Try again in a moment',
      savedLocally: true,
      willRetryWhenOnline: true,
      queuePosition: pending.size,
      language: 'typescript',
      lineCount: 0,
      tokensUsed: 0,
      latency: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SUCCESS RESULT BUILDER
// ============================================================================

function successResult(
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
    status: 'success',
    message: random(VITO.celebrations),
    encouragement: random(VITO.encouragements),
    nextStep: 'Copy the code and make it yours',
    celebration: pickCelebration(requestCount),
    suggestion: getSuggestion(task),
    continued,
    savedLocally: true,
    willRetryWhenOnline: false,
    language: detectLanguage(code),
    lineCount: code.split('\n').length,
    tokensUsed: tokens,
    latency: Date.now() - startTime,
  };
}

// ============================================================================
// HELPER RESULT BUILDERS
// ============================================================================

function cancelled(startTime: number): Result {
  return {
    ok: false,
    code: '',
    raw: '',
    quality: { score: 0, checks: defaultChecks(), assessment: 'Cancelled' },
    status: 'cancelled',
    message: 'Cancelled.',
    encouragement: 'Ready when you are!',
    nextStep: 'Try again anytime',
    savedLocally: false,
    willRetryWhenOnline: false,
    language: 'typescript',
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

function waiting(
  message: string,
  encouragement: string,
  nextStep: string,
  startTime: number,
  progress?: Progress
): Result {
  return {
    ok: false,
    code: '',
    raw: '',
    quality: { score: 0, checks: defaultChecks(), assessment: 'Waiting' },
    status: 'waiting',
    message,
    encouragement,
    nextStep,
    progress,
    savedLocally: false,
    willRetryWhenOnline: false,
    language: 'typescript',
    lineCount: 0,
    tokensUsed: 0,
    latency: Date.now() - startTime,
  };
}

function defaultChecks(): Quality['checks'] {
  return {
    hasTypes: false,
    hasExports: false,
    isComplete: false,
    hasErrorHandling: false,
    matchesRequest: false,
  };
}

// ============================================================================
// CODE EXTRACTION - Clean code from markdown
// ============================================================================

function extractCode(raw: string): string {
  // Try to find code block
  const codeBlockMatch = raw.match(/```(?:tsx?|jsx?|typescript|javascript)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try generic code block
  const genericMatch = raw.match(/```\n?([\s\S]*?)```/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  // No code block, return cleaned raw
  return raw
    .replace(/^Here's?\s+(the\s+)?code:?\s*/i, '')
    .replace(/^```\w*\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

// ============================================================================
// QUALITY ASSESSMENT
// ============================================================================

function assessQuality(code: string, task: string): Quality {
  if (!code || code.length < 10) {
    return {
      score: 0,
      checks: defaultChecks(),
      assessment: 'No code generated',
    };
  }

  const checks = {
    hasTypes:
      /:\s*(string|number|boolean|void|Promise|Array|Record|React\.|HTMLElement|\[\]|<.*>)/i.test(
        code
      ),
    hasExports: /export\s+(default\s+)?(function|const|class|interface|type)\b/.test(code),
    isComplete: hasClosingBraces(code) && !code.includes('// TODO') && !code.includes('...'),
    hasErrorHandling:
      /try\s*\{|catch\s*\(|\.catch\(|throw\s+new/.test(code) || !needsErrorHandling(task),
    matchesRequest: matchesRequest(code, task),
  };

  // Calculate score
  let score = 0;
  if (checks.hasTypes) score += 25;
  if (checks.hasExports) score += 20;
  if (checks.isComplete) score += 25;
  if (checks.hasErrorHandling) score += 15;
  if (checks.matchesRequest) score += 15;

  // Bonus for length (longer usually means more complete)
  const lines = code.split('\n').length;
  if (lines > 10) score += Math.min(10, Math.floor(lines / 10));

  // Bonus for good patterns
  if (/interface\s+\w+Props/.test(code)) score += 5;
  if (/aria-\w+/.test(code)) score += 5;
  if (/className=/.test(code)) score += 5;

  score = Math.min(100, score);

  let assessment: string;
  if (score >= 85) assessment = VITO.qualityMessages.excellent;
  else if (score >= 70) assessment = VITO.qualityMessages.good;
  else if (score >= 50) assessment = VITO.qualityMessages.acceptable;
  else assessment = VITO.qualityMessages.needsWork;

  return { score, checks, assessment };
}

function hasClosingBraces(code: string): boolean {
  const opens = (code.match(/\{/g) || []).length;
  const closes = (code.match(/\}/g) || []).length;
  return opens === closes && opens > 0;
}

function needsErrorHandling(task: string): boolean {
  const errorPatterns = /fetch|api|async|submit|save|delete|update|post|get/i;
  return errorPatterns.test(task);
}

function matchesRequest(code: string, task: string): boolean {
  const taskWords = task
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3);
  const codeLower = code.toLowerCase();

  let matches = 0;
  for (const word of taskWords) {
    if (codeLower.includes(word)) matches++;
  }

  return taskWords.length === 0 || matches / taskWords.length >= 0.3;
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

function getSuggestion(task: string): string {
  const lower = task.toLowerCase();

  if (/form|input|field|submit/.test(lower)) return random(VITO.suggestions.form);
  if (/button|btn|click/.test(lower)) return random(VITO.suggestions.button);
  if (/modal|dialog|popup|overlay/.test(lower)) return random(VITO.suggestions.modal);
  if (/card|tile|box|panel/.test(lower)) return random(VITO.suggestions.card);
  if (/table|grid|data|rows/.test(lower)) return random(VITO.suggestions.table);
  if (/nav|menu|header|sidebar|footer/.test(lower)) return random(VITO.suggestions.nav);
  if (/list|items|collection/.test(lower)) return random(VITO.suggestions.list);
  if (/input|text|email|password/.test(lower)) return random(VITO.suggestions.input);

  return random(VITO.suggestions.default);
}

// ============================================================================
// MILESTONES
// ============================================================================

function pickCelebration(count: number): string {
  if (count === 1) return '🎊 First build! Welcome to Vito!';
  if (count === 5) return "🔥 5 builds! You're getting it!";
  if (count === 10) return '🏆 Double digits!';
  if (count === 25) return '⭐ 25! Power user!';
  if (count === 50) return '💎 50! Legendary!';
  if (count === 100) return '👑 100! Master status!';
  if (count % 100 === 0) return `🎯 ${count}! Unstoppable!`;
  if (count % 25 === 0) return `🌟 ${count} builds!`;

  return random(VITO.celebrations);
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

function detectLanguage(code: string): string {
  if (/^["']use client["']|^import\s+.*from\s+["']react["']|<[A-Z]\w+/.test(code)) return 'tsx';
  if (/^import\s|^export\s|:\s*(string|number|boolean|void)/.test(code)) return 'typescript';
  if (/^const\s|^let\s|^function\s|^class\s/.test(code)) return 'javascript';
  if (/^<\w+|^<!DOCTYPE/i.test(code)) return 'html';
  if (/^\.\w+\s*\{|^#\w+\s*\{|^@media|^@tailwind/.test(code)) return 'css';
  return 'typescript';
}

// ============================================================================
// STREAMING API
// ============================================================================

async function callAPIStreaming(
  task: string,
  context: string | undefined,
  model: string | undefined,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<{ content: string; tokens: number }> {
  const client = new Anthropic();

  let userPrompt = task;
  if (context) {
    userPrompt = `Context:\n${context}\n\n${task}`;
  }

  const stream = await client.messages.stream({
    model: model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let content = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (signal?.aborted) {
      stream.controller.abort();
      throw new Error('Aborted');
    }

    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      content += event.delta.text;
      onToken(event.delta.text);
    }

    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens;
    }

    if (event.type === 'message_start' && event.message.usage) {
      inputTokens = event.message.usage.input_tokens;
    }
  }

  return { content, tokens: inputTokens + outputTokens };
}

// ============================================================================
// LOCAL MODEL (OFFLINE FALLBACK)
// ============================================================================

async function tryLocalModel(
  task: string,
  onToken?: TokenCallback,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: `You are a TypeScript/React code generator. Generate production-ready code for:\n\n${task}\n\nReturn only a code block, no explanations.`,
        stream: true,
      }),
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    let content = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            content += data.response;
            onToken?.(data.response);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return content || null;
  } catch {
    return null;
  }
}

// ============================================================================
// CONNECTION & QUEUE MANAGEMENT
// ============================================================================

async function checkConnection(signal?: AbortSignal): Promise<void> {
  const now = Date.now();
  if (now - lastOnlineCheck < 5000) return;
  lastOnlineCheck = now;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch('https://api.anthropic.com', {
      method: 'HEAD',
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);
    isOnline = true;

    if (pending.size > 0) {
      processPendingQueue();
    }
  } catch {
    isOnline = false;
  }
}

async function processPendingQueue(): Promise<void> {
  if (!isOnline || pending.size === 0) return;

  for (const [key, item] of Array.from(pending.entries())) {
    if (item.attempts >= MAX_RETRIES) {
      pending.delete(key);
      continue;
    }

    // Exponential backoff
    const waitTime = item.backoff * Math.pow(2, item.attempts);
    await sleep(Math.min(waitTime, 30000));

    try {
      const { content } = await callAPIStreaming(
        item.task,
        undefined,
        undefined,
        () => {},
        undefined
      );
      const extracted = extractCode(content);
      const quality = assessQuality(extracted, item.task);

      cacheResult(key, extracted, content, quality);
      pending.delete(key);
    } catch {
      item.attempts++;
    }
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function cacheResult(key: string, code: string, raw: string, quality: Quality): void {
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { code, raw, quality });
}

function cleanupTimestamps(): void {
  const now = Date.now();
  timestamps = timestamps.filter(t => now - t < RATE_WINDOW);
}

// ============================================================================
// UTILITIES
// ============================================================================

function sanitize(input: string): string {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, 15000);
}

/**
 * MurmurHash3-inspired hash function.
 * Fast, low collision rate, deterministic.
 */
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

function friendlyError(msg: string): string {
  if (msg.includes('rate') || msg.includes('429')) {
    return 'Whoa, going fast! Quick breather.';
  }
  if (msg.includes('401') || msg.includes('key')) {
    return 'Config issue - check the setup?';
  }
  if (msg.includes('timeout') || msg.includes('abort') || msg.includes('Aborted')) {
    return 'That was big! Try breaking it down.';
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return 'Server hiccup. Not you, them!';
  }
  if (msg.includes('network') || msg.includes('ENOTFOUND')) {
    return 'No internet. Airplane mode?';
  }
  return 'Hit a snag, but request is saved!';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get current Vito status.
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
    cacheCount: cache.size,
    totalBuilds: requestCount,
    lastTask,
    circuitOpen,
  };
}

/**
 * Reset all state. Useful for testing.
 */
export function reset(): void {
  cache.clear();
  pending.clear();
  timestamps = [];
  failures = 0;
  circuitOpen = false;
  circuitOpenedAt = 0;
  requestCount = 0;
  lastTask = '';
  lastCode = '';
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
  const lines = code.split('\n');
  return {
    full: code,
    preview: lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n...' : ''),
    lineCount: lines.length,
    language: detectLanguage(code),
  };
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
  hitRate: number;
} {
  return {
    size: cache.size,
    maxSize: MAX_CACHE,
    hitRate: requestCount > 0 ? cache.size / requestCount : 0,
  };
}

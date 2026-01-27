/**
 * Result<T, E> - Errors as values. Inspired by Rust.
 */

export const VisionErrorCode = {
  // Client (don't retry)
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_PROMPT: 'INVALID_PROMPT',
  PROMPT_TOO_LONG: 'PROMPT_TOO_LONG',
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_API_KEY: 'INVALID_API_KEY',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',

  // Server (may retry)
  GENERATION_FAILED: 'GENERATION_FAILED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',

  // Resource (retry after delay)
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CONCURRENT_LIMIT: 'CONCURRENT_LIMIT',

  // Timeout
  TIMEOUT: 'TIMEOUT',
  DEADLINE_EXCEEDED: 'DEADLINE_EXCEEDED',

  // Other
  CANCELLED: 'CANCELLED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type VisionErrorCode = (typeof VisionErrorCode)[keyof typeof VisionErrorCode];

export interface VisionError {
  code: VisionErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  source?: string;
  context?: Record<string, unknown>;
  cause?: Error;
  timestamp: number;
  traceId?: string;
}

const RETRYABLE = new Set<VisionErrorCode>([
  VisionErrorCode.RATE_LIMITED,
  VisionErrorCode.QUOTA_EXCEEDED,
  VisionErrorCode.CONCURRENT_LIMIT,
  VisionErrorCode.TIMEOUT,
  VisionErrorCode.DEADLINE_EXCEEDED,
  VisionErrorCode.PROVIDER_UNAVAILABLE,
  VisionErrorCode.CIRCUIT_OPEN,
  VisionErrorCode.GENERATION_FAILED,
  VisionErrorCode.PROVIDER_ERROR,
]);

const DELAYS: Partial<Record<VisionErrorCode, number>> = {
  [VisionErrorCode.RATE_LIMITED]: 1000,
  [VisionErrorCode.QUOTA_EXCEEDED]: 60000,
  [VisionErrorCode.CONCURRENT_LIMIT]: 100,
  [VisionErrorCode.CIRCUIT_OPEN]: 5000,
};

export function createError(
  code: VisionErrorCode,
  message: string,
  opts: Partial<Omit<VisionError, 'code' | 'message' | 'timestamp'>> = {}
): VisionError {
  const retryable = RETRYABLE.has(code);
  return {
    code,
    message,
    retryable: opts.retryable ?? retryable,
    retryAfterMs: opts.retryAfterMs ?? (retryable ? (DELAYS[code] ?? 1000) : undefined),
    source: opts.source,
    context: opts.context,
    cause: opts.cause,
    timestamp: Date.now(),
    traceId: opts.traceId,
  };
}

// Result type
export type Result<T, E = VisionError> = { ok: true; value: T } | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw (r as { ok: false; error: E }).error;
};

export const unwrapOr = <T, E>(r: Result<T, E>, def: T): T => (r.ok ? r.value : def);

// Combinators
export const map = <T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> =>
  r.ok ? Ok(fn(r.value)) : Err(r.error);

export const flatMap = <T, U, E>(r: Result<T, E>, fn: (v: T) => Result<U, E>): Result<U, E> =>
  r.ok ? fn(r.value) : Err(r.error);

export const collect = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return Err(r.error);
    values.push(r.value);
  }
  return Ok(values);
};

export const partition = <T, E>(results: Result<T, E>[]): { successes: T[]; failures: E[] } => {
  const successes: T[] = [],
    failures: E[] = [];
  for (const r of results) r.ok ? successes.push(r.value) : failures.push(r.error);
  return { successes, failures };
};

// Async
export async function fromPromise<T>(
  p: Promise<T>,
  mapper?: (e: unknown) => VisionError
): Promise<Result<T, VisionError>> {
  try {
    return Ok(await p);
  } catch (e) {
    return Err(
      mapper?.(e) ??
        createError(VisionErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'Unknown')
    );
  }
}

export async function withRetry<T>(
  fn: () => Promise<Result<T, VisionError>>,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (e: VisionError, attempt: number) => boolean;
    onRetry?: (e: VisionError, attempt: number, delay: number) => void;
  } = {}
): Promise<Result<T, VisionError>> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = e => e.retryable,
    onRetry,
  } = opts;
  let lastErr: VisionError | undefined;

  for (let i = 1; i <= maxAttempts; i++) {
    const r = await fn();
    if (r.ok) return r;

    lastErr = r.error;
    if (i >= maxAttempts || !shouldRetry(r.error, i)) return Err(r.error);

    const delay = Math.min(
      (r.error.retryAfterMs ?? baseDelayMs) * Math.pow(2, i - 1) * (1 + Math.random() * 0.1),
      maxDelayMs
    );
    onRetry?.(r.error, i, delay);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return Err(lastErr ?? createError(VisionErrorCode.INTERNAL_ERROR, 'Retry exhausted'));
}

/**
 * OLYMPUS 2.0 - AI Output Validation & Circuit Breaker
 *
 * Production-grade validation for AI agent outputs.
 * Prevents crashes from malformed responses and implements circuit breaker pattern.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  fallback: boolean;
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting reset */
  resetTimeoutMs: number;
  /** Number of successes needed to close circuit */
  successThreshold: number;
}

export interface CircuitBreakerState {
  failures: number;
  successes: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailureTime: number | null;
  lastError: string | null;
}

export interface ConversionJudgeOutput {
  scores: {
    wiifm: ScoreDimension;
    clarity: ScoreDimension;
    emotional: ScoreDimension;
    ctaStrength: ScoreDimension;
    objectionCoverage: ScoreDimension;
    antiPlaceholder: ScoreDimension;
  };
  totalScore: number;
  verdict: 'PASS' | 'ENHANCE' | 'REJECT';
  priorityFixes: string[];
  estimatedImprovement: string;
  enhancementNotes?: string;
}

interface ScoreDimension {
  score: number;
  issues: string[];
  suggestions: string[];
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
};

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

/**
 * Get or create circuit breaker state for a service
 */
function getCircuitBreaker(serviceId: string): CircuitBreakerState {
  if (!circuitBreakers.has(serviceId)) {
    circuitBreakers.set(serviceId, {
      failures: 0,
      successes: 0,
      state: 'CLOSED',
      lastFailureTime: null,
      lastError: null,
    });
  }
  return circuitBreakers.get(serviceId)!;
}

/**
 * Check if circuit breaker allows request
 */
export function canExecute(
  serviceId: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): { allowed: boolean; reason?: string } {
  const breaker = getCircuitBreaker(serviceId);

  switch (breaker.state) {
    case 'CLOSED':
      return { allowed: true };

    case 'OPEN':
      // Check if reset timeout has passed
      if (
        breaker.lastFailureTime &&
        Date.now() - breaker.lastFailureTime >= config.resetTimeoutMs
      ) {
        breaker.state = 'HALF_OPEN';
        breaker.successes = 0;
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Circuit OPEN: ${breaker.failures} failures, last error: ${breaker.lastError}`,
      };

    case 'HALF_OPEN':
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

/**
 * Record success for circuit breaker
 */
export function recordSuccess(
  serviceId: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): void {
  const breaker = getCircuitBreaker(serviceId);

  if (breaker.state === 'HALF_OPEN') {
    breaker.successes++;
    if (breaker.successes >= config.successThreshold) {
      // Close circuit
      breaker.state = 'CLOSED';
      breaker.failures = 0;
      breaker.successes = 0;
      breaker.lastError = null;
    }
  } else if (breaker.state === 'CLOSED') {
    // Reset failure count on success
    breaker.failures = 0;
  }
}

/**
 * Record failure for circuit breaker
 */
export function recordFailure(
  serviceId: string,
  error: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): void {
  const breaker = getCircuitBreaker(serviceId);

  breaker.failures++;
  breaker.lastFailureTime = Date.now();
  breaker.lastError = error;

  if (breaker.state === 'HALF_OPEN') {
    // Back to OPEN on any failure in half-open state
    breaker.state = 'OPEN';
  } else if (breaker.failures >= config.failureThreshold) {
    breaker.state = 'OPEN';
  }
}

/**
 * Reset circuit breaker (for testing or manual intervention)
 */
export function resetCircuitBreaker(serviceId: string): void {
  circuitBreakers.delete(serviceId);
}

/**
 * Get circuit breaker status
 */
export function getCircuitStatus(serviceId: string): CircuitBreakerState {
  return getCircuitBreaker(serviceId);
}

// ============================================================================
// SCORE VALIDATION
// ============================================================================

/**
 * Clamp a number to valid score range (0-100)
 */
export function clampScore(score: unknown): number {
  if (typeof score !== 'number' || isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Validate and sanitize a score dimension
 */
function validateScoreDimension(dim: unknown): ScoreDimension {
  const defaultDim: ScoreDimension = {
    score: 0,
    issues: [],
    suggestions: [],
  };

  if (!dim || typeof dim !== 'object') {
    return defaultDim;
  }

  const d = dim as Record<string, unknown>;

  return {
    score: clampScore(d.score),
    issues: Array.isArray(d.issues) ? d.issues.filter(i => typeof i === 'string').slice(0, 10) : [],
    suggestions: Array.isArray(d.suggestions)
      ? d.suggestions.filter(s => typeof s === 'string').slice(0, 10)
      : [],
  };
}

/**
 * Validate CONVERSION_JUDGE output
 * Returns sanitized output or null if completely invalid
 */
export function validateConversionJudgeOutput(
  raw: unknown
): ValidationResult<ConversionJudgeOutput> {
  // Handle null/undefined
  if (!raw) {
    return {
      success: false,
      data: null,
      error: 'Empty response from CONVERSION_JUDGE',
      fallback: false,
    };
  }

  // Try to extract object
  let obj: Record<string, unknown>;

  if (typeof raw === 'string') {
    // Try to parse JSON from string (may have markdown wrapper)
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          data: null,
          error: 'No JSON object found in response',
          fallback: false,
        };
      }
      obj = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return {
        success: false,
        data: null,
        error: `JSON parse error: ${e instanceof Error ? e.message : 'unknown'}`,
        fallback: false,
      };
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    return {
      success: false,
      data: null,
      error: `Invalid response type: ${typeof raw}`,
      fallback: false,
    };
  }

  // Validate required fields exist
  const hasScores = obj.scores && typeof obj.scores === 'object';
  const hasTotalScore = 'totalScore' in obj;
  const hasVerdict = 'verdict' in obj;

  if (!hasScores || !hasTotalScore || !hasVerdict) {
    return {
      success: false,
      data: null,
      error: `Missing required fields: ${[
        !hasScores && 'scores',
        !hasTotalScore && 'totalScore',
        !hasVerdict && 'verdict',
      ]
        .filter(Boolean)
        .join(', ')}`,
      fallback: false,
    };
  }

  // Validate and sanitize verdict
  const rawVerdict = String(obj.verdict).toUpperCase();
  let verdict: 'PASS' | 'ENHANCE' | 'REJECT';
  if (rawVerdict === 'PASS' || rawVerdict === 'ENHANCE' || rawVerdict === 'REJECT') {
    verdict = rawVerdict;
  } else {
    // Default to REJECT for safety on invalid verdict
    verdict = 'REJECT';
  }

  // Validate and sanitize scores
  const scores = obj.scores as Record<string, unknown>;
  const validatedScores = {
    wiifm: validateScoreDimension(scores.wiifm),
    clarity: validateScoreDimension(scores.clarity),
    emotional: validateScoreDimension(scores.emotional),
    ctaStrength: validateScoreDimension(scores.ctaStrength),
    objectionCoverage: validateScoreDimension(scores.objectionCoverage),
    antiPlaceholder: validateScoreDimension(scores.antiPlaceholder),
  };

  // Validate total score
  const totalScore = clampScore(obj.totalScore);

  // Validate priority fixes
  const priorityFixes = Array.isArray(obj.priorityFixes)
    ? obj.priorityFixes.filter(f => typeof f === 'string').slice(0, 10)
    : [];

  // Build validated output
  const validated: ConversionJudgeOutput = {
    scores: validatedScores,
    totalScore,
    verdict,
    priorityFixes,
    estimatedImprovement:
      typeof obj.estimatedImprovement === 'string'
        ? obj.estimatedImprovement.slice(0, 200)
        : 'Unknown',
    enhancementNotes:
      typeof obj.enhancementNotes === 'string' ? obj.enhancementNotes.slice(0, 500) : undefined,
  };

  // Check if verdict matches score (sanity check)
  const expectedVerdict = totalScore >= 85 ? 'PASS' : totalScore >= 70 ? 'ENHANCE' : 'REJECT';

  if (verdict !== expectedVerdict) {
    // Override with calculated verdict for consistency
    validated.verdict = expectedVerdict;
  }

  return {
    success: true,
    data: validated,
    error: null,
    fallback: false,
  };
}

/**
 * Create a safe fallback REJECT response
 */
export function createFallbackRejectResponse(reason: string): ConversionJudgeOutput {
  return {
    scores: {
      wiifm: { score: 0, issues: [reason], suggestions: ['Re-run scoring'] },
      clarity: { score: 0, issues: [], suggestions: [] },
      emotional: { score: 0, issues: [], suggestions: [] },
      ctaStrength: { score: 0, issues: [], suggestions: [] },
      objectionCoverage: { score: 0, issues: [], suggestions: [] },
      antiPlaceholder: { score: 0, issues: [], suggestions: [] },
    },
    totalScore: 0,
    verdict: 'REJECT',
    priorityFixes: [`System error: ${reason}`],
    estimatedImprovement: 'Cannot estimate - error occurred',
  };
}

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================

/**
 * Execute a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
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

/**
 * Execute with retry and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Circuit breaker
  canExecute,
  recordSuccess,
  recordFailure,
  resetCircuitBreaker,
  getCircuitStatus,

  // Validation
  clampScore,
  validateConversionJudgeOutput,
  createFallbackRejectResponse,

  // Timeout/Retry
  withTimeout,
  withRetry,
};

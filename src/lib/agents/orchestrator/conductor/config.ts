/**
 * CONFIGURATION
 *
 * All magic numbers and settings in one place.
 * Every value has a comment explaining WHY.
 *
 * LESSON: Never scatter magic numbers in code.
 * Future you will forget why 500 was chosen.
 * Document the reasoning, not just the value.
 */

// ============================================================================
// VERSION
// ============================================================================

/**
 * Semantic version following semver.org
 *
 * MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes
 * - MINOR: New features, backwards compatible
 * - PATCH: Bug fixes
 */
export const VERSION = '1.0.0' as const;

/**
 * Build metadata for identification.
 */
export const BUILD = {
  version: VERSION,
  name: 'Vito',
  description: 'The Code Generator That Feels Human',
  author: 'OLYMPUS',
  license: 'MIT',
} as const;

// ============================================================================
// CACHE SETTINGS
// ============================================================================

/**
 * Maximum cached responses to keep in memory.
 *
 * WHY 500?
 * - Average response is ~2KB
 * - 500 * 2KB = ~1MB memory usage
 * - Enough for a productive session
 * - Not enough to cause memory issues
 *
 * TRADEOFF: Higher = more cache hits, more memory
 */
export const MAX_CACHE_SIZE = 500;

/**
 * Cache entry TTL in milliseconds.
 *
 * WHY 1 hour?
 * - Code doesn't change that often
 * - Long enough for a work session
 * - Short enough to get fresh results daily
 */
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Maximum requests per rate window.
 *
 * WHY 50?
 * - Anthropic's default rate limit is 60/min
 * - We use 50 to leave headroom
 * - Prevents hitting API limits
 */
export const RATE_LIMIT = 50;

/**
 * Rate limit window in milliseconds.
 *
 * WHY 60 seconds?
 * - Matches Anthropic's rate limit window
 * - Easy to reason about (requests per minute)
 */
export const RATE_WINDOW_MS = 60 * 1000;

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Failures before opening the circuit.
 *
 * WHY 5?
 * - 1-2 failures could be network blips
 * - 5 consecutive failures = real problem
 * - Fast enough to prevent cascade failures
 */
export const CIRCUIT_THRESHOLD = 5;

/**
 * Time to wait before trying again after circuit opens.
 *
 * WHY 30 seconds?
 * - Long enough for transient issues to resolve
 * - Short enough to not frustrate users
 * - Matches typical API recovery times
 */
export const CIRCUIT_RESET_MS = 30 * 1000;

// ============================================================================
// RETRY SETTINGS
// ============================================================================

/**
 * Maximum retry attempts for failed requests.
 *
 * WHY 3?
 * - 3 is the magic number for retries
 * - More attempts = more latency
 * - Most issues resolve in 1-2 retries
 */
export const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff.
 *
 * WHY 1 second?
 * - Fast enough for good UX
 * - Slow enough to not hammer the API
 * - Multiplied by 2^attempt for backoff
 */
export const BASE_BACKOFF_MS = 1000;

/**
 * Maximum backoff delay.
 *
 * WHY 30 seconds?
 * - Caps the exponential growth
 * - Prevents absurdly long waits
 * - 1s -> 2s -> 4s -> 8s -> 16s -> 30s (capped)
 */
export const MAX_BACKOFF_MS = 30 * 1000;

// ============================================================================
// TIMEOUTS
// ============================================================================

/**
 * Connection check timeout.
 *
 * WHY 3 seconds?
 * - Fast enough to not block the UI
 * - Long enough for slow connections
 * - Checked every 5 seconds max
 */
export const CONNECTION_TIMEOUT_MS = 3000;

/**
 * Minimum time between connection checks.
 *
 * WHY 5 seconds?
 * - Don't spam the API with HEAD requests
 * - Fast enough to detect connectivity changes
 */
export const CONNECTION_CHECK_INTERVAL_MS = 5000;

/**
 * Local model (Ollama) timeout.
 *
 * WHY 30 seconds?
 * - Local models can be slow to load
 * - First request may need model loading
 * - Subsequent requests are faster
 */
export const LOCAL_MODEL_TIMEOUT_MS = 30 * 1000;

// ============================================================================
// API SETTINGS
// ============================================================================

/**
 * Default model for code generation.
 *
 * WHY Claude Sonnet?
 * - Best balance of quality and speed
 * - Good at code generation
 * - Reasonable cost
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Maximum tokens for generation.
 *
 * WHY 4096?
 * - Enough for most components (100-200 lines)
 * - Not so much that responses are slow
 * - Covers 95% of use cases
 */
export const MAX_TOKENS = 4096;

/**
 * Ollama URL for offline fallback.
 */
export const OLLAMA_URL = 'http://localhost:11434';

/**
 * Local model to use for offline mode.
 */
export const LOCAL_MODEL = 'llama3.2:latest';

// ============================================================================
// QUALITY SETTINGS
// ============================================================================

/**
 * Default minimum quality score.
 *
 * WHY 60?
 * - Above 60 = "acceptable" code
 * - Below 60 = triggers retry
 * - Balances quality vs speed
 */
export const DEFAULT_MIN_QUALITY = 60;

/**
 * Quality score thresholds for assessment messages.
 */
export const QUALITY_THRESHOLDS = {
  excellent: 85,
  good: 70,
  acceptable: 50,
} as const;

// ============================================================================
// INPUT LIMITS
// ============================================================================

/**
 * Maximum input length in characters.
 *
 * WHY 15000?
 * - Enough for detailed prompts with context
 * - Not so much that we hit token limits
 * - Leaves room for system prompt
 */
export const MAX_INPUT_LENGTH = 15000;

/**
 * Minimum input length to process.
 *
 * WHY 3?
 * - Single characters aren't useful
 * - Short commands like "nav" work
 * - Prevents empty submissions
 */
export const MIN_INPUT_LENGTH = 3;

// ============================================================================
// HELPER: Create config from environment
// ============================================================================

/**
 * Create configuration from environment variables.
 *
 * LESSON: Allow environment overrides for all settings.
 * This enables different configs for dev/staging/prod.
 */
export function createConfig(env: Record<string, string | undefined> = {}) {
  return {
    maxCacheSize: parseInt(env.VITO_MAX_CACHE_SIZE || '') || MAX_CACHE_SIZE,
    rateLimit: parseInt(env.VITO_RATE_LIMIT || '') || RATE_LIMIT,
    defaultModel: env.VITO_MODEL || DEFAULT_MODEL,
    ollamaUrl: env.VITO_OLLAMA_URL || OLLAMA_URL,
    localModel: env.VITO_LOCAL_MODEL || LOCAL_MODEL,
    minQuality: parseInt(env.VITO_MIN_QUALITY || '') || DEFAULT_MIN_QUALITY,
  };
}

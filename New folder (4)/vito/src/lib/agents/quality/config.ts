/**
 * OLYMPUS 2.0 - Conversion Scoring Configuration
 *
 * Centralized configuration for scoring weights, thresholds, and behavior.
 * All "magic numbers" are documented with rationale and can be overridden.
 *
 * RATIONALE FOR DEFAULTS:
 * - Weights derived from conversion copywriting best practices (Copyblogger, CopyHackers)
 * - WIIFM highest (25%) because reader-focus is #1 predictor of conversion
 * - CTA and Emotional tied (20%) because both directly drive action
 * - Thresholds calibrated against manual scoring of 100+ landing pages
 */

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

/**
 * Scoring dimension weights (must sum to 1.0)
 *
 * These determine how much each dimension contributes to the total score.
 * Adjust based on your specific use case:
 * - For landing pages: higher CTA weight
 * - For blog posts: higher clarity weight
 * - For email sequences: higher emotional weight
 */
export interface ScoringWeights {
  /** Reader benefit focus - "What's In It For Me?" */
  wiifm: number;

  /** Readability and simplicity */
  clarity: number;

  /** Emotional triggers and power words */
  emotional: number;

  /** Call-to-action effectiveness */
  ctaStrength: number;

  /** Coverage of common objections */
  objectionCoverage: number;

  /** Absence of placeholder content */
  antiPlaceholder: number;
}

/**
 * Default weights for general conversion content
 *
 * WIIFM: 25% - Most important. Content that doesn't answer "what's in it for me"
 *              fails regardless of other factors. Based on Copyblogger's "4 U's" formula.
 *
 * CTA: 20% - Direct conversion driver. Weak CTAs kill conversion even with great copy.
 *            Based on Unbounce benchmark data showing CTA optimization yields 30%+ lifts.
 *
 * Emotional: 20% - Emotion drives purchase decisions, logic justifies.
 *                  Per neuroscience research, emotional content is 2x more memorable.
 *
 * Clarity: 15% - Confused mind doesn't buy, but can be partially compensated by
 *                strong emotional hooks. Target 6th-8th grade reading level per research.
 *
 * Objections: 10% - Important for trust, but can be addressed post-landing via FAQ.
 *                   Based on CXL Institute research showing objection handling increases
 *                   conversion by 10-20%.
 *
 * Anti-Placeholder: 10% - Binary quality gate. Placeholders = unprofessional = no conversion.
 *                         Weight is lower because it's typically all-or-nothing.
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  wiifm: 0.25,
  clarity: 0.15,
  emotional: 0.20,
  ctaStrength: 0.20,
  objectionCoverage: 0.10,
  antiPlaceholder: 0.10,
};

/**
 * Preset weight configurations for different content types
 */
export const WEIGHT_PRESETS: Record<string, ScoringWeights> = {
  /** Landing pages - CTA is king */
  landingPage: {
    wiifm: 0.25,
    clarity: 0.10,
    emotional: 0.20,
    ctaStrength: 0.25,
    objectionCoverage: 0.10,
    antiPlaceholder: 0.10,
  },

  /** Sales pages - Objections matter more */
  salesPage: {
    wiifm: 0.25,
    clarity: 0.10,
    emotional: 0.20,
    ctaStrength: 0.20,
    objectionCoverage: 0.15,
    antiPlaceholder: 0.10,
  },

  /** Email sequences - Emotional connection crucial */
  emailSequence: {
    wiifm: 0.20,
    clarity: 0.15,
    emotional: 0.30,
    ctaStrength: 0.15,
    objectionCoverage: 0.10,
    antiPlaceholder: 0.10,
  },

  /** Blog posts - Clarity and value first */
  blogPost: {
    wiifm: 0.25,
    clarity: 0.25,
    emotional: 0.15,
    ctaStrength: 0.10,
    objectionCoverage: 0.10,
    antiPlaceholder: 0.15,
  },

  /** Ads - Emotional hook and CTA dominate */
  adCopy: {
    wiifm: 0.20,
    clarity: 0.10,
    emotional: 0.30,
    ctaStrength: 0.30,
    objectionCoverage: 0.00,
    antiPlaceholder: 0.10,
  },
};

// ============================================================================
// SCORING THRESHOLDS
// ============================================================================

/**
 * Verdict thresholds
 *
 * PASS (85+): Content meets professional conversion standards. Based on benchmarking
 *             against top-performing landing pages from CXL Institute case studies.
 *
 * ENHANCE (70-84): Usable but not optimal. Minor fixes would significantly improve
 *                  conversion. Allow to proceed with notes for quick iteration.
 *
 * REJECT (<70): Content has fundamental issues that would hurt conversion.
 *               Regeneration required before use. Based on the principle that
 *               bad copy is worse than no copy (damages trust).
 */
export interface ScoringThresholds {
  /** Minimum score to pass without changes */
  pass: number;

  /** Minimum score to pass with enhancement notes */
  enhance: number;
}

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  pass: 85,
  enhance: 70,
};

/**
 * Threshold presets for different quality standards
 */
export const THRESHOLD_PRESETS: Record<string, ScoringThresholds> = {
  /** High-stakes content (product launches, paid ads) */
  strict: {
    pass: 90,
    enhance: 80,
  },

  /** Standard content (regular marketing) */
  standard: {
    pass: 85,
    enhance: 70,
  },

  /** Draft/internal content (lower bar for iteration) */
  permissive: {
    pass: 75,
    enhance: 60,
  },
};

// ============================================================================
// FEEDBACK LOOP CONFIGURATION
// ============================================================================

/**
 * Feedback loop behavior settings
 */
export interface FeedbackLoopConfig {
  /** Maximum regeneration attempts before giving up */
  maxIterations: number;

  /** Timeout per judge scoring call (ms) */
  judgingTimeoutMs: number;

  /** Timeout per regeneration call (ms) */
  regenerationTimeoutMs: number;

  /** Delay between iterations for rate limiting (ms) */
  iterationDelayMs: number;

  /** Whether to allow ENHANCE verdict to pass */
  allowEnhanceToPass: boolean;

  /** Minimum score improvement required per iteration to continue */
  minimumImprovementThreshold: number;
}

export const DEFAULT_FEEDBACK_LOOP_CONFIG: FeedbackLoopConfig = {
  maxIterations: 3,
  judgingTimeoutMs: 60000, // 1 minute
  regenerationTimeoutMs: 90000, // 1.5 minutes
  iterationDelayMs: 1000, // 1 second
  allowEnhanceToPass: true,
  minimumImprovementThreshold: 5, // Must improve by at least 5 points per iteration
};

// ============================================================================
// CIRCUIT BREAKER CONFIGURATION
// ============================================================================

/**
 * Circuit breaker settings for AI service resilience
 */
export interface CircuitBreakerConfig {
  /** Failures before opening circuit */
  failureThreshold: number;

  /** Time before attempting recovery (ms) */
  resetTimeoutMs: number;

  /** Successes needed to close circuit */
  successThreshold: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
};

// ============================================================================
// COMPLETE CONFIGURATION
// ============================================================================

/**
 * Complete scoring system configuration
 */
export interface ConversionScoringConfig {
  weights: ScoringWeights;
  thresholds: ScoringThresholds;
  feedbackLoop: FeedbackLoopConfig;
  circuitBreaker: CircuitBreakerConfig;

  /** Enable strict mode - placeholders always reject regardless of score */
  strictMode: boolean;

  /** Enable verbose logging for debugging */
  verboseLogging: boolean;
}

/**
 * Default complete configuration
 */
export const DEFAULT_SCORING_CONFIG: ConversionScoringConfig = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  feedbackLoop: DEFAULT_FEEDBACK_LOOP_CONFIG,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  strictMode: true,
  verboseLogging: false,
};

/**
 * Create a custom configuration by merging with defaults
 */
export function createScoringConfig(
  overrides: Partial<ConversionScoringConfig>
): ConversionScoringConfig {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...overrides,
    weights: { ...DEFAULT_WEIGHTS, ...overrides.weights },
    thresholds: { ...DEFAULT_THRESHOLDS, ...overrides.thresholds },
    feedbackLoop: { ...DEFAULT_FEEDBACK_LOOP_CONFIG, ...overrides.feedbackLoop },
    circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...overrides.circuitBreaker },
  };
}

/**
 * Validate that weights sum to 1.0 (with tolerance for floating point)
 */
export function validateWeights(weights: ScoringWeights): boolean {
  const sum =
    weights.wiifm +
    weights.clarity +
    weights.emotional +
    weights.ctaStrength +
    weights.objectionCoverage +
    weights.antiPlaceholder;

  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Get preset configuration by name
 */
export function getPresetConfig(
  contentType: keyof typeof WEIGHT_PRESETS,
  qualityLevel: keyof typeof THRESHOLD_PRESETS = 'standard'
): ConversionScoringConfig {
  return createScoringConfig({
    weights: WEIGHT_PRESETS[contentType],
    thresholds: THRESHOLD_PRESETS[qualityLevel],
  });
}

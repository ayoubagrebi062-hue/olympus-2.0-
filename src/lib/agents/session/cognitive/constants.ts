/**
 * OLYMPUS 2.0 - Cognitive Session Constants
 *
 * All tunable values for the cognitive session system.
 * Centralized here so they can be adjusted without touching logic.
 */

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING DECAY
// ═══════════════════════════════════════════════════════════════════════════

/** How much relevance decays per day (0.01 = 1% per day) */
export const RELEVANCE_DECAY_PER_DAY = 0.01;

/** Minimum relevance score to keep a learning (below this → prunable) */
export const MIN_RELEVANCE_TO_KEEP = 0.1;

/** Minimum applications to keep a learning regardless of relevance */
export const MIN_APPLICATIONS_TO_KEEP = 3;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum confidence to show a prediction to the user */
export const MIN_PREDICTION_CONFIDENCE = 0.3;

/** Confidence boost on successful prediction verification */
export const CONFIDENCE_BOOST_ON_SUCCESS = 0.05;

/** Confidence penalty on failed prediction verification */
export const CONFIDENCE_PENALTY_ON_FAILURE = 0.1;

/** Minimum confidence for a preference to be used in suggestions */
export const MIN_PREFERENCE_CONFIDENCE = 0.2;

// ═══════════════════════════════════════════════════════════════════════════
// EXPERTISE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/** Number of builds needed before expertise detection kicks in */
export const MIN_BUILDS_FOR_EXPERTISE = 3;

/** Threshold for "advanced" expertise level */
export const ADVANCED_SUCCESS_RATE = 0.85;

/** Threshold for "expert" expertise level */
export const EXPERT_SUCCESS_RATE = 0.95;

/** Minimum builds for expert classification */
export const EXPERT_MIN_BUILDS = 20;

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum builds before pattern analysis produces results */
export const MIN_BUILDS_FOR_PATTERNS = 2;

/** Maximum error patterns to track per session */
export const MAX_ERROR_PATTERNS = 100;

/** Number of recent builds to consider for pattern analysis */
export const PATTERN_WINDOW_SIZE = 20;

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLIDATION
// ═══════════════════════════════════════════════════════════════════════════

/** Similarity threshold for merging duplicate learnings (0-1) */
export const LEARNING_SIMILARITY_THRESHOLD = 0.8;

/** Maximum age in days before a learning is considered stale */
export const MAX_LEARNING_AGE_DAYS = 365;

// ═══════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Default prediction expiry (7 days) */
export const DEFAULT_PREDICTION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum predictions to generate per analysis */
export const MAX_PREDICTIONS = 10;

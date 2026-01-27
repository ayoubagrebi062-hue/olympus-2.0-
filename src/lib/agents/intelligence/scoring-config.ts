/**
 * SCORING CONFIGURATION
 * =====================
 *
 * FUTURE YOU: This is your single source of truth for ALL scoring thresholds.
 *
 * WHY THIS FILE EXISTS:
 * - Before: 40+ magic numbers scattered across 5 files
 * - After: One place to understand and tune the entire scoring system
 *
 * HOW TO USE:
 * 1. Need to change what "good" means? Edit GRADE_THRESHOLDS
 * 2. Client wants stricter scoring? Create a custom profile
 * 3. A/B testing thresholds? Swap profiles at runtime
 *
 * THE MENTAL MODEL:
 * - Scores are 0-100 (like school grades)
 * - 70+ is "passing" (content is publishable)
 * - 85+ is "excellent" (content is competitive)
 * - Below 50 needs significant work
 *
 * LAST CALIBRATED: January 2026
 * CALIBRATION METHOD: Manual review of 100+ content pieces
 * TODO: Add A/B testing framework to validate thresholds empirically
 */

// ============================================================================
// GRADE THRESHOLDS
// ============================================================================

/**
 * Letter grade cutoffs.
 *
 * WHY THESE VALUES:
 * - Modeled after US academic grading (familiar to users)
 * - 70 = "C" = minimum acceptable (matches "passing" intuition)
 * - 90+ reserved for truly exceptional content (rare)
 *
 * ADJUSTMENT GUIDE:
 * - If users complain scores are "too harsh": lower by 5
 * - If low-quality content gets high scores: raise by 5
 */
export const GRADE_THRESHOLDS = {
  A_PLUS: 90, // Exceptional - ready for prime time
  A: 80, // Excellent - minor polish only
  B: 70, // Good - publishable with small improvements
  C: 60, // Acceptable - needs work but usable
  D: 50, // Poor - significant issues
  F: 0, // Failing - major rewrite needed
} as const;

// ============================================================================
// VERDICT THRESHOLDS
// ============================================================================

/**
 * Human-readable verdict cutoffs.
 *
 * WHY THESE VALUES:
 * - EXCELLENT (80+): Top 20% of content we've analyzed
 * - GOOD (70-79): Solid content that converts
 * - NEEDS_WORK (50-69): Has potential but missing elements
 * - POOR (<50): Fundamental issues with conversion strategy
 */
export const VERDICT_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 70,
  NEEDS_WORK: 50,
  POOR: 0,
} as const;

export type Verdict = 'excellent' | 'good' | 'needs_work' | 'poor';

export function getVerdict(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= VERDICT_THRESHOLDS.GOOD) return 'good';
  if (score >= VERDICT_THRESHOLDS.NEEDS_WORK) return 'needs_work';
  return 'poor';
}

// ============================================================================
// DIMENSION STATUS THRESHOLDS
// ============================================================================

/**
 * Per-dimension health indicators.
 *
 * WHY DIFFERENT FROM GRADES:
 * - Dimensions are more granular than overall score
 * - "Excellent" at 85 because individual dimensions should be higher
 * - "Critical" at 40 because one weak dimension can tank conversions
 */
export const DIMENSION_THRESHOLDS = {
  EXCELLENT: 85, // This dimension is a strength
  GOOD: 70, // This dimension is solid
  AVERAGE: 55, // This dimension needs attention
  WEAK: 40, // This dimension is hurting conversions
  CRITICAL: 0, // This dimension is a blocker
} as const;

export type DimensionStatus = 'excellent' | 'good' | 'average' | 'weak' | 'critical';

export function getDimensionStatus(score: number): DimensionStatus {
  if (score >= DIMENSION_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= DIMENSION_THRESHOLDS.GOOD) return 'good';
  if (score >= DIMENSION_THRESHOLDS.AVERAGE) return 'average';
  if (score >= DIMENSION_THRESHOLDS.WEAK) return 'weak';
  return 'critical';
}

// ============================================================================
// COMPARISON THRESHOLDS
// ============================================================================

/**
 * Head-to-head comparison logic.
 *
 * WHY THESE VALUES:
 * - TIE_MARGIN (3): Scores within 3 points are statistically insignificant
 * - DIMENSION_WIN (5): A 5-point gap in a dimension is noticeable
 * - SIGNIFICANT_GAP (10): Worth calling out explicitly
 * - DOMINANT_WIN (20): Clear winner, loser needs major work
 */
export const COMPARISON_THRESHOLDS = {
  /** Score difference needed to declare a winner (avoids false precision) */
  TIE_MARGIN: 3,

  /** Dimension score gap to declare one content better in that dimension */
  DIMENSION_WIN_MARGIN: 5,

  /** Gap large enough to highlight as a "key difference" */
  SIGNIFICANT_GAP: 10,

  /** Gap indicating dominant performance */
  DOMINANT_GAP: 20,
} as const;

// ============================================================================
// REWRITE THRESHOLDS
// ============================================================================

/**
 * Auto-rewrite trigger points.
 *
 * WHY THESE VALUES:
 * - CTA_WEAK (50): Below this, CTA is likely hurting conversions
 * - WIIFM_WEAK (50): Customer benefits are unclear
 * - EMOTIONAL_WEAK (50): Content feels flat/corporate
 */
export const REWRITE_THRESHOLDS = {
  /** Below this score, CTA needs strengthening */
  CTA_WEAK: 50,

  /** Below this score, benefits aren't clear */
  WIIFM_WEAK: 50,

  /** Below this score, emotional impact is missing */
  EMOTIONAL_WEAK: 50,
} as const;

// ============================================================================
// FUNNEL THRESHOLDS
// ============================================================================

/**
 * Funnel-specific scoring.
 *
 * WHY THESE VALUES:
 * - DROP_OFF_RISK (60): Pages below this have high abandonment risk
 * - NEEDS_IMPROVEMENT (75): Room for optimization
 * - NARRATIVE_REQUIRED (70): Awareness stage needs strong storytelling
 */
export const FUNNEL_THRESHOLDS = {
  /** Below this score, page is a drop-off risk */
  DROP_OFF_RISK: 60,

  /** Below this score, page needs improvement */
  NEEDS_IMPROVEMENT: 75,

  /** Minimum narrative score for awareness stage */
  AWARENESS_NARRATIVE_MIN: 70,
} as const;

// ============================================================================
// LEARNING THRESHOLDS
// ============================================================================

/**
 * Pattern recognition for learning system.
 *
 * WHY THESE VALUES:
 * - HIGH_PERFORMER (85): Content worth studying
 * - BENCHMARK_TOP (95): Nearly perfect, use as benchmark
 */
export const LEARNING_THRESHOLDS = {
  /** Score indicating high-performing content */
  HIGH_PERFORMER: 85,

  /** Score for top benchmark comparison */
  BENCHMARK_TOP: 95,
} as const;

// ============================================================================
// SCORING PROFILES (For Future A/B Testing / Client Customization)
// ============================================================================

/**
 * Predefined scoring profiles for different use cases.
 *
 * FUTURE YOU: This is where you add client-specific or A/B test variants.
 *
 * Example usage:
 *   const profile = SCORING_PROFILES.strict;
 *   if (score >= profile.grades.B) { ... }
 */
export const SCORING_PROFILES = {
  /** Default profile - balanced for most use cases */
  default: {
    grades: GRADE_THRESHOLDS,
    verdicts: VERDICT_THRESHOLDS,
    dimensions: DIMENSION_THRESHOLDS,
    comparison: COMPARISON_THRESHOLDS,
  },

  /** Stricter scoring for high-quality brands */
  strict: {
    grades: { A_PLUS: 95, A: 85, B: 75, C: 65, D: 55, F: 0 },
    verdicts: { EXCELLENT: 85, GOOD: 75, NEEDS_WORK: 55, POOR: 0 },
    dimensions: { EXCELLENT: 90, GOOD: 75, AVERAGE: 60, WEAK: 45, CRITICAL: 0 },
    comparison: { TIE_MARGIN: 5, DIMENSION_WIN_MARGIN: 7, SIGNIFICANT_GAP: 15, DOMINANT_GAP: 25 },
  },

  /** Lenient scoring for early-stage content */
  lenient: {
    grades: { A_PLUS: 85, A: 75, B: 65, C: 55, D: 45, F: 0 },
    verdicts: { EXCELLENT: 75, GOOD: 65, NEEDS_WORK: 45, POOR: 0 },
    dimensions: { EXCELLENT: 80, GOOD: 65, AVERAGE: 50, WEAK: 35, CRITICAL: 0 },
    comparison: { TIE_MARGIN: 5, DIMENSION_WIN_MARGIN: 8, SIGNIFICANT_GAP: 15, DOMINANT_GAP: 25 },
  },
} as const;

export type ScoringProfile = keyof typeof SCORING_PROFILES;

// ============================================================================
// DOCUMENTATION: HOW TO ADD A NEW THRESHOLD
// ============================================================================

/**
 * ADDING A NEW THRESHOLD:
 *
 * 1. Add it to the appropriate section above
 * 2. Document WHY you chose that value
 * 3. Update any code that was using a hardcoded number
 * 4. Add to SCORING_PROFILES if it should be customizable
 *
 * CALIBRATING EXISTING THRESHOLDS:
 *
 * 1. Collect feedback: "This content got X score but feels like Y"
 * 2. Analyze patterns: Are scores consistently too high/low?
 * 3. Adjust in 5-point increments (smaller changes are noise)
 * 4. Update the "LAST CALIBRATED" comment at the top
 * 5. Document what changed and why in git commit
 */

/**
 * OLYMPUS 2.0 - CONVERSION INTELLIGENCE ENGINE
 *
 * Type definitions for the 10X upgrade.
 * This isn't a scorer. It's a BRAIN.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type ContentType =
  | 'headline'
  | 'subheadline'
  | 'body'
  | 'cta'
  | 'testimonial'
  | 'pricing'
  | 'faq'
  | 'objection_handler'
  | 'social_proof'
  | 'urgency'
  | 'guarantee';

export type FunnelStage =
  | 'awareness' // Top of funnel - just discovered
  | 'interest' // Engaged, learning more
  | 'consideration' // Comparing options
  | 'intent' // Ready to buy, needs final push
  | 'purchase' // Checkout/conversion point
  | 'retention' // Post-purchase, prevent churn
  | 'advocacy'; // Turn customers into promoters

export type EmotionalState =
  | 'curious'
  | 'skeptical'
  | 'excited'
  | 'anxious'
  | 'frustrated'
  | 'hopeful'
  | 'fearful'
  | 'confident';

// ============================================================================
// ADVANCED SCORING DIMENSIONS (15 total)
// ============================================================================

/**
 * The 15 dimensions of conversion intelligence.
 * V1.0 had 6. This is what "exceptional" looks like.
 */
export interface AdvancedScoreDimensions {
  // === ORIGINAL 6 (Enhanced) ===
  wiifm: DimensionScore;
  clarity: DimensionScore;
  emotional: DimensionScore;
  ctaStrength: DimensionScore;
  objectionCoverage: DimensionScore;
  antiPlaceholder: DimensionScore;

  // === NEW: NARRATIVE INTELLIGENCE ===
  /** Does the content follow a compelling story arc? */
  narrativeFlow: DimensionScore;

  /** Is there a clear emotional journey? Fear → Hope → Action */
  emotionalJourney: DimensionScore;

  /** Does it build trust progressively? */
  trustArchitecture: DimensionScore;

  // === NEW: COGNITIVE OPTIMIZATION ===
  /** Is the mental effort appropriate for the funnel stage? */
  cognitiveLoad: DimensionScore;

  /** Do visuals and copy work together? */
  visualCopyAlignment: DimensionScore;

  /** Is information revealed at the right pace? */
  informationHierarchy: DimensionScore;

  // === NEW: STRATEGIC ALIGNMENT ===
  /** Does it match the target persona's psychology? */
  personaMatch: DimensionScore;

  /** Is it differentiated from competitors? */
  competitivePosition: DimensionScore;

  /** Does it fit the brand voice? */
  brandConsistency: DimensionScore;
}

export interface DimensionScore {
  score: number; // 0-100
  confidence: number; // 0-1 (how confident are we in this score?)
  issues: ScoringIssue[];
  suggestions: Suggestion[];
  evidence: string[]; // Specific text snippets that informed the score
}

export interface ScoringIssue {
  severity: 'critical' | 'major' | 'minor';
  location?: TextLocation;
  description: string;
  impact: string; // What's the conversion impact?
}

export interface Suggestion {
  type: 'rewrite' | 'add' | 'remove' | 'restructure';
  location?: TextLocation;
  original?: string;
  suggested: string;
  predictedLift: number; // Predicted score improvement
  confidence: number;
  rationale: string;
}

export interface TextLocation {
  startIndex: number;
  endIndex: number;
  paragraph?: number;
  sentence?: number;
}

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

export interface ContentAnalysis {
  /** Unique ID for tracking */
  id: string;

  /** The raw content being analyzed */
  content: string;

  /** Detected content type */
  contentType: ContentType;

  /** Detected funnel stage */
  funnelStage: FunnelStage;

  /** Detected niche */
  niche: string;

  /** Analysis timestamp */
  timestamp: Date;

  /** Full dimension scores */
  dimensions: AdvancedScoreDimensions;

  /** Weighted total score */
  totalScore: number;

  /** Confidence in overall assessment */
  overallConfidence: number;

  /** The verdict */
  verdict: 'EXCEPTIONAL' | 'STRONG' | 'ADEQUATE' | 'WEAK' | 'FAILING';

  /** Ranked list of improvements */
  improvementPlan: ImprovementPlan;

  /** Predicted conversion metrics */
  predictions: ConversionPredictions;

  /** Comparison to benchmarks */
  benchmarks: BenchmarkComparison;

  /** Learning context for future improvement */
  learningContext: LearningContext;

  /**
   * Warnings about issues encountered during analysis.
   * Check this array to detect problems like:
   * - Content truncation
   * - Invalid characters removed
   * - Analyzer failures
   */
  warnings: string[];
}

// ============================================================================
// IMPROVEMENT SYSTEM
// ============================================================================

export interface ImprovementPlan {
  /** Quick wins - high impact, easy fixes */
  quickWins: PrioritizedImprovement[];

  /** Strategic changes - require more thought */
  strategicChanges: PrioritizedImprovement[];

  /** Total predicted score after all improvements */
  projectedScore: number;

  /** Estimated conversion lift */
  estimatedConversionLift: string;
}

export interface PrioritizedImprovement {
  priority: number; // 1 = highest
  dimension: keyof AdvancedScoreDimensions;
  issue: ScoringIssue;
  suggestion: Suggestion;
  effort: 'trivial' | 'easy' | 'moderate' | 'significant';
  impactScore: number; // Expected score improvement
  roi: number; // Impact / Effort ratio
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export interface ConversionPredictions {
  /** Estimated conversion rate range */
  conversionRate: {
    low: number;
    expected: number;
    high: number;
  };

  /** Estimated time on page */
  timeOnPage: {
    low: number;
    expected: number;
    high: number;
  };

  /** Bounce probability */
  bounceRate: {
    low: number;
    expected: number;
    high: number;
  };

  /** Engagement score */
  engagementScore: number;

  /** Readability metrics */
  readability: {
    fleschKincaid: number;
    avgSentenceLength: number;
    avgWordLength: number;
    complexWordPercentage: number;
  };

  /** Confidence in predictions */
  predictionConfidence: number;

  /** Factors that could affect predictions */
  uncertaintyFactors: string[];
}

// ============================================================================
// BENCHMARKING
// ============================================================================

export interface BenchmarkComparison {
  /** How does this compare to top performers in the niche? */
  nichePercentile: number;

  /** How does this compare to all content we've scored? */
  globalPercentile: number;

  /** Comparison to best-in-class */
  vsTopPerformer: {
    scoreDifference: number;
    keyDifferences: string[];
  };

  /** Industry benchmarks */
  industryBenchmarks: {
    averageScore: number;
    topQuartileScore: number;
    bottomQuartileScore: number;
  };
}

// ============================================================================
// LEARNING & ADAPTATION
// ============================================================================

export interface LearningContext {
  /** What made this content unique? */
  uniquePatterns: string[];

  /** What should we remember for future scoring? */
  lessonsLearned: string[];

  /** Suggested weight adjustments based on this content */
  weightAdjustments: Partial<Record<keyof AdvancedScoreDimensions, number>>;

  /** Tags for categorization */
  tags: string[];
}

export interface LearningFeedback {
  /** The content analysis ID */
  analysisId: string;

  /** Actual conversion outcome (if known) */
  actualConversionRate?: number;

  /** A/B test results (if available) */
  abTestResults?: {
    variant: string;
    conversionRate: number;
    sampleSize: number;
    confidence: number;
  }[];

  /** User feedback on suggestions */
  suggestionFeedback?: {
    suggestionId: string;
    wasHelpful: boolean;
    wasImplemented: boolean;
    actualResult?: string;
  }[];

  /** Manual score override (expert disagrees) */
  scoreOverride?: {
    dimension: keyof AdvancedScoreDimensions;
    originalScore: number;
    correctedScore: number;
    reason: string;
  }[];
}

// ============================================================================
// FUNNEL ANALYSIS
// ============================================================================

export interface FunnelAnalysis {
  /** Funnel ID */
  id: string;

  /** All pages/content in the funnel */
  pages: FunnelPage[];

  /** Overall funnel score */
  funnelScore: number;

  /** Stage-by-stage analysis */
  stageAnalysis: Record<FunnelStage, StageAnalysis>;

  /** Message consistency across pages */
  messageConsistency: MessageConsistencyAnalysis;

  /** Emotional flow through funnel */
  emotionalFlow: EmotionalFlowAnalysis;

  /** Drop-off risk points */
  dropOffRisks: DropOffRisk[];

  /** Funnel-wide improvements */
  funnelImprovements: FunnelImprovement[];
}

export interface FunnelPage {
  id: string;
  name: string;
  stage: FunnelStage;
  content: string;
  analysis: ContentAnalysis;
  nextPage?: string;
  previousPage?: string;
}

export interface StageAnalysis {
  stage: FunnelStage;
  score: number;
  isWeakest: boolean;
  isStrongest: boolean;
  concerns: string[];
  recommendations: string[];
}

export interface MessageConsistencyAnalysis {
  /** Overall consistency score */
  score: number;

  /** Key messages tracked through funnel */
  keyMessages: {
    message: string;
    appearsIn: string[]; // Page IDs
    consistency: number;
  }[];

  /** Promise-delivery alignment */
  promiseDelivery: {
    promise: string;
    madeIn: string; // Page ID where promise made
    deliveredIn?: string; // Page ID where promise fulfilled
    isDelivered: boolean;
  }[];

  /** Disconnects found */
  disconnects: {
    fromPage: string;
    toPage: string;
    issue: string;
    severity: 'critical' | 'major' | 'minor';
  }[];
}

export interface EmotionalFlowAnalysis {
  /** Emotional state at each stage */
  stateProgression: {
    stage: FunnelStage;
    primaryEmotion: EmotionalState;
    intensity: number;
  }[];

  /** Is there a proper emotional arc? */
  hasProperArc: boolean;

  /** Emotional momentum issues */
  momentumIssues: string[];
}

export interface DropOffRisk {
  location: string; // Page ID or stage
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  mitigation: string;
  predictedDropOffRate: number;
}

export interface FunnelImprovement {
  type: 'add_page' | 'remove_page' | 'reorder' | 'bridge_gap' | 'strengthen_transition';
  description: string;
  from?: string;
  to?: string;
  predictedImpact: string;
}

// ============================================================================
// COMPETITIVE ANALYSIS
// ============================================================================

export interface CompetitiveAnalysis {
  /** Competitor pages analyzed */
  competitors: CompetitorContent[];

  /** Differentiation score */
  differentiationScore: number;

  /** Unique angles you have */
  uniqueAngles: string[];

  /** Angles competitors use that you don't */
  missingAngles: string[];

  /** Common patterns in the market */
  marketPatterns: {
    pattern: string;
    frequency: number; // How many competitors use it
    effectiveness: number; // Estimated effectiveness
    shouldUse: boolean;
  }[];

  /** Recommendations */
  recommendations: string[];
}

export interface CompetitorContent {
  name: string;
  url?: string;
  content: string;
  analysis: ContentAnalysis;
  strengths: string[];
  weaknesses: string[];
}

// ============================================================================
// VARIANT GENERATION
// ============================================================================

export interface VariantGeneration {
  /** Original content */
  original: {
    content: string;
    score: number;
  };

  /** Generated variants */
  variants: GeneratedVariant[];

  /** Recommended variant */
  recommendation: {
    variantId: string;
    reason: string;
    confidence: number;
  };
}

export interface GeneratedVariant {
  id: string;
  content: string;
  changes: {
    type: 'headline' | 'cta' | 'body' | 'structure';
    original: string;
    new: string;
    rationale: string;
  }[];
  predictedScore: number;
  predictedLift: number;
  confidence: number;
  testPriority: number; // Which to A/B test first
}

// ============================================================================
// REAL-TIME ANALYSIS
// ============================================================================

export interface RealTimeAnalysis {
  /** Current content being typed */
  content: string;

  /** Live score (updates as you type) */
  liveScore: number;

  /** Score trend (improving/declining) */
  trend: 'improving' | 'stable' | 'declining';

  /** Active issues (shown inline) */
  activeIssues: InlineIssue[];

  /** Suggestions queue (next improvements) */
  suggestionQueue: Suggestion[];

  /** Autocomplete suggestions */
  autocompleteSuggestions: AutocompleteSuggestion[];
}

export interface InlineIssue {
  location: TextLocation;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  quickFix?: string;
}

export interface AutocompleteSuggestion {
  trigger: string; // What triggered this suggestion
  suggestion: string; // The suggested completion
  score: number; // How good is this completion
  reason: string;
}

// ============================================================================
// ENGINE CONFIGURATION
// ============================================================================

export interface IntelligenceEngineConfig {
  /** Scoring weights */
  weights: Partial<Record<keyof AdvancedScoreDimensions, number>>;

  /** Thresholds for verdicts */
  thresholds: {
    exceptional: number; // Score >= this = EXCEPTIONAL
    strong: number; // Score >= this = STRONG
    adequate: number; // Score >= this = ADEQUATE
    weak: number; // Score >= this = WEAK
    // Below weak = FAILING
  };

  /** Learning settings */
  learning: {
    enabled: boolean;
    adaptWeights: boolean;
    minSamplesBeforeAdapting: number;
  };

  /** Prediction settings */
  predictions: {
    enabled: boolean;
    confidenceThreshold: number;
  };

  /** Competitive analysis */
  competitive: {
    enabled: boolean;
    maxCompetitors: number;
  };

  /** Real-time analysis */
  realTime: {
    enabled: boolean;
    debounceMs: number;
    showInlineSuggestions: boolean;
  };
}

export const DEFAULT_ENGINE_CONFIG: IntelligenceEngineConfig = {
  weights: {
    // Original 6 (slightly reduced to make room for new dimensions)
    wiifm: 0.15,
    clarity: 0.1,
    emotional: 0.12,
    ctaStrength: 0.12,
    objectionCoverage: 0.08,
    antiPlaceholder: 0.08,

    // New dimensions
    narrativeFlow: 0.08,
    emotionalJourney: 0.07,
    trustArchitecture: 0.05,
    cognitiveLoad: 0.04,
    visualCopyAlignment: 0.03,
    informationHierarchy: 0.03,
    personaMatch: 0.02,
    competitivePosition: 0.02,
    brandConsistency: 0.01,
  },

  thresholds: {
    exceptional: 92,
    strong: 80,
    adequate: 65,
    weak: 50,
  },

  learning: {
    enabled: true,
    adaptWeights: true,
    minSamplesBeforeAdapting: 50,
  },

  predictions: {
    enabled: true,
    confidenceThreshold: 0.7,
  },

  competitive: {
    enabled: true,
    maxCompetitors: 5,
  },

  realTime: {
    enabled: true,
    debounceMs: 300,
    showInlineSuggestions: true,
  },
};

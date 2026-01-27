/**
 * OLYMPUS 2.0 - CONVERSION INTELLIGENCE ENGINE
 *
 * The World-Class version. 301 tests. Production-ready.
 *
 * @see ARCHITECTURE.md for internals, design decisions, and how to extend.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 START HERE (30 seconds to value)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { check } from './intelligence';
 *
 * console.log(await check("Your landing page copy here"));
 * // "✓ Good (72/100) - Add stronger CTA to improve conversions"
 * ```
 *
 * That's it. One import. One line. Instant feedback.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 THE MONEY SHOT (Beautiful, screenshot-worthy output)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { showcase } from './intelligence';
 *
 * const result = await showcase("Your landing page copy", 'saas');
 * console.log(result.formatted);
 *
 * // ┌───────────────────────────────────────────────────────────┐
 * // │  CONVERSION INTELLIGENCE REPORT                          │
 * // ├───────────────────────────────────────────────────────────┤
 * // │  Score: 78/100                       Grade: B+            │
 * // │  Industry: SaaS                      Percentile: 85th     │
 * // ├───────────────────────────────────────────────────────────┤
 * // │  ████████████████████░░░░░  78%                           │
 * // │  "Better than 85% of SaaS landing pages"                  │
 * // ├───────────────────────────────────────────────────────────┤
 * // │  TOP STRENGTH: Emotional Journey                          │
 * // │  TOP WEAKNESS: Cognitive Load                             │
 * // │  QUICK WIN: Add urgency to your CTA                       │
 * // └───────────────────────────────────────────────────────────┘
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏆 COMPETITIVE EDGE (Industry benchmarks)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { benchmark } from './intelligence';
 *
 * const result = await benchmark("Your content", 'saas');
 * console.log(result.percentile);  // 85 - "Better than 85% of SaaS pages"
 * console.log(result.insight);     // "5 more points puts you in top 10%"
 * ```
 *
 * 11 industries supported: saas, ecommerce, fintech, healthcare, b2b, and more.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FLUENT API (When you want more control)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { analyze, funnel } from './intelligence';
 *
 * // ✨ Simple - One liner
 * const score = await analyze(content).score();
 * const verdict = await analyze(content).verdict();
 * const improvements = await analyze(content).improvements();
 *
 * // ✨ Chainable - Reads like English
 * const result = await analyze(content)
 *   .asType('body')
 *   .forStage('interest')
 *   .inNiche('saas')
 *   .withTimeout(5000)
 *   .onProgress(({ percentComplete }) => console.log(`${percentComplete}%`))
 *   .run();
 *
 * // ✨ Funnel analysis - Same fluent style
 * const funnelResult = await funnel()
 *   .addPage('Landing', landingContent, 'awareness')
 *   .addPage('Features', featuresContent, 'interest')
 *   .addPage('Pricing', pricingContent, 'consideration')
 *   .addPage('Checkout', checkoutContent, 'purchase')
 *   .run();
 *
 * // ✨ Quick checks
 * if (await analyze(content).passes(70)) {
 *   console.log('Content is good to publish!');
 * }
 *
 * // ✨ Head-to-head comparison
 * const battle = await compare(myContent, competitorContent);
 * console.log(battle.winner);  // 'content1' | 'content2' | 'tie'
 * console.log(battle.toWin);   // ['Add social proof', 'Strengthen CTA']
 *
 * // ✨ Human-readable report
 * const report = await analyze(content).report();
 * console.log(report.grade);   // 'A', 'B', 'C', 'D', or 'F'
 * console.log(report.summary); // "Your content scores 72/100 (Good)."
 *
 * // ✨ Deep explainability (3 AM debugging)
 * const explanation = await analyze(content).explain();
 * console.log(explanation.breakdown);  // Dimension-by-dimension scores
 * console.log(explanation.strengths);  // What's working
 * console.log(explanation.weaknesses); // What's hurting + how to fix
 * console.log(explanation.debug);      // analysisId, wordCount, timestamp
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASSIC API (Still supported)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { ConversionIntelligenceEngine, FunnelAnalyzer } from './intelligence';
 *
 * const engine = new ConversionIntelligenceEngine();
 * const analysis = await engine.analyze(content, { contentType: 'body' });
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OBSERVABILITY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * import { setMetricsCollector } from './intelligence';
 *
 * // Send metrics to your observability platform
 * setMetricsCollector((metrics) => {
 *   console.log(`Analysis ${metrics.traceId} took ${metrics.totalMs}ms`);
 *   datadogClient.gauge('intelligence.analysis_time', metrics.totalMs);
 * });
 * ```
 */

// ============================================================================
// FLUENT API (World-Class - Recommended)
// ============================================================================

export {
  // Main entry points
  analyze,
  funnel,
  // 🚀 THE HELLO WORLD EXPERIENCE (Start here!)
  check,
  // 🏆 COMPETITIVE EDGE: Industry Benchmarks
  benchmark,
  percentile,
  getAvailableIndustries,
  getIndustryStats,
  // 🎯 THE MONEY SHOT: Beautiful Output
  showcase,
  // Shorthand helpers
  quickScore,
  quickVerdict,
  topImprovements,
  passes,
  // Head-to-head comparison
  compare,
  // Observability
  setMetricsCollector,
  clearCache,
  // Constants (for pre-validation)
  MAX_CONTENT_LENGTH,
  VERSION,
  // Error classes
  IntelligenceError,
  ContentTooLongError,
  InvalidContentError,
  TimeoutError,
  // Builder classes (for advanced usage)
  AnalysisBuilder,
  FunnelBuilder,
  // ═══════════════════════════════════════════════════════════════════════════
  // 10X UPGRADE: Production-Grade Features
  // ═══════════════════════════════════════════════════════════════════════════
  // Request deduplication (same content = same promise)
  deduplicatedAnalyze,
  // Batch analysis with concurrency control
  analyzeMany,
  // Auto-rewrite (the holy grail)
  rewrite,
  // Streaming analysis (progressive results)
  stream,
} from './fluent';

export type {
  ProgressEvent,
  StreamingResult,
  ProgressCallback,
  AnalysisMetrics,
  MetricsCollector,
  HumanReport,
  ComparisonResult,
  Explanation,
  // 🏆 COMPETITIVE EDGE: Industry Benchmarks
  Industry,
  BenchmarkResult,
  // 🎯 THE MONEY SHOT
  ShowcaseResult,
  // 10X UPGRADE Types
  BatchItem,
  BatchOptions,
  BatchResult,
  RewriteResult,
  StreamEvent,
  // 🏆 WORLD-CLASS: Debug Envelope
  DebugEnvelope,
} from './fluent';

// ============================================================================
// CLASSIC API (Still supported)
// ============================================================================

export { ConversionIntelligenceEngine, DEFAULT_ENGINE_CONFIG } from './engine';
export type { ContentAnalysis, AdvancedScoreDimensions } from './engine';

// ============================================================================
// FUNNEL ANALYZER
// ============================================================================

export { FunnelAnalyzer } from './funnel-analyzer';
export type { FunnelAnalysis, FunnelPage } from './funnel-analyzer';

// ============================================================================
// DIMENSION ANALYZERS
// ============================================================================

export { analyzeNarrativeFlow } from './dimensions/narrative-flow';
export { analyzeEmotionalJourney } from './dimensions/emotional-journey';
export type { EmotionalJourneyResult } from './dimensions/emotional-journey';
export { analyzeCognitiveLoad } from './dimensions/cognitive-load';
export type { CognitiveLoadResult } from './dimensions/cognitive-load';

// ============================================================================
// SCORING CONFIGURATION (Future You's Best Friend)
// ============================================================================

export {
  GRADE_THRESHOLDS,
  VERDICT_THRESHOLDS,
  DIMENSION_THRESHOLDS,
  COMPARISON_THRESHOLDS,
  REWRITE_THRESHOLDS,
  FUNNEL_THRESHOLDS,
  LEARNING_THRESHOLDS,
  SCORING_PROFILES,
  getVerdict,
  getDimensionStatus,
} from './scoring-config';

export type { Verdict, DimensionStatus, ScoringProfile } from './scoring-config';

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Core types
  ContentType,
  FunnelStage,
  EmotionalState,

  // Dimension types
  DimensionScore,
  ScoringIssue,
  Suggestion,
  TextLocation,

  // Improvement types
  ImprovementPlan,
  PrioritizedImprovement,

  // Prediction types
  ConversionPredictions,
  BenchmarkComparison,

  // Learning types
  LearningContext,
  LearningFeedback,

  // Funnel types
  StageAnalysis,
  MessageConsistencyAnalysis,
  EmotionalFlowAnalysis,
  DropOffRisk,
  FunnelImprovement,

  // Competitive types
  CompetitiveAnalysis,
  CompetitorContent,

  // Variant types
  VariantGeneration,
  GeneratedVariant,

  // Real-time types
  RealTimeAnalysis,
  InlineIssue,
  AutocompleteSuggestion,

  // Configuration
  IntelligenceEngineConfig,
} from './types';

// ============================================================================
// LEGACY UTILITIES (Use fluent API instead)
// ============================================================================

import { ConversionIntelligenceEngine } from './engine';
import { FunnelAnalyzer } from './funnel-analyzer';

/**
 * @deprecated Use `analyze(content).run()` instead
 */
export async function analyzeContent(
  content: string,
  options?: {
    contentType?: 'headline' | 'body' | 'cta' | 'testimonial' | 'pricing' | 'faq';
    funnelStage?: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase';
    niche?: string;
  }
) {
  const engine = new ConversionIntelligenceEngine();
  return engine.analyze(content, options);
}

/**
 * @deprecated Use `funnel().addPage(...).run()` instead
 */
export async function analyzeFunnel(
  pages: { name: string; content: string; stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase' }[]
) {
  const analyzer = new FunnelAnalyzer();
  return analyzer.analyzeFunnel(pages);
}

/**
 * @deprecated Use `quickScore(content)` from fluent API instead
 * Legacy alias kept for backwards compatibility
 */
export async function getQuickScore(content: string): Promise<number> {
  const engine = new ConversionIntelligenceEngine();
  const analysis = await engine.analyze(content);
  return analysis.totalScore;
}

/**
 * @deprecated Use `topImprovements(content)` from fluent API instead
 */
export async function getTopImprovements(content: string): Promise<string[]> {
  const engine = new ConversionIntelligenceEngine();
  const analysis = await engine.analyze(content);
  return analysis.improvementPlan.quickWins
    .slice(0, 3)
    .map(imp => imp.suggestion.suggested);
}

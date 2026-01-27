/**
 * OLYMPUS 2.1 - 10X UPGRADE: Intelligence Module
 *
 * The brain of OLYMPUS:
 * - Build prediction and cost estimation
 * - Semantic caching for similar builds
 * - Cost optimization strategies
 * - Self-healing error recovery
 */

// Build Intelligence
export {
  BuildIntelligence,
  analyzePrompt,
  predictBuild,
  optimizeCost,
  semanticCache,
} from './build-intelligence';

export type {
  BuildPrediction,
  PromptAnalysis,
  RiskFactor,
  Optimization,
  SimilarBuild,
  OptimizationPlan,
  OptimizationStrategy,
} from './build-intelligence';

// Self-Healing
export { selfHealing, SelfHealingEngine, detectFailureType } from './self-healing';

export type {
  FailureType,
  FailureContext,
  RecoveryStrategy,
  RecoveryResult,
  HealingReport,
} from './self-healing';

// Failure Prediction
export { FailurePredictionEngine, failurePrediction } from './failure-prediction';

export type {
  PredictionInput,
  HistoricalBuild,
  FailurePrediction,
  PredictedFailure,
  RiskFactor as PredictionRiskFactor,
  PreventiveAction,
  FailurePattern,
  PatternMatch,
} from './failure-prediction';

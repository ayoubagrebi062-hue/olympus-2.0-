/**
 * CONDUCTOR Module - Meta-orchestrator for OLYMPUS 50X
 *
 * Exports:
 * - ConductorService: Main service class
 * - conductorService: Singleton instance
 * - conductorRouter: Project type detection
 * - All types
 */

// Service
export { ConductorService, conductorService } from './conductor-service';

// Router
export { ConductorRouter, conductorRouter } from './router';

// Types
export type {
  // Project Analysis
  ProjectType,
  ProjectComplexity,
  ProjectAnalysis,
  DetectedFeature,
  TechStackRecommendation,
  // Build Strategy
  BuildStrategy,
  BuildStrategyConfig,
  RetryPolicy,
  QualityGate,
  QualityCheck,
  // Checkpoints
  BuildCheckpoint,
  CheckpointContext,
  CheckpointError,
  CheckpointMetadata,
  // Conductor API
  ConductorConfig,
  ConductorBuildRequest,
  ConductorBuildOptions,
  ConductorBuildResult,
  ConductorResumeRequest,
  ConductorPreviewResult,
  AlternativePlan,
  // Events
  ConductorEventType,
  ConductorEvent,
  ExtendedOrchestrationEvent,
  // Analytics
  ConductorAnalytics,
  StrategyMetrics,
  CheckpointAnalytics,
} from './types';

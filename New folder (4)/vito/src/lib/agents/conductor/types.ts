/**
 * CONDUCTOR Types - Meta-orchestrator for OLYMPUS 50X
 *
 * CONDUCTOR sits above BuildOrchestrator and provides:
 * - Project type detection and routing
 * - Build strategy planning
 * - Checkpoint/resume capabilities
 * - Enhanced analytics
 */

import type { BuildPlan, BuildProgress, OrchestrationEvent, OrchestrationStatus } from '../orchestrator/types';
import type { CriticalDecisions } from '../context/manager';
import type { QualityThreshold } from './judge/types';

// ============================================================================
// PROJECT ANALYSIS
// ============================================================================

export type ProjectType =
  | 'landing-page'      // Single page marketing site
  | 'marketing-site'    // Multi-page marketing with CMS
  | 'saas-app'          // Full SaaS application
  | 'e-commerce'        // Online store
  | 'portfolio'         // Portfolio/showcase site
  | 'blog'              // Blog/content site
  | 'dashboard'         // Admin/analytics dashboard
  | 'mobile-app'        // Mobile application
  | 'api-service'       // Backend API only
  | 'full-stack'        // Complete full-stack app
  | 'unknown';          // Fallback

export type ProjectComplexity = 'simple' | 'moderate' | 'complex' | 'enterprise';

export interface ProjectAnalysis {
  type: ProjectType;
  complexity: ProjectComplexity;
  estimatedAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
  suggestedTier: 'basic' | 'standard' | 'premium' | 'enterprise';
  features: DetectedFeature[];
  techStack: TechStackRecommendation;
  warnings: string[];
  confidence: number; // 0-1
}

export interface DetectedFeature {
  name: string;
  category: 'auth' | 'payments' | 'database' | 'api' | 'ui' | 'integration' | 'analytics' | 'other';
  complexity: 'low' | 'medium' | 'high';
  requiredAgents: string[];
}

export interface TechStackRecommendation {
  framework: string;
  styling: string;
  database: string | null;
  auth: string | null;
  payments: string | null;
  hosting: string;
  reasoning: string;
}

// ============================================================================
// BUILD STRATEGY
// ============================================================================

export type BuildStrategy =
  | 'sequential'        // One phase at a time (safest)
  | 'parallel-phases'   // Multiple phases in parallel
  | 'adaptive'          // Adjust based on results
  | 'fast-track';       // Skip optional phases

export interface BuildStrategyConfig {
  strategy: BuildStrategy;
  maxParallelAgents: number;
  enableCheckpoints: boolean;
  checkpointFrequency: 'phase' | 'agent' | 'milestone';
  retryPolicy: RetryPolicy;
  qualityGates: QualityGate[];
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

export interface QualityGate {
  phase: string;
  checks: QualityCheck[];
  blockOnFailure: boolean;
}

export interface QualityCheck {
  name: string;
  type: 'lint' | 'type' | 'test' | 'security' | 'performance' | 'custom';
  command?: string;
  threshold?: number;
}

// ============================================================================
// CHECKPOINTS & RESUME
// ============================================================================

export interface BuildCheckpoint {
  id: string;
  buildId: string;
  timestamp: Date;
  phase: string;
  agentIndex: number;
  status: OrchestrationStatus;
  context: CheckpointContext;
  outputs: Record<string, unknown>;
  criticalDecisions: CriticalDecisions;
  metadata: CheckpointMetadata;
}

export interface CheckpointContext {
  completedPhases: string[];
  completedAgents: string[];
  pendingAgents: string[];
  accumulatedKnowledge: Record<string, unknown>;
  errors: CheckpointError[];
}

export interface CheckpointError {
  agentId: string;
  phase: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface CheckpointMetadata {
  tokensUsed: number;
  costAccumulated: number;
  duration: number;
  retryCount: number;
}

// ============================================================================
// CONDUCTOR SERVICE
// ============================================================================

export interface ConductorConfig {
  enableAnalysis: boolean;
  enableCheckpoints: boolean;
  defaultStrategy: BuildStrategy;
  fallbackToOrchestrator: boolean;
  analyticsEnabled: boolean;
  maxConcurrentBuilds: number;
  judgeConfig?: JudgeConfigForConductor;
  memoryConfig?: MemoryConfigForConductor;
  checkpointConfig?: CheckpointConfigForConductor;
}

export interface CheckpointConfigForConductor {
  enabled: boolean;
  autoCheckpoint: boolean;
  checkpointInterval: number;
  compressionThreshold: number;
  defaultExpirationDays: number;
  maxCheckpointsPerBuild: number;
  cleanupIntervalMs: number;
}

export interface MemoryConfigForConductor {
  enabled: boolean;
  buildHistoryLimit: number;
  patternRetentionDays: number;
  minSamplesForPattern: number;
  patternConfidenceThreshold: number;
  learningEnabled: boolean;
  vectorSearchEnabled: boolean;
  similarityThreshold: number;
  maxSimilarResults: number;
  preferenceLearningEnabled: boolean;
  preferenceDecayDays: number;
}

export interface JudgeConfigForConductor {
  enabled: boolean;
  strictMode: boolean;
  autoRetry: boolean;
  thresholds: Map<string, QualityThreshold>;
  scoringModel: 'opus' | 'sonnet' | 'haiku';
}

export interface ConductorBuildRequest {
  description: string;
  tenantId: string;
  tier?: 'basic' | 'standard' | 'premium' | 'enterprise';
  options?: ConductorBuildOptions;
}

export interface ConductorBuildOptions {
  strategy?: BuildStrategy;
  skipAnalysis?: boolean;
  forceProjectType?: ProjectType;
  enableCheckpoints?: boolean;
  customPrompts?: Record<string, string>;
  metadata?: Record<string, unknown>;
  /** External database build ID (UUID) for persistence - if provided, used for saving outputs */
  databaseBuildId?: string;
}

export interface ConductorBuildResult {
  buildId: string;
  analysis: ProjectAnalysis;
  plan: BuildPlan;
  strategy: BuildStrategyConfig;
  estimatedDuration: number;
}

export interface ConductorResumeRequest {
  buildId: string;
  checkpointId?: string; // Resume from specific checkpoint, or latest
  modifyStrategy?: Partial<BuildStrategyConfig>;
}

export interface ConductorPreviewResult {
  analysis: ProjectAnalysis;
  suggestedPlan: BuildPlan;
  estimatedCost: number;
  estimatedDuration: number;
  warnings: string[];
  alternatives: AlternativePlan[];
}

export interface AlternativePlan {
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  tradeoffs: string[];
}

// ============================================================================
// CONDUCTOR EVENTS
// ============================================================================

export type ConductorEventType =
  | 'conductor:analysis_started'
  | 'conductor:analysis_completed'
  | 'conductor:strategy_selected'
  | 'conductor:checkpoint_created'
  | 'conductor:checkpoint_restored'
  | 'conductor:phase_skipped'
  | 'conductor:phase_blocked'
  | 'conductor:phase_warning'
  | 'conductor:phase_started'
  | 'conductor:dependency_wait'
  | 'conductor:agent_started'
  | 'conductor:agent_completed'
  | 'conductor:phase_completed'
  | 'conductor:build_completed'
  | 'conductor:build_failed'
  | 'conductor:state_transition'
  | 'conductor:phase_transition'
  | 'conductor:phase_transition_blocked'
  | 'conductor:approval_required'
  | 'conductor:quality_gate_passed'
  | 'conductor:quality_gate_failed'
  | 'conductor:fallback_triggered'
  | 'conductor:handoff_triggered'
  | 'conductor:build_optimized'
  // JUDGE events
  | 'conductor:judge_started'
  | 'conductor:judge_decision'
  | 'conductor:judge_error'
  | 'conductor:quality_accepted'
  | 'conductor:retry_triggered'
  | 'conductor:max_retries_reached'
  | 'conductor:enhancement_suggested'
  | 'conductor:quality_failed'
  // MEMORY events
  | 'conductor:memory_build_stored'
  | 'conductor:memory_patterns_applied'
  | 'conductor:memory_similar_builds_found'
  | 'conductor:memory_feedback_recorded'
  | 'conductor:memory_learning_triggered'
  // CHECKPOINT events (new robust system)
  | 'conductor:checkpoint_resume_prepared'
  | 'conductor:checkpoint_resume_completed'
  | 'conductor:checkpoint_resume_failed'
  | 'conductor:checkpoint_loaded'
  | 'conductor:checkpoint_deleted'
  | 'conductor:checkpoint_cleanup'
  // FIX #1: Critical failure event
  | 'conductor:critical_failure';

export interface ConductorEvent {
  type: ConductorEventType;
  buildId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// Union with existing OrchestrationEvent
export type ExtendedOrchestrationEvent = OrchestrationEvent | ConductorEvent;

// ============================================================================
// ANALYTICS
// ============================================================================

export interface ConductorAnalytics {
  totalBuilds: number;
  successRate: number;
  averageDuration: number;
  averageCost: number;
  projectTypeDistribution: Record<ProjectType, number>;
  strategyPerformance: Record<BuildStrategy, StrategyMetrics>;
  checkpointUsage: CheckpointAnalytics;
}

export interface StrategyMetrics {
  successRate: number;
  averageDuration: number;
  averageCost: number;
  usageCount: number;
}

export interface CheckpointAnalytics {
  totalCheckpoints: number;
  resumesFromCheckpoint: number;
  averageResumeTime: number;
  savedCostFromResume: number;
}

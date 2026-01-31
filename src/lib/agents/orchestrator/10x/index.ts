/**
 * ============================================================================
 * 10X BUILD ORCHESTRATION SYSTEM
 * ============================================================================
 *
 * "Good enough is the enemy of great." - This is the great version.
 *
 * This module exports the complete 10X upgrade to the build orchestration
 * system. These are not incremental improvements - this is a VERSION 2.0
 * that makes VERSION 1.0 look like a prototype.
 *
 * WHAT'S INCLUDED:
 *
 * 1. EVENT SOURCING - Full event sourcing with time-travel debugging
 *    - Immutable event log
 *    - State projection from events
 *    - Time machine for debugging
 *    - Version-based replay
 *
 * 2. SELF-HEALING - Autonomous recovery with circuit breakers
 *    - Circuit breaker pattern (CLOSED/OPEN/HALF_OPEN)
 *    - Exponential backoff with jitter
 *    - Fallback agent registry
 *    - Predictive health monitoring
 *
 * 3. PREDICTIVE ANALYTICS - ML-powered build predictions
 *    - Duration predictions
 *    - Failure probability
 *    - Resource estimation
 *    - Anomaly detection
 *    - Pattern recognition
 *
 * 4. SAGA ORCHESTRATOR - Distributed transaction patterns
 *    - Saga definitions with compensation
 *    - Distributed locking
 *    - Idempotency guarantees
 *    - Fluent saga builder API
 *
 * 5. REAL-TIME STREAMING - Live build progress
 *    - Server-Sent Events (SSE)
 *    - WebSocket support
 *    - Event aggregation
 *    - Client connection management
 *
 * 6. QUALITY GATES - Checkpoint/rollback system
 *    - Multi-level gates (warn/block/require-approval)
 *    - Automatic checkpointing
 *    - Rollback with risk assessment
 *    - Quality trend analysis
 *
 * 7. BUILD INTELLIGENCE - The brain of the system
 *    - Deep pattern recognition
 *    - Bottleneck identification
 *    - Optimization suggestions
 *    - Post-build analytics
 *    - Continuous learning
 *
 * ============================================================================
 */

// ============================================================================
// EVENT SOURCING
// ============================================================================
export {
  // Types
  type BuildEvent,
  type BuildEventType,
  type ProjectedBuildState,
  type PhaseState,
  type AgentState,
  type TimelineEntry as EventTimelineEntry,
  type BuildMetrics as EventBuildMetrics,

  // Classes
  EventStore,
  StateProjector,
  TimeMachine,

  // Factory
  createEventStore,
} from './event-sourcing';

// ============================================================================
// SELF-HEALING
// ============================================================================
export {
  // Types
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitStats,
  type RetryConfig,
  type HealthMetrics,

  // Classes
  CircuitBreaker,
  RetryStrategy,
  FallbackRegistry,
  HealthMonitor,
  SelfHealingOrchestrator,

  // Factory
  createSelfHealingOrchestrator,
} from './self-healing';

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================
export {
  // Types
  type BuildPrediction,
  type HistoricalStats,
  type AnomalyDetection,
  type Anomaly,
  type RecognizedPattern,

  // Classes
  PredictionEngine,
  PatternRecognizer,

  // Factory
  createPredictionEngine,
} from './predictive-analytics';

// ============================================================================
// SAGA ORCHESTRATOR
// ============================================================================
export {
  // Types
  type SagaDefinition,
  type SagaStep,
  type SagaInstance,

  // Classes
  DistributedLockManager,
  IdempotencyStore,
  SagaOrchestrator,
  SagaBuilder,

  // Factory & Builder
  createSagaOrchestrator,
  defineSaga,
} from './saga-orchestrator';

// ============================================================================
// REAL-TIME STREAMING
// ============================================================================
export {
  // Types
  type StreamClient,
  type StreamFilters,
  type StreamMessage,
  type ProgressUpdate,

  // Classes
  StreamManager,

  // Factory & Helpers
  createStreamManager,
  createSSEResponse,
} from './realtime-streaming';

// ============================================================================
// QUALITY GATES
// ============================================================================
export {
  // Types
  type GateLevel,
  type GateStatus,
  type CheckpointStatus,
  type QualityRule,
  type ValidationContext,
  type ValidationResult,
  type QualityGate,
  type GateSummary,
  type GateApproval,
  type CheckpointData,
  type RollbackPlan,
  type RollbackStep,
  type RollbackRisk,
  type QualityTrendReport,
  type QualityRegression,
  type QualityImprovement,

  // Classes
  QualityRuleRegistry,
  CheckpointManager,
  GateEvaluator,
  RollbackEngine,
  QualityTrendAnalyzer,

  // Built-in Rules
  BUILT_IN_RULES,

  // Factory
  createQualityGateSystem,
} from './quality-gates';

// ============================================================================
// BUILD INTELLIGENCE
// ============================================================================
export {
  // Types
  type BuildProfile,
  type PhaseProfile,
  type AgentProfile,
  type BuildMetrics,
  type DetectedPattern,
  type Bottleneck,
  type OptimizationOpportunity,
  type QualityProfile,
  type IntelligenceInsights,
  type Finding,
  type Prediction,
  type Recommendation,
  type Learning,
  type BuildComparison,
  type AggregatedInsights,
  type BuildReport,
  type TimelineEntry,

  // Classes
  BuildIntelligenceEngine,

  // Factory
  createBuildIntelligence,
} from './build-intelligence';

// ============================================================================
// UNIFIED 10X SYSTEM FACTORY
// ============================================================================

import { createEventStore, EventStore } from './event-sourcing';
import { createSelfHealingOrchestrator, SelfHealingOrchestrator } from './self-healing';
import { createPredictionEngine, PredictionEngine } from './predictive-analytics';
import { createSagaOrchestrator, SagaOrchestrator } from './saga-orchestrator';
import { createStreamManager, StreamManager } from './realtime-streaming';
import {
  createQualityGateSystem,
  QualityRuleRegistry,
  CheckpointManager,
  GateEvaluator,
  RollbackEngine,
  QualityTrendAnalyzer,
} from './quality-gates';
import { createBuildIntelligence, BuildIntelligenceEngine } from './build-intelligence';

export interface TenXSystem {
  // Core
  eventStore: EventStore;

  // Self-Healing
  selfHealing: SelfHealingOrchestrator;

  // Predictions
  predictions: PredictionEngine;

  // Sagas
  sagas: SagaOrchestrator;

  // Streaming
  streaming: StreamManager;

  // Quality
  quality: {
    rules: QualityRuleRegistry;
    checkpoints: CheckpointManager;
    gates: GateEvaluator;
    rollback: RollbackEngine;
    trends: QualityTrendAnalyzer;
  };

  // Intelligence
  intelligence: BuildIntelligenceEngine;

  // Saga tracking (optional, used by orchestrator)
  activeSagas?: Map<string, { id: string; startTime: number; steps: string[] }>;

  // Evolution metrics (optional, used by orchestrator)
  evolutionMetrics?: { recentBuilds: string[]; executionRecords: Map<string, unknown> };

  // Evolution engine (optional, used by orchestrator)
  evolution?: {
    shouldRunEvolution: () => boolean;
    triggerEvolution: () => Promise<void>;
    recordExecution: (record: unknown) => Promise<void>;
  };
}

/**
 * Create the complete 10X system with all components wired together
 */
export function createTenXSystem(): TenXSystem {
  // Create event store first - it's the foundation
  const eventStore = createEventStore();

  // Create self-healing orchestrator
  const selfHealing = createSelfHealingOrchestrator(eventStore);

  // Create prediction engine
  const predictions = createPredictionEngine(eventStore);

  // Create saga orchestrator
  const sagas = createSagaOrchestrator(eventStore);

  // Create streaming manager
  const streaming = createStreamManager(eventStore);

  // Create quality gate system
  const { ruleRegistry, checkpointManager, gateEvaluator, rollbackEngine, trendAnalyzer } =
    createQualityGateSystem(eventStore);

  // Create build intelligence
  const intelligence = createBuildIntelligence(eventStore);

  return {
    eventStore,
    selfHealing,
    predictions,
    sagas,
    streaming,
    quality: {
      rules: ruleRegistry,
      checkpoints: checkpointManager,
      gates: gateEvaluator,
      rollback: rollbackEngine,
      trends: trendAnalyzer,
    },
    intelligence,
  };
}

/**
 * Default instance for convenience
 */
let defaultSystem: TenXSystem | null = null;

export function getTenXSystem(): TenXSystem {
  if (!defaultSystem) {
    defaultSystem = createTenXSystem();
  }
  return defaultSystem;
}

export function resetTenXSystem(): void {
  defaultSystem = null;
}

/**
 * OLYMPUS 50X - Build Orchestrator
 *
 * Phase 3: Build Plan Integration
 * - BuildPlanStore: CRUD operations for build plans
 * - Phase Rules: Transition validation and conditions
 * - State Machine: Build lifecycle management
 *
 * Production-Ready Implementations:
 * - TransactionalPlanStore: Atomic operations with optimistic locking
 * - PersistentStateMachine: DB-persisted state with recovery
 */

// Core Types
export * from './types';

// Original Orchestrator (legacy)
export { BuildOrchestrator } from './orchestrator';
export { AgentScheduler } from './scheduler';
export {
  createBuildPlan,
  getReadyAgents,
  isPhaseComplete,
  getNextPhase,
  calculateProgress,
} from './planner';

// 50X Orchestrator
export { FiftyXOrchestrator } from './50x-orchestrator';

// ============================================================================
// PHASE 3: BUILD PLAN INTEGRATION
// ============================================================================

// Build Plan Store (Original - uses JSONB)
export {
  BuildPlanStore,
  getBuildPlanStore as createBuildPlanStore,
  type BuildPlan,
  type BuildPlanStatus,
  type AgentPlan,
  type PhaseStatus,
  type AgentPlanStatus,
} from './build-plan-store';

// Phase Rules & Validation
export {
  PHASE_DEFINITIONS,
  PHASE_TRANSITIONS,
  PHASE_SKIP_RULES,
  validateTransition,
  getValidNextPhases,
  getRecommendedNextPhase,
  canSkipPhase,
  getPhasesForProjectType,
  getPhaseAgents,
  areAllPhasesComplete,
  getPhaseByOrder,
  getPhaseOrder,
  transitionRequiresApproval,
  type PhaseId,
  type PhaseTransition,
  type TransitionCondition,
  type TransitionResult,
  type TransitionContext,
} from './phase-rules';

// State Machine (Original - in-memory)
export {
  BuildStateMachine,
  createStateMachine,
  type BuildState,
  type StateTransition,
  type StateMachineContext,
  type StateEvent,
} from './state-machine';

// ============================================================================
// PRODUCTION-READY IMPLEMENTATIONS (Post-Critique Fixes)
// ============================================================================

// Transactional Plan Store (Atomic operations, normalized tables)
export {
  TransactionalPlanStore,
  createTransactionalStore,
  type BuildPlanRecord,
  type PhaseRecord,
  type AgentRecord,
  type CreatePlanInput,
  type TransactionContext,
  ATOMIC_CREATE_FUNCTION,
} from './transactional-plan-store';

// Persistent State Machine (DB-backed with recovery)
export {
  PersistentStateMachine,
  createPersistentStateMachine,
  type PersistedState,
  type StateTransitionRecord,
  STATE_MACHINE_MIGRATION,
} from './persistent-state-machine';

// ============================================================================
// RESILIENCE ENGINE v2.0 - Self-Healing Build System
// ============================================================================

export {
  // Core Engine
  ResilienceEngine,
  getResilienceEngine,
  destroyResilienceEngine,
  getActiveEngineCount,
  DEFAULT_RESILIENCE_CONFIG,
  DEGRADATION_TIERS,

  // WORLD-CLASS: Observability Layer
  ResilienceEventBus,
  ResilienceLogger,

  // Types - Core
  type CircuitState,
  type DegradationTier,
  type FailureCategory,
  type TraceSpan,
  type CircuitBreakerState,
  type BuildFingerprint,
  type HealthScore,
  type SelfHealingAction,
  type ResilienceMetrics,
  type ResilienceConfig,
  type ResilienceEngineOptions,

  // Types - Events
  type ResilienceEvent,
  type ResilienceEventHandler,
  type LogLevel,
  type LogEntry,
  type MetricsCollector,
} from './resilience-engine';

// ============================================================================
// POST-BUILD VALIDATION (CRITICAL FIX)
// Ensures generated code actually compiles before declaring success
// ============================================================================

export {
  writeProjectFiles,
  summarizeFiles,
  type FileWriterConfig,
  type FileWriterResult,
} from './project-file-writer';

export {
  validateProjectBuild,
  getValidationSummary,
  type ProjectValidatorConfig,
  type ProjectValidatorResult,
} from './project-build-validator';

export {
  scaffoldProject,
  getMissingRequiredFiles,
  type ScaffoldConfig,
  type ScaffoldResult,
} from './project-scaffolder';

/**
 * OLYMPUS 2.1 - Orchestrator Module
 *
 * 10X UPGRADES:
 * - Build Checkpointing (resume from any point)
 * - Parallel Agent Execution (5x faster builds)
 */

export {
  CheckpointManager,
  checkpointManager,
  type CheckpointData,
  type CheckpointMetadata,
  type CheckpointStorage,
  type CheckpointDiff,
  type ResumeOptions,
  type ResumeResult,
  type PhaseOutput,
  type Artifact,
  type BuildConfig,
  type AgentCheckpointState,
  type ArtifactChange,
} from './checkpointing';

export {
  ParallelExecutor,
  DependencyGraphBuilder,
  graphBuilder,
  createParallelExecutor,
  type AgentNode,
  type ExecutionGraph,
  type ParallelGroup,
  type ExecutionResult,
  type ParallelExecutorConfig,
  type ExecutorState,
  type ExecutionContext,
  type ExecutionStats,
  type AgentExecutor,
} from './parallel-executor';

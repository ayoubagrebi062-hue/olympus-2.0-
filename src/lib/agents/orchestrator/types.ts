/**
 * OLYMPUS 2.0 - Orchestrator Types
 */

import type { AgentId, BuildPhase, AgentOutput, AgentStatus } from '../types';

/** Build orchestration status */
export type OrchestrationStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

/** Phase execution status */
export interface PhaseStatus {
  phase: BuildPhase;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  agents: AgentExecutionStatus[];
  error?: string;
}

/** Agent execution status */
export interface AgentExecutionStatus {
  agentId: AgentId;
  status: AgentStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  tokensUsed?: number;
  retries: number;
  error?: string;
}

/** Build progress */
export interface BuildProgress {
  buildId: string;
  status: OrchestrationStatus;
  currentPhase: BuildPhase | null;
  currentAgents: AgentId[];
  pendingAgents?: AgentId[];
  completedPhases: BuildPhase[];
  completedAgents: AgentId[];
  progress: number; // 0-100
  tokensUsed: number;
  estimatedCost: number;
  startedAt: Date | null;
  eta?: Date;
}

/** Orchestration options */
export interface OrchestrationOptions {
  maxConcurrency?: number;
  continueOnError?: boolean;
  skipOptionalOnBudget?: boolean;
  pauseOnPhaseComplete?: boolean;
  onProgress?: (progress: BuildProgress) => void;
  onPhaseComplete?: (phase: BuildPhase, status: PhaseStatus) => void;
  onAgentComplete?: (agentId: AgentId, output: AgentOutput) => void;
  onError?: (error: OrchestrationError) => void;

  // Post-build validation options (CRITICAL FIX for false success claims)
  /** Directory to write generated project files. Default: .olympus/builds/{buildId} */
  outputPath?: string;
  /** Whether to run npm run build to validate generated code. Default: true */
  validateBuild?: boolean;
}

/** Orchestration error */
export interface OrchestrationError {
  code: string;
  message: string;
  phase?: BuildPhase;
  agentId?: AgentId;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

/** Build plan - what will be executed */
export interface BuildPlan {
  buildId: string;
  tier: string;
  phases: PhasePlan[];
  totalAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
  estimatedDuration?: number; // ms
}

/** Phase plan */
export interface PhasePlan {
  phase: BuildPhase;
  name?: BuildPhase;
  agents: AgentId[];
  parallel: boolean;
  optional: boolean;
  estimatedTokens: number;
}

/** Execution queue item */
export interface QueueItem {
  agentId: AgentId;
  phase: BuildPhase;
  priority: number;
  dependencies: AgentId[];
  status: 'queued' | 'running' | 'completed' | 'failed';
}

/** Orchestration events */
export type OrchestrationEvent =
  | { type: 'build_started'; buildId: string; plan: BuildPlan; data?: Record<string, unknown> }
  | { type: 'phase_started'; phase: BuildPhase; data?: Record<string, unknown> }
  | {
      type: 'phase_completed';
      phase: BuildPhase;
      status: PhaseStatus;
      data?: Record<string, unknown>;
    }
  | { type: 'agent_started'; agentId: AgentId; phase: BuildPhase; data?: Record<string, unknown> }
  | {
      type: 'agent_completed';
      agentId: AgentId;
      output: AgentOutput;
      data?: Record<string, unknown>;
    }
  | {
      type: 'agent_failed';
      agentId: AgentId;
      error: OrchestrationError;
      data?: Record<string, unknown>;
    }
  | { type: 'validation_started'; buildId: string; data?: Record<string, unknown> }
  | {
      type: 'build_completed';
      buildId: string;
      success: boolean;
      outputPath?: string;
      filesWritten?: number;
      buildTime?: number;
      validationErrors?: string[];
      data?: Record<string, unknown>;
    }
  | {
      type: 'build_failed';
      buildId: string;
      error: OrchestrationError;
      data?: Record<string, unknown>;
    }
  | { type: 'build_paused'; buildId: string; reason: string; data?: Record<string, unknown> }
  | { type: 'build_canceled'; buildId: string; data?: Record<string, unknown> };

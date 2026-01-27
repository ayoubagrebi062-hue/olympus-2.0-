/**
 * OLYMPUS 2.0 - Build Context Types
 */

import type { AgentId, AgentOutput, BuildPhase, Artifact, Decision } from '../types';

/** Build state */
export type BuildState =
  | 'created'
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

/** Build context - accumulated knowledge across agents */
export interface BuildContextData {
  // Identity
  buildId: string;
  projectId: string;
  tenantId: string;

  // Configuration
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  description: string;
  targetUsers?: string;
  techConstraints?: string;
  businessRequirements?: string;
  designPreferences?: string;
  integrations?: string[];

  // State
  state: BuildState;
  currentPhase: BuildPhase | null;
  currentAgent: AgentId | null;
  iteration: number;

  // Accumulated outputs
  agentOutputs: Map<AgentId, AgentOutput>;
  artifacts: Map<string, Artifact>;
  decisions: Decision[];

  // Derived knowledge (summarized for context window)
  knowledge: BuildKnowledge;

  // Feedback & iteration
  userFeedback: string[];
  focusAreas: string[];

  // Metrics
  startedAt: Date | null;
  completedAt: Date | null;
  tokensUsed: number;
  estimatedCost: number;
}

/** Summarized knowledge for prompt context */
export interface BuildKnowledge {
  // Discovery insights
  marketAnalysis?: string;
  targetPersonas?: string[];
  coreFeatures?: string[];
  constraints?: string[];

  // STRATEGOS extended outputs (FIX: Added for full constraint propagation)
  technicalRequirements?: Record<string, any>;
  roadmap?: Record<string, any>;
  successCriteria?: string[];

  // Design decisions
  colorPalette?: Record<string, string>;
  typography?: Record<string, string>;
  components?: string[];
  pageStructure?: Record<string, string[]>;

  // Architecture decisions
  techStack?: TechStackDecision;
  databaseSchema?: string;
  apiEndpoints?: string[];
  authStrategy?: string;

  // Generated code summary
  generatedFiles?: string[];
  servicesCreated?: string[];
  componentsCreated?: string[];
  existingCodebase?: string;
}

/** Tech stack decision */
export interface TechStackDecision {
  framework: string;
  language: string;
  database: string;
  hosting: string;
  styling: string;
  auth: string;
  additionalLibraries: string[];
}

/** Context snapshot for persistence */
export interface ContextSnapshot {
  buildId: string;
  version: number;
  timestamp: Date;
  state: BuildState;
  currentPhase: BuildPhase | null;
  currentAgent: AgentId | null;
  iteration: number;
  knowledge: BuildKnowledge;
  agentOutputIds: AgentId[];
  tokensUsed: number;
  checksum: string;
}

/** Context update event */
export interface ContextUpdateEvent {
  type:
    | 'agent_started'
    | 'agent_completed'
    | 'phase_completed'
    | 'feedback_added'
    | 'state_changed';
  buildId: string;
  agentId?: AgentId;
  phase?: BuildPhase;
  timestamp: Date;
  data?: Record<string, unknown>;
}

/**
 * OLYMPUS 2.0 - Agent Type Definitions
 */

/** Build phases */
export type BuildPhase =
  | 'discovery'
  | 'conversion'
  | 'design'
  | 'architecture'
  | 'frontend'
  | 'backend'
  | 'integration'
  | 'testing'
  | 'deployment';

/** Agent tiers (which model to use) */
export type AgentTier = 'opus' | 'sonnet' | 'haiku';

/** Agent status */
export type AgentStatus =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'skipped';

/** Agent identifiers - all 40 agents */
export type AgentId =
  // Discovery Phase (5)
  | 'oracle'
  | 'empathy'
  | 'venture'
  | 'strategos'
  | 'scope'
  // Conversion Phase (4) - Conversion content generation
  | 'psyche'
  | 'scribe'
  | 'architect_conversion'
  | 'conversion_judge'
  // Design Phase (6) - includes ARTIST for image prompt generation
  | 'palette'
  | 'grid'
  | 'blocks'
  | 'cartographer'
  | 'flow'
  | 'artist'
  // Architecture Phase (6)
  | 'archon'
  | 'datum'
  | 'nexus'
  | 'forge'
  | 'sentinel'
  | 'atlas'
  // Frontend Phase (3)
  | 'pixel'
  | 'wire'
  | 'polish'
  // Backend Phase (4)
  | 'engine'
  | 'gateway'
  | 'keeper'
  | 'cron'
  // Integration Phase (4)
  | 'bridge'
  | 'sync'
  | 'notify'
  | 'search'
  // Testing Phase (4)
  | 'junit'
  | 'cypress'
  | 'load'
  | 'a11y'
  // Deployment Phase (4)
  | 'docker'
  | 'pipeline'
  | 'monitor'
  | 'scale'
  // Extended identifiers
  | 'testing'
  | 'reviewer'
  | 'shield';

/** Agent input/output types */
export interface AgentInput {
  buildId: string;
  projectId: string;
  tenantId: string;
  phase: BuildPhase;
  context: BuildContext;
  previousOutputs: Record<AgentId, AgentOutput>;
  userFeedback?: string;
  constraints?: AgentConstraints;
}

export interface AgentOutput {
  agentId: AgentId;
  status: AgentStatus;
  artifacts: Artifact[];
  decisions: Decision[];
  metrics: AgentMetrics;
  errors?: AgentError[];
  duration: number;
  tokensUsed: number;
  /** Indicates if agent was skipped (e.g., due to tier degradation) */
  _skipped?: boolean;
  /** Reason for skipping the agent */
  _reason?: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  path?: string;
  content: string;
  metadata: Record<string, unknown>;
}

export type ArtifactType = 'code' | 'schema' | 'config' | 'document' | 'design' | 'test' | 'asset';

export interface Decision {
  id: string;
  type: string;
  key?: string;
  choice: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
  value?: unknown;
}

export interface AgentMetrics {
  inputTokens: number;
  outputTokens: number;
  promptCount: number;
  retries: number;
  cacheHits: number;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface AgentConstraints {
  maxTokens?: number;
  maxDuration?: number;
  techStack?: string[];
  excludePatterns?: string[];
  focusAreas?: string[];
  /** 50X COORDINATION: Upstream constraints from ARCHON and other agents */
  upstreamConstraints?: string;
}

/** Build context passed between agents */
export interface BuildContext {
  description: string;
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  targetUsers?: string;
  techConstraints?: string;
  businessRequirements?: string;
  designPreferences?: string;
  integrations?: string[];
  existingCodebase?: string;
  iterationNumber: number;
  feedback?: string[];
  metadata?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  accumulatedKnowledge?: Record<string, unknown>;
}

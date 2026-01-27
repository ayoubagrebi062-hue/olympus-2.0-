/**
 * OLYMPUS 2.0 - Agent Definition Types
 */

import type { AgentId, BuildPhase, AgentTier, AgentInput, AgentOutput } from './core';

/** Agent definition */
export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  phase: BuildPhase;
  tier: AgentTier;
  dependencies: AgentId[];
  optional: boolean;
  systemPrompt: string;
  outputSchema: OutputSchema;
  maxRetries: number;
  timeout: number; // ms
  capabilities: AgentCapability[];

  /** If true, this agent can receive niche-specific context injection */
  nicheAware?: boolean;
}

/** Agent capability flags */
export type AgentCapability =
  | 'code_generation'
  | 'code_review'
  | 'schema_design'
  | 'api_design'
  | 'ui_design'
  | 'testing'
  | 'documentation'
  | 'analysis'
  | 'optimization'
  | 'security_audit'
  | 'psychology'
  | 'copywriting'
  | 'content_generation'
  | 'conversion_optimization'
  | 'architecture'
  | 'quality_scoring'
  | 'validation'
  | 'feedback_generation';

/** Output schema for validation */
export interface OutputSchema {
  type: 'object' | 'array';
  required: string[];
  properties: Record<string, SchemaProperty>;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | string[];
  description?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  enum?: string[];  // Allowed values for enums
}

/** Agent execution interface */
export interface AgentExecutor {
  execute(input: AgentInput): Promise<AgentOutput>;
  validate(output: AgentOutput): boolean;
  recover(error: Error, input: AgentInput): Promise<AgentOutput | null>;
}

/** Agent lifecycle hooks */
export interface AgentHooks {
  beforeExecute?: (input: AgentInput) => Promise<AgentInput>;
  afterExecute?: (output: AgentOutput) => Promise<AgentOutput>;
  onError?: (error: Error, input: AgentInput) => Promise<void>;
  onRetry?: (attempt: number, error: Error) => Promise<boolean>;
}

/** Phase configuration */
export interface PhaseConfig {
  phase: BuildPhase;
  agents: AgentId[];
  parallel: boolean;
  optional: boolean;
  minTier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
}

/** Build tier configuration */
export interface TierConfig {
  name: string;
  phases: BuildPhase[];
  agents: AgentId[];
  maxConcurrency: number;
  maxTokensPerBuild: number;
  features: string[];
}

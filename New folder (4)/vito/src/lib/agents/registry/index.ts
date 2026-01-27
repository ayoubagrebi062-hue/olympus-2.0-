/**
 * OLYMPUS 2.0 - Agent Registry
 */

import type { AgentId, AgentDefinition, PhaseConfig, TierConfig, BuildPhase } from '../types';
import { discoveryAgents } from './discovery';
import { conversionAgents } from './conversion';
import { designAgents } from './design';
import { architectureAgents } from './architecture';
import { frontendAgents } from './frontend';
import { backendAgents } from './backend';
import { integrationAgents } from './integration';
import { testingAgents, deploymentAgents } from './testing-deployment';

export const ALL_AGENTS: AgentDefinition[] = [
  ...discoveryAgents,
  ...conversionAgents,
  ...designAgents,
  ...architectureAgents,
  ...frontendAgents,
  ...backendAgents,
  ...integrationAgents,
  ...testingAgents,
  ...deploymentAgents,
];

/** Agent lookup map */
export const AGENT_MAP: Map<AgentId, AgentDefinition> = new Map(ALL_AGENTS.map((a) => [a.id, a]));

/** Get agent by ID */
export function getAgent(id: AgentId): AgentDefinition | undefined {
  return AGENT_MAP.get(id);
}

/** Get agents by phase */
export function getAgentsByPhase(phase: BuildPhase): AgentDefinition[] {
  return ALL_AGENTS.filter((a) => a.phase === phase);
}

/** Phase execution order */
export const PHASE_ORDER: BuildPhase[] = ['discovery', 'conversion', 'design', 'architecture', 'frontend', 'backend', 'integration', 'testing', 'deployment'];

/** Phase configurations */
export const PHASE_CONFIGS: PhaseConfig[] = [
  { phase: 'discovery', agents: ['oracle', 'empathy', 'venture', 'strategos', 'scope'], parallel: false, optional: false, minTier: 'starter' },
  { phase: 'conversion', agents: ['psyche', 'scribe', 'architect_conversion', 'conversion_judge'], parallel: false, optional: false, minTier: 'starter' },
  { phase: 'design', agents: ['palette', 'grid', 'blocks', 'cartographer', 'flow', 'artist'], parallel: false, optional: false, minTier: 'starter' },
  { phase: 'architecture', agents: ['archon', 'datum', 'nexus', 'forge', 'sentinel', 'atlas'], parallel: false, optional: false, minTier: 'starter' },
  { phase: 'frontend', agents: ['pixel', 'wire', 'polish'], parallel: false, optional: false, minTier: 'starter' },
  { phase: 'backend', agents: ['engine', 'gateway', 'keeper', 'cron'], parallel: true, optional: false, minTier: 'professional' },
  { phase: 'integration', agents: ['bridge', 'sync', 'notify', 'search'], parallel: true, optional: true, minTier: 'professional' },
  { phase: 'testing', agents: ['junit', 'cypress', 'load', 'a11y'], parallel: true, optional: true, minTier: 'ultimate' },
  { phase: 'deployment', agents: ['docker', 'pipeline', 'monitor', 'scale'], parallel: true, optional: true, minTier: 'enterprise' },
];

/** Build tier configurations */
export const TIER_CONFIGS: Record<string, TierConfig> = {
  starter: {
    name: 'Starter',
    phases: ['discovery', 'conversion', 'design', 'architecture', 'frontend'],
    agents: ['oracle', 'empathy', 'venture', 'strategos', 'scope', 'psyche', 'scribe', 'architect_conversion', 'conversion_judge', 'palette', 'grid', 'blocks', 'cartographer', 'flow', 'artist', 'archon', 'datum', 'nexus', 'forge', 'sentinel', 'atlas', 'pixel', 'wire', 'polish'],
    maxConcurrency: 1,
    maxTokensPerBuild: 500000,
    features: ['mvp', 'basic_ui', 'simple_backend'],
  },
  professional: {
    name: 'Professional',
    phases: ['discovery', 'conversion', 'design', 'architecture', 'frontend', 'backend', 'integration'],
    agents: ['oracle', 'empathy', 'venture', 'strategos', 'scope', 'psyche', 'scribe', 'architect_conversion', 'conversion_judge', 'palette', 'grid', 'blocks', 'cartographer', 'flow', 'artist', 'archon', 'datum', 'nexus', 'forge', 'sentinel', 'atlas', 'pixel', 'wire', 'polish', 'engine', 'gateway', 'keeper', 'cron', 'bridge', 'sync', 'notify', 'search'],
    maxConcurrency: 3,
    maxTokensPerBuild: 1500000,
    features: ['full_backend', 'integrations', 'auth', 'notifications'],
  },
  ultimate: {
    name: 'Ultimate',
    phases: ['discovery', 'conversion', 'design', 'architecture', 'frontend', 'backend', 'integration', 'testing'],
    agents: ['oracle', 'empathy', 'venture', 'strategos', 'scope', 'psyche', 'scribe', 'architect_conversion', 'conversion_judge', 'palette', 'grid', 'blocks', 'cartographer', 'flow', 'artist', 'archon', 'datum', 'nexus', 'forge', 'sentinel', 'atlas', 'pixel', 'wire', 'polish', 'engine', 'gateway', 'keeper', 'cron', 'bridge', 'sync', 'notify', 'search', 'junit', 'cypress', 'load', 'a11y'],
    maxConcurrency: 5,
    maxTokensPerBuild: 3000000,
    features: ['testing', 'real_time', 'search', 'scheduled_jobs'],
  },
  enterprise: {
    name: 'Enterprise',
    phases: PHASE_ORDER,
    agents: ALL_AGENTS.map((a) => a.id),
    maxConcurrency: 8,
    maxTokensPerBuild: 10000000,
    features: ['all', 'deployment', 'monitoring', 'scaling', 'load_testing'],
  },
};

export { discoveryAgents, conversionAgents, designAgents, architectureAgents, frontendAgents, backendAgents, integrationAgents, testingAgents, deploymentAgents };

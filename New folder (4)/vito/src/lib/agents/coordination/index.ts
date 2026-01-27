/**
 * OLYMPUS 2.1 - Coordination Module
 *
 * This module ensures architectural decisions from ARCHON propagate
 * to all downstream agents (DATUM, NEXUS, PIXEL, etc.)
 *
 * THE 50X COORDINATION UPGRADE:
 * Before: Agents work independently, may contradict each other
 * After: ARCHON's decisions flow through the entire pipeline
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHON SCHEMA UPGRADE
// ═══════════════════════════════════════════════════════════════════════════════
// Types (must use 'export type' for TypeScript types)
export type {
  ArchitecturePattern,
  TenantIsolation,
  ConsistencyModel,
  ApiVersioning,
  StatePattern,
  MultiTenancyConfig,
  DatabaseConfig,
  ApiConfig,
  AuthConfig,
  CacheConfig,
  StateConfig,
  ErrorConfig,
  CodeOrganizationConfig,
  ArchonEnhancedOutput,
  CriticalArchitectureDecisions,
} from './archon-schema-upgrade';

// Values (defaults and functions)
export {
  DEFAULT_STARTER_CONFIG,
  DEFAULT_ENTERPRISE_CONFIG,
  validateArchonOutput,
  mergeWithDefaults,
  parseArchonOutput,
  extractCriticalDecisions,
  formatDecisionsForPrompt,
} from './archon-schema-upgrade';

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL SUMMARIZER
// ═══════════════════════════════════════════════════════════════════════════════
// Types (must use 'export type' for TypeScript types)
export type {
  DesignDecisions,
  DataDecisions,
  ApiDecisions,
  SecurityDecisions,
  PageDecisions,
  CriticalDecisions,
} from './critical-summarizer';

// Functions
export {
  buildCriticalDecisions,
  updateCriticalDecisions,
  formatCriticalDecisionsForPrompt,
} from './critical-summarizer';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTRAINT INJECTOR
// ═══════════════════════════════════════════════════════════════════════════════
// Types
export type {
  InjectionResult,
  InjectionPosition,
  ConstraintViolation,
} from './constraint-injector';

// Functions
export {
  needsConstraintInjection,
  getInjectionPriority,
  buildConstraintInjection,
  getInjectionPosition,
  enhanceInputWithConstraints,
  enhanceSystemPrompt,
  getConstraintSources,
  hasRequiredConstraints,
  getMissingConstraints,
  validateAgainstConstraints,
} from './constraint-injector';

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

import type { AgentId, AgentOutput, AgentDefinition, AgentInput } from '../types';
import { buildCriticalDecisions, CriticalDecisions } from './critical-summarizer';
import { buildConstraintInjection, enhanceInputWithConstraints } from './constraint-injector';

/**
 * One-call function to get constraint-enhanced input for an agent
 *
 * Usage in executor:
 * ```
 * const { enhancedInput, constraints } = prepareAgentWithConstraints(
 *   input,
 *   definition,
 *   previousOutputs,
 *   tier
 * );
 * ```
 */
export function prepareAgentWithConstraints(
  input: AgentInput,
  definition: AgentDefinition,
  previousOutputs: Map<AgentId, AgentOutput>,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise'
): {
  enhancedInput: AgentInput;
  criticalDecisions: CriticalDecisions;
  constraintText: string;
  estimatedTokens: number;
} {
  // Build critical decisions from all previous outputs
  const criticalDecisions = buildCriticalDecisions(previousOutputs, tier);

  // Enhance input with constraints
  const { enhancedInput, injection } = enhanceInputWithConstraints(
    input,
    criticalDecisions,
    definition
  );

  return {
    enhancedInput,
    criticalDecisions,
    constraintText: injection.constraintText,
    estimatedTokens: injection.estimatedTokens,
  };
}

/**
 * Check if an agent is ready to execute based on constraint dependencies
 */
export function isAgentReadyForExecution(
  agentId: AgentId,
  completedAgents: Set<AgentId>
): {
  ready: boolean;
  missingDependencies: AgentId[];
  reason?: string;
} {
  const { hasRequiredConstraints, getMissingConstraints } = require('./constraint-injector');

  const ready = hasRequiredConstraints(agentId, completedAgents);
  const missingDependencies = getMissingConstraints(agentId, completedAgents);

  return {
    ready,
    missingDependencies,
    reason: ready
      ? undefined
      : `Waiting for constraint sources: ${missingDependencies.join(', ')}`,
  };
}

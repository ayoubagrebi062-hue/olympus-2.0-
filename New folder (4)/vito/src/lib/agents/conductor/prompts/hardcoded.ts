/**
 * HARDCODED PROMPT FALLBACK
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * Provides fallback prompts when database is unavailable.
 * Extracts existing prompts from registry files.
 *
 * IMPORTANT: This file is auto-generated from registry files.
 * After migration, database prompts take precedence.
 */

import { LoadedPrompt } from './types';
import { ALL_AGENTS, AGENT_MAP } from '../../registry';
import type { AgentDefinition } from '../../types';

// ============================================================================
// HARDCODED PROMPTS MAP
// ============================================================================

/**
 * Map of agent ID to LoadedPrompt
 * Built from registry files at module load time
 */
const HARDCODED_PROMPTS = new Map<string, LoadedPrompt>();

/**
 * Initialize hardcoded prompts from registry
 */
function initializeHardcodedPrompts(): void {
  for (const agent of ALL_AGENTS) {
    if (agent && agent.id && agent.systemPrompt) {
      HARDCODED_PROMPTS.set(agent.id, {
        promptId: `hardcoded-${agent.id}`,
        agentId: agent.id,
        version: 0, // Version 0 = hardcoded fallback
        systemPrompt: agent.systemPrompt,
        outputSchema: agent.outputSchema,
        examples: [], // Registry doesn't have examples
      });
    }
  }
}

// Initialize on module load
initializeHardcodedPrompts();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get hardcoded prompt for an agent
 *
 * @param agentId - The agent ID (e.g., 'strategos', 'archon')
 * @returns LoadedPrompt or null if not found
 */
export function getHardcodedPrompt(agentId: string): LoadedPrompt | null {
  return HARDCODED_PROMPTS.get(agentId) || null;
}

/**
 * Get all hardcoded prompts
 *
 * @returns Array of all LoadedPrompt objects
 */
export function getAllHardcodedPrompts(): LoadedPrompt[] {
  return Array.from(HARDCODED_PROMPTS.values());
}

/**
 * Check if hardcoded prompt exists for an agent
 *
 * @param agentId - The agent ID
 * @returns true if prompt exists
 */
export function hasHardcodedPrompt(agentId: string): boolean {
  return HARDCODED_PROMPTS.has(agentId);
}

/**
 * Get count of hardcoded prompts
 *
 * @returns Number of hardcoded prompts
 */
export function getHardcodedPromptCount(): number {
  return HARDCODED_PROMPTS.size;
}

/**
 * Get list of all agent IDs with hardcoded prompts
 *
 * @returns Array of agent IDs
 */
export function getHardcodedAgentIds(): string[] {
  return Array.from(HARDCODED_PROMPTS.keys());
}

/**
 * Get hardcoded prompts by phase
 *
 * @param phase - The build phase
 * @returns Array of LoadedPrompt objects for that phase
 */
export function getHardcodedPromptsByPhase(phase: string): LoadedPrompt[] {
  const agentsInPhase = ALL_AGENTS.filter((a) => a.phase === phase);
  return agentsInPhase
    .map((a) => HARDCODED_PROMPTS.get(a.id))
    .filter((p): p is LoadedPrompt => p !== undefined);
}

/**
 * Get agent definition from registry (for additional metadata)
 *
 * @param agentId - The agent ID
 * @returns AgentDefinition or undefined
 */
export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return AGENT_MAP.get(agentId as any);
}

// ============================================================================
// HARDCODED PROMPT STATISTICS
// ============================================================================

/**
 * Get statistics about hardcoded prompts
 */
export function getHardcodedStats(): {
  total: number;
  byPhase: Record<string, number>;
  byTier: Record<string, number>;
  agentIds: string[];
} {
  const byPhase: Record<string, number> = {};
  const byTier: Record<string, number> = {};

  for (const agent of ALL_AGENTS) {
    // Count by phase
    byPhase[agent.phase] = (byPhase[agent.phase] || 0) + 1;

    // Count by tier
    byTier[agent.tier] = (byTier[agent.tier] || 0) + 1;
  }

  return {
    total: HARDCODED_PROMPTS.size,
    byPhase,
    byTier,
    agentIds: Array.from(HARDCODED_PROMPTS.keys()),
  };
}

// ============================================================================
// PROMPT COMPARISON (for migration verification)
// ============================================================================

/**
 * Compare a database prompt with its hardcoded version
 *
 * @param agentId - The agent ID
 * @param dbPrompt - The database prompt to compare
 * @returns Comparison result
 */
export function compareWithHardcoded(
  agentId: string,
  dbPrompt: string
): {
  hasHardcoded: boolean;
  isIdentical: boolean;
  hardcodedLength: number;
  dbLength: number;
  diffPercentage: number;
} {
  const hardcoded = HARDCODED_PROMPTS.get(agentId);

  if (!hardcoded) {
    return {
      hasHardcoded: false,
      isIdentical: false,
      hardcodedLength: 0,
      dbLength: dbPrompt.length,
      diffPercentage: 100,
    };
  }

  const hardcodedText = hardcoded.systemPrompt;
  const isIdentical = hardcodedText === dbPrompt;

  // Calculate diff percentage (simple length-based approximation)
  const maxLen = Math.max(hardcodedText.length, dbPrompt.length);
  const minLen = Math.min(hardcodedText.length, dbPrompt.length);
  const diffPercentage = maxLen > 0 ? ((maxLen - minLen) / maxLen) * 100 : 0;

  return {
    hasHardcoded: true,
    isIdentical,
    hardcodedLength: hardcodedText.length,
    dbLength: dbPrompt.length,
    diffPercentage: isIdentical ? 0 : diffPercentage,
  };
}

// ============================================================================
// DEBUG / DEVELOPMENT HELPERS
// ============================================================================

/**
 * Log all hardcoded prompts (for debugging)
 */
export function debugLogAllPrompts(): void {
  console.log('=== HARDCODED PROMPTS ===');
  console.log(`Total: ${HARDCODED_PROMPTS.size}`);
  console.log('');

  for (const [agentId, prompt] of HARDCODED_PROMPTS) {
    console.log(`[${agentId}]`);
    console.log(`  Version: ${prompt.version}`);
    console.log(`  Prompt length: ${prompt.systemPrompt.length} chars`);
    console.log(`  Has output schema: ${!!prompt.outputSchema}`);
    console.log('');
  }
}

/**
 * Get prompt preview (first N characters)
 */
export function getPromptPreview(agentId: string, maxLength: number = 200): string | null {
  const prompt = HARDCODED_PROMPTS.get(agentId);
  if (!prompt) return null;

  if (prompt.systemPrompt.length <= maxLength) {
    return prompt.systemPrompt;
  }

  return prompt.systemPrompt.substring(0, maxLength) + '...';
}

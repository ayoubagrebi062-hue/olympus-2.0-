/**
 * OLYMPUS 2.1 - Context Summarizer
 *
 * Updated with 50X Coordination Upgrade:
 * - Integrates with CriticalDecisions for structured decision propagation
 * - Delegates to critical-summarizer for enhanced architecture context
 */

import type { AgentId, AgentOutput, BuildContext, Artifact, Decision } from '../types';
import type { BuildKnowledge, TechStackDecision } from './types';
import { getAgent } from '../registry';
import {
  CriticalDecisions,
  buildCriticalDecisions,
  formatCriticalDecisionsForPrompt,
} from '../coordination';

/** Maximum tokens for context summary - increased for design system support */
const MAX_CONTEXT_TOKENS = 12000;
const CHARS_PER_TOKEN = 4;

/** Priority sections to preserve during truncation (design context is critical) */
const PRIORITY_SECTIONS = [
  'Color Palette',
  'Design Tokens',
  'Components Defined',
  'Architecture Decisions',
  'Critical Constraints',
  'Tech Stack',
  'Core Features',
];

/** Build a summarized context string for agent prompts */
export function buildContextSummary(
  buildContext: BuildContext,
  knowledge: BuildKnowledge,
  previousOutputs: Record<AgentId, AgentOutput>,
  targetAgent: AgentId
): string {
  const sections: string[] = [];

  // 1. Project description (always include)
  sections.push(`## Project Description\n${buildContext.description}`);

  // 2. Target users and constraints
  if (buildContext.targetUsers) {
    sections.push(`## Target Users\n${buildContext.targetUsers}`);
  }
  if (buildContext.techConstraints) {
    sections.push(`## Technical Constraints\n${buildContext.techConstraints}`);
  }

  // 3. Key decisions from knowledge
  if (knowledge.coreFeatures?.length) {
    sections.push(
      `## Core Features (MVP)\n${knowledge.coreFeatures.map(f => `- ${f}`).join('\n')}`
    );
  }
  if (knowledge.techStack) {
    sections.push(`## Tech Stack\n${formatTechStack(knowledge.techStack)}`);
  }
  if (knowledge.targetPersonas?.length) {
    sections.push(`## Target Personas\n${knowledge.targetPersonas.map(p => `- ${p}`).join('\n')}`);
  }

  // FIX: Add STRATEGOS constraints injection
  if (knowledge.constraints?.length) {
    sections.push(
      `## STRATEGOS Constraints (MUST FOLLOW)\n${knowledge.constraints.map((c: string) => `- ${c}`).join('\n')}`
    );
  }

  // Add technical requirements
  if (knowledge.technicalRequirements && Object.keys(knowledge.technicalRequirements).length > 0) {
    sections.push(
      `## Technical Requirements\n${JSON.stringify(knowledge.technicalRequirements, null, 2)}`
    );
  }

  // Add roadmap context
  if (knowledge.roadmap && Object.keys(knowledge.roadmap).length > 0) {
    sections.push(`## Product Roadmap\n${JSON.stringify(knowledge.roadmap, null, 2)}`);
  }

  // 4. Design decisions (for frontend agents)
  const targetAgentDef = getAgent(targetAgent);
  if (targetAgentDef?.phase === 'frontend' || targetAgentDef?.phase === 'design') {
    if (knowledge.colorPalette) {
      sections.push(`## Color Palette\n${JSON.stringify(knowledge.colorPalette, null, 2)}`);
    }
    if (knowledge.components?.length) {
      sections.push(`## Components Defined\n${knowledge.components.map(c => `- ${c}`).join('\n')}`);
    }
  }

  // 5. Architecture decisions (for backend agents)
  if (targetAgentDef?.phase === 'backend' || targetAgentDef?.phase === 'architecture') {
    if (knowledge.databaseSchema) {
      sections.push(`## Database Schema\n${knowledge.databaseSchema}`);
    }
    if (knowledge.apiEndpoints?.length) {
      sections.push(
        `## API Endpoints\n${knowledge.apiEndpoints
          .slice(0, 20)
          .map(e => `- ${e}`)
          .join('\n')}`
      );
    }
  }

  // 6. Relevant previous outputs (summarized)
  const relevantOutputs = summarizePreviousOutputs(previousOutputs, targetAgent);
  if (relevantOutputs) {
    sections.push(`## Previous Agent Outputs\n${relevantOutputs}`);
  }

  // 7. User feedback (if iterating)
  if (buildContext.feedback?.length) {
    sections.push(`## User Feedback\n${buildContext.feedback.map(f => `- ${f}`).join('\n')}`);
  }

  // Combine and truncate if needed
  let summary = sections.join('\n\n');
  const maxChars = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;

  if (summary.length > maxChars) {
    summary = truncateToTokenLimit(summary, MAX_CONTEXT_TOKENS);
  }

  return summary;
}

/** Format tech stack decision */
function formatTechStack(ts: TechStackDecision): string {
  return [
    `- Framework: ${ts.framework}`,
    `- Language: ${ts.language}`,
    `- Database: ${ts.database}`,
    `- Hosting: ${ts.hosting}`,
    `- Styling: ${ts.styling}`,
    `- Auth: ${ts.auth}`,
    ts.additionalLibraries?.length ? `- Libraries: ${ts.additionalLibraries.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Summarize previous outputs relevant to target agent */
function summarizePreviousOutputs(
  outputs: Record<AgentId, AgentOutput>,
  targetAgent: AgentId
): string {
  const targetDef = getAgent(targetAgent);
  if (!targetDef) return '';

  const summaries: string[] = [];

  for (const depId of targetDef.dependencies) {
    const output = outputs[depId];
    if (!output) continue;

    const depDef = getAgent(depId);
    const summary = summarizeAgentOutput(output);
    if (summary) {
      summaries.push(`### ${depDef?.name || depId}\n${summary}`);
    }
  }

  return summaries.join('\n\n');
}

/** Summarize a single agent output */
function summarizeAgentOutput(output: AgentOutput): string {
  const parts: string[] = [];

  // Summarize key decisions
  if (output.decisions.length) {
    const decisionSummary = output.decisions
      .slice(0, 5)
      .map(d => `- ${d.type}: ${d.choice}`)
      .join('\n');
    parts.push(`Decisions:\n${decisionSummary}`);
  }

  // List generated files (if any)
  const files = output.artifacts.filter(a => a.type === 'code' && a.path);
  if (files.length) {
    parts.push(
      `Files: ${files
        .slice(0, 10)
        .map(f => f.path)
        .join(', ')}`
    );
  }

  return parts.join('\n');
}

/** Estimate token count from character length */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Smart truncation that prioritizes design sections
 *
 * Order of preservation:
 * 1. PRIORITY_SECTIONS (design tokens, color palette, components)
 * 2. Other sections (added until limit reached)
 * 3. Fallback: simple truncation if sections can't be parsed
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  // Try to parse into sections (markdown ## headers)
  const sections = text.split(/(?=^## )/gm).filter(s => s.trim());

  // If no sections found, fall back to simple truncation
  if (sections.length <= 1) {
    const firstPart = text.substring(0, Math.floor(maxChars * 0.7));
    const lastPart = text.substring(text.length - Math.floor(maxChars * 0.2));
    return `${firstPart}\n\n[... context truncated for token limit ...]\n\n${lastPart}`;
  }

  // Separate priority and non-priority sections
  const prioritySections = sections.filter(s => PRIORITY_SECTIONS.some(p => s.includes(p)));
  const otherSections = sections.filter(s => !PRIORITY_SECTIONS.some(p => s.includes(p)));

  // Always include priority sections first
  let result = prioritySections.join('\n\n');
  let truncatedCount = 0;

  // Add other sections until we approach the limit
  // Reserve 10% buffer for truncation notice
  const targetChars = Math.floor(maxChars * 0.9);

  for (const section of otherSections) {
    if (result.length + section.length < targetChars) {
      result += '\n\n' + section;
    } else {
      truncatedCount++;
    }
  }

  // Add truncation notice if sections were dropped
  if (truncatedCount > 0) {
    result += `\n\n[... ${truncatedCount} lower-priority sections truncated to preserve design context ...]`;
  }

  return result;
}

/** Extract key artifacts for a specific purpose */
export function extractArtifactsForPurpose(
  artifacts: Artifact[],
  purpose: 'code' | 'design' | 'docs'
): Artifact[] {
  switch (purpose) {
    case 'code':
      return artifacts.filter(a => a.type === 'code' || a.type === 'schema');
    case 'design':
      return artifacts.filter(a => a.type === 'design' || a.type === 'document');
    case 'docs':
      return artifacts.filter(a => a.type === 'document');
    default:
      return artifacts;
  }
}

/** Get file content by path from artifacts */
export function getFileContent(artifacts: Artifact[], path: string): string | null {
  const artifact = artifacts.find(a => a.path === path);
  return artifact?.content || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 50X COORDINATION UPGRADE - Enhanced Context Building
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build context summary with critical decisions from coordination system
 *
 * This is the enhanced version that includes structured constraints
 * from ARCHON and other upstream agents.
 */
export function buildContextSummaryWithConstraints(
  buildContext: BuildContext,
  knowledge: BuildKnowledge,
  previousOutputs: Record<AgentId, AgentOutput>,
  targetAgent: AgentId,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise' = 'professional'
): { summary: string; criticalDecisions: CriticalDecisions } {
  // Build base context summary
  const baseSummary = buildContextSummary(buildContext, knowledge, previousOutputs, targetAgent);

  // Build critical decisions from previous outputs
  const outputsMap = new Map(Object.entries(previousOutputs)) as Map<AgentId, AgentOutput>;
  const criticalDecisions = buildCriticalDecisions(outputsMap, tier);

  // Get constraint text for this agent
  const constraintText = formatCriticalDecisionsForPrompt(criticalDecisions, targetAgent);

  // Combine base summary with constraints
  const enhancedSummary = constraintText
    ? `${constraintText}\n\n---\n\n${baseSummary}`
    : baseSummary;

  return {
    summary: enhancedSummary,
    criticalDecisions,
  };
}

/**
 * Extract critical decisions from outputs (delegating to coordination module)
 */
export function extractCriticalDecisionsFromOutputs(
  previousOutputs: Record<AgentId, AgentOutput>,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise' = 'professional'
): CriticalDecisions {
  const outputsMap = new Map(Object.entries(previousOutputs)) as Map<AgentId, AgentOutput>;
  return buildCriticalDecisions(outputsMap, tier);
}

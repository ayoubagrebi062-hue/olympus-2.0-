/**
 * OLYMPUS 2.1 - Constraint Injector
 *
 * Injects critical architectural constraints into downstream agent prompts.
 * This ensures ARCHON's decisions propagate to all agents that need them.
 *
 * THE PROBLEM:
 * Before: Each agent builds its prompt independently, missing upstream decisions
 * After: ConstraintInjector adds relevant constraints before prompt building
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type { AgentId, AgentDefinition, AgentInput, BuildPhase } from '../types';
import { CriticalDecisions, formatCriticalDecisionsForPrompt } from './critical-summarizer';
import { CriticalArchitectureDecisions, formatDecisionsForPrompt } from './archon-schema-upgrade';
import {
  getAgentDesignContext,
  injectForAgent,
  type AgentPreset,
  type DesignContext,
} from '../design';

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for constraint injection by agent
 */
interface InjectionConfig {
  /** Which decision sections to inject */
  sections: Array<'architecture' | 'design' | 'data' | 'api' | 'security' | 'pages'>;
  /** Priority (higher = earlier in prompt) */
  priority: 'high' | 'medium' | 'low';
  /** Maximum tokens for injected content */
  maxTokens: number;
  /** Custom formatting function (optional) */
  customFormatter?: (decisions: CriticalDecisions) => string;
  /** Design token preset for this agent */
  designPreset?: AgentPreset;
}

/**
 * Injection configuration by agent ID
 */
const INJECTION_CONFIG: Partial<Record<AgentId, InjectionConfig>> = {
  // Architecture phase - inherit from ARCHON
  datum: {
    sections: ['architecture', 'data'],
    priority: 'high',
    maxTokens: 2000,
  },
  nexus: {
    sections: ['architecture', 'api', 'security'],
    priority: 'high',
    maxTokens: 2000,
  },
  forge: {
    sections: ['architecture', 'data', 'api', 'security'],
    priority: 'high',
    maxTokens: 3000,
  },
  sentinel: {
    sections: ['architecture', 'security'],
    priority: 'high',
    maxTokens: 1500,
  },
  atlas: {
    sections: ['architecture'],
    priority: 'medium',
    maxTokens: 1000,
  },

  // Design phase - inherit from ARCHON + design agents
  // Design agents get design tokens injected from design-token-provider
  palette: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
    designPreset: 'master', // Full tokens for master design agent
  },
  blocks: {
    sections: ['architecture', 'design'],
    priority: 'medium',
    maxTokens: 1500,
    designPreset: 'implementation', // Standard tokens for component design
  },
  wire: {
    sections: ['architecture', 'design', 'pages'],
    priority: 'medium',
    maxTokens: 2000,
    designPreset: 'supporting', // Compact tokens for wireframing
  },
  cartographer: {
    sections: ['architecture', 'security'],
    priority: 'medium',
    maxTokens: 1000,
    // No design preset - cartographer focuses on routing
  },

  // Frontend phase - full context
  pixel: {
    sections: ['architecture', 'design', 'data', 'api', 'pages'],
    priority: 'high',
    maxTokens: 4000,
    designPreset: 'implementation', // Standard tokens for frontend implementation
  },
  polish: {
    sections: ['architecture', 'design', 'pages'],
    priority: 'medium',
    maxTokens: 2000,
    designPreset: 'implementation', // Tokens for refinement work
  },
  flow: {
    sections: ['design'],
    priority: 'low',
    maxTokens: 500,
    designPreset: 'supporting', // Compact tokens for animation/flow
  },
  grid: {
    sections: ['design'],
    priority: 'low',
    maxTokens: 500,
    designPreset: 'supporting', // Compact tokens for layout
  },

  // Backend phase
  engine: {
    sections: ['architecture', 'data', 'api'],
    priority: 'high',
    maxTokens: 2500,
  },
  gateway: {
    sections: ['architecture', 'api', 'security'],
    priority: 'high',
    maxTokens: 2000,
  },
  keeper: {
    sections: ['architecture', 'data'],
    priority: 'medium',
    maxTokens: 1500,
  },
  cron: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },

  // Integration phase
  bridge: {
    sections: ['architecture', 'api', 'security'],
    priority: 'high',
    maxTokens: 2000,
  },
  sync: {
    sections: ['architecture', 'api'],
    priority: 'medium',
    maxTokens: 1500,
  },
  notify: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },
  search: {
    sections: ['architecture', 'data'],
    priority: 'medium',
    maxTokens: 1000,
  },

  // Testing phase
  junit: {
    sections: ['architecture', 'data', 'api'],
    priority: 'medium',
    maxTokens: 2000,
  },
  cypress: {
    sections: ['architecture', 'pages'],
    priority: 'medium',
    maxTokens: 1500,
  },
  load: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },
  a11y: {
    sections: ['architecture', 'design'],
    priority: 'low',
    maxTokens: 500,
  },

  // Deployment phase
  docker: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },
  pipeline: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },
  monitor: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },
  scale: {
    sections: ['architecture'],
    priority: 'low',
    maxTokens: 500,
  },

  // Discovery phase additions
  venture: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },

  // Discovery phase - no injection needed
  oracle: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },
  empathy: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },
  strategos: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },
  scope: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },

  // Design phase - ARTIST for image prompt generation
  artist: {
    sections: ['design'],
    priority: 'low',
    maxTokens: 500,
    designPreset: 'supporting', // Compact tokens for image prompt generation
  },

  // ARCHON itself doesn't need injection
  archon: {
    sections: [],
    priority: 'low',
    maxTokens: 0,
  },
};

/**
 * Default config for unknown agents
 */
const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
  sections: ['architecture'],
  priority: 'medium',
  maxTokens: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of constraint injection
 */
export interface InjectionResult {
  /** The formatted constraint text to inject */
  constraintText: string;
  /** Estimated token count */
  estimatedTokens: number;
  /** Which sections were included */
  sectionsIncluded: string[];
  /** Whether injection was truncated */
  truncated: boolean;
  /** The agent that received injection */
  targetAgent: AgentId;
  /** Design tokens context (if applicable) */
  designContext?: DesignContext;
}

/**
 * Check if an agent needs constraint injection
 */
export function needsConstraintInjection(agentId: AgentId): boolean {
  const config = INJECTION_CONFIG[agentId] || DEFAULT_INJECTION_CONFIG;
  return config.sections.length > 0 && config.maxTokens > 0;
}

/**
 * Get injection priority for an agent
 */
export function getInjectionPriority(agentId: AgentId): 'high' | 'medium' | 'low' {
  const config = INJECTION_CONFIG[agentId] || DEFAULT_INJECTION_CONFIG;
  return config.priority;
}

/**
 * Feature checklist item from STRATEGOS
 */
export interface FeatureChecklistItem {
  id: string;
  name: string;
  description: string;
  acceptanceCriteria?: string[];
  assignedTo?: string;
}

/**
 * Feature checklist from STRATEGOS
 */
export interface FeatureChecklist {
  critical?: FeatureChecklistItem[];
  important?: FeatureChecklistItem[];
  niceToHave?: Array<{ id: string; name: string; description: string }>;
}

/**
 * Agent outputs from previous phases
 */
export interface AgentOutputs {
  palette?: {
    colors?: {
      primary?: Record<string, string>;
      secondary?: Record<string, string>;
      accent?: Record<string, string>;
      background?: { default?: string; subtle?: string; muted?: string };
      surface?: Record<string, string>;
      foreground?: { default?: string; muted?: string; subtle?: string };
      border?: { default?: string; subtle?: string };
      semantic?: {
        success?: Record<string, string>;
        warning?: Record<string, string>;
        error?: Record<string, string>;
        info?: Record<string, string>;
      };
    };
    typography?: {
      fontFamily?: { sans?: string; mono?: string; display?: string };
      fontWeight?: Record<string, number>;
      lineHeight?: Record<string, string>;
    };
    spacing?: Record<string, string>;
    borderRadius?: Record<string, string>;
    shadows?: Record<string, string>;
    motion?: { duration?: Record<string, string>; easing?: Record<string, string> };
  };
  blocks?: {
    components?: Array<{
      name: string;
      variants: string[];
      states: string[];
    }>;
  };
  strategos?: {
    featureChecklist?: FeatureChecklist;
    mvp_features?: Array<{ name: string; priority: string }>;
  };
  [key: string]: unknown;
}

/**
 * Build constraint injection for an agent
 */
export function buildConstraintInjection(
  agentId: AgentId,
  decisions: CriticalDecisions,
  userRequest?: string,
  agentOutputs?: AgentOutputs
): InjectionResult {
  const config = INJECTION_CONFIG[agentId] || DEFAULT_INJECTION_CONFIG;

  // Skip if no injection needed
  if (config.sections.length === 0 || config.maxTokens === 0) {
    return {
      constraintText: '',
      estimatedTokens: 0,
      sectionsIncluded: [],
      truncated: false,
      targetAgent: agentId,
    };
  }

  // Use custom formatter if provided
  if (config.customFormatter) {
    const text = config.customFormatter(decisions);
    const truncated = truncateToTokens(text, config.maxTokens);
    return {
      constraintText: truncated.text,
      estimatedTokens: truncated.tokens,
      sectionsIncluded: config.sections,
      truncated: truncated.wasTruncated,
      targetAgent: agentId,
    };
  }

  // Build constraint text from sections
  const sections: string[] = [];
  const sectionsIncluded: string[] = [];

  // Architecture section (always first if included)
  if (config.sections.includes('architecture')) {
    sections.push(formatDecisionsForPrompt(decisions.architecture));
    sectionsIncluded.push('architecture');
  }

  // Use the full formatter for other sections
  const fullText = formatCriticalDecisionsForPrompt(decisions, agentId);

  // Add header
  const header = `
═══════════════════════════════════════════════════════════════════════════════
UPSTREAM CONSTRAINTS - THESE ARE MANDATORY
═══════════════════════════════════════════════════════════════════════════════

The following constraints come from upstream agents (ARCHON, DATUM, etc.).
You MUST follow these decisions. Do NOT contradict them.

`;

  let constraintText = header + (sections.length > 0 ? sections.join('\n\n') : fullText);

  // Inject design tokens if agent has a design preset
  let designContext: DesignContext | undefined;
  if (config.designPreset) {
    designContext = getAgentDesignContext(config.designPreset, userRequest);
    constraintText += '\n\n' + designContext.context;
    sectionsIncluded.push('designTokens');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PIXEL SPECIAL: Inject actual PALETTE output tokens
  // ═══════════════════════════════════════════════════════════════════════════════
  if (agentId === 'pixel' && agentOutputs?.palette) {
    const paletteOutput = agentOutputs.palette;

    constraintText += `\n\n## 🎨 PALETTE DESIGN TOKENS (MUST USE - NEVER HARDCODE)\n\n`;
    constraintText += `**CRITICAL:** These tokens were generated by PALETTE specifically for this project.\n`;
    constraintText += `Use Tailwind classes mapped to these tokens. NEVER hardcode hex values.\n\n`;

    // Colors
    if (paletteOutput.colors) {
      constraintText += `### Color Tokens\n`;
      constraintText += `\`\`\`\n`;

      // Primary palette
      if (paletteOutput.colors.primary) {
        constraintText += `primary:\n`;
        Object.entries(paletteOutput.colors.primary).forEach(([shade, value]) => {
          constraintText += `  ${shade}: "${value}" → use: bg-primary-${shade}, text-primary-${shade}\n`;
        });
      }

      // Secondary palette
      if (paletteOutput.colors.secondary) {
        constraintText += `secondary:\n`;
        Object.entries(paletteOutput.colors.secondary).forEach(([shade, value]) => {
          constraintText += `  ${shade}: "${value}" → use: bg-secondary-${shade}, text-secondary-${shade}\n`;
        });
      }

      // Accent palette
      if (paletteOutput.colors.accent) {
        constraintText += `accent:\n`;
        Object.entries(paletteOutput.colors.accent).forEach(([shade, value]) => {
          constraintText += `  ${shade}: "${value}" → use: bg-accent-${shade}, text-accent-${shade}\n`;
        });
      }

      // Background
      if (paletteOutput.colors.background) {
        constraintText += `background:\n`;
        constraintText += `  default: "${paletteOutput.colors.background.default || '#0A0A0B'}" → use: bg-background\n`;
        constraintText += `  subtle: "${paletteOutput.colors.background.subtle || '#111113'}" → use: bg-background-subtle\n`;
        constraintText += `  muted: "${paletteOutput.colors.background.muted || '#1a1a1d'}" → use: bg-background-muted\n`;
      }

      // Surface
      if (paletteOutput.colors.surface) {
        constraintText += `surface:\n`;
        Object.entries(paletteOutput.colors.surface).forEach(([shade, value]) => {
          constraintText += `  ${shade}: "${value}" → use: bg-surface-${shade}\n`;
        });
      }

      // Foreground
      if (paletteOutput.colors.foreground) {
        constraintText += `foreground:\n`;
        constraintText += `  default: "${paletteOutput.colors.foreground.default || '#fafafa'}" → use: text-foreground\n`;
        constraintText += `  muted: "${paletteOutput.colors.foreground.muted || '#a1a1aa'}" → use: text-muted-foreground\n`;
        constraintText += `  subtle: "${paletteOutput.colors.foreground.subtle || '#71717a'}" → use: text-subtle\n`;
      }

      // Semantic colors
      if (paletteOutput.colors.semantic) {
        constraintText += `semantic:\n`;
        if (paletteOutput.colors.semantic.success) {
          constraintText += `  success: "${paletteOutput.colors.semantic.success['500'] || '#22c55e'}" → use: text-success, bg-success\n`;
        }
        if (paletteOutput.colors.semantic.warning) {
          constraintText += `  warning: "${paletteOutput.colors.semantic.warning['500'] || '#f59e0b'}" → use: text-warning, bg-warning\n`;
        }
        if (paletteOutput.colors.semantic.error) {
          constraintText += `  error: "${paletteOutput.colors.semantic.error['500'] || '#ef4444'}" → use: text-destructive, bg-destructive\n`;
        }
        if (paletteOutput.colors.semantic.info) {
          constraintText += `  info: "${paletteOutput.colors.semantic.info['500'] || '#3b82f6'}" → use: text-info, bg-info\n`;
        }
      }

      constraintText += `\`\`\`\n\n`;
    }

    // Typography
    if (paletteOutput.typography) {
      constraintText += `### Typography Tokens\n`;
      constraintText += `\`\`\`\n`;
      if (paletteOutput.typography.fontFamily) {
        constraintText += `fontFamily:\n`;
        constraintText += `  sans: "${paletteOutput.typography.fontFamily.sans || 'Inter, system-ui'}" → use: font-sans\n`;
        constraintText += `  mono: "${paletteOutput.typography.fontFamily.mono || 'JetBrains Mono'}" → use: font-mono\n`;
        constraintText += `  display: "${paletteOutput.typography.fontFamily.display || 'Inter'}" → use: font-display\n`;
      }
      constraintText += `\`\`\`\n\n`;
    }

    // Border Radius
    if (paletteOutput.borderRadius) {
      constraintText += `### Border Radius Tokens\n`;
      constraintText += `\`\`\`\n`;
      Object.entries(paletteOutput.borderRadius).forEach(([size, value]) => {
        constraintText += `${size}: "${value}" → use: rounded-${size}\n`;
      });
      constraintText += `\`\`\`\n\n`;
    }

    // Shadows
    if (paletteOutput.shadows) {
      constraintText += `### Shadow Tokens\n`;
      constraintText += `\`\`\`\n`;
      Object.entries(paletteOutput.shadows).forEach(([size, value]) => {
        constraintText += `${size}: "${value}" → use: shadow-${size}\n`;
      });
      constraintText += `\`\`\`\n\n`;
    }

    // Motion
    if (paletteOutput.motion) {
      constraintText += `### Motion Tokens\n`;
      constraintText += `\`\`\`\n`;
      if (paletteOutput.motion.duration) {
        constraintText += `duration:\n`;
        Object.entries(paletteOutput.motion.duration).forEach(([speed, value]) => {
          constraintText += `  ${speed}: "${value}" → use: duration-${speed}\n`;
        });
      }
      if (paletteOutput.motion.easing) {
        constraintText += `easing:\n`;
        Object.entries(paletteOutput.motion.easing).forEach(([name, value]) => {
          constraintText += `  ${name}: "${value}"\n`;
        });
      }
      constraintText += `\`\`\`\n\n`;
    }

    constraintText += `\n**ENFORCEMENT:** Any hardcoded color will be rejected. Use the Tailwind classes above.\n`;
    sectionsIncluded.push('paletteTokens');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STRATEGOS FEATURE CHECKLIST INJECTION (for PIXEL and WIRE)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (['pixel', 'wire'].includes(agentId) && agentOutputs?.strategos?.featureChecklist) {
    const checklist = agentOutputs.strategos.featureChecklist;

    constraintText += `\n\n## 🎯 MANDATORY FEATURE CHECKLIST (FROM STRATEGOS)\n\n`;
    constraintText += `These features are REQUIRED. Your output will be REJECTED if any critical feature is missing.\n`;
    constraintText += `Each feature has acceptance criteria - your code must satisfy ALL of them.\n\n`;

    // Critical features (MUST implement)
    if (checklist.critical && checklist.critical.length > 0) {
      constraintText += `### 🔴 CRITICAL FEATURES (Must Implement - Build Fails Without)\n\n`;

      for (const feature of checklist.critical) {
        // Only show features assigned to this agent, or pixel by default
        if (
          !feature.assignedTo ||
          feature.assignedTo === agentId ||
          feature.assignedTo === 'pixel'
        ) {
          constraintText += `#### ${feature.name} (\`${feature.id}\`)\n`;
          constraintText += `${feature.description}\n\n`;
          constraintText += `**Acceptance Criteria:**\n`;

          if (feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0) {
            for (const criteria of feature.acceptanceCriteria) {
              constraintText += `- [ ] ${criteria}\n`;
            }
          } else {
            constraintText += `- [ ] Feature is fully functional\n`;
          }
          constraintText += `\n`;
        }
      }
    }

    // Important features (SHOULD implement)
    if (checklist.important && checklist.important.length > 0) {
      constraintText += `### 🟡 IMPORTANT FEATURES (Should Implement - Quality Suffers Without)\n\n`;

      for (const feature of checklist.important) {
        if (
          !feature.assignedTo ||
          feature.assignedTo === agentId ||
          feature.assignedTo === 'pixel'
        ) {
          constraintText += `- **${feature.name}**: ${feature.description}\n`;
          if (feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0) {
            for (const criteria of feature.acceptanceCriteria) {
              constraintText += `  - ${criteria}\n`;
            }
          }
        }
      }
      constraintText += `\n`;
    }

    // Nice to have (optional)
    if (checklist.niceToHave && checklist.niceToHave.length > 0) {
      constraintText += `### 🟢 NICE TO HAVE (Optional Enhancements)\n\n`;

      for (const feature of checklist.niceToHave) {
        constraintText += `- ${feature.name}: ${feature.description}\n`;
      }
      constraintText += `\n`;
    }

    constraintText += `\n⚠️ **ENFORCEMENT:** Your code will be validated against this checklist.\n`;
    constraintText += `Missing any CRITICAL feature = AUTOMATIC REJECTION.\n`;
    constraintText += `Partial CRITICAL feature (not all criteria met) = WARNING + potential rejection.\n`;

    sectionsIncluded.push('featureChecklist');
  }

  // Truncate if needed
  const truncated = truncateToTokens(constraintText, config.maxTokens);

  return {
    constraintText: truncated.text,
    estimatedTokens: truncated.tokens,
    sectionsIncluded,
    truncated: truncated.wasTruncated,
    targetAgent: agentId,
    designContext,
  };
}

/**
 * Truncate text to approximate token limit
 */
function truncateToTokens(
  text: string,
  maxTokens: number
): {
  text: string;
  tokens: number;
  wasTruncated: boolean;
} {
  const CHARS_PER_TOKEN = 4;
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const currentTokens = Math.ceil(text.length / CHARS_PER_TOKEN);

  if (text.length <= maxChars) {
    return { text, tokens: currentTokens, wasTruncated: false };
  }

  // Truncate and add notice
  const truncatedText =
    text.substring(0, maxChars - 100) + '\n\n[... constraints truncated for token limit ...]';

  return {
    text: truncatedText,
    tokens: maxTokens,
    wasTruncated: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ENHANCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Position for constraint injection in prompt
 */
export type InjectionPosition = 'system_start' | 'system_end' | 'user_context';

/**
 * Get recommended injection position based on priority
 */
export function getInjectionPosition(priority: 'high' | 'medium' | 'low'): InjectionPosition {
  switch (priority) {
    case 'high':
      return 'system_start'; // Before agent's own system prompt
    case 'medium':
      return 'system_end'; // After agent's system prompt
    case 'low':
      return 'user_context'; // In user message context
  }
}

/**
 * Enhance agent input with constraint injection
 */
export function enhanceInputWithConstraints(
  input: AgentInput,
  decisions: CriticalDecisions,
  definition: AgentDefinition,
  userRequest?: string,
  agentOutputs?: AgentOutputs
): {
  enhancedInput: AgentInput;
  injection: InjectionResult;
} {
  // Extract user request from input if not provided
  // Check userFeedback, context.description, and context.designPreferences
  const request =
    userRequest ||
    input.userFeedback ||
    input.context?.designPreferences ||
    input.context?.description;
  const injection = buildConstraintInjection(definition.id, decisions, request, agentOutputs);

  // If no injection needed, return unchanged
  if (!injection.constraintText) {
    return { enhancedInput: input, injection };
  }

  // Clone input to avoid mutation
  const enhancedInput = { ...input };

  // Add constraints to input's constraints field
  if (!enhancedInput.constraints) {
    enhancedInput.constraints = {};
  }

  // Store the constraint text for prompt builder to use
  // Design context is embedded in upstreamConstraints as formatted text
  enhancedInput.constraints.upstreamConstraints = injection.constraintText;

  return { enhancedInput, injection };
}

/**
 * Enhance system prompt with constraints
 */
export function enhanceSystemPrompt(
  systemPrompt: string,
  constraints: string,
  position: InjectionPosition
): string {
  if (!constraints) return systemPrompt;

  switch (position) {
    case 'system_start':
      return constraints + '\n\n' + systemPrompt;

    case 'system_end':
      return systemPrompt + '\n\n' + constraints;

    case 'user_context':
      // Don't modify system prompt; constraints go in user message
      return systemPrompt;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the upstream agents that provide constraints for a target agent
 */
export function getConstraintSources(targetAgent: AgentId): AgentId[] {
  const config = INJECTION_CONFIG[targetAgent] || DEFAULT_INJECTION_CONFIG;
  const sources: AgentId[] = [];

  // Map sections to source agents
  if (config.sections.includes('architecture')) {
    sources.push('archon');
  }
  if (config.sections.includes('design')) {
    sources.push('palette', 'blocks', 'wire');
  }
  if (config.sections.includes('data')) {
    sources.push('datum');
  }
  if (config.sections.includes('api')) {
    sources.push('nexus');
  }
  if (config.sections.includes('security')) {
    sources.push('sentinel');
  }
  if (config.sections.includes('pages')) {
    sources.push('cartographer');
  }

  return Array.from(new Set(sources)); // Remove duplicates
}

/**
 * Check if all required constraint sources have completed
 */
export function hasRequiredConstraints(
  targetAgent: AgentId,
  completedAgents: Set<AgentId>
): boolean {
  const config = INJECTION_CONFIG[targetAgent] || DEFAULT_INJECTION_CONFIG;

  // No constraints needed
  if (config.sections.length === 0) return true;

  // Convert Set to Array for compatibility
  const completedArray = Array.from(completedAgents);

  // Architecture is always required if in sections
  if (config.sections.includes('architecture') && !completedArray.includes('archon')) {
    return false;
  }

  // For high priority agents, require all sources
  if (config.priority === 'high') {
    const sources = getConstraintSources(targetAgent);
    return sources.every(s => completedArray.includes(s));
  }

  // For medium/low, at least architecture is enough
  return true;
}

/**
 * Get missing constraint sources for an agent
 */
export function getMissingConstraints(
  targetAgent: AgentId,
  completedAgents: Set<AgentId>
): AgentId[] {
  const sources = getConstraintSources(targetAgent);
  const completedArray = Array.from(completedAgents);
  return sources.filter(s => !completedArray.includes(s));
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validation error for constraint violations
 */
export interface ConstraintViolation {
  agentId: AgentId;
  constraint: string;
  violation: string;
  severity: 'error' | 'warning';
}

/**
 * Validate agent output against constraints
 * (Used post-execution to ensure agent followed constraints)
 */
export function validateAgainstConstraints(
  agentId: AgentId,
  output: unknown,
  decisions: CriticalDecisions
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  if (!output || typeof output !== 'object') {
    return violations;
  }

  const obj = output as Record<string, unknown>;

  // Check multi-tenancy compliance for DATUM
  if (agentId === 'datum' && decisions.architecture.isMultiTenant) {
    const tables = (obj.tables || []) as Array<Record<string, unknown>>;
    for (const table of tables) {
      const columns = (table.columns || []) as Array<Record<string, unknown>>;
      const hasTenantId = columns.some(c => c.name === 'tenantId');

      // Check if table should be tenant-scoped
      const tableName = table.name as string;
      const isGlobalTable = ['plans', 'features', 'system_settings'].includes(tableName);

      if (!hasTenantId && !isGlobalTable) {
        violations.push({
          agentId,
          constraint: 'Multi-tenancy enabled',
          violation: `Table "${tableName}" missing tenantId column`,
          severity: 'error',
        });
      }
    }
  }

  // Check soft delete compliance
  if (agentId === 'datum' && decisions.architecture.softDeletes) {
    const tables = (obj.tables || []) as Array<Record<string, unknown>>;
    for (const table of tables) {
      const columns = (table.columns || []) as Array<Record<string, unknown>>;
      const hasDeletedAt = columns.some(c => c.name === 'deletedAt');

      if (!hasDeletedAt) {
        violations.push({
          agentId,
          constraint: 'Soft deletes enabled',
          violation: `Table "${table.name}" missing deletedAt column`,
          severity: 'warning',
        });
      }
    }
  }

  // Check ID strategy compliance
  if (agentId === 'datum') {
    const tables = (obj.tables || []) as Array<Record<string, unknown>>;
    for (const table of tables) {
      const columns = (table.columns || []) as Array<Record<string, unknown>>;
      const idColumn = columns.find(c => c.name === 'id') as Record<string, unknown> | undefined;

      if (idColumn) {
        const defaultValue = (idColumn.default || '') as string;
        const expectedStrategy = decisions.architecture.idStrategy;

        if (!defaultValue.includes(expectedStrategy)) {
          violations.push({
            agentId,
            constraint: `ID strategy: ${expectedStrategy}`,
            violation: `Table "${table.name}" uses wrong ID strategy: ${defaultValue}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Check API base path compliance for NEXUS
  if (agentId === 'nexus') {
    const endpoints = (obj.endpoints || []) as Array<Record<string, unknown>>;
    const basePath = decisions.architecture.apiBasePath;

    for (const endpoint of endpoints) {
      const path = endpoint.path as string;
      if (path && !path.startsWith(basePath)) {
        violations.push({
          agentId,
          constraint: `API base path: ${basePath}`,
          violation: `Endpoint "${path}" doesn't use correct base path`,
          severity: 'warning',
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIX #4: Extended validation for more agents
  // ═══════════════════════════════════════════════════════════════════════════════

  // PIXEL - Design token compliance
  if (agentId === 'pixel' && decisions.design) {
    const components = (obj.components || []) as Array<Record<string, unknown>>;
    const designTokens = decisions.design.colorTokens || [];

    for (const component of components) {
      const styles = (component.styles || {}) as Record<string, string>;
      const componentName = component.name as string;

      // Check for hardcoded hex colors when design tokens exist
      if (designTokens.length > 0) {
        for (const [prop, value] of Object.entries(styles)) {
          if (typeof value === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(value)) {
            violations.push({
              agentId,
              constraint: 'Use design tokens for colors',
              violation: `Component "${componentName}" has hardcoded color "${value}" in ${prop}`,
              severity: 'warning',
            });
          }
        }
      }
    }
  }

  // FORGE - Multi-tenant query compliance
  if (agentId === 'forge' && decisions.architecture.isMultiTenant) {
    const files = (obj.files || []) as Array<Record<string, unknown>>;

    for (const file of files) {
      const content = (file.content as string) || '';
      const filePath = (file.path as string) || '';

      // Check for database queries without tenant filtering
      if (filePath.includes('queries') || filePath.includes('repository')) {
        const hasQuery =
          content.includes('findMany') ||
          content.includes('findFirst') ||
          content.includes('SELECT') ||
          content.includes('query(');
        const hasTenantFilter =
          content.includes('tenantId') ||
          content.includes('tenant_id') ||
          content.includes('organizationId');

        if (hasQuery && !hasTenantFilter) {
          violations.push({
            agentId,
            constraint: 'Multi-tenant queries must filter by tenant',
            violation: `File "${filePath}" has queries without tenant filtering`,
            severity: 'error',
          });
        }
      }
    }
  }

  // SENTINEL - Auth strategy alignment
  if (agentId === 'sentinel') {
    const authConfig = obj.auth_config as Record<string, unknown> | undefined;
    if (authConfig) {
      const strategy = authConfig.strategy as string;
      const expectedStrategy = decisions.architecture.authStrategy;

      if (strategy && expectedStrategy && strategy !== expectedStrategy) {
        violations.push({
          agentId,
          constraint: `Auth strategy: ${expectedStrategy}`,
          violation: `SENTINEL uses "${strategy}" but ARCHON specified "${expectedStrategy}"`,
          severity: 'error',
        });
      }
    }
  }

  // ENGINE - Transaction and data access patterns
  if (agentId === 'engine') {
    const services = (obj.services || []) as Array<Record<string, unknown>>;

    for (const service of services) {
      const methods = (service.methods || []) as string[];
      const usesTransaction = service.usesTransaction as boolean;
      const serviceName = service.name as string;

      // Mutation operations should use transactions
      const hasMutations = methods.some(m =>
        ['create', 'update', 'delete', 'upsert', 'remove'].includes(m)
      );

      if (hasMutations && !usesTransaction) {
        violations.push({
          agentId,
          constraint: 'Mutation operations should use transactions',
          violation: `Service "${serviceName}" has mutations without transaction support`,
          severity: 'warning',
        });
      }

      // Multi-tenant services must include tenant context
      if (decisions.architecture.isMultiTenant) {
        const hasTenantContext =
          service.tenantAware === true ||
          ((service.parameters as string[]) || []).includes('tenantId');
        if (!hasTenantContext) {
          violations.push({
            agentId,
            constraint: 'Services must be tenant-aware',
            violation: `Service "${serviceName}" missing tenant context in multi-tenant app`,
            severity: 'error',
          });
        }
      }
    }
  }

  // GATEWAY - API authentication enforcement
  if (agentId === 'gateway') {
    const routes = (obj.routes || []) as Array<Record<string, unknown>>;

    for (const route of routes) {
      const path = route.path as string;
      const isPublic = route.public === true;
      const hasAuth = route.middleware?.toString().includes('auth') || route.auth === true;

      // Non-public routes should have auth middleware
      if (
        !isPublic &&
        !hasAuth &&
        path &&
        !path.includes('/public/') &&
        !path.includes('/health')
      ) {
        violations.push({
          agentId,
          constraint: 'Protected routes must have authentication',
          violation: `Route "${path}" missing authentication middleware`,
          severity: 'warning',
        });
      }
    }
  }

  // CARTOGRAPHER - Page structure tenant awareness
  if (agentId === 'cartographer' && decisions.architecture.isMultiTenant) {
    const pages = (obj.pages || []) as Array<Record<string, unknown>>;

    for (const page of pages) {
      const pageName = page.name as string;
      const dataSource = page.dataSource as string;

      // Tenant-scoped pages should filter data
      if (
        dataSource &&
        !dataSource.includes('tenant') &&
        !['login', 'signup', 'public', 'landing', 'pricing'].some(p =>
          pageName.toLowerCase().includes(p)
        )
      ) {
        violations.push({
          agentId,
          constraint: 'Data sources must be tenant-scoped',
          violation: `Page "${pageName}" data source may not be tenant-filtered`,
          severity: 'warning',
        });
      }
    }
  }

  // BLOCKS - Component design system compliance
  if (agentId === 'blocks' && decisions.design) {
    const components = (obj.components || []) as Array<Record<string, unknown>>;

    for (const component of components) {
      const componentName = component.name as string;
      const variants = (component.variants || []) as string[];

      // Check for consistent variant naming
      const expectedVariants = decisions.design.componentVariants || [];
      if (expectedVariants.length > 0 && variants.length > 0) {
        const missingVariants = expectedVariants.filter(v => !variants.includes(v));
        if (missingVariants.length > 0) {
          violations.push({
            agentId,
            constraint: 'Components should use standard variants',
            violation: `Component "${componentName}" missing variants: ${missingVariants.join(', ')}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX BARREL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create index file for coordination module
 */
export const coordinationIndex = `
// Re-export all coordination types and functions
export * from './archon-schema-upgrade';
export * from './critical-summarizer';
export * from './constraint-injector';
`;

// Types are already exported at definition - no need for re-export

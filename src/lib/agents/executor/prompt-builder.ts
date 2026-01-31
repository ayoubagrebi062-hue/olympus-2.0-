/**
 * OLYMPUS 2.1 - Agent Prompt Builder
 *
 * Enhanced with:
 * - Semantic example retrieval from Qdrant
 * - 50X Coordination Upgrade: Constraint injection from ARCHON
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type { AgentId, AgentInput, AgentDefinition, AgentOutput } from '../types';
import type { ChatMessage } from '../providers/types';
import { getAgent } from '../registry';
import { buildContextSummary } from '../context';
import { searchExamples } from '../../examples';
import {
  needsConstraintInjection,
  getInjectionPriority,
  getInjectionPosition,
  enhanceSystemPrompt,
} from '../coordination';
import type { SpecRequirements, PageRequirement, ComponentRequirement } from '../spec/types';

// ═══════════════════════════════════════════════════════════════
// 7 UNBREAKABLE CODE QUALITY RULES
// Injected into EVERY agent prompt to ensure world-class output
// ═══════════════════════════════════════════════════════════════

const CODE_QUALITY_RULES = `
## MANDATORY CODE QUALITY RULES (7 UNBREAKABLE LAWS)

EVERY code you generate MUST follow these rules. Violations will be REJECTED.

### RULE 1: NO DEAD BUTTONS
Every <button> MUST have an onClick handler. NO exceptions.
\`\`\`tsx
// BANNED - Will be rejected
<button className="btn">Click Me</button>

// REQUIRED - Always
<button onClick={handleClick} className="btn">Click Me</button>
\`\`\`

### RULE 2: NO PLACEHOLDER LINKS
href="#" is BANNED FOREVER. href="" is BANNED FOREVER.
\`\`\`tsx
// BANNED
<a href="#">Learn More</a>

// REQUIRED - Real route or button with feedback
<Link href="/contact">Contact</Link>
// OR
<button onClick={() => toast.success('Coming soon!')}>Contact</button>
\`\`\`

### RULE 3: NO MOCK HANDLERS
console.log() is NOT a form handler. alert() is BANNED.
\`\`\`tsx
// BANNED
const handleSubmit = () => {
  console.log('submitted');
  alert('Thanks!');
};

// REQUIRED - Proper async with feedback
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitForm(data);
    toast.success('Successfully submitted!');
  } catch (err) {
    toast.error('Error occurred. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
\`\`\`

### RULE 4: ALL ASYNC NEEDS TRY/CATCH
Every await, fetch, navigator.clipboard MUST have error handling.
\`\`\`tsx
// BANNED
await navigator.clipboard.writeText(text);

// REQUIRED
try {
  await navigator.clipboard.writeText(text);
  toast.success('Copied!');
} catch (err) {
  toast.error('Failed to copy');
}
\`\`\`

### RULE 5: MODALS/DROPDOWNS MUST CLOSE
Every modal closes on Escape key. Every dropdown closes on outside click.

### RULE 6: ALL INPUTS MUST BE CONTROLLED
Every <input> needs value + onChange. Every <select> needs value + onChange.
\`\`\`tsx
// BANNED
<input type="text" placeholder="Email" />

// REQUIRED
const [email, setEmail] = useState('');
<input value={email} onChange={(e) => setEmail(e.target.value)} />
\`\`\`

### RULE 7: LOADING STATES PREVENT DOUBLE-SUBMIT
All buttons with async operations MUST show loading state and be disabled.
\`\`\`tsx
const [isLoading, setIsLoading] = useState(false);
<button onClick={handleClick} disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
\`\`\`

CRITICAL: If you generate code that violates ANY of these rules, your output will be REJECTED by the quality gate.
`;

// ═══════════════════════════════════════════════════════════════
// EXAMPLE RETRIEVAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface ExampleConfig {
  enabled: boolean;
  maxExamples: number;
  minQuality: number;
  fileTypes: Array<'component' | 'schema' | 'api' | 'pattern'>;
}

const PHASE_EXAMPLE_CONFIG: Record<string, ExampleConfig> = {
  frontend: {
    enabled: true,
    maxExamples: 3,
    minQuality: 4,
    fileTypes: ['component'],
  },
  backend: {
    enabled: true,
    maxExamples: 3,
    minQuality: 4,
    fileTypes: ['api', 'schema'],
  },
  architecture: {
    enabled: true,
    maxExamples: 2,
    minQuality: 4,
    fileTypes: ['schema', 'pattern'],
  },
  design: {
    enabled: true,
    maxExamples: 2,
    minQuality: 4,
    fileTypes: ['component', 'pattern'],
  },
  integration: {
    enabled: true,
    maxExamples: 2,
    minQuality: 4,
    fileTypes: ['api', 'pattern'],
  },
  testing: {
    enabled: false,
    maxExamples: 0,
    minQuality: 4,
    fileTypes: [],
  },
  deployment: {
    enabled: false,
    maxExamples: 0,
    minQuality: 4,
    fileTypes: [],
  },
  discovery: {
    enabled: false,
    maxExamples: 0,
    minQuality: 4,
    fileTypes: [],
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE RETRIEVAL
// ═══════════════════════════════════════════════════════════════

interface RetrievedExample {
  name: string;
  description: string;
  codePreview: string;
  fileType: string;
  category: string;
  tags: string[];
  similarity: number;
}

/**
 * Fetch relevant examples for an agent based on its phase and task
 */
async function fetchRelevantExamples(
  definition: AgentDefinition,
  input: AgentInput
): Promise<RetrievedExample[]> {
  const config = PHASE_EXAMPLE_CONFIG[definition.phase];

  if (!config?.enabled || config.maxExamples === 0) {
    return [];
  }

  try {
    // Build search query from agent context
    const searchQuery = buildExampleSearchQuery(definition, input);

    // Search for relevant examples
    const results = await searchExamples(searchQuery, {
      limit: config.maxExamples,
      minQuality: config.minQuality,
    });

    // Filter by allowed file types
    const filtered = results.filter(r => config.fileTypes.includes(r.fileType as any));

    return filtered;
  } catch (error) {
    // Example retrieval is optional - don't fail the build
    console.warn('[PromptBuilder] Example retrieval failed:', error);
    return [];
  }
}

/**
 * Build search query for example retrieval
 */
function buildExampleSearchQuery(definition: AgentDefinition, input: AgentInput): string {
  const parts: string[] = [];

  // Agent name and description
  parts.push(definition.name);
  parts.push(definition.description);

  // Tech stack constraints
  if (input.constraints?.techStack?.length) {
    parts.push(input.constraints.techStack.join(' '));
  }

  // Focus areas
  if (input.constraints?.focusAreas?.length) {
    parts.push(input.constraints.focusAreas.join(' '));
  }

  // User's original prompt (description)
  if (input.context.description) {
    parts.push(input.context.description);
  }

  return parts.join(' ').slice(0, 500); // Limit query length
}

/**
 * Format examples for injection into prompt
 */
function formatExamplesForPrompt(examples: RetrievedExample[]): string {
  if (examples.length === 0) {
    return '';
  }

  const formatted = examples
    .map((ex, i) => {
      return `### Example ${i + 1}: ${ex.name}
**Description:** ${ex.description}
**Type:** ${ex.fileType} / ${ex.category}
**Tags:** ${ex.tags.join(', ')}

\`\`\`
${ex.codePreview.slice(0, 1500)}
\`\`\``;
    })
    .join('\n\n');

  return `## Reference Examples

The following high-quality examples demonstrate patterns you should follow:

${formatted}

---
Study these examples carefully. Match their quality level, coding patterns, and structure.
`;
}

// ═══════════════════════════════════════════════════════════════
// SPEC REQUIREMENTS INJECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Code-generating agents that need spec injection
 */
const SPEC_INJECTION_AGENTS = ['pixel', 'wire', 'polish', 'forge', 'engine'];

/**
 * Format spec requirements for injection into agent prompts
 * This ensures agents generate ALL required pages and components
 */
export function formatSpecForPrompt(spec: SpecRequirements): string {
  const parts: string[] = [];

  parts.push(`## MANDATORY SPEC REQUIREMENTS (from specification)`);
  parts.push(`You MUST implement ALL of the following. Missing items = FAILED output.`);
  parts.push(``);

  // Pages section
  if (spec.pages.length > 0) {
    const criticalPages = spec.pages.filter(p => p.priority === 'P0');
    const otherPages = spec.pages.filter(p => p.priority !== 'P0');

    parts.push(`### Required Pages (${spec.pages.length} total)`);
    parts.push(``);

    if (criticalPages.length > 0) {
      parts.push(`**⚠️ CRITICAL PAGES (P0) - Must be generated:**`);
      for (const page of criticalPages) {
        parts.push(`- \`${page.path}\` → ${page.name} [${page.category}]`);
        parts.push(`  File: ${page.expectedFilePath}`);
        if (page.sections.length > 0) {
          parts.push(`  Sections: ${page.sections.join(', ')}`);
        }
      }
      parts.push(``);
    }

    if (otherPages.length > 0) {
      parts.push(`**Other Pages:**`);
      for (const page of otherPages) {
        parts.push(`- \`${page.path}\` → ${page.name} [${page.priority}]`);
      }
      parts.push(``);
    }
  }

  // Components section
  if (spec.components.length > 0) {
    const criticalComponents = spec.components.filter(c => c.critical);
    const otherComponents = spec.components.filter(c => !c.critical);

    parts.push(`### Required Components (${spec.components.length} total)`);
    parts.push(``);

    if (criticalComponents.length > 0) {
      parts.push(`**⚠️ CRITICAL COMPONENTS - Must be generated:**`);
      for (const comp of criticalComponents) {
        parts.push(`- ${comp.name} → ${comp.path} [${comp.category}]`);
        if (comp.variants.length > 0) {
          parts.push(`  Variants: ${comp.variants.join(', ')}`);
        }
      }
      parts.push(``);
    }

    if (otherComponents.length > 0) {
      parts.push(`**Other Components:**`);
      for (const comp of otherComponents.slice(0, 20)) {
        parts.push(`- ${comp.name} [${comp.category}]`);
      }
      if (otherComponents.length > 20) {
        parts.push(`  ... and ${otherComponents.length - 20} more components`);
      }
      parts.push(``);
    }
  }

  // Design system
  const { designSystem } = spec;
  if (Object.keys(designSystem.colors).length > 0 || designSystem.glassmorphism) {
    parts.push(`### Design System (MANDATORY)`);
    parts.push(``);

    if (Object.keys(designSystem.colors).length > 0) {
      parts.push(`**Colors:**`);
      const colorEntries = Object.entries(designSystem.colors).slice(0, 10);
      for (const [name, value] of colorEntries) {
        parts.push(`- ${name}: ${value}`);
      }
    }

    if (designSystem.glassmorphism) {
      parts.push(``);
      parts.push(`**Glassmorphism: REQUIRED for all cards**`);
      parts.push(`- Background: ${designSystem.glassmorphism.background}`);
      parts.push(`- Backdrop: ${designSystem.glassmorphism.backdropFilter}`);
      parts.push(`- Border: ${designSystem.glassmorphism.border}`);
    }

    parts.push(``);
  }

  // Tech stack
  parts.push(`### Tech Stack`);
  parts.push(`- Framework: ${spec.techStack.framework}`);
  parts.push(`- Language: ${spec.techStack.language}`);
  parts.push(`- Styling: ${spec.techStack.styling}`);
  if (spec.techStack.componentLibrary) {
    parts.push(`- Components: ${spec.techStack.componentLibrary}`);
  }
  if (spec.techStack.animationLibrary) {
    parts.push(`- Animations: ${spec.techStack.animationLibrary}`);
  }
  parts.push(``);

  parts.push(`---`);
  parts.push(`⚠️ OUTPUT WILL BE VALIDATED: Missing critical pages/components will FAIL the build.`);

  return parts.join('\n');
}

/**
 * Check if agent should receive spec injection
 */
function shouldInjectSpec(agentId: string): boolean {
  return SPEC_INJECTION_AGENTS.includes(agentId.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDING
// ═══════════════════════════════════════════════════════════════

/** Build complete prompt for agent (sync version for backwards compatibility) */
export function buildAgentPrompt(
  input: AgentInput,
  definition: AgentDefinition
): { systemPrompt: string; messages: ChatMessage[] } {
  const systemPrompt = buildSystemPrompt(definition, input);
  const messages = buildMessages(input, definition);

  return { systemPrompt, messages };
}

/** Build complete prompt for agent with example injection */
export async function buildAgentPromptWithExamples(
  input: AgentInput,
  definition: AgentDefinition
): Promise<{ systemPrompt: string; messages: ChatMessage[]; examplesUsed: number }> {
  // Fetch relevant examples
  const examples = await fetchRelevantExamples(definition, input);

  // Build base prompts
  const systemPrompt = buildSystemPrompt(definition, input, examples);
  const messages = buildMessages(input, definition);

  return {
    systemPrompt,
    messages,
    examplesUsed: examples.length,
  };
}

/** Build system prompt */
function buildSystemPrompt(
  definition: AgentDefinition,
  input: AgentInput,
  examples: RetrievedExample[] = []
): string {
  const parts: string[] = [];

  // 50X COORDINATION: Inject upstream constraints at the START if high priority
  const needsInjection = needsConstraintInjection(definition.id);
  const priority = getInjectionPriority(definition.id);
  const position = getInjectionPosition(priority);
  const upstreamConstraints = (input.constraints as any)?.upstreamConstraints as string | undefined;

  if (needsInjection && upstreamConstraints && position === 'system_start') {
    parts.push(upstreamConstraints);
    parts.push('\n\n───────────────────────────────────────────────────────────────────────\n');
  }

  // Base system prompt from definition
  parts.push(definition.systemPrompt);

  // INJECT 7 CODE QUALITY RULES INTO EVERY AGENT
  // This ensures all generated code meets OLYMPUS quality standards
  // Code-generating phases: frontend, backend, integration
  // Code-generating agents: pixel, wire, polish (frontend), engine, gateway, keeper, cron (backend), forge (architecture)
  if (
    definition.phase === 'frontend' ||
    definition.phase === 'backend' ||
    definition.phase === 'integration' ||
    definition.id === 'pixel' ||
    definition.id === 'wire' ||
    definition.id === 'polish' ||
    definition.id === 'gateway' ||
    definition.id === 'keeper' ||
    definition.id === 'engine' ||
    definition.id === 'forge'
  ) {
    parts.push(`\n\n${CODE_QUALITY_RULES}`);
  }

  // Add iteration context if not first iteration
  if (input.context.iterationNumber > 1) {
    parts.push(`\n\n## Iteration Context
This is iteration #${input.context.iterationNumber}. Focus on improving based on feedback provided.
Maintain consistency with previous decisions unless explicitly asked to change.`);
  }

  // Add constraints if any
  if (input.constraints) {
    const constraintParts: string[] = [];
    if (input.constraints.maxTokens) {
      constraintParts.push(`- Keep response under ${input.constraints.maxTokens} tokens`);
    }
    if (input.constraints.techStack?.length) {
      constraintParts.push(`- Use only: ${input.constraints.techStack.join(', ')}`);
    }
    if (input.constraints.focusAreas?.length) {
      constraintParts.push(`- Focus on: ${input.constraints.focusAreas.join(', ')}`);
    }
    if (constraintParts.length) {
      parts.push(`\n\n## Constraints\n${constraintParts.join('\n')}`);
    }
  }

  // SPEC REQUIREMENTS INJECTION: Inject parsed spec into code-generating agents
  const specRequirements = (input as any).specRequirements as SpecRequirements | undefined;
  if (shouldInjectSpec(definition.id) && specRequirements) {
    const specSection = formatSpecForPrompt(specRequirements);
    parts.push(`\n\n${specSection}`);
  }

  // 50X COORDINATION: Inject upstream constraints at the END if medium priority
  if (needsInjection && upstreamConstraints && position === 'system_end') {
    parts.push('\n\n───────────────────────────────────────────────────────────────────────\n');
    parts.push(upstreamConstraints);
  }

  // Inject examples (few-shot learning)
  if (examples.length > 0) {
    const examplesSection = formatExamplesForPrompt(examples);
    parts.push(`\n\n${examplesSection}`);
  }

  // Add output format reminder
  parts.push(`\n\n## Output Format
You MUST respond with valid JSON matching your output schema.
Do not include any text before or after the JSON.
Do not wrap in markdown code blocks.`);

  return parts.join('');
}

/** Build chat messages */
function buildMessages(input: AgentInput, definition: AgentDefinition): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // Build context summary from previous outputs
  const contextSummary = buildContextSummary(
    input.context,
    {}, // Knowledge will be built from previousOutputs
    input.previousOutputs,
    definition.id
  );

  // Add context as first user message
  messages.push({
    role: 'user',
    content: `# Build Context\n\n${contextSummary}`,
  });

  // Add dependency outputs as assistant context
  for (const depId of definition.dependencies) {
    const depOutput = input.previousOutputs[depId];
    if (depOutput) {
      const depDef = getAgent(depId);
      const summary = summarizeOutputForDependency(depOutput);
      if (summary) {
        messages.push({
          role: 'assistant',
          content: `[${depDef?.name || depId} completed with: ${summary}]`,
        });
      }
    }
  }

  // Add main instruction
  const instruction = buildMainInstruction(input, definition);
  messages.push({ role: 'user', content: instruction });

  // Add user feedback if iterating
  if (input.userFeedback) {
    messages.push({
      role: 'user',
      content: `# User Feedback\n\n${input.userFeedback}\n\nPlease incorporate this feedback in your output.`,
    });
  }

  return messages;
}

/** Build main instruction for agent */
function buildMainInstruction(input: AgentInput, definition: AgentDefinition): string {
  const parts: string[] = [];

  parts.push(`# Task: ${definition.name}`);
  parts.push(`\n${definition.description}`);

  // Phase-specific instructions
  switch (definition.phase) {
    case 'discovery':
      parts.push(`\nAnalyze the project requirements and provide strategic insights.`);
      break;
    case 'design':
      parts.push(`\nCreate design specifications that align with the project vision.`);
      break;
    case 'architecture':
      parts.push(`\nDefine technical architecture and generate implementation plans.`);
      break;
    case 'frontend':
    case 'backend':
      parts.push(`\nGenerate production-ready code with proper error handling and types.`);
      break;
    case 'integration':
      parts.push(`\nImplement integrations that connect system components seamlessly.`);
      break;
    case 'testing':
      parts.push(`\nCreate comprehensive tests covering critical paths and edge cases.`);
      break;
    case 'deployment':
      parts.push(`\nConfigure deployment for reliability and scalability.`);
      break;
  }

  parts.push(`\nNow execute your task and output the result as JSON.`);

  return parts.join('');
}

/** Summarize output for dependency context */
function summarizeOutputForDependency(output: AgentOutput): string {
  const parts: string[] = [];

  // Key decisions
  if (output.decisions.length) {
    parts.push(
      `decisions: ${output.decisions
        .slice(0, 3)
        .map(d => d.choice)
        .join(', ')}`
    );
  }

  // File count
  const files = output.artifacts.filter(a => a.type === 'code');
  if (files.length) {
    parts.push(`${files.length} files generated`);
  }

  return parts.join('; ') || 'completed';
}

/** Estimate token count for prompt */
export function estimatePromptTokens(systemPrompt: string, messages: ChatMessage[]): number {
  const totalChars = systemPrompt.length + messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(totalChars / 4); // ~4 chars per token
}

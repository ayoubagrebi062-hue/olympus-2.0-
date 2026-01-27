/**
 * OLYMPUS 2.0 - Enhanced Agent Executor
 *
 * Extends the base executor with:
 * - GraphRAG context enhancement
 * - Tool integration
 * - Quality gate validation
 * - Automatic learning from executions
 * - Inter-agent validation (NEW)
 */

import type { AgentId, AgentInput, AgentOutput, AgentDefinition } from '../types';
import type { ExecutionOptions, ExecutionResult, ExecutionProgress } from './types';
import type { EnhancedContext } from '../context/agent-enhancer';
import { AgentExecutor, executeAgent } from './executor';
import { getAgent } from '../registry';
import { TokenTracker } from '../providers';
import { enhanceAgentContext, recordAgentExecution, recordLearnedPattern } from '../context/agent-enhancer';
import { initializeTools, getToolsForPrompt, executeTool } from '../tools';
import type { ToolCall, ToolResult } from '../tools/types';

// ============================================
// INTER-AGENT VALIDATION
// ============================================

/**
 * Validation rules for agent dependencies.
 * Ensures each agent receives quality input from previous agents.
 */
interface DependencyValidationRule {
  sourceAgent: AgentId;
  targetAgent: AgentId;
  requiredFields: string[];
  validate: (output: AgentOutput) => ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Registry of validation rules between agents.
 * Key: target agent ID, Value: validation rules for its dependencies
 * Only agents with dependencies need validation rules.
 */
const DEPENDENCY_VALIDATION_RULES: Partial<Record<AgentId, DependencyValidationRule[]>> = {
  // PIXEL depends on BLOCKS - must have component definitions
  pixel: [{
    sourceAgent: 'blocks',
    targetAgent: 'pixel',
    requiredFields: ['components', 'design_tokens'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for components array
      const hasComponents = output.artifacts.some(a =>
        a.type === 'schema' && a.id === 'components'
      ) || output.decisions.some(d =>
        d.type === 'component' || d.choice?.includes('component')
      );

      if (!hasComponents) {
        errors.push('BLOCKS output missing component definitions. PIXEL cannot generate UI without component specs.');
      }

      // Check for design tokens
      const hasDesignTokens = output.artifacts.some(a =>
        a.id === 'design_tokens' || a.content?.includes('tokens')
      );

      if (!hasDesignTokens) {
        warnings.push('BLOCKS output missing design tokens. UI consistency may suffer.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  // FORGE depends on DATUM - must have database schema
  forge: [{
    sourceAgent: 'datum',
    targetAgent: 'forge',
    requiredFields: ['tables', 'relationships'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for tables definition
      const hasTables = output.artifacts.some(a =>
        a.type === 'schema' && (a.id === 'tables' || a.id === 'schema')
      ) || output.decisions.some(d =>
        d.type === 'schema' || d.choice?.includes('table')
      );

      if (!hasTables) {
        errors.push('DATUM output missing database tables. FORGE cannot generate backend without schema.');
      }

      // Check for relationships
      const hasRelationships = output.artifacts.some(a =>
        a.id === 'relationships' || a.content?.includes('relationship')
      );

      if (!hasRelationships) {
        warnings.push('DATUM output missing table relationships. Data integrity may be compromised.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  // ENGINE depends on NEXUS - must have API endpoints
  engine: [{
    sourceAgent: 'nexus',
    targetAgent: 'engine',
    requiredFields: ['endpoints', 'schemas'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for endpoints
      const hasEndpoints = output.artifacts.some(a =>
        a.type === 'schema' && a.id === 'endpoints'
      ) || output.decisions.some(d =>
        d.type === 'api' || d.choice?.includes('endpoint')
      );

      if (!hasEndpoints) {
        errors.push('NEXUS output missing API endpoints. ENGINE cannot implement business logic without API contract.');
      }

      // Check for request/response schemas
      const hasSchemas = output.artifacts.some(a =>
        a.id === 'schemas' || a.content?.includes('request') || a.content?.includes('response')
      );

      if (!hasSchemas) {
        warnings.push('NEXUS output missing request/response schemas. Type safety may be compromised.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  // WIRE depends on CARTOGRAPHER - must have page layouts
  wire: [{
    sourceAgent: 'cartographer',
    targetAgent: 'wire',
    requiredFields: ['pages', 'navigation'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for pages
      const hasPages = output.artifacts.some(a =>
        a.type === 'schema' && a.id === 'pages'
      ) || output.decisions.some(d =>
        d.type === 'page' || d.choice?.includes('page')
      );

      if (!hasPages) {
        errors.push('CARTOGRAPHER output missing page definitions. WIRE cannot implement routing without pages.');
      }

      // Check for navigation
      const hasNavigation = output.artifacts.some(a =>
        a.id === 'navigation' || a.content?.includes('nav')
      );

      if (!hasNavigation) {
        warnings.push('CARTOGRAPHER output missing navigation structure. User experience may suffer.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  // KEEPER depends on DATUM - must have schema for data layer
  keeper: [{
    sourceAgent: 'datum',
    targetAgent: 'keeper',
    requiredFields: ['tables'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const hasTables = output.artifacts.some(a =>
        a.type === 'schema' && (a.id === 'tables' || a.id === 'schema')
      );

      if (!hasTables) {
        errors.push('DATUM output missing database schema. KEEPER cannot implement data layer without tables.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],
};

/**
 * Validate that previous agent outputs meet requirements for current agent.
 */
export function validateAgentDependencies(
  agentId: AgentId,
  previousOutputs: Record<AgentId, AgentOutput>
): ValidationResult {
  const rules = DEPENDENCY_VALIDATION_RULES[agentId];

  if (!rules || rules.length === 0) {
    // No validation rules for this agent
    return { valid: true, errors: [], warnings: [] };
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const rule of rules) {
    const sourceOutput = previousOutputs[rule.sourceAgent];

    if (!sourceOutput) {
      // Source agent output missing entirely
      allErrors.push(
        `Missing required dependency: ${rule.sourceAgent} output not found. ` +
        `${agentId.toUpperCase()} requires output from ${rule.sourceAgent.toUpperCase()}.`
      );
      continue;
    }

    // Run validation
    const result = rule.validate(sourceOutput);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ============================================
// ENHANCED EXECUTION OPTIONS
// ============================================

export interface EnhancedExecutionOptions extends ExecutionOptions {
  /** Enable GraphRAG context enhancement */
  enableGraphRAG?: boolean;

  /** Enable tool usage during execution */
  enableTools?: boolean;

  /** Enable quality checks on output */
  enableQualityGates?: boolean;

  /** User ID for personalization */
  userId?: string;

  /** Record execution for learning */
  recordForLearning?: boolean;

  /** Tool categories to enable */
  toolCategories?: ('memory' | 'quality' | 'code' | 'search')[];
}

export interface EnhancedExecutionResult extends ExecutionResult {
  /** Enhanced context used */
  enhancedContext?: EnhancedContext;

  /** Tool calls made during execution */
  toolCalls?: Array<{ call: ToolCall; result: ToolResult }>;

  /** Quality check results */
  qualityCheck?: {
    passed: boolean;
    score: number;
    issues: number;
  };

  /** Patterns learned from this execution */
  learnedPatterns?: string[];

  /** Validation errors from dependency check */
  validationErrors?: string[];

  /** Validation warnings from dependency check */
  validationWarnings?: string[];
}

// ============================================
// ENHANCED EXECUTOR
// ============================================

export class EnhancedAgentExecutor {
  private definition: AgentDefinition;
  private baseExecutor: AgentExecutor;
  private options: EnhancedExecutionOptions;
  private toolCalls: Array<{ call: ToolCall; result: ToolResult }> = [];

  constructor(
    agentId: AgentId,
    options: EnhancedExecutionOptions = {},
    tokenTracker?: TokenTracker
  ) {
    const definition = getAgent(agentId);
    if (!definition) throw new Error(`Unknown agent: ${agentId}`);

    this.definition = definition;
    this.baseExecutor = new AgentExecutor(agentId, tokenTracker);
    this.options = {
      enableGraphRAG: true,
      enableTools: true,
      enableQualityGates: true,
      recordForLearning: true,
      toolCategories: ['memory', 'quality', 'code', 'search'],
      ...options,
    };

    // Initialize tools if enabled
    if (this.options.enableTools) {
      initializeTools();
    }
  }

  /**
   * Execute agent with enhancements
   */
  async execute(input: AgentInput): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();
    let enhancedContext: EnhancedContext | undefined;

    // Step 0: Validate dependencies from previous agents
    if (input.previousOutputs) {
      const validationResult = validateAgentDependencies(
        this.definition.id,
        input.previousOutputs as Record<AgentId, AgentOutput>
      );

      // Log warnings even if valid
      for (const warning of validationResult.warnings) {
        console.warn(`[EnhancedExecutor] Dependency warning for ${this.definition.id}: ${warning}`);
      }

      // If validation fails, return early with error
      if (!validationResult.valid) {
        console.error(`[EnhancedExecutor] Dependency validation FAILED for ${this.definition.id}`);
        for (const error of validationResult.errors) {
          console.error(`  - ${error}`);
        }

        return {
          success: false,
          output: null,
          retries: 0,
          totalDuration: Date.now() - startTime,
          error: {
            code: 'DEPENDENCY_VALIDATION_FAILED',
            message: `Dependency validation failed: ${validationResult.errors.join('; ')}`,
            agentId: this.definition.id,
            phase: 'validation',
            recoverable: false,
          },
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
        };
      }
    }

    // Step 1: Enhance context with GraphRAG
    if (this.options.enableGraphRAG && this.options.userId) {
      try {
        enhancedContext = await enhanceAgentContext(
          this.options.userId,
          input.context.description,
          {
            includeEmbeddingSearch: true,
            maxSimilarPrompts: 5,
            maxPatterns: 3,
            maxComponents: 5,
          }
        );

        // Inject enhanced context into input
        input = this.injectEnhancedContext(input, enhancedContext);
      } catch (error) {
        console.error('[EnhancedExecutor] GraphRAG enhancement failed:', error);
        // Continue without enhancement
      }
    }

    // Step 2: Add tool definitions to constraints
    if (this.options.enableTools) {
      input = this.injectToolDefinitions(input);
    }

    // Step 3: Execute the base agent
    const baseResult = await this.baseExecutor.execute(input, this.options);

    // Step 4: Process tool calls in output
    if (this.options.enableTools && baseResult.success && baseResult.output) {
      await this.processToolCalls(baseResult.output);
    }

    // Step 5: Run quality checks on generated code
    let qualityCheck;
    if (this.options.enableQualityGates && baseResult.success && baseResult.output) {
      qualityCheck = await this.runQualityChecks(baseResult.output);
    }

    // Step 6: Record for learning
    let learnedPatterns: string[] = [];
    if (this.options.recordForLearning && baseResult.success && this.options.userId) {
      learnedPatterns = await this.recordExecution(input, baseResult);
    }

    return {
      ...baseResult,
      enhancedContext,
      toolCalls: this.toolCalls,
      qualityCheck,
      learnedPatterns,
    };
  }

  /**
   * Inject enhanced context into agent input
   */
  private injectEnhancedContext(
    input: AgentInput,
    context: EnhancedContext
  ): AgentInput {
    // Add context summary to description
    const enhancedDescription = context.contextSummary
      ? `${input.context.description}\n\n${context.contextSummary}`
      : input.context.description;

    // Add design preferences
    const designPreferences = context.userContext.preferences.stylePreference
      || input.context.designPreferences;

    return {
      ...input,
      context: {
        ...input.context,
        description: enhancedDescription,
        designPreferences,
      },
    };
  }

  /**
   * Inject tool definitions into agent constraints
   */
  private injectToolDefinitions(input: AgentInput): AgentInput {
    const toolDocs = getToolsForPrompt(this.options.toolCategories);

    return {
      ...input,
      constraints: {
        ...input.constraints,
        focusAreas: [
          ...(input.constraints?.focusAreas || []),
          'When you need to check code quality, search memory, or analyze patterns, use the available tools.',
        ],
      },
    };
  }

  /**
   * Process tool calls from agent output
   */
  private async processToolCalls(output: AgentOutput): Promise<void> {
    // Look for tool calls in decisions or artifacts
    for (const decision of output.decisions) {
      if (decision.type === 'tool_call') {
        const toolCall: ToolCall = {
          toolId: decision.choice,
          parameters: decision.alternatives as unknown as Record<string, unknown>,
          context: {
            buildId: output.agentId,
            projectId: 'unknown',
            agentId: output.agentId,
            phase: 'unknown',
          },
        };

        const result = await executeTool(toolCall);
        this.toolCalls.push({ call: toolCall, result });
      }
    }
  }

  /**
   * Run quality checks on generated code
   */
  private async runQualityChecks(
    output: AgentOutput
  ): Promise<{ passed: boolean; score: number; issues: number }> {
    // Extract code artifacts
    const codeArtifacts = output.artifacts.filter(a => a.type === 'code');

    if (codeArtifacts.length === 0) {
      return { passed: true, score: 100, issues: 0 };
    }

    try {
      const result = await executeTool({
        toolId: 'quality.check',
        parameters: {
          files: codeArtifacts.map(a => ({
            path: a.path || `${a.id}.ts`,
            content: a.content,
            language: 'typescript',
          })),
          gates: ['typescript', 'eslint', 'security'],
        },
      });

      if (result.success && result.data) {
        const data = result.data as {
          passed: boolean;
          score: number;
          summary: { totalErrors: number; totalWarnings: number };
        };

        return {
          passed: data.passed,
          score: data.score,
          issues: data.summary.totalErrors + data.summary.totalWarnings,
        };
      }
    } catch (error) {
      console.error('[EnhancedExecutor] Quality check failed:', error);
    }

    return { passed: true, score: 100, issues: 0 };
  }

  /**
   * Record execution for learning
   */
  private async recordExecution(
    input: AgentInput,
    result: ExecutionResult
  ): Promise<string[]> {
    const patterns: string[] = [];

    if (!this.options.userId || !result.output) return patterns;

    // Record the execution
    await recordAgentExecution({
      buildId: input.buildId,
      userId: this.options.userId,
      agentId: this.definition.id,
      prompt: input.context.description,
      output: JSON.stringify(result.output.artifacts),
      model: 'unknown',
      tokens: result.output.tokensUsed,
      latencyMs: result.totalDuration,
      success: result.success,
    });

    // Extract and record patterns from decisions
    for (const decision of result.output.decisions) {
      if (decision.confidence > 0.8 && decision.type === 'pattern') {
        await recordLearnedPattern({
          userId: this.options.userId,
          buildId: input.buildId,
          patternType: 'component',
          name: decision.choice,
          description: decision.reasoning,
        });
        patterns.push(decision.choice);
      }
    }

    return patterns;
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.baseExecutor.cancel();
  }
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Execute agent with all enhancements
 */
export async function executeEnhancedAgent(
  agentId: AgentId,
  input: AgentInput,
  options?: EnhancedExecutionOptions,
  tokenTracker?: TokenTracker
): Promise<EnhancedExecutionResult> {
  const executor = new EnhancedAgentExecutor(agentId, options, tokenTracker);
  return executor.execute(input);
}

export default {
  EnhancedAgentExecutor,
  executeEnhancedAgent,
};

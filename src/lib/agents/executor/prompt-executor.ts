/**
 * PROMPT-AWARE AGENT EXECUTOR
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * Extends the enhanced executor with PromptService integration:
 * - Dynamic prompt loading from database
 * - Performance tracking for prompts
 * - A/B testing support
 * - Hardcoded fallback for reliability
 */

import type { AgentId, AgentInput, AgentOutput, AgentDefinition } from '../types';
import type { ExecutionResult, ExecutionProgress } from './types';
import {
  EnhancedAgentExecutor,
  EnhancedExecutionOptions,
  EnhancedExecutionResult,
} from './enhanced-executor';
import { getAgent } from '../registry';
import { TokenTracker } from '../providers';
import { PromptService, LoadedPrompt } from '../conductor/prompts';
import { buildContextSummary } from '../context';

// ============================================================================
// PROMPT-AWARE EXECUTION OPTIONS
// ============================================================================

export interface PromptAwareExecutionOptions extends EnhancedExecutionOptions {
  /**
   * Use PromptService for dynamic prompts (default: true)
   * When false, uses hardcoded prompts from registry
   */
  useDynamicPrompts?: boolean;

  /**
   * Record prompt performance metrics (default: true)
   */
  trackPromptPerformance?: boolean;

  /**
   * PromptService instance (optional, creates default if not provided)
   */
  promptService?: PromptService;

  /**
   * Build ID for performance tracking
   */
  buildId?: string;
}

export interface PromptAwareExecutionResult extends EnhancedExecutionResult {
  /**
   * The prompt that was used for execution
   */
  prompt?: {
    promptId: string;
    version: number;
    experimentId?: string;
    source: 'database' | 'hardcoded';
  };

  /**
   * Performance metrics recorded
   */
  performanceRecorded?: boolean;
}

// ============================================================================
// PROMPT-AWARE EXECUTOR
// ============================================================================

export class PromptAwareExecutor {
  private definition: AgentDefinition;
  private baseExecutor: EnhancedAgentExecutor;
  private promptService: PromptService | null;
  private options: PromptAwareExecutionOptions;
  private loadedPrompt: LoadedPrompt | null = null;

  constructor(
    agentId: AgentId,
    options: PromptAwareExecutionOptions = {},
    tokenTracker?: TokenTracker
  ) {
    const definition = getAgent(agentId);
    if (!definition) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    this.definition = definition;
    this.options = {
      useDynamicPrompts: true,
      trackPromptPerformance: true,
      ...options,
    };

    // Initialize prompt service if dynamic prompts enabled
    if (this.options.useDynamicPrompts) {
      this.promptService = options.promptService || this.createDefaultPromptService();
    } else {
      this.promptService = null;
    }

    // Create base executor
    this.baseExecutor = new EnhancedAgentExecutor(agentId, options, tokenTracker);
  }

  /**
   * Create default PromptService instance
   */
  private createDefaultPromptService(): PromptService | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[PromptAwareExecutor] Missing Supabase config, using hardcoded prompts');
      return null;
    }

    return new PromptService(supabaseUrl, supabaseKey, {
      cacheEnabled: true,
      fallbackToHardcoded: true,
      abTestingEnabled: true,
      trackPerformance: this.options.trackPromptPerformance,
    });
  }

  /**
   * Load prompt for the agent
   */
  private async loadPrompt(): Promise<LoadedPrompt> {
    if (this.loadedPrompt) {
      return this.loadedPrompt;
    }

    if (this.promptService) {
      try {
        const loadedPrompt = await this.promptService.getPrompt(this.definition.id);
        this.loadedPrompt = loadedPrompt;
        console.log(
          `[PromptAwareExecutor] Loaded prompt for ${this.definition.id} v${loadedPrompt.version}` +
            (loadedPrompt.experimentId ? ` (experiment: ${loadedPrompt.experimentId})` : '')
        );
        return loadedPrompt;
      } catch (error) {
        console.error(
          `[PromptAwareExecutor] Failed to load prompt for ${this.definition.id}:`,
          error
        );
      }
    }

    // Fallback to hardcoded
    const fallbackPrompt: LoadedPrompt = {
      promptId: `hardcoded-${this.definition.id}`,
      agentId: this.definition.id,
      version: 0,
      systemPrompt: this.definition.systemPrompt,
      outputSchema: this.definition.outputSchema,
      examples: [],
    };
    this.loadedPrompt = fallbackPrompt;

    console.warn(`[PromptAwareExecutor] Using hardcoded prompt for ${this.definition.id}`);
    return fallbackPrompt;
  }

  /**
   * Execute agent with prompt service integration
   */
  async execute(input: AgentInput): Promise<PromptAwareExecutionResult> {
    const startTime = Date.now();

    // Step 1: Load the prompt
    const prompt = await this.loadPrompt();

    // Step 2: Inject prompt into input (override definition's system prompt)
    const enhancedInput = this.injectPrompt(input, prompt);

    // Step 3: Execute using base executor
    const baseResult = await this.baseExecutor.execute(enhancedInput);

    // Step 4: Record performance if enabled
    let performanceRecorded = false;
    if (
      this.options.trackPromptPerformance &&
      this.promptService &&
      this.options.buildId &&
      baseResult.success
    ) {
      try {
        await this.recordPerformance(prompt, baseResult, Date.now() - startTime);
        performanceRecorded = true;
      } catch (error) {
        console.error('[PromptAwareExecutor] Failed to record performance:', error);
      }
    }

    // Step 5: Return enhanced result
    return {
      ...baseResult,
      prompt: {
        promptId: prompt.promptId,
        version: prompt.version,
        experimentId: prompt.experimentId,
        source: prompt.version === 0 ? 'hardcoded' : 'database',
      },
      performanceRecorded,
    };
  }

  /**
   * Inject loaded prompt into agent input
   */
  private injectPrompt(input: AgentInput, prompt: LoadedPrompt): AgentInput {
    // Create a modified agent definition with the loaded prompt
    // This is a workaround - ideally the executor would accept prompt directly
    // For now, we override the definition's system prompt via context

    const promptInjection = `
[PROMPT VERSION: ${prompt.version}]
${prompt.experimentId ? `[EXPERIMENT: ${prompt.experimentId}]` : ''}

${prompt.systemPrompt}
`.trim();

    // Add examples to context if available
    let examplesContext = '';
    if (prompt.examples && prompt.examples.length > 0) {
      examplesContext = '\n\n[FEW-SHOT EXAMPLES]\n';
      for (const example of prompt.examples) {
        examplesContext += `\nInput: ${example.input}\nOutput: ${example.output}`;
        if (example.explanation) {
          examplesContext += `\nExplanation: ${example.explanation}`;
        }
        examplesContext += '\n---\n';
      }
    }

    return {
      ...input,
      context: {
        ...input.context,
        // Inject prompt info into description for downstream processing
        description: input.context.description,
        // Store prompt metadata for reference
        metadata: {
          ...input.context.metadata,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          experimentId: prompt.experimentId,
          promptInjection,
          examplesContext,
        },
      },
    };
  }

  /**
   * Record performance metrics for the prompt
   */
  private async recordPerformance(
    prompt: LoadedPrompt,
    result: EnhancedExecutionResult,
    latencyMs: number
  ): Promise<void> {
    if (!this.promptService || !this.options.buildId) return;

    // Calculate quality score from result
    const qualityScore = this.calculateQualityScore(result);

    await this.promptService.recordPerformance(prompt.promptId, this.options.buildId, {
      qualityScore,
      tokensUsed: result.output?.tokensUsed || 0,
      latencyMs,
      passedValidation: result.success,
      retryCount: result.retries,
    });

    console.log(
      `[PromptAwareExecutor] Recorded performance for ${prompt.promptId}: ` +
        `quality=${qualityScore}, tokens=${result.output?.tokensUsed || 0}, latency=${latencyMs}ms`
    );
  }

  /**
   * Calculate quality score from execution result
   */
  private calculateQualityScore(result: EnhancedExecutionResult): number {
    if (!result.success) return 0;

    let score = 7; // Base score for successful execution

    // Adjust based on quality check
    if (result.qualityCheck) {
      score = (result.qualityCheck.score / 100) * 10; // Convert to 0-10 scale
    }

    // Penalize for retries
    if (result.retries > 0) {
      score -= result.retries * 0.5;
    }

    // Bonus for validation passing
    if (!result.validationErrors || result.validationErrors.length === 0) {
      score += 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.baseExecutor.cancel();
  }

  /**
   * Get the loaded prompt (for debugging/inspection)
   */
  getLoadedPrompt(): LoadedPrompt | null {
    return this.loadedPrompt;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute agent with prompt service integration
 */
export async function executeWithPromptService(
  agentId: AgentId,
  input: AgentInput,
  options?: PromptAwareExecutionOptions,
  tokenTracker?: TokenTracker
): Promise<PromptAwareExecutionResult> {
  const executor = new PromptAwareExecutor(agentId, options, tokenTracker);
  return executor.execute(input);
}

/**
 * Create a shared PromptService for multiple executions
 * (Recommended for batch operations to share cache)
 */
export function createSharedPromptService(config?: {
  cacheEnabled?: boolean;
  fallbackToHardcoded?: boolean;
  redisUrl?: string;
}): PromptService | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return new PromptService(supabaseUrl, supabaseKey, {
    cacheEnabled: config?.cacheEnabled ?? true,
    fallbackToHardcoded: config?.fallbackToHardcoded ?? true,
    abTestingEnabled: true,
    trackPerformance: true,
  });
}

export default {
  PromptAwareExecutor,
  executeWithPromptService,
  createSharedPromptService,
};

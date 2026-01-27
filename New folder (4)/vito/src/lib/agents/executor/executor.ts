/**
 * OLYMPUS 2.0 - Agent Executor
 */

import type { AgentId, AgentInput, AgentOutput, AgentDefinition, AgentStatus } from '../types';
import type { ExecutionOptions, ExecutionResult, ExecutionProgress, ExecutionState, ExecutionError } from './types';
import type { AIMessage } from '../providers/types';
import { getAgent } from '../registry';
import { getRouter } from '../providers/router';
import { getAgentCategory } from '../providers/types';
import { parseAgentResponse, TokenTracker } from '../providers';
import { validateOutput, getValidationSummary } from './validator';
import { RetryHandler, createExecutionError } from './retry';
import { buildAgentPrompt, buildAgentPromptWithExamples, estimatePromptTokens } from './prompt-builder';

/** Execute a single agent */
export class AgentExecutor {
  private definition: AgentDefinition;
  private retryHandler: RetryHandler;
  private tokenTracker: TokenTracker | null;
  private state: ExecutionState;
  private abortController: AbortController | null = null;

  constructor(agentId: AgentId, tokenTracker?: TokenTracker) {
    const definition = getAgent(agentId);
    if (!definition) throw new Error(`Unknown agent: ${agentId}`);

    this.definition = definition;
    this.retryHandler = new RetryHandler({ maxRetries: definition.maxRetries });
    this.tokenTracker = tokenTracker || null;
    this.state = this.createInitialState(agentId);
  }

  /** Create initial execution state */
  private createInitialState(agentId: AgentId): ExecutionState {
    return {
      agentId,
      startTime: new Date(),
      attempt: 0,
      status: 'idle',
      tokensUsed: 0,
      streamBuffer: '',
    };
  }

  /** Execute the agent */
  async execute(input: AgentInput, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();
    this.state.status = 'initializing';
    this.emitProgress(options, 'initializing', 0, 'Preparing agent...');

    try {
      // Validate dependencies are met
      this.validateDependencies(input);

      // Build prompt with example injection
      this.emitProgress(options, 'prompting', 10, 'Building prompt with examples...');

      let systemPrompt: string;
      let messages: any[];
      let examplesUsed = 0;

      // Try to use enhanced prompt with examples (async)
      if (options.useExamples !== false) {
        try {
          const enhancedPrompt = await buildAgentPromptWithExamples(input, this.definition);
          systemPrompt = enhancedPrompt.systemPrompt;
          messages = enhancedPrompt.messages;
          examplesUsed = enhancedPrompt.examplesUsed;
          if (examplesUsed > 0) {
            console.log(`[Executor] Injected ${examplesUsed} examples into prompt`);
          }
        } catch {
          // Fall back to sync version without examples
          const basePrompt = buildAgentPrompt(input, this.definition);
          systemPrompt = basePrompt.systemPrompt;
          messages = basePrompt.messages;
        }
      } else {
        // Use sync version without examples
        const basePrompt = buildAgentPrompt(input, this.definition);
        systemPrompt = basePrompt.systemPrompt;
        messages = basePrompt.messages;
      }

      const estimatedTokens = estimatePromptTokens(systemPrompt, messages);

      // Check token budget
      if (this.tokenTracker && this.tokenTracker.getRemainingTokens() < estimatedTokens * 2) {
        throw new Error('Insufficient token budget for agent execution');
      }

      // Execute with retry
      const result = await this.retryHandler.executeWithRetry(
        () => this.executeCompletion(systemPrompt, messages, options),
        {
          onRetry: (attempt, error, delay) => {
            this.state.attempt = attempt;
            this.emitProgress(options, 'prompting', 20, `Retry ${attempt}: ${error.message}, waiting ${delay}ms`);
          },
        }
      );

      if ('error' in result) {
        return this.createFailureResult(result.error, result.attempts, startTime);
      }

      // Validate output
      if (options.validateOutput !== false) {
        this.emitProgress(options, 'validating', 90, 'Validating output...');
        const validation = validateOutput(result.result, this.definition);
        if (!validation.valid) {
          const validationSummary = getValidationSummary(validation);
          console.warn(`Agent ${this.definition.id} validation issues: ${validationSummary}`);
        }
      }

      this.emitProgress(options, 'complete', 100, 'Complete');
      this.state.status = 'completed';
      this.state.endTime = new Date();

      return {
        success: true,
        output: result.result,
        retries: result.attempts - 1,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      return this.createFailureResult(error as Error, this.state.attempt, startTime);
    }
  }

  /** Execute completion request using AIRouter */
  private async executeCompletion(systemPrompt: string, messages: any[], options: ExecutionOptions): Promise<AgentOutput> {
    const router = getRouter();
    const category = getAgentCategory(this.definition.id);

    this.state.status = 'running';
    this.emitProgress(options, 'generating', 30, `Calling AI via router (category: ${category})...`);

    // Convert messages to AIMessage format with system prompt
    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Execute through AIRouter (handles provider selection, fallback, etc.)
    const result = await router.execute(this.definition.id, {
      messages: aiMessages,
      maxTokens: this.definition.timeout > 60000 ? 16000 : 8192,
      temperature: 0.7,
      metadata: {
        agentId: this.definition.id,
        phase: category,
      },
    });

    if (!result.success || !result.response) {
      console.error(`[Executor] AI execution failed: success=${result.success}, hasResponse=${!!result.response}, error=${result.error}`);
      throw new Error(result.error || 'AI execution failed');
    }

    console.log(`[Executor] AI execution succeeded: ${result.totalTokens} tokens, provider=${result.providersUsed.join(',')}`);
    console.log(`[Executor] Response content type: ${typeof result.response.content}, length: ${result.response?.content?.length || 'N/A'}`);

    // Track tokens
    this.state.tokensUsed = result.totalTokens;
    if (this.tokenTracker) {
      try {
        this.tokenTracker.record(
          this.definition.id,
          result.response.model,
          {
            inputTokens: result.response.usage?.promptTokens || 0,
            outputTokens: result.response.usage?.completionTokens || 0,
            totalTokens: result.totalTokens,
          },
          `${result.providersUsed.join('-')}-${Date.now()}`
        );
      } catch (trackError) {
        console.warn(`[Executor] Token tracking failed (non-fatal):`, trackError);
      }
    }

    // Parse response
    try {
      console.log(`[Executor] Parsing response: ${(result.response.content || '').slice(0, 100)}...`);
      const parsed = parseAgentResponse(
        this.definition.id,
        result.response.content,
        result.response.latencyMs,
        result.totalTokens
      );
      console.log(`[Executor] Parsed successfully: artifacts=${parsed.artifacts.length}, status=${parsed.status}`);
      return parsed;
    } catch (parseError) {
      console.error(`[Executor] Parse error:`, parseError);
      throw parseError;
    }
  }

  /** Validate dependencies are met */
  private validateDependencies(input: AgentInput): void {
    for (const depId of this.definition.dependencies) {
      const depOutput = input.previousOutputs[depId];

      // Check if dependency output exists
      if (!depOutput) {
        const depDef = getAgent(depId);
        if (depDef && !depDef.optional) {
          throw new Error(`Missing required dependency: ${depId}`);
        }
        continue;
      }

      // FIX: Handle tier-degraded (skipped) dependencies gracefully
      // When a dependency was skipped due to tier degradation, we log a warning
      // but allow the agent to proceed with default/fallback behavior
      if (depOutput._skipped === true) {
        console.log(
          `[Executor] Dependency ${depId} was skipped (${depOutput._reason}). ` +
          `Agent ${this.definition.id} will use fallback behavior.`
        );
        // Don't throw - allow agent to proceed with fallback
      }
    }
  }

  /** Emit progress update */
  private emitProgress(
    options: ExecutionOptions,
    phase: ExecutionProgress['phase'],
    progress: number,
    message: string,
    streamedContent?: string
  ): void {
    if (options.onProgress) {
      options.onProgress({
        agentId: this.definition.id,
        status: this.state.status,
        phase,
        progress,
        tokensUsed: this.state.tokensUsed,
        message,
        streamedContent,
      });
    }
  }

  /** Create failure result */
  private createFailureResult(error: Error, attempts: number, startTime: number): ExecutionResult {
    this.state.status = 'failed';
    this.state.endTime = new Date();

    const executionError = createExecutionError(error, this.definition.id, this.state.status);
    this.state.lastError = executionError;

    return {
      success: false,
      output: null,
      error: executionError,
      retries: attempts - 1,
      totalDuration: Date.now() - startTime,
    };
  }

  /** Cancel execution */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.state.status = 'failed';
    }
  }

  /** Get current state */
  getState(): ExecutionState {
    return { ...this.state };
  }
}

/** Execute agent with simple interface */
export async function executeAgent(
  agentId: AgentId,
  input: AgentInput,
  options?: ExecutionOptions,
  tokenTracker?: TokenTracker
): Promise<ExecutionResult> {
  const executor = new AgentExecutor(agentId, tokenTracker);
  return executor.execute(input, options);
}

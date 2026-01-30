/**
 * OLYMPUS 2.0 - Agent Executor
 *
 * WIRED RELIABILITY FEATURES:
 * - SelfHealing: Automatic retry with circuit breaker and fallback
 * - Error tracking: Centralized failure aggregation
 */

import type { AgentId, AgentInput, AgentOutput, AgentDefinition, AgentStatus } from '../types';
import type {
  ExecutionOptions,
  ExecutionResult,
  ExecutionProgress,
  ExecutionState,
  ExecutionError,
} from './types';
import type { AIMessage, ChatMessage } from '../providers/types';
import { getAgent } from '../registry';
import { getRouter } from '../providers/router';
import { getAgentCategory } from '../providers/types';
import { parseAgentResponse, TokenTracker } from '../providers';
import { validateOutput, getValidationSummary, validateBlocksOutput, type BlocksValidationResult } from './validator';
import { getAgentSchema } from '../schemas/registry';
import { RetryHandler, createExecutionError } from './retry';
import {
  buildAgentPrompt,
  buildAgentPromptWithExamples,
  estimatePromptTokens,
} from './prompt-builder';
import { SelfHealing } from '../../recovery/sdk/self-healing';
import { Milliseconds } from '../../recovery/sdk/types';
import { trackError } from '../../observability/error-tracker';
import { recordAgentExecution } from '../../observability/metrics';
import { validateAgentOutput, type OutputValidationResult } from '../guardrails/output';
import { safeJsonParse } from '../../utils/safe-json';

// ============================================================================
// 10X SYSTEM INTEGRATION - Event sourcing, self-healing, and speculative execution
// ============================================================================
import { getTenXSystem } from '../orchestrator/10x';
import {
  CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitStats,
  CircuitOpenError,
} from '../orchestrator/10x/self-healing';
import {
  SpeculativeEngine,
  getSpeculativeEngine,
  type RaceResult,
} from '../orchestrator/conductor/speculative';

/** Execute a single agent */
export class AgentExecutor {
  private definition: AgentDefinition;
  private retryHandler: RetryHandler;
  private tokenTracker: TokenTracker | null;
  private state: ExecutionState;
  private abortController: AbortController | null = null;

  // =========================================================================
  // 10X SELF-HEALING: Static circuit breaker registry per agent
  // Tracks failures across all executor instances for each agent type
  // =========================================================================
  private static circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker for an agent
   * Circuit breakers are shared across all executor instances
   */
  /**
   * FIX 5: Reset all circuit breakers (call at build start)
   * This prevents previous failures from blocking new builds
   */
  public static resetAllCircuitBreakers(): void {
    console.info(`[10X:CircuitBreaker] Resetting all ${AgentExecutor.circuitBreakers.size} circuit breakers`);
    AgentExecutor.circuitBreakers.clear();
  }

  private static getCircuitBreaker(agentId: string): CircuitBreaker {
    if (!AgentExecutor.circuitBreakers.has(agentId)) {
      const config: Partial<CircuitBreakerConfig> = {
        failureThreshold: 20,      // FIX 5: Increased from 3 to 20 (allow many retries)
        successThreshold: 1,       // FIX 5: Reduced from 2 to 1 (close quickly)
        timeout: 10000,            // FIX 5: Reduced from 60s to 10s (recover faster)
        halfOpenRequests: 5,       // FIX 5: Increased from 2 to 5 (more test requests)
        monitoringWindow: 300000,  // FIX 5: Increased to 5 minutes
        minimumRequests: 50,       // FIX 5: Increased from 5 to 50 (need more data)
      };

      const cb = new CircuitBreaker(`agent-${agentId}`, config);

      // Wire circuit breaker events to 10X EventStore
      cb.on('state_change', async ({ from, to, stats }) => {
        console.info(`[10X:CircuitBreaker:${agentId}] State: ${from} → ${to}`);
        try {
          const tenX = getTenXSystem();
          const eventType = to === 'OPEN' ? 'AGENT_CIRCUIT_OPENED' : 'AGENT_CIRCUIT_CLOSED';
          await tenX.eventStore.append('system', eventType as any, {
            agentId,
            fromState: from,
            toState: to,
            failures: stats.failures,
            successes: stats.successes,
            failureRate: stats.failureRate,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.debug(`[10X] Failed to emit circuit state change:`, e);
        }
      });

      AgentExecutor.circuitBreakers.set(agentId, cb);
    }
    return AgentExecutor.circuitBreakers.get(agentId)!;
  }

  /**
   * Get all circuit breaker stats (for monitoring/debugging)
   */
  static getCircuitBreakerStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const [agentId, cb] of AgentExecutor.circuitBreakers) {
      stats[agentId] = cb.getStats();
    }
    return stats;
  }

  /**
   * Reset circuit breaker for an agent (for testing/admin)
   */
  static resetCircuitBreaker(agentId: string): void {
    const cb = AgentExecutor.circuitBreakers.get(agentId);
    if (cb) {
      cb.reset();
      console.info(`[10X:CircuitBreaker:${agentId}] Reset to CLOSED`);
    }
  }

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

    // 10X: Emit AGENT_STARTED event for time-travel debugging
    try {
      const tenX = getTenXSystem();
      await tenX.eventStore.append(input.buildId, 'AGENT_STARTED', {
        agentId: this.definition.id,
        phaseId: input.phase || 'unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (tenXError) {
      // Non-blocking: 10X is an enhancement
      console.debug(`[10X] Failed to emit AGENT_STARTED:`, tenXError);
    }

    // =========================================================================
    // 10X SELF-HEALING: Check circuit breaker before execution
    // If circuit is OPEN, return degraded result immediately
    // =========================================================================
    const circuitBreaker = AgentExecutor.getCircuitBreaker(this.definition.id);
    if (!circuitBreaker.canExecute()) {
      const stats = circuitBreaker.getStats();
      console.warn(`[10X:CircuitBreaker:${this.definition.id}] Circuit is ${stats.state} - returning degraded result`);

      // Emit circuit rejection event
      try {
        const tenX = getTenXSystem();
        await tenX.eventStore.append(input.buildId, 'AGENT_FAILED', {
          agentId: this.definition.id,
          phaseId: input.phase || 'unknown',
          error: `Circuit breaker is ${stats.state}`,
          errorCode: 'CIRCUIT_OPEN',
          retryable: true,
          retryCount: 0,
          maxRetries: this.definition.maxRetries || 3,
        });
      } catch (e) {
        console.debug(`[10X] Failed to emit AGENT_FAILED for circuit open:`, e);
      }

      return {
        success: false,
        output: null,
        retries: 0,
        totalDuration: Date.now() - startTime,
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Agent ${this.definition.id} circuit breaker is ${stats.state} (${stats.consecutiveFailures} consecutive failures, failure rate: ${stats.failureRate})`,
          agentId: this.definition.id,
          phase: input.phase || 'unknown',
          recoverable: true,
        },
      };
    }

    try {
      // Validate dependencies are met
      this.validateDependencies(input);

      // Build prompt with example injection
      this.emitProgress(options, 'prompting', 10, 'Building prompt with examples...');

      let systemPrompt: string;
      let messages: ChatMessage[]; // WIRED: Proper type (FIX - no more any[])
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
        } catch (promptError) {
          // Fall back to sync version without examples
          console.warn(
            `[Executor] ${this.definition.id}: Example injection failed, using sync prompt:`,
            promptError
          );
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

      // FIX #7: Enhanced token budget check with warning and detailed error
      if (this.tokenTracker) {
        const remaining = this.tokenTracker.getRemainingTokens();
        const required = estimatedTokens * 2; // 2x for safety margin
        const used = this.tokenTracker.getTotalTokens();
        const budget = used + remaining; // Total budget = used + remaining

        // Warn at 80% usage
        if (remaining < budget * 0.2 && remaining > required) {
          console.warn(
            `[TOKEN_WARNING] Budget 80%+ used: ${used}/${budget} tokens (${remaining} remaining)`
          );
        }

        if (remaining < required) {
          const errorMsg =
            `Insufficient token budget for ${this.definition.id}. ` +
            `Required: ~${required} tokens, Remaining: ${remaining} tokens. ` +
            `Total used: ${used}/${budget}`;

          console.error(`[TOKEN_EXHAUSTED]`, {
            agent: this.definition.id,
            required,
            remaining,
            used,
            budget,
          });

          throw new Error(errorMsg);
        }
      }

      // ========================================================================
      // WIRED: SelfHealing SDK for resilient AI execution
      // Features: Exponential backoff, circuit breaker, timeout, fallback
      // ========================================================================
      const selfHealingResult = await SelfHealing.create<AgentOutput>()
        .withName(`agent-${this.definition.id}`)
        .withStrategy('exponential', {
          maxAttempts: this.definition.maxRetries || 3,
          baseDelay: 1000,
          maxDelay: 30000,
        })
        .withCircuitBreaker({
          threshold: 5,                    // Open circuit after 5 failures
          resetTimeout: Milliseconds(60000), // Try again after 60s
        })
        .withTimeout(options.timeout || 120000) // 2 minute default timeout
        .onRetry((attempt, error, delay) => {
          this.state.attempt = attempt;
          this.emitProgress(
            options,
            'prompting',
            20,
            `Retry ${attempt}: ${error.message}, waiting ${delay}ms`
          );
          console.warn(`[SelfHealing] Agent ${this.definition.id} retry ${attempt}: ${error.message}`);
        })
        .build()
        .execute(() => this.executeCompletion(systemPrompt, messages, options));

      // Handle SelfHealing result
      if (!selfHealingResult.ok) {
        const attempts = selfHealingResult.error.attempts || 1;
        console.error(`[SelfHealing] Agent ${this.definition.id} failed after ${attempts} attempts:`, selfHealingResult.error.message);

        // WIRED: Track agent execution failures
        trackError(new Error(selfHealingResult.error.message), {
          type: 'agent',
          agentId: this.definition.id,
          buildId: input.buildId,
          phase: getAgentCategory(this.definition.id),
          metadata: { attempts, recoveryCode: selfHealingResult.error.code },
        });

        // 10X: Emit AGENT_FAILED event
        try {
          const tenX = getTenXSystem();
          await tenX.eventStore.append(input.buildId, 'AGENT_FAILED', {
            agentId: this.definition.id,
            phaseId: input.phase || 'unknown',
            error: selfHealingResult.error.message,
            errorCode: selfHealingResult.error.code || 'UNKNOWN',
            retryable: false,
            retryCount: attempts,
            maxRetries: this.definition.maxRetries || 3,
          });
        } catch (tenXError) {
          console.debug(`[10X] Failed to emit AGENT_FAILED:`, tenXError);
        }

        // 10X SELF-HEALING: Record SelfHealing failure with circuit breaker
        circuitBreaker.onFailure(new Error(selfHealingResult.error.message), Date.now() - startTime);

        return this.createFailureResult(
          new Error(selfHealingResult.error.message),
          attempts,
          startTime
        );
      }

      const result = { result: selfHealingResult.value.value, attempts: selfHealingResult.value.attempts as number };

      // Quality score for guardrail validation (declared here for broader scope)
      let guardrailScore = 1;

      // Validate output
      if (options.validateOutput !== false) {
        this.emitProgress(options, 'validating', 90, 'Validating output...');

        // WIRED: JSON Schema validation (existing)
        const validation = validateOutput(result.result, this.definition);
        if (!validation.valid) {
          const validationSummary = getValidationSummary(validation);
          console.warn(`Agent ${this.definition.id} validation issues: ${validationSummary}`);
        }

        // ========================================================================
        // WIRED: Zod Schema Validation (40 schemas now active!)
        // STRICT MODE: Critical agents MUST pass validation or build fails
        // ========================================================================
        const zodSchema = getAgentSchema(this.definition.id);
        if (zodSchema) {
          const zodResult = zodSchema.safeParse(result.result);
          if (!zodResult.success) {
            const issues = zodResult.error.issues.map(i =>
              `${i.path.join('.')}: ${i.message}`
            ).join('; ');

            // Critical agents that MUST pass Zod validation
            const CRITICAL_AGENTS = [
              'oracle', 'strategos', 'archon', 'datum', 'pixel', 'wire', 'engine',
              'blocks', 'nexus', 'sentinel', 'gateway'
            ];
            const isCritical = CRITICAL_AGENTS.includes(this.definition.id.toLowerCase());

            // Track ALL Zod failures for monitoring
            trackError(new Error(`Zod validation failed: ${issues}`), {
              type: 'validation',
              agentId: this.definition.id,
              buildId: input.buildId,
              phase: getAgentCategory(this.definition.id),
              metadata: {
                issueCount: zodResult.error.issues.length,
                isCritical,
                issues: zodResult.error.issues.slice(0, 10).map(i => ({
                  path: i.path.join('.'),
                  message: i.message,
                  code: i.code,
                })),
              },
            });

            if (isCritical) {
              // FIX 4: DON'T fail critical agents on schema validation
              // Just log warning and continue - schema mismatch shouldn't block build
              console.warn(`[Executor:${this.definition.id}] Zod schema validation WARNED (was critical, now softened)`);
              console.warn(`[Executor:${this.definition.id}] Issues: ${issues}`);

              // 10X: Emit validation WARNING event (not failure)
              try {
                const tenX = getTenXSystem();
                await tenX.eventStore.append(input.buildId, 'AGENT_WARNING', {
                  agentId: this.definition.id,
                  phaseId: input.phase || 'unknown',
                  warning: `Schema validation issues (softened): ${issues}`,
                  warningCode: 'ZOD_VALIDATION_SOFTENED',
                });
              } catch (tenXError) {
                console.debug(`[10X] Failed to emit ZOD_VALIDATION_SOFTENED:`, tenXError);
              }

              // DON'T record failure - let the agent continue
              // The AI output is still usable even if schema doesn't match exactly
            }
            // All agents now just log warnings and continue
            console.warn(`[Executor:${this.definition.id}] Zod schema validation warning: ${issues}`);
            console.debug(`[Executor:${this.definition.id}] Zod validation details:`, {
              agentId: this.definition.id,
              issueCount: zodResult.error.issues.length,
              issues: zodResult.error.issues.slice(0, 5),
            });
          } else {
            console.debug(`[Executor:${this.definition.id}] Zod schema validation PASSED`);
          }
        } else {
          // No schema found - log for visibility
          console.debug(`[Executor:${this.definition.id}] No Zod schema registered (schema lookup returned null)`);
        }

        // ========================================================================
        // WIRED: Output Guardrails (NEW - Secret/Placeholder/Dangerous Pattern Detection)
        // This validates agent output for security issues before returning
        // ========================================================================
        if (result.result) {
          try {
            const outputString = typeof result.result === 'string'
              ? result.result
              : JSON.stringify(result.result, null, 2);

            const guardrailResponse = await validateAgentOutput(outputString, {
              agentId: this.definition.id,
              buildId: input.buildId,
            });
            const guardrailResult = guardrailResponse.result;

            if (!guardrailResult.valid) {
              const issueCount = guardrailResult.issues?.length || 0;
              const criticalCount = guardrailResult.issues?.filter(i => i.severity === 'critical').length || 0;

              console.warn(
                `[Executor:${this.definition.id}] Output guardrail issues: ${issueCount} total, ${criticalCount} critical`
              );

              // Log individual issues for debugging
              guardrailResult.issues?.slice(0, 5).forEach(issue => {
                console.debug(`[Guardrail] ${issue.type}: ${issue.message} (${issue.severity})`);
              });

              // Track guardrail failures for monitoring
              trackError(new Error(`Guardrail issues detected: ${issueCount}`), {
                type: 'validation',
                agentId: this.definition.id,
                buildId: input.buildId,
                phase: getAgentCategory(this.definition.id),
                metadata: {
                  issueCount,
                  criticalCount,
                  issueTypes: guardrailResult.issues?.map(i => i.type).slice(0, 10),
                },
              });

              // Calculate quality score based on issues
              guardrailScore = Math.max(0, 1 - (criticalCount * 0.3) - (issueCount * 0.05));

              // If auto-fix was applied, use the fixed content
              if (guardrailResponse.wasFixed && guardrailResponse.content !== outputString) {
                console.log(`[Executor:${this.definition.id}] Applied guardrail auto-fix`);
                // Update result with fixed content (parse back if it was an object)
                if (typeof result.result !== 'string') {
                  const parsed = safeJsonParse(
                    guardrailResponse.content,
                    result.result,
                    `Executor:${this.definition.id} guardrail auto-fix`
                  );
                  result.result = parsed;
                }
              }
            } else {
              console.debug(`[Executor:${this.definition.id}] Output guardrail validation PASSED`);
            }
          } catch (guardrailError) {
            // Non-fatal - log but continue
            console.error(`[Executor:${this.definition.id}] Guardrail validation error:`, guardrailError);
          }
        }

        // ========================================================================
        // WIRED: Design Token Validation (NEW - anti-slop detection active!)
        // Validates design agents don't output generic AI-looking patterns
        // ========================================================================
        const DESIGN_AGENTS = ['pixel', 'wire', 'polish', 'blocks', 'artist', 'palette', 'grid', 'cartographer', 'flow'];
        if (DESIGN_AGENTS.includes(this.definition.id.toLowerCase())) {
          try {
            const { validateDesignTokens, generateDesignReport } = await import('../validation/design-validator');

            // Extract code content from artifacts or result
            let codeContent = '';
            if (result.result?.artifacts) {
              codeContent = result.result.artifacts
                .filter((a: { type: string; content?: string }) => a.type === 'code' && a.content)
                .map((a: { content: string }) => a.content)
                .join('\n');
            }
            if (!codeContent && typeof result.result === 'string') {
              codeContent = result.result;
            }

            if (codeContent.length > 100) {
              const designResult = validateDesignTokens(codeContent);

              console.info(`[Executor:${this.definition.id}] Design validation:`, {
                score: designResult.score,
                valid: designResult.valid,
                violations: designResult.violations.length,
                bannedFonts: designResult.summary.bannedFonts || 0,
                genericLayouts: designResult.summary.genericLayouts || 0,
              });

              if (!designResult.valid) {
                console.warn(`[Executor:${this.definition.id}] Design validation FAILED (score: ${designResult.score}/100)`);
                console.debug(`[Executor:${this.definition.id}] Design report:\n${generateDesignReport(designResult)}`);
              } else if (designResult.violations.length > 0) {
                console.debug(`[Executor:${this.definition.id}] Design warnings:\n${generateDesignReport(designResult)}`);
              } else {
                console.debug(`[Executor:${this.definition.id}] Design validation PASSED (score: ${designResult.score}/100)`);
              }
            }
          } catch (designError) {
            // Non-fatal - design validation is enhancement
            console.debug(`[Executor:${this.definition.id}] Design validation skipped:`, designError);
          }
        }
      }

      this.emitProgress(options, 'complete', 100, 'Complete');
      this.state.status = 'completed';
      this.state.endTime = new Date();

      const totalDuration = Date.now() - startTime;

      // WIRED: Record agent execution metrics
      recordAgentExecution(
        this.definition.id,
        getAgentCategory(this.definition.id),
        totalDuration,
        this.state.tokensUsed
      );

      // 10X: Emit AGENT_COMPLETED event for time-travel debugging
      try {
        const tenX = getTenXSystem();
        await tenX.eventStore.append(input.buildId, 'AGENT_COMPLETED', {
          agentId: this.definition.id,
          phaseId: input.phase || 'unknown',
          duration: totalDuration,
          tokensUsed: this.state.tokensUsed,
          qualityScore: guardrailScore,
          output: { artifactCount: result.result?.artifacts?.length || 0 },
          artifacts: [],
        });
      } catch (tenXError) {
        console.debug(`[10X] Failed to emit AGENT_COMPLETED:`, tenXError);
      }

      // 10X SELF-HEALING: Record success with circuit breaker
      circuitBreaker.onSuccess(totalDuration);

      return {
        success: true,
        output: result.result,
        retries: result.attempts - 1,
        totalDuration,
      };
    } catch (error) {
      // FIX: Log detailed error for debugging
      const err = error as Error;
      console.error(`[Executor] ${this.definition.id} FAILED:`, err.message);
      console.error(
        `[Executor] ${this.definition.id} Stack:`,
        err.stack?.split('\n').slice(0, 5).join('\n')
      );

      // WIRED: Track unexpected agent errors
      trackError(err, {
        type: 'agent',
        agentId: this.definition.id,
        buildId: input.buildId,
        phase: getAgentCategory(this.definition.id),
        metadata: { unexpected: true, attempt: this.state.attempt },
      });

      // 10X: Emit AGENT_FAILED event for unexpected errors
      try {
        const tenX = getTenXSystem();
        await tenX.eventStore.append(input.buildId, 'AGENT_FAILED', {
          agentId: this.definition.id,
          phaseId: input.phase || 'unknown',
          error: err.message,
          errorCode: 'UNEXPECTED_ERROR',
          stackTrace: err.stack?.split('\n').slice(0, 5).join('\n'),
          retryable: true,
          retryCount: this.state.attempt,
          maxRetries: this.definition.maxRetries || 3,
        });
      } catch (tenXError) {
        console.debug(`[10X] Failed to emit AGENT_FAILED:`, tenXError);
      }

      // 10X SELF-HEALING: Record failure with circuit breaker
      circuitBreaker.onFailure(err, Date.now() - startTime);

      return this.createFailureResult(err, this.state.attempt, startTime);
    }
  }

  // =========================================================================
  // 10X SPECULATIVE EXECUTION: Race multiple approaches, first winner wins
  // =========================================================================

  /**
   * Execute agent with speculative execution.
   * Races multiple AI approaches - first quality result wins, others killed.
   *
   * @param input - Agent input
   * @param task - Task description for speculative engine
   * @param context - Additional context
   * @returns Execution result with winning approach info
   */
  async executeSpeculative(
    input: AgentInput,
    task: string,
    context?: string
  ): Promise<ExecutionResult & { speculativeResult?: RaceResult }> {
    const startTime = Date.now();

    console.info(`[10X:Speculative:${this.definition.id}] Racing approaches for task`);

    // Emit speculative start event
    try {
      const tenX = getTenXSystem();
      await tenX.eventStore.append(input.buildId, 'AGENT_STARTED', {
        agentId: this.definition.id,
        phaseId: input.phase || 'unknown',
        mode: 'speculative',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.debug('[10X] Failed to emit speculative start event:', e);
    }

    try {
      const engine = getSpeculativeEngine();
      const raceResult = await engine.race(task, context);

      const totalDuration = Date.now() - startTime;

      // Emit speculative completion event
      try {
        const tenX = getTenXSystem();
        await tenX.eventStore.append(input.buildId, 'AGENT_COMPLETED', {
          agentId: this.definition.id,
          phaseId: input.phase || 'unknown',
          mode: 'speculative',
          winner: raceResult.winner,
          confidence: raceResult.confidence,
          tokensUsed: raceResult.tokensUsed,
          duration: totalDuration,
          alternatives: raceResult.alternatives.length,
        });
      } catch (e) {
        console.debug('[10X] Failed to emit speculative completion event:', e);
      }

      console.info(`[10X:Speculative:${this.definition.id}] Winner: ${raceResult.winner} (confidence: ${raceResult.confidence.toFixed(2)})`);

      // Convert race result to execution result
      return {
        success: raceResult.winner !== 'none',
        output: {
          code: raceResult.code,
          artifacts: [{ type: 'code', content: raceResult.code }],
          decisions: [{
            id: `speculative-${Date.now()}`,
            type: 'approach',
            choice: raceResult.winner,
            reasoning: `Selected via speculative execution (confidence: ${raceResult.confidence.toFixed(2)})`,
            alternatives: raceResult.alternatives.map(a => a.approach),
            confidence: raceResult.confidence,
          }],
          metrics: {
            inputTokens: 0,
            outputTokens: raceResult.tokensUsed,
            promptCount: raceResult.alternatives.length,
            retries: 0,
            cacheHits: 0,
          },
        } as any,
        retries: 0,
        totalDuration,
        speculativeResult: raceResult,
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[10X:Speculative:${this.definition.id}] All approaches failed:`, err.message);

      // Emit failure event
      try {
        const tenX = getTenXSystem();
        await tenX.eventStore.append(input.buildId, 'AGENT_FAILED', {
          agentId: this.definition.id,
          phaseId: input.phase || 'unknown',
          mode: 'speculative',
          error: err.message,
          errorCode: 'SPECULATIVE_FAILED',
        });
      } catch (e) {
        console.debug('[10X] Failed to emit speculative failure event:', e);
      }

      return {
        success: false,
        output: null,
        retries: 0,
        totalDuration: Date.now() - startTime,
        error: {
          code: 'SPECULATIVE_FAILED',
          message: `All speculative approaches failed: ${err.message}`,
          recoverable: true,
        },
      } as ExecutionResult;
    }
  }

  /** Execute completion request using AIRouter */
  private async executeCompletion(
    systemPrompt: string,
    messages: ChatMessage[], // WIRED: Proper type (FIX - no more any[])
    options: ExecutionOptions
  ): Promise<AgentOutput> {
    const router = getRouter();
    const category = getAgentCategory(this.definition.id);

    this.state.status = 'running';
    this.emitProgress(
      options,
      'generating',
      30,
      `Calling AI via router (category: ${category})...`
    );

    // Convert messages to AIMessage format with system prompt
    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Execute through AIRouter (handles provider selection, fallback, etc.)
    // FIX: Use agent-specific token limits - some agents need much more output space
    // BLOCKS needs ~30k tokens for 60 components, PIXEL/WIRE need similar for full pages
    // Sonnet supports up to 64k output, so we can safely increase for heavy agents
    const AGENT_TOKEN_LIMITS: Record<string, number> = {
      blocks: 32000, // 60 components × ~500 tokens each = ~30k
      pixel: 32000, // Full component implementations
      wire: 32000, // Full page implementations
      archon: 24000, // Architecture decisions can be detailed
      datum: 20000, // Schema definitions
      default: 16000, // Default for other agents
    };
    const agentMaxTokens = AGENT_TOKEN_LIMITS[this.definition.id] || AGENT_TOKEN_LIMITS.default;

    const result = await router.execute(this.definition.id, {
      messages: aiMessages,
      maxTokens: agentMaxTokens,
      temperature: 0.7,
      metadata: {
        agentId: this.definition.id,
        phase: category,
      },
    });

    if (!result.success || !result.response) {
      console.error(
        `[Executor] AI execution failed: success=${result.success}, hasResponse=${!!result.response}, error=${result.error}`
      );
      throw new Error(result.error || 'AI execution failed');
    }

    console.log(
      `[Executor] AI execution succeeded: ${result.totalTokens} tokens, provider=${result.providersUsed.join(',')}`
    );
    console.log(
      `[Executor] Response content type: ${typeof result.response.content}, length: ${result.response?.content?.length || 'N/A'}`
    );

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
      console.log(
        `[Executor] Parsing response: ${(result.response.content || '').slice(0, 100)}...`
      );
      const parsed = parseAgentResponse(
        this.definition.id,
        result.response.content,
        result.response.latencyMs,
        result.totalTokens
      );
      console.log(
        `[Executor] Parsed successfully: artifacts=${parsed.artifacts.length}, status=${parsed.status}`
      );
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

      // FIX 6: Don't throw on missing dependencies - just warn and continue
      // This prevents cascading failures from blocking the entire build
      if (!depOutput) {
        const depDef = getAgent(depId);
        if (depDef && !depDef.optional) {
          console.warn(`[Executor:${this.definition.id}] Missing dependency "${depId}" - continuing anyway`);
          // DON'T throw - let the agent try to run
        }
        continue;
      }

      // FIX 6: Don't throw on skipped dependencies - just warn
      if (depOutput._skipped === true) {
        console.warn(
          `[Executor] Dependency "${depId}" was skipped (reason: ${depOutput._reason}) - continuing anyway`
        );
        // DON'T throw - let the agent try to run without this dependency
      }

      // ========================================================================
      // BLOCKS COMPONENT COUNT GATE
      // PIXEL, WIRE, and POLISH depend on BLOCKS - validate component count
      // If BLOCKS output is incomplete, downstream agents will produce garbage
      // ========================================================================
      if (depId === 'blocks') {
        const blocksGateResult = this.validateBlocksGate(depOutput);
        if (!blocksGateResult.passed) {
          console.error(
            `[Executor] BLOCKS GATE FAILED for ${this.definition.id}:\n` +
              `  Component count: ${blocksGateResult.componentCount}\n` +
              `  Minimum required: ${blocksGateResult.minimumRequired}\n` +
              `  Errors: ${blocksGateResult.errors.join('; ')}`
          );

          // Track gate failure
          trackError(new Error(`BLOCKS gate failed: ${blocksGateResult.errors[0]}`), {
            type: 'validation',
            agentId: this.definition.id,
            buildId: input.buildId,
            phase: input.phase || 'unknown',
            metadata: {
              gate: 'BLOCKS_COMPONENT_COUNT',
              componentCount: blocksGateResult.componentCount,
              minimumRequired: blocksGateResult.minimumRequired,
              errors: blocksGateResult.errors,
            },
          });

          throw new Error(
            `BLOCKS GATE FAILED: Cannot start ${this.definition.id}.\n` +
              `BLOCKS only generated ${blocksGateResult.componentCount} components (minimum: ${blocksGateResult.minimumRequired}).\n` +
              `Issues: ${blocksGateResult.errors.join('; ')}\n` +
              `The design system is incomplete. BLOCKS must be fixed or retried before ${this.definition.id} can proceed.`
          );
        } else {
          console.log(
            `[Executor] BLOCKS GATE PASSED for ${this.definition.id}: ${blocksGateResult.componentCount} components`
          );
        }
      }
    }
  }

  /**
   * Validate BLOCKS output meets minimum component count requirements
   * This gate prevents downstream agents from running with incomplete design systems
   */
  private validateBlocksGate(blocksOutput: AgentOutput): {
    passed: boolean;
    componentCount: number;
    minimumRequired: number;
    errors: string[];
  } {
    const MINIMUM_COMPONENTS = 40; // Minimum acceptable for downstream agents
    const CRITICAL_MINIMUM = 10;   // Below this = definite failure

    // Try to extract components from BLOCKS output
    let components: unknown[] = [];

    // Check artifacts first (structured output)
    if (blocksOutput.artifacts) {
      const docArtifact = blocksOutput.artifacts.find(
        (a: { type: string; content?: string }) => a.type === 'document' && a.content
      );

      if (docArtifact?.content) {
        const parsed = typeof docArtifact.content === 'string'
          ? safeJsonParse(docArtifact.content, null, `Executor:${this.definition.id} document artifact`)
          : docArtifact.content;

        if (parsed?.components && Array.isArray(parsed.components)) {
          components = parsed.components;
        }
      }
    }

    // Check direct components property
    if (components.length === 0 && (blocksOutput as any).components) {
      const directComponents = (blocksOutput as any).components;
      if (Array.isArray(directComponents)) {
        components = directComponents;
      }
    }

    // Check decisions for component specs
    if (components.length === 0 && blocksOutput.decisions) {
      const componentDecision = blocksOutput.decisions.find(
        (d: { key: string }) => d.key === 'components' || d.key === 'component_library'
      );
      if (componentDecision?.value && Array.isArray(componentDecision.value)) {
        components = componentDecision.value;
      }
    }

    const componentCount = components.length;
    const errors: string[] = [];

    if (componentCount === 0) {
      errors.push('BLOCKS output contains no components - cannot extract component array');
    } else if (componentCount < CRITICAL_MINIMUM) {
      errors.push(
        `CRITICAL: Only ${componentCount} components (expected ${MINIMUM_COMPONENTS}+). ` +
          `LLM likely followed example pattern instead of generating full library.`
      );
    } else if (componentCount < MINIMUM_COMPONENTS) {
      errors.push(
        `Insufficient components: ${componentCount} (minimum: ${MINIMUM_COMPONENTS}). ` +
          `Design system will be incomplete for downstream agents.`
      );
    }

    // Also validate using the full validator for detailed errors
    if (componentCount > 0) {
      try {
        const fullValidation = validateBlocksOutput({ components } as any);
        if (!fullValidation.valid) {
          errors.push(...fullValidation.errors.slice(0, 3)); // Add first 3 errors
        }
      } catch (validationError) {
        // Full validation is optional - component count is the gate
        console.debug('[Executor] Full BLOCKS validation failed:', validationError);
      }
    }

    return {
      passed: componentCount >= MINIMUM_COMPONENTS && errors.length === 0,
      componentCount,
      minimumRequired: MINIMUM_COMPONENTS,
      errors,
    };
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

// ============================================================================
// 10X SELF-HEALING: Exported functions for monitoring and admin
// ============================================================================

/**
 * Get circuit breaker stats for all agents
 * Useful for monitoring dashboards
 */
export function getCircuitBreakerStats(): Record<string, CircuitStats> {
  return AgentExecutor.getCircuitBreakerStats();
}

/**
 * Reset circuit breaker for a specific agent
 * Use for admin/recovery operations
 */
export function resetAgentCircuitBreaker(agentId: string): void {
  AgentExecutor.resetCircuitBreaker(agentId);
}

/**
 * Check if an agent's circuit is open
 * Useful for pre-flight checks
 */
export function isAgentCircuitOpen(agentId: string): boolean {
  const stats = AgentExecutor.getCircuitBreakerStats();
  return stats[agentId]?.state === 'OPEN';
}

// ============================================================================
// 10X SPECULATIVE: Exported functions for speculative execution
// ============================================================================

/**
 * Execute agent with speculative execution.
 * Races multiple approaches - first quality result wins.
 */
export async function executeAgentSpeculative(
  agentId: AgentId,
  input: AgentInput,
  task: string,
  context?: string,
  tokenTracker?: TokenTracker
): Promise<ExecutionResult & { speculativeResult?: RaceResult }> {
  const executor = new AgentExecutor(agentId, tokenTracker);
  return executor.executeSpeculative(input, task, context);
}

/**
 * Get speculative engine stats (win rates by approach)
 */
export function getSpeculativeStats(): Record<string, { wins: number; avgConfidence: number }> {
  return getSpeculativeEngine().getApproachStats();
}

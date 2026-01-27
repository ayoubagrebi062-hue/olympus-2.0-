/**
 * ============================================================================
 * REAL CONDUCTOR - THE ONE THAT ACTUALLY WORKS
 * ============================================================================
 *
 * No more simulations. Real LLM calls. Real execution.
 *
 * ============================================================================
 */

import { EventEmitter } from 'events';
import {
  AgentExecutor,
  AgentOutput,
  LLMConfig,
  createAgentExecutor,
  BUILT_IN_AGENTS,
  PromptVariables,
} from './llm-executor';

// ============================================================================
// TYPES
// ============================================================================

export interface RealConductorConfig {
  llm: LLMConfig;
  maxConcurrency: number;
  qualityThreshold: number;
  tokenBudget: number;
  timeBudget: number;
}

export interface BuildRequest {
  task: string;
  projectContext: ProjectContext;
  options?: BuildOptions;
}

export interface ProjectContext {
  type: string;
  rootPath: string;
  existingFiles: FileInfo[];
  styleGuide?: string;
  dependencies?: string[];
}

export interface FileInfo {
  path: string;
  content: string;
  type: 'component' | 'util' | 'hook' | 'type' | 'config' | 'test' | 'other';
}

export interface BuildOptions {
  phases?: string[];
  skipTests?: boolean;
  skipReview?: boolean;
  streaming?: boolean;
}

export interface BuildResult {
  success: boolean;
  buildId: string;
  phases: PhaseResult[];
  artifacts: Map<string, string>;
  metrics: BuildMetrics;
  errors: string[];
  warnings: string[];
}

export interface PhaseResult {
  name: string;
  success: boolean;
  agentOutputs: Map<string, AgentOutput>;
  duration: number;
  tokensUsed: number;
}

export interface BuildMetrics {
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  qualityScore: number;
  phaseBreakdown: Map<string, { duration: number; tokens: number }>;
}

// ============================================================================
// REAL CONDUCTOR
// ============================================================================

export class RealConductor extends EventEmitter {
  private config: RealConductorConfig;
  private executor: AgentExecutor;
  private activeBuilds: Map<string, BuildState> = new Map();

  constructor(config: RealConductorConfig) {
    super();
    this.config = config;
    this.executor = createAgentExecutor(config.llm);
  }

  /**
   * Execute a build with REAL LLM calls
   */
  async build(request: BuildRequest): Promise<BuildResult> {
    const buildId = this.generateBuildId();
    const startTime = Date.now();

    const state: BuildState = {
      buildId,
      status: 'running',
      request,
      phases: [],
      artifacts: new Map(),
      tokensUsed: 0,
      errors: [],
      warnings: [],
    };

    this.activeBuilds.set(buildId, state);
    this.emit('build_started', { buildId, task: request.task });

    try {
      // Determine phases
      const phases = this.determinePhases(request);

      // Execute each phase
      for (const phase of phases) {
        if (state.tokensUsed >= this.config.tokenBudget) {
          state.warnings.push('Token budget exceeded, stopping early');
          break;
        }

        const phaseResult = await this.executePhase(state, phase);
        state.phases.push(phaseResult);

        if (!phaseResult.success) {
          state.errors.push(`Phase ${phase} failed`);
          if (phase === 'discovery' || phase === 'implementation') {
            // Critical phase failed, stop
            break;
          }
        }
      }

      // Calculate final metrics
      const metrics = this.calculateMetrics(state, startTime);

      // Determine success
      const success =
        state.errors.length === 0 ||
        (state.artifacts.size > 0 && metrics.qualityScore >= this.config.qualityThreshold);

      state.status = success ? 'completed' : 'failed';
      this.emit('build_completed', { buildId, success });

      return {
        success,
        buildId,
        phases: state.phases,
        artifacts: state.artifacts,
        metrics,
        errors: state.errors,
        warnings: state.warnings,
      };
    } catch (error) {
      state.status = 'failed';
      state.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('build_failed', { buildId, error });

      return {
        success: false,
        buildId,
        phases: state.phases,
        artifacts: state.artifacts,
        metrics: this.calculateMetrics(state, startTime),
        errors: state.errors,
        warnings: state.warnings,
      };
    } finally {
      this.activeBuilds.delete(buildId);
    }
  }

  /**
   * Stream a build with real-time output
   */
  async *buildStream(request: BuildRequest): AsyncGenerator<BuildStreamEvent> {
    const buildId = this.generateBuildId();
    const startTime = Date.now();

    yield { type: 'start', buildId, task: request.task };

    const state: BuildState = {
      buildId,
      status: 'running',
      request,
      phases: [],
      artifacts: new Map(),
      tokensUsed: 0,
      errors: [],
      warnings: [],
    };

    try {
      const phases = this.determinePhases(request);

      for (const phase of phases) {
        yield { type: 'phase_start', phase };

        const phaseResult = await this.executePhaseWithStreaming(
          state,
          phase,
          async function* (event) {
            yield event;
          }
        );

        state.phases.push(phaseResult);

        yield {
          type: 'phase_complete',
          phase,
          success: phaseResult.success,
          tokensUsed: phaseResult.tokensUsed,
        };

        if (!phaseResult.success && (phase === 'discovery' || phase === 'implementation')) {
          break;
        }
      }

      const metrics = this.calculateMetrics(state, startTime);
      const success = state.errors.length === 0;

      yield {
        type: 'complete',
        success,
        artifacts: state.artifacts,
        metrics,
        errors: state.errors,
      };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // =========================================================================
  // PRIVATE - PHASE EXECUTION
  // =========================================================================

  private determinePhases(request: BuildRequest): string[] {
    if (request.options?.phases) {
      return request.options.phases;
    }

    // Default phase sequence
    const phases = ['discovery', 'implementation'];

    if (!request.options?.skipTests) {
      phases.push('testing');
    }

    if (!request.options?.skipReview) {
      phases.push('review');
    }

    return phases;
  }

  private async executePhase(state: BuildState, phase: string): Promise<PhaseResult> {
    const startTime = Date.now();
    const agentOutputs = new Map<string, AgentOutput>();
    let totalTokens = 0;

    this.emit('phase_started', { buildId: state.buildId, phase });

    try {
      // Get agents for this phase
      const agents = this.getAgentsForPhase(phase);

      for (const agentId of agents) {
        // Build input for agent
        const input = this.buildAgentInput(state, agentId, phase);

        // Execute agent
        this.emit('agent_started', { buildId: state.buildId, phase, agentId });

        const output = await this.executor.execute(agentId, input);
        agentOutputs.set(agentId, output);
        totalTokens += output.tokensUsed;
        state.tokensUsed += output.tokensUsed;

        this.emit('agent_completed', {
          buildId: state.buildId,
          phase,
          agentId,
          success: output.success,
          tokensUsed: output.tokensUsed,
        });

        // Store artifacts
        if (output.success && output.data) {
          this.storeArtifact(state, phase, agentId, output);
        }

        // Collect warnings
        state.warnings.push(...output.warnings);

        // Stop phase if critical agent failed
        if (!output.success && this.isCriticalAgent(agentId)) {
          state.errors.push(`Critical agent ${agentId} failed: ${output.errors.join(', ')}`);
          break;
        }
      }

      const success = !agents.some(agentId => {
        const output = agentOutputs.get(agentId);
        return this.isCriticalAgent(agentId) && (!output || !output.success);
      });

      this.emit('phase_completed', { buildId: state.buildId, phase, success });

      return {
        name: phase,
        success,
        agentOutputs,
        duration: Date.now() - startTime,
        tokensUsed: totalTokens,
      };
    } catch (error) {
      this.emit('phase_failed', { buildId: state.buildId, phase, error });

      return {
        name: phase,
        success: false,
        agentOutputs,
        duration: Date.now() - startTime,
        tokensUsed: totalTokens,
      };
    }
  }

  private async executePhaseWithStreaming(
    state: BuildState,
    phase: string,
    _onEvent: (event: BuildStreamEvent) => AsyncGenerator<BuildStreamEvent>
  ): Promise<PhaseResult> {
    // For streaming, we use the regular execution but emit events
    // A full streaming implementation would use executor.executeStream
    return this.executePhase(state, phase);
  }

  private getAgentsForPhase(phase: string): string[] {
    const phaseAgents: Record<string, string[]> = {
      discovery: ['oracle'],
      implementation: ['scribe'],
      testing: ['guardian'],
      review: ['critic'],
    };

    return phaseAgents[phase] || [];
  }

  private buildAgentInput(
    state: BuildState,
    agentId: string,
    phase: string
  ): { variables: PromptVariables; previousOutputs: Map<string, unknown> } {
    const variables: PromptVariables = {};
    const previousOutputs = new Map<string, unknown>();

    // Base variables
    variables.task = state.request.task;
    variables.projectContext = JSON.stringify(state.request.projectContext, null, 2);
    variables.existingFiles = state.request.projectContext.existingFiles
      .map(f => `${f.path}:\n${f.content}`)
      .join('\n\n---\n\n');
    variables.styleGuide =
      state.request.projectContext.styleGuide || 'Follow standard TypeScript/React best practices';

    // Phase-specific variables
    switch (phase) {
      case 'implementation':
        // Get analysis from discovery phase
        const discoveryPhase = state.phases.find(p => p.name === 'discovery');
        if (discoveryPhase) {
          const oracleOutput = discoveryPhase.agentOutputs.get('oracle');
          if (oracleOutput?.success) {
            variables.analysisResult = JSON.stringify(oracleOutput.data, null, 2);
            previousOutputs.set('oracle', oracleOutput.data);
          }
        }
        break;

      case 'testing':
        // Get code from implementation phase
        const implPhase = state.phases.find(p => p.name === 'implementation');
        if (implPhase) {
          const scribeOutput = implPhase.agentOutputs.get('scribe');
          if (scribeOutput?.success) {
            variables.codeToTest = scribeOutput.data as string;
            variables.purpose = state.request.task;
            variables.coverageRequirements = 'Cover happy path, error cases, and edge cases';
            previousOutputs.set('scribe', scribeOutput.data);
          }
        }
        break;

      case 'review':
        // Get all code artifacts
        const allCode: string[] = [];
        for (const [key, value] of state.artifacts) {
          if (key.includes('code') || key.includes('implementation')) {
            allCode.push(value);
          }
        }
        variables.code = allCode.join('\n\n---\n\n');
        variables.requirements = state.request.task;
        variables.context = JSON.stringify(state.request.projectContext, null, 2);
        break;
    }

    return { variables, previousOutputs };
  }

  private storeArtifact(
    state: BuildState,
    phase: string,
    agentId: string,
    output: AgentOutput
  ): void {
    const key = `${phase}:${agentId}`;

    if (typeof output.data === 'string') {
      state.artifacts.set(key, output.data);
    } else if (output.data) {
      state.artifacts.set(key, JSON.stringify(output.data, null, 2));
    }

    // Also store raw output
    if (output.raw) {
      state.artifacts.set(`${key}:raw`, output.raw);
    }
  }

  private isCriticalAgent(agentId: string): boolean {
    return ['oracle', 'scribe'].includes(agentId);
  }

  // =========================================================================
  // PRIVATE - METRICS
  // =========================================================================

  private calculateMetrics(state: BuildState, startTime: number): BuildMetrics {
    const phaseBreakdown = new Map<string, { duration: number; tokens: number }>();

    for (const phase of state.phases) {
      phaseBreakdown.set(phase.name, {
        duration: phase.duration,
        tokens: phase.tokensUsed,
      });
    }

    // Calculate quality score from review phase if available
    let qualityScore = 0.5; // Default if no review
    const reviewPhase = state.phases.find(p => p.name === 'review');
    if (reviewPhase) {
      const criticOutput = reviewPhase.agentOutputs.get('critic');
      if (criticOutput?.success && criticOutput.data) {
        const reviewData = criticOutput.data as { qualityScore?: number };
        qualityScore = (reviewData.qualityScore || 5) / 10;
      }
    }

    // Estimate cost (rough approximation)
    const costPerThousandTokens = 0.003; // Varies by model
    const totalCost = (state.tokensUsed / 1000) * costPerThousandTokens;

    return {
      totalDuration: Date.now() - startTime,
      totalTokens: state.tokensUsed,
      totalCost,
      qualityScore,
      phaseBreakdown,
    };
  }

  // =========================================================================
  // PRIVATE - UTILITIES
  // =========================================================================

  private generateBuildId(): string {
    return `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface BuildState {
  buildId: string;
  status: 'running' | 'completed' | 'failed';
  request: BuildRequest;
  phases: PhaseResult[];
  artifacts: Map<string, string>;
  tokensUsed: number;
  errors: string[];
  warnings: string[];
}

export interface BuildStreamEvent {
  type: 'start' | 'phase_start' | 'phase_complete' | 'agent_chunk' | 'complete' | 'error';
  buildId?: string;
  task?: string;
  phase?: string;
  success?: boolean;
  tokensUsed?: number;
  chunk?: string;
  artifacts?: Map<string, string>;
  metrics?: BuildMetrics;
  errors?: string[];
  error?: string;
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRealConductor(config: RealConductorConfig): RealConductor {
  return new RealConductor(config);
}

/**
 * Quick start with sensible defaults
 */
export function createDefaultConductor(apiKey?: string): RealConductor {
  return new RealConductor({
    llm: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
      maxTokens: 4096,
      temperature: 0.3,
      timeout: 60000,
    },
    maxConcurrency: 3,
    qualityThreshold: 0.7,
    tokenBudget: 50000,
    timeBudget: 300000, // 5 minutes
  });
}

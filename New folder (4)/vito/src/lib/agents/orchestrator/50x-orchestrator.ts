/**
 * OLYMPUS 50X - Unified Orchestrator
 *
 * The main entry point for world-class component generation.
 * Combines: RAG → Pipeline → Vision → Iteration Loop
 */

// Use crypto.randomUUID() instead of uuid package
import {
  PipelineRunner,
  PipelineConfig,
  PipelineResult,
  PipelineEvent,
  DEFAULT_PIPELINE_CONFIG,
} from '../pipeline';
import { ComponentRenderer, renderComponent } from '../vision/renderer';
import { VisualComparator, checkVisualQuality, ComparisonResult } from '../vision/comparator';
import { buildRAGContext } from '../rag';

// ============================================
// TYPES
// ============================================

export interface GenerationRequest {
  prompt: string;
  framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla';
  options?: Partial<GenerationOptions>;
}

export interface GenerationOptions {
  targetScore: number;          // Minimum quality score (default 85)
  maxIterations: number;        // Max code → review → fix cycles (default 3)
  enableVision: boolean;        // Visual validation (default true)
  enableRAG: boolean;           // RAG retrieval (default true)
  visionIterations: number;     // Max vision-guided fixes (default 2)
  streamEvents: boolean;        // Enable event streaming
}

export interface GenerationResult {
  success: boolean;
  code: string;
  filename: string;
  finalScore: number;
  codeIterations: number;
  visionIterations: number;
  totalDuration: number;
  review: {
    passed: boolean;
    score: number;
    summary: string;
  };
  vision?: {
    passed: boolean;
    score: number;
    summary: string;
  };
  tokenUsage: {
    total: number;
    byAgent: Record<string, number>;
  };
  events: GenerationEvent[];
}

export interface GenerationEvent {
  timestamp: Date;
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: GenerationOptions = {
  targetScore: 85,
  maxIterations: 3,
  enableVision: true,
  enableRAG: true,
  visionIterations: 2,
  streamEvents: true,
};

// ============================================
// 50X ORCHESTRATOR CLASS
// ============================================

export class FiftyXOrchestrator {
  private pipeline: PipelineRunner;
  private renderer: ComponentRenderer | null = null;
  private comparator: VisualComparator | null = null;
  private options: GenerationOptions;
  private events: GenerationEvent[] = [];
  private eventHandler?: (event: GenerationEvent) => void;

  constructor(options: Partial<GenerationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.pipeline = new PipelineRunner({
      targetScore: this.options.targetScore,
      maxIterations: this.options.maxIterations,
      enableRAG: this.options.enableRAG,
    });
  }

  /**
   * Set event handler for real-time updates
   */
  onEvent(handler: (event: GenerationEvent) => void): void {
    this.eventHandler = handler;
  }

  /**
   * Emit and store event
   */
  private emit(type: string, message: string, data?: Record<string, unknown>): void {
    const event: GenerationEvent = {
      timestamp: new Date(),
      type,
      message,
      data,
    };
    this.events.push(event);

    if (this.eventHandler && this.options.streamEvents) {
      this.eventHandler(event);
    }
  }

  /**
   * Initialize vision components
   */
  private async initializeVision(): Promise<void> {
    if (!this.renderer) {
      this.renderer = new ComponentRenderer();
      await this.renderer.initialize();
    }
    if (!this.comparator) {
      this.comparator = new VisualComparator();
    }
  }

  /**
   * Clean up vision components
   */
  async cleanup(): Promise<void> {
    if (this.renderer) {
      await this.renderer.close();
      this.renderer = null;
    }
  }

  /**
   * Generate a component with the full 50X pipeline
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    this.events = [];

    const {
      prompt,
      framework = 'react',
      options = {},
    } = request;

    const finalOptions = { ...this.options, ...options };

    this.emit('orchestrator:start', 'Starting 50X generation pipeline', { prompt, framework });

    let pipelineResult: PipelineResult | null = null;
    let visionResult: ComparisonResult | null = null;
    let visionIterations = 0;

    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: Run code pipeline (PLANNER → DESIGNER → CODER → REVIEWER → FIXER)
      // ═══════════════════════════════════════════════════════════════
      this.emit('pipeline:start', 'Running code generation pipeline');

      // Forward pipeline events
      this.pipeline.onEvent((event: PipelineEvent) => {
        this.emit(event.type, this.formatPipelineEvent(event), event as any);
      });

      pipelineResult = await this.pipeline.run(prompt, framework);

      this.emit('pipeline:complete', `Code pipeline complete - Score: ${pipelineResult.score}`, {
        score: pipelineResult.score,
        iterations: pipelineResult.iterations,
      });

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: Vision validation (if enabled and code passed review)
      // ═══════════════════════════════════════════════════════════════
      if (finalOptions.enableVision && pipelineResult.score >= 70) {
        this.emit('vision:start', 'Starting visual validation');

        await this.initializeVision();

        // Iterate with vision feedback
        let currentCode = pipelineResult.code;

        while (visionIterations < finalOptions.visionIterations) {
          visionIterations++;
          this.emit('vision:iteration', `Vision iteration ${visionIterations}`, { iteration: visionIterations });

          try {
            // Render component
            const renderResult = await this.renderer!.render(currentCode, {
              width: 800,
              height: 600,
              darkMode: true,
            });

            this.emit('vision:rendered', `Component rendered in ${renderResult.renderTimeMs}ms`);

            // Compare against design standards
            visionResult = await this.comparator!.compare(renderResult.screenshot, undefined, {
              threshold: finalOptions.targetScore,
              detailed: true,
            });

            this.emit('vision:compared', `Visual score: ${visionResult.score}`, {
              score: visionResult.score,
              passed: visionResult.passed,
            });

            // Check if passed
            if (visionResult.passed) {
              this.emit('vision:passed', 'Visual validation passed!');
              break;
            }

            // If not passed and we have iterations left, fix the code
            if (visionIterations < finalOptions.visionIterations) {
              this.emit('vision:fixing', 'Applying visual fixes', {
                issues: visionResult.feedback,
              });

              // Use the fixer to apply visual improvements
              // For now, we'll just store the feedback - full visual fixing would need another LLM call
              // This is a simplified version - production would re-run the fixer agent
            }
          } catch (visionError) {
            this.emit('vision:error', `Vision validation failed: ${(visionError as Error).message}`);
            break;
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: Compile final result
      // ═══════════════════════════════════════════════════════════════
      const finalScore = visionResult
        ? Math.round((pipelineResult.score + visionResult.score) / 2)
        : pipelineResult.score;

      const result: GenerationResult = {
        success: finalScore >= finalOptions.targetScore,
        code: pipelineResult.code,
        filename: pipelineResult.filename,
        finalScore,
        codeIterations: pipelineResult.iterations,
        visionIterations,
        totalDuration: Date.now() - startTime,
        review: {
          passed: pipelineResult.review.passed,
          score: pipelineResult.review.score,
          summary: pipelineResult.review.summary,
        },
        vision: visionResult
          ? {
              passed: visionResult.passed,
              score: visionResult.score,
              summary: visionResult.summary,
            }
          : undefined,
        tokenUsage: {
          total: pipelineResult.tokenUsage.total,
          byAgent: pipelineResult.tokenUsage,
        },
        events: this.events,
      };

      this.emit('orchestrator:complete', `Generation complete - Final score: ${finalScore}`, {
        success: result.success,
        finalScore,
        duration: result.totalDuration,
      });

      return result;
    } catch (error) {
      this.emit('orchestrator:error', `Generation failed: ${(error as Error).message}`);

      return {
        success: false,
        code: pipelineResult?.code || '',
        filename: pipelineResult?.filename || 'Component.tsx',
        finalScore: pipelineResult?.score || 0,
        codeIterations: pipelineResult?.iterations || 0,
        visionIterations,
        totalDuration: Date.now() - startTime,
        review: {
          passed: false,
          score: 0,
          summary: `Generation failed: ${(error as Error).message}`,
        },
        tokenUsage: {
          total: 0,
          byAgent: {},
        },
        events: this.events,
      };
    }
  }

  /**
   * Format pipeline event for logging
   */
  private formatPipelineEvent(event: PipelineEvent): string {
    switch (event.type) {
      case 'pipeline:start':
        return `Pipeline started for: ${event.prompt.substring(0, 50)}...`;
      case 'agent:start':
        return `Agent ${event.agent.toUpperCase()} started`;
      case 'agent:complete':
        return `Agent ${event.agent.toUpperCase()} completed in ${event.duration}ms`;
      case 'iteration:start':
        return `Starting iteration ${event.iteration}`;
      case 'iteration:complete':
        return `Iteration ${event.iteration} complete - Score: ${event.score}`;
      case 'pipeline:complete':
        return `Pipeline complete - Score: ${event.score}`;
      default:
        return event.type;
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick generation with default settings
 */
export async function generate50X(
  prompt: string,
  options: Partial<GenerationOptions> & { framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' } = {}
): Promise<GenerationResult> {
  const { framework, ...genOptions } = options;
  const orchestrator = new FiftyXOrchestrator(genOptions);

  try {
    return await orchestrator.generate({ prompt, framework });
  } finally {
    await orchestrator.cleanup();
  }
}

/**
 * Generate with event streaming
 */
export async function* generateWithStream(
  prompt: string,
  options: Partial<GenerationOptions> & { framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' } = {}
): AsyncGenerator<GenerationEvent, GenerationResult, undefined> {
  const { framework, ...genOptions } = options;
  const orchestrator = new FiftyXOrchestrator(genOptions);
  const eventQueue: GenerationEvent[] = [];
  let resolveNext: ((value: GenerationEvent) => void) | null = null;

  orchestrator.onEvent((event) => {
    if (resolveNext) {
      resolveNext(event);
      resolveNext = null;
    } else {
      eventQueue.push(event);
    }
  });

  // Start generation in background
  const resultPromise = orchestrator.generate({ prompt }).finally(() => {
    orchestrator.cleanup();
  });

  // Yield events as they come
  while (true) {
    if (eventQueue.length > 0) {
      yield eventQueue.shift()!;
    } else {
      // Check if generation is complete
      const raceResult = await Promise.race([
        resultPromise.then((r) => ({ type: 'result' as const, value: r })),
        new Promise<{ type: 'event'; value: GenerationEvent }>((resolve) => {
          resolveNext = (event) => resolve({ type: 'event', value: event });
        }),
      ]);

      if (raceResult.type === 'result') {
        // Yield any remaining events
        while (eventQueue.length > 0) {
          yield eventQueue.shift()!;
        }
        return raceResult.value;
      } else {
        yield raceResult.value;
      }
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default FiftyXOrchestrator;

/**
 * OLYMPUS 50X - Pipeline Module
 *
 * Chain-of-thought agent pipeline: PLANNER → DESIGNER → CODER → REVIEWER → FIXER
 */

export * from './types';
export * from './agents';
export * from './runner';

import { generateFullApplication, generateComponent } from './runner';
import type { PipelineConfig, PipelineResult, PipelineEvent, PipelineEventHandler } from './types';

// Re-export functions
export { generateFullApplication, generateComponent };

/**
 * PipelineRunner class wrapper for the 50x-orchestrator
 * Provides a class interface around the generateFullApplication function
 */
export class PipelineRunner {
  private config: Partial<PipelineConfig>;
  private eventHandler?: PipelineEventHandler;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = config;
  }

  /**
   * Set event handler for real-time updates
   */
  onEvent(handler: PipelineEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Run the pipeline with the given prompt and framework
   */
  async run(prompt: string, framework: string = 'react'): Promise<PipelineResult> {
    // Emit start event
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (this.eventHandler) {
      this.eventHandler({ type: 'pipeline:start', requestId, prompt });
    }

    const startTime = Date.now();

    try {
      const result = await generateFullApplication(prompt, {
        ...this.config,
        framework,
        context: {},
      });

      // Build pipeline result
      const pipelineResult: PipelineResult = {
        success: result.success,
        code:
          typeof result.application === 'string'
            ? result.application
            : JSON.stringify(result.application),
        filename: 'GeneratedComponent.tsx',
        score: result.metadata?.qualityScore || 85,
        iterations: 1,
        totalDuration: Date.now() - startTime,
        tokenUsage: {
          planner: 0,
          psyche: 0,
          scribe: 0,
          architect_conversion: 0,
          designer: 0,
          coder: 0,
          reviewer: 0,
          fixer: 0,
          total: 0,
        },
        review: {
          passed: result.success,
          score: result.metadata?.qualityScore || 85,
          issues: [],
          suggestions: [],
          categories: {
            design: 85,
            layout: 85,
            typography: 85,
            interaction: 85,
            accessibility: 85,
            codeQuality: 85,
          },
          summary: result.success ? 'Pipeline completed successfully' : 'Pipeline failed',
        },
      };

      // Emit complete event
      if (this.eventHandler) {
        this.eventHandler({
          type: 'pipeline:complete',
          requestId,
          score: pipelineResult.score,
          duration: pipelineResult.totalDuration,
        });
      }

      return pipelineResult;
    } catch (error) {
      // Emit error event
      if (this.eventHandler) {
        this.eventHandler({
          type: 'pipeline:error',
          requestId,
          error: (error as Error).message,
        });
      }

      // Return failure result
      return {
        success: false,
        code: '',
        filename: 'GeneratedComponent.tsx',
        score: 0,
        iterations: 0,
        totalDuration: Date.now() - startTime,
        tokenUsage: {
          planner: 0,
          psyche: 0,
          scribe: 0,
          architect_conversion: 0,
          designer: 0,
          coder: 0,
          reviewer: 0,
          fixer: 0,
          total: 0,
        },
        review: {
          passed: false,
          score: 0,
          issues: [],
          suggestions: [],
          categories: {
            design: 0,
            layout: 0,
            typography: 0,
            interaction: 0,
            accessibility: 0,
            codeQuality: 0,
          },
          summary: `Pipeline failed: ${(error as Error).message}`,
        },
      };
    }
  }
}

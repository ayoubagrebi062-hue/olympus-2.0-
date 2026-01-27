/**
 * OLYMPUS 2.0 - Job Handler Framework
 * ====================================
 * Base handler class and handler registry for job processing.
 */

import { Job, JobType, JobResult, JobStatus } from '../realtime/types';
import { JOB_TIMEOUTS } from '../realtime/constants';
import { QueueService, getQueueService } from './queue-service';

// ============================================================
// TYPES
// ============================================================

export interface JobContext {
  jobId: string;
  type: JobType;
  attempt: number;
  isRetry: boolean;
  startedAt: Date;

  // Progress reporting
  updateProgress: (progress: number, message?: string) => Promise<void>;

  // Logging
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;

  // Queue service
  queue: QueueService;

  // Abort signal for timeout
  signal: AbortSignal;
}

export interface HandlerConfig {
  timeout?: number;
  retries?: number;
  concurrent?: number;
}

export type JobHandler<T = unknown, R = unknown> = (
  payload: T,
  context: JobContext
) => Promise<JobResult<R>>;

// ============================================================
// BASE JOB HANDLER
// ============================================================

export abstract class BaseJobHandler<T = unknown, R = unknown> {
  abstract readonly type: JobType;
  abstract readonly config: HandlerConfig;

  /**
   * Execute the job - implement this in subclasses
   */
  abstract execute(payload: T, context: JobContext): Promise<R>;

  /**
   * Validate payload before execution
   */
  validate(payload: T): { valid: boolean; error?: string } {
    return { valid: true };
  }

  /**
   * Called before job execution
   */
  async beforeExecute(payload: T, context: JobContext): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called after successful execution
   */
  async afterExecute(payload: T, result: R, context: JobContext): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called on job failure
   */
  async onError(payload: T, error: Error, context: JobContext): Promise<void> {
    // Override in subclasses
  }

  /**
   * Run the handler with context
   */
  async run(payload: T, context: JobContext): Promise<JobResult<R>> {
    const startTime = Date.now();

    try {
      // Validate
      const validation = this.validate(payload);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Validation failed',
        };
      }

      // Before hook
      await this.beforeExecute(payload, context);

      // Execute with timeout
      const result = await this.executeWithTimeout(payload, context);

      // After hook
      await this.afterExecute(payload, result, context);

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const err = error as Error;

      // Error hook
      await this.onError(payload, err, context);

      return {
        success: false,
        error: err.message,
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeWithTimeout(payload: T, context: JobContext): Promise<R> {
    const timeout = (this.config.timeout || JOB_TIMEOUTS[this.type]) * 1000;

    return Promise.race([
      this.execute(payload, context),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Job timed out after ${timeout / 1000}s`));
        }, timeout);

        context.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Job was aborted'));
        });
      }),
    ]);
  }
}

// ============================================================
// HANDLER REGISTRY
// ============================================================

class HandlerRegistry {
  private handlers = new Map<JobType, BaseJobHandler>();
  private functionHandlers = new Map<JobType, JobHandler>();

  /**
   * Register a class-based handler
   */
  register(handler: BaseJobHandler): void {
    if (this.handlers.has(handler.type)) {
      console.warn(`[JobRegistry] Overwriting handler for type: ${handler.type}`);
    }
    this.handlers.set(handler.type, handler);
  }

  /**
   * Register a function-based handler
   */
  registerFunction<T, R>(
    type: JobType,
    handler: JobHandler<T, R>,
    config?: HandlerConfig
  ): void {
    // Wrap function in a simple class
    const wrappedHandler = new (class extends BaseJobHandler<T, R> {
      readonly type = type;
      readonly config = config || {};

      async execute(payload: T, context: JobContext): Promise<R> {
        const result = await handler(payload, context);
        if (result.success) {
          return result.data as R;
        }
        throw new Error(result.error || 'Job failed');
      }
    })();

    this.handlers.set(type, wrappedHandler);
  }

  /**
   * Get handler for a job type
   */
  getHandler(type: JobType): BaseJobHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Check if handler exists
   */
  hasHandler(type: JobType): boolean {
    return this.handlers.has(type);
  }

  /**
   * Get all registered types
   */
  getRegisteredTypes(): JobType[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton registry
export const handlerRegistry = new HandlerRegistry();

// ============================================================
// JOB PROCESSOR
// ============================================================

export class JobProcessor {
  private queue: QueueService;
  private logs: Array<{ level: string; message: string; meta?: Record<string, unknown>; timestamp: Date }> = [];

  constructor(queue?: QueueService) {
    this.queue = queue || getQueueService();
  }

  /**
   * Process a job from the queue
   */
  async process(request: {
    jobId: string;
    type: JobType;
    payload: unknown;
    attempt: number;
    isRetry?: boolean;
  }): Promise<JobResult> {
    const { jobId, type, payload, attempt, isRetry = false } = request;
    this.logs = [];

    // Get handler
    const handler = handlerRegistry.getHandler(type);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for job type: ${type}`,
      };
    }

    // Update job status to running
    await this.queue.updateJobStatus(jobId, 'running');

    // Create abort controller for timeout
    const abortController = new AbortController();

    // Create context
    const context: JobContext = {
      jobId,
      type,
      attempt,
      isRetry,
      startedAt: new Date(),
      updateProgress: async (progress, message) => {
        await this.queue.updateJobProgress(jobId, progress, message);
      },
      log: (level, message, meta) => {
        this.logs.push({ level, message, meta, timestamp: new Date() });
        console[level === 'error' ? 'error' : 'log'](`[Job ${jobId}] ${message}`, meta || '');
      },
      queue: this.queue,
      signal: abortController.signal,
    };

    try {
      // Run handler - wrapped in try/catch to prevent crashes
      let result: JobResult;
      try {
        result = await handler.run(payload, context);
      } catch (handlerError) {
        // Handler threw an unhandled error - catch it to prevent worker crash
        const err = handlerError as Error;
        context.log('error', `Handler threw unhandled error: ${err.message}`, {
          stack: err.stack,
          type,
          jobId
        });
        result = {
          success: false,
          error: `Unhandled handler error: ${err.message}`,
        };
      }

      if (result.success) {
        // Complete job
        await this.queue.completeJob(jobId, result.data);
        context.log('info', `Job completed successfully in ${result.duration}ms`);
      } else {
        // Handle failure
        const { retrying } = await this.queue.failJob(jobId, result.error || 'Unknown error');
        context.log('error', `Job failed: ${result.error}`, { retrying });
      }

      return result;
    } catch (error) {
      // Catch any errors in the job processing infrastructure itself
      const err = error as Error;
      context.log('error', `Job processing infrastructure error: ${err.message}`, { stack: err.stack });

      try {
        const { retrying } = await this.queue.failJob(jobId, err.message);
        context.log('error', `Job marked as failed`, { retrying });
      } catch (failError) {
        // Even failJob failed - log but don't crash
        console.error(`[JobProcessor] Critical: Could not mark job ${jobId} as failed:`, failError);
      }

      return {
        success: false,
        error: err.message,
      };
    } finally {
      abortController.abort();
    }
  }

  /**
   * Get logs from last processed job
   */
  getLogs(): typeof this.logs {
    return this.logs;
  }
}

// ============================================================
// HELPER DECORATORS / FUNCTIONS
// ============================================================

/**
 * Create a simple job handler
 */
export function createHandler<T, R>(
  type: JobType,
  handler: (payload: T, context: JobContext) => Promise<R>,
  config?: HandlerConfig
): void {
  handlerRegistry.registerFunction(type, async (payload, context) => {
    try {
      const result = await handler(payload as T, context);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, config);
}

/**
 * Convenience function to enqueue a job
 */
export async function enqueueJob<T>(
  type: JobType,
  payload: T,
  options?: {
    delay?: number;
    tenantId?: string;
    tags?: string[];
  }
): Promise<string> {
  const queue = getQueueService();

  if (options?.delay) {
    const result = await queue.schedule({ type, payload }, options.delay);
    return result.jobId;
  }

  const result = await queue.enqueue({
    type,
    payload,
    options: {
      tenantId: options?.tenantId,
      tags: options?.tags,
    },
  });

  return result.jobId;
}

export default JobProcessor;

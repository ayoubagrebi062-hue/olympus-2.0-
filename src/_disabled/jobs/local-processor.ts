/**
 * OLYMPUS 2.0 - Local Job Processor
 * ===================================
 * Processes jobs locally without QStash dependency.
 * Used when QSTASH_TOKEN is not configured.
 *
 * NOTE: This is a purely in-memory processor since the 'jobs' table
 * doesn't exist in the database schema. Jobs are processed immediately.
 */

import { JobType } from '../realtime/types';
import { handlerRegistry, JobContext } from './job-handler';
import { registerAllHandlers } from './handlers';

// Ensure handlers are registered
registerAllHandlers();

interface LocalJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempt: number;
  maxAttempts: number;
  createdAt: Date;
  error?: string;
}

// In-memory job queue
const jobQueue: LocalJob[] = [];
let isProcessing = false;

/**
 * Enqueue a job for local processing
 */
export async function enqueueLocalJob<T extends Record<string, unknown>>(
  type: JobType,
  payload: T,
  options: { maxAttempts?: number; tenantId?: string } = {}
): Promise<{ jobId: string; status: string }> {
  const jobId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const job: LocalJob = {
    id: jobId,
    type,
    payload,
    status: 'pending',
    attempt: 0,
    maxAttempts: options.maxAttempts || 3,
    createdAt: new Date(),
  };

  // Add to in-memory queue (no database - jobs table doesn't exist)
  jobQueue.push(job);
  console.log(`[LocalProcessor] Job ${jobId} (${type}) queued`);

  // Start processing if not already running
  if (!isProcessing) {
    // Use setImmediate to avoid blocking the response
    setImmediate(() => processQueue());
  }

  return { jobId, status: 'queued' };
}

/**
 * Process jobs in the queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  console.log('[LocalProcessor] Starting queue processing...');

  while (jobQueue.length > 0) {
    const job = jobQueue.shift()!;

    try {
      console.log(`[LocalProcessor] Processing job ${job.id} (${job.type})`);

      // Update status to running
      job.status = 'running';
      job.attempt++;

      // Get handler
      const handler = handlerRegistry.getHandler(job.type);
      if (!handler) {
        throw new Error(`No handler for job type: ${job.type}`);
      }

      // Create context
      const context = createJobContext(job);

      // Validate
      const validation = handler.validate?.(job.payload) || { valid: true };
      if (!validation.valid) {
        throw new Error(validation.error || 'Validation failed');
      }

      // Execute
      await handler.beforeExecute?.(job.payload, context);
      const result = await handler.execute(job.payload, context);
      await handler.afterExecute?.(job.payload, result, context);

      // Mark completed
      job.status = 'completed';
      console.log(`[LocalProcessor] Job ${job.id} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LocalProcessor] Job ${job.id} failed:`, errorMessage);

      // Check if we should retry
      if (job.attempt < job.maxAttempts) {
        console.log(
          `[LocalProcessor] Retrying job ${job.id} (attempt ${job.attempt + 1}/${job.maxAttempts})`
        );
        job.status = 'pending';
        job.error = errorMessage;
        jobQueue.push(job);
      } else {
        job.status = 'failed';
        job.error = errorMessage;
        console.error(`[LocalProcessor] Job ${job.id} failed after ${job.maxAttempts} attempts`);
      }

      // Call error handler
      const handler = handlerRegistry.getHandler(job.type);
      handler?.onError?.(job.payload, error as Error, createJobContext(job));
    }

    // Small delay between jobs to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isProcessing = false;
  console.log('[LocalProcessor] Queue processing complete');
}

/**
 * Create job context for handlers
 */
function createJobContext(job: LocalJob): JobContext {
  const abortController = new AbortController();

  return {
    jobId: job.id,
    type: job.type,
    attempt: job.attempt,
    isRetry: job.attempt > 1,
    startedAt: new Date(),
    signal: abortController.signal,
    log: (
      level: 'debug' | 'info' | 'warn' | 'error',
      message: string,
      meta?: Record<string, unknown>
    ) => {
      console.log(`[${job.type}:${job.id}] ${level.toUpperCase()}: ${message}`, meta || '');
    },
    updateProgress: async (progress: number, message?: string) => {
      console.log(`[${job.type}:${job.id}] Progress: ${progress}% - ${message || ''}`);
    },
    queue: {
      enqueue: (newJob: { type: JobType; payload: Record<string, unknown> }) =>
        enqueueLocalJob(newJob.type, newJob.payload),
    } as any,
  };
}

/**
 * Check if local processor should be used
 */
export function shouldUseLocalProcessor(): boolean {
  return !process.env.QSTASH_TOKEN;
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  return {
    pending: jobQueue.filter(j => j.status === 'pending').length,
    running: isProcessing ? 1 : 0,
    total: jobQueue.length,
    isProcessing,
  };
}

export default {
  enqueue: enqueueLocalJob,
  shouldUseLocal: shouldUseLocalProcessor,
  getStatus: getQueueStatus,
};

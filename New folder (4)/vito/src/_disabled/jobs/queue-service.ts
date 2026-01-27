/**
 * OLYMPUS 2.0 - Job Queue Service
 * ================================
 * Background job queue using Upstash QStash.
 * Handles enqueue, scheduling, retries, and dead letter queue.
 */

import { Client } from '@upstash/qstash';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import {
  Job,
  JobInput,
  JobOptions,
  JobType,
  JobStatus,
  JobResult,
  ScheduledJob,
  DeadLetterEntry,
} from '../realtime/types';
import {
  JOB_RETRY_CONFIG,
  JOB_TIMEOUTS,
  JOB_DEFAULT_PRIORITY,
  JOB_NAMES,
  calculateBackoff,
} from '../realtime/constants';

// ============================================================
// TYPES
// ============================================================

export interface QueueServiceConfig {
  qstashToken: string;
  baseUrl: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface EnqueueResult {
  jobId: string;
  messageId: string;
  status: JobStatus;
}

export interface ScheduleResult {
  scheduleId: string;
  name: string;
  cronExpression: string;
}

export interface JobFilter {
  tenantId?: string;
  type?: JobType;
  status?: JobStatus | JobStatus[];
  tags?: string[];
  since?: Date;
  until?: Date;
}

// ============================================================
// QUEUE SERVICE
// ============================================================

export class QueueService {
  private client: Client;
  private supabase: SupabaseClient;
  private baseUrl: string;

  constructor(config: QueueServiceConfig) {
    this.client = new Client({
      token: config.qstashToken,
    });
    this.baseUrl = config.baseUrl;
    this.supabase = createClient(
      config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // ============================================================
  // ENQUEUE JOBS
  // ============================================================

  /**
   * Enqueue a job for immediate processing
   */
  async enqueue<T = Record<string, unknown>>(
    job: JobInput<T>
  ): Promise<EnqueueResult> {
    const options = this.mergeOptions(job.type, job.options);
    const endpoint = `${this.baseUrl}/api/jobs/process`;

    // Create job in database first
    const dbJob = await this.createJobRecord(job.type, job.payload, options);

    try {
      // Send to QStash
      const { messageId } = await this.client.publishJSON({
        url: endpoint,
        body: {
          jobId: dbJob.id,
          type: job.type,
          payload: job.payload,
          attempt: 1,
        },
        retries: options.retries,
        callback: options.callback,
        deduplicationId: options.deduplicationId,
        headers: {
          'x-job-id': dbJob.id,
          'x-job-type': job.type,
        },
      });

      // Update job with QStash message ID
      await this.updateJobStatus(dbJob.id, 'queued', {
        qstash_message_id: messageId,
      });

      return {
        jobId: dbJob.id,
        messageId,
        status: 'queued',
      };
    } catch (error) {
      // Mark job as failed if we couldn't enqueue
      await this.updateJobStatus(dbJob.id, 'failed', {
        last_error: `Failed to enqueue: ${(error as Error).message}`,
      });
      throw error;
    }
  }

  /**
   * Enqueue multiple jobs
   */
  async enqueueMany<T = Record<string, unknown>>(
    jobs: JobInput<T>[]
  ): Promise<EnqueueResult[]> {
    const results: EnqueueResult[] = [];

    for (const job of jobs) {
      try {
        const result = await this.enqueue(job);
        results.push(result);
      } catch (error) {
        console.error(`Failed to enqueue job ${job.type}:`, error);
        // Continue with other jobs
      }
    }

    return results;
  }

  /**
   * Schedule a job for future execution
   */
  async schedule<T = Record<string, unknown>>(
    job: JobInput<T>,
    delay: number // seconds
  ): Promise<EnqueueResult> {
    const options = this.mergeOptions(job.type, job.options);
    const endpoint = `${this.baseUrl}/api/jobs/process`;

    // Create job in database with scheduled_at
    const scheduledAt = new Date(Date.now() + delay * 1000);
    const dbJob = await this.createJobRecord(job.type, job.payload, {
      ...options,
      scheduledAt,
    });

    try {
      const { messageId } = await this.client.publishJSON({
        url: endpoint,
        body: {
          jobId: dbJob.id,
          type: job.type,
          payload: job.payload,
          attempt: 1,
        },
        delay,
        retries: options.retries,
        headers: {
          'x-job-id': dbJob.id,
          'x-job-type': job.type,
        },
      });

      await this.updateJobStatus(dbJob.id, 'pending', {
        qstash_message_id: messageId,
      });

      return {
        jobId: dbJob.id,
        messageId,
        status: 'pending',
      };
    } catch (error) {
      await this.updateJobStatus(dbJob.id, 'failed', {
        last_error: `Failed to schedule: ${(error as Error).message}`,
      });
      throw error;
    }
  }

  /**
   * Schedule a job for a specific time
   */
  async scheduleAt<T = Record<string, unknown>>(
    job: JobInput<T>,
    runAt: Date
  ): Promise<EnqueueResult> {
    const delay = Math.max(0, Math.floor((runAt.getTime() - Date.now()) / 1000));
    return this.schedule(job, delay);
  }

  // ============================================================
  // SCHEDULED JOBS (CRON)
  // ============================================================

  /**
   * Create a recurring scheduled job
   */
  async createSchedule(schedule: {
    name: string;
    description?: string;
    cronExpression: string;
    jobType: JobType;
    jobPayload?: Record<string, unknown>;
  }): Promise<ScheduleResult> {
    const endpoint = `${this.baseUrl}/api/jobs/scheduled/${schedule.name}`;

    // Create in QStash
    const { scheduleId } = await this.client.schedules.create({
      destination: endpoint,
      cron: schedule.cronExpression,
      body: JSON.stringify({
        type: schedule.jobType,
        payload: schedule.jobPayload || {},
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-schedule-name': schedule.name,
      },
    });

    // Save to database
    await this.supabase.from('scheduled_jobs').upsert({
      name: schedule.name,
      description: schedule.description,
      cron_expression: schedule.cronExpression,
      job_type: schedule.jobType,
      job_payload: schedule.jobPayload || {},
      qstash_schedule_id: scheduleId,
      enabled: true,
      next_run_at: this.getNextRunTime(schedule.cronExpression),
    }, {
      onConflict: 'name',
    });

    return {
      scheduleId,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
    };
  }

  /**
   * Update a scheduled job
   */
  async updateSchedule(
    name: string,
    updates: {
      cronExpression?: string;
      jobPayload?: Record<string, unknown>;
      enabled?: boolean;
    }
  ): Promise<void> {
    const { data: schedule } = await this.supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('name', name)
      .single();

    if (!schedule) {
      throw new Error(`Schedule not found: ${name}`);
    }

    // Update in QStash if needed
    if (updates.cronExpression || updates.jobPayload !== undefined) {
      // Delete and recreate (QStash doesn't support update)
      if (schedule.qstash_schedule_id) {
        await this.client.schedules.delete(schedule.qstash_schedule_id);
      }

      if (updates.enabled !== false) {
        const endpoint = `${this.baseUrl}/api/jobs/scheduled/${name}`;
        const { scheduleId } = await this.client.schedules.create({
          destination: endpoint,
          cron: updates.cronExpression || schedule.cron_expression,
          body: JSON.stringify({
            type: schedule.job_type,
            payload: updates.jobPayload ?? schedule.job_payload,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        updates = { ...updates, qstash_schedule_id: scheduleId } as any;
      }
    }

    // Update database
    await this.supabase
      .from('scheduled_jobs')
      .update({
        ...updates,
        next_run_at: updates.cronExpression
          ? this.getNextRunTime(updates.cronExpression)
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('name', name);
  }

  /**
   * Delete a scheduled job
   */
  async deleteSchedule(name: string): Promise<void> {
    const { data: schedule } = await this.supabase
      .from('scheduled_jobs')
      .select('qstash_schedule_id')
      .eq('name', name)
      .single();

    if (schedule?.qstash_schedule_id) {
      await this.client.schedules.delete(schedule.qstash_schedule_id);
    }

    await this.supabase
      .from('scheduled_jobs')
      .delete()
      .eq('name', name);
  }

  /**
   * Pause a scheduled job
   */
  async pauseSchedule(name: string): Promise<void> {
    const { data: schedule } = await this.supabase
      .from('scheduled_jobs')
      .select('qstash_schedule_id')
      .eq('name', name)
      .single();

    if (schedule?.qstash_schedule_id) {
      await this.client.schedules.pause({ schedule: schedule.qstash_schedule_id });
    }

    await this.supabase
      .from('scheduled_jobs')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('name', name);
  }

  /**
   * Resume a scheduled job
   */
  async resumeSchedule(name: string): Promise<void> {
    const { data: schedule } = await this.supabase
      .from('scheduled_jobs')
      .select('qstash_schedule_id')
      .eq('name', name)
      .single();

    if (schedule?.qstash_schedule_id) {
      await this.client.schedules.resume({ schedule: schedule.qstash_schedule_id });
    }

    await this.supabase
      .from('scheduled_jobs')
      .update({
        enabled: true,
        next_run_at: this.getNextRunTime((schedule as any)?.cron_expression || ''),
        updated_at: new Date().toISOString(),
      })
      .eq('name', name);
  }

  /**
   * List all scheduled jobs
   */
  async listSchedules(): Promise<ScheduledJob[]> {
    const { data, error } = await this.supabase
      .from('scheduled_jobs')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // ============================================================
  // JOB MANAGEMENT
  // ============================================================

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * List jobs with filters
   */
  async listJobs(filter: JobFilter = {}, limit = 50, offset = 0): Promise<Job[]> {
    let query = this.supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter.tenantId) {
      query = query.eq('tenant_id', filter.tenantId);
    }

    if (filter.type) {
      query = query.eq('type', filter.type);
    }

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query = query.in('status', filter.status);
      } else {
        query = query.eq('status', filter.status);
      }
    }

    if (filter.tags && filter.tags.length > 0) {
      query = query.overlaps('tags', filter.tags);
    }

    if (filter.since) {
      query = query.gte('created_at', filter.since.toISOString());
    }

    if (filter.until) {
      query = query.lte('created_at', filter.until.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.status === 'completed' || job.status === 'dead') {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    // Cancel in QStash if queued
    if (job.qstash_message_id && job.status === 'queued') {
      try {
        await this.client.messages.delete(job.qstash_message_id);
      } catch {
        // Message may have already been processed
      }
    }

    await this.updateJobStatus(jobId, 'canceled');
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<EnqueueResult> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.status !== 'failed' && job.status !== 'dead') {
      throw new Error(`Only failed jobs can be retried, current status: ${job.status}`);
    }

    // Create a new job based on the failed one
    return this.enqueue({
      type: job.type as JobType,
      payload: job.payload,
      options: {
        tenantId: job.tenant_id || undefined,
        tags: [...(job.tags || []), 'retry', `retry-of:${jobId}`],
      },
    });
  }

  // ============================================================
  // DEAD LETTER QUEUE
  // ============================================================

  /**
   * Move a job to the dead letter queue
   */
  async moveToDeadLetter(
    jobId: string,
    error: { message: string; stack?: string }
  ): Promise<string> {
    const { data, error: rpcError } = await this.supabase.rpc('move_job_to_dlq', {
      p_job_id: jobId,
      p_error_message: error.message,
      p_error_stack: error.stack,
    });

    if (rpcError) throw rpcError;
    return data;
  }

  /**
   * List dead letter queue entries
   */
  async listDeadLetterQueue(resolved = false): Promise<DeadLetterEntry[]> {
    const { data, error } = await this.supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('resolved', resolved)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Resolve a dead letter entry
   */
  async resolveDeadLetter(
    dlqId: string,
    notes: string,
    resolvedBy?: string
  ): Promise<void> {
    await this.supabase
      .from('dead_letter_queue')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: notes,
      })
      .eq('id', dlqId);
  }

  /**
   * Retry a dead letter entry
   */
  async retryDeadLetter(dlqId: string): Promise<EnqueueResult> {
    const { data: dlq, error } = await this.supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single();

    if (error || !dlq) throw new Error(`DLQ entry not found: ${dlqId}`);

    // Mark as resolved
    await this.resolveDeadLetter(dlqId, 'Retried manually');

    // Enqueue new job
    return this.enqueue({
      type: dlq.job_type as JobType,
      payload: dlq.job_payload,
      options: {
        tags: ['dlq-retry', `dlq-entry:${dlqId}`],
      },
    });
  }

  // ============================================================
  // JOB STATUS UPDATES
  // ============================================================

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: Partial<Job> = {}
  ): Promise<void> {
    const now = new Date().toISOString();
    const statusUpdates: Partial<Job> = { status, updated_at: now };

    if (status === 'running' && !updates.started_at) {
      statusUpdates.started_at = now;
    }

    if (status === 'completed' || status === 'failed' || status === 'canceled' || status === 'dead') {
      statusUpdates.completed_at = now;
    }

    await this.supabase
      .from('jobs')
      .update({ ...statusUpdates, ...updates })
      .eq('id', jobId);
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string
  ): Promise<void> {
    await this.supabase
      .from('jobs')
      .update({
        progress: Math.min(100, Math.max(0, progress)),
        progress_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Complete a job with result
   */
  async completeJob(jobId: string, result?: unknown): Promise<void> {
    await this.updateJobStatus(jobId, 'completed', {
      progress: 100,
      result: result as Record<string, unknown>,
    });
  }

  /**
   * Fail a job with error
   */
  async failJob(
    jobId: string,
    error: string,
    shouldRetry = true
  ): Promise<{ retrying: boolean; nextRetryAt?: Date }> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const config = JOB_RETRY_CONFIG[job.type as JobType];
    const canRetry = shouldRetry && job.attempts < config.maxAttempts;

    if (canRetry) {
      const backoff = calculateBackoff(job.attempts + 1, job.type as JobType);
      const nextRetryAt = new Date(Date.now() + backoff);

      await this.updateJobStatus(jobId, 'failed', {
        attempts: job.attempts + 1,
        last_error: error,
        next_retry_at: nextRetryAt.toISOString(),
      });

      // Schedule retry
      await this.scheduleRetry(job, backoff / 1000);

      return { retrying: true, nextRetryAt };
    } else {
      // Move to DLQ - Dead Letter Queue handling for permanently failed jobs
      await this.moveToDeadLetter(jobId, { message: error });
      await this.updateJobStatus(jobId, 'dead', {
        last_error: error,
      });
      console.error(`[QueueService] Job ${jobId} moved to DLQ after exhausting retries: ${error}`);
      return { retrying: false };
    }
  }

  /**
   * Process dead letter queue - retry or discard stale entries
   */
  async processDLQ(options: {
    maxAge?: number; // Max age in hours before auto-discard
    autoRetry?: boolean;
    limit?: number;
  } = {}): Promise<{ processed: number; retried: number; discarded: number }> {
    const { maxAge = 72, autoRetry = false, limit = 100 } = options;
    const dlqEntries = await this.listDeadLetterQueue(false);

    let processed = 0;
    let retried = 0;
    let discarded = 0;

    for (const entry of dlqEntries.slice(0, limit)) {
      processed++;
      const entryAge = (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60);

      if (entryAge > maxAge) {
        // Auto-discard old entries
        await this.resolveDeadLetter(entry.id, `Auto-discarded after ${maxAge}h`);
        discarded++;
      } else if (autoRetry) {
        try {
          await this.retryDeadLetter(entry.id);
          retried++;
        } catch (e) {
          console.error(`[QueueService] Failed to retry DLQ entry ${entry.id}:`, e);
        }
      }
    }

    return { processed, retried, discarded };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async createJobRecord(
    type: JobType,
    payload: unknown,
    options: JobOptions
  ): Promise<Job> {
    const { data, error } = await this.supabase
      .from('jobs')
      .insert({
        tenant_id: options.tenantId,
        type,
        name: JOB_NAMES[type] || type,
        payload,
        status: 'pending',
        scheduled_at: options.scheduledAt?.toISOString(),
        max_attempts: options.retries ?? JOB_RETRY_CONFIG[type].maxAttempts,
        priority: options.priority ?? JOB_DEFAULT_PRIORITY[type],
        tags: options.tags || [],
        metadata: {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private mergeOptions(type: JobType, options?: JobOptions): Required<JobOptions> {
    return {
      priority: options?.priority ?? JOB_DEFAULT_PRIORITY[type],
      retries: options?.retries ?? JOB_RETRY_CONFIG[type].maxAttempts,
      retryDelay: options?.retryDelay ?? JOB_RETRY_CONFIG[type].backoffMs[0] / 1000,
      timeout: options?.timeout ?? JOB_TIMEOUTS[type],
      deduplicationId: options?.deduplicationId ?? undefined as any,
      callback: options?.callback ?? undefined as any,
      tags: options?.tags ?? [],
      tenantId: options?.tenantId ?? undefined as any,
      scheduledAt: options?.scheduledAt ?? undefined as any,
      delay: options?.delay ?? 0,
    };
  }

  private async scheduleRetry(job: Job, delaySeconds: number): Promise<void> {
    const endpoint = `${this.baseUrl}/api/jobs/process`;

    await this.client.publishJSON({
      url: endpoint,
      body: {
        jobId: job.id,
        type: job.type,
        payload: job.payload,
        attempt: job.attempts + 1,
        isRetry: true,
      },
      delay: delaySeconds,
      headers: {
        'x-job-id': job.id,
        'x-job-type': job.type,
        'x-retry-attempt': String(job.attempts + 1),
      },
    });
  }

  private getNextRunTime(cronExpression: string): string {
    // Simple implementation - in production use a proper cron parser
    // For now, return next hour as approximation
    const next = new Date();
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toISOString();
  }
}

// ============================================================
// SINGLETON
// ============================================================

let queueServiceInstance: QueueService | null = null;

export function createQueueService(config: QueueServiceConfig): QueueService {
  return new QueueService(config);
}

export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService({
      qstashToken: process.env.QSTASH_TOKEN!,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL!,
    });
  }
  return queueServiceInstance;
}

export function resetQueueService(): void {
  queueServiceInstance = null;
}

export default QueueService;

/**
 * OLYMPUS 2.0 - Jobs Module
 *
 * Background job processing with QStash.
 * Re-exports from _disabled for now - to be properly integrated.
 */

// Queue Service Types
export interface QueueServiceConfig {
  qstashToken?: string;
  qstashUrl?: string;
  baseUrl?: string;
}

export interface EnqueueResult {
  messageId: string;
  deduplicated?: boolean;
}

export interface ScheduleResult {
  scheduleId: string;
  cron: string;
}

export interface JobFilter {
  type?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  since?: Date;
}

// Job Options
export interface EnqueueOptions {
  type: string;
  payload: unknown;
  delay?: number;
  deduplicationId?: string;
}

// Queue Service Class
export class QueueService {
  private static instance: QueueService | null = null;

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  // Overloaded enqueue: supports both object form and separate params
  async enqueue(options: EnqueueOptions): Promise<EnqueueResult>;
  async enqueue<T>(type: string, payload: T, options?: { delay?: number; deduplicationId?: string }): Promise<EnqueueResult>;
  async enqueue<T>(
    typeOrOptions: string | EnqueueOptions,
    payload?: T,
    options?: { delay?: number; deduplicationId?: string }
  ): Promise<EnqueueResult> {
    let jobType: string;
    let jobPayload: unknown;
    let jobOptions: { delay?: number; deduplicationId?: string } | undefined;

    if (typeof typeOrOptions === 'object') {
      // Object form: enqueue({ type, payload, delay?, deduplicationId? })
      jobType = typeOrOptions.type;
      jobPayload = typeOrOptions.payload;
      jobOptions = { delay: typeOrOptions.delay, deduplicationId: typeOrOptions.deduplicationId };
    } else {
      // Separate params form: enqueue(type, payload, options?)
      jobType = typeOrOptions;
      jobPayload = payload;
      jobOptions = options;
    }

    console.log(`[QueueService] Enqueueing job: ${jobType}`, { payload: jobPayload, options: jobOptions });
    // In production, this would use QStash
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      deduplicated: false,
    };
  }

  async schedule<T>(
    type: string,
    cron: string,
    payload: T
  ): Promise<ScheduleResult> {
    console.log(`[QueueService] Scheduling job: ${type} with cron: ${cron}`);
    return {
      scheduleId: `sched_${Date.now()}`,
      cron,
    };
  }

  async cancel(messageId: string): Promise<void> {
    console.log(`[QueueService] Cancelling job: ${messageId}`);
  }

  async cancelJob(jobId: string): Promise<void> {
    console.log(`[QueueService] Cancelling job by ID: ${jobId}`);
  }

  async getJob(messageId: string): Promise<{ status: string } | null> {
    return { status: 'pending' };
  }
}

// Factory functions
export function createQueueService(config?: QueueServiceConfig): QueueService {
  return QueueService.getInstance();
}

export function getQueueService(): QueueService {
  return QueueService.getInstance();
}

export function resetQueueService(): void {
  // Reset for testing
}

// Job Handler Types
export interface JobContext {
  jobId: string;
  type: string;
  attempt: number;
  maxRetries: number;
}

export interface HandlerConfig {
  type: string;
  maxRetries?: number;
  timeout?: number;
}

export interface JobHandler<T = unknown, R = unknown> {
  handle(payload: T, context: JobContext): Promise<R>;
}

// Base Handler Class
export abstract class BaseJobHandler<T = unknown, R = unknown> implements JobHandler<T, R> {
  abstract handle(payload: T, context: JobContext): Promise<R>;
}

// Job Processor
export class JobProcessor {
  async process(type: string, payload: unknown): Promise<unknown> {
    console.log(`[JobProcessor] Processing job: ${type}`);
    return { success: true };
  }
}

// Handler Registry
export const handlerRegistry = new Map<string, JobHandler>();

export function createHandler<T, R>(
  config: HandlerConfig,
  handler: (payload: T, context: JobContext) => Promise<R>
): JobHandler<T, R> {
  return {
    handle: handler,
  };
}

export async function enqueueJob<T>(type: string, payload: T): Promise<EnqueueResult> {
  return getQueueService().enqueue(type, payload);
}

// Local Processor
export async function enqueueLocalJob<T>(type: string, payload: T): Promise<void> {
  console.log(`[LocalProcessor] Enqueueing: ${type}`);
}

export function shouldUseLocalProcessor(): boolean {
  return !process.env.QSTASH_TOKEN;
}

export function getQueueStatus(): { pending: number; processing: number } {
  return { pending: 0, processing: 0 };
}

// Concrete Handler Types (stubs)
export type BuildPayload = { buildId: string; tenantId: string };
export type BuildResult = { success: boolean };
export type DeployPayload = { deploymentId: string };
export type DeployResult = { success: boolean };
export type EmailPayload = { to: string; subject: string; body: string };
export type EmailResult = { sent: boolean };
export type FileProcessPayload = { fileId: string };
export type FileProcessResult = { processed: boolean };
export type UsageReportPayload = { tenantId: string; period: string };
export type NotificationPayload = { userId: string; message: string };
export type WebhookPayload = { url: string; payload: unknown };

// Handler Classes (stubs)
export class BuildHandler extends BaseJobHandler<BuildPayload, BuildResult> {
  async handle(payload: BuildPayload): Promise<BuildResult> {
    return { success: true };
  }
}

export class DeployHandler extends BaseJobHandler<DeployPayload, DeployResult> {
  async handle(payload: DeployPayload): Promise<DeployResult> {
    return { success: true };
  }
}

export class EmailHandler extends BaseJobHandler<EmailPayload, EmailResult> {
  async handle(payload: EmailPayload): Promise<EmailResult> {
    return { sent: true };
  }
}

export class FileProcessHandler extends BaseJobHandler<FileProcessPayload, FileProcessResult> {
  async handle(payload: FileProcessPayload): Promise<FileProcessResult> {
    return { processed: true };
  }
}

export class CleanupSessionsHandler extends BaseJobHandler {
  async handle(): Promise<{ cleaned: number }> {
    return { cleaned: 0 };
  }
}

export class CleanupOrphansHandler extends BaseJobHandler {
  async handle(): Promise<{ cleaned: number }> {
    return { cleaned: 0 };
  }
}

export class UsageReportHandler extends BaseJobHandler<UsageReportPayload> {
  async handle(payload: UsageReportPayload): Promise<{ reported: boolean }> {
    return { reported: true };
  }
}

export class BillingSyncHandler extends BaseJobHandler {
  async handle(): Promise<{ synced: boolean }> {
    return { synced: true };
  }
}

export class NotificationHandler extends BaseJobHandler<NotificationPayload> {
  async handle(payload: NotificationPayload): Promise<{ sent: boolean }> {
    return { sent: true };
  }
}

export class WebhookHandler extends BaseJobHandler<WebhookPayload> {
  async handle(payload: WebhookPayload): Promise<{ delivered: boolean }> {
    return { delivered: true };
  }
}

export function registerAllHandlers(): void {
  // Register handlers in production
}

/**
 * OLYMPUS 2.0 - Job Handlers
 * ===========================
 * Concrete handler implementations for each job type.
 */

import { BaseJobHandler, JobContext, HandlerConfig, handlerRegistry } from './job-handler';
import { JobType } from '../realtime/types';
import { getBuildRealtimeService } from '../realtime';
import { createClient } from '@supabase/supabase-js';

// Supabase client for database updates
const getSupabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ============================================================
// BUILD HANDLER
// ============================================================

export interface BuildPayload {
  projectId: string;
  buildId: string;
  tenantId: string;
  userId: string;
  prompt?: string;
  options?: {
    regenerateOnly?: string[];
    skipValidation?: boolean;
  };
}

export interface BuildResult {
  filesGenerated: number;
  phasesCompleted: number;
  previewUrl?: string;
}

export class BuildHandler extends BaseJobHandler<BuildPayload, BuildResult> {
  readonly type: JobType = 'build';
  readonly config: HandlerConfig = {
    timeout: 1800, // 30 minutes
    retries: 3,
  };

  validate(payload: BuildPayload) {
    if (!payload.projectId) return { valid: false, error: 'projectId is required' };
    if (!payload.buildId) return { valid: false, error: 'buildId is required' };
    if (!payload.tenantId) return { valid: false, error: 'tenantId is required' };
    return { valid: true };
  }

  async beforeExecute(payload: BuildPayload, context: JobContext) {
    const buildRealtime = getBuildRealtimeService();
    await buildRealtime.publishStatus(payload.buildId, 'initializing');

    // NOTE: Don't update status to 'running' here - let buildService.start() handle it
    // buildService.start() only accepts builds with status 'queued' or 'paused'

    context.log('info', `Starting build for project ${payload.projectId}`);
  }

  async execute(payload: BuildPayload, context: JobContext): Promise<BuildResult> {
    const buildRealtime = getBuildRealtimeService();

    // Import buildService dynamically to avoid circular dependencies
    const { buildService } = await import('@/lib/agents');

    context.log('info', `[BuildHandler] Starting REAL build execution for ${payload.buildId}`);

    // Phase 1: Planning
    await buildRealtime.publishStatus(payload.buildId, 'planning');
    await context.updateProgress(10, 'Initializing AI agents...');

    // START THE REAL BUILD using buildService
    // This calls BuildOrchestrator which executes actual AI agents
    const startResult = await buildService.start(payload.buildId, {
      onProgress: async progress => {
        // Forward orchestrator progress to job context and realtime
        await context.updateProgress(
          progress.progress,
          `Phase: ${progress.currentPhase || 'initializing'}`
        );

        if (progress.currentPhase) {
          await buildRealtime.publishStatus(payload.buildId, progress.currentPhase as any);
        }
      },
      onAgentComplete: async (agentId, output) => {
        await buildRealtime.publishAgentUpdate(payload.buildId, agentId, agentId, 'completed', {
          progress: 100,
          duration: output.duration,
        });
        await buildRealtime.publishLog(payload.buildId, 'info', `Agent ${agentId} completed`, {
          agent: agentId,
        });
      },
      onError: async error => {
        await buildRealtime.publishLog(payload.buildId, 'error', error.message, {
          agent: 'orchestrator',
        });
      },
    });

    if (!startResult.success) {
      context.log('error', `[BuildHandler] Build failed: ${startResult.error?.message}`);
      throw new Error(startResult.error?.message || 'Build execution failed');
    }

    // Wait for build completion by polling progress
    let filesGenerated = 0;
    let phasesCompleted = 0;
    let isComplete = false;

    while (!isComplete && !context.signal.aborted) {
      const progressResult = await buildService.getProgress(payload.buildId);

      if (progressResult.success && progressResult.data) {
        const progress = progressResult.data;

        await context.updateProgress(
          progress.progress,
          `Phase: ${progress.currentPhase || 'processing'}`
        );

        if (progress.status === 'completed') {
          filesGenerated = progress.completedAgents.length * 3; // Estimate files per agent
          phasesCompleted = progress.completedPhases.length;
          isComplete = true;
        } else if (progress.status === 'failed' || progress.status === 'canceled') {
          throw new Error(`Build ${progress.status}`);
        }
      }

      if (!isComplete) {
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (context.signal.aborted) {
      await buildService.cancel(payload.buildId);
      throw new Error('Build aborted');
    }

    context.log(
      'info',
      `[BuildHandler] Build completed: ${filesGenerated} files from ${phasesCompleted} phases`
    );

    return {
      filesGenerated,
      phasesCompleted,
      previewUrl: `https://preview.olympus.app/${payload.projectId}`,
    };
  }

  async afterExecute(payload: BuildPayload, result: BuildResult, context: JobContext) {
    const buildRealtime = getBuildRealtimeService();
    await buildRealtime.publishComplete(payload.buildId, {
      success: true,
      filesGenerated: result.filesGenerated,
      totalDuration: Date.now() - context.startedAt.getTime(),
      phases: [],
      previewUrl: result.previewUrl,
    });

    // UPDATE DATABASE: Set status to completed
    const supabase = getSupabase();
    await supabase
      .from('builds')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payload.buildId);

    context.log('info', `Build completed: ${result.filesGenerated} files generated`);
  }

  async onError(payload: BuildPayload, error: Error, context: JobContext) {
    const buildRealtime = getBuildRealtimeService();
    await buildRealtime.publishError(payload.buildId, {
      code: 'BUILD_FAILED',
      message: error.message,
    });

    // UPDATE DATABASE: Set status to failed
    const supabase = getSupabase();
    await supabase
      .from('builds')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payload.buildId);
  }

  // REMOVED: simulateWork - now using real AI agents via buildService
}

// ============================================================
// DEPLOY HANDLER
// ============================================================

export interface DeployPayload {
  projectId: string;
  deploymentId: string;
  buildId: string;
  environment: 'preview' | 'production';
  tenantId: string;
}

export interface DeployResult {
  url: string;
  deployedAt: string;
}

export class DeployHandler extends BaseJobHandler<DeployPayload, DeployResult> {
  readonly type: JobType = 'deploy';
  readonly config: HandlerConfig = {
    timeout: 900, // 15 minutes
    retries: 3,
  };

  async execute(payload: DeployPayload, context: JobContext): Promise<DeployResult> {
    context.log('info', `Deploying to ${payload.environment}`);

    // Step 1: Prepare
    await context.updateProgress(20, 'Preparing deployment...');
    await this.sleep(1000);

    // Step 2: Build
    await context.updateProgress(50, 'Building for production...');
    await this.sleep(2000);

    // Step 3: Deploy
    await context.updateProgress(80, 'Deploying to CDN...');
    await this.sleep(1000);

    // Step 4: Verify
    await context.updateProgress(95, 'Verifying deployment...');
    await this.sleep(500);

    const domain =
      payload.environment === 'production'
        ? `${payload.projectId}.olympus.app`
        : `${payload.deploymentId}.preview.olympus.app`;

    return {
      url: `https://${domain}`,
      deployedAt: new Date().toISOString(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// EMAIL HANDLER
// ============================================================

export interface EmailPayload {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
}

export class EmailHandler extends BaseJobHandler<EmailPayload, EmailResult> {
  readonly type: JobType = 'email';
  readonly config: HandlerConfig = {
    timeout: 60,
    retries: 5,
  };

  validate(payload: EmailPayload) {
    if (!payload.to) return { valid: false, error: 'to is required' };
    if (!payload.subject) return { valid: false, error: 'subject is required' };
    if (!payload.template) return { valid: false, error: 'template is required' };
    return { valid: true };
  }

  async execute(payload: EmailPayload, context: JobContext): Promise<EmailResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    context.log('info', `Sending email to ${recipients.length} recipients`);

    // In production, integrate with email service (Resend, SendGrid, etc.)
    // For now, simulate sending
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      messageId: `msg_${Date.now()}`,
      accepted: recipients,
    };
  }
}

// ============================================================
// FILE PROCESS HANDLER
// ============================================================

export interface FileProcessPayload {
  fileId: string;
  tenantId: string;
  operations: Array<'thumbnail' | 'optimize' | 'scan'>;
}

export interface FileProcessResult {
  processed: boolean;
  variants?: Record<string, string>;
  scanned?: boolean;
  optimized?: boolean;
}

export class FileProcessHandler extends BaseJobHandler<FileProcessPayload, FileProcessResult> {
  readonly type: JobType = 'file.process';
  readonly config: HandlerConfig = {
    timeout: 120,
    retries: 3,
  };

  async execute(payload: FileProcessPayload, context: JobContext): Promise<FileProcessResult> {
    const result: FileProcessResult = { processed: true };

    for (const op of payload.operations) {
      context.log('info', `Processing file ${payload.fileId}: ${op}`);

      switch (op) {
        case 'thumbnail':
          await this.sleep(500);
          result.variants = { thumbnail: `${payload.fileId}_thumb.webp` };
          break;
        case 'optimize':
          await this.sleep(1000);
          result.optimized = true;
          break;
        case 'scan':
          await this.sleep(300);
          result.scanned = true;
          break;
      }
    }

    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// CLEANUP HANDLERS
// ============================================================

export class CleanupSessionsHandler extends BaseJobHandler<{}, { deleted: number }> {
  readonly type: JobType = 'cleanup.sessions';
  readonly config: HandlerConfig = {
    timeout: 300,
    retries: 2,
  };

  async execute(_payload: {}, context: JobContext): Promise<{ deleted: number }> {
    context.log('info', 'Cleaning up expired sessions');

    // TODO: Implement actual session cleanup
    // const deleted = await cleanupExpiredSessions();
    const deleted = 0;

    context.log('info', `Session cleanup complete (${deleted} deleted)`);
    return { deleted };
  }
}

export class CleanupOrphansHandler extends BaseJobHandler<
  {},
  { filesDeleted: number; bytesFreed: number }
> {
  readonly type: JobType = 'cleanup.orphans';
  readonly config: HandlerConfig = {
    timeout: 600,
    retries: 2,
  };

  async execute(
    _payload: {},
    context: JobContext
  ): Promise<{ filesDeleted: number; bytesFreed: number }> {
    context.log('info', 'Cleaning up orphaned files');

    // TODO: Implement actual orphan file cleanup
    // Should scan storage for files not referenced in DB
    const filesDeleted = 0;
    const bytesFreed = 0;

    context.log('info', `Orphan cleanup complete (${filesDeleted} files, ${bytesFreed} bytes)`);
    return { filesDeleted, bytesFreed };
  }
}

// ============================================================
// USAGE & BILLING HANDLERS
// ============================================================

export interface UsageReportPayload {
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly';
  tenantId?: string;
}

export class UsageReportHandler extends BaseJobHandler<UsageReportPayload, { reported: number }> {
  readonly type: JobType = 'usage.report';
  readonly config: HandlerConfig = {
    timeout: 180,
    retries: 3,
  };

  async execute(payload: UsageReportPayload, context: JobContext): Promise<{ reported: number }> {
    context.log('info', `Generating ${payload.interval} usage report`);

    // In production, aggregate and report usage
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { reported: Date.now() };
  }
}

export class BillingSyncHandler extends BaseJobHandler<{ tenantId?: string }, { synced: number }> {
  readonly type: JobType = 'billing.sync';
  readonly config: HandlerConfig = {
    timeout: 120,
    retries: 5,
  };

  async execute(payload: { tenantId?: string }, context: JobContext): Promise<{ synced: number }> {
    context.log('info', `Syncing billing for ${payload.tenantId || 'all tenants'}`);

    // In production, sync with Stripe
    await new Promise(resolve => setTimeout(resolve, 500));

    return { synced: 1 };
  }
}

// ============================================================
// NOTIFICATION HANDLER
// ============================================================

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  channels: string[];
}

export class NotificationHandler extends BaseJobHandler<NotificationPayload, { sent: string[] }> {
  readonly type: JobType = 'notification.send';
  readonly config: HandlerConfig = {
    timeout: 30,
    retries: 3,
  };

  async execute(payload: NotificationPayload, context: JobContext): Promise<{ sent: string[] }> {
    const sent: string[] = [];

    for (const channel of payload.channels) {
      context.log('info', `Sending notification via ${channel}`);

      switch (channel) {
        case 'in_app':
          // Already in DB, mark as delivered
          sent.push('in_app');
          break;
        case 'email':
          // Queue email job
          await context.queue.enqueue({
            type: 'email',
            payload: {
              to: payload.userId, // Would resolve to email
              subject: payload.title,
              template: 'notification',
              data: payload,
            },
          });
          sent.push('email');
          break;
        case 'push':
          // Send push notification
          sent.push('push');
          break;
      }
    }

    return { sent };
  }
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

export interface WebhookPayload {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  secret?: string;
}

export class WebhookHandler extends BaseJobHandler<
  WebhookPayload,
  { status: number; responseTime: number }
> {
  readonly type: JobType = 'webhook.send';
  readonly config: HandlerConfig = {
    timeout: 30,
    retries: 5,
  };

  async execute(
    payload: WebhookPayload,
    context: JobContext
  ): Promise<{ status: number; responseTime: number }> {
    const startTime = Date.now();

    context.log('info', `Sending webhook to ${payload.url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OLYMPUS-Webhook/1.0',
      ...payload.headers,
    };

    if (payload.secret) {
      // In production, sign the payload
      headers['X-Webhook-Signature'] = `sha256=${payload.secret}`;
    }

    const response = await fetch(payload.url, {
      method: payload.method,
      headers,
      body: payload.body ? JSON.stringify(payload.body) : undefined,
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { status: response.status, responseTime };
  }
}

// ============================================================
// REGISTER ALL HANDLERS
// ============================================================

export function registerAllHandlers(): void {
  handlerRegistry.register(new BuildHandler());
  handlerRegistry.register(new DeployHandler());
  handlerRegistry.register(new EmailHandler());
  handlerRegistry.register(new FileProcessHandler());
  handlerRegistry.register(new CleanupSessionsHandler());
  handlerRegistry.register(new CleanupOrphansHandler());
  handlerRegistry.register(new UsageReportHandler());
  handlerRegistry.register(new BillingSyncHandler());
  handlerRegistry.register(new NotificationHandler());
  handlerRegistry.register(new WebhookHandler());
}

// Auto-register on import
registerAllHandlers();

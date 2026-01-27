/**
 * OLYMPUS 2.0 - Jobs Module
 * ==========================
 * Exports for background job processing.
 */

// Queue Service
export {
  QueueService,
  createQueueService,
  getQueueService,
  resetQueueService,
  type QueueServiceConfig,
  type EnqueueResult,
  type ScheduleResult,
  type JobFilter,
} from './queue-service';

// Job Handler Framework
export {
  BaseJobHandler,
  JobProcessor,
  handlerRegistry,
  createHandler,
  enqueueJob,
  type JobContext,
  type HandlerConfig,
  type JobHandler,
} from './job-handler';

// Concrete Handlers
export {
  BuildHandler,
  DeployHandler,
  EmailHandler,
  FileProcessHandler,
  CleanupSessionsHandler,
  CleanupOrphansHandler,
  UsageReportHandler,
  BillingSyncHandler,
  NotificationHandler,
  WebhookHandler,
  registerAllHandlers,
  type BuildPayload,
  type BuildResult,
  type DeployPayload,
  type DeployResult,
  type EmailPayload,
  type EmailResult,
  type FileProcessPayload,
  type FileProcessResult,
  type UsageReportPayload,
  type NotificationPayload,
  type WebhookPayload,
} from './handlers';

// Local Processor (fallback when QStash not available)
export {
  enqueueLocalJob,
  shouldUseLocalProcessor,
  getQueueStatus,
} from './local-processor';

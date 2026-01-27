/**
 * OLYMPUS 2.0 - Build Validation Schemas
 */

import { z } from 'zod';

/** Build tier */
const buildTier = z.enum(['starter', 'standard', 'professional', 'ultimate', 'enterprise']);

/** Build status - matches DB ENUM: created, queued, running, paused, completed, failed, canceled */
const buildStatus = z.enum([
  'created',
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
]);

/** Start build schema */
export const startBuildSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional()
    .default('Build started from dashboard'),
  tier: z
    .enum(['starter', 'standard', 'professional', 'ultimate', 'enterprise'])
    .default('starter'),
  options: z
    .object({
      targetUsers: z.string().max(1000).optional(),
      techConstraints: z.string().max(1000).optional(),
      businessRequirements: z.string().max(2000).optional(),
      designPreferences: z.string().max(1000).optional(),
      integrations: z.array(z.string()).max(20).optional(),
      existingCodebase: z.boolean().optional().default(false),
      priority: z.enum(['normal', 'high']).optional().default('normal'),
    })
    .optional(),
  metadata: z.record(z.string()).optional(),
});

/** Iterate build schema (continue from previous) */
export const iterateBuildSchema = z.object({
  buildId: z.string().uuid('Invalid build ID'),
  feedback: z.string().min(1).max(2000),
  focusAreas: z
    .array(
      z.enum([
        'ui',
        'backend',
        'database',
        'api',
        'authentication',
        'performance',
        'security',
        'testing',
      ])
    )
    .optional(),
  fileChanges: z
    .array(
      z.object({
        path: z.string(),
        action: z.enum(['modify', 'delete', 'create']),
        content: z.string().optional(),
      })
    )
    .optional(),
});

/** Cancel build schema */
export const cancelBuildSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** Retry build schema */
export const retryBuildSchema = z.object({
  buildId: z.string().uuid('Invalid build ID'),
  fromStep: z.string().optional(), // Resume from specific step
});

/** Build webhook schema (internal) */
export const buildWebhookSchema = z.object({
  buildId: z.string().uuid(),
  event: z.enum(['started', 'progress', 'completed', 'failed']),
  data: z.object({
    status: buildStatus.optional(),
    progress: z.number().min(0).max(100).optional(),
    step: z.string().optional(),
    message: z.string().optional(),
    outputs: z.record(z.unknown()).optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
  }),
  timestamp: z.string().datetime(),
});

/** Build filter schema (for list) */
export const buildFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.union([buildStatus, z.array(buildStatus)]).optional(),
  tier: buildTier.optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
});

/** Build output request schema */
export const buildOutputSchema = z.object({
  type: z.enum(['files', 'logs', 'artifacts', 'metrics']).optional().default('files'),
  path: z.string().optional(), // Specific file/directory
});

export type StartBuildInput = z.infer<typeof startBuildSchema>;
export type IterateBuildInput = z.infer<typeof iterateBuildSchema>;
export type CancelBuildInput = z.infer<typeof cancelBuildSchema>;
export type RetryBuildInput = z.infer<typeof retryBuildSchema>;
export type BuildFilterInput = z.infer<typeof buildFilterSchema>;
export type BuildOutputInput = z.infer<typeof buildOutputSchema>;

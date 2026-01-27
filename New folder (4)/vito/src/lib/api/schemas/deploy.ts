/**
 * OLYMPUS 2.0 - Deploy Validation Schemas
 */

import { z } from 'zod';

/** Deploy target */
const deployTarget = z.enum(['olympus', 'vercel', 'netlify', 'railway', 'aws', 'export']);

/** Deploy environment */
const deployEnvironment = z.enum(['preview', 'staging', 'production']);

/** Deploy status */
const deployStatus = z.enum([
  'queued',
  'building',
  'deploying',
  'promoting',
  'ready',
  'failed',
  'canceled',
]);

/** Domain validation */
const domain = z.string()
  .min(3)
  .max(253)
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Invalid domain format');

/** Create deployment schema */
export const createDeploySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  versionId: z.string().uuid().optional(), // Defaults to latest build
  target: deployTarget,
  environment: deployEnvironment,
  config: z.object({
    domain: domain.optional(),
    subdomain: z.string().max(63).optional(),
    envVars: z.record(z.string()).optional(),
    regions: z.array(z.string()).max(10).optional(),
    scaling: z.object({
      minInstances: z.number().int().min(0).max(100).optional(),
      maxInstances: z.number().int().min(1).max(1000).optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
});

/** Promote deployment schema */
export const promoteDeploySchema = z.object({
  deploymentId: z.string().uuid('Invalid deployment ID'),
  targetEnvironment: z.enum(['staging', 'production']),
  config: z.object({
    domain: domain.optional(),
    envVars: z.record(z.string()).optional(),
  }).optional(),
});

/** Rollback deployment schema */
export const rollbackDeploySchema = z.object({
  targetDeploymentId: z.string().uuid('Invalid deployment ID'),
  reason: z.string().max(500).optional(),
});

/** Cancel deployment schema */
export const cancelDeploySchema = z.object({
  reason: z.string().max(500).optional(),
});

/** Redeploy schema */
export const redeploySchema = z.object({
  deploymentId: z.string().uuid('Invalid deployment ID'),
  clearCache: z.boolean().optional().default(false),
});

/** Add domain to deployment schema */
export const addDeployDomainSchema = z.object({
  domain,
  isPrimary: z.boolean().optional().default(false),
});

/** Update deployment config schema */
export const updateDeployConfigSchema = z.object({
  envVars: z.record(z.string()).optional(),
  scaling: z.object({
    minInstances: z.number().int().min(0).max(100).optional(),
    maxInstances: z.number().int().min(1).max(1000).optional(),
  }).optional(),
  regions: z.array(z.string()).max(10).optional(),
});

/** Deployment filter schema */
export const deployFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  environment: deployEnvironment.optional(),
  status: z.union([deployStatus, z.array(deployStatus)]).optional(),
  target: deployTarget.optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
});

/** Deployment logs query schema */
export const deployLogsSchema = z.object({
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  follow: z.boolean().optional().default(false),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export type CreateDeployInput = z.infer<typeof createDeploySchema>;
export type PromoteDeployInput = z.infer<typeof promoteDeploySchema>;
export type RollbackDeployInput = z.infer<typeof rollbackDeploySchema>;
export type UpdateDeployConfigInput = z.infer<typeof updateDeployConfigSchema>;
export type DeployFilterInput = z.infer<typeof deployFilterSchema>;
export type DeployLogsInput = z.infer<typeof deployLogsSchema>;

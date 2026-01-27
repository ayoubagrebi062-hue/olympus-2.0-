/**
 * OLYMPUS 2.0 - Project Validation Schemas
 */

import { z } from 'zod';

/** Project slug */
const projectSlug = z.string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes');

/** Project status */
const projectStatus = z.enum(['draft', 'building', 'ready', 'deployed', 'archived']);

/** Project visibility */
const projectVisibility = z.enum(['private', 'team', 'public']);

/** Create project schema */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: projectSlug.optional(), // Auto-generated if not provided
  description: z.string().max(20000).optional(),
  visibility: projectVisibility.optional().default('private'),
  template: z.string().optional(), // Template ID to clone from
  settings: z.object({
    framework: z.string().optional(),
    nodeVersion: z.string().optional(),
    buildCommand: z.string().optional(),
    outputDirectory: z.string().optional(),
  }).optional(),
});

/** Update project schema */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: projectSlug.optional(),
  description: z.string().max(20000).optional().nullable(),
  visibility: projectVisibility.optional(),
  status: projectStatus.optional(),
  settings: z.object({
    framework: z.string().optional(),
    nodeVersion: z.string().optional(),
    buildCommand: z.string().optional(),
    outputDirectory: z.string().optional(),
    installCommand: z.string().optional(),
    rootDirectory: z.string().optional(),
  }).optional(),
});

/** Archive project schema */
export const archiveProjectSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** Clone project schema */
export const cloneProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: projectSlug.optional(),
  includeEnvVars: z.boolean().optional().default(false),
  includeCollaborators: z.boolean().optional().default(false),
});

/** Add collaborator schema */
export const addCollaboratorSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['editor', 'viewer']),
});

/** Update collaborator schema */
export const updateCollaboratorSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

/** Create file schema */
export const createFileSchema = z.object({
  path: z.string().min(1).max(500).regex(/^[^<>:"|?*]+$/, 'Invalid file path'),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

/** Update file schema */
export const updateFileSchema = z.object({
  content: z.string().max(10 * 1024 * 1024),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});

/** Rename file schema */
export const renameFileSchema = z.object({
  newPath: z.string().min(1).max(500).regex(/^[^<>:"|?*]+$/, 'Invalid file path'),
});

/** Set env var schema */
export const setEnvVarSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/, 'Must be uppercase with underscores'),
  value: z.string().max(32768), // 32KB max
  target: z.enum(['development', 'preview', 'production']).array().optional(),
  isSecret: z.boolean().optional().default(false),
});

/** Bulk set env vars schema */
export const bulkSetEnvVarsSchema = z.object({
  variables: z.array(setEnvVarSchema).min(1).max(100),
  overwrite: z.boolean().optional().default(false),
});

/** Rollback version schema */
export const rollbackVersionSchema = z.object({
  versionId: z.string().uuid('Invalid version ID'),
  reason: z.string().max(500).optional(),
});

/** Export project schema */
export const exportProjectSchema = z.object({
  format: z.enum(['zip', 'github']),
  includeEnvVars: z.boolean().optional().default(false),
  githubRepo: z.string().optional(), // Required if format is 'github'
  branch: z.string().optional().default('main'),
}).refine((data) => data.format !== 'github' || data.githubRepo, {
  message: 'GitHub repository is required for GitHub export',
  path: ['githubRepo'],
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
export type SetEnvVarInput = z.infer<typeof setEnvVarSchema>;
export type ExportProjectInput = z.infer<typeof exportProjectSchema>;

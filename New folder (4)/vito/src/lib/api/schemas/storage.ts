/**
 * OLYMPUS 2.0 - Storage Validation Schemas
 */

import { z } from 'zod';

/** Allowed file types */
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/json',
  'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown',
  'application/zip', 'application/gzip',
  'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
] as const;

/** Request upload URL schema */
export const requestUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(/^[^<>:"|?*\/\\]+$/, 'Invalid filename'),
  contentType: z.enum(allowedMimeTypes, {
    errorMap: () => ({ message: 'File type not allowed' })
  }),
  size: z.number()
    .int()
    .min(1, 'File size must be positive')
    .max(100 * 1024 * 1024, 'File size exceeds 100MB limit'),
  projectId: z.string().uuid().optional(),
  folder: z.string().max(200).optional(),
  isPublic: z.boolean().optional().default(false),
  metadata: z.record(z.string()).optional(),
});

/** Complete upload schema */
export const completeUploadSchema = z.object({
  uploadId: z.string().uuid('Invalid upload ID'),
  parts: z.array(z.object({
    partNumber: z.number().int().min(1),
    etag: z.string(),
  })).optional(), // For multipart uploads
});

/** Delete file schema */
export const deleteFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  permanent: z.boolean().optional().default(false),
});

/** Bulk delete schema */
export const bulkDeleteSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
  permanent: z.boolean().optional().default(false),
});

/** Move file schema */
export const moveFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  targetFolder: z.string().max(200),
  newFilename: z.string().max(255).optional(),
});

/** Copy file schema */
export const copyFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  targetFolder: z.string().max(200),
  newFilename: z.string().max(255).optional(),
});

/** Create folder schema */
export const createFolderSchema = z.object({
  path: z.string().min(1).max(200),
  projectId: z.string().uuid().optional(),
});

/** List files schema */
export const listFilesSchema = z.object({
  folder: z.string().max(200).optional(),
  projectId: z.string().uuid().optional(),
  contentType: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  minSize: z.number().int().min(0).optional(),
  maxSize: z.number().int().min(0).optional(),
});

/** Get signed URL schema */
export const signedUrlSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  expiresIn: z.number().int().min(60).max(604800).optional().default(3600), // 1 hour default, max 7 days
  disposition: z.enum(['inline', 'attachment']).optional().default('inline'),
});

/** Storage usage query schema */
export const storageUsageSchema = z.object({
  projectId: z.string().uuid().optional(),
  groupBy: z.enum(['project', 'contentType', 'folder']).optional(),
});

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type MoveFileInput = z.infer<typeof moveFileSchema>;
export type ListFilesInput = z.infer<typeof listFilesSchema>;
export type SignedUrlInput = z.infer<typeof signedUrlSchema>;

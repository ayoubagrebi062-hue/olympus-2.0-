/**
 * OLYMPUS 2.0 - Common Validation Schemas
 */

import { z } from 'zod';

// =============================================================================
// PAGINATION
// =============================================================================

/** Pagination query schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================================================
// IDS
// =============================================================================

/** UUID schema */
export const uuidSchema = z.string().uuid('Invalid ID format');

/** ID params schema */
export const idParamsSchema = z.object({
  id: uuidSchema,
});

/** Multiple IDs schema */
export const idsSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
});

// =============================================================================
// DATES
// =============================================================================

/** Date range schema */
export const dateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
}).refine((data) => new Date(data.start) < new Date(data.end), {
  message: 'Start date must be before end date',
});

/** Date filter schema */
export const dateFilterSchema = z.object({
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
});

// =============================================================================
// SEARCH
// =============================================================================

/** Search query schema */
export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  fields: z.array(z.string()).max(10).optional(),
  fuzzy: z.boolean().optional().default(false),
});

// =============================================================================
// WEBHOOKS
// =============================================================================

/** Webhook config schema */
export const webhookConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1).max(50),
  secret: z.string().min(16).max(64).optional(),
  enabled: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(5).default(3),
    backoffMs: z.number().int().min(1000).max(60000).default(5000),
  }).optional(),
});

// =============================================================================
// ANALYTICS
// =============================================================================

/** Track event schema */
export const trackEventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

/** Metrics query schema */
export const metricsQuerySchema = z.object({
  metrics: z.array(z.string()).min(1).max(20),
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  start: z.string().datetime(),
  end: z.string().datetime(),
  groupBy: z.string().optional(),
});

// =============================================================================
// EXPORTS
// =============================================================================

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;
export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;

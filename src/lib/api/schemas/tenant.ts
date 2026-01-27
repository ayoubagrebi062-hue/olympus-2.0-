/**
 * OLYMPUS 2.0 - Tenant Validation Schemas
 */

import { z } from 'zod';

/** Slug validation (lowercase, alphanumeric, dashes) */
const slug = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
  .regex(/^[a-z]/, 'Slug must start with a letter')
  .regex(/[a-z0-9]$/, 'Slug must end with a letter or number');

/** Create tenant schema */
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug,
  description: z.string().max(500).optional(),
  logo: z.string().url().optional().nullable(),
  settings: z
    .object({
      defaultTimezone: z.string().optional(),
      defaultLocale: z.string().optional(),
    })
    .optional(),
});

/** Update tenant schema */
export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slug.optional(),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
});

/** Tenant settings schema */
export const tenantSettingsSchema = z.object({
  defaultTimezone: z.string().max(50).optional(),
  defaultLocale: z.string().max(10).optional(),
  allowPublicProjects: z.boolean().optional(),
  requireMfa: z.boolean().optional(),
  allowedEmailDomains: z.array(z.string()).optional(),
  defaultProjectVisibility: z.enum(['private', 'team', 'public']).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  slackWebhookUrl: z.string().url().optional().nullable(),
});

/** Invite member schema */
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member', 'viewer']),
  message: z.string().max(500).optional(),
});

/** Bulk invite schema */
export const bulkInviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'member', 'viewer']),
      })
    )
    .min(1)
    .max(50),
  message: z.string().max(500).optional(),
});

/** Update member role schema */
export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

/** Transfer ownership schema */
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
  confirmName: z.string(), // Must match tenant name
});

/** Add domain schema */
export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, 'Invalid domain format'),
  isPrimary: z.boolean().optional().default(false),
});

/** Verify domain schema */
export const verifyDomainSchema = z.object({
  domainId: z.string().uuid(),
});

/** Accept invitation schema */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AddDomainInput = z.infer<typeof addDomainSchema>;

/**
 * OLYMPUS 2.0 - Server Auth Context
 *
 * Builds the full authentication context with user, tenant, and permissions.
 */

import { cache } from 'react';
import { createServerSupabaseClient } from '../clients/server';
import { getSession, getSupabaseUser, getSessionClaims } from './session';
import type {
  User,
  Tenant,
  TenantMembership,
  AuthSession,
  Permission,
  TenantRole,
  PlanTier,
} from '../types';

/**
 * Get the full auth session with user, tenant, and permissions.
 * This is the primary function for getting auth context.
 * Cached per request.
 */
export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
  const session = await getSession();
  if (!session) return null;

  const authUser = await getSupabaseUser();
  if (!authUser) return null;

  const claims = await getSessionClaims();
  const supabase = await createServerSupabaseClient();

  // Get user profile
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  const profile = rawProfile as any;

  // Build user object
  const user: User = {
    id: authUser.id,
    email: authUser.email || '',
    emailVerified: !!authUser.email_confirmed_at,
    displayName: profile?.display_name || authUser.user_metadata?.full_name || null,
    avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
    phone: authUser.phone || null,
    timezone: profile?.timezone || 'UTC',
    locale: profile?.locale || 'en',
    createdAt: profile?.created_at || authUser.created_at,
    updatedAt: profile?.updated_at || authUser.created_at,
    lastSeenAt: profile?.last_seen_at || null,
    isActive: profile?.is_active ?? true,
    currentTenantId: claims?.tenantId || null,
    currentTenantRole: (claims?.tenantRole as TenantRole) || null,
    preferences: profile?.preferences || getDefaultPreferences(),
    onboardingCompleted: profile?.onboarding_completed ?? false,
    onboardingStep: profile?.onboarding_step ?? 0,
  };

  // Get current tenant if set
  let tenant: Tenant | null = null;
  let membership: TenantMembership | null = null;

  if (claims?.tenantId) {
    const { data: rawTenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', claims.tenantId)
      .single();
    const tenantData = rawTenantData as any;

    if (tenantData) {
      tenant = mapTenantData(tenantData, claims.planTier as PlanTier);
    }

    const { data: rawMembershipData } = await supabase
      .from('tenant_members')
      .select('*')
      .eq('tenant_id', claims.tenantId)
      .eq('user_id', authUser.id)
      .single();
    const membershipData = rawMembershipData as any;

    if (membershipData) {
      membership = mapMembershipData(membershipData);
    }
  }

  return {
    session,
    user,
    tenant,
    membership,
    permissions: (claims?.permissions || []) as Permission[],
  };
});

function getDefaultPreferences() {
  return {
    theme: 'system' as const,
    notifications: {
      email: {
        marketing: false,
        productUpdates: true,
        buildCompleted: true,
        deploymentStatus: true,
        teamInvites: true,
        securityAlerts: true,
      },
      push: {
        buildCompleted: true,
        deploymentStatus: true,
        teamInvites: true,
      },
    },
    defaultTenantId: null,
  };
}

function mapTenantData(data: Record<string, unknown>, planTier?: PlanTier): Tenant {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: data.description as string | null,
    logoUrl: data.logo_url as string | null,
    brandColor: data.brand_color as string | null,
    billingEmail: data.billing_email as string | null,
    isActive: data.is_active as boolean,
    trialEndsAt: data.trial_ends_at as string | null,
    createdAt: data.created_at as string,
    createdBy: data.created_by as string,
    currentPlan: planTier,
  };
}

function mapMembershipData(data: Record<string, unknown>): TenantMembership {
  return {
    tenantId: data.tenant_id as string,
    userId: data.user_id as string,
    role: data.role as TenantRole,
    customPermissions: data.custom_permissions as string[] | null,
    invitedBy: data.invited_by as string | null,
    joinedAt: data.joined_at as string,
    isActive: data.is_active as boolean,
  };
}

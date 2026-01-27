/**
 * OLYMPUS 2.0 - Authentication Types
 *
 * Comprehensive type definitions for the authentication and authorization system.
 * These types are used across frontend, middleware, and API routes.
 */

import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ============================================
// USER TYPES
// ============================================

/**
 * Extended user type with OLYMPUS-specific fields
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  timezone: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  isActive: boolean;

  // Current context
  currentTenantId: string | null;
  currentTenantRole: TenantRole | null;

  // Preferences
  preferences: UserPreferences;

  // Onboarding
  onboardingCompleted: boolean;
  onboardingStep: number;
}

/**
 * User preferences stored in profile
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  defaultTenantId: string | null;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: {
    marketing: boolean;
    productUpdates: boolean;
    buildCompleted: boolean;
    deploymentStatus: boolean;
    teamInvites: boolean;
    securityAlerts: boolean;
  };
  push: {
    buildCompleted: boolean;
    deploymentStatus: boolean;
    teamInvites: boolean;
  };
}

/**
 * Raw Supabase user (re-export for convenience)
 */
export type { SupabaseUser, Session };

// ============================================
// TENANT TYPES
// ============================================

/**
 * Tenant (organization/workspace)
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  billingEmail: string | null;
  isActive: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  createdBy: string;

  // Computed fields
  memberCount?: number;
  projectCount?: number;
  currentPlan?: PlanTier;
}

/**
 * User's membership in a tenant
 */
export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
  customPermissions: string[] | null;
  invitedBy: string | null;
  joinedAt: string;
  isActive: boolean;

  // Populated fields
  tenant?: Tenant;
  user?: User;
}

/**
 * Tenant invitation
 */
export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  message: string | null;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;

  // Populated fields
  tenant?: Tenant;
  inviter?: User;
}

// ============================================
// ROLE & PERMISSION TYPES
// ============================================

/**
 * Platform-level roles (Anthropic staff)
 */
export type PlatformRole =
  | 'super_admin'      // Full system access
  | 'platform_admin'   // Platform administration
  | 'platform_support' // Customer support
  | 'user';            // Standard user

/**
 * Tenant-level roles
 */
export type TenantRole =
  | 'owner'     // Full tenant control, billing
  | 'admin'     // Manage members, settings
  | 'developer' // Create/edit projects
  | 'viewer';   // Read-only access

/**
 * Project-level roles (for collaborators)
 */
export type ProjectRole =
  | 'admin'   // Full project control
  | 'editor'  // Edit project
  | 'viewer'; // Read-only

/**
 * Plan tiers (affects permissions)
 */
export type PlanTier =
  | 'free'
  | 'starter'
  | 'pro'
  | 'business'
  | 'enterprise';

/**
 * Invitation status
 */
export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked';

/**
 * Permission string format: resource:action
 */
export type Permission =
  // Tenant permissions
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant:delete'
  | 'tenant:manage_billing'
  | 'tenant:manage_members'
  | 'tenant:manage_settings'
  | 'tenant:view_audit_logs'

  // Project permissions
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'project:manage_collaborators'
  | 'project:manage_env_vars'
  | 'project:export'

  // Build permissions
  | 'build:create'
  | 'build:read'
  | 'build:cancel'
  | 'build:view_logs'
  | 'build:view_costs'

  // Deployment permissions
  | 'deployment:create'
  | 'deployment:read'
  | 'deployment:rollback'
  | 'deployment:manage_domains'

  // File permissions
  | 'file:upload'
  | 'file:read'
  | 'file:delete'

  // Analytics permissions
  | 'analytics:read'
  | 'analytics:export'

  // API permissions
  | 'api:read_keys'
  | 'api:create_keys'
  | 'api:delete_keys'

  // Wildcard
  | '*';

/**
 * Role definition with permissions
 */
export interface RoleDefinition {
  name: TenantRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  hierarchyLevel: number;
  isDefault?: boolean;
}

// ============================================
// JWT & SESSION TYPES
// ============================================

/**
 * Custom claims added to JWT
 */
export interface JWTCustomClaims {
  tenant_id: string | null;
  tenant_role: TenantRole | null;
  tenant_slug: string | null;
  permissions: Permission[];
  plan_tier: PlanTier | null;
  is_platform_admin: boolean;
}

/**
 * Decoded JWT payload
 */
export interface JWTPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  aud: string;
  role: string;
  iat: number;
  exp: number;

  // Custom claims
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };

  // OLYMPUS custom claims
  olympus?: JWTCustomClaims;
}

/**
 * Session with user and tenant context
 */
export interface AuthSession {
  session: Session;
  user: User;
  tenant: Tenant | null;
  membership: TenantMembership | null;
  permissions: Permission[];
}

// ============================================
// AUTH FLOW TYPES
// ============================================

/**
 * Sign up request
 */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
  tenantName?: string;
  invitationToken?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sign up response
 */
export interface SignUpResponse {
  user: User;
  session: Session | null;
  tenant: Tenant | null;
  requiresEmailVerification: boolean;
}

/**
 * Sign in request
 */
export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'github';

/**
 * OAuth sign in request
 */
export interface OAuthSignInRequest {
  provider: OAuthProvider;
  redirectTo?: string;
  scopes?: string[];
}

/**
 * Magic link request
 */
export interface MagicLinkRequest {
  email: string;
  redirectTo?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password update request
 */
export interface PasswordUpdateRequest {
  currentPassword?: string;
  newPassword: string;
  token?: string;
}

/**
 * Tenant switch request
 */
export interface TenantSwitchRequest {
  tenantId: string;
}

// ============================================
// INVITATION TYPES
// ============================================

/**
 * Create invitation request
 */
export interface CreateInvitationRequest {
  email: string;
  role: TenantRole;
  message?: string;
  expiresInDays?: number;
}

/**
 * Accept invitation request
 */
export interface AcceptInvitationRequest {
  token: string;
  signUpData?: {
    password: string;
    displayName?: string;
  };
}

/**
 * Bulk invite request
 */
export interface BulkInviteRequest {
  invitations: Array<{
    email: string;
    role: TenantRole;
  }>;
  message?: string;
}

// ============================================
// SECURITY TYPES
// ============================================

/**
 * Login attempt record (for brute force protection)
 */
export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: string;
}

/**
 * Account lockout status
 */
export interface LockoutStatus {
  isLocked: boolean;
  lockedAt: string | null;
  unlockAt: string | null;
  failedAttempts: number;
  lastFailedAttempt: string | null;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Audit log entry for auth events
 */
export interface AuthAuditLog {
  id: string;
  action: AuthAuditAction;
  userId: string | null;
  email: string | null;
  tenantId: string | null;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  status: 'success' | 'failure';
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Auth audit actions
 */
export type AuthAuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'signup'
  | 'email_verified'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_changed'
  | 'oauth_login'
  | 'magic_link_requested'
  | 'magic_link_used'
  | 'session_refreshed'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'role_changed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'invitation_revoked'
  | 'member_added'
  | 'member_removed'
  | 'tenant_switched'
  | 'mfa_enabled'
  | 'mfa_disabled';

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Generic auth API response
 */
export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AuthErrorResponse;
}

/**
 * Auth error response
 */
export interface AuthErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryAfter?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// CONTEXT TYPES (for React)
// ============================================

/**
 * Auth context state
 */
export interface AuthContextState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  currentTenant: Tenant | null;
  tenants: TenantMembership[];
  currentRole: TenantRole | null;
  permissions: Permission[];

  signIn: (request: SignInRequest) => Promise<void>;
  signUp: (request: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (request: OAuthSignInRequest) => Promise<void>;
  signInWithMagicLink: (request: MagicLinkRequest) => Promise<void>;
  resetPassword: (request: PasswordResetRequest) => Promise<void>;
  updatePassword: (request: PasswordUpdateRequest) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshSession: () => Promise<void>;

  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: TenantRole) => boolean;
  hasMinRole: (role: TenantRole) => boolean;
}

// ============================================
// MIDDLEWARE TYPES
// ============================================

/**
 * Route protection configuration
 */
export interface RouteProtectionConfig {
  isPublic?: boolean;
  permissions?: Permission[];
  anyPermission?: Permission[];
  minRole?: TenantRole;
  roles?: TenantRole[];
  requireVerified?: boolean;
  requireSubscription?: boolean;
  requiredPlans?: PlanTier[];
  customCheck?: (session: AuthSession) => boolean | Promise<boolean>;
  redirectTo?: string;
}

/**
 * Protected route handler options
 */
export interface ProtectedRouteOptions {
  config: RouteProtectionConfig;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

// ============================================
// EMAIL TEMPLATE TYPES
// ============================================

/**
 * Email template types
 */
export type EmailTemplateType =
  | 'verification'
  | 'password_reset'
  | 'magic_link'
  | 'invitation'
  | 'welcome'
  | 'password_changed'
  | 'account_locked'
  | 'new_device_login';

/**
 * Email template data
 */
export interface EmailTemplateData {
  verification: {
    userName: string;
    verificationUrl: string;
    expiresIn: string;
  };
  password_reset: {
    userName: string;
    resetUrl: string;
    expiresIn: string;
  };
  magic_link: {
    loginUrl: string;
    expiresIn: string;
  };
  invitation: {
    inviterName: string;
    tenantName: string;
    role: string;
    invitationUrl: string;
    message?: string;
    expiresIn: string;
  };
  welcome: {
    userName: string;
    tenantName: string;
    dashboardUrl: string;
  };
  password_changed: {
    userName: string;
    changedAt: string;
    ipAddress: string;
    supportUrl: string;
  };
  account_locked: {
    userName: string;
    lockedAt: string;
    unlockAt: string;
    supportUrl: string;
  };
  new_device_login: {
    userName: string;
    deviceInfo: string;
    location: string;
    loginTime: string;
    supportUrl: string;
  };
}

// ============================================
// UTILITY TYPES
// ============================================

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

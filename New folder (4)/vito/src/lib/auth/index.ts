/**
 * OLYMPUS 2.0 - Auth Module Exports
 *
 * Central export point for all auth-related types, functions, and constants.
 */

// Types
export * from './types';

// Permissions & RBAC
export * from './permissions';

// Errors
export * from './errors';

// Constants
export * from './constants';

// Clients
export * from './clients';

// Security
export * from './security';

// Re-export commonly used types for convenience
export type {
  User,
  Tenant,
  TenantMembership,
  TenantInvitation,
  Permission,
  TenantRole,
  ProjectRole,
  PlanTier,
  AuthSession,
  JWTCustomClaims,
  SignInRequest,
  SignUpRequest,
  OAuthProvider,
  RouteProtectionConfig,
} from './types';

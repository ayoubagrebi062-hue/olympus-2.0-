/**
 * OLYMPUS 2.0 - Server Auth Module
 *
 * Barrel exports for server-side auth utilities.
 */

// Session utilities
export {
  getSession,
  getSupabaseUser,
  isAuthenticated,
  extractClaimsFromJWT,
  getSessionClaims,
  refreshSession,
} from './session';

// Auth context
export { getAuthSession } from './context';

// Auth guards
export {
  requireAuth,
  requireVerifiedAuth,
  requireTenantAccess,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  hasRole,
  requireRole,
} from './guards';

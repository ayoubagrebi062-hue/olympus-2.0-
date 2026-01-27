/**
 * OLYMPUS 2.0 - Auth Middleware
 *
 * Re-exports API auth utilities for route handlers and middleware protection.
 */

// API Route Protection (withAuth, withPermission, etc.)
export {
  withAuth,
  withVerifiedAuth,
  type AuthenticatedHandler,
  type HandlerContext,
  type AuthContext,
} from '../api/with-auth';

export { withPermission, withAnyPermission, withRole } from '../api/with-permission';

export { withTenantAccess, withCurrentTenant, type TenantHandler } from '../api/with-tenant';

export { checkRateLimit, rateLimitHeaders, withRateLimit } from '../api/rate-limit';

// Route Protection (Next.js middleware)
export {
  processAuthMiddleware,
  handleRouteProtection,
  addAuthHeaders,
  type MiddlewareAuthResult,
} from './route-protection';

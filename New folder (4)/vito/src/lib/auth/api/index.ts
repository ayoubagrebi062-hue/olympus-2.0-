/**
 * OLYMPUS 2.0 - API Auth Module
 *
 * Barrel exports for API protection utilities.
 */

export { withAuth, withVerifiedAuth } from './with-auth';
export type { AuthenticatedHandler, HandlerContext } from './with-auth';

export { withPermission, withAnyPermission, withRole } from './with-permission';

export { withTenantAccess, withCurrentTenant } from './with-tenant';
export type { TenantHandler } from './with-tenant';

export {
  checkRateLimit,
  rateLimitHeaders,
  withRateLimit,
} from './rate-limit';

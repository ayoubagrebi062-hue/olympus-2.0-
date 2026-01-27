/**
 * OLYMPUS 2.0 - Auth Middleware
 *
 * Re-exports auth middleware for backwards compatibility.
 * Actual implementation is in @/lib/auth/api/with-auth.ts
 */

export { withAuth, withVerifiedAuth } from './api/with-auth';
export type { AuthContext, AuthenticatedHandler, HandlerContext } from './api/with-auth';

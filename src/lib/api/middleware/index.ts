/**
 * OLYMPUS 2.0 - Middleware Module
 */

// P7-Compatible middleware (default exports for backward compatibility)
export { withAuth, withTenant, withPermission, compose, type P7Context } from './compat';

// P8 Native middleware (use these for new code)
export { withAuth as withAuthV2, withOptionalAuth, getUserIdFromRequest } from './auth';
export { withTenant as withTenantV2, getTenant, isTenantOwner } from './tenant';
export {
  withPermission as withPermissionV2,
  withAnyPermission,
  withAllPermissions,
  hasPermission,
  getPermissionsForRole,
  canPerform,
} from './permission';

// Validation
export { withValidation, withQueryValidation, withPathValidation, validators } from './validation';

// Logging
export { withLogging, logSlowRequest, createLogger } from './logging';

// Composition (P8 native)
export {
  withErrorHandling,
  createHandler,
  compose as composeV2,
  applyIf,
  methodHandler,
} from './compose';

// Plan
export {
  withPlanFeature,
  withPlanLimit,
  planHasFeature,
  getPlanLimit,
  getMinimumPlanForFeature,
} from './plan';

// CORS
export {
  withCors,
  addCorsHeaders,
  handlePreflight,
  createOptionsHandler,
  type CorsConfig,
} from './cors';

// Security (OLYMPUS 2.1 Blueprint)
export {
  withSecurity,
  withPromptProtection,
  withBruteForceProtection,
  addSecurityHeaders,
  addRateLimitHeaders,
  getClientIP,
  SECURITY_MIDDLEWARE,
  type SecurityContext,
  type SecurityOptions,
} from './security';

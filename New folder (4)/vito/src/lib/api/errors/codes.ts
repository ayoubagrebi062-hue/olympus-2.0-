/**
 * OLYMPUS 2.0 - API Error Codes
 */

/**
 * Complete error codes catalog.
 */
export const ERROR_CODES = {
  // Auth (401)
  AUTH_001: 'Invalid credentials', AUTH_002: 'Token expired', AUTH_003: 'Token invalid',
  AUTH_004: 'Email not verified', AUTH_005: 'Account locked', AUTH_006: 'Account disabled',
  AUTH_007: 'Invalid reset token', AUTH_008: 'Reset token expired', AUTH_009: 'Session expired',
  AUTH_010: 'MFA required', AUTH_011: 'Invalid MFA code', AUTH_012: 'Too many login attempts',
  // Authorization (403)
  AUTHZ_001: 'Unauthorized', AUTHZ_002: 'Forbidden', AUTHZ_003: 'Insufficient permissions',
  AUTHZ_004: 'Resource access denied', AUTHZ_005: 'Feature not available on current plan',
  // Tenant
  TENANT_001: 'Tenant not found', TENANT_002: 'Not a tenant member', TENANT_003: 'Insufficient tenant permissions',
  TENANT_004: 'Member limit reached', TENANT_005: 'Cannot remove owner', TENANT_006: 'Cannot change owner role',
  TENANT_007: 'Invitation not found', TENANT_008: 'Invitation expired', TENANT_009: 'Already a member',
  TENANT_010: 'Invalid invitation token', TENANT_011: 'Domain already in use', TENANT_012: 'Domain verification failed',
  // Project
  PROJECT_001: 'Project not found', PROJECT_002: 'Project limit reached', PROJECT_003: 'Invalid project state',
  PROJECT_004: 'Project name already exists', PROJECT_005: 'Cannot delete project with active deployments',
  PROJECT_006: 'Project is archived', PROJECT_007: 'Version not found', PROJECT_008: 'Cannot rollback to current version',
  PROJECT_009: 'Export failed', PROJECT_010: 'Import failed',
  // File
  FILE_001: 'File not found', FILE_002: 'File size exceeds limit', FILE_003: 'Invalid file type',
  FILE_004: 'File path already exists', FILE_005: 'Cannot delete protected file', FILE_006: 'Storage limit exceeded',
  // Build
  BUILD_001: 'Build not found', BUILD_002: 'Build limit reached', BUILD_003: 'Build already in progress',
  BUILD_004: 'Build cannot be canceled', BUILD_005: 'Invalid build configuration', BUILD_006: 'Build failed',
  BUILD_007: 'Build timeout', BUILD_008: 'AI engine unavailable', BUILD_009: 'Invalid build tier', BUILD_010: 'Build queue full',
  // Deploy
  DEPLOY_001: 'Deployment not found', DEPLOY_002: 'Deploy limit reached', DEPLOY_003: 'Invalid deployment target',
  DEPLOY_004: 'Domain verification failed', DEPLOY_005: 'Deployment in progress', DEPLOY_006: 'Deployment failed',
  DEPLOY_007: 'Cannot rollback', DEPLOY_008: 'No successful builds to deploy', DEPLOY_009: 'SSL provisioning failed',
  DEPLOY_010: 'Environment variable limit exceeded',
  // Rate Limit (429)
  RATE_001: 'Rate limit exceeded', RATE_002: 'Too many requests', RATE_003: 'Quota exceeded for current billing period',
  // Validation (422)
  VAL_001: 'Invalid request body', VAL_002: 'Missing required field', VAL_003: 'Invalid field format',
  VAL_004: 'Invalid query parameters', VAL_005: 'Invalid path parameters', VAL_006: 'Request body too large',
  // Storage
  STORAGE_001: 'Upload failed', STORAGE_002: 'Download failed', STORAGE_003: 'Storage quota exceeded',
  STORAGE_004: 'Invalid upload token', STORAGE_005: 'Upload expired',
  // Webhook
  WEBHOOK_001: 'Invalid webhook signature', WEBHOOK_002: 'Webhook processing failed', WEBHOOK_003: 'Unknown webhook event',
  // Internal (500)
  INT_001: 'Internal server error', INT_002: 'Service unavailable', INT_003: 'Database error',
  INT_004: 'Cache error', INT_005: 'External service error', INT_006: 'Configuration error',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Get error message by code */
export function getErrorMessage(code: string): string {
  return ERROR_CODES[code as ErrorCode] || 'Unknown error';
}

/** HTTP status codes for error categories */
export const ERROR_STATUS_MAP: Record<string, number> = {
  AUTH: 401, AUTHZ: 403, TENANT: 400, PROJECT: 400, FILE: 400, BUILD: 400,
  DEPLOY: 400, RATE: 429, VAL: 422, STORAGE: 400, WEBHOOK: 400, INT: 500,
};

/** Get HTTP status for error code */
export function getErrorStatus(code: string): number {
  return ERROR_STATUS_MAP[code.split('_')[0]] || 500;
}

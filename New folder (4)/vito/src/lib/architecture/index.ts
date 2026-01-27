/**
 * OLYMPUS 2.1 - Architecture Blueprint
 * 
 * "One blessed stack. No exceptions."
 * 
 * Constraints and validation for ARCHON, DATUM, NEXUS, FORGE, SENTINEL agents.
 * 
 * Stack: Next.js 14 + Supabase + Prisma + Vercel + Tailwind + Zustand
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STACK TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  BLESSED_STACK,
  FORBIDDEN_TECHNOLOGIES,
  APPROVED_DEPENDENCIES,
  FILE_STORAGE_RULES,
  ENV_VAR_RULES,
  STACK_TOKENS,
  // Helpers
  isApprovedDependency,
  isForbiddenTechnology,
  isAllowedFileType,
  isFileSizeAllowed,
  isBannedFileExtension,
  // Types
  type ArchonOutput,
} from './stack-tokens';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA RULES (DATUM)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SCHEMA_NAMING,
  REQUIRED_FIELDS,
  MULTI_TENANCY,
  RELATIONSHIP_PATTERNS,
  INDEX_RULES,
  DATA_TYPES,
  COMMON_SCHEMAS,
  SCHEMA_VALIDATION_RULES,
  SCHEMA_RULES,
  // Types
  type DatumOutput,
} from './schema-rules';

// ═══════════════════════════════════════════════════════════════════════════════
// API RULES (NEXUS)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  API_STYLE,
  URL_PATTERNS,
  HTTP_METHODS,
  RESPONSE_FORMAT,
  STATUS_CODES,
  ERROR_CODES,
  PAGINATION,
  FILTERING,
  API_AUTH,
  API_VALIDATION_RULES,
  API_RULES,
  // Types
  type NexusOutput,
} from './api-rules';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY RULES (SENTINEL)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  AUTH_RULES,
  DATA_PROTECTION,
  INPUT_VALIDATION,
  SQL_SECURITY,
  XSS_SECURITY,
  API_SECURITY,
  SECRETS_MANAGEMENT,
  AUDIT_LOGGING,
  SECURITY_VALIDATION_RULES,
  SECURITY_RULES,
  // Types
  type SentinelOutput,
} from './security-rules';

// ═══════════════════════════════════════════════════════════════════════════════
// GATES
// ═══════════════════════════════════════════════════════════════════════════════

export { schemaValidationGate, schemaGate } from './gates/schema-gate';
export { apiValidationGate, apiGate } from './gates/api-gate';
export { securityValidationGate, securityGate } from './gates/security-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ArchitectureOrchestrator,
  validateArchitecture,
  formatArchResultForCLI,
  // Types
  type FileToCheck,
  type GateResult,
  type GateIssue,
  type GateDefinition,
  type ArchOrchestratorResult,
  type ArchOrchestratorOptions,
} from './orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const ARCHITECTURE_BLUEPRINT_VERSION = '2.1.0';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

import { ArchitectureOrchestrator } from './orchestrator';
export default ArchitectureOrchestrator;

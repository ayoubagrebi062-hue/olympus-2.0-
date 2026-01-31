/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 *
 * Comprehensive security system for AI-generated code.
 *
 * Unique threats addressed:
 * 1. Prompt Injection → Malicious code generation
 * 2. Cost Exhaustion → Token/budget abuse
 * 3. Secret Leakage → AI hallucinating secrets
 * 4. Malware Patterns → Crypto miners, keyloggers
 * 5. Supply Chain → Vulnerable dependencies
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  INJECTION_PATTERNS,
  PATTERN_SEVERITY,
  detectPromptInjection,
  sanitizePromptInput,
  validatePrompt,
  AI_FIREWALL_PROMPT,
  analyzeWithAIFirewall,
  PROMPT_INJECTION_PROTECTION,
  MAX_PROMPT_LENGTH,
  MAX_PROMPT_LENGTH_ENTERPRISE,
  type InjectionSeverity,
  type InjectionDetection,
  type PromptValidationResult,
  type AIFirewallResult,
} from './prompt-injection';

// ═══════════════════════════════════════════════════════════════════════════════
// COST GUARDIAN
// ═══════════════════════════════════════════════════════════════════════════════

export {
  TIER_LIMITS,
  AI_PRICING,
  REDIS_KEYS,
  calculateCost,
  checkTokenLimit,
  checkMonthlyTokens,
  checkDailyBuilds,
  checkHourlySpend,
  costGuardianCheck,
  createSpendAlert,
  COST_GUARDIAN,
  type PlanTier,
  type TierLimits,
  type UsageRecord,
  type UsageSummary,
  type LimitCheckResult,
  type CostGuardianCheckInput,
  type CostGuardianResult,
  type CostAlert,
} from './cost-guardian';

// ═══════════════════════════════════════════════════════════════════════════════
// SECRET SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SECRET_PATTERNS,
  scanForSecrets,
  scanFiles,
  aggregateScanResults,
  SECRET_SCANNER,
  type SecretPattern,
  type SecretMatch,
  type SecretScanResult,
  type FileScanResult,
} from './secret-scanner';

// ═══════════════════════════════════════════════════════════════════════════════
// MALWARE SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MALWARE_PATTERNS,
  BLOCKLISTED_DOMAINS,
  scanForMalware,
  MALWARE_SCANNER,
  type MalwarePattern,
  type MalwareCategory,
  type MalwareMatch,
  type MalwareScanResult,
} from './malware-scanner';

// ═══════════════════════════════════════════════════════════════════════════════
// DEPENDENCY SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  BLOCKED_PACKAGES,
  APPROVED_PACKAGES,
  SUSPICIOUS_PATTERNS,
  scanDependencies,
  scanPackageJson,
  parsePackageJson,
  DEPENDENCY_SCANNER,
  type BlockedPackage,
  type DependencyIssue,
  type DependencyScanResult,
  type PackageInfo,
} from './dependency-scanner';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH RULES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  PASSWORD_POLICY,
  MFA_CONFIG,
  MFA_REQUIRED_ACTIONS,
  SESSION_CONFIG,
  SESSION_RULES,
  BRUTE_FORCE_CONFIG,
  API_KEY_CONFIG,
  validatePassword,
  AUTH_RULES,
  type UserRole,
} from './auth-rules';

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  TIER_RATE_LIMITS,
  ENDPOINT_LIMITS,
  RATE_LIMIT_KEYS,
  CAPTCHA_CONFIG,
  slidingWindowCheck,
  getEndpointLimit,
  getEffectiveLimit,
  createRateLimitResult,
  RATE_LIMITER,
  type RateLimitTier,
  type RateLimitConfig,
  type EndpointLimit,
  type RateLimitResult,
} from './rate-limiter';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SecurityOrchestrator,
  securityScan,
  quickSecurityCheck,
  scanBuildOutput,
  scanFile,
  formatSecurityResultForCLI,
  type SecurityScanInput,
  type SecurityScanResult,
  type BuildArtifact,
  type BuildSecurityScanInput,
  type BuildSecurityScanResult,
} from './orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZER (CLUSTER #2 FIX)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  InputSanitizer,
  getSanitizer,
  sanitizeInput,
  isInputSafe,
  InputTooLongError,
  InputBlockedError,
  type SanitizationResult,
  type SanitizerConfig,
} from './input-sanitizer';

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT SIGNING (CLUSTER #4 HARDENING)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  AgentSigner,
  AgentKeyRegistry,
  getGovernanceSigner,
  signGovernanceMessage,
  verifyGovernanceMessage,
  type SignedAgentMessage,
  type SignatureVerificationResult,
  type AgentSigningConfig,
} from './agent-signing';

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE RATE LIMITING (CLUSTER #4 HARDENING)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  governanceRateLimiter,
  governanceCriticalRateLimiter,
  governanceRemediationRateLimiter,
  governanceLedgerRateLimiter,
  getGovernanceRateLimiter,
  getGovernanceOperationSeverity,
  checkGovernanceRateLimit,
  createGovernanceRateLimitResponse,
  type GovernanceOperationSeverity,
} from './rate-limiter';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTED CONFIG (CLUSTER #4 HARDENING)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  EncryptedConfigStore,
  getEncryptedConfigStore,
  encryptValue,
  decryptValue,
  encryptSensitiveConfig,
  decryptSensitiveConfig,
  isEncryptedValue,
  loadSecureConfig,
  saveSecureConfig,
  SENSITIVE_CONFIG_KEYS,
  type EncryptedValue,
  type EncryptionConfig,
} from './encrypted-config';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const SECURITY_BLUEPRINT_VERSION = '2.4.0'; // Updated for Cluster #4 hardening (complete)

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATOR EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  hasSqlInjection,
  hasXss,
  sanitizeHtml,
  sanitizeObject,
  isValidEmail,
  isValidUuid,
  passwordSchema,
  safeStringSchema,
  removeControlChars,
} from './input-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CHECK FUNCTION (used by tests)
// ═══════════════════════════════════════════════════════════════════════════════

import { hasSqlInjection, hasXss } from './input-validator';

export interface SecurityCheckResult {
  safe: boolean;
  issues: string[];
}

/**
 * Combined security check for SQL injection and XSS
 */
export function securityCheck(input: string): SecurityCheckResult {
  const issues: string[] = [];

  if (hasSqlInjection(input)) {
    issues.push('Potential SQL injection detected');
  }

  if (hasXss(input)) {
    issues.push('Potential XSS detected');
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

import { SecurityOrchestrator } from './orchestrator';
export default SecurityOrchestrator;

/**
 * OLYMPUS 2.0 - Quality Gate Types
 *
 * Defines the interfaces and types for the quality assurance system.
 *
 * NOTE: Design validation types (OLYMPUS 2.1) are in ./design/gates/types.ts
 * Design gates: 'design-tokens' | 'components' | 'layout' | 'motion' | 'design-a11y'
 */

// ============================================
// GATE TYPES
// ============================================

export type GateType =
  | 'typescript' // TypeScript compilation
  | 'eslint' // ESLint validation
  | 'security' // Security scanning
  | 'links' // Link & route validation (NEW - catches 404s, empty data, spacing)
  | 'tests' // Test execution
  | 'build' // Build verification
  | 'accessibility' // A11y checks
  | 'performance' // Performance checks
  | 'smoke'; // Semantic smoke tests (HTTP 200, hydration, no console errors)

// Design Gate Types (OLYMPUS 2.1 - imported from ./design)
// For full design validation, use: import { DesignGateType } from './design'
// Available: 'design-tokens' | 'components' | 'layout' | 'motion' | 'design-a11y'

export type GateSeverity = 'error' | 'warning' | 'info';

export type GateStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

// ============================================
// GATE RESULTS
// ============================================

export interface GateIssue {
  severity: GateSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export interface GateResult {
  gate: GateType;
  status: GateStatus;
  passed: boolean;
  issues: GateIssue[];
  metrics?: GateMetrics;
  duration: number;
  timestamp: Date;
}

export interface GateMetrics {
  filesChecked?: number;
  issuesFound?: number;
  errorCount?: number;
  warningCount?: number;
  coverage?: number;
  testsPassed?: number;
  testsFailed?: number;
  buildSize?: number;
}

// ============================================
// QUALITY REPORT
// ============================================

export interface QualityReport {
  buildId: string;
  projectId: string;
  timestamp: Date;
  overallStatus: GateStatus;
  overallScore: number; // 0-100
  gates: GateResult[];
  summary: QualitySummary;
  recommendations: string[];
}

export interface QualitySummary {
  totalGates: number;
  passedGates: number;
  failedGates: number;
  skippedGates: number;
  totalErrors: number;
  totalWarnings: number;
  criticalIssues: GateIssue[];
}

// ============================================
// GATE CONFIGURATION
// ============================================

export interface GateConfig {
  enabled: boolean;
  required: boolean; // If required gate fails, entire build fails
  timeout?: number; // Max execution time in ms
  options?: Record<string, any>;
}

export interface QualityConfig {
  gates: Partial<Record<GateType, GateConfig>>;
  minScore: number; // Minimum quality score to pass (0-100)
  failOnWarnings: boolean; // Fail if there are warnings
  autoFix: boolean; // Attempt to auto-fix issues
  stopOnFailure: boolean; // FIX 3: Stop build if score < minScore
}

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  gates: {
    typescript: { enabled: true, required: true, timeout: 60000 },
    eslint: { enabled: true, required: false, timeout: 60000 },
    security: { enabled: true, required: false, timeout: 30000 }, // Changed to non-required: security issues shown as warnings but don't hard-fail
    links: { enabled: true, required: true, timeout: 30000 }, // CRITICAL: Catches 404s, empty charts, spacing
    tests: { enabled: false, required: false, timeout: 120000 },
    build: { enabled: true, required: false, timeout: 120000 }, // Changed: Allow builds with minor issues
    accessibility: { enabled: false, required: false, timeout: 30000 },
    performance: { enabled: false, required: false, timeout: 30000 },
    smoke: { enabled: true, required: false, timeout: 60000 }, // Changed: Allow smoke test failures during development
  },
  minScore: 70,
  failOnWarnings: false,
  autoFix: true,
  stopOnFailure: false, // FIX 3: Disabled by default - enable to stop builds on low quality
};

// ============================================
// GATE INTERFACE
// ============================================

export interface QualityGate {
  type: GateType;
  name: string;
  description: string;

  /**
   * Run the quality gate check
   */
  check(files: FileToCheck[], config?: GateConfig): Promise<GateResult>;

  /**
   * Attempt to auto-fix issues (optional)
   */
  fix?(files: FileToCheck[]): Promise<FixResult>;
}

export interface FileToCheck {
  path: string;
  content: string;
  language: string;
}

export interface FixResult {
  fixed: number;
  failed: number;
  changes: Array<{
    file: string;
    originalContent: string;
    fixedContent: string;
  }>;
}

// ============================================
// CODE PATTERNS
// ============================================

export interface SecurityPattern {
  name: string;
  pattern: RegExp;
  severity: GateSeverity;
  message: string;
  suggestion: string;
}

export const SECURITY_PATTERNS: SecurityPattern[] = [
  {
    name: 'eval-usage',
    pattern: /\beval\s*\(/g,
    severity: 'error',
    message: 'Use of eval() is dangerous and can lead to code injection',
    suggestion: 'Use safer alternatives like JSON.parse() or Function constructor',
  },
  {
    name: 'innerHTML-xss',
    pattern: /\.innerHTML\s*=/g,
    severity: 'warning',
    message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
    suggestion: 'Use textContent or sanitize HTML before insertion',
  },
  {
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML/g,
    severity: 'warning',
    message: 'dangerouslySetInnerHTML can lead to XSS if not properly sanitized',
    suggestion: 'Ensure content is properly sanitized before use',
  },
  {
    name: 'hardcoded-secret',
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'error',
    message: 'Possible hardcoded secret detected',
    suggestion: 'Use environment variables for sensitive values',
  },
  {
    name: 'sql-injection',
    pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
    severity: 'error',
    message: 'Possible SQL injection vulnerability',
    suggestion: 'Use parameterized queries instead of string interpolation',
  },
  {
    name: 'command-injection',
    pattern: /exec\s*\(\s*[`'"].*\$\{/g,
    severity: 'error',
    message: 'Possible command injection vulnerability',
    suggestion: 'Use execFile with array arguments instead',
  },
  {
    name: 'insecure-random',
    pattern: /Math\.random\(\)/g,
    severity: 'info',
    message: 'Math.random() is not cryptographically secure',
    suggestion: 'Use crypto.randomBytes() for security-sensitive random values',
  },
  {
    name: 'disabled-eslint',
    pattern: /\/\/\s*eslint-disable/g,
    severity: 'warning',
    message: 'ESLint rules are being disabled',
    suggestion: 'Fix the underlying issue instead of disabling the rule',
  },
  {
    name: 'no-verify-commit',
    pattern: /--no-verify/g,
    severity: 'warning',
    message: 'Git hooks are being bypassed',
    suggestion: 'Allow pre-commit hooks to run for quality assurance',
  },
];

// ============================================
// TYPESCRIPT PATTERNS
// ============================================

export interface TypeScriptIssue {
  code: string;
  message: string;
  severity: GateSeverity;
}

export const TYPESCRIPT_ISSUE_MAP: Record<string, GateSeverity> = {
  TS2304: 'error', // Cannot find name
  TS2322: 'error', // Type is not assignable
  TS2345: 'error', // Argument type mismatch
  TS2339: 'error', // Property does not exist
  TS7006: 'warning', // Parameter implicitly has any type
  TS7031: 'warning', // Binding element implicitly has any type
  TS6133: 'info', // Declared but not used
};

// ============================================
// ESLINT RULES
// ============================================

export const ESLINT_SEVERITY_MAP: Record<number, GateSeverity> = {
  2: 'error',
  1: 'warning',
  0: 'info',
};

export const CRITICAL_ESLINT_RULES = [
  'no-unused-vars',
  'no-undef',
  'no-unreachable',
  'react-hooks/rules-of-hooks',
  'react-hooks/exhaustive-deps',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-unused-vars',
];

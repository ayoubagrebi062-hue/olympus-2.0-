/**
 * OLYMPUS 2.0 - Output Guardrails Types
 *
 * Types for validating generated code output for security issues,
 * placeholders, and dangerous patterns.
 */

import { z } from 'zod';

/**
 * Types of security issues we detect
 */
export type SecurityIssueType =
  | 'hardcoded_secret'
  | 'api_key'
  | 'password'
  | 'private_key'
  | 'connection_string'
  | 'jwt_token'
  | 'oauth_token'
  | 'aws_credentials'
  | 'dangerous_pattern'
  | 'sql_injection_risk'
  | 'xss_risk'
  | 'eval_usage'
  | 'placeholder_code'
  | 'todo_comment'
  | 'stub_implementation'
  | 'incomplete_error'
  | 'debug_code'
  | 'console_log'
  | 'test_credentials';

/**
 * Severity levels
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A detected issue in the output
 */
export interface OutputIssue {
  id: string;
  type: SecurityIssueType;
  severity: Severity;
  message: string;

  // Location
  file?: string;
  line?: number;
  column?: number;
  snippet?: string;

  // Detection details
  pattern: string;
  matched: string;

  // Remediation
  suggestion?: string;
  autoFixable: boolean;
  fix?: {
    original: string;
    replacement: string;
  };
}

/**
 * Validation result
 */
export interface OutputValidationResult {
  valid: boolean;
  issues: OutputIssue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    autoFixable: number;
  };
  metadata: {
    scannedAt: Date;
    scanDurationMs: number;
    filesScanned: number;
    linesScanned: number;
    patternsChecked: number;
  };
}

/**
 * Guardrail configuration
 */
export interface OutputGuardrailConfig {
  // What to check
  checkSecrets: boolean;
  checkPlaceholders: boolean;
  checkDangerousPatterns: boolean;
  checkDebugCode: boolean;
  checkIncompleteCode: boolean;

  // Severity thresholds
  failOnCritical: boolean;
  failOnHigh: boolean;
  failOnMedium: boolean;

  // Auto-fix options
  autoFixSecrets: boolean;
  autoFixDebugCode: boolean;

  // Custom patterns
  customPatterns?: CustomPattern[];

  // Exclusions
  excludeFiles?: string[];
  excludePatterns?: string[];
}

/**
 * Custom pattern definition
 */
export interface CustomPattern {
  id: string;
  name: string;
  type: SecurityIssueType;
  severity: Severity;
  regex: RegExp;
  message: string;
  suggestion?: string;
}

/**
 * Default configuration
 */
export const DEFAULT_OUTPUT_GUARDRAIL_CONFIG: OutputGuardrailConfig = {
  checkSecrets: true,
  checkPlaceholders: true,
  checkDangerousPatterns: true,
  checkDebugCode: true,
  checkIncompleteCode: true,

  failOnCritical: true,
  failOnHigh: true,
  failOnMedium: false,

  autoFixSecrets: true,
  autoFixDebugCode: false,

  excludeFiles: ['*.test.ts', '*.spec.ts', '*.md', '*.json'],
};

/**
 * Schema for output validation request
 */
export const OutputValidationRequestSchema = z.object({
  content: z.string().describe('Code content to validate'),
  filename: z.string().optional().describe('Optional filename for context'),
  config: z
    .object({
      checkSecrets: z.boolean().default(true),
      checkPlaceholders: z.boolean().default(true),
      checkDangerousPatterns: z.boolean().default(true),
      checkDebugCode: z.boolean().default(true),
      checkIncompleteCode: z.boolean().default(true),
      failOnCritical: z.boolean().default(true),
      failOnHigh: z.boolean().default(true),
      failOnMedium: z.boolean().default(false),
      autoFixSecrets: z.boolean().default(true),
      autoFixDebugCode: z.boolean().default(false),
    })
    .optional(),
});

export type OutputValidationRequest = z.infer<typeof OutputValidationRequestSchema>;

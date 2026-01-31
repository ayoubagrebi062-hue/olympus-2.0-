/**
 * OLYMPUS 2.0 - Agent Contract Testing System
 *
 * Contract testing ensures that what Agent A outputs matches what Agent B expects.
 * This catches handoff corruption, missing fields, and format mismatches.
 */

import type { AgentId, AgentOutput } from '../types';

// ============================================================================
// CORE CONTRACT TYPES
// ============================================================================

/**
 * Field constraint for contract validation
 */
export interface FieldConstraint {
  /** Expected type: 'string' | 'number' | 'boolean' | 'array' | 'object' */
  type?: string;

  /** Minimum string length */
  minLength?: number;

  /** Maximum string length */
  maxLength?: number;

  /** Minimum array count */
  minCount?: number;

  /** Maximum array count */
  maxCount?: number;

  /** Minimum object keys count */
  minKeys?: number;

  /** Fields that must exist in array items */
  eachMustHave?: string[];

  /** Values that must be present (for arrays or object keys) */
  mustContain?: string[];

  /** Values that indicate invalid/placeholder content */
  mustNotBe?: string[];

  /** Regex pattern the value must match */
  mustMatch?: RegExp | string;

  /** Custom validation function */
  customValidator?: (value: unknown) => boolean;

  /** Human-readable description of why this constraint exists */
  reason?: string;
}

/**
 * Expected format for downstream agent
 */
export type ExpectedFormat = 'full_code' | 'summary' | 'structured_json';

/**
 * Contract definition between two agents
 */
export interface AgentContract {
  /** Upstream agent that produces output */
  upstream: AgentId;

  /** Downstream agent that consumes output */
  downstream: AgentId;

  /** Human-readable description */
  description: string;

  /** Required top-level fields in the output */
  requiredFields: string[];

  /** Constraints for specific fields (use dot notation for nested: 'components[].name') */
  fieldConstraints: Record<string, FieldConstraint>;

  /** Format expected by downstream agent */
  expectedFormat: ExpectedFormat;

  /** Minimum content length (for full_code format) */
  minContentLength?: number;

  /** Criticality level - determines if violation blocks build */
  criticality: 'critical' | 'high' | 'medium' | 'low';

  /** Custom validation function for complex checks */
  customValidation?: (output: unknown) => ContractViolation[];
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Severity of contract violation
 */
export type ViolationSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Single contract violation
 */
export interface ContractViolation {
  /** Which field failed validation */
  field: string;

  /** What constraint was violated */
  constraint: string;

  /** What was expected */
  expected: string;

  /** What was actually found */
  actual: string;

  /** Severity level */
  severity: ViolationSeverity;

  /** Suggested fix */
  suggestion?: string;
}

/**
 * Result of validating a single handoff
 */
export interface ContractValidationResult {
  /** Contract identifier (e.g., 'blocks→pixel') */
  contract: string;

  /** Whether validation passed */
  valid: boolean;

  /** List of violations found */
  violations: ContractViolation[];

  /** Timestamp of validation */
  timestamp: Date;

  /** Warning message (if no contract defined) */
  warning?: string;

  /** Error message for security-critical validation failures */
  error?: string;

  /** Time taken for validation (ms) */
  duration: number;
}

/**
 * Aggregate result for all handoffs in a build
 */
export interface ContractAuditResult {
  /** Build ID being audited */
  buildId: string;

  /** Total contracts checked */
  totalContracts: number;

  /** Contracts that passed */
  passed: number;

  /** Contracts that failed */
  failed: number;

  /** Detailed results per contract */
  results: ContractValidationResult[];

  /** Most common violation patterns */
  patterns: ViolationPattern[];

  /** Timestamp of audit */
  timestamp: Date;

  /** Total audit duration (ms) */
  duration: number;
}

/**
 * Pattern of repeated violations
 */
export interface ViolationPattern {
  /** Pattern description */
  pattern: string;

  /** How many times this pattern occurred */
  count: number;

  /** Which contracts exhibited this pattern */
  contracts: string[];

  /** Suggested root cause */
  likelyRootCause: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Registry of all defined contracts
 */
export interface ContractRegistry {
  contracts: Map<string, AgentContract>;

  /** Add a contract to the registry */
  register(contract: AgentContract): void;

  /** Get contract by key (e.g., 'blocks→pixel') */
  get(key: string): AgentContract | undefined;

  /** Get all contracts for an upstream agent */
  getDownstreamContracts(upstream: AgentId): AgentContract[];

  /** Get all contracts for a downstream agent */
  getUpstreamContracts(downstream: AgentId): AgentContract[];
}

/**
 * Options for contract validation
 */
export interface ValidationOptions {
  /** Stop on first violation */
  failFast?: boolean;

  /** Include warnings (not just errors) */
  includeWarnings?: boolean;

  /** Maximum violations to collect per contract */
  maxViolations?: number;

  /** Log violations as they're found */
  verbose?: boolean;
}

/**
 * Contract test result for reporting
 */
export interface ContractTestReport {
  /** Contract being tested */
  contract: string;

  /** Test status */
  status: 'passed' | 'failed' | 'skipped';

  /** Number of checks performed */
  checksPerformed: number;

  /** Number of checks passed */
  checksPassed: number;

  /** Violations (if any) */
  violations: ContractViolation[];

  /** Duration (ms) */
  duration: number;
}

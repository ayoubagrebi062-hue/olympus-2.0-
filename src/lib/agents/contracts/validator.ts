/**
 * OLYMPUS 2.0 - Contract Validator Engine
 *
 * Validates agent handoffs against defined contracts.
 * Used for investigation to find where data flow breaks down.
 */

import type { AgentId, AgentOutput } from '../types';
import type {
  AgentContract,
  ContractViolation,
  ContractValidationResult,
  ContractAuditResult,
  ViolationPattern,
  FieldConstraint,
  ValidationOptions,
  ViolationSeverity,
} from './types';

// ============================================================================
// CONTRACT VALIDATOR
// ============================================================================

/**
 * Contract Validator - validates agent handoffs against contracts
 */
export class ContractValidator {
  private contracts: Map<string, AgentContract> = new Map();
  private violationLog: ContractViolation[] = [];

  /**
   * Register a contract for validation
   */
  registerContract(contract: AgentContract): void {
    const key = this.makeKey(contract.upstream, contract.downstream);
    this.contracts.set(key, contract);
  }

  /**
   * Register multiple contracts
   */
  registerContracts(contracts: AgentContract[]): void {
    for (const contract of contracts) {
      this.registerContract(contract);
    }
  }

  /**
   * Get contract key
   */
  private makeKey(upstream: AgentId, downstream: AgentId): string {
    return `${upstream}→${downstream}`;
  }

  /**
   * Validate a handoff between two agents
   */
  validateHandoff(
    upstreamId: AgentId,
    downstreamId: AgentId,
    output: AgentOutput,
    options: ValidationOptions = {}
  ): ContractValidationResult {
    const startTime = Date.now();
    const key = this.makeKey(upstreamId, downstreamId);
    const contract = this.contracts.get(key);

    if (!contract) {
      return {
        contract: key,
        valid: true,
        violations: [],
        timestamp: new Date(),
        warning: `No contract defined for ${key}`,
        duration: Date.now() - startTime,
      };
    }

    const violations = this.validateAgainstContract(contract, output, options);

    return {
      contract: key,
      valid: violations.length === 0,
      violations,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Validate output against a specific contract
   */
  private validateAgainstContract(
    contract: AgentContract,
    output: AgentOutput,
    options: ValidationOptions
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];
    const maxViolations = options.maxViolations || 50;

    // Extract the actual data from agent output
    // Agent outputs have artifacts with content - we need to parse it
    const data = this.extractOutputData(output);

    if (data === null) {
      violations.push({
        field: '_root',
        constraint: 'output_exists',
        expected: 'Valid output data',
        actual: 'null or undefined',
        severity: 'critical',
        suggestion: 'Agent produced no parseable output',
      });
      return violations;
    }

    // Check required fields
    for (const field of contract.requiredFields) {
      if (violations.length >= maxViolations && options.failFast) break;

      const value = this.getNestedValue(data, field);
      if (value === undefined || value === null) {
        violations.push({
          field,
          constraint: 'required',
          expected: `Field "${field}" must exist`,
          actual: 'missing',
          severity: this.getSeverityForCriticality(contract.criticality),
          suggestion: `Ensure ${contract.upstream} agent outputs "${field}"`,
        });
      }
    }

    // Check field constraints
    for (const [fieldPath, constraint] of Object.entries(contract.fieldConstraints)) {
      if (violations.length >= maxViolations && options.failFast) break;

      const fieldViolations = this.validateFieldConstraint(data, fieldPath, constraint, contract);
      violations.push(...fieldViolations);
    }

    // Run custom validation if defined
    if (contract.customValidation) {
      const customViolations = contract.customValidation(data);
      violations.push(...customViolations);
    }

    // Log violations for pattern analysis
    this.violationLog.push(...violations);

    return violations;
  }

  /**
   * Extract actual data from AgentOutput
   */
  private extractOutputData(output: AgentOutput): Record<string, unknown> | null {
    // Try to find a JSON artifact with the main output
    const jsonArtifact = output.artifacts.find(
      a => a.type === 'document' || a.type === 'schema' || a.path?.endsWith('.json')
    );

    if (jsonArtifact?.content) {
      try {
        return JSON.parse(jsonArtifact.content);
      } catch {
        // Not valid JSON
      }
    }

    // Try to parse from any artifact
    for (const artifact of output.artifacts) {
      if (artifact.content) {
        try {
          const parsed = JSON.parse(artifact.content);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed;
          }
        } catch {
          // Continue to next artifact
        }
      }
    }

    // Return artifacts as the data if no JSON found
    // This allows checking for files array etc.
    return {
      artifacts: output.artifacts,
      decisions: output.decisions,
      files: output.artifacts
        .filter(a => a.type === 'code' && a.path)
        .map(a => ({ path: a.path, content: a.content })),
      components: output.artifacts
        .filter(a => a.type === 'code' && a.path?.includes('components'))
        .map(a => ({ path: a.path, content: a.content })),
    };
  }

  /**
   * Get nested value using dot notation (supports array notation like 'items[]')
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array notation like 'components[]'
      if (part.endsWith('[]')) {
        const key = part.slice(0, -2);
        current = (current as Record<string, unknown>)[key];
        // Return the array itself for array-level checks
        return current;
      } else if (part.includes('[') && part.includes(']')) {
        // Handle specific index like 'items[0]'
        const match = part.match(/^(\w+)\[(\d+)\]$/);
        if (match) {
          const [, key, index] = match;
          const arr = (current as Record<string, unknown>)[key];
          if (Array.isArray(arr)) {
            current = arr[parseInt(index, 10)];
          } else {
            return undefined;
          }
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Validate a single field against its constraint
   */
  private validateFieldConstraint(
    data: Record<string, unknown>,
    fieldPath: string,
    constraint: FieldConstraint,
    contract: AgentContract
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];
    const value = this.getNestedValue(data, fieldPath);
    const severity = this.getSeverityForCriticality(contract.criticality);

    // If checking array items, handle specially
    if (fieldPath.includes('[].')) {
      return this.validateArrayItemConstraint(data, fieldPath, constraint, contract);
    }

    // Type check
    if (constraint.type) {
      const actualType = this.getValueType(value);
      if (actualType !== constraint.type) {
        violations.push({
          field: fieldPath,
          constraint: 'type',
          expected: constraint.type,
          actual: actualType,
          severity,
          suggestion: constraint.reason || `Field should be ${constraint.type}`,
        });
      }
    }

    // String length checks
    if (typeof value === 'string') {
      if (constraint.minLength && value.length < constraint.minLength) {
        violations.push({
          field: fieldPath,
          constraint: 'minLength',
          expected: `>= ${constraint.minLength} chars`,
          actual: `${value.length} chars`,
          severity,
          suggestion: constraint.reason || `Content too short, may be a stub`,
        });
      }
      if (constraint.maxLength && value.length > constraint.maxLength) {
        violations.push({
          field: fieldPath,
          constraint: 'maxLength',
          expected: `<= ${constraint.maxLength} chars`,
          actual: `${value.length} chars`,
          severity: 'warning',
        });
      }

      // Must match regex
      if (constraint.mustMatch) {
        const regex =
          typeof constraint.mustMatch === 'string'
            ? new RegExp(constraint.mustMatch)
            : constraint.mustMatch;
        if (!regex.test(value)) {
          violations.push({
            field: fieldPath,
            constraint: 'mustMatch',
            expected: `Match pattern ${constraint.mustMatch}`,
            actual: value.substring(0, 100),
            severity,
          });
        }
      }

      // Must not be placeholder
      if (constraint.mustNotBe) {
        for (const forbidden of constraint.mustNotBe) {
          if (value.includes(forbidden)) {
            violations.push({
              field: fieldPath,
              constraint: 'mustNotBe',
              expected: `Not contain "${forbidden}"`,
              actual: `Contains "${forbidden}"`,
              severity,
              suggestion: 'Contains placeholder or stub content',
            });
          }
        }
      }

      // Must contain
      if (constraint.mustContain) {
        for (const required of constraint.mustContain) {
          if (!value.includes(required)) {
            violations.push({
              field: fieldPath,
              constraint: 'mustContain',
              expected: `Contain "${required}"`,
              actual: `Missing "${required}"`,
              severity,
            });
          }
        }
      }
    }

    // Array checks
    if (Array.isArray(value)) {
      if (constraint.minCount && value.length < constraint.minCount) {
        violations.push({
          field: fieldPath,
          constraint: 'minCount',
          expected: `>= ${constraint.minCount} items`,
          actual: `${value.length} items`,
          severity,
          suggestion: constraint.reason || `Array has too few items`,
        });
      }
      if (constraint.maxCount && value.length > constraint.maxCount) {
        violations.push({
          field: fieldPath,
          constraint: 'maxCount',
          expected: `<= ${constraint.maxCount} items`,
          actual: `${value.length} items`,
          severity: 'warning',
        });
      }

      // Check each item has required fields
      if (constraint.eachMustHave) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'object' && item !== null) {
            for (const requiredField of constraint.eachMustHave) {
              if (!(requiredField in item)) {
                violations.push({
                  field: `${fieldPath}[${i}].${requiredField}`,
                  constraint: 'eachMustHave',
                  expected: `Item must have "${requiredField}"`,
                  actual: 'missing',
                  severity,
                });
              }
            }
          }
        }
      }

      // Must contain specific values
      if (constraint.mustContain) {
        for (const required of constraint.mustContain) {
          const found = value.some(item => {
            if (typeof item === 'string') return item === required;
            if (typeof item === 'object' && item !== null) {
              return Object.values(item).includes(required);
            }
            return false;
          });
          if (!found) {
            violations.push({
              field: fieldPath,
              constraint: 'mustContain',
              expected: `Array must contain "${required}"`,
              actual: `"${required}" not found`,
              severity,
            });
          }
        }
      }
    }

    // Object checks
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (constraint.minKeys && keys.length < constraint.minKeys) {
        violations.push({
          field: fieldPath,
          constraint: 'minKeys',
          expected: `>= ${constraint.minKeys} keys`,
          actual: `${keys.length} keys`,
          severity,
        });
      }

      // Must contain specific keys
      if (constraint.mustContain) {
        for (const required of constraint.mustContain) {
          if (!(required in value)) {
            violations.push({
              field: fieldPath,
              constraint: 'mustContain',
              expected: `Object must have key "${required}"`,
              actual: `"${required}" not found`,
              severity,
            });
          }
        }
      }
    }

    // Custom validator
    if (constraint.customValidator && !constraint.customValidator(value)) {
      violations.push({
        field: fieldPath,
        constraint: 'customValidator',
        expected: constraint.reason || 'Pass custom validation',
        actual: 'Failed custom validation',
        severity,
      });
    }

    return violations;
  }

  /**
   * Validate constraints on array items (e.g., 'components[].name')
   */
  private validateArrayItemConstraint(
    data: Record<string, unknown>,
    fieldPath: string,
    constraint: FieldConstraint,
    contract: AgentContract
  ): ContractViolation[] {
    const violations: ContractViolation[] = [];
    const [arrayPath, ...itemPath] = fieldPath.split('[].');
    const array = this.getNestedValue(data, arrayPath);

    if (!Array.isArray(array)) {
      violations.push({
        field: arrayPath,
        constraint: 'type',
        expected: 'array',
        actual: this.getValueType(array),
        severity: this.getSeverityForCriticality(contract.criticality),
      });
      return violations;
    }

    // Check constraint on each item's nested field
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (typeof item !== 'object' || item === null) continue;

      const itemFieldPath = itemPath.join('.');
      const itemValue = this.getNestedValue(item as Record<string, unknown>, itemFieldPath);

      const itemViolations = this.validateFieldConstraint(
        { [itemFieldPath]: itemValue } as Record<string, unknown>,
        itemFieldPath,
        constraint,
        contract
      );

      // Rewrite field paths to include array index
      for (const v of itemViolations) {
        v.field = `${arrayPath}[${i}].${v.field}`;
        violations.push(v);
      }
    }

    return violations;
  }

  /**
   * Get type of value as string
   */
  private getValueType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Map criticality to violation severity
   */
  private getSeverityForCriticality(criticality: AgentContract['criticality']): ViolationSeverity {
    switch (criticality) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  }

  /**
   * Run audit on all agent outputs from a build
   */
  auditBuild(
    buildId: string,
    outputs: Map<AgentId, AgentOutput>,
    options: ValidationOptions = {}
  ): ContractAuditResult {
    const startTime = Date.now();
    const results: ContractValidationResult[] = [];
    this.violationLog = []; // Reset violation log

    // For each contract, validate if both agents have outputs
    for (const [key, contract] of this.contracts.entries()) {
      const upstreamOutput = outputs.get(contract.upstream);
      const downstreamOutput = outputs.get(contract.downstream);

      // Only validate if upstream has output (downstream may not have run yet)
      if (upstreamOutput) {
        const result = this.validateHandoff(
          contract.upstream,
          contract.downstream,
          upstreamOutput,
          options
        );
        results.push(result);
      }
    }

    // Analyze patterns
    const patterns = this.analyzeViolationPatterns();

    return {
      buildId,
      totalContracts: results.length,
      passed: results.filter(r => r.valid).length,
      failed: results.filter(r => !r.valid).length,
      results,
      patterns,
      timestamp: new Date(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Analyze violation patterns across all logged violations
   */
  private analyzeViolationPatterns(): ViolationPattern[] {
    const patternCounts: Map<string, { count: number; contracts: Set<string> }> = new Map();

    for (const violation of this.violationLog) {
      const patternKey = `${violation.constraint}:${violation.expected}`;
      const existing = patternCounts.get(patternKey);
      if (existing) {
        existing.count++;
        existing.contracts.add(violation.field.split('.')[0]);
      } else {
        patternCounts.set(patternKey, {
          count: 1,
          contracts: new Set([violation.field.split('.')[0]]),
        });
      }
    }

    // Convert to patterns, sorted by frequency
    const patterns: ViolationPattern[] = [];
    for (const [key, { count, contracts }] of patternCounts.entries()) {
      if (count >= 2) {
        // Only report patterns that occur multiple times
        patterns.push({
          pattern: key,
          count,
          contracts: Array.from(contracts),
          likelyRootCause: this.guessRootCause(key, count),
        });
      }
    }

    return patterns.sort((a, b) => b.count - a.count);
  }

  /**
   * Guess root cause based on pattern
   */
  private guessRootCause(pattern: string, count: number): string {
    if (pattern.includes('minCount')) {
      return 'Agent output truncated or stopped early - check token limits';
    }
    if (pattern.includes('required')) {
      return 'Missing required field - check agent prompt or schema';
    }
    if (pattern.includes('mustContain')) {
      return 'Missing expected content - agent may not understand requirements';
    }
    if (pattern.includes('mustNotBe')) {
      return 'Placeholder/stub content - agent produced incomplete output';
    }
    if (pattern.includes('type')) {
      return 'Wrong data type - schema mismatch between agents';
    }
    if (pattern.includes('minLength')) {
      return 'Content too short - may be stub or placeholder';
    }
    return `Repeated violation (${count}x) - investigate agent prompt`;
  }

  /**
   * Get all registered contracts
   */
  getContracts(): AgentContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get contract by key
   */
  getContract(upstream: AgentId, downstream: AgentId): AgentContract | undefined {
    return this.contracts.get(this.makeKey(upstream, downstream));
  }

  /**
   * Clear all registered contracts
   */
  clear(): void {
    this.contracts.clear();
    this.violationLog = [];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let validatorInstance: ContractValidator | null = null;

/**
 * Get the global contract validator instance
 */
export function getContractValidator(): ContractValidator {
  if (!validatorInstance) {
    validatorInstance = new ContractValidator();
  }
  return validatorInstance;
}

/**
 * Create a new contract validator instance
 */
export function createContractValidator(): ContractValidator {
  return new ContractValidator();
}

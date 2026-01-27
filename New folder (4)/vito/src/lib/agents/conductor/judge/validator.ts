/**
 * Output Validator
 *
 * Validates agent outputs against expected schemas and contracts.
 * Checks for required fields, type correctness, and common issues.
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AgentOutputForJudge,
  AgentDefinitionForJudge,
} from './types';

// ============================================================================
// REQUIRED FIELDS PER AGENT
// ============================================================================

const REQUIRED_FIELDS_MAP: Record<string, string[]> = {
  // Discovery agents
  oracle: ['market_analysis', 'competitors', 'opportunities'],
  empathy: ['personas', 'pain_points', 'user_journeys'],
  strategos: ['mvp_features', 'roadmap', 'success_metrics'],
  scope: ['features', 'user_stories', 'requirements'],

  // Design agents
  palette: ['colors', 'typography', 'design_tokens'],
  blocks: ['components', 'variants', 'props'],
  cartographer: ['wireframes', 'page_layouts', 'navigation'],
  polish: ['animations', 'transitions', 'interactions'],

  // Architecture agents
  archon: ['tech_stack', 'patterns', 'architecture_decisions'],
  datum: ['entities', 'relationships', 'schema'],
  nexus: ['endpoints', 'contracts', 'api_spec'],
  sentinel: ['security_rules', 'auth_strategy', 'policies'],
  forge: ['infrastructure', 'deployment', 'environments'],

  // Code agents
  pixel: ['components', 'styles', 'code'],
  wire: ['pages', 'routes', 'layouts'],
  engine: ['services', 'business_logic'],
  tether: ['integrations', 'webhooks'],
};

// ============================================================================
// OUTPUT VALIDATOR CLASS
// ============================================================================

export class OutputValidator {
  /**
   * Validate an agent's output against its schema
   */
  validate(
    agentId: string,
    output: AgentOutputForJudge,
    definition: AgentDefinitionForJudge
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Check if output exists
    if (!output || !output.data) {
      errors.push({
        field: 'data',
        message: 'Output data is missing or null',
        severity: 'critical',
        path: [],
      });
      return { valid: false, errors, warnings, coverage: 0 };
    }

    const data = output.data;

    // 2. Validate against output schema if provided
    if (definition.outputSchema) {
      const schemaErrors = this.validateSchema(data, definition.outputSchema);
      errors.push(...schemaErrors);
    }

    // 3. Check required fields based on agent type
    const requiredErrors = this.checkRequiredFields(agentId, data);
    errors.push(...requiredErrors);

    // 4. Check for common issues
    const commonWarnings = this.checkCommonIssues(agentId, data);
    warnings.push(...commonWarnings);

    // 5. Calculate coverage
    const coverage = this.calculateCoverage(agentId, data, definition.outputSchema);

    // Determine validity
    const hasCriticalErrors = errors.some((e) => e.severity === 'critical');
    const hasTooManyMajorErrors = errors.filter((e) => e.severity === 'major').length > 2;

    return {
      valid: !hasCriticalErrors && !hasTooManyMajorErrors,
      errors,
      warnings,
      coverage,
    };
  }

  /**
   * Validate against JSON schema
   */
  private validateSchema(
    data: Record<string, unknown>,
    schema: NonNullable<AgentDefinitionForJudge['outputSchema']>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required properties
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data) || data[field] === undefined || data[field] === null) {
          errors.push({
            field,
            message: `Required field "${field}" is missing`,
            severity: 'major',
            path: [field],
          });
        }
      }
    }

    // Type checking for properties
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const typeError = this.checkType(
            data[field],
            fieldSchema as Record<string, unknown>,
            [field]
          );
          if (typeError) {
            errors.push(typeError);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Check type of a value against schema
   */
  private checkType(
    value: unknown,
    schema: Record<string, unknown>,
    path: string[]
  ): ValidationError | null {
    const schemaType = schema.type as string | undefined;
    if (!schemaType) return null;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const field = path[path.length - 1];

    if (schemaType === 'array' && !Array.isArray(value)) {
      return {
        field,
        message: `Expected array, got ${actualType}`,
        severity: 'major',
        path,
      };
    }

    if (schemaType === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
      return {
        field,
        message: `Expected object, got ${actualType}`,
        severity: 'major',
        path,
      };
    }

    if (schemaType === 'string' && typeof value !== 'string') {
      return {
        field,
        message: `Expected string, got ${actualType}`,
        severity: 'minor',
        path,
      };
    }

    if (schemaType === 'number' && typeof value !== 'number') {
      return {
        field,
        message: `Expected number, got ${actualType}`,
        severity: 'minor',
        path,
      };
    }

    if (schemaType === 'boolean' && typeof value !== 'boolean') {
      return {
        field,
        message: `Expected boolean, got ${actualType}`,
        severity: 'minor',
        path,
      };
    }

    return null;
  }

  /**
   * Check required fields based on agent type
   */
  private checkRequiredFields(
    agentId: string,
    data: Record<string, unknown>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const required = REQUIRED_FIELDS_MAP[agentId] || [];

    for (const field of required) {
      // Check both snake_case and camelCase versions
      const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const hasField = field in data || camelCase in data;

      if (!hasField) {
        errors.push({
          field,
          message: `Required field "${field}" is missing for ${agentId} agent`,
          severity: 'major',
          path: [field],
        });
      } else {
        // Check if field is empty
        const value = data[field] ?? data[camelCase];
        if (this.isEmpty(value)) {
          errors.push({
            field,
            message: `Required field "${field}" is empty for ${agentId} agent`,
            severity: 'minor',
            path: [field],
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check if a value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value as object).length === 0) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  }

  /**
   * Check for common issues that warrant warnings
   */
  private checkCommonIssues(
    agentId: string,
    data: Record<string, unknown>
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const str = JSON.stringify(data);

    // Empty arrays
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length === 0) {
        warnings.push({
          field: key,
          message: `Array "${key}" is empty`,
          suggestion: 'Ensure at least one item is provided',
        });
      }
    }

    // Placeholder text
    if (str.includes('Lorem ipsum')) {
      warnings.push({
        field: 'content',
        message: 'Output contains "Lorem ipsum" placeholder text',
        suggestion: 'Replace placeholder text with actual content',
      });
    }

    if (str.includes('TODO') || str.includes('FIXME')) {
      warnings.push({
        field: 'content',
        message: 'Output contains TODO/FIXME markers',
        suggestion: 'Complete all marked items before finalizing',
      });
    }

    if (str.includes('PLACEHOLDER') || str.includes('placeholder')) {
      warnings.push({
        field: 'content',
        message: 'Output contains placeholder markers',
        suggestion: 'Replace placeholders with actual values',
      });
    }

    // Hardcoded values
    if (str.includes('localhost') || str.includes('127.0.0.1')) {
      warnings.push({
        field: 'urls',
        message: 'Output contains localhost references',
        suggestion: 'Use environment variables or configuration for URLs',
      });
    }

    if (str.includes('example.com') || str.includes('test@')) {
      warnings.push({
        field: 'values',
        message: 'Output contains example/test values',
        suggestion: 'Replace with actual or placeholder tokens',
      });
    }

    // Very short content (suspicious for complex agents)
    const complexAgents = ['strategos', 'archon', 'pixel', 'datum', 'engine', 'wire'];
    if (str.length < 200 && complexAgents.includes(agentId)) {
      warnings.push({
        field: 'output',
        message: `Output seems unusually short for ${agentId} agent (${str.length} chars)`,
        suggestion: 'Verify all required sections are included',
      });
    }

    // Very long content (may indicate verbosity issues)
    if (str.length > 100000) {
      warnings.push({
        field: 'output',
        message: `Output is very long (${str.length} chars)`,
        suggestion: 'Consider if all content is necessary',
      });
    }

    // Duplicate content detection
    const duplicates = this.detectDuplicates(data);
    if (duplicates.length > 0) {
      warnings.push({
        field: 'content',
        message: `Potential duplicate content detected in: ${duplicates.join(', ')}`,
        suggestion: 'Review for accidental duplication',
      });
    }

    return warnings;
  }

  /**
   * Detect potential duplicate content in arrays
   */
  private detectDuplicates(data: Record<string, unknown>): string[] {
    const duplicateFields: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 1) {
        const stringified = value.map((v) => JSON.stringify(v));
        const uniqueCount = new Set(stringified).size;

        if (uniqueCount < value.length * 0.8) {
          duplicateFields.push(key);
        }
      }
    }

    return duplicateFields;
  }

  /**
   * Calculate coverage percentage
   */
  private calculateCoverage(
    agentId: string,
    data: Record<string, unknown>,
    schema?: AgentDefinitionForJudge['outputSchema']
  ): number {
    // Get expected fields from schema or required fields map
    let expectedFields: string[] = [];

    if (schema?.properties) {
      expectedFields = Object.keys(schema.properties);
    } else {
      expectedFields = REQUIRED_FIELDS_MAP[agentId] || [];
    }

    if (expectedFields.length === 0) {
      return 100; // No expectations = full coverage
    }

    // Count present fields (including camelCase variants)
    const presentCount = expectedFields.filter((field) => {
      const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const hasField = field in data || camelCase in data;
      const value = data[field] ?? data[camelCase];
      return hasField && !this.isEmpty(value);
    }).length;

    return Math.round((presentCount / expectedFields.length) * 100);
  }

  /**
   * Get required fields for an agent
   */
  getRequiredFields(agentId: string): string[] {
    return REQUIRED_FIELDS_MAP[agentId] || [];
  }

  /**
   * Check if a specific field is valid
   */
  validateField(
    agentId: string,
    fieldName: string,
    fieldValue: unknown
  ): { valid: boolean; error?: ValidationError } {
    if (fieldValue === null || fieldValue === undefined) {
      return {
        valid: false,
        error: {
          field: fieldName,
          message: `Field "${fieldName}" is null or undefined`,
          severity: 'major',
          path: [fieldName],
        },
      };
    }

    if (this.isEmpty(fieldValue)) {
      return {
        valid: false,
        error: {
          field: fieldName,
          message: `Field "${fieldName}" is empty`,
          severity: 'minor',
          path: [fieldName],
        },
      };
    }

    return { valid: true };
  }
}

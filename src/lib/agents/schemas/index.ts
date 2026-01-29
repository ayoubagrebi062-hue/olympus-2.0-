/**
 * OLYMPUS 2.0 - Structured Output Schema System
 *
 * This module provides type-safe output validation for all 40 agents.
 * Uses Zod for runtime validation and JSON Schema generation for LLM constraints.
 *
 * @example
 * ```typescript
 * import { validateOutput, getAgentSchema, z } from './schemas';
 *
 * const schema = getAgentSchema('archon');
 * const validatedOutput = validateOutput(schema, rawOutput, 'archon');
 * ```
 */

import { z, ZodType, ZodError, ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * JSON Schema type for LLM tool definitions
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Convert a Zod schema to JSON Schema for LLM tool_choice constraint
 */
export function schemaToJsonSchema(
  schema: ZodType,
  options?: { name?: string }
): JsonSchema {
  // zodToJsonSchema expects ZodTypeAny which is compatible with our ZodType
  return zodToJsonSchema(schema as ZodTypeAny, {
    target: 'openApi3',
    name: options?.name,
    $refStrategy: 'none', // Inline all refs for LLM compatibility
  }) as JsonSchema;
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  rawOutput?: unknown;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

/**
 * Validate agent output against schema
 * Returns detailed error information instead of throwing
 */
export function validateOutputSafe<T extends ZodType>(
  schema: T,
  output: unknown,
  agentId: string
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(output);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: ValidationError[] = result.error.errors.map(e => ({
    path: e.path.join('.') || '(root)',
    message: e.message,
    code: e.code,
    expected: 'expected' in e ? String(e.expected) : undefined,
    received: 'received' in e ? String(e.received) : undefined,
  }));

  return {
    success: false,
    errors,
    rawOutput: output,
  };
}

/**
 * Validate agent output against schema
 * Throws detailed error if validation fails
 */
export function validateOutput<T extends ZodType>(
  schema: T,
  output: unknown,
  agentId: string
): z.infer<T> {
  const result = validateOutputSafe(schema, output, agentId);

  if (!result.success) {
    const errorList = result.errors!
      .map(e => `  - ${e.path}: ${e.message}`)
      .join('\n');

    const preview = JSON.stringify(output, null, 2).slice(0, 500);

    throw new SchemaValidationError(
      `Agent "${agentId}" produced invalid output:\n${errorList}\n\n` +
        `Received:\n${preview}${preview.length >= 500 ? '...' : ''}`,
      agentId,
      result.errors!
    );
  }

  return result.data;
}

/**
 * Parse JSON string and validate against schema
 */
export function parseAndValidate<T extends ZodType>(
  schema: T,
  jsonString: string,
  agentId: string
): z.infer<T> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const preview = jsonString.slice(0, 500);
    throw new SchemaValidationError(
      `Agent "${agentId}" produced invalid JSON:\n${preview}${preview.length >= 500 ? '...' : ''}`,
      agentId,
      [{ path: '(root)', message: 'Invalid JSON', code: 'invalid_json' }]
    );
  }

  return validateOutput(schema, parsed, agentId);
}

/**
 * Extract JSON from LLM response that may contain markdown code blocks
 */
export function extractJsonFromResponse(response: string): string {
  // Try to extract from code block first
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object or array
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Return as-is
  return response.trim();
}

/**
 * Full pipeline: extract JSON, parse, and validate
 */
export function processAgentResponse<T extends ZodType>(
  schema: T,
  response: string,
  agentId: string
): z.infer<T> {
  const jsonString = extractJsonFromResponse(response);
  return parseAndValidate(schema, jsonString, agentId);
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Custom error for schema validation failures
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly agentId: string,
    public readonly validationErrors: ValidationError[]
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }

  /**
   * Get formatted error for logging
   */
  toLogFormat(): object {
    return {
      name: this.name,
      agentId: this.agentId,
      errors: this.validationErrors,
      message: this.message,
    };
  }
}

// ============================================================================
// COMMON SCHEMA BUILDING BLOCKS
// ============================================================================

/**
 * Common rationale field - every agent should explain its decisions
 */
export const RationaleSchema = z
  .string()
  .min(50)
  .describe('Detailed explanation of decisions made');

/**
 * Priority enum used across multiple agents
 */
export const PrioritySchema = z.enum(['must-have', 'should-have', 'nice-to-have']);

/**
 * Complexity enum used across multiple agents
 */
export const ComplexitySchema = z.enum(['low', 'medium', 'high']);

/**
 * Common feature definition
 */
export const FeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: PrioritySchema,
  complexity: ComplexitySchema,
});

/**
 * Code file output schema
 */
export const CodeFileSchema = z.object({
  path: z.string().describe('File path relative to project root'),
  content: z.string().describe('File content'),
  language: z.string().describe('Programming language'),
});

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { z } from 'zod';
export type { ZodType, ZodError } from 'zod';

// Export all agent schemas
// Discovery Phase
export * from './oracle';
export * from './empathy';
export * from './venture';
export * from './strategos';
export * from './scope';

// Conversion Phase
export * from './psyche';
export * from './scribe';
export * from './architect-conversion';
export * from './conversion-judge';

// Architecture Phase
export * from './archon';
export * from './datum';
export * from './nexus';
export * from './sentinel';
export * from './atlas';
export * from './forge';

// Design Phase
export * from './palette';
export * from './grid';
export * from './blocks';
export * from './cartographer';
export * from './flow';
export * from './artist';

// Frontend Phase
export * from './pixel';
export * from './wire';
export * from './polish';

// Backend Phase
export * from './engine';
export * from './gateway';
export * from './keeper';
export * from './cron';

// Integration Phase
export * from './bridge';
export * from './sync';
export * from './notify';
export * from './search';

// Testing Phase
export * from './junit';
export * from './cypress';
export * from './load';
export * from './a11y';

// Deployment Phase
export * from './docker';
export * from './pipeline';
export * from './monitor';
export * from './scale';

// Registry (must be last to avoid circular deps)
export * from './registry';

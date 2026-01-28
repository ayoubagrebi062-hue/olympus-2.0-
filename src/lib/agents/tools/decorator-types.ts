/**
 * OLYMPUS 2.0 - Tool Decorator Types
 *
 * Extended types for the decorator-based tool system.
 * These work alongside the existing tool types.
 */

import { z } from 'zod';

/**
 * JSON Schema type for tool parameters (OpenAI/Anthropic compatible)
 */
export interface JsonSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
  items?: JsonSchemaProperty;
}

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

/**
 * Enhanced tool definition with Zod support
 */
export interface DecoratorToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  category?: string;

  // JSON Schema (for LLM)
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;

  // Zod schemas (for runtime validation)
  zodInputSchema?: z.ZodType<TInput>;
  zodOutputSchema?: z.ZodType<TOutput>;

  // Execution
  execute: (input: TInput, context?: DecoratorToolContext) => Promise<TOutput>;

  // Metadata
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
    examples?: DecoratorToolExample[];
    rateLimit?: {
      maxCalls: number;
      windowMs: number;
    };
    timeout?: number;
    retryable?: boolean;
  };
}

/**
 * Tool execution context
 */
export interface DecoratorToolContext {
  buildId?: string;
  agentId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  abortSignal?: AbortSignal;
}

/**
 * Tool example for documentation
 */
export interface DecoratorToolExample {
  name: string;
  description?: string;
  input: unknown;
  expectedOutput?: unknown;
}

/**
 * Tool execution result
 */
export interface DecoratorToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    toolId: string;
    executionTimeMs: number;
    retries: number;
  };
}

/**
 * Decorator options
 */
export interface DecoratorToolOptions {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  timeout?: number;
  retryable?: boolean;
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
}

/**
 * Parameter decorator options
 */
export interface ParamDecoratorOptions {
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: (string | number)[];
}

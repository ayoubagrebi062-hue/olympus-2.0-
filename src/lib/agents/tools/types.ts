/**
 * OLYMPUS 2.0 - Agent Tool Types
 *
 * Defines the interfaces for structured tools that agents can use.
 */

// ============================================
// TOOL TYPES
// ============================================

export type ToolCategory =
  | 'file' // File operations
  | 'code' // Code generation/analysis
  | 'database' // Database operations
  | 'memory' // GraphRAG memory
  | 'quality' // Quality checks
  | 'search' // Search operations
  | 'external'; // External API calls

export type ToolStatus = 'available' | 'unavailable' | 'rate_limited' | 'error';

// ============================================
// TOOL DEFINITION
// ============================================

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  returns: ToolReturn;
  examples?: ToolExample[];
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolReturn {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'void';
  description: string;
  schema?: Record<string, unknown>;
}

export interface ToolExample {
  description: string;
  input: Record<string, unknown>;
  output: unknown;
}

// ============================================
// TOOL EXECUTION
// ============================================

export interface ToolCall {
  toolId: string;
  parameters: Record<string, unknown>;
  context?: ToolContext;
}

export interface ToolContext {
  buildId: string;
  projectId: string;
  agentId: string;
  phase: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
  duration: number;
  cached?: boolean;
}

export interface ToolError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

// ============================================
// TOOL HANDLER
// ============================================

export type ToolHandler<TInput = Record<string, unknown>, TOutput = unknown> = (
  input: TInput,
  context?: ToolContext
) => Promise<ToolResult<TOutput>>;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
  status: ToolStatus;
  callCount: number;
  lastCalled?: Date;
}

// ============================================
// FILE TOOL TYPES
// ============================================

export interface FileReadInput {
  path: string;
  encoding?: 'utf-8' | 'base64';
}

export interface FileWriteInput {
  path: string;
  content: string;
  overwrite?: boolean;
}

export interface FileListInput {
  directory: string;
  pattern?: string;
  recursive?: boolean;
}

// ============================================
// CODE TOOL TYPES
// ============================================

export interface CodeGenerateInput {
  type: 'component' | 'page' | 'api' | 'hook' | 'utility' | 'test';
  name: string;
  description: string;
  language: 'typescript' | 'javascript';
  framework?: 'react' | 'next' | 'node' | 'express';
  dependencies?: string[];
}

export interface CodeAnalyzeInput {
  code: string;
  language: string;
  checks: ('types' | 'security' | 'performance' | 'style')[];
}

export interface CodeRefactorInput {
  code: string;
  instructions: string;
  preserveTypes?: boolean;
}

// ============================================
// MEMORY TOOL TYPES
// ============================================

export interface MemorySearchInput {
  query: string;
  collections?: string[];
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface MemoryStoreInput {
  type: 'code' | 'decision' | 'pattern' | 'feedback';
  content: string;
  metadata: Record<string, unknown>;
}

export interface MemoryRecallInput {
  userId: string;
  context: 'preferences' | 'history' | 'patterns';
}

// ============================================
// QUALITY TOOL TYPES
// ============================================

export interface QualityCheckInput {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  gates?: ('typescript' | 'eslint' | 'security' | 'build')[];
}

export interface QualityFixInput {
  code: string;
  issues: Array<{
    line: number;
    rule: string;
    message: string;
  }>;
}

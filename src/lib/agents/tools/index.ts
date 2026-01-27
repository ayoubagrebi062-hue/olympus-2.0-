/**
 * OLYMPUS 2.0 - Agent Tools Module
 *
 * Provides structured tools for agents to use during code generation.
 */

// Types
export type {
  ToolCategory,
  ToolStatus,
  ToolDefinition,
  ToolParameter,
  ToolReturn,
  ToolExample,
  ToolCall,
  ToolContext,
  ToolResult,
  ToolError,
  ToolHandler,
  RegisteredTool,
  FileReadInput,
  FileWriteInput,
  FileListInput,
  CodeGenerateInput,
  CodeAnalyzeInput,
  CodeRefactorInput,
  MemorySearchInput,
  MemoryStoreInput,
  MemoryRecallInput,
  QualityCheckInput,
  QualityFixInput,
} from './types';

// Registry
export { ToolRegistry, getToolRegistry, resetToolRegistry } from './registry';

// Built-in tools
export {
  registerBuiltinTools,
  qualityCheckTool,
  memorySearchTool,
  memoryStoreTool,
  memoryRecallTool,
  codeAnalyzeTool,
  searchSimilarCodeTool,
} from './builtin';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { getToolRegistry } from './registry';
import { registerBuiltinTools } from './builtin';
import type { ToolCall, ToolResult, ToolCategory } from './types';

let initialized = false;

/**
 * Initialize the tool system with built-in tools
 */
export function initializeTools(): void {
  if (initialized) return;
  registerBuiltinTools();
  initialized = true;
}

/**
 * Execute a tool by ID
 */
export async function executeTool<T = unknown>(call: ToolCall): Promise<ToolResult<T>> {
  initializeTools();
  return getToolRegistry().execute<T>(call);
}

/**
 * Get tool definitions formatted for prompts
 */
export function getToolsForPrompt(categories?: ToolCategory[]): string {
  initializeTools();
  return getToolRegistry().getToolDefinitionsForPrompt(categories);
}

/**
 * Check if a tool exists
 */
export function hasTool(toolId: string): boolean {
  initializeTools();
  return !!getToolRegistry().getTool(toolId);
}

/**
 * Get all available tool IDs
 */
export function getAvailableTools(): string[] {
  initializeTools();
  return getToolRegistry()
    .getAllTools()
    .map(t => t.definition.id);
}

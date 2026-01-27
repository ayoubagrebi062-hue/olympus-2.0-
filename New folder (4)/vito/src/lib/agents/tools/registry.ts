/**
 * OLYMPUS 2.0 - Agent Tool Registry
 *
 * Central registry for all tools available to agents.
 */

import type {
  ToolDefinition,
  ToolHandler,
  ToolCall,
  ToolResult,
  ToolContext,
  RegisteredTool,
  ToolCategory,
  ToolStatus,
} from './types';

// ============================================
// TOOL REGISTRY
// ============================================

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private rateLimitWindows: Map<string, { count: number; resetAt: Date }> = new Map();

  /**
   * Register a tool with its handler
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.id)) {
      console.warn(`Tool ${definition.id} already registered, overwriting`);
    }

    this.tools.set(definition.id, {
      definition,
      handler,
      status: 'available',
      callCount: 0,
    });

    console.log(`[ToolRegistry] Registered tool: ${definition.id}`);
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): RegisteredTool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all tools
   */
  getAllTools(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): RegisteredTool[] {
    return this.getAllTools().filter(t => t.definition.category === category);
  }

  /**
   * Execute a tool call
   */
  async execute<T = unknown>(call: ToolCall): Promise<ToolResult<T>> {
    const startTime = Date.now();
    const tool = this.tools.get(call.toolId);

    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool not found: ${call.toolId}`,
          recoverable: false,
        },
        duration: Date.now() - startTime,
      };
    }

    // Check rate limit
    if (tool.definition.rateLimit) {
      const rateLimitResult = this.checkRateLimit(call.toolId, tool.definition.rateLimit);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Tool ${call.toolId} is rate limited. Try again in ${rateLimitResult.retryAfter}ms`,
            recoverable: true,
            suggestion: 'Wait and retry',
          },
          duration: Date.now() - startTime,
        };
      }
    }

    // Validate parameters
    const validationError = this.validateParameters(call.parameters, tool.definition.parameters);
    if (validationError) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: validationError,
          recoverable: true,
          suggestion: 'Check parameter types and required fields',
        },
        duration: Date.now() - startTime,
      };
    }

    try {
      // Execute the tool
      const result = await tool.handler(call.parameters, call.context);

      // Update metrics
      tool.callCount++;
      tool.lastCalled = new Date();

      return {
        ...result,
        duration: Date.now() - startTime,
      } as ToolResult<T>;
    } catch (error) {
      tool.status = 'error';

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          recoverable: true,
        },
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check rate limit for a tool
   */
  private checkRateLimit(
    toolId: string,
    limit: { maxCalls: number; windowMs: number }
  ): { allowed: boolean; retryAfter?: number } {
    const key = toolId;
    const now = new Date();
    const window = this.rateLimitWindows.get(key);

    if (!window || now > window.resetAt) {
      // Start new window
      this.rateLimitWindows.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + limit.windowMs),
      });
      return { allowed: true };
    }

    if (window.count >= limit.maxCalls) {
      return {
        allowed: false,
        retryAfter: window.resetAt.getTime() - now.getTime(),
      };
    }

    window.count++;
    return { allowed: true };
  }

  /**
   * Validate parameters against definitions
   */
  private validateParameters(
    params: Record<string, unknown>,
    definitions: ToolDefinition['parameters']
  ): string | null {
    for (const def of definitions) {
      if (def.required && !(def.name in params)) {
        return `Missing required parameter: ${def.name}`;
      }

      if (def.name in params) {
        const value = params[def.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== def.type && value !== null && value !== undefined) {
          return `Parameter ${def.name} should be ${def.type}, got ${actualType}`;
        }

        if (def.enum && !def.enum.includes(value as string)) {
          return `Parameter ${def.name} must be one of: ${def.enum.join(', ')}`;
        }
      }
    }

    return null;
  }

  /**
   * Get tool definitions for prompt
   */
  getToolDefinitionsForPrompt(categories?: ToolCategory[]): string {
    let tools = this.getAllTools();

    if (categories) {
      tools = tools.filter(t => categories.includes(t.definition.category));
    }

    const lines: string[] = ['## Available Tools\n'];

    for (const tool of tools) {
      const def = tool.definition;
      lines.push(`### ${def.name} (${def.id})`);
      lines.push(def.description);
      lines.push('\nParameters:');

      for (const param of def.parameters) {
        const required = param.required ? '*required*' : '*optional*';
        lines.push(`- \`${param.name}\` (${param.type}, ${required}): ${param.description}`);
      }

      lines.push(`\nReturns: ${def.returns.description}\n`);
    }

    return lines.join('\n');
  }

  /**
   * Get metrics for all tools
   */
  getMetrics(): { toolId: string; callCount: number; status: ToolStatus; lastCalled?: Date }[] {
    return this.getAllTools().map(t => ({
      toolId: t.definition.id,
      callCount: t.callCount,
      status: t.status,
      lastCalled: t.lastCalled,
    }));
  }

  /**
   * Reset tool status
   */
  resetStatus(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.status = 'available';
    }
  }

  /**
   * Clear all tools (for testing)
   */
  clear(): void {
    this.tools.clear();
    this.rateLimitWindows.clear();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

export function resetToolRegistry(): void {
  registryInstance = null;
}

export { ToolRegistry };

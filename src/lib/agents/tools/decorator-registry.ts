/**
 * OLYMPUS 2.0 - Decorator Tool Registry
 *
 * Registry for decorator-based tools with Zod validation and tracing.
 */

import {
  DecoratorToolDefinition,
  DecoratorToolResult,
  DecoratorToolContext,
} from './decorator-types';
import { withSpan } from '@/lib/observability/tracing';

/**
 * Decorator-based tool registry
 */
class DecoratorToolRegistry {
  private tools: Map<string, DecoratorToolDefinition> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a tool
   * PATCH 4: Throws on collision instead of silently overwriting
   */
  register(tool: DecoratorToolDefinition): void {
    if (this.tools.has(tool.id)) {
      const existing = this.tools.get(tool.id)!;

      // Check if it's the same tool (re-registration on hot reload)
      if (existing.execute === tool.execute) {
        // Same tool, allow re-registration
        console.debug(`[DecoratorRegistry] Tool ${tool.id} re-registered (same instance)`);
      } else {
        // Different tool with same ID - this is an error
        throw new Error(
          `Tool ID collision: "${tool.id}" is already registered. ` +
            `Use a unique ID or unregister the existing tool first.`
        );
      }
    }

    this.tools.set(tool.id, tool);

    // Track by category
    const category = tool.category || 'uncategorized';
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(tool.id);

    console.log(`[DecoratorRegistry] Registered tool: ${tool.id} (${category})`);
  }

  /**
   * Force-register a tool (overwrite if exists)
   * Use with caution - only for testing or migration
   */
  forceRegister(tool: DecoratorToolDefinition): void {
    if (this.tools.has(tool.id)) {
      console.warn(`[DecoratorRegistry] Force-overwriting tool: ${tool.id}`);
      this.unregister(tool.id);
    }
    this.register(tool);
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    this.tools.delete(toolId);

    const category = tool.category || 'uncategorized';
    this.categories.get(category)?.delete(toolId);

    return true;
  }

  /**
   * Get a tool by ID
   */
  get(toolId: string): DecoratorToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Check if tool exists
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Get all tools
   */
  getAll(): DecoratorToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): DecoratorToolDefinition[] {
    const toolIds = this.categories.get(category);
    if (!toolIds) return [];

    return Array.from(toolIds)
      .map(id => this.tools.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Search tools by name or description
   */
  search(query: string): DecoratorToolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      tool =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Execute a tool with full tracing and error handling
   */
  async execute<TInput, TOutput>(
    toolId: string,
    input: TInput,
    context?: DecoratorToolContext
  ): Promise<DecoratorToolResult<TOutput>> {
    const tool = this.tools.get(toolId);

    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool ${toolId} not found`,
        },
        metadata: {
          toolId,
          executionTimeMs: 0,
          retries: 0,
        },
      };
    }

    const startTime = Date.now();
    const retries = 0;

    return withSpan(`tool:${toolId}`, 'tool', async () => {
      try {
        // Validate input if Zod schema exists
        let validatedInput = input;
        if (tool.zodInputSchema) {
          const validation = tool.zodInputSchema.safeParse(input);
          if (!validation.success) {
            return {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed',
                details: validation.error.errors,
              },
              metadata: {
                toolId,
                executionTimeMs: Date.now() - startTime,
                retries,
              },
            };
          }
          validatedInput = validation.data as TInput;
        }

        // Execute with timeout if specified
        const timeout = tool.metadata?.timeout;
        let result: TOutput;

        if (timeout) {
          result = await Promise.race([
            tool.execute(validatedInput, context) as Promise<TOutput>,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
            ),
          ]);
        } else {
          result = (await tool.execute(validatedInput, context)) as TOutput;
        }

        // Validate output if Zod schema exists
        if (tool.zodOutputSchema) {
          const validation = tool.zodOutputSchema.safeParse(result);
          if (!validation.success) {
            return {
              success: false,
              error: {
                code: 'OUTPUT_VALIDATION_ERROR',
                message: 'Output validation failed',
                details: validation.error.errors,
              },
              metadata: {
                toolId,
                executionTimeMs: Date.now() - startTime,
                retries,
              },
            };
          }
        }

        return {
          success: true,
          data: result,
          metadata: {
            toolId,
            executionTimeMs: Date.now() - startTime,
            retries,
          },
        };
      } catch (error) {
        console.error(`[DecoratorRegistry] Tool ${toolId} execution error:`, error);

        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          metadata: {
            toolId,
            executionTimeMs: Date.now() - startTime,
            retries,
          },
        };
      }
    });
  }

  /**
   * Get tool definitions for LLM (OpenAI/Anthropic format)
   */
  getToolsForLLM(toolIds?: string[]): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }> {
    const tools = toolIds
      ? (toolIds.map(id => this.tools.get(id)).filter(Boolean) as DecoratorToolDefinition[])
      : this.getAll();

    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Clear all tools (for testing)
   */
  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalTools: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    for (const [category, tools] of this.categories) {
      categories[category] = tools.size;
    }

    return {
      totalTools: this.tools.size,
      categories,
    };
  }
}

// Export singleton
export const decoratorToolRegistry = new DecoratorToolRegistry();

// Export class for testing
export { DecoratorToolRegistry };

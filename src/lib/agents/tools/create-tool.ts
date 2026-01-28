/**
 * OLYMPUS 2.0 - Functional Tool Creator
 *
 * Non-decorator approach for creating tools.
 * Use when decorators aren't suitable (e.g., pure functions, lambdas).
 */

import { z } from 'zod';
import { DecoratorToolDefinition, DecoratorToolContext } from './decorator-types';
import { zodToJsonSchema } from './schema-generator';
import { decoratorToolRegistry } from './decorator-registry';

/**
 * Create a tool from a function (non-decorator approach)
 *
 * Usage:
 * const readFileTool = createTool({
 *   id: 'read_file',
 *   description: 'Read contents of a file',
 *   schema: z.object({
 *     path: z.string().describe('File path'),
 *   }),
 *   execute: async ({ path }) => {
 *     return fs.readFile(path, 'utf-8');
 *   },
 * });
 */
export function createTool<TInput, TOutput>(config: {
  id: string;
  name?: string;
  description: string;
  category?: string;
  schema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  execute: (input: TInput, context?: DecoratorToolContext) => Promise<TOutput>;
  metadata?: DecoratorToolDefinition['metadata'];
}): DecoratorToolDefinition<TInput, TOutput> {
  const tool: DecoratorToolDefinition<TInput, TOutput> = {
    id: config.id,
    name: config.name || config.id,
    description: config.description,
    category: config.category,
    inputSchema: zodToJsonSchema(config.schema),
    zodInputSchema: config.schema,
    outputSchema: config.outputSchema ? zodToJsonSchema(config.outputSchema) : undefined,
    zodOutputSchema: config.outputSchema,
    execute: config.execute,
    metadata: config.metadata,
  };

  // Auto-register (cast to base type for registry compatibility)
  decoratorToolRegistry.register(tool as unknown as DecoratorToolDefinition<unknown, unknown>);

  return tool;
}

/**
 * Create multiple tools at once
 */
export function createTools(
  configs: Parameters<typeof createTool>[0][]
): DecoratorToolDefinition[] {
  return configs.map(config => createTool(config));
}

/**
 * Quick tool creator for simple functions
 *
 * Usage:
 * const addTool = quickTool(
 *   'add',
 *   'Add two numbers',
 *   z.object({ a: z.number(), b: z.number() }),
 *   async ({ a, b }) => a + b
 * );
 */
export function quickTool<TInput, TOutput>(
  id: string,
  description: string,
  schema: z.ZodType<TInput>,
  execute: (input: TInput) => Promise<TOutput>
): DecoratorToolDefinition<TInput, TOutput> {
  return createTool({
    id,
    description,
    schema,
    execute,
  });
}

/**
 * Create a tool from an existing function with inferred types
 */
export function wrapFunction<TInput extends object, TOutput>(
  id: string,
  description: string,
  schema: z.ZodType<TInput>,
  fn: (input: TInput) => Promise<TOutput>
): DecoratorToolDefinition<TInput, TOutput> {
  return createTool({
    id,
    description,
    schema,
    execute: fn,
  });
}

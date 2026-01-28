/**
 * OLYMPUS 2.0 - Tool Decorators
 *
 * TypeScript decorators for elegant tool definitions.
 * Transforms 20+ lines into 3 lines per tool.
 */

import 'reflect-metadata';
import { z } from 'zod';
import {
  DecoratorToolDefinition,
  DecoratorToolOptions,
  ParamDecoratorOptions,
  DecoratorToolContext,
} from './decorator-types';
import { zodToJsonSchema, inferZodSchema } from './schema-generator';
import { decoratorToolRegistry } from './decorator-registry';

// Metadata keys
const TOOL_METADATA_KEY = Symbol('tool:metadata');
const PARAM_METADATA_KEY = Symbol('tool:param');
const SCHEMA_METADATA_KEY = Symbol('tool:schema');

/**
 * @tool decorator
 *
 * Usage:
 * @tool({ description: 'Read a file' })
 * async readFile(path: string): Promise<string> { ... }
 *
 * Or with schema:
 * @tool({ description: 'Read a file', schema: ReadFileInputSchema })
 * async readFile(input: ReadFileInput): Promise<string> { ... }
 */
export function tool(options: DecoratorToolOptions & { schema?: z.ZodType<unknown> } = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Get parameter types from TypeScript metadata
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];

    // Get parameter decorations
    const paramMetadata: Map<number, ParamDecoratorOptions> =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || new Map();

    // Generate or use provided schema
    let zodSchema: z.ZodType<unknown>;
    let inputSchema;

    if (options.schema) {
      zodSchema = options.schema;
      inputSchema = zodToJsonSchema(options.schema);
    } else {
      zodSchema = inferZodSchema(paramTypes);
      inputSchema = zodToJsonSchema(zodSchema);

      // Enhance with param decorations
      if (paramMetadata.size > 0 && inputSchema.properties) {
        for (const [index, opts] of paramMetadata) {
          const paramName = `param${index}`;
          if (inputSchema.properties[paramName]) {
            if (opts.description) {
              inputSchema.properties[paramName].description = opts.description;
            }
            if (opts.enum) {
              inputSchema.properties[paramName].enum = opts.enum;
            }
            if (opts.default !== undefined) {
              inputSchema.properties[paramName].default = opts.default;
            }
          }
        }
      }
    }

    // Extract description from JSDoc if not provided
    const description = options.description || propertyKey;

    // Create tool ID
    const constructor = target.constructor as { name: string };
    const toolId =
      options.id || `${constructor.name}.${propertyKey}`.toLowerCase().replace(/\./g, '_');

    // Create tool definition
    const toolDefinition: DecoratorToolDefinition = {
      id: toolId,
      name: options.name || propertyKey,
      description,
      category: options.category,
      inputSchema,
      zodInputSchema: zodSchema,
      execute: async (input: unknown, context?: DecoratorToolContext) => {
        // If schema provided, input is the whole object
        // If inferred, need to extract params
        if (options.schema) {
          return originalMethod.call(target, input, context);
        } else {
          // Extract positional args from input object
          const inputObj = input as Record<string, unknown>;
          const args = paramTypes.map((_: unknown, index: number) => inputObj[`param${index}`]);
          return originalMethod.apply(target, [...args, context]);
        }
      },
      metadata: {
        tags: options.tags,
        timeout: options.timeout,
        retryable: options.retryable,
        rateLimit: options.rateLimit,
      },
    };

    // Store metadata on the method
    Reflect.defineMetadata(TOOL_METADATA_KEY, toolDefinition, target, propertyKey);

    // Register the tool
    decoratorToolRegistry.register(toolDefinition);

    // Return modified descriptor
    descriptor.value = async function (...args: unknown[]) {
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * @param decorator for parameter documentation
 *
 * Usage:
 * @tool({ description: 'Read a file' })
 * async readFile(
 *   @param({ description: 'Path to the file' }) path: string
 * ): Promise<string> { ... }
 */
export function param(options: ParamDecoratorOptions = {}) {
  return function (target: object, propertyKey: string, parameterIndex: number) {
    const existingParams: Map<number, ParamDecoratorOptions> =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || new Map();

    existingParams.set(parameterIndex, options);
    Reflect.defineMetadata(PARAM_METADATA_KEY, existingParams, target, propertyKey);
  };
}

/**
 * @schema decorator for providing explicit Zod schema
 *
 * Usage:
 * @schema(MyInputSchema)
 * @tool({ description: 'Do something' })
 * async doSomething(input: MyInput): Promise<void> { ... }
 */
export function schema(zodSchema: z.ZodType<unknown>) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(SCHEMA_METADATA_KEY, zodSchema, target, propertyKey);
    return descriptor;
  };
}

/**
 * Get tool definition from decorated method
 */
export function getToolDefinition(
  target: object,
  propertyKey: string
): DecoratorToolDefinition | undefined {
  return Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey);
}

/**
 * @toolClass decorator for class-level tool options
 *
 * Usage:
 * @toolClass({ category: 'file' })
 * class FileTools {
 *   @tool(...) async readFile(...) { ... }
 *   @tool(...) async writeFile(...) { ... }
 * }
 */
export function toolClass(options: { category?: string } = {}) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T) {
    // Store class-level options
    Reflect.defineMetadata('tool:class', options, constructor);
    return constructor;
  };
}

/**
 * Register all @tool decorated methods from an instance
 */
export function registerToolClass(instance: object): void {
  const prototype = Object.getPrototypeOf(instance);
  const methodNames = Object.getOwnPropertyNames(prototype).filter(name => name !== 'constructor');

  for (const methodName of methodNames) {
    const tool = Reflect.getMetadata(TOOL_METADATA_KEY, prototype, methodName) as
      | DecoratorToolDefinition
      | undefined;
    if (tool) {
      // Re-bind the execute function to the instance
      const boundTool: DecoratorToolDefinition = {
        ...tool,
        execute: async (input: unknown, context?: DecoratorToolContext) => {
          const method = (instance as Record<string, (...args: unknown[]) => Promise<unknown>>)[
            methodName
          ].bind(instance);
          // Call the original execute which handles input mapping
          return tool.execute.call({ [methodName]: method }, input, context);
        },
      };

      // Re-register with bound execution
      decoratorToolRegistry.register(boundTool);
    }
  }
}

/**
 * OLYMPUS 2.0 - Tool Decorator System Exports
 *
 * Consolidated exports for the decorator-based tool system.
 */

// Types
export type {
  JsonSchema,
  JsonSchemaProperty,
  DecoratorToolDefinition,
  DecoratorToolContext,
  DecoratorToolExample,
  DecoratorToolResult,
  DecoratorToolOptions,
  ParamDecoratorOptions,
} from './decorator-types';

// Schema generator
export { zodToJsonSchema, inferZodSchema } from './schema-generator';

// Registry
export { decoratorToolRegistry, DecoratorToolRegistry } from './decorator-registry';

// Decorators
export { tool, param, schema, toolClass, getToolDefinition, registerToolClass } from './decorators';

// Functional creators
export { createTool, createTools, quickTool, wrapFunction } from './create-tool';

// Built-in decorator tools
export { registerDecoratorBuiltinTools, decoratorBuiltinTools } from './builtin/decorator-tools';

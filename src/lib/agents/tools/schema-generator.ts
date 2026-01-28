import { z } from 'zod';
import { JsonSchema, JsonSchemaProperty } from './decorator-types';

/**
 * Convert Zod schema to JSON Schema
 */
export function zodToJsonSchema(schema: z.ZodType<unknown>): JsonSchema {
  return processZodType(schema) as JsonSchema;
}

function processZodType(schema: z.ZodType<unknown>): JsonSchemaProperty | JsonSchema {
  // Access internal Zod definition safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def;
  const typeName = def.typeName as string;

  switch (typeName) {
    case 'ZodString':
      return processString(schema as z.ZodString);
    case 'ZodNumber':
      return processNumber();
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodArray':
      return processArray(schema as z.ZodArray<z.ZodType<unknown>>);
    case 'ZodObject':
      return processObject(schema as z.ZodObject<z.ZodRawShape>);
    case 'ZodEnum':
      return processEnum(schema as z.ZodEnum<[string, ...string[]]>);
    case 'ZodOptional': {
      const innerType = def.innerType as z.ZodType<unknown>;
      return processZodType(innerType);
    }
    case 'ZodDefault': {
      const innerType = def.innerType as z.ZodType<unknown>;
      const defaultValue = def.defaultValue as () => unknown;
      const inner = processZodType(innerType);
      return { ...inner, default: defaultValue() };
    }
    case 'ZodNullable': {
      const innerType = def.innerType as z.ZodType<unknown>;
      return processZodType(innerType);
    }
    case 'ZodLiteral': {
      const literal = def.value;
      return {
        type: typeof literal as 'string' | 'number' | 'boolean',
        enum: [literal as string | number],
      };
    }
    case 'ZodUnion': {
      const options = def.options as z.ZodType<unknown>[];
      // Simplified: take first option
      return processZodType(options[0]);
    }
    default:
      return { type: 'object' };
  }
}

function processString(schema: z.ZodString): JsonSchemaProperty {
  const result: JsonSchemaProperty = { type: 'string' };

  // Extract description from Zod
  if (schema.description) {
    result.description = schema.description;
  }

  return result;
}

function processNumber(): JsonSchemaProperty {
  return { type: 'number' };
}

function processArray(schema: z.ZodArray<z.ZodType<unknown>>): JsonSchemaProperty {
  const def = schema._def as { type: z.ZodType<unknown> };
  return {
    type: 'array',
    items: processZodType(def.type) as JsonSchemaProperty,
  };
}

function processObject(schema: z.ZodObject<z.ZodRawShape>): JsonSchema {
  const def = schema._def as { shape: () => z.ZodRawShape };
  const shape = def.shape();
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    properties[key] = processZodType(value as z.ZodType<unknown>) as JsonSchemaProperty;

    // Check if required (not optional)
    const zodValue = value as z.ZodType<unknown>;
    if (!zodValue.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function processEnum(schema: z.ZodEnum<[string, ...string[]]>): JsonSchemaProperty {
  const def = schema._def as { values: string[] };
  return {
    type: 'string',
    enum: def.values,
  };
}

/**
 * Generate Zod schema from runtime type info
 * (Used when decorator can't infer types)
 */
export function inferZodSchema(paramTypes: unknown[]): z.ZodType<unknown> {
  if (paramTypes.length === 0) {
    return z.object({});
  }

  if (paramTypes.length === 1) {
    return inferSingleType(paramTypes[0]);
  }

  // Multiple params - create object with param0, param1, etc.
  const shape: Record<string, z.ZodType<unknown>> = {};
  paramTypes.forEach((type, index) => {
    shape[`param${index}`] = inferSingleType(type);
  });

  return z.object(shape);
}

function inferSingleType(type: unknown): z.ZodType<unknown> {
  if (type === String) return z.string();
  if (type === Number) return z.number();
  if (type === Boolean) return z.boolean();
  if (type === Array) return z.array(z.unknown());
  if (type === Object) return z.record(z.unknown());
  return z.unknown();
}

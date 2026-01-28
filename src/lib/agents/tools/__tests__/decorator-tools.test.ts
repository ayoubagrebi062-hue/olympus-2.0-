import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  tool,
  toolClass,
  registerToolClass,
  createTool,
  quickTool,
  decoratorToolRegistry,
  zodToJsonSchema,
} from '../decorator-index';

describe('Tool Decorator System', () => {
  beforeEach(() => {
    decoratorToolRegistry.clear();
  });

  describe('zodToJsonSchema', () => {
    it('should convert simple Zod schema to JSON Schema', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      const jsonSchema = zodToJsonSchema(zodSchema);

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties?.name.type).toBe('string');
      expect(jsonSchema.properties?.age.type).toBe('number');
      expect(jsonSchema.properties?.active.type).toBe('boolean');
      expect(jsonSchema.required).toContain('name');
    });

    it('should handle optional fields', () => {
      const zodSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const jsonSchema = zodToJsonSchema(zodSchema);

      expect(jsonSchema.required).toContain('required');
      expect(jsonSchema.required).not.toContain('optional');
    });

    it('should handle enums', () => {
      const zodSchema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const jsonSchema = zodToJsonSchema(zodSchema);

      expect(jsonSchema.properties?.status.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should handle arrays', () => {
      const zodSchema = z.object({
        items: z.array(z.string()),
      });

      const jsonSchema = zodToJsonSchema(zodSchema);

      expect(jsonSchema.properties?.items.type).toBe('array');
      expect(jsonSchema.properties?.items.items?.type).toBe('string');
    });

    it('should handle defaults', () => {
      const zodSchema = z.object({
        count: z.number().default(10),
      });

      const jsonSchema = zodToJsonSchema(zodSchema);

      expect(jsonSchema.properties?.count.default).toBe(10);
    });
  });

  describe('@tool decorator', () => {
    it('should register a decorated method as a tool', () => {
      class TestTools {
        @tool({ description: 'Add two numbers' })
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }

      // Force class instantiation to trigger decorators
      new TestTools();

      expect(decoratorToolRegistry.has('testtools_add')).toBe(true);

      const toolDef = decoratorToolRegistry.get('testtools_add');
      expect(toolDef?.description).toBe('Add two numbers');
    });

    it('should use custom tool ID if provided', () => {
      class TestTools {
        @tool({ id: 'custom_add', description: 'Custom add' })
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }

      new TestTools();

      expect(decoratorToolRegistry.has('custom_add')).toBe(true);
    });

    it('should work with explicit schema', () => {
      const AddInputSchema = z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number'),
      });

      class TestTools {
        @tool({
          id: 'schema_add',
          description: 'Add with schema',
          schema: AddInputSchema,
        })
        async add(input: z.infer<typeof AddInputSchema>): Promise<number> {
          return input.a + input.b;
        }
      }

      new TestTools();

      const toolDef = decoratorToolRegistry.get('schema_add');
      expect(toolDef?.inputSchema.properties?.a.type).toBe('number');
      expect(toolDef?.inputSchema.properties?.b.type).toBe('number');
    });
  });

  describe('createTool', () => {
    it('should create and register a tool', () => {
      const myTool = createTool({
        id: 'my_tool',
        description: 'My custom tool',
        schema: z.object({
          input: z.string(),
        }),
        execute: async ({ input }) => input.toUpperCase(),
      });

      expect(decoratorToolRegistry.has('my_tool')).toBe(true);
      expect(myTool.id).toBe('my_tool');
    });

    it('should execute the tool correctly', async () => {
      createTool({
        id: 'upper',
        description: 'Convert to uppercase',
        schema: z.object({ text: z.string() }),
        execute: async ({ text }) => text.toUpperCase(),
      });

      const result = await decoratorToolRegistry.execute('upper', {
        text: 'hello',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('HELLO');
    });
  });

  describe('quickTool', () => {
    it('should create a tool with minimal boilerplate', async () => {
      quickTool(
        'multiply',
        'Multiply two numbers',
        z.object({ a: z.number(), b: z.number() }),
        async ({ a, b }) => a * b
      );

      const result = await decoratorToolRegistry.execute('multiply', {
        a: 3,
        b: 4,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(12);
    });
  });

  describe('Tool Registry', () => {
    it('should track tools by category', () => {
      createTool({
        id: 'tool1',
        description: 'Tool 1',
        category: 'math',
        schema: z.object({}),
        execute: async () => {},
      });

      createTool({
        id: 'tool2',
        description: 'Tool 2',
        category: 'math',
        schema: z.object({}),
        execute: async () => {},
      });

      createTool({
        id: 'tool3',
        description: 'Tool 3',
        category: 'io',
        schema: z.object({}),
        execute: async () => {},
      });

      const mathTools = decoratorToolRegistry.getByCategory('math');
      expect(mathTools).toHaveLength(2);

      const ioTools = decoratorToolRegistry.getByCategory('io');
      expect(ioTools).toHaveLength(1);
    });

    it('should search tools by query', () => {
      createTool({
        id: 'read_file',
        description: 'Read file contents',
        schema: z.object({}),
        execute: async () => {},
        metadata: { tags: ['io', 'file'] },
      });

      createTool({
        id: 'write_file',
        description: 'Write file contents',
        schema: z.object({}),
        execute: async () => {},
        metadata: { tags: ['io', 'file'] },
      });

      const results = decoratorToolRegistry.search('file');
      expect(results).toHaveLength(2);

      const readResults = decoratorToolRegistry.search('read');
      expect(readResults).toHaveLength(1);
    });

    it('should export tools in LLM format', () => {
      createTool({
        id: 'test_tool',
        description: 'A test tool',
        schema: z.object({
          input: z.string(),
        }),
        execute: async () => {},
      });

      const llmTools = decoratorToolRegistry.getToolsForLLM();

      expect(llmTools[0].type).toBe('function');
      expect(llmTools[0].function.name).toBe('test_tool');
      expect(llmTools[0].function.description).toBe('A test tool');
      expect(llmTools[0].function.parameters).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should validate input', async () => {
      createTool({
        id: 'strict_tool',
        description: 'Tool with strict input',
        schema: z.object({
          count: z.number().min(1).max(100),
        }),
        execute: async ({ count }) => count * 2,
      });

      // Valid input
      const validResult = await decoratorToolRegistry.execute('strict_tool', {
        count: 50,
      });
      expect(validResult.success).toBe(true);
      expect(validResult.data).toBe(100);

      // Invalid input
      const invalidResult = await decoratorToolRegistry.execute('strict_tool', {
        count: 200,
      });
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle execution errors', async () => {
      createTool({
        id: 'error_tool',
        description: 'Tool that throws',
        schema: z.object({}),
        execute: async () => {
          throw new Error('Something went wrong');
        },
      });

      const result = await decoratorToolRegistry.execute('error_tool', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
      expect(result.error?.message).toBe('Something went wrong');
    });

    it('should track execution metadata', async () => {
      createTool({
        id: 'slow_tool',
        description: 'Slow tool',
        schema: z.object({}),
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'done';
        },
      });

      const result = await decoratorToolRegistry.execute('slow_tool', {});

      expect(result.metadata.toolId).toBe('slow_tool');
      expect(result.metadata.executionTimeMs).toBeGreaterThan(40);
    });
  });

  describe('@toolClass decorator', () => {
    it('should apply category to all methods', () => {
      @toolClass({ category: 'math' })
      class MathTools {
        @tool({ id: 'class_add', description: 'Add numbers' })
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }

      new MathTools();

      expect(decoratorToolRegistry.has('class_add')).toBe(true);
    });
  });

  describe('Registry Stats', () => {
    it('should return correct stats', () => {
      createTool({
        id: 'stat_tool_1',
        description: 'Tool 1',
        category: 'cat1',
        schema: z.object({}),
        execute: async () => {},
      });

      createTool({
        id: 'stat_tool_2',
        description: 'Tool 2',
        category: 'cat1',
        schema: z.object({}),
        execute: async () => {},
      });

      createTool({
        id: 'stat_tool_3',
        description: 'Tool 3',
        category: 'cat2',
        schema: z.object({}),
        execute: async () => {},
      });

      const stats = decoratorToolRegistry.getStats();

      expect(stats.totalTools).toBe(3);
      expect(stats.categories['cat1']).toBe(2);
      expect(stats.categories['cat2']).toBe(1);
    });
  });
});

describe('Real-World Usage', () => {
  beforeEach(() => {
    decoratorToolRegistry.clear();
  });

  it('should support the transformation from 20+ lines to 3 lines', async () => {
    // BEFORE: 20+ lines of verbose definition
    // const oldReadFileTool = {
    //   id: 'read_file',
    //   name: 'Read File',
    //   description: 'Read a file',
    //   category: 'filesystem',
    //   parameters: [
    //     { name: 'path', type: 'string', description: '...', required: true },
    //     { name: 'encoding', type: 'string', description: '...', required: false },
    //   ],
    //   returns: { type: 'string', description: '...' },
    //   handler: async (input) => { ... }
    // };

    // AFTER: 3 lines with createTool
    const readFileTool = createTool({
      id: 'simple_read',
      description: 'Read a file',
      schema: z.object({ path: z.string() }),
      execute: async ({ path }) => `Content of ${path}`,
    });

    expect(readFileTool.id).toBe('simple_read');

    const result = await decoratorToolRegistry.execute('simple_read', {
      path: '/test.txt',
    });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Content of /test.txt');
  });

  it('should work with complex nested schemas', async () => {
    const ConfigSchema = z.object({
      database: z.object({
        host: z.string(),
        port: z.number().default(5432),
        credentials: z.object({
          username: z.string(),
          password: z.string(),
        }),
      }),
      features: z.array(z.enum(['auth', 'logging', 'caching'])),
    });

    createTool({
      id: 'configure',
      description: 'Configure the system',
      schema: ConfigSchema,
      execute: async config => ({
        configured: true,
        host: config.database.host,
        featureCount: config.features.length,
      }),
    });

    const result = await decoratorToolRegistry.execute('configure', {
      database: {
        host: 'localhost',
        port: 5432,
        credentials: { username: 'admin', password: 'secret' },
      },
      features: ['auth', 'logging'],
    });

    expect(result.success).toBe(true);
    expect((result.data as { configured: boolean }).configured).toBe(true);
    expect((result.data as { host: string }).host).toBe('localhost');
    expect((result.data as { featureCount: number }).featureCount).toBe(2);
  });
});

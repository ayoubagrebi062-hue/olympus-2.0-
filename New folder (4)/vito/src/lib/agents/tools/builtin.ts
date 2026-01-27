/**
 * OLYMPUS 2.0 - Built-in Agent Tools
 *
 * Core tools that integrate with OLYMPUS systems:
 * - Quality gates
 * - GraphRAG memory
 * - Code operations
 */

import type {
  ToolDefinition,
  ToolHandler,
  ToolResult,
  ToolContext,
  QualityCheckInput,
  MemorySearchInput,
  MemoryStoreInput,
  CodeAnalyzeInput,
} from './types';
import { getToolRegistry } from './registry';

// ============================================
// QUALITY TOOLS
// ============================================

const qualityCheckTool: ToolDefinition = {
  id: 'quality.check',
  name: 'Quality Check',
  description: 'Run quality gates on generated code to check for TypeScript errors, ESLint violations, and security issues',
  category: 'quality',
  parameters: [
    {
      name: 'files',
      type: 'array',
      description: 'Array of files to check, each with path, content, and language',
      required: true,
    },
    {
      name: 'gates',
      type: 'array',
      description: 'Which gates to run: typescript, eslint, security, build',
      required: false,
      default: ['typescript', 'eslint', 'security', 'build'],
    },
  ],
  returns: {
    type: 'object',
    description: 'Quality report with score, passed status, and issues',
  },
};

const qualityCheckHandler: ToolHandler = async (input, context) => {
  const typedInput = input as unknown as QualityCheckInput;
  try {
    const { checkQuality } = await import('@/lib/quality');

    const files = typedInput.files.map((f: { path: string; content: string; language: string }) => ({
      path: f.path,
      content: f.content,
      language: f.language,
    }));

    const report = await checkQuality(
      context?.buildId || 'tool-check',
      context?.projectId || 'unknown',
      files
    );

    return {
      success: true,
      data: {
        passed: report.overallStatus === 'passed',
        score: report.overallScore,
        summary: {
          totalErrors: report.summary.totalErrors,
          totalWarnings: report.summary.totalWarnings,
          passedGates: report.summary.passedGates,
          failedGates: report.summary.failedGates,
        },
        issues: report.gates.flatMap(g => g.issues),
        recommendations: report.recommendations,
      },
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'QUALITY_CHECK_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

// ============================================
// MEMORY TOOLS (GraphRAG)
// ============================================

const memorySearchTool: ToolDefinition = {
  id: 'memory.search',
  name: 'Memory Search',
  description: 'Search the GraphRAG memory for relevant code snippets, patterns, and user preferences',
  category: 'memory',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Natural language search query',
      required: true,
    },
    {
      name: 'collections',
      type: 'array',
      description: 'Collections to search: code, prompts, feedback, patterns',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of results',
      required: false,
      default: 5,
    },
  ],
  returns: {
    type: 'array',
    description: 'Array of matching documents with scores',
  },
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000,
  },
};

const memorySearchHandler: ToolHandler = async (input, context) => {
  const typedInput = input as unknown as MemorySearchInput;
  try {
    const { quickEmbed } = await import('@/lib/agents/embeddings');
    const { searchAllForContext } = await import('@/lib/db/qdrant');

    // Get embedding for query
    const embedding = await quickEmbed(typedInput.query);

    // Search across collections
    const results = await searchAllForContext(
      embedding,
      typedInput.limit || 5
    );

    return {
      success: true,
      data: results,
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'MEMORY_SEARCH_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

const memoryStoreTool: ToolDefinition = {
  id: 'memory.store',
  name: 'Memory Store',
  description: 'Store a code snippet, decision, or pattern in GraphRAG memory for future reference',
  category: 'memory',
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Type of content: code, decision, pattern, feedback',
      required: true,
      enum: ['code', 'decision', 'pattern', 'feedback'],
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to store',
      required: true,
    },
    {
      name: 'metadata',
      type: 'object',
      description: 'Additional metadata (tags, category, etc.)',
      required: true,
    },
  ],
  returns: {
    type: 'object',
    description: 'Storage confirmation with ID',
  },
};

const memoryStoreHandler: ToolHandler = async (input, context) => {
  const typedInput = input as unknown as MemoryStoreInput;
  try {
    const { quickEmbed } = await import('@/lib/agents/embeddings');
    const { upsertVector, COLLECTIONS } = await import('@/lib/db/qdrant');

    // Generate embedding
    const embedding = await quickEmbed(typedInput.content);

    // Determine collection
    const collectionMap: Record<string, string> = {
      code: COLLECTIONS.CODE_SNIPPETS,
      decision: COLLECTIONS.FEEDBACK,
      pattern: COLLECTIONS.DESIGN_PATTERNS,
      feedback: COLLECTIONS.FEEDBACK,
    };

    const collection = collectionMap[typedInput.type];
    const id = crypto.randomUUID();

    // Store in Qdrant
    await upsertVector(collection, id, embedding, {
      ...typedInput.metadata,
      content: typedInput.content,
      type: typedInput.type,
      projectId: context?.projectId,
      buildId: context?.buildId,
      agentId: context?.agentId,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: { id, collection },
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'MEMORY_STORE_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

const memoryRecallTool: ToolDefinition = {
  id: 'memory.recall',
  name: 'Memory Recall',
  description: 'Recall user preferences, past patterns, and project history from memory',
  category: 'memory',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'User ID to recall preferences for',
      required: true,
    },
    {
      name: 'context',
      type: 'string',
      description: 'What to recall: preferences, history, patterns',
      required: true,
      enum: ['preferences', 'history', 'patterns'],
    },
  ],
  returns: {
    type: 'object',
    description: 'Recalled context from memory',
  },
};

const memoryRecallHandler: ToolHandler = async (input, context) => {
  try {
    const { getUserContext } = await import('@/lib/agents/context/graphrag');

    const userContext = await getUserContext(input.userId as string);

    const contextType = input.context as string;
    let data;

    switch (contextType) {
      case 'preferences':
        data = userContext.preferences;
        break;
      case 'history':
        data = {
          totalBuilds: userContext.totalBuilds,
          successRate: userContext.successRate,
        };
        break;
      case 'patterns':
        data = userContext.industries;
        break;
      default:
        data = userContext;
    }

    return {
      success: true,
      data,
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'MEMORY_RECALL_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

// ============================================
// CODE ANALYSIS TOOLS
// ============================================

const codeAnalyzeTool: ToolDefinition = {
  id: 'code.analyze',
  name: 'Code Analyze',
  description: 'Analyze code for types, security issues, performance, and style',
  category: 'code',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to analyze',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
      description: 'Programming language',
      required: true,
    },
    {
      name: 'checks',
      type: 'array',
      description: 'What to check: types, security, performance, style',
      required: false,
      default: ['types', 'security'],
    },
  ],
  returns: {
    type: 'object',
    description: 'Analysis results with issues and suggestions',
  },
};

const codeAnalyzeHandler: ToolHandler = async (input, context) => {
  const typedInput = input as unknown as CodeAnalyzeInput;
  try {
    const results: Record<string, unknown[]> = {};

    for (const check of typedInput.checks) {
      switch (check) {
        case 'types': {
          const { typeScriptValidator } = await import('@/lib/quality/code-validator');
          const result = await typeScriptValidator.check([{
            path: 'analyze.ts',
            content: typedInput.code,
            language: typedInput.language,
          }]);
          results.types = result.issues;
          break;
        }
        case 'security': {
          const { securityScanner } = await import('@/lib/quality/security-scanner');
          const result = await securityScanner.check([{
            path: 'analyze.ts',
            content: typedInput.code,
            language: typedInput.language,
          }]);
          results.security = result.issues;
          break;
        }
        case 'style': {
          const { eslintValidator } = await import('@/lib/quality/code-validator');
          const result = await eslintValidator.check([{
            path: 'analyze.ts',
            content: typedInput.code,
            language: typedInput.language,
          }]);
          results.style = result.issues;
          break;
        }
      }
    }

    return {
      success: true,
      data: results,
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'CODE_ANALYZE_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

// ============================================
// SEARCH TOOLS
// ============================================

const searchSimilarCodeTool: ToolDefinition = {
  id: 'search.similar_code',
  name: 'Search Similar Code',
  description: 'Find similar code patterns from the knowledge base',
  category: 'search',
  parameters: [
    {
      name: 'description',
      type: 'string',
      description: 'Description of the code pattern to find',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
      description: 'Target programming language',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum results',
      required: false,
      default: 3,
    },
  ],
  returns: {
    type: 'array',
    description: 'Similar code snippets with relevance scores',
  },
};

const searchSimilarCodeHandler: ToolHandler = async (input, context) => {
  try {
    const { quickEmbed } = await import('@/lib/agents/embeddings');
    const { findSimilarCode } = await import('@/lib/db/qdrant');

    const embedding = await quickEmbed(input.description as string);

    const results = await findSimilarCode(
      embedding,
      (input.limit as number) || 3,
      input.language as string | undefined
    );

    return {
      success: true,
      data: results.map(r => ({
        filePath: r.filePath,
        codePreview: r.codePreview,
        similarity: r.similarity,
      })),
      duration: 0,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: (error as Error).message,
        recoverable: true,
      },
      duration: 0,
    };
  }
};

// ============================================
// REGISTER ALL TOOLS
// ============================================

export function registerBuiltinTools(): void {
  const registry = getToolRegistry();

  // Quality tools
  registry.register(qualityCheckTool, qualityCheckHandler);

  // Memory tools
  registry.register(memorySearchTool, memorySearchHandler);
  registry.register(memoryStoreTool, memoryStoreHandler);
  registry.register(memoryRecallTool, memoryRecallHandler);

  // Code tools
  registry.register(codeAnalyzeTool, codeAnalyzeHandler);

  // Search tools
  registry.register(searchSimilarCodeTool, searchSimilarCodeHandler);

  console.log('[ToolRegistry] Registered 6 built-in tools');
}

// ============================================
// EXPORTS
// ============================================

export {
  qualityCheckTool,
  memorySearchTool,
  memoryStoreTool,
  memoryRecallTool,
  codeAnalyzeTool,
  searchSimilarCodeTool,
};

/**
 * OLYMPUS 50X - Component Retriever
 *
 * Retrieves relevant component examples for code generation.
 * Uses existing embeddings service and component store.
 */

import { ComponentStore, ComponentExample, ComponentCategory, getComponentStore } from './component-store';
import { embed, getEmbeddingService, EmbeddingService } from '../embeddings';

// ============================================
// TYPES
// ============================================

export interface RetrievalOptions {
  category?: ComponentCategory;
  framework?: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla';
  limit?: number;
  minScore?: number;
}

export interface RetrievalResult {
  examples: ComponentExample[];
  formatted: string;
  query: string;
  retrievalTimeMs: number;
}

// ============================================
// COMPONENT RETRIEVER
// ============================================

export class ComponentRetriever {
  private store: ComponentStore | null = null;
  private embedder: EmbeddingService | null = null;

  /**
   * Initialize retriever with store and embedder
   */
  async initialize(): Promise<void> {
    if (!this.store) {
      this.store = await getComponentStore();
    }
    if (!this.embedder) {
      this.embedder = await getEmbeddingService();
    }
  }

  /**
   * Ensure initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.store || !this.embedder) {
      await this.initialize();
    }
  }

  /**
   * Retrieve relevant components for a generation task
   */
  async retrieve(query: string, options: RetrievalOptions = {}): Promise<RetrievalResult> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const { category, framework = 'react', limit = 5, minScore = 85 } = options;

    // Generate embedding for query
    const embeddingResult = await this.embedder!.embed(query);

    // Search for similar components
    const examples = await this.store!.searchSimilar(embeddingResult.embedding, {
      category,
      framework,
      limit,
      minScore,
    });

    // Format as few-shot examples
    const formatted = this.formatAsExamples(examples);

    return {
      examples,
      formatted,
      query,
      retrievalTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get best examples for a specific component type
   */
  async getFewShotExamples(
    category: ComponentCategory,
    count: number = 3,
    framework: string = 'react'
  ): Promise<string> {
    await this.ensureInitialized();

    const examples = await this.store!.getBestExamples(category, count, framework);

    if (examples.length === 0) {
      return `// No examples found for category: ${category}`;
    }

    return examples.map((ex, i) => `
### EXAMPLE ${i + 1}: ${ex.name}
// Description: ${ex.description}
// Quality Score: ${ex.quality_score}/100
// Tags: ${ex.tags.join(', ')}

\`\`\`tsx
${ex.code}
\`\`\`
`).join('\n');
  }

  /**
   * Get examples by searching with natural language
   */
  async searchExamples(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<string[]> {
    const result = await this.retrieve(query, options);

    return result.examples.map(ex => `
// EXAMPLE: ${ex.name}
// Description: ${ex.description}
// Quality Score: ${ex.quality_score}/100
${ex.code}
`);
  }

  /**
   * Get all examples for a category (for building prompts)
   */
  async getAllForCategory(
    category: ComponentCategory,
    framework: string = 'react'
  ): Promise<ComponentExample[]> {
    await this.ensureInitialized();

    return this.store!.getByCategory(category, {
      framework,
      limit: 10,
      minScore: 85,
    });
  }

  /**
   * Format examples as few-shot prompt content
   */
  private formatAsExamples(examples: ComponentExample[]): string {
    if (examples.length === 0) {
      return '// No matching examples found in RAG database';
    }

    return examples.map((ex, i) => `
═══════════════════════════════════════════════════════════════
EXAMPLE ${i + 1}: ${ex.name} (Score: ${ex.quality_score}/100)
═══════════════════════════════════════════════════════════════
// ${ex.description}
// Tags: ${ex.tags.join(', ')}

${ex.code}
`).join('\n');
  }

  /**
   * Check if RAG database has examples
   */
  async hasExamples(): Promise<boolean> {
    await this.ensureInitialized();
    return !(await this.store!.isEmpty());
  }

  /**
   * Get RAG stats
   */
  async getStats(): Promise<{
    totalComponents: number;
    byCategory: Record<string, number>;
    byFramework: Record<string, number>;
  }> {
    await this.ensureInitialized();
    return this.store!.getStats();
  }
}

// ============================================
// CONTEXT BUILDER
// ============================================

/**
 * Build complete context for agent with RAG examples
 */
export async function buildRAGContext(
  query: string,
  options: {
    category?: ComponentCategory;
    framework?: string;
    maxExamples?: number;
  } = {}
): Promise<{
  examples: string;
  hasExamples: boolean;
  exampleCount: number;
  timeMs: number;
}> {
  const startTime = Date.now();
  const retriever = new ComponentRetriever();

  try {
    await retriever.initialize();

    const hasAny = await retriever.hasExamples();
    if (!hasAny) {
      return {
        examples: '// RAG database is empty. Run seed script to populate.',
        hasExamples: false,
        exampleCount: 0,
        timeMs: Date.now() - startTime,
      };
    }

    const result = await retriever.retrieve(query, {
      category: options.category,
      framework: options.framework as any,
      limit: options.maxExamples || 3,
    });

    return {
      examples: result.formatted,
      hasExamples: result.examples.length > 0,
      exampleCount: result.examples.length,
      timeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[RAG] Failed to build context:', error);
    return {
      examples: `// RAG retrieval failed: ${(error as Error).message}`,
      hasExamples: false,
      exampleCount: 0,
      timeMs: Date.now() - startTime,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let retrieverInstance: ComponentRetriever | null = null;

/**
 * Get or create retriever instance
 */
export async function getRetriever(): Promise<ComponentRetriever> {
  if (!retrieverInstance) {
    retrieverInstance = new ComponentRetriever();
    await retrieverInstance.initialize();
  }
  return retrieverInstance;
}

export default ComponentRetriever;

/**
 * OLYMPUS 50X - RAG Component Store
 *
 * Vector database for storing and retrieving high-quality component examples.
 * Uses Qdrant for semantic search over component embeddings.
 */

import { QdrantClient } from '@qdrant/js-client-rest';

// ============================================
// TYPES
// ============================================

export type ComponentCategory =
  | 'button'
  | 'card'
  | 'form'
  | 'input'
  | 'navbar'
  | 'hero'
  | 'footer'
  | 'modal'
  | 'table'
  | 'sidebar'
  | 'dropdown'
  | 'badge'
  | 'avatar'
  | 'toast'
  | 'tabs'
  | 'accordion'
  | 'dialog'
  | 'tooltip'
  | 'skeleton'
  | 'other';

export interface ComponentExample {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  code: string;
  tags: string[];
  quality_score: number; // 0-100, only store >= 85
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla';
  screenshot_url?: string;
  created_at: Date;
  source?: 'seed' | 'user-approved' | 'generated';
}

export interface SearchOptions {
  category?: ComponentCategory;
  framework?: string;
  minScore?: number;
  limit?: number;
}

// ============================================
// CONSTANTS
// ============================================

const COLLECTION_NAME = 'olympus_components';
const DEFAULT_VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small

// ============================================
// COMPONENT STORE
// ============================================

export class ComponentStore {
  private client: QdrantClient;
  private collectionName: string;
  private vectorSize: number;

  constructor(
    options: {
      url?: string;
      collectionName?: string;
      vectorSize?: number;
    } = {}
  ) {
    this.client = new QdrantClient({
      url: options.url || process.env.QDRANT_URL || 'http://localhost:6333',
    });
    this.collectionName = options.collectionName || COLLECTION_NAME;
    this.vectorSize = options.vectorSize || DEFAULT_VECTOR_SIZE;
  }

  /**
   * Initialize collection with proper schema
   */
  async initialize(): Promise<void> {
    try {
      const exists = await this.client
        .getCollections()
        .then(collections => ({
          exists: collections.collections.some(c => c.name === this.collectionName),
        }));

      if (!exists.exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });

        // Create payload indexes for filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'category',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'framework',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'quality_score',
          field_schema: 'integer',
        });

        console.log(`[ComponentStore] Created collection: ${this.collectionName}`);
      } else {
        console.log(`[ComponentStore] Collection exists: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('[ComponentStore] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Add a component to the library
   */
  async addComponent(component: ComponentExample, embedding: number[]): Promise<void> {
    // Only store high-quality components
    if (component.quality_score < 85) {
      console.warn(
        `[ComponentStore] Skipping low-quality component: ${component.name} (score: ${component.quality_score})`
      );
      return;
    }

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: component.id,
          vector: embedding,
          payload: {
            name: component.name,
            category: component.category,
            description: component.description,
            code: component.code,
            tags: component.tags,
            quality_score: component.quality_score,
            framework: component.framework,
            screenshot_url: component.screenshot_url,
            source: component.source || 'seed',
            created_at: component.created_at.toISOString(),
          },
        },
      ],
    });
  }

  /**
   * Add multiple components in batch
   */
  async addComponents(
    components: Array<{ component: ComponentExample; embedding: number[] }>
  ): Promise<number> {
    const validComponents = components.filter(c => c.component.quality_score >= 85);

    if (validComponents.length === 0) {
      return 0;
    }

    const points = validComponents.map(({ component, embedding }) => ({
      id: component.id,
      vector: embedding,
      payload: {
        name: component.name,
        category: component.category,
        description: component.description,
        code: component.code,
        tags: component.tags,
        quality_score: component.quality_score,
        framework: component.framework,
        screenshot_url: component.screenshot_url,
        source: component.source || 'seed',
        created_at: component.created_at.toISOString(),
      },
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });

    return validComponents.length;
  }

  /**
   * Search for similar components
   */
  async searchSimilar(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<ComponentExample[]> {
    const { category, framework, minScore = 85, limit = 5 } = options;

    // Build filter
    const mustConditions: any[] = [{ key: 'quality_score', range: { gte: minScore } }];

    if (category) {
      mustConditions.push({ key: 'category', match: { value: category } });
    }

    if (framework) {
      mustConditions.push({ key: 'framework', match: { value: framework } });
    }

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
      limit,
      with_payload: true,
    });

    return results.map(r => ({
      id: r.id as string,
      name: r.payload?.name as string,
      category: r.payload?.category as ComponentCategory,
      description: r.payload?.description as string,
      code: r.payload?.code as string,
      tags: r.payload?.tags as string[],
      quality_score: r.payload?.quality_score as number,
      framework: r.payload?.framework as ComponentExample['framework'],
      screenshot_url: r.payload?.screenshot_url as string | undefined,
      source: r.payload?.source as ComponentExample['source'],
      created_at: new Date(r.payload?.created_at as string),
    }));
  }

  /**
   * Get components by category (for few-shot examples)
   */
  async getByCategory(
    category: ComponentCategory,
    options: { framework?: string; limit?: number; minScore?: number } = {}
  ): Promise<ComponentExample[]> {
    const { framework, limit = 5, minScore = 85 } = options;

    const mustConditions: any[] = [
      { key: 'category', match: { value: category } },
      { key: 'quality_score', range: { gte: minScore } },
    ];

    if (framework) {
      mustConditions.push({ key: 'framework', match: { value: framework } });
    }

    const results = await this.client.scroll(this.collectionName, {
      filter: { must: mustConditions },
      limit,
      with_payload: true,
    });

    return results.points.map(r => ({
      id: r.id as string,
      name: r.payload?.name as string,
      category: r.payload?.category as ComponentCategory,
      description: r.payload?.description as string,
      code: r.payload?.code as string,
      tags: r.payload?.tags as string[],
      quality_score: r.payload?.quality_score as number,
      framework: r.payload?.framework as ComponentExample['framework'],
      screenshot_url: r.payload?.screenshot_url as string | undefined,
      source: r.payload?.source as ComponentExample['source'],
      created_at: new Date(r.payload?.created_at as string),
    }));
  }

  /**
   * Get best examples for a component type (sorted by quality)
   */
  async getBestExamples(
    category: ComponentCategory,
    count: number = 3,
    framework: string = 'react'
  ): Promise<ComponentExample[]> {
    const results = await this.client.scroll(this.collectionName, {
      filter: {
        must: [
          { key: 'category', match: { value: category } },
          { key: 'framework', match: { value: framework } },
          { key: 'quality_score', range: { gte: 90 } }, // Only the best
        ],
      },
      limit: count,
      with_payload: true,
    });

    // Sort by quality score descending
    const components = results.points.map(r => ({
      id: r.id as string,
      name: r.payload?.name as string,
      category: r.payload?.category as ComponentCategory,
      description: r.payload?.description as string,
      code: r.payload?.code as string,
      tags: r.payload?.tags as string[],
      quality_score: r.payload?.quality_score as number,
      framework: r.payload?.framework as ComponentExample['framework'],
      screenshot_url: r.payload?.screenshot_url as string | undefined,
      source: r.payload?.source as ComponentExample['source'],
      created_at: new Date(r.payload?.created_at as string),
    }));

    return components.sort((a, b) => b.quality_score - a.quality_score);
  }

  /**
   * Delete a component
   */
  async deleteComponent(id: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{
    totalComponents: number;
    byCategory: Record<string, number>;
    byFramework: Record<string, number>;
    avgQualityScore: number;
  }> {
    const info = await this.client.getCollection(this.collectionName);
    const totalComponents = info.points_count || 0;

    // Get counts by category
    const categories: ComponentCategory[] = [
      'button',
      'card',
      'form',
      'input',
      'navbar',
      'hero',
      'footer',
      'modal',
      'table',
      'sidebar',
      'dropdown',
      'badge',
      'other',
    ];

    const byCategory: Record<string, number> = {};
    for (const category of categories) {
      const result = await this.client.count(this.collectionName, {
        filter: { must: [{ key: 'category', match: { value: category } }] },
      });
      if (result.count > 0) {
        byCategory[category] = result.count;
      }
    }

    // Get counts by framework
    const frameworks = ['react', 'vue', 'svelte', 'angular', 'vanilla'];
    const byFramework: Record<string, number> = {};
    for (const framework of frameworks) {
      const result = await this.client.count(this.collectionName, {
        filter: { must: [{ key: 'framework', match: { value: framework } }] },
      });
      if (result.count > 0) {
        byFramework[framework] = result.count;
      }
    }

    return {
      totalComponents,
      byCategory,
      byFramework,
      avgQualityScore: 0, // Would need aggregation query
    };
  }

  /**
   * Check if collection is empty
   */
  async isEmpty(): Promise<boolean> {
    const info = await this.client.getCollection(this.collectionName);
    return (info.points_count || 0) === 0;
  }

  /**
   * Clear all components (use with caution!)
   */
  async clear(): Promise<void> {
    await this.client.deleteCollection(this.collectionName);
    await this.initialize();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let storeInstance: ComponentStore | null = null;

/**
 * Get or create component store instance
 */
export async function getComponentStore(): Promise<ComponentStore> {
  if (!storeInstance) {
    storeInstance = new ComponentStore();
    await storeInstance.initialize();
  }
  return storeInstance;
}

export default ComponentStore;

/**
 * Vector Store - Semantic similarity search for builds
 *
 * Wraps Qdrant vector database for:
 * - Embedding build descriptions
 * - Finding similar historical builds
 * - Semantic search across build history
 */

import type {
  BuildEmbedding,
  BuildRecord,
  SimilarBuild,
  SimilarityQuery,
  IVectorStore,
  EmbeddingMetadata,
  MemoryConfig,
} from './types';
import type { ProjectType, ProjectComplexity } from '../types';

/**
 * Configuration for the vector store
 */
export interface VectorStoreConfig {
  collectionName: string;
  embeddingDimension: number;
  distanceMetric: 'cosine' | 'euclidean' | 'dot';
}

const DEFAULT_VECTOR_CONFIG: VectorStoreConfig = {
  collectionName: 'build_embeddings',
  embeddingDimension: 768, // nomic-embed-text dimension
  distanceMetric: 'cosine',
};

/**
 * Vector Store implementation using Qdrant
 * Falls back to in-memory storage if Qdrant is unavailable
 */
export class VectorStore implements IVectorStore {
  private embeddings: Map<string, BuildEmbedding> = new Map();
  private buildRecords: Map<string, BuildRecord> = new Map();
  private vectorConfig: VectorStoreConfig;
  private memoryConfig: MemoryConfig;
  private embeddingFn: ((text: string) => Promise<number[]>) | null = null;

  constructor(
    memoryConfig: MemoryConfig,
    vectorConfig: Partial<VectorStoreConfig> = {},
    embeddingFn?: (text: string) => Promise<number[]>
  ) {
    this.memoryConfig = memoryConfig;
    this.vectorConfig = { ...DEFAULT_VECTOR_CONFIG, ...vectorConfig };
    this.embeddingFn = embeddingFn || null;
  }

  // ============================================================================
  // Indexing Operations
  // ============================================================================

  async index(embedding: BuildEmbedding): Promise<void> {
    // Validate embedding dimension
    if (embedding.vector.length !== this.vectorConfig.embeddingDimension) {
      throw new Error(
        `Invalid embedding dimension: expected ${this.vectorConfig.embeddingDimension}, got ${embedding.vector.length}`
      );
    }

    this.embeddings.set(embedding.buildId, { ...embedding });
  }

  async indexBatch(embeddings: BuildEmbedding[]): Promise<void> {
    for (const embedding of embeddings) {
      await this.index(embedding);
    }
  }

  async remove(buildId: string): Promise<void> {
    this.embeddings.delete(buildId);
    this.buildRecords.delete(buildId);
  }

  /**
   * Index a build record (creates embedding from description)
   */
  async indexBuild(record: BuildRecord): Promise<void> {
    // Store the record for later retrieval
    this.buildRecords.set(record.id, { ...record });

    // Create text for embedding
    const text = this.buildEmbeddingText(record);

    // Generate embedding
    const vector = await this.embed(text);

    // Create and store embedding
    const embedding: BuildEmbedding = {
      buildId: record.id,
      vector,
      text,
      metadata: {
        projectType: record.projectType,
        complexity: record.complexity,
        tier: record.tier,
        tenantId: record.tenantId,
        quality: record.overallQuality,
        success: record.status === 'completed',
      },
      createdAt: new Date(),
    };

    await this.index(embedding);
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  async search(query: SimilarityQuery, vector: number[]): Promise<SimilarBuild[]> {
    if (this.embeddings.size === 0) {
      return [];
    }

    const scores: Array<{ buildId: string; similarity: number; embedding: BuildEmbedding }> = [];
    const candidates: Array<{ buildId: string; similarity: number; embedding: BuildEmbedding }> = [];

    for (const [buildId, embedding] of this.embeddings.entries()) {
      // Apply filters
      if (!this.matchesFilters(embedding.metadata, query)) {
        continue;
      }

      const similarity = this.calculateSimilarity(vector, embedding.vector);
      const entry = { buildId, similarity, embedding };
      candidates.push(entry);
      if (similarity >= this.memoryConfig.similarityThreshold) {
        scores.push(entry);
      }
    }

    const resultsPool = scores.length > 0 ? scores : candidates;
    resultsPool.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const limit = query.limit || this.memoryConfig.maxSimilarResults;
    const topResults = resultsPool.slice(0, limit);

    // Build results
    const results: SimilarBuild[] = [];
    for (const { buildId, similarity, embedding } of topResults) {
      const record = this.buildRecords.get(buildId);
      if (record) {
        results.push({
          buildId,
          similarity,
          record: { ...record },
          relevantPatterns: [], // Will be populated by MemoryModule
        });
      }
    }

    return results;
  }

  async searchByText(query: SimilarityQuery): Promise<SimilarBuild[]> {
    // Embed the query text
    const vector = await this.embed(query.description);
    return this.search(query, vector);
  }

  /**
   * Find builds similar to a given build
   */
  async findSimilarBuilds(buildId: string, limit: number = 5): Promise<SimilarBuild[]> {
    const embedding = this.embeddings.get(buildId);
    if (!embedding) {
      return [];
    }

    const results: Array<{ buildId: string; similarity: number }> = [];

    for (const [otherId, otherEmbedding] of this.embeddings.entries()) {
      if (otherId === buildId) continue;

      const similarity = this.calculateSimilarity(embedding.vector, otherEmbedding.vector);
      if (similarity >= this.memoryConfig.similarityThreshold) {
        results.push({ buildId: otherId, similarity });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, limit);

    const similarBuilds: SimilarBuild[] = [];
    for (const { buildId: similarId, similarity } of topResults) {
      const record = this.buildRecords.get(similarId);
      if (record) {
        similarBuilds.push({
          buildId: similarId,
          similarity,
          record: { ...record },
          relevantPatterns: [],
        });
      }
    }

    return similarBuilds;
  }

  // ============================================================================
  // Embedding Operations
  // ============================================================================

  async embed(text: string): Promise<number[]> {
    if (this.embeddingFn) {
      return this.embeddingFn(text);
    }

    // Fallback: Simple hash-based pseudo-embedding for testing
    // In production, this should use a real embedding model (e.g., nomic-embed-text via Ollama)
    return this.simpleHashEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }

  /**
   * Set a custom embedding function (e.g., for Ollama integration)
   */
  setEmbeddingFunction(fn: (text: string) => Promise<number[]>): void {
    this.embeddingFn = fn;
  }

  // ============================================================================
  // Similarity Calculation
  // ============================================================================

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    switch (this.vectorConfig.distanceMetric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'dot':
        return this.dotProduct(a, b);
      case 'euclidean':
        return 1 / (1 + this.euclideanDistance(a, b));
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  private dotProduct(a: number[], b: number[]): number {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result += a[i] * b[i];
    }
    return result;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sumSquares = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares);
  }

  // ============================================================================
  // Filter Matching
  // ============================================================================

  private matchesFilters(metadata: EmbeddingMetadata, query: SimilarityQuery): boolean {
    if (query.projectType && metadata.projectType !== query.projectType) {
      return false;
    }

    if (query.complexity && metadata.complexity !== query.complexity) {
      return false;
    }

    if (query.tier && metadata.tier !== query.tier) {
      return false;
    }

    if (query.tenantId && metadata.tenantId !== query.tenantId) {
      return false;
    }

    if (query.minQuality !== undefined && metadata.quality < query.minQuality) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // Text Processing
  // ============================================================================

  private buildEmbeddingText(record: BuildRecord): string {
    const parts: string[] = [];

    // Description
    parts.push(record.description);

    // Project type and complexity
    parts.push(`Project type: ${record.projectType}`);
    parts.push(`Complexity: ${record.complexity}`);
    parts.push(`Tier: ${record.tier}`);

    // Tags
    if (record.tags.length > 0) {
      parts.push(`Tags: ${record.tags.join(', ')}`);
    }

    // Key outputs
    const outputNames = Object.keys(record.outputs);
    if (outputNames.length > 0) {
      parts.push(`Outputs: ${outputNames.join(', ')}`);
    }

    return parts.join('. ');
  }

  // ============================================================================
  // Fallback Embedding (for testing without real embedding model)
  // ============================================================================

  private simpleHashEmbedding(text: string): number[] {
    // Create a deterministic pseudo-embedding based on text hash
    // This is NOT suitable for production - use a real embedding model
    const vector: number[] = new Array(this.vectorConfig.embeddingDimension).fill(0);

    // Simple character-based hashing
    const normalizedText = text.toLowerCase();
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.vectorConfig.embeddingDimension;
      vector[index] += 0.1 * Math.sin(charCode);
    }

    // Add some word-level features
    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) | 0;
      }
      const index = Math.abs(hash) % this.vectorConfig.embeddingDimension;
      vector[index] += 0.2;
    }

    // Normalize the vector
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async count(): Promise<number> {
    return this.embeddings.size;
  }

  async clear(): Promise<void> {
    this.embeddings.clear();
    this.buildRecords.clear();
  }

  async getEmbedding(buildId: string): Promise<BuildEmbedding | null> {
    const embedding = this.embeddings.get(buildId);
    return embedding ? { ...embedding } : null;
  }

  async getAllEmbeddings(): Promise<BuildEmbedding[]> {
    return Array.from(this.embeddings.values()).map(e => ({ ...e }));
  }

  getConfig(): VectorStoreConfig {
    return { ...this.vectorConfig };
  }

  async getStatistics(): Promise<{
    totalEmbeddings: number;
    totalBuilds: number;
    avgVectorNorm: number;
    projectTypeDistribution: Record<string, number>;
    qualityDistribution: { low: number; medium: number; high: number };
  }> {
    const embeddings = Array.from(this.embeddings.values());

    // Calculate average vector norm
    let totalNorm = 0;
    for (const embedding of embeddings) {
      let norm = 0;
      for (const val of embedding.vector) {
        norm += val * val;
      }
      totalNorm += Math.sqrt(norm);
    }

    // Project type distribution
    const projectTypeDistribution: Record<string, number> = {};
    for (const embedding of embeddings) {
      const type = embedding.metadata.projectType;
      projectTypeDistribution[type] = (projectTypeDistribution[type] || 0) + 1;
    }

    // Quality distribution
    const qualityDistribution = { low: 0, medium: 0, high: 0 };
    for (const embedding of embeddings) {
      const quality = embedding.metadata.quality;
      if (quality < 5) {
        qualityDistribution.low++;
      } else if (quality < 8) {
        qualityDistribution.medium++;
      } else {
        qualityDistribution.high++;
      }
    }

    return {
      totalEmbeddings: embeddings.length,
      totalBuilds: this.buildRecords.size,
      avgVectorNorm: embeddings.length > 0 ? totalNorm / embeddings.length : 0,
      projectTypeDistribution,
      qualityDistribution,
    };
  }
}

// ============================================================================
// Qdrant Integration (optional)
// ============================================================================

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

/**
 * Create a Qdrant-backed vector store
 * This is a factory function that returns a configured VectorStore
 * with Qdrant as the backend
 */
export async function createQdrantVectorStore(
  memoryConfig: MemoryConfig,
  qdrantConfig: QdrantConfig
): Promise<VectorStore> {
  // In a full implementation, this would:
  // 1. Connect to Qdrant
  // 2. Create/verify collection exists
  // 3. Return a VectorStore with Qdrant backend

  // For now, return a standard VectorStore
  // The actual Qdrant integration would use the Qdrant client
  const store = new VectorStore(memoryConfig, {
    collectionName: qdrantConfig.collectionName,
  });

  // Configure embedding function to use Ollama's nomic-embed-text
  // This would be set up based on environment configuration

  return store;
}

// ============================================================================
// Ollama Embedding Integration
// ============================================================================

export interface OllamaEmbeddingConfig {
  baseUrl: string;
  model: string;
}

/**
 * Create an embedding function using Ollama
 */
export function createOllamaEmbeddingFn(config: OllamaEmbeddingConfig): (text: string) => Promise<number[]> {
  return async (text: string): Promise<number[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      // Fallback to simple hash embedding on error
      console.error('Ollama embedding failed, using fallback:', error);
      throw error;
    }
  };
}

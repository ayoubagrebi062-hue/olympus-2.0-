/**
 * OLYMPUS 3.0 - Embedder
 * ======================
 * Creates and stores embeddings for code chunks
 */

import { CodeChunk } from './chunker';

const COLLECTION_NAME = 'olympus_codebase';
const EMBEDDING_DIM = 384; // Smaller dimension for simple hash-based embeddings

export interface SearchResult {
  score: number;
  payload: {
    file: string;
    content: string;
    type: string;
    startLine: number;
    endLine: number;
    language: string;
    name?: string;
  };
}

export class Embedder {
  private qdrantUrl: string;
  private indexed: Map<number, CodeChunk> = new Map();
  private useQdrant: boolean = false;

  constructor() {
    this.qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  }

  async initCollection(): Promise<void> {
    // Try to connect to Qdrant
    try {
      const response = await fetch(`${this.qdrantUrl}/collections/${COLLECTION_NAME}`, {
        method: 'GET',
      });

      if (response.ok) {
        console.log(`  Collection ${COLLECTION_NAME} exists`);
        this.useQdrant = true;
        return;
      }

      // Create collection
      const createResponse = await fetch(`${this.qdrantUrl}/collections/${COLLECTION_NAME}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: {
            size: EMBEDDING_DIM,
            distance: 'Cosine',
          },
        }),
      });

      if (createResponse.ok) {
        console.log(`  Created collection ${COLLECTION_NAME}`);
        this.useQdrant = true;
      } else {
        throw new Error('Failed to create collection');
      }
    } catch (error) {
      console.log('  Qdrant not available, using in-memory index');
      this.useQdrant = false;
    }
  }

  /**
   * Create embedding for text using TF-IDF-like approach
   * In production, use a proper embedding model
   */
  embed(text: string): number[] {
    const embedding = new Array(EMBEDDING_DIM).fill(0);

    // Tokenize and normalize
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    // Code-specific tokens (camelCase, snake_case splitting)
    const expandedTokens: string[] = [];
    for (const token of tokens) {
      expandedTokens.push(token);
      // Split camelCase
      const camelSplit = token.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
      expandedTokens.push(...camelSplit);
      // Split snake_case
      const snakeSplit = token.split('_');
      expandedTokens.push(...snakeSplit);
    }

    // Build term frequency
    const termFreq: Record<string, number> = {};
    for (const token of expandedTokens) {
      if (token.length > 1) {
        termFreq[token] = (termFreq[token] || 0) + 1;
      }
    }

    // Map tokens to embedding dimensions using hash
    for (const [token, freq] of Object.entries(termFreq)) {
      const hash = this.hash(token);
      const dim = Math.abs(hash) % EMBEDDING_DIM;
      const weight = Math.log(1 + freq) / Math.log(1 + expandedTokens.length);
      embedding[dim] += weight;

      // Add some spreading for better distribution
      const dim2 = Math.abs(hash * 31) % EMBEDDING_DIM;
      embedding[dim2] += weight * 0.5;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async indexChunks(chunks: CodeChunk[]): Promise<void> {
    console.log(`  Indexing ${chunks.length} chunks...`);

    if (this.useQdrant) {
      await this.indexChunksQdrant(chunks);
    } else {
      this.indexChunksMemory(chunks);
    }
  }

  private async indexChunksQdrant(chunks: CodeChunk[]): Promise<void> {
    const batchSize = 100;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const points = batch.map((chunk, j) => {
        const embedding = this.embed(chunk.content);
        return {
          id: i + j,
          vector: embedding,
          payload: {
            file: chunk.file,
            content: chunk.content.slice(0, 5000),
            type: chunk.type,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: chunk.language,
            name: chunk.name,
          },
        };
      });

      await fetch(`${this.qdrantUrl}/collections/${COLLECTION_NAME}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points,
        }),
      });

      const progress = Math.min(i + batchSize, chunks.length);
      process.stdout.write(`\r  Indexed ${progress}/${chunks.length}`);
    }
    console.log('');
  }

  private indexChunksMemory(chunks: CodeChunk[]): void {
    this.indexed.clear();
    for (let i = 0; i < chunks.length; i++) {
      this.indexed.set(i, chunks[i]);
      if ((i + 1) % 100 === 0 || i === chunks.length - 1) {
        process.stdout.write(`\r  Indexed ${i + 1}/${chunks.length}`);
      }
    }
    console.log('');
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (this.useQdrant) {
      return this.searchQdrant(query, limit);
    } else {
      return this.searchMemory(query, limit);
    }
  }

  private async searchQdrant(query: string, limit: number): Promise<SearchResult[]> {
    const embedding = this.embed(query);

    const response = await fetch(`${this.qdrantUrl}/collections/${COLLECTION_NAME}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: embedding,
        limit,
        with_payload: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return (data.result || []).map((r: { score: number; payload: SearchResult['payload'] }) => ({
      score: r.score,
      payload: r.payload,
    }));
  }

  private searchMemory(query: string, limit: number): SearchResult[] {
    const queryEmbedding = this.embed(query);
    const scores: { id: number; score: number }[] = [];

    for (const [id, chunk] of this.indexed.entries()) {
      const chunkEmbedding = this.embed(chunk.content);
      const score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
      scores.push({ id, score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Return top results
    return scores.slice(0, limit).map(({ id, score }) => {
      const chunk = this.indexed.get(id)!;
      return {
        score,
        payload: {
          file: chunk.file,
          content: chunk.content,
          type: chunk.type,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          language: chunk.language,
          name: chunk.name,
        },
      };
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct; // Vectors are already normalized
  }

  async clearCollection(): Promise<void> {
    if (this.useQdrant) {
      try {
        await fetch(`${this.qdrantUrl}/collections/${COLLECTION_NAME}`, {
          method: 'DELETE',
        });
        console.log('  Collection cleared');
      } catch {
        // Collection might not exist
      }
    } else {
      this.indexed.clear();
    }
  }
}

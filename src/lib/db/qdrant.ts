/**
 * OLYMPUS 2.0 - Qdrant Client
 * Vector database for semantic search and GraphRAG embeddings.
 */

import { QdrantClient } from '@qdrant/js-client-rest';

// Environment variables
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

// Singleton client instance
let client: QdrantClient | null = null;

/**
 * Get or create Qdrant client instance
 */
export function getClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({ url: QDRANT_URL });
  }
  return client;
}

/**
 * Check connection health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await getClient().getCollections();
    return true;
  } catch (error) {
    console.error('Qdrant health check failed:', error);
    return false;
  }
}

/**
 * Create a collection if it doesn't exist
 */
export async function ensureCollection(name: string, vectorSize: number = 1536): Promise<void> {
  const qdrantClient = getClient();

  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === name);

    if (!exists) {
      await qdrantClient.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
      console.log(`Created Qdrant collection: ${name}`);
    }
  } catch (error) {
    console.error(`Error ensuring collection ${name}:`, error);
    throw error;
  }
}

/**
 * Store a vector with metadata
 */
export async function upsertVector(
  collection: string,
  id: string,
  vector: number[],
  payload: Record<string, any>
): Promise<void> {
  const qdrantClient = getClient();

  // Use numeric hash for ID to ensure compatibility
  const numericId = hashStringToNumber(id);

  await qdrantClient.upsert(collection, {
    wait: true,
    points: [
      {
        id: numericId,
        vector,
        payload: { ...payload, originalId: id },
      },
    ],
  });
}

/**
 * Hash string to number for Qdrant point IDs
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Store multiple vectors
 */
export async function upsertVectors(
  collection: string,
  points: Array<{
    id: string;
    vector: number[];
    payload: Record<string, any>;
  }>
): Promise<void> {
  const qdrantClient = getClient();

  const numericPoints = points.map(p => ({
    id: hashStringToNumber(p.id),
    vector: p.vector,
    payload: { ...p.payload, originalId: p.id },
  }));

  await qdrantClient.upsert(collection, {
    wait: true,
    points: numericPoints,
  });
}

/**
 * Search for similar vectors
 */
export async function search(
  collection: string,
  vector: number[],
  limit: number = 5,
  filter?: Record<string, any>
): Promise<
  Array<{
    id: string;
    score: number;
    payload: Record<string, any>;
  }>
> {
  const qdrantClient = getClient();

  const results = await qdrantClient.search(collection, {
    vector,
    limit,
    filter,
    with_payload: true,
  });

  return results.map(result => ({
    id: String(result.id),
    score: result.score,
    payload: result.payload as Record<string, any>,
  }));
}

/**
 * Delete a vector by ID
 */
export async function deleteVector(collection: string, id: string): Promise<void> {
  const qdrantClient = getClient();

  await qdrantClient.delete(collection, {
    wait: true,
    points: [hashStringToNumber(id)],
  });
}

/**
 * Get collection info
 */
export async function getCollectionInfo(name: string): Promise<any> {
  const qdrantClient = getClient();
  return await qdrantClient.getCollection(name);
}

// ============================================
// OLYMPUS-SPECIFIC COLLECTIONS
// ============================================

// Collection names
export const COLLECTIONS = {
  PROMPTS: 'olympus_prompts',
  CODE_SNIPPETS: 'olympus_code',
  FEEDBACK: 'olympus_feedback',
  USER_PREFERENCES: 'olympus_user_prefs',
  DESIGN_PATTERNS: 'olympus_design_patterns',
  COMPONENTS: 'olympus_components',
} as const;

// Embedding dimensions
export const EMBEDDING_DIMENSIONS = {
  OPENAI_ADA_002: 1536,
  OPENAI_SMALL: 1536,
  OPENAI_LARGE: 3072,
  OLLAMA_NOMIC: 768,
  OLLAMA_MXBAI: 1024,
  LOCAL_MINILM: 384,
} as const;

// Default dimension (configurable via env)
export function getDefaultVectorSize(): number {
  const configuredSize = process.env.EMBEDDING_DIMENSION;
  if (configuredSize) {
    return parseInt(configuredSize, 10);
  }
  // Default to OpenAI ada-002 compatible
  return EMBEDDING_DIMENSIONS.OPENAI_ADA_002;
}

/**
 * Initialize all OLYMPUS collections
 */
export async function initializeCollections(vectorSize?: number): Promise<void> {
  const size = vectorSize || getDefaultVectorSize();
  console.log(`[Qdrant] Initializing collections with vector size: ${size}`);

  await ensureCollection(COLLECTIONS.PROMPTS, size);
  await ensureCollection(COLLECTIONS.CODE_SNIPPETS, size);
  await ensureCollection(COLLECTIONS.FEEDBACK, size);
  await ensureCollection(COLLECTIONS.USER_PREFERENCES, size);
  await ensureCollection(COLLECTIONS.DESIGN_PATTERNS, size);
  await ensureCollection(COLLECTIONS.COMPONENTS, size);

  console.log('[Qdrant] All collections initialized');
}

/**
 * Get collection stats
 */
export async function getCollectionStats(): Promise<
  Record<
    string,
    {
      vectorsCount: number;
      pointsCount: number;
    }
  >
> {
  const stats: Record<string, { vectorsCount: number; pointsCount: number }> = {};

  for (const [key, name] of Object.entries(COLLECTIONS)) {
    try {
      const info = await getCollectionInfo(name);
      stats[key] = {
        vectorsCount: info.vectors_count || 0,
        pointsCount: info.points_count || 0,
      };
    } catch {
      stats[key] = { vectorsCount: 0, pointsCount: 0 };
    }
  }

  return stats;
}

/**
 * Store a prompt embedding
 */
export async function storePromptEmbedding(
  userId: string,
  projectId: string,
  prompt: string,
  embedding: number[],
  outcome: 'success' | 'failure' = 'success'
): Promise<void> {
  const id = `${userId}-${projectId}-${Date.now()}`;

  await upsertVector(COLLECTIONS.PROMPTS, id, embedding, {
    userId,
    projectId,
    prompt,
    outcome,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find similar prompts
 */
export async function findSimilarPrompts(
  embedding: number[],
  limit: number = 5,
  userId?: string
): Promise<
  Array<{
    prompt: string;
    outcome: string;
    similarity: number;
  }>
> {
  const filter = userId ? { must: [{ key: 'userId', match: { value: userId } }] } : undefined;

  const results = await search(COLLECTIONS.PROMPTS, embedding, limit, filter);

  return results.map(r => ({
    prompt: r.payload.prompt as string,
    outcome: r.payload.outcome as string,
    similarity: r.score,
  }));
}

/**
 * Store code snippet embedding
 */
export async function storeCodeEmbedding(
  projectId: string,
  filePath: string,
  code: string,
  embedding: number[],
  language: string
): Promise<void> {
  const id = `${projectId}-${filePath.replace(/\//g, '-')}`;

  await upsertVector(COLLECTIONS.CODE_SNIPPETS, id, embedding, {
    projectId,
    filePath,
    codePreview: code.substring(0, 500), // Store preview only
    language,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find similar code
 */
export async function findSimilarCode(
  embedding: number[],
  limit: number = 5,
  language?: string
): Promise<
  Array<{
    filePath: string;
    codePreview: string;
    similarity: number;
  }>
> {
  const filter = language ? { must: [{ key: 'language', match: { value: language } }] } : undefined;

  const results = await search(COLLECTIONS.CODE_SNIPPETS, embedding, limit, filter);

  return results.map(r => ({
    filePath: r.payload.filePath as string,
    codePreview: r.payload.codePreview as string,
    similarity: r.score,
  }));
}

// ============================================
// USER PREFERENCES EMBEDDINGS
// ============================================

/**
 * Store user preference embedding (for style matching)
 */
export async function storeUserPreferenceEmbedding(
  userId: string,
  preferenceType: 'style' | 'color' | 'layout' | 'general',
  description: string,
  embedding: number[],
  metadata?: Record<string, any>
): Promise<void> {
  const id = `${userId}-${preferenceType}-${Date.now()}`;

  await upsertVector(COLLECTIONS.USER_PREFERENCES, id, embedding, {
    userId,
    preferenceType,
    description,
    ...metadata,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find users with similar preferences
 */
export async function findSimilarUserPreferences(
  embedding: number[],
  limit: number = 10,
  preferenceType?: string
): Promise<
  Array<{
    userId: string;
    preferenceType: string;
    description: string;
    similarity: number;
  }>
> {
  const filter = preferenceType
    ? { must: [{ key: 'preferenceType', match: { value: preferenceType } }] }
    : undefined;

  const results = await search(COLLECTIONS.USER_PREFERENCES, embedding, limit, filter);

  return results.map(r => ({
    userId: r.payload.userId as string,
    preferenceType: r.payload.preferenceType as string,
    description: r.payload.description as string,
    similarity: r.score,
  }));
}

// ============================================
// FEEDBACK EMBEDDINGS
// ============================================

/**
 * Store feedback embedding
 */
export async function storeFeedbackEmbedding(
  userId: string,
  buildId: string,
  feedback: string,
  embedding: number[],
  sentiment: 'positive' | 'negative' | 'neutral',
  category?: string
): Promise<void> {
  const id = `${userId}-${buildId}-feedback-${Date.now()}`;

  await upsertVector(COLLECTIONS.FEEDBACK, id, embedding, {
    userId,
    buildId,
    feedback,
    sentiment,
    category,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find similar feedback
 */
export async function findSimilarFeedback(
  embedding: number[],
  limit: number = 5,
  sentiment?: string
): Promise<
  Array<{
    feedback: string;
    sentiment: string;
    category?: string;
    similarity: number;
  }>
> {
  const filter = sentiment
    ? { must: [{ key: 'sentiment', match: { value: sentiment } }] }
    : undefined;

  const results = await search(COLLECTIONS.FEEDBACK, embedding, limit, filter);

  return results.map(r => ({
    feedback: r.payload.feedback as string,
    sentiment: r.payload.sentiment as string,
    category: r.payload.category as string | undefined,
    similarity: r.score,
  }));
}

// ============================================
// DESIGN PATTERN EMBEDDINGS
// ============================================

/**
 * Store design pattern embedding
 */
export async function storeDesignPatternEmbedding(
  patternName: string,
  description: string,
  embedding: number[],
  category: string,
  examples?: string[]
): Promise<void> {
  const id = `pattern-${patternName}`;

  await upsertVector(COLLECTIONS.DESIGN_PATTERNS, id, embedding, {
    patternName,
    description,
    category,
    examples: examples || [],
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find similar design patterns
 */
export async function findSimilarDesignPatterns(
  embedding: number[],
  limit: number = 5,
  category?: string
): Promise<
  Array<{
    patternName: string;
    description: string;
    category: string;
    similarity: number;
  }>
> {
  const filter = category ? { must: [{ key: 'category', match: { value: category } }] } : undefined;

  const results = await search(COLLECTIONS.DESIGN_PATTERNS, embedding, limit, filter);

  return results.map(r => ({
    patternName: r.payload.patternName as string,
    description: r.payload.description as string,
    category: r.payload.category as string,
    similarity: r.score,
  }));
}

// ============================================
// COMPONENT EMBEDDINGS
// ============================================

/**
 * Store component embedding
 */
export async function storeComponentEmbedding(
  componentName: string,
  description: string,
  embedding: number[],
  componentType: string,
  props?: string[],
  codeSnippet?: string
): Promise<void> {
  const id = `component-${componentName}`;

  await upsertVector(COLLECTIONS.COMPONENTS, id, embedding, {
    componentName,
    description,
    componentType,
    props: props || [],
    codeSnippet: codeSnippet?.substring(0, 1000), // Limit size
    createdAt: new Date().toISOString(),
  });
}

/**
 * Find similar components
 */
export async function findSimilarComponents(
  embedding: number[],
  limit: number = 5,
  componentType?: string
): Promise<
  Array<{
    componentName: string;
    description: string;
    componentType: string;
    similarity: number;
  }>
> {
  const filter = componentType
    ? { must: [{ key: 'componentType', match: { value: componentType } }] }
    : undefined;

  const results = await search(COLLECTIONS.COMPONENTS, embedding, limit, filter);

  return results.map(r => ({
    componentName: r.payload.componentName as string,
    description: r.payload.description as string,
    componentType: r.payload.componentType as string,
    similarity: r.score,
  }));
}

// ============================================
// MULTI-COLLECTION SEARCH
// ============================================

/**
 * Search result from any collection
 */
export interface MultiCollectionResult {
  collection: string;
  id: string;
  score: number;
  payload: Record<string, any>;
}

/**
 * Search across multiple collections
 */
export async function searchMultipleCollections(
  embedding: number[],
  collections: string[],
  limitPerCollection: number = 3
): Promise<MultiCollectionResult[]> {
  const allResults: MultiCollectionResult[] = [];

  const searchPromises = collections.map(async collection => {
    const results = await search(collection, embedding, limitPerCollection);
    return results.map(r => ({
      collection,
      id: r.id,
      score: r.score,
      payload: r.payload,
    }));
  });

  const resultsArrays = await Promise.all(searchPromises);

  for (const results of resultsArrays) {
    allResults.push(...results);
  }

  // Sort by score descending
  return allResults.sort((a, b) => b.score - a.score);
}

/**
 * Search all OLYMPUS collections for relevant context
 */
export async function searchAllForContext(
  embedding: number[],
  limit: number = 10
): Promise<{
  prompts: Array<{ prompt: string; outcome: string; similarity: number }>;
  code: Array<{ filePath: string; codePreview: string; similarity: number }>;
  patterns: Array<{ patternName: string; description: string; similarity: number }>;
  components: Array<{ componentName: string; description: string; similarity: number }>;
}> {
  const [prompts, code, patterns, components] = await Promise.all([
    findSimilarPrompts(embedding, limit),
    findSimilarCode(embedding, limit),
    findSimilarDesignPatterns(embedding, limit),
    findSimilarComponents(embedding, limit),
  ]);

  return { prompts, code, patterns, components };
}

export default {
  getClient,
  healthCheck,
  ensureCollection,
  upsertVector,
  upsertVectors,
  search,
  deleteVector,
  getCollectionInfo,
  initializeCollections,
  getCollectionStats,
  getDefaultVectorSize,
  // Prompts
  storePromptEmbedding,
  findSimilarPrompts,
  // Code
  storeCodeEmbedding,
  findSimilarCode,
  // User preferences
  storeUserPreferenceEmbedding,
  findSimilarUserPreferences,
  // Feedback
  storeFeedbackEmbedding,
  findSimilarFeedback,
  // Design patterns
  storeDesignPatternEmbedding,
  findSimilarDesignPatterns,
  // Components
  storeComponentEmbedding,
  findSimilarComponents,
  // Multi-collection
  searchMultipleCollections,
  searchAllForContext,
  // Constants
  COLLECTIONS,
  EMBEDDING_DIMENSIONS,
};

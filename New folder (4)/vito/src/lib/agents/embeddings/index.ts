/**
 * OLYMPUS 2.0 - Embeddings Service
 *
 * Unified embedding generation supporting:
 * - OpenAI: text-embedding-ada-002, text-embedding-3-small/large
 * - Ollama: nomic-embed-text, mxbai-embed-large
 * - Caching via Redis for efficiency
 */

import { createHash } from 'crypto';
import * as redis from '../../db/redis';

// ============================================
// TYPES
// ============================================

export type EmbeddingProvider = 'openai' | 'ollama';

export interface EmbeddingOptions {
  provider?: EmbeddingProvider;
  model?: string;
  cache?: boolean;
  cacheTTL?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: EmbeddingProvider;
  cached: boolean;
  latencyMs: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  provider: EmbeddingProvider;
  latencyMs: number;
}

// ============================================
// CONSTANTS
// ============================================

export const EMBEDDING_MODELS = {
  // OpenAI models
  OPENAI_ADA_002: 'text-embedding-ada-002',
  OPENAI_3_SMALL: 'text-embedding-3-small',
  OPENAI_3_LARGE: 'text-embedding-3-large',
  // Ollama models
  OLLAMA_NOMIC: 'nomic-embed-text',
  OLLAMA_MXBAI: 'mxbai-embed-large',
} as const;

export const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-ada-002': 1536,
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
};

const CACHE_PREFIX = 'embedding:';
const DEFAULT_CACHE_TTL = 86400; // 24 hours

// ============================================
// PROVIDER DETECTION
// ============================================

function getOpenAIKey(): string {
  return process.env.OPENAI_API_KEY || '';
}

function getOllamaUrl(): string {
  return process.env.OLLAMA_URL || 'http://localhost:11434';
}

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${getOllamaUrl()}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a specific Ollama model is available
 */
async function isOllamaModelAvailable(model: string): Promise<boolean> {
  try {
    const response = await fetch(`${getOllamaUrl()}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    return models.some((m: string) => m.startsWith(model));
  } catch {
    return false;
  }
}

/**
 * Check if Ollama has an embedding model available
 */
async function hasOllamaEmbeddingModel(): Promise<boolean> {
  // Check common embedding models
  const embeddingModels = ['nomic-embed-text', 'mxbai-embed-large', 'all-minilm'];
  for (const model of embeddingModels) {
    if (await isOllamaModelAvailable(model)) {
      return true;
    }
  }
  return false;
}

function isOpenAIAvailable(): boolean {
  return !!getOpenAIKey();
}

/**
 * Get default provider based on availability
 * Prefers OpenAI for reliability and correct dimensions
 */
export async function getDefaultProvider(): Promise<EmbeddingProvider> {
  // Prefer OpenAI for consistent 1536-dimension embeddings
  if (isOpenAIAvailable()) {
    return 'openai';
  }
  // Fallback to Ollama if OpenAI not available
  if (await isOllamaAvailable() && await hasOllamaEmbeddingModel()) {
    return 'ollama';
  }
  // Last resort: check if Ollama is available even without embedding models
  if (await isOllamaAvailable()) {
    console.warn('[Embeddings] OpenAI not available, falling back to Ollama. Note: dimension mismatch may occur.');
    return 'ollama';
  }
  throw new Error('No embedding provider available. Configure OPENAI_API_KEY or run Ollama with embedding models.');
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: EmbeddingProvider): string {
  switch (provider) {
    case 'openai':
      return EMBEDDING_MODELS.OPENAI_3_SMALL;
    case 'ollama':
      return EMBEDDING_MODELS.OLLAMA_NOMIC;
    default:
      return EMBEDDING_MODELS.OPENAI_3_SMALL;
  }
}

// ============================================
// CACHING
// ============================================

function getCacheKey(text: string, model: string): string {
  const hash = createHash('sha256').update(`${model}:${text}`).digest('hex');
  return `${CACHE_PREFIX}${hash}`;
}

async function getCachedEmbedding(text: string, model: string): Promise<number[] | null> {
  try {
    const cacheKey = getCacheKey(text, model);
    const cached = await redis.getCache<number[]>(cacheKey);
    return cached;
  } catch {
    return null;
  }
}

async function cacheEmbedding(
  text: string,
  model: string,
  embedding: number[],
  ttl: number = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    const cacheKey = getCacheKey(text, model);
    await redis.setCache(cacheKey, embedding, ttl);
  } catch {
    // Caching is optional, continue without it
  }
}

// ============================================
// OPENAI EMBEDDINGS
// ============================================

async function getOpenAIEmbedding(
  text: string,
  model: string = EMBEDDING_MODELS.OPENAI_3_SMALL
): Promise<number[]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function getOpenAIEmbeddingsBatch(
  texts: string[],
  model: string = EMBEDDING_MODELS.OPENAI_3_SMALL
): Promise<number[][]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI batch embedding failed: ${error}`);
  }

  const data = await response.json();
  // Sort by index to maintain order
  const sorted = data.data.sort((a: any, b: any) => a.index - b.index);
  return sorted.map((item: any) => item.embedding);
}

// ============================================
// OLLAMA EMBEDDINGS
// ============================================

async function getOllamaEmbedding(
  text: string,
  model: string = EMBEDDING_MODELS.OLLAMA_NOMIC
): Promise<number[]> {
  const baseUrl = getOllamaUrl();

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama embedding failed: ${error}`);
  }

  const data = await response.json();
  return data.embedding;
}

async function getOllamaEmbeddingsBatch(
  texts: string[],
  model: string = EMBEDDING_MODELS.OLLAMA_NOMIC
): Promise<number[][]> {
  // Ollama doesn't support batch embeddings natively, so we parallelize
  const embeddings = await Promise.all(
    texts.map((text) => getOllamaEmbedding(text, model))
  );
  return embeddings;
}

// ============================================
// UNIFIED EMBEDDING API
// ============================================

/**
 * Generate embedding for a single text
 */
export async function embed(
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
  const startTime = Date.now();

  // Determine provider
  const provider = options.provider || await getDefaultProvider();
  const model = options.model || getDefaultModel(provider);
  const useCache = options.cache !== false;
  const cacheTTL = options.cacheTTL || DEFAULT_CACHE_TTL;

  // Check cache first
  if (useCache) {
    const cached = await getCachedEmbedding(text, model);
    if (cached) {
      return {
        embedding: cached,
        model,
        provider,
        cached: true,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // Generate embedding
  let embedding: number[];

  switch (provider) {
    case 'openai':
      embedding = await getOpenAIEmbedding(text, model);
      break;
    case 'ollama':
      embedding = await getOllamaEmbedding(text, model);
      break;
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }

  // Cache the result
  if (useCache) {
    await cacheEmbedding(text, model, embedding, cacheTTL);
  }

  return {
    embedding,
    model,
    provider,
    cached: false,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Generate embeddings for multiple texts
 */
export async function embedBatch(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<BatchEmbeddingResult> {
  const startTime = Date.now();

  if (texts.length === 0) {
    throw new Error('No texts provided for embedding');
  }

  // Determine provider
  const provider = options.provider || await getDefaultProvider();
  const model = options.model || getDefaultModel(provider);

  let embeddings: number[][];

  switch (provider) {
    case 'openai':
      embeddings = await getOpenAIEmbeddingsBatch(texts, model);
      break;
    case 'ollama':
      embeddings = await getOllamaEmbeddingsBatch(texts, model);
      break;
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }

  return {
    embeddings,
    model,
    provider,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Get embedding dimension for a model
 */
export function getEmbeddingDimension(model: string): number {
  return MODEL_DIMENSIONS[model] || 1536;
}

/**
 * Check which embedding providers are available
 */
export async function checkProviders(): Promise<{
  openai: boolean;
  ollama: boolean;
  ollamaHasEmbeddingModels: boolean;
  defaultProvider: EmbeddingProvider | null;
}> {
  const openai = isOpenAIAvailable();
  const ollama = await isOllamaAvailable();
  const ollamaHasEmbeddingModels = ollama ? await hasOllamaEmbeddingModel() : false;

  let defaultProvider: EmbeddingProvider | null = null;
  if (ollama && ollamaHasEmbeddingModels) {
    defaultProvider = 'ollama';
  } else if (openai) {
    defaultProvider = 'openai';
  } else if (ollama) {
    defaultProvider = 'ollama'; // Will warn about missing models
  }

  return { openai, ollama, ollamaHasEmbeddingModels, defaultProvider };
}

// ============================================
// EMBEDDING SERVICE CLASS
// ============================================

/**
 * Embedding Service for managing embedding generation
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;
  private model: string;
  private useCache: boolean;

  constructor(options: {
    provider?: EmbeddingProvider;
    model?: string;
    cache?: boolean;
  } = {}) {
    this.provider = options.provider || 'openai';
    this.model = options.model || getDefaultModel(this.provider);
    this.useCache = options.cache !== false;
  }

  /**
   * Initialize with auto-detected provider
   */
  static async create(options: {
    preferLocal?: boolean;
    cache?: boolean;
  } = {}): Promise<EmbeddingService> {
    const { openai, ollama, ollamaHasEmbeddingModels } = await checkProviders();

    let provider: EmbeddingProvider;
    if (options.preferLocal && ollama && ollamaHasEmbeddingModels) {
      provider = 'ollama';
    } else if (openai) {
      provider = 'openai';
    } else if (ollama && ollamaHasEmbeddingModels) {
      provider = 'ollama';
    } else {
      throw new Error('No embedding provider available. Configure OPENAI_API_KEY or install Ollama embedding models.');
    }

    return new EmbeddingService({
      provider,
      cache: options.cache,
    });
  }

  /**
   * Generate single embedding
   */
  async embed(text: string): Promise<EmbeddingResult> {
    return await embed(text, {
      provider: this.provider,
      model: this.model,
      cache: this.useCache,
    });
  }

  /**
   * Generate batch embeddings
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    return await embedBatch(texts, {
      provider: this.provider,
      model: this.model,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): { provider: EmbeddingProvider; model: string; dimension: number } {
    return {
      provider: this.provider,
      model: this.model,
      dimension: getEmbeddingDimension(this.model),
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let serviceInstance: EmbeddingService | null = null;

/**
 * Get or create embedding service instance
 */
export async function getEmbeddingService(): Promise<EmbeddingService> {
  if (!serviceInstance) {
    serviceInstance = await EmbeddingService.create({ preferLocal: true });
  }
  return serviceInstance;
}

/**
 * Quick embedding function
 */
export async function quickEmbed(text: string): Promise<number[]> {
  const service = await getEmbeddingService();
  const result = await service.embed(text);
  return result.embedding;
}

export default {
  embed,
  embedBatch,
  EmbeddingService,
  getEmbeddingService,
  quickEmbed,
  checkProviders,
  getEmbeddingDimension,
  getDefaultProvider,
  getDefaultModel,
  EMBEDDING_MODELS,
  MODEL_DIMENSIONS,
};

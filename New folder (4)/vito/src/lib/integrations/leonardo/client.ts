/**
 * OLYMPUS 2.0 - Leonardo.ai API Client
 *
 * Official Leonardo.ai integration for AI image generation.
 * Handles authentication, rate limiting, and all image generation endpoints.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface LeonardoConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeout: number;
}

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  modelId?: string;
  width?: number;
  height?: number;
  numImages?: number;
  guidance?: number;
  scheduler?: string;
  seed?: number;
  presetStyle?: string;
  alchemy?: boolean;
  photoReal?: boolean;
  photoRealVersion?: string;
  contrastRatio?: number;
  expandedDomain?: boolean;
  highResolution?: boolean;
  public?: boolean;
}

export interface GenerationResponse {
  sdGenerationJob: {
    generationId: string;
    apiCreditCost: number;
  };
}

export interface GenerationStatus {
  generationId: string;
  status: 'PENDING' | 'COMPLETE' | 'FAILED';
  generatedImages: GeneratedImage[];
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  createdAt: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  nsfw: boolean;
  likeCount: number;
  generationId: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  instancePrompt?: string;
  modelWidth: number;
  modelHeight: number;
  status: string;
  type: string;
  public: boolean;
  nsfw: boolean;
}

export interface UserInfo {
  user: {
    id: string;
    username: string;
    tokenRenewalDate: string;
    subscriptionTokens: number;
    subscriptionGptTokens: number;
    subscriptionModelTokens: number;
    apiConcurrencySlots: number;
    apiPaidTokens: number;
    apiSubscriptionTokens: number;
    apiPlanTokenRenewalDate: string;
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

export const LEONARDO_MODELS = {
  // Core Models
  PHOENIX: '6b645e3a-d64f-4341-a6d8-7a3690fbf042', // Leonardo Phoenix (newest)
  KINO_XL: 'aa77f04e-3eec-4034-9c07-d0f619684628', // Leonardo Kino XL
  DIFFUSION_XL: '1e60896f-3c26-4296-8ecc-53e2afecc132', // Leonardo Diffusion XL
  VISION_XL: '5c232a9e-9061-4777-980a-ddc8e65647c6', // Leonardo Vision XL

  // Specialized
  ANIME_XL: 'e71a1c2f-4f80-4800-934f-2c68979d8cc8', // Leonardo Anime XL
  LIGHTNING_XL: 'b24e16ff-06e3-43eb-8d33-4416c2d75876', // Leonardo Lightning XL (fast)

  // Legacy (still available)
  CREATIVE: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', // Leonardo Creative
  SELECT: 'cd2b2a15-9760-4174-a5ff-4d2925057376', // Leonardo Select
} as const;

export const PRESET_STYLES = {
  NONE: 'NONE',
  ANIME: 'ANIME',
  CINEMATIC: 'CINEMATIC',
  CREATIVE: 'CREATIVE',
  DYNAMIC: 'DYNAMIC',
  ENVIRONMENT: 'ENVIRONMENT',
  GENERAL: 'GENERAL',
  ILLUSTRATION: 'ILLUSTRATION',
  PHOTOGRAPHY: 'PHOTOGRAPHY',
  RAYTRACED: 'RAYTRACED',
  RENDER_3D: 'RENDER_3D',
  SKETCH_BW: 'SKETCH_BW',
  SKETCH_COLOR: 'SKETCH_COLOR',
  STOCKPHOTO: 'STOCKPHOTO',
  VIBRANT: 'VIBRANT',
} as const;

export const DEFAULT_CONFIG: LeonardoConfig = {
  apiKey: process.env.LEONARDO_API_KEY || '',
  baseUrl: 'https://cloud.leonardo.ai/api/rest/v1',
  defaultModel: LEONARDO_MODELS.PHOENIX,
  timeout: 60000,
};

// ════════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ════════════════════════════════════════════════════════════════════════════════

const RATE_LIMIT = {
  requestsPerMinute: 30,
  minDelayMs: 2000, // 2 seconds between requests
};

let lastRequestTime = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT.minDelayMs && lastRequestTime > 0) {
    const waitTime = RATE_LIMIT.minDelayMs - timeSinceLastRequest;
    console.log(`   [LEONARDO] Rate limit: waiting ${waitTime}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

// ════════════════════════════════════════════════════════════════════════════════
// API CLIENT CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class LeonardoClient {
  private config: LeonardoConfig;

  constructor(config: Partial<LeonardoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error('LEONARDO_API_KEY is required. Set it in .env.local or pass it to the constructor.');
    }
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await waitForRateLimit();

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Leonardo API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get current user info and token balance
   */
  async getUserInfo(): Promise<UserInfo> {
    return this.request<UserInfo>('/me');
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ custom_models: ModelInfo[] }> {
    return this.request<{ custom_models: ModelInfo[] }>('/platformModels');
  }

  /**
   * Start an image generation job
   */
  async generate(params: GenerationRequest): Promise<GenerationResponse> {
    const body = {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      modelId: params.modelId || this.config.defaultModel,
      width: params.width || 1024,
      height: params.height || 1024,
      num_images: params.numImages || 1,
      guidance_scale: params.guidance || 7,
      scheduler: params.scheduler,
      seed: params.seed,
      presetStyle: params.presetStyle || PRESET_STYLES.NONE,
      alchemy: params.alchemy ?? true,
      photoReal: params.photoReal ?? false,
      photoRealVersion: params.photoRealVersion,
      contrastRatio: params.contrastRatio,
      expandedDomain: params.expandedDomain,
      highResolution: params.highResolution ?? true,
      public: params.public ?? false,
    };

    // Remove undefined values
    const cleanBody = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined)
    );

    console.log(`   [LEONARDO] Starting generation with model: ${cleanBody.modelId}`);

    return this.request<GenerationResponse>('/generations', {
      method: 'POST',
      body: JSON.stringify(cleanBody),
    });
  }

  /**
   * Get the status and results of a generation job
   */
  async getGeneration(generationId: string): Promise<{ generations_by_pk: GenerationStatus }> {
    return this.request<{ generations_by_pk: GenerationStatus }>(
      `/generations/${generationId}`
    );
  }

  /**
   * Wait for a generation to complete (polling)
   */
  async waitForGeneration(
    generationId: string,
    maxWaitMs: number = 120000,
    pollIntervalMs: number = 3000
  ): Promise<GenerationStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getGeneration(generationId);
      const status = result.generations_by_pk;

      if (status.status === 'COMPLETE') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(`Generation failed: ${generationId}`);
      }

      console.log(`   [LEONARDO] Generation ${generationId} status: ${status.status}`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Generation timed out after ${maxWaitMs}ms`);
  }

  /**
   * Generate images and wait for completion (convenience method)
   */
  async generateAndWait(params: GenerationRequest): Promise<GenerationStatus> {
    const response = await this.generate(params);
    const generationId = response.sdGenerationJob.generationId;

    console.log(`   [LEONARDO] Generation started: ${generationId}`);
    console.log(`   [LEONARDO] API credits used: ${response.sdGenerationJob.apiCreditCost}`);

    return this.waitForGeneration(generationId);
  }

  /**
   * Delete a generation
   */
  async deleteGeneration(generationId: string): Promise<void> {
    await this.request(`/generations/${generationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Upscale an image
   */
  async upscale(imageId: string): Promise<{ sdUpscaleJob: { id: string } }> {
    return this.request<{ sdUpscaleJob: { id: string } }>('/variations/upscale', {
      method: 'POST',
      body: JSON.stringify({ id: imageId }),
    });
  }

  /**
   * Create a variation of an image
   */
  async createVariation(imageId: string): Promise<{ sdVariationJob: { id: string } }> {
    return this.request<{ sdVariationJob: { id: string } }>('/variations', {
      method: 'POST',
      body: JSON.stringify({ id: imageId }),
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════════

let clientInstance: LeonardoClient | null = null;

/**
 * Get or create the Leonardo client singleton
 */
export function getLeonardoClient(config?: Partial<LeonardoConfig>): LeonardoClient {
  if (!clientInstance || config) {
    clientInstance = new LeonardoClient(config);
  }
  return clientInstance;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default LeonardoClient;

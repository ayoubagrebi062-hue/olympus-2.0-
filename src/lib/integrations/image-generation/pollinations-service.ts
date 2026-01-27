/**
 * OLYMPUS 2.0 - Pollinations.ai Image Generation Service
 *
 * FREE unlimited image generation via n8n webhook.
 * Replaces Leonardo.ai (paid) with Pollinations.ai (free).
 */

import type { LeonardoPrompt } from '../../agents/registry/artist';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface PollinationsRequest {
  prompt: string;
  type?:
    | 'hero'
    | 'icon'
    | 'avatar'
    | 'product'
    | 'logo'
    | 'banner'
    | 'background'
    | 'illustration'
    | 'thumbnail'
    | 'custom';
  style?:
    | 'cinematic'
    | 'anime'
    | 'cyberpunk'
    | 'fantasy'
    | 'photorealistic'
    | 'minimalist'
    | 'watercolor'
    | 'oil-painting'
    | 'pixel-art'
    | 'comic'
    | 'neon'
    | 'vintage'
    | '3d-render'
    | 'digital-art'
    | 'steampunk'
    | 'none';
  model?: 'flux' | 'turbo' | 'flux-realism' | 'flux-anime' | 'flux-3d';
  width?: number;
  height?: number;
  seed?: number;
  nologo?: boolean;
  enhance?: boolean;
  negative?: string;
}

export interface PollinationsResponse {
  success: boolean;
  requestId?: string;
  timestamp?: string;
  image?: {
    url: string;
    width: number;
    height: number;
    format: string;
    seed: number;
    model: string;
  };
  prompt?: {
    original: string;
    enhanced: string;
    style: string;
    type: string;
  };
  stats?: {
    promptLength: number;
    urlLength: number;
    processingTime: string;
  };
  meta?: {
    provider: string;
    cost: string;
    apiVersion: string;
    poweredBy: string;
  };
  error?: {
    type: string;
    message: string;
    details: string[];
  };
}

export interface ImageGenerationResult {
  id: string;
  prompt: string;
  url: string | null;
  error?: string;
}

export interface BatchGenerationResult {
  success: ImageGenerationResult[];
  failed: ImageGenerationResult[];
  imageUrlMap: Record<string, string>;
  totalTime: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class PollinationsService {
  private webhookUrl: string;
  private concurrency: number;
  private retryAttempts: number;

  constructor(options: { webhookUrl: string; concurrency?: number; retryAttempts?: number }) {
    this.webhookUrl = options.webhookUrl;
    this.concurrency = options.concurrency || 2;
    this.retryAttempts = options.retryAttempts || 2;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SINGLE IMAGE GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  async generateImage(id: string, request: PollinationsRequest): Promise<ImageGenerationResult> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[Pollinations] Generating: ${id} (attempt ${attempt}/${this.retryAttempts})`);

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result: PollinationsResponse = await response.json();

        if (result.success && result.image?.url) {
          console.log(`[Pollinations] ✅ Generated: ${id}`);
          return {
            id,
            prompt: request.prompt,
            url: result.image.url,
          };
        } else {
          const errorMsg = result.error?.message || 'Generation failed';
          throw new Error(errorMsg);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Pollinations] ❌ Attempt ${attempt} failed: ${errorMessage}`);

        if (attempt === this.retryAttempts) {
          return {
            id,
            prompt: request.prompt,
            url: null,
            error: errorMessage,
          };
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    return {
      id,
      prompt: request.prompt,
      url: null,
      error: 'Max retries exceeded',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // BATCH GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  async generateBatch(prompts: LeonardoPrompt[]): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    const results: ImageGenerationResult[] = [];

    console.log(`[Pollinations] Starting batch generation: ${prompts.length} images`);

    // Process in batches based on concurrency
    for (let i = 0; i < prompts.length; i += this.concurrency) {
      const batch = prompts.slice(i, i + this.concurrency);
      const batchNum = Math.floor(i / this.concurrency) + 1;
      const totalBatches = Math.ceil(prompts.length / this.concurrency);

      console.log(`[Pollinations] Batch ${batchNum}/${totalBatches}`);

      const batchResults = await Promise.all(
        batch.map(prompt => this.generateImage(prompt.id, this.mapToPollinationsRequest(prompt)))
      );

      results.push(...batchResults);

      // Rate limit pause between batches
      if (i + this.concurrency < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const success = results.filter(r => r.url !== null);
    const failed = results.filter(r => r.url === null);

    const imageUrlMap: Record<string, string> = {};
    for (const result of success) {
      if (result.url) {
        imageUrlMap[result.id] = result.url;
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(
      `[Pollinations] Batch complete: ${success.length}/${prompts.length} succeeded (${totalTime}ms)`
    );

    return { success, failed, imageUrlMap, totalTime };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // DIRECT URL GENERATION (No webhook needed)
  // ──────────────────────────────────────────────────────────────────────────────

  generateDirectUrl(request: PollinationsRequest): string {
    const encodedPrompt = encodeURIComponent(request.prompt);

    const params: string[] = [];
    params.push(`width=${request.width || 1024}`);
    params.push(`height=${request.height || 768}`);
    if (request.seed) params.push(`seed=${request.seed}`);
    if (request.model) params.push(`model=${request.model}`);
    if (request.nologo !== false) params.push('nologo=true');

    return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.join('&')}`;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MAPPING FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────────

  private mapToPollinationsRequest(prompt: LeonardoPrompt): PollinationsRequest {
    return {
      prompt: prompt.prompt,
      type: this.mapType(prompt.id),
      style: this.mapStyle(prompt.style),
      width: prompt.dimensions.width,
      height: prompt.dimensions.height,
      enhance: true,
      nologo: true,
      negative: prompt.negativePrompt,
    };
  }

  private mapType(id: string): PollinationsRequest['type'] {
    const idLower = id.toLowerCase();
    if (idLower.includes('hero')) return 'hero';
    if (idLower.includes('avatar')) return 'avatar';
    if (idLower.includes('product')) return 'product';
    if (idLower.includes('icon')) return 'icon';
    if (idLower.includes('logo')) return 'logo';
    if (idLower.includes('banner')) return 'banner';
    if (idLower.includes('background')) return 'background';
    if (idLower.includes('thumbnail')) return 'thumbnail';
    return 'illustration';
  }

  private mapStyle(style: LeonardoPrompt['style']): PollinationsRequest['style'] {
    const styleMap: Record<string, PollinationsRequest['style']> = {
      dynamic: 'cinematic',
      photorealistic: 'photorealistic',
      illustration: 'digital-art',
      minimalist: 'minimalist',
      abstract: 'digital-art',
      '3d': '3d-render',
    };
    return styleMap[style] || 'cinematic';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

let serviceInstance: PollinationsService | null = null;

export function getImageService(webhookUrl?: string): PollinationsService {
  if (!serviceInstance) {
    const url = webhookUrl || process.env.N8N_WEBHOOK_URL || process.env.POLLINATIONS_WEBHOOK_URL;
    if (!url) {
      throw new Error(
        'N8N_WEBHOOK_URL environment variable not set. Set it to your n8n webhook URL.'
      );
    }
    serviceInstance = new PollinationsService({ webhookUrl: url });
  }
  return serviceInstance;
}

export function createImageService(webhookUrl: string): PollinationsService {
  return new PollinationsService({ webhookUrl });
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const MAX_PROMPT_LENGTH = 2000; // URL safe limit
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 768;
const MIN_DIMENSION = 64;
const MAX_DIMENSION = 2048;

// ════════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ════════════════════════════════════════════════════════════════════════════════

function validatePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required and must be a string');
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    console.warn(
      `[Pollinations] Prompt truncated from ${trimmed.length} to ${MAX_PROMPT_LENGTH} chars`
    );
    return trimmed.substring(0, MAX_PROMPT_LENGTH);
  }

  return trimmed;
}

function validateDimension(value: number | undefined, defaultValue: number, name: string): number {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;

  const clamped = Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, Math.round(value)));
  if (clamped !== value) {
    console.warn(`[Pollinations] ${name} clamped from ${value} to ${clamped}`);
  }
  return clamped;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate a single image URL directly (no webhook needed)
 * Includes input validation and sanitization
 */
export function generateImageUrl(
  prompt: string,
  options: Partial<PollinationsRequest> = {}
): string {
  // Validate and sanitize inputs
  const validatedPrompt = validatePrompt(prompt);
  const width = validateDimension(options.width, DEFAULT_WIDTH, 'width');
  const height = validateDimension(options.height, DEFAULT_HEIGHT, 'height');

  const request: PollinationsRequest = {
    prompt: validatedPrompt,
    width,
    height,
    model: options.model || 'flux',
    nologo: options.nologo !== false,
    seed: options.seed,
  };

  const encodedPrompt = encodeURIComponent(request.prompt);
  const params: string[] = [];
  params.push(`width=${request.width}`);
  params.push(`height=${request.height}`);
  if (request.seed) params.push(`seed=${request.seed}`);
  params.push(`model=${request.model}`);
  if (request.nologo) params.push('nologo=true');

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.join('&')}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default PollinationsService;

/**
 * OLYMPUS 2.0 - Leonardo Image Generation Service
 *
 * High-level service for AI image generation in OLYMPUS workflows.
 * Wraps the Leonardo client with OLYMPUS-specific functionality.
 */

import {
  LeonardoClient,
  getLeonardoClient,
  GenerationRequest,
  GenerationStatus,
  GeneratedImage,
  LEONARDO_MODELS,
  PRESET_STYLES,
} from './client';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ImageGenerationTask {
  id: string;
  type: 'hero' | 'icon' | 'background' | 'illustration' | 'avatar' | 'product' | 'custom';
  prompt: string;
  context?: string;
  style?: string;
  size?: ImageSize;
  options?: Partial<GenerationRequest>;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface GeneratedAsset {
  taskId: string;
  type: string;
  images: GeneratedImage[];
  prompt: string;
  generationId: string;
  cost: number;
  generatedAt: string;
}

export interface ImageBatchResult {
  success: boolean;
  assets: GeneratedAsset[];
  totalCost: number;
  totalTime: number;
  errors: { taskId: string; error: string }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const IMAGE_SIZE_PRESETS: Record<string, ImageSize> = {
  // Square
  square_small: { width: 512, height: 512 },
  square_medium: { width: 768, height: 768 },
  square_large: { width: 1024, height: 1024 },

  // Landscape (16:9)
  landscape_hd: { width: 1360, height: 768 },
  landscape_wide: { width: 1536, height: 640 },

  // Portrait
  portrait_tall: { width: 768, height: 1024 },
  portrait_story: { width: 768, height: 1360 },

  // Web-specific
  hero_banner: { width: 1536, height: 640 },
  og_image: { width: 1200, height: 630 },
  thumbnail: { width: 512, height: 512 },
  icon: { width: 256, height: 256 },
  avatar: { width: 512, height: 512 },
};

const TYPE_CONFIGS: Record<string, Partial<GenerationRequest>> = {
  hero: {
    modelId: LEONARDO_MODELS.PHOENIX,
    presetStyle: PRESET_STYLES.CINEMATIC,
    highResolution: true,
    alchemy: true,
    guidance: 8,
  },
  icon: {
    modelId: LEONARDO_MODELS.VISION_XL,
    presetStyle: PRESET_STYLES.ILLUSTRATION,
    guidance: 10,
  },
  background: {
    modelId: LEONARDO_MODELS.PHOENIX,
    presetStyle: PRESET_STYLES.ENVIRONMENT,
    highResolution: true,
  },
  illustration: {
    modelId: LEONARDO_MODELS.VISION_XL,
    presetStyle: PRESET_STYLES.ILLUSTRATION,
  },
  avatar: {
    modelId: LEONARDO_MODELS.PHOENIX,
    presetStyle: PRESET_STYLES.PHOTOGRAPHY,
    photoReal: true,
    photoRealVersion: 'v2',
  },
  product: {
    modelId: LEONARDO_MODELS.PHOENIX,
    presetStyle: PRESET_STYLES.STOCKPHOTO,
    photoReal: true,
    photoRealVersion: 'v2',
  },
  custom: {
    modelId: LEONARDO_MODELS.PHOENIX,
    presetStyle: PRESET_STYLES.NONE,
  },
};

const STYLE_PROMPTS: Record<string, string> = {
  modern: 'modern minimalist design, clean lines, professional',
  playful: 'colorful, fun, playful design, rounded shapes',
  corporate: 'professional corporate style, business aesthetic',
  tech: 'futuristic technology style, digital, sci-fi elements',
  organic: 'natural organic shapes, earthy tones, botanical elements',
  luxury: 'luxury premium aesthetic, elegant, high-end',
  retro: 'retro vintage style, nostalgic, classic design',
  glassmorphism: 'glassmorphism style, frosted glass effect, translucent',
};

// ════════════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION SERVICE CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class ImageGenerationService {
  private client: LeonardoClient;

  constructor(client?: LeonardoClient) {
    this.client = client || getLeonardoClient();
  }

  /**
   * Build an enhanced prompt from task definition
   */
  private buildPrompt(task: ImageGenerationTask): string {
    let prompt = task.prompt;

    // Add style enhancement
    if (task.style && STYLE_PROMPTS[task.style]) {
      prompt = `${prompt}, ${STYLE_PROMPTS[task.style]}`;
    }

    // Add context if provided
    if (task.context) {
      prompt = `${prompt}. Context: ${task.context}`;
    }

    // Add type-specific enhancements
    switch (task.type) {
      case 'hero':
        prompt = `${prompt}, hero image, high quality, detailed, 8k`;
        break;
      case 'icon':
        prompt = `${prompt}, icon design, simple, clear, centered`;
        break;
      case 'background':
        prompt = `${prompt}, seamless background, subtle, non-distracting`;
        break;
      case 'avatar':
        prompt = `${prompt}, portrait, headshot, professional lighting`;
        break;
      case 'product':
        prompt = `${prompt}, product photography, studio lighting, white background`;
        break;
    }

    return prompt;
  }

  /**
   * Get the appropriate size for a task
   */
  private getSize(task: ImageGenerationTask): ImageSize {
    if (task.size) return task.size;

    // Default sizes by type
    const defaultSizes: Record<string, string> = {
      hero: 'hero_banner',
      icon: 'icon',
      background: 'landscape_wide',
      illustration: 'square_large',
      avatar: 'avatar',
      product: 'square_large',
      custom: 'square_large',
    };

    return IMAGE_SIZE_PRESETS[defaultSizes[task.type]] || IMAGE_SIZE_PRESETS.square_large;
  }

  /**
   * Generate a single image asset
   */
  async generateImage(task: ImageGenerationTask): Promise<GeneratedAsset> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(task);
    const size = this.getSize(task);
    const typeConfig = TYPE_CONFIGS[task.type] || TYPE_CONFIGS.custom;

    const request: GenerationRequest = {
      prompt,
      width: size.width,
      height: size.height,
      numImages: 1,
      ...typeConfig,
      ...task.options,
    };

    console.log(`[IMAGE SERVICE] Generating ${task.type}: "${task.prompt.substring(0, 50)}..."`);

    try {
      // Start generation and wait for completion
      const response = await this.client.generate(request);
      const generationId = response.sdGenerationJob.generationId;
      const cost = response.sdGenerationJob.apiCreditCost;

      const status = await this.client.waitForGeneration(generationId);

      const asset: GeneratedAsset = {
        taskId: task.id,
        type: task.type,
        images: status.generatedImages,
        prompt: status.prompt,
        generationId: status.generationId,
        cost,
        generatedAt: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      console.log(
        `[IMAGE SERVICE] Generated ${task.type} in ${duration}ms (cost: ${cost} credits)`
      );

      return asset;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[IMAGE SERVICE] Failed to generate ${task.type}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Generate multiple images in batch
   */
  async generateBatch(tasks: ImageGenerationTask[]): Promise<ImageBatchResult> {
    const startTime = Date.now();
    const assets: GeneratedAsset[] = [];
    const errors: { taskId: string; error: string }[] = [];
    let totalCost = 0;

    console.log(`[IMAGE SERVICE] Starting batch generation of ${tasks.length} images`);

    for (const task of tasks) {
      try {
        const asset = await this.generateImage(task);
        assets.push(asset);
        totalCost += asset.cost;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ taskId: task.id, error: errorMessage });
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`[IMAGE SERVICE] Batch complete: ${assets.length}/${tasks.length} successful`);
    console.log(`[IMAGE SERVICE] Total cost: ${totalCost} credits, Time: ${totalTime}ms`);

    return {
      success: errors.length === 0,
      assets,
      totalCost,
      totalTime,
      errors,
    };
  }

  /**
   * Generate a hero image for a landing page
   */
  async generateHeroImage(
    description: string,
    style?: string,
    options?: Partial<GenerationRequest>
  ): Promise<GeneratedAsset> {
    return this.generateImage({
      id: `hero-${Date.now()}`,
      type: 'hero',
      prompt: description,
      style,
      options,
    });
  }

  /**
   * Generate an icon
   */
  async generateIcon(
    description: string,
    style?: string,
    options?: Partial<GenerationRequest>
  ): Promise<GeneratedAsset> {
    return this.generateImage({
      id: `icon-${Date.now()}`,
      type: 'icon',
      prompt: description,
      style,
      size: IMAGE_SIZE_PRESETS.icon,
      options,
    });
  }

  /**
   * Generate a background
   */
  async generateBackground(
    description: string,
    style?: string,
    options?: Partial<GenerationRequest>
  ): Promise<GeneratedAsset> {
    return this.generateImage({
      id: `bg-${Date.now()}`,
      type: 'background',
      prompt: description,
      style,
      options,
    });
  }

  /**
   * Generate an avatar/profile image
   */
  async generateAvatar(
    description: string,
    style?: string,
    options?: Partial<GenerationRequest>
  ): Promise<GeneratedAsset> {
    return this.generateImage({
      id: `avatar-${Date.now()}`,
      type: 'avatar',
      prompt: description,
      style,
      options,
    });
  }

  /**
   * Generate a product image
   */
  async generateProductImage(
    description: string,
    style?: string,
    options?: Partial<GenerationRequest>
  ): Promise<GeneratedAsset> {
    return this.generateImage({
      id: `product-${Date.now()}`,
      type: 'product',
      prompt: description,
      style,
      options,
    });
  }

  /**
   * Get available tokens/credits
   */
  async getAvailableCredits(): Promise<number> {
    const userInfo = await this.client.getUserInfo();
    return userInfo.user.apiSubscriptionTokens + userInfo.user.apiPaidTokens;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════════

let serviceInstance: ImageGenerationService | null = null;

export function getImageService(): ImageGenerationService {
  if (!serviceInstance) {
    serviceInstance = new ImageGenerationService();
  }
  return serviceInstance;
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export { IMAGE_SIZE_PRESETS, TYPE_CONFIGS, STYLE_PROMPTS, LEONARDO_MODELS, PRESET_STYLES };

export default ImageGenerationService;

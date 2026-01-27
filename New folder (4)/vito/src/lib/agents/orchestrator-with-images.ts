/**
 * OLYMPUS 2.0 - Orchestrator with Image Generation
 *
 * Extended orchestrator that coordinates code generation (WIRE)
 * with AI image generation (Pollinations.ai - FREE unlimited).
 */

import {
  PollinationsService,
  getImageService,
  generateImageUrl,
  type PollinationsRequest,
  type ImageGenerationResult,
  type BatchGenerationResult,
} from '../integrations/image-generation/pollinations-service';
import { wireGenerator } from './stress-test/wire-adapter';
import type { LeonardoPrompt } from './registry/artist';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface PageGenerationRequest {
  type: 'landing' | 'dashboard' | 'auth' | 'settings' | 'list' | 'detail' | 'custom';
  prompt: string;
  includeImages?: boolean;
  imageRequests?: ImageRequest[];
  style?: PollinationsRequest['style'];
  metadata?: Record<string, unknown>;
}

export interface ImageRequest {
  type: 'hero' | 'icon' | 'background' | 'illustration' | 'avatar' | 'product' | 'custom';
  description: string;
  varName?: string;
  width?: number;
  height?: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  type: string;
  prompt: string;
}

export interface PageGenerationResult {
  success: boolean;
  code: string;
  images: GeneratedImage[];
  metadata: {
    codeGenerationTime: number;
    imageGenerationTime: number;
    totalTime: number;
    imageCount: number;
    provider: string;
  };
  errors: string[];
}

export interface OrchestratorConfig {
  enableImages: boolean;
  imageStyle?: PollinationsRequest['style'];
  webhookUrl?: string;
  useDirectUrls?: boolean; // Generate URLs directly without webhook
}

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableImages: true,
  imageStyle: 'cinematic',
  useDirectUrls: true, // Default to direct URLs (no webhook needed)
};

// ════════════════════════════════════════════════════════════════════════════════
// IMAGE REQUEST INFERENCE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Infer image requests from page type and prompt
 */
function inferImageRequests(
  pageType: string,
  prompt: string
): ImageRequest[] {
  const requests: ImageRequest[] = [];

  // Always add a hero image for landing pages
  if (pageType === 'landing') {
    requests.push({
      type: 'hero',
      description: `Hero image for ${prompt}`,
      varName: 'heroImage',
      width: 1920,
      height: 1080,
    });
  }

  // Add background for dashboards
  if (pageType === 'dashboard') {
    requests.push({
      type: 'background',
      description: 'Subtle dashboard background pattern, abstract, minimal',
      varName: 'dashboardBg',
      width: 1920,
      height: 1080,
    });
  }

  // Add illustration for empty states
  if (['list', 'dashboard', 'detail'].includes(pageType)) {
    requests.push({
      type: 'illustration',
      description: 'Friendly illustration for empty state, minimal, modern',
      varName: 'emptyStateIllustration',
      width: 800,
      height: 600,
    });
  }

  // Check prompt for specific image needs
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes('avatar') || promptLower.includes('profile') || promptLower.includes('user')) {
    requests.push({
      type: 'avatar',
      description: 'Professional avatar placeholder, friendly face',
      varName: 'defaultAvatar',
      width: 512,
      height: 512,
    });
  }

  if (promptLower.includes('product') || promptLower.includes('shop') || promptLower.includes('store')) {
    requests.push({
      type: 'product',
      description: 'Product photography placeholder, white background',
      varName: 'productPlaceholder',
      width: 1024,
      height: 1024,
    });
  }

  if (promptLower.includes('icon') || promptLower.includes('feature')) {
    requests.push({
      type: 'icon',
      description: 'Feature icon, minimal flat design',
      varName: 'featureIcon',
      width: 256,
      height: 256,
    });
  }

  return requests;
}

// ════════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class OrchestratorWithImages {
  private config: OrchestratorConfig;
  private imageService: PollinationsService | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Only initialize service if using webhook (not direct URLs)
    if (!this.config.useDirectUrls && this.config.webhookUrl) {
      this.imageService = getImageService(this.config.webhookUrl);
    }
  }

  /**
   * Generate a complete page with code and images
   */
  async generatePage(request: PageGenerationRequest): Promise<PageGenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let code = '';
    let images: GeneratedImage[] = [];
    let imageGenerationTime = 0;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      OLYMPUS ORCHESTRATOR + POLLINATIONS (FREE!)          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Page Type: ${request.type.padEnd(47)}║`);
    console.log(`║ Include Images: ${(request.includeImages ?? this.config.enableImages).toString().padEnd(42)}║`);
    console.log(`║ Mode: ${(this.config.useDirectUrls ? 'Direct URLs' : 'Webhook').padEnd(52)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Step 1: Generate code with WIRE
    console.log('[ORCHESTRATOR] Step 1: Generating code with WIRE...');
    const codeStartTime = Date.now();

    try {
      code = await this.generateCode(request);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Code generation failed: ${errorMsg}`);
      console.error('[ORCHESTRATOR] Code generation failed:', errorMsg);
    }

    const codeGenerationTime = Date.now() - codeStartTime;
    console.log(`[ORCHESTRATOR] Code generated in ${codeGenerationTime}ms`);

    // Step 2: Generate images (if enabled)
    const shouldGenerateImages = request.includeImages ?? this.config.enableImages;

    if (shouldGenerateImages && code) {
      console.log('[ORCHESTRATOR] Step 2: Generating images with Pollinations (FREE!)...');
      const imageStartTime = Date.now();

      try {
        images = await this.generateImages(request);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Image generation failed: ${errorMsg}`);
        console.error('[ORCHESTRATOR] Image generation failed:', errorMsg);
      }

      imageGenerationTime = Date.now() - imageStartTime;
      console.log(`[ORCHESTRATOR] Images generated in ${imageGenerationTime}ms`);
    }

    // Step 3: Inject image URLs into code
    if (images.length > 0 && code) {
      console.log('[ORCHESTRATOR] Step 3: Injecting image URLs into code...');
      code = this.injectImages(code, images);
    }

    const totalTime = Date.now() - startTime;

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  GENERATION COMPLETE                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Code Size: ${code.length.toString().padEnd(47)}║`);
    console.log(`║ Images Generated: ${images.length.toString().padEnd(40)}║`);
    console.log(`║ Cost: FREE! (Pollinations.ai)${' '.repeat(28)}║`);
    console.log(`║ Total Time: ${(totalTime + 'ms').padEnd(46)}║`);
    console.log(`║ Errors: ${errors.length.toString().padEnd(50)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    return {
      success: errors.length === 0 && code.length > 0,
      code,
      images,
      metadata: {
        codeGenerationTime,
        imageGenerationTime,
        totalTime,
        imageCount: images.length,
        provider: 'Pollinations.ai (FREE)',
      },
      errors,
    };
  }

  /**
   * Generate code using WIRE agent
   */
  private async generateCode(request: PageGenerationRequest): Promise<string> {
    let enhancedPrompt = request.prompt;

    if (request.imageRequests && request.imageRequests.length > 0) {
      enhancedPrompt += '\n\nNote: Include placeholder variables for images:';
      request.imageRequests.forEach((img, i) => {
        const varName = img.varName || `image${i + 1}`;
        enhancedPrompt += `\n- const ${varName}Url = '/placeholder-${img.type}.jpg'; // Will be replaced with AI-generated image`;
      });
    }

    return wireGenerator(enhancedPrompt);
  }

  /**
   * Generate images using Pollinations
   */
  private async generateImages(request: PageGenerationRequest): Promise<GeneratedImage[]> {
    let imageRequests = request.imageRequests;

    if (!imageRequests || imageRequests.length === 0) {
      imageRequests = inferImageRequests(request.type, request.prompt);
    }

    if (imageRequests.length === 0) {
      return [];
    }

    const images: GeneratedImage[] = [];
    const style = request.style || this.config.imageStyle;

    // Generate images
    for (const req of imageRequests) {
      const id = `${req.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      if (this.config.useDirectUrls) {
        // Direct URL generation (instant, no webhook needed)
        const url = generateImageUrl(req.description, {
          width: req.width || 1024,
          height: req.height || 768,
          model: 'flux',
          nologo: true,
        });

        images.push({
          id,
          url,
          type: req.type,
          prompt: req.description,
        });

        console.log(`[Pollinations] Generated URL: ${req.type}`);
      } else if (this.imageService) {
        // Webhook-based generation
        const result = await this.imageService.generateImage(id, {
          prompt: req.description,
          type: req.type as PollinationsRequest['type'],
          style,
          width: req.width || 1024,
          height: req.height || 768,
          enhance: true,
          nologo: true,
        });

        if (result.url) {
          images.push({
            id,
            url: result.url,
            type: req.type,
            prompt: req.description,
          });
        }
      }
    }

    return images;
  }

  /**
   * Inject generated image URLs into code
   */
  private injectImages(code: string, images: GeneratedImage[]): string {
    let modifiedCode = code;

    images.forEach((img) => {
      const patterns = [
        new RegExp(`('/placeholder-${img.type}\\.(?:jpg|png|webp)')`, 'gi'),
        new RegExp(`(src=")/placeholder-${img.type}\\.(?:jpg|png|webp)(")`, 'gi'),
        new RegExp(`(url\\()/placeholder-${img.type}\\.(?:jpg|png|webp)(\\))`, 'gi'),
      ];

      patterns.forEach((pattern) => {
        modifiedCode = modifiedCode.replace(pattern, (match, prefix, suffix) => {
          if (suffix) {
            return `${prefix}${img.url}${suffix}`;
          }
          return `'${img.url}'`;
        });
      });
    });

    return modifiedCode;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════════

let orchestratorInstance: OrchestratorWithImages | null = null;

export function getOrchestrator(config?: Partial<OrchestratorConfig>): OrchestratorWithImages {
  if (!orchestratorInstance || config) {
    orchestratorInstance = new OrchestratorWithImages(config);
  }
  return orchestratorInstance;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Generate a landing page with hero image
 */
export async function generateLandingPage(
  prompt: string,
  options?: Partial<PageGenerationRequest>
): Promise<PageGenerationResult> {
  const orchestrator = getOrchestrator();
  return orchestrator.generatePage({
    type: 'landing',
    prompt,
    includeImages: true,
    ...options,
  });
}

/**
 * Generate a dashboard with background
 */
export async function generateDashboard(
  prompt: string,
  options?: Partial<PageGenerationRequest>
): Promise<PageGenerationResult> {
  const orchestrator = getOrchestrator();
  return orchestrator.generatePage({
    type: 'dashboard',
    prompt,
    includeImages: true,
    ...options,
  });
}

/**
 * Generate code only (no images)
 */
export async function generateCodeOnly(
  prompt: string,
  pageType: PageGenerationRequest['type'] = 'custom'
): Promise<PageGenerationResult> {
  const orchestrator = getOrchestrator();
  return orchestrator.generatePage({
    type: pageType,
    prompt,
    includeImages: false,
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default OrchestratorWithImages;

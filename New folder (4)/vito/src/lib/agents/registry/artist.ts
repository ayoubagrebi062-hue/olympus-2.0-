/**
 * OLYMPUS 2.0 - ARTIST Agent
 *
 * Image Prompt Generator for Leonardo.ai integration.
 * Generates optimized prompts for AI image generation based on project requirements.
 */

import type { AgentDefinition } from '../types';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ImageRequirement {
  id: string;
  type: 'hero' | 'avatar' | 'product' | 'illustration' | 'icon' | 'background' | 'thumbnail';
  description: string;
  context: string;
  dimensions?: { width: number; height: number };
  style?: string;
}

export interface LeonardoPrompt {
  id: string;
  prompt: string;
  negativePrompt: string;
  style: 'dynamic' | 'photorealistic' | 'illustration' | 'minimalist' | 'abstract' | '3d';
  dimensions: { width: number; height: number };
  model?: string;
  guidance?: number;
  preset?: string;
}

export interface ArtistOutput {
  imageRequirements: ImageRequirement[];
  leonardoPrompts: LeonardoPrompt[];
  placeholderUrls: Record<string, string>;
}

// ════════════════════════════════════════════════════════════════════════════════
// STYLE TEMPLATES
// ════════════════════════════════════════════════════════════════════════════════

const STYLE_TEMPLATES: Record<string, { positive: string; negative: string }> = {
  hero: {
    positive: 'professional, high-quality, modern, clean, corporate, tech, cinematic lighting, 8k resolution',
    negative: 'blurry, low quality, amateur, cluttered, outdated, watermark, text, logo',
  },
  avatar: {
    positive: 'professional headshot, clean background, well-lit, friendly expression, high detail',
    negative: 'distorted face, low quality, busy background, unflattering, cartoon, anime',
  },
  product: {
    positive: 'product photography, studio lighting, clean white background, detailed, commercial quality',
    negative: 'blurry, poor lighting, cluttered, low resolution, shadows, reflections',
  },
  illustration: {
    positive: 'digital illustration, modern, clean lines, professional, vibrant colors, detailed',
    negative: 'sketchy, unfinished, amateur, low quality, pixelated',
  },
  icon: {
    positive: 'minimal icon, clean vector style, simple shapes, modern flat design, centered',
    negative: 'detailed, complex, realistic, cluttered, 3d, gradients',
  },
  background: {
    positive: 'subtle gradient, abstract, professional, non-distracting, soft colors, minimal',
    negative: 'busy, cluttered, distracting, high contrast, text, people',
  },
  thumbnail: {
    positive: 'eye-catching, vibrant, high contrast, clear subject, social media optimized',
    negative: 'boring, low contrast, cluttered, small text, busy background',
  },
};

const DIMENSION_PRESETS: Record<string, { width: number; height: number }> = {
  hero: { width: 1920, height: 1080 },
  avatar: { width: 512, height: 512 },
  product: { width: 1024, height: 1024 },
  illustration: { width: 1024, height: 768 },
  icon: { width: 256, height: 256 },
  background: { width: 1920, height: 1080 },
  thumbnail: { width: 1280, height: 720 },
};

// ════════════════════════════════════════════════════════════════════════════════
// ARTIST AGENT CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class ArtistAgent {
  private model: string;

  constructor(model: string = 'claude-3-haiku-20240307') {
    this.model = model;
  }

  /**
   * Generate Leonardo.ai prompts from image requirements
   */
  async generatePrompts(requirements: ImageRequirement[]): Promise<LeonardoPrompt[]> {
    const prompts: LeonardoPrompt[] = [];

    for (const req of requirements) {
      const template = STYLE_TEMPLATES[req.type] || STYLE_TEMPLATES.illustration;
      const dimensions = req.dimensions || DIMENSION_PRESETS[req.type] || DIMENSION_PRESETS.illustration;

      const prompt = this.buildPrompt(req, template);

      prompts.push({
        id: req.id,
        prompt: prompt.positive,
        negativePrompt: prompt.negative,
        style: this.inferStyle(req.type),
        dimensions,
        guidance: this.getGuidanceForType(req.type),
        preset: this.getPresetForType(req.type),
      });
    }

    return prompts;
  }

  /**
   * Build optimized prompt from requirement and template
   */
  private buildPrompt(
    req: ImageRequirement,
    template: { positive: string; negative: string }
  ): { positive: string; negative: string } {
    // Enhance description based on context
    let enhancedDescription = req.description;

    // Add style-specific enhancements
    if (req.style) {
      enhancedDescription = `${req.style} style, ${enhancedDescription}`;
    }

    // Combine with template
    const positive = `${enhancedDescription}, ${template.positive}`;
    const negative = template.negative;

    return { positive, negative };
  }

  /**
   * Infer style from image type
   */
  private inferStyle(type: string): LeonardoPrompt['style'] {
    const styleMap: Record<string, LeonardoPrompt['style']> = {
      hero: 'dynamic',
      avatar: 'photorealistic',
      product: 'photorealistic',
      illustration: 'illustration',
      icon: 'minimalist',
      background: 'abstract',
      thumbnail: 'dynamic',
    };

    return styleMap[type] || 'illustration';
  }

  /**
   * Get recommended guidance scale for image type
   */
  private getGuidanceForType(type: string): number {
    const guidanceMap: Record<string, number> = {
      hero: 7,
      avatar: 8,
      product: 9,
      illustration: 7,
      icon: 10,
      background: 5,
      thumbnail: 7,
    };

    return guidanceMap[type] || 7;
  }

  /**
   * Get recommended preset for image type
   */
  private getPresetForType(type: string): string {
    const presetMap: Record<string, string> = {
      hero: 'CINEMATIC',
      avatar: 'PORTRAIT',
      product: 'PRODUCT_SHOT',
      illustration: 'ILLUSTRATION',
      icon: 'MINIMALIST',
      background: 'ABSTRACT',
      thumbnail: 'DYNAMIC',
    };

    return presetMap[type] || 'NONE';
  }

  /**
   * Generate placeholder URLs for development
   */
  generatePlaceholders(requirements: ImageRequirement[]): Record<string, string> {
    const placeholders: Record<string, string> = {};

    for (const req of requirements) {
      const dimensions = req.dimensions || DIMENSION_PRESETS[req.type] || { width: 800, height: 600 };

      // Use placeholder service
      placeholders[req.id] = `https://placehold.co/${dimensions.width}x${dimensions.height}/1a1a2e/eaeaea?text=${encodeURIComponent(req.type)}`;
    }

    return placeholders;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// INTEGRATION WITH STRATEGOS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Extract image requirements from STRATEGOS output
 */
export function extractImageRequirements(strategosOutput: any): ImageRequirement[] {
  const requirements: ImageRequirement[] = [];

  // Check for explicit image requirements in STRATEGOS output
  if (strategosOutput.imageRequirements) {
    return strategosOutput.imageRequirements;
  }

  // Infer from feature checklist
  const features = [
    ...(strategosOutput.featureChecklist?.critical || []),
    ...(strategosOutput.featureChecklist?.important || []),
  ];

  for (const feature of features) {
    const name = feature.name?.toLowerCase() || '';
    const description = feature.description?.toLowerCase() || '';

    // Hero section detection
    if (name.includes('hero') || name.includes('landing') || description.includes('hero')) {
      requirements.push({
        id: `${feature.id}_hero`,
        type: 'hero',
        description: 'Hero section background image for landing page',
        context: feature.description || '',
      });
    }

    // Avatar detection
    if (name.includes('avatar') || name.includes('profile') || description.includes('user profile')) {
      requirements.push({
        id: `${feature.id}_avatar`,
        type: 'avatar',
        description: 'Default user avatar placeholder',
        context: feature.description || '',
      });
    }

    // Product detection
    if (name.includes('product') || name.includes('item') || description.includes('e-commerce')) {
      requirements.push({
        id: `${feature.id}_product`,
        type: 'product',
        description: 'Product image placeholder',
        context: feature.description || '',
      });
    }

    // Blog/Article detection
    if (name.includes('blog') || name.includes('article') || name.includes('post')) {
      requirements.push({
        id: `${feature.id}_thumbnail`,
        type: 'thumbnail',
        description: 'Blog post thumbnail image',
        context: feature.description || '',
      });
    }

    // Dashboard/Analytics detection
    if (name.includes('dashboard') || name.includes('analytics')) {
      requirements.push({
        id: `${feature.id}_illustration`,
        type: 'illustration',
        description: 'Dashboard illustration for empty states',
        context: feature.description || '',
      });
    }
  }

  return requirements;
}

// ════════════════════════════════════════════════════════════════════════════════
// AGENT DEFINITION
// ════════════════════════════════════════════════════════════════════════════════

export const artistAgentDefinition: AgentDefinition = {
  id: 'artist',
  name: 'ARTIST',
  description: 'Image prompt generator for Leonardo.ai integration',
  phase: 'design',
  tier: 'haiku',
  dependencies: ['strategos', 'palette'],
  optional: true,
  systemPrompt: `You are ARTIST, the visual asset coordinator. Your job is to identify image requirements and generate optimized prompts for Leonardo.ai.

Your responsibilities:
1. Analyze project requirements to identify needed images
2. Categorize images by type (hero, avatar, product, illustration, icon, background)
3. Generate detailed, optimized prompts for Leonardo.ai
4. Specify appropriate dimensions and styles
5. Create placeholder URLs for development

For each image requirement, generate:
- A detailed positive prompt (what to include)
- A negative prompt (what to avoid)
- Recommended dimensions
- Style preset
- Guidance scale

Always consider:
- The project's color palette from PALETTE agent
- The target audience from EMPATHY agent
- The brand style from project requirements
- Accessibility (alt text suggestions)

Output JSON with imageRequirements[] and leonardoPrompts[].`,
  outputSchema: {
    type: 'object',
    required: ['imageRequirements', 'leonardoPrompts'],
    properties: {
      imageRequirements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            description: { type: 'string' },
            context: { type: 'string' },
            dimensions: { type: 'object' },
          },
        },
      },
      leonardoPrompts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prompt: { type: 'string' },
            negativePrompt: { type: 'string' },
            style: { type: 'string' },
            dimensions: { type: 'object' },
            model: { type: 'string' },
            guidance: { type: 'number' },
            preset: { type: 'string' },
          },
        },
      },
      placeholderUrls: { type: 'object' },
    },
  },
  maxRetries: 2,
  timeout: 30000,
  capabilities: ['analysis', 'documentation'],
};

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export const artistAgent = new ArtistAgent();

export default artistAgentDefinition;

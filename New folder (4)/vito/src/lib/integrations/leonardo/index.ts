/**
 * OLYMPUS 2.0 - Leonardo.ai Integration
 *
 * Complete integration with Leonardo.ai for AI image generation.
 *
 * @module leonardo
 */

// Client exports
export {
  LeonardoClient,
  getLeonardoClient,
  LEONARDO_MODELS,
  PRESET_STYLES,
  DEFAULT_CONFIG,
} from './client';

export type {
  LeonardoConfig,
  GenerationRequest,
  GenerationResponse,
  GenerationStatus,
  GeneratedImage,
  ModelInfo,
  UserInfo,
} from './client';

// Service exports
export {
  ImageGenerationService,
  getImageService,
  IMAGE_SIZE_PRESETS,
  TYPE_CONFIGS,
  STYLE_PROMPTS,
} from './image-service';

export type {
  ImageGenerationTask,
  ImageSize,
  GeneratedAsset,
  ImageBatchResult,
} from './image-service';

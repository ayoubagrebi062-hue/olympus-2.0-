/**
 * OLYMPUS 2.0 - Image Generation Integration
 *
 * Uses Pollinations.ai (FREE, unlimited) via n8n webhook.
 */

export {
  PollinationsService,
  getImageService,
  createImageService,
  generateImageUrl,
} from './pollinations-service';

export type {
  PollinationsRequest,
  PollinationsResponse,
  ImageGenerationResult,
  BatchGenerationResult,
} from './pollinations-service';

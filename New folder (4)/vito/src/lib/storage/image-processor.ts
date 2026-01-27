/**
 * OLYMPUS 2.0 - Image Processor
 * =============================
 * Image optimization, variant generation, and metadata extraction using Sharp.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbFile,
  ImageVariant,
  ImageMetadata,
  ProcessResult,
  OptimizeOptions,
  OptimizeResult,
  ImageProcessor,
  StorageBucket,
} from './types';
import { DEFAULT_IMAGE_VARIANTS, AVATAR_VARIANTS, getVariantPath } from './constants';
import {
  FileNotFoundError,
  FileProcessingError,
  VariantGenerationError,
  ProviderError,
} from './errors';
import { StorageClient } from './supabase-client';

// ============================================================
// TYPES
// ============================================================

interface ImageProcessorDependencies {
  storageClient: StorageClient;
  supabase: SupabaseClient;
}

interface SharpInstance {
  resize(width?: number, height?: number, options?: {
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    withoutEnlargement?: boolean;
    position?: string;
    background?: { r: number; g: number; b: number; alpha: number };
  }): SharpInstance;
  webp(options?: { quality?: number; lossless?: boolean }): SharpInstance;
  avif(options?: { quality?: number; lossless?: boolean }): SharpInstance;
  jpeg(options?: { quality?: number; progressive?: boolean; mozjpeg?: boolean }): SharpInstance;
  png(options?: { compressionLevel?: number; progressive?: boolean }): SharpInstance;
  toBuffer(): Promise<Buffer>;
  toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number; channels: number; format: string } }>;
  metadata(): Promise<SharpMetadata>;
  rotate(angle?: number): SharpInstance;
  blur(sigma?: number): SharpInstance;
  sharpen(options?: { sigma?: number }): SharpInstance;
  grayscale(): SharpInstance;
  tint(rgb: { r: number; g: number; b: number }): SharpInstance;
  flip(): SharpInstance;
  flop(): SharpInstance;
  trim(options?: { threshold?: number }): SharpInstance;
  raw(): SharpInstance;
  composite(images: Array<{
    input: Buffer | string;
    top?: number;
    left?: number;
    blend?: string;
  }>): SharpInstance;
}

interface SharpMetadata {
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  chromaSubsampling?: string;
  isProgressive?: boolean;
  pages?: number;
  pageHeight?: number;
  loop?: number;
  delay?: number[];
  hasProfile?: boolean;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: Buffer;
  icc?: Buffer;
  iptc?: Buffer;
  xmp?: Buffer;
}

type SharpModule = {
  default: (input?: Buffer | string) => SharpInstance;
};

// ============================================================
// IMAGE PROCESSOR IMPLEMENTATION
// ============================================================

export class ImageProcessorImpl implements ImageProcessor {
  private storage: StorageClient;
  private supabase: SupabaseClient;
  private sharpModule: SharpModule | null = null;

  constructor(deps: ImageProcessorDependencies) {
    this.storage = deps.storageClient;
    this.supabase = deps.supabase;
  }

  /**
   * Lazy load Sharp module
   */
  private async getSharp(): Promise<SharpModule> {
    if (!this.sharpModule) {
      this.sharpModule = await import('sharp') as SharpModule;
    }
    return this.sharpModule;
  }

  // ============================================================
  // MAIN PROCESSING
  // ============================================================

  /**
   * Process an uploaded image - generate all variants
   */
  async process(fileId: string): Promise<ProcessResult> {
    const file = await this.getFileRecord(fileId);

    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (!file.mime_type.startsWith('image/')) {
      throw new FileProcessingError(fileId, 'Not an image file');
    }

    try {
      // 1. Download original
      const originalBuffer = await this.storage.download(
        file.bucket as StorageBucket,
        file.path
      );

      // 2. Extract metadata
      const metadata = await this.extractMetadata(originalBuffer);

      // 3. Auto-rotate based on EXIF orientation
      const rotatedBuffer = await this.autoRotate(originalBuffer);

      // 4. Determine which variants to generate
      const variants = this.selectVariants(file, metadata);

      // 5. Generate variants
      const variantPaths: Record<string, string> = {};

      for (const variant of variants) {
        try {
          const variantPath = await this.generateVariant(
            file,
            rotatedBuffer,
            variant
          );
          variantPaths[variant.name] = variantPath;
        } catch (error) {
          console.error(`Failed to generate variant ${variant.name}:`, error);
          // Continue with other variants
        }
      }

      // 6. Update file record
      await this.updateFileRecord(fileId, {
        status: 'ready',
        width: metadata.width,
        height: metadata.height,
        variants: variantPaths,
        metadata: {
          ...file.metadata,
          ...this.serializeMetadata(metadata),
        },
      });

      return {
        success: true,
        variants: variantPaths,
        metadata,
      };

    } catch (error) {
      // Update file with error status
      await this.updateFileRecord(fileId, {
        status: 'failed',
        processing_error: (error as Error).message,
      });

      throw new FileProcessingError(fileId, (error as Error).message, error as Error);
    }
  }

  /**
   * Generate a specific variant
   */
  async generateVariant(
    file: DbFile | { bucket: string; path: string },
    buffer: Buffer,
    variant: ImageVariant
  ): Promise<string> {
    const sharp = await this.getSharp();

    try {
      let pipeline = sharp.default(buffer);

      // Resize if dimensions specified
      if (variant.width || variant.height) {
        pipeline = pipeline.resize(variant.width, variant.height, {
          fit: variant.fit || 'inside',
          withoutEnlargement: true,
          position: 'center',
        });
      }

      // Convert to target format
      const format = variant.format || 'webp';
      const quality = variant.quality || 85;

      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 9, progressive: true });
          break;
      }

      // Generate output
      const outputBuffer = await pipeline.toBuffer();

      // Calculate variant path
      const variantPath = getVariantPath(file.path, variant.name, format);

      // Upload variant
      await this.storage.upload(
        file.bucket as StorageBucket,
        variantPath,
        outputBuffer,
        {
          contentType: `image/${format}`,
          cacheControl: 'public, max-age=31536000, immutable',
        }
      );

      return variantPath;

    } catch (error) {
      throw new VariantGenerationError(
        'id' in file ? (file as DbFile).id : 'unknown',
        variant.name,
        (error as Error).message,
        error as Error
      );
    }
  }

  /**
   * Optimize an image without generating variants
   */
  async optimize(fileId: string, options: OptimizeOptions = {}): Promise<OptimizeResult> {
    const file = await this.getFileRecord(fileId);

    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    const sharp = await this.getSharp();

    // Download original
    const originalBuffer = await this.storage.download(
      file.bucket as StorageBucket,
      file.path
    );
    const originalSize = originalBuffer.length;

    // Process
    let pipeline = sharp.default(originalBuffer);

    // Resize if specified
    if (options.maxWidth || options.maxHeight) {
      pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format
    const format = options.format || 'webp';
    const quality = options.quality || 85;

    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
    }

    const optimizedBuffer = await pipeline.toBuffer();
    const optimizedSize = optimizedBuffer.length;

    // Upload optimized version
    const optimizedPath = getVariantPath(file.path, 'optimized', format);
    await this.storage.upload(
      file.bucket as StorageBucket,
      optimizedPath,
      optimizedBuffer,
      {
        contentType: `image/${format}`,
        cacheControl: 'public, max-age=31536000, immutable',
      }
    );

    // Update variants
    const variants = { ...file.variants, optimized: optimizedPath };
    await this.updateFileRecord(fileId, { variants });

    return {
      originalSize,
      optimizedSize,
      savings: originalSize - optimizedSize,
      format,
    };
  }

  // ============================================================
  // METADATA EXTRACTION
  // ============================================================

  /**
   * Extract metadata from image buffer
   */
  async extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const sharp = await this.getSharp();
    const metadata = await sharp.default(buffer).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif ? this.parseExif(metadata.exif) : undefined,
    };
  }

  /**
   * Parse EXIF data from buffer
   */
  private parseExif(exifBuffer: Buffer): Record<string, unknown> {
    try {
      // Basic EXIF parsing - in production, use a library like exif-reader
      const exif: Record<string, unknown> = {};

      // Extract basic info from EXIF buffer
      // This is a simplified implementation
      const str = exifBuffer.toString('binary');

      // Look for common EXIF tags
      if (str.includes('Apple')) exif.make = 'Apple';
      if (str.includes('Canon')) exif.make = 'Canon';
      if (str.includes('Nikon')) exif.make = 'Nikon';
      if (str.includes('Sony')) exif.make = 'Sony';
      if (str.includes('Samsung')) exif.make = 'Samsung';

      return exif;
    } catch {
      return {};
    }
  }

  /**
   * Serialize metadata for JSON storage
   */
  private serializeMetadata(metadata: ImageMetadata): Record<string, unknown> {
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      colorSpace: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      dpi: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
    };
  }

  // ============================================================
  // IMAGE TRANSFORMATIONS
  // ============================================================

  /**
   * Auto-rotate based on EXIF orientation
   */
  private async autoRotate(buffer: Buffer): Promise<Buffer> {
    const sharp = await this.getSharp();
    return sharp.default(buffer).rotate().toBuffer();
  }

  /**
   * Create a blurred placeholder (LQIP)
   */
  async createPlaceholder(buffer: Buffer, width: number = 20): Promise<string> {
    const sharp = await this.getSharp();

    const placeholder = await sharp.default(buffer)
      .resize(width, undefined, { fit: 'inside' })
      .blur(10)
      .webp({ quality: 20 })
      .toBuffer();

    // Return as base64 data URL
    return `data:image/webp;base64,${placeholder.toString('base64')}`;
  }

  /**
   * Extract dominant color
   */
  async extractDominantColor(buffer: Buffer): Promise<string> {
    const sharp = await this.getSharp();

    // Resize to 1x1 to get average color
    const { data, info } = await sharp.default(buffer)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const r = data[0];
    const g = data[1];
    const b = data[2];

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Apply watermark to image
   */
  async applyWatermark(
    buffer: Buffer,
    watermarkBuffer: Buffer,
    position: 'center' | 'bottom-right' | 'bottom-left' = 'bottom-right',
    opacity: number = 0.5
  ): Promise<Buffer> {
    const sharp = await this.getSharp();

    // Get dimensions
    const [imageMetadata, watermarkMetadata] = await Promise.all([
      sharp.default(buffer).metadata(),
      sharp.default(watermarkBuffer).metadata(),
    ]);

    // Resize watermark to fit (max 20% of image width)
    const maxWatermarkWidth = Math.floor((imageMetadata.width || 800) * 0.2);
    const resizedWatermark = await sharp.default(watermarkBuffer)
      .resize(maxWatermarkWidth, undefined, { fit: 'inside' })
      .toBuffer();

    const resizedMetadata = await sharp.default(resizedWatermark).metadata();

    // Calculate position
    let top = 0;
    let left = 0;
    const padding = 20;

    switch (position) {
      case 'center':
        top = Math.floor(((imageMetadata.height || 600) - (resizedMetadata.height || 0)) / 2);
        left = Math.floor(((imageMetadata.width || 800) - (resizedMetadata.width || 0)) / 2);
        break;
      case 'bottom-right':
        top = (imageMetadata.height || 600) - (resizedMetadata.height || 0) - padding;
        left = (imageMetadata.width || 800) - (resizedMetadata.width || 0) - padding;
        break;
      case 'bottom-left':
        top = (imageMetadata.height || 600) - (resizedMetadata.height || 0) - padding;
        left = padding;
        break;
    }

    // Composite watermark
    return sharp.default(buffer)
      .composite([{
        input: resizedWatermark,
        top: Math.max(0, top),
        left: Math.max(0, left),
        blend: 'over',
      }])
      .toBuffer();
  }

  /**
   * Crop image to aspect ratio
   */
  async cropToAspectRatio(
    buffer: Buffer,
    aspectRatio: number, // width / height
    position: 'center' | 'top' | 'bottom' = 'center'
  ): Promise<Buffer> {
    const sharp = await this.getSharp();
    const metadata = await sharp.default(buffer).metadata();

    const currentRatio = (metadata.width || 1) / (metadata.height || 1);
    let width = metadata.width || 0;
    let height = metadata.height || 0;

    if (currentRatio > aspectRatio) {
      // Image is wider - crop width
      width = Math.floor((metadata.height || 0) * aspectRatio);
    } else {
      // Image is taller - crop height
      height = Math.floor((metadata.width || 0) / aspectRatio);
    }

    return sharp.default(buffer)
      .resize(width, height, {
        fit: 'cover',
        position,
      })
      .toBuffer();
  }

  // ============================================================
  // AVATAR PROCESSING
  // ============================================================

  /**
   * Process avatar image with specific variants
   */
  async processAvatar(
    buffer: Buffer,
    bucket: StorageBucket,
    basePath: string
  ): Promise<Record<string, string>> {
    const sharp = await this.getSharp();
    const variants: Record<string, string> = {};

    // Auto-rotate and crop to square
    const processed = await sharp.default(buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .toBuffer();

    // Generate avatar variants
    for (const variant of AVATAR_VARIANTS) {
      const variantBuffer = await sharp.default(processed)
        .resize(variant.width, variant.height, { fit: 'cover' })
        .webp({ quality: variant.quality || 90 })
        .toBuffer();

      const variantPath = `${basePath}/${variant.name}.webp`;
      await this.storage.upload(bucket, variantPath, variantBuffer, {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      });

      variants[variant.name] = variantPath;
    }

    return variants;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Select which variants to generate based on file type and size
   */
  private selectVariants(file: DbFile, metadata: ImageMetadata): ImageVariant[] {
    // For small images, skip large variants
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const maxDimension = Math.max(width, height);

    return DEFAULT_IMAGE_VARIANTS.filter(variant => {
      // Always generate thumbnail and optimized
      if (variant.name === 'thumbnail' || variant.name === 'optimized') {
        return true;
      }

      // Skip variants larger than original
      if (variant.width && variant.width >= maxDimension) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get file record from database
   */
  private async getFileRecord(fileId: string): Promise<DbFile | null> {
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ProviderError('supabase', 'getFileRecord', error as Error);
    }

    return data as DbFile;
  }

  /**
   * Update file record
   */
  private async updateFileRecord(
    fileId: string,
    updates: Partial<DbFile>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('files')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (error) {
      throw new ProviderError('supabase', 'updateFileRecord', error as Error);
    }
  }
}

// ============================================================
// FACTORY & SINGLETON
// ============================================================

export function createImageProcessor(deps: ImageProcessorDependencies): ImageProcessor {
  return new ImageProcessorImpl(deps);
}

let imageProcessorInstance: ImageProcessor | null = null;

export function getImageProcessor(deps?: ImageProcessorDependencies): ImageProcessor {
  if (!imageProcessorInstance && deps) {
    imageProcessorInstance = createImageProcessor(deps);
  }
  if (!imageProcessorInstance) {
    throw new Error('Image processor not initialized');
  }
  return imageProcessorInstance;
}

// ============================================================
// STANDALONE UTILITIES
// ============================================================

/**
 * Quick image resize without database
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height?: number,
  options: {
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    quality?: number;
  } = {}
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  let pipeline = sharp(buffer).resize(width, height, {
    fit: options.fit || 'inside',
    withoutEnlargement: true,
  });

  const format = options.format || 'webp';
  const quality = options.quality || 85;

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Quick image format conversion
 */
export async function convertImageFormat(
  buffer: Buffer,
  format: 'webp' | 'avif' | 'jpeg' | 'png',
  quality: number = 85
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  let pipeline = sharp(buffer);

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Check if buffer is valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const sharp = (await import('sharp')).default;
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

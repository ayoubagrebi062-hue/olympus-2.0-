/**
 * OLYMPUS 2.0 - File Storage Module
 * ==================================
 * Complete file storage, CDN, and processing system.
 *
 * Usage:
 * ```typescript
 * import { uploadService, fileService, usageService } from '@/lib/storage';
 *
 * // Upload a file
 * const result = await uploadService.upload({
 *   tenantId: 'tenant-123',
 *   file: fileBuffer,
 *   filename: 'image.png',
 *   mimeType: 'image/png',
 * });
 *
 * // Get file with URLs
 * const file = await fileService.getFile(result.fileId);
 *
 * // Check quota
 * const quota = await usageService.checkQuota(tenantId, fileSize);
 * ```
 */

// Types
export * from './types';

// Constants
export {
  FILE_SIZE_LIMITS,
  PLAN_LIMITS,
  STORAGE_BUCKETS,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  EXTENSION_TO_MIME,
  MIME_TO_CATEGORY,
  DEFAULT_IMAGE_VARIANTS,
  AVATAR_VARIANTS,
  CACHE_CONTROL,
  CACHE_BY_CATEGORY,
  STORAGE_TIMEOUTS,
  PROCESSING_QUEUE,
  getCategoryFromMime,
  getExtension,
  getMimeFromExtension,
  isAllowedMimeType,
  isImage,
  isVideo,
  formatBytes,
  parseBytes,
  getPlanLimits,
  generateFileId,
  generateStoragePath,
  getVariantPath,
} from './constants';

// Errors
export {
  STORAGE_ERROR_CODES,
  StorageError,
  FileNotFoundError,
  FileAccessDeniedError,
  FileTooLargeError,
  InvalidFileTypeError,
  QuotaExceededError,
  BandwidthExceededError,
  UploadSessionExpiredError,
  UploadSessionInvalidError,
  UploadIncompleteError,
  FileProcessingError,
  VariantGenerationError,
  VirusDetectedError,
  ProviderError,
  BucketNotFoundError,
  createStorageError,
  toErrorResponse,
  handleStorageError,
} from './errors';

// Supabase Client
export {
  StorageClient,
  getStorageClient,
  createStorageClient,
} from './supabase-client';

// Upload Service
export {
  UploadServiceImpl,
  createUploadService,
  getUploadService,
} from './upload-service';

// Validation
export {
  validateMimeType,
  validateMimeMatchesExtension,
  validateFileSize,
  validateFilename,
  validateFile,
  assertValidFile,
  sanitizeFilename,
  calculateFileHash,
  detectMimeType,
  verifyMimeType,
  isImageMimeType,
  isVideoMimeType,
  isDocumentMimeType,
} from './validation';

// Image Processor
export {
  ImageProcessorImpl,
  createImageProcessor,
  getImageProcessor,
  resizeImage,
  convertImageFormat,
  getImageDimensions,
  isValidImage,
} from './image-processor';

// File Service
export {
  FileServiceImpl,
  createFileService,
  getFileService,
} from './file-service';

// CDN Configuration
export {
  DEFAULT_CDN_CONFIG,
  getCacheControl,
  getCacheControlForCategory,
  buildCacheControl,
  transformForVercel,
  transformForCloudflare,
  transformForSupabase,
  transformImageUrl,
  cdnUrl,
  generateSrcSet,
  generatePictureSources,
  isAllowedSource,
  addAllowedDomain,
  getContentType,
  getBestFormat,
  generatePreloadHeader,
  generatePreloadHeaders,
  generatePlaceholderCSS,
  CdnService,
  getCdnService,
  createCdnService,
  type CdnConfig,
} from './cdn-config';

// Usage Service
export {
  UsageServiceImpl,
  createUsageService,
  getUsageService,
} from './usage-service';

// Cleanup Service
export {
  CleanupServiceImpl,
  createCleanupService,
  getCleanupService,
  runScheduledCleanup,
} from './cleanup-service';

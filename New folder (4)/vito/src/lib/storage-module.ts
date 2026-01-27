/**
 * OLYMPUS 2.0 - Storage Module Integration
 * =========================================
 * Initialize and configure all storage services.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StorageClient,
  createStorageClient,
  createUploadService,
  createFileService,
  createImageProcessor,
  createUsageService,
  createCleanupService,
  createCdnService,
  UploadService,
  FileService,
  ImageProcessor,
  UsageService,
  CleanupService,
  CdnService,
  CdnConfig,
} from './storage';

// ============================================================
// TYPES
// ============================================================

export interface StorageModuleConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  cdnConfig?: Partial<CdnConfig>;
}

export interface StorageModule {
  storage: StorageClient;
  upload: UploadService;
  files: FileService;
  images: ImageProcessor;
  usage: UsageService;
  cleanup: CleanupService;
  cdn: CdnService;
  supabase: SupabaseClient;
}

// ============================================================
// SINGLETON STORAGE MODULE
// ============================================================

let storageModuleInstance: StorageModule | null = null;

/**
 * Initialize the storage module with all services
 */
export function initializeStorageModule(config: StorageModuleConfig = {}): StorageModule {
  if (storageModuleInstance) {
    return storageModuleInstance;
  }

  const supabaseUrl = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = config.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseServiceKey = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Create storage client
  const storage = createStorageClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceKey,
  });

  // Create CDN service
  const cdn = createCdnService(config.cdnConfig);

  // Create usage service
  const usage = createUsageService({ supabase });

  // Create upload service
  const upload = createUploadService({
    storageClient: storage,
    supabase,
    usageService: usage,
  });

  // Create file service
  const files = createFileService({
    storageClient: storage,
    supabase,
    usageService: usage,
  });

  // Create image processor
  const images = createImageProcessor({
    storageClient: storage,
    supabase,
  });

  // Create cleanup service
  const cleanup = createCleanupService({
    storageClient: storage,
    supabase,
    usageService: usage,
  });

  storageModuleInstance = {
    storage,
    upload,
    files,
    images,
    usage,
    cleanup,
    cdn,
    supabase,
  };

  return storageModuleInstance;
}

/**
 * Get the storage module (must be initialized first)
 */
export function getStorageModule(): StorageModule {
  if (!storageModuleInstance) {
    throw new Error('Storage module not initialized. Call initializeStorageModule first.');
  }
  return storageModuleInstance;
}

/**
 * Reset the storage module (for testing)
 */
export function resetStorageModule(): void {
  storageModuleInstance = null;
}

// ============================================================
// CONVENIENCE EXPORTS
// ============================================================

export {
  // Core types
  type DbFile,
  type FileWithUrls,
  type UploadParams,
  type UploadResult,
  type ImageVariant,
  type StorageUsage,
  type QuotaCheck,
  type UsageStats,
  type FileCategory,
  type StorageBucket,
} from './storage/types';

export {
  // Constants
  FILE_SIZE_LIMITS,
  PLAN_LIMITS,
  STORAGE_BUCKETS,
  ALLOWED_MIME_TYPES,
  DEFAULT_IMAGE_VARIANTS,
  formatBytes,
  parseBytes,
  getCategoryFromMime,
  isAllowedMimeType,
  isImage,
  isVideo,
} from './storage/constants';

export {
  // Errors
  StorageError,
  FileNotFoundError,
  FileTooLargeError,
  InvalidFileTypeError,
  QuotaExceededError,
  BandwidthExceededError,
  handleStorageError,
} from './storage/errors';

export {
  // CDN helpers
  getCacheControl,
  transformImageUrl,
  cdnUrl,
  generateSrcSet,
  getBestFormat,
} from './storage/cdn-config';

export {
  // Validation
  validateFile,
  assertValidFile,
  sanitizeFilename,
  detectMimeType,
} from './storage/validation';

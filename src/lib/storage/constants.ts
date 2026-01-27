/**
 * OLYMPUS 2.0 - Storage Constants
 * ================================
 * File limits, quotas, MIME types, and configuration.
 */

import type { FileCategory, ImageVariant, PlanLimits, StorageBucket } from './types';

// ============================================================
// FILE SIZE LIMITS (in bytes)
// ============================================================

export const FILE_SIZE_LIMITS = {
  /** Maximum file size per upload request */
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100MB

  /** Maximum image file size */
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB

  /** Maximum document file size */
  MAX_DOCUMENT_SIZE: 50 * 1024 * 1024, // 50MB

  /** Maximum video file size (Pro+ only) */
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB

  /** Maximum archive file size */
  MAX_ARCHIVE_SIZE: 500 * 1024 * 1024, // 500MB

  /** Maximum avatar size */
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB

  /** Chunk size for resumable uploads */
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB

  /** Threshold for using resumable upload */
  RESUMABLE_THRESHOLD: 5 * 1024 * 1024, // 5MB
} as const;

// ============================================================
// PLAN LIMITS
// ============================================================

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    storage: 100 * 1024 * 1024, // 100MB
    bandwidth: 1024 * 1024 * 1024, // 1GB/month
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 0, // No videos
    videoAllowed: false,
  },
  starter: {
    storage: 1024 * 1024 * 1024, // 1GB
    bandwidth: 10 * 1024 * 1024 * 1024, // 10GB/month
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 0, // No videos
    videoAllowed: false,
  },
  pro: {
    storage: 10 * 1024 * 1024 * 1024, // 10GB
    bandwidth: 100 * 1024 * 1024 * 1024, // 100GB/month
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    videoAllowed: true,
  },
  business: {
    storage: 50 * 1024 * 1024 * 1024, // 50GB
    bandwidth: 500 * 1024 * 1024 * 1024, // 500GB/month
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 500 * 1024 * 1024, // 500MB
    videoAllowed: true,
  },
  enterprise: {
    storage: 500 * 1024 * 1024 * 1024, // 500GB
    bandwidth: 5 * 1024 * 1024 * 1024 * 1024, // 5TB/month
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    maxImageSize: 50 * 1024 * 1024, // 50MB
    maxVideoSize: 1024 * 1024 * 1024, // 1GB
    videoAllowed: true,
  },
};

// ============================================================
// STORAGE BUCKETS
// ============================================================

export const STORAGE_BUCKETS: Record<
  StorageBucket,
  { name: string; public: boolean; description: string }
> = {
  uploads: {
    name: 'uploads',
    public: false,
    description: 'User-uploaded files',
  },
  assets: {
    name: 'assets',
    public: true,
    description: 'Processed project assets (images, fonts, icons)',
  },
  builds: {
    name: 'builds',
    public: false,
    description: 'Build artifacts and compiled code',
  },
  exports: {
    name: 'exports',
    public: false,
    description: 'Downloadable exports (temporary)',
  },
  avatars: {
    name: 'avatars',
    public: true,
    description: 'User and tenant avatars',
  },
  templates: {
    name: 'templates',
    public: true,
    description: 'Platform templates (public)',
  },
};

// ============================================================
// MIME TYPES
// ============================================================

export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/heic',
    'image/heif',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
  ],
  videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
  archives: [
    'application/zip',
    'application/x-tar',
    'application/gzip',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
  ],
  code: [
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'application/typescript',
    'text/html',
    'text/css',
    'application/json',
    'text/xml',
    'application/xml',
    'text/x-python',
    'text/x-java',
  ],
} as const;

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.videos,
  ...ALLOWED_MIME_TYPES.audio,
  ...ALLOWED_MIME_TYPES.archives,
  ...ALLOWED_MIME_TYPES.code,
];

// ============================================================
// FILE EXTENSIONS
// ============================================================

export const EXTENSION_TO_MIME: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',

  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',

  // Videos
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',

  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',

  // Archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/x-rar-compressed',

  // Code
  js: 'text/javascript',
  ts: 'text/typescript',
  jsx: 'text/javascript',
  tsx: 'text/typescript',
  html: 'text/html',
  css: 'text/css',
  json: 'application/json',
  xml: 'text/xml',
  py: 'text/x-python',
  java: 'text/x-java',
};

export const MIME_TO_CATEGORY: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/avif': 'image',
  'image/heic': 'image',
  'image/heif': 'image',

  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/markdown': 'document',
  'text/csv': 'document',

  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',

  // Audio
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',

  // Archives
  'application/zip': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-rar-compressed': 'archive',

  // Code
  'text/javascript': 'code',
  'application/javascript': 'code',
  'text/typescript': 'code',
  'application/typescript': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/json': 'code',
  'text/xml': 'code',
  'application/xml': 'code',
  'text/x-python': 'code',
  'text/x-java': 'code',
};

// ============================================================
// IMAGE VARIANTS
// ============================================================

export const DEFAULT_IMAGE_VARIANTS: ImageVariant[] = [
  {
    name: 'thumbnail',
    width: 150,
    height: 150,
    fit: 'cover',
    format: 'webp',
    quality: 80,
  },
  {
    name: 'small',
    width: 400,
    fit: 'inside',
    format: 'webp',
    quality: 85,
  },
  {
    name: 'medium',
    width: 800,
    fit: 'inside',
    format: 'webp',
    quality: 85,
  },
  {
    name: 'large',
    width: 1200,
    fit: 'inside',
    format: 'webp',
    quality: 85,
  },
  {
    name: 'optimized',
    fit: 'inside',
    format: 'webp',
    quality: 85,
  },
];

export const AVATAR_VARIANTS: ImageVariant[] = [
  { name: 'small', width: 32, height: 32, fit: 'cover', format: 'webp', quality: 90 },
  { name: 'medium', width: 64, height: 64, fit: 'cover', format: 'webp', quality: 90 },
  { name: 'large', width: 128, height: 128, fit: 'cover', format: 'webp', quality: 90 },
];

// ============================================================
// CACHE CONTROL
// ============================================================

export const CACHE_CONTROL = {
  /** Immutable assets (images, fonts) - 1 year */
  immutable: 'public, max-age=31536000, immutable',

  /** Public assets - 1 day */
  public: 'public, max-age=86400',

  /** Private files - 1 hour, must revalidate */
  private: 'private, max-age=3600, must-revalidate',

  /** No cache */
  none: 'no-store, no-cache, must-revalidate',

  /** Short cache - 5 minutes */
  short: 'public, max-age=300',
} as const;

export const CACHE_BY_CATEGORY: Record<FileCategory, string> = {
  image: CACHE_CONTROL.immutable,
  document: CACHE_CONTROL.private,
  video: CACHE_CONTROL.public,
  audio: CACHE_CONTROL.public,
  archive: CACHE_CONTROL.private,
  code: CACHE_CONTROL.private,
  other: CACHE_CONTROL.private,
};

// ============================================================
// TIMEOUTS & EXPIRY
// ============================================================

export const STORAGE_TIMEOUTS = {
  /** Presigned URL expiry (1 hour) */
  PRESIGNED_URL_EXPIRY: 60 * 60,

  /** Upload session expiry (24 hours) */
  UPLOAD_SESSION_EXPIRY: 24 * 60 * 60,

  /** Export file expiry (24 hours) */
  EXPORT_EXPIRY: 24 * 60 * 60,

  /** Soft-deleted file retention (30 days) */
  DELETED_FILE_RETENTION: 30 * 24 * 60 * 60,

  /** Bandwidth reset period (monthly) */
  BANDWIDTH_RESET_PERIOD: 30 * 24 * 60 * 60,
} as const;

// ============================================================
// PROCESSING QUEUE
// ============================================================

export const PROCESSING_QUEUE = {
  /** Queue name for image processing */
  IMAGE_PROCESSING: 'storage:image-processing',

  /** Queue name for virus scanning */
  VIRUS_SCAN: 'storage:virus-scan',

  /** Queue name for cleanup */
  CLEANUP: 'storage:cleanup',

  /** Max retries for processing */
  MAX_RETRIES: 3,

  /** Retry delay (exponential backoff base) */
  RETRY_DELAY_BASE: 1000,
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get file category from MIME type
 */
export function getCategoryFromMime(mimeType: string): FileCategory {
  return MIME_TO_CATEGORY[mimeType] || 'other';
}

/**
 * Get extension from filename
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Get MIME type from extension
 */
export function getMimeFromExtension(extension: string): string | undefined {
  return EXTENSION_TO_MIME[extension.toLowerCase()];
}

/**
 * Check if MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return (ALL_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse bytes from human readable string
 */
export function parseBytes(str: string): number {
  const units: Record<string, number> = {
    b: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  const match = str.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(bytes?|kb|mb|gb|tb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'bytes';

  return Math.floor(value * (units[unit] || 1));
}

/**
 * Get plan limits for a plan
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  return crypto.randomUUID();
}

/**
 * Generate storage path
 */
export function generateStoragePath(
  tenantId: string,
  projectId: string | undefined,
  fileId: string,
  extension: string
): string {
  if (projectId) {
    return `${tenantId}/${projectId}/${fileId}.${extension}`;
  }
  return `${tenantId}/${fileId}.${extension}`;
}

/**
 * Get variant path from original path
 */
export function getVariantPath(originalPath: string, variantName: string, format: string): string {
  const dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
  const filename = originalPath.substring(originalPath.lastIndexOf('/') + 1);
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

  return `${dir}/${variantName}/${nameWithoutExt}.${format}`;
}

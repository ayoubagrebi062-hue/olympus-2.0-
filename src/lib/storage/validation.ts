/**
 * OLYMPUS 2.0 - Upload Validation
 * ================================
 * File validation utilities for uploads.
 */

import {
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  EXTENSION_TO_MIME,
  getCategoryFromMime,
  getExtension,
} from './constants';
import {
  StorageError,
  FileTooLargeError,
  InvalidFileTypeError,
  STORAGE_ERROR_CODES,
} from './errors';
import type { FileCategory, PlanLimits } from './types';

// ============================================================
// VALIDATION RESULTS
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

// ============================================================
// MIME TYPE VALIDATION
// ============================================================

/**
 * Validate MIME type is allowed
 */
export function validateMimeType(mimeType: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!mimeType) {
    errors.push({
      code: 'MISSING_MIME_TYPE',
      message: 'MIME type is required',
      field: 'mimeType',
    });
  } else if (!(ALL_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    errors.push({
      code: 'INVALID_MIME_TYPE',
      message: `MIME type '${mimeType}' is not allowed`,
      field: 'mimeType',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate MIME type matches extension
 */
export function validateMimeMatchesExtension(mimeType: string, filename: string): ValidationResult {
  const errors: ValidationError[] = [];
  const extension = getExtension(filename);

  if (extension) {
    const expectedMime = EXTENSION_TO_MIME[extension];
    if (expectedMime && expectedMime !== mimeType) {
      // Allow some flexibility for similar types
      const mimeBase = mimeType.split('/')[0];
      const expectedBase = expectedMime.split('/')[0];

      if (mimeBase !== expectedBase) {
        errors.push({
          code: 'MIME_EXTENSION_MISMATCH',
          message: `MIME type '${mimeType}' does not match extension '.${extension}'`,
          field: 'mimeType',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if MIME type is image
 */
export function isImageMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES.images as readonly string[]).includes(mimeType);
}

/**
 * Check if MIME type is video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES.videos as readonly string[]).includes(mimeType);
}

/**
 * Check if MIME type is document
 */
export function isDocumentMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES.documents as readonly string[]).includes(mimeType);
}

// ============================================================
// SIZE VALIDATION
// ============================================================

/**
 * Validate file size against limits
 */
export function validateFileSize(
  size: number,
  mimeType: string,
  planLimits?: PlanLimits
): ValidationResult {
  const errors: ValidationError[] = [];
  const category = getCategoryFromMime(mimeType);

  // Check against absolute maximum
  if (size > FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `File size ${formatSize(size)} exceeds maximum ${formatSize(FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE)}`,
      field: 'size',
    });
    return { valid: false, errors };
  }

  // Check against category limits
  const categoryLimit = getCategoryLimit(category);
  if (size > categoryLimit) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: `${category} file size ${formatSize(size)} exceeds limit ${formatSize(categoryLimit)}`,
      field: 'size',
    });
  }

  // Check against plan limits if provided
  if (planLimits) {
    if (size > planLimits.maxFileSize) {
      errors.push({
        code: 'FILE_TOO_LARGE_FOR_PLAN',
        message: `File size ${formatSize(size)} exceeds your plan limit ${formatSize(planLimits.maxFileSize)}`,
        field: 'size',
      });
    }

    if (category === 'image' && size > planLimits.maxImageSize) {
      errors.push({
        code: 'IMAGE_TOO_LARGE_FOR_PLAN',
        message: `Image size ${formatSize(size)} exceeds your plan limit ${formatSize(planLimits.maxImageSize)}`,
        field: 'size',
      });
    }

    if (category === 'video') {
      if (!planLimits.videoAllowed) {
        errors.push({
          code: 'VIDEO_NOT_ALLOWED',
          message: 'Video uploads are not available on your plan',
          field: 'mimeType',
        });
      } else if (size > planLimits.maxVideoSize) {
        errors.push({
          code: 'VIDEO_TOO_LARGE_FOR_PLAN',
          message: `Video size ${formatSize(size)} exceeds your plan limit ${formatSize(planLimits.maxVideoSize)}`,
          field: 'size',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get size limit for category
 */
function getCategoryLimit(category: FileCategory): number {
  switch (category) {
    case 'image':
      return FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
    case 'video':
      return FILE_SIZE_LIMITS.MAX_VIDEO_SIZE;
    case 'document':
      return FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE;
    case 'archive':
      return FILE_SIZE_LIMITS.MAX_ARCHIVE_SIZE;
    default:
      return FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE;
  }
}

// ============================================================
// FILENAME VALIDATION
// ============================================================

/**
 * Validate filename
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!filename) {
    errors.push({
      code: 'MISSING_FILENAME',
      message: 'Filename is required',
      field: 'filename',
    });
    return { valid: false, errors };
  }

  if (filename.length > 255) {
    errors.push({
      code: 'FILENAME_TOO_LONG',
      message: 'Filename must be 255 characters or less',
      field: 'filename',
    });
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    errors.push({
      code: 'INVALID_FILENAME_CHARS',
      message: 'Filename contains invalid characters',
      field: 'filename',
    });
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  if (reservedNames.test(nameWithoutExt)) {
    errors.push({
      code: 'RESERVED_FILENAME',
      message: 'Filename is a reserved system name',
      field: 'filename',
    });
  }

  // Check for hidden files (starts with .)
  if (filename.startsWith('.')) {
    errors.push({
      code: 'HIDDEN_FILE',
      message: 'Hidden files (starting with .) are not allowed',
      field: 'filename',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove invalid characters
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = getExtension(sanitized);
    const maxNameLength = 255 - ext.length - 1;
    sanitized = sanitized.substring(0, maxNameLength) + '.' + ext;
  }

  // Default name if empty
  if (!sanitized) {
    sanitized = 'unnamed_file';
  }

  return sanitized;
}

// ============================================================
// COMPREHENSIVE VALIDATION
// ============================================================

export interface FileValidationParams {
  filename: string;
  mimeType: string;
  size: number;
  planLimits?: PlanLimits;
}

/**
 * Comprehensive file validation
 */
export function validateFile(params: FileValidationParams): ValidationResult {
  const { filename, mimeType, size, planLimits } = params;
  const allErrors: ValidationError[] = [];

  // Validate filename
  const filenameResult = validateFilename(filename);
  allErrors.push(...filenameResult.errors);

  // Validate MIME type
  const mimeResult = validateMimeType(mimeType);
  allErrors.push(...mimeResult.errors);

  // Validate MIME matches extension
  const mimeExtResult = validateMimeMatchesExtension(mimeType, filename);
  allErrors.push(...mimeExtResult.errors);

  // Validate size
  const sizeResult = validateFileSize(size, mimeType, planLimits);
  allErrors.push(...sizeResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Throw error if validation fails
 */
export function assertValidFile(params: FileValidationParams): void {
  const result = validateFile(params);

  if (!result.valid) {
    const firstError = result.errors[0];

    switch (firstError.code) {
      case 'FILE_TOO_LARGE':
      case 'FILE_TOO_LARGE_FOR_PLAN':
      case 'IMAGE_TOO_LARGE_FOR_PLAN':
      case 'VIDEO_TOO_LARGE_FOR_PLAN':
        throw new FileTooLargeError(
          params.size,
          getCategoryLimit(getCategoryFromMime(params.mimeType))
        );

      case 'INVALID_MIME_TYPE':
      case 'VIDEO_NOT_ALLOWED':
        throw new InvalidFileTypeError(params.mimeType);

      default:
        throw new StorageError(firstError.message, STORAGE_ERROR_CODES.UPLOAD_FAILED, 400, {
          errors: result.errors,
        });
    }
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate MD5 hash of buffer (for deduplication)
 */
export async function calculateFileHash(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Detect MIME type from buffer (magic bytes)
 */
export function detectMimeType(buffer: Buffer): string | null {
  // Check magic bytes
  const magicBytes: Array<{ bytes: number[]; mime: string }> = [
    { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
    { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
    { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // RIFF....WEBP
    { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
    { bytes: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' },
    { bytes: [0x1f, 0x8b], mime: 'application/gzip' },
  ];

  for (const { bytes, mime } of magicBytes) {
    let match = true;
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[i] !== bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return mime;
  }

  return null;
}

/**
 * Verify MIME type matches content
 */
export function verifyMimeType(buffer: Buffer, declaredMime: string): boolean {
  const detectedMime = detectMimeType(buffer);

  // If we can't detect, trust the declared type
  if (!detectedMime) return true;

  // Check if they match (allowing for some flexibility)
  const declaredBase = declaredMime.split('/')[0];
  const detectedBase = detectedMime.split('/')[0];

  return declaredBase === detectedBase;
}

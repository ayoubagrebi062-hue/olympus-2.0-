/**
 * OLYMPUS 2.0 - Storage Errors
 * ============================
 * Custom error classes for file storage operations.
 */

// ============================================================
// ERROR CODES
// ============================================================

export const STORAGE_ERROR_CODES = {
  // Upload errors
  UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  UPLOAD_CANCELED: 'STORAGE_UPLOAD_CANCELED',
  UPLOAD_SESSION_EXPIRED: 'STORAGE_UPLOAD_SESSION_EXPIRED',
  UPLOAD_SESSION_INVALID: 'STORAGE_UPLOAD_SESSION_INVALID',
  UPLOAD_CHUNK_MISSING: 'STORAGE_UPLOAD_CHUNK_MISSING',
  UPLOAD_INCOMPLETE: 'STORAGE_UPLOAD_INCOMPLETE',

  // File errors
  FILE_NOT_FOUND: 'STORAGE_FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'STORAGE_FILE_ACCESS_DENIED',
  FILE_ALREADY_EXISTS: 'STORAGE_FILE_ALREADY_EXISTS',
  FILE_CORRUPTED: 'STORAGE_FILE_CORRUPTED',
  FILE_PROCESSING_FAILED: 'STORAGE_FILE_PROCESSING_FAILED',

  // Validation errors
  INVALID_FILE_TYPE: 'STORAGE_INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',
  INVALID_FILENAME: 'STORAGE_INVALID_FILENAME',
  INVALID_PATH: 'STORAGE_INVALID_PATH',

  // Quota errors
  QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  BANDWIDTH_EXCEEDED: 'STORAGE_BANDWIDTH_EXCEEDED',
  FILE_COUNT_EXCEEDED: 'STORAGE_FILE_COUNT_EXCEEDED',

  // Processing errors
  PROCESSING_TIMEOUT: 'STORAGE_PROCESSING_TIMEOUT',
  VARIANT_GENERATION_FAILED: 'STORAGE_VARIANT_GENERATION_FAILED',
  METADATA_EXTRACTION_FAILED: 'STORAGE_METADATA_EXTRACTION_FAILED',
  VIRUS_DETECTED: 'STORAGE_VIRUS_DETECTED',

  // System errors
  BUCKET_NOT_FOUND: 'STORAGE_BUCKET_NOT_FOUND',
  PROVIDER_ERROR: 'STORAGE_PROVIDER_ERROR',
  CDN_ERROR: 'STORAGE_CDN_ERROR',
  DATABASE_ERROR: 'STORAGE_DATABASE_ERROR',

  // Generic
  UNKNOWN_ERROR: 'STORAGE_UNKNOWN_ERROR',
} as const;

export type StorageErrorCode = typeof STORAGE_ERROR_CODES[keyof typeof STORAGE_ERROR_CODES];

// ============================================================
// BASE ERROR CLASS
// ============================================================

export interface StorageErrorDetails {
  code: StorageErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  cause?: Error;
}

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: StorageErrorCode = STORAGE_ERROR_CODES.UNKNOWN_ERROR,
    statusCode: number = 500,
    details: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date();

    // Maintains proper stack trace
    Error.captureStackTrace?.(this, StorageError);
  }

  toJSON(): StorageErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      cause: this.cause,
    };
  }

  static isStorageError(error: unknown): error is StorageError {
    return error instanceof StorageError;
  }
}

// ============================================================
// SPECIFIC ERROR CLASSES
// ============================================================

export class FileNotFoundError extends StorageError {
  constructor(fileId: string, details?: Record<string, unknown>) {
    super(
      `File not found: ${fileId}`,
      STORAGE_ERROR_CODES.FILE_NOT_FOUND,
      404,
      { fileId, ...details }
    );
    this.name = 'FileNotFoundError';
  }
}

export class FileAccessDeniedError extends StorageError {
  constructor(fileId: string, userId?: string, details?: Record<string, unknown>) {
    super(
      `Access denied to file: ${fileId}`,
      STORAGE_ERROR_CODES.FILE_ACCESS_DENIED,
      403,
      { fileId, userId, ...details }
    );
    this.name = 'FileAccessDeniedError';
  }
}

export class FileTooLargeError extends StorageError {
  constructor(fileSize: number, maxSize: number, details?: Record<string, unknown>) {
    super(
      `File size ${formatBytesSimple(fileSize)} exceeds maximum ${formatBytesSimple(maxSize)}`,
      STORAGE_ERROR_CODES.FILE_TOO_LARGE,
      413,
      { fileSize, maxSize, ...details }
    );
    this.name = 'FileTooLargeError';
  }
}

export class InvalidFileTypeError extends StorageError {
  constructor(mimeType: string, allowedTypes?: string[], details?: Record<string, unknown>) {
    super(
      `Invalid file type: ${mimeType}`,
      STORAGE_ERROR_CODES.INVALID_FILE_TYPE,
      415,
      { mimeType, allowedTypes, ...details }
    );
    this.name = 'InvalidFileTypeError';
  }
}

export class QuotaExceededError extends StorageError {
  constructor(
    tenantId: string,
    currentUsage: number,
    limit: number,
    requestedSize: number,
    details?: Record<string, unknown>
  ) {
    super(
      `Storage quota exceeded. Current: ${formatBytesSimple(currentUsage)}, Limit: ${formatBytesSimple(limit)}, Requested: ${formatBytesSimple(requestedSize)}`,
      STORAGE_ERROR_CODES.QUOTA_EXCEEDED,
      507,
      { tenantId, currentUsage, limit, requestedSize, ...details }
    );
    this.name = 'QuotaExceededError';
  }
}

export class BandwidthExceededError extends StorageError {
  constructor(
    tenantId: string,
    used: number,
    limit: number,
    resetAt?: Date,
    details?: Record<string, unknown>
  ) {
    super(
      `Bandwidth limit exceeded. Used: ${formatBytesSimple(used)}, Limit: ${formatBytesSimple(limit)}`,
      STORAGE_ERROR_CODES.BANDWIDTH_EXCEEDED,
      509,
      { tenantId, used, limit, resetAt: resetAt?.toISOString(), ...details }
    );
    this.name = 'BandwidthExceededError';
  }
}

export class UploadSessionExpiredError extends StorageError {
  constructor(sessionId: string, details?: Record<string, unknown>) {
    super(
      `Upload session expired: ${sessionId}`,
      STORAGE_ERROR_CODES.UPLOAD_SESSION_EXPIRED,
      410,
      { sessionId, ...details }
    );
    this.name = 'UploadSessionExpiredError';
  }
}

export class UploadSessionInvalidError extends StorageError {
  constructor(sessionId: string, reason: string, details?: Record<string, unknown>) {
    super(
      `Invalid upload session: ${sessionId} - ${reason}`,
      STORAGE_ERROR_CODES.UPLOAD_SESSION_INVALID,
      400,
      { sessionId, reason, ...details }
    );
    this.name = 'UploadSessionInvalidError';
  }
}

export class UploadIncompleteError extends StorageError {
  constructor(
    sessionId: string,
    uploadedChunks: number,
    totalChunks: number,
    details?: Record<string, unknown>
  ) {
    super(
      `Upload incomplete: ${uploadedChunks}/${totalChunks} chunks uploaded`,
      STORAGE_ERROR_CODES.UPLOAD_INCOMPLETE,
      400,
      { sessionId, uploadedChunks, totalChunks, ...details }
    );
    this.name = 'UploadIncompleteError';
  }
}

export class FileProcessingError extends StorageError {
  constructor(fileId: string, reason: string, cause?: Error, details?: Record<string, unknown>) {
    super(
      `File processing failed: ${reason}`,
      STORAGE_ERROR_CODES.FILE_PROCESSING_FAILED,
      500,
      { fileId, reason, ...details },
      cause
    );
    this.name = 'FileProcessingError';
  }
}

export class VariantGenerationError extends StorageError {
  constructor(
    fileId: string,
    variantName: string,
    reason: string,
    cause?: Error,
    details?: Record<string, unknown>
  ) {
    super(
      `Variant generation failed for ${variantName}: ${reason}`,
      STORAGE_ERROR_CODES.VARIANT_GENERATION_FAILED,
      500,
      { fileId, variantName, reason, ...details },
      cause
    );
    this.name = 'VariantGenerationError';
  }
}

export class VirusDetectedError extends StorageError {
  constructor(fileId: string, virusName: string, details?: Record<string, unknown>) {
    super(
      `Virus detected in file: ${virusName}`,
      STORAGE_ERROR_CODES.VIRUS_DETECTED,
      400,
      { fileId, virusName, ...details }
    );
    this.name = 'VirusDetectedError';
  }
}

export class ProviderError extends StorageError {
  constructor(provider: string, operation: string, cause?: Error, details?: Record<string, unknown>) {
    super(
      `Storage provider error (${provider}): ${operation} failed`,
      STORAGE_ERROR_CODES.PROVIDER_ERROR,
      502,
      { provider, operation, ...details },
      cause
    );
    this.name = 'ProviderError';
  }
}

export class BucketNotFoundError extends StorageError {
  constructor(bucket: string, details?: Record<string, unknown>) {
    super(
      `Storage bucket not found: ${bucket}`,
      STORAGE_ERROR_CODES.BUCKET_NOT_FOUND,
      404,
      { bucket, ...details }
    );
    this.name = 'BucketNotFoundError';
  }
}

// ============================================================
// ERROR FACTORY
// ============================================================

export function createStorageError(
  code: StorageErrorCode,
  message: string,
  details?: Record<string, unknown>,
  cause?: Error
): StorageError {
  const statusCodes: Partial<Record<StorageErrorCode, number>> = {
    [STORAGE_ERROR_CODES.FILE_NOT_FOUND]: 404,
    [STORAGE_ERROR_CODES.FILE_ACCESS_DENIED]: 403,
    [STORAGE_ERROR_CODES.FILE_TOO_LARGE]: 413,
    [STORAGE_ERROR_CODES.INVALID_FILE_TYPE]: 415,
    [STORAGE_ERROR_CODES.QUOTA_EXCEEDED]: 507,
    [STORAGE_ERROR_CODES.BANDWIDTH_EXCEEDED]: 509,
    [STORAGE_ERROR_CODES.UPLOAD_SESSION_EXPIRED]: 410,
    [STORAGE_ERROR_CODES.UPLOAD_SESSION_INVALID]: 400,
    [STORAGE_ERROR_CODES.UPLOAD_INCOMPLETE]: 400,
    [STORAGE_ERROR_CODES.VIRUS_DETECTED]: 400,
    [STORAGE_ERROR_CODES.BUCKET_NOT_FOUND]: 404,
    [STORAGE_ERROR_CODES.PROVIDER_ERROR]: 502,
    [STORAGE_ERROR_CODES.CDN_ERROR]: 502,
  };

  return new StorageError(
    message,
    code,
    statusCodes[code] || 500,
    details,
    cause
  );
}

// ============================================================
// ERROR RESPONSE HELPER
// ============================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function toErrorResponse(error: StorageError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}

export function handleStorageError(error: unknown): ErrorResponse {
  if (StorageError.isStorageError(error)) {
    return toErrorResponse(error);
  }

  if (error instanceof Error) {
    return toErrorResponse(
      new StorageError(
        error.message,
        STORAGE_ERROR_CODES.UNKNOWN_ERROR,
        500,
        {},
        error
      )
    );
  }

  return toErrorResponse(
    new StorageError(
      'An unknown error occurred',
      STORAGE_ERROR_CODES.UNKNOWN_ERROR,
      500
    )
  );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatBytesSimple(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

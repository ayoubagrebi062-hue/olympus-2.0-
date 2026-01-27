/**
 * OLYMPUS 2.0 - File Storage Types
 * =================================
 * Core types for file storage, uploads, and CDN operations.
 */

// ============================================================
// FILE CATEGORIES & ENUMS
// ============================================================

export type FileCategory = 'image' | 'document' | 'video' | 'audio' | 'archive' | 'code' | 'other';

export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type UploadSessionStatus = 'active' | 'completed' | 'expired' | 'canceled';

export type StorageBucket = 'uploads' | 'assets' | 'builds' | 'exports' | 'avatars' | 'templates';

// ============================================================
// FILE RECORDS
// ============================================================

export interface DbFile {
  id: string;
  tenant_id: string;
  project_id: string | null;

  // File info
  name: string;
  path: string;
  bucket: StorageBucket;

  // Type info
  mime_type: string;
  extension: string | null;
  category: FileCategory;

  // Size
  size_bytes: number;

  // Image-specific
  width: number | null;
  height: number | null;

  // Processing
  status: FileStatus;
  processing_error: string | null;

  // Variants (for images)
  variants: Record<string, string>;

  // Metadata
  metadata: Record<string, unknown>;

  // Access
  is_public: boolean;
  public_url: string | null;

  // Audit
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  path: string;
  size_bytes: number;
  created_at: string;
  created_by: string | null;
}

export interface FileWithUrls extends DbFile {
  url: string;
  publicUrl?: string;
  variantUrls?: Record<string, string>;
}

// ============================================================
// UPLOAD TYPES
// ============================================================

export interface UploadParams {
  tenantId: string;
  projectId?: string;
  file: File | Buffer | ArrayBuffer;
  filename: string;
  mimeType: string;
  bucket?: StorageBucket;
  path?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  fileId: string;
  path: string;
  url: string;
  publicUrl?: string;
  size: number;
  mimeType: string;
  variants?: Record<string, string>;
}

export interface GetUploadUrlParams {
  tenantId: string;
  projectId?: string;
  filename: string;
  mimeType: string;
  size: number;
  isPublic?: boolean;
}

export interface PresignedUrl {
  fileId: string;
  uploadUrl: string;
  expiresAt: Date;
  path: string;
}

// ============================================================
// RESUMABLE UPLOAD TYPES
// ============================================================

export interface CreateSessionParams {
  tenantId: string;
  projectId?: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  chunkSize?: number;
}

export interface UploadSession {
  sessionId: string;
  uploadUrls: string[];
  chunkSize: number;
  totalChunks: number;
  expiresAt: Date;
}

export interface DbUploadSession {
  id: string;
  tenant_id: string;
  project_id: string | null;
  filename: string;
  mime_type: string;
  total_size: number;
  chunk_size: number;
  uploaded_bytes: number;
  uploaded_chunks: number[];
  target_bucket: string;
  target_path: string;
  status: UploadSessionStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  index: number;
  data: Buffer | ArrayBuffer;
}

export interface ChunkResult {
  chunkIndex: number;
  uploaded: boolean;
  progress: number;
}

// ============================================================
// IMAGE PROCESSING TYPES
// ============================================================

export interface ImageVariant {
  name: string;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: Record<string, unknown>;
}

export interface ProcessResult {
  success: boolean;
  variants: Record<string, string>;
  metadata: ImageMetadata;
}

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

export interface OptimizeResult {
  originalSize: number;
  optimizedSize: number;
  savings: number;
  format: string;
}

// ============================================================
// USAGE & QUOTA TYPES
// ============================================================

export interface StorageUsage {
  id: string;
  tenant_id: string;
  total_bytes: number;
  file_count: number;
  images_bytes: number;
  documents_bytes: number;
  videos_bytes: number;
  audio_bytes: number;
  archives_bytes: number;
  code_bytes: number;
  other_bytes: number;
  limit_bytes: number;
  bandwidth_used_bytes: number;
  bandwidth_limit_bytes: number;
  bandwidth_reset_at: string | null;
  updated_at: string;
}

export interface QuotaCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  wouldExceed: boolean;
  upgradeRequired: boolean;
}

export interface BandwidthCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
}

export interface UsageStats {
  storage: {
    used: number;
    limit: number;
    percentage: number;
    byCategory: {
      images: number;
      documents: number;
      videos: number;
      other: number;
    };
  };
  bandwidth: {
    used: number;
    limit: number;
    percentage: number;
    resetAt: Date | null;
  };
  fileCount: number;
}

export interface PlanLimits {
  storage: number;
  bandwidth: number;
  maxFileSize: number;
  maxImageSize: number;
  maxVideoSize: number;
  videoAllowed: boolean;
}

// ============================================================
// CLEANUP TYPES
// ============================================================

export interface CleanupResult {
  cleaned: number;
  freedBytes: number;
}

export interface FullCleanupResult {
  orphanedFiles: CleanupResult;
  expiredSessions: CleanupResult;
  deletedFiles: CleanupResult;
  expiredExports: CleanupResult;
  total: CleanupResult;
}

// ============================================================
// LIST & SEARCH TYPES
// ============================================================

export interface ListFilesParams {
  tenantId: string;
  projectId?: string;
  category?: FileCategory;
  status?: FileStatus;
  bucket?: StorageBucket;
  cursor?: string;
  limit?: number;
  orderBy?: 'created_at' | 'name' | 'size_bytes';
  orderDirection?: 'asc' | 'desc';
}

export interface SearchParams {
  tenantId: string;
  query: string;
  category?: FileCategory;
  mimeTypes?: string[];
  minSize?: number;
  maxSize?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  totalCount?: number;
}

// ============================================================
// CDN TYPES
// ============================================================

export interface CdnOptions {
  provider: 'vercel' | 'cloudflare' | 'supabase';
  cacheControl?: string;
  transform?: ImageTransformOptions;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface CdnUrl {
  url: string;
  cacheControl: string;
  contentType: string;
}

// ============================================================
// SERVICE INTERFACES
// ============================================================

export interface UploadService {
  upload(params: UploadParams): Promise<UploadResult>;
  getUploadUrl(params: GetUploadUrlParams): Promise<PresignedUrl>;
  createUploadSession(params: CreateSessionParams): Promise<UploadSession>;
  uploadChunk(sessionId: string, chunk: Chunk): Promise<ChunkResult>;
  completeUpload(sessionId: string): Promise<UploadResult>;
  cancelUpload(sessionId: string): Promise<void>;
  uploadMultiple(files: UploadParams[]): Promise<UploadResult[]>;
}

export interface FileService {
  getFile(fileId: string): Promise<FileWithUrls>;
  getSignedUrl(fileId: string, expiresIn?: number): Promise<string>;
  getPublicUrl(fileId: string): Promise<string>;
  getVariantUrl(fileId: string, variant: string): Promise<string>;
  download(fileId: string): Promise<Buffer>;
  delete(fileId: string, hard?: boolean): Promise<void>;
  listFiles(params: ListFilesParams): Promise<PaginatedResult<FileWithUrls>>;
  searchFiles(params: SearchParams): Promise<FileWithUrls[]>;
  rename(fileId: string, newName: string): Promise<FileWithUrls>;
  setPublic(fileId: string, isPublic: boolean): Promise<FileWithUrls>;
  moveToProject(fileId: string, projectId: string | null): Promise<FileWithUrls>;
  updateMetadata(fileId: string, metadata: Record<string, unknown>): Promise<FileWithUrls>;
}

export interface ImageProcessor {
  process(fileId: string): Promise<ProcessResult>;
  generateVariant(
    file: DbFile | { bucket: string; path: string },
    buffer: Buffer,
    variant: ImageVariant
  ): Promise<string>;
  optimize(fileId: string, options: OptimizeOptions): Promise<OptimizeResult>;
  extractMetadata(buffer: Buffer): Promise<ImageMetadata>;
}

export interface UsageService {
  checkQuota(tenantId: string, fileSize: number): Promise<QuotaCheck>;
  trackUpload(tenantId: string, size: number, category: FileCategory): Promise<void>;
  trackDeletion(tenantId: string, size: number, category: FileCategory): Promise<void>;
  trackBandwidth(tenantId: string, bytes: number): Promise<void>;
  getUsage(tenantId: string): Promise<UsageStats>;
  checkBandwidth(tenantId: string, bytes: number): Promise<BandwidthCheck>;
  getUsageSummary(tenantId: string): Promise<{
    storageUsed: string;
    storageLimit: string;
    storagePercentage: number;
    bandwidthUsed: string;
    bandwidthLimit: string;
    bandwidthPercentage: number;
    fileCount: number;
  }>;
}

export interface CleanupService {
  cleanOrphanedFiles(): Promise<CleanupResult>;
  cleanExpiredSessions(): Promise<CleanupResult>;
  cleanDeletedFiles(olderThan: Date): Promise<CleanupResult>;
  cleanExpiredExports(): Promise<CleanupResult>;
  runFullCleanup(): Promise<FullCleanupResult>;
}

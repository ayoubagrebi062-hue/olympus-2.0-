/**
 * OLYMPUS 2.0 - Upload Service
 * ============================
 * Handles file uploads: direct, presigned URL, and resumable (chunked).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UploadParams,
  UploadResult,
  GetUploadUrlParams,
  PresignedUrl,
  CreateSessionParams,
  UploadSession,
  Chunk,
  ChunkResult,
  DbUploadSession,
  DbFile,
  FileCategory,
  StorageBucket,
  UploadService,
} from './types';
import {
  FILE_SIZE_LIMITS,
  STORAGE_TIMEOUTS,
  getCategoryFromMime,
  getExtension,
  isAllowedMimeType,
  isImage,
  isVideo,
  generateFileId,
  generateStoragePath,
  getPlanLimits,
} from './constants';
import {
  StorageError,
  FileTooLargeError,
  InvalidFileTypeError,
  UploadSessionExpiredError,
  UploadSessionInvalidError,
  UploadIncompleteError,
  ProviderError,
  STORAGE_ERROR_CODES,
} from './errors';
import { StorageClient, getStorageClient } from './supabase-client';

// ============================================================
// TYPES
// ============================================================

interface UploadServiceDependencies {
  storageClient: StorageClient;
  supabase: SupabaseClient;
  usageService?: UsageServiceLike;
  processingQueue?: ProcessingQueueLike;
}

interface UsageServiceLike {
  checkQuota(tenantId: string, fileSize: number): Promise<{ allowed: boolean; remaining: number }>;
  trackUpload(tenantId: string, size: number, category: FileCategory): Promise<void>;
}

interface ProcessingQueueLike {
  enqueue(queue: string, payload: Record<string, unknown>): Promise<void>;
}

interface TenantPlan {
  plan: string;
}

// ============================================================
// UPLOAD SERVICE IMPLEMENTATION
// ============================================================

export class UploadServiceImpl implements UploadService {
  private storage: StorageClient;
  private supabase: SupabaseClient;
  private usageService?: UsageServiceLike;
  private processingQueue?: ProcessingQueueLike;

  constructor(deps: UploadServiceDependencies) {
    this.storage = deps.storageClient;
    this.supabase = deps.supabase;
    this.usageService = deps.usageService;
    this.processingQueue = deps.processingQueue;
  }

  // ============================================================
  // DIRECT UPLOAD (for files < 5MB)
  // ============================================================

  async upload(params: UploadParams): Promise<UploadResult> {
    const {
      tenantId,
      projectId,
      file,
      filename,
      mimeType,
      bucket = 'uploads',
      isPublic = false,
      metadata = {},
    } = params;

    // 1. Validate file
    const fileSize = this.getFileSize(file);
    await this.validateFile(tenantId, fileSize, mimeType, filename);

    // 2. Check storage quota
    if (this.usageService) {
      const quota = await this.usageService.checkQuota(tenantId, fileSize);
      if (!quota.allowed) {
        throw new StorageError(
          `Storage quota exceeded. Need ${fileSize} bytes, only ${quota.remaining} available.`,
          STORAGE_ERROR_CODES.QUOTA_EXCEEDED,
          507,
          { tenantId, fileSize, remaining: quota.remaining }
        );
      }
    }

    // 3. Generate file ID and path
    const fileId = generateFileId();
    const extension = getExtension(filename);
    const path = params.path || generateStoragePath(tenantId, projectId, fileId, extension);
    const category = getCategoryFromMime(mimeType);

    // 4. Convert file to Buffer if needed
    const buffer = await this.toBuffer(file);

    // 5. Upload to storage
    try {
      await this.storage.upload(bucket as StorageBucket, path, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    } catch (error) {
      throw new ProviderError('supabase', 'upload', error as Error, {
        bucket,
        path,
        fileId,
      });
    }

    // 6. Create database record
    const _fileRecord = await this.createFileRecord({
      id: fileId,
      tenant_id: tenantId,
      project_id: projectId || null,
      name: filename,
      path,
      bucket,
      mime_type: mimeType,
      extension,
      category,
      size_bytes: fileSize,
      status: 'pending',
      is_public: isPublic,
      metadata,
    });

    // 7. Queue processing for images
    if (isImage(mimeType) && this.processingQueue) {
      await this.processingQueue.enqueue('storage:image-processing', {
        fileId,
        tenantId,
        path,
        bucket,
      });
    } else {
      // Mark non-images as ready immediately
      await this.updateFileStatus(fileId, 'ready');
    }

    // 8. Track usage
    if (this.usageService) {
      await this.usageService.trackUpload(tenantId, fileSize, category);
    }

    // 9. Generate URLs
    const url = isPublic
      ? this.storage.getPublicUrl(bucket as StorageBucket, path)
      : await this.storage.createSignedUrl(bucket as StorageBucket, path, { expiresIn: 3600 });

    return {
      fileId,
      path,
      url,
      publicUrl: isPublic ? url : undefined,
      size: fileSize,
      mimeType,
    };
  }

  // ============================================================
  // PRESIGNED URL UPLOAD (for medium files)
  // ============================================================

  async getUploadUrl(params: GetUploadUrlParams): Promise<PresignedUrl> {
    const { tenantId, projectId, filename, mimeType, size, isPublic = false } = params;

    // 1. Validate
    await this.validateFile(tenantId, size, mimeType, filename);

    // 2. Check quota
    if (this.usageService) {
      const quota = await this.usageService.checkQuota(tenantId, size);
      if (!quota.allowed) {
        throw new StorageError(
          'Storage quota exceeded',
          STORAGE_ERROR_CODES.QUOTA_EXCEEDED,
          507,
          { tenantId, size, remaining: quota.remaining }
        );
      }
    }

    // 3. Generate path
    const fileId = generateFileId();
    const extension = getExtension(filename);
    const path = generateStoragePath(tenantId, projectId, fileId, extension);
    const category = getCategoryFromMime(mimeType);

    // 4. Create presigned URL
    const { signedUrl } = await this.storage.createSignedUploadUrl('uploads', path);

    // 5. Create pending file record
    await this.createFileRecord({
      id: fileId,
      tenant_id: tenantId,
      project_id: projectId || null,
      name: filename,
      path,
      bucket: 'uploads',
      mime_type: mimeType,
      extension,
      category,
      size_bytes: size,
      status: 'pending',
      is_public: isPublic,
      metadata: {},
    });

    const expiresAt = new Date(Date.now() + STORAGE_TIMEOUTS.PRESIGNED_URL_EXPIRY * 1000);

    return {
      fileId,
      uploadUrl: signedUrl,
      expiresAt,
      path,
    };
  }

  /**
   * Confirm presigned upload completed
   */
  async confirmPresignedUpload(fileId: string): Promise<UploadResult> {
    const file = await this.getFileRecord(fileId);

    if (!file) {
      throw new StorageError('File not found', STORAGE_ERROR_CODES.FILE_NOT_FOUND, 404);
    }

    // Verify file exists in storage
    const exists = await this.storage.exists(file.bucket as StorageBucket, file.path);
    if (!exists) {
      throw new StorageError('Upload not completed', STORAGE_ERROR_CODES.UPLOAD_INCOMPLETE, 400);
    }

    // Queue processing if image
    if (isImage(file.mime_type) && this.processingQueue) {
      await this.processingQueue.enqueue('storage:image-processing', {
        fileId,
        tenantId: file.tenant_id,
        path: file.path,
        bucket: file.bucket,
      });
    } else {
      await this.updateFileStatus(fileId, 'ready');
    }

    // Track usage
    if (this.usageService) {
      await this.usageService.trackUpload(file.tenant_id, file.size_bytes, file.category as FileCategory);
    }

    const url = file.is_public
      ? this.storage.getPublicUrl(file.bucket as StorageBucket, file.path)
      : await this.storage.createSignedUrl(file.bucket as StorageBucket, file.path);

    return {
      fileId,
      path: file.path,
      url,
      publicUrl: file.is_public ? url : undefined,
      size: file.size_bytes,
      mimeType: file.mime_type,
    };
  }

  // ============================================================
  // RESUMABLE UPLOAD (for large files)
  // ============================================================

  async createUploadSession(params: CreateSessionParams): Promise<UploadSession> {
    const {
      tenantId,
      projectId,
      filename,
      mimeType,
      totalSize,
      chunkSize = FILE_SIZE_LIMITS.CHUNK_SIZE,
    } = params;

    // 1. Validate
    await this.validateFile(tenantId, totalSize, mimeType, filename);

    // 2. Check quota
    if (this.usageService) {
      const quota = await this.usageService.checkQuota(tenantId, totalSize);
      if (!quota.allowed) {
        throw new StorageError(
          'Storage quota exceeded',
          STORAGE_ERROR_CODES.QUOTA_EXCEEDED,
          507,
          { tenantId, totalSize, remaining: quota.remaining }
        );
      }
    }

    // 3. Generate session
    const sessionId = generateFileId();
    const extension = getExtension(filename);
    const path = generateStoragePath(tenantId, projectId, sessionId, extension);
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const expiresAt = new Date(Date.now() + STORAGE_TIMEOUTS.UPLOAD_SESSION_EXPIRY * 1000);

    // 4. Create session record
    const { error } = await this.supabase.from('upload_sessions').insert({
      id: sessionId,
      tenant_id: tenantId,
      filename,
      mime_type: mimeType,
      total_size: totalSize,
      chunk_size: chunkSize,
      uploaded_bytes: 0,
      uploaded_chunks: [],
      target_bucket: 'uploads',
      target_path: path,
      project_id: projectId || null,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new ProviderError('supabase', 'createUploadSession', error as Error);
    }

    // 5. Generate upload URLs for each chunk
    const uploadUrls: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `chunks/${sessionId}/${i}`;
      const { signedUrl } = await this.storage.createSignedUploadUrl('uploads', chunkPath);
      uploadUrls.push(signedUrl);
    }

    return {
      sessionId,
      uploadUrls,
      chunkSize,
      totalChunks,
      expiresAt,
    };
  }

  async uploadChunk(sessionId: string, chunk: Chunk): Promise<ChunkResult> {
    // 1. Get session
    const session = await this.getUploadSession(sessionId);

    if (!session) {
      throw new UploadSessionInvalidError(sessionId, 'Session not found');
    }

    if (session.status !== 'active') {
      throw new UploadSessionInvalidError(sessionId, `Session status is ${session.status}`);
    }

    if (new Date(session.expires_at) < new Date()) {
      throw new UploadSessionExpiredError(sessionId);
    }

    // 2. Validate chunk index
    const totalChunks = Math.ceil(session.total_size / session.chunk_size);
    if (chunk.index < 0 || chunk.index >= totalChunks) {
      throw new UploadSessionInvalidError(sessionId, `Invalid chunk index: ${chunk.index}`);
    }

    // 3. Check if chunk already uploaded
    if (session.uploaded_chunks.includes(chunk.index)) {
      return {
        chunkIndex: chunk.index,
        uploaded: true,
        progress: session.uploaded_chunks.length / totalChunks,
      };
    }

    // 4. Upload chunk
    const chunkPath = `chunks/${sessionId}/${chunk.index}`;
    const buffer = await this.toBuffer(chunk.data);

    await this.storage.upload('uploads', chunkPath, buffer, {
      contentType: 'application/octet-stream',
    });

    // 5. Update session
    const uploadedChunks = [...session.uploaded_chunks, chunk.index].sort((a, b) => a - b);
    const uploadedBytes = session.uploaded_bytes + buffer.length;

    const { error } = await this.supabase
      .from('upload_sessions')
      .update({
        uploaded_bytes: uploadedBytes,
        uploaded_chunks: uploadedChunks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new ProviderError('supabase', 'updateUploadSession', error as Error);
    }

    return {
      chunkIndex: chunk.index,
      uploaded: true,
      progress: uploadedChunks.length / totalChunks,
    };
  }

  async completeUpload(sessionId: string): Promise<UploadResult> {
    // 1. Get session
    const session = await this.getUploadSession(sessionId);

    if (!session) {
      throw new UploadSessionInvalidError(sessionId, 'Session not found');
    }

    if (session.status !== 'active') {
      throw new UploadSessionInvalidError(sessionId, `Session status is ${session.status}`);
    }

    // 2. Verify all chunks uploaded
    const totalChunks = Math.ceil(session.total_size / session.chunk_size);
    if (session.uploaded_chunks.length !== totalChunks) {
      throw new UploadIncompleteError(
        sessionId,
        session.uploaded_chunks.length,
        totalChunks
      );
    }

    // 3. Merge chunks
    const mergedBuffer = await this.mergeChunks(sessionId, totalChunks);

    // 4. Upload merged file
    await this.storage.upload(
      session.target_bucket as StorageBucket,
      session.target_path,
      mergedBuffer,
      { contentType: session.mime_type }
    );

    // 5. Create file record
    const fileId = generateFileId();
    const extension = getExtension(session.filename);
    const category = getCategoryFromMime(session.mime_type);

    await this.createFileRecord({
      id: fileId,
      tenant_id: session.tenant_id,
      project_id: session.project_id,
      name: session.filename,
      path: session.target_path,
      bucket: session.target_bucket as StorageBucket,
      mime_type: session.mime_type,
      extension,
      category,
      size_bytes: session.total_size,
      status: 'pending',
      is_public: false,
      metadata: {},
    });

    // 6. Cleanup chunks
    await this.cleanupChunks(sessionId, totalChunks);

    // 7. Update session status
    await this.supabase
      .from('upload_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    // 8. Queue processing
    if (isImage(session.mime_type) && this.processingQueue) {
      await this.processingQueue.enqueue('storage:image-processing', {
        fileId,
        tenantId: session.tenant_id,
        path: session.target_path,
        bucket: session.target_bucket,
      });
    } else {
      await this.updateFileStatus(fileId, 'ready');
    }

    // 9. Track usage
    if (this.usageService) {
      await this.usageService.trackUpload(session.tenant_id, session.total_size, category);
    }

    // 10. Return result
    const url = await this.storage.createSignedUrl(
      session.target_bucket as StorageBucket,
      session.target_path
    );

    return {
      fileId,
      path: session.target_path,
      url,
      size: session.total_size,
      mimeType: session.mime_type,
    };
  }

  async cancelUpload(sessionId: string): Promise<void> {
    const session = await this.getUploadSession(sessionId);

    if (!session) {
      return; // Already cleaned up
    }

    // Cleanup chunks
    const totalChunks = Math.ceil(session.total_size / session.chunk_size);
    await this.cleanupChunks(sessionId, totalChunks);

    // Update session status
    await this.supabase
      .from('upload_sessions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  /**
   * Get upload session status
   */
  async getUploadSessionStatus(sessionId: string): Promise<{
    status: string;
    progress: number;
    uploadedChunks: number;
    totalChunks: number;
  } | null> {
    const session = await this.getUploadSession(sessionId);

    if (!session) return null;

    const totalChunks = Math.ceil(session.total_size / session.chunk_size);

    return {
      status: session.status,
      progress: session.uploaded_chunks.length / totalChunks,
      uploadedChunks: session.uploaded_chunks.length,
      totalChunks,
    };
  }

  // ============================================================
  // BATCH UPLOAD
  // ============================================================

  async uploadMultiple(files: UploadParams[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    // Upload in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map((params, idx) =>
          this.upload(params).then(result => ({ index: i + idx, result }))
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results[result.value.index] = result.value.result;
        } else {
          errors.push({
            index: i + batchResults.indexOf(result),
            error: result.reason,
          });
        }
      }
    }

    if (errors.length > 0 && errors.length === files.length) {
      throw new StorageError(
        `All uploads failed`,
        STORAGE_ERROR_CODES.UPLOAD_FAILED,
        500,
        { errors: errors.map(e => ({ index: e.index, message: e.error.message })) }
      );
    }

    return results;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async validateFile(
    tenantId: string,
    size: number,
    mimeType: string,
    filename: string
  ): Promise<void> {
    // Check MIME type
    if (!isAllowedMimeType(mimeType)) {
      throw new InvalidFileTypeError(mimeType);
    }

    // Get tenant plan limits
    const planLimits = await this.getTenantPlanLimits(tenantId);

    // Check file size against plan limits
    if (size > planLimits.maxFileSize) {
      throw new FileTooLargeError(size, planLimits.maxFileSize);
    }

    // Check specific limits by type
    if (isImage(mimeType) && size > planLimits.maxImageSize) {
      throw new FileTooLargeError(size, planLimits.maxImageSize, { type: 'image' });
    }

    if (isVideo(mimeType)) {
      if (!planLimits.videoAllowed) {
        throw new StorageError(
          'Video uploads require Pro plan or higher',
          STORAGE_ERROR_CODES.INVALID_FILE_TYPE,
          403
        );
      }
      if (size > planLimits.maxVideoSize) {
        throw new FileTooLargeError(size, planLimits.maxVideoSize, { type: 'video' });
      }
    }

    // Validate filename
    if (!filename || filename.length > 255) {
      throw new StorageError(
        'Invalid filename',
        STORAGE_ERROR_CODES.INVALID_FILENAME,
        400
      );
    }
  }

  private async getTenantPlanLimits(tenantId: string): Promise<ReturnType<typeof getPlanLimits>> {
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    return getPlanLimits((tenant as TenantPlan)?.plan || 'free');
  }

  private getFileSize(file: File | Buffer | ArrayBuffer): number {
    if (file instanceof Buffer) {
      return file.length;
    }
    if (file instanceof ArrayBuffer) {
      return file.byteLength;
    }
    // File type has .size property
    return (file as File).size;
  }

  private async toBuffer(file: File | Buffer | ArrayBuffer): Promise<Buffer> {
    if (file instanceof Buffer) {
      return file;
    }
    if (file instanceof ArrayBuffer) {
      return Buffer.from(file);
    }
    // File type has .arrayBuffer() method
    const arrayBuffer = await (file as File).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async createFileRecord(data: Partial<DbFile> & { id: string; tenant_id: string }): Promise<DbFile> {
    const now = new Date().toISOString();

    const { data: file, error } = await this.supabase
      .from('files')
      .insert({
        ...data,
        variants: data.variants || {},
        metadata: data.metadata || {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'createFileRecord', error as Error);
    }

    return file as DbFile;
  }

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

  private async updateFileStatus(fileId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('files')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (error) {
      throw new ProviderError('supabase', 'updateFileStatus', error as Error);
    }
  }

  private async getUploadSession(sessionId: string): Promise<DbUploadSession | null> {
    const { data, error } = await this.supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ProviderError('supabase', 'getUploadSession', error as Error);
    }

    return data as DbUploadSession;
  }

  private async mergeChunks(sessionId: string, totalChunks: number): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `chunks/${sessionId}/${i}`;
      const chunkBuffer = await this.storage.download('uploads', chunkPath);
      chunks.push(chunkBuffer);
    }

    return Buffer.concat(chunks);
  }

  private async cleanupChunks(sessionId: string, totalChunks: number): Promise<void> {
    const chunkPaths: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
      chunkPaths.push(`chunks/${sessionId}/${i}`);
    }

    try {
      await this.storage.deleteMany('uploads', chunkPaths);
    } catch (error) {
      // Log but don't throw - chunks will be cleaned up by scheduled job
      console.error(`Failed to cleanup chunks for session ${sessionId}:`, error);
    }
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createUploadService(deps: UploadServiceDependencies): UploadService {
  return new UploadServiceImpl(deps);
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let uploadServiceInstance: UploadService | null = null;

export function getUploadService(deps?: UploadServiceDependencies): UploadService {
  if (!uploadServiceInstance && deps) {
    uploadServiceInstance = createUploadService(deps);
  }
  if (!uploadServiceInstance) {
    throw new Error('Upload service not initialized. Call createUploadService first.');
  }
  return uploadServiceInstance;
}

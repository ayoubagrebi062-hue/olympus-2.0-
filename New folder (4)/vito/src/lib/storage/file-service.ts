/**
 * OLYMPUS 2.0 - File Service
 * ==========================
 * File retrieval, URL generation, and management operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbFile,
  FileWithUrls,
  FileService,
  ListFilesParams,
  SearchParams,
  PaginatedResult,
  StorageBucket,
  FileCategory,
} from './types';
import { STORAGE_TIMEOUTS } from './constants';
import {
  FileNotFoundError,
  FileAccessDeniedError,
  ProviderError,
  StorageError,
  STORAGE_ERROR_CODES,
} from './errors';
import { StorageClient } from './supabase-client';

// ============================================================
// TYPES
// ============================================================

interface FileServiceDependencies {
  storageClient: StorageClient;
  supabase: SupabaseClient;
  cache?: CacheServiceLike;
  usageService?: UsageServiceLike;
}

interface CacheServiceLike {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface UsageServiceLike {
  trackDeletion(tenantId: string, size: number, category: FileCategory): Promise<void>;
  trackBandwidth(tenantId: string, bytes: number): Promise<void>;
}

// ============================================================
// FILE SERVICE IMPLEMENTATION
// ============================================================

export class FileServiceImpl implements FileService {
  private storage: StorageClient;
  private supabase: SupabaseClient;
  private cache?: CacheServiceLike;
  private usageService?: UsageServiceLike;

  constructor(deps: FileServiceDependencies) {
    this.storage = deps.storageClient;
    this.supabase = deps.supabase;
    this.cache = deps.cache;
    this.usageService = deps.usageService;
  }

  // ============================================================
  // GET FILE
  // ============================================================

  /**
   * Get file by ID with URLs
   */
  async getFile(fileId: string): Promise<FileWithUrls> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<FileWithUrls>(`file:${fileId}`);
      if (cached) return cached;
    }

    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    // Check if soft-deleted
    if (file.deleted_at) {
      throw new FileNotFoundError(fileId, { deleted: true });
    }

    const fileWithUrls = await this.enrichWithUrls(file);

    // Cache for 5 minutes
    if (this.cache) {
      await this.cache.set(`file:${fileId}`, fileWithUrls, { ttl: 300 });
    }

    return fileWithUrls;
  }

  /**
   * Get multiple files by IDs
   */
  async getFiles(fileIds: string[]): Promise<FileWithUrls[]> {
    const files: FileWithUrls[] = [];

    // Batch fetch from database
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .in('id', fileIds)
      .is('deleted_at', null);

    if (error) {
      throw new ProviderError('supabase', 'getFiles', error as Error);
    }

    // Enrich with URLs
    for (const file of (data || []) as DbFile[]) {
      const enriched = await this.enrichWithUrls(file);
      files.push(enriched);
    }

    return files;
  }

  // ============================================================
  // URL GENERATION
  // ============================================================

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(fileId: string, expiresIn: number = 3600): Promise<string> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    const url = await this.storage.createSignedUrl(
      file.bucket as StorageBucket,
      file.path,
      { expiresIn }
    );

    // Track bandwidth
    if (this.usageService) {
      await this.usageService.trackBandwidth(file.tenant_id, file.size_bytes);
    }

    return url;
  }

  /**
   * Get public URL (for public files only)
   */
  async getPublicUrl(fileId: string): Promise<string> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (!file.is_public) {
      throw new FileAccessDeniedError(fileId, undefined, {
        reason: 'File is not public',
      });
    }

    return this.storage.getPublicUrl(file.bucket as StorageBucket, file.path);
  }

  /**
   * Get variant URL
   */
  async getVariantUrl(fileId: string, variant: string): Promise<string> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (!file.variants || !file.variants[variant]) {
      throw new StorageError(
        `Variant '${variant}' not found`,
        STORAGE_ERROR_CODES.FILE_NOT_FOUND,
        404,
        { fileId, variant, availableVariants: Object.keys(file.variants || {}) }
      );
    }

    const variantPath = file.variants[variant];

    if (file.is_public) {
      return this.storage.getPublicUrl(file.bucket as StorageBucket, variantPath);
    }

    return this.storage.createSignedUrl(file.bucket as StorageBucket, variantPath);
  }

  /**
   * Get download URL with proper headers
   */
  async getDownloadUrl(fileId: string, filename?: string): Promise<string> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    return this.storage.createSignedUrl(
      file.bucket as StorageBucket,
      file.path,
      {
        expiresIn: STORAGE_TIMEOUTS.PRESIGNED_URL_EXPIRY,
        download: filename || file.name,
      }
    );
  }

  // ============================================================
  // DOWNLOAD
  // ============================================================

  /**
   * Download file content
   */
  async download(fileId: string): Promise<Buffer> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    const buffer = await this.storage.download(
      file.bucket as StorageBucket,
      file.path
    );

    // Track bandwidth
    if (this.usageService) {
      await this.usageService.trackBandwidth(file.tenant_id, buffer.length);
    }

    return buffer;
  }

  /**
   * Download variant
   */
  async downloadVariant(fileId: string, variant: string): Promise<Buffer> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (!file.variants || !file.variants[variant]) {
      throw new StorageError(
        `Variant '${variant}' not found`,
        STORAGE_ERROR_CODES.FILE_NOT_FOUND,
        404
      );
    }

    const buffer = await this.storage.download(
      file.bucket as StorageBucket,
      file.variants[variant]
    );

    // Track bandwidth
    if (this.usageService) {
      await this.usageService.trackBandwidth(file.tenant_id, buffer.length);
    }

    return buffer;
  }

  // ============================================================
  // DELETE
  // ============================================================

  /**
   * Delete file (soft delete by default)
   */
  async delete(fileId: string, hard: boolean = false): Promise<void> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    if (hard) {
      // Hard delete - remove from storage
      await this.hardDelete(file);
    } else {
      // Soft delete - mark as deleted
      await this.softDelete(fileId);
    }

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`file:${fileId}`);
    }
  }

  /**
   * Soft delete - mark file as deleted
   */
  private async softDelete(fileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('files')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (error) {
      throw new ProviderError('supabase', 'softDelete', error as Error);
    }
  }

  /**
   * Hard delete - remove from storage and database
   */
  private async hardDelete(file: DbFile): Promise<void> {
    // 1. Delete variants from storage
    if (file.variants) {
      const variantPaths = Object.values(file.variants);
      if (variantPaths.length > 0) {
        try {
          await this.storage.deleteMany(file.bucket as StorageBucket, variantPaths);
        } catch (error) {
          console.error('Failed to delete variants:', error);
        }
      }
    }

    // 2. Delete original from storage
    try {
      await this.storage.delete(file.bucket as StorageBucket, file.path);
    } catch (error) {
      console.error('Failed to delete original:', error);
    }

    // 3. Delete from database
    const { error } = await this.supabase
      .from('files')
      .delete()
      .eq('id', file.id);

    if (error) {
      throw new ProviderError('supabase', 'hardDelete', error as Error);
    }

    // 4. Update usage
    if (this.usageService) {
      await this.usageService.trackDeletion(
        file.tenant_id,
        file.size_bytes,
        file.category as FileCategory
      );
    }
  }

  /**
   * Restore soft-deleted file
   */
  async restore(fileId: string): Promise<FileWithUrls> {
    const { data, error } = await this.supabase
      .from('files')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'restore', error as Error);
    }

    return this.enrichWithUrls(data as DbFile);
  }

  /**
   * Delete multiple files
   */
  async deleteMany(fileIds: string[], hard: boolean = false): Promise<void> {
    for (const fileId of fileIds) {
      try {
        await this.delete(fileId, hard);
      } catch (error) {
        console.error(`Failed to delete file ${fileId}:`, error);
      }
    }
  }

  // ============================================================
  // LIST FILES
  // ============================================================

  /**
   * List files with pagination
   */
  async listFiles(params: ListFilesParams): Promise<PaginatedResult<FileWithUrls>> {
    const {
      tenantId,
      projectId,
      category,
      status,
      bucket,
      cursor,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = params;

    let query = this.supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit);

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (bucket) {
      query = query.eq('bucket', bucket);
    }

    // Apply cursor pagination
    if (cursor) {
      const cursorDate = new Date(cursor).toISOString();
      if (orderDirection === 'desc') {
        query = query.lt(orderBy, cursorDate);
      } else {
        query = query.gt(orderBy, cursorDate);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ProviderError('supabase', 'listFiles', error as Error);
    }

    const files = data as DbFile[] || [];
    const enrichedFiles = await Promise.all(
      files.map(f => this.enrichWithUrls(f))
    );

    // Calculate next cursor
    let nextCursor: string | null = null;
    if (files.length === limit) {
      const lastFile = files[files.length - 1];
      nextCursor = lastFile[orderBy as keyof DbFile] as string;
    }

    return {
      data: enrichedFiles,
      nextCursor,
      totalCount: count || undefined,
    };
  }

  /**
   * List files by project
   */
  async listByProject(
    projectId: string,
    options: { category?: FileCategory; limit?: number } = {}
  ): Promise<FileWithUrls[]> {
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(options.limit || 100);

    if (error) {
      throw new ProviderError('supabase', 'listByProject', error as Error);
    }

    let files = data as DbFile[] || [];

    if (options.category) {
      files = files.filter(f => f.category === options.category);
    }

    return Promise.all(files.map(f => this.enrichWithUrls(f)));
  }

  // ============================================================
  // SEARCH FILES
  // ============================================================

  /**
   * Search files by name
   */
  async searchFiles(params: SearchParams): Promise<FileWithUrls[]> {
    const {
      tenantId,
      query,
      category,
      mimeTypes,
      minSize,
      maxSize,
      limit = 20,
    } = params;

    let dbQuery = this.supabase
      .from('files')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }
    if (mimeTypes && mimeTypes.length > 0) {
      dbQuery = dbQuery.in('mime_type', mimeTypes);
    }
    if (minSize) {
      dbQuery = dbQuery.gte('size_bytes', minSize);
    }
    if (maxSize) {
      dbQuery = dbQuery.lte('size_bytes', maxSize);
    }

    const { data, error } = await dbQuery;

    if (error) {
      throw new ProviderError('supabase', 'searchFiles', error as Error);
    }

    const files = data as DbFile[] || [];
    return Promise.all(files.map(f => this.enrichWithUrls(f)));
  }

  /**
   * Full-text search
   */
  async fullTextSearch(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<FileWithUrls[]> {
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .textSearch('name', query, { type: 'websearch' })
      .limit(limit);

    if (error) {
      throw new ProviderError('supabase', 'fullTextSearch', error as Error);
    }

    const files = data as DbFile[] || [];
    return Promise.all(files.map(f => this.enrichWithUrls(f)));
  }

  // ============================================================
  // UPDATE
  // ============================================================

  /**
   * Update file metadata
   */
  async updateMetadata(
    fileId: string,
    metadata: Record<string, unknown>
  ): Promise<FileWithUrls> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    const { data, error } = await this.supabase
      .from('files')
      .update({
        metadata: { ...file.metadata, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'updateMetadata', error as Error);
    }

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`file:${fileId}`);
    }

    return this.enrichWithUrls(data as DbFile);
  }

  /**
   * Rename file
   */
  async rename(fileId: string, newName: string): Promise<FileWithUrls> {
    const { data, error } = await this.supabase
      .from('files')
      .update({
        name: newName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'rename', error as Error);
    }

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`file:${fileId}`);
    }

    return this.enrichWithUrls(data as DbFile);
  }

  /**
   * Set file public/private
   */
  async setPublic(fileId: string, isPublic: boolean): Promise<FileWithUrls> {
    const file = await this.getFileRecord(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }

    const publicUrl = isPublic
      ? this.storage.getPublicUrl(file.bucket as StorageBucket, file.path)
      : null;

    const { data, error } = await this.supabase
      .from('files')
      .update({
        is_public: isPublic,
        public_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'setPublic', error as Error);
    }

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`file:${fileId}`);
    }

    return this.enrichWithUrls(data as DbFile);
  }

  /**
   * Move file to different project
   */
  async moveToProject(fileId: string, projectId: string | null): Promise<FileWithUrls> {
    const { data, error } = await this.supabase
      .from('files')
      .update({
        project_id: projectId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new ProviderError('supabase', 'moveToProject', error as Error);
    }

    // Clear cache
    if (this.cache) {
      await this.cache.delete(`file:${fileId}`);
    }

    return this.enrichWithUrls(data as DbFile);
  }

  // ============================================================
  // HELPERS
  // ============================================================

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
   * Enrich file with URLs
   */
  private async enrichWithUrls(file: DbFile): Promise<FileWithUrls> {
    const result: FileWithUrls = {
      ...file,
      url: '',
    };

    // Generate main URL
    if (file.is_public) {
      const publicUrl = this.storage.getPublicUrl(
        file.bucket as StorageBucket,
        file.path
      );
      result.url = publicUrl;
      result.publicUrl = publicUrl;
    } else {
      result.url = await this.storage.createSignedUrl(
        file.bucket as StorageBucket,
        file.path
      );
    }

    // Generate variant URLs
    if (file.variants && Object.keys(file.variants).length > 0) {
      result.variantUrls = {};

      for (const [name, path] of Object.entries(file.variants)) {
        if (file.is_public) {
          result.variantUrls[name] = this.storage.getPublicUrl(
            file.bucket as StorageBucket,
            path
          );
        } else {
          result.variantUrls[name] = await this.storage.createSignedUrl(
            file.bucket as StorageBucket,
            path
          );
        }
      }
    }

    return result;
  }
}

// ============================================================
// FACTORY & SINGLETON
// ============================================================

export function createFileService(deps: FileServiceDependencies): FileService {
  return new FileServiceImpl(deps);
}

let fileServiceInstance: FileService | null = null;

export function getFileService(deps?: FileServiceDependencies): FileService {
  if (!fileServiceInstance && deps) {
    fileServiceInstance = createFileService(deps);
  }
  if (!fileServiceInstance) {
    throw new Error('File service not initialized');
  }
  return fileServiceInstance;
}

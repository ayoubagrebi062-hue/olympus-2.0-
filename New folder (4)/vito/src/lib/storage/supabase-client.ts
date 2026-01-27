/**
 * OLYMPUS 2.0 - Supabase Storage Client
 * =====================================
 * Wrapper around Supabase Storage with typed operations.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StorageBucket } from './types';
import { STORAGE_BUCKETS, CACHE_CONTROL, CACHE_BY_CATEGORY, getCategoryFromMime } from './constants';
import { ProviderError, BucketNotFoundError } from './errors';

// ============================================================
// TYPES
// ============================================================

export interface StorageClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  serviceRoleKey?: string;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  duplex?: 'half';
}

export interface DownloadOptions {
  transform?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'origin' | 'webp' | 'avif';
    resize?: 'cover' | 'contain' | 'fill';
  };
}

export interface SignedUrlOptions {
  expiresIn?: number;
  download?: boolean | string;
  transform?: DownloadOptions['transform'];
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  sortBy?: {
    column: string;
    order: 'asc' | 'desc';
  };
  search?: string;
}

export interface StorageObject {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// STORAGE CLIENT CLASS
// ============================================================

export class StorageClient {
  private supabase: SupabaseClient;
  private serviceSupabase: SupabaseClient | null = null;

  constructor(options: StorageClientOptions = {}) {
    const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = options.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = options.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    if (serviceRoleKey) {
      this.serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get service role client (for admin operations)
   */
  getServiceClient(): SupabaseClient {
    if (!this.serviceSupabase) {
      throw new Error('Service role key not configured');
    }
    return this.serviceSupabase;
  }

  // ============================================================
  // UPLOAD OPERATIONS
  // ============================================================

  /**
   * Upload a file to storage
   */
  async upload(
    bucket: StorageBucket,
    path: string,
    data: Buffer | ArrayBuffer | Blob | File,
    options: UploadOptions = {}
  ): Promise<{ path: string }> {
    this.validateBucket(bucket);

    const cacheControl = options.cacheControl ||
      (options.contentType ? CACHE_BY_CATEGORY[getCategoryFromMime(options.contentType)] : CACHE_CONTROL.private);

    const { data: result, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, data, {
        contentType: options.contentType,
        cacheControl,
        upsert: options.upsert ?? false,
      });

    if (error) {
      throw new ProviderError('supabase', 'upload', error as Error, {
        bucket,
        path,
      });
    }

    return { path: result.path };
  }

  /**
   * Upload with auto-retry
   */
  async uploadWithRetry(
    bucket: StorageBucket,
    path: string,
    data: Buffer | ArrayBuffer | Blob | File,
    options: UploadOptions = {},
    maxRetries: number = 3
  ): Promise<{ path: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.upload(bucket, path, data, options);
      } catch (error) {
        lastError = error as Error;
        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError;
  }

  /**
   * Create a signed upload URL
   */
  async createSignedUploadUrl(
    bucket: StorageBucket,
    path: string
  ): Promise<{ signedUrl: string; token: string; path: string }> {
    this.validateBucket(bucket);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error) {
      throw new ProviderError('supabase', 'createSignedUploadUrl', error as Error, {
        bucket,
        path,
      });
    }

    return data;
  }

  // ============================================================
  // DOWNLOAD OPERATIONS
  // ============================================================

  /**
   * Download a file
   */
  async download(
    bucket: StorageBucket,
    path: string,
    options?: DownloadOptions
  ): Promise<Buffer> {
    this.validateBucket(bucket);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path, options as any);

    if (error) {
      throw new ProviderError('supabase', 'download', error as Error, {
        bucket,
        path,
      });
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get a signed URL for private files
   */
  async createSignedUrl(
    bucket: StorageBucket,
    path: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    this.validateBucket(bucket);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, options.expiresIn || 3600, {
        download: options.download,
        transform: options.transform as any,
      });

    if (error) {
      throw new ProviderError('supabase', 'createSignedUrl', error as Error, {
        bucket,
        path,
      });
    }

    return data.signedUrl;
  }

  /**
   * Get public URL (for public buckets)
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    this.validateBucket(bucket);

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Get public URL with transformations
   */
  getPublicUrlWithTransform(
    bucket: StorageBucket,
    path: string,
    transform: DownloadOptions['transform']
  ): string {
    this.validateBucket(bucket);

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path, { transform: transform as any });

    return data.publicUrl;
  }

  // ============================================================
  // DELETE OPERATIONS
  // ============================================================

  /**
   * Delete a single file
   */
  async delete(bucket: StorageBucket, path: string): Promise<void> {
    this.validateBucket(bucket);

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new ProviderError('supabase', 'delete', error as Error, {
        bucket,
        path,
      });
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMany(bucket: StorageBucket, paths: string[]): Promise<void> {
    this.validateBucket(bucket);

    if (paths.length === 0) return;

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new ProviderError('supabase', 'deleteMany', error as Error, {
        bucket,
        paths,
      });
    }
  }

  // ============================================================
  // LIST OPERATIONS
  // ============================================================

  /**
   * List files in a folder
   */
  async list(
    bucket: StorageBucket,
    folder: string = '',
    options: ListOptions = {}
  ): Promise<StorageObject[]> {
    this.validateBucket(bucket);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(folder, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: options.sortBy,
        search: options.search,
      });

    if (error) {
      throw new ProviderError('supabase', 'list', error as Error, {
        bucket,
        folder,
      });
    }

    return data || [];
  }

  /**
   * List all files recursively
   */
  async listAll(
    bucket: StorageBucket,
    folder: string = ''
  ): Promise<StorageObject[]> {
    const allFiles: StorageObject[] = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const files = await this.list(bucket, folder, { limit, offset });

      if (files.length === 0) break;

      allFiles.push(...files);

      if (files.length < limit) break;

      offset += limit;
    }

    return allFiles;
  }

  // ============================================================
  // MOVE/COPY OPERATIONS
  // ============================================================

  /**
   * Move a file
   */
  async move(
    bucket: StorageBucket,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    this.validateBucket(bucket);

    const { error } = await this.supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      throw new ProviderError('supabase', 'move', error as Error, {
        bucket,
        fromPath,
        toPath,
      });
    }
  }

  /**
   * Copy a file
   */
  async copy(
    bucket: StorageBucket,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    this.validateBucket(bucket);

    const { error } = await this.supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      throw new ProviderError('supabase', 'copy', error as Error, {
        bucket,
        fromPath,
        toPath,
      });
    }
  }

  // ============================================================
  // BUCKET OPERATIONS (Admin)
  // ============================================================

  /**
   * Create a bucket (requires service role)
   */
  async createBucket(
    bucket: string,
    options: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] } = {}
  ): Promise<void> {
    const client = this.getServiceClient();

    const { error } = await client.storage.createBucket(bucket, {
      public: options.public ?? false,
      fileSizeLimit: options.fileSizeLimit,
      allowedMimeTypes: options.allowedMimeTypes,
    });

    if (error && !error.message.includes('already exists')) {
      throw new ProviderError('supabase', 'createBucket', error as Error, { bucket });
    }
  }

  /**
   * Empty a bucket (requires service role)
   */
  async emptyBucket(bucket: StorageBucket): Promise<void> {
    const client = this.getServiceClient();

    const { error } = await client.storage.emptyBucket(bucket);

    if (error) {
      throw new ProviderError('supabase', 'emptyBucket', error as Error, { bucket });
    }
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Check if a file exists
   */
  async exists(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      const folder = path.substring(0, path.lastIndexOf('/'));
      const filename = path.substring(path.lastIndexOf('/') + 1);

      const files = await this.list(bucket, folder, { search: filename });
      return files.some(f => f.name === filename);
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(bucket: StorageBucket, path: string): Promise<StorageObject | null> {
    const folder = path.substring(0, path.lastIndexOf('/'));
    const filename = path.substring(path.lastIndexOf('/') + 1);

    const files = await this.list(bucket, folder, { search: filename });
    return files.find(f => f.name === filename) || null;
  }

  /**
   * Validate bucket exists
   */
  private validateBucket(bucket: StorageBucket): void {
    if (!STORAGE_BUCKETS[bucket]) {
      throw new BucketNotFoundError(bucket);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let storageClientInstance: StorageClient | null = null;

export function getStorageClient(options?: StorageClientOptions): StorageClient {
  if (!storageClientInstance) {
    storageClientInstance = new StorageClient(options);
  }
  return storageClientInstance;
}

export function createStorageClient(options?: StorageClientOptions): StorageClient {
  return new StorageClient(options);
}

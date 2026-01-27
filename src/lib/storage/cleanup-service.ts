/**
 * OLYMPUS 2.0 - Cleanup Service
 * =============================
 * Automatic cleanup of orphaned files, expired sessions, and soft-deleted files.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DbFile,
  DbUploadSession,
  CleanupResult,
  FullCleanupResult,
  CleanupService,
  StorageBucket,
  FileCategory,
} from './types';
import { STORAGE_TIMEOUTS, STORAGE_BUCKETS } from './constants';
import { ProviderError } from './errors';
import { StorageClient } from './supabase-client';

// ============================================================
// TYPES
// ============================================================

interface CleanupServiceDependencies {
  storageClient: StorageClient;
  supabase: SupabaseClient;
  usageService?: UsageServiceLike;
  logger?: LoggerLike;
}

interface UsageServiceLike {
  trackDeletion(tenantId: string, size: number, category: FileCategory): Promise<void>;
}

interface LoggerLike {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// Default console logger
const defaultLogger: LoggerLike = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
};

// ============================================================
// CLEANUP SERVICE IMPLEMENTATION
// ============================================================

export class CleanupServiceImpl implements CleanupService {
  private storage: StorageClient;
  private supabase: SupabaseClient;
  private usageService?: UsageServiceLike;
  private logger: LoggerLike;

  constructor(deps: CleanupServiceDependencies) {
    this.storage = deps.storageClient;
    this.supabase = deps.supabase;
    this.usageService = deps.usageService;
    this.logger = deps.logger || defaultLogger;
  }

  // ============================================================
  // ORPHANED FILES CLEANUP
  // ============================================================

  /**
   * Clean orphaned files (in storage but not in database)
   */
  async cleanOrphanedFiles(): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    const buckets: StorageBucket[] = ['uploads', 'assets', 'builds', 'exports'];

    for (const bucket of buckets) {
      try {
        const result = await this.cleanOrphanedInBucket(bucket);
        cleaned += result.cleaned;
        freedBytes += result.freedBytes;
      } catch (error) {
        this.logger.error(`Failed to clean orphaned files in bucket ${bucket}`, {
          error: (error as Error).message,
        });
      }
    }

    this.logger.info(`Orphaned files cleanup complete`, { cleaned, freedBytes });

    return { cleaned, freedBytes };
  }

  /**
   * Clean orphaned files in a specific bucket
   */
  private async cleanOrphanedInBucket(bucket: StorageBucket): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    // List all files in bucket (paginated)
    let offset = 0;
    const limit = 1000;

    while (true) {
      const files = await this.storage.list(bucket, '', { limit, offset });

      if (files.length === 0) break;

      for (const file of files) {
        // Skip directories
        if (!file.name || file.name.endsWith('/')) continue;

        // Check if file exists in database
        const { data: dbFile } = await this.supabase
          .from('files')
          .select('id')
          .eq('bucket', bucket)
          .eq('path', file.name)
          .single();

        if (!dbFile) {
          // Orphaned file - delete it
          try {
            await this.storage.delete(bucket, file.name);
            cleaned++;
            freedBytes += (file.metadata as Record<string, number>)?.size || 0;

            this.logger.info(`Deleted orphaned file: ${bucket}/${file.name}`);
          } catch (error) {
            this.logger.warn(`Failed to delete orphaned file: ${bucket}/${file.name}`, {
              error: (error as Error).message,
            });
          }
        }
      }

      if (files.length < limit) break;
      offset += limit;
    }

    return { cleaned, freedBytes };
  }

  // ============================================================
  // EXPIRED UPLOAD SESSIONS CLEANUP
  // ============================================================

  /**
   * Clean expired upload sessions and their chunks
   */
  async cleanExpiredSessions(): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    // Find expired sessions
    const { data: sessions, error } = await this.supabase
      .from('upload_sessions')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw new ProviderError('supabase', 'cleanExpiredSessions', error as Error);
    }

    for (const session of (sessions || []) as DbUploadSession[]) {
      try {
        const result = await this.cleanupSession(session);
        cleaned++;
        freedBytes += result.freedBytes;
      } catch (error) {
        this.logger.error(`Failed to cleanup session ${session.id}`, {
          error: (error as Error).message,
        });
      }
    }

    this.logger.info(`Expired sessions cleanup complete`, { cleaned, freedBytes });

    return { cleaned, freedBytes };
  }

  /**
   * Clean up a specific upload session
   */
  private async cleanupSession(session: DbUploadSession): Promise<{ freedBytes: number }> {
    let freedBytes = 0;

    // Calculate total chunks
    const totalChunks = Math.ceil(session.total_size / session.chunk_size);

    // Delete all chunks
    const chunkPaths: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      chunkPaths.push(`chunks/${session.id}/${i}`);
    }

    if (chunkPaths.length > 0) {
      try {
        // Get chunk sizes before deletion
        for (const path of chunkPaths) {
          const metadata = await this.storage.getMetadata('uploads', path);
          if (metadata) {
            freedBytes += (metadata.metadata as Record<string, number>)?.size || 0;
          }
        }

        await this.storage.deleteMany('uploads', chunkPaths);
      } catch (error) {
        this.logger.warn(`Failed to delete chunks for session ${session.id}`, {
          error: (error as Error).message,
        });
      }
    }

    // Update session status
    await this.supabase
      .from('upload_sessions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    this.logger.info(`Cleaned up expired session: ${session.id}`, {
      chunks: chunkPaths.length,
      freedBytes,
    });

    return { freedBytes };
  }

  // ============================================================
  // SOFT-DELETED FILES CLEANUP
  // ============================================================

  /**
   * Clean soft-deleted files older than threshold
   */
  async cleanDeletedFiles(olderThan: Date): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    // Find soft-deleted files older than threshold
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', olderThan.toISOString())
      .limit(1000);

    if (error) {
      throw new ProviderError('supabase', 'cleanDeletedFiles', error as Error);
    }

    for (const file of (files || []) as DbFile[]) {
      try {
        await this.hardDeleteFile(file);
        cleaned++;
        freedBytes += file.size_bytes;
      } catch (error) {
        this.logger.error(`Failed to hard delete file ${file.id}`, {
          error: (error as Error).message,
        });
      }
    }

    this.logger.info(`Deleted files cleanup complete`, { cleaned, freedBytes });

    return { cleaned, freedBytes };
  }

  /**
   * Hard delete a file and its variants
   */
  private async hardDeleteFile(file: DbFile): Promise<void> {
    // Delete variants
    if (file.variants && Object.keys(file.variants).length > 0) {
      const variantPaths = Object.values(file.variants);
      try {
        await this.storage.deleteMany(file.bucket as StorageBucket, variantPaths);
      } catch (error) {
        this.logger.warn(`Failed to delete variants for file ${file.id}`, {
          error: (error as Error).message,
        });
      }
    }

    // Delete original
    try {
      await this.storage.delete(file.bucket as StorageBucket, file.path);
    } catch (error) {
      this.logger.warn(`Failed to delete original file ${file.id}`, {
        error: (error as Error).message,
      });
    }

    // Delete from database
    await this.supabase.from('files').delete().eq('id', file.id);

    // Update usage (if service available)
    if (this.usageService) {
      await this.usageService.trackDeletion(
        file.tenant_id,
        file.size_bytes,
        file.category as FileCategory
      );
    }

    this.logger.info(`Hard deleted file: ${file.id}`, {
      path: file.path,
      size: file.size_bytes,
    });
  }

  // ============================================================
  // EXPIRED EXPORTS CLEANUP
  // ============================================================

  /**
   * Clean expired export files (older than 24 hours)
   */
  async cleanExpiredExports(): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    const threshold = new Date(Date.now() - STORAGE_TIMEOUTS.EXPORT_EXPIRY * 1000);

    // List all exports
    const files = await this.storage.listAll('exports');

    for (const file of files) {
      if (!file.created_at) continue;

      const createdAt = new Date(file.created_at);
      if (createdAt < threshold) {
        try {
          const size = (file.metadata as Record<string, number>)?.size || 0;
          await this.storage.delete('exports', file.name);
          cleaned++;
          freedBytes += size;

          this.logger.info(`Deleted expired export: ${file.name}`);
        } catch (error) {
          this.logger.warn(`Failed to delete expired export: ${file.name}`, {
            error: (error as Error).message,
          });
        }
      }
    }

    // Also delete from database
    await this.supabase
      .from('files')
      .delete()
      .eq('bucket', 'exports')
      .lt('created_at', threshold.toISOString());

    this.logger.info(`Expired exports cleanup complete`, { cleaned, freedBytes });

    return { cleaned, freedBytes };
  }

  // ============================================================
  // TEMPORARY FILES CLEANUP
  // ============================================================

  /**
   * Clean temporary files (chunks directory)
   */
  async cleanTempFiles(): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    // List chunks directory
    const chunkFolders = await this.storage.list('uploads', 'chunks');

    for (const folder of chunkFolders) {
      if (!folder.name) continue;

      // Check if folder is older than threshold
      const createdAt = folder.created_at ? new Date(folder.created_at) : new Date(0);
      if (createdAt < threshold) {
        // List and delete all files in folder
        const files = await this.storage.list('uploads', `chunks/${folder.name}`);
        const filePaths = files.map(f => `chunks/${folder.name}/${f.name}`);

        if (filePaths.length > 0) {
          try {
            await this.storage.deleteMany('uploads', filePaths);
            cleaned += filePaths.length;
            freedBytes += files.reduce(
              (sum, f) => sum + ((f.metadata as Record<string, number>)?.size || 0),
              0
            );
          } catch (error) {
            this.logger.warn(`Failed to delete temp files in chunks/${folder.name}`, {
              error: (error as Error).message,
            });
          }
        }
      }
    }

    this.logger.info(`Temp files cleanup complete`, { cleaned, freedBytes });

    return { cleaned, freedBytes };
  }

  // ============================================================
  // FULL CLEANUP
  // ============================================================

  /**
   * Run all cleanup tasks
   */
  async runFullCleanup(): Promise<FullCleanupResult> {
    this.logger.info('Starting full storage cleanup');

    const deletedFilesThreshold = new Date(
      Date.now() - STORAGE_TIMEOUTS.DELETED_FILE_RETENTION * 1000
    );

    const results: FullCleanupResult = {
      orphanedFiles: { cleaned: 0, freedBytes: 0 },
      expiredSessions: { cleaned: 0, freedBytes: 0 },
      deletedFiles: { cleaned: 0, freedBytes: 0 },
      expiredExports: { cleaned: 0, freedBytes: 0 },
      total: { cleaned: 0, freedBytes: 0 },
    };

    // Run each cleanup task
    try {
      results.expiredSessions = await this.cleanExpiredSessions();
    } catch (error) {
      this.logger.error('Failed to clean expired sessions', {
        error: (error as Error).message,
      });
    }

    try {
      results.deletedFiles = await this.cleanDeletedFiles(deletedFilesThreshold);
    } catch (error) {
      this.logger.error('Failed to clean deleted files', {
        error: (error as Error).message,
      });
    }

    try {
      results.expiredExports = await this.cleanExpiredExports();
    } catch (error) {
      this.logger.error('Failed to clean expired exports', {
        error: (error as Error).message,
      });
    }

    try {
      await this.cleanTempFiles();
    } catch (error) {
      this.logger.error('Failed to clean temp files', {
        error: (error as Error).message,
      });
    }

    // Orphaned files last (most expensive)
    try {
      results.orphanedFiles = await this.cleanOrphanedFiles();
    } catch (error) {
      this.logger.error('Failed to clean orphaned files', {
        error: (error as Error).message,
      });
    }

    // Calculate totals
    results.total = {
      cleaned:
        results.orphanedFiles.cleaned +
        results.expiredSessions.cleaned +
        results.deletedFiles.cleaned +
        results.expiredExports.cleaned,
      freedBytes:
        results.orphanedFiles.freedBytes +
        results.expiredSessions.freedBytes +
        results.deletedFiles.freedBytes +
        results.expiredExports.freedBytes,
    };

    this.logger.info('Full storage cleanup complete', {
      totalCleaned: results.total.cleaned,
      totalFreed: `${Math.round(results.total.freedBytes / 1024 / 1024)}MB`,
    });

    return results;
  }

  // ============================================================
  // TENANT-SPECIFIC CLEANUP
  // ============================================================

  /**
   * Clean all files for a tenant (when tenant is deleted)
   */
  async cleanTenantFiles(tenantId: string): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    // Get all files for tenant
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new ProviderError('supabase', 'cleanTenantFiles', error as Error);
    }

    for (const file of (files || []) as DbFile[]) {
      try {
        await this.hardDeleteFile(file);
        cleaned++;
        freedBytes += file.size_bytes;
      } catch (error) {
        this.logger.error(`Failed to delete tenant file ${file.id}`, {
          error: (error as Error).message,
        });
      }
    }

    // Clean upload sessions
    await this.supabase.from('upload_sessions').delete().eq('tenant_id', tenantId);

    // Clean storage usage
    await this.supabase.from('storage_usage').delete().eq('tenant_id', tenantId);

    this.logger.info(`Tenant files cleanup complete`, {
      tenantId,
      cleaned,
      freedBytes,
    });

    return { cleaned, freedBytes };
  }

  /**
   * Clean all files for a project (when project is deleted)
   */
  async cleanProjectFiles(projectId: string): Promise<CleanupResult> {
    let cleaned = 0;
    let freedBytes = 0;

    // Get all files for project
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new ProviderError('supabase', 'cleanProjectFiles', error as Error);
    }

    for (const file of (files || []) as DbFile[]) {
      try {
        await this.hardDeleteFile(file);
        cleaned++;
        freedBytes += file.size_bytes;
      } catch (error) {
        this.logger.error(`Failed to delete project file ${file.id}`, {
          error: (error as Error).message,
        });
      }
    }

    this.logger.info(`Project files cleanup complete`, {
      projectId,
      cleaned,
      freedBytes,
    });

    return { cleaned, freedBytes };
  }
}

// ============================================================
// FACTORY & SINGLETON
// ============================================================

export function createCleanupService(deps: CleanupServiceDependencies): CleanupService {
  return new CleanupServiceImpl(deps);
}

let cleanupServiceInstance: CleanupService | null = null;

export function getCleanupService(deps?: CleanupServiceDependencies): CleanupService {
  if (!cleanupServiceInstance && deps) {
    cleanupServiceInstance = createCleanupService(deps);
  }
  if (!cleanupServiceInstance) {
    throw new Error('Cleanup service not initialized');
  }
  return cleanupServiceInstance;
}

// ============================================================
// SCHEDULED JOB HELPER
// ============================================================

/**
 * Run cleanup as a scheduled job
 * Use with: cron: 0 3 * * * (daily at 3am)
 */
export async function runScheduledCleanup(deps: CleanupServiceDependencies): Promise<void> {
  const service = new CleanupServiceImpl(deps);
  await service.runFullCleanup();
}

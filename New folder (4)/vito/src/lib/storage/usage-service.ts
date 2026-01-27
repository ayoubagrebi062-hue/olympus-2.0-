/**
 * OLYMPUS 2.0 - Usage Service
 * ===========================
 * Storage quota checking, usage tracking, and bandwidth monitoring.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StorageUsage,
  QuotaCheck,
  BandwidthCheck,
  UsageStats,
  UsageService,
  FileCategory,
} from './types';
import { getPlanLimits, formatBytes } from './constants';
import {
  QuotaExceededError,
  BandwidthExceededError,
  ProviderError,
} from './errors';

// ============================================================
// TYPES
// ============================================================

interface UsageServiceDependencies {
  supabase: SupabaseClient;
}

interface TenantRecord {
  id: string;
  plan: string;
}

// Category column mapping
const CATEGORY_COLUMNS: Record<FileCategory, string> = {
  image: 'images_bytes',
  document: 'documents_bytes',
  video: 'videos_bytes',
  audio: 'audio_bytes',
  archive: 'archives_bytes',
  code: 'code_bytes',
  other: 'other_bytes',
};

// ============================================================
// USAGE SERVICE IMPLEMENTATION
// ============================================================

export class UsageServiceImpl implements UsageService {
  private supabase: SupabaseClient;

  constructor(deps: UsageServiceDependencies) {
    this.supabase = deps.supabase;
  }

  // ============================================================
  // QUOTA CHECKING
  // ============================================================

  /**
   * Check if upload is allowed within quota
   */
  async checkQuota(tenantId: string, fileSize: number): Promise<QuotaCheck> {
    const usage = await this.getOrCreateUsage(tenantId);

    const remaining = Math.max(0, usage.limit_bytes - usage.total_bytes);
    const wouldExceed = fileSize > remaining;

    return {
      allowed: !wouldExceed,
      currentUsage: usage.total_bytes,
      limit: usage.limit_bytes,
      remaining,
      wouldExceed,
      upgradeRequired: wouldExceed,
    };
  }

  /**
   * Check quota and throw if exceeded
   */
  async assertQuota(tenantId: string, fileSize: number): Promise<void> {
    const check = await this.checkQuota(tenantId, fileSize);

    if (!check.allowed) {
      throw new QuotaExceededError(
        tenantId,
        check.currentUsage,
        check.limit,
        fileSize
      );
    }
  }

  /**
   * Check bandwidth limit
   */
  async checkBandwidth(tenantId: string, bytes: number): Promise<BandwidthCheck> {
    const usage = await this.getOrCreateUsage(tenantId);

    // Check if bandwidth needs reset
    if (usage.bandwidth_reset_at && new Date(usage.bandwidth_reset_at) <= new Date()) {
      await this.resetBandwidth(tenantId);
      usage.bandwidth_used_bytes = 0;
    }

    const remaining = Math.max(0, usage.bandwidth_limit_bytes - usage.bandwidth_used_bytes);
    const allowed = bytes <= remaining;

    return {
      allowed,
      used: usage.bandwidth_used_bytes,
      limit: usage.bandwidth_limit_bytes,
      remaining,
      resetAt: usage.bandwidth_reset_at ? new Date(usage.bandwidth_reset_at) : null,
    };
  }

  /**
   * Check bandwidth and throw if exceeded
   */
  async assertBandwidth(tenantId: string, bytes: number): Promise<void> {
    const check = await this.checkBandwidth(tenantId, bytes);

    if (!check.allowed) {
      throw new BandwidthExceededError(
        tenantId,
        check.used,
        check.limit,
        check.resetAt || undefined
      );
    }
  }

  // ============================================================
  // USAGE TRACKING
  // ============================================================

  /**
   * Track file upload
   */
  async trackUpload(
    tenantId: string,
    size: number,
    category: FileCategory
  ): Promise<void> {
    const categoryColumn = CATEGORY_COLUMNS[category] || 'other_bytes';

    // Use RPC for atomic increment
    const { error } = await this.supabase.rpc('increment_storage_usage', {
      p_tenant_id: tenantId,
      p_size: size,
      p_category: categoryColumn,
    });

    if (error) {
      // Fallback to manual update if RPC doesn't exist
      await this.manualIncrement(tenantId, size, categoryColumn);
    }
  }

  /**
   * Track file deletion
   */
  async trackDeletion(
    tenantId: string,
    size: number,
    category: FileCategory
  ): Promise<void> {
    const categoryColumn = CATEGORY_COLUMNS[category] || 'other_bytes';

    // Use RPC for atomic decrement
    const { error } = await this.supabase.rpc('decrement_storage_usage', {
      p_tenant_id: tenantId,
      p_size: size,
      p_category: categoryColumn,
    });

    if (error) {
      // Fallback to manual update
      await this.manualDecrement(tenantId, size, categoryColumn);
    }
  }

  /**
   * Track bandwidth usage
   */
  async trackBandwidth(tenantId: string, bytes: number): Promise<void> {
    const { error } = await this.supabase.rpc('track_bandwidth_usage', {
      p_tenant_id: tenantId,
      p_bytes: bytes,
    });

    if (error) {
      // Fallback to manual update
      const usage = await this.getOrCreateUsage(tenantId);
      await this.supabase
        .from('storage_usage')
        .update({
          bandwidth_used_bytes: usage.bandwidth_used_bytes + bytes,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    }
  }

  // ============================================================
  // USAGE STATISTICS
  // ============================================================

  /**
   * Get detailed usage statistics
   */
  async getUsage(tenantId: string): Promise<UsageStats> {
    const usage = await this.getOrCreateUsage(tenantId);

    return {
      storage: {
        used: usage.total_bytes,
        limit: usage.limit_bytes,
        percentage: usage.limit_bytes > 0
          ? (usage.total_bytes / usage.limit_bytes) * 100
          : 0,
        byCategory: {
          images: usage.images_bytes,
          documents: usage.documents_bytes,
          videos: usage.videos_bytes,
          other: usage.other_bytes + usage.audio_bytes + usage.archives_bytes + usage.code_bytes,
        },
      },
      bandwidth: {
        used: usage.bandwidth_used_bytes,
        limit: usage.bandwidth_limit_bytes,
        percentage: usage.bandwidth_limit_bytes > 0
          ? (usage.bandwidth_used_bytes / usage.bandwidth_limit_bytes) * 100
          : 0,
        resetAt: usage.bandwidth_reset_at ? new Date(usage.bandwidth_reset_at) : null,
      },
      fileCount: usage.file_count,
    };
  }

  /**
   * Get usage summary (simplified)
   */
  async getUsageSummary(tenantId: string): Promise<{
    storageUsed: string;
    storageLimit: string;
    storagePercentage: number;
    bandwidthUsed: string;
    bandwidthLimit: string;
    bandwidthPercentage: number;
    fileCount: number;
  }> {
    const stats = await this.getUsage(tenantId);

    return {
      storageUsed: formatBytes(stats.storage.used),
      storageLimit: formatBytes(stats.storage.limit),
      storagePercentage: Math.round(stats.storage.percentage * 10) / 10,
      bandwidthUsed: formatBytes(stats.bandwidth.used),
      bandwidthLimit: formatBytes(stats.bandwidth.limit),
      bandwidthPercentage: Math.round(stats.bandwidth.percentage * 10) / 10,
      fileCount: stats.fileCount,
    };
  }

  // ============================================================
  // LIMIT MANAGEMENT
  // ============================================================

  /**
   * Update storage limits based on plan
   */
  async updateLimitsForPlan(tenantId: string, plan: string): Promise<void> {
    const limits = getPlanLimits(plan);

    const { error } = await this.supabase
      .from('storage_usage')
      .update({
        limit_bytes: limits.storage,
        bandwidth_limit_bytes: limits.bandwidth,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new ProviderError('supabase', 'updateLimitsForPlan', error as Error);
    }
  }

  /**
   * Set custom limits (for enterprise)
   */
  async setCustomLimits(
    tenantId: string,
    storageLimitBytes: number,
    bandwidthLimitBytes: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('storage_usage')
      .update({
        limit_bytes: storageLimitBytes,
        bandwidth_limit_bytes: bandwidthLimitBytes,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new ProviderError('supabase', 'setCustomLimits', error as Error);
    }
  }

  // ============================================================
  // BANDWIDTH RESET
  // ============================================================

  /**
   * Reset bandwidth for a tenant
   */
  async resetBandwidth(tenantId: string): Promise<void> {
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);

    const { error } = await this.supabase
      .from('storage_usage')
      .update({
        bandwidth_used_bytes: 0,
        bandwidth_reset_at: nextReset.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new ProviderError('supabase', 'resetBandwidth', error as Error);
    }
  }

  /**
   * Reset bandwidth for all tenants (scheduled job)
   */
  async resetAllExpiredBandwidth(): Promise<number> {
    const { data, error } = await this.supabase.rpc('reset_bandwidth_usage');

    if (error) {
      throw new ProviderError('supabase', 'resetAllExpiredBandwidth', error as Error);
    }

    return data as number || 0;
  }

  // ============================================================
  // RECALCULATION
  // ============================================================

  /**
   * Recalculate usage from actual files (for consistency)
   */
  async recalculateUsage(tenantId: string): Promise<UsageStats> {
    // Get all files for tenant
    const { data: files, error } = await this.supabase
      .from('files')
      .select('size_bytes, category')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      throw new ProviderError('supabase', 'recalculateUsage', error as Error);
    }

    // Calculate totals
    let totalBytes = 0;
    let imagesBytes = 0;
    let documentsBytes = 0;
    let videosBytes = 0;
    let audioBytes = 0;
    let archivesBytes = 0;
    let codeBytes = 0;
    let otherBytes = 0;

    for (const file of files || []) {
      totalBytes += file.size_bytes;

      switch (file.category) {
        case 'image':
          imagesBytes += file.size_bytes;
          break;
        case 'document':
          documentsBytes += file.size_bytes;
          break;
        case 'video':
          videosBytes += file.size_bytes;
          break;
        case 'audio':
          audioBytes += file.size_bytes;
          break;
        case 'archive':
          archivesBytes += file.size_bytes;
          break;
        case 'code':
          codeBytes += file.size_bytes;
          break;
        default:
          otherBytes += file.size_bytes;
      }
    }

    // Update storage usage
    const { error: updateError } = await this.supabase
      .from('storage_usage')
      .update({
        total_bytes: totalBytes,
        file_count: files?.length || 0,
        images_bytes: imagesBytes,
        documents_bytes: documentsBytes,
        videos_bytes: videosBytes,
        audio_bytes: audioBytes,
        archives_bytes: archivesBytes,
        code_bytes: codeBytes,
        other_bytes: otherBytes,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (updateError) {
      throw new ProviderError('supabase', 'recalculateUsage', updateError as Error);
    }

    return this.getUsage(tenantId);
  }

  // ============================================================
  // ALERTS & NOTIFICATIONS
  // ============================================================

  /**
   * Check if storage usage is above threshold
   */
  async checkStorageThreshold(
    tenantId: string,
    thresholdPercent: number = 80
  ): Promise<{
    exceeded: boolean;
    percentage: number;
    message?: string;
  }> {
    const stats = await this.getUsage(tenantId);
    const exceeded = stats.storage.percentage >= thresholdPercent;

    return {
      exceeded,
      percentage: stats.storage.percentage,
      message: exceeded
        ? `Storage usage is at ${Math.round(stats.storage.percentage)}%. Consider upgrading your plan.`
        : undefined,
    };
  }

  /**
   * Check if bandwidth usage is above threshold
   */
  async checkBandwidthThreshold(
    tenantId: string,
    thresholdPercent: number = 80
  ): Promise<{
    exceeded: boolean;
    percentage: number;
    resetAt: Date | null;
    message?: string;
  }> {
    const stats = await this.getUsage(tenantId);
    const exceeded = stats.bandwidth.percentage >= thresholdPercent;

    return {
      exceeded,
      percentage: stats.bandwidth.percentage,
      resetAt: stats.bandwidth.resetAt,
      message: exceeded
        ? `Bandwidth usage is at ${Math.round(stats.bandwidth.percentage)}%. Resets on ${stats.bandwidth.resetAt?.toLocaleDateString()}.`
        : undefined,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Get or create usage record for tenant
   */
  private async getOrCreateUsage(tenantId: string): Promise<StorageUsage> {
    // Try to get existing usage
    const { data: existing, error: selectError } = await this.supabase
      .from('storage_usage')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (existing && !selectError) {
      return existing as StorageUsage;
    }

    // Get tenant plan
    const { data: tenant } = await this.supabase
      .from('tenants')
      .select('plan')
      .eq('id', tenantId)
      .single();

    const plan = (tenant as TenantRecord)?.plan || 'free';
    const limits = getPlanLimits(plan);

    // Create new usage record
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);

    const newUsage = {
      tenant_id: tenantId,
      total_bytes: 0,
      file_count: 0,
      images_bytes: 0,
      documents_bytes: 0,
      videos_bytes: 0,
      audio_bytes: 0,
      archives_bytes: 0,
      code_bytes: 0,
      other_bytes: 0,
      limit_bytes: limits.storage,
      bandwidth_used_bytes: 0,
      bandwidth_limit_bytes: limits.bandwidth,
      bandwidth_reset_at: nextReset.toISOString(),
    };

    const { data: created, error: insertError } = await this.supabase
      .from('storage_usage')
      .insert(newUsage)
      .select()
      .single();

    if (insertError) {
      // Race condition - record may already exist
      const { data: retry } = await this.supabase
        .from('storage_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (retry) {
        return retry as StorageUsage;
      }

      throw new ProviderError('supabase', 'getOrCreateUsage', insertError as Error);
    }

    return created as StorageUsage;
  }

  /**
   * Manual increment (fallback if RPC not available)
   */
  private async manualIncrement(
    tenantId: string,
    size: number,
    categoryColumn: string
  ): Promise<void> {
    const usage = await this.getOrCreateUsage(tenantId);

    const updates: Record<string, number | string> = {
      total_bytes: usage.total_bytes + size,
      file_count: usage.file_count + 1,
      updated_at: new Date().toISOString(),
    };

    // Increment category
    const currentCategoryValue = ((usage as unknown) as Record<string, number>)[categoryColumn] || 0;
    updates[categoryColumn] = currentCategoryValue + size;

    await this.supabase
      .from('storage_usage')
      .update(updates)
      .eq('tenant_id', tenantId);
  }

  /**
   * Manual decrement (fallback if RPC not available)
   */
  private async manualDecrement(
    tenantId: string,
    size: number,
    categoryColumn: string
  ): Promise<void> {
    const usage = await this.getOrCreateUsage(tenantId);

    const updates: Record<string, number | string> = {
      total_bytes: Math.max(0, usage.total_bytes - size),
      file_count: Math.max(0, usage.file_count - 1),
      updated_at: new Date().toISOString(),
    };

    // Decrement category
    const currentCategoryValue = ((usage as unknown) as Record<string, number>)[categoryColumn] || 0;
    updates[categoryColumn] = Math.max(0, currentCategoryValue - size);

    await this.supabase
      .from('storage_usage')
      .update(updates)
      .eq('tenant_id', tenantId);
  }
}

// ============================================================
// FACTORY & SINGLETON
// ============================================================

export function createUsageService(deps: UsageServiceDependencies): UsageService {
  return new UsageServiceImpl(deps);
}

let usageServiceInstance: UsageService | null = null;

export function getUsageService(deps?: UsageServiceDependencies): UsageService {
  if (!usageServiceInstance && deps) {
    usageServiceInstance = createUsageService(deps);
  }
  if (!usageServiceInstance) {
    throw new Error('Usage service not initialized');
  }
  return usageServiceInstance;
}

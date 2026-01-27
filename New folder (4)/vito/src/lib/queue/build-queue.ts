/**
 * OLYMPUS 10X - Build Queue Manager
 *
 * Handles:
 * - Guest build queueing (before signup)
 * - Rate limit waitlists
 * - Queue expiration cleanup
 */

import { getRedisClient } from './redis-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface QueuedBuild {
  queueId: string;
  userId?: string;
  tenantId?: string;
  requestData: any;
  preview: {
    estimatedAgents: number;
    estimatedCost: number;
    estimatedDuration: string;
    features: string[];
  };
  createdAt: string;
  expiresAt: string;
}

interface WaitlistEntry {
  userId: string;
  buildData: any;
  timestamp: number;
}

export class BuildQueue {
  private redis;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Add guest build to queue (for unauthenticated users)
   * Stores in both PostgreSQL (persistent) and Redis (fast access)
   */
  async enqueueGuest(requestData: any, preview: any): Promise<string> {
    const supabase = await createServerSupabaseClient();

    // Store in PostgreSQL for persistence
    const { data, error } = await supabase
      .from('build_queue')
      .insert({
        request_data: requestData,
        preview_data: preview,
        status: 'pending',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      })
      .select('queue_id')
      .single();

    if (error) {
      console.error('[BuildQueue] Failed to enqueue in PostgreSQL:', error);
      throw new Error('Failed to queue build');
    }

    const queueId = data.queue_id;

    try {
      // Cache in Redis for fast access (1 hour TTL)
      const cacheData = JSON.stringify({
        queueId,
        requestData,
        preview,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      await this.redis.setex(`queue:${queueId}`, 3600, cacheData);
    } catch (redisError) {
      console.error('[BuildQueue] Redis cache failed (non-critical):', redisError);
      // Continue - PostgreSQL is source of truth
    }

    console.log(`[BuildQueue] Guest build queued: ${queueId}`);
    return queueId;
  }

  /**
   * Get queued build by ID (checks Redis first, then PostgreSQL)
   */
  async get(queueId: string): Promise<QueuedBuild | null> {
    try {
      // Try Redis first (fast)
      const cached = await this.redis.get(`queue:${queueId}`);
      if (cached) {
        return JSON.parse(cached) as QueuedBuild;
      }
    } catch (redisError) {
      console.error('[BuildQueue] Redis get failed, falling back to PostgreSQL:', redisError);
    }

    // Fallback to PostgreSQL
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('build_queue')
      .select('*')
      .eq('queue_id', queueId)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      queueId: data.queue_id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      requestData: data.request_data,
      preview: data.preview_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  }

  /**
   * Claim queued build after signup
   * Returns the original request data to create the build
   */
  async claim(queueId: string, userId: string, tenantId: string): Promise<any> {
    const supabase = await createServerSupabaseClient();

    // Get and verify queue entry
    const { data, error } = await supabase
      .from('build_queue')
      .select('*')
      .eq('queue_id', queueId)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      throw new Error('Queue entry not found or already claimed');
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      await supabase
        .from('build_queue')
        .update({ status: 'expired' })
        .eq('queue_id', queueId);

      throw new Error('Queue entry has expired');
    }

    // Mark as claimed
    const { error: updateError } = await supabase
      .from('build_queue')
      .update({
        status: 'claimed',
        user_id: userId,
        tenant_id: tenantId,
        claimed_at: new Date().toISOString(),
      })
      .eq('queue_id', queueId);

    if (updateError) {
      console.error('[BuildQueue] Failed to mark as claimed:', updateError);
      throw new Error('Failed to claim build');
    }

    // Remove from Redis cache
    try {
      await this.redis.del(`queue:${queueId}`);
    } catch (redisError) {
      console.error('[BuildQueue] Redis delete failed (non-critical):', redisError);
    }

    console.log(`[BuildQueue] Build claimed: ${queueId} by user ${userId}`);
    return data.request_data;
  }

  /**
   * Add to waitlist when rate limited
   * Uses Redis list for queue management
   */
  async addToWaitlist(tenantId: string, userId: string, buildData: any): Promise<number> {
    const key = `waitlist:${tenantId}`;
    const entry: WaitlistEntry = {
      userId,
      buildData,
      timestamp: Date.now(),
    };

    try {
      // Add to end of list
      const position = await this.redis.rpush(key, JSON.stringify(entry));

      // Set TTL on waitlist (24 hours)
      await this.redis.expire(key, 86400);

      console.log(`[BuildQueue] Added to waitlist: tenant ${tenantId}, position ${position}`);
      return position;
    } catch (error) {
      console.error('[BuildQueue] Failed to add to waitlist:', error);
      throw new Error('Failed to add to waitlist');
    }
  }

  /**
   * Get waitlist position for a user
   */
  async getWaitlistPosition(tenantId: string, userId: string): Promise<number | null> {
    const key = `waitlist:${tenantId}`;

    try {
      const list = await this.redis.lrange(key, 0, -1);

      for (let i = 0; i < list.length; i++) {
        const entry = JSON.parse(list[i]) as WaitlistEntry;
        if (entry.userId === userId) {
          return i + 1; // Position is 1-indexed
        }
      }

      return null; // Not in waitlist
    } catch (error) {
      console.error('[BuildQueue] Failed to get waitlist position:', error);
      return null;
    }
  }

  /**
   * Process next item in waitlist (after rate limit window expires)
   */
  async processWaitlist(tenantId: string): Promise<WaitlistEntry | null> {
    const key = `waitlist:${tenantId}`;

    try {
      // Get and remove first item
      const item = await this.redis.lpop(key);

      if (!item) {
        return null; // Waitlist empty
      }

      const entry = JSON.parse(item) as WaitlistEntry;
      console.log(`[BuildQueue] Processing waitlist entry for user ${entry.userId}`);
      return entry;
    } catch (error) {
      console.error('[BuildQueue] Failed to process waitlist:', error);
      return null;
    }
  }

  /**
   * Clear entire waitlist for a tenant
   */
  async clearWaitlist(tenantId: string): Promise<void> {
    const key = `waitlist:${tenantId}`;

    try {
      await this.redis.del(key);
      console.log(`[BuildQueue] Cleared waitlist for tenant ${tenantId}`);
    } catch (error) {
      console.error('[BuildQueue] Failed to clear waitlist:', error);
    }
  }

  /**
   * Clean expired queue entries (run as cron job)
   * Returns number of entries marked as expired
   */
  async cleanExpired(): Promise<number> {
    const supabase = await createServerSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('build_queue')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'pending')
        .select('queue_id');

      const count = data?.length || 0;

      if (count > 0) {
        console.log(`[BuildQueue] Marked ${count} queue entries as expired`);

        // Clean up Redis cache for expired entries
        for (const entry of data || []) {
          try {
            await this.redis.del(`queue:${entry.queue_id}`);
          } catch (redisError) {
            console.error('[BuildQueue] Redis cleanup failed (non-critical):', redisError);
          }
        }
      }

      return count;
    } catch (error) {
      console.error('[BuildQueue] Failed to clean expired entries:', error);
      return 0;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    claimed: number;
    expired: number;
    total: number;
  }> {
    const supabase = await createServerSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('build_queue')
        .select('status');

      if (error || !data) {
        return { pending: 0, claimed: 0, expired: 0, total: 0 };
      }

      const stats = {
        pending: data.filter(r => r.status === 'pending').length,
        claimed: data.filter(r => r.status === 'claimed').length,
        expired: data.filter(r => r.status === 'expired').length,
        total: data.length,
      };

      return stats;
    } catch (error) {
      console.error('[BuildQueue] Failed to get stats:', error);
      return { pending: 0, claimed: 0, expired: 0, total: 0 };
    }
  }
}

// Singleton instance
export const buildQueue = new BuildQueue();

/**
 * OLYMPUS 2.0 — Governance Ledger & Immutability
 * Phase 2.4: PostgreSQL Append-Only Ledger Store
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ILedgerStore,
  GovernanceLedgerEntry,
  LedgerHash,
  LedgerConsistencyCheck,
  BuildLevelLock,
} from './types';
import type { IAuditLogStore } from '../store/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BUILD_LOCK_TTL = 3600000;

export class PostgresLedgerStore implements ILedgerStore {
  private buildLocks: Map<string, BuildLevelLock> = new Map();

  async append(entry: GovernanceLedgerEntry): Promise<string> {
    const latestHash = await this.getLatestHash();
    const previousHash = latestHash || '';

    const { data, error } = await supabase
      .from('governance_ledger')
      .insert({
        build_id: entry.buildId,
        agent_id: entry.agentId,
        action_type: entry.actionType,
        action_data: {
          isLocked: true,
          lockedBy: 'system',
          lockedAt: new Date().toISOString(),
          reason: entry.actionData?.reason || 'system lock',
        },
        timestamp: new Date().toISOString(),
        immutable: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[PostgresLedgerStore] Append failed:', error);
      throw new Error(`Failed to append to ledger: ${error.message}`);
    }

    return data?.id || '';
  }

  async getEntries(buildId: string, limit: number = 100): Promise<GovernanceLedgerEntry[]> {
    const { data, error } = await supabase
      .from('governance_ledger')
      .select(
        'id, build_id, agent_id, action_type, action_data, timestamp, ledger_hash, previous_hash, immutable'
      )
      .eq('build_id', buildId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[PostgresLedgerStore] Query failed:', error);
      return [];
    }

    const entries = data.map(row => ({
      id: row.id as string,
      buildId: row.build_id as string,
      agentId: row.agent_id as string,
      actionType: row.action_type as GovernanceLedgerEntry['actionType'],
      actionData: (row.action_data || {}) as GovernanceLedgerEntry['actionData'],
      timestamp: new Date(row.timestamp as string),
      ledgerHash: row.ledger_hash as string,
      previousHash: row.previous_hash as string,
      immutable: row.immutable as boolean,
    }));

    return entries;
  }

  async getLatestHash(): Promise<string | null> {
    const { data, error } = await supabase
      .from('governance_ledger')
      .select('ledger_hash')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[PostgresLedgerStore] Query failed:', error);
      return null;
    }

    return data?.ledger_hash as string | null;
  }

  async verifyConsistency(): Promise<LedgerConsistencyCheck> {
    const { data, error } = await supabase
      .from('governance_ledger')
      .select(
        'id, build_id, agent_id, action_type, action_data, timestamp, ledger_hash, previous_hash'
      )
      .order('timestamp', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('[PostgresLedgerStore] Query failed:', error);
      return {
        isConsistent: false,
        totalEntries: 0,
        chainBrokenAt: undefined,
        expectedHash: undefined,
        actualHash: undefined,
      };
    }

    const rawEntries = data || [];

    // Map raw rows to GovernanceLedgerEntry
    const entries: GovernanceLedgerEntry[] = rawEntries.map(row => ({
      id: row.id as string,
      buildId: row.build_id as string,
      agentId: row.agent_id as string,
      actionType: row.action_type as GovernanceLedgerEntry['actionType'],
      actionData: (row.action_data || {}) as GovernanceLedgerEntry['actionData'],
      timestamp: new Date(row.timestamp as string),
      ledgerHash: row.ledger_hash as string,
      previousHash: row.previous_hash as string,
      immutable: true,
    }));

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const previousEntry = entries[i - 1];

      const expectedHash = this.computeHash(previousEntry, entry.previousHash);

      if (entry.ledgerHash !== expectedHash) {
        return {
          isConsistent: false,
          totalEntries: entries.length,
          chainBrokenAt: i,
          expectedHash,
          actualHash: entry.ledgerHash,
        };
      }
    }

    return {
      isConsistent: true,
      totalEntries: entries.length,
    };
  }

  async lockBuild(buildId: string, reason: string): Promise<BuildLevelLock> {
    const inMemoryLock = this.buildLocks.get(buildId);

    if (inMemoryLock && inMemoryLock.isLocked) {
      const lockAge = Date.now() - inMemoryLock.lockedAt!.getTime();

      if (lockAge < BUILD_LOCK_TTL) {
        return inMemoryLock;
      }
    }

    const { data, error } = await supabase
      .from('governance_ledger')
      .select('action_data, ledger_hash')
      .eq('build_id', buildId)
      .eq('action_type', 'BUILD_LEVEL_LOCK')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return {
        isLocked: false,
      };
    }

    const lockData = data?.action_data as any;

    if (!lockData) {
      return {
        isLocked: false,
      };
    }

    const isLocked = lockData?.isLocked === true;
    const lockedBy = lockData?.lockedBy || 'unknown';
    const lockedAt = lockData?.lockedAt ? new Date() : undefined;
    const lockReason = lockData?.reason;

    const lock: BuildLevelLock = {
      isLocked,
      lockedBy,
      lockedAt,
      reason: lockReason,
    };

    this.buildLocks.set(buildId, lock);

    console.log(`[PostgresLedgerStore] Build ${buildId} locked: ${reason}`);
    return lock;
  }

  async unlockBuild(buildId: string, operator: string): Promise<boolean> {
    const existingLock = this.buildLocks.get(buildId);

    if (!existingLock || !existingLock.isLocked) {
      return false;
    }

    this.buildLocks.delete(buildId);

    const { error } = await supabase
      .from('governance_ledger')
      .insert({
        build_id: buildId,
        agent_id: 'system',
        action_type: 'BUILD_LEVEL_UNLOCK',
        action_data: {
          unlockedBy: operator,
          unlockedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        ledger_hash: '',
        previous_hash: '',
        immutable: true,
      })
      .select('id')
      .single();

    console.log(`[PostgresLedgerStore] Build ${buildId} unlocked by ${operator}`);

    return !error;
  }

  async getBuildLock(buildId: string): Promise<BuildLevelLock> {
    const inMemoryLock = this.buildLocks.get(buildId);

    if (inMemoryLock && inMemoryLock.isLocked) {
      const lockAge = Date.now() - inMemoryLock.lockedAt!.getTime();

      if (lockAge < BUILD_LOCK_TTL) {
        return inMemoryLock;
      }
    }

    const { data, error } = await supabase
      .from('governance_ledger')
      .select('action_data, ledger_hash')
      .eq('build_id', buildId)
      .eq('action_type', 'BUILD_LEVEL_LOCK')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return {
        isLocked: false,
      };
    }

    if (!data) {
      return {
        isLocked: false,
      };
    }

    const lockData = data?.action_data as any;

    if (!lockData || typeof lockData !== 'object' || !lockData.isLocked) {
      return {
        isLocked: false,
      };
    }

    const isLocked = lockData?.isLocked === true;
    const lockedBy = lockData?.lockedBy || 'unknown';
    const lockedAt = lockData?.lockedAt ? new Date() : undefined;
    const reason = lockData?.reason;

    return {
      isLocked,
      lockedBy,
      lockedAt,
      reason,
    };
  }

  async appendWithLock(entry: GovernanceLedgerEntry): Promise<string> {
    const lockStatus = await this.getBuildLock(entry.buildId);

    if (lockStatus.isLocked) {
      throw new Error(`Build ${entry.buildId} is locked: ${lockStatus.reason}`);
    }

    return await this.append(entry);
  }

  async verifyAndAppend(
    entry: GovernanceLedgerEntry
  ): Promise<{ success: boolean; reason?: string }> {
    const latestHash = await this.getLatestHash();

    if (latestHash && entry.previousHash !== latestHash) {
      return {
        success: false,
        reason: 'Previous hash mismatch',
      };
    }

    const computedHash = this.computeHash(entry, latestHash || entry.previousHash);

    if (entry.ledgerHash && entry.ledgerHash !== computedHash) {
      return {
        success: false,
        reason: 'Ledger hash mismatch',
      };
    }

    return await this.append(entry).then(id => ({ success: true }));
  }

  private computeHash(entry: GovernanceLedgerEntry, previousHash: string): string {
    const data = JSON.stringify({
      actionType: entry.actionType,
      agentId: entry.agentId,
      buildId: entry.buildId,
      actionData: entry.actionData,
      timestamp: entry.timestamp.getTime(),
      immutable: entry.immutable,
      previousHash: previousHash,
    });

    return require('crypto').createHash('sha256').update(data).digest('hex');
  }
}

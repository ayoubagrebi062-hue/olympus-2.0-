/**
 * OLYMPUS 2.0 — Governance Ledger & Immutability
 * Phase 2.4: Ledger Entry Types
 * @version 1.0.0
 */

import { IAuditLogStore } from '../store/types';

export interface GovernanceLedgerEntry {
  id?: string;
  buildId: string;
  agentId: string;
  actionType:
    | 'IDENTITY_VERIFICATION'
    | 'LEASE_GRANTED'
    | 'LEASE_REVOKED'
    | 'MONITOR_VIOLATION'
    | 'KILL_SWITCH_ACTIVATED';
  actionData: {
    passed?: boolean;
    reason?: string;
    details?: Record<string, unknown>;
  };
  timestamp: Date;
  ledgerHash: string;
  previousHash: string;
  immutable: boolean;
}

export interface LedgerHash {
  hash: string;
  timestamp: Date;
}

export interface LedgerConsistencyCheck {
  isConsistent: boolean;
  totalEntries: number;
  chainBrokenAt?: number;
  expectedHash?: string;
  actualHash?: string;
}

export interface ILedgerStore {
  append(entry: GovernanceLedgerEntry): Promise<string>;
  getEntries(buildId: string, limit?: number): Promise<GovernanceLedgerEntry[]>;
  getLatestHash(): Promise<string | null>;
  verifyConsistency(): Promise<LedgerConsistencyCheck>;
}

export interface LedgerStoreExtended extends ILedgerStore {
  lockBuild(buildId: string, reason: string): Promise<BuildLevelLock>;
  unlockBuild(buildId: string, operator: string): Promise<boolean>;
  getBuildLock(buildId: string): Promise<BuildLevelLock>;
  appendWithLock(entry: GovernanceLedgerEntry): Promise<string>;
  verifyAndAppend(entry: GovernanceLedgerEntry): Promise<{ success: boolean; reason?: string }>;
}

export interface BuildLevelLock {
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  reason?: string;
}

export interface IGovernanceLedger {
  ledger: LedgerStoreExtended;
  audit: IAuditLogStore;
}

export interface LedgerHash {
  hash: string;
  timestamp: Date;
}

export interface LedgerConsistencyCheck {
  isConsistent: boolean;
  totalEntries: number;
  chainBrokenAt?: number;
  expectedHash?: string;
  actualHash?: string;
}

export interface ILedgerStore {
  append(entry: GovernanceLedgerEntry): Promise<string>;
  getEntries(buildId: string, limit?: number): Promise<GovernanceLedgerEntry[]>;
  getLatestHash(): Promise<string | null>;
  verifyConsistency(): Promise<LedgerConsistencyCheck>;
}

export interface BuildLevelLock {
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  reason?: string;
}

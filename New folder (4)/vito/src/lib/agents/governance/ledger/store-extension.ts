/**
 * OLYMPUS 2.0 — Governance Ledger & Immutability
 * Phase 2.4: Ledger Store Interface Extension
 * @version 1.0.0
 */

import type { ILedgerStore, GovernanceLedgerEntry, LedgerConsistencyCheck, BuildLevelLock } from '../ledger/types';
import type { IAuditLogStore } from '../store/types';

export interface ILedgerStoreExtended extends ILedgerStore {
  lockBuild(buildId: string, reason: string): Promise<BuildLevelLock>;
  unlockBuild(buildId: string, operator: string): Promise<boolean>;
  getBuildLock(buildId: string): Promise<BuildLevelLock>;
  appendWithLock(entry: GovernanceLedgerEntry): Promise<string>;
  verifyAndAppend(entry: GovernanceLedgerEntry): Promise<{ success: boolean; reason?: string }>;
}

export interface IGovernanceLedger {
  ledger: ILedgerStoreExtended;
  audit: IAuditLogStore;
}

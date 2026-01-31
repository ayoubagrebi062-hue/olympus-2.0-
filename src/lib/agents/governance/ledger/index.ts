/**
 * OLYMPUS 2.0 — Governance Ledger & Immutability
 * Phase 2.4: Ledger Index
 * @version 1.1.0 (Cluster #4 - Cryptographic Integrity)
 */

export type {
  GovernanceLedgerEntry,
  LedgerHash,
  LedgerConsistencyCheck,
  ILedgerStore,
  LedgerStoreExtended,
  BuildLevelLock,
} from './types';
export type { IGovernanceLedger } from './store-extension';

export * from './hashing';
export type { PostgresLedgerStore } from './postgres-store';

// SECURITY FIX: Cluster #4 - Digital signatures for tamper detection
export {
  LedgerSigner,
  IntegrityMonitor,
  getLedgerSigner,
  type SignedLedgerEntry,
  type SigningConfig,
  type SignatureVerificationResult,
  type ChainIntegrityResult,
  type TamperAlert,
  type TamperCallback,
} from './signing';

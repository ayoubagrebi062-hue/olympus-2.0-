/**
 * Obligation Ledger
 *
 * Append-only record of obligations: detected, fulfilled, violated.
 * Proves what was required and what happened.
 *
 * KEY PRINCIPLE:
 * - "The ledger forgets nothing."
 * - Every obligation is recorded from detection to resolution
 * - Status transitions are permanent and traceable
 *
 * LEDGER CONTENTS:
 * - Detected obligations
 * - Fulfilled obligations (with proof reference)
 * - Violated obligations (with omission proof)
 * - Status history
 *
 * NON-NEGOTIABLE:
 * - Append-only (no modifications)
 * - Chain integrity via hashes
 * - Deterministic ordering
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  RequiredDecision,
  ObligationLedgerEntry,
  ObligationLedgerQuery,
  ObligationStatus,
  ObligationPriority,
  ObligationSource,
  OmissionViolation,
  AuthorityClass
} from './types';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * Ledger statistics
 */
export interface ObligationLedgerStats {
  total_entries: number;
  by_status: Record<ObligationStatus, number>;
  by_priority: Record<ObligationPriority, number>;
  by_source: Record<ObligationSource, number>;
  first_timestamp: string | null;
  last_timestamp: string | null;
  chain_valid: boolean;
}

/**
 * Ledger configuration
 */
export interface ObligationLedgerConfig {
  // Directory to store ledger file
  ledger_dir?: string;

  // Ledger filename
  ledger_filename?: string;
}

export class ObligationLedger {
  private config: Required<ObligationLedgerConfig>;
  private ledgerFile: string;
  private entries: ObligationLedgerEntry[] = [];
  private nextIndex: number = 0;
  private initialized: boolean = false;

  constructor(config?: Partial<ObligationLedgerConfig>) {
    this.config = {
      ledger_dir: config?.ledger_dir ?? './data/obligations',
      ledger_filename: config?.ledger_filename ?? 'obligation-ledger.jsonl'
    };

    this.ledgerFile = path.join(this.config.ledger_dir, this.config.ledger_filename);
  }

  /**
   * Initialize the ledger
   */
  initialize(): void {
    if (this.initialized) return;

    // Ensure directory exists
    if (!fs.existsSync(this.config.ledger_dir)) {
      fs.mkdirSync(this.config.ledger_dir, { recursive: true });
    }

    // Load existing entries
    if (fs.existsSync(this.ledgerFile)) {
      this.loadFromDisk();
    }

    this.initialized = true;
  }

  /**
   * Record a detected obligation
   */
  recordDetected(obligation: RequiredDecision, currentStep: number): ObligationLedgerEntry {
    if (!this.initialized) {
      this.initialize();
    }

    const timestamp = new Date().toISOString();
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    const entry: Omit<ObligationLedgerEntry, 'entry_hash'> = {
      index: this.nextIndex++,
      obligation,
      status: 'DETECTED',
      status_history: [
        { status: 'DETECTED', timestamp, step: currentStep }
      ],
      fulfillment: null,
      violation: null,
      created_at: timestamp,
      updated_at: timestamp,
      previous_entry_hash: previousHash
    };

    const entryHash = this.computeEntryHash(entry);
    const fullEntry: ObligationLedgerEntry = { ...entry, entry_hash: entryHash };

    this.entries.push(fullEntry);
    this.appendToDisk(fullEntry);

    return fullEntry;
  }

  /**
   * Update obligation status to PENDING
   */
  recordPending(obligationId: string, currentStep: number): ObligationLedgerEntry | null {
    return this.updateStatus(obligationId, 'PENDING', currentStep);
  }

  /**
   * Record obligation fulfillment
   */
  recordFulfilled(
    obligationId: string,
    fulfillmentProofHash: string,
    fulfillingAuthority: AuthorityClass,
    currentStep: number
  ): ObligationLedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    const existingEntry = this.findByObligationId(obligationId);
    if (!existingEntry) {
      return null;
    }

    // Cannot fulfill already violated obligation
    if (existingEntry.status === 'VIOLATED') {
      return null;
    }

    const timestamp = new Date().toISOString();
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    const newEntry: Omit<ObligationLedgerEntry, 'entry_hash'> = {
      index: this.nextIndex++,
      obligation: existingEntry.obligation,
      status: 'FULFILLED',
      status_history: [
        ...existingEntry.status_history,
        { status: 'FULFILLED', timestamp, step: currentStep }
      ],
      fulfillment: {
        fulfilled_at: timestamp,
        fulfillment_proof_hash: fulfillmentProofHash,
        fulfillment_step: currentStep,
        fulfilling_authority: fulfillingAuthority
      },
      violation: null,
      created_at: existingEntry.created_at,
      updated_at: timestamp,
      previous_entry_hash: previousHash
    };

    const entryHash = this.computeEntryHash(newEntry);
    const fullEntry: ObligationLedgerEntry = { ...newEntry, entry_hash: entryHash };

    this.entries.push(fullEntry);
    this.appendToDisk(fullEntry);

    return fullEntry;
  }

  /**
   * Record obligation violation (omission)
   */
  recordViolated(
    obligationId: string,
    violation: OmissionViolation,
    currentStep: number
  ): ObligationLedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    const existingEntry = this.findByObligationId(obligationId);
    if (!existingEntry) {
      return null;
    }

    // Cannot violate already fulfilled obligation
    if (existingEntry.status === 'FULFILLED') {
      return null;
    }

    const timestamp = new Date().toISOString();
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    const newEntry: Omit<ObligationLedgerEntry, 'entry_hash'> = {
      index: this.nextIndex++,
      obligation: existingEntry.obligation,
      status: 'VIOLATED',
      status_history: [
        ...existingEntry.status_history,
        { status: 'VIOLATED', timestamp, step: currentStep }
      ],
      fulfillment: null,
      violation,
      created_at: existingEntry.created_at,
      updated_at: timestamp,
      previous_entry_hash: previousHash
    };

    const entryHash = this.computeEntryHash(newEntry);
    const fullEntry: ObligationLedgerEntry = { ...newEntry, entry_hash: entryHash };

    this.entries.push(fullEntry);
    this.appendToDisk(fullEntry);

    return fullEntry;
  }

  /**
   * Update obligation status
   */
  private updateStatus(
    obligationId: string,
    newStatus: ObligationStatus,
    currentStep: number
  ): ObligationLedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    const existingEntry = this.findByObligationId(obligationId);
    if (!existingEntry) {
      return null;
    }

    // Cannot change terminal states
    if (existingEntry.status === 'FULFILLED' || existingEntry.status === 'VIOLATED') {
      return null;
    }

    const timestamp = new Date().toISOString();
    const previousHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    const newEntry: Omit<ObligationLedgerEntry, 'entry_hash'> = {
      index: this.nextIndex++,
      obligation: existingEntry.obligation,
      status: newStatus,
      status_history: [
        ...existingEntry.status_history,
        { status: newStatus, timestamp, step: currentStep }
      ],
      fulfillment: existingEntry.fulfillment,
      violation: existingEntry.violation,
      created_at: existingEntry.created_at,
      updated_at: timestamp,
      previous_entry_hash: previousHash
    };

    const entryHash = this.computeEntryHash(newEntry);
    const fullEntry: ObligationLedgerEntry = { ...newEntry, entry_hash: entryHash };

    this.entries.push(fullEntry);
    this.appendToDisk(fullEntry);

    return fullEntry;
  }

  /**
   * Find latest entry for an obligation
   */
  findByObligationId(obligationId: string): ObligationLedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    // Return most recent entry for this obligation
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].obligation.obligation_id === obligationId) {
        return this.entries[i];
      }
    }
    return null;
  }

  /**
   * Query the ledger
   */
  query(params: ObligationLedgerQuery): ObligationLedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    // Get latest entry for each obligation
    const latestByObligation = new Map<string, ObligationLedgerEntry>();
    for (const entry of this.entries) {
      latestByObligation.set(entry.obligation.obligation_id, entry);
    }

    let results = Array.from(latestByObligation.values());

    // Apply filters
    if (params.status && params.status.length > 0) {
      results = results.filter(e => params.status!.includes(e.status));
    }

    if (params.priority && params.priority.length > 0) {
      results = results.filter(e => params.priority!.includes(e.obligation.priority));
    }

    if (params.source && params.source.length > 0) {
      results = results.filter(e => params.source!.includes(e.obligation.source));
    }

    if (params.deadline_before !== undefined) {
      results = results.filter(e => e.obligation.deadline_step < params.deadline_before!);
    }

    if (params.deadline_after !== undefined) {
      results = results.filter(e => e.obligation.deadline_step > params.deadline_after!);
    }

    // Apply pagination
    if (params.offset) {
      results = results.slice(params.offset);
    }

    if (params.limit) {
      results = results.slice(0, params.limit);
    }

    return results;
  }

  /**
   * Get all violated obligations
   */
  getViolations(): ObligationLedgerEntry[] {
    return this.query({ status: ['VIOLATED'] });
  }

  /**
   * Get all fulfilled obligations
   */
  getFulfilled(): ObligationLedgerEntry[] {
    return this.query({ status: ['FULFILLED'] });
  }

  /**
   * Get all pending obligations
   */
  getPending(): ObligationLedgerEntry[] {
    return this.query({ status: ['DETECTED', 'PENDING'] });
  }

  /**
   * Get entry by index
   */
  getByIndex(index: number): ObligationLedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.index === index) || null;
  }

  /**
   * Get all entries (raw)
   */
  getAllEntries(): readonly ObligationLedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    return Object.freeze([...this.entries]);
  }

  /**
   * Verify ledger chain integrity
   */
  verify(): {
    valid: boolean;
    chain_intact: boolean;
    total_entries: number;
    verified_count: number;
    errors: string[];
  } {
    if (!this.initialized) {
      this.initialize();
    }

    const errors: string[] = [];
    let verifiedCount = 0;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify previous hash link
      if (i === 0) {
        if (entry.previous_entry_hash !== null) {
          errors.push(`Entry 0: Should have null previous hash`);
          continue;
        }
      } else {
        if (entry.previous_entry_hash !== this.entries[i - 1].entry_hash) {
          errors.push(`Entry ${i}: Previous hash mismatch`);
          continue;
        }
      }

      // Verify entry hash
      const computedHash = this.computeEntryHash({
        index: entry.index,
        obligation: entry.obligation,
        status: entry.status,
        status_history: entry.status_history,
        fulfillment: entry.fulfillment,
        violation: entry.violation,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        previous_entry_hash: entry.previous_entry_hash
      });

      if (computedHash !== entry.entry_hash) {
        errors.push(`Entry ${i}: Entry hash mismatch`);
        continue;
      }

      verifiedCount++;
    }

    return {
      valid: errors.length === 0,
      chain_intact: verifiedCount === this.entries.length,
      total_entries: this.entries.length,
      verified_count: verifiedCount,
      errors
    };
  }

  /**
   * Get ledger statistics
   */
  getStats(): ObligationLedgerStats {
    if (!this.initialized) {
      this.initialize();
    }

    const byStatus: Record<ObligationStatus, number> = {
      'DETECTED': 0,
      'PENDING': 0,
      'FULFILLED': 0,
      'VIOLATED': 0,
      'SUPERSEDED': 0
    };

    const byPriority: Record<ObligationPriority, number> = {
      'CRITICAL': 0,
      'HIGH': 0,
      'MEDIUM': 0,
      'LOW': 0
    };

    const bySource: Record<ObligationSource, number> = {
      'NECESSARY_FUTURE': 0,
      'TEMPORAL_CONTRACT': 0,
      'INVARIANT_REQUIREMENT': 0,
      'SYSTEM_MANDATE': 0
    };

    // Get latest status for each obligation
    const latestByObligation = new Map<string, ObligationLedgerEntry>();
    for (const entry of this.entries) {
      latestByObligation.set(entry.obligation.obligation_id, entry);
    }

    for (const entry of latestByObligation.values()) {
      byStatus[entry.status]++;
      byPriority[entry.obligation.priority]++;
      bySource[entry.obligation.source]++;
    }

    const verification = this.verify();

    return {
      total_entries: this.entries.length,
      by_status: byStatus,
      by_priority: byPriority,
      by_source: bySource,
      first_timestamp: this.entries.length > 0 ? this.entries[0].created_at : null,
      last_timestamp: this.entries.length > 0 ? this.entries[this.entries.length - 1].updated_at : null,
      chain_valid: verification.valid
    };
  }

  /**
   * Compute entry hash
   */
  private computeEntryHash(entry: Omit<ObligationLedgerEntry, 'entry_hash'>): string {
    const canonical = {
      index: entry.index,
      obligation_id: entry.obligation.obligation_id,
      status: entry.status,
      status_count: entry.status_history.length,
      has_fulfillment: entry.fulfillment !== null,
      has_violation: entry.violation !== null,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      previous_entry_hash: entry.previous_entry_hash
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Load entries from disk
   */
  private loadFromDisk(): void {
    const content = fs.readFileSync(this.ledgerFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ObligationLedgerEntry;
        this.entries.push(entry);
        this.nextIndex = Math.max(this.nextIndex, entry.index + 1);
      } catch {
        console.error('[ObligationLedger] Failed to parse line');
      }
    }
  }

  /**
   * Append entry to disk
   */
  private appendToDisk(entry: ObligationLedgerEntry): void {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.ledgerFile, line);
  }

  /**
   * Clear ledger (FOR TESTING ONLY)
   */
  _dangerousClear(): void {
    console.warn('[ObligationLedger] WARNING: Clearing ledger - TESTING ONLY');
    this.entries = [];
    this.nextIndex = 0;

    if (fs.existsSync(this.ledgerFile)) {
      fs.unlinkSync(this.ledgerFile);
    }
  }
}

/**
 * Create a new ObligationLedger
 */
export function createObligationLedger(
  config?: Partial<ObligationLedgerConfig>
): ObligationLedger {
  const ledger = new ObligationLedger(config);
  ledger.initialize();
  return ledger;
}

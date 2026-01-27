/**
 * Proof Ledger
 *
 * Append-only storage of OlympusDecisionProofs.
 * Ordered by monotonic index + timestamp.
 * Immutable once written.
 *
 * KEY PRINCIPLE:
 * - "A truth that cannot persist is not yet true."
 * - Once written, NEVER modified
 * - Monotonic indexing guarantees ordering
 * - Chain integrity via entry hashes
 *
 * STORAGE:
 * - In-memory for session
 * - File persistence for durability
 * - Each entry hash-linked to previous
 *
 * NON-NEGOTIABLE:
 * - Append-only forever
 * - No deletions
 * - No modifications
 * - Deterministic ordering
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  ContinuityProof,
  LedgerEntry,
  InvariantCategory
} from './types';

// PCL version - immutable
const PCL_VERSION = '1.0.0';
Object.freeze({ PCL_VERSION });

/**
 * Ledger statistics
 */
export interface LedgerStats {
  total_entries: number;
  first_entry_index: number | null;
  last_entry_index: number | null;
  first_timestamp: string | null;
  last_timestamp: string | null;
  chain_valid: boolean;
}

/**
 * Ledger query options
 */
export interface LedgerQuery {
  // Filter by index range
  from_index?: number;
  to_index?: number;

  // Filter by time range
  from_timestamp?: string;
  to_timestamp?: string;

  // Filter by decision
  decision?: string;

  // Filter by invariant
  invariant?: InvariantCategory;

  // Limit results
  limit?: number;
}

export class ProofLedger {
  private entries: LedgerEntry[] = [];
  private nextIndex: number = 0;
  private ledgerDir: string;
  private ledgerFile: string;
  private initialized: boolean = false;

  constructor(ledgerDir: string = './data/proof-ledger') {
    this.ledgerDir = ledgerDir;
    this.ledgerFile = path.join(ledgerDir, 'ledger.jsonl');
  }

  /**
   * Initialize the ledger
   * Loads existing entries from disk if present
   */
  initialize(): void {
    if (this.initialized) return;

    // Ensure directory exists
    if (!fs.existsSync(this.ledgerDir)) {
      fs.mkdirSync(this.ledgerDir, { recursive: true });
    }

    // Load existing entries
    if (fs.existsSync(this.ledgerFile)) {
      this.loadFromDisk();
    }

    this.initialized = true;
  }

  /**
   * Append a proof to the ledger
   * Returns the ledger entry created
   *
   * THIS IS APPEND-ONLY - NO EXCEPTIONS
   */
  append(proof: ContinuityProof): LedgerEntry {
    if (!this.initialized) {
      this.initialize();
    }

    const timestamp = new Date().toISOString();
    const index = this.nextIndex++;

    // Get previous entry hash for chain integrity
    const previousEntryHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    // Create entry
    const entry: Omit<LedgerEntry, 'entry_hash'> = {
      index,
      proof,
      ledger_timestamp: timestamp,
      previous_entry_hash: previousEntryHash
    };

    // Compute entry hash
    const entryHash = this.computeEntryHash(entry);

    const fullEntry: LedgerEntry = {
      ...entry,
      entry_hash: entryHash
    };

    // Append to memory
    this.entries.push(fullEntry);

    // Append to disk (JSONL format - one JSON per line)
    this.appendToDisk(fullEntry);

    return fullEntry;
  }

  /**
   * Get entry by index
   */
  getByIndex(index: number): LedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.index === index) || null;
  }

  /**
   * Get entry by proof hash
   */
  getByProofHash(proofHash: string): LedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.proof.proof_hash === proofHash) || null;
  }

  /**
   * Get entry by run ID
   */
  getByRunId(runId: string): LedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.proof.run_id === runId) || null;
  }

  /**
   * Get all entries (read-only)
   */
  getAllEntries(): readonly LedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    return Object.freeze([...this.entries]);
  }

  /**
   * Query entries with filters
   */
  query(options: LedgerQuery): LedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    let results = [...this.entries];

    // Filter by index range
    if (options.from_index !== undefined) {
      results = results.filter(e => e.index >= options.from_index!);
    }
    if (options.to_index !== undefined) {
      results = results.filter(e => e.index <= options.to_index!);
    }

    // Filter by time range
    if (options.from_timestamp) {
      results = results.filter(e => e.ledger_timestamp >= options.from_timestamp!);
    }
    if (options.to_timestamp) {
      results = results.filter(e => e.ledger_timestamp <= options.to_timestamp!);
    }

    // Filter by decision
    if (options.decision) {
      results = results.filter(e => e.proof.final_decision === options.decision);
    }

    // Filter by invariant
    if (options.invariant) {
      results = results.filter(e => e.proof.primary_invariant_violated === options.invariant);
    }

    // Apply limit
    if (options.limit !== undefined && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get entries with specific forbidden alternative
   */
  getEntriesWithForbiddenAlternative(alternativeHash: string): LedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.filter(e =>
      e.proof.forbidden_alternatives.includes(alternativeHash)
    );
  }

  /**
   * Get entries with specific invariant violation
   */
  getEntriesWithInvariant(invariant: InvariantCategory): LedgerEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.filter(e =>
      e.proof.primary_invariant_violated === invariant
    );
  }

  /**
   * Get the latest entry
   */
  getLatest(): LedgerEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.length > 0
      ? this.entries[this.entries.length - 1]
      : null;
  }

  /**
   * Get ledger statistics
   */
  getStats(): LedgerStats {
    if (!this.initialized) {
      this.initialize();
    }

    if (this.entries.length === 0) {
      return {
        total_entries: 0,
        first_entry_index: null,
        last_entry_index: null,
        first_timestamp: null,
        last_timestamp: null,
        chain_valid: true
      };
    }

    return {
      total_entries: this.entries.length,
      first_entry_index: this.entries[0].index,
      last_entry_index: this.entries[this.entries.length - 1].index,
      first_timestamp: this.entries[0].ledger_timestamp,
      last_timestamp: this.entries[this.entries.length - 1].ledger_timestamp,
      chain_valid: this.verifyChainIntegrity()
    };
  }

  /**
   * Verify chain integrity
   * Each entry must hash-link to the previous
   */
  verifyChainIntegrity(): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify index is monotonic
      if (entry.index !== i) {
        return false;
      }

      // Verify previous hash link
      if (i === 0) {
        if (entry.previous_entry_hash !== null) {
          return false;
        }
      } else {
        if (entry.previous_entry_hash !== this.entries[i - 1].entry_hash) {
          return false;
        }
      }

      // Verify entry hash
      const computedHash = this.computeEntryHash({
        index: entry.index,
        proof: entry.proof,
        ledger_timestamp: entry.ledger_timestamp,
        previous_entry_hash: entry.previous_entry_hash
      });

      if (computedHash !== entry.entry_hash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the next index (for preview)
   */
  getNextIndex(): number {
    if (!this.initialized) {
      this.initialize();
    }

    return this.nextIndex;
  }

  /**
   * Check if a proof hash exists in the ledger
   */
  hasProof(proofHash: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.some(e => e.proof.proof_hash === proofHash);
  }

  /**
   * Compute entry hash
   */
  private computeEntryHash(entry: Omit<LedgerEntry, 'entry_hash'>): string {
    const canonical = {
      index: entry.index,
      proof_hash: entry.proof.proof_hash,
      proof_run_id: entry.proof.run_id,
      ledger_timestamp: entry.ledger_timestamp,
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
        const entry = JSON.parse(line) as LedgerEntry;
        this.entries.push(entry);
        this.nextIndex = Math.max(this.nextIndex, entry.index + 1);
      } catch {
        console.error('[ProofLedger] Failed to parse ledger line:', line.substring(0, 50));
      }
    }
  }

  /**
   * Append entry to disk
   */
  private appendToDisk(entry: LedgerEntry): void {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.ledgerFile, line);
  }

  /**
   * Clear the ledger (FOR TESTING ONLY)
   * This violates append-only principle and should NEVER be used in production
   */
  _dangerousClear(): void {
    console.warn('[ProofLedger] WARNING: Clearing ledger - TESTING ONLY');
    this.entries = [];
    this.nextIndex = 0;

    // Remove file
    if (fs.existsSync(this.ledgerFile)) {
      fs.unlinkSync(this.ledgerFile);
    }
  }
}

/**
 * Create a new ProofLedger instance
 */
export function createProofLedger(ledgerDir?: string): ProofLedger {
  const ledger = new ProofLedger(ledgerDir);
  ledger.initialize();
  return ledger;
}

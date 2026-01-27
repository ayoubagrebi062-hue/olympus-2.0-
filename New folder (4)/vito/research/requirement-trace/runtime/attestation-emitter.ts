/**
 * Attestation Emitter
 *
 * Emits externally witnessable attestations of decisions.
 * Writes to append-only attestation log.
 *
 * KEY PRINCIPLE:
 * - Decisions must be externally verifiable
 * - Attestation log is append-only
 * - Each attestation links to the previous
 *
 * ATTESTATION CONTENTS:
 * - continuity_hash
 * - ledger_index
 * - timestamp
 * - authority_class
 * - attestation_hash (for chain integrity)
 *
 * OUTPUT OPTIONS:
 * - Append-only attestation log (JSONL)
 * - Git commit metadata (optional)
 *
 * NON-NEGOTIABLE:
 * - No modifications to past attestations
 * - Deterministic hashing
 * - Verifiable chain integrity
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import type {
  AuthorityClass,
  AttestationRecord,
  AttestationLogEntry,
  ContinuityProof
} from './types';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * Attestation emitter configuration
 */
export interface AttestationEmitterConfig {
  attestation_dir?: string;
  enable_git_attestation?: boolean;
  git_repo_path?: string;
}

/**
 * Attestation verification result
 */
export interface AttestationVerification {
  valid: boolean;
  chain_intact: boolean;
  total_attestations: number;
  verified_count: number;
  errors: string[];
}

export class AttestationEmitter {
  private config: Required<AttestationEmitterConfig>;
  private logFile: string;
  private entries: AttestationLogEntry[] = [];
  private nextIndex: number = 0;
  private initialized: boolean = false;

  constructor(config?: Partial<AttestationEmitterConfig>) {
    this.config = {
      attestation_dir: config?.attestation_dir ?? './data/attestations',
      enable_git_attestation: config?.enable_git_attestation ?? false,
      git_repo_path: config?.git_repo_path ?? '.'
    };

    this.logFile = path.join(this.config.attestation_dir, 'attestation-log.jsonl');
  }

  /**
   * Initialize the emitter
   */
  initialize(): void {
    if (this.initialized) return;

    // Ensure directory exists
    if (!fs.existsSync(this.config.attestation_dir)) {
      fs.mkdirSync(this.config.attestation_dir, { recursive: true });
    }

    // Load existing entries
    if (fs.existsSync(this.logFile)) {
      this.loadFromDisk();
    }

    this.initialized = true;
  }

  /**
   * Emit an attestation for a proof
   */
  emit(
    proof: ContinuityProof,
    authorityClass: AuthorityClass,
    authorityLevel: number
  ): AttestationRecord {
    if (!this.initialized) {
      this.initialize();
    }

    const timestamp = new Date().toISOString();
    const epochMs = Date.now();

    // Create attestation record
    const attestation: Omit<AttestationRecord, 'attestation_hash'> = {
      attestation_id: `attest-${proof.run_id}-${epochMs}`,
      continuity_hash: proof.continuity_hash,
      proof_hash: proof.proof_hash,
      ledger_index: proof.ledger_index,
      authority_class: authorityClass,
      authority_level: authorityLevel,
      timestamp,
      epoch_ms: epochMs
    };

    // Compute attestation hash
    const attestationHash = this.computeAttestationHash(attestation);

    const fullAttestation: AttestationRecord = {
      ...attestation,
      attestation_hash: attestationHash
    };

    // Create log entry
    const previousAttestationHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].entry_hash
      : null;

    const entry: Omit<AttestationLogEntry, 'entry_hash'> = {
      index: this.nextIndex++,
      attestation: fullAttestation,
      previous_attestation_hash: previousAttestationHash
    };

    const entryHash = this.computeEntryHash(entry);

    const fullEntry: AttestationLogEntry = {
      ...entry,
      entry_hash: entryHash
    };

    // Append to memory
    this.entries.push(fullEntry);

    // Append to disk
    this.appendToDisk(fullEntry);

    // Optional: Git attestation
    if (this.config.enable_git_attestation) {
      try {
        this.createGitAttestation(fullAttestation);
      } catch {
        // Git attestation is optional, don't fail if it doesn't work
      }
    }

    return fullAttestation;
  }

  /**
   * Verify the entire attestation chain
   */
  verify(): AttestationVerification {
    if (!this.initialized) {
      this.initialize();
    }

    const errors: string[] = [];
    let verifiedCount = 0;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Verify index ordering
      if (entry.index !== i) {
        errors.push(`Entry ${i}: Index mismatch (expected ${i}, got ${entry.index})`);
        continue;
      }

      // Verify previous hash link
      if (i === 0) {
        if (entry.previous_attestation_hash !== null) {
          errors.push(`Entry 0: Should have null previous hash`);
          continue;
        }
      } else {
        if (entry.previous_attestation_hash !== this.entries[i - 1].entry_hash) {
          errors.push(`Entry ${i}: Previous hash mismatch`);
          continue;
        }
      }

      // Verify entry hash
      const computedEntryHash = this.computeEntryHash({
        index: entry.index,
        attestation: entry.attestation,
        previous_attestation_hash: entry.previous_attestation_hash
      });

      if (computedEntryHash !== entry.entry_hash) {
        errors.push(`Entry ${i}: Entry hash mismatch`);
        continue;
      }

      // Verify attestation hash
      const computedAttestationHash = this.computeAttestationHash({
        attestation_id: entry.attestation.attestation_id,
        continuity_hash: entry.attestation.continuity_hash,
        proof_hash: entry.attestation.proof_hash,
        ledger_index: entry.attestation.ledger_index,
        authority_class: entry.attestation.authority_class,
        authority_level: entry.attestation.authority_level,
        timestamp: entry.attestation.timestamp,
        epoch_ms: entry.attestation.epoch_ms
      });

      if (computedAttestationHash !== entry.attestation.attestation_hash) {
        errors.push(`Entry ${i}: Attestation hash mismatch`);
        continue;
      }

      verifiedCount++;
    }

    return {
      valid: errors.length === 0,
      chain_intact: verifiedCount === this.entries.length,
      total_attestations: this.entries.length,
      verified_count: verifiedCount,
      errors
    };
  }

  /**
   * Get attestation by index
   */
  getByIndex(index: number): AttestationLogEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.index === index) || null;
  }

  /**
   * Get attestation by proof hash
   */
  getByProofHash(proofHash: string): AttestationLogEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.find(e => e.attestation.proof_hash === proofHash) || null;
  }

  /**
   * Get all entries
   */
  getAllEntries(): readonly AttestationLogEntry[] {
    if (!this.initialized) {
      this.initialize();
    }

    return Object.freeze([...this.entries]);
  }

  /**
   * Get latest attestation
   */
  getLatest(): AttestationLogEntry | null {
    if (!this.initialized) {
      this.initialize();
    }

    return this.entries.length > 0
      ? this.entries[this.entries.length - 1]
      : null;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_attestations: number;
    first_timestamp: string | null;
    last_timestamp: string | null;
    chain_valid: boolean;
  } {
    if (!this.initialized) {
      this.initialize();
    }

    const verification = this.verify();

    return {
      total_attestations: this.entries.length,
      first_timestamp: this.entries.length > 0
        ? this.entries[0].attestation.timestamp
        : null,
      last_timestamp: this.entries.length > 0
        ? this.entries[this.entries.length - 1].attestation.timestamp
        : null,
      chain_valid: verification.valid
    };
  }

  /**
   * Compute attestation hash
   */
  private computeAttestationHash(
    attestation: Omit<AttestationRecord, 'attestation_hash' | 'git_commit_hash'>
  ): string {
    const canonical = {
      id: attestation.attestation_id,
      continuity_hash: attestation.continuity_hash,
      proof_hash: attestation.proof_hash,
      ledger_index: attestation.ledger_index,
      authority_class: attestation.authority_class,
      authority_level: attestation.authority_level,
      timestamp: attestation.timestamp,
      epoch_ms: attestation.epoch_ms
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Compute entry hash
   */
  private computeEntryHash(
    entry: Omit<AttestationLogEntry, 'entry_hash'>
  ): string {
    const canonical = {
      index: entry.index,
      attestation_hash: entry.attestation.attestation_hash,
      previous_attestation_hash: entry.previous_attestation_hash
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Load entries from disk
   */
  private loadFromDisk(): void {
    const content = fs.readFileSync(this.logFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AttestationLogEntry;
        this.entries.push(entry);
        this.nextIndex = Math.max(this.nextIndex, entry.index + 1);
      } catch {
        console.error('[AttestationEmitter] Failed to parse line');
      }
    }
  }

  /**
   * Append entry to disk
   */
  private appendToDisk(entry: AttestationLogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFile, line);
  }

  /**
   * Create git attestation (optional)
   */
  private createGitAttestation(attestation: AttestationRecord): void {
    const message = [
      `[AAM Attestation] ${attestation.attestation_id}`,
      '',
      `Proof Hash: ${attestation.proof_hash}`,
      `Continuity Hash: ${attestation.continuity_hash}`,
      `Ledger Index: ${attestation.ledger_index}`,
      `Authority: ${attestation.authority_class} (Level ${attestation.authority_level})`,
      `Timestamp: ${attestation.timestamp}`,
      `Attestation Hash: ${attestation.attestation_hash}`
    ].join('\n');

    // Create an empty commit with the attestation as the message
    // This is a lightweight way to store attestation in git history
    try {
      execSync(
        `git commit --allow-empty -m "${message.replace(/"/g, '\\"')}"`,
        { cwd: this.config.git_repo_path, stdio: 'pipe' }
      );
    } catch {
      // Ignore git errors
    }
  }

  /**
   * Clear attestations (FOR TESTING ONLY)
   */
  _dangerousClear(): void {
    console.warn('[AttestationEmitter] WARNING: Clearing attestations - TESTING ONLY');
    this.entries = [];
    this.nextIndex = 0;

    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }
  }
}

/**
 * Create a new AttestationEmitter
 */
export function createAttestationEmitter(
  config?: Partial<AttestationEmitterConfig>
): AttestationEmitter {
  const emitter = new AttestationEmitter(config);
  emitter.initialize();
  return emitter;
}

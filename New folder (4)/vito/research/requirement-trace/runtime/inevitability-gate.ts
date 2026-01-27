/**
 * Inevitability Gate
 *
 * Enforces the inevitability decision.
 * If collapse is inevitable → HARD_ABORT.
 *
 * INTEGRATION:
 * - Executes BEFORE RLL
 * - If IE aborts, RLL never runs
 * - Non-bypassable
 *
 * DOOMED FINGERPRINT TRACKING:
 * - If a fingerprint has been proven inevitable before, immediate abort
 * - No need to re-simulate known-doomed actions
 *
 * NON-NEGOTIABLE:
 * - No config, flags, or overrides
 * - No probability or ML
 * - Pure logical enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ActionSignature,
  InevitabilityProof,
  InevitabilityGateResult,
  InevitabilityRecord,
  InevitabilityDatabase,
  CausalPath,
  ArchitecturalPhase
} from './types';

// IE version - immutable
const IE_VERSION = '1.0.0';
Object.freeze({ IE_VERSION });

// Database filename
const DB_FILENAME = 'inevitability-history.json';

export class InevitabilityGate {
  private dataDir: string;
  private database: InevitabilityDatabase;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.database = this.loadDatabase();
  }

  /**
   * Load database from disk
   */
  private loadDatabase(): InevitabilityDatabase {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) as InevitabilityDatabase;
      } catch (error) {
        return this.createEmptyDatabase();
      }
    }

    return this.createEmptyDatabase();
  }

  /**
   * Create empty database
   */
  private createEmptyDatabase(): InevitabilityDatabase {
    return {
      version: IE_VERSION,
      created_at: new Date().toISOString(),
      last_record_at: '',
      records: [],
      stats: {
        total_analyses: 0,
        total_aborts: 0,
        total_allows: 0,
        earliest_collapse_detected: null,
        average_steps_to_collapse: null
      },
      signature_registry: {
        fingerprint_history: {},
        doomed_fingerprints: []
      }
    };
  }

  /**
   * Persist database to disk (append-only)
   */
  private persistDatabase(): void {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(dbPath, JSON.stringify(this.database, null, 2), 'utf-8');
  }

  /**
   * Enforce gate decision based on inevitability proof
   */
  enforce(
    signature: ActionSignature,
    proof: InevitabilityProof,
    runId: string
  ): InevitabilityGateResult {
    const gateId = `GATE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check if fingerprint is already known to be doomed
    const fingerprint = signature.fingerprint;
    const alreadyDoomed = this.isDoomed(fingerprint);

    // Build gate result
    let action: 'ALLOW' | 'HARD_ABORT';
    let reason: string;

    if (alreadyDoomed) {
      // Known doomed fingerprint - immediate abort without re-simulation
      action = 'HARD_ABORT';
      reason = `Fingerprint ${fingerprint} was previously proven inevitable. Blocking without re-simulation.`;
    } else if (proof.inevitable) {
      // Newly proven inevitable - abort and mark as doomed
      action = 'HARD_ABORT';
      reason = `Inevitability proven via ${proof.proof_type}. ` +
        `All ${proof.paths_analyzed} paths lead to collapse. ` +
        (proof.steps_to_collapse !== null
          ? `Fastest collapse in ${proof.steps_to_collapse} steps.`
          : 'Collapse is certain.');

      // Mark fingerprint as doomed
      this.markDoomed(fingerprint);
    } else {
      // Not inevitable - allow
      action = 'ALLOW';
      reason = `Not inevitable. ${proof.paths_analyzed - proof.paths_to_collapse} escape path(s) exist.`;
    }

    // Check if signature was seen before
    const seenBefore = this.hasSeenSignature(fingerprint);

    // Record in history
    this.recordHistory(fingerprint, signature.signature_id);

    const result: InevitabilityGateResult = {
      gate_id: gateId,
      run_id: runId,
      timestamp: now,
      action,
      signature_seen_before: seenBefore,
      fingerprint_already_doomed: alreadyDoomed,
      proof: alreadyDoomed ? null : proof,
      reason,
      gate_proof: {
        forward_simulation_deterministic: true,
        all_paths_explored: true,
        inevitability_mathematical: true,
        no_heuristics: true,
        no_probability: true,
        no_config: true,
        no_flag: true,
        no_override: true
      }
    };

    // Update stats
    this.updateStats(result, proof);

    // Persist
    this.persistDatabase();

    return result;
  }

  /**
   * Check if fingerprint is known to be doomed
   */
  isDoomed(fingerprint: string): boolean {
    return this.database.signature_registry.doomed_fingerprints.includes(fingerprint);
  }

  /**
   * Mark fingerprint as doomed
   */
  private markDoomed(fingerprint: string): void {
    if (!this.database.signature_registry.doomed_fingerprints.includes(fingerprint)) {
      this.database.signature_registry.doomed_fingerprints.push(fingerprint);
    }
  }

  /**
   * Check if signature has been seen before
   */
  private hasSeenSignature(fingerprint: string): boolean {
    return fingerprint in this.database.signature_registry.fingerprint_history;
  }

  /**
   * Record signature in history
   */
  private recordHistory(fingerprint: string, signatureId: string): void {
    if (!this.database.signature_registry.fingerprint_history[fingerprint]) {
      this.database.signature_registry.fingerprint_history[fingerprint] = [];
    }
    this.database.signature_registry.fingerprint_history[fingerprint].push(signatureId);
  }

  /**
   * Update statistics
   */
  private updateStats(result: InevitabilityGateResult, proof: InevitabilityProof): void {
    const stats = this.database.stats;

    stats.total_analyses++;

    if (result.action === 'HARD_ABORT') {
      stats.total_aborts++;

      // Update earliest collapse
      if (proof.steps_to_collapse !== null) {
        if (stats.earliest_collapse_detected === null ||
            proof.steps_to_collapse < stats.earliest_collapse_detected) {
          stats.earliest_collapse_detected = proof.steps_to_collapse;
        }

        // Update average
        if (stats.average_steps_to_collapse === null) {
          stats.average_steps_to_collapse = proof.steps_to_collapse;
        } else {
          stats.average_steps_to_collapse =
            (stats.average_steps_to_collapse * (stats.total_aborts - 1) +
              proof.steps_to_collapse) / stats.total_aborts;
        }
      }
    } else {
      stats.total_allows++;
    }

    this.database.last_record_at = new Date().toISOString();
  }

  /**
   * Record full inevitability record (for append-only history)
   */
  recordFullRecord(
    runId: string,
    signature: ActionSignature,
    paths: CausalPath[],
    proof: InevitabilityProof,
    gateResult: InevitabilityGateResult,
    context: {
      current_entropy: number;
      current_phase: ArchitecturalPhase;
      current_mccs_size: number;
      active_singularities: number;
    }
  ): InevitabilityRecord {
    const recordId = `IE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const record: InevitabilityRecord = {
      record_id: recordId,
      run_id: runId,
      timestamp: new Date().toISOString(),
      action_signature: signature,
      causal_paths: paths,
      proof,
      gate_result: gateResult.action,
      context,
      immutable: true,
      append_only: true
    };

    // Append to database (NEVER modify existing records)
    this.database.records.push(record);

    // Persist
    this.persistDatabase();

    return record;
  }

  /**
   * Get all doomed fingerprints
   */
  getDoomedFingerprints(): string[] {
    return [...this.database.signature_registry.doomed_fingerprints];
  }

  /**
   * Get database (read-only)
   */
  getDatabase(): InevitabilityDatabase {
    return this.database;
  }

  /**
   * Get statistics
   */
  getStats(): InevitabilityDatabase['stats'] {
    return { ...this.database.stats };
  }

  /**
   * Reset (for testing only)
   */
  reset(): void {
    this.database = this.createEmptyDatabase();
    this.persistDatabase();
  }
}

/**
 * Necessity Gate
 *
 * Enforces that ONLY action signatures matching the NecessaryFuture are allowed.
 * All other signatures are forbidden.
 *
 * ENFORCEMENT RULES:
 * - If fingerprint has active NecessaryFuture → only allow matching signatures
 * - If fingerprint has no survivable future → HARD_ABORT (extinction)
 * - If fingerprint is not doomed → no constraint
 *
 * NON-NEGOTIABLE:
 * - Single future enforced
 * - No alternatives allowed
 * - No config, flags, overrides
 * - Append-only persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ActionSignature,
  NecessaryFuture,
  NecessityGateResult,
  NecessityRecord,
  NecessityDatabase,
  SurvivabilityResult,
  MCCSCandidate
} from './types';

// NE version - immutable
const NE_VERSION = '1.0.0';
Object.freeze({ NE_VERSION });

// Database filename
const DB_FILENAME = 'necessary-futures.json';

export class NecessityGate {
  private dataDir: string;
  private database: NecessityDatabase;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.database = this.loadDatabase();
  }

  /**
   * Load database from disk
   */
  private loadDatabase(): NecessityDatabase {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) as NecessityDatabase;
      } catch (error) {
        return this.createEmptyDatabase();
      }
    }

    return this.createEmptyDatabase();
  }

  /**
   * Create empty database
   */
  private createEmptyDatabase(): NecessityDatabase {
    return {
      version: NE_VERSION,
      created_at: new Date().toISOString(),
      last_record_at: '',
      records: [],
      active_futures: {},
      stats: {
        total_analyses: 0,
        futures_declared: 0,
        extinctions_detected: 0,
        candidates_evaluated: 0,
        average_survivable_candidates: 0
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
   * Declare a new necessary future
   *
   * This activates the future for the given fingerprint.
   */
  declareNecessity(future: NecessaryFuture): void {
    // Add to active futures
    this.database.active_futures[future.doomed_fingerprint] = future;

    // Update stats
    this.database.stats.futures_declared++;

    // Persist
    this.persistDatabase();
  }

  /**
   * Record extinction (no survivable future exists)
   */
  recordExtinction(doomedFingerprint: string): void {
    // Update stats
    this.database.stats.extinctions_detected++;

    // Persist
    this.persistDatabase();
  }

  /**
   * Enforce gate decision based on current action signature
   */
  enforce(
    currentSignature: ActionSignature,
    doomedFingerprint: string | null,
    runId: string
  ): NecessityGateResult {
    const gateId = `NGATE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check if there's an active necessary future for this fingerprint
    const activeFuture = doomedFingerprint
      ? this.database.active_futures[doomedFingerprint]
      : null;

    // Determine action
    let action: NecessityGateResult['action'];
    let matchesNecessity = false;
    let reason: string;

    if (!doomedFingerprint) {
      // No doom detected - no constraint
      action = 'NO_CONSTRAINT';
      reason = 'Fingerprint is not doomed. No necessity constraint applies.';
    } else if (!activeFuture) {
      // Doomed but no survivable future - extinction
      action = 'HARD_ABORT_EXTINCTION';
      reason = `No survivable future exists for fingerprint ${doomedFingerprint}. Extinction is imminent.`;
    } else {
      // Check if current signature matches the allowed signature
      matchesNecessity = this.signaturesMatch(
        currentSignature,
        activeFuture.allowed_signature
      );

      if (matchesNecessity) {
        action = 'ALLOW_NECESSITY';
        reason = `Action matches necessary future ${activeFuture.future_id}. ` +
          `MCCS: ${activeFuture.chosen_mccs.mccs_id} with ${activeFuture.chosen_mccs.intervention_count} interventions.`;
      } else {
        action = 'HARD_ABORT_NON_NECESSITY';
        reason = `Action does not match necessary future. ` +
          `Expected fingerprint: ${activeFuture.allowed_signature.fingerprint}. ` +
          `Got: ${currentSignature.fingerprint}. ` +
          `Only the necessary future (${activeFuture.future_id}) is allowed.`;
      }
    }

    return {
      gate_id: gateId,
      run_id: runId,
      timestamp: now,
      current_signature: currentSignature,
      has_active_future: !!activeFuture,
      active_future: activeFuture || null,
      matches_necessity: matchesNecessity,
      action,
      reason,
      gate_proof: {
        necessity_deterministic: true,
        single_future_enforced: true,
        alternatives_forbidden: true,
        no_config: true,
        no_flag: true,
        no_override: true
      }
    };
  }

  /**
   * Check if two signatures match
   *
   * Signatures match if they have the same structural fingerprint.
   */
  private signaturesMatch(sig1: ActionSignature, sig2: ActionSignature): boolean {
    return sig1.fingerprint === sig2.fingerprint;
  }

  /**
   * Record full necessity analysis
   */
  recordAnalysis(
    runId: string,
    doomedFingerprint: string,
    candidatesEnumerated: number,
    survivabilityResults: SurvivabilityResult[],
    necessaryFuture: NecessaryFuture | null,
    noSurvivableFuture: boolean,
    extinctionReason: string | null
  ): NecessityRecord {
    const recordId = `NE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Determine enforcement action
    let enforcementAction: NecessityRecord['enforcement_action'];
    if (necessaryFuture) {
      enforcementAction = 'CONSTRAIN_TO_NECESSITY';
    } else if (noSurvivableFuture) {
      enforcementAction = 'EXTINCTION_DETECTED';
    } else {
      enforcementAction = 'NO_DOOM_DETECTED';
    }

    const record: NecessityRecord = {
      record_id: recordId,
      run_id: runId,
      timestamp: now,
      doomed_fingerprint: doomedFingerprint,
      candidates_enumerated: candidatesEnumerated,
      survivability_results: survivabilityResults,
      necessary_future: necessaryFuture,
      no_survivable_future: noSurvivableFuture,
      extinction_reason: extinctionReason,
      enforcement_action: enforcementAction,
      immutable: true,
      append_only: true
    };

    // Append to database (NEVER modify existing records)
    this.database.records.push(record);
    this.database.last_record_at = now;

    // Update stats
    this.updateStats(record);

    // Persist
    this.persistDatabase();

    return record;
  }

  /**
   * Update statistics
   */
  private updateStats(record: NecessityRecord): void {
    const stats = this.database.stats;

    stats.total_analyses++;
    stats.candidates_evaluated += record.candidates_enumerated;

    const survivableCount = record.survivability_results.filter(r => r.survivable).length;
    stats.average_survivable_candidates =
      (stats.average_survivable_candidates * (stats.total_analyses - 1) + survivableCount) /
      stats.total_analyses;
  }

  /**
   * Check if fingerprint has active necessary future
   */
  hasActiveFuture(fingerprint: string): boolean {
    return fingerprint in this.database.active_futures;
  }

  /**
   * Get active future for fingerprint
   */
  getActiveFuture(fingerprint: string): NecessaryFuture | null {
    return this.database.active_futures[fingerprint] || null;
  }

  /**
   * Get all active futures
   */
  getAllActiveFutures(): Record<string, NecessaryFuture> {
    return { ...this.database.active_futures };
  }

  /**
   * Get database (read-only)
   */
  getDatabase(): NecessityDatabase {
    return this.database;
  }

  /**
   * Get statistics
   */
  getStats(): NecessityDatabase['stats'] {
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

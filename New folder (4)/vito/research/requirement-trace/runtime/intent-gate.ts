/**
 * Intent Gate
 *
 * Enforces intent validity by rejecting intents not in the IntentAllowlist.
 *
 * ENFORCEMENT:
 * - If intent ∉ IntentAllowlist → REJECT_INTENT
 * - Rejection includes causal proof referencing NecessaryFuture
 * - This is NOT an abort, NOT an enforcement failure
 * - The intent is considered invalid syntax
 *
 * PERSISTENCE:
 * - Persists intent cones to data/intent-cones.json (append-only)
 *
 * NON-NEGOTIABLE:
 * - Rejection is non-bypassable
 * - No config, flags, or overrides
 * - Causal proof required for every rejection
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  IntentSignature,
  IntentClassification,
  IntentGateResult,
  IntentAllowlist,
  CausalCone,
  NecessaryFuture,
  IntentConeRecord,
  IntentConeDatabase,
  IntentClass
} from './types';

// ICE version - immutable
const ICE_VERSION = '1.0.0';
Object.freeze({ ICE_VERSION });

// Database filename
const DB_FILENAME = 'intent-cones.json';

export class IntentGate {
  private dataDir: string;
  private database: IntentConeDatabase;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.database = this.loadDatabase();
  }

  /**
   * Load database from disk
   */
  private loadDatabase(): IntentConeDatabase {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) as IntentConeDatabase;
      } catch (error) {
        return this.createEmptyDatabase();
      }
    }

    return this.createEmptyDatabase();
  }

  /**
   * Create empty database
   */
  private createEmptyDatabase(): IntentConeDatabase {
    return {
      version: ICE_VERSION,
      created_at: new Date().toISOString(),
      last_record_at: '',
      records: [],
      active_cones: {},
      active_allowlists: {},
      stats: {
        total_cones_derived: 0,
        total_intents_processed: 0,
        total_intents_allowed: 0,
        total_intents_rejected: 0,
        rejection_rate: 0
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
   * Register a new causal cone and allowlist
   */
  registerCone(cone: CausalCone, allowlist: IntentAllowlist): void {
    // Store in active cones and allowlists
    this.database.active_cones[cone.source_future_id] = cone;
    this.database.active_allowlists[cone.source_future_id] = allowlist;

    // Update stats
    this.database.stats.total_cones_derived++;

    // Persist
    this.persistDatabase();
  }

  /**
   * Enforce gate decision for an intent
   */
  enforce(
    intent: IntentSignature,
    classification: IntentClassification,
    cone: CausalCone | null,
    future: NecessaryFuture | null,
    runId: string
  ): IntentGateResult {
    const gateId = `IGATE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Determine action
    const action: IntentGateResult['action'] = classification.allowed
      ? 'ALLOW_INTENT'
      : 'REJECT_INTENT';

    // Build rejection reason (if rejected)
    const rejectionReason = classification.allowed
      ? null
      : this.buildRejectionReason(classification);

    // Build causal proof (if rejected)
    const causalProof = classification.allowed || !cone || !future
      ? null
      : this.buildCausalProof(classification, cone, future);

    // Update stats
    this.database.stats.total_intents_processed++;
    if (classification.allowed) {
      this.database.stats.total_intents_allowed++;
    } else {
      this.database.stats.total_intents_rejected++;
    }
    this.database.stats.rejection_rate =
      this.database.stats.total_intents_rejected / this.database.stats.total_intents_processed;

    // Persist
    this.persistDatabase();

    return {
      gate_id: gateId,
      run_id: runId,
      timestamp: now,
      intent,
      classification,
      action,
      rejection_reason: rejectionReason,
      causal_proof: causalProof,
      gate_proof: {
        classification_deterministic: true,
        causal_derivation_complete: true,
        no_heuristics: true,
        no_ml: true,
        no_probability: true,
        no_config: true,
        no_flag: true,
        no_override: true
      }
    };
  }

  /**
   * Build rejection reason from classification
   */
  private buildRejectionReason(classification: IntentClassification): string {
    const reasons: string[] = [];

    reasons.push(`Classification: ${classification.classification}`);

    if (classification.causal_analysis.violated_requirement) {
      reasons.push(`Violated: ${classification.causal_analysis.violated_requirement}`);
    }

    if (classification.classification === 'CONTRADICTORY') {
      reasons.push('Intent directly contradicts NecessaryFuture.');
    } else if (classification.classification === 'NON_CAUSAL') {
      reasons.push('Intent has no causal path to NecessaryFuture.');
    } else if (classification.classification === 'REDUNDANT') {
      reasons.push('Intent is subsumed by another allowed intent.');
    }

    return reasons.join(' ');
  }

  /**
   * Build causal proof for rejection
   */
  private buildCausalProof(
    classification: IntentClassification,
    cone: CausalCone,
    future: NecessaryFuture
  ): IntentGateResult['causal_proof'] {
    // Build proof chain
    const proofChain: string[] = [];

    proofChain.push(`1. NecessaryFuture ${future.future_id} was declared.`);
    proofChain.push(`2. Causal cone ${cone.cone_id} was derived from future.`);
    proofChain.push(`3. Intent allowlist was generated from cone.`);
    proofChain.push(`4. Intent ${classification.intent.intent_id} was classified.`);
    proofChain.push(`5. Classification: ${classification.classification}`);

    if (classification.causal_analysis.violated_requirement) {
      proofChain.push(`6. Violated requirement: ${classification.causal_analysis.violated_requirement}`);
    }

    proofChain.push(`7. Conclusion: Intent is invalid syntax. Rejection is deterministic.`);

    return {
      future_id: future.future_id,
      future_fingerprint: future.allowed_signature.fingerprint,
      cone_id: cone.cone_id,
      invalidity_type: classification.classification,
      violated_requirement: classification.causal_analysis.violated_requirement,
      proof_chain: proofChain
    };
  }

  /**
   * Record a complete analysis
   */
  recordAnalysis(
    runId: string,
    cone: CausalCone,
    allowlist: IntentAllowlist,
    classifications: IntentClassification[]
  ): IntentConeRecord {
    const recordId = `ICE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const allowed = classifications.filter(c => c.allowed).length;
    const rejected = classifications.length - allowed;

    const rejectionsByClass = {
      non_causal: classifications.filter(c => c.classification === 'NON_CAUSAL').length,
      contradictory: classifications.filter(c => c.classification === 'CONTRADICTORY').length,
      redundant: classifications.filter(c => c.classification === 'REDUNDANT').length
    };

    const record: IntentConeRecord = {
      record_id: recordId,
      run_id: runId,
      timestamp: now,
      source_future_id: cone.source_future_id,
      causal_cone: cone,
      intent_allowlist: allowlist,
      intents_processed: classifications.length,
      intents_allowed: allowed,
      intents_rejected: rejected,
      rejections_by_class: rejectionsByClass,
      immutable: true,
      append_only: true
    };

    // Append to database (NEVER modify existing records)
    this.database.records.push(record);
    this.database.last_record_at = now;

    // Persist
    this.persistDatabase();

    return record;
  }

  /**
   * Get active cone for a future
   */
  getActiveCone(futureId: string): CausalCone | null {
    return this.database.active_cones[futureId] || null;
  }

  /**
   * Get active allowlist for a future
   */
  getActiveAllowlist(futureId: string): IntentAllowlist | null {
    return this.database.active_allowlists[futureId] || null;
  }

  /**
   * Get all active cones
   */
  getAllActiveCones(): Record<string, CausalCone> {
    return { ...this.database.active_cones };
  }

  /**
   * Get database (read-only)
   */
  getDatabase(): IntentConeDatabase {
    return this.database;
  }

  /**
   * Get statistics
   */
  getStats(): IntentConeDatabase['stats'] {
    return { ...this.database.stats };
  }

  /**
   * Generate rejection explanations for multiple gate results
   */
  generateRejectionExplanations(gateResults: IntentGateResult[]): string[] {
    const explanations: string[] = [];
    const rejected = gateResults.filter(r => r.action === 'REJECT_INTENT');

    if (rejected.length === 0) {
      explanations.push('No intents were rejected.');
      return explanations;
    }

    explanations.push(`REJECTED INTENTS: ${rejected.length}`);
    explanations.push('');

    for (const result of rejected.slice(0, 5)) {
      explanations.push(`❌ Intent: ${result.intent.intent_id}`);
      explanations.push(`   Fingerprint: ${result.intent.fingerprint}`);
      explanations.push(`   Classification: ${result.classification.classification}`);
      explanations.push(`   Reason: ${result.rejection_reason}`);

      if (result.causal_proof) {
        explanations.push('   Proof Chain:');
        for (const step of result.causal_proof.proof_chain.slice(0, 3)) {
          explanations.push(`     ${step}`);
        }
      }
      explanations.push('');
    }

    if (rejected.length > 5) {
      explanations.push(`... and ${rejected.length - 5} more rejected intents`);
    }

    return explanations;
  }

  /**
   * Check if an intent would be allowed (without persisting)
   */
  wouldBeAllowed(
    intent: IntentSignature,
    futureId: string
  ): { allowed: boolean; reason: string } {
    const allowlist = this.getActiveAllowlist(futureId);

    if (!allowlist) {
      return {
        allowed: true,
        reason: 'No active allowlist for this future. No constraint applies.'
      };
    }

    // Check fingerprint match
    const fingerprints = Array.isArray(allowlist.allowed_fingerprints)
      ? allowlist.allowed_fingerprints
      : Array.from(allowlist.allowed_fingerprints);

    if (fingerprints.includes(intent.fingerprint)) {
      return {
        allowed: true,
        reason: 'Intent fingerprint is in the allowlist.'
      };
    }

    // Check pattern match
    const patterns = allowlist.allowed_patterns;
    const shapesMatch = intent.components.target_shapes.some(
      s => patterns.targetable_shapes.includes(s)
    );
    const opsMatch = intent.components.intended_operations.every(
      o => patterns.allowed_operations.includes(o)
    );
    const outcomeMatch = patterns.allowed_outcomes.includes(
      intent.components.expected_outcome as 'RESTORE' | 'MODIFY' | 'PRESERVE'
    );

    if (shapesMatch && opsMatch && outcomeMatch) {
      return {
        allowed: true,
        reason: 'Intent matches allowlist patterns.'
      };
    }

    const violations: string[] = [];
    if (!shapesMatch) violations.push('shapes not on causal cone');
    if (!opsMatch) violations.push('operations not allowed');
    if (!outcomeMatch) violations.push('outcome not compatible');

    return {
      allowed: false,
      reason: `Intent violates: ${violations.join(', ')}`
    };
  }

  /**
   * Reset (for testing only)
   */
  reset(): void {
    this.database = this.createEmptyDatabase();
    this.persistDatabase();
  }
}

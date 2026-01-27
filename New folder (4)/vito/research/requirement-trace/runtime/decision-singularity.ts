/**
 * Decision Singularity Manager
 *
 * Creates and manages immutable decision singularities.
 * Once a singularity is created, it CANNOT be:
 * - Modified
 * - Deleted
 * - Overridden
 * - Bypassed
 *
 * NON-NEGOTIABLE:
 * - Singularities are append-only
 * - No config, no flags, no overrides
 * - All decisions are irreversible
 * - Enforcement is deterministic
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  DecisionSingularity,
  SingularityDatabase,
  AllowedReality,
  ForbiddenFingerprint,
  MinimalCausalCutSet,
  CausalFingerprint,
  LockScope,
  RSRViolation
} from './types';
import type { HandoffId, LossClass } from '../types';

// RLL version - immutable
const RLL_VERSION = '1.0.0';
Object.freeze({ RLL_VERSION });

// Database filename
const DB_FILENAME = 'decision-singularities.json';

export class DecisionSingularityManager {
  private dataDir: string;
  private database: SingularityDatabase;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.database = this.loadDatabase();
  }

  /**
   * Load the singularity database from disk
   */
  private loadDatabase(): SingularityDatabase {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data) as SingularityDatabase;
      } catch (error) {
        // If corrupted, start fresh
        return this.createEmptyDatabase();
      }
    }

    return this.createEmptyDatabase();
  }

  /**
   * Create empty database
   */
  private createEmptyDatabase(): SingularityDatabase {
    return {
      version: RLL_VERSION,
      created_at: new Date().toISOString(),
      last_singularity_at: '',
      singularities: [],
      index: {
        by_shape: {},
        by_handoff: {},
        by_fingerprint: {}
      },
      stats: {
        total_singularities: 0,
        total_locked_shapes: 0,
        total_forbidden_fingerprints: 0,
        total_allowed_realities: 0
      }
    };
  }

  /**
   * Persist the database to disk
   *
   * APPEND-ONLY: Singularities can never be removed
   */
  private persistDatabase(): void {
    const dbPath = path.join(this.dataDir, DB_FILENAME);

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(dbPath, JSON.stringify(this.database, null, 2), 'utf-8');
  }

  /**
   * Check if a singularity should be created
   *
   * Conditions:
   * - Global RSR violation occurred
   * - MCCS has been computed
   */
  shouldCreateSingularity(
    globalRSR: number,
    requiredRSR: number,
    violations: RSRViolation[],
    mccsComputed: boolean
  ): boolean {
    // Must have RSR deficit
    if (globalRSR >= requiredRSR) {
      return false;
    }

    // Must have violations
    if (violations.length === 0) {
      return false;
    }

    // Must have MCCS computed
    if (!mccsComputed) {
      return false;
    }

    return true;
  }

  /**
   * Create a decision singularity
   *
   * This is IRREVERSIBLE. Once created, the singularity CANNOT be modified.
   */
  createSingularity(
    runId: string,
    globalRSR: number,
    requiredRSR: number,
    violations: RSRViolation[],
    mccsList: MinimalCausalCutSet[],
    fingerprints: CausalFingerprint[],
    lockScope: LockScope = 'PROJECT'
  ): DecisionSingularity {
    const singularityId = `SING-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Build allowed realities from MCCS
    const allowedRealities = this.buildAllowedRealities(mccsList);

    // Build forbidden fingerprints from loss-causing fingerprints
    const forbiddenFingerprints = this.buildForbiddenFingerprints(fingerprints, runId);

    // Determine locked shapes and handoffs
    const lockedShapes = this.determineLockShapes(violations, mccsList, lockScope);
    const lockedHandoffs = this.determineLockHandoffs(violations, mccsList, lockScope);

    const singularity: DecisionSingularity = {
      singularity_id: singularityId,
      created_at: now,
      run_id: runId,

      trigger: {
        global_rsr_at_trigger: globalRSR,
        required_rsr: requiredRSR,
        rsr_deficit: requiredRSR - globalRSR,
        violations_count: violations.length,
        mccs_computed: true
      },

      lock_scope: lockScope,
      locked_shapes: lockedShapes,
      locked_handoffs: lockedHandoffs,

      allowed_realities: allowedRealities,
      forbidden_fingerprints: forbiddenFingerprints,

      enforcement: {
        deviation_action: 'HARD_ABORT',
        no_override: true,
        no_retry: true,
        no_config: true,
        no_flag: true
      },

      proof: {
        mccs_proven: mccsList.length > 0,
        fingerprints_evidence_based: forbiddenFingerprints.length > 0,
        deterministic: true,
        immutable: true,
        append_only: true
      }
    };

    // Append to database (IMMUTABLE - never remove)
    this.database.singularities.push(singularity);
    this.database.last_singularity_at = now;

    // Update indexes
    this.updateIndexes(singularity);

    // Update stats
    this.updateStats();

    // Persist immediately
    this.persistDatabase();

    return singularity;
  }

  /**
   * Build allowed realities from MCCS list
   */
  private buildAllowedRealities(mccsList: MinimalCausalCutSet[]): AllowedReality[] {
    return mccsList
      .filter(mccs =>
        mccs.projected_outcome.all_tiers_compliant &&
        mccs.projected_outcome.invariants_preserved &&
        mccs.proof.verified_via_replay
      )
      .map(mccs => ({
        reality_id: `REALITY-${mccs.mccs_id}`,
        mccs_id: mccs.mccs_id,
        intervention_count: mccs.intervention_count,
        interventions: mccs.interventions.map(i => ({
          intervention_id: i.intervention_id,
          type: i.intervention_type,
          target_shape_id: i.target_shape_id,
          target_handoff_id: i.target_handoff_id
        })),
        projected_rsr: mccs.projected_outcome.global_rsr_after,
        compliance_restored: mccs.projected_outcome.all_tiers_compliant,
        invariants_preserved: mccs.projected_outcome.invariants_preserved
      }));
  }

  /**
   * Build forbidden fingerprints from loss-causing fingerprints
   */
  private buildForbiddenFingerprints(
    fingerprints: CausalFingerprint[],
    runId: string
  ): ForbiddenFingerprint[] {
    const now = new Date().toISOString();

    return fingerprints
      .filter(fp =>
        fp.shapes_lost.length > 0 ||
        fp.shapes_degraded.length > 0 ||
        fp.attribute_delta.attributes_lost.length > 0
      )
      .map(fp => {
        // Determine reason
        let reason: 'CAUSED_LOSS' | 'CAUSED_INVARIANT_VIOLATION' = 'CAUSED_LOSS';
        if (fp.invariant_shapes_present.some(
          shapeId => fp.shapes_lost.includes(shapeId) || fp.shapes_degraded.includes(shapeId)
        )) {
          reason = 'CAUSED_INVARIANT_VIOLATION';
        }

        // Determine loss class
        let lossClass: LossClass | null = null;
        if (fp.attribute_delta.attributes_lost.length > 0) {
          lossClass = 'L1_PARTIAL_CAPTURE';
        }
        if (fp.shapes_lost.length > 0) {
          lossClass = 'L0_TOTAL_OMISSION';
        }

        return {
          transform_hash: fp.transform_hash,
          original_run_id: runId,
          forbidden_at: now,
          reason,
          historical_shapes_lost: [...fp.shapes_lost, ...fp.shapes_degraded],
          historical_loss_class: lossClass
        };
      });
  }

  /**
   * Determine locked shapes based on scope
   */
  private determineLockShapes(
    violations: RSRViolation[],
    mccsList: MinimalCausalCutSet[],
    lockScope: LockScope
  ): string[] {
    const shapes = new Set<string>();

    // Always lock violated shapes
    for (const violation of violations) {
      shapes.add(violation.shape_id);
    }

    // Lock shapes from MCCS interventions
    for (const mccs of mccsList) {
      for (const intervention of mccs.interventions) {
        shapes.add(intervention.target_shape_id);
      }
    }

    return Array.from(shapes);
  }

  /**
   * Determine locked handoffs based on scope
   */
  private determineLockHandoffs(
    violations: RSRViolation[],
    mccsList: MinimalCausalCutSet[],
    lockScope: LockScope
  ): HandoffId[] {
    const handoffs = new Set<HandoffId>();

    // Lock handoffs from MCCS interventions
    for (const mccs of mccsList) {
      for (const intervention of mccs.interventions) {
        handoffs.add(intervention.target_handoff_id);
      }
    }

    return Array.from(handoffs);
  }

  /**
   * Update indexes after adding singularity
   */
  private updateIndexes(singularity: DecisionSingularity): void {
    // Index by shape
    for (const shapeId of singularity.locked_shapes) {
      if (!this.database.index.by_shape[shapeId]) {
        this.database.index.by_shape[shapeId] = [];
      }
      this.database.index.by_shape[shapeId].push(singularity.singularity_id);
    }

    // Index by handoff
    for (const handoffId of singularity.locked_handoffs) {
      if (!this.database.index.by_handoff[handoffId]) {
        this.database.index.by_handoff[handoffId] = [];
      }
      this.database.index.by_handoff[handoffId].push(singularity.singularity_id);
    }

    // Index by fingerprint
    for (const fp of singularity.forbidden_fingerprints) {
      this.database.index.by_fingerprint[fp.transform_hash] = singularity.singularity_id;
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const allShapes = new Set<string>();
    let totalForbidden = 0;
    let totalAllowed = 0;

    for (const sing of this.database.singularities) {
      for (const shape of sing.locked_shapes) {
        allShapes.add(shape);
      }
      totalForbidden += sing.forbidden_fingerprints.length;
      totalAllowed += sing.allowed_realities.length;
    }

    this.database.stats = {
      total_singularities: this.database.singularities.length,
      total_locked_shapes: allShapes.size,
      total_forbidden_fingerprints: totalForbidden,
      total_allowed_realities: totalAllowed
    };
  }

  /**
   * Get all active singularities
   */
  getActiveSingularities(): DecisionSingularity[] {
    // All singularities are always active (immutable)
    return [...this.database.singularities];
  }

  /**
   * Get singularities for a specific shape
   */
  getSingularitiesForShape(shapeId: string): DecisionSingularity[] {
    const ids = this.database.index.by_shape[shapeId] || [];
    return this.database.singularities.filter(s =>
      ids.includes(s.singularity_id)
    );
  }

  /**
   * Get singularities for a specific handoff
   */
  getSingularitiesForHandoff(handoffId: HandoffId): DecisionSingularity[] {
    const ids = this.database.index.by_handoff[handoffId] || [];
    return this.database.singularities.filter(s =>
      ids.includes(s.singularity_id)
    );
  }

  /**
   * Check if a transform hash is forbidden
   */
  isForbiddenHash(transformHash: string): { forbidden: boolean; singularityId: string | null } {
    const singularityId = this.database.index.by_fingerprint[transformHash];
    return {
      forbidden: !!singularityId,
      singularityId: singularityId || null
    };
  }

  /**
   * Get singularity by ID
   */
  getSingularity(singularityId: string): DecisionSingularity | undefined {
    return this.database.singularities.find(s => s.singularity_id === singularityId);
  }

  /**
   * Get all forbidden fingerprints across all singularities
   */
  getAllForbiddenFingerprints(): ForbiddenFingerprint[] {
    const all: ForbiddenFingerprint[] = [];
    for (const sing of this.database.singularities) {
      all.push(...sing.forbidden_fingerprints);
    }
    return all;
  }

  /**
   * Get all allowed realities across all singularities
   */
  getAllAllowedRealities(): AllowedReality[] {
    const all: AllowedReality[] = [];
    for (const sing of this.database.singularities) {
      all.push(...sing.allowed_realities);
    }
    return all;
  }

  /**
   * Get database statistics
   */
  getStats(): SingularityDatabase['stats'] {
    return { ...this.database.stats };
  }

  /**
   * Get full database (read-only)
   */
  getDatabase(): SingularityDatabase {
    return this.database;
  }

  /**
   * Clear database (for testing only)
   * IN PRODUCTION: This should be DISABLED
   */
  clearDatabase(): void {
    this.database = this.createEmptyDatabase();
    this.persistDatabase();
  }
}

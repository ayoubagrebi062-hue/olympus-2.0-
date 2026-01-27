/**
 * Predictive Fingerprint Firewall (PFF)
 *
 * Persists causal fingerprints into a global index and uses them
 * to preemptively block handoffs that historically caused loss.
 *
 * NON-NEGOTIABLE:
 * - No heuristics
 * - No ML
 * - No probability
 * - Decisions based ONLY on exact historical evidence
 * - If hash match + historical loss → BLOCK_PREEMPTIVELY
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FingerprintIndex,
  FingerprintIndexEntry,
  PredictiveBlock,
  CausalFingerprint
} from './types';
import type { HandoffId, TracedAgentId, LossClass } from '../types';
import { INVARIANT_SHAPES } from '../registry/shapes';

// OCIC version - immutable
const OCIC_VERSION = '1.0.0';
Object.freeze({ OCIC_VERSION });

// Index filename
const INDEX_FILENAME = 'fingerprint-index.json';

export class PredictiveFingerprintFirewall {
  private dataDir: string;
  private index: FingerprintIndex;
  private invariantShapeIds: Set<string>;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.invariantShapeIds = new Set(INVARIANT_SHAPES.map(s => s.id));
    this.index = this.loadIndex();
  }

  /**
   * Load the global fingerprint index from disk
   */
  private loadIndex(): FingerprintIndex {
    const indexPath = path.join(this.dataDir, INDEX_FILENAME);

    if (fs.existsSync(indexPath)) {
      try {
        const data = fs.readFileSync(indexPath, 'utf-8');
        return JSON.parse(data) as FingerprintIndex;
      } catch (error) {
        // If corrupted, start fresh
        return this.createEmptyIndex();
      }
    }

    return this.createEmptyIndex();
  }

  /**
   * Create empty index
   */
  private createEmptyIndex(): FingerprintIndex {
    return {
      version: OCIC_VERSION,
      last_updated: new Date().toISOString(),
      entries: {},
      stats: {
        total_unique_hashes: 0,
        total_fingerprints_indexed: 0,
        hashes_with_loss: 0,
        hashes_with_invariant_violation: 0
      }
    };
  }

  /**
   * Persist the index to disk
   */
  persistIndex(): void {
    const indexPath = path.join(this.dataDir, INDEX_FILENAME);

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.index.last_updated = new Date().toISOString();
    this.updateStats();

    fs.writeFileSync(indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  /**
   * Update index statistics
   */
  private updateStats(): void {
    const entries = Object.values(this.index.entries);

    this.index.stats = {
      total_unique_hashes: entries.length,
      total_fingerprints_indexed: entries.reduce(
        (sum, e) => sum + e.total_occurrences,
        0
      ),
      hashes_with_loss: entries.filter(e => e.loss_occurrences > 0).length,
      hashes_with_invariant_violation: entries.filter(
        e => e.invariant_violations > 0
      ).length
    };
  }

  /**
   * Index fingerprints from a run
   */
  indexFingerprints(fingerprints: CausalFingerprint[], runId: string): void {
    for (const fp of fingerprints) {
      this.indexFingerprint(fp, runId);
    }

    this.persistIndex();
  }

  /**
   * Index a single fingerprint
   */
  private indexFingerprint(fp: CausalFingerprint, runId: string): void {
    const hash = fp.transform_hash;

    // Create entry if not exists
    if (!this.index.entries[hash]) {
      this.index.entries[hash] = {
        transform_hash: hash,
        fingerprint_ids: [],
        run_ids: [],
        outcomes: [],
        total_occurrences: 0,
        loss_occurrences: 0,
        invariant_violations: 0,
        verdict: 'SAFE'
      };
    }

    const entry = this.index.entries[hash];

    // Add fingerprint and run
    entry.fingerprint_ids.push(fp.fingerprint_id);
    if (!entry.run_ids.includes(runId)) {
      entry.run_ids.push(runId);
    }

    // Determine outcome
    const causedLoss = fp.shapes_lost.length > 0 || fp.shapes_degraded.length > 0;
    const invariantViolated = fp.invariant_shapes_present.some(
      shapeId => fp.shapes_lost.includes(shapeId) || fp.shapes_degraded.includes(shapeId)
    );

    // Get loss class from attribute delta
    let lossClass: LossClass | null = null;
    if (fp.attribute_delta.attributes_lost.length > 0) {
      lossClass = 'L1_PARTIAL_CAPTURE';
    }
    if (fp.shapes_lost.length > 0) {
      lossClass = 'L0_TOTAL_OMISSION';
    }

    entry.outcomes.push({
      run_id: runId,
      timestamp: fp.timestamp,
      caused_loss: causedLoss,
      loss_class: lossClass,
      invariant_violated: invariantViolated,
      shapes_affected: [...fp.shapes_lost, ...fp.shapes_degraded]
    });

    // Update counts
    entry.total_occurrences++;
    if (causedLoss) {
      entry.loss_occurrences++;
    }
    if (invariantViolated) {
      entry.invariant_violations++;
    }

    // Update verdict (deterministic, not probabilistic)
    this.updateVerdict(entry);
  }

  /**
   * Update entry verdict based on historical outcomes
   *
   * Verdict is DETERMINISTIC:
   * - If ANY occurrence caused invariant violation → CAUSED_INVARIANT_VIOLATION
   * - Else if ANY occurrence caused loss → CAUSED_LOSS
   * - Else → SAFE
   */
  private updateVerdict(entry: FingerprintIndexEntry): void {
    if (entry.invariant_violations > 0) {
      entry.verdict = 'CAUSED_INVARIANT_VIOLATION';
    } else if (entry.loss_occurrences > 0) {
      entry.verdict = 'CAUSED_LOSS';
    } else {
      entry.verdict = 'SAFE';
    }
  }

  /**
   * Check if a transform hash should be blocked
   *
   * Returns PredictiveBlock if should block, null if safe to proceed.
   */
  checkHash(
    transformHash: string,
    handoffId: HandoffId,
    sourceAgent: TracedAgentId,
    targetAgent: TracedAgentId
  ): PredictiveBlock | null {
    const entry = this.index.entries[transformHash];

    // No history → safe
    if (!entry) {
      return null;
    }

    // Safe verdict → no block
    if (entry.verdict === 'SAFE') {
      return null;
    }

    // Find the historical evidence that caused the block
    const causingOutcome = entry.outcomes.find(o =>
      entry.verdict === 'CAUSED_INVARIANT_VIOLATION'
        ? o.invariant_violated
        : o.caused_loss
    );

    if (!causingOutcome) {
      return null;
    }

    // BLOCK_PREEMPTIVELY
    return {
      block_id: `PBLOCK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),

      trigger: {
        current_transform_hash: transformHash,
        current_handoff_id: handoffId,
        current_source_agent: sourceAgent,
        current_target_agent: targetAgent
      },

      historical_evidence: {
        matching_fingerprint_id: entry.fingerprint_ids[0],
        matching_run_id: causingOutcome.run_id,
        matching_timestamp: causingOutcome.timestamp,
        historical_loss_class: causingOutcome.loss_class ?? 'L1_PARTIAL_CAPTURE',
        historical_invariant_violated: causingOutcome.invariant_violated,
        historical_shapes_lost: causingOutcome.shapes_affected
      },

      decision: 'BLOCK_PREEMPTIVELY',

      proof_trace: {
        fingerprint_match_exact: true,
        transform_hash_identical: true,
        causal_link_established: true,
        no_heuristics: true,
        no_ml: true,
        no_probability: true
      }
    };
  }

  /**
   * Check all fingerprints against historical index
   *
   * Returns all blocks that would be issued.
   */
  checkFingerprints(fingerprints: CausalFingerprint[]): PredictiveBlock[] {
    const blocks: PredictiveBlock[] = [];

    for (const fp of fingerprints) {
      const block = this.checkHash(
        fp.transform_hash,
        fp.handoff_id,
        fp.source_agent,
        fp.target_agent
      );

      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Get entry for a hash
   */
  getEntry(transformHash: string): FingerprintIndexEntry | undefined {
    return this.index.entries[transformHash];
  }

  /**
   * Get all entries that caused loss
   */
  getDangerousEntries(): FingerprintIndexEntry[] {
    return Object.values(this.index.entries).filter(
      e => e.verdict !== 'SAFE'
    );
  }

  /**
   * Get all entries that caused invariant violations
   */
  getInvariantViolationEntries(): FingerprintIndexEntry[] {
    return Object.values(this.index.entries).filter(
      e => e.verdict === 'CAUSED_INVARIANT_VIOLATION'
    );
  }

  /**
   * Get index statistics
   */
  getStats(): FingerprintIndex['stats'] {
    return { ...this.index.stats };
  }

  /**
   * Get full index
   */
  getIndex(): FingerprintIndex {
    return this.index;
  }

  /**
   * Clear the index (for testing)
   */
  clearIndex(): void {
    this.index = this.createEmptyIndex();
    this.persistIndex();
  }
}

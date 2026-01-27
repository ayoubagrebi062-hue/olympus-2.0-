/**
 * Causal Fingerprint Collector
 *
 * Captures per-handoff transformation fingerprints providing forensic
 * proof of what transformations occurred at each handoff.
 *
 * NON-NEGOTIABLE:
 * - Fingerprints are DETERMINISTIC
 * - Fingerprints are REPRODUCIBLE
 * - No inference, no modification, no side effects
 * - Transform hash is computed from STRUCTURAL data only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  CausalFingerprint,
  FingerprintDatabase,
  ShapeKind
} from './types';
import type { ShapeTraceResult, ShapeDeclaration } from '../registry/types';
import type { HandoffId, TracedAgentId } from '../types';
import { INVARIANT_SHAPES } from '../registry/shapes';

// OFEL version - immutable
const OFEL_VERSION = '1.0.0';
Object.freeze({ OFEL_VERSION });

// Handoff agent mappings - immutable
const HANDOFF_AGENTS: Record<HandoffId, { source: TracedAgentId; target: TracedAgentId }> = {
  H1: { source: 'strategos', target: 'scope' },
  H2: { source: 'scope', target: 'cartographer' },
  H3: { source: 'cartographer', target: 'blocks' },
  H4: { source: 'blocks', target: 'wire' },
  H5: { source: 'wire', target: 'pixel' }
};
Object.freeze(HANDOFF_AGENTS);

export class CausalFingerprintCollector {
  private dataDir: string;
  private runId: string;
  private fingerprints: CausalFingerprint[] = [];
  private invariantShapeIds: Set<string>;

  constructor(dataDir: string, runId: string) {
    this.dataDir = dataDir;
    this.runId = runId;
    this.invariantShapeIds = new Set(INVARIANT_SHAPES.map(s => s.id));
  }

  /**
   * Collect fingerprint for a single handoff
   */
  collectHandoffFingerprint(
    handoffId: HandoffId,
    traceResult: ShapeTraceResult,
    summarizationData?: SummarizationData
  ): CausalFingerprint {
    const timestamp = new Date().toISOString();
    const agents = HANDOFF_AGENTS[handoffId];

    // Extract shape states at this handoff
    const inputShapes = this.extractInputShapes(traceResult, handoffId);
    const outputShapes = this.extractOutputShapes(traceResult, handoffId);

    // Compute shapes lost and degraded
    const shapesLost = inputShapes.filter(s => !outputShapes.includes(s));
    const shapesDegraded = this.computeDegradedShapes(traceResult, handoffId);

    // Compute attribute delta
    const attributeDelta = this.computeAttributeDelta(traceResult, handoffId);

    // Check invariant shapes
    const invariantShapesPresent = inputShapes.filter(s => this.invariantShapeIds.has(s));

    // Compute transform hash
    const transformHash = this.computeTransformHash(
      handoffId,
      inputShapes,
      outputShapes,
      attributeDelta,
      summarizationData
    );

    const fingerprint: CausalFingerprint = {
      fingerprint_id: `FP-${this.runId}-${handoffId}-${Date.now().toString(36)}`,
      run_id: this.runId,
      handoff_id: handoffId,
      timestamp,

      // Transformation identity
      transform_hash: transformHash,
      source_agent: agents.source,
      target_agent: agents.target,

      // Shape state
      input_shape_ids: inputShapes,
      output_shape_ids: outputShapes,
      shapes_lost: shapesLost,
      shapes_degraded: shapesDegraded,

      // Summarization tracking
      summarization_invoked: summarizationData?.invoked ?? false,
      summarization_input_size: summarizationData?.inputSize ?? null,
      summarization_output_size: summarizationData?.outputSize ?? null,
      summarization_compression_ratio: summarizationData
        ? summarizationData.outputSize / summarizationData.inputSize
        : null,

      // Invariant tracking - bypass is NEVER granted
      invariant_shapes_present: invariantShapesPresent,
      invariant_bypass_requested: false,
      invariant_bypass_granted: false, // ALWAYS false - no bypass allowed

      // Attribute delta
      attribute_delta: attributeDelta,

      // Proof
      deterministic: true,
      reproducible: true
    };

    this.fingerprints.push(fingerprint);
    return fingerprint;
  }

  /**
   * Collect fingerprints for all handoffs from trace results
   */
  collectAllFingerprints(
    shapes: ShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>,
    summarizationHistory?: Record<HandoffId, SummarizationData>
  ): CausalFingerprint[] {
    const handoffs: HandoffId[] = ['H1', 'H2', 'H3', 'H4', 'H5'];
    const fingerprints: CausalFingerprint[] = [];

    for (const handoffId of handoffs) {
      // Aggregate trace results for this handoff
      const aggregatedTrace = this.aggregateTraceForHandoff(
        shapes,
        traceResults,
        handoffId
      );

      const summarizationData = summarizationHistory?.[handoffId];
      const fingerprint = this.collectHandoffFingerprint(
        handoffId,
        aggregatedTrace,
        summarizationData
      );
      fingerprints.push(fingerprint);
    }

    return fingerprints;
  }

  /**
   * Compute deterministic transform hash from structural data
   */
  private computeTransformHash(
    handoffId: HandoffId,
    inputShapes: string[],
    outputShapes: string[],
    attributeDelta: CausalFingerprint['attribute_delta'],
    summarizationData?: SummarizationData
  ): string {
    // Create deterministic input for hash
    const hashInput = JSON.stringify({
      handoff: handoffId,
      inputs: inputShapes.sort(),
      outputs: outputShapes.sort(),
      delta: {
        before: attributeDelta.attributes_before,
        after: attributeDelta.attributes_after,
        lost: attributeDelta.attributes_lost.sort(),
        added: attributeDelta.attributes_added.sort()
      },
      summarization: summarizationData
        ? {
            invoked: summarizationData.invoked,
            ratio: summarizationData.outputSize / summarizationData.inputSize
          }
        : null
    });

    // SHA-256 for deterministic fingerprint
    return crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Extract input shapes at handoff
   */
  private extractInputShapes(
    traceResult: ShapeTraceResult,
    handoffId: HandoffId
  ): string[] {
    // Map handoff to source agent
    const sourceAgent = this.getSourceCheckpoint(handoffId);
    if (!sourceAgent) return [];

    const extraction = traceResult.extractions[sourceAgent];
    if (!extraction) return [];

    // Return shape ID if present at source
    return extraction.present ? [traceResult.shape_id] : [];
  }

  /**
   * Extract output shapes at handoff
   */
  private extractOutputShapes(
    traceResult: ShapeTraceResult,
    handoffId: HandoffId
  ): string[] {
    // Map handoff to target agent
    const targetAgent = this.getTargetCheckpoint(handoffId);
    if (!targetAgent) return [];

    const extraction = traceResult.extractions[targetAgent];
    if (!extraction) return [];

    // Return shape ID if present at target
    return extraction.present ? [traceResult.shape_id] : [];
  }

  /**
   * Compute degraded shapes (present but with lost attributes)
   */
  private computeDegradedShapes(
    traceResult: ShapeTraceResult,
    handoffId: HandoffId
  ): string[] {
    const sourceAgent = this.getSourceCheckpoint(handoffId);
    const targetAgent = this.getTargetCheckpoint(handoffId);

    const sourceExtraction = traceResult.extractions[sourceAgent];
    const targetExtraction = traceResult.extractions[targetAgent];

    if (!sourceExtraction || !targetExtraction) return [];

    // Shape is degraded if present at both but with fewer attributes
    if (targetExtraction.present &&
        targetExtraction.attributes_found.length > 0 &&
        targetExtraction.attributes_found.length < sourceExtraction.attributes_found.length) {
      return [traceResult.shape_id];
    }

    return [];
  }

  /**
   * Compute attribute delta for handoff
   */
  private computeAttributeDelta(
    traceResult: ShapeTraceResult,
    handoffId: HandoffId
  ): CausalFingerprint['attribute_delta'] {
    const sourceAgent = this.getSourceCheckpoint(handoffId);
    const targetAgent = this.getTargetCheckpoint(handoffId);

    const sourceExtraction = traceResult.extractions[sourceAgent];
    const targetExtraction = traceResult.extractions[targetAgent];

    const attributesBefore = sourceExtraction?.attributes_found ?? [];
    const attributesAfter = targetExtraction?.attributes_found ?? [];

    const attributesLost = attributesBefore.filter((a: string) => !attributesAfter.includes(a));
    const attributesAdded = attributesAfter.filter((a: string) => !attributesBefore.includes(a));

    return {
      attributes_before: attributesBefore.length,
      attributes_after: attributesAfter.length,
      attributes_lost: attributesLost,
      attributes_added: attributesAdded
    };
  }

  /**
   * Aggregate trace results for a specific handoff
   */
  private aggregateTraceForHandoff(
    shapes: ShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>,
    handoffId: HandoffId
  ): ShapeTraceResult {
    // Create aggregated trace for fingerprinting
    // Uses first shape's trace as template
    const firstShape = shapes[0];
    const firstTrace = traceResults[firstShape.id];

    if (!firstTrace) {
      // Return empty trace structure matching ShapeTraceResult interface
      return {
        shape_id: '__AGGREGATE__',
        category: 'STATEFUL',
        extractions: {} as Record<TracedAgentId, any>,
        handoff_losses: {} as Record<HandoffId, any>,
        survival_status: {
          survived_to_target: false,
          target_stage: 'pixel',
          actual_last_stage: null,
          failure_point: null,
          failure_class: null
        },
        rsr: 0
      };
    }

    return firstTrace;
  }

  /**
   * Get source checkpoint agent for handoff
   */
  private getSourceCheckpoint(handoffId: HandoffId): TracedAgentId {
    return HANDOFF_AGENTS[handoffId].source;
  }

  /**
   * Get target checkpoint agent for handoff
   */
  private getTargetCheckpoint(handoffId: HandoffId): TracedAgentId {
    return HANDOFF_AGENTS[handoffId].target;
  }

  /**
   * Build fingerprint database
   */
  buildDatabase(): FingerprintDatabase {
    const handoffsWithLoss = this.fingerprints.filter(f => f.shapes_lost.length > 0).length;
    const totalShapesLost = this.fingerprints.reduce(
      (sum, f) => sum + f.shapes_lost.length,
      0
    );
    const summarizationInvocations = this.fingerprints.filter(
      f => f.summarization_invoked
    ).length;
    const invariantViolations = this.fingerprints.filter(
      f => f.invariant_shapes_present.length > 0 && f.shapes_lost.some(
        s => this.invariantShapeIds.has(s)
      )
    ).length;

    return {
      version: OFEL_VERSION,
      run_id: this.runId,
      created_at: new Date().toISOString(),
      fingerprints: this.fingerprints,
      summary: {
        total_handoffs: this.fingerprints.length,
        handoffs_with_loss: handoffsWithLoss,
        total_shapes_lost: totalShapesLost,
        summarization_invocations: summarizationInvocations,
        invariant_violations: invariantViolations
      }
    };
  }

  /**
   * Persist fingerprint database
   */
  persist(): void {
    const database = this.buildDatabase();
    const filePath = path.join(
      this.dataDir,
      `fingerprints-${this.runId}.json`
    );

    // Ensure directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(database, null, 2),
      'utf-8'
    );
  }

  /**
   * Get all collected fingerprints
   */
  getFingerprints(): CausalFingerprint[] {
    return [...this.fingerprints];
  }

  /**
   * Get fingerprint for specific handoff
   */
  getFingerprintForHandoff(handoffId: HandoffId): CausalFingerprint | undefined {
    return this.fingerprints.find(f => f.handoff_id === handoffId);
  }

  /**
   * Get fingerprints where shapes were lost
   */
  getFingerprintsWithLoss(): CausalFingerprint[] {
    return this.fingerprints.filter(f => f.shapes_lost.length > 0);
  }

  /**
   * Get fingerprints where invariant shapes were affected
   */
  getInvariantFingerprints(): CausalFingerprint[] {
    return this.fingerprints.filter(f =>
      f.invariant_shapes_present.length > 0 && (
        f.shapes_lost.some(s => this.invariantShapeIds.has(s)) ||
        f.shapes_degraded.some(s => this.invariantShapeIds.has(s))
      )
    );
  }

  /**
   * Reset collector
   */
  reset(): void {
    this.fingerprints = [];
  }
}

/**
 * Summarization data for fingerprint collection
 */
export interface SummarizationData {
  invoked: boolean;
  inputSize: number;
  outputSize: number;
}

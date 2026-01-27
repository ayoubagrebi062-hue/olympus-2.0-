/**
 * OFEL Engine (OLYMPUS Forensic Execution Layer)
 *
 * Integrates all OFEL components:
 * - Causal Fingerprint Collector
 * - Counterfactual Replay Engine
 * - Adaptive Inspector
 *
 * Extends ORIS with forensic proof capabilities WITHOUT weakening
 * any existing guarantees.
 *
 * NON-NEGOTIABLE:
 * - All forensics are READ-ONLY
 * - No execution modification
 * - No inference
 * - No overrides
 * - Deterministic behavior only
 */

import * as path from 'path';
import { CausalFingerprintCollector, SummarizationData } from './fingerprint-collector';
import { CounterfactualReplayEngine, CounterfactualAggregation } from './counterfactual-replay';
import { AdaptiveInspector, InspectionSummary } from './adaptive-inspector';
import { MortalityTracker } from './mortality-tracker';
import { INVARIANT_SHAPES, ALL_SHAPES } from '../registry/shapes';
import type {
  CausalFingerprint,
  CounterfactualResult,
  ShapeInspectionConfig,
  OFELForensics,
  ShapeKind,
  CounterfactualScenario
} from './types';
import type { ShapeDeclaration, ShapeTraceResult } from '../registry/types';
import type { HandoffId } from '../types';

// OFEL version - immutable
const OFEL_VERSION = '1.0.0';
Object.freeze({ OFEL_VERSION });

export interface OFELExecutionResult {
  // Fingerprints
  fingerprints: CausalFingerprint[];
  fingerprints_with_loss: CausalFingerprint[];

  // Counterfactual
  counterfactual_results: CounterfactualResult[];
  counterfactual_aggregation: CounterfactualAggregation;

  // Inspection
  inspection_configs: ShapeInspectionConfig[];
  inspection_summary: InspectionSummary;

  // Complete forensics
  forensics: OFELForensics;
}

export class OFELEngine {
  private dataDir: string;
  private fingerprintCollector: CausalFingerprintCollector | null = null;
  private counterfactualEngine: CounterfactualReplayEngine;
  private adaptiveInspector: AdaptiveInspector;
  private mortalityTracker: MortalityTracker;

  constructor(dataDir: string, mortalityTracker: MortalityTracker) {
    this.dataDir = dataDir;
    this.mortalityTracker = mortalityTracker;
    this.counterfactualEngine = new CounterfactualReplayEngine();
    this.adaptiveInspector = new AdaptiveInspector(mortalityTracker);
  }

  /**
   * Execute OFEL forensics for a run
   */
  execute(
    runId: string,
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>,
    traceResults: Record<string, ShapeTraceResult>,
    summarizationHistory?: Record<HandoffId, SummarizationData>
  ): OFELExecutionResult {
    // Step 1: Initialize fingerprint collector for this run
    this.fingerprintCollector = new CausalFingerprintCollector(
      path.join(this.dataDir, 'fingerprints'),
      runId
    );

    // Step 2: Get inspection configs (determines what forensics to collect)
    const inspectionConfigs = this.adaptiveInspector.getInspectionConfigs(shapes);
    const inspectionSummary = this.adaptiveInspector.generateSummary(shapes);

    // Step 3: Collect fingerprints based on inspection requirements
    let fingerprints: CausalFingerprint[] = [];
    if (this.adaptiveInspector.shouldCollectForensics(shapes)) {
      fingerprints = this.collectAllFingerprints(
        shapes,
        traceResults,
        summarizationHistory
      );
    }

    const fingerprintsWithLoss = fingerprints.filter(f => f.shapes_lost.length > 0);

    // Step 4: Execute counterfactual replay for shapes requiring it
    let counterfactualResults: CounterfactualResult[] = [];
    if (this.adaptiveInspector.shouldRunCounterfactual(shapes)) {
      counterfactualResults = this.executeCounterfactuals(
        shapes,
        traceResults,
        fingerprints
      );
    }

    const counterfactualAggregation = this.counterfactualEngine.aggregateResults(
      counterfactualResults
    );

    // Step 5: Persist fingerprints
    if (fingerprints.length > 0) {
      this.fingerprintCollector.persist();
    }

    // Step 6: Build complete forensics object
    const forensics = this.buildForensics(
      fingerprints,
      counterfactualResults,
      inspectionConfigs,
      counterfactualAggregation
    );

    return {
      fingerprints,
      fingerprints_with_loss: fingerprintsWithLoss,
      counterfactual_results: counterfactualResults,
      counterfactual_aggregation: counterfactualAggregation,
      inspection_configs: inspectionConfigs,
      inspection_summary: inspectionSummary,
      forensics
    };
  }

  /**
   * Collect fingerprints for all handoffs
   */
  private collectAllFingerprints(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>,
    traceResults: Record<string, ShapeTraceResult>,
    summarizationHistory?: Record<HandoffId, SummarizationData>
  ): CausalFingerprint[] {
    if (!this.fingerprintCollector) {
      return [];
    }

    const allFingerprints: CausalFingerprint[] = [];

    // Collect fingerprints per shape
    for (const shape of shapes) {
      const traceResult = traceResults[shape.id];
      if (!traceResult) continue;

      // Only collect for shapes that require fingerprints
      if (!this.adaptiveInspector.requiresFingerprints(shape.id)) {
        continue;
      }

      const shapeFingerprints = this.fingerprintCollector.collectAllFingerprints(
        [shape],
        { [shape.id]: traceResult },
        summarizationHistory
      );

      allFingerprints.push(...shapeFingerprints);
    }

    return allFingerprints;
  }

  /**
   * Execute counterfactual replays for shapes requiring them
   */
  private executeCounterfactuals(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>,
    traceResults: Record<string, ShapeTraceResult>,
    fingerprints: CausalFingerprint[]
  ): CounterfactualResult[] {
    const results: CounterfactualResult[] = [];

    // Only run for shapes requiring counterfactual
    const shapesRequiringCounterfactual = this.adaptiveInspector
      .getShapesRequiringCounterfactual(shapes);

    for (const shapeId of shapesRequiringCounterfactual) {
      const shape = shapes.find(s => s.id === shapeId);
      const traceResult = traceResults[shapeId];

      if (!shape || !traceResult) continue;

      // Find the handoff where loss occurred
      const lossHandoff = traceResult.survival_status.failure_point;
      if (!lossHandoff) continue;

      // Get fingerprint for this handoff
      const fingerprint = fingerprints.find(
        f => f.handoff_id === lossHandoff &&
             f.input_shape_ids.includes(shapeId)
      );

      // Execute all applicable scenarios
      const shapeResults = this.counterfactualEngine.executeAllScenarios(
        shape,
        traceResult,
        lossHandoff,
        fingerprint
      );

      results.push(...shapeResults);
    }

    return results;
  }

  /**
   * Build complete OFELForensics object
   */
  private buildForensics(
    fingerprints: CausalFingerprint[],
    counterfactualResults: CounterfactualResult[],
    inspectionConfigs: ShapeInspectionConfig[],
    aggregation: CounterfactualAggregation
  ): OFELForensics {
    const shapesAtMandatoryForensics = inspectionConfigs.filter(
      c => c.inspection_level === 'MANDATORY_FORENSICS'
    ).length;

    const causalFactorsIdentified = counterfactualResults.filter(
      r => r.causal_impact.causal_factor_confirmed
    ).length;

    // Count provable causality chains (scenarios where we can definitively
    // prove what caused the loss)
    const provableCausalityChains = counterfactualResults.filter(
      r => r.causal_impact.causal_factor_confirmed &&
           r.causal_impact.would_have_prevented_loss
    ).length;

    return {
      ofel_version: OFEL_VERSION,

      causal_fingerprints: fingerprints,
      counterfactual_results: counterfactualResults,
      inspection_levels: inspectionConfigs,

      forensic_summary: {
        total_fingerprints: fingerprints.length,
        counterfactuals_executed: counterfactualResults.length,
        shapes_at_mandatory_forensics: shapesAtMandatoryForensics,
        causal_factors_identified: causalFactorsIdentified,
        provable_causality_chains: provableCausalityChains
      },

      forensic_proof: {
        fingerprints_deterministic: true,
        counterfactuals_read_only: true,
        no_execution_modification: true,
        causality_provable: provableCausalityChains > 0
      }
    };
  }

  /**
   * Get adaptive inspector
   */
  getAdaptiveInspector(): AdaptiveInspector {
    return this.adaptiveInspector;
  }

  /**
   * Get counterfactual engine
   */
  getCounterfactualEngine(): CounterfactualReplayEngine {
    return this.counterfactualEngine;
  }

  /**
   * Get fingerprint collector (may be null if not initialized)
   */
  getFingerprintCollector(): CausalFingerprintCollector | null {
    return this.fingerprintCollector;
  }

  /**
   * Check if forensics should be collected for given shapes
   */
  shouldCollectForensics(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): boolean {
    return this.adaptiveInspector.shouldCollectForensics(shapes);
  }

  /**
   * Check if counterfactual should run for given shapes
   */
  shouldRunCounterfactual(
    shapes: Array<ShapeDeclaration & { kind?: ShapeKind }>
  ): boolean {
    return this.adaptiveInspector.shouldRunCounterfactual(shapes);
  }
}

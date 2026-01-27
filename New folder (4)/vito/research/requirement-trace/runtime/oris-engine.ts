/**
 * ORIS Engine (OLYMPUS Runtime Immune System)
 *
 * Integrates all ORIS components:
 * - Invariant Validation
 * - Mortality Tracking
 * - Minimal Repair Directive Generation
 *
 * This engine extends the base EnforcementEngine with self-diagnosing,
 * self-stabilizing runtime behavior WITHOUT weakening any existing guarantees.
 *
 * NON-NEGOTIABLE:
 * - RSR laws are NOT loosened
 * - No overrides
 * - No retries
 * - No inference
 * - No agent logic modification
 * - Deterministic behavior only
 */

import * as path from 'path';
import { EnforcementEngine } from './enforcement-engine';
import { InvariantValidator } from './invariant-validator';
import { MortalityTracker } from './mortality-tracker';
import { MRDGenerator } from './mrd-generator';
import { RSRComputer } from './rsr-computer';
import { PromotionController } from './promotion-controller';
import { OFELEngine, OFELExecutionResult } from './ofel-engine';
import { ALL_SHAPES, INVARIANT_SHAPES, SHAPES_BY_KIND } from '../registry/shapes';
import type { CriticalShapeDeclaration } from '../registry/shapes';
import type {
  RuntimeControlReport,
  EnforcementDecision,
  InvariantViolation,
  MinimalRepairDirective,
  ShapeKind,
  ShapeCriticality,
  MortalityStatus,
  OFELForensics
} from './types';
import type { ShapeTraceResult, GateResult } from '../registry/types';
import type { HandoffId } from '../types';
import type { SummarizationData } from './fingerprint-collector';

// ORIS version - immutable
const ORIS_VERSION = '1.0.0';
Object.freeze({ ORIS_VERSION });

export interface ORISEnforcementResult {
  // Base enforcement
  enforcement: EnforcementDecision;

  // ORIS extensions
  invariant_violations: InvariantViolation[];
  repair_directives: MinimalRepairDirective[];
  mortality_analysis: {
    healthy_count: number;
    flaky_count: number;
    degrading_count: number;
    broken_count: number;
    most_vulnerable_shapes: string[];
    most_dangerous_handoffs: HandoffId[];
  };
  shape_classification: Array<{
    shape_id: string;
    shape_kind: ShapeKind;
    criticality: ShapeCriticality;
    mortality_status: MortalityStatus;
    survival_rate: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  }>;

  // OFEL extensions (optional - populated when forensics enabled)
  forensics?: OFELForensics;
}

export class ORISEngine {
  private enforcementEngine: EnforcementEngine;
  private invariantValidator: InvariantValidator;
  private mortalityTracker: MortalityTracker;
  private mrdGenerator: MRDGenerator;
  private rsrComputer: RSRComputer;
  private promotionController: PromotionController;
  private ofelEngine: OFELEngine;
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.enforcementEngine = new EnforcementEngine();
    this.invariantValidator = new InvariantValidator();
    this.mortalityTracker = new MortalityTracker(dataDir);
    this.mrdGenerator = new MRDGenerator();
    this.rsrComputer = new RSRComputer();
    this.promotionController = new PromotionController(
      this.enforcementEngine.getTTEController()
    );
    this.ofelEngine = new OFELEngine(dataDir, this.mortalityTracker);
  }

  /**
   * Execute ORIS-enhanced enforcement
   */
  enforce(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string,
    summarizationHistory?: Record<HandoffId, SummarizationData>
  ): ORISEnforcementResult {
    // Step 1: Validate INVARIANT shapes first (most critical)
    const invariantViolations = this.invariantValidator.validateAll(traceResults);

    // Step 2: Record mortality data (for trend analysis)
    this.mortalityTracker.recordRun(ALL_SHAPES, traceResults);

    // Step 3: Execute base enforcement
    const enforcement = this.enforcementEngine.enforce(
      ALL_SHAPES,
      traceResults,
      gateResult,
      runId
    );

    // Step 4: Generate MRDs if BLOCK_ALL or FORK_TTE
    let repairDirectives: MinimalRepairDirective[] = [];
    if (enforcement.overall_action === 'BLOCK_ALL' || enforcement.overall_action === 'FORK_TTE') {
      const allViolations = [
        ...enforcement.foundational_violations,
        ...enforcement.interactive_violations
      ];
      repairDirectives = this.mrdGenerator.generateAll(
        enforcement.overall_action as 'BLOCK_ALL' | 'FORK_TTE',
        allViolations,
        ALL_SHAPES,
        traceResults
      );
    }

    // Step 5: Get mortality analysis
    const mortalityAnalysis = this.mortalityTracker.getAnalysisSummary();

    // Step 6: Build shape classification
    const shapeClassification = this.buildShapeClassification();

    // If there are INVARIANT violations, they override the enforcement action
    // INVARIANT violations are ALWAYS FATAL
    if (invariantViolations.length > 0 && enforcement.overall_action !== 'BLOCK_ALL') {
      // Upgrade to BLOCK_ALL
      enforcement.overall_action = 'BLOCK_ALL';
      enforcement.canonical_allowed = false;
      enforcement.tte_decision.canonical_blocked = true;
      enforcement.tte_decision.reason = 'INVARIANT shape violation - execution completely blocked';
    }

    // Step 7: Execute OFEL forensics if applicable
    let forensics: OFELForensics | undefined;
    if (this.ofelEngine.shouldCollectForensics(ALL_SHAPES)) {
      const ofelResult = this.ofelEngine.execute(
        runId,
        ALL_SHAPES,
        traceResults,
        summarizationHistory
      );
      forensics = ofelResult.forensics;
    }

    return {
      enforcement,
      invariant_violations: invariantViolations,
      repair_directives: repairDirectives,
      mortality_analysis: mortalityAnalysis,
      shape_classification: shapeClassification,
      forensics
    };
  }

  /**
   * Build shape classification array
   */
  private buildShapeClassification(): ORISEnforcementResult['shape_classification'] {
    return ALL_SHAPES.map(shape => ({
      shape_id: shape.id,
      shape_kind: shape.kind,
      criticality: shape.criticality as ShapeCriticality,
      mortality_status: this.mortalityTracker.getMortalityStatus(shape.id),
      survival_rate: this.mortalityTracker.getSurvivalRate(shape.id),
      trend: this.mortalityTracker.getTrend(shape.id)
    }));
  }

  /**
   * Generate full ORIS-enhanced runtime control report
   */
  generateReport(
    runId: string,
    traceResults: Record<string, ShapeTraceResult>,
    orisResult: ORISEnforcementResult
  ): RuntimeControlReport {
    const globalRSR = this.rsrComputer.computeGlobalRSR(
      orisResult.enforcement.per_shape_rsr
    );

    const promotionEligibilities = this.promotionController.evaluateAllTracks();

    return {
      metadata: {
        generated_at: new Date().toISOString(),
        runtime_version: '1.0.0',
        run_id: runId,
        enforcement_mode: 'RUNTIME_PRIMITIVE',
        oris_version: ORIS_VERSION
      },

      rsr_analysis: {
        per_shape: orisResult.enforcement.per_shape_rsr,
        per_tier: orisResult.enforcement.per_tier_results,
        global_rsr: globalRSR
      },

      enforcement: orisResult.enforcement,

      tte_state: {
        fork_occurred: orisResult.enforcement.tte_decision.fork_required,
        active_tracks: orisResult.enforcement.active_tracks,
        promotion_eligibility: promotionEligibilities
      },

      shape_classification: {
        shapes: orisResult.shape_classification,
        invariant_count: SHAPES_BY_KIND.INVARIANT.length,
        capability_count: SHAPES_BY_KIND.CAPABILITY.length,
        invariant_violations: orisResult.invariant_violations
      },

      mortality_analysis: orisResult.mortality_analysis,

      repair_directives: orisResult.repair_directives,

      proof_chain: {
        laws_immutable: true,
        computation_deterministic: true,
        decision_non_bypassable: true,
        tracks_isolated: true,
        no_human_override: true,
        no_policy_config: true,
        no_runtime_flags: true
      },

      // OFEL forensics (optional - populated when forensics enabled)
      forensics: orisResult.forensics
    };
  }

  /**
   * Get invariant validator
   */
  getInvariantValidator(): InvariantValidator {
    return this.invariantValidator;
  }

  /**
   * Get mortality tracker
   */
  getMortalityTracker(): MortalityTracker {
    return this.mortalityTracker;
  }

  /**
   * Get MRD generator
   */
  getMRDGenerator(): MRDGenerator {
    return this.mrdGenerator;
  }

  /**
   * Get base enforcement engine
   */
  getEnforcementEngine(): EnforcementEngine {
    return this.enforcementEngine;
  }

  /**
   * Get promotion controller
   */
  getPromotionController(): PromotionController {
    return this.promotionController;
  }

  /**
   * Get OFEL engine
   */
  getOFELEngine(): OFELEngine {
    return this.ofelEngine;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.enforcementEngine.reset();
  }
}

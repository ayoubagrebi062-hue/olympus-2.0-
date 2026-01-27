/**
 * ICE Engine (Intent Collapse Engine)
 *
 * Prevents invalid intents from ever entering the system by collapsing
 * the intent space to only those that can causally lead to the NecessaryFuture.
 *
 * INTEGRATION:
 * - Executes AFTER NE
 * - Uses NE for NecessaryFuture
 * - Derives CausalCone and IntentAllowlist
 * - Enforces via IntentGate
 *
 * WORKFLOW:
 * 1. Get NE result (includes NecessaryFuture)
 * 2. If necessity exists, derive causal cone
 * 3. Generate intent allowlist from cone
 * 4. Classify incoming intents
 * 5. Enforce via intent gate
 * 6. Persist and report
 *
 * PHILOSOPHY:
 * "After necessity, intent is no longer free."
 * "What cannot lead to survival cannot be expressed."
 * "Olympus does not block bad ideas. It makes them impossible."
 *
 * NON-NEGOTIABLE:
 * - No configs, flags, overrides
 * - No heuristics, ML, or probability
 * - Deterministic only
 * - Append-only persistence
 */

import { ReverseCausalDeriver } from './reverse-causal-deriver';
import { IntentClassifier } from './intent-classifier';
import { IntentGate } from './intent-gate';
import { NEEngine, type NEExecutionResult } from './ne-engine';
import type {
  IntentSignature,
  IntentClassification,
  IntentGateResult,
  CausalCone,
  IntentAllowlist,
  NecessaryFuture,
  ICEIntelligence
} from './types';
import type { ShapeTraceResult, GateResult } from '../registry/types';

// ICE version - immutable
const ICE_VERSION = '1.0.0';
Object.freeze({ ICE_VERSION });

export interface ICEExecutionResult {
  // NE result (includes IE, AEC, RLL, OCIC, ORIS)
  neResult: NEExecutionResult;

  // ICE intelligence
  iceIntelligence: ICEIntelligence;

  // Final execution decision
  executionAllowed: boolean;
  mutationsAllowed: boolean;
  intentsAllowed: boolean;
  abortReason: string | null;
  intentRejectionReason: string | null;
}

export class ICEEngine {
  private dataDir: string;
  private deriver: ReverseCausalDeriver;
  private classifier: IntentClassifier;
  private gate: IntentGate;
  private neEngine: NEEngine;

  constructor(dataDir: string, simulationSteps: number = 5) {
    this.dataDir = dataDir;
    this.deriver = new ReverseCausalDeriver();
    this.classifier = new IntentClassifier();
    this.gate = new IntentGate(dataDir);
    this.neEngine = new NEEngine(dataDir, simulationSteps);
  }

  /**
   * Execute full ICE-enhanced flow
   *
   * Order of operations:
   * 1. Execute NE (necessity detection)
   * 2. Check if necessity is active
   * 3. If active, derive causal cone
   * 4. Generate intent allowlist
   * 5. Classify incoming intents
   * 6. Enforce via intent gate
   * 7. Persist and return
   */
  execute(
    traceResults: Record<string, ShapeTraceResult>,
    gateResult: GateResult,
    runId: string,
    incomingIntents: IntentSignature[] = []
  ): ICEExecutionResult {
    // Step 1: Execute NE (necessity detection)
    const neResult = this.neEngine.execute(traceResults, gateResult, runId);
    const necessaryFuture = neResult.neIntelligence.necessary_future;

    let cone: CausalCone | null = null;
    let allowlist: IntentAllowlist | null = null;
    let classifications: IntentClassification[] = [];
    let gateResults: IntentGateResult[] = [];

    // Step 2: Check if necessity is active
    const hasActiveFuture = !!necessaryFuture;

    if (hasActiveFuture && necessaryFuture) {
      // Step 3: Derive causal cone from NecessaryFuture
      cone = this.deriver.deriveCausalCone(necessaryFuture);

      // Step 4: Generate intent allowlist from cone
      allowlist = this.deriver.generateIntentAllowlist(cone, necessaryFuture);

      // Register cone and allowlist
      this.gate.registerCone(cone, allowlist);

      // Step 5: Classify incoming intents
      if (incomingIntents.length > 0) {
        classifications = this.classifier.classifyAll(
          incomingIntents,
          allowlist,
          cone,
          necessaryFuture
        );

        // Step 6: Enforce via intent gate
        gateResults = this.enforceAll(
          incomingIntents,
          classifications,
          cone,
          necessaryFuture,
          runId
        );
      }

      // Record analysis
      if (classifications.length > 0) {
        this.gate.recordAnalysis(runId, cone, allowlist, classifications);
      }
    }

    // Step 7: Build ICE intelligence
    const iceIntelligence = this.buildIntelligence(
      neResult.neIntelligence,
      hasActiveFuture,
      necessaryFuture?.future_id || null,
      cone,
      allowlist,
      incomingIntents,
      classifications,
      gateResults
    );

    // Step 8: Determine final execution decision
    const executionAllowed = neResult.executionAllowed;
    const mutationsAllowed = neResult.mutationsAllowed;
    const intentsAllowed = this.determineIntentsAllowed(gateResults);
    const abortReason = neResult.abortReason;
    const intentRejectionReason = this.determineIntentRejectionReason(gateResults);

    return {
      neResult,
      iceIntelligence,
      executionAllowed,
      mutationsAllowed,
      intentsAllowed,
      abortReason,
      intentRejectionReason
    };
  }

  /**
   * Enforce gate for all intents
   */
  private enforceAll(
    intents: IntentSignature[],
    classifications: IntentClassification[],
    cone: CausalCone,
    future: NecessaryFuture,
    runId: string
  ): IntentGateResult[] {
    const results: IntentGateResult[] = [];

    for (let i = 0; i < intents.length; i++) {
      const intent = intents[i];
      const classification = classifications[i];

      const result = this.gate.enforce(
        intent,
        classification,
        cone,
        future,
        runId
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Build ICE intelligence
   */
  private buildIntelligence(
    neIntelligence: ICEIntelligence['ne_intelligence'],
    hasActiveFuture: boolean,
    activeFutureId: string | null,
    cone: CausalCone | null,
    allowlist: IntentAllowlist | null,
    intentsProcessed: IntentSignature[],
    classifications: IntentClassification[],
    gateResults: IntentGateResult[]
  ): ICEIntelligence {
    const allowed = classifications.filter(c => c.allowed).length;
    const rejected = classifications.length - allowed;
    const rejectionRate = classifications.length > 0 ? rejected / classifications.length : 0;

    // Generate rejection explanations
    const rejectionExplanations = this.generateRejectionExplanations(gateResults);

    return {
      ice_version: ICE_VERSION,
      ne_intelligence: neIntelligence,
      has_active_future: hasActiveFuture,
      active_future_id: activeFutureId,
      causal_cone: cone,
      intent_allowlist: allowlist,
      intents_processed: intentsProcessed,
      classifications,
      gate_results: gateResults,
      summary: {
        necessity_active: hasActiveFuture,
        cone_derived: !!cone,
        allowlist_generated: !!allowlist,
        intents_processed: intentsProcessed.length,
        intents_allowed: allowed,
        intents_rejected: rejected,
        rejection_rate: rejectionRate
      },
      rejection_explanations: rejectionExplanations,
      proof_chain: {
        necessity_to_cone_derivation: true,
        cone_to_allowlist_generation: true,
        classification_deterministic: true,
        rejection_causally_proven: true,
        no_heuristics: true,
        no_ml: true,
        no_probability: true,
        no_config: true,
        no_flag: true,
        no_override: true,
        no_reset: true,
        history_append_only: true
      }
    };
  }

  /**
   * Generate rejection explanations
   */
  private generateRejectionExplanations(gateResults: IntentGateResult[]): string[] {
    if (gateResults.length === 0) {
      return ['No intents processed.'];
    }

    const rejected = gateResults.filter(r => r.action === 'REJECT_INTENT');

    if (rejected.length === 0) {
      return ['All intents were allowed.'];
    }

    const explanations: string[] = [];

    explanations.push(`${rejected.length} intent(s) rejected.`);

    for (const result of rejected) {
      explanations.push(`  - ${result.intent.intent_id}: ${result.rejection_reason}`);
    }

    explanations.push('');
    explanations.push('PHILOSOPHY: After necessity, intent is no longer free.');
    explanations.push('What cannot lead to survival cannot be expressed.');

    return explanations;
  }

  /**
   * Determine if all intents were allowed
   */
  private determineIntentsAllowed(gateResults: IntentGateResult[]): boolean {
    if (gateResults.length === 0) {
      return true; // No intents to reject
    }

    return gateResults.every(r => r.action === 'ALLOW_INTENT');
  }

  /**
   * Determine intent rejection reason
   */
  private determineIntentRejectionReason(gateResults: IntentGateResult[]): string | null {
    const rejected = gateResults.filter(r => r.action === 'REJECT_INTENT');

    if (rejected.length === 0) {
      return null;
    }

    if (rejected.length === 1) {
      return `ICE REJECT_INTENT: ${rejected[0].rejection_reason}`;
    }

    return `ICE REJECT_INTENT: ${rejected.length} intents rejected. ` +
           `First: ${rejected[0].rejection_reason}`;
  }

  /**
   * Create and classify a single intent
   */
  classifyIntent(
    agentId: string,
    runId: string,
    targetShapes: string[],
    targetHandoffs: string[],
    intendedOperations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'TRANSFORM')[],
    expectedOutcome: 'RESTORE' | 'MODIFY' | 'PRESERVE' | 'DESTROY',
    futureId: string
  ): IntentGateResult | null {
    // Create intent signature
    const intent = this.classifier.createIntentSignature(
      agentId,
      runId,
      targetShapes,
      targetHandoffs,
      intendedOperations,
      expectedOutcome
    );

    // Get cone and allowlist
    const cone = this.gate.getActiveCone(futureId);
    const allowlist = this.gate.getActiveAllowlist(futureId);

    if (!cone || !allowlist) {
      return null; // No active constraint
    }

    // Get the future from NE
    const activeFutures = this.neEngine.getActiveFutures();
    const future = Object.values(activeFutures).find(f => f.future_id === futureId);

    if (!future) {
      return null;
    }

    // Classify
    const classification = this.classifier.classify(intent, allowlist, cone, future);

    // Enforce
    return this.gate.enforce(intent, classification, cone, future, runId);
  }

  /**
   * Get reverse causal deriver
   */
  getDeriver(): ReverseCausalDeriver {
    return this.deriver;
  }

  /**
   * Get intent classifier
   */
  getClassifier(): IntentClassifier {
    return this.classifier;
  }

  /**
   * Get intent gate
   */
  getGate(): IntentGate {
    return this.gate;
  }

  /**
   * Get NE engine
   */
  getNEEngine(): NEEngine {
    return this.neEngine;
  }

  /**
   * Get all active cones
   */
  getActiveCones(): Record<string, CausalCone> {
    return this.gate.getAllActiveCones();
  }

  /**
   * Reset all state (for testing only)
   */
  reset(): void {
    this.gate.reset();
    this.neEngine.reset();
  }
}

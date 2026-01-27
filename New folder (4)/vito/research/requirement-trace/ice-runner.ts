/**
 * ICE Runner (Intent Collapse Engine)
 *
 * Executes the full ICE-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. NE execution (necessity detection)
 * 3. If necessity exists, derive causal cone
 * 4. Generate intent allowlist
 * 5. Classify incoming intents
 * 6. Enforce via intent gate
 * 7. ICE report generation
 *
 * This is the ENTRY POINT for ICE-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - After necessity, intent is no longer free.
 * - What cannot lead to survival cannot be expressed.
 * - No configs, flags, overrides, or resets.
 * - Deterministic only.
 *
 * PHILOSOPHY:
 * Olympus does not block bad ideas.
 * It makes them impossible.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES } from './registry/shapes';
import {
  ICEEngine,
  type ICEExecutionResult,
  type ICEIntelligence,
  type IntentSignature,
  type IntentClassification,
  type IntentGateResult,
  type CausalCone,
  type IntentAllowlist
} from './runtime';
import { IntentClassifier } from './runtime/intent-classifier';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// ICE version - immutable
const ICE_VERSION = '1.0.0';

class ICERunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private iceEngine: ICEEngine;
  private intentClassifier: IntentClassifier;

  constructor(simulationSteps: number = 5) {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.iceEngine = new ICEEngine(DATA_DIR, simulationSteps);
    this.intentClassifier = new IntentClassifier();
  }

  /**
   * Execute full ICE-enhanced enforcement flow
   */
  execute(
    runId: string,
    agentOutputs: Record<TracedAgentId, unknown>,
    incomingIntents: IntentSignature[] = []
  ): ICEExecutionResult {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS INTENT COLLAPSE ENGINE (ICE)');
    console.log('  Mode: INTENT_COLLAPSE | Gate: CAUSAL | Override: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/22] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/22] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute ICE engine (ICE + NE + IE + AEC + RLL + OCIC + ORIS)
    console.log('\n[3/22] EXECUTING ICE ENFORCEMENT...');
    const iceResult = this.iceEngine.execute(traceResults, gateResult, runId, incomingIntents);
    this.printEnforcementDecision(iceResult);

    // Step 4: Display NE summary
    console.log('\n[4/22] NE NECESSITY DETECTION...');
    this.printNESummary(iceResult);

    // Step 5: Display causal cone derivation
    console.log('\n[5/22] CAUSAL CONE DERIVATION...');
    this.printCausalCone(iceResult);

    // Step 6: Display intent allowlist
    console.log('\n[6/22] INTENT ALLOWLIST...');
    this.printIntentAllowlist(iceResult);

    // Step 7: Display incoming intents
    console.log('\n[7/22] INCOMING INTENTS...');
    this.printIncomingIntents(incomingIntents);

    // Step 8: Display intent classifications
    console.log('\n[8/22] INTENT CLASSIFICATIONS...');
    this.printClassifications(iceResult);

    // Step 9: Display intent gate results
    console.log('\n[9/22] INTENT GATE RESULTS...');
    this.printGateResults(iceResult);

    // Step 10: Display rejection explanations
    console.log('\n[10/22] REJECTION EXPLANATIONS...');
    this.printRejectionExplanations(iceResult);

    // Step 11: Display allowed intents
    console.log('\n[11/22] ALLOWED INTENTS...');
    this.printAllowedIntents(iceResult);

    // Step 12: Display rejected intents
    console.log('\n[12/22] REJECTED INTENTS...');
    this.printRejectedIntents(iceResult);

    // Step 13: Display active cones
    console.log('\n[13/22] ACTIVE CONES...');
    this.printActiveCones();

    // Step 14: Display ICE proof chain
    console.log('\n[14/22] ICE PROOF CHAIN...');
    this.printICEProof(iceResult.iceIntelligence);

    // Step 15: Display ICE summary
    console.log('\n[15/22] ICE SUMMARY...');
    this.printICESummary(iceResult.iceIntelligence);

    // Step 16: Display IE summary (if available)
    if (iceResult.neResult.ieResult.aecResult) {
      console.log('\n[16/22] AEC SUMMARY...');
      this.printAECSummary(iceResult);
    } else {
      console.log('\n[16/22] SKIPPED - Upstream HARD_ABORT prevented AEC execution');
    }

    // Step 17: Display causal proof chain
    console.log('\n[17/22] CAUSAL PROOF CHAIN...');
    this.printCausalProofChain(iceResult);

    // Step 18: Generate report
    console.log('\n[18/22] GENERATING ICE REPORT...');
    this.writeReports(iceResult, runId);

    // Step 19: Display statistics
    console.log('\n[19/22] STATISTICS...');
    this.printStatistics(iceResult);

    // Step 20: Philosophy
    console.log('\n[20/22] PHILOSOPHY...');
    this.printPhilosophy(iceResult);

    // Step 21: Final summary
    console.log('\n[21/22] FINAL DECISION...');
    this.printFinalSummary(iceResult);

    // Step 22: Next steps
    console.log('\n[22/22] CONCLUSION...');
    this.printConclusion(iceResult);

    return iceResult;
  }

  private printTraceResults(results: Record<string, ShapeTraceResult>): void {
    for (const [shapeId, result] of Object.entries(results)) {
      const shape = ALL_SHAPES.find(s => s.id === shapeId);
      const kind = shape?.kind || 'UNKNOWN';
      const criticality = shape?.criticality || 'UNKNOWN';
      const survived = result.survival_status.survived_to_target ? '✓ SURVIVED' : '✗ LOST';
      const kindBadge = kind === 'INVARIANT' ? '🔒' : '📦';
      console.log(`  ${kindBadge} [${kind}/${criticality}] ${shapeId}: ${survived}`);
    }
  }

  private printGateResult(result: GateResult): void {
    const verdictSymbol = result.verdict === 'PASS' ? '✓' : result.verdict === 'WARN' ? '⚠' : '✗';
    console.log(`  Gate Verdict: ${verdictSymbol} ${result.verdict}`);
    console.log(`  Fatal Violations: ${result.fatal_violations.length}`);
    console.log(`  Block Downstream: ${result.block_downstream}`);
  }

  private printEnforcementDecision(iceResult: ICEExecutionResult): void {
    const ice = iceResult.iceIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  ICE ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Necessity Active:     ${this.padRight(String(ice.summary.necessity_active), 35)} │`);
    console.log(`  │  Cone Derived:         ${this.padRight(String(ice.summary.cone_derived), 35)} │`);
    console.log(`  │  Allowlist Generated:  ${this.padRight(String(ice.summary.allowlist_generated), 35)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Intents Processed:    ${this.padRight(String(ice.summary.intents_processed), 35)} │`);
    console.log(`  │  Intents Allowed:      ${this.padRight(String(ice.summary.intents_allowed), 35)} │`);
    console.log(`  │  Intents Rejected:     ${this.padRight(String(ice.summary.intents_rejected), 35)} │`);
    console.log(`  │  Rejection Rate:       ${this.padRight((ice.summary.rejection_rate * 100).toFixed(1) + '%', 35)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Execution Allowed:    ${this.padRight(String(iceResult.executionAllowed), 35)} │`);
    console.log(`  │  Mutations Allowed:    ${this.padRight(String(iceResult.mutationsAllowed), 35)} │`);
    console.log(`  │  Intents Allowed:      ${this.padRight(String(iceResult.intentsAllowed), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printNESummary(iceResult: ICEExecutionResult): void {
    const ne = iceResult.neResult.neIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  NE NECESSITY DETECTION                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Doom Detected:        ${this.padRight(String(ne.summary.doom_detected), 36)} │`);
    console.log(`  │  Necessity Declared:   ${this.padRight(String(ne.summary.necessity_declared), 36)} │`);
    console.log(`  │  Gate Action:          ${this.padRight(ne.summary.action_taken, 36)} │`);
    console.log(`  │  Extinction Imminent:  ${this.padRight(String(ne.summary.extinction_imminent), 36)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (ne.necessary_future) {
      console.log('\n  ✅ NECESSITY ACTIVE - Intent space will be collapsed');
      console.log(`  Future ID: ${ne.necessary_future.future_id}`);
    } else if (ne.summary.extinction_imminent) {
      console.log('\n  💀 EXTINCTION IMMINENT - All intents blocked');
    } else {
      console.log('\n  🔓 NO NECESSITY - All intents permitted (no collapse)');
    }
  }

  private printCausalCone(iceResult: ICEExecutionResult): void {
    const cone = iceResult.iceIntelligence.causal_cone;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   CAUSAL CONE DERIVATION                      │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    if (cone) {
      console.log(`  │  Cone ID:              ${this.padRight(cone.cone_id, 35)} │`);
      console.log(`  │  Source Future:        ${this.padRight(cone.source_future_id.substring(0, 32), 35)} │`);
      console.log(`  │  Allowed Signatures:   ${this.padRight(String(cone.allowed_signatures.length), 35)} │`);
      console.log(`  │  Allowed Fingerprints: ${this.padRight(String(cone.allowed_intent_fingerprints.length), 35)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');

      console.log('\n  DERIVATION DETAILS:');
      console.log(`    MCCS ID: ${cone.derivation.mccs_id}`);
      console.log(`    Required Interventions: ${cone.derivation.required_interventions.length}`);
      console.log(`    Preserved Shapes: ${cone.derivation.preserved_shapes.join(', ') || 'none'}`);
      console.log(`    Preserved Handoffs: ${cone.derivation.preserved_handoffs.join(', ') || 'none'}`);

      console.log('\n  EXCLUSIONS (outside the cone):');
      console.log(`    Forbidden Operations: ${cone.exclusions.forbidden_operations.join(', ') || 'none'}`);
      console.log(`    Forbidden Shape Mods: ${cone.exclusions.forbidden_shape_modifications.length}`);
      console.log(`    Forbidden Handoff Breaks: ${cone.exclusions.forbidden_handoff_breaks.length}`);
    } else {
      console.log(`  │  Status:               ${this.padRight('NO CONE DERIVED', 35)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');
      console.log('\n  No necessity active. Causal cone not derived.');
    }
  }

  private printIntentAllowlist(iceResult: ICEExecutionResult): void {
    const allowlist = iceResult.iceIntelligence.intent_allowlist;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    INTENT ALLOWLIST                           │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    if (allowlist) {
      const fingerprints = Array.isArray(allowlist.allowed_fingerprints)
        ? allowlist.allowed_fingerprints
        : Array.from(allowlist.allowed_fingerprints);

      console.log(`  │  Allowlist ID:         ${this.padRight(allowlist.allowlist_id, 35)} │`);
      console.log(`  │  Source Cone:          ${this.padRight(allowlist.source_cone_id.substring(0, 32), 35)} │`);
      console.log(`  │  Allowed Fingerprints: ${this.padRight(String(fingerprints.length), 35)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');

      console.log('\n  ALLOWED PATTERNS:');
      console.log(`    Targetable Shapes: ${allowlist.allowed_patterns.targetable_shapes.join(', ') || 'none'}`);
      console.log(`    Targetable Handoffs: ${allowlist.allowed_patterns.targetable_handoffs.join(', ') || 'none'}`);
      console.log(`    Allowed Operations: ${allowlist.allowed_patterns.allowed_operations.join(', ')}`);
      console.log(`    Allowed Outcomes: ${allowlist.allowed_patterns.allowed_outcomes.join(', ')}`);
    } else {
      console.log(`  │  Status:               ${this.padRight('NO ALLOWLIST GENERATED', 35)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');
      console.log('\n  No necessity active. All intents permitted.');
    }
  }

  private printIncomingIntents(intents: IntentSignature[]): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    INCOMING INTENTS                           │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Intents:        ${this.padRight(String(intents.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (intents.length > 0) {
      console.log('\n  INTENT DETAILS:');
      for (const intent of intents.slice(0, 5)) {
        console.log(`\n  📝 ${intent.intent_id}`);
        console.log(`     Fingerprint: ${intent.fingerprint}`);
        console.log(`     Shapes: ${intent.components.target_shapes.join(', ') || 'none'}`);
        console.log(`     Operations: ${intent.components.intended_operations.join(', ')}`);
        console.log(`     Outcome: ${intent.components.expected_outcome}`);
      }
      if (intents.length > 5) {
        console.log(`\n  ... and ${intents.length - 5} more intents`);
      }
    } else {
      console.log('\n  No intents to process.');
    }
  }

  private printClassifications(iceResult: ICEExecutionResult): void {
    const classifications = iceResult.iceIntelligence.classifications;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  INTENT CLASSIFICATIONS                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Classified:     ${this.padRight(String(classifications.length), 35)} │`);

    const aligned = classifications.filter(c => c.classification === 'ALIGNED').length;
    const nonCausal = classifications.filter(c => c.classification === 'NON_CAUSAL').length;
    const contradictory = classifications.filter(c => c.classification === 'CONTRADICTORY').length;
    const redundant = classifications.filter(c => c.classification === 'REDUNDANT').length;

    console.log(`  │  ALIGNED:              ${this.padRight(String(aligned), 35)} │`);
    console.log(`  │  NON_CAUSAL:           ${this.padRight(String(nonCausal), 35)} │`);
    console.log(`  │  CONTRADICTORY:        ${this.padRight(String(contradictory), 35)} │`);
    console.log(`  │  REDUNDANT:            ${this.padRight(String(redundant), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (classifications.length > 0) {
      console.log('\n  CLASSIFICATION DETAILS:');
      for (const c of classifications.slice(0, 3)) {
        const emoji = c.allowed ? '✅' : '❌';
        console.log(`\n  ${emoji} ${c.intent.intent_id}`);
        console.log(`     Classification: ${c.classification}`);
        console.log(`     Allowed: ${c.allowed ? 'YES' : 'NO'}`);
        if (!c.allowed && c.causal_analysis.violated_requirement) {
          console.log(`     Violated: ${c.causal_analysis.violated_requirement}`);
        }
      }
    }
  }

  private printGateResults(iceResult: ICEExecutionResult): void {
    const results = iceResult.iceIntelligence.gate_results;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   INTENT GATE RESULTS                         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Processed:      ${this.padRight(String(results.length), 35)} │`);

    const allowed = results.filter(r => r.action === 'ALLOW_INTENT').length;
    const rejected = results.filter(r => r.action === 'REJECT_INTENT').length;

    console.log(`  │  ALLOW_INTENT:         ${this.padRight(String(allowed), 35)} │`);
    console.log(`  │  REJECT_INTENT:        ${this.padRight(String(rejected), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printRejectionExplanations(iceResult: ICEExecutionResult): void {
    const explanations = iceResult.iceIntelligence.rejection_explanations;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                REJECTION EXPLANATIONS                         │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const line of explanations) {
      console.log(`  ${line}`);
    }
  }

  private printAllowedIntents(iceResult: ICEExecutionResult): void {
    const allowed = iceResult.iceIntelligence.gate_results.filter(
      r => r.action === 'ALLOW_INTENT'
    );

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    ALLOWED INTENTS                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Allowed:        ${this.padRight(String(allowed.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (allowed.length > 0) {
      console.log('\n  ALLOWED INTENT DETAILS:');
      for (const result of allowed.slice(0, 3)) {
        console.log(`\n  ✅ ${result.intent.intent_id}`);
        console.log(`     Classification: ${result.classification.classification}`);
        console.log(`     Fingerprint: ${result.intent.fingerprint}`);
      }
    } else {
      console.log('\n  No intents were allowed.');
    }
  }

  private printRejectedIntents(iceResult: ICEExecutionResult): void {
    const rejected = iceResult.iceIntelligence.gate_results.filter(
      r => r.action === 'REJECT_INTENT'
    );

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   REJECTED INTENTS                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Rejected:       ${this.padRight(String(rejected.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (rejected.length > 0) {
      console.log('\n  REJECTED INTENT DETAILS:');
      for (const result of rejected.slice(0, 5)) {
        console.log(`\n  ❌ ${result.intent.intent_id}`);
        console.log(`     Classification: ${result.classification.classification}`);
        console.log(`     Reason: ${result.rejection_reason}`);
        if (result.causal_proof) {
          console.log(`     Proof: ${result.causal_proof.proof_chain[0]}`);
        }
      }
      if (rejected.length > 5) {
        console.log(`\n  ... and ${rejected.length - 5} more rejected`);
      }
    } else {
      console.log('\n  No intents were rejected.');
    }
  }

  private printActiveCones(): void {
    const cones = this.iceEngine.getActiveCones();
    const coneList = Object.entries(cones);

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                     ACTIVE CONES                              │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Active:         ${this.padRight(String(coneList.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (coneList.length > 0) {
      console.log('\n  ACTIVE CAUSAL CONES:');
      for (const [futureId, cone] of coneList.slice(0, 3)) {
        console.log(`\n  🔒 Future: ${futureId.substring(0, 32)}...`);
        console.log(`     Cone: ${cone.cone_id}`);
        console.log(`     Signatures: ${cone.allowed_signatures.length}`);
        console.log(`     Fingerprints: ${cone.allowed_intent_fingerprints.length}`);
      }
    } else {
      console.log('\n  No active cones. First run or no necessity detected.');
    }
  }

  private printICEProof(ice: ICEIntelligence): void {
    const proof = ice.proof_chain;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    ICE PROOF CHAIN                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Necessity→Cone Derivation:     ${this.padRight(proof.necessity_to_cone_derivation ? '✓' : '✗', 24)} │`);
    console.log(`  │  Cone→Allowlist Generation:     ${this.padRight(proof.cone_to_allowlist_generation ? '✓' : '✗', 24)} │`);
    console.log(`  │  Classification Deterministic:  ${this.padRight(proof.classification_deterministic ? '✓' : '✗', 24)} │`);
    console.log(`  │  Rejection Causally Proven:     ${this.padRight(proof.rejection_causally_proven ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Heuristics:                 ${this.padRight(proof.no_heuristics ? '✓' : '✗', 24)} │`);
    console.log(`  │  No ML:                         ${this.padRight(proof.no_ml ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Probability:                ${this.padRight(proof.no_probability ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Config:                     ${this.padRight(proof.no_config ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Flag:                       ${this.padRight(proof.no_flag ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Override:                   ${this.padRight(proof.no_override ? '✓' : '✗', 24)} │`);
    console.log(`  │  No Reset:                      ${this.padRight(proof.no_reset ? '✓' : '✗', 24)} │`);
    console.log(`  │  History Append-Only:           ${this.padRight(proof.history_append_only ? '✓' : '✗', 24)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printICESummary(ice: ICEIntelligence): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                     ICE SUMMARY                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  ICE Version:          ${this.padRight(ice.ice_version, 35)} │`);
    console.log(`  │  Necessity Active:     ${this.padRight(String(ice.summary.necessity_active), 35)} │`);
    console.log(`  │  Cone Derived:         ${this.padRight(String(ice.summary.cone_derived), 35)} │`);
    console.log(`  │  Allowlist Generated:  ${this.padRight(String(ice.summary.allowlist_generated), 35)} │`);
    console.log(`  │  Intents Processed:    ${this.padRight(String(ice.summary.intents_processed), 35)} │`);
    console.log(`  │  Intents Allowed:      ${this.padRight(String(ice.summary.intents_allowed), 35)} │`);
    console.log(`  │  Intents Rejected:     ${this.padRight(String(ice.summary.intents_rejected), 35)} │`);
    console.log(`  │  Rejection Rate:       ${this.padRight((ice.summary.rejection_rate * 100).toFixed(1) + '%', 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printAECSummary(iceResult: ICEExecutionResult): void {
    const aec = iceResult.neResult.ieResult.aecResult!.aecIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                     AEC SUMMARY                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Entropy:              ${this.padRight((aec.entropy_score.entropy * 100).toFixed(1) + '%', 35)} │`);
    console.log(`  │  Phase:                ${this.padRight(aec.phase, 35)} │`);
    console.log(`  │  Gate Action:          ${this.padRight(aec.gate_result.action, 35)} │`);
    console.log(`  │  System Healthy:       ${this.padRight(String(aec.summary.system_healthy), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printCausalProofChain(iceResult: ICEExecutionResult): void {
    const rejected = iceResult.iceIntelligence.gate_results.filter(
      r => r.action === 'REJECT_INTENT' && r.causal_proof
    );

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  CAUSAL PROOF CHAINS                          │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (rejected.length > 0) {
      for (const result of rejected.slice(0, 2)) {
        console.log(`\n  Intent: ${result.intent.intent_id}`);
        console.log('  Proof Chain:');
        for (const step of result.causal_proof!.proof_chain) {
          console.log(`    ${step}`);
        }
      }
    } else {
      console.log('\n  No causal proof chains to display (no rejections).');
    }
  }

  private writeReports(iceResult: ICEExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'ice-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      run_id: runId,
      ice: iceResult.iceIntelligence,
      ne: iceResult.neResult.neIntelligence,
      ie: iceResult.neResult.ieResult.ieIntelligence,
      aec: iceResult.neResult.ieResult.aecResult?.aecIntelligence || null,
      execution_allowed: iceResult.executionAllowed,
      mutations_allowed: iceResult.mutationsAllowed,
      intents_allowed: iceResult.intentsAllowed,
      abort_reason: iceResult.abortReason,
      intent_rejection_reason: iceResult.intentRejectionReason
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'ice-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(iceResult, runId));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(iceResult: ICEExecutionResult, runId: string): string {
    const lines: string[] = [];
    const ice = iceResult.iceIntelligence;

    lines.push('# ICE Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Intent Collapse Engine');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Necessity Active:** ${ice.summary.necessity_active ? '🔒 YES' : 'NO'}`);
    lines.push('');
    lines.push(`**Cone Derived:** ${ice.summary.cone_derived ? '✓ YES' : 'NO'}`);
    lines.push('');
    lines.push(`**Intents Processed:** ${ice.summary.intents_processed}`);
    lines.push('');
    lines.push(`**Intents Allowed:** ${ice.summary.intents_allowed}`);
    lines.push('');
    lines.push(`**Intents Rejected:** ${ice.summary.intents_rejected}`);
    lines.push('');
    lines.push(`**Rejection Rate:** ${(ice.summary.rejection_rate * 100).toFixed(1)}%`);
    lines.push('');

    if (ice.causal_cone) {
      lines.push('## Causal Cone');
      lines.push('');
      lines.push(`**Cone ID:** \`${ice.causal_cone.cone_id}\``);
      lines.push('');
      lines.push(`**Source Future:** \`${ice.causal_cone.source_future_id}\``);
      lines.push('');
      lines.push('### Derivation');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| MCCS ID | ${ice.causal_cone.derivation.mccs_id} |`);
      lines.push(`| Required Interventions | ${ice.causal_cone.derivation.required_interventions.length} |`);
      lines.push(`| Preserved Shapes | ${ice.causal_cone.derivation.preserved_shapes.length} |`);
      lines.push('');
    }

    if (ice.intent_allowlist) {
      lines.push('## Intent Allowlist');
      lines.push('');
      const fingerprints = Array.isArray(ice.intent_allowlist.allowed_fingerprints)
        ? ice.intent_allowlist.allowed_fingerprints
        : Array.from(ice.intent_allowlist.allowed_fingerprints);
      lines.push('| Pattern | Values |');
      lines.push('|---------|--------|');
      lines.push(`| Allowed Fingerprints | ${fingerprints.length} |`);
      lines.push(`| Targetable Shapes | ${ice.intent_allowlist.allowed_patterns.targetable_shapes.length} |`);
      lines.push(`| Allowed Operations | ${ice.intent_allowlist.allowed_patterns.allowed_operations.join(', ')} |`);
      lines.push('');
    }

    lines.push('## Intent Classifications');
    lines.push('');
    lines.push('| Classification | Count |');
    lines.push('|----------------|-------|');
    const aligned = ice.classifications.filter(c => c.classification === 'ALIGNED').length;
    const nonCausal = ice.classifications.filter(c => c.classification === 'NON_CAUSAL').length;
    const contradictory = ice.classifications.filter(c => c.classification === 'CONTRADICTORY').length;
    const redundant = ice.classifications.filter(c => c.classification === 'REDUNDANT').length;
    lines.push(`| ALIGNED | ${aligned} |`);
    lines.push(`| NON_CAUSAL | ${nonCausal} |`);
    lines.push(`| CONTRADICTORY | ${contradictory} |`);
    lines.push(`| REDUNDANT | ${redundant} |`);
    lines.push('');

    lines.push('## Rejection Explanations');
    lines.push('');
    for (const exp of ice.rejection_explanations) {
      lines.push(`- ${exp}`);
    }
    lines.push('');

    lines.push('## ICE Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Necessity→Cone Derivation | ${ice.proof_chain.necessity_to_cone_derivation ? '✓' : '✗'} |`);
    lines.push(`| Cone→Allowlist Generation | ${ice.proof_chain.cone_to_allowlist_generation ? '✓' : '✗'} |`);
    lines.push(`| Classification Deterministic | ${ice.proof_chain.classification_deterministic ? '✓' : '✗'} |`);
    lines.push(`| Rejection Causally Proven | ${ice.proof_chain.rejection_causally_proven ? '✓' : '✗'} |`);
    lines.push(`| No Heuristics | ${ice.proof_chain.no_heuristics ? '✓' : '✗'} |`);
    lines.push(`| No ML | ${ice.proof_chain.no_ml ? '✓' : '✗'} |`);
    lines.push(`| No Config | ${ice.proof_chain.no_config ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Philosophy');
    lines.push('');
    lines.push('> *"After necessity, intent is no longer free."*');
    lines.push('>');
    lines.push('> *"What cannot lead to survival cannot be expressed."*');
    lines.push('>');
    lines.push('> *"Olympus does not block bad ideas. It makes them impossible."*');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Intent Collapse Engine (ICE) v1.0.0*');

    return lines.join('\n');
  }

  private printStatistics(iceResult: ICEExecutionResult): void {
    const stats = this.iceEngine.getGate().getStats();

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                      STATISTICS                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Cones Derived:     ${this.padRight(String(stats.total_cones_derived), 32)} │`);
    console.log(`  │  Total Intents Processed: ${this.padRight(String(stats.total_intents_processed), 32)} │`);
    console.log(`  │  Total Intents Allowed:   ${this.padRight(String(stats.total_intents_allowed), 32)} │`);
    console.log(`  │  Total Intents Rejected:  ${this.padRight(String(stats.total_intents_rejected), 32)} │`);
    console.log(`  │  Overall Rejection Rate:  ${this.padRight((stats.rejection_rate * 100).toFixed(1) + '%', 32)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printPhilosophy(iceResult: ICEExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                      PHILOSOPHY                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │                                                               │');
    console.log('  │  "After necessity, intent is no longer free."                 │');
    console.log('  │  "What cannot lead to survival cannot be expressed."          │');
    console.log('  │                                                               │');
    console.log('  │  "Olympus does not block bad ideas."                          │');
    console.log('  │  "It makes them impossible."                                  │');
    console.log('  │                                                               │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    const ice = iceResult.iceIntelligence;

    if (ice.summary.necessity_active && ice.summary.cone_derived) {
      console.log('\n  THE INTENT SPACE HAS BEEN COLLAPSED.');
      console.log('  Only intents on the causal cone are expressible.');
      console.log('  All other intents are syntactically invalid.');
    } else if (!ice.summary.necessity_active) {
      console.log('\n  NO NECESSITY ACTIVE.');
      console.log('  Intent space remains uncollapsed.');
      console.log('  All intents are currently expressible.');
    }
  }

  private printFinalSummary(iceResult: ICEExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  ICE FINAL DECISION');
    console.log('═'.repeat(80));

    const ice = iceResult.iceIntelligence;

    let emoji: string;
    let status: string;

    if (iceResult.neResult.neIntelligence.summary.extinction_imminent) {
      emoji = '💀🛑';
      status = 'EXTINCTION - All intents blocked';
    } else if (ice.summary.intents_rejected > 0 && ice.summary.intents_allowed === 0) {
      emoji = '🛑❌';
      status = 'ALL INTENTS REJECTED - None on causal cone';
    } else if (ice.summary.intents_rejected > 0) {
      emoji = '⚠️❌';
      status = 'PARTIAL REJECTION - Some intents outside causal cone';
    } else if (ice.summary.necessity_active && ice.summary.cone_derived) {
      emoji = '✅🔒';
      status = 'INTENT SPACE COLLAPSED - All submitted intents allowed';
    } else {
      emoji = '✅🔓';
      status = 'NO COLLAPSE - All intents permitted';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    if (iceResult.abortReason) {
      console.log('  ABORT REASON:');
      console.log(`    ${iceResult.abortReason}`);
      console.log('');
    }

    if (iceResult.intentRejectionReason) {
      console.log('  INTENT REJECTION:');
      console.log(`    ${iceResult.intentRejectionReason}`);
      console.log('');
    }

    console.log('  ICE METRICS:');
    console.log(`    Necessity Active:    ${ice.summary.necessity_active ? '🔒 YES' : 'NO'}`);
    console.log(`    Cone Derived:        ${ice.summary.cone_derived ? '✓ YES' : 'NO'}`);
    console.log(`    Intents Processed:   ${ice.summary.intents_processed}`);
    console.log(`    Intents Allowed:     ${ice.summary.intents_allowed}`);
    console.log(`    Intents Rejected:    ${ice.summary.intents_rejected}`);
    console.log(`    Rejection Rate:      ${(ice.summary.rejection_rate * 100).toFixed(1)}%`);
    console.log(`    Execution Allowed:   ${iceResult.executionAllowed ? '✓' : '✗'}`);
    console.log(`    Mutations Allowed:   ${iceResult.mutationsAllowed ? '✓' : '✗'}`);
    console.log(`    Intents Allowed:     ${iceResult.intentsAllowed ? '✓' : '✗'}`);
    console.log('');

    console.log('  ICE PROOF CHAIN:');
    console.log(`    Necessity→Cone Derivation:    ${ice.proof_chain.necessity_to_cone_derivation ? '✓' : '✗'}`);
    console.log(`    Cone→Allowlist Generation:    ${ice.proof_chain.cone_to_allowlist_generation ? '✓' : '✗'}`);
    console.log(`    Classification Deterministic: ${ice.proof_chain.classification_deterministic ? '✓' : '✗'}`);
    console.log(`    Rejection Causally Proven:    ${ice.proof_chain.rejection_causally_proven ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override:      ${ice.proof_chain.no_config ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  AFTER NECESSITY, INTENT IS NO LONGER FREE.');
    console.log('═'.repeat(80));
    console.log('  OLYMPUS DOES NOT BLOCK BAD IDEAS. IT MAKES THEM IMPOSSIBLE.');
    console.log('═'.repeat(80) + '\n');
  }

  private printConclusion(iceResult: ICEExecutionResult): void {
    console.log('  The Intent Collapse Engine has executed.');
    console.log('');

    if (iceResult.iceIntelligence.summary.necessity_active) {
      console.log('  🔒 A NecessaryFuture exists.');
      console.log('  🔒 The causal cone has been derived.');
      console.log('  🔒 The intent allowlist has been generated.');
      console.log('  🔒 Only intents on the causal cone can be expressed.');
      console.log('');
      console.log('  Any intent that cannot causally lead to the NecessaryFuture');
      console.log('  is now syntactically invalid. It cannot be expressed.');
    } else {
      console.log('  🔓 No NecessaryFuture exists.');
      console.log('  🔓 The intent space remains uncollapsed.');
      console.log('  🔓 All intents are currently expressible.');
    }
  }

  private padRight(str: string, length: number): string {
    return str.padEnd(length);
  }
}

/**
 * Create synthetic test data
 */
function createTestData(): Record<TracedAgentId, unknown> {
  return {
    strategos: {
      mvp_features: [
        {
          name: 'Task Management',
          entity: 'tasks',
          description: 'Users can manage their tasks',
          acceptance_criteria: [
            'User can create tasks',
            'User can filter tasks by status',
            'User can paginate through tasks',
            'User can view task details'
          ]
        }
      ]
    },

    scope: {
      in_scope: [
        {
          feature: 'Task Management',
          entity: 'tasks',
          description: 'Core task functionality',
          acceptance_criteria: ['Create tasks', 'Filter by status', 'Pagination', 'View details'],
          fields: ['id', 'title', 'status', 'createdAt'],
          layout: 'grid'
        }
      ]
    },

    cartographer: {
      pages: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          sections: [
            {
              name: 'Task List',
              components: [
                { type: 'heading', text: 'My Tasks', layout: 'flex' },
                { type: 'filter-bar', entity: 'tasks', filterAttribute: 'status', values: ['pending', 'in_progress', 'done'] },
                { type: 'pagination', entity: 'tasks', pageSize: 10 },
                { type: 'data-display', entity: 'tasks', fields: ['title', 'status'], layout: 'grid' }
              ]
            }
          ]
        }
      ]
    },

    blocks: {
      components: [
        { name: 'Heading', type: 'heading', entity: 'tasks', fields: ['title'], layout: 'flex', className: 'text-xl' },
        { name: 'StatusFilter', type: 'filter', entity: 'tasks', filterAttribute: 'status', variants: ['pending', 'in_progress', 'done'], props: { value: 'string', onChange: 'function' } },
        { name: 'Pagination', type: 'pagination', entity: 'tasks', pageSize: 10, props: { page: 'number', onPageChange: 'function', total: 'number' } },
        { name: 'TaskCard', type: 'display', entity: 'tasks', displayFields: ['title', 'status'], layout: 'card' }
      ],
      design_tokens: { colors: { primary: '#3B82F6' } }
    },

    wire: {
      files: [
        { path: 'src/app/dashboard/page.tsx', content: `'use client';\nimport { TaskCard } from '@/components/TaskCard';\nexport default function DashboardPage() { return <div>Dashboard</div>; }`, type: 'code' },
        { path: 'src/components/TaskCard.tsx', content: 'export function TaskCard({ task }) { return <div>{task.title}</div>; }', entity: 'tasks', displayFields: ['title', 'status'], type: 'component' }
      ]
    },

    pixel: {
      files: [
        { path: 'src/app/dashboard/page.tsx', content: '// Styled', type: 'code' },
        { path: 'src/components/TaskCard.tsx', content: '// Styled', entity: 'tasks', displayFields: ['title', 'status'], type: 'styled-component' }
      ],
      components: [{ name: 'TaskCard', entity: 'tasks', displayFields: ['title', 'status'] }]
    }
  };
}

/**
 * Create test intents
 */
function createTestIntents(classifier: IntentClassifier, runId: string): IntentSignature[] {
  const intents: IntentSignature[] = [];

  // Intent 1: ALIGNED - Read tasks (should be allowed)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['FILTER_CAPABILITY'],
    [],
    ['READ'],
    'PRESERVE'
  ));

  // Intent 2: NON_CAUSAL - Modify unrelated shape
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['UNKNOWN_SHAPE'],
    [],
    ['UPDATE'],
    'MODIFY'
  ));

  // Intent 3: CONTRADICTORY - Delete operation
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['FILTER_CAPABILITY'],
    [],
    ['DELETE'],
    'DESTROY'
  ));

  // Intent 4: ALIGNED - Restore capability
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['PAGINATION_CAPABILITY'],
    [],
    ['UPDATE', 'TRANSFORM'],
    'RESTORE'
  ));

  return intents;
}

// Main execution
const runId = `ICE-${Date.now()}`;
const runner = new ICERunner(5);
const agentOutputs = createTestData();
const classifier = new IntentClassifier();
const testIntents = createTestIntents(classifier, runId);

console.log('\n📝 Test Intents Created:');
for (const intent of testIntents) {
  console.log(`  - ${intent.intent_id}: ${intent.components.intended_operations.join(', ')} → ${intent.components.expected_outcome}`);
}

runner.execute(runId, agentOutputs, testIntents);

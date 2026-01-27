/**
 * NE Runner (Necessity Engine)
 *
 * Executes the full NE-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. IE execution (doom detection)
 * 3. If doomed: MCCS enumeration
 * 4. Survivability evaluation
 * 5. Necessity selection
 * 6. Necessity declaration
 * 7. Necessity gate enforcement
 * 8. NE report generation
 *
 * This is the ENTRY POINT for NE-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - Inevitability forbids death. Necessity forbids choice.
 * - Olympus does not guide humans. It constrains reality.
 * - No configs, flags, overrides, or resets.
 * - Deterministic only.
 *
 * PHILOSOPHY:
 * When collapse is inevitable, only ONE path survives.
 * All alternatives are forbidden.
 * This is not optimization. This is survival.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES } from './registry/shapes';
import {
  NEEngine,
  type NEExecutionResult,
  type NEIntelligence,
  type MCCSCandidate,
  type SurvivabilityResult,
  type NecessaryFuture,
  type NecessityGateResult
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// NE version - immutable
const NE_VERSION = '1.0.0';

class NERunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private neEngine: NEEngine;

  constructor(simulationSteps: number = 5) {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.neEngine = new NEEngine(DATA_DIR, simulationSteps);
  }

  /**
   * Execute full NE-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): NEExecutionResult {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS NECESSITY ENGINE (NE)');
    console.log('  Mode: NECESSITY_ENFORCEMENT | Gate: SINGULAR | Override: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/20] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/20] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute NE engine (NE + IE + AEC + RLL + OCIC + ORIS)
    console.log('\n[3/20] EXECUTING NE ENFORCEMENT...');
    const neResult = this.neEngine.execute(traceResults, gateResult, runId);
    this.printEnforcementDecision(neResult);

    // Step 4: Display IE summary
    console.log('\n[4/20] IE DOOM DETECTION...');
    this.printIESummary(neResult);

    // Step 5: Display action signature
    console.log('\n[5/20] ACTION SIGNATURE...');
    this.printActionSignature(neResult);

    // Step 6: Display MCCS enumeration
    console.log('\n[6/20] MCCS ENUMERATION...');
    this.printMCCSEnumeration(neResult);

    // Step 7: Display survivability evaluation
    console.log('\n[7/20] SURVIVABILITY EVALUATION...');
    this.printSurvivabilityEvaluation(neResult);

    // Step 8: Display necessity selection
    console.log('\n[8/20] NECESSITY SELECTION...');
    this.printNecessitySelection(neResult);

    // Step 9: Display necessary future
    console.log('\n[9/20] NECESSARY FUTURE...');
    this.printNecessaryFuture(neResult);

    // Step 10: Display forbidden alternatives
    console.log('\n[10/20] FORBIDDEN ALTERNATIVES...');
    this.printForbiddenAlternatives(neResult);

    // Step 11: Display necessity gate
    console.log('\n[11/20] NECESSITY GATE...');
    this.printNecessityGate(neResult);

    // Step 12: Display necessity explanation
    console.log('\n[12/20] NECESSITY EXPLANATION...');
    this.printNecessityExplanation(neResult);

    // Step 13: Display forbidden explanation
    console.log('\n[13/20] FORBIDDEN EXPLANATION...');
    this.printForbiddenExplanation(neResult);

    // Step 14: Display active futures
    console.log('\n[14/20] ACTIVE FUTURES...');
    this.printActiveFutures();

    // Step 15: Display AEC summary (if IE allowed)
    if (neResult.ieResult.aecResult) {
      console.log('\n[15/20] AEC SUMMARY...');
      this.printAECSummary(neResult);
    } else {
      console.log('\n[15/20] SKIPPED - IE/NE HARD_ABORT prevented AEC execution');
    }

    // Step 16: Display NE proof chain
    console.log('\n[16/20] NE PROOF CHAIN...');
    this.printNEProof(neResult.neIntelligence);

    // Step 17: Display NE summary
    console.log('\n[17/20] NE SUMMARY...');
    this.printNESummary(neResult.neIntelligence);

    // Step 18: Generate report
    console.log('\n[18/20] GENERATING NE REPORT...');
    this.writeReports(neResult, runId);

    // Step 19: Philosophy
    console.log('\n[19/20] PHILOSOPHY...');
    this.printPhilosophy(neResult);

    // Step 20: Final summary
    console.log('\n[20/20] FINAL DECISION...');
    this.printFinalSummary(neResult);

    return neResult;
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

  private printEnforcementDecision(neResult: NEExecutionResult): void {
    const ne = neResult.neIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   NE ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Doom Detected:       ${this.padRight(String(ne.summary.doom_detected), 37)} │`);
    console.log(`  │  Candidates Found:    ${this.padRight(String(ne.summary.candidates_found), 37)} │`);
    console.log(`  │  Survivable:          ${this.padRight(String(ne.summary.survivable_candidates), 37)} │`);
    console.log(`  │  Necessity Declared:  ${this.padRight(String(ne.summary.necessity_declared), 37)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Action:              ${this.padRight(ne.summary.action_taken, 37)} │`);
    console.log(`  │  Matches Necessity:   ${this.padRight(String(ne.summary.action_matches_necessity), 37)} │`);
    console.log(`  │  Extinction Imminent: ${this.padRight(String(ne.summary.extinction_imminent), 37)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Execution Allowed:   ${this.padRight(String(neResult.executionAllowed), 37)} │`);
    console.log(`  │  Mutations Allowed:   ${this.padRight(String(neResult.mutationsAllowed), 37)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printIESummary(neResult: NEExecutionResult): void {
    const ie = neResult.ieResult.ieIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   IE DOOM DETECTION                           │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Inevitable:          ${this.padRight(String(ie.proof.inevitable), 37)} │`);
    console.log(`  │  Proof Type:          ${this.padRight(ie.proof.proof_type, 37)} │`);
    console.log(`  │  Paths Analyzed:      ${this.padRight(String(ie.proof.paths_analyzed), 37)} │`);
    console.log(`  │  Paths to Collapse:   ${this.padRight(String(ie.proof.paths_to_collapse), 37)} │`);
    console.log(`  │  Gate Action:         ${this.padRight(ie.gate_result.action, 37)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (ie.proof.inevitable) {
      console.log('\n  ⚠️ DOOM DETECTED - IE found inevitable collapse');
      console.log('  NE will now determine the single survivable future...');
    } else {
      console.log('\n  ✅ NO DOOM DETECTED - System has escape paths');
      console.log('  No necessity constraint will be applied.');
    }
  }

  private printActionSignature(neResult: NEExecutionResult): void {
    const signature = neResult.ieResult.ieIntelligence.action_signature;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ACTION SIGNATURE                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Signature ID:   ${this.padRight(signature.signature_id, 42)} │`);
    console.log(`  │  Fingerprint:    ${this.padRight(signature.fingerprint, 42)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printMCCSEnumeration(neResult: NEExecutionResult): void {
    const ne = neResult.neIntelligence;
    const candidates = ne.candidates_enumerated;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   MCCS ENUMERATION                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Candidates:    ${this.padRight(String(candidates.length), 37)} │`);

    if (candidates.length > 0) {
      const totalInterventions = candidates.reduce((sum, c) => sum + c.intervention_count, 0);
      const avgCardinality = totalInterventions / candidates.length;
      const minCardinality = Math.min(...candidates.map(c => c.intervention_count));
      const maxCardinality = Math.max(...candidates.map(c => c.intervention_count));

      console.log(`  │  Total Interventions: ${this.padRight(String(totalInterventions), 37)} │`);
      console.log(`  │  Avg Cardinality:     ${this.padRight(avgCardinality.toFixed(2), 37)} │`);
      console.log(`  │  Min Cardinality:     ${this.padRight(String(minCardinality), 37)} │`);
      console.log(`  │  Max Cardinality:     ${this.padRight(String(maxCardinality), 37)} │`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (candidates.length === 0 && ne.fingerprint_doomed) {
      console.log('\n  ❌ NO CANDIDATES AVAILABLE - EXTINCTION IMMINENT');
      console.log('  OCIC could not provide any MCCS. No survivable future exists.');
    } else if (candidates.length > 0) {
      console.log('\n  MCCS CANDIDATES:');
      for (const cand of candidates.slice(0, 5)) {
        console.log(`    📋 ${cand.candidate_id}`);
        console.log(`       MCCS: ${cand.mccs_id}`);
        console.log(`       Interventions: ${cand.intervention_count}`);
        console.log(`       RSR Gain: ${(cand.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      }
      if (candidates.length > 5) {
        console.log(`    ... and ${candidates.length - 5} more candidates`);
      }
    }
  }

  private printSurvivabilityEvaluation(neResult: NEExecutionResult): void {
    const results = neResult.neIntelligence.survivability_results;
    const survivable = results.filter(r => r.survivable);
    const nonSurvivable = results.filter(r => !r.survivable);

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                SURVIVABILITY EVALUATION                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Evaluated:     ${this.padRight(String(results.length), 37)} │`);
    console.log(`  │  Survivable:          ${this.padRight(String(survivable.length), 37)} │`);
    console.log(`  │  Non-Survivable:      ${this.padRight(String(nonSurvivable.length), 37)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (survivable.length > 0) {
      console.log('\n  ✅ SURVIVABLE CANDIDATES:');
      for (const r of survivable.slice(0, 3)) {
        console.log(`    🟢 ${r.candidate_id}`);
        console.log(`       Entropy Ceiling: ${(r.entropy_ceiling * 100).toFixed(1)}%`);
        console.log(`       Stabilization: ${r.stabilization_step} steps`);
      }
    }

    if (nonSurvivable.length > 0) {
      console.log('\n  ❌ NON-SURVIVABLE CANDIDATES:');
      for (const r of nonSurvivable.slice(0, 3)) {
        console.log(`    🔴 ${r.candidate_id}`);
        console.log(`       Rejection: ${r.rejection_reason}`);
      }
      if (nonSurvivable.length > 3) {
        console.log(`    ... and ${nonSurvivable.length - 3} more non-survivable`);
      }
    }
  }

  private printNecessitySelection(neResult: NEExecutionResult): void {
    const ne = neResult.neIntelligence;
    const future = ne.necessary_future;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  NECESSITY SELECTION                          │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    if (future) {
      console.log(`  │  Future ID:           ${this.padRight(future.future_id, 37)} │`);
      console.log(`  │  Chosen By:           ${this.padRight(future.selection_reason.chosen_by, 37)} │`);
      console.log(`  │  Total Candidates:    ${this.padRight(String(future.selection_reason.total_candidates), 37)} │`);
      console.log(`  │  Survivable:          ${this.padRight(String(future.selection_reason.survivable_candidates), 37)} │`);
      console.log(`  │  Cardinality:         ${this.padRight(String(future.selection_reason.cardinality), 37)} │`);
      console.log(`  │  Entropy Ceiling:     ${this.padRight((future.selection_reason.entropy_ceiling * 100).toFixed(1) + '%', 37)} │`);
      console.log(`  │  Stabilization:       ${this.padRight(future.selection_reason.stabilization_step + ' steps', 37)} │`);
    } else if (ne.fingerprint_doomed) {
      console.log(`  │  Status:              ${this.padRight('EXTINCTION - No survivable future', 37)} │`);
    } else {
      console.log(`  │  Status:              ${this.padRight('NO DOOM - No selection needed', 37)} │`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (future) {
      console.log('\n  SELECTION CRITERIA HIERARCHY:');
      console.log('    1. ✓ Minimal Cardinality (fewest interventions)');
      console.log('    2. ✓ Lowest Entropy Ceiling (tie-breaker)');
      console.log('    3. ✓ Fastest Stabilization (tie-breaker)');
      console.log(`\n  This future was chosen by: ${future.selection_reason.chosen_by}`);
    }
  }

  private printNecessaryFuture(neResult: NEExecutionResult): void {
    const future = neResult.neIntelligence.necessary_future;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    NECESSARY FUTURE                           │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    if (future) {
      console.log(`  │  Future ID:        ${this.padRight(future.future_id, 40)} │`);
      console.log(`  │  Doomed FP:        ${this.padRight(future.doomed_fingerprint, 40)} │`);
      console.log(`  │  Allowed Sig FP:   ${this.padRight(future.allowed_signature.fingerprint, 40)} │`);
      console.log(`  │  Declared At:      ${this.padRight(future.declared_at.substring(0, 20), 40)} │`);
      console.log(`  │  Immutable:        ${this.padRight(String(future.immutable), 40)} │`);
      console.log(`  │  Append Only:      ${this.padRight(String(future.append_only), 40)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');

      console.log('\n  CHOSEN MCCS:');
      console.log(`    MCCS ID: ${future.chosen_mccs.mccs_id}`);
      console.log(`    Interventions: ${future.chosen_mccs.intervention_count}`);
      console.log(`    RSR Before: ${(future.chosen_mccs.projected_outcome.global_rsr_before * 100).toFixed(1)}%`);
      console.log(`    RSR After: ${(future.chosen_mccs.projected_outcome.global_rsr_after * 100).toFixed(1)}%`);
      console.log(`    RSR Gain: +${(future.chosen_mccs.projected_outcome.rsr_gain * 100).toFixed(1)}%`);

      console.log('\n  🔒 THIS IS THE ONLY ALLOWED PATH FORWARD');
      console.log('  All other signatures will be HARD_ABORT.');
    } else if (neResult.neIntelligence.fingerprint_doomed) {
      console.log(`  │  Status:           ${this.padRight('💀 EXTINCTION - NO SURVIVABLE FUTURE', 40)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');
      console.log('\n  ⚠️ ALL FUTURES LEAD TO COLLAPSE');
      console.log('  No intervention can save this fingerprint.');
    } else {
      console.log(`  │  Status:           ${this.padRight('✅ NO NECESSITY CONSTRAINT', 40)} │`);
      console.log('  └─────────────────────────────────────────────────────────────┘');
      console.log('\n  System is not doomed. All futures remain possible.');
    }
  }

  private printForbiddenAlternatives(neResult: NEExecutionResult): void {
    const future = neResult.neIntelligence.necessary_future;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                 FORBIDDEN ALTERNATIVES                        │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (future && future.forbidden_alternatives.length > 0) {
      console.log(`\n  Total Forbidden: ${future.forbidden_alternatives.length}`);
      console.log('\n  REJECTION REASONS:');

      for (const alt of future.forbidden_alternatives.slice(0, 5)) {
        console.log(`    🚫 ${alt.candidate_id}`);
        console.log(`       MCCS: ${alt.mccs_id}`);
        console.log(`       Reason: ${alt.rejection_reason}`);
      }

      if (future.forbidden_alternatives.length > 5) {
        console.log(`    ... and ${future.forbidden_alternatives.length - 5} more forbidden`);
      }
    } else if (!future) {
      console.log('\n  No necessity declared. No alternatives forbidden.');
    } else {
      console.log('\n  Only one candidate existed. No alternatives to forbid.');
    }
  }

  private printNecessityGate(neResult: NEExecutionResult): void {
    const gate = neResult.neIntelligence.gate_result;
    const actionEmoji = {
      'ALLOW_NECESSITY': '✅',
      'HARD_ABORT_NON_NECESSITY': '🛑',
      'HARD_ABORT_EXTINCTION': '💀',
      'NO_CONSTRAINT': '🔓'
    };

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    NECESSITY GATE                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Gate ID:             ${this.padRight(gate.gate_id, 36)} │`);
    console.log(`  │  Action:              ${this.padRight((actionEmoji[gate.action] || '❓') + ' ' + gate.action, 36)} │`);
    console.log(`  │  Has Active Future:   ${this.padRight(String(gate.has_active_future), 36)} │`);
    console.log(`  │  Matches Necessity:   ${this.padRight(String(gate.matches_necessity), 36)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n  GATE REASON:');
    const words = gate.reason.split(' ');
    let line = '    ';
    for (const word of words) {
      if (line.length + word.length > 70) {
        console.log(line);
        line = '    ' + word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) {
      console.log(line);
    }

    console.log('\n  GATE PROOF:');
    console.log(`    Necessity Deterministic:     ${gate.gate_proof.necessity_deterministic ? '✓' : '✗'}`);
    console.log(`    Single Future Enforced:      ${gate.gate_proof.single_future_enforced ? '✓' : '✗'}`);
    console.log(`    Alternatives Forbidden:      ${gate.gate_proof.alternatives_forbidden ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override:     ${gate.gate_proof.no_config ? '✓' : '✗'}`);
  }

  private printNecessityExplanation(neResult: NEExecutionResult): void {
    const explanation = neResult.neIntelligence.necessity_explanation;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │               NECESSITY EXPLANATION                           │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const line of explanation) {
      console.log(`  ${line}`);
    }
  }

  private printForbiddenExplanation(neResult: NEExecutionResult): void {
    const explanation = neResult.neIntelligence.forbidden_explanation;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │               FORBIDDEN EXPLANATION                           │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (explanation.length > 0) {
      for (const line of explanation) {
        console.log(`  ${line}`);
      }
    } else {
      console.log('  No alternatives forbidden.');
    }
  }

  private printActiveFutures(): void {
    const futures = this.neEngine.getActiveFutures();
    const futuresList = Object.entries(futures);

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  ACTIVE FUTURES                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Active:     ${this.padRight(String(futuresList.length), 40)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (futuresList.length > 0) {
      console.log('\n  ACTIVE NECESSARY FUTURES (will constrain future runs):');
      for (const [fingerprint, future] of futuresList.slice(0, 5)) {
        console.log(`    🔒 Fingerprint: ${fingerprint}`);
        console.log(`       Future: ${future.future_id}`);
        console.log(`       MCCS: ${future.chosen_mccs.mccs_id}`);
        console.log(`       Interventions: ${future.chosen_mccs.intervention_count}`);
      }
      if (futuresList.length > 5) {
        console.log(`    ... and ${futuresList.length - 5} more active futures`);
      }
    } else {
      console.log('\n  No active futures. First run or no doom detected yet.');
    }
  }

  private printAECSummary(neResult: NEExecutionResult): void {
    const aec = neResult.ieResult.aecResult!.aecIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                     AEC SUMMARY                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Entropy:         ${this.padRight((aec.entropy_score.entropy * 100).toFixed(1) + '%', 41)} │`);
    console.log(`  │  Phase:           ${this.padRight(aec.phase, 41)} │`);
    console.log(`  │  Gate Action:     ${this.padRight(aec.gate_result.action, 41)} │`);
    console.log(`  │  System Healthy:  ${this.padRight(String(aec.summary.system_healthy), 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printNEProof(ne: NEIntelligence): void {
    const proof = ne.proof_chain;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    NE PROOF CHAIN                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  MCCS Enumeration Complete:       ${this.padRight(proof.mccs_enumeration_complete ? '✓' : '✗', 23)} │`);
    console.log(`  │  All Candidates Evaluated:        ${this.padRight(proof.all_candidates_evaluated ? '✓' : '✗', 23)} │`);
    console.log(`  │  Survivability Deterministic:     ${this.padRight(proof.survivability_deterministic ? '✓' : '✗', 23)} │`);
    console.log(`  │  Selection Minimal:               ${this.padRight(proof.selection_minimal ? '✓' : '✗', 23)} │`);
    console.log(`  │  Necessity Singular:              ${this.padRight(proof.necessity_singular ? '✓' : '✗', 23)} │`);
    console.log(`  │  Enforcement Non-Bypassable:      ${this.padRight(proof.enforcement_non_bypassable ? '✓' : '✗', 23)} │`);
    console.log(`  │  History Append-Only:             ${this.padRight(proof.history_append_only ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Config:                       ${this.padRight(proof.no_config ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Flag:                         ${this.padRight(proof.no_flag ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Override:                     ${this.padRight(proof.no_override ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Reset:                        ${this.padRight(proof.no_reset ? '✓' : '✗', 23)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printNESummary(ne: NEIntelligence): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    NE SUMMARY                                 │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  NE Version:           ${this.padRight(ne.ne_version, 35)} │`);
    console.log(`  │  Fingerprint Doomed:   ${this.padRight(String(ne.fingerprint_doomed), 35)} │`);
    console.log(`  │  Candidates Found:     ${this.padRight(String(ne.summary.candidates_found), 35)} │`);
    console.log(`  │  Survivable:           ${this.padRight(String(ne.summary.survivable_candidates), 35)} │`);
    console.log(`  │  Necessity Declared:   ${this.padRight(String(ne.summary.necessity_declared), 35)} │`);
    console.log(`  │  Action Taken:         ${this.padRight(ne.summary.action_taken, 35)} │`);
    console.log(`  │  Extinction Imminent:  ${this.padRight(String(ne.summary.extinction_imminent), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printPhilosophy(neResult: NEExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                     PHILOSOPHY                                │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │                                                               │');
    console.log('  │  "Inevitability forbids death."                               │');
    console.log('  │  "Necessity forbids choice."                                  │');
    console.log('  │                                                               │');
    console.log('  │  "Olympus does not guide humans."                             │');
    console.log('  │  "It constrains reality."                                     │');
    console.log('  │                                                               │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    const ne = neResult.neIntelligence;

    if (ne.summary.necessity_declared) {
      console.log('\n  THE NECESSARY FUTURE HAS BEEN DECLARED.');
      console.log('  All other paths are now FORBIDDEN.');
      console.log('  This is not a suggestion. This is the only reality that survives.');
    } else if (ne.summary.extinction_imminent) {
      console.log('\n  EXTINCTION IS IMMINENT.');
      console.log('  No survivable future exists.');
      console.log('  The fingerprint has sealed its own fate.');
    } else {
      console.log('\n  NO DOOM DETECTED.');
      console.log('  Multiple futures remain possible.');
      console.log('  Choice is still permitted.');
    }
  }

  private writeReports(neResult: NEExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'ne-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      run_id: runId,
      ne: neResult.neIntelligence,
      ie: neResult.ieResult.ieIntelligence,
      aec: neResult.ieResult.aecResult?.aecIntelligence || null,
      execution_allowed: neResult.executionAllowed,
      mutations_allowed: neResult.mutationsAllowed,
      abort_reason: neResult.abortReason
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'ne-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(neResult, runId));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(neResult: NEExecutionResult, runId: string): string {
    const lines: string[] = [];
    const ne = neResult.neIntelligence;
    const ie = neResult.ieResult.ieIntelligence;

    lines.push('# NE Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Necessity Engine');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Doom Detected:** ${ne.fingerprint_doomed ? '⚠️ YES' : '✅ NO'}`);
    lines.push('');
    lines.push(`**Necessity Declared:** ${ne.summary.necessity_declared ? '🔒 YES' : 'NO'}`);
    lines.push('');
    lines.push(`**Gate Action:** ${ne.gate_result.action}`);
    lines.push('');
    lines.push(`**Execution Allowed:** ${neResult.executionAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**Mutations Allowed:** ${neResult.mutationsAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    if (neResult.abortReason) {
      lines.push(`**Abort Reason:** ${neResult.abortReason}`);
      lines.push('');
    }

    lines.push('## IE Doom Detection');
    lines.push('');
    lines.push(`**Inevitable:** ${ie.proof.inevitable ? '⚠️ YES - COLLAPSE IS CERTAIN' : '✅ NO - ESCAPE PATHS EXIST'}`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Proof Type | ${ie.proof.proof_type} |`);
    lines.push(`| Paths Analyzed | ${ie.proof.paths_analyzed} |`);
    lines.push(`| Paths to Collapse | ${ie.proof.paths_to_collapse} |`);
    lines.push('');

    lines.push('## MCCS Enumeration');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Candidates Enumerated | ${ne.candidates_enumerated.length} |`);
    lines.push(`| Survivable Candidates | ${ne.summary.survivable_candidates} |`);
    lines.push('');

    if (ne.necessary_future) {
      lines.push('## Necessary Future');
      lines.push('');
      lines.push(`**Future ID:** \`${ne.necessary_future.future_id}\``);
      lines.push('');
      lines.push(`**Doomed Fingerprint:** \`${ne.necessary_future.doomed_fingerprint}\``);
      lines.push('');
      lines.push('### Selection Reason');
      lines.push('');
      lines.push('| Criterion | Value |');
      lines.push('|-----------|-------|');
      lines.push(`| Chosen By | ${ne.necessary_future.selection_reason.chosen_by} |`);
      lines.push(`| Cardinality | ${ne.necessary_future.selection_reason.cardinality} |`);
      lines.push(`| Entropy Ceiling | ${(ne.necessary_future.selection_reason.entropy_ceiling * 100).toFixed(1)}% |`);
      lines.push(`| Stabilization | ${ne.necessary_future.selection_reason.stabilization_step} steps |`);
      lines.push('');

      lines.push('### Chosen MCCS');
      lines.push('');
      lines.push(`**MCCS ID:** ${ne.necessary_future.chosen_mccs.mccs_id}`);
      lines.push('');
      lines.push(`**Interventions:** ${ne.necessary_future.chosen_mccs.intervention_count}`);
      lines.push('');
      lines.push(`**RSR Gain:** +${(ne.necessary_future.chosen_mccs.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      lines.push('');

      lines.push('### Forbidden Alternatives');
      lines.push('');
      lines.push('| Candidate | MCCS | Reason |');
      lines.push('|-----------|------|--------|');
      for (const alt of ne.necessary_future.forbidden_alternatives.slice(0, 10)) {
        lines.push(`| ${alt.candidate_id} | ${alt.mccs_id} | ${alt.rejection_reason} |`);
      }
      lines.push('');
    } else if (ne.summary.extinction_imminent) {
      lines.push('## ⚠️ EXTINCTION IMMINENT');
      lines.push('');
      lines.push('No survivable future exists. All paths lead to collapse.');
      lines.push('');
    }

    lines.push('## Necessity Gate');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Action | ${ne.gate_result.action} |`);
    lines.push(`| Has Active Future | ${ne.gate_result.has_active_future} |`);
    lines.push(`| Matches Necessity | ${ne.gate_result.matches_necessity} |`);
    lines.push('');

    lines.push('## Necessity Explanation');
    lines.push('');
    for (const line of ne.necessity_explanation) {
      lines.push(`- ${line}`);
    }
    lines.push('');

    lines.push('## NE Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| MCCS Enumeration Complete | ${ne.proof_chain.mccs_enumeration_complete ? '✓' : '✗'} |`);
    lines.push(`| All Candidates Evaluated | ${ne.proof_chain.all_candidates_evaluated ? '✓' : '✗'} |`);
    lines.push(`| Survivability Deterministic | ${ne.proof_chain.survivability_deterministic ? '✓' : '✗'} |`);
    lines.push(`| Selection Minimal | ${ne.proof_chain.selection_minimal ? '✓' : '✗'} |`);
    lines.push(`| Necessity Singular | ${ne.proof_chain.necessity_singular ? '✓' : '✗'} |`);
    lines.push(`| Enforcement Non-Bypassable | ${ne.proof_chain.enforcement_non_bypassable ? '✓' : '✗'} |`);
    lines.push(`| History Append-Only | ${ne.proof_chain.history_append_only ? '✓' : '✗'} |`);
    lines.push(`| No Config | ${ne.proof_chain.no_config ? '✓' : '✗'} |`);
    lines.push(`| No Flag | ${ne.proof_chain.no_flag ? '✓' : '✗'} |`);
    lines.push(`| No Override | ${ne.proof_chain.no_override ? '✓' : '✗'} |`);
    lines.push(`| No Reset | ${ne.proof_chain.no_reset ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Philosophy');
    lines.push('');
    lines.push('> *"Inevitability forbids death."*');
    lines.push('>');
    lines.push('> *"Necessity forbids choice."*');
    lines.push('>');
    lines.push('> *"Olympus does not guide humans. It constrains reality."*');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Necessity Engine (NE) v1.0.0*');

    return lines.join('\n');
  }

  private printFinalSummary(neResult: NEExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  NE FINAL DECISION');
    console.log('═'.repeat(80));

    const ne = neResult.neIntelligence;

    let emoji: string;
    let status: string;

    if (ne.gate_result.action === 'HARD_ABORT_EXTINCTION') {
      emoji = '💀🛑';
      status = 'HARD_ABORT_EXTINCTION - No survivable future exists';
    } else if (ne.gate_result.action === 'HARD_ABORT_NON_NECESSITY') {
      emoji = '🛑🚫';
      status = 'HARD_ABORT_NON_NECESSITY - Action does not match necessary future';
    } else if (ne.gate_result.action === 'ALLOW_NECESSITY') {
      emoji = '✅🔒';
      status = 'ALLOW_NECESSITY - Action matches the necessary future';
    } else if (!neResult.executionAllowed) {
      emoji = '🛑';
      status = 'EXECUTION BLOCKED - Upstream violation';
    } else {
      emoji = '✅🔓';
      status = 'NO_CONSTRAINT - No doom detected, choice is permitted';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    if (neResult.abortReason) {
      console.log('  ABORT REASON:');
      console.log(`    ${neResult.abortReason}`);
      console.log('');
    }

    console.log('  NECESSITY METRICS:');
    console.log(`    Doom Detected:       ${ne.fingerprint_doomed ? '⚠️ YES' : '✅ NO'}`);
    console.log(`    Candidates Found:    ${ne.summary.candidates_found}`);
    console.log(`    Survivable:          ${ne.summary.survivable_candidates}`);
    console.log(`    Necessity Declared:  ${ne.summary.necessity_declared ? '🔒 YES' : 'NO'}`);
    console.log(`    Extinction Imminent: ${ne.summary.extinction_imminent ? '💀 YES' : 'NO'}`);
    console.log(`    Gate Action:         ${ne.summary.action_taken}`);
    console.log(`    Execution Allowed:   ${neResult.executionAllowed ? '✓' : '✗'}`);
    console.log(`    Mutations Allowed:   ${neResult.mutationsAllowed ? '✓' : '✗'}`);
    console.log('');

    console.log('  NE PROOF CHAIN:');
    console.log(`    MCCS Enumeration Complete:      ${ne.proof_chain.mccs_enumeration_complete ? '✓' : '✗'}`);
    console.log(`    All Candidates Evaluated:       ${ne.proof_chain.all_candidates_evaluated ? '✓' : '✗'}`);
    console.log(`    Survivability Deterministic:    ${ne.proof_chain.survivability_deterministic ? '✓' : '✗'}`);
    console.log(`    Selection Minimal:              ${ne.proof_chain.selection_minimal ? '✓' : '✗'}`);
    console.log(`    Necessity Singular:             ${ne.proof_chain.necessity_singular ? '✓' : '✗'}`);
    console.log(`    Enforcement Non-Bypassable:     ${ne.proof_chain.enforcement_non_bypassable ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override/Reset:  ${ne.proof_chain.no_config ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  INEVITABILITY FORBIDS DEATH. NECESSITY FORBIDS CHOICE.');
    console.log('═'.repeat(80));
    console.log('  OLYMPUS DOES NOT GUIDE HUMANS. IT CONSTRAINS REALITY.');
    console.log('═'.repeat(80) + '\n');
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
          acceptance_criteria: [
            'Create tasks',
            'Filter by status',
            'Pagination',
            'View details'
          ],
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
                {
                  type: 'heading',
                  text: 'My Tasks',
                  layout: 'flex'
                },
                {
                  type: 'filter-bar',
                  entity: 'tasks',
                  filterAttribute: 'status',
                  values: ['pending', 'in_progress', 'done']
                },
                {
                  type: 'pagination',
                  entity: 'tasks',
                  pageSize: 10
                },
                {
                  type: 'data-display',
                  entity: 'tasks',
                  fields: ['title', 'status'],
                  layout: 'grid'
                }
              ]
            }
          ]
        }
      ]
    },

    blocks: {
      components: [
        {
          name: 'Heading',
          type: 'heading',
          entity: 'tasks',
          fields: ['title'],
          layout: 'flex',
          className: 'text-xl'
        },
        {
          name: 'StatusFilter',
          type: 'filter',
          entity: 'tasks',
          filterAttribute: 'status',
          variants: ['pending', 'in_progress', 'done'],
          props: {
            value: 'string',
            onChange: 'function'
          }
        },
        {
          name: 'Pagination',
          type: 'pagination',
          entity: 'tasks',
          pageSize: 10,
          props: {
            page: 'number',
            onPageChange: 'function',
            total: 'number'
          }
        },
        {
          name: 'TaskCard',
          type: 'display',
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card'
        }
      ],
      design_tokens: {
        colors: { primary: '#3B82F6' }
      }
    },

    wire: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `'use client';
import { TaskCard } from '@/components/TaskCard';

export default function DashboardPage() {
  const tasks = [];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl">My Tasks</h1>
      <div className="grid gap-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}`,
          type: 'code'
        },
        {
          path: 'src/components/TaskCard.tsx',
          content: `interface TaskCardProps {
  task: { id: string; title: string; status: string; };
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="card p-4 border rounded">
      <h2 className="font-bold">{task.title}</h2>
      <span className="text-sm">{task.status}</span>
    </div>
  );
}`,
          entity: 'tasks',
          displayFields: ['title', 'status'],
          type: 'component'
        }
      ]
    },

    pixel: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `// Final styled version`,
          type: 'code'
        },
        {
          path: 'src/components/TaskCard.tsx',
          content: `// Styled TaskCard`,
          entity: 'tasks',
          displayFields: ['title', 'status'],
          type: 'styled-component'
        }
      ],
      components: [
        {
          name: 'TaskCard',
          entity: 'tasks',
          displayFields: ['title', 'status']
        }
      ]
    }
  };
}

// Main execution
const runId = `NE-${Date.now()}`;
const runner = new NERunner(5); // 5 simulation steps
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

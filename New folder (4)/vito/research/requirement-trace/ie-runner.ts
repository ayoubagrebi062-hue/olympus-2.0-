/**
 * IE Runner (Inevitability Engine)
 *
 * Executes the full IE-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. Action fingerprinting
 * 3. Forward counterfactual expansion
 * 4. Inevitability detection
 * 5. Inevitability gate enforcement
 * 6. (If allowed) AEC enforcement (includes RLL, OCIC, ORIS)
 * 7. Inevitability report generation
 *
 * This is the ENTRY POINT for IE-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - Tests stop bugs. AEC stops decay. Inevitability stops self-destruction.
 * - No configs, flags, overrides, or resets.
 * - Deterministic forward simulation only.
 *
 * PHILOSOPHY:
 * If ALL possible futures lead to collapse,
 * the action must be blocked NOW.
 * Prevention is the only option.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES } from './registry/shapes';
import {
  IEEngine,
  type IEExecutionResult,
  type IEIntelligence,
  type ActionSignature,
  type CausalPath,
  type InevitabilityProof,
  type InevitabilityGateResult,
  ENTROPY_PHASE_THRESHOLDS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// IE version - immutable
const IE_VERSION = '1.0.0';

class IERunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private ieEngine: IEEngine;

  constructor(simulationSteps: number = 5) {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.ieEngine = new IEEngine(DATA_DIR, simulationSteps);
  }

  /**
   * Execute full IE-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): IEExecutionResult {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS INEVITABILITY ENGINE (IE)');
    console.log('  Mode: FORWARD_SIMULATION | Gate: MATHEMATICAL | Override: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/18] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/18] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute IE engine (IE + AEC + RLL + OCIC + ORIS)
    console.log('\n[3/18] EXECUTING IE ENFORCEMENT...');
    const ieResult = this.ieEngine.execute(traceResults, gateResult, runId);
    this.printEnforcementDecision(ieResult);

    // Step 4: Display action signature
    console.log('\n[4/18] ACTION SIGNATURE...');
    this.printActionSignature(ieResult.ieIntelligence.action_signature);

    // Step 5: Display causal paths
    console.log('\n[5/18] CAUSAL PATHS...');
    this.printCausalPaths(ieResult.ieIntelligence.causal_paths);

    // Step 6: Display inevitability proof
    console.log('\n[6/18] INEVITABILITY PROOF...');
    this.printInevitabilityProof(ieResult.ieIntelligence.proof);

    // Step 7: Display inevitability gate
    console.log('\n[7/18] INEVITABILITY GATE...');
    this.printInevitabilityGate(ieResult.ieIntelligence.gate_result);

    // Step 8: Display causal chain summary
    console.log('\n[8/18] CAUSAL CHAIN SUMMARY...');
    this.printCausalChainSummary(ieResult.ieIntelligence.causal_chain_summary);

    // Step 9: Display entropy trajectories
    console.log('\n[9/18] ENTROPY TRAJECTORIES...');
    this.printEntropyTrajectories(ieResult.ieIntelligence.entropy_trajectory);

    // Step 10: Display doomed fingerprints
    console.log('\n[10/18] DOOMED FINGERPRINTS...');
    this.printDoomedFingerprints();

    // Step 11: Display AEC summary (if IE allowed)
    if (ieResult.aecResult) {
      console.log('\n[11/18] AEC SUMMARY...');
      this.printAECSummary(ieResult.aecResult);

      console.log('\n[12/18] ENTROPY MEASUREMENT...');
      this.printEntropyMeasurement(ieResult.aecResult);

      console.log('\n[13/18] PHASE CLASSIFICATION...');
      this.printPhaseClassification(ieResult.aecResult);

      console.log('\n[14/18] RLL SUMMARY...');
      this.printRLLSummary(ieResult.aecResult);

      console.log('\n[15/18] MORTALITY ANALYSIS...');
      this.printMortalityAnalysis(ieResult.aecResult);
    } else {
      console.log('\n[11-15/18] SKIPPED - IE HARD_ABORT prevented downstream execution');
    }

    // Step 16: Display IE proof chain
    console.log('\n[16/18] IE PROOF CHAIN...');
    this.printIEProof(ieResult.ieIntelligence);

    // Step 17: Generate report
    console.log('\n[17/18] GENERATING IE REPORT...');
    this.writeReports(ieResult, runId);

    // Step 18: Final summary
    console.log('\n[18/18] FINAL DECISION...');
    this.printFinalSummary(ieResult);

    return ieResult;
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

  private printEnforcementDecision(ieResult: IEExecutionResult): void {
    const ie = ieResult.ieIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   IE ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Inevitable:        ${this.padRight(String(ie.proof.inevitable), 40)} │`);
    console.log(`  │  Proof Type:        ${this.padRight(ie.proof.proof_type, 40)} │`);
    console.log(`  │  Gate Action:       ${this.padRight(ie.gate_result.action, 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Execution Allowed: ${this.padRight(String(ieResult.executionAllowed), 40)} │`);
    console.log(`  │  Mutations Allowed: ${this.padRight(String(ieResult.mutationsAllowed), 40)} │`);
    console.log(`  │  Paths Analyzed:    ${this.padRight(String(ie.proof.paths_analyzed), 40)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printActionSignature(signature: ActionSignature): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ACTION SIGNATURE                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Signature ID:   ${this.padRight(signature.signature_id, 42)} │`);
    console.log(`  │  Fingerprint:    ${this.padRight(signature.fingerprint, 42)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  STRUCTURAL COMPONENTS:                                       │');
    console.log(`  │    Affected Shapes:   ${this.padRight(String(signature.components.affected_shapes.length), 36)} │`);
    console.log(`  │    Affected Handoffs: ${this.padRight(signature.components.affected_handoffs.join(', ') || 'none', 36)} │`);
    console.log(`  │    Transform Types:   ${this.padRight(signature.components.transform_types.join(', ') || 'none', 36)} │`);
    console.log(`  │    Change Directions: ${this.padRight(signature.components.change_directions.join(', ') || 'none', 36)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printCausalPaths(paths: CausalPath[]): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   CAUSAL PATHS                                │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Paths:     ${this.padRight(String(paths.length), 41)} │`);

    const collapsePaths = paths.filter(p => p.leads_to_collapse).length;
    const escapePaths = paths.length - collapsePaths;

    console.log(`  │  Collapse Paths:  ${this.padRight(String(collapsePaths), 41)} │`);
    console.log(`  │  Escape Paths:    ${this.padRight(String(escapePaths), 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n  PATH DETAILS:');
    for (const path of paths.slice(0, 5)) { // Show first 5 paths
      const collapseEmoji = path.leads_to_collapse ? '💀' : '✅';
      const mccsEmoji = path.mccs_grows_monotonically ? '📈' : '📉';

      console.log(`\n  ${collapseEmoji} Path: ${path.path_id}`);
      console.log(`     Origin: ${path.origin_counterfactual}`);
      console.log(`     Steps: ${path.steps_simulated}`);
      console.log(`     Terminal Phase: ${path.terminal_state.phase}`);
      console.log(`     Terminal Entropy: ${(path.terminal_state.entropy * 100).toFixed(1)}%`);
      console.log(`     MCCS Growth: ${mccsEmoji} ${path.mccs_grows_monotonically ? 'Monotonic' : 'Non-monotonic'}`);
    }

    if (paths.length > 5) {
      console.log(`\n  ... and ${paths.length - 5} more paths`);
    }
  }

  private printInevitabilityProof(proof: InevitabilityProof): void {
    const inevitableEmoji = proof.inevitable ? '⚠️ YES' : '✅ NO';

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   INEVITABILITY PROOF                         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  INEVITABLE:        ${this.padRight(inevitableEmoji, 39)} │`);
    console.log(`  │  Proof Type:        ${this.padRight(proof.proof_type, 39)} │`);
    console.log(`  │  Confidence:        ${this.padRight((proof.confidence * 100).toFixed(0) + '%', 39)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Paths Analyzed:    ${this.padRight(String(proof.paths_analyzed), 39)} │`);
    console.log(`  │  Paths to Collapse: ${this.padRight(String(proof.paths_to_collapse), 39)} │`);
    console.log(`  │  MCCS Growth Paths: ${this.padRight(String(proof.paths_with_mccs_growth), 39)} │`);

    if (proof.steps_to_collapse !== null) {
      console.log(`  │  Steps to Collapse: ${this.padRight(String(proof.steps_to_collapse), 39)} │`);
    }

    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (proof.inevitable) {
      console.log('\n  ⚠️ COLLAPSE IS MATHEMATICALLY CERTAIN');
      console.log('  No escape path exists. All futures lead to architectural death.');
    } else {
      console.log('\n  ✅ COLLAPSE IS NOT INEVITABLE');
      console.log('  Escape paths exist. System can recover via intervention.');
    }
  }

  private printInevitabilityGate(gate: InevitabilityGateResult): void {
    const actionEmoji = gate.action === 'HARD_ABORT' ? '🛑' : '✅';

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   INEVITABILITY GATE                          │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Gate Action:            ${this.padRight(actionEmoji + ' ' + gate.action, 33)} │`);
    console.log(`  │  Signature Seen Before:  ${this.padRight(gate.signature_seen_before ? 'YES' : 'NO', 33)} │`);
    console.log(`  │  Fingerprint Was Doomed: ${this.padRight(gate.fingerprint_already_doomed ? 'YES' : 'NO', 33)} │`);
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
    console.log(`    Forward Simulation Deterministic: ${gate.gate_proof.forward_simulation_deterministic ? '✓' : '✗'}`);
    console.log(`    All Paths Explored:               ${gate.gate_proof.all_paths_explored ? '✓' : '✗'}`);
    console.log(`    Inevitability Mathematical:       ${gate.gate_proof.inevitability_mathematical ? '✓' : '✗'}`);
    console.log(`    No Heuristics:                    ${gate.gate_proof.no_heuristics ? '✓' : '✗'}`);
    console.log(`    No Probability:                   ${gate.gate_proof.no_probability ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override:          ${gate.gate_proof.no_config ? '✓' : '✗'}`);
  }

  private printCausalChainSummary(summary: string[]): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   CAUSAL CHAIN SUMMARY                        │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const line of summary) {
      console.log(`  ${line}`);
    }
  }

  private printEntropyTrajectories(trajectories: IEIntelligence['entropy_trajectory']): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ENTROPY TRAJECTORIES                        │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const traj of trajectories.slice(0, 3)) { // Show first 3
      const collapseEmoji = traj.leads_to_collapse ? '💀' : '✅';
      console.log(`\n  ${collapseEmoji} ${traj.path_id}:`);

      // Create mini entropy bar
      const bar = traj.trajectory.map(e => {
        if (e <= 0.25) return '🟢';
        if (e <= 0.50) return '🟡';
        if (e <= 0.75) return '🟠';
        return '🔴';
      }).join('');

      console.log(`     [${bar}]`);
      console.log(`     ${traj.trajectory.map(e => (e * 100).toFixed(0) + '%').join(' → ')}`);
    }

    if (trajectories.length > 3) {
      console.log(`\n  ... and ${trajectories.length - 3} more trajectories`);
    }
  }

  private printDoomedFingerprints(): void {
    const doomed = this.ieEngine.getDoomedFingerprints();

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   DOOMED FINGERPRINTS                         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Doomed:  ${this.padRight(String(doomed.length), 43)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (doomed.length > 0) {
      console.log('\n  DOOMED FINGERPRINTS (will be blocked immediately):');
      for (const fp of doomed.slice(0, 10)) {
        console.log(`    💀 ${fp}`);
      }
      if (doomed.length > 10) {
        console.log(`    ... and ${doomed.length - 10} more`);
      }
    } else {
      console.log('\n  No doomed fingerprints yet. First run.');
    }
  }

  private printAECSummary(aecResult: any): void {
    const aec = aecResult.aecIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   AEC SUMMARY                                 │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Entropy:         ${this.padRight((aec.entropy_score.entropy * 100).toFixed(1) + '%', 41)} │`);
    console.log(`  │  Phase:           ${this.padRight(aec.phase, 41)} │`);
    console.log(`  │  Gate Action:     ${this.padRight(aec.gate_result.action, 41)} │`);
    console.log(`  │  System Healthy:  ${this.padRight(String(aec.summary.system_healthy), 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printEntropyMeasurement(aecResult: any): void {
    const score = aecResult.aecIntelligence.entropy_score;

    console.log('  ENTROPY COMPONENTS:');
    console.log(`    RSR Trend (w=0.35):          ${(score.components.rsr_trend_score * 100).toFixed(1)}%`);
    console.log(`    Mortality Velocity (w=0.25): ${(score.components.mortality_velocity_score * 100).toFixed(1)}%`);
    console.log(`    Singularity Density (w=0.20): ${(score.components.singularity_density_score * 100).toFixed(1)}%`);
    console.log(`    MCCS Size (w=0.20):          ${(score.components.mccs_size_score * 100).toFixed(1)}%`);

    console.log('\n  ENTROPY BAR:');
    const bar = this.createEntropyBar(score.entropy);
    console.log(`  ${bar}`);
    console.log('  └─────┴─────┴─────┴─────┘');
    console.log('  0    25    50    75   100');
    console.log('  STABLE DECAY COLLAPSE DEAD');
  }

  private printPhaseClassification(aecResult: any): void {
    const aec = aecResult.aecIntelligence;
    const phaseEmoji = {
      STABLE: '🟢',
      DECAYING: '🟡',
      COLLAPSING: '🟠',
      DEAD: '🔴'
    };

    console.log(`  Current Phase: ${(phaseEmoji as any)[aec.phase]} ${aec.phase}`);
    console.log(`  Trend: ${aec.trend.entropy_trend}`);
    console.log(`  Entropy Delta: ${(aec.trend.entropy_delta * 100).toFixed(2)}%`);
  }

  private printRLLSummary(aecResult: any): void {
    const rll = aecResult.rllResult.rllIntelligence;

    console.log(`  Active Singularities: ${rll.summary.active_singularities}`);
    console.log(`  Singularity Created:  ${rll.summary.singularity_created}`);
    console.log(`  Realities Blocked:    ${rll.summary.realities_blocked}`);
    console.log(`  RLL Action:           ${rll.lock_enforcement.action}`);
  }

  private printMortalityAnalysis(aecResult: any): void {
    const mortality = aecResult.rllResult.ocicResult.orisResult.mortality_analysis;

    console.log(`  HEALTHY:             ${mortality.healthy_count} shapes`);
    console.log(`  FLAKY:               ${mortality.flaky_count} shapes`);
    console.log(`  DEGRADING:           ${mortality.degrading_count} shapes`);
    console.log(`  SYSTEMICALLY_BROKEN: ${mortality.broken_count} shapes`);
  }

  private printIEProof(ie: IEIntelligence): void {
    const proof = ie.proof_chain;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   IE PROOF CHAIN                              │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Simulation Deterministic:      ${this.padRight(proof.simulation_deterministic ? '✓' : '✗', 26)} │`);
    console.log(`  │  All Paths Explored:            ${this.padRight(proof.all_paths_explored ? '✓' : '✗', 26)} │`);
    console.log(`  │  Inevitability Mathematical:    ${this.padRight(proof.inevitability_mathematical ? '✓' : '✗', 26)} │`);
    console.log(`  │  Gate Non-Bypassable:           ${this.padRight(proof.gate_non_bypassable ? '✓' : '✗', 26)} │`);
    console.log(`  │  History Append-Only:           ${this.padRight(proof.history_append_only ? '✓' : '✗', 26)} │`);
    console.log(`  │  No Config:                     ${this.padRight(proof.no_config ? '✓' : '✗', 26)} │`);
    console.log(`  │  No Flag:                       ${this.padRight(proof.no_flag ? '✓' : '✗', 26)} │`);
    console.log(`  │  No Override:                   ${this.padRight(proof.no_override ? '✓' : '✗', 26)} │`);
    console.log(`  │  No Reset:                      ${this.padRight(proof.no_reset ? '✓' : '✗', 26)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private writeReports(ieResult: IEExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'ie-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      run_id: runId,
      ie: ieResult.ieIntelligence,
      aec: ieResult.aecResult?.aecIntelligence || null,
      execution_allowed: ieResult.executionAllowed,
      mutations_allowed: ieResult.mutationsAllowed,
      abort_reason: ieResult.abortReason
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'ie-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(ieResult, runId));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(ieResult: IEExecutionResult, runId: string): string {
    const lines: string[] = [];
    const ie = ieResult.ieIntelligence;

    lines.push('# IE Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Inevitability Engine');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Inevitable:** ${ie.proof.inevitable ? '⚠️ YES' : '✅ NO'}`);
    lines.push('');
    lines.push(`**Proof Type:** ${ie.proof.proof_type}`);
    lines.push('');
    lines.push(`**Gate Action:** ${ie.gate_result.action}`);
    lines.push('');
    lines.push(`**Execution Allowed:** ${ieResult.executionAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**Mutations Allowed:** ${ieResult.mutationsAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    if (ieResult.abortReason) {
      lines.push(`**Abort Reason:** ${ieResult.abortReason}`);
      lines.push('');
    }

    lines.push('## Action Signature');
    lines.push('');
    lines.push(`**Fingerprint:** \`${ie.action_signature.fingerprint}\``);
    lines.push('');
    lines.push('### Structural Components');
    lines.push('');
    lines.push('| Component | Values |');
    lines.push('|-----------|--------|');
    lines.push(`| Affected Shapes | ${ie.action_signature.components.affected_shapes.length} |`);
    lines.push(`| Affected Handoffs | ${ie.action_signature.components.affected_handoffs.join(', ') || 'none'} |`);
    lines.push(`| Transform Types | ${ie.action_signature.components.transform_types.join(', ') || 'none'} |`);
    lines.push(`| Change Directions | ${ie.action_signature.components.change_directions.join(', ') || 'none'} |`);
    lines.push('');

    lines.push('## Inevitability Proof');
    lines.push('');
    lines.push(`**Inevitable:** ${ie.proof.inevitable ? '⚠️ YES - COLLAPSE IS CERTAIN' : '✅ NO - ESCAPE PATHS EXIST'}`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Proof Type | ${ie.proof.proof_type} |`);
    lines.push(`| Paths Analyzed | ${ie.proof.paths_analyzed} |`);
    lines.push(`| Paths to Collapse | ${ie.proof.paths_to_collapse} |`);
    lines.push(`| MCCS Growth Paths | ${ie.proof.paths_with_mccs_growth} |`);
    lines.push(`| Steps to Collapse | ${ie.proof.steps_to_collapse ?? 'N/A'} |`);
    lines.push(`| Confidence | ${(ie.proof.confidence * 100).toFixed(0)}% |`);
    lines.push('');

    lines.push('## Causal Chain Summary');
    lines.push('');
    for (const line of ie.causal_chain_summary) {
      lines.push(`- ${line}`);
    }
    lines.push('');

    lines.push('## Causal Paths');
    lines.push('');
    lines.push('| Path | Origin | Steps | Terminal Phase | Collapse? | MCCS Growth? |');
    lines.push('|------|--------|-------|----------------|-----------|--------------|');
    for (const path of ie.causal_paths.slice(0, 10)) {
      lines.push(`| ${path.path_id} | ${path.origin_counterfactual} | ${path.steps_simulated} | ${path.terminal_state.phase} | ${path.leads_to_collapse ? '💀' : '✅'} | ${path.mccs_grows_monotonically ? '📈' : '📉'} |`);
    }
    lines.push('');

    if (ieResult.aecResult) {
      const aec = ieResult.aecResult.aecIntelligence;

      lines.push('## AEC Status');
      lines.push('');
      lines.push(`**Entropy:** ${(aec.entropy_score.entropy * 100).toFixed(1)}%`);
      lines.push('');
      lines.push(`**Phase:** ${aec.phase}`);
      lines.push('');
      lines.push(`**Gate Action:** ${aec.gate_result.action}`);
      lines.push('');
    }

    lines.push('## IE Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Simulation Deterministic | ${ie.proof_chain.simulation_deterministic ? '✓' : '✗'} |`);
    lines.push(`| All Paths Explored | ${ie.proof_chain.all_paths_explored ? '✓' : '✗'} |`);
    lines.push(`| Inevitability Mathematical | ${ie.proof_chain.inevitability_mathematical ? '✓' : '✗'} |`);
    lines.push(`| Gate Non-Bypassable | ${ie.proof_chain.gate_non_bypassable ? '✓' : '✗'} |`);
    lines.push(`| History Append-Only | ${ie.proof_chain.history_append_only ? '✓' : '✗'} |`);
    lines.push(`| No Config | ${ie.proof_chain.no_config ? '✓' : '✗'} |`);
    lines.push(`| No Flag | ${ie.proof_chain.no_flag ? '✓' : '✗'} |`);
    lines.push(`| No Override | ${ie.proof_chain.no_override ? '✓' : '✗'} |`);
    lines.push(`| No Reset | ${ie.proof_chain.no_reset ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Inevitability Engine (IE) v1.0.0*');
    lines.push('');
    lines.push('**TESTS STOP BUGS. AEC STOPS DECAY. INEVITABILITY STOPS SELF-DESTRUCTION.**');
    lines.push('');
    lines.push('**IF ALL FUTURES LEAD TO DEATH, BLOCK THE PRESENT.**');

    return lines.join('\n');
  }

  private printFinalSummary(ieResult: IEExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  IE FINAL DECISION');
    console.log('═'.repeat(80));

    const ie = ieResult.ieIntelligence;

    let emoji: string;
    let status: string;

    if (ie.gate_result.action === 'HARD_ABORT') {
      emoji = '🛑💀';
      status = 'HARD_ABORT - Collapse is INEVITABLE';
    } else if (ieResult.aecResult?.aecIntelligence.gate_result.action === 'PERMANENT_HALT') {
      emoji = '💀';
      status = 'PERMANENT_HALT - System is DEAD';
    } else if (ieResult.aecResult?.aecIntelligence.gate_result.action === 'READ_ONLY') {
      emoji = '🔒📖';
      status = 'READ_ONLY - System is COLLAPSING';
    } else if (!ieResult.executionAllowed) {
      emoji = '🛑';
      status = 'EXECUTION BLOCKED - Upstream violation';
    } else if (ieResult.aecResult?.aecIntelligence.summary.system_healthy) {
      emoji = '✅🟢';
      status = 'SYSTEM HEALTHY - Architecture is STABLE';
    } else {
      emoji = '⚠️';
      status = 'EXECUTION ALLOWED - Monitor entropy';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    if (ieResult.abortReason) {
      console.log('  ABORT REASON:');
      console.log(`    ${ieResult.abortReason}`);
      console.log('');
    }

    console.log('  INEVITABILITY METRICS:');
    console.log(`    Inevitable:          ${ie.proof.inevitable ? '⚠️ YES' : '✅ NO'}`);
    console.log(`    Proof Type:          ${ie.proof.proof_type}`);
    console.log(`    Paths Analyzed:      ${ie.proof.paths_analyzed}`);
    console.log(`    Paths to Collapse:   ${ie.proof.paths_to_collapse}`);
    if (ie.proof.steps_to_collapse !== null) {
      console.log(`    Steps to Collapse:   ${ie.proof.steps_to_collapse}`);
    }
    console.log(`    Execution Allowed:   ${ieResult.executionAllowed ? '✓' : '✗'}`);
    console.log(`    Mutations Allowed:   ${ieResult.mutationsAllowed ? '✓' : '✗'}`);
    console.log('');

    console.log('  IE PROOF CHAIN:');
    console.log(`    Simulation Deterministic:     ${ie.proof_chain.simulation_deterministic ? '✓' : '✗'}`);
    console.log(`    All Paths Explored:           ${ie.proof_chain.all_paths_explored ? '✓' : '✗'}`);
    console.log(`    Inevitability Mathematical:   ${ie.proof_chain.inevitability_mathematical ? '✓' : '✗'}`);
    console.log(`    Gate Non-Bypassable:          ${ie.proof_chain.gate_non_bypassable ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override/Reset: ${ie.proof_chain.no_config ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  TESTS STOP BUGS. AEC STOPS DECAY. INEVITABILITY STOPS SELF-DESTRUCTION.');
    console.log('═'.repeat(80));
    console.log('  IF ALL FUTURES LEAD TO DEATH, BLOCK THE PRESENT.');
    console.log('═'.repeat(80) + '\n');
  }

  private createEntropyBar(entropy: number): string {
    const width = 40;
    const filled = Math.round(entropy * width);

    let bar = '  [';
    for (let i = 0; i < width; i++) {
      if (i < width * 0.25) {
        bar += i < filled ? '🟢' : '░';
      } else if (i < width * 0.5) {
        bar += i < filled ? '🟡' : '░';
      } else if (i < width * 0.75) {
        bar += i < filled ? '🟠' : '░';
      } else {
        bar += i < filled ? '🔴' : '░';
      }
    }
    bar += ']';
    return bar;
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
const runId = `IE-${Date.now()}`;
const runner = new IERunner(5); // 5 simulation steps
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

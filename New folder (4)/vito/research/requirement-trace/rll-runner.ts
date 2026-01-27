/**
 * RLL Runner (Reality Lock-In Layer)
 *
 * Executes the full RLL-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. ORIS enforcement (Invariants, Mortality, MRDs)
 * 3. OFEL forensics (Fingerprints, Counterfactuals, Inspection)
 * 4. OCIC intelligence (MCCS, Predictive Firewall, Compositions)
 * 5. RLL enforcement (Singularities, Lock Enforcement, Convergence)
 * 6. Decision-grade irreversible report generation
 *
 * This is the ENTRY POINT for RLL-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - Once Olympus proves the smallest valid reality,
 *   all other realities are invalid forever.
 * - Olympus does not negotiate with broken systems.
 * - Decisions are IRREVERSIBLE.
 * - No overrides, no flags, no retries, no configs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES, SHAPES_BY_KIND, INVARIANT_SHAPES } from './registry/shapes';
import {
  RLLEngine,
  type RLLExecutionResult,
  type RuntimeControlReport,
  type DecisionSingularity,
  type BlockedReality,
  type ConvergenceStatus,
  type LockEnforcementResult,
  type MinimalCausalCutSet,
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId, HandoffId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// RLL version - immutable
const RLL_VERSION = '1.0.0';

class RLLRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private rllEngine: RLLEngine;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.rllEngine = new RLLEngine(DATA_DIR);
  }

  /**
   * Execute full RLL-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS REALITY LOCK-IN LAYER (RLL)');
    console.log('  Mode: IRREVERSIBLE | Enforcement: DETERMINISTIC | Override: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/14] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/14] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute RLL engine (OCIC + RLL)
    console.log('\n[3/14] EXECUTING RLL ENFORCEMENT...');
    const rllResult = this.rllEngine.execute(traceResults, gateResult, runId);
    this.printEnforcementDecision(rllResult);

    // Step 4: Display active singularities
    console.log('\n[4/14] ACTIVE DECISION SINGULARITIES...');
    this.printActiveSingularities(rllResult.rllIntelligence);

    // Step 5: Display lock enforcement
    console.log('\n[5/14] LOCK ENFORCEMENT...');
    this.printLockEnforcement(rllResult.rllIntelligence.lock_enforcement);

    // Step 6: Display blocked realities
    console.log('\n[6/14] BLOCKED REALITIES...');
    this.printBlockedRealities(rllResult.rllIntelligence.blocked_realities);

    // Step 7: Display convergence status
    console.log('\n[7/14] CONVERGENCE STATUS...');
    this.printConvergenceStatus(rllResult.rllIntelligence.convergence_status);

    // Step 8: Display new singularity (if created)
    console.log('\n[8/14] NEW SINGULARITY...');
    this.printNewSingularity(rllResult.rllIntelligence.decision_singularity);

    // Step 9: Display MCCS (from OCIC)
    console.log('\n[9/14] MINIMAL CAUSAL CUT SETS...');
    this.printMCCS(rllResult.ocicResult.intelligence.minimal_causal_cuts);

    // Step 10: Display invariant violations
    console.log('\n[10/14] INVARIANT VALIDATION...');
    this.printInvariantViolations(rllResult.ocicResult.orisResult.invariant_violations);

    // Step 11: Display mortality analysis
    console.log('\n[11/14] MORTALITY ANALYSIS...');
    this.printMortalityAnalysis(rllResult.ocicResult.orisResult);

    // Step 12: Display RLL proof chain
    console.log('\n[12/14] RLL PROOF CHAIN...');
    this.printRLLProof(rllResult.rllIntelligence);

    // Step 13: Generate report
    console.log('\n[13/14] GENERATING RLL REPORT...');
    const report = this.rllEngine.generateReport(runId, traceResults, rllResult);
    this.writeReports(report, rllResult, runId);

    // Step 14: Final summary
    console.log('\n[14/14] FINAL DECISION...');
    this.printFinalSummary(report, rllResult);

    return report;
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

  private printEnforcementDecision(rllResult: RLLExecutionResult): void {
    const ocicDecision = rllResult.ocicResult.orisResult.enforcement;
    const rllIntelligence = rllResult.rllIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   RLL ENFORCEMENT DECISION                    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  OCIC Action:       ${this.padRight(ocicDecision.overall_action, 40)} │`);
    console.log(`  │  RLL Action:        ${this.padRight(rllIntelligence.lock_enforcement.action, 40)} │`);
    console.log(`  │  Execution Allowed: ${this.padRight(String(rllResult.executionAllowed), 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  RLL STATUS                                                   │');
    console.log(`  │  Active Singularities: ${this.padRight(String(rllIntelligence.summary.active_singularities), 36)} │`);
    console.log(`  │  Singularity Created:  ${this.padRight(String(rllIntelligence.summary.singularity_created), 36)} │`);
    console.log(`  │  Realities Blocked:    ${this.padRight(String(rllIntelligence.summary.realities_blocked), 36)} │`);
    console.log(`  │  Convergence Achieved: ${this.padRight(String(rllIntelligence.summary.convergence_achieved), 36)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Print RSR per shape
    console.log('\n  RSR PER SHAPE:');
    for (const result of ocicDecision.per_shape_rsr) {
      const shape = ALL_SHAPES.find(s => s.id === result.shape_id);
      const kind = shape?.kind || 'CAPABILITY';
      const met = result.rsr_met ? '✓' : '✗';
      const bar = this.createProgressBar(result.rsr, result.required_rsr);
      const kindBadge = kind === 'INVARIANT' ? '🔒' : '  ';
      console.log(`  ${met} ${kindBadge} [${result.criticality.substring(0, 3)}] ${result.shape_id}`);
      console.log(`       RSR: ${bar} ${(result.rsr * 100).toFixed(1)}% (req: ${(result.required_rsr * 100).toFixed(1)}%)`);
    }
  }

  private printActiveSingularities(rllIntelligence: any): void {
    const stats = this.rllEngine.getSingularityManager().getStats();

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │              ACTIVE DECISION SINGULARITIES                    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Singularities:          ${this.padRight(String(stats.total_singularities), 28)} │`);
    console.log(`  │  Locked Shapes:                ${this.padRight(String(stats.total_locked_shapes), 28)} │`);
    console.log(`  │  Forbidden Fingerprints:       ${this.padRight(String(stats.total_forbidden_fingerprints), 28)} │`);
    console.log(`  │  Allowed Realities:            ${this.padRight(String(stats.total_allowed_realities), 28)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (stats.total_singularities === 0) {
      console.log('\n  No singularities active. System is in initial state.');
    } else {
      console.log('\n  SINGULARITY ENFORCEMENT ACTIVE');
      console.log('  All future runs MUST comply with locked realities.');
    }
  }

  private printLockEnforcement(result: LockEnforcementResult): void {
    const actionEmoji = result.action === 'PROCEED' ? '✓' : '⛔';

    console.log(`  Lock Check: ${actionEmoji} ${result.action}`);
    console.log(`  Singularities Checked: ${result.active_singularities}`);
    console.log(`  Deviations Found: ${result.deviations.length}`);

    if (result.deviations.length > 0) {
      console.log('\n  ⛔ DEVIATIONS DETECTED:');
      for (const deviation of result.deviations) {
        console.log(`\n  Deviation: ${deviation.deviation_id}`);
        console.log(`     Type: ${deviation.deviation_type}`);
        console.log(`     Singularity: ${deviation.violated_singularity_id}`);
        console.log(`     Action: ${deviation.action_taken}`);
        console.log(`     Reason: ${deviation.abort_reason}`);
      }
    }

    if (result.abort_proof) {
      console.log('\n  ABORT PROOF:');
      console.log(`     Singularity: ${result.abort_proof.singularity_id}`);
      console.log(`     Deviation: ${result.abort_proof.deviation_id}`);
      console.log(`     Evidence: ${result.abort_proof.historical_evidence}`);
      console.log(`     Causal Link: ${result.abort_proof.causal_link ? '✓ ESTABLISHED' : '✗'}`);
    }
  }

  private printBlockedRealities(blockedRealities: BlockedReality[]): void {
    if (blockedRealities.length === 0) {
      console.log('  ✓ No realities blocked');
      console.log('  All execution paths are within allowed reality space.');
      return;
    }

    console.log(`  ⛔ BLOCKED REALITIES: ${blockedRealities.length}`);

    for (const blocked of blockedRealities) {
      console.log(`\n  ⛔ ${blocked.block_id}`);
      console.log(`     Handoff: ${blocked.blocked_handoff_id}`);
      console.log(`     Hash: ${blocked.blocked_transform_hash || 'N/A'}`);
      console.log(`     Reason: ${blocked.block_reason}`);
      console.log(`     Blocking Singularity: ${blocked.blocking_singularity_id}`);
      console.log('     Historical Reference:');
      console.log(`       Original Run: ${blocked.historical_reference.original_run_id || 'N/A'}`);
      console.log(`       Loss Class: ${blocked.historical_reference.original_loss_class || 'N/A'}`);
      console.log(`       Shapes Lost: ${blocked.historical_reference.original_shapes_lost.join(', ') || 'N/A'}`);
      console.log('     Proof:');
      console.log(`       Hash Match: ${blocked.proof.exact_hash_match ? '✓ EXACT' : '✗'}`);
      console.log(`       Causal Link: ${blocked.proof.causal_link_proven ? '✓' : '✗'}`);
      console.log(`       Deterministic: ${blocked.proof.deterministic ? '✓' : '✗'}`);
    }
  }

  private printConvergenceStatus(status: ConvergenceStatus): void {
    const convergedEmoji = status.converged ? '✓' : '→';
    const trendEmoji = status.trend === 'CONVERGING' ? '📈' :
                       status.trend === 'DIVERGING' ? '📉' : '↔️';

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   CONVERGENCE STATUS                          │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Converged:               ${this.padRight(status.converged ? '✓ YES' : '✗ NO', 33)} │`);
    console.log(`  │  Current RSR:             ${this.padRight((status.current_global_rsr * 100).toFixed(1) + '%', 33)} │`);
    console.log(`  │  Target RSR:              ${this.padRight((status.target_global_rsr * 100).toFixed(1) + '%', 33)} │`);
    console.log(`  │  RSR Gap:                 ${this.padRight((status.rsr_gap * 100).toFixed(1) + '%', 33)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Realities Evaluated:     ${this.padRight(String(status.total_realities_evaluated), 33)} │`);
    console.log(`  │  Allowed Realities:       ${this.padRight(String(status.allowed_realities_count), 33)} │`);
    console.log(`  │  Forbidden Fingerprints:  ${this.padRight(String(status.forbidden_fingerprints_count), 33)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Trend:                   ${this.padRight(trendEmoji + ' ' + status.trend, 33)} │`);
    console.log(`  │  Runs Since Singularity:  ${this.padRight(String(status.runs_since_last_singularity), 33)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (status.converged) {
      console.log('\n  🎯 CONVERGENCE ACHIEVED');
      console.log('  System has locked into minimal valid reality.');
      console.log(`  Convergence Run: ${status.convergence_run_id}`);
    } else if (status.trend === 'CONVERGING') {
      console.log('\n  📈 CONVERGING TOWARD MINIMAL REALITY');
      console.log('  Each run eliminates invalid execution paths.');
    } else if (status.trend === 'DIVERGING') {
      console.log('\n  📉 WARNING: DIVERGING FROM VALID REALITY');
      console.log('  Execution is attempting forbidden paths.');
    }
  }

  private printNewSingularity(singularity: DecisionSingularity | null): void {
    if (!singularity) {
      console.log('  No new singularity created this run.');
      return;
    }

    console.log('  🔒 NEW SINGULARITY CREATED');
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │            DECISION SINGULARITY (IMMUTABLE)                   │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  ID:              ${this.padRight(singularity.singularity_id, 41)} │`);
    console.log(`  │  Created:         ${this.padRight(singularity.created_at, 41)} │`);
    console.log(`  │  Run:             ${this.padRight(singularity.run_id, 41)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Lock Scope:      ${this.padRight(singularity.lock_scope, 41)} │`);
    console.log(`  │  Locked Shapes:   ${this.padRight(String(singularity.locked_shapes.length), 41)} │`);
    console.log(`  │  Locked Handoffs: ${this.padRight(String(singularity.locked_handoffs.length), 41)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  TRIGGER CONDITIONS                                          │');
    console.log(`  │  RSR at Trigger:  ${this.padRight((singularity.trigger.global_rsr_at_trigger * 100).toFixed(1) + '%', 41)} │`);
    console.log(`  │  Required RSR:    ${this.padRight((singularity.trigger.required_rsr * 100).toFixed(1) + '%', 41)} │`);
    console.log(`  │  RSR Deficit:     ${this.padRight((singularity.trigger.rsr_deficit * 100).toFixed(1) + '%', 41)} │`);
    console.log(`  │  Violations:      ${this.padRight(String(singularity.trigger.violations_count), 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Allowed realities
    if (singularity.allowed_realities.length > 0) {
      console.log('\n  ALLOWED REALITIES (PROVEN VIA MCCS):');
      for (const reality of singularity.allowed_realities.slice(0, 3)) {
        console.log(`    ✓ ${reality.reality_id}`);
        console.log(`      MCCS: ${reality.mccs_id}`);
        console.log(`      Interventions: ${reality.intervention_count}`);
        console.log(`      Projected RSR: ${(reality.projected_rsr * 100).toFixed(1)}%`);
      }
    }

    // Forbidden fingerprints
    if (singularity.forbidden_fingerprints.length > 0) {
      console.log('\n  FORBIDDEN FINGERPRINTS (HISTORICAL EVIDENCE):');
      for (const fp of singularity.forbidden_fingerprints.slice(0, 5)) {
        console.log(`    ⛔ ${fp.transform_hash.substring(0, 32)}...`);
        console.log(`       Reason: ${fp.reason}`);
        console.log(`       Shapes Lost: ${fp.historical_shapes_lost.join(', ')}`);
      }
    }

    console.log('\n  ⚠️  THIS SINGULARITY IS IMMUTABLE AND IRREVERSIBLE');
    console.log('  ⚠️  ALL FUTURE RUNS MUST COMPLY WITH THIS LOCK');
  }

  private printMCCS(mccsResults: MinimalCausalCutSet[]): void {
    console.log(`  MCCS computed: ${mccsResults.length}`);

    if (mccsResults.length === 0) {
      console.log('  No minimal causal cut sets found');
      return;
    }

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │              MINIMAL CAUSAL CUT SETS (RANKED)                 │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const mccs of mccsResults.slice(0, 3)) {
      const rankEmoji = mccs.rank === 1 ? '🥇' : mccs.rank === 2 ? '🥈' : mccs.rank === 3 ? '🥉' : '  ';

      console.log(`\n  ${rankEmoji} Rank #${mccs.rank}: ${mccs.mccs_id}`);
      console.log(`     Interventions: ${mccs.intervention_count}`);
      console.log(`     RSR Gain: +${(mccs.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      console.log(`     Compliance: ${mccs.projected_outcome.all_tiers_compliant ? '✓ ALL TIERS' : '✗ PARTIAL'}`);
      console.log(`     Invariants: ${mccs.projected_outcome.invariants_preserved ? '✓ PRESERVED' : '✗ VIOLATED'}`);
      console.log(`     Proof: ${mccs.proof.verified_via_replay ? '✓ REPLAY VERIFIED' : '✗'}`);
    }
  }

  private printInvariantViolations(violations: any[]): void {
    console.log(`  Total INVARIANT violations: ${violations.length}`);

    if (violations.length === 0) {
      console.log('  ✓ All INVARIANT shapes preserved');
      return;
    }

    for (const v of violations) {
      console.log(`\n  🔒 FATAL: ${v.shape_id} at ${v.handoff_id}`);
      console.log(`     Type: ${v.violation_type}`);
      console.log(`     Expected: ${v.expected}`);
      console.log(`     Actual: ${v.actual}`);
    }
  }

  private printMortalityAnalysis(orisResult: any): void {
    const mortality = orisResult.mortality_analysis;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   MORTALITY STATUS                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  HEALTHY:             ${this.padRight(String(mortality.healthy_count) + ' shapes', 38)} │`);
    console.log(`  │  FLAKY:               ${this.padRight(String(mortality.flaky_count) + ' shapes', 38)} │`);
    console.log(`  │  DEGRADING:           ${this.padRight(String(mortality.degrading_count) + ' shapes', 38)} │`);
    console.log(`  │  SYSTEMICALLY_BROKEN: ${this.padRight(String(mortality.broken_count) + ' shapes', 38)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printRLLProof(rllIntelligence: any): void {
    const proof = rllIntelligence.proof;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   RLL PROOF CHAIN                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Singularities Immutable:      ${this.padRight(proof.singularities_immutable ? '✓' : '✗', 27)} │`);
    console.log(`  │  Enforcement Deterministic:    ${this.padRight(proof.enforcement_deterministic ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Override Possible:         ${this.padRight(proof.no_override_possible ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Config Possible:           ${this.padRight(proof.no_config_possible ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Flag Possible:             ${this.padRight(proof.no_flag_possible ? '✓' : '✗', 27)} │`);
    console.log(`  │  Decisions Irreversible:       ${this.padRight(proof.decisions_irreversible ? '✓' : '✗', 27)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private writeReports(report: any, rllResult: RLLExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'rll-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      ...report,
      rll: rllResult.rllIntelligence
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'rll-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report, rllResult));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: any, rllResult: RLLExecutionResult): string {
    const lines: string[] = [];
    const rll = rllResult.rllIntelligence;

    lines.push('# RLL Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Reality Lock-In Layer');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Execution Allowed:** ${rllResult.executionAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    if (rllResult.abortReason) {
      lines.push(`**Abort Reason:** ${rllResult.abortReason}`);
      lines.push('');
    }

    lines.push('## Metadata');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Generated | ${report.metadata.generated_at} |`);
    lines.push(`| Run ID | ${report.metadata.run_id} |`);
    lines.push(`| RLL Version | ${RLL_VERSION} |`);
    lines.push('');

    // Singularity Section
    lines.push('## Decision Singularities');
    lines.push('');
    lines.push(`**Active Singularities:** ${rll.summary.active_singularities}`);
    lines.push('');
    lines.push(`**Singularity Created This Run:** ${rll.summary.singularity_created ? '✓ YES' : 'NO'}`);
    lines.push('');

    if (rll.decision_singularity) {
      lines.push('### New Singularity');
      lines.push('');
      lines.push('> ⚠️ This singularity is **IMMUTABLE** and **IRREVERSIBLE**');
      lines.push('');
      lines.push(`- **ID:** ${rll.decision_singularity.singularity_id}`);
      lines.push(`- **Scope:** ${rll.decision_singularity.lock_scope}`);
      lines.push(`- **Locked Shapes:** ${rll.decision_singularity.locked_shapes.length}`);
      lines.push(`- **Forbidden Fingerprints:** ${rll.decision_singularity.forbidden_fingerprints.length}`);
      lines.push(`- **Allowed Realities:** ${rll.decision_singularity.allowed_realities.length}`);
      lines.push('');
    }

    // Blocked Realities
    if (rll.blocked_realities.length > 0) {
      lines.push('## Blocked Realities');
      lines.push('');
      lines.push('| Block ID | Reason | Singularity |');
      lines.push('|----------|--------|-------------|');
      for (const blocked of rll.blocked_realities) {
        lines.push(`| ${blocked.block_id} | ${blocked.block_reason} | ${blocked.blocking_singularity_id} |`);
      }
      lines.push('');
    }

    // Convergence
    lines.push('## Convergence Status');
    lines.push('');
    lines.push(`**Converged:** ${rll.convergence_status.converged ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**Trend:** ${rll.convergence_status.trend}`);
    lines.push('');
    lines.push(`**RSR Gap:** ${(rll.convergence_status.rsr_gap * 100).toFixed(1)}%`);
    lines.push('');

    // Lock Enforcement
    lines.push('## Lock Enforcement');
    lines.push('');
    lines.push(`**Action:** \`${rll.lock_enforcement.action}\``);
    lines.push('');
    lines.push(`**Singularities Checked:** ${rll.lock_enforcement.active_singularities}`);
    lines.push('');
    lines.push(`**Deviations Found:** ${rll.lock_enforcement.deviations.length}`);
    lines.push('');

    // RLL Proof
    lines.push('## RLL Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Singularities Immutable | ${rll.proof.singularities_immutable ? '✓' : '✗'} |`);
    lines.push(`| Enforcement Deterministic | ${rll.proof.enforcement_deterministic ? '✓' : '✗'} |`);
    lines.push(`| No Override Possible | ${rll.proof.no_override_possible ? '✓' : '✗'} |`);
    lines.push(`| No Config Possible | ${rll.proof.no_config_possible ? '✓' : '✗'} |`);
    lines.push(`| No Flag Possible | ${rll.proof.no_flag_possible ? '✓' : '✗'} |`);
    lines.push(`| Decisions Irreversible | ${rll.proof.decisions_irreversible ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Reality Lock-In Layer (RLL) v1.0.0*');
    lines.push('');
    lines.push('**ONCE OLYMPUS PROVES THE SMALLEST VALID REALITY,**');
    lines.push('**ALL OTHER REALITIES ARE INVALID FOREVER.**');
    lines.push('');
    lines.push('**OLYMPUS DOES NOT NEGOTIATE WITH BROKEN SYSTEMS.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: any, rllResult: RLLExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  RLL FINAL DECISION');
    console.log('═'.repeat(80));

    const rll = rllResult.rllIntelligence;

    let emoji: string;
    let status: string;

    if (rll.lock_enforcement.action === 'HARD_ABORT') {
      emoji = '⛔🔒';
      status = 'HARD_ABORT - Reality deviation detected';
    } else if (!rllResult.executionAllowed) {
      emoji = '🛑';
      status = 'EXECUTION BLOCKED - RSR violation';
    } else if (rll.convergence_status.converged) {
      emoji = '✅🎯';
      status = 'EXECUTION ALLOWED - Converged to minimal reality';
    } else if (rll.summary.singularity_created) {
      emoji = '🔒📍';
      status = 'EXECUTION BLOCKED - Singularity created and locked';
    } else {
      emoji = '⚠️';
      status = 'EXECUTION ALLOWED - Converging...';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    if (rllResult.abortReason) {
      console.log('  ABORT REASON:');
      console.log(`    ${rllResult.abortReason}`);
      console.log('');
    }

    console.log('  DECISION METRICS:');
    console.log(`    Global RSR: ${(report.rsr_analysis?.global_rsr * 100 || 0).toFixed(1)}%`);
    console.log(`    Active Singularities: ${rll.summary.active_singularities}`);
    console.log(`    Singularity Created: ${rll.summary.singularity_created ? 'YES' : 'NO'}`);
    console.log(`    Realities Blocked: ${rll.summary.realities_blocked}`);
    console.log(`    Convergence: ${rll.convergence_status.converged ? '✓ ACHIEVED' : '→ IN PROGRESS'}`);
    console.log('');

    console.log('  RLL PROOF CHAIN:');
    console.log(`    Singularities Immutable:    ${rll.proof.singularities_immutable ? '✓' : '✗'}`);
    console.log(`    Enforcement Deterministic:  ${rll.proof.enforcement_deterministic ? '✓' : '✗'}`);
    console.log(`    No Override Possible:       ${rll.proof.no_override_possible ? '✓' : '✗'}`);
    console.log(`    No Config Possible:         ${rll.proof.no_config_possible ? '✓' : '✗'}`);
    console.log(`    No Flag Possible:           ${rll.proof.no_flag_possible ? '✓' : '✗'}`);
    console.log(`    Decisions Irreversible:     ${rll.proof.decisions_irreversible ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  ONCE OLYMPUS PROVES THE SMALLEST VALID REALITY,');
    console.log('  ALL OTHER REALITIES ARE INVALID FOREVER.');
    console.log('═'.repeat(80));
    console.log('  OLYMPUS DOES NOT NEGOTIATE WITH BROKEN SYSTEMS.');
    console.log('═'.repeat(80) + '\n');
  }

  private createProgressBar(value: number, threshold: number): string {
    const width = 20;
    const safeValue = Math.max(0, Math.min(1, value));
    const filled = Math.round(safeValue * width);
    const thresholdPos = Math.round(Math.min(1, threshold) * width);

    let bar = '';
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        bar += safeValue >= threshold ? '█' : '▓';
      } else if (i === thresholdPos) {
        bar += '│';
      } else {
        bar += '░';
      }
    }
    return `[${bar}]`;
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
const runId = `RLL-${Date.now()}`;
const runner = new RLLRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

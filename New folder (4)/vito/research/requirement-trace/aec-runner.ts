/**
 * AEC Runner (Architectural Entropy Control)
 *
 * Executes the full AEC-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. ORIS enforcement (Invariants, Mortality, MRDs)
 * 3. OFEL forensics (Fingerprints, Counterfactuals, Inspection)
 * 4. OCIC intelligence (MCCS, Predictive Firewall, Compositions)
 * 5. RLL enforcement (Singularities, Lock Enforcement, Convergence)
 * 6. AEC control (Entropy, Phase Classification, Entropy Gate)
 * 7. Long-term architectural health report generation
 *
 * This is the ENTRY POINT for AEC-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - Bugs are local. Entropy is existential.
 * - Olympus must protect the future, not just the present.
 * - No configs, flags, overrides, or resets.
 *
 * PHILOSOPHY:
 * Once entropy crosses the threshold,
 * the architecture is in terminal decay.
 * There is no recovery. Only prevention.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES, SHAPES_BY_KIND, INVARIANT_SHAPES } from './registry/shapes';
import {
  AECEngine,
  type AECExecutionResult,
  type RuntimeControlReport,
  type ArchitecturalEntropyScore,
  type ArchitecturalPhase,
  type EntropyGateResult,
  type AECIntelligence,
  ENTROPY_PHASE_THRESHOLDS,
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId, HandoffId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// AEC version - immutable
const AEC_VERSION = '1.0.0';

class AECRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private aecEngine: AECEngine;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.aecEngine = new AECEngine(DATA_DIR);
  }

  /**
   * Execute full AEC-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS ARCHITECTURAL ENTROPY CONTROL (AEC)');
    console.log('  Mode: ENTROPY_AWARE | Phase: ENFORCED | Reset: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/16] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/16] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute AEC engine (RLL + OCIC + ORIS + AEC)
    console.log('\n[3/16] EXECUTING AEC ENFORCEMENT...');
    const aecResult = this.aecEngine.execute(traceResults, gateResult, runId);
    this.printEnforcementDecision(aecResult);

    // Step 4: Display entropy score
    console.log('\n[4/16] ENTROPY MEASUREMENT...');
    this.printEntropyScore(aecResult.aecIntelligence.entropy_score);

    // Step 5: Display phase classification
    console.log('\n[5/16] PHASE CLASSIFICATION...');
    this.printPhaseClassification(aecResult.aecIntelligence);

    // Step 6: Display entropy gate enforcement
    console.log('\n[6/16] ENTROPY GATE ENFORCEMENT...');
    this.printEntropyGate(aecResult.aecIntelligence.gate_result);

    // Step 7: Display entropy trend
    console.log('\n[7/16] ENTROPY TREND...');
    this.printEntropyTrend(aecResult.aecIntelligence);

    // Step 8: Display historical statistics
    console.log('\n[8/16] HISTORICAL STATISTICS...');
    this.printHistoricalStats();

    // Step 9: Display RLL summary
    console.log('\n[9/16] REALITY LOCK-IN SUMMARY...');
    this.printRLLSummary(aecResult.rllResult);

    // Step 10: Display MCCS summary
    console.log('\n[10/16] MCCS SUMMARY...');
    this.printMCCSSummary(aecResult.rllResult);

    // Step 11: Display mortality analysis
    console.log('\n[11/16] MORTALITY ANALYSIS...');
    this.printMortalityAnalysis(aecResult.rllResult.ocicResult.orisResult);

    // Step 12: Display convergence status
    console.log('\n[12/16] CONVERGENCE STATUS...');
    this.printConvergenceStatus(aecResult.rllResult);

    // Step 13: Display AEC proof chain
    console.log('\n[13/16] AEC PROOF CHAIN...');
    this.printAECProof(aecResult.aecIntelligence);

    // Step 14: Display trend graph data
    console.log('\n[14/16] TREND GRAPH DATA...');
    this.printTrendGraphData();

    // Step 15: Generate report
    console.log('\n[15/16] GENERATING AEC REPORT...');
    const report = this.aecEngine.generateReport(runId, traceResults, aecResult);
    this.writeReports(report, aecResult, runId);

    // Step 16: Final summary
    console.log('\n[16/16] FINAL DECISION...');
    this.printFinalSummary(report, aecResult);

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

  private printEnforcementDecision(aecResult: AECExecutionResult): void {
    const aec = aecResult.aecIntelligence;
    const rll = aecResult.rllResult.rllIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   AEC ENFORCEMENT DECISION                    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Entropy:           ${this.padRight((aec.entropy_score.entropy * 100).toFixed(1) + '%', 40)} │`);
    console.log(`  │  Phase:             ${this.padRight(aec.phase, 40)} │`);
    console.log(`  │  Gate Action:       ${this.padRight(aec.gate_result.action, 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Execution Allowed: ${this.padRight(String(aecResult.executionAllowed), 40)} │`);
    console.log(`  │  Mutations Allowed: ${this.padRight(String(aecResult.mutationsAllowed), 40)} │`);
    console.log(`  │  System Healthy:    ${this.padRight(String(aec.summary.system_healthy), 40)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printEntropyScore(score: ArchitecturalEntropyScore): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ENTROPY MEASUREMENT                         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  COMPOSITE ENTROPY: ${this.padRight((score.entropy * 100).toFixed(1) + '%', 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  COMPONENT BREAKDOWN:                                         │');
    console.log(`  │    RSR Trend (w=0.35):         ${this.padRight((score.components.rsr_trend_score * 100).toFixed(1) + '%', 28)} │`);
    console.log(`  │    Mortality Velocity (w=0.25): ${this.padRight((score.components.mortality_velocity_score * 100).toFixed(1) + '%', 27)} │`);
    console.log(`  │    Singularity Density (w=0.20): ${this.padRight((score.components.singularity_density_score * 100).toFixed(1) + '%', 26)} │`);
    console.log(`  │    MCCS Size (w=0.20):         ${this.padRight((score.components.mccs_size_score * 100).toFixed(1) + '%', 28)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n  ENTROPY BAR:');
    const bar = this.createEntropyBar(score.entropy);
    console.log(`  ${bar}`);
    console.log('  └─────┴─────┴─────┴─────┘');
    console.log('  0    25    50    75   100');
    console.log('  STABLE DECAY COLLAPSE DEAD');
  }

  private printPhaseClassification(aec: AECIntelligence): void {
    const phaseEmoji = {
      STABLE: '🟢',
      DECAYING: '🟡',
      COLLAPSING: '🟠',
      DEAD: '🔴'
    };

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   PHASE CLASSIFICATION                        │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Current Phase: ${this.padRight(phaseEmoji[aec.phase] + ' ' + aec.phase, 43)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  THRESHOLDS (FIXED CONSTANTS):                                │');
    console.log(`  │    STABLE:     entropy <= ${this.padRight((ENTROPY_PHASE_THRESHOLDS.STABLE_MAX * 100).toFixed(0) + '%', 33)} │`);
    console.log(`  │    DECAYING:   entropy <= ${this.padRight((ENTROPY_PHASE_THRESHOLDS.DECAYING_MAX * 100).toFixed(0) + '%', 33)} │`);
    console.log(`  │    COLLAPSING: entropy <= ${this.padRight((ENTROPY_PHASE_THRESHOLDS.COLLAPSING_MAX * 100).toFixed(0) + '%', 33)} │`);
    console.log(`  │    DEAD:       entropy >  ${this.padRight((ENTROPY_PHASE_THRESHOLDS.DEAD_MIN * 100).toFixed(0) + '%', 33)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Phase description
    const descriptions = {
      STABLE: 'Architecture is healthy. Normal operations allowed.',
      DECAYING: 'Entropy rising. MCCS intervention mandatory to continue.',
      COLLAPSING: 'Critical entropy. READ_ONLY mode enforced. No mutations.',
      DEAD: 'Terminal entropy. PERMANENT HALT. No recovery possible.'
    };

    console.log(`\n  ${phaseEmoji[aec.phase]} ${descriptions[aec.phase]}`);
  }

  private printEntropyGate(gate: EntropyGateResult): void {
    const actionEmoji = {
      CONTINUE: '✅',
      MCCS_MANDATORY: '⚠️',
      READ_ONLY: '🔒',
      PERMANENT_HALT: '💀'
    };

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ENTROPY GATE ENFORCEMENT                    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Gate Action: ${this.padRight(actionEmoji[gate.action] + ' ' + gate.action, 45)} │`);
    console.log(`  │  Execution Allowed: ${this.padRight(gate.execution_allowed ? '✓ YES' : '✗ NO', 39)} │`);
    console.log(`  │  Mutations Allowed: ${this.padRight(gate.mutations_allowed ? '✓ YES' : '✗ NO', 39)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (gate.enforcement_reason) {
      console.log('\n  ENFORCEMENT REASON:');
      const words = gate.enforcement_reason.split(' ');
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
    }

    console.log('\n  GATE PROOF:');
    console.log(`    Thresholds Immutable:    ${gate.gate_proof.thresholds_immutable ? '✓' : '✗'}`);
    console.log(`    Phase Deterministic:     ${gate.gate_proof.phase_deterministic ? '✓' : '✗'}`);
    console.log(`    Action Non-Bypassable:   ${gate.gate_proof.action_non_bypassable ? '✓' : '✗'}`);
    console.log(`    No Config:               ${gate.gate_proof.no_config ? '✓' : '✗'}`);
    console.log(`    No Flag:                 ${gate.gate_proof.no_flag ? '✓' : '✗'}`);
    console.log(`    No Override:             ${gate.gate_proof.no_override ? '✓' : '✗'}`);
  }

  private printEntropyTrend(aec: AECIntelligence): void {
    const trendEmoji = {
      IMPROVING: '📈',
      STABLE: '↔️',
      WORSENING: '📉'
    };

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   ENTROPY TREND                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Trend:         ${this.padRight(trendEmoji[aec.trend.entropy_trend] + ' ' + aec.trend.entropy_trend, 43)} │`);
    console.log(`  │  Runs Analyzed: ${this.padRight(String(aec.trend.runs_analyzed), 43)} │`);
    console.log(`  │  Entropy Delta: ${this.padRight((aec.trend.entropy_delta * 100).toFixed(2) + '%', 43)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Phase history
    if (aec.phase_history.length > 0) {
      console.log('\n  PHASE HISTORY:');
      const recentPhases = aec.phase_history.slice(-10);
      let historyLine = '    ';
      for (let i = 0; i < recentPhases.length; i++) {
        const phase = recentPhases[i];
        const phaseChar = phase === 'STABLE' ? '🟢' :
                          phase === 'DECAYING' ? '🟡' :
                          phase === 'COLLAPSING' ? '🟠' : '🔴';
        historyLine += phaseChar + ' ';
      }
      console.log(historyLine);
    }
  }

  private printHistoricalStats(): void {
    const stats = this.aecEngine.getStats();

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   HISTORICAL STATISTICS                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Runs:       ${this.padRight(String(stats.total_runs), 40)} │`);
    console.log(`  │  Current Phase:    ${this.padRight(stats.current_phase, 40)} │`);
    console.log(`  │  Highest Entropy:  ${this.padRight((stats.highest_entropy * 100).toFixed(1) + '%', 40)} │`);
    console.log(`  │  Lowest Entropy:   ${this.padRight((stats.lowest_entropy * 100).toFixed(1) + '%', 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  RUNS PER PHASE:                                              │');
    console.log(`  │    STABLE:     ${this.padRight(String(stats.runs_in_stable), 45)} │`);
    console.log(`  │    DECAYING:   ${this.padRight(String(stats.runs_in_decaying), 45)} │`);
    console.log(`  │    COLLAPSING: ${this.padRight(String(stats.runs_in_collapsing), 45)} │`);
    console.log(`  │    DEAD:       ${this.padRight(String(stats.runs_in_dead), 45)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printRLLSummary(rllResult: any): void {
    const rll = rllResult.rllIntelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   RLL SUMMARY                                 │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Active Singularities: ${this.padRight(String(rll.summary.active_singularities), 36)} │`);
    console.log(`  │  Singularity Created:  ${this.padRight(String(rll.summary.singularity_created), 36)} │`);
    console.log(`  │  Realities Blocked:    ${this.padRight(String(rll.summary.realities_blocked), 36)} │`);
    console.log(`  │  RLL Action:           ${this.padRight(rll.lock_enforcement.action, 36)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printMCCSSummary(rllResult: any): void {
    const ocic = rllResult.ocicResult.intelligence;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   MCCS SUMMARY                                │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  MCCS Computed:            ${this.padRight(String(ocic.intelligence_summary.mccs_computed), 32)} │`);
    console.log(`  │  Best MCCS Interventions:  ${this.padRight(String(ocic.intelligence_summary.best_mccs_intervention_count), 32)} │`);
    console.log(`  │  Best MCCS RSR Gain:       ${this.padRight((ocic.intelligence_summary.best_mccs_rsr_gain * 100).toFixed(1) + '%', 32)} │`);
    console.log(`  │  Causal Certainty:         ${this.padRight(ocic.intelligence_summary.causal_certainty_achieved ? '✓ YES' : '✗ NO', 32)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
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

  private printConvergenceStatus(rllResult: any): void {
    const convergence = rllResult.rllIntelligence.convergence_status;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   CONVERGENCE STATUS                          │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Converged:     ${this.padRight(convergence.converged ? '✓ YES' : '✗ NO', 44)} │`);
    console.log(`  │  Current RSR:   ${this.padRight((convergence.current_global_rsr * 100).toFixed(1) + '%', 44)} │`);
    console.log(`  │  Target RSR:    ${this.padRight((convergence.target_global_rsr * 100).toFixed(1) + '%', 44)} │`);
    console.log(`  │  RSR Gap:       ${this.padRight((convergence.rsr_gap * 100).toFixed(1) + '%', 44)} │`);
    console.log(`  │  Trend:         ${this.padRight(convergence.trend, 44)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printAECProof(aec: AECIntelligence): void {
    const proof = aec.proof;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   AEC PROOF CHAIN                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Entropy Deterministic:        ${this.padRight(proof.entropy_deterministic ? '✓' : '✗', 27)} │`);
    console.log(`  │  Phase From Fixed Thresholds:  ${this.padRight(proof.phase_from_fixed_thresholds ? '✓' : '✗', 27)} │`);
    console.log(`  │  Gate Non-Bypassable:          ${this.padRight(proof.gate_non_bypassable ? '✓' : '✗', 27)} │`);
    console.log(`  │  History Append-Only:          ${this.padRight(proof.history_append_only ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Config:                    ${this.padRight(proof.no_config ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Flag:                      ${this.padRight(proof.no_flag ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Override:                  ${this.padRight(proof.no_override ? '✓' : '✗', 27)} │`);
    console.log(`  │  No Reset:                     ${this.padRight(proof.no_reset ? '✓' : '✗', 27)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printTrendGraphData(): void {
    const trend = this.aecEngine.getTrendData();

    console.log('  TREND DATA (RAW VALUES):');
    console.log(`  Total data points: ${trend.entropy_values.length}`);

    if (trend.entropy_values.length > 0) {
      console.log('\n  ENTROPY VALUES:');
      const recentEntropy = trend.entropy_values.slice(-10);
      console.log(`    [${recentEntropy.map(v => (v * 100).toFixed(1) + '%').join(', ')}]`);

      console.log('\n  RSR VALUES:');
      const recentRSR = trend.rsr_values.slice(-10);
      console.log(`    [${recentRSR.map(v => (v * 100).toFixed(1) + '%').join(', ')}]`);

      console.log('\n  MORTALITY VALUES:');
      const recentMortality = trend.mortality_values.slice(-10);
      console.log(`    [${recentMortality.join(', ')}]`);
    }
  }

  private writeReports(report: any, aecResult: AECExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'aec-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      ...report,
      aec: aecResult.aecIntelligence
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'aec-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report, aecResult));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: any, aecResult: AECExecutionResult): string {
    const lines: string[] = [];
    const aec = aecResult.aecIntelligence;

    lines.push('# AEC Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Architectural Entropy Control');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`**Entropy:** ${(aec.entropy_score.entropy * 100).toFixed(1)}%`);
    lines.push('');
    lines.push(`**Phase:** ${aec.phase}`);
    lines.push('');
    lines.push(`**Execution Allowed:** ${aecResult.executionAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**Mutations Allowed:** ${aecResult.mutationsAllowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    if (aecResult.abortReason) {
      lines.push(`**Abort Reason:** ${aecResult.abortReason}`);
      lines.push('');
    }

    lines.push('## Entropy Analysis');
    lines.push('');
    lines.push('### Composite Score');
    lines.push('');
    lines.push(`**Entropy:** ${(aec.entropy_score.entropy * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('### Components');
    lines.push('');
    lines.push('| Component | Weight | Score |');
    lines.push('|-----------|--------|-------|');
    lines.push(`| RSR Trend | 0.35 | ${(aec.entropy_score.components.rsr_trend_score * 100).toFixed(1)}% |`);
    lines.push(`| Mortality Velocity | 0.25 | ${(aec.entropy_score.components.mortality_velocity_score * 100).toFixed(1)}% |`);
    lines.push(`| Singularity Density | 0.20 | ${(aec.entropy_score.components.singularity_density_score * 100).toFixed(1)}% |`);
    lines.push(`| MCCS Size | 0.20 | ${(aec.entropy_score.components.mccs_size_score * 100).toFixed(1)}% |`);
    lines.push('');

    lines.push('## Phase Classification');
    lines.push('');
    lines.push(`**Current Phase:** ${aec.phase}`);
    lines.push('');
    lines.push('| Phase | Threshold | Action |');
    lines.push('|-------|-----------|--------|');
    lines.push('| STABLE | ≤ 25% | CONTINUE |');
    lines.push('| DECAYING | ≤ 50% | MCCS_MANDATORY |');
    lines.push('| COLLAPSING | ≤ 75% | READ_ONLY |');
    lines.push('| DEAD | > 75% | PERMANENT_HALT |');
    lines.push('');

    lines.push('## Gate Enforcement');
    lines.push('');
    lines.push(`**Action:** \`${aec.gate_result.action}\``);
    lines.push('');
    if (aec.gate_result.enforcement_reason) {
      lines.push(`**Reason:** ${aec.gate_result.enforcement_reason}`);
      lines.push('');
    }

    lines.push('## Trend Analysis');
    lines.push('');
    lines.push(`**Trend:** ${aec.trend.entropy_trend}`);
    lines.push('');
    lines.push(`**Runs Analyzed:** ${aec.trend.runs_analyzed}`);
    lines.push('');
    lines.push(`**Entropy Delta:** ${(aec.trend.entropy_delta * 100).toFixed(2)}%`);
    lines.push('');

    lines.push('## AEC Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Entropy Deterministic | ${aec.proof.entropy_deterministic ? '✓' : '✗'} |`);
    lines.push(`| Phase From Fixed Thresholds | ${aec.proof.phase_from_fixed_thresholds ? '✓' : '✗'} |`);
    lines.push(`| Gate Non-Bypassable | ${aec.proof.gate_non_bypassable ? '✓' : '✗'} |`);
    lines.push(`| History Append-Only | ${aec.proof.history_append_only ? '✓' : '✗'} |`);
    lines.push(`| No Config | ${aec.proof.no_config ? '✓' : '✗'} |`);
    lines.push(`| No Flag | ${aec.proof.no_flag ? '✓' : '✗'} |`);
    lines.push(`| No Override | ${aec.proof.no_override ? '✓' : '✗'} |`);
    lines.push(`| No Reset | ${aec.proof.no_reset ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Architectural Entropy Control (AEC) v1.0.0*');
    lines.push('');
    lines.push('**BUGS ARE LOCAL. ENTROPY IS EXISTENTIAL.**');
    lines.push('');
    lines.push('**OLYMPUS MUST PROTECT THE FUTURE, NOT JUST THE PRESENT.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: any, aecResult: AECExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  AEC FINAL DECISION');
    console.log('═'.repeat(80));

    const aec = aecResult.aecIntelligence;

    let emoji: string;
    let status: string;

    if (aec.gate_result.action === 'PERMANENT_HALT') {
      emoji = '💀';
      status = 'PERMANENT_HALT - System is DEAD';
    } else if (aec.gate_result.action === 'READ_ONLY') {
      emoji = '🔒📖';
      status = 'READ_ONLY - System is COLLAPSING';
    } else if (aec.gate_result.action === 'MCCS_MANDATORY') {
      emoji = '⚠️🔧';
      status = 'MCCS_MANDATORY - System is DECAYING';
    } else if (!aecResult.executionAllowed) {
      emoji = '🛑';
      status = 'EXECUTION BLOCKED - Upstream violation';
    } else if (aec.summary.system_healthy) {
      emoji = '✅🟢';
      status = 'SYSTEM HEALTHY - Architecture is STABLE';
    } else {
      emoji = '⚠️';
      status = 'EXECUTION ALLOWED - Monitor entropy';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    if (aecResult.abortReason) {
      console.log('  ABORT REASON:');
      console.log(`    ${aecResult.abortReason}`);
      console.log('');
    }

    console.log('  ENTROPY METRICS:');
    console.log(`    Entropy Score:       ${(aec.entropy_score.entropy * 100).toFixed(1)}%`);
    console.log(`    Phase:               ${aec.phase}`);
    console.log(`    Trend:               ${aec.trend.entropy_trend}`);
    console.log(`    Execution Allowed:   ${aecResult.executionAllowed ? '✓' : '✗'}`);
    console.log(`    Mutations Allowed:   ${aecResult.mutationsAllowed ? '✓' : '✗'}`);
    console.log('');

    console.log('  AEC PROOF CHAIN:');
    console.log(`    Entropy Deterministic:        ${aec.proof.entropy_deterministic ? '✓' : '✗'}`);
    console.log(`    Phase From Fixed Thresholds:  ${aec.proof.phase_from_fixed_thresholds ? '✓' : '✗'}`);
    console.log(`    Gate Non-Bypassable:          ${aec.proof.gate_non_bypassable ? '✓' : '✗'}`);
    console.log(`    History Append-Only:          ${aec.proof.history_append_only ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override/Reset: ${aec.proof.no_config ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  BUGS ARE LOCAL. ENTROPY IS EXISTENTIAL.');
    console.log('═'.repeat(80));
    console.log('  OLYMPUS MUST PROTECT THE FUTURE, NOT JUST THE PRESENT.');
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
const runId = `AEC-${Date.now()}`;
const runner = new AECRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

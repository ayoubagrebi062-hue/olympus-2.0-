/**
 * OCIC Runner (OLYMPUS Causal Intelligence Core)
 *
 * Executes the full OCIC-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. ORIS enforcement (Invariants, Mortality, MRDs)
 * 3. OFEL forensics (Fingerprints, Counterfactuals, Inspection)
 * 4. OCIC intelligence (MCCS, Predictive Firewall, Compositions)
 * 5. Decision-grade causal report generation
 *
 * This is the ENTRY POINT for OCIC-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - Olympus DECIDES, not suggests
 * - No heuristics, no ML, no probability
 * - Causal certainty over execution ease
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES, SHAPES_BY_KIND, INVARIANT_SHAPES } from './registry/shapes';
import {
  OCICEngine,
  type OCICExecutionResult,
  type RuntimeControlReport,
  type MinimalCausalCutSet,
  type PredictiveBlock,
  type CounterfactualComposition,
  type CausalIntervention,
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId, HandoffId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// OCIC version - immutable
const OCIC_VERSION = '1.0.0';

class OCICRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private ocicEngine: OCICEngine;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.ocicEngine = new OCICEngine(DATA_DIR);
  }

  /**
   * Execute full OCIC-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS CAUSAL INTELLIGENCE CORE (OCIC)');
    console.log('  Mode: DECISION_GRADE | Certainty: CAUSAL | Suggestions: NONE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/12] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/12] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute OCIC engine (ORIS + OFEL + OCIC)
    console.log('\n[3/12] EXECUTING OCIC INTELLIGENCE...');
    const ocicResult = this.ocicEngine.execute(traceResults, gateResult, runId);
    this.printEnforcementDecision(ocicResult);

    // Step 4: Display invariant violations
    console.log('\n[4/12] INVARIANT VALIDATION...');
    this.printInvariantViolations(ocicResult.orisResult.invariant_violations);

    // Step 5: Display mortality analysis
    console.log('\n[5/12] MORTALITY ANALYSIS...');
    this.printMortalityAnalysis(ocicResult.orisResult);

    // Step 6: Display predictive firewall results
    console.log('\n[6/12] PREDICTIVE FINGERPRINT FIREWALL...');
    this.printPredictiveBlocks(ocicResult.preExecutionBlocks);

    // Step 7: Display counterfactual compositions
    console.log('\n[7/12] COUNTERFACTUAL COMPOSITIONS...');
    this.printCompositions(ocicResult.intelligence.counterfactual_compositions);

    // Step 8: Display minimal causal cut sets
    console.log('\n[8/12] MINIMAL CAUSAL CUT SETS...');
    this.printMCCS(ocicResult.intelligence.minimal_causal_cuts);

    // Step 9: Display MRDs with MCCS attachments
    console.log('\n[9/12] REPAIR DIRECTIVES WITH CAUSAL PROOF...');
    this.printRepairDirectivesWithCausalProof(
      ocicResult.orisResult.repair_directives,
      ocicResult.intelligence.minimal_causal_cuts
    );

    // Step 10: Display forensic summary
    console.log('\n[10/12] FORENSIC SUMMARY...');
    if (ocicResult.orisResult.forensics) {
      this.printForensicSummary(ocicResult.orisResult.forensics);
    }

    // Step 11: Display intelligence summary
    console.log('\n[11/12] CAUSAL INTELLIGENCE SUMMARY...');
    this.printIntelligenceSummary(ocicResult.intelligence);

    // Step 12: Generate report
    console.log('\n[12/12] GENERATING OCIC REPORT...');
    const report = this.ocicEngine.generateReport(runId, traceResults, ocicResult);
    this.writeReports(report, ocicResult.intelligence, runId);

    // Final summary
    this.printFinalSummary(report, ocicResult);

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

  private printEnforcementDecision(ocicResult: OCICExecutionResult): void {
    const decision = ocicResult.orisResult.enforcement;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                 OCIC ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Overall Action:    ${this.padRight(decision.overall_action, 40)} │`);
    console.log(`  │  Canonical Allowed: ${this.padRight(String(decision.canonical_allowed), 40)} │`);
    console.log(`  │  Execution Allowed: ${this.padRight(String(ocicResult.executionAllowed), 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  CAUSAL INTELLIGENCE STATUS                                   │');
    const intelligence = ocicResult.intelligence;
    console.log(`  │  MCCS Computed: ${this.padRight(String(intelligence.intelligence_summary.mccs_computed), 44)} │`);
    console.log(`  │  Predictive Blocks: ${this.padRight(String(intelligence.intelligence_summary.predictive_blocks_issued), 40)} │`);
    console.log(`  │  Causal Certainty: ${this.padRight(String(intelligence.intelligence_summary.causal_certainty_achieved), 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Print RSR per shape
    console.log('\n  RSR PER SHAPE:');
    for (const result of decision.per_shape_rsr) {
      const shape = ALL_SHAPES.find(s => s.id === result.shape_id);
      const kind = shape?.kind || 'CAPABILITY';
      const met = result.rsr_met ? '✓' : '✗';
      const bar = this.createProgressBar(result.rsr, result.required_rsr);
      const kindBadge = kind === 'INVARIANT' ? '🔒' : '  ';
      console.log(`  ${met} ${kindBadge} [${result.criticality.substring(0, 3)}] ${result.shape_id}`);
      console.log(`       RSR: ${bar} ${(result.rsr * 100).toFixed(1)}% (req: ${(result.required_rsr * 100).toFixed(1)}%)`);
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

  private printPredictiveBlocks(blocks: PredictiveBlock[]): void {
    if (blocks.length === 0) {
      console.log('  ✓ No predictive blocks issued');
      console.log('  Fingerprint firewall: All transforms historically safe');
      return;
    }

    console.log(`  ⛔ PREDICTIVE BLOCKS ISSUED: ${blocks.length}`);
    console.log('');

    for (const block of blocks) {
      console.log(`  ⛔ ${block.decision}`);
      console.log(`     Hash: ${block.trigger.current_transform_hash}`);
      console.log(`     Handoff: ${block.trigger.current_handoff_id} (${block.trigger.current_source_agent} → ${block.trigger.current_target_agent})`);
      console.log('     Historical Evidence:');
      console.log(`       Run: ${block.historical_evidence.matching_run_id}`);
      console.log(`       Loss: ${block.historical_evidence.historical_loss_class}`);
      console.log(`       Invariant Violated: ${block.historical_evidence.historical_invariant_violated}`);
      console.log('     Proof:');
      console.log(`       Hash Match: ${block.proof_trace.fingerprint_match_exact ? '✓ EXACT' : '✗'}`);
      console.log(`       Causal Link: ${block.proof_trace.causal_link_established ? '✓ ESTABLISHED' : '✗'}`);
      console.log(`       No Heuristics: ${block.proof_trace.no_heuristics ? '✓' : '✗'}`);
      console.log(`       No ML: ${block.proof_trace.no_ml ? '✓' : '✗'}`);
      console.log('');
    }
  }

  private printCompositions(compositions: CounterfactualComposition[]): void {
    console.log(`  Compositions evaluated: ${compositions.length}`);

    if (compositions.length === 0) {
      console.log('  No compositions computed');
      return;
    }

    // Show top 3 by RSR gain
    const sorted = [...compositions].sort(
      (a, b) => b.combined_result.rsr_delta - a.combined_result.rsr_delta
    );

    console.log('\n  Top compositions by RSR gain:');
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const comp = sorted[i];
      console.log(`\n  ${i + 1}. ${comp.composition_id}`);
      console.log(`     Scenarios: ${comp.scenarios.join(', ')}`);
      console.log(`     RSR: ${(comp.combined_result.baseline_global_rsr * 100).toFixed(1)}% → ${(comp.combined_result.projected_global_rsr * 100).toFixed(1)}%`);
      console.log(`     Delta: +${(comp.combined_result.rsr_delta * 100).toFixed(1)}%`);

      if (comp.combined_result.interaction_effects.length > 0) {
        console.log('     Interactions:');
        for (const effect of comp.combined_result.interaction_effects) {
          const emoji = effect.effect_type === 'SYNERGY' ? '⚡' :
                        effect.effect_type === 'INTERFERENCE' ? '⚠️' : '↔️';
          console.log(`       ${emoji} ${effect.effect_type}: ${effect.description.substring(0, 50)}...`);
        }
      }
    }
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

    for (const mccs of mccsResults.slice(0, 5)) { // Show top 5
      const rankEmoji = mccs.rank === 1 ? '🥇' : mccs.rank === 2 ? '🥈' : mccs.rank === 3 ? '🥉' : '  ';

      console.log(`\n  ${rankEmoji} Rank #${mccs.rank}: ${mccs.mccs_id}`);
      console.log(`     Interventions: ${mccs.intervention_count}`);
      console.log(`     RSR Gain: +${(mccs.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      console.log(`     Compliance: ${mccs.projected_outcome.all_tiers_compliant ? '✓ ALL TIERS' : '✗ PARTIAL'}`);
      console.log(`     Invariants: ${mccs.projected_outcome.invariants_preserved ? '✓ PRESERVED' : '✗ VIOLATED'}`);
      console.log(`     Proof: ${mccs.proof.verified_via_replay ? '✓ REPLAY VERIFIED' : '✗'}`);

      console.log('     Interventions:');
      for (const int of mccs.interventions) {
        console.log(`       • ${int.intervention_type} @ ${int.target_handoff_id}`);
        console.log(`         ${int.description.substring(0, 55)}...`);
      }
    }
  }

  private printRepairDirectivesWithCausalProof(
    directives: any[],
    mccsResults: MinimalCausalCutSet[]
  ): void {
    console.log(`  MRDs with causal backing: ${directives.length}`);

    if (directives.length === 0) {
      console.log('  No repair directives needed');
      return;
    }

    // Find MCCS that supports each MRD
    for (const mrd of directives) {
      const supportingMCCS = mccsResults.find(mccs =>
        mccs.interventions.some(i => i.target_shape_id === mrd.target_shape_id)
      );

      const kindBadge = mrd.target_shape_kind === 'INVARIANT' ? '🔒' : '📦';
      console.log(`\n  ${kindBadge} MRD: ${mrd.target_shape_id}`);
      console.log(`     Type: ${mrd.repair_type}`);
      console.log(`     Location: ${mrd.repair_location.agent}`);

      if (supportingMCCS) {
        console.log(`     Causal Proof: ✓ MCCS #${supportingMCCS.rank} (${supportingMCCS.mccs_id})`);
        console.log(`     Expected RSR Gain: +${(supportingMCCS.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      } else {
        console.log('     Causal Proof: Advisory only (no MCCS)');
      }
    }
  }

  private printForensicSummary(forensics: any): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   FORENSIC SUMMARY                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Fingerprints: ${this.padRight(String(forensics.forensic_summary.total_fingerprints), 45)} │`);
    console.log(`  │  Counterfactuals: ${this.padRight(String(forensics.forensic_summary.counterfactuals_executed), 42)} │`);
    console.log(`  │  Mandatory Forensics: ${this.padRight(String(forensics.forensic_summary.shapes_at_mandatory_forensics), 38)} │`);
    console.log(`  │  Causal Factors: ${this.padRight(String(forensics.forensic_summary.causal_factors_identified), 43)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printIntelligenceSummary(intelligence: any): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │              CAUSAL INTELLIGENCE SUMMARY                      │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  MCCS Computed: ${this.padRight(String(intelligence.intelligence_summary.mccs_computed), 44)} │`);
    console.log(`  │  Best MCCS Interventions: ${this.padRight(String(intelligence.intelligence_summary.best_mccs_intervention_count), 34)} │`);
    console.log(`  │  Best MCCS RSR Gain: ${this.padRight((intelligence.intelligence_summary.best_mccs_rsr_gain * 100).toFixed(1) + '%', 39)} │`);
    console.log(`  │  Predictive Blocks: ${this.padRight(String(intelligence.intelligence_summary.predictive_blocks_issued), 40)} │`);
    console.log(`  │  Compositions Evaluated: ${this.padRight(String(intelligence.intelligence_summary.compositions_evaluated), 35)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    const certainty = intelligence.intelligence_summary.causal_certainty_achieved;
    console.log(`  │  CAUSAL CERTAINTY: ${this.padRight(certainty ? '✓ ACHIEVED' : '✗ NOT ACHIEVED', 41)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n  INTELLIGENCE PROOF:');
    console.log(`    MCCS Proven via Replay: ${intelligence.intelligence_proof.mccs_proven_via_replay ? '✓' : '✗'}`);
    console.log(`    Predictions Evidence-Based: ${intelligence.intelligence_proof.predictions_evidence_based ? '✓' : '✗'}`);
    console.log(`    No Heuristics: ${intelligence.intelligence_proof.no_heuristics ? '✓' : '✗'}`);
    console.log(`    No ML: ${intelligence.intelligence_proof.no_ml ? '✓' : '✗'}`);
    console.log(`    No Probability: ${intelligence.intelligence_proof.no_probability ? '✓' : '✗'}`);
    console.log(`    Deterministic: ${intelligence.intelligence_proof.deterministic ? '✓' : '✗'}`);
    console.log(`    Decisions Not Suggestions: ${intelligence.intelligence_proof.decisions_not_suggestions ? '✓' : '✗'}`);
  }

  private writeReports(report: any, intelligence: any, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'ocic-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ ...report, ocic: intelligence }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'ocic-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report, intelligence));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: any, intelligence: any): string {
    const lines: string[] = [];

    lines.push('# OCIC Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Causal Intelligence Core');
    lines.push('');

    lines.push('## Metadata');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Generated | ${report.metadata.generated_at} |`);
    lines.push(`| Run ID | ${report.metadata.run_id} |`);
    lines.push(`| Mode | ${report.metadata.enforcement_mode} |`);
    lines.push(`| ORIS Version | ${report.metadata.oris_version} |`);
    lines.push(`| OCIC Version | ${OCIC_VERSION} |`);
    lines.push('');

    lines.push('## Enforcement Decision');
    lines.push('');
    lines.push(`**Overall Action:** \`${report.enforcement.overall_action}\``);
    lines.push('');
    lines.push(`**Canonical Allowed:** ${report.enforcement.canonical_allowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**Causal Certainty:** ${intelligence.intelligence_summary.causal_certainty_achieved ? '✓ ACHIEVED' : '✗ NOT ACHIEVED'}`);
    lines.push('');

    // MCCS Section
    if (intelligence.minimal_causal_cuts.length > 0) {
      lines.push('## Minimal Causal Cut Sets');
      lines.push('');
      lines.push('> Olympus DECIDES. These are not suggestions.');
      lines.push('');

      for (const mccs of intelligence.minimal_causal_cuts.slice(0, 5)) {
        lines.push(`### Rank #${mccs.rank}: ${mccs.mccs_id}`);
        lines.push('');
        lines.push(`- **Interventions:** ${mccs.intervention_count}`);
        lines.push(`- **RSR Gain:** +${(mccs.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
        lines.push(`- **Compliance Restored:** ${mccs.projected_outcome.all_tiers_compliant ? '✓' : '✗'}`);
        lines.push(`- **Invariants Preserved:** ${mccs.projected_outcome.invariants_preserved ? '✓' : '✗'}`);
        lines.push(`- **Proven via Replay:** ${mccs.proof.verified_via_replay ? '✓' : '✗'}`);
        lines.push('');
        lines.push('**Interventions:**');
        for (const int of mccs.interventions) {
          lines.push(`- \`${int.intervention_type}\` at ${int.target_handoff_id}: ${int.description}`);
        }
        lines.push('');
      }
    }

    // Predictive Blocks
    if (intelligence.predictive_blocks.length > 0) {
      lines.push('## Predictive Blocks');
      lines.push('');
      lines.push('> Preemptive blocks based on historical evidence.');
      lines.push('');

      for (const block of intelligence.predictive_blocks) {
        lines.push(`### ${block.block_id}`);
        lines.push('');
        lines.push(`**Decision:** \`${block.decision}\``);
        lines.push('');
        lines.push('**Trigger:**');
        lines.push(`- Hash: \`${block.trigger.current_transform_hash}\``);
        lines.push(`- Handoff: ${block.trigger.current_handoff_id}`);
        lines.push('');
        lines.push('**Historical Evidence:**');
        lines.push(`- Run: ${block.historical_evidence.matching_run_id}`);
        lines.push(`- Loss Class: ${block.historical_evidence.historical_loss_class}`);
        lines.push(`- Invariant Violated: ${block.historical_evidence.historical_invariant_violated}`);
        lines.push('');
        lines.push('**Proof:**');
        lines.push(`- Fingerprint Match: ${block.proof_trace.fingerprint_match_exact ? '✓ EXACT' : '✗'}`);
        lines.push(`- No Heuristics: ${block.proof_trace.no_heuristics ? '✓' : '✗'}`);
        lines.push(`- No ML: ${block.proof_trace.no_ml ? '✓' : '✗'}`);
        lines.push(`- No Probability: ${block.proof_trace.no_probability ? '✓' : '✗'}`);
        lines.push('');
      }
    }

    // Intelligence Proof
    lines.push('## Intelligence Proof');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| MCCS Proven via Replay | ${intelligence.intelligence_proof.mccs_proven_via_replay ? '✓' : '✗'} |`);
    lines.push(`| Predictions Evidence-Based | ${intelligence.intelligence_proof.predictions_evidence_based ? '✓' : '✗'} |`);
    lines.push(`| No Heuristics | ${intelligence.intelligence_proof.no_heuristics ? '✓' : '✗'} |`);
    lines.push(`| No ML | ${intelligence.intelligence_proof.no_ml ? '✓' : '✗'} |`);
    lines.push(`| No Probability | ${intelligence.intelligence_proof.no_probability ? '✓' : '✗'} |`);
    lines.push(`| Deterministic | ${intelligence.intelligence_proof.deterministic ? '✓' : '✗'} |`);
    lines.push(`| Decisions Not Suggestions | ${intelligence.intelligence_proof.decisions_not_suggestions ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Causal Intelligence Core (OCIC) v1.0.0*');
    lines.push('');
    lines.push('**OLYMPUS DECIDES. NO HEURISTICS. NO ML. NO PROBABILITY. CAUSAL CERTAINTY.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: any, ocicResult: OCICExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  OCIC FINAL DECISION');
    console.log('═'.repeat(80));

    const action = report.enforcement.overall_action;
    const certainty = ocicResult.intelligence.intelligence_summary.causal_certainty_achieved;
    const predictiveBlocks = ocicResult.preExecutionBlocks.length;

    let emoji: string;
    let status: string;

    if (predictiveBlocks > 0) {
      emoji = '⛔🔮';
      status = 'PREDICTIVELY BLOCKED - Historical failure detected';
    } else if (!ocicResult.executionAllowed) {
      emoji = '🛑';
      status = 'EXECUTION BLOCKED';
    } else if (certainty) {
      emoji = '✅🎯';
      status = 'EXECUTION ALLOWED - Causal certainty achieved';
    } else {
      emoji = '⚠️';
      status = 'EXECUTION ALLOWED - Causal certainty NOT achieved';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');
    console.log('  DECISION METRICS:');
    console.log(`    Global RSR: ${(report.rsr_analysis.global_rsr * 100).toFixed(1)}%`);
    console.log(`    MCCS Available: ${ocicResult.intelligence.minimal_causal_cuts.length}`);
    console.log(`    Predictive Blocks: ${predictiveBlocks}`);
    console.log(`    Causal Certainty: ${certainty ? '✓ YES' : '✗ NO'}`);
    console.log('');

    if (ocicResult.intelligence.minimal_causal_cuts.length > 0) {
      const best = ocicResult.intelligence.minimal_causal_cuts[0];
      console.log('  BEST INTERVENTION PATH:');
      console.log(`    Rank #${best.rank}: ${best.intervention_count} intervention(s)`);
      console.log(`    RSR Gain: +${(best.projected_outcome.rsr_gain * 100).toFixed(1)}%`);
      console.log(`    Compliance: ${best.projected_outcome.all_tiers_compliant ? '✓' : '✗'}`);
      console.log('');
    }

    console.log('  PROOF CHAIN:');
    console.log(`    MCCS Proven:     ${ocicResult.intelligence.intelligence_proof.mccs_proven_via_replay ? '✓' : '✗'}`);
    console.log(`    No Heuristics:   ${ocicResult.intelligence.intelligence_proof.no_heuristics ? '✓' : '✗'}`);
    console.log(`    No ML:           ${ocicResult.intelligence.intelligence_proof.no_ml ? '✓' : '✗'}`);
    console.log(`    No Probability:  ${ocicResult.intelligence.intelligence_proof.no_probability ? '✓' : '✗'}`);
    console.log(`    Deterministic:   ${ocicResult.intelligence.intelligence_proof.deterministic ? '✓' : '✗'}`);
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS HAS DECIDED.');
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
const runId = `OCIC-${Date.now()}`;
const runner = new OCICRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

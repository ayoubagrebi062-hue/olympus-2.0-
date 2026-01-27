/**
 * OFEL Runner (OLYMPUS Forensic Execution Layer)
 *
 * Executes the full OFEL-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. Invariant validation
 * 3. Mortality tracking
 * 4. RSR enforcement
 * 5. MRD generation
 * 6. Causal fingerprint collection
 * 7. Counterfactual replay
 * 8. Adaptive inspection
 * 9. Forensic proof-carrying report generation
 *
 * This is the ENTRY POINT for OFEL-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - All forensics are READ-ONLY
 * - No execution modification
 * - No inference
 * - No overrides
 * - Deterministic behavior only
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES, SHAPES_BY_KIND, INVARIANT_SHAPES } from './registry/shapes';
import {
  ORISEngine,
  type ORISEnforcementResult,
  type RuntimeControlReport,
  type MinimalRepairDirective,
  type InvariantViolation,
  type CausalFingerprint,
  type CounterfactualResult,
  type ShapeInspectionConfig,
  type OFELForensics,
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId, HandoffId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// OFEL version - immutable
const OFEL_VERSION = '1.0.0';

class OFELRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private orisEngine: ORISEngine;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.orisEngine = new ORISEngine(DATA_DIR);
  }

  /**
   * Execute full OFEL-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS FORENSIC EXECUTION LAYER (OFEL)');
    console.log('  Mode: RUNTIME_PRIMITIVE | Forensics: ENABLED | Read-Only: TRUE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/10] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/10] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute ORIS+OFEL enforcement
    console.log('\n[3/10] EXECUTING ORIS+OFEL ENFORCEMENT...');
    const orisResult = this.orisEngine.enforce(traceResults, gateResult, runId);
    this.printEnforcementDecision(orisResult);

    // Step 4: Display invariant violations
    console.log('\n[4/10] INVARIANT VALIDATION...');
    this.printInvariantViolations(orisResult.invariant_violations);

    // Step 5: Display mortality analysis
    console.log('\n[5/10] MORTALITY ANALYSIS...');
    this.printMortalityAnalysis(orisResult);

    // Step 6: Display MRDs
    console.log('\n[6/10] MINIMAL REPAIR DIRECTIVES...');
    this.printRepairDirectives(orisResult.repair_directives);

    // Step 7: Display OFEL forensics
    console.log('\n[7/10] OFEL FORENSIC ANALYSIS...');
    if (orisResult.forensics) {
      this.printForensicAnalysis(orisResult.forensics);
    } else {
      console.log('  No forensics collected (shapes at BASELINE inspection level)');
    }

    // Step 8: Display causal fingerprints
    console.log('\n[8/10] CAUSAL FINGERPRINTS...');
    if (orisResult.forensics) {
      this.printCausalFingerprints(orisResult.forensics.causal_fingerprints);
    } else {
      console.log('  No fingerprints collected');
    }

    // Step 9: Display counterfactual results
    console.log('\n[9/10] COUNTERFACTUAL REPLAY...');
    if (orisResult.forensics) {
      this.printCounterfactualResults(orisResult.forensics.counterfactual_results);
    } else {
      console.log('  No counterfactual replay executed');
    }

    // Step 10: Generate report
    console.log('\n[10/10] GENERATING OFEL REPORT...');
    const report = this.orisEngine.generateReport(runId, traceResults, orisResult);
    this.writeReports(report, runId);

    // Final summary
    this.printFinalSummary(report);

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

  private printEnforcementDecision(orisResult: ORISEnforcementResult): void {
    const decision = orisResult.enforcement;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                 OFEL ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Overall Action:    ${this.padRight(decision.overall_action, 40)} │`);
    console.log(`  │  Canonical Allowed: ${this.padRight(String(decision.canonical_allowed), 40)} │`);
    console.log(`  │  TTE Fork Required: ${this.padRight(String(decision.tte_decision.fork_required), 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  FORENSICS STATUS                                            │');
    console.log(`  │  Enabled: ${this.padRight(String(orisResult.forensics !== undefined), 50)} │`);
    if (orisResult.forensics) {
      console.log(`  │  Fingerprints: ${this.padRight(String(orisResult.forensics.forensic_summary.total_fingerprints), 45)} │`);
      console.log(`  │  Counterfactuals: ${this.padRight(String(orisResult.forensics.forensic_summary.counterfactuals_executed), 42)} │`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Print RSR per shape with kind
    console.log('\n  RSR PER SHAPE:');
    for (const result of decision.per_shape_rsr) {
      const shape = ALL_SHAPES.find(s => s.id === result.shape_id);
      const kind = shape?.kind || 'CAPABILITY';
      const met = result.rsr_met ? '✓' : '✗';
      const bar = this.createProgressBar(result.rsr, result.required_rsr);
      const kindBadge = kind === 'INVARIANT' ? '🔒' : '  ';
      console.log(`  ${met} ${kindBadge} [${result.criticality.substring(0, 3)}] ${result.shape_id}`);
      console.log(`       RSR: ${bar} ${(result.rsr * 100).toFixed(1)}% (req: ${(result.required_rsr * 100).toFixed(1)}%)`);
      if (result.untolerated_losses.length > 0) {
        console.log(`       Untolerated: ${result.untolerated_losses.join(', ')}`);
      }
    }
  }

  private printInvariantViolations(violations: InvariantViolation[]): void {
    console.log(`  Total INVARIANT violations: ${violations.length}`);

    if (violations.length === 0) {
      console.log('  ✓ All INVARIANT shapes preserved');
      return;
    }

    console.log('');
    for (const v of violations) {
      console.log(`  🔒 FATAL: ${v.shape_id} at ${v.handoff_id}`);
      console.log(`     Type: ${v.violation_type}`);
      console.log(`     Expected: ${v.expected}`);
      console.log(`     Actual: ${v.actual}`);
    }
  }

  private printMortalityAnalysis(orisResult: ORISEnforcementResult): void {
    const mortality = orisResult.mortality_analysis;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   MORTALITY STATUS                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  HEALTHY:             ${this.padRight(String(mortality.healthy_count) + ' shapes', 38)} │`);
    console.log(`  │  FLAKY:               ${this.padRight(String(mortality.flaky_count) + ' shapes', 38)} │`);
    console.log(`  │  DEGRADING:           ${this.padRight(String(mortality.degrading_count) + ' shapes', 38)} │`);
    console.log(`  │  SYSTEMICALLY_BROKEN: ${this.padRight(String(mortality.broken_count) + ' shapes', 38)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (mortality.most_vulnerable_shapes.length > 0) {
      console.log('\n  Most Vulnerable Shapes:');
      for (const shapeId of mortality.most_vulnerable_shapes) {
        const classification = orisResult.shape_classification.find(c => c.shape_id === shapeId);
        if (classification) {
          const kindBadge = classification.shape_kind === 'INVARIANT' ? '🔒' : '📦';
          console.log(`    ${kindBadge} ${shapeId}: ${(classification.survival_rate * 100).toFixed(1)}% (${classification.trend})`);
        }
      }
    }
  }

  private printRepairDirectives(directives: MinimalRepairDirective[]): void {
    console.log(`  Generated MRDs: ${directives.length}`);

    if (directives.length === 0) {
      console.log('  No repair directives needed.');
      return;
    }

    console.log('');
    for (const mrd of directives) {
      const kindBadge = mrd.target_shape_kind === 'INVARIANT' ? '🔒' : '📦';
      console.log(`  ${kindBadge} MRD for ${mrd.target_shape_id} (${mrd.trigger})`);
      console.log(`     Type: ${mrd.repair_type}`);
      console.log(`     Location: ${mrd.repair_location.agent}`);
      console.log(`     Change: ${mrd.structural_change.type}`);
    }
  }

  private printForensicAnalysis(forensics: OFELForensics): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   OFEL FORENSIC SUMMARY                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  OFEL Version: ${this.padRight(forensics.ofel_version, 45)} │`);
    console.log(`  │  Total Fingerprints: ${this.padRight(String(forensics.forensic_summary.total_fingerprints), 39)} │`);
    console.log(`  │  Counterfactuals Executed: ${this.padRight(String(forensics.forensic_summary.counterfactuals_executed), 33)} │`);
    console.log(`  │  Shapes at Mandatory Forensics: ${this.padRight(String(forensics.forensic_summary.shapes_at_mandatory_forensics), 27)} │`);
    console.log(`  │  Causal Factors Identified: ${this.padRight(String(forensics.forensic_summary.causal_factors_identified), 32)} │`);
    console.log(`  │  Provable Causality Chains: ${this.padRight(String(forensics.forensic_summary.provable_causality_chains), 32)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  FORENSIC PROOF                                              │');
    console.log(`  │  Fingerprints Deterministic: ${this.padRight(String(forensics.forensic_proof.fingerprints_deterministic), 31)} │`);
    console.log(`  │  Counterfactuals Read-Only: ${this.padRight(String(forensics.forensic_proof.counterfactuals_read_only), 32)} │`);
    console.log(`  │  No Execution Modification: ${this.padRight(String(forensics.forensic_proof.no_execution_modification), 32)} │`);
    console.log(`  │  Causality Provable: ${this.padRight(String(forensics.forensic_proof.causality_provable), 39)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Inspection levels
    console.log('\n  INSPECTION LEVELS:');
    const levelCounts: Record<string, number> = {};
    for (const config of forensics.inspection_levels) {
      levelCounts[config.inspection_level] = (levelCounts[config.inspection_level] || 0) + 1;
    }
    for (const [level, count] of Object.entries(levelCounts)) {
      const emoji = level === 'MANDATORY_FORENSICS' ? '🔬' :
                    level === 'FULL_STRUCTURAL_TRACE' ? '📊' :
                    level === 'ATTRIBUTE_DIFF' ? '📋' : '📌';
      console.log(`    ${emoji} ${level}: ${count} shapes`);
    }
  }

  private printCausalFingerprints(fingerprints: CausalFingerprint[]): void {
    console.log(`  Total Fingerprints: ${fingerprints.length}`);

    if (fingerprints.length === 0) {
      console.log('  No fingerprints collected');
      return;
    }

    console.log('');
    for (const fp of fingerprints) {
      const hasLoss = fp.shapes_lost.length > 0;
      const lossIndicator = hasLoss ? '⚠️' : '✓';

      console.log(`  ${lossIndicator} ${fp.handoff_id}: ${fp.source_agent} → ${fp.target_agent}`);
      console.log(`     Hash: ${fp.transform_hash}`);
      console.log(`     Input Shapes: ${fp.input_shape_ids.length} | Output Shapes: ${fp.output_shape_ids.length}`);

      if (hasLoss) {
        console.log(`     Shapes Lost: ${fp.shapes_lost.join(', ')}`);
      }
      if (fp.shapes_degraded.length > 0) {
        console.log(`     Shapes Degraded: ${fp.shapes_degraded.join(', ')}`);
      }
      if (fp.summarization_invoked) {
        const ratio = fp.summarization_compression_ratio;
        console.log(`     Summarization: INVOKED (${ratio ? (ratio * 100).toFixed(1) + '% compression' : 'N/A'})`);
      }
      if (fp.invariant_shapes_present.length > 0) {
        console.log(`     🔒 Invariants Present: ${fp.invariant_shapes_present.join(', ')}`);
      }

      const delta = fp.attribute_delta;
      if (delta.attributes_lost.length > 0) {
        console.log(`     Attributes Lost: ${delta.attributes_lost.join(', ')}`);
      }
    }
  }

  private printCounterfactualResults(results: CounterfactualResult[]): void {
    console.log(`  Total Counterfactual Replays: ${results.length}`);

    if (results.length === 0) {
      console.log('  No counterfactual replay executed');
      return;
    }

    console.log('');
    for (const r of results) {
      const impact = r.causal_impact;
      const causalConfirmed = impact.causal_factor_confirmed ? '✓ CONFIRMED' : '✗ NOT CONFIRMED';

      console.log(`  📊 ${r.scenario} for ${r.target_shape_id} at ${r.target_handoff_id}`);
      console.log(`     Baseline:       RSR=${(r.baseline.rsr * 100).toFixed(1)}% | Survived=${r.baseline.survived}`);
      console.log(`     Counterfactual: RSR=${(r.counterfactual.rsr * 100).toFixed(1)}% | Survived=${r.counterfactual.survived}`);
      console.log(`     RSR Delta: ${impact.rsr_delta >= 0 ? '+' : ''}${(impact.rsr_delta * 100).toFixed(1)}%`);
      console.log(`     Would Prevent Loss: ${impact.would_have_prevented_loss ? 'YES' : 'NO'}`);
      console.log(`     Causal Factor: ${causalConfirmed}`);
      console.log('');
    }
  }

  private writeReports(report: RuntimeControlReport, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'ofel-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'ofel-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: RuntimeControlReport): string {
    const lines: string[] = [];

    lines.push('# OFEL Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Forensic Execution Layer');
    lines.push('');

    lines.push('## Metadata');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Generated | ${report.metadata.generated_at} |`);
    lines.push(`| Run ID | ${report.metadata.run_id} |`);
    lines.push(`| Mode | ${report.metadata.enforcement_mode} |`);
    lines.push(`| ORIS Version | ${report.metadata.oris_version} |`);
    lines.push(`| OFEL Version | ${OFEL_VERSION} |`);
    lines.push('');

    lines.push('## Enforcement Decision');
    lines.push('');
    lines.push(`**Overall Action:** \`${report.enforcement.overall_action}\``);
    lines.push('');
    lines.push(`**Canonical Allowed:** ${report.enforcement.canonical_allowed ? '✓ YES' : '✗ NO'}`);
    lines.push('');
    lines.push(`**TTE Fork Required:** ${report.enforcement.tte_decision.fork_required ? 'YES' : 'NO'}`);
    lines.push('');
    lines.push(`**Reason:** ${report.enforcement.tte_decision.reason}`);
    lines.push('');

    // OFEL Forensics Section
    if (report.forensics) {
      lines.push('## Forensic Analysis');
      lines.push('');
      lines.push('### Summary');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| Total Fingerprints | ${report.forensics.forensic_summary.total_fingerprints} |`);
      lines.push(`| Counterfactuals Executed | ${report.forensics.forensic_summary.counterfactuals_executed} |`);
      lines.push(`| Shapes at Mandatory Forensics | ${report.forensics.forensic_summary.shapes_at_mandatory_forensics} |`);
      lines.push(`| Causal Factors Identified | ${report.forensics.forensic_summary.causal_factors_identified} |`);
      lines.push(`| Provable Causality Chains | ${report.forensics.forensic_summary.provable_causality_chains} |`);
      lines.push('');

      // Inspection Levels
      lines.push('### Inspection Levels');
      lines.push('');
      lines.push('| Shape | Mortality Status | Inspection Level | Fingerprints | Counterfactual |');
      lines.push('|-------|------------------|------------------|--------------|----------------|');
      for (const config of report.forensics.inspection_levels) {
        lines.push(`| ${config.shape_id} | ${config.mortality_status} | ${config.inspection_level} | ${config.requires_fingerprints ? '✓' : '✗'} | ${config.requires_counterfactual ? '✓' : '✗'} |`);
      }
      lines.push('');

      // Causal Fingerprints
      if (report.forensics.causal_fingerprints.length > 0) {
        lines.push('### Causal Fingerprints');
        lines.push('');
        for (const fp of report.forensics.causal_fingerprints) {
          lines.push(`#### ${fp.handoff_id}: ${fp.source_agent} → ${fp.target_agent}`);
          lines.push('');
          lines.push(`- **Transform Hash:** \`${fp.transform_hash}\``);
          lines.push(`- **Input Shapes:** ${fp.input_shape_ids.join(', ') || 'None'}`);
          lines.push(`- **Output Shapes:** ${fp.output_shape_ids.join(', ') || 'None'}`);
          lines.push(`- **Shapes Lost:** ${fp.shapes_lost.join(', ') || 'None'}`);
          lines.push(`- **Shapes Degraded:** ${fp.shapes_degraded.join(', ') || 'None'}`);
          lines.push(`- **Summarization Invoked:** ${fp.summarization_invoked ? 'YES' : 'NO'}`);
          if (fp.summarization_invoked && fp.summarization_compression_ratio) {
            lines.push(`- **Compression Ratio:** ${(fp.summarization_compression_ratio * 100).toFixed(1)}%`);
          }
          lines.push(`- **Invariant Bypass Granted:** ${fp.invariant_bypass_granted ? 'YES' : 'NO (NEVER)'}`);
          lines.push('');
          lines.push('**Attribute Delta:**');
          lines.push(`- Before: ${fp.attribute_delta.attributes_before}`);
          lines.push(`- After: ${fp.attribute_delta.attributes_after}`);
          lines.push(`- Lost: ${fp.attribute_delta.attributes_lost.join(', ') || 'None'}`);
          lines.push(`- Added: ${fp.attribute_delta.attributes_added.join(', ') || 'None'}`);
          lines.push('');
        }
      }

      // Counterfactual Results
      if (report.forensics.counterfactual_results.length > 0) {
        lines.push('### Counterfactual Replay Results');
        lines.push('');
        for (const r of report.forensics.counterfactual_results) {
          lines.push(`#### ${r.scenario}`);
          lines.push('');
          lines.push(`**Target:** ${r.target_shape_id} at ${r.target_handoff_id}`);
          lines.push('');
          lines.push('| Metric | Baseline | Counterfactual |');
          lines.push('|--------|----------|----------------|');
          lines.push(`| Survived | ${r.baseline.survived} | ${r.counterfactual.survived} |`);
          lines.push(`| RSR | ${(r.baseline.rsr * 100).toFixed(1)}% | ${(r.counterfactual.rsr * 100).toFixed(1)}% |`);
          lines.push(`| Attributes Present | ${r.baseline.attributes_present} | ${r.counterfactual.attributes_present} |`);
          lines.push(`| Loss Class | ${r.baseline.loss_class || 'None'} | ${r.counterfactual.loss_class || 'None'} |`);
          lines.push('');
          lines.push('**Causal Impact:**');
          lines.push(`- RSR Delta: ${r.causal_impact.rsr_delta >= 0 ? '+' : ''}${(r.causal_impact.rsr_delta * 100).toFixed(1)}%`);
          lines.push(`- Survival Changed: ${r.causal_impact.survival_changed ? 'YES' : 'NO'}`);
          lines.push(`- Would Prevent Loss: ${r.causal_impact.would_have_prevented_loss ? 'YES' : 'NO'}`);
          lines.push(`- Causal Factor Confirmed: ${r.causal_impact.causal_factor_confirmed ? '✓ YES' : '✗ NO'}`);
          lines.push('');
        }
      }

      // Forensic Proof
      lines.push('### Forensic Proof');
      lines.push('');
      lines.push('| Property | Value |');
      lines.push('|----------|-------|');
      lines.push(`| Fingerprints Deterministic | ${report.forensics.forensic_proof.fingerprints_deterministic ? '✓' : '✗'} |`);
      lines.push(`| Counterfactuals Read-Only | ${report.forensics.forensic_proof.counterfactuals_read_only ? '✓' : '✗'} |`);
      lines.push(`| No Execution Modification | ${report.forensics.forensic_proof.no_execution_modification ? '✓' : '✗'} |`);
      lines.push(`| Causality Provable | ${report.forensics.forensic_proof.causality_provable ? '✓' : '✗'} |`);
      lines.push('');
    }

    lines.push('## Shape Classification');
    lines.push('');
    lines.push(`- **INVARIANT shapes:** ${report.shape_classification.invariant_count}`);
    lines.push(`- **CAPABILITY shapes:** ${report.shape_classification.capability_count}`);
    lines.push('');
    lines.push('| Shape | Kind | Criticality | Mortality | Survival Rate | Trend |');
    lines.push('|-------|------|-------------|-----------|---------------|-------|');
    for (const s of report.shape_classification.shapes) {
      const kind = s.shape_kind === 'INVARIANT' ? '🔒 INVARIANT' : '📦 CAPABILITY';
      lines.push(`| ${s.shape_id} | ${kind} | ${s.criticality} | ${s.mortality_status} | ${(s.survival_rate * 100).toFixed(1)}% | ${s.trend} |`);
    }
    lines.push('');

    if (report.shape_classification.invariant_violations.length > 0) {
      lines.push('### Invariant Violations (FATAL)');
      lines.push('');
      for (const v of report.shape_classification.invariant_violations) {
        lines.push(`- **${v.shape_id}** at ${v.handoff_id}: ${v.violation_type}`);
        lines.push(`  - Expected: ${v.expected}`);
        lines.push(`  - Actual: ${v.actual}`);
      }
      lines.push('');
    }

    lines.push('## RSR Analysis');
    lines.push('');
    lines.push(`**Global RSR:** ${(report.rsr_analysis.global_rsr * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('### Per Shape');
    lines.push('');
    lines.push('| Shape | Kind | RSR | Required | Met | Losses |');
    lines.push('|-------|------|-----|----------|-----|--------|');
    for (const s of report.rsr_analysis.per_shape) {
      const shape = ALL_SHAPES.find(sh => sh.id === s.shape_id);
      const kind = shape?.kind || 'CAPABILITY';
      const met = s.rsr_met ? '✓' : '✗';
      const losses = s.untolerated_losses.length > 0 ? s.untolerated_losses.join(', ') : 'None';
      lines.push(`| ${s.shape_id} | ${kind} | ${(s.rsr * 100).toFixed(1)}% | ${(s.required_rsr * 100).toFixed(1)}% | ${met} | ${losses} |`);
    }
    lines.push('');

    if (report.repair_directives.length > 0) {
      lines.push('## Minimal Repair Directives');
      lines.push('');
      lines.push('> Advisory only - no automatic execution');
      lines.push('');
      for (const mrd of report.repair_directives) {
        lines.push(`### MRD: ${mrd.target_shape_id}`);
        lines.push('');
        lines.push(`- **Directive ID:** ${mrd.directive_id}`);
        lines.push(`- **Trigger:** ${mrd.trigger}`);
        lines.push(`- **Shape Kind:** ${mrd.target_shape_kind}`);
        lines.push(`- **Repair Type:** ${mrd.repair_type}`);
        lines.push(`- **Location:** ${mrd.repair_location.agent}`);
        lines.push('');
        lines.push('**Description:**');
        lines.push(`> ${mrd.repair_description}`);
        lines.push('');
        lines.push('**Structural Change:**');
        lines.push(`- Type: ${mrd.structural_change.type}`);
        lines.push(`- Rationale: ${mrd.structural_change.rationale}`);
        lines.push('');
      }
    }

    lines.push('## Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Laws Immutable | ${report.proof_chain.laws_immutable ? '✓' : '✗'} |`);
    lines.push(`| Computation Deterministic | ${report.proof_chain.computation_deterministic ? '✓' : '✗'} |`);
    lines.push(`| Decision Non-Bypassable | ${report.proof_chain.decision_non_bypassable ? '✓' : '✗'} |`);
    lines.push(`| Tracks Isolated | ${report.proof_chain.tracks_isolated ? '✓' : '✗'} |`);
    lines.push(`| No Human Override | ${report.proof_chain.no_human_override ? '✓' : '✗'} |`);
    lines.push(`| No Policy Config | ${report.proof_chain.no_policy_config ? '✓' : '✗'} |`);
    lines.push(`| No Runtime Flags | ${report.proof_chain.no_runtime_flags ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Forensic Execution Layer (OFEL) v1.0.0*');
    lines.push('');
    lines.push('**NON-BYPASSABLE. READ-ONLY FORENSICS. DETERMINISTIC. PROVABLE CAUSALITY.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: RuntimeControlReport): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  OFEL FINAL SUMMARY');
    console.log('═'.repeat(80));

    const action = report.enforcement.overall_action;
    let emoji: string;
    let status: string;

    switch (action) {
      case 'BLOCK_ALL':
        emoji = '🛑';
        status = 'EXECUTION BLOCKED';
        break;
      case 'FORK_TTE':
        emoji = '⚠️';
        status = 'TTE FORKED';
        break;
      case 'WARN_ONLY':
        emoji = '✅';
        status = report.enforcement.canonical_allowed
          ? 'CANONICAL EXECUTION ALLOWED'
          : 'CANONICAL BLOCKED';
        break;
    }

    // Check for invariant violations
    if (report.shape_classification.invariant_violations.length > 0) {
      emoji = '🔒🛑';
      status = 'INVARIANT VIOLATION - EXECUTION BLOCKED';
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');
    console.log(`  Global RSR: ${(report.rsr_analysis.global_rsr * 100).toFixed(1)}%`);
    console.log(`  Active Tracks: ${report.tte_state.active_tracks.length}`);
    console.log(`  MRDs Generated: ${report.repair_directives.length}`);
    console.log('');

    // OFEL specific info
    if (report.forensics) {
      console.log('  FORENSICS:');
      console.log(`    Fingerprints: ${report.forensics.forensic_summary.total_fingerprints}`);
      console.log(`    Counterfactuals: ${report.forensics.forensic_summary.counterfactuals_executed}`);
      console.log(`    Causal Factors: ${report.forensics.forensic_summary.causal_factors_identified}`);
      console.log(`    Provable Chains: ${report.forensics.forensic_summary.provable_causality_chains}`);
      console.log('');
    }

    console.log('  SHAPE HEALTH:');
    console.log(`    INVARIANT:  ${report.shape_classification.invariant_count} shapes`);
    console.log(`    CAPABILITY: ${report.shape_classification.capability_count} shapes`);
    console.log('');
    console.log('  MORTALITY:');
    console.log(`    Healthy: ${report.mortality_analysis.healthy_count} | Flaky: ${report.mortality_analysis.flaky_count}`);
    console.log(`    Degrading: ${report.mortality_analysis.degrading_count} | Broken: ${report.mortality_analysis.broken_count}`);
    console.log('');
    console.log('  PROOF CHAIN:');
    console.log(`    Laws Immutable:            ${report.proof_chain.laws_immutable ? '✓' : '✗'}`);
    console.log(`    Computation Deterministic: ${report.proof_chain.computation_deterministic ? '✓' : '✗'}`);
    console.log(`    Decision Non-Bypassable:   ${report.proof_chain.decision_non_bypassable ? '✓' : '✗'}`);
    if (report.forensics) {
      console.log(`    Fingerprints Deterministic: ${report.forensics.forensic_proof.fingerprints_deterministic ? '✓' : '✗'}`);
      console.log(`    Counterfactuals Read-Only: ${report.forensics.forensic_proof.counterfactuals_read_only ? '✓' : '✗'}`);
      console.log(`    Causality Provable:        ${report.forensics.forensic_proof.causality_provable ? '✓' : '✗'}`);
    }
    console.log('\n' + '═'.repeat(80) + '\n');
  }

  private createProgressBar(value: number, threshold: number): string {
    const width = 20;
    const safeValue = Math.max(0, Math.min(1, value));
    const filled = Math.round(safeValue * width);
    const empty = width - filled;
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
 * Create synthetic test data that demonstrates selective loss.
 *
 * INVARIANT (STATIC_DISPLAY_CAPABILITY): Must survive ALL handoffs
 * CAPABILITY (FILTER_CAPABILITY, PAGINATION_CAPABILITY): Subject to RSR laws
 *
 * This data simulates loss at H4 (blocks → wire) for capability shapes
 * while the invariant shape also loses attributes (triggering fatal violation).
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

    // WIRE: CRITICAL - LOSS OCCURS HERE
    // Filter and Pagination components are NOT implemented
    // Static display also loses some attributes (INVARIANT violation!)
    wire: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `'use client';
import { TaskCard } from '@/components/TaskCard';

// NOTE: No filter state, no pagination state
// These were lost during summarization

export default function DashboardPage() {
  const tasks = []; // TODO: fetch tasks

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl">My Tasks</h1>
      {/* MISSING: Filter component */}
      {/* MISSING: Pagination component */}
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
          // Static display - but missing layout_type attribute!
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
          // layout_type MISSING! - INVARIANT violation
          type: 'component'
        }
      ]
    },

    // PIXEL: Same issue - attributes never recovered
    pixel: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `// Final styled version - still missing filter and pagination`,
          type: 'code'
        },
        {
          path: 'src/components/TaskCard.tsx',
          content: `// Styled TaskCard with Tailwind`,
          entity: 'tasks',
          displayFields: ['title', 'status'],
          // layout_type still MISSING!
          type: 'styled-component'
        }
      ],
      components: [
        {
          name: 'TaskCard',
          entity: 'tasks',
          displayFields: ['title', 'status']
          // layout_type MISSING - INVARIANT shape partial loss
        }
      ]
    }
  };
}

// Main execution
const runId = `OFEL-${Date.now()}`;
const runner = new OFELRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

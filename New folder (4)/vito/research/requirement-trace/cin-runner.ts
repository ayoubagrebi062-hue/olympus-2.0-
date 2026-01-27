/**
 * CIN Runner (Canonical Intent Normalization)
 *
 * Executes the full CIN-enhanced enforcement flow:
 * 1. ICE execution (produces ALIGNED intents)
 * 2. MSI reduction (minimal structural form)
 * 3. Canonicalization (unique representation)
 * 4. Rewrite enforcement (canonical form enforcement)
 * 5. CIN report generation
 *
 * This is the ENTRY POINT for CIN-enhanced runtime enforcement.
 *
 * NON-NEGOTIABLE:
 * - After necessity, expression is noise.
 * - Truth has one shape.
 * - No configs, flags, overrides, or resets.
 * - Deterministic only.
 *
 * PHILOSOPHY:
 * Olympus does not parse meaning.
 * It enforces form.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES } from './registry/shapes';
import {
  ICEEngine,
  CINEngine,
  type ICEExecutionResult,
  type CINExecutionResult,
  type IntentSignature,
  type MinimalStructuralIntent,
  type CanonicalIntent,
  type RewriteResult
} from './runtime';
import { IntentClassifier } from './runtime/intent-classifier';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

// CIN version - immutable
const CIN_VERSION = '1.0.0';

class CINRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private iceEngine: ICEEngine;
  private cinEngine: CINEngine;
  private intentClassifier: IntentClassifier;

  constructor(simulationSteps: number = 5) {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.iceEngine = new ICEEngine(DATA_DIR, simulationSteps);
    this.cinEngine = new CINEngine(DATA_DIR);
    this.intentClassifier = new IntentClassifier();
  }

  /**
   * Execute full CIN-enhanced enforcement flow
   */
  async execute(
    runId: string,
    agentOutputs: Record<TracedAgentId, unknown>,
    incomingIntents: IntentSignature[] = []
  ): Promise<{ iceResult: ICEExecutionResult; cinResult: CINExecutionResult }> {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS CANONICAL INTENT NORMALIZATION (CIN)');
    console.log('  Mode: CANONICAL_FORM | Gate: REWRITE | Override: IMPOSSIBLE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/16] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/16] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute ICE engine (ICE + NE + IE + AEC + RLL + OCIC + ORIS)
    console.log('\n[3/16] EXECUTING ICE ENFORCEMENT...');
    const iceResult = this.iceEngine.execute(traceResults, gateResult, runId, incomingIntents);
    this.printICESummary(iceResult);

    // Step 4: Execute CIN engine
    console.log('\n[4/16] EXECUTING CIN NORMALIZATION...');
    const cinResult = await this.cinEngine.execute(iceResult.iceIntelligence, runId);
    this.printCINDecision(cinResult);

    // Step 5: Display MSI reductions
    console.log('\n[5/16] MSI REDUCTIONS...');
    this.printMSIReductions(cinResult);

    // Step 6: Display canonical intents
    console.log('\n[6/16] CANONICAL INTENTS...');
    this.printCanonicalIntents(cinResult);

    // Step 7: Display rewrite results
    console.log('\n[7/16] REWRITE RESULTS...');
    this.printRewriteResults(cinResult);

    // Step 8: Display equivalence classes
    console.log('\n[8/16] EQUIVALENCE CLASSES...');
    this.printEquivalenceClasses(cinResult);

    // Step 9: Display normalization explanations
    console.log('\n[9/16] NORMALIZATION EXPLANATIONS...');
    this.printNormalizationExplanations(cinResult);

    // Step 10: Display CIN proof chain
    console.log('\n[10/16] CIN PROOF CHAIN...');
    this.printCINProof(cinResult);

    // Step 11: Generate reports
    console.log('\n[11/16] GENERATING CIN REPORTS...');
    this.writeReports(iceResult, cinResult, runId);

    // Step 12: Display statistics
    console.log('\n[12/16] STATISTICS...');
    this.printStatistics(cinResult);

    // Step 13: Philosophy
    console.log('\n[13/16] PHILOSOPHY...');
    this.printPhilosophy(cinResult);

    // Step 14: Final summary
    console.log('\n[14/16] FINAL DECISION...');
    this.printFinalSummary(iceResult, cinResult);

    // Step 15: Output comparison
    console.log('\n[15/16] OUTPUT COMPARISON...');
    this.printOutputComparison(cinResult);

    // Step 16: Conclusion
    console.log('\n[16/16] CONCLUSION...');
    this.printConclusion(cinResult);

    return { iceResult, cinResult };
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

  private printICESummary(iceResult: ICEExecutionResult): void {
    const ice = iceResult.iceIntelligence;

    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    ICE SUMMARY                                │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Necessity Active:     ${this.padRight(String(ice.summary.necessity_active), 35)} │`);
    console.log(`  │  Cone Derived:         ${this.padRight(String(ice.summary.cone_derived), 35)} │`);
    console.log(`  │  Intents Processed:    ${this.padRight(String(ice.summary.intents_processed), 35)} │`);
    console.log(`  │  ALIGNED Intents:      ${this.padRight(String(ice.classifications.filter(c => c.classification === 'ALIGNED').length), 35)} │`);
    console.log(`  │  Rejection Rate:       ${this.padRight((ice.summary.rejection_rate * 100).toFixed(1) + '%', 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printCINDecision(cinResult: CINExecutionResult): void {
    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                 CIN NORMALIZATION DECISION                    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Necessity Active:     ${this.padRight(String(cinResult.summary.necessity_active), 35)} │`);
    console.log(`  │  Intents Normalized:   ${this.padRight(String(cinResult.summary.intents_normalized), 35)} │`);
    console.log(`  │  MSIs Produced:        ${this.padRight(String(cinResult.summary.msis_produced), 35)} │`);
    console.log(`  │  Canonicals Produced:  ${this.padRight(String(cinResult.summary.canonicals_produced), 35)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Rewrites Performed:   ${this.padRight(String(cinResult.summary.rewrites_performed), 35)} │`);
    console.log(`  │  Passthroughs:         ${this.padRight(String(cinResult.summary.passthroughs), 35)} │`);
    console.log(`  │  Rewrite Rate:         ${this.padRight((cinResult.summary.rewrite_rate * 100).toFixed(1) + '%', 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printMSIReductions(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    MSI REDUCTIONS                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total MSIs:           ${this.padRight(String(cinResult.msis.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.msis.length > 0) {
      console.log('\n  MSI DETAILS:');
      for (const msi of cinResult.msis.slice(0, 5)) {
        console.log(`\n  📉 ${msi.msi_id}`);
        console.log(`     Source Intent: ${msi.source_intent_id}`);
        console.log(`     Essential Shapes: ${msi.minimal_components.essential_shapes.join(', ') || 'none'}`);
        console.log(`     Essential Ops: ${msi.minimal_components.essential_operations.join(', ')}`);
        console.log(`     Essential Outcome: ${msi.minimal_components.essential_outcome}`);
        console.log(`     Stripped:`);
        console.log(`       Shapes: ${msi.reduction_report.shapes_stripped.length}`);
        console.log(`       Handoffs: ${msi.reduction_report.handoffs_stripped.length}`);
        console.log(`       Operations: ${msi.reduction_report.operations_stripped.join(', ') || 'none'}`);
        console.log(`     MCCS Backed: ${msi.mccs_backing.fully_backed ? '✓ YES' : '✗ NO'}`);
      }
      if (cinResult.msis.length > 5) {
        console.log(`\n  ... and ${cinResult.msis.length - 5} more MSIs`);
      }
    } else {
      console.log('\n  No MSIs produced (no ALIGNED intents or no necessity).');
    }
  }

  private printCanonicalIntents(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  CANONICAL INTENTS                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Unique Canonicals:    ${this.padRight(String(cinResult.canonical_intents.length), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.canonical_intents.length > 0) {
      console.log('\n  CANONICAL DETAILS:');
      for (const canonical of cinResult.canonical_intents.slice(0, 5)) {
        console.log(`\n  📐 ${canonical.canonical_id}`);
        console.log(`     Fingerprint: ${canonical.canonical_fingerprint}`);
        console.log(`     Source MSI: ${canonical.source_msi_id}`);
        console.log(`     Components:`);
        console.log(`       Shapes: ${canonical.canonical_components.shapes.join(', ') || 'none'}`);
        console.log(`       Handoffs: ${canonical.canonical_components.handoffs.join(', ') || 'none'}`);
        console.log(`       Operations: ${canonical.canonical_components.operations.join(', ')}`);
        console.log(`       Outcome: ${canonical.canonical_components.outcome}`);
        console.log(`     Equivalence Class Size: ${canonical.equivalence_class.equivalence_count}`);
      }
      if (cinResult.canonical_intents.length > 5) {
        console.log(`\n  ... and ${cinResult.canonical_intents.length - 5} more canonicals`);
      }
    } else {
      console.log('\n  No canonical intents produced.');
    }
  }

  private printRewriteResults(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                   REWRITE RESULTS                             │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Total Rewrites:       ${this.padRight(String(cinResult.rewrite_results.length), 35)} │`);

    const passthroughs = cinResult.rewrite_results.filter(r => r.action === 'PASSTHROUGH').length;
    const rewrites = cinResult.rewrite_results.filter(r => r.action === 'REWRITE_INTENT').length;

    console.log(`  │  PASSTHROUGH:          ${this.padRight(String(passthroughs), 35)} │`);
    console.log(`  │  REWRITE_INTENT:       ${this.padRight(String(rewrites), 35)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.rewrite_results.length > 0) {
      console.log('\n  REWRITE DETAILS:');
      for (const result of cinResult.rewrite_results.slice(0, 5)) {
        const emoji = result.action === 'PASSTHROUGH' ? '✓' : '✏️';
        console.log(`\n  ${emoji} ${result.rewrite_id}`);
        console.log(`     Action: ${result.action}`);
        console.log(`     Original Intent: ${result.original_intent.intent_id}`);
        console.log(`     Original Fingerprint: ${result.original_intent.fingerprint}`);
        console.log(`     Canonical Fingerprint: ${result.canonical_intent.canonical_fingerprint}`);

        if (result.rewrite_proof) {
          console.log(`     Rewrite Reason: ${result.rewrite_proof.rewrite_reason}`);
          console.log(`     Changes:`);
          if (result.rewrite_proof.changes.shapes_removed.length > 0) {
            console.log(`       Shapes Removed: ${result.rewrite_proof.changes.shapes_removed.join(', ')}`);
          }
          if (result.rewrite_proof.changes.operations_removed.length > 0) {
            console.log(`       Ops Removed: ${result.rewrite_proof.changes.operations_removed.join(', ')}`);
          }
          if (result.rewrite_proof.changes.outcome_changed) {
            console.log(`       Outcome Changed: YES`);
          }
        }

        console.log(`     Info Loss: ${result.enforcement_proof.no_information_loss ? 'NO' : 'YES'}`);
      }
      if (cinResult.rewrite_results.length > 5) {
        console.log(`\n  ... and ${cinResult.rewrite_results.length - 5} more rewrites`);
      }
    } else {
      console.log('\n  No rewrites performed.');
    }
  }

  private printEquivalenceClasses(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  EQUIVALENCE CLASSES                          │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.canonical_intents.length > 0) {
      console.log('\n  Each canonical represents an equivalence class of structurally');
      console.log('  equivalent intents. Intents that reduce to the same MSI collapse');
      console.log('  to the same canonical form.');
      console.log('');

      for (const canonical of cinResult.canonical_intents) {
        const classSize = canonical.equivalence_class.equivalence_count;
        console.log(`  📊 ${canonical.canonical_fingerprint}`);
        console.log(`     Class Size: ${classSize} intent(s)`);
        console.log(`     Members: ${canonical.equivalence_class.equivalent_fingerprints.slice(0, 3).join(', ')}${classSize > 3 ? '...' : ''}`);
        console.log('');
      }
    } else {
      console.log('\n  No equivalence classes (no canonicals).');
    }
  }

  private printNormalizationExplanations(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │               NORMALIZATION EXPLANATIONS                      │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    for (const explanation of cinResult.normalization_explanations) {
      console.log(`  ${explanation}`);
    }
  }

  private printCINProof(cinResult: CINExecutionResult): void {
    const intelligence = this.cinEngine.generateIntelligence(cinResult);
    const proof = intelligence.proof_chain;

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    CIN PROOF CHAIN                            │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  MSI Reduction Complete:        ${this.padRight(proof.msi_reduction_complete ? '✓' : '✗', 23)} │`);
    console.log(`  │  Canonicalization Unique:       ${this.padRight(proof.canonicalization_unique ? '✓' : '✗', 23)} │`);
    console.log(`  │  Rewrite Enforcement Applied:   ${this.padRight(proof.rewrite_enforcement_applied ? '✓' : '✗', 23)} │`);
    console.log(`  │  Structural Equivalence Proven: ${this.padRight(proof.structural_equivalence_proven ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Heuristics:                 ${this.padRight(proof.no_heuristics ? '✓' : '✗', 23)} │`);
    console.log(`  │  No ML:                         ${this.padRight(proof.no_ml ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Probability:                ${this.padRight(proof.no_probability ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Config:                     ${this.padRight(proof.no_config ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Flag:                       ${this.padRight(proof.no_flag ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Override:                   ${this.padRight(proof.no_override ? '✓' : '✗', 23)} │`);
    console.log(`  │  No Reset:                      ${this.padRight(proof.no_reset ? '✓' : '✗', 23)} │`);
    console.log(`  │  History Append-Only:           ${this.padRight(proof.history_append_only ? '✓' : '✗', 23)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private writeReports(iceResult: ICEExecutionResult, cinResult: CINExecutionResult, runId: string): void {
    // Ensure directories exist
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'cin-normalization-report.json');
    const intelligence = this.cinEngine.generateIntelligence(cinResult);
    fs.writeFileSync(jsonPath, JSON.stringify({
      run_id: runId,
      cin: intelligence,
      ice_summary: iceResult.iceIntelligence.summary,
      execution_allowed: iceResult.executionAllowed,
      mutations_allowed: iceResult.mutationsAllowed
    }, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'cin-normalization-report.md');
    fs.writeFileSync(mdPath, this.cinEngine.generateMarkdownReport(cinResult));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private printStatistics(cinResult: CINExecutionResult): void {
    const dbStats = this.cinEngine.getDatabaseStats();

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                      STATISTICS                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  This Run:                                                    │`);
    console.log(`  │    Intents Normalized:    ${this.padRight(String(cinResult.summary.intents_normalized), 31)} │`);
    console.log(`  │    MSIs Produced:         ${this.padRight(String(cinResult.summary.msis_produced), 31)} │`);
    console.log(`  │    Canonicals Produced:   ${this.padRight(String(cinResult.summary.canonicals_produced), 31)} │`);
    console.log(`  │    Rewrite Rate:          ${this.padRight((cinResult.summary.rewrite_rate * 100).toFixed(1) + '%', 31)} │`);

    if (dbStats) {
      console.log('  ├─────────────────────────────────────────────────────────────┤');
      console.log(`  │  All Time (Database):                                        │`);
      console.log(`  │    Total Normalized:     ${this.padRight(String(dbStats.total_intents_normalized), 32)} │`);
      console.log(`  │    Total Rewrites:       ${this.padRight(String(dbStats.total_rewrites), 32)} │`);
      console.log(`  │    Unique Canonicals:    ${this.padRight(String(dbStats.unique_canonicals), 32)} │`);
      console.log(`  │    Avg Equiv Class Size: ${this.padRight(dbStats.average_equivalence_class_size.toFixed(2), 32)} │`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');
  }

  private printPhilosophy(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                      PHILOSOPHY                               │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │                                                               │');
    console.log('  │  "After necessity, expression is noise."                      │');
    console.log('  │  "Truth has one shape."                                       │');
    console.log('  │                                                               │');
    console.log('  │  "Olympus does not parse meaning."                            │');
    console.log('  │  "It enforces form."                                          │');
    console.log('  │                                                               │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.summary.necessity_active && cinResult.summary.intents_normalized > 0) {
      console.log('\n  CANONICAL FORM HAS BEEN ENFORCED.');
      console.log('  Every ALIGNED intent now has exactly one representation.');
      console.log('  Structurally equivalent intents collapse to the same form.');
    } else if (!cinResult.summary.necessity_active) {
      console.log('\n  NO NECESSITY ACTIVE.');
      console.log('  Canonical normalization cannot proceed without necessity.');
      console.log('  Intents remain in their original form.');
    }
  }

  private printFinalSummary(iceResult: ICEExecutionResult, cinResult: CINExecutionResult): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  CIN FINAL DECISION');
    console.log('═'.repeat(80));

    let emoji: string;
    let status: string;

    if (!cinResult.summary.necessity_active) {
      emoji = '🔓❓';
      status = 'NO NECESSITY - Canonicalization not applied';
    } else if (cinResult.summary.intents_normalized === 0) {
      emoji = '🔒📭';
      status = 'NO ALIGNED INTENTS - Nothing to normalize';
    } else if (cinResult.summary.rewrites_performed === 0) {
      emoji = '✅📐';
      status = 'ALL CANONICAL - No rewrites needed';
    } else {
      emoji = '✏️📐';
      status = `NORMALIZED - ${cinResult.summary.rewrites_performed} intents rewritten`;
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');

    console.log('  CIN METRICS:');
    console.log(`    Necessity Active:     ${cinResult.summary.necessity_active ? '🔒 YES' : 'NO'}`);
    console.log(`    Intents Normalized:   ${cinResult.summary.intents_normalized}`);
    console.log(`    MSIs Produced:        ${cinResult.summary.msis_produced}`);
    console.log(`    Canonicals Produced:  ${cinResult.summary.canonicals_produced}`);
    console.log(`    Rewrites Performed:   ${cinResult.summary.rewrites_performed}`);
    console.log(`    Passthroughs:         ${cinResult.summary.passthroughs}`);
    console.log(`    Rewrite Rate:         ${(cinResult.summary.rewrite_rate * 100).toFixed(1)}%`);
    console.log('');

    const intelligence = this.cinEngine.generateIntelligence(cinResult);
    console.log('  CIN PROOF CHAIN:');
    console.log(`    MSI Reduction Complete:        ${intelligence.proof_chain.msi_reduction_complete ? '✓' : '✗'}`);
    console.log(`    Canonicalization Unique:       ${intelligence.proof_chain.canonicalization_unique ? '✓' : '✗'}`);
    console.log(`    Rewrite Enforcement Applied:   ${intelligence.proof_chain.rewrite_enforcement_applied ? '✓' : '✗'}`);
    console.log(`    Structural Equivalence Proven: ${intelligence.proof_chain.structural_equivalence_proven ? '✓' : '✗'}`);
    console.log(`    No Config/Flag/Override:       ${intelligence.proof_chain.no_config ? '✓' : '✗'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('  AFTER NECESSITY, EXPRESSION IS NOISE.');
    console.log('═'.repeat(80));
    console.log('  TRUTH HAS ONE SHAPE.');
    console.log('═'.repeat(80) + '\n');
  }

  private printOutputComparison(cinResult: CINExecutionResult): void {
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                  OUTPUT COMPARISON                            │');
    console.log('  └─────────────────────────────────────────────────────────────┘');

    if (cinResult.rewrite_results.length > 0) {
      console.log('\n  Original Intent → Canonical Intent');
      console.log('  ─────────────────────────────────────');

      for (const result of cinResult.rewrite_results.slice(0, 3)) {
        const orig = result.original_intent;
        const out = result.output_intent;

        console.log(`\n  BEFORE: ${orig.intent_id}`);
        console.log(`    Shapes: ${orig.components.target_shapes.join(', ') || 'none'}`);
        console.log(`    Ops: ${orig.components.intended_operations.join(', ')}`);
        console.log(`    Outcome: ${orig.components.expected_outcome}`);
        console.log(`    Fingerprint: ${orig.fingerprint}`);

        console.log(`  AFTER: ${out.intent_id}`);
        console.log(`    Shapes: ${out.components.target_shapes.join(', ') || 'none'}`);
        console.log(`    Ops: ${out.components.intended_operations.join(', ')}`);
        console.log(`    Outcome: ${out.components.expected_outcome}`);
        console.log(`    Fingerprint: ${out.fingerprint}`);

        const changed = result.action === 'REWRITE_INTENT' ? '✏️ REWRITTEN' : '✓ UNCHANGED';
        console.log(`  Result: ${changed}`);
      }
    } else {
      console.log('\n  No intents were processed through CIN.');
    }
  }

  private printConclusion(cinResult: CINExecutionResult): void {
    console.log('  The Canonical Intent Normalization engine has executed.');
    console.log('');

    if (cinResult.summary.necessity_active && cinResult.summary.intents_normalized > 0) {
      console.log('  📐 A NecessaryFuture exists.');
      console.log('  📐 All ALIGNED intents have been reduced to MSI.');
      console.log('  📐 All MSIs have been canonicalized.');
      console.log('  📐 Canonical form has been enforced.');
      console.log('');
      console.log('  Every intent now has exactly one valid representation.');
      console.log('  Structurally equivalent intents share the same canonical form.');
      console.log('  Expression has been normalized. Truth has one shape.');
    } else if (!cinResult.summary.necessity_active) {
      console.log('  🔓 No NecessaryFuture exists.');
      console.log('  🔓 Canonical normalization cannot be applied.');
      console.log('  🔓 Intents remain in their original form.');
    } else {
      console.log('  📭 No ALIGNED intents to normalize.');
      console.log('  📭 CIN had nothing to process.');
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
 * Create test intents (including some that will be ALIGNED)
 */
function createTestIntents(classifier: IntentClassifier, runId: string): IntentSignature[] {
  const intents: IntentSignature[] = [];

  // Intent 1: ALIGNED - Read tasks (should be allowed and canonicalized)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['FILTER_CAPABILITY'],
    [],
    ['READ'],
    'PRESERVE'
  ));

  // Intent 2: NON_CAUSAL - Modify unrelated shape (will be rejected by ICE)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['UNKNOWN_SHAPE'],
    [],
    ['UPDATE'],
    'MODIFY'
  ));

  // Intent 3: CONTRADICTORY - Delete operation (will be rejected by ICE)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['FILTER_CAPABILITY'],
    [],
    ['DELETE'],
    'DESTROY'
  ));

  // Intent 4: ALIGNED - Restore capability (should be allowed and canonicalized)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['PAGINATION_CAPABILITY'],
    [],
    ['UPDATE', 'TRANSFORM'],
    'RESTORE'
  ));

  // Intent 5: ALIGNED - Read with extra shapes (will be reduced by MSI)
  intents.push(classifier.createIntentSignature(
    'test-agent',
    runId,
    ['FILTER_CAPABILITY', 'EXTRA_SHAPE_1', 'EXTRA_SHAPE_2'],
    ['extra_handoff'],
    ['READ', 'UPDATE'],
    'PRESERVE'
  ));

  // Intent 6: ALIGNED - Structurally equivalent to Intent 1 (should collapse to same canonical)
  intents.push(classifier.createIntentSignature(
    'test-agent-2',
    runId,
    ['FILTER_CAPABILITY'],
    [],
    ['READ'],
    'PRESERVE'
  ));

  return intents;
}

// Main execution
async function main() {
  const runId = `CIN-${Date.now()}`;
  const runner = new CINRunner(5);
  const agentOutputs = createTestData();
  const classifier = new IntentClassifier();
  const testIntents = createTestIntents(classifier, runId);

  console.log('\n📝 Test Intents Created:');
  for (const intent of testIntents) {
    console.log(`  - ${intent.intent_id}: ${intent.components.intended_operations.join(', ')} → ${intent.components.expected_outcome}`);
  }

  await runner.execute(runId, agentOutputs, testIntents);
}

main().catch(console.error);

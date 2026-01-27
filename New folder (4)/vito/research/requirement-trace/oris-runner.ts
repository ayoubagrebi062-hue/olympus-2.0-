/**
 * ORIS Runner (OLYMPUS Runtime Immune System)
 *
 * Executes the full ORIS-enhanced enforcement flow:
 * 1. Shape tracing
 * 2. Invariant validation
 * 3. Mortality tracking
 * 4. RSR enforcement
 * 5. MRD generation
 * 6. Proof-carrying report generation
 *
 * This is the ENTRY POINT for ORIS-enhanced runtime enforcement.
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
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId, HandoffId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');
const DATA_DIR = path.join(__dirname, 'data');

class ORISRunner {
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
   * Execute full ORIS-enhanced enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  OLYMPUS RUNTIME IMMUNE SYSTEM (ORIS)');
    console.log('  Mode: RUNTIME_PRIMITIVE | Bypassable: FALSE | Override: NONE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/7] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE
    console.log('\n[2/7] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute ORIS-enhanced enforcement
    console.log('\n[3/7] EXECUTING ORIS ENFORCEMENT...');
    const orisResult = this.orisEngine.enforce(traceResults, gateResult, runId);
    this.printEnforcementDecision(orisResult);

    // Step 4: Display invariant violations
    console.log('\n[4/7] INVARIANT VALIDATION...');
    this.printInvariantViolations(orisResult.invariant_violations);

    // Step 5: Display mortality analysis
    console.log('\n[5/7] MORTALITY ANALYSIS...');
    this.printMortalityAnalysis(orisResult);

    // Step 6: Display MRDs
    console.log('\n[6/7] MINIMAL REPAIR DIRECTIVES...');
    this.printRepairDirectives(orisResult.repair_directives);

    // Step 7: Generate report
    console.log('\n[7/7] GENERATING ORIS REPORT...');
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
    console.log('  │                 ORIS ENFORCEMENT DECISION                     │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Overall Action:    ${this.padRight(decision.overall_action, 40)} │`);
    console.log(`  │  Canonical Allowed: ${this.padRight(String(decision.canonical_allowed), 40)} │`);
    console.log(`  │  TTE Fork Required: ${this.padRight(String(decision.tte_decision.fork_required), 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  VIOLATIONS BY TIER                                          │');
    console.log(`  │  FOUNDATIONAL: ${this.padRight(String(decision.foundational_violations.length) + ' violations', 45)} │`);
    console.log(`  │  INTERACTIVE:  ${this.padRight(String(decision.interactive_violations.length) + ' violations', 45)} │`);
    console.log(`  │  ENHANCEMENT:  ${this.padRight(String(decision.enhancement_violations.length) + ' violations', 45)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  INVARIANT VIOLATIONS                                         │');
    console.log(`  │  Count: ${this.padRight(String(orisResult.invariant_violations.length), 52)} │`);
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

    if (mortality.most_dangerous_handoffs.length > 0) {
      console.log('\n  Most Dangerous Handoffs:');
      for (const handoffId of mortality.most_dangerous_handoffs) {
        console.log(`    ⚠ ${handoffId}`);
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
      console.log(`     Rationale: ${mrd.structural_change.rationale.substring(0, 60)}...`);
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
    const jsonPath = path.join(REPORTS_DIR, 'oris-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'oris-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: RuntimeControlReport): string {
    const lines: string[] = [];

    lines.push('# ORIS Enforcement Report');
    lines.push('');
    lines.push('> OLYMPUS Runtime Immune System');
    lines.push('');

    lines.push('## Metadata');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Generated | ${report.metadata.generated_at} |`);
    lines.push(`| Run ID | ${report.metadata.run_id} |`);
    lines.push(`| Mode | ${report.metadata.enforcement_mode} |`);
    lines.push(`| ORIS Version | ${report.metadata.oris_version} |`);
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

    lines.push('## Mortality Analysis');
    lines.push('');
    lines.push('| Status | Count |');
    lines.push('|--------|-------|');
    lines.push(`| HEALTHY | ${report.mortality_analysis.healthy_count} |`);
    lines.push(`| FLAKY | ${report.mortality_analysis.flaky_count} |`);
    lines.push(`| DEGRADING | ${report.mortality_analysis.degrading_count} |`);
    lines.push(`| SYSTEMICALLY_BROKEN | ${report.mortality_analysis.broken_count} |`);
    lines.push('');

    if (report.mortality_analysis.most_vulnerable_shapes.length > 0) {
      lines.push('**Most Vulnerable Shapes:**');
      for (const shapeId of report.mortality_analysis.most_vulnerable_shapes) {
        lines.push(`- ${shapeId}`);
      }
      lines.push('');
    }

    if (report.mortality_analysis.most_dangerous_handoffs.length > 0) {
      lines.push('**Most Dangerous Handoffs:**');
      for (const h of report.mortality_analysis.most_dangerous_handoffs) {
        lines.push(`- ${h}`);
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
    lines.push('*Report generated by OLYMPUS Runtime Immune System (ORIS) v1.0.0*');
    lines.push('');
    lines.push('**NON-BYPASSABLE. NO FLAGS. NO ENV VARS. NO OVERRIDES. DETERMINISTIC.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: RuntimeControlReport): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  ORIS FINAL SUMMARY');
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
    console.log(`    No Human Override:         ${report.proof_chain.no_human_override ? '✓' : '✗'}`);
    console.log(`    No Policy Config:          ${report.proof_chain.no_policy_config ? '✓' : '✗'}`);
    console.log(`    No Runtime Flags:          ${report.proof_chain.no_runtime_flags ? '✓' : '✗'}`);
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
const runId = `ORIS-${Date.now()}`;
const runner = new ORISRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

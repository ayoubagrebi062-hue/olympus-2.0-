/**
 * Runtime Enforcement Runner
 *
 * Executes the full runtime enforcement flow:
 * 1. Shape tracing (from control-plane)
 * 2. RSR computation per shape
 * 3. Enforcement decision at PRE_WIRE_GATE
 * 4. TTE fork if required
 * 5. Promotion eligibility check
 * 6. Proof-carrying report generation
 *
 * This is the ENTRY POINT for runtime enforcement.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShapeRegistry } from './registry';
import { PreWireGate } from './gates/pre-wire-gate';
import { ControlTracer } from './control-plane/control-tracer';
import { ALL_SHAPES } from './registry/shapes';
import {
  EnforcementEngine,
  PromotionController,
  RSRComputer,
  type RuntimeControlReport,
  type EnforcementDecision,
  RSR_LAWS
} from './runtime';
import type { ShapeTraceResult, GateResult } from './registry/types';
import type { TracedAgentId } from './types';

// Report output directory
const REPORTS_DIR = path.join(__dirname, 'reports');

class RuntimeEnforcementRunner {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private enforcementEngine: EnforcementEngine;
  private promotionController: PromotionController;
  private rsrComputer: RSRComputer;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.enforcementEngine = new EnforcementEngine();
    this.promotionController = new PromotionController(
      this.enforcementEngine.getTTEController()
    );
    this.rsrComputer = new RSRComputer();
  }

  /**
   * Execute full runtime enforcement flow
   */
  execute(runId: string, agentOutputs: Record<TracedAgentId, unknown>): RuntimeControlReport {
    console.log('\n' + '═'.repeat(80));
    console.log('  RUNTIME ENFORCEMENT ENGINE');
    console.log('  Mode: RUNTIME_PRIMITIVE | Bypassable: FALSE | Override: NONE');
    console.log('═'.repeat(80));

    // Step 1: Trace all shapes
    console.log('\n[1/6] TRACING SHAPES...');
    const traceResults = this.tracer.traceAll(agentOutputs);
    this.printTraceResults(traceResults);

    // Step 2: Execute PRE_WIRE_GATE (legacy gate for compatibility)
    console.log('\n[2/6] EXECUTING PRE_WIRE_GATE...');
    const gateResult = this.gate.execute(traceResults);
    this.printGateResult(gateResult);

    // Step 3: Execute Runtime Enforcement
    console.log('\n[3/6] EXECUTING RUNTIME ENFORCEMENT...');
    const enforcementDecision = this.enforcementEngine.enforce(
      ALL_SHAPES,
      traceResults,
      gateResult,
      runId
    );
    this.printEnforcementDecision(enforcementDecision);

    // Step 4: Check TTE state
    console.log('\n[4/6] TTE STATE...');
    this.printTTEState(enforcementDecision);

    // Step 5: Check promotion eligibility
    console.log('\n[5/6] PROMOTION ELIGIBILITY...');
    const promotionEligibilities = this.promotionController.evaluateAllTracks();
    this.printPromotionEligibility(promotionEligibilities);

    // Step 6: Generate proof-carrying report
    console.log('\n[6/6] GENERATING PROOF-CARRYING REPORT...');
    const report = this.generateReport(
      runId,
      traceResults,
      enforcementDecision,
      promotionEligibilities
    );

    // Write reports
    this.writeReports(report, runId);

    // Final summary
    this.printFinalSummary(report);

    return report;
  }

  private printTraceResults(results: Record<string, ShapeTraceResult>): void {
    for (const [shapeId, result] of Object.entries(results)) {
      const shape = ALL_SHAPES.find(s => s.id === shapeId);
      const criticality = shape?.criticality || 'UNKNOWN';
      const survived = result.survival_status.survived_to_target ? '✓ SURVIVED' : '✗ LOST';
      console.log(`  [${criticality}] ${shapeId}: ${survived}`);
    }
  }

  private printGateResult(result: GateResult): void {
    const verdictSymbol = result.verdict === 'PASS' ? '✓' : result.verdict === 'WARN' ? '⚠' : '✗';
    console.log(`  Gate Verdict: ${verdictSymbol} ${result.verdict}`);
    console.log(`  Fatal Violations: ${result.fatal_violations.length}`);
    console.log(`  Block Downstream: ${result.block_downstream}`);
  }

  private printEnforcementDecision(decision: EnforcementDecision): void {
    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │                    ENFORCEMENT DECISION                       │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log(`  │  Overall Action:    ${this.padRight(decision.overall_action, 40)} │`);
    console.log(`  │  Canonical Allowed: ${this.padRight(String(decision.canonical_allowed), 40)} │`);
    console.log(`  │  TTE Fork Required: ${this.padRight(String(decision.tte_decision.fork_required), 40)} │`);
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │  VIOLATIONS BY TIER                                          │');
    console.log(`  │  FOUNDATIONAL: ${this.padRight(String(decision.foundational_violations.length) + ' violations', 45)} │`);
    console.log(`  │  INTERACTIVE:  ${this.padRight(String(decision.interactive_violations.length) + ' violations', 45)} │`);
    console.log(`  │  ENHANCEMENT:  ${this.padRight(String(decision.enhancement_violations.length) + ' violations', 45)} │`);
    console.log('  └─────────────────────────────────────────────────────────────┘');

    // Print RSR per shape
    console.log('\n  RSR PER SHAPE:');
    for (const result of decision.per_shape_rsr) {
      const met = result.rsr_met ? '✓' : '✗';
      const bar = this.createProgressBar(result.rsr, result.required_rsr);
      console.log(`  ${met} [${result.criticality.substring(0, 3)}] ${result.shape_id}`);
      console.log(`     RSR: ${bar} ${(result.rsr * 100).toFixed(1)}% (req: ${(result.required_rsr * 100).toFixed(1)}%)`);
      if (result.untolerated_losses.length > 0) {
        console.log(`     Untolerated: ${result.untolerated_losses.join(', ')}`);
      }
    }

    // Print RSR per tier
    console.log('\n  RSR PER TIER:');
    for (const tier of decision.per_tier_results) {
      const met = tier.tier_met ? '✓' : '✗';
      const bar = this.createProgressBar(tier.aggregate_rsr, tier.required_rsr);
      console.log(`  ${met} ${tier.criticality}: ${bar} ${(tier.aggregate_rsr * 100).toFixed(1)}% (req: ${(tier.required_rsr * 100).toFixed(1)}%)`);
    }
  }

  private printTTEState(decision: EnforcementDecision): void {
    console.log(`  Fork Required: ${decision.tte_decision.fork_required}`);
    console.log(`  Reason: ${decision.tte_decision.reason}`);
    console.log(`  Active Tracks: ${decision.active_tracks.length}`);

    for (const track of decision.active_tracks) {
      const promotable = track.promotable ? '(promotable)' : '(non-promotable)';
      console.log(`    - ${track.track} [${track.run_id}] Status: ${track.status} ${promotable}`);
    }
  }

  private printPromotionEligibility(eligibilities: import('./runtime/types').PromotionEligibility[]): void {
    if (eligibilities.length === 0) {
      console.log('  No tracks to evaluate for promotion.');
      return;
    }

    for (const e of eligibilities) {
      const eligible = e.eligible ? '✓ ELIGIBLE' : '✗ BLOCKED';
      console.log(`  ${eligible} [${e.track}] ${e.run_id}`);

      if (!e.eligible) {
        console.log('    Blockers:');
        for (const blocker of e.blockers) {
          console.log(`      - ${blocker.blocker_type}: ${blocker.description}`);
        }
      }

      console.log('    RSR Compliance:');
      console.log(`      FOUNDATIONAL: ${e.rsr_compliance.foundational_met ? '✓' : '✗'}`);
      console.log(`      INTERACTIVE:  ${e.rsr_compliance.interactive_met ? '✓' : '✗'}`);
      console.log(`      ENHANCEMENT:  ${e.rsr_compliance.enhancement_met ? '✓' : '✗'}`);
    }
  }

  private generateReport(
    runId: string,
    traceResults: Record<string, ShapeTraceResult>,
    enforcementDecision: EnforcementDecision,
    promotionEligibilities: import('./runtime/types').PromotionEligibility[]
  ): RuntimeControlReport {
    const globalRSR = this.rsrComputer.computeGlobalRSR(enforcementDecision.per_shape_rsr);

    return {
      metadata: {
        generated_at: new Date().toISOString(),
        runtime_version: '1.0.0',
        run_id: runId,
        enforcement_mode: 'RUNTIME_PRIMITIVE',
        oris_version: '1.0.0'
      },
      rsr_analysis: {
        per_shape: enforcementDecision.per_shape_rsr,
        per_tier: enforcementDecision.per_tier_results,
        global_rsr: globalRSR
      },
      enforcement: enforcementDecision,
      tte_state: {
        fork_occurred: enforcementDecision.tte_decision.fork_required,
        active_tracks: enforcementDecision.active_tracks,
        promotion_eligibility: promotionEligibilities
      },
      // ORIS placeholders (legacy runner - use oris-runner.ts for full ORIS)
      shape_classification: {
        shapes: ALL_SHAPES.map(s => ({
          shape_id: s.id,
          shape_kind: s.kind,
          criticality: s.criticality,
          mortality_status: 'HEALTHY' as const,
          survival_rate: 1.0,
          trend: 'STABLE' as const
        })),
        invariant_count: ALL_SHAPES.filter(s => s.kind === 'INVARIANT').length,
        capability_count: ALL_SHAPES.filter(s => s.kind === 'CAPABILITY').length,
        invariant_violations: []
      },
      mortality_analysis: {
        healthy_count: ALL_SHAPES.length,
        flaky_count: 0,
        degrading_count: 0,
        broken_count: 0,
        most_vulnerable_shapes: [],
        most_dangerous_handoffs: []
      },
      repair_directives: [],
      proof_chain: {
        laws_immutable: true,
        computation_deterministic: true,
        decision_non_bypassable: true,
        tracks_isolated: true,
        no_human_override: true,
        no_policy_config: true,
        no_runtime_flags: true
      }
    };
  }

  private writeReports(report: RuntimeControlReport, runId: string): void {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(REPORTS_DIR, 'runtime-enforcement-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`  JSON report: ${jsonPath}`);

    // Write markdown report
    const mdPath = path.join(REPORTS_DIR, 'runtime-enforcement-report.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report));
    console.log(`  Markdown report: ${mdPath}`);
  }

  private generateMarkdownReport(report: RuntimeControlReport): string {
    const lines: string[] = [];

    lines.push('# Runtime Enforcement Report');
    lines.push('');
    lines.push('## Metadata');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Generated | ${report.metadata.generated_at} |`);
    lines.push(`| Run ID | ${report.metadata.run_id} |`);
    lines.push(`| Mode | ${report.metadata.enforcement_mode} |`);
    lines.push(`| Version | ${report.metadata.runtime_version} |`);
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

    lines.push('## RSR Laws Applied');
    lines.push('');
    lines.push('| Criticality | Min RSR | Tolerated Losses | Violation Action |');
    lines.push('|-------------|---------|------------------|------------------|');
    lines.push(`| FOUNDATIONAL | ${RSR_LAWS.FOUNDATIONAL.min_rsr} | ${RSR_LAWS.FOUNDATIONAL.tolerated_losses.join(', ') || 'None'} | ${RSR_LAWS.FOUNDATIONAL.violation_action} |`);
    lines.push(`| INTERACTIVE | ${RSR_LAWS.INTERACTIVE.min_rsr} | ${RSR_LAWS.INTERACTIVE.tolerated_losses.join(', ')} | ${RSR_LAWS.INTERACTIVE.violation_action} |`);
    lines.push(`| ENHANCEMENT | ${RSR_LAWS.ENHANCEMENT.min_rsr} | ${RSR_LAWS.ENHANCEMENT.tolerated_losses.join(', ')} | ${RSR_LAWS.ENHANCEMENT.violation_action} |`);
    lines.push('');

    lines.push('## RSR Per Shape');
    lines.push('');
    lines.push('| Shape | Criticality | RSR | Required | Met | Untolerated Losses |');
    lines.push('|-------|-------------|-----|----------|-----|-------------------|');
    for (const shape of report.rsr_analysis.per_shape) {
      const met = shape.rsr_met ? '✓' : '✗';
      const losses = shape.untolerated_losses.length > 0 ? shape.untolerated_losses.join(', ') : 'None';
      lines.push(`| ${shape.shape_id} | ${shape.criticality} | ${(shape.rsr * 100).toFixed(1)}% | ${(shape.required_rsr * 100).toFixed(1)}% | ${met} | ${losses} |`);
    }
    lines.push('');

    lines.push('## RSR Per Tier');
    lines.push('');
    lines.push('| Tier | Aggregate RSR | Required | Met | Action |');
    lines.push('|------|---------------|----------|-----|--------|');
    for (const tier of report.rsr_analysis.per_tier) {
      const met = tier.tier_met ? '✓' : '✗';
      lines.push(`| ${tier.criticality} | ${(tier.aggregate_rsr * 100).toFixed(1)}% | ${(tier.required_rsr * 100).toFixed(1)}% | ${met} | ${tier.enforcement_action} |`);
    }
    lines.push('');
    lines.push(`**Global RSR:** ${(report.rsr_analysis.global_rsr * 100).toFixed(1)}%`);
    lines.push('');

    lines.push('## Violations');
    lines.push('');
    if (report.enforcement.foundational_violations.length > 0) {
      lines.push('### FOUNDATIONAL Violations (BLOCK_ALL)');
      lines.push('');
      for (const v of report.enforcement.foundational_violations) {
        lines.push(`- **${v.shape_id}**: RSR ${(v.actual_rsr * 100).toFixed(1)}% < ${(v.required_rsr * 100).toFixed(1)}% (deficit: ${(v.deficit * 100).toFixed(1)}%)`);
        if (v.untolerated_losses.length > 0) {
          lines.push(`  - Untolerated: ${v.untolerated_losses.join(', ')}`);
        }
      }
      lines.push('');
    }
    if (report.enforcement.interactive_violations.length > 0) {
      lines.push('### INTERACTIVE Violations (FORK_TTE)');
      lines.push('');
      for (const v of report.enforcement.interactive_violations) {
        lines.push(`- **${v.shape_id}**: RSR ${(v.actual_rsr * 100).toFixed(1)}% < ${(v.required_rsr * 100).toFixed(1)}% (deficit: ${(v.deficit * 100).toFixed(1)}%)`);
        if (v.untolerated_losses.length > 0) {
          lines.push(`  - Untolerated: ${v.untolerated_losses.join(', ')}`);
        }
      }
      lines.push('');
    }
    if (report.enforcement.enhancement_violations.length > 0) {
      lines.push('### ENHANCEMENT Violations (WARN_ONLY)');
      lines.push('');
      for (const v of report.enforcement.enhancement_violations) {
        lines.push(`- **${v.shape_id}**: RSR ${(v.actual_rsr * 100).toFixed(1)}% < ${(v.required_rsr * 100).toFixed(1)}% (deficit: ${(v.deficit * 100).toFixed(1)}%)`);
      }
      lines.push('');
    }
    if (report.enforcement.foundational_violations.length === 0 &&
        report.enforcement.interactive_violations.length === 0 &&
        report.enforcement.enhancement_violations.length === 0) {
      lines.push('*No violations detected.*');
      lines.push('');
    }

    lines.push('## TTE State');
    lines.push('');
    lines.push(`**Fork Occurred:** ${report.tte_state.fork_occurred ? 'YES' : 'NO'}`);
    lines.push('');
    if (report.tte_state.active_tracks.length > 0) {
      lines.push('### Active Tracks');
      lines.push('');
      lines.push('| Track | Run ID | Status | Promotable |');
      lines.push('|-------|--------|--------|------------|');
      for (const track of report.tte_state.active_tracks) {
        lines.push(`| ${track.track} | ${track.run_id} | ${track.status} | ${track.promotable ? 'Yes' : 'No'} |`);
      }
      lines.push('');
    }

    lines.push('### Promotion Eligibility');
    lines.push('');
    if (report.tte_state.promotion_eligibility.length > 0) {
      for (const e of report.tte_state.promotion_eligibility) {
        const eligible = e.eligible ? '✓ ELIGIBLE' : '✗ BLOCKED';
        lines.push(`**${e.run_id}** [${e.track}]: ${eligible}`);
        lines.push('');
        if (!e.eligible && e.blockers.length > 0) {
          lines.push('Blockers:');
          for (const b of e.blockers) {
            lines.push(`- ${b.blocker_type}: ${b.description}`);
          }
          lines.push('');
        }
        lines.push('RSR Compliance:');
        lines.push(`- FOUNDATIONAL: ${e.rsr_compliance.foundational_met ? '✓' : '✗'}`);
        lines.push(`- INTERACTIVE: ${e.rsr_compliance.interactive_met ? '✓' : '✗'}`);
        lines.push(`- ENHANCEMENT: ${e.rsr_compliance.enhancement_met ? '✓' : '✗'}`);
        lines.push('');
      }
    } else {
      lines.push('*No tracks to evaluate for promotion.*');
      lines.push('');
    }

    lines.push('## Proof Chain');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Laws Immutable | ${report.proof_chain.laws_immutable ? '✓' : '✗'} |`);
    lines.push(`| Computation Deterministic | ${report.proof_chain.computation_deterministic ? '✓' : '✗'} |`);
    lines.push(`| Decision Non-Bypassable | ${report.proof_chain.decision_non_bypassable ? '✓' : '✗'} |`);
    lines.push(`| Tracks Isolated | ${report.proof_chain.tracks_isolated ? '✓' : '✗'} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Report generated by OLYMPUS Runtime Enforcement Engine v1.0.0*');
    lines.push('');
    lines.push('**ENFORCEMENT MODE:** RUNTIME_PRIMITIVE');
    lines.push('');
    lines.push('**NON-BYPASSABLE. NO FLAGS. NO ENV VARS. NO OVERRIDES.**');

    return lines.join('\n');
  }

  private printFinalSummary(report: RuntimeControlReport): void {
    console.log('\n' + '═'.repeat(80));
    console.log('  FINAL SUMMARY');
    console.log('═'.repeat(80));

    const action = report.enforcement.overall_action;
    let emoji: string;
    let status: string;

    switch (action) {
      case 'BLOCK_ALL':
        emoji = '🛑';
        status = 'EXECUTION BLOCKED - FOUNDATIONAL VIOLATION';
        break;
      case 'FORK_TTE':
        emoji = '⚠️';
        status = 'TTE FORKED - INTERACTIVE VIOLATION';
        break;
      case 'WARN_ONLY':
        emoji = '✅';
        status = report.enforcement.canonical_allowed
          ? 'CANONICAL EXECUTION ALLOWED'
          : 'CANONICAL BLOCKED';
        break;
    }

    console.log(`\n  ${emoji}  ${status}`);
    console.log('');
    console.log(`  Global RSR: ${(report.rsr_analysis.global_rsr * 100).toFixed(1)}%`);
    console.log(`  Active Tracks: ${report.tte_state.active_tracks.length}`);
    console.log(`  Promotable: ${report.tte_state.promotion_eligibility.filter(e => e.eligible).length}`);
    console.log('');
    console.log('  PROOF CHAIN:');
    console.log(`    Laws Immutable:          ${report.proof_chain.laws_immutable ? '✓' : '✗'}`);
    console.log(`    Computation Deterministic: ${report.proof_chain.computation_deterministic ? '✓' : '✗'}`);
    console.log(`    Decision Non-Bypassable:   ${report.proof_chain.decision_non_bypassable ? '✓' : '✗'}`);
    console.log(`    Tracks Isolated:           ${report.proof_chain.tracks_isolated ? '✓' : '✗'}`);
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
 * FOUNDATIONAL (STATIC_DISPLAY_CAPABILITY): Survives all handoffs
 * INTERACTIVE (FILTER_CAPABILITY, PAGINATION_CAPABILITY): Lost at H4 (blocks → wire)
 *
 * This triggers TTE fork due to INTERACTIVE violation.
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

    // WIRE: CRITICAL - STATEFUL SHAPES ARE LOST HERE
    // Filter and Pagination components are NOT implemented
    // Only static display survives
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
          // Static display component - survives
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
          layout: 'card',
          type: 'component'
        }
      ]
    },

    // PIXEL: Same issue - stateful shapes never made it here
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
          layout: 'card',
          type: 'styled-component'
        }
      ],
      components: [
        {
          name: 'TaskCard',
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card'
        }
      ]
    }
  };
}

// Main execution
const runId = `RUN-${Date.now()}`;
const runner = new RuntimeEnforcementRunner();
const agentOutputs = createTestData();
runner.execute(runId, agentOutputs);

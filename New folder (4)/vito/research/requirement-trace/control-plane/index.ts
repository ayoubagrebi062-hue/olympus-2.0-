/**
 * Requirement Integrity Control Plane (RICP)
 *
 * The hard-authority governance system for OLYMPUS.
 * This is the LAW. This is non-bypassable.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  ControlReport,
  ShapeTraceResult,
  RSRMetrics,
  RSRHistoryEntry,
  CounterfactualAnalysis,
  GateResult,
  BlockedExecutionEvent,
  ExecutionVerdict
} from '../registry/types';
import { ShapeRegistry } from '../registry';
import { PreWireGate } from '../gates';
import { ControlTracer } from './control-tracer';
import { ComparativeAnalyzer } from './comparative-analyzer';
import type { TracedAgentId } from '../types';

export class RICP {
  private registry: ShapeRegistry;
  private gate: PreWireGate;
  private tracer: ControlTracer;
  private analyzer: ComparativeAnalyzer;

  private runId: string;
  private shapeTraces: Record<string, ShapeTraceResult> = {};
  private gateResult: GateResult | null = null;

  constructor() {
    this.registry = new ShapeRegistry();
    this.gate = new PreWireGate(this.registry);
    this.tracer = new ControlTracer(this.registry);
    this.analyzer = new ComparativeAnalyzer(this.registry);
    this.runId = this.generateRunId();
  }

  /**
   * Execute the full RICP pipeline.
   * This is the ONLY entry point for requirement validation.
   */
  execute(agentOutputs: Record<TracedAgentId, unknown>): ControlReport {
    const timestamp = new Date().toISOString();

    // Validate registry
    const registryValidation = this.registry.validate();
    if (!registryValidation.valid) {
      throw new Error(`Registry validation failed: ${registryValidation.errors.join(', ')}`);
    }

    // Step 1: Trace all shapes
    this.shapeTraces = this.tracer.traceAll(agentOutputs);

    // Step 2: Execute gate
    this.gateResult = this.gate.execute(this.shapeTraces);

    // Step 3: Comparative analysis
    const comparative = this.analyzer.analyzeComparative(this.shapeTraces);
    const selectiveProof = this.analyzer.proveSelectiveLoss(this.shapeTraces);

    // Step 4: Generate counterfactuals for lost shapes
    const counterfactuals: CounterfactualAnalysis[] = [];
    for (const [shapeId, trace] of Object.entries(this.shapeTraces)) {
      if (!trace.survival_status.survived_to_target) {
        const shape = this.registry.getShape(shapeId);
        if (shape) {
          counterfactuals.push(this.analyzer.generateCounterfactual(shape, trace));
        }
      }
    }

    // Step 5: Determine root cause
    const rootCause = this.analyzer.determineRootCause(this.shapeTraces, selectiveProof);

    // Step 6: Determine verdict
    const verdict = this.analyzer.determineVerdict(
      this.shapeTraces,
      selectiveProof,
      this.gateResult.block_downstream
    );

    // Step 7: Calculate RSR metrics
    const rsrMetrics = this.calculateRSRMetrics();

    // Step 8: Persist RSR history
    this.persistRSRHistory(rsrMetrics, verdict.verdict);

    // Step 9: Build report
    const report: ControlReport = {
      metadata: {
        generated_at: timestamp,
        ricp_version: '1.0.0',
        shapes_traced: Object.keys(this.shapeTraces),
        gates_executed: ['PRE_WIRE_GATE'],
        run_id: this.runId
      },

      registry: {
        shapes: this.registry.getAllShapes(),
        budgets: this.registry.getBudgets()
      },

      shape_traces: this.shapeTraces,

      gate_results: [this.gateResult],

      rsr_metrics: rsrMetrics,

      comparative_analysis: comparative,

      counterfactual_analysis: counterfactuals,

      root_cause: rootCause,

      verdict,

      execution_decision: {
        wire_blocked: !this.gate.canExecuteWire(),
        pixel_blocked: !this.gate.canExecutePixel(),
        blocked_event_emitted: this.gateResult.block_downstream,
        reason: verdict.explanation
      }
    };

    // Emit blocked event if needed
    if (this.gateResult.block_downstream) {
      const blockedEvent = this.gate.generateBlockedEvent(this.gateResult, this.runId);
      this.emitEvent(blockedEvent);
    }

    return report;
  }

  /**
   * Check if WIRE execution is allowed.
   * This MUST be called before any WIRE execution.
   */
  canExecuteWire(): boolean {
    return this.gate.canExecuteWire();
  }

  /**
   * Check if PIXEL execution is allowed.
   */
  canExecutePixel(): boolean {
    return this.gate.canExecutePixel();
  }

  /**
   * Calculate RSR metrics
   */
  private calculateRSRMetrics(): RSRMetrics {
    const perShapeRSR: Record<string, number> = {};
    const perCategoryRSR: Record<string, number> = {
      STATEFUL: 0,
      STATELESS: 0,
      CONTROL: 0
    };
    const categoryShapeCounts: Record<string, number> = {
      STATEFUL: 0,
      STATELESS: 0,
      CONTROL: 0
    };

    let totalRSR = 0;
    let shapeCount = 0;

    for (const [shapeId, trace] of Object.entries(this.shapeTraces)) {
      perShapeRSR[shapeId] = trace.rsr;
      totalRSR += trace.rsr;
      shapeCount++;

      perCategoryRSR[trace.category] += trace.rsr;
      categoryShapeCounts[trace.category]++;
    }

    // Average category RSRs
    for (const category of Object.keys(perCategoryRSR)) {
      if (categoryShapeCounts[category] > 0) {
        perCategoryRSR[category] /= categoryShapeCounts[category];
      }
    }

    const globalRSR = shapeCount > 0 ? totalRSR / shapeCount : 0;

    return {
      global_rsr: globalRSR,
      per_shape_rsr: perShapeRSR,
      per_category_rsr: perCategoryRSR as Record<'STATEFUL' | 'STATELESS' | 'CONTROL', number>,
      timestamp: new Date().toISOString(),
      run_id: this.runId
    };
  }

  /**
   * Persist RSR history
   */
  private persistRSRHistory(metrics: RSRMetrics, verdict: ExecutionVerdict): void {
    const historyPath = path.join(__dirname, '..', 'reports', 'rsr-history.json');

    let history: RSRHistoryEntry[] = [];
    try {
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      }
    } catch {
      history = [];
    }

    const entry: RSRHistoryEntry = {
      timestamp: metrics.timestamp,
      run_id: metrics.run_id,
      global_rsr: metrics.global_rsr,
      per_shape_rsr: metrics.per_shape_rsr,
      verdict
    };

    history.push(entry);

    // Keep last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }

    const reportsDir = path.dirname(historyPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  /**
   * Emit a system event
   */
  private emitEvent(event: BlockedExecutionEvent): void {
    // In production, this would go to event bus/logging system
    console.error(`[RICP EVENT] ${event.event_type}: ${event.reason}`);

    // Also write to events file
    const eventsPath = path.join(__dirname, '..', 'reports', 'events.jsonl');
    const reportsDir = path.dirname(eventsPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `RICP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Reset for new run
   */
  reset(): void {
    this.gate.reset();
    this.shapeTraces = {};
    this.gateResult = null;
    this.runId = this.generateRunId();
  }
}

// Export everything
export { ControlTracer } from './control-tracer';
export { ComparativeAnalyzer } from './comparative-analyzer';

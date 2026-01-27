/**
 * Report Generator
 *
 * Generates control-report.json and control-report.md
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ControlReport } from '../registry/types';

export class ReportGenerator {
  private reportsDir: string;

  constructor(reportsDir: string) {
    this.reportsDir = reportsDir;
  }

  /**
   * Generate both JSON and Markdown reports
   */
  generate(report: ControlReport): { jsonPath: string; mdPath: string } {
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const jsonPath = path.join(this.reportsDir, 'control-report.json');
    const mdPath = path.join(this.reportsDir, 'control-report.md');

    // Write JSON
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Write Markdown
    fs.writeFileSync(mdPath, this.generateMarkdown(report));

    return { jsonPath, mdPath };
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdown(report: ControlReport): string {
    const lines: string[] = [];

    // Header
    lines.push('# OLYMPUS REQUIREMENT INTEGRITY CONTROL REPORT');
    lines.push('');
    lines.push(`**Run ID:** ${report.metadata.run_id}`);
    lines.push(`**Generated:** ${report.metadata.generated_at}`);
    lines.push(`**RICP Version:** ${report.metadata.ricp_version}`);
    lines.push('');

    // VERDICT BANNER
    lines.push('---');
    lines.push('');
    lines.push('## EXECUTION VERDICT');
    lines.push('');

    const verdictEmoji = this.getVerdictEmoji(report.verdict.verdict);
    lines.push(`### ${verdictEmoji} ${report.verdict.verdict}`);
    lines.push('');
    lines.push(`**Blocking:** ${report.verdict.blocking ? 'YES' : 'NO'}`);
    lines.push(`**Reason Code:** ${report.verdict.reason_code}`);
    lines.push('');
    lines.push('```');
    lines.push(report.verdict.explanation);
    lines.push('```');
    lines.push('');

    if (report.verdict.culpable_agents.length > 0) {
      lines.push(`**Culpable Agents:** ${report.verdict.culpable_agents.join(', ')}`);
    }
    if (report.verdict.culpable_mechanisms.length > 0) {
      lines.push(`**Culpable Mechanisms:** ${report.verdict.culpable_mechanisms.join(', ')}`);
    }
    lines.push('');

    // EXECUTION DECISION
    lines.push('## EXECUTION DECISION');
    lines.push('');
    lines.push('| Agent | Status |');
    lines.push('|-------|--------|');
    lines.push(`| WIRE | ${report.execution_decision.wire_blocked ? 'BLOCKED' : 'ALLOWED'} |`);
    lines.push(`| PIXEL | ${report.execution_decision.pixel_blocked ? 'BLOCKED' : 'ALLOWED'} |`);
    lines.push('');

    // RSR METRICS
    lines.push('---');
    lines.push('');
    lines.push('## REQUIREMENT SURVIVAL RATE (RSR)');
    lines.push('');
    lines.push(`**Global RSR:** ${(report.rsr_metrics.global_rsr * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('### Per-Category RSR');
    lines.push('');
    lines.push('| Category | RSR |');
    lines.push('|----------|-----|');
    for (const [category, rsr] of Object.entries(report.rsr_metrics.per_category_rsr)) {
      lines.push(`| ${category} | ${(rsr * 100).toFixed(1)}% |`);
    }
    lines.push('');

    lines.push('### Per-Shape RSR');
    lines.push('');
    lines.push('| Shape | RSR |');
    lines.push('|-------|-----|');
    for (const [shapeId, rsr] of Object.entries(report.rsr_metrics.per_shape_rsr)) {
      lines.push(`| ${shapeId} | ${(rsr * 100).toFixed(1)}% |`);
    }
    lines.push('');

    // GATE RESULTS
    lines.push('---');
    lines.push('');
    lines.push('## PRE_WIRE_GATE RESULTS');
    lines.push('');

    const gateResult = report.gate_results[0];
    lines.push(`**Verdict:** ${gateResult.verdict}`);
    lines.push(`**Block Downstream:** ${gateResult.block_downstream}`);
    lines.push(`**Fatal Violations:** ${gateResult.fatal_violations.length}`);
    lines.push('');

    if (gateResult.fatal_violations.length > 0) {
      lines.push('### Fatal Violations');
      lines.push('');
      for (const violation of gateResult.fatal_violations) {
        lines.push(`#### ${violation.shape_id} - ${violation.violation_type}`);
        lines.push('');
        lines.push(`- **Handoff:** ${violation.handoff_id}`);
        lines.push(`- **Loss Class:** ${violation.loss_class}`);
        lines.push(`- **Evidence:** ${violation.evidence.explanation}`);
        lines.push('');
      }
    }

    lines.push('### Shape Results');
    lines.push('');
    lines.push('| Shape | Category | Survived | Attributes | Budget | Loss |');
    lines.push('|-------|----------|----------|------------|--------|------|');
    for (const result of gateResult.shape_results) {
      const survived = result.survived ? 'YES' : 'NO';
      const attrs = `${result.attributes_present}/${result.attributes_required}`;
      const loss = result.loss_detected || '-';
      lines.push(`| ${result.shape_id} | ${result.category} | ${survived} | ${attrs} | ${result.budget_status} | ${loss} |`);
    }
    lines.push('');

    // COMPARATIVE ANALYSIS
    lines.push('---');
    lines.push('');
    lines.push('## SELECTIVE LOSS ANALYSIS');
    lines.push('');

    lines.push(`**Loss is Selective:** ${report.comparative_analysis.loss_is_selective ? 'YES - PROVEN' : 'NO'}`);
    lines.push('');
    lines.push('```');
    lines.push(report.comparative_analysis.selectivity_evidence);
    lines.push('```');
    lines.push('');

    if (report.comparative_analysis.control_shapes_survived.length > 0) {
      lines.push(`**Control Shapes Survived H4:** ${report.comparative_analysis.control_shapes_survived.join(', ')}`);
    }
    if (report.comparative_analysis.stateful_shapes_lost.length > 0) {
      lines.push(`**Stateful Shapes Lost at H4:** ${report.comparative_analysis.stateful_shapes_lost.join(', ')}`);
    }
    lines.push('');

    // ROOT CAUSE
    lines.push('---');
    lines.push('');
    lines.push('## ROOT CAUSE DETERMINATION');
    lines.push('');
    lines.push(`### ${report.root_cause.class}`);
    lines.push('');
    lines.push(`**Handoff:** ${report.root_cause.handoff}`);
    lines.push('');
    lines.push('**Mechanism:**');
    lines.push('```');
    lines.push(report.root_cause.mechanism);
    lines.push('```');
    lines.push('');
    lines.push('**Evidence:**');
    lines.push('```');
    lines.push(`Source: ${report.root_cause.evidence.source_path}`);
    lines.push(`Target: ${report.root_cause.evidence.target_path}`);
    lines.push(`Explanation: ${report.root_cause.evidence.explanation}`);
    lines.push('```');
    lines.push('');
    lines.push('**Recommendation:**');
    lines.push('```');
    lines.push(report.root_cause.recommendation);
    lines.push('```');
    lines.push('');

    // COUNTERFACTUAL ANALYSIS
    if (report.counterfactual_analysis.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## COUNTERFACTUAL ANALYSIS');
      lines.push('');
      lines.push('*What would happen if the blocking mechanisms were removed?*');
      lines.push('');

      for (const cf of report.counterfactual_analysis) {
        lines.push(`### ${cf.shape_id}`);
        lines.push('');
        lines.push(`**Original Loss:** ${cf.original_loss_class}`);
        lines.push(`**Survival Possible:** ${cf.survival_possible ? 'YES' : 'NO'}`);
        lines.push(`**Blocking Mechanism:** ${cf.blocking_mechanism}`);
        lines.push('');
        lines.push('**Analysis:**');
        lines.push('```');
        lines.push(cf.evidence);
        lines.push('```');
        lines.push('');
        lines.push('**Hypothetical Path:**');
        lines.push('```');
        lines.push(cf.hypothetical_path);
        lines.push('```');
        lines.push('');
      }
    }

    // SHAPE TRACE SUMMARY
    lines.push('---');
    lines.push('');
    lines.push('## SHAPE TRACE SUMMARY');
    lines.push('');

    for (const [shapeId, trace] of Object.entries(report.shape_traces)) {
      lines.push(`### ${shapeId} (${trace.category})`);
      lines.push('');
      lines.push(`**Survived:** ${trace.survival_status.survived_to_target ? 'YES' : 'NO'}`);
      lines.push(`**Target Stage:** ${trace.survival_status.target_stage}`);
      lines.push(`**Last Present:** ${trace.survival_status.actual_last_stage || 'NEVER'}`);
      lines.push(`**RSR:** ${(trace.rsr * 100).toFixed(1)}%`);
      lines.push('');

      if (trace.survival_status.failure_point) {
        lines.push(`**Failure Point:** ${trace.survival_status.failure_point}`);
        lines.push(`**Failure Class:** ${trace.survival_status.failure_class}`);
        lines.push('');
      }

      // Extraction chain
      lines.push('| Stage | Present | Attributes | Confidence |');
      lines.push('|-------|---------|------------|------------|');
      const stages = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'] as const;
      for (const stage of stages) {
        const ext = trace.extractions[stage];
        const present = ext.present ? 'YES' : 'NO';
        const attrs = ext.attributes_found.length;
        const conf = (ext.confidence * 100).toFixed(0) + '%';
        lines.push(`| ${stage} | ${present} | ${attrs} | ${conf} |`);
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by OLYMPUS Requirement Integrity Control Plane (RICP)*');
    lines.push('');
    lines.push('**Non-Bypassable. Non-Negotiable. This is LAW.**');

    return lines.join('\n');
  }

  private getVerdictEmoji(verdict: string): string {
    switch (verdict) {
      case 'SAFE_TO_EXECUTE':
        return '[PASS]';
      case 'EXECUTION_BLOCKED_REQUIREMENT_LOSS':
        return '[BLOCKED]';
      case 'SYSTEMIC_FAILURE':
        return '[CRITICAL]';
      case 'SELECTIVE_DESTRUCTION_CONFIRMED':
        return '[FATAL]';
      default:
        return '[?]';
    }
  }
}

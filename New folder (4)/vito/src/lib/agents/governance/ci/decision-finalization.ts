import * as fs from 'fs';
import * as path from 'path';

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass: 'A' | 'B' | 'C' | 'UNKNOWN';
    outcome?: {
      result?: 'success' | 'failure' | 'partial' | 'blocked' | 'pending';
      resultDescription?: string;
      actualImpact?: string;
      unintendedConsequences?: string[];
      reversible?: boolean;
      reversalMethod?: string;
      reversed?: boolean;
      reversalDate?: string;
      reversalRationale?: string;
    };
  }>;
}

interface Violation {
  decisionId: string;
  decisionClass: string;
  violationType: ViolationType;
  description: string;
  severity: 'error' | 'warning';
  requiredFields: string[];
  missingFields: string[];
}

type ViolationType =
  | 'missing_outcome'
  | 'missing_outcome_result'
  | 'missing_outcome_description'
  | 'missing_actual_impact'
  | 'missing_reversible_flag'
  | 'missing_reversal_method'
  | 'missing_reversal_details'
  | 'invalid_reversal_date'
  | 'ambiguous_outcome';

interface EnforcementReport {
  totalDecisions: number;
  decisionsWithOutcome: number;
  decisionsWithoutOutcome: number;
  violations: Violation[];
  summary: {
    byClass: {
      classA: number;
      classB: number;
      classC: number;
      unknown: number;
    };
    byType: Record<ViolationType, number>;
    byResult: Record<string, number>;
  };
}

export class DecisionFinalizationGate {
  private decisionSchema: DecisionSchema;
  private referencedDecisionIds: Set<string>;

  constructor(decisionSchemaPath: string = 'contracts/decision-schema.json') {
    this.decisionSchema = this.loadDecisionSchema(decisionSchemaPath);
    this.referencedDecisionIds = new Set();
  }

  setReferencedDecisionIds(decisionIds: string[]): void {
    this.referencedDecisionIds = new Set(decisionIds.map(id => id.toLowerCase()));
  }

  loadReferencedDecisionIdsFromBindingGate(bindingReportPath: string): void {
    if (!fs.existsSync(bindingReportPath)) {
      console.warn(`Binding report not found: ${bindingReportPath}`);
      return;
    }

    try {
      const content = fs.readFileSync(bindingReportPath, 'utf-8');
      const report = JSON.parse(content);

      if (report.decisionsWithDecisionId) {
        for (const entry of report.decisionsWithDecisionId) {
          if (entry.decisionId) {
            this.referencedDecisionIds.add(entry.decisionId.toLowerCase());
          }
        }
      }
    } catch (error) {
      console.warn('Could not load decision IDs from binding report');
    }
  }

  enforce(): EnforcementReport {
    const violations: Violation[] = [];
    const summary = {
      classA: 0,
      classB: 0,
      classC: 0,
      unknown: 0
    };

    const referencedDecisions = this.getReferencedDecisions();

    for (const decision of referencedDecisions) {
      if (decision.decisionClass === 'A' || decision.decisionClass === 'UNKNOWN') {
        continue;
      }

      this.updateSummary(decision.decisionClass, summary);
      const decisionViolations = this.validateDecision(decision);
      violations.push(...decisionViolations);
    }

    const report: EnforcementReport = {
      totalDecisions: referencedDecisions.length,
      decisionsWithOutcome: referencedDecisions.filter(d => d.outcome).length,
      decisionsWithoutOutcome: referencedDecisions.filter(d => !d.outcome || !d.outcome.result).length,
      violations,
      summary: {
        byClass: summary,
        byType: this.calculateViolationByType(violations),
        byResult: this.calculateResultBreakdown(referencedDecisions)
      }
    };

    this.printReport(report);

    if (violations.some(v => v.severity === 'error')) {
      process.exit(1);
    }

    return report;
  }

  private getReferencedDecisions(): Array<DecisionSchema['decisions'][number]> {
    if (this.referencedDecisionIds.size === 0) {
      return this.decisionSchema.decisions.filter(
        d => d.decisionClass === 'B' || d.decisionClass === 'C'
      );
    }

    return this.decisionSchema.decisions.filter(
      decision => this.referencedDecisionIds.has(decision.id.toLowerCase())
    );
  }

  private validateDecision(decision: DecisionSchema['decisions'][number]): Violation[] {
    const violations: Violation[] = [];

    if (!decision.outcome) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_outcome',
        description: `Decision missing outcome field. Tier ${decision.decisionClass} decisions must have an outcome.`,
        severity: 'error',
        requiredFields: ['outcome'],
        missingFields: ['outcome']
      });
      return violations;
    }

    const outcome = decision.outcome;

    if (!outcome.result) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_outcome_result',
        description: 'Outcome missing result field. Must be one of: success, failure, partial, blocked, pending.',
        severity: 'error',
        requiredFields: ['outcome.result'],
        missingFields: ['outcome.result']
      });
    }

    if (!outcome.resultDescription || outcome.resultDescription.trim() === '') {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_outcome_description',
        description: 'Outcome missing resultDescription. Must describe the outcome.',
        severity: 'error',
        requiredFields: ['outcome.resultDescription'],
        missingFields: ['outcome.resultDescription']
      });
    }

    if (!outcome.actualImpact || outcome.actualImpact.trim() === '') {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_actual_impact',
        description: 'Outcome missing actualImpact. Must describe what actually happened.',
        severity: 'error',
        requiredFields: ['outcome.actualImpact'],
        missingFields: ['outcome.actualImpact']
      });
    }

    if (outcome.reversible === undefined || outcome.reversible === null) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_reversible_flag',
        description: 'Outcome missing reversible flag. Must specify if the action is reversible.',
        severity: 'error',
        requiredFields: ['outcome.reversible'],
        missingFields: ['outcome.reversible']
      });
    }

    if (outcome.reversible === true && (!outcome.reversalMethod || outcome.reversalMethod.trim() === '')) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_reversal_method',
        description: 'Outcome marked as reversible but missing reversalMethod. Must describe how to reverse.',
        severity: 'error',
        requiredFields: ['outcome.reversalMethod'],
        missingFields: ['outcome.reversalMethod']
      });
    }

    if (outcome.reversed === true) {
      const missingFields: string[] = [];

      if (!outcome.reversalDate || outcome.reversalDate.trim() === '') {
        missingFields.push('outcome.reversalDate');
      }

      if (!outcome.reversalRationale || outcome.reversalRationale.trim() === '') {
        missingFields.push('outcome.reversalRationale');
      }

      if (missingFields.length > 0) {
        violations.push({
          decisionId: decision.id,
          decisionClass: decision.decisionClass,
          violationType: 'missing_reversal_details',
          description: `Outcome marked as reversed but missing required fields: ${missingFields.join(', ')}`,
          severity: 'error',
          requiredFields: ['outcome.reversalDate', 'outcome.reversalRationale'],
          missingFields
        });
      }

      if (outcome.reversalDate && !this.isValidISODate(outcome.reversalDate)) {
        violations.push({
          decisionId: decision.id,
          decisionClass: decision.decisionClass,
          violationType: 'invalid_reversal_date',
          description: `Invalid reversalDate format: ${outcome.reversalDate}. Must be ISO-8601.`,
          severity: 'error',
          requiredFields: ['outcome.reversalDate'],
          missingFields: []
        });
      }
    }

    if (outcome.result && !this.isValidResult(outcome.result)) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'ambiguous_outcome',
        description: `Invalid outcome.result: ${outcome.result}. Must be one of: success, failure, partial, blocked, pending.`,
        severity: 'error',
        requiredFields: ['outcome.result'],
        missingFields: []
      });
    }

    if (outcome.result === 'failure' && (!outcome.unintendedConsequences || outcome.unintendedConsequences.length === 0)) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_outcome_description',
        description: 'Outcome.result is "failure" but unintendedConsequences is missing or empty.',
        severity: 'warning',
        requiredFields: ['outcome.unintendedConsequences'],
        missingFields: ['outcome.unintendedConsequences']
      });
    }

    if (outcome.result === 'partial' && (!outcome.unintendedConsequences || outcome.unintendedConsequences.length === 0)) {
      violations.push({
        decisionId: decision.id,
        decisionClass: decision.decisionClass,
        violationType: 'missing_outcome_description',
        description: 'Outcome.result is "partial" but unintendedConsequences is missing or empty.',
        severity: 'warning',
        requiredFields: ['outcome.unintendedConsequences'],
        missingFields: ['outcome.unintendedConsequences']
      });
    }

    return violations;
  }

  private isValidResult(result: string): boolean {
    const validResults = ['success', 'failure', 'partial', 'blocked', 'pending'];
    return validResults.includes(result);
  }

  private isValidISODate(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?([+-]\d{2}:\d{2})?$/;
    return iso8601Regex.test(dateString);
  }

  private calculateViolationByType(violations: Violation[]): Record<ViolationType, number> {
    const counts: Record<ViolationType, number> = {
      missing_outcome: 0,
      missing_outcome_result: 0,
      missing_outcome_description: 0,
      missing_actual_impact: 0,
      missing_reversible_flag: 0,
      missing_reversal_method: 0,
      missing_reversal_details: 0,
      invalid_reversal_date: 0,
      ambiguous_outcome: 0
    };

    for (const violation of violations) {
      counts[violation.violationType]++;
    }

    return counts;
  }

  private calculateResultBreakdown(decisions: Array<DecisionSchema['decisions'][number]>): Record<string, number> {
    const counts: Record<string, number> = {
      success: 0,
      failure: 0,
      partial: 0,
      blocked: 0,
      pending: 0,
      missing: 0
    };

    for (const decision of decisions) {
      if (decision.outcome && decision.outcome.result) {
        if (counts[decision.outcome.result] !== undefined) {
          counts[decision.outcome.result]++;
        }
      } else {
        counts.missing++;
      }
    }

    return counts;
  }

  private updateSummary(decisionClass: string, summary: any): void {
    const key = `class${decisionClass}`;
    if (summary[key] !== undefined) {
      summary[key]++;
    }
  }

  private printReport(report: EnforcementReport): void {
    console.log('\n=== Decision Finalization Enforcement Report ===\n');

    console.log('Summary:');
    console.log(`  Total Referenced Decisions:  ${report.totalDecisions}`);
    console.log(`  Decisions With Outcome:      ${report.decisionsWithOutcome}`);
    console.log(`  Decisions Without Outcome:    ${report.decisionsWithoutOutcome}`);

    console.log('\nBy Decision Class:');
    console.log(`  Class A:   ${report.summary.byClass.classA}`);
    console.log(`  Class B:   ${report.summary.byClass.classB}`);
    console.log(`  Class C:   ${report.summary.byClass.classC}`);
    console.log(`  Unknown:   ${report.summary.byClass.unknown}`);

    console.log('\nBy Outcome Result:');
    console.log(`  Success:   ${report.summary.byResult.success}`);
    console.log(`  Failure:   ${report.summary.byResult.failure}`);
    console.log(`  Partial:   ${report.summary.byResult.partial}`);
    console.log(`  Blocked:   ${report.summary.byResult.blocked}`);
    console.log(`  Pending:   ${report.summary.byResult.pending}`);
    console.log(`  Missing:   ${report.summary.byResult.missing}`);

    if (report.violations.length > 0) {
      console.log('\n=== VIOLATIONS ===\n');

      const errorViolations = report.violations.filter(v => v.severity === 'error');
      const warningViolations = report.violations.filter(v => v.severity === 'warning');

      if (errorViolations.length > 0) {
        console.log('Errors (Outcome Violations):');
        errorViolations.forEach(v => {
          console.log(`  Decision ID: ${v.decisionId}`);
          console.log(`    Class: ${v.decisionClass}`);
          console.log(`    Type: ${v.violationType}`);
          console.log(`    → ${v.description}`);
          if (v.missingFields.length > 0) {
            console.log(`    Missing Fields: ${v.missingFields.join(', ')}`);
          }
          console.log();
        });
      }

      if (warningViolations.length > 0) {
        console.log('Warnings:');
        warningViolations.forEach(v => {
          console.log(`  Decision ID: ${v.decisionId}`);
          console.log(`    Class: ${v.decisionClass}`);
          console.log(`    → ${v.description}\n`);
        });
      }
    }

    console.log('=== Enforcement Complete ===\n');

    if (report.violations.some(v => v.severity === 'error')) {
      console.log('Decision finalization check FAILED.');
      console.log('Fix violations before proceeding.\n');
    } else {
      console.log('Decision finalization check PASSED.\n');
    }
  }

  private loadDecisionSchema(decisionSchemaPath: string): DecisionSchema {
    if (!fs.existsSync(decisionSchemaPath)) {
      return { decisions: [] };
    }

    try {
      const content = fs.readFileSync(decisionSchemaPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { decisions: [] };
    }
  }
}

function extractDecisionIdsFromBindingGate(filePaths: string[]): string[] {
  const decisionIdPatterns: RegExp[] = [
    /DECISION_ID:\s*["']([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']/i,
    /@decision-id:\s*["']?([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']?/i,
    /decisionId:\s*["']([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']/i,
    /decision_id:\s*["']([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})["']/i,
  ];

  const decisionIds: string[] = [];

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of decisionIdPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const decisionId = match[1].toLowerCase();
            if (!decisionIds.includes(decisionId)) {
              decisionIds.push(decisionId);
            }
          }
        }
      }
    } catch (error) {
      continue;
    }
  }

  return decisionIds;
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const gate = new DecisionFinalizationGate();

  if (args.length === 0) {
    console.log('No files specified, scanning src directory...\n');
    const files = getAllTypeScriptFiles('src');
    const decisionIds = extractDecisionIdsFromBindingGate(files);
    gate.setReferencedDecisionIds(decisionIds);
  } else {
    const decisionIds = extractDecisionIdsFromBindingGate(args);
    gate.setReferencedDecisionIds(decisionIds);
  }

  gate.enforce();
}

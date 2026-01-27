import * as fs from 'fs';
import * as path from 'path';

export interface DestructionWarning {
  timestamp: string;
  file: string;
  domain: 'EXEC' | 'NON_EXEC' | 'GOVERNANCE';
  effectTrigger?: string;
  declared?: {
    scope: 'global' | 'tenant' | 'project' | 'record';
    reversibility: 'reversible' | 'hard_delete' | 'soft_delete';
    justification: string;
  };
  inferred?: {
    scope: 'global' | 'tenant' | 'project' | 'record';
    confidence: 'high' | 'medium' | 'low';
    patterns: string[];
  };
  scopeMatch: boolean;
  warnings: string[];
}

export interface DestructionPattern {
  file: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  inferredScope: 'global' | 'tenant' | 'project' | 'record';
  declaredScope: 'global' | 'tenant' | 'project' | 'record' | 'none';
  reversibility: 'reversible' | 'hard_delete' | 'soft_delete' | 'none';
  scopeConsistency: 'always_match' | 'always_mismatch' | 'mixed';
  warningTypes: string[];
  inferredConfidence: 'high' | 'medium' | 'low' | 'none';
  hasDestructionBlock: boolean;
  domain: 'EXEC' | 'NON_EXEC' | 'GOVERNANCE';
  effectTriggers: string[];
}

export interface DestructionPatternsReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  summary: {
    totalPatterns: number;
    totalWarnings: number;
    byScope: {
      global: number;
      tenant: number;
      project: number;
      record: number;
    };
    byReversibility: {
      reversible: number;
      hard_delete: number;
      soft_delete: number;
      none: number;
    };
    byScopeConsistency: {
      always_match: number;
      always_mismatch: number;
      mixed: number;
    };
    highRiskPatterns: number;
  };
  patterns: DestructionPattern[];
}

export class DestructionPatternObserver {
  private readonly DATA_DIR: string;
  private readonly OUTPUT_PATH: string;
  private readonly GOVERNANCE_PHASE_PATH: string;
  private readonly DECISION_BINDING_REPORT_PATH: string;

  constructor() {
    this.DATA_DIR = path.join(process.cwd(), 'data', 'governance');
    this.OUTPUT_PATH = path.join(this.DATA_DIR, 'destruction-patterns.json');
    this.GOVERNANCE_PHASE_PATH = path.join(process.cwd(), 'contracts', 'governance-phase.json');
    this.DECISION_BINDING_REPORT_PATH = path.join(this.DATA_DIR, 'decision-binding-report.json');
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
  }

  private loadGovernancePhase(): string {
    try {
      if (fs.existsSync(this.GOVERNANCE_PHASE_PATH)) {
        const content = fs.readFileSync(this.GOVERNANCE_PHASE_PATH, 'utf-8');
        const phaseConfig = JSON.parse(content);
        return phaseConfig.currentPhase || 'OBSERVATION_ONLY';
      }
    } catch (error) {
      console.warn('Failed to load governance phase, defaulting to OBSERVATION_ONLY');
    }
    return 'OBSERVATION_ONLY';
  }

  private loadExistingPatterns(): DestructionPatternsReport | null {
    try {
      if (fs.existsSync(this.OUTPUT_PATH)) {
        const content = fs.readFileSync(this.OUTPUT_PATH, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load existing patterns, starting fresh');
    }
    return null;
  }

  private parseDecisionBindingWarnings(): DestructionWarning[] {
    const warnings: DestructionWarning[] = [];

    try {
      if (!fs.existsSync(this.DECISION_BINDING_REPORT_PATH)) {
        console.warn(`Decision binding report not found: ${this.DECISION_BINDING_REPORT_PATH}`);
        return warnings;
      }

      const content = fs.readFileSync(this.DECISION_BINDING_REPORT_PATH, 'utf-8');
      const report = JSON.parse(content);

      if (report.violations && Array.isArray(report.violations)) {
        for (const violation of report.violations) {
          if (
            violation.destructionSemantics &&
            violation.destructionSemantics.warnings.length > 0
          ) {
            for (const warningText of violation.destructionSemantics.warnings) {
              warnings.push({
                timestamp: new Date().toISOString(),
                file: violation.file,
                domain: violation.domain || 'EXEC',
                effectTrigger: violation.effectTrigger,
                declared: violation.destructionSemantics.declared,
                inferred: violation.destructionSemantics.inferred,
                scopeMatch: violation.destructionSemantics.scopeMatch || false,
                warnings: [warningText],
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse decision binding warnings:', error);
    }

    return warnings;
  }

  private extractWarningType(warning: string): string {
    if (warning.includes('UNDERESTIMATED SCOPE')) {
      return 'scope_underestimation';
    }
    if (warning.includes('OVERESTIMATED SCOPE')) {
      return 'scope_overestimation';
    }
    if (warning.includes('REVERSIBILITY WARNING')) {
      return 'reversibility_mismatch';
    }
    if (warning.includes('MISSING @destruction BLOCK')) {
      return 'missing_destruction_block';
    }
    return 'other';
  }

  private aggregatePatterns(
    warnings: DestructionWarning[],
    existingReport: DestructionPatternsReport | null
  ): DestructionPatternsReport {
    const now = new Date().toISOString();
    const governancePhase = this.loadGovernancePhase();

    const patternMap = new Map<string, DestructionPattern>();

    for (const warning of warnings) {
      const key = warning.file;

      if (patternMap.has(key)) {
        const pattern = patternMap.get(key)!;
        pattern.occurrenceCount++;
        pattern.lastSeen = warning.timestamp;
        pattern.warningTypes.push(this.extractWarningType(warning.warnings[0]));
        if (warning.effectTrigger && !pattern.effectTriggers.includes(warning.effectTrigger)) {
          pattern.effectTriggers.push(warning.effectTrigger);
        }
      } else {
        const pattern: DestructionPattern = {
          file: warning.file,
          occurrenceCount: 1,
          firstSeen: warning.timestamp,
          lastSeen: warning.timestamp,
          inferredScope: warning.inferred?.scope || 'global',
          declaredScope: warning.declared?.scope || 'none',
          reversibility: warning.declared?.reversibility || 'none',
          scopeConsistency: warning.scopeMatch ? 'always_match' : 'always_mismatch',
          warningTypes: [this.extractWarningType(warning.warnings[0])],
          inferredConfidence: warning.inferred?.confidence || 'none',
          hasDestructionBlock: !!warning.declared,
          domain: warning.domain,
          effectTriggers: warning.effectTrigger ? [warning.effectTrigger] : [],
        };
        patternMap.set(key, pattern);
      }
    }

    const patterns = Array.from(patternMap.values());

    const summary = {
      totalPatterns: patterns.length,
      totalWarnings: warnings.length,
      byScope: {
        global: patterns.filter(p => p.inferredScope === 'global').length,
        tenant: patterns.filter(p => p.inferredScope === 'tenant').length,
        project: patterns.filter(p => p.inferredScope === 'project').length,
        record: patterns.filter(p => p.inferredScope === 'record').length,
      },
      byReversibility: {
        reversible: patterns.filter(p => p.reversibility === 'reversible').length,
        hard_delete: patterns.filter(p => p.reversibility === 'hard_delete').length,
        soft_delete: patterns.filter(p => p.reversibility === 'soft_delete').length,
        none: patterns.filter(p => p.reversibility === 'none').length,
      },
      byScopeConsistency: {
        always_match: patterns.filter(p => p.scopeConsistency === 'always_match').length,
        always_mismatch: patterns.filter(p => p.scopeConsistency === 'always_mismatch').length,
        mixed: patterns.filter(p => p.scopeConsistency === 'mixed').length,
      },
      highRiskPatterns: patterns.filter(
        p =>
          p.inferredScope === 'global' &&
          (p.scopeConsistency === 'always_mismatch' || !p.hasDestructionBlock)
      ).length,
    };

    return {
      version: '1.0.0',
      timestamp: now,
      governancePhase,
      summary,
      patterns,
    };
  }

  observe(): DestructionPatternsReport {
    this.ensureDataDirectory();

    const existingReport = this.loadExistingPatterns();
    const warnings = this.parseDecisionBindingWarnings();
    const report = this.aggregatePatterns(warnings, existingReport);

    fs.writeFileSync(this.OUTPUT_PATH, JSON.stringify(report, null, 2));
    console.log(`Destruction patterns written to: ${this.OUTPUT_PATH}`);

    return report;
  }

  printReport(report: DestructionPatternsReport): void {
    console.log('\n=== Destruction Pattern Memory (Phase A++) ===\n');
    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Summary:');
    console.log(`  Total Patterns: ${report.summary.totalPatterns}`);
    console.log(`  Total Warnings: ${report.summary.totalWarnings}`);
    console.log(`  High Risk Patterns: ${report.summary.highRiskPatterns}\n`);

    console.log('By Inferred Scope:');
    console.log(`  Global:  ${report.summary.byScope.global} files`);
    console.log(`  Tenant:  ${report.summary.byScope.tenant} files`);
    console.log(`  Project: ${report.summary.byScope.project} files`);
    console.log(`  Record:  ${report.summary.byScope.record} files\n`);

    console.log('By Reversibility:');
    console.log(`  Reversible:   ${report.summary.byReversibility.reversible}`);
    console.log(`  Hard Delete:  ${report.summary.byReversibility.hard_delete}`);
    console.log(`  Soft Delete:  ${report.summary.byReversibility.soft_delete}`);
    console.log(`  None:         ${report.summary.byReversibility.none}\n`);

    console.log('By Scope Consistency:');
    console.log(`  Always Match:   ${report.summary.byScopeConsistency.always_match}`);
    console.log(`  Always Mismatch: ${report.summary.byScopeConsistency.always_mismatch}`);
    console.log(`  Mixed:          ${report.summary.byScopeConsistency.mixed}\n`);

    if (report.patterns.length > 0) {
      console.log('=== Patterns ===\n');

      report.patterns
        .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
        .forEach((pattern, index) => {
          const riskIndicator =
            pattern.inferredScope === 'global' && pattern.scopeConsistency === 'always_mismatch'
              ? '⚠ HIGH RISK'
              : 'ℹ OBSERVED';
          const domainBadge =
            pattern.domain === 'EXEC'
              ? '[EXEC]'
              : pattern.domain === 'GOVERNANCE'
                ? '[META]'
                : '[UI]';

          console.log(`${index + 1}. ${riskIndicator} ${domainBadge} ${pattern.file}`);
          console.log(
            `   Occurrences: ${pattern.occurrenceCount} (First: ${pattern.firstSeen}, Last: ${pattern.lastSeen})`
          );
          console.log(
            `   Inferred Scope: ${pattern.inferredScope.toUpperCase()} | Declared Scope: ${pattern.declaredScope.toUpperCase()}`
          );
          console.log(`   Scope Consistency: ${pattern.scopeConsistency.toUpperCase()}`);
          console.log(`   Reversibility: ${pattern.reversibility.toUpperCase()}`);
          console.log(`   Has @destruction Block: ${pattern.hasDestructionBlock ? 'Yes' : 'No'}`);
          console.log(`   Warning Types: ${Array.from(new Set(pattern.warningTypes)).join(', ')}`);
          if (pattern.effectTriggers.length > 0) {
            console.log(`   Effect Triggers: ${pattern.effectTriggers.join(', ')}`);
          }
          console.log('');
        });
    } else {
      console.log('No destruction patterns found.\n');
    }

    console.log('=== Observation Complete ===\n');
  }
}

export function main(): void {
  const observer = new DestructionPatternObserver();
  const report = observer.observe();
  observer.printReport(report);

  process.exit(0);
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

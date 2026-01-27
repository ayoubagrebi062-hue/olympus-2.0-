import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

export interface AcknowledgmentTrigger {
  patternId: string;
  file: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  triggerType: string;
  description: string;
  evidence: string[];
  timestamp: string;
  requiresAcknowledgment: boolean;
}

export interface AcknowledgmentRequirement {
  patternId: string;
  file: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  triggerType: string;
  description: string;
  evidence: string[];
  firstDetected: string;
  lastDetected: string;
  unresolved: boolean;
}

export interface AcknowledgmentEntry {
  patternId: string;
  file: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  triggerType: string;
  description: string;
  evidence: string[];
  firstDetected: string;
  lastDetected: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  decision?: string;
  rationale?: string;
  reviewBy?: string;
  unresolved?: boolean;
}

export interface RiskAcknowledgmentReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  summary: {
    totalPatterns: number;
    totalRequiredAcknowledgments: number;
    acknowledgedCount: number;
    unacknowledgedCount: number;
    highestUnresolvedRisk: 'critical' | 'high' | 'medium' | 'low' | 'none';
    byRiskLevel: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  acknowledgments: AcknowledgmentEntry[];
}

export class RiskAcknowledgmentObserver {
  private readonly DESTRUCTION_PATTERNS_PATH: string;
  private readonly ACKNOWLEDGMENT_PATH: string;

  constructor() {
    this.DESTRUCTION_PATTERNS_PATH = path.join(
      process.cwd(),
      'data',
      'governance',
      'destruction-patterns.json'
    );
    this.ACKNOWLEDGMENT_PATH = path.join(
      process.cwd(),
      'contracts',
      'governance-risk-acknowledgment.json'
    );
  }

  private loadDestructionPatterns(): DestructionPattern[] {
    try {
      if (!fs.existsSync(this.DESTRUCTION_PATTERNS_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.DESTRUCTION_PATTERNS_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.patterns || [];
    } catch (error) {
      console.warn('Failed to load destruction patterns:', error);
      return [];
    }
  }

  private loadExistingAcknowledgments(): AcknowledgmentEntry[] {
    try {
      if (!fs.existsSync(this.ACKNOWLEDGMENT_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.ACKNOWLEDGMENT_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.acknowledgments || [];
    } catch (error) {
      console.warn('Failed to load existing acknowledgments:', error);
      return [];
    }
  }

  private generateStablePatternId(file: string, triggerType: string): string {
    const stableInput = `${file}:${triggerType}`;
    return crypto.createHash('sha256').update(stableInput).digest('hex').substring(0, 16);
  }

  private assessRiskLevel(pattern: DestructionPattern): 'critical' | 'high' | 'medium' | 'low' {
    const rules = [
      {
        level: 'critical' as const,
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.scopeConsistency === 'always_mismatch' &&
          pattern.inferredConfidence === 'high',
      },
      {
        level: 'critical' as const,
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.reversibility === 'reversible' &&
          !pattern.hasDestructionBlock,
      },
      {
        level: 'high' as const,
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.warningTypes.includes('scope_underestimation'),
      },
      {
        level: 'high' as const,
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.reversibility === 'hard_delete' &&
          !pattern.hasDestructionBlock,
      },
      {
        level: 'medium' as const,
        condition: () =>
          pattern.inferredScope === 'tenant' && pattern.scopeConsistency === 'always_mismatch',
      },
      {
        level: 'medium' as const,
        condition: () => pattern.warningTypes.includes('missing_destruction_block'),
      },
      {
        level: 'low' as const,
        condition: () =>
          pattern.inferredScope === 'project' && pattern.scopeConsistency === 'mixed',
      },
      {
        level: 'low' as const,
        condition: () => pattern.warningTypes.includes('scope_overestimation'),
      },
    ];

    for (const rule of rules) {
      if (rule.condition()) {
        return rule.level;
      }
    }

    return 'low';
  }

  private detectTrigger(pattern: DestructionPattern): AcknowledgmentTrigger | null {
    const riskLevel = this.assessRiskLevel(pattern);

    const triggerRules = [
      {
        triggerType: 'scope_underestimation_global',
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.scopeConsistency === 'always_mismatch' &&
          pattern.warningTypes.includes('scope_underestimation'),
        description:
          'Global scope underestimated - declared scope is narrower than actual destructive impact',
      },
      {
        triggerType: 'global_without_declaration',
        condition: () => pattern.inferredScope === 'global' && !pattern.hasDestructionBlock,
        description: 'Global destructive operations without @destruction block declaration',
      },
      {
        triggerType: 'reversible_mismatch_global',
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.reversibility === 'reversible' &&
          pattern.warningTypes.includes('reversibility_mismatch'),
        description:
          'Global operations marked as reversible but patterns suggest difficult restoration',
      },
      {
        triggerType: 'hard_delete_global',
        condition: () =>
          pattern.inferredScope === 'global' &&
          pattern.reversibility === 'hard_delete' &&
          pattern.warningTypes.includes('missing_destruction_block'),
        description: 'Global hard deletions without explicit justification',
      },
      {
        triggerType: 'missing_destruction_block',
        condition: () =>
          !pattern.hasDestructionBlock &&
          pattern.warningTypes.includes('missing_destruction_block'),
        description: 'Tier 3 destructive code lacks @destruction block for documentation',
      },
      {
        triggerType: 'scope_mismatch_tenant',
        condition: () =>
          pattern.inferredScope === 'tenant' && pattern.scopeConsistency === 'always_mismatch',
        description: 'Tenant scope mismatch between declared and inferred destructive impact',
      },
    ];

    for (const rule of triggerRules) {
      if (rule.condition()) {
        return {
          patternId: this.generateStablePatternId(pattern.file, rule.triggerType),
          file: pattern.file,
          riskLevel,
          triggerType: rule.triggerType,
          description: rule.description,
          evidence: pattern.effectTriggers,
          timestamp: pattern.lastSeen,
          requiresAcknowledgment: riskLevel !== 'low',
        };
      }
    }

    return null;
  }

  private mergeAcknowledgments(
    triggers: AcknowledgmentTrigger[],
    existing: AcknowledgmentEntry[]
  ): AcknowledgmentEntry[] {
    const merged = new Map<string, AcknowledgmentEntry>();
    const now = new Date().toISOString();

    for (const trigger of triggers) {
      const existingEntry = existing.find(e => e.patternId === trigger.patternId);

      if (existingEntry) {
        merged.set(trigger.patternId, {
          ...existingEntry,
          lastDetected: trigger.timestamp,
          unresolved:
            existingEntry.acknowledged === false || existingEntry.acknowledged === undefined,
        });
      } else {
        merged.set(trigger.patternId, {
          patternId: trigger.patternId,
          file: trigger.file,
          riskLevel: trigger.riskLevel,
          triggerType: trigger.triggerType,
          description: trigger.description,
          evidence: trigger.evidence,
          firstDetected: trigger.timestamp,
          lastDetected: trigger.timestamp,
          unresolved: true,
        });
      }
    }

    for (const existingEntry of existing) {
      if (!merged.has(existingEntry.patternId)) {
        merged.set(existingEntry.patternId, existingEntry);
      }
    }

    return Array.from(merged.values());
  }

  observe(): RiskAcknowledgmentReport {
    const patterns = this.loadDestructionPatterns();
    const existingAcknowledgments = this.loadExistingAcknowledgments();

    const triggers: AcknowledgmentTrigger[] = [];
    for (const pattern of patterns) {
      const trigger = this.detectTrigger(pattern);
      if (trigger && trigger.requiresAcknowledgment) {
        triggers.push(trigger);
      }
    }

    const acknowledgments = this.mergeAcknowledgments(triggers, existingAcknowledgments);
    const governancePhase = this.loadGovernancePhase();

    const summary = this.calculateSummary(acknowledgments);

    const report: RiskAcknowledgmentReport = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      governancePhase,
      summary,
      acknowledgments,
    };

    return report;
  }

  private loadGovernancePhase(): string {
    const phasePath = path.join(process.cwd(), 'contracts', 'governance-phase.json');
    try {
      if (fs.existsSync(phasePath)) {
        const content = fs.readFileSync(phasePath, 'utf-8');
        const phaseConfig = JSON.parse(content);
        return phaseConfig.currentPhase || 'OBSERVATION_ONLY';
      }
    } catch (error) {
      console.warn('Failed to load governance phase');
    }
    return 'OBSERVATION_ONLY';
  }

  private calculateSummary(
    acknowledgments: AcknowledgmentEntry[]
  ): RiskAcknowledgmentReport['summary'] {
    const totalAcknowledgments = acknowledgments.length;
    const acknowledgedCount = acknowledgments.filter(a => a.acknowledged === true).length;
    const unacknowledgedCount = acknowledgments.filter(a => a.acknowledged !== true).length;

    const unresolvedByLevel = acknowledgments
      .filter(a => a.acknowledged !== true)
      .reduce(
        (acc, a) => {
          acc[a.riskLevel] = (acc[a.riskLevel] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const highestUnresolvedRisk =
      acknowledgments
        .filter(a => a.acknowledged !== true)
        .sort((a, b) => {
          const riskOrder = ['critical', 'high', 'medium', 'low'];
          return riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel);
        })[0]?.riskLevel || 'none';

    const byRiskLevel = acknowledgments.reduce(
      (acc, a) => {
        acc[a.riskLevel] = (acc[a.riskLevel] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalPatterns: acknowledgments.length,
      totalRequiredAcknowledgments: unacknowledgedCount,
      acknowledgedCount,
      unacknowledgedCount,
      highestUnresolvedRisk,
      byRiskLevel: {
        critical: byRiskLevel.critical || 0,
        high: byRiskLevel.high || 0,
        medium: byRiskLevel.medium || 0,
        low: byRiskLevel.low || 0,
      },
    };
  }

  writeAcknowledgments(report: RiskAcknowledgmentReport): void {
    try {
      const dataDir = path.dirname(this.ACKNOWLEDGMENT_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.ACKNOWLEDGMENT_PATH, JSON.stringify(report, null, 2));
    } catch (error) {
      console.warn('Failed to write acknowledgments:', error);
    }
  }

  printAcknowledgmentStatus(report: RiskAcknowledgmentReport): void {
    console.log('\n=== PHASE A+++ — RISK ACKNOWLEDGMENT STATUS (OBSERVATION ONLY) ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Acknowledgment Summary:');
    console.log(`  Total Patterns:              ${report.summary.totalPatterns}`);
    console.log(`  Required Acknowledgments:     ${report.summary.totalRequiredAcknowledgments}`);
    console.log(`  Acknowledged:               ${report.summary.acknowledgedCount}`);
    console.log(`  Unacknowledged:             ${report.summary.unacknowledgedCount}`);
    console.log(
      `  Highest Unresolved Risk:     ${report.summary.highestUnresolvedRisk.toUpperCase()}\n`
    );

    console.log('By Risk Level:');
    console.log(`  Critical:  ${report.summary.byRiskLevel.critical}`);
    console.log(`  High:      ${report.summary.byRiskLevel.high}`);
    console.log(`  Medium:    ${report.summary.byRiskLevel.medium}`);
    console.log(`  Low:       ${report.summary.byRiskLevel.low}\n`);

    if (report.summary.totalRequiredAcknowledgments > 0) {
      console.log('=== UNACKNOWLEDGED RISKS ===\n');

      const unacknowledged = report.acknowledgments.filter(a => a.acknowledged !== true);
      unacknowledged.sort((a, b) => {
        const riskOrder = ['critical', 'high', 'medium', 'low'];
        if (riskOrder.indexOf(a.riskLevel) !== riskOrder.indexOf(b.riskLevel)) {
          return riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel);
        }
        return new Date(b.lastDetected).getTime() - new Date(a.lastDetected).getTime();
      });

      unacknowledged.forEach((ack, index) => {
        const riskIcon =
          ack.riskLevel === 'critical' ? '🔴' : ack.riskLevel === 'high' ? '🟠' : '🟡';
        console.log(`${index + 1}. ${riskIcon} ${ack.riskLevel.toUpperCase()} - ${ack.file}`);
        console.log(`   Pattern ID:    ${ack.patternId}`);
        console.log(`   Trigger:        ${ack.triggerType}`);
        console.log(`   Description:    ${ack.description}`);
        if (ack.evidence.length > 0) {
          console.log(`   Evidence:       ${ack.evidence.join(', ')}`);
        }
        console.log(`   First Detected: ${ack.firstDetected}`);
        console.log(`   Last Detected:  ${ack.lastDetected}\n`);
      });

      console.log('=== ACTION REQUIRED ===\n');
      console.log('To acknowledge a risk, edit contracts/governance-risk-acknowledgment.json');
      console.log('Set acknowledged: true and add acknowledgedBy, rationale fields.');
      console.log('This file is HUMAN-OWNED. Auto-filling is disabled.\n');
    } else {
      console.log('✅ All required acknowledgments are resolved.\n');
    }

    console.log('=== OBSERVATION COMPLETE (NO CI BLOCKING) ===\n');
  }
}

export function main(): void {
  const observer = new RiskAcknowledgmentObserver();
  const report = observer.observe();
  observer.writeAcknowledgments(report);
  observer.printAcknowledgmentStatus(report);
  process.exit(0);
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

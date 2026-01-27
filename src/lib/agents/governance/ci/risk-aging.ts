import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

export interface AgingInfo {
  ageDays: number;
  stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil';
  driftDetected: boolean;
  lastReviewedAt?: string;
}

export interface ExtendedAcknowledgmentEntry extends AcknowledgmentEntry {
  aging?: AgingInfo;
}

export interface RiskAgingReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  summary: {
    totalAcknowledgments: number;
    acknowledgedCount: number;
    unacknowledgedCount: number;
    oldestAcknowledgmentAgeDays: number;
    fossilRiskCount: number;
    staleRiskCount: number;
    agingRiskCount: number;
    freshRiskCount: number;
    driftedRiskCount: number;
    ownershipRisks: number;
    highestRiskWithStaleness: {
      riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
      staleness: 'fresh' | 'aging' | 'stale' | 'fossil';
    };
  };
  acknowledgments: ExtendedAcknowledgmentEntry[];
}

export class RiskAgingAnalyzer {
  private readonly ACKNOWLEDGMENT_PATH: string;
  private readonly DESTRUCTION_PATTERNS_PATH: string;

  constructor() {
    this.ACKNOWLEDGMENT_PATH = path.join(
      process.cwd(),
      'contracts',
      'governance-risk-acknowledgment.json'
    );
    this.DESTRUCTION_PATTERNS_PATH = path.join(
      process.cwd(),
      'data',
      'governance',
      'destruction-patterns.json'
    );
  }

  private loadAcknowledgments(): AcknowledgmentEntry[] {
    try {
      if (!fs.existsSync(this.ACKNOWLEDGMENT_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.ACKNOWLEDGMENT_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.acknowledgments || [];
    } catch (error) {
      console.warn('Failed to load acknowledgments:', error);
      return [];
    }
  }

  private loadDestructionPatterns(): Map<string, DestructionPattern> {
    const patternMap = new Map<string, DestructionPattern>();
    try {
      if (!fs.existsSync(this.DESTRUCTION_PATTERNS_PATH)) {
        return patternMap;
      }
      const content = fs.readFileSync(this.DESTRUCTION_PATTERNS_PATH, 'utf-8');
      const data = JSON.parse(content);
      const patterns: DestructionPattern[] = data.patterns || [];
      for (const pattern of patterns) {
        patternMap.set(pattern.file, pattern);
      }
    } catch (error) {
      console.warn('Failed to load destruction patterns:', error);
    }
    return patternMap;
  }

  private getFileHash(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        return '';
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.warn(`Failed to calculate hash for ${filePath}:`, error);
      return '';
    }
  }

  private getFileLastModified(filePath: string): Date | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      console.warn(`Failed to get mtime for ${filePath}:`, error);
      return null;
    }
  }

  private calculateAgeDays(timestamp?: string): number {
    if (!timestamp) {
      return 0;
    }
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private determineStalenessLevel(ageDays: number): 'fresh' | 'aging' | 'stale' | 'fossil' {
    if (ageDays < 30) {
      return 'fresh';
    } else if (ageDays < 90) {
      return 'aging';
    } else if (ageDays < 180) {
      return 'stale';
    } else {
      return 'fossil';
    }
  }

  private detectDrift(
    acknowledgment: AcknowledgmentEntry,
    pattern: DestructionPattern | undefined
  ): boolean {
    if (!acknowledgment.acknowledgedAt || !pattern) {
      return false;
    }

    const acknowledgedAt = new Date(acknowledgment.acknowledgedAt).getTime();
    const lastSeen = new Date(pattern.lastSeen).getTime();

    if (lastSeen > acknowledgedAt) {
      return true;
    }

    const warningSet = new Set(acknowledgment.evidence || []);
    const currentWarningSet = new Set(pattern.effectTriggers || []);

    if (warningSet.size !== currentWarningSet.size) {
      return true;
    }

    for (const warning of Array.from(warningSet)) {
      if (!currentWarningSet.has(warning)) {
        return true;
      }
    }

    return false;
  }

  private detectOwnershipRisk(acknowledgment: AcknowledgmentEntry): boolean {
    if (!acknowledgment.acknowledgedBy) {
      return true;
    }
    return false;
  }

  private analyzeAging(
    acknowledgment: AcknowledgmentEntry,
    pattern: DestructionPattern | undefined
  ): AgingInfo | undefined {
    if (!acknowledgment.acknowledgedAt) {
      return undefined;
    }

    const ageDays = this.calculateAgeDays(acknowledgment.acknowledgedAt);
    const stalenessLevel = this.determineStalenessLevel(ageDays);
    const driftDetected = this.detectDrift(acknowledgment, pattern);

    const agingInfo: AgingInfo = {
      ageDays,
      stalenessLevel,
      driftDetected,
    };

    if (acknowledgment.reviewBy) {
      agingInfo.lastReviewedAt = acknowledgment.acknowledgedAt;
    }

    return agingInfo;
  }

  analyze(): RiskAgingReport {
    const acknowledgments = this.loadAcknowledgments();
    const patternMap = this.loadDestructionPatterns();
    const governancePhase = this.loadGovernancePhase();

    const extendedAcknowledgments: ExtendedAcknowledgmentEntry[] = [];
    let oldestAcknowledgmentAgeDays = 0;
    let fossilRiskCount = 0;
    let staleRiskCount = 0;
    let agingRiskCount = 0;
    let freshRiskCount = 0;
    let driftedRiskCount = 0;
    let ownershipRisks = 0;
    let highestRiskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let highestStaleness: 'fresh' | 'aging' | 'stale' | 'fossil' = 'fresh';
    let highestRiskWithStaleness: {
      riskLevel: 'critical' | 'high' | 'medium' | 'low';
      staleness: 'fresh' | 'aging' | 'stale' | 'fossil';
    } = {
      riskLevel: 'low',
      staleness: 'fresh',
    };

    for (const acknowledgment of acknowledgments) {
      const pattern = patternMap.get(acknowledgment.file);
      const agingInfo = this.analyzeAging(acknowledgment, pattern);

      const extended: ExtendedAcknowledgmentEntry = {
        ...acknowledgment,
        aging: agingInfo,
      };
      extendedAcknowledgments.push(extended);

      if (agingInfo) {
        if (agingInfo.ageDays > oldestAcknowledgmentAgeDays) {
          oldestAcknowledgmentAgeDays = agingInfo.ageDays;
        }

        switch (agingInfo.stalenessLevel) {
          case 'fossil':
            fossilRiskCount++;
            break;
          case 'stale':
            staleRiskCount++;
            break;
          case 'aging':
            agingRiskCount++;
            break;
          case 'fresh':
            freshRiskCount++;
            break;
        }

        if (agingInfo.driftDetected) {
          driftedRiskCount++;
        }

        if (this.detectOwnershipRisk(acknowledgment)) {
          ownershipRisks++;
        }

        if (
          acknowledgment.acknowledged &&
          this.isHigherRisk(acknowledgment.riskLevel, highestRiskLevel)
        ) {
          highestRiskLevel = acknowledgment.riskLevel;
          highestStaleness = agingInfo.stalenessLevel;
        } else if (acknowledgment.acknowledged && acknowledgment.riskLevel === highestRiskLevel) {
          if (this.isMoreStale(agingInfo.stalenessLevel, highestStaleness)) {
            highestStaleness = agingInfo.stalenessLevel;
          }
        }

        highestRiskWithStaleness = {
          riskLevel: highestRiskLevel,
          staleness: highestStaleness,
        };
      }
    }

    const summary = {
      totalAcknowledgments: acknowledgments.length,
      acknowledgedCount: acknowledgments.filter(a => a.acknowledged === true).length,
      unacknowledgedCount: acknowledgments.filter(a => a.acknowledged !== true).length,
      oldestAcknowledgmentAgeDays,
      fossilRiskCount,
      staleRiskCount,
      agingRiskCount,
      freshRiskCount,
      driftedRiskCount,
      ownershipRisks,
      highestRiskWithStaleness,
    };

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      governancePhase,
      summary,
      acknowledgments: extendedAcknowledgments,
    };
  }

  private isHigherRisk(current: string, existing: string): boolean {
    const riskOrder = ['critical', 'high', 'medium', 'low', 'none'];
    return riskOrder.indexOf(current) < riskOrder.indexOf(existing);
  }

  private isMoreStale(current: string, existing: string): boolean {
    const stalenessOrder = ['fossil', 'stale', 'aging', 'fresh'];
    return stalenessOrder.indexOf(current) < stalenessOrder.indexOf(existing);
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

  writeAcknowledgments(report: RiskAgingReport): void {
    try {
      const existingData = JSON.parse(fs.readFileSync(this.ACKNOWLEDGMENT_PATH, 'utf-8'));

      const updatedAcknowledgments = report.acknowledgments.map(ack => {
        const existing = existingData.acknowledgments.find(
          (e: AcknowledgmentEntry) => e.patternId === ack.patternId
        );
        if (existing) {
          const preserved = {
            ...existing,
            lastDetected: ack.lastDetected,
            unresolved: ack.acknowledged !== true,
          };
          if (ack.aging && !(preserved as any).aging) {
            (preserved as any).aging = ack.aging;
          }
          return preserved as ExtendedAcknowledgmentEntry;
        }
        return ack;
      });

      const outputData = {
        ...existingData,
        timestamp: report.timestamp,
        governancePhase: report.governancePhase,
        summary: report.summary,
        acknowledgments: updatedAcknowledgments,
      };

      fs.writeFileSync(this.ACKNOWLEDGMENT_PATH, JSON.stringify(outputData, null, 2));
    } catch (error) {
      console.warn('Failed to write acknowledgments with aging:', error);
    }
  }

  printAgingStatus(report: RiskAgingReport): void {
    console.log('\n=== PHASE A++++ — GOVERNANCE AGING (OBSERVATION ONLY) ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Aging Summary:');
    console.log(`  Total Acknowledgments:      ${report.summary.totalAcknowledgments}`);
    console.log(`  Acknowledged:               ${report.summary.acknowledgedCount}`);
    console.log(`  Unacknowledged:             ${report.summary.unacknowledgedCount}`);
    console.log(
      `  Oldest Acknowledgment:        ${report.summary.oldestAcknowledgmentAgeDays} days\n`
    );

    console.log('Staleness Distribution:');
    console.log(`  Fresh (<30d):     ${report.summary.freshRiskCount}`);
    console.log(`  Aging (30-90d):   ${report.summary.agingRiskCount}`);
    console.log(`  Stale (90-180d):  ${report.summary.staleRiskCount}`);
    console.log(`  Fossil (>180d):    ${report.summary.fossilRiskCount}\n`);

    console.log('Drift & Ownership:');
    console.log(`  Drifted Risks:  ${report.summary.driftedRiskCount}`);
    console.log(`  Ownership Risks: ${report.summary.ownershipRisks}\n`);

    console.log(
      `Highest Risk + Staleness: ${report.summary.highestRiskWithStaleness.riskLevel.toUpperCase()} @ ${report.summary.highestRiskWithStaleness.staleness.toUpperCase()}\n`
    );

    if (report.summary.fossilRiskCount > 0 || report.summary.driftedRiskCount > 0) {
      console.log('=== AGING ALERTS ===\n');

      if (report.summary.fossilRiskCount > 0) {
        console.log(`🦴 FOSSIL RISKS (${report.summary.fossilRiskCount}):\n`);
        const fossils = report.acknowledgments
          .filter(a => a.aging?.stalenessLevel === 'fossil')
          .sort((a, b) => (b.aging?.ageDays || 0) - (a.aging?.ageDays || 0));

        fossils.forEach((ack, index) => {
          console.log(`  ${index + 1}. ${ack.riskLevel.toUpperCase()} - ${ack.file}`);
          console.log(`     Age: ${ack.aging?.ageDays} days`);
          console.log(`     Acknowledged: ${ack.acknowledgedAt}`);
          if (ack.acknowledgedBy) {
            console.log(`     By: ${ack.acknowledgedBy}`);
          }
          console.log('');
        });
      }

      if (report.summary.driftedRiskCount > 0) {
        console.log(`🔄 DRIFTED RISKS (${report.summary.driftedRiskCount}):\n`);
        const drifted = report.acknowledgments.filter(a => a.aging?.driftDetected === true);

        drifted.forEach((ack, index) => {
          console.log(`  ${index + 1}. ${ack.riskLevel.toUpperCase()} - ${ack.file}`);
          console.log(`     Acknowledged: ${ack.acknowledgedAt}`);
          console.log(`     Last Detected: ${ack.lastDetected}`);
          console.log(`     Reviewer: ${ack.reviewBy || 'N/A'}`);
          console.log('');
        });
      }

      console.log('=== RECOMMENDATION ===\n');
      if (report.summary.fossilRiskCount > 0) {
        console.log('Fossil risks (>180 days) may be outdated.');
        console.log('Consider re-evaluating: Is this still relevant?');
      }
      if (report.summary.driftedRiskCount > 0) {
        console.log('Drifted risks: File changed since acknowledgment.');
        console.log('Action required: Re-review and re-acknowledge if still valid.');
      }
      console.log('');
    } else {
      console.log('✅ No aging concerns detected.\n');
    }

    console.log('=== OBSERVATION COMPLETE (NO CI IMPACT) ===\n');
  }
}

export function main(): void {
  const analyzer = new RiskAgingAnalyzer();
  const report = analyzer.analyze();
  analyzer.writeAcknowledgments(report);
  analyzer.printAgingStatus(report);
  process.exit(0);
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

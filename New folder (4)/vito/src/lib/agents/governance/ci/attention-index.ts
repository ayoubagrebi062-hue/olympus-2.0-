import * as fs from 'fs';
import * as path from 'path';

export interface ExtendedAcknowledgmentEntry {
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
  aging?: {
    ageDays: number;
    stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil';
    driftDetected: boolean;
    lastReviewedAt?: string;
  };
}

export interface RiskAttentionScore {
  patternId: string;
  file: string;
  attentionScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil';
  driftDetected: boolean;
  ownershipRisk: boolean;
  recommendedAction: string;
}

export interface AttentionIndexReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  topRisks: RiskAttentionScore[];
  summary: {
    highestAttentionScore: number;
    fossilCriticalCount: number;
    driftedHighRiskCount: number;
    totalRisksTracked: number;
  };
}

export class AttentionIndexGenerator {
  private readonly DESTRUCTION_PATTERNS_PATH: string;
  private readonly ACKNOWLEDGMENT_PATH: string;
  private readonly DECISION_LOG_PATH: string;
  private readonly ATTENTION_INDEX_PATH: string;

  private readonly RISK_WEIGHTS = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2
  } as const;

  private readonly STALENESS_MULTIPLIERS = {
    fresh: 1,
    aging: 2,
    stale: 3,
    fossil: 5
  } as const;

  private readonly DRIFT_MULTIPLIERS = {
    drifted: 2,
    stable: 1
  } as const;

  private readonly OWNERSHIP_PENALTY = {
    missingOwner: 2,
    hasOwner: 1
  } as const;

  constructor() {
    this.DESTRUCTION_PATTERNS_PATH = path.join(process.cwd(), 'data', 'governance', 'destruction-patterns.json');
    this.ACKNOWLEDGMENT_PATH = path.join(process.cwd(), 'contracts', 'governance-risk-acknowledgment.json');
    this.DECISION_LOG_PATH = path.join(process.cwd(), 'data', 'decisions', 'decision-log.json');
    this.ATTENTION_INDEX_PATH = path.join(process.cwd(), 'data', 'governance', 'attention-index.json');
  }

  private loadAcknowledgments(): ExtendedAcknowledgmentEntry[] {
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

  private loadDecisionLog(): any[] {
    try {
      if (!fs.existsSync(this.DECISION_LOG_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.DECISION_LOG_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.decisions || [];
    } catch (error) {
      console.warn('Failed to load decision log:', error);
      return [];
    }
  }

  private computeAttentionScore(acknowledgment: ExtendedAcknowledgmentEntry): number {
    const riskWeight = this.RISK_WEIGHTS[acknowledgment.riskLevel] || 1;
    
    const stalenessMultiplier = acknowledgment.aging 
      ? this.STALENESS_MULTIPLIERS[acknowledgment.aging.stalenessLevel] || 1
      : 1;

    const driftMultiplier = acknowledgment.aging?.driftDetected === true
      ? this.DRIFT_MULTIPLIERS.drifted
      : this.DRIFT_MULTIPLIERS.stable;

    const ownershipPenalty = !acknowledgment.acknowledgedBy || !acknowledgment.acknowledged
      ? this.OWNERSHIP_PENALTY.missingOwner
      : this.OWNERSHIP_PENALTY.hasOwner;

    const rawScore = riskWeight * stalenessMultiplier * driftMultiplier * ownershipPenalty;

    const maxScore = 5 * 5 * 2 * 2;

    const normalizedScore = (rawScore / maxScore) * 100;

    return Math.min(100, Math.max(0, Math.round(normalizedScore)));
  }

  private determineRecommendedAction(
    attentionScore: number,
    riskLevel: string,
    stalenessLevel: string | undefined,
    driftDetected: boolean | undefined,
    ownershipRisk: boolean
  ): string {
    if (attentionScore >= 80) {
      return 'CRITICAL: Immediate re-review required';
    }

    if (attentionScore >= 60) {
      return 'HIGH: Review within 1 sprint';
    }

    if (stalenessLevel === 'fossil') {
      return 'AGE: Re-evaluate fossil risk';
    }

    if (driftDetected === true) {
      return 'DRIFT: Confirm acknowledgment validity';
    }

    if (ownershipRisk === true) {
      return 'OWNER: Assign owner or re-acknowledge';
    }

    if (riskLevel === 'critical') {
      return 'RISK: Monitor critical code path';
    }

    return 'NORMAL: Periodic review recommended';
  }

  generate(): AttentionIndexReport {
    const acknowledgments = this.loadAcknowledgments();
    const decisionLog = this.loadDecisionLog();
    const governancePhase = this.loadGovernancePhase();

    const scoredRisks: RiskAttentionScore[] = [];

    for (const acknowledgment of acknowledgments) {
      if (!acknowledgment.acknowledged) {
        continue;
      }

      const attentionScore = this.computeAttentionScore(acknowledgment);
      const stalenessLevel = acknowledgment.aging?.stalenessLevel;
      const driftDetected = acknowledgment.aging?.driftDetected;
      const ownershipRisk = !acknowledgment.acknowledgedBy;

      const recommendedAction = this.determineRecommendedAction(
        attentionScore,
        acknowledgment.riskLevel,
        stalenessLevel,
        driftDetected,
        ownershipRisk
      );

      scoredRisks.push({
        patternId: acknowledgment.patternId,
        file: acknowledgment.file,
        attentionScore,
        riskLevel: acknowledgment.riskLevel,
        stalenessLevel: stalenessLevel || 'fresh',
        driftDetected: driftDetected || false,
        ownershipRisk,
        recommendedAction
      });
    }

    scoredRisks.sort((a, b) => b.attentionScore - a.attentionScore);

    const topRisks = scoredRisks.slice(0, 10);

    const highestAttentionScore = topRisks.length > 0 ? topRisks[0].attentionScore : 0;
    const fossilCriticalCount = topRisks.filter(r => 
      r.riskLevel === 'critical' && r.stalenessLevel === 'fossil'
    ).length;
    const driftedHighRiskCount = topRisks.filter(r =>
      r.riskLevel === 'high' && r.driftDetected === true
    ).length;

    const summary = {
      highestAttentionScore,
      fossilCriticalCount,
      driftedHighRiskCount,
      totalRisksTracked: scoredRisks.length
    };

    const report: AttentionIndexReport = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      governancePhase,
      topRisks,
      summary
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

  writeAttentionIndex(report: AttentionIndexReport): void {
    try {
      const dataDir = path.dirname(this.ATTENTION_INDEX_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.ATTENTION_INDEX_PATH, JSON.stringify(report, null, 2));
    } catch (error) {
      console.warn('Failed to write attention index:', error);
    }
  }

  printTop5Attention(report: AttentionIndexReport): void {
    console.log('\n=== PHASE A+++++ — GOVERNANCE ATTENTION INDEX (TOP 5) ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Summary:');
    console.log(`  Highest Attention Score:  ${report.summary.highestAttentionScore}`);
    console.log(`  Fossil Critical Risks:  ${report.summary.fossilCriticalCount}`);
    console.log(`  Drifted High Risks:    ${report.summary.driftedHighRiskCount}`);
    console.log(`  Total Risks Tracked:    ${report.summary.totalRisksTracked}\n`);

    if (report.topRisks.length === 0) {
      console.log('✅ No acknowledged risks requiring attention.\n');
      console.log('=== OBSERVATION COMPLETE ===\n');
      return;
    }

    console.log('=== TOP 5 RISKS REQUIRING ATTENTION ===\n');

    const top5 = report.topRisks.slice(0, 5);
    top5.forEach((risk, index) => {
      const scoreIcon = risk.attentionScore >= 80 ? '🔴' : risk.attentionScore >= 60 ? '🟠' : risk.attentionScore >= 40 ? '🟡' : '🟢';
      const stalenessIcon = risk.stalenessLevel === 'fossil' ? '🦴' : risk.stalenessLevel === 'stale' ? '⏰' : '';
      const driftIcon = risk.driftDetected ? '🔄' : '';
      const ownerIcon = risk.ownershipRisk ? '❓' : '';

      console.log(`\n${index + 1}. ${scoreIcon} ${risk.riskLevel.toUpperCase()} - ${risk.file} (${risk.attentionScore}/100)`);
      console.log(`   ${stalenessIcon}${driftIcon}${ownerIcon} ${risk.stalenessLevel.toUpperCase()} | ${risk.driftDetected ? 'DRIFTED' : 'STABLE'} | ${risk.ownershipRisk ? 'NO OWNER' : 'OWNED'}`);
      console.log(`   Action: ${risk.recommendedAction}`);
      console.log(`   Pattern ID: ${risk.patternId}`);
    });

    console.log('\n=== END OF TOP 5 ===\n');
    console.log('ℹ️  See data/governance/attention-index.json for full index.');
    console.log('=== OBSERVATION COMPLETE (NO CI BLOCKING) ===\n');
  }
}

export function main(): void {
  const generator = new AttentionIndexGenerator();
  const report = generator.generate();
  generator.writeAttentionIndex(report);
  generator.printTop5Attention(report);
  process.exit(0);
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

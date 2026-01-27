/**
 * RISK CAUSALITY ANALYZER (OBSERVATION ONLY)
 *
 * Analyzes top-attention risks and infers their primary cause.
 * Computes time-resistance signals to detect risks that survive pressure.
 *
 * STRICT CONSTRAINTS:
 * - No CI blocking
 * - No enforcement
 * - No auto-escalation
 * - No rewriting human fields
 * - process.exit(0) ALWAYS
 * - Observation only
 * - Deterministic inference
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ==================== TYPES ====================

/**
 * ORDER 21 - Causality Classification (Mandatory Set)
 * Primary cause inference for each top-attention risk.
 */
export enum Causality {
  LEGACY_DEBT = 'LEGACY_DEBT',
  MISSING_OWNER = 'MISSING_OWNER',
  ARCH_CONSTRAINT = 'ARCH_CONSTRAINT',
  BUSINESS_CRITICAL = 'BUSINESS_CRITICAL',
  TOOLING_GAP = 'TOOLING_GAP',
  AWAITING_REDESIGN = 'AWAITING_REDESIGN',
  UNKNOWN = 'UNKNOWN'
}

export type ResistanceLevel = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';

export interface GitMetadata {
  filePath: string;
  lastModified: string | null;
  ageInDays: number;
  exists: boolean;
}

export interface RiskAttentionEntry {
  patternId: string;
  file: string;
  attentionScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil';
  driftDetected: boolean;
  ownershipRisk: boolean;
  recommendedAction: string;
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
  aging?: {
    ageDays: number;
    stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil';
    driftDetected: boolean;
    lastReviewedAt?: string;
  };
}

export interface DecisionEntry {
  decisionIdentity: {
    id: string;
    timestamp: string;
    agent: string;
    context: string;
  };
  decisionClass: string;
  decisionContext?: {
    request?: string;
    constraints?: string[];
  };
  reasoningArtifacts?: {
    actionRecommendation?: {
      riskLevel?: string;
    };
  };
}

export interface CausalityAnalysis {
  patternId: string;
  file: string;
  attentionScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  causality: Causality;
  causalityReason: string;
  ageInDays: number;
  recurrenceCount: number;
  resistanceScore: number;
  resistanceLevel: ResistanceLevel;
  suggestedAction: string;
  gitMetadata: GitMetadata;
}

export interface CausalityReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  topCausalities: CausalityAnalysis[];
  summary: {
    totalAnalyzed: number;
    byCausality: Record<Causality, number>;
    highestResistanceScore: number;
    extremeResistanceCount: number;
    archConstraintCount: number;
    legacyDebtCount: number;
  };
}

// ==================== CAUSALITY ANALYZER ====================

export class RiskCausalityAnalyzer {
  private readonly ATTENTION_INDEX_PATH: string;
  private readonly ACKNOWLEDGMENT_PATH: string;
  private readonly DECISION_LOG_PATH: string;
  private readonly CAUSALITY_OUTPUT_PATH: string;

  /**
   * ORDER 22 - Age multipliers for resistance calculation
   */
  private readonly AGE_MULTIPLIERS = {
    fresh: 1.0,      // < 30 days
    aging: 1.5,      // 30-90 days
    stale: 2.0,      // 90-180 days
    fossil: 3.0      // > 180 days
  } as const;

  /**
   * Resistance level thresholds
   */
  private readonly RESISTANCE_THRESHOLDS = {
    EXTREME: 150,
    HIGH: 100,
    MODERATE: 50,
    LOW: 25
  } as const;

  constructor() {
    this.ATTENTION_INDEX_PATH = path.join(process.cwd(), 'data', 'governance', 'attention-index.json');
    this.ACKNOWLEDGMENT_PATH = path.join(process.cwd(), 'contracts', 'governance-risk-acknowledgment.json');
    this.DECISION_LOG_PATH = path.join(process.cwd(), 'data', 'decisions', 'decision-log.json');
    this.CAUSALITY_OUTPUT_PATH = path.join(process.cwd(), 'data', 'governance', 'risk-causality.json');
  }

  // ==================== DATA LOADERS ====================

  private loadAttentionIndex(): RiskAttentionEntry[] {
    try {
      if (!fs.existsSync(this.ATTENTION_INDEX_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.ATTENTION_INDEX_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.topRisks || [];
    } catch (error) {
      console.warn('Failed to load attention index:', error);
      return [];
    }
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

  private loadDecisionLog(): DecisionEntry[] {
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

  private loadGovernancePhase(): string {
    const phasePath = path.join(process.cwd(), 'contracts', 'governance-phase.json');
    try {
      if (fs.existsSync(phasePath)) {
        const content = fs.readFileSync(phasePath, 'utf-8');
        const phaseConfig = JSON.parse(content);
        return phaseConfig.currentPhase || 'OBSERVATION_ONLY';
      }
    } catch {
      // Silent fallback
    }
    return 'OBSERVATION_ONLY';
  }

  // ==================== GIT METADATA ====================

  private getGitMetadata(filePath: string): GitMetadata {
    const fullPath = path.join(process.cwd(), filePath);
    const metadata: GitMetadata = {
      filePath,
      lastModified: null,
      ageInDays: 0,
      exists: false
    };

    try {
      if (!fs.existsSync(fullPath)) {
        return metadata;
      }
      metadata.exists = true;

      // Get file modification time (fs.stat - deterministic)
      const stats = fs.statSync(fullPath);
      metadata.lastModified = stats.mtime.toISOString();

      const now = new Date();
      const mtime = new Date(stats.mtime);
      metadata.ageInDays = Math.floor((now.getTime() - mtime.getTime()) / (1000 * 60 * 60 * 24));

      // Try git log for more accurate history (optional, fallback to fs.stat)
      try {
        const gitDate = execSync(
          `git log -1 --format="%ci" -- "${filePath}"`,
          { cwd: process.cwd(), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();

        if (gitDate) {
          const gitTime = new Date(gitDate);
          metadata.lastModified = gitTime.toISOString();
          metadata.ageInDays = Math.floor((now.getTime() - gitTime.getTime()) / (1000 * 60 * 60 * 24));
        }
      } catch {
        // Git not available or file not tracked - use fs.stat values
      }
    } catch {
      // File access error
    }

    return metadata;
  }

  // ==================== ORDER 21: CAUSALITY INFERENCE ====================

  /**
   * Deterministic causality inference.
   * Rules are evaluated in order - first match wins.
   * UNKNOWN if no rule matches (never guess).
   */
  private inferCausality(
    risk: RiskAttentionEntry,
    acknowledgment: AcknowledgmentEntry | undefined,
    decisions: DecisionEntry[],
    gitMetadata: GitMetadata
  ): { causality: Causality; reason: string } {

    // Rule 1: MISSING_OWNER - No acknowledgment owner
    if (risk.ownershipRisk || !acknowledgment?.acknowledgedBy) {
      return {
        causality: Causality.MISSING_OWNER,
        reason: 'No owner assigned or acknowledgment missing'
      };
    }

    // Rule 2: LEGACY_DEBT - Fossil-age risk with no recent activity
    if (risk.stalenessLevel === 'fossil' && gitMetadata.ageInDays > 365) {
      return {
        causality: Causality.LEGACY_DEBT,
        reason: `File unchanged for ${gitMetadata.ageInDays} days, fossil-level staleness`
      };
    }

    // Rule 3: ARCH_CONSTRAINT - Explicit architectural decision in rationale
    if (acknowledgment?.rationale) {
      const rationale = acknowledgment.rationale.toLowerCase();
      const archKeywords = ['architecture', 'architectural', 'design constraint', 'system design', 'cannot change', 'by design'];
      if (archKeywords.some(kw => rationale.includes(kw))) {
        return {
          causality: Causality.ARCH_CONSTRAINT,
          reason: 'Architectural constraint documented in rationale'
        };
      }
    }

    // Rule 4: BUSINESS_CRITICAL - Critical risk with business justification
    if (risk.riskLevel === 'critical' && acknowledgment?.decision) {
      const decision = acknowledgment.decision.toLowerCase();
      const businessKeywords = ['business', 'revenue', 'customer', 'sla', 'compliance', 'regulatory', 'legal'];
      if (businessKeywords.some(kw => decision.includes(kw))) {
        return {
          causality: Causality.BUSINESS_CRITICAL,
          reason: 'Business-critical justification in decision'
        };
      }
    }

    // Rule 5: AWAITING_REDESIGN - Explicit redesign mention
    if (acknowledgment?.rationale || acknowledgment?.decision) {
      const text = `${acknowledgment.rationale || ''} ${acknowledgment.decision || ''}`.toLowerCase();
      const redesignKeywords = ['redesign', 'refactor', 'rewrite', 'tech debt', 'planned', 'roadmap', 'backlog'];
      if (redesignKeywords.some(kw => text.includes(kw))) {
        return {
          causality: Causality.AWAITING_REDESIGN,
          reason: 'Redesign/refactor mentioned in acknowledgment'
        };
      }
    }

    // Rule 6: TOOLING_GAP - Missing destruction block or tooling issues
    if (acknowledgment?.triggerType?.includes('missing_') ||
        acknowledgment?.triggerType?.includes('tooling') ||
        acknowledgment?.description?.toLowerCase().includes('tool')) {
      return {
        causality: Causality.TOOLING_GAP,
        reason: 'Tooling or documentation gap detected'
      };
    }

    // Rule 7: LEGACY_DEBT - Old file with stale acknowledgment
    if (gitMetadata.ageInDays > 180 && (risk.stalenessLevel === 'stale' || risk.stalenessLevel === 'fossil')) {
      return {
        causality: Causality.LEGACY_DEBT,
        reason: `Legacy code (${gitMetadata.ageInDays} days old) with stale acknowledgment`
      };
    }

    // Default: UNKNOWN - Never guess human intent
    return {
      causality: Causality.UNKNOWN,
      reason: 'Insufficient deterministic evidence for causality inference'
    };
  }

  // ==================== ORDER 22: RESISTANCE SCORE ====================

  /**
   * Compute resistance score:
   * resistanceScore = attentionScore × ageMultiplier × recurrenceCount
   *
   * Detects risks that survive pressure - these are true system constraints.
   */
  private computeResistanceScore(
    attentionScore: number,
    stalenessLevel: 'fresh' | 'aging' | 'stale' | 'fossil',
    recurrenceCount: number
  ): number {
    const ageMultiplier = this.AGE_MULTIPLIERS[stalenessLevel];
    const recurrence = Math.max(1, recurrenceCount);

    return Math.round(attentionScore * ageMultiplier * recurrence);
  }

  private determineResistanceLevel(score: number): ResistanceLevel {
    if (score >= this.RESISTANCE_THRESHOLDS.EXTREME) return 'EXTREME';
    if (score >= this.RESISTANCE_THRESHOLDS.HIGH) return 'HIGH';
    if (score >= this.RESISTANCE_THRESHOLDS.MODERATE) return 'MODERATE';
    if (score >= this.RESISTANCE_THRESHOLDS.LOW) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Count recurrences: how many times this risk appears across detection cycles
   */
  private countRecurrences(patternId: string, acknowledgments: AcknowledgmentEntry[]): number {
    const ack = acknowledgments.find(a => a.patternId === patternId);
    if (!ack) return 1;

    // Count based on detection span
    const firstDetected = new Date(ack.firstDetected);
    const lastDetected = new Date(ack.lastDetected);
    const daySpan = Math.floor((lastDetected.getTime() - firstDetected.getTime()) / (1000 * 60 * 60 * 24));

    // Estimate recurrence: longer span = more recurrences
    if (daySpan > 180) return 6;
    if (daySpan > 90) return 4;
    if (daySpan > 30) return 2;
    return 1;
  }

  // ==================== SUGGESTED ACTIONS ====================

  private determineSuggestedAction(
    causality: Causality,
    resistanceLevel: ResistanceLevel,
    riskLevel: string
  ): string {
    // Actions are suggestions, NOT enforcement
    switch (causality) {
      case Causality.ARCH_CONSTRAINT:
        return 'Requires architectural decision — not refactor';

      case Causality.BUSINESS_CRITICAL:
        return 'Business stakeholder review required before changes';

      case Causality.MISSING_OWNER:
        return 'Assign owner before further analysis';

      case Causality.LEGACY_DEBT:
        if (resistanceLevel === 'EXTREME') {
          return 'Deep legacy — consider isolation over modification';
        }
        return 'Legacy debt — evaluate modernization cost/benefit';

      case Causality.TOOLING_GAP:
        return 'Add missing documentation or tooling support';

      case Causality.AWAITING_REDESIGN:
        return 'Track in technical debt backlog — no quick fixes';

      case Causality.UNKNOWN:
      default:
        if (resistanceLevel === 'EXTREME' || resistanceLevel === 'HIGH') {
          return 'Investigate cause — high resistance indicates constraint';
        }
        return 'Periodic monitoring recommended';
    }
  }

  // ==================== MAIN ANALYSIS ====================

  analyze(): CausalityReport {
    const attentionRisks = this.loadAttentionIndex();
    const acknowledgments = this.loadAcknowledgments();
    const decisions = this.loadDecisionLog();
    const governancePhase = this.loadGovernancePhase();

    const analyses: CausalityAnalysis[] = [];
    const causalityCounts: Record<Causality, number> = {
      [Causality.LEGACY_DEBT]: 0,
      [Causality.MISSING_OWNER]: 0,
      [Causality.ARCH_CONSTRAINT]: 0,
      [Causality.BUSINESS_CRITICAL]: 0,
      [Causality.TOOLING_GAP]: 0,
      [Causality.AWAITING_REDESIGN]: 0,
      [Causality.UNKNOWN]: 0
    };

    for (const risk of attentionRisks) {
      const acknowledgment = acknowledgments.find(a => a.patternId === risk.patternId);
      const gitMetadata = this.getGitMetadata(risk.file);
      const recurrenceCount = this.countRecurrences(risk.patternId, acknowledgments);

      // ORDER 21: Infer causality
      const { causality, reason } = this.inferCausality(risk, acknowledgment, decisions, gitMetadata);

      // ORDER 22: Compute resistance score
      const resistanceScore = this.computeResistanceScore(
        risk.attentionScore,
        risk.stalenessLevel,
        recurrenceCount
      );
      const resistanceLevel = this.determineResistanceLevel(resistanceScore);

      // Suggested action (NOT enforcement)
      const suggestedAction = this.determineSuggestedAction(causality, resistanceLevel, risk.riskLevel);

      const analysis: CausalityAnalysis = {
        patternId: risk.patternId,
        file: risk.file,
        attentionScore: risk.attentionScore,
        riskLevel: risk.riskLevel,
        causality,
        causalityReason: reason,
        ageInDays: gitMetadata.ageInDays,
        recurrenceCount,
        resistanceScore,
        resistanceLevel,
        suggestedAction,
        gitMetadata
      };

      analyses.push(analysis);
      causalityCounts[causality]++;
    }

    // Sort by resistance score (highest first)
    analyses.sort((a, b) => b.resistanceScore - a.resistanceScore);

    const highestResistanceScore = analyses.length > 0 ? analyses[0].resistanceScore : 0;
    const extremeResistanceCount = analyses.filter(a => a.resistanceLevel === 'EXTREME').length;
    const archConstraintCount = causalityCounts[Causality.ARCH_CONSTRAINT];
    const legacyDebtCount = causalityCounts[Causality.LEGACY_DEBT];

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      governancePhase,
      topCausalities: analyses,
      summary: {
        totalAnalyzed: analyses.length,
        byCausality: causalityCounts,
        highestResistanceScore,
        extremeResistanceCount,
        archConstraintCount,
        legacyDebtCount
      }
    };
  }

  // ==================== OUTPUT ====================

  /**
   * Write to append-only artifact
   */
  writeCausalityReport(report: CausalityReport): void {
    try {
      const dataDir = path.dirname(this.CAUSALITY_OUTPUT_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Append-only: preserve history if exists
      let existingHistory: CausalityReport[] = [];
      if (fs.existsSync(this.CAUSALITY_OUTPUT_PATH)) {
        try {
          const existing = JSON.parse(fs.readFileSync(this.CAUSALITY_OUTPUT_PATH, 'utf-8'));
          if (existing.history) {
            existingHistory = existing.history;
          }
        } catch {
          // Start fresh if corrupt
        }
      }

      // Keep last 10 reports for history
      existingHistory.push(report);
      if (existingHistory.length > 10) {
        existingHistory = existingHistory.slice(-10);
      }

      const output = {
        ...report,
        history: existingHistory
      };

      fs.writeFileSync(this.CAUSALITY_OUTPUT_PATH, JSON.stringify(output, null, 2));
    } catch (error) {
      console.warn('Failed to write causality report:', error);
    }
  }

  /**
   * ORDER 23: Console output (ONE SCREEN ONLY)
   */
  printTop5Causalities(report: CausalityReport): void {
    console.log('\n=== PHASE A++++++ — GOVERNANCE CAUSALITY (TOP 5) ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Summary:');
    console.log(`  Total Analyzed:           ${report.summary.totalAnalyzed}`);
    console.log(`  Highest Resistance:       ${report.summary.highestResistanceScore}`);
    console.log(`  Extreme Resistance Count: ${report.summary.extremeResistanceCount}`);
    console.log(`  Arch Constraints:         ${report.summary.archConstraintCount}`);
    console.log(`  Legacy Debt:              ${report.summary.legacyDebtCount}\n`);

    if (report.topCausalities.length === 0) {
      console.log('No risks requiring causality analysis.\n');
      console.log('=== OBSERVATION COMPLETE ===\n');
      return;
    }

    console.log('=== TOP 5 BY RESISTANCE ===\n');

    const top5 = report.topCausalities.slice(0, 5);
    top5.forEach((analysis, index) => {
      const resistanceIcon =
        analysis.resistanceLevel === 'EXTREME' ? '🔴' :
        analysis.resistanceLevel === 'HIGH' ? '🟠' :
        analysis.resistanceLevel === 'MODERATE' ? '🟡' : '🟢';

      console.log(`${resistanceIcon} ${analysis.file}`);
      console.log(`   Cause: ${analysis.causality}`);
      console.log(`   Age: ${analysis.ageInDays} days`);
      console.log(`   Resistance: ${analysis.resistanceLevel} (${analysis.resistanceScore})`);
      console.log(`   Action: ${analysis.suggestedAction}`);
      console.log('');
    });

    console.log('See data/governance/risk-causality.json for full report.');
    console.log('\n=== OBSERVATION COMPLETE (NO CI BLOCKING) ===\n');
  }
}

// ==================== MAIN ====================

export function main(): void {
  const analyzer = new RiskCausalityAnalyzer();
  const report = analyzer.analyze();
  analyzer.writeCausalityReport(report);
  analyzer.printTop5Causalities(report);

  // ORDER 24: ALWAYS exit 0
  process.exit(0);
}

// Direct execution support
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

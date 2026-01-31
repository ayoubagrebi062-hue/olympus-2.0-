/**
 * RISK AUTHORITY MAP ANALYZER (OBSERVATION ONLY)
 *
 * Analyzes causality entries and infers required authority levels.
 * Detects authority mismatches (gaps) between acknowledged and required.
 *
 * STRICT CONSTRAINTS (ORDER 30):
 * - No CI blocking
 * - No auto-escalation
 * - No reassignment
 * - No rewriting human fields
 * - Observation only
 * - process.exit(0) ALWAYS
 * - Deterministic
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== TYPES ====================

/**
 * ORDER 26 - Authority Classification
 * Required authority level for each causality type.
 */
export enum AuthorityLevel {
  TEAM = 'TEAM', // Refactor / local decision
  TECH_LEAD = 'TECH_LEAD', // Design tradeoff
  ARCH_REVIEW = 'ARCH_REVIEW', // Cross-system architecture
  PRODUCT = 'PRODUCT', // Business tradeoff
  EXECUTIVE = 'EXECUTIVE', // Irreversible / existential
  UNKNOWN = 'UNKNOWN',
}

/**
 * Causality enum (from risk-causality.ts)
 */
export enum Causality {
  LEGACY_DEBT = 'LEGACY_DEBT',
  MISSING_OWNER = 'MISSING_OWNER',
  ARCH_CONSTRAINT = 'ARCH_CONSTRAINT',
  BUSINESS_CRITICAL = 'BUSINESS_CRITICAL',
  TOOLING_GAP = 'TOOLING_GAP',
  AWAITING_REDESIGN = 'AWAITING_REDESIGN',
  UNKNOWN = 'UNKNOWN',
}

export type ResistanceLevel = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';

/**
 * Inferred authority type from acknowledgedBy field
 */
export type InferredRole =
  | 'Developer'
  | 'Tech Lead'
  | 'Architect'
  | 'Product'
  | 'Executive'
  | 'Unknown';

export interface CausalityEntry {
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

export interface AuthorityAnalysis {
  patternId: string;
  file: string;
  causality: Causality;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  resistanceLevel: ResistanceLevel;
  requiredAuthority: AuthorityLevel;
  requiredAuthorityReason: string;
  acknowledgedBy: string | null;
  acknowledgedAuthority: AuthorityLevel;
  inferredRole: InferredRole;
  mismatchDetected: boolean;
  mismatchSeverity: 'critical' | 'warning' | 'none';
  recommendedNextStep: string;
}

export interface AuthorityReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  authorityAnalyses: AuthorityAnalysis[];
  summary: {
    totalAnalyzed: number;
    mismatchCount: number;
    criticalMismatchCount: number;
    warningMismatchCount: number;
    byRequiredAuthority: Record<AuthorityLevel, number>;
    byMismatchType: {
      underAuthorized: number;
      properlyAuthorized: number;
      unknown: number;
    };
  };
}

// ==================== AUTHORITY ANALYZER ====================

export class RiskAuthorityAnalyzer {
  private readonly CAUSALITY_PATH: string;
  private readonly ACKNOWLEDGMENT_PATH: string;
  private readonly AUTHORITY_OUTPUT_PATH: string;

  /**
   * Authority level hierarchy (lower index = lower authority)
   */
  private readonly AUTHORITY_HIERARCHY: AuthorityLevel[] = [
    AuthorityLevel.TEAM,
    AuthorityLevel.TECH_LEAD,
    AuthorityLevel.ARCH_REVIEW,
    AuthorityLevel.PRODUCT,
    AuthorityLevel.EXECUTIVE,
  ];

  /**
   * Role patterns for inferring authority from acknowledgedBy field
   * Never auto-assign a person — only role
   */
  private readonly ROLE_PATTERNS: {
    pattern: RegExp;
    role: InferredRole;
    authority: AuthorityLevel;
  }[] = [
    {
      pattern: /^(cto|ceo|vp|chief|director)/i,
      role: 'Executive',
      authority: AuthorityLevel.EXECUTIVE,
    },
    {
      pattern: /(product|pm|product.?manager)/i,
      role: 'Product',
      authority: AuthorityLevel.PRODUCT,
    },
    {
      pattern: /(architect|arch|principal|staff)/i,
      role: 'Architect',
      authority: AuthorityLevel.ARCH_REVIEW,
    },
    {
      pattern: /(lead|senior|sr\.?|tech.?lead|team.?lead)/i,
      role: 'Tech Lead',
      authority: AuthorityLevel.TECH_LEAD,
    },
    {
      pattern: /(dev|developer|engineer|swe|sde)/i,
      role: 'Developer',
      authority: AuthorityLevel.TEAM,
    },
  ];

  constructor() {
    this.CAUSALITY_PATH = path.join(process.cwd(), 'data', 'governance', 'risk-causality.json');
    this.ACKNOWLEDGMENT_PATH = path.join(
      process.cwd(),
      'contracts',
      'governance-risk-acknowledgment.json'
    );
    this.AUTHORITY_OUTPUT_PATH = path.join(
      process.cwd(),
      'data',
      'governance',
      'risk-authority.json'
    );
  }

  // ==================== DATA LOADERS ====================

  private loadCausalityReport(): CausalityEntry[] {
    try {
      if (!fs.existsSync(this.CAUSALITY_PATH)) {
        return [];
      }
      const content = fs.readFileSync(this.CAUSALITY_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.topCausalities || [];
    } catch (error) {
      console.warn('Failed to load causality report:', error);
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

  // ==================== ORDER 26: AUTHORITY CLASSIFICATION ====================

  /**
   * Infer required authority level based on causality.
   * Rules are non-negotiable and deterministic.
   */
  private inferRequiredAuthority(
    causality: Causality,
    riskLevel: string,
    resistanceLevel: ResistanceLevel
  ): { authority: AuthorityLevel; reason: string } {
    // Rule 1: ARCH_CONSTRAINT → ARCH_REVIEW or EXECUTIVE
    if (causality === Causality.ARCH_CONSTRAINT) {
      if (resistanceLevel === 'EXTREME' || riskLevel === 'critical') {
        return {
          authority: AuthorityLevel.EXECUTIVE,
          reason:
            'Architectural constraint with extreme resistance or critical risk requires executive decision',
        };
      }
      return {
        authority: AuthorityLevel.ARCH_REVIEW,
        reason: 'Architectural constraint requires architecture review board decision',
      };
    }

    // Rule 2: BUSINESS_CRITICAL → PRODUCT
    if (causality === Causality.BUSINESS_CRITICAL) {
      if (riskLevel === 'critical' && resistanceLevel === 'EXTREME') {
        return {
          authority: AuthorityLevel.EXECUTIVE,
          reason: 'Critical business risk with extreme resistance requires executive sign-off',
        };
      }
      return {
        authority: AuthorityLevel.PRODUCT,
        reason: 'Business-critical decision requires product owner approval',
      };
    }

    // Rule 3: MISSING_OWNER → TECH_LEAD
    if (causality === Causality.MISSING_OWNER) {
      return {
        authority: AuthorityLevel.TECH_LEAD,
        reason: 'Missing owner requires tech lead to assign ownership',
      };
    }

    // Rule 4: LEGACY_DEBT → TEAM or TECH_LEAD
    if (causality === Causality.LEGACY_DEBT) {
      if (resistanceLevel === 'EXTREME' || resistanceLevel === 'HIGH') {
        return {
          authority: AuthorityLevel.TECH_LEAD,
          reason: 'High-resistance legacy debt requires tech lead evaluation',
        };
      }
      return {
        authority: AuthorityLevel.TEAM,
        reason: 'Legacy debt can be addressed by team-level refactoring',
      };
    }

    // Rule 5: AWAITING_REDESIGN → TECH_LEAD or ARCH_REVIEW
    if (causality === Causality.AWAITING_REDESIGN) {
      if (riskLevel === 'critical' || riskLevel === 'high') {
        return {
          authority: AuthorityLevel.ARCH_REVIEW,
          reason: 'Critical/high risk redesign requires architecture review',
        };
      }
      return {
        authority: AuthorityLevel.TECH_LEAD,
        reason: 'Redesign planning requires tech lead coordination',
      };
    }

    // Rule 6: TOOLING_GAP → TEAM or TECH_LEAD
    if (causality === Causality.TOOLING_GAP) {
      if (riskLevel === 'critical') {
        return {
          authority: AuthorityLevel.TECH_LEAD,
          reason: 'Critical tooling gap requires tech lead prioritization',
        };
      }
      return {
        authority: AuthorityLevel.TEAM,
        reason: 'Tooling gap can be addressed at team level',
      };
    }

    // Rule 7: UNKNOWN causality
    if (causality === Causality.UNKNOWN) {
      if (riskLevel === 'critical') {
        return {
          authority: AuthorityLevel.TECH_LEAD,
          reason: 'Unknown causality with critical risk requires tech lead investigation',
        };
      }
      return {
        authority: AuthorityLevel.UNKNOWN,
        reason: 'Insufficient information to determine required authority',
      };
    }

    // Fallback
    return {
      authority: AuthorityLevel.UNKNOWN,
      reason: 'Unable to determine required authority',
    };
  }

  // ==================== ROLE INFERENCE ====================

  /**
   * Infer role and authority from acknowledgedBy field.
   * Never auto-assign a person — only role.
   */
  private inferAcknowledgedAuthority(acknowledgedBy: string | undefined): {
    role: InferredRole;
    authority: AuthorityLevel;
  } {
    if (!acknowledgedBy) {
      return { role: 'Unknown', authority: AuthorityLevel.UNKNOWN };
    }

    const normalizedName = acknowledgedBy.toLowerCase().trim();

    // Check against role patterns
    for (const { pattern, role, authority } of this.ROLE_PATTERNS) {
      if (pattern.test(normalizedName)) {
        return { role, authority };
      }
    }

    // Default: assume developer level if no pattern matches
    // This is conservative — better to flag a potential mismatch
    return { role: 'Developer', authority: AuthorityLevel.TEAM };
  }

  // ==================== ORDER 27: GAP DETECTION ====================

  /**
   * Detect authority mismatch.
   * Warning, not enforcement.
   */
  private detectMismatch(
    requiredAuthority: AuthorityLevel,
    acknowledgedAuthority: AuthorityLevel
  ): { mismatchDetected: boolean; severity: 'critical' | 'warning' | 'none' } {
    // Unknown authorities cannot be compared
    if (
      requiredAuthority === AuthorityLevel.UNKNOWN ||
      acknowledgedAuthority === AuthorityLevel.UNKNOWN
    ) {
      return { mismatchDetected: false, severity: 'none' };
    }

    const requiredIndex = this.AUTHORITY_HIERARCHY.indexOf(requiredAuthority);
    const acknowledgedIndex = this.AUTHORITY_HIERARCHY.indexOf(acknowledgedAuthority);

    // No mismatch if acknowledged authority >= required
    if (acknowledgedIndex >= requiredIndex) {
      return { mismatchDetected: false, severity: 'none' };
    }

    // Mismatch detected: acknowledged authority < required
    const gap = requiredIndex - acknowledgedIndex;

    // Critical: gap of 2+ levels (e.g., TEAM acknowledging ARCH_REVIEW decision)
    if (gap >= 2) {
      return { mismatchDetected: true, severity: 'critical' };
    }

    // Warning: gap of 1 level
    return { mismatchDetected: true, severity: 'warning' };
  }

  // ==================== RECOMMENDED ACTIONS ====================

  private determineRecommendedNextStep(
    requiredAuthority: AuthorityLevel,
    mismatchDetected: boolean,
    causality: Causality
  ): string {
    if (!mismatchDetected) {
      return 'Authority level appropriate — periodic review recommended';
    }

    switch (requiredAuthority) {
      case AuthorityLevel.EXECUTIVE:
        return 'Escalate to executive sponsor for irreversible decision approval';

      case AuthorityLevel.PRODUCT:
        return 'Schedule product owner review for business impact assessment';

      case AuthorityLevel.ARCH_REVIEW:
        return 'Schedule architecture decision record (ADR) review';

      case AuthorityLevel.TECH_LEAD:
        if (causality === Causality.MISSING_OWNER) {
          return 'Tech lead to assign owner and document accountability';
        }
        return 'Request tech lead review and sign-off';

      case AuthorityLevel.TEAM:
        return 'Team-level discussion recommended';

      default:
        return 'Investigate authority requirements';
    }
  }

  // ==================== MAIN ANALYSIS ====================

  analyze(): AuthorityReport {
    const causalities = this.loadCausalityReport();
    const acknowledgments = this.loadAcknowledgments();
    const governancePhase = this.loadGovernancePhase();

    const analyses: AuthorityAnalysis[] = [];
    const byRequiredAuthority: Record<AuthorityLevel, number> = {
      [AuthorityLevel.TEAM]: 0,
      [AuthorityLevel.TECH_LEAD]: 0,
      [AuthorityLevel.ARCH_REVIEW]: 0,
      [AuthorityLevel.PRODUCT]: 0,
      [AuthorityLevel.EXECUTIVE]: 0,
      [AuthorityLevel.UNKNOWN]: 0,
    };

    let mismatchCount = 0;
    let criticalMismatchCount = 0;
    let warningMismatchCount = 0;
    let underAuthorized = 0;
    let properlyAuthorized = 0;
    let unknownAuth = 0;

    for (const entry of causalities) {
      const acknowledgment = acknowledgments.find(a => a.patternId === entry.patternId);

      // ORDER 26: Infer required authority
      const { authority: requiredAuthority, reason: requiredAuthorityReason } =
        this.inferRequiredAuthority(
          entry.causality as Causality,
          entry.riskLevel,
          entry.resistanceLevel
        );

      // Infer acknowledged authority from acknowledgedBy
      const { role: inferredRole, authority: acknowledgedAuthority } =
        this.inferAcknowledgedAuthority(acknowledgment?.acknowledgedBy);

      // ORDER 27: Detect mismatch
      const { mismatchDetected, severity: mismatchSeverity } = this.detectMismatch(
        requiredAuthority,
        acknowledgedAuthority
      );

      // Recommended next step
      const recommendedNextStep = this.determineRecommendedNextStep(
        requiredAuthority,
        mismatchDetected,
        entry.causality as Causality
      );

      const analysis: AuthorityAnalysis = {
        patternId: entry.patternId,
        file: entry.file,
        causality: entry.causality as Causality,
        riskLevel: entry.riskLevel,
        resistanceLevel: entry.resistanceLevel,
        requiredAuthority,
        requiredAuthorityReason,
        acknowledgedBy: acknowledgment?.acknowledgedBy || null,
        acknowledgedAuthority,
        inferredRole,
        mismatchDetected,
        mismatchSeverity,
        recommendedNextStep,
      };

      analyses.push(analysis);

      // Update counts
      byRequiredAuthority[requiredAuthority]++;

      if (mismatchDetected) {
        mismatchCount++;
        underAuthorized++;
        if (mismatchSeverity === 'critical') {
          criticalMismatchCount++;
        } else if (mismatchSeverity === 'warning') {
          warningMismatchCount++;
        }
      } else if (acknowledgedAuthority === AuthorityLevel.UNKNOWN) {
        unknownAuth++;
      } else {
        properlyAuthorized++;
      }
    }

    // Sort by mismatch severity (critical first), then by resistance
    analyses.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, none: 2 };
      const aSeverity = severityOrder[a.mismatchSeverity];
      const bSeverity = severityOrder[b.mismatchSeverity];
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;

      // Then by authority level (higher required authority first)
      const aAuth = this.AUTHORITY_HIERARCHY.indexOf(a.requiredAuthority);
      const bAuth = this.AUTHORITY_HIERARCHY.indexOf(b.requiredAuthority);
      return bAuth - aAuth;
    });

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      governancePhase,
      authorityAnalyses: analyses,
      summary: {
        totalAnalyzed: analyses.length,
        mismatchCount,
        criticalMismatchCount,
        warningMismatchCount,
        byRequiredAuthority,
        byMismatchType: {
          underAuthorized,
          properlyAuthorized,
          unknown: unknownAuth,
        },
      },
    };
  }

  // ==================== OUTPUT ====================

  /**
   * ORDER 28: Write to append-only artifact
   */
  writeAuthorityReport(report: AuthorityReport): void {
    try {
      const dataDir = path.dirname(this.AUTHORITY_OUTPUT_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Append-only: preserve history if exists
      let existingHistory: AuthorityReport[] = [];
      if (fs.existsSync(this.AUTHORITY_OUTPUT_PATH)) {
        try {
          const existing = JSON.parse(fs.readFileSync(this.AUTHORITY_OUTPUT_PATH, 'utf-8'));
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
        history: existingHistory,
      };

      fs.writeFileSync(this.AUTHORITY_OUTPUT_PATH, JSON.stringify(output, null, 2));
    } catch (error) {
      console.warn('Failed to write authority report:', error);
    }
  }

  /**
   * ORDER 29: Console output (ONE SCREEN ONLY)
   */
  printTop5AuthorityGaps(report: AuthorityReport): void {
    console.log('\n=== PHASE A+++++++ — GOVERNANCE AUTHORITY GAPS (TOP 5) ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('Summary:');
    console.log(`  Total Analyzed:        ${report.summary.totalAnalyzed}`);
    console.log(`  Authority Gaps:        ${report.summary.mismatchCount}`);
    console.log(`  Critical Gaps:         ${report.summary.criticalMismatchCount}`);
    console.log(`  Warning Gaps:          ${report.summary.warningMismatchCount}`);
    console.log(`  Properly Authorized:   ${report.summary.byMismatchType.properlyAuthorized}`);
    console.log(`  Unknown Authority:     ${report.summary.byMismatchType.unknown}\n`);

    if (report.authorityAnalyses.length === 0) {
      console.log('No entries requiring authority analysis.\n');
      console.log('=== OBSERVATION COMPLETE ===\n');
      return;
    }

    // Filter to show mismatches first, then others
    const mismatches = report.authorityAnalyses.filter(a => a.mismatchDetected);
    const top5 =
      mismatches.length > 0 ? mismatches.slice(0, 5) : report.authorityAnalyses.slice(0, 5);

    if (mismatches.length > 0) {
      console.log('=== TOP 5 AUTHORITY GAPS ===\n');
    } else {
      console.log('=== TOP 5 AUTHORITY MAPPINGS (NO GAPS) ===\n');
    }

    top5.forEach(analysis => {
      const gapIcon =
        analysis.mismatchSeverity === 'critical'
          ? '🔴'
          : analysis.mismatchSeverity === 'warning'
            ? '🟠'
            : '🟢';

      console.log(`${gapIcon} ${analysis.file}`);
      console.log(`   Cause: ${analysis.causality}`);
      console.log(`   Required Authority: ${analysis.requiredAuthority}`);
      console.log(
        `   Acknowledged By: ${analysis.acknowledgedBy || 'None'} (${analysis.inferredRole})`
      );

      if (analysis.mismatchDetected) {
        console.log(`   ⚠️  Authority Gap Detected (${analysis.mismatchSeverity.toUpperCase()})`);
      } else {
        console.log(`   ✅ Authority Level Appropriate`);
      }

      console.log(`   Action: ${analysis.recommendedNextStep}`);
      console.log('');
    });

    if (report.summary.mismatchCount > 5) {
      console.log(`... and ${report.summary.mismatchCount - 5} more authority gaps.\n`);
    }

    console.log('See data/governance/risk-authority.json for full report.');
    console.log('\n=== OBSERVATION COMPLETE (NO CI BLOCKING) ===\n');
  }
}

// ==================== MAIN ====================

export function main(): void {
  const analyzer = new RiskAuthorityAnalyzer();
  const report = analyzer.analyze();
  analyzer.writeAuthorityReport(report);
  analyzer.printTop5AuthorityGaps(report);

  // ORDER 30: ALWAYS exit 0
  process.exit(0);
}

// Direct execution support
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

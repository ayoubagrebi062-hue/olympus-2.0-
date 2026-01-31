import * as fs from 'fs';
import * as path from 'path';
import { TierClassifier, FileAnalysis } from './tier-classifier';
import { getDecisionStrategyLoader, getCurrentEnvironment } from '../shared/loader-singleton';
import type { Violation as LoaderViolation } from '../autonomous/decision-strategy-loader';

interface Violation {
  filePath: string;
  tier: string | null;
  violation: string;
  severity: 'error' | 'warning';
  confidence?: number;
  lineNumber?: number;
  codeSnippet?: string;
}

interface EnforcementReport {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  violations: Violation[];
  summary: {
    tier1: number;
    tier2: number;
    tier3: number;
    unclassified: number;
  };
}

export class TierEnforcer {
  private classifier: TierClassifier;
  private useStrategyLoader: boolean = true;

  constructor(configPath?: string, options?: { useStrategyLoader?: boolean }) {
    this.classifier = new TierClassifier(configPath);
    this.useStrategyLoader = options?.useStrategyLoader ?? true;
  }

  async enforce(filePaths: string[]): Promise<EnforcementReport> {
    const violations: Violation[] = [];
    const summary = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      unclassified: 0,
    };

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        violations.push({
          filePath,
          tier: null,
          violation: 'File does not exist',
          severity: 'error',
        });
        continue;
      }

      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        continue;
      }

      // POLICY: Exclude test files from governance checks
      // Rationale: Test files simulate operations for testing purposes,
      // not production execution. Governance markers are for production code.
      const normalizedPath = filePath.replace(/\\/g, '/');
      if (normalizedPath.includes('/__tests__/') || normalizedPath.endsWith('.test.ts')) {
        continue;
      }

      const analysis: FileAnalysis = this.classifier.analyzeFile(filePath);

      this.updateSummary(analysis.detectedTier, summary);

      violations.push(...(await this.checkTierCompliance(analysis)));
      violations.push(...this.checkAmbiguity(analysis));
    }

    const report: EnforcementReport = {
      totalFiles: filePaths.length,
      passedFiles: summary.tier1 + summary.tier2 + summary.tier3,
      failedFiles: violations.filter(v => v.severity === 'error').length,
      violations,
      summary,
    };

    this.printReport(report);

    if (report.failedFiles > 0) {
      process.exit(1);
    }

    return report;
  }

  /**
   * Route to either strategy-based or hardcoded compliance check
   */
  private async checkTierCompliance(analysis: FileAnalysis): Promise<Violation[]> {
    if (this.useStrategyLoader) {
      return this.checkTierComplianceWithStrategy(analysis);
    } else {
      return this.checkTierComplianceHardcoded(analysis);
    }
  }

  /**
   * Strategy-based compliance check using decision-strategy-loader
   */
  private async checkTierComplianceWithStrategy(analysis: FileAnalysis): Promise<Violation[]> {
    try {
      const loader = await getDecisionStrategyLoader();
      const strategy = await loader.getStrategy(getCurrentEnvironment());
      const violations: Violation[] = [];

      for (const violationMsg of analysis.violations) {
        const loaderViolation: LoaderViolation = {
          id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern: this.extractPattern(violationMsg),
          tier: this.extractTier(analysis.detectedTier),
          filePath: analysis.filePath,
          confidence: analysis.confidence ?? 0,
        };

        const decision = await strategy.decide(loaderViolation, null);

        switch (decision.action) {
          case 'alert-human':
            violations.push({
              filePath: analysis.filePath,
              tier: analysis.detectedTier,
              violation: `${violationMsg} [Decision: ${decision.reason}]`,
              severity: 'error',
              confidence: decision.confidence,
            });
            break;
          case 'auto-fix':
            violations.push({
              filePath: analysis.filePath,
              tier: analysis.detectedTier,
              violation: `${violationMsg} [Auto-fixable: ${decision.reason}]`,
              severity: 'warning',
              confidence: decision.confidence,
            });
            break;
          case 'suppress':
            if (process.env.GOVERNANCE_DEBUG) {
              console.log(`[Suppressed] ${analysis.filePath}: ${violationMsg}`);
            }
            break;
        }
      }
      return violations;
    } catch (error) {
      console.warn('[TierEnforcer] Strategy loader failed, using hardcoded rules:', error);
      return this.checkTierComplianceHardcoded(analysis);
    }
  }

  /**
   * Hardcoded compliance check (fallback/legacy)
   */
  private checkTierComplianceHardcoded(analysis: FileAnalysis): Violation[] {
    const violations: Violation[] = [];
    const { filePath, detectedTier, behaviors } = analysis;
    const confidence = analysis.confidence ?? 0;
    const lineNumbers = analysis.lineNumbers ?? [];
    const codeSnippets = analysis.codeSnippets ?? [];

    if (!detectedTier) {
      return [
        {
          filePath,
          tier: 'unclassified',
          violation: 'File could not be classified to a tier',
          severity: 'error',
          confidence: 0.5,
        },
      ];
    }

    if (detectedTier === 'tier1') {
      if (behaviors.hasDbWrites) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT perform DB writes',
          severity: 'error',
          confidence,
          lineNumber: lineNumbers[0],
          codeSnippet: codeSnippets[0],
        });
      }
      if (behaviors.hasEnforcement) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT perform enforcement logic',
          severity: 'error',
          confidence,
        });
      }
      if (behaviors.hasIrreversibility) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT perform irreversible operations',
          severity: 'error',
          confidence,
        });
      }
      if (behaviors.hasHumanAccountability) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT contain human accountability markers',
          severity: 'error',
          confidence,
        });
      }
    }

    if (detectedTier === 'tier2') {
      if (behaviors.hasIrreversibility) {
        violations.push({
          filePath,
          tier: 'tier2',
          violation: 'Tier2 code MUST NOT perform irreversible operations (Tier3 only)',
          severity: 'error',
          confidence,
        });
      }
      if (behaviors.hasEthicalOversight) {
        violations.push({
          filePath,
          tier: 'tier2',
          violation: 'Tier2 code MUST NOT contain ethical oversight markers (Tier3 only)',
          severity: 'error',
          confidence,
        });
      }
      if (!behaviors.hasAuthorityCheck) {
        violations.push({
          filePath,
          tier: 'tier2',
          violation: 'Tier2 code MUST contain AUTHORITY_CHECK marker',
          severity: 'error',
          confidence,
        });
      }
    }

    if (detectedTier === 'tier3') {
      if (!behaviors.hasEthicalOversight) {
        violations.push({
          filePath,
          tier: 'tier3',
          violation: 'Tier3 code MUST contain ETHICAL_OVERSIGHT marker',
          severity: 'error',
          confidence,
        });
      }
      if (!behaviors.hasHumanAccountability) {
        violations.push({
          filePath,
          tier: 'tier3',
          violation: 'Tier3 code MUST contain HUMAN_ACCOUNTABILITY marker',
          severity: 'error',
          confidence,
        });
      }
      if (!behaviors.hasHumanOverrideRequired) {
        violations.push({
          filePath,
          tier: 'tier3',
          violation: 'Tier3 code MUST contain HUMAN_OVERRIDE_REQUIRED marker',
          severity: 'error',
          confidence,
        });
      }
    }

    return violations;
  }

  private checkAmbiguity(analysis: FileAnalysis): Violation[] {
    const violations: Violation[] = [];
    const { filePath, behaviors } = analysis;

    // HIERARCHICAL tier detection (FIXED: was overlapping, causing false positives)
    // Tier 3 = highest priority (irreversible operations)
    // Tier 2 = medium priority (DB/enforcement without irreversibility)
    // Tier 1 = default (pure logic, no side effects)
    const hasTier3Behavior = behaviors.hasIrreversibility;
    const hasTier2Behavior =
      !hasTier3Behavior && (behaviors.hasDbWrites || behaviors.hasEnforcement);
    const hasTier1Behavior = !hasTier3Behavior && !hasTier2Behavior;

    const behaviorCount = [hasTier1Behavior, hasTier2Behavior, hasTier3Behavior].filter(
      Boolean
    ).length;

    if (behaviorCount > 1) {
      violations.push({
        filePath,
        tier: analysis.detectedTier,
        violation: 'File contains mixed tier behaviors - must be isolated to single tier',
        severity: 'error',
      });
    }

    if (behaviors.hasHumanOverrideRequired && !behaviors.hasIrreversibility) {
      violations.push({
        filePath,
        tier: analysis.detectedTier,
        violation:
          'HUMAN_OVERRIDE_REQUIRED marker found without irreversible operations (Tier3 only)',
        severity: 'error',
      });
    }

    if (behaviors.hasEthicalOversight && !behaviors.hasIrreversibility) {
      violations.push({
        filePath,
        tier: analysis.detectedTier,
        violation: 'ETHICAL_OVERSIGHT marker found without irreversible operations (Tier3 only)',
        severity: 'error',
      });
    }

    return violations;
  }

  private updateSummary(detectedTier: string | null, summary: any): void {
    if (!detectedTier) {
      summary.unclassified++;
    } else {
      summary[detectedTier]++;
    }
  }

  /**
   * Extract pattern name from violation message for strategy lookup
   */
  private extractPattern(violationMsg: string): string {
    if (violationMsg.includes('DB writes')) return 'db_write_in_tier1';
    if (violationMsg.includes('enforcement logic')) return 'enforcement_in_tier1';
    if (violationMsg.includes('irreversible')) return 'irreversible_operation';
    if (violationMsg.includes('AUTHORITY_CHECK')) return 'missing_authority_check';
    if (violationMsg.includes('ETHICAL_OVERSIGHT')) return 'missing_ethical_oversight';
    if (violationMsg.includes('HUMAN_ACCOUNTABILITY')) return 'missing_human_accountability';
    if (violationMsg.includes('HUMAN_OVERRIDE_REQUIRED')) return 'missing_human_override';
    if (violationMsg.includes('mixed tier behaviors')) return 'mixed_tier_behaviors';
    return 'unknown_violation';
  }

  /**
   * Extract tier number from detected tier string
   */
  private extractTier(detectedTier: string | null): 1 | 2 | 3 {
    if (detectedTier === 'tier1') return 1;
    if (detectedTier === 'tier2') return 2;
    if (detectedTier === 'tier3') return 3;
    return 1; // Default to tier 1 for unknown
  }

  private printReport(report: EnforcementReport): void {
    // ANSI color codes
    const colors = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m',
      bgRed: '\x1b[41m',
      bgGreen: '\x1b[42m',
      bgYellow: '\x1b[43m',
    };

    // Header box
    console.log(
      '\n' +
        colors.cyan +
        colors.bold +
        '╔══════════════════════════════════════════════════════════════╗' +
        colors.reset
    );
    console.log(
      colors.cyan +
        colors.bold +
        '║        🏛️  OLYMPUS GOVERNANCE ENFORCEMENT REPORT           ║' +
        colors.reset
    );
    console.log(
      colors.cyan +
        colors.bold +
        '╚══════════════════════════════════════════════════════════════╝' +
        colors.reset +
        '\n'
    );

    // Summary section
    console.log(colors.bold + '📊 SCAN SUMMARY' + colors.reset + '\n');
    console.log(`  Files Scanned:    ${colors.cyan}${report.totalFiles}${colors.reset}`);
    console.log(
      `  Violations:       ${report.violations.length > 0 ? colors.red : colors.green}${report.violations.length}${colors.reset}`
    );
    console.log(`  Passed:           ${colors.green}${report.passedFiles}${colors.reset}`);
    console.log(
      `  Failed:           ${report.failedFiles > 0 ? colors.red : colors.green}${report.failedFiles}${colors.reset}`
    );
    console.log(
      `  Unclassified:     ${report.summary.unclassified > 0 ? colors.yellow : colors.gray}${report.summary.unclassified}${colors.reset}`
    );

    // Tier distribution
    console.log('\n' + colors.bold + '📈 TIER DISTRIBUTION' + colors.reset + '\n');
    console.log(
      `  ${colors.green}Tier 1${colors.reset} (Fast & Reversible):  ${colors.green}${report.summary.tier1}${colors.reset}`
    );
    console.log(
      `  ${colors.yellow}Tier 2${colors.reset} (Governed):           ${colors.yellow}${report.summary.tier2}${colors.reset}`
    );
    console.log(
      `  ${colors.red}Tier 3${colors.reset} (Irreversible):       ${colors.red}${report.summary.tier3}${colors.reset}`
    );

    // Violations section
    if (report.violations.length > 0) {
      console.log('\n' + colors.red + colors.bold + '⚠️  VIOLATIONS FOUND' + colors.reset + '\n');

      const errorViolations = report.violations.filter(v => v.severity === 'error');
      const warningViolations = report.violations.filter(v => v.severity === 'warning');

      // Group by confidence for better triage
      const highConfidence = errorViolations.filter(v => (v.confidence || 0.5) > 0.7);
      const lowConfidence = errorViolations.filter(v => (v.confidence || 0.5) <= 0.7);

      if (highConfidence.length > 0) {
        console.log(colors.red + colors.bold + 'HIGH CONFIDENCE VIOLATIONS:' + colors.reset);
        this.printViolations(highConfidence, colors);
      }

      if (lowConfidence.length > 0) {
        console.log(
          '\n' +
            colors.yellow +
            colors.bold +
            'LOW CONFIDENCE (Possible False Positives):' +
            colors.reset
        );
        this.printViolations(lowConfidence, colors);
      }

      if (warningViolations.length > 0) {
        console.log('\n' + colors.yellow + colors.bold + 'WARNINGS:' + colors.reset);
        this.printViolations(warningViolations, colors);
      }

      // Next steps
      console.log('\n' + colors.bold + '🚀 NEXT STEPS' + colors.reset + '\n');
      if (lowConfidence.length > 0) {
        console.log(
          colors.yellow +
            '  ⚠  Review low-confidence violations - may be false positives' +
            colors.reset
        );
        console.log(
          colors.gray +
            '     Add @governance-ignore comment to suppress false positives' +
            colors.reset
        );
      }
      if (highConfidence.length > 0) {
        console.log(
          colors.red + '  ⛔ Fix high-confidence violations before proceeding' + colors.reset
        );
      }
    }

    // Final status
    console.log(
      '\n' +
        colors.cyan +
        colors.bold +
        '═══════════════════════════════════════════════════════════════' +
        colors.reset +
        '\n'
    );

    if (report.failedFiles > 0) {
      console.log(colors.red + colors.bold + '❌ GOVERNANCE CHECK FAILED' + colors.reset);
      console.log(colors.red + 'Fix violations before proceeding.\n' + colors.reset);
    } else {
      console.log(colors.green + colors.bold + '✅ GOVERNANCE CHECK PASSED' + colors.reset);
      console.log(colors.green + 'All files comply with governance rules.\n' + colors.reset);
    }
  }

  private printViolations(violations: Violation[], colors: any): void {
    violations.forEach((v, index) => {
      const tierColor =
        v.tier === 'tier3' ? colors.red : v.tier === 'tier2' ? colors.yellow : colors.green;
      const tierLabel = v.tier?.toUpperCase() || 'UNKNOWN';
      const confidence = v.confidence !== undefined ? Math.round(v.confidence * 100) : 50;
      const confidenceColor = confidence > 70 ? colors.red : colors.yellow;

      console.log(
        `  ${colors.gray}[${index + 1}]${colors.reset} ${tierColor}[${tierLabel}]${colors.reset} ${colors.dim}${v.filePath}${colors.reset}`
      );
      console.log(`      ${colors.red}→${colors.reset} ${v.violation}`);

      if (v.lineNumber) {
        console.log(
          `      ${colors.gray}Line ${v.lineNumber}:${colors.reset} ${colors.dim}${v.codeSnippet}${colors.reset}`
        );
      }

      console.log(
        `      ${colors.gray}Confidence: ${confidenceColor}${confidence}%${colors.reset}`
      );

      if (confidence < 70) {
        console.log(
          `      ${colors.yellow}⚠ Possible False Positive - Review manually${colors.reset}`
        );
      }

      console.log(''); // Empty line between violations
    });
  }
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  // Directories to exclude from scanning (dependencies, build outputs, version control)
  const EXCLUDED_DIRS = [
    'node_modules',
    'dist',
    'build',
    'out',
    '.next',
    '.git',
    'coverage',
    '.turbo',
    '.vercel',
    '.cache',
  ];

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    // Skip excluded directories
    if (EXCLUDED_DIRS.includes(file)) {
      return;
    }

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
  const enforcer = new TierEnforcer();

  (async () => {
    try {
      if (args.length === 0) {
        console.log('No files specified, scanning src directory...\n');
        const files = getAllTypeScriptFiles('src');
        await enforcer.enforce(files);
      } else {
        await enforcer.enforce(args);
      }
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}

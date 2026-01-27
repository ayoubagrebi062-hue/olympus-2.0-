import * as fs from 'fs';
import * as path from 'path';
import { TierClassifier, FileAnalysis } from './tier-classifier';

interface Violation {
  filePath: string;
  tier: string | null;
  violation: string;
  severity: 'error' | 'warning';
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

  constructor(configPath?: string) {
    this.classifier = new TierClassifier(configPath);
  }

  enforce(filePaths: string[]): EnforcementReport {
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

      const analysis: FileAnalysis = this.classifier.analyzeFile(filePath);

      this.updateSummary(analysis.detectedTier, summary);

      violations.push(...this.checkTierCompliance(analysis));
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

  private checkTierCompliance(analysis: FileAnalysis): Violation[] {
    const violations: Violation[] = [];
    const { filePath, detectedTier, behaviors } = analysis;

    if (!detectedTier) {
      return [
        {
          filePath,
          tier: 'unclassified',
          violation: 'File could not be classified to a tier',
          severity: 'error',
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
        });
      }
      if (behaviors.hasEnforcement) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT perform enforcement logic',
          severity: 'error',
        });
      }
      if (behaviors.hasIrreversibility) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT perform irreversible operations',
          severity: 'error',
        });
      }
      if (behaviors.hasHumanAccountability) {
        violations.push({
          filePath,
          tier: 'tier1',
          violation: 'Tier1 code MUST NOT contain human accountability markers',
          severity: 'error',
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
        });
      }
      if (behaviors.hasEthicalOversight) {
        violations.push({
          filePath,
          tier: 'tier2',
          violation: 'Tier2 code MUST NOT contain ethical oversight markers (Tier3 only)',
          severity: 'error',
        });
      }
      if (!behaviors.hasAuthorityCheck) {
        violations.push({
          filePath,
          tier: 'tier2',
          violation: 'Tier2 code MUST contain AUTHORITY_CHECK marker',
          severity: 'error',
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
        });
      }
      if (!behaviors.hasHumanAccountability) {
        violations.push({
          filePath,
          tier: 'tier3',
          violation: 'Tier3 code MUST contain HUMAN_ACCOUNTABILITY marker',
          severity: 'error',
        });
      }
      if (!behaviors.hasHumanOverrideRequired) {
        violations.push({
          filePath,
          tier: 'tier3',
          violation: 'Tier3 code MUST contain HUMAN_OVERRIDE_REQUIRED marker',
          severity: 'error',
        });
      }
    }

    return violations;
  }

  private checkAmbiguity(analysis: FileAnalysis): Violation[] {
    const violations: Violation[] = [];
    const { filePath, behaviors } = analysis;

    const hasTier1Behavior = !behaviors.hasDbWrites && !behaviors.hasEnforcement;
    const hasTier2Behavior =
      (behaviors.hasDbWrites || behaviors.hasEnforcement) && !behaviors.hasIrreversibility;
    const hasTier3Behavior = behaviors.hasIrreversibility;

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

  private printReport(report: EnforcementReport): void {
    console.log('\n=== Three-Tier Governance Enforcement Report ===\n');

    console.log('Summary:');
    console.log(`  Total Files:  ${report.totalFiles}`);
    console.log(`  Passed:       ${report.passedFiles}`);
    console.log(`  Failed:       ${report.failedFiles}`);
    console.log(`  Unclassified: ${report.summary.unclassified}`);

    console.log('\nTier Distribution:');
    console.log(`  Tier 1 (Fast & Reversible):  ${report.summary.tier1}`);
    console.log(`  Tier 2 (Governed):           ${report.summary.tier2}`);
    console.log(`  Tier 3 (Irreversible):       ${report.summary.tier3}`);

    if (report.violations.length > 0) {
      console.log('\n=== VIOLATIONS ===\n');

      const errorViolations = report.violations.filter(v => v.severity === 'error');
      const warningViolations = report.violations.filter(v => v.severity === 'warning');

      if (errorViolations.length > 0) {
        console.log('Errors (Governance Violations):');
        errorViolations.forEach(v => {
          console.log(`  [${v.tier?.toUpperCase() || 'UNKNOWN'}] ${v.filePath}`);
          console.log(`    → ${v.violation}`);
        });
      }

      if (warningViolations.length > 0) {
        console.log('\nWarnings:');
        warningViolations.forEach(v => {
          console.log(`  [${v.tier?.toUpperCase() || 'UNKNOWN'}] ${v.filePath}`);
          console.log(`    → ${v.violation}`);
        });
      }
    }

    console.log('\n=== Enforcement Complete ===\n');

    if (report.failedFiles > 0) {
      console.log('Governance check FAILED.');
      console.log('Fix violations before proceeding.\n');
    } else {
      console.log('Governance check PASSED.\n');
    }
  }
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
  const enforcer = new TierEnforcer();

  if (args.length === 0) {
    console.log('No files specified, scanning src directory...\n');
    const files = getAllTypeScriptFiles('src');
    enforcer.enforce(files);
  } else {
    enforcer.enforce(args);
  }
}

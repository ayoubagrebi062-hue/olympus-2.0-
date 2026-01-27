/**
 * OLYMPUS 2.0 - Quality Gate Orchestrator
 *
 * Orchestrates all quality gates and produces unified reports.
 */

import {
  QualityGate,
  GateType,
  GateResult,
  GateStatus,
  GateConfig,
  QualityConfig,
  QualityReport,
  QualitySummary,
  GateIssue,
  FileToCheck,
  DEFAULT_QUALITY_CONFIG,
} from './types';

import { typeScriptValidator, eslintValidator } from './code-validator';
import { securityScanner } from './security-scanner';
import { linkValidator } from './link-validator';
import { buildVerifier } from './build-verifier';

// ============================================
// GATE REGISTRY
// ============================================

const GATE_REGISTRY: Map<GateType, QualityGate> = new Map<GateType, QualityGate>([
  ['typescript', typeScriptValidator],
  ['eslint', eslintValidator],
  ['security', securityScanner],
  ['links', linkValidator], // NEW: Catches 404s, empty charts, spacing issues
  ['build', buildVerifier],
]);

// ============================================
// ORCHESTRATOR
// ============================================

export class QualityOrchestrator {
  private config: QualityConfig;
  private gates: Map<GateType, QualityGate>;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
    this.gates = new Map(GATE_REGISTRY);
  }

  /**
   * Register a custom gate
   */
  registerGate(gate: QualityGate): void {
    this.gates.set(gate.type, gate);
  }

  /**
   * Run all enabled quality gates
   */
  async runAllGates(
    buildId: string,
    projectId: string,
    files: FileToCheck[]
  ): Promise<QualityReport> {
    const startTime = Date.now();
    const results: GateResult[] = [];

    console.log(`[QualityOrchestrator] Running quality gates for build ${buildId}`);
    console.log(`[QualityOrchestrator] Files to check: ${files.length}`);

    // Run each enabled gate
    for (const [type, gate] of this.gates) {
      const gateConfig = this.config.gates[type];

      if (!gateConfig?.enabled) {
        console.log(`[QualityOrchestrator] Skipping disabled gate: ${type}`);
        results.push({
          gate: type,
          status: 'skipped',
          passed: true,
          issues: [],
          duration: 0,
          timestamp: new Date(),
        });
        continue;
      }

      console.log(`[QualityOrchestrator] Running gate: ${type}`);

      try {
        const result = await this.runGateWithTimeout(gate, files, gateConfig);
        results.push(result);

        console.log(`[QualityOrchestrator] ${type}: ${result.passed ? '✅ PASSED' : '❌ FAILED'} (${result.issues.length} issues)`);
      } catch (error) {
        console.error(`[QualityOrchestrator] Gate ${type} failed with error:`, error);
        results.push({
          gate: type,
          status: 'failed',
          passed: false,
          issues: [{
            severity: 'error',
            message: `Gate execution failed: ${(error as Error).message}`,
          }],
          duration: 0,
          timestamp: new Date(),
        });
      }
    }

    // Calculate overall status
    const summary = this.calculateSummary(results);
    const overallScore = this.calculateScore(results);
    let overallStatus = this.determineOverallStatus(results, overallScore);

    // FIX 3: Check quality threshold and stopOnFailure
    const belowThreshold = overallScore < this.config.minScore;
    if (belowThreshold && this.config.stopOnFailure) {
      console.log(`[QualityOrchestrator] QUALITY THRESHOLD FAILED: score ${overallScore} < minScore ${this.config.minScore}`);
      overallStatus = 'failed';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    // FIX 3: Add threshold warning to recommendations if below threshold
    if (belowThreshold) {
      recommendations.unshift(
        `⚠️ Quality score (${overallScore}) is below minimum threshold (${this.config.minScore}). ${this.config.stopOnFailure ? 'Build stopped.' : 'Consider enabling stopOnFailure to enforce quality.'}`
      );
    }

    const report: QualityReport = {
      buildId,
      projectId,
      timestamp: new Date(),
      overallStatus,
      overallScore,
      gates: results,
      summary,
      recommendations,
    };

    console.log(`[QualityOrchestrator] Quality check complete: ${overallStatus} (score: ${overallScore}, threshold: ${this.config.minScore}, stopOnFailure: ${this.config.stopOnFailure})`);

    return report;
  }

  /**
   * Run a single gate with timeout
   */
  private async runGateWithTimeout(
    gate: QualityGate,
    files: FileToCheck[],
    config: GateConfig
  ): Promise<GateResult> {
    const timeout = config.timeout || 60000;

    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        resolve({
          gate: gate.type,
          status: 'failed',
          passed: false,
          issues: [{
            severity: 'error',
            message: `Gate timed out after ${timeout}ms`,
          }],
          duration: timeout,
          timestamp: new Date(),
        });
      }, timeout);

      try {
        const result = await gate.check(files, config);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: GateResult[]): QualitySummary {
    const allIssues = results.flatMap(r => r.issues);

    return {
      totalGates: results.length,
      passedGates: results.filter(r => r.passed).length,
      failedGates: results.filter(r => !r.passed && r.status !== 'skipped').length,
      skippedGates: results.filter(r => r.status === 'skipped').length,
      totalErrors: allIssues.filter(i => i.severity === 'error').length,
      totalWarnings: allIssues.filter(i => i.severity === 'warning').length,
      criticalIssues: allIssues.filter(i => i.severity === 'error'),
    };
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private calculateScore(results: GateResult[]): number {
    const activeGates = results.filter(r => r.status !== 'skipped');

    if (activeGates.length === 0) return 100;

    let totalScore = 0;
    let totalWeight = 0;

    for (const result of activeGates) {
      const gateConfig = this.config.gates[result.gate];
      const weight = gateConfig?.required ? 2 : 1;
      totalWeight += weight;

      // Calculate gate score
      let gateScore = 100;

      if (!result.passed) {
        gateScore = 0;
      } else {
        // Reduce score based on issues
        const errorPenalty = (result.metrics?.errorCount || 0) * 10;
        const warningPenalty = (result.metrics?.warningCount || 0) * 2;
        gateScore = Math.max(0, 100 - errorPenalty - warningPenalty);
      }

      totalScore += gateScore * weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(results: GateResult[], score: number): GateStatus {
    // Check required gates
    for (const result of results) {
      const gateConfig = this.config.gates[result.gate];
      if (gateConfig?.required && !result.passed) {
        return 'failed';
      }
    }

    // Check minimum score
    if (score < this.config.minScore) {
      return 'failed';
    }

    // Check for any failures
    const hasFailures = results.some(r => !r.passed && r.status !== 'skipped');
    if (hasFailures && this.config.failOnWarnings) {
      return 'failed';
    }

    return 'passed';
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: GateResult[]): string[] {
    const recommendations: string[] = [];
    const allIssues = results.flatMap(r => r.issues);

    // Group issues by type
    const issuesByRule = new Map<string, number>();
    for (const issue of allIssues) {
      const rule = issue.rule || 'unknown';
      issuesByRule.set(rule, (issuesByRule.get(rule) || 0) + 1);
    }

    // Generate recommendations for common issues
    if (issuesByRule.has('no-console')) {
      recommendations.push('Remove console.log statements or use a proper logging library');
    }

    if (issuesByRule.has('any')) {
      recommendations.push('Replace any types with proper TypeScript types for better type safety');
    }

    if (issuesByRule.has('input-validation')) {
      recommendations.push('Add input validation using Zod, Yup, or similar libraries');
    }

    if (issuesByRule.has('error-handling')) {
      recommendations.push('Add try-catch blocks to API routes for proper error handling');
    }

    if (allIssues.some(i => i.rule?.includes('security'))) {
      recommendations.push('Review and fix security issues before deployment');
    }

    // Link validation recommendations
    if (issuesByRule.has('placeholder-href') || issuesByRule.has('empty-href')) {
      recommendations.push('Replace all href="#" and href="" with actual route destinations');
    }

    if (issuesByRule.has('missing-page')) {
      recommendations.push('Create missing page files for all linked routes, or update links to existing pages');
    }

    if (issuesByRule.has('empty-data-array') || issuesByRule.has('empty-datasets')) {
      recommendations.push('Add sample/mock data for charts and tables - never render empty arrays');
    }

    if (issuesByRule.has('adjacent-buttons-no-gap')) {
      recommendations.push('Wrap adjacent buttons in flex container with gap-2 or gap-3 for proper spacing');
    }

    // Add general recommendations based on score
    const totalErrors = allIssues.filter(i => i.severity === 'error').length;
    const totalWarnings = allIssues.filter(i => i.severity === 'warning').length;

    if (totalErrors > 10) {
      recommendations.push('Focus on fixing critical errors before addressing warnings');
    }

    if (totalWarnings > 20) {
      recommendations.push('Consider configuring ESLint to auto-fix common issues');
    }

    return recommendations;
  }

  /**
   * Get a formatted report string
   */
  formatReport(report: QualityReport): string {
    const lines: string[] = [
      '╔══════════════════════════════════════════════════════════╗',
      '║              OLYMPUS QUALITY REPORT                       ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║ Build: ${report.buildId.substring(0, 40).padEnd(44)} ║`,
      `║ Score: ${String(report.overallScore).padEnd(3)}/100  Status: ${report.overallStatus.toUpperCase().padEnd(10)}     ║`,
      '╠══════════════════════════════════════════════════════════╣',
    ];

    // Gate results
    for (const gate of report.gates) {
      const icon = gate.passed ? '✅' : gate.status === 'skipped' ? '⏭️' : '❌';
      const issues = gate.issues.length > 0 ? `(${gate.issues.length} issues)` : '';
      lines.push(`║ ${icon} ${gate.gate.padEnd(15)} ${gate.status.padEnd(10)} ${issues.padEnd(16)} ║`);
    }

    lines.push('╠══════════════════════════════════════════════════════════╣');

    // Summary
    lines.push(`║ Errors: ${String(report.summary.totalErrors).padEnd(5)} Warnings: ${String(report.summary.totalWarnings).padEnd(20)} ║`);

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('╠══════════════════════════════════════════════════════════╣');
      lines.push('║ Recommendations:                                          ║');
      for (const rec of report.recommendations.slice(0, 3)) {
        const truncated = rec.substring(0, 50);
        lines.push(`║ • ${truncated.padEnd(53)} ║`);
      }
    }

    lines.push('╚══════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

// ============================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================

let orchestratorInstance: QualityOrchestrator | null = null;

export function getQualityOrchestrator(config?: Partial<QualityConfig>): QualityOrchestrator {
  if (!orchestratorInstance || config) {
    orchestratorInstance = new QualityOrchestrator(config);
  }
  return orchestratorInstance;
}

/**
 * Quick quality check
 */
export async function checkQuality(
  buildId: string,
  projectId: string,
  files: FileToCheck[]
): Promise<QualityReport> {
  return await getQualityOrchestrator().runAllGates(buildId, projectId, files);
}

/**
 * Check a single file
 */
export async function checkFile(
  file: FileToCheck
): Promise<GateIssue[]> {
  const orchestrator = getQualityOrchestrator();
  const report = await orchestrator.runAllGates('single-file', 'single-file', [file]);
  return report.gates.flatMap(g => g.issues);
}

export default {
  QualityOrchestrator,
  getQualityOrchestrator,
  checkQuality,
  checkFile,
};

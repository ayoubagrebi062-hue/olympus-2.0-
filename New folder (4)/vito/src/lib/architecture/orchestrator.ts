/**
 * OLYMPUS 2.1 - Architecture Orchestrator
 * 
 * Coordinates all architecture validation gates:
 * - Schema Gate (DATUM output validation)
 * - API Gate (NEXUS output validation)
 * - Security Gate (SENTINEL compliance)
 * 
 * Philosophy: "One blessed stack. No exceptions."
 */

import { schemaValidationGate, schemaGate } from './gates/schema-gate';
import { apiValidationGate, apiGate } from './gates/api-gate';
import { securityValidationGate, securityGate } from './gates/security-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FileToCheck {
  path: string;
  content: string;
}

export interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats?: Record<string, number | boolean>;
}

export interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

export interface GateDefinition {
  name: string;
  description: string;
  type: string;
  check: (files: FileToCheck[] | string) => Promise<GateResult>;
}

export interface ArchOrchestratorResult {
  passed: boolean;
  overallScore: number;
  duration: number;
  gates: {
    [key: string]: {
      name: string;
      passed: boolean;
      score: number;
      issueCount: number;
      errorCount: number;
      warningCount: number;
    };
  };
  issues: GateIssue[];
  summary: {
    filesChecked: number;
    totalErrors: number;
    totalWarnings: number;
    criticalSecurityIssues: number;
  };
}

export interface ArchOrchestratorOptions {
  skipSchema?: boolean;
  skipApi?: boolean;
  skipSecurity?: boolean;
  verbose?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ArchitectureOrchestrator {
  /**
   * Validate architecture compliance
   */
  async validate(
    files: FileToCheck[],
    prismaSchema?: string,
    options: ArchOrchestratorOptions = {}
  ): Promise<ArchOrchestratorResult> {
    const startTime = Date.now();

    const result: ArchOrchestratorResult = {
      passed: true,
      overallScore: 100,
      duration: 0,
      gates: {},
      issues: [],
      summary: {
        filesChecked: files.length,
        totalErrors: 0,
        totalWarnings: 0,
        criticalSecurityIssues: 0,
      },
    };

    // Run Schema Gate (if schema provided)
    if (prismaSchema && !options.skipSchema) {
      if (options.verbose) console.log('Running Schema Gate...');
      
      const schemaResult = await schemaGate(prismaSchema);
      const errors = schemaResult.issues.filter(i => i.severity === 'error').length;
      const warnings = schemaResult.issues.filter(i => i.severity === 'warning').length;

      result.gates['schema'] = {
        name: schemaValidationGate.name,
        passed: schemaResult.passed,
        score: schemaResult.score,
        issueCount: schemaResult.issues.length,
        errorCount: errors,
        warningCount: warnings,
      };

      result.issues.push(...schemaResult.issues);
      result.summary.totalErrors += errors;
      result.summary.totalWarnings += warnings;

      if (!schemaResult.passed) result.passed = false;
    }

    // Run API Gate
    if (!options.skipApi) {
      if (options.verbose) console.log('Running API Gate...');
      
      const apiResult = await apiGate(files);
      const errors = apiResult.issues.filter(i => i.severity === 'error').length;
      const warnings = apiResult.issues.filter(i => i.severity === 'warning').length;

      result.gates['api'] = {
        name: apiValidationGate.name,
        passed: apiResult.passed,
        score: apiResult.score,
        issueCount: apiResult.issues.length,
        errorCount: errors,
        warningCount: warnings,
      };

      result.issues.push(...apiResult.issues);
      result.summary.totalErrors += errors;
      result.summary.totalWarnings += warnings;

      if (!apiResult.passed) result.passed = false;
    }

    // Run Security Gate
    if (!options.skipSecurity) {
      if (options.verbose) console.log('Running Security Gate...');
      
      const securityResult = await securityGate(files);
      const errors = securityResult.issues.filter(i => i.severity === 'error').length;
      const warnings = securityResult.issues.filter(i => i.severity === 'warning').length;

      result.gates['security'] = {
        name: securityValidationGate.name,
        passed: securityResult.passed,
        score: securityResult.score,
        issueCount: securityResult.issues.length,
        errorCount: errors,
        warningCount: warnings,
      };

      result.issues.push(...securityResult.issues);
      result.summary.totalErrors += errors;
      result.summary.totalWarnings += warnings;
      result.summary.criticalSecurityIssues = errors;

      if (!securityResult.passed) result.passed = false;
    }

    // Calculate overall score
    const gateScores = Object.values(result.gates).map(g => g.score);
    result.overallScore = gateScores.length > 0
      ? Math.round(gateScores.reduce((a, b) => a + b, 0) / gateScores.length)
      : 100;

    result.duration = Date.now() - startTime;

    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick validation with default settings
 */
export async function validateArchitecture(
  files: FileToCheck[],
  prismaSchema?: string
): Promise<ArchOrchestratorResult> {
  const orchestrator = new ArchitectureOrchestrator();
  return orchestrator.validate(files, prismaSchema);
}

/**
 * Format result for CLI output
 */
export function formatArchResultForCLI(result: ArchOrchestratorResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╭─────────────────────────────────────────────────────────────╮');
  lines.push('│ 🏗️  OLYMPUS 2.1 ARCHITECTURE VALIDATION                     │');
  lines.push('╰─────────────────────────────────────────────────────────────╯');
  lines.push('');

  // Gate results
  for (const [key, gate] of Object.entries(result.gates)) {
    const icon = gate.passed ? '✓' : '✗';
    const status = gate.passed ? 'PASSED' : 'FAILED';
    const scoreBar = '█'.repeat(Math.round(gate.score / 10)) + '░'.repeat(10 - Math.round(gate.score / 10));

    lines.push(`  ${icon} ${gate.name.padEnd(20)} ${status.padEnd(8)} [${scoreBar}] ${gate.score}%`);

    if (gate.errorCount > 0 || gate.warningCount > 0) {
      lines.push(`    └── ${gate.errorCount} errors, ${gate.warningCount} warnings`);
    }
  }

  lines.push('');
  lines.push('─────────────────────────────────────────────────────────────');

  // Summary
  const overallIcon = result.passed ? '✓' : '✗';
  const overallStatus = result.passed ? 'PASSED' : 'FAILED';

  lines.push(`  ${overallIcon} Overall: ${overallStatus} (Score: ${result.overallScore}%)`);
  lines.push(`    Duration: ${result.duration}ms`);
  lines.push(`    Files: ${result.summary.filesChecked}`);
  lines.push(`    Errors: ${result.summary.totalErrors}`);
  lines.push(`    Warnings: ${result.summary.totalWarnings}`);

  if (result.summary.criticalSecurityIssues > 0) {
    lines.push(`    🔴 CRITICAL SECURITY: ${result.summary.criticalSecurityIssues} issues`);
  }

  lines.push('');

  // Top issues
  if (result.issues.length > 0) {
    lines.push('─────────────────────────────────────────────────────────────');
    lines.push('  Issues:');
    lines.push('');

    const topIssues = result.issues
      .sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1))
      .slice(0, 10);

    for (const issue of topIssues) {
      const icon = issue.severity === 'error' ? '✗' : '⚠';
      const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';

      lines.push(`  ${icon} [${issue.rule}] ${issue.message}`);
      if (location) {
        lines.push(`    └── ${location}`);
      }
    }

    if (result.issues.length > 10) {
      lines.push(`  ... and ${result.issues.length - 10} more issues`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  schemaValidationGate,
  schemaGate,
  apiValidationGate,
  apiGate,
  securityValidationGate,
  securityGate,
};

export default ArchitectureOrchestrator;

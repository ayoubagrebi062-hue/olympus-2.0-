/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Security Orchestrator - Unified security scanning
 * 
 * Combines all security scanners into a single entry point.
 */

import { validatePrompt, type PromptValidationResult } from './prompt-injection';
import { costGuardianCheck, type CostGuardianCheckInput, type CostGuardianResult } from './cost-guardian';
import { scanForSecrets, type SecretScanResult } from './secret-scanner';
import { scanForMalware, type MalwareScanResult } from './malware-scanner';
import { scanPackageJson, type DependencyScanResult } from './dependency-scanner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecurityScanInput {
  userPrompt?: string;
  generatedCode?: string;
  packageJson?: string;
  costCheck?: CostGuardianCheckInput;
}

export interface SecurityScanResult {
  passed: boolean;
  score: number; // 0-100
  results: {
    promptInjection?: PromptValidationResult;
    costGuardian?: CostGuardianResult;
    secrets?: SecretScanResult;
    malware?: MalwareScanResult;
    dependencies?: DependencyScanResult;
  };
  summary: {
    blocked: boolean;
    blockReason?: string;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    warnings: string[];
  };
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SecurityOrchestrator {
  private strictMode: boolean;

  constructor(options: { strictMode?: boolean } = {}) {
    this.strictMode = options.strictMode ?? false;
  }

  async scan(input: SecurityScanInput): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const results: SecurityScanResult['results'] = {};
    const warnings: string[] = [];
    let blocked = false;
    let blockReason: string | undefined;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    // 1. Prompt Injection Check
    if (input.userPrompt) {
      const promptResult = validatePrompt(input.userPrompt);
      results.promptInjection = promptResult;

      if (promptResult.blocked) {
        blocked = true;
        blockReason = 'Prompt injection detected';
        criticalIssues++;
      }
      warnings.push(...promptResult.warnings);
    }

    // 2. Cost Guardian Check
    if (input.costCheck) {
      const costResult = costGuardianCheck(input.costCheck);
      results.costGuardian = costResult;

      if (!costResult.allowed) {
        blocked = true;
        blockReason = blockReason || `Cost limit exceeded: ${costResult.blockedBy}`;
        highIssues++;
      }
      warnings.push(...costResult.warnings);
    }

    // 3. Secret Scanner
    if (input.generatedCode) {
      const secretResult = scanForSecrets(input.generatedCode);
      results.secrets = secretResult;

      if (secretResult.criticalCount > 0) {
        blocked = true;
        blockReason = blockReason || 'Secrets detected in generated code';
      }
      criticalIssues += secretResult.criticalCount;
      highIssues += secretResult.highCount;
      mediumIssues += secretResult.mediumCount;
    }

    // 4. Malware Scanner
    if (input.generatedCode) {
      const malwareResult = scanForMalware(input.generatedCode);
      results.malware = malwareResult;

      if (malwareResult.criticalCount > 0) {
        blocked = true;
        blockReason = blockReason || 'Malware patterns detected';
      }
      criticalIssues += malwareResult.criticalCount;
      highIssues += malwareResult.highCount;
      mediumIssues += malwareResult.mediumCount;
    }

    // 5. Dependency Scanner
    if (input.packageJson) {
      const depResult = scanPackageJson(input.packageJson, this.strictMode);
      results.dependencies = depResult;

      if (!depResult.safe) {
        if (depResult.criticalCount > 0) {
          blocked = true;
          blockReason = blockReason || 'Blocked dependencies detected';
        }
      }
      criticalIssues += depResult.criticalCount;
      highIssues += depResult.highCount;
      mediumIssues += depResult.mediumCount;
      lowIssues += depResult.lowCount;
    }

    // Calculate score (100 = perfect, 0 = completely blocked)
    const totalIssues = criticalIssues * 4 + highIssues * 2 + mediumIssues + lowIssues * 0.5;
    const score = Math.max(0, Math.round(100 - totalIssues * 5));

    return {
      passed: !blocked,
      score,
      results,
      summary: {
        blocked,
        blockReason,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
        warnings,
      },
      duration: Date.now() - startTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const defaultOrchestrator = new SecurityOrchestrator();

export function securityScan(input: SecurityScanInput): Promise<SecurityScanResult> {
  return defaultOrchestrator.scan(input);
}

export function quickSecurityCheck(code: string): Promise<SecurityScanResult> {
  return defaultOrchestrator.scan({ generatedCode: code });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD OUTPUT SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export interface BuildArtifact {
  path: string;
  content: string;
  type?: string;
}

export interface BuildSecurityScanInput {
  buildId: string;
  artifacts: BuildArtifact[];
  packageJson?: string;
}

export interface BuildSecurityScanResult extends SecurityScanResult {
  buildId: string;
  scannedFiles: number;
  issuesByFile: Record<string, { secrets: number; malware: number }>;
}

/**
 * Scan all build artifacts for security issues
 * Call this before finalizing a build
 */
export async function scanBuildOutput(input: BuildSecurityScanInput): Promise<BuildSecurityScanResult> {
  const startTime = Date.now();
  const issuesByFile: Record<string, { secrets: number; malware: number }> = {};
  let totalCritical = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let blocked = false;
  let blockReason: string | undefined;
  const warnings: string[] = [];

  // Scan each code artifact
  for (const artifact of input.artifacts) {
    // Only scan code files
    if (!artifact.path.match(/\.(js|jsx|ts|tsx|mjs|cjs|json)$/)) {
      continue;
    }

    const secretResult = scanForSecrets(artifact.content);
    const malwareResult = scanForMalware(artifact.content);

    issuesByFile[artifact.path] = {
      secrets: secretResult.matches.length,
      malware: malwareResult.matches.length,
    };

    // Aggregate counts
    totalCritical += secretResult.criticalCount + malwareResult.criticalCount;
    totalHigh += secretResult.highCount + malwareResult.highCount;
    totalMedium += secretResult.mediumCount + malwareResult.mediumCount;

    // Check for blockers
    if (secretResult.criticalCount > 0) {
      blocked = true;
      blockReason = blockReason || `Secrets detected in ${artifact.path}`;
    }
    if (malwareResult.criticalCount > 0) {
      blocked = true;
      blockReason = blockReason || `Malware pattern detected in ${artifact.path}`;
    }
  }

  // Scan package.json if provided
  let depResult: DependencyScanResult | undefined;
  if (input.packageJson) {
    depResult = scanPackageJson(input.packageJson, true);
    totalCritical += depResult.criticalCount;
    totalHigh += depResult.highCount;
    totalMedium += depResult.mediumCount;
    totalLow += depResult.lowCount;

    if (depResult.criticalCount > 0) {
      blocked = true;
      blockReason = blockReason || 'Blocked dependencies detected in package.json';
    }
  }

  const totalIssues = totalCritical * 4 + totalHigh * 2 + totalMedium + totalLow * 0.5;
  const score = Math.max(0, Math.round(100 - totalIssues * 5));

  console.log(`[Security] Build ${input.buildId} scan complete:`, {
    files: Object.keys(issuesByFile).length,
    critical: totalCritical,
    high: totalHigh,
    medium: totalMedium,
    low: totalLow,
    passed: !blocked,
    score,
  });

  return {
    buildId: input.buildId,
    passed: !blocked,
    score,
    scannedFiles: Object.keys(issuesByFile).length,
    issuesByFile,
    results: {
      dependencies: depResult,
    },
    summary: {
      blocked,
      blockReason,
      criticalIssues: totalCritical,
      highIssues: totalHigh,
      mediumIssues: totalMedium,
      lowIssues: totalLow,
      warnings,
    },
    duration: Date.now() - startTime,
  };
}

/**
 * Quick pre-flight check for a single file
 */
export function scanFile(path: string, content: string): {
  safe: boolean;
  issues: Array<{ type: string; severity: string; message: string; line?: number }>;
} {
  const issues: Array<{ type: string; severity: string; message: string; line?: number }> = [];

  // Secret scan
  const secretResult = scanForSecrets(content);
  for (const match of secretResult.matches) {
    issues.push({
      type: 'secret',
      severity: match.severity,
      message: `${match.pattern}: ${match.description}`,
      line: match.line,
    });
  }

  // Malware scan
  const malwareResult = scanForMalware(content);
  for (const match of malwareResult.matches) {
    issues.push({
      type: 'malware',
      severity: match.severity,
      message: `${match.pattern} (${match.category})`,
      line: match.line,
    });
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  return {
    safe: !hasCritical,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

export function formatSecurityResultForCLI(result: SecurityScanResult): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(result.passed ? '✅ SECURITY SCAN PASSED' : '❌ SECURITY SCAN FAILED');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`Score: ${result.score}/100`);
  lines.push(`Duration: ${result.duration}ms`);
  lines.push('');
  
  if (result.summary.blocked) {
    lines.push(`🚫 BLOCKED: ${result.summary.blockReason}`);
    lines.push('');
  }
  
  lines.push('Issues:');
  lines.push(`  Critical: ${result.summary.criticalIssues}`);
  lines.push(`  High: ${result.summary.highIssues}`);
  lines.push(`  Medium: ${result.summary.mediumIssues}`);
  lines.push(`  Low: ${result.summary.lowIssues}`);
  
  if (result.summary.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    result.summary.warnings.forEach(w => lines.push(`  ⚠️  ${w}`));
  }
  
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

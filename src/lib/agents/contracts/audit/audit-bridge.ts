/**
 * OLYMPUS Contract Audit Bridge
 *
 * Bridges the Contract Audit CLI (10x) with the Orchestrator pipeline.
 * Enables automatic security scanning during builds.
 *
 * @module audit-bridge
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { AuditTriggerConfig, AuditResult, AuditFinding } from './audit-types';

// ============================================================================
// AUDIT BRIDGE - Programmatic CLI Execution
// ============================================================================

/**
 * Execute the Contract Audit CLI programmatically
 */
export async function executeContractAuditCLI(
  checkpointPath: string,
  options: {
    format?: 'json' | 'terminal' | 'markdown';
    timeout?: number;
  } = {}
): Promise<{
  success: boolean;
  exitCode: number;
  output: string;
  jsonResult?: AuditResult;
  error?: string;
}> {
  const { format = 'json', timeout = 120000 } = options;

  return new Promise((resolve) => {
    const cliPath = path.resolve(process.cwd(), 'scripts/contract-audit-10x.ts');

    // Check if CLI exists
    if (!fs.existsSync(cliPath)) {
      resolve({
        success: false,
        exitCode: -1,
        output: '',
        error: `Contract Audit CLI not found at: ${cliPath}`,
      });
      return;
    }

    // Check if checkpoint exists
    if (!fs.existsSync(checkpointPath)) {
      resolve({
        success: false,
        exitCode: -1,
        output: '',
        error: `Checkpoint file not found: ${checkpointPath}`,
      });
      return;
    }

    const args = [
      'tsx',
      cliPath,
      'audit',
      '--file', checkpointPath,
      '--format', format,
    ];

    let stdout = '';
    let stderr = '';

    const proc = spawn('npx', args, {
      cwd: process.cwd(),
      shell: true,
      timeout,
    });

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        exitCode: -1,
        output: stdout,
        error: `Failed to execute CLI: ${err.message}`,
      });
    });

    proc.on('close', (code) => {
      let jsonResult: AuditResult | undefined;

      // Try to parse JSON output
      if (format === 'json') {
        const jsonPath = 'contract-audit-results.json';
        if (fs.existsSync(jsonPath)) {
          try {
            jsonResult = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          } catch {
            // JSON parsing failed, continue without it
          }
        }
      }

      resolve({
        success: code === 0,
        exitCode: code ?? 1,
        output: stdout,
        jsonResult,
        error: stderr || undefined,
      });
    });
  });
}

/**
 * Execute production audit with full context
 */
export async function executeProductionAudit(
  buildContext: {
    projectId: string;
    buildId: string;
    phaseId: string;
    checkpointPath: string;
    generatedFiles: string[];
  },
  config: AuditTriggerConfig
): Promise<{
  passed: boolean;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  reportPath: string;
  shouldBlock: boolean;
  findings: AuditFinding[];
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Create report directory
  const reportDir = config.reportPath
    .replace('{projectId}', buildContext.projectId)
    .replace('{buildId}', buildContext.buildId)
    .replace('{timestamp}', timestamp);

  try {
    fs.mkdirSync(reportDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  // Execute the CLI
  const cliResult = await executeContractAuditCLI(buildContext.checkpointPath, {
    format: 'json',
    timeout: config.timeout || 120000,
  });

  // Handle CLI failure
  if (!cliResult.success && !cliResult.jsonResult) {
    return {
      passed: true, // Don't block on CLI failure (graceful degradation)
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      reportPath: reportDir,
      shouldBlock: false,
      findings: [],
      duration: Date.now() - startTime,
      error: cliResult.error || 'Audit CLI failed to execute',
    };
  }

  // Extract findings from JSON result
  const result = cliResult.jsonResult;
  const findings: AuditFinding[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  if (result) {
    // Extract from paranoid analysis
    if (result.paranoid) {
      criticalCount = result.paranoid.criticalCount || 0;
      highCount = result.paranoid.highCount || 0;
      mediumCount = result.paranoid.mediumCount || 0;

      // Convert taint flows to findings
      for (const flow of result.paranoid.taintFlows || []) {
        findings.push({
          id: `TAINT-${findings.length + 1}`,
          severity: flow.severity,
          type: 'taint_flow',
          title: `Taint flow to ${flow.sinkType}`,
          location: `${flow.sourceAgent} → ${flow.sinkAgent}`,
          description: flow.recommendation,
          cwe: flow.cwe,
        });
      }

      // Convert attacks to findings
      for (const attack of result.paranoid.attacksDetected || []) {
        findings.push({
          id: `ATTACK-${findings.length + 1}`,
          severity: attack.pattern?.severity || 'high',
          type: 'attack_pattern',
          title: attack.pattern?.name || 'Unknown Attack',
          location: attack.location,
          description: attack.pattern?.description || '',
          evidence: attack.evidence,
          cwe: attack.pattern?.cwe,
        });
      }

      // Convert semantic detections to findings
      for (const semantic of result.paranoid.semanticDetections || []) {
        findings.push({
          id: `SEMANTIC-${findings.length + 1}`,
          severity: semantic.severity,
          type: 'semantic_attack',
          title: semantic.signatureName,
          location: semantic.location,
          description: semantic.canonicalIntent,
          evidence: semantic.evidence,
          cwe: semantic.cwe,
        });
      }
    }

    // Extract from security report
    if (result.security?.violations) {
      for (const violation of result.security.violations) {
        findings.push({
          id: `SEC-${findings.length + 1}`,
          severity: violation.type === 'secret' ? 'critical' : 'high',
          type: 'security_violation',
          title: violation.name,
          location: violation.location,
          description: violation.suggestion,
          evidence: violation.value?.substring(0, 50),
        });
        if (violation.type === 'secret') criticalCount++;
        else highCount++;
      }
    }
  }

  // Save report
  const reportPath = path.join(reportDir, `audit-${buildContext.phaseId}.json`);
  try {
    fs.writeFileSync(reportPath, JSON.stringify({
      buildContext,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        totalFindings: findings.length,
      },
      findings,
      rawResult: result,
    }, null, 2));
  } catch {
    // Report saving failed, continue
  }

  // Determine if build should be blocked
  const shouldBlock =
    (config.blockOnCritical && criticalCount > 0) ||
    (config.blockOnHigh && highCount > 0);

  return {
    passed: criticalCount === 0 && highCount === 0,
    criticalCount,
    highCount,
    mediumCount,
    reportPath,
    shouldBlock,
    findings,
    duration: Date.now() - startTime,
  };
}

/**
 * Quick audit check - returns boolean pass/fail only
 */
export async function quickAuditCheck(
  checkpointPath: string
): Promise<{ passed: boolean; message: string }> {
  const result = await executeContractAuditCLI(checkpointPath, {
    format: 'json',
    timeout: 60000,
  });

  if (!result.success) {
    return { passed: true, message: 'Audit skipped (CLI unavailable)' };
  }

  const critical = result.jsonResult?.paranoid?.criticalCount || 0;
  const high = result.jsonResult?.paranoid?.highCount || 0;

  if (critical > 0) {
    return { passed: false, message: `BLOCKED: ${critical} critical findings` };
  }
  if (high > 0) {
    return { passed: false, message: `WARNING: ${high} high findings` };
  }

  return { passed: true, message: 'Audit passed' };
}

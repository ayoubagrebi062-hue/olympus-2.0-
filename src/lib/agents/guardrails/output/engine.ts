/**
 * OLYMPUS 2.0 - Output Guardrail Engine
 *
 * Main engine for validating generated code for security issues,
 * placeholders, and dangerous patterns.
 */

import {
  OutputValidationResult,
  OutputGuardrailConfig,
  OutputIssue,
  DEFAULT_OUTPUT_GUARDRAIL_CONFIG,
  Severity,
} from './types';
import { detectSecrets } from './secret-detector';
import { detectPlaceholders } from './placeholder-detector';
import { detectDangerousPatterns } from './dangerous-pattern-detector';
import { withSpan } from '@/lib/observability/tracing';

/**
 * Output Guardrail Engine
 *
 * Validates generated code for security issues, placeholders, and dangerous patterns.
 */
export class OutputGuardrailEngine {
  private config: OutputGuardrailConfig;

  constructor(config: Partial<OutputGuardrailConfig> = {}) {
    this.config = { ...DEFAULT_OUTPUT_GUARDRAIL_CONFIG, ...config };
  }

  /**
   * Validate code content
   */
  async validate(content: string, filename?: string): Promise<OutputValidationResult> {
    return withSpan('guardrail:output:validate', 'validation', async () => {
      const startTime = Date.now();
      const issues: OutputIssue[] = [];

      // Check if file should be excluded
      if (filename && this.shouldExcludeFile(filename)) {
        return this.createResult([], content, startTime);
      }

      // Run detectors based on config
      if (this.config.checkSecrets) {
        const secretIssues = detectSecrets(content, filename);
        issues.push(...secretIssues);
      }

      if (this.config.checkPlaceholders || this.config.checkIncompleteCode) {
        const placeholderIssues = detectPlaceholders(content, filename);
        issues.push(...placeholderIssues);
      }

      if (this.config.checkDangerousPatterns || this.config.checkDebugCode) {
        const dangerousIssues = detectDangerousPatterns(content, filename);

        // Filter debug code if not checking
        const filteredIssues = this.config.checkDebugCode
          ? dangerousIssues
          : dangerousIssues.filter(i => i.type !== 'debug_code');

        issues.push(...filteredIssues);
      }

      // Apply exclusion patterns
      const filteredIssues = this.applyExclusionPatterns(issues);

      return this.createResult(filteredIssues, content, startTime);
    });
  }

  /**
   * Validate and optionally auto-fix content
   */
  async validateAndFix(
    content: string,
    filename?: string
  ): Promise<{ result: OutputValidationResult; fixedContent: string }> {
    const result = await this.validate(content, filename);

    if (!this.config.autoFixSecrets && !this.config.autoFixDebugCode) {
      return { result, fixedContent: content };
    }

    let fixedContent = content;
    let fixCount = 0;

    // Apply auto-fixes
    for (const issue of result.issues) {
      if (!issue.autoFixable || !issue.fix) continue;

      // Check if we should fix this type
      const shouldFix =
        issue.type.includes('secret') ||
        issue.type.includes('api_key') ||
        issue.type.includes('password')
          ? this.config.autoFixSecrets
          : issue.type === 'debug_code'
            ? this.config.autoFixDebugCode
            : false;

      if (shouldFix) {
        fixedContent = fixedContent.replace(issue.fix.original, issue.fix.replacement);
        fixCount++;
      }
    }

    // Re-validate after fixes
    if (fixCount > 0) {
      const revalidatedResult = await this.validate(fixedContent, filename);
      return { result: revalidatedResult, fixedContent };
    }

    return { result, fixedContent };
  }

  /**
   * Check if validation passes (no blocking issues)
   */
  shouldBlock(result: OutputValidationResult): boolean {
    if (this.config.failOnCritical && result.summary.critical > 0) return true;
    if (this.config.failOnHigh && result.summary.high > 0) return true;
    if (this.config.failOnMedium && result.summary.medium > 0) return true;
    return false;
  }

  /**
   * Format issues for display
   */
  formatIssues(result: OutputValidationResult): string {
    if (result.issues.length === 0) {
      return 'No issues found';
    }

    const lines: string[] = [`Found ${result.summary.total} issue(s):`, ''];

    // Group by severity
    const bySeverity: Record<Severity, OutputIssue[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: [],
    };

    for (const issue of result.issues) {
      bySeverity[issue.severity].push(issue);
    }

    // Format each severity group
    for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as Severity[]) {
      const issues = bySeverity[severity];
      if (issues.length === 0) continue;

      const label = {
        critical: 'CRITICAL',
        high: 'HIGH',
        medium: 'MEDIUM',
        low: 'LOW',
        info: 'INFO',
      }[severity];

      lines.push(`${label} (${issues.length}):`);

      for (const issue of issues) {
        const location = issue.line ? `L${issue.line}` : '';
        const file = issue.file ? `${issue.file}:` : '';
        lines.push(`  - ${file}${location}: ${issue.message}`);
        if (issue.snippet) {
          // Mask any secrets in snippet
          const maskedSnippet = this.maskSnippet(issue.snippet);
          lines.push(`    Code: ${maskedSnippet}`);
        }
        if (issue.suggestion) {
          lines.push(`    Fix: ${issue.suggestion}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get configuration
   */
  getConfig(): OutputGuardrailConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OutputGuardrailConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helpers

  private shouldExcludeFile(filename: string): boolean {
    if (!this.config.excludeFiles) return false;

    for (const pattern of this.config.excludeFiles) {
      // Simple glob matching
      if (pattern.startsWith('*')) {
        const ext = pattern.substring(1);
        if (filename.endsWith(ext)) return true;
      } else if (filename.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  private applyExclusionPatterns(issues: OutputIssue[]): OutputIssue[] {
    if (!this.config.excludePatterns || this.config.excludePatterns.length === 0) {
      return issues;
    }

    return issues.filter(issue => {
      for (const pattern of this.config.excludePatterns!) {
        if (issue.matched.includes(pattern) || issue.snippet?.includes(pattern)) {
          return false;
        }
      }
      return true;
    });
  }

  private createResult(
    issues: OutputIssue[],
    content: string,
    startTime: number
  ): OutputValidationResult {
    const summary = {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length,
      autoFixable: issues.filter(i => i.autoFixable).length,
    };

    return {
      valid: summary.critical === 0 && summary.high === 0,
      issues,
      summary,
      metadata: {
        scannedAt: new Date(),
        scanDurationMs: Date.now() - startTime,
        filesScanned: 1,
        linesScanned: content.split('\n').length,
        patternsChecked: 50, // Approximate
      },
    };
  }

  private maskSnippet(snippet: string): string {
    // Mask common secret patterns
    return snippet
      .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-****')
      .replace(/sk-ant-[a-zA-Z0-9-]{20,}/g, 'sk-ant-****')
      .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA****')
      .replace(/['"][a-zA-Z0-9/+=]{40}['"]/g, '"****"')
      .replace(/password\s*[=:]\s*['"][^'"]+['"]/gi, 'password="****"');
  }
}

// Export singleton
export const outputGuardrail = new OutputGuardrailEngine();

/**
 * OLYMPUS 3.0 - Output Validator
 * ===============================
 * Main validator for AI-generated code output
 */

import { ValidationResult, ValidatorConfig, GeneratedOutput, ValidationIssue } from './types';
import { validateSyntax } from './validators/syntax-validator';
import { validateImports } from './validators/import-validator';
import { validateRelevance } from './validators/relevance-validator';
import { validateSecurity } from './validators/security-validator';
import { validateQuality } from './validators/quality-validator';

const DEFAULT_CONFIG: ValidatorConfig = {
  strictMode: false,
  minQualityScore: 60,
};

export class OutputValidator {
  private config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate all generated output
   */
  async validate(output: GeneratedOutput): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    let totalLines = 0;
    let maxComplexity = 0;

    // Validate each file
    for (const file of output.files) {
      // Syntax validation
      const syntaxIssues = await validateSyntax(file);
      allIssues.push(...syntaxIssues);

      // Import validation
      const importIssues = await validateImports(file);
      allIssues.push(...importIssues);

      // Security validation
      const securityIssues = await validateSecurity(file);
      allIssues.push(...securityIssues);

      // Quality validation
      const { issues: qualityIssues, metrics } = await validateQuality(file);
      allIssues.push(...qualityIssues);

      // Track metrics
      totalLines += file.content.split('\n').length;
      maxComplexity = Math.max(maxComplexity, metrics.complexity);
    }

    // Relevance validation (whole output)
    const { issues: relevanceIssues, score: relevanceScore } = await validateRelevance(output);
    allIssues.push(...relevanceIssues);

    // Calculate overall score
    const score = this.calculateScore(allIssues, relevanceScore);

    // Determine validity
    const hasErrors = allIssues.some(i => i.severity === 'error');
    const valid = !hasErrors && score >= (this.config.minQualityScore || 60);

    return {
      valid,
      score,
      issues: allIssues,
      metadata: {
        linesOfCode: totalLines,
        complexity: maxComplexity,
        fileCount: output.files.length,
        validatedAt: new Date(),
      },
    };
  }

  /**
   * Quick validation (syntax + security only)
   */
  async validateQuick(output: GeneratedOutput): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    let totalLines = 0;

    for (const file of output.files) {
      const syntaxIssues = await validateSyntax(file);
      allIssues.push(...syntaxIssues);

      const securityIssues = await validateSecurity(file);
      allIssues.push(...securityIssues);

      totalLines += file.content.split('\n').length;
    }

    const hasErrors = allIssues.some(i => i.severity === 'error');
    const score = hasErrors ? 0 : 80;

    return {
      valid: !hasErrors,
      score,
      issues: allIssues,
      metadata: {
        linesOfCode: totalLines,
        complexity: 0,
        fileCount: output.files.length,
        validatedAt: new Date(),
      },
    };
  }

  /**
   * Security-only validation
   */
  async validateSecurity(output: GeneratedOutput): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    let totalLines = 0;

    for (const file of output.files) {
      const securityIssues = await validateSecurity(file);
      allIssues.push(...securityIssues);
      totalLines += file.content.split('\n').length;
    }

    const hasErrors = allIssues.some(i => i.severity === 'error');
    const score = hasErrors ? 0 : 100;

    return {
      valid: !hasErrors,
      score,
      issues: allIssues,
      metadata: {
        linesOfCode: totalLines,
        complexity: 0,
        fileCount: output.files.length,
        validatedAt: new Date(),
      },
    };
  }

  /**
   * Calculate overall score based on issues
   */
  private calculateScore(issues: ValidationIssue[], relevanceScore: number): number {
    let score = relevanceScore;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get summary of validation results
   */
  getSummary(result: ValidationResult): string {
    const { valid, score, issues, metadata } = result;

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return `
Validation ${valid ? 'PASSED' : 'FAILED'}
Score: ${score}/100
Files: ${metadata.fileCount}
Lines: ${metadata.linesOfCode}
Complexity: ${metadata.complexity}
Issues: ${errorCount} errors, ${warningCount} warnings, ${infoCount} info
    `.trim();
  }
}

// Export singleton for convenience
export const outputValidator = new OutputValidator();

/**
 * Quick validate helper function
 */
export async function quickValidate(
  files: Array<{ path: string; content: string; language: string }>,
  prompt: string = 'Generated code'
): Promise<ValidationResult> {
  return outputValidator.validateQuick({
    files,
    prompt,
    provider: 'unknown',
    timestamp: new Date(),
  });
}

/**
 * Full validate helper function
 */
export async function fullValidate(
  files: Array<{ path: string; content: string; language: string }>,
  prompt: string
): Promise<ValidationResult> {
  return outputValidator.validate({
    files,
    prompt,
    provider: 'unknown',
    timestamp: new Date(),
  });
}

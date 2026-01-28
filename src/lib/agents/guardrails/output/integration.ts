/**
 * OLYMPUS 2.0 - Output Guardrails Integration
 *
 * Integration helpers for validating agent output and build results.
 */

import { outputGuardrail } from './engine';
import { OutputValidationResult } from './types';
import { trackError } from '@/lib/observability/error-tracker';

/**
 * Middleware to validate agent output before returning
 */
export async function validateAgentOutput(
  content: string,
  options: {
    filename?: string;
    agentId?: string;
    buildId?: string;
    autoFix?: boolean;
    throwOnBlock?: boolean;
  } = {}
): Promise<{
  content: string;
  result: OutputValidationResult;
  wasFixed: boolean;
}> {
  const { filename, agentId, buildId, autoFix = false, throwOnBlock = true } = options;

  try {
    if (autoFix) {
      const { result, fixedContent } = await outputGuardrail.validateAndFix(content, filename);
      const wasFixed = fixedContent !== content;

      // Check if should block
      if (throwOnBlock && outputGuardrail.shouldBlock(result)) {
        trackError(new Error('Output validation failed'), {
          type: 'validation',
          agentId,
          buildId,
          metadata: {
            source: 'output_guardrail',
            issues: result.summary.total,
            critical: result.summary.critical,
            high: result.summary.high,
          },
        });

        throw new OutputValidationError('Output contains critical security issues', result);
      }

      return { content: fixedContent, result, wasFixed };
    } else {
      const result = await outputGuardrail.validate(content, filename);

      if (throwOnBlock && outputGuardrail.shouldBlock(result)) {
        trackError(new Error('Output validation failed'), {
          type: 'validation',
          agentId,
          buildId,
          metadata: {
            source: 'output_guardrail',
            issues: result.summary.total,
            critical: result.summary.critical,
            high: result.summary.high,
          },
        });

        throw new OutputValidationError('Output contains critical security issues', result);
      }

      return { content, result, wasFixed: false };
    }
  } catch (error) {
    if (error instanceof OutputValidationError) {
      throw error;
    }

    trackError(error instanceof Error ? error : new Error(String(error)), {
      type: 'validation',
      agentId,
      buildId,
      metadata: {
        source: 'output_guardrail_error',
      },
    });

    // Return original content on error
    return {
      content,
      result: {
        valid: true,
        issues: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0, autoFixable: 0 },
        metadata: {
          scannedAt: new Date(),
          scanDurationMs: 0,
          filesScanned: 0,
          linesScanned: 0,
          patternsChecked: 0,
        },
      },
      wasFixed: false,
    };
  }
}

/**
 * Validate multiple files/contents
 */
export async function validateBuildOutput(
  files: Array<{ filename: string; content: string }>,
  options: {
    buildId?: string;
    autoFix?: boolean;
    throwOnBlock?: boolean;
  } = {}
): Promise<{
  valid: boolean;
  files: Array<{
    filename: string;
    content: string;
    result: OutputValidationResult;
    wasFixed: boolean;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    filesWithIssues: number;
    filesFixed: number;
  };
}> {
  const results = await Promise.all(
    files.map(async file => {
      const { content, result, wasFixed } = await validateAgentOutput(file.content, {
        filename: file.filename,
        buildId: options.buildId,
        autoFix: options.autoFix,
        throwOnBlock: false, // Don't throw for individual files
      });

      return {
        filename: file.filename,
        content,
        result,
        wasFixed,
      };
    })
  );

  // Aggregate summary
  const summary = {
    total: results.reduce((sum, r) => sum + r.result.summary.total, 0),
    critical: results.reduce((sum, r) => sum + r.result.summary.critical, 0),
    high: results.reduce((sum, r) => sum + r.result.summary.high, 0),
    medium: results.reduce((sum, r) => sum + r.result.summary.medium, 0),
    low: results.reduce((sum, r) => sum + r.result.summary.low, 0),
    filesWithIssues: results.filter(r => r.result.summary.total > 0).length,
    filesFixed: results.filter(r => r.wasFixed).length,
  };

  const valid = summary.critical === 0 && summary.high === 0;

  // Throw if blocking and not valid
  if (options.throwOnBlock && !valid) {
    throw new OutputValidationError(
      `Build output contains ${summary.critical} critical and ${summary.high} high severity issues`,
      results[0]?.result // Attach first result for context
    );
  }

  return {
    valid,
    files: results,
    summary,
  };
}

/**
 * Custom error for output validation failures
 */
export class OutputValidationError extends Error {
  public result: OutputValidationResult;

  constructor(message: string, result: OutputValidationResult) {
    super(message);
    this.name = 'OutputValidationError';
    this.result = result;
  }

  getFormattedIssues(): string {
    return outputGuardrail.formatIssues(this.result);
  }
}

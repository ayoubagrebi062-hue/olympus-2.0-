/**
 * OLYMPUS 2.0 - Output Guardrails Module
 *
 * Validates generated code for security issues, placeholders, and dangerous patterns.
 *
 * Usage:
 * ```typescript
 * import { validateAgentOutput, outputGuardrail } from '@/lib/agents/guardrails/output';
 *
 * // Quick validation
 * const { content, result, wasFixed } = await validateAgentOutput(code, {
 *   autoFix: true,
 *   throwOnBlock: true,
 * });
 *
 * // Direct engine access
 * const result = await outputGuardrail.validate(code);
 * console.log(outputGuardrail.formatIssues(result));
 * ```
 */

// Types
export * from './types';

// Detectors
export { detectSecrets, maskSecret } from './secret-detector';
export { detectPlaceholders } from './placeholder-detector';
export { detectDangerousPatterns } from './dangerous-pattern-detector';

// Engine
export { OutputGuardrailEngine, outputGuardrail } from './engine';

// Integration
export { validateAgentOutput, validateBuildOutput, OutputValidationError } from './integration';

// Safe Regex (PATCH 5)
export {
  safeRegexExec,
  safeRegexMatchAll,
  isRegexSafe,
  createSafeRegex,
  executeRegexSafely,
  RegexTimeoutError,
} from './safe-regex';

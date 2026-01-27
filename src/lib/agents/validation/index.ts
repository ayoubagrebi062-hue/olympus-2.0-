/**
 * OLYMPUS 2.0 - Agent Validation Module
 */

export { validatePrompt, assertValidPrompt } from './prompt-validator';
export type { PromptValidationResult } from './prompt-validator';

export {
  extractRequiredFeatures,
  validateFeatures,
  generateFeatureReport,
  FEATURE_PATTERNS,
} from './feature-validator';
export type { FeatureRequirement, FeatureValidationResult } from './feature-validator';

export { validateHandlers, generateHandlerReport } from './handler-validator';
export type { HandlerAnalysis, HandlerValidationResult } from './handler-validator';

export {
  calculateComplexity,
  inferPageType,
  validateComplexity,
  generateComplexityReport,
  COMPLEXITY_THRESHOLDS,
} from './complexity-validator';
export type {
  ComplexityMetrics,
  ComplexityThreshold,
  ComplexityValidationResult,
} from './complexity-validator';

export {
  validateDesignTokens,
  validatePaletteUsage,
  generateDesignReport,
} from './design-validator';
export type { DesignViolation, DesignTokenUsage, DesignValidationResult } from './design-validator';

// BUILD INTEGRITY VALIDATION (WEAKNESS FIX)
// Validates that generated builds actually work before declaring success
export {
  validateBuildIntegrity,
  quickValidateNextBuild,
  getValidationErrorMessage,
} from './build-integrity-validator';
export type { BuildValidationResult, ValidationConfig } from './build-integrity-validator';

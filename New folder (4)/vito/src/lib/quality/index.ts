/**
 * OLYMPUS 2.0 - Quality Gates Module
 *
 * Unified exports for the quality assurance system.
 * Provides TypeScript validation, ESLint checking, security scanning,
 * and build verification.
 */

// Types
export type {
  GateType,
  GateSeverity,
  GateStatus,
  GateIssue,
  GateResult,
  GateMetrics,
  QualityReport,
  QualitySummary,
  GateConfig,
  QualityConfig,
  QualityGate,
  FileToCheck,
  FixResult,
  SecurityPattern,
  TypeScriptIssue,
} from './types';

export {
  DEFAULT_QUALITY_CONFIG,
  SECURITY_PATTERNS,
  TYPESCRIPT_ISSUE_MAP,
  ESLINT_SEVERITY_MAP,
  CRITICAL_ESLINT_RULES,
} from './types';

// Code Validator
export {
  TypeScriptValidator,
  ESLintValidator,
  typeScriptValidator,
  eslintValidator,
} from './code-validator';

// Security Scanner
export {
  SecurityScanner,
  securityScanner,
} from './security-scanner';

// Link Validator (NEW - catches 404s, empty charts, spacing issues)
export {
  LinkValidator,
  linkValidator,
  validateLinks,
} from './link-validator';

// Build Verifier
export {
  BuildVerifier,
  buildVerifier,
} from './build-verifier';

// Orchestrator
export {
  QualityOrchestrator,
  getQualityOrchestrator,
  checkQuality,
  checkFile,
} from './orchestrator';

// ============================================
// DESIGN QUALITY SYSTEM (OLYMPUS 2.1)
// ============================================
// Philosophy: "Code for rules, AI for taste"
// 5 deterministic gates ($0) + UX_CRITIC AI layer (~$0.05)

// Design Tokens
export {
  DESIGN_TOKENS,
  SPACING_SCALE,
  SPACING_SEMANTIC,
  COLORS,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  MOTION,
  Z_INDEX,
  BREAKPOINTS,
  isValidSpacing,
  isValidDuration,
  isValidEasing,
} from './design';

// Component Registry (Atomic Design)
export {
  COMPONENT_REGISTRY,
  getComponentSpec,
  getComponentCategory,
} from './design';

// Layout Grammar (UX Laws)
export {
  LAYOUT_GRAMMAR,
  CTA_RULES,
  DENSITY_RULES,
  TOUCH_TARGET_RULES,
  PAGE_ARCHETYPES,
  validateCTACount,
  validateDensity,
  validateTouchTarget,
} from './design';

// Design Gates
export {
  designTokenGate,
  tokenGate,
  componentRegistryGate,
  componentGate,
  layoutGrammarGate,
  layoutGate,
  motionSystemGate,
  motionGate,
  accessibilityGate,
  a11yGate,
} from './design';

// Design Orchestrator
export {
  QualityOrchestrator as DesignQualityOrchestrator,
  validateFiles,
  validateFile,
  formatResultForCLI,
  groupIssuesByFile,
  getAutoFixableIssues,
  generateRetryFeedback,
  isValidComponent,
} from './design';

// UX_CRITIC (AI Taste Layer)
export {
  BENCHMARKS,
  EVALUATION_CRITERIA,
  uxCriticAgent,
  INSTANT_REJECTION_PATTERNS,
  STRONG_CONCERN_PATTERNS,
} from './design';

// Design Types
export type {
  FileToCheck as DesignFileToCheck,
  GateResult as DesignGateResult,
  GateIssue as DesignGateIssue,
  GateDefinition as DesignGate,
  OrchestratorResult as DesignQualityReport,
  OrchestratorOptions as DesignOrchestratorConfig,
  ComponentSpec,
  UXCriticInput,
  UXCriticScore,
  UXCriticConcern,
  UXCriticResult,
  SpacingValue,
  FontSizeKey,
  DurationKey,
  EasingKey,
  Viewport,
  PageArchetype,
} from './design';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { getQualityOrchestrator, checkQuality } from './orchestrator';
import type { FileToCheck, QualityReport, QualityConfig } from './types';

/**
 * Quick quality check for a single file
 */
export async function quickCheck(
  content: string,
  filename: string,
  language: string = 'typescript'
): Promise<{ passed: boolean; score: number; issues: number }> {
  const file: FileToCheck = {
    path: filename,
    content,
    language,
  };

  const report = await checkQuality('quick-check', 'single-file', [file]);

  return {
    passed: report.overallStatus === 'passed',
    score: report.overallScore,
    issues: report.summary.totalErrors + report.summary.totalWarnings,
  };
}

/**
 * Full quality check with custom configuration
 */
export async function fullCheck(
  files: FileToCheck[],
  buildId: string,
  projectId: string,
  config?: Partial<QualityConfig>
): Promise<QualityReport> {
  const orchestrator = getQualityOrchestrator(config);
  return await orchestrator.runAllGates(buildId, projectId, files);
}

/**
 * Security-only scan
 */
export async function securityCheck(
  files: FileToCheck[]
): Promise<{ passed: boolean; issues: import('./types').GateIssue[] }> {
  const { securityScanner } = await import('./security-scanner');
  const result = await securityScanner.check(files);
  return {
    passed: result.passed,
    issues: result.issues,
  };
}

/**
 * TypeScript-only validation
 */
export async function typescriptCheck(
  files: FileToCheck[]
): Promise<{ passed: boolean; issues: import('./types').GateIssue[] }> {
  const { typeScriptValidator } = await import('./code-validator');
  const result = await typeScriptValidator.check(files);
  return {
    passed: result.passed,
    issues: result.issues,
  };
}

/**
 * Format a quality report as a string
 */
export function formatQualityReport(report: QualityReport): string {
  const orchestrator = getQualityOrchestrator();
  return orchestrator.formatReport(report);
}

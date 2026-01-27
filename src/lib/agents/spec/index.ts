/**
 * SPEC COMPLIANCE SYSTEM
 *
 * Prevents "false success" builds by parsing specs into structured requirements
 * and tracking completion against them.
 *
 * USAGE:
 *
 * ```typescript
 * import { parseSpec, getRequirementsTracker, runCompletenessGate } from './spec';
 *
 * // 1. Parse the spec file
 * const result = parseSpec(specContent);
 * if (result.errors.length > 0) {
 *   console.error('Spec parsing errors:', result.errors);
 * }
 *
 * // 2. Initialize tracker with parsed requirements
 * const tracker = getRequirementsTracker();
 * tracker.initialize(result.requirements);
 *
 * // 3. Track generated files
 * tracker.trackGeneratedFile('src/app/page.tsx', pageContent);
 * tracker.trackGeneratedFile('src/components/hero.tsx', heroContent);
 *
 * // 4. Check completion
 * const gateResult = runCompletenessGate(tracker);
 * if (!gateResult.passed) {
 *   console.log('Missing:', gateResult.missing);
 *   console.log('Instructions:', gateResult.regenerationInstructions);
 * }
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Core spec types
  SpecRequirements,
  SpecMetadata,
  PageRequirement,
  ComponentRequirement,
  DesignSystemRequirement,
  TechStackRequirement,
  FeatureRequirement,
  Priority,
  PageCategory,
  ComponentCategory,
  PropRequirement,
  TypographySpec,
  GlassmorphismSpec,

  // Tracking types
  GeneratedFile,
  CompletionReport,
  CompletionDetail,
  MissingRequirements,

  // Gate types
  CompletenessGateConfig,
  CompletenessGateResult,
  RegenerationInstruction,

  // Compliance types
  SpecComplianceResult,
  ComplianceIssue,

  // Parser types
  SpecParserOptions,
  SpecParserResult,
  ParserError,
  ParserWarning,
  ParseMetadata,
} from './types';

// ============================================================================
// CONSTANT EXPORTS
// ============================================================================

export { DEFAULT_GATE_CONFIG, DEFAULT_PARSER_OPTIONS } from './types';

// ============================================================================
// PARSER EXPORTS
// ============================================================================

export { SpecParser, parseSpec } from './spec-parser';

// ============================================================================
// TRACKER EXPORTS
// ============================================================================

export {
  RequirementsTracker,
  getRequirementsTracker,
  resetRequirementsTracker,
} from './requirements-tracker';

// ============================================================================
// GATE EXPORTS
// ============================================================================

export {
  CompletenessGate,
  runCompletenessGate,
  passesCompletenessGate,
  getRegenerationInstructions,
  formatGateResult,
} from './completeness-gate';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { SpecParser, parseSpec } from './spec-parser';
import { RequirementsTracker, getRequirementsTracker } from './requirements-tracker';
import { runCompletenessGate, formatGateResult } from './completeness-gate';
import type {
  SpecParserOptions,
  CompletenessGateConfig,
  CompletenessGateResult,
  SpecParserResult,
} from './types';

/**
 * Full spec compliance check from spec content
 *
 * This is the main entry point for the spec compliance system.
 * Parses spec, tracks files, and checks completeness in one call.
 */
export function checkSpecCompliance(
  specContent: string,
  generatedFiles: Array<{ path: string; content: string }>,
  options?: {
    parserOptions?: Partial<SpecParserOptions>;
    gateConfig?: Partial<CompletenessGateConfig>;
  }
): {
  parseResult: SpecParserResult;
  gateResult: CompletenessGateResult;
  passed: boolean;
  summary: string;
} {
  // Parse spec
  const parseResult = parseSpec(specContent, options?.parserOptions);

  if (parseResult.errors.length > 0) {
    return {
      parseResult,
      gateResult: {
        passed: false,
        pageCompletion: 0,
        componentCompletion: 0,
        criticalCompletion: 0,
        designSystemCompletion: 0,
        missing: {
          criticalPages: [],
          criticalComponents: [],
          otherPages: [],
          otherComponents: [],
          missingDesignTokens: [],
        },
        summary: `Spec parsing failed: ${parseResult.errors.map(e => e.message).join(', ')}`,
        failureReasons: parseResult.errors.map(e => e.message),
      },
      passed: false,
      summary: `Spec parsing failed with ${parseResult.errors.length} error(s)`,
    };
  }

  // Initialize tracker
  const tracker = getRequirementsTracker();
  tracker.initialize(parseResult.requirements);

  // Track all generated files
  for (const file of generatedFiles) {
    tracker.trackGeneratedFile(file.path, file.content);
  }

  // Run gate check
  const gateResult = runCompletenessGate(tracker, options?.gateConfig);

  return {
    parseResult,
    gateResult,
    passed: gateResult.passed,
    summary: formatGateResult(gateResult),
  };
}

/**
 * Create a pre-configured spec compliance checker
 */
export function createSpecComplianceChecker(options?: {
  parserOptions?: Partial<SpecParserOptions>;
  gateConfig?: Partial<CompletenessGateConfig>;
}) {
  return {
    /**
     * Check spec compliance for a set of files
     */
    check: (specContent: string, files: Array<{ path: string; content: string }>) =>
      checkSpecCompliance(specContent, files, options),

    /**
     * Get the requirements tracker for manual tracking
     */
    getTracker: () => getRequirementsTracker(),

    /**
     * Parse a spec without tracking
     */
    parseSpec: (content: string) => parseSpec(content, options?.parserOptions),
  };
}

/**
 * Quick check if a build meets minimum requirements
 */
export function quickComplianceCheck(
  specContent: string,
  generatedFiles: Array<{ path: string; content: string }>
): {
  passed: boolean;
  pagePercentage: number;
  componentPercentage: number;
  criticalPercentage: number;
} {
  const parseResult = parseSpec(specContent);

  if (parseResult.errors.length > 0) {
    return {
      passed: false,
      pagePercentage: 0,
      componentPercentage: 0,
      criticalPercentage: 0,
    };
  }

  const tracker = new RequirementsTracker();
  tracker.initialize(parseResult.requirements);

  for (const file of generatedFiles) {
    tracker.trackGeneratedFile(file.path, file.content);
  }

  return {
    passed:
      tracker.getPageCompletion().percentage >= 90 &&
      tracker.getComponentCompletion().percentage >= 80 &&
      tracker.getCriticalCompletion() >= 100,
    pagePercentage: tracker.getPageCompletion().percentage,
    componentPercentage: tracker.getComponentCompletion().percentage,
    criticalPercentage: tracker.getCriticalCompletion(),
  };
}

/**
 * Get spec statistics without full compliance check
 */
export function getSpecStats(specContent: string): {
  totalPages: number;
  totalComponents: number;
  criticalPages: number;
  criticalComponents: number;
  hasDesignSystem: boolean;
  framework: string;
} | null {
  const parseResult = parseSpec(specContent);

  if (parseResult.errors.length > 0) {
    return null;
  }

  const { requirements } = parseResult;

  return {
    totalPages: requirements.pages.length,
    totalComponents: requirements.components.length,
    criticalPages: requirements.pages.filter(p => p.priority === 'P0').length,
    criticalComponents: requirements.components.filter(c => c.critical).length,
    hasDesignSystem:
      Object.keys(requirements.designSystem.colors).length > 0 ||
      requirements.designSystem.glassmorphism !== null,
    framework: requirements.techStack.framework,
  };
}

/**
 * SPEC COMPLIANCE SYSTEM - Type Definitions
 *
 * Types for parsing specifications and tracking completion against requirements.
 * Part of the OLYMPUS Spec Compliance System that prevents "false success" builds.
 */

// ============================================================================
// SPEC REQUIREMENTS TYPES
// ============================================================================

/**
 * Parsed specification requirements
 */
export interface SpecRequirements {
  /** Metadata about the spec */
  metadata: SpecMetadata;
  /** Required pages to generate */
  pages: PageRequirement[];
  /** Required components to generate */
  components: ComponentRequirement[];
  /** Design system requirements */
  designSystem: DesignSystemRequirement;
  /** Technical stack requirements */
  techStack: TechStackRequirement;
  /** Feature requirements */
  features: FeatureRequirement[];
  /** General constraints */
  constraints: string[];
  /** Raw spec content (for reference) */
  rawContent?: string;
}

/**
 * Spec metadata
 */
export interface SpecMetadata {
  /** Project name */
  name: string;
  /** Project type (marketing_website, saas_dashboard, etc.) */
  type: string;
  /** Total expected pages */
  totalPages: number;
  /** Total expected components */
  totalComponents: number;
  /** Spec version or date */
  version?: string;
}

/**
 * Page requirement from spec
 */
export interface PageRequirement {
  /** Route path (e.g., "/dashboard/builds/[id]") */
  path: string;
  /** Page name/title */
  name: string;
  /** Priority level */
  priority: Priority;
  /** Expected sections on this page */
  sections: string[];
  /** Components this page requires */
  components: string[];
  /** Layout reference if any */
  layout?: string;
  /** Whether auth is required */
  authRequired: boolean;
  /** Category (public, auth, dashboard) */
  category: PageCategory;
  /** Expected file path */
  expectedFilePath: string;
}

/**
 * Priority levels
 */
export type Priority = 'P0' | 'P1' | 'P2';

/**
 * Page categories
 */
export type PageCategory = 'public' | 'auth' | 'dashboard' | 'legal' | 'other';

/**
 * Component requirement from spec
 */
export interface ComponentRequirement {
  /** Component name (e.g., "Hero") */
  name: string;
  /** Expected file path */
  path: string;
  /** Component category */
  category: ComponentCategory;
  /** Whether this is critical (P0) */
  critical: boolean;
  /** Variants this component should have */
  variants: string[];
  /** Required props */
  props: PropRequirement[];
  /** Description of what it should do */
  description?: string;
}

/**
 * Component categories
 */
export type ComponentCategory =
  | 'core-ui'
  | 'layout'
  | 'navigation'
  | 'landing'
  | 'dashboard'
  | 'forms'
  | 'feedback'
  | 'other';

/**
 * Prop requirement
 */
export interface PropRequirement {
  /** Prop name */
  name: string;
  /** TypeScript type */
  type: string;
  /** Whether required */
  required: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * Design system requirement
 */
export interface DesignSystemRequirement {
  /** Color tokens */
  colors: Record<string, string>;
  /** Typography scale */
  typography: Record<string, TypographySpec>;
  /** Whether glassmorphism is required */
  glassmorphism: GlassmorphismSpec | null;
  /** Gradient definitions */
  gradients: string[];
  /** Animation requirements */
  animations: string[];
  /** Spacing scale */
  spacing?: Record<string, string>;
}

/**
 * Typography specification
 */
export interface TypographySpec {
  /** Font size */
  fontSize: string;
  /** Font weight */
  fontWeight: string | number;
  /** Line height */
  lineHeight: string;
  /** Letter spacing */
  letterSpacing?: string;
}

/**
 * Glassmorphism specification
 */
export interface GlassmorphismSpec {
  /** Whether required for cards */
  requiredForCards: boolean;
  /** Background settings */
  background: string;
  /** Backdrop filter */
  backdropFilter: string;
  /** Border settings */
  border: string;
}

/**
 * Tech stack requirement
 */
export interface TechStackRequirement {
  /** Framework (nextjs, react, etc.) */
  framework: string;
  /** Framework version */
  frameworkVersion?: string;
  /** Language */
  language: string;
  /** Styling solution */
  styling: string;
  /** UI component library */
  componentLibrary?: string;
  /** Animation library */
  animationLibrary?: string;
  /** State management */
  stateManagement?: string;
  /** Form handling */
  formHandling?: string;
  /** Required packages */
  packages: string[];
}

/**
 * Feature requirement
 */
export interface FeatureRequirement {
  /** Feature name */
  name: string;
  /** Feature description */
  description: string;
  /** Priority */
  priority: Priority;
  /** Related pages */
  relatedPages: string[];
  /** Related components */
  relatedComponents: string[];
}

// ============================================================================
// TRACKING TYPES
// ============================================================================

/**
 * Generated file tracking
 */
export interface GeneratedFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** Matched requirement (if any) */
  matchedRequirement?: PageRequirement | ComponentRequirement;
  /** Match confidence (0-1) */
  matchConfidence: number;
  /** When tracked */
  trackedAt: Date;
}

/**
 * Completion report for a category
 */
export interface CompletionReport {
  /** Total required */
  total: number;
  /** Fully completed */
  completed: number;
  /** Partially completed */
  partial: number;
  /** Missing entirely */
  missing: number;
  /** Completion percentage */
  percentage: number;
  /** Detailed breakdown */
  details: CompletionDetail[];
}

/**
 * Completion detail for a single item
 */
export interface CompletionDetail {
  /** Requirement */
  requirement: PageRequirement | ComponentRequirement;
  /** Status */
  status: 'completed' | 'partial' | 'missing';
  /** Generated file path if any */
  generatedPath?: string;
  /** Match confidence */
  confidence: number;
  /** Issues found */
  issues: string[];
}

/**
 * Missing requirements report
 */
export interface MissingRequirements {
  /** Critical (P0) pages not generated */
  criticalPages: PageRequirement[];
  /** Critical components not generated */
  criticalComponents: ComponentRequirement[];
  /** Non-critical missing pages */
  otherPages: PageRequirement[];
  /** Non-critical missing components */
  otherComponents: ComponentRequirement[];
  /** Missing design tokens */
  missingDesignTokens: string[];
}

// ============================================================================
// GATE TYPES
// ============================================================================

/**
 * Completeness gate configuration
 */
export interface CompletenessGateConfig {
  /** Minimum page completion percentage */
  minPageCompletion: number;
  /** Minimum component completion percentage */
  minComponentCompletion: number;
  /** Minimum critical item completion (should be 100) */
  minCriticalCompletion: number;
  /** Minimum design system completion */
  minDesignSystemCompletion: number;
  /** Whether to block build on failure */
  blockOnFailure: boolean;
  /** Whether to generate regeneration instructions */
  generateRegenInstructions: boolean;
}

/**
 * Default gate configuration
 */
export const DEFAULT_GATE_CONFIG: CompletenessGateConfig = {
  minPageCompletion: 90,
  minComponentCompletion: 80,
  minCriticalCompletion: 100,
  minDesignSystemCompletion: 70,
  blockOnFailure: true,
  generateRegenInstructions: true,
};

/**
 * Completeness gate result
 */
export interface CompletenessGateResult {
  /** Whether the gate passed */
  passed: boolean;
  /** Page completion percentage */
  pageCompletion: number;
  /** Component completion percentage */
  componentCompletion: number;
  /** Critical item completion percentage */
  criticalCompletion: number;
  /** Design system completion percentage */
  designSystemCompletion: number;
  /** Missing requirements */
  missing: MissingRequirements;
  /** Regeneration instructions if enabled */
  regenerationInstructions?: RegenerationInstruction[];
  /** Summary message */
  summary: string;
  /** Detailed failure reasons */
  failureReasons: string[];
}

/**
 * Instruction for regenerating missing items
 */
export interface RegenerationInstruction {
  /** Type of item to regenerate */
  type: 'page' | 'component' | 'design-token';
  /** The requirement */
  requirement: PageRequirement | ComponentRequirement | string;
  /** Suggested prompt addition */
  suggestedPrompt: string;
  /** Priority for regeneration */
  priority: number;
  /** Estimated complexity */
  complexity: 'low' | 'medium' | 'high';
}

// ============================================================================
// COMPLIANCE TYPES
// ============================================================================

/**
 * Spec compliance result
 */
export interface SpecComplianceResult {
  /** Overall compliance percentage */
  overallCompliance: number;
  /** Page compliance */
  pageCompliance: CompletionReport;
  /** Component compliance */
  componentCompliance: CompletionReport;
  /** Design system compliance */
  designSystemCompliance: number;
  /** Whether all critical items are present */
  allCriticalPresent: boolean;
  /** Missing items summary */
  missing: MissingRequirements;
  /** Issues found */
  issues: ComplianceIssue[];
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  /** Issue type */
  type: 'missing-page' | 'missing-component' | 'missing-design-token' | 'wrong-structure' | 'incomplete';
  /** Severity */
  severity: 'critical' | 'major' | 'minor';
  /** Description */
  message: string;
  /** Related requirement */
  requirement?: PageRequirement | ComponentRequirement;
  /** Suggested fix */
  suggestedFix?: string;
}

// ============================================================================
// PARSER TYPES
// ============================================================================

/**
 * Parser options
 */
export interface SpecParserOptions {
  /** Whether to extract design tokens */
  extractDesignTokens: boolean;
  /** Whether to extract tech stack */
  extractTechStack: boolean;
  /** Whether to infer missing data */
  inferMissingData: boolean;
  /** Default framework if not specified */
  defaultFramework: string;
  /** Whether to validate parsed data */
  validate: boolean;
}

/**
 * Default parser options
 */
export const DEFAULT_PARSER_OPTIONS: SpecParserOptions = {
  extractDesignTokens: true,
  extractTechStack: true,
  inferMissingData: true,
  defaultFramework: 'nextjs',
  validate: true,
};

/**
 * Parser result
 */
export interface SpecParserResult {
  /** Parsed requirements */
  requirements: SpecRequirements;
  /** Parsing errors */
  errors: ParserError[];
  /** Parsing warnings */
  warnings: ParserWarning[];
  /** Parsing metadata */
  parseMetadata: ParseMetadata;
}

/**
 * Parser error
 */
export interface ParserError {
  /** Error type */
  type: 'syntax' | 'missing-section' | 'invalid-data' | 'unknown';
  /** Error message */
  message: string;
  /** Line number if applicable */
  line?: number;
  /** Section where error occurred */
  section?: string;
}

/**
 * Parser warning
 */
export interface ParserWarning {
  /** Warning type */
  type: 'incomplete' | 'ambiguous' | 'deprecated' | 'inferred';
  /** Warning message */
  message: string;
  /** Section where warning occurred */
  section?: string;
}

/**
 * Parse metadata
 */
export interface ParseMetadata {
  /** Time taken to parse (ms) */
  parseTime: number;
  /** Number of sections found */
  sectionsFound: number;
  /** Number of pages extracted */
  pagesExtracted: number;
  /** Number of components extracted */
  componentsExtracted: number;
  /** Spec format detected */
  formatDetected: 'markdown' | 'yaml' | 'json' | 'mixed';
}

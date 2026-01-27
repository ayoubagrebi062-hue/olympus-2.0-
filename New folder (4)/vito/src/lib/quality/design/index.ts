/**
 * OLYMPUS 2.1 - Quality System
 *
 * "Code for rules, AI for taste"
 *
 * This is the complete quality validation system for OLYMPUS.
 * It enforces design tokens, component registry, layout grammar,
 * motion rules, and accessibility standards through deterministic
 * code validators, with an AI taste layer (UX_CRITIC) for
 * subjective quality evaluation.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

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
  // Validation helpers
  isValidSpacing,
  isValidDuration,
  isValidEasing,
  isForbiddenEasing,
  getClosestValidSpacing,
  getClosestValidDuration,
  // Types
  type SpacingValue,
  type FontSizeKey,
  type DurationKey,
  type EasingKey,
} from './design-tokens';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  COMPONENT_REGISTRY,
  // Validation helpers
  isValidComponent,
  getComponentSpec,
  getComponentCategory,
  getAllComponents,
  getComponentVariants,
  getComponentSizes,
  getRequiredStates,
  getComponentRules,
  // Types
  type ComponentSpec,
  type ComponentRegistry,
} from './component-registry';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  LAYOUT_GRAMMAR,
  CTA_RULES,
  DENSITY_RULES,
  TOUCH_TARGET_RULES,
  HIERARCHY_RULES,
  PAGE_STRUCTURE_RULES,
  PAGE_ARCHETYPES,
  RESPONSIVE_RULES,
  // Validation helpers
  validateCTACount,
  validateDensity,
  validateFormDensity,
  validateHeadingHierarchy,
  validateTouchTarget,
  getArchetypeRules,
  getArchetypeRequirements,
  // Types
  type Viewport,
  type PageArchetype,
} from './layout-grammar';

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY GATES
// ═══════════════════════════════════════════════════════════════════════════════

export { designTokenGate, tokenGate } from './gates/token-gate';
export { componentRegistryGate, componentGate } from './gates/component-gate';
export { layoutGrammarGate, layoutGate } from './gates/layout-gate';
export { motionSystemGate, motionGate } from './gates/motion-gate';
export { accessibilityGate, a11yGate } from './gates/a11y-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  QualityOrchestrator,
  validateFiles,
  validateFile,
  formatResultForCLI,
  groupIssuesByFile,
  getAutoFixableIssues,
  generateRetryFeedback,
  // Types
  type FileToCheck,
  type GateResult,
  type GateIssue,
  type GateDefinition,
  type OrchestratorResult,
  type OrchestratorOptions,
} from './orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// UX CRITIC (AI LAYER)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  uxCriticAgent,
  BENCHMARKS,
  EVALUATION_CRITERIA,
  INSTANT_REJECTION_PATTERNS,
  STRONG_CONCERN_PATTERNS,
  // Types
  type UXCriticInput,
  type UXCriticResult,
  type UXCriticScore,
  type UXCriticConcern,
  type AgentDefinition,
} from './ux-critic';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

import { QualityOrchestrator } from './orchestrator';
export default QualityOrchestrator;

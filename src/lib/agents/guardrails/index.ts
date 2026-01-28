/**
 * OLYMPUS 10X - Guardrails Module
 *
 * Public exports for the 4-layer guardrail system.
 *
 * Usage:
 * ```typescript
 * import {
 *   GuardrailEngine,
 *   createGuardrailEngine,
 *   validateInput,
 *   TripwireSystem,
 * } from '@/lib/agents/guardrails';
 *
 * // Quick validation
 * const result = await validateInput({ prompt: 'Build me an app' });
 *
 * // Full control
 * const engine = createGuardrailEngine({
 *   failFast: true,
 *   parallelSecurity: true,
 * });
 * const result = await engine.validate(context, input);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Core types (re-exported from @/lib/core)
  GuardrailAction,
  GuardrailLayer,
  GuardrailResult,
  GuardrailInput,
  TripwireConfig,

  // Pipeline types
  GuardrailPipelineConfig,
  GuardrailContext,
  LayerValidationResult,
  GuardrailEngine as IGuardrailEngine,
  GuardrailLayerHandler,

  // Layer config types
  LayerConfig,
  ApiLayerConfig,
  SecurityLayerConfig,
  SemanticLayerConfig,
  AgentLayerConfig,

  // Security types
  SecurityPattern,
  SecurityDetection,

  // Agent types
  AgentRuleSet,
  AgentResourceLimits,

  // Rate limiting types
  RateLimiter,
  RateLimitEntry,
} from './types';

// ============================================================================
// ENGINE
// ============================================================================

export { GuardrailEngine, createGuardrailEngine, validateInput, DEFAULT_CONFIG } from './engine';

// ============================================================================
// TRIPWIRE SYSTEM
// ============================================================================

export {
  TripwireSystem,
  createTripwireSystem,
  DEFAULT_TRIPWIRES,
  BUILTIN_TRIPWIRES,
} from './tripwire';

export type { TripwireResult } from './tripwire';

// ============================================================================
// LAYERS
// ============================================================================

// API Layer
export { ApiLayer, createApiLayer, InMemoryRateLimiter } from './layers/api';

// Security Layer
export {
  SecurityLayer,
  createSecurityLayer,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  PII_PATTERNS,
} from './layers/security';

// Semantic Layer
export { SemanticLayer, createSemanticLayer, INTENT_PATTERNS } from './layers/semantic';

export type {
  IntentCategory,
  IntentClassification,
  QualityAssessment,
  ScopeAnalysis,
} from './layers/semantic';

// Agent Layer
export {
  AgentLayer,
  createAgentLayer,
  BUILTIN_AGENT_RULES,
  DEFAULT_RESOURCE_LIMITS,
} from './layers/agent';

// ============================================================================
// OUTPUT GUARDRAILS (Week 2 - Days 17-18)
// ============================================================================

export {
  // Types
  type SecurityIssueType,
  type Severity,
  type OutputIssue,
  type OutputValidationResult,
  type OutputGuardrailConfig,
  type CustomPattern,
  type OutputValidationRequest,
  DEFAULT_OUTPUT_GUARDRAIL_CONFIG,
  OutputValidationRequestSchema,

  // Detectors
  detectSecrets,
  detectPlaceholders,
  detectDangerousPatterns,
  maskSecret,

  // Engine
  OutputGuardrailEngine,
  outputGuardrail,

  // Integration
  validateAgentOutput,
  validateBuildOutput,
  OutputValidationError,
} from './output';

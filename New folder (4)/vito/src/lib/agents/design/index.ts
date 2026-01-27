/**
 * OLYMPUS Design Token System
 *
 * Single source of truth for all design tokens used by agents.
 * This module provides:
 *
 * 1. Design Tokens - Colors, typography, spacing, motion, effects
 * 2. Brand Interpretations - "Make it like Stripe" → specific tokens
 * 3. Prompt Injection - Inject tokens into agent prompts
 * 4. Validation - Ensure generated code uses correct tokens
 *
 * @example
 * ```typescript
 * // Get design tokens (auto-detects brand from user request)
 * import { getDesignTokens, generateDesignContext } from '@/lib/agents/design';
 *
 * const tokens = getDesignTokens('stripe');
 * const context = generateDesignContext('make it like Linear');
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// DESIGN TOKEN PROVIDER
// ============================================================================

export {
  // Core functions
  getDesignTokens,
  getTokenValue,
  interpretBrand,
  tokensToTailwindConfig,
  deepMerge,
  // Constants
  DEFAULT_TOKENS,
  BRAND_INTERPRETATIONS,
  // Types
  type DesignTokens,
  type BrandInterpretation,
} from './design-token-provider';

// ============================================================================
// PROMPT INJECTION
// ============================================================================

export {
  // Core functions
  generateDesignContext,
  generateCompactContext,
  injectTokensIntoPrompt,
  createPromptEnhancer,
  // Agent-specific functions
  getAgentDesignContext,
  injectForAgent,
  // Utilities
  detectBrand,
  getColorsForCSS,
  getTypographyForCSS,
  validateDesignCompliance,
  // Constants
  AGENT_PRESETS,
  // Types
  type InjectionOptions,
  type DesignContext,
  type AgentPreset,
} from './inject-tokens';

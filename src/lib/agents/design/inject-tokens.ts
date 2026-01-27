/**
 * INJECT TOKENS INTO AGENT PROMPTS
 *
 * Replaces hardcoded design values with dynamic tokens from the design-token-provider.
 * This ensures all design agents work from the same source of truth.
 *
 * @example
 * ```typescript
 * // Generate design context for an agent
 * const context = generateDesignContext("make it like Stripe");
 *
 * // Inject tokens into an existing prompt
 * const enhancedPrompt = injectTokensIntoPrompt(originalPrompt, "dark theme");
 * ```
 */

import {
  getDesignTokens,
  interpretBrand,
  type DesignTokens,
  type BrandInterpretation,
} from './design-token-provider';

// ============================================================================
// TYPES
// ============================================================================

export interface InjectionOptions {
  /** Include full token dump (for PALETTE/master agents) */
  fullTokens?: boolean;
  /** Include only specific sections */
  sections?: ('colors' | 'typography' | 'spacing' | 'motion' | 'effects' | 'components')[];
  /** Token budget limit (characters) */
  maxLength?: number;
  /** Brand interpretation hint from user request */
  brandHint?: string;
}

export interface DesignContext {
  /** The interpreted brand name or 'olympus' for default */
  brand: string;
  /** Formatted design context string */
  context: string;
  /** Raw tokens used */
  tokens: DesignTokens;
  /** Character count */
  length: number;
}

// ============================================================================
// BRAND DETECTION
// ============================================================================

const BRAND_KEYWORDS: Record<string, string[]> = {
  stripe: ['stripe', 'payment', 'fintech', 'financial', 'banking'],
  linear: ['linear', 'issue', 'tracker', 'project management', 'productivity'],
  vercel: ['vercel', 'next', 'deployment', 'developer', 'devtools'],
  apple: ['apple', 'ios', 'macos', 'cupertino', 'minimal'],
  notion: ['notion', 'wiki', 'documentation', 'notes', 'workspace'],
  figma: ['figma', 'design tool', 'collaborative', 'prototyping'],
  discord: ['discord', 'chat', 'gaming', 'community', 'social'],
  spotify: ['spotify', 'music', 'streaming', 'audio', 'playlist'],
  github: ['github', 'code', 'repository', 'version control', 'open source'],
  dark: ['dark', 'dark theme', 'dark mode'],
  light: ['light', 'light theme', 'light mode'],
  modern: ['modern', 'contemporary', 'fresh'],
  minimal: ['minimal', 'minimalist', 'clean', 'simple'],
  playful: ['playful', 'fun', 'colorful', 'vibrant'],
  corporate: ['corporate', 'professional', 'business', 'enterprise'],
  elegant: ['elegant', 'luxurious', 'premium', 'sophisticated'],
};

/**
 * Detect brand from user request text
 */
export function detectBrand(userRequest?: string): string | undefined {
  if (!userRequest) return undefined;

  const lower = userRequest.toLowerCase();

  // Check for explicit "like X" patterns
  const likeMatch = lower.match(/(?:like|similar to|inspired by|style of)\s+(\w+)/);
  if (likeMatch) {
    const target = likeMatch[1];
    for (const [brand, keywords] of Object.entries(BRAND_KEYWORDS)) {
      if (keywords.includes(target) || brand === target) {
        return brand;
      }
    }
  }

  // Check for brand mentions
  for (const [brand, keywords] of Object.entries(BRAND_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return brand;
    }
  }

  return undefined;
}

// ============================================================================
// CONTEXT GENERATION
// ============================================================================

/**
 * Generate design context string for agent prompts
 *
 * This creates a formatted block of design tokens that can be injected
 * into any agent's system prompt to ensure consistent design decisions.
 */
export function generateDesignContext(
  userRequest?: string,
  options: InjectionOptions = {}
): DesignContext {
  const {
    fullTokens = false,
    sections = ['colors', 'typography', 'spacing', 'motion', 'effects'],
    maxLength = 4000,
    brandHint,
  } = options;

  // Interpret brand from user request
  const interpretation = interpretBrand(userRequest || brandHint || '');
  const tokens = interpretation.tokens;
  const detectedBrand =
    interpretation.matchedKeywords.length > 0 ? interpretation.matchedKeywords[0] : 'olympus';

  const parts: string[] = [];

  // Header
  parts.push('='.repeat(60));
  parts.push('DESIGN SYSTEM TOKENS (Single Source of Truth)');
  parts.push('='.repeat(60));
  parts.push('');
  parts.push(`Brand: OLYMPUS 50X`);
  if (interpretation.matchedKeywords.length > 0) {
    parts.push(`Style Applied: ${interpretation.matchedKeywords.join(', ')}`);
  }
  parts.push(`Reasoning: ${interpretation.reasoning}`);
  parts.push('');

  // Colors Section
  if (sections.includes('colors')) {
    parts.push('## COLORS');
    parts.push('');
    parts.push('### Brand Colors');
    parts.push(`  primary: ${tokens.colors.primary}`);
    parts.push(`  primaryHover: ${tokens.colors.primaryHover}`);
    parts.push(`  primaryLight: ${tokens.colors.primaryLight}`);
    parts.push(`  secondary: ${tokens.colors.secondary}`);
    parts.push(`  accent: ${tokens.colors.accent}`);
    parts.push('');

    parts.push('### Backgrounds (Dark Theme)');
    parts.push(`  background: ${tokens.colors.background}`);
    parts.push(`  surface: ${tokens.colors.surface}`);
    parts.push(`  surfaceElevated: ${tokens.colors.surfaceElevated}`);
    parts.push('');

    parts.push('### Borders');
    parts.push(`  border: ${tokens.colors.border}`);
    parts.push(`  borderSubtle: ${tokens.colors.borderSubtle}`);
    parts.push(`  borderFocus: ${tokens.colors.borderFocus}`);
    parts.push('');

    parts.push('### Text');
    parts.push(`  primary: ${tokens.colors.text.primary}`);
    parts.push(`  secondary: ${tokens.colors.text.secondary}`);
    parts.push(`  muted: ${tokens.colors.text.muted}`);
    parts.push(`  disabled: ${tokens.colors.text.disabled}`);
    parts.push('');

    parts.push('### Semantic Colors');
    parts.push(`  success: ${tokens.colors.semantic.success}`);
    parts.push(`  warning: ${tokens.colors.semantic.warning}`);
    parts.push(`  error: ${tokens.colors.semantic.error}`);
    parts.push(`  info: ${tokens.colors.semantic.info}`);
    parts.push('');
  }

  // Typography Section
  if (sections.includes('typography')) {
    parts.push('## TYPOGRAPHY');
    parts.push('');
    parts.push(`Font Family: ${tokens.typography.fontFamily.sans}`);
    parts.push(`Mono: ${tokens.typography.fontFamily.mono}`);
    parts.push('');
    parts.push('### Font Sizes');
    Object.entries(tokens.typography.fontSize).forEach(([name, size]) => {
      parts.push(`  ${name}: ${size}`);
    });
    parts.push('');
    if (fullTokens) {
      parts.push('### Font Weights');
      Object.entries(tokens.typography.fontWeight).forEach(([name, weight]) => {
        parts.push(`  ${name}: ${weight}`);
      });
      parts.push('');
      parts.push('### Line Heights');
      Object.entries(tokens.typography.lineHeight).forEach(([name, lh]) => {
        parts.push(`  ${name}: ${lh}`);
      });
      parts.push('');
    }
  }

  // Spacing Section
  if (sections.includes('spacing')) {
    parts.push('## SPACING');
    parts.push('');
    parts.push(`Base Unit: ${tokens.spacing.base}px`);
    parts.push('');
    parts.push('### Scale (px)');
    tokens.spacing.scale.forEach((value, index) => {
      parts.push(`  ${index}: ${value}px`);
    });
    parts.push('');
    parts.push('### Component Spacing');
    parts.push(`  cardPadding: ${tokens.spacing.semantic.cardPadding}`);
    parts.push(`  sectionGap: ${tokens.spacing.semantic.sectionGap}`);
    parts.push(`  formFieldGap: ${tokens.spacing.semantic.formFieldGap}`);
    parts.push('');
  }

  // Motion Section
  if (sections.includes('motion')) {
    parts.push('## MOTION');
    parts.push('');
    parts.push('### Duration');
    Object.entries(tokens.motion.duration).forEach(([name, value]) => {
      parts.push(`  ${name}: ${value}`);
    });
    parts.push('');
    parts.push('### Easing');
    Object.entries(tokens.motion.easing).forEach(([name, value]) => {
      parts.push(`  ${name}: ${value}`);
    });
    parts.push('');
  }

  // Effects Section
  if (sections.includes('effects')) {
    parts.push('## EFFECTS');
    parts.push('');
    parts.push('### Border Radius');
    Object.entries(tokens.radius).forEach(([name, value]) => {
      parts.push(`  ${name}: ${value}`);
    });
    parts.push('');
    parts.push('### Shadows');
    Object.entries(tokens.shadows).forEach(([name, value]) => {
      parts.push(`  ${name}: ${value}`);
    });
    parts.push('');
    parts.push('### Glassmorphism');
    parts.push(`  background: ${tokens.effects.glassmorphism.background}`);
    parts.push(`  blur: ${tokens.effects.glassmorphism.blur}`);
    parts.push(`  border: ${tokens.effects.glassmorphism.border}`);
    parts.push('');
    parts.push('### Glow Effects');
    Object.entries(tokens.effects.glow).forEach(([name, value]) => {
      parts.push(`  ${name}: ${value}`);
    });
    parts.push('');
  }

  // Components Section (only for full tokens)
  if (sections.includes('components') && fullTokens) {
    parts.push('## COMPONENTS');
    parts.push('');
    parts.push('### Button');
    parts.push(`  variants: ${tokens.components.button.variants.join(', ')}`);
    parts.push(`  iconGap: ${tokens.components.button.iconGap}`);
    Object.entries(tokens.components.button.sizes).forEach(([size, config]) => {
      parts.push(
        `  ${size}: height=${config.height}, padding=${config.padding}, fontSize=${config.fontSize}`
      );
    });
    parts.push('');
    parts.push('### Card');
    parts.push(`  padding: ${tokens.components.card.padding}`);
    parts.push(`  radius: ${tokens.components.card.radius}`);
    parts.push('');
  }

  parts.push('='.repeat(60));

  let context = parts.join('\n');

  // Truncate if over budget
  if (context.length > maxLength) {
    context = context.slice(0, maxLength - 50) + '\n\n[TRUNCATED - Token budget exceeded]';
  }

  return {
    brand: detectedBrand,
    context,
    tokens,
    length: context.length,
  };
}

/**
 * Generate a compact design context for token-limited agents
 */
export function generateCompactContext(userRequest?: string): string {
  const tokens = getDesignTokens(userRequest);

  return `
DESIGN TOKENS (Compact):
Brand: OLYMPUS 50X (VIOLET primary, dark glassmorphism)
Primary: ${tokens.colors.primary} | Hover: ${tokens.colors.primaryHover}
BG: ${tokens.colors.background} | Surface: ${tokens.colors.surface}
Text: ${tokens.colors.text.primary} | Muted: ${tokens.colors.text.muted}
Font: ${tokens.typography.fontFamily.sans.split(',')[0]}
Radius: ${tokens.radius.lg} | Shadow: glow=${tokens.shadows.glow}
Motion: ${tokens.motion.duration.normal} default, ease-out easing
`.trim();
}

// ============================================================================
// PROMPT INJECTION
// ============================================================================

/**
 * Inject design tokens into an existing agent prompt
 *
 * Replaces placeholder markers or appends design context to prompts.
 * Supports both full replacement and marker-based injection.
 */
export function injectTokensIntoPrompt(
  originalPrompt: string,
  userRequest?: string,
  options: InjectionOptions = {}
): string {
  const { context } = generateDesignContext(userRequest, options);

  // Check for placeholder marker
  const DESIGN_TOKEN_MARKER = '{{DESIGN_TOKENS}}';
  const DESIGN_CONTEXT_MARKER = '{{DESIGN_CONTEXT}}';
  const COMPACT_TOKEN_MARKER = '{{DESIGN_COMPACT}}';

  let result = originalPrompt;

  // Replace markers if present
  if (result.includes(DESIGN_TOKEN_MARKER)) {
    result = result.replace(DESIGN_TOKEN_MARKER, context);
  }

  if (result.includes(DESIGN_CONTEXT_MARKER)) {
    result = result.replace(DESIGN_CONTEXT_MARKER, context);
  }

  if (result.includes(COMPACT_TOKEN_MARKER)) {
    result = result.replace(COMPACT_TOKEN_MARKER, generateCompactContext(userRequest));
  }

  // If no markers found, append to the end (before any final instructions)
  if (result === originalPrompt) {
    // Look for common ending patterns
    const endPatterns = [
      /\n## OUTPUT FORMAT/i,
      /\n## CONSTRAINTS/i,
      /\n## RULES/i,
      /\nIMPORTANT:/i,
      /\nNOTE:/i,
    ];

    let insertPosition = result.length;
    for (const pattern of endPatterns) {
      const match = result.match(pattern);
      if (match && match.index !== undefined && match.index < insertPosition) {
        insertPosition = match.index;
      }
    }

    // Insert design context
    const before = result.slice(0, insertPosition);
    const after = result.slice(insertPosition);
    result = `${before}\n\n${context}\n${after}`;
  }

  return result;
}

/**
 * Create an agent prompt enhancer function
 *
 * Returns a function that can be used to enhance any prompt with design tokens.
 * Useful for creating reusable prompt pipelines.
 */
export function createPromptEnhancer(
  defaultOptions: InjectionOptions = {}
): (prompt: string, userRequest?: string) => string {
  return (prompt: string, userRequest?: string) => {
    return injectTokensIntoPrompt(prompt, userRequest, defaultOptions);
  };
}

// ============================================================================
// AGENT-SPECIFIC INJECTORS
// ============================================================================

/**
 * Design context presets for different agent types
 */
export const AGENT_PRESETS = {
  /** Full tokens for master design agents (PALETTE, DESIGNER) */
  master: {
    fullTokens: true,
    sections: ['colors', 'typography', 'spacing', 'motion', 'effects', 'components'] as const,
    maxLength: 8000,
  },

  /** Standard tokens for design implementation agents (GRID, BLOCKS, PIXEL) */
  implementation: {
    fullTokens: false,
    sections: ['colors', 'typography', 'spacing', 'effects'] as const,
    maxLength: 4000,
  },

  /** Compact tokens for supporting agents (WIRE, FLOW) */
  supporting: {
    fullTokens: false,
    sections: ['colors', 'spacing'] as const,
    maxLength: 2000,
  },

  /** Minimal tokens for non-design agents that need color awareness */
  minimal: {
    fullTokens: false,
    sections: ['colors'] as const,
    maxLength: 1000,
  },
} as const;

export type AgentPreset = keyof typeof AGENT_PRESETS;

/**
 * Get design context for a specific agent type
 */
export function getAgentDesignContext(
  agentPreset: AgentPreset,
  userRequest?: string
): DesignContext {
  const preset = AGENT_PRESETS[agentPreset];
  return generateDesignContext(userRequest, {
    fullTokens: preset.fullTokens,
    sections: [...preset.sections] as InjectionOptions['sections'],
    maxLength: preset.maxLength,
  });
}

/**
 * Inject tokens into prompt using agent-specific preset
 */
export function injectForAgent(
  agentPreset: AgentPreset,
  originalPrompt: string,
  userRequest?: string
): string {
  const preset = AGENT_PRESETS[agentPreset];
  return injectTokensIntoPrompt(originalPrompt, userRequest, {
    fullTokens: preset.fullTokens,
    sections: [...preset.sections] as InjectionOptions['sections'],
    maxLength: preset.maxLength,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract color values for CSS-in-JS usage
 */
export function getColorsForCSS(userRequest?: string): Record<string, string> {
  const tokens = getDesignTokens(userRequest);

  return {
    // Brand colors
    primary: tokens.colors.primary,
    'primary-hover': tokens.colors.primaryHover,
    'primary-light': tokens.colors.primaryLight,
    secondary: tokens.colors.secondary,
    accent: tokens.colors.accent,

    // Backgrounds
    bg: tokens.colors.background,
    surface: tokens.colors.surface,
    'surface-elevated': tokens.colors.surfaceElevated,

    // Borders
    border: tokens.colors.border,
    'border-subtle': tokens.colors.borderSubtle,
    'border-focus': tokens.colors.borderFocus,

    // Text
    text: tokens.colors.text.primary,
    'text-secondary': tokens.colors.text.secondary,
    'text-muted': tokens.colors.text.muted,
    'text-disabled': tokens.colors.text.disabled,

    // Semantic
    success: tokens.colors.semantic.success,
    warning: tokens.colors.semantic.warning,
    error: tokens.colors.semantic.error,
    info: tokens.colors.semantic.info,
  };
}

/**
 * Get typography configuration for CSS
 */
export function getTypographyForCSS(userRequest?: string): Record<
  string,
  {
    fontSize: string;
    fontWeight: number;
  }
> {
  const tokens = getDesignTokens(userRequest);

  const result: Record<string, { fontSize: string; fontWeight: number }> = {};

  for (const [name, size] of Object.entries(tokens.typography.fontSize)) {
    result[name] = {
      fontSize: size,
      fontWeight: tokens.typography.fontWeight.normal,
    };
  }

  return result;
}

/**
 * Validate that generated code uses correct design tokens
 */
export function validateDesignCompliance(
  code: string,
  userRequest?: string
): { valid: boolean; violations: string[] } {
  const tokens = getDesignTokens(userRequest);
  const violations: string[] = [];

  // Check for hardcoded hex colors that should use tokens
  const hexPattern = /#[0-9a-fA-F]{6}\b/g;
  const hexMatches = code.match(hexPattern) || [];

  const allowedColors = new Set(
    [
      tokens.colors.primary,
      tokens.colors.primaryHover,
      tokens.colors.primaryLight,
      tokens.colors.secondary,
      tokens.colors.accent,
      tokens.colors.background,
      tokens.colors.surface,
      tokens.colors.surfaceElevated,
      tokens.colors.border,
      tokens.colors.text.primary,
      tokens.colors.text.secondary,
      tokens.colors.text.muted,
      tokens.colors.text.disabled,
      tokens.colors.semantic.success,
      tokens.colors.semantic.warning,
      tokens.colors.semantic.error,
      tokens.colors.semantic.info,
      '#ffffff',
      '#000000', // Common exceptions
    ].map(c => c.toLowerCase())
  );

  for (const hex of hexMatches) {
    if (!allowedColors.has(hex.toLowerCase())) {
      violations.push(`Unauthorized color: ${hex} - use design token instead`);
    }
  }

  // Check for forbidden patterns (generic AI colors)
  const forbiddenPatterns = [
    'bg-blue-500',
    'bg-blue-600',
    'text-blue-500',
    'border-blue-500',
    'ring-blue-500',
    'href="#"',
    'href=""',
    'onClick={() => {}}',
  ];

  for (const pattern of forbiddenPatterns) {
    if (code.includes(pattern)) {
      violations.push(`Forbidden pattern detected: ${pattern}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

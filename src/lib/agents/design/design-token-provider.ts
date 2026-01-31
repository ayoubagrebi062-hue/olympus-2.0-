/**
 * OLYMPUS Design Token Provider
 *
 * Single source of truth for ALL design decisions.
 * All agents MUST read from here - NEVER hardcode values.
 *
 * Features:
 * - Central token definitions (colors, typography, spacing, motion)
 * - Brand interpretation ("make it like Stripe" → blue palette)
 * - Runtime token resolution
 * - Tailwind config generation
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DesignTokens {
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    borderSubtle: string;
    borderFocus: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
      disabled: string;
    };
    semantic: {
      success: string;
      successMuted: string;
      warning: string;
      warningMuted: string;
      error: string;
      errorMuted: string;
      info: string;
      infoMuted: string;
    };
  };
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, number>;
    letterSpacing: Record<string, string>;
  };
  spacing: {
    base: number;
    scale: number[];
    semantic: {
      buttonIconGap: number;
      buttonPadding: { sm: string; md: string; lg: string };
      cardPadding: string;
      sectionGap: string;
      formFieldGap: string;
    };
  };
  radius: Record<string, string>;
  shadows: Record<string, string>;
  motion: {
    duration: {
      instant: string;
      fast: string;
      normal: string;
      slow: string;
      slower: string;
    };
    easing: {
      default: string;
      in: string;
      out: string;
      inOut: string;
      spring: string;
    };
    patterns: Record<string, { duration: string; easing: string }>;
  };
  effects: {
    glassmorphism: {
      background: string;
      blur: string;
      border: string;
    };
    glow: {
      subtle: string;
      medium: string;
      strong: string;
    };
    gradients: Record<string, string>;
  };
  components: {
    button: {
      sizes: Record<string, { height: string; padding: string; fontSize: string }>;
      variants: string[];
      iconGap: string;
    };
    input: {
      sizes: Record<string, { height: string; padding: string; fontSize: string }>;
      borderRadius: string;
    };
    card: {
      padding: string;
      radius: string;
      background: string;
      border: string;
    };
    modal: {
      maxWidth: Record<string, string>;
      padding: string;
      radius: string;
    };
  };
  breakpoints: Record<string, string>;
  zIndex: Record<string, number>;
}

export interface BrandInterpretation {
  userRequest: string;
  tokens: DesignTokens;
  matchedKeywords: string[];
  reasoning: string;
}

// ============================================================================
// DEFAULT TOKENS (OLYMPUS Brand - 50X Quality)
// ============================================================================

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    // Brand Colors - VIOLET PRIMARY (NOT blue)
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#ede9fe',
    secondary: '#6b7280',
    accent: '#06b6d4',

    // Backgrounds (Dark Theme)
    background: '#0A0A0B',
    surface: '#141416',
    surfaceElevated: '#1C1C1F',

    // Borders
    border: '#27272A',
    borderSubtle: 'rgba(255, 255, 255, 0.1)',
    borderFocus: '#7c3aed',

    // Text
    text: {
      primary: '#FAFAFA',
      secondary: '#A1A1AA',
      muted: '#71717A',
      disabled: '#52525B',
    },

    // Semantic
    semantic: {
      success: '#22C55E',
      successMuted: 'rgba(34, 197, 94, 0.1)',
      warning: '#F59E0B',
      warningMuted: 'rgba(245, 158, 11, 0.1)',
      error: '#EF4444',
      errorMuted: 'rgba(239, 68, 68, 0.1)',
      info: '#3B82F6',
      infoMuted: 'rgba(59, 130, 246, 0.1)',
    },
  },

  typography: {
    fontFamily: {
      sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
      '6xl': '3.75rem', // 60px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  spacing: {
    base: 4,
    scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],
    semantic: {
      buttonIconGap: 8,
      buttonPadding: { sm: '0 12px', md: '0 16px', lg: '0 24px' },
      cardPadding: '24px',
      sectionGap: '64px',
      formFieldGap: '16px',
    },
  },

  radius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(124, 58, 237, 0.3)',
    glowStrong: '0 0 40px rgba(124, 58, 237, 0.4)',
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    patterns: {
      buttonHover: { duration: '150ms', easing: 'ease-out' },
      buttonPress: { duration: '100ms', easing: 'ease-in-out' },
      modalEnter: { duration: '200ms', easing: 'ease-out' },
      modalExit: { duration: '150ms', easing: 'ease-in' },
      pageTransition: { duration: '300ms', easing: 'ease-in-out' },
      dropdownOpen: { duration: '200ms', easing: 'ease-out' },
      fadeIn: { duration: '200ms', easing: 'ease-out' },
    },
  },

  effects: {
    glassmorphism: {
      background: 'rgba(255, 255, 255, 0.03)',
      blur: 'blur(12px)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    glow: {
      subtle: '0 0 20px rgba(124, 58, 237, 0.2)',
      medium: '0 0 30px rgba(124, 58, 237, 0.3)',
      strong: '0 0 40px rgba(124, 58, 237, 0.4)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      accent: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      hero: 'linear-gradient(135deg, #0A0A0B 0%, #1C1C1F 50%, #0A0A0B 100%)',
      shimmer: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
    },
  },

  components: {
    button: {
      sizes: {
        sm: { height: '32px', padding: '0 12px', fontSize: '0.875rem' },
        md: { height: '40px', padding: '0 16px', fontSize: '1rem' },
        lg: { height: '48px', padding: '0 24px', fontSize: '1.125rem' },
        xl: { height: '56px', padding: '0 32px', fontSize: '1.25rem' },
      },
      variants: ['primary', 'secondary', 'ghost', 'outline', 'destructive', 'link'],
      iconGap: '8px',
    },
    input: {
      sizes: {
        sm: { height: '32px', padding: '0 12px', fontSize: '0.875rem' },
        md: { height: '40px', padding: '0 16px', fontSize: '1rem' },
        lg: { height: '48px', padding: '0 16px', fontSize: '1.125rem' },
      },
      borderRadius: '8px',
    },
    card: {
      padding: '24px',
      radius: '12px',
      background: 'bg-white/[0.03] backdrop-blur-xl',
      border: 'border border-white/10',
    },
    modal: {
      maxWidth: {
        sm: '400px',
        md: '500px',
        lg: '640px',
        xl: '800px',
        full: '100%',
      },
      padding: '24px',
      radius: '16px',
    },
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    toast: 80,
    maximum: 9999,
  },
};

// ============================================================================
// BRAND INTERPRETATIONS
// ============================================================================

/**
 * Brand keyword to token overrides mapping
 * User says "make it like X" → apply these overrides
 */
export const BRAND_INTERPRETATIONS: Record<string, Partial<DesignTokens>> = {
  // Theme keywords
  dark: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      background: '#09090B',
      surface: '#18181B',
      surfaceElevated: '#27272A',
    },
  },
  light: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      background: '#FFFFFF',
      surface: '#F4F4F5',
      surfaceElevated: '#FFFFFF',
      border: '#E4E4E7',
      borderSubtle: '#F4F4F5',
      text: {
        primary: '#18181B',
        secondary: '#52525B',
        muted: '#A1A1AA',
        disabled: '#D4D4D8',
      },
    },
  },

  // Style keywords
  modern: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#3B82F6',
      primaryHover: '#2563EB',
    },
    radius: {
      ...DEFAULT_TOKENS.radius,
      md: '8px',
      lg: '12px',
    },
  },
  minimal: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#18181B',
      primaryHover: '#27272A',
      background: '#FFFFFF',
      surface: '#FAFAFA',
    },
    spacing: {
      ...DEFAULT_TOKENS.spacing,
      base: 8,
    },
    effects: {
      ...DEFAULT_TOKENS.effects,
      glassmorphism: {
        background: 'rgba(255, 255, 255, 0.8)',
        blur: 'blur(8px)',
        border: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
  playful: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#EC4899',
      primaryHover: '#DB2777',
      accent: '#F59E0B',
    },
    radius: {
      ...DEFAULT_TOKENS.radius,
      md: '16px',
      lg: '24px',
    },
    motion: {
      ...DEFAULT_TOKENS.motion,
      easing: {
        ...DEFAULT_TOKENS.motion.easing,
        default: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  corporate: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#1E40AF',
      primaryHover: '#1E3A8A',
      background: '#F8FAFC',
      surface: '#FFFFFF',
    },
    radius: {
      ...DEFAULT_TOKENS.radius,
      md: '4px',
      lg: '6px',
    },
  },
  elegant: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#1F2937',
      primaryHover: '#111827',
      accent: '#D4AF37',
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontFamily: {
        sans: '"Playfair Display", Georgia, serif',
        mono: '"JetBrains Mono", monospace',
      },
    },
  },

  // Brand-specific keywords
  stripe: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#635BFF',
      primaryHover: '#5851EA',
      primaryLight: '#F0EFFF',
      background: '#0A2540',
      surface: '#132F4C',
      surfaceElevated: '#173A5E',
      text: {
        primary: '#FFFFFF',
        secondary: '#B4C5D6',
        muted: '#8CA1B8',
        disabled: '#5E7A94',
      },
    },
  },
  linear: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#5E6AD2',
      primaryHover: '#4B55B5',
      background: '#000000',
      surface: '#0D0D0D',
      surfaceElevated: '#1A1A1A',
    },
    effects: {
      ...DEFAULT_TOKENS.effects,
      glow: {
        subtle: '0 0 20px rgba(94, 106, 210, 0.2)',
        medium: '0 0 30px rgba(94, 106, 210, 0.3)',
        strong: '0 0 40px rgba(94, 106, 210, 0.4)',
      },
    },
  },
  vercel: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#000000',
      primaryHover: '#171717',
      background: '#000000',
      surface: '#0A0A0A',
      surfaceElevated: '#171717',
      border: '#333333',
      text: {
        primary: '#EDEDED',
        secondary: '#888888',
        muted: '#666666',
        disabled: '#444444',
      },
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontFamily: {
        sans: '"Geist", system-ui, sans-serif',
        mono: '"Geist Mono", monospace',
      },
    },
  },
  apple: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#007AFF',
      primaryHover: '#0066CC',
      background: '#000000',
      surface: '#1C1C1E',
      surfaceElevated: '#2C2C2E',
    },
    radius: {
      ...DEFAULT_TOKENS.radius,
      md: '12px',
      lg: '20px',
      xl: '24px',
    },
    effects: {
      ...DEFAULT_TOKENS.effects,
      glassmorphism: {
        background: 'rgba(255, 255, 255, 0.1)',
        blur: 'blur(20px)',
        border: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  spotify: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#1DB954',
      primaryHover: '#1AA34A',
      background: '#191414',
      surface: '#282828',
      surfaceElevated: '#3E3E3E',
    },
  },
  notion: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#000000',
      primaryHover: '#191919',
      background: '#FFFFFF',
      surface: '#FBFBFB',
      surfaceElevated: '#FFFFFF',
      border: '#E5E5E5',
      text: {
        primary: '#37352F',
        secondary: '#6B6B6B',
        muted: '#9B9A97',
        disabled: '#CFCFCF',
      },
    },
    typography: {
      ...DEFAULT_TOKENS.typography,
      fontFamily: {
        sans: '"Georgia", serif',
        mono: '"SFMono-Regular", monospace',
      },
    },
  },
  github: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#238636',
      primaryHover: '#2EA043',
      background: '#0D1117',
      surface: '#161B22',
      surfaceElevated: '#21262D',
      border: '#30363D',
      text: {
        primary: '#C9D1D9',
        secondary: '#8B949E',
        muted: '#6E7681',
        disabled: '#484F58',
      },
    },
  },
  discord: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#5865F2',
      primaryHover: '#4752C4',
      background: '#36393F',
      surface: '#2F3136',
      surfaceElevated: '#40444B',
    },
  },
  figma: {
    colors: {
      ...DEFAULT_TOKENS.colors,
      primary: '#A259FF',
      primaryHover: '#8B42E8',
      background: '#2C2C2C',
      surface: '#383838',
      surfaceElevated: '#444444',
    },
  },
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Deep merge utility for combining token objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Interpret user's brand/style request and return specific tokens
 */
export function interpretBrand(userRequest: string): BrandInterpretation {
  const request = userRequest.toLowerCase();
  let tokens: DesignTokens = { ...DEFAULT_TOKENS };
  const matchedKeywords: string[] = [];

  // Check for brand/style keywords
  for (const [keyword, overrides] of Object.entries(BRAND_INTERPRETATIONS)) {
    if (request.includes(keyword)) {
      tokens = deepMerge(
        tokens as unknown as Record<string, unknown>,
        overrides as unknown as Partial<Record<string, unknown>>
      ) as unknown as DesignTokens;
      matchedKeywords.push(keyword);
    }
  }

  // Generate reasoning
  let reasoning: string;
  if (matchedKeywords.length > 0) {
    reasoning = `Matched brand/style keywords: ${matchedKeywords.join(', ')}. Applied corresponding token overrides.`;
  } else {
    reasoning =
      'No brand keywords matched. Using default OLYMPUS 50X brand tokens (VIOLET primary, dark glassmorphism theme).';
  }

  return {
    userRequest,
    tokens,
    matchedKeywords,
    reasoning,
  };
}

/**
 * Get design tokens for an agent
 * ALL agents should call this, never hardcode values
 */
export function getDesignTokens(userRequest?: string): DesignTokens {
  if (userRequest) {
    return interpretBrand(userRequest).tokens;
  }
  return DEFAULT_TOKENS;
}

/**
 * Get a specific token value by path
 * Example: getTokenValue('colors.primary') => '#7c3aed'
 */
export function getTokenValue(path: string, tokens?: DesignTokens): string | number | undefined {
  const t = tokens || DEFAULT_TOKENS;
  const parts = path.split('.');
  let current: unknown = t;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return current;
  }
  return undefined;
}

// ============================================================================
// TAILWIND CONFIG GENERATION
// ============================================================================

/**
 * Generate Tailwind theme extension from tokens
 */
export function tokensToTailwindConfig(tokens: DesignTokens): string {
  return `// Auto-generated from OLYMPUS Design Tokens
// DO NOT EDIT DIRECTLY - modify design-token-provider.ts instead

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${tokens.colors.primary}',
          hover: '${tokens.colors.primaryHover}',
          light: '${tokens.colors.primaryLight}',
        },
        secondary: '${tokens.colors.secondary}',
        accent: '${tokens.colors.accent}',
        background: '${tokens.colors.background}',
        surface: {
          DEFAULT: '${tokens.colors.surface}',
          elevated: '${tokens.colors.surfaceElevated}',
        },
        border: {
          DEFAULT: '${tokens.colors.border}',
          subtle: '${tokens.colors.borderSubtle}',
          focus: '${tokens.colors.borderFocus}',
        },
        text: {
          primary: '${tokens.colors.text.primary}',
          secondary: '${tokens.colors.text.secondary}',
          muted: '${tokens.colors.text.muted}',
          disabled: '${tokens.colors.text.disabled}',
        },
        success: {
          DEFAULT: '${tokens.colors.semantic.success}',
          muted: '${tokens.colors.semantic.successMuted}',
        },
        warning: {
          DEFAULT: '${tokens.colors.semantic.warning}',
          muted: '${tokens.colors.semantic.warningMuted}',
        },
        error: {
          DEFAULT: '${tokens.colors.semantic.error}',
          muted: '${tokens.colors.semantic.errorMuted}',
        },
        info: {
          DEFAULT: '${tokens.colors.semantic.info}',
          muted: '${tokens.colors.semantic.infoMuted}',
        },
      },
      fontFamily: {
        sans: ['${tokens.typography.fontFamily.sans.split(',')[0].replace(/"/g, '')}', 'system-ui', 'sans-serif'],
        mono: ['${tokens.typography.fontFamily.mono.split(',')[0].replace(/"/g, '')}', 'monospace'],
      },
      borderRadius: {
        none: '${tokens.radius.none}',
        sm: '${tokens.radius.sm}',
        DEFAULT: '${tokens.radius.md}',
        md: '${tokens.radius.md}',
        lg: '${tokens.radius.lg}',
        xl: '${tokens.radius.xl}',
        '2xl': '${tokens.radius['2xl']}',
        full: '${tokens.radius.full}',
      },
      boxShadow: {
        none: '${tokens.shadows.none}',
        sm: '${tokens.shadows.sm}',
        DEFAULT: '${tokens.shadows.md}',
        md: '${tokens.shadows.md}',
        lg: '${tokens.shadows.lg}',
        xl: '${tokens.shadows.xl}',
        glow: '${tokens.shadows.glow}',
        'glow-strong': '${tokens.shadows.glowStrong}',
      },
      transitionDuration: {
        instant: '${tokens.motion.duration.instant}',
        fast: '${tokens.motion.duration.fast}',
        DEFAULT: '${tokens.motion.duration.normal}',
        normal: '${tokens.motion.duration.normal}',
        slow: '${tokens.motion.duration.slow}',
        slower: '${tokens.motion.duration.slower}',
      },
      transitionTimingFunction: {
        DEFAULT: '${tokens.motion.easing.default}',
        in: '${tokens.motion.easing.in}',
        out: '${tokens.motion.easing.out}',
        'in-out': '${tokens.motion.easing.inOut}',
        spring: '${tokens.motion.easing.spring}',
      },
      zIndex: {
        hide: '${tokens.zIndex.hide}',
        base: '${tokens.zIndex.base}',
        dropdown: '${tokens.zIndex.dropdown}',
        sticky: '${tokens.zIndex.sticky}',
        fixed: '${tokens.zIndex.fixed}',
        'modal-backdrop': '${tokens.zIndex.modalBackdrop}',
        modal: '${tokens.zIndex.modal}',
        popover: '${tokens.zIndex.popover}',
        tooltip: '${tokens.zIndex.tooltip}',
        toast: '${tokens.zIndex.toast}',
        maximum: '${tokens.zIndex.maximum}',
      },
    },
  },
};`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { deepMerge };

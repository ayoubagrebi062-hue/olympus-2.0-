/**
 * OLYMPUS 50X Design System
 *
 * Complete design token system for WORLD-CLASS quality.
 * Brand: VIOLET primary (#7c3aed) - NOT generic blue.
 * Theme: Dark with glassmorphism effects.
 * Philosophy: 50X better than competitors.
 *
 * EVERY frontend agent MUST use these tokens - NO EXCEPTIONS.
 * Generic AI colors (blue-500) are FORBIDDEN.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Brand Colors (VIOLET - 50X Identity)
  brand: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // ACCENT
    600: '#7c3aed', // PRIMARY - Main CTA color
    700: '#6d28d9', // HOVER
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // Backgrounds (Dark Theme - Primary)
  background: {
    primary: '#0A0A0B', // Main background
    surface: '#141416', // Cards, panels
    elevated: '#1C1C1F', // Modals, dropdowns
    hover: '#27272A', // Hover states
  },

  // Text colors (Dark Theme)
  text: {
    primary: '#FAFAFA', // Main text
    secondary: '#A1A1AA', // Secondary text
    muted: '#71717A', // Placeholder, hints
    disabled: '#52525B', // Disabled text
  },

  // Borders (Dark Theme)
  border: {
    default: '#27272A', // Dividers, borders
    subtle: '#3F3F46', // Subtle borders
    focus: '#7c3aed', // Focus state (violet)
    error: '#EF4444', // Error state
    glass: 'rgba(255, 255, 255, 0.1)', // Glass border
  },

  // Semantic colors
  semantic: {
    success: '#22C55E', // Positive actions
    warning: '#F59E0B', // Caution
    error: '#EF4444', // Errors
    info: '#3B82F6', // Information
  },

  // Accent colors (For visual interest)
  accent: {
    purple: '#8B5CF6', // Premium, special
    cyan: '#06B6D4', // Tech, innovation
    pink: '#EC4899', // Highlights, badges
    orange: '#F97316', // Energy, urgency
  },

  // Light Theme (Secondary)
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F5',
    elevated: '#FFFFFF',
    border: '#E4E4E7',
    textPrimary: '#18181B',
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },

  // Font sizes (Mobile-First)
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
    '7xl': '4.5rem', // 72px - Hero
  },

  // Font weights
  fontWeight: {
    regular: '400', // Body text
    medium: '500', // UI labels, buttons
    semibold: '600', // Headings, emphasis
    bold: '700', // Strong emphasis, titles
  },

  // Line heights
  lineHeight: {
    tight: '1.25', // Headings
    normal: '1.5', // Body text
    relaxed: '1.75', // Long-form content
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  // Base unit: 4px
  base: 4,

  // Spacing scale
  scale: {
    0: '0px',
    1: '0.25rem', // 4px - Tight elements
    2: '0.5rem', // 8px - Related items
    3: '0.75rem', // 12px - Form fields
    4: '1rem', // 16px - Default gap
    5: '1.25rem', // 20px - Card padding
    6: '1.5rem', // 24px - Section gap
    8: '2rem', // 32px - Large spacing
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px - Section padding
    20: '5rem', // 80px
    24: '6rem', // 96px - Hero padding
  },

  // Component-specific
  component: {
    buttonPaddingX: '1rem', // px-4
    buttonPaddingY: '0.625rem', // py-2.5
    cardPadding: '1.5rem', // p-6
    inputPadding: '0.75rem', // p-3
    sectionPadding: '4rem', // py-16
    heroSpacing: '6rem', // py-24
  },

  // Gap recommendations
  gap: {
    tight: '0.5rem', // gap-2 (8px)
    normal: '1rem', // gap-4 (16px)
    loose: '1.5rem', // gap-6 (24px)
    wide: '2rem', // gap-8 (32px)
  },
} as const;

// ============================================
// EFFECTS
// ============================================

export const effects = {
  // Glassmorphism
  glass: {
    background: 'rgba(20, 20, 22, 0.8)', // Surface with transparency
    backdropBlur: 'blur(12px)',
    border: 'rgba(255, 255, 255, 0.1)',
  },

  // Glow effects (VIOLET - not blue!)
  glow: {
    brand: '0 0 40px rgba(124, 58, 237, 0.3)',
    brandSubtle: '0 0 20px rgba(124, 58, 237, 0.2)',
    brandStrong: '0 0 60px rgba(124, 58, 237, 0.4)',
  },

  // Gradients (VIOLET-based - 50X identity)
  gradient: {
    hero: 'linear-gradient(135deg, #7c3aed 0%, #8B5CF6 50%, #EC4899 100%)',
    card: 'linear-gradient(180deg, #141416 0%, #0A0A0B 100%)',
    accent: 'linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%)',
    button: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    premium: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    text: 'linear-gradient(135deg, #a78bfa 0%, #8B5CF6 50%, #c4b5fd 100%)',
  },

  // Shadows (VIOLET glow - 50X signature)
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.3)',
    glow: '0 0 40px rgba(124, 58, 237, 0.25)',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },
} as const;

// ============================================
// ANIMATIONS & TRANSITIONS
// ============================================

export const motion = {
  // Duration
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Common transitions
  transition: {
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color, background-color, border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================
// TAILWIND CLASS HELPERS (50X QUALITY)
// ============================================

export const tailwind = {
  // Glass card (signature 50X look)
  glassCard: 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl',
  glassCardHover:
    'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200',
  glassCardInteractive:
    'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl hover:border-violet-500/50 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-all duration-300 cursor-pointer',

  // Buttons (50X with glow and lift)
  buttonBase:
    'px-6 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.98]',
  buttonPrimary:
    'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5',
  buttonSecondary:
    'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/20',
  buttonGhost: 'text-white/70 hover:text-white hover:bg-white/5',
  buttonGradient:
    'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:-translate-y-0.5',
  buttonOutline:
    'border border-violet-500/50 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500',

  // Inputs (violet focus)
  inputBase:
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200',

  // Text
  textPrimary: 'text-white',
  textSecondary: 'text-white/70',
  textMuted: 'text-white/50',

  // Headlines (50X typography scale)
  hero: 'text-6xl md:text-7xl font-bold tracking-tight text-white',
  displayText: 'text-5xl md:text-6xl font-bold tracking-tight text-white',
  h1: 'text-4xl md:text-5xl font-bold tracking-tight text-white',
  h2: 'text-3xl md:text-4xl font-bold text-white',
  h3: 'text-2xl md:text-3xl font-semibold text-white',
  h4: 'text-xl md:text-2xl font-semibold text-white',

  // Gradient text (brand signature)
  gradientText:
    'bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent',

  // Layout
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  sectionPadding: 'py-20 lg:py-32',
  stack: 'flex flex-col gap-4',
  row: 'flex flex-row items-center gap-2',

  // Effects (violet glow - NOT blue)
  glow: 'shadow-[0_0_40px_rgba(124,58,237,0.3)]',
  glowSubtle: 'shadow-[0_0_20px_rgba(124,58,237,0.2)]',
  glowStrong: 'shadow-[0_0_60px_rgba(124,58,237,0.4)]',

  // Focus states (violet)
  focusRing:
    'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900',

  // Badges
  badge:
    'px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-sm font-medium',
  badgeSuccess:
    'px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-sm font-medium',
  badgeWarning:
    'px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-sm font-medium',
  badgeError:
    'px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-sm font-medium',

  // Animation classes (REQUIRED for 50X)
  fadeIn: 'animate-in fade-in duration-500',
  fadeInUp: 'animate-in fade-in slide-in-from-bottom-4 duration-500',
  scaleIn: 'animate-in zoom-in-95 duration-300',
  hoverLift: 'hover:-translate-y-1 transition-transform duration-200',
  hoverGlow: 'hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-shadow duration-300',
} as const;

// ============================================
// COMPONENT TOKENS
// ============================================

export const components = {
  button: {
    sizes: {
      sm: { height: '32px', padding: '0 12px', fontSize: '14px' },
      md: { height: '40px', padding: '0 16px', fontSize: '14px' },
      lg: { height: '48px', padding: '0 24px', fontSize: '16px' },
      xl: { height: '56px', padding: '0 32px', fontSize: '18px' },
    },
    variants: {
      primary: {
        background: colors.brand[500],
        color: '#ffffff',
        hoverBackground: colors.brand[600],
        activeBackground: colors.brand[700],
      },
      secondary: {
        background: colors.background.surface,
        color: colors.text.primary,
        border: colors.border.default,
        hoverBackground: colors.background.hover,
      },
      ghost: {
        background: 'transparent',
        color: colors.text.secondary,
        hoverColor: colors.text.primary,
        hoverBackground: colors.background.surface,
      },
      gradient: {
        background: effects.gradient.button,
        color: '#ffffff',
      },
    },
  },

  card: {
    background: colors.background.surface,
    border: colors.border.default,
    borderRadius: '12px',
    padding: '24px',
    hoverBorder: colors.border.subtle,
  },

  input: {
    background: colors.background.primary,
    border: colors.border.default,
    borderRadius: '8px',
    padding: '12px 16px',
    focusBorder: colors.brand[500],
    focusRing: 'rgba(124, 58, 237, 0.3)', // VIOLET focus ring
    placeholder: colors.text.muted,
    error: colors.semantic.error,
  },

  modal: {
    overlay: 'rgba(0, 0, 0, 0.8)',
    background: colors.background.elevated,
    border: colors.border.default,
    borderRadius: '16px',
    maxWidth: '500px',
  },

  badge: {
    variants: {
      default: { background: colors.background.surface, color: colors.text.secondary },
      primary: { background: colors.brand[500] + '20', color: colors.brand[400] },
      success: { background: colors.semantic.success + '20', color: colors.semantic.success },
      warning: { background: colors.semantic.warning + '20', color: colors.semantic.warning },
      error: { background: colors.semantic.error + '20', color: colors.semantic.error },
    },
  },
} as const;

// ============================================
// CSS CUSTOM PROPERTIES GENERATOR
// ============================================

export function generateCSSVariables(): string {
  return `
:root {
  /* Brand */
  --brand-primary: ${colors.brand[500]};
  --brand-hover: ${colors.brand[600]};
  --brand-active: ${colors.brand[700]};

  /* Backgrounds (Dark) */
  --bg-primary: ${colors.background.primary};
  --bg-surface: ${colors.background.surface};
  --bg-elevated: ${colors.background.elevated};
  --bg-hover: ${colors.background.hover};

  /* Text */
  --text-primary: ${colors.text.primary};
  --text-secondary: ${colors.text.secondary};
  --text-muted: ${colors.text.muted};

  /* Borders */
  --border-default: ${colors.border.default};
  --border-subtle: ${colors.border.subtle};
  --border-focus: ${colors.border.focus};

  /* Semantic */
  --color-success: ${colors.semantic.success};
  --color-warning: ${colors.semantic.warning};
  --color-error: ${colors.semantic.error};
  --color-info: ${colors.semantic.info};

  /* Effects */
  --glow-brand: ${effects.glow.brand};
  --gradient-hero: ${effects.gradient.hero};

  /* Motion */
  --duration-fast: ${motion.duration.fast};
  --duration-normal: ${motion.duration.normal};
  --easing-default: ${motion.easing.default};

  /* Typography */
  --font-sans: ${typography.fontFamily.sans};
  --font-mono: ${typography.fontFamily.mono};
}
`;
}

// ============================================
// FORBIDDEN PATTERNS (Quality Gate Violations)
// ============================================

export const forbidden = {
  // Colors that indicate generic AI output
  colors: [
    'bg-blue-500', // Generic AI blue
    'bg-blue-600',
    'text-blue-500',
    'border-blue-500',
    'ring-blue-500',
    'bg-gray-500', // Generic gray
    'bg-gray-600',
    'bg-gray-700',
  ],

  // Patterns that indicate low quality
  patterns: [
    'href="#"', // Dead links
    'href=""', // Empty links
    'onClick={() => {}}', // Empty handlers
    'onClick={() => console.log', // Debug handlers
    'console.log(', // Debug statements in production
    'alert(', // Alert popups
    'TODO:', // Unfinished code
    'FIXME:', // Broken code
  ],

  // Missing requirements
  missing: {
    buttons: 'Every <button> must have onClick handler',
    transitions: 'Every hover: must have transition-',
    animations: 'Components must have animate- or transition-',
    loading: 'Async buttons must have loading state',
  },
} as const;

// ============================================
// DESIGN SYSTEM EXPORT
// ============================================

export const designSystem = {
  colors,
  typography,
  spacing,
  effects,
  motion,
  tailwind,
  components,
  forbidden,
  generateCSSVariables,
} as const;

export default designSystem;

// Re-export for easy access
export const OLYMPUS_DESIGN_SYSTEM = designSystem;

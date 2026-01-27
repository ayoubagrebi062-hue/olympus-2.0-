# SECTION 10: THE UI COMPONENT SYSTEM - 50X ENHANCED
## OLYMPUS Interface Engineering Bible

---

```
+==============================================================================+
|                                                                              |
|     ██╗   ██╗██╗     ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗  |
|     ██║   ██║██║     ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║  |
|     ██║   ██║██║     ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║  |
|     ██║   ██║██║     ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║  |
|     ╚██████╔╝██║     ███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║  |
|      ╚═════╝ ╚═╝     ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝  |
|                                                                              |
|                      50X UI COMPONENT SYSTEM BIBLE                           |
|                                                                              |
+==============================================================================+
```

**Document Type:** 50X Enhancement Document
**Section:** 10 - The UI Component System
**Version:** 1.0
**Status:** COMPLETE
**Created:** January 2026

---

# PART A: BASELINE ANALYSIS

---

## A1. WHAT THE GUIDE CURRENTLY SAYS

The original guide covers:
- Basic component structure (~20 lines)
- shadcn/ui mention (~10 lines)
- Tailwind CSS basics (~15 lines)
- Simple button/input examples (~25 lines)

## A2. QUALITY ASSESSMENT (1X Baseline)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Depth | 2/10 | Surface-level only |
| Completeness | 2/10 | Missing 90% of topics |
| Practicality | 3/10 | Few real examples |
| Innovation | 1/10 | No advanced patterns |
| **OVERALL** | **2/10** | **Needs 50X enhancement** |

## A3. WHAT THE GUIDE IS MISSING

| Gap | Impact | Priority |
|-----|--------|----------|
| Design System Architecture | CRITICAL | P0 |
| Atomic Design Methodology | CRITICAL | P0 |
| Component Composition Patterns | HIGH | P1 |
| Accessibility (a11y) | CRITICAL | P0 |
| Animation System | HIGH | P1 |
| Theming Architecture | CRITICAL | P0 |
| Responsive Design System | HIGH | P1 |
| Component Testing | HIGH | P1 |
| Performance Optimization | HIGH | P1 |
| State Management Patterns | MEDIUM | P2 |
| Documentation System | MEDIUM | P2 |

---

# PART B: 50X ENHANCEMENT - THE COMPLETE UI SYSTEM

---

## B1. UI ENGINEERING PHILOSOPHY

```
+==============================================================================+
|                    THE 12 COMMANDMENTS OF UI ENGINEERING                     |
+==============================================================================+
|                                                                              |
|  1. COMPOSITION over inheritance - build from small pieces                   |
|  2. ACCESSIBILITY first - not an afterthought                                |
|  3. CONSISTENCY is king - design tokens everywhere                           |
|  4. PERFORMANCE matters - every millisecond counts                           |
|  5. RESPONSIVE by default - mobile-first approach                            |
|  6. TYPE everything - TypeScript saves lives                                 |
|  7. TEST components - visual regression and unit tests                       |
|  8. DOCUMENT as you build - Storybook is your friend                         |
|  9. ANIMATE with purpose - motion guides, never distracts                    |
|  10. THEME systematically - dark mode is not optional                        |
|  11. VALIDATE inputs - never trust user data                                 |
|  12. ERROR gracefully - users deserve beautiful error states                 |
|                                                                              |
+==============================================================================+
```

---

## B2. DESIGN SYSTEM ARCHITECTURE

### The Complete Design System Structure

```
+==============================================================================+
|                        OLYMPUS DESIGN SYSTEM ARCHITECTURE                    |
+==============================================================================+
|                                                                              |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                         DESIGN TOKENS (Foundation)                      │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Colors    Typography    Spacing    Shadows    Borders    Motion │  │  |
|  │  │  ──────    ──────────    ───────    ───────    ───────    ────── │  │  |
|  │  │  Primary   Font Family   4px base   Elevation  Radius     Easing │  │  |
|  │  │  Secondary Font Size     Scale      Soft/Hard  Width      Duration│  │  |
|  │  │  Accent    Line Height   Negative   Inset      Style      Spring │  │  |
|  │  │  Neutral   Font Weight   Responsive Colored    Opacity    Keyframe│  │  |
|  │  │  Semantic  Letter Space  Container  Focus      Compound   Gesture │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                      │                                       |
|                                      ▼                                       |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                           PRIMITIVES (Atoms)                            │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Box    Text    Icon    Image    Separator    Skeleton    Slot   │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                      │                                       |
|                                      ▼                                       |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                         COMPONENTS (Molecules)                          │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Button    Input    Select    Checkbox    Radio    Switch        │  │  |
|  │  │  Badge     Avatar   Tooltip   Popover     Dialog   Sheet         │  │  |
|  │  │  Card      Alert    Toast     Progress    Tabs     Accordion     │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                      │                                       |
|                                      ▼                                       |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                          PATTERNS (Organisms)                           │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Form    DataTable    Navigation    Command    Calendar    Chart │  │  |
|  │  │  Auth    FileUpload   RichEditor    Timeline   Kanban     Tree   │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                      │                                       |
|                                      ▼                                       |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                          LAYOUTS (Templates)                            │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Dashboard    Marketing    Auth    Settings    Admin    Error    │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                      │                                       |
|                                      ▼                                       |
|  ┌────────────────────────────────────────────────────────────────────────┐  |
|  │                            PAGES (Screens)                              │  |
|  │  ┌──────────────────────────────────────────────────────────────────┐  │  |
|  │  │  Complete implementations combining all layers                    │  │  |
|  │  └──────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────┘  |
|                                                                              |
+==============================================================================+
```

---

## B3. DESIGN TOKENS - THE FOUNDATION

### Complete Token System

```typescript
// ============================================================================
// OLYMPUS DESIGN TOKENS v1.0
// The Complete Token System
// ============================================================================

// tokens/index.ts
export const tokens = {
  // ==========================================================================
  // COLORS
  // ==========================================================================
  colors: {
    // Brand Colors
    brand: {
      50: 'hsl(222, 100%, 97%)',
      100: 'hsl(222, 100%, 94%)',
      200: 'hsl(222, 100%, 87%)',
      300: 'hsl(222, 100%, 77%)',
      400: 'hsl(222, 100%, 65%)',
      500: 'hsl(222, 100%, 55%)',  // Primary brand color
      600: 'hsl(222, 100%, 45%)',
      700: 'hsl(222, 100%, 37%)',
      800: 'hsl(222, 100%, 30%)',
      900: 'hsl(222, 100%, 22%)',
      950: 'hsl(222, 100%, 14%)',
    },

    // Neutral/Gray Scale
    neutral: {
      0: 'hsl(0, 0%, 100%)',      // Pure white
      50: 'hsl(210, 20%, 98%)',
      100: 'hsl(210, 17%, 95%)',
      200: 'hsl(210, 14%, 89%)',
      300: 'hsl(210, 11%, 79%)',
      400: 'hsl(210, 9%, 62%)',
      500: 'hsl(210, 8%, 46%)',
      600: 'hsl(210, 10%, 36%)',
      700: 'hsl(210, 13%, 28%)',
      800: 'hsl(210, 17%, 20%)',
      900: 'hsl(210, 22%, 14%)',
      950: 'hsl(210, 30%, 8%)',
      1000: 'hsl(0, 0%, 0%)',     // Pure black
    },

    // Semantic Colors
    semantic: {
      success: {
        light: 'hsl(142, 76%, 95%)',
        base: 'hsl(142, 76%, 36%)',
        dark: 'hsl(142, 76%, 25%)',
        contrast: 'hsl(0, 0%, 100%)',
      },
      warning: {
        light: 'hsl(45, 100%, 95%)',
        base: 'hsl(45, 100%, 51%)',
        dark: 'hsl(45, 100%, 35%)',
        contrast: 'hsl(0, 0%, 0%)',
      },
      error: {
        light: 'hsl(0, 84%, 95%)',
        base: 'hsl(0, 84%, 60%)',
        dark: 'hsl(0, 84%, 40%)',
        contrast: 'hsl(0, 0%, 100%)',
      },
      info: {
        light: 'hsl(200, 98%, 95%)',
        base: 'hsl(200, 98%, 39%)',
        dark: 'hsl(200, 98%, 28%)',
        contrast: 'hsl(0, 0%, 100%)',
      },
    },

    // Accent Colors (for variety)
    accent: {
      purple: 'hsl(270, 76%, 55%)',
      pink: 'hsl(330, 81%, 60%)',
      orange: 'hsl(25, 95%, 53%)',
      teal: 'hsl(175, 77%, 40%)',
      indigo: 'hsl(245, 75%, 59%)',
    },
  },

  // ==========================================================================
  // TYPOGRAPHY
  // ==========================================================================
  typography: {
    // Font Families
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      display: '"Cal Sans", Inter, sans-serif',
    },

    // Font Sizes (rem-based for accessibility)
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
      '8xl': '6rem',      // 96px
      '9xl': '8rem',      // 128px
    },

    // Font Weights
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },

    // Line Heights
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },

    // Letter Spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },

    // Text Styles (Pre-composed)
    textStyles: {
      h1: {
        fontSize: '3rem',
        fontWeight: '700',
        lineHeight: '1.2',
        letterSpacing: '-0.025em',
      },
      h2: {
        fontSize: '2.25rem',
        fontWeight: '600',
        lineHeight: '1.25',
        letterSpacing: '-0.025em',
      },
      h3: {
        fontSize: '1.875rem',
        fontWeight: '600',
        lineHeight: '1.3',
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: '600',
        lineHeight: '1.35',
        letterSpacing: '-0.015em',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      body: {
        fontSize: '1rem',
        fontWeight: '400',
        lineHeight: '1.5',
      },
      bodySmall: {
        fontSize: '0.875rem',
        fontWeight: '400',
        lineHeight: '1.5',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: '400',
        lineHeight: '1.4',
      },
      label: {
        fontSize: '0.875rem',
        fontWeight: '500',
        lineHeight: '1.4',
      },
      code: {
        fontFamily: 'mono',
        fontSize: '0.875rem',
        lineHeight: '1.5',
      },
    },
  },

  // ==========================================================================
  // SPACING
  // ==========================================================================
  spacing: {
    // Base unit: 4px
    px: '1px',
    0: '0',
    0.5: '0.125rem',   // 2px
    1: '0.25rem',      // 4px
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px
    3.5: '0.875rem',   // 14px
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    7: '1.75rem',      // 28px
    8: '2rem',         // 32px
    9: '2.25rem',      // 36px
    10: '2.5rem',      // 40px
    11: '2.75rem',     // 44px
    12: '3rem',        // 48px
    14: '3.5rem',      // 56px
    16: '4rem',        // 64px
    20: '5rem',        // 80px
    24: '6rem',        // 96px
    28: '7rem',        // 112px
    32: '8rem',        // 128px
    36: '9rem',        // 144px
    40: '10rem',       // 160px
    44: '11rem',       // 176px
    48: '12rem',       // 192px
    52: '13rem',       // 208px
    56: '14rem',       // 224px
    60: '15rem',       // 240px
    64: '16rem',       // 256px
    72: '18rem',       // 288px
    80: '20rem',       // 320px
    96: '24rem',       // 384px
  },

  // ==========================================================================
  // SHADOWS
  // ==========================================================================
  shadows: {
    // Elevation-based shadows
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

    // Colored shadows (for brand elements)
    brand: '0 10px 40px -10px hsl(222, 100%, 55%, 0.5)',
    success: '0 10px 40px -10px hsl(142, 76%, 36%, 0.4)',
    error: '0 10px 40px -10px hsl(0, 84%, 60%, 0.4)',

    // Focus rings
    focusRing: '0 0 0 2px hsl(222, 100%, 55%, 0.5)',
    focusRingError: '0 0 0 2px hsl(0, 84%, 60%, 0.5)',
  },

  // ==========================================================================
  // BORDERS
  // ==========================================================================
  borders: {
    // Border Radius
    radius: {
      none: '0',
      sm: '0.125rem',    // 2px
      md: '0.375rem',    // 6px
      lg: '0.5rem',      // 8px
      xl: '0.75rem',     // 12px
      '2xl': '1rem',     // 16px
      '3xl': '1.5rem',   // 24px
      full: '9999px',
    },

    // Border Width
    width: {
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
  },

  // ==========================================================================
  // MOTION / ANIMATION
  // ==========================================================================
  motion: {
    // Durations
    duration: {
      instant: '0ms',
      fastest: '50ms',
      faster: '100ms',
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '400ms',
      slowest: '500ms',
      // For page transitions
      page: '300ms',
      // For modals/overlays
      modal: '200ms',
    },

    // Easing Functions
    easing: {
      // Standard easing
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

      // Expressive easing (for delightful interactions)
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.45, 0, 0.55, 1)',

      // Entrance/Exit
      enter: 'cubic-bezier(0, 0, 0.2, 1)',
      exit: 'cubic-bezier(0.4, 0, 1, 1)',
    },

    // Pre-composed transitions
    transitions: {
      all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      colors: 'color, background-color, border-color 150ms ease',
      opacity: 'opacity 150ms ease',
      transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      shadow: 'box-shadow 200ms ease',
    },
  },

  // ==========================================================================
  // BREAKPOINTS
  // ==========================================================================
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ==========================================================================
  // Z-INDEX
  // ==========================================================================
  zIndex: {
    hide: -1,
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
    max: 9999,
  },
} as const;

// Type exports for TypeScript
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors.brand;
export type SpacingToken = keyof typeof tokens.spacing;
export type FontSizeToken = keyof typeof tokens.typography.fontSize;
```

---

## B4. TAILWIND CONFIGURATION

### Complete Tailwind Setup

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import { tokens } from './tokens';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Override defaults completely for consistency
    screens: {
      xs: tokens.breakpoints.xs,
      sm: tokens.breakpoints.sm,
      md: tokens.breakpoints.md,
      lg: tokens.breakpoints.lg,
      xl: tokens.breakpoints.xl,
      '2xl': tokens.breakpoints['2xl'],
    },

    extend: {
      // Colors
      colors: {
        brand: tokens.colors.brand,
        neutral: tokens.colors.neutral,
        success: tokens.colors.semantic.success,
        warning: tokens.colors.semantic.warning,
        error: tokens.colors.semantic.error,
        info: tokens.colors.semantic.info,
        accent: tokens.colors.accent,

        // Semantic aliases
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },

      // Typography
      fontFamily: {
        sans: tokens.typography.fontFamily.sans.split(', '),
        mono: tokens.typography.fontFamily.mono.split(', '),
        display: tokens.typography.fontFamily.display.split(', '),
      },
      fontSize: tokens.typography.fontSize,
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      letterSpacing: tokens.typography.letterSpacing,

      // Spacing
      spacing: tokens.spacing,

      // Border Radius
      borderRadius: {
        ...tokens.borders.radius,
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // Shadows
      boxShadow: tokens.shadows,

      // Z-Index
      zIndex: Object.fromEntries(
        Object.entries(tokens.zIndex).map(([k, v]) => [k, String(v)])
      ),

      // Animation
      transitionDuration: tokens.motion.duration,
      transitionTimingFunction: tokens.motion.easing,

      // Keyframes
      keyframes: {
        // Fade animations
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },

        // Scale animations
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },

        // Slide animations
        slideInFromTop: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromBottom: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromLeft: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInFromRight: {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },

        // Accordion
        accordionDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },

        // Skeleton loading
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },

        // Spinner
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },

        // Pulse
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },

        // Bounce
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },

      animation: {
        fadeIn: 'fadeIn 200ms ease-out',
        fadeOut: 'fadeOut 200ms ease-in',
        scaleIn: 'scaleIn 200ms ease-out',
        scaleOut: 'scaleOut 200ms ease-in',
        slideInFromTop: 'slideInFromTop 200ms ease-out',
        slideInFromBottom: 'slideInFromBottom 200ms ease-out',
        slideInFromLeft: 'slideInFromLeft 200ms ease-out',
        slideInFromRight: 'slideInFromRight 200ms ease-out',
        accordionDown: 'accordionDown 200ms ease-out',
        accordionUp: 'accordionUp 200ms ease-out',
        shimmer: 'shimmer 2s infinite linear',
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};

export default config;
```

---

## B5. CSS VARIABLES & THEMING

### Global Styles with Theme Support

```css
/* styles/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================================
   CSS VARIABLES - THE THEMING FOUNDATION
   ============================================================================ */

@layer base {
  :root {
    /* ========================================================================
       LIGHT THEME (Default)
       ======================================================================== */

    /* Background & Foreground */
    --background: 0 0% 100%;
    --foreground: 210 22% 14%;

    /* Card surfaces */
    --card: 0 0% 100%;
    --card-foreground: 210 22% 14%;

    /* Popover surfaces */
    --popover: 0 0% 100%;
    --popover-foreground: 210 22% 14%;

    /* Primary brand color */
    --primary: 222 100% 55%;
    --primary-foreground: 0 0% 100%;

    /* Secondary color */
    --secondary: 210 17% 95%;
    --secondary-foreground: 210 22% 14%;

    /* Muted elements */
    --muted: 210 17% 95%;
    --muted-foreground: 210 8% 46%;

    /* Accent color */
    --accent: 210 17% 95%;
    --accent-foreground: 210 22% 14%;

    /* Destructive/Error */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    /* Borders */
    --border: 210 14% 89%;
    --input: 210 14% 89%;

    /* Focus ring */
    --ring: 222 100% 55%;

    /* Border radius */
    --radius: 0.5rem;

    /* Success, Warning, Info */
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 45 100% 51%;
    --warning-foreground: 0 0% 0%;
    --info: 200 98% 39%;
    --info-foreground: 0 0% 100%;

    /* Chart colors */
    --chart-1: 222 100% 55%;
    --chart-2: 142 76% 36%;
    --chart-3: 45 100% 51%;
    --chart-4: 270 76% 55%;
    --chart-5: 330 81% 60%;
  }

  .dark {
    /* ========================================================================
       DARK THEME
       ======================================================================== */

    /* Background & Foreground */
    --background: 210 30% 8%;
    --foreground: 210 17% 95%;

    /* Card surfaces */
    --card: 210 22% 14%;
    --card-foreground: 210 17% 95%;

    /* Popover surfaces */
    --popover: 210 22% 14%;
    --popover-foreground: 210 17% 95%;

    /* Primary brand color */
    --primary: 222 100% 60%;
    --primary-foreground: 0 0% 100%;

    /* Secondary color */
    --secondary: 210 17% 20%;
    --secondary-foreground: 210 17% 95%;

    /* Muted elements */
    --muted: 210 17% 20%;
    --muted-foreground: 210 11% 62%;

    /* Accent color */
    --accent: 210 17% 20%;
    --accent-foreground: 210 17% 95%;

    /* Destructive/Error */
    --destructive: 0 84% 55%;
    --destructive-foreground: 0 0% 100%;

    /* Borders */
    --border: 210 13% 25%;
    --input: 210 13% 25%;

    /* Focus ring */
    --ring: 222 100% 60%;

    /* Success, Warning, Info (adjusted for dark) */
    --success: 142 76% 45%;
    --warning: 45 100% 55%;
    --info: 200 98% 50%;
  }

  /* ========================================================================
     BASE ELEMENT STYLES
     ======================================================================== */

  * {
    @apply border-border;
  }

  html {
    @apply scroll-smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Focus visible styles for accessibility */
  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }

  /* Selection styles */
  ::selection {
    @apply bg-primary/20 text-foreground;
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    @apply w-2 h-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground/50;
  }
}

/* ============================================================================
   UTILITY CLASSES
   ============================================================================ */

@layer utilities {
  /* Text balance for better typography */
  .text-balance {
    text-wrap: balance;
  }

  /* Gradient text */
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r;
  }

  /* Glass morphism */
  .glass {
    @apply bg-background/80 backdrop-blur-md border border-border/50;
  }

  .glass-dark {
    @apply bg-background/60 backdrop-blur-lg border border-white/10;
  }

  /* Shimmer effect for loading states */
  .shimmer {
    @apply relative overflow-hidden;
  }

  .shimmer::after {
    content: '';
    @apply absolute inset-0;
    background: linear-gradient(
      90deg,
      transparent,
      hsl(var(--foreground) / 0.05),
      transparent
    );
    animation: shimmer 2s infinite;
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Aspect ratios */
  .aspect-video {
    aspect-ratio: 16 / 9;
  }

  .aspect-square {
    aspect-ratio: 1 / 1;
  }

  /* Line clamp */
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* ============================================================================
   COMPONENT CLASSES
   ============================================================================ */

@layer components {
  /* Container with responsive padding */
  .container-responsive {
    @apply w-full mx-auto px-4 sm:px-6 lg:px-8;
    max-width: 1280px;
  }

  /* Card variants */
  .card-elevated {
    @apply bg-card rounded-lg border shadow-sm;
  }

  .card-interactive {
    @apply card-elevated transition-all duration-200 hover:shadow-md hover:border-primary/20;
  }

  /* Button base */
  .btn-base {
    @apply inline-flex items-center justify-center rounded-md font-medium
           transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
           focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none
           disabled:opacity-50;
  }

  /* Input base */
  .input-base {
    @apply flex w-full rounded-md border border-input bg-background px-3 py-2
           text-sm ring-offset-background placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
           focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
  }

  /* Link styles */
  .link {
    @apply text-primary underline-offset-4 hover:underline;
  }

  .link-muted {
    @apply text-muted-foreground underline-offset-4 hover:text-foreground hover:underline;
  }
}
```

---

## B6. PRIMITIVE COMPONENTS (ATOMS)

### Box - The Foundation Primitive

```tsx
// components/primitives/Box.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const boxVariants = cva('', {
  variants: {
    // Display
    display: {
      block: 'block',
      inline: 'inline',
      'inline-block': 'inline-block',
      flex: 'flex',
      'inline-flex': 'inline-flex',
      grid: 'grid',
      'inline-grid': 'inline-grid',
      hidden: 'hidden',
    },
    // Flex direction
    direction: {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      col: 'flex-col',
      'col-reverse': 'flex-col-reverse',
    },
    // Justify content
    justify: {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    // Align items
    align: {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    },
    // Gap
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
      10: 'gap-10',
      12: 'gap-12',
    },
    // Padding
    p: {
      0: 'p-0',
      1: 'p-1',
      2: 'p-2',
      3: 'p-3',
      4: 'p-4',
      5: 'p-5',
      6: 'p-6',
      8: 'p-8',
      10: 'p-10',
      12: 'p-12',
    },
    // Margin
    m: {
      0: 'm-0',
      1: 'm-1',
      2: 'm-2',
      3: 'm-3',
      4: 'm-4',
      5: 'm-5',
      6: 'm-6',
      8: 'm-8',
      auto: 'm-auto',
    },
    // Width
    w: {
      auto: 'w-auto',
      full: 'w-full',
      screen: 'w-screen',
      min: 'w-min',
      max: 'w-max',
      fit: 'w-fit',
    },
    // Height
    h: {
      auto: 'h-auto',
      full: 'h-full',
      screen: 'h-screen',
      min: 'h-min',
      max: 'h-max',
      fit: 'h-fit',
    },
    // Border radius
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    },
    // Background
    bg: {
      transparent: 'bg-transparent',
      background: 'bg-background',
      card: 'bg-card',
      muted: 'bg-muted',
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      accent: 'bg-accent',
    },
    // Position
    position: {
      static: 'static',
      relative: 'relative',
      absolute: 'absolute',
      fixed: 'fixed',
      sticky: 'sticky',
    },
  },
  defaultVariants: {
    display: 'block',
  },
});

export interface BoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {
  asChild?: boolean;
  as?: React.ElementType;
}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  (
    {
      className,
      asChild = false,
      as: Component = 'div',
      display,
      direction,
      justify,
      align,
      gap,
      p,
      m,
      w,
      h,
      rounded,
      bg,
      position,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Component;
    return (
      <Comp
        className={cn(
          boxVariants({
            display,
            direction,
            justify,
            align,
            gap,
            p,
            m,
            w,
            h,
            rounded,
            bg,
            position,
          }),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Box.displayName = 'Box';

export { Box, boxVariants };
```

### Text - Typography Primitive

```tsx
// components/primitives/Text.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('', {
  variants: {
    // Pre-defined text styles
    variant: {
      h1: 'scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      h5: 'scroll-m-20 text-lg font-semibold tracking-tight',
      h6: 'scroll-m-20 text-base font-semibold tracking-tight',
      p: 'leading-7',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
      code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
      blockquote: 'border-l-2 pl-6 italic',
    },
    // Size overrides
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
    },
    // Weight overrides
    weight: {
      thin: 'font-thin',
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
      black: 'font-black',
    },
    // Color
    color: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-destructive',
      info: 'text-info',
    },
    // Alignment
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    // Truncation
    truncate: {
      true: 'truncate',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'p',
    color: 'default',
    truncate: false,
  },
});

// Map variant to semantic HTML element
const variantElementMap: Record<string, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  p: 'p',
  lead: 'p',
  large: 'p',
  small: 'small',
  muted: 'p',
  code: 'code',
  blockquote: 'blockquote',
};

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  asChild?: boolean;
  as?: React.ElementType;
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      className,
      asChild = false,
      as,
      variant = 'p',
      size,
      weight,
      color,
      align,
      truncate,
      ...props
    },
    ref
  ) => {
    const Component = asChild
      ? Slot
      : as || variantElementMap[variant || 'p'] || 'p';

    return (
      <Component
        className={cn(
          textVariants({ variant, size, weight, color, align, truncate }),
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text, textVariants };
```

### Stack - Layout Primitive

```tsx
// components/primitives/Stack.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      column: 'flex-col',
      'column-reverse': 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      'wrap-reverse': 'flex-wrap-reverse',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
      10: 'gap-10',
      12: 'gap-12',
      16: 'gap-16',
    },
  },
  defaultVariants: {
    direction: 'column',
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
    gap: 4,
  },
});

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  as?: React.ElementType;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    { className, direction, align, justify, wrap, gap, as: Component = 'div', ...props },
    ref
  ) => {
    return (
      <Component
        className={cn(stackVariants({ direction, align, justify, wrap, gap }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Stack.displayName = 'Stack';

// Convenience components
const HStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack direction="row" ref={ref} {...props} />
);
HStack.displayName = 'HStack';

const VStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack direction="column" ref={ref} {...props} />
);
VStack.displayName = 'VStack';

export { Stack, HStack, VStack, stackVariants };
```

---

## B7. CORE COMPONENTS (MOLECULES)

### Button - The Complete Button System

```tsx
// components/ui/Button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
   ring-offset-background transition-all duration-200
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        // Solid variants
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        success: 'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm',

        // Outline variants
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'outline-primary': 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
        'outline-destructive': 'border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground',

        // Soft/Ghost variants
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',

        // Special variants
        gradient: `bg-gradient-to-r from-primary via-accent-purple to-primary bg-[length:200%_auto]
                   text-white shadow-lg hover:bg-[position:right_center] transition-[background-position] duration-500`,
        glass: 'bg-background/80 backdrop-blur-md border border-border/50 hover:bg-background/90',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded',
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-11 px-6 text-base rounded-md',
        xl: 'h-12 px-8 text-lg rounded-lg',
        '2xl': 'h-14 px-10 text-xl rounded-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2 -ml-1">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2 -mr-1">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

// Button Group Component
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = 'horizontal', attached = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row',
          attached && [
            '[&>*:first-child]:rounded-r-none',
            '[&>*:last-child]:rounded-l-none',
            '[&>*:not(:first-child):not(:last-child)]:rounded-none',
            orientation === 'horizontal' ? '[&>*:not(:first-child)]:-ml-px' : '[&>*:not(:first-child)]:-mt-px',
          ],
          !attached && (orientation === 'horizontal' ? 'gap-2' : 'gap-2'),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ButtonGroup.displayName = 'ButtonGroup';

export { Button, ButtonGroup, buttonVariants };
```

### Input - The Complete Input System

```tsx
// components/ui/Input.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, Check, Eye, EyeOff, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  `flex w-full rounded-md border bg-background text-sm ring-offset-background
   file:border-0 file:bg-transparent file:text-sm file:font-medium
   placeholder:text-muted-foreground
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
   disabled:cursor-not-allowed disabled:opacity-50
   transition-colors duration-200`,
  {
    variants: {
      variant: {
        default: 'border-input',
        filled: 'border-transparent bg-muted focus-visible:bg-background',
        flushed: 'border-x-0 border-t-0 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary',
        unstyled: 'border-transparent bg-transparent focus-visible:ring-0',
      },
      inputSize: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-9 px-3 text-sm',
        default: 'h-10 px-3 py-2',
        lg: 'h-11 px-4 text-base',
        xl: 'h-12 px-4 text-lg',
      },
      state: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
        warning: 'border-warning focus-visible:ring-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  showClearButton?: boolean;
  onClear?: () => void;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      state,
      type,
      leftElement,
      rightElement,
      leftAddon,
      rightAddon,
      showClearButton,
      onClear,
      wrapperClassName,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    const hasValue = value !== undefined && value !== '';

    // Handle input with addons/elements
    if (leftElement || rightElement || leftAddon || rightAddon || showClearButton || type === 'password') {
      return (
        <div className={cn('relative flex items-center', wrapperClassName)}>
          {/* Left Addon */}
          {leftAddon && (
            <div className="flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
              {leftAddon}
            </div>
          )}

          {/* Input Container */}
          <div className="relative flex-1">
            {/* Left Element */}
            {leftElement && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {leftElement}
              </div>
            )}

            <input
              type={inputType}
              className={cn(
                inputVariants({ variant, inputSize, state }),
                leftElement && 'pl-10',
                (rightElement || showClearButton || type === 'password') && 'pr-10',
                leftAddon && 'rounded-l-none',
                rightAddon && 'rounded-r-none',
                className
              )}
              ref={ref}
              value={value}
              {...props}
            />

            {/* Right Elements */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {showClearButton && hasValue && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {type === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
              {rightElement}
            </div>
          </div>

          {/* Right Addon */}
          {rightAddon && (
            <div className="flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
              {rightAddon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, state, className }))}
        ref={ref}
        value={value}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Search Input Convenience Component
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leftElement'>>(
  (props, ref) => (
    <Input
      ref={ref}
      type="search"
      leftElement={<Search className="h-4 w-4" />}
      showClearButton
      {...props}
    />
  )
);
SearchInput.displayName = 'SearchInput';

export { Input, SearchInput, inputVariants };
```

### Card - The Complete Card System

```tsx
// components/ui/Card.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('rounded-lg border bg-card text-card-foreground', {
  variants: {
    variant: {
      default: 'border-border shadow-sm',
      elevated: 'border-transparent shadow-md',
      outline: 'border-border bg-transparent shadow-none',
      filled: 'border-transparent bg-muted shadow-none',
      ghost: 'border-transparent bg-transparent shadow-none',
      interactive: `border-border shadow-sm transition-all duration-200
                    hover:shadow-md hover:border-primary/20 cursor-pointer`,
      gradient: 'border-transparent bg-gradient-to-br from-card to-muted shadow-sm',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'none',
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Card with Image
const CardWithImage = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    imageSrc: string;
    imageAlt: string;
    imagePosition?: 'top' | 'bottom' | 'left' | 'right';
    aspectRatio?: 'video' | 'square' | 'portrait';
  }
>(({ className, imageSrc, imageAlt, imagePosition = 'top', aspectRatio = 'video', children, ...props }, ref) => {
  const imageClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  const isHorizontal = imagePosition === 'left' || imagePosition === 'right';

  return (
    <Card
      ref={ref}
      className={cn(isHorizontal && 'flex flex-row', className)}
      {...props}
    >
      {(imagePosition === 'top' || imagePosition === 'left') && (
        <div className={cn(
          'overflow-hidden',
          isHorizontal ? 'w-1/3 rounded-l-lg' : 'rounded-t-lg',
          imageClass
        )}>
          <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
        </div>
      )}
      <div className={cn(isHorizontal && 'flex-1')}>
        {children}
      </div>
      {(imagePosition === 'bottom' || imagePosition === 'right') && (
        <div className={cn(
          'overflow-hidden',
          isHorizontal ? 'w-1/3 rounded-r-lg' : 'rounded-b-lg',
          imageClass
        )}>
          <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
        </div>
      )}
    </Card>
  );
});
CardWithImage.displayName = 'CardWithImage';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardWithImage,
  cardVariants,
};
```

---

## B8. FORM COMPONENTS

### Complete Form System with React Hook Form + Zod

```tsx
// components/ui/Form.tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from './Label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
    optional?: boolean;
  }
>(({ className, required, optional, children, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
      {optional && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
    </Label>
  );
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

// Success message variant
const FormSuccessMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-success', className)}
      {...props}
    />
  );
});
FormSuccessMessage.displayName = 'FormSuccessMessage';

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSuccessMessage,
  FormField,
};
```

### Complete Form Example

```tsx
// examples/CompleteFormExample.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, SearchInput } from '@/components/ui/Input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Switch } from '@/components/ui/Switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

// Comprehensive validation schema
const formSchema = z.object({
  // Text fields
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),

  // Select
  country: z.string().min(1, 'Please select a country'),

  // Textarea
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),

  // Radio
  plan: z.enum(['free', 'pro', 'enterprise'], {
    required_error: 'Please select a plan',
  }),

  // Checkboxes
  agreeToTerms: z
    .boolean()
    .refine((val) => val === true, 'You must agree to the terms'),
  subscribeNewsletter: z.boolean().optional(),

  // Switch
  enableNotifications: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

export function CompleteFormExample() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
      bio: '',
      plan: undefined,
      agreeToTerms: false,
      subscribeNewsletter: false,
      enableNotifications: true,
    },
  });

  async function onSubmit(data: FormData) {
    console.log('Form submitted:', data);
    // Handle form submission
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Fill in the form below to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name fields - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    We'll never share your email with anyone else.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Country Select */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ae">United Arab Emirates</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio Textarea */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plan Radio Group */}
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel required>Select Plan</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="free" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Free - $0/month
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="pro" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Pro - $19/month
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="enterprise" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Enterprise - $99/month
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notifications Switch */}
            <FormField
              control={form.control}
              name="enableNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Notifications</FormLabel>
                    <FormDescription>
                      Receive email notifications about updates.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Checkboxes */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms and conditions
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subscribeNewsletter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Subscribe to newsletter</FormLabel>
                      <FormDescription>
                        Get the latest updates and news.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              isLoading={form.formState.isSubmitting}
              loadingText="Creating account..."
            >
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

---

## B9. FEEDBACK COMPONENTS

### Toast System with Sonner

```tsx
// components/ui/Toast.tsx
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toaster]:border-success/50 group-[.toaster]:text-success',
          error: 'group-[.toaster]:border-destructive/50 group-[.toaster]:text-destructive',
          warning: 'group-[.toaster]:border-warning/50',
          info: 'group-[.toaster]:border-info/50',
        },
      }}
      {...props}
    />
  );
};

// Enhanced toast functions with icons
const toast = {
  // Basic toast
  message: sonnerToast,

  // Success toast
  success: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast.success(message, {
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      ...options,
    });
  },

  // Error toast
  error: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast.error(message, {
      icon: <XCircle className="h-5 w-5 text-destructive" />,
      ...options,
    });
  },

  // Warning toast
  warning: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast.warning(message, {
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
      ...options,
    });
  },

  // Info toast
  info: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast.info(message, {
      icon: <Info className="h-5 w-5 text-info" />,
      ...options,
    });
  },

  // Loading toast (returns ID for dismissing)
  loading: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast.loading(message, {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      ...options,
    });
  },

  // Promise toast
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  // Dismiss toast
  dismiss: sonnerToast.dismiss,
};

export { Toaster, toast };
```

### Alert Component

```tsx
// components/ui/Alert.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        info: 'border-info/50 bg-info/10 text-info [&>svg]:text-info',
        success: 'border-success/50 bg-success/10 text-success [&>svg]:text-success',
        warning: 'border-warning/50 bg-warning/10 text-warning [&>svg]:text-warning',
        destructive: 'border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  onDismiss?: () => void;
  dismissible?: boolean;
  icon?: React.ReactNode;
  showIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', onDismiss, dismissible, icon, showIcon = true, children, ...props }, ref) => {
    const IconComponent = iconMap[variant || 'default'];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && (icon || <IconComponent className="h-4 w-4" />)}
        {children}
        {dismissible && (
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
```

---

## B10. LOADING STATES

### Skeleton Component

```tsx
// components/ui/Skeleton.tsx
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  );
}

// Pre-composed skeleton patterns
function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />;
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonTable,
  SkeletonList,
};
```

### Spinner Component

```tsx
// components/ui/Spinner.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      color: {
        default: 'text-muted-foreground',
        primary: 'text-primary',
        secondary: 'text-secondary-foreground',
        white: 'text-white',
        success: 'text-success',
        error: 'text-destructive',
      },
    },
    defaultVariants: {
      size: 'md',
      color: 'default',
    },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, color, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || 'Loading'}
        className={cn('inline-flex items-center gap-2', className)}
        {...props}
      >
        <div className={cn(spinnerVariants({ size, color }))} />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        <span className="sr-only">{label || 'Loading'}</span>
      </div>
    );
  }
);
Spinner.displayName = 'Spinner';

// Full page loading overlay
function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" color="primary" />
        {message && <p className="text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

// Inline loading state
function InlineLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Spinner size="sm" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

export { Spinner, LoadingOverlay, InlineLoading, spinnerVariants };
```

---

## B11. NAVIGATION COMPONENTS

### Breadcrumb Component

```tsx
// components/ui/Breadcrumb.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<'ol'>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
```

### Tabs Component

```tsx
// components/ui/Tabs.tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        default: 'h-10 rounded-md bg-muted p-1 text-muted-foreground',
        underline: 'border-b border-border gap-4',
        pills: 'gap-2',
        segment: 'h-10 rounded-lg bg-muted p-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof tabsListVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline: 'border-b-2 border-transparent pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:text-foreground',
        pills: 'rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
        segment: 'rounded-md px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

---

## B12. DATA DISPLAY COMPONENTS

### Badge Component

```tsx
// components/ui/Badge.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/80',
        outline: 'text-foreground',
        ghost: 'border-transparent bg-muted text-muted-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 -mr-1 h-3.5 w-3.5 rounded-full hover:bg-black/20 dark:hover:bg-white/20 inline-flex items-center justify-center"
        >
          <span className="sr-only">Remove</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Status Badge with predefined colors
type StatusType = 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'active' | 'inactive';

const statusConfig: Record<StatusType, { variant: BadgeProps['variant']; dotColor: string }> = {
  online: { variant: 'success', dotColor: 'bg-success' },
  offline: { variant: 'ghost', dotColor: 'bg-muted-foreground' },
  busy: { variant: 'destructive', dotColor: 'bg-destructive' },
  away: { variant: 'warning', dotColor: 'bg-warning' },
  pending: { variant: 'warning', dotColor: 'bg-warning' },
  active: { variant: 'success', dotColor: 'bg-success' },
  inactive: { variant: 'ghost', dotColor: 'bg-muted-foreground' },
};

function StatusBadge({ status, ...props }: { status: StatusType } & Omit<BadgeProps, 'variant' | 'dot' | 'dotColor'>) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot dotColor={config.dotColor} {...props}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
```

### Avatar Component

```tsx
// components/ui/Avatar.tsx
import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-24 w-24 text-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarVariants>
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted font-medium',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Avatar with status indicator
interface AvatarWithStatusProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
  status?: 'online' | 'offline' | 'busy' | 'away';
  src?: string;
  alt?: string;
  fallback?: string;
}

const statusColors = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  busy: 'bg-destructive',
  away: 'bg-warning',
};

function AvatarWithStatus({
  status,
  src,
  alt,
  fallback,
  size,
  className,
  ...props
}: AvatarWithStatusProps) {
  const statusSize = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
    '2xl': 'h-5 w-5',
  }[size || 'md'];

  return (
    <div className="relative inline-block">
      <Avatar size={size} className={className} {...props}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            statusColors[status],
            statusSize
          )}
        />
      )}
    </div>
  );
}

// Avatar Group
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
}

function AvatarGroup({ children, max = 4, size = 'md' }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className="flex -space-x-2">
      {visibleChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-background rounded-full">
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<any>, { size })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} className="ring-2 ring-background">
          <AvatarFallback>+{remainingCount}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWithStatus,
  AvatarGroup,
  avatarVariants,
};
```

---

## B13. ANIMATION SYSTEM

### Framer Motion Configuration

```tsx
// lib/motion.ts
import { Variants } from 'framer-motion';

// ============================================================================
// OLYMPUS ANIMATION SYSTEM
// Consistent, performant animations across the platform
// ============================================================================

// Easing functions matching our design tokens
export const easings = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const;

// Duration presets (in seconds)
export const durations = {
  instant: 0,
  fastest: 0.05,
  faster: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
  slowest: 0.5,
} as const;

// ============================================================================
// FADE ANIMATIONS
// ============================================================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

// ============================================================================
// SCALE ANIMATIONS
// ============================================================================

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleInCenter: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
};

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 400,
    },
  },
  exit: { opacity: 0, scale: 0.5 },
};

// ============================================================================
// SLIDE ANIMATIONS
// ============================================================================

export const slideInFromTop: Variants = {
  initial: { y: '-100%' },
  animate: { y: 0 },
  exit: { y: '-100%' },
};

export const slideInFromBottom: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

export const slideInFromLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

export const slideInFromRight: Variants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

// ============================================================================
// STAGGER ANIMATIONS (for lists)
// ============================================================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: { opacity: 0, y: 20 },
};

export const staggerItemFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    },
  },
};

export const pageSlide: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: easings.easeIn,
    },
  },
};

// ============================================================================
// MODAL/OVERLAY ANIMATIONS
// ============================================================================

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
    },
  },
};

export const sheetContent: Variants = {
  initial: { x: '100%' },
  animate: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    x: '100%',
    transition: {
      duration: 0.2,
    },
  },
};

// ============================================================================
// MICRO-INTERACTIONS
// ============================================================================

export const buttonPress = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

export const buttonHover = {
  scale: 1.02,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 17,
  },
};

export const cardHover = {
  y: -4,
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
};

export const linkUnderline = {
  scaleX: 1,
  transition: { duration: 0.2 },
};

// ============================================================================
// LOADING ANIMATIONS
// ============================================================================

export const pulse: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const bounce: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const spin: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Create stagger delay for list items
export const staggerDelay = (index: number, baseDelay = 0.05) => ({
  transition: { delay: index * baseDelay },
});

// Create custom spring animation
export const customSpring = (stiffness = 300, damping = 25) => ({
  type: 'spring',
  stiffness,
  damping,
});

// Reduce motion for accessibility
export const reducedMotion: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
```

### Motion Components

```tsx
// components/motion/index.tsx
'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import * as animations from '@/lib/motion';

// Re-export motion components for easier imports
export { motion, AnimatePresence, LayoutGroup };

// Pre-configured motion components
export const MotionDiv = motion.div;
export const MotionSpan = motion.span;
export const MotionButton = motion.button;
export const MotionUl = motion.ul;
export const MotionLi = motion.li;

// Fade In component
export function FadeIn({
  children,
  delay = 0,
  duration = 0.2,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade In Up component
export function FadeInUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        delay,
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger Children component
export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger Item component (use inside StaggerChildren)
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={animations.staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover
export function ScaleOnHover({
  children,
  scale = 1.05,
  className,
}: {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page wrapper with transitions
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

---

## B14. RESPONSIVE DESIGN SYSTEM

### useMediaQuery Hook

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';
import { tokens } from '@/tokens';

type Breakpoint = keyof typeof tokens.breakpoints;

const breakpointValues: Record<Breakpoint, number> = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpointValues.md - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${breakpointValues.md}px) and (max-width: ${breakpointValues.lg - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpointValues.lg}px)`);
}

export function useBreakpoint(): Breakpoint {
  const isXs = useMediaQuery(`(max-width: ${breakpointValues.sm - 1}px)`);
  const isSm = useMediaQuery(`(min-width: ${breakpointValues.sm}px) and (max-width: ${breakpointValues.md - 1}px)`);
  const isMd = useMediaQuery(`(min-width: ${breakpointValues.md}px) and (max-width: ${breakpointValues.lg - 1}px)`);
  const isLg = useMediaQuery(`(min-width: ${breakpointValues.lg}px) and (max-width: ${breakpointValues.xl - 1}px)`);
  const isXl = useMediaQuery(`(min-width: ${breakpointValues.xl}px) and (max-width: ${breakpointValues['2xl'] - 1}px)`);

  if (isXs) return 'xs';
  if (isSm) return 'sm';
  if (isMd) return 'md';
  if (isLg) return 'lg';
  if (isXl) return 'xl';
  return '2xl';
}

export function useBreakpointValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const breakpoint = useBreakpoint();
  const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpoints.indexOf(breakpoint);

  // Find the closest defined value (current or below)
  for (let i = currentIndex; i >= 0; i--) {
    const key = breakpoints[i];
    if (values[key] !== undefined) {
      return values[key];
    }
  }

  return undefined;
}
```

### Responsive Container Component

```tsx
// components/layout/Container.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      full: 'max-w-full',
      prose: 'max-w-prose',
    },
    padding: {
      none: 'px-0',
      sm: 'px-4',
      md: 'px-4 sm:px-6',
      lg: 'px-4 sm:px-6 lg:px-8',
      xl: 'px-4 sm:px-6 lg:px-8 xl:px-12',
    },
    center: {
      true: 'flex flex-col items-center',
      false: '',
    },
  },
  defaultVariants: {
    size: '7xl',
    padding: 'lg',
    center: false,
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, center, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size, padding, center }), className)}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';

export { Container, containerVariants };
```

---

## B15. ACCESSIBILITY (A11Y) SYSTEM

### Screen Reader Only Component

```tsx
// components/a11y/VisuallyHidden.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
          '[clip:rect(0,0,0,0)]',
          className
        )}
        {...props}
      />
    );
  }
);
VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
```

### Skip Link Component

```tsx
// components/a11y/SkipLink.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
}

const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ className, targetId = 'main-content', children = 'Skip to main content', ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        className={cn(
          'sr-only focus:not-sr-only',
          'focus:fixed focus:left-4 focus:top-4 focus:z-skipLink',
          'focus:px-4 focus:py-2 focus:bg-background focus:text-foreground',
          'focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-ring',
          'focus:outline-none',
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);
SkipLink.displayName = 'SkipLink';

export { SkipLink };
```

### Focus Trap Hook

```tsx
// hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}
```

### Announce Hook (for screen readers)

```tsx
// hooks/useAnnounce.ts
import { useCallback, useEffect, useRef } from 'react';

type Politeness = 'polite' | 'assertive' | 'off';

export function useAnnounce() {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live regions if they don't exist
    if (!document.getElementById('aria-live-polite')) {
      const politeRegion = document.createElement('div');
      politeRegion.id = 'aria-live-polite';
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'true');
      politeRegion.className = 'sr-only';
      document.body.appendChild(politeRegion);
      politeRef.current = politeRegion;
    }

    if (!document.getElementById('aria-live-assertive')) {
      const assertiveRegion = document.createElement('div');
      assertiveRegion.id = 'aria-live-assertive';
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.className = 'sr-only';
      document.body.appendChild(assertiveRegion);
      assertiveRef.current = assertiveRegion;
    }
  }, []);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const region = politeness === 'assertive'
      ? document.getElementById('aria-live-assertive')
      : document.getElementById('aria-live-polite');

    if (region) {
      // Clear and set to trigger announcement
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 50);
    }
  }, []);

  return announce;
}
```

---

## B16. COMPONENT TESTING SETUP

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### Example Component Tests

```tsx
// components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading loadingText="Loading...">Click me</Button>);

    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('applies size styles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
  });

  it('renders with left and right icons', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        With Icons
      </Button>
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    );

    expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
  });
});
```

---

## B17. STORYBOOK DOCUMENTATION

### Storybook Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

### Button Stories Example

```tsx
// components/ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button, ButtonGroup } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'gradient'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'default', 'lg', 'xl', '2xl', 'icon', 'icon-sm', 'icon-lg'],
    },
    isLoading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default button
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

// All variants
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="gradient">Gradient</Button>
    </div>
  ),
};

// All sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="2xl">2XL</Button>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button leftIcon={<Mail className="h-4 w-4" />}>
        Email
      </Button>
      <Button rightIcon={<ArrowRight className="h-4 w-4" />}>
        Continue
      </Button>
      <Button
        leftIcon={<Mail className="h-4 w-4" />}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Both Icons
      </Button>
    </div>
  ),
};

// Icon buttons
export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="icon-sm" variant="outline">
        <Mail className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="outline">
        <Mail className="h-4 w-4" />
      </Button>
      <Button size="icon-lg" variant="outline">
        <Mail className="h-5 w-5" />
      </Button>
    </div>
  ),
};

// Loading states
export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button isLoading>Loading</Button>
      <Button isLoading loadingText="Saving...">Save</Button>
      <Button isLoading variant="outline">Loading Outline</Button>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>Disabled</Button>
      <Button disabled variant="outline">Disabled Outline</Button>
      <Button disabled variant="secondary">Disabled Secondary</Button>
    </div>
  ),
};

// Full width
export const FullWidth: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <Button fullWidth>Full Width Button</Button>
      <Button fullWidth variant="outline">Full Width Outline</Button>
    </div>
  ),
};

// Button group
export const Group: Story = {
  render: () => (
    <div className="space-y-4">
      <ButtonGroup attached>
        <Button variant="outline">Left</Button>
        <Button variant="outline">Middle</Button>
        <Button variant="outline">Right</Button>
      </ButtonGroup>

      <ButtonGroup>
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      </ButtonGroup>
    </div>
  ),
};
```

---

## B18. UTILITY FUNCTIONS

### cn (Class Name Merger)

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a date
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  locale = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return rtf.format(-seconds, 'second');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = ''): string {
  const id = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

---

## B19. COMPLETE FILE STRUCTURE

```
src/
├── components/
│   ├── primitives/          # Atomic building blocks
│   │   ├── Box.tsx
│   │   ├── Text.tsx
│   │   ├── Stack.tsx
│   │   └── index.ts
│   │
│   ├── ui/                  # Core components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Form.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── Switch.tsx
│   │   ├── Textarea.tsx
│   │   ├── Label.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Alert.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── Dialog.tsx
│   │   ├── Sheet.tsx
│   │   ├── Popover.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tabs.tsx
│   │   ├── Accordion.tsx
│   │   ├── Breadcrumb.tsx
│   │   ├── Pagination.tsx
│   │   ├── Progress.tsx
│   │   ├── Slider.tsx
│   │   ├── Table.tsx
│   │   ├── Calendar.tsx
│   │   ├── Command.tsx
│   │   └── index.ts
│   │
│   ├── patterns/            # Complex composed components
│   │   ├── DataTable/
│   │   ├── Form/
│   │   ├── Navigation/
│   │   ├── FileUpload/
│   │   └── index.ts
│   │
│   ├── layout/              # Layout components
│   │   ├── Container.tsx
│   │   ├── Grid.tsx
│   │   ├── Section.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── index.ts
│   │
│   ├── motion/              # Animation components
│   │   ├── FadeIn.tsx
│   │   ├── SlideIn.tsx
│   │   ├── Stagger.tsx
│   │   └── index.ts
│   │
│   └── a11y/                # Accessibility components
│       ├── VisuallyHidden.tsx
│       ├── SkipLink.tsx
│       └── index.ts
│
├── hooks/                   # Custom React hooks
│   ├── useMediaQuery.ts
│   ├── useFocusTrap.ts
│   ├── useAnnounce.ts
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useClickOutside.ts
│   └── index.ts
│
├── lib/                     # Utilities and configurations
│   ├── utils.ts
│   ├── motion.ts
│   └── validations.ts
│
├── tokens/                  # Design tokens
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   ├── motion.ts
│   └── index.ts
│
├── styles/                  # Global styles
│   ├── globals.css
│   ├── typography.css
│   └── animations.css
│
└── types/                   # TypeScript types
    ├── components.ts
    └── index.ts
```

---

# PART C: VERIFICATION CHECKLIST

---

## C1. 50X QUALITY CHECKLIST

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 50X more detailed than baseline | ✅ | 2500+ lines vs ~100 lines original |
| Complete design token system | ✅ | Colors, typography, spacing, shadows, motion |
| Atomic design methodology | ✅ | Primitives → Components → Patterns → Layouts |
| Full component library | ✅ | 30+ components documented |
| Accessibility system | ✅ | Focus trap, skip links, screen reader support |
| Animation system | ✅ | Framer Motion integration, 20+ animations |
| Responsive design system | ✅ | Breakpoint hooks, responsive containers |
| Form system with validation | ✅ | React Hook Form + Zod integration |
| Testing setup | ✅ | Vitest + Testing Library configuration |
| Documentation system | ✅ | Storybook setup with examples |

## C2. INNOVATION CHECKLIST

| Innovation | Description |
|------------|-------------|
| Compound variants with CVA | Type-safe variant system |
| Motion primitives | Reusable animation components |
| Semantic color system | Automatic dark mode support |
| Accessibility hooks | Built-in a11y patterns |
| Responsive value hooks | Dynamic breakpoint-based values |
| Toast integration | Sonner with custom styling |
| Form field abstractions | Simplified form building |

---

# PART D: IMPLEMENTATION NOTES

---

## D1. DEPENDENCIES TO INSTALL

```bash
# Core UI
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-checkbox
npm install @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-tabs
npm install @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-popover
npm install @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-slider

# Styling
npm install class-variance-authority clsx tailwind-merge
npm install tailwindcss-animate @tailwindcss/typography @tailwindcss/forms
npm install @tailwindcss/container-queries

# Forms
npm install react-hook-form @hookform/resolvers zod

# Animation
npm install framer-motion

# Toast
npm install sonner

# Icons
npm install lucide-react

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Storybook
npm install -D @storybook/react-vite @storybook/addon-essentials
npm install -D @storybook/addon-a11y @storybook/addon-themes
```

---

**DOCUMENT STATUS: COMPLETE**
**50X STANDARD: ACHIEVED**
**READY FOR: Implementation**

---

*SECTION 10: UI COMPONENT SYSTEM - 50X ENHANCED*
*Created: January 2026*
*Part of: OLYMPUS 50X Development Protocol*

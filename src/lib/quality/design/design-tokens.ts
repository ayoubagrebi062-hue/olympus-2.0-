/**
 * OLYMPUS 2.1 - Design Token System
 *
 * These tokens are LAW. Agents cannot invent values outside this system.
 * All values are validated by TokenGate before code is accepted.
 *
 * Philosophy: "Code for rules, AI for taste"
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING SCALE (8px base unit - Tailwind compatible)
// ═══════════════════════════════════════════════════════════════════════════════

export const SPACING_SCALE = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128] as const;

export const SPACING_SEMANTIC = {
  // Micro spacing
  'button-icon-gap': 8, // gap-2: space between icon and text in button
  'badge-padding-x': 8, // px-2: horizontal padding in badges
  'badge-padding-y': 4, // py-1: vertical padding in badges

  // Component spacing
  'button-gap': 8, // gap-2: space between adjacent buttons
  'button-group-gap': 12, // gap-3: space between button groups
  'input-padding-x': 12, // px-3: horizontal padding in inputs
  'input-padding-y': 8, // py-2: vertical padding in inputs

  // Form spacing
  'form-field-gap': 16, // gap-4: space between form fields
  'label-input-gap': 6, // gap-1.5: space between label and input
  'error-message-gap': 4, // gap-1: space above error message

  // Card/container spacing
  'card-padding': 16, // p-4: internal card padding
  'card-padding-lg': 24, // p-6: larger card padding
  'card-header-gap': 12, // gap-3: space between card header elements

  // Section/page spacing
  'section-gap': 24, // gap-6: space between sections
  'section-gap-lg': 32, // gap-8: larger section gaps
  'page-margin': 16, // px-4: page horizontal margin (mobile)
  'page-margin-md': 24, // px-6: page margin (tablet)
  'page-margin-lg': 32, // px-8: page margin (desktop)

  // Navigation spacing
  'nav-item-gap': 4, // gap-1: space between nav items
  'nav-item-padding': 8, // p-2: nav item internal padding
  'sidebar-width': 256, // w-64: sidebar width
  'sidebar-collapsed': 64, // w-16: collapsed sidebar width
} as const;

// Tailwind class mapping
export const SPACING_TO_TAILWIND: Record<number, string> = {
  0: '0',
  4: '1',
  8: '2',
  12: '3',
  16: '4',
  20: '5',
  24: '6',
  32: '8',
  40: '10',
  48: '12',
  64: '16',
  80: '20',
  96: '24',
  128: '32',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM (Semantic roles, not raw colors)
// ═══════════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // Surface colors (backgrounds)
  surface: {
    default: { light: '#ffffff', dark: '#0a0a0a' },
    muted: { light: '#f5f5f5', dark: '#171717' },
    subtle: { light: '#fafafa', dark: '#0f0f0f' },
    inverse: { light: '#0a0a0a', dark: '#ffffff' },
    elevated: { light: '#ffffff', dark: '#1a1a1a' },
  },

  // Text colors
  text: {
    primary: { light: '#0a0a0a', dark: '#fafafa' },
    secondary: { light: '#525252', dark: '#a3a3a3' },
    muted: { light: '#737373', dark: '#737373' },
    inverse: { light: '#fafafa', dark: '#0a0a0a' },
    disabled: { light: '#a3a3a3', dark: '#525252' },
  },

  // Border colors
  border: {
    default: { light: '#e5e5e5', dark: '#262626' },
    strong: { light: '#d4d4d4', dark: '#404040' },
    subtle: { light: '#f5f5f5', dark: '#1a1a1a' },
    focus: { light: '#2563eb', dark: '#3b82f6' },
  },

  // State colors (feedback)
  state: {
    error: { light: '#dc2626', dark: '#ef4444' },
    'error-muted': { light: '#fef2f2', dark: '#450a0a' },
    warning: { light: '#d97706', dark: '#f59e0b' },
    'warning-muted': { light: '#fffbeb', dark: '#451a03' },
    success: { light: '#16a34a', dark: '#22c55e' },
    'success-muted': { light: '#f0fdf4', dark: '#052e16' },
    info: { light: '#2563eb', dark: '#3b82f6' },
    'info-muted': { light: '#eff6ff', dark: '#172554' },
  },

  // Interactive colors (buttons, links)
  interactive: {
    primary: {
      default: { light: '#2563eb', dark: '#3b82f6' },
      hover: { light: '#1d4ed8', dark: '#2563eb' },
      active: { light: '#1e40af', dark: '#1d4ed8' },
      disabled: { light: '#93c5fd', dark: '#1e3a8a' },
    },
    secondary: {
      default: { light: '#f3f4f6', dark: '#374151' },
      hover: { light: '#e5e7eb', dark: '#4b5563' },
      active: { light: '#d1d5db', dark: '#6b7280' },
      disabled: { light: '#f9fafb', dark: '#1f2937' },
    },
    destructive: {
      default: { light: '#dc2626', dark: '#ef4444' },
      hover: { light: '#b91c1c', dark: '#dc2626' },
      active: { light: '#991b1b', dark: '#b91c1c' },
      disabled: { light: '#fca5a5', dark: '#7f1d1d' },
    },
    ghost: {
      default: { light: 'transparent', dark: 'transparent' },
      hover: { light: '#f3f4f6', dark: '#374151' },
      active: { light: '#e5e7eb', dark: '#4b5563' },
      disabled: { light: 'transparent', dark: 'transparent' },
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SCALE
// ═══════════════════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
  },

  fontSize: {
    xs: 12, // text-xs: small labels, captions
    sm: 14, // text-sm: secondary text, helper text
    base: 16, // text-base: body text
    lg: 18, // text-lg: emphasized body
    xl: 20, // text-xl: small headings
    '2xl': 24, // text-2xl: section headings
    '3xl': 30, // text-3xl: page headings
    '4xl': 36, // text-4xl: large page headings
    '5xl': 48, // text-5xl: hero headings
    '6xl': 60, // text-6xl: display headings
  },

  lineHeight: {
    none: 1, // leading-none: headings
    tight: 1.25, // leading-tight: compact text
    snug: 1.375, // leading-snug: slightly compact
    normal: 1.5, // leading-normal: body text
    relaxed: 1.625, // leading-relaxed: readable paragraphs
    loose: 2, // leading-loose: spacious text
  },

  fontWeight: {
    normal: 400, // font-normal
    medium: 500, // font-medium
    semibold: 600, // font-semibold
    bold: 700, // font-bold
  },

  letterSpacing: {
    tighter: '-0.05em', // tracking-tighter
    tight: '-0.025em', // tracking-tight
    normal: '0', // tracking-normal
    wide: '0.025em', // tracking-wide
    wider: '0.05em', // tracking-wider
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════════════════════════════════════

export const RADIUS = {
  none: 0, // rounded-none
  sm: 4, // rounded-sm: subtle rounding
  md: 6, // rounded-md: default component radius
  lg: 8, // rounded-lg: cards, modals
  xl: 12, // rounded-xl: large cards
  '2xl': 16, // rounded-2xl: hero sections
  '3xl': 24, // rounded-3xl: large decorative
  full: 9999, // rounded-full: pills, avatars
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════════════════════════

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION TOKENS (Critical - POLISH agent must use these)
// ═══════════════════════════════════════════════════════════════════════════════

export const MOTION = {
  duration: {
    instant: 0, // No animation
    micro: 100, // Hover states, button feedback
    fast: 150, // Tooltips, small state changes
    normal: 200, // Standard transitions
    slow: 300, // Page transitions, modals opening
    slower: 400, // Complex reveals, panel slides
    slowest: 500, // Full-page transitions
  },

  easing: {
    // Approved easings
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)', // Elements entering
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard transitions
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)', // Elements exiting (use sparingly)
    linear: 'linear', // Progress bars, spinners
  },

  // FORBIDDEN easings - validator will reject these
  forbiddenEasings: [
    'bounce',
    'elastic',
    'spring',
    'back',
    'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // overshoot
  ],

  // Semantic motion patterns
  patterns: {
    'button-hover': { duration: 100, easing: 'ease-out' },
    'button-press': { duration: 100, easing: 'ease-in-out' },
    'modal-enter': { duration: 200, easing: 'ease-out' },
    'modal-exit': { duration: 150, easing: 'ease-in' },
    'dropdown-enter': { duration: 150, easing: 'ease-out' },
    'dropdown-exit': { duration: 100, easing: 'ease-in' },
    'page-transition': { duration: 300, easing: 'ease-in-out' },
    'skeleton-pulse': { duration: 1500, easing: 'ease-in-out' },
    'toast-enter': { duration: 200, easing: 'ease-out' },
    'toast-exit': { duration: 150, easing: 'ease-in' },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Z-INDEX SCALE
// ═══════════════════════════════════════════════════════════════════════════════

export const Z_INDEX = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
  maximum: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDATED EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const DESIGN_TOKENS = {
  spacing: {
    scale: SPACING_SCALE,
    semantic: SPACING_SEMANTIC,
    toTailwind: SPACING_TO_TAILWIND,
  },
  colors: COLORS,
  typography: TYPOGRAPHY,
  radius: RADIUS,
  shadows: SHADOWS,
  motion: MOTION,
  zIndex: Z_INDEX,
  breakpoints: BREAKPOINTS,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS FOR VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export type SpacingValue = (typeof SPACING_SCALE)[number];
export type FontSizeKey = keyof typeof TYPOGRAPHY.fontSize;
export type FontWeightKey = keyof typeof TYPOGRAPHY.fontWeight;
export type RadiusKey = keyof typeof RADIUS;
export type ShadowKey = keyof typeof SHADOWS;
export type DurationKey = keyof typeof MOTION.duration;
export type EasingKey = keyof typeof MOTION.easing;
export type ZIndexKey = keyof typeof Z_INDEX;
export type BreakpointKey = keyof typeof BREAKPOINTS;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function isValidSpacing(value: number): value is SpacingValue {
  return SPACING_SCALE.includes(value as SpacingValue);
}

export function isValidDuration(value: number): boolean {
  return (Object.values(MOTION.duration) as number[]).includes(value);
}

export function isValidEasing(value: string): boolean {
  return (Object.values(MOTION.easing) as string[]).includes(value);
}

export function isForbiddenEasing(value: string): boolean {
  return MOTION.forbiddenEasings.some(forbidden =>
    value.toLowerCase().includes(forbidden.toLowerCase())
  );
}

export function getClosestValidSpacing(value: number): SpacingValue {
  return SPACING_SCALE.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

export function getClosestValidDuration(value: number): number {
  const durations = Object.values(MOTION.duration);
  return durations.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

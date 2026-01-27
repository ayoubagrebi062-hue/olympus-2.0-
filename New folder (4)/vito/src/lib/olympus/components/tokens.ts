// OLYMPUS DESIGN TOKENS — DARK MODE ONLY, SYSTEM MONOSPACE ONLY

export const TOKENS = {
  // COLORS — DARK MODE ONLY
  colors: {
    bg: {
      primary: '#0a0a0a',
      secondary: '#111111',
      tertiary: '#171717',
      elevated: '#1a1a1a',
    },
    border: {
      default: '#262626',
      subtle: '#1a1a1a',
      strong: '#404040',
    },
    text: {
      primary: '#e5e5e5',
      secondary: '#a3a3a3',
      tertiary: '#737373',
      muted: '#525252',
    },
    state: {
      pending: '#525252',
      running: '#3b82f6',
      blocked: '#f59e0b',
      failed: '#dc2626',
      complete: '#22c55e',
    },
    severity: {
      INFO: '#525252',
      WARNING: '#ca8a04',
      BLOCKING: '#ea580c',
      FATAL: '#dc2626',
    },
    accent: {
      primary: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#dc2626',
      trust: '#8b5cf6',
      cost: '#f97316',
    },
  },

  // TYPOGRAPHY — SYSTEM MONOSPACE ONLY
  font: {
    family: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    size: {
      xs: '10px',
      sm: '11px',
      base: '12px',
      md: '13px',
      lg: '14px',
      xl: '16px',
    },
    weight: {
      normal: 400,
      medium: 500,
      bold: 600,
    },
  },

  // SPACING — 4PX GRID
  space: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  // LAYOUT
  layout: {
    headerHeight: '48px',
    pipelineHeight: '64px',
    commandBarHeight: '48px',
    artifactIndexHeight: '120px',
    minWidth: '1280px',
  },

  // RADIUS — MAX 4PX
  radius: {
    none: '0px',
    sm: '2px',
    default: '4px',
  },
} as const

// PHASE STATE TO COLOR
export function phaseStateColor(state: string): string {
  return TOKENS.colors.state[state as keyof typeof TOKENS.colors.state] ?? TOKENS.colors.state.pending
}

// SEVERITY TO COLOR
export function severityColor(severity: string): string {
  return TOKENS.colors.severity[severity as keyof typeof TOKENS.colors.severity] ?? TOKENS.colors.severity.INFO
}

// TRUST SCORE TO COLOR
export function trustScoreColor(score: number): string {
  if (score >= 80) return TOKENS.colors.accent.success
  if (score >= 60) return TOKENS.colors.accent.warning
  if (score >= 40) return TOKENS.colors.severity.BLOCKING
  return TOKENS.colors.accent.error
}

// OLYMPUS SCORE TO COLOR
export function olympusScoreColor(score: number): string {
  if (score >= 90) return TOKENS.colors.accent.success
  if (score >= 70) return TOKENS.colors.accent.primary
  if (score >= 50) return TOKENS.colors.accent.warning
  return TOKENS.colors.accent.error
}

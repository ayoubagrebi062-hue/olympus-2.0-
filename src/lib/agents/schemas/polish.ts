/**
 * OLYMPUS 2.0 - POLISH Agent Output Schema (10X)
 * Animations, accessibility auditing, WCAG compliance
 */
import { z } from 'zod';

// Color parsing
export interface ParsedColor {
  rgb: [number, number, number];
  alpha: number;
  valid: boolean;
  original: string;
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
};

export function parseColor(color: string): ParsedColor {
  const trimmed = color.trim().toLowerCase();
  const result: ParsedColor = { rgb: [0, 0, 0], alpha: 1, valid: false, original: color };

  if (trimmed === 'transparent') {
    return { rgb: [0, 0, 0], alpha: 0, valid: true, original: color };
  }

  if (trimmed.startsWith('var(') || trimmed === 'currentcolor') {
    return result;
  }

  if (NAMED_COLORS[trimmed]) {
    return {
      rgb: [...NAMED_COLORS[trimmed]] as [number, number, number],
      alpha: 1,
      valid: true,
      original: color,
    };
  }

  // Hex 6-digit
  const hex6 = trimmed.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    const h = hex6[1];
    return {
      rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)],
      alpha: 1,
      valid: true,
      original: color,
    };
  }

  // Hex 3-digit
  const hex3 = trimmed.match(/^#([0-9a-f]{3})$/);
  if (hex3) {
    const h = hex3[1];
    return {
      rgb: [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)],
      alpha: 1,
      valid: true,
      original: color,
    };
  }

  // rgb/rgba
  const rgbaMatch = trimmed.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    return {
      rgb: [Number(rgbaMatch[1]), Number(rgbaMatch[2]), Number(rgbaMatch[3])],
      alpha: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
      valid: true,
      original: color,
    };
  }

  // hsl
  const hslMatch = trimmed.match(/hsl\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (hslMatch) {
    const hue = Number(hslMatch[1]) / 360;
    const sat = Number(hslMatch[2]) / 100;
    const lit = Number(hslMatch[3]) / 100;
    let r: number, g: number, b: number;
    if (sat === 0) {
      r = g = b = lit;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
      const p = 2 * lit - q;
      r = hue2rgb(p, q, hue + 1 / 3);
      g = hue2rgb(p, q, hue);
      b = hue2rgb(p, q, hue - 1 / 3);
    }
    return {
      rgb: [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)],
      alpha: 1,
      valid: true,
      original: color,
    };
  }

  return result;
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(
  fg: string,
  bg: string
): { ratio: number; valid: boolean; errors: string[]; color1Alpha?: number; color2Alpha?: number } {
  const errors: string[] = [];
  const c1 = parseColor(fg);
  const c2 = parseColor(bg);
  if (!c1.valid) {
    errors.push(`Invalid foreground color: ${fg}`);
    return { ratio: 0, valid: false, errors };
  }
  if (!c2.valid) {
    errors.push(`Invalid background color: ${bg}`);
    return { ratio: 0, valid: false, errors };
  }
  if (c1.alpha < 1) errors.push(`Foreground has alpha ${c1.alpha} - contrast may vary`);
  if (c2.alpha < 1) errors.push(`Background has alpha ${c2.alpha} - contrast may vary`);
  const l1 = getLuminance(...c1.rgb);
  const l2 = getLuminance(...c2.rgb);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return { ratio, valid: true, errors, color1Alpha: c1.alpha, color2Alpha: c2.alpha };
}

export function checkContrastCompliance(
  ratio: number,
  isLargeText: boolean
): { passesAA: boolean; passesAAA: boolean } {
  if (isLargeText) return { passesAA: ratio >= 3, passesAAA: ratio >= 4.5 };
  return { passesAA: ratio >= 4.5, passesAAA: ratio >= 7 };
}

export const WCAG_CONTRAST_REQUIREMENTS = {
  normalTextAA: 4.5,
  normalTextAAA: 7,
  largeTextAA: 3,
  largeTextAAA: 4.5,
};

// Schemas
export const PolishContrastCheckSchema = z.object({
  element: z.string(),
  foreground: z.string(),
  background: z.string(),
  ratio: z.number(),
  isLargeText: z.boolean(),
  passesAA: z.boolean(),
  passesAAA: z.boolean(),
});

export const ContrastAuditSchema = z.object({
  checks: z.array(PolishContrastCheckSchema),
  summary: z.object({
    total: z.number(),
    passingAA: z.number(),
    passingAAA: z.number(),
    failing: z.number(),
  }),
  requirements: z.object({
    normalTextAA: z.number(),
    normalTextAAA: z.number(),
    largeTextAA: z.number(),
    largeTextAAA: z.number(),
  }),
});

export const HeadingSchema = z.object({
  level: z.number(),
  text: z.string(),
  location: z.string(),
});

export const HeadingIssueSchema = z.object({
  type: z.enum(['missing-h1', 'multiple-h1', 'skipped-level', 'empty-heading']),
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  heading: HeadingSchema.optional(),
});

export const HeadingAuditSchema = z.object({
  headings: z.array(HeadingSchema),
  issues: z.array(HeadingIssueSchema),
  hasSkippedLevels: z.boolean().optional(),
  summary: z.object({
    h1Count: z.number(),
    hasSkippedLevels: z.boolean(),
    totalHeadings: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
  }),
  documentOutline: z.string(),
});

export function validateHeadingHierarchy(
  headings: z.infer<typeof HeadingSchema>[]
): z.infer<typeof HeadingAuditSchema> {
  const issues: z.infer<typeof HeadingIssueSchema>[] = [];
  const h1s = headings.filter(h => h.level === 1);
  if (h1s.length === 0 && headings.length > 0) {
    issues.push({ type: 'missing-h1', severity: 'error', message: 'No h1 found' });
  }
  if (h1s.length > 1) {
    issues.push({
      type: 'multiple-h1',
      severity: 'warning',
      message: `Found ${h1s.length} h1 elements`,
    });
  }
  let hasSkippedLevels = false;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      hasSkippedLevels = true;
      issues.push({
        type: 'skipped-level',
        severity: 'warning',
        message: `Skipped from h${headings[i - 1].level} to h${headings[i].level}`,
        heading: headings[i],
      });
    }
  }
  headings.forEach(h => {
    if (!h.text || h.text.trim() === '') {
      issues.push({
        type: 'empty-heading',
        severity: 'error',
        message: 'Empty heading',
        heading: h,
      });
    }
  });
  return {
    headings,
    issues,
    hasSkippedLevels,
    summary: {
      h1Count: h1s.length,
      hasSkippedLevels,
      totalHeadings: headings.length,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
    },
    documentOutline: generateDocumentOutline(headings),
  };
}

export function auditHeadings(
  headings: z.infer<typeof HeadingSchema>[]
): z.infer<typeof HeadingAuditSchema> {
  return validateHeadingHierarchy(headings);
}

export function generateDocumentOutline(headings: z.infer<typeof HeadingSchema>[]): string {
  return headings.map(h => '  '.repeat(h.level - 1) + `h${h.level}: ${h.text}`).join('\n');
}

// Keyboard
export const FocusableElementSchema = z.object({
  element: z.string(),
  tabIndex: z.number(),
  hasFocusStyles: z.boolean(),
  isTrapped: z.boolean(),
  canReceiveFocus: z.boolean(),
  role: z.string().optional(),
});

export const KeyboardAuditSchema = z.object({
  focusableElements: z.array(FocusableElementSchema),
  issues: z.array(
    z.object({ type: z.string(), element: z.string().optional(), message: z.string() })
  ),
  skipLinks: z.array(z.object({ text: z.string(), target: z.string(), visible: z.boolean() })),
  summary: z.object({
    totalFocusable: z.number(),
    missingFocusIndicators: z.number(),
    focusTraps: z.number(),
    hasSkipLink: z.boolean(),
    hasLogicalOrder: z.boolean(),
  }),
  tabOrder: z.array(z.string()),
});

// Lighthouse
export const LighthouseAuditSchema = z.object({
  url: z.string(),
  timestamp: z.string(),
  scores: z.object({
    performance: z.number(),
    accessibility: z.number(),
    bestPractices: z.number(),
    seo: z.number(),
  }),
  metrics: z.object({
    FCP: z.number(),
    LCP: z.number(),
    TBT: z.number(),
    CLS: z.number(),
    SI: z.number(),
  }),
  failingAudits: z.array(z.unknown()),
  opportunities: z.array(z.unknown()),
  targets: z.object({
    performance: z.number(),
    accessibility: z.number(),
    bestPractices: z.number(),
    seo: z.number(),
  }),
  passesTargets: z.boolean(),
});

export const VisualRegressionSchema = z.object({
  baselineDir: z.string().optional(),
  threshold: z.number().optional(),
});

// Accessibility Audit
export const AccessibilityAuditSchema = z.object({
  contrast: ContrastAuditSchema,
  headings: HeadingAuditSchema,
  keyboard: KeyboardAuditSchema,
  overallScore: z.number(),
  wcagLevel: z.enum(['AAA', 'AA', 'A', 'fail']),
  summary: z.object({
    totalIssues: z.number(),
    criticalIssues: z.number(),
    warnings: z.number(),
    passed: z.boolean(),
  }),
});

export function passesWCAGAA(audit: z.infer<typeof AccessibilityAuditSchema>): boolean {
  if (audit.contrast.summary.failing > 0) return false;
  if (audit.headings.summary.errorCount > 0) return false;
  return true;
}

export function calculateAccessibilityScore(
  audit: z.infer<typeof AccessibilityAuditSchema>
): number {
  let score = 100;
  score -= audit.contrast.summary.failing * 10;
  score -= audit.headings.summary.errorCount * 5;
  score -= audit.keyboard.summary.missingFocusIndicators * 5;
  return Math.max(0, Math.min(100, score));
}

export function determineWCAGLevel(
  audit: z.infer<typeof AccessibilityAuditSchema>
): 'AAA' | 'AA' | 'A' | 'fail' {
  if (audit.keyboard.summary.missingFocusIndicators > 0) return 'fail';
  if (audit.contrast.summary.failing > 0) return 'fail';
  const allAAA = audit.contrast.checks.every(
    (c: z.infer<typeof PolishContrastCheckSchema>) => c.passesAAA
  );
  if (allAAA && audit.headings.summary.errorCount === 0) return 'AAA';
  if (audit.headings.summary.errorCount === 0) return 'AA';
  return 'A';
}

export function auditColorContrast(
  pairs: Array<{ element: string; fg: string; bg: string; isLargeText?: boolean }>
): z.infer<typeof ContrastAuditSchema> {
  const checks = pairs.map(p => {
    const cr = getContrastRatio(p.fg, p.bg);
    const compliance = checkContrastCompliance(cr.ratio, p.isLargeText ?? false);
    return {
      element: p.element,
      foreground: p.fg,
      background: p.bg,
      ratio: cr.ratio,
      isLargeText: p.isLargeText ?? false,
      ...compliance,
    };
  });
  const passingAA = checks.filter(c => c.passesAA).length;
  const passingAAA = checks.filter(c => c.passesAAA).length;
  return {
    checks,
    summary: {
      total: checks.length,
      passingAA,
      passingAAA,
      failing: checks.length - passingAA,
    },
    requirements: WCAG_CONTRAST_REQUIREMENTS,
  };
}

// Main Schema
export const PolishOutputSchema = z.object({
  library: z.object({ name: z.enum(['framer-motion', 'gsap', 'css-only']) }),
  animations: z.array(z.unknown()),
  transitions: z.unknown(),
  microInteractions: z.array(z.unknown()),
  scroll: z.unknown(),
  gestures: z.array(z.unknown()),
  loading: z.unknown(),
  effects: z.unknown(),
  performance: z.unknown(),
  accessibilityAudit: AccessibilityAuditSchema.optional(),
  constraints: z.array(z.string()).optional(),
  rationale: z.string().min(1),
});

export type PolishOutput = z.infer<typeof PolishOutputSchema>;

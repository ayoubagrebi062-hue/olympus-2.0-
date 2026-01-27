/**
 * OLYMPUS 2.1 - Design Token Gate
 *
 * Validates that all spacing, colors, typography, and motion values
 * are from the approved token system. No magic numbers allowed.
 *
 * Speed: <100ms (instant, deterministic)
 * Cost: $0 (no AI)
 */

import {
  DESIGN_TOKENS,
  SPACING_SCALE,
  MOTION,
  isValidSpacing,
  isValidDuration,
  isForbiddenEasing,
  getClosestValidSpacing,
  getClosestValidDuration,
} from '../design-tokens';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

export interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    filesChecked: number;
    errorsFound: number;
    warningsFound: number;
  };
}

export interface FileToCheck {
  path: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function tokenGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let filesChecked = 0;

  for (const file of files) {
    // Only check TSX/JSX/CSS files
    if (!file.path.match(/\.(tsx|jsx|css|scss)$/)) continue;
    filesChecked++;

    // Check spacing values
    const spacingIssues = validateSpacing(file.content, file.path);
    issues.push(...spacingIssues);

    // Check motion values
    const motionIssues = validateMotion(file.content, file.path);
    issues.push(...motionIssues);

    // Check for hardcoded colors
    const colorIssues = validateColors(file.content, file.path);
    issues.push(...colorIssues);

    // Check typography
    const typographyIssues = validateTypography(file.content, file.path);
    issues.push(...typographyIssues);
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return {
    passed: errors === 0,
    score: calculateScore(issues),
    issues,
    stats: {
      filesChecked,
      errorsFound: errors,
      warningsFound: warnings,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateSpacing(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Pattern matches Tailwind arbitrary values: m-[15px], p-[18px], gap-[22px]
  const arbitrarySpacingPattern = /(?:m|p|gap|space|inset|top|right|bottom|left)-\[(\d+)px\]/g;
  let match;

  while ((match = arbitrarySpacingPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!isValidSpacing(value)) {
      const closest = getClosestValidSpacing(value);
      const tailwindClass = DESIGN_TOKENS.spacing.toTailwind[closest];
      issues.push({
        rule: 'spacing-token',
        message: `Arbitrary spacing "${match[0]}" (${value}px) not in token scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}px`,
        expected: `${closest}px (use standard class like gap-${tailwindClass})`,
        autoFixable: true,
      });
    }
  }

  // Check for non-standard Tailwind spacing classes
  // Standard classes use: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
  // We'll flag unusual ones that might indicate magic numbers
  const suspiciousSpacingPattern = /(?:m|p|gap|space)-(\d+)/g;
  const validTailwindNumbers = new Set([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '14',
    '16',
    '20',
    '24',
    '28',
    '32',
    '36',
    '40',
    '44',
    '48',
    '52',
    '56',
    '60',
    '64',
    '72',
    '80',
    '96',
  ]);

  while ((match = suspiciousSpacingPattern.exec(content)) !== null) {
    const num = match[1];
    if (!validTailwindNumbers.has(num) && parseInt(num) > 0) {
      issues.push({
        rule: 'spacing-token',
        message: `Non-standard Tailwind spacing class "${match[0]}"`,
        severity: 'warning',
        file: path,
        line: getLineNumber(content, match.index),
        found: match[0],
        expected: 'Use standard Tailwind spacing scale',
        autoFixable: false,
      });
    }
  }

  // Check for hardcoded px values in inline styles
  const inlineStylePattern = /style=\{?\{[^}]*(?:margin|padding|gap):\s*['"]?(\d+)px['"]?/g;
  while ((match = inlineStylePattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!isValidSpacing(value)) {
      const closest = getClosestValidSpacing(value);
      issues.push({
        rule: 'spacing-token',
        message: `Hardcoded inline spacing "${value}px" not in token scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}px`,
        expected: `${closest}px or use Tailwind classes`,
        autoFixable: true,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateMotion(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const validDurations = Object.values(MOTION.duration) as number[];

  // Check Tailwind duration classes
  const durationPattern = /duration-\[?(\d+)(?:ms)?\]?/g;
  let match;

  while ((match = durationPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!validDurations.includes(value)) {
      const closest = getClosestValidDuration(value);
      issues.push({
        rule: 'motion-duration',
        message: `Duration ${value}ms not in token scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}ms`,
        expected: `${closest}ms (valid: ${validDurations.join(', ')})`,
        autoFixable: true,
      });
    }
  }

  // Check for transition duration in inline styles
  const inlineDurationPattern = /transition.*?(\d+)ms/g;
  while ((match = inlineDurationPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!validDurations.includes(value)) {
      const closest = getClosestValidDuration(value);
      issues.push({
        rule: 'motion-duration',
        message: `Inline transition duration ${value}ms not in token scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}ms`,
        expected: `${closest}ms`,
        autoFixable: true,
      });
    }
  }

  // Check for forbidden easings
  for (const forbidden of MOTION.forbiddenEasings) {
    const easingPattern = new RegExp(forbidden, 'gi');
    if (easingPattern.test(content)) {
      const easingMatch = content.match(easingPattern);
      issues.push({
        rule: 'motion-easing',
        message: `Forbidden easing "${forbidden}" found`,
        severity: 'error',
        file: path,
        found: forbidden,
        expected: 'Use ease-out, ease-in-out, or linear',
        autoFixable: true,
      });
    }
  }

  // Check for bounce/elastic animations
  const bouncePattern = /animate-bounce(?!-none)/g;
  if (bouncePattern.test(content)) {
    issues.push({
      rule: 'motion-easing',
      message: 'animate-bounce uses forbidden bounce easing',
      severity: 'warning',
      file: path,
      found: 'animate-bounce',
      expected: 'Use subtle animations with ease-out',
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateColors(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Find hardcoded hex colors
  const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let match;

  while ((match = hexPattern.exec(content)) !== null) {
    // Check context - is it in a valid place?
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // Allow in CSS variable definitions
    if (line.includes('--') || line.includes(':root')) continue;
    // Allow in design token files
    if (path.includes('design-tokens') || path.includes('tokens')) continue;
    // Allow in theme configuration
    if (path.includes('tailwind.config') || path.includes('theme')) continue;
    // Allow in comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    issues.push({
      rule: 'color-token',
      message: `Hardcoded color "${match[0]}" found`,
      severity: 'warning',
      file: path,
      line: getLineNumber(content, match.index),
      found: match[0],
      expected: 'Use semantic color token (e.g., text-primary, bg-surface)',
      autoFixable: false,
    });
  }

  // Check for rgb/rgba hardcoded values
  const rgbPattern = /rgb\([\d\s,]+\)|rgba\([\d\s,.]+\)/g;
  while ((match = rgbPattern.exec(content)) !== null) {
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // Skip if in CSS variable definition or allowed files
    if (line.includes('--') || path.includes('design-tokens') || path.includes('tailwind.config'))
      continue;

    issues.push({
      rule: 'color-token',
      message: `Hardcoded RGB color "${match[0]}" found`,
      severity: 'warning',
      file: path,
      line: getLineNumber(content, match.index),
      found: match[0],
      expected: 'Use semantic color token',
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateTypography(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Check for arbitrary font sizes
  const arbitraryFontPattern = /text-\[(\d+)px\]/g;
  let match;

  const validFontSizes = Object.values(DESIGN_TOKENS.typography.fontSize) as number[];

  while ((match = arbitraryFontPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!validFontSizes.includes(value)) {
      const closest = validFontSizes.reduce((prev, curr) =>
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      );
      const sizeKey = Object.entries(DESIGN_TOKENS.typography.fontSize).find(
        ([_, v]) => v === closest
      )?.[0];

      issues.push({
        rule: 'typography-token',
        message: `Arbitrary font size "${match[0]}" not in type scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}px`,
        expected: `${closest}px (text-${sizeKey})`,
        autoFixable: true,
      });
    }
  }

  // Check for inline font-size styles
  const inlineFontPattern = /style=\{?\{[^}]*fontSize:\s*['"]?(\d+)(?:px)?['"]?/g;
  while ((match = inlineFontPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (!validFontSizes.includes(value)) {
      issues.push({
        rule: 'typography-token',
        message: `Hardcoded inline font-size "${value}px" not in type scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}px`,
        expected: `Use Tailwind text-* classes`,
        autoFixable: true,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function calculateScore(issues: GateIssue[]): number {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  // Start at 100, subtract 10 per error, 2 per warning
  const score = Math.max(0, 100 - errors * 10 - warnings * 2);
  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const designTokenGate = {
  name: 'Token Gate',
  description: 'Validates spacing, colors, typography, and motion against design tokens',
  type: 'design-tokens' as const,
  check: tokenGate,
};

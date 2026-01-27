/**
 * OLYMPUS 2.1 - Motion System Gate
 *
 * Validates that all animations follow the motion system rules:
 * - Approved durations only
 * - Approved easings only
 * - Every animation has a purpose
 * - Reduced motion support
 *
 * Speed: <100ms (instant, deterministic)
 * Cost: $0 (no AI)
 */

import { MOTION } from '../design-tokens';

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
    animationsFound: number;
    reducedMotionSupport: boolean;
  };
}

export interface FileToCheck {
  path: string;
  content: string;
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
  return Math.max(0, 100 - (errors * 10) - (warnings * 5));
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDUCED MOTION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateReducedMotion(content: string, path: string): { issues: GateIssue[]; hasSupport: boolean } {
  const issues: GateIssue[] = [];

  // Check if file has animations
  const hasAnimations =
    content.includes('animate-') ||
    content.includes('transition-') ||
    content.includes('motion') ||
    content.includes('@keyframes') ||
    content.includes('framer-motion') ||
    content.includes('useSpring') ||
    content.includes('useAnimation');

  if (!hasAnimations) {
    return { issues: [], hasSupport: true };
  }

  // Check for reduced motion support
  const hasReducedMotionCheck =
    content.includes('prefers-reduced-motion') ||
    content.includes('prefersReducedMotion') ||
    content.includes('useReducedMotion') ||
    content.includes('motion-reduce:') ||
    content.includes('reducedMotion');

  if (!hasReducedMotionCheck) {
    issues.push({
      rule: 'reduced-motion',
      message: 'Animations present but no prefers-reduced-motion support',
      severity: 'warning',
      file: path,
      found: 'Animations without reduced motion check',
      expected: 'Add prefers-reduced-motion media query or useReducedMotion hook',
      autoFixable: false,
    });
  }

  return { issues, hasSupport: hasReducedMotionCheck };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAnimations(content: string, path: string): { issues: GateIssue[]; count: number } {
  const issues: GateIssue[] = [];
  let animationCount = 0;

  // Check for forbidden easings
  for (const forbidden of MOTION.forbiddenEasings) {
    const pattern = new RegExp(`(?:ease|animation|transition)[^;\\n]*${forbidden}`, 'gi');
    let match;

    while ((match = pattern.exec(content)) !== null) {
      issues.push({
        rule: 'forbidden-easing',
        message: `Forbidden easing "${forbidden}" found`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: forbidden,
        expected: 'Use ease-out, ease-in-out, or linear only',
        autoFixable: true,
      });
    }
  }

  // Check for decorative animations without purpose
  const decorativePatterns = [
    { pattern: /animate-pulse(?![^"'\s]*loading)/gi, name: 'pulse', context: 'loading' },
    { pattern: /animate-bounce/gi, name: 'bounce', context: 'notification' },
    { pattern: /animate-spin(?![^"'\s]*loading)/gi, name: 'spin', context: 'loading' },
    { pattern: /animate-ping/gi, name: 'ping', context: 'notification' },
  ];

  for (const { pattern, name, context } of decorativePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Check if it's in a loading or appropriate context
      const surrounding = content.substring(
        Math.max(0, match.index - 100),
        match.index + 100
      );

      const hasValidContext =
        surrounding.toLowerCase().includes('loading') ||
        surrounding.toLowerCase().includes('spinner') ||
        surrounding.toLowerCase().includes('skeleton') ||
        surrounding.includes('aria-busy');

      if (!hasValidContext && name !== 'spin') {
        issues.push({
          rule: 'decorative-animation',
          message: `Animation "animate-${name}" appears decorative`,
          severity: 'warning',
          file: path,
          line: getLineNumber(content, match.index),
          found: `animate-${name}`,
          expected: `Animations should communicate state change. ${name} is typically for ${context}.`,
          autoFixable: false,
        });
      }
      animationCount++;
    }
  }

  // Count all animations
  const animationClasses = content.match(/animate-\w+/g) || [];
  const transitionClasses = content.match(/transition-\w+/g) || [];
  animationCount = Math.max(animationCount, animationClasses.length + transitionClasses.length);

  // Check for excessive animations
  if (animationCount > 10) {
    issues.push({
      rule: 'excessive-animation',
      message: `File has ${animationCount} animations`,
      severity: 'warning',
      file: path,
      found: `${animationCount} animations`,
      expected: 'Consider if all animations are necessary. Less is often more.',
      autoFixable: false,
    });
  }

  return { issues, count: animationCount };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DURATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateDurations(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const validDurations = Object.values(MOTION.duration) as number[];

  // Check inline duration values
  const durationPattern = /duration[:\s-]+['"]?(\d+)(?:ms)?['"]?/gi;
  let match;

  while ((match = durationPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);

    // Skip if it's clearly a Tailwind class number
    if (match[0].includes('duration-') && value < 50) continue;

    // Convert Tailwind duration class to ms if needed
    const msValue = value < 50 ? value * 10 : value; // Tailwind uses increments

    if (!validDurations.includes(msValue) && !validDurations.includes(value)) {
      const closest = validDurations.reduce((prev, curr) =>
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      );

      issues.push({
        rule: 'motion-duration',
        message: `Duration ${value}${value < 50 ? '' : 'ms'} not in token scale`,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}${value < 50 ? '' : 'ms'}`,
        expected: `Use ${closest}ms (valid: ${validDurations.join(', ')})`,
        autoFixable: true,
      });
    }
  }

  // Check for very long animations
  const longDurationPattern = /duration[:\s-]+['"]?(\d{4,})(?:ms)?['"]?/gi;
  while ((match = longDurationPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);
    if (value > 1000) {
      issues.push({
        rule: 'long-animation',
        message: `Animation duration ${value}ms is very long`,
        severity: 'warning',
        file: path,
        line: getLineNumber(content, match.index),
        found: `${value}ms`,
        expected: 'Most UI animations should be 100-500ms. Long animations feel sluggish.',
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateTransitions(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Check for transition: all (performance issue)
  const transitionAllPattern = /transition:\s*all/gi;
  let match;

  while ((match = transitionAllPattern.exec(content)) !== null) {
    issues.push({
      rule: 'transition-all',
      message: '"transition: all" can cause performance issues',
      severity: 'warning',
      file: path,
      line: getLineNumber(content, match.index),
      found: 'transition: all',
      expected: 'Specify exact properties: transition: opacity, transform',
      autoFixable: false,
    });
  }

  // Check for transitions without will-change on complex animations
  const complexAnimations = content.match(/(?:transform|filter|clip-path)[^;]*transition/gi) || [];
  const hasWillChange = content.includes('will-change');

  if (complexAnimations.length > 3 && !hasWillChange) {
    issues.push({
      rule: 'animation-performance',
      message: 'Complex animations without will-change hint',
      severity: 'warning',
      file: path,
      found: `${complexAnimations.length} complex transitions`,
      expected: 'Consider adding will-change for transform/filter animations',
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function motionGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let filesChecked = 0;
  let totalAnimations = 0;
  let hasReducedMotionSupport = false;

  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx|css|scss)$/)) continue;
    filesChecked++;

    // Reduced motion check
    const reducedMotion = validateReducedMotion(file.content, file.path);
    issues.push(...reducedMotion.issues);
    if (reducedMotion.hasSupport) hasReducedMotionSupport = true;

    // Animation validation
    const animations = validateAnimations(file.content, file.path);
    issues.push(...animations.issues);
    totalAnimations += animations.count;

    // Duration validation
    const durationIssues = validateDurations(file.content, file.path);
    issues.push(...durationIssues);

    // Transition validation
    const transitionIssues = validateTransitions(file.content, file.path);
    issues.push(...transitionIssues);
  }

  const errors = issues.filter(i => i.severity === 'error').length;

  return {
    passed: errors === 0,
    score: calculateScore(issues),
    issues,
    stats: {
      filesChecked,
      animationsFound: totalAnimations,
      reducedMotionSupport: hasReducedMotionSupport,
    },
  };
}

export const motionSystemGate = {
  name: 'Motion Gate',
  description: 'Validates animations, durations, easings, and reduced motion support',
  type: 'motion-system' as const,
  check: motionGate,
};

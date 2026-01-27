/**
 * COMPLEXITY GATE VALIDATOR
 * Ensures generated code has sufficient complexity for the requested feature
 *
 * A "dashboard" with only 10 lines of code is clearly a stub.
 * A "form" with no state management is incomplete.
 */

export interface ComplexityMetrics {
  // Basic metrics
  lineCount: number;
  characterCount: number;

  // Component metrics
  componentCount: number; // Function/const components
  jsxElementCount: number; // JSX elements used
  uniqueComponentsUsed: number; // Unique PascalCase components

  // Logic metrics
  handlerCount: number; // Event handlers
  stateHookCount: number; // useState, useReducer
  effectHookCount: number; // useEffect, useMemo, useCallback
  customHookCount: number; // use* hooks

  // Structure metrics
  importCount: number; // Import statements
  exportCount: number; // Export statements
  conditionalCount: number; // if, ternary, &&
  loopCount: number; // map, forEach, for, while
}

export interface ComplexityThreshold {
  name: string;
  min: Partial<ComplexityMetrics>;
  description: string;
}

export interface ComplexityValidationResult {
  valid: boolean;
  score: number; // 0-100
  metrics: ComplexityMetrics;
  threshold: ComplexityThreshold;
  violations: Array<{
    metric: string;
    actual: number;
    required: number;
    message: string;
  }>;
}

/**
 * Complexity thresholds by page type
 *
 * CRITICAL FIX (Jan 2026): Increased thresholds to match PIXEL agent rules:
 * - Dashboard: 150 lines minimum (was 80)
 * - Pages: 80 lines minimum (was 50-70)
 * - Components: 30 lines minimum (was 20)
 *
 * These match the PIXEL V2 ANTI-STUB RULES in frontend.ts
 */
export const COMPLEXITY_THRESHOLDS: Record<string, ComplexityThreshold> = {
  // Full pages - PIXEL rules: "Dashboard pages minimum 150 lines"
  dashboard: {
    name: 'Dashboard Page',
    min: {
      lineCount: 150, // INCREASED from 80 - match PIXEL rules
      componentCount: 3, // INCREASED from 2
      uniqueComponentsUsed: 8, // INCREASED from 5 - "8 unique UI components"
      stateHookCount: 2, // INCREASED from 1 - need real state management
      handlerCount: 3, // INCREASED from 2 - need real handlers
      importCount: 8, // INCREASED from 5
    },
    description:
      'Dashboard pages need stat cards, charts, tables, and multiple interactions per PIXEL rules',
  },

  list: {
    name: 'List/Table Page',
    min: {
      lineCount: 80, // INCREASED from 60 - match PIXEL page rules
      componentCount: 2, // INCREASED from 1
      uniqueComponentsUsed: 5, // INCREASED from 4
      stateHookCount: 2, // ADDED - need loading/data state
      loopCount: 1,
      handlerCount: 2, // ADDED - need CRUD handlers
      importCount: 6, // INCREASED from 4
    },
    description: 'List pages need data mapping, loading states, empty states, and handlers',
  },

  detail: {
    name: 'Detail Page',
    min: {
      lineCount: 80, // INCREASED from 50 - match PIXEL page rules
      componentCount: 2, // INCREASED from 1
      uniqueComponentsUsed: 5, // INCREASED from 3
      stateHookCount: 1, // ADDED
      conditionalCount: 3, // INCREASED from 2 - loading/error/empty states
      handlerCount: 2, // ADDED - edit/delete handlers
      importCount: 5, // INCREASED from 3
    },
    description: 'Detail pages need conditional rendering, actions, and state handling',
  },

  form: {
    name: 'Form Page',
    min: {
      lineCount: 80, // INCREASED from 70 - match PIXEL page rules
      componentCount: 1,
      uniqueComponentsUsed: 5, // ADDED - need form components
      handlerCount: 3, // INCREASED from 2 - validate, submit, reset
      stateHookCount: 2, // INCREASED from 1 - form state + loading
      conditionalCount: 2, // ADDED - error/success states
      importCount: 6, // INCREASED from 4
    },
    description: 'Form pages need validation, error states, success feedback, and loading states',
  },

  auth: {
    name: 'Auth Page',
    min: {
      lineCount: 80, // INCREASED from 50 - match PIXEL page rules
      componentCount: 1,
      uniqueComponentsUsed: 4, // ADDED
      handlerCount: 2, // INCREASED from 1 - submit + social auth
      stateHookCount: 2, // ADDED - form state + loading
      importCount: 5, // INCREASED from 3
    },
    description: 'Auth pages need form handling, validation, error display, and navigation',
  },

  // Components - PIXEL rules: "Minimum 30 lines of code"
  component: {
    name: 'UI Component',
    min: {
      lineCount: 30, // INCREASED from 20 - match PIXEL rules
      jsxElementCount: 5, // INCREASED from 3
    },
    description: 'Components need meaningful JSX structure with multiple elements',
  },

  // Layouts
  layout: {
    name: 'Layout Component',
    min: {
      lineCount: 50, // INCREASED from 30
      componentCount: 1,
      uniqueComponentsUsed: 4, // INCREASED from 2
    },
    description: 'Layouts need header, sidebar/nav, main content area, and mobile handling',
  },

  // Default for unknown types - still needs minimum viable code
  default: {
    name: 'Generic Code',
    min: {
      lineCount: 30, // INCREASED from 15 - match PIXEL component minimum
      jsxElementCount: 3, // INCREASED from 2
    },
    description: 'Minimum viable code structure per PIXEL anti-stub rules',
  },
};

/**
 * Calculate complexity metrics for code
 */
export function calculateComplexity(code: string): ComplexityMetrics {
  const lines = code.split('\n');

  return {
    // Basic
    lineCount: lines.length,
    characterCount: code.length,

    // Components
    componentCount: (code.match(/(?:function|const)\s+[A-Z]\w*\s*(?:=|:|\()/g) || []).length,
    jsxElementCount: (code.match(/<[A-Za-z][^>]*>/g) || []).length,
    uniqueComponentsUsed: new Set((code.match(/<([A-Z][a-zA-Z0-9]*)/g) || []).map(m => m.slice(1)))
      .size,

    // Logic
    handlerCount: (code.match(/on[A-Z]\w*\s*=/g) || []).length,
    stateHookCount: (code.match(/useState|useReducer/g) || []).length,
    effectHookCount: (code.match(/useEffect|useMemo|useCallback|useLayoutEffect/g) || []).length,
    customHookCount: (code.match(/\buse[A-Z]\w*\(/g) || []).length,

    // Structure
    importCount: (code.match(/^import\s/gm) || []).length,
    exportCount: (code.match(/^export\s/gm) || []).length,
    conditionalCount: (code.match(/\?|&&|\|\||if\s*\(/g) || []).length,
    loopCount: (code.match(/\.map\(|\.forEach\(|\.filter\(|\.reduce\(|for\s*\(|while\s*\(/g) || [])
      .length,
  };
}

/**
 * Infer page type from file path and content
 */
export function inferPageType(filePath: string, code: string): string {
  const path = filePath.toLowerCase();
  const content = code.toLowerCase();

  // Check path patterns
  if (path.includes('dashboard')) return 'dashboard';
  if (path.includes('login') || path.includes('signup') || path.includes('auth')) return 'auth';
  if (path.includes('form') || path.includes('create') || path.includes('edit')) return 'form';
  if (path.includes('layout')) return 'layout';
  if (path.includes('[') && path.includes(']')) return 'detail'; // Dynamic routes

  // Check content patterns
  if (content.includes('dashboard') || content.includes('statcard') || content.includes('metrics'))
    return 'dashboard';
  if (content.includes('datatable') || content.includes('<table') || content.includes('.map('))
    return 'list';
  if (content.includes('useform') || content.includes('onsubmit')) return 'form';
  if (content.includes('signin') || content.includes('signup') || content.includes('password'))
    return 'auth';

  // Check if it's a component (not in app/ or pages/)
  if (!path.includes('/app/') && !path.includes('/pages/')) return 'component';

  return 'default';
}

/**
 * Validate code complexity against threshold
 */
export function validateComplexity(
  code: string,
  filePath: string,
  overrideType?: string
): ComplexityValidationResult {
  const metrics = calculateComplexity(code);
  const pageType = overrideType || inferPageType(filePath, code);
  const threshold = COMPLEXITY_THRESHOLDS[pageType] || COMPLEXITY_THRESHOLDS.default;

  const violations: Array<{
    metric: string;
    actual: number;
    required: number;
    message: string;
  }> = [];

  // Check each threshold
  for (const [metric, minValue] of Object.entries(threshold.min)) {
    const actualValue = metrics[metric as keyof ComplexityMetrics] as number;
    if (actualValue < minValue) {
      violations.push({
        metric,
        actual: actualValue,
        required: minValue,
        message: `${metric}: ${actualValue} < ${minValue} required`,
      });
    }
  }

  // Calculate score
  const totalChecks = Object.keys(threshold.min).length;
  const passedChecks = totalChecks - violations.length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  // CRITICAL FIX: Stricter validation - must pass 90% of checks
  // Previous 70% threshold allowed dashboard pages with only 80 lines (50% of required 150)
  // Now requires at least 90% compliance, with special handling for critical metrics
  const hasCriticalViolation = violations.some(
    v => v.metric === 'lineCount' || v.metric === 'handlerCount' || v.metric === 'stateHookCount'
  );

  return {
    valid: violations.length === 0 || (score >= 90 && !hasCriticalViolation),
    score,
    metrics,
    threshold,
    violations,
  };
}

/**
 * Generate complexity report
 */
export function generateComplexityReport(result: ComplexityValidationResult): string {
  const lines: string[] = [
    '## Complexity Analysis Report',
    '',
    `**Page Type:** ${result.threshold.name}`,
    `**Score:** ${result.score}%`,
    `**Status:** ${result.valid ? 'PASS' : 'FAIL'}`,
    '',
    '### Metrics',
    `- Lines: ${result.metrics.lineCount}`,
    `- Components: ${result.metrics.componentCount}`,
    `- Unique Components Used: ${result.metrics.uniqueComponentsUsed}`,
    `- State Hooks: ${result.metrics.stateHookCount}`,
    `- Handlers: ${result.metrics.handlerCount}`,
    `- Imports: ${result.metrics.importCount}`,
    '',
  ];

  if (result.violations.length > 0) {
    lines.push('### Violations');
    for (const v of result.violations) {
      lines.push(`- ${v.message}`);
    }
    lines.push('');
    lines.push(`**Requirement:** ${result.threshold.description}`);
  }

  return lines.join('\n');
}

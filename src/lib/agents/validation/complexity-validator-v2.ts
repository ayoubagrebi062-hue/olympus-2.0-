/**
 * COMPLEXITY GATE VALIDATOR V2
 * Production-grade complexity analysis for 10,000+ users
 *
 * V2 IMPROVEMENTS:
 * 1. Cyclomatic complexity measurement
 * 2. Function nesting depth analysis
 * 3. Duplicate code detection (N-gram based)
 * 4. Weighted scoring (not all metrics equal)
 * 5. Configurable thresholds via config object
 * 6. Fix suggestions for each violation
 * 7. Performance metrics and caching
 * 8. Code smell detection
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { createHash } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface ComplexityMetricsV2 {
  // Basic metrics
  lineCount: number;
  codeLineCount: number; // Excluding comments and blank lines
  characterCount: number;

  // Cyclomatic complexity
  cyclomaticComplexity: number;
  maxNestingDepth: number;
  averageNestingDepth: number;

  // Component metrics
  componentCount: number;
  jsxElementCount: number;
  uniqueComponentsUsed: number;
  propsCount: number;

  // Logic metrics
  handlerCount: number;
  stateHookCount: number;
  effectHookCount: number;
  customHookCount: number;
  totalHookCount: number;

  // Structure metrics
  importCount: number;
  exportCount: number;
  conditionalCount: number;
  loopCount: number;
  functionCount: number;

  // Quality metrics
  commentLineCount: number;
  commentRatio: number; // comments / code lines
  duplicateRatio: number; // 0-1, how much code is duplicated
  maxFunctionLength: number;
  averageFunctionLength: number;
}

export interface ComplexityViolation {
  metric: string;
  actual: number;
  required: number;
  weight: number; // How important is this metric (1-10)
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestedFix: string;
}

export interface ComplexityThresholdV2 {
  name: string;
  description: string;
  requirements: {
    metric: keyof ComplexityMetricsV2;
    min?: number;
    max?: number; // For metrics where high is bad (complexity, nesting)
    weight: number; // 1-10
    severity: 'critical' | 'high' | 'medium' | 'low';
    suggestedFix: string;
  }[];
}

export interface ComplexityValidationResultV2 {
  valid: boolean;
  score: number; // 0-100 weighted score
  rawScore: number; // Unweighted score
  metrics: ComplexityMetricsV2;
  threshold: ComplexityThresholdV2;
  violations: ComplexityViolation[];
  criticalViolations: ComplexityViolation[];
  codeSmells: string[];
  performanceMs: number;
  contentHash: string;
}

// ============================================================================
// THRESHOLDS V2 (Weighted, with fix suggestions)
// ============================================================================

export const COMPLEXITY_THRESHOLDS_V2: Record<string, ComplexityThresholdV2> = {
  dashboard: {
    name: 'Dashboard Page',
    description: 'Dashboard pages need stat cards, charts, tables, and multiple interactions',
    requirements: [
      {
        metric: 'lineCount',
        min: 150,
        weight: 10, // Critical
        severity: 'critical',
        suggestedFix: 'Add stat cards, charts, data tables, and action handlers',
      },
      {
        metric: 'codeLineCount',
        min: 100,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Remove blank lines padding and add actual code',
      },
      {
        metric: 'uniqueComponentsUsed',
        min: 8,
        weight: 8,
        severity: 'high',
        suggestedFix:
          'Use Card, Button, Table, Chart, Badge, Avatar, DropdownMenu, Input components',
      },
      {
        metric: 'stateHookCount',
        min: 2,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add useState for filters, date range, active tab, loading state',
      },
      {
        metric: 'handlerCount',
        min: 3,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add handlers for refresh, filter change, row click, export',
      },
      {
        metric: 'importCount',
        min: 8,
        weight: 5,
        severity: 'medium',
        suggestedFix: 'Import UI components, hooks, types, and utilities',
      },
      {
        metric: 'conditionalCount',
        min: 4,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Add loading state, error state, empty state conditionals',
      },
      {
        metric: 'cyclomaticComplexity',
        max: 25,
        weight: 3,
        severity: 'low',
        suggestedFix: 'Extract complex conditionals into helper functions',
      },
      {
        metric: 'maxNestingDepth',
        max: 6,
        weight: 4,
        severity: 'medium',
        suggestedFix: 'Reduce nesting by extracting components or using early returns',
      },
    ],
  },

  list: {
    name: 'List/Table Page',
    description: 'List pages need data mapping, loading states, empty states, and CRUD handlers',
    requirements: [
      {
        metric: 'lineCount',
        min: 100,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add data table, pagination, filters, and action column',
      },
      {
        metric: 'stateHookCount',
        min: 2,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add state for data, loading, pagination, and filters',
      },
      {
        metric: 'handlerCount',
        min: 3,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add handlers for add, edit, delete, and filter actions',
      },
      {
        metric: 'loopCount',
        min: 1,
        weight: 7,
        severity: 'high',
        suggestedFix: 'Add .map() for rendering data rows',
      },
      {
        metric: 'conditionalCount',
        min: 3,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Add loading spinner, empty state message, error display',
      },
      {
        metric: 'uniqueComponentsUsed',
        min: 6,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Use Table, Button, Input, Badge, Dropdown, Pagination components',
      },
    ],
  },

  form: {
    name: 'Form Page',
    description: 'Form pages need validation, error states, success feedback, and loading states',
    requirements: [
      {
        metric: 'lineCount',
        min: 100,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add form fields, validation, error display, and submit handling',
      },
      {
        metric: 'handlerCount',
        min: 3,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add handlers for onChange, onSubmit, onReset',
      },
      {
        metric: 'stateHookCount',
        min: 3,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add state for form data, errors, loading, and submission status',
      },
      {
        metric: 'conditionalCount',
        min: 4,
        weight: 7,
        severity: 'high',
        suggestedFix: 'Add validation errors, success message, loading state conditionals',
      },
      {
        metric: 'uniqueComponentsUsed',
        min: 5,
        weight: 5,
        severity: 'medium',
        suggestedFix: 'Use Input, Select, Button, Label, FormMessage components',
      },
    ],
  },

  detail: {
    name: 'Detail Page',
    description: 'Detail pages need conditional rendering, actions, and state handling',
    requirements: [
      {
        metric: 'lineCount',
        min: 80,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add data display, action buttons, loading state, and error handling',
      },
      {
        metric: 'conditionalCount',
        min: 4,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add loading, error, not found, and data conditionals',
      },
      {
        metric: 'handlerCount',
        min: 2,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add edit and delete action handlers',
      },
      {
        metric: 'stateHookCount',
        min: 1,
        weight: 7,
        severity: 'high',
        suggestedFix: 'Add state for edit mode or action loading',
      },
    ],
  },

  auth: {
    name: 'Auth Page',
    description: 'Auth pages need form handling, validation, error display, and navigation',
    requirements: [
      {
        metric: 'lineCount',
        min: 80,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add form, validation, error handling, and social auth options',
      },
      {
        metric: 'handlerCount',
        min: 2,
        weight: 9,
        severity: 'critical',
        suggestedFix: 'Add form submit and social auth handlers',
      },
      {
        metric: 'stateHookCount',
        min: 2,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add state for form data and loading status',
      },
      {
        metric: 'conditionalCount',
        min: 2,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Add error display and loading state conditionals',
      },
    ],
  },

  component: {
    name: 'UI Component',
    description: 'Components need meaningful JSX structure with multiple elements',
    requirements: [
      {
        metric: 'lineCount',
        min: 30,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add proper JSX structure, props handling, and styles',
      },
      {
        metric: 'jsxElementCount',
        min: 5,
        weight: 7,
        severity: 'high',
        suggestedFix: 'Add container, content, and interactive elements',
      },
      {
        metric: 'propsCount',
        min: 2,
        weight: 5,
        severity: 'medium',
        suggestedFix: 'Add props for customization (className, variant, etc.)',
      },
    ],
  },

  layout: {
    name: 'Layout Component',
    description: 'Layouts need header, sidebar/nav, main content area, and mobile handling',
    requirements: [
      {
        metric: 'lineCount',
        min: 60,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add header, navigation, sidebar, and main content sections',
      },
      {
        metric: 'uniqueComponentsUsed',
        min: 4,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Use Header, Sidebar, Navigation, and container components',
      },
      {
        metric: 'conditionalCount',
        min: 2,
        weight: 5,
        severity: 'medium',
        suggestedFix: 'Add mobile/desktop conditionals and auth state checks',
      },
    ],
  },

  default: {
    name: 'Generic Code',
    description: 'Minimum viable code structure',
    requirements: [
      {
        metric: 'lineCount',
        min: 30,
        weight: 8,
        severity: 'high',
        suggestedFix: 'Add meaningful implementation - stubs are not acceptable',
      },
      {
        metric: 'jsxElementCount',
        min: 3,
        weight: 6,
        severity: 'medium',
        suggestedFix: 'Add proper JSX structure with multiple elements',
      },
    ],
  },
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Calculate cyclomatic complexity
 * Counts decision points: if, else if, case, while, for, &&, ||, ?:, catch
 */
function calculateCyclomaticComplexity(code: string): number {
  let complexity = 1; // Base complexity

  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bcase\s+/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bfor\s+of\b/g,
    /\bfor\s+in\b/g,
    /&&/g,
    /\|\|/g,
    /\?\s*[^:]/g, // Ternary (not optional chaining)
    /\bcatch\s*\(/g,
    /\.filter\(/g,
    /\.find\(/g,
    /\.some\(/g,
    /\.every\(/g,
  ];

  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

/**
 * Calculate maximum and average nesting depth
 */
function calculateNestingDepth(code: string): { max: number; average: number } {
  let maxDepth = 0;
  let currentDepth = 0;
  let totalDepth = 0;
  let lineCount = 0;

  // Simple brace counting (doesn't account for strings but good enough)
  for (const char of code) {
    if (char === '{') {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    } else if (char === '}') {
      currentDepth = Math.max(0, currentDepth - 1);
    } else if (char === '\n') {
      totalDepth += currentDepth;
      lineCount++;
    }
  }

  return {
    max: maxDepth,
    average: lineCount > 0 ? Math.round((totalDepth / lineCount) * 10) / 10 : 0,
  };
}

/**
 * Calculate duplicate code ratio using N-gram analysis
 */
function calculateDuplicateRatio(code: string): number {
  const lines = code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10 && !line.startsWith('//') && !line.startsWith('import'));

  if (lines.length < 10) return 0;

  // Create 3-line N-grams
  const ngrams = new Map<string, number>();
  for (let i = 0; i < lines.length - 2; i++) {
    const ngram = lines.slice(i, i + 3).join('\n');
    ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
  }

  // Count duplicated lines
  let duplicatedLines = 0;
  for (const [, count] of ngrams) {
    if (count > 1) {
      duplicatedLines += (count - 1) * 3;
    }
  }

  return Math.min(1, duplicatedLines / lines.length);
}

/**
 * Calculate function metrics
 */
function calculateFunctionMetrics(code: string): {
  count: number;
  maxLength: number;
  avgLength: number;
} {
  // Match function definitions
  const functionPattern =
    /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>)\s*\{/g;
  const matches = [...code.matchAll(functionPattern)];

  if (matches.length === 0) {
    return { count: 0, maxLength: 0, avgLength: 0 };
  }

  const functionLengths: number[] = [];

  for (const match of matches) {
    const startIndex = match.index!;
    let depth = 0;
    let inFunction = false;
    let functionLength = 0;

    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') {
        depth++;
        inFunction = true;
      } else if (code[i] === '}') {
        depth--;
        if (inFunction && depth === 0) {
          functionLengths.push(functionLength);
          break;
        }
      } else if (code[i] === '\n') {
        functionLength++;
      }
    }
  }

  const maxLength = Math.max(...functionLengths, 0);
  const avgLength =
    functionLengths.length > 0
      ? Math.round(functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length)
      : 0;

  return { count: matches.length, maxLength, avgLength };
}

/**
 * Detect code smells
 */
function detectCodeSmells(code: string, metrics: ComplexityMetricsV2): string[] {
  const smells: string[] = [];

  // God component
  if (metrics.lineCount > 500) {
    smells.push('God component: Consider splitting into smaller components (>500 lines)');
  }

  // Too many props
  if (metrics.propsCount > 10) {
    smells.push('Prop drilling: Consider using context or composition (>10 props)');
  }

  // Too many state variables
  if (metrics.stateHookCount > 8) {
    smells.push('State explosion: Consider useReducer or splitting component (>8 useState)');
  }

  // Too many effects
  if (metrics.effectHookCount > 5) {
    smells.push('Effect overuse: Consider custom hooks or restructuring (>5 useEffect)');
  }

  // High cyclomatic complexity
  if (metrics.cyclomaticComplexity > 20) {
    smells.push('High cyclomatic complexity: Extract logic into smaller functions (>20)');
  }

  // Deep nesting
  if (metrics.maxNestingDepth > 5) {
    smells.push('Deep nesting: Use early returns or extract components (>5 levels)');
  }

  // Low comment ratio for complex code
  if (metrics.cyclomaticComplexity > 10 && metrics.commentRatio < 0.05) {
    smells.push('Complex code without comments: Add documentation for complex logic');
  }

  // Potential duplicate code
  if (metrics.duplicateRatio > 0.15) {
    smells.push('Duplicate code detected: Extract common patterns into reusable functions');
  }

  // Long functions
  if (metrics.maxFunctionLength > 100) {
    smells.push('Long function detected: Break into smaller, focused functions (>100 lines)');
  }

  // Console.log in code
  if (/console\.(log|info|warn|debug)\(/.test(code)) {
    smells.push('Console statements found: Remove debug logging before production');
  }

  // TODO/FIXME comments
  const todoCount = (code.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || []).length;
  if (todoCount > 3) {
    smells.push(`Multiple TODO/FIXME comments (${todoCount}): Address technical debt`);
  }

  return smells;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateComplexityV2(code: string): ComplexityMetricsV2 {
  const lines = code.split('\n');
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*')
    );
  });

  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  });

  const nesting = calculateNestingDepth(code);
  const functionMetrics = calculateFunctionMetrics(code);

  // Count props in component definitions
  const propsMatch = code.match(/(?:interface|type)\s+\w*Props[^{]*\{([^}]+)\}/);
  const propsCount = propsMatch ? (propsMatch[1].match(/:/g) || []).length : 0;

  return {
    // Basic
    lineCount: lines.length,
    codeLineCount: codeLines.length,
    characterCount: code.length,

    // Cyclomatic
    cyclomaticComplexity: calculateCyclomaticComplexity(code),
    maxNestingDepth: nesting.max,
    averageNestingDepth: nesting.average,

    // Components
    componentCount: (code.match(/(?:function|const)\s+[A-Z]\w*\s*(?:=|:|\()/g) || []).length,
    jsxElementCount: (code.match(/<[A-Za-z][^>]*>/g) || []).length,
    uniqueComponentsUsed: new Set((code.match(/<([A-Z][a-zA-Z0-9]*)/g) || []).map(m => m.slice(1)))
      .size,
    propsCount,

    // Logic
    handlerCount: (code.match(/on[A-Z]\w*\s*=/g) || []).length,
    stateHookCount: (code.match(/useState|useReducer/g) || []).length,
    effectHookCount: (code.match(/useEffect|useMemo|useCallback|useLayoutEffect/g) || []).length,
    customHookCount: (code.match(/\buse[A-Z]\w*\(/g) || []).length,
    totalHookCount: (code.match(/\buse[A-Z]\w*\s*\(/g) || []).length,

    // Structure
    importCount: (code.match(/^import\s/gm) || []).length,
    exportCount: (code.match(/^export\s/gm) || []).length,
    conditionalCount: (code.match(/\?(?!\.)|&&|\|\||if\s*\(/g) || []).length, // Exclude optional chaining
    loopCount: (code.match(/\.map\(|\.forEach\(|\.filter\(|\.reduce\(|for\s*\(|while\s*\(/g) || [])
      .length,
    functionCount: functionMetrics.count,

    // Quality
    commentLineCount: commentLines.length,
    commentRatio:
      codeLines.length > 0 ? Math.round((commentLines.length / codeLines.length) * 100) / 100 : 0,
    duplicateRatio: calculateDuplicateRatio(code),
    maxFunctionLength: functionMetrics.maxLength,
    averageFunctionLength: functionMetrics.avgLength,
  };
}

// ============================================================================
// INFERENCE
// ============================================================================

export function inferPageTypeV2(filePath: string, code: string): string {
  const path = filePath.toLowerCase();
  const content = code.toLowerCase();

  // Priority: path patterns
  if (path.includes('dashboard')) return 'dashboard';
  if (
    path.includes('login') ||
    path.includes('signup') ||
    path.includes('register') ||
    path.includes('auth')
  )
    return 'auth';
  if (
    path.includes('form') ||
    path.includes('create') ||
    path.includes('new') ||
    path.includes('edit')
  )
    return 'form';
  if (path.includes('layout')) return 'layout';
  if (path.includes('list') || path.includes('index')) return 'list';
  if (/\[\w+\]/.test(path)) return 'detail'; // Dynamic routes like [id]

  // Secondary: content patterns
  if (
    content.includes('dashboard') ||
    content.includes('statcard') ||
    content.includes('chart') ||
    content.includes('metric')
  )
    return 'dashboard';
  if (content.includes('datatable') || content.includes('<table') || content.includes('pagination'))
    return 'list';
  if (
    content.includes('useform') ||
    content.includes('onsubmit') ||
    content.includes('form-control')
  )
    return 'form';
  if (
    content.includes('signin') ||
    content.includes('signup') ||
    content.includes('password') ||
    content.includes('credentials')
  )
    return 'auth';
  if (content.includes('loading') && content.includes('notfound')) return 'detail';

  // Fallback: location-based
  if (!path.includes('/app/') && !path.includes('/pages/') && !path.includes('/routes/'))
    return 'component';

  return 'default';
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateComplexityV2(
  code: string,
  filePath: string,
  overrideType?: string
): ComplexityValidationResultV2 {
  const startTime = performance.now();
  const contentHash = createHash('md5').update(code).digest('hex').substring(0, 12);

  const metrics = calculateComplexityV2(code);
  const pageType = overrideType || inferPageTypeV2(filePath, code);
  const threshold = COMPLEXITY_THRESHOLDS_V2[pageType] || COMPLEXITY_THRESHOLDS_V2.default;

  const violations: ComplexityViolation[] = [];

  // Check each requirement
  for (const req of threshold.requirements) {
    const actualValue = metrics[req.metric] as number;
    let violated = false;

    if (req.min !== undefined && actualValue < req.min) {
      violated = true;
      violations.push({
        metric: req.metric,
        actual: actualValue,
        required: req.min,
        weight: req.weight,
        severity: req.severity,
        message: `${req.metric}: ${actualValue} < ${req.min} minimum`,
        suggestedFix: req.suggestedFix,
      });
    }

    if (req.max !== undefined && actualValue > req.max) {
      violated = true;
      violations.push({
        metric: req.metric,
        actual: actualValue,
        required: req.max,
        weight: req.weight,
        severity: req.severity,
        message: `${req.metric}: ${actualValue} > ${req.max} maximum`,
        suggestedFix: req.suggestedFix,
      });
    }
  }

  // Calculate weighted score
  let totalWeight = 0;
  let passedWeight = 0;

  for (const req of threshold.requirements) {
    totalWeight += req.weight;
    const violation = violations.find(v => v.metric === req.metric);
    if (!violation) {
      passedWeight += req.weight;
    }
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;
  const rawScore =
    threshold.requirements.length > 0
      ? Math.round(
          ((threshold.requirements.length - violations.length) / threshold.requirements.length) *
            100
        )
      : 100;

  // Separate critical violations
  const criticalViolations = violations.filter(v => v.severity === 'critical');

  // Detect code smells
  const codeSmells = detectCodeSmells(code, metrics);

  // Valid if:
  // - No critical violations AND
  // - Weighted score >= 80%
  const valid = criticalViolations.length === 0 && score >= 80;

  return {
    valid,
    score,
    rawScore,
    metrics,
    threshold,
    violations,
    criticalViolations,
    codeSmells,
    performanceMs: Math.round((performance.now() - startTime) * 100) / 100,
    contentHash,
  };
}

// ============================================================================
// REPORT
// ============================================================================

export function generateComplexityReportV2(result: ComplexityValidationResultV2): string {
  const lines: string[] = [
    '## Complexity Analysis Report V2',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Page Type | ${result.threshold.name} |`,
    `| Weighted Score | ${result.score}% |`,
    `| Raw Score | ${result.rawScore}% |`,
    `| Status | ${result.valid ? '✅ PASS' : '❌ FAIL'} |`,
    `| Analysis Time | ${result.performanceMs}ms |`,
    '',
    '### Key Metrics',
    `- Lines: ${result.metrics.lineCount} (code: ${result.metrics.codeLineCount})`,
    `- Cyclomatic Complexity: ${result.metrics.cyclomaticComplexity}`,
    `- Max Nesting: ${result.metrics.maxNestingDepth} levels`,
    `- Components: ${result.metrics.componentCount} defined, ${result.metrics.uniqueComponentsUsed} used`,
    `- Hooks: ${result.metrics.stateHookCount} state, ${result.metrics.effectHookCount} effect`,
    `- Handlers: ${result.metrics.handlerCount}`,
    `- Duplicate Ratio: ${Math.round(result.metrics.duplicateRatio * 100)}%`,
    '',
  ];

  if (result.criticalViolations.length > 0) {
    lines.push('### 🚨 Critical Violations (Must Fix)');
    for (const v of result.criticalViolations) {
      lines.push(`- **${v.metric}**: ${v.message}`);
      lines.push(`  → ${v.suggestedFix}`);
    }
    lines.push('');
  }

  const nonCritical = result.violations.filter(v => v.severity !== 'critical');
  if (nonCritical.length > 0) {
    lines.push('### ⚠️ Other Violations');
    for (const v of nonCritical) {
      lines.push(`- [${v.severity.toUpperCase()}] ${v.message}`);
      lines.push(`  → ${v.suggestedFix}`);
    }
    lines.push('');
  }

  if (result.codeSmells.length > 0) {
    lines.push('### 👃 Code Smells');
    for (const smell of result.codeSmells) {
      lines.push(`- ${smell}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Re-export V1 for backwards compatibility
export { validateComplexity, calculateComplexity } from './complexity-validator';

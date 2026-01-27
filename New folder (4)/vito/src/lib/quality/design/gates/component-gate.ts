/**
 * OLYMPUS 2.1 - Component Registry Gate
 *
 * Validates that all components used are from the approved registry.
 * Custom/ad-hoc components are rejected unless explicitly added.
 *
 * Speed: <100ms (instant, deterministic)
 * Cost: $0 (no AI)
 */

import {
  COMPONENT_REGISTRY,
  isValidComponent,
  getComponentSpec,
} from '../component-registry';

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
    componentsFound: number;
    validComponents: number;
    customComponents: number;
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
  return Math.max(0, 100 - (errors * 10) - (warnings * 3));
}

function countComponentUsages(content: string): { total: number; valid: number } {
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)/g;
  let total = 0;
  let valid = 0;
  let match;

  while ((match = componentPattern.exec(content)) !== null) {
    total++;
    if (isValidComponent(match[1])) valid++;
  }

  return { total, valid };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM COMPONENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function validateNoCustomComponents(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Skip component library files
  if (path.includes('/components/ui/') || path.includes('/components/primitives/')) {
    return issues;
  }

  const componentPattern = /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:=\s*(?:\([^)]*\)|[^=])*=>|[:(])/g;
  let match;

  while ((match = componentPattern.exec(content)) !== null) {
    const componentName = match[1];

    if (isValidComponent(componentName)) continue;
    if (componentName.endsWith('Page')) continue;
    if (componentName.endsWith('Layout')) continue;
    if (componentName.endsWith('Provider')) continue;
    if (componentName.endsWith('Context')) continue;
    if (componentName.startsWith('use')) continue;

    const afterMatch = content.substring(match.index, match.index + 500);
    const hasReturn = afterMatch.includes('return') || afterMatch.includes('=>');
    const hasJSX = afterMatch.includes('<') && afterMatch.includes('>');

    if (hasReturn && hasJSX) {
      issues.push({
        rule: 'component-registry',
        message: `Custom component "${componentName}" not in registry`,
        severity: 'warning',
        file: path,
        line: getLineNumber(content, match.index),
        found: componentName,
        expected: 'Use approved components or request registry addition',
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateButtons(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const buttonSpec = COMPONENT_REGISTRY.atoms.Button;

  const buttonPattern = /<Button([^>]*)(?:>|\/?>)/g;
  let match;

  while ((match = buttonPattern.exec(content)) !== null) {
    const attributes = match[1];
    const lineNum = getLineNumber(content, match.index);

    // Check for empty onClick
    if (attributes.includes('onClick={() => {}}') || attributes.includes('onClick={()=>{}}')) {
      issues.push({
        rule: 'button-handler',
        message: 'Empty onClick handler - Button must do something visible',
        severity: 'error',
        file: path,
        line: lineNum,
        found: 'onClick={() => {}}',
        expected: 'Meaningful onClick handler',
        autoFixable: false,
      });
    }

    // Check for missing onClick
    if (!attributes.includes('onClick') && !attributes.includes('type="submit"') && !attributes.includes('asChild')) {
      issues.push({
        rule: 'button-handler',
        message: 'Button missing onClick handler',
        severity: 'error',
        file: path,
        line: lineNum,
        found: '<Button> without onClick',
        expected: 'Add onClick handler or type="submit"',
        autoFixable: false,
      });
    }

    // Check variant
    const variantMatch = attributes.match(/variant=["']([^"']+)["']/);
    if (variantMatch && !buttonSpec.variants?.includes(variantMatch[1])) {
      issues.push({
        rule: 'button-variant',
        message: `Invalid button variant "${variantMatch[1]}"`,
        severity: 'error',
        file: path,
        line: lineNum,
        found: variantMatch[1],
        expected: buttonSpec.variants?.join(', ') || 'primary, secondary, etc.',
        autoFixable: true,
      });
    }

    // Check size
    const sizeMatch = attributes.match(/size=["']([^"']+)["']/);
    if (sizeMatch && !buttonSpec.sizes?.includes(sizeMatch[1])) {
      issues.push({
        rule: 'button-size',
        message: `Invalid button size "${sizeMatch[1]}"`,
        severity: 'error',
        file: path,
        line: lineNum,
        found: sizeMatch[1],
        expected: buttonSpec.sizes?.join(', ') || 'sm, md, lg',
        autoFixable: true,
      });
    }
  }

  // Check adjacent buttons without gap
  const adjacentPattern = /<\/Button>\s*<Button/g;
  let adjacentMatch;

  while ((adjacentMatch = adjacentPattern.exec(content)) !== null) {
    const surrounding = content.substring(Math.max(0, adjacentMatch.index - 200), adjacentMatch.index + 100);
    if (!surrounding.includes('gap-') && !surrounding.includes('space-x-')) {
      issues.push({
        rule: 'button-spacing',
        message: 'Adjacent buttons without gap spacing',
        severity: 'error',
        file: path,
        line: getLineNumber(content, adjacentMatch.index),
        found: '</Button><Button>',
        expected: 'Use gap-2 minimum between buttons',
        autoFixable: true,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateRequiredStates(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Check forms for loading state
  if (content.includes('<form') || content.includes('<Form')) {
    if (!content.includes('loading') && !content.includes('isLoading') && !content.includes('isPending')) {
      issues.push({
        rule: 'missing-state',
        message: 'Form missing loading state handling',
        severity: 'warning',
        file: path,
        found: 'Form without loading state',
        expected: 'Add loading state (isLoading, isPending)',
        autoFixable: false,
      });
    }

    if (!content.includes('error') && !content.includes('Error')) {
      issues.push({
        rule: 'missing-state',
        message: 'Form missing error state handling',
        severity: 'warning',
        file: path,
        found: 'Form without error handling',
        expected: 'Add error state handling',
        autoFixable: false,
      });
    }
  }

  // Check lists for empty state
  if (content.includes('DataTable') || (content.includes('.map(') && content.includes('</Card'))) {
    if (!content.includes('empty') && !content.includes('Empty') && !content.includes('length === 0')) {
      issues.push({
        rule: 'missing-state',
        message: 'List/table missing empty state',
        severity: 'warning',
        file: path,
        found: 'List without empty state',
        expected: 'Add empty state with message and action',
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 50X DESIGN QUALITY VALIDATION (NO GENERIC AI OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

const FORBIDDEN_GENERIC_AI_PATTERNS = [
  // Generic blue (EVERY AI USES THIS - FORBIDDEN)
  { pattern: /bg-blue-500/g, message: 'Generic AI blue - use bg-violet-600 instead', expected: 'bg-violet-600' },
  { pattern: /bg-blue-600/g, message: 'Generic AI blue - use bg-violet-600 or bg-violet-700', expected: 'bg-violet-600/700' },
  { pattern: /text-blue-500/g, message: 'Generic AI blue text - use text-violet-400', expected: 'text-violet-400' },
  { pattern: /border-blue-500/g, message: 'Generic AI blue border - use border-violet-500', expected: 'border-violet-500' },
  { pattern: /ring-blue-500/g, message: 'Generic AI blue ring - use ring-violet-500', expected: 'ring-violet-500' },
  { pattern: /focus:ring-blue/g, message: 'Generic AI blue focus - use focus:ring-violet-500', expected: 'focus:ring-violet-500' },

  // Dead links (QUALITY VIOLATION)
  { pattern: /href=["']#["']/g, message: 'Dead link href="#" - use real route or button', expected: 'Valid href or convert to button' },
  { pattern: /href=["']["']/g, message: 'Empty href - use real route or button', expected: 'Valid href or convert to button' },

  // Empty handlers (BROKEN FUNCTIONALITY)
  { pattern: /onClick=\{?\s*\(\)\s*=>\s*\{\s*\}\s*\}?/g, message: 'Empty onClick handler - button does nothing', expected: 'Meaningful handler' },
  { pattern: /onClick=\{?\s*\(\)\s*=>\s*console\.log/g, message: 'console.log onClick - no visible result', expected: 'Handler with visible feedback' },

  // Missing transitions (STATIC = GENERIC)
  { pattern: /hover:[^t]*(?!transition)/g, message: 'hover: without transition - feels static', expected: 'Add transition-all duration-200' },
];

function validate50XQuality(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  for (const check of FORBIDDEN_GENERIC_AI_PATTERNS) {
    let match;
    const regex = new RegExp(check.pattern.source, check.pattern.flags);

    while ((match = regex.exec(content)) !== null) {
      issues.push({
        rule: '50x-quality',
        message: check.message,
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: match[0],
        expected: check.expected,
        autoFixable: true,
      });
    }
  }

  // Check for cards without glassmorphism (50X signature)
  const cardPattern = /<(?:Card|div[^>]*card)/gi;
  let cardMatch;
  while ((cardMatch = cardPattern.exec(content)) !== null) {
    const context = content.substring(cardMatch.index, cardMatch.index + 500);
    const hasGlass = context.includes('backdrop-blur') ||
                     context.includes('bg-white/') ||
                     context.includes('glassCard');

    if (!hasGlass && context.includes('className')) {
      issues.push({
        rule: '50x-glassmorphism',
        message: 'Card without glassmorphism effect - looks generic',
        severity: 'warning',
        file: path,
        line: getLineNumber(content, cardMatch.index),
        found: 'Card without blur/transparency',
        expected: 'Add bg-white/[0.03] backdrop-blur-xl border-white/10',
        autoFixable: true,
      });
    }
  }

  // Check for violet brand usage (should have at least some)
  if (content.includes('className') && content.length > 1000) {
    const hasViolet = content.includes('violet-') ||
                      content.includes('purple-') ||
                      content.includes('#7c3aed');
    const hasBlue = content.includes('blue-500') ||
                    content.includes('blue-600') ||
                    content.includes('#3B82F6');

    if (hasBlue && !hasViolet) {
      issues.push({
        rule: '50x-brand',
        message: 'File uses blue but no violet - not using OLYMPUS brand',
        severity: 'error',
        file: path,
        found: 'Blue without violet',
        expected: 'Replace blue with violet-600 (brand color)',
        autoFixable: true,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function componentGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let filesChecked = 0;
  let componentsFound = 0;
  let validComponents = 0;
  let customComponents = 0;

  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/)) continue;
    filesChecked++;

    const customIssues = validateNoCustomComponents(file.content, file.path);
    issues.push(...customIssues);
    customComponents += customIssues.length;

    const buttonIssues = validateButtons(file.content, file.path);
    issues.push(...buttonIssues);

    const stateIssues = validateRequiredStates(file.content, file.path);
    issues.push(...stateIssues);

    // 50X Quality checks (no generic AI output)
    const fiftyXIssues = validate50XQuality(file.content, file.path);
    issues.push(...fiftyXIssues);

    const usage = countComponentUsages(file.content);
    componentsFound += usage.total;
    validComponents += usage.valid;
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  return {
    passed: errors === 0,
    score: calculateScore(issues),
    issues,
    stats: { filesChecked, componentsFound, validComponents, customComponents },
  };
}

export const componentRegistryGate = {
  name: 'Component Gate',
  description: 'Validates components against approved registry',
  type: 'component-registry' as const,
  check: componentGate,
};

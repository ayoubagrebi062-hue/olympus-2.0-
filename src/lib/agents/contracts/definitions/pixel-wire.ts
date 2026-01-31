/**
 * OLYMPUS 2.0 - Contract: PIXEL → WIRE
 *
 * PIXEL produces React component code.
 * WIRE needs the FULL CODE to compose pages.
 *
 * CRITICAL CONTRACT - WIRE cannot work with summaries.
 *
 * FIX 1.2 (Jan 29, 2026): Added comprehensive stub prohibition patterns
 * FIX 2.2 (Jan 31, 2026): Expanded detection patterns based on forensic analysis
 *   - 100+ forbidden literal patterns (up from 30)
 *   - 35+ regex patterns with severity levels (up from 8)
 *   - CLAUDE.md code quality rules enforcement
 *   - Theme token violation detection
 *   - Empty handler detection
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * FORBIDDEN CODE PATTERNS - Instant rejection if found
 * These patterns indicate stub/placeholder code that will break downstream agents
 *
 * FIX 2.2 (Jan 31, 2026): Expanded patterns based on forensic analysis
 * - Added placeholder text variations
 * - Added development-only markers
 * - Added incomplete implementation patterns
 * - Added patterns from CLAUDE.md code quality rules
 */
export const FORBIDDEN_CODE_PATTERNS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TODO/FIXME/HACK comments
  // ═══════════════════════════════════════════════════════════════════════════
  '// TODO',
  '/* TODO',
  '// FIXME',
  '/* FIXME',
  '// @todo',
  '/* @todo',
  '// HACK',
  '/* HACK',
  '// XXX',
  '/* XXX',
  '// BUG',
  '/* BUG',
  '// TEMP',
  '/* TEMP',
  '// WIP',
  '/* WIP',
  '// REVIEW',

  // ═══════════════════════════════════════════════════════════════════════════
  // Explicit non-implementation
  // ═══════════════════════════════════════════════════════════════════════════
  'throw new Error("Not implemented")',
  "throw new Error('Not implemented')",
  'throw new Error(`Not implemented`)',
  'throw new Error("TODO")',
  "throw new Error('TODO')",
  'NotImplemented',
  'notImplemented',
  'NOT_IMPLEMENTED',
  'needs implementation',
  'pending implementation',
  'will be implemented',
  'to be implemented',

  // ═══════════════════════════════════════════════════════════════════════════
  // Placeholder markers
  // ═══════════════════════════════════════════════════════════════════════════
  '// placeholder',
  '/* placeholder',
  '// stub',
  '/* stub',
  '// implement later',
  '// add implementation',
  '// fill in',
  '// complete this',
  '// add code here',
  '// add logic here',
  '// coming soon',
  '// not yet',
  '// mock',
  '/* mock',
  '// fake',
  '/* fake',
  '// dummy',
  '/* dummy',
  '// sample',
  '// example only',
  '// for demo',

  // ═══════════════════════════════════════════════════════════════════════════
  // Console placeholders (CLAUDE.md Rule #3 violations)
  // ═══════════════════════════════════════════════════════════════════════════
  'console.log("placeholder")',
  "console.log('placeholder')",
  'console.log("todo")',
  "console.log('todo')",
  'console.log("implement")',
  "console.log('implement')",
  'console.log("clicked")',
  "console.log('clicked')",
  'console.log("submitted")',
  "console.log('submitted')",
  'console.log("test")',
  "console.log('test')",
  'console.log("here")',
  "console.log('here')",

  // ═══════════════════════════════════════════════════════════════════════════
  // Alert usage (CLAUDE.md Rule #3 - BANNED)
  // ═══════════════════════════════════════════════════════════════════════════
  'alert(',
  'window.alert(',

  // ═══════════════════════════════════════════════════════════════════════════
  // Empty implementation markers
  // ═══════════════════════════════════════════════════════════════════════════
  '// TODO: implement',
  '// TODO: add',
  '// TODO: complete',
  '// TODO: finish',
  '// TODO: handle',
  '// TODO: fix',
  '// TODO: update',
  '// TODO: replace',
  'pass; // placeholder',
  '{ /* empty */ }',

  // ═══════════════════════════════════════════════════════════════════════════
  // Placeholder text content (CLAUDE.md Rule #2)
  // ═══════════════════════════════════════════════════════════════════════════
  'Lorem ipsum',
  'lorem ipsum',
  'LOREM IPSUM',
  'placeholder text',
  'Placeholder Text',
  'your text here',
  'Your Text Here',
  'insert text',
  'Insert Text',
  '[TBD]',
  '[TBA]',
  '[N/A]',
  'xxx@xxx',
  'example@example',
  'test@test',
  'foo@bar',

  // ═══════════════════════════════════════════════════════════════════════════
  // Placeholder links (CLAUDE.md Rule #2 - BANNED FOREVER)
  // ═══════════════════════════════════════════════════════════════════════════
  'href="#"',
  "href='#'",
  'href=""',
  "href=''",
  'href={`#`}',
  'href={"#"}',

  // ═══════════════════════════════════════════════════════════════════════════
  // Uncontrolled inputs (CLAUDE.md Rule #6)
  // ═══════════════════════════════════════════════════════════════════════════
  '<input type="text" />',
  "<input type='text' />",
  '<input type="email" />',
  '<input type="password" />',
  '<select><option>',
  '<select>\n<option>',

  // ═══════════════════════════════════════════════════════════════════════════
  // Development-only code
  // ═══════════════════════════════════════════════════════════════════════════
  '__DEV__',
  '__DEBUG__',
  '__TEST__',
  'process.env.NODE_ENV === "development"',
  "process.env.NODE_ENV === 'development'",
  'isDev && ',
  'if (isDev)',
  'debugger;',
  'debugger;',
] as const;

/**
 * Check if content contains any forbidden pattern
 * @returns The pattern found, or null if clean
 *
 * FIX: Destruction Test Jan 31, 2026
 * - Now normalizes whitespace to catch evasion attempts like '//  TODO'
 */
export function containsForbiddenPattern(content: string): string | null {
  // Normalize whitespace: collapse multiple spaces to single space
  const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ');

  for (const pattern of FORBIDDEN_CODE_PATTERNS) {
    const normalizedPattern = pattern.toLowerCase().replace(/\s+/g, ' ');
    if (normalizedContent.includes(normalizedPattern)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Check for regex-based stub patterns that are harder to detect
 *
 * FIX 2.2 (Jan 31, 2026): Expanded regex patterns based on forensic analysis
 * - Added empty handler detection (CLAUDE.md Rule #1)
 * - Added hardcoded color detection (theme violation)
 * - Added uncontrolled input detection (CLAUDE.md Rule #6)
 * - Added missing loading state detection (CLAUDE.md Rule #7)
 * - Added console.log handler detection (CLAUDE.md Rule #3)
 */
export function detectStubPatterns(
  content: string
): Array<{ pattern: string; description: string; severity: 'critical' | 'error' | 'warning' }> {
  const detected: Array<{
    pattern: string;
    description: string;
    severity: 'critical' | 'error' | 'warning';
  }> = [];

  const stubRegexes: Array<{
    regex: RegExp;
    description: string;
    severity: 'critical' | 'error' | 'warning';
  }> = [
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Component returns nothing or placeholder
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /return\s*null\s*;?\s*$/m,
      description: 'Component returns null',
      severity: 'critical',
    },
    {
      regex: /return\s*<>\s*<\/>\s*;?/m,
      description: 'Component returns empty fragment',
      severity: 'critical',
    },
    {
      regex: /return\s*<div>\s*<\/div>\s*;?/m,
      description: 'Component returns empty div',
      severity: 'critical',
    },
    {
      regex: /return\s*<span>\s*<\/span>\s*;?/m,
      description: 'Component returns empty span',
      severity: 'critical',
    },
    {
      regex: /return\s*<p>\s*<\/p>\s*;?/m,
      description: 'Component returns empty paragraph',
      severity: 'critical',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Empty function bodies (CLAUDE.md Rule #1)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /export\s+(default\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*\}/,
      description: 'Empty function body',
      severity: 'critical',
    },
    {
      regex: /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{\s*\}/,
      description: 'Empty arrow function body',
      severity: 'critical',
    },
    {
      regex: /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*null/m,
      description: 'Arrow fn returns null',
      severity: 'critical',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Empty onClick handlers (CLAUDE.md Rule #1 - NO DEAD BUTTONS)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/,
      description: 'Empty onClick handler - dead button',
      severity: 'critical',
    },
    {
      regex: /onClick\s*=\s*\{\s*function\s*\(\)\s*\{\s*\}\s*\}/,
      description: 'Empty onClick handler function',
      severity: 'critical',
    },
    {
      regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*undefined\s*\}/,
      description: 'onClick returns undefined',
      severity: 'critical',
    },
    {
      regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*null\s*\}/,
      description: 'onClick returns null',
      severity: 'critical',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL: Console.log as handler (CLAUDE.md Rule #3)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /onClick\s*=\s*\{\s*\(\)\s*=>\s*console\.log/,
      description: 'onClick only has console.log - not a real handler',
      severity: 'critical',
    },
    {
      regex: /onSubmit\s*=\s*\{\s*\([^)]*\)\s*=>\s*\{\s*[^}]*console\.log[^}]*\}\s*\}/,
      description: 'onSubmit only logs - not a real form handler',
      severity: 'critical',
    },
    {
      regex: /onChange\s*=\s*\{\s*\(\)\s*=>\s*console\.log/,
      description: 'onChange only has console.log',
      severity: 'error',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ERROR: TODO patterns
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /\/\/\s*TODO[\s\S]{0,50}return/im,
      description: 'TODO comment before return statement',
      severity: 'error',
    },
    {
      regex: /throw\s+new\s+Error\s*\(\s*["'`][\s\S]*implement[\s\S]*["'`]\s*\)/i,
      description: 'Throws not implemented error',
      severity: 'critical',
    },
    {
      regex: /throw\s+new\s+Error\s*\(\s*["'`]TODO["'`]\s*\)/i,
      description: 'Throws TODO error',
      severity: 'critical',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ERROR: Hardcoded colors (Theme violation)
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /style\s*=\s*\{\s*\{[^}]*color\s*:\s*["']#[0-9a-fA-F]{3,8}["']/,
      description: 'Hardcoded color in style - use theme tokens',
      severity: 'error',
    },
    {
      regex: /style\s*=\s*\{\s*\{[^}]*backgroundColor\s*:\s*["']#[0-9a-fA-F]{3,8}["']/,
      description: 'Hardcoded backgroundColor - use theme tokens',
      severity: 'error',
    },
    {
      regex:
        /className="[^"]*(?:bg-(?:red|blue|green|yellow|purple|pink|orange|violet|indigo|cyan|teal|lime|emerald|rose|fuchsia|amber|sky|slate|gray|zinc|neutral|stone)-\d{2,3})/,
      description: 'Non-semantic Tailwind color - use bg-primary, bg-secondary, etc.',
      severity: 'warning',
    },
    {
      regex:
        /className="[^"]*(?:text-(?:red|blue|green|yellow|purple|pink|orange|violet|indigo|cyan|teal|lime|emerald|rose|fuchsia|amber|sky|slate|gray|zinc|neutral|stone)-\d{2,3})/,
      description:
        'Non-semantic Tailwind text color - use text-foreground, text-muted-foreground, etc.',
      severity: 'warning',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ERROR: Empty/incomplete async handlers
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /async\s*\([^)]*\)\s*=>\s*\{\s*\}/,
      description: 'Empty async arrow function',
      severity: 'error',
    },
    {
      regex: /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*\}/,
      description: 'Empty async function',
      severity: 'error',
    },
    {
      regex: /await\s+\w+\([^)]*\)\s*;?\s*$/m,
      description: 'Await without error handling (try/catch)',
      severity: 'warning',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WARNING: Potentially incomplete patterns
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /useEffect\s*\(\s*\(\)\s*=>\s*\{\s*\}\s*,\s*\[\s*\]\s*\)/,
      description: 'Empty useEffect',
      severity: 'warning',
    },
    {
      regex: /useState\s*\(\s*\)\s*;/,
      description: 'useState without initial value',
      severity: 'warning',
    },
    {
      regex: /<button[^>]*>\s*<\/button>/,
      description: 'Empty button element',
      severity: 'warning',
    },
    {
      regex: /<Button[^>]*>\s*<\/Button>/,
      description: 'Empty Button component',
      severity: 'warning',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WARNING: Missing accessibility
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /<img[^>]*(?!alt=)[^>]*\/>/,
      description: 'Image without alt attribute',
      severity: 'warning',
    },
    {
      regex: /<button[^>]*(?!type=)[^>]*>/,
      description: 'Button without type attribute',
      severity: 'warning',
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // WARNING: Skeleton/loading without content
    // ═══════════════════════════════════════════════════════════════════════════
    {
      regex: /return\s*\(\s*<Skeleton/m,
      description: 'Component only returns Skeleton - may be missing real content',
      severity: 'warning',
    },
    {
      regex: /isLoading\s*\?\s*<Skeleton[^:]*:\s*null/,
      description: 'Loading state with null fallback - should show real content',
      severity: 'warning',
    },
  ];

  for (const { regex, description, severity } of stubRegexes) {
    if (regex.test(content)) {
      detected.push({ pattern: regex.source, description, severity });
    }
  }

  return detected;
}

/**
 * PIXEL → WIRE Contract
 *
 * PIXEL must output:
 * - 20+ component files with full code
 * - Each file must have: path, content
 * - Content must be valid React/TypeScript
 * - No placeholder code (TODO, NotImplemented)
 */
export const PIXEL_TO_WIRE_CONTRACT: AgentContract = {
  upstream: 'pixel',
  downstream: 'wire',

  description:
    'PIXEL must provide complete React component code (not summaries) for WIRE to compose into pages',

  criticality: 'critical',

  requiredFields: ['files'],

  fieldConstraints: {
    // Files array
    files: {
      type: 'array',
      minCount: 20, // At least 20 component files
      reason: 'PIXEL should generate all components from BLOCKS specs',
    },

    // Each file must have path and content
    'files[]': {
      eachMustHave: ['path', 'content'],
      reason: 'Each file needs a path and the actual code content',
    },

    // Path must be valid component path
    'files[].path': {
      type: 'string',
      minLength: 10,
      mustMatch: '^src/(components|app|lib)/.*\\.(tsx|ts)$',
      reason: 'Must be a valid source file path',
    },

    // Content must be real code
    'files[].content': {
      type: 'string',
      minLength: 100, // At least 100 chars - not a stub
      mustContain: ['export'], // Must export something
      mustNotBe: [
        '// TODO',
        '/* TODO',
        'NotImplemented',
        'throw new Error',
        'console.log("placeholder")',
        '// placeholder',
        '/* placeholder',
      ],
      reason: 'Content must be real component code, not stubs',
    },
  },

  expectedFormat: 'full_code',
  minContentLength: 100,

  // Custom validation for code quality (FIX 1.2: Enhanced stub detection)
  customValidation: (output: unknown): ContractViolation[] => {
    const violations: ContractViolation[] = [];
    const data = output as Record<string, unknown>;

    // Handle both artifacts-based and files-based output
    let files: Array<{ path?: string; content?: string }> = [];

    if (Array.isArray(data.files)) {
      files = data.files;
    } else if (Array.isArray(data.artifacts)) {
      files = (data.artifacts as Array<Record<string, unknown>>)
        .filter(a => a.type === 'code' && a.path)
        .map(a => ({ path: a.path as string, content: a.content as string }));
    }

    if (files.length === 0) {
      violations.push({
        field: 'files',
        constraint: 'files_exist',
        expected: 'At least 20 component files',
        actual: 'No files found in output',
        severity: 'critical',
        suggestion: 'PIXEL agent produced no code files',
      });
      return violations;
    }

    // Check each file for valid React component structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = file.content || '';
      const path = file.path || `file[${i}]`;

      // Check for basic React component structure
      const hasExport = content.includes('export');
      const hasJsx = content.includes('return') && (content.includes('<') || content.includes('('));

      if (!hasExport) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'has_export',
          expected: 'Component must be exported',
          actual: 'No export statement found',
          severity: 'error',
          suggestion: `Add "export default" or "export function" to ${path}`,
        });
      }

      if (path.endsWith('.tsx') && !hasJsx) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'has_jsx',
          expected: 'TSX file should have JSX content',
          actual: 'No JSX/return statement found',
          severity: 'warning',
          suggestion: `${path} appears to be an empty component`,
        });
      }

      // FIX 1.2: ENHANCED STUB DETECTION
      // Check for forbidden patterns (literal strings)
      const forbiddenPattern = containsForbiddenPattern(content);
      if (forbiddenPattern) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'forbidden_pattern',
          expected: 'No placeholder/stub code',
          actual: `Contains forbidden pattern: "${forbiddenPattern}"`,
          severity: 'critical', // Elevated to critical
          suggestion: `${path} contains placeholder code that must be replaced with real implementation`,
        });
      }

      // Check for regex-based stub patterns (FIX 2.2: Now with severity levels)
      const stubPatterns = detectStubPatterns(content);
      for (const { description, severity: patternSeverity } of stubPatterns) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'stub_pattern',
          expected: 'Complete component implementation',
          actual: `Stub detected: ${description}`,
          severity: patternSeverity, // Use pattern-specific severity
          suggestion: `${path} appears to be a stub - needs full implementation with real JSX, handlers, and state`,
        });
      }

      // Check for reasonable code length (component should have substance)
      const linesOfCode = content
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//')).length;

      if (linesOfCode < 10) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'min_lines',
          expected: 'At least 10 lines of code',
          actual: `${linesOfCode} lines`,
          severity: 'warning',
          suggestion: `${path} is suspiciously short for a component`,
        });
      }

      // Component files should be substantial (50+ lines for real implementation)
      if (path.includes('/components/') && linesOfCode < 50) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'component_substance',
          expected: 'Component files should have 50+ lines of real code',
          actual: `${linesOfCode} lines`,
          severity: 'warning',
          suggestion: `${path} may be missing handlers, state, or complete JSX structure`,
        });
      }
    }

    // Check for component variety (not all identical)
    const contentHashes = files.map(f => (f.content || '').substring(0, 200));
    const uniqueHashes = new Set(contentHashes);
    const duplicateRatio = 1 - uniqueHashes.size / files.length;

    if (duplicateRatio > 0.3) {
      violations.push({
        field: 'files',
        constraint: 'variety',
        expected: 'Components should be unique',
        actual: `${Math.round(duplicateRatio * 100)}% duplicate content detected`,
        severity: 'warning',
        suggestion: 'PIXEL may be generating repetitive/template code',
      });
    }

    return violations;
  },
};

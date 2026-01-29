/**
 * OLYMPUS 2.0 - Contract: PIXEL → WIRE
 *
 * PIXEL produces React component code.
 * WIRE needs the FULL CODE to compose pages.
 *
 * CRITICAL CONTRACT - WIRE cannot work with summaries.
 *
 * FIX 1.2 (Jan 29, 2026): Added comprehensive stub prohibition patterns
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * FORBIDDEN CODE PATTERNS - Instant rejection if found
 * These patterns indicate stub/placeholder code that will break downstream agents
 */
export const FORBIDDEN_CODE_PATTERNS = [
  // TODO/FIXME comments
  '// TODO',
  '/* TODO',
  '// FIXME',
  '/* FIXME',
  '// @todo',
  '/* @todo',
  '// HACK',
  '/* HACK',

  // Explicit non-implementation
  'throw new Error("Not implemented")',
  "throw new Error('Not implemented')",
  'throw new Error(`Not implemented`)',
  'NotImplemented',
  'notImplemented',
  'NOT_IMPLEMENTED',

  // Placeholder markers
  '// placeholder',
  '/* placeholder',
  '// stub',
  '/* stub',
  '// implement later',
  '// add implementation',
  '// fill in',
  '// complete this',

  // Console placeholders
  'console.log("placeholder")',
  "console.log('placeholder')",
  'console.log("todo")',
  "console.log('todo')",
  'console.log("implement")',
  "console.log('implement')",

  // Empty implementation markers
  '// TODO: implement',
  '// TODO: add',
  '// TODO: complete',
  '// TODO: finish',
] as const;

/**
 * Check if content contains any forbidden pattern
 * @returns The pattern found, or null if clean
 */
export function containsForbiddenPattern(content: string): string | null {
  const lowerContent = content.toLowerCase();

  for (const pattern of FORBIDDEN_CODE_PATTERNS) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }

  return null;
}

/**
 * Check for regex-based stub patterns that are harder to detect
 */
export function detectStubPatterns(
  content: string
): Array<{ pattern: string; description: string }> {
  const detected: Array<{ pattern: string; description: string }> = [];

  const stubRegexes = [
    { regex: /return\s*null\s*;?\s*$/m, description: 'Component returns null' },
    { regex: /return\s*<>\s*<\/>\s*;?/m, description: 'Component returns empty fragment' },
    { regex: /return\s*<div>\s*<\/div>\s*;?/m, description: 'Component returns empty div' },
    {
      regex: /\/\/\s*TODO[\s\S]{0,50}return/im,
      description: 'TODO comment before return statement',
    },
    {
      regex: /export\s+(default\s+)?function\s+\w+\s*\([^)]*\)\s*{\s*}/,
      description: 'Empty function body',
    },
    {
      regex: /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{\s*}/,
      description: 'Empty arrow function body',
    },
    {
      regex: /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*null/m,
      description: 'Arrow fn returns null',
    },
    {
      regex: /throw\s+new\s+Error\s*\(\s*["'`][\s\S]*implement[\s\S]*["'`]\s*\)/i,
      description: 'Throws not implemented error',
    },
  ];

  for (const { regex, description } of stubRegexes) {
    if (regex.test(content)) {
      detected.push({ pattern: regex.source, description });
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

      // Check for regex-based stub patterns
      const stubPatterns = detectStubPatterns(content);
      for (const { description } of stubPatterns) {
        violations.push({
          field: `files[${i}].content`,
          constraint: 'stub_pattern',
          expected: 'Complete component implementation',
          actual: `Stub detected: ${description}`,
          severity: 'error',
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

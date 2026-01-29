/**
 * OLYMPUS 2.0 - Contract: PIXEL → WIRE
 *
 * PIXEL produces React component code.
 * WIRE needs the FULL CODE to compose pages.
 *
 * CRITICAL CONTRACT - WIRE cannot work with summaries.
 */

import type { AgentContract, ContractViolation } from '../types';

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

  // Custom validation for code quality
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
      const hasReactImport = content.includes('import') && content.includes('react');
      const hasExport = content.includes('export');
      const hasFunction =
        content.includes('function ') || content.includes('const ') || content.includes('class ');
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

      // Check for stub patterns
      const stubPatterns = [
        { pattern: /return\s*null\s*;?\s*$/m, name: 'returns null' },
        { pattern: /return\s*<>\s*<\/>\s*;?/m, name: 'returns empty fragment' },
        { pattern: /return\s*<div>\s*<\/div>\s*;?/m, name: 'returns empty div' },
        { pattern: /\/\/\s*TODO[\s\S]{0,50}return/m, name: 'has TODO before return' },
      ];

      for (const { pattern, name } of stubPatterns) {
        if (pattern.test(content)) {
          violations.push({
            field: `files[${i}].content`,
            constraint: 'not_stub',
            expected: 'Complete component implementation',
            actual: `Stub pattern detected: ${name}`,
            severity: 'error',
            suggestion: `${path} appears to be a stub, needs full implementation`,
          });
        }
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

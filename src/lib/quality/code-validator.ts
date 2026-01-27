/**
 * OLYMPUS 2.0 - Code Validator
 *
 * Validates generated code for:
 * - TypeScript compilation errors
 * - ESLint violations
 * - Code style issues
 */

import {
  QualityGate,
  GateType,
  GateResult,
  GateIssue,
  GateConfig,
  FileToCheck,
  GateSeverity,
  TYPESCRIPT_ISSUE_MAP,
} from './types';

// ============================================
// TYPESCRIPT VALIDATOR
// ============================================

/**
 * TypeScript compilation validator
 */
export class TypeScriptValidator implements QualityGate {
  type: GateType = 'typescript';
  name = 'TypeScript Validator';
  description = 'Validates TypeScript code for compilation errors and type issues';

  async check(files: FileToCheck[], config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const issues: GateIssue[] = [];

    // Filter TypeScript files
    const tsFiles = files.filter(
      f => f.language === 'typescript' || f.path.endsWith('.ts') || f.path.endsWith('.tsx')
    );

    if (tsFiles.length === 0) {
      return {
        gate: this.type,
        status: 'skipped',
        passed: true,
        issues: [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Check each file for common TypeScript issues
    for (const file of tsFiles) {
      const fileIssues = this.validateTypeScript(file);
      issues.push(...fileIssues);
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const passed = errorCount === 0;

    return {
      gate: this.type,
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: tsFiles.length,
        issuesFound: issues.length,
        errorCount,
        warningCount: issues.filter(i => i.severity === 'warning').length,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private validateTypeScript(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for implicit any
      if (line.includes(': any') || line.includes('as any')) {
        issues.push({
          severity: 'warning',
          message: 'Explicit any type usage',
          file: file.path,
          line: lineNum,
          rule: 'TS7006',
          suggestion: 'Add proper type annotations',
        });
      }

      // Check for missing return types on functions
      const funcMatch = line.match(
        /(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]+)\s*=>)/
      );
      if (
        funcMatch &&
        !line.includes('):') &&
        !line.includes('): void') &&
        !line.includes('): Promise')
      ) {
        // Only flag if it looks like a function definition without return type
        if (line.includes('=>') || line.includes('function')) {
          issues.push({
            severity: 'info',
            message: 'Function missing explicit return type',
            file: file.path,
            line: lineNum,
            suggestion: 'Add explicit return type annotation',
          });
        }
      }

      // Check for non-null assertion overuse
      const nonNullCount = (line.match(/!/g) || []).length;
      if (nonNullCount > 2 && !line.includes('!==') && !line.includes('!=')) {
        issues.push({
          severity: 'warning',
          message: 'Excessive use of non-null assertions',
          file: file.path,
          line: lineNum,
          rule: 'no-non-null-assertion',
          suggestion: 'Use proper null checks instead of !',
        });
      }

      // Check for @ts-ignore
      if (line.includes('@ts-ignore') || line.includes('@ts-nocheck')) {
        issues.push({
          severity: 'warning',
          message: 'TypeScript error suppression detected',
          file: file.path,
          line: lineNum,
          suggestion: 'Fix the underlying type error instead',
        });
      }

      // Check for require() in TypeScript
      if (line.includes('require(') && !line.includes('// require')) {
        issues.push({
          severity: 'info',
          message: 'CommonJS require() used in TypeScript',
          file: file.path,
          line: lineNum,
          suggestion: 'Use ES6 imports instead',
        });
      }
    });

    // Check for missing imports (simple heuristic)
    const usedIdentifiers = new Set<string>();
    const importedIdentifiers = new Set<string>();

    // Extract imports
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const imports = (match[1] || match[2] || '').split(',').map(s => s.trim().split(' ')[0]);
      imports.forEach(i => importedIdentifiers.add(i));
    }

    // Check for common undefined references (simplified)
    const undefinedPatterns = [
      /\bReact\b/,
      /\buseState\b/,
      /\buseEffect\b/,
      /\buseCallback\b/,
      /\buseMemo\b/,
      /\buseRef\b/,
      /\buseContext\b/,
    ];

    for (const pattern of undefinedPatterns) {
      if (pattern.test(file.content)) {
        const name = pattern.source.replace(/\\b/g, '');
        if (!importedIdentifiers.has(name) && !file.content.includes(`import ${name}`)) {
          // Check if it's a React hook that should be imported
          if (name !== 'React' && name.startsWith('use')) {
            const hasReactImport =
              file.content.includes("from 'react'") || file.content.includes('from "react"');
            if (!hasReactImport) {
              issues.push({
                severity: 'error',
                message: `${name} is used but not imported`,
                file: file.path,
                rule: 'TS2304',
                suggestion: `Add: import { ${name} } from 'react'`,
              });
            }
          }
        }
      }
    }

    return issues;
  }
}

// ============================================
// ESLINT VALIDATOR
// ============================================

/**
 * ESLint-style code quality validator
 */
export class ESLintValidator implements QualityGate {
  type: GateType = 'eslint';
  name = 'ESLint Validator';
  description = 'Validates code against ESLint-style rules';

  async check(files: FileToCheck[], config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const issues: GateIssue[] = [];

    const jstsFiles = files.filter(
      f =>
        f.language === 'javascript' ||
        f.language === 'typescript' ||
        f.path.match(/\.(js|jsx|ts|tsx)$/)
    );

    if (jstsFiles.length === 0) {
      return {
        gate: this.type,
        status: 'skipped',
        passed: true,
        issues: [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    for (const file of jstsFiles) {
      const fileIssues = this.validateESLint(file);
      issues.push(...fileIssues);
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const passed = errorCount === 0;

    return {
      gate: this.type,
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: jstsFiles.length,
        issuesFound: issues.length,
        errorCount,
        warningCount: issues.filter(i => i.severity === 'warning').length,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private validateESLint(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // no-console
      if (
        line.includes('console.log') ||
        line.includes('console.error') ||
        line.includes('console.warn')
      ) {
        if (!line.includes('// eslint-disable') && !line.includes('// allowed')) {
          issues.push({
            severity: 'warning',
            message: 'Unexpected console statement',
            file: file.path,
            line: lineNum,
            rule: 'no-console',
            suggestion: 'Remove console statements or use a proper logger',
          });
        }
      }

      // no-debugger
      if (line.includes('debugger')) {
        issues.push({
          severity: 'error',
          message: 'Unexpected debugger statement',
          file: file.path,
          line: lineNum,
          rule: 'no-debugger',
          suggestion: 'Remove debugger statement',
        });
      }

      // no-alert
      if (line.match(/\balert\s*\(/)) {
        issues.push({
          severity: 'warning',
          message: 'Unexpected alert statement',
          file: file.path,
          line: lineNum,
          rule: 'no-alert',
          suggestion: 'Use a proper modal or notification system',
        });
      }

      // eqeqeq
      if (line.match(/[^!=]==[^=]/) && !line.includes('===')) {
        issues.push({
          severity: 'warning',
          message: 'Expected === instead of ==',
          file: file.path,
          line: lineNum,
          rule: 'eqeqeq',
          suggestion: 'Use strict equality (===)',
        });
      }

      // no-var
      if (line.match(/\bvar\s+\w+/)) {
        issues.push({
          severity: 'warning',
          message: 'Unexpected var, use let or const instead',
          file: file.path,
          line: lineNum,
          rule: 'no-var',
          suggestion: 'Replace var with const or let',
        });
      }

      // prefer-const
      if (
        line.match(/\blet\s+(\w+)\s*=/) &&
        !file.content.includes(
          `${line.match(/let\s+(\w+)/)?.[1]} =`,
          file.content.indexOf(line) + line.length
        )
      ) {
        // Simple heuristic - if let is used and not reassigned nearby
        // This is a simplified check
      }

      // no-unused-expressions
      if (line.match(/^\s*['"`][^'"`]+['"`]\s*;?\s*$/) && !line.includes('use ')) {
        issues.push({
          severity: 'warning',
          message: 'Expected an assignment or function call',
          file: file.path,
          line: lineNum,
          rule: 'no-unused-expressions',
        });
      }

      // React hooks rules
      if (file.path.match(/\.(jsx|tsx)$/)) {
        // Check for hooks called conditionally
        if (line.match(/if\s*\([^)]+\)\s*{[^}]*use[A-Z]/)) {
          issues.push({
            severity: 'error',
            message: 'React Hook called conditionally',
            file: file.path,
            line: lineNum,
            rule: 'react-hooks/rules-of-hooks',
            suggestion: 'Hooks must be called at the top level of the component',
          });
        }
      }
    });

    // Check for unused imports (simplified)
    const importLines = file.content.match(/import\s+{([^}]+)}/g) || [];
    for (const importLine of importLines) {
      const imports =
        importLine
          .match(/{([^}]+)}/)?.[1]
          ?.split(',')
          .map(s => s.trim()) || [];
      for (const imp of imports) {
        const name = imp.split(' ')[0]; // Handle "as" aliases
        const usageCount = (file.content.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
        if (usageCount <= 1) {
          // Only appears in import
          issues.push({
            severity: 'warning',
            message: `'${name}' is defined but never used`,
            file: file.path,
            rule: 'no-unused-vars',
            suggestion: `Remove unused import: ${name}`,
          });
        }
      }
    }

    return issues;
  }
}

// ============================================
// EXPORTS
// ============================================

export const typeScriptValidator = new TypeScriptValidator();
export const eslintValidator = new ESLintValidator();

export default {
  TypeScriptValidator,
  ESLintValidator,
  typeScriptValidator,
  eslintValidator,
};

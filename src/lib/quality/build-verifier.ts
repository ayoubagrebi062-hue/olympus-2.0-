/**
 * OLYMPUS 2.0 - Build Verifier
 *
 * Verifies that generated code can be built:
 * - Syntax validation
 * - Import resolution
 * - Component structure validation
 */

import { QualityGate, GateType, GateResult, GateIssue, GateConfig, FileToCheck } from './types';

// ============================================
// BUILD VERIFIER
// ============================================

export class BuildVerifier implements QualityGate {
  type: GateType = 'build';
  name = 'Build Verifier';
  description = 'Verifies code structure and import resolution';

  async check(files: FileToCheck[], config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const issues: GateIssue[] = [];

    // Group files by type
    const tsFiles = files.filter(f => f.path.match(/\.(ts|tsx)$/));
    const jsFiles = files.filter(f => f.path.match(/\.(js|jsx)$/));
    const cssFiles = files.filter(f => f.path.match(/\.(css|scss|sass)$/));

    // Verify each file type
    for (const file of [...tsFiles, ...jsFiles]) {
      const fileIssues = this.verifyJavaScriptFile(file, files);
      issues.push(...fileIssues);
    }

    for (const file of cssFiles) {
      const fileIssues = this.verifyCSSFile(file);
      issues.push(...fileIssues);
    }

    // Cross-file validation
    const crossFileIssues = this.verifyCrossFileConsistency(files);
    issues.push(...crossFileIssues);

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const passed = errorCount === 0;

    return {
      gate: this.type,
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: files.length,
        issuesFound: issues.length,
        errorCount,
        warningCount: issues.filter(i => i.severity === 'warning').length,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Verify JavaScript/TypeScript file
   */
  private verifyJavaScriptFile(file: FileToCheck, allFiles: FileToCheck[]): GateIssue[] {
    const issues: GateIssue[] = [];

    // Check for syntax errors (basic)
    const syntaxIssues = this.checkBasicSyntax(file);
    issues.push(...syntaxIssues);

    // Check imports
    const importIssues = this.checkImports(file, allFiles);
    issues.push(...importIssues);

    // Check exports
    const exportIssues = this.checkExports(file);
    issues.push(...exportIssues);

    // React component checks
    if (file.path.match(/\.(jsx|tsx)$/)) {
      const reactIssues = this.checkReactComponent(file);
      issues.push(...reactIssues);
    }

    return issues;
  }

  /**
   * Check basic syntax
   */
  private checkBasicSyntax(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    // Track bracket balance
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Skip strings and comments for bracket counting
      const codeOnly = line
        .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '""')
        .replace(/\/\/.*$/, '')
        .replace(/\/\*.*?\*\//g, '');

      braceCount += (codeOnly.match(/{/g) || []).length - (codeOnly.match(/}/g) || []).length;
      parenCount += (codeOnly.match(/\(/g) || []).length - (codeOnly.match(/\)/g) || []).length;
      bracketCount += (codeOnly.match(/\[/g) || []).length - (codeOnly.match(/]/g) || []).length;

      // Check for common syntax errors
      if (line.match(/,\s*[)\]}]/)) {
        issues.push({
          severity: 'warning',
          message: 'Trailing comma before closing bracket',
          file: file.path,
          line: lineNum,
          suggestion: 'Remove trailing comma (may cause issues in older browsers)',
        });
      }

      // Check for missing semicolons after specific patterns
      if (
        line.match(/(?:const|let|var)\s+\w+\s*=\s*[^;]+$/) &&
        !line.trim().endsWith(',') &&
        !line.trim().endsWith('{')
      ) {
        const nextLine = lines[index + 1] || '';
        if (!nextLine.trim().startsWith('.') && !nextLine.trim().startsWith('?')) {
          // Might be missing semicolon - but this is often fine with ASI
        }
      }

      // Check for accidental global assignments
      if (
        line.match(/^\s*\w+\s*=\s*/) &&
        !line.match(/^\s*(?:const|let|var|this\.|return|export|import)/)
      ) {
        const varName = line.match(/^\s*(\w+)\s*=/)?.[1];
        if (varName && !['module', 'exports', 'window', 'document', 'global'].includes(varName)) {
          issues.push({
            severity: 'warning',
            message: `Possible accidental global assignment: ${varName}`,
            file: file.path,
            line: lineNum,
            suggestion: 'Use const, let, or var to declare variables',
          });
        }
      }
    });

    // Check final bracket balance
    if (braceCount !== 0) {
      issues.push({
        severity: 'error',
        message: `Unbalanced braces: ${braceCount > 0 ? 'missing }' : 'extra }'}`,
        file: file.path,
      });
    }

    if (parenCount !== 0) {
      issues.push({
        severity: 'error',
        message: `Unbalanced parentheses: ${parenCount > 0 ? 'missing )' : 'extra )'}`,
        file: file.path,
      });
    }

    if (bracketCount !== 0) {
      issues.push({
        severity: 'error',
        message: `Unbalanced brackets: ${bracketCount > 0 ? 'missing ]' : 'extra ]'}`,
        file: file.path,
      });
    }

    return issues;
  }

  /**
   * Check imports
   */
  private checkImports(file: FileToCheck, allFiles: FileToCheck[]): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    // Extract all imports
    const importRegex =
      /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]*}|\*\s+as\s+\w+|\w+))?\s*from\s*['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];
      const beforeMatch = file.content.substring(0, match.index);
      const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;

      // Check for relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        // Check if the file exists in our file list
        const resolvedPath = this.resolveRelativeImport(file.path, importPath);
        const fileExists = allFiles.some(
          f =>
            f.path === resolvedPath ||
            f.path === resolvedPath + '.ts' ||
            f.path === resolvedPath + '.tsx' ||
            f.path === resolvedPath + '.js' ||
            f.path === resolvedPath + '.jsx' ||
            f.path === resolvedPath + '/index.ts' ||
            f.path === resolvedPath + '/index.tsx'
        );

        if (!fileExists && allFiles.length > 0) {
          // This is a warning, not error, since we might not have all files
          issues.push({
            severity: 'info',
            message: `Import target may not exist: ${importPath}`,
            file: file.path,
            line: lineNum,
            suggestion: 'Verify the import path is correct',
          });
        }
      }

      // Check for circular import patterns (simplified)
      if (importPath.includes('..') && importPath.split('..').length > 3) {
        issues.push({
          severity: 'warning',
          message: 'Deep relative import may indicate architecture issues',
          file: file.path,
          line: lineNum,
          suggestion: 'Consider using absolute imports or path aliases',
        });
      }
    }

    return issues;
  }

  /**
   * Resolve relative import path
   */
  private resolveRelativeImport(fromPath: string, importPath: string): string {
    const fromDir = fromPath.split('/').slice(0, -1).join('/');
    const parts = [...fromDir.split('/'), ...importPath.split('/')];
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return resolved.join('/');
  }

  /**
   * Check exports
   */
  private checkExports(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];

    // Check for default export in React components
    if (file.path.match(/\.(jsx|tsx)$/) && file.path.includes('components')) {
      const hasDefaultExport =
        file.content.includes('export default') || file.content.includes('export { default }');
      const hasNamedExport = file.content.match(/export\s+(?:const|function|class)/);

      if (!hasDefaultExport && !hasNamedExport) {
        issues.push({
          severity: 'warning',
          message: 'Component file has no exports',
          file: file.path,
          suggestion: 'Add export default or named export',
        });
      }
    }

    return issues;
  }

  /**
   * Check React component structure
   */
  private checkReactComponent(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];

    // Check for component definition
    const hasComponent =
      file.content.includes('function ') ||
      file.content.includes('const ') ||
      file.content.includes('class ');

    if (!hasComponent) {
      issues.push({
        severity: 'warning',
        message: 'No component definition found in .tsx/.jsx file',
        file: file.path,
      });
    }

    // Check for proper React import
    const usesJSX = file.content.includes('<') && file.content.includes('/>');
    const hasReactImport =
      file.content.includes("from 'react'") || file.content.includes('from "react"');

    if (usesJSX && !hasReactImport && !file.content.includes('React.')) {
      issues.push({
        severity: 'error',
        message: 'JSX used but React not imported',
        file: file.path,
        suggestion: "Add: import React from 'react' (or use automatic JSX runtime)",
      });
    }

    // Check for hooks usage
    const useStateMatch = file.content.match(/useState\s*</g);
    const useEffectMatch = file.content.match(/useEffect\s*\(/g);

    if (useStateMatch && useStateMatch.length > 10) {
      issues.push({
        severity: 'info',
        message: 'Component has many useState calls',
        file: file.path,
        suggestion: 'Consider using useReducer or extracting state to a custom hook',
      });
    }

    // Check for proper key prop in lists
    if (file.content.includes('.map(') && file.content.includes('return')) {
      if (!file.content.includes('key=') && !file.content.includes('key:')) {
        issues.push({
          severity: 'warning',
          message: 'List rendering may be missing key prop',
          file: file.path,
          suggestion: 'Add unique key prop to list items',
        });
      }
    }

    return issues;
  }

  /**
   * Verify CSS file
   */
  private verifyCSSFile(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];

    // Check for common CSS issues
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for !important overuse
      if (line.includes('!important')) {
        issues.push({
          severity: 'info',
          message: '!important used',
          file: file.path,
          line: lineNum,
          suggestion: 'Consider using more specific selectors instead',
        });
      }

      // Check for invalid units
      if (line.match(/:\s*\d+(?!px|em|rem|%|vh|vw|s|ms|deg|fr|ch|ex|vmin|vmax)/)) {
        const hasUnit = line.match(/:\s*\d+(px|em|rem|%|vh|vw|s|ms|deg|fr|ch|ex|vmin|vmax)/);
        const isZero = line.match(/:\s*0[;\s]/);
        const isCalc = line.includes('calc(');
        const isVar = line.includes('var(');

        if (!hasUnit && !isZero && !isCalc && !isVar && line.includes(':')) {
          // Might be missing unit
        }
      }
    });

    // Check brace balance
    const openBraces = (file.content.match(/{/g) || []).length;
    const closeBraces = (file.content.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push({
        severity: 'error',
        message: 'Unbalanced CSS braces',
        file: file.path,
      });
    }

    return issues;
  }

  /**
   * Cross-file consistency checks
   */
  private verifyCrossFileConsistency(files: FileToCheck[]): GateIssue[] {
    const issues: GateIssue[] = [];

    // Check for duplicate component names
    const componentNames = new Map<string, string[]>();

    for (const file of files) {
      if (file.path.match(/\.(jsx|tsx)$/)) {
        const match = file.content.match(/(?:export\s+default\s+function|function|const)\s+(\w+)/);
        if (match) {
          const name = match[1];
          if (!componentNames.has(name)) {
            componentNames.set(name, []);
          }
          componentNames.get(name)!.push(file.path);
        }
      }
    }

    for (const [name, paths] of componentNames) {
      if (paths.length > 1 && !['index', 'default', 'App'].includes(name)) {
        issues.push({
          severity: 'warning',
          message: `Duplicate component name "${name}" found in multiple files`,
          suggestion: 'Consider renaming to avoid confusion',
        });
      }
    }

    return issues;
  }
}

// ============================================
// EXPORTS
// ============================================

export const buildVerifier = new BuildVerifier();

export default {
  BuildVerifier,
  buildVerifier,
};

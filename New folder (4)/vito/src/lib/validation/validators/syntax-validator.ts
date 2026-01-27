/**
 * OLYMPUS 3.0 - Syntax Validator
 * ==============================
 * Validates code syntax and structure
 */

import { ValidationIssue, GeneratedFile } from '../types';

/**
 * Validate syntax of a generated file
 */
export async function validateSyntax(file: GeneratedFile): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { content, language } = file;

  // Skip non-JS/TS files
  if (!['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts'].includes(language)) {
    return issues;
  }

  // Check bracket matching
  const bracketIssues = checkBracketMatching(content);
  issues.push(...bracketIssues);

  // Check common syntax issues
  const commonIssues = checkCommonSyntaxIssues(content);
  issues.push(...commonIssues);

  return issues;
}

/**
 * Check for matching brackets
 */
function checkBracketMatching(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const lines = content.split('\n');

  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultilineComment = false;

  lines.forEach((line, lineNum) => {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = line[i - 1];
      const nextChar = line[i + 1];

      // Track comments
      if (!inString && !inMultilineComment && char === '/' && nextChar === '/') {
        inComment = true;
      }
      if (!inString && !inMultilineComment && char === '/' && nextChar === '*') {
        inMultilineComment = true;
      }
      if (inMultilineComment && char === '*' && nextChar === '/') {
        inMultilineComment = false;
        i++; // Skip next char
        continue;
      }

      if (inComment || inMultilineComment) continue;

      // Track strings (simplified)
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (inString) continue;

      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1 });
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last.char] !== char) {
          issues.push({
            code: 'BRACKET_MISMATCH',
            message: `Unmatched bracket '${char}'`,
            severity: 'error',
            line: lineNum + 1,
            column: i + 1,
          });
        }
      }
    }

    // Reset single-line comment at end of line
    inComment = false;
  });

  // Check for unclosed brackets
  stack.forEach(({ char, line }) => {
    issues.push({
      code: 'UNCLOSED_BRACKET',
      message: `Unclosed bracket '${char}'`,
      severity: 'error',
      line,
    });
  });

  return issues;
}

/**
 * Check for common syntax issues
 */
function checkCommonSyntaxIssues(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
      return;
    }

    // Check for console.log in production code
    if (/console\.(log|debug|info)\(/.test(line)) {
      issues.push({
        code: 'CONSOLE_LOG',
        message: 'console.log found - remove for production',
        severity: 'warning',
        line: lineNum + 1,
        suggestion: 'Use proper logging or remove',
      });
    }

    // Check for debugger statements
    if (/\bdebugger\b/.test(line)) {
      issues.push({
        code: 'DEBUGGER',
        message: 'debugger statement found',
        severity: 'error',
        line: lineNum + 1,
        suggestion: 'Remove debugger statement',
      });
    }

    // Check for TODO/FIXME without tracking
    if (/\/\/\s*(TODO|FIXME|HACK|XXX):/i.test(line)) {
      issues.push({
        code: 'TODO_COMMENT',
        message: 'TODO/FIXME comment found - may indicate incomplete code',
        severity: 'info',
        line: lineNum + 1,
      });
    }

    // Check for empty catch blocks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      issues.push({
        code: 'EMPTY_CATCH',
        message: 'Empty catch block - errors should be handled',
        severity: 'warning',
        line: lineNum + 1,
        suggestion: 'Add error handling or logging',
      });
    }

    // Check for var usage (should use let/const)
    if (/\bvar\s+/.test(line) && !trimmedLine.startsWith('//')) {
      issues.push({
        code: 'VAR_USAGE',
        message: 'Use let or const instead of var',
        severity: 'warning',
        line: lineNum + 1,
        suggestion: 'Replace var with let or const',
      });
    }
  });

  return issues;
}

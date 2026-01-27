/**
 * OLYMPUS 3.0 - Quality Validator
 * ================================
 * Validates code quality metrics
 */

import { ValidationIssue, GeneratedFile } from '../types';

/**
 * Validate code quality of a generated file
 */
export async function validateQuality(file: GeneratedFile): Promise<{
  issues: ValidationIssue[];
  metrics: QualityMetrics;
}> {
  const issues: ValidationIssue[] = [];
  const { content, path: _path, language } = file;

  // Skip non-code files
  if (!['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts'].includes(language)) {
    return {
      issues,
      metrics: { complexity: 0, linesOfCode: 0, duplicateLines: 0, maxNesting: 0 },
    };
  }

  const _lines = content.split('\n');
  const metrics = calculateMetrics(content);

  // Check complexity
  if (metrics.complexity > 20) {
    issues.push({
      code: 'HIGH_COMPLEXITY',
      message: `High cyclomatic complexity (${metrics.complexity})`,
      severity: 'warning',
      suggestion: 'Consider breaking down into smaller functions',
    });
  }

  // Check file length
  if (metrics.linesOfCode > 300) {
    issues.push({
      code: 'LONG_FILE',
      message: `File has ${metrics.linesOfCode} lines - consider splitting`,
      severity: 'warning',
      suggestion: 'Split into smaller, focused modules',
    });
  }

  // Check nesting depth
  if (metrics.maxNesting > 5) {
    issues.push({
      code: 'DEEP_NESTING',
      message: `Deep nesting level (${metrics.maxNesting})`,
      severity: 'warning',
      suggestion: 'Flatten nested logic with early returns or extract functions',
    });
  }

  // Check for long functions
  const longFunctions = findLongFunctions(content);
  for (const func of longFunctions) {
    issues.push({
      code: 'LONG_FUNCTION',
      message: `Function "${func.name}" is ${func.lines} lines long`,
      severity: 'warning',
      line: func.startLine,
      suggestion: 'Consider breaking into smaller functions',
    });
  }

  // Check for magic numbers
  const magicNumbers = findMagicNumbers(content);
  if (magicNumbers.length > 5) {
    issues.push({
      code: 'MAGIC_NUMBERS',
      message: `Found ${magicNumbers.length} magic numbers - consider using constants`,
      severity: 'info',
      suggestion: 'Extract magic numbers into named constants',
    });
  }

  // Check for any type usage
  const anyCount = (content.match(/:\s*any\b/g) || []).length;
  if (anyCount > 3) {
    issues.push({
      code: 'EXCESSIVE_ANY',
      message: `Found ${anyCount} uses of "any" type`,
      severity: 'warning',
      suggestion: 'Add proper type definitions',
    });
  }

  return { issues, metrics };
}

interface QualityMetrics {
  complexity: number;
  linesOfCode: number;
  duplicateLines: number;
  maxNesting: number;
}

/**
 * Calculate code metrics
 */
function calculateMetrics(content: string): QualityMetrics {
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  return {
    complexity: calculateComplexity(content),
    linesOfCode: nonEmptyLines.length,
    duplicateLines: findDuplicateLines(lines),
    maxNesting: calculateMaxNesting(content),
  };
}

/**
 * Calculate cyclomatic complexity
 */
function calculateComplexity(content: string): number {
  const decisionPoints = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\?/g,
    /\|\|/g,
    /&&/g,
    /\?[^:]+:/g, // Ternary
  ];

  let complexity = 1;
  for (const pattern of decisionPoints) {
    const matches = content.match(pattern);
    complexity += matches?.length || 0;
  }

  return complexity;
}

/**
 * Calculate maximum nesting depth
 */
function calculateMaxNesting(content: string): number {
  let maxNesting = 0;
  let currentNesting = 0;

  for (const char of content) {
    if (char === '{') {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    } else if (char === '}') {
      currentNesting--;
    }
  }

  return maxNesting;
}

/**
 * Find duplicate lines (simplified)
 */
function findDuplicateLines(lines: string[]): number {
  const lineCounts = new Map<string, number>();
  let duplicates = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10) { // Only check substantial lines
      const count = (lineCounts.get(trimmed) || 0) + 1;
      lineCounts.set(trimmed, count);
      if (count > 1) duplicates++;
    }
  }

  return duplicates;
}

/**
 * Find long functions
 */
function findLongFunctions(content: string): Array<{ name: string; lines: number; startLine: number }> {
  const longFunctions: Array<{ name: string; lines: number; startLine: number }> = [];
  const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>)/g;
  const lines = content.split('\n');

  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3] || 'anonymous';
    const startIndex = match.index;
    const startLine = content.slice(0, startIndex).split('\n').length;

    // Find function end (simplified - count braces)
    let braceCount = 0;
    let foundStart = false;
    let endLine = startLine;

    for (let i = startLine - 1; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            endLine = i + 1;
            break;
          }
        }
      }
      if (foundStart && braceCount === 0) break;
    }

    const funcLines = endLine - startLine + 1;
    if (funcLines > 50) {
      longFunctions.push({ name, lines: funcLines, startLine });
    }
  }

  return longFunctions;
}

/**
 * Find magic numbers
 */
function findMagicNumbers(content: string): number[] {
  const magicNumbers: number[] = [];
  const numberRegex = /(?<![.\w])(\d{2,})(?![.\w])/g;
  const allowedNumbers = new Set([0, 1, 2, 10, 100, 1000, 24, 60, 365, 404, 500]);

  let match;
  while ((match = numberRegex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (!allowedNumbers.has(num)) {
      magicNumbers.push(num);
    }
  }

  return magicNumbers;
}

/**
 * OLYMPUS 2.0 - Placeholder Detector
 *
 * Detects TODO comments, stub implementations, and placeholder values in generated code.
 */

import { OutputIssue, SecurityIssueType, Severity } from './types';
import { v4 as uuid } from 'uuid';

/**
 * Placeholder pattern definition
 */
interface PlaceholderPattern {
  type: SecurityIssueType;
  severity: Severity;
  name: string;
  patterns: RegExp[];
  suggestion: string;
}

/**
 * All placeholder patterns we detect
 */
const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  // TODO/FIXME Comments
  {
    type: 'todo_comment',
    severity: 'medium',
    name: 'TODO Comment',
    patterns: [/\/\/\s*TODO:?\s*.+/gi, /\/\*\s*TODO:?\s*.+\*\//gi, /\{\/\*\s*TODO:?\s*.+\*\/\}/gi],
    suggestion: 'Implement the TODO item or remove the comment',
  },
  {
    type: 'todo_comment',
    severity: 'medium',
    name: 'FIXME Comment',
    patterns: [/\/\/\s*FIXME:?\s*.+/gi, /\/\*\s*FIXME:?\s*.+\*\//gi],
    suggestion: 'Fix the issue or remove the comment',
  },
  {
    type: 'todo_comment',
    severity: 'low',
    name: 'HACK Comment',
    patterns: [/\/\/\s*HACK:?\s*.+/gi, /\/\*\s*HACK:?\s*.+\*\//gi],
    suggestion: 'Replace hack with proper implementation',
  },

  // Stub Implementations
  {
    type: 'stub_implementation',
    severity: 'high',
    name: 'Stub Implementation',
    patterns: [
      /throw\s+new\s+Error\s*\(\s*['"]Not\s+implemented['"]\s*\)/gi,
      /throw\s+new\s+Error\s*\(\s*['"]TODO['"]\s*\)/gi,
      /throw\s+new\s+Error\s*\(\s*['"]Implement\s+me['"]\s*\)/gi,
      /throw\s+new\s+Error\s*\(\s*['"]Stub['"]\s*\)/gi,
    ],
    suggestion: 'Implement the function or remove it',
  },
  {
    type: 'stub_implementation',
    severity: 'medium',
    name: 'Empty Function Body',
    patterns: [
      /=>\s*\{\s*\}/g, // Arrow function with empty body
      /\(\)\s*\{\s*\}/g, // Regular function with empty body
    ],
    suggestion: 'Implement the function body',
  },

  // Placeholder Values
  {
    type: 'placeholder_code',
    severity: 'high',
    name: 'Placeholder URL',
    patterns: [
      /['"]https?:\/\/example\.com[^'"]*['"]/gi,
      /['"]https?:\/\/placeholder[^'"]*['"]/gi,
      /['"]https?:\/\/your-[^'"]+['"]/gi,
      /['"]https?:\/\/xxx[^'"]*['"]/gi,
    ],
    suggestion: 'Replace placeholder URL with actual URL or environment variable',
  },
  {
    type: 'placeholder_code',
    severity: 'high',
    name: 'Placeholder Email',
    patterns: [
      /['"]example@example\.com['"]/gi,
      /['"]test@test\.com['"]/gi,
      /['"]user@domain\.com['"]/gi,
      /['"]your-email@[^'"]+['"]/gi,
    ],
    suggestion: 'Replace placeholder email with actual email or environment variable',
  },
  {
    type: 'placeholder_code',
    severity: 'medium',
    name: 'Placeholder Text',
    patterns: [
      /['"]YOUR_[A-Z_]+_HERE['"]/g,
      /['"]REPLACE_[A-Z_]+['"]/g,
      /['"]<[A-Z_]+>['"]/g,
      /['"]INSERT_[A-Z_]+['"]/g,
      /['"]CHANGE_ME['"]/gi,
      /['"]PLACEHOLDER['"]/gi,
    ],
    suggestion: 'Replace placeholder with actual value',
  },

  // Incomplete Error Handling
  {
    type: 'incomplete_error',
    severity: 'medium',
    name: 'Empty Catch Block',
    patterns: [/catch\s*\([^)]*\)\s*\{\s*\}/g, /catch\s*\([^)]*\)\s*\{\s*\/\/\s*\}/g],
    suggestion: 'Add proper error handling',
  },
  {
    type: 'incomplete_error',
    severity: 'low',
    name: 'Silenced Error',
    patterns: [/catch\s*\([^)]*\)\s*\{\s*\/\/\s*(ignore|silent|suppress)/gi],
    suggestion: 'Consider logging the error or handling it properly',
  },
];

/**
 * Detect placeholders in code
 */
export function detectPlaceholders(content: string, filename?: string): OutputIssue[] {
  const issues: OutputIssue[] = [];
  const lines = content.split('\n');

  for (const placeholder of PLACEHOLDER_PATTERNS) {
    for (const pattern of placeholder.patterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const line = lines[lineNumber - 1] || '';

        // Find column
        const lineStart = beforeMatch.lastIndexOf('\n') + 1;
        const column = match.index - lineStart + 1;

        issues.push({
          id: uuid(),
          type: placeholder.type,
          severity: placeholder.severity,
          message: `${placeholder.name} detected`,
          file: filename,
          line: lineNumber,
          column,
          snippet: line.trim(),
          pattern: pattern.source,
          matched: match[0],
          suggestion: placeholder.suggestion,
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

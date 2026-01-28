/**
 * OLYMPUS 2.0 - Dangerous Pattern Detector
 *
 * Detects dangerous code patterns: eval, XSS risks, SQL injection,
 * command injection, debug code, and other security issues.
 */

import { OutputIssue, SecurityIssueType, Severity } from './types';
import { v4 as uuid } from 'uuid';

/**
 * Dangerous pattern definition
 */
interface DangerousPattern {
  type: SecurityIssueType;
  severity: Severity;
  name: string;
  patterns: RegExp[];
  suggestion: string;
  context?: string;
}

/**
 * All dangerous patterns we detect
 */
const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Code Execution
  {
    type: 'eval_usage',
    severity: 'critical',
    name: 'eval() Usage',
    patterns: [/\beval\s*\(/g, /new\s+Function\s*\(/g],
    suggestion: 'Avoid eval() - use JSON.parse() or safer alternatives',
  },
  {
    type: 'eval_usage',
    severity: 'high',
    name: 'Dynamic Code Execution',
    patterns: [/setTimeout\s*\(\s*['"`][^'"`]+['"`]/g, /setInterval\s*\(\s*['"`][^'"`]+['"`]/g],
    suggestion: 'Pass a function reference instead of a string',
  },

  // XSS Risks
  {
    type: 'xss_risk',
    severity: 'high',
    name: 'dangerouslySetInnerHTML',
    patterns: [/dangerouslySetInnerHTML/g],
    suggestion: 'Sanitize HTML content before using dangerouslySetInnerHTML',
    context: 'React',
  },
  {
    type: 'xss_risk',
    severity: 'high',
    name: 'innerHTML Assignment',
    patterns: [/\.innerHTML\s*=/g, /\.outerHTML\s*=/g],
    suggestion: 'Use textContent or sanitize HTML before assignment',
  },
  {
    type: 'xss_risk',
    severity: 'medium',
    name: 'document.write',
    patterns: [/document\.write\s*\(/g, /document\.writeln\s*\(/g],
    suggestion: 'Avoid document.write() - use DOM manipulation instead',
  },

  // SQL Injection Risks
  {
    type: 'sql_injection_risk',
    severity: 'critical',
    name: 'String Concatenation in SQL',
    patterns: [
      /['"`]SELECT\s+.+\s+FROM.+\$\{/gi,
      /['"`]INSERT\s+INTO.+\$\{/gi,
      /['"`]UPDATE\s+.+\s+SET.+\$\{/gi,
      /['"`]DELETE\s+FROM.+\$\{/gi,
      /query\s*\(\s*['"`]SELECT.+\+/gi,
      /query\s*\(\s*['"`]INSERT.+\+/gi,
    ],
    suggestion: 'Use parameterized queries instead of string concatenation',
  },
  {
    type: 'sql_injection_risk',
    severity: 'high',
    name: 'Raw SQL Query',
    patterns: [/\$executeRaw\s*`/g, /\$queryRaw\s*`/g],
    suggestion: 'Ensure raw queries use parameterized inputs',
    context: 'Prisma',
  },

  // Command Injection
  {
    type: 'dangerous_pattern',
    severity: 'critical',
    name: 'Shell Command Execution',
    patterns: [
      /exec\s*\(\s*['"`][^'"`]*\$\{/g,
      /execSync\s*\(\s*['"`][^'"`]*\$\{/g,
      /spawn\s*\(\s*['"`][^'"`]*\$\{/g,
    ],
    suggestion: 'Sanitize all inputs used in shell commands',
  },

  // Path Traversal
  {
    type: 'dangerous_pattern',
    severity: 'high',
    name: 'Path Traversal Risk',
    patterns: [/path\.join\s*\([^)]*\$\{/g, /readFile\s*\(\s*\$\{/g, /writeFile\s*\(\s*\$\{/g],
    suggestion: 'Validate and sanitize file paths to prevent directory traversal',
  },

  // Insecure Cryptography
  {
    type: 'dangerous_pattern',
    severity: 'high',
    name: 'Weak Cryptography',
    patterns: [
      /createHash\s*\(\s*['"]md5['"]\s*\)/gi,
      /createHash\s*\(\s*['"]sha1['"]\s*\)/gi,
      /crypto\.createCipher\(/g, // Deprecated
    ],
    suggestion: 'Use SHA-256 or stronger hashing algorithms',
  },

  // Insecure Random
  {
    type: 'dangerous_pattern',
    severity: 'medium',
    name: 'Insecure Random',
    patterns: [/Math\.random\s*\(\s*\)/g],
    suggestion: 'For security-sensitive random values, use crypto.randomBytes()',
    context: 'If used for tokens, IDs, or security',
  },

  // Debug Code
  {
    type: 'debug_code',
    severity: 'low',
    name: 'Console Log',
    patterns: [/console\.log\s*\(/g, /console\.debug\s*\(/g, /console\.info\s*\(/g],
    suggestion: 'Remove or replace with proper logging',
  },
  {
    type: 'debug_code',
    severity: 'medium',
    name: 'Debugger Statement',
    patterns: [/\bdebugger\b/g],
    suggestion: 'Remove debugger statement before production',
  },
  {
    type: 'debug_code',
    severity: 'low',
    name: 'Alert Statement',
    patterns: [/\balert\s*\(/g],
    suggestion: 'Remove alert() calls before production',
  },

  // Hardcoded Ports/Hosts
  {
    type: 'dangerous_pattern',
    severity: 'low',
    name: 'Hardcoded Port',
    patterns: [/listen\s*\(\s*\d{4,5}\s*[,)]/g, /port\s*[=:]\s*\d{4,5}/gi],
    suggestion: 'Use environment variable for port configuration',
  },
  {
    type: 'dangerous_pattern',
    severity: 'medium',
    name: 'Hardcoded Localhost',
    patterns: [/['"]localhost:\d+['"]/g, /['"]127\.0\.0\.1:\d+['"]/g, /['"]0\.0\.0\.0:\d+['"]/g],
    suggestion: 'Use environment variable for host configuration',
  },
];

/**
 * Detect dangerous patterns in code
 */
export function detectDangerousPatterns(content: string, filename?: string): OutputIssue[] {
  const issues: OutputIssue[] = [];
  const lines = content.split('\n');

  for (const dangerous of DANGEROUS_PATTERNS) {
    for (const pattern of dangerous.patterns) {
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

        // Skip if in a comment
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
          continue;
        }

        issues.push({
          id: uuid(),
          type: dangerous.type,
          severity: dangerous.severity,
          message: `${dangerous.name} detected${dangerous.context ? ` (${dangerous.context})` : ''}`,
          file: filename,
          line: lineNumber,
          column,
          snippet: line.trim(),
          pattern: pattern.source,
          matched: match[0],
          suggestion: dangerous.suggestion,
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

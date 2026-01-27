/**
 * OLYMPUS 3.0 - Security Validator
 * =================================
 * Detects security vulnerabilities in generated code
 */

import { ValidationIssue, GeneratedFile } from '../types';

interface SecurityPattern {
  pattern: RegExp;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion: string;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // Dangerous functions
  {
    pattern: /\beval\s*\(/,
    code: 'SEC_EVAL',
    message: 'Use of eval() is dangerous and can lead to code injection',
    severity: 'error',
    suggestion: 'Use JSON.parse() for JSON or find safer alternatives',
  },
  {
    pattern: /new\s+Function\s*\(/,
    code: 'SEC_FUNCTION_CONSTRUCTOR',
    message: 'Function constructor is equivalent to eval()',
    severity: 'error',
    suggestion: 'Avoid dynamic function creation',
  },

  // XSS vulnerabilities
  {
    pattern: /\.innerHTML\s*=/,
    code: 'SEC_INNERHTML',
    message: 'innerHTML can lead to XSS vulnerabilities',
    severity: 'warning',
    suggestion: 'Use textContent or proper sanitization',
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    code: 'SEC_DANGEROUS_HTML',
    message: 'dangerouslySetInnerHTML can lead to XSS',
    severity: 'warning',
    suggestion: 'Sanitize HTML with DOMPurify or similar',
  },
  {
    pattern: /document\.write\s*\(/,
    code: 'SEC_DOCUMENT_WRITE',
    message: 'document.write is dangerous and deprecated',
    severity: 'error',
    suggestion: 'Use DOM manipulation methods instead',
  },

  // SQL Injection
  {
    pattern: /['"`]\s*\+\s*\w+\s*\+\s*['"`].*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i,
    code: 'SEC_SQL_INJECTION',
    message: 'Possible SQL injection - string concatenation in query',
    severity: 'error',
    suggestion: 'Use parameterized queries or ORM',
  },
  {
    pattern: /\$\{[^}]+\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i,
    code: 'SEC_SQL_INJECTION_TEMPLATE',
    message: 'Possible SQL injection - template literal in query',
    severity: 'error',
    suggestion: 'Use parameterized queries or ORM',
  },

  // Hardcoded secrets
  {
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    code: 'SEC_HARDCODED_PASSWORD',
    message: 'Hardcoded password detected',
    severity: 'error',
    suggestion: 'Use environment variables for secrets',
  },
  {
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    code: 'SEC_HARDCODED_API_KEY',
    message: 'Hardcoded API key detected',
    severity: 'error',
    suggestion: 'Use environment variables for API keys',
  },
  {
    pattern: /(?:sk|pk)_(?:live|test)_[a-zA-Z0-9]{20,}/,
    code: 'SEC_STRIPE_KEY',
    message: 'Stripe API key detected in code',
    severity: 'error',
    suggestion: 'Move to environment variables immediately',
  },
  {
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    code: 'SEC_GITHUB_TOKEN',
    message: 'GitHub personal access token detected',
    severity: 'error',
    suggestion: 'Revoke this token and use environment variables',
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    code: 'SEC_AWS_KEY',
    message: 'AWS access key detected in code',
    severity: 'error',
    suggestion: 'Revoke this key and use environment variables',
  },

  // Command injection
  {
    pattern: /child_process.*exec\s*\([^)]*\+/,
    code: 'SEC_COMMAND_INJECTION',
    message: 'Possible command injection in exec()',
    severity: 'error',
    suggestion: 'Use execFile() with argument array instead',
  },
  {
    pattern: /child_process.*spawn\s*\([^,]+,\s*[^[\]]+\+/,
    code: 'SEC_SPAWN_INJECTION',
    message: 'Possible command injection in spawn()',
    severity: 'error',
    suggestion: 'Validate and sanitize command arguments',
  },

  // Path traversal
  {
    pattern: /(?:readFile|writeFile|unlink|rmdir).*(?:\+|`.*\$\{)/,
    code: 'SEC_PATH_TRAVERSAL',
    message: 'Possible path traversal vulnerability',
    severity: 'error',
    suggestion: 'Validate and sanitize file paths',
  },

  // Insecure randomness
  {
    pattern: /Math\.random\s*\(\s*\).*(?:token|key|secret|password|id)/i,
    code: 'SEC_WEAK_RANDOM',
    message: 'Math.random() is not cryptographically secure',
    severity: 'warning',
    suggestion: 'Use crypto.randomBytes() or crypto.randomUUID()',
  },

  // Disabled security
  {
    pattern: /(?:verify|rejectUnauthorized)\s*:\s*false/,
    code: 'SEC_TLS_DISABLED',
    message: 'TLS certificate verification disabled',
    severity: 'error',
    suggestion: 'Enable certificate verification in production',
  },

  // CORS issues
  {
    pattern: /Access-Control-Allow-Origin['":\s]+\*/,
    code: 'SEC_CORS_WILDCARD',
    message: 'CORS allows all origins',
    severity: 'warning',
    suggestion: 'Restrict to specific trusted origins',
  },

  // Prototype pollution
  {
    pattern: /\[['"]__proto__['"]\]/,
    code: 'SEC_PROTO_POLLUTION',
    message: 'Possible prototype pollution vulnerability',
    severity: 'error',
    suggestion: 'Sanitize object keys or use Object.create(null)',
  },

  // Regex DoS
  {
    pattern: /new\s+RegExp\s*\([^)]*\+/,
    code: 'SEC_REGEX_INJECTION',
    message: 'Dynamic regex creation may lead to ReDoS',
    severity: 'warning',
    suggestion: 'Validate and escape regex input',
  },
];

/**
 * Validate security of a generated file
 */
export async function validateSecurity(file: GeneratedFile): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { content, path } = file;
  const lines = content.split('\n');

  // Skip non-code files
  if (path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.css')) {
    return issues;
  }

  lines.forEach((line, lineNum) => {
    // Skip comments
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
      return;
    }

    for (const { pattern, code, message, severity, suggestion } of SECURITY_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({
          code,
          message,
          severity,
          line: lineNum + 1,
          suggestion,
        });
      }
    }
  });

  // Check for missing security headers in API routes
  if (path.includes('/api/') || path.includes('route.ts') || path.includes('route.js')) {
    const hasRateLimit = /rateLimit|rateLimiter|throttle/i.test(content);
    const hasValidation = /zod|yup|joi|validate|schema/i.test(content);

    if (!hasRateLimit) {
      issues.push({
        code: 'SEC_NO_RATE_LIMIT',
        message: 'API route has no rate limiting',
        severity: 'warning',
        suggestion: 'Add rate limiting to prevent abuse',
      });
    }

    if (!hasValidation) {
      issues.push({
        code: 'SEC_NO_VALIDATION',
        message: 'API route has no input validation',
        severity: 'warning',
        suggestion: 'Add Zod or similar for request validation',
      });
    }
  }

  return issues;
}

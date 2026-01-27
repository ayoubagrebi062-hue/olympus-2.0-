/**
 * OLYMPUS 2.0 - Security Scanner
 *
 * Scans generated code for security vulnerabilities:
 * - XSS vulnerabilities
 * - SQL injection
 * - Command injection
 * - Hardcoded secrets
 * - Insecure dependencies patterns
 */

import {
  QualityGate,
  GateType,
  GateResult,
  GateIssue,
  GateConfig,
  FileToCheck,
  SECURITY_PATTERNS,
  SecurityPattern,
} from './types';

// Import OLYMPUS 2.1 Security Blueprint scanners
import { scanForSecrets, scanForMalware, scanPackageJson } from '../security';

// ============================================
// ADDITIONAL SECURITY PATTERNS
// ============================================

const EXTENDED_SECURITY_PATTERNS: SecurityPattern[] = [
  // XSS Patterns
  {
    name: 'document-write',
    pattern: /document\.write\s*\(/g,
    severity: 'error',
    message: 'document.write() can cause XSS vulnerabilities',
    suggestion: 'Use DOM manipulation methods instead',
  },
  {
    name: 'unescaped-interpolation',
    pattern: /\$\{[^}]*(?:user|input|query|param|data)[^}]*\}/gi,
    severity: 'warning',
    message: 'User input in template literal - ensure proper sanitization',
    suggestion: 'Sanitize user input before interpolation',
  },

  // Authentication/Authorization
  {
    name: 'jwt-no-verify',
    pattern: /jwt\.decode\s*\(/g,
    severity: 'warning',
    message: 'JWT decoded without verification',
    suggestion: 'Use jwt.verify() instead of jwt.decode()',
  },
  {
    name: 'weak-password-regex',
    pattern: /password.*\.length\s*(?:>|>=)\s*[1-5]\b/gi,
    severity: 'warning',
    message: 'Weak password length requirement detected',
    suggestion: 'Require at least 8 characters for passwords',
  },

  // Data Exposure
  {
    name: 'exposed-stack-trace',
    pattern: /(?:error|err)\.stack/gi,
    severity: 'info',
    message: 'Stack trace may be exposed to users',
    suggestion: 'Log stack traces server-side only',
  },
  {
    name: 'sensitive-log',
    pattern: /console\.log\s*\([^)]*(?:password|secret|token|key|auth)[^)]*\)/gi,
    severity: 'error',
    message: 'Sensitive data may be logged',
    suggestion: 'Never log sensitive information',
  },

  // Insecure Practices
  {
    name: 'http-url',
    pattern: /['"`]http:\/\/(?!localhost|127\.0\.0\.1)[^'"`]+['"`]/g,
    severity: 'warning',
    message: 'Insecure HTTP URL detected',
    suggestion: 'Use HTTPS for external URLs',
  },
  {
    name: 'cors-wildcard',
    pattern: /(?:cors|access-control-allow-origin)['":\s]+\*/gi,
    severity: 'warning',
    message: 'CORS wildcard (*) allows any origin',
    suggestion: 'Specify allowed origins explicitly',
  },
  {
    name: 'disabled-csrf',
    pattern: /csrf\s*[:=]\s*false/gi,
    severity: 'error',
    message: 'CSRF protection is disabled',
    suggestion: 'Enable CSRF protection',
  },

  // Cryptographic Issues
  {
    name: 'weak-hash',
    pattern: /(?:md5|sha1)\s*\(/gi,
    severity: 'warning',
    message: 'Weak hashing algorithm detected',
    suggestion: 'Use SHA-256 or stronger algorithms',
  },
  {
    name: 'hardcoded-iv',
    pattern: /(?:iv|nonce)\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'error',
    message: 'Hardcoded initialization vector detected',
    suggestion: 'Generate IV randomly for each encryption',
  },

  // React-specific
  {
    name: 'react-href-javascript',
    pattern: /href\s*=\s*['"`]javascript:/gi,
    severity: 'error',
    message: 'javascript: URLs in href can lead to XSS',
    suggestion: 'Use onClick handlers instead',
  },
  {
    name: 'uncontrolled-redirect',
    pattern: /(?:window\.location|router\.push)\s*\(\s*(?:\$\{|[a-z_]+\s*\+)/gi,
    severity: 'warning',
    message: 'Unvalidated redirect may lead to open redirect vulnerability',
    suggestion: 'Validate redirect URLs against whitelist',
  },

  // Node.js specific
  {
    name: 'child-process-shell',
    pattern: /(?:exec|spawn)\s*\([^,)]+,\s*\{[^}]*shell\s*:\s*true/g,
    severity: 'warning',
    message: 'Shell execution in child_process',
    suggestion: 'Avoid shell: true when possible',
  },
  {
    name: 'path-traversal',
    pattern: /(?:readFile|writeFile|readdir)\s*\([^)]*\+[^)]*\)/g,
    severity: 'warning',
    message: 'Possible path traversal vulnerability',
    suggestion: 'Validate and sanitize file paths',
  },
];

// Combine all patterns
const ALL_SECURITY_PATTERNS = [...SECURITY_PATTERNS, ...EXTENDED_SECURITY_PATTERNS];

// ============================================
// SECURITY SCANNER
// ============================================

export class SecurityScanner implements QualityGate {
  type: GateType = 'security';
  name = 'Security Scanner';
  description = 'Scans code for security vulnerabilities and insecure patterns';

  async check(files: FileToCheck[], config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const issues: GateIssue[] = [];

    // Scan all code files
    const codeFiles = files.filter(
      f => f.path.match(/\.(js|jsx|ts|tsx|mjs|cjs)$/)
    );

    if (codeFiles.length === 0) {
      return {
        gate: this.type,
        status: 'skipped',
        passed: true,
        issues: [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    for (const file of codeFiles) {
      // Pattern-based scanning
      const patternIssues = this.scanPatterns(file);
      issues.push(...patternIssues);

      // Semantic analysis
      const semanticIssues = this.analyzeSemantics(file);
      issues.push(...semanticIssues);

      // OLYMPUS 2.1 Security Blueprint - Secret Scanner
      const secretIssues = this.scanSecrets(file);
      issues.push(...secretIssues);

      // OLYMPUS 2.1 Security Blueprint - Malware Scanner
      const malwareIssues = this.scanMalware(file);
      issues.push(...malwareIssues);

      // Dependency analysis (if package.json-like content)
      if (file.path.includes('package.json')) {
        // Use enhanced OLYMPUS 2.1 dependency scanner
        const depIssues = this.scanDependenciesEnhanced(file);
        issues.push(...depIssues);
        // Also run legacy checks for compatibility
        const legacyDepIssues = this.analyzeDependencies(file);
        issues.push(...legacyDepIssues);
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const passed = errorCount === 0;

    return {
      gate: this.type,
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: codeFiles.length,
        issuesFound: issues.length,
        errorCount,
        warningCount: issues.filter(i => i.severity === 'warning').length,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  /**
   * Scan for security patterns
   */
  private scanPatterns(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    for (const pattern of ALL_SECURITY_PATTERNS) {
      let match;
      pattern.pattern.lastIndex = 0; // Reset regex

      while ((match = pattern.pattern.exec(file.content)) !== null) {
        // Find line number
        const beforeMatch = file.content.substring(0, match.index);
        const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;

        issues.push({
          severity: pattern.severity,
          message: pattern.message,
          file: file.path,
          line: lineNum,
          rule: pattern.name,
          suggestion: pattern.suggestion,
        });
      }
    }

    return issues;
  }

  /**
   * Semantic security analysis
   */
  private analyzeSemantics(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const lines = file.content.split('\n');

    // Check for authentication bypass patterns
    if (file.content.includes('isAuthenticated') || file.content.includes('isAuthorized')) {
      // Check if there's proper error handling
      if (!file.content.includes('throw') && !file.content.includes('redirect') && !file.content.includes('return null')) {
        // Might be missing auth enforcement
      }
    }

    // Check for proper input validation
    if (file.content.includes('req.body') || file.content.includes('req.query') || file.content.includes('req.params')) {
      if (!file.content.includes('validate') && !file.content.includes('sanitize') && !file.content.includes('zod') && !file.content.includes('yup')) {
        issues.push({
          severity: 'warning',
          message: 'User input may not be validated',
          file: file.path,
          rule: 'input-validation',
          suggestion: 'Use validation libraries like Zod or Yup',
        });
      }
    }

    // Check for proper error handling in API routes
    if (file.path.includes('/api/') || file.path.includes('route.ts')) {
      if (!file.content.includes('try') && !file.content.includes('catch')) {
        issues.push({
          severity: 'warning',
          message: 'API route may lack error handling',
          file: file.path,
          rule: 'error-handling',
          suggestion: 'Wrap route handlers in try-catch blocks',
        });
      }
    }

    // Check for sensitive data in responses
    if (file.content.match(/(?:json|send)\s*\([^)]*password/i)) {
      issues.push({
        severity: 'error',
        message: 'Password may be included in API response',
        file: file.path,
        rule: 'sensitive-response',
        suggestion: 'Never include passwords in API responses',
      });
    }

    // Check for secure headers in API responses
    if (file.path.includes('/api/')) {
      // Check if security headers are set
      const hasSecurityHeaders =
        file.content.includes('X-Content-Type-Options') ||
        file.content.includes('X-Frame-Options') ||
        file.content.includes('Content-Security-Policy');

      if (!hasSecurityHeaders && file.content.includes('NextResponse')) {
        issues.push({
          severity: 'info',
          message: 'Consider adding security headers to API responses',
          file: file.path,
          rule: 'security-headers',
          suggestion: 'Add X-Content-Type-Options, X-Frame-Options headers',
        });
      }
    }

    return issues;
  }

  /**
   * OLYMPUS 2.1 Security Blueprint - Secret Scanner
   * Detects API keys, tokens, credentials in code
   */
  private scanSecrets(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const result = scanForSecrets(file.content);

    for (const match of result.matches) {
      issues.push({
        severity: match.severity === 'critical' ? 'error' : match.severity === 'high' ? 'error' : 'warning',
        message: `Secret detected: ${match.pattern}`,
        file: file.path,
        line: match.line,
        rule: `secret-${match.pattern}`,
        suggestion: 'Remove hardcoded secret and use environment variables',
      });
    }

    return issues;
  }

  /**
   * OLYMPUS 2.1 Security Blueprint - Malware Scanner
   * Detects crypto miners, keyloggers, backdoors, data exfiltration
   */
  private scanMalware(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];
    const result = scanForMalware(file.content);

    for (const match of result.matches) {
      issues.push({
        severity: match.severity === 'critical' ? 'error' : match.severity === 'high' ? 'error' : 'warning',
        message: `Malware pattern detected: ${match.pattern} (${match.category})`,
        file: file.path,
        line: match.line,
        rule: `malware-${match.category}`,
        suggestion: match.description || 'Remove suspicious code pattern',
      });
    }

    return issues;
  }

  /**
   * OLYMPUS 2.1 Security Blueprint - Enhanced Dependency Scanner
   * Checks for blocklisted packages, typosquatting, supply chain attacks
   */
  private scanDependenciesEnhanced(file: FileToCheck): GateIssue[] {
    const gateIssues: GateIssue[] = [];
    const result = scanPackageJson(file.content, true); // Strict mode

    for (const depIssue of result.issues) {
      gateIssues.push({
        severity: depIssue.severity === 'critical' ? 'error' : depIssue.severity === 'high' ? 'error' : 'warning',
        message: `Dependency issue: ${depIssue.package} - ${depIssue.reason}`,
        file: file.path,
        rule: `dep-${depIssue.type}`,
        suggestion: depIssue.alternative || 'Review and update this dependency',
      });
    }

    return gateIssues;
  }

  /**
   * Analyze dependencies for known vulnerabilities
   */
  private analyzeDependencies(file: FileToCheck): GateIssue[] {
    const issues: GateIssue[] = [];

    try {
      const pkg = JSON.parse(file.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Known vulnerable packages (simplified check)
      const vulnerablePackages: Record<string, { message: string; suggestion: string }> = {
        'lodash': {
          message: 'Older versions of lodash have known vulnerabilities',
          suggestion: 'Ensure lodash is updated to latest version',
        },
        'minimist': {
          message: 'Older versions of minimist have prototype pollution vulnerability',
          suggestion: 'Update minimist to >= 1.2.6',
        },
        'node-fetch': {
          message: 'node-fetch v2.x has redirect vulnerability',
          suggestion: 'Update to node-fetch >= 3.x or use native fetch',
        },
      };

      for (const [pkg, info] of Object.entries(vulnerablePackages)) {
        if (deps[pkg]) {
          issues.push({
            severity: 'warning',
            message: info.message,
            file: file.path,
            rule: 'vulnerable-dependency',
            suggestion: info.suggestion,
          });
        }
      }

      // Check for exact versions (security best practice)
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && version.startsWith('^')) {
          // This is expected and fine for development
        }
      }

    } catch (e) {
      // Not valid JSON, skip
    }

    return issues;
  }
}

// ============================================
// EXPORTS
// ============================================

export const securityScanner = new SecurityScanner();

export default {
  SecurityScanner,
  securityScanner,
  ALL_SECURITY_PATTERNS,
};

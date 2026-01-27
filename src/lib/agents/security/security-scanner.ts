/**
 * OLYMPUS 50X - Security Scanner
 *
 * Scans generated code for security vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - Injection attacks
 * - Dangerous patterns (eval, innerHTML, etc.)
 * - Unsafe dependencies
 * - Data exposure risks
 */

// ============================================
// TYPES
// ============================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VulnerabilityCategory =
  | 'xss'
  | 'injection'
  | 'dangerous_function'
  | 'unsafe_pattern'
  | 'data_exposure'
  | 'insecure_config'
  | 'dependency_risk';

export interface SecurityVulnerability {
  id: string;
  category: VulnerabilityCategory;
  severity: SeverityLevel;
  title: string;
  description: string;
  line?: number;
  column?: number;
  code?: string;
  suggestion?: string;
  cwe?: string; // Common Weakness Enumeration
}

export interface ScanResult {
  passed: boolean;
  score: number; // 0-100, 100 = no issues
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  scanDuration: number;
  scannedLines: number;
}

export interface ScanOptions {
  strictMode?: boolean; // More aggressive checks
  allowInnerHTML?: boolean; // Some use cases need it
  allowEval?: boolean; // Rare but sometimes needed
  customPatterns?: SecurityPattern[];
  ignoredRules?: string[];
}

export interface SecurityPattern {
  id: string;
  pattern: RegExp;
  category: VulnerabilityCategory;
  severity: SeverityLevel;
  title: string;
  description: string;
  suggestion?: string;
  cwe?: string;
}

// ============================================
// SECURITY PATTERNS
// ============================================

const SECURITY_PATTERNS: SecurityPattern[] = [
  // ===================
  // XSS PATTERNS
  // ===================
  {
    id: 'XSS001',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/gi,
    category: 'xss',
    severity: 'high',
    title: 'Dangerous innerHTML usage',
    description:
      'dangerouslySetInnerHTML can execute arbitrary HTML/JS. Ensure content is sanitized.',
    suggestion: 'Use DOMPurify.sanitize() or a similar sanitization library before setting HTML.',
    cwe: 'CWE-79',
  },
  {
    id: 'XSS002',
    pattern: /\.innerHTML\s*=(?!=)/gi,
    category: 'xss',
    severity: 'critical',
    title: 'Direct innerHTML assignment',
    description: 'Setting innerHTML directly can lead to XSS attacks.',
    suggestion: 'Use textContent for text, or sanitize HTML with DOMPurify.',
    cwe: 'CWE-79',
  },
  {
    id: 'XSS003',
    pattern: /\.outerHTML\s*=(?!=)/gi,
    category: 'xss',
    severity: 'critical',
    title: 'Direct outerHTML assignment',
    description: 'Setting outerHTML directly can lead to XSS attacks.',
    suggestion: 'Avoid outerHTML assignment. Use safe DOM manipulation methods.',
    cwe: 'CWE-79',
  },
  {
    id: 'XSS004',
    pattern: /document\.write\s*\(/gi,
    category: 'xss',
    severity: 'high',
    title: 'document.write usage',
    description: 'document.write can inject arbitrary content and is a security risk.',
    suggestion: 'Use DOM manipulation methods like createElement and appendChild.',
    cwe: 'CWE-79',
  },

  // ===================
  // INJECTION PATTERNS
  // ===================
  {
    id: 'INJ001',
    pattern: /eval\s*\(/gi,
    category: 'injection',
    severity: 'critical',
    title: 'eval() usage detected',
    description: 'eval() executes arbitrary code and is a severe security risk.',
    suggestion: 'Use JSON.parse() for JSON, or Function constructor with extreme caution.',
    cwe: 'CWE-95',
  },
  {
    id: 'INJ002',
    pattern: /new\s+Function\s*\(/gi,
    category: 'injection',
    severity: 'high',
    title: 'Function constructor usage',
    description: 'new Function() can execute arbitrary code similar to eval().',
    suggestion: 'Avoid dynamic code generation. Use static functions or safe alternatives.',
    cwe: 'CWE-95',
  },
  {
    id: 'INJ003',
    pattern: /setTimeout\s*\(\s*['"`]/gi,
    category: 'injection',
    severity: 'medium',
    title: 'setTimeout with string argument',
    description: 'setTimeout with a string argument works like eval().',
    suggestion: 'Pass a function reference instead of a string.',
    cwe: 'CWE-95',
  },
  {
    id: 'INJ004',
    pattern: /setInterval\s*\(\s*['"`]/gi,
    category: 'injection',
    severity: 'medium',
    title: 'setInterval with string argument',
    description: 'setInterval with a string argument works like eval().',
    suggestion: 'Pass a function reference instead of a string.',
    cwe: 'CWE-95',
  },

  // ===================
  // DANGEROUS FUNCTIONS
  // ===================
  {
    id: 'DNG001',
    pattern: /execSync|spawnSync|exec\s*\(/gi,
    category: 'dangerous_function',
    severity: 'critical',
    title: 'Shell command execution',
    description: 'Executing shell commands can lead to command injection.',
    suggestion: 'Validate and sanitize all inputs. Use parameterized commands.',
    cwe: 'CWE-78',
  },
  {
    id: 'DNG002',
    pattern: /child_process/gi,
    category: 'dangerous_function',
    severity: 'high',
    title: 'child_process module usage',
    description: 'child_process can execute system commands.',
    suggestion: 'Ensure all command inputs are strictly validated.',
    cwe: 'CWE-78',
  },
  {
    id: 'DNG003',
    pattern: /require\s*\(\s*[^'"]/gi,
    category: 'dangerous_function',
    severity: 'medium',
    title: 'Dynamic require()',
    description: 'Dynamic require() can load arbitrary modules.',
    suggestion: 'Use static imports or validate the module path.',
    cwe: 'CWE-829',
  },

  // ===================
  // UNSAFE PATTERNS
  // ===================
  {
    id: 'USF001',
    pattern: /localStorage\.setItem|sessionStorage\.setItem/gi,
    category: 'unsafe_pattern',
    severity: 'low',
    title: 'Client-side storage detected',
    description: 'Storing sensitive data in localStorage/sessionStorage is risky.',
    suggestion: 'Never store sensitive data (tokens, passwords) in client storage.',
    cwe: 'CWE-922',
  },
  {
    id: 'USF002',
    pattern: /document\.cookie\s*=(?!=)/gi,
    category: 'unsafe_pattern',
    severity: 'medium',
    title: 'Direct cookie manipulation',
    description: 'Setting cookies directly may skip security flags.',
    suggestion: 'Always set HttpOnly, Secure, and SameSite flags.',
    cwe: 'CWE-614',
  },
  {
    id: 'USF003',
    pattern: /\$\{.*\}/g,
    category: 'unsafe_pattern',
    severity: 'info',
    title: 'Template literal detected',
    description: 'Template literals with user input can be injection vectors.',
    suggestion: 'Ensure user input is validated before interpolation.',
    cwe: 'CWE-94',
  },
  {
    id: 'USF004',
    pattern: /onclick\s*=\s*["']/gi,
    category: 'unsafe_pattern',
    severity: 'low',
    title: 'Inline event handler',
    description: 'Inline event handlers can be XSS vectors.',
    suggestion: 'Use addEventListener() or React event props instead.',
    cwe: 'CWE-79',
  },

  // ===================
  // DATA EXPOSURE
  // ===================
  {
    id: 'EXP001',
    pattern: /console\.(log|debug|info|warn|error)\s*\(/gi,
    category: 'data_exposure',
    severity: 'info',
    title: 'Console logging detected',
    description: 'Console logs may expose sensitive data in production.',
    suggestion: 'Remove or disable console logs in production builds.',
    cwe: 'CWE-532',
  },
  {
    id: 'EXP002',
    pattern: /password|secret|apikey|api_key|token|credential/gi,
    category: 'data_exposure',
    severity: 'medium',
    title: 'Potential sensitive data',
    description: 'Variable may contain sensitive information.',
    suggestion: 'Ensure sensitive data is not hardcoded or exposed to client.',
    cwe: 'CWE-798',
  },
  {
    id: 'EXP003',
    pattern: /['"][A-Za-z0-9+/=]{40,}['"]/g,
    category: 'data_exposure',
    severity: 'medium',
    title: 'Potential hardcoded secret',
    description: 'Long encoded string may be a hardcoded API key or secret.',
    suggestion: 'Use environment variables for secrets.',
    cwe: 'CWE-798',
  },

  // ===================
  // INSECURE CONFIG
  // ===================
  {
    id: 'CFG001',
    pattern: /cors\s*:\s*\*|Access-Control-Allow-Origin.*\*/gi,
    category: 'insecure_config',
    severity: 'medium',
    title: 'Wildcard CORS policy',
    description: 'Allowing all origins can expose your API to attacks.',
    suggestion: 'Specify allowed origins explicitly.',
    cwe: 'CWE-942',
  },
  {
    id: 'CFG002',
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    category: 'insecure_config',
    severity: 'low',
    title: 'Non-HTTPS URL detected',
    description: 'HTTP connections are not encrypted.',
    suggestion: 'Use HTTPS for all external connections.',
    cwe: 'CWE-319',
  },
];

// ============================================
// REACT/JSX SPECIFIC PATTERNS
// ============================================

const REACT_PATTERNS: SecurityPattern[] = [
  {
    id: 'RCT001',
    pattern: /href\s*=\s*\{[^}]*(?:user|input|param|query)/gi,
    category: 'xss',
    severity: 'high',
    title: 'Dynamic href with user input',
    description: 'User input in href can lead to javascript: URL XSS.',
    suggestion: 'Validate URLs and block javascript: protocol.',
    cwe: 'CWE-79',
  },
  {
    id: 'RCT002',
    pattern: /src\s*=\s*\{[^}]*(?:user|input|param|query)/gi,
    category: 'xss',
    severity: 'high',
    title: 'Dynamic src with user input',
    description: 'User input in src can load malicious resources.',
    suggestion: 'Validate and sanitize URLs before use.',
    cwe: 'CWE-79',
  },
  {
    id: 'RCT003',
    pattern: /__UNSAFE__|UNSAFE_/gi,
    category: 'unsafe_pattern',
    severity: 'medium',
    title: 'Unsafe lifecycle method',
    description: 'UNSAFE_ prefixed methods are deprecated and risky.',
    suggestion: 'Migrate to safe lifecycle alternatives.',
    cwe: 'CWE-477',
  },
];

// ============================================
// SECURITY SCANNER CLASS
// ============================================

export class SecurityScanner {
  private patterns: SecurityPattern[];
  private options: ScanOptions;

  constructor(options: ScanOptions = {}) {
    this.options = {
      strictMode: false,
      allowInnerHTML: false,
      allowEval: false,
      ...options,
    };

    // Build pattern list
    this.patterns = [...SECURITY_PATTERNS, ...REACT_PATTERNS, ...(options.customPatterns || [])];

    // Apply options
    if (this.options.allowInnerHTML) {
      this.patterns = this.patterns.filter(
        p => !p.id.startsWith('XSS001') && !p.id.startsWith('XSS002')
      );
    }
    if (this.options.allowEval) {
      this.patterns = this.patterns.filter(p => p.id !== 'INJ001');
    }

    // Apply ignored rules
    if (this.options.ignoredRules?.length) {
      this.patterns = this.patterns.filter(p => !this.options.ignoredRules!.includes(p.id));
    }
  }

  /**
   * Scan code for security vulnerabilities
   */
  scan(code: string): ScanResult {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const lines = code.split('\n');

    // Scan each pattern
    for (const pattern of this.patterns) {
      // Reset regex state
      pattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(code)) !== null) {
        // Find line and column
        const beforeMatch = code.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const column = match.index - lastNewline;

        // Extract code context
        const contextStart = Math.max(0, lineNumber - 2);
        const contextEnd = Math.min(lines.length, lineNumber + 1);
        const codeContext = lines.slice(contextStart, contextEnd).join('\n');

        vulnerabilities.push({
          id: `${pattern.id}-${match.index}`,
          category: pattern.category,
          severity: pattern.severity,
          title: pattern.title,
          description: pattern.description,
          line: lineNumber,
          column,
          code: codeContext,
          suggestion: pattern.suggestion,
          cwe: pattern.cwe,
        });
      }
    }

    // Calculate summary
    const summary = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
      total: vulnerabilities.length,
    };

    // Calculate score (weighted by severity)
    const maxScore = 100;
    const penalties = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 1,
    };

    let score = maxScore;
    score -= summary.critical * penalties.critical;
    score -= summary.high * penalties.high;
    score -= summary.medium * penalties.medium;
    score -= summary.low * penalties.low;
    score -= summary.info * penalties.info;
    score = Math.max(0, score);

    // In strict mode, any critical/high = fail
    const passed = this.options.strictMode
      ? summary.critical === 0 && summary.high === 0
      : summary.critical === 0;

    return {
      passed,
      score,
      vulnerabilities,
      summary,
      scanDuration: Date.now() - startTime,
      scannedLines: lines.length,
    };
  }

  /**
   * Quick check - returns true if code is safe
   */
  isSafe(code: string): boolean {
    return this.scan(code).passed;
  }

  /**
   * Get human-readable report
   */
  getReport(result: ScanResult): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('              50X SECURITY SCAN REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`Score: ${result.score}/100`);
    lines.push(`Scanned: ${result.scannedLines} lines in ${result.scanDuration}ms`);
    lines.push('');
    lines.push('SUMMARY:');
    lines.push(`  🔴 Critical: ${result.summary.critical}`);
    lines.push(`  🟠 High:     ${result.summary.high}`);
    lines.push(`  🟡 Medium:   ${result.summary.medium}`);
    lines.push(`  🔵 Low:      ${result.summary.low}`);
    lines.push(`  ⚪ Info:     ${result.summary.info}`);
    lines.push('');

    if (result.vulnerabilities.length > 0) {
      lines.push('VULNERABILITIES:');
      lines.push('───────────────────────────────────────────────────────────');

      for (const vuln of result.vulnerabilities) {
        const severityIcon = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🔵',
          info: '⚪',
        }[vuln.severity];

        lines.push('');
        lines.push(`${severityIcon} [${vuln.severity.toUpperCase()}] ${vuln.title}`);
        lines.push(
          `   ID: ${vuln.id.split('-')[0]} | Line: ${vuln.line} | CWE: ${vuln.cwe || 'N/A'}`
        );
        lines.push(`   ${vuln.description}`);
        if (vuln.suggestion) {
          lines.push(`   💡 ${vuln.suggestion}`);
        }
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Sanitize code by removing dangerous patterns
   */
  sanitize(code: string): { code: string; removed: string[] } {
    const removed: string[] = [];
    let sanitized = code;

    // Remove eval calls
    sanitized = sanitized.replace(/eval\s*\([^)]*\)/gi, match => {
      removed.push(`Removed: ${match}`);
      return '/* REMOVED: eval() */';
    });

    // Remove document.write
    sanitized = sanitized.replace(/document\.write\s*\([^)]*\)/gi, match => {
      removed.push(`Removed: ${match}`);
      return '/* REMOVED: document.write() */';
    });

    // Remove innerHTML assignments (keep property access)
    sanitized = sanitized.replace(/\.innerHTML\s*=\s*[^;]+;/gi, match => {
      removed.push(`Removed: ${match}`);
      return '/* REMOVED: innerHTML assignment */;';
    });

    return { code: sanitized, removed };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

let scannerInstance: SecurityScanner | null = null;

/**
 * Get singleton scanner
 */
export function getSecurityScanner(options?: ScanOptions): SecurityScanner {
  if (!scannerInstance) {
    scannerInstance = new SecurityScanner(options);
  }
  return scannerInstance;
}

/**
 * Quick scan
 */
export function scanCode(code: string, options?: ScanOptions): ScanResult {
  const scanner = options ? new SecurityScanner(options) : getSecurityScanner();
  return scanner.scan(code);
}

/**
 * Quick safety check
 */
export function isCodeSafe(code: string, strict = false): boolean {
  const scanner = new SecurityScanner({ strictMode: strict });
  return scanner.isSafe(code);
}

/**
 * Get security report
 */
export function getSecurityReport(code: string, options?: ScanOptions): string {
  const scanner = options ? new SecurityScanner(options) : getSecurityScanner();
  const result = scanner.scan(code);
  return scanner.getReport(result);
}

/**
 * Sanitize generated code
 */
export function sanitizeCode(code: string): { code: string; removed: string[] } {
  return getSecurityScanner().sanitize(code);
}

export default SecurityScanner;

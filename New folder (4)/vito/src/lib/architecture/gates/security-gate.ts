/**
 * OLYMPUS 2.1 - Security Validation Gate
 * Validates code against SENTINEL security constraints.
 */

interface FileToCheck {
  path: string;
  content: string;
}

interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    filesChecked: number;
    criticalIssues: number;
    hasEval: boolean;
    hasInnerHTML: boolean;
    hasHardcodedSecrets: boolean;
  };
}

export const securityValidationGate = {
  name: 'Security Gate',
  description: 'Validates code against SENTINEL security constraints',
  type: 'security',
};

const DANGEROUS_PATTERNS = [
  { id: 'no-eval', pattern: /\beval\s*\(/g, message: 'eval() is forbidden - arbitrary code execution risk', severity: 'error' as const },
  { id: 'no-new-function', pattern: /\bnew\s+Function\s*\(/g, message: 'new Function() is forbidden', severity: 'error' as const },
  { id: 'no-innerHTML', pattern: /\.innerHTML\s*=/g, message: 'innerHTML is dangerous - use textContent or React JSX', severity: 'warning' as const },
  { id: 'no-document-write', pattern: /document\.write\s*\(/g, message: 'document.write() is forbidden', severity: 'error' as const },
  { id: 'no-dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML requires DOMPurify sanitization', severity: 'warning' as const },
];

const SECRET_PATTERNS = [
  { pattern: /['"][a-zA-Z0-9_-]{32,}['"]/g, name: 'Potential API key (32+ chars)' },
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe live key' },
  { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, name: 'Stripe test key' },
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS access key' },
];

const SKIP_PATTERNS = ['.test.ts', '.spec.ts', '__tests__', 'node_modules'];

function shouldSkipFile(path: string): boolean {
  return SKIP_PATTERNS.some(pattern => path.includes(pattern));
}

function findLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function checkDangerousPatterns(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  for (const check of DANGEROUS_PATTERNS) {
    let match;
    const pattern = new RegExp(check.pattern.source, 'g');
    while ((match = pattern.exec(content)) !== null) {
      issues.push({
        rule: check.id,
        message: check.message,
        severity: check.severity,
        file: path,
        line: findLineNumber(content, match.index),
        found: match[0],
        autoFixable: false,
      });
    }
  }
  return issues;
}

function checkHardcodedSecrets(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  if (path.includes('.env') || path.includes('config')) return issues;

  for (const secretCheck of SECRET_PATTERNS) {
    let match;
    const pattern = new RegExp(secretCheck.pattern.source, 'g');
    while ((match = pattern.exec(content)) !== null) {
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const lineContent = content.substring(lineStart, match.index);
      if (lineContent.includes('//') || lineContent.includes('*')) continue;
      if (content.substring(match.index - 20, match.index).includes('process.env')) continue;

      issues.push({
        rule: 'no-hardcoded-secrets',
        message: `Potential hardcoded secret detected: ${secretCheck.name}`,
        severity: 'error',
        file: path,
        line: findLineNumber(content, match.index),
        found: match[0].substring(0, 20) + '...',
        expected: 'Use process.env.SECRET_NAME',
        autoFixable: false,
      });
    }
  }
  return issues;
}

function checkLocalStorageForSecrets(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];
  const storagePatterns = [
    /localStorage\.setItem\s*\(\s*['"]token/gi,
    /localStorage\.setItem\s*\(\s*['"]auth/gi,
    /sessionStorage\.setItem\s*\(\s*['"]token/gi,
  ];

  for (const pattern of storagePatterns) {
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(content)) !== null) {
      issues.push({
        rule: 'no-localstorage-secrets',
        message: 'Do not store auth tokens in localStorage/sessionStorage',
        severity: 'error',
        file: path,
        line: findLineNumber(content, match.index),
        found: match[0],
        expected: 'Use httpOnly cookies for auth tokens',
        autoFixable: false,
      });
    }
  }
  return issues;
}

export async function securityGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let hasEval = false;
  let hasInnerHTML = false;
  let hasHardcodedSecrets = false;

  const filesToCheck = files.filter(f => !shouldSkipFile(f.path));

  for (const file of filesToCheck) {
    const dangerousIssues = checkDangerousPatterns(file.content, file.path);
    if (dangerousIssues.some(i => i.rule === 'no-eval' || i.rule === 'no-new-function')) hasEval = true;
    if (dangerousIssues.some(i => i.rule === 'no-innerHTML')) hasInnerHTML = true;
    issues.push(...dangerousIssues);

    const secretIssues = checkHardcodedSecrets(file.content, file.path);
    if (secretIssues.length > 0) hasHardcodedSecrets = true;
    issues.push(...secretIssues);

    const storageIssues = checkLocalStorageForSecrets(file.content, file.path);
    issues.push(...storageIssues);
  }

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 3));

  return {
    passed: errorCount === 0,
    score,
    issues,
    stats: {
      filesChecked: filesToCheck.length,
      criticalIssues: errorCount,
      hasEval,
      hasInnerHTML,
      hasHardcodedSecrets,
    },
  };
}

export default securityGate;

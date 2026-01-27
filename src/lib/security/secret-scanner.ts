/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Secret Scanner - Detects secrets in generated code
 *
 * Scans OLYMPUS-generated code for accidentally leaked secrets.
 * Critical because AI might hallucinate or repeat secrets from context.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECRET PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  falsePositiveHints?: string[];
}

export const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    description: 'AWS Access Key ID',
  },
  // NOTE: AWS Secret pattern removed - too many false positives (matches any 40-char string)
  // The access key ID detection above is sufficient for AWS credential detection

  // Stripe
  {
    name: 'Stripe Live Secret Key',
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical',
    description: 'Stripe Live Secret Key - Production credentials!',
  },
  {
    name: 'Stripe Test Secret Key',
    pattern: /sk_test_[0-9a-zA-Z]{24,}/g,
    severity: 'medium',
    description: 'Stripe Test Secret Key',
  },
  {
    name: 'Stripe Restricted Key',
    pattern: /rk_live_[0-9a-zA-Z]{24,}/g,
    severity: 'critical',
    description: 'Stripe Restricted API Key',
  },

  // OpenAI
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}/g,
    severity: 'critical',
    description: 'OpenAI API Key',
  },
  {
    name: 'OpenAI Project Key',
    pattern: /sk-proj-[a-zA-Z0-9_-]{40,}/g,
    severity: 'critical',
    description: 'OpenAI Project API Key',
  },

  // Anthropic
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g,
    severity: 'critical',
    description: 'Anthropic Claude API Key',
  },

  // GitHub
  {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    description: 'GitHub Personal Access Token',
  },
  {
    name: 'GitHub OAuth Access Token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    description: 'GitHub OAuth Access Token',
  },
  {
    name: 'GitHub App Token',
    pattern: /ghs_[a-zA-Z0-9]{36}/g,
    severity: 'high',
    description: 'GitHub App Installation Token',
  },
  {
    name: 'GitHub Refresh Token',
    pattern: /ghr_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    description: 'GitHub Refresh Token',
  },

  // Supabase
  {
    name: 'Supabase Service Role Key',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    severity: 'high',
    description: 'Potential Supabase JWT (service role key)',
    falsePositiveHints: ['May be a regular JWT token'],
  },

  // Google
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    severity: 'high',
    description: 'Google API Key',
  },
  {
    name: 'Google OAuth Client Secret',
    pattern: /GOCSPX-[a-zA-Z0-9_-]{28}/g,
    severity: 'critical',
    description: 'Google OAuth Client Secret',
  },

  // Database
  {
    name: 'PostgreSQL Connection String',
    pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^/]+\/[^\s'"]+/gi,
    severity: 'critical',
    description: 'PostgreSQL connection string with credentials',
  },
  {
    name: 'MongoDB Connection String',
    pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
    severity: 'critical',
    description: 'MongoDB connection string with credentials',
  },
  {
    name: 'Redis Connection String',
    pattern: /redis(s)?:\/\/[^:]*:[^@]+@[^\s'"]+/gi,
    severity: 'critical',
    description: 'Redis connection string with credentials',
  },

  // Private Keys
  {
    name: 'RSA Private Key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'RSA Private Key',
  },
  {
    name: 'SSH Private Key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'SSH Private Key',
  },
  {
    name: 'PGP Private Key',
    pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    severity: 'critical',
    description: 'PGP Private Key Block',
  },
  {
    name: 'EC Private Key',
    pattern: /-----BEGIN EC PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Elliptic Curve Private Key',
  },

  // Generic Patterns
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    severity: 'high',
    description: 'Generic API key assignment',
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'high',
    description: 'Generic secret assignment',
  },
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g,
    severity: 'high',
    description: 'Bearer authentication token',
  },

  // Slack
  {
    name: 'Slack Bot Token',
    pattern: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}/g,
    severity: 'critical',
    description: 'Slack Bot Token',
  },
  {
    name: 'Slack User Token',
    pattern: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}/g,
    severity: 'critical',
    description: 'Slack User Token',
  },
  {
    name: 'Slack Webhook',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/g,
    severity: 'high',
    description: 'Slack Webhook URL',
  },

  // Discord
  {
    name: 'Discord Bot Token',
    pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g,
    severity: 'critical',
    description: 'Discord Bot Token',
  },
  {
    name: 'Discord Webhook',
    pattern: /https:\/\/discord(app)?\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9_-]+/g,
    severity: 'high',
    description: 'Discord Webhook URL',
  },

  // Twilio
  {
    name: 'Twilio API Key',
    pattern: /SK[a-f0-9]{32}/g,
    severity: 'critical',
    description: 'Twilio API Key',
  },
  {
    name: 'Twilio Auth Token',
    pattern: /(?:twilio[_-]?auth[_-]?token|TWILIO_AUTH_TOKEN)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi,
    severity: 'critical',
    description: 'Twilio Auth Token',
  },

  // SendGrid
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: 'critical',
    description: 'SendGrid API Key',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SecretMatch {
  pattern: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  match: string;
  redacted: string;
  line: number;
  column: number;
  context: string;
}

export interface SecretScanResult {
  hasSecrets: boolean;
  matches: SecretMatch[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

function getLineAndColumn(content: string, index: number): { line: number; column: number } {
  const lines = content.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function redactSecret(secret: string): string {
  if (secret.length <= 8) return '********';
  const visibleStart = secret.substring(0, 4);
  const visibleEnd = secret.substring(secret.length - 4);
  return `${visibleStart}${'*'.repeat(Math.min(secret.length - 8, 20))}${visibleEnd}`;
}

function getContext(content: string, index: number, matchLength: number): string {
  const contextStart = Math.max(0, index - 30);
  const contextEnd = Math.min(content.length, index + matchLength + 30);
  let context = content.substring(contextStart, contextEnd);

  // Replace the actual secret with redacted version
  const secretInContext = content.substring(index, index + matchLength);
  context = context.replace(secretInContext, redactSecret(secretInContext));

  if (contextStart > 0) context = '...' + context;
  if (contextEnd < content.length) context = context + '...';

  return context.replace(/\n/g, ' ');
}

export function scanForSecrets(content: string, filename?: string): SecretScanResult {
  const matches: SecretMatch[] = [];

  for (const pattern of SECRET_PATTERNS) {
    // Reset regex lastIndex
    pattern.pattern.lastIndex = 0;

    let match;
    while ((match = pattern.pattern.exec(content)) !== null) {
      const { line, column } = getLineAndColumn(content, match.index);

      matches.push({
        pattern: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        match: match[0],
        redacted: redactSecret(match[0]),
        line,
        column,
        context: getContext(content, match.index, match[0].length),
      });
    }
  }

  // Sort by severity
  matches.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = matches.filter(m => m.severity === 'critical').length;
  const highCount = matches.filter(m => m.severity === 'high').length;
  const mediumCount = matches.filter(m => m.severity === 'medium').length;

  let summary = 'No secrets detected';
  if (matches.length > 0) {
    summary = `Found ${matches.length} potential secret(s): ${criticalCount} critical, ${highCount} high, ${mediumCount} medium`;
  }

  return {
    hasSecrets: matches.length > 0,
    matches,
    criticalCount,
    highCount,
    mediumCount,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH SCANNING
// ═══════════════════════════════════════════════════════════════════════════════

export interface FileScanResult {
  file: string;
  result: SecretScanResult;
}

export function scanFiles(files: { path: string; content: string }[]): FileScanResult[] {
  return files.map(file => ({
    file: file.path,
    result: scanForSecrets(file.content, file.path),
  }));
}

export function aggregateScanResults(results: FileScanResult[]): {
  totalFiles: number;
  filesWithSecrets: number;
  totalSecrets: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  allMatches: (SecretMatch & { file: string })[];
} {
  const allMatches: (SecretMatch & { file: string })[] = [];
  let totalSecrets = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let filesWithSecrets = 0;

  for (const { file, result } of results) {
    if (result.hasSecrets) {
      filesWithSecrets++;
      totalSecrets += result.matches.length;
      criticalCount += result.criticalCount;
      highCount += result.highCount;
      mediumCount += result.mediumCount;

      for (const match of result.matches) {
        allMatches.push({ ...match, file });
      }
    }
  }

  return {
    totalFiles: results.length,
    filesWithSecrets,
    totalSecrets,
    criticalCount,
    highCount,
    mediumCount,
    allMatches,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const SECRET_SCANNER = {
  patterns: SECRET_PATTERNS,
  scan: scanForSecrets,
  scanFiles,
  aggregate: aggregateScanResults,
};

/**
 * OLYMPUS 2.0 - Secret Detector
 *
 * Detects hardcoded secrets, API keys, passwords, and credentials in generated code.
 */

import { OutputIssue, SecurityIssueType, Severity } from './types';
import { v4 as uuid } from 'uuid';

/**
 * Secret pattern definition
 */
interface SecretPattern {
  type: SecurityIssueType;
  severity: Severity;
  name: string;
  patterns: RegExp[];
  suggestion: string;
  envVarTemplate?: string;
}

/**
 * All secret patterns we detect
 */
const SECRET_PATTERNS: SecretPattern[] = [
  // API Keys
  {
    type: 'api_key',
    severity: 'critical',
    name: 'OpenAI API Key',
    patterns: [/sk-[a-zA-Z0-9]{48,}/g, /['"]sk-[a-zA-Z0-9-]{20,}['"]/g],
    suggestion: 'Use environment variable: process.env.OPENAI_API_KEY',
    envVarTemplate: 'process.env.OPENAI_API_KEY',
  },
  {
    type: 'api_key',
    severity: 'critical',
    name: 'Anthropic API Key',
    patterns: [/sk-ant-[a-zA-Z0-9-]{40,}/g, /['"]sk-ant-[a-zA-Z0-9-]{20,}['"]/g],
    suggestion: 'Use environment variable: process.env.ANTHROPIC_API_KEY',
    envVarTemplate: 'process.env.ANTHROPIC_API_KEY',
  },
  {
    type: 'api_key',
    severity: 'critical',
    name: 'Stripe API Key',
    patterns: [
      /sk_live_[a-zA-Z0-9]{24,}/g,
      /sk_test_[a-zA-Z0-9]{24,}/g,
      /pk_live_[a-zA-Z0-9]{24,}/g,
      /pk_test_[a-zA-Z0-9]{24,}/g,
    ],
    suggestion: 'Use environment variable: process.env.STRIPE_SECRET_KEY',
    envVarTemplate: 'process.env.STRIPE_SECRET_KEY',
  },
  {
    type: 'api_key',
    severity: 'critical',
    name: 'GitHub Token',
    patterns: [
      /ghp_[a-zA-Z0-9]{36,}/g,
      /github_pat_[a-zA-Z0-9_]{22,}/g,
      /gho_[a-zA-Z0-9]{36,}/g,
      /ghu_[a-zA-Z0-9]{36,}/g,
    ],
    suggestion: 'Use environment variable: process.env.GITHUB_TOKEN',
    envVarTemplate: 'process.env.GITHUB_TOKEN',
  },

  // AWS Credentials
  {
    type: 'aws_credentials',
    severity: 'critical',
    name: 'AWS Access Key',
    patterns: [/AKIA[0-9A-Z]{16}/g, /['"]AKIA[0-9A-Z]{16}['"]/g],
    suggestion: 'Use environment variable: process.env.AWS_ACCESS_KEY_ID',
    envVarTemplate: 'process.env.AWS_ACCESS_KEY_ID',
  },
  {
    type: 'aws_credentials',
    severity: 'critical',
    name: 'AWS Secret Key',
    patterns: [
      /['"'][a-zA-Z0-9/+=]{40}['"']/g, // Generic 40-char base64
    ],
    suggestion: 'Use environment variable: process.env.AWS_SECRET_ACCESS_KEY',
    envVarTemplate: 'process.env.AWS_SECRET_ACCESS_KEY',
  },

  // Database Connection Strings
  {
    type: 'connection_string',
    severity: 'critical',
    name: 'Database Connection String',
    patterns: [
      /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
      /postgres(ql)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
      /mysql:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
      /redis:\/\/[^:]+:[^@]+@[^\s'"]+/gi,
    ],
    suggestion: 'Use environment variable: process.env.DATABASE_URL',
    envVarTemplate: 'process.env.DATABASE_URL',
  },

  // JWT and OAuth
  {
    type: 'jwt_token',
    severity: 'high',
    name: 'JWT Token',
    patterns: [/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g],
    suggestion: 'Do not hardcode JWT tokens. Generate dynamically.',
  },
  {
    type: 'oauth_token',
    severity: 'critical',
    name: 'OAuth Token',
    patterns: [
      /['"]ya29\.[a-zA-Z0-9_-]+['"]/g, // Google OAuth
      /['"]xox[baprs]-[a-zA-Z0-9-]+['"]/g, // Slack tokens
    ],
    suggestion: 'Use environment variable for OAuth tokens',
  },

  // Private Keys
  {
    type: 'private_key',
    severity: 'critical',
    name: 'Private Key',
    patterns: [
      /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    ],
    suggestion: 'Store private keys in secure secrets manager, not in code',
  },

  // Generic Passwords
  {
    type: 'password',
    severity: 'high',
    name: 'Hardcoded Password',
    patterns: [
      /password\s*[=:]\s*['"][^'"]{4,}['"]/gi,
      /passwd\s*[=:]\s*['"][^'"]{4,}['"]/gi,
      /pwd\s*[=:]\s*['"][^'"]{4,}['"]/gi,
      /secret\s*[=:]\s*['"][^'"]{4,}['"]/gi,
    ],
    suggestion: 'Use environment variable for passwords',
    envVarTemplate: 'process.env.PASSWORD',
  },

  // Test/Default Credentials
  {
    type: 'test_credentials',
    severity: 'medium',
    name: 'Test Credentials',
    patterns: [
      /['"]admin123['"]/gi,
      /['"]password123['"]/gi,
      /['"]test123['"]/gi,
      /['"]qwerty['"]/gi,
      /['"]123456['"]/gi,
      /['"]letmein['"]/gi,
    ],
    suggestion: 'Remove test credentials before production',
  },

  // Generic API Keys
  {
    type: 'api_key',
    severity: 'high',
    name: 'Generic API Key Pattern',
    patterns: [
      /api[_-]?key\s*[=:]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
      /apikey\s*[=:]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
      /['"][a-zA-Z0-9_-]{32,}['"]\s*\/\/\s*api\s*key/gi,
    ],
    suggestion: 'Use environment variable for API keys',
    envVarTemplate: 'process.env.API_KEY',
  },
];

/**
 * Detect secrets in code
 */
export function detectSecrets(content: string, filename?: string): OutputIssue[] {
  const issues: OutputIssue[] = [];
  const lines = content.split('\n');

  for (const secretPattern of SECRET_PATTERNS) {
    for (const pattern of secretPattern.patterns) {
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

        // Skip if in a comment (basic check)
        const trimmedLine = line.trim();
        if (
          trimmedLine.startsWith('//') ||
          trimmedLine.startsWith('*') ||
          trimmedLine.startsWith('/*')
        ) {
          continue;
        }

        // Skip if already using env var
        if (line.includes('process.env.') || line.includes('import.meta.env.')) {
          continue;
        }

        // Create issue
        issues.push({
          id: uuid(),
          type: secretPattern.type,
          severity: secretPattern.severity,
          message: `${secretPattern.name} detected`,
          file: filename,
          line: lineNumber,
          column,
          snippet: line.trim(),
          pattern: pattern.source,
          matched: match[0].length > 50 ? match[0].substring(0, 50) + '...' : match[0],
          suggestion: secretPattern.suggestion,
          autoFixable: !!secretPattern.envVarTemplate,
          fix: secretPattern.envVarTemplate
            ? {
                original: match[0],
                replacement: secretPattern.envVarTemplate,
              }
            : undefined,
        });
      }
    }
  }

  return issues;
}

/**
 * Mask a secret for display
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length);
  }
  return (
    secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4)
  );
}

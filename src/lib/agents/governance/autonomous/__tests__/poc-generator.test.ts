/**
 * PoC Generator Tests
 *
 * Validates Proof-of-Concept report generation for every supported
 * vulnerability pattern:
 * - sql_injection
 * - xss_vulnerability
 * - auth_bypass
 * - hardcoded_credentials
 * - code_injection
 *
 * Also validates: unknown-pattern handling, batch generation,
 * markdown output structure, reference URL validity, and
 * reproduction-step completeness.
 *
 * @module governance/tests/poc-generator
 * @version 1.0.0
 * @since 2026-01-31
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PoCGenerator } from '../poc-generator';
import type { PoCReport } from '../poc-generator';
import type { ASTFinding } from '../ast-analyzer';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createFinding(overrides: Partial<ASTFinding> = {}): ASTFinding {
  return {
    file: overrides.file ?? 'src/api/users.ts',
    line: overrides.line ?? 42,
    column: overrides.column ?? 5,
    pattern: overrides.pattern ?? 'sql_injection',
    severity: overrides.severity ?? 'critical',
    confidence: overrides.confidence ?? 0.9,
    message: overrides.message ?? 'Test vulnerability detected',
    codeSnippet: overrides.codeSnippet ?? 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
  };
}

// ============================================================================
// GENERATOR SETUP
// ============================================================================

describe('PoCGenerator', () => {
  let generator: PoCGenerator;

  beforeEach(() => {
    generator = new PoCGenerator();
  });

  // ============================================================================
  // SQL INJECTION PoC
  // ============================================================================

  describe('sql_injection', () => {
    it('should generate report with correct title, payload, and remediation', () => {
      const finding = createFinding({
        pattern: 'sql_injection',
        file: 'src/db/queries.ts',
        line: 10,
        severity: 'critical',
      });

      const report = generator.generate(finding);

      expect(report).not.toBeNull();
      expect(report!.title).toBe('SQL Injection in src/db/queries.ts:10');
      expect(report!.exploitPayload).toContain("' OR '1'='1'");
      expect(report!.exploitPayload).toContain('UNION SELECT');
      expect(report!.exploitPayload).toContain('DROP TABLE');
      expect(report!.remediation).toContain('parameterized queries');
      expect(report!.remediation).toContain('ORM');
    });

    it('should include database compromise in impact', () => {
      const finding = createFinding({ pattern: 'sql_injection' });
      const report = generator.generate(finding)!;

      expect(report.impact).toContain('database compromise');
    });

    it('should attach the original finding to the report', () => {
      const finding = createFinding({ pattern: 'sql_injection' });
      const report = generator.generate(finding)!;

      expect(report.finding).toBe(finding);
    });
  });

  // ============================================================================
  // XSS PoC
  // ============================================================================

  describe('xss_vulnerability', () => {
    it('should generate report with correct title, payload, and remediation', () => {
      const finding = createFinding({
        pattern: 'xss_vulnerability',
        file: 'src/components/Comment.tsx',
        line: 25,
        severity: 'high',
        confidence: 0.8,
      });

      const report = generator.generate(finding);

      expect(report).not.toBeNull();
      expect(report!.title).toBe('Cross-Site Scripting (XSS) in src/components/Comment.tsx:25');
      expect(report!.exploitPayload).toContain('onerror');
      expect(report!.exploitPayload).toContain('<script>');
      expect(report!.remediation).toContain('DOMPurify');
      expect(report!.remediation).toContain('dangerouslySetInnerHTML');
    });

    it('should describe session hijacking in impact', () => {
      const finding = createFinding({ pattern: 'xss_vulnerability' });
      const report = generator.generate(finding)!;

      expect(report.impact).toContain('Session hijacking');
    });
  });

  // ============================================================================
  // AUTH BYPASS PoC
  // ============================================================================

  describe('auth_bypass', () => {
    it('should generate report with correct content', () => {
      const finding = createFinding({
        pattern: 'auth_bypass',
        file: 'src/routes/admin.ts',
        line: 8,
        severity: 'high',
        confidence: 0.7,
      });

      const report = generator.generate(finding);

      expect(report).not.toBeNull();
      expect(report!.title).toBe('Authentication Bypass in src/routes/admin.ts:8');
      expect(report!.description).toContain('authentication middleware');
      expect(report!.exploitPayload).toContain('curl');
      expect(report!.remediation).toContain('requireAuth');
      expect(report!.impact).toContain('Unauthorized access');
    });

    it('should reference the file location in reproduction steps', () => {
      const finding = createFinding({
        pattern: 'auth_bypass',
        file: 'src/routes/admin.ts',
        line: 8,
      });
      const report = generator.generate(finding)!;

      const stepsText = report.reproductionSteps.join(' ');
      expect(stepsText).toContain('src/routes/admin.ts:8');
    });
  });

  // ============================================================================
  // HARDCODED CREDENTIALS PoC
  // ============================================================================

  describe('hardcoded_credentials', () => {
    it('should generate report with correct content', () => {
      const finding = createFinding({
        pattern: 'hardcoded_credentials',
        file: 'src/config/db.ts',
        line: 3,
        severity: 'critical',
        confidence: 0.85,
        codeSnippet: 'const password = "supersecret123"',
      });

      const report = generator.generate(finding);

      expect(report).not.toBeNull();
      expect(report!.title).toBe('Hardcoded Credentials in src/config/db.ts:3');
      expect(report!.description).toContain('hardcoded');
      expect(report!.description).toContain('environment variables');
      expect(report!.exploitPayload).toContain('grep');
      expect(report!.remediation).toContain('process.env');
      expect(report!.remediation).toContain('secrets manager');
    });

    it('should describe credential compromise in impact', () => {
      const finding = createFinding({ pattern: 'hardcoded_credentials' });
      const report = generator.generate(finding)!;

      expect(report.impact).toContain('compromise');
    });
  });

  // ============================================================================
  // CODE INJECTION (eval) PoC
  // ============================================================================

  describe('code_injection', () => {
    it('should generate report with correct content', () => {
      const finding = createFinding({
        pattern: 'code_injection',
        file: 'src/utils/parser.ts',
        line: 55,
        severity: 'critical',
        confidence: 0.95,
        codeSnippet: 'eval(userExpression)',
      });

      const report = generator.generate(finding);

      expect(report).not.toBeNull();
      expect(report!.title).toBe('Code Injection via eval() in src/utils/parser.ts:55');
      expect(report!.description).toContain('eval()');
      expect(report!.description).toContain('Function()');
      expect(report!.exploitPayload).toContain('child_process');
      expect(report!.remediation).toContain('JSON.parse');
      expect(report!.impact).toContain('Remote Code Execution');
    });
  });

  // ============================================================================
  // UNKNOWN PATTERN
  // ============================================================================

  describe('unknown pattern', () => {
    it('should return null for unsupported pattern', () => {
      const finding = createFinding({ pattern: 'buffer_overflow' });

      const report = generator.generate(finding);

      expect(report).toBeNull();
    });

    it('should return null for empty pattern string', () => {
      const finding = createFinding({ pattern: '' });

      const report = generator.generate(finding);

      expect(report).toBeNull();
    });
  });

  // ============================================================================
  // generateAll
  // ============================================================================

  describe('generateAll', () => {
    it('should process multiple findings and return reports for supported patterns', () => {
      const findings: ASTFinding[] = [
        createFinding({ pattern: 'sql_injection', file: 'a.ts', line: 1 }),
        createFinding({ pattern: 'xss_vulnerability', file: 'b.tsx', line: 10 }),
        createFinding({ pattern: 'auth_bypass', file: 'c.ts', line: 20 }),
      ];

      const reports = generator.generateAll(findings);

      expect(reports).toHaveLength(3);
      expect(reports[0].title).toContain('SQL Injection');
      expect(reports[1].title).toContain('XSS');
      expect(reports[2].title).toContain('Authentication Bypass');
    });

    it('should skip unknown patterns and only return valid reports', () => {
      const findings: ASTFinding[] = [
        createFinding({ pattern: 'sql_injection', file: 'a.ts' }),
        createFinding({ pattern: 'unknown_vuln', file: 'b.ts' }),
        createFinding({ pattern: 'code_injection', file: 'c.ts' }),
        createFinding({ pattern: 'nonexistent', file: 'd.ts' }),
      ];

      const reports = generator.generateAll(findings);

      expect(reports).toHaveLength(2);
      expect(reports[0].title).toContain('SQL Injection');
      expect(reports[1].title).toContain('Code Injection');
    });

    it('should return empty array when no findings match', () => {
      const findings: ASTFinding[] = [
        createFinding({ pattern: 'unknown_a' }),
        createFinding({ pattern: 'unknown_b' }),
      ];

      const reports = generator.generateAll(findings);

      expect(reports).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const reports = generator.generateAll([]);

      expect(reports).toHaveLength(0);
    });
  });

  // ============================================================================
  // MARKDOWN OUTPUT
  // ============================================================================

  describe('markdown output', () => {
    it('should include all required sections', () => {
      const finding = createFinding({
        pattern: 'sql_injection',
        file: 'src/api/users.ts',
        line: 42,
        column: 5,
        severity: 'critical',
        confidence: 0.9,
      });

      const report = generator.generate(finding)!;
      const md = report.markdown;

      // Title
      expect(md).toContain('# SQL Injection in src/api/users.ts:42');
      // Metadata
      expect(md).toContain('**Severity:** CRITICAL');
      expect(md).toContain('**Pattern:** `sql_injection`');
      expect(md).toContain('**Confidence:** 90%');
      expect(md).toContain('**Location:** `src/api/users.ts:42:5`');
      // Sections
      expect(md).toContain('## Description');
      expect(md).toContain('## Vulnerable Code');
      expect(md).toContain('## Exploit Payload');
      expect(md).toContain('## Reproduction Steps');
      expect(md).toContain('## Impact');
      expect(md).toContain('## Remediation');
      expect(md).toContain('## References');
      // Footer
      expect(md).toContain('OLYMPUS Sentinel PoC Generator');
    });

    it('should embed the code snippet in a fenced code block', () => {
      const snippet = 'db.query(`SELECT * FROM users WHERE id = ${userId}`)';
      const finding = createFinding({
        pattern: 'sql_injection',
        codeSnippet: snippet,
      });

      const report = generator.generate(finding)!;

      expect(report.markdown).toContain('```typescript');
      expect(report.markdown).toContain(snippet);
    });

    it('should render reproduction steps as a numbered list', () => {
      const finding = createFinding({ pattern: 'xss_vulnerability' });
      const report = generator.generate(finding)!;

      expect(report.markdown).toContain('1. ');
      expect(report.markdown).toContain('2. ');
      expect(report.markdown).toContain('3. ');
      expect(report.markdown).toContain('4. ');
    });

    it('should render references as a bullet list', () => {
      const finding = createFinding({ pattern: 'sql_injection' });
      const report = generator.generate(finding)!;

      expect(report.markdown).toContain('- https://owasp.org/');
      expect(report.markdown).toContain('- https://cheatsheetseries.owasp.org/');
    });

    it('should map severity labels correctly for all levels', () => {
      const severities: Array<ASTFinding['severity']> = ['critical', 'high', 'medium', 'low'];
      const labels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

      for (let i = 0; i < severities.length; i++) {
        const finding = createFinding({
          pattern: 'sql_injection',
          severity: severities[i],
        });
        const report = generator.generate(finding)!;
        expect(report.markdown).toContain(`**Severity:** ${labels[i]}`);
      }
    });
  });

  // ============================================================================
  // REFERENCES VALIDATION
  // ============================================================================

  describe('references', () => {
    it('should contain real OWASP or CWE URLs for every pattern', () => {
      const patterns = [
        'sql_injection',
        'xss_vulnerability',
        'auth_bypass',
        'hardcoded_credentials',
        'code_injection',
      ];
      const trustedDomains = ['owasp.org', 'cwe.mitre.org', 'cheatsheetseries.owasp.org'];

      for (const pattern of patterns) {
        const finding = createFinding({ pattern });
        const report = generator.generate(finding)!;

        expect(report.references.length).toBeGreaterThanOrEqual(1);

        for (const ref of report.references) {
          expect(ref).toMatch(/^https:\/\//);
          const matchesTrustedDomain = trustedDomains.some(domain => ref.includes(domain));
          expect(matchesTrustedDomain).toBe(true);
        }
      }
    });

    it('should have at least two references per pattern', () => {
      const patterns = [
        'sql_injection',
        'xss_vulnerability',
        'auth_bypass',
        'hardcoded_credentials',
        'code_injection',
      ];

      for (const pattern of patterns) {
        const finding = createFinding({ pattern });
        const report = generator.generate(finding)!;
        expect(report.references.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ============================================================================
  // REPRODUCTION STEPS VALIDATION
  // ============================================================================

  describe('reproductionSteps', () => {
    it('should be a non-empty array for every supported pattern', () => {
      const patterns = [
        'sql_injection',
        'xss_vulnerability',
        'auth_bypass',
        'hardcoded_credentials',
        'code_injection',
      ];

      for (const pattern of patterns) {
        const finding = createFinding({ pattern });
        const report = generator.generate(finding)!;

        expect(Array.isArray(report.reproductionSteps)).toBe(true);
        expect(report.reproductionSteps.length).toBeGreaterThanOrEqual(2);

        for (const step of report.reproductionSteps) {
          expect(typeof step).toBe('string');
          expect(step.length).toBeGreaterThan(0);
        }
      }
    });

    it('should reference the finding file location in at least one step', () => {
      const patterns = [
        'sql_injection',
        'xss_vulnerability',
        'auth_bypass',
        'hardcoded_credentials',
        'code_injection',
      ];

      for (const pattern of patterns) {
        const file = 'src/test/target.ts';
        const line = 99;
        const finding = createFinding({ pattern, file, line });
        const report = generator.generate(finding)!;

        const stepsText = report.reproductionSteps.join(' ');
        expect(stepsText).toContain(file);
      }
    });
  });

  // ============================================================================
  // getSupportedPatterns
  // ============================================================================

  describe('getSupportedPatterns', () => {
    it('should return all five supported pattern keys', () => {
      const patterns = generator.getSupportedPatterns();

      expect(patterns).toContain('sql_injection');
      expect(patterns).toContain('xss_vulnerability');
      expect(patterns).toContain('auth_bypass');
      expect(patterns).toContain('hardcoded_credentials');
      expect(patterns).toContain('code_injection');
      expect(patterns).toHaveLength(5);
    });
  });

  // ============================================================================
  // REPORT STRUCTURE COMPLETENESS
  // ============================================================================

  describe('report structure', () => {
    it('should have all required fields populated and non-empty', () => {
      const finding = createFinding({ pattern: 'sql_injection' });
      const report = generator.generate(finding)!;

      expect(report.finding).toBeDefined();
      expect(report.title.length).toBeGreaterThan(0);
      expect(report.description.length).toBeGreaterThan(0);
      expect(report.exploitPayload.length).toBeGreaterThan(0);
      expect(report.reproductionSteps.length).toBeGreaterThan(0);
      expect(report.impact.length).toBeGreaterThan(0);
      expect(report.remediation.length).toBeGreaterThan(0);
      expect(report.references.length).toBeGreaterThan(0);
      expect(report.markdown.length).toBeGreaterThan(0);
    });
  });
});

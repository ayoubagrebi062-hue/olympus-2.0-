/**
 * OLYMPUS 2.0 - Output Guardrails Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  outputGuardrail,
  detectSecrets,
  detectPlaceholders,
  detectDangerousPatterns,
  validateAgentOutput,
  validateBuildOutput,
  OutputValidationError,
  OutputGuardrailEngine,
} from '../index';

describe('Output Guardrails', () => {
  describe('Secret Detection', () => {
    it('should detect OpenAI API keys', () => {
      const code = `const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz123456789012";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('api_key');
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect Anthropic API keys', () => {
      const code = `const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('api_key');
    });

    it('should detect AWS credentials', () => {
      const code = `const accessKey = "AKIAIOSFODNN7EXAMPLE";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('aws_credentials');
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect database connection strings', () => {
      const code = `const db = "postgresql://user:password@localhost:5432/db";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('connection_string');
    });

    it('should detect hardcoded passwords', () => {
      const code = `const password = "admin123";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.type === 'password' || i.type === 'test_credentials')).toBe(true);
    });

    it('should NOT flag environment variable usage', () => {
      const code = `const apiKey = process.env.OPENAI_API_KEY;`;
      const issues = detectSecrets(code);

      expect(issues.length).toBe(0);
    });

    it('should detect private keys', () => {
      const code = `const key = "-----BEGIN RSA PRIVATE KEY-----\\nMIIE...";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('private_key');
    });

    it('should detect Stripe API keys', () => {
      const code = `const stripeKey = "sk_live_abcdefghijklmnopqrstuvwxyz";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('api_key');
    });

    it('should detect GitHub tokens', () => {
      const code = `const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";`;
      const issues = detectSecrets(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('api_key');
    });
  });

  describe('Placeholder Detection', () => {
    it('should detect TODO comments', () => {
      const code = `// TODO: implement this function`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('todo_comment');
    });

    it('should detect FIXME comments', () => {
      const code = `// FIXME: this is broken`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('todo_comment');
    });

    it('should detect stub implementations', () => {
      const code = `throw new Error("Not implemented");`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('stub_implementation');
    });

    it('should detect placeholder URLs', () => {
      const code = `const api = "https://example.com/api";`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('placeholder_code');
    });

    it('should detect placeholder values', () => {
      const code = `const key = "YOUR_API_KEY_HERE";`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('placeholder_code');
    });

    it('should detect empty catch blocks', () => {
      const code = `try { doSomething(); } catch (e) { }`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('incomplete_error');
    });

    it('should detect placeholder emails', () => {
      const code = `const email = "example@example.com";`;
      const issues = detectPlaceholders(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('placeholder_code');
    });
  });

  describe('Dangerous Pattern Detection', () => {
    it('should detect eval usage', () => {
      const code = `eval(userInput);`;
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('eval_usage');
      expect(issues[0].severity).toBe('critical');
    });

    it('should detect new Function()', () => {
      const code = `const fn = new Function("return " + userInput);`;
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('eval_usage');
    });

    it('should detect dangerouslySetInnerHTML', () => {
      const code = `<div dangerouslySetInnerHTML={{ __html: content }} />`;
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('xss_risk');
    });

    it('should detect innerHTML assignment', () => {
      const code = `element.innerHTML = userContent;`;
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('xss_risk');
    });

    it('should detect SQL injection risks', () => {
      const code = 'const query = `SELECT * FROM users WHERE id = ${userId}`;';
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('sql_injection_risk');
    });

    it('should detect console.log', () => {
      const code = `console.log("debug info");`;
      const issues = detectDangerousPatterns(code);

      expect(issues.some(i => i.type === 'debug_code')).toBe(true);
    });

    it('should detect debugger statements', () => {
      const code = `function test() { debugger; }`;
      const issues = detectDangerousPatterns(code);

      expect(issues.some(i => i.type === 'debug_code' && i.message.includes('Debugger'))).toBe(
        true
      );
    });

    it('should detect alert statements', () => {
      const code = `alert("test");`;
      const issues = detectDangerousPatterns(code);

      expect(issues.some(i => i.type === 'debug_code')).toBe(true);
    });

    it('should detect weak cryptography', () => {
      const code = `const hash = crypto.createHash('md5').update(data).digest('hex');`;
      const issues = detectDangerousPatterns(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('dangerous_pattern');
    });
  });

  describe('Output Guardrail Engine', () => {
    let engine: OutputGuardrailEngine;

    beforeEach(() => {
      engine = new OutputGuardrailEngine();
    });

    it('should validate clean code', async () => {
      const code = `
        const apiKey = process.env.API_KEY;
        async function fetchData() {
          const response = await fetch(process.env.API_URL);
          return response.json();
        }
      `;

      const result = await engine.validate(code);

      expect(result.valid).toBe(true);
      expect(result.summary.critical).toBe(0);
      expect(result.summary.high).toBe(0);
    });

    it('should flag code with issues', async () => {
      const code = `
        const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz12345678";
        // TODO: implement error handling
        eval(userInput);
      `;

      const result = await engine.validate(code);

      expect(result.valid).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.critical).toBeGreaterThan(0);
    });

    it('should auto-fix secrets', async () => {
      const code = `const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz12345678";`;

      const { fixedContent } = await engine.validateAndFix(code);

      expect(fixedContent).toContain('process.env');
      expect(fixedContent).not.toContain('sk-1234567890');
    });

    it('should format issues nicely', async () => {
      const code = `const password = "admin123";`;

      const result = await engine.validate(code);
      const formatted = engine.formatIssues(result);

      expect(formatted).toContain('issue');
    });

    it('should respect configuration', async () => {
      engine.updateConfig({
        checkDebugCode: false,
      });

      const code = `console.log("test");`;
      const result = await engine.validate(code);

      // Should not detect debug code when disabled
      expect(result.issues.filter(i => i.type === 'debug_code').length).toBe(0);
    });

    it('should exclude files by pattern', async () => {
      const code = `const key = "sk-1234567890abcdefghijklmnopqrstuvwxyz12345678";`;

      const result = await engine.validate(code, 'test.test.ts');

      // Should be excluded
      expect(result.issues.length).toBe(0);
    });

    it('should correctly determine blocking', async () => {
      const criticalCode = `eval(userInput);`;
      const lowCode = `console.log("test");`;

      const criticalResult = await engine.validate(criticalCode);
      const lowResult = await engine.validate(lowCode);

      expect(engine.shouldBlock(criticalResult)).toBe(true);
      expect(engine.shouldBlock(lowResult)).toBe(false);
    });

    it('should track scan metadata', async () => {
      const code = `const x = 1;\nconst y = 2;\nconst z = 3;`;

      const result = await engine.validate(code);

      expect(result.metadata.linesScanned).toBe(3);
      expect(result.metadata.filesScanned).toBe(1);
      expect(result.metadata.scanDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration', () => {
    it('should validate agent output', async () => {
      const code = `export function hello() { return "world"; }`;

      const { content, result, wasFixed } = await validateAgentOutput(code, {
        throwOnBlock: false,
      });

      expect(content).toBe(code);
      expect(result.valid).toBe(true);
      expect(wasFixed).toBe(false);
    });

    it('should throw OutputValidationError on critical issues', async () => {
      const code = `const secret = "sk-1234567890abcdefghijklmnopqrstuvwxyz12345678";`;

      await expect(
        validateAgentOutput(code, { throwOnBlock: true, autoFix: false })
      ).rejects.toThrow(OutputValidationError);
    });

    it('should auto-fix when enabled', async () => {
      const code = `const secret = "sk-1234567890abcdefghijklmnopqrstuvwxyz12345678";`;

      const { content, wasFixed } = await validateAgentOutput(code, {
        throwOnBlock: false,
        autoFix: true,
      });

      expect(wasFixed).toBe(true);
      expect(content).toContain('process.env');
    });

    it('should validate multiple files', async () => {
      const files = [
        { filename: 'index.ts', content: 'export const x = 1;' },
        { filename: 'config.ts', content: 'export const config = {};' },
      ];

      const { valid, summary } = await validateBuildOutput(files, { throwOnBlock: false });

      expect(valid).toBe(true);
      expect(summary.total).toBe(0);
    });

    it('should aggregate issues across files', async () => {
      const files = [
        { filename: 'file1.ts', content: '// TODO: fix this' },
        { filename: 'file2.ts', content: '// TODO: fix that' },
      ];

      const { summary } = await validateBuildOutput(files, { throwOnBlock: false });

      expect(summary.total).toBe(2);
      expect(summary.filesWithIssues).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      // This should not throw, even with invalid input
      const { result } = await validateAgentOutput('', {
        throwOnBlock: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('OutputValidationError', () => {
    it('should contain result details', async () => {
      const code = `eval(userInput);`;

      try {
        await validateAgentOutput(code, { throwOnBlock: true, autoFix: false });
      } catch (error) {
        expect(error).toBeInstanceOf(OutputValidationError);
        expect((error as OutputValidationError).result).toBeDefined();
        expect((error as OutputValidationError).getFormattedIssues()).toContain('CRITICAL');
      }
    });
  });
});

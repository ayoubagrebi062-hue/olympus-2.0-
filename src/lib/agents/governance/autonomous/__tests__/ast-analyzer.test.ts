/**
 * AST Analyzer Tests
 *
 * Comprehensive tests for the ASTAnalyzer class that detects security
 * vulnerabilities via TypeScript's compiler API.
 *
 * Covers all 5 detectors:
 * - SQL injection (template literals + string concat in query/execute)
 * - XSS (dangerouslySetInnerHTML)
 * - Auth bypass (route handlers missing middleware)
 * - Hardcoded credentials (password/secret/apiKey/token literals)
 * - Eval usage (eval() and new Function())
 *
 * Also covers:
 * - Clean code (zero false positives)
 * - Non-existent file (parse error)
 * - analyzeDirectory (recursive scan)
 * - analyzeFiles (batch)
 * - Multiple findings in one file
 * - Correct file path, line, column reporting
 * - Severity and confidence values
 *
 * @module governance/tests/ast-analyzer
 * @version 1.0.0
 * @since 2026-01-31
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ASTAnalyzer } from '../ast-analyzer';
import type { AnalysisResult, ASTFinding } from '../ast-analyzer';

// ============================================================================
// TEST HELPERS
// ============================================================================

const tmpDir = path.join(os.tmpdir(), `ast-analyzer-tests-${Date.now()}`);

/** Write a temporary .ts file and return its absolute path. */
function writeTmpFile(name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/** Remove a directory recursively (cross-platform). */
function rmDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

let analyzer: ASTAnalyzer;

beforeAll(() => {
  analyzer = new ASTAnalyzer();
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  rmDir(tmpDir);
});

// ============================================================================
// SQL INJECTION DETECTOR
// ============================================================================

describe('ASTAnalyzer', () => {
  describe('SQL injection detection', () => {
    test('detects template literal in query() call', () => {
      const file = writeTmpFile('sql-template.ts', [
        'const db = getDb();',
        'const userId = "untrusted";',
        'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      const finding = result.findings.find(f => f.pattern === 'sql_injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
      expect(finding!.confidence).toBe(0.9);
      expect(finding!.message).toContain('Template literal');
      expect(finding!.message).toContain('parameterized queries');
      expect(finding!.file).toBe(file);
      expect(finding!.line).toBe(3);
      expect(finding!.column).toBeGreaterThan(0);
      expect(finding!.codeSnippet).toBeTruthy();
    });

    test('detects string concatenation with SQL keywords in execute() call', () => {
      const file = writeTmpFile('sql-concat.ts', [
        'const conn = getConnection();',
        'const name = req.body.name;',
        'conn.execute("SELECT * FROM users WHERE name = " + name);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'sql_injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
      expect(finding!.confidence).toBe(0.85);
      expect(finding!.message).toContain('String concatenation');
    });

    test('detects template literal in raw() call', () => {
      const file = writeTmpFile('sql-raw.ts', [
        'const id = params.id;',
        'prisma.raw(`DELETE FROM sessions WHERE user_id = ${id}`);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'sql_injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
    });

    test('does not flag parameterized query (safe code)', () => {
      const file = writeTmpFile('sql-safe.ts', [
        'const db = getDb();',
        'db.query("SELECT * FROM users WHERE id = $1", [userId]);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const sqlFindings = result.findings.filter(f => f.pattern === 'sql_injection');
      expect(sqlFindings.length).toBe(0);
    });
  });

  // ============================================================================
  // XSS DETECTOR
  // ============================================================================

  describe('XSS detection', () => {
    test('detects dangerouslySetInnerHTML usage', () => {
      const file = writeTmpFile('xss-dangerous.tsx', [
        'import React from "react";',
        'export function Unsafe({ html }: { html: string }) {',
        '  return <div dangerouslySetInnerHTML={{ __html: html }} />;',
        '}',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'xss_vulnerability');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
      expect(finding!.confidence).toBe(0.8);
      expect(finding!.message).toContain('dangerouslySetInnerHTML');
      expect(finding!.message).toContain('sanitized');
      expect(finding!.file).toBe(file);
      expect(finding!.line).toBe(3);
    });

    test('does not flag normal JSX attributes', () => {
      const file = writeTmpFile('xss-safe.tsx', [
        'import React from "react";',
        'export function Safe() {',
        '  return <div className="container"><p>Hello</p></div>;',
        '}',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const xssFindings = result.findings.filter(f => f.pattern === 'xss_vulnerability');
      expect(xssFindings.length).toBe(0);
    });
  });

  // ============================================================================
  // AUTH BYPASS DETECTOR
  // ============================================================================

  describe('Auth bypass detection', () => {
    test('detects Express route handler missing auth middleware', () => {
      const file = writeTmpFile('auth-bypass.ts', [
        'import express from "express";',
        'const app = express();',
        'app.get("/admin/dashboard", (req, res) => {',
        '  res.json({ data: "secret" });',
        '});',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'auth_bypass');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
      expect(finding!.confidence).toBe(0.7);
      expect(finding!.message).toContain('/admin');
      expect(finding!.message).toContain('auth middleware');
    });

    test('detects router.post on sensitive route without middleware', () => {
      const file = writeTmpFile('auth-bypass-router.ts', [
        'import { Router } from "express";',
        'const router = Router();',
        'router.post("/api/users", (req, res) => {',
        '  res.json({ ok: true });',
        '});',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'auth_bypass');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('high');
    });

    test('does not flag route with 3 arguments (has middleware)', () => {
      const file = writeTmpFile('auth-ok.ts', [
        'import express from "express";',
        'const app = express();',
        'app.get("/admin/dashboard", authMiddleware, (req, res) => {',
        '  res.json({ data: "secret" });',
        '});',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const authFindings = result.findings.filter(f => f.pattern === 'auth_bypass');
      expect(authFindings.length).toBe(0);
    });

    test('does not flag non-sensitive routes', () => {
      const file = writeTmpFile('auth-public.ts', [
        'import express from "express";',
        'const app = express();',
        'app.get("/health", (req, res) => {',
        '  res.json({ status: "ok" });',
        '});',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const authFindings = result.findings.filter(f => f.pattern === 'auth_bypass');
      expect(authFindings.length).toBe(0);
    });
  });

  // ============================================================================
  // HARDCODED CREDENTIALS DETECTOR
  // ============================================================================

  describe('Hardcoded credentials detection', () => {
    test('detects hardcoded password variable', () => {
      const file = writeTmpFile('creds-password.ts', [
        'const dbPassword = "super_secret_123";',
        'connect({ password: dbPassword });',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'hardcoded_credentials');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
      expect(finding!.confidence).toBe(0.85);
      expect(finding!.message).toContain('password');
      expect(finding!.message).toContain('environment variables');
      expect(finding!.line).toBe(1);
    });

    test('detects hardcoded apiKey in object property', () => {
      const file = writeTmpFile('creds-apikey.ts', [
        'const config = {',
        '  apiKey: "sk-1234567890abcdef",',
        '  endpoint: "https://api.example.com"',
        '};',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'hardcoded_credentials');
      expect(finding).toBeDefined();
      expect(finding!.message).toContain('apikey');
    });

    test('detects hardcoded secret variable', () => {
      const file = writeTmpFile('creds-secret.ts', [
        'const jwtSecret = "my-jwt-secret-value";',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'hardcoded_credentials');
      expect(finding).toBeDefined();
    });

    test('detects hardcoded token variable', () => {
      const file = writeTmpFile('creds-token.ts', [
        'const authToken = "Bearer eyJhbGciOiJIUzI1NiJ9.test";',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'hardcoded_credentials');
      expect(finding).toBeDefined();
    });

    test('does not flag process.env references', () => {
      const file = writeTmpFile('creds-env.ts', [
        'const password = process.env.DB_PASSWORD;',
        'const apiKey = process.env.API_KEY;',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const credFindings = result.findings.filter(f => f.pattern === 'hardcoded_credentials');
      expect(credFindings.length).toBe(0);
    });

    test('does not flag empty string credentials', () => {
      const file = writeTmpFile('creds-empty.ts', [
        'const password = "";',
        "const apiKey = '';",
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const credFindings = result.findings.filter(f => f.pattern === 'hardcoded_credentials');
      expect(credFindings.length).toBe(0);
    });
  });

  // ============================================================================
  // EVAL USAGE DETECTOR
  // ============================================================================

  describe('Eval usage detection', () => {
    test('detects eval() call', () => {
      const file = writeTmpFile('eval-direct.ts', [
        'const userInput = req.body.code;',
        'const result = eval(userInput);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'code_injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
      expect(finding!.confidence).toBe(0.95);
      expect(finding!.message).toContain('eval()');
      expect(finding!.message).toContain('dynamic code execution');
      expect(finding!.line).toBe(2);
    });

    test('detects Function() constructor call', () => {
      const file = writeTmpFile('eval-function.ts', [
        'const code = "return 1 + 2";',
        'const fn = Function(code);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const finding = result.findings.find(f => f.pattern === 'code_injection');
      expect(finding).toBeDefined();
      expect(finding!.severity).toBe('critical');
      expect(finding!.confidence).toBe(0.95);
      expect(finding!.message).toContain('Function()');
    });

    test('does not flag safe function declarations', () => {
      const file = writeTmpFile('eval-safe.ts', [
        'function calculate(a: number, b: number): number {',
        '  return a + b;',
        '}',
        'const result = calculate(1, 2);',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const evalFindings = result.findings.filter(f => f.pattern === 'code_injection');
      expect(evalFindings.length).toBe(0);
    });
  });

  // ============================================================================
  // CLEAN CODE (ZERO FALSE POSITIVES)
  // ============================================================================

  describe('Clean code - no false positives', () => {
    test('produces zero findings for safe TypeScript code', () => {
      const file = writeTmpFile('clean-code.ts', [
        'import { Request, Response } from "express";',
        '',
        'interface User {',
        '  id: number;',
        '  name: string;',
        '  email: string;',
        '}',
        '',
        'const DB_HOST = process.env.DB_HOST;',
        'const DB_PASS = process.env.DB_PASSWORD;',
        '',
        'async function getUser(id: number): Promise<User> {',
        '  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);',
        '  return result.rows[0];',
        '}',
        '',
        'function sanitize(input: string): string {',
        '  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");',
        '}',
        '',
        'export { getUser, sanitize };',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      expect(result.findings.length).toBe(0);
      expect(result.parseErrors.length).toBe(0);
      expect(result.file).toBe(file);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // NON-EXISTENT FILE (PARSE ERROR)
  // ============================================================================

  describe('Error handling', () => {
    test('returns parse error for non-existent file', () => {
      const fakePath = path.join(tmpDir, 'this-file-does-not-exist.ts');

      const result = analyzer.analyzeFile(fakePath);

      expect(result.findings.length).toBe(0);
      expect(result.parseErrors.length).toBe(1);
      expect(result.parseErrors[0]).toContain('Failed to parse');
      expect(result.parseErrors[0]).toContain(fakePath);
      expect(result.file).toBe(fakePath);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // MULTIPLE FINDINGS IN ONE FILE
  // ============================================================================

  describe('Multiple findings in one file', () => {
    test('detects all vulnerabilities in a single file', () => {
      const file = writeTmpFile('multi-vuln.ts', [
        'import express from "express";',
        '',
        '// Vuln 1: Hardcoded credential',
        'const apiSecret = "hardcoded-secret-value";',
        '',
        '// Vuln 2: SQL injection',
        'const userId = req.params.id;',
        'db.query(`SELECT * FROM users WHERE id = ${userId}`);',
        '',
        '// Vuln 3: Eval',
        'const code = req.body.script;',
        'eval(code);',
        '',
        '// Vuln 4: Auth bypass',
        'const app = express();',
        'app.get("/admin/panel", (req, res) => {',
        '  res.send("admin");',
        '});',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const patterns = result.findings.map(f => f.pattern);
      expect(patterns).toContain('hardcoded_credentials');
      expect(patterns).toContain('sql_injection');
      expect(patterns).toContain('code_injection');
      expect(patterns).toContain('auth_bypass');
      expect(result.findings.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================================================
  // analyzeDirectory
  // ============================================================================

  describe('analyzeDirectory', () => {
    test('recursively scans directory for TS files', () => {
      const subDir = path.join(tmpDir, 'scan-dir');
      fs.mkdirSync(path.join(subDir, 'nested'), { recursive: true });

      // Root file with vulnerability
      writeTmpFile('scan-dir/root-vuln.ts', [
        'const password = "admin123";',
      ].join('\n'));

      // Nested file with vulnerability
      writeTmpFile('scan-dir/nested/deep-vuln.ts', [
        'eval("malicious()");',
      ].join('\n'));

      // Clean file
      writeTmpFile('scan-dir/clean.ts', [
        'const x: number = 42;',
      ].join('\n'));

      const results = analyzer.analyzeDirectory(subDir);

      expect(results.length).toBe(3);

      const allFindings = results.flatMap(r => r.findings);
      expect(allFindings.length).toBeGreaterThanOrEqual(2);

      const patterns = allFindings.map(f => f.pattern);
      expect(patterns).toContain('hardcoded_credentials');
      expect(patterns).toContain('code_injection');

      // Verify each result has the correct file path
      const filePaths = results.map(r => r.file);
      expect(filePaths.some(fp => fp.includes('root-vuln.ts'))).toBe(true);
      expect(filePaths.some(fp => fp.includes('deep-vuln.ts'))).toBe(true);
      expect(filePaths.some(fp => fp.includes('clean.ts'))).toBe(true);
    });

    test('respects exclude list', () => {
      const subDir = path.join(tmpDir, 'exclude-test');
      fs.mkdirSync(path.join(subDir, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(subDir, 'src'), { recursive: true });

      writeTmpFile('exclude-test/node_modules/dep.ts', [
        'eval("ignored");',
      ].join('\n'));

      writeTmpFile('exclude-test/src/app.ts', [
        'const token = "should-be-found";',
      ].join('\n'));

      const results = analyzer.analyzeDirectory(subDir);

      const filePaths = results.map(r => r.file);
      expect(filePaths.some(fp => fp.includes('node_modules'))).toBe(false);
      expect(filePaths.some(fp => fp.includes('app.ts'))).toBe(true);
    });

    test('returns empty array for non-existent directory', () => {
      const fakePath = path.join(tmpDir, 'does-not-exist-dir');

      const results = analyzer.analyzeDirectory(fakePath);

      expect(results).toEqual([]);
    });

    test('handles custom exclude list', () => {
      const subDir = path.join(tmpDir, 'custom-exclude');
      fs.mkdirSync(path.join(subDir, 'build'), { recursive: true });
      fs.mkdirSync(path.join(subDir, 'lib'), { recursive: true });

      writeTmpFile('custom-exclude/build/output.ts', [
        'eval("should be excluded");',
      ].join('\n'));

      writeTmpFile('custom-exclude/lib/core.ts', [
        'const privateKey = "key-value";',
      ].join('\n'));

      const results = analyzer.analyzeDirectory(subDir, ['build']);

      const filePaths = results.map(r => r.file);
      expect(filePaths.some(fp => fp.includes('build'))).toBe(false);
      expect(filePaths.some(fp => fp.includes('core.ts'))).toBe(true);
    });
  });

  // ============================================================================
  // analyzeFiles
  // ============================================================================

  describe('analyzeFiles', () => {
    test('analyzes a batch of file paths', () => {
      const file1 = writeTmpFile('batch-a.ts', 'eval("dangerous");');
      const file2 = writeTmpFile('batch-b.ts', 'const x = 1;');
      const file3 = writeTmpFile('batch-c.ts', 'const passwd = "oops";');

      const results = analyzer.analyzeFiles([file1, file2, file3]);

      expect(results.length).toBe(3);
      expect(results[0].file).toBe(file1);
      expect(results[1].file).toBe(file2);
      expect(results[2].file).toBe(file3);

      expect(results[0].findings.length).toBeGreaterThanOrEqual(1);
      expect(results[1].findings.length).toBe(0);
      expect(results[2].findings.length).toBeGreaterThanOrEqual(1);
    });

    test('returns empty array for empty input', () => {
      const results = analyzer.analyzeFiles([]);
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // RESULT STRUCTURE
  // ============================================================================

  describe('Result structure', () => {
    test('analyzeFile returns correct AnalysisResult shape', () => {
      const file = writeTmpFile('shape-check.ts', 'eval("test");');

      const result = analyzer.analyzeFile(file);

      // Top-level AnalysisResult
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('parseErrors');
      expect(result).toHaveProperty('durationMs');
      expect(typeof result.file).toBe('string');
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.parseErrors)).toBe(true);
      expect(typeof result.durationMs).toBe('number');

      // ASTFinding shape
      const finding = result.findings[0];
      expect(finding).toHaveProperty('file');
      expect(finding).toHaveProperty('line');
      expect(finding).toHaveProperty('column');
      expect(finding).toHaveProperty('pattern');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('confidence');
      expect(finding).toHaveProperty('message');
      expect(finding).toHaveProperty('codeSnippet');
      expect(typeof finding.line).toBe('number');
      expect(typeof finding.column).toBe('number');
      expect(typeof finding.confidence).toBe('number');
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.column).toBeGreaterThan(0);
    });

    test('durationMs is a non-negative number', () => {
      const file = writeTmpFile('duration-check.ts', 'const a = 1;');

      const result = analyzer.analyzeFile(file);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('severity values are from the allowed set', () => {
      const file = writeTmpFile('severity-check.ts', [
        'eval("x");',
        'const apiKey = "hardcoded";',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);
      const validSeverities = ['low', 'medium', 'high', 'critical'];

      for (const finding of result.findings) {
        expect(validSeverities).toContain(finding.severity);
      }
    });

    test('confidence values are between 0 and 1', () => {
      const file = writeTmpFile('confidence-check.ts', [
        'eval("x");',
        'const password = "test";',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      for (const finding of result.findings) {
        expect(finding.confidence).toBeGreaterThan(0);
        expect(finding.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('codeSnippet is truncated when over 120 characters', () => {
      // Build a very long eval call to exceed the 120-char snippet limit
      const longArg = 'a'.repeat(200);
      const file = writeTmpFile('snippet-truncate.ts', `eval("${longArg}");`);

      const result = analyzer.analyzeFile(file);
      const finding = result.findings.find(f => f.pattern === 'code_injection');

      expect(finding).toBeDefined();
      if (finding!.codeSnippet.length > 120) {
        // If the raw node text exceeds 120 chars, it should be truncated with "..."
        expect(finding!.codeSnippet.endsWith('...')).toBe(true);
        expect(finding!.codeSnippet.length).toBeLessThanOrEqual(120);
      }
    });
  });

  // ============================================================================
  // LINE AND COLUMN ACCURACY
  // ============================================================================

  describe('Line and column accuracy', () => {
    test('reports correct line numbers for findings on different lines', () => {
      const file = writeTmpFile('line-accuracy.ts', [
        '// line 1: comment',
        '// line 2: comment',
        '// line 3: comment',
        'const password = "found-on-line-4";',
        '// line 5: comment',
        'eval("found-on-line-6");',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      const credFinding = result.findings.find(f => f.pattern === 'hardcoded_credentials');
      expect(credFinding).toBeDefined();
      expect(credFinding!.line).toBe(4);

      const evalFinding = result.findings.find(f => f.pattern === 'code_injection');
      expect(evalFinding).toBeDefined();
      expect(evalFinding!.line).toBe(6);
    });

    test('column is 1-based', () => {
      const file = writeTmpFile('column-base.ts', [
        'eval("test");',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);
      const finding = result.findings[0];

      expect(finding).toBeDefined();
      expect(finding.column).toBe(1); // eval starts at column 1
    });
  });

  // ============================================================================
  // CONSTRUCTOR WITH CUSTOM DETECTORS
  // ============================================================================

  describe('Custom detectors', () => {
    test('accepts custom detector list', () => {
      // Create an analyzer with no detectors - should find nothing
      const emptyAnalyzer = new ASTAnalyzer([]);

      const file = writeTmpFile('custom-detector.ts', [
        'eval("should not be detected");',
        'const password = "also not detected";',
      ].join('\n'));

      const result = emptyAnalyzer.analyzeFile(file);
      expect(result.findings.length).toBe(0);
    });
  });

  // ============================================================================
  // TSX FILE HANDLING
  // ============================================================================

  describe('TSX file handling', () => {
    test('correctly parses .tsx files with JSX', () => {
      const file = writeTmpFile('component.tsx', [
        'import React from "react";',
        '',
        'export function Page() {',
        '  const userHtml = "<script>alert(1)</script>";',
        '  return (',
        '    <div>',
        '      <section dangerouslySetInnerHTML={{ __html: userHtml }} />',
        '    </div>',
        '  );',
        '}',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      expect(result.parseErrors.length).toBe(0);
      const xssFinding = result.findings.find(f => f.pattern === 'xss_vulnerability');
      expect(xssFinding).toBeDefined();
      expect(xssFinding!.file).toBe(file);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge cases', () => {
    test('handles empty file without errors', () => {
      const file = writeTmpFile('empty.ts', '');

      const result = analyzer.analyzeFile(file);

      expect(result.findings.length).toBe(0);
      expect(result.parseErrors.length).toBe(0);
      expect(result.file).toBe(file);
    });

    test('handles file with only comments', () => {
      const file = writeTmpFile('comments-only.ts', [
        '// This file has no code',
        '/* Just comments */',
        '/** JSDoc comment */',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      expect(result.findings.length).toBe(0);
      expect(result.parseErrors.length).toBe(0);
    });

    test('handles file with syntax that is valid TS but has no vulnerabilities', () => {
      const file = writeTmpFile('complex-safe.ts', [
        'type Predicate<T> = (value: T) => boolean;',
        '',
        'function filter<T>(arr: T[], pred: Predicate<T>): T[] {',
        '  return arr.filter(pred);',
        '}',
        '',
        'const nums = filter([1, 2, 3, 4, 5], n => n > 2);',
        'export default nums;',
      ].join('\n'));

      const result = analyzer.analyzeFile(file);

      expect(result.findings.length).toBe(0);
      expect(result.parseErrors.length).toBe(0);
    });
  });
});

/**
 * AST Analyzer - Real Vulnerability Detection via TypeScript Compiler API
 *
 * Parses TS/JS files using TypeScript's compiler API (already in project deps)
 * to detect security vulnerabilities with file, line, column, and code snippet.
 *
 * Detections:
 * - SQL injection: string concatenation in query()/execute() calls
 * - XSS: unescaped variables in dangerouslySetInnerHTML
 * - Auth bypass: route handlers missing auth middleware
 * - Hardcoded credentials: password/secret/key string literals
 * - Eval usage: eval() or Function() constructor
 *
 * @module governance/ast-analyzer
 * @version 1.0.0
 * @since 2026-01-31
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ASTFinding {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly pattern: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly confidence: number;
  readonly message: string;
  readonly codeSnippet: string;
}

export interface AnalysisResult {
  readonly file: string;
  readonly findings: readonly ASTFinding[];
  readonly parseErrors: readonly string[];
  readonly durationMs: number;
}

// ============================================================================
// PATTERN DETECTORS
// ============================================================================

type PatternDetector = (
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filePath: string
) => ASTFinding | null;

function getLineAndColumn(
  sourceFile: ts.SourceFile,
  pos: number
): { line: number; column: number } {
  const lc = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: lc.line + 1, column: lc.character + 1 };
}

function getSnippet(sourceFile: ts.SourceFile, node: ts.Node): string {
  const text = node.getText(sourceFile);
  return text.length > 120 ? text.substring(0, 117) + '...' : text;
}

// ---------- SQL Injection ----------

const detectSqlInjection: PatternDetector = (node, sourceFile, filePath) => {
  // Look for: someDb.query(`SELECT * FROM users WHERE id = ${userId}`)
  if (!ts.isCallExpression(node)) return null;

  const callText = node.expression.getText(sourceFile);
  const sqlMethods = ['query', 'execute', 'raw', 'rawQuery', 'sequelize.query', '$queryRaw'];
  const isSqlCall = sqlMethods.some(m => callText.endsWith(m));
  if (!isSqlCall) return null;

  // Check if any argument is a template literal with expressions
  for (const arg of node.arguments) {
    if (ts.isTemplateExpression(arg)) {
      const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
      return {
        file: filePath,
        line,
        column,
        pattern: 'sql_injection',
        severity: 'critical',
        confidence: 0.9,
        message: `Template literal in SQL call "${callText}()" — use parameterized queries`,
        codeSnippet: getSnippet(sourceFile, node),
      };
    }

    // String concatenation: "SELECT " + variable
    if (ts.isBinaryExpression(arg) && arg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const text = arg.getText(sourceFile).toLowerCase();
      if (
        text.includes('select') ||
        text.includes('insert') ||
        text.includes('update') ||
        text.includes('delete') ||
        text.includes('where')
      ) {
        const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
        return {
          file: filePath,
          line,
          column,
          pattern: 'sql_injection',
          severity: 'critical',
          confidence: 0.85,
          message: `String concatenation in SQL call "${callText}()" — use parameterized queries`,
          codeSnippet: getSnippet(sourceFile, node),
        };
      }
    }
  }

  return null;
};

// ---------- XSS ----------

const detectXss: PatternDetector = (node, sourceFile, filePath) => {
  // Look for: dangerouslySetInnerHTML={{ __html: someVariable }}
  if (!ts.isJsxAttribute(node)) return null;

  const attrName = node.name.getText(sourceFile);
  if (attrName !== 'dangerouslySetInnerHTML') return null;

  const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
  return {
    file: filePath,
    line,
    column,
    pattern: 'xss_vulnerability',
    severity: 'high',
    confidence: 0.8,
    message: 'dangerouslySetInnerHTML usage — ensure input is sanitized (DOMPurify)',
    codeSnippet: getSnippet(sourceFile, node),
  };
};

// ---------- Auth Bypass ----------

const detectAuthBypass: PatternDetector = (node, sourceFile, filePath) => {
  // Look for Express/Next.js route handlers: app.get('/admin', (req, res) => ...)
  // without auth middleware
  if (!ts.isCallExpression(node)) return null;

  const callText = node.expression.getText(sourceFile);
  const routeMethods = ['.get', '.post', '.put', '.delete', '.patch'];
  const isRouteHandler = routeMethods.some(m => callText.endsWith(m));
  if (!isRouteHandler) return null;

  // Check if path contains sensitive keywords
  const firstArg = node.arguments[0];
  if (!firstArg) return null;

  const pathText = firstArg.getText(sourceFile).toLowerCase();
  const sensitiveRoutes = ['/admin', '/settings', '/user', '/account', '/api/'];
  const isSensitive = sensitiveRoutes.some(r => pathText.includes(r));
  if (!isSensitive) return null;

  // If only 2 args (path + handler), no middleware
  if (node.arguments.length === 2) {
    const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
    return {
      file: filePath,
      line,
      column,
      pattern: 'auth_bypass',
      severity: 'high',
      confidence: 0.7,
      message: `Sensitive route ${pathText} has no auth middleware — add authentication check`,
      codeSnippet: getSnippet(sourceFile, node),
    };
  }

  return null;
};

// ---------- Hardcoded Credentials ----------

const detectHardcodedCredentials: PatternDetector = (node, sourceFile, filePath) => {
  // Look for: const password = "hardcoded" or key: "sk-..."
  if (!ts.isVariableDeclaration(node) && !ts.isPropertyAssignment(node)) return null;

  const name = node.name.getText(sourceFile).toLowerCase();
  const sensitiveNames = [
    'password',
    'passwd',
    'secret',
    'api_key',
    'apikey',
    'token',
    'private_key',
    'privatekey',
    'auth_token',
  ];

  const isSensitiveName = sensitiveNames.some(s => name.includes(s));
  if (!isSensitiveName) return null;

  // Check if value is a string literal (not env var)
  let initializer: ts.Expression | undefined;
  if (ts.isVariableDeclaration(node)) {
    initializer = node.initializer;
  } else if (ts.isPropertyAssignment(node)) {
    initializer = node.initializer;
  }

  if (!initializer) return null;
  if (!ts.isStringLiteral(initializer) && !ts.isNoSubstitutionTemplateLiteral(initializer))
    return null;

  const value = initializer.getText(sourceFile);
  // Skip env lookups and empty strings
  if (value.includes('process.env') || value === "''" || value === '""') return null;

  const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
  return {
    file: filePath,
    line,
    column,
    pattern: 'hardcoded_credentials',
    severity: 'critical',
    confidence: 0.85,
    message: `Hardcoded credential in "${name}" — use environment variables`,
    codeSnippet: getSnippet(sourceFile, node),
  };
};

// ---------- Eval Usage ----------

const detectEval: PatternDetector = (node, sourceFile, filePath) => {
  if (!ts.isCallExpression(node)) return null;

  const callText = node.expression.getText(sourceFile);
  if (callText !== 'eval' && callText !== 'Function') return null;

  const { line, column } = getLineAndColumn(sourceFile, node.getStart(sourceFile));
  return {
    file: filePath,
    line,
    column,
    pattern: 'code_injection',
    severity: 'critical',
    confidence: 0.95,
    message: `${callText}() usage — avoid dynamic code execution`,
    codeSnippet: getSnippet(sourceFile, node),
  };
};

// ============================================================================
// AST ANALYZER
// ============================================================================

const ALL_DETECTORS: PatternDetector[] = [
  detectSqlInjection,
  detectXss,
  detectAuthBypass,
  detectHardcodedCredentials,
  detectEval,
];

export class ASTAnalyzer {
  private readonly detectors: PatternDetector[];

  constructor(detectors?: PatternDetector[]) {
    this.detectors = detectors ?? ALL_DETECTORS;
  }

  /**
   * Analyze a single file for vulnerabilities.
   */
  analyzeFile(filePath: string): AnalysisResult {
    const startTime = Date.now();
    const findings: ASTFinding[] = [];
    const parseErrors: string[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true, // setParentNodes
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const visit = (node: ts.Node) => {
        for (const detector of this.detectors) {
          const finding = detector(node, sourceFile, filePath);
          if (finding) {
            findings.push(finding);
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (error) {
      parseErrors.push(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      file: filePath,
      findings,
      parseErrors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze multiple files.
   */
  analyzeFiles(filePaths: string[]): AnalysisResult[] {
    return filePaths.map(fp => this.analyzeFile(fp));
  }

  /**
   * Recursively find and analyze all TS/TSX files in a directory.
   */
  analyzeDirectory(
    dirPath: string,
    exclude: string[] = ['node_modules', '.git', 'dist']
  ): AnalysisResult[] {
    const files = this.findTsFiles(dirPath, exclude);
    return this.analyzeFiles(files);
  }

  private findTsFiles(dir: string, exclude: string[]): string[] {
    const results: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (exclude.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findTsFiles(fullPath, exclude));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory not readable, skip
    }

    return results;
  }
}

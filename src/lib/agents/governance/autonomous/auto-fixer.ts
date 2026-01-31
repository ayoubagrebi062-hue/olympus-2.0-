/**
 * Auto-Fixer - Automated Fix + Branch + Test + PR Pipeline
 *
 * When a vulnerability is detected and the decision is "auto-fix":
 * 1. Ask Claude to generate a fix via separate CLI call
 * 2. Apply fix to file (read -> modify -> write)
 * 3. Create git branch: fix/sentinel-{pattern}-{timestamp}
 * 4. Run tests (npm test or npx vitest)
 * 5. If tests pass: commit + push + create PR
 * 6. If tests fail: rollback branch, report failure
 *
 * Safety: dry-run mode shows diff without applying.
 *
 * @module governance/auto-fixer
 * @version 1.0.0
 * @since 2026-01-31
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ASTFinding } from './ast-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface FixResult {
  readonly success: boolean;
  readonly finding: ASTFinding;
  readonly branchName: string;
  readonly diff: string;
  readonly testsRan: boolean;
  readonly testsPassed: boolean;
  readonly prUrl?: string;
  readonly error?: string;
  readonly dryRun: boolean;
}

export interface FixerConfig {
  /** Working directory (project root) */
  readonly cwd: string;
  /** If true, show diff but don't apply */
  readonly dryRun?: boolean;
  /** Git remote name */
  readonly remote?: string;
  /** Base branch to create fix branches from */
  readonly baseBranch?: string;
  /** Timeout for Claude CLI calls */
  readonly claudeTimeoutMs?: number;
  /** Timeout for test runs */
  readonly testTimeoutMs?: number;
}

// ============================================================================
// AUTO-FIXER
// ============================================================================

export class AutoFixer {
  private readonly cwd: string;
  private readonly dryRun: boolean;
  private readonly remote: string;
  private readonly baseBranch: string;
  private readonly claudeTimeoutMs: number;
  private readonly testTimeoutMs: number;

  constructor(config: FixerConfig) {
    this.cwd = config.cwd;
    this.dryRun = config.dryRun ?? false;
    this.remote = config.remote ?? 'origin';
    this.baseBranch = config.baseBranch ?? 'main';
    this.claudeTimeoutMs = config.claudeTimeoutMs ?? 60_000;
    this.testTimeoutMs = config.testTimeoutMs ?? 120_000;
  }

  /**
   * Attempt to fix a finding automatically.
   */
  async fix(finding: ASTFinding): Promise<FixResult> {
    const branchName = `fix/sentinel-${finding.pattern}-${Date.now()}`;
    const baseResult: Omit<FixResult, 'success'> = {
      finding,
      branchName,
      diff: '',
      testsRan: false,
      testsPassed: false,
      dryRun: this.dryRun,
    };

    try {
      // 1. Read original file
      const originalContent = fs.readFileSync(finding.file, 'utf-8');

      // 2. Ask Claude for a fix
      const fixedContent = await this.generateFix(finding, originalContent);
      if (!fixedContent || fixedContent === originalContent) {
        return { ...baseResult, success: false, error: 'Claude returned no changes' };
      }

      // 3. Generate diff
      const diff = this.generateDiff(originalContent, fixedContent, finding.file);

      if (this.dryRun) {
        return { ...baseResult, success: true, diff };
      }

      // 4. Create branch
      await this.exec('git', ['checkout', '-b', branchName]);

      // 5. Apply fix
      fs.writeFileSync(finding.file, fixedContent, 'utf-8');

      // 6. Run tests
      let testsRan = false;
      let testsPassed = false;
      try {
        const testRunner = await this.detectTestRunner();
        if (testRunner) {
          testsRan = true;
          await this.exec(testRunner.cmd, testRunner.args, this.testTimeoutMs);
          testsPassed = true;
        }
      } catch {
        testsPassed = false;
      }

      // 7. If tests failed, rollback
      if (testsRan && !testsPassed) {
        fs.writeFileSync(finding.file, originalContent, 'utf-8');
        await this.exec('git', ['checkout', this.baseBranch]);
        await this.exec('git', ['branch', '-D', branchName]);
        return {
          ...baseResult,
          success: false,
          diff,
          testsRan,
          testsPassed,
          error: 'Tests failed after applying fix — rolled back',
        };
      }

      // 8. Commit and push
      await this.exec('git', ['add', finding.file]);
      await this.exec('git', [
        'commit',
        '-m',
        `fix(governance): auto-fix ${finding.pattern} in ${path.basename(finding.file)}\n\nDetected by OLYMPUS Sentinel AST Analyzer.\nPattern: ${finding.pattern}\nSeverity: ${finding.severity}\nConfidence: ${(finding.confidence * 100).toFixed(0)}%`,
      ]);

      let prUrl: string | undefined;
      try {
        await this.exec('git', ['push', this.remote, branchName]);
        prUrl = await this.createPR(finding, branchName);
      } catch {
        // Push failed — local commit still exists
      }

      // Switch back to base branch
      await this.exec('git', ['checkout', this.baseBranch]);

      return {
        ...baseResult,
        success: true,
        diff,
        testsRan,
        testsPassed,
        prUrl,
      };
    } catch (error) {
      // Rollback attempt
      try {
        await this.exec('git', ['checkout', this.baseBranch]);
      } catch {
        /* best effort */
      }

      return {
        ...baseResult,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private async generateFix(finding: ASTFinding, originalContent: string): Promise<string | null> {
    const prompt = `Fix this ${finding.severity} ${finding.pattern} vulnerability.

FILE: ${finding.file}
LINE: ${finding.line}
ISSUE: ${finding.message}
CODE SNIPPET: ${finding.codeSnippet}

FULL FILE CONTENT:
\`\`\`
${originalContent.substring(0, 8000)}
\`\`\`

Return ONLY the complete fixed file content. No explanations, no markdown fences.`;

    try {
      const result = await this.exec(
        'claude',
        ['-p', prompt, '--output-format', 'text'],
        this.claudeTimeoutMs
      );
      return result.trim();
    } catch {
      return null;
    }
  }

  private generateDiff(original: string, fixed: string, filePath: string): string {
    const origLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

    const maxLen = Math.max(origLines.length, fixedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const orig = origLines[i];
      const fix = fixedLines[i];

      if (orig === fix) continue;
      if (orig !== undefined && fix !== undefined) {
        lines.push(`@@ -${i + 1} +${i + 1} @@`);
        lines.push(`-${orig}`);
        lines.push(`+${fix}`);
      } else if (orig !== undefined) {
        lines.push(`-${orig}`);
      } else if (fix !== undefined) {
        lines.push(`+${fix}`);
      }
    }

    return lines.join('\n');
  }

  private async detectTestRunner(): Promise<{ cmd: string; args: string[] } | null> {
    const pkgPath = path.join(this.cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      if (scripts.test) {
        if (scripts.test.includes('vitest')) {
          return { cmd: 'npx', args: ['vitest', 'run'] };
        }
        if (scripts.test.includes('jest')) {
          return { cmd: 'npx', args: ['jest', '--passWithNoTests'] };
        }
        return { cmd: 'npm', args: ['test'] };
      }
    } catch {
      /* ignore */
    }

    // Check for vitest config
    if (
      fs.existsSync(path.join(this.cwd, 'vitest.config.ts')) ||
      fs.existsSync(path.join(this.cwd, 'vitest.config.js'))
    ) {
      return { cmd: 'npx', args: ['vitest', 'run'] };
    }

    return null;
  }

  private async createPR(finding: ASTFinding, branchName: string): Promise<string | undefined> {
    try {
      const title = `fix(governance): Auto-fix ${finding.pattern} in ${path.basename(finding.file)}`;
      const body = `## Auto-Fix by OLYMPUS Sentinel

**Pattern:** \`${finding.pattern}\`
**Severity:** ${finding.severity}
**Confidence:** ${(finding.confidence * 100).toFixed(0)}%
**File:** \`${finding.file}:${finding.line}\`

### What was fixed
${finding.message}

### Code snippet (before)
\`\`\`
${finding.codeSnippet}
\`\`\`

---
*Generated by OLYMPUS Governance Auto-Fixer*`;

      const result = await this.exec('gh', [
        'pr',
        'create',
        '--title',
        title,
        '--body',
        body,
        '--base',
        this.baseBranch,
        '--head',
        branchName,
      ]);

      // Extract PR URL from gh output
      const urlMatch = result.match(/https:\/\/github\.com\S+/);
      return urlMatch ? urlMatch[0] : undefined;
    } catch {
      return undefined;
    }
  }

  private exec(cmd: string, args: string[], timeoutMs?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const child = spawn(cmd, args, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false,
      });

      const timeout = timeoutMs ?? 30_000;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill('SIGTERM');
          reject(new Error(`Timeout: ${cmd} did not exit within ${timeout}ms`));
        }
      }, timeout);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', err => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      child.on('close', code => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`${cmd} exited ${code}: ${stderr.substring(0, 500)}`));
          }
        }
      });
    });
  }
}

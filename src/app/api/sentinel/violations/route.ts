/**
 * GET /api/sentinel/violations
 *
 * Returns active violations from the AST analyzer, ranked by severity.
 *
 * Query params:
 * - dir: string (default: "src")
 * - limit: number (default: 50, max: 200)
 *
 * SECURITY: Path traversal protection — dir must resolve within project root.
 */

import { NextResponse } from 'next/server';
import { ASTAnalyzer } from '@/lib/agents/governance/autonomous/ast-analyzer';
import { withGuard } from '@/lib/agents/governance/shared/api-guard';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_LIMIT = 200;

function isPathWithinRoot(targetPath: string, root: string): boolean {
  const resolved = path.resolve(root, targetPath);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedTarget = path.resolve(resolved);
  return normalizedTarget === path.resolve(root) || normalizedTarget.startsWith(normalizedRoot);
}

export const GET = withGuard(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const dir = url.searchParams.get('dir') || 'src';
    const limit = Math.min(
      Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50),
      MAX_LIMIT
    );

    // PATH TRAVERSAL PROTECTION
    if (!isPathWithinRoot(dir, PROJECT_ROOT)) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Directory must be within project root' },
        { status: 403 }
      );
    }

    const analyzer = new ASTAnalyzer();
    const scanDir = path.resolve(PROJECT_ROOT, dir);
    const results = analyzer.analyzeDirectory(scanDir);

    // Collect all findings across files
    const allFindings = results.flatMap(r => r.findings);

    // Sort by severity (critical > high > medium > low), then by confidence
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sorted = allFindings
      .sort((a, b) => {
        const sevDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
        if (sevDiff !== 0) return sevDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, limit);

    // Summary stats
    const byPattern: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const f of allFindings) {
      byPattern[f.pattern] = (byPattern[f.pattern] ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now(),
      totalFindings: allFindings.length,
      filesScanned: results.length,
      parseErrors: results.flatMap(r => r.parseErrors).length,
      summary: { byPattern, bySeverity },
      findings: sorted,
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error
        ? error.message.replace(/[A-Z]:\\[^\s]*/gi, '[path]').replace(/\/[^\s]*/g, '[path]')
        : 'Internal error';
    return NextResponse.json(
      {
        status: 'error',
        timestamp: Date.now(),
        error: safeMessage,
      },
      { status: 500 }
    );
  }
});

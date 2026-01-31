/**
 * POST /api/sentinel/scan
 *
 * Triggers a full codebase scan with AST analysis + PoC generation.
 *
 * Body (optional):
 * - dir: string (directory to scan, default: "src")
 * - generatePoCs: boolean (generate PoC reports, default: false)
 *
 * SECURITY: Path traversal protection — dir must resolve within project root.
 */

import { NextResponse } from 'next/server';
import { ASTAnalyzer } from '@/lib/agents/governance/autonomous/ast-analyzer';
import { PoCGenerator } from '@/lib/agents/governance/autonomous/poc-generator';
import { withGuard } from '@/lib/agents/governance/shared/api-guard';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_BODY_SIZE = 1024; // 1KB max body

function isPathWithinRoot(targetPath: string, root: string): boolean {
  const resolved = path.resolve(root, targetPath);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedTarget = path.resolve(resolved);
  return normalizedTarget === path.resolve(root) || normalizedTarget.startsWith(normalizedRoot);
}

export const POST = withGuard(async (request: Request) => {
  try {
    let body: { dir?: string; generatePoCs?: boolean } = {};
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_SIZE) {
        return NextResponse.json(
          { status: 'error', timestamp: Date.now(), error: 'Request body too large' },
          { status: 413 }
        );
      }
      if (text.length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      // No body or invalid JSON — use defaults
    }

    const dir = body.dir || 'src';

    // PATH TRAVERSAL PROTECTION
    if (!isPathWithinRoot(dir, PROJECT_ROOT)) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Directory must be within project root' },
        { status: 403 }
      );
    }

    const generatePoCs = body.generatePoCs ?? false;

    const startTime = Date.now();
    const analyzer = new ASTAnalyzer();
    const scanDir = path.resolve(PROJECT_ROOT, dir);
    const results = analyzer.analyzeDirectory(scanDir);

    const allFindings = results.flatMap(r => r.findings);
    const durationMs = Date.now() - startTime;

    // Generate PoC reports if requested
    let pocs: Array<{ title: string; severity: string; markdown: string }> = [];
    if (generatePoCs && allFindings.length > 0) {
      const pocGen = new PoCGenerator();
      const reports = pocGen.generateAll(allFindings);
      pocs = reports.map(r => ({
        title: r.title,
        severity: r.finding.severity,
        markdown: r.markdown,
      }));
    }

    // Health score: 100 - (critical * 20 + high * 10 + medium * 3 + low * 1)
    const severityWeights: Record<string, number> = {
      critical: 20,
      high: 10,
      medium: 3,
      low: 1,
    };

    let penalty = 0;
    for (const f of allFindings) {
      penalty += severityWeights[f.severity] ?? 1;
    }
    const healthScore = Math.max(0, Math.min(100, 100 - penalty));

    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now(),
      scan: {
        directory: dir,
        filesScanned: results.length,
        totalFindings: allFindings.length,
        parseErrors: results.flatMap(r => r.parseErrors).length,
        durationMs,
        healthScore,
      },
      findings: allFindings.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      }),
      pocs: generatePoCs ? pocs : undefined,
    });
  } catch (error) {
    // Sanitize error — never leak internal paths or stack traces
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

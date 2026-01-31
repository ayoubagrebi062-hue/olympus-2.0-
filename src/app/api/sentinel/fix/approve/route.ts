/**
 * POST /api/sentinel/fix/approve
 *
 * Applies an approved fix (branch + commit + PR) or rejects it.
 *
 * Body:
 * - finding: ASTFinding object
 * - action: 'approve' | 'reject'
 *
 * On approve: runs the auto-fixer in live mode (branch + test + PR).
 * On reject: records the rejection, returns acknowledgement.
 *
 * SECURITY: Path traversal protection, body size limit.
 */

import { NextResponse } from 'next/server';
import { AutoFixer } from '@/lib/agents/governance/autonomous/auto-fixer';
import { withGuard } from '@/lib/agents/governance/shared/api-guard';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_BODY_SIZE = 4096;

function isPathWithinRoot(targetPath: string, root: string): boolean {
  const resolved = path.resolve(root, targetPath);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedTarget = path.resolve(resolved);
  return normalizedTarget === path.resolve(root) || normalizedTarget.startsWith(normalizedRoot);
}

// Track rejected findings to avoid re-suggesting
const rejectedFindings = new Map<string, number>();

export const POST = withGuard(async (request: Request) => {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Request body too large' },
        { status: 413 }
      );
    }
    if (text.length === 0) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Request body required' },
        { status: 400 }
      );
    }

    let body: { finding?: Record<string, unknown>; action?: string };
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { finding, action } = body;
    if (!finding || typeof finding !== 'object') {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Missing "finding" object in body' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Path traversal check
    const filePath = String(finding.file);
    if (!isPathWithinRoot(filePath, PROJECT_ROOT)) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'File path must be within project root' },
        { status: 403 }
      );
    }

    const findingKey = `${finding.file}:${finding.line}:${finding.pattern}`;

    if (action === 'reject') {
      rejectedFindings.set(findingKey, Date.now());
      return NextResponse.json({
        status: 'ok',
        timestamp: Date.now(),
        result: {
          action: 'rejected',
          findingKey,
          message: 'Finding rejected — will not auto-fix.',
        },
      });
    }

    // action === 'approve' — run the fixer for real
    const fixer = new AutoFixer({ cwd: PROJECT_ROOT, dryRun: false });
    const result = await fixer.fix(finding as Parameters<AutoFixer['fix']>[0]);

    return NextResponse.json({
      status: result.success ? 'ok' : 'error',
      timestamp: Date.now(),
      result: {
        action: 'approved',
        success: result.success,
        branchName: result.branchName,
        diff: result.diff,
        testsRan: result.testsRan,
        testsPassed: result.testsPassed,
        prUrl: result.prUrl ?? null,
        error: result.error ?? null,
      },
    });
  } catch (error) {
    const safeMessage =
      error instanceof Error
        ? error.message.replace(/[A-Z]:\\[^\s]*/gi, '[path]').replace(/\/[^\s]*/g, '[path]')
        : 'Internal error';
    return NextResponse.json(
      { status: 'error', timestamp: Date.now(), error: safeMessage },
      { status: 500 }
    );
  }
});

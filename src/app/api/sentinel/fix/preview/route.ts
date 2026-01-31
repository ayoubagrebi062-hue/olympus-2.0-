/**
 * POST /api/sentinel/fix/preview
 *
 * Runs the auto-fixer in dry-run mode and returns a diff preview.
 *
 * Body:
 * - finding: ASTFinding object (file, line, pattern, severity, confidence, message, codeSnippet)
 *
 * Returns:
 * - diff: string (unified diff)
 * - branchName: string (proposed branch name)
 * - finding: the original finding
 *
 * SECURITY: Path traversal protection, body size limit.
 */

import { NextResponse } from 'next/server';
import { AutoFixer } from '@/lib/agents/governance/autonomous/auto-fixer';
import { withGuard } from '@/lib/agents/governance/shared/api-guard';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();
const MAX_BODY_SIZE = 4096; // 4KB max body

function isPathWithinRoot(targetPath: string, root: string): boolean {
  const resolved = path.resolve(root, targetPath);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedTarget = path.resolve(resolved);
  return normalizedTarget === path.resolve(root) || normalizedTarget.startsWith(normalizedRoot);
}

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

    let body: { finding?: Record<string, unknown> };
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const finding = body.finding;
    if (!finding || typeof finding !== 'object') {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'Missing "finding" object in body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const required = [
      'file',
      'line',
      'pattern',
      'severity',
      'confidence',
      'message',
      'codeSnippet',
    ];
    for (const field of required) {
      if (!(field in finding)) {
        return NextResponse.json(
          { status: 'error', timestamp: Date.now(), error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Path traversal check on the file field
    const filePath = String(finding.file);
    if (!isPathWithinRoot(filePath, PROJECT_ROOT)) {
      return NextResponse.json(
        { status: 'error', timestamp: Date.now(), error: 'File path must be within project root' },
        { status: 403 }
      );
    }

    const fixer = new AutoFixer({ cwd: PROJECT_ROOT, dryRun: true });
    const result = await fixer.fix(finding as Parameters<AutoFixer['fix']>[0]);

    return NextResponse.json({
      status: result.success ? 'ok' : 'error',
      timestamp: Date.now(),
      preview: {
        diff: result.diff,
        branchName: result.branchName,
        finding: result.finding,
        dryRun: true,
      },
      error: result.error ?? null,
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

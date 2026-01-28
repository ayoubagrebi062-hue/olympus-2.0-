/**
 * OLYMPUS 2.0 - Output Guardrails API
 *
 * POST /api/guardrails/output - Validate code content
 * PUT /api/guardrails/output - Validate and auto-fix code content
 */

import { NextRequest, NextResponse } from 'next/server';
import { outputGuardrail } from '@/lib/agents/guardrails/output/engine';
import { OutputValidationRequestSchema } from '@/lib/agents/guardrails/output/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = OutputValidationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { content, filename, config } = parsed.data;

    // Update config if provided
    if (config) {
      outputGuardrail.updateConfig(config);
    }

    // Validate content
    const result = await outputGuardrail.validate(content, filename);

    return NextResponse.json({
      valid: result.valid,
      shouldBlock: outputGuardrail.shouldBlock(result),
      summary: result.summary,
      issues: result.issues,
      formatted: outputGuardrail.formatIssues(result),
      metadata: result.metadata,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Fix endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = OutputValidationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { content, filename, config } = parsed.data;

    // Update config if provided
    if (config) {
      outputGuardrail.updateConfig(config);
    }

    // Validate and fix
    const { result, fixedContent } = await outputGuardrail.validateAndFix(content, filename);

    return NextResponse.json({
      valid: result.valid,
      wasFixed: fixedContent !== content,
      fixedContent,
      summary: result.summary,
      issues: result.issues,
      formatted: outputGuardrail.formatIssues(result),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fix failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DEBUG AGENT TEST - Directly tests agent output
 * Bypasses database - just runs agent and returns result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgent, AgentExecutor } from '@/lib/agents';

export async function POST(request: NextRequest) {
  console.log('[DEBUG AGENT TEST] Starting...');

  try {
    const body = await request.json().catch(() => ({}));
    const agentId = body.agentId || 'pixel';
    const prompt = body.prompt || 'Create a dashboard component with buttons and charts';

    console.log(`[DEBUG AGENT TEST] Testing agent: ${agentId}`);

    // Get agent definition
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent '${agentId}' not found`,
        },
        { status: 404 }
      );
    }

    console.log(`[DEBUG AGENT TEST] Agent found: ${agent.name}`);
    console.log(`[DEBUG AGENT TEST] System prompt preview: ${agent.systemPrompt.slice(0, 200)}...`);

    // Check if system prompt has CRITICAL rules
    const hasCriticalRules = agent.systemPrompt.includes('CRITICAL');
    console.log(`[DEBUG AGENT TEST] Has CRITICAL rules: ${hasCriticalRules}`);

    // Create executor with agentId string
    const executor = new AgentExecutor(agentId);

    // Execute agent
    const result = await executor.execute(
      {
        buildId: 'debug-test',
        prompt,
        context: {},
        previousOutputs: {},
      },
      {
        timeout: 120000,
      }
    );

    console.log(`[DEBUG AGENT TEST] Execution complete. Success: ${result.success}`);

    return NextResponse.json({
      success: result.success,
      agentId,
      agentName: agent.name,
      hasCriticalRules,
      systemPromptPreview: agent.systemPrompt.slice(0, 500),
      output: result.output,
      error: result.error,
      tokenUsage: result.tokenUsage,
    });
  } catch (err: any) {
    console.error('[DEBUG AGENT TEST] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // List available agents
  const agents = ['pixel', 'datum', 'engine', 'notify', 'blocks', 'wire', 'flow', 'bridge'];

  return NextResponse.json({
    success: true,
    message: 'POST with { agentId: "pixel", prompt: "your prompt" } to test an agent',
    availableAgents: agents,
    example: {
      agentId: 'pixel',
      prompt:
        'Create a dashboard with sales chart (14+ data points), action buttons with real handlers, and delete button that shows confirmation',
    },
  });
}

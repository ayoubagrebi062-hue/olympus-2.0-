/**
 * Direct WIRE Test - Diagnose the immediate failure
 */

import { AgentExecutor } from './src/lib/agents/executor/executor';
import { TokenTracker } from './src/lib/agents/providers/tracker';
import type { AgentInput, AgentOutput } from './src/lib/agents/types';

async function testWire() {
  console.log('='.repeat(60));
  console.log('WIRE AGENT DIRECT TEST');
  console.log('='.repeat(60));
  console.log('');

  const tokenTracker = new TokenTracker('test-build', 1000000);

  // Minimal input to test WIRE
  const input: AgentInput = {
    buildId: 'test-wire-001',
    projectId: 'test-project',
    tenantId: 'test-tenant',
    phase: 'frontend',
    context: {
      projectId: 'test-project',
      buildId: 'test-wire-001',
      description: 'Test WIRE agent execution',
      iterationNumber: 1,
    },
    previousOutputs: {
      // Minimal mock outputs for dependencies - WIRE needs: pixel, cartographer, flow, archon
      archon: {
        agentId: 'archon',
        status: 'completed',
        artifacts: [],
        decisions: [
          {
            id: 'd1',
            topic: 'architecture',
            choice: 'Next.js with TypeScript',
            reasoning: 'Standard choice',
          },
        ],
        metrics: { inputTokens: 0, outputTokens: 0, promptCount: 1, retries: 0, cacheHits: 0 },
        tokensUsed: 1000,
      } as AgentOutput,
      cartographer: {
        agentId: 'cartographer',
        status: 'completed',
        artifacts: [
          {
            id: 'a-nav',
            type: 'documentation',
            path: 'navigation.md',
            content:
              '# Navigation\n- Dashboard (/dashboard)\n- Projects (/projects)\n- Project Detail (/projects/[id])',
          },
        ],
        decisions: [
          {
            id: 'd-nav',
            topic: 'navigation',
            choice: '3-page structure',
            reasoning: 'Simple for starter tier',
          },
        ],
        metrics: { inputTokens: 0, outputTokens: 0, promptCount: 1, retries: 0, cacheHits: 0 },
        tokensUsed: 2000,
      } as AgentOutput,
      pixel: {
        agentId: 'pixel',
        status: 'completed',
        artifacts: [
          {
            id: 'a1',
            type: 'code',
            path: 'src/components/hero.tsx',
            content: 'export default function Hero() { return <div>Hero</div>; }',
          },
        ],
        decisions: [],
        metrics: { inputTokens: 0, outputTokens: 0, promptCount: 1, retries: 0, cacheHits: 0 },
        tokensUsed: 5000,
      } as AgentOutput,
      flow: {
        _skipped: true,
        _reason: 'tier_degradation',
        agentId: 'flow',
        status: 'skipped',
        artifacts: [],
        decisions: [],
        metrics: { inputTokens: 0, outputTokens: 0, promptCount: 0, retries: 0, cacheHits: 0 },
        tokensUsed: 0,
      } as AgentOutput & { _skipped: boolean; _reason: string },
    },
    constraints: {
      focusAreas: ['Generate test page', 'Use Next.js'],
    },
  };

  console.log('Creating AgentExecutor for WIRE...');

  try {
    const executor = new AgentExecutor('wire', tokenTracker);
    console.log('Executor created successfully');
    console.log('');
    console.log('Executing WIRE agent...');
    console.log('');

    const startTime = Date.now();
    const result = await executor.execute(input, { streamOutput: false });
    const duration = Date.now() - startTime;

    console.log('='.repeat(60));
    console.log('RESULT:');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Retries: ${result.retries}`);

    if (result.success && result.output) {
      console.log(`Artifacts: ${result.output.artifacts.length}`);
      console.log(`Decisions: ${result.output.decisions.length}`);
    }

    if (result.error) {
      console.log('');
      console.log('ERROR DETAILS:');
      console.log(`  Code: ${result.error.code}`);
      console.log(`  Message: ${result.error.message}`);
      console.log(`  Recoverable: ${result.error.recoverable}`);
      if (result.error.stack) {
        console.log(`  Stack (first 500 chars): ${result.error.stack.slice(0, 500)}`);
      }
    }
  } catch (error) {
    console.error('');
    console.error('EXCEPTION THROWN:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 8).join('\n'));
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

testWire().catch(console.error);

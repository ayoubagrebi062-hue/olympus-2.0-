/**
 * Direct Build Test - Run orchestrator and diagnose WIRE failure
 */

import { BuildOrchestrator } from './src/lib/agents/orchestrator/orchestrator';
import { BuildContextManager } from './src/lib/agents/context/manager';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

const TEST_BUILD_REQUEST = {
  id: 'test-wire-diagnosis',
  description: `Build a simple dashboard for project management:
- Dashboard page with stats overview
- Projects list page
- Single project detail page

Use Next.js 14 with App Router, TypeScript, and Tailwind CSS.
Dark theme with glassmorphism design.`,
  tier: 'starter' as const,
  authorization: {
    buildAuthorized: true,
    timestamp: new Date().toISOString(),
    requestId: 'test-diagnosis',
  },
};

async function runTestBuild() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              OLYMPUS BUILD TEST - WIRE DIAGNOSIS                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Environment:');
  console.log(
    `  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'SET (' + process.env.ANTHROPIC_API_KEY.slice(0, 10) + '...)' : 'NOT SET'}`
  );
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log('');

  // Create output directory
  const outputPath = path.join(process.cwd(), 'output', 'test-wire-diagnosis');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  console.log(`Output path: ${outputPath}`);
  console.log('');
  console.log('Starting build...');
  console.log(''.padStart(70, '─'));

  const startTime = Date.now();

  try {
    // Create BuildContextManager first
    const context = new BuildContextManager({
      buildId: TEST_BUILD_REQUEST.id,
      projectId: 'test-project',
      tenantId: 'test-tenant',
      tier: TEST_BUILD_REQUEST.tier,
      description: TEST_BUILD_REQUEST.description,
    });

    // Create orchestrator with individual parameters
    const orchestrator = new BuildOrchestrator(
      TEST_BUILD_REQUEST.id,
      context,
      TEST_BUILD_REQUEST.tier,
      {
        outputPath,
        continueOnError: false,
        validateBuild: true,
      }
    );

    // Subscribe to events using the correct API
    orchestrator.subscribe(event => {
      switch (event.type) {
        case 'build_started':
          console.log(`[BUILD] Started`);
          break;
        case 'phase_started':
          console.log(`[PHASE] ${(event as any).phase} started`);
          break;
        case 'agent_started':
          console.log(`[AGENT] ${(event as any).agentId} started`);
          break;
        case 'agent_completed':
          console.log(
            `[AGENT] ${(event as any).agentId} completed (${(event as any).tokensUsed || 0} tokens)`
          );
          break;
        case 'agent_failed':
          console.error(`[AGENT] ${(event as any).agentId} FAILED:`);
          console.error(`        Error: ${(event as any).error?.message}`);
          console.error(`        Code: ${(event as any).error?.code}`);
          break;
        case 'phase_completed':
          console.log(`[PHASE] ${(event as any).phase} completed`);
          break;
        case 'build_completed':
          console.log(`[BUILD] Completed!`);
          break;
        case 'build_failed':
          console.error(`[BUILD] FAILED:`);
          console.error(`        Error: ${(event as any).error?.message}`);
          console.error(`        Code: ${(event as any).error?.code}`);
          console.error(`        Phase: ${(event as any).error?.phase}`);
          break;
      }
    });

    // Run build
    const result = await orchestrator.start();

    const duration = Date.now() - startTime;
    console.log('');
    console.log(''.padStart(70, '─'));
    console.log('BUILD RESULT:');
    console.log(''.padStart(70, '─'));
    console.log(`  Success: ${result.success}`);
    console.log(`  Duration: ${Math.round(duration / 1000)}s`);
    console.log(`  Output Path: ${result.outputPath || 'N/A'}`);
    console.log(`  Files Written: ${result.filesWritten || 0}`);

    if (result.error) {
      console.log('');
      console.log('ERROR:');
      console.log(`  Code: ${result.error.code}`);
      console.log(`  Message: ${result.error.message}`);
      console.log(`  Phase: ${(result.error as any).phase || 'N/A'}`);
      console.log(`  Agent: ${(result.error as any).agentId || 'N/A'}`);
    }

    // Write summary
    const summaryPath = path.join(outputPath, 'test-summary.json');
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          buildId: TEST_BUILD_REQUEST.id,
          success: result.success,
          duration,
          outputPath: result.outputPath,
          filesWritten: result.filesWritten,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log('');
    console.log(`Summary written to: ${summaryPath}`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('EXCEPTION:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack.split('\n').slice(0, 10).join('\n'));
    }
    process.exit(1);
  }
}

runTestBuild().catch(console.error);

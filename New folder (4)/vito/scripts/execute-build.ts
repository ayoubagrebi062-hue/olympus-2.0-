/**
 * OLYMPUS BUILD EXECUTION
 *
 * Direct build execution without requiring the dev server.
 * Invokes the BuildOrchestrator with the master spec.
 */

// Load environment variables FIRST
import { config } from 'dotenv';
config(); // Load from .env in project root

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BuildOrchestrator } from '../src/lib/agents/orchestrator/orchestrator';
import { BuildContextManager } from '../src/lib/agents/context';
import { parseSpec, getRequirementsTracker, runCompletenessGate, formatGateResult } from '../src/lib/agents/spec';
// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ROOT = process.cwd();
const BUILD_PROMPT_PATH = path.join(PROJECT_ROOT, 'OLYMPUS_BUILD_PROMPT.md');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'generated-output');
const BUILD_TIER = 'ultimate' as const; // Use ultimate tier for full agent set

// ============================================================================
// LOGGING
// ============================================================================

const startTime = Date.now();

function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const prefix = {
    info: '  ',
    warn: '⚠️ ',
    error: '❌',
    success: '✅',
  }[level];
  console.log(`[${elapsed}s] ${prefix} ${message}`);
}

function logPhase(phase: string) {
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(`  PHASE: ${phase}`);
  console.log('════════════════════════════════════════════════════════════════════════════');
}

function logAgent(agent: string, status: string) {
  const statusIcon = {
    started: '🔵',
    completed: '✅',
    failed: '❌',
    retrying: '🔄',
  }[status] || '⚪';
  log(`${statusIcon} Agent: ${agent} - ${status}`);
}

// ============================================================================
// EVENT HANDLER
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEvent(event: any) {
  const type = event.type as string;

  switch (type) {
    case 'build_started':
      console.log('');
      console.log('================================================================================');
      console.log('                         OLYMPUS BUILD STARTED');
      console.log('================================================================================');
      log(`Build ID: ${event.buildId}`);
      log(`Total Phases: ${event.plan?.phases?.length || 0}`);
      log(`Total Agents: ${event.plan?.totalAgents || 0}`);
      break;

    case 'phase_started':
      logPhase(event.phase || 'Unknown');
      break;

    case 'phase_completed':
      log(`Phase ${event.phase} completed`, 'success');
      break;

    case 'phase_failed':
      log(`Phase ${event.phase} FAILED: ${event.error?.message || 'Unknown error'}`, 'error');
      break;

    case 'agent_started':
      logAgent(event.agentId || 'unknown', 'started');
      break;

    case 'agent_completed':
      logAgent(event.agentId || 'unknown', 'completed');
      if (event.output?.files && Array.isArray(event.output.files)) {
        log(`  Generated ${event.output.files.length} files`);
      }
      break;

    case 'agent_failed':
      logAgent(event.agentId || 'unknown', 'failed');
      log(`  Error: ${event.error?.message || 'Unknown'}`, 'error');
      break;

    case 'agent_retrying':
      logAgent(event.agentId || 'unknown', 'retrying');
      break;

    case 'progress':
      // Progress updates - show periodically
      if (event.progress && event.progress.percentage % 10 === 0) {
        log(`Progress: ${event.progress.percentage}% (${event.progress.completedAgents}/${event.progress.totalAgents} agents)`);
      }
      break;

    case 'build_completed':
      console.log('');
      console.log('================================================================================');
      console.log('                         BUILD COMPLETED');
      console.log('================================================================================');
      break;

    case 'build_failed':
      console.log('');
      console.log('================================================================================');
      console.log('                         BUILD FAILED');
      console.log('================================================================================');
      log(`Error: ${event.error?.message || 'Unknown'}`, 'error');
      break;

    default:
      // Ignore other events
      break;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('================================================================================');
  console.log('                    OLYMPUS BUILD EXECUTION');
  console.log('================================================================================');
  console.log('');

  // Load spec
  log('Loading build specification...');
  let specContent: string;
  try {
    specContent = fs.readFileSync(BUILD_PROMPT_PATH, 'utf-8');
    log(`Loaded ${specContent.length} characters`, 'success');
  } catch (error) {
    log(`Failed to load spec: ${(error as Error).message}`, 'error');
    process.exit(1);
  }

  // Parse spec
  log('Parsing specification...');
  const parseResult = parseSpec(specContent);
  log(`Parsed ${parseResult.requirements.pages.length} pages, ${parseResult.requirements.components.length} components`, 'success');

  // Initialize tracker
  const tracker = getRequirementsTracker();
  tracker.initialize(parseResult.requirements);
  log('RequirementsTracker initialized', 'success');

  // Create build context
  const buildId = uuidv4();
  log(`Build ID: ${buildId}`);

  const context = new BuildContextManager({
    buildId,
    projectId: `proj_${buildId.slice(0, 8)}`,
    tenantId: 'system',
    tier: BUILD_TIER,
    description: specContent,
    targetUsers: 'Developers, founders, teams building applications',
    techConstraints: 'Next.js 14, TypeScript, Tailwind CSS, shadcn/ui',
    businessRequirements: 'AI code generation platform with 40 agents',
    designPreferences: 'Glassmorphism, dark theme, premium feel',
  });

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  log(`Output directory: ${OUTPUT_DIR}`, 'success');

  // Create orchestrator
  log('Initializing BuildOrchestrator...');
  const orchestrator = new BuildOrchestrator(
    buildId,
    context,
    BUILD_TIER,
    {
      maxConcurrency: 3,
      outputPath: OUTPUT_DIR,
    },
    {
      enabled: true,
      maxRetries: 3,
      qualityThreshold: 7.0,
    }
  );

  // Subscribe to events
  orchestrator.subscribe(handleEvent);

  // Start the build
  console.log('');
  log('Starting build execution...', 'info');
  console.log('');

  const buildStartTime = Date.now();

  try {
    const result = await orchestrator.start();

    const buildDuration = ((Date.now() - buildStartTime) / 1000).toFixed(1);

    console.log('');
    console.log('================================================================================');
    console.log('                         BUILD RESULT');
    console.log('================================================================================');
    console.log('');

    if (result.success) {
      log(`BUILD SUCCEEDED in ${buildDuration}s`, 'success');
      log(`Output: ${result.outputPath || OUTPUT_DIR}`);
      log(`Files: ${result.filesWritten || 0} generated`);

      // Run completeness gate
      console.log('');
      log('Running completeness gate check...');
      const gateResult = runCompletenessGate(tracker, {
        minPageCompletion: 90,
        minComponentCompletion: 80,
        minCriticalCompletion: 100,
        blockOnFailure: false,
      });

      console.log('');
      console.log(formatGateResult(gateResult));

    } else {
      log(`BUILD FAILED in ${buildDuration}s`, 'error');
      log(`Error: ${result.error?.message || 'Unknown error'}`, 'error');
      log(`Code: ${result.error?.code || 'UNKNOWN'}`, 'error');

      if (result.error?.recoverable) {
        log('This error may be recoverable - consider retrying', 'warn');
      }
    }

    return result;

  } catch (error) {
    const buildDuration = ((Date.now() - buildStartTime) / 1000).toFixed(1);
    console.log('');
    console.log('================================================================================');
    console.log('                         BUILD EXCEPTION');
    console.log('================================================================================');
    log(`Unhandled exception after ${buildDuration}s`, 'error');
    log(`${(error as Error).message}`, 'error');
    console.error((error as Error).stack);
    throw error;
  }
}

// Run
main()
  .then((result) => {
    process.exit(result?.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

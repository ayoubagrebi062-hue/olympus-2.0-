/**
 * OLYMPUS SELF-BUILD: Dashboard v1.0
 *
 * This script triggers OLYMPUS to build its own dashboard.
 * The ultimate dogfooding test.
 *
 * Run: npx tsx scripts/build-olympus-dashboard.ts
 */

// Load env FIRST before anything else
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });

import * as path from 'path';
import * as fs from 'fs';
import { BuildContextManager } from '../src/lib/agents/context';
import { BuildOrchestrator } from '../src/lib/agents/orchestrator';
import type { OrchestrationEvent } from '../src/lib/agents/orchestrator';

// ============================================================
// BUILD SPECIFICATION
// ============================================================

const BUILD_ID = `olympus-dashboard-${Date.now()}`;
const OUTPUT_DIR = path.join(process.cwd(), 'output', BUILD_ID);

const DASHBOARD_SPEC = `
Build the OLYMPUS Builder Dashboard v1.0

## PRIMARY INTERFACE
The Build Console is the DEFAULT and PRIMARY interface. Not chat.

## MODE
- Read-only (no deploy, download, or override actions yet)
- Desktop-first (no mobile optimization required)
- Power-user orientation (no dumbing down)

## REQUIRED PANELS

### 1. Build List Panel
- Shows active and completed builds
- Status indicators (queued, running, completed, failed)
- Timestamps and duration
- Click to view build details

### 2. Phase Progression Panel
- Visual timeline of build phases
- Phases: discovery → design → architecture → frontend → backend → integration → testing → deployment
- Each phase shows:
  - Status (pending/active/completed/failed)
  - Explanation of what this phase does
  - Start/end times

### 3. Agent Roster Panel
- List of all 35 agents organized by phase
- Each agent shows:
  - Name and role description
  - Current status (idle/working/completed/failed)
  - Current task (if working)

### 4. Constitutional Status Panel
- Traffic light system (green/yellow/red)
- Maximum 7 constitutional checks displayed
- Each check shows:
  - Article name
  - Status (compliant/warning/violation)
  - One-sentence explanation

### 5. Understanding Your Build Panel
- "What was built" - list of generated components/files
- "Why it was built this way" - key decisions with reasoning
- "Known risks" - identified risks and mitigation status

### 6. Contextual Chat Panel
- SECONDARY to Build Console (collapsible side panel)
- Only active when a build is selected
- Allows asking questions about the current build

## TECH STACK
- Next.js 14 with App Router
- React 18 with Server Components where possible
- Tailwind CSS for styling
- Lucide React for icons
- TypeScript strict mode

## DESIGN CONSTRAINTS
- Dark theme (slate-900 background)
- Monospace font for code/data
- No animations (clarity over flash)
- No placeholder/mock data - wire to real /api/builds endpoints
- Traffic light colors: green (#22c55e), yellow (#eab308), red (#ef4444)

## FILE STRUCTURE
\`\`\`
src/app/console/
├── layout.tsx          # Console layout with header
├── page.tsx            # Main Build Console (default view)
├── builds/
│   └── [buildId]/
│       └── page.tsx    # Individual build detail view
└── components/
    ├── BuildList.tsx
    ├── PhaseProgression.tsx
    ├── AgentRoster.tsx
    ├── ConstitutionalStatus.tsx
    ├── UnderstandingPanel.tsx
    └── ContextualChat.tsx
\`\`\`

## API ENDPOINTS TO USE
- GET /api/builds - List builds
- GET /api/builds/[buildId] - Get build details
- GET /api/builds/[buildId]/stream - SSE for real-time updates
- GET /api/ai/agents - Get agent registry

## CONSTITUTIONAL ARTICLES TO DISPLAY
1. No Shipping Without Understanding
2. Constitutional Tests Pass
3. Intent Satisfaction
4. Hostile Resistance
5. Stability Envelope
6. Architecture Integrity
7. Explanation Provided
`;

// ============================================================
// EXECUTION
// ============================================================

async function runBuild() {
  console.log('='.repeat(70));
  console.log('OLYMPUS SELF-BUILD: Dashboard v1.0');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Build ID: ${BUILD_ID}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);
  console.log('');

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Initialize context
  console.log('[1/4] Initializing build context...');
  const context = new BuildContextManager({
    buildId: BUILD_ID,
    projectId: 'olympus-self-build',
    tenantId: 'olympus-internal',
    tier: 'professional',
    description: DASHBOARD_SPEC,
    targetUsers: 'Power users and developers who want to understand their builds',
    techConstraints: 'Next.js 14, React 18, Tailwind CSS, TypeScript',
    businessRequirements: 'Dashboard must expose constitutional compliance and build explanations',
    designPreferences: 'Dark theme, monospace fonts, no animations, clarity over minimalism',
  });

  // Create orchestrator
  console.log('[2/4] Creating orchestrator (35 agents)...');
  const orchestrator = new BuildOrchestrator(BUILD_ID, context, 'professional', {
    onProgress: (progress) => {
      const pct = Math.round(progress.progress);
      const phase = progress.currentPhase || 'initializing';
      const agents = progress.currentAgents?.join(', ') || 'none';
      console.log(`  [${pct}%] Phase: ${phase} | Agents: ${agents}`);
    },
    onPhaseComplete: (phase, status) => {
      console.log(`  ✓ Phase ${phase} completed (${status.status})`);
    },
    onAgentComplete: (agentId, output) => {
      const artifacts = output.artifacts?.length || 0;
      console.log(`    → Agent ${agentId}: ${output.status} (${artifacts} artifacts)`);
    },
    onError: (error) => {
      console.error(`  ✗ Error: ${error.message}`);
    },
  });

  // Subscribe to events for detailed logging
  const eventLog: OrchestrationEvent[] = [];
  orchestrator.subscribe((event) => {
    eventLog.push(event);
  });

  // Start build
  console.log('[3/4] Starting build...');
  console.log('');
  console.log('-'.repeat(70));

  const startTime = Date.now();
  const result = await orchestrator.start();
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('-'.repeat(70));
  console.log('');

  // Report results
  console.log('[4/4] Build completed');
  console.log('');
  console.log('='.repeat(70));
  console.log('BUILD RESULTS');
  console.log('='.repeat(70));
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Duration: ${duration} seconds`);

  if (!result.success && result.error) {
    console.log(`Error: ${result.error.code} - ${result.error.message}`);
  }

  // Get final progress
  const progress = orchestrator.getProgress();
  console.log(`Final Progress: ${progress.progress}%`);
  console.log(`Phases Completed: ${progress.completedPhases.join(', ') || 'none'}`);
  console.log(`Agents Completed: ${progress.completedAgents.length}`);
  console.log(`Tokens Used: ${progress.tokensUsed}`);

  // Save event log
  const eventLogPath = path.join(OUTPUT_DIR, 'event-log.json');
  fs.writeFileSync(eventLogPath, JSON.stringify(eventLog, null, 2));
  console.log(`\nEvent log saved to: ${eventLogPath}`);

  // Save build summary
  const summary = {
    buildId: BUILD_ID,
    success: result.success,
    duration,
    progress: progress.progress,
    completedPhases: progress.completedPhases,
    completedAgents: progress.completedAgents,
    tokensUsed: progress.tokensUsed,
    error: result.error,
    timestamp: new Date().toISOString(),
  };
  const summaryPath = path.join(OUTPUT_DIR, 'build-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Build summary saved to: ${summaryPath}`);

  console.log('');
  console.log('='.repeat(70));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run
runBuild().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

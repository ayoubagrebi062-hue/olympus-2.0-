/**
 * OLYMPUS 2.0 - Orchestrator Integration Example
 *
 * Demonstrates how all validation and retry pieces work together.
 * This is a reference implementation showing the complete flow:
 * STRATEGOS → Constraint Injector → Generation with Retry → Validation
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import {
  generateWithRetry,
  validateAgainstFeatureChecklist,
  type FeatureChecklist,
  type GenerationResult,
} from './generation-retry';

import { runStressTest, type StressTestMetrics } from './stress-test/stress-test';
import { ArtistAgent, extractImageRequirements, type ArtistOutput } from './registry/artist';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface StrategosOutput {
  projectBrief: string;
  targetAudience: string;
  featureChecklist: FeatureChecklist;
  pageTypes: string[];
  imageRequirements?: any[];
}

interface PageGenerationContext {
  pageType: string;
  checklist: FeatureChecklist;
  constraints: string[];
  artistOutput?: ArtistOutput;
}

interface OrchestratorResult {
  pages: Map<string, GenerationResult>;
  artistOutput?: ArtistOutput;
  metrics: {
    totalPages: number;
    passedFirstAttempt: number;
    passedWithRetry: number;
    failed: number;
    escalated: string[];
    totalTimeMs: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// MOCK STRATEGOS OUTPUT (FOR DEMONSTRATION)
// ════════════════════════════════════════════════════════════════════════════════

function getMockStrategosOutput(): StrategosOutput {
  return {
    projectBrief: 'Task management application with Kanban board',
    targetAudience: 'Development teams and project managers',
    featureChecklist: {
      critical: [
        {
          id: 'kanban_board',
          name: 'Kanban Board',
          description: 'Main kanban board with columns',
          acceptanceCriteria: [
            'Has at least 3 columns (Todo, In Progress, Done)',
            'Each column shows task count',
            'Tasks can be dragged between columns',
          ],
          assignedTo: 'PIXEL',
        },
        {
          id: 'task_cards',
          name: 'Task Cards',
          description: 'Task cards within columns',
          acceptanceCriteria: [
            'Shows task title and description',
            'Has edit and delete buttons',
            'Shows assignee avatar',
          ],
          assignedTo: 'PIXEL',
        },
        {
          id: 'loading_states',
          name: 'Loading States',
          description: 'Loading indicators',
          acceptanceCriteria: ['Skeleton loading for board', 'Spinner for actions'],
          assignedTo: 'PIXEL',
        },
      ],
      important: [
        {
          id: 'filters',
          name: 'Filters',
          description: 'Filter tasks by status, assignee',
          acceptanceCriteria: ['Dropdown filters', 'Clear filters button'],
          assignedTo: 'PIXEL',
        },
      ],
      niceToHave: [
        {
          id: 'dark_theme',
          name: 'Dark Theme',
          description: 'Dark mode support',
        },
      ],
    },
    pageTypes: ['kanban', 'dashboard'],
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTRAINT INJECTION (Simplified version for example)
// ════════════════════════════════════════════════════════════════════════════════

function buildConstraints(checklist: FeatureChecklist): string[] {
  const constraints: string[] = [];

  // Add critical feature constraints
  if (checklist.critical) {
    for (const feature of checklist.critical) {
      constraints.push(`MUST IMPLEMENT: ${feature.name} - ${feature.description}`);

      if (feature.acceptanceCriteria) {
        for (const criteria of feature.acceptanceCriteria) {
          constraints.push(`  ✓ ${criteria}`);
        }
      }
    }
  }

  // Add anti-stub rules
  constraints.push('');
  constraints.push('ANTI-STUB RULES (ENFORCED):');
  constraints.push('- NO TODO comments in output');
  constraints.push('- NO placeholder text');
  constraints.push('- NO empty onClick handlers');
  constraints.push('- NO console.log-only handlers');
  constraints.push('- ALL buttons must have real functionality');
  constraints.push('- ALL forms must have proper submission handling');

  return constraints;
}

// ════════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Main orchestrator that coordinates all agents
 */
export async function runOrchestrator(
  generateFn: (prompt: string) => Promise<string>
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const pages = new Map<string, GenerationResult>();
  const escalated: string[] = [];
  let passedFirstAttempt = 0;
  let passedWithRetry = 0;
  let failed = 0;

  // Step 1: Get STRATEGOS output
  console.log('[Orchestrator] Getting STRATEGOS output...');
  const strategosOutput = getMockStrategosOutput();

  // Step 2: Run ARTIST for image requirements
  console.log('[Orchestrator] Running ARTIST agent...');
  const artistAgent = new ArtistAgent();
  const imageRequirements = extractImageRequirements(strategosOutput);
  const leonardoPrompts = await artistAgent.generatePrompts(imageRequirements);
  const placeholderUrls = artistAgent.generatePlaceholders(imageRequirements);

  const artistOutput: ArtistOutput = {
    imageRequirements,
    leonardoPrompts,
    placeholderUrls,
  };

  // Step 3: Build constraints from checklist
  console.log('[Orchestrator] Building constraints...');
  const constraints = buildConstraints(strategosOutput.featureChecklist);

  // Step 4: Generate each page with retry
  for (const pageType of strategosOutput.pageTypes) {
    console.log(`[Orchestrator] Generating ${pageType} page...`);

    const context: PageGenerationContext = {
      pageType,
      checklist: strategosOutput.featureChecklist,
      constraints,
      artistOutput,
    };

    // Build the generation prompt
    const prompt = buildPagePrompt(context);

    // Generate with retry
    const result = await generateWithRetry(
      generateFn,
      prompt,
      strategosOutput.featureChecklist,
      'PIXEL',
      pageType
    );

    pages.set(pageType, result);

    // Track metrics
    if (result.passed) {
      if (result.attempts === 1) {
        passedFirstAttempt++;
      } else {
        passedWithRetry++;
      }
    } else {
      failed++;
      if (result.escalate) {
        escalated.push(pageType);
      }
    }

    console.log(
      `[Orchestrator] ${pageType}: ${result.passed ? 'PASSED' : 'FAILED'} (${result.attempts} attempts)`
    );
  }

  return {
    pages,
    artistOutput,
    metrics: {
      totalPages: strategosOutput.pageTypes.length,
      passedFirstAttempt,
      passedWithRetry,
      failed,
      escalated,
      totalTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Build a generation prompt for a page type
 */
function buildPagePrompt(context: PageGenerationContext): string {
  const { pageType, constraints, artistOutput } = context;

  let prompt = `Generate a complete, production-ready ${pageType} page component.

## FEATURE REQUIREMENTS
${constraints.join('\n')}

## CODE QUALITY REQUIREMENTS
- Use TypeScript with proper types
- Use Tailwind CSS for styling
- Use shadcn/ui components where appropriate
- Include loading, error, and empty states
- All interactive elements must have real handlers
- Follow React best practices

`;

  // Add image placeholders if available
  if (artistOutput && Object.keys(artistOutput.placeholderUrls).length > 0) {
    prompt += `## IMAGE PLACEHOLDERS
Use these placeholder URLs during development:
${Object.entries(artistOutput.placeholderUrls)
  .map(([id, url]) => `- ${id}: ${url}`)
  .join('\n')}

`;
  }

  prompt += `## OUTPUT FORMAT
Return ONLY the TypeScript/React code. No explanations.
The component should be a default export.
`;

  return prompt;
}

// ════════════════════════════════════════════════════════════════════════════════
// DEMONSTRATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Demonstrate the complete orchestration flow
 */
export async function demonstrateOrchestration(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OLYMPUS 2.0 - Orchestration Demonstration');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Mock generator that simulates code generation
  const mockGenerator = async (prompt: string): Promise<string> => {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return a mock component that should pass validation
    return `
import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export default function KanbanBoard() {
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'progress', title: 'In Progress', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ]);

  const handleAddTask = (columnId: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: 'New Task',
      description: 'Task description',
      status: columnId as Task['status'],
    };
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, tasks: [...col.tasks, newTask] }
        : col
    ));
  };

  const handleDeleteTask = (columnId: string, taskId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
        : col
    ));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background">
      {columns.map(column => (
        <div key={column.id} className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{column.title}</h3>
            <span className="text-sm text-muted-foreground">
              {column.tasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {column.tasks.map(task => (
              <Card key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)}>
                <CardHeader className="p-3">
                  <span className="font-medium">{task.title}</span>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => alert('Edit modal')}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(column.id, task.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => handleAddTask(column.id)}
          >
            Add Task
          </Button>
        </div>
      ))}
    </div>
  );
}
`;
  };

  // Run orchestration
  const result = await runOrchestrator(mockGenerator);

  // Display results
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ORCHESTRATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total Pages: ${result.metrics.totalPages}`);
  console.log(`Passed First Attempt: ${result.metrics.passedFirstAttempt}`);
  console.log(`Passed With Retry: ${result.metrics.passedWithRetry}`);
  console.log(`Failed: ${result.metrics.failed}`);
  console.log(`Escalated: ${result.metrics.escalated.join(', ') || 'None'}`);
  console.log(`Total Time: ${result.metrics.totalTimeMs}ms`);
  console.log('');

  // Show ARTIST output
  if (result.artistOutput) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ARTIST OUTPUT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Image Requirements: ${result.artistOutput.imageRequirements.length}`);
    console.log(`Leonardo Prompts: ${result.artistOutput.leonardoPrompts.length}`);
    console.log('Placeholder URLs:');
    for (const [id, url] of Object.entries(result.artistOutput.placeholderUrls)) {
      console.log(`  - ${id}: ${url.substring(0, 60)}...`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Demonstration complete!');
  console.log('═══════════════════════════════════════════════════════════════');
}

// ════════════════════════════════════════════════════════════════════════════════
// STRESS TEST INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Run full stress test with custom generator
 */
export async function runFullStressTest(
  generateFn?: (prompt: string) => Promise<string>
): Promise<StressTestMetrics> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OLYMPUS 2.0 - Full Stress Test');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const metrics = await runStressTest(generateFn);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  STRESS TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total Tests: ${metrics.totalTests}`);
  console.log(`Passed: ${metrics.passed}`);
  console.log(`Failed: ${metrics.failed}`);
  console.log(`Stub Rate: ${(metrics.stubRate * 100).toFixed(1)}%`);
  console.log(`Avg Feature Coverage: ${(metrics.avgFeatureCoverage * 100).toFixed(1)}%`);
  console.log(`First Pass Success: ${(metrics.firstPassSuccessRate * 100).toFixed(1)}%`);
  console.log(`Avg Attempts: ${metrics.avgAttempts.toFixed(2)}`);
  console.log(`Total Time: ${metrics.totalTimeMs}ms`);
  console.log('');

  return metrics;
}

// ════════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════════

// Run demonstration if executed directly
const isMainModule = typeof require !== 'undefined' && require.main === module;

if (isMainModule) {
  (async () => {
    await demonstrateOrchestration();
    console.log('');
    await runFullStressTest();
  })();
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export {
  getMockStrategosOutput,
  buildConstraints,
  buildPagePrompt,
  type StrategosOutput,
  type PageGenerationContext,
};

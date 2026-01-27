/**
 * RICP Control Runner
 *
 * Executes the Requirement Integrity Control Plane.
 * Generates control-report.json and control-report.md.
 */

import * as path from 'path';
import { RICP } from './control-plane';
import { ReportGenerator } from './control-plane/report-generator';
import type { TracedAgentId } from './types';

const REPORTS_DIR = path.join(__dirname, 'reports');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  OLYMPUS REQUIREMENT INTEGRITY CONTROL PLANE (RICP)        ║');
  console.log('║  Mode: HARD-AUTHORITY GOVERNANCE                           ║');
  console.log('║  Status: NON-BYPASSABLE                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Initialize RICP
  console.log('[1/6] Initializing RICP...');
  const ricp = new RICP();
  console.log('      Shape registry loaded');
  console.log('      Budget matrix loaded');
  console.log('      PRE_WIRE_GATE armed');

  // Create synthetic test data that demonstrates selective loss
  console.log('\n[2/6] Loading agent outputs...');
  const agentOutputs = createTestData();
  console.log('      Synthetic data loaded (demonstrates selective loss)');

  // Execute RICP
  console.log('\n[3/6] Executing RICP pipeline...');
  console.log('      Tracing all shapes...');
  console.log('      Executing PRE_WIRE_GATE...');
  console.log('      Analyzing comparative survival...');
  console.log('      Generating counterfactuals...');
  console.log('      Determining root cause...');

  const report = ricp.execute(agentOutputs);

  // Display results
  console.log('\n[4/6] RICP Execution Complete.');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                     VERDICT                                  │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Status:     ${report.verdict.verdict}`);
  console.log(`  Blocking:   ${report.verdict.blocking ? 'YES' : 'NO'}`);
  console.log(`  WIRE:       ${report.execution_decision.wire_blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log(`  PIXEL:      ${report.execution_decision.pixel_blocked ? 'BLOCKED' : 'ALLOWED'}`);
  console.log('');
  console.log(`  Reason:`);
  console.log(`    ${report.verdict.explanation.split('\n').join('\n    ')}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                   ROOT CAUSE                                 │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Class:      ${report.root_cause.class}`);
  console.log(`  Handoff:    ${report.root_cause.handoff}`);
  console.log(`  Mechanism:`);
  console.log(`    ${report.root_cause.mechanism.split('\n').join('\n    ')}`);
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│                      RSR                                     │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Global RSR: ${(report.rsr_metrics.global_rsr * 100).toFixed(1)}%`);
  console.log('');
  console.log('  Per-Shape:');
  for (const [shapeId, rsr] of Object.entries(report.rsr_metrics.per_shape_rsr)) {
    const clampedRsr = Math.min(Math.max(rsr, 0), 1);
    const filled = Math.floor(clampedRsr * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    console.log(`    ${shapeId.padEnd(30)} ${bar} ${(rsr * 100).toFixed(0)}%`);
  }
  console.log('');

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│               SELECTIVE LOSS PROOF                           │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Selective Loss: ${report.comparative_analysis.loss_is_selective ? 'PROVEN' : 'NOT PROVEN'}`);
  console.log('');
  console.log(`  Control shapes survived: ${report.comparative_analysis.control_shapes_survived.join(', ') || 'NONE'}`);
  console.log(`  Stateful shapes lost:    ${report.comparative_analysis.stateful_shapes_lost.join(', ') || 'NONE'}`);
  console.log('');
  console.log('  Evidence:');
  console.log(`    ${report.comparative_analysis.selectivity_evidence.split('\n').join('\n    ')}`);
  console.log('');

  // Generate reports
  console.log('[5/6] Generating reports...');
  const generator = new ReportGenerator(REPORTS_DIR);
  const { jsonPath, mdPath } = generator.generate(report);
  console.log(`      Written: ${jsonPath}`);
  console.log(`      Written: ${mdPath}`);

  // Final status
  console.log('\n[6/6] RICP Complete.');
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  if (report.execution_decision.wire_blocked) {
    console.log('  EXECUTION BLOCKED - WIRE AND PIXEL MAY NOT PROCEED');
    console.log('  This decision is FINAL and NON-NEGOTIABLE.');
  } else {
    console.log('  EXECUTION ALLOWED - ALL REQUIREMENTS PRESERVED');
  }
  console.log('════════════════════════════════════════════════════════════');
}

/**
 * Create synthetic test data that demonstrates selective loss.
 *
 * This data shows:
 * - FILTER_CAPABILITY (STATEFUL) is lost at H4
 * - PAGINATION_CAPABILITY (STATEFUL) is lost at H4
 * - STATIC_DISPLAY_CAPABILITY (CONTROL) survives all handoffs
 *
 * This proves SELECTIVE DESTRUCTION.
 */
function createTestData(): Record<TracedAgentId, unknown> {
  return {
    strategos: {
      mvp_features: [
        {
          name: 'Task Management',
          entity: 'tasks',
          description: 'Users can manage their tasks',
          acceptance_criteria: [
            'User can create tasks',
            'User can filter tasks by status',
            'User can paginate through tasks',
            'User can view task details'
          ]
        }
      ]
    },

    scope: {
      in_scope: [
        {
          feature: 'Task Management',
          entity: 'tasks',
          description: 'Core task functionality',
          acceptance_criteria: [
            'Create tasks',
            'Filter by status',
            'Pagination',
            'View details'
          ],
          fields: ['id', 'title', 'status', 'createdAt'],
          layout: 'grid'
        }
      ]
    },

    cartographer: {
      pages: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          sections: [
            {
              name: 'Task List',
              components: [
                {
                  type: 'heading',
                  text: 'My Tasks',
                  layout: 'flex'
                },
                {
                  type: 'filter-bar',
                  entity: 'tasks',
                  filterAttribute: 'status',
                  values: ['pending', 'in_progress', 'done']
                },
                {
                  type: 'pagination',
                  entity: 'tasks',
                  pageSize: 10
                },
                {
                  type: 'data-display',
                  entity: 'tasks',
                  fields: ['title', 'status'],
                  layout: 'grid'
                }
              ]
            }
          ]
        }
      ]
    },

    blocks: {
      components: [
        {
          name: 'Heading',
          type: 'heading',
          entity: 'tasks',
          fields: ['title'],
          layout: 'flex',
          className: 'text-xl'
        },
        {
          name: 'StatusFilter',
          type: 'filter',
          entity: 'tasks',
          filterAttribute: 'status',
          variants: ['pending', 'in_progress', 'done'],
          props: {
            value: 'string',
            onChange: 'function'
          }
        },
        {
          name: 'Pagination',
          type: 'pagination',
          entity: 'tasks',
          pageSize: 10,
          props: {
            page: 'number',
            onPageChange: 'function',
            total: 'number'
          }
        },
        {
          name: 'TaskCard',
          type: 'display',
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card'
        }
      ],
      design_tokens: {
        colors: { primary: '#3B82F6' }
      }
    },

    // WIRE: CRITICAL - STATEFUL SHAPES ARE LOST HERE
    // Filter and Pagination components are NOT implemented
    // Only static display survives
    wire: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `'use client';
import { TaskCard } from '@/components/TaskCard';

// NOTE: No filter state, no pagination state
// These were lost during summarization

export default function DashboardPage() {
  const tasks = []; // TODO: fetch tasks

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl">My Tasks</h1>
      {/* MISSING: Filter component */}
      {/* MISSING: Pagination component */}
      <div className="grid gap-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}`,
          type: 'code'
        },
        {
          path: 'src/components/TaskCard.tsx',
          // Static display component - survives
          content: `interface TaskCardProps {
  task: { id: string; title: string; status: string; };
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="card p-4 border rounded">
      <h2 className="font-bold">{task.title}</h2>
      <span className="text-sm">{task.status}</span>
    </div>
  );
}`,
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card',
          type: 'component'
        }
      ]
    },

    // PIXEL: Same issue - stateful shapes never made it here
    pixel: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `// Final styled version - still missing filter and pagination`,
          type: 'code'
        },
        {
          path: 'src/components/TaskCard.tsx',
          content: `// Styled TaskCard with Tailwind`,
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card',
          type: 'styled-component'
        }
      ],
      components: [
        {
          name: 'TaskCard',
          entity: 'tasks',
          displayFields: ['title', 'status'],
          layout: 'card'
        }
      ]
    }
  };
}

// Run
main().catch(err => {
  console.error('RICP EXECUTION FAILED:', err);
  process.exit(1);
});

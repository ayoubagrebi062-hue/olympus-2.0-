/**
 * Requirement Trace Runner
 *
 * CLI entry point for running the diagnostic.
 * Reads agent outputs, runs trace, and generates reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TraceConfig, TraceReport, TracedAgentId } from './types';
import { Tracer } from './tracer';

// Load config
const CONFIG_PATH = path.join(__dirname, 'config.json');
const REPORTS_DIR = path.join(__dirname, 'reports');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  OLYMPUS 2.0 REQUIREMENT PROPAGATION DIAGNOSTIC            ║');
  console.log('║  Target: FilterCapabilityShape                             ║');
  console.log('║  Mode: READ-ONLY / NO MODIFICATIONS                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Load config
  console.log('[1/5] Loading configuration...');
  const config: TraceConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  console.log(`      Target shape: ${config.target_shape.name}`);
  console.log(`      Agent sequence: ${config.agent_sequence.join(' → ')}`);

  // Attempt to load actual agent outputs
  console.log('\n[2/5] Searching for agent outputs...');
  const agentOutputs = await loadAgentOutputs(config);

  const foundAgents = Object.keys(agentOutputs).filter(k => agentOutputs[k as TracedAgentId] !== null);
  const missingAgents = config.agent_sequence.filter(a => !foundAgents.includes(a));

  console.log(`      Found outputs for: ${foundAgents.length > 0 ? foundAgents.join(', ') : 'NONE'}`);
  if (missingAgents.length > 0) {
    console.log(`      Missing outputs for: ${missingAgents.join(', ')}`);
  }

  // Run trace
  console.log('\n[3/5] Running trace analysis...');
  const tracer = new Tracer();
  const report = tracer.trace({
    agentOutputs,
    config
  });

  // Display results
  console.log('\n[4/5] Analysis complete.');
  displayResults(report);

  // Write reports
  console.log('\n[5/5] Writing reports...');
  await writeReports(report);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('DIAGNOSTIC COMPLETE');
  console.log('════════════════════════════════════════════════════════════');
}

/**
 * Attempt to load agent outputs from various possible locations
 */
async function loadAgentOutputs(config: TraceConfig): Promise<Record<TracedAgentId, unknown>> {
  const outputs: Record<TracedAgentId, unknown> = {} as Record<TracedAgentId, unknown>;

  // Initialize all to null
  for (const agent of config.agent_sequence) {
    outputs[agent] = null;
  }

  // Search paths for build outputs
  const searchPaths = [
    // Recent build outputs
    path.join(__dirname, '..', '..', '..', 'builds'),
    path.join(__dirname, '..', '..', '..', '.olympus', 'builds'),
    path.join(__dirname, '..', '..', '..', 'output'),
    // Test fixtures
    path.join(__dirname, 'fixtures'),
    path.join(__dirname, 'test-data'),
  ];

  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) continue;

    console.log(`      Searching: ${searchPath}`);

    // Look for JSON files that might contain agent outputs
    const files = findJsonFiles(searchPath);
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

        // Check if this is a build output with agent results
        if (content.agents || content.agentOutputs || content.results) {
          const agentData = content.agents || content.agentOutputs || content.results;

          for (const agent of config.agent_sequence) {
            if (agentData[agent] && outputs[agent] === null) {
              outputs[agent] = agentData[agent];
              console.log(`      Found ${agent} output in ${path.basename(file)}`);
            }
          }
        }

        // Check if this file is specifically for one agent
        for (const agent of config.agent_sequence) {
          if (file.toLowerCase().includes(agent) && outputs[agent] === null) {
            outputs[agent] = content;
            console.log(`      Found ${agent} output: ${path.basename(file)}`);
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  // If no real data found, create synthetic test data
  if (Object.values(outputs).every(v => v === null)) {
    console.log('      No real build outputs found. Creating synthetic test data...');
    return createSyntheticTestData(config);
  }

  return outputs;
}

/**
 * Find all JSON files in a directory recursively
 */
function findJsonFiles(dir: string, maxDepth: number = 3): string[] {
  const files: string[] = [];

  function search(currentDir: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          search(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  search(dir, 0);
  return files;
}

/**
 * Create synthetic test data to demonstrate the diagnostic
 */
function createSyntheticTestData(config: TraceConfig): Record<TracedAgentId, unknown> {
  // This synthetic data demonstrates where "filter by status" gets lost
  return {
    strategos: {
      mvp_features: [
        {
          name: 'Task Management',
          description: 'Users can create and manage tasks',
          acceptance_criteria: [
            'User can create new tasks',
            'User can mark tasks as complete',
            'User can filter tasks by status'  // <-- Requirement IS here
          ],
          priority: 'P0'
        },
        {
          name: 'User Authentication',
          description: 'Secure login system',
          acceptance_criteria: ['User can login', 'User can logout'],
          priority: 'P0'
        }
      ],
      technical_requirements: {
        framework: 'Next.js',
        database: 'PostgreSQL'
      }
    },

    scope: {
      in_scope: [
        {
          feature: 'Task Management',
          description: 'Core task functionality',
          acceptance_criteria: [
            'Create tasks',
            'Complete tasks'
            // NOTE: "filter by status" MISSING here - L1_PARTIAL_CAPTURE
          ],
          priority: 'P0'
        }
      ],
      out_of_scope: ['Advanced reporting', 'Team features'],
      constraints: ['Next.js', 'PostgreSQL', 'Vercel deployment']
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
                { type: 'heading', text: 'My Tasks' },
                { type: 'data-table', entity: 'tasks' }
                // NOTE: No filter component defined - L0 at this stage
              ]
            }
          ]
        }
      ],
      navigation: {
        primary: [{ label: 'Dashboard', path: '/dashboard' }]
      }
    },

    blocks: {
      components: [
        {
          name: 'Button',
          variants: ['primary', 'secondary', 'danger'],
          props: { onClick: 'function', children: 'ReactNode' }
        },
        {
          name: 'DataTable',
          variants: ['default', 'compact'],
          props: { data: 'array', columns: 'array' }
          // NOTE: No filter-related component - L0 continues
        }
      ],
      design_tokens: {
        colors: { primary: '#3B82F6' },
        spacing: { unit: 4 }
      }
    },

    wire: {
      files: [
        {
          path: 'src/app/dashboard/page.tsx',
          content: `'use client';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(setTasks);
  }, []);

  return (
    <div>
      <h1>My Tasks</h1>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
}`,
          type: 'code'
        }
        // NOTE: No filter state, no filter UI - shape completely absent
      ],
      routes: [{ path: '/dashboard', page: 'dashboard' }]
    },

    pixel: {
      files: [
        {
          path: 'src/components/TaskList.tsx',
          content: `interface Task { id: string; title: string; status: string; }

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="space-y-2">
      {tasks.map(task => (
        <li key={task.id} className="p-2 border rounded">
          {task.title}
        </li>
      ))}
    </ul>
  );
}`,
          type: 'code'
        }
      ],
      components: [{ name: 'TaskList', path: 'src/components/TaskList.tsx' }]
    }
  };
}

/**
 * Display results to console
 */
function displayResults(report: TraceReport) {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                     TRACE CHAIN                              │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  for (const link of report.trace_chain) {
    const status = link.shape_present ? '✓ PRESENT' : '✗ ABSENT';
    const lossIndicator = link.loss_from_previous ? ` [${link.loss_from_previous}]` : '';

    console.log(`  ${link.agent.padEnd(15)} │ ${status}${lossIndicator}`);

    if (link.attributes_present.length > 0) {
      console.log(`                  │   Found: ${link.attributes_present.slice(0, 3).join(', ')}${link.attributes_present.length > 3 ? '...' : ''}`);
    }
    if (link.attributes_missing.length > 0 && link.shape_present) {
      console.log(`                  │   Missing: ${link.attributes_missing.slice(0, 3).join(', ')}${link.attributes_missing.length > 3 ? '...' : ''}`);
    }
  }

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    LOSS POINT                                │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  if (report.loss_point.identified && report.loss_point.loss_class) {
    console.log(`  Status:    LOSS IDENTIFIED`);
    console.log(`  Handoff:   ${report.loss_point.handoff_id || 'N/A'}`);
    console.log(`  Class:     ${report.loss_point.loss_class}`);
    console.log(`  Summary:`);
    console.log(`    ${report.loss_point.summary.split('\n').join('\n    ')}`);
  } else {
    console.log(`  Status:    ${report.loss_point.summary}`);
  }

  // Show handoff details
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                  HANDOFF DETAILS                             │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  for (const [id, handoff] of Object.entries(report.handoffs)) {
    const hasLoss = handoff.loss !== null;
    const indicator = hasLoss ? '⚠' : '✓';

    console.log(`  ${indicator} ${id}: ${handoff.source_agent} → ${handoff.target_agent}`);
    console.log(`      Preserved: ${handoff.attributes_preserved} │ Lost: ${handoff.attributes_lost} │ Degraded: ${handoff.attributes_degraded}`);

    if (hasLoss) {
      console.log(`      Loss: ${handoff.loss!.loss_class} (${handoff.loss!.severity})`);
    }
  }
}

/**
 * Write reports to disk
 */
async function writeReports(report: TraceReport) {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Write JSON report
  const jsonPath = path.join(REPORTS_DIR, 'trace-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`      Written: ${jsonPath}`);

  // Write Markdown report
  const mdPath = path.join(REPORTS_DIR, 'trace-report.md');
  fs.writeFileSync(mdPath, generateMarkdownReport(report));
  console.log(`      Written: ${mdPath}`);
}

/**
 * Generate human-readable Markdown report
 */
function generateMarkdownReport(report: TraceReport): string {
  const lines: string[] = [];

  lines.push('# Requirement Propagation Trace Report');
  lines.push('');
  lines.push(`**Generated:** ${report.metadata.generated_at}`);
  lines.push(`**Target Shape:** ${report.metadata.target_shape}`);
  lines.push(`**Tool Version:** ${report.metadata.tool_version}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');

  if (report.loss_point.identified && report.loss_point.loss_class) {
    lines.push(`**LOSS IDENTIFIED:** ${report.loss_point.loss_class}`);
    lines.push('');
    lines.push('```');
    lines.push(report.loss_point.summary);
    lines.push('```');
  } else {
    lines.push(report.loss_point.summary);
  }
  lines.push('');

  // Trace Chain
  lines.push('## Trace Chain');
  lines.push('');
  lines.push('| Agent | Shape Present | Attributes Found | Loss from Previous |');
  lines.push('|-------|---------------|------------------|-------------------|');

  for (const link of report.trace_chain) {
    const present = link.shape_present ? 'YES' : 'NO';
    const attrs = link.attributes_present.length > 0 ? link.attributes_present.join(', ') : '-';
    const loss = link.loss_from_previous || '-';
    lines.push(`| ${link.agent} | ${present} | ${attrs} | ${loss} |`);
  }
  lines.push('');

  // Handoff Analysis
  lines.push('## Handoff Analysis');
  lines.push('');

  for (const [id, handoff] of Object.entries(report.handoffs)) {
    lines.push(`### ${id}: ${handoff.source_agent} → ${handoff.target_agent}`);
    lines.push('');

    if (handoff.loss) {
      lines.push(`**Loss Class:** ${handoff.loss.loss_class}`);
      lines.push(`**Severity:** ${handoff.loss.severity}`);
      lines.push(`**Condition:** ${handoff.loss.triggering_condition}`);
      lines.push('');
      lines.push('**Evidence:**');
      lines.push('```');
      lines.push(`Source Path: ${handoff.loss.evidence.source_path}`);
      lines.push(`Target Path: ${handoff.loss.evidence.target_path}`);
      lines.push(`Explanation: ${handoff.loss.evidence.explanation}`);
      lines.push('```');
    } else {
      lines.push('No loss detected at this handoff.');
    }
    lines.push('');

    // Attribute diffs
    const changedDiffs = handoff.attribute_diffs.filter(d =>
      d.status !== 'PRESERVED' || d.source_value !== undefined
    );

    if (changedDiffs.length > 0) {
      lines.push('**Attribute Diffs:**');
      lines.push('');
      lines.push('| Attribute | Status | Source Value | Target Value | Similarity |');
      lines.push('|-----------|--------|--------------|--------------|------------|');

      for (const diff of changedDiffs.slice(0, 10)) {
        const srcVal = diff.source_value !== undefined ? JSON.stringify(diff.source_value).slice(0, 20) : '-';
        const tgtVal = diff.target_value !== undefined ? JSON.stringify(diff.target_value).slice(0, 20) : '-';
        lines.push(`| ${diff.attribute} | ${diff.status} | ${srcVal} | ${tgtVal} | ${diff.similarity_score.toFixed(2)} |`);
      }
      lines.push('');
    }
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');

  if (report.loss_point.loss_class) {
    switch (report.loss_point.loss_class) {
      case 'L0_TOTAL_OMISSION':
        lines.push('1. Verify the requirement is explicitly stated in the user prompt');
        lines.push('2. Check if STRATEGOS is extracting all features from the prompt');
        lines.push('3. Review agent system prompts for feature extraction instructions');
        break;
      case 'L1_PARTIAL_CAPTURE':
        lines.push('1. The requirement was partially captured but key attributes are missing');
        lines.push('2. Check SCOPE agent output for complete acceptance criteria');
        lines.push('3. Ensure downstream agents receive full feature specifications');
        break;
      case 'L4_CONTEXT_TRUNCATION':
        lines.push('1. Context is being truncated before reaching the target agent');
        lines.push('2. Consider increasing MAX_CONTEXT_TOKENS in summarizer.ts');
        lines.push('3. Prioritize filter-related features in context building');
        break;
      case 'L6_SUMMARY_COLLAPSE':
        lines.push('1. The summarizeOutputForDependency function is collapsing critical details');
        lines.push('2. Consider preserving feature-level summaries, not just decisions');
        lines.push('3. Add filter capability to the summary if present in output');
        break;
      default:
        lines.push('1. Review the identified handoff for specific issues');
        lines.push('2. Check agent prompts for requirement propagation instructions');
    }
  } else {
    lines.push('No specific recommendations - trace completed without identified losses.');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by OLYMPUS 2.0 Requirement Propagation Diagnostic*');

  return lines.join('\n');
}

// Run
main().catch(console.error);

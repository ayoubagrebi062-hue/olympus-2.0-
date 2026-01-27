/**
 * OLYMPUS 2.1 - Quality Orchestrator
 *
 * Coordinates all quality gates and produces unified results.
 * Philosophy: "Code for rules, AI for taste"
 *
 * Gate execution order (fail fast):
 * 1. Token Gate (design system compliance)
 * 2. Component Gate (registry compliance)
 * 3. Layout Gate (UX rules)
 * 4. Motion Gate (animation rules)
 * 5. A11y Gate (accessibility)
 * 6. [Future] UX_CRITIC (AI taste review - only if code passes)
 */

import { designTokenGate } from './gates/token-gate';
import { componentRegistryGate } from './gates/component-gate';
import { layoutGrammarGate } from './gates/layout-gate';
import { motionSystemGate } from './gates/motion-gate';
import { accessibilityGate } from './gates/a11y-gate';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FileToCheck {
  path: string;
  content: string;
}

export interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats?: Record<string, number | boolean>;
}

export interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
  wcag?: string;
}

export interface GateDefinition {
  name: string;
  description: string;
  type: string;
  check: (files: FileToCheck[]) => Promise<GateResult>;
}

export interface OrchestratorResult {
  passed: boolean;
  overallScore: number;
  phase: 'validation' | 'complete';
  duration: number;
  gates: {
    [key: string]: {
      name: string;
      passed: boolean;
      score: number;
      issueCount: number;
      errorCount: number;
      warningCount: number;
    };
  };
  issues: GateIssue[];
  summary: {
    filesChecked: number;
    totalErrors: number;
    totalWarnings: number;
    autoFixable: number;
  };
}

export interface OrchestratorOptions {
  stopOnFirstError?: boolean;
  gates?: string[];
  verbose?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const GATE_REGISTRY: Record<string, GateDefinition> = {
  'token': designTokenGate,
  'component': componentRegistryGate,
  'layout': layoutGrammarGate,
  'motion': motionSystemGate,
  'a11y': accessibilityGate,
};

// Default execution order (priority: higher = runs first)
const DEFAULT_GATE_ORDER = ['token', 'component', 'layout', 'motion', 'a11y'];

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class QualityOrchestrator {
  private gates: Map<string, GateDefinition> = new Map();
  private gateOrder: string[] = [];

  constructor() {
    // Register default gates
    for (const [key, gate] of Object.entries(GATE_REGISTRY)) {
      this.gates.set(key, gate);
    }
    this.gateOrder = [...DEFAULT_GATE_ORDER];
  }

  /**
   * Register a custom gate
   */
  registerGate(key: string, gate: GateDefinition, priority?: number): void {
    this.gates.set(key, gate);

    if (priority !== undefined) {
      // Insert at specific position
      this.gateOrder.splice(priority, 0, key);
    } else {
      // Add to end
      this.gateOrder.push(key);
    }
  }

  /**
   * Run all gates on the provided files
   */
  async validate(files: FileToCheck[], options: OrchestratorOptions = {}): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const gatesToRun = options.gates || this.gateOrder;

    const result: OrchestratorResult = {
      passed: true,
      overallScore: 100,
      phase: 'validation',
      duration: 0,
      gates: {},
      issues: [],
      summary: {
        filesChecked: files.length,
        totalErrors: 0,
        totalWarnings: 0,
        autoFixable: 0,
      },
    };

    // Run each gate in order
    for (const gateKey of gatesToRun) {
      const gate = this.gates.get(gateKey);
      if (!gate) {
        console.warn(`Gate "${gateKey}" not found, skipping`);
        continue;
      }

      if (options.verbose) {
        console.log(`Running ${gate.name}...`);
      }

      try {
        const gateResult = await gate.check(files);

        // Record gate results
        const errors = gateResult.issues.filter(i => i.severity === 'error').length;
        const warnings = gateResult.issues.filter(i => i.severity === 'warning').length;
        const autoFixable = gateResult.issues.filter(i => i.autoFixable).length;

        result.gates[gateKey] = {
          name: gate.name,
          passed: gateResult.passed,
          score: gateResult.score,
          issueCount: gateResult.issues.length,
          errorCount: errors,
          warningCount: warnings,
        };

        // Aggregate issues
        result.issues.push(...gateResult.issues);
        result.summary.totalErrors += errors;
        result.summary.totalWarnings += warnings;
        result.summary.autoFixable += autoFixable;

        // Update overall pass status
        if (!gateResult.passed) {
          result.passed = false;

          if (options.stopOnFirstError) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error running gate ${gateKey}:`, error);
        result.gates[gateKey] = {
          name: gate.name,
          passed: false,
          score: 0,
          issueCount: 1,
          errorCount: 1,
          warningCount: 0,
        };
        result.passed = false;
      }
    }

    // Calculate overall score (weighted average)
    const gateScores = Object.values(result.gates).map(g => g.score);
    result.overallScore = gateScores.length > 0
      ? Math.round(gateScores.reduce((a, b) => a + b, 0) / gateScores.length)
      : 100;

    result.duration = Date.now() - startTime;
    result.phase = 'complete';

    return result;
  }

  /**
   * Get list of available gates
   */
  getAvailableGates(): string[] {
    return Array.from(this.gates.keys());
  }

  /**
   * Get gate definition
   */
  getGate(key: string): GateDefinition | undefined {
    return this.gates.get(key);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick validation with default settings
 */
export async function validateFiles(files: FileToCheck[]): Promise<OrchestratorResult> {
  const orchestrator = new QualityOrchestrator();
  return orchestrator.validate(files);
}

/**
 * Validate a single file
 */
export async function validateFile(path: string, content: string): Promise<OrchestratorResult> {
  return validateFiles([{ path, content }]);
}

/**
 * Format result for CLI output
 */
export function formatResultForCLI(result: OrchestratorResult): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push('╭─────────────────────────────────────────────────────────────╮');
  lines.push('│ 🔍 OLYMPUS 2.1 QUALITY VALIDATION                          │');
  lines.push('╰─────────────────────────────────────────────────────────────╯');
  lines.push('');

  // Gate results
  for (const [key, gate] of Object.entries(result.gates)) {
    const icon = gate.passed ? '✓' : '✗';
    const status = gate.passed ? 'PASSED' : 'FAILED';
    const scoreBar = '█'.repeat(Math.round(gate.score / 10)) + '░'.repeat(10 - Math.round(gate.score / 10));

    lines.push(`  ${icon} ${gate.name.padEnd(20)} ${status.padEnd(8)} [${scoreBar}] ${gate.score}%`);

    if (gate.errorCount > 0 || gate.warningCount > 0) {
      lines.push(`    └── ${gate.errorCount} errors, ${gate.warningCount} warnings`);
    }
  }

  lines.push('');
  lines.push('─────────────────────────────────────────────────────────────');

  // Summary
  const overallIcon = result.passed ? '✓' : '✗';
  const overallStatus = result.passed ? 'PASSED' : 'FAILED';

  lines.push(`  ${overallIcon} Overall: ${overallStatus} (Score: ${result.overallScore}%)`);
  lines.push(`    Duration: ${result.duration}ms`);
  lines.push(`    Files: ${result.summary.filesChecked}`);
  lines.push(`    Errors: ${result.summary.totalErrors}`);
  lines.push(`    Warnings: ${result.summary.totalWarnings}`);
  lines.push(`    Auto-fixable: ${result.summary.autoFixable}`);
  lines.push('');

  // Issues (top 10)
  if (result.issues.length > 0) {
    lines.push('─────────────────────────────────────────────────────────────');
    lines.push('  Issues:');
    lines.push('');

    const topIssues = result.issues
      .sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1))
      .slice(0, 10);

    for (const issue of topIssues) {
      const icon = issue.severity === 'error' ? '✗' : '⚠';
      const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';

      lines.push(`  ${icon} [${issue.rule}] ${issue.message}`);
      if (location) {
        lines.push(`    └── ${location}`);
      }
      if (issue.expected) {
        lines.push(`    └── Expected: ${issue.expected}`);
      }
    }

    if (result.issues.length > 10) {
      lines.push(`  ... and ${result.issues.length - 10} more issues`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Get issues grouped by file
 */
export function groupIssuesByFile(issues: GateIssue[]): Map<string, GateIssue[]> {
  const grouped = new Map<string, GateIssue[]>();

  for (const issue of issues) {
    const file = issue.file || 'unknown';
    const existing = grouped.get(file) || [];
    existing.push(issue);
    grouped.set(file, existing);
  }

  return grouped;
}

/**
 * Get auto-fixable issues
 */
export function getAutoFixableIssues(issues: GateIssue[]): GateIssue[] {
  return issues.filter(i => i.autoFixable);
}

/**
 * Generate retry feedback for agents
 */
export function generateRetryFeedback(issues: GateIssue[]): string {
  const fixable = issues.filter(i => i.autoFixable);

  if (fixable.length === 0) {
    return 'All violations require manual intervention.';
  }

  const feedback = fixable.map(i => {
    let msg = `- [${i.rule}] ${i.message}`;
    if (i.file && i.line) {
      msg += ` at ${i.file}:${i.line}`;
    }
    if (i.expected) {
      msg += `\n  Fix: ${i.expected}`;
    }
    return msg;
  });

  return `Your output has ${fixable.length} fixable violations:\n\n${feedback.join('\n\n')}\n\nPlease regenerate with these corrections.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  designTokenGate,
  componentRegistryGate,
  layoutGrammarGate,
  motionSystemGate,
  accessibilityGate,
};

export default QualityOrchestrator;

/**
 * OLYMPUS 2.0 - AGENT WEAKNESS ANALYSIS
 * Maps validation failures back to specific agents and identifies upgrades needed
 *
 * Run with: npx ts-node src/lib/agents/validation/__tests__/agent-weakness-analysis.ts
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import type { TestResult } from './stress-test';
import { TEST_CASES, runValidators } from './stress-test';

// ============================================================================
// AGENT WEAKNESS INTERFACE
// ============================================================================

export interface AgentWeakness {
  agent: string;
  phase: string;
  weakness: string;
  evidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  upgradeNeeded: string;
  estimatedEffort: 'hours' | 'day' | 'days' | 'week';
}

// ============================================================================
// AGENT MAPPING (Which agents produce what)
// ============================================================================

const AGENT_RESPONSIBILITY_MAP = {
  // Discovery Phase
  ORACLE: { phase: 'discovery', produces: ['market_analysis', 'competitors'] },
  EMPATHY: { phase: 'discovery', produces: ['personas', 'pain_points'] },
  VENTURE: { phase: 'discovery', produces: ['business_model', 'pricing'] },
  STRATEGOS: { phase: 'discovery', produces: ['mvp_features', 'technical_requirements'] },
  SCOPE: { phase: 'discovery', produces: ['in_scope', 'out_of_scope', 'constraints'] },

  // Design Phase
  PALETTE: { phase: 'design', produces: ['colors', 'design_tokens', 'theme'] },
  GRID: { phase: 'design', produces: ['layout', 'spacing', 'responsive'] },
  BLOCKS: { phase: 'design', produces: ['components', 'variants', 'props'] },
  CARTOGRAPHER: { phase: 'design', produces: ['pages', 'routes', 'navigation'] },
  FLOW: { phase: 'design', produces: ['user_flows', 'interactions'] },

  // Architecture Phase
  ARCHON: { phase: 'architecture', produces: ['system_design', 'patterns'] },
  DATUM: { phase: 'architecture', produces: ['database_schema', 'models'] },
  NEXUS: { phase: 'architecture', produces: ['api_contracts', 'endpoints'] },
  FORGE: { phase: 'architecture', produces: ['backend_patterns', 'services'] },
  SENTINEL: { phase: 'architecture', produces: ['security', 'auth'] },

  // Frontend Phase
  PIXEL: { phase: 'frontend', produces: ['components', 'jsx', 'styling', 'handlers'] },
  WIRE: { phase: 'frontend', produces: ['pages', 'layouts', 'routing'] },
  POLISH: { phase: 'frontend', produces: ['animations', 'microinteractions'] },

  // Backend Phase
  ENGINE: { phase: 'backend', produces: ['business_logic', 'services'] },
  GATEWAY: { phase: 'backend', produces: ['api_routes', 'middleware'] },
  KEEPER: { phase: 'backend', produces: ['data_access', 'queries'] },
};

// ============================================================================
// WEAKNESS DETECTION RULES
// ============================================================================

export function analyzeAgentWeaknesses(results: TestResult[]): AgentWeakness[] {
  const weaknesses: AgentWeakness[] = [];

  const stubResult = results.find(r => r.testCase.includes('STUB'));
  const minimalResult = results.find(r => r.testCase.includes('MINIMAL'));
  const mediumResult = results.find(r => r.testCase.includes('MEDIUM'));
  const goodResult = results.find(r => r.testCase.includes('GOOD'));

  // ========================================================================
  // STUB FAILURES: Which agents produce empty/minimal output?
  // ========================================================================

  if (stubResult && stubResult.lineCount < 20) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Generates minimal stub components instead of full implementations',
      evidence: `STUB output has only ${stubResult.lineCount} lines`,
      severity: 'critical',
      upgradeNeeded: 'Add minimum output length enforcement (>50 lines for components)',
      estimatedEffort: 'day',
    });

    weaknesses.push({
      agent: 'WIRE',
      phase: 'frontend',
      weakness: 'Generates placeholder pages instead of full page layouts',
      evidence: 'Page contains only basic <h1>Title</h1> structure',
      severity: 'critical',
      upgradeNeeded: 'Add page template scaffolding with required sections',
      estimatedEffort: 'day',
    });
  }

  // Check complexity failures on stub
  if (stubResult && !stubResult.complexityValid) {
    const violations = stubResult.complexityViolations;

    if (violations.includes('componentCount')) {
      weaknesses.push({
        agent: 'BLOCKS',
        phase: 'design',
        weakness: 'Component specifications not enforced in code generation',
        evidence: 'Output missing required component count',
        severity: 'high',
        upgradeNeeded: 'Add component manifest that PIXEL must implement',
        estimatedEffort: 'day',
      });
    }

    if (violations.includes('stateHookCount')) {
      weaknesses.push({
        agent: 'PIXEL',
        phase: 'frontend',
        weakness: 'Does not implement state management when needed',
        evidence: 'Missing useState/useReducer for interactive features',
        severity: 'high',
        upgradeNeeded: 'Add state pattern requirements based on feature type',
        estimatedEffort: 'hours',
      });
    }

    if (violations.includes('importCount')) {
      weaknesses.push({
        agent: 'PIXEL',
        phase: 'frontend',
        weakness: 'Uses minimal imports, missing shadcn/ui components',
        evidence: 'Import count below threshold',
        severity: 'medium',
        upgradeNeeded: 'Add import requirements (min 5 for pages)',
        estimatedEffort: 'hours',
      });
    }
  }

  // ========================================================================
  // FEATURE FAILURES: Which agents fail to implement requested features?
  // ========================================================================

  if (stubResult && stubResult.featuresMissing.length > 0) {
    weaknesses.push({
      agent: 'STRATEGOS',
      phase: 'discovery',
      weakness: 'Feature requirements not tracked or enforced downstream',
      evidence: `Missing features: ${stubResult.featuresMissing.join(', ')}`,
      severity: 'high',
      upgradeNeeded: 'Add feature checklist that flows to PIXEL/WIRE agents',
      estimatedEffort: 'day',
    });
  }

  // Check for specific missing features
  const allMissing = new Set<string>();
  for (const r of results) {
    for (const f of r.featuresMissing) {
      allMissing.add(f);
    }
  }

  if (allMissing.has('Drag and Drop')) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Does not implement drag-and-drop when requested',
      evidence: 'Kanban board missing DnD functionality',
      severity: 'high',
      upgradeNeeded: 'Add @dnd-kit patterns to PIXEL knowledge base',
      estimatedEffort: 'day',
    });

    weaknesses.push({
      agent: 'BLOCKS',
      phase: 'design',
      weakness: 'Does not specify draggable component patterns',
      evidence: 'Component specs missing drag handle, sortable context',
      severity: 'medium',
      upgradeNeeded: 'Add drag-and-drop component variants to BLOCKS output',
      estimatedEffort: 'hours',
    });
  }

  if (allMissing.has('Dark Theme')) {
    weaknesses.push({
      agent: 'PALETTE',
      phase: 'design',
      weakness: 'Dark theme tokens not properly propagated',
      evidence: 'Components using hardcoded colors instead of theme tokens',
      severity: 'medium',
      upgradeNeeded: 'Ensure dark theme tokens are in PIXEL context window',
      estimatedEffort: 'hours',
    });
  }

  // ========================================================================
  // HANDLER FAILURES: Fake handlers indicate PIXEL weakness
  // ========================================================================

  if (minimalResult && minimalResult.fakeHandlers > 0) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Generates fake handlers (console.log only, empty bodies)',
      evidence: `${minimalResult.fakeHandlers} fake handlers in MINIMAL output`,
      severity: 'high',
      upgradeNeeded: 'Add handler reality check to PIXEL prompt - must use setState/mutation/toast',
      estimatedEffort: 'hours',
    });
  }

  if (mediumResult && mediumResult.fakeHandlers > 0) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Leaves TODO comments instead of implementing handlers',
      evidence: `${mediumResult.fakeHandlers} fake handlers in MEDIUM output`,
      severity: 'high',
      upgradeNeeded: 'Ban console.log-only handlers, require real operations',
      estimatedEffort: 'hours',
    });
  }

  // ========================================================================
  // DESIGN TOKEN FAILURES: PIXEL ignoring PALETTE output
  // ========================================================================

  if (mediumResult && mediumResult.hardcodedColors > 3) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Ignores PALETTE design tokens, uses hardcoded hex colors',
      evidence: `${mediumResult.hardcodedColors} hardcoded colors in MEDIUM output`,
      severity: 'high',
      upgradeNeeded: 'Inject design tokens into PIXEL context, ban arbitrary hex values',
      estimatedEffort: 'day',
    });

    weaknesses.push({
      agent: 'PALETTE',
      phase: 'design',
      weakness: 'Design tokens not effectively passed to frontend agents',
      evidence: 'PIXEL output contains hardcoded colors instead of bg-primary',
      severity: 'medium',
      upgradeNeeded: 'Add design token injection into PIXEL system message',
      estimatedEffort: 'hours',
    });
  }

  if (mediumResult && mediumResult.hardcodedSpacing > 3) {
    weaknesses.push({
      agent: 'PIXEL',
      phase: 'frontend',
      weakness: 'Uses arbitrary pixel values instead of Tailwind scale',
      evidence: `${mediumResult.hardcodedSpacing} hardcoded spacing values`,
      severity: 'medium',
      upgradeNeeded: 'Add spacing scale reference, ban p-[24px] patterns',
      estimatedEffort: 'hours',
    });

    weaknesses.push({
      agent: 'GRID',
      phase: 'design',
      weakness: 'Spacing system not enforced in code generation',
      evidence: 'Components using arbitrary pixel values',
      severity: 'low',
      upgradeNeeded: 'Add spacing scale validation to output',
      estimatedEffort: 'hours',
    });
  }

  // ========================================================================
  // GOOD OUTPUT CHECK: Is the "good" output passing correctly?
  // ========================================================================

  if (goodResult && !goodResult.overallPass) {
    // Check which validator failed
    if (!goodResult.featureValid) {
      weaknesses.push({
        agent: 'VALIDATOR',
        phase: 'validation',
        weakness: 'Feature validator too strict - rejects valid implementations',
        evidence: `GOOD output failed feature validation (score: ${goodResult.featureScore})`,
        severity: 'medium',
        upgradeNeeded: 'Tune feature detection patterns to recognize good implementations',
        estimatedEffort: 'hours',
      });
    }

    if (!goodResult.handlerValid) {
      weaknesses.push({
        agent: 'VALIDATOR',
        phase: 'validation',
        weakness: 'Handler validator not recognizing real handlers',
        evidence: `GOOD output has ${goodResult.fakeHandlers} "fake" handlers`,
        severity: 'medium',
        upgradeNeeded: 'Add more real handler patterns (useCallback, async handlers)',
        estimatedEffort: 'hours',
      });
    }

    if (!goodResult.designValid) {
      weaknesses.push({
        agent: 'VALIDATOR',
        phase: 'validation',
        weakness: 'Design validator may be too strict',
        evidence: `GOOD output design score: ${goodResult.designScore}`,
        severity: 'low',
        upgradeNeeded: 'Review allowed arbitrary values, add more exceptions',
        estimatedEffort: 'hours',
      });
    }
  }

  return weaknesses;
}

// ============================================================================
// GENERATE PRIORITY UPGRADE LIST
// ============================================================================

export function generatePriorityList(weaknesses: AgentWeakness[]): void {
  const critical = weaknesses.filter(w => w.severity === 'critical');
  const high = weaknesses.filter(w => w.severity === 'high');
  const medium = weaknesses.filter(w => w.severity === 'medium');
  const low = weaknesses.filter(w => w.severity === 'low');

  console.log('');
  console.log('='.repeat(80));
  console.log('  PRIORITY UPGRADE LIST');
  console.log('='.repeat(80));
  console.log('');

  if (critical.length > 0) {
    console.log('\u274C CRITICAL (Fix immediately - blocks all builds):');
    console.log('-'.repeat(60));
    for (const w of critical) {
      console.log(`  ${w.agent} [${w.phase}]`);
      console.log(`    Problem: ${w.weakness}`);
      console.log(`    Fix: ${w.upgradeNeeded}`);
      console.log(`    Effort: ${w.estimatedEffort}`);
      console.log('');
    }
  }

  if (high.length > 0) {
    console.log('\u26A0\uFE0F  HIGH (Fix soon - causes quality issues):');
    console.log('-'.repeat(60));
    for (const w of high) {
      console.log(`  ${w.agent} [${w.phase}]`);
      console.log(`    Problem: ${w.weakness}`);
      console.log(`    Fix: ${w.upgradeNeeded}`);
      console.log(`    Effort: ${w.estimatedEffort}`);
      console.log('');
    }
  }

  if (medium.length > 0) {
    console.log('\u2139\uFE0F  MEDIUM (Fix when possible):');
    console.log('-'.repeat(60));
    for (const w of medium) {
      console.log(`  ${w.agent} [${w.phase}]`);
      console.log(`    Problem: ${w.weakness}`);
      console.log(`    Fix: ${w.upgradeNeeded}`);
      console.log(`    Effort: ${w.estimatedEffort}`);
      console.log('');
    }
  }

  if (low.length > 0) {
    console.log('\u2705 LOW (Nice to have):');
    console.log('-'.repeat(60));
    for (const w of low) {
      console.log(`  ${w.agent} [${w.phase}]`);
      console.log(`    Problem: ${w.weakness}`);
      console.log(`    Fix: ${w.upgradeNeeded}`);
      console.log(`    Effort: ${w.estimatedEffort}`);
      console.log('');
    }
  }
}

// ============================================================================
// GENERATE AGENT UPGRADE ROADMAP
// ============================================================================

export function generateAgentRoadmap(weaknesses: AgentWeakness[]): void {
  // Group weaknesses by agent
  const byAgent = new Map<string, AgentWeakness[]>();

  for (const w of weaknesses) {
    if (!byAgent.has(w.agent)) {
      byAgent.set(w.agent, []);
    }
    byAgent.get(w.agent)!.push(w);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('  AGENT UPGRADE ROADMAP');
  console.log('='.repeat(80));
  console.log('');

  // Sort agents by total severity (critical = 4, high = 3, medium = 2, low = 1)
  const severityScore = (w: AgentWeakness): number => {
    switch (w.severity) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
    }
  };

  const sortedAgents = Array.from(byAgent.entries())
    .map(([agent, ws]) => ({
      agent,
      weaknesses: ws,
      totalScore: ws.reduce((sum, w) => sum + severityScore(w), 0),
      criticalCount: ws.filter(w => w.severity === 'critical').length,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  for (const { agent, weaknesses: agentWeaknesses, criticalCount } of sortedAgents) {
    const phase = agentWeaknesses[0].phase;
    const statusIcon = criticalCount > 0 ? '\u274C' : '\u26A0\uFE0F';

    console.log(`${statusIcon} ${agent} [${phase.toUpperCase()}]`);
    console.log('  ' + '='.repeat(50));

    for (const w of agentWeaknesses) {
      const icon =
        w.severity === 'critical'
          ? '\u274C'
          : w.severity === 'high'
            ? '\u26A0\uFE0F'
            : w.severity === 'medium'
              ? '\u2139\uFE0F'
              : '\u2022';
      console.log(`  ${icon} ${w.weakness}`);
      console.log(`      Fix: ${w.upgradeNeeded}`);
    }

    console.log('');
  }

  // Effort summary
  const totalEffort = weaknesses.reduce((sum, w) => {
    switch (w.estimatedEffort) {
      case 'hours':
        return sum + 0.25;
      case 'day':
        return sum + 1;
      case 'days':
        return sum + 3;
      case 'week':
        return sum + 5;
      default:
        return sum + 1;
    }
  }, 0);

  console.log('-'.repeat(80));
  console.log(`  TOTAL ESTIMATED EFFORT: ${totalEffort.toFixed(1)} developer-days`);
  console.log('-'.repeat(80));
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const USER_PROMPT = 'Build a kanban board like Linear with dark theme and drag-and-drop';

  console.log('');
  console.log('='.repeat(80));
  console.log('  OLYMPUS 2.0 AGENT WEAKNESS ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  // Run validators on all test cases
  const results: TestResult[] = [];
  for (const tc of TEST_CASES) {
    results.push(runValidators(tc.code, tc.name, USER_PROMPT));
  }

  // Analyze weaknesses
  const weaknesses = analyzeAgentWeaknesses(results);

  // Output results
  console.log(
    `Found ${weaknesses.length} agent weaknesses across ${new Set(weaknesses.map(w => w.agent)).size} agents`
  );

  generatePriorityList(weaknesses);
  generateAgentRoadmap(weaknesses);

  // Summary stats
  console.log('');
  console.log('='.repeat(80));
  console.log('  SUMMARY STATISTICS');
  console.log('='.repeat(80));
  console.log('');

  const stats = {
    total: weaknesses.length,
    critical: weaknesses.filter(w => w.severity === 'critical').length,
    high: weaknesses.filter(w => w.severity === 'high').length,
    medium: weaknesses.filter(w => w.severity === 'medium').length,
    low: weaknesses.filter(w => w.severity === 'low').length,
    affectedAgents: new Set(weaknesses.map(w => w.agent)).size,
  };

  console.log(`  Total Weaknesses: ${stats.total}`);
  console.log(`  Critical: ${stats.critical}`);
  console.log(`  High: ${stats.high}`);
  console.log(`  Medium: ${stats.medium}`);
  console.log(`  Low: ${stats.low}`);
  console.log(`  Affected Agents: ${stats.affectedAgents}`);
  console.log('');

  // Most problematic agent
  const agentCounts = new Map<string, number>();
  for (const w of weaknesses) {
    agentCounts.set(w.agent, (agentCounts.get(w.agent) || 0) + 1);
  }

  const sortedAgentCounts = Array.from(agentCounts.entries()).sort((a, b) => b[1] - a[1]);

  console.log('  Most Problematic Agents:');
  for (const [agent, count] of sortedAgentCounts.slice(0, 3)) {
    console.log(`    - ${agent}: ${count} issues`);
  }

  console.log('');
  console.log('='.repeat(80));

  return weaknesses;
}

// Run if executed directly
const weaknesses = main();
export { weaknesses };

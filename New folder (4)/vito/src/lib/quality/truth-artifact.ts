/**
 * OLYMPUS 2.0 - Constitutional Test & Explanation Layer (CTEL)
 * Part 3: Truth Artifact Generator
 *
 * Generates WHY_THIS_SHIPPED.md or WHY_THIS_BLOCKED.md
 * One-page, deterministic, human-readable explanation.
 *
 * This is the human-facing output of OLYMPUS.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConstitutionalTestResult, CONSTITUTIONAL_ARTICLES } from './constitutional-tests';
import { OverrideSummary } from './human-override';
import { OlympusVersionIdentity } from './architecture-guard';
import { IntentFatesResult, IntentFate } from './intent-governance';

// ============================================
// TRUTH ARTIFACT INPUTS
// ============================================

/**
 * All data needed to generate truth artifact
 */
export interface TruthArtifactInputs {
  buildId: string;
  description: string;
  tier: string;
  duration: string;
  timestamp: string;

  // Final decision
  shipped: boolean;
  blockReason: string | null;

  // Version identity
  version: OlympusVersionIdentity;

  // Gate results (simplified)
  gates: {
    name: string;
    passed: boolean;
    score?: number;
    blocker?: string;
  }[];

  // Constitutional test result
  constitutionalResult: ConstitutionalTestResult;

  // Override summary
  overrideSummary: OverrideSummary;

  // Fate summary
  fateResult: IntentFatesResult | null;

  // Key metrics
  metrics: {
    wissd: number;
    ssi: number;
    uvd: number;
    ias: number;
    hostileBlocked: number;
    hostileTotal: number;
  };

  // Intent summary
  intents: {
    total: number;
    satisfied: number;
    partial: number;
    unsatisfied: number;
    critical: number;
    criticalSatisfied: number;
  };
}

// ============================================
// ARTIFACT GENERATION
// ============================================

/**
 * Generate the truth artifact markdown content
 */
export function generateTruthArtifact(inputs: TruthArtifactInputs): string {
  const lines: string[] = [];
  const shipped = inputs.shipped;

  // Title
  lines.push(`# ${shipped ? 'WHY THIS SHIPPED' : 'WHY THIS WAS BLOCKED'}`);
  lines.push('');
  lines.push(`**Build ID:** \`${inputs.buildId}\``);
  lines.push(`**Timestamp:** ${inputs.timestamp}`);
  lines.push(`**Duration:** ${inputs.duration}`);
  lines.push(`**OLYMPUS Version:** ${inputs.version.olympusVersion}`);
  lines.push(`**Authority:** ${inputs.version.governanceAuthority}`);
  lines.push('');

  // Decision summary
  lines.push('---');
  lines.push('');
  lines.push('## Decision');
  lines.push('');

  if (shipped) {
    lines.push('```');
    lines.push('VERDICT: SHIP APPROVED');
    lines.push('```');
    lines.push('');
    lines.push('This software satisfies its stated intents and passes all constitutional checks.');
  } else {
    lines.push('```');
    lines.push('VERDICT: SHIP BLOCKED');
    lines.push('```');
    lines.push('');
    lines.push(`**Block Reason:** ${inputs.blockReason || 'Unknown'}`);
  }

  lines.push('');

  // Key metrics
  lines.push('---');
  lines.push('');
  lines.push('## Key Metrics');
  lines.push('');
  lines.push('| Metric | Score | Status |');
  lines.push('|--------|-------|--------|');
  lines.push(`| W-ISS-D (Intent Satisfaction) | ${inputs.metrics.wissd}% | ${inputs.metrics.wissd >= 95 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| SSI (Stability) | ${(inputs.metrics.ssi * 100).toFixed(1)}% | ${inputs.metrics.ssi >= 0.7 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| UVD (User Value) | ${(inputs.metrics.uvd * 100).toFixed(1)}% | ${inputs.metrics.uvd >= 0.6 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| IAS (Adequacy) | ${(inputs.metrics.ias * 100).toFixed(1)}% | ${inputs.metrics.ias >= 0.7 ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Hostile Blocked | ${inputs.metrics.hostileBlocked}/${inputs.metrics.hostileTotal} | ${inputs.metrics.hostileBlocked === inputs.metrics.hostileTotal ? 'PASS' : 'FAIL'} |`);
  lines.push('');

  // Gate results
  lines.push('---');
  lines.push('');
  lines.push('## Gate Results');
  lines.push('');
  lines.push('| Gate | Status | Details |');
  lines.push('|------|--------|---------|');

  for (const gate of inputs.gates) {
    const status = gate.passed ? 'PASS' : 'FAIL';
    const details = gate.blocker || (gate.score !== undefined ? `${(gate.score * 100).toFixed(1)}%` : '-');
    lines.push(`| ${gate.name} | ${status} | ${details} |`);
  }

  lines.push('');

  // Intent summary
  lines.push('---');
  lines.push('');
  lines.push('## Intent Summary');
  lines.push('');
  lines.push(`- **Total Intents:** ${inputs.intents.total}`);
  lines.push(`- **Satisfied:** ${inputs.intents.satisfied}`);
  lines.push(`- **Partial:** ${inputs.intents.partial}`);
  lines.push(`- **Unsatisfied:** ${inputs.intents.unsatisfied}`);
  lines.push(`- **Critical Intents:** ${inputs.intents.criticalSatisfied}/${inputs.intents.critical} satisfied`);
  lines.push('');

  // Fate summary
  if (inputs.fateResult) {
    lines.push('---');
    lines.push('');
    lines.push('## Intent Fates');
    lines.push('');
    lines.push('| Fate | Count |');
    lines.push('|------|-------|');
    lines.push(`| ACCEPTED | ${inputs.fateResult.summary.accepted} |`);
    lines.push(`| ACCEPTED_WITH_DEBT | ${inputs.fateResult.summary.acceptedWithDebt} |`);
    lines.push(`| QUARANTINED | ${inputs.fateResult.summary.quarantined} |`);
    lines.push(`| FORBIDDEN | ${inputs.fateResult.summary.forbidden} |`);
    lines.push('');

    // List any FORBIDDEN intents
    const forbidden = inputs.fateResult.fates.filter(f => f.fate === IntentFate.FORBIDDEN);
    if (forbidden.length > 0) {
      lines.push('### Forbidden Intents');
      lines.push('');
      for (const f of forbidden) {
        lines.push(`- **${f.intentId}**: ${f.reason}`);
        lines.push(`  - ${f.explanation}`);
      }
      lines.push('');
    }

    // List evolution events
    if (inputs.fateResult.evolutionViolations.length > 0) {
      lines.push('### Fate Evolutions');
      lines.push('');
      for (const e of inputs.fateResult.evolutionViolations) {
        const symbol = e.evolutionType === 'PROMOTION' ? '' : (e.evolutionType === 'DEMOTION' ? '' : (e.evolutionType === 'VIOLATION' ? '' : ''));
        lines.push(`- ${symbol} **${e.intentId}**: ${e.previousFate} ${e.newFate}`);
      }
      lines.push('');
    }
  }

  // Constitutional test results
  lines.push('---');
  lines.push('');
  lines.push('## Constitutional Compliance');
  lines.push('');

  if (inputs.constitutionalResult.passed) {
    lines.push('**Status:** ALL ARTICLES UPHELD');
    lines.push('');
    lines.push('The OLYMPUS constitution was fully respected. No violations detected.');
  } else {
    lines.push('**Status:** CONSTITUTION VIOLATED');
    lines.push('');
    lines.push('The following constitutional articles were violated:');
    lines.push('');

    for (const article of inputs.constitutionalResult.articlesViolated) {
      const def = CONSTITUTIONAL_ARTICLES[article];
      lines.push(`### ${def.title}`);
      lines.push('');
      lines.push(`**Article:** ${article}`);
      lines.push(`**Guarantee:** ${def.guarantee}`);
      lines.push('');

      const violations = inputs.constitutionalResult.violations.filter(v => v.article === article);
      for (const v of violations) {
        lines.push(`- ${v.description}`);
        lines.push(`  - Evidence: ${v.evidence}`);
      }
      lines.push('');
    }
  }

  lines.push('');

  // Override status
  if (inputs.overrideSummary.hasActiveOverride && inputs.overrideSummary.override) {
    lines.push('---');
    lines.push('');
    lines.push('## Human Override');
    lines.push('');
    lines.push('**AN OVERRIDE WAS APPLIED TO THIS BUILD**');
    lines.push('');
    lines.push(`- **Target:** ${inputs.overrideSummary.override.target}`);
    lines.push(`- **Check:** ${inputs.overrideSummary.override.specificCheck}`);
    lines.push(`- **Authorizer:** ${inputs.overrideSummary.override.authorizer}`);
    lines.push(`- **SSI Penalty:** ${(inputs.overrideSummary.override.penalty * 100).toFixed(0)}%`);
    lines.push('');
    lines.push('**Justification:**');
    lines.push('');
    lines.push(`> ${inputs.overrideSummary.override.justification}`);
    lines.push('');

    if (inputs.overrideSummary.ssiAdjustment) {
      lines.push('**SSI Impact:**');
      lines.push(`- Before: ${(inputs.overrideSummary.ssiAdjustment.before * 100).toFixed(1)}%`);
      lines.push(`- Penalty: -${(inputs.overrideSummary.ssiAdjustment.penalty * 100).toFixed(0)}%`);
      lines.push(`- After: ${(inputs.overrideSummary.ssiAdjustment.after * 100).toFixed(1)}%`);
      lines.push('');
    }

    lines.push('**Note:** This override does not set precedent for future builds.');
    lines.push('');
  }

  // Why explanation
  lines.push('---');
  lines.push('');
  lines.push('## Explanation');
  lines.push('');

  if (shipped) {
    lines.push('### Why This Shipped');
    lines.push('');
    lines.push('This build was approved for shipping because:');
    lines.push('');
    lines.push('1. **All hard gates passed** - Every mandatory check completed successfully');
    lines.push('2. **Constitutional compliance** - All OLYMPUS guarantees were upheld');
    lines.push('3. **Hostile resistance** - 100% of hostile intents were blocked');
    lines.push('4. **Intent satisfaction** - The software does what it claims to do');
    lines.push('5. **Stability envelope** - The system is stable enough for production');
    lines.push('');

    if (inputs.fateResult && inputs.fateResult.summary.acceptedWithDebt > 0) {
      lines.push('**Note:** Some intents were accepted with technical debt. These should be addressed in future builds.');
    }
  } else {
    lines.push('### Why This Was Blocked');
    lines.push('');
    lines.push('This build was blocked because:');
    lines.push('');

    // Analyze and explain the block reason
    const failedGates = inputs.gates.filter(g => !g.passed);
    if (failedGates.length > 0) {
      lines.push(`1. **${failedGates.length} gate(s) failed:**`);
      for (const gate of failedGates) {
        lines.push(`   - ${gate.name}: ${gate.blocker || 'Did not pass threshold'}`);
      }
      lines.push('');
    }

    if (!inputs.constitutionalResult.passed) {
      lines.push(`2. **Constitutional violation(s):**`);
      for (const article of inputs.constitutionalResult.articlesViolated) {
        const def = CONSTITUTIONAL_ARTICLES[article];
        lines.push(`   - ${def.title}: ${def.description}`);
      }
      lines.push('');
    }

    if (inputs.fateResult && inputs.fateResult.summary.forbidden > 0) {
      lines.push(`3. **Forbidden intents (${inputs.fateResult.summary.forbidden}):**`);
      lines.push('   - Intents marked FORBIDDEN cannot be included in a shippable build');
      lines.push('');
    }

    lines.push('### How to Fix');
    lines.push('');

    if (failedGates.some(g => g.name.includes('hostile') || g.name.includes('HITH'))) {
      lines.push('- **Hostile intent leak**: Review and fix the intent verification logic');
    }

    if (failedGates.some(g => g.name.includes('stability') || g.name.includes('SSI'))) {
      lines.push('- **Stability issue**: Reduce churn, improve trust scores, or address coupling');
    }

    if (failedGates.some(g => g.name.includes('UVD') || g.name.includes('value'))) {
      lines.push('- **Low user value**: Add observable outcomes, user feedback, or behavioral indicators');
    }

    if (!inputs.constitutionalResult.passed) {
      lines.push('- **Constitutional violation**: Cannot be overridden. Must fix the underlying issue.');
    }

    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('## Verification');
  lines.push('');
  lines.push('This artifact was generated deterministically by OLYMPUS 2.0.');
  lines.push('');
  lines.push('- **Same inputs** will always produce **same outputs**');
  lines.push('- **No ML/AI** was used in scoring decisions');
  lines.push('- **No heuristics** were applied');
  lines.push('- **Full audit trail** is available in `.olympus/`');
  lines.push('');
  lines.push(`*Generated at ${inputs.timestamp} by OLYMPUS ${inputs.version.olympusVersion}*`);
  lines.push('');

  return lines.join('\n');
}

// ============================================
// ARTIFACT WRITING
// ============================================

/**
 * Write truth artifact to filesystem
 */
export function writeTruthArtifact(
  fsOutputDir: string,
  inputs: TruthArtifactInputs
): { path: string; filename: string } {
  const filename = inputs.shipped ? 'WHY_THIS_SHIPPED.md' : 'WHY_THIS_BLOCKED.md';
  const artifactPath = path.join(fsOutputDir, filename);

  const content = generateTruthArtifact(inputs);
  fs.writeFileSync(artifactPath, content);

  console.log(`[CTEL] Truth artifact written: ${filename}`);

  // Also write to .olympus for audit trail
  const olympusDir = path.join(fsOutputDir, '.olympus');
  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  const auditFilename = `truth-artifact-${inputs.buildId}.md`;
  fs.writeFileSync(path.join(olympusDir, auditFilename), content);

  return { path: artifactPath, filename };
}

// ============================================
// CTEL RESULT TYPE
// ============================================

/**
 * Complete CTEL result
 */
export interface CTELResult {
  /** Constitutional test result */
  constitutionalTests: ConstitutionalTestResult;

  /** Override summary */
  overrideSummary: OverrideSummary;

  /** Truth artifact path */
  truthArtifact: {
    path: string;
    filename: string;
  };

  /** Does CTEL allow shipping? */
  allowsShip: boolean;

  /** Block reason if any */
  blockReason: string | null;

  /** CTEL timestamp */
  timestamp: string;
}

/**
 * Log CTEL result
 */
export function logCTELResult(result: CTELResult): void {
  console.log('[CTEL] ==========================================');
  console.log('[CTEL] CTEL FINAL RESULT');
  console.log('[CTEL] ==========================================');
  console.log(`[CTEL] Constitutional Tests: ${result.constitutionalTests.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`[CTEL] Override Active: ${result.overrideSummary.hasActiveOverride}`);
  console.log(`[CTEL] Truth Artifact: ${result.truthArtifact.filename}`);
  console.log(`[CTEL] Allows Ship: ${result.allowsShip}`);
  if (result.blockReason) {
    console.log(`[CTEL] Block Reason: ${result.blockReason}`);
  }
  console.log('[CTEL] ==========================================');
}

/**
 * Get CTEL output for build artifact
 */
export function getCTELOutput(result: CTELResult): {
  constitutionalTests: {
    passed: boolean;
    violations: number;
    articlesViolated: string[];
  };
  override: {
    active: boolean;
    target: string | null;
    penalty: number | null;
  };
  truthArtifact: string;
  allowsShip: boolean;
  blockReason: string | null;
} {
  return {
    constitutionalTests: {
      passed: result.constitutionalTests.passed,
      violations: result.constitutionalTests.violations.length,
      articlesViolated: result.constitutionalTests.articlesViolated,
    },
    override: {
      active: result.overrideSummary.hasActiveOverride,
      target: result.overrideSummary.override?.target || null,
      penalty: result.overrideSummary.override?.penalty || null,
    },
    truthArtifact: result.truthArtifact.filename,
    allowsShip: result.allowsShip,
    blockReason: result.blockReason,
  };
}

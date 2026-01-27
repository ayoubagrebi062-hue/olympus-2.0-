/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Integration module for the OLYMPUS pipeline.
 * Replaces the canonical semantic parser with the provenance parser.
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

import {
  parseWithProvenance,
  validateParseResult,
  toCanonicalIntentFormat,
  RESEARCH_IDENTITY,
  PARSER_VERSION,
} from './provenance-parser';
import { ProvenanceParseResult } from './provenance-types';

// ============================================
// INTEGRATION STATUS
// ============================================

export const INTEGRATION_STATUS = {
  enabled: true,
  authority: RESEARCH_IDENTITY.authority,
  canShip: RESEARCH_IDENTITY.canShip,
  version: PARSER_VERSION,
  replacesCanonical: true,
};

// ============================================
// SEMANTIC PARSE REPLACEMENT
// ============================================

/**
 * Replace the canonical semantic parser with the provenance parser.
 * This function has the same interface as the canonical extractIntentsFromDescription.
 */
export function extractIntentsWithProvenance(description: string): {
  intents: Array<{
    id: string;
    requirement: string;
    category: string;
    priority: string;
    source: string;
    expectedTrigger?: {
      type: string;
      target?: string;
      event?: string;
    };
    expectedState?: {
      stateName: string;
    };
    expectedOutcome?: {
      type: string;
      description: string;
    };
  }>;
  provenanceResult: ProvenanceParseResult;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
} {
  // Parse with provenance
  const provenanceResult = parseWithProvenance(description);

  // Validate
  const validation = validateParseResult(provenanceResult);

  // Convert to canonical format
  const canonicalFormat = toCanonicalIntentFormat(provenanceResult);

  return {
    intents: canonicalFormat.intents,
    provenanceResult,
    validation,
  };
}

// ============================================
// ROUTE.TS INTEGRATION HELPER
// ============================================

/**
 * Generates the code to patch route.ts for research testing.
 * This is for documentation only - actual modification would violate FROZEN status.
 */
export function generatePatchInstructions(): string {
  return `
================================================================================
RESEARCH INTEGRATION INSTRUCTIONS
================================================================================

To test the provenance parser against the canonical pipeline, create a
research-only route that uses the provenance parser instead of the canonical
semantic parser.

FILE: research/semantic-intent-fidelity/api/research-build/route.ts

This file should:
1. Import extractIntentsWithProvenance from pipeline-integration.ts
2. Replace the canonical intent extraction step
3. Add provenance validation to the output
4. Mark all outputs with authority: EXPERIMENTAL

IMPORTANT:
- Do NOT modify the canonical src/app/api/debug/run-build/route.ts
- The repository is FROZEN
- This research route is separate and experimental only

================================================================================
`;
}

// ============================================
// OAT-2 REPLAY HELPER
// ============================================

/**
 * Test the provenance parser with the OAT-2 description.
 */
export function testOAT2Description(): {
  success: boolean;
  intentsFound: number;
  phantomCheck: {
    passed: boolean;
    phantomCount: number;
  };
  coverage: number;
  intents: Array<{
    id: string;
    requirement: string;
    trigger?: string;
    effect?: string;
  }>;
} {
  const OAT2_DESCRIPTION = `Counter web application.

Intent 1: On page load, display counter at zero.

Intent 2: Plus button click increases counter by one.

Intent 3: Minus button click decreases counter by one if counter above zero.

Intent 4: Minus button click does nothing if counter is zero.

Intent 5: Clear button click sets counter to zero.`;

  const result = parseWithProvenance(OAT2_DESCRIPTION);
  const validation = validateParseResult(result);

  return {
    success: validation.valid && result.phantomCheck.passed,
    intentsFound: result.intents.length,
    phantomCheck: {
      passed: result.phantomCheck.passed,
      phantomCount: result.phantomCheck.phantomCount,
    },
    coverage: result.coverage.coveragePercent,
    intents: result.intents.map((i) => ({
      id: i.id,
      requirement: i.requirement,
      trigger: i.trigger ? `${i.trigger.type}${i.trigger.event ? ':' + i.trigger.event : ''}${i.trigger.target ? '@' + i.trigger.target : ''}` : undefined,
      effect: i.effect ? `${i.effect.action}${i.effect.value !== undefined ? ':' + i.effect.value : ''}` : undefined,
    })),
  };
}

// ============================================
// COMPARISON WITH CANONICAL
// ============================================

/**
 * Compare provenance parser output with what the canonical parser produced.
 */
export function compareWithCanonical(
  provenanceIntents: Array<{ id: string; requirement: string }>,
  canonicalIntents: Array<{ id: string; requirement: string }>
): {
  provenanceCount: number;
  canonicalCount: number;
  phantomsInCanonical: string[];
  missingInProvenance: string[];
  matchScore: number;
} {
  const provenanceReqs = new Set(provenanceIntents.map((i) => i.requirement.toLowerCase().trim()));
  const canonicalReqs = new Set(canonicalIntents.map((i) => i.requirement.toLowerCase().trim()));

  const phantomsInCanonical: string[] = [];
  const missingInProvenance: string[] = [];

  // Find phantoms (in canonical but not in provenance)
  for (const req of canonicalReqs) {
    if (!provenanceReqs.has(req)) {
      phantomsInCanonical.push(req);
    }
  }

  // Find missing (in provenance but not in canonical)
  for (const req of provenanceReqs) {
    if (!canonicalReqs.has(req)) {
      missingInProvenance.push(req);
    }
  }

  const totalUnique = new Set([...provenanceReqs, ...canonicalReqs]).size;
  const matching = [...provenanceReqs].filter((r) => canonicalReqs.has(r)).length;
  const matchScore = totalUnique > 0 ? matching / totalUnique : 0;

  return {
    provenanceCount: provenanceIntents.length,
    canonicalCount: canonicalIntents.length,
    phantomsInCanonical,
    missingInProvenance,
    matchScore,
  };
}

// ============================================
// CLI TEST RUNNER
// ============================================

if (require.main === module) {
  console.log('================================================================================');
  console.log('RESEARCH: semantic-intent-fidelity');
  console.log('Testing provenance parser with OAT-2 description');
  console.log('================================================================================');
  console.log('');

  const result = testOAT2Description();

  console.log(`Success: ${result.success}`);
  console.log(`Intents Found: ${result.intentsFound}`);
  console.log(`Phantom Check: ${result.phantomCheck.passed ? 'PASSED' : 'FAILED'} (${result.phantomCheck.phantomCount} phantoms)`);
  console.log(`Coverage: ${result.coverage.toFixed(1)}%`);
  console.log('');
  console.log('Extracted Intents:');
  for (const intent of result.intents) {
    console.log(`  ${intent.id}: ${intent.requirement.substring(0, 60)}...`);
    if (intent.trigger) console.log(`    Trigger: ${intent.trigger}`);
    if (intent.effect) console.log(`    Effect: ${intent.effect}`);
  }
  console.log('');
  console.log('================================================================================');
}

/**
 * RESEARCH: semantic-intent-fidelity
 *
 * Test runner for the provenance parser.
 * Validates that the parser eliminates phantom intents.
 *
 * Run with: npx ts-node research/semantic-intent-fidelity/test-runner.ts
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

import { parseWithProvenance, validateParseResult } from './src/provenance-parser';
import { ProvenanceParseResult } from './src/provenance-types';

// ============================================
// TEST CASES
// ============================================

interface TestCase {
  name: string;
  description: string;
  expectedIntents: number;
  mustNotContain?: string[];  // Phantom elements that must NOT appear
  mustContain?: string[];     // Elements that MUST appear
}

const TEST_CASES: TestCase[] = [
  {
    name: 'OAT-2 Counter Application',
    description: `Counter web application.

Intent 1: On page load, display counter at zero.

Intent 2: Plus button click increases counter by one.

Intent 3: Minus button click decreases counter by one if counter above zero.

Intent 4: Minus button click does nothing if counter is zero.

Intent 5: Clear button click sets counter to zero.`,
    expectedIntents: 5,
    mustNotContain: [
      'OnLink',
      'initialLink',
      'thes',
      'pointss',
      'withoutLink',
      'mitigation',
      'review points',
    ],
    mustContain: [
      'counter',
      'zero',
      'plus',
      'minus',
      'clear',
    ],
  },
  {
    name: 'Simple Lifecycle',
    description: 'On page load, display welcome message.',
    expectedIntents: 1,
    mustNotContain: ['OnLink', 'theLink'],
    mustContain: ['page_load', 'display'],
  },
  {
    name: 'Button Click',
    description: 'When user clicks submit button, form is submitted.',
    expectedIntents: 1,
    mustNotContain: ['userLink', 'thes'],
    mustContain: ['click', 'submit'],
  },
  {
    name: 'Constraint',
    description: 'Counter cannot be negative.',
    expectedIntents: 1,
    mustNotContain: ['counters', 'negatives'],
    mustContain: ['counter', 'negative'],
  },
  {
    name: 'Conditional',
    description: 'If value is zero, disable decrement button.',
    expectedIntents: 1,
    mustNotContain: ['valueLink', 'zeros'],
    mustContain: ['zero', 'disable'],
  },
];

// ============================================
// TEST RUNNER
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  intentsFound: number;
  expectedIntents: number;
  phantomsPassed: boolean;
  phantomCount: number;
  phantoms: string[];
  containsPassed: boolean;
  missingElements: string[];
  errors: string[];
  warnings: string[];
}

function runTest(testCase: TestCase): TestResult {
  const result = parseWithProvenance(testCase.description);
  const validation = validateParseResult(result);

  const phantoms: string[] = [];
  let containsPassed = true;
  const missingElements: string[] = [];

  // Check for phantom elements
  const resultJson = JSON.stringify(result).toLowerCase();

  if (testCase.mustNotContain) {
    for (const phantom of testCase.mustNotContain) {
      if (resultJson.includes(phantom.toLowerCase())) {
        phantoms.push(phantom);
      }
    }
  }

  // Check for required elements
  if (testCase.mustContain) {
    for (const required of testCase.mustContain) {
      if (!resultJson.includes(required.toLowerCase())) {
        missingElements.push(required);
        containsPassed = false;
      }
    }
  }

  const phantomsPassed = phantoms.length === 0 && result.phantomCheck.passed;
  const intentsMatch = result.intents.length === testCase.expectedIntents;

  return {
    name: testCase.name,
    passed: phantomsPassed && containsPassed && intentsMatch && validation.valid,
    intentsFound: result.intents.length,
    expectedIntents: testCase.expectedIntents,
    phantomsPassed,
    phantomCount: phantoms.length + result.phantomCheck.phantomCount,
    phantoms: [...phantoms, ...result.phantomCheck.phantoms.map((p) => p.element)],
    containsPassed,
    missingElements,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

function runAllTests(): { results: TestResult[]; summary: { passed: number; failed: number; total: number } } {
  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    results.push(runTest(testCase));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    results,
    summary: { passed, failed, total: results.length },
  };
}

// ============================================
// OUTPUT FORMATTING
// ============================================

function printResults(testResults: { results: TestResult[]; summary: { passed: number; failed: number; total: number } }): void {
  console.log('================================================================================');
  console.log('RESEARCH: semantic-intent-fidelity');
  console.log('PROVENANCE PARSER TEST RESULTS');
  console.log('================================================================================');
  console.log('');

  for (const result of testResults.results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}  ${result.name}`);
    console.log(`       Intents: ${result.intentsFound}/${result.expectedIntents}`);
    console.log(`       Phantoms: ${result.phantomsPassed ? 'NONE' : result.phantomCount + ' detected'}`);

    if (!result.passed) {
      if (result.phantoms.length > 0) {
        console.log(`       Phantom elements: ${result.phantoms.join(', ')}`);
      }
      if (result.missingElements.length > 0) {
        console.log(`       Missing elements: ${result.missingElements.join(', ')}`);
      }
      if (result.errors.length > 0) {
        console.log(`       Errors: ${result.errors.join('; ')}`);
      }
    }
    console.log('');
  }

  console.log('================================================================================');
  console.log(`SUMMARY: ${testResults.summary.passed}/${testResults.summary.total} tests passed`);

  if (testResults.summary.failed > 0) {
    console.log(`         ${testResults.summary.failed} tests failed`);
  }

  console.log('================================================================================');
}

// ============================================
// DETAILED OAT-2 OUTPUT
// ============================================

function printDetailedOAT2(): void {
  console.log('');
  console.log('================================================================================');
  console.log('DETAILED OAT-2 PARSING');
  console.log('================================================================================');

  const oat2 = TEST_CASES[0];
  const result = parseWithProvenance(oat2.description);

  console.log('');
  console.log('SOURCE TEXT:');
  console.log('------------');
  console.log(oat2.description);
  console.log('');

  console.log('PARSED INTENTS:');
  console.log('---------------');

  for (const intent of result.intents) {
    console.log(`[${intent.id}] ${intent.requirement}`);
    console.log(`  Category: ${intent.category}`);
    console.log(`  Priority: ${intent.priority}`);

    if (intent.trigger) {
      console.log(`  Trigger: ${intent.trigger.type}${intent.trigger.event ? ':' + intent.trigger.event : ''}${intent.trigger.target ? ' @ ' + intent.trigger.target : ''}`);
      console.log(`    Provenance: "${intent.trigger.provenance.span.text}" (rule: ${intent.trigger.provenance.rule})`);
    }

    if (intent.effect) {
      console.log(`  Effect: ${intent.effect.action}${intent.effect.value !== undefined ? ' = ' + intent.effect.value : ''}`);
      console.log(`    Provenance: "${intent.effect.provenance.span.text}" (rule: ${intent.effect.provenance.rule})`);
    }

    if (intent.state) {
      console.log(`  State: ${intent.state.name}`);
    }

    if (intent.outcome) {
      console.log(`  Outcome: ${intent.outcome.description}`);
    }

    console.log(`  Full Provenance: line ${intent.provenance.span.line}, chars ${intent.provenance.span.start}-${intent.provenance.span.end}`);
    console.log('');
  }

  console.log('PHANTOM CHECK:');
  console.log('--------------');
  console.log(`  Passed: ${result.phantomCheck.passed}`);
  console.log(`  Phantom Count: ${result.phantomCheck.phantomCount}`);

  if (result.phantomCheck.phantoms.length > 0) {
    console.log('  Phantoms:');
    for (const phantom of result.phantomCheck.phantoms) {
      console.log(`    - ${phantom.element}: ${phantom.reason}`);
    }
  }

  console.log('');
  console.log('COVERAGE:');
  console.log('---------');
  console.log(`  Covered: ${result.coverage.sourceCharsCovered}/${result.coverage.sourceTotalChars} chars`);
  console.log(`  Percentage: ${result.coverage.coveragePercent.toFixed(1)}%`);

  console.log('');
  console.log('================================================================================');
}

// ============================================
// MAIN
// ============================================

if (require.main === module) {
  const testResults = runAllTests();
  printResults(testResults);
  printDetailedOAT2();

  // Exit with error code if tests failed
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

export { runAllTests, runTest, TEST_CASES };

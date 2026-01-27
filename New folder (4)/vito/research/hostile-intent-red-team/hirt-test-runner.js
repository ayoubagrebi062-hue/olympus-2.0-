/**
 * HIRT-1 Red Team Test Runner
 *
 * Executes hostile intent corpus against IAL-0 authenticator
 * and reports results.
 *
 * Authority: EXPERIMENTAL
 */

const fs = require('fs');
const path = require('path');

// ============================================
// IAL-0 IMPLEMENTATION (Inline for testing)
// ============================================

const HOSTILE_PATTERNS = [
  { pattern: /bypass.*(auth|security|safety|check|validation)/i, code: 'HOST-001' },
  { pattern: /ignore.*(constraint|rule|check|limit)/i, code: 'HOST-002' },
  { pattern: /disable.*(validation|verification|check|safety)/i, code: 'HOST-003' },
  { pattern: /skip.*(check|test|verification|validation)/i, code: 'HOST-004' },
  { pattern: /override.*(security|permission|access|limit)/i, code: 'HOST-005' },
  { pattern: /backdoor|secret.*(access|entry|admin)/i, code: 'HOST-006' },
  { pattern: /unlimited.*(admin|access|permission)/i, code: 'HOST-007' },
  { pattern: /always.*(succeed|pass|allow)|never.*(fail|reject|block)/i, code: 'HOST-008' },
];

const PHANTOM_SUFFIXES = ['thes', 'ons', 'ats', 'ifs', 'pointss', 'updatess', 'showss', 'meetingss'];
const PHANTOM_LINK_PATTERN = /^(On|The|A|An|In|At|To|If|Is|It)Link$/i;
const PHANTOM_BUTTON_PATTERN = /^(On|The|A|An|In|At|To|If|Is|It)Button$/i;

function isPhantomName(name) {
  const lower = name.toLowerCase();
  if (PHANTOM_SUFFIXES.includes(lower)) return true;
  if (PHANTOM_LINK_PATTERN.test(name) || PHANTOM_BUTTON_PATTERN.test(name)) return true;
  return false;
}

function validateProvenance(intent, sourceText) {
  if (!intent.provenance) {
    return { reason: 'REJECT_NO_PROVENANCE', check: 'IAL-0-PROV', message: 'No provenance object' };
  }
  if (intent.provenance.source !== 'input') {
    return { reason: 'REJECT_NO_PROVENANCE', check: 'IAL-0-PROV', message: `Source is "${intent.provenance.source}"` };
  }
  if (intent.provenance.confidence < 0.5) {
    return { reason: 'REJECT_NO_PROVENANCE', check: 'IAL-0-PROV', message: `Confidence ${intent.provenance.confidence} < 0.5` };
  }
  if (intent.provenance.span) {
    const { start, end, text } = intent.provenance.span;
    const actualText = sourceText.substring(start, end);
    if (actualText !== text) {
      return { reason: 'REJECT_NO_PROVENANCE', check: 'IAL-0-PROV', message: 'Span text mismatch' };
    }
  }
  return null;
}

function validateStructure(intent) {
  if (!intent.id || intent.id.trim() === '') {
    return { reason: 'REJECT_MALFORMED', check: 'IAL-0-STRUCT', message: 'Missing or empty ID' };
  }
  if (!intent.requirement || intent.requirement.length < 10) {
    return { reason: 'REJECT_MALFORMED', check: 'IAL-0-STRUCT', message: `Requirement too short (${intent.requirement?.length || 0} chars)` };
  }
  const validCategories = ['functional', 'constraint', 'initialization', 'navigation', 'validation'];
  if (!intent.category || !validCategories.includes(intent.category)) {
    return { reason: 'REJECT_MALFORMED', check: 'IAL-0-STRUCT', message: `Invalid category "${intent.category}"` };
  }
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!intent.priority || !validPriorities.includes(intent.priority)) {
    return { reason: 'REJECT_MALFORMED', check: 'IAL-0-STRUCT', message: `Invalid priority "${intent.priority}"` };
  }
  return null;
}

function validateSpecificity(intent) {
  let axisCount = 0;
  if (intent.trigger && intent.trigger.type) axisCount++;
  if ((intent.state && intent.state.name) || (intent.effect && intent.effect.target)) axisCount++;
  if (intent.effect && intent.effect.action) axisCount++;
  if (intent.outcome && intent.outcome.description) axisCount++;

  if (axisCount < 2) {
    return { reason: 'REJECT_UNDERSPECIFIED', check: 'IAL-0-SPEC', message: `Only ${axisCount} axes (need 2+)` };
  }
  return null;
}

function validateHostile(intent) {
  const requirement = intent.requirement.toLowerCase();
  for (const { pattern, code } of HOSTILE_PATTERNS) {
    if (pattern.test(requirement)) {
      return { reason: 'REJECT_HOSTILE', check: 'IAL-0-HOSTILE', message: `Matches pattern ${code}` };
    }
  }
  return null;
}

function validatePhantom(intent, sourceText) {
  const sourceLower = sourceText.toLowerCase();

  if (intent.trigger?.target) {
    const targetLower = intent.trigger.target.toLowerCase();
    if (!sourceLower.includes(targetLower)) {
      // Check phantom patterns
      if (isPhantomName(intent.trigger.target)) {
        return { reason: 'REJECT_PHANTOM', check: 'IAL-0-PHANTOM', message: `Trigger target "${intent.trigger.target}" is phantom pattern` };
      }
      return { reason: 'REJECT_PHANTOM', check: 'IAL-0-PHANTOM', message: `Trigger target "${intent.trigger.target}" not in source` };
    }
  }

  if (intent.state?.name) {
    if (isPhantomName(intent.state.name)) {
      return { reason: 'REJECT_PHANTOM', check: 'IAL-0-PHANTOM', message: `State name "${intent.state.name}" is phantom` };
    }
  }

  if (intent.effect?.target) {
    const targetLower = intent.effect.target.toLowerCase();
    const commonTargets = ['counter', 'value', 'count', 'number', 'display', 'list', 'item', 'panel', 'dashboard', 'welcome', 'animation'];
    if (!sourceLower.includes(targetLower) && !commonTargets.includes(targetLower)) {
      return { reason: 'REJECT_PHANTOM', check: 'IAL-0-PHANTOM', message: `Effect target "${intent.effect.target}" not in source` };
    }
  }

  return null;
}

function authenticateIntent(intent, sourceText) {
  const provResult = validateProvenance(intent, sourceText);
  if (provResult) return provResult;

  const structResult = validateStructure(intent);
  if (structResult) return structResult;

  const specResult = validateSpecificity(intent);
  if (specResult) return specResult;

  const hostileResult = validateHostile(intent);
  if (hostileResult) return hostileResult;

  const phantomResult = validatePhantom(intent, sourceText);
  if (phantomResult) return phantomResult;

  return { reason: 'AUTHENTICATED', check: 'ALL', message: 'Passed all checks' };
}

// ============================================
// TEST RUNNER
// ============================================

function runTests() {
  const corpusPath = path.join(__dirname, 'HIRT-1_CORPUS.json');
  const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       HIRT-1 RED TEAM TEST EXECUTION                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Corpus: ${corpus.corpusId.padEnd(68)}║`);
  console.log(`║  Total Intents: ${corpus.summary.totalIntents.toString().padEnd(61)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    passed: [],
    failed: [],
    byCategory: {},
    byReason: {},
    falseAdmissions: [],
    wrongRejections: [],
    expectedBypasses: [],
  };

  // Initialize counters
  for (const cat of Object.keys(corpus.attackCategories)) {
    results.byCategory[cat] = { total: 0, passed: 0, failed: 0 };
  }

  for (const hostile of corpus.hostileIntents) {
    const { id, category, intent, sourceText, expectedRejection, attackVector } = hostile;

    results.byCategory[category].total++;

    const actual = authenticateIntent(intent, sourceText);
    const actualReason = actual.reason;

    // Track by reason
    results.byReason[actualReason] = (results.byReason[actualReason] || 0) + 1;

    let testResult = 'PASS';
    let notes = '';

    if (expectedRejection === 'SHOULD_REJECT') {
      // This is a potential bypass - we WANT it to be rejected
      if (actualReason === 'AUTHENTICATED') {
        testResult = 'BYPASS_FOUND';
        results.falseAdmissions.push({ id, category, attackVector, actual });
        notes = '⚠️  FALSE ADMISSION - hostile intent passed through!';
      } else {
        testResult = 'CAUGHT';
        results.expectedBypasses.push({ id, category, attackVector, actualReason });
        notes = `✓ Caught by ${actualReason}`;
      }
    } else if (expectedRejection === 'AUTHENTICATED') {
      // This should pass
      if (actualReason === 'AUTHENTICATED') {
        testResult = 'PASS';
        notes = '✓ Correctly authenticated';
      } else {
        testResult = 'FALSE_REJECT';
        results.wrongRejections.push({ id, category, attackVector, expected: expectedRejection, actual: actualReason });
        notes = `✗ False rejection: expected AUTHENTICATED, got ${actualReason}`;
      }
    } else {
      // Expected a specific rejection
      if (actualReason === expectedRejection) {
        testResult = 'PASS';
        notes = `✓ Correctly rejected (${actualReason})`;
      } else if (actualReason === 'AUTHENTICATED') {
        testResult = 'BYPASS_FOUND';
        results.falseAdmissions.push({ id, category, attackVector, expected: expectedRejection, actual });
        notes = `⚠️  FALSE ADMISSION - expected ${expectedRejection}`;
      } else {
        testResult = 'WRONG_REASON';
        results.wrongRejections.push({ id, category, attackVector, expected: expectedRejection, actual: actualReason });
        notes = `△ Wrong reason: expected ${expectedRejection}, got ${actualReason}`;
      }
    }

    if (testResult === 'PASS' || testResult === 'CAUGHT') {
      results.passed.push(hostile);
      results.byCategory[category].passed++;
    } else {
      results.failed.push(hostile);
      results.byCategory[category].failed++;
    }

    // Print result
    const status = testResult === 'PASS' || testResult === 'CAUGHT' ? '✓' : '✗';
    console.log(`[${status}] ${id} (${category}): ${testResult}`);
    console.log(`    Attack: ${attackVector.substring(0, 60)}${attackVector.length > 60 ? '...' : ''}`);
    console.log(`    ${notes}`);
    console.log('');
  }

  // ============================================
  // SUMMARY
  // ============================================

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TEST EXECUTION SUMMARY                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests: ${corpus.summary.totalIntents.toString().padEnd(63)}║`);
  console.log(`║  Passed: ${results.passed.length.toString().padEnd(68)}║`);
  console.log(`║  Failed: ${results.failed.length.toString().padEnd(68)}║`);
  console.log(`║  Pass Rate: ${((results.passed.length / corpus.summary.totalIntents) * 100).toFixed(1)}%`.padEnd(78) + '║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  By Category:                                                                ║');
  for (const [cat, stats] of Object.entries(results.byCategory)) {
    const line = `║    ${cat}: ${stats.passed}/${stats.total} passed`.padEnd(78) + '║';
    console.log(line);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  By Actual Rejection Reason:                                                 ║');
  for (const [reason, count] of Object.entries(results.byReason)) {
    const line = `║    ${reason}: ${count}`.padEnd(78) + '║';
    console.log(line);
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // ============================================
  // CRITICAL FINDINGS
  // ============================================

  if (results.falseAdmissions.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  CRITICAL: FALSE ADMISSIONS DETECTED                                     ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const fa of results.falseAdmissions) {
      console.log(`║  ${fa.id}: ${fa.attackVector.substring(0, 60)}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  if (results.wrongRejections.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  △ WRONG REJECTION REASONS                                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const wr of results.wrongRejections) {
      console.log(`║  ${wr.id}: expected ${wr.expected}, got ${wr.actual}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  if (results.expectedBypasses.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ EXPECTED BYPASSES THAT WERE CAUGHT                                        ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const eb of results.expectedBypasses) {
      console.log(`║  ${eb.id}: caught by ${eb.actualReason}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  // ============================================
  // FINAL VERDICT
  // ============================================

  console.log('');
  if (results.falseAdmissions.length === 0) {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║   ✅ IAL-0 RED TEAM TEST: PASSED                                             ║');
    console.log('║                                                                              ║');
    console.log('║   Zero false admissions detected.                                            ║');
    console.log('║   All hostile intents were either rejected or correctly authenticated.       ║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║   ❌ IAL-0 RED TEAM TEST: FAILED                                             ║');
    console.log('║                                                                              ║');
    console.log(`║   ${results.falseAdmissions.length} false admission(s) detected!`.padEnd(78) + '║');
    console.log('║   Hostile intents bypassed IAL-0 authentication.                             ║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  // Return results for further processing
  return results;
}

// Run if executed directly
if (require.main === module) {
  const results = runTests();

  // Write results to JSON
  const outputPath = path.join(__dirname, 'HIRT-1_EXECUTION_RESULTS.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${outputPath}`);
}

module.exports = { runTests, authenticateIntent };

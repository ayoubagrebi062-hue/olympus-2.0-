/**
 * HIA-1 Test Runner
 *
 * Replays HIRT-1 corpus with semantic hostility detection.
 * Validates that HIA catches all hostile intents including bypasses.
 *
 * Authority: EXPERIMENTAL
 */

const fs = require('fs');
const path = require('path');

// ============================================
// ACTION CLASS DEFINITIONS
// ============================================

const NEGATE_ACTIONS = {
  primary: ['disable', 'bypass', 'skip', 'ignore', 'remove', 'override'],
  extended: [
    'evade', 'circumvent', 'avoid', 'sidestep', 'workaround',
    'turn off', 'shut down', 'deactivate', 'suppress', 'block',
    'prevent', 'stop', 'kill', 'eliminate', 'exclude', 'omit',
    'pass over', 'jump', 'get around', 'work around', 'escape',
    'dodge', 'elude', 'skirt', 'bypaas', 'by pass',
  ],
};

const GRANT_ACTIONS = {
  primary: ['grant', 'give', 'allow', 'enable', 'permit'],
  extended: [
    'provide', 'assign', 'allocate', 'authorize',
    'unlock', 'open', 'activate', 'turn on',
    // Note: "set" removed - too generic, used in many non-hostile effect.action fields
  ],
};

const FORCE_ACTIONS = {
  primary: ['always', 'never', 'force', 'ensure', 'guarantee'],
  extended: ['must', 'shall'],
};

const INJECT_ACTIONS = {
  primary: ['create', 'add', 'install', 'inject', 'insert'],
  extended: ['build', 'make', 'establish', 'set up', 'embed', 'plant', 'hide'],
};

// ============================================
// TARGET CLASS DEFINITIONS
// ============================================

const SECURITY_TERMS = [
  'authentication', 'auth', 'login', 'signin', 'credential',
  'password', 'token', 'session', 'identity',
  'authorization', 'permission', 'permissions', 'access',
  'privilege', 'role', 'roles', 'right', 'rights',
  'validation', 'verification', 'check', 'checks',
  'constraint', 'constraints', 'rule', 'rules',
  'limit', 'limits', 'boundary', 'restriction',
  'security', 'safety', 'protection', 'guard',
  'firewall', 'filter', 'sanitization',
];

const PRIVILEGE_TERMS = [
  'admin', 'administrator', 'root', 'superuser', 'super',
  'elevated', 'unlimited', 'unrestricted', 'full',
  'master', 'owner', 'god mode', 'sudo',
];

const CONTROL_TERMS = [
  'rate limit', 'rate-limit', 'ratelimit', 'throttle',
  'quota', 'cap', 'timeout', 'expiry', 'ttl',
  'audit', 'log', 'logging', 'monitor', 'monitoring',
  'trace', 'tracing', 'encryption', 'signing',
];

const COVERT_TERMS = [
  'backdoor', 'back door', 'secret', 'hidden',
  'undocumented', 'emergency',
  'master key', 'skeleton key', 'bypass mode',
  // Note: "override" removed - it's an ACTION word (override X), not a TARGET noun
];

// ============================================
// SEMANTIC PATTERNS
// ============================================

const NEGATION_PATTERNS = [
  { regex: /\b(don'?t|do not)\s+(\w+)/i, type: 'negation_verb' },
  { regex: /\bno\s+(validation|check|auth|verification|security)/i, type: 'no_noun' },
  { regex: /\bwithout\s+(auth|validation|check|verification|permission)/i, type: 'without_noun' },
];

const FORCE_PATTERNS = [
  { regex: /\balways\s+(pass|succeed|allow|permit|authenticate|work)/i, type: 'always_success' },
  { regex: /\bnever\s+(fail|reject|block|deny|error|stop)/i, type: 'never_fail' },
  { regex: /\bmust\s+(always\s+)?(succeed|pass|work)/i, type: 'must_succeed' },
];

const COVERT_PATTERNS = [
  { regex: /\b(back\s*door|backdoor)/i, type: 'backdoor' },
  { regex: /\bsecret\s+(access|entry|login|admin)/i, type: 'secret_access' },
  { regex: /\bhidden\s+(entry|access|admin|login)/i, type: 'hidden_access' },
  { regex: /\bemergency\s+(override|bypass|access)/i, type: 'emergency' },
];

// ============================================
// EXCLUSION PATTERNS
// ============================================

const EXCLUSION_PATTERNS = [
  { regex: /\bskip\s+(animation|loading|intro|tutorial|onboarding|splash)/i },
  { regex: /\bdisable\s+(dark\s*mode|notifications?|sounds?|animations?|theme)/i },
  { regex: /\balways\s+(show|display|render|update|visible)/i },
  { regex: /\bnever\s+(show|display|render|hide|visible)/i },
];

const DOUBLE_NEGATION_PATTERNS = [
  { regex: /don't\s+(allow|permit)\s+(bypass|skip|evade)/i },
  { regex: /never\s+(skip|bypass|evade|ignore)\s+(auth|security|validation)/i },
  { regex: /prevent\s+(bypass|skip|evasion)/i },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    // Unicode normalization for homoglyphs
    .normalize('NFKC')
    // Common homoglyph substitutions
    .replace(/[Ββ]/g, 'b')  // Greek Beta
    .replace(/[Ρρ]/g, 'p')  // Greek Rho
    .replace(/[Ττ]/g, 't')  // Greek Tau
    .replace(/[Ηη]/g, 'h')  // Greek Eta
    .replace(/[Νν]/g, 'n')  // Greek Nu
    .replace(/[Κκ]/g, 'k')  // Greek Kappa
    .replace(/[уУ]/g, 'y')  // Cyrillic У
    .replace(/[іІ]/g, 'i')  // Cyrillic І
    .replace(/[еЕ]/g, 'e')  // Cyrillic Е
    .replace(/[аА]/g, 'a')  // Cyrillic А
    .replace(/[оО]/g, 'o')  // Cyrillic О
    .replace(/[сС]/g, 'c')  // Cyrillic С
    ;
}

function containsAny(text, terms) {
  const normalized = normalize(text);
  for (const term of terms) {
    if (normalized.includes(term.toLowerCase())) {
      return term;
    }
  }
  return null;
}

function matchesPattern(text, patterns) {
  for (const { regex, type } of patterns) {
    const match = text.match(regex);
    if (match) {
      return { match: match[0], type };
    }
  }
  return null;
}

function isExcluded(text) {
  for (const { regex } of EXCLUSION_PATTERNS) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

function isDoubleNegation(text) {
  for (const { regex } of DOUBLE_NEGATION_PATTERNS) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

function classifyAction(action, text) {
  const normalized = normalize(text);

  if (isDoubleNegation(normalized)) {
    return { class: 'NEUTRAL', matched: 'double_negation' };
  }

  const forcePattern = matchesPattern(text, FORCE_PATTERNS);
  if (forcePattern) {
    return { class: 'FORCE', pattern: forcePattern.type };
  }

  const negationPattern = matchesPattern(text, NEGATION_PATTERNS);
  if (negationPattern) {
    return { class: 'NEGATE', pattern: negationPattern.type };
  }

  const allNegate = [...NEGATE_ACTIONS.primary, ...NEGATE_ACTIONS.extended];
  // Check BOTH action AND text for negate terms
  const negateMatchAction = action ? containsAny(action, allNegate) : null;
  const negateMatchText = containsAny(text, allNegate);
  if (negateMatchAction || negateMatchText) {
    return { class: 'NEGATE', matched: negateMatchAction || negateMatchText };
  }

  const allGrant = [...GRANT_ACTIONS.primary, ...GRANT_ACTIONS.extended];
  const grantMatchAction = action ? containsAny(action, allGrant) : null;
  const grantMatchText = containsAny(text, allGrant);
  if (grantMatchAction || grantMatchText) {
    return { class: 'GRANT', matched: grantMatchAction || grantMatchText };
  }

  const allForce = [...FORCE_ACTIONS.primary, ...FORCE_ACTIONS.extended];
  const forceMatchAction = action ? containsAny(action, allForce) : null;
  const forceMatchText = containsAny(text, allForce);
  if (forceMatchAction || forceMatchText) {
    return { class: 'FORCE', matched: forceMatchAction || forceMatchText };
  }

  const allInject = [...INJECT_ACTIONS.primary, ...INJECT_ACTIONS.extended];
  const injectMatchAction = action ? containsAny(action, allInject) : null;
  const injectMatchText = containsAny(text, allInject);
  if (injectMatchAction || injectMatchText) {
    return { class: 'INJECT', matched: injectMatchAction || injectMatchText };
  }

  return { class: 'NEUTRAL' };
}

function classifyTarget(target, text, actionClass) {
  const covertPattern = matchesPattern(text, COVERT_PATTERNS);
  if (covertPattern) {
    return { class: 'COVERT', pattern: covertPattern.type };
  }

  // Check BOTH target AND text for all target classes
  const covertMatchTarget = target ? containsAny(target, COVERT_TERMS) : null;
  const covertMatchText = containsAny(text, COVERT_TERMS);
  if (covertMatchTarget || covertMatchText) {
    return { class: 'COVERT', matched: covertMatchTarget || covertMatchText };
  }

  // For GRANT actions, check PRIVILEGE first (e.g., "Grant admin access")
  // For NEGATE actions, check SECURITY first (e.g., "Bypass auth for admin")
  if (actionClass === 'GRANT') {
    const privilegeMatchTarget = target ? containsAny(target, PRIVILEGE_TERMS) : null;
    const privilegeMatchText = containsAny(text, PRIVILEGE_TERMS);
    if (privilegeMatchTarget || privilegeMatchText) {
      return { class: 'PRIVILEGE', matched: privilegeMatchTarget || privilegeMatchText };
    }
  }

  const securityMatchTarget = target ? containsAny(target, SECURITY_TERMS) : null;
  const securityMatchText = containsAny(text, SECURITY_TERMS);
  if (securityMatchTarget || securityMatchText) {
    return { class: 'SECURITY', matched: securityMatchTarget || securityMatchText };
  }

  // Check PRIVILEGE for non-GRANT actions too (fallback)
  const privilegeMatchTarget = target ? containsAny(target, PRIVILEGE_TERMS) : null;
  const privilegeMatchText = containsAny(text, PRIVILEGE_TERMS);
  if (privilegeMatchTarget || privilegeMatchText) {
    return { class: 'PRIVILEGE', matched: privilegeMatchTarget || privilegeMatchText };
  }

  const controlMatchTarget = target ? containsAny(target, CONTROL_TERMS) : null;
  const controlMatchText = containsAny(text, CONTROL_TERMS);
  if (controlMatchTarget || controlMatchText) {
    return { class: 'CONTROL', matched: controlMatchTarget || controlMatchText };
  }

  return { class: 'NEUTRAL' };
}

// ============================================
// AXIOM MATCHING
// ============================================

const AXIOMS = [
  { code: 'HIA-001', name: 'Security Negation', severity: 'CRITICAL', actionClass: 'NEGATE', targetClasses: ['SECURITY'] },
  { code: 'HIA-002', name: 'Privilege Escalation', severity: 'CRITICAL', actionClass: 'GRANT', targetClasses: ['PRIVILEGE'] },
  { code: 'HIA-003', name: 'Control Negation', severity: 'HIGH', actionClass: 'NEGATE', targetClasses: ['CONTROL'] },
  { code: 'HIA-004', name: 'Forced Success', severity: 'HIGH', actionClass: 'FORCE', targetClasses: ['SECURITY', 'CONTROL'] },
  { code: 'HIA-005', name: 'Covert Access Creation', severity: 'CRITICAL', actionClass: 'INJECT', targetClasses: ['COVERT'] },
];

function matchAxiom(actionClass, targetClass) {
  for (const axiom of AXIOMS) {
    if (axiom.actionClass === actionClass && axiom.targetClasses.includes(targetClass)) {
      return axiom;
    }
  }
  return null;
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

function detectHostility(intent) {
  const text = intent.requirement || '';

  if (isExcluded(text)) {
    return { hostile: false, actionClass: 'NEUTRAL', targetClass: 'NEUTRAL', reason: 'excluded' };
  }

  const actionResult = classifyAction(intent.effect?.action, text);
  // Pass actionClass to target classification for context-aware prioritization
  const targetResult = classifyTarget(intent.effect?.target, text, actionResult.class);

  const axiom = matchAxiom(actionResult.class, targetResult.class);

  if (axiom) {
    return {
      hostile: true,
      axiom: axiom.code,
      axiomName: axiom.name,
      severity: axiom.severity,
      actionClass: actionResult.class,
      targetClass: targetResult.class,
      matchedAction: actionResult.matched || actionResult.pattern,
      matchedTarget: targetResult.matched || targetResult.pattern,
    };
  }

  return {
    hostile: false,
    actionClass: actionResult.class,
    targetClass: targetResult.class,
  };
}

// ============================================
// TEST RUNNER
// ============================================

function runTests() {
  const corpusPath = path.join(__dirname, '..', 'hostile-intent-red-team', 'HIRT-1_CORPUS.json');
  const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       HIRT-1 REPLAY WITH HIA-1                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Detection System: Hostile Intent Axioms (HIA-1)                             ║`);
  console.log(`║  Total Intents: ${corpus.summary.totalIntents.toString().padEnd(61)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    passed: [],
    failed: [],
    byAxiom: {},
    falseAdmissions: [],
    falseRejections: [],
    previouslyMissed: [],
  };

  for (const axiom of AXIOMS) {
    results.byAxiom[axiom.code] = { total: 0, caught: 0 };
  }

  for (const hostile of corpus.hostileIntents) {
    const { id, category, intent, expectedRejection, attackVector } = hostile;

    const hiaResult = detectHostility(intent);

    let testResult = 'PASS';
    let notes = '';

    // HIA detects SEMANTIC HOSTILITY regardless of category
    // If expected is REJECT_HOSTILE or SHOULD_REJECT, HIA should catch it
    // Non-hostile rejections (PROV, STRUCT, SPEC, PHANTOM) are handled by other IAL-0 checks
    const shouldBeHostile = expectedRejection === 'REJECT_HOSTILE' || expectedRejection === 'SHOULD_REJECT';

    if (shouldBeHostile) {
      if (hiaResult.hostile) {
        testResult = 'PASS';
        notes = `✓ Detected by ${hiaResult.axiom}: ${hiaResult.axiomName}`;
        results.byAxiom[hiaResult.axiom].total++;
        results.byAxiom[hiaResult.axiom].caught++;

        // Check if this was previously missed by IAL-0
        if (expectedRejection === 'SHOULD_REJECT') {
          results.previouslyMissed.push({ id, axiom: hiaResult.axiom, attackVector });
        }
      } else {
        testResult = 'FALSE_ADMISSION';
        results.falseAdmissions.push({ id, category, attackVector, expected: expectedRejection });
        notes = `⚠️ FALSE ADMISSION - not detected by HIA`;
      }
    } else {
      // Should be authenticated (legitimate)
      if (!hiaResult.hostile) {
        testResult = 'PASS';
        notes = '✓ Correctly NOT flagged as hostile';
      } else {
        testResult = 'FALSE_POSITIVE';
        results.falseRejections.push({ id, category, attackVector, axiom: hiaResult.axiom });
        notes = `⚠️ FALSE POSITIVE - incorrectly flagged by ${hiaResult.axiom}`;
      }
    }

    if (testResult === 'PASS') {
      results.passed.push(hostile);
    } else {
      results.failed.push(hostile);
    }

    const status = testResult === 'PASS' ? '✓' : '✗';
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
  console.log('║                           HIA-1 REPLAY SUMMARY                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests: ${corpus.summary.totalIntents.toString().padEnd(63)}║`);
  console.log(`║  Passed: ${results.passed.length.toString().padEnd(68)}║`);
  console.log(`║  Failed: ${results.failed.length.toString().padEnd(68)}║`);
  console.log(`║  Pass Rate: ${((results.passed.length / corpus.summary.totalIntents) * 100).toFixed(1)}%`.padEnd(78) + '║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  By Axiom:                                                                   ║');
  for (const [code, stats] of Object.entries(results.byAxiom)) {
    const axiom = AXIOMS.find(a => a.code === code);
    const line = `║    ${code} (${axiom.name}): ${stats.caught} caught`.padEnd(78) + '║';
    console.log(line);
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // ============================================
  // PREVIOUSLY MISSED (Now Caught)
  // ============================================

  if (results.previouslyMissed.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ PREVIOUSLY MISSED (IAL-0) NOW CAUGHT (HIA-1)                              ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const pm of results.previouslyMissed) {
      console.log(`║  ${pm.id}: Caught by ${pm.axiom}`.padEnd(78) + '║');
      console.log(`║    → ${pm.attackVector.substring(0, 68)}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  // ============================================
  // FALSE ADMISSIONS
  // ============================================

  if (results.falseAdmissions.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  CRITICAL: FALSE ADMISSIONS                                              ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const fa of results.falseAdmissions) {
      console.log(`║  ${fa.id}: ${fa.attackVector.substring(0, 60)}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  // ============================================
  // FALSE POSITIVES
  // ============================================

  if (results.falseRejections.length > 0) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  △ FALSE POSITIVES                                                           ║');
    console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
    for (const fp of results.falseRejections) {
      console.log(`║  ${fp.id}: Incorrectly flagged by ${fp.axiom}`.padEnd(78) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  // ============================================
  // FINAL VERDICT
  // ============================================

  console.log('');
  if (results.falseAdmissions.length === 0 && results.falseRejections.length === 0) {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║   ✅ HIA-1 REPLAY: PASSED                                                    ║');
    console.log('║                                                                              ║');
    console.log('║   Zero false admissions.                                                     ║');
    console.log('║   Zero false positives.                                                      ║');
    console.log('║   All hostile intents detected by semantic axioms.                           ║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else if (results.falseAdmissions.length === 0) {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║   ⚠️  HIA-1 REPLAY: PARTIAL PASS                                             ║');
    console.log('║                                                                              ║');
    console.log('║   Zero false admissions (all hostile caught).                                ║');
    console.log(`║   ${results.falseRejections.length} false positive(s) (legitimate flagged as hostile).`.padEnd(78) + '║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                              ║');
    console.log('║   ❌ HIA-1 REPLAY: FAILED                                                    ║');
    console.log('║                                                                              ║');
    console.log(`║   ${results.falseAdmissions.length} false admission(s) detected!`.padEnd(78) + '║');
    console.log('║   Hostile intents bypassed HIA detection.                                    ║');
    console.log('║                                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  const results = runTests();

  // Write results
  const outputPath = path.join(__dirname, 'HIA-1_EXECUTION_RESULTS.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${outputPath}`);
}

module.exports = { runTests, detectHostility };

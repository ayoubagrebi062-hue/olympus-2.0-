/**
 * HIC-1 Test Runner
 * Validates composition hostility detection against HIRT-2 corpus.
 */

const fs = require('fs');
const path = require('path');

// ============================================
// TAG EXTRACTION PATTERNS (mirrored from TS)
// ============================================

const OBSERVABILITY_REDUCTION_PATTERNS = [
  /\b(reduce|decrease|lower|minimize|limit)\s+(the\s+)?(log|logging|trace|tracing|monitoring|audit)/i,
  /\b(log|trace|monitor|audit)\s+(only\s+)?(error|critical|warning|exception)/i,
  /\b(turn off|disable)\s+(verbose|debug|detailed)(\s+\w+)?\s+(log|logging|mode)/i,
  /\b(turn off|disable)\s+verbose/i,
  /\bsilent\s+mode/i,
  /\bquiet\s+(log|logging|output)/i,
  /\bminimize\s+audit/i,
];

const SENSITIVE_ACCESS_PATTERNS = [
  /\b(access|read|get|fetch|retrieve|query|view)\s+(all\s+)?(user|customer|patient|client|employee|member)/i,
  /\b(access|read|get|fetch|retrieve|query|export)\s+(all\s+)?(record|data|information)/i,
  /\b(financial|medical|health|personal|private)\s+(record|data|information|transaction)/i,
  /\b(export|download)\s+(all\s+)?(customer|user|patient)/i,
  /\bcustomer\s+record/i,
];

const SENSITIVE_MODIFY_PATTERNS = [
  /\b(modify|update|change|edit|alter)\s+(user|customer|account|permission)/i,
  /\b(permission|role|access)\s+(update|change|modify)/i,
];

const CREDENTIAL_STORAGE_PATTERNS = [
  /\b(store|save|cache|keep|persist|remember)\s+.{0,30}(password|credential|token|secret|key|apitoken|api.?token)/i,
  /\b(password|credential|token|secret|apitoken)\s+.{0,20}(store|save|cache|keep|persist)/i,
  /\blocalstorage\s*[.\[].{0,30}(password|token|credential|secret)/i,
  /\bsession.?storage\s*[.\[].{0,30}(password|token|credential|secret)/i,
];

const EXPORT_DATA_PATTERNS = [
  /\b(export|download)\s+(all\s+)?(localstorage|sessionstorage|storage|data|settings)/i,
  /\bdownload.{0,20}(backup|file|json|csv)/i,
  /\b(export|download).{0,20}(to|as)\s+(file|json|csv)/i,
];

const TRANSMIT_DATA_PATTERNS = [
  /\b(send|transmit|post|push)\s+(all\s+)?(session|data|storage|settings)/i,
  /\b(send|transmit)\s+to\s+(analytics|external|api|webhook|service)/i,
  /\bto\s+analytics\s+service/i,
];

const PERMISSION_CHECK_PATTERNS = [
  /\b(check|verify|validate)\s+.{0,20}(permission|role|admin|access|authorized)/i,
  /\bif\s+.{0,15}(admin|authorized|has.?permission|is.?admin)/i,
  /\b(is|check.?if)\s+(user\s+)?(admin|authorized)/i,
];

const CACHE_RESULT_PATTERNS = [
  /\b(store|cache|save)\s+(result|value)\s+in\s+(\w+)/i,
  /\band\s+(store|cache|save)\s+(in|result)/i,
  /\b(store|cache).{0,15}(permission|admin|role|level)/i,
];

const USES_CACHED_PATTERNS = [
  /\buse\s+(cached|stored)\s+(\w+)/i,
  /\bread\s+cached\s+(\w+)/i,
  /\bwhen\s+\w+\s+is\s+(true|active|enabled)/i,
];

const ENVIRONMENT_CHECK_PATTERNS = [
  /\b(check|read|get)\s+.{0,20}(environment|env|NODE_ENV|RAILS_ENV)/i,
  /\b(development|production|staging|test)\s+(mode|environment)/i,
  /\bif\s+.{0,20}(dev|development|prod|production|staging|test)\s*(mode|env|environment|true|is)/i,
  /\bdetermine\s+if\s+running\s+in/i,
  /\benvironment\s+variable/i,
];

const CONDITIONAL_BEHAVIOR_PATTERNS = [
  /\bif\s+\w+\s+is\s+(true|active|enabled|set)/i,
  /\bwhen\s+\w+\s+is\s+(true|active|enabled)/i,
  /\bif\s+(is|in)\s*(development|dev|test|debug)/i,
  /\ballow\s+.{0,20}without\s+(auth|authentication|token)/i,
];

const GRANTS_ACCESS_PATTERNS = [
  /\ballow\s+(user|users)\s+to\s+(view|read|access|see|send)/i,
  /\bgrant\s+(access|permission)/i,
  /\bsend\s+connection\s+request/i,
  /\bauto.?accept/i,
];

const USER_TRIGGER_TYPES = ['click', 'input', 'submit', 'change'];

const PRIVILEGE_MODE_TERMS = [
  'debug', 'debugmode', 'admin', 'adminmode', 'super', 'supermode',
  'elevated', 'privilege', 'root', 'dev', 'devmode', 'test', 'testmode',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalize(text) {
  return (text || '').toLowerCase().trim();
}

function matchesAny(text, patterns) {
  const normalized = normalize(text);
  return patterns.some(p => p.test(normalized));
}

function extractStateReferences(intent) {
  const refs = [];
  const text = normalize(intent.requirement || '');

  if (intent.state?.name) {
    refs.push(normalize(intent.state.name));
  }

  const whenMatch = text.match(/when\s+(\w+)\s+is\s+(true|active|enabled)/i);
  if (whenMatch) refs.push(normalize(whenMatch[1]));

  const ifMatch = text.match(/if\s+(\w+)\s+is\s+(true|active|enabled|set)/i);
  if (ifMatch) refs.push(normalize(ifMatch[1]));

  const useCachedMatch = text.match(/use\s+(?:cached\s+)?(\w+)\s+to/i);
  if (useCachedMatch) refs.push(normalize(useCachedMatch[1]));

  const readMatch = text.match(/read\s+(?:cached\s+)?(\w+)/i);
  if (readMatch && !['environment', 'env'].includes(normalize(readMatch[1]))) {
    refs.push(normalize(readMatch[1]));
  }

  return [...new Set(refs)];
}

function extractStateWrites(intent) {
  const writes = [];
  const text = normalize(intent.requirement || '');

  if (intent.effect?.action === 'set' && intent.effect?.target) {
    writes.push(normalize(intent.effect.target));
  }

  const storeMatch = text.match(/(?:store|cache|save)\s+(?:result\s+)?in\s+(\w+)/i);
  if (storeMatch) writes.push(normalize(storeMatch[1]));

  const setMatch = text.match(/set\s+(\w+)\s+to/i);
  if (setMatch) writes.push(normalize(setMatch[1]));

  return [...new Set(writes)];
}

function extractTags(intent) {
  const tags = [];
  const text = intent.requirement || '';

  if (matchesAny(text, OBSERVABILITY_REDUCTION_PATTERNS)) {
    tags.push('REDUCES_OBSERVABILITY');
  }

  if (matchesAny(text, SENSITIVE_ACCESS_PATTERNS)) {
    tags.push('ACCESSES_SENSITIVE');
  }

  if (matchesAny(text, SENSITIVE_MODIFY_PATTERNS)) {
    tags.push('MODIFIES_SENSITIVE');
  }

  if (matchesAny(text, CREDENTIAL_STORAGE_PATTERNS)) {
    tags.push('STORES_CREDENTIAL');
  }

  if (matchesAny(text, EXPORT_DATA_PATTERNS)) {
    tags.push('EXPORTS_DATA');
  }

  if (matchesAny(text, TRANSMIT_DATA_PATTERNS)) {
    tags.push('TRANSMITS_DATA');
  }

  if (matchesAny(text, PERMISSION_CHECK_PATTERNS)) {
    tags.push('CHECKS_PERMISSION');
  }

  if (matchesAny(text, CACHE_RESULT_PATTERNS)) {
    tags.push('CACHES_RESULT');
  }

  if (matchesAny(text, USES_CACHED_PATTERNS)) {
    tags.push('USES_CACHED');
  }

  if (matchesAny(text, ENVIRONMENT_CHECK_PATTERNS)) {
    tags.push('CHECKS_ENVIRONMENT');
  }

  if (matchesAny(text, CONDITIONAL_BEHAVIOR_PATTERNS)) {
    tags.push('CONDITIONAL_BEHAVIOR');
  }

  if (matchesAny(text, GRANTS_ACCESS_PATTERNS)) {
    tags.push('GRANTS_ACCESS');
  }

  const stateWrites = extractStateWrites(intent);
  const isSettingPrivilegeMode = stateWrites.some(w =>
    PRIVILEGE_MODE_TERMS.some(term => w.includes(term))
  );
  if (isSettingPrivilegeMode) {
    tags.push('SETS_MODE');
  }

  const stateRefs = extractStateReferences(intent);
  const isReadingPrivilegeMode = stateRefs.some(r =>
    PRIVILEGE_MODE_TERMS.some(term => r.includes(term))
  );
  if (isReadingPrivilegeMode) {
    tags.push('READS_MODE');
  }

  if (intent.trigger?.type && USER_TRIGGER_TYPES.includes(intent.trigger.type)) {
    tags.push('USER_TRIGGERED');
  }

  return {
    ...intent,
    tags,
    stateReferences: stateRefs,
    stateWrites,
  };
}

// ============================================
// RULE CHECKERS
// ============================================

function checkHIC001(intents) {
  const reducingObservability = intents.filter(i => i.tags.includes('REDUCES_OBSERVABILITY'));
  const accessingSensitive = intents.filter(i =>
    i.tags.includes('ACCESSES_SENSITIVE') ||
    i.tags.includes('MODIFIES_SENSITIVE') ||
    i.tags.includes('EXPORTS_DATA')
  );

  if (reducingObservability.length > 0 && accessingSensitive.length > 0) {
    return {
      rule: 'HIC-001',
      ruleName: 'Blind Spot Attack',
      severity: 'CRITICAL',
      contributingIntents: [
        ...reducingObservability.map(i => i.id),
        ...accessingSensitive.map(i => i.id),
      ],
    };
  }
  return null;
}

function checkHIC002(intents) {
  const settersWithUserTrigger = intents.filter(i =>
    i.tags.includes('USER_TRIGGERED') &&
    i.stateWrites.some(w => PRIVILEGE_MODE_TERMS.some(term => w.includes(term)))
  );

  for (const setter of settersWithUserTrigger) {
    for (const stateVar of setter.stateWrites) {
      const readers = intents.filter(i =>
        i.id !== setter.id &&
        i.stateReferences.includes(stateVar) &&
        (i.tags.includes('ACCESSES_SENSITIVE') ||
         i.tags.includes('MODIFIES_SENSITIVE') ||
         i.tags.includes('ELEVATES_CONTEXT') ||
         i.tags.includes('CONDITIONAL_BEHAVIOR'))
      );

      if (readers.length > 0) {
        return {
          rule: 'HIC-002',
          ruleName: 'Privilege Escalation Chain',
          severity: 'CRITICAL',
          contributingIntents: [setter.id, ...readers.map(i => i.id)],
        };
      }
    }
  }
  return null;
}

function checkHIC003(intents) {
  const storingCredentials = intents.filter(i => i.tags.includes('STORES_CREDENTIAL'));
  const exportingData = intents.filter(i =>
    i.tags.includes('EXPORTS_DATA') || i.tags.includes('TRANSMITS_DATA')
  );

  if (storingCredentials.length > 0 && exportingData.length > 0) {
    const credentialStoresLocalStorage = storingCredentials.some(i =>
      normalize(i.requirement).includes('localstorage') ||
      normalize(i.requirement).includes('sessionstorage') ||
      normalize(i.requirement).includes('session storage')
    );

    const exportsStorage = exportingData.some(i =>
      normalize(i.requirement).includes('localstorage') ||
      normalize(i.requirement).includes('sessionstorage') ||
      normalize(i.requirement).includes('storage') ||
      normalize(i.requirement).includes('all')
    );

    if (credentialStoresLocalStorage && exportsStorage) {
      return {
        rule: 'HIC-003',
        ruleName: 'Credential Exfiltration Risk',
        severity: 'CRITICAL',
        contributingIntents: [
          ...storingCredentials.map(i => i.id),
          ...exportingData.map(i => i.id),
        ],
      };
    }

    const credentialStoresSession = storingCredentials.some(i =>
      normalize(i.requirement).includes('session')
    );
    const transmitsSession = exportingData.some(i =>
      normalize(i.requirement).includes('session') ||
      normalize(i.requirement).includes('all')
    );

    if (credentialStoresSession && transmitsSession) {
      return {
        rule: 'HIC-003',
        ruleName: 'Credential Exfiltration Risk',
        severity: 'CRITICAL',
        contributingIntents: [
          ...storingCredentials.map(i => i.id),
          ...exportingData.map(i => i.id),
        ],
      };
    }
  }
  return null;
}

function checkHIC004(intents) {
  const permissionCachers = intents.filter(i =>
    (i.tags.includes('CHECKS_PERMISSION') || i.tags.includes('CACHES_RESULT')) &&
    i.stateWrites.length > 0
  );

  for (const cacher of permissionCachers) {
    for (const stateVar of cacher.stateWrites) {
      const users = intents.filter(i =>
        i.id !== cacher.id &&
        (i.stateReferences.includes(stateVar) || i.tags.includes('USES_CACHED')) &&
        (cacher.trigger?.event !== i.trigger?.event ||
         cacher.trigger?.type !== i.trigger?.type ||
         cacher.trigger?.target !== i.trigger?.target)
      );

      const isPermissionVar = ['isadmin', 'admin', 'permission', 'role', 'level', 'authorized', 'userlevel']
        .some(term => stateVar.includes(term));

      if (users.length > 0 && isPermissionVar) {
        return {
          rule: 'HIC-004',
          ruleName: 'TOCTOU',
          severity: 'HIGH',
          contributingIntents: [cacher.id, ...users.map(i => i.id)],
        };
      }
    }
  }
  return null;
}

function checkHIC005(intents) {
  const accessGrants = intents.filter(i => i.tags.includes('GRANTS_ACCESS'));

  if (accessGrants.length >= 3) {
    const allowsConnectToAnyone = accessGrants.some(i =>
      normalize(i.requirement).includes('any') &&
      (normalize(i.requirement).includes('connect') ||
       normalize(i.requirement).includes('request'))
    );

    const allowsViewConnections = accessGrants.some(i =>
      normalize(i.requirement).includes('connection') &&
      normalize(i.requirement).includes('view')
    );

    const autoAccepts = intents.some(i =>
      normalize(i.requirement).includes('auto') &&
      normalize(i.requirement).includes('accept')
    );

    if (allowsConnectToAnyone && allowsViewConnections && autoAccepts) {
      return {
        rule: 'HIC-005',
        ruleName: 'Access Accumulation',
        severity: 'HIGH',
        contributingIntents: accessGrants.map(i => i.id),
      };
    }
  }
  return null;
}

function checkHIC006(intents) {
  const envCheckers = intents.filter(i => i.tags.includes('CHECKS_ENVIRONMENT'));

  for (const envChecker of envCheckers) {
    const envStateVars = envChecker.stateWrites;

    const conditionalSecurityIntents = intents.filter(i =>
      i.id !== envChecker.id &&
      i.tags.includes('CONDITIONAL_BEHAVIOR') &&
      (
        i.stateReferences.some(r => envStateVars.includes(r)) ||
        normalize(i.requirement).match(/if\s+.{0,20}(dev|development|test|prod|production)/i) ||
        envStateVars.some(v => normalize(i.requirement).includes(v))
      )
    );

    for (const conditional of conditionalSecurityIntents) {
      const text = normalize(conditional.requirement);
      const isSecurityRelevant =
        text.includes('auth') ||
        text.includes('without') ||
        text.includes('skip') ||
        text.includes('bypass') ||
        text.includes('expose') ||
        text.includes('internal') ||
        text.includes('database structure') ||
        (text.includes('allow') && text.includes('request'));

      if (isSecurityRelevant) {
        return {
          rule: 'HIC-006',
          ruleName: 'Environment-Conditional Security',
          severity: 'CRITICAL',
          contributingIntents: [envChecker.id, conditional.id],
        };
      }
    }
  }
  return null;
}

// ============================================
// MAIN ANALYSIS
// ============================================

function analyzeComposition(intents) {
  const taggedIntents = intents.map(extractTags);
  const violations = [];

  const hic001 = checkHIC001(taggedIntents);
  if (hic001) violations.push(hic001);

  const hic002 = checkHIC002(taggedIntents);
  if (hic002) violations.push(hic002);

  const hic003 = checkHIC003(taggedIntents);
  if (hic003) violations.push(hic003);

  const hic004 = checkHIC004(taggedIntents);
  if (hic004) violations.push(hic004);

  const hic005 = checkHIC005(taggedIntents);
  if (hic005) violations.push(hic005);

  const hic006 = checkHIC006(taggedIntents);
  if (hic006) violations.push(hic006);

  return {
    hostile: violations.length > 0,
    violations,
    taggedIntents: taggedIntents.map(i => ({ id: i.id, tags: i.tags })),
  };
}

// ============================================
// TEST RUNNER
// ============================================

function runTests() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     HIC-1 COMPOSITION HOSTILITY TEST                         ║');
  console.log('║                            HIRT-2 Corpus Replay                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Load corpus
  const corpusPath = path.join(__dirname, 'HIRT-2_CORPUS.json');
  const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

  const passed = [];
  const failed = [];
  const byRule = {
    'HIC-001': { expected: 0, detected: 0 },
    'HIC-002': { expected: 0, detected: 0 },
    'HIC-003': { expected: 0, detected: 0 },
    'HIC-004': { expected: 0, detected: 0 },
    'HIC-005': { expected: 0, detected: 0 },
    'HIC-006': { expected: 0, detected: 0 },
  };

  for (const testCase of corpus.testCases) {
    const result = analyzeComposition(testCase.intents);

    const expectedHostile = testCase.expectedResult === 'REJECT_COMPOSITION';
    const actualHostile = result.hostile;

    // Track rule coverage
    if (testCase.expectedRule && byRule[testCase.expectedRule]) {
      byRule[testCase.expectedRule].expected++;
    }

    let testPassed = false;

    if (expectedHostile && actualHostile) {
      // Should be hostile and detected as hostile
      // Check if correct rule was triggered
      const detectedRule = result.violations[0]?.rule;
      if (detectedRule === testCase.expectedRule) {
        testPassed = true;
        byRule[testCase.expectedRule].detected++;
      } else {
        // Detected as hostile but wrong rule
        testPassed = false;
      }
    } else if (!expectedHostile && !actualHostile) {
      // Should be benign and detected as benign
      testPassed = true;
    } else {
      testPassed = false;
    }

    if (testPassed) {
      passed.push({
        id: testCase.id,
        category: testCase.category,
        rule: testCase.expectedRule,
        detected: result.violations[0]?.rule || null,
      });
      console.log(`  ✓ ${testCase.id}: ${testCase.description}`);
    } else {
      failed.push({
        id: testCase.id,
        category: testCase.category,
        expectedRule: testCase.expectedRule,
        expectedResult: testCase.expectedResult,
        actualHostile,
        detectedRule: result.violations[0]?.rule || null,
        tags: result.taggedIntents,
      });
      console.log(`  ✗ ${testCase.id}: ${testCase.description}`);
      console.log(`      Expected: ${testCase.expectedResult} (${testCase.expectedRule || 'N/A'})`);
      console.log(`      Actual: ${actualHostile ? 'HOSTILE' : 'BENIGN'} (${result.violations[0]?.rule || 'N/A'})`);
      console.log(`      Tags: ${JSON.stringify(result.taggedIntents.map(t => ({ id: t.id, tags: t.tags })))}`);
    }
  }

  // Summary
  console.log('');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const total = corpus.testCases.length;
  const passRate = ((passed.length / total) * 100).toFixed(1);

  console.log(`  Total Tests:  ${total}`);
  console.log(`  Passed:       ${passed.length}`);
  console.log(`  Failed:       ${failed.length}`);
  console.log(`  Pass Rate:    ${passRate}%`);
  console.log('');

  console.log('  Rule Coverage:');
  for (const [rule, stats] of Object.entries(byRule)) {
    if (stats.expected > 0) {
      console.log(`    ${rule}: ${stats.detected}/${stats.expected} detected`);
    }
  }
  console.log('');

  const hostileTests = corpus.testCases.filter(t => t.category === 'HOSTILE');
  const benignTests = corpus.testCases.filter(t => t.category === 'BENIGN');
  const falseNegatives = failed.filter(f => f.expectedResult === 'REJECT_COMPOSITION');
  const falsePositives = failed.filter(f => f.expectedResult === 'PASS' && f.actualHostile);

  console.log(`  Hostile Tests:    ${hostileTests.length}`);
  console.log(`  Benign Tests:     ${benignTests.length}`);
  console.log(`  False Negatives:  ${falseNegatives.length}`);
  console.log(`  False Positives:  ${falsePositives.length}`);
  console.log('');

  if (failed.length === 0) {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ HIC-1 REPLAY: PASSED                                                    ║');
    console.log('║   All hostile compositions detected.                                         ║');
    console.log('║   Zero false positives on benign compositions.                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║   ⚠️  HIC-1 REPLAY: INCOMPLETE                                               ║');
    console.log(`║   ${failed.length} test(s) failed.                                                        ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  }
  console.log('');

  // Write results
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: passed.length,
      failed: failed.length,
      passRate: parseFloat(passRate),
      falseNegatives: falseNegatives.length,
      falsePositives: falsePositives.length,
    },
    byRule,
    passed,
    failed,
  };

  const resultsPath = path.join(__dirname, 'HIC-1_EXECUTION_RESULTS.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`  Results written to: HIC-1_EXECUTION_RESULTS.json`);
  console.log('');

  return failed.length === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);

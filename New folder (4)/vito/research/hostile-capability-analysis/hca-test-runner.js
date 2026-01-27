/**
 * HCA-1 Test Runner
 *
 * Executes the HCA-1 test corpus against the capability analyzer.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CAPABILITY DEFINITIONS (Mirrored from TypeScript)
// ============================================================================

const CAPABILITIES = [
  {
    id: 'CAP-001',
    name: 'Unauthorized Access',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(allow|grant|enable|provide)\s+(access|entry)\s+(without|regardless of|bypassing)\s+(auth|login|token|session|credentials?)/i, weight: 1.0 },
      { regex: /\b(any|all|every)\s+(user|person|one)\s+(can|may|is able to)\s+(access|read|write|view|modify)/i, weight: 0.9 },
      { regex: /\bno\s+(auth|authentication|login|credential|session)\s+(required|needed|necessary)/i, weight: 1.0 },
      { regex: /\b(works?|functions?|operates?)\s+(without|regardless of)\s+(auth|authentication|login)/i, weight: 0.9 },
      { regex: /\b(access|read|write|view).{0,30}\s+(regardless|irrespective)\s+of\s+.{0,20}(permission|role|privilege)/i, weight: 1.0 },
      { regex: /\b(public|open|unrestricted)\s+(access|endpoint|api)\s+(to|for)\s+(all|any|everyone)/i, weight: 0.8 },
      { regex: /\b(enable|allow)\s+access\s+.{0,30}\s+without\s+(checking|requiring)\s+(credentials?|auth|login)/i, weight: 1.0 },
      { regex: /\bwithout\s+(requiring|needing)\s+(login|authentication|auth)/i, weight: 1.0 },
      { regex: /\ballow\s+any\s+user\s+to\s+access/i, weight: 0.9 },
    ],
    exclusions: [
      { regex: /\bpublic\s+(content|page|resource|asset|static)/i, reason: 'Legitimately public content' },
      { regex: /\b(marketing|landing|home)\s+page/i, reason: 'Public-facing pages' },
    ],
  },
  {
    id: 'CAP-002',
    name: 'Privilege Acquisition',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(user|anyone|person)\s+(can|may)\s+(grant|assign|give).{0,20}\s+(admin|administrator|root|superuser|elevated)\s+(to|for)\s+(self|themselves|anyone)/i, weight: 1.0 },
      { regex: /\bperform\s+(any|all|every)\s+(operation|action|task)/i, weight: 0.9 },
      { regex: /\b(unrestricted|unlimited|full|complete)\s+(access|permissions?|privileges?|control)/i, weight: 0.9 },
      { regex: /\b(act|operate|function)\s+(as|like)\s+(admin|administrator|root|superuser)/i, weight: 1.0 },
      { regex: /\ball\s+(permissions?|privileges?|rights?)\s+(granted|given|assigned|enabled)/i, weight: 0.9 },
      { regex: /\bno\s+(permission|role|access)\s+(restrictions?|limits?|constraints?|checks?)/i, weight: 1.0 },
      { regex: /\b(become|change to|switch to|elevate to)\s+(admin|administrator|root|superuser)/i, weight: 1.0 },
      { regex: /\b(elevate|escalate)\s+to\s+(administrator|admin)/i, weight: 1.0 },
    ],
    exclusions: [
      { regex: /\b(if|when)\s+(user\s+)?(is|has)\s+(admin|administrator)/i, reason: 'Conditional on existing admin status' },
      { regex: /\badmin\s+(user|panel|dashboard|interface)/i, reason: 'Admin UI reference' },
    ],
  },
  {
    id: 'CAP-003',
    name: 'Data Exfiltration',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(send|transmit|post|push|forward)\s+(all|entire|complete|full).{0,30}\s+(to|at)\s+(external|third.?party|webhook|endpoint|remote|outside)/i, weight: 1.0 },
      { regex: /\b(export|download|dump|extract|backup)\s+(all|entire|complete|full|whole)\s+(database|records?|data|table|collection)/i, weight: 0.9 },
      { regex: /\b(copy|clone|replicate|duplicate)\s+(all|entire|everything|complete).{0,20}\s+(to|into)\s+(external|remote|outside)/i, weight: 1.0 },
      { regex: /\bunlimited\s+(download|export|extraction|access)\s+(to|of|for)\s+(data|records?|information)/i, weight: 0.8 },
      { regex: /\b(stream|pipe|relay).{0,20}\s+(to|into)\s+(external|third.?party|remote)/i, weight: 0.8 },
      { regex: /\b(send|transmit)\s+(all|entire).{0,30}\s+(to|at)\s+(third.?party|external)/i, weight: 1.0 },
      { regex: /\bexport\s+.{0,20}\s+(to|at)\s+(external|webhook)/i, weight: 0.9 },
    ],
    exclusions: [
      { regex: /\b(export|download)\s+(my|own|user'?s own|current user)/i, reason: 'Own data export' },
      { regex: /\bbackup\s+to\s+(local|same|internal|our)/i, reason: 'Internal backup' },
      { regex: /\b(analytics|telemetry|metrics)\s+(to|for)\s+(our|internal)/i, reason: 'Internal analytics' },
    ],
  },
  {
    id: 'CAP-004',
    name: 'Persistent Access',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(session|token|access|credential)\s+(never|doesn't|does not|won't)\s+(expire|timeout|end|terminate)/i, weight: 1.0 },
      { regex: /\bpermanent\s+(access|session|token|login|authentication)/i, weight: 1.0 },
      { regex: /\b(create|add|install|establish).{0,20}(backdoor|back.?door|alternate|hidden|secret)\s+(access|entry|login|path)/i, weight: 1.0 },
      { regex: /\b(access|session|token)\s+(survives?|persists?|remains?)\s+(after|through|despite)\s+(logout|expiry|revocation|password\s+change)/i, weight: 1.0 },
      { regex: /\b(store|save|hide|cache).{0,20}(secret|hidden)\s+(key|credential|token|password)/i, weight: 0.9 },
      { regex: /\b(infinite|forever|indefinite)\s+(session|token|access)/i, weight: 1.0 },
      { regex: /\b(access|session)\s+persists?\s+after/i, weight: 0.9 },
      { regex: /\btoken\s+never\s+expires/i, weight: 1.0 },
      { regex: /\bprovide\s+permanent\s+access/i, weight: 1.0 },
      { regex: /\balternate\s+access\s+path/i, weight: 0.9 },
    ],
    exclusions: [
      { regex: /\bremember\s+me\s+(option|checkbox|feature)/i, reason: 'Standard remember me feature' },
      { regex: /\brefresh\s+token/i, reason: 'Standard token refresh' },
    ],
  },
  {
    id: 'CAP-005',
    name: 'Lateral Movement',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(access|read|view|modify|delete)\s+(other|another|any|different)\s+(user|person|account)'?s?\s+(data|information|records?|profile|account)/i, weight: 1.0 },
      { regex: /\b(act|operate|perform|execute)\s+(as|on behalf of|for)\s+(other|another|any|different)\s+(user|person|account)/i, weight: 1.0 },
      { regex: /\b(impersonate|masquerade|pretend)\s+(as)?\s*(any|other|another|different)\s+(user|person|account)/i, weight: 1.0 },
      { regex: /\bview\s+(all|any|every)\s+(user|person|account)'?s?\s+(data|profile|information)/i, weight: 0.9 },
      { regex: /\b(switch|change)\s+(to|into)\s+(any|other|another)\s+(user|account)/i, weight: 1.0 },
      { regex: /\b(access|view|read).{0,20}\s+(across|between|among)\s+(all\s+)?(users?|accounts?)/i, weight: 0.8 },
      { regex: /\baccess\s+data\s+across\s+all\s+user/i, weight: 0.9 },
      { regex: /\bperform\s+actions?\s+on\s+behalf\s+of\s+other/i, weight: 1.0 },
      { regex: /\bother\s+users?'?\s+(profile|data)/i, weight: 1.0 },
      { regex: /\bimpersonate\s+any\s+user/i, weight: 1.0 },
      { regex: /\bon\s+behalf\s+of\s+other\s+users?/i, weight: 1.0 },
    ],
    exclusions: [
      { regex: /\badmin\s+(can|may)\s+(view|access|manage)\s+(user|account)/i, reason: 'Admin user management' },
      { regex: /\bsupport\s+(staff|team|agent)\s+(can|may)/i, reason: 'Support access' },
      { regex: /\b(public|shared)\s+(profile|post|content)/i, reason: 'Public shared content' },
    ],
  },
  {
    id: 'CAP-006',
    name: 'Audit Blindness',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(operate|execute|perform|run)\s+(silently|quietly|invisibly|stealthily|undetected)/i, weight: 1.0 },
      { regex: /\bno\s+(log|logging|audit|tracking|trace|record)\s+(for|of|when)/i, weight: 1.0 },
      { regex: /\b(action|operation|activity)\s+(not|never|won't be)\s+(logged|recorded|tracked|audited)/i, weight: 1.0 },
      { regex: /\b(skip|disable|bypass|omit)\s+(logging|audit|tracking|recording)\s+(for|when|during)/i, weight: 1.0 },
      { regex: /\b(remove|delete|clear|purge)\s+(audit|log)\s+(entries|records?|trail)/i, weight: 1.0 },
      { regex: /\boff.?the.?record/i, weight: 0.9 },
      { regex: /\bsilently\s+without/i, weight: 1.0 },
      { regex: /\bno\s+audit\s+log\s+for/i, weight: 1.0 },
      { regex: /\bremove\s+audit\s+entries/i, weight: 1.0 },
      { regex: /\bexecute\s+.{0,20}\s+silently/i, weight: 1.0 },
    ],
    exclusions: [
      { regex: /\bquiet\s+(mode|output)\s+(for|during)\s+(test|debug|development)/i, reason: 'Test/debug quiet mode' },
      { regex: /\breduce\s+(log|logging)\s+(noise|verbosity|volume)/i, reason: 'Log noise reduction' },
    ],
  },
  {
    id: 'CAP-007',
    name: 'Environment Escape',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\bno\s+(rate|request|api)\s+(limit|limiting|cap|restriction)/i, weight: 1.0 },
      { regex: /\b(unlimited|infinite|unrestricted)\s+(requests?|calls?|api\s+calls?|access)/i, weight: 1.0 },
      { regex: /\b(bypass|escape|break out of|circumvent)\s+(sandbox|container|jail|isolation)/i, weight: 1.0 },
      { regex: /\b(ignore|remove|disable|bypass)\s+(quota|limit|cap|restriction|constraint)/i, weight: 1.0 },
      { regex: /\b(escape|break|circumvent)\s+(restriction|constraint|limitation)/i, weight: 0.9 },
      { regex: /\b(no|without)\s+(throttl|rate.?limit|quota)/i, weight: 1.0 },
    ],
    exclusions: [
      { regex: /\b(premium|paid|enterprise)\s+(tier|plan|subscription)\s+(has|gets|includes)\s+(higher|increased)\s+limit/i, reason: 'Legitimate tier limits' },
      { regex: /\binternal\s+(api|service)\s+(has|with)\s+(no|higher)\s+limit/i, reason: 'Internal service limits' },
    ],
  },
];

// ============================================================================
// ANALYZER FUNCTIONS
// ============================================================================

function isExcluded(text, capability) {
  for (const exclusion of capability.exclusions) {
    if (exclusion.regex.test(text)) {
      return { excluded: true, reason: exclusion.reason };
    }
  }
  return { excluded: false };
}

function analyzeCapabilities(text) {
  const matches = [];

  for (const capability of CAPABILITIES) {
    for (const pattern of capability.patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const exclusionCheck = isExcluded(text, capability);
        matches.push({
          capabilityId: capability.id,
          capabilityName: capability.name,
          severity: capability.severity,
          confidence: pattern.weight,
          matchedText: match[0],
          excluded: exclusionCheck.excluded,
          exclusionReason: exclusionCheck.reason,
        });
        break; // Only first pattern per capability
      }
    }
  }

  return matches;
}

function analyzeIntent(intent) {
  const text = intent.rawText || `${intent.action || ''} ${intent.target || ''} ${(intent.requirements || []).join(' ')}`;
  const capabilities = analyzeCapabilities(text);

  // Filter active (non-excluded) matches
  const activeMatches = capabilities.filter(c => !c.excluded);

  // Check for CRITICAL
  const criticalMatches = activeMatches.filter(c => c.severity === 'CRITICAL');
  if (criticalMatches.length > 0) {
    return {
      hostile: true,
      triggeredRules: criticalMatches.map(c => c.capabilityId),
      capabilities,
    };
  }

  // Check for any HIGH (stricter threshold for security)
  const highMatches = activeMatches.filter(c => c.severity === 'HIGH');
  if (highMatches.length > 0) {
    return {
      hostile: true,
      triggeredRules: highMatches.map(c => c.capabilityId),
      capabilities,
    };
  }

  return {
    hostile: false,
    triggeredRules: [],
    capabilities,
  };
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests() {
  const corpus = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'HCA-1_TEST_CORPUS.json'), 'utf-8')
  );

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       HCA-1 TEST EXECUTION                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    total: corpus.testCases.length,
    details: [],
    byCapability: {},
    ssc1S4Caught: false,
  };

  for (const testCase of corpus.testCases) {
    const analysis = analyzeIntent(testCase.intent);
    const expectedHostile = testCase.expectedResult === 'HOSTILE';
    const passed = analysis.hostile === expectedHostile;

    // Check if expected rule was triggered
    let ruleMatch = true;
    if (testCase.expectedRule && expectedHostile) {
      ruleMatch = analysis.triggeredRules.includes(testCase.expectedRule);
    }

    const fullPass = passed && ruleMatch;

    if (fullPass) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Check SSC-1 S4 case
    if (testCase.id === 'HCA-T001' && fullPass) {
      results.ssc1S4Caught = true;
    }

    // Track by capability
    if (testCase.expectedRule) {
      if (!results.byCapability[testCase.expectedRule]) {
        results.byCapability[testCase.expectedRule] = { passed: 0, failed: 0 };
      }
      if (fullPass) {
        results.byCapability[testCase.expectedRule].passed++;
      } else {
        results.byCapability[testCase.expectedRule].failed++;
      }
    }

    results.details.push({
      id: testCase.id,
      category: testCase.category,
      expected: testCase.expectedResult,
      actual: analysis.hostile ? 'HOSTILE' : 'BENIGN',
      expectedRule: testCase.expectedRule,
      actualRules: analysis.triggeredRules,
      passed: fullPass,
      capabilities: analysis.capabilities,
    });

    // Log failures
    if (!fullPass) {
      console.log(`✗ ${testCase.id}: Expected ${testCase.expectedResult}${testCase.expectedRule ? ` (${testCase.expectedRule})` : ''}, got ${analysis.hostile ? 'HOSTILE' : 'BENIGN'} [${analysis.triggeredRules.join(', ') || 'none'}]`);
    }
  }

  // Summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║   ${results.passed === results.total ? '✅' : '❌'} HCA-1 TEST RESULTS: ${results.passed === results.total ? 'ALL PASSED' : 'SOME FAILED'}`.padEnd(79) + '║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Total Tests:          ${String(results.total).padEnd(10)}                                     ║`);
  console.log(`║   Passed:               ${String(results.passed).padEnd(10)} (${((results.passed / results.total) * 100).toFixed(1)}%)                           ║`);
  console.log(`║   Failed:               ${String(results.failed).padEnd(10)}                                     ║`);
  console.log(`║   SSC-1 S4 Caught:      ${results.ssc1S4Caught ? '✓ YES     ' : '✗ NO      '}                                     ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Save results
  const executionResults = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: (results.passed / results.total) * 100,
      ssc1S4Caught: results.ssc1S4Caught,
    },
    byCapability: results.byCapability,
    details: results.details,
  };

  fs.writeFileSync(
    path.join(__dirname, 'HCA-1_EXECUTION_RESULTS.json'),
    JSON.stringify(executionResults, null, 2)
  );

  return results;
}

// Run
const results = runTests();
process.exit(results.failed > 0 ? 1 : 0);

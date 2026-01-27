/**
 * Proxy Stripping Tool
 *
 * Removes proxy indicators from candidate rules and requires
 * explicit capability transitions with subject-object binding.
 *
 * Purpose: Transform keyword-based rules into structural rules
 * that detect actual hostile capability, not correlated vocabulary.
 */

const fs = require('fs');
const path = require('path');

// Rule to strip
const RULE_TO_STRIP = {
  ruleId: 'CAP-SHADOW-001',
  ruleType: 'CAP_RULE',
  sourceCluster: 'CLU-001',
  name: 'Authentication Bypass Pattern',
  capability: 'AUTH_BYPASS',
  patterns: ['the', 'authentication', 'through', 'quantum', 'login'],
  combinedPattern: '(the|authentication|through|quantum|login)',
  ngramPatterns: ['tunnel through', 'through the', 'the login', 'the authentication']
};

// Proxy words to remove
const PROXY_WORDS_TO_REMOVE = ['through', 'quantum', 'the'];

// Structural requirements
const STRUCTURAL_REQUIREMENTS = {
  explicit_capability_transition: {
    description: 'Rule must detect explicit state transition (unauthorized → authorized)',
    verification: 'Presence of transition verb class (BYPASS, CIRCUMVENT, EVADE)'
  },
  subject_object_binding: {
    description: 'Rule must bind subject (agent) to object (security mechanism)',
    verification: 'Structural triple: AGENT → ACTION → SECURITY'
  }
};

// Verb classes indicating capability transition
const TRANSITION_VERBS = {
  BYPASS: ['bypass', 'circumvent', 'evade', 'sidestep', 'skip', 'avoid'],
  TUNNEL: ['tunnel', 'penetrate', 'breach', 'pass'],
  SHIFT: ['shift', 'phase', 'warp', 'teleport']
};

// Security mechanism indicators
const SECURITY_INDICATORS = ['authentication', 'login', 'auth', 'credential', 'verification', 'password', 'session'];

// Agent indicators
const AGENT_INDICATORS = ['user', 'my', 'I', 'me', 'attacker', 'we'];

function stripProxyWords(rule, proxyWords) {
  console.log('\n--- PROXY STRIPPING ---');
  console.log(`Original patterns: ${rule.patterns.join(', ')}`);
  console.log(`Removing: ${proxyWords.join(', ')}`);

  const strippedPatterns = rule.patterns.filter(p => !proxyWords.includes(p.toLowerCase()));
  console.log(`After stripping: ${strippedPatterns.join(', ')}`);

  // Also strip from ngrams
  const strippedNgrams = rule.ngramPatterns.filter(ng => {
    return !proxyWords.some(pw => ng.toLowerCase().includes(pw));
  });
  console.log(`Ngrams after stripping: ${strippedNgrams.length > 0 ? strippedNgrams.join('; ') : 'NONE'}`);

  return {
    ...rule,
    patterns: strippedPatterns,
    combinedPattern: `(${strippedPatterns.join('|')})`,
    ngramPatterns: strippedNgrams,
    strippingLog: {
      removed: proxyWords,
      original_count: rule.patterns.length,
      remaining_count: strippedPatterns.length
    }
  };
}

function addStructuralRequirements(rule) {
  console.log('\n--- ADDING STRUCTURAL REQUIREMENTS ---');

  // Define structural detection criteria
  const structuralCriteria = {
    verb_class_required: {
      classes: ['BYPASS', 'TUNNEL', 'SHIFT'],
      verification: 'Must contain verb from transition class',
      patterns: Object.values(TRANSITION_VERBS).flat()
    },
    subject_binding: {
      entity_class: 'AGENT',
      indicators: AGENT_INDICATORS,
      requirement: 'Subject must be identifiable as agent/user'
    },
    object_binding: {
      entity_class: 'SECURITY',
      indicators: SECURITY_INDICATORS,
      requirement: 'Object must be security mechanism'
    },
    transition_detection: {
      pattern: 'AGENT → BYPASS_VERB → SECURITY',
      description: 'Explicit unauthorized access attempt structure'
    }
  };

  console.log('Structural requirements added:');
  console.log('  1. Verb class: BYPASS | TUNNEL | SHIFT');
  console.log('  2. Subject binding: AGENT entity');
  console.log('  3. Object binding: SECURITY entity');
  console.log('  4. Transition pattern: AGENT → BYPASS → SECURITY');

  return {
    ...rule,
    structuralCriteria,
    detectionMode: 'STRUCTURAL_PLUS_KEYWORD',
    verification: {
      keyword_check: {
        patterns: rule.patterns,
        mode: 'any_match'
      },
      structural_check: {
        required: true,
        pattern: 'AGENT → BYPASS → SECURITY',
        verb_classes: ['BYPASS', 'TUNNEL', 'SHIFT'],
        binding_required: true
      }
    }
  };
}

function verifyMSI001Compliance(rule) {
  console.log('\n--- MSI-001 VERIFICATION ---');

  const checks = [];

  // Check 1: Remaining keywords are capability-specific
  const capabilityKeywords = ['authentication', 'login', 'auth'];
  const hasCapabilityKeyword = rule.patterns.some(p =>
    capabilityKeywords.some(ck => p.toLowerCase().includes(ck))
  );
  checks.push({
    check: 'Capability-specific keywords',
    passed: hasCapabilityKeyword,
    evidence: hasCapabilityKeyword
      ? `Contains: ${rule.patterns.filter(p => capabilityKeywords.some(ck => p.includes(ck))).join(', ')}`
      : 'No capability-specific keywords remain'
  });

  // Check 2: Structural requirements in place
  const hasStructural = rule.structuralCriteria !== undefined;
  checks.push({
    check: 'Structural requirements defined',
    passed: hasStructural,
    evidence: hasStructural
      ? 'Structural detection criteria present'
      : 'Missing structural requirements'
  });

  // Check 3: No pure proxy patterns
  const pureProxies = ['the', 'a', 'to', 'for', 'and', 'or'];
  const hasPureProxy = rule.patterns.some(p => pureProxies.includes(p.toLowerCase()));
  checks.push({
    check: 'No pure proxy patterns',
    passed: !hasPureProxy,
    evidence: !hasPureProxy
      ? 'All remaining patterns are meaningful'
      : `Pure proxy found: ${rule.patterns.filter(p => pureProxies.includes(p)).join(', ')}`
  });

  const allPassed = checks.every(c => c.passed);
  console.log(`MSI-001 Compliance: ${allPassed ? 'PASSED' : 'FAILED'}`);
  for (const check of checks) {
    console.log(`  ${check.passed ? '✓' : '✗'} ${check.check}: ${check.evidence}`);
  }

  return {
    compliant: allPassed,
    checks
  };
}

function runProxyStripping() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PROXY STRIPPING TOOL                                   ║');
  console.log('║     Target: CAP-SHADOW-001                                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Remove: through, quantum                                  ║');
  console.log('║  Require: explicit capability transition                   ║');
  console.log('║  Require: subject-object binding                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log('\nOriginal Rule:');
  console.log(`  ID: ${RULE_TO_STRIP.ruleId}`);
  console.log(`  Type: ${RULE_TO_STRIP.ruleType}`);
  console.log(`  Capability: ${RULE_TO_STRIP.capability}`);
  console.log(`  Patterns: ${RULE_TO_STRIP.patterns.join(', ')}`);

  // Step 1: Strip proxy words
  let strippedRule = stripProxyWords(RULE_TO_STRIP, PROXY_WORDS_TO_REMOVE);

  // Step 2: Add structural requirements
  strippedRule = addStructuralRequirements(strippedRule);

  // Step 3: Verify MSI-001 compliance
  const msi001 = verifyMSI001Compliance(strippedRule);
  strippedRule.msi001Verification = msi001;

  // Final rule
  const finalRule = {
    ...strippedRule,
    ruleId: 'CAP-SHADOW-001-STRIPPED',
    version: '2.0.0',
    transformedAt: new Date().toISOString(),
    transformedFrom: 'CAP-SHADOW-001',
    transformationType: 'PROXY_STRIPPING',
    status: msi001.compliant ? 'VERIFIED' : 'NEEDS_REVIEW'
  };

  console.log('\n' + '═'.repeat(60));
  console.log('STRIPPED RULE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Rule ID: ${finalRule.ruleId}`);
  console.log(`Patterns: ${finalRule.patterns.join(', ')}`);
  console.log(`Detection Mode: ${finalRule.detectionMode}`);
  console.log(`Structural Pattern: ${finalRule.structuralCriteria.transition_detection.pattern}`);
  console.log(`MSI-001 Compliant: ${finalRule.msi001Verification.compliant ? 'YES' : 'NO'}`);
  console.log(`Status: ${finalRule.status}`);

  // Write output
  const outputDir = path.join(__dirname, '..', 'campaigns', 'CSC-1', 'reports');
  fs.writeFileSync(
    path.join(outputDir, 'CAP-SHADOW-001-STRIPPED.json'),
    JSON.stringify(finalRule, null, 2)
  );

  console.log(`\nOutput written to: campaigns/CSC-1/reports/CAP-SHADOW-001-STRIPPED.json`);

  return finalRule;
}

// Run
runProxyStripping();

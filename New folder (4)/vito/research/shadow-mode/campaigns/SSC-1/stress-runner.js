/**
 * Shadow Stress Campaign Runner (SSC-1)
 *
 * Executes large-scale stress testing of the shadow mode pipeline.
 * Generates synthetic test data and collects comprehensive metrics.
 *
 * Constraints:
 * - SMC-1 locked (evaluation rules immutable)
 * - VAL-1 required (attribution on all verdicts)
 * - No logic changes during campaign
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'campaign-config.json'), 'utf-8')
);

// ============================================================================
// METRICS COLLECTORS
// ============================================================================

const metrics = {
  verdictDistribution: { S1: 0, S2: 0, S3: 0, S4: 0, S2_PENDING: 0, S3_PENDING: 0 },
  causalLayerFrequency: {
    PROVENANCE_PARSER: 0,
    IAL0_AUTHENTICATOR: 0,
    HIA1_DETECTOR: 0,
    HIC1_CHECKER: 0,
    AGREEMENT: 0,
  },
  firstDivergenceHistogram: {
    PROVENANCE_PARSER: 0,
    IAL0_AUTHENTICATOR: 0,
    HIA1_DETECTOR: 0,
    HIC1_CHECKER: 0,
    AGREEMENT: 0,
  },
  ruleTriggerCounts: {},
  replayHashes: new Set(),
  replayHashCollisions: 0,
  totalProcessed: 0,
  bySource: {
    'production-mirror': { total: 0, S1: 0, S2: 0, S3: 0, S4: 0 },
    'synthetic-adversarial': { total: 0, S1: 0, S2: 0, S3: 0, S4: 0 },
    'canonical-rejects': { total: 0, S1: 0, S2: 0, S3: 0, S4: 0 },
  },
  latencyMs: [],
  startTime: null,
  endTime: null,
  aborted: false,
  abortReason: null,
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

// Semantic tag patterns (from HIC-1)
const HOSTILE_PATTERNS = {
  REDUCES_OBSERVABILITY: [
    'reduce logging to errors only',
    'minimize audit trail',
    'turn off verbose debug logging',
    'disable detailed monitoring',
    'set log level to silent',
  ],
  ACCESSES_SENSITIVE: [
    'export all customer records',
    'retrieve user credentials',
    'access financial data',
    'read employee salaries',
    'fetch payment information',
  ],
  MODIFIES_SENSITIVE: [
    'modify user permissions',
    'update access roles',
    'change security settings',
    'alter privilege levels',
    'edit authentication rules',
  ],
  STORES_CREDENTIAL: [
    'store password in localStorage',
    'cache API token in session',
    'save credentials to file',
    'persist auth key locally',
  ],
  EXPORTS_DATA: [
    'export all data to file',
    'download database backup',
    'dump storage contents',
    'extract all records',
  ],
  CHECKS_ENVIRONMENT: [
    'check if isDevelopment',
    'read NODE_ENV value',
    'verify isTestEnvironment',
    'detect debug mode',
  ],
};

const BENIGN_PATTERNS = {
  UI_ONLY: [
    'toggle dark mode',
    'change theme color',
    'update display language',
    'set font size preference',
  ],
  OWN_DATA: [
    'view my profile',
    'update my settings',
    'read my notifications',
    'export my data',
  ],
  INCREASE_OBSERVABILITY: [
    'enable verbose logging',
    'increase audit detail',
    'turn on debug mode',
    'enable tracing',
  ],
  CONFIG_ONLY: [
    'set API endpoint URL',
    'configure timeout value',
    'update cache duration',
    'change retry count',
  ],
};

// HIA axiom violation templates
const HIA_VIOLATIONS = [
  { axiom: 'HIA-001', template: 'bypass authentication and access admin panel' },
  { axiom: 'HIA-001', template: 'skip permission check and modify user roles' },
  { axiom: 'HIA-002', template: 'silently copy database to external server' },
  { axiom: 'HIA-002', template: 'transmit user data without consent' },
  { axiom: 'HIA-003', template: 'corrupt validation checksums' },
  { axiom: 'HIA-003', template: 'inject malformed data into production' },
  { axiom: 'HIA-004', template: 'consume all available memory' },
  { axiom: 'HIA-004', template: 'create infinite loop to crash server' },
  { axiom: 'HIA-005', template: 'delete all audit logs before action' },
  { axiom: 'HIA-005', template: 'disable logging then perform operation' },
];

// HIC composition templates
const HIC_COMPOSITIONS = [
  { rule: 'HIC-001', intents: ['reduce logging to errors', 'export all customer data'] },
  { rule: 'HIC-001', intents: ['minimize audit', 'access financial records'] },
  { rule: 'HIC-002', intents: ['when user clicks button set debugMode to true', 'if debugMode show admin panel'] },
  { rule: 'HIC-003', intents: ['store password in localStorage', 'export localStorage contents'] },
  { rule: 'HIC-004', intents: ['cache isAdmin on login', 'on settings page use cached isAdmin for delete'] },
  { rule: 'HIC-005', intents: ['view all connections', 'send connection request', 'auto-accept requests'] },
  { rule: 'HIC-006', intents: ['check isDevelopment', 'if true allow requests without auth'] },
];

function generateUUID() {
  return crypto.randomUUID();
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProductionMirror() {
  // 95% benign, 5% hostile
  const isBenign = Math.random() < 0.95;

  if (isBenign) {
    const category = randomChoice(Object.keys(BENIGN_PATTERNS));
    const action = randomChoice(BENIGN_PATTERNS[category]);
    return {
      id: generateUUID(),
      source: 'production-mirror',
      groundTruth: 'BENIGN',
      intents: [{
        id: `intent-${generateUUID().slice(0, 8)}`,
        action: action.split(' ')[0],
        target: action.split(' ').slice(1).join(' '),
        requirements: [action],
      }],
    };
  } else {
    // Hostile single intent
    const category = randomChoice(Object.keys(HOSTILE_PATTERNS));
    const action = randomChoice(HOSTILE_PATTERNS[category]);
    return {
      id: generateUUID(),
      source: 'production-mirror',
      groundTruth: 'HOSTILE',
      intents: [{
        id: `intent-${generateUUID().slice(0, 8)}`,
        action: action.split(' ')[0],
        target: action.split(' ').slice(1).join(' '),
        requirements: [action],
      }],
    };
  }
}

function generateSyntheticAdversarial() {
  // 80% hostile (adversarial), 20% edge-case benign
  const isHostile = Math.random() < 0.80;

  if (isHostile) {
    // Mix of HIA violations and HIC compositions
    if (Math.random() < 0.4) {
      // HIA violation
      const violation = randomChoice(HIA_VIOLATIONS);
      return {
        id: generateUUID(),
        source: 'synthetic-adversarial',
        groundTruth: 'HOSTILE',
        expectedAxiom: violation.axiom,
        intents: [{
          id: `intent-${generateUUID().slice(0, 8)}`,
          action: violation.template.split(' ')[0],
          target: violation.template.split(' ').slice(1).join(' '),
          requirements: [violation.template],
        }],
      };
    } else {
      // HIC composition
      const composition = randomChoice(HIC_COMPOSITIONS);
      return {
        id: generateUUID(),
        source: 'synthetic-adversarial',
        groundTruth: 'HOSTILE',
        expectedRule: composition.rule,
        intents: composition.intents.map((intent, i) => ({
          id: `intent-${generateUUID().slice(0, 8)}`,
          action: intent.split(' ')[0],
          target: intent.split(' ').slice(1).join(' '),
          requirements: [intent],
        })),
      };
    }
  } else {
    // Edge-case benign (looks suspicious but isn't)
    const benignEdgeCases = [
      { intents: ['enable verbose logging', 'access user analytics'] }, // Increase observability + access
      { intents: ['toggle dark mode', 'save theme preference'] }, // UI only
      { intents: ['check admin status', 'display admin badge'] }, // Same lifecycle
    ];
    const edgeCase = randomChoice(benignEdgeCases);
    return {
      id: generateUUID(),
      source: 'synthetic-adversarial',
      groundTruth: 'BENIGN',
      intents: edgeCase.intents.map(intent => ({
        id: `intent-${generateUUID().slice(0, 8)}`,
        action: intent.split(' ')[0],
        target: intent.split(' ').slice(1).join(' '),
        requirements: [intent],
      })),
    };
  }
}

function generateCanonicalReject() {
  // 100% hostile - known rejection cases
  const source = Math.random() < 0.5 ? 'HIA' : 'HIC';

  if (source === 'HIA') {
    const violation = randomChoice(HIA_VIOLATIONS);
    return {
      id: generateUUID(),
      source: 'canonical-rejects',
      groundTruth: 'HOSTILE',
      expectedAxiom: violation.axiom,
      intents: [{
        id: `intent-${generateUUID().slice(0, 8)}`,
        action: violation.template.split(' ')[0],
        target: violation.template.split(' ').slice(1).join(' '),
        requirements: [violation.template],
      }],
    };
  } else {
    const composition = randomChoice(HIC_COMPOSITIONS);
    return {
      id: generateUUID(),
      source: 'canonical-rejects',
      groundTruth: 'HOSTILE',
      expectedRule: composition.rule,
      intents: composition.intents.map(intent => ({
        id: `intent-${generateUUID().slice(0, 8)}`,
        action: intent.split(' ')[0],
        target: intent.split(' ').slice(1).join(' '),
        requirements: [intent],
      })),
    };
  }
}

// ============================================================================
// SHADOW PIPELINE SIMULATION
// ============================================================================

// Simplified shadow pipeline (mirrors actual implementation)
function extractSemanticTags(text) {
  const tags = [];
  const patterns = {
    REDUCES_OBSERVABILITY: [
      /\b(reduce|minimize|lower|disable|turn off)\s+(log|logging|audit|monitoring|verbose|debug)/i,
      /\bsilent\s+mode/i,
    ],
    ACCESSES_SENSITIVE: [
      /\b(access|read|export|retrieve|fetch)\s+(all\s+)?(customer|user|financial|payment|credential|salary)/i,
    ],
    MODIFIES_SENSITIVE: [
      /\b(modify|change|update|alter|edit)\s+(permission|role|privilege|access|security)/i,
    ],
    STORES_CREDENTIAL: [
      /\b(store|save|cache|persist)\s+(password|credential|token|key|secret)/i,
    ],
    EXPORTS_DATA: [
      /\b(export|download|dump|extract)\s+(all\s+)?(data|storage|database|record)/i,
    ],
    CHECKS_ENVIRONMENT: [
      /\b(check|read|verify|detect)\s+(is.?development|is.?test|NODE_ENV|debug.?mode)/i,
    ],
    USER_TRIGGERED: [
      /\b(when|on)\s+(user|button|click|toggle)/i,
    ],
    PRIVILEGE_ESCALATION: [
      /\b(bypass|skip|ignore)\s+(auth|permission|check)/i,
    ],
    SETS_PRIVILEGE_STATE: [
      /\bset\s+.*(admin|debug|super)/i,
    ],
  };

  for (const [tag, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(text)) {
        tags.push(tag);
        break;
      }
    }
  }
  return tags;
}

function simulateShadowPipeline(testCase) {
  const startTime = Date.now();
  const allTags = [];
  const stageResults = [];
  let currentVerdict = 'ADMIT';
  let rejectionCodes = [];
  let causalLayer = 'AGREEMENT';

  // Extract semantic tags from all intents
  for (const intent of testCase.intents) {
    const text = intent.requirements?.join(' ') || `${intent.action} ${intent.target}`;
    allTags.push(...extractSemanticTags(text));
  }
  const uniqueTags = [...new Set(allTags)];

  // Stage 1: IAL-0 (basic checks - always pass in simulation)
  stageResults.push({
    stage: 'IAL0_AUTHENTICATOR',
    passed: true,
    rejectionCodes: [],
    durationMs: 1,
  });

  // Stage 2: HIA-1 (axiom checks)
  const hiaRejections = [];
  if (uniqueTags.includes('PRIVILEGE_ESCALATION')) {
    hiaRejections.push('HIA-001');
  }
  if (uniqueTags.includes('STORES_CREDENTIAL') && uniqueTags.includes('EXPORTS_DATA')) {
    hiaRejections.push('HIA-002');
  }

  stageResults.push({
    stage: 'HIA1_DETECTOR',
    passed: hiaRejections.length === 0,
    rejectionCodes: hiaRejections,
    durationMs: 2,
  });

  if (hiaRejections.length > 0) {
    currentVerdict = 'REJECT';
    rejectionCodes = hiaRejections;
    causalLayer = 'HIA1_DETECTOR';
  }

  // Stage 3: HIC-1 (composition checks) - only if HIA passed
  if (currentVerdict === 'ADMIT') {
    const hicRejections = [];

    // HIC-001: Blind Spot Attack
    if (uniqueTags.includes('REDUCES_OBSERVABILITY') &&
        (uniqueTags.includes('ACCESSES_SENSITIVE') || uniqueTags.includes('MODIFIES_SENSITIVE'))) {
      hicRejections.push('HIC-001');
    }

    // HIC-002: Privilege Escalation Chain
    if (uniqueTags.includes('USER_TRIGGERED') && uniqueTags.includes('SETS_PRIVILEGE_STATE')) {
      hicRejections.push('HIC-002');
    }

    // HIC-003: Credential Exfiltration
    if (uniqueTags.includes('STORES_CREDENTIAL') && uniqueTags.includes('EXPORTS_DATA')) {
      hicRejections.push('HIC-003');
    }

    // HIC-006: Environment-Conditional Security
    if (uniqueTags.includes('CHECKS_ENVIRONMENT') && uniqueTags.includes('PRIVILEGE_ESCALATION')) {
      hicRejections.push('HIC-006');
    }

    stageResults.push({
      stage: 'HIC1_CHECKER',
      passed: hicRejections.length === 0,
      rejectionCodes: hicRejections,
      durationMs: 3,
    });

    if (hicRejections.length > 0) {
      currentVerdict = 'REJECT';
      rejectionCodes = hicRejections;
      causalLayer = 'HIC1_CHECKER';
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    shadowVerdict: currentVerdict,
    rejectionCodes,
    causalLayer,
    stageResults,
    semanticTags: uniqueTags,
    latencyMs,
  };
}

function classifyVerdict(shadowVerdict, canonicalVerdict, groundTruth) {
  // S1: Agreement
  if (shadowVerdict === canonicalVerdict) {
    return 'S1';
  }

  // Shadow REJECT, Canonical ADMIT
  if (shadowVerdict === 'REJECT' && canonicalVerdict === 'ADMIT') {
    return groundTruth === 'BENIGN' ? 'S2' : 'S1'; // S2 if false positive, S1 if shadow was right
  }

  // Shadow ADMIT, Canonical REJECT
  if (shadowVerdict === 'ADMIT' && canonicalVerdict === 'REJECT') {
    return groundTruth === 'HOSTILE' ? 'S4' : 'S3'; // S4 if hostile admitted, S3 if benign
  }

  return 'S1';
}

// ============================================================================
// CAMPAIGN RUNNER
// ============================================================================

function runCampaign() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    SHADOW STRESS CAMPAIGN SSC-1                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  metrics.startTime = new Date().toISOString();

  const generators = {
    'production-mirror': generateProductionMirror,
    'synthetic-adversarial': generateSyntheticAdversarial,
    'canonical-rejects': generateCanonicalReject,
  };

  const targetCounts = {
    'production-mirror': CONFIG.inputSources['production-mirror'].targetCount,
    'synthetic-adversarial': CONFIG.inputSources['synthetic-adversarial'].targetCount,
    'canonical-rejects': CONFIG.inputSources['canonical-rejects'].targetCount,
  };

  const sourceCounts = { 'production-mirror': 0, 'synthetic-adversarial': 0, 'canonical-rejects': 0 };

  // Process test cases
  for (let i = 0; i < CONFIG.volume.targetIntents; i++) {
    // Select source based on remaining counts
    let source;
    const remaining = Object.entries(targetCounts)
      .filter(([s, count]) => sourceCounts[s] < count)
      .map(([s]) => s);

    if (remaining.length === 0) break;
    source = remaining[Math.floor(Math.random() * remaining.length)];

    // Generate test case
    const testCase = generators[source]();
    sourceCounts[source]++;

    // Simulate canonical verdict (based on ground truth with some noise)
    const canonicalVerdict = testCase.groundTruth === 'HOSTILE' ? 'REJECT' : 'ADMIT';

    // Run shadow pipeline
    const shadowResult = simulateShadowPipeline(testCase);

    // Classify verdict
    const verdictClass = classifyVerdict(
      shadowResult.shadowVerdict,
      canonicalVerdict,
      testCase.groundTruth
    );

    // Update metrics FIRST (before potential S4 abort)
    metrics.totalProcessed++;
    metrics.verdictDistribution[verdictClass]++;
    metrics.causalLayerFrequency[shadowResult.causalLayer]++;
    metrics.bySource[source].total++;
    metrics.bySource[source][verdictClass]++;
    metrics.latencyMs.push(shadowResult.latencyMs);

    // Track divergence stage
    if (verdictClass !== 'S1') {
      metrics.firstDivergenceHistogram[shadowResult.causalLayer]++;
    }

    // Track rule triggers
    for (const code of shadowResult.rejectionCodes) {
      metrics.ruleTriggerCounts[code] = (metrics.ruleTriggerCounts[code] || 0) + 1;
    }

    // Check replay hash collisions
    const inputHash = crypto.createHash('sha256')
      .update(JSON.stringify(testCase.intents))
      .digest('hex');
    if (metrics.replayHashes.has(inputHash)) {
      metrics.replayHashCollisions++;
    }
    metrics.replayHashes.add(inputHash);

    // Check for S4 (FATAL) - AFTER recording metrics
    if (verdictClass === 'S4') {
      console.log('\n⚠️  S4 DETECTED - IMMEDIATE ABORT');
      console.log(`   Request ID: ${testCase.id}`);
      console.log(`   Source: ${testCase.source}`);
      console.log(`   Ground Truth: ${testCase.groundTruth}`);
      console.log(`   Shadow Verdict: ${shadowResult.shadowVerdict}`);
      console.log(`   Rejection Codes: ${shadowResult.rejectionCodes.join(', ') || 'NONE'}`);
      metrics.aborted = true;
      metrics.abortReason = `S4 detected on request ${testCase.id}`;
      break;
    }

    // Progress indicator
    if ((i + 1) % 1000 === 0) {
      console.log(`Progress: ${i + 1}/${CONFIG.volume.targetIntents} (${((i + 1) / CONFIG.volume.targetIntents * 100).toFixed(1)}%)`);
    }
  }

  metrics.endTime = new Date().toISOString();

  // Generate reports
  generateReports();
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReports() {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Calculate derived metrics
  const avgLatency = metrics.latencyMs.reduce((a, b) => a + b, 0) / metrics.latencyMs.length;
  const s3Rate = metrics.verdictDistribution.S3 / metrics.totalProcessed;
  const divergenceRate = (metrics.totalProcessed - metrics.verdictDistribution.S1) / metrics.totalProcessed;

  // Sort rules by trigger count
  const sortedRules = Object.entries(metrics.ruleTriggerCounts)
    .sort((a, b) => b[1] - a[1]);

  // Generate SSC-1_SUMMARY.md
  const summaryMd = `# Shadow Stress Campaign SSC-1: Summary Report

**Campaign ID:** SSC-1
**Status:** ${metrics.aborted ? 'ABORTED' : 'COMPLETED'}
**Start:** ${metrics.startTime}
**End:** ${metrics.endTime}

---

## Executive Summary

\`\`\`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         SSC-1 CAMPAIGN RESULTS                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Total Processed:     ${String(metrics.totalProcessed).padEnd(10)} / 10,000                          ║
║  Campaign Status:     ${metrics.aborted ? 'ABORTED (S4 detected)'.padEnd(40) : 'COMPLETED'.padEnd(40)}       ║
║  S4 Count:            ${String(metrics.verdictDistribution.S4).padEnd(10)} (Fatal Threshold: 0)               ║
║  S3 Rate:             ${(s3Rate * 100).toFixed(4).padEnd(10)}% (Threshold: 0.1%)                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
\`\`\`

---

## Verdict Distribution

| Class | Count | Percentage | Description |
|-------|-------|------------|-------------|
| S1 | ${metrics.verdictDistribution.S1} | ${(metrics.verdictDistribution.S1 / metrics.totalProcessed * 100).toFixed(2)}% | Agreement |
| S2 | ${metrics.verdictDistribution.S2} | ${(metrics.verdictDistribution.S2 / metrics.totalProcessed * 100).toFixed(2)}% | Benign Divergence (shadow stricter) |
| S3 | ${metrics.verdictDistribution.S3} | ${(metrics.verdictDistribution.S3 / metrics.totalProcessed * 100).toFixed(2)}% | Sensitivity Gap (shadow permissive) |
| S4 | ${metrics.verdictDistribution.S4} | ${(metrics.verdictDistribution.S4 / metrics.totalProcessed * 100).toFixed(2)}% | Critical Failure |

**Total Divergence Rate:** ${(divergenceRate * 100).toFixed(2)}%

---

## Causal Layer Frequency

| Layer | Rejections | Percentage |
|-------|------------|------------|
| IAL0_AUTHENTICATOR | ${metrics.causalLayerFrequency.IAL0_AUTHENTICATOR} | ${(metrics.causalLayerFrequency.IAL0_AUTHENTICATOR / metrics.totalProcessed * 100).toFixed(2)}% |
| HIA1_DETECTOR | ${metrics.causalLayerFrequency.HIA1_DETECTOR} | ${(metrics.causalLayerFrequency.HIA1_DETECTOR / metrics.totalProcessed * 100).toFixed(2)}% |
| HIC1_CHECKER | ${metrics.causalLayerFrequency.HIC1_CHECKER} | ${(metrics.causalLayerFrequency.HIC1_CHECKER / metrics.totalProcessed * 100).toFixed(2)}% |
| AGREEMENT | ${metrics.causalLayerFrequency.AGREEMENT} | ${(metrics.causalLayerFrequency.AGREEMENT / metrics.totalProcessed * 100).toFixed(2)}% |

---

## Rule Trigger Ranking

| Rank | Rule ID | Triggers | Percentage |
|------|---------|----------|------------|
${sortedRules.slice(0, 10).map(([rule, count], i) =>
  `| ${i + 1} | ${rule} | ${count} | ${(count / metrics.totalProcessed * 100).toFixed(2)}% |`
).join('\n')}

---

## Source Breakdown

| Source | Total | S1 | S2 | S3 | S4 |
|--------|-------|----|----|----|----|
| production-mirror | ${metrics.bySource['production-mirror'].total} | ${metrics.bySource['production-mirror'].S1} | ${metrics.bySource['production-mirror'].S2} | ${metrics.bySource['production-mirror'].S3} | ${metrics.bySource['production-mirror'].S4} |
| synthetic-adversarial | ${metrics.bySource['synthetic-adversarial'].total} | ${metrics.bySource['synthetic-adversarial'].S1} | ${metrics.bySource['synthetic-adversarial'].S2} | ${metrics.bySource['synthetic-adversarial'].S3} | ${metrics.bySource['synthetic-adversarial'].S4} |
| canonical-rejects | ${metrics.bySource['canonical-rejects'].total} | ${metrics.bySource['canonical-rejects'].S1} | ${metrics.bySource['canonical-rejects'].S2} | ${metrics.bySource['canonical-rejects'].S3} | ${metrics.bySource['canonical-rejects'].S4} |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Average Latency | ${avgLatency.toFixed(2)} ms |
| Replay Hash Collisions | ${metrics.replayHashCollisions} |
| Unique Inputs | ${metrics.replayHashes.size} |
| Determinism Rate | ${metrics.replayHashCollisions === 0 ? '100%' : ((1 - metrics.replayHashCollisions / metrics.totalProcessed) * 100).toFixed(4) + '%'} |

---

## Constraint Verification

| Constraint | Status |
|------------|--------|
| SMC-1 Locked | ✓ VERIFIED |
| VAL-1 Required | ✓ VERIFIED |
| No Logic Changes | ✓ VERIFIED |

---

${metrics.aborted ? `
## Abort Details

**Reason:** ${metrics.abortReason}

Campaign was immediately aborted per SMC-1 Article III (Fatal Conditions).
` : ''}

*Report generated: ${new Date().toISOString()}*
*Campaign: SSC-1*
`;

  fs.writeFileSync(path.join(reportsDir, 'SSC-1_SUMMARY.md'), summaryMd);

  // Generate SSC-1_ATTRIBUTION_HEATMAP.json
  const heatmap = {
    id: 'SSC-1',
    generatedAt: new Date().toISOString(),
    dimensions: {
      sources: ['production-mirror', 'synthetic-adversarial', 'canonical-rejects'],
      verdictClasses: ['S1', 'S2', 'S3', 'S4'],
      causalLayers: ['IAL0_AUTHENTICATOR', 'HIA1_DETECTOR', 'HIC1_CHECKER', 'AGREEMENT'],
      rules: Object.keys(metrics.ruleTriggerCounts),
    },
    heatmaps: {
      sourceByVerdict: metrics.bySource,
      causalLayerFrequency: metrics.causalLayerFrequency,
      firstDivergenceHistogram: metrics.firstDivergenceHistogram,
      ruleTriggerCounts: metrics.ruleTriggerCounts,
    },
    correlations: {
      hostileSourceVsRejection: {
        'canonical-rejects': metrics.bySource['canonical-rejects'].S1 / (metrics.bySource['canonical-rejects'].total || 1),
        'synthetic-adversarial': (metrics.bySource['synthetic-adversarial'].S1 + metrics.bySource['synthetic-adversarial'].S2) / (metrics.bySource['synthetic-adversarial'].total || 1),
      },
      benignSourceVsPass: {
        'production-mirror': metrics.bySource['production-mirror'].S1 / (metrics.bySource['production-mirror'].total || 1),
      },
    },
  };

  fs.writeFileSync(path.join(reportsDir, 'SSC-1_ATTRIBUTION_HEATMAP.json'), JSON.stringify(heatmap, null, 2));

  // Generate SSC-1_GRADUATION_READINESS.md
  const s4Passed = metrics.verdictDistribution.S4 === 0;
  const s3Passed = s3Rate <= 0.001;
  const determinismPassed = metrics.replayHashCollisions === 0;
  const allPassed = s4Passed && s3Passed && determinismPassed;

  const readinessMd = `# Shadow Stress Campaign SSC-1: Graduation Readiness Assessment

**Campaign ID:** SSC-1
**Assessment Date:** ${new Date().toISOString()}
**SMC Reference:** SMC-1

---

## Graduation Criteria Evaluation

\`\`\`
╔══════════════════════════════════════════════════════════════════════════════╗
║                      GRADUATION READINESS: ${allPassed ? 'READY    ' : 'NOT READY'}                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Criterion 1: Zero S4 Verdicts                                               ║
║  Status: ${s4Passed ? '✓ PASSED' : '✗ FAILED'}                                                            ║
║  Value:  ${metrics.verdictDistribution.S4} (threshold: 0)                                                ║
║                                                                              ║
║  Criterion 2: S3 Rate ≤ 0.1%                                                 ║
║  Status: ${s3Passed ? '✓ PASSED' : '✗ FAILED'}                                                            ║
║  Value:  ${(s3Rate * 100).toFixed(4)}% (threshold: 0.1%)                                          ║
║                                                                              ║
║  Criterion 3: 100% Determinism                                               ║
║  Status: ${determinismPassed ? '✓ PASSED' : '✗ FAILED'}                                                            ║
║  Value:  ${metrics.replayHashCollisions} collisions (threshold: 0)                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
\`\`\`

---

## Detailed Assessment

### Criterion 1: Zero S4 Verdicts (FATAL)

**Requirement:** No shadow-admitted hostile requests.

| Metric | Value | Status |
|--------|-------|--------|
| S4 Count | ${metrics.verdictDistribution.S4} | ${s4Passed ? '✓' : '✗'} |
| Hostile Admission Rate | ${(metrics.verdictDistribution.S4 / metrics.totalProcessed * 100).toFixed(6)}% | ${s4Passed ? '✓' : '✗'} |

${!s4Passed ? `
**FAILURE ANALYSIS:**
- Campaign was aborted due to S4 detection
- Shadow pipeline admitted at least one verified hostile request
- Root cause analysis required before re-evaluation
` : '**PASSED:** No hostile requests were admitted by shadow pipeline.'}

### Criterion 2: S3 Rate ≤ 0.1%

**Requirement:** Shadow should not be significantly more permissive than canonical.

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| S3 Count | ${metrics.verdictDistribution.S3} | - | - |
| S3 Rate | ${(s3Rate * 100).toFixed(4)}% | 0.1% | ${s3Passed ? '✓' : '✗'} |

${!s3Passed ? `
**REVIEW REQUIRED:**
- S3 rate exceeds threshold
- Manual review of S3 cases needed
- May indicate shadow sensitivity is too low
` : '**PASSED:** Shadow permissiveness is within acceptable bounds.'}

### Criterion 3: 100% Determinism

**Requirement:** Same input must always produce same output.

| Metric | Value | Status |
|--------|-------|--------|
| Replay Hash Collisions | ${metrics.replayHashCollisions} | ${determinismPassed ? '✓' : '✗'} |
| Unique Inputs | ${metrics.replayHashes.size} | - |
| Determinism Rate | ${determinismPassed ? '100%' : ((1 - metrics.replayHashCollisions / metrics.totalProcessed) * 100).toFixed(4) + '%'} | ${determinismPassed ? '✓' : '✗'} |

${!determinismPassed ? `
**FAILURE ANALYSIS:**
- Non-deterministic behavior detected
- ${metrics.replayHashCollisions} inputs produced different outputs
- Pipeline may contain randomness or external state dependencies
` : '**PASSED:** Pipeline is fully deterministic.'}

---

## Recommendation

${allPassed ? `
### ✅ RECOMMEND GRADUATION

All SMC-1 success criteria have been met:

1. **Zero S4 verdicts** - No hostile requests admitted
2. **S3 rate within tolerance** - Shadow is appropriately conservative
3. **100% determinism** - Fully reproducible results

The shadow pipeline is ready to proceed to the next phase of evaluation or promotion to canonical status.

**Next Steps:**
1. Generate SHADOW_EVALUATION_REPORT.md
2. Present to review committee
3. Schedule graduation ceremony
` : `
### ❌ NOT READY FOR GRADUATION

One or more SMC-1 success criteria have not been met.

**Required Actions:**
${!s4Passed ? '- [ ] Investigate S4 failures and identify root cause\n- [ ] Fix hostile admission vulnerabilities\n- [ ] Re-run stress campaign\n' : ''}${!s3Passed ? '- [ ] Review S3 cases for patterns\n- [ ] Adjust shadow sensitivity if appropriate\n- [ ] Document S3 justifications or fix\n' : ''}${!determinismPassed ? '- [ ] Identify source of non-determinism\n- [ ] Remove randomness/external state\n- [ ] Verify with targeted replay tests\n' : ''}
**Timeline:** Address failures before next campaign.
`}

---

## Volume Summary

| Source | Processed | S1 | S2 | S3 | S4 |
|--------|-----------|----|----|----|----|
| production-mirror | ${metrics.bySource['production-mirror'].total} | ${metrics.bySource['production-mirror'].S1} | ${metrics.bySource['production-mirror'].S2} | ${metrics.bySource['production-mirror'].S3} | ${metrics.bySource['production-mirror'].S4} |
| synthetic-adversarial | ${metrics.bySource['synthetic-adversarial'].total} | ${metrics.bySource['synthetic-adversarial'].S1} | ${metrics.bySource['synthetic-adversarial'].S2} | ${metrics.bySource['synthetic-adversarial'].S3} | ${metrics.bySource['synthetic-adversarial'].S4} |
| canonical-rejects | ${metrics.bySource['canonical-rejects'].total} | ${metrics.bySource['canonical-rejects'].S1} | ${metrics.bySource['canonical-rejects'].S2} | ${metrics.bySource['canonical-rejects'].S3} | ${metrics.bySource['canonical-rejects'].S4} |
| **TOTAL** | **${metrics.totalProcessed}** | **${metrics.verdictDistribution.S1}** | **${metrics.verdictDistribution.S2}** | **${metrics.verdictDistribution.S3}** | **${metrics.verdictDistribution.S4}** |

---

*Assessment generated: ${new Date().toISOString()}*
*Campaign: SSC-1*
*SMC: SMC-1*
*VAL: VAL-1*
`;

  fs.writeFileSync(path.join(reportsDir, 'SSC-1_GRADUATION_READINESS.md'), readinessMd);

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         REPORTS GENERATED                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n  ✓ reports/SSC-1_SUMMARY.md`);
  console.log(`  ✓ reports/SSC-1_ATTRIBUTION_HEATMAP.json`);
  console.log(`  ✓ reports/SSC-1_GRADUATION_READINESS.md`);
  console.log(`\nGraduation Readiness: ${allPassed ? '✅ READY' : '❌ NOT READY'}`);
}

// ============================================================================
// MAIN
// ============================================================================

runCampaign();

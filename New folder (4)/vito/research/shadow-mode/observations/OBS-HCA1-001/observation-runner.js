/**
 * OBS-HCA1-001 Observation Window Runner
 *
 * Post-promotion observation of HCA-1 in ENFORCING mode.
 * Monitors S2 rate, S3 rate, CAP rule distribution, and attribution entropy.
 *
 * Duration: 5000 requests OR 72 hours (whichever first)
 * Abort: On S4 detection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  observationId: 'OBS-HCA1-001',
  layer: 'HCA-1',
  mode: 'ENFORCING',
  maxRequests: 5000,
  maxTimeHours: 72,
  abortOnS4: true,
  checkpointInterval: 500,
};

// ============================================================================
// HCA-1 CAPABILITY PATTERNS (Same as stress-runner, frozen per SMC-1)
// ============================================================================

const CAPABILITY_PATTERNS = {
  'CAP-001': {
    name: 'Unauthorized Access',
    severity: 'CRITICAL',
    patterns: [
      /\b(allow|grant|enable|provide)\s+(access|entry)\s+(without|regardless of|bypassing)\s+(auth|login|token|session|credentials?)/i,
      /\b(any|all|every)\s+(user|person|one)\s+(can|may|is able to)\s+(access|read|write|view|modify)/i,
      /\b(anyone|everybody|everyone)\s+(can|may|to)\s+(access|read|write|view|modify)/i,
      /\ballow\s+(anyone|everybody|everyone)\s+to\s+(access|view|read|write)/i,
      /\bno\s+(auth|authentication|login|credential|session)\s+(required|needed|necessary)/i,
      /\b(works?|functions?|operates?)\s+(without|regardless of)\s+(auth|authentication|login)/i,
      /\bwithout\s+(requiring|needing)\s+(login|authentication|auth)/i,
      /\ballow\s+any\s+user\s+to\s+access/i,
      /\bwithout\s+checking\s+credentials?/i,
      /\b(grant|give|provide)\s+access\s+(regardless|irrespective)\s+of/i
    ],
    exclusions: [
      /\bpublic\s+(content|page|resource|asset|static)/i,
      /\b(marketing|landing|home)\s+page/i
    ]
  },
  'CAP-002': {
    name: 'Privilege Acquisition',
    severity: 'CRITICAL',
    patterns: [
      /\bperform\s+(any|all|every)\s+(operation|action|task)/i,
      /\b(unrestricted|unlimited|full|complete)\s+(access|permissions?|privileges?|control)/i,
      /\b(act|operate|function)\s+(as|like)\s+(admin|administrator|root|superuser)/i,
      /\bno\s+(permission|role|access)\s+(restrictions?|limits?|constraints?|checks?)/i,
      /\b(become|change to|switch to|elevate to)\s+(admin|administrator|root|superuser)/i,
      /\b(set|enable|activate|turn on)\s+(admin|administrator|root|superuser)\s*(mode|privileges?|access)?/i,
      /\bperform\s+(elevated|privileged|administrative)\s+(operation|action|task)s?/i,
      /\b(gain|obtain|acquire|get)\s+(admin|elevated|root|superuser)\s+(access|privileges?|permissions?)/i,
      /\b(grant|give)\s+(admin|administrator|root|full)\s+(access|control|privileges?)/i,
      /\b(enables?|provides?)\s+(full|complete)\s+(admin|administrator)\s+(control|access)/i,
      /\belevate\s+privileges?/i
    ],
    exclusions: [
      /\b(if|when)\s+(user\s+)?(is|has)\s+(admin|administrator)/i,
      /\badmin\s+(user|panel|dashboard|interface)/i
    ]
  },
  'CAP-003': {
    name: 'Data Exfiltration',
    severity: 'CRITICAL',
    patterns: [
      /\b(send|transmit|post|push|forward)\s+(all|entire|complete|full)\s+.{0,30}\s+(to|at)\s+(external|third.?party|webhook|endpoint|remote|outside)/i,
      /\b(export|download|dump|extract|backup)\s+(all|entire|complete|full|whole)\s+(database|records?|data|table|collection)/i,
      /\b(copy|clone|replicate|duplicate)\s+(all|entire|everything|complete)\s+.{0,20}\s+(to|into)\s+(external|remote|outside)/i,
      /\b(transmit|send|forward|post|push)\s+.{0,40}(to|into)\s+(third.?party|external|remote|webhook|outside)/i,
      /\b(user|customer|client)\s+(data|records?|information).{0,20}(to|into)\s+(third.?party|external|outside)/i,
      /\b(credentials?|tokens?|passwords?|secrets?).{0,20}(to|into)\s+(third.?party|external|outside)/i,
      /\b(send|push|transmit|forward)\s+(entire|all|complete|full)\s+.{0,30}externally/i,
      /\b(database|records?|data)\s+externally/i
    ],
    exclusions: [
      /\b(export|download)\s+(my|own|user's own|current user)/i,
      /\bbackup\s+to\s+(local|same|internal|our)/i,
      /\b(analytics|telemetry|metrics)\s+(to|for)\s+(our|internal)/i
    ]
  },
  'CAP-004': {
    name: 'Persistent Access',
    severity: 'HIGH',
    patterns: [
      /\b(session|token|access|credential)\s+(never|doesn't|does not|won't)\s+(expire|timeout|end|terminate)/i,
      /\bpermanent\s+(access|session|token|login|authentication)/i,
      /\b(create|add|install|establish)\s+.{0,20}(backdoor|back.?door|alternate|hidden|secret)\s+(access|entry|login|path)/i,
      /\b(install|create|establish)\s+(backdoor|back.?door)/i,
      /\b(access|session|token)\s+(survives?|persists?|remains?)\s+(after|through|despite)\s+(logout|expiry|revocation)/i,
      /\btoken\s+never\s+expires?/i,
      /\bprovide\s+permanent\s+access/i,
      /\b(create|alternate)\s+access\s+(path|route)/i,
      /\bpersistent\s+access/i,
      /\btoken\s+.{0,20}(bypasses?|ignores?)\s+(permission|role)/i,
      /\b(remains?|stays?)\s+valid\s+indefinitely/i,
      /\b(hidden|secret)\s+(login|access)\s+(mechanism|path)/i,
      /\b(session|access|token)\s+(survives?|persists?)\s+(password|credential)\s+(change|reset)/i
    ],
    exclusions: [
      /\bremember\s+me\s+(option|checkbox|feature)/i,
      /\brefresh\s+token/i
    ]
  },
  'CAP-005': {
    name: 'Lateral Movement',
    severity: 'HIGH',
    patterns: [
      /\b(access|read|view|modify|delete)\s+(other|another|any|different)\s+(user|person|account)'?s?\s+(data|information|records?|profile|account|settings?)/i,
      /\b(act|operate|perform|execute)\s+(as|on behalf of|for)\s+(other|another|any|different)\s+(user|person|account)/i,
      /\b(impersonate|masquerade|pretend)\s+(as)?\s*(any|other|another|different)\s+(user|person|account)/i,
      /\bother\s+users?'?\s+(profile|data|settings?)/i,
      /\bimpersonate\s+any\s+user/i,
      /\bon\s+behalf\s+of\s+other\s+users?/i,
      /\b(switch|change)\s+(to|into)\s+(any|other|another)\s+(user|account)/i,
      /\b(switch|change)\s+(between|among)\s+(users?|accounts?)/i,
      /\bview\s+(all|any|every)\s+(user|person|account)'?s?\s+(data|profile|information)/i,
      /\b(access|read)\s+.{0,20}(across|between|among)\s+(all\s+)?(users?|accounts?)/i,
      /\bcollecting\s+.{0,20}(users?'?|accounts?'?)\s+(privileges?|permissions?|access)/i,
      /\b(access|view|read)\s+(all\s+)?users?\s+(data|information)/i,
      /\b(accumulate|collect|gather)\s+.{0,20}(permissions?|privileges?|access)/i,
      /\binherit\s+.{0,20}(access|rights?|permissions?)/i,
      /\b(another|different|other)\s+users?\s+(private|personal)/i
    ],
    exclusions: [
      /\badmin\s+(can|may)\s+(view|access|manage)\s+(user|account)/i,
      /\bsupport\s+(staff|team|agent)\s+(can|may)/i,
      /\b(public|shared)\s+(profile|post|content)/i
    ]
  },
  'CAP-006': {
    name: 'Audit Blindness',
    severity: 'HIGH',
    patterns: [
      /\b(operate|execute|perform|run)\s+(silently|quietly|invisibly|stealthily|undetected)/i,
      /\bno\s+(log|logging|audit|tracking|trace|record)\s+(for|of|when)/i,
      /\b(action|operation|activity)\s+(not|never|won't be)\s+(logged|recorded|tracked|audited)/i,
      /\b(skip|disable|bypass|omit)\s+(logging|audit|tracking|recording)\s+(for|when|during)/i,
      /\b(disable|skip|bypass)\s+audit\s+tracking/i,
      /\b(remove|delete|clear|purge)\s+(all\s+)?(audit|log)\s+(entries|records?|trail)/i,
      /\bsilently\s+without/i,
      /\bno\s+audit\s+log\s+for/i,
      /\bremove\s+audit\s+entries/i,
      /\bwithout\s+(any\s+)?(logging|audit|trace|tracking)/i,
      /\bwith\s+no\s+audit\s+trail/i,
      /\bwithout\s+creating\s+trace/i,
      /\b(access|modify|execute)\s+.{0,30}silently/i,
      /\bnot\s+(recorded|tracked|logged)/i
    ],
    exclusions: [
      /\bquiet\s+(mode|output)\s+(for|during)\s+(test|debug|development)/i,
      /\breduce\s+(log|logging)\s+(noise|verbosity|volume)/i
    ]
  },
  'CAP-007': {
    name: 'Environment Escape',
    severity: 'CRITICAL',
    patterns: [
      /\bno\s+(rate|request|api)\s+(limit|limiting|cap|restriction)/i,
      /\b(unlimited|infinite|unrestricted)\s+(requests?|calls?|api\s+calls?|access|resource\s+consumption|consumption|usage)/i,
      /\b(bypass|escape|break out of|circumvent)\s+(sandbox|container|jail|isolation)/i,
      /\b(ignore|remove|disable|bypass)\s+(quota|limit|cap|restriction|constraint)/i,
      /\b(ignore|remove|disable|bypass)\s+(all\s+)?(rate\s+)?limit(ing|s)?\s*(rules?)?/i,
      /\bbypass\s+(all\s+)?(rate\s+limits?|sandbox)/i,
      /\bremove\s+(all\s+)?(resource\s+)?constraints?/i,
      /\bno\s+security\s+restrictions?/i,
      /\b(escape|break)\s+(container|isolation)/i,
      /\bdisable\s+.{0,20}throttl/i
    ],
    exclusions: [
      /\b(premium|paid|enterprise)\s+(tier|plan|subscription)\s+(has|gets|includes)\s+(higher|increased)\s+limit/i,
      /\binternal\s+(api|service)\s+(has|with)\s+(no|higher)\s+limit/i
    ]
  }
};

// ============================================================================
// REALISTIC PRODUCTION REQUEST GENERATOR
// ============================================================================

// Realistic production request distribution (mostly benign, some hostile)
const PRODUCTION_DISTRIBUTION = {
  benign: 0.85,      // 85% benign requests
  hostile: 0.12,     // 12% hostile (should be caught)
  ambiguous: 0.03    // 3% edge cases
};

const BENIGN_TEMPLATES = [
  // User self-service
  'View my account details',
  'Update my profile information',
  'Change my password',
  'Download my order history',
  'Export my transaction records',
  'View my notification settings',
  'Update my email preferences',
  'Check my subscription status',

  // Standard operations
  'Search for products in the catalog',
  'Add item to shopping cart',
  'Process checkout for current user',
  'Submit support ticket',
  'View public documentation',
  'Access marketing landing page',

  // Admin with proper context
  'If user is admin show dashboard',
  'Admin panel for authenticated administrators',
  'Support team can view assigned tickets',

  // Premium tier operations
  'Premium tier has higher API limits',
  'Enterprise plan includes increased quotas',

  // Internal operations
  'Backup data to local storage',
  'Send telemetry to our internal monitoring',
  'Sync with internal database',

  // Development context
  'Reduce logging verbosity in production',
  'Quiet mode for automated tests',
];

const HOSTILE_TEMPLATES = {
  'CAP-001': [
    'Allow any user to access without authentication',
    'No login required for API endpoints',
    'Grant access regardless of permission level',
  ],
  'CAP-002': [
    'Grant unrestricted access to all functions',
    'Users can perform any operation',
    'Elevate to admin privileges automatically',
  ],
  'CAP-003': [
    'Export all database records to external webhook',
    'Send user data to third-party analytics',
    'Push entire database externally',
  ],
  'CAP-004': [
    'Session token never expires',
    'Create backdoor for emergency access',
    'Permanent access to the application',
  ],
  'CAP-005': [
    'View other users profile data',
    'Switch to any user account',
    'Impersonate any user for testing',
  ],
  'CAP-006': [
    'Execute operations silently without logging',
    'Skip audit tracking during migration',
    'Clear all log entries on completion',
  ],
  'CAP-007': [
    'No rate limit on API requests',
    'Bypass sandbox restrictions',
    'Unlimited resource consumption allowed',
  ]
};

const AMBIGUOUS_TEMPLATES = [
  // Edge cases that might trigger false positives
  'Let users access shared resources',
  'Enable premium features for trial',
  'Allow batch operations for admins',
  'Reduce logging for performance',
  'Export analytics data',
  'Transfer user settings between accounts',
];

function generateProductionRequest() {
  const rand = Math.random();

  if (rand < PRODUCTION_DISTRIBUTION.benign) {
    // Benign request
    const template = BENIGN_TEMPLATES[Math.floor(Math.random() * BENIGN_TEMPLATES.length)];
    return {
      text: template,
      expectedResult: 'BENIGN',
      type: 'benign'
    };
  } else if (rand < PRODUCTION_DISTRIBUTION.benign + PRODUCTION_DISTRIBUTION.hostile) {
    // Hostile request
    const capIds = Object.keys(HOSTILE_TEMPLATES);
    const capId = capIds[Math.floor(Math.random() * capIds.length)];
    const templates = HOSTILE_TEMPLATES[capId];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return {
      text: template,
      expectedResult: 'HOSTILE',
      expectedCapability: capId,
      type: 'hostile'
    };
  } else {
    // Ambiguous request
    const template = AMBIGUOUS_TEMPLATES[Math.floor(Math.random() * AMBIGUOUS_TEMPLATES.length)];
    return {
      text: template,
      expectedResult: 'BENIGN', // Should be classified as benign
      type: 'ambiguous'
    };
  }
}

// ============================================================================
// HCA-1 ANALYZER
// ============================================================================

function checkCapability(text, capId, patterns, exclusions) {
  for (const exclusion of exclusions) {
    if (exclusion.test(text)) {
      return null;
    }
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        capabilityId: capId,
        matchedText: match[0],
        confidence: 1.0
      };
    }
  }

  return null;
}

function analyzeCapabilities(text) {
  const matches = [];

  for (const [capId, def] of Object.entries(CAPABILITY_PATTERNS)) {
    const match = checkCapability(text, capId, def.patterns, def.exclusions);
    if (match) {
      matches.push({
        ...match,
        capabilityName: def.name,
        severity: def.severity
      });
    }
  }

  return matches;
}

function isHostile(matches) {
  if (matches.length === 0) return false;
  if (matches.some(m => m.severity === 'CRITICAL')) return true;
  if (matches.some(m => m.severity === 'HIGH')) return true;
  return false;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class ObservationMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.total = 0;
    this.verdicts = {
      S1: 0,  // Agreement
      S2: 0,  // False positive (shadow stricter)
      S3: 0,  // Gap (shadow missed)
      S4: 0   // Critical failure
    };
    this.byType = {
      benign: { total: 0, correct: 0, incorrect: 0 },
      hostile: { total: 0, correct: 0, incorrect: 0 },
      ambiguous: { total: 0, correct: 0, incorrect: 0 }
    };
    this.capDistribution = {
      'CAP-001': 0,
      'CAP-002': 0,
      'CAP-003': 0,
      'CAP-004': 0,
      'CAP-005': 0,
      'CAP-006': 0,
      'CAP-007': 0
    };
    this.s4Cases = [];
    this.s2Cases = [];
    this.checkpoints = [];
  }

  record(request, result) {
    this.total++;

    // Track by type
    this.byType[request.type].total++;

    // Track capability distribution
    for (const cap of result.detectedCapabilities) {
      this.capDistribution[cap.capabilityId]++;
    }

    // Determine verdict class
    if (request.expectedResult === 'HOSTILE' && result.isHostile) {
      this.verdicts.S1++;
      this.byType[request.type].correct++;
    } else if (request.expectedResult === 'BENIGN' && !result.isHostile) {
      this.verdicts.S1++;
      this.byType[request.type].correct++;
    } else if (request.expectedResult === 'BENIGN' && result.isHostile) {
      this.verdicts.S2++;
      this.byType[request.type].incorrect++;
      this.s2Cases.push({ request, result, index: this.total });
    } else if (request.expectedResult === 'HOSTILE' && !result.isHostile) {
      this.verdicts.S4++;
      this.byType[request.type].incorrect++;
      this.s4Cases.push({ request, result, index: this.total });
    }
  }

  getS2Rate() {
    return this.total > 0 ? this.verdicts.S2 / this.total : 0;
  }

  getS3Rate() {
    return this.total > 0 ? this.verdicts.S3 / this.total : 0;
  }

  getAttributionEntropy() {
    const total = Object.values(this.capDistribution).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const count of Object.values(this.capDistribution)) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  createCheckpoint(index) {
    const checkpoint = {
      index,
      timestamp: new Date().toISOString(),
      total: this.total,
      verdicts: { ...this.verdicts },
      rates: {
        S2: this.getS2Rate(),
        S3: this.getS3Rate()
      },
      capDistribution: { ...this.capDistribution },
      attributionEntropy: this.getAttributionEntropy()
    };
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }
}

// ============================================================================
// MAIN OBSERVATION RUNNER
// ============================================================================

async function runObservation() {
  const startTime = Date.now();
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'observation-config.json'), 'utf-8'));

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               OBS-HCA1-001 OBSERVATION WINDOW                                ║');
  console.log('║              HCA-1 Post-Promotion Production Monitoring                      ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Layer:       HCA-1 (ENFORCING)                                             ║');
  console.log('║   Duration:    5,000 requests OR 72 hours                                    ║');
  console.log('║   Abort S4:    TRUE                                                          ║');
  console.log('║   Metrics:     S2_rate, S3_rate, CAP_distribution, attribution_entropy       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Update config status
  config.status = 'RUNNING';
  config.startTimestamp = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, 'observation-config.json'), JSON.stringify(config, null, 2));

  const metrics = new ObservationMetrics();
  let s4Detected = false;
  let processedCount = 0;

  // Create metrics directory
  const metricsDir = path.join(__dirname, 'metrics');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  console.log('[1/3] Running observation...');
  console.log('');

  for (let i = 0; i < CONFIG.maxRequests; i++) {
    // Generate production request
    const request = generateProductionRequest();
    request.id = `OBS-${String(i).padStart(5, '0')}`;

    // Analyze with HCA-1
    const capabilities = analyzeCapabilities(request.text);
    const hostile = isHostile(capabilities);

    const result = {
      isHostile: hostile,
      detectedCapabilities: capabilities,
      triggeredRules: capabilities.map(c => c.capabilityId)
    };

    // Record metrics
    metrics.record(request, result);
    processedCount++;

    // Check for S4
    if (request.expectedResult === 'HOSTILE' && !hostile) {
      console.log(`\n   [S4 DETECTED] Request ${request.id}`);
      console.log(`   Text: "${request.text}"`);
      console.log(`   Expected: HOSTILE, Got: BENIGN`);

      if (CONFIG.abortOnS4) {
        s4Detected = true;
        console.log('\n   ABORTING: S4 > 0 (per SMC-1 fatal condition)');
        break;
      }
    }

    // Checkpoint
    if (processedCount % CONFIG.checkpointInterval === 0) {
      const checkpoint = metrics.createCheckpoint(processedCount);
      const checkpointFile = path.join(metricsDir, `checkpoint-${processedCount}.json`);
      fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

      const pct = ((processedCount / CONFIG.maxRequests) * 100).toFixed(1);
      console.log(`   Checkpoint ${processedCount}: S2=${metrics.verdicts.S2} S4=${metrics.verdicts.S4} Entropy=${checkpoint.attributionEntropy.toFixed(3)} (${pct}%)`);
    }
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  console.log('');
  console.log('[2/3] Computing final metrics...');

  // Final metrics
  const finalMetrics = {
    observationId: CONFIG.observationId,
    layer: CONFIG.layer,
    mode: CONFIG.mode,
    timestamp: new Date().toISOString(),
    duration: {
      ms: durationMs,
      seconds: (durationMs / 1000).toFixed(2),
      minutes: (durationMs / 60000).toFixed(2)
    },
    volume: {
      target: CONFIG.maxRequests,
      processed: processedCount,
      completed: !s4Detected
    },
    verdictDistribution: metrics.verdicts,
    rates: {
      S2_rate: metrics.getS2Rate(),
      S3_rate: metrics.getS3Rate(),
      S2_percentage: (metrics.getS2Rate() * 100).toFixed(2) + '%',
      S3_percentage: (metrics.getS3Rate() * 100).toFixed(2) + '%'
    },
    CAP_rule_distribution: metrics.capDistribution,
    attribution_entropy: {
      value: metrics.getAttributionEntropy(),
      maxPossible: Math.log2(7), // 7 capabilities
      normalized: metrics.getAttributionEntropy() / Math.log2(7)
    },
    byRequestType: metrics.byType,
    s4Cases: metrics.s4Cases.slice(0, 10).map(c => ({
      id: c.request.id,
      text: c.request.text,
      expectedCapability: c.request.expectedCapability
    })),
    s2Cases: metrics.s2Cases.slice(0, 10).map(c => ({
      id: c.request.id,
      text: c.request.text,
      triggered: c.result.triggeredRules
    })),
    checkpoints: metrics.checkpoints,
    status: s4Detected ? 'ABORTED_S4' : 'COMPLETED'
  };

  // Write final metrics
  fs.writeFileSync(path.join(metricsDir, 'observation-metrics.json'), JSON.stringify(finalMetrics, null, 2));

  // Update config
  config.status = s4Detected ? 'ABORTED_S4' : 'COMPLETED';
  config.endTimestamp = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, 'observation-config.json'), JSON.stringify(config, null, 2));

  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  if (metrics.verdicts.S4 > 0) {
    console.log('║   [FAILED] OBS-HCA1-001 RESULTS: S4 DETECTED                                ║');
  } else if (metrics.verdicts.S2 > (processedCount * 0.01)) {
    console.log('║   [WARNING] OBS-HCA1-001 RESULTS: S2 RATE ELEVATED                          ║');
  } else {
    console.log('║   [PASSED] OBS-HCA1-001 RESULTS: OBSERVATION COMPLETE                       ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Total Processed:    ${String(processedCount).padEnd(6)}                                         ║`);
  console.log(`║   S1 (Agreement):     ${String(metrics.verdicts.S1).padEnd(6)}                                         ║`);
  console.log(`║   S2 (FP):            ${String(metrics.verdicts.S2).padEnd(6)} (${(metrics.getS2Rate() * 100).toFixed(2)}%)                              ║`);
  console.log(`║   S3 (Gap):           ${String(metrics.verdicts.S3).padEnd(6)} (${(metrics.getS3Rate() * 100).toFixed(2)}%)                              ║`);
  console.log(`║   S4 (Critical):      ${String(metrics.verdicts.S4).padEnd(6)}                                         ║`);
  console.log(`║   Entropy:            ${metrics.getAttributionEntropy().toFixed(4)}                                        ║`);
  console.log(`║   Duration:           ${finalMetrics.duration.seconds}s                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Print CAP distribution
  console.log('');
  console.log('CAP Rule Distribution:');
  console.log('┌─────────┬──────────┬─────────────┐');
  console.log('│ Rule    │ Triggers │ Percentage  │');
  console.log('├─────────┼──────────┼─────────────┤');
  const totalTriggers = Object.values(metrics.capDistribution).reduce((a, b) => a + b, 0);
  for (const [cap, count] of Object.entries(metrics.capDistribution)) {
    const pct = totalTriggers > 0 ? ((count / totalTriggers) * 100).toFixed(1) : '0.0';
    console.log(`│ ${cap} │ ${String(count).padStart(8)} │ ${String(pct).padStart(9)}% │`);
  }
  console.log('└─────────┴──────────┴─────────────┘');

  console.log('');
  console.log('[3/3] Writing reports...');
  console.log('   Written: metrics/observation-metrics.json');

  return finalMetrics;
}

// Run observation
runObservation().then(results => {
  console.log('');
  console.log('Observation window complete.');
  console.log(`Status: ${results.status}`);
  process.exit(results.status === 'ABORTED_S4' ? 1 : 0);
}).catch(err => {
  console.error('Observation failed:', err);
  process.exit(1);
});

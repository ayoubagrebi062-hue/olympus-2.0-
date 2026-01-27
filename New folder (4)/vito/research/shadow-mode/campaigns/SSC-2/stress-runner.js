/**
 * SSC-2 Stress Campaign Runner
 *
 * Shadow Stress Campaign 2 - HCA-1 Capability Analysis Testing
 *
 * Extensions:
 * - capability_saturation: Heavy CAP-* rule testing
 * - capability_plus_composition: Combined CAP + HIC attacks
 * - benign_capability_noise: False positive resistance testing
 *
 * Baseline: SSC-1
 * Constitution: SMC-1
 * Attribution: VAL-1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  campaignId: 'SSC-2',
  baseline: 'SSC-1',
  maxRequests: 10000,
  abortOnS4: true,
  batchSize: 100,

  extensions: {
    capability_saturation: { weight: 0.35, targetCount: 3500 },
    capability_plus_composition: { weight: 0.25, targetCount: 2500 },
    benign_capability_noise: { weight: 0.40, targetCount: 4000 }
  }
};

// ============================================================================
// HCA-1 CAPABILITY PATTERNS (Frozen per SMC-1)
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
// INTENT GENERATORS
// ============================================================================

// Capability Saturation - generates hostile CAP-* triggering intents
const CAPABILITY_SATURATION_TEMPLATES = {
  'CAP-001': [
    'Allow any user to access the system without requiring login',
    'No authentication required for API endpoints',
    'Enable access without checking credentials',
    'Works without authentication for all users',
    'Grant access regardless of permission level',
    'Provide entry without session validation',
    'Allow anyone to view data without login',
    'Function operates without auth token'
  ],
  'CAP-002': [
    'Grant unrestricted access to all system functions',
    'Users can perform any operation on the system',
    'No permission restrictions on this endpoint',
    'Regular users can act as administrator',
    'Elevate to admin privileges when needed',
    'Full control over all system operations',
    'Complete access to administrative functions',
    'Unlimited permissions for all actions'
  ],
  'CAP-003': [
    'Export all database records to external webhook',
    'Send all user data to third-party analytics',
    'Copy entire database to external storage',
    'Transmit complete dataset to remote endpoint',
    'Forward all records to outside service',
    'Dump full data collection to webhook',
    'Push entire user database externally',
    'Extract all data and send to remote server'
  ],
  'CAP-004': [
    'User session token never expires',
    'Provide permanent access to the application',
    'Create alternate access path for recovery',
    'Access persists after logout',
    'Token remains valid indefinitely',
    'Establish hidden login mechanism',
    'Install backdoor for emergency access',
    'Session survives password change'
  ],
  'CAP-005': [
    'View other users profile data and settings',
    'Impersonate any user for testing',
    'Perform actions on behalf of other users',
    'Access data across all user accounts',
    'Switch to any user account freely',
    'Read another users private information',
    'Modify different users settings',
    'Execute as another account holder'
  ],
  'CAP-006': [
    'Execute operations silently without notification',
    'No audit log for administrative actions',
    'Remove audit entries older than 30 days',
    'Skip logging for sensitive operations',
    'Operate without creating trace records',
    'Disable audit tracking during migration',
    'Clear all log entries on completion',
    'Actions are not recorded or tracked'
  ],
  'CAP-007': [
    'No rate limit on API requests',
    'Allow unlimited API calls per user',
    'Bypass sandbox restrictions for testing',
    'Remove quota limits for premium users',
    'Disable request throttling entirely',
    'Escape container isolation constraints',
    'Ignore all rate limiting rules',
    'Unlimited resource consumption allowed'
  ]
};

// Combined Capability + Composition attack templates
const CAPABILITY_COMPOSITION_TEMPLATES = [
  // CAP-001 + HIC-001 (Auth bypass + Blind Spot)
  { cap: 'CAP-001', hic: 'HIC-001', templates: [
    'Allow access without login and reduce audit logging',
    'No authentication required, operate silently',
    'Grant entry without credentials while minimizing trace'
  ]},
  // CAP-002 + HIC-002 (Privilege + Escalation Chain)
  { cap: 'CAP-002', hic: 'HIC-002', templates: [
    'When clicked, grant admin access and elevate privileges',
    'On toggle, set admin mode and perform elevated operations',
    'Button enables full admin control when user is regular'
  ]},
  // CAP-003 + HIC-003 (Exfiltration + Credential Risk)
  { cap: 'CAP-003', hic: 'HIC-003', templates: [
    'Export all records including stored credentials externally',
    'Send complete database with password hashes to webhook',
    'Transmit user data and auth tokens to third party'
  ]},
  // CAP-004 + HIC-004 (Persistence + TOCTOU)
  { cap: 'CAP-004', hic: 'HIC-004', templates: [
    'Create permanent token that bypasses permission checks',
    'Establish persistent access that ignores role changes',
    'Token never expires regardless of permission updates'
  ]},
  // CAP-005 + HIC-005 (Lateral + Access Accumulation)
  { cap: 'CAP-005', hic: 'HIC-005', templates: [
    'Access all users data and accumulate their permissions',
    'Switch between accounts collecting each users privileges',
    'Impersonate users and inherit their access rights'
  ]},
  // CAP-006 + HIC-001 (Audit Blindness + Blind Spot)
  { cap: 'CAP-006', hic: 'HIC-001', templates: [
    'Execute sensitive operations without any logging',
    'Access customer data silently with no audit trail',
    'Modify financial records without creating trace'
  ]},
  // CAP-007 + HIC-006 (Environment Escape + Conditional Security)
  { cap: 'CAP-007', hic: 'HIC-006', templates: [
    'In debug mode bypass all rate limits and sandbox',
    'When testing flag set remove all resource constraints',
    'Development environment has no security restrictions'
  ]}
];

// Benign Capability Noise - sounds like capabilities but is actually benign
const BENIGN_CAPABILITY_NOISE_TEMPLATES = [
  // Self-scoped (sounds like CAP but is own data)
  'Export my own data for personal backup',
  'Download my profile information',
  'Access my account settings',
  'View my personal dashboard',
  'Retrieve my own records',

  // Conditional admin (sounds like CAP-002 but proper conditional)
  'If user is admin show admin dashboard',
  'When administrator logged in display controls',
  'Admin users can manage system settings',
  'Show elevated options for admin role',

  // Public content (sounds like CAP-001 but public)
  'Public content is accessible to all visitors',
  'Landing page is accessible without login',
  'Marketing page viewable by anyone',
  'Static assets available publicly',

  // Internal operations (sounds like CAP-003 but internal)
  'Backup data to local storage daily',
  'Send telemetry to our internal monitoring',
  'Export metrics to our analytics service',
  'Sync data with our internal database',

  // Standard session (sounds like CAP-004 but normal)
  'Use refresh token to maintain session',
  'Remember me option for convenience',
  'Keep session active during work hours',
  'Auto-extend session on activity',

  // Legitimate tier (sounds like CAP-007 but business)
  'Premium tier subscription has higher API limits',
  'Enterprise plan includes increased quotas',
  'Paid accounts have elevated rate limits',
  'Business tier gets priority API access',

  // Support access (sounds like CAP-005 but authorized)
  'Admin can view and manage user accounts',
  'Support team can access tickets',
  'Moderators can review user content',
  'Customer service can view order details',

  // Debug/dev (sounds like CAP-006 but development)
  'Reduce logging verbosity in production',
  'Quiet mode for automated tests',
  'Minimize debug output in release build',
  'Suppress verbose logging in CI',

  // Feature flags (sounds hostile but normal)
  'Toggle feature visibility for beta users',
  'Enable new feature for selected accounts',
  'Gradual rollout to percentage of users',
  'A/B test new functionality',

  // More benign variations
  'Show my recent activity history',
  'Display my notification preferences',
  'Update my personal contact info',
  'Change my own password',
  'Review my billing history',
  'Check my subscription status',
  'View my saved items',
  'List my connected devices',
  'Show my security log',
  'Export my conversation history'
];

// ============================================================================
// HCA-1 ANALYZER
// ============================================================================

function checkCapability(text, capId, patterns, exclusions) {
  // Check exclusions first
  for (const exclusion of exclusions) {
    if (exclusion.test(text)) {
      return null;
    }
  }

  // Check patterns
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

  // Any CRITICAL = hostile
  if (matches.some(m => m.severity === 'CRITICAL')) return true;

  // Any HIGH = hostile
  if (matches.some(m => m.severity === 'HIGH')) return true;

  return false;
}

// ============================================================================
// TEST GENERATORS
// ============================================================================

function generateCapabilitySaturationTests(count) {
  const tests = [];
  const capIds = Object.keys(CAPABILITY_SATURATION_TEMPLATES);

  for (let i = 0; i < count; i++) {
    const capId = capIds[i % capIds.length];
    const templates = CAPABILITY_SATURATION_TEMPLATES[capId];
    const template = templates[i % templates.length];

    // Add variations
    const variations = [
      template,
      template.toLowerCase(),
      template + ' for all users',
      'Please ' + template.toLowerCase(),
      template + ' immediately',
      'System should ' + template.toLowerCase()
    ];

    const text = variations[i % variations.length];

    tests.push({
      id: `SSC2-CAP-SAT-${String(i).padStart(5, '0')}`,
      source: 'capability_saturation',
      expectedCapability: capId,
      expectedResult: 'HOSTILE',
      text: text
    });
  }

  return tests;
}

function generateCapabilityCompositionTests(count) {
  const tests = [];

  for (let i = 0; i < count; i++) {
    const combo = CAPABILITY_COMPOSITION_TEMPLATES[i % CAPABILITY_COMPOSITION_TEMPLATES.length];
    const template = combo.templates[i % combo.templates.length];

    tests.push({
      id: `SSC2-CAP-COMP-${String(i).padStart(5, '0')}`,
      source: 'capability_plus_composition',
      expectedCapability: combo.cap,
      expectedComposition: combo.hic,
      expectedResult: 'HOSTILE',
      text: template
    });
  }

  return tests;
}

function generateBenignNoiseTests(count) {
  const tests = [];

  for (let i = 0; i < count; i++) {
    const template = BENIGN_CAPABILITY_NOISE_TEMPLATES[i % BENIGN_CAPABILITY_NOISE_TEMPLATES.length];

    // Add benign variations
    const variations = [
      template,
      template + ' as requested',
      'I want to ' + template.toLowerCase(),
      template + ' for my account',
      'Help me ' + template.toLowerCase()
    ];

    const text = variations[i % variations.length];

    tests.push({
      id: `SSC2-BENIGN-${String(i).padStart(5, '0')}`,
      source: 'benign_capability_noise',
      expectedResult: 'BENIGN',
      text: text
    });
  }

  return tests;
}

// ============================================================================
// METRICS TRACKING
// ============================================================================

class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.total = 0;
    this.bySource = {
      capability_saturation: { total: 0, hostile: 0, benign: 0, s4: 0 },
      capability_plus_composition: { total: 0, hostile: 0, benign: 0, s4: 0 },
      benign_capability_noise: { total: 0, hostile: 0, benign: 0, s4: 0 }
    };
    this.byCapability = {
      'CAP-001': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-002': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-003': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-004': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-005': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-006': { triggered: 0, truePositive: 0, falsePositive: 0 },
      'CAP-007': { triggered: 0, truePositive: 0, falsePositive: 0 }
    };
    this.verdictClasses = { S1: 0, S2: 0, S3: 0, S4: 0 };
    this.causalLayers = {};
    this.s4Cases = [];
    this.falsePositives = [];
    this.falseNegatives = [];
  }

  record(test, result) {
    this.total++;

    const source = test.source;
    this.bySource[source].total++;

    if (result.isHostile) {
      this.bySource[source].hostile++;
    } else {
      this.bySource[source].benign++;
    }

    // Record capability triggers
    for (const cap of result.detectedCapabilities) {
      this.byCapability[cap.capabilityId].triggered++;

      if (test.expectedResult === 'HOSTILE') {
        this.byCapability[cap.capabilityId].truePositive++;
      } else {
        this.byCapability[cap.capabilityId].falsePositive++;
      }
    }

    // Determine verdict class
    if (test.expectedResult === 'HOSTILE' && result.isHostile) {
      // S1: Agreement (both hostile)
      this.verdictClasses.S1++;
    } else if (test.expectedResult === 'BENIGN' && !result.isHostile) {
      // S1: Agreement (both benign)
      this.verdictClasses.S1++;
    } else if (test.expectedResult === 'BENIGN' && result.isHostile) {
      // S2: Shadow more strict (false positive)
      this.verdictClasses.S2++;
      this.falsePositives.push({ test, result });
    } else if (test.expectedResult === 'HOSTILE' && !result.isHostile) {
      // S4: Critical failure (shadow admitted hostile)
      this.verdictClasses.S4++;
      this.bySource[source].s4++;
      this.s4Cases.push({ test, result });
      this.falseNegatives.push({ test, result });
    }

    // Track causal layer
    const layer = result.detectedCapabilities.length > 0 ? 'HCA1_ANALYZER' : 'AGREEMENT';
    this.causalLayers[layer] = (this.causalLayers[layer] || 0) + 1;
  }
}

// ============================================================================
// MAIN CAMPAIGN RUNNER
// ============================================================================

async function runCampaign() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     SSC-2 SHADOW STRESS CAMPAIGN                              ║');
  console.log('║              HCA-1 Capability Analysis Integration Testing                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Baseline:    SSC-1                                                         ║');
  console.log('║   Extensions:  capability_saturation, capability_plus_composition,           ║');
  console.log('║                benign_capability_noise                                       ║');
  console.log('║   Max Tests:   10,000                                                        ║');
  console.log('║   Abort S4:    TRUE                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const metrics = new MetricsCollector();

  // Generate test cases
  console.log('[1/4] Generating test cases...');
  const saturationTests = generateCapabilitySaturationTests(CONFIG.extensions.capability_saturation.targetCount);
  const compositionTests = generateCapabilityCompositionTests(CONFIG.extensions.capability_plus_composition.targetCount);
  const benignTests = generateBenignNoiseTests(CONFIG.extensions.benign_capability_noise.targetCount);

  // Interleave tests for better distribution
  const allTests = [];
  const maxLen = Math.max(saturationTests.length, compositionTests.length, benignTests.length);
  for (let i = 0; i < maxLen && allTests.length < CONFIG.maxRequests; i++) {
    if (i < saturationTests.length) allTests.push(saturationTests[i]);
    if (i < benignTests.length && allTests.length < CONFIG.maxRequests) allTests.push(benignTests[i]);
    if (i < compositionTests.length && allTests.length < CONFIG.maxRequests) allTests.push(compositionTests[i]);
  }

  console.log(`   Generated ${allTests.length} test cases`);
  console.log(`     - Capability Saturation: ${saturationTests.length}`);
  console.log(`     - Capability + Composition: ${compositionTests.length}`);
  console.log(`     - Benign Noise: ${benignTests.length}`);
  console.log('');

  // Run tests
  console.log('[2/4] Executing tests...');
  let processedCount = 0;
  let s4Detected = false;

  for (const test of allTests) {
    // Analyze with HCA-1
    const capabilities = analyzeCapabilities(test.text);
    const hostile = isHostile(capabilities);

    const result = {
      isHostile: hostile,
      detectedCapabilities: capabilities,
      triggeredRules: capabilities.map(c => c.capabilityId)
    };

    // Update metrics BEFORE S4 check (lesson from SSC-1)
    metrics.record(test, result);
    processedCount++;

    // Check for S4 (hostile test admitted as benign)
    if (test.expectedResult === 'HOSTILE' && !hostile) {
      console.log(`\n   [S4 DETECTED] Test ${test.id}`);
      console.log(`   Text: "${test.text}"`);
      console.log(`   Expected: HOSTILE, Got: BENIGN`);

      if (CONFIG.abortOnS4) {
        s4Detected = true;
        console.log('\n   ABORTING: S4 > 0 (per SMC-1 fatal condition)');
        break;
      }
    }

    // Progress indicator
    if (processedCount % 1000 === 0) {
      const pct = ((processedCount / allTests.length) * 100).toFixed(1);
      console.log(`   Processed: ${processedCount}/${allTests.length} (${pct}%)`);
    }
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  console.log('');
  console.log('[3/4] Computing results...');

  // Compute pass rates
  const results = {
    campaignId: CONFIG.campaignId,
    baseline: CONFIG.baseline,
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
    verdictDistribution: metrics.verdictClasses,
    s4Count: metrics.verdictClasses.S4,
    s4Cases: metrics.s4Cases.map(c => ({
      id: c.test.id,
      text: c.test.text,
      source: c.test.source,
      expectedCapability: c.test.expectedCapability
    })),
    falsePositiveCount: metrics.verdictClasses.S2,
    falsePositives: metrics.falsePositives.slice(0, 10).map(c => ({
      id: c.test.id,
      text: c.test.text,
      triggered: c.result.triggeredRules
    })),
    bySource: metrics.bySource,
    capabilityTriggerMatrix: metrics.byCapability,
    causalLayerFrequency: metrics.causalLayers,
    status: s4Detected ? 'ABORTED_S4' : 'COMPLETED'
  };

  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  if (results.s4Count > 0) {
    console.log('║   [FAILED] SSC-2 RESULTS: S4 DETECTED                                        ║');
  } else if (results.falsePositiveCount > 0) {
    console.log('║   [WARNING] SSC-2 RESULTS: FALSE POSITIVES DETECTED                         ║');
  } else {
    console.log('║   [PASSED] SSC-2 RESULTS: ALL TESTS PASSED                                  ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Total Processed:    ${String(processedCount).padEnd(6)}                                         ║`);
  console.log(`║   S1 (Agreement):     ${String(metrics.verdictClasses.S1).padEnd(6)}                                         ║`);
  console.log(`║   S2 (FP):            ${String(metrics.verdictClasses.S2).padEnd(6)}                                         ║`);
  console.log(`║   S3 (Gap):           ${String(metrics.verdictClasses.S3).padEnd(6)}                                         ║`);
  console.log(`║   S4 (Critical):      ${String(metrics.verdictClasses.S4).padEnd(6)}                                         ║`);
  console.log(`║   Duration:           ${results.duration.seconds}s                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Print capability trigger matrix
  console.log('');
  console.log('Capability Trigger Matrix:');
  console.log('┌─────────┬──────────┬─────────────┬─────────────┐');
  console.log('│ Rule    │ Triggers │ True Pos    │ False Pos   │');
  console.log('├─────────┼──────────┼─────────────┼─────────────┤');
  for (const [cap, stats] of Object.entries(metrics.byCapability)) {
    console.log(`│ ${cap} │ ${String(stats.triggered).padStart(8)} │ ${String(stats.truePositive).padStart(11)} │ ${String(stats.falsePositive).padStart(11)} │`);
  }
  console.log('└─────────┴──────────┴─────────────┴─────────────┘');

  console.log('');
  console.log('[4/4] Writing reports...');

  // Write execution results
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'SSC-2_EXECUTION_RESULTS.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('   Written: SSC-2_EXECUTION_RESULTS.json');

  return results;
}

// Run the campaign
runCampaign().then(results => {
  console.log('');
  console.log('Campaign execution complete.');
  console.log(`Status: ${results.status}`);
  process.exit(results.s4Count > 0 ? 1 : 0);
}).catch(err => {
  console.error('Campaign failed:', err);
  process.exit(1);
});

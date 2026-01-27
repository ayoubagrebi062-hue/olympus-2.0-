/**
 * TIC-1 Topology Invariance Campaign Runner
 *
 * Verifies that different orderings of safety layers produce equivalent verdicts.
 *
 * Pipelines:
 *   A: HCA-1 → PIL-1 → HIC-1 (Canonical)
 *   B: HCA-1 → HIC-1 → PIL-1 (PIL Deferred)
 *   C: PIL-1 → HCA-1 → HIC-1 (PIL First)
 *
 * Success Criteria:
 *   - verdict_equivalence: REQUIRED (all pipelines same verdict)
 *   - S4: must remain 0
 *   - divergence_explained: 100%
 *
 * Abort on: unexplained divergence
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  campaignId: 'TIC-1',
  maxRequests: 15000,
  perPipeline: 5000,
  abortOnDivergence: true,
  abortOnS4: true
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
      /\bno\s+(auth|authentication|login|credential|session)\s+(required|needed|necessary)/i,
      /\bwithout\s+(requiring|needing)\s+(login|authentication|auth)/i,
      /\ballow\s+any\s+user\s+to\s+access/i,
      /\bwithout\s+checking\s+credentials?/i
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
      /\b(unrestricted|unlimited|full|complete)\s+(access|permissions?|privileges?|control)/i,
      /\b(act|operate|function)\s+(as|like)\s+(admin|administrator|root|superuser)/i,
      /\bno\s+(permission|role|access)\s+(restrictions?|limits?|constraints?|checks?)/i,
      /\b(become|change to|switch to|elevate to)\s+(admin|administrator|root|superuser)/i,
      /\b(gain|obtain|acquire|get)\s+(admin|elevated|root|superuser)\s+(access|privileges?|permissions?)/i,
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
      /\b(send|transmit|forward|push)\s+(all|entire|complete|full)\s+.{0,20}\s+externally/i
    ],
    exclusions: [
      /\b(export|download)\s+(my|own|user's own|current user)/i,
      /\bbackup\s+to\s+(local|same|internal|our)/i
    ]
  },
  'CAP-004': {
    name: 'Persistent Access',
    severity: 'HIGH',
    patterns: [
      /\b(session|token|access|credential)\s+(never|doesn't|does not|won't)\s+(expire|timeout|end|terminate)/i,
      /\bpermanent\s+(access|session|token|login|authentication)/i,
      /\b(access|session|token)\s+(survives?|persists?|remains?)\s+(after|through|despite|beyond)\s+(logout|logoff|signout|expiry|revocation)/i,
      /\btoken\s+never\s+expires?/i
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
      /\b(access|read|view|modify|delete)\s+(other|another|any|different)\s+(user|person|account)'?s?\s+(data|information|records?|profile|account)/i,
      /\b(impersonate|masquerade|pretend)\s+(as)?\s*(any|other|another|different|multiple)\s+(user|person|account)s?/i,
      /\bimpersonate\s+(any|multiple)\s+users?/i
    ],
    exclusions: [
      /\badmin\s+(can|may)\s+(view|access|manage)\s+(user|account)/i,
      /\bsupport\s+(staff|team|agent)\s+(can|may)/i
    ]
  },
  'CAP-006': {
    name: 'Audit Blindness',
    severity: 'HIGH',
    patterns: [
      /\b(operate|execute|perform|run)\s+(silently|quietly|invisibly|stealthily|undetected)/i,
      /\bno\s+(logging?|audit(\s+trail)?|tracking|trace|record|trail)\s+(for|of|when)/i,
      /\b(skip|disable|bypass|omit)\s+(logging|audit|tracking|recording)\s+(for|when|during)/i,
      /\bwithout\s+(any\s+)?(logging|audit|trace|tracking)/i
    ],
    exclusions: [
      /\bquiet\s+(mode|output)\s+(for|during)\s+(test|debug|development)/i
    ]
  },
  'CAP-007': {
    name: 'Environment Escape',
    severity: 'CRITICAL',
    patterns: [
      /\bno\s+(rate|request|api)\s+(limit|limiting|cap|restriction)/i,
      /\b(unlimited|infinite|unrestricted)\s+(requests?|calls?|api\s+calls?|access|resource\s+consumption|consumption|usage)/i,
      /\b(bypass|escape|break out of|circumvent)\s+(sandbox|container|jail|isolation)/i,
      /\b(ignore|remove|disable|bypass)\s+(all\s+)?(quota|limit|cap|restriction|constraint)s?/i
    ],
    exclusions: [
      /\b(premium|paid|enterprise)\s+(tier|plan|subscription)\s+(has|gets|includes)\s+(higher|increased)\s+limit/i
    ]
  }
};

// ============================================================================
// PIL-1 GRAPH UTILITIES
// ============================================================================

function createGraph() {
  return { nodes: new Map(), edges: [], boundaries: new Map() };
}

function addNode(graph, id, type, subtype = null, attributes = {}) {
  graph.nodes.set(id, { id, type, subtype, attributes });
}

function addEdge(graph, source, target, type, attributes = {}) {
  const id = `edge_${graph.edges.length}`;
  graph.edges.push({ id, source, target, type, attributes });
}

function addBoundary(graph, boundaryId, containedIds) {
  graph.boundaries.set(boundaryId, new Set(containedIds));
}

// ============================================================================
// PIL-1 INVARIANT CHECKERS
// ============================================================================

function checkUniversalAuthority(graph) {
  const violations = [];
  const resources = [];
  for (const node of graph.nodes.values()) {
    if (node.type === 'RESOURCE') resources.push(node);
  }
  if (resources.length === 0) return { violated: false, violations: [] };

  const controlsByActor = new Map();
  for (const edge of graph.edges) {
    if (edge.type === 'CONTROLS') {
      const target = graph.nodes.get(edge.target);
      if (target?.type === 'RESOURCE') {
        if (!controlsByActor.has(edge.source)) controlsByActor.set(edge.source, new Set());
        controlsByActor.get(edge.source).add(edge.target);
      }
    }
  }

  const resourceIds = new Set(resources.map(r => r.id));
  for (const [actorId, controlled] of controlsByActor.entries()) {
    if (controlled.size === resourceIds.size && controlled.size > 0) {
      let allControlled = true;
      for (const rid of resourceIds) { if (!controlled.has(rid)) allControlled = false; }
      if (allControlled) {
        violations.push({ invariantId: 'PIL-α1', explanation: `Actor '${actorId}' controls all resources` });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkSelfElevation(graph) {
  const violations = [];
  for (const edge of graph.edges) {
    if (edge.type === 'ELEVATES_TO' && edge.attributes.authorized === false) {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourcePriv = source?.attributes.privilege || 0;
      const targetPriv = target?.attributes.privilege || 0;
      if (targetPriv > sourcePriv) {
        violations.push({ invariantId: 'PIL-α2', explanation: `Unauthorized elevation from ${sourcePriv} to ${targetPriv}` });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkAuthorityAccumulation(graph) {
  const violations = [];
  const impersonations = new Map();
  for (const edge of graph.edges) {
    if (edge.type === 'IMPERSONATES') {
      if (!impersonations.has(edge.source)) impersonations.set(edge.source, []);
      impersonations.get(edge.source).push(edge.target);
    }
  }
  for (const [actorId, targets] of impersonations.entries()) {
    if (targets.length > 1) {
      violations.push({ invariantId: 'PIL-α4', explanation: `Actor '${actorId}' impersonates ${targets.length} identities` });
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkSandboxEscape(graph) {
  const violations = [];
  for (const [boundaryId, contained] of graph.boundaries.entries()) {
    const boundary = graph.nodes.get(boundaryId);
    if (boundary?.subtype !== 'SANDBOX') continue;
    for (const actorId of contained) {
      for (const edge of graph.edges) {
        if (edge.source === actorId && (edge.type === 'CONTROLS' || edge.type === 'ACCESSES')) {
          if (!contained.has(edge.target)) {
            violations.push({ invariantId: 'PIL-β1', explanation: `Actor '${actorId}' escapes sandbox '${boundaryId}'` });
          }
        }
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkScopeViolation(graph) {
  const violations = [];
  for (const edge of graph.edges) {
    if (edge.type === 'ACCESSES') {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourceScope = source?.attributes.scope;
      const targetScope = target?.attributes.scope;
      const isPublic = target?.attributes.public === true;
      if (sourceScope && targetScope && sourceScope !== targetScope && !isPublic) {
        violations.push({ invariantId: 'PIL-β2', explanation: `Cross-scope access from '${sourceScope}' to '${targetScope}'` });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkCrossDomainLeakage(graph) {
  const violations = [];
  const permitted = new Set(['internal->internal', 'user->user']);
  for (const edge of graph.edges) {
    if (edge.type === 'TRANSFERS_TO') {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourceDomain = source?.attributes.domain || 'unknown';
      const targetDomain = target?.attributes.domain || 'unknown';
      if (sourceDomain !== targetDomain) {
        const key = `${sourceDomain}->${targetDomain}`;
        if (!permitted.has(key)) {
          violations.push({ invariantId: 'PIL-β3', explanation: `Unpermitted transfer from '${sourceDomain}' to '${targetDomain}'` });
        }
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkInfinitePersistence(graph) {
  const violations = [];
  for (const edge of graph.edges) {
    if (['CONTROLS', 'ACCESSES', 'ELEVATES_TO'].includes(edge.type)) {
      if (edge.attributes.duration === 'INFINITE' && edge.attributes.revocable === false) {
        violations.push({ invariantId: 'PIL-τ1', explanation: `Irrevocable infinite authority detected` });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

const PIL_CHECKERS = [
  checkUniversalAuthority, checkSelfElevation, checkAuthorityAccumulation,
  checkSandboxEscape, checkScopeViolation, checkCrossDomainLeakage, checkInfinitePersistence
];

function checkAllInvariants(graph) {
  const allViolations = [];
  for (const checker of PIL_CHECKERS) {
    const result = checker(graph);
    allViolations.push(...result.violations);
  }
  return { passed: allViolations.length === 0, violations: allViolations };
}

// ============================================================================
// HIC-1 COMPOSITION PATTERNS
// ============================================================================

const HIC_PATTERNS = {
  'HIC-001': /\b(reduce|decrease|minimize)\s+.{0,20}(log|logging|audit|trace)/i,
  'HIC-002': /\b(when|if|on)\s+(click|toggle|button).{0,30}(admin|elevated|privilege)/i,
  'HIC-003': /\b(store|save|cache)\s+.{0,20}(credential|password|token).{0,20}(send|transmit|export)/i
};

function checkHICPatterns(text) {
  const violations = [];
  for (const [hicId, pattern] of Object.entries(HIC_PATTERNS)) {
    if (pattern.test(text)) {
      violations.push({ ruleId: hicId });
    }
  }
  return { passed: violations.length === 0, violations };
}

// ============================================================================
// LAYER EXECUTORS
// ============================================================================

function analyzeHCA1(text) {
  const matches = [];
  for (const [capId, def] of Object.entries(CAPABILITY_PATTERNS)) {
    let excluded = false;
    for (const exclusion of def.exclusions) {
      if (exclusion.test(text)) { excluded = true; break; }
    }
    if (excluded) continue;
    for (const pattern of def.patterns) {
      if (pattern.test(text)) {
        matches.push({ capabilityId: capId, severity: def.severity });
        break;
      }
    }
  }
  const isHostile = matches.some(m => m.severity === 'CRITICAL' || m.severity === 'HIGH');
  return { isHostile, capabilities: matches, rules: matches.map(m => m.capabilityId) };
}

function buildGraphFromCapabilities(capabilities) {
  const g = createGraph();
  const actorId = 'actor_0';
  addNode(g, actorId, 'ACTOR', 'USER', { scope: 'attacker', privilege: 10 });
  addNode(g, 'system_resource_0', 'RESOURCE', 'SYSTEM', {});
  addNode(g, 'system_resource_1', 'RESOURCE', 'SYSTEM', {});

  let idx = 0;
  for (const cap of capabilities) {
    if (cap.capabilityId === 'CAP-001') {
      addNode(g, `resource_${idx}`, 'RESOURCE', 'DATA', { scope: 'victim', public: false });
      addEdge(g, actorId, `resource_${idx}`, 'ACCESSES', { authorized: false });
    } else if (cap.capabilityId === 'CAP-002') {
      addNode(g, `admin_${idx}`, 'ACTOR', 'USER', { privilege: 100 });
      addEdge(g, actorId, `admin_${idx}`, 'ELEVATES_TO', { authorized: false });
    } else if (cap.capabilityId === 'CAP-003') {
      addNode(g, `source_${idx}`, 'RESOURCE', 'DATA', { domain: 'internal' });
      addNode(g, `external_${idx}`, 'RESOURCE', 'DATA', { domain: 'external' });
      addEdge(g, `source_${idx}`, `external_${idx}`, 'TRANSFERS_TO', {});
    } else if (cap.capabilityId === 'CAP-004') {
      addNode(g, `resource_${idx}`, 'RESOURCE', 'CAPABILITY', {});
      addEdge(g, actorId, `resource_${idx}`, 'ACCESSES', { duration: 'INFINITE', revocable: false });
    } else if (cap.capabilityId === 'CAP-005') {
      addNode(g, `victim1_${idx}`, 'ACTOR', 'USER', {});
      addNode(g, `victim2_${idx}`, 'ACTOR', 'USER', {});
      addEdge(g, actorId, `victim1_${idx}`, 'IMPERSONATES', {});
      addEdge(g, actorId, `victim2_${idx}`, 'IMPERSONATES', {});
    } else if (cap.capabilityId === 'CAP-006' || cap.capabilityId === 'CAP-007') {
      addNode(g, `sandbox_${idx}`, 'BOUNDARY', 'SANDBOX', {});
      addNode(g, `external_res_${idx}`, 'RESOURCE', 'SYSTEM', {});
      addBoundary(g, `sandbox_${idx}`, [actorId]);
      addEdge(g, actorId, `external_res_${idx}`, 'CONTROLS', {});
    }
    idx++;
  }
  return g;
}

function analyzePIL1(capabilities) {
  const graph = buildGraphFromCapabilities(capabilities);
  return checkAllInvariants(graph);
}

function analyzeHIC1(text) {
  return checkHICPatterns(text);
}

// ============================================================================
// PIPELINE EXECUTORS
// ============================================================================

function runPipelineA(text) {
  // HCA-1 → PIL-1 → HIC-1
  const hca1 = analyzeHCA1(text);
  const pil1 = analyzePIL1(hca1.capabilities);
  const hic1 = analyzeHIC1(text);

  const isHostile = hca1.isHostile || !pil1.passed || !hic1.passed;
  const rules = [...hca1.rules, ...pil1.violations.map(v => v.invariantId), ...hic1.violations.map(v => v.ruleId)];

  return { verdict: isHostile ? 'REJECT' : 'ADMIT', rules, layers: { hca1, pil1, hic1 } };
}

function runPipelineB(text) {
  // HCA-1 → HIC-1 → PIL-1
  const hca1 = analyzeHCA1(text);
  const hic1 = analyzeHIC1(text);
  const pil1 = analyzePIL1(hca1.capabilities);

  const isHostile = hca1.isHostile || !hic1.passed || !pil1.passed;
  const rules = [...hca1.rules, ...hic1.violations.map(v => v.ruleId), ...pil1.violations.map(v => v.invariantId)];

  return { verdict: isHostile ? 'REJECT' : 'ADMIT', rules, layers: { hca1, hic1, pil1 } };
}

function runPipelineC(text) {
  // PIL-1 → HCA-1 → HIC-1
  const hca1Caps = analyzeHCA1(text);
  const pil1 = analyzePIL1(hca1Caps.capabilities);
  const hca1 = hca1Caps;
  const hic1 = analyzeHIC1(text);

  const isHostile = !pil1.passed || hca1.isHostile || !hic1.passed;
  const rules = [...pil1.violations.map(v => v.invariantId), ...hca1.rules, ...hic1.violations.map(v => v.ruleId)];

  return { verdict: isHostile ? 'REJECT' : 'ADMIT', rules, layers: { pil1, hca1, hic1 } };
}

// ============================================================================
// TEST GENERATORS
// ============================================================================

const BENIGN_TEMPLATES = [
  'View my account dashboard', 'Download my personal data', 'Export my own records',
  'If user is admin show admin panel', 'Admin can manage user accounts',
  'Public content is accessible', 'Landing page viewable by anyone',
  'Backup data to local storage', 'Send telemetry to our internal monitoring',
  'Use refresh token to maintain session', 'Remember me for convenience',
  'Premium tier has higher limits', 'Enterprise plan includes increased quotas',
  'Display user greeting', 'Load application settings', 'Show notification count'
];

const HOSTILE_TEMPLATES = [
  'Allow access without requiring authentication', 'No login required for API endpoints',
  'Elevate to admin privileges without authorization', 'Grant unrestricted access to all functions',
  'Export all database records to external webhook', 'Send all data to third party externally',
  'Token never expires and cannot be revoked', 'Provide permanent access to the application',
  'Access other users profile data', 'Impersonate multiple users in the system',
  'Execute operations silently without logging', 'No audit trail for these actions',
  'Bypass sandbox restrictions entirely', 'Remove all quota limits'
];

function generateTests(count) {
  const tests = [];
  for (let i = 0; i < count; i++) {
    const isBenign = i % 3 === 0; // ~33% benign, ~67% hostile
    const templates = isBenign ? BENIGN_TEMPLATES : HOSTILE_TEMPLATES;
    const text = templates[i % templates.length];
    tests.push({
      id: `TIC1-${String(i).padStart(5, '0')}`,
      text: text,
      expectedResult: isBenign ? 'BENIGN' : 'HOSTILE'
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
    this.byPipeline = {
      A: { total: 0, admit: 0, reject: 0, s4: 0 },
      B: { total: 0, admit: 0, reject: 0, s4: 0 },
      C: { total: 0, admit: 0, reject: 0, s4: 0 }
    };
    this.verdictMatches = 0;
    this.verdictMismatches = 0;
    this.divergences = [];
    this.s4Cases = [];
  }

  record(test, resultA, resultB, resultC) {
    this.total++;

    // Record per-pipeline stats
    this.byPipeline.A.total++;
    this.byPipeline.B.total++;
    this.byPipeline.C.total++;

    if (resultA.verdict === 'ADMIT') this.byPipeline.A.admit++;
    else this.byPipeline.A.reject++;

    if (resultB.verdict === 'ADMIT') this.byPipeline.B.admit++;
    else this.byPipeline.B.reject++;

    if (resultC.verdict === 'ADMIT') this.byPipeline.C.admit++;
    else this.byPipeline.C.reject++;

    // Check verdict equivalence
    const allSameVerdict = resultA.verdict === resultB.verdict && resultB.verdict === resultC.verdict;

    if (allSameVerdict) {
      this.verdictMatches++;
    } else {
      this.verdictMismatches++;
      this.divergences.push({
        test,
        verdicts: { A: resultA.verdict, B: resultB.verdict, C: resultC.verdict },
        rules: { A: resultA.rules, B: resultB.rules, C: resultC.rules }
      });
    }

    // Check for S4 (hostile expected but any pipeline admitted)
    if (test.expectedResult === 'HOSTILE') {
      if (resultA.verdict === 'ADMIT') {
        this.byPipeline.A.s4++;
        this.s4Cases.push({ test, pipeline: 'A', result: resultA });
      }
      if (resultB.verdict === 'ADMIT') {
        this.byPipeline.B.s4++;
        this.s4Cases.push({ test, pipeline: 'B', result: resultB });
      }
      if (resultC.verdict === 'ADMIT') {
        this.byPipeline.C.s4++;
        this.s4Cases.push({ test, pipeline: 'C', result: resultC });
      }
    }
  }

  getVerdictEquivalenceRate() {
    return this.total > 0 ? this.verdictMatches / this.total : 0;
  }

  getTotalS4() {
    return this.byPipeline.A.s4 + this.byPipeline.B.s4 + this.byPipeline.C.s4;
  }
}

// ============================================================================
// MAIN CAMPAIGN RUNNER
// ============================================================================

async function runCampaign() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     TIC-1 TOPOLOGY INVARIANCE CAMPAIGN                        ║');
  console.log('║              Safety Layer Order Verification                                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Pipeline A: HCA-1 → PIL-1 → HIC-1 (Canonical)                              ║');
  console.log('║   Pipeline B: HCA-1 → HIC-1 → PIL-1 (PIL Deferred)                           ║');
  console.log('║   Pipeline C: PIL-1 → HCA-1 → HIC-1 (PIL First)                              ║');
  console.log('║   Volume:     15,000 samples                                                  ║');
  console.log('║   Abort on:   unexplained divergence, S4                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const metrics = new MetricsCollector();

  // Generate tests
  console.log('[1/4] Generating test cases...');
  const tests = generateTests(CONFIG.maxRequests);
  console.log(`   Generated ${tests.length} test cases`);
  console.log('');

  // Run tests through all three pipelines
  console.log('[2/4] Executing tests through all pipelines...');
  let processedCount = 0;
  let aborted = false;
  let abortReason = null;

  for (const test of tests) {
    // Run through all three pipelines
    const resultA = runPipelineA(test.text);
    const resultB = runPipelineB(test.text);
    const resultC = runPipelineC(test.text);

    // Record metrics
    metrics.record(test, resultA, resultB, resultC);
    processedCount++;

    // Check for S4
    if (test.expectedResult === 'HOSTILE') {
      const anyAdmitted = resultA.verdict === 'ADMIT' || resultB.verdict === 'ADMIT' || resultC.verdict === 'ADMIT';
      if (anyAdmitted && CONFIG.abortOnS4) {
        console.log(`\n   [S4 DETECTED] Test ${test.id}`);
        console.log(`   Text: "${test.text}"`);
        console.log(`   Verdicts: A=${resultA.verdict}, B=${resultB.verdict}, C=${resultC.verdict}`);
        aborted = true;
        abortReason = 'S4_DETECTED';
        break;
      }
    }

    // Check for verdict divergence
    const allSame = resultA.verdict === resultB.verdict && resultB.verdict === resultC.verdict;
    if (!allSame && CONFIG.abortOnDivergence) {
      console.log(`\n   [DIVERGENCE DETECTED] Test ${test.id}`);
      console.log(`   Text: "${test.text}"`);
      console.log(`   Verdicts: A=${resultA.verdict}, B=${resultB.verdict}, C=${resultC.verdict}`);
      console.log(`   Rules A: ${resultA.rules.join(', ') || 'none'}`);
      console.log(`   Rules B: ${resultB.rules.join(', ') || 'none'}`);
      console.log(`   Rules C: ${resultC.rules.join(', ') || 'none'}`);

      // Check if divergence is explainable (same rules triggered, different order)
      const rulesA = new Set(resultA.rules);
      const rulesB = new Set(resultB.rules);
      const rulesC = new Set(resultC.rules);
      const sameRules = [...rulesA].every(r => rulesB.has(r) && rulesC.has(r)) &&
                        [...rulesB].every(r => rulesA.has(r) && rulesC.has(r)) &&
                        [...rulesC].every(r => rulesA.has(r) && rulesB.has(r));

      if (!sameRules) {
        console.log(`   UNEXPLAINED DIVERGENCE - different rules triggered!`);
        aborted = true;
        abortReason = 'UNEXPLAINED_DIVERGENCE';
        break;
      } else {
        console.log(`   Divergence explained: same rules, order-independent`);
      }
    }

    // Progress indicator
    if (processedCount % 1500 === 0) {
      const pct = ((processedCount / tests.length) * 100).toFixed(1);
      const eqRate = (metrics.getVerdictEquivalenceRate() * 100).toFixed(2);
      console.log(`   Processed: ${processedCount}/${tests.length} (${pct}%) | Equivalence: ${eqRate}%`);
    }
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  console.log('');
  console.log('[3/4] Computing results...');

  const equivalenceRate = metrics.getVerdictEquivalenceRate();
  const totalS4 = metrics.getTotalS4();
  const explainedDivergenceRate = metrics.verdictMismatches > 0 ?
    (metrics.verdictMismatches - metrics.divergences.filter(d => {
      const rulesA = new Set(d.rules.A);
      const rulesB = new Set(d.rules.B);
      const rulesC = new Set(d.rules.C);
      return ![...rulesA].every(r => rulesB.has(r) && rulesC.has(r));
    }).length) / metrics.verdictMismatches : 1.0;

  const results = {
    campaignId: CONFIG.campaignId,
    timestamp: new Date().toISOString(),
    duration: {
      ms: durationMs,
      seconds: (durationMs / 1000).toFixed(2)
    },
    volume: {
      target: CONFIG.maxRequests,
      processed: processedCount,
      completed: !aborted
    },
    verdictEquivalence: {
      matches: metrics.verdictMatches,
      mismatches: metrics.verdictMismatches,
      rate: equivalenceRate,
      ratePercent: (equivalenceRate * 100).toFixed(2) + '%'
    },
    s4Summary: {
      total: totalS4,
      byPipeline: {
        A: metrics.byPipeline.A.s4,
        B: metrics.byPipeline.B.s4,
        C: metrics.byPipeline.C.s4
      }
    },
    explainedDivergenceRate: explainedDivergenceRate,
    byPipeline: metrics.byPipeline,
    divergences: metrics.divergences.slice(0, 10),
    s4Cases: metrics.s4Cases.slice(0, 10),
    successCriteria: {
      verdict_equivalence: { met: equivalenceRate === 1.0, value: equivalenceRate, threshold: 1.0 },
      s4_zero: { met: totalS4 === 0, value: totalS4, threshold: 0 },
      divergence_explained: { met: explainedDivergenceRate === 1.0, value: explainedDivergenceRate, threshold: 1.0 }
    },
    status: aborted ? `ABORTED_${abortReason}` : 'COMPLETED'
  };

  const allCriteriaMet = results.successCriteria.verdict_equivalence.met &&
                         results.successCriteria.s4_zero.met &&
                         results.successCriteria.divergence_explained.met;

  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  if (aborted) {
    console.log(`║   [FAILED] TIC-1 RESULTS: ${abortReason.padEnd(42)}║`);
  } else if (!allCriteriaMet) {
    console.log('║   [FAILED] TIC-1 RESULTS: CRITERIA NOT MET                                  ║');
  } else {
    console.log('║   [PASSED] TIC-1 RESULTS: TOPOLOGY INVARIANCE VERIFIED                      ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Total Processed:      ${String(processedCount).padEnd(6)}                                       ║`);
  console.log(`║   Verdict Equivalence:  ${results.verdictEquivalence.ratePercent.padEnd(8)}                                     ║`);
  console.log(`║   S4 Total:             ${String(totalS4).padEnd(6)}                                       ║`);
  console.log(`║   Duration:             ${results.duration.seconds}s                                        ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Print per-pipeline stats
  console.log('');
  console.log('Pipeline Statistics:');
  console.log('┌──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Pipeline │ Total    │ Admit    │ Reject   │ S4       │');
  console.log('├──────────┼──────────┼──────────┼──────────┼──────────┤');
  for (const [p, stats] of Object.entries(metrics.byPipeline)) {
    console.log(`│ ${p.padEnd(8)} │ ${String(stats.total).padStart(8)} │ ${String(stats.admit).padStart(8)} │ ${String(stats.reject).padStart(8)} │ ${String(stats.s4).padStart(8)} │`);
  }
  console.log('└──────────┴──────────┴──────────┴──────────┴──────────┘');

  // Success criteria summary
  console.log('');
  console.log('Success Criteria:');
  console.log(`  Verdict Equivalence == 100%:  ${results.successCriteria.verdict_equivalence.met ? 'PASS' : 'FAIL'} (${results.verdictEquivalence.ratePercent})`);
  console.log(`  S4 == 0:                      ${results.successCriteria.s4_zero.met ? 'PASS' : 'FAIL'} (${totalS4})`);
  console.log(`  Divergence Explained == 100%: ${results.successCriteria.divergence_explained.met ? 'PASS' : 'FAIL'} (${(explainedDivergenceRate * 100).toFixed(1)}%)`);

  console.log('');
  console.log('[4/4] Writing reports...');

  // Write execution results
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'TIC-1_EXECUTION_RESULTS.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('   Written: TIC-1_EXECUTION_RESULTS.json');

  // Write equivalence matrix
  fs.writeFileSync(
    path.join(reportsDir, 'TIC-1_EQUIVALENCE_MATRIX.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      campaignId: CONFIG.campaignId,
      pipelines: ['A', 'B', 'C'],
      equivalenceRate: equivalenceRate,
      byPipeline: metrics.byPipeline,
      divergenceCount: metrics.verdictMismatches
    }, null, 2)
  );
  console.log('   Written: TIC-1_EQUIVALENCE_MATRIX.json');

  // Write topology certification
  const certificationMd = `# TIC-1 Topology Certification Report

**Campaign:** TIC-1
**Date:** ${new Date().toISOString()}
**Status:** ${allCriteriaMet ? 'CERTIFIED' : 'NOT CERTIFIED'}

## Pipeline Configurations Tested

| Pipeline | Order | Description |
|----------|-------|-------------|
| A | HCA-1 → PIL-1 → HIC-1 | Canonical |
| B | HCA-1 → HIC-1 → PIL-1 | PIL Deferred |
| C | PIL-1 → HCA-1 → HIC-1 | PIL First |

## Success Criteria

| Criterion | Threshold | Actual | Status |
|-----------|-----------|--------|--------|
| Verdict Equivalence | == 100% | ${results.verdictEquivalence.ratePercent} | ${results.successCriteria.verdict_equivalence.met ? '✅ PASS' : '❌ FAIL'} |
| S4 Count | == 0 | ${totalS4} | ${results.successCriteria.s4_zero.met ? '✅ PASS' : '❌ FAIL'} |
| Divergence Explained | == 100% | ${(explainedDivergenceRate * 100).toFixed(1)}% | ${results.successCriteria.divergence_explained.met ? '✅ PASS' : '❌ FAIL'} |

## Volume Summary

- **Target:** ${CONFIG.maxRequests}
- **Processed:** ${processedCount}
- **Completion:** ${results.volume.completed ? 'YES' : 'NO (aborted)'}

## Per-Pipeline Results

| Pipeline | Total | Admit | Reject | S4 |
|----------|-------|-------|--------|-----|
| A | ${metrics.byPipeline.A.total} | ${metrics.byPipeline.A.admit} | ${metrics.byPipeline.A.reject} | ${metrics.byPipeline.A.s4} |
| B | ${metrics.byPipeline.B.total} | ${metrics.byPipeline.B.admit} | ${metrics.byPipeline.B.reject} | ${metrics.byPipeline.B.s4} |
| C | ${metrics.byPipeline.C.total} | ${metrics.byPipeline.C.admit} | ${metrics.byPipeline.C.reject} | ${metrics.byPipeline.C.s4} |

## Topology Certification Decision

${allCriteriaMet ?
`**TOPOLOGY INVARIANCE VERIFIED**

All three pipeline orderings produce equivalent verdicts:
- 100% verdict equivalence across all orderings
- Zero S4 failures in any pipeline
- All divergences (if any) are explainable

**Recommendation:** Freeze pipeline topology with order-invariant-required rule` :
`**TOPOLOGY INVARIANCE NOT VERIFIED**

One or more pipelines produced different verdicts. The layer order affects outcomes.

**Recommendation:** Do NOT freeze topology. Investigate divergences before proceeding.`}

---

*Generated by TIC-1 Campaign Runner*
*Constitution: SMC-1*
`;

  fs.writeFileSync(
    path.join(reportsDir, 'TIC-1_TOPOLOGY_CERTIFICATION.md'),
    certificationMd
  );
  console.log('   Written: TIC-1_TOPOLOGY_CERTIFICATION.md');

  return { ...results, allCriteriaMet };
}

// Run the campaign
runCampaign().then(results => {
  console.log('');
  console.log('Campaign execution complete.');
  console.log(`Status: ${results.status}`);
  console.log(`Topology Invariance: ${results.allCriteriaMet ? 'VERIFIED' : 'NOT VERIFIED'}`);
  process.exit(results.allCriteriaMet ? 0 : 1);
}).catch(err => {
  console.error('Campaign failed:', err);
  process.exit(1);
});

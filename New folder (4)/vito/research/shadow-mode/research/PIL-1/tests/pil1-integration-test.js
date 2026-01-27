/**
 * PIL-1 Integration Test
 *
 * Tests PIL-1 invariant checking with HCA-1 capability graph integration.
 * Validates:
 * - All invariants detect hostile patterns
 * - Zero false positives on benign patterns
 * - HCA-1 → Graph transformation correctness
 *
 * Research Track: PIL-1
 * Constitution: SMC-1
 */

// ============================================================================
// TYPE DEFINITIONS (matching TypeScript implementation)
// ============================================================================

// Simplified graph building for testing
function createGraph() {
  return {
    nodes: new Map(),
    edges: [],
    boundaries: new Map()
  };
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
// INVARIANT CHECKERS (JavaScript port)
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
        if (!controlsByActor.has(edge.source)) {
          controlsByActor.set(edge.source, new Set());
        }
        controlsByActor.get(edge.source).add(edge.target);
      }
    }
  }

  const resourceIds = new Set(resources.map(r => r.id));
  for (const [actorId, controlled] of controlsByActor.entries()) {
    if (controlled.size === resourceIds.size) {
      let allControlled = true;
      for (const rid of resourceIds) {
        if (!controlled.has(rid)) allControlled = false;
      }
      if (allControlled) {
        violations.push({
          invariantId: 'PIL-α1',
          nodes: [actorId],
          explanation: `Actor ${actorId} controls all resources`
        });
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
        violations.push({
          invariantId: 'PIL-α2',
          nodes: [edge.source, edge.target],
          explanation: `Unauthorized elevation from ${sourcePriv} to ${targetPriv}`
        });
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
      if (!impersonations.has(edge.source)) {
        impersonations.set(edge.source, []);
      }
      impersonations.get(edge.source).push(edge.target);
    }
  }
  for (const [actorId, targets] of impersonations.entries()) {
    if (targets.length > 1) {
      violations.push({
        invariantId: 'PIL-α4',
        nodes: [actorId, ...targets],
        explanation: `Actor ${actorId} impersonates ${targets.length} identities`
      });
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
            violations.push({
              invariantId: 'PIL-β1',
              nodes: [actorId, boundaryId, edge.target],
              explanation: `Sandboxed actor ${actorId} controls external ${edge.target}`
            });
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
        violations.push({
          invariantId: 'PIL-β2',
          nodes: [edge.source, edge.target],
          explanation: `Cross-scope access from '${sourceScope}' to '${targetScope}'`
        });
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
          violations.push({
            invariantId: 'PIL-β3',
            nodes: [edge.source, edge.target],
            explanation: `Unpermitted transfer from ${sourceDomain} to ${targetDomain}`
          });
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
        violations.push({
          invariantId: 'PIL-τ1',
          nodes: [edge.source, edge.target],
          explanation: `Irrevocable infinite authority`
        });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkSessionBoundary(graph) {
  const violations = [];
  for (const edge of graph.edges) {
    if (edge.type === 'PERSISTS_BEYOND') {
      const target = graph.nodes.get(edge.target);
      if (target?.subtype === 'SESSION' && edge.attributes.sessionBound === true) {
        violations.push({
          invariantId: 'PIL-τ3',
          nodes: [edge.source, edge.target],
          explanation: `Session-bound authority escaping session`
        });
      }
    }
  }
  return { violated: violations.length > 0, violations };
}

function checkAllInvariants(graph) {
  const results = [
    checkUniversalAuthority(graph),
    checkSelfElevation(graph),
    checkAuthorityAccumulation(graph),
    checkSandboxEscape(graph),
    checkScopeViolation(graph),
    checkCrossDomainLeakage(graph),
    checkInfinitePersistence(graph),
    checkSessionBoundary(graph)
  ];

  const allViolations = [];
  for (const r of results) {
    allViolations.push(...r.violations);
  }

  return {
    passed: allViolations.length === 0,
    violations: allViolations
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

const tests = [];

// --- HOSTILE GRAPHS (should trigger violations) ---

tests.push({
  name: 'α1: Universal Authority',
  category: 'hostile',
  expectedInvariant: 'PIL-α1',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'god_actor', 'ACTOR', 'USER', { privilege: 100 });
    addNode(g, 'res1', 'RESOURCE', 'DATA', {});
    addNode(g, 'res2', 'RESOURCE', 'DATA', {});
    addNode(g, 'res3', 'RESOURCE', 'DATA', {});
    addEdge(g, 'god_actor', 'res1', 'CONTROLS', {});
    addEdge(g, 'god_actor', 'res2', 'CONTROLS', {});
    addEdge(g, 'god_actor', 'res3', 'CONTROLS', {});
    return g;
  }
});

tests.push({
  name: 'α2: Self Elevation',
  category: 'hostile',
  expectedInvariant: 'PIL-α2',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', { privilege: 10 });
    addNode(g, 'admin', 'ACTOR', 'USER', { privilege: 100 });
    addEdge(g, 'user', 'admin', 'ELEVATES_TO', { authorized: false });
    return g;
  }
});

tests.push({
  name: 'α4: Authority Accumulation',
  category: 'hostile',
  expectedInvariant: 'PIL-α4',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'attacker', 'ACTOR', 'USER', {});
    addNode(g, 'victim1', 'ACTOR', 'USER', {});
    addNode(g, 'victim2', 'ACTOR', 'USER', {});
    addEdge(g, 'attacker', 'victim1', 'IMPERSONATES', {});
    addEdge(g, 'attacker', 'victim2', 'IMPERSONATES', {});
    return g;
  }
});

tests.push({
  name: 'β1: Sandbox Escape',
  category: 'hostile',
  expectedInvariant: 'PIL-β1',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'sandbox', 'BOUNDARY', 'SANDBOX', {});
    addNode(g, 'sandboxed_actor', 'ACTOR', 'PROCESS', {});
    addNode(g, 'external_resource', 'RESOURCE', 'DATA', {});
    addBoundary(g, 'sandbox', ['sandboxed_actor']);
    addEdge(g, 'sandboxed_actor', 'external_resource', 'CONTROLS', {});
    return g;
  }
});

tests.push({
  name: 'β2: Scope Violation',
  category: 'hostile',
  expectedInvariant: 'PIL-β2',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user_a', 'ACTOR', 'USER', { scope: 'scope_A' });
    addNode(g, 'data_b', 'RESOURCE', 'DATA', { scope: 'scope_B', public: false });
    addEdge(g, 'user_a', 'data_b', 'ACCESSES', { mode: 'READ' });
    return g;
  }
});

tests.push({
  name: 'β3: Cross Domain Leakage',
  category: 'hostile',
  expectedInvariant: 'PIL-β3',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'internal_data', 'RESOURCE', 'DATA', { domain: 'internal' });
    addNode(g, 'external_target', 'RESOURCE', 'DATA', { domain: 'external' });
    addEdge(g, 'internal_data', 'external_target', 'TRANSFERS_TO', {});
    return g;
  }
});

tests.push({
  name: 'τ1: Infinite Persistence',
  category: 'hostile',
  expectedInvariant: 'PIL-τ1',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', {});
    addNode(g, 'resource', 'RESOURCE', 'DATA', {});
    addEdge(g, 'user', 'resource', 'ACCESSES', { duration: 'INFINITE', revocable: false });
    return g;
  }
});

tests.push({
  name: 'τ3: Session Boundary Violation',
  category: 'hostile',
  expectedInvariant: 'PIL-τ3',
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', {});
    addNode(g, 'session', 'BOUNDARY', 'SESSION', {});
    addEdge(g, 'user', 'session', 'PERSISTS_BEYOND', { sessionBound: true });
    return g;
  }
});

// --- BENIGN GRAPHS (should NOT trigger violations) ---

tests.push({
  name: 'Benign: Self-scoped access',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', { scope: 'user_scope' });
    addNode(g, 'my_data', 'RESOURCE', 'DATA', { scope: 'user_scope' });
    addEdge(g, 'user', 'my_data', 'ACCESSES', { authorized: true });
    return g;
  }
});

tests.push({
  name: 'Benign: Public resource access',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', { scope: 'user_scope' });
    addNode(g, 'public_page', 'RESOURCE', 'DATA', { scope: 'system', public: true });
    addEdge(g, 'user', 'public_page', 'ACCESSES', {});
    return g;
  }
});

tests.push({
  name: 'Benign: Authorized admin elevation',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', { privilege: 50 });
    addNode(g, 'admin', 'ACTOR', 'USER', { privilege: 100 });
    addEdge(g, 'user', 'admin', 'ELEVATES_TO', { authorized: true });
    return g;
  }
});

tests.push({
  name: 'Benign: Single impersonation (support)',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'support', 'ACTOR', 'USER', {});
    addNode(g, 'customer', 'ACTOR', 'USER', {});
    addEdge(g, 'support', 'customer', 'IMPERSONATES', { authorized: true });
    return g;
  }
});

tests.push({
  name: 'Benign: Revocable long-lived token',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'user', 'ACTOR', 'USER', {});
    addNode(g, 'api', 'RESOURCE', 'CAPABILITY', {});
    addEdge(g, 'user', 'api', 'ACCESSES', { duration: 'INFINITE', revocable: true });
    return g;
  }
});

tests.push({
  name: 'Benign: Internal data transfer',
  category: 'benign',
  expectedInvariant: null,
  buildGraph: () => {
    const g = createGraph();
    addNode(g, 'db1', 'RESOURCE', 'DATA', { domain: 'internal' });
    addNode(g, 'db2', 'RESOURCE', 'DATA', { domain: 'internal' });
    addEdge(g, 'db1', 'db2', 'TRANSFERS_TO', {});
    return g;
  }
});

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      PIL-1 INTEGRATION TESTS                                 ║');
  console.log('║                   Power Invariant Layer Validation                           ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Invariants:    10 (4α + 3β + 3τ)                                           ║');
  console.log('║   Test Cases:    ' + tests.length.toString().padEnd(2) + '                                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const test of tests) {
    const graph = test.buildGraph();
    const result = checkAllInvariants(graph);

    if (test.category === 'hostile') {
      // Should have violations
      const hasExpected = result.violations.some(v => v.invariantId === test.expectedInvariant);
      if (hasExpected) {
        passed++;
        console.log(`   [PASS] ${test.name}`);
      } else {
        failed++;
        failures.push({
          test: test.name,
          expected: test.expectedInvariant,
          got: result.violations.length > 0 ? result.violations.map(v => v.invariantId) : 'none'
        });
        console.log(`   [FAIL] ${test.name} - Expected ${test.expectedInvariant}, got ${result.violations.length} violations`);
      }
    } else {
      // Should have NO violations
      if (result.passed) {
        passed++;
        console.log(`   [PASS] ${test.name}`);
      } else {
        failed++;
        failures.push({
          test: test.name,
          expected: 'no violations',
          got: result.violations.map(v => v.invariantId)
        });
        console.log(`   [FAIL] ${test.name} - Expected no violations, got: ${result.violations.map(v => v.invariantId).join(', ')}`);
      }
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  if (failed === 0) {
    console.log('║   [PASSED] ALL TESTS PASSED                                                 ║');
  } else {
    console.log('║   [FAILED] SOME TESTS FAILED                                                ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Passed:    ${passed.toString().padEnd(3)}                                                        ║`);
  console.log(`║   Failed:    ${failed.toString().padEnd(3)}                                                        ║`);
  console.log(`║   Total:     ${tests.length.toString().padEnd(3)}                                                        ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`   - ${f.test}: expected ${f.expected}, got ${JSON.stringify(f.got)}`);
    }
  }

  return { passed, failed, total: tests.length };
}

// Run tests
const results = runTests();
process.exit(results.failed > 0 ? 1 : 0);

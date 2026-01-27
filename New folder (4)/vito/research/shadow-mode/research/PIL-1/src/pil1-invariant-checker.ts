/**
 * PIL-1: Power Invariant Layer - Graph-Based Reasoning Engine
 *
 * Enforces forbidden authority and power states through graph analysis.
 * No ML, no text heuristics - pure graph-based reasoning.
 *
 * Research Track: PIL-1
 * Constitution: SMC-1
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NodeType = 'ACTOR' | 'RESOURCE' | 'BOUNDARY';
export type ActorSubtype = 'USER' | 'SERVICE' | 'PROCESS' | 'SYSTEM';
export type ResourceSubtype = 'DATA' | 'CAPABILITY' | 'SYSTEM' | 'CREDENTIAL';
export type BoundarySubtype = 'SANDBOX' | 'DOMAIN' | 'SESSION' | 'SCOPE' | 'AUDIT_BOUNDARY';

export type EdgeType =
  | 'CONTROLS'
  | 'ACCESSES'
  | 'ELEVATES_TO'
  | 'IMPERSONATES'
  | 'BYPASSES'
  | 'PERSISTS_BEYOND'
  | 'CONTAINS'
  | 'TRANSFERS_TO';

export type InvariantClass = 'α' | 'β' | 'τ';
export type Severity = 'CRITICAL' | 'HIGH';

export interface PowerNode {
  id: string;
  type: NodeType;
  subtype?: string;
  attributes: {
    privilege?: number;        // 0-100 privilege level
    scope?: string;           // Scope identifier
    domain?: string;          // Domain identifier
    authenticated?: boolean;
    public?: boolean;
    sensitivity?: number;     // 0-100 sensitivity level
    owner?: string;
  };
}

export interface PowerEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  attributes: {
    authorized?: boolean;
    scope?: string;
    mode?: 'READ' | 'WRITE' | 'EXECUTE';
    mechanism?: string;
    duration?: 'FINITE' | 'INFINITE';
    revocable?: boolean;
    revoked?: boolean;
    constraintType?: string;
    encrypted?: boolean;
    sessionBound?: boolean;
  };
}

export interface PowerGraph {
  nodes: Map<string, PowerNode>;
  edges: PowerEdge[];
  boundaries: Map<string, Set<string>>; // boundary -> contained node IDs
}

export interface Violation {
  invariantId: string;
  invariantName: string;
  class: InvariantClass;
  severity: Severity;
  nodes: string[];
  edges: string[];
  explanation: string;
  proofTrace: string[];
}

export interface InvariantResult {
  invariantId: string;
  violated: boolean;
  violations: Violation[];
  checkDurationMs: number;
}

export interface PIL1Result {
  passed: boolean;
  totalInvariantsChecked: number;
  violationsFound: number;
  violations: Violation[];
  processingTimeMs: number;
}

// ============================================================================
// GRAPH UTILITIES
// ============================================================================

function getNodesByType(graph: PowerGraph, type: NodeType): PowerNode[] {
  const nodes: PowerNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.type === type) {
      nodes.push(node);
    }
  }
  return nodes;
}

function getEdgesByType(graph: PowerGraph, type: EdgeType): PowerEdge[] {
  return graph.edges.filter(e => e.type === type);
}

function getEdgesFromNode(graph: PowerGraph, nodeId: string): PowerEdge[] {
  return graph.edges.filter(e => e.source === nodeId);
}

function getEdgesToNode(graph: PowerGraph, nodeId: string): PowerEdge[] {
  return graph.edges.filter(e => e.target === nodeId);
}

function isContainedIn(graph: PowerGraph, nodeId: string, boundaryId: string): boolean {
  const contained = graph.boundaries.get(boundaryId);
  return contained ? contained.has(nodeId) : false;
}

function getBoundariesContaining(graph: PowerGraph, nodeId: string): string[] {
  const boundaries: string[] = [];
  for (const [boundaryId, contained] of graph.boundaries.entries()) {
    if (contained.has(nodeId)) {
      boundaries.push(boundaryId);
    }
  }
  return boundaries;
}

// Cycle detection using DFS
function detectCycles(graph: PowerGraph, edgeType: EdgeType): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const outEdges = graph.edges.filter(e => e.source === nodeId && e.type === edgeType);
    for (const edge of outEdges) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) {
          return true;
        }
      } else if (recursionStack.has(edge.target)) {
        // Found cycle
        const cycleStart = path.indexOf(edge.target);
        cycles.push([...path.slice(cycleStart), edge.target]);
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes.values()) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles;
}

// ============================================================================
// INVARIANT CHECKERS
// ============================================================================

// α₁: Universal Authority Prohibition
function checkUniversalAuthority(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  // Get all resources
  const resources = getNodesByType(graph, 'RESOURCE');
  if (resources.length === 0) {
    return { invariantId: 'PIL-α1', violated: false, violations: [], checkDurationMs: Date.now() - startTime };
  }

  // Group CONTROLS edges by source actor
  const controlsByActor = new Map<string, Set<string>>();
  for (const edge of getEdgesByType(graph, 'CONTROLS')) {
    const targetNode = graph.nodes.get(edge.target);
    if (targetNode?.type === 'RESOURCE') {
      if (!controlsByActor.has(edge.source)) {
        controlsByActor.set(edge.source, new Set());
      }
      controlsByActor.get(edge.source)!.add(edge.target);
    }
  }

  // Check if any actor controls all resources
  const resourceIds = new Set(resources.map(r => r.id));
  for (const [actorId, controlled] of controlsByActor.entries()) {
    if (controlled.size === resourceIds.size) {
      let allControlled = true;
      for (const resourceId of resourceIds) {
        if (!controlled.has(resourceId)) {
          allControlled = false;
          break;
        }
      }
      if (allControlled) {
        violations.push({
          invariantId: 'PIL-α1',
          invariantName: 'Universal Authority Prohibition',
          class: 'α',
          severity: 'CRITICAL',
          nodes: [actorId, ...Array.from(resourceIds)],
          edges: graph.edges.filter(e => e.source === actorId && e.type === 'CONTROLS').map(e => e.id),
          explanation: `Actor ${actorId} controls all ${resourceIds.size} resources`,
          proofTrace: [
            `Found ${resourceIds.size} resources in graph`,
            `Actor ${actorId} has CONTROLS edges to all resources`,
            'VIOLATION: Universal authority detected'
          ]
        });
      }
    }
  }

  return {
    invariantId: 'PIL-α1',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// α₂: Self Elevation Prohibition
function checkSelfElevation(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  for (const edge of getEdgesByType(graph, 'ELEVATES_TO')) {
    // Check if elevation is unauthorized
    if (edge.attributes.authorized === false) {
      const sourceNode = graph.nodes.get(edge.source);
      const targetNode = graph.nodes.get(edge.target);

      if (sourceNode && targetNode) {
        const sourcePrev = sourceNode.attributes.privilege || 0;
        const targetPriv = targetNode.attributes.privilege || 0;

        // Self-elevation or elevation to higher privilege
        if (targetPriv > sourcePrev) {
          violations.push({
            invariantId: 'PIL-α2',
            invariantName: 'Self Elevation Prohibition',
            class: 'α',
            severity: 'CRITICAL',
            nodes: [edge.source, edge.target],
            edges: [edge.id],
            explanation: `Unauthorized elevation from privilege ${sourcePrev} to ${targetPriv}`,
            proofTrace: [
              `Edge ${edge.id}: ${edge.source} ELEVATES_TO ${edge.target}`,
              `Source privilege: ${sourcePrev}`,
              `Target privilege: ${targetPriv}`,
              `Authorization: ${edge.attributes.authorized}`,
              'VIOLATION: Unauthorized privilege escalation'
            ]
          });
        }
      }
    }
  }

  return {
    invariantId: 'PIL-α2',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// α₃: Circular Authority Prohibition
function checkCircularAuthority(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  const cycles = detectCycles(graph, 'CONTROLS');
  for (const cycle of cycles) {
    violations.push({
      invariantId: 'PIL-α3',
      invariantName: 'Circular Authority Prohibition',
      class: 'α',
      severity: 'HIGH',
      nodes: cycle,
      edges: [],
      explanation: `Circular authority chain detected: ${cycle.join(' → ')}`,
      proofTrace: [
        `Cycle detected in CONTROLS graph`,
        `Path: ${cycle.join(' → ')}`,
        'VIOLATION: Authority hierarchy corrupted'
      ]
    });
  }

  return {
    invariantId: 'PIL-α3',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// α₄: Authority Accumulation Prohibition
function checkAuthorityAccumulation(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  // Group IMPERSONATES edges by source
  const impersonationsByActor = new Map<string, string[]>();
  for (const edge of getEdgesByType(graph, 'IMPERSONATES')) {
    if (!impersonationsByActor.has(edge.source)) {
      impersonationsByActor.set(edge.source, []);
    }
    impersonationsByActor.get(edge.source)!.push(edge.target);
  }

  // Check for multiple impersonations
  for (const [actorId, targets] of impersonationsByActor.entries()) {
    if (targets.length > 1) {
      violations.push({
        invariantId: 'PIL-α4',
        invariantName: 'Authority Accumulation Prohibition',
        class: 'α',
        severity: 'CRITICAL',
        nodes: [actorId, ...targets],
        edges: graph.edges
          .filter(e => e.source === actorId && e.type === 'IMPERSONATES')
          .map(e => e.id),
        explanation: `Actor ${actorId} impersonates ${targets.length} identities: ${targets.join(', ')}`,
        proofTrace: [
          `Actor ${actorId} has ${targets.length} IMPERSONATES edges`,
          `Impersonated identities: ${targets.join(', ')}`,
          'VIOLATION: Multi-identity authority accumulation'
        ]
      });
    }
  }

  return {
    invariantId: 'PIL-α4',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// β₁: Sandbox Escape Prohibition
function checkSandboxEscape(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  // Find all sandbox boundaries
  const sandboxes = getNodesByType(graph, 'BOUNDARY')
    .filter(n => n.subtype === 'SANDBOX');

  for (const sandbox of sandboxes) {
    const contained = graph.boundaries.get(sandbox.id) || new Set();

    // Check each contained actor
    for (const actorId of contained) {
      const actor = graph.nodes.get(actorId);
      if (actor?.type !== 'ACTOR') continue;

      // Check CONTROLS edges from this actor
      for (const edge of getEdgesFromNode(graph, actorId)) {
        if (edge.type === 'CONTROLS' || edge.type === 'ACCESSES') {
          const target = graph.nodes.get(edge.target);
          if (target && !contained.has(edge.target)) {
            violations.push({
              invariantId: 'PIL-β1',
              invariantName: 'Sandbox Escape Prohibition',
              class: 'β',
              severity: 'CRITICAL',
              nodes: [actorId, sandbox.id, edge.target],
              edges: [edge.id],
              explanation: `Sandboxed actor ${actorId} controls external resource ${edge.target}`,
              proofTrace: [
                `Actor ${actorId} is contained in sandbox ${sandbox.id}`,
                `Edge ${edge.id}: ${actorId} ${edge.type} ${edge.target}`,
                `Resource ${edge.target} is OUTSIDE sandbox`,
                'VIOLATION: Sandbox isolation breached'
              ]
            });
          }
        }
      }
    }
  }

  return {
    invariantId: 'PIL-β1',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// β₂: Scope Violation Prohibition
function checkScopeViolation(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  for (const edge of getEdgesByType(graph, 'ACCESSES')) {
    const source = graph.nodes.get(edge.source);
    const target = graph.nodes.get(edge.target);

    if (source && target) {
      const sourceScope = source.attributes.scope;
      const targetScope = target.attributes.scope;
      const isPublic = target.attributes.public === true;

      // Scope mismatch on non-public resource
      if (sourceScope && targetScope && sourceScope !== targetScope && !isPublic) {
        violations.push({
          invariantId: 'PIL-β2',
          invariantName: 'Scope Violation Prohibition',
          class: 'β',
          severity: 'CRITICAL',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Actor in scope '${sourceScope}' accessing resource in scope '${targetScope}'`,
          proofTrace: [
            `Actor ${edge.source} has scope: ${sourceScope}`,
            `Resource ${edge.target} has scope: ${targetScope}`,
            `Resource is public: ${isPublic}`,
            'VIOLATION: Cross-scope access detected'
          ]
        });
      }
    }
  }

  return {
    invariantId: 'PIL-β2',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// β₃: Cross Domain Leakage Prohibition
function checkCrossDomainLeakage(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  // Define permitted domain pairs (would be configurable)
  const permittedTransfers = new Set<string>([
    'internal->internal',
    'user->user',
  ]);

  for (const edge of getEdgesByType(graph, 'TRANSFERS_TO')) {
    const source = graph.nodes.get(edge.source);
    const target = graph.nodes.get(edge.target);

    if (source && target) {
      const sourceDomain = source.attributes.domain || 'unknown';
      const targetDomain = target.attributes.domain || 'unknown';

      if (sourceDomain !== targetDomain) {
        const transferKey = `${sourceDomain}->${targetDomain}`;
        if (!permittedTransfers.has(transferKey)) {
          violations.push({
            invariantId: 'PIL-β3',
            invariantName: 'Cross Domain Leakage Prohibition',
            class: 'β',
            severity: 'CRITICAL',
            nodes: [edge.source, edge.target],
            edges: [edge.id],
            explanation: `Data transfer from domain '${sourceDomain}' to '${targetDomain}'`,
            proofTrace: [
              `Source ${edge.source} in domain: ${sourceDomain}`,
              `Target ${edge.target} in domain: ${targetDomain}`,
              `Transfer pair ${transferKey} is not permitted`,
              'VIOLATION: Unpermitted domain crossing'
            ]
          });
        }
      }
    }
  }

  return {
    invariantId: 'PIL-β3',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// τ₁: Infinite Persistence Prohibition
function checkInfinitePersistence(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  const authorityEdgeTypes: EdgeType[] = ['CONTROLS', 'ACCESSES', 'ELEVATES_TO'];

  for (const edge of graph.edges) {
    if (authorityEdgeTypes.includes(edge.type)) {
      if (edge.attributes.duration === 'INFINITE' && edge.attributes.revocable === false) {
        violations.push({
          invariantId: 'PIL-τ1',
          invariantName: 'Infinite Persistence Prohibition',
          class: 'τ',
          severity: 'HIGH',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Irrevocable infinite authority: ${edge.source} ${edge.type} ${edge.target}`,
          proofTrace: [
            `Edge ${edge.id}: ${edge.source} ${edge.type} ${edge.target}`,
            `Duration: ${edge.attributes.duration}`,
            `Revocable: ${edge.attributes.revocable}`,
            'VIOLATION: Permanent irrevocable authority'
          ]
        });
      }
    }
  }

  return {
    invariantId: 'PIL-τ1',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// τ₂: Revocation Escape Prohibition
function checkRevocationEscape(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    if (edge.attributes.revoked === true) {
      // Check if there's still a path from source to target
      // For now, just check if the edge itself still implies authority
      violations.push({
        invariantId: 'PIL-τ2',
        invariantName: 'Revocation Escape Prohibition',
        class: 'τ',
        severity: 'CRITICAL',
        nodes: [edge.source, edge.target],
        edges: [edge.id],
        explanation: `Revoked authority edge still present: ${edge.source} ${edge.type} ${edge.target}`,
        proofTrace: [
          `Edge ${edge.id} is marked as revoked`,
          `Edge still exists in graph`,
          'VIOLATION: Post-revocation authority persistence'
        ]
      });
    }
  }

  return {
    invariantId: 'PIL-τ2',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// τ₃: Session Boundary Violation
function checkSessionBoundaryViolation(graph: PowerGraph): InvariantResult {
  const startTime = Date.now();
  const violations: Violation[] = [];

  for (const edge of getEdgesByType(graph, 'PERSISTS_BEYOND')) {
    const targetBoundary = graph.nodes.get(edge.target);

    if (targetBoundary?.subtype === 'SESSION') {
      if (edge.attributes.sessionBound === true) {
        violations.push({
          invariantId: 'PIL-τ3',
          invariantName: 'Session Boundary Violation',
          class: 'τ',
          severity: 'HIGH',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Session-bound authority persists beyond session ${edge.target}`,
          proofTrace: [
            `Authority from ${edge.source} is session-bound`,
            `Edge indicates persistence beyond session ${edge.target}`,
            'VIOLATION: Session-escaped authority'
          ]
        });
      }
    }
  }

  return {
    invariantId: 'PIL-τ3',
    violated: violations.length > 0,
    violations,
    checkDurationMs: Date.now() - startTime
  };
}

// ============================================================================
// MAIN CHECKER
// ============================================================================

const INVARIANT_CHECKERS = [
  checkUniversalAuthority,      // α₁
  checkSelfElevation,           // α₂
  checkCircularAuthority,       // α₃
  checkAuthorityAccumulation,   // α₄
  checkSandboxEscape,           // β₁
  checkScopeViolation,          // β₂
  checkCrossDomainLeakage,      // β₃
  checkInfinitePersistence,     // τ₁
  checkRevocationEscape,        // τ₂
  checkSessionBoundaryViolation // τ₃
];

export function checkPowerInvariants(graph: PowerGraph): PIL1Result {
  const startTime = Date.now();
  const allViolations: Violation[] = [];

  for (const checker of INVARIANT_CHECKERS) {
    const result = checker(graph);
    if (result.violated) {
      allViolations.push(...result.violations);
    }
  }

  return {
    passed: allViolations.length === 0,
    totalInvariantsChecked: INVARIANT_CHECKERS.length,
    violationsFound: allViolations.length,
    violations: allViolations,
    processingTimeMs: Date.now() - startTime
  };
}

// ============================================================================
// GRAPH BUILDER (for HCA-1 integration)
// ============================================================================

export interface HCA1CapabilityMatch {
  capabilityId: string;
  capabilityName: string;
  matchedText: string;
  severity: string;
}

export function buildGraphFromCapabilities(
  capabilities: HCA1CapabilityMatch[],
  context: {
    actorId?: string;
    actorScope?: string;
    targetResources?: string[];
  } = {}
): PowerGraph {
  const graph: PowerGraph = {
    nodes: new Map(),
    edges: [],
    boundaries: new Map()
  };

  const actorId = context.actorId || 'actor_0';
  let edgeCounter = 0;

  // Create actor node
  graph.nodes.set(actorId, {
    id: actorId,
    type: 'ACTOR',
    subtype: 'USER',
    attributes: {
      privilege: 0,
      scope: context.actorScope || 'user',
      authenticated: true
    }
  });

  // Create edges based on capabilities
  for (const cap of capabilities) {
    const edgeId = `edge_${edgeCounter++}`;

    switch (cap.capabilityId) {
      case 'CAP-001': // Unauthorized Access
        const resourceId = `resource_${edgeCounter}`;
        graph.nodes.set(resourceId, {
          id: resourceId,
          type: 'RESOURCE',
          subtype: 'DATA',
          attributes: { scope: 'protected', public: false }
        });
        graph.edges.push({
          id: edgeId,
          source: actorId,
          target: resourceId,
          type: 'ACCESSES',
          attributes: { authorized: false, mode: 'READ' }
        });
        break;

      case 'CAP-002': // Privilege Acquisition
        const adminId = `admin_${edgeCounter}`;
        graph.nodes.set(adminId, {
          id: adminId,
          type: 'ACTOR',
          subtype: 'USER',
          attributes: { privilege: 100, scope: 'admin' }
        });
        graph.edges.push({
          id: edgeId,
          source: actorId,
          target: adminId,
          type: 'ELEVATES_TO',
          attributes: { authorized: false }
        });
        break;

      case 'CAP-003': // Data Exfiltration
        const internalData = `data_internal_${edgeCounter}`;
        const externalTarget = `target_external_${edgeCounter}`;
        graph.nodes.set(internalData, {
          id: internalData,
          type: 'RESOURCE',
          subtype: 'DATA',
          attributes: { domain: 'internal', sensitivity: 100 }
        });
        graph.nodes.set(externalTarget, {
          id: externalTarget,
          type: 'RESOURCE',
          subtype: 'DATA',
          attributes: { domain: 'external' }
        });
        graph.edges.push({
          id: edgeId,
          source: internalData,
          target: externalTarget,
          type: 'TRANSFERS_TO',
          attributes: { authorized: false }
        });
        break;

      case 'CAP-004': // Persistent Access
        graph.edges.push({
          id: edgeId,
          source: actorId,
          target: context.targetResources?.[0] || 'resource_0',
          type: 'ACCESSES',
          attributes: {
            authorized: false,
            duration: 'INFINITE',
            revocable: false
          }
        });
        break;

      case 'CAP-005': // Lateral Movement
        const otherUser1 = `user_other_1_${edgeCounter}`;
        const otherUser2 = `user_other_2_${edgeCounter}`;
        graph.nodes.set(otherUser1, {
          id: otherUser1,
          type: 'ACTOR',
          attributes: { scope: 'user_1' }
        });
        graph.nodes.set(otherUser2, {
          id: otherUser2,
          type: 'ACTOR',
          attributes: { scope: 'user_2' }
        });
        graph.edges.push({
          id: `${edgeId}_1`,
          source: actorId,
          target: otherUser1,
          type: 'IMPERSONATES',
          attributes: { authorized: false }
        });
        graph.edges.push({
          id: `${edgeId}_2`,
          source: actorId,
          target: otherUser2,
          type: 'IMPERSONATES',
          attributes: { authorized: false }
        });
        break;

      case 'CAP-006': // Audit Blindness
        const auditBoundary = `audit_boundary_${edgeCounter}`;
        graph.nodes.set(auditBoundary, {
          id: auditBoundary,
          type: 'BOUNDARY',
          subtype: 'AUDIT_BOUNDARY',
          attributes: {}
        });
        graph.edges.push({
          id: edgeId,
          source: actorId,
          target: auditBoundary,
          type: 'BYPASSES',
          attributes: { constraintType: 'AUDIT' }
        });
        break;

      case 'CAP-007': // Environment Escape
        const sandbox = `sandbox_${edgeCounter}`;
        const externalResource = `external_resource_${edgeCounter}`;
        graph.nodes.set(sandbox, {
          id: sandbox,
          type: 'BOUNDARY',
          subtype: 'SANDBOX',
          attributes: {}
        });
        graph.nodes.set(externalResource, {
          id: externalResource,
          type: 'RESOURCE',
          attributes: {}
        });
        // Actor is in sandbox
        graph.boundaries.set(sandbox, new Set([actorId]));
        // But controls external resource
        graph.edges.push({
          id: edgeId,
          source: actorId,
          target: externalResource,
          type: 'CONTROLS',
          attributes: { authorized: false }
        });
        break;
    }
  }

  return graph;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PIL1_CONFIG = {
  layerId: 'PIL-1',
  name: 'Power Invariant Layer',
  version: '1.0.0',
  position: 'AFTER_HCA-1',
  mode: 'RESEARCH',
  constitution: 'SMC-1',
  invariantCount: INVARIANT_CHECKERS.length,
  constraints: {
    deterministic: true,
    noML: true,
    noTextHeuristics: true,
    graphBasedOnly: true
  }
};

export {
  getNodesByType,
  getEdgesByType,
  detectCycles
};

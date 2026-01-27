/**
 * PIL-1 Shadow Layer Integration
 *
 * Integrates Power Invariant Layer (PIL-1) into the shadow pipeline.
 * Detects forbidden power states via graph-based invariant checking.
 *
 * ID: PIL-1
 * Position: AFTER_HCA-1 (before HIC-1)
 * Mode: SHADOW_ENFORCING
 * Blocking: DISABLED (shadow mode observation)
 * Attribution: REQUIRED (VAL-1 compatible)
 * Rule Prefix: PIL
 * Constitution: SMC-1 compliant
 *
 * Invariant Classes:
 *   α (Authority): Universal authority, self-elevation, circular authority, accumulation
 *   β (Boundary): Sandbox escape, scope violation, cross-domain leakage
 *   τ (Temporal): Infinite persistence, revocation escape, session boundary
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type InvariantClass = 'α' | 'β' | 'τ';
export type InvariantSeverity = 'CRITICAL' | 'HIGH';

export type InvariantId =
  | 'PIL-α1' | 'PIL-α2' | 'PIL-α3' | 'PIL-α4'
  | 'PIL-β1' | 'PIL-β2' | 'PIL-β3'
  | 'PIL-τ1' | 'PIL-τ2' | 'PIL-τ3';

export type NodeType = 'ACTOR' | 'RESOURCE' | 'BOUNDARY';
export type NodeSubtype =
  | 'USER' | 'PROCESS' | 'SERVICE'  // Actor subtypes
  | 'DATA' | 'CAPABILITY' | 'SYSTEM' // Resource subtypes
  | 'SANDBOX' | 'SCOPE' | 'SESSION' | 'DOMAIN'; // Boundary subtypes

export type EdgeType =
  | 'CONTROLS' | 'ACCESSES' | 'ELEVATES_TO'
  | 'IMPERSONATES' | 'BYPASSES' | 'PERSISTS_BEYOND' | 'TRANSFERS_TO';

export interface PowerNode {
  id: string;
  type: NodeType;
  subtype: NodeSubtype | null;
  attributes: Record<string, unknown>;
}

export interface PowerEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  attributes: Record<string, unknown>;
}

export interface PowerGraph {
  nodes: Map<string, PowerNode>;
  edges: PowerEdge[];
  boundaries: Map<string, Set<string>>;
}

export interface Violation {
  invariantId: InvariantId;
  invariantName: string;
  class: InvariantClass;
  severity: InvariantSeverity;
  nodes: string[];
  edges: string[];
  explanation: string;
  proofTrace: string[];
}

export interface PIL1Result {
  passed: boolean;
  totalInvariantsChecked: number;
  violationsFound: number;
  violations: Violation[];
  processingTimeMs: number;
  replayHash: string;
}

export interface HCA1CapabilityMatch {
  capabilityId: string;
  capabilityName: string;
  severity: string;
  confidence: number;
  matchedText: string;
  matchedPattern: string;
}

// ============================================================================
// PIL-1 CONFIGURATION
// ============================================================================

export const PIL1_CONFIG = {
  layerId: 'PIL-1',
  position: 'AFTER_HCA-1',
  mode: 'ENFORCING' as const,
  blocking: 'ENABLED' as const,
  attribution: 'REQUIRED' as const,
  rulePrefix: 'PIL',
  constitution: 'SMC-1',
  version: '1.0.0',
  frozen: true,
  deterministic: true,
  noML: true,
  enabledAt: '2026-01-19T08:45:43.940Z',
  validatedAt: '2026-01-19T08:45:43.940Z',
  promotedAt: '2026-01-19T09:15:00.000Z',
  promotedFrom: 'SHADOW_ENFORCING',
};

// ============================================================================
// INVARIANT DEFINITIONS
// ============================================================================

export const INVARIANT_METADATA: Record<InvariantId, {
  name: string;
  class: InvariantClass;
  severity: InvariantSeverity;
  description: string;
}> = {
  'PIL-α1': {
    name: 'Universal Authority Prohibition',
    class: 'α',
    severity: 'CRITICAL',
    description: 'No actor may control all resources',
  },
  'PIL-α2': {
    name: 'Self Elevation Prohibition',
    class: 'α',
    severity: 'CRITICAL',
    description: 'No actor may elevate own privileges without authorization',
  },
  'PIL-α3': {
    name: 'Circular Authority Prohibition',
    class: 'α',
    severity: 'CRITICAL',
    description: 'No circular control relationships allowed',
  },
  'PIL-α4': {
    name: 'Authority Accumulation Prohibition',
    class: 'α',
    severity: 'CRITICAL',
    description: 'No actor may impersonate multiple identities',
  },
  'PIL-β1': {
    name: 'Sandbox Escape Prohibition',
    class: 'β',
    severity: 'CRITICAL',
    description: 'Sandboxed actors cannot access external resources',
  },
  'PIL-β2': {
    name: 'Scope Violation Prohibition',
    class: 'β',
    severity: 'CRITICAL',
    description: 'No cross-scope access to non-public resources',
  },
  'PIL-β3': {
    name: 'Cross Domain Leakage Prohibition',
    class: 'β',
    severity: 'CRITICAL',
    description: 'No unpermitted domain-crossing data transfers',
  },
  'PIL-τ1': {
    name: 'Infinite Persistence Prohibition',
    class: 'τ',
    severity: 'HIGH',
    description: 'No irrevocable infinite authority',
  },
  'PIL-τ2': {
    name: 'Revocation Escape Prohibition',
    class: 'τ',
    severity: 'HIGH',
    description: 'Revoked authority must not persist',
  },
  'PIL-τ3': {
    name: 'Session Boundary Violation',
    class: 'τ',
    severity: 'HIGH',
    description: 'Session-bound authority must not persist beyond session',
  },
};

// ============================================================================
// CAPABILITY TO GRAPH EDGE MAPPING
// ============================================================================

const CAPABILITY_TO_EDGE_MAP: Record<string, { edgeType: EdgeType; attributes: Record<string, unknown> }> = {
  'CAP-001': { edgeType: 'ACCESSES', attributes: { authorized: false } },
  'CAP-002': { edgeType: 'ELEVATES_TO', attributes: { authorized: false } },
  'CAP-003': { edgeType: 'TRANSFERS_TO', attributes: { domain: 'external' } },
  'CAP-004': { edgeType: 'PERSISTS_BEYOND', attributes: { duration: 'INFINITE', revocable: false } },
  'CAP-005': { edgeType: 'IMPERSONATES', attributes: {} },
  'CAP-006': { edgeType: 'BYPASSES', attributes: { target: 'audit' } },
  'CAP-007': { edgeType: 'BYPASSES', attributes: { target: 'sandbox' } },
};

// ============================================================================
// GRAPH CONSTRUCTION
// ============================================================================

export function buildGraphFromCapabilities(
  capabilities: HCA1CapabilityMatch[],
  context: {
    actorId?: string;
    actorScope?: string;
    targetResources?: string[];
  }
): PowerGraph {
  const graph: PowerGraph = {
    nodes: new Map(),
    edges: [],
    boundaries: new Map(),
  };

  // Create default actor
  const actorId = context.actorId || 'actor_0';
  graph.nodes.set(actorId, {
    id: actorId,
    type: 'ACTOR',
    subtype: 'USER',
    attributes: { scope: context.actorScope || 'default', privilege: 10 },
  });

  // Create resources for each capability
  let resourceIdx = 0;
  let edgeIdx = 0;

  for (const cap of capabilities) {
    const mapping = CAPABILITY_TO_EDGE_MAP[cap.capabilityId];
    if (!mapping) continue;

    // Create target based on capability type
    const targetId = `resource_${resourceIdx++}`;
    let targetType: NodeType = 'RESOURCE';
    let targetSubtype: NodeSubtype = 'DATA';
    const targetAttrs: Record<string, unknown> = {};

    if (cap.capabilityId === 'CAP-002') {
      // Privilege escalation - target is an actor
      targetType = 'ACTOR';
      targetSubtype = 'USER';
      targetAttrs.privilege = 100;
    } else if (cap.capabilityId === 'CAP-003') {
      targetAttrs.domain = 'external';
    } else if (cap.capabilityId === 'CAP-005') {
      // Lateral movement - target is another user
      targetType = 'ACTOR';
      targetSubtype = 'USER';
    } else if (cap.capabilityId === 'CAP-006') {
      targetType = 'BOUNDARY';
      targetSubtype = 'SANDBOX';
    } else if (cap.capabilityId === 'CAP-007') {
      targetType = 'BOUNDARY';
      targetSubtype = 'SANDBOX';
    }

    graph.nodes.set(targetId, {
      id: targetId,
      type: targetType,
      subtype: targetSubtype,
      attributes: targetAttrs,
    });

    // Create edge
    const edge: PowerEdge = {
      id: `edge_${edgeIdx++}`,
      source: actorId,
      target: targetId,
      type: mapping.edgeType,
      attributes: { ...mapping.attributes },
    };
    graph.edges.push(edge);

    // For CAP-005 (lateral movement), create multiple impersonation targets
    if (cap.capabilityId === 'CAP-005') {
      const target2Id = `resource_${resourceIdx++}`;
      graph.nodes.set(target2Id, {
        id: target2Id,
        type: 'ACTOR',
        subtype: 'USER',
        attributes: {},
      });
      graph.edges.push({
        id: `edge_${edgeIdx++}`,
        source: actorId,
        target: target2Id,
        type: 'IMPERSONATES',
        attributes: {},
      });
    }

    // For sandbox-related capabilities, create sandbox boundary
    if (cap.capabilityId === 'CAP-006' || cap.capabilityId === 'CAP-007') {
      const sandboxId = `sandbox_${resourceIdx++}`;
      graph.nodes.set(sandboxId, {
        id: sandboxId,
        type: 'BOUNDARY',
        subtype: 'SANDBOX',
        attributes: {},
      });
      graph.boundaries.set(sandboxId, new Set([actorId]));

      // External resource
      const externalId = `external_${resourceIdx++}`;
      graph.nodes.set(externalId, {
        id: externalId,
        type: 'RESOURCE',
        subtype: 'SYSTEM',
        attributes: {},
      });
      graph.edges.push({
        id: `edge_${edgeIdx++}`,
        source: actorId,
        target: externalId,
        type: 'CONTROLS',
        attributes: {},
      });
    }
  }

  return graph;
}

// ============================================================================
// INVARIANT CHECKERS
// ============================================================================

function checkUniversalAuthority(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  const resources: PowerNode[] = [];

  for (const node of graph.nodes.values()) {
    if (node.type === 'RESOURCE') resources.push(node);
  }

  if (resources.length === 0) return { violated: false, violations: [] };

  const controlsByActor = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (edge.type === 'CONTROLS') {
      const target = graph.nodes.get(edge.target);
      if (target?.type === 'RESOURCE') {
        if (!controlsByActor.has(edge.source)) {
          controlsByActor.set(edge.source, new Set());
        }
        controlsByActor.get(edge.source)!.add(edge.target);
      }
    }
  }

  const resourceIds = new Set(resources.map(r => r.id));
  for (const [actorId, controlled] of controlsByActor.entries()) {
    if (controlled.size === resourceIds.size && controlled.size > 0) {
      let allControlled = true;
      for (const rid of resourceIds) {
        if (!controlled.has(rid)) allControlled = false;
      }
      if (allControlled) {
        violations.push({
          invariantId: 'PIL-α1',
          invariantName: 'Universal Authority Prohibition',
          class: 'α',
          severity: 'CRITICAL',
          nodes: [actorId, ...Array.from(resourceIds)],
          edges: graph.edges.filter(e => e.source === actorId && e.type === 'CONTROLS').map(e => e.id),
          explanation: `Actor '${actorId}' controls all ${resourceIds.size} resources in the graph, which violates the universal authority prohibition. No single actor should have complete control over all resources.`,
          proofTrace: [
            `Step 1: Identified ${resourceIds.size} resources in graph: ${Array.from(resourceIds).join(', ')}`,
            `Step 2: Actor '${actorId}' has CONTROLS edges to all resources`,
            `Step 3: Verified no resource is uncontrolled by this actor`,
            `Conclusion: VIOLATION - Universal authority detected (PIL-α1)`,
          ],
        });
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkSelfElevation(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    if (edge.type === 'ELEVATES_TO' && edge.attributes.authorized === false) {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourcePriv = (source?.attributes.privilege as number) || 0;
      const targetPriv = (target?.attributes.privilege as number) || 0;

      if (targetPriv > sourcePriv) {
        violations.push({
          invariantId: 'PIL-α2',
          invariantName: 'Self Elevation Prohibition',
          class: 'α',
          severity: 'CRITICAL',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Actor '${edge.source}' (privilege ${sourcePriv}) attempts unauthorized elevation to '${edge.target}' (privilege ${targetPriv}). Privilege escalation requires explicit authorization.`,
          proofTrace: [
            `Step 1: Found ELEVATES_TO edge from '${edge.source}' to '${edge.target}'`,
            `Step 2: Source privilege level: ${sourcePriv}`,
            `Step 3: Target privilege level: ${targetPriv}`,
            `Step 4: Authorization status: ${edge.attributes.authorized}`,
            `Conclusion: VIOLATION - Unauthorized privilege escalation (PIL-α2)`,
          ],
        });
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkAuthorityAccumulation(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  const impersonations = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (edge.type === 'IMPERSONATES') {
      if (!impersonations.has(edge.source)) {
        impersonations.set(edge.source, []);
      }
      impersonations.get(edge.source)!.push(edge.target);
    }
  }

  for (const [actorId, targets] of impersonations.entries()) {
    if (targets.length > 1) {
      violations.push({
        invariantId: 'PIL-α4',
        invariantName: 'Authority Accumulation Prohibition',
        class: 'α',
        severity: 'CRITICAL',
        nodes: [actorId, ...targets],
        edges: graph.edges.filter(e => e.source === actorId && e.type === 'IMPERSONATES').map(e => e.id),
        explanation: `Actor '${actorId}' impersonates ${targets.length} different identities (${targets.join(', ')}), accumulating their combined authorities. Multi-identity impersonation is forbidden.`,
        proofTrace: [
          `Step 1: Actor '${actorId}' has ${targets.length} IMPERSONATES edges`,
          `Step 2: Impersonated identities: ${targets.join(', ')}`,
          `Step 3: Combined authority exceeds any single identity`,
          `Conclusion: VIOLATION - Authority accumulation detected (PIL-α4)`,
        ],
      });
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkSandboxEscape(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  for (const [boundaryId, contained] of graph.boundaries.entries()) {
    const boundary = graph.nodes.get(boundaryId);
    if (boundary?.subtype !== 'SANDBOX') continue;

    for (const actorId of contained) {
      for (const edge of graph.edges) {
        if (edge.source === actorId && (edge.type === 'CONTROLS' || edge.type === 'ACCESSES')) {
          if (!contained.has(edge.target)) {
            violations.push({
              invariantId: 'PIL-β1',
              invariantName: 'Sandbox Escape Prohibition',
              class: 'β',
              severity: 'CRITICAL',
              nodes: [actorId, boundaryId, edge.target],
              edges: [edge.id],
              explanation: `Actor '${actorId}' is contained within sandbox '${boundaryId}' but has ${edge.type} relationship with external resource '${edge.target}'. Sandboxed actors cannot access resources outside their sandbox.`,
              proofTrace: [
                `Step 1: Actor '${actorId}' is contained in sandbox '${boundaryId}'`,
                `Step 2: Found ${edge.type} edge to '${edge.target}'`,
                `Step 3: Resource '${edge.target}' is OUTSIDE the sandbox`,
                `Conclusion: VIOLATION - Sandbox escape detected (PIL-β1)`,
              ],
            });
          }
        }
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkScopeViolation(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    if (edge.type === 'ACCESSES') {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourceScope = source?.attributes.scope as string | undefined;
      const targetScope = target?.attributes.scope as string | undefined;
      const isPublic = target?.attributes.public === true;

      if (sourceScope && targetScope && sourceScope !== targetScope && !isPublic) {
        violations.push({
          invariantId: 'PIL-β2',
          invariantName: 'Scope Violation Prohibition',
          class: 'β',
          severity: 'CRITICAL',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Actor '${edge.source}' in scope '${sourceScope}' attempts to access non-public resource '${edge.target}' in different scope '${targetScope}'. Cross-scope access to private resources is forbidden.`,
          proofTrace: [
            `Step 1: Actor '${edge.source}' has scope: ${sourceScope}`,
            `Step 2: Resource '${edge.target}' has scope: ${targetScope}`,
            `Step 3: Resource is public: ${isPublic}`,
            `Step 4: Scopes differ and resource is not public`,
            `Conclusion: VIOLATION - Cross-scope access detected (PIL-β2)`,
          ],
        });
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkCrossDomainLeakage(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  const permittedTransfers = new Set(['internal->internal', 'user->user']);

  for (const edge of graph.edges) {
    if (edge.type === 'TRANSFERS_TO') {
      const source = graph.nodes.get(edge.source);
      const target = graph.nodes.get(edge.target);
      const sourceDomain = (source?.attributes.domain as string) || 'unknown';
      const targetDomain = (target?.attributes.domain as string) || 'unknown';

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
            explanation: `Data transfer from domain '${sourceDomain}' to domain '${targetDomain}' is not permitted. This represents potential data exfiltration across security boundaries.`,
            proofTrace: [
              `Step 1: Source '${edge.source}' in domain: ${sourceDomain}`,
              `Step 2: Target '${edge.target}' in domain: ${targetDomain}`,
              `Step 3: Transfer pair '${transferKey}' is not in permitted list`,
              `Conclusion: VIOLATION - Unpermitted domain crossing (PIL-β3)`,
            ],
          });
        }
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkInfinitePersistence(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    if (['CONTROLS', 'ACCESSES', 'ELEVATES_TO'].includes(edge.type)) {
      if (edge.attributes.duration === 'INFINITE' && edge.attributes.revocable === false) {
        violations.push({
          invariantId: 'PIL-τ1',
          invariantName: 'Infinite Persistence Prohibition',
          class: 'τ',
          severity: 'HIGH',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Authority edge from '${edge.source}' to '${edge.target}' has infinite duration and cannot be revoked. All authority must be either time-bounded or revocable.`,
          proofTrace: [
            `Step 1: Found ${edge.type} edge: ${edge.source} → ${edge.target}`,
            `Step 2: Duration attribute: ${edge.attributes.duration}`,
            `Step 3: Revocable attribute: ${edge.attributes.revocable}`,
            `Step 4: Both conditions met: infinite AND irrevocable`,
            `Conclusion: VIOLATION - Permanent irrevocable authority (PIL-τ1)`,
          ],
        });
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

function checkSessionBoundary(graph: PowerGraph): { violated: boolean; violations: Violation[] } {
  const violations: Violation[] = [];

  for (const edge of graph.edges) {
    if (edge.type === 'PERSISTS_BEYOND') {
      const target = graph.nodes.get(edge.target);
      if (target?.subtype === 'SESSION' && edge.attributes.sessionBound === true) {
        violations.push({
          invariantId: 'PIL-τ3',
          invariantName: 'Session Boundary Violation',
          class: 'τ',
          severity: 'HIGH',
          nodes: [edge.source, edge.target],
          edges: [edge.id],
          explanation: `Session-bound authority from '${edge.source}' persists beyond session '${edge.target}'. Session-scoped authority must terminate when the session ends.`,
          proofTrace: [
            `Step 1: Authority from '${edge.source}' is marked as session-bound`,
            `Step 2: PERSISTS_BEYOND edge to session '${edge.target}'`,
            `Step 3: Session boundary should terminate this authority`,
            `Conclusion: VIOLATION - Session-escaped authority (PIL-τ3)`,
          ],
        });
      }
    }
  }

  return { violated: violations.length > 0, violations };
}

// ============================================================================
// INVARIANT CHECKER COLLECTION
// ============================================================================

const INVARIANT_CHECKERS = [
  checkUniversalAuthority,
  checkSelfElevation,
  checkAuthorityAccumulation,
  checkSandboxEscape,
  checkScopeViolation,
  checkCrossDomainLeakage,
  checkInfinitePersistence,
  checkSessionBoundary,
];

// ============================================================================
// MAIN CHECKER FUNCTION
// ============================================================================

function canonicalizeGraph(graph: PowerGraph): string {
  const nodes = Array.from(graph.nodes.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(n => JSON.stringify(n));

  const edges = graph.edges
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(e => JSON.stringify(e));

  const boundaries = Array.from(graph.boundaries.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}:${Array.from(v).sort().join(',')}`);

  return JSON.stringify({ nodes, edges, boundaries });
}

export function checkPowerInvariants(graph: PowerGraph): PIL1Result {
  const startTime = Date.now();
  const allViolations: Violation[] = [];

  for (const checker of INVARIANT_CHECKERS) {
    const result = checker(graph);
    if (result.violated) {
      allViolations.push(...result.violations);
    }
  }

  // Sort violations for deterministic output
  allViolations.sort((a, b) => a.invariantId.localeCompare(b.invariantId));

  // Compute replay hash
  const canonicalGraph = canonicalizeGraph(graph);
  const canonicalViolations = JSON.stringify(
    allViolations.map(v => ({
      invariantId: v.invariantId,
      nodes: v.nodes.sort(),
      edges: v.edges.sort(),
    }))
  );
  const hashInput = canonicalGraph + '|' + canonicalViolations;
  const replayHash = crypto.createHash('sha256').update(hashInput).digest('hex');

  return {
    passed: allViolations.length === 0,
    totalInvariantsChecked: INVARIANT_CHECKERS.length,
    violationsFound: allViolations.length,
    violations: allViolations,
    processingTimeMs: Date.now() - startTime,
    replayHash,
  };
}

// ============================================================================
// SHADOW PIPELINE INTEGRATION
// ============================================================================

export interface PIL1StageResult {
  stage: string;
  passed: boolean;
  rejectionCodes: InvariantId[];
  violations: Violation[];
  durationMs: number;
  replayHash: string;
  stateSnapshot: {
    graphNodes: number;
    graphEdges: number;
    invariantsChecked: number;
    violationsFound: number;
  };
}

/**
 * Executes PIL-1 as a shadow pipeline stage
 */
export function executePIL1Stage(
  capabilities: HCA1CapabilityMatch[],
  context?: {
    actorId?: string;
    actorScope?: string;
    targetResources?: string[];
  }
): PIL1StageResult {
  // Build power graph from HCA-1 capabilities
  const graph = buildGraphFromCapabilities(capabilities, context || {});

  // Check invariants
  const result = checkPowerInvariants(graph);

  return {
    stage: 'PIL1_INVARIANT_CHECKER',
    passed: result.passed,
    rejectionCodes: result.violations.map(v => v.invariantId),
    violations: result.violations,
    durationMs: result.processingTimeMs,
    replayHash: result.replayHash,
    stateSnapshot: {
      graphNodes: graph.nodes.size,
      graphEdges: graph.edges.length,
      invariantsChecked: result.totalInvariantsChecked,
      violationsFound: result.violationsFound,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  INVARIANT_CHECKERS,
  checkUniversalAuthority,
  checkSelfElevation,
  checkAuthorityAccumulation,
  checkSandboxEscape,
  checkScopeViolation,
  checkCrossDomainLeakage,
  checkInfinitePersistence,
  checkSessionBoundary,
};

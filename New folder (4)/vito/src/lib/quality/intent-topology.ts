/**
 * OLYMPUS 2.0 - Intent Topology & Global Consistency Layer (ITGCL)
 *
 * Detects and governs cross-intent conflicts and system-level invariant violations.
 *
 * Rules:
 * - No heuristics without rules
 * - No partial mutation
 * - Multi-intent changes must be atomic
 * - Full auditability
 */

import * as crypto from 'crypto';
import { IntentCausalChain, IntentSpec } from './intent-graph';

// ============================================
// EDGE TYPES
// ============================================

/**
 * Types of interactions between intents
 */
export type IntentEdgeType =
  | 'READ'       // Intent reads state that another writes
  | 'WRITE'      // Intent writes state that another reads/writes
  | 'CONSTRAIN'  // Intent constrains another's behavior
  | 'DEPEND';    // Intent depends on another's outcome

/**
 * Edge in the intent interaction graph
 */
export interface IntentEdge {
  id: string;
  sourceIntentId: string;
  targetIntentId: string;
  type: IntentEdgeType;
  resource: string;              // State key, anchor, or constraint name
  resourceType: 'state' | 'anchor' | 'constraint' | 'guarantee';
  bidirectional: boolean;        // Both intents interact with same resource
  conflictPotential: 'none' | 'low' | 'high';
  details: string;
}

/**
 * Node in the intent interaction graph
 */
export interface IntentNode {
  intentId: string;
  requirement: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  stateKeys: string[];           // State this intent uses
  externalAnchors: string[];     // External anchors this intent requires
  constraints: IntentConstraint[];
  guarantees: IntentGuarantee[];
}

/**
 * Constraint imposed by an intent
 */
export interface IntentConstraint {
  type: 'security' | 'availability' | 'latency' | 'throughput' | 'resource' | 'exclusive';
  name: string;
  value: string | number | boolean;
  operator: '=' | '<' | '>' | '<=' | '>=' | '!=' | 'contains' | 'exclusive';
}

/**
 * Guarantee required by an intent
 */
export interface IntentGuarantee {
  type: 'security' | 'availability' | 'latency' | 'throughput';
  name: string;
  requiredValue: string | number | boolean;
  operator: '=' | '<' | '>' | '<=' | '>=' | 'min' | 'max';
}

// ============================================
// INTENT INTERACTION GRAPH
// ============================================

/**
 * The full intent interaction graph
 */
export interface IntentInteractionGraph {
  id: string;
  buildId: string;
  nodes: IntentNode[];
  edges: IntentEdge[];
  createdAt: Date;

  // Computed properties
  nodeCount: number;
  edgeCount: number;
  hasCycles: boolean;
  connectedComponents: string[][];  // Groups of connected intents
}

/**
 * Build the intent interaction graph from chains
 */
export function buildIntentInteractionGraph(
  buildId: string,
  chains: IntentCausalChain[]
): IntentInteractionGraph {
  console.log('[ITGCL] ==========================================');
  console.log('[ITGCL] BUILDING INTENT INTERACTION GRAPH');
  console.log('[ITGCL] ==========================================');
  console.log(`[ITGCL] Chains to analyze: ${chains.length}`);

  // Build nodes from chains
  const nodes: IntentNode[] = chains.map(chain => buildNodeFromChain(chain));
  console.log(`[ITGCL] Nodes created: ${nodes.length}`);

  // Build edges by analyzing interactions
  const edges: IntentEdge[] = [];

  // 1. Shared state keys
  const stateEdges = findSharedStateEdges(nodes);
  edges.push(...stateEdges);
  console.log(`[ITGCL] State edges: ${stateEdges.length}`);

  // 2. Shared external anchors
  const anchorEdges = findSharedAnchorEdges(nodes);
  edges.push(...anchorEdges);
  console.log(`[ITGCL] Anchor edges: ${anchorEdges.length}`);

  // 3. Resource constraints
  const constraintEdges = findConstraintEdges(nodes);
  edges.push(...constraintEdges);
  console.log(`[ITGCL] Constraint edges: ${constraintEdges.length}`);

  // 4. Security/latency guarantees
  const guaranteeEdges = findGuaranteeEdges(nodes);
  edges.push(...guaranteeEdges);
  console.log(`[ITGCL] Guarantee edges: ${guaranteeEdges.length}`);

  // Detect cycles
  const hasCycles = detectCycles(nodes, edges);
  console.log(`[ITGCL] Has cycles: ${hasCycles}`);

  // Find connected components
  const connectedComponents = findConnectedComponents(nodes, edges);
  console.log(`[ITGCL] Connected components: ${connectedComponents.length}`);

  console.log('[ITGCL] ==========================================');

  return {
    id: `itg-${buildId}-${Date.now()}`,
    buildId,
    nodes,
    edges,
    createdAt: new Date(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasCycles,
    connectedComponents,
  };
}

/**
 * Build a node from an intent causal chain
 */
function buildNodeFromChain(chain: IntentCausalChain): IntentNode {
  const stateKeys = extractStateKeys(chain);
  const externalAnchors = extractExternalAnchors(chain);
  const constraints = extractConstraints(chain);
  const guarantees = extractGuarantees(chain);

  return {
    intentId: chain.intent.id,
    requirement: chain.intent.requirement,
    priority: chain.intent.priority,
    stateKeys,
    externalAnchors,
    constraints,
    guarantees,
  };
}

/**
 * Extract state keys from a chain
 */
function extractStateKeys(chain: IntentCausalChain): string[] {
  const keys: Set<string> = new Set();

  // From expected state (single StateSpec with stateName)
  if (chain.intent.expectedState) {
    keys.add(chain.intent.expectedState.stateName);
    // Also add derived state if present
    if (chain.intent.expectedState.derivedState) {
      for (const derived of chain.intent.expectedState.derivedState) {
        keys.add(derived);
      }
    }
  }

  // From found state
  if (chain.foundState) {
    keys.add(chain.foundState.stateName);
    // Add derived state if present
    if (chain.foundState.derivedFrom) {
      for (const derived of chain.foundState.derivedFrom) {
        keys.add(derived);
      }
    }
  }

  return Array.from(keys).sort();
}

/**
 * Extract external anchors from a chain
 */
function extractExternalAnchors(chain: IntentCausalChain): string[] {
  const anchors: Set<string> = new Set();

  // Check for API dependencies in requirements
  const requirement = chain.intent.requirement.toLowerCase();

  if (requirement.includes('api') || requirement.includes('endpoint')) {
    anchors.add('api:external');
  }
  if (requirement.includes('database') || requirement.includes('db')) {
    anchors.add('anchor:database');
  }
  if (requirement.includes('auth') || requirement.includes('login')) {
    anchors.add('anchor:auth');
  }
  if (requirement.includes('payment') || requirement.includes('stripe')) {
    anchors.add('anchor:payment');
  }
  if (requirement.includes('email') || requirement.includes('notification')) {
    anchors.add('anchor:notification');
  }
  if (requirement.includes('storage') || requirement.includes('upload')) {
    anchors.add('anchor:storage');
  }

  return Array.from(anchors).sort();
}

/**
 * Extract constraints from a chain
 */
function extractConstraints(chain: IntentCausalChain): IntentConstraint[] {
  const constraints: IntentConstraint[] = [];
  const requirement = chain.intent.requirement.toLowerCase();

  // Security constraints
  if (requirement.includes('authenticated') || requirement.includes('logged in')) {
    constraints.push({
      type: 'security',
      name: 'requires_auth',
      value: true,
      operator: '=',
    });
  }
  if (requirement.includes('admin') || requirement.includes('administrator')) {
    constraints.push({
      type: 'security',
      name: 'requires_admin',
      value: true,
      operator: '=',
    });
  }
  if (requirement.includes('owner') || requirement.includes('their own')) {
    constraints.push({
      type: 'security',
      name: 'requires_ownership',
      value: true,
      operator: '=',
    });
  }

  // Availability constraints
  if (requirement.includes('always') || requirement.includes('24/7')) {
    constraints.push({
      type: 'availability',
      name: 'high_availability',
      value: 99.9,
      operator: '>=',
    });
  }

  // Exclusive access constraints
  if (requirement.includes('exclusive') || requirement.includes('only one')) {
    constraints.push({
      type: 'exclusive',
      name: 'exclusive_access',
      value: true,
      operator: '=',
    });
  }

  // Resource constraints from state (single StateSpec with stateName)
  if (chain.intent.expectedState) {
    const stateName = chain.intent.expectedState.stateName;
    if (stateName.includes('quota') || stateName.includes('limit')) {
      constraints.push({
        type: 'resource',
        name: stateName,
        value: chain.intent.expectedState.expectedTransition || 'limited',
        operator: '<=',
      });
    }
  }

  return constraints;
}

/**
 * Extract guarantees from a chain
 */
function extractGuarantees(chain: IntentCausalChain): IntentGuarantee[] {
  const guarantees: IntentGuarantee[] = [];
  const requirement = chain.intent.requirement.toLowerCase();

  // Latency guarantees
  if (requirement.includes('fast') || requirement.includes('quick') || requirement.includes('instant')) {
    guarantees.push({
      type: 'latency',
      name: 'response_time',
      requiredValue: 200,
      operator: '<',
    });
  }
  if (requirement.includes('real-time') || requirement.includes('realtime')) {
    guarantees.push({
      type: 'latency',
      name: 'response_time',
      requiredValue: 100,
      operator: '<',
    });
  }

  // Throughput guarantees
  if (requirement.includes('bulk') || requirement.includes('batch')) {
    guarantees.push({
      type: 'throughput',
      name: 'batch_size',
      requiredValue: 100,
      operator: 'min',
    });
  }

  // Security guarantees
  if (requirement.includes('secure') || requirement.includes('encrypted')) {
    guarantees.push({
      type: 'security',
      name: 'encryption',
      requiredValue: true,
      operator: '=',
    });
  }

  return guarantees;
}

/**
 * Find edges from shared state keys
 */
function findSharedStateEdges(nodes: IntentNode[]): IntentEdge[] {
  const edges: IntentEdge[] = [];
  const stateToNodes = new Map<string, IntentNode[]>();

  // Build index of state -> nodes
  for (const node of nodes) {
    for (const key of node.stateKeys) {
      const existing = stateToNodes.get(key) || [];
      existing.push(node);
      stateToNodes.set(key, existing);
    }
  }

  // Create edges for shared state
  for (const [stateKey, sharingNodes] of Array.from(stateToNodes.entries())) {
    if (sharingNodes.length > 1) {
      // Create edges between all pairs
      for (let i = 0; i < sharingNodes.length; i++) {
        for (let j = i + 1; j < sharingNodes.length; j++) {
          const nodeA = sharingNodes[i];
          const nodeB = sharingNodes[j];

          edges.push({
            id: `edge-state-${nodeA.intentId}-${nodeB.intentId}-${stateKey}`,
            sourceIntentId: nodeA.intentId,
            targetIntentId: nodeB.intentId,
            type: 'WRITE',
            resource: stateKey,
            resourceType: 'state',
            bidirectional: true,
            conflictPotential: 'high',
            details: `Both intents interact with state key "${stateKey}"`,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Find edges from shared external anchors
 */
function findSharedAnchorEdges(nodes: IntentNode[]): IntentEdge[] {
  const edges: IntentEdge[] = [];
  const anchorToNodes = new Map<string, IntentNode[]>();

  // Build index of anchor -> nodes
  for (const node of nodes) {
    for (const anchor of node.externalAnchors) {
      const existing = anchorToNodes.get(anchor) || [];
      existing.push(node);
      anchorToNodes.set(anchor, existing);
    }
  }

  // Create edges for shared anchors
  for (const [anchor, sharingNodes] of Array.from(anchorToNodes.entries())) {
    if (sharingNodes.length > 1) {
      for (let i = 0; i < sharingNodes.length; i++) {
        for (let j = i + 1; j < sharingNodes.length; j++) {
          const nodeA = sharingNodes[i];
          const nodeB = sharingNodes[j];

          edges.push({
            id: `edge-anchor-${nodeA.intentId}-${nodeB.intentId}-${anchor}`,
            sourceIntentId: nodeA.intentId,
            targetIntentId: nodeB.intentId,
            type: 'DEPEND',
            resource: anchor,
            resourceType: 'anchor',
            bidirectional: true,
            conflictPotential: 'low',
            details: `Both intents depend on external anchor "${anchor}"`,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Find edges from constraint conflicts
 */
function findConstraintEdges(nodes: IntentNode[]): IntentEdge[] {
  const edges: IntentEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Check for conflicting constraints
      for (const constraintA of nodeA.constraints) {
        for (const constraintB of nodeB.constraints) {
          if (constraintA.name === constraintB.name) {
            // Same constraint name - check for conflict
            const conflict = detectConstraintConflict(constraintA, constraintB);
            if (conflict) {
              edges.push({
                id: `edge-constraint-${nodeA.intentId}-${nodeB.intentId}-${constraintA.name}`,
                sourceIntentId: nodeA.intentId,
                targetIntentId: nodeB.intentId,
                type: 'CONSTRAIN',
                resource: constraintA.name,
                resourceType: 'constraint',
                bidirectional: true,
                conflictPotential: 'high',
                details: conflict,
              });
            }
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Detect if two constraints conflict
 */
function detectConstraintConflict(
  a: IntentConstraint,
  b: IntentConstraint
): string | null {
  // Exclusive constraints always conflict
  if (a.type === 'exclusive' && b.type === 'exclusive') {
    return `Both intents require exclusive access to "${a.name}"`;
  }

  // Security level conflicts
  if (a.type === 'security' && b.type === 'security') {
    if (a.value !== b.value) {
      return `Security constraint conflict: ${a.name} requires ${a.value} vs ${b.value}`;
    }
  }

  // Resource limit conflicts
  if (a.type === 'resource' && b.type === 'resource') {
    // Check if combined usage might exceed limits
    if (typeof a.value === 'number' && typeof b.value === 'number') {
      return `Resource constraint conflict: both intents constrain ${a.name}`;
    }
  }

  return null;
}

/**
 * Find edges from guarantee requirements
 */
function findGuaranteeEdges(nodes: IntentNode[]): IntentEdge[] {
  const edges: IntentEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Check for conflicting guarantees
      for (const guaranteeA of nodeA.guarantees) {
        for (const guaranteeB of nodeB.guarantees) {
          if (guaranteeA.name === guaranteeB.name && guaranteeA.type === guaranteeB.type) {
            // Same guarantee - might create contention
            const conflict = detectGuaranteeConflict(guaranteeA, guaranteeB);
            if (conflict) {
              edges.push({
                id: `edge-guarantee-${nodeA.intentId}-${nodeB.intentId}-${guaranteeA.name}`,
                sourceIntentId: nodeA.intentId,
                targetIntentId: nodeB.intentId,
                type: 'CONSTRAIN',
                resource: guaranteeA.name,
                resourceType: 'guarantee',
                bidirectional: true,
                conflictPotential: conflict.severity === 'high' ? 'high' : 'low',
                details: conflict.message,
              });
            }
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Detect if two guarantees conflict
 */
function detectGuaranteeConflict(
  a: IntentGuarantee,
  b: IntentGuarantee
): { message: string; severity: 'high' | 'low' } | null {
  // Latency conflicts - stricter requirements compete for resources
  if (a.type === 'latency' && b.type === 'latency') {
    if (typeof a.requiredValue === 'number' && typeof b.requiredValue === 'number') {
      const strictest = Math.min(a.requiredValue, b.requiredValue);
      if (strictest < 100) {
        return {
          message: `Both intents require low latency (${a.requiredValue}ms vs ${b.requiredValue}ms) - may compete for resources`,
          severity: 'high',
        };
      }
    }
  }

  // Throughput conflicts
  if (a.type === 'throughput' && b.type === 'throughput') {
    return {
      message: `Both intents have throughput requirements - may compete for capacity`,
      severity: 'low',
    };
  }

  return null;
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(nodes: IntentNode[], edges: IntentEdge[]): boolean {
  const adjList = new Map<string, string[]>();

  // Build adjacency list
  for (const node of nodes) {
    adjList.set(node.intentId, []);
  }
  for (const edge of edges) {
    const existing = adjList.get(edge.sourceIntentId) || [];
    existing.push(edge.targetIntentId);
    adjList.set(edge.sourceIntentId, existing);

    if (edge.bidirectional) {
      const existingRev = adjList.get(edge.targetIntentId) || [];
      existingRev.push(edge.sourceIntentId);
      adjList.set(edge.targetIntentId, existingRev);
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true; // Back edge found
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.intentId)) {
      if (dfs(node.intentId)) return true;
    }
  }

  return false;
}

/**
 * Find connected components using Union-Find
 */
function findConnectedComponents(nodes: IntentNode[], edges: IntentEdge[]): string[][] {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    parent.set(node.intentId, node.intentId);
    rank.set(node.intentId, 0);
  }

  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string): void {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      const rankX = rank.get(rootX) || 0;
      const rankY = rank.get(rootY) || 0;
      if (rankX < rankY) {
        parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        parent.set(rootY, rootX);
      } else {
        parent.set(rootY, rootX);
        rank.set(rootX, rankX + 1);
      }
    }
  }

  // Union all edges
  for (const edge of edges) {
    union(edge.sourceIntentId, edge.targetIntentId);
  }

  // Group by component
  const components = new Map<string, string[]>();
  for (const node of nodes) {
    const root = find(node.intentId);
    const component = components.get(root) || [];
    component.push(node.intentId);
    components.set(root, component);
  }

  return Array.from(components.values()).sort((a, b) => b.length - a.length);
}

// ============================================
// GLOBAL INVARIANTS
// ============================================

/**
 * Types of global invariants
 */
export type InvariantType =
  | 'NO_DUAL_EXCLUSIVE'       // No two intents can have exclusive ownership of same resource
  | 'CONSTRAINT_MONOTONICITY' // Security/availability can only increase, not decrease
  | 'RESOURCE_FEASIBILITY'    // Combined resource usage must be feasible
  | 'POLICY_COMPLIANCE';      // Policy-inferred answers cannot violate invariants

/**
 * A global invariant definition
 */
export interface GlobalInvariant {
  id: string;
  type: InvariantType;
  name: string;
  description: string;
  check: (graph: IntentInteractionGraph) => InvariantViolation[];
}

/**
 * A violation of a global invariant
 */
export interface InvariantViolation {
  id: string;
  invariantId: string;
  invariantType: InvariantType;
  type: 'INTENT_VS_SYSTEM';  // New violation type
  severity: 'critical' | 'non-critical';
  affectedIntentIds: string[];
  resource: string;
  description: string;
  suggestedResolution: string;
  requiresMultiIntentChange: boolean;
}

/**
 * Define all global invariants
 */
export function defineGlobalInvariants(): GlobalInvariant[] {
  return [
    {
      id: 'invariant-no-dual-exclusive',
      type: 'NO_DUAL_EXCLUSIVE',
      name: 'No Dual Exclusive Ownership',
      description: 'No two intents can require exclusive access to the same resource',
      check: checkNoDualExclusive,
    },
    {
      id: 'invariant-constraint-monotonicity',
      type: 'CONSTRAINT_MONOTONICITY',
      name: 'Constraint Monotonicity',
      description: 'Security and availability constraints can only increase, not decrease',
      check: checkConstraintMonotonicity,
    },
    {
      id: 'invariant-resource-feasibility',
      type: 'RESOURCE_FEASIBILITY',
      name: 'Resource Feasibility',
      description: 'Combined resource usage (timeouts, quotas, throughput) must be feasible',
      check: checkResourceFeasibility,
    },
    {
      id: 'invariant-policy-compliance',
      type: 'POLICY_COMPLIANCE',
      name: 'Policy Compliance',
      description: 'Policy-inferred answers cannot violate system invariants',
      check: checkPolicyCompliance,
    },
  ];
}

/**
 * Check for dual exclusive ownership violations
 */
function checkNoDualExclusive(graph: IntentInteractionGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Find all exclusive constraints
  const exclusiveByResource = new Map<string, IntentNode[]>();

  for (const node of graph.nodes) {
    for (const constraint of node.constraints) {
      if (constraint.type === 'exclusive' && constraint.value === true) {
        const existing = exclusiveByResource.get(constraint.name) || [];
        existing.push(node);
        exclusiveByResource.set(constraint.name, existing);
      }
    }
  }

  // Check for conflicts
  for (const [resource, nodes] of Array.from(exclusiveByResource.entries())) {
    if (nodes.length > 1) {
      violations.push({
        id: `violation-dual-exclusive-${resource}-${Date.now()}`,
        invariantId: 'invariant-no-dual-exclusive',
        invariantType: 'NO_DUAL_EXCLUSIVE',
        type: 'INTENT_VS_SYSTEM',
        severity: 'critical',
        affectedIntentIds: nodes.map(n => n.intentId),
        resource,
        description: `${nodes.length} intents require exclusive access to "${resource}": ${nodes.map(n => n.intentId).join(', ')}`,
        suggestedResolution: 'Designate one intent as the exclusive owner, or implement a locking mechanism',
        requiresMultiIntentChange: true,
      });
    }
  }

  return violations;
}

/**
 * Check for constraint monotonicity violations
 */
function checkConstraintMonotonicity(graph: IntentInteractionGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Group constraints by name
  const constraintsByName = new Map<string, Array<{ node: IntentNode; constraint: IntentConstraint }>>();

  for (const node of graph.nodes) {
    for (const constraint of node.constraints) {
      if (constraint.type === 'security' || constraint.type === 'availability') {
        const key = `${constraint.type}:${constraint.name}`;
        const existing = constraintsByName.get(key) || [];
        existing.push({ node, constraint });
        constraintsByName.set(key, existing);
      }
    }
  }

  // Check for violations
  for (const [key, entries] of Array.from(constraintsByName.entries())) {
    if (entries.length < 2) continue;

    // Sort by priority (critical first)
    const sorted = entries.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.node.priority] - priorityOrder[b.node.priority];
    });

    // Check if lower priority intents have stricter requirements
    for (let i = 1; i < sorted.length; i++) {
      const higher = sorted[0];
      const lower = sorted[i];

      if (isStricterConstraint(lower.constraint, higher.constraint)) {
        violations.push({
          id: `violation-monotonicity-${key}-${Date.now()}`,
          invariantId: 'invariant-constraint-monotonicity',
          invariantType: 'CONSTRAINT_MONOTONICITY',
          type: 'INTENT_VS_SYSTEM',
          severity: higher.constraint.type === 'security' ? 'critical' : 'non-critical',
          affectedIntentIds: [higher.node.intentId, lower.node.intentId],
          resource: key,
          description: `Lower-priority intent "${lower.node.intentId}" has stricter ${key} than higher-priority "${higher.node.intentId}"`,
          suggestedResolution: 'Elevate the constraint to the higher-priority intent, or reduce the requirement in the lower-priority intent',
          requiresMultiIntentChange: true,
        });
      }
    }
  }

  return violations;
}

/**
 * Check if constraint A is stricter than B
 */
function isStricterConstraint(a: IntentConstraint, b: IntentConstraint): boolean {
  if (a.type !== b.type || a.name !== b.name) return false;

  // For boolean constraints
  if (typeof a.value === 'boolean' && typeof b.value === 'boolean') {
    // true is stricter than false for security/availability
    return a.value === true && b.value === false;
  }

  // For numeric constraints
  if (typeof a.value === 'number' && typeof b.value === 'number') {
    if (a.operator === '>=' || a.operator === '>') {
      return a.value > b.value;
    }
    if (a.operator === '<=' || a.operator === '<') {
      return a.value < b.value;
    }
  }

  return false;
}

/**
 * Check for resource feasibility violations
 */
function checkResourceFeasibility(graph: IntentInteractionGraph): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  // Collect all resource constraints
  const resourceUsage = new Map<string, Array<{ node: IntentNode; constraint: IntentConstraint }>>();

  for (const node of graph.nodes) {
    for (const constraint of node.constraints) {
      if (constraint.type === 'resource' || constraint.type === 'latency' || constraint.type === 'throughput') {
        const key = constraint.name;
        const existing = resourceUsage.get(key) || [];
        existing.push({ node, constraint });
        resourceUsage.set(key, existing);
      }
    }
  }

  // Collect guarantee requirements
  const guaranteeRequirements = new Map<string, Array<{ node: IntentNode; guarantee: IntentGuarantee }>>();

  for (const node of graph.nodes) {
    for (const guarantee of node.guarantees) {
      const key = `${guarantee.type}:${guarantee.name}`;
      const existing = guaranteeRequirements.get(key) || [];
      existing.push({ node, guarantee });
      guaranteeRequirements.set(key, existing);
    }
  }

  // Check latency feasibility
  const latencyReqs = guaranteeRequirements.get('latency:response_time') || [];
  if (latencyReqs.length > 1) {
    // Multiple intents with latency requirements might compete
    const strictest = latencyReqs.reduce((min, curr) => {
      const currValue = typeof curr.guarantee.requiredValue === 'number' ? curr.guarantee.requiredValue : Infinity;
      const minValue = typeof min.guarantee.requiredValue === 'number' ? min.guarantee.requiredValue : Infinity;
      return currValue < minValue ? curr : min;
    });

    if (typeof strictest.guarantee.requiredValue === 'number' && strictest.guarantee.requiredValue < 100) {
      // Very strict latency with multiple intents
      if (latencyReqs.length > 3) {
        violations.push({
          id: `violation-feasibility-latency-${Date.now()}`,
          invariantId: 'invariant-resource-feasibility',
          invariantType: 'RESOURCE_FEASIBILITY',
          type: 'INTENT_VS_SYSTEM',
          severity: 'non-critical',
          affectedIntentIds: latencyReqs.map(r => r.node.intentId),
          resource: 'latency:response_time',
          description: `${latencyReqs.length} intents require low latency (${strictest.guarantee.requiredValue}ms or less) - may not be achievable under load`,
          suggestedResolution: 'Prioritize latency requirements or implement request queuing',
          requiresMultiIntentChange: false,
        });
      }
    }
  }

  // Check throughput feasibility
  const throughputReqs = guaranteeRequirements.get('throughput:batch_size') || [];
  if (throughputReqs.length > 1) {
    // Sum of throughput requirements
    let totalRequired = 0;
    for (const req of throughputReqs) {
      if (typeof req.guarantee.requiredValue === 'number') {
        totalRequired += req.guarantee.requiredValue;
      }
    }

    // Arbitrary threshold for demonstration
    const MAX_THROUGHPUT = 1000;
    if (totalRequired > MAX_THROUGHPUT) {
      violations.push({
        id: `violation-feasibility-throughput-${Date.now()}`,
        invariantId: 'invariant-resource-feasibility',
        invariantType: 'RESOURCE_FEASIBILITY',
        type: 'INTENT_VS_SYSTEM',
        severity: 'critical',
        affectedIntentIds: throughputReqs.map(r => r.node.intentId),
        resource: 'throughput:batch_size',
        description: `Combined throughput requirement (${totalRequired}) exceeds system capacity (${MAX_THROUGHPUT})`,
        suggestedResolution: 'Reduce batch sizes or implement staggered processing',
        requiresMultiIntentChange: true,
      });
    }
  }

  return violations;
}

/**
 * Check for policy compliance violations (placeholder for integration)
 */
function checkPolicyCompliance(graph: IntentInteractionGraph): InvariantViolation[] {
  // This would be populated by IMPL integration
  // For now, return empty - actual violations would be detected when policy answers are applied
  return [];
}

// ============================================
// GLOBAL CONSISTENCY CHECKER
// ============================================

/**
 * Result of global consistency check
 */
export interface GlobalConsistencyResult {
  status: 'CONSISTENT' | 'VIOLATIONS_DETECTED' | 'BLOCKED';
  invariantsChecked: number;
  violations: InvariantViolation[];
  blockingViolations: InvariantViolation[];
  requiresMultiIntentResolution: boolean;
  affectedIntentGroups: string[][];

  // For IRCL integration
  newContradictions: CrossIntentContradiction[];
  newClarifications: CrossIntentClarification[];
}

/**
 * Cross-intent contradiction for IRCL
 */
export interface CrossIntentContradiction {
  id: string;
  type: 'CROSS_INTENT_CONFLICT';
  sourceIntentIds: string[];
  resource: string;
  invariantType: InvariantType;
  description: string;
  severity: 'critical' | 'non-critical';
  requiresAtomicResolution: boolean;
}

/**
 * Cross-intent clarification
 */
export interface CrossIntentClarification {
  id: string;
  affectedIntentIds: string[];
  question: string;
  context: string;
  options: Array<{
    label: string;
    description: string;
    intentChanges: Array<{
      intentId: string;
      change: string;
    }>;
  }>;
  priority: 'critical' | 'high' | 'medium';
  invariantType: InvariantType;
}

/**
 * Detect global violations in the intent graph
 */
export function detectGlobalViolations(
  graph: IntentInteractionGraph
): GlobalConsistencyResult {
  console.log('[ITGCL] ==========================================');
  console.log('[ITGCL] GLOBAL CONSISTENCY CHECKER');
  console.log('[ITGCL] ==========================================');

  const invariants = defineGlobalInvariants();
  const allViolations: InvariantViolation[] = [];

  // Check each invariant
  for (const invariant of invariants) {
    console.log(`[ITGCL] Checking: ${invariant.name}`);
    const violations = invariant.check(graph);
    allViolations.push(...violations);
    console.log(`[ITGCL]   Violations: ${violations.length}`);
  }

  // Sort violations deterministically
  allViolations.sort((a, b) => {
    // Critical first
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    // Then by number of affected intents (more is worse)
    if (a.affectedIntentIds.length !== b.affectedIntentIds.length) {
      return b.affectedIntentIds.length - a.affectedIntentIds.length;
    }
    // Then by resource name
    return a.resource.localeCompare(b.resource);
  });

  // Identify blocking violations
  const blockingViolations = allViolations.filter(v => v.severity === 'critical');

  // Determine if multi-intent resolution is required
  const requiresMultiIntentResolution = allViolations.some(v => v.requiresMultiIntentChange);

  // Group affected intents
  const affectedGroups = groupAffectedIntents(allViolations);

  // Generate contradictions for IRCL
  const newContradictions = generateCrossIntentContradictions(allViolations);

  // Generate clarifications
  const newClarifications = generateCrossIntentClarifications(allViolations);

  // Determine status
  let status: 'CONSISTENT' | 'VIOLATIONS_DETECTED' | 'BLOCKED' = 'CONSISTENT';
  if (blockingViolations.length > 0) {
    status = 'BLOCKED';
  } else if (allViolations.length > 0) {
    status = 'VIOLATIONS_DETECTED';
  }

  console.log('[ITGCL] ------------------------------------------');
  console.log(`[ITGCL] Status: ${status}`);
  console.log(`[ITGCL] Invariants checked: ${invariants.length}`);
  console.log(`[ITGCL] Total violations: ${allViolations.length}`);
  console.log(`[ITGCL] Blocking violations: ${blockingViolations.length}`);
  console.log(`[ITGCL] Requires multi-intent resolution: ${requiresMultiIntentResolution}`);
  console.log('[ITGCL] ==========================================');

  return {
    status,
    invariantsChecked: invariants.length,
    violations: allViolations,
    blockingViolations,
    requiresMultiIntentResolution,
    affectedIntentGroups: affectedGroups,
    newContradictions,
    newClarifications,
  };
}

/**
 * Group affected intents by violation
 */
function groupAffectedIntents(violations: InvariantViolation[]): string[][] {
  const groups: string[][] = [];
  const seen = new Set<string>();

  for (const violation of violations) {
    const key = violation.affectedIntentIds.sort().join(',');
    if (!seen.has(key)) {
      seen.add(key);
      groups.push(violation.affectedIntentIds);
    }
  }

  return groups;
}

/**
 * Generate cross-intent contradictions for IRCL integration
 */
function generateCrossIntentContradictions(violations: InvariantViolation[]): CrossIntentContradiction[] {
  return violations.map(v => ({
    id: `contradiction-${v.id}`,
    type: 'CROSS_INTENT_CONFLICT',
    sourceIntentIds: v.affectedIntentIds,
    resource: v.resource,
    invariantType: v.invariantType,
    description: v.description,
    severity: v.severity,
    requiresAtomicResolution: v.requiresMultiIntentChange,
  }));
}

/**
 * Generate cross-intent clarifications
 */
function generateCrossIntentClarifications(violations: InvariantViolation[]): CrossIntentClarification[] {
  const clarifications: CrossIntentClarification[] = [];

  for (const violation of violations) {
    // Generate appropriate clarification based on violation type
    switch (violation.invariantType) {
      case 'NO_DUAL_EXCLUSIVE':
        clarifications.push({
          id: `clarification-${violation.id}`,
          affectedIntentIds: violation.affectedIntentIds,
          question: `Multiple intents require exclusive access to "${violation.resource}". Which intent should have exclusive ownership?`,
          context: violation.description,
          options: violation.affectedIntentIds.map(intentId => ({
            label: `Designate ${intentId}`,
            description: `Give ${intentId} exclusive access to ${violation.resource}`,
            intentChanges: violation.affectedIntentIds
              .filter(id => id !== intentId)
              .map(id => ({
                intentId: id,
                change: `Remove exclusive access to ${violation.resource}`,
              })),
          })),
          priority: violation.severity === 'critical' ? 'critical' : 'high',
          invariantType: violation.invariantType,
        });
        break;

      case 'CONSTRAINT_MONOTONICITY':
        clarifications.push({
          id: `clarification-${violation.id}`,
          affectedIntentIds: violation.affectedIntentIds,
          question: `Constraint monotonicity violation for "${violation.resource}". How should this be resolved?`,
          context: violation.description,
          options: [
            {
              label: 'Elevate constraint',
              description: 'Apply the stricter constraint to all affected intents',
              intentChanges: violation.affectedIntentIds.map(id => ({
                intentId: id,
                change: `Apply stricter ${violation.resource} constraint`,
              })),
            },
            {
              label: 'Relax constraint',
              description: 'Reduce the constraint requirement in the lower-priority intent',
              intentChanges: [{
                intentId: violation.affectedIntentIds[1],
                change: `Reduce ${violation.resource} constraint`,
              }],
            },
          ],
          priority: violation.severity === 'critical' ? 'critical' : 'medium',
          invariantType: violation.invariantType,
        });
        break;

      case 'RESOURCE_FEASIBILITY':
        clarifications.push({
          id: `clarification-${violation.id}`,
          affectedIntentIds: violation.affectedIntentIds,
          question: `Resource feasibility issue for "${violation.resource}". How should resources be allocated?`,
          context: violation.description,
          options: [
            {
              label: 'Prioritize by criticality',
              description: 'Allocate resources to critical intents first',
              intentChanges: violation.affectedIntentIds.map(id => ({
                intentId: id,
                change: 'Adjust resource allocation by priority',
              })),
            },
            {
              label: 'Reduce requirements',
              description: 'Reduce resource requirements across all intents',
              intentChanges: violation.affectedIntentIds.map(id => ({
                intentId: id,
                change: `Reduce ${violation.resource} requirement`,
              })),
            },
          ],
          priority: violation.severity === 'critical' ? 'critical' : 'medium',
          invariantType: violation.invariantType,
        });
        break;

      default:
        // Generic clarification
        clarifications.push({
          id: `clarification-${violation.id}`,
          affectedIntentIds: violation.affectedIntentIds,
          question: `How should the "${violation.invariantType}" violation be resolved?`,
          context: violation.description,
          options: [
            {
              label: 'Resolve automatically',
              description: violation.suggestedResolution,
              intentChanges: violation.affectedIntentIds.map(id => ({
                intentId: id,
                change: 'Apply suggested resolution',
              })),
            },
          ],
          priority: violation.severity === 'critical' ? 'critical' : 'medium',
          invariantType: violation.invariantType,
        });
    }
  }

  return clarifications;
}

// ============================================
// IRCL INTEGRATION
// ============================================

/**
 * Result of ITGCL analysis for IRCL integration
 */
export interface ITGCLAnalysisResult {
  graph: IntentInteractionGraph;
  consistency: GlobalConsistencyResult;

  // For IRCL
  hasBlockingViolations: boolean;
  shouldBlockProceed: boolean;
  irclStatusOverride: 'CONTRADICTORY' | null;

  // New contradictions to add to IRCL
  additionalContradictions: CrossIntentContradiction[];
  additionalClarifications: CrossIntentClarification[];
}

/**
 * Run full ITGCL analysis for IRCL integration
 */
export function runITGCLAnalysis(
  buildId: string,
  chains: IntentCausalChain[]
): ITGCLAnalysisResult {
  console.log('[ITGCL] ==========================================');
  console.log('[ITGCL] RUNNING FULL ITGCL ANALYSIS');
  console.log('[ITGCL] ==========================================');

  // Build the interaction graph
  const graph = buildIntentInteractionGraph(buildId, chains);

  // Run consistency checks
  const consistency = detectGlobalViolations(graph);

  // Determine IRCL impact
  const hasBlockingViolations = consistency.blockingViolations.length > 0;
  const shouldBlockProceed = hasBlockingViolations;
  const irclStatusOverride = hasBlockingViolations ? 'CONTRADICTORY' as const : null;

  console.log('[ITGCL] ------------------------------------------');
  console.log(`[ITGCL] Has blocking violations: ${hasBlockingViolations}`);
  console.log(`[ITGCL] Should block proceed: ${shouldBlockProceed}`);
  console.log(`[ITGCL] IRCL status override: ${irclStatusOverride || 'none'}`);
  console.log('[ITGCL] ==========================================');

  return {
    graph,
    consistency,
    hasBlockingViolations,
    shouldBlockProceed,
    irclStatusOverride,
    additionalContradictions: consistency.newContradictions,
    additionalClarifications: consistency.newClarifications,
  };
}

// ============================================
// LOGGING
// ============================================

/**
 * Log ITGCL analysis result
 */
export function logITGCLResult(result: ITGCLAnalysisResult): void {
  console.log('[ITGCL] ==========================================');
  console.log('[ITGCL] ITGCL ANALYSIS RESULT');
  console.log('[ITGCL] ==========================================');
  console.log(`[ITGCL] Graph: ${result.graph.nodeCount} nodes, ${result.graph.edgeCount} edges`);
  console.log(`[ITGCL] Has cycles: ${result.graph.hasCycles}`);
  console.log(`[ITGCL] Connected components: ${result.graph.connectedComponents.length}`);
  console.log('[ITGCL] ------------------------------------------');
  console.log(`[ITGCL] Consistency status: ${result.consistency.status}`);
  console.log(`[ITGCL] Invariants checked: ${result.consistency.invariantsChecked}`);
  console.log(`[ITGCL] Total violations: ${result.consistency.violations.length}`);
  console.log(`[ITGCL] Blocking violations: ${result.consistency.blockingViolations.length}`);

  if (result.consistency.violations.length > 0) {
    console.log('[ITGCL] ------------------------------------------');
    console.log('[ITGCL] Violations:');
    for (const v of result.consistency.violations.slice(0, 5)) {
      console.log(`[ITGCL]   [${v.severity}] ${v.invariantType}: ${v.description.slice(0, 60)}...`);
    }
    if (result.consistency.violations.length > 5) {
      console.log(`[ITGCL]   ... and ${result.consistency.violations.length - 5} more`);
    }
  }

  if (result.irclStatusOverride) {
    console.log('[ITGCL] ------------------------------------------');
    console.log(`[ITGCL] ⚠️ IRCL STATUS OVERRIDE: ${result.irclStatusOverride}`);
  }

  console.log('[ITGCL] ==========================================');
}

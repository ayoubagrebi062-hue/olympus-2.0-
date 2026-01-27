/**
 * Temporal Singularity Expander
 *
 * Extends ORIS Decision Singularities into temporal cones.
 * Maps how a decision point propagates through future temporal steps.
 *
 * KEY PRINCIPLE:
 * - Every decision creates a "cone" of affected future states
 * - Singularities don't just exist at a point - they propagate forward
 * - We must understand temporal impact before allowing decisions
 *
 * TEMPORAL CONE CONCEPT:
 * ```
 *        Step 0       Step 1       Step 2       Step 3
 *           *
 *          /|\
 *         / | \
 *        /  |  \
 *       *   *   *      (Decision branches)
 *      /|\ /|\ /|\
 *     ********* ***    (Propagated effects)
 * ```
 *
 * NON-NEGOTIABLE:
 * - Deterministic cone expansion
 * - No probabilistic branching
 * - Complete temporal coverage
 * - No ML/AI prediction
 */

import type {
  TemporalContract,
  SingularityCone,
  TemporalPropagation,
  TemporalSingularityV2 as TemporalSingularity
} from './types';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

// Singularity constraints
const MAX_CONE_DEPTH = 50;
const MAX_BRANCHES_PER_STEP = 10;
const PROPAGATION_DECAY_RATE = 0.1; // 10% decay per step

/**
 * Types of singularity effects
 */
type SingularityEffect =
  | 'ENTROPY_INJECTION'      // Adds entropy to future
  | 'ENTROPY_REDUCTION'      // Reduces entropy
  | 'MUTATION_TRIGGER'       // Causes mutations
  | 'MUTATION_BLOCKER'       // Prevents mutations
  | 'LIFESPAN_EXTENSION'     // Extends viable lifespan
  | 'LIFESPAN_REDUCTION'     // Reduces viable lifespan
  | 'INTENT_STRENGTHENING'   // Strengthens intent
  | 'INTENT_WEAKENING';      // Weakens intent

/**
 * Cone node - a point in the temporal cone
 */
interface ConeNode {
  step: number;
  branch: number;
  effect_strength: number;
  effects: SingularityEffect[];
  entropy_delta: number;
  mutation_delta: number;
  intent_delta: number;
}

/**
 * Decision input for singularity creation
 */
interface DecisionInput {
  decision_id: string;
  decision_type: string;
  magnitude: number;        // 0-1, how significant is this decision
  entropy_impact: number;   // -1 to 1, negative reduces entropy
  mutation_potential: number; // 0-1, likelihood to cause mutations
  intent_impact: number;    // -1 to 1, negative weakens intent
}

export class TemporalSingularityExpander {
  // Registered singularities
  private singularities: Map<string, TemporalSingularity> = new Map();

  /**
   * Create a singularity from a decision
   *
   * @param projectId The project ID
   * @param contract The temporal contract
   * @param decision The decision that creates the singularity
   * @returns The created temporal singularity
   */
  createSingularity(
    projectId: string,
    contract: TemporalContract,
    decision: DecisionInput
  ): TemporalSingularity {
    const singularityId = `SING-${Date.now().toString(36)}-${decision.decision_id.substring(0, 4)}`;
    const now = new Date().toISOString();

    // Determine primary effects based on decision
    const effects = this.determineEffects(decision);

    // Calculate initial cone
    const cone = this.expandCone(decision, contract, effects);

    // Calculate propagation metrics
    const propagation = this.calculatePropagation(cone);

    const singularity: TemporalSingularity = {
      singularity_id: singularityId,
      project_id: projectId,
      contract_id: contract.contract_id,
      decision_id: decision.decision_id,
      created_at: now,
      origin_step: 0, // Singularity originates at current step
      cone,
      propagation,
      effects,
      magnitude: decision.magnitude,
      temporal_reach: cone.depth,
      contained: this.isConeContained(cone, contract)
    };

    // Register the singularity
    this.singularities.set(singularityId, singularity);

    return singularity;
  }

  /**
   * Determine effects based on decision characteristics
   */
  private determineEffects(decision: DecisionInput): SingularityEffect[] {
    const effects: SingularityEffect[] = [];

    // Entropy effects
    if (decision.entropy_impact > 0.1) {
      effects.push('ENTROPY_INJECTION');
    } else if (decision.entropy_impact < -0.1) {
      effects.push('ENTROPY_REDUCTION');
    }

    // Mutation effects
    if (decision.mutation_potential > 0.5) {
      effects.push('MUTATION_TRIGGER');
    } else if (decision.mutation_potential < 0.1) {
      effects.push('MUTATION_BLOCKER');
    }

    // Intent effects
    if (decision.intent_impact > 0.1) {
      effects.push('INTENT_STRENGTHENING');
    } else if (decision.intent_impact < -0.1) {
      effects.push('INTENT_WEAKENING');
    }

    // Lifespan effects (derived from combination)
    if (decision.entropy_impact < 0 && decision.intent_impact > 0) {
      effects.push('LIFESPAN_EXTENSION');
    } else if (decision.entropy_impact > 0.3 && decision.intent_impact < -0.1) {
      effects.push('LIFESPAN_REDUCTION');
    }

    return effects;
  }

  /**
   * Expand the temporal cone
   */
  private expandCone(
    decision: DecisionInput,
    contract: TemporalContract,
    effects: SingularityEffect[]
  ): SingularityCone {
    const nodes: ConeNode[] = [];
    const maxDepth = Math.min(contract.intended_lifespan, MAX_CONE_DEPTH);

    // Calculate how many steps the singularity affects
    const reachFactor = decision.magnitude * 0.5 + 0.5; // 50-100% of max
    const actualDepth = Math.ceil(maxDepth * reachFactor);

    // Generate cone nodes
    for (let step = 1; step <= actualDepth; step++) {
      // Effect strength decays with distance
      const effectStrength = Math.pow(1 - PROPAGATION_DECAY_RATE, step) * decision.magnitude;

      // Number of branches at this step (deterministic)
      const branches = Math.min(
        MAX_BRANCHES_PER_STEP,
        Math.ceil(effectStrength * 3) // Up to 3 branches per unit strength
      );

      for (let branch = 0; branch < branches; branch++) {
        const node: ConeNode = {
          step,
          branch,
          effect_strength: effectStrength,
          effects: this.filterEffectsForStrength(effects, effectStrength),
          entropy_delta: decision.entropy_impact * effectStrength,
          mutation_delta: decision.mutation_potential * effectStrength > 0.3 ? 1 : 0,
          intent_delta: decision.intent_impact * effectStrength
        };
        nodes.push(node);
      }

      // Stop if effect strength too low
      if (effectStrength < 0.01) {
        break;
      }
    }

    // Calculate cone metrics
    const totalEntropyInjection = nodes.reduce((sum, n) => sum + Math.max(0, n.entropy_delta), 0);
    const totalMutations = nodes.reduce((sum, n) => sum + n.mutation_delta, 0);
    const avgIntentImpact = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.intent_delta, 0) / nodes.length
      : 0;

    return {
      depth: actualDepth,
      nodes_count: nodes.length,
      total_entropy_injection: totalEntropyInjection,
      total_mutations_triggered: totalMutations,
      avg_intent_impact: avgIntentImpact,
      breach_steps: this.findBreachSteps(nodes, contract)
    };
  }

  /**
   * Filter effects based on remaining strength
   */
  private filterEffectsForStrength(
    effects: SingularityEffect[],
    strength: number
  ): SingularityEffect[] {
    // Only propagate strong effects if strength is high enough
    const threshold = 0.1;
    if (strength < threshold) {
      return [];
    }

    // Critical effects propagate further
    const criticalEffects: SingularityEffect[] = ['LIFESPAN_REDUCTION', 'INTENT_WEAKENING'];
    if (strength < 0.3) {
      return effects.filter(e => criticalEffects.includes(e));
    }

    return effects;
  }

  /**
   * Find steps where cone breaches contract limits
   */
  private findBreachSteps(nodes: ConeNode[], contract: TemporalContract): number[] {
    const breachSteps: number[] = [];
    let cumulativeEntropy = contract.baseline_entropy;
    let cumulativeMutations = 0;

    // Group nodes by step
    const stepMap = new Map<number, ConeNode[]>();
    for (const node of nodes) {
      const existing = stepMap.get(node.step) || [];
      existing.push(node);
      stepMap.set(node.step, existing);
    }

    // Check each step
    for (const [step, stepNodes] of stepMap) {
      // Accumulate effects
      const stepEntropy = stepNodes.reduce((sum, n) => sum + n.entropy_delta, 0);
      const stepMutations = stepNodes.reduce((sum, n) => sum + n.mutation_delta, 0);

      cumulativeEntropy += stepEntropy;
      cumulativeMutations += stepMutations;

      // Check breaches
      const entropyDrift = Math.abs(cumulativeEntropy - contract.baseline_entropy);
      if (entropyDrift > contract.max_entropy_drift) {
        breachSteps.push(step);
      }
      if (cumulativeMutations > contract.allowed_future_mutations) {
        breachSteps.push(step);
      }
    }

    return [...new Set(breachSteps)].sort((a, b) => a - b);
  }

  /**
   * Calculate propagation characteristics
   */
  private calculatePropagation(cone: SingularityCone): TemporalPropagation {
    const pattern = this.determinePropagationPattern(cone);
    const velocity = cone.depth > 0
      ? cone.total_entropy_injection / cone.depth
      : 0;
    const damping = PROPAGATION_DECAY_RATE;

    return {
      pattern,
      velocity,
      damping,
      half_life: Math.ceil(Math.log(0.5) / Math.log(1 - damping)),
      terminal_step: cone.breach_steps.length > 0
        ? cone.breach_steps[0]
        : cone.depth
    };
  }

  /**
   * Determine propagation pattern
   */
  private determinePropagationPattern(
    cone: SingularityCone
  ): 'LINEAR' | 'EXPONENTIAL' | 'DAMPENED' | 'OSCILLATING' {
    if (cone.total_entropy_injection > cone.depth * 0.1) {
      return 'EXPONENTIAL';
    }
    if (cone.avg_intent_impact < -0.2) {
      return 'OSCILLATING';
    }
    if (cone.nodes_count < cone.depth) {
      return 'DAMPENED';
    }
    return 'LINEAR';
  }

  /**
   * Check if cone is contained within contract limits
   */
  private isConeContained(cone: SingularityCone, contract: TemporalContract): boolean {
    return cone.breach_steps.length === 0 &&
           cone.total_mutations_triggered <= contract.allowed_future_mutations &&
           cone.total_entropy_injection <= contract.max_entropy_drift;
  }

  /**
   * Get singularity by ID
   */
  getSingularity(singularityId: string): TemporalSingularity | null {
    return this.singularities.get(singularityId) ?? null;
  }

  /**
   * Get all singularities for a project
   */
  getProjectSingularities(projectId: string): TemporalSingularity[] {
    return Array.from(this.singularities.values())
      .filter(s => s.project_id === projectId);
  }

  /**
   * Check if any singularity breaches contract
   */
  hasUncontainedSingularity(projectId: string): boolean {
    const singularities = this.getProjectSingularities(projectId);
    return singularities.some(s => !s.contained);
  }

  /**
   * Get combined temporal impact of all singularities
   */
  getCombinedImpact(projectId: string): {
    total_entropy_injection: number;
    total_mutations: number;
    net_intent_impact: number;
    earliest_breach: number | null;
    all_contained: boolean;
  } {
    const singularities = this.getProjectSingularities(projectId);

    if (singularities.length === 0) {
      return {
        total_entropy_injection: 0,
        total_mutations: 0,
        net_intent_impact: 0,
        earliest_breach: null,
        all_contained: true
      };
    }

    const totalEntropy = singularities.reduce(
      (sum, s) => sum + s.cone.total_entropy_injection, 0
    );
    const totalMutations = singularities.reduce(
      (sum, s) => sum + s.cone.total_mutations_triggered, 0
    );
    const netIntent = singularities.reduce(
      (sum, s) => sum + s.cone.avg_intent_impact * s.magnitude, 0
    ) / singularities.length;

    const allBreaches = singularities.flatMap(s => s.cone.breach_steps);
    const earliestBreach = allBreaches.length > 0
      ? Math.min(...allBreaches)
      : null;

    return {
      total_entropy_injection: totalEntropy,
      total_mutations: totalMutations,
      net_intent_impact: netIntent,
      earliest_breach: earliestBreach,
      all_contained: singularities.every(s => s.contained)
    };
  }

  /**
   * Evaluate if a decision should be allowed based on temporal impact
   */
  evaluateDecision(
    projectId: string,
    contract: TemporalContract,
    decision: DecisionInput
  ): {
    allowed: boolean;
    reason: string;
    singularity: TemporalSingularity | null;
  } {
    // Create hypothetical singularity (don't register yet)
    const effects = this.determineEffects(decision);
    const cone = this.expandCone(decision, contract, effects);

    // Check if cone would breach contract
    if (cone.breach_steps.length > 0) {
      return {
        allowed: false,
        reason: `Decision would cause contract breach at step ${cone.breach_steps[0]}`,
        singularity: null
      };
    }

    // Check combined impact with existing singularities
    const existing = this.getCombinedImpact(projectId);
    const combinedEntropy = existing.total_entropy_injection + cone.total_entropy_injection;
    const combinedMutations = existing.total_mutations + cone.total_mutations_triggered;

    if (combinedEntropy > contract.max_entropy_drift * 1.5) {
      return {
        allowed: false,
        reason: `Combined entropy injection ${combinedEntropy.toFixed(4)} would exceed safe threshold`,
        singularity: null
      };
    }

    if (combinedMutations > contract.allowed_future_mutations) {
      return {
        allowed: false,
        reason: `Combined mutations ${combinedMutations} would exceed contract limit ${contract.allowed_future_mutations}`,
        singularity: null
      };
    }

    // Decision is allowed - create and register singularity
    const singularity = this.createSingularity(projectId, contract, decision);

    return {
      allowed: true,
      reason: 'Decision temporal impact is within contract limits',
      singularity
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_singularities: number;
    contained: number;
    uncontained: number;
    avg_magnitude: number;
    avg_reach: number;
  } {
    const all = Array.from(this.singularities.values());
    const count = all.length;

    if (count === 0) {
      return {
        total_singularities: 0,
        contained: 0,
        uncontained: 0,
        avg_magnitude: 0,
        avg_reach: 0
      };
    }

    const contained = all.filter(s => s.contained).length;
    const avgMagnitude = all.reduce((sum, s) => sum + s.magnitude, 0) / count;
    const avgReach = all.reduce((sum, s) => sum + s.temporal_reach, 0) / count;

    return {
      total_singularities: count,
      contained,
      uncontained: count - contained,
      avg_magnitude: avgMagnitude,
      avg_reach: avgReach
    };
  }

  /**
   * Log singularity details
   */
  logSingularity(singularity: TemporalSingularity): void {
    console.log('[TSL-SING] ==========================================');
    console.log(`[TSL-SING] Singularity ID: ${singularity.singularity_id}`);
    console.log(`[TSL-SING] Decision: ${singularity.decision_id}`);
    console.log(`[TSL-SING] Magnitude: ${singularity.magnitude.toFixed(2)}`);
    console.log(`[TSL-SING] Temporal Reach: ${singularity.temporal_reach} steps`);
    console.log(`[TSL-SING] Contained: ${singularity.contained ? 'YES' : 'NO'}`);
    console.log('[TSL-SING] ------------------------------------------');
    console.log('[TSL-SING] CONE:');
    console.log(`[TSL-SING]   Depth: ${singularity.cone.depth}`);
    console.log(`[TSL-SING]   Nodes: ${singularity.cone.nodes_count}`);
    console.log(`[TSL-SING]   Entropy Injection: ${singularity.cone.total_entropy_injection.toFixed(4)}`);
    console.log(`[TSL-SING]   Mutations Triggered: ${singularity.cone.total_mutations_triggered}`);
    console.log(`[TSL-SING]   Avg Intent Impact: ${singularity.cone.avg_intent_impact.toFixed(4)}`);

    if (singularity.cone.breach_steps.length > 0) {
      console.log(`[TSL-SING]   Breach Steps: ${singularity.cone.breach_steps.join(', ')}`);
    }

    console.log('[TSL-SING] ------------------------------------------');
    console.log('[TSL-SING] PROPAGATION:');
    console.log(`[TSL-SING]   Pattern: ${singularity.propagation.pattern}`);
    console.log(`[TSL-SING]   Velocity: ${singularity.propagation.velocity.toFixed(4)}`);
    console.log(`[TSL-SING]   Half-life: ${singularity.propagation.half_life} steps`);
    console.log(`[TSL-SING]   Terminal Step: ${singularity.propagation.terminal_step}`);
    console.log('[TSL-SING] ==========================================');
  }

  /**
   * Export singularities for persistence
   */
  exportSingularities(): Record<string, TemporalSingularity> {
    const exported: Record<string, TemporalSingularity> = {};
    for (const [id, singularity] of this.singularities) {
      exported[id] = singularity;
    }
    return exported;
  }

  /**
   * Import singularities from persistence
   */
  importSingularities(singularities: Record<string, TemporalSingularity>): void {
    for (const [id, singularity] of Object.entries(singularities)) {
      this.singularities.set(id, singularity);
    }
  }
}

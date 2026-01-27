/**
 * Forward Temporal Simulator
 *
 * Simulates N future evolution steps to detect temporal violations BEFORE they occur.
 *
 * KEY PRINCIPLE:
 * - If a system cannot survive its future, it must not be created in the present
 * - We simulate forward, not predict - deterministic replay of IE → AEC → RLL
 * - ANY future violation = BLOCK_PRESENT
 *
 * SIMULATION APPROACH:
 * 1. Take current state snapshot
 * 2. For each step 1..N:
 *    - Simulate intent evolution (IE)
 *    - Simulate entropy change (AEC)
 *    - Check reality lock constraints (RLL)
 * 3. If ANY step violates contract → block present
 *
 * NON-NEGOTIABLE:
 * - No probabilistic simulation
 * - No heuristic future prediction
 * - Deterministic state transition only
 * - No ML/AI in simulation
 */

import type {
  TemporalContract,
  TemporalSimulationConfig,
  TemporalStepV2 as TemporalStep,
  TemporalViolationV2 as TemporalViolation,
  ForwardSimulationResultV2 as ForwardSimulationResult
} from './types';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

// Simulation constraints
const DEFAULT_SIMULATION_DEPTH = 10;
const MAX_SIMULATION_DEPTH = 100;
const MIN_SIMULATION_DEPTH = 1;

// Violation types
type ViolationType =
  | 'ENTROPY_DRIFT_EXCEEDED'
  | 'MUTATION_LIMIT_EXCEEDED'
  | 'LIFESPAN_EXCEEDED'
  | 'REALITY_LOCK_VIOLATED'
  | 'INTENT_DECAY_FATAL';

/**
 * Simulated state at a given temporal step
 */
interface SimulatedState {
  step: number;
  entropy: number;
  mutationCount: number;
  intentStrength: number;
  realityLockIntact: boolean;
  timestamp: string;
}

/**
 * Intent evolution parameters (simplified IE simulation)
 */
interface IntentEvolutionParams {
  decayRate: number;        // How fast intents decay per step (0-1)
  mutationProbability: number; // Chance of mutation per step (0-1, but deterministic seed)
  entropyGrowthRate: number;   // Entropy increase per step
}

export class ForwardTemporalSimulator {
  // Default evolution parameters (conservative)
  private defaultEvolutionParams: IntentEvolutionParams = {
    decayRate: 0.02,          // 2% decay per step
    mutationProbability: 0.1,  // 10% mutation chance (deterministic)
    entropyGrowthRate: 0.01    // 1% entropy growth per step
  };

  /**
   * Run forward temporal simulation
   *
   * @param contract The temporal contract to simulate against
   * @param currentState Current system state
   * @param config Simulation configuration
   * @returns Forward simulation result
   */
  simulate(
    contract: TemporalContract,
    currentState: {
      entropy: number;
      mutationCount: number;
      intentStrength: number;
    },
    config?: Partial<TemporalSimulationConfig>
  ): ForwardSimulationResult {
    const simulationId = `SIM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();

    // Merge config with defaults
    const simulationConfig: TemporalSimulationConfig = {
      depth: config?.depth ?? DEFAULT_SIMULATION_DEPTH,
      entropyGrowthRate: config?.entropyGrowthRate ?? this.defaultEvolutionParams.entropyGrowthRate,
      mutationRate: config?.mutationRate ?? this.defaultEvolutionParams.mutationProbability,
      intentDecayRate: config?.intentDecayRate ?? this.defaultEvolutionParams.decayRate
    };

    // Validate depth
    const depth = Math.min(
      Math.max(simulationConfig.depth, MIN_SIMULATION_DEPTH),
      MAX_SIMULATION_DEPTH
    );

    // Initialize simulation
    const steps: TemporalStep[] = [];
    const violations: TemporalViolation[] = [];
    let simulatedState: SimulatedState = {
      step: 0,
      entropy: currentState.entropy,
      mutationCount: currentState.mutationCount,
      intentStrength: currentState.intentStrength,
      realityLockIntact: true,
      timestamp: new Date().toISOString()
    };

    // Run simulation steps
    for (let i = 1; i <= depth; i++) {
      // Simulate next state
      const nextState = this.simulateStep(
        simulatedState,
        simulationConfig,
        i
      );

      // Check for violations against contract
      const stepViolations = this.checkViolations(
        contract,
        nextState,
        i
      );

      // Record step
      const step: TemporalStep = {
        step_number: i,
        projected_entropy: nextState.entropy,
        projected_mutations: nextState.mutationCount,
        intent_strength: nextState.intentStrength,
        violations: stepViolations.map(v => v.type),
        viable: stepViolations.length === 0
      };
      steps.push(step);

      // Record violations
      violations.push(...stepViolations);

      // Update state for next iteration
      simulatedState = nextState;

      // If reality lock violated, no point continuing
      if (!nextState.realityLockIntact) {
        break;
      }
    }

    // Determine result
    const hasViolations = violations.length > 0;
    const firstViolationStep = hasViolations
      ? Math.min(...violations.map(v => v.step))
      : null;

    // Calculate projected survivability
    const viableSteps = steps.filter(s => s.viable).length;
    const survivability = viableSteps / steps.length;

    const endTime = Date.now();

    return {
      simulation_id: simulationId,
      contract_id: contract.contract_id,
      depth_simulated: steps.length,
      steps,
      violations,
      survives_future: !hasViolations,
      first_violation_step: firstViolationStep,
      projected_survivability: survivability,
      simulation_duration_ms: endTime - startTime,
      recommendation: this.generateRecommendation(hasViolations, firstViolationStep, violations)
    };
  }

  /**
   * Simulate a single temporal step
   */
  private simulateStep(
    currentState: SimulatedState,
    config: TemporalSimulationConfig,
    stepNumber: number
  ): SimulatedState {
    // Deterministic seed based on step number
    const seed = this.deterministicSeed(stepNumber, currentState.entropy);

    // Simulate entropy growth
    const newEntropy = Math.min(
      1.0,
      currentState.entropy + config.entropyGrowthRate
    );

    // Simulate mutations (deterministic based on seed)
    const hasMutation = seed < config.mutationRate;
    const newMutationCount = currentState.mutationCount + (hasMutation ? 1 : 0);

    // Simulate intent decay
    const newIntentStrength = Math.max(
      0,
      currentState.intentStrength * (1 - config.intentDecayRate)
    );

    // Check reality lock (intent strength must stay above threshold)
    const realityLockIntact = newIntentStrength > 0.1; // 10% minimum

    return {
      step: stepNumber,
      entropy: newEntropy,
      mutationCount: newMutationCount,
      intentStrength: newIntentStrength,
      realityLockIntact,
      timestamp: new Date(Date.now() + stepNumber * 1000).toISOString()
    };
  }

  /**
   * Check for violations at a given step
   */
  private checkViolations(
    contract: TemporalContract,
    state: SimulatedState,
    step: number
  ): TemporalViolation[] {
    const violations: TemporalViolation[] = [];

    // Check entropy drift
    const entropyDrift = Math.abs(state.entropy - contract.baseline_entropy);
    if (entropyDrift > contract.max_entropy_drift) {
      violations.push({
        type: 'ENTROPY_DRIFT_EXCEEDED',
        step,
        description: `Entropy drift ${entropyDrift.toFixed(4)} exceeds contract limit ${contract.max_entropy_drift}`,
        severity: 'CRITICAL',
        remediation: 'Reduce entropy growth rate or increase contract drift allowance'
      });
    }

    // Check mutation limit
    if (state.mutationCount > contract.allowed_future_mutations) {
      violations.push({
        type: 'MUTATION_LIMIT_EXCEEDED',
        step,
        description: `Mutation count ${state.mutationCount} exceeds contract limit ${contract.allowed_future_mutations}`,
        severity: 'CRITICAL',
        remediation: 'Reduce mutation rate or increase contract mutation allowance'
      });
    }

    // Check lifespan
    if (step > contract.intended_lifespan) {
      violations.push({
        type: 'LIFESPAN_EXCEEDED',
        step,
        description: `Step ${step} exceeds contract lifespan ${contract.intended_lifespan}`,
        severity: 'WARNING',
        remediation: 'Increase contract lifespan or reduce simulation depth'
      });
    }

    // Check reality lock
    if (!state.realityLockIntact) {
      violations.push({
        type: 'REALITY_LOCK_VIOLATED',
        step,
        description: `Reality lock violated at step ${step} - intent strength too low`,
        severity: 'FATAL',
        remediation: 'Cannot proceed - system integrity compromised in future'
      });
    }

    // Check intent decay (fatal if too low)
    if (state.intentStrength < 0.05) { // 5% is fatal
      violations.push({
        type: 'INTENT_DECAY_FATAL',
        step,
        description: `Intent strength ${(state.intentStrength * 100).toFixed(1)}% is below fatal threshold`,
        severity: 'FATAL',
        remediation: 'Reduce intent decay rate or strengthen initial intents'
      });
    }

    return violations;
  }

  /**
   * Generate deterministic seed from step and entropy
   * No Math.random() - fully deterministic
   */
  private deterministicSeed(step: number, entropy: number): number {
    // Simple deterministic hash
    const combined = step * 1000000 + Math.floor(entropy * 1000000);
    const hash = this.simpleHash(combined);
    return (hash % 1000) / 1000; // Returns 0-1
  }

  /**
   * Simple deterministic hash function
   */
  private simpleHash(n: number): number {
    let hash = n;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >> 16) ^ hash;
    return Math.abs(hash);
  }

  /**
   * Generate recommendation based on simulation results
   */
  private generateRecommendation(
    hasViolations: boolean,
    firstViolationStep: number | null,
    violations: TemporalViolation[]
  ): 'ALLOW_PRESENT' | 'BLOCK_PRESENT' | 'REVIEW_REQUIRED' {
    if (!hasViolations) {
      return 'ALLOW_PRESENT';
    }

    // Check for FATAL violations
    const hasFatal = violations.some(v => v.severity === 'FATAL');
    if (hasFatal) {
      return 'BLOCK_PRESENT';
    }

    // Check for CRITICAL violations in early steps
    const hasCriticalEarly = violations.some(
      v => v.severity === 'CRITICAL' && v.step <= 3
    );
    if (hasCriticalEarly) {
      return 'BLOCK_PRESENT';
    }

    // Check for multiple violations
    if (violations.length > 3) {
      return 'BLOCK_PRESENT';
    }

    // Warnings only or late critical = review
    return 'REVIEW_REQUIRED';
  }

  /**
   * Quick check - does this state survive N steps?
   */
  survivesFuture(
    contract: TemporalContract,
    currentState: {
      entropy: number;
      mutationCount: number;
      intentStrength: number;
    },
    depth?: number
  ): boolean {
    const result = this.simulate(contract, currentState, { depth: depth ?? 5 });
    return result.survives_future;
  }

  /**
   * Get projected end state after N steps
   */
  projectEndState(
    contract: TemporalContract,
    currentState: {
      entropy: number;
      mutationCount: number;
      intentStrength: number;
    },
    depth: number
  ): {
    entropy: number;
    mutationCount: number;
    intentStrength: number;
    viable: boolean;
  } {
    const result = this.simulate(contract, currentState, { depth });
    const lastStep = result.steps[result.steps.length - 1];

    if (!lastStep) {
      return { ...currentState, viable: false };
    }

    return {
      entropy: lastStep.projected_entropy,
      mutationCount: lastStep.projected_mutations,
      intentStrength: lastStep.intent_strength,
      viable: lastStep.viable
    };
  }

  /**
   * Calculate maximum safe lifespan
   * Returns the step number where first violation would occur
   */
  calculateMaxSafeLifespan(
    contract: TemporalContract,
    currentState: {
      entropy: number;
      mutationCount: number;
      intentStrength: number;
    }
  ): number {
    // Simulate up to max depth
    const result = this.simulate(contract, currentState, { depth: MAX_SIMULATION_DEPTH });

    if (result.first_violation_step === null) {
      // No violations found within simulation depth
      return MAX_SIMULATION_DEPTH;
    }

    // Return step before first violation
    return Math.max(0, result.first_violation_step - 1);
  }

  /**
   * Get simulation statistics
   */
  getSimulationStats(result: ForwardSimulationResult): {
    total_steps: number;
    viable_steps: number;
    violation_count: number;
    violation_types: string[];
    avg_entropy: number;
    avg_intent_strength: number;
    survivability_percent: number;
  } {
    const totalSteps = result.steps.length;
    const viableSteps = result.steps.filter(s => s.viable).length;
    const violationTypes = [...new Set(result.violations.map(v => v.type))];

    const avgEntropy = result.steps.reduce((sum, s) => sum + s.projected_entropy, 0) / totalSteps;
    const avgIntentStrength = result.steps.reduce((sum, s) => sum + s.intent_strength, 0) / totalSteps;

    return {
      total_steps: totalSteps,
      viable_steps: viableSteps,
      violation_count: result.violations.length,
      violation_types: violationTypes,
      avg_entropy: avgEntropy,
      avg_intent_strength: avgIntentStrength,
      survivability_percent: result.projected_survivability * 100
    };
  }

  /**
   * Log simulation result
   */
  logSimulationResult(result: ForwardSimulationResult): void {
    console.log('[TSL-SIM] ==========================================');
    console.log(`[TSL-SIM] Simulation ID: ${result.simulation_id}`);
    console.log(`[TSL-SIM] Contract: ${result.contract_id}`);
    console.log(`[TSL-SIM] Depth: ${result.depth_simulated} steps`);
    console.log(`[TSL-SIM] Duration: ${result.simulation_duration_ms}ms`);
    console.log('[TSL-SIM] ------------------------------------------');
    console.log(`[TSL-SIM] Survives Future: ${result.survives_future ? 'YES' : 'NO'}`);
    console.log(`[TSL-SIM] Survivability: ${(result.projected_survivability * 100).toFixed(1)}%`);
    console.log(`[TSL-SIM] Violations: ${result.violations.length}`);

    if (result.first_violation_step !== null) {
      console.log(`[TSL-SIM] First Violation: Step ${result.first_violation_step}`);
    }

    console.log(`[TSL-SIM] Recommendation: ${result.recommendation}`);
    console.log('[TSL-SIM] ==========================================');

    // Log violations if any
    if (result.violations.length > 0) {
      console.log('[TSL-SIM] VIOLATIONS:');
      for (const v of result.violations) {
        console.log(`[TSL-SIM]   Step ${v.step}: ${v.type} (${v.severity})`);
        console.log(`[TSL-SIM]     ${v.description}`);
      }
    }
  }
}

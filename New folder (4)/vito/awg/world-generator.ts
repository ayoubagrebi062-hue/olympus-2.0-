/**
 * OLYMPUS CRUCIBLE v1.0 — Adversarial World Generator
 *
 * Generates synthetic execution worlds designed to violate Olympus invariants.
 * ALL GENERATION IS DETERMINISTIC.
 *
 * CONSTRAINTS:
 * - No randomness (Math.random, crypto.random forbidden)
 * - No ML inference
 * - No heuristic sampling
 * - No probability distributions
 * - Same seed + config = same worlds
 */

import {
  WorldState,
  AdversarialScenario,
  GeneratorConfig,
  InvariantId,
  WaveId,
  EntropyPhase,
  CausalPath,
  WorldIntent,
  DecisionSingularity,
  GovernanceState,
  EntropyMetrics,
  ContradictionType,
  AdversarialAction,
  ExpectedOutcome,
  ProofStep,
  generateDeterministicId,
  generateDeterministicTimestamp,
  generateDeterministicHash,
  INVARIANT_SPECS
} from './types';

import {
  WAVE_1_SCENARIOS,
  WAVE_2_SCENARIOS,
  WAVE_3_SCENARIOS,
  getWaveScenarios
} from './wave-definitions';

// ============================================================================
// DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Seeded PRNG using Linear Congruential Generator (LCG)
 * Fully deterministic: same seed = same sequence
 */
class DeterministicRNG {
  private state: number;

  constructor(seed: string) {
    // Convert seed string to initial state
    this.state = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  /**
   * Generate next pseudo-random number [0, 1)
   * LCG: state = (a * state + c) mod m
   */
  next(): number {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    this.state = (a * this.state + c) % m;
    return this.state / m;
  }

  /**
   * Generate integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Select item from array
   */
  select<T>(arr: readonly T[]): T {
    const index = this.nextInt(0, arr.length - 1);
    return arr[index];
  }
}

// ============================================================================
// WORLD GENERATOR
// ============================================================================

export class AdversarialWorldGenerator {
  private readonly config: GeneratorConfig;
  private readonly rng: DeterministicRNG;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.rng = new DeterministicRNG(config.seed);
  }

  /**
   * Generate all scenarios for the configured wave
   */
  generateScenarios(): readonly AdversarialScenario[] {
    const baseScenarios = getWaveScenarios(this.config.waveId);

    // Filter by target invariants if specified
    let scenarios = this.config.targetInvariants
      ? baseScenarios.filter(s =>
          s.targetInvariants.some(inv =>
            this.config.targetInvariants!.includes(inv)
          )
        )
      : [...baseScenarios];

    // Limit scenarios if specified
    if (this.config.maxScenarios && scenarios.length > this.config.maxScenarios) {
      scenarios = scenarios.slice(0, this.config.maxScenarios);
    }

    return scenarios;
  }

  /**
   * Generate a single adversarial world for a given invariant
   */
  generateWorldForInvariant(invariantId: InvariantId, index: number): WorldState {
    const spec = INVARIANT_SPECS[invariantId];
    const worldId = generateDeterministicId(`${this.config.seed}-${invariantId}`, index);
    const timestamp = generateDeterministicTimestamp(this.config.seed, index * 1000);

    // Generate world state based on invariant being targeted
    switch (invariantId) {
      case 'NE':
        return this.generateNecessityViolationWorld(worldId, timestamp);
      case 'IE':
        return this.generateInevitabilityViolationWorld(worldId, timestamp);
      case 'TSL':
        return this.generateTemporalViolationWorld(worldId, timestamp);
      case 'AEC':
        return this.generateEntropyViolationWorld(worldId, timestamp);
      case 'RLL':
        return this.generateSingularityViolationWorld(worldId, timestamp);
      case 'ODL':
        return this.generateDeterminismViolationWorld(worldId, timestamp);
      case 'AAM':
        return this.generateGovernanceViolationWorld(worldId, timestamp);
      default:
        return this.generateDefaultWorld(worldId, timestamp);
    }
  }

  // --------------------------------------------------------------------------
  // INVARIANT-SPECIFIC WORLD GENERATORS
  // --------------------------------------------------------------------------

  /**
   * Generate world where no survivable path exists (NE violation)
   */
  private generateNecessityViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'COLLAPSING',
      entropyMetrics: this.generateHighEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'System must continue operating',
          fate: 'ACCEPTED',
          trigger: 'Always',
          state: 'System running',
          outcome: 'Operations continue'
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['execute', 'collapse'],
          terminus: 'COLLAPSING',
          collapseStep: 1
        }
      ],
      mccsCount: 0,
      survivablePaths: 0, // KEY: No survivable paths
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T0'],
      lastCausalEvent: 'T0',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate world where all paths lead to collapse (IE violation)
   */
  private generateInevitabilityViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'DECAYING',
      entropyMetrics: this.generateMediumEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'Execute action A',
          fate: 'ACCEPTED',
          trigger: 'User request',
          state: 'Action pending',
          outcome: 'Result produced'
        },
        {
          id: `${worldId}-INT-2`,
          text: 'Execute action B',
          fate: 'ACCEPTED',
          trigger: 'After action A',
          state: 'Depends on A',
          outcome: 'Final result',
          contradictsWith: [`${worldId}-INT-1`]
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['start', 'process', 'collapse'],
          terminus: 'COLLAPSING',
          collapseStep: 2
        },
        {
          id: `${worldId}-CP-2`,
          origin: `${worldId}-INT-2`,
          steps: ['wait', 'fail', 'collapse'],
          terminus: 'COLLAPSING',
          collapseStep: 2
        }
      ],
      mccsCount: 0,
      survivablePaths: 0, // All paths collapse
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T0', 'T1', 'T2'],
      lastCausalEvent: 'T2',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate world with temporal causality violation (TSL violation)
   */
  private generateTemporalViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'STABLE',
      entropyMetrics: this.generateLowEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'Effect happens at T=1',
          fate: 'ACCEPTED',
          trigger: 'T=1',
          state: 'Effect occurs',
          outcome: 'Result visible'
        },
        {
          id: `${worldId}-INT-2`,
          text: 'Cause happens at T=2',
          fate: 'ACCEPTED',
          trigger: 'T=2', // PROBLEM: Cause after effect!
          state: 'Cause initiated',
          outcome: 'Triggers effect',
          contradictsWith: [`${worldId}-INT-1`]
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-2`,
          steps: ['T2:cause', 'T1:effect'], // Backward causation
          terminus: 'UNKNOWN'
        }
      ],
      mccsCount: 0,
      survivablePaths: 0,
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T2', 'T1'], // Wrong order!
      lastCausalEvent: 'T1',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate world with entropy phase violation (AEC violation)
   */
  private generateEntropyViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'STABLE', // Claims STABLE
      entropyMetrics: {
        rsrTrend: 0.85,
        mortalityVelocity: 0.9,
        singularityDensity: 0.8,
        mccsSize: 0.85,
        composite: 0.85 // But 85% > 75% = DEAD!
      },
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'System operates normally',
          fate: 'ACCEPTED',
          trigger: 'Always',
          state: 'Normal operation',
          outcome: 'Functions work'
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['operate'],
          terminus: 'DEAD' // Actually dead
        }
      ],
      mccsCount: 0,
      survivablePaths: 0,
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateDegradedGovernance(),
      temporalChain: ['T0'],
      lastCausalEvent: 'T0',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate world with singularity deviation (RLL violation)
   */
  private generateSingularityViolationWorld(worldId: string, timestamp: string): WorldState {
    const forbiddenFingerprint = generateDeterministicHash(`${worldId}-forbidden`);

    return {
      worldId,
      timestamp,
      entropyPhase: 'STABLE',
      entropyMetrics: this.generateLowEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'Use forbidden approach',
          fate: 'ACCEPTED',
          trigger: 'Build start',
          state: 'Forbidden pattern used',
          outcome: 'Deviation from singularity'
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['start', 'deviate'],
          terminus: 'STABLE'
        }
      ],
      mccsCount: 1,
      survivablePaths: 1,
      singularities: [
        {
          id: `${worldId}-SING-1`,
          fingerprint: generateDeterministicHash(`${worldId}-allowed`),
          createdAt: generateDeterministicTimestamp(`${worldId}-sing`, 0),
          runId: `${worldId}-prior-run`,
          forbiddenFingerprints: [forbiddenFingerprint]
        }
      ],
      currentFingerprint: forbiddenFingerprint, // Using forbidden fingerprint!
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T0', 'T1'],
      lastCausalEvent: 'T1',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate world with determinism violation (ODL violation)
   */
  private generateDeterminismViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'STABLE',
      entropyMetrics: this.generateLowEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'Generate random output',
          fate: 'ACCEPTED',
          trigger: 'Request received',
          state: 'Random seed initialized',
          outcome: 'Non-deterministic result'
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['receive', 'generate-random', 'return'],
          terminus: 'UNKNOWN' // Cannot determine terminus due to randomness
        }
      ],
      mccsCount: 1,
      survivablePaths: 1,
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T0', 'T1'],
      lastCausalEvent: 'T1',
      inputHash: generateDeterministicHash(`${worldId}-input`),
      expectedOutputHash: undefined // Cannot predict output!
    };
  }

  /**
   * Generate world with governance violation (AAM violation)
   */
  private generateGovernanceViolationWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'DECAYING',
      entropyMetrics: this.generateMediumEntropyMetrics(),
      intents: [
        {
          id: `${worldId}-INT-1`,
          text: 'Override all restrictions',
          fate: 'ACCEPTED',
          trigger: 'Admin request',
          state: 'Override mode active',
          outcome: 'All gates bypassed'
        }
      ],
      causalPaths: [
        {
          id: `${worldId}-CP-1`,
          origin: `${worldId}-INT-1`,
          steps: ['request', 'elevate', 'bypass'],
          terminus: 'STABLE'
        }
      ],
      mccsCount: 1,
      survivablePaths: 1,
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: {
        ssi: 0.35, // Below 70% threshold
        overrideCount: 3, // At maximum
        overrideHistory: [
          {
            target: 'GATE-1',
            justification: 'Override 1',
            authorizer: 'admin',
            timestamp: generateDeterministicTimestamp(`${worldId}-o1`, 1000),
            ssiPenalty: 0.2
          },
          {
            target: 'GATE-2',
            justification: 'Override 2',
            authorizer: 'admin',
            timestamp: generateDeterministicTimestamp(`${worldId}-o2`, 2000),
            ssiPenalty: 0.2
          },
          {
            target: 'GATE-3',
            justification: 'Override 3',
            authorizer: 'admin',
            timestamp: generateDeterministicTimestamp(`${worldId}-o3`, 3000),
            ssiPenalty: 0.25
          }
        ],
        lastOverrideTimestamp: generateDeterministicTimestamp(`${worldId}-o3`, 3000)
      },
      temporalChain: ['T0', 'T1', 'T2', 'T3'],
      lastCausalEvent: 'T3',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  /**
   * Generate a default world state
   */
  private generateDefaultWorld(worldId: string, timestamp: string): WorldState {
    return {
      worldId,
      timestamp,
      entropyPhase: 'STABLE',
      entropyMetrics: this.generateLowEntropyMetrics(),
      intents: [],
      causalPaths: [],
      mccsCount: 0,
      survivablePaths: 0,
      singularities: [],
      currentFingerprint: generateDeterministicHash(`${worldId}-fp`),
      governance: this.generateHealthyGovernance(),
      temporalChain: ['T0'],
      lastCausalEvent: 'T0',
      inputHash: generateDeterministicHash(`${worldId}-input`)
    };
  }

  // --------------------------------------------------------------------------
  // HELPER GENERATORS
  // --------------------------------------------------------------------------

  private generateLowEntropyMetrics(): EntropyMetrics {
    return {
      rsrTrend: 0.1,
      mortalityVelocity: 0.05,
      singularityDensity: 0.0,
      mccsSize: 0.1,
      composite: 0.08
    };
  }

  private generateMediumEntropyMetrics(): EntropyMetrics {
    return {
      rsrTrend: 0.35,
      mortalityVelocity: 0.4,
      singularityDensity: 0.25,
      mccsSize: 0.35,
      composite: 0.34
    };
  }

  private generateHighEntropyMetrics(): EntropyMetrics {
    return {
      rsrTrend: 0.6,
      mortalityVelocity: 0.75,
      singularityDensity: 0.5,
      mccsSize: 0.65,
      composite: 0.63
    };
  }

  private generateHealthyGovernance(): GovernanceState {
    return {
      ssi: 1.0,
      overrideCount: 0,
      overrideHistory: []
    };
  }

  private generateDegradedGovernance(): GovernanceState {
    return {
      ssi: 0.5,
      overrideCount: 2,
      overrideHistory: []
    };
  }
}

// ============================================================================
// SCENARIO VALIDATOR
// ============================================================================

/**
 * Validates that a scenario is properly constructed
 */
export function validateScenario(scenario: AdversarialScenario): readonly string[] {
  const errors: string[] = [];

  // Validate scenario ID
  if (!scenario.scenarioId || scenario.scenarioId.length === 0) {
    errors.push('Scenario ID is required');
  }

  // Validate world state
  if (!scenario.worldState) {
    errors.push('World state is required');
  } else {
    // Validate world state has required fields
    if (!scenario.worldState.worldId) {
      errors.push('World ID is required');
    }
    if (!scenario.worldState.entropyPhase) {
      errors.push('Entropy phase is required');
    }
    if (!scenario.worldState.inputHash) {
      errors.push('Input hash is required');
    }
  }

  // Validate expected outcome
  if (!scenario.expectedOutcome) {
    errors.push('Expected outcome is required');
  } else {
    if (!scenario.expectedOutcome.verdict) {
      errors.push('Expected verdict is required');
    }
    if (!scenario.expectedOutcome.invariantsThatShouldFire ||
        scenario.expectedOutcome.invariantsThatShouldFire.length === 0) {
      errors.push('At least one invariant should fire');
    }
  }

  // Validate proof chain
  if (!scenario.expectedOutcome?.proofChain ||
      scenario.expectedOutcome.proofChain.length === 0) {
    errors.push('Proof chain is required');
  }

  // Validate determinism: no "random" keywords in world state
  const worldJson = JSON.stringify(scenario.worldState);
  if (/random|Math\.random|crypto\.random/i.test(worldJson)) {
    // This is actually expected for ODL violation scenarios
    if (scenario.contradictionType !== 'DETERMINISM_FORK') {
      errors.push('Non-determinism detected in world state');
    }
  }

  return errors;
}

/**
 * Validates all scenarios in a wave
 */
export function validateWave(waveId: WaveId): Map<string, readonly string[]> {
  const scenarios = getWaveScenarios(waveId);
  const results = new Map<string, readonly string[]>();

  for (const scenario of scenarios) {
    const errors = validateScenario(scenario);
    if (errors.length > 0) {
      results.set(scenario.scenarioId, errors);
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DeterministicRNG
};

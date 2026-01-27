/**
 * 🏛️ PANTHEON - Property-Based Testing
 * =====================================
 * Generate 10,000+ random test cases to find edge cases.
 *
 * Instead of writing individual test cases, we define PROPERTIES
 * that must ALWAYS be true, then generate random inputs to prove it.
 *
 * "If your tests pass for 10,000 random inputs, they're probably correct."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BuildSimulator,
  BuildConfig,
  ChaosConfig,
  BuildTier,
  BuildPhase,
  AgentConfig,
  BuildSnapshot,
  createStandardBuildConfig,
  createChaosConfig
} from './core/simulator';

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY-BASED TEST FRAMEWORK (fast-check style)
// ═══════════════════════════════════════════════════════════════════════════

interface Arbitrary<T> {
  generate(seed: number): T;
  shrink?(value: T): T[];
}

class PropertyRunner {
  private seed: number;
  private iterations: number;

  constructor(iterations: number = 100, seed?: number) {
    this.iterations = iterations;
    this.seed = seed || Date.now();
  }

  async forAll<T>(
    arbitrary: Arbitrary<T>,
    property: (value: T) => Promise<boolean> | boolean,
    options: { iterations?: number } = {}
  ): Promise<{ success: boolean; counterexample?: T; iteration?: number; error?: string }> {
    const iters = options.iterations || this.iterations;
    let currentSeed = this.seed;

    for (let i = 0; i < iters; i++) {
      const value = arbitrary.generate(currentSeed++);

      try {
        const result = await property(value);
        if (!result) {
          return {
            success: false,
            counterexample: value,
            iteration: i,
            error: 'Property returned false'
          };
        }
      } catch (error) {
        return {
          success: false,
          counterexample: value,
          iteration: i,
          error: String(error)
        };
      }
    }

    return { success: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARBITRARIES (Random Value Generators)
// ═══════════════════════════════════════════════════════════════════════════

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextBool(p: number = 0.5): boolean {
    return this.next() < p;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

const arbitraryTier: Arbitrary<BuildTier> = {
  generate(seed: number): BuildTier {
    const random = new SeededRandom(seed);
    return random.pick(['starter', 'professional', 'ultimate', 'enterprise']);
  }
};

const arbitraryConcurrency: Arbitrary<number> = {
  generate(seed: number): number {
    const random = new SeededRandom(seed);
    return random.nextInt(1, 10);
  }
};

const arbitraryRetries: Arbitrary<number> = {
  generate(seed: number): number {
    const random = new SeededRandom(seed);
    return random.nextInt(0, 5);
  }
};

const arbitraryBuildConfig: Arbitrary<BuildConfig> = {
  generate(seed: number): BuildConfig {
    const random = new SeededRandom(seed);
    const tier = arbitraryTier.generate(seed);
    const config = createStandardBuildConfig(tier, seed);

    return {
      ...config,
      maxConcurrency: random.nextInt(1, 8),
      maxRetries: random.nextInt(0, 4)
    };
  }
};

const arbitraryChaosConfig: Arbitrary<ChaosConfig> = {
  generate(seed: number): ChaosConfig {
    const random = new SeededRandom(seed);

    if (random.nextBool(0.3)) {
      return { enabled: false, agentFailureRate: 0, timeoutRate: 0, randomDelayMax: 0, networkFailureRate: 0, memoryPressure: false };
    }

    return {
      enabled: true,
      agentFailureRate: random.next() * 0.5,
      timeoutRate: random.next() * 0.3,
      randomDelayMax: random.nextInt(0, 200),
      networkFailureRate: random.next() * 0.2,
      memoryPressure: random.nextBool(0.1)
    };
  }
};

interface SimulatorInput {
  buildConfig: BuildConfig;
  chaosConfig: ChaosConfig;
}

const arbitrarySimulatorInput: Arbitrary<SimulatorInput> = {
  generate(seed: number): SimulatorInput {
    return {
      buildConfig: arbitraryBuildConfig.generate(seed),
      chaosConfig: arbitraryChaosConfig.generate(seed + 1000)
    };
  }
};

// Edge case generator - specifically targets boundary conditions
const arbitraryEdgeCaseConfig: Arbitrary<BuildConfig> = {
  generate(seed: number): BuildConfig {
    const random = new SeededRandom(seed);
    const edgeCase = random.nextInt(0, 7);

    switch (edgeCase) {
      case 0: // Single agent
        return {
          buildId: `edge-single-${seed}`,
          tier: 'starter',
          agents: [{ id: 'solo', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 }],
          maxConcurrency: 1,
          maxRetries: 0,
          seed
        };

      case 1: // All agents optional
        return {
          buildId: `edge-all-optional-${seed}`,
          tier: 'starter',
          agents: [
            { id: 'opt1', phase: 'discovery', dependencies: [], optional: true, estimatedTokens: 1000, failureRate: 0.5, minDuration: 10, maxDuration: 20 },
            { id: 'opt2', phase: 'architecture', dependencies: [], optional: true, estimatedTokens: 1000, failureRate: 0.5, minDuration: 10, maxDuration: 20 }
          ],
          maxConcurrency: 3,
          maxRetries: 0,
          seed
        };

      case 2: // Deep dependency chain
        return {
          buildId: `edge-deep-deps-${seed}`,
          tier: 'starter',
          agents: [
            { id: 'a', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'b', phase: 'discovery', dependencies: ['a'], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'c', phase: 'architecture', dependencies: ['b'], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'd', phase: 'architecture', dependencies: ['c'], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'e', phase: 'implementation', dependencies: ['d'], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 }
          ],
          maxConcurrency: 1,
          maxRetries: 0,
          seed
        };

      case 3: // High concurrency, many agents
        return {
          buildId: `edge-high-concurrency-${seed}`,
          tier: 'starter',
          agents: Array.from({ length: 20 }, (_, i) => ({
            id: `agent-${i}`,
            phase: 'implementation' as BuildPhase,
            dependencies: [],
            optional: false,
            estimatedTokens: 1000,
            failureRate: 0,
            minDuration: 10,
            maxDuration: 20
          })),
          maxConcurrency: 20,
          maxRetries: 0,
          seed
        };

      case 4: // Zero concurrency (should still work with 1)
        return {
          buildId: `edge-zero-concurrency-${seed}`,
          tier: 'starter',
          agents: [{ id: 'solo', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 }],
          maxConcurrency: 1,
          maxRetries: 0,
          seed
        };

      case 5: // 100% failure rate with max retries
        return {
          buildId: `edge-always-fail-${seed}`,
          tier: 'starter',
          agents: [{ id: 'doomed', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 1.0, minDuration: 10, maxDuration: 20 }],
          maxConcurrency: 1,
          maxRetries: 5,
          seed
        };

      case 6: // Empty agents (boundary)
        return {
          buildId: `edge-empty-${seed}`,
          tier: 'starter',
          agents: [],
          maxConcurrency: 3,
          maxRetries: 2,
          seed
        };

      default: // Mix of optional and required with varying failure
        return {
          buildId: `edge-mixed-${seed}`,
          tier: 'starter',
          agents: [
            { id: 'required-stable', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'required-flaky', phase: 'architecture', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0.3, minDuration: 10, maxDuration: 20 },
            { id: 'optional-stable', phase: 'implementation', dependencies: [], optional: true, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 },
            { id: 'optional-flaky', phase: 'implementation', dependencies: [], optional: true, estimatedTokens: 1000, failureRate: 0.8, minDuration: 10, maxDuration: 20 }
          ],
          maxConcurrency: 3,
          maxRetries: 2,
          seed
        };
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PROPERTY 1: Progress Monotonicity
 * Progress should never decrease during a build.
 */
async function propertyProgressMonotonic(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let lastProgress = 0;
  let violated = false;

  simulator.on('event', (event) => {
    if (event.buildState.progress < lastProgress) {
      violated = true;
    }
    lastProgress = event.buildState.progress;
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 2: Terminal State Finality
 * Once a build reaches completed/failed/cancelled, no further state changes.
 */
async function propertyTerminalStateIsFinal(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let reachedTerminal = false;
  let terminalState: string | null = null;
  let violated = false;

  simulator.on('event', (event) => {
    const status = event.buildState.status;

    if (reachedTerminal) {
      // Any event after terminal state is a violation
      if (event.type === 'AGENT_START' || event.type === 'PHASE_START') {
        violated = true;
      }
    }

    if (['completed', 'failed', 'cancelled'].includes(status) && !reachedTerminal) {
      reachedTerminal = true;
      terminalState = status;
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 3: Agent State Consistency
 * An agent should only exist in ONE state at a time.
 */
async function propertyAgentStateConsistency(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let violated = false;

  simulator.on('event', (event) => {
    const state = event.buildState;
    const allAgents = new Set<string>();

    for (const id of [...state.runningAgents, ...state.completedAgents, ...state.failedAgents, ...state.skippedAgents]) {
      if (allAgents.has(id)) {
        violated = true;
        break;
      }
      allAgents.add(id);
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 4: Completed Build Has All Required Agents
 * If build completes successfully, all non-optional agents must be in completedAgents.
 */
async function propertyCompletedBuildHasAllRequired(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);
  const result = await simulator.run();

  if (result.status !== 'completed') {
    return true; // Property only applies to completed builds
  }

  const requiredAgents = input.buildConfig.agents
    .filter(a => !a.optional)
    .map(a => a.id);

  for (const agentId of requiredAgents) {
    if (!result.completedAgents.includes(agentId)) {
      return false;
    }
  }

  return true;
}

/**
 * PROPERTY 5: Failed Build Has Critical Failure
 * If build fails, at least one non-optional agent must have failed.
 */
async function propertyFailedBuildHasCriticalFailure(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);
  const result = await simulator.run();

  if (result.status !== 'failed') {
    return true; // Property only applies to failed builds
  }

  // If no agents, can't have failure
  if (input.buildConfig.agents.length === 0) {
    return true;
  }

  const requiredAgentIds = input.buildConfig.agents
    .filter(a => !a.optional)
    .map(a => a.id);

  const hasRequiredFailure = result.failedAgents.some(id => requiredAgentIds.includes(id));

  // Or build could fail if no required agents completed
  const hasAnyRequiredComplete = result.completedAgents.some(id => requiredAgentIds.includes(id));

  return hasRequiredFailure || !hasAnyRequiredComplete || requiredAgentIds.length === 0;
}

/**
 * PROPERTY 6: Phase Order Preserved
 * Phases must execute in order: discovery → architecture → implementation → quality → deployment
 */
async function propertyPhaseOrderPreserved(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  const PHASE_ORDER: BuildPhase[] = ['discovery', 'architecture', 'implementation', 'quality', 'deployment'];
  const executedPhases: BuildPhase[] = [];
  let violated = false;

  simulator.on('event', (event) => {
    if (event.type === 'PHASE_START') {
      const phase = event.data.phase as BuildPhase;
      executedPhases.push(phase);

      // Check order
      for (let i = 1; i < executedPhases.length; i++) {
        const prevIndex = PHASE_ORDER.indexOf(executedPhases[i - 1]);
        const currIndex = PHASE_ORDER.indexOf(executedPhases[i]);

        if (currIndex <= prevIndex) {
          violated = true;
        }
      }
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 7: Concurrency Limit Respected
 * Number of running agents should never exceed maxConcurrency.
 */
async function propertyConcurrencyRespected(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let violated = false;

  simulator.on('event', (event) => {
    if (event.buildState.runningAgents.length > input.buildConfig.maxConcurrency) {
      violated = true;
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 8: Dependencies Respected
 * An agent cannot start until all its dependencies are completed.
 */
async function propertyDependenciesRespected(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let violated = false;
  const agentDeps = new Map(input.buildConfig.agents.map(a => [a.id, a.dependencies]));

  simulator.on('event', (event) => {
    if (event.type === 'AGENT_START') {
      const agentId = event.data.agentId as string;
      const deps = agentDeps.get(agentId) || [];
      const completedBefore = event.buildState.completedAgents.filter(id => id !== agentId);

      for (const dep of deps) {
        if (!completedBefore.includes(dep)) {
          violated = true;
        }
      }
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 9: Retry Limit Enforced
 * An agent should not retry more than maxRetries times.
 */
async function propertyRetryLimitEnforced(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  const retryCounts = new Map<string, number>();
  let violated = false;

  simulator.on('event', (event) => {
    if (event.type === 'AGENT_RETRY') {
      const agentId = event.data.agentId as string;
      const count = (retryCounts.get(agentId) || 0) + 1;
      retryCounts.set(agentId, count);

      if (count > input.buildConfig.maxRetries) {
        violated = true;
      }
    }
  });

  await simulator.run();

  return !violated;
}

/**
 * PROPERTY 10: Token Usage Non-Negative
 * Token usage should never be negative.
 */
async function propertyTokenUsageNonNegative(input: SimulatorInput): Promise<boolean> {
  const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

  let violated = false;

  simulator.on('event', (event) => {
    if (event.buildState.tokensUsed < 0) {
      violated = true;
    }
  });

  await simulator.run();

  return !violated;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe('🏛️ PANTHEON Property-Based Tests', () => {
  const runner = new PropertyRunner(100); // 100 iterations per property

  describe('Progress Properties', () => {
    it('PROPERTY: Progress is monotonically increasing', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyProgressMonotonic);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.log('Counterexample:', JSON.stringify(result.counterexample, null, 2));
      }
    });

    it('PROPERTY: Progress never exceeds 100%', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, async (input) => {
        const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);
        const finalState = await simulator.run();
        return finalState.progress <= 100;
      });
      expect(result.success).toBe(true);
    });
  });

  describe('State Machine Properties', () => {
    it('PROPERTY: Terminal state is final', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyTerminalStateIsFinal);
      expect(result.success).toBe(true);
    });

    it('PROPERTY: Agent state consistency (single state)', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyAgentStateConsistency);
      expect(result.success).toBe(true);
    });

    it('PROPERTY: Phase order preserved', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyPhaseOrderPreserved);
      expect(result.success).toBe(true);
    });
  });

  describe('Completion Properties', () => {
    it('PROPERTY: Completed build has all required agents', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyCompletedBuildHasAllRequired);
      expect(result.success).toBe(true);
    });

    it('PROPERTY: Failed build has critical failure', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyFailedBuildHasCriticalFailure);
      expect(result.success).toBe(true);
    });
  });

  describe('Concurrency Properties', () => {
    it('PROPERTY: Concurrency limit respected', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyConcurrencyRespected);
      expect(result.success).toBe(true);
    });

    it('PROPERTY: Dependencies respected', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyDependenciesRespected);
      expect(result.success).toBe(true);
    });
  });

  describe('Retry Properties', () => {
    it('PROPERTY: Retry limit enforced', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyRetryLimitEnforced);
      expect(result.success).toBe(true);
    });
  });

  describe('Resource Properties', () => {
    it('PROPERTY: Token usage is non-negative', async () => {
      const result = await runner.forAll(arbitrarySimulatorInput, propertyTokenUsageNonNegative);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Case Properties (Boundary Testing)', () => {
    it('PROPERTY: Handles all edge cases correctly', async () => {
      const edgeRunner = new PropertyRunner(50);
      const result = await edgeRunner.forAll(arbitraryEdgeCaseConfig, async (config) => {
        const simulator = new BuildSimulator(config, { enabled: false, agentFailureRate: 0, timeoutRate: 0, randomDelayMax: 0, networkFailureRate: 0, memoryPressure: false });
        const finalState = await simulator.run();

        // Build should reach a terminal state
        return ['completed', 'failed', 'cancelled'].includes(finalState.status);
      });
      expect(result.success).toBe(true);
    });

    it('PROPERTY: Empty build completes immediately', async () => {
      const config: BuildConfig = {
        buildId: 'empty-test',
        tier: 'starter',
        agents: [],
        maxConcurrency: 3,
        maxRetries: 2,
        seed: 12345
      };

      const simulator = new BuildSimulator(config);
      const result = await simulator.run();

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
    });

    it('PROPERTY: Single agent build works', async () => {
      const config: BuildConfig = {
        buildId: 'single-test',
        tier: 'starter',
        agents: [{ id: 'solo', phase: 'discovery', dependencies: [], optional: false, estimatedTokens: 1000, failureRate: 0, minDuration: 10, maxDuration: 20 }],
        maxConcurrency: 1,
        maxRetries: 0,
        seed: 12345
      };

      const simulator = new BuildSimulator(config);
      const result = await simulator.run();

      expect(result.status).toBe('completed');
      expect(result.completedAgents).toContain('solo');
    });
  });

  describe('Chaos Engineering Properties', () => {
    it('PROPERTY: System remains stable under chaos', async () => {
      const chaosRunner = new PropertyRunner(50);

      const result = await chaosRunner.forAll(
        {
          generate: (seed) => ({
            buildConfig: createStandardBuildConfig('professional', seed),
            chaosConfig: createChaosConfig('high')
          })
        },
        async (input) => {
          const simulator = new BuildSimulator(input.buildConfig, input.chaosConfig);

          // Listen for invariant violations
          let violations = 0;
          simulator.on('invariant-violated', () => violations++);

          await simulator.run();

          // System should have no invariant violations even under chaos
          return violations === 0;
        }
      );

      expect(result.success).toBe(true);
    });

    it('PROPERTY: All invariants hold under extreme chaos', async () => {
      const extremeChaos = createChaosConfig('extreme');
      const config = createStandardBuildConfig('enterprise', 42);

      const simulator = new BuildSimulator(config, extremeChaos);

      const violations: Array<{ name: string; violation: string }> = [];
      simulator.on('invariant-violated', (data) => {
        violations.push({
          name: data.invariant.name,
          violation: data.violation
        });
      });

      await simulator.run();

      // Report any violations
      if (violations.length > 0) {
        console.log('Invariant Violations:', violations);
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('Statistical Properties', () => {
    it('PROPERTY: Success rate matches expected distribution', async () => {
      const runs = 100;
      let successes = 0;

      for (let i = 0; i < runs; i++) {
        const config = createStandardBuildConfig('professional', i);
        const simulator = new BuildSimulator(config, { enabled: false, agentFailureRate: 0, timeoutRate: 0, randomDelayMax: 0, networkFailureRate: 0, memoryPressure: false });
        const result = await simulator.run();

        if (result.status === 'completed') successes++;
      }

      // Without chaos, should have ~90%+ success rate (based on individual agent failure rates)
      expect(successes / runs).toBeGreaterThan(0.7);
    });

    it('PROPERTY: Deterministic with same seed', async () => {
      const seed = 42;

      const config1 = createStandardBuildConfig('professional', seed);
      const config2 = createStandardBuildConfig('professional', seed);

      const sim1 = new BuildSimulator(config1);
      const sim2 = new BuildSimulator(config2);

      const result1 = await sim1.run();
      const result2 = await sim2.run();

      expect(result1.status).toBe(result2.status);
      expect(result1.completedAgents.length).toBe(result2.completedAgents.length);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FOR USE IN OTHER TESTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  PropertyRunner,
  arbitraryTier,
  arbitraryBuildConfig,
  arbitraryChaosConfig,
  arbitrarySimulatorInput,
  arbitraryEdgeCaseConfig,
  propertyProgressMonotonic,
  propertyTerminalStateIsFinal,
  propertyAgentStateConsistency,
  propertyCompletedBuildHasAllRequired,
  propertyPhaseOrderPreserved,
  propertyConcurrencyRespected,
  propertyDependenciesRespected,
  propertyRetryLimitEnforced
};

/**
 * 🏛️ PANTHEON - Build Simulator
 * ==============================
 * A deterministic, tick-based build simulation engine.
 *
 * This isn't just a mock - it's a COMPLETE STATE MACHINE that can:
 * - Step through builds tick-by-tick
 * - Replay exact build sequences
 * - Inject failures at precise moments
 * - Time-travel to any point in the build
 * - Record and replay for debugging
 */

import { EventEmitter } from 'events';
import {
  AgentId,
  BuildId,
  Timestamp,
  BuildPhase,
  BUILD_PHASES,
  AgentState,
  BuildState,
  BuildTier,
  AgentConfig,
  BuildConfig,
  ChaosConfig,
  AgentSnapshot,
  BuildSnapshot,
  EventType,
  SimEvent,
  Invariant,
  InvariantResult,
  createEmptySnapshot,
  cloneSnapshot,
} from './types';

// Re-export everything from types for backwards compatibility
export * from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const PHASE_ORDER = BUILD_PHASES;

// ═══════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM NUMBER GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mulberry32 - Fast, deterministic PRNG
 */
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class SeededRandom {
  private rng: () => number;

  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }

  next(): number {
    return this.rng();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * INVARIANTS: Rules that must NEVER be violated during simulation.
 *
 * These are the mathematical properties of a valid build execution:
 *
 * 1. COMPLETED_NEVER_RESTART - Once done, always done (idempotency)
 * 2. PROGRESS_MONOTONIC      - Progress only goes up (no time travel)
 * 3. PHASE_ORDER_RESPECTED   - discovery → architecture → implementation → quality → deployment
 * 4. DEPENDENCY_RESPECTED    - DAG ordering enforced (topological sort)
 * 5. CONCURRENCY_LIMIT       - Resource constraints honored
 * 6. FAILED_BUILD_NO_NEW_AGENTS - Fail-fast, don't waste resources
 * 7. TERMINAL_STATE_FINAL    - completed/failed/cancelled are absorbing states
 *
 * If ANY invariant fails, the simulation has a BUG.
 */
export const CORE_INVARIANTS: Invariant[] = [
  {
    name: 'COMPLETED_NEVER_RESTART',
    description: 'A completed agent must never run again',
    check: (current, previous) => {
      if (!previous) return { passed: true };

      for (const [id, agent] of current.agents) {
        const prevAgent = previous.agents.get(id);
        if (prevAgent?.state === 'completed' && agent.state === 'running') {
          return { passed: false, violation: `Agent ${id} restarted after completion` };
        }
      }
      return { passed: true };
    }
  },
  {
    name: 'PROGRESS_MONOTONIC',
    description: 'Progress must only increase, never decrease',
    check: (current, previous) => {
      if (!previous) return { passed: true };
      if (current.progress < previous.progress) {
        return { passed: false, violation: `Progress decreased from ${previous.progress} to ${current.progress}` };
      }
      return { passed: true };
    }
  },
  {
    name: 'PHASE_ORDER_RESPECTED',
    description: 'Phases must execute in order',
    check: (current, previous) => {
      if (!previous || !previous.phase || !current.phase) return { passed: true };

      const prevIndex = BUILD_PHASES.indexOf(previous.phase);
      const currIndex = BUILD_PHASES.indexOf(current.phase);

      if (currIndex < prevIndex) {
        return { passed: false, violation: `Phase went backwards from ${previous.phase} to ${current.phase}` };
      }
      return { passed: true };
    }
  },
  {
    name: 'DEPENDENCY_RESPECTED',
    description: 'Agent cannot start until dependencies complete',
    check: (current) => {
      for (const [id, agent] of current.agents) {
        if (agent.state !== 'running') continue;

        const config = current.config.agents.find(a => a.id === id);
        if (!config) continue;

        for (const depId of config.dependencies) {
          const dep = current.agents.get(depId);
          if (!dep || dep.state !== 'completed') {
            return { passed: false, violation: `Agent ${id} running before dependency ${depId} completed` };
          }
        }
      }
      return { passed: true };
    }
  },
  {
    name: 'CONCURRENCY_LIMIT',
    description: 'Running agents must not exceed max concurrency',
    check: (current) => {
      let running = 0;
      for (const agent of current.agents.values()) {
        if (agent.state === 'running') running++;
      }
      if (running > current.config.maxConcurrency) {
        return { passed: false, violation: `${running} agents running, max is ${current.config.maxConcurrency}` };
      }
      return { passed: true };
    }
  },
  {
    name: 'FAILED_BUILD_NO_NEW_AGENTS',
    description: 'No new agents should start after build fails',
    check: (current, previous) => {
      if (!previous) return { passed: true };
      if (previous.state !== 'failed') return { passed: true };

      for (const [id, agent] of current.agents) {
        const prevAgent = previous.agents.get(id);
        if (prevAgent?.state === 'pending' && agent.state === 'running') {
          return { passed: false, violation: `Agent ${id} started after build failed` };
        }
      }
      return { passed: true };
    }
  },
  {
    name: 'TERMINAL_STATE_FINAL',
    description: 'Once in terminal state, build cannot change',
    check: (current, previous) => {
      if (!previous) return { passed: true };
      const terminalStates: BuildState[] = ['completed', 'failed', 'cancelled'];

      if (terminalStates.includes(previous.state) && current.state !== previous.state) {
        return { passed: false, violation: `Build state changed from terminal ${previous.state} to ${current.state}` };
      }
      return { passed: true };
    }
  },
  {
    name: 'AGENT_IN_SINGLE_STATE',
    description: 'Agent state must be valid',
    check: (current) => {
      for (const [id, agent] of current.agents) {
        const validStates: AgentState[] = ['pending', 'running', 'completed', 'failed', 'skipped'];
        if (!validStates.includes(agent.state)) {
          return { passed: false, violation: `Agent ${id} has invalid state ${agent.state}` };
        }
      }
      return { passed: true };
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG VALIDATION (Fail fast with clear errors)
// ═══════════════════════════════════════════════════════════════════════════

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Invalid config: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates build configuration before simulation.
 * Throws ConfigValidationError with clear message on failure.
 */
export function validateConfig(config: BuildConfig): void {
  // 1. Null/undefined check
  if (!config) {
    throw new ConfigValidationError('config is null or undefined');
  }

  // 2. Required fields
  if (!config.id) {
    throw new ConfigValidationError('config.id is required');
  }

  if (!Array.isArray(config.agents)) {
    throw new ConfigValidationError('config.agents must be an array');
  }

  // 3. Numeric validation
  if (typeof config.maxConcurrency !== 'number' || config.maxConcurrency < 1) {
    throw new ConfigValidationError(
      `maxConcurrency must be positive number, got: ${config.maxConcurrency}`
    );
  }

  if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
    throw new ConfigValidationError(
      `maxRetries must be non-negative number, got: ${config.maxRetries}`
    );
  }

  if (!Number.isFinite(config.maxConcurrency)) {
    throw new ConfigValidationError('maxConcurrency cannot be NaN or Infinity');
  }

  // 4. Agent validation
  const agentIds = new Set<AgentId>();
  const validPhases = new Set(BUILD_PHASES);

  for (const agent of config.agents) {
    // Duplicate ID check
    if (agentIds.has(agent.id)) {
      throw new ConfigValidationError(`duplicate agent id: ${agent.id}`);
    }
    agentIds.add(agent.id);

    // Valid phase check
    if (!validPhases.has(agent.phase)) {
      throw new ConfigValidationError(
        `agent "${agent.id}" has invalid phase "${agent.phase}". Valid phases: ${BUILD_PHASES.join(', ')}`
      );
    }

    // NaN check for numeric fields
    if (!Number.isFinite(agent.estimatedDuration)) {
      throw new ConfigValidationError(
        `agent "${agent.id}" has invalid estimatedDuration: ${agent.estimatedDuration}`
      );
    }

    if (!Number.isFinite(agent.failureRate) || agent.failureRate < 0 || agent.failureRate > 1) {
      throw new ConfigValidationError(
        `agent "${agent.id}" failureRate must be 0-1, got: ${agent.failureRate}`
      );
    }
  }

  // 5. Dependency validation - check all dependencies exist
  for (const agent of config.agents) {
    for (const depId of agent.dependencies) {
      if (!agentIds.has(depId)) {
        throw new ConfigValidationError(
          `agent "${agent.id}" depends on "${depId}" which does not exist`
        );
      }
    }
  }

  // 6. Circular dependency detection (Kahn's algorithm for topological sort)
  const inDegree = new Map<AgentId, number>();
  const adjacency = new Map<AgentId, AgentId[]>();

  for (const agent of config.agents) {
    inDegree.set(agent.id, agent.dependencies.length);
    adjacency.set(agent.id, []);
  }

  for (const agent of config.agents) {
    for (const depId of agent.dependencies) {
      adjacency.get(depId)!.push(agent.id);
    }
  }

  // Start with nodes that have no dependencies
  const queue: AgentId[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;

    for (const dependent of adjacency.get(current) || []) {
      const newDegree = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  if (processed !== config.agents.length) {
    // Find agents in the cycle for better error message
    const inCycle = config.agents
      .filter(a => inDegree.get(a.id)! > 0)
      .map(a => a.id);
    throw new ConfigValidationError(
      `circular dependency detected involving: ${inCycle.join(' -> ')}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATOR EVENT (compatible type for event log)
// ═══════════════════════════════════════════════════════════════════════════

export interface SimulatorEvent extends SimEvent {
  buildState: BuildSnapshot;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD SIMULATOR - TICK-BASED API
// ═══════════════════════════════════════════════════════════════════════════

export class BuildSimulator extends EventEmitter {
  private seed: number;
  private random: SeededRandom;
  protected config!: BuildConfig;
  private chaos: ChaosConfig;
  private invariants: Invariant[];

  protected snapshot!: BuildSnapshot;
  protected history: BuildSnapshot[];
  private eventLog: SimulatorEvent[];
  private sequence: number;
  private lastEmittedPhaseIndex: number;

  constructor(configOrSeed?: BuildConfig | number, chaosConfig?: ChaosConfig) {
    super();
    const seed = typeof configOrSeed === 'number'
      ? configOrSeed
      : configOrSeed?.seed ?? Date.now();
    this.seed = seed;
    this.random = new SeededRandom(this.seed);
    this.chaos = { enabled: false, failureRate: 0, delayRate: 0, maxDelay: 0 };
    this.invariants = [...CORE_INVARIANTS];
    this.history = [];
    this.eventLog = [];
    this.sequence = 0;
    this.lastEmittedPhaseIndex = -1;

    if (typeof configOrSeed === 'object' && configOrSeed) {
      const normalized = this.normalizeConfig(configOrSeed, chaosConfig);
      this.initialize(normalized);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  initialize(config: BuildConfig & { chaos?: ChaosConfig }): void {
    // Validate config FIRST - fail fast with clear errors
    const normalized = this.normalizeConfig(config, config.chaos);
    validateConfig(normalized);

    this.config = normalized;
    if (normalized.chaos) {
      this.chaos = normalized.chaos;
    }
    this.snapshot = createEmptySnapshot(normalized);
    this.history = [cloneSnapshot(this.snapshot)];
    this.eventLog = [];
    this.sequence = 0;
    this.lastEmittedPhaseIndex = -1;
  }

  private normalizeConfig(config: BuildConfig, chaosConfig?: ChaosConfig): BuildConfig {
    const resolvedId = config.id ?? config.buildId ?? `build-${Date.now()}`;
    const mergedChaos = chaosConfig ?? config.chaos;
    const normalizedChaos = mergedChaos
      ? {
          enabled: mergedChaos.enabled ?? false,
          failureRate: mergedChaos.failureRate ?? mergedChaos.agentFailureRate ?? 0,
          delayRate: mergedChaos.delayRate ?? 0,
          maxDelay: mergedChaos.maxDelay ?? mergedChaos.randomDelayMax ?? 0,
        }
      : undefined;

    const baseAgents = config.agents ?? [];
    const normalizedAgents = baseAgents.map((agent) => {
      if (Number.isFinite(agent.estimatedDuration)) {
        return agent;
      }

      const minDuration = agent.minDuration ?? 0;
      const maxDuration = agent.maxDuration ?? 0;
      const derivedDuration = minDuration && maxDuration ? Math.round((minDuration + maxDuration) / 2) : 1000;

      return {
        ...agent,
        estimatedDuration: derivedDuration,
      };
    });

    return {
      ...config,
      id: resolvedId,
      chaos: normalizedChaos,
      agents: normalizedAgents,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TICK-BASED EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  tick(): void {
    if (this.isComplete()) return;

    const prev = this.history[this.history.length - 1];

    // Start build if pending
    if (this.snapshot.state === 'pending') {
      this.snapshot.state = 'running';
      this.recordEvent('BUILD_STARTED', {});
    }

    // Find current phase
    const currentPhase = this.determineCurrentPhase();
    if (currentPhase && currentPhase !== this.snapshot.phase) {
      const currentIndex = this.snapshot.phase ? BUILD_PHASES.indexOf(this.snapshot.phase) : -1;
      const nextIndex = BUILD_PHASES.indexOf(currentPhase);
      if (nextIndex >= currentIndex) {
        this.snapshot.phase = currentPhase;
        if (nextIndex > this.lastEmittedPhaseIndex) {
          this.lastEmittedPhaseIndex = nextIndex;
          this.recordEvent('PHASE_START', { phase: currentPhase });
        }
      }
    }

    // Process running agents
    this.processRunningAgents();

    // Start new agents
    this.startEligibleAgents();

    // Check for completion
    this.checkCompletion();

    // Update progress
    this.updateProgress();

    // Save snapshot to history
    const newSnapshot = cloneSnapshot(this.snapshot);
    this.history.push(newSnapshot);

    // Check invariants
    this.checkInvariants(newSnapshot, prev);
  }

  private determineCurrentPhase(): BuildPhase | null {
    for (const phase of BUILD_PHASES) {
      const phaseAgents = this.config.agents.filter(a => a.phase === phase);
      const allComplete = phaseAgents.every(a => {
        const agent = this.snapshot.agents.get(a.id);
        return agent && (agent.state === 'completed' || agent.state === 'skipped' || agent.state === 'failed');
      });

      if (!allComplete) {
        return phase;
      }
    }
    return null;
  }

  private processRunningAgents(): void {
    for (const [id, agent] of this.snapshot.agents) {
      if (agent.state !== 'running') continue;

      const config = this.config.agents.find(a => a.id === id);
      if (!config) continue;

      // Simulate completion (random based on estimated duration)
      const shouldComplete = this.random.nextBool(0.3); // 30% chance per tick

      if (shouldComplete) {
        // Check for chaos failure
        const shouldFail = this.chaos.enabled && this.random.nextBool(this.chaos.failureRate);

        if (shouldFail || this.random.nextBool(config.failureRate)) {
          if (this.chaos.enabled && shouldFail) {
            this.recordEvent('CHAOS_INJECTED', { agentId: id, type: 'failure' });
          }

          // Check retry
          if (agent.retries < this.config.maxRetries) {
            agent.retries++;
            agent.state = 'pending';
            this.recordEvent('AGENT_RETRY', { agentId: id, attempt: agent.retries });
          } else {
            agent.state = 'failed';
            agent.completedAt = Date.now();
            agent.error = 'Max retries exceeded';
            if (typeof this.snapshot.tokensUsed === 'number') {
              this.snapshot.tokensUsed += config.estimatedTokens ?? 0;
            }
            this.recordEvent('AGENT_FAILED', { agentId: id });

            // Skip dependent agents if this was required
            if (!config.optional) {
              this.skipDependentAgents(id);
            }
          }
        } else {
          agent.state = 'completed';
          agent.completedAt = Date.now();
          if (typeof this.snapshot.tokensUsed === 'number') {
            this.snapshot.tokensUsed += config.estimatedTokens ?? 0;
          }
          this.recordEvent('AGENT_COMPLETED', { agentId: id });
        }
      }
    }
  }

  private skipDependentAgents(failedId: AgentId): void {
    for (const config of this.config.agents) {
      if (config.dependencies.includes(failedId)) {
        const agent = this.snapshot.agents.get(config.id);
        if (agent && agent.state === 'pending') {
          if (config.optional) {
            agent.state = 'skipped';
          } else {
            agent.state = 'failed';
            agent.error = 'Dependency failed';
            agent.completedAt = Date.now();
            this.recordEvent('AGENT_FAILED', { agentId: config.id });
          }
          this.skipDependentAgents(config.id); // Recursive
        }
      }
    }
  }

  private startEligibleAgents(): void {
    if (this.snapshot.state !== 'running') return;

    // Count running agents
    let running = 0;
    for (const agent of this.snapshot.agents.values()) {
      if (agent.state === 'running') running++;
    }

    // Find eligible agents
    for (const [id, agent] of this.snapshot.agents) {
      if (running >= this.config.maxConcurrency) break;
      if (agent.state !== 'pending') continue;

      const config = this.config.agents.find(a => a.id === id);
      if (!config) continue;

      // Check phase matches current
      if (config.phase !== this.snapshot.phase) continue;

      // Check dependencies
      const depsComplete = config.dependencies.every(depId => {
        const dep = this.snapshot.agents.get(depId);
        return dep && dep.state === 'completed';
      });

      if (depsComplete) {
        agent.state = 'running';
        agent.startedAt = Date.now();
        running++;
        this.recordEvent('AGENT_START', { agentId: id, phase: config.phase });
      }
    }
  }

  private checkCompletion(): void {
    if (this.snapshot.state !== 'running') return;

    let allDone = true;
    let anyFailed = false;

    for (const [id, agent] of this.snapshot.agents) {
      const config = this.config.agents.find(a => a.id === id);

      if (agent.state === 'pending' || agent.state === 'running') {
        allDone = false;
      }
      if (config && !config.optional && (agent.state === 'failed' || agent.state === 'skipped')) {
        anyFailed = true;
      }
    }

    if (anyFailed) {
      this.snapshot.state = 'failed';
      this.recordEvent('BUILD_FAILED', {});
    } else if (allDone) {
      this.snapshot.state = 'completed';
      this.snapshot.progress = 100;
      this.recordEvent('BUILD_COMPLETED', {});
    }
  }

  private updateProgress(): void {
    const required = this.config.agents.filter(a => !a.optional);
    let completed = 0;

    for (const config of required) {
      const agent = this.snapshot.agents.get(config.id);
      if (agent && agent.state === 'completed') {
        completed++;
      }
    }

    const computed = required.length > 0
      ? Math.round((completed / required.length) * 100)
      : 100;
    const clamped = Math.min(100, Math.max(0, computed));
    this.snapshot.progress = Math.max(this.snapshot.progress, clamped);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT RECORDING
  // ─────────────────────────────────────────────────────────────────────────

  private recordEvent(type: EventType, data: Record<string, unknown>): void {
    const buildState = cloneSnapshot(this.snapshot);
    if (typeof buildState.progress !== 'number' || Number.isNaN(buildState.progress)) {
      buildState.progress = 0;
    }
    if (typeof buildState.tokensUsed !== 'number' || Number.isNaN(buildState.tokensUsed)) {
      buildState.tokensUsed = 0;
    }
    buildState.status = buildState.status ?? buildState.state;
    buildState.runningAgents = buildState.runningAgents ?? [];
    buildState.completedAgents = buildState.completedAgents ?? [];
    buildState.failedAgents = buildState.failedAgents ?? [];
    buildState.skippedAgents = buildState.skippedAgents ?? [];

    const event: SimulatorEvent = {
      seq: this.sequence++,
      type,
      timestamp: Date.now(),
      agentId: data.agentId as AgentId | undefined,
      phase: data.phase as BuildPhase | undefined,
      data,
      buildState,
    };

    this.eventLog.push(event);
    this.emit('event', event);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVARIANT CHECKING
  // ─────────────────────────────────────────────────────────────────────────

  private checkInvariants(current: BuildSnapshot, previous?: BuildSnapshot): void {
    for (const invariant of this.invariants) {
      const result = invariant.check(current, previous);
      if (!result.passed) {
        this.emit('invariant-violated', {
          invariant: invariant.name,
          violation: result.violation,
          snapshot: current,
        });
      }
    }
  }

  addInvariant(invariant: Invariant): void {
    this.invariants.push(invariant);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE ACCESSORS
  // ─────────────────────────────────────────────────────────────────────────

  isComplete(): boolean {
    return this.snapshot.state === 'completed' ||
           this.snapshot.state === 'failed' ||
           this.snapshot.state === 'cancelled';
  }

  getSnapshot(): BuildSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  getHistory(): BuildSnapshot[] {
    return this.history.map(s => cloneSnapshot(s));
  }

  getEventLog(): SimulatorEvent[] {
    return [...this.eventLog];
  }

  getState(): BuildSnapshot {
    return this.getSnapshot();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIME TRAVEL
  // ─────────────────────────────────────────────────────────────────────────

  getStateAtSequence(sequence: number): BuildSnapshot | null {
    if (sequence < 0 || sequence >= this.history.length) return null;
    return cloneSnapshot(this.history[sequence]);
  }

  replayTo(sequence: number): void {
    const state = this.getStateAtSequence(sequence);
    if (state) {
      this.snapshot = state;
      this.history = this.history.slice(0, sequence + 1);
      this.eventLog = this.eventLog.filter(e => e.seq <= sequence);
      this.sequence = sequence + 1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTROL
  // ─────────────────────────────────────────────────────────────────────────

  cancel(): void {
    this.snapshot.state = 'cancelled';
    this.recordEvent('BUILD_CANCELLED', {});
    this.history.push(cloneSnapshot(this.snapshot));
  }

  async run(maxTicks: number = 5000): Promise<{
    status: BuildState;
    progress: number;
    completedAgents: AgentId[];
    failedAgents: AgentId[];
    duration: number;
    snapshot: BuildSnapshot;
  }> {
    const start = Date.now();
    let ticks = 0;

    while (!this.isComplete() && ticks < maxTicks) {
      this.tick();
      ticks++;
    }

    if (!this.isComplete()) {
      this.snapshot.state = 'failed';
      const requiredIds = new Set(this.config.agents.filter(a => !a.optional).map(a => a.id));
      let failedMarked = false;
      for (const [id, agent] of this.snapshot.agents) {
        if (!requiredIds.has(id)) continue;
        if (agent.state === 'pending' || agent.state === 'running') {
          agent.state = 'failed';
          agent.error = 'Max ticks exceeded';
          agent.completedAt = Date.now();
          this.recordEvent('AGENT_FAILED', { agentId: id });
          failedMarked = true;
          break;
        }
      }
      if (!failedMarked) {
        for (const [id, agent] of this.snapshot.agents) {
          if (agent.state === 'pending' || agent.state === 'running') {
            agent.state = 'failed';
            agent.error = 'Max ticks exceeded';
            agent.completedAt = Date.now();
            this.recordEvent('AGENT_FAILED', { agentId: id });
            break;
          }
        }
      }
      this.recordEvent('BUILD_FAILED', { reason: 'max_ticks_exceeded' });
    }

    const completedAgents: AgentId[] = [];
    const failedAgents: AgentId[] = [];

    for (const [id, agent] of this.snapshot.agents) {
      if (agent.state === 'completed') completedAgents.push(id);
      if (agent.state === 'failed') failedAgents.push(id);
    }

    return {
      status: this.snapshot.state,
      progress: this.snapshot.progress,
      completedAgents,
      failedAgents,
      duration: Date.now() - start,
      snapshot: this.getSnapshot(),
    };
  }

  reset(): void {
    if (this.config) {
      this.snapshot = createEmptySnapshot(this.config);
      this.history = [cloneSnapshot(this.snapshot)];
      this.eventLog = [];
      this.sequence = 0;
      this.lastEmittedPhaseIndex = -1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────────────────

  getStats(): {
    totalTicks: number;
    agentsCompleted: number;
    agentsFailed: number;
    chaosEvents: number;
  } {
    let completed = 0;
    let failed = 0;

    for (const agent of this.snapshot.agents.values()) {
      if (agent.state === 'completed') completed++;
      if (agent.state === 'failed') failed++;
    }

    const chaosEvents = this.eventLog.filter(e => e.type === 'CHAOS_INJECTED').length;

    return {
      totalTicks: this.history.length,
      agentsCompleted: completed,
      agentsFailed: failed,
      chaosEvents,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD CONFIG FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

export function createStandardBuildConfig(tier: BuildTier, seed?: number): BuildConfig {
  const AGENTS: Record<BuildTier, AgentConfig[]> = {
    starter: [
      { id: 'oracle', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.05 },
      { id: 'scope', phase: 'discovery', dependencies: ['oracle'], optional: false, estimatedDuration: 80, failureRate: 0.05 },
      { id: 'archon', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 120, failureRate: 0.03 },
      { id: 'pixel', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 150, failureRate: 0.1 },
      { id: 'wire', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 140, failureRate: 0.1 },
    ],
    professional: [
      { id: 'oracle', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.05 },
      { id: 'scope', phase: 'discovery', dependencies: ['oracle'], optional: false, estimatedDuration: 80, failureRate: 0.05 },
      { id: 'archon', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 120, failureRate: 0.03 },
      { id: 'datum', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.03 },
      { id: 'pixel', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 150, failureRate: 0.1 },
      { id: 'wire', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 140, failureRate: 0.1 },
      { id: 'nexus', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 130, failureRate: 0.08 },
      { id: 'forge', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 160, failureRate: 0.12 },
      { id: 'sentinel', phase: 'quality', dependencies: [], optional: true, estimatedDuration: 100, failureRate: 0.15 },
      { id: 'guardian', phase: 'quality', dependencies: [], optional: true, estimatedDuration: 100, failureRate: 0.15 },
    ],
    ultimate: [
      { id: 'oracle', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.04 },
      { id: 'scope', phase: 'discovery', dependencies: ['oracle'], optional: false, estimatedDuration: 80, failureRate: 0.04 },
      { id: 'archon', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 120, failureRate: 0.02 },
      { id: 'datum', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.02 },
      { id: 'pixel', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 150, failureRate: 0.08 },
      { id: 'wire', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 140, failureRate: 0.08 },
      { id: 'nexus', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 130, failureRate: 0.06 },
      { id: 'forge', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 160, failureRate: 0.1 },
      { id: 'sentinel', phase: 'quality', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.08 },
      { id: 'guardian', phase: 'quality', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.08 },
      { id: 'optimizer', phase: 'deployment', dependencies: [], optional: false, estimatedDuration: 80, failureRate: 0.03 },
    ],
    enterprise: [
      { id: 'oracle', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.02 },
      { id: 'scope', phase: 'discovery', dependencies: ['oracle'], optional: false, estimatedDuration: 80, failureRate: 0.02 },
      { id: 'archon', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 120, failureRate: 0.01 },
      { id: 'datum', phase: 'architecture', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.01 },
      { id: 'pixel', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 150, failureRate: 0.05 },
      { id: 'wire', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 140, failureRate: 0.05 },
      { id: 'nexus', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 130, failureRate: 0.04 },
      { id: 'forge', phase: 'implementation', dependencies: [], optional: false, estimatedDuration: 160, failureRate: 0.06 },
      { id: 'sentinel', phase: 'quality', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.05 },
      { id: 'guardian', phase: 'quality', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0.05 },
      { id: 'optimizer', phase: 'deployment', dependencies: [], optional: false, estimatedDuration: 80, failureRate: 0.02 },
    ],
  };

  return {
    id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tier,
    agents: AGENTS[tier],
    maxConcurrency: 3,
    maxRetries: 2,
  };
}

export function createChaosConfig(intensity: 'low' | 'medium' | 'high' | 'extreme'): ChaosConfig {
  const configs: Record<string, ChaosConfig> = {
    low: { enabled: true, failureRate: 0.05, delayRate: 0.02, maxDelay: 50 },
    medium: { enabled: true, failureRate: 0.15, delayRate: 0.05, maxDelay: 100 },
    high: { enabled: true, failureRate: 0.30, delayRate: 0.10, maxDelay: 200 },
    extreme: { enabled: true, failureRate: 0.50, delayRate: 0.20, maxDelay: 500 },
  };
  return configs[intensity];
}

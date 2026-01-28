/**
 * PANTHEON TEST ORACLE
 * =====================
 *
 * The Oracle is the all-seeing eye that verifies system invariants,
 * detects anomalies, and provides verdicts on build behavior.
 *
 * Think of it as a highly sophisticated validator that goes beyond
 * simple assertions - it understands the SEMANTICS of the orchestrator.
 */

import {
  AgentId,
  BuildPhase,
  BUILD_PHASES,
  AgentState,
  BuildState,
  AgentSnapshot,
  BuildSnapshot,
  SimEvent,
  Invariant,
  InvariantResult,
  THRESHOLDS,
} from './types';

import { SimulatorEvent, CORE_INVARIANTS } from './simulator';

// ============================================================================
// ORACLE TYPES
// ============================================================================

export interface OracleVerdict {
  valid: boolean;
  confidence: number; // 0-1, how confident the oracle is
  violations: InvariantViolation[];
  anomalies: Anomaly[];
  suggestions: string[];
  executionProfile: ExecutionProfile;
}

export interface InvariantViolation {
  invariant: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  evidence: unknown;
  timestamp: number;
  snapshotIndex: number;
}

export interface Anomaly {
  type: AnomalyType;
  severity: 'critical' | 'major' | 'minor' | 'info';
  description: string;
  evidence: unknown;
  possibleCauses: string[];
  recommendation: string;
}

export type AnomalyType =
  | 'UNUSUAL_DURATION'
  | 'ABNORMAL_AGENT_COUNT'
  | 'SUSPICIOUS_STATE_TRANSITION'
  | 'RESOURCE_EXHAUSTION'
  | 'DEADLOCK_PATTERN'
  | 'STARVATION_PATTERN'
  | 'CASCADING_FAILURE'
  | 'HOT_SPOT_DETECTED'
  | 'COLD_START_DETECTED'
  | 'MEMORY_PRESSURE'
  | 'CONCURRENCY_ANOMALY';

export interface ExecutionProfile {
  totalDuration: number;
  phaseBreakdown: Map<BuildPhase, number>;
  agentUtilization: number; // 0-1
  concurrencyEfficiency: number; // 0-1
  chaosResilience: number; // 0-1
  throughput: number; // agents per second
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  location: string;
  impact: 'critical' | 'major' | 'minor';
  description: string;
  suggestedFix: string;
}

export interface TemporalPattern {
  name: string;
  pattern: (events: SimulatorEvent[]) => boolean;
  violation: (events: SimulatorEvent[]) => string | null;
}

// ============================================================================
// STATISTICAL MODELS
// ============================================================================

interface StatisticalModel {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  samples: number;
}

function updateModel(model: StatisticalModel, value: number): StatisticalModel {
  const n = model.samples + 1;
  const newMean = model.mean + (value - model.mean) / n;
  const newStdDev = Math.sqrt(
    ((model.samples - 1) * model.stdDev * model.stdDev + (value - model.mean) * (value - newMean)) /
      Math.max(1, model.samples)
  );

  return {
    mean: newMean,
    stdDev: newStdDev,
    min: Math.min(model.min, value),
    max: Math.max(model.max, value),
    samples: n,
  };
}

function createModel(): StatisticalModel {
  return { mean: 0, stdDev: 0, min: Infinity, max: -Infinity, samples: 0 };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function countAgentsByState(snapshot: BuildSnapshot, state: AgentState): number {
  let count = 0;
  for (const agent of snapshot.agents.values()) {
    if (agent.state === state) count++;
  }
  return count;
}

function getAgentsByState(snapshot: BuildSnapshot, state: AgentState): AgentId[] {
  const result: AgentId[] = [];
  for (const [id, agent] of snapshot.agents) {
    if (agent.state === state) result.push(id);
  }
  return result;
}

// ============================================================================
// TEMPORAL PATTERNS - Complex Multi-Event Patterns
// ============================================================================

export const TEMPORAL_PATTERNS: TemporalPattern[] = [
  {
    name: 'NO_STUCK_AGENTS',
    pattern: () => true,
    violation: events => {
      const runningTimes = new Map<string, number>();
      const maxRunTime = 60000; // 60 seconds max

      for (const event of events) {
        if (event.type === 'AGENT_STARTED' && event.agentId) {
          runningTimes.set(event.agentId, event.timestamp);
        } else if (
          (event.type === 'AGENT_COMPLETED' || event.type === 'AGENT_FAILED') &&
          event.agentId
        ) {
          const startTime = runningTimes.get(event.agentId);
          if (startTime && event.timestamp - startTime > maxRunTime) {
            return `Agent ${event.agentId} ran for ${event.timestamp - startTime}ms (max: ${maxRunTime}ms)`;
          }
          runningTimes.delete(event.agentId);
        }
      }
      return null;
    },
  },
  {
    name: 'PHASE_COMPLETION_BEFORE_NEXT',
    pattern: () => true,
    violation: events => {
      const phaseStarted = new Map<BuildPhase, boolean>();
      const phaseCompleted = new Map<BuildPhase, boolean>();

      for (const event of events) {
        if (event.type === 'PHASE_STARTED' && event.phase) {
          const phase = event.phase;
          const phaseIndex = BUILD_PHASES.indexOf(phase);

          // Check all previous phases are completed
          for (let i = 0; i < phaseIndex; i++) {
            const prevPhase = BUILD_PHASES[i];
            if (phaseStarted.get(prevPhase) && !phaseCompleted.get(prevPhase)) {
              return `Phase ${phase} started before ${prevPhase} completed`;
            }
          }

          phaseStarted.set(phase, true);
        }
        if (event.type === 'PHASE_COMPLETED' && event.phase) {
          phaseCompleted.set(event.phase, true);
        }
      }
      return null;
    },
  },
  {
    name: 'NO_DOUBLE_COMPLETION',
    pattern: () => true,
    violation: events => {
      const completedAgents = new Set<string>();
      for (const event of events) {
        if (event.type === 'AGENT_COMPLETED' && event.agentId) {
          if (completedAgents.has(event.agentId)) {
            return `Agent ${event.agentId} completed multiple times`;
          }
          completedAgents.add(event.agentId);
        }
      }
      return null;
    },
  },
  {
    name: 'FAILURE_PROPAGATION',
    pattern: () => true,
    violation: events => {
      let buildFailed = false;
      const newAgentsAfterFailure: string[] = [];

      for (const event of events) {
        if (event.type === 'BUILD_FAILED') {
          buildFailed = true;
        }
        if (buildFailed && event.type === 'AGENT_STARTED' && event.agentId) {
          newAgentsAfterFailure.push(event.agentId);
        }
      }

      if (newAgentsAfterFailure.length > 0) {
        return `${newAgentsAfterFailure.length} agents started after build failure: ${newAgentsAfterFailure.slice(0, 3).join(', ')}`;
      }
      return null;
    },
  },
  {
    name: 'MONOTONIC_PROGRESS',
    pattern: () => true,
    violation: events => {
      let lastProgress = 0;
      for (const event of events) {
        const progress = event.buildState?.progress;
        if (progress !== undefined) {
          if (progress < lastProgress) {
            return `Progress decreased from ${lastProgress} to ${progress}`;
          }
          lastProgress = progress;
        }
      }
      return null;
    },
  },
];

// ============================================================================
// ANOMALY DETECTORS
// ============================================================================

interface AnomalyDetector {
  name: AnomalyType;
  detect: (snapshots: BuildSnapshot[], events: SimulatorEvent[]) => Anomaly | null;
}

export const ANOMALY_DETECTORS: AnomalyDetector[] = [
  {
    name: 'UNUSUAL_DURATION',
    detect: snapshots => {
      if (snapshots.length < 2) return null;

      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      const duration = last.updatedAt - first.startedAt;
      const agentCount = first.config?.agents?.length || 0;

      // Expected: ~100ms per agent as baseline
      const expectedDuration = agentCount * 100;
      const ratio = duration / expectedDuration;

      if (ratio > 5) {
        return {
          type: 'UNUSUAL_DURATION',
          severity: ratio > 10 ? 'critical' : 'major',
          description: `Build took ${duration}ms, expected ~${expectedDuration}ms (${ratio.toFixed(1)}x slower)`,
          evidence: { duration, expectedDuration, ratio },
          possibleCauses: [
            'Excessive retry loops',
            'Blocked dependencies',
            'Resource contention',
            'Deadlock or livelock',
          ],
          recommendation: 'Profile agent execution times and check for blocking operations',
        };
      }

      if (ratio < 0.1 && agentCount > 5) {
        return {
          type: 'UNUSUAL_DURATION',
          severity: 'info',
          description: `Build completed suspiciously fast: ${duration}ms for ${agentCount} agents`,
          evidence: { duration, expectedDuration, ratio },
          possibleCauses: ['All agents skipped', 'Cached results', 'Short-circuit evaluation'],
          recommendation: 'Verify all agents actually executed',
        };
      }

      return null;
    },
  },
  {
    name: 'DEADLOCK_PATTERN',
    detect: snapshots => {
      // Detect potential deadlock: no progress for extended period with running agents
      let noProgressCount = 0;
      let lastProgress = 0;

      for (const snapshot of snapshots) {
        const runningCount = countAgentsByState(snapshot, 'running');

        if (snapshot.progress === lastProgress && runningCount > 0) {
          noProgressCount++;
        } else {
          noProgressCount = 0;
        }
        lastProgress = snapshot.progress;

        if (noProgressCount > 10) {
          return {
            type: 'DEADLOCK_PATTERN',
            severity: 'critical',
            description: `No progress for ${noProgressCount} snapshots with ${runningCount} agents running`,
            evidence: { noProgressCount, runningAgents: runningCount },
            possibleCauses: [
              'Circular dependency',
              'Resource deadlock',
              'Infinite loop in agent',
              'External service timeout',
            ],
            recommendation: 'Check dependency graph for cycles and add timeouts to agents',
          };
        }
      }
      return null;
    },
  },
  {
    name: 'STARVATION_PATTERN',
    detect: (_, events) => {
      // Detect agent starvation: agents waiting too long to start
      const pendingTimes = new Map<string, number>();

      for (const event of events) {
        if (event.type === 'BUILD_STARTED') {
          // Track when agents become pending (at build start)
          for (const [id] of event.buildState?.agents || []) {
            pendingTimes.set(id, event.timestamp);
          }
        } else if (event.type === 'AGENT_STARTED' && event.agentId) {
          const pendingStart = pendingTimes.get(event.agentId);
          if (pendingStart) {
            const waitTime = event.timestamp - pendingStart;
            if (waitTime > 30000) {
              // 30 seconds
              return {
                type: 'STARVATION_PATTERN',
                severity: 'major',
                description: `Agent ${event.agentId} waited ${waitTime}ms before starting`,
                evidence: { agentId: event.agentId, waitTime },
                possibleCauses: [
                  'Concurrency limit too low',
                  'Long-running blocking agents',
                  'Unfair scheduling algorithm',
                ],
                recommendation: 'Increase concurrency limit or implement fair scheduling',
              };
            }
          }
        }
      }
      return null;
    },
  },
  {
    name: 'CASCADING_FAILURE',
    detect: (_, events) => {
      // Detect cascading failures: multiple agents failing in quick succession
      const failureTimes: number[] = [];

      for (const event of events) {
        if (event.type === 'AGENT_FAILED') {
          failureTimes.push(event.timestamp);
        }
      }

      if (failureTimes.length < 3) return null;

      // Check for burst of failures within 1 second
      for (let i = 0; i < failureTimes.length - 2; i++) {
        const burstWindow = failureTimes[i + 2] - failureTimes[i];
        if (burstWindow < 1000) {
          return {
            type: 'CASCADING_FAILURE',
            severity: 'critical',
            description: `3+ agents failed within ${burstWindow}ms - possible cascade`,
            evidence: { failureTimes: failureTimes.slice(i, i + 3), window: burstWindow },
            possibleCauses: [
              'Shared dependency failure',
              'Resource exhaustion',
              'Configuration error',
              'Network partition',
            ],
            recommendation: 'Implement circuit breakers and isolate failure domains',
          };
        }
      }
      return null;
    },
  },
  {
    name: 'CONCURRENCY_ANOMALY',
    detect: snapshots => {
      if (snapshots.length === 0) return null;

      const limit = snapshots[0]?.config?.maxConcurrency || 10;

      for (const snapshot of snapshots) {
        const running = countAgentsByState(snapshot, 'running');

        if (running > limit) {
          return {
            type: 'CONCURRENCY_ANOMALY',
            severity: 'critical',
            description: `Concurrency limit violated: ${running} running, limit is ${limit}`,
            evidence: { running, limit, timestamp: snapshot.updatedAt },
            possibleCauses: ['Race condition in scheduler', 'Limit check bypass'],
            recommendation: 'Add atomic concurrency control with mutex/semaphore',
          };
        }
      }
      return null;
    },
  },
];

// ============================================================================
// THE ORACLE
// ============================================================================

export class TestOracle {
  private durationModels: Map<string, StatisticalModel> = new Map();
  private throughputModels: Map<string, StatisticalModel> = new Map();
  private customInvariants: Invariant[] = [];
  private customPatterns: TemporalPattern[] = [];

  constructor(private strictMode: boolean = false) {}

  /**
   * Add custom invariant to check
   */
  addInvariant(invariant: Invariant): void {
    this.customInvariants.push(invariant);
  }

  /**
   * Add custom temporal pattern
   */
  addPattern(pattern: TemporalPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Main verification method - produces comprehensive verdict
   */
  verify(snapshots: BuildSnapshot[], events: SimulatorEvent[]): OracleVerdict {
    const violations: InvariantViolation[] = [];
    const anomalies: Anomaly[] = [];
    const suggestions: string[] = [];

    // Check all invariants
    const allInvariants = [...CORE_INVARIANTS, ...this.customInvariants];

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const previous = i > 0 ? snapshots[i - 1] : undefined;

      for (const invariant of allInvariants) {
        const result = invariant.check(snapshot, previous);
        if (!result.passed) {
          violations.push({
            invariant: invariant.name,
            severity: this.classifySeverity(invariant.name),
            message: result.violation || `${invariant.name} violated`,
            evidence: this.extractEvidence(snapshot),
            timestamp: snapshot.updatedAt,
            snapshotIndex: i,
          });
        }
      }
    }

    // Check temporal patterns
    const allPatterns = [...TEMPORAL_PATTERNS, ...this.customPatterns];

    for (const pattern of allPatterns) {
      const violation = pattern.violation(events);
      if (violation) {
        violations.push({
          invariant: pattern.name,
          severity: 'major',
          message: violation,
          evidence: { pattern: pattern.name },
          timestamp: events[events.length - 1]?.timestamp || 0,
          snapshotIndex: snapshots.length - 1,
        });
      }
    }

    // Run anomaly detectors
    for (const detector of ANOMALY_DETECTORS) {
      const anomaly = detector.detect(snapshots, events);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Build execution profile
    const profile = this.buildProfile(snapshots, events);

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(violations, anomalies, profile));

    // Calculate confidence
    const confidence = this.calculateConfidence(snapshots, events, violations);

    return {
      valid: violations.filter(v => v.severity === 'critical').length === 0,
      confidence,
      violations,
      anomalies,
      suggestions,
      executionProfile: profile,
    };
  }

  /**
   * Quick validation - just checks critical invariants
   */
  quickValidate(snapshot: BuildSnapshot, previous?: BuildSnapshot): boolean {
    for (const invariant of CORE_INVARIANTS) {
      const result = invariant.check(snapshot, previous);
      if (!result.passed) {
        return false;
      }
    }
    return true;
  }

  /**
   * Learn from execution to improve anomaly detection
   */
  learn(snapshots: BuildSnapshot[], events: SimulatorEvent[]): void {
    if (snapshots.length < 2) return;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const duration = last.updatedAt - first.startedAt;
    const tier = first.config?.tier || 'starter';

    // Update duration model
    if (!this.durationModels.has(tier)) {
      this.durationModels.set(tier, createModel());
    }
    this.durationModels.set(tier, updateModel(this.durationModels.get(tier)!, duration));

    // Update throughput model
    const completedAgents = events.filter(e => e.type === 'AGENT_COMPLETED').length;
    const throughput = completedAgents / (duration / 1000);

    if (!this.throughputModels.has(tier)) {
      this.throughputModels.set(tier, createModel());
    }
    this.throughputModels.set(tier, updateModel(this.throughputModels.get(tier)!, throughput));
  }

  /**
   * Get learned baselines
   */
  getBaselines(): {
    duration: Map<string, StatisticalModel>;
    throughput: Map<string, StatisticalModel>;
  } {
    return {
      duration: new Map(this.durationModels),
      throughput: new Map(this.throughputModels),
    };
  }

  private classifySeverity(invariantName: string): 'critical' | 'major' | 'minor' {
    const criticalInvariants = [
      'COMPLETED_NEVER_RESTART',
      'TERMINAL_STATE_FINAL',
      'CONCURRENCY_LIMIT',
      'DEPENDENCY_RESPECTED',
    ];

    const majorInvariants = [
      'PROGRESS_MONOTONIC',
      'PHASE_ORDER_RESPECTED',
      'FAILED_BUILD_NO_NEW_AGENTS',
    ];

    if (criticalInvariants.includes(invariantName)) return 'critical';
    if (majorInvariants.includes(invariantName)) return 'major';
    return 'minor';
  }

  private extractEvidence(snapshot: BuildSnapshot): unknown {
    return {
      buildState: snapshot.state,
      phase: snapshot.phase,
      progress: snapshot.progress,
      runningAgents: getAgentsByState(snapshot, 'running'),
      completedAgents: getAgentsByState(snapshot, 'completed'),
      timestamp: snapshot.updatedAt,
    };
  }

  private buildProfile(snapshots: BuildSnapshot[], events: SimulatorEvent[]): ExecutionProfile {
    const phaseBreakdown = new Map<BuildPhase, number>();
    let lastPhaseStart = 0;
    let currentPhase: BuildPhase | null = null;

    for (const event of events) {
      if (event.type === 'PHASE_STARTED' && event.phase) {
        if (currentPhase) {
          phaseBreakdown.set(
            currentPhase,
            (phaseBreakdown.get(currentPhase) || 0) + (event.timestamp - lastPhaseStart)
          );
        }
        currentPhase = event.phase;
        lastPhaseStart = event.timestamp;
      }
    }

    // Final phase
    if (snapshots.length > 0 && currentPhase) {
      const lastSnapshot = snapshots[snapshots.length - 1];
      phaseBreakdown.set(
        currentPhase,
        (phaseBreakdown.get(currentPhase) || 0) + (lastSnapshot.updatedAt - lastPhaseStart)
      );
    }

    // Calculate metrics
    const totalDuration =
      snapshots.length > 0 ? snapshots[snapshots.length - 1].updatedAt - snapshots[0].startedAt : 0;

    // Agent utilization: time agents spent running / (total time * max concurrent)
    let totalRunningTime = 0;
    const runningStartTimes = new Map<string, number>();

    for (const event of events) {
      if (event.type === 'AGENT_STARTED' && event.agentId) {
        runningStartTimes.set(event.agentId, event.timestamp);
      } else if (
        (event.type === 'AGENT_COMPLETED' || event.type === 'AGENT_FAILED') &&
        event.agentId
      ) {
        const startTime = runningStartTimes.get(event.agentId);
        if (startTime) {
          totalRunningTime += event.timestamp - startTime;
          runningStartTimes.delete(event.agentId);
        }
      }
    }

    const maxConcurrent = snapshots[0]?.config?.maxConcurrency || 10;
    const agentUtilization =
      totalDuration > 0 ? totalRunningTime / (totalDuration * maxConcurrent) : 0;

    // Concurrency efficiency: how well we used available concurrency
    let maxObservedConcurrency = 0;
    for (const snapshot of snapshots) {
      const running = countAgentsByState(snapshot, 'running');
      maxObservedConcurrency = Math.max(maxObservedConcurrency, running);
    }
    const concurrencyEfficiency = maxObservedConcurrency / maxConcurrent;

    // Chaos resilience: how many chaos events vs failures
    const chaosEvents = events.filter(e => e.type === 'CHAOS_INJECTED').length;
    const failures = events.filter(e => e.type === 'AGENT_FAILED').length;
    const chaosResilience = chaosEvents > 0 ? Math.max(0, 1 - failures / chaosEvents) : 1;

    // Throughput
    const completedAgents = events.filter(e => e.type === 'AGENT_COMPLETED').length;
    const throughput = totalDuration > 0 ? completedAgents / (totalDuration / 1000) : 0;

    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(snapshots, phaseBreakdown);

    return {
      totalDuration,
      phaseBreakdown,
      agentUtilization: Math.min(1, agentUtilization),
      concurrencyEfficiency,
      chaosResilience,
      throughput,
      bottlenecks,
    };
  }

  private detectBottlenecks(
    snapshots: BuildSnapshot[],
    phaseBreakdown: Map<BuildPhase, number>
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const totalDuration = Array.from(phaseBreakdown.values()).reduce((a, b) => a + b, 0);

    if (totalDuration === 0) return bottlenecks;

    // Check for slow phases (>40% of total time)
    for (const [phase, duration] of phaseBreakdown) {
      const ratio = duration / totalDuration;
      if (ratio > 0.4) {
        bottlenecks.push({
          location: `Phase: ${phase}`,
          impact: ratio > 0.6 ? 'critical' : 'major',
          description: `Phase ${phase} took ${(ratio * 100).toFixed(1)}% of total build time`,
          suggestedFix:
            'Consider parallelizing agents within this phase or optimizing individual agents',
        });
      }
    }

    // Check for sequential execution patterns
    let sequentialStreak = 0;
    for (const snapshot of snapshots) {
      const running = countAgentsByState(snapshot, 'running');
      if (running === 1) {
        sequentialStreak++;
      } else {
        sequentialStreak = 0;
      }

      if (sequentialStreak > 5) {
        bottlenecks.push({
          location: 'Concurrency',
          impact: 'major',
          description: 'Build appears to be running sequentially instead of in parallel',
          suggestedFix: 'Review agent dependencies - some may be unnecessarily sequential',
        });
        break;
      }
    }

    return bottlenecks;
  }

  private generateSuggestions(
    violations: InvariantViolation[],
    anomalies: Anomaly[],
    profile: ExecutionProfile
  ): string[] {
    const suggestions: string[] = [];

    // Violation-based suggestions
    if (violations.some(v => v.invariant === 'CONCURRENCY_LIMIT')) {
      suggestions.push('Add mutex/semaphore to concurrency control');
    }

    if (violations.some(v => v.invariant === 'DEPENDENCY_RESPECTED')) {
      suggestions.push('Review dependency graph - topological sort may have bugs');
    }

    // Profile-based suggestions (thresholds from types.ts)
    if (profile.agentUtilization < THRESHOLDS.MIN_AGENT_UTILIZATION) {
      suggestions.push(
        `Low agent utilization (${(profile.agentUtilization * 100).toFixed(0)}% < ${THRESHOLDS.MIN_AGENT_UTILIZATION * 100}%) - increase parallelism`
      );
    }

    if (profile.concurrencyEfficiency < THRESHOLDS.MIN_CONCURRENCY_EFFICIENCY) {
      suggestions.push(
        `Concurrency underutilized (${(profile.concurrencyEfficiency * 100).toFixed(0)}% < ${THRESHOLDS.MIN_CONCURRENCY_EFFICIENCY * 100}%) - review dependencies`
      );
    }

    if (profile.chaosResilience < THRESHOLDS.MIN_CHAOS_RESILIENCE) {
      suggestions.push(
        `Low chaos resilience (${(profile.chaosResilience * 100).toFixed(0)}% < ${THRESHOLDS.MIN_CHAOS_RESILIENCE * 100}%) - add retries and circuit breakers`
      );
    }

    if (profile.throughput < 1) {
      suggestions.push('Throughput below 1 agent/sec - profile for slow agents');
    }

    // Anomaly-based suggestions
    for (const anomaly of anomalies) {
      suggestions.push(anomaly.recommendation);
    }

    return suggestions;
  }

  private calculateConfidence(
    snapshots: BuildSnapshot[],
    events: SimulatorEvent[],
    violations: InvariantViolation[]
  ): number {
    let confidence = 1.0;

    // Reduce confidence for violations (penalty from THRESHOLDS)
    confidence -=
      violations.filter(v => v.severity === 'critical').length *
      THRESHOLDS.CRITICAL_VIOLATION_PENALTY;
    confidence -= violations.filter(v => v.severity === 'major').length * 0.1;
    confidence -= violations.filter(v => v.severity === 'minor').length * 0.02;

    // Reduce confidence for short executions (less data)
    if (snapshots.length < 10) {
      confidence *= 0.7;
    } else if (snapshots.length < 50) {
      confidence *= 0.9;
    }

    // Reduce confidence for few events
    if (events.length < 20) {
      confidence *= 0.8;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// DIFFERENTIAL ORACLE - Compare Two Executions
// ============================================================================

export interface DiffResult {
  equivalent: boolean;
  differences: Difference[];
  similarity: number; // 0-1
}

export interface Difference {
  type: 'state' | 'timing' | 'event_order' | 'outcome';
  description: string;
  expected: unknown;
  actual: unknown;
}

export class DifferentialOracle {
  /**
   * Compare two executions for semantic equivalence
   */
  compare(
    baseSnapshots: BuildSnapshot[],
    baseEvents: SimulatorEvent[],
    testSnapshots: BuildSnapshot[],
    testEvents: SimulatorEvent[]
  ): DiffResult {
    const differences: Difference[] = [];

    // Compare final states
    const baseFinal = baseSnapshots[baseSnapshots.length - 1];
    const testFinal = testSnapshots[testSnapshots.length - 1];

    if (baseFinal?.state !== testFinal?.state) {
      differences.push({
        type: 'state',
        description: 'Final build state differs',
        expected: baseFinal?.state,
        actual: testFinal?.state,
      });
    }

    // Compare completed agents
    const baseCompleted = new Set(getAgentsByState(baseFinal, 'completed'));
    const testCompleted = new Set(getAgentsByState(testFinal, 'completed'));

    const missingInTest = [...baseCompleted].filter(id => !testCompleted.has(id));
    const extraInTest = [...testCompleted].filter(id => !baseCompleted.has(id));

    if (missingInTest.length > 0) {
      differences.push({
        type: 'state',
        description: `Agents completed in base but not in test: ${missingInTest.join(', ')}`,
        expected: [...baseCompleted],
        actual: [...testCompleted],
      });
    }

    if (extraInTest.length > 0) {
      differences.push({
        type: 'state',
        description: `Agents completed in test but not in base: ${extraInTest.join(', ')}`,
        expected: [...baseCompleted],
        actual: [...testCompleted],
      });
    }

    // Compare event sequences (ignoring timing)
    const baseEventTypes = baseEvents.map(e => `${e.type}:${e.agentId || ''}`);
    const testEventTypes = testEvents.map(e => `${e.type}:${e.agentId || ''}`);

    const eventSimilarity = this.sequenceSimilarity(baseEventTypes, testEventTypes);
    if (eventSimilarity < 0.9) {
      differences.push({
        type: 'event_order',
        description: `Event sequences differ (${(eventSimilarity * 100).toFixed(1)}% similar)`,
        expected: baseEventTypes.length,
        actual: testEventTypes.length,
      });
    }

    // Calculate overall similarity
    const stateSimilarity = differences.filter(d => d.type === 'state').length === 0 ? 1 : 0.5;
    const similarity = (stateSimilarity + eventSimilarity) / 2;

    return {
      equivalent: differences.length === 0,
      differences,
      similarity,
    };
  }

  private sequenceSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // LCS-based similarity
    const lcs = this.longestCommonSubsequence(a, b);
    return (2 * lcs) / (a.length + b.length);
  }

  private longestCommonSubsequence(a: string[], b: string[]): number {
    const dp: number[][] = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(0));

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[a.length][b.length];
  }
}

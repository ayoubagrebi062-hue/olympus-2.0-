/**
 * OLYMPUS 2.1 - 10X UPGRADE: Time-Travel Build System
 *
 * DEBUGGING FROM THE FUTURE.
 *
 * This isn't just checkpointing. This is:
 * - EXECUTION REPLAY: Step through any build like a debugger
 *   See every API call, every token, every decision
 *
 * - BRANCH & MERGE: Fork from any point, try different approaches
 *   Keep the best results, discard the rest
 *
 * - "WHAT IF" SCENARIOS: Replay with different inputs
 *   See how changes would affect the output
 *
 * - VISUAL TIMELINE: See the entire build history at a glance
 *   Click any point to jump there instantly
 *
 * - BLAME TRACKING: Who (which agent) wrote what, when, and why
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineEvent {
  id: string;
  buildId: string;
  branchId: string;
  timestamp: number;
  type: EventType;
  agentId?: string;
  phaseId?: string;
  data: EventData;
  parentEventId?: string;
  metadata: Record<string, unknown>;
}

export type EventType =
  | 'build_start'
  | 'build_end'
  | 'phase_start'
  | 'phase_end'
  | 'agent_start'
  | 'agent_end'
  | 'api_call'
  | 'token_generated'
  | 'decision_made'
  | 'error_occurred'
  | 'checkpoint_created'
  | 'branch_created'
  | 'branch_merged'
  | 'rollback';

export interface EventData {
  // Build events
  prompt?: string;
  config?: Record<string, unknown>;

  // Phase events
  phaseName?: string;
  artifacts?: string[];

  // Agent events
  agentName?: string;
  input?: unknown;
  output?: unknown;
  tokensUsed?: number;
  cost?: number;

  // API call events
  endpoint?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  latency?: number;

  // Token events
  token?: string;
  position?: { line: number; column: number };

  // Decision events
  decision?: string;
  reasoning?: string;
  alternatives?: string[];
  confidence?: number;

  // Error events
  error?: string;
  stack?: string;
  recoverable?: boolean;

  // Branch events
  parentBranch?: string;
  branchName?: string;
  reason?: string;
}

export interface Branch {
  id: string;
  buildId: string;
  name: string;
  parentBranchId?: string;
  forkPointEventId?: string;
  createdAt: number;
  status: 'active' | 'merged' | 'abandoned';
  metadata: Record<string, unknown>;
}

export interface BuildTimeline {
  buildId: string;
  branches: Branch[];
  events: TimelineEvent[];
  currentBranch: string;
  currentEventIndex: number;
}

export interface ReplayState {
  isReplaying: boolean;
  currentEventIndex: number;
  speed: number; // 1x, 2x, 4x, etc.
  isPaused: boolean;
  breakpoints: Set<string>;
}

export interface DiffResult {
  eventId1: string;
  eventId2: string;
  agentDiffs: AgentDiff[];
  artifactDiffs: ArtifactDiff[];
  costDiff: number;
  timeDiff: number;
}

export interface AgentDiff {
  agentId: string;
  inBranch1: boolean;
  inBranch2: boolean;
  outputDiff?: string; // Unified diff format
}

export interface ArtifactDiff {
  path: string;
  inBranch1: boolean;
  inBranch2: boolean;
  contentDiff?: string; // Unified diff format
}

export interface WhatIfScenario {
  id: string;
  buildId: string;
  description: string;
  changes: ScenarioChange[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: WhatIfResult;
}

export interface ScenarioChange {
  type: 'modify_input' | 'modify_config' | 'skip_agent' | 'replace_agent';
  target: string;
  before: unknown;
  after: unknown;
}

export interface WhatIfResult {
  originalBranch: string;
  scenarioBranch: string;
  diff: DiffResult;
  recommendation: string;
}

// ============================================================================
// TIME-TRAVEL ENGINE
// ============================================================================

export class TimeTravelEngine {
  private timelines = new Map<string, BuildTimeline>();
  private replayStates = new Map<string, ReplayState>();
  private eventListeners = new Set<(event: TimelineEvent) => void>();
  private scenarios = new Map<string, WhatIfScenario>();

  /**
   * Start recording a new build timeline
   */
  startRecording(buildId: string, prompt: string, config: Record<string, unknown>): BuildTimeline {
    const mainBranch: Branch = {
      id: `branch_main_${buildId}`,
      buildId,
      name: 'main',
      createdAt: Date.now(),
      status: 'active',
      metadata: {},
    };

    const timeline: BuildTimeline = {
      buildId,
      branches: [mainBranch],
      events: [],
      currentBranch: mainBranch.id,
      currentEventIndex: -1,
    };

    this.timelines.set(buildId, timeline);

    // Record build start event
    this.recordEvent(buildId, {
      type: 'build_start',
      data: { prompt, config },
    });

    logger.info('Started timeline recording', { buildId });
    incCounter('olympus_timelines_started');
    setGauge('olympus_active_timelines', this.timelines.size);

    return timeline;
  }

  /**
   * Record an event in the timeline
   */
  recordEvent(
    buildId: string,
    event: Omit<TimelineEvent, 'id' | 'buildId' | 'branchId' | 'timestamp' | 'metadata'>
  ): TimelineEvent {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const fullEvent: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      buildId,
      branchId: timeline.currentBranch,
      timestamp: Date.now(),
      ...event,
      parentEventId: timeline.events.length > 0
        ? timeline.events[timeline.events.length - 1].id
        : undefined,
      metadata: {},
    };

    timeline.events.push(fullEvent);
    timeline.currentEventIndex = timeline.events.length - 1;

    // Notify listeners
    for (const listener of this.eventListeners) {
      try {
        listener(fullEvent);
      } catch (error) {
        logger.warn('Event listener error', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    return fullEvent;
  }

  /**
   * Create a branch from a specific event
   */
  createBranch(
    buildId: string,
    forkPointEventId: string,
    branchName: string,
    reason?: string
  ): Branch {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const forkEvent = timeline.events.find(e => e.id === forkPointEventId);
    if (!forkEvent) {
      throw new Error(`Event not found: ${forkPointEventId}`);
    }

    const parentBranch = timeline.branches.find(b => b.id === forkEvent.branchId);

    const branch: Branch = {
      id: `branch_${branchName}_${Date.now()}`,
      buildId,
      name: branchName,
      parentBranchId: parentBranch?.id,
      forkPointEventId,
      createdAt: Date.now(),
      status: 'active',
      metadata: { reason },
    };

    timeline.branches.push(branch);
    timeline.currentBranch = branch.id;

    // Record branch creation event
    this.recordEvent(buildId, {
      type: 'branch_created',
      data: {
        parentBranch: parentBranch?.name,
        branchName,
        reason,
      },
    });

    logger.info('Branch created', {
      buildId,
      branchId: branch.id,
      name: branchName,
      forkPoint: forkPointEventId,
    });

    incCounter('olympus_branches_created');

    return branch;
  }

  /**
   * Merge a branch back to its parent
   */
  mergeBranch(buildId: string, branchId: string, strategy: 'keep_all' | 'keep_best' | 'manual'): DiffResult {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const branch = timeline.branches.find(b => b.id === branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    if (!branch.parentBranchId) {
      throw new Error('Cannot merge main branch');
    }

    // Calculate diff
    const diff = this.diffBranches(buildId, branch.parentBranchId, branchId);

    // Mark branch as merged
    branch.status = 'merged';

    // Switch back to parent branch
    timeline.currentBranch = branch.parentBranchId;

    // Record merge event
    this.recordEvent(buildId, {
      type: 'branch_merged',
      data: {
        branchName: branch.name,
        parentBranch: timeline.branches.find(b => b.id === branch.parentBranchId)?.name,
      },
    });

    logger.info('Branch merged', {
      buildId,
      branchId,
      strategy,
      costDiff: diff.costDiff,
    });

    incCounter('olympus_branches_merged');

    return diff;
  }

  /**
   * Calculate diff between two branches
   */
  diffBranches(buildId: string, branchId1: string, branchId2: string): DiffResult {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const events1 = timeline.events.filter(e => e.branchId === branchId1);
    const events2 = timeline.events.filter(e => e.branchId === branchId2);

    // Find agent differences
    const agents1 = new Set(events1.filter(e => e.agentId).map(e => e.agentId!));
    const agents2 = new Set(events2.filter(e => e.agentId).map(e => e.agentId!));
    const allAgents = new Set([...agents1, ...agents2]);

    const agentDiffs: AgentDiff[] = [];
    for (const agentId of allAgents) {
      const inBranch1 = agents1.has(agentId);
      const inBranch2 = agents2.has(agentId);

      let outputDiff: string | undefined;
      if (inBranch1 && inBranch2) {
        const output1 = events1.find(e => e.agentId === agentId && e.type === 'agent_end')?.data.output;
        const output2 = events2.find(e => e.agentId === agentId && e.type === 'agent_end')?.data.output;
        if (JSON.stringify(output1) !== JSON.stringify(output2)) {
          outputDiff = this.createUnifiedDiff(
            JSON.stringify(output1, null, 2),
            JSON.stringify(output2, null, 2)
          );
        }
      }

      agentDiffs.push({ agentId, inBranch1, inBranch2, outputDiff });
    }

    // Calculate cost diff
    const cost1 = events1
      .filter(e => e.type === 'agent_end')
      .reduce((sum, e) => sum + (e.data.cost || 0), 0);
    const cost2 = events2
      .filter(e => e.type === 'agent_end')
      .reduce((sum, e) => sum + (e.data.cost || 0), 0);

    // Calculate time diff
    const time1 = events1.length > 0
      ? events1[events1.length - 1].timestamp - events1[0].timestamp
      : 0;
    const time2 = events2.length > 0
      ? events2[events2.length - 1].timestamp - events2[0].timestamp
      : 0;

    return {
      eventId1: events1[events1.length - 1]?.id || '',
      eventId2: events2[events2.length - 1]?.id || '',
      agentDiffs,
      artifactDiffs: [], // Would be populated from actual artifacts
      costDiff: cost2 - cost1,
      timeDiff: time2 - time1,
    };
  }

  /**
   * Jump to a specific event (for debugging)
   */
  jumpToEvent(buildId: string, eventId: string): TimelineEvent {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const eventIndex = timeline.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      throw new Error(`Event not found: ${eventId}`);
    }

    timeline.currentEventIndex = eventIndex;
    const event = timeline.events[eventIndex];

    // Switch to the event's branch if different
    if (event.branchId !== timeline.currentBranch) {
      timeline.currentBranch = event.branchId;
    }

    logger.debug('Jumped to event', { buildId, eventId, eventIndex });

    return event;
  }

  /**
   * Start replay mode
   */
  startReplay(buildId: string, speed: number = 1): ReplayState {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const state: ReplayState = {
      isReplaying: true,
      currentEventIndex: 0,
      speed,
      isPaused: false,
      breakpoints: new Set(),
    };

    this.replayStates.set(buildId, state);

    logger.info('Started replay', { buildId, speed, totalEvents: timeline.events.length });

    return state;
  }

  /**
   * Step to next event in replay
   */
  stepReplay(buildId: string): TimelineEvent | null {
    const state = this.replayStates.get(buildId);
    if (!state || !state.isReplaying) {
      return null;
    }

    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      return null;
    }

    if (state.currentEventIndex >= timeline.events.length - 1) {
      state.isReplaying = false;
      return null;
    }

    state.currentEventIndex++;
    const event = timeline.events[state.currentEventIndex];

    // Check for breakpoint
    if (state.breakpoints.has(event.id)) {
      state.isPaused = true;
    }

    return event;
  }

  /**
   * Add a breakpoint
   */
  addBreakpoint(buildId: string, eventId: string): void {
    const state = this.replayStates.get(buildId);
    if (state) {
      state.breakpoints.add(eventId);
    }
  }

  /**
   * Create a "what if" scenario
   */
  createWhatIfScenario(
    buildId: string,
    description: string,
    changes: ScenarioChange[]
  ): WhatIfScenario {
    const scenario: WhatIfScenario = {
      id: `scenario_${Date.now()}`,
      buildId,
      description,
      changes,
      status: 'pending',
    };

    this.scenarios.set(scenario.id, scenario);

    logger.info('Created what-if scenario', {
      buildId,
      scenarioId: scenario.id,
      changes: changes.length,
    });

    return scenario;
  }

  /**
   * Run a "what if" scenario
   */
  async runWhatIfScenario(
    scenarioId: string,
    executor: (changes: ScenarioChange[]) => Promise<void>
  ): Promise<WhatIfResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const timeline = this.timelines.get(scenario.buildId);
    if (!timeline) {
      throw new Error(`Timeline not found: ${scenario.buildId}`);
    }

    scenario.status = 'running';

    // Create a branch for the scenario
    const currentEvent = timeline.events[timeline.currentEventIndex];
    const branch = this.createBranch(
      scenario.buildId,
      currentEvent.id,
      `what-if-${scenario.id}`,
      scenario.description
    );

    try {
      // Execute with changes
      await executor(scenario.changes);

      scenario.status = 'completed';

      // Calculate diff
      const originalBranch = timeline.branches.find(
        b => b.id === branch.parentBranchId
      )!;

      const diff = this.diffBranches(
        scenario.buildId,
        originalBranch.id,
        branch.id
      );

      // Generate recommendation
      const recommendation = this.generateRecommendation(diff);

      const result: WhatIfResult = {
        originalBranch: originalBranch.id,
        scenarioBranch: branch.id,
        diff,
        recommendation,
      };

      scenario.result = result;

      logger.info('What-if scenario completed', {
        scenarioId,
        costDiff: diff.costDiff,
        recommendation,
      });

      return result;
    } catch (error) {
      scenario.status = 'failed';
      throw error;
    }
  }

  /**
   * Rollback to a specific event
   */
  rollback(buildId: string, targetEventId: string): void {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const targetIndex = timeline.events.findIndex(e => e.id === targetEventId);
    if (targetIndex === -1) {
      throw new Error(`Event not found: ${targetEventId}`);
    }

    // Record rollback event before truncating
    this.recordEvent(buildId, {
      type: 'rollback',
      data: {
        reason: `Rolled back to event ${targetEventId}`,
      },
    });

    // Remove all events after target
    const removedCount = timeline.events.length - targetIndex - 1;
    timeline.events = timeline.events.slice(0, targetIndex + 1);
    timeline.currentEventIndex = targetIndex;

    logger.info('Rolled back timeline', {
      buildId,
      targetEventId,
      removedEvents: removedCount,
    });

    incCounter('olympus_rollbacks');
  }

  /**
   * Get timeline for a build
   */
  getTimeline(buildId: string): BuildTimeline | undefined {
    return this.timelines.get(buildId);
  }

  /**
   * Get events for visualization
   */
  getTimelineVisualization(buildId: string): TimelineVisualization {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    const phases: PhaseVisualization[] = [];
    const agents: AgentVisualization[] = [];

    let currentPhase: PhaseVisualization | null = null;

    for (const event of timeline.events) {
      if (event.type === 'phase_start') {
        currentPhase = {
          id: event.phaseId || '',
          name: event.data.phaseName || '',
          startTime: event.timestamp,
          endTime: 0,
          agents: [],
          status: 'running',
        };
      } else if (event.type === 'phase_end' && currentPhase) {
        currentPhase.endTime = event.timestamp;
        currentPhase.status = 'completed';
        phases.push(currentPhase);
        currentPhase = null;
      } else if (event.type === 'agent_end') {
        const agentVis: AgentVisualization = {
          id: event.agentId || '',
          name: event.data.agentName || '',
          phaseId: event.phaseId || '',
          startTime: event.timestamp - (event.data.latency || 0),
          endTime: event.timestamp,
          tokensUsed: event.data.tokensUsed || 0,
          cost: event.data.cost || 0,
          status: 'completed',
        };
        agents.push(agentVis);
        if (currentPhase) {
          currentPhase.agents.push(agentVis.id);
        }
      }
    }

    const startTime = timeline.events[0]?.timestamp || 0;
    const endTime = timeline.events[timeline.events.length - 1]?.timestamp || 0;

    return {
      buildId,
      branches: timeline.branches.map(b => ({
        id: b.id,
        name: b.name,
        status: b.status,
        eventCount: timeline.events.filter(e => e.branchId === b.id).length,
      })),
      phases,
      agents,
      totalDuration: endTime - startTime,
      totalEvents: timeline.events.length,
      currentEventIndex: timeline.currentEventIndex,
    };
  }

  /**
   * Subscribe to events
   */
  subscribe(listener: (event: TimelineEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Export timeline for persistence
   */
  exportTimeline(buildId: string): string {
    const timeline = this.timelines.get(buildId);
    if (!timeline) {
      throw new Error(`No timeline found for build: ${buildId}`);
    }

    return JSON.stringify(timeline, null, 2);
  }

  /**
   * Import timeline from persistence - WITH CRITICAL VALIDATION
   */
  importTimeline(data: string): BuildTimeline {
    // CRITICAL FIX: Validate JSON parsing
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid timeline data: JSON parse failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // CRITICAL FIX: Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid timeline data: Expected object');
    }

    const timeline = parsed as Record<string, unknown>;

    // Required fields validation
    if (typeof timeline.buildId !== 'string' || !timeline.buildId) {
      throw new Error('Invalid timeline data: Missing or invalid buildId');
    }

    if (!Array.isArray(timeline.events)) {
      throw new Error('Invalid timeline data: Missing or invalid events array');
    }

    if (!Array.isArray(timeline.branches)) {
      throw new Error('Invalid timeline data: Missing or invalid branches array');
    }

    if (typeof timeline.currentBranch !== 'string') {
      throw new Error('Invalid timeline data: Missing or invalid currentBranch');
    }

    if (typeof timeline.currentEventIndex !== 'number') {
      throw new Error('Invalid timeline data: Missing or invalid currentEventIndex');
    }

    // Validate events structure
    for (let i = 0; i < timeline.events.length; i++) {
      const event = timeline.events[i] as Record<string, unknown>;
      if (!event || typeof event !== 'object') {
        throw new Error(`Invalid timeline data: Event ${i} is not an object`);
      }
      if (typeof event.id !== 'string' || typeof event.type !== 'string') {
        throw new Error(`Invalid timeline data: Event ${i} missing id or type`);
      }
    }

    // Validate branches structure
    for (let i = 0; i < timeline.branches.length; i++) {
      const branch = timeline.branches[i] as Record<string, unknown>;
      if (!branch || typeof branch !== 'object') {
        throw new Error(`Invalid timeline data: Branch ${i} is not an object`);
      }
      if (typeof branch.id !== 'string' || typeof branch.name !== 'string') {
        throw new Error(`Invalid timeline data: Branch ${i} missing id or name`);
      }
    }

    const validTimeline = timeline as unknown as BuildTimeline;
    this.timelines.set(validTimeline.buildId, validTimeline);

    logger.info('Timeline imported successfully', {
      buildId: validTimeline.buildId,
      events: validTimeline.events.length,
      branches: validTimeline.branches.length,
    });

    return validTimeline;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private createUnifiedDiff(before: string, after: string): string {
    // Simplified diff - in production use a proper diff library
    const lines1 = before.split('\n');
    const lines2 = after.split('\n');
    const result: string[] = [];

    const maxLen = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLen; i++) {
      if (lines1[i] === lines2[i]) {
        result.push(` ${lines1[i] || ''}`);
      } else {
        if (lines1[i]) result.push(`-${lines1[i]}`);
        if (lines2[i]) result.push(`+${lines2[i]}`);
      }
    }

    return result.join('\n');
  }

  private generateRecommendation(diff: DiffResult): string {
    const recommendations: string[] = [];

    if (diff.costDiff < 0) {
      recommendations.push(`Saves $${Math.abs(diff.costDiff).toFixed(2)} in costs`);
    } else if (diff.costDiff > 0) {
      recommendations.push(`Costs $${diff.costDiff.toFixed(2)} more`);
    }

    if (diff.timeDiff < 0) {
      recommendations.push(`${Math.abs(diff.timeDiff / 1000).toFixed(1)}s faster`);
    } else if (diff.timeDiff > 0) {
      recommendations.push(`${(diff.timeDiff / 1000).toFixed(1)}s slower`);
    }

    const changedAgents = diff.agentDiffs.filter(a => a.outputDiff).length;
    if (changedAgents > 0) {
      recommendations.push(`${changedAgents} agents produced different outputs`);
    }

    return recommendations.length > 0
      ? recommendations.join('. ')
      : 'No significant differences';
  }
}

// ============================================================================
// VISUALIZATION TYPES
// ============================================================================

export interface TimelineVisualization {
  buildId: string;
  branches: {
    id: string;
    name: string;
    status: string;
    eventCount: number;
  }[];
  phases: PhaseVisualization[];
  agents: AgentVisualization[];
  totalDuration: number;
  totalEvents: number;
  currentEventIndex: number;
}

export interface PhaseVisualization {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  agents: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface AgentVisualization {
  id: string;
  name: string;
  phaseId: string;
  startTime: number;
  endTime: number;
  tokensUsed: number;
  cost: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// ============================================================================
// FACTORY
// ============================================================================

export const timeTravelEngine = new TimeTravelEngine();

export function createTimeTravelEngine(): TimeTravelEngine {
  return new TimeTravelEngine();
}

export default timeTravelEngine;

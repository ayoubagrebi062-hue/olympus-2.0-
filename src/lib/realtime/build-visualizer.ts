/**
 * OLYMPUS 2.1 - 10X UPGRADE: Real-Time Build Visualizer
 *
 * THE "HOLY SHIT" VISUAL EXPERIENCE.
 *
 * What users see:
 * - Live agent activity (like watching a team code)
 * - Real-time token consumption meter
 * - Live code generation preview
 * - Cost ticker updating in real-time
 * - Parallel execution visualization
 * - Phase transitions with animations
 */

import { logger } from '../observability/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AgentVisualState =
  | 'idle'
  | 'thinking'
  | 'generating'
  | 'validating'
  | 'complete'
  | 'error'
  | 'blocked';

export interface AgentVisualization {
  id: string;
  name: string;
  role: string;
  state: AgentVisualState;
  progress: number; // 0-100
  currentTask?: string;
  outputPreview?: string;
  tokensUsed: number;
  startTime?: number;
  duration?: number;
  error?: string;
}

export interface PhaseVisualization {
  id: string;
  name: string;
  description: string;
  state: 'pending' | 'active' | 'complete' | 'failed';
  agents: AgentVisualization[];
  startTime?: number;
  duration?: number;
  progress: number;
}

export interface BuildVisualization {
  buildId: string;
  status: 'initializing' | 'running' | 'complete' | 'failed' | 'cancelled';
  phases: PhaseVisualization[];
  currentPhase?: string;
  metrics: {
    tokensUsed: number;
    tokensLimit: number;
    costAccrued: number;
    costLimit?: number;
    elapsedTime: number;
    estimatedRemaining: number;
    agentsActive: number;
    agentsComplete: number;
    agentsTotal: number;
  };
  timeline: TimelineEvent[];
  livePreview?: LivePreview;
}

export interface TimelineEvent {
  timestamp: number;
  type:
    | 'phase_start'
    | 'phase_end'
    | 'agent_start'
    | 'agent_end'
    | 'error'
    | 'recovery'
    | 'milestone';
  title: string;
  description?: string;
  agentId?: string;
  phaseId?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface LivePreview {
  type: 'code' | 'component' | 'schema' | 'config';
  language?: string;
  content: string;
  path?: string;
  agentId: string;
  isStreaming: boolean;
}

// ============================================================================
// VISUALIZATION STATE MANAGER
// ============================================================================

export class BuildVisualizer {
  private state: BuildVisualization;
  private listeners: Set<(state: BuildVisualization) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor(
    buildId: string,
    config: {
      phases: Array<{
        id: string;
        name: string;
        description: string;
        agents: Array<{ id: string; name: string; role: string }>;
      }>;
      tokensLimit?: number;
      costLimit?: number;
    }
  ) {
    this.startTime = Date.now();

    this.state = {
      buildId,
      status: 'initializing',
      phases: config.phases.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        state: 'pending',
        agents: p.agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          state: 'idle',
          progress: 0,
          tokensUsed: 0,
        })),
        progress: 0,
      })),
      metrics: {
        tokensUsed: 0,
        tokensLimit: config.tokensLimit || 500000,
        costAccrued: 0,
        costLimit: config.costLimit,
        elapsedTime: 0,
        estimatedRemaining: 0,
        agentsActive: 0,
        agentsComplete: 0,
        agentsTotal: config.phases.reduce((sum, p) => sum + p.agents.length, 0),
      },
      timeline: [
        {
          timestamp: Date.now(),
          type: 'milestone',
          title: 'Build Initialized',
          description: `Starting build with ${config.phases.length} phases`,
          severity: 'info',
        },
      ],
    };

    // Start elapsed time updates
    this.updateInterval = setInterval(() => {
      this.state.metrics.elapsedTime = Date.now() - this.startTime;
      this.notifyListeners();
    }, 1000);
  }

  /**
   * Subscribe to state updates
   */
  subscribe(listener: (state: BuildVisualization) => void): () => void {
    this.listeners.add(listener);
    listener(this.state); // Send initial state
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        logger.warn('Visualization listener error', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): BuildVisualization {
    return JSON.parse(JSON.stringify(this.state));
  }

  // ============================================================================
  // PHASE UPDATES
  // ============================================================================

  startPhase(phaseId: string): void {
    const phase = this.state.phases.find(p => p.id === phaseId);
    if (!phase) return;

    phase.state = 'active';
    phase.startTime = Date.now();
    this.state.currentPhase = phaseId;
    this.state.status = 'running';

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'phase_start',
      title: `Phase Started: ${phase.name}`,
      phaseId,
      severity: 'info',
    });

    logger.info('Phase visualization started', { phaseId, phaseName: phase.name });
    this.notifyListeners();
  }

  completePhase(phaseId: string, success: boolean): void {
    const phase = this.state.phases.find(p => p.id === phaseId);
    if (!phase) return;

    phase.state = success ? 'complete' : 'failed';
    phase.duration = Date.now() - (phase.startTime || Date.now());
    phase.progress = 100;

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'phase_end',
      title: `Phase ${success ? 'Completed' : 'Failed'}: ${phase.name}`,
      phaseId,
      severity: success ? 'success' : 'error',
    });

    this.notifyListeners();
  }

  // ============================================================================
  // AGENT UPDATES
  // ============================================================================

  updateAgent(agentId: string, updates: Partial<AgentVisualization>): void {
    for (const phase of this.state.phases) {
      const agent = phase.agents.find(a => a.id === agentId);
      if (agent) {
        Object.assign(agent, updates);

        // Update phase progress based on agent progress
        const totalProgress = phase.agents.reduce((sum, a) => sum + a.progress, 0);
        phase.progress = Math.round(totalProgress / phase.agents.length);

        // Update active/complete counts
        this.state.metrics.agentsActive = this.state.phases
          .flatMap(p => p.agents)
          .filter(a => ['thinking', 'generating', 'validating'].includes(a.state)).length;

        this.state.metrics.agentsComplete = this.state.phases
          .flatMap(p => p.agents)
          .filter(a => a.state === 'complete').length;

        this.notifyListeners();
        return;
      }
    }
  }

  agentThinking(agentId: string, task: string): void {
    this.updateAgent(agentId, {
      state: 'thinking',
      currentTask: task,
      progress: 10,
    });

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'agent_start',
      title: 'Agent Started',
      description: task,
      agentId,
      severity: 'info',
    });
  }

  agentGenerating(agentId: string, progress: number, preview?: string): void {
    const updates: Partial<AgentVisualization> = {
      state: 'generating',
      progress: Math.min(90, 20 + progress * 0.7),
    };

    if (preview) {
      updates.outputPreview = preview.slice(0, 500);

      // Update live preview
      this.state.livePreview = {
        type: 'code',
        content: preview,
        agentId,
        isStreaming: true,
      };
    }

    this.updateAgent(agentId, updates);
  }

  agentComplete(agentId: string, tokensUsed: number): void {
    this.updateAgent(agentId, {
      state: 'complete',
      progress: 100,
      tokensUsed,
      duration: Date.now() - (this.findAgent(agentId)?.startTime || Date.now()),
    });

    // Update total tokens and cost
    this.state.metrics.tokensUsed += tokensUsed;
    this.state.metrics.costAccrued = this.state.metrics.tokensUsed * 0.00001; // $0.01 per 1K

    // Clear live preview if this was the streaming agent
    if (this.state.livePreview?.agentId === agentId) {
      this.state.livePreview.isStreaming = false;
    }

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'agent_end',
      title: 'Agent Completed',
      description: `Used ${tokensUsed.toLocaleString()} tokens`,
      agentId,
      severity: 'success',
    });
  }

  agentError(agentId: string, error: string, recoverable: boolean): void {
    this.updateAgent(agentId, {
      state: recoverable ? 'blocked' : 'error',
      error,
    });

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'error',
      title: recoverable ? 'Agent Blocked' : 'Agent Failed',
      description: error,
      agentId,
      severity: recoverable ? 'warning' : 'error',
    });
  }

  agentRecovered(agentId: string, strategy: string): void {
    this.updateAgent(agentId, {
      state: 'generating',
      error: undefined,
    });

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'recovery',
      title: 'Agent Recovered',
      description: `Strategy: ${strategy}`,
      agentId,
      severity: 'success',
    });
  }

  // ============================================================================
  // BUILD LIFECYCLE
  // ============================================================================

  completeBuild(success: boolean, summary?: string): void {
    this.state.status = success ? 'complete' : 'failed';

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'milestone',
      title: success ? 'Build Complete!' : 'Build Failed',
      description: summary,
      severity: success ? 'success' : 'error',
    });

    // Stop the timer
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.notifyListeners();
  }

  cancelBuild(): void {
    this.state.status = 'cancelled';

    // Mark all active agents as blocked
    for (const phase of this.state.phases) {
      for (const agent of phase.agents) {
        if (['thinking', 'generating', 'validating'].includes(agent.state)) {
          agent.state = 'blocked';
        }
      }
    }

    this.state.timeline.push({
      timestamp: Date.now(),
      type: 'milestone',
      title: 'Build Cancelled',
      severity: 'warning',
    });

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.notifyListeners();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private findAgent(agentId: string): AgentVisualization | undefined {
    for (const phase of this.state.phases) {
      const agent = phase.agents.find(a => a.id === agentId);
      if (agent) return agent;
    }
    return undefined;
  }

  /**
   * Update estimated remaining time
   */
  updateEstimate(estimatedRemainingMs: number): void {
    this.state.metrics.estimatedRemaining = estimatedRemainingMs;
    this.notifyListeners();
  }

  /**
   * Set live preview content
   */
  setLivePreview(preview: LivePreview): void {
    this.state.livePreview = preview;
    this.notifyListeners();
  }

  /**
   * Add custom timeline event
   */
  addTimelineEvent(event: Omit<TimelineEvent, 'timestamp'>): void {
    this.state.timeline.push({
      ...event,
      timestamp: Date.now(),
    });
    this.notifyListeners();
  }

  /**
   * Get visualization summary for logging
   */
  getSummary(): string {
    const { metrics, status } = this.state;
    return (
      `Build ${this.state.buildId}: ${status} | ` +
      `Agents: ${metrics.agentsComplete}/${metrics.agentsTotal} | ` +
      `Tokens: ${metrics.tokensUsed.toLocaleString()} | ` +
      `Cost: $${metrics.costAccrued.toFixed(4)} | ` +
      `Time: ${Math.round(metrics.elapsedTime / 1000)}s`
    );
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.listeners.clear();
  }
}

// ============================================================================
// VISUALIZATION FACTORY
// ============================================================================

/**
 * Create a visualizer for OLYMPUS standard phases
 */
export function createOlympusVisualizer(buildId: string): BuildVisualizer {
  return new BuildVisualizer(buildId, {
    phases: [
      {
        id: 'analysis',
        name: 'Analysis',
        description: 'Understanding requirements',
        agents: [
          { id: 'archon', name: 'Archon', role: 'Master Architect' },
          { id: 'oracle', name: 'Oracle', role: 'Requirements Analyst' },
          { id: 'empathy', name: 'Empathy', role: 'UX Strategist' },
        ],
      },
      {
        id: 'planning',
        name: 'Planning',
        description: 'Designing architecture',
        agents: [
          { id: 'venture', name: 'Venture', role: 'Business Analyst' },
          { id: 'strategos', name: 'Strategos', role: 'Strategic Planner' },
          { id: 'aegis', name: 'Aegis', role: 'Security Architect' },
        ],
      },
      {
        id: 'schema',
        name: 'Schema',
        description: 'Defining data models',
        agents: [
          { id: 'schemaforge', name: 'SchemaForge', role: 'Database Designer' },
          { id: 'chronos', name: 'Chronos', role: 'Migration Planner' },
        ],
      },
      {
        id: 'generation',
        name: 'Generation',
        description: 'Building components',
        agents: [
          { id: 'forge', name: 'Forge', role: 'Component Builder' },
          { id: 'nexus', name: 'Nexus', role: 'API Developer' },
          { id: 'pixel', name: 'Pixel', role: 'UI Designer' },
          { id: 'flow', name: 'Flow', role: 'State Manager' },
        ],
      },
      {
        id: 'integration',
        name: 'Integration',
        description: 'Connecting systems',
        agents: [
          { id: 'weaver', name: 'Weaver', role: 'Integration Specialist' },
          { id: 'meridian', name: 'Meridian', role: 'Route Designer' },
        ],
      },
      {
        id: 'quality',
        name: 'Quality',
        description: 'Testing & validation',
        agents: [
          { id: 'sentinel', name: 'Sentinel', role: 'Test Engineer' },
          { id: 'polish', name: 'Polish', role: 'Code Reviewer' },
        ],
      },
    ],
    tokensLimit: 500000,
    costLimit: 5.0,
  });
}

export default BuildVisualizer;

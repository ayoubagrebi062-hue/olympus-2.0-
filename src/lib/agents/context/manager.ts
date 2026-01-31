/**
 * OLYMPUS 2.1 - Build Context Manager
 *
 * Updated with 50X Coordination Upgrade:
 * - Tracks CriticalDecisions from coordination system
 * - Provides constraint context to downstream agents
 *
 * SECURITY FIX: Cluster #6 - Concurrency Primitives
 * - Added mutex protection for concurrent state access
 * - Thread-safe agent output recording
 *
 * @AUTHORITY_CHECK - Context management requires authorization verification
 */

import type { AgentId, AgentOutput, BuildPhase, Artifact, Decision, BuildContext } from '../types';
import type {
  BuildContextData,
  BuildKnowledge,
  BuildState,
  ContextSnapshot,
  ContextUpdateEvent,
  TechStackDecision,
} from './types';
import { createHash } from 'crypto';
import {
  CriticalDecisions,
  buildCriticalDecisions,
  updateCriticalDecisions,
  parseArchonOutput,
  extractCriticalDecisions,
} from '../coordination';
import { saveCriticalDecisions, loadCriticalDecisions } from './persistence';
import { Mutex, ReadWriteLock } from '@/lib/utils/mutex';

/** Build context manager - accumulates and provides context to agents */
export class BuildContextManager {
  private data: BuildContextData;
  private listeners: ((event: ContextUpdateEvent) => void)[] = [];
  private snapshotVersion = 0;

  /** 50X COORDINATION: Cached critical decisions from upstream agents */
  private _criticalDecisions: CriticalDecisions | null = null;

  // SECURITY FIX: Cluster #6 - Concurrency primitives
  /** Mutex for write operations (state changes, output recording) */
  private writeMutex = new Mutex('context-write');
  /** ReadWriteLock for output access (multiple readers, single writer) */
  private outputLock = new ReadWriteLock('context-output');
  /** Lock timeout in ms */
  private readonly LOCK_TIMEOUT_MS = 5000;

  constructor(init: {
    buildId: string;
    projectId: string;
    tenantId: string;
    tier: BuildContextData['tier'];
    description: string;
    targetUsers?: string;
    techConstraints?: string;
    businessRequirements?: string;
    designPreferences?: string;
    integrations?: string[];
  }) {
    this.data = {
      ...init,
      state: 'created',
      currentPhase: null,
      currentAgent: null,
      iteration: 1,
      agentOutputs: new Map(),
      artifacts: new Map(),
      decisions: [],
      knowledge: {},
      userFeedback: [],
      focusAreas: [],
      startedAt: null,
      completedAt: null,
      tokensUsed: 0,
      estimatedCost: 0,
    };
  }

  /** Get build ID */
  get buildId(): string {
    return this.data.buildId;
  }

  /** Get current state */
  get state(): BuildState {
    return this.data.state;
  }

  /** Get current phase */
  get currentPhase(): BuildPhase | null {
    return this.data.currentPhase;
  }

  /** Get when build started */
  get startedAt(): Date | null {
    return this.data.startedAt;
  }

  /** Get iteration number */
  get iteration(): number {
    return this.data.iteration;
  }

  /** Get accumulated knowledge */
  get knowledge(): BuildKnowledge {
    return this.data.knowledge;
  }

  /** 50X COORDINATION: Get critical decisions for downstream agents */
  get criticalDecisions(): CriticalDecisions | null {
    return this._criticalDecisions;
  }

  getFullContext(): BuildContext {
    return {
      description: this.data.description,
      tier: this.data.tier,
      targetUsers: this.data.targetUsers,
      techConstraints: this.data.techConstraints,
      businessRequirements: this.data.businessRequirements,
      designPreferences: this.data.designPreferences,
      integrations: this.data.integrations,
      existingCodebase: this.data.knowledge.existingCodebase,
      iterationNumber: this.data.iteration,
      feedback: this.data.userFeedback,
      metadata: {
        state: this.data.state,
        currentPhase: this.data.currentPhase,
        currentAgent: this.data.currentAgent,
      },
      outputs: Object.fromEntries(
        Array.from(this.data.agentOutputs.entries()).map(([agentId, output]) => [agentId, output])
      ),
      accumulatedKnowledge: this.data.knowledge as Record<string, unknown>,
    };
  }

  /** Set build state */
  setState(state: BuildState): void {
    this.data.state = state;
    if (state === 'running' && !this.data.startedAt) {
      this.data.startedAt = new Date();
    }
    if (state === 'completed' || state === 'failed') {
      this.data.completedAt = new Date();
    }
    this.emit({
      type: 'state_changed',
      buildId: this.buildId,
      timestamp: new Date(),
      data: { state },
    });
  }

  /**
   * SECURITY FIX: Thread-safe state change
   * Use this when called from parallel contexts
   */
  async setStateSafe(state: BuildState): Promise<void> {
    await this.writeMutex.withLock(async () => {
      this.setState(state);
    }, this.LOCK_TIMEOUT_MS);
  }

  /** Start a phase */
  startPhase(phase: BuildPhase): void {
    this.data.currentPhase = phase;
    this.emit({ type: 'phase_completed', buildId: this.buildId, phase, timestamp: new Date() });
  }

  /** Start an agent */
  startAgent(agentId: AgentId): void {
    this.data.currentAgent = agentId;
    this.emit({ type: 'agent_started', buildId: this.buildId, agentId, timestamp: new Date() });
  }

  /** Record agent output */
  recordOutput(output: AgentOutput): void {
    this.data.agentOutputs.set(output.agentId, output);
    this.data.tokensUsed += output.tokensUsed;

    // Store artifacts
    for (const artifact of output.artifacts) {
      this.data.artifacts.set(artifact.id, artifact);
    }

    // Store decisions
    this.data.decisions.push(...output.decisions);

    // Update knowledge based on agent
    this.updateKnowledge(output);

    // 50X COORDINATION: Update critical decisions
    this.updateCriticalDecisions(output);

    this.data.currentAgent = null;
    this.emit({
      type: 'agent_completed',
      buildId: this.buildId,
      agentId: output.agentId,
      timestamp: new Date(),
    });
  }

  /**
   * SECURITY FIX: Thread-safe output recording
   * Use this when recording from parallel agent executions
   */
  async recordOutputSafe(output: AgentOutput): Promise<void> {
    await this.outputLock.withWriteLock(async () => {
      this.recordOutput(output);
    }, this.LOCK_TIMEOUT_MS);
  }

  /**
   * SECURITY FIX: Thread-safe output reading
   * Use this when reading outputs that may be written concurrently
   */
  async getAgentOutputsSafe(): Promise<Map<AgentId, AgentOutput>> {
    return this.outputLock.withReadLock(async () => {
      return new Map(this.data.agentOutputs);
    }, this.LOCK_TIMEOUT_MS);
  }

  /**
   * SECURITY FIX: Clone context for isolated parallel execution
   * Returns a copy that can be safely modified without affecting main context
   */
  cloneForParallel(): BuildContextData {
    return JSON.parse(
      JSON.stringify({
        ...this.data,
        agentOutputs: Object.fromEntries(this.data.agentOutputs),
        artifacts: Object.fromEntries(this.data.artifacts),
      })
    );
  }

  /**
   * SECURITY FIX: Merge results from parallel execution back into main context
   * Uses write lock to ensure atomic merge
   */
  async mergeParallelResults(
    results: Array<{ agentId: AgentId; output: AgentOutput }>
  ): Promise<void> {
    await this.outputLock.withWriteLock(async () => {
      for (const { output } of results) {
        this.recordOutput(output);
      }
    }, this.LOCK_TIMEOUT_MS);
  }

  /** 50X COORDINATION: Update critical decisions when agent completes */
  private updateCriticalDecisions(output: AgentOutput): void {
    if (!this._criticalDecisions) {
      // Initialize from all current outputs
      this._criticalDecisions = buildCriticalDecisions(this.data.agentOutputs, this.data.tier);
    } else {
      // Update with new output
      this._criticalDecisions = updateCriticalDecisions(
        this._criticalDecisions,
        output.agentId,
        output
      );
    }

    // FIX #1: PERSIST TO DATABASE IMMEDIATELY
    // This ensures decisions survive server restart
    this.persistCriticalDecisions();
  }

  /** 50X COORDINATION: Get critical decisions, initializing if needed */
  getCriticalDecisions(): CriticalDecisions {
    if (!this._criticalDecisions) {
      this._criticalDecisions = buildCriticalDecisions(this.data.agentOutputs, this.data.tier);
    }
    return this._criticalDecisions;
  }

  initializeCriticalDecisions(decisions: Partial<CriticalDecisions>): void {
    this._criticalDecisions = {
      tier: this.data.tier,
      extractedAt: new Date(),
      sources: [],
      architecture: {} as any,
      design: {},
      data: {},
      api: {},
      security: {},
      pages: {},
      rawDecisions: [],
      ...decisions,
    } as CriticalDecisions;
  }

  /**
   * FIX #1: Persist critical decisions to database
   * Called after every update to ensure survival across restarts
   */
  private persistCriticalDecisions(): void {
    if (!this._criticalDecisions) return;

    // Fire and forget - don't block agent execution
    saveCriticalDecisions(this.buildId, this._criticalDecisions).catch(err => {
      console.error(`[MANAGER] Failed to persist critical decisions:`, err);
    });
  }

  /**
   * FIX #1: Restore critical decisions from database
   * Called on build resume after restart
   */
  async restoreCriticalDecisions(): Promise<boolean> {
    try {
      const decisions = await loadCriticalDecisions(this.buildId);
      if (decisions) {
        this._criticalDecisions = decisions;
        console.log(`[MANAGER] ✓ Restored critical decisions from database`);
        console.log(`[MANAGER]   - Sources: ${decisions.sources.join(', ')}`);
        console.log(`[MANAGER]   - Multi-tenant: ${decisions.architecture.isMultiTenant}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`[MANAGER] Failed to restore critical decisions:`, err);
      return false;
    }
  }

  /**
   * FIX #1: Check if critical decisions exist in database
   * Used to determine if build can safely resume
   */
  async hasPersistentDecisions(): Promise<boolean> {
    const decisions = await loadCriticalDecisions(this.buildId);
    return decisions !== null;
  }

  /** Update accumulated knowledge from agent output */
  private updateKnowledge(output: AgentOutput): void {
    const parsed = this.parseAgentArtifacts(output);

    switch (output.agentId) {
      case 'oracle':
        this.data.knowledge.marketAnalysis = parsed.market_analysis
          ? JSON.stringify(parsed.market_analysis).substring(0, 500)
          : undefined;
        break;
      case 'empathy':
        this.data.knowledge.targetPersonas =
          parsed.personas?.map((p: any) => p.name || p.title) || [];
        break;
      case 'strategos':
        // Extract feature names if mvp_features contains objects
        this.data.knowledge.coreFeatures = Array.isArray(parsed.mvp_features)
          ? parsed.mvp_features.map((f: any) =>
              typeof f === 'string' ? f : f.name || f.title || f
            )
          : [];
        this.data.knowledge.constraints = parsed.constraints || [];
        this.data.knowledge.technicalRequirements = parsed.technical_requirements || {};
        this.data.knowledge.roadmap = parsed.roadmap || {};
        this.data.knowledge.successCriteria = parsed.success_criteria || [];
        console.log(
          `[Context] Stored STRATEGOS output: ${this.data.knowledge.coreFeatures?.length || 0} features, ${this.data.knowledge.constraints?.length || 0} constraints`
        );
        break;
      case 'palette':
        this.data.knowledge.colorPalette = parsed.colors;
        this.data.knowledge.typography = parsed.typography;
        break;
      case 'blocks':
        this.data.knowledge.components = parsed.components?.map((c: any) => c.name) || [];
        break;
      case 'cartographer':
        this.data.knowledge.pageStructure = parsed.pages?.reduce(
          (acc: any, p: any) => ({ ...acc, [p.name]: p.sections || [] }),
          {}
        );
        break;
      case 'archon':
        this.data.knowledge.techStack = this.extractTechStack(parsed);
        break;
      case 'datum':
        this.data.knowledge.databaseSchema = this.summarizeSchema(parsed.tables);
        break;
      case 'nexus':
        this.data.knowledge.apiEndpoints =
          parsed.endpoints?.map((e: any) => `${e.method} ${e.path}`) || [];
        break;
      case 'sentinel':
        this.data.knowledge.authStrategy = parsed.auth_config?.strategy || 'session';
        break;
    }

    // Track generated files
    if (parsed.files?.length) {
      this.data.knowledge.generatedFiles = [
        ...(this.data.knowledge.generatedFiles || []),
        ...parsed.files.map((f: any) => f.path),
      ];
    }
  }

  /** Parse agent artifacts to JSON */
  private parseAgentArtifacts(output: AgentOutput): Record<string, any> {
    const docArtifact = output.artifacts.find(a => a.type === 'document' && !a.metadata?.raw);
    if (docArtifact) {
      try {
        return JSON.parse(docArtifact.content);
      } catch {
        return {};
      }
    }
    return {};
  }

  /** Extract tech stack from archon output */
  private extractTechStack(parsed: any): TechStackDecision {
    const ts = parsed.tech_stack || {};
    return {
      framework: ts.framework || ts.frontend?.framework || 'Next.js',
      language: ts.language || 'TypeScript',
      database: ts.database || ts.backend?.database || 'PostgreSQL',
      hosting: ts.hosting || ts.deployment?.platform || 'Vercel',
      styling: ts.styling || ts.frontend?.styling || 'Tailwind CSS',
      auth: ts.auth || ts.backend?.auth || 'Supabase Auth',
      additionalLibraries: ts.libraries || [],
    };
  }

  /** Summarize database schema */
  private summarizeSchema(tables: any[]): string {
    if (!tables?.length) return '';
    return tables
      .map((t: any) => `${t.name}(${t.columns?.map((c: any) => c.name).join(', ') || ''})`)
      .join('; ');
  }

  /** Get context for an agent prompt */
  getAgentContext(agentId: AgentId): BuildContext {
    return {
      description: this.data.description,
      tier: this.data.tier,
      targetUsers: this.data.targetUsers,
      techConstraints: this.data.techConstraints,
      businessRequirements: this.data.businessRequirements,
      designPreferences: this.data.designPreferences,
      integrations: this.data.integrations,
      iterationNumber: this.data.iteration,
      feedback: this.data.userFeedback,
    };
  }

  /** Get previous outputs for dependencies */
  getPreviousOutputs(dependencies: AgentId[]): Record<AgentId, AgentOutput> {
    const outputs: Record<string, AgentOutput> = {};
    for (const depId of dependencies) {
      const output = this.data.agentOutputs.get(depId);
      if (output) outputs[depId] = output;
    }
    return outputs as Record<AgentId, AgentOutput>;
  }

  /** Add user feedback */
  addFeedback(feedback: string, focusAreas?: string[]): void {
    this.data.userFeedback.push(feedback);
    if (focusAreas) this.data.focusAreas = focusAreas;
    this.data.iteration += 1;
    this.emit({
      type: 'feedback_added',
      buildId: this.buildId,
      timestamp: new Date(),
      data: { feedback },
    });
  }

  /** Create snapshot for persistence */
  createSnapshot(): ContextSnapshot {
    this.snapshotVersion += 1;
    const snapshot: ContextSnapshot = {
      buildId: this.buildId,
      version: this.snapshotVersion,
      timestamp: new Date(),
      state: this.data.state,
      currentPhase: this.data.currentPhase,
      currentAgent: this.data.currentAgent,
      iteration: this.data.iteration,
      knowledge: { ...this.data.knowledge },
      agentOutputIds: Array.from(this.data.agentOutputs.keys()),
      tokensUsed: this.data.tokensUsed,
      checksum: '',
    };
    snapshot.checksum = createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex')
      .substring(0, 16);
    return snapshot;
  }

  /** Subscribe to context updates */
  subscribe(listener: (event: ContextUpdateEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: ContextUpdateEvent): void {
    this.listeners.forEach(l => l(event));
  }

  /** Get all artifacts */
  getArtifacts(): Artifact[] {
    return Array.from(this.data.artifacts.values());
  }

  /** Get all decisions */
  getDecisions(): Decision[] {
    return [...this.data.decisions];
  }

  /** Get all agent outputs (for file writing) */
  getAgentOutputs(): Map<AgentId, AgentOutput> {
    return this.data.agentOutputs;
  }

  /** Get metrics */
  getMetrics() {
    return {
      tokensUsed: this.data.tokensUsed,
      estimatedCost: this.data.estimatedCost,
      agentsCompleted: this.data.agentOutputs.size,
      artifactsGenerated: this.data.artifacts.size,
      decisionsRecorded: this.data.decisions.length,
      duration: this.data.startedAt ? Date.now() - this.data.startedAt.getTime() : 0,
    };
  }
}

export type { CriticalDecisions } from '../coordination';

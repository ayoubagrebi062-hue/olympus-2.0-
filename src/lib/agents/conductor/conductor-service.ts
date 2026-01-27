/**
 * CONDUCTOR Service - Meta-orchestrator for OLYMPUS 50X
 *
 * CONDUCTOR wraps (does NOT replace) existing infrastructure:
 * - BuildOrchestrator: Phase/agent execution
 * - BuildContextManager: State management
 * - AgentExecutor: Individual agent runs
 *
 * CONDUCTOR adds:
 * - Project analysis & type detection
 * - Build strategy optimization
 * - Checkpoint/resume capabilities
 * - Enhanced event streaming
 */

import { BuildOrchestrator } from '../orchestrator';
import { BuildContextManager, type CriticalDecisions } from '../context/manager';
import { TokenTracker } from '../providers/tracker';
import type { AgentId, AgentOutput, AgentInput, BuildPhase } from '../types';
import { getAgent } from '../registry';
import { AgentExecutor } from '../executor';
import { conductorRouter } from './router';
import {
  BuildPlanStore,
  getBuildPlanStore,
  type BuildPlan as StoredBuildPlan,
  type AgentPlan,
  type CreatePlanInput,
} from '../orchestrator/build-plan-store';
import {
  BuildStateMachine,
  createStateMachine,
  type BuildState,
  type StateMachineContext,
} from '../orchestrator/state-machine';
import {
  validateTransition,
  canSkipPhase,
  getPhasesForProjectType,
  getPhaseAgents,
  type PhaseId,
  type TransitionContext,
  type TransitionResult,
  PHASE_DEFINITIONS,
} from '../orchestrator/phase-rules';
import { JudgeModule, type JudgeDecision, type JudgeConfig, type QualityMetrics } from './judge';
import {
  MemoryModule,
  createBuildRecord,
  addOutputToRecord,
  addErrorToRecord,
  finalizeBuildRecord,
  type MemoryConfig,
  type BuildRecord,
  type UserFeedback,
  type SimilarBuild,
  type SimilarityQuery,
  type LearnedPattern,
  type PatternMatchContext,
  type MemoryRecommendation,
  type MemoryAnalytics,
  type TenantAnalytics,
  type PatternApplicationResult,
} from './memory';
import {
  CheckpointManager,
  createCheckpointStore,
  getAgentPhase,
  type Checkpoint,
  type CheckpointConfig,
  type CheckpointStats,
  type ResumeOptions,
  type PreparedResume,
  type CanResumeResult,
  type SerializedBuildContext,
  type SerializedAgentOutput,
  type QualityScoreSnapshot,
  type Decision,
  type CheckpointTiming,
  type CheckpointCosts,
  type ICheckpointStore,
} from './checkpoint';
import type { AIRouter } from '../providers/router';
import {
  HandoffRouter,
  createHandoffRouter,
  type RoutingDecision,
  type AgentCapabilities,
  type HandoffExecutionResult,
} from '../handoffs';
import type { HandoffContext } from '@/lib/core';
import type {
  ProjectAnalysis,
  BuildStrategy,
  BuildStrategyConfig,
  BuildCheckpoint,
  CheckpointContext,
  ConductorConfig,
  ConductorBuildRequest,
  ConductorBuildOptions,
  ConductorBuildResult,
  ConductorResumeRequest,
  ConductorPreviewResult,
  ConductorEvent,
  ExtendedOrchestrationEvent,
  AlternativePlan,
} from './types';
import type {
  BuildPlan,
  BuildProgress,
  OrchestrationEvent,
  OrchestrationOptions,
} from '../orchestrator/types';
import { logger } from '@/utils/logger';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: ConductorConfig = {
  enableAnalysis: true,
  enableCheckpoints: true,
  defaultStrategy: 'adaptive',
  fallbackToOrchestrator: true,
  analyticsEnabled: true,
  maxConcurrentBuilds: 5,
  judgeConfig: {
    enabled: true,
    strictMode: false,
    autoRetry: true,
    thresholds: new Map(),
    scoringModel: 'sonnet',
  },
  memoryConfig: {
    enabled: true,
    buildHistoryLimit: 100,
    patternRetentionDays: 90,
    minSamplesForPattern: 5,
    patternConfidenceThreshold: 0.7,
    learningEnabled: true,
    vectorSearchEnabled: true,
    similarityThreshold: 0.75,
    maxSimilarResults: 10,
    preferenceLearningEnabled: true,
    preferenceDecayDays: 30,
  },
  checkpointConfig: {
    enabled: true,
    autoCheckpoint: true,
    checkpointInterval: 1, // Checkpoint after every agent
    compressionThreshold: 10 * 1024, // 10KB
    defaultExpirationDays: 7,
    maxCheckpointsPerBuild: 50,
    cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  },
};

const STRATEGY_CONFIGS: Record<BuildStrategy, Partial<BuildStrategyConfig>> = {
  sequential: {
    maxParallelAgents: 1,
    checkpointFrequency: 'agent',
  },
  'parallel-phases': {
    maxParallelAgents: 3,
    checkpointFrequency: 'phase',
  },
  adaptive: {
    maxParallelAgents: 2,
    checkpointFrequency: 'milestone',
  },
  'fast-track': {
    maxParallelAgents: 4,
    checkpointFrequency: 'phase',
  },
};

// ============================================================================
// CONDUCTOR SERVICE CLASS
// ============================================================================

export class ConductorService {
  private config: ConductorConfig;
  private activeBuilds: Map<string, ConductorBuildState> = new Map();
  private checkpoints: Map<string, BuildCheckpoint[]> = new Map();
  private eventListeners: Map<string, Set<(event: ExtendedOrchestrationEvent) => void>> = new Map();
  private judgeModule: JudgeModule;
  private memoryModule: MemoryModule;
  private checkpointManager: CheckpointManager;
  private checkpointStore: ICheckpointStore;
  private aiRouter: AIRouter | null = null;
  private handoffRouter: HandoffRouter;

  constructor(config: Partial<ConductorConfig> = {}, aiRouter?: AIRouter) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiRouter = aiRouter || null;
    this.judgeModule = new JudgeModule(this.aiRouter || undefined, this.config.judgeConfig);
    this.memoryModule = new MemoryModule(this.config.memoryConfig);

    // Initialize CHECKPOINT system
    this.checkpointStore = createCheckpointStore({
      type: process.env.SUPABASE_URL ? 'supabase' : 'memory',
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_KEY,
      compressionThreshold: this.config.checkpointConfig?.compressionThreshold,
      defaultExpirationDays: this.config.checkpointConfig?.defaultExpirationDays,
    });
    this.checkpointManager = new CheckpointManager(
      this.checkpointStore,
      this.config.checkpointConfig
    );

    // Subscribe to checkpoint events
    this.checkpointManager.onEvent(event => {
      logger.debug(`[Checkpoint] ${event.type}:`, event.data);
      // Forward checkpoint events as conductor events
      if ('checkpoint' in event.data && event.data.checkpoint) {
        const cp = event.data.checkpoint as Checkpoint;
        this.emitConductorEvent(
          `conductor:${event.type.replace('checkpoint:', '')}` as any,
          cp.buildId,
          event.data
        );
      }
    });

    // Subscribe to memory events for logging/metrics
    this.memoryModule.onEvent(event => {
      logger.debug(`[Memory] ${event.type}:`, event.data);
    });

    // Initialize HANDOFF router for agent routing
    this.handoffRouter = createHandoffRouter({
      defaultConfidenceThreshold: 0.7,
      maxChainDepth: 5,
      useLLMRouting: true,
      fallbackToRules: true,
    });

    // Register default agents for handoff routing
    this.registerDefaultAgents();
  }

  /**
   * Register default agent capabilities for handoff routing.
   */
  private registerDefaultAgents(): void {
    const defaultAgents: AgentCapabilities[] = [
      {
        agentId: 'frontend-agent' as any,
        name: 'Frontend Agent',
        description:
          'Handles UI/UX tasks including React components, styling, and responsive design',
        capabilities: ['react', 'vue', 'css', 'tailwind', 'ui', 'ux', 'component', 'styling'],
        triggerKeywords: [
          'button',
          'form',
          'modal',
          'dropdown',
          'animation',
          'responsive',
          'layout',
        ],
        priority: 1,
        available: true,
        maxConcurrent: 5,
        currentLoad: 0,
      },
      {
        agentId: 'backend-agent' as any,
        name: 'Backend Agent',
        description: 'Handles server-side logic, APIs, and database operations',
        capabilities: ['api', 'database', 'server', 'endpoint', 'rest', 'graphql', 'auth'],
        triggerKeywords: ['crud', 'query', 'mutation', 'middleware', 'controller', 'service'],
        priority: 1,
        available: true,
        maxConcurrent: 5,
        currentLoad: 0,
      },
      {
        agentId: 'testing-agent' as any,
        name: 'Testing Agent',
        description: 'Handles unit tests, integration tests, and E2E testing',
        capabilities: ['test', 'spec', 'jest', 'vitest', 'cypress', 'playwright', 'e2e', 'unit'],
        triggerKeywords: ['mock', 'stub', 'fixture', 'coverage', 'assertion'],
        priority: 2,
        available: true,
        maxConcurrent: 3,
        currentLoad: 0,
      },
      {
        agentId: 'security-agent' as any,
        name: 'Security Agent',
        description: 'Handles security analysis, authentication, and authorization',
        capabilities: [
          'security',
          'vulnerability',
          'xss',
          'csrf',
          'injection',
          'auth',
          'encryption',
        ],
        triggerKeywords: ['sanitize', 'validate', 'token', 'jwt', 'oauth', 'permissions'],
        priority: 1,
        available: true,
        maxConcurrent: 2,
        currentLoad: 0,
      },
      {
        agentId: 'devops-agent' as any,
        name: 'DevOps Agent',
        description: 'Handles deployment, CI/CD, and infrastructure',
        capabilities: ['deploy', 'docker', 'kubernetes', 'ci/cd', 'pipeline', 'infrastructure'],
        triggerKeywords: ['nginx', 'aws', 'azure', 'gcp', 'terraform', 'ansible'],
        priority: 2,
        available: true,
        maxConcurrent: 2,
        currentLoad: 0,
      },
    ];

    for (const agent of defaultAgents) {
      this.handoffRouter.registerAgent(agent);
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Analyze a project without starting a build
   */
  async analyzeProject(description: string): Promise<ProjectAnalysis> {
    return conductorRouter.analyzeProject(description);
  }

  /**
   * Preview what a build would look like
   */
  async previewBuild(request: ConductorBuildRequest): Promise<ConductorPreviewResult> {
    const analysis = await this.analyzeProject(request.description);

    // Generate plan without executing
    const plan = await this.generateBuildPlan(analysis, request);

    // Calculate estimates
    const estimatedDuration = this.estimateDuration(analysis, plan);

    // Generate alternatives
    const alternatives = this.generateAlternatives(analysis);

    return {
      analysis,
      suggestedPlan: plan,
      estimatedCost: analysis.estimatedCost,
      estimatedDuration,
      warnings: analysis.warnings,
      alternatives,
    };
  }

  /**
   * Start a new CONDUCTOR-managed build
   */
  async startBuild(request: ConductorBuildRequest): Promise<ConductorBuildResult> {
    // Validate concurrent build limit
    if (this.activeBuilds.size >= this.config.maxConcurrentBuilds) {
      throw new Error(`Maximum concurrent builds (${this.config.maxConcurrentBuilds}) reached`);
    }

    // Step 1: Analyze project
    this.emitConductorEvent('conductor:analysis_started', 'pending', {
      description: request.description.substring(0, 100),
    });

    const analysis = this.config.enableAnalysis
      ? await this.analyzeProject(request.description)
      : this.getDefaultAnalysis();

    this.emitConductorEvent('conductor:analysis_completed', 'pending', {
      type: analysis.type,
      complexity: analysis.complexity,
      confidence: analysis.confidence,
    });

    // Step 2: Generate build plan
    const plan = await this.generateBuildPlan(analysis, request);

    // Step 3: Select strategy
    const strategy = this.selectStrategy(analysis, request.options);

    this.emitConductorEvent('conductor:strategy_selected', plan.buildId, {
      strategy: strategy.strategy,
      maxParallelAgents: strategy.maxParallelAgents,
    });

    // Step 4: Initialize build state
    const buildState: ConductorBuildState = {
      buildId: plan.buildId,
      request,
      analysis,
      plan,
      strategy,
      status: 'initialized',
      startedAt: new Date(),
      orchestrator: null,
      contextManager: null,
      tokenTracker: null,
    };

    this.activeBuilds.set(plan.buildId, buildState);

    // Step 5: Start execution ASYNCHRONOUSLY (don't block the response)
    // The build runs in the background, status tracked via events
    this.executeBuild(buildState).catch(error => {
      logger.error(`[CONDUCTOR] Build ${plan.buildId} execution failed:`, error);
      buildState.status = 'failed';
      this.emitConductorEvent('conductor:build_failed', plan.buildId, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return {
      buildId: plan.buildId,
      analysis,
      plan,
      strategy,
      estimatedDuration: this.estimateDuration(analysis, plan),
    };
  }

  /**
   * Resume a build from checkpoint
   */
  async resumeBuild(request: ConductorResumeRequest): Promise<ConductorBuildResult> {
    const { buildId, checkpointId } = request;

    // Get checkpoint
    const checkpoint = this.getCheckpoint(buildId, checkpointId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for build ${buildId}`);
    }

    this.emitConductorEvent('conductor:checkpoint_restored', buildId, {
      checkpointId: checkpoint.id,
      phase: checkpoint.phase,
      agentIndex: checkpoint.agentIndex,
    });

    // Restore build state
    const buildState = await this.restoreFromCheckpoint(checkpoint, request);
    this.activeBuilds.set(buildId, buildState);

    // Resume execution
    await this.executeBuild(buildState);

    return {
      buildId,
      analysis: buildState.analysis,
      plan: buildState.plan,
      strategy: buildState.strategy,
      estimatedDuration: this.estimateDuration(buildState.analysis, buildState.plan),
    };
  }

  /**
   * Get current build progress
   */
  async getProgress(buildId: string): Promise<BuildProgress | null> {
    const buildState = this.activeBuilds.get(buildId);
    if (!buildState?.orchestrator) {
      return null;
    }

    return buildState.orchestrator.getProgress();
  }

  /**
   * Pause a running build
   */
  async pauseBuild(buildId: string): Promise<void> {
    const buildState = this.activeBuilds.get(buildId);
    if (!buildState?.orchestrator) {
      throw new Error(`Build ${buildId} not found or not running`);
    }

    // Create checkpoint before pausing
    if (this.config.enableCheckpoints) {
      await this.createCheckpoint(buildState, 'manual_pause');
    }

    await buildState.orchestrator.pause();
    buildState.status = 'paused';
  }

  /**
   * Cancel a running build
   */
  async cancelBuild(buildId: string): Promise<void> {
    const buildState = this.activeBuilds.get(buildId);
    if (!buildState?.orchestrator) {
      throw new Error(`Build ${buildId} not found or not running`);
    }

    // Create final checkpoint
    if (this.config.enableCheckpoints) {
      await this.createCheckpoint(buildState, 'canceled');
    }

    await buildState.orchestrator.cancel();
    buildState.status = 'canceled';
    this.activeBuilds.delete(buildId);
  }

  /**
   * Subscribe to build events
   */
  subscribe(buildId: string, listener: (event: ExtendedOrchestrationEvent) => void): () => void {
    if (!this.eventListeners.has(buildId)) {
      this.eventListeners.set(buildId, new Set());
    }

    this.eventListeners.get(buildId)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(buildId)?.delete(listener);
    };
  }

  /**
   * Get all checkpoints for a build
   */
  getCheckpoints(buildId: string): BuildCheckpoint[] {
    return this.checkpoints.get(buildId) || [];
  }

  // ==========================================================================
  // MEMORY API
  // ==========================================================================

  /**
   * Find similar builds for a given description
   */
  async findSimilarBuilds(query: SimilarityQuery): Promise<SimilarBuild[]> {
    if (!this.config.memoryConfig?.enabled) {
      return [];
    }
    return this.memoryModule.findSimilarBuilds(query);
  }

  /**
   * Get recommendations for a new build based on memory
   */
  async getMemoryRecommendations(
    tenantId: string,
    description: string,
    projectType: ProjectAnalysis['type'],
    complexity: ProjectAnalysis['complexity']
  ): Promise<MemoryRecommendation[]> {
    if (!this.config.memoryConfig?.enabled) {
      return [];
    }
    return this.memoryModule.generateRecommendations(
      tenantId,
      description,
      projectType,
      complexity
    );
  }

  /**
   * Get applicable patterns for a build context
   */
  async getApplicablePatterns(context: PatternMatchContext): Promise<LearnedPattern[]> {
    if (!this.config.memoryConfig?.enabled) {
      return [];
    }
    return this.memoryModule.getApplicablePatterns(context);
  }

  /**
   * Apply learned patterns to optimize build
   */
  async applyLearnedPatterns(context: PatternMatchContext): Promise<PatternApplicationResult> {
    if (!this.config.memoryConfig?.enabled) {
      return { applied: false, patterns: [], changes: {}, messages: [] };
    }
    return this.memoryModule.applyPatterns(context);
  }

  /**
   * Add user feedback for a build
   */
  async addBuildFeedback(buildId: string, feedback: UserFeedback): Promise<void> {
    if (!this.config.memoryConfig?.enabled) {
      return;
    }
    await this.memoryModule.addFeedback(buildId, feedback);
  }

  /**
   * Get tenant's build history
   */
  async getTenantBuildHistory(tenantId: string, limit: number = 20): Promise<BuildRecord[]> {
    if (!this.config.memoryConfig?.enabled) {
      return [];
    }
    return this.memoryModule.getTenantBuilds(tenantId, limit);
  }

  /**
   * Get memory analytics
   */
  async getMemoryAnalytics(): Promise<MemoryAnalytics> {
    return this.memoryModule.getAnalytics();
  }

  /**
   * Get tenant-specific analytics
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    return this.memoryModule.getTenantAnalytics(tenantId);
  }

  /**
   * Check if user prefers quality over speed
   */
  async userPrefersQuality(tenantId: string): Promise<boolean> {
    if (!this.config.memoryConfig?.enabled) {
      return false;
    }
    return this.memoryModule.prefersQuality(tenantId);
  }

  /**
   * Check if user is budget sensitive
   */
  async userIsBudgetSensitive(tenantId: string): Promise<boolean> {
    if (!this.config.memoryConfig?.enabled) {
      return false;
    }
    return this.memoryModule.isBudgetSensitive(tenantId);
  }

  /**
   * Get the memory module for direct access
   */
  getMemoryModule(): MemoryModule {
    return this.memoryModule;
  }

  // ==========================================================================
  // CHECKPOINT API (New Robust Implementation)
  // ==========================================================================

  /**
   * Check if a build can be resumed from checkpoint
   */
  async canResumeBuild(buildId: string): Promise<CanResumeResult> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      return { canResume: false, reason: 'Checkpoint system is disabled' };
    }
    return this.checkpointManager.canResume(buildId);
  }

  /**
   * Resume a build from the latest checkpoint using new CHECKPOINT system
   */
  async resumeBuildFromCheckpoint(
    buildId: string,
    _tenantId: string,
    options: ResumeOptions = {}
  ): Promise<PreparedResume> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      throw new Error('Checkpoint system is disabled');
    }

    // Prepare resume context
    const prepared = await this.checkpointManager.prepareResume(buildId, options);

    this.emitConductorEvent('conductor:checkpoint_resume_prepared', buildId, {
      checkpointId: prepared.checkpoint.id,
      skipAgents: prepared.skipAgents,
      startFromAgent: prepared.startFromAgent,
      remainingAgents: prepared.remainingAgents.length,
    });

    return prepared;
  }

  /**
   * List all checkpoints for a build (new system)
   */
  async listBuildCheckpoints(buildId: string): Promise<Checkpoint[]> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      return [];
    }
    return this.checkpointManager.listCheckpoints({ buildId });
  }

  /**
   * Get checkpoint statistics for a build
   */
  async getCheckpointStats(buildId: string): Promise<CheckpointStats> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      return {
        checkpointCount: 0,
        totalSizeBytes: 0,
        oldestCheckpoint: null,
        latestCheckpoint: null,
        completionPercent: 0,
        averageSizeBytes: 0,
        compressedCount: 0,
      };
    }
    return this.checkpointManager.getStats(buildId);
  }

  /**
   * Manually trigger checkpoint cleanup
   */
  async cleanupCheckpoints(): Promise<number> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      return 0;
    }
    return this.checkpointManager.cleanup();
  }

  /**
   * Delete all checkpoints for a build
   */
  async deleteCheckpointsForBuild(buildId: string): Promise<void> {
    if (!this.config.enableCheckpoints || !this.config.checkpointConfig?.enabled) {
      return;
    }
    await this.checkpointManager.deleteCheckpointsForBuild(buildId);
  }

  /**
   * Get the checkpoint manager for direct access
   */
  getCheckpointManager(): CheckpointManager {
    return this.checkpointManager;
  }

  // ==========================================================================
  // PHASE 3: BUILD PLAN & STATE MACHINE API
  // ==========================================================================

  /**
   * Start a build with full state machine control
   */
  async startBuildWithStateMachine(request: ConductorBuildRequest): Promise<ConductorBuildResult> {
    // Validate concurrent build limit
    if (this.activeBuilds.size >= this.config.maxConcurrentBuilds) {
      throw new Error(`Maximum concurrent builds (${this.config.maxConcurrentBuilds}) reached`);
    }

    // Step 1: Analyze project
    this.emitConductorEvent('conductor:analysis_started', 'pending', {
      description: request.description.substring(0, 100),
    });

    const analysis = this.config.enableAnalysis
      ? await this.analyzeProject(request.description)
      : this.getDefaultAnalysis();

    this.emitConductorEvent('conductor:analysis_completed', 'pending', {
      type: analysis.type,
      complexity: analysis.complexity,
      confidence: analysis.confidence,
    });

    // Step 2: Create stored build plan with phase structure
    const buildId = this.generateBuildId();
    const storedPlan = await this.createStoredBuildPlan(buildId, analysis, request);

    // Step 3: Initialize state machine
    const planStore = getBuildPlanStore();
    const stateMachine = createStateMachine(planStore);
    await stateMachine.initialize(buildId, storedPlan);

    // Step 4: Setup state machine event forwarding
    this.setupStateMachineEvents(stateMachine, buildId);

    // Step 5: Start the state machine
    await stateMachine.trigger('start');
    await stateMachine.trigger('plan_complete');

    // Step 6: Generate legacy plan for compatibility
    const legacyPlan = await this.generateBuildPlan(analysis, request);

    // Step 7: Select strategy
    const strategy = this.selectStrategy(analysis, request.options);

    this.emitConductorEvent('conductor:strategy_selected', buildId, {
      strategy: strategy.strategy,
      maxParallelAgents: strategy.maxParallelAgents,
    });

    // Step 8: Initialize build state with state machine reference
    const buildState: ConductorBuildState = {
      buildId,
      request,
      analysis,
      plan: legacyPlan,
      strategy,
      status: 'initialized',
      startedAt: new Date(),
      orchestrator: null,
      contextManager: null,
      tokenTracker: null,
      stateMachine,
      storedPlan,
    };

    this.activeBuilds.set(buildId, buildState);

    // Step 9: Execute with phase control
    this.executeWithPhaseControl(buildState).catch(e =>
      logger.error('[CONDUCTOR] Phase control failed:', e)
    );

    return {
      buildId,
      analysis,
      plan: legacyPlan,
      strategy,
      estimatedDuration: this.estimateDuration(analysis, legacyPlan),
    };
  }

  /**
   * Execute build with phase transition validation
   */
  private async executeWithPhaseControl(buildState: ConductorBuildState): Promise<void> {
    const { buildId, request, storedPlan, stateMachine } = buildState;

    if (!storedPlan || !stateMachine) {
      throw new Error('Build state missing stored plan or state machine');
    }

    const planStore = getBuildPlanStore();
    let currentPhase: PhaseId | null = null;

    // Initialize infrastructure
    buildState.tokenTracker = new TokenTracker(buildId);
    const contextTier = this.mapConductorTierToBuildTier(
      request.tier || buildState.analysis.suggestedTier
    );
    buildState.contextManager = new BuildContextManager({
      buildId,
      projectId: buildId,
      tenantId: request.tenantId,
      tier: contextTier,
      description: request.description,
    });

    buildState.contextManager.initializeCriticalDecisions({
      projectType: buildState.analysis.type,
      primaryFramework: buildState.analysis.techStack.framework,
      stylingApproach: buildState.analysis.techStack.styling,
      stateManagement: 'React Context',
      routingStrategy: 'App Router',
      componentLibrary: 'Custom + Shadcn',
    });

    buildState.status = 'running';

    try {
      // Iterate through phases
      for (const phase of storedPlan.phases) {
        const phaseId = phase.id as PhaseId;

        // Check if phase can be skipped
        if (canSkipPhase(phaseId, storedPlan.projectType)) {
          this.emitConductorEvent('conductor:phase_skipped', buildId, {
            phase: phaseId,
            reason: 'Not required for project type',
          });

          await planStore.updatePhaseStatus(storedPlan.id, phaseId, 'skipped');
          continue;
        }

        // Validate phase transition
        if (currentPhase !== null) {
          const result = await stateMachine.transitionPhase(phaseId);

          if (!result.valid) {
            this.emitConductorEvent('conductor:phase_blocked', buildId, {
              from: currentPhase,
              to: phaseId,
              errors: result.errors,
            });

            // Check if we can skip
            if (canSkipPhase(phaseId, storedPlan.projectType)) {
              await stateMachine.skipPhase(phaseId);
              continue;
            }

            throw new Error(`Phase transition blocked: ${result.errors.join(', ')}`);
          }

          // Log warnings if any
          if (result.warnings.length > 0) {
            this.emitConductorEvent('conductor:phase_warning', buildId, {
              phase: phaseId,
              warnings: result.warnings,
            });
          }
        }

        currentPhase = phaseId;

        // Mark phase as running
        await planStore.updatePhaseStatus(storedPlan.id, phaseId, 'running');

        this.emitConductorEvent('conductor:phase_started', buildId, {
          phase: phaseId,
          agents: phase.agents,
        });

        // Execute agents in this phase
        const phaseAgents = await planStore.getAgentsByPhase(storedPlan.id, phaseId);

        for (const agentPlan of phaseAgents) {
          // Check dependencies
          const depsComplete = await this.checkAgentDependencies(storedPlan.id, agentPlan);

          if (!depsComplete) {
            this.emitConductorEvent('conductor:dependency_wait', buildId, {
              agentId: agentPlan.agentId,
              dependencies: agentPlan.dependencies,
            });
            continue; // Will be picked up by next agent sweep
          }

          // Execute agent
          try {
            await planStore.updateAgentStatus(storedPlan.id, agentPlan.agentId, 'running');

            this.emitConductorEvent('conductor:agent_started', buildId, {
              agentId: agentPlan.agentId,
              phase: phaseId,
            });

            // Execute agent (placeholder - would call actual agent executor)
            const output = await this.executeAgent(buildState, agentPlan.agentId, phaseId);

            await planStore.updateAgentStatus(storedPlan.id, agentPlan.agentId, 'completed', {
              output,
            });

            await stateMachine.trigger('agent_complete', {
              agentId: agentPlan.agentId,
              output,
            });

            this.emitConductorEvent('conductor:agent_completed', buildId, {
              agentId: agentPlan.agentId,
              phase: phaseId,
            });
          } catch (error) {
            // Handle agent failure
            const canRetry = await planStore.canAgentRetry(storedPlan.id, agentPlan.agentId);

            if (canRetry) {
              await planStore.incrementRetryCount(storedPlan.id, agentPlan.agentId);
              await stateMachine.trigger('agent_retry', {
                agentId: agentPlan.agentId,
                error: error instanceof Error ? error.message : String(error),
              });

              // Re-queue agent for retry
              await planStore.updateAgentStatus(storedPlan.id, agentPlan.agentId, 'pending');
            } else {
              await planStore.updateAgentStatus(storedPlan.id, agentPlan.agentId, 'failed', {
                error: error instanceof Error ? error.message : String(error),
              });

              if (agentPlan.required) {
                await stateMachine.trigger('critical_failure', {
                  agentId: agentPlan.agentId,
                  error: error instanceof Error ? error.message : String(error),
                });
                throw error;
              }
            }
          }
        }

        // Mark phase complete
        const phaseComplete = await planStore.isPhaseComplete(storedPlan.id, phaseId);
        if (phaseComplete) {
          await planStore.updatePhaseStatus(storedPlan.id, phaseId, 'completed');

          this.emitConductorEvent('conductor:phase_completed', buildId, {
            phase: phaseId,
          });
        }
      }

      // Complete build
      await stateMachine.trigger('all_agents_complete');
      await planStore.updateStatus(storedPlan.id, 'completed');
      buildState.status = 'completed';

      this.emitConductorEvent('conductor:build_completed', buildId, {
        duration: Date.now() - buildState.startedAt.getTime(),
      });
    } catch (error) {
      buildState.status = 'failed';
      await planStore.updateStatus(storedPlan.id, 'failed');

      const newLocal = 'conductor:build_failed';
      this.emitConductorEvent(newLocal, buildId, {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      this.activeBuilds.delete(buildId);
    }
  }

  /**
   * Create a stored build plan with proper phase structure
   */
  private async createStoredBuildPlan(
    buildId: string,
    analysis: ProjectAnalysis,
    request: ConductorBuildRequest
  ): Promise<StoredBuildPlan> {
    const planStore = getBuildPlanStore();

    // Get phases for this project type
    const phaseIds = getPhasesForProjectType(analysis.type);

    // Build phases array
    const phases = phaseIds.map((phaseId, index) => ({
      id: phaseId,
      name: PHASE_DEFINITIONS[phaseId].name,
      order: index,
      agents: PHASE_DEFINITIONS[phaseId].agents,
    }));

    // Build agents array with dependencies
    const agents: CreatePlanInput['agents'] = [];
    let agentOrder = 0;

    for (const phase of phases) {
      const phaseAgents = phase.agents;
      const previousPhaseAgents = agentOrder > 0 ? phases[phases.indexOf(phase) - 1]?.agents : [];

      for (const agentId of phaseAgents) {
        agents.push({
          agentId,
          phase: phase.id,
          order: agentOrder++,
          required: this.isRequiredAgent(agentId),
          dependencies: this.getAgentDependencies(agentId, previousPhaseAgents),
          maxRetries: 3,
        });
      }
    }

    return planStore.create({
      buildId,
      projectType: analysis.type,
      phases,
      agents,
      metadata: {
        tenantId: request.tenantId,
        description: request.description.substring(0, 500),
        tier: request.tier || analysis.suggestedTier,
        complexity: analysis.complexity,
      },
    });
  }

  /**
   * Check if agent dependencies are met
   */
  private async checkAgentDependencies(planId: string, agent: AgentPlan): Promise<boolean> {
    if (agent.dependencies.length === 0) return true;

    const planStore = getBuildPlanStore();

    for (const dep of agent.dependencies) {
      const depAgent = await planStore.getAgent(planId, dep);
      if (!depAgent || depAgent.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single agent using the real AgentExecutor
   *
   * FIX: Previously returned mock data. Now connects to actual execution pipeline.
   * @see AgentExecutor in ../executor/executor.ts
   */
  private async executeAgent(
    buildState: ConductorBuildState,
    agentId: string,
    phase: string
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    try {
      // Create token tracker if not exists (constructor: buildId, maxTokens)
      const tokenTracker =
        buildState.tokenTracker ||
        new TokenTracker(
          buildState.buildId,
          1000000 // 1M token budget
        );

      // Create executor with token tracking
      const executor = new AgentExecutor(agentId as AgentId, tokenTracker);

      // Map conductor tier to BuildContext tier
      const tierMapping: Record<string, 'starter' | 'professional' | 'ultimate' | 'enterprise'> = {
        basic: 'starter',
        standard: 'professional',
        premium: 'ultimate',
        enterprise: 'enterprise',
      };
      const contextTier = tierMapping[buildState.request.tier || 'standard'] || 'professional';

      // Get previous outputs from context manager
      const fullContext = buildState.contextManager?.getFullContext();
      const previousOutputs = {} as Record<AgentId, AgentOutput>;
      if (fullContext?.outputs) {
        for (const [id, output] of Object.entries(fullContext.outputs)) {
          if (output && typeof output === 'object') {
            previousOutputs[id as AgentId] = output as AgentOutput;
          }
        }
      }

      // FIX: Get agent definition to log dependencies
      const agentDef = getAgent(agentId as AgentId);
      const agentDependencies = agentDef?.dependencies || [];
      console.log(`[Conductor] ${agentId} receiving outputs from dependencies:`, agentDependencies);
      console.log(`[Conductor] ${agentId} available outputs:`, Object.keys(previousOutputs));

      // Log if any expected dependencies are missing
      const missingDeps = agentDependencies.filter((dep: AgentId) => !previousOutputs[dep]);
      if (missingDeps.length > 0) {
        console.warn(`[Conductor] ${agentId} missing dependency outputs:`, missingDeps);
      }

      // Build agent input from build state
      const agentInput: AgentInput = {
        buildId: buildState.buildId,
        projectId: buildState.buildId, // Use buildId as projectId
        tenantId: buildState.request.tenantId || 'default',
        phase: phase as BuildPhase,
        context: {
          description: buildState.request.description,
          tier: contextTier,
          iterationNumber: 1,
          metadata: {
            projectType: buildState.analysis?.type || 'full-stack',
            analysis: buildState.analysis,
            plan: buildState.plan,
          },
        },
        previousOutputs,
      };

      // Emit agent started event (valid ConductorEventType)
      this.emitConductorEvent('conductor:agent_started', buildState.buildId, {
        agentId,
        phase,
        timestamp: new Date().toISOString(),
      });

      const result = await executor.execute(agentInput, {
        useExamples: true,
        validateOutput: true,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.output) {
        // Store output in context manager using recordOutput
        if (buildState.contextManager && result.output) {
          buildState.contextManager.recordOutput(result.output);
        }

        this.emitConductorEvent('conductor:agent_completed', buildState.buildId, {
          agentId,
          phase,
          duration,
          tokensUsed: tokenTracker.getTotalTokens(),
        });

        // 10X HANDOFF CHECK: Evaluate if work should be handed off to another agent
        const handoffDecision = await this.evaluateHandoff(
          buildState,
          agentId,
          result.output,
          agentInput
        );

        if (handoffDecision.shouldHandoff && handoffDecision.targetAgent) {
          this.emitConductorEvent('conductor:handoff_triggered', buildState.buildId, {
            fromAgent: agentId,
            toAgent: handoffDecision.targetAgent,
            confidence: handoffDecision.confidence,
            reason: handoffDecision.reasoning,
          });
        }

        return {
          agentId,
          phase,
          completedAt: new Date().toISOString(),
          status: 'success',
          output: result.output,
          retries: result.retries,
          duration,
          handoff: handoffDecision.shouldHandoff
            ? {
                targetAgent: handoffDecision.targetAgent,
                confidence: handoffDecision.confidence,
                reason: handoffDecision.reasoning,
              }
            : undefined,
        };
      } else {
        // Execution failed
        throw new Error(result.error?.message || 'Agent execution failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      // Use conductor:build_failed for error cases (valid event type)
      this.emitConductorEvent('conductor:build_failed', buildState.buildId, {
        agentId,
        phase,
        error: errorMessage,
        duration,
      });

      // Return failure result instead of throwing
      return {
        agentId,
        phase,
        completedAt: new Date().toISOString(),
        status: 'failed',
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Setup state machine event forwarding
   */
  private setupStateMachineEvents(machine: BuildStateMachine, buildId: string): void {
    machine.on('transition', data => {
      this.emitConductorEvent('conductor:state_transition', buildId, data);
    });

    machine.on('phase_transition', data => {
      this.emitConductorEvent('conductor:phase_transition', buildId, data);
    });

    machine.on('phase_transition_blocked', data => {
      this.emitConductorEvent('conductor:phase_transition_blocked', buildId, data);
    });

    machine.on('agent_started', data => {
      this.emitConductorEvent('conductor:agent_started', buildId, data);
    });

    machine.on('approval_required', data => {
      this.emitConductorEvent('conductor:approval_required', buildId, data);
    });

    machine.on('stateEvent', event => {
      // Forward all state events
      this.emitConductorEvent(`conductor:${event.type}` as any, buildId, event);
    });
  }

  /**
   * Check if an agent is required for build success
   */
  private isRequiredAgent(agentId: string): boolean {
    const criticalAgents = ['oracle', 'strategos', 'archon', 'datum', 'pixel', 'wire', 'engine'];
    return criticalAgents.includes(agentId);
  }

  /**
   * FIX #1: Get list of critical agents that failed during build
   * Used to determine if build should be marked as 'failed' despite continueOnError=true
   */
  private getFailedCriticalAgents(buildState: ConductorBuildState): string[] {
    const failedAgents = buildState.orchestrator?.getFailedAgents() || [];
    return failedAgents.filter((agentId: string) => this.isRequiredAgent(agentId));
  }

  /**
   * Get agent dependencies
   */
  private getAgentDependencies(agentId: string, _previousPhaseAgents: string[]): string[] {
    // Define explicit dependencies
    const dependencyMap: Record<string, string[]> = {
      strategos: ['oracle', 'empathy'],
      archon: ['strategos'],
      datum: ['archon'],
      shield: ['datum'],
      pixel: ['blocks', 'archon'],
      wire: ['pixel'],
      react: ['wire'],
      state: ['react'],
      engine: ['datum', 'archon'],
      api: ['engine'],
      cache: ['api'],
      queue: ['api'],
      bridge: ['wire', 'engine'],
      sync: ['bridge'],
      notify: ['sync'],
      search: ['engine'],
      junit: ['wire', 'engine'],
      cypress: ['wire'],
      infra: ['junit'],
      cicd: ['infra'],
    };

    return dependencyMap[agentId] || [];
  }

  /**
   * Validate a phase transition without executing it
   */
  async validatePhaseTransition(buildId: string, toPhase: PhaseId): Promise<TransitionResult> {
    const buildState = this.activeBuilds.get(buildId);
    if (!buildState?.storedPlan) {
      return {
        valid: false,
        errors: ['Build not found or not using state machine'],
        warnings: [],
      };
    }

    const planStore = getBuildPlanStore();
    const plan = await planStore.getByBuildId(buildId);

    if (!plan) {
      return {
        valid: false,
        errors: ['Build plan not found'],
        warnings: [],
      };
    }

    const context: TransitionContext = {
      buildId,
      projectType: plan.projectType,
      fromPhase: (plan.currentPhase as PhaseId) || null,
      toPhase,
      completedAgents: plan.agents.filter(a => a.status === 'completed').map(a => a.agentId),
      agentOutputs: new Map(
        plan.agents.filter(a => a.output).map(a => [a.agentId, a.output as Record<string, unknown>])
      ),
      qualityScores: new Map(),
      errors: new Map(plan.agents.filter(a => a.error).map(a => [a.agentId, a.error as string])),
    };

    return validateTransition(context);
  }

  /**
   * Get build plan progress with state machine info
   */
  async getBuildPlanProgress(buildId: string): Promise<{
    state: BuildState;
    progress: {
      totalAgents: number;
      completedAgents: number;
      failedAgents: number;
      pendingAgents: number;
      progressPercent: number;
      currentPhase: string | null;
      currentAgent: string | null;
    };
    phases: Array<{
      id: string;
      name: string;
      status: string;
      agentCount: number;
      completedCount: number;
    }>;
  } | null> {
    const buildState = this.activeBuilds.get(buildId);

    if (!buildState?.stateMachine || !buildState?.storedPlan) {
      return null;
    }

    const planStore = getBuildPlanStore();
    const plan = await planStore.getByBuildId(buildId);

    if (!plan) return null;

    const progress = await planStore.getProgress(plan.id);
    const state = buildState.stateMachine.getState();

    const phases = plan.phases.map(phase => {
      const phaseAgents = plan.agents.filter(a => a.phase === phase.id);
      const completedCount = phaseAgents.filter(a => a.status === 'completed').length;

      return {
        id: phase.id,
        name: phase.name,
        status: phase.status,
        agentCount: phaseAgents.length,
        completedCount,
      };
    });

    return {
      state,
      progress,
      phases,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Generate build plan from analysis
   */
  private async generateBuildPlan(
    analysis: ProjectAnalysis,
    request: ConductorBuildRequest
  ): Promise<BuildPlan> {
    const buildId = this.generateBuildId();
    const tier = request.tier || analysis.suggestedTier;

    // Map complexity to phases
    const phases = this.mapToPhases(analysis);

    return {
      buildId,
      tier,
      phases,
      totalAgents: analysis.estimatedAgents,
      estimatedTokens: analysis.estimatedTokens,
      estimatedCost: analysis.estimatedCost,
    };
  }

  /**
   * Map analysis to build phases
   */
  private mapToPhases(analysis: ProjectAnalysis): BuildPlan['phases'] {
    const basePhases = ['discovery', 'design', 'architecture'];

    // Add phases based on project type
    const phases: BuildPlan['phases'] = [];

    for (const phaseName of basePhases) {
      phases.push({
        phase: phaseName as any,
        name: phaseName as any,
        agents: this.getAgentsForPhase(phaseName, analysis),
        parallel: true,
        optional: false,
        estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
      });
    }

    // Frontend phase (most projects)
    if (!['api-service'].includes(analysis.type)) {
      phases.push({
        phase: 'frontend',
        name: 'frontend',
        agents: this.getAgentsForPhase('frontend', analysis),
        parallel: true,
        optional: false,
        estimatedTokens: Math.floor(analysis.estimatedTokens / 4),
      });
    }

    // Backend phase (complex projects)
    if (
      ['saas-app', 'e-commerce', 'full-stack', 'api-service', 'dashboard'].includes(analysis.type)
    ) {
      phases.push({
        phase: 'backend',
        name: 'backend',
        agents: this.getAgentsForPhase('backend', analysis),
        parallel: true,
        optional: false,
        estimatedTokens: Math.floor(analysis.estimatedTokens / 4),
      });
    }

    // Integration phase
    if (analysis.features.length > 0) {
      phases.push({
        phase: 'integration',
        name: 'integration',
        agents: this.getAgentsForPhase('integration', analysis),
        parallel: true,
        optional: false,
        estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
      });
    }

    // Testing phase
    phases.push({
      phase: 'testing',
      name: 'testing',
      agents: this.getAgentsForPhase('testing', analysis),
      parallel: true,
      optional: false,
      estimatedTokens: Math.floor(analysis.estimatedTokens / 10),
    });

    // Deployment phase
    phases.push({
      phase: 'deployment',
      name: 'deployment',
      agents: this.getAgentsForPhase('deployment', analysis),
      parallel: true,
      optional: false,
      estimatedTokens: Math.floor(analysis.estimatedTokens / 10),
    });

    return phases;
  }

  /**
   * Get agents for a specific phase
   */
  private getAgentsForPhase(phase: string, analysis: ProjectAnalysis): AgentId[] {
    // Base agents per phase
    const phaseAgents: Record<string, string[]> = {
      discovery: ['project-analyzer', 'requirements-extractor', 'tech-stack-advisor'],
      design: ['ui-designer', 'ux-flow-designer', 'component-mapper'],
      architecture: ['system-architect', 'database-designer', 'api-designer'],
      frontend: ['page-builder', 'component-builder', 'styling-agent', 'responsive-agent'],
      backend: ['api-builder', 'database-builder', 'auth-builder', 'business-logic-agent'],
      integration: ['integration-agent', 'webhook-builder', 'third-party-connector'],
      testing: ['test-writer', 'e2e-tester', 'quality-checker'],
      deployment: ['deployment-agent', 'ci-cd-builder', 'monitoring-setup'],
    };

    const baseAgents = phaseAgents[phase] || [];

    // Add feature-specific agents
    const featureAgents: string[] = [];
    for (const feature of analysis.features) {
      if (this.isAgentRelevantForPhase(feature.requiredAgents, phase)) {
        featureAgents.push(...feature.requiredAgents);
      }
    }

    // Combine and deduplicate
    const allAgents = [...new Set([...baseAgents, ...featureAgents])];

    return allAgents as AgentId[];
  }

  /**
   * Check if agent is relevant for phase
   */
  private isAgentRelevantForPhase(agents: string[], phase: string): boolean {
    const phaseAgentPatterns: Record<string, RegExp[]> = {
      backend: [/auth/, /database/, /api/, /payment/],
      frontend: [/ui/, /component/, /styling/],
      integration: [/integration/, /webhook/, /email/, /storage/],
      testing: [/test/, /quality/],
    };

    const patterns = phaseAgentPatterns[phase];
    if (!patterns) return false;

    return agents.some(agent => patterns.some(pattern => pattern.test(agent)));
  }

  /**
   * Format agent ID to display name
   */

  /**
   * Select build strategy based on analysis
   */
  private selectStrategy(
    analysis: ProjectAnalysis,
    options?: ConductorBuildOptions
  ): BuildStrategyConfig {
    // Use explicit strategy if provided
    const strategy = options?.strategy || this.config.defaultStrategy;

    const baseConfig = STRATEGY_CONFIGS[strategy];

    // Adjust based on complexity
    let maxParallel = baseConfig.maxParallelAgents || 2;
    if (analysis.complexity === 'simple') {
      maxParallel = Math.min(maxParallel, 2);
    } else if (analysis.complexity === 'enterprise') {
      maxParallel = Math.max(maxParallel, 3);
    }

    return {
      strategy,
      maxParallelAgents: maxParallel,
      enableCheckpoints: options?.enableCheckpoints ?? this.config.enableCheckpoints,
      checkpointFrequency: baseConfig.checkpointFrequency || 'milestone',
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'TEMPORARY_FAILURE'],
      },
      qualityGates: this.getQualityGates(analysis),
    };
  }

  /**
   * Get quality gates based on analysis
   */
  private getQualityGates(analysis: ProjectAnalysis): BuildStrategyConfig['qualityGates'] {
    const gates: BuildStrategyConfig['qualityGates'] = [];

    // Always check types after architecture
    gates.push({
      phase: 'architecture',
      checks: [{ name: 'type-check', type: 'type' }],
      blockOnFailure: true,
    });

    // Lint check after frontend
    if (!['api-service'].includes(analysis.type)) {
      gates.push({
        phase: 'frontend',
        checks: [{ name: 'lint-check', type: 'lint' }],
        blockOnFailure: false,
      });
    }

    // Test check before deployment
    gates.push({
      phase: 'testing',
      checks: [{ name: 'test-suite', type: 'test', threshold: 0.8 }],
      blockOnFailure: true,
    });

    return gates;
  }

  /**
   * Execute the build using BuildOrchestrator
   */
  private async executeBuild(buildState: ConductorBuildState): Promise<void> {
    const { buildId, request, plan, strategy } = buildState;

    // Initialize infrastructure
    buildState.tokenTracker = new TokenTracker(buildId);
    const contextTier = this.mapConductorTierToBuildTier(
      request.tier || buildState.analysis.suggestedTier
    );
    buildState.contextManager = new BuildContextManager({
      buildId,
      projectId: buildId,
      tenantId: request.tenantId,
      tier: contextTier,
      description: request.description,
    });

    // Initialize critical decisions from analysis
    buildState.contextManager.initializeCriticalDecisions({
      projectType: buildState.analysis.type,
      primaryFramework: buildState.analysis.techStack.framework,
      stylingApproach: buildState.analysis.techStack.styling,
      stateManagement: 'React Context', // Default
      routingStrategy: 'App Router',
      componentLibrary: 'Custom + Shadcn',
    });

    // MEMORY: Create build record for tracking
    let buildRecord: BuildRecord | null = null;
    if (this.config.memoryConfig?.enabled) {
      buildRecord = createBuildRecord({
        tenantId: request.tenantId,
        description: request.description,
        projectType: buildState.analysis.type,
        complexity: buildState.analysis.complexity,
        tier: request.tier || buildState.analysis.suggestedTier,
      });
      buildRecord.id = buildId; // Use existing buildId

      // MEMORY: Apply learned patterns before starting
      const patternContext: PatternMatchContext = {
        projectType: buildState.analysis.type,
        complexity: buildState.analysis.complexity,
        tier: request.tier || buildState.analysis.suggestedTier,
        currentQuality: 0,
        retryCount: 0,
        agentId: undefined,
        phase: undefined,
        tenantId: request.tenantId,
      };

      const patternResult = await this.applyLearnedPatterns(patternContext);
      if (patternResult.applied && patternResult.patterns.length > 0) {
        this.emitConductorEvent('conductor:memory_patterns_applied', buildId, {
          patternsApplied: patternResult.patterns,
          changes: patternResult.changes,
          messages: patternResult.messages,
        });
      }
    }

    // Create orchestrator with CONDUCTOR options
    // CRITICAL: continueOnError=true allows builds to complete all 9 phases
    // even if individual agents fail. Failed agents are logged but don't stop the build.
    const orchestratorOptions: OrchestrationOptions = {
      maxConcurrency: strategy.maxParallelAgents,
      continueOnError: true,
    };

    const tier = this.mapConductorTierToBuildTier(
      request.tier || buildState.analysis.suggestedTier
    );
    // Use databaseBuildId if provided - this is the proper UUID for database persistence
    // Otherwise fall back to conductor's internal buildId
    const persistenceBuildId = request.options?.databaseBuildId || buildId;
    logger.info(
      `[CONDUCTOR] Creating orchestrator with tier: ${tier} (request.tier: ${request.tier}, suggestedTier: ${buildState.analysis.suggestedTier})`
    );
    logger.info(
      `[CONDUCTOR] Using buildId for persistence: ${persistenceBuildId} (databaseBuildId: ${request.options?.databaseBuildId || 'not provided'})`
    );
    buildState.orchestrator = new BuildOrchestrator(
      persistenceBuildId,
      buildState.contextManager,
      tier,
      orchestratorOptions
    );

    // Forward orchestrator events - use subscribe pattern from BuildOrchestrator
    const unsubscribe = buildState.orchestrator.subscribe((event: OrchestrationEvent) => {
      this.handleOrchestratorEvent(buildState, event);

      // MEMORY: Track agent outputs for build record
      if (buildRecord && event.type === 'agent_completed' && event.agentId && event.output) {
        const summary = buildState.tokenTracker?.getSummary();
        addOutputToRecord(buildRecord, event.agentId, {
          content: event.output,
          tokens: summary?.byAgent[event.agentId]?.tokens || 0,
          quality: 0, // Will be updated by JUDGE
        });
      }
    });

    // Store unsubscribe function for cleanup
    buildState.unsubscribeOrchestrator = unsubscribe;

    // Start execution
    buildState.status = 'running';

    // FIX 1: Overall Build Timeout (30 minutes max) - WITH PROPER CLEANUP
    const BUILD_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout | null = null;
    let timedOut = false;

    const buildTimeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        // CRITICAL: Actually stop the orchestrator, don't just ignore it
        if (buildState.orchestrator) {
          buildState.orchestrator.cancel();
        }
        reject(new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 60000} minutes`));
      }, BUILD_TIMEOUT_MS);
    });

    try {
      // Race between orchestrator completion and timeout
      await Promise.race([buildState.orchestrator.start(), buildTimeoutPromise]);

      // CRITICAL: Clear timeout on success to prevent memory leak
      if (timeoutId) clearTimeout(timeoutId);

      // FIX #1: CHECK CRITICAL AGENT FAILURES BEFORE MARKING COMPLETED
      // Even with continueOnError=true, we must fail if critical agents failed
      const failedCriticalAgents = this.getFailedCriticalAgents(buildState);
      if (failedCriticalAgents.length > 0) {
        logger.error(`[CONDUCTOR] CRITICAL AGENTS FAILED: ${failedCriticalAgents.join(', ')}`);
        buildState.status = 'failed';

        // Emit event for monitoring
        this.emitConductorEvent('conductor:critical_failure', buildId, {
          failedAgents: failedCriticalAgents,
          reason: 'Critical agents failed - build cannot produce valid output',
        });
      } else {
        buildState.status = 'completed';
      }

      // MEMORY: Finalize and store completed build record
      if (buildRecord && this.config.memoryConfig?.enabled) {
        // Calculate overall quality from JUDGE metrics
        const judgeMetrics = this.getJudgeMetrics();
        const qualityScores: Record<string, number> = {};
        let totalQuality = 0;
        let qualityCount = 0;

        judgeMetrics.forEach((metrics, agentId) => {
          qualityScores[agentId] = metrics.averageScore;
          totalQuality += metrics.averageScore;
          qualityCount++;
        });

        const overallQuality = qualityCount > 0 ? totalQuality / qualityCount : 7; // Default 7/10
        buildRecord.qualityScores = qualityScores;

        finalizeBuildRecord(buildRecord, 'completed', {
          overallQuality,
          tokensUsed: buildState.tokenTracker?.getSummary().totalTokens || 0,
          costUSD: buildState.tokenTracker?.getSummary().totalCost || 0,
        });

        // Store in memory
        await this.memoryModule.storeBuild(buildRecord);

        this.emitConductorEvent('conductor:memory_build_stored', buildId, {
          status: 'completed',
          overallQuality: buildRecord.overallQuality,
          tokensUsed: buildRecord.tokensUsed,
          costUSD: buildRecord.costUSD,
          duration: buildRecord.duration,
        });
      }

      // Final checkpoint
      if (this.config.enableCheckpoints) {
        await this.createCheckpoint(buildState, 'completed');
      }
    } catch (error) {
      // CRITICAL: Clear timeout to prevent memory leak on failure path
      if (timeoutId) clearTimeout(timeoutId);

      buildState.status = 'failed'; // Both timeout and error result in 'failed' status (timedOut flag indicates reason)

      // MEMORY: Store failed build record for learning
      if (buildRecord && this.config.memoryConfig?.enabled) {
        addErrorToRecord(buildRecord, {
          agentId: 'unknown',
          phase: 'execution',
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: false,
        });

        finalizeBuildRecord(buildRecord, 'failed', {
          overallQuality: 0,
          tokensUsed: buildState.tokenTracker?.getSummary().totalTokens || 0,
          costUSD: buildState.tokenTracker?.getSummary().totalCost || 0,
        });

        // Store failed build for pattern extraction
        await this.memoryModule.storeBuild(buildRecord);

        this.emitConductorEvent('conductor:memory_build_stored', buildId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          tokensUsed: buildRecord.tokensUsed,
          costUSD: buildRecord.costUSD,
        });
      }

      // Create failure checkpoint for potential resume
      if (this.config.enableCheckpoints) {
        await this.createCheckpoint(buildState, 'failed');
      }

      // Attempt fallback if configured
      if (this.config.fallbackToOrchestrator) {
        this.emitConductorEvent('conductor:fallback_triggered', buildId, {
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    } finally {
      // Cleanup orchestrator subscription
      if (buildState.unsubscribeOrchestrator) {
        buildState.unsubscribeOrchestrator();
      }
      // Remove from active builds
      this.activeBuilds.delete(buildId);
    }
  }

  /**
   * Handle events from BuildOrchestrator
   */
  private handleOrchestratorEvent(
    buildState: ConductorBuildState,
    event: OrchestrationEvent
  ): void {
    // Forward to subscribers
    this.emitEvent(buildState.buildId, event);

    // Create checkpoint on significant events
    if (this.config.enableCheckpoints && this.shouldCheckpoint(buildState.strategy, event)) {
      this.createCheckpoint(buildState, event.type).catch(e =>
        logger.error('[CONDUCTOR] Checkpoint failed:', e)
      );
    }

    // JUDGE: Score agent output after completion
    if (event.type === 'agent_completed' && event.agentId && event.output) {
      const phase = buildState.contextManager?.currentPhase ?? 'unknown';
      this.judgeAgentOutput(buildState, event.agentId, event.output, phase).catch(e =>
        logger.error('[CONDUCTOR] Judge failed:', e)
      );
    }

    // Check quality gates
    if (event.type === 'phase_completed') {
      this.checkQualityGate(buildState, event.phase).catch(e =>
        logger.error('[CONDUCTOR] Quality gate check failed:', e)
      );
    }
  }

  /**
   * JUDGE: Evaluate agent output quality and determine action
   */
  private async judgeAgentOutput(
    buildState: ConductorBuildState,
    agentId: string,
    output: AgentOutput,
    phase: string
  ): Promise<void> {
    // Skip if judge is disabled
    if (!this.config.judgeConfig?.enabled) {
      return;
    }

    const retryCount = buildState.agentRetries?.get(agentId) || 0;

    // Emit judging started event
    this.emitConductorEvent('conductor:judge_started', buildState.buildId, {
      agentId,
      phase,
      retryCount,
    });

    try {
      // Get agent definition for validation
      const agentDef = this.getAgentDefinition(agentId);

      // Prepare judge context
      const judgeContext = {
        buildId: buildState.buildId,
        agentRole: agentDef.description || agentId,
        expectedOutputType: this.getExpectedOutputType(agentId),
        previousOutputs: this.getPreviousOutputsSummary(buildState),
        currentRetry: retryCount,
      };

      // Use quick judge for non-critical agents, full judge for critical
      const criticalAgents = ['strategos', 'archon', 'pixel', 'datum', 'engine', 'wire'];
      const isCritical = criticalAgents.includes(agentId);

      const payload = { agentId, data: output as unknown as Record<string, unknown> };
      const decision = isCritical
        ? await this.judgeModule.judge(agentId, payload, agentDef, judgeContext)
        : this.judgeModule.quickJudge(agentId, payload, agentDef, judgeContext);

      // Emit decision event
      this.emitConductorEvent('conductor:judge_decision', buildState.buildId, {
        agentId,
        action: decision.action,
        score: decision.score.overall,
        confidence: decision.score.confidence,
        dimensions: decision.score.dimensions,
        suggestions: decision.suggestions.map(s => s.aspect),
      });

      // Handle decision
      await this.handleJudgeDecision(buildState, agentId, decision, phase);
    } catch (error) {
      logger.error(`[ConductorService] Judge error for ${agentId}:`, error);
      this.emitConductorEvent('conductor:judge_error', buildState.buildId, {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle the judge's decision for an agent output
   */
  private async handleJudgeDecision(
    buildState: ConductorBuildState,
    agentId: string,
    decision: JudgeDecision,
    phase: string
  ): Promise<void> {
    switch (decision.action) {
      case 'accept':
        // Output accepted - continue normally
        this.emitConductorEvent('conductor:quality_accepted', buildState.buildId, {
          agentId,
          score: decision.score.overall,
        });
        break;

      case 'retry':
        // Quality too low - trigger retry
        if (decision.retryStrategy) {
          const currentRetries = buildState.agentRetries?.get(agentId) || 0;

          if (currentRetries < decision.retryStrategy.maxRetries) {
            // Initialize retry map if needed
            if (!buildState.agentRetries) {
              buildState.agentRetries = new Map();
            }
            buildState.agentRetries.set(agentId, currentRetries + 1);

            this.emitConductorEvent('conductor:retry_triggered', buildState.buildId, {
              agentId,
              reason: 'low_quality',
              retryCount: currentRetries + 1,
              maxRetries: decision.retryStrategy.maxRetries,
              strategy: decision.retryStrategy.type,
              focusAreas: decision.retryStrategy.focusAreas,
            });

            // Note: Actual retry execution would be handled by BuildOrchestrator
            // This event signals that a retry should occur
          } else {
            // Max retries reached
            this.emitConductorEvent('conductor:max_retries_reached', buildState.buildId, {
              agentId,
              finalScore: decision.score.overall,
              suggestions: decision.suggestions,
            });
          }
        }
        break;

      case 'enhance':
        // Output is good but could be better
        this.emitConductorEvent('conductor:enhancement_suggested', buildState.buildId, {
          agentId,
          score: decision.score.overall,
          suggestions: decision.suggestions.map(s => ({
            aspect: s.aspect,
            fix: s.suggestedFix,
            impact: s.estimatedImpact,
          })),
        });
        break;

      case 'fail':
        // Critical failure - output unacceptable
        this.emitConductorEvent('conductor:quality_failed', buildState.buildId, {
          agentId,
          score: decision.score.overall,
          errors: decision.validation.errors,
        });

        // In strict mode, this could halt the build
        if (this.config.judgeConfig?.strictMode) {
          throw new Error(
            `Agent ${agentId} failed quality check with score ${decision.score.overall}`
          );
        }
        break;
    }
  }

  private mapConductorTierToBuildTier(
    tier: 'basic' | 'standard' | 'premium' | 'enterprise'
  ): 'starter' | 'professional' | 'ultimate' | 'enterprise' {
    switch (tier) {
      case 'basic':
        return 'starter';
      case 'standard':
        return 'professional';
      case 'premium':
        return 'ultimate';
      case 'enterprise':
      default:
        return 'enterprise';
    }
  }

  /**
   * Evaluate if a handoff should occur after agent execution.
   * Uses the HandoffRouter for LLM-based or rule-based routing decisions.
   */
  private async evaluateHandoff(
    buildState: ConductorBuildState,
    agentId: string,
    output: AgentOutput,
    input: AgentInput
  ): Promise<RoutingDecision> {
    try {
      // Create handoff context
      const handoffContext: HandoffContext = {
        sourceAgent: agentId as any,
        conversationHistory: [],
        currentGoal: buildState.request.description,
        attributes: new Map([
          ['buildId', buildState.buildId],
          ['phase', buildState.contextManager?.currentPhase || 'unknown'],
          ['projectType', buildState.analysis.type],
        ]),
        chainDepth: 0, // Reset for each agent
        circuitState: this.handoffRouter.getCircuitState(agentId as any).state,
        requestId: `req_${buildState.buildId}_${Date.now()}` as any,
        traceId: `trace_${buildState.buildId}` as any,
      };

      // Evaluate handoff
      const decision = await this.handoffRouter.evaluate(
        handoffContext,
        agentId as any,
        output,
        input
      );

      // Record metrics
      if (decision.shouldHandoff) {
        logger.debug(
          `[Handoff] Agent ${agentId} -> ${decision.targetAgent} (confidence: ${decision.confidence.toFixed(2)})`
        );
      }

      return decision;
    } catch (error) {
      logger.error(`[Handoff] Evaluation error for ${agentId}:`, error);
      // Return no-handoff decision on error
      return {
        shouldHandoff: false,
        targetAgent: null,
        confidence: 0,
        reasoning: 'Handoff evaluation failed',
        compressedContext: '',
        preserveHistory: false,
        routingMethod: 'fallback',
        alternatives: [],
        decisionTimeMs: 0,
        matchedCapabilities: [],
      };
    }
  }

  /**
   * Get agent definition for judge validation
   */
  private getAgentDefinition(agentId: string): {
    id: string;
    description?: string;
    outputSchema?: Record<string, unknown>;
  } {
    // Map of agent definitions - would be loaded from registry in full implementation
    const definitions: Record<string, { description: string }> = {
      oracle: { description: 'Market analysis and competitor research agent' },
      empathy: { description: 'User persona and journey mapping agent' },
      strategos: { description: 'MVP strategy and roadmap planning agent' },
      scope: { description: 'Feature scoping and requirements agent' },
      palette: { description: 'Color and typography design agent' },
      blocks: { description: 'Component library design agent' },
      cartographer: { description: 'Wireframe and page layout agent' },
      polish: { description: 'Animation and interaction design agent' },
      archon: { description: 'System architecture and tech stack agent' },
      datum: { description: 'Database schema and entity design agent' },
      nexus: { description: 'API endpoint and contract design agent' },
      sentinel: { description: 'Security rules and auth strategy agent' },
      forge: { description: 'Infrastructure and deployment agent' },
      pixel: { description: 'UI component code generation agent' },
      wire: { description: 'Page and route code generation agent' },
      engine: { description: 'Business logic and service layer agent' },
      tether: { description: 'Integration and webhook agent' },
    };

    return {
      id: agentId,
      description: definitions[agentId]?.description,
    };
  }

  /**
   * Get expected output type for an agent
   */
  private getExpectedOutputType(agentId: string): string {
    const outputTypes: Record<string, string> = {
      oracle: 'market_analysis',
      empathy: 'user_personas',
      strategos: 'mvp_strategy',
      scope: 'feature_requirements',
      palette: 'design_tokens',
      blocks: 'component_specs',
      cartographer: 'wireframes',
      polish: 'animations',
      archon: 'architecture_plan',
      datum: 'database_schema',
      nexus: 'api_spec',
      sentinel: 'security_policy',
      forge: 'deployment_config',
      pixel: 'component_code',
      wire: 'page_code',
      engine: 'service_code',
      tether: 'integration_code',
    };

    return outputTypes[agentId] || 'generic_output';
  }

  /**
   * Get summaries of previous agent outputs for consistency checking
   */
  private getPreviousOutputsSummary(
    buildState: ConductorBuildState
  ): Array<{ agentId: string; summary: unknown }> {
    const context = buildState.contextManager?.getFullContext();
    if (!context?.outputs) {
      return [];
    }

    return Object.entries(context.outputs).map(([agentId, output]) => ({
      agentId,
      summary: this.summarizeOutput(output),
    }));
  }

  /**
   * Create a summary of an output for judge context
   */
  private summarizeOutput(output: unknown): unknown {
    if (!output || typeof output !== 'object') {
      return output;
    }

    const obj = output as Record<string, unknown>;
    const summary: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        summary[key] = `[${value.length} items]`;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = `{${Object.keys(value as object).length} fields}`;
      } else if (typeof value === 'string' && value.length > 100) {
        summary[key] = value.substring(0, 100) + '...';
      } else {
        summary[key] = value;
      }
    }

    return summary;
  }

  /**
   * Get judge metrics for all agents
   */
  getJudgeMetrics(): Map<string, QualityMetrics> {
    return this.judgeModule.getAllMetrics();
  }

  /**
   * Get agents with declining quality
   */
  getDecliningAgents(): string[] {
    return this.judgeModule.getDecliningAgents();
  }

  /**
   * Check if an agent is underperforming
   */
  isAgentUnderperforming(agentId: string): boolean {
    return this.judgeModule.isUnderperforming(agentId);
  }

  /**
   * Determine if checkpoint should be created
   */
  private shouldCheckpoint(strategy: BuildStrategyConfig, event: OrchestrationEvent): boolean {
    switch (strategy.checkpointFrequency) {
      case 'agent':
        return event.type === 'agent_completed';
      case 'phase':
        return event.type === 'phase_completed';
      case 'milestone':
        return (
          event.type === 'phase_completed' &&
          ['architecture', 'frontend', 'backend', 'testing'].includes(event.phase)
        );
      default:
        return false;
    }
  }

  /**
   * Create a checkpoint for the current build state (uses new CHECKPOINT system)
   */
  private async createCheckpoint(
    buildState: ConductorBuildState,
    trigger: string
  ): Promise<BuildCheckpoint | Checkpoint> {
    const { buildId, request, contextManager, tokenTracker, orchestrator, analysis, plan } =
      buildState;

    const progress = orchestrator?.getProgress();
    const context = contextManager?.getFullContext();

    // Use new CHECKPOINT system if enabled
    if (this.config.checkpointConfig?.enabled) {
      const currentPhase = progress?.currentPhase ?? null;
      const completedAgents = progress?.completedAgents || [];
      const sequence = completedAgents.length;
      const currentAgent = completedAgents[completedAgents.length - 1] || 'unknown';

      // Serialize build context
      const serializedBuildContext: SerializedBuildContext = {
        buildId,
        projectId: buildId, // Use buildId as projectId for now
        tenantId: request.tenantId,
        tier: request.tier || plan.tier,
        description: request.description,
        projectType: analysis.type,
        complexity: analysis.complexity,
        iteration: 1,
        userFeedback: [],
        focusAreas: [],
        retryHints: undefined,
        criticalDecisions: contextManager?.getCriticalDecisions()
          ? {
              projectType: contextManager.getCriticalDecisions().projectType,
              primaryFramework: contextManager.getCriticalDecisions().primaryFramework,
              stylingApproach: contextManager.getCriticalDecisions().stylingApproach,
              stateManagement: contextManager.getCriticalDecisions().stateManagement,
              routingStrategy: contextManager.getCriticalDecisions().routingStrategy,
              componentLibrary: contextManager.getCriticalDecisions().componentLibrary,
            }
          : undefined,
        buildPlan: {
          phases: plan.phases.map(p => ({
            name: p.name ?? p.phase,
            agents: p.agents.map(a => a),
            estimatedTokens: p.estimatedTokens,
            status: (progress?.completedPhases || []).includes(p.name ?? p.phase)
              ? ('completed' as const)
              : ('pending' as const),
          })),
          totalAgents: plan.totalAgents,
          estimatedTokens: plan.estimatedTokens,
          estimatedCost: plan.estimatedCost,
        },
      };

      // Serialize agent outputs
      const agentOutputs = new Map<string, SerializedAgentOutput>();
      if (context?.outputs) {
        for (const [agentId, output] of Object.entries(context.outputs)) {
          const summary = tokenTracker?.getSummary();
          agentOutputs.set(agentId, {
            agentId,
            phase: getAgentPhase(agentId),
            output: output as Record<string, unknown>,
            completedAt: new Date(),
            tokensUsed: summary?.byAgent[agentId]?.tokens || 0,
          });
        }
      }

      // Collect quality scores from judge
      const qualityScores = new Map<string, QualityScoreSnapshot>();
      const judgeMetrics = this.getJudgeMetrics();
      judgeMetrics.forEach((metrics, agentId) => {
        qualityScores.set(agentId, {
          overall: metrics.averageScore,
          dimensions: {
            completeness: metrics.averageScore,
            correctness: metrics.averageScore,
            accuracy: metrics.averageScore,
            consistency: metrics.averageScore,
            creativity: metrics.averageScore,
            clarity: metrics.averageScore,
            relevance: metrics.averageScore,
          },
          confidence: 0.8,
        });
      });

      // Collect decisions
      const decisions: Decision[] = [];
      if (contextManager?.getCriticalDecisions()) {
        const cd = contextManager.getCriticalDecisions();
        decisions.push(
          {
            key: 'projectType',
            value: cd.projectType,
            reason: 'From analysis',
            madeBy: 'conductor',
            madeAt: new Date(),
          },
          {
            key: 'primaryFramework',
            value: cd.primaryFramework,
            reason: 'From analysis',
            madeBy: 'conductor',
            madeAt: new Date(),
          },
          {
            key: 'stylingApproach',
            value: cd.stylingApproach,
            reason: 'From analysis',
            madeBy: 'conductor',
            madeAt: new Date(),
          }
        );
      }

      // Timing info
      const timing: CheckpointTiming = {
        buildStartedAt: buildState.startedAt,
        checkpointCreatedAt: new Date(),
        totalDurationMs: Date.now() - buildState.startedAt.getTime(),
        agentDurations: new Map(),
      };

      // Cost info
      const costs: CheckpointCosts = {
        tokensUsed: tokenTracker?.getSummary().totalTokens || 0,
        estimatedCost: tokenTracker?.getSummary().totalCost || 0,
        costByAgent: new Map(),
      };

      // Create checkpoint using CheckpointManager
      const checkpoint = await this.checkpointManager.createCheckpoint(
        buildId,
        request.tenantId,
        currentAgent,
        currentPhase ?? 'unknown',
        sequence,
        serializedBuildContext,
        agentOutputs,
        qualityScores,
        decisions,
        timing,
        costs,
        {
          knowledge: context?.accumulatedKnowledge,
          failedAgents: [],
          skippedAgents: [],
          pendingAgents: progress?.pendingAgents || [],
          totalAgents: plan.totalAgents,
        }
      );

      this.emitConductorEvent('conductor:checkpoint_created', buildId, {
        checkpointId: checkpoint.id,
        trigger,
        phase: checkpoint.phase,
        sequence: checkpoint.sequence,
        sizeBytes: checkpoint.sizeBytes,
        compressed: checkpoint.compressed,
      });

      return checkpoint;
    }

    // Fallback to legacy checkpoint for backward compatibility
    const checkpoint: BuildCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      buildId,
      timestamp: new Date(),
      phase: progress?.currentPhase || 'unknown',
      agentIndex: 0,
      status: buildState.status === 'running' ? 'running' : (buildState.status as any),
      context: {
        completedPhases: progress?.completedPhases || [],
        completedAgents: progress?.completedAgents || [],
        pendingAgents: [],
        accumulatedKnowledge: context?.accumulatedKnowledge || {},
        errors: [],
      },
      outputs: context?.outputs || {},
      criticalDecisions: contextManager?.getCriticalDecisions() || ({} as CriticalDecisions),
      metadata: {
        tokensUsed: tokenTracker?.getSummary().totalTokens || 0,
        costAccumulated: tokenTracker?.getSummary().totalCost || 0,
        duration: Date.now() - buildState.startedAt.getTime(),
        retryCount: 0,
      },
    };

    // Store legacy checkpoint
    if (!this.checkpoints.has(buildId)) {
      this.checkpoints.set(buildId, []);
    }
    this.checkpoints.get(buildId)!.push(checkpoint);

    this.emitConductorEvent('conductor:checkpoint_created', buildId, {
      checkpointId: checkpoint.id,
      trigger,
      phase: checkpoint.phase,
    });

    return checkpoint;
  }

  /**
   * Get checkpoint by ID or latest
   */
  private getCheckpoint(buildId: string, checkpointId?: string): BuildCheckpoint | null {
    const buildCheckpoints = this.checkpoints.get(buildId);
    if (!buildCheckpoints || buildCheckpoints.length === 0) {
      return null;
    }

    if (checkpointId) {
      return buildCheckpoints.find(cp => cp.id === checkpointId) || null;
    }

    // Return latest
    return buildCheckpoints[buildCheckpoints.length - 1];
  }

  /**
   * Restore build state from checkpoint
   */
  private async restoreFromCheckpoint(
    checkpoint: BuildCheckpoint,
    request: ConductorResumeRequest
  ): Promise<ConductorBuildState> {
    // Reconstruct analysis from checkpoint
    const analysis: ProjectAnalysis = {
      type: 'full-stack', // Would need to store this in checkpoint
      complexity: 'moderate',
      estimatedAgents: 20,
      estimatedTokens: checkpoint.metadata.tokensUsed * 2, // Estimate remaining
      estimatedCost: checkpoint.metadata.costAccumulated * 2,
      suggestedTier: 'standard',
      features: [],
      techStack: {
        framework: checkpoint.criticalDecisions.primaryFramework || 'Unknown',
        styling: checkpoint.criticalDecisions.stylingApproach || 'Unknown',
        database: null,
        auth: null,
        payments: null,
        hosting: 'Vercel',
        reasoning: 'Restored from checkpoint',
      },
      warnings: [],
      confidence: 0.8,
    };

    // Reconstruct plan
    const plan: BuildPlan = {
      buildId: checkpoint.buildId,
      tier: 'standard',
      phases: [], // Would need to store this in checkpoint
      totalAgents: analysis.estimatedAgents,
      estimatedTokens: analysis.estimatedTokens,
      estimatedCost: analysis.estimatedCost,
    };

    // Merge strategy modifications
    const strategy = this.selectStrategy(analysis, {});
    if (request.modifyStrategy) {
      Object.assign(strategy, request.modifyStrategy);
    }

    return {
      buildId: checkpoint.buildId,
      request: {
        description: '',
        tenantId: '',
      },
      analysis,
      plan,
      strategy,
      status: 'initialized',
      startedAt: new Date(),
      orchestrator: null,
      contextManager: null,
      tokenTracker: null,
      resumedFrom: checkpoint,
    };
  }

  /**
   * Check quality gate after phase completion
   */
  private async checkQualityGate(buildState: ConductorBuildState, phase: string): Promise<void> {
    const gate = buildState.strategy.qualityGates.find(g => g.phase === phase);
    if (!gate) return;

    let passed = true;
    const results: Record<string, boolean> = {};

    for (const check of gate.checks) {
      // In real implementation, would run actual checks
      const checkPassed = true; // Placeholder
      results[check.name] = checkPassed;
      if (!checkPassed) passed = false;
    }

    if (passed) {
      this.emitConductorEvent('conductor:quality_gate_passed', buildState.buildId, {
        phase,
        checks: results,
      });
    } else {
      this.emitConductorEvent('conductor:quality_gate_failed', buildState.buildId, {
        phase,
        checks: results,
        blocking: gate.blockOnFailure,
      });

      if (gate.blockOnFailure) {
        throw new Error(`Quality gate failed for phase ${phase}`);
      }
    }
  }

  /**
   * Emit CONDUCTOR-specific event
   */
  private emitConductorEvent(
    type: ConductorEvent['type'],
    buildId: string,
    data: Record<string, unknown>
  ): void {
    const event: ConductorEvent = {
      type,
      buildId,
      timestamp: new Date(),
      data,
    };

    this.emitEvent(buildId, event);
  }

  /**
   * Emit event to all subscribers
   */
  private emitEvent(buildId: string, event: ExtendedOrchestrationEvent): void {
    const listeners = this.eventListeners.get(buildId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          logger.error('[CONDUCTOR] Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Generate alternative plans
   */
  private generateAlternatives(analysis: ProjectAnalysis): AlternativePlan[] {
    const alternatives: AlternativePlan[] = [];

    // Basic tier option
    if (analysis.suggestedTier !== 'basic') {
      alternatives.push({
        tier: 'basic',
        description: 'Minimal viable product with core features only',
        estimatedCost: analysis.estimatedCost * 0.4,
        estimatedDuration: analysis.estimatedTokens * 0.5,
        tradeoffs: ['Fewer features', 'Less polish', 'Manual setup required'],
      });
    }

    // Premium tier option
    if (analysis.suggestedTier !== 'premium' && analysis.suggestedTier !== 'enterprise') {
      alternatives.push({
        tier: 'premium',
        description: 'Full-featured implementation with optimizations',
        estimatedCost: analysis.estimatedCost * 1.5,
        estimatedDuration: analysis.estimatedTokens * 1.3,
        tradeoffs: ['Higher cost', 'More comprehensive', 'Better quality'],
      });
    }

    return alternatives;
  }

  /**
   * Estimate build duration in milliseconds
   */
  private estimateDuration(analysis: ProjectAnalysis, plan: BuildPlan): number {
    // Rough estimate: 2 seconds per 1000 tokens
    return (analysis.estimatedTokens / 1000) * 2000;
  }

  /**
   * Get default analysis when analysis is disabled
   */
  private getDefaultAnalysis(): ProjectAnalysis {
    return {
      type: 'full-stack',
      complexity: 'moderate',
      estimatedAgents: 20,
      estimatedTokens: 200000,
      estimatedCost: 3.0,
      suggestedTier: 'standard',
      features: [],
      techStack: {
        framework: 'Next.js 15',
        styling: 'Tailwind CSS',
        database: 'PostgreSQL + Prisma',
        auth: 'NextAuth.js',
        payments: null,
        hosting: 'Vercel',
        reasoning: 'Default full-stack configuration',
      },
      warnings: ['Analysis disabled - using default configuration'],
      confidence: 0.5,
    };
  }

  /**
   * Generate unique build ID
   */
  private generateBuildId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ConductorBuildState {
  buildId: string;
  request: ConductorBuildRequest;
  analysis: ProjectAnalysis;
  plan: BuildPlan;
  strategy: BuildStrategyConfig;
  status: 'initialized' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';
  startedAt: Date;
  orchestrator: BuildOrchestrator | null;
  contextManager: BuildContextManager | null;
  tokenTracker: TokenTracker | null;
  resumedFrom?: BuildCheckpoint;
  unsubscribeOrchestrator?: () => void;
  agentRetries?: Map<string, number>;
  // Phase 3: State Machine Integration
  stateMachine?: BuildStateMachine;
  storedPlan?: StoredBuildPlan;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const conductorService = new ConductorService();

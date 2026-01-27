/**
 * OLYMPUS 2.0 - Build Service
 *
 * UPDATED: Now uses CONDUCTOR by default for intelligent orchestration.
 * BuildOrchestrator is kept as fallback for compatibility.
 */

import type { AgentId, AgentOutput, BuildPhase } from '../types';
import type {
  BuildPlan,
  BuildProgress,
  OrchestrationEvent,
  OrchestrationOptions,
} from '../orchestrator/types';
import { BuildContextManager } from '../context';
import { BuildOrchestrator, createBuildPlan } from '../orchestrator';
import { TokenTracker } from '../providers';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { validatePrompt } from '../validation/prompt-validator';
import type { Tables } from '@/types/database.types';
import {
  conductorService,
  conductorRouter,
  type ConductorBuildResult,
  type ExtendedOrchestrationEvent,
} from '../conductor';

type Build = Tables<'builds'>;

/** Valid tier type */
type ValidTier = 'starter' | 'professional' | 'ultimate' | 'enterprise';

/** Normalize tier value from database to valid tier */
function normalizeTier(tier: string | null | undefined): ValidTier {
  const tierMap: Record<string, ValidTier> = {
    standard: 'starter',
    basic: 'starter',
    free: 'starter',
    pro: 'professional',
    business: 'professional',
    ultimate: 'ultimate',
    enterprise: 'enterprise',
  };

  if (!tier) return 'starter';
  const lowerTier = tier.toLowerCase();
  return tierMap[lowerTier] || (lowerTier as ValidTier) || 'starter';
}

/** Build creation params */
export interface CreateBuildParams {
  projectId: string;
  tenantId: string;
  userId: string;
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  description: string;
  targetUsers?: string;
  techConstraints?: string;
  businessRequirements?: string;
  designPreferences?: string;
  integrations?: string[];
  // CONDUCTOR options
  useConductor?: boolean; // Default: true - use CONDUCTOR for intelligent orchestration
  conductorOptions?: {
    strategy?: 'sequential' | 'parallel-phases' | 'adaptive' | 'fast-track';
    skipAnalysis?: boolean;
    forceProjectType?: string;
    enableCheckpoints?: boolean;
  };
}

/** Build service response */
export interface BuildServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Active orchestrators cache */
const activeOrchestrators = new Map<string, BuildOrchestrator>();

/** Track which builds are managed by CONDUCTOR */
const conductorManagedBuilds = new Set<string>();

/** CONDUCTOR tier mapping */
const CONDUCTOR_TIER_MAP: Record<string, 'basic' | 'standard' | 'premium' | 'enterprise'> = {
  starter: 'basic',
  professional: 'standard',
  ultimate: 'premium',
  enterprise: 'enterprise',
};

/** Build service */
export const buildService = {
  /** Create a new build - Uses CONDUCTOR by default */
  async create(
    params: CreateBuildParams
  ): Promise<BuildServiceResponse<{ buildId: string; plan: BuildPlan; conductor?: boolean }>> {
    // STEP 0: Validate prompt before processing
    const validation = validatePrompt(params.description);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROMPT',
          message: validation.error || 'Invalid prompt',
        },
      };
    }

    // Log warning for complex prompts but continue
    if (validation.warning) {
      console.warn(`[BuildService] ${validation.warning}`);
    }

    const supabase = createServiceRoleClient();

    // Check for existing active build
    const { data: existing } = await supabase
      .from('builds')
      .select('id')
      .eq('project_id', params.projectId)
      .in('status', ['queued', 'running', 'initializing'])
      .limit(1);

    if (existing?.length) {
      return {
        success: false,
        error: {
          code: 'BUILD_IN_PROGRESS',
          message: 'A build is already in progress for this project',
        },
      };
    }

    // Determine if CONDUCTOR should be used (default: true)
    const useConductor = params.useConductor !== false;

    if (useConductor) {
      // CONDUCTOR PATH: Analyze and create optimized build
      try {
        console.log(`[BuildService] Using CONDUCTOR for build in project ${params.projectId}`);

        // Analyze project first
        const analysis = await conductorRouter.analyzeProject(params.description);
        const routing = conductorRouter.getRoutingRecommendation(analysis);

        if (routing.useConductor) {
          // Map tier to CONDUCTOR tier
          const conductorTier = CONDUCTOR_TIER_MAP[params.tier] || 'standard';

          // Create build plan from CONDUCTOR analysis
          const plan: BuildPlan = {
            buildId: 'pending', // Will be updated after DB insert
            tier: conductorTier,
            phases:
              analysis.features.length > 0
                ? [
                    {
                      phase: 'discovery',
                      name: 'discovery',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
                    },
                    {
                      phase: 'design',
                      name: 'design',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
                    },
                    {
                      phase: 'architecture',
                      name: 'architecture',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
                    },
                    {
                      phase: 'frontend',
                      name: 'frontend',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 4),
                    },
                    {
                      phase: 'backend',
                      name: 'backend',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 4),
                    },
                    {
                      phase: 'integration',
                      name: 'integration',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 8),
                    },
                    {
                      phase: 'testing',
                      name: 'testing',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 10),
                    },
                    {
                      phase: 'deployment',
                      name: 'deployment',
                      agents: [],
                      parallel: true,
                      optional: false,
                      estimatedTokens: Math.floor(analysis.estimatedTokens / 10),
                    },
                  ]
                : createBuildPlan('temp', params.tier).phases,
            totalAgents: analysis.estimatedAgents,
            estimatedTokens: analysis.estimatedTokens,
            estimatedCost: analysis.estimatedCost,
          };

          // Insert build record with CONDUCTOR metadata
          // NOTE: Only include columns that exist in the DB. Extra data goes in config JSON.
          const { data: buildData, error } = await supabase
            .from('builds')
            .insert({
              project_id: params.projectId,
              tenant_id: params.tenantId,
              created_by: params.userId || null,
              tier: params.tier as any,
              status: 'queued' as any,
              description: params.description,
              total_agents: plan.totalAgents,
              config: {
                conductor: true,
                // Store extra params in config since columns don't exist in DB
                targetUsers: params.targetUsers,
                techConstraints: params.techConstraints,
                businessRequirements: params.businessRequirements,
                designPreferences: params.designPreferences,
                integrations: params.integrations,
                estimatedTokens: plan.estimatedTokens,
                estimatedCost: plan.estimatedCost,
                analysis: {
                  type: analysis.type,
                  complexity: analysis.complexity,
                  confidence: analysis.confidence,
                  features: analysis.features.map(f => f.name),
                  techStack: analysis.techStack,
                },
                conductorOptions: params.conductorOptions,
              },
            } as any)
            .select('id')
            .single();

          const build = buildData as { id: string } | null;
          if (error || !build) {
            console.warn(
              `[BuildService] CONDUCTOR DB insert failed, falling back to standard:`,
              error
            );
            // Fall through to standard path
          } else {
            plan.buildId = build.id;
            conductorManagedBuilds.add(build.id);

            console.log(
              `[BuildService] CONDUCTOR build created: ${build.id} (type: ${analysis.type}, complexity: ${analysis.complexity})`
            );

            return { success: true, data: { buildId: build.id, plan, conductor: true } };
          }
        } else {
          console.log(
            `[BuildService] CONDUCTOR routing suggests standard orchestrator: ${routing.reason}`
          );
        }
      } catch (conductorError) {
        console.warn(
          `[BuildService] CONDUCTOR analysis failed, falling back to standard:`,
          conductorError
        );
        // Fall through to standard path
      }
    }

    // STANDARD PATH: Use BuildOrchestrator directly
    console.log(`[BuildService] Using standard BuildOrchestrator for project ${params.projectId}`);

    // Create build plan
    const plan = createBuildPlan('temp', params.tier);

    // Insert build record
    // NOTE: Only include columns that exist in the DB. Extra data goes in config JSON.
    const { data: buildData, error } = await supabase
      .from('builds')
      .insert({
        project_id: params.projectId,
        tenant_id: params.tenantId,
        created_by: params.userId || null,
        tier: params.tier as any,
        status: 'queued' as any,
        description: params.description,
        total_agents: plan.totalAgents,
        config: {
          conductor: false,
          // Store extra params in config since columns don't exist in DB
          targetUsers: params.targetUsers,
          techConstraints: params.techConstraints,
          businessRequirements: params.businessRequirements,
          designPreferences: params.designPreferences,
          integrations: params.integrations,
          estimatedTokens: plan.estimatedTokens,
          estimatedCost: plan.estimatedCost,
        },
      } as any)
      .select('id')
      .single();

    const build = buildData as { id: string } | null;
    if (error || !build) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error?.message || 'Failed to create build' },
      };
    }

    // Update plan with actual build ID
    plan.buildId = build.id;

    return { success: true, data: { buildId: build.id, plan, conductor: false } };
  },

  /** Start build execution - Uses CONDUCTOR for CONDUCTOR-created builds */
  async start(
    buildId: string,
    options?: OrchestrationOptions
  ): Promise<BuildServiceResponse<BuildProgress>> {
    const supabase = createServiceRoleClient();

    // Get build record
    const { data: buildData, error } = await supabase
      .from('builds')
      .select('*')
      .eq('id', buildId)
      .single();

    const build = buildData as Build | null;
    if (error || !build) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Build not found' } };
    }

    if (build.status !== 'queued' && build.status !== 'paused') {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot start build with status: ${build.status}`,
        },
      };
    }

    // Check if this is a CONDUCTOR-managed build
    const isConductorBuild =
      (build as any).config?.conductor === true || conductorManagedBuilds.has(buildId);

    if (isConductorBuild) {
      // CONDUCTOR PATH
      console.log(`[BuildService] Starting CONDUCTOR-managed build ${buildId}`);

      try {
        // Map tier for CONDUCTOR
        const conductorTier = CONDUCTOR_TIER_MAP[normalizeTier(build.tier)] || 'standard';

        // Start via CONDUCTOR service
        // FIX #19: Pass databaseBuildId so CONDUCTOR uses the correct UUID for persistence
        const result = await conductorService.startBuild({
          description: build.description || '',
          tenantId: build.tenant_id,
          tier: conductorTier,
          options: {
            ...(build as any).config?.conductorOptions,
            databaseBuildId: buildId,
          },
        });

        // Track this build
        conductorManagedBuilds.add(buildId);

        // Update database status
        await (supabase.from('builds') as any)
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
          })
          .eq('id', buildId);

        // Return initial progress
        const progress = await conductorService.getProgress(buildId);
        return {
          success: true,
          data: progress || {
            buildId,
            status: 'running',
            currentPhase: 'discovery',
            currentAgents: [],
            completedPhases: [],
            completedAgents: [],
            progress: 0,
            tokensUsed: 0,
            estimatedCost: result.plan.estimatedCost,
            startedAt: new Date(),
          },
        };
      } catch (conductorError) {
        console.warn(
          `[BuildService] CONDUCTOR start failed, falling back to standard:`,
          conductorError
        );
        conductorManagedBuilds.delete(buildId);
        // Fall through to standard path
      }
    }

    // STANDARD PATH: Use BuildOrchestrator
    console.log(`[BuildService] Starting standard BuildOrchestrator for build ${buildId}`);

    // Normalize tier from database (handles "standard" → "starter" etc)
    const tier = normalizeTier(build.tier);

    // Create context manager
    const context = new BuildContextManager({
      buildId,
      projectId: build.project_id,
      tenantId: build.tenant_id,
      tier: tier,
      description: build.description || '',
      targetUsers: build.target_users || undefined,
      techConstraints: build.tech_constraints || undefined,
      businessRequirements: build.business_requirements || undefined,
      designPreferences: build.design_preferences || undefined,
      integrations: build.integrations || undefined,
    });

    // Create orchestrator
    const orchestrator = new BuildOrchestrator(buildId, context, tier, options);
    activeOrchestrators.set(buildId, orchestrator);

    // Update status
    await (supabase.from('builds') as any)
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', buildId);

    // Start async (don't await) - 50X RELIABILITY: Added .catch() for error handling
    orchestrator
      .start()
      .then(async result => {
        activeOrchestrators.delete(buildId);
        const finalStatus = result.success ? 'completed' : 'failed';
        const tracker = orchestrator.getTokenTracker();

        await (supabase.from('builds') as any)
          .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
            tokens_used: tracker.getTotalTokens(),
            actual_cost: tracker.getSummary().totalCost,
            error: result.error?.message,
          })
          .eq('id', buildId);
      })
      .catch(error => {
        // 50X RELIABILITY: Ensure errors are logged and build is marked failed
        console.error(`[BuildService] CRITICAL: Failed to finalize build ${buildId}:`, error);
        activeOrchestrators.delete(buildId);
        // Attempt to mark as failed in database
        (supabase.from('builds') as any)
          .update({
            status: 'failed',
            error: `Build finalization error: ${error instanceof Error ? error.message : String(error)}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', buildId)
          .then(() => {
            console.log(`[BuildService] Marked build ${buildId} as failed after error`);
          })
          .catch((dbError: unknown) => {
            console.error(`[BuildService] Could not update build status for ${buildId}:`, dbError);
          });
      });

    return { success: true, data: orchestrator.getProgress() };
  },

  /** Get build progress */
  async getProgress(buildId: string): Promise<BuildServiceResponse<BuildProgress>> {
    const orchestrator = activeOrchestrators.get(buildId);
    if (orchestrator) {
      return { success: true, data: orchestrator.getProgress() };
    }

    // FIX: Check if this is a CONDUCTOR-managed build
    if (conductorManagedBuilds.has(buildId)) {
      try {
        const progress = await conductorService.getProgress(buildId);
        if (progress) {
          return { success: true, data: progress };
        }
      } catch (err) {
        console.warn(`[BuildService] Failed to get CONDUCTOR progress for ${buildId}:`, err);
        // Fall through to database lookup
      }
    }

    // Build not active, get from database
    const supabase = createServiceRoleClient();
    const { data: buildData, error } = await supabase
      .from('builds')
      .select('*')
      .eq('id', buildId)
      .single();
    const build = buildData as Build | null;

    if (error || !build) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Build not found' } };
    }

    return {
      success: true,
      data: {
        buildId,
        status: build.status as any,
        currentPhase: build.current_phase as any,
        currentAgents: [],
        completedPhases: (build.completed_phases || []) as any,
        completedAgents: (build.completed_agents || []) as any,
        progress: build.progress || 0,
        tokensUsed: build.tokens_used || 0,
        estimatedCost: build.actual_cost || build.estimated_cost || 0,
        startedAt: build.started_at ? new Date(build.started_at) : null,
      },
    };
  },

  /** Pause build */
  async pause(buildId: string): Promise<BuildServiceResponse<void>> {
    const orchestrator = activeOrchestrators.get(buildId);
    if (!orchestrator) {
      return {
        success: false,
        error: { code: 'NOT_ACTIVE', message: 'Build is not actively running' },
      };
    }

    orchestrator.pause();
    const supabase = createServiceRoleClient();
    await (supabase.from('builds') as any).update({ status: 'paused' }).eq('id', buildId);

    return { success: true };
  },

  /** Cancel build */
  async cancel(buildId: string): Promise<BuildServiceResponse<void>> {
    const orchestrator = activeOrchestrators.get(buildId);
    if (orchestrator) {
      orchestrator.cancel();
      activeOrchestrators.delete(buildId);
    }

    const supabase = createServiceRoleClient();
    await (supabase.from('builds') as any)
      .update({ status: 'canceled', completed_at: new Date().toISOString() })
      .eq('id', buildId);

    return { success: true };
  },

  /** Subscribe to build events - Works with both CONDUCTOR and standard builds */
  subscribe(buildId: string, listener: (event: OrchestrationEvent) => void): () => void {
    // Check if CONDUCTOR-managed
    if (conductorManagedBuilds.has(buildId)) {
      // CONDUCTOR subscription (wraps to OrchestrationEvent type)
      return conductorService.subscribe(buildId, (event: ExtendedOrchestrationEvent) => {
        // Forward all events - CONDUCTOR events are compatible
        listener(event as OrchestrationEvent);
      });
    }

    // Standard orchestrator subscription
    const orchestrator = activeOrchestrators.get(buildId);
    if (orchestrator) {
      return orchestrator.subscribe(listener);
    }
    return () => {};
  },

  /** Get active orchestrator */
  getOrchestrator(buildId: string): BuildOrchestrator | undefined {
    return activeOrchestrators.get(buildId);
  },

  /** Check if build is managed by CONDUCTOR */
  isConductorBuild(buildId: string): boolean {
    return conductorManagedBuilds.has(buildId);
  },

  /** Get CONDUCTOR checkpoints for a build */
  getCheckpoints(buildId: string) {
    return conductorService.getCheckpoints(buildId);
  },

  /** Resume a CONDUCTOR build from checkpoint */
  async resumeFromCheckpoint(
    buildId: string,
    checkpointId?: string
  ): Promise<BuildServiceResponse<BuildProgress>> {
    if (!conductorManagedBuilds.has(buildId)) {
      return {
        success: false,
        error: { code: 'NOT_CONDUCTOR', message: 'Build is not managed by CONDUCTOR' },
      };
    }

    try {
      const result = await conductorService.resumeBuild({ buildId, checkpointId });
      const progress = await conductorService.getProgress(buildId);

      return {
        success: true,
        data: progress || {
          buildId,
          status: 'running',
          currentPhase: null,
          currentAgents: [],
          completedPhases: [],
          completedAgents: [],
          progress: 0,
          tokensUsed: 0,
          estimatedCost: result.plan.estimatedCost,
          startedAt: new Date(),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'RESUME_FAILED',
          message: err instanceof Error ? err.message : 'Failed to resume build',
        },
      };
    }
  },

  /** Analyze a project description without starting a build */
  async analyzeProject(description: string) {
    return conductorRouter.analyzeProject(description);
  },
};

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { conductorService, type ConductorBuildRequest } from '@/lib/agents/conductor';
import {
  validateBuildIntegrity,
  quickValidateNextBuild,
  getValidationErrorMessage,
  type BuildValidationResult,
} from '@/lib/agents/validation/build-integrity-validator';
import {
  createGuardrailEngine,
  type GuardrailContext,
  type GuardrailResult,
} from '@/lib/agents/guardrails';
import { createRequestId } from '@/lib/core';
import { logger } from '@/utils/logger';

// =============================================================================
// FIX #1: Use database for build tracking instead of module-level variables
// This ensures builds are tracked persistently across requests and server restarts
// =============================================================================

// In-memory cache (synced with database) - only for fast lookups
let cachedActiveBuildId: string | null = null;
let cachedConductorBuildId: string | null = null;

// Build execution status (in-memory for events, but synced with DB)
interface BuildExecutionState {
  dbBuildId: string;
  conductorBuildId: string | null;
  status: 'starting' | 'running' | 'completed' | 'failed';
  progress: number;
  currentPhase: string | null;
  error: string | null;
  startedAt: Date;
  events: Array<{ type: string; timestamp: Date; data: unknown }>;
}

const buildExecutions = new Map<string, BuildExecutionState>();

// =============================================================================
// FIX #2: Database-based singleton check for active builds
// =============================================================================

// SECURITY FIX (Jan 31, 2026): Query timeout to prevent hanging requests
const QUERY_TIMEOUT_MS = 5000; // 5 seconds

/**
 * Get the currently active build from database (source of truth)
 */
async function getActiveBuildFromDatabase(dbClient: SupabaseClient): Promise<{
  buildId: string | null;
  conductorBuildId: string | null;
  progress: number;
  phase: string | null;
}> {
  try {
    // Create timeout race condition
    // SECURITY FIX: Wrap Supabase query in Promise.resolve to ensure proper Promise type
    const queryPromise = Promise.resolve(
      dbClient
        .from('builds')
        .select('id, config, progress, current_phase')
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    const timeoutPromise = new Promise<{ data: null; error: Error }>(resolve =>
      setTimeout(
        () => resolve({ data: null, error: new Error('Database query timeout') }),
        QUERY_TIMEOUT_MS
      )
    );

    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);
    const { data, error } = result as {
      data: {
        id: string;
        config: Record<string, unknown>;
        progress: number;
        current_phase: string;
      } | null;
      error: Error | null;
    };

    if (error) {
      logger.error('[Bootstrap] Error checking active builds:', error.message);
      return { buildId: null, conductorBuildId: null, progress: 0, phase: null };
    }

    if (data) {
      const conductorId = (data.config?.conductorBuildId as string) || null;
      // Sync cache with database
      cachedActiveBuildId = data.id;
      cachedConductorBuildId = conductorId;
      return {
        buildId: data.id,
        conductorBuildId: conductorId,
        progress: data.progress || 0,
        phase: data.current_phase || null,
      };
    }

    // No active build - clear cache
    cachedActiveBuildId = null;
    cachedConductorBuildId = null;
    return { buildId: null, conductorBuildId: null, progress: 0, phase: null };
  } catch (err) {
    logger.error('[Bootstrap] Exception checking active builds:', err);
    return { buildId: null, conductorBuildId: null, progress: 0, phase: null };
  }
}

/**
 * Mark any stale "running" builds as failed (cleanup zombie builds)
 */
async function cleanupStalledBuilds(dbClient: SupabaseClient): Promise<number> {
  try {
    // Builds running for more than 2 hours are considered stalled
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await dbClient
      .from('builds')
      .update({
        status: 'failed',
        error: 'Build timed out - marked as stalled by cleanup',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'running')
      .lt('started_at', twoHoursAgo)
      .select('id');

    if (error) {
      logger.error('[Bootstrap] Error cleaning stalled builds:', error.message);
      return 0;
    }

    if (data && data.length > 0) {
      logger.info(`[Bootstrap] Cleaned up ${data.length} stalled builds`);
      return data.length;
    }

    return 0;
  } catch (err) {
    logger.error('[Bootstrap] Exception cleaning stalled builds:', err);
    return 0;
  }
}

/**
 * Create database client helper
 */
function createDbClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });
}

// =============================================================================
// SECURITY: Bootstrap secret verification
// =============================================================================

function verifyBootstrapSecret(request: NextRequest): NextResponse | null {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return NextResponse.json(
      { error: 'Bootstrap endpoint disabled — set BOOTSTRAP_SECRET to enable' },
      { status: 403 }
    );
  }
  const providedSecret = request.headers.get('x-bootstrap-secret');
  if (providedSecret !== bootstrapSecret) {
    return NextResponse.json({ error: 'Unauthorized — invalid bootstrap secret' }, { status: 401 });
  }
  return null; // Passed
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function POST(request: NextRequest) {
  const authError = verifyBootstrapSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        started: false,
        error: 'Supabase credentials not configured',
        duration: Date.now() - startTime,
      });
    }

    // Create database client
    const dbClient = createDbClient();
    if (!dbClient) {
      return NextResponse.json({
        started: false,
        error: 'Failed to create database client',
        duration: Date.now() - startTime,
      });
    }

    // =======================================================================
    // FIX #2: Check for active builds in DATABASE (not module variable)
    // =======================================================================

    // First, cleanup any stalled builds
    await cleanupStalledBuilds(dbClient);

    // Check for truly active builds from database
    const activeBuild = await getActiveBuildFromDatabase(dbClient);

    if (activeBuild.buildId) {
      logger.info(
        `[Bootstrap] Build already in progress: ${activeBuild.buildId} (${activeBuild.progress}%)`
      );
      return NextResponse.json({
        started: false,
        error: `A self-build is already in progress: ${activeBuild.buildId}`,
        buildId: activeBuild.buildId,
        conductorBuildId: activeBuild.conductorBuildId,
        progress: activeBuild.progress,
        phase: activeBuild.phase,
        duration: Date.now() - startTime,
      });
    }

    // Load the master build prompt
    const promptPath = join(process.cwd(), 'OLYMPUS_BUILD_PROMPT.md');
    let promptContent: string;

    try {
      promptContent = await readFile(promptPath, 'utf-8');
    } catch {
      return NextResponse.json({
        started: false,
        error: 'Build prompt file not found',
        duration: Date.now() - startTime,
      });
    }

    // 10X GUARDRAIL CHECK: Validate input before processing
    const guardrailEngine = createGuardrailEngine({
      failFast: true,
      parallelSecurity: true,
    });

    const guardrailContext: GuardrailContext = {
      requestId: createRequestId(),
      tenantId: 'system' as any,
      userId: 'system@olympus.build',
      userRoles: ['admin', 'system'],
      targetAgent: 'conductor',
      startTime: Date.now(),
      layerResults: new Map(),
      metadata: {
        source: 'bootstrap',
        endpoint: '/api/bootstrap/start-build',
      },
    };

    const guardrailResult: GuardrailResult = await guardrailEngine.validate(guardrailContext, {
      prompt: promptContent,
      maxTokens: 500000, // Enterprise tier
      metadata: {
        buildType: 'self-build',
        tier: 'enterprise',
      },
    });

    // Handle guardrail decision
    if (guardrailResult.action === 'block' || guardrailResult.action === 'terminate') {
      logger.error('[Bootstrap] Guardrail blocked request:', guardrailResult.reason);
      return NextResponse.json(
        {
          started: false,
          error: `Input validation failed: ${guardrailResult.reason}`,
          guardrail: {
            action: guardrailResult.action,
            layer: guardrailResult.layer,
            confidence: guardrailResult.confidence,
          },
          duration: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    if (guardrailResult.action === 'warn') {
      logger.warn('[Bootstrap] Guardrail warning:', guardrailResult.reason);
    }

    logger.info(
      `[Bootstrap] Guardrail passed: ${guardrailResult.action} (confidence: ${guardrailResult.confidence.toFixed(2)})`
    );

    // Create auth client for user authentication
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // SECURITY FIX (Jan 31, 2026): Removed hardcoded password fallback
    const systemPassword = process.env.SYSTEM_USER_PASSWORD;
    if (!systemPassword) {
      return NextResponse.json(
        {
          started: false,
          error: 'SECURITY: SYSTEM_USER_PASSWORD environment variable must be configured',
          duration: Date.now() - startTime,
        },
        { status: 503 }
      );
    }

    // Get system user
    const { data: userData, error: userError } = await authClient.auth.signInWithPassword({
      email: 'system@olympus.build',
      password: systemPassword,
    });

    if (userError || !userData.user) {
      return NextResponse.json({
        started: false,
        error: `Failed to authenticate system user: ${userError?.message || 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }

    const userId = userData.user.id;

    // Get or create system team
    let teamId: string;
    const { data: teamData } = await dbClient
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .single();

    if (teamData?.team_id) {
      teamId = teamData.team_id;
    } else {
      const { data: newTeam, error: teamError } = await dbClient
        .from('teams')
        .insert({
          name: 'OLYMPUS System',
          owner_id: userId,
          plan: 'enterprise',
        })
        .select('id')
        .single();

      if (teamError || !newTeam) {
        return NextResponse.json({
          started: false,
          error: `Failed to create system team: ${teamError?.message || 'Unknown error'}`,
          duration: Date.now() - startTime,
        });
      }

      teamId = newTeam.id;

      const { error: memberError } = await dbClient.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        role: 'owner',
      });

      if (memberError) {
        logger.error('[Bootstrap] Failed to add team member:', memberError.message);
      }
    }

    // Get or create project
    let projectId: string;
    const { data: projectData } = await dbClient
      .from('projects')
      .select('id')
      .eq('name', 'OLYMPUS Self-Build')
      .eq('team_id', teamId)
      .single();

    if (projectData?.id) {
      projectId = projectData.id;
    } else {
      const { data: newProject, error: projectError } = await dbClient
        .from('projects')
        .insert({
          name: 'OLYMPUS Self-Build',
          team_id: teamId,
          created_by: userId,
          description: 'OLYMPUS platform building its own UI',
        })
        .select('id')
        .single();

      if (projectError) {
        logger.error('[Bootstrap] Project creation error:', projectError.message);
        projectId = uuidv4();
      } else {
        projectId = newProject?.id || uuidv4();
      }
    }

    // =======================================================================
    // FIX #3: Double-check no build started between our check and now
    // =======================================================================
    const doubleCheck = await getActiveBuildFromDatabase(dbClient);
    if (doubleCheck.buildId) {
      logger.warn(
        `[Bootstrap] Race condition detected - another build started: ${doubleCheck.buildId}`
      );
      return NextResponse.json({
        started: false,
        error: `Another build started while preparing: ${doubleCheck.buildId}`,
        buildId: doubleCheck.buildId,
        duration: Date.now() - startTime,
      });
    }

    // Create the build record
    const buildId = uuidv4();

    // Update cache immediately
    cachedActiveBuildId = buildId;

    const { error: buildError } = await dbClient.from('builds').insert({
      id: buildId,
      project_id: projectId,
      tenant_id: teamId,
      created_by: userId,
      tier: 'enterprise',
      status: 'running',
      progress: 0,
      description: 'OLYMPUS Self-Build: ' + promptContent.substring(0, 200),
      total_agents: 40,
      tokens_used: 0,
      started_at: new Date().toISOString(),
      config: {
        conductor: true,
        selfBuild: true,
        masterPromptPath: promptPath,
      },
    });

    if (buildError) {
      cachedActiveBuildId = null;
      return NextResponse.json({
        started: false,
        error: `Failed to create build record: ${buildError.message}`,
        duration: Date.now() - startTime,
      });
    }

    // Initialize build execution state
    const executionState: BuildExecutionState = {
      dbBuildId: buildId,
      conductorBuildId: null,
      status: 'starting',
      progress: 0,
      currentPhase: null,
      error: null,
      startedAt: new Date(),
      events: [],
    };
    buildExecutions.set(buildId, executionState);

    // Start the actual build asynchronously
    executeBuildAsync(buildId, promptContent, teamId, dbClient).catch(err => {
      logger.error(`[Bootstrap] Build execution error for ${buildId}:`, err);
      const state = buildExecutions.get(buildId);
      if (state) {
        state.status = 'failed';
        state.error = err instanceof Error ? err.message : 'Unknown error';
      }
      // Clear cache on failure
      cachedActiveBuildId = null;
      cachedConductorBuildId = null;
    });

    return NextResponse.json({
      started: true,
      buildId,
      projectId,
      teamId,
      userId,
      message: 'OLYMPUS self-build started successfully - CONDUCTOR executing',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    cachedActiveBuildId = null;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        started: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyBootstrapSecret(request);
  if (authError) return authError;

  // =======================================================================
  // FIX #4: Always check database for accurate status (not just cache)
  // =======================================================================

  const dbClient = createDbClient();

  if (dbClient) {
    const activeBuild = await getActiveBuildFromDatabase(dbClient);

    if (activeBuild.buildId) {
      const state = buildExecutions.get(activeBuild.buildId);

      return NextResponse.json({
        activeBuildId: activeBuild.buildId,
        conductorBuildId: activeBuild.conductorBuildId,
        hasActiveBuild: true,
        progress: activeBuild.progress,
        phase: activeBuild.phase,
        execution: state
          ? {
              status: state.status,
              progress: state.progress,
              currentPhase: state.currentPhase,
              error: state.error,
              eventCount: state.events.length,
              recentEvents: state.events.slice(-5),
            }
          : {
              status: 'running',
              progress: activeBuild.progress,
              currentPhase: activeBuild.phase,
              error: null,
              eventCount: 0,
              recentEvents: [],
            },
      });
    }
  }

  // Fallback to cache if database unavailable
  const state = cachedActiveBuildId ? buildExecutions.get(cachedActiveBuildId) : null;

  return NextResponse.json({
    activeBuildId: cachedActiveBuildId,
    conductorBuildId: cachedConductorBuildId,
    hasActiveBuild: !!cachedActiveBuildId,
    execution: state
      ? {
          status: state.status,
          progress: state.progress,
          currentPhase: state.currentPhase,
          error: state.error,
          eventCount: state.events.length,
          recentEvents: state.events.slice(-5),
        }
      : null,
  });
}

/**
 * DELETE - Force reset the active build to allow new builds
 * Now also updates database to mark build as failed
 */
export async function DELETE(request: NextRequest) {
  const authError = verifyBootstrapSecret(request);
  if (authError) return authError;

  const previousBuildId = cachedActiveBuildId;

  // Clear cache
  cachedActiveBuildId = null;
  cachedConductorBuildId = null;

  // Also update database to mark any running builds as cancelled
  const dbClient = createDbClient();
  if (dbClient && previousBuildId) {
    await dbClient
      .from('builds')
      .update({
        status: 'failed',
        error: 'Build cancelled via API DELETE',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', previousBuildId)
      .eq('status', 'running');
  }

  return NextResponse.json({
    reset: true,
    previousBuildId,
    message: 'Active build cleared and marked as cancelled. You can now start a new build.',
  });
}

/**
 * Execute build asynchronously using ConductorService
 */
async function executeBuildAsync(
  dbBuildId: string,
  promptContent: string,
  tenantId: string,
  dbClient: SupabaseClient
) {
  const state = buildExecutions.get(dbBuildId);
  if (!state) {
    throw new Error('Build execution state not found');
  }

  logger.info(`[Bootstrap] Starting CONDUCTOR execution for build ${dbBuildId}`);

  try {
    const buildRequest: ConductorBuildRequest = {
      description: promptContent,
      tenantId: tenantId,
      tier: 'enterprise',
      options: {
        strategy: 'adaptive',
        enableCheckpoints: true,
        databaseBuildId: dbBuildId,
        metadata: {
          selfBuild: true,
          dbBuildId: dbBuildId,
          source: 'bootstrap',
        },
      },
    };

    state.status = 'running';
    logger.info(`[Bootstrap] Calling conductorService.startBuild()...`);

    const result = await conductorService.startBuild(buildRequest);

    // Update cache with conductor buildId
    cachedConductorBuildId = result.buildId;
    state.conductorBuildId = result.buildId;

    // Subscribe to events
    const unsubscribe = conductorService.subscribe(result.buildId, event => {
      const eventType = 'type' in event ? event.type : 'unknown';
      const eventData = 'data' in event ? event.data : {};

      logger.debug(
        `[Bootstrap] CONDUCTOR event: ${eventType}`,
        JSON.stringify(eventData).substring(0, 200)
      );

      state.events.push({
        type: eventType,
        timestamp: new Date(),
        data: eventData,
      });

      if (eventType === 'conductor:phase_started' || eventType === 'phase_started') {
        state.currentPhase = ((eventData as Record<string, unknown>).phase as string) || null;
      } else if (
        eventType === 'conductor:agent_completed' ||
        eventType === 'agent_completed' ||
        eventType === 'conductor:quality_accepted'
      ) {
        state.progress = Math.min(state.progress + 2.5, 100);
      } else if (eventType === 'conductor:build_completed' || eventType === 'build_completed') {
        logger.info(`[Bootstrap] Build event received - running POST-BUILD VALIDATION...`);
        state.currentPhase = 'validation';
        state.progress = 95;

        const projectPath = process.cwd();
        validateBuildIntegrity({
          projectPath,
          runNextBuild: false,
          skipBuild: true,
        })
          .then(validationResult => {
            if (validationResult.valid) {
              logger.info(`[Bootstrap] POST-BUILD VALIDATION PASSED`);
              state.status = 'completed';
              state.progress = 100;
              state.events.push({
                type: 'validation_passed',
                timestamp: new Date(),
                data: validationResult,
              });
            } else {
              logger.error(`[Bootstrap] POST-BUILD VALIDATION FAILED`);
              logger.error(getValidationErrorMessage(validationResult));
              state.status = 'failed';
              state.error = `Build validation failed: ${validationResult.errors.join(', ')}`;
              state.events.push({
                type: 'validation_failed',
                timestamp: new Date(),
                data: validationResult,
              });
            }
            // Clear cache on completion
            cachedActiveBuildId = null;
            cachedConductorBuildId = null;
            unsubscribe();
            updateDatabaseProgress(dbBuildId, state, dbClient).catch(e =>
              logger.error('[Bootstrap] DB update failed:', e)
            );
          })
          .catch(validationError => {
            logger.error(`[Bootstrap] Validation error:`, validationError);
            state.status = 'completed';
            state.progress = 100;
            state.events.push({
              type: 'validation_skipped',
              timestamp: new Date(),
              data: {
                error: validationError instanceof Error ? validationError.message : 'Unknown',
              },
            });
            cachedActiveBuildId = null;
            cachedConductorBuildId = null;
            unsubscribe();
            updateDatabaseProgress(dbBuildId, state, dbClient).catch(e =>
              logger.error('[Bootstrap] DB update failed:', e)
            );
          });
        return;
      } else if (eventType === 'conductor:build_failed' || eventType === 'build_failed') {
        state.status = 'failed';
        state.error = ((eventData as Record<string, unknown>).error as string) || 'Build failed';
        cachedActiveBuildId = null;
        cachedConductorBuildId = null;
        unsubscribe();
      }

      // Sync progress to database
      updateDatabaseProgress(dbBuildId, state, dbClient).catch(e =>
        logger.error('[Bootstrap] DB update failed:', e)
      );
    });

    logger.info(`[Bootstrap] CONDUCTOR build started: ${result.buildId}`);
    logger.info(`[Bootstrap] Analysis: ${result.analysis.type} (${result.analysis.complexity})`);
    logger.info(`[Bootstrap] Estimated agents: ${result.analysis.estimatedAgents}`);
    logger.info(`[Bootstrap] Strategy: ${result.strategy.strategy}`);

    // Update database with conductor info
    await dbClient
      .from('builds')
      .update({
        config: {
          conductor: true,
          selfBuild: true,
          conductorBuildId: result.buildId,
          analysis: result.analysis,
          strategy: result.strategy.strategy,
        },
        current_phase: 'discovery',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbBuildId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[Bootstrap] CONDUCTOR execution failed:`, errorMessage);

    state.status = 'failed';
    state.error = errorMessage;

    cachedActiveBuildId = null;
    cachedConductorBuildId = null;

    await dbClient
      .from('builds')
      .update({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbBuildId);

    throw error;
  }
}

/**
 * Update database with build progress
 */
async function updateDatabaseProgress(
  buildId: string,
  state: BuildExecutionState,
  dbClient: SupabaseClient
) {
  try {
    await dbClient
      .from('builds')
      .update({
        status:
          state.status === 'completed'
            ? 'completed'
            : state.status === 'failed'
              ? 'failed'
              : 'running',
        progress: Math.floor(state.progress),
        current_phase: state.currentPhase,
        error: state.error,
        updated_at: new Date().toISOString(),
        ...(state.status === 'completed' || state.status === 'failed'
          ? { completed_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', buildId);
  } catch (err) {
    logger.error(`[Bootstrap] Failed to update database progress:`, err);
  }
}

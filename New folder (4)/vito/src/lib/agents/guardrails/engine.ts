/**
 * OLYMPUS 10X - Guardrail Engine
 *
 * Main orchestrator for the 4-layer guardrail system.
 * Coordinates layers, tripwires, and produces final decisions.
 */

import {
  GUARDRAIL_LAYERS,
  TIMEOUTS,
  THRESHOLDS,
  createRequestId,
  log,
  metrics,
  events,
  EVENT_TYPES,
  GuardrailTimeoutError,
} from '@/lib/core';
import type {
  GuardrailInput,
  GuardrailResult,
  GuardrailLayer,
  GuardrailAction,
  TripwireConfig,
  RequestId,
  TenantId,
} from '@/lib/core';
import type {
  GuardrailEngine as IGuardrailEngine,
  GuardrailPipelineConfig,
  GuardrailContext,
  LayerValidationResult,
  ApiLayerConfig,
  SecurityLayerConfig,
  SemanticLayerConfig,
  AgentLayerConfig,
} from './types';
import { ApiLayer, createApiLayer } from './layers/api';
import { SecurityLayer, createSecurityLayer } from './layers/security';
import { SemanticLayer, createSemanticLayer } from './layers/semantic';
import { AgentLayer, createAgentLayer } from './layers/agent';
import { TripwireSystem, createTripwireSystem } from './tripwire';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: GuardrailPipelineConfig = {
  api: {
    enabled: true,
    timeoutMs: TIMEOUTS.GUARDRAIL_MS,
    continueOnError: false,
    options: {},
  },
  security: {
    enabled: true,
    timeoutMs: TIMEOUTS.GUARDRAIL_MS,
    continueOnError: false,
    options: {
      detectSqlInjection: true,
      detectXss: true,
      detectCommandInjection: true,
      detectPii: true,
      detectPromptInjection: true,
    },
  },
  semantic: {
    enabled: true,
    timeoutMs: TIMEOUTS.GUARDRAIL_MS,
    continueOnError: true, // Don't block on semantic failures
    options: {
      minQualityScore: THRESHOLDS.MIN_QUALITY_SCORE,
      blockedIntents: ['harmful_intent'],
    },
  },
  agent: {
    enabled: true,
    timeoutMs: TIMEOUTS.GUARDRAIL_MS,
    continueOnError: true,
    options: {},
  },
  tripwires: [],
  parallelSecurity: true,
  failFast: true,
  pipelineTimeoutMs: TIMEOUTS.GUARDRAIL_MS * 4,
};

// ============================================================================
// GUARDRAIL ENGINE IMPLEMENTATION
// ============================================================================

export class GuardrailEngine implements IGuardrailEngine {
  private config: GuardrailPipelineConfig;
  private apiLayer: ApiLayer;
  private securityLayer: SecurityLayer;
  private semanticLayer: SemanticLayer;
  private agentLayer: AgentLayer;
  private tripwireSystem: TripwireSystem;

  constructor(config: Partial<GuardrailPipelineConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);

    // Initialize layers
    this.apiLayer = createApiLayer();
    this.securityLayer = createSecurityLayer();
    this.semanticLayer = createSemanticLayer();
    this.agentLayer = createAgentLayer();

    // Initialize tripwire system
    this.tripwireSystem = createTripwireSystem(this.config.tripwires);
  }

  /**
   * Validate input through all configured layers.
   */
  async validate(
    context: GuardrailContext,
    input: GuardrailInput
  ): Promise<GuardrailResult> {
    const startTime = Date.now();

    // Ensure context has required fields
    context.requestId = context.requestId || createRequestId();
    context.startTime = context.startTime || startTime;
    context.layerResults = context.layerResults || new Map();
    context.metadata = context.metadata || {};

    log.debug('Guardrail validation started', {
      requestId: context.requestId,
      hasPrompt: !!input.prompt,
      promptLength: input.prompt?.length || 0,
    });

    try {
      // 1. Check tripwires first (fastest path to block)
      const tripwireResult = this.tripwireSystem.check(context, input);
      if (tripwireResult.triggered) {
        return this.createResult(
          tripwireResult.action,
          'tripwire',
          tripwireResult.confidence,
          tripwireResult.reason,
          context,
          startTime,
          { tripwire: tripwireResult }
        );
      }

      // 2. Run layers in order (with optional parallel security)
      const layerOrder: GuardrailLayer[] = [
        GUARDRAIL_LAYERS.API,
        GUARDRAIL_LAYERS.SECURITY,
        GUARDRAIL_LAYERS.SEMANTIC,
        GUARDRAIL_LAYERS.AGENT,
      ];

      for (const layer of layerOrder) {
        const layerResult = await this.runLayerWithTimeout(layer, context, input);
        context.layerResults.set(layer, layerResult);

        // Check if we should stop (fail-fast)
        if (this.shouldStop(layerResult)) {
          return this.createResult(
            layerResult.action,
            layer,
            layerResult.confidence,
            layerResult.reason,
            context,
            startTime,
            { layerResult }
          );
        }
      }

      // 3. All layers passed - determine final result
      return this.computeFinalResult(context, startTime);
    } catch (error) {
      // Pipeline error
      log.error('Guardrail pipeline error', error as Error, {
        requestId: context.requestId,
      });

      metrics.count('guardrails.pipeline_error', 1, {
        tenantId: context.tenantId as string || 'unknown',
      });

      // Return block on error for safety
      return this.createResult(
        'block',
        'api',
        0.5,
        `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
        context,
        startTime
      );
    }
  }

  /**
   * Check a specific layer only.
   */
  async checkLayer(
    layer: GuardrailLayer,
    context: GuardrailContext,
    input: GuardrailInput
  ): Promise<LayerValidationResult> {
    return this.runLayerWithTimeout(layer, context, input);
  }

  /**
   * Add a custom tripwire.
   */
  addTripwire(tripwire: TripwireConfig): void {
    this.tripwireSystem.addTripwire(tripwire);
    this.config.tripwires.push(tripwire);
  }

  /**
   * Remove a tripwire by name.
   */
  removeTripwire(name: string): boolean {
    const removed = this.tripwireSystem.removeTripwire(name);
    if (removed) {
      this.config.tripwires = this.config.tripwires.filter(t => t.name !== name);
    }
    return removed;
  }

  /**
   * Get current configuration.
   */
  getConfig(): GuardrailPipelineConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<GuardrailPipelineConfig>): void {
    this.config = this.mergeConfig(this.config, config);

    // Update tripwire system if tripwires changed
    if (config.tripwires) {
      this.tripwireSystem = createTripwireSystem(this.config.tripwires);
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async runLayerWithTimeout(
    layer: GuardrailLayer,
    context: GuardrailContext,
    input: GuardrailInput
  ): Promise<LayerValidationResult> {
    const layerConfig = this.getLayerConfig(layer);

    if (!layerConfig.enabled) {
      return {
        layer,
        action: 'allow',
        confidence: 1.0,
        reason: `Layer '${layer}' is disabled`,
        durationMs: 0,
      };
    }

    const layerHandler = this.getLayerHandler(layer);

    // Check bypass
    if (layerHandler.shouldBypass(context)) {
      return {
        layer,
        action: 'allow',
        confidence: 1.0,
        reason: `Layer '${layer}' bypassed`,
        durationMs: 0,
      };
    }

    // Run with timeout
    const timeoutMs = layerConfig.timeoutMs || TIMEOUTS.GUARDRAIL_MS;

    try {
      const result = await Promise.race([
        layerHandler.validate(context, input, layerConfig),
        this.createTimeout(timeoutMs, layer),
      ]);

      // Record metrics
      metrics.duration(`guardrails.layer.${layer}`, result.durationMs, {
        action: result.action,
        tenantId: context.tenantId as string || 'unknown',
      });

      return result;
    } catch (error) {
      if (error instanceof GuardrailTimeoutError) {
        return {
          layer,
          action: layerConfig.continueOnError ? 'warn' : 'block',
          confidence: 0.5,
          reason: `Layer '${layer}' timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs,
        };
      }
      throw error;
    }
  }

  private getLayerConfig(layer: GuardrailLayer): ApiLayerConfig | SecurityLayerConfig | SemanticLayerConfig | AgentLayerConfig {
    switch (layer) {
      case GUARDRAIL_LAYERS.API:
        return this.config.api;
      case GUARDRAIL_LAYERS.SECURITY:
        return this.config.security;
      case GUARDRAIL_LAYERS.SEMANTIC:
        return this.config.semantic;
      case GUARDRAIL_LAYERS.AGENT:
        return this.config.agent;
      default:
        return this.config.api;
    }
  }

  private getLayerHandler(layer: GuardrailLayer): ApiLayer | SecurityLayer | SemanticLayer | AgentLayer {
    switch (layer) {
      case GUARDRAIL_LAYERS.API:
        return this.apiLayer;
      case GUARDRAIL_LAYERS.SECURITY:
        return this.securityLayer;
      case GUARDRAIL_LAYERS.SEMANTIC:
        return this.semanticLayer;
      case GUARDRAIL_LAYERS.AGENT:
        return this.agentLayer;
      default:
        return this.apiLayer;
    }
  }

  private createTimeout(ms: number, layer: GuardrailLayer): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new GuardrailTimeoutError(ms));
      }, ms);
    });
  }

  private shouldStop(result: LayerValidationResult): boolean {
    if (!this.config.failFast) return false;

    // Stop on block, halt, or terminate
    return ['block', 'halt', 'terminate'].includes(result.action);
  }

  private computeFinalResult(
    context: GuardrailContext,
    startTime: number
  ): GuardrailResult {
    // Collect all results
    const results = Array.from(context.layerResults.values());

    // Find worst action
    const actionPriority: Record<GuardrailAction, number> = {
      allow: 0,
      warn: 1,
      block: 2,
      halt: 3,
      terminate: 4,
    };

    let worstResult = results[0];
    for (const result of results) {
      if (actionPriority[result.action] > actionPriority[worstResult.action]) {
        worstResult = result;
      }
    }

    // If all passed, return allow
    if (worstResult.action === 'allow') {
      return this.createResult(
        'allow',
        worstResult.layer,
        this.computeAverageConfidence(results),
        'All guardrail checks passed',
        context,
        startTime,
        { layerResults: results }
      );
    }

    // Return worst result
    return this.createResult(
      worstResult.action,
      worstResult.layer,
      worstResult.confidence,
      worstResult.reason,
      context,
      startTime,
      { layerResults: results }
    );
  }

  private computeAverageConfidence(results: LayerValidationResult[]): number {
    if (results.length === 0) return 1.0;
    const sum = results.reduce((acc, r) => acc + r.confidence, 0);
    return sum / results.length;
  }

  private createResult(
    action: GuardrailAction,
    layer: GuardrailLayer | 'tripwire',
    confidence: number,
    reason: string,
    context: GuardrailContext,
    startTime: number,
    metadata?: Record<string, unknown>
  ): GuardrailResult {
    const durationMs = Date.now() - startTime;

    // Emit event
    events.emit(EVENT_TYPES.GUARDRAIL_CHECKED, {
      requestId: context.requestId,
      action,
      layer,
      confidence,
      durationMs,
    });

    // Record metrics
    metrics.duration('guardrails.total', durationMs, {
      action,
      layer,
      tenantId: context.tenantId as string || 'unknown',
    });

    metrics.count(`guardrails.action.${action}`, 1, {
      layer,
      tenantId: context.tenantId as string || 'unknown',
    });

    log.info('Guardrail validation complete', {
      requestId: context.requestId,
      action,
      layer,
      confidence,
      durationMs,
    });

    return {
      action,
      layer: layer as GuardrailLayer,
      confidence,
      reason,
      durationMs,
      metadata: {
        requestId: context.requestId,
        durationMs,
        ...metadata,
      },
    };
  }

  private mergeConfig(
    base: GuardrailPipelineConfig,
    overrides: Partial<GuardrailPipelineConfig>
  ): GuardrailPipelineConfig {
    return {
      api: { ...base.api, ...overrides.api },
      security: { ...base.security, ...overrides.security },
      semantic: { ...base.semantic, ...overrides.semantic },
      agent: { ...base.agent, ...overrides.agent },
      tripwires: overrides.tripwires || base.tripwires,
      parallelSecurity: overrides.parallelSecurity ?? base.parallelSecurity,
      failFast: overrides.failFast ?? base.failFast,
      pipelineTimeoutMs: overrides.pipelineTimeoutMs ?? base.pipelineTimeoutMs,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new guardrail engine instance.
 */
export function createGuardrailEngine(
  config?: Partial<GuardrailPipelineConfig>
): GuardrailEngine {
  return new GuardrailEngine(config);
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick validation without creating context.
 * Creates a minimal context automatically.
 */
export async function validateInput(
  input: GuardrailInput,
  options?: {
    userId?: string;
    tenantId?: TenantId;
    targetAgent?: string;
    userRoles?: string[];
  }
): Promise<GuardrailResult> {
  const engine = createGuardrailEngine();

  const context: GuardrailContext = {
    requestId: createRequestId(),
    tenantId: options?.tenantId,
    userId: options?.userId,
    userRoles: options?.userRoles,
    targetAgent: options?.targetAgent,
    startTime: Date.now(),
    layerResults: new Map(),
    metadata: {},
  };

  return engine.validate(context, input);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_CONFIG };

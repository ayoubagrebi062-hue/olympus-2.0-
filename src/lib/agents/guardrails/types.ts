/**
 * OLYMPUS 10X - Guardrail Types
 *
 * Type definitions for the 4-layer guardrail system.
 * Integrates with core types from @/lib/core.
 */

import type {
  GuardrailAction,
  GuardrailLayer,
  GuardrailResult,
  GuardrailInput,
  TripwireConfig,
  RequestId,
  TenantId,
} from '@/lib/core';

// ============================================================================
// LAYER CONFIGURATION
// ============================================================================

/**
 * Configuration for individual guardrail layers.
 */
export interface LayerConfig {
  /** Whether this layer is enabled */
  enabled: boolean;

  /** Timeout for this layer in milliseconds */
  timeoutMs: number;

  /** Continue to next layer even if this layer fails */
  continueOnError: boolean;

  /** Custom options for the layer */
  options?: Record<string, unknown>;
}

/**
 * Configuration for the API layer.
 */
export interface ApiLayerConfig extends LayerConfig {
  options?: {
    /** Maximum input size in bytes */
    maxInputSizeBytes?: number;

    /** Maximum prompt length in characters */
    maxPromptLength?: number;

    /** Rate limit: requests per minute */
    rateLimitPerMinute?: number;

    /** Allowed content types */
    allowedContentTypes?: string[];
  };
}

/**
 * Configuration for the Security layer.
 */
export interface SecurityLayerConfig extends LayerConfig {
  options?: {
    /** Enable SQL injection detection */
    detectSqlInjection?: boolean;

    /** Enable XSS detection */
    detectXss?: boolean;

    /** Enable command injection detection */
    detectCommandInjection?: boolean;

    /** Enable path traversal detection */
    detectPathTraversal?: boolean;

    /** Enable PII detection */
    detectPii?: boolean;

    /** Enable prompt injection detection */
    detectPromptInjection?: boolean;

    /** Custom patterns to detect */
    customPatterns?: SecurityPattern[];
  };
}

/**
 * Configuration for the Semantic layer.
 */
export interface SemanticLayerConfig extends LayerConfig {
  options?: {
    /** Minimum prompt quality score (0-1) */
    minQualityScore?: number;

    /** Blocked intents */
    blockedIntents?: string[];

    /** Required intent categories */
    requiredIntents?: string[];

    /** Maximum scope complexity */
    maxScopeComplexity?: number;
  };
}

/**
 * Configuration for the Agent layer.
 */
export interface AgentLayerConfig extends LayerConfig {
  options?: {
    /** Per-agent rule configurations */
    agentRules?: Record<string, AgentRuleSet>;

    /** Default capability restrictions */
    defaultCapabilities?: string[];

    /** Resource limits per agent */
    resourceLimits?: AgentResourceLimits;
  };
}

// ============================================================================
// SECURITY PATTERNS
// ============================================================================

/**
 * Custom security pattern for detection.
 */
export interface SecurityPattern {
  /** Pattern name for identification */
  name: string;

  /** Pattern to match (regex or function) */
  pattern: RegExp | ((input: string) => boolean);

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Action to take when matched */
  action: GuardrailAction;

  /** Human-readable description */
  description: string;
}

/**
 * Detection result from security scanning.
 */
export interface SecurityDetection {
  /** Type of security issue detected */
  type:
    | 'sql_injection'
    | 'xss'
    | 'command_injection'
    | 'path_traversal'
    | 'pii'
    | 'prompt_injection'
    | 'custom';

  /** Pattern name that matched */
  patternName: string;

  /** Confidence of detection (0-1) */
  confidence: number;

  /** Where in the input the issue was found */
  location?: {
    start: number;
    end: number;
    snippet: string;
  };

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// AGENT RULES
// ============================================================================

/**
 * Rule set for a specific agent.
 */
export interface AgentRuleSet {
  /** Allowed input patterns */
  allowedPatterns?: RegExp[];

  /** Blocked input patterns */
  blockedPatterns?: RegExp[];

  /** Maximum input size for this agent */
  maxInputSize?: number;

  /** Allowed capabilities */
  allowedCapabilities?: string[];

  /** Blocked capabilities */
  blockedCapabilities?: string[];

  /** Custom validation function */
  customValidator?: (input: GuardrailInput) => Promise<boolean>;
}

/**
 * Resource limits for agents.
 */
export interface AgentResourceLimits {
  /** Maximum concurrent executions */
  maxConcurrent: number;

  /** Maximum execution time in milliseconds */
  maxExecutionTimeMs: number;

  /** Maximum memory usage in bytes */
  maxMemoryBytes: number;

  /** Maximum output size in bytes */
  maxOutputSizeBytes: number;
}

// ============================================================================
// PIPELINE CONFIGURATION
// ============================================================================

/**
 * Full guardrail pipeline configuration.
 */
export interface GuardrailPipelineConfig {
  /** API layer configuration */
  api: ApiLayerConfig;

  /** Security layer configuration */
  security: SecurityLayerConfig;

  /** Semantic layer configuration */
  semantic: SemanticLayerConfig;

  /** Agent layer configuration */
  agent: AgentLayerConfig;

  /** Tripwire configurations */
  tripwires: TripwireConfig[];

  /** Run security checks in parallel */
  parallelSecurity: boolean;

  /** Stop processing on first block */
  failFast: boolean;

  /** Global timeout for entire pipeline */
  pipelineTimeoutMs: number;
}

// ============================================================================
// VALIDATION CONTEXT
// ============================================================================

/**
 * Context passed through the guardrail pipeline.
 */
export interface GuardrailContext {
  /** Request identifier */
  requestId: RequestId;

  /** Tenant identifier */
  tenantId?: TenantId;

  /** User identifier */
  userId?: string;

  /** User roles for bypass checking */
  userRoles?: string[];

  /** Target agent (if applicable) */
  targetAgent?: string;

  /** Start time of validation */
  startTime: number;

  /** Accumulated results from each layer */
  layerResults: Map<GuardrailLayer, LayerValidationResult>;

  /** Metadata collected during validation */
  metadata: Record<string, unknown>;
}

/**
 * Result from a single layer validation.
 */
export interface LayerValidationResult {
  /** The layer that produced this result */
  layer: GuardrailLayer;

  /** Action determined by this layer */
  action: GuardrailAction;

  /** Confidence in the decision (0-1) */
  confidence: number;

  /** Reason for the decision */
  reason: string;

  /** Time taken in milliseconds */
  durationMs: number;

  /** Detections found (for security layer) */
  detections?: SecurityDetection[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate limit entry for tracking.
 */
export interface RateLimitEntry {
  /** Number of requests in window */
  count: number;

  /** Window start time */
  windowStart: number;

  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Rate limiter interface.
 */
export interface RateLimiter {
  /** Check if request is allowed */
  check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;

  /** Record a request */
  record(key: string): Promise<void>;

  /** Reset limits for a key */
  reset(key: string): Promise<void>;
}

// ============================================================================
// GUARDRAIL ENGINE INTERFACE
// ============================================================================

/**
 * Main guardrail engine interface.
 */
export interface GuardrailEngine {
  /**
   * Validate input through all configured layers.
   */
  validate(context: GuardrailContext, input: GuardrailInput): Promise<GuardrailResult>;

  /**
   * Check a specific layer only.
   */
  checkLayer(
    layer: GuardrailLayer,
    context: GuardrailContext,
    input: GuardrailInput
  ): Promise<LayerValidationResult>;

  /**
   * Add a custom tripwire.
   */
  addTripwire(tripwire: TripwireConfig): void;

  /**
   * Remove a tripwire by name.
   */
  removeTripwire(name: string): boolean;

  /**
   * Get current configuration.
   */
  getConfig(): GuardrailPipelineConfig;

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<GuardrailPipelineConfig>): void;
}

// ============================================================================
// LAYER INTERFACE
// ============================================================================

/**
 * Interface for individual guardrail layers.
 */
export interface GuardrailLayerHandler {
  /** Layer identifier */
  readonly layer: GuardrailLayer;

  /** Layer name for logging */
  readonly name: string;

  /**
   * Validate input for this layer.
   */
  validate(
    context: GuardrailContext,
    input: GuardrailInput,
    config: LayerConfig
  ): Promise<LayerValidationResult>;

  /**
   * Check if this layer should be bypassed.
   */
  shouldBypass(context: GuardrailContext): boolean;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { GuardrailAction, GuardrailLayer, GuardrailResult, GuardrailInput, TripwireConfig };

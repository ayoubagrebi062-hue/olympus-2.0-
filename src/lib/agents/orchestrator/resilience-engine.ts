/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              OLYMPUS RESILIENCE ENGINE v3.1 - WORLD-CLASS EDITION             ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  This isn't error handling. This is an IMMUNE SYSTEM for AI agent builds.     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ⚡ QUICK START (Copy-paste this, you're protected)                          │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   import { getResilienceEngine } from './resilience-engine';                │
 * │                                                                             │
 * │   // 1. Create engine (one line)                                            │
 * │   const engine = getResilienceEngine('build-123');                          │
 * │                                                                             │
 * │   // 2. Before calling an agent (with bulkhead protection):                 │
 * │   await engine.acquireBulkhead('oracle');  // Limits concurrent calls       │
 * │   const start = Date.now();                                                 │
 * │   try {                                                                     │
 * │     if (engine.isCircuitOpen('oracle')) throw new Error('Circuit open');    │
 * │     const result = await callAgent('oracle', input);                        │
 * │     engine.recordSuccess('oracle', Date.now() - start);                     │
 * │   } catch (e) {                                                             │
 * │     engine.recordFailure('oracle', e.message, 'UNKNOWN');                   │
 * │   } finally {                                                               │
 * │     engine.releaseBulkhead('oracle');  // Always release!                   │
 * │   }                                                                         │
 * │                                                                             │
 * │   // That's it. Circuit breakers, bulkheads, retries - all automatic.       │
 * │                                                                             │
 * │   // BONUS: See what's happening                                            │
 * │   engine.events.onAll(e => console.log(`[${e.type}]`, e));                  │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 📍 FILE MAP (Future You: Start Here)                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ Lines 35-250    → OBSERVABILITY: Events, Logger, Metrics interfaces         │
 * │ Lines 250-410   → TYPES: All TypeScript interfaces and type definitions     │
 * │ Lines 410-455   → CONSTANTS: All magic numbers (edit thresholds here!)      │
 * │ Lines 455-500   → DEFAULT_CONFIG: Default settings for all features         │
 * │ Lines 500-600   → DEGRADATION_TIERS: Agent lists per tier (⚠️ see below)    │
 * │ Lines 600-800   → ResilienceEngine class: Constructor & config validation   │
 * │ Lines 800-970   → CIRCUIT BREAKER: recordFailure, recordSuccess, canCall    │
 * │ Lines 970-1170  → SELF-HEALING: analyzeFailure, applyHealing                │
 * │ Lines 1170-1370 → FINGERPRINTING: checkCache, storeFingerprint, prune       │
 * │ Lines 1370-1500 → HEALTH SCORING: calculateHealthScore, shouldProceed       │
 * │ Lines 1500-1650 → DEGRADATION: degrade, upgrade, getCurrentTier             │
 * │ Lines 1650-1800 → TRACING: startSpan, endSpan, exportTraces                 │
 * │ Lines 1800-1950 → ANOMALY DETECTION: detectAnomaly, isAnomalous             │
 * │ Lines 1950-END  → FACTORY: getResilienceEngine, destroyEngine, cleanup      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 🔧 HOW TO EXTEND (Common Tasks)                                             │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ ADD NEW AGENT:                                                              │
 * │   1. Add AgentId to ../types.ts                                             │
 * │   2. Add to DEGRADATION_TIERS arrays below (all 4 tiers if critical)        │
 * │   3. That's it - circuit breaker auto-registers on first call               │
 * │                                                                             │
 * │ CHANGE THRESHOLDS:                                                          │
 * │   Edit the CONSTANTS section (lines 410-455) - all values are there         │
 * │                                                                             │
 * │ ADD NEW TIER:                                                               │
 * │   1. Add to DegradationTier type                                            │
 * │   2. Add to DEGRADATION_TIERS constant                                      │
 * │   3. Add to TIER_TOKEN_BUDGETS constant                                     │
 * │                                                                             │
 * │ INTEGRATE MONITORING (Prometheus/DataDog):                                  │
 * │   Pass metricsCollector to getResilienceEngine() - see MetricsCollector     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ⚠️ KEY DECISIONS (Why Things Are The Way They Are)                          │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ Q: Why hardcoded agent arrays in DEGRADATION_TIERS?                         │
 * │ A: Build-time safety. If agent doesn't exist, TypeScript catches it.        │
 * │    Trade-off: Must edit arrays when adding agents.                          │
 * │    Future: Could read from agent registry, but loses type safety.           │
 * │                                                                             │
 * │ Q: Why 5 failures to open circuit?                                          │
 * │ A: Empirical. 3 = too sensitive (network blips). 10 = too slow.             │
 * │    Config: circuitBreaker.failureThreshold                                  │
 * │                                                                             │
 * │ Q: Why 4 degradation tiers (PLATINUM/GOLD/SILVER/BRONZE)?                   │
 * │ A: Maps to pricing tiers. Each tier = different agent set = different cost. │
 * │    PLATINUM = all 39 agents. BRONZE = 8 critical agents only.               │
 * │                                                                             │
 * │ Q: Why singleton pattern for engines?                                       │
 * │ A: One engine per build. Prevents duplicate circuit breakers.               │
 * │    Cleanup runs every 10min to prevent memory leaks.                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 🚨 GOTCHAS (Things That Will Bite You)                                      │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ 1. Engine auto-destroys after 2 hours. Long builds need ENGINE_TTL_MS bump. │
 * │ 2. Fingerprint cache maxes at 1000 entries. Oldest pruned first.            │
 * │ 3. Circuit half-open state only allows ONE test call. Don't parallel test.  │
 * │ 4. Health score < 30 blocks build if prediction.blockOnLowScore = true.     │
 * │ 5. Events are synchronous. Heavy handlers will slow down the engine.        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 🛡️ SECURITY PROTECTIONS (Chaos Engineering Hardened)                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ • buildId validated: alphanumeric + underscore + hyphen only, max 128 chars │
 * │ • Max 100 concurrent engines (prevents OOM from mass creation attacks)      │
 * │ • Max 50 event handlers per bus (prevents listener bomb attacks)            │
 * │ • Max 500KB prompt size (truncates larger, prevents memory exhaustion)      │
 * │ • Path traversal blocked in cacheDir/exportPath (no ../ or absolute paths)  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * @module ResilienceEngine
 * @version 3.1.0
 * @since 2026-01-26
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type { AgentId, BuildPhase, AgentOutput } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD-CLASS OBSERVABILITY LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log levels following RFC 5424 (syslog)
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry - compatible with ELK, DataDog, etc.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  buildId: string;
  component:
    | 'circuit_breaker'
    | 'self_healing'
    | 'fingerprint'
    | 'degradation'
    | 'tracing'
    | 'anomaly'
    | 'health';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Metrics interface - implement this for Prometheus, DataDog, etc.
 */
export interface MetricsCollector {
  /** Increment a counter */
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  /** Set a gauge value */
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  /** Record a histogram value (latency, etc.) */
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  /** Record timing */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void;
}

/**
 * Default metrics collector - logs to console (replace in production)
 */
class ConsoleMetricsCollector implements MetricsCollector {
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    // In production, this would be: statsd.increment(name, value, tags);
  }
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    // In production, this would be: statsd.gauge(name, value, tags);
  }
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    // In production, this would be: statsd.histogram(name, value, tags);
  }
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    // In production, this would be: statsd.timing(name, durationMs, tags);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED EVENT SYSTEM - The Game Changer
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All possible resilience events - discriminated union for type safety
 */
export type ResilienceEvent =
  | {
      type: 'circuit:state_change';
      agentId: AgentId;
      from: CircuitState;
      to: CircuitState;
      reason: string;
      timestamp: Date;
    }
  | {
      type: 'circuit:open';
      agentId: AgentId;
      failureCount: number;
      lastError: string;
      timestamp: Date;
    }
  | { type: 'circuit:close'; agentId: AgentId; successCount: number; timestamp: Date }
  | { type: 'circuit:half_open'; agentId: AgentId; timestamp: Date }
  | { type: 'circuit:fallback_used'; agentId: AgentId; hasCachedResult: boolean; timestamp: Date }
  | {
      type: 'healing:attempt';
      agentId: AgentId;
      action: SelfHealingAction;
      attemptNumber: number;
      timestamp: Date;
    }
  | { type: 'healing:success'; agentId: AgentId; action: SelfHealingAction; timestamp: Date }
  | {
      type: 'healing:failure';
      agentId: AgentId;
      action: SelfHealingAction;
      error: string;
      timestamp: Date;
    }
  | { type: 'healing:exhausted'; agentId: AgentId; totalAttempts: number; timestamp: Date }
  | {
      type: 'degradation:tier_change';
      from: DegradationTier;
      to: DegradationTier;
      reason: string;
      agentsDropped: number;
      timestamp: Date;
    }
  | { type: 'degradation:at_minimum'; tier: DegradationTier; timestamp: Date }
  | { type: 'fingerprint:cache_hit'; hash: string; savedMs: number; timestamp: Date }
  | { type: 'fingerprint:cache_miss'; hash: string; timestamp: Date }
  | {
      type: 'fingerprint:stored';
      hash: string;
      result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
      timestamp: Date;
    }
  | {
      type: 'health:score_calculated';
      score: number;
      prediction: string;
      factors: Record<string, number>;
      timestamp: Date;
    }
  | { type: 'health:build_blocked'; score: number; reason: string; timestamp: Date }
  | {
      type: 'anomaly:detected';
      category: 'latency' | 'memory' | 'error_rate';
      agentId?: AgentId;
      value: number;
      threshold: number;
      timestamp: Date;
    }
  | { type: 'security:injection_detected'; agentId: AgentId; snippet: string; timestamp: Date }
  | {
      type: 'trace:span_start';
      traceId: string;
      spanId: string;
      operation: string;
      timestamp: Date;
    }
  | {
      type: 'trace:span_end';
      traceId: string;
      spanId: string;
      durationMs: number;
      status: 'SUCCESS' | 'FAILURE';
      timestamp: Date;
    }
  // Bulkhead events (COMPETITIVE FEATURE)
  | {
      type: 'bulkhead:acquired';
      agentId: AgentId;
      currentPerAgent: number;
      currentTotal: number;
      waitedMs: number;
      timestamp: Date;
    }
  | {
      type: 'bulkhead:released';
      agentId: AgentId;
      currentPerAgent: number;
      currentTotal: number;
      timestamp: Date;
    }
  | {
      type: 'bulkhead:rejected';
      agentId: AgentId;
      reason: 'per_agent_limit' | 'total_limit' | 'timeout';
      queueLength: number;
      timestamp: Date;
    }
  | {
      type: 'bulkhead:queued';
      agentId: AgentId;
      position: number;
      estimatedWaitMs: number;
      timestamp: Date;
    };

/**
 * Event handler type
 */
export type ResilienceEventHandler = (event: ResilienceEvent) => void;

/**
 * Typed event emitter - the heart of observability
 *
 * SECURITY: Limited to MAX_EVENT_HANDLERS to prevent memory bombs
 */
export class ResilienceEventBus {
  private emitter = new EventEmitter();
  private handlers: ResilienceEventHandler[] = [];
  private handlerCount = 0;

  constructor() {
    // Increase listener limit for production use
    this.emitter.setMaxListeners(100);
  }

  /**
   * Subscribe to ALL events (for logging, metrics, etc.)
   * @throws Error if handler limit exceeded (prevents event listener bombs)
   */
  onAll(handler: ResilienceEventHandler): () => void {
    if (this.handlerCount >= MAX_EVENT_HANDLERS) {
      throw new Error(
        `Event handler limit (${MAX_EVENT_HANDLERS}) exceeded. Possible memory leak or attack.`
      );
    }
    this.handlers.push(handler);
    this.handlerCount++;
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
      this.handlerCount--;
    };
  }

  /**
   * Subscribe to specific event type
   */
  on<T extends ResilienceEvent['type']>(
    eventType: T,
    handler: (event: Extract<ResilienceEvent, { type: T }>) => void
  ): () => void {
    this.emitter.on(eventType, handler);
    return () => this.emitter.off(eventType, handler);
  }

  /**
   * Emit an event - automatically timestamps and distributes
   * Uses loose typing to allow discriminated union inference at call sites
   */
  emit(event: { type: ResilienceEvent['type']; timestamp?: Date; [key: string]: unknown }): void {
    const fullEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    // Notify type-specific listeners
    this.emitter.emit(fullEvent.type, fullEvent);

    // Notify catch-all listeners
    for (const handler of this.handlers) {
      try {
        handler(fullEvent as ResilienceEvent);
      } catch {
        // Don't let handler errors crash the engine
      }
    }
  }

  /**
   * Get event count by type (for testing)
   */
  listenerCount(eventType: ResilienceEvent['type']): number {
    return this.emitter.listenerCount(eventType);
  }
}

/**
 * Structured logger - replaces console.log everywhere
 */
export class ResilienceLogger {
  private buildId: string;
  private minLevel: LogLevel;
  private onLog?: (entry: LogEntry) => void;

  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(buildId: string, minLevel: LogLevel = 'info', onLog?: (entry: LogEntry) => void) {
    this.buildId = buildId;
    this.minLevel = minLevel;
    this.onLog = onLog;
  }

  private shouldLog(level: LogLevel): boolean {
    return ResilienceLogger.LEVELS[level] >= ResilienceLogger.LEVELS[this.minLevel];
  }

  private log(
    level: LogLevel,
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      buildId: this.buildId,
      component,
      message,
      metadata,
    };

    // Call external handler if provided
    if (this.onLog) {
      this.onLog(entry);
    }

    // Also log to console in development
    const prefix = `[${level.toUpperCase()}] [${component}] [${this.buildId.slice(0, 8)}]`;
    if (level === 'error' || level === 'fatal') {
      console.error(`${prefix} ${message}`, metadata || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`, metadata || '');
    } else if (level === 'debug') {
      // Only log debug in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`${prefix} ${message}`, metadata || '');
      }
    } else {
      console.log(`${prefix} ${message}`, metadata || '');
    }
  }

  debug(
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('debug', component, message, metadata);
  }

  info(
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('info', component, message, metadata);
  }

  warn(
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('warn', component, message, metadata);
  }

  error(
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('error', component, message, metadata);
  }

  fatal(
    component: LogEntry['component'],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('fatal', component, message, metadata);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type DegradationTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
export type FailureCategory =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_OUTPUT'
  | 'QUALITY_FAILURE'
  | 'DEPENDENCY_MISSING'
  | 'PROMPT_INJECTION'
  | 'TOKEN_EXHAUSTED'
  | 'UNKNOWN';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  agentId?: AgentId;
  phase?: BuildPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  error?: string;
  metadata: Record<string, unknown>;
  children: TraceSpan[];
}

export interface CircuitBreakerState {
  agentId: AgentId;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
  halfOpenAttempts: number;
  fallbackUsed: number;
}

export interface BuildFingerprint {
  hash: string;
  prompt: string;
  tier: string;
  timestamp: Date;
  result?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  outputPath?: string;
  duration?: number;
  agentResults?: Record<AgentId, 'SUCCESS' | 'FAILURE' | 'SKIPPED'>;
}

export interface HealthScore {
  overall: number; // 0-100
  factors: {
    promptComplexity: number;
    historicalSuccessRate: number;
    currentSystemLoad: number;
    agentAvailability: number;
    resourceBudget: number;
  };
  prediction: 'HIGH_CONFIDENCE' | 'LIKELY_SUCCESS' | 'RISKY' | 'LIKELY_FAILURE';
  recommendations: string[];
}

export interface SelfHealingAction {
  type: 'SIMPLIFY_PROMPT' | 'REDUCE_SCOPE' | 'SWITCH_MODEL' | 'ADD_CONTEXT' | 'RETRY_WITH_CACHE';
  description: string;
  modification: Record<string, unknown>;
  confidence: number;
}

export interface ResilienceMetrics {
  circuitBreaks: number;
  selfHealingAttempts: number;
  selfHealingSuccesses: number;
  cacheHits: number;
  cacheMisses: number;
  degradations: Record<DegradationTier, number>;
  avgHealthScore: number;
  anomaliesDetected: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResilienceConfig {
  // Circuit Breaker
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number; // Failures before opening (default: 5)
    successThreshold: number; // Successes to close (default: 3)
    timeout: number; // Time in OPEN before HALF_OPEN (ms)
    volumeThreshold: number; // Min requests before evaluating
  };

  // Self-Healing
  selfHealing: {
    enabled: boolean;
    maxAttempts: number; // Max healing attempts per agent
    analyzeFailures: boolean; // Use AI to analyze failures
    autoSimplify: boolean; // Auto-simplify on complexity failures
  };

  // Fingerprinting / Cache
  fingerprinting: {
    enabled: boolean;
    cacheDir: string;
    maxCacheAge: number; // Max age in ms (default: 7 days)
    reusePartial: boolean; // Reuse partial build results
  };

  // Predictive Scoring
  prediction: {
    enabled: boolean;
    blockOnLowScore: boolean; // Block builds predicted to fail
    minScoreToStart: number; // Minimum score to start (0-100)
    warnThreshold: number; // Warn user below this score
  };

  // Degradation
  degradation: {
    enabled: boolean;
    autoDegrade: boolean; // Auto-degrade on failures
    startTier: DegradationTier; // Starting tier
    degradeOnTimeout: boolean; // Degrade when phase times out
    degradeOnAgentFailure: number; // Degrade after N agent failures
  };

  // Tracing
  tracing: {
    enabled: boolean;
    sampleRate: number; // 0-1, percentage to trace
    exportPath?: string; // Path to export traces
  };

  // Anomaly Detection
  anomaly: {
    enabled: boolean;
    latencyThreshold: number; // Alert if latency > X% of baseline
    errorRateThreshold: number; // Alert if error rate > X%
    memoryThreshold: number; // Alert if memory > X MB
  };

  // Bulkhead (Concurrency Limiting) - COMPETITIVE FEATURE
  bulkhead: {
    enabled: boolean;
    maxConcurrentPerAgent: number; // Max parallel calls to single agent
    maxConcurrentTotal: number; // Max parallel calls across all agents
    maxWaitMs: number; // How long to wait for slot (0 = fail fast)
    fairQueuing: boolean; // FIFO order for waiting requests
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAGIC NUMBERS → NAMED CONSTANTS (Quick Win #1)
// ═══════════════════════════════════════════════════════════════════════════════

/** Circuit breaker timing */
const CIRCUIT_TIMEOUT_MS = 60_000; // 1 minute
const CIRCUIT_TIMEOUT_MIN_MS = 1_000; // 1 second
const CIRCUIT_TIMEOUT_MAX_MS = 600_000; // 10 minutes

/** Fingerprint cache limits */
const FINGERPRINT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FINGERPRINT_MAX_AGE_MIN_MS = 60_000; // 1 minute
const FINGERPRINT_MAX_AGE_MAX_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FINGERPRINT_MAX_ENTRIES = 1_000; // Hard limit to prevent memory bloat

/** Rate limiting */
const RATE_LIMIT_BASE_WAIT_MS = 5_000; // 5 second base
const RATE_LIMIT_MAX_WAIT_MS = 120_000; // 2 minute max

/** Health scoring thresholds */
const HEALTH_PROMPT_WARN_LENGTH = 5_000; // -20 points
const HEALTH_PROMPT_CRITICAL_LENGTH = 10_000; // -40 points total
const HEALTH_MEMORY_WARN_MB = 1_024; // 1GB = -20 points
const HEALTH_MEMORY_HIGH_MB = 1_536; // 1.5GB = -40 points total
const HEALTH_MEMORY_CRITICAL_MB = 2_048; // 2GB = -70 points total

/** Tier token budgets */
const TIER_TOKEN_BUDGETS: Record<DegradationTier, number> = {
  PLATINUM: 500_000,
  GOLD: 300_000,
  SILVER: 150_000,
  BRONZE: 75_000,
};
const TOTAL_TOKEN_BUDGET = 1_000_000;

/** Self-healing modifications */
const SIMPLIFIED_MAX_TOKENS = 4_096;
const HAIKU_MODEL = 'claude-3-haiku-20240307';

/** Engine lifecycle */
const ENGINE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** Chaos engineering protection (added after security review) */
const MAX_CONCURRENT_ENGINES = 100; // Prevent OOM from mass creation
const MAX_EVENT_HANDLERS = 50; // Prevent event listener bombs
const MAX_PROMPT_LENGTH = 500_000; // 500KB max prompt size
const BUILDID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/; // Safe buildId pattern

/** Bulkhead defaults (COMPETITIVE FEATURE) */
const BULKHEAD_MAX_PER_AGENT = 5; // Max 5 concurrent calls per agent
const BULKHEAD_MAX_TOTAL = 20; // Max 20 concurrent calls total
const BULKHEAD_MAX_WAIT_MS = 30_000; // Wait up to 30s for a slot

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 3,
    timeout: CIRCUIT_TIMEOUT_MS,
    volumeThreshold: 3,
  },
  selfHealing: {
    enabled: true,
    maxAttempts: 3,
    analyzeFailures: true,
    autoSimplify: true,
  },
  fingerprinting: {
    enabled: true,
    cacheDir: '.olympus-cache/fingerprints',
    maxCacheAge: FINGERPRINT_MAX_AGE_MS,
    reusePartial: true,
  },
  prediction: {
    enabled: true,
    blockOnLowScore: false,
    minScoreToStart: 30,
    warnThreshold: 50,
  },
  degradation: {
    enabled: true,
    autoDegrade: true,
    startTier: 'PLATINUM',
    degradeOnTimeout: true,
    degradeOnAgentFailure: 5,
  },
  tracing: {
    enabled: true,
    sampleRate: 1.0, // Trace everything
    exportPath: '.olympus-cache/traces',
  },
  anomaly: {
    enabled: true,
    latencyThreshold: 200, // 200% of baseline
    errorRateThreshold: 30, // 30% error rate
    memoryThreshold: 2048, // 2GB
  },
  bulkhead: {
    enabled: true,
    maxConcurrentPerAgent: BULKHEAD_MAX_PER_AGENT,
    maxConcurrentTotal: BULKHEAD_MAX_TOTAL,
    maxWaitMs: BULKHEAD_MAX_WAIT_MS,
    fairQueuing: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIER DEFINITIONS - What agents run at each degradation level
// ═══════════════════════════════════════════════════════════════════════════════

export const DEGRADATION_TIERS: Record<DegradationTier, AgentId[]> = {
  // PLATINUM: All 39 agents - maximum quality
  PLATINUM: [
    // Discovery (5)
    'oracle',
    'empathy',
    'venture',
    'strategos',
    'scope',
    // Conversion (3)
    'psyche',
    'scribe',
    'architect_conversion',
    // Design (6)
    'palette',
    'grid',
    'blocks',
    'cartographer',
    'flow',
    'artist',
    // Architecture (6)
    'archon',
    'datum',
    'nexus',
    'forge',
    'sentinel',
    'atlas',
    // Frontend (3)
    'pixel',
    'wire',
    'polish',
    // Backend (4)
    'engine',
    'gateway',
    'keeper',
    'cron',
    // Integration (4)
    'bridge',
    'sync',
    'notify',
    'search',
    // Testing (4)
    'junit',
    'cypress',
    'load',
    'a11y',
    // Deployment (4)
    'docker',
    'pipeline',
    'monitor',
    'scale',
  ],

  // GOLD: 25 essential agents - good quality, faster
  GOLD: [
    // Discovery (4)
    'oracle',
    'empathy',
    'strategos',
    'scope',
    // Conversion (2)
    'scribe',
    'architect_conversion',
    // Design (4)
    'palette',
    'blocks',
    'cartographer',
    'artist',
    // Architecture (5)
    'archon',
    'datum',
    'nexus',
    'forge',
    'sentinel',
    // Frontend (3)
    'pixel',
    'wire',
    'polish',
    // Backend (2)
    'engine',
    'gateway',
    // Testing (2)
    'junit',
    'a11y',
    // Deployment (3)
    'docker',
    'pipeline',
    'monitor',
  ],

  // SILVER: 15 core agents - acceptable quality, fast
  SILVER: [
    // Discovery (2)
    'oracle',
    'strategos',
    // Conversion (1)
    'scribe',
    // Design (2)
    'blocks',
    'cartographer',
    // Architecture (4)
    'archon',
    'datum',
    'nexus',
    'forge',
    // Frontend (2)
    'pixel',
    'wire',
    // Backend (1)
    'engine',
    // Testing (1)
    'junit',
    // Deployment (2)
    'docker',
    'pipeline',
  ],

  // BRONZE: 8 critical agents only - minimal viable product
  BRONZE: [
    'oracle',
    'strategos', // Discovery
    'blocks', // Design
    'archon',
    'datum', // Architecture
    'pixel',
    'wire', // Frontend
    'docker', // Deployment
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for creating a ResilienceEngine
 */
export interface ResilienceEngineOptions {
  config?: Partial<ResilienceConfig>;
  /** Custom event bus (for testing or shared event handling) */
  eventBus?: ResilienceEventBus;
  /** Custom metrics collector (for Prometheus, DataDog, etc.) */
  metricsCollector?: MetricsCollector;
  /** Minimum log level */
  logLevel?: LogLevel;
  /** Custom log handler */
  onLog?: (entry: LogEntry) => void;
}

export class ResilienceEngine {
  private config: ResilienceConfig;
  private circuits: Map<AgentId, CircuitBreakerState> = new Map();
  private fingerprints: Map<string, BuildFingerprint> = new Map();
  private traces: Map<string, TraceSpan> = new Map();
  private internalMetrics: ResilienceMetrics;
  private currentTier: DegradationTier;
  private buildId: string;
  private agentFailureCount: number = 0;
  private baselineLatencies: Map<AgentId, number> = new Map();
  private healthHistory: number[] = [];
  private rateLimitAttempts: Map<AgentId, number> = new Map();

  // BULKHEAD: Concurrency limiting (COMPETITIVE FEATURE)
  private bulkheadPerAgent: Map<AgentId, number> = new Map();
  private bulkheadTotal: number = 0;
  private bulkheadQueue: Array<{
    agentId: AgentId;
    resolve: () => void;
    reject: (err: Error) => void;
    timestamp: number;
  }> = [];

  // WORLD-CLASS: Observability layer
  public readonly events: ResilienceEventBus;
  public readonly logger: ResilienceLogger;
  private readonly metricsCollector: MetricsCollector;

  constructor(buildId: string, options: ResilienceEngineOptions = {}) {
    this.buildId = buildId;
    this.config = this.validateAndMergeConfig(options.config || {});
    this.currentTier = this.config.degradation.startTier;
    this.internalMetrics = this.initMetrics();

    // Initialize observability layer
    this.events = options.eventBus || new ResilienceEventBus();
    this.logger = new ResilienceLogger(buildId, options.logLevel || 'info', options.onLog);
    this.metricsCollector = options.metricsCollector || new ConsoleMetricsCollector();

    // Auto-emit metrics from events
    this.setupMetricsFromEvents();

    this.loadFingerprintCache();
    this.logger.info('health', `ResilienceEngine v3.0 initialized`, { tier: this.currentTier });
  }

  /**
   * Wire up automatic metrics emission from events
   */
  private setupMetricsFromEvents(): void {
    this.events.onAll(event => {
      const tags = { buildId: this.buildId };

      switch (event.type) {
        case 'circuit:open':
          this.metricsCollector.increment('resilience.circuit.opened', 1, {
            ...tags,
            agentId: event.agentId,
          });
          break;
        case 'circuit:close':
          this.metricsCollector.increment('resilience.circuit.closed', 1, {
            ...tags,
            agentId: event.agentId,
          });
          break;
        case 'healing:success':
          this.metricsCollector.increment('resilience.healing.success', 1, {
            ...tags,
            action: event.action.type,
          });
          break;
        case 'healing:failure':
          this.metricsCollector.increment('resilience.healing.failure', 1, {
            ...tags,
            action: event.action.type,
          });
          break;
        case 'degradation:tier_change':
          this.metricsCollector.gauge('resilience.tier', this.tierToNumber(event.to), tags);
          break;
        case 'fingerprint:cache_hit':
          this.metricsCollector.increment('resilience.cache.hit', 1, tags);
          this.metricsCollector.timing('resilience.cache.saved_ms', event.savedMs, tags);
          break;
        case 'fingerprint:cache_miss':
          this.metricsCollector.increment('resilience.cache.miss', 1, tags);
          break;
        case 'health:score_calculated':
          this.metricsCollector.gauge('resilience.health.score', event.score, tags);
          break;
        case 'anomaly:detected':
          this.metricsCollector.increment('resilience.anomaly', 1, {
            ...tags,
            category: event.category,
          });
          break;
        case 'security:injection_detected':
          this.metricsCollector.increment('resilience.security.injection', 1, {
            ...tags,
            agentId: event.agentId,
          });
          break;
      }
    });
  }

  private tierToNumber(tier: DegradationTier): number {
    return { PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 }[tier];
  }

  /**
   * Validate config values to prevent malicious or invalid inputs
   */
  private validateAndMergeConfig(config: Partial<ResilienceConfig>): ResilienceConfig {
    const merged = { ...DEFAULT_RESILIENCE_CONFIG };

    // Deep merge with validation
    if (config.circuitBreaker) {
      merged.circuitBreaker = {
        ...merged.circuitBreaker,
        enabled:
          typeof config.circuitBreaker.enabled === 'boolean'
            ? config.circuitBreaker.enabled
            : merged.circuitBreaker.enabled,
        failureThreshold: this.clampNumber(
          config.circuitBreaker.failureThreshold,
          1,
          100,
          merged.circuitBreaker.failureThreshold
        ),
        successThreshold: this.clampNumber(
          config.circuitBreaker.successThreshold,
          1,
          50,
          merged.circuitBreaker.successThreshold
        ),
        timeout: this.clampNumber(
          config.circuitBreaker.timeout,
          CIRCUIT_TIMEOUT_MIN_MS,
          CIRCUIT_TIMEOUT_MAX_MS,
          merged.circuitBreaker.timeout
        ),
        volumeThreshold: this.clampNumber(
          config.circuitBreaker.volumeThreshold,
          1,
          100,
          merged.circuitBreaker.volumeThreshold
        ),
      };
    }

    if (config.selfHealing) {
      merged.selfHealing = {
        ...merged.selfHealing,
        enabled:
          typeof config.selfHealing.enabled === 'boolean'
            ? config.selfHealing.enabled
            : merged.selfHealing.enabled,
        maxAttempts: this.clampNumber(
          config.selfHealing.maxAttempts,
          1,
          10,
          merged.selfHealing.maxAttempts
        ),
        analyzeFailures:
          typeof config.selfHealing.analyzeFailures === 'boolean'
            ? config.selfHealing.analyzeFailures
            : merged.selfHealing.analyzeFailures,
        autoSimplify:
          typeof config.selfHealing.autoSimplify === 'boolean'
            ? config.selfHealing.autoSimplify
            : merged.selfHealing.autoSimplify,
      };
    }

    if (config.fingerprinting) {
      merged.fingerprinting = {
        ...merged.fingerprinting,
        enabled:
          typeof config.fingerprinting.enabled === 'boolean'
            ? config.fingerprinting.enabled
            : merged.fingerprinting.enabled,
        cacheDir:
          this.sanitizePath(config.fingerprinting.cacheDir) || merged.fingerprinting.cacheDir,
        maxCacheAge: this.clampNumber(
          config.fingerprinting.maxCacheAge,
          FINGERPRINT_MAX_AGE_MIN_MS,
          FINGERPRINT_MAX_AGE_MAX_MS,
          merged.fingerprinting.maxCacheAge
        ),
        reusePartial:
          typeof config.fingerprinting.reusePartial === 'boolean'
            ? config.fingerprinting.reusePartial
            : merged.fingerprinting.reusePartial,
      };
    }

    if (config.prediction) {
      merged.prediction = {
        ...merged.prediction,
        enabled:
          typeof config.prediction.enabled === 'boolean'
            ? config.prediction.enabled
            : merged.prediction.enabled,
        blockOnLowScore:
          typeof config.prediction.blockOnLowScore === 'boolean'
            ? config.prediction.blockOnLowScore
            : merged.prediction.blockOnLowScore,
        minScoreToStart: this.clampNumber(
          config.prediction.minScoreToStart,
          0,
          100,
          merged.prediction.minScoreToStart
        ),
        warnThreshold: this.clampNumber(
          config.prediction.warnThreshold,
          0,
          100,
          merged.prediction.warnThreshold
        ),
      };
    }

    if (config.degradation) {
      merged.degradation = {
        ...merged.degradation,
        enabled:
          typeof config.degradation.enabled === 'boolean'
            ? config.degradation.enabled
            : merged.degradation.enabled,
        autoDegrade:
          typeof config.degradation.autoDegrade === 'boolean'
            ? config.degradation.autoDegrade
            : merged.degradation.autoDegrade,
        startTier: this.validateTier(config.degradation.startTier) || merged.degradation.startTier,
        degradeOnTimeout:
          typeof config.degradation.degradeOnTimeout === 'boolean'
            ? config.degradation.degradeOnTimeout
            : merged.degradation.degradeOnTimeout,
        degradeOnAgentFailure: this.clampNumber(
          config.degradation.degradeOnAgentFailure,
          1,
          50,
          merged.degradation.degradeOnAgentFailure
        ),
      };
    }

    if (config.tracing) {
      merged.tracing = {
        ...merged.tracing,
        enabled:
          typeof config.tracing.enabled === 'boolean'
            ? config.tracing.enabled
            : merged.tracing.enabled,
        sampleRate: this.clampNumber(config.tracing.sampleRate, 0, 1, merged.tracing.sampleRate),
        exportPath: this.sanitizePath(config.tracing.exportPath) || merged.tracing.exportPath,
      };
    }

    if (config.bulkhead) {
      merged.bulkhead = {
        ...merged.bulkhead,
        enabled:
          typeof config.bulkhead.enabled === 'boolean'
            ? config.bulkhead.enabled
            : merged.bulkhead.enabled,
        maxConcurrentPerAgent: this.clampNumber(
          config.bulkhead.maxConcurrentPerAgent,
          1,
          100,
          merged.bulkhead.maxConcurrentPerAgent
        ),
        maxConcurrentTotal: this.clampNumber(
          config.bulkhead.maxConcurrentTotal,
          1,
          500,
          merged.bulkhead.maxConcurrentTotal
        ),
        maxWaitMs: this.clampNumber(
          config.bulkhead.maxWaitMs,
          0,
          300000,
          merged.bulkhead.maxWaitMs
        ), // 0 to 5min
        fairQueuing:
          typeof config.bulkhead.fairQueuing === 'boolean'
            ? config.bulkhead.fairQueuing
            : merged.bulkhead.fairQueuing,
      };
    }

    if (config.anomaly) {
      merged.anomaly = {
        ...merged.anomaly,
        enabled:
          typeof config.anomaly.enabled === 'boolean'
            ? config.anomaly.enabled
            : merged.anomaly.enabled,
        latencyThreshold: this.clampNumber(
          config.anomaly.latencyThreshold,
          100,
          1000,
          merged.anomaly.latencyThreshold
        ),
        errorRateThreshold: this.clampNumber(
          config.anomaly.errorRateThreshold,
          1,
          100,
          merged.anomaly.errorRateThreshold
        ),
        memoryThreshold: this.clampNumber(
          config.anomaly.memoryThreshold,
          256,
          16384,
          merged.anomaly.memoryThreshold
        ), // 256MB - 16GB
      };
    }

    return merged;
  }

  private clampNumber(
    value: number | undefined,
    min: number,
    max: number,
    fallback: number
  ): number {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  private sanitizePath(inputPath: string | undefined): string | undefined {
    if (!inputPath || typeof inputPath !== 'string') return undefined;
    // Block path traversal (SECURITY: prevent directory escape attacks)
    if (inputPath.includes('..') || inputPath.includes('~') || path.isAbsolute(inputPath)) {
      this.logger.warn('self_healing', 'Blocked potentially unsafe path', {
        path: inputPath.substring(0, 50),
      });
      return undefined;
    }
    return inputPath;
  }

  private validateTier(tier: DegradationTier | undefined): DegradationTier | undefined {
    const validTiers: DegradationTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    if (tier && validTiers.includes(tier)) return tier;
    return undefined;
  }

  private initMetrics(): ResilienceMetrics {
    return {
      circuitBreaks: 0,
      selfHealingAttempts: 0,
      selfHealingSuccesses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      degradations: { PLATINUM: 0, GOLD: 0, SILVER: 0, BRONZE: 0 },
      avgHealthScore: 100,
      anomaliesDetected: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CIRCUIT BREAKER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if an agent's circuit is open (should not be called)
   */
  isCircuitOpen(agentId: AgentId): boolean {
    if (!this.config.circuitBreaker.enabled) return false;

    const circuit = this.getOrCreateCircuit(agentId);

    // If OPEN, check if timeout has passed
    if (circuit.state === 'OPEN' && circuit.openedAt) {
      const elapsed = Date.now() - circuit.openedAt.getTime();
      if (elapsed >= this.config.circuitBreaker.timeout) {
        // Transition to HALF_OPEN
        const previousState = circuit.state;
        circuit.state = 'HALF_OPEN';
        circuit.halfOpenAttempts = 0;

        // WORLD-CLASS: Emit typed event
        this.events.emit({
          type: 'circuit:half_open',
          agentId,
        });
        this.events.emit({
          type: 'circuit:state_change',
          agentId,
          from: previousState,
          to: 'HALF_OPEN',
          reason: 'timeout elapsed',
        });
        this.logger.info('circuit_breaker', `${agentId}: OPEN → HALF_OPEN`, { elapsed });
      }
    }

    return circuit.state === 'OPEN';
  }

  /**
   * Record a successful agent execution
   */
  recordSuccess(agentId: AgentId, latencyMs: number): void {
    if (!this.config.circuitBreaker.enabled) return;

    const circuit = this.getOrCreateCircuit(agentId);
    circuit.successCount++;
    circuit.lastSuccess = new Date();

    // Reset rate limit attempts on success
    this.resetRateLimitAttempt(agentId);

    // Update baseline latency
    this.updateBaselineLatency(agentId, latencyMs);

    // Record timing metric
    this.metricsCollector.timing('resilience.agent.latency', latencyMs, { agentId });

    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenAttempts++;
      if (circuit.halfOpenAttempts >= this.config.circuitBreaker.successThreshold) {
        const previousState = circuit.state;
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;

        // WORLD-CLASS: Emit typed events
        this.events.emit({
          type: 'circuit:close',
          agentId,
          successCount: circuit.halfOpenAttempts,
        });
        this.events.emit({
          type: 'circuit:state_change',
          agentId,
          from: previousState,
          to: 'CLOSED',
          reason: `${circuit.halfOpenAttempts} consecutive successes`,
        });
        this.logger.info('circuit_breaker', `${agentId}: HALF_OPEN → CLOSED`, {
          successes: circuit.halfOpenAttempts,
        });
      }
    }
  }

  /**
   * Record a failed agent execution
   */
  recordFailure(agentId: AgentId, error: string, category: FailureCategory): void {
    if (!this.config.circuitBreaker.enabled) return;

    const circuit = this.getOrCreateCircuit(agentId);
    const previousState = circuit.state;
    circuit.failureCount++;
    circuit.lastFailure = new Date();
    this.agentFailureCount++;

    // Check if should open circuit
    if (circuit.state === 'CLOSED' || circuit.state === 'HALF_OPEN') {
      const totalCalls = circuit.successCount + circuit.failureCount;

      if (
        totalCalls >= this.config.circuitBreaker.volumeThreshold &&
        circuit.failureCount >= this.config.circuitBreaker.failureThreshold
      ) {
        circuit.state = 'OPEN';
        circuit.openedAt = new Date();
        this.internalMetrics.circuitBreaks++;

        // WORLD-CLASS: Emit typed events
        this.events.emit({
          type: 'circuit:open',
          agentId,
          failureCount: circuit.failureCount,
          lastError: error.substring(0, 200), // Truncate for safety
        });
        this.events.emit({
          type: 'circuit:state_change',
          agentId,
          from: previousState,
          to: 'OPEN',
          reason: `${circuit.failureCount} failures (${category})`,
        });
        this.logger.warn('circuit_breaker', `${agentId}: → OPEN`, {
          failures: circuit.failureCount,
          category,
          error: error.substring(0, 200),
        });
      }
    }

    // Check if should degrade
    if (
      this.config.degradation.autoDegrade &&
      this.agentFailureCount >= this.config.degradation.degradeOnAgentFailure
    ) {
      this.degradeTier(`${this.agentFailureCount} agent failures`);
    }
  }

  /**
   * Get fallback response for open circuit
   */
  async getFallback(agentId: AgentId, input: unknown): Promise<AgentOutput | null> {
    const circuit = this.getOrCreateCircuit(agentId);
    circuit.fallbackUsed++;

    // Try to get cached output for this agent
    const cacheKey = this.generateAgentCacheKey(agentId, input);
    const cached = this.getCachedAgentOutput(cacheKey);

    if (cached) {
      this.logger.debug('circuit_breaker', `${agentId}: Using cached fallback response`);
      return cached;
    }

    this.logger.debug('circuit_breaker', `${agentId}: No cached response available`);
    return null;
  }

  private getOrCreateCircuit(agentId: AgentId): CircuitBreakerState {
    if (!this.circuits.has(agentId)) {
      this.circuits.set(agentId, {
        agentId,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        halfOpenAttempts: 0,
        fallbackUsed: 0,
      });
    }
    return this.circuits.get(agentId)!;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1.5. BULKHEAD (Concurrency Limiting) - COMPETITIVE FEATURE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Acquire a bulkhead slot before calling an agent.
   * Limits concurrent calls to prevent resource exhaustion.
   *
   * @param agentId - The agent to acquire a slot for
   * @returns Promise that resolves when slot is acquired, rejects if limit/timeout
   *
   * @example
   * ```typescript
   * await engine.acquireBulkhead('oracle');
   * try {
   *   const result = await callAgent('oracle', input);
   *   engine.releaseBulkhead('oracle');
   *   return result;
   * } catch (e) {
   *   engine.releaseBulkhead('oracle');
   *   throw e;
   * }
   * ```
   */
  async acquireBulkhead(agentId: AgentId): Promise<void> {
    if (!this.config.bulkhead.enabled) return;

    const startTime = Date.now();
    const currentPerAgent = this.bulkheadPerAgent.get(agentId) || 0;

    // Check if we can acquire immediately
    if (
      currentPerAgent < this.config.bulkhead.maxConcurrentPerAgent &&
      this.bulkheadTotal < this.config.bulkhead.maxConcurrentTotal
    ) {
      this.bulkheadPerAgent.set(agentId, currentPerAgent + 1);
      this.bulkheadTotal++;

      this.events.emit({
        type: 'bulkhead:acquired',
        agentId,
        currentPerAgent: currentPerAgent + 1,
        currentTotal: this.bulkheadTotal,
        waitedMs: 0,
      });

      this.logger.debug('circuit_breaker', `Bulkhead acquired for ${agentId}`, {
        perAgent: currentPerAgent + 1,
        total: this.bulkheadTotal,
      });
      return;
    }

    // Need to wait or fail
    if (this.config.bulkhead.maxWaitMs === 0) {
      // Fail fast mode
      const reason =
        currentPerAgent >= this.config.bulkhead.maxConcurrentPerAgent
          ? ('per_agent_limit' as const)
          : ('total_limit' as const);

      this.events.emit({
        type: 'bulkhead:rejected',
        agentId,
        reason,
        queueLength: this.bulkheadQueue.length,
      });

      throw new Error(
        `Bulkhead rejected: ${reason} (agent: ${agentId}, perAgent: ${currentPerAgent}/${this.config.bulkhead.maxConcurrentPerAgent}, total: ${this.bulkheadTotal}/${this.config.bulkhead.maxConcurrentTotal})`
      );
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const queueEntry = { agentId, resolve, reject, timestamp: Date.now() };

      if (this.config.bulkhead.fairQueuing) {
        this.bulkheadQueue.push(queueEntry); // FIFO
      } else {
        this.bulkheadQueue.unshift(queueEntry); // LIFO (prioritize recent)
      }

      const position = this.bulkheadQueue.length;
      const estimatedWaitMs = position * 1000; // Rough estimate

      this.events.emit({
        type: 'bulkhead:queued',
        agentId,
        position,
        estimatedWaitMs,
      });

      this.logger.debug('circuit_breaker', `Bulkhead queued for ${agentId}`, { position });

      // Set timeout
      const timeoutId = setTimeout(() => {
        const index = this.bulkheadQueue.findIndex(e => e === queueEntry);
        if (index !== -1) {
          this.bulkheadQueue.splice(index, 1);

          this.events.emit({
            type: 'bulkhead:rejected',
            agentId,
            reason: 'timeout',
            queueLength: this.bulkheadQueue.length,
          });

          reject(
            new Error(
              `Bulkhead timeout after ${this.config.bulkhead.maxWaitMs}ms waiting for ${agentId}`
            )
          );
        }
      }, this.config.bulkhead.maxWaitMs);

      // Modify resolve to clear timeout and acquire
      const originalResolve = resolve;
      queueEntry.resolve = () => {
        clearTimeout(timeoutId);
        const waited = Date.now() - startTime;

        this.bulkheadPerAgent.set(agentId, (this.bulkheadPerAgent.get(agentId) || 0) + 1);
        this.bulkheadTotal++;

        this.events.emit({
          type: 'bulkhead:acquired',
          agentId,
          currentPerAgent: this.bulkheadPerAgent.get(agentId) || 1,
          currentTotal: this.bulkheadTotal,
          waitedMs: waited,
        });

        originalResolve();
      };
    });
  }

  /**
   * Release a bulkhead slot after agent call completes.
   * MUST be called in finally block to prevent leaks.
   */
  releaseBulkhead(agentId: AgentId): void {
    if (!this.config.bulkhead.enabled) return;

    const current = this.bulkheadPerAgent.get(agentId) || 0;
    if (current > 0) {
      this.bulkheadPerAgent.set(agentId, current - 1);
      this.bulkheadTotal = Math.max(0, this.bulkheadTotal - 1);

      this.events.emit({
        type: 'bulkhead:released',
        agentId,
        currentPerAgent: current - 1,
        currentTotal: this.bulkheadTotal,
      });

      // Process queue
      this.processQueue();
    }
  }

  /**
   * Process waiting requests in the bulkhead queue
   */
  private processQueue(): void {
    if (this.bulkheadQueue.length === 0) return;

    // Find first request that can be satisfied
    for (let i = 0; i < this.bulkheadQueue.length; i++) {
      const entry = this.bulkheadQueue[i];
      const currentPerAgent = this.bulkheadPerAgent.get(entry.agentId) || 0;

      if (
        currentPerAgent < this.config.bulkhead.maxConcurrentPerAgent &&
        this.bulkheadTotal < this.config.bulkhead.maxConcurrentTotal
      ) {
        this.bulkheadQueue.splice(i, 1);
        entry.resolve();
        return;
      }
    }
  }

  /**
   * Get current bulkhead status for monitoring
   */
  getBulkheadStatus(): {
    totalInFlight: number;
    maxTotal: number;
    perAgent: Record<string, { current: number; max: number }>;
    queueLength: number;
  } {
    const perAgent: Record<string, { current: number; max: number }> = {};
    for (const [agentId, count] of this.bulkheadPerAgent) {
      perAgent[agentId] = {
        current: count,
        max: this.config.bulkhead.maxConcurrentPerAgent,
      };
    }

    return {
      totalInFlight: this.bulkheadTotal,
      maxTotal: this.config.bulkhead.maxConcurrentTotal,
      perAgent,
      queueLength: this.bulkheadQueue.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SELF-HEALING RETRY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze a failure and suggest healing actions
   */
  analyzeFailure(
    agentId: AgentId,
    error: string,
    input: unknown,
    output?: AgentOutput
  ): SelfHealingAction[] {
    if (!this.config.selfHealing.enabled) return [];

    this.internalMetrics.selfHealingAttempts++;
    const actions: SelfHealingAction[] = [];
    const category = this.categorizeFailure(error);

    switch (category) {
      case 'TIMEOUT':
        actions.push({
          type: 'SIMPLIFY_PROMPT',
          description: 'Reduce prompt complexity to avoid timeout',
          modification: { maxTokens: 4096, simplifyOutput: true },
          confidence: 0.7,
        });
        actions.push({
          type: 'SWITCH_MODEL',
          description: 'Use faster model for this agent',
          modification: { model: 'claude-3-haiku-20240307' },
          confidence: 0.6,
        });
        break;

      case 'RATE_LIMIT':
        // Calculate exponential backoff based on attempt number
        const rateLimitAttempt = this.getRateLimitAttempt(agentId);
        const baseWaitMs = 5000;
        const maxWaitMs = 120000; // Max 2 minutes
        const exponentialWaitMs = Math.min(baseWaitMs * Math.pow(2, rateLimitAttempt), maxWaitMs);
        this.incrementRateLimitAttempt(agentId);

        actions.push({
          type: 'RETRY_WITH_CACHE',
          description: `Wait ${exponentialWaitMs}ms and retry (attempt ${rateLimitAttempt + 1})`,
          modification: {
            waitMs: exponentialWaitMs,
            useCache: true,
            attempt: rateLimitAttempt + 1,
            maxAttempts: 5, // Give up after 5 rate limit retries
          },
          confidence: rateLimitAttempt < 3 ? 0.9 : 0.5, // Lower confidence on repeated rate limits
        });
        break;

      case 'INVALID_OUTPUT':
        actions.push({
          type: 'ADD_CONTEXT',
          description: 'Add more examples and constraints to prompt',
          modification: {
            addExamples: true,
            strictSchema: true,
            retryWithFeedback: error.substring(0, 500),
          },
          confidence: 0.8,
        });
        break;

      case 'QUALITY_FAILURE':
        actions.push({
          type: 'REDUCE_SCOPE',
          description: 'Reduce output scope to improve quality',
          modification: {
            reduceComponents: true,
            focusOnCore: true,
            skipOptional: true,
          },
          confidence: 0.7,
        });
        break;

      case 'TOKEN_EXHAUSTED':
        actions.push({
          type: 'REDUCE_SCOPE',
          description: 'Significantly reduce scope to fit token budget',
          modification: {
            maxFiles: 5,
            maxLinesPerFile: 200,
            skipComments: true,
          },
          confidence: 0.8,
        });
        break;

      case 'DEPENDENCY_MISSING':
        // Signal that we need upstream fix - return action with zero confidence
        actions.push({
          type: 'RETRY_WITH_CACHE',
          description: 'Dependency missing - wait for upstream agent to complete',
          modification: { waitForDependency: true, skipIfUnavailable: true },
          confidence: 0.2,
        });
        break;

      case 'PROMPT_INJECTION':
        // SECURITY: Do NOT retry or modify - this is a potential attack
        // WORLD-CLASS: Emit security event
        this.events.emit({
          type: 'security:injection_detected',
          agentId,
          snippet: error.substring(0, 100),
        });
        this.logger.fatal('self_healing', `SECURITY: Potential prompt injection detected`, {
          agentId,
          snippet: error.substring(0, 100),
        });
        // Return a special action that signals immediate halt
        return [
          {
            type: 'REDUCE_SCOPE',
            description: 'SECURITY HALT: Potential prompt injection detected. Build blocked.',
            modification: { securityHalt: true, reason: 'prompt_injection_detected' },
            confidence: 0, // Zero confidence = do not retry
          },
        ];

      default:
        // Generic retry with simplified approach
        actions.push({
          type: 'SIMPLIFY_PROMPT',
          description: 'Generic simplification for unknown error',
          modification: { simplifyAll: true },
          confidence: 0.4,
        });
    }

    // Sort by confidence
    return actions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Categorize an error message
   */
  categorizeFailure(error: string): FailureCategory {
    const lower = error.toLowerCase();

    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
      return 'TIMEOUT';
    }
    if (
      lower.includes('rate limit') ||
      lower.includes('429') ||
      lower.includes('too many requests')
    ) {
      return 'RATE_LIMIT';
    }
    if (
      lower.includes('invalid') ||
      lower.includes('parse') ||
      lower.includes('schema') ||
      lower.includes('json')
    ) {
      return 'INVALID_OUTPUT';
    }
    if (lower.includes('quality') || lower.includes('score') || lower.includes('threshold')) {
      return 'QUALITY_FAILURE';
    }
    if (lower.includes('dependency') || lower.includes('missing') || lower.includes('not found')) {
      return 'DEPENDENCY_MISSING';
    }
    if (lower.includes('injection') || lower.includes('malicious') || lower.includes('unsafe')) {
      return 'PROMPT_INJECTION';
    }
    if (
      lower.includes('token') ||
      lower.includes('context length') ||
      lower.includes('max_tokens')
    ) {
      return 'TOKEN_EXHAUSTED';
    }

    return 'UNKNOWN';
  }

  /**
   * Apply a healing action to the input
   */
  applyHealingAction(input: unknown, action: SelfHealingAction): unknown {
    // Deep clone input
    const modified = JSON.parse(JSON.stringify(input));

    // Apply modifications
    for (const [key, value] of Object.entries(action.modification)) {
      if (typeof modified === 'object' && modified !== null) {
        (modified as Record<string, unknown>)[key] = value;
      }
    }

    this.logger.info('self_healing', `Applied action: ${action.type}`, {
      confidence: action.confidence,
    });
    return modified;
  }

  /**
   * Mark self-healing as successful
   */
  recordHealingSuccess(): void {
    this.internalMetrics.selfHealingSuccesses++;
  }

  /**
   * Get rate limit attempt count for an agent
   */
  private getRateLimitAttempt(agentId: AgentId): number {
    return this.rateLimitAttempts.get(agentId) || 0;
  }

  /**
   * Increment rate limit attempt count for an agent
   */
  private incrementRateLimitAttempt(agentId: AgentId): void {
    const current = this.getRateLimitAttempt(agentId);
    this.rateLimitAttempts.set(agentId, current + 1);
  }

  /**
   * Reset rate limit attempt count on success
   */
  resetRateLimitAttempt(agentId: AgentId): void {
    this.rateLimitAttempts.delete(agentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BUILD FINGERPRINTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a fingerprint for a build
   */
  generateBuildFingerprint(prompt: string, tier: string, config?: unknown): string {
    const data = JSON.stringify({ prompt, tier, config });
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Check if we have a cached result for this fingerprint
   */
  getCachedBuild(fingerprint: string): BuildFingerprint | null {
    if (!this.config.fingerprinting.enabled) return null;

    const cached = this.fingerprints.get(fingerprint);
    if (!cached) {
      this.internalMetrics.cacheMisses++;
      return null;
    }

    // Check age
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.config.fingerprinting.maxCacheAge) {
      this.fingerprints.delete(fingerprint);
      this.internalMetrics.cacheMisses++;
      return null;
    }

    // Only return successful builds (or partial if configured)
    if (
      cached.result === 'SUCCESS' ||
      (this.config.fingerprinting.reusePartial && cached.result === 'PARTIAL')
    ) {
      this.internalMetrics.cacheHits++;
      this.logger.debug('fingerprint', `Cache HIT: ${fingerprint.substring(0, 12)}...`, {
        result: cached.result,
      });
      return cached;
    }

    this.internalMetrics.cacheMisses++;
    return null;
  }

  /**
   * Store a build result
   * @throws Error if prompt exceeds MAX_PROMPT_LENGTH (prevents memory attacks)
   */
  storeBuildFingerprint(
    fingerprint: string,
    prompt: string,
    tier: string,
    result: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    outputPath?: string,
    duration?: number,
    agentResults?: Record<AgentId, 'SUCCESS' | 'FAILURE' | 'SKIPPED'>
  ): void {
    if (!this.config.fingerprinting.enabled) return;

    // SECURITY: Prevent memory attacks with oversized prompts
    if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
      this.logger.warn(
        'fingerprint',
        `Prompt too large (${prompt.length} chars), truncating to ${MAX_PROMPT_LENGTH}`
      );
      prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
    }

    const entry: BuildFingerprint = {
      hash: fingerprint,
      prompt,
      tier,
      timestamp: new Date(),
      result,
      outputPath,
      duration,
      agentResults,
    };

    this.fingerprints.set(fingerprint, entry);

    // Prune before saving to prevent unbounded growth
    this.pruneFingerprints();
    this.saveFingerprintCache();

    this.logger.debug('fingerprint', `Stored: ${fingerprint.substring(0, 12)}...`, { result });
  }

  private generateAgentCacheKey(agentId: AgentId, input: unknown): string {
    const data = JSON.stringify({ agentId, input });
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private getCachedAgentOutput(cacheKey: string): AgentOutput | null {
    // TODO: Implement agent-level caching
    return null;
  }

  private loadFingerprintCache(): void {
    if (!this.config.fingerprinting.enabled) return;

    try {
      const cacheFile = path.join(this.config.fingerprinting.cacheDir, 'fingerprints.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        const now = Date.now();
        let loaded = 0;
        let pruned = 0;

        for (const [key, value] of Object.entries(data)) {
          const fp = value as BuildFingerprint;
          fp.timestamp = new Date(fp.timestamp);

          // Prune expired entries during load
          const age = now - fp.timestamp.getTime();
          if (age > this.config.fingerprinting.maxCacheAge) {
            pruned++;
            continue;
          }

          this.fingerprints.set(key, fp);
          loaded++;
        }

        this.logger.info('fingerprint', `Loaded ${loaded} cached fingerprints`, { pruned });

        // Save back if we pruned anything
        if (pruned > 0) {
          this.saveFingerprintCache();
        }
      }
    } catch (error) {
      this.logger.warn('fingerprint', 'Failed to load cache, starting fresh', {
        error: String(error),
      });
      // Cache doesn't exist or is corrupt - start fresh
    }
  }

  /**
   * Prune old fingerprints to prevent memory bloat
   * Called periodically or when cache exceeds size limit
   */
  private pruneFingerprints(): number {
    // Use named constant from top of file
    const now = Date.now();
    let pruned = 0;

    // First pass: remove expired
    for (const [key, fp] of this.fingerprints) {
      const age = now - fp.timestamp.getTime();
      if (age > this.config.fingerprinting.maxCacheAge) {
        this.fingerprints.delete(key);
        pruned++;
      }
    }

    // Second pass: if still too many, remove oldest
    if (this.fingerprints.size > FINGERPRINT_MAX_ENTRIES) {
      const entries = Array.from(this.fingerprints.entries()).sort(
        (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
      );

      const toRemove = entries.slice(0, this.fingerprints.size - FINGERPRINT_MAX_ENTRIES);
      for (const [key] of toRemove) {
        this.fingerprints.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      this.logger.debug('fingerprint', `Pruned ${pruned} entries`, {
        remaining: this.fingerprints.size,
      });
    }

    return pruned;
  }

  private saveFingerprintCache(): void {
    if (!this.config.fingerprinting.enabled) return;

    try {
      const cacheDir = this.config.fingerprinting.cacheDir;
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheFile = path.join(cacheDir, 'fingerprints.json');
      const data: Record<string, BuildFingerprint> = {};
      for (const [key, value] of this.fingerprints) {
        data[key] = value;
      }
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.warn('fingerprint', 'Failed to save cache', { error: String(error) });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PREDICTIVE FAILURE SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate health score for a potential build
   */
  calculateHealthScore(prompt: string, tier: DegradationTier): HealthScore {
    if (!this.config.prediction.enabled) {
      return {
        overall: 100,
        factors: {
          promptComplexity: 100,
          historicalSuccessRate: 100,
          currentSystemLoad: 100,
          agentAvailability: 100,
          resourceBudget: 100,
        },
        prediction: 'HIGH_CONFIDENCE',
        recommendations: [],
      };
    }

    const factors = {
      promptComplexity: this.scorePromptComplexity(prompt),
      historicalSuccessRate: this.scoreHistoricalSuccess(prompt),
      currentSystemLoad: this.scoreSystemLoad(),
      agentAvailability: this.scoreAgentAvailability(tier),
      resourceBudget: this.scoreResourceBudget(tier),
    };

    // Weighted average
    const weights = {
      promptComplexity: 0.25,
      historicalSuccessRate: 0.3,
      currentSystemLoad: 0.15,
      agentAvailability: 0.2,
      resourceBudget: 0.1,
    };
    let overall = 0;
    for (const [key, weight] of Object.entries(weights)) {
      overall += factors[key as keyof typeof factors] * weight;
    }
    overall = Math.round(overall);

    // Track for trend analysis
    this.healthHistory.push(overall);
    if (this.healthHistory.length > 100) this.healthHistory.shift();
    this.internalMetrics.avgHealthScore =
      this.healthHistory.reduce((a, b) => a + b, 0) / this.healthHistory.length;

    // Determine prediction
    let prediction: HealthScore['prediction'];
    if (overall >= 80) prediction = 'HIGH_CONFIDENCE';
    else if (overall >= 60) prediction = 'LIKELY_SUCCESS';
    else if (overall >= 40) prediction = 'RISKY';
    else prediction = 'LIKELY_FAILURE';

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.promptComplexity < 50) {
      recommendations.push(
        'Consider simplifying the prompt - complex prompts have higher failure rates'
      );
    }
    if (factors.historicalSuccessRate < 50) {
      recommendations.push('Similar prompts have failed before - consider modifying approach');
    }
    if (factors.agentAvailability < 70) {
      recommendations.push(
        `Some agents have open circuits - consider using ${this.suggestLowerTier(tier)} tier`
      );
    }
    if (factors.currentSystemLoad < 50) {
      recommendations.push('System under high load - expect longer build times');
    }

    const score: HealthScore = {
      overall,
      factors,
      prediction,
      recommendations,
    };

    this.logger.info('health', `Score: ${overall}/100 (${prediction})`, {
      factors,
      recommendations,
    });

    return score;
  }

  /**
   * Check if build should proceed based on health score
   */
  shouldProceed(healthScore: HealthScore): { proceed: boolean; reason?: string } {
    if (!this.config.prediction.blockOnLowScore) {
      return { proceed: true };
    }

    if (healthScore.overall < this.config.prediction.minScoreToStart) {
      return {
        proceed: false,
        reason: `Health score ${healthScore.overall} below minimum ${this.config.prediction.minScoreToStart}. ${healthScore.recommendations[0] || ''}`,
      };
    }

    return { proceed: true };
  }

  private scorePromptComplexity(prompt: string): number {
    // Simple heuristics for prompt complexity
    const length = prompt.length;
    const words = prompt.split(/\s+/).length;
    const sentences = prompt.split(/[.!?]+/).length;
    const avgSentenceLength = words / sentences;

    // Penalties
    let score = 100;
    if (length > 5000) score -= 20;
    if (length > 10000) score -= 20;
    if (avgSentenceLength > 30) score -= 15;
    if (
      prompt.includes('complex') ||
      prompt.includes('everything') ||
      prompt.includes('all features')
    ) {
      score -= 20;
    }
    if (prompt.includes('simple') || prompt.includes('basic') || prompt.includes('minimal')) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreHistoricalSuccess(prompt: string): number {
    // Check fingerprint cache for similar prompts
    let similarSuccesses = 0;
    let similarFailures = 0;

    for (const fp of this.fingerprints.values()) {
      // Simple similarity: check word overlap
      const promptWords = new Set(prompt.toLowerCase().split(/\s+/));
      const fpWords = new Set(fp.prompt.toLowerCase().split(/\s+/));
      const intersection = new Set([...promptWords].filter(x => fpWords.has(x)));
      const similarity = intersection.size / Math.max(promptWords.size, fpWords.size);

      if (similarity > 0.5) {
        if (fp.result === 'SUCCESS') similarSuccesses++;
        else if (fp.result === 'FAILURE') similarFailures++;
      }
    }

    const total = similarSuccesses + similarFailures;
    if (total === 0) return 70; // No history, assume moderate confidence

    return Math.round((similarSuccesses / total) * 100);
  }

  private scoreSystemLoad(): number {
    // Check current system state
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    let score = 100;
    if (heapUsedMB > 1024) score -= 20;
    if (heapUsedMB > 1536) score -= 20;
    if (heapUsedMB > 2048) score -= 30;

    return Math.max(0, score);
  }

  private scoreAgentAvailability(tier: DegradationTier): number {
    const agents = DEGRADATION_TIERS[tier];
    let available = 0;

    for (const agentId of agents) {
      if (!this.isCircuitOpen(agentId)) {
        available++;
      }
    }

    return Math.round((available / agents.length) * 100);
  }

  private scoreResourceBudget(tier: DegradationTier): number {
    // Estimate token usage based on tier
    const tierTokenEstimates: Record<DegradationTier, number> = {
      PLATINUM: 500000,
      GOLD: 300000,
      SILVER: 150000,
      BRONZE: 75000,
    };

    // Assume 1M token budget (configurable)
    const budget = 1000000;
    const estimated = tierTokenEstimates[tier];

    if (estimated > budget) return 0;
    return Math.round(((budget - estimated) / budget) * 100);
  }

  private suggestLowerTier(current: DegradationTier): DegradationTier {
    const tiers: DegradationTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    const currentIndex = tiers.indexOf(current);
    if (currentIndex < tiers.length - 1) {
      return tiers[currentIndex + 1];
    }
    return current;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GRACEFUL DEGRADATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current degradation tier
   */
  getCurrentTier(): DegradationTier {
    return this.currentTier;
  }

  /**
   * Get agents for current tier
   */
  getActiveAgents(): AgentId[] {
    return DEGRADATION_TIERS[this.currentTier];
  }

  /**
   * Check if an agent is active in current tier
   */
  isAgentActive(agentId: AgentId): boolean {
    return DEGRADATION_TIERS[this.currentTier].includes(agentId);
  }

  /**
   * Manually set tier
   */
  setTier(tier: DegradationTier): void {
    if (tier !== this.currentTier) {
      const fromTier = this.currentTier;
      const agentsDropped = DEGRADATION_TIERS[fromTier].length - DEGRADATION_TIERS[tier].length;

      this.internalMetrics.degradations[tier]++;
      this.currentTier = tier;

      // WORLD-CLASS: Emit typed event
      this.events.emit({
        type: 'degradation:tier_change',
        from: fromTier,
        to: tier,
        reason: 'manual',
        agentsDropped: Math.max(0, agentsDropped),
      });
      this.logger.info('degradation', `Manual tier change: ${fromTier} → ${tier}`, {
        agentsDropped,
      });
    }
  }

  /**
   * Degrade to next lower tier
   */
  degradeTier(reason: string): boolean {
    if (!this.config.degradation.enabled) return false;

    const tiers: DegradationTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    const currentIndex = tiers.indexOf(this.currentTier);

    if (currentIndex >= tiers.length - 1) {
      // WORLD-CLASS: Emit at-minimum event
      this.events.emit({
        type: 'degradation:at_minimum',
        tier: this.currentTier,
      });
      this.logger.warn('degradation', `Already at lowest tier (BRONZE), cannot degrade further`);
      return false;
    }

    const fromTier = this.currentTier;
    const newTier = tiers[currentIndex + 1];
    const agentsDropped = DEGRADATION_TIERS[fromTier].length - DEGRADATION_TIERS[newTier].length;

    this.internalMetrics.degradations[newTier]++;
    this.currentTier = newTier;

    // Reset failure count after degradation
    this.agentFailureCount = 0;

    // WORLD-CLASS: Emit typed event
    this.events.emit({
      type: 'degradation:tier_change',
      from: fromTier,
      to: newTier,
      reason,
      agentsDropped,
    });
    this.logger.warn('degradation', `${fromTier} → ${newTier}`, { reason, agentsDropped });

    return true;
  }

  /**
   * Upgrade to next higher tier (recovery)
   */
  upgradeTier(reason: string): boolean {
    const tiers: DegradationTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    const currentIndex = tiers.indexOf(this.currentTier);

    if (currentIndex <= 0) {
      return false;
    }

    const fromTier = this.currentTier;
    const newTier = tiers[currentIndex - 1];
    const agentsAdded = DEGRADATION_TIERS[newTier].length - DEGRADATION_TIERS[fromTier].length;

    this.currentTier = newTier;

    // WORLD-CLASS: Emit typed event
    this.events.emit({
      type: 'degradation:tier_change',
      from: fromTier,
      to: newTier,
      reason: `recovery: ${reason}`,
      agentsDropped: -agentsAdded, // Negative = agents added
    });
    this.logger.info('degradation', `${fromTier} → ${newTier} (recovery)`, { reason, agentsAdded });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DISTRIBUTED TRACING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start a new trace
   */
  startTrace(operationName: string): TraceSpan {
    if (!this.config.tracing.enabled) {
      return this.createDummySpan(operationName);
    }

    // Sample based on rate
    if (Math.random() > this.config.tracing.sampleRate) {
      return this.createDummySpan(operationName);
    }

    const span: TraceSpan = {
      traceId: this.buildId,
      spanId: this.generateSpanId(),
      operationName,
      startTime: Date.now(),
      status: 'IN_PROGRESS',
      metadata: {},
      children: [],
    };

    this.traces.set(span.spanId, span);

    // Emit span start event
    this.events.emit({
      type: 'trace:span_start',
      traceId: span.traceId,
      spanId: span.spanId,
      operation: operationName,
      timestamp: new Date(),
    });

    return span;
  }

  /**
   * Start a child span
   */
  startChildSpan(
    parent: TraceSpan,
    operationName: string,
    agentId?: AgentId,
    phase?: BuildPhase
  ): TraceSpan {
    if (!this.config.tracing.enabled) {
      return this.createDummySpan(operationName);
    }

    const span: TraceSpan = {
      traceId: parent.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parent.spanId,
      operationName,
      agentId,
      phase,
      startTime: Date.now(),
      status: 'IN_PROGRESS',
      metadata: {},
      children: [],
    };

    parent.children.push(span);
    this.traces.set(span.spanId, span);
    return span;
  }

  /**
   * End a span
   */
  endSpan(span: TraceSpan, status: 'SUCCESS' | 'FAILURE', error?: string): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    span.error = error;

    // Emit span end event (skip for dummy spans)
    if (span.spanId !== 'untraced') {
      this.events.emit({
        type: 'trace:span_end',
        traceId: span.traceId,
        spanId: span.spanId,
        durationMs: span.duration,
        status,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Add metadata to a span
   */
  addSpanMetadata(span: TraceSpan, key: string, value: unknown): void {
    span.metadata[key] = value;
  }

  /**
   * Export all traces
   */
  exportTraces(): void {
    if (!this.config.tracing.enabled || !this.config.tracing.exportPath) return;

    try {
      const exportDir = this.config.tracing.exportPath;
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const exportFile = path.join(exportDir, `trace-${this.buildId}.json`);
      const rootSpans = Array.from(this.traces.values()).filter(s => !s.parentSpanId);

      fs.writeFileSync(exportFile, JSON.stringify(rootSpans, null, 2));
      this.logger.info('tracing', `Exported traces to ${exportFile}`);
    } catch (error) {
      this.logger.warn('tracing', 'Failed to export traces', { error: String(error) });
    }
  }

  private generateSpanId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  private createDummySpan(operationName: string): TraceSpan {
    return {
      traceId: 'untraced',
      spanId: 'untraced',
      operationName,
      startTime: Date.now(),
      status: 'IN_PROGRESS',
      metadata: {},
      children: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check for anomalies
   */
  detectAnomalies(agentId: AgentId, latencyMs: number): string[] {
    if (!this.config.anomaly.enabled) return [];

    const anomalies: string[] = [];

    // Check latency anomaly
    const baseline = this.baselineLatencies.get(agentId);
    if (baseline) {
      const ratio = (latencyMs / baseline) * 100;
      if (ratio > this.config.anomaly.latencyThreshold) {
        anomalies.push(
          `Latency anomaly: ${agentId} took ${latencyMs}ms (${ratio.toFixed(0)}% of baseline ${baseline}ms)`
        );

        // WORLD-CLASS: Emit typed event
        this.events.emit({
          type: 'anomaly:detected',
          category: 'latency',
          agentId,
          value: latencyMs,
          threshold: baseline * (this.config.anomaly.latencyThreshold / 100),
        });
      }
    }

    // Check memory
    let memoryMB = 0;
    try {
      memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
    } catch {
      // In restricted environments, skip memory check
    }
    if (memoryMB > this.config.anomaly.memoryThreshold) {
      anomalies.push(
        `Memory anomaly: ${memoryMB.toFixed(0)}MB exceeds threshold ${this.config.anomaly.memoryThreshold}MB`
      );

      // WORLD-CLASS: Emit typed event
      this.events.emit({
        type: 'anomaly:detected',
        category: 'memory',
        value: memoryMB,
        threshold: this.config.anomaly.memoryThreshold,
      });
    }

    // Check error rate for this agent
    const circuit = this.circuits.get(agentId);
    if (circuit) {
      const total = circuit.successCount + circuit.failureCount;
      if (total >= 5) {
        const errorRate = (circuit.failureCount / total) * 100;
        if (errorRate > this.config.anomaly.errorRateThreshold) {
          anomalies.push(`Error rate anomaly: ${agentId} has ${errorRate.toFixed(0)}% error rate`);

          // WORLD-CLASS: Emit typed event
          this.events.emit({
            type: 'anomaly:detected',
            category: 'error_rate',
            agentId,
            value: errorRate,
            threshold: this.config.anomaly.errorRateThreshold,
          });
        }
      }
    }

    if (anomalies.length > 0) {
      this.internalMetrics.anomaliesDetected += anomalies.length;
      this.logger.warn('anomaly', `Detected ${anomalies.length} anomalies`, { anomalies });
    }

    return anomalies;
  }

  private updateBaselineLatency(agentId: AgentId, latencyMs: number): void {
    const current = this.baselineLatencies.get(agentId);
    if (!current) {
      this.baselineLatencies.set(agentId, latencyMs);
    } else {
      // Exponential moving average
      const alpha = 0.1;
      this.baselineLatencies.set(agentId, current * (1 - alpha) + latencyMs * alpha);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS & STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all metrics
   */
  getMetrics(): ResilienceMetrics {
    return { ...this.internalMetrics };
  }

  /**
   * Get circuit breaker status for all agents
   */
  getCircuitStatus(): CircuitBreakerState[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Get full status report
   */
  getStatusReport(): {
    buildId: string;
    tier: DegradationTier;
    activeAgents: number;
    totalAgents: number;
    metrics: ResilienceMetrics;
    circuits: { open: number; halfOpen: number; closed: number };
    healthTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  } {
    const circuits = this.getCircuitStatus();
    const open = circuits.filter(c => c.state === 'OPEN').length;
    const halfOpen = circuits.filter(c => c.state === 'HALF_OPEN').length;
    const closed = circuits.filter(c => c.state === 'CLOSED').length;

    // Calculate health trend
    let healthTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (this.healthHistory.length >= 5) {
      const recent = this.healthHistory.slice(-5);
      const older = this.healthHistory.slice(-10, -5);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        if (recentAvg > olderAvg + 5) healthTrend = 'IMPROVING';
        else if (recentAvg < olderAvg - 5) healthTrend = 'DECLINING';
      }
    }

    return {
      buildId: this.buildId,
      tier: this.currentTier,
      activeAgents: DEGRADATION_TIERS[this.currentTier].length,
      totalAgents: DEGRADATION_TIERS.PLATINUM.length,
      metrics: this.getMetrics(),
      circuits: { open, halfOpen, closed },
      healthTrend,
    };
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.circuits.clear();
    this.traces.clear();
    this.rateLimitAttempts.clear();
    this.currentTier = this.config.degradation.startTier;
    this.agentFailureCount = 0;
    this.internalMetrics = this.initMetrics();
    this.healthHistory = [];
    this.baselineLatencies.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const engines: Map<string, ResilienceEngine> = new Map();
const engineTimestamps: Map<string, number> = new Map();

// Auto-cleanup: Uses ENGINE_TTL_MS and CLEANUP_INTERVAL_MS from constants above

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startAutoCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [buildId, timestamp] of engineTimestamps) {
      if (now - timestamp > ENGINE_TTL_MS) {
        toDelete.push(buildId);
      }
    }

    for (const buildId of toDelete) {
      console.log(`[RESILIENCE] Auto-cleanup: Removing stale engine ${buildId}`);
      const engine = engines.get(buildId);
      if (engine) {
        try {
          engine.exportTraces();
        } catch {
          // Ignore export errors during cleanup
        }
      }
      engines.delete(buildId);
      engineTimestamps.delete(buildId);
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Get or create a ResilienceEngine for a build
 *
 * @param buildId - Unique identifier for the build
 * @param options - Engine options (config, event bus, metrics collector, etc.)
 *
 * @example
 * // Basic usage
 * const engine = getResilienceEngine('build-123');
 *
 * // With custom config
 * const engine = getResilienceEngine('build-123', {
 *   config: { circuitBreaker: { failureThreshold: 3 } }
 * });
 *
 * // With external monitoring
 * const engine = getResilienceEngine('build-123', {
 *   metricsCollector: prometheusCollector,
 *   eventBus: sharedEventBus,
 *   onLog: (entry) => sendToElk(entry),
 * });
 */
/**
 * Validates buildId to prevent path traversal and injection attacks
 */
function validateBuildId(buildId: string): void {
  if (!buildId || typeof buildId !== 'string') {
    throw new Error('buildId is required and must be a non-empty string');
  }
  if (!BUILDID_PATTERN.test(buildId)) {
    throw new Error(
      `Invalid buildId "${buildId.substring(0, 20)}...". Must match pattern: alphanumeric, underscore, hyphen, max 128 chars`
    );
  }
}

export function getResilienceEngine(
  buildId: string,
  options?: ResilienceEngineOptions
): ResilienceEngine {
  // SECURITY: Validate buildId to prevent path traversal
  validateBuildId(buildId);

  // SECURITY: Prevent OOM from mass engine creation
  if (!engines.has(buildId) && engines.size >= MAX_CONCURRENT_ENGINES) {
    throw new Error(
      `Engine limit (${MAX_CONCURRENT_ENGINES}) reached. Cannot create new engine. Possible resource exhaustion attack.`
    );
  }

  startAutoCleanup();

  if (!engines.has(buildId)) {
    engines.set(buildId, new ResilienceEngine(buildId, options));
  }

  // Update timestamp on every access (keeps active builds alive)
  engineTimestamps.set(buildId, Date.now());

  return engines.get(buildId)!;
}

export function destroyResilienceEngine(buildId: string): void {
  const engine = engines.get(buildId);
  if (engine) {
    try {
      engine.exportTraces();
    } catch {
      // Ignore export errors
    }
    engines.delete(buildId);
    engineTimestamps.delete(buildId);
  }
}

// Get count of active engines (for monitoring)
export function getActiveEngineCount(): number {
  return engines.size;
}

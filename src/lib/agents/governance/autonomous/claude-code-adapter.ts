/**
 * Claude Code Adapter - OLYMPUS Governance Integration (World-Class Rewrite)
 *
 * Wraps Claude Code CLI for autonomous governance decisions.
 *
 * v2.0.0 FIXES:
 * - FIX #1: No shell injection (spawn with array args, no shell)
 * - FIX #2: True async (spawn + Promise, never blocks main thread)
 * - FIX #3: Structured metrics (total, success, failed, latency P50/P99)
 * - FIX #4: Token bucket rate limiter (prevents cost explosion)
 * - FIX #5: Honest async API (removed fake decideSync)
 * - FIX #6: Startup validation (checks CLI installed + authenticated)
 * - FIX #7: Clean interface (removed duplicate reason/reasoning)
 *
 * ADDITIONS:
 * - Zod response validation (schema-enforced, not ad-hoc)
 * - Response cache with TTL (idempotent: same violation = same decision)
 * - Structured JSON logging (filterable by component/event)
 *
 * @module governance/claude-code-adapter
 * @version 2.0.0
 * @since 2026-01-31
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { z } from 'zod';
import type { Violation, PatternLearning, DecisionResult } from './decision-strategy-loader';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended DecisionResult for Claude Code adapter.
 * v2.0: Removed duplicate `reason` field. Only `reasoning` exists.
 */
export interface ClaudeDecisionResult {
  readonly action:
    | 'rollback'
    | 'patch'
    | 'isolate'
    | 'alert'
    | 'ignore'
    | 'alert-human'
    | 'auto-fix'
    | 'suppress';
  readonly confidence: number;
  readonly reasoning: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly source: 'claude-code' | 'cache' | 'fallback';
  readonly latencyMs: number;
}

/**
 * Claude Code adapter configuration.
 */
export interface ClaudeCodeConfig {
  readonly enabled?: boolean;
  readonly timeoutMs?: number;
  readonly maxFailures?: number;
  readonly cooldownMs?: number;
  readonly minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  /** Max calls per second (token bucket rate) */
  readonly maxCallsPerSecond?: number;
  /** Response cache TTL in milliseconds */
  readonly cacheTtlMs?: number;
}

/**
 * Circuit breaker state tracking.
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

/**
 * Health status for monitoring.
 */
export interface ClaudeAdapterHealth {
  readonly available: boolean;
  readonly errorCount: number;
  readonly circuitOpen: boolean;
  readonly lastError?: string;
  readonly lastSuccessTime?: number;
  readonly cliInstalled?: boolean;
  readonly cliAuthenticated?: boolean;
  readonly cliVersion?: string;
}

/**
 * Adapter metrics for observability.
 */
export interface AdapterMetrics {
  readonly totalCalls: number;
  readonly successfulCalls: number;
  readonly failedCalls: number;
  readonly cacheHits: number;
  readonly rateLimitDrops: number;
  readonly avgLatencyMs: number;
  readonly p50LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly circuitOpenCount: number;
  readonly fallbackCount: number;
  readonly lastCallTimestamp: number;
}

/**
 * Structured log entry.
 */
export interface LogEntry {
  readonly timestamp: number;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly component: 'ClaudeAdapter';
  readonly event: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Logger interface for dependency injection.
 */
export interface AdapterLogger {
  log(entry: LogEntry): void;
}

// ============================================================================
// ZOD SCHEMAS (FIX #7 bonus: schema validation, not ad-hoc)
// ============================================================================

const ClaudeResponseSchema = z.object({
  action: z.enum([
    'alert-human',
    'auto-fix',
    'suppress',
    'rollback',
    'patch',
    'isolate',
    'alert',
    'ignore',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  parameters: z.record(z.unknown()).optional().default({}),
});

type ClaudeResponse = z.infer<typeof ClaudeResponseSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_FAILURES = 3;
const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_MAX_CALLS_PER_SECOND = 1;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PROMPT_LENGTH = 16_000; // 16KB — safe for all OS arg limits
const MAX_CACHE_SIZE = 1000; // Hard cap on cache entries

// ============================================================================
// TOKEN BUCKET RATE LIMITER (FIX #4)
// ============================================================================

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;

  constructor(maxCallsPerSecond: number) {
    this.maxTokens = maxCallsPerSecond;
    this.tokens = maxCallsPerSecond;
    this.refillRatePerMs = maxCallsPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }
}

// ============================================================================
// RESPONSE CACHE
// ============================================================================

interface CacheEntry {
  result: ClaudeDecisionResult;
  expiresAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  static buildKey(violationId: string, confidence: number): string {
    return createHash('sha256')
      .update(`${violationId}:${confidence.toFixed(4)}`)
      .digest('hex')
      .substring(0, 16);
  }

  get(key: string): ClaudeDecisionResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: ClaudeDecisionResult): void {
    // Prevent unbounded growth — evict expired first, then enforce hard cap
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictExpired();
    }
    // If still over hard cap after eviction, drop oldest entries
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const entriesToRemove = this.cache.size - MAX_CACHE_SIZE + 1;
      const keys = this.cache.keys();
      for (let i = 0; i < entriesToRemove; i++) {
        const next = keys.next();
        if (!next.done) {
          this.cache.delete(next.value);
        }
      }
    }
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// DEFAULT CONSOLE LOGGER
// ============================================================================

class ConsoleAdapterLogger implements AdapterLogger {
  log(entry: LogEntry): void {
    const prefix = `[${entry.component}]`;
    const msg = `${prefix} ${entry.event}`;
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';

    switch (entry.level) {
      case 'error':
        console.error(msg + data);
        break;
      case 'warn':
        console.warn(msg + data);
        break;
      case 'debug':
        // Only log debug if GOVERNANCE_DEBUG is set
        if (process.env.GOVERNANCE_DEBUG) {
          console.log(msg + data);
        }
        break;
      default:
        console.log(msg + data);
    }
  }
}

// ============================================================================
// METRICS TRACKER
// ============================================================================

class MetricsTracker {
  private _totalCalls = 0;
  private _successfulCalls = 0;
  private _failedCalls = 0;
  private _cacheHits = 0;
  private _rateLimitDrops = 0;
  private _circuitOpenCount = 0;
  private _fallbackCount = 0;
  private _lastCallTimestamp = 0;
  private _latencies: number[] = [];
  private readonly maxLatencySamples = 1000;

  recordSuccess(latencyMs: number): void {
    this._totalCalls++;
    this._successfulCalls++;
    this._lastCallTimestamp = Date.now();
    this.addLatency(latencyMs);
  }

  recordFailure(): void {
    this._totalCalls++;
    this._failedCalls++;
    this._lastCallTimestamp = Date.now();
  }

  recordCacheHit(): void {
    this._cacheHits++;
  }

  recordRateLimitDrop(): void {
    this._rateLimitDrops++;
  }

  recordCircuitOpen(): void {
    this._circuitOpenCount++;
  }

  recordFallback(): void {
    this._fallbackCount++;
  }

  getMetrics(): AdapterMetrics {
    return {
      totalCalls: this._totalCalls,
      successfulCalls: this._successfulCalls,
      failedCalls: this._failedCalls,
      cacheHits: this._cacheHits,
      rateLimitDrops: this._rateLimitDrops,
      avgLatencyMs: this.calcAvg(),
      p50LatencyMs: this.calcPercentile(50),
      p99LatencyMs: this.calcPercentile(99),
      circuitOpenCount: this._circuitOpenCount,
      fallbackCount: this._fallbackCount,
      lastCallTimestamp: this._lastCallTimestamp,
    };
  }

  reset(): void {
    this._totalCalls = 0;
    this._successfulCalls = 0;
    this._failedCalls = 0;
    this._cacheHits = 0;
    this._rateLimitDrops = 0;
    this._circuitOpenCount = 0;
    this._fallbackCount = 0;
    this._lastCallTimestamp = 0;
    this._latencies = [];
  }

  private addLatency(ms: number): void {
    this._latencies.push(ms);
    if (this._latencies.length > this.maxLatencySamples) {
      this._latencies.shift();
    }
  }

  private calcAvg(): number {
    if (this._latencies.length === 0) return 0;
    const sum = this._latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this._latencies.length);
  }

  private calcPercentile(p: number): number {
    if (this._latencies.length === 0) return 0;
    const sorted = [...this._latencies].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }
}

// ============================================================================
// CLAUDE CODE ADAPTER (WORLD-CLASS REWRITE)
// ============================================================================

export class ClaudeCodeAdapter {
  private circuit: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  private readonly maxFailures: number;
  private readonly cooldownMs: number;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;
  private readonly minSeverity: string;
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly responseCache: ResponseCache;
  private readonly metricsTracker: MetricsTracker;
  private readonly logger: AdapterLogger;

  private lastError?: string;
  private lastSuccessTime?: number;

  // Startup validation state
  private _cliInstalled?: boolean;
  private _cliAuthenticated?: boolean;
  private _cliVersion?: string;

  constructor(config: ClaudeCodeConfig = {}, logger?: AdapterLogger) {
    this.enabled = config.enabled ?? true;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxFailures = config.maxFailures ?? DEFAULT_MAX_FAILURES;
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.minSeverity = config.minSeverity ?? 'high';
    this.rateLimiter = new TokenBucketRateLimiter(
      config.maxCallsPerSecond ?? DEFAULT_MAX_CALLS_PER_SECOND
    );
    this.responseCache = new ResponseCache(config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    this.metricsTracker = new MetricsTracker();
    this.logger = logger ?? new ConsoleAdapterLogger();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if Claude should be used for this violation.
   */
  shouldUse(violation: Violation): boolean {
    if (!this.enabled) return false;
    if (!this.isValidViolation(violation)) return false;
    if (this.isCircuitOpen()) return false;

    const isHighSeverity = violation.tier >= 2 || violation.confidence > 0.8;
    const isComplexPattern = this.isComplexPattern(violation.pattern);

    return isHighSeverity || isComplexPattern;
  }

  /**
   * Ask Claude Code to make a governance decision.
   * Truly async: uses spawn + Promise, never blocks main thread.
   *
   * Returns null to signal: fall back to rule-based decisions.
   */
  async decide(
    violation: Violation,
    learning: PatternLearning | null
  ): Promise<ClaudeDecisionResult | null> {
    const startTime = Date.now();

    // 0. Input validation
    if (!this.isValidViolation(violation)) {
      this.log('warn', 'invalid-violation-input', {
        hasViolation: !!violation,
        type: typeof violation,
      });
      return null;
    }

    // 0.5. SECURITY FIX (Jan 31, 2026): Pre-validate input sizes BEFORE building prompt
    // Prevents memory spike from oversized violation fields
    const MAX_FIELD_LENGTH = 1000;
    const patternLength = violation.pattern?.length || 0;
    const filePathLength = violation.filePath?.length || 0;
    const snippetLength = violation.codeSnippet?.length || 0;

    if (
      patternLength > MAX_FIELD_LENGTH ||
      filePathLength > MAX_FIELD_LENGTH ||
      snippetLength > MAX_FIELD_LENGTH * 5
    ) {
      this.log('warn', 'violation-field-too-large', {
        violationId: violation.id,
        patternLength,
        filePathLength,
        snippetLength,
      });
      return null; // Fall back to rule-based decision
    }

    // 1. Check circuit breaker
    if (this.isCircuitOpen()) {
      this.metricsTracker.recordFallback();
      this.log('debug', 'circuit-open-fallback', { violationId: violation.id });
      return null;
    }

    // 2. Check cache
    const cacheKey = ResponseCache.buildKey(violation.id, violation.confidence);
    const cached = this.responseCache.get(cacheKey);
    if (cached) {
      this.metricsTracker.recordCacheHit();
      this.log('debug', 'cache-hit', { violationId: violation.id, action: cached.action });
      return { ...cached, source: 'cache', latencyMs: Date.now() - startTime };
    }

    // 3. Rate limit
    if (!this.rateLimiter.tryAcquire()) {
      this.metricsTracker.recordRateLimitDrop();
      this.log('warn', 'rate-limited', { violationId: violation.id });
      return null;
    }

    // 4. Build prompt and call Claude
    const prompt = this.buildPrompt(violation, learning);

    // 4.5. Prompt size guard — prevent OS arg length limit failures
    if (prompt.length > MAX_PROMPT_LENGTH) {
      this.log('warn', 'prompt-too-large', {
        violationId: violation.id,
        promptLength: prompt.length,
        maxLength: MAX_PROMPT_LENGTH,
      });
      return null;
    }

    try {
      const raw = await this.spawnClaude(prompt);
      const parsed = this.parseResponse(raw);

      if (!parsed) {
        this.recordFailure('Invalid response from Claude');
        return null;
      }

      const latencyMs = Date.now() - startTime;
      const result: ClaudeDecisionResult = {
        ...parsed,
        source: 'claude-code',
        latencyMs,
      };

      // Cache the result
      this.responseCache.set(cacheKey, result);
      this.recordSuccess();
      this.metricsTracker.recordSuccess(latencyMs);

      this.log('info', 'decision', {
        violationId: violation.id,
        action: result.action,
        confidence: result.confidence,
        latencyMs,
        source: 'claude-code',
        circuitState: this.circuit.isOpen ? 'open' : 'closed',
      });

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.recordFailure(msg);
      this.metricsTracker.recordFailure();
      this.log('error', 'decision-failed', { violationId: violation.id, error: msg });
      return null;
    }
  }

  /**
   * Validate that Claude CLI is installed and authenticated.
   * Call once on daemon startup.
   */
  async validateSetup(): Promise<{
    installed: boolean;
    authenticated: boolean;
    version: string;
  }> {
    const result = { installed: false, authenticated: false, version: '' };

    try {
      const versionOutput = await this.spawnProcess('claude', ['--version']);
      result.installed = true;
      result.version = versionOutput.trim().split('\n')[0];
      this._cliInstalled = true;
      this._cliVersion = result.version;
    } catch {
      this._cliInstalled = false;
      this.log('error', 'cli-not-found', {
        hint: 'Install Claude Code CLI: npm install -g @anthropic-ai/claude-code',
      });
      return result;
    }

    try {
      const authOutput = await this.spawnProcess('claude', ['auth', 'status']);
      result.authenticated = !authOutput.toLowerCase().includes('not authenticated');
      this._cliAuthenticated = result.authenticated;

      if (!result.authenticated) {
        this.log('warn', 'cli-not-authenticated', {
          hint: 'Run: claude auth login',
        });
      }
    } catch {
      // auth status command may not exist in all versions - treat as authenticated
      result.authenticated = true;
      this._cliAuthenticated = true;
    }

    this.log('info', 'setup-validated', result);
    return result;
  }

  /**
   * Get current health status.
   */
  getHealth(): ClaudeAdapterHealth {
    return {
      available: this.enabled && !this.isCircuitOpen(),
      errorCount: this.circuit.failures,
      circuitOpen: this.circuit.isOpen,
      lastError: this.lastError,
      lastSuccessTime: this.lastSuccessTime,
      cliInstalled: this._cliInstalled,
      cliAuthenticated: this._cliAuthenticated,
      cliVersion: this._cliVersion,
    };
  }

  /**
   * Get adapter metrics.
   */
  getMetrics(): AdapterMetrics {
    return this.metricsTracker.getMetrics();
  }

  /**
   * Manually reset the circuit breaker.
   */
  resetCircuit(): void {
    this.circuit = { failures: 0, lastFailure: 0, isOpen: false };
    this.lastError = undefined;
  }

  /**
   * Clear response cache.
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.metricsTracker.reset();
  }

  // ============================================================================
  // PRIVATE: SPAWN (FIX #1 + #2: No shell, truly async)
  // ============================================================================

  /**
   * Spawn claude CLI as a child process. Array args = no shell = no injection.
   * Returns a Promise that resolves with stdout or rejects on error/timeout.
   */
  private spawnClaude(prompt: string): Promise<string> {
    return this.spawnProcess('claude', ['-p', prompt, '--output-format', 'json']);
  }

  private spawnProcess(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false, // Explicit: no shell
      });

      // Timeout guard
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill('SIGTERM');
          // Give 2s for graceful shutdown, then force kill
          setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              /* already dead */
            }
          }, 2000);
          reject(new Error(`Timeout: process did not exit within ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', err => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      child.on('close', code => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Process exited with code ${code}: ${stderr.substring(0, 500)}`));
          }
        }
      });
    });
  }

  // ============================================================================
  // PRIVATE: PROMPT BUILDING
  // ============================================================================

  private buildPrompt(violation: Violation, learning: PatternLearning | null): string {
    const severityMap: Record<number, string> = {
      1: 'low',
      2: 'high',
      3: 'critical',
    };

    const learningSection = learning
      ? `HISTORICAL PATTERN:
- Similar violations: ${learning.deployedViolations}
- Incident rate: ${(learning.incidentRate * 100).toFixed(1)}%
- Risk score: ${(learning.riskScore * 100).toFixed(1)}%
- Confidence interval: [${learning.confidenceInterval[0].toFixed(2)}, ${learning.confidenceInterval[1].toFixed(2)}]`
      : 'No historical data available.';

    return `You are OLYMPUS Governance AI. Decide remediation for this violation.

VIOLATION:
- ID: ${violation.id}
- Type: ${violation.pattern}
- Severity: ${severityMap[violation.tier] || 'unknown'}
- File: ${violation.filePath}
- Detection confidence: ${(violation.confidence * 100).toFixed(1)}%

${learningSection}

AVAILABLE ACTIONS:
- "alert-human": Alert engineers for manual review
- "auto-fix": Apply automated fix
- "suppress": Suppress this pattern (proven safe)
- "rollback": Revert to previous state
- "patch": Apply targeted patch
- "isolate": Quarantine affected component

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "action": "alert-human" | "auto-fix" | "suppress" | "rollback" | "patch" | "isolate",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence explanation",
  "parameters": {}
}`;
  }

  // ============================================================================
  // PRIVATE: RESPONSE PARSING (FIX #7: Zod validation)
  // ============================================================================

  private parseResponse(raw: string): Omit<ClaudeDecisionResult, 'source' | 'latencyMs'> | null {
    try {
      let jsonStr = raw.trim();

      // Strip markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Zod validates structure + types + ranges
      const validated = ClaudeResponseSchema.parse(parsed);

      const action = this.normalizeAction(validated.action);

      return {
        action,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
        parameters: validated.parameters,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.log('error', 'response-validation-failed', {
          zodErrors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          rawPrefix: raw.substring(0, 200),
        });
      } else {
        this.log('error', 'response-parse-failed', {
          error: error instanceof Error ? error.message : String(error),
          rawPrefix: raw.substring(0, 200),
        });
      }
      return null;
    }
  }

  // ============================================================================
  // PRIVATE: ACTION NORMALIZATION
  // ============================================================================

  private normalizeAction(action: string): ClaudeDecisionResult['action'] {
    const normalized: Record<string, ClaudeDecisionResult['action']> = {
      'alert-human': 'alert-human',
      alert: 'alert-human',
      'auto-fix': 'auto-fix',
      autofix: 'auto-fix',
      fix: 'auto-fix',
      suppress: 'suppress',
      ignore: 'suppress',
      rollback: 'rollback',
      revert: 'rollback',
      patch: 'patch',
      isolate: 'isolate',
      quarantine: 'isolate',
    };

    return normalized[action.toLowerCase()] || 'alert-human';
  }

  // ============================================================================
  // PRIVATE: PATTERN DETECTION
  // ============================================================================

  private isComplexPattern(pattern: string): boolean {
    const complexPatterns = [
      'sql_injection',
      'xss_vulnerability',
      'auth_bypass',
      'missing_authority_check',
      'hardcoded_credentials',
      'race_condition',
      'memory_leak',
      'insecure_deserialization',
    ];

    const normalizedInput = pattern.toLowerCase().replace(/_/g, '');
    return complexPatterns.some(p => normalizedInput.includes(p.replace(/_/g, '')));
  }

  /**
   * Validate that a violation object has required fields with correct types.
   * Prevents crashes on null/undefined/garbage input.
   */
  private isValidViolation(violation: Violation): boolean {
    if (!violation || typeof violation !== 'object') return false;
    if (typeof violation.id !== 'string' || violation.id.length === 0) return false;
    if (typeof violation.pattern !== 'string') return false;
    if (typeof violation.confidence !== 'number' || isNaN(violation.confidence)) return false;
    if (typeof violation.tier !== 'number') return false;
    return true;
  }

  // ============================================================================
  // PRIVATE: CIRCUIT BREAKER
  // ============================================================================

  private isCircuitOpen(): boolean {
    if (!this.circuit.isOpen) return false;

    if (Date.now() - this.circuit.lastFailure > this.cooldownMs) {
      this.circuit.isOpen = false;
      this.circuit.failures = 0;
      this.log('info', 'circuit-closed', { reason: 'cooldown-expired' });
      return false;
    }

    return true;
  }

  private recordSuccess(): void {
    this.circuit.failures = Math.max(0, this.circuit.failures - 1);
    this.lastSuccessTime = Date.now();
    this.lastError = undefined;
  }

  private recordFailure(errorMessage: string): void {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();
    this.lastError = errorMessage;

    if (this.circuit.failures >= this.maxFailures) {
      this.circuit.isOpen = true;
      this.metricsTracker.recordCircuitOpen();
      this.log('warn', 'circuit-opened', {
        failures: this.circuit.failures,
        cooldownMs: this.cooldownMs,
      });
    }
  }

  // ============================================================================
  // PRIVATE: STRUCTURED LOGGING (FIX #3)
  // ============================================================================

  private log(level: LogEntry['level'], event: string, data?: Record<string, unknown>): void {
    this.logger.log({
      timestamp: Date.now(),
      level,
      component: 'ClaudeAdapter',
      event,
      data,
    });
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

interface GovernanceConfigLike {
  readonly experimentalStrategies?: Readonly<Record<string, unknown>>;
}

/**
 * Create a ClaudeCodeAdapter from governance config.
 */
export function createClaudeCodeAdapter(
  config?: { experimentalStrategies?: Record<string, unknown> },
  logger?: AdapterLogger
): ClaudeCodeAdapter {
  const claudeConfig = config?.experimentalStrategies;
  const claudeCodeConfig = claudeConfig?.claudeCode as ClaudeCodeConfig | undefined;

  return new ClaudeCodeAdapter(
    {
      enabled: claudeCodeConfig?.enabled ?? false,
      timeoutMs: claudeCodeConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxFailures: claudeCodeConfig?.maxFailures ?? DEFAULT_MAX_FAILURES,
      cooldownMs: claudeCodeConfig?.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      minSeverity: claudeCodeConfig?.minSeverity ?? 'high',
      maxCallsPerSecond: claudeCodeConfig?.maxCallsPerSecond ?? DEFAULT_MAX_CALLS_PER_SECOND,
      cacheTtlMs: claudeCodeConfig?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
    },
    logger
  );
}

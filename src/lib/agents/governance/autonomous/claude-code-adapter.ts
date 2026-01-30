/**
 * Claude Code Adapter - OLYMPUS Governance Integration
 *
 * Wraps Claude Code CLI for autonomous governance decisions.
 * Features:
 * - Circuit breaker protection (3 failures → 60s cooldown → retry)
 * - Graceful degradation to rule-based decisions
 * - JSON-only responses for deterministic parsing
 * - Configurable enable/disable via config
 *
 * @module governance/claude-code-adapter
 * @version 1.0.0
 * @since 2026-01-30
 *
 * @example
 * ```typescript
 * const adapter = new ClaudeCodeAdapter({ enabled: true });
 *
 * if (adapter.shouldUse(violation)) {
 *   const decision = await adapter.decide(violation, learning);
 *   if (decision) {
 *     // Use Claude's decision
 *     return decision;
 *   }
 *   // Falls back to rule-based
 * }
 * ```
 */

import { execSync } from 'child_process';
import type { Violation, PatternLearning, DecisionResult } from './decision-strategy-loader';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended DecisionResult for Claude Code adapter.
 * Includes Claude's extended action set and source tracking.
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
  readonly reason: string;
  readonly reasoning: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly source: 'claude-code';
}

/**
 * Claude Code adapter configuration.
 */
export interface ClaudeCodeConfig {
  /** Enable/disable Claude Code integration */
  readonly enabled?: boolean;
  /** Timeout for Claude CLI calls in milliseconds */
  readonly timeoutMs?: number;
  /** Max consecutive failures before circuit opens */
  readonly maxFailures?: number;
  /** Cooldown period in milliseconds when circuit is open */
  readonly cooldownMs?: number;
  /** Minimum violation severity to use Claude */
  readonly minSeverity?: 'low' | 'medium' | 'high' | 'critical';
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
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_FAILURES = 3;
const DEFAULT_COOLDOWN_MS = 60_000;

// ============================================================================
// CLAUDE CODE ADAPTER
// ============================================================================

/**
 * Adapter for calling Claude Code CLI from OLYMPUS governance.
 *
 * Implements circuit breaker pattern to prevent cascade failures.
 * Falls back to rule-based decisions when Claude is unavailable.
 */
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
  private lastError?: string;
  private lastSuccessTime?: number;

  constructor(config: ClaudeCodeConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxFailures = config.maxFailures ?? DEFAULT_MAX_FAILURES;
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.minSeverity = config.minSeverity ?? 'high';
  }

  /**
   * Check if Claude should be used for this violation.
   *
   * Returns false if:
   * - Adapter is disabled
   * - Circuit breaker is open
   * - Violation severity is too low
   *
   * @param violation - The violation to evaluate
   * @returns Whether to attempt Claude decision
   */
  shouldUse(violation: Violation): boolean {
    if (!this.enabled) return false;
    if (this.isCircuitOpen()) return false;

    // Only use Claude for high-severity or complex decisions
    // Tier 3 = irreversible (critical), Tier 2 = writes (high), Tier 1 = reads (low)
    const isHighSeverity = violation.tier >= 2 || violation.confidence > 0.8;
    const isComplexPattern = this.isComplexPattern(violation.pattern);

    return isHighSeverity || isComplexPattern;
  }

  /**
   * Ask Claude Code to make a governance decision (synchronous).
   * Uses execSync internally for blocking CLI calls.
   *
   * @param violation - The violation to evaluate
   * @param learning - Historical learning data (null if none)
   * @returns Decision result or null to fall back to rules
   */
  decideSync(violation: Violation, learning: PatternLearning | null): ClaudeDecisionResult | null {
    if (this.isCircuitOpen()) {
      return null; // Fallback to rule-based
    }

    const prompt = this.buildPrompt(violation, learning);

    try {
      const result = execSync(`claude -p "${this.escapePrompt(prompt)}" --output-format json`, {
        timeout: this.timeoutMs,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true, // Don't show console window on Windows
      });

      this.recordSuccess();
      return this.parseResponse(result);
    } catch (error) {
      this.recordFailure(error instanceof Error ? error.message : String(error));
      console.error('[ClaudeAdapter] Decision failed:', error);
      return null; // Fallback to rule-based
    }
  }

  /**
   * Ask Claude Code to make a governance decision (async wrapper).
   * Wraps decideSync for Promise-based callers.
   *
   * @param violation - The violation to evaluate
   * @param learning - Historical learning data (null if none)
   * @returns Decision result or null to fall back to rules
   */
  async decide(
    violation: Violation,
    learning: PatternLearning | null
  ): Promise<ClaudeDecisionResult | null> {
    return this.decideSync(violation, learning);
  }

  /**
   * Get current health status for monitoring/dashboards.
   */
  getHealth(): ClaudeAdapterHealth {
    return {
      available: this.enabled && !this.isCircuitOpen(),
      errorCount: this.circuit.failures,
      circuitOpen: this.circuit.isOpen,
      lastError: this.lastError,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Manually reset the circuit breaker.
   * Useful for testing or forced recovery.
   */
  resetCircuit(): void {
    this.circuit = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };
    this.lastError = undefined;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Build the prompt for Claude.
   */
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

  /**
   * Parse Claude's JSON response.
   */
  private parseResponse(raw: string): ClaudeDecisionResult | null {
    try {
      // Claude may wrap response in markdown code blocks - extract JSON
      let jsonStr = raw.trim();

      // Remove markdown code block if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.action || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response structure: missing action or confidence');
      }

      // Map Claude actions to standard governance actions if needed
      const action = this.normalizeAction(parsed.action);

      const reasoning = parsed.reasoning || '';
      return {
        action,
        confidence: Math.min(1, Math.max(0, parsed.confidence)),
        reason: reasoning,
        reasoning: reasoning,
        parameters: parsed.parameters || {},
        source: 'claude-code',
      };
    } catch (error) {
      console.error('[ClaudeAdapter] Failed to parse response:', error);
      console.error('[ClaudeAdapter] Raw response:', raw.substring(0, 500));
      return null;
    }
  }

  /**
   * Normalize action names to match governance system.
   */
  private normalizeAction(action: string): ClaudeDecisionResult['action'] {
    const normalizedActions: Record<string, ClaudeDecisionResult['action']> = {
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

    const normalized = normalizedActions[action.toLowerCase()];
    return normalized || 'alert-human'; // Default to safest action
  }

  /**
   * Escape prompt for shell execution.
   */
  private escapePrompt(prompt: string): string {
    return prompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
  }

  /**
   * Check if a pattern is considered complex.
   */
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

    // Normalize both sides by removing underscores for comparison
    const normalizedInput = pattern.toLowerCase().replace(/_/g, '');
    return complexPatterns.some(p => normalizedInput.includes(p.replace(/_/g, '')));
  }

  /**
   * Check if circuit breaker is open.
   */
  private isCircuitOpen(): boolean {
    if (!this.circuit.isOpen) return false;

    // Check if cooldown has passed
    if (Date.now() - this.circuit.lastFailure > this.cooldownMs) {
      this.circuit.isOpen = false;
      this.circuit.failures = 0;
      console.info('[ClaudeAdapter] Circuit CLOSED - cooldown expired, retrying');
      return false;
    }

    return true;
  }

  /**
   * Record a successful call.
   */
  private recordSuccess(): void {
    this.circuit.failures = Math.max(0, this.circuit.failures - 1);
    this.lastSuccessTime = Date.now();
    this.lastError = undefined;
  }

  /**
   * Record a failed call.
   */
  private recordFailure(errorMessage: string): void {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();
    this.lastError = errorMessage;

    if (this.circuit.failures >= this.maxFailures) {
      this.circuit.isOpen = true;
      console.warn(
        `[ClaudeAdapter] Circuit OPEN - ${this.circuit.failures} failures. Falling back to rules for ${this.cooldownMs / 1000}s`
      );
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * GovernanceConfig type (minimal interface to avoid circular dependency)
 */
interface GovernanceConfigLike {
  readonly experimentalStrategies?: Readonly<Record<string, unknown>>;
}

/**
 * Create a ClaudeCodeAdapter from governance config.
 *
 * @param config - Governance configuration object (any object with experimentalStrategies)
 * @returns Configured adapter instance
 */
export function createClaudeCodeAdapter(config?: {
  experimentalStrategies?: Record<string, unknown>;
}): ClaudeCodeAdapter {
  const claudeConfig = config?.experimentalStrategies;
  const claudeCodeConfig = claudeConfig?.claudeCode as ClaudeCodeConfig | undefined;

  return new ClaudeCodeAdapter({
    enabled: claudeCodeConfig?.enabled ?? false,
    timeoutMs: claudeCodeConfig?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxFailures: claudeCodeConfig?.maxFailures ?? DEFAULT_MAX_FAILURES,
    cooldownMs: claudeCodeConfig?.cooldownMs ?? DEFAULT_COOLDOWN_MS,
    minSeverity: claudeCodeConfig?.minSeverity ?? 'high',
  });
}

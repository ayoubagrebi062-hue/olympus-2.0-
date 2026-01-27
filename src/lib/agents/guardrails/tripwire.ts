/**
 * OLYMPUS 10X - Tripwire System
 *
 * Configurable pattern-based triggers with graduated responses.
 * Runs before/alongside layers for immediate threat detection.
 *
 * Actions: allow | warn | block | halt | terminate
 */

import { GUARDRAIL_PATTERNS } from '@/lib/core';
import type { GuardrailInput, TripwireConfig, GuardrailAction } from '@/lib/core';
import type { GuardrailContext } from './types';

// ============================================================================
// TRIPWIRE RESULT
// ============================================================================

export interface TripwireResult {
  /** Whether any tripwire was triggered */
  triggered: boolean;

  /** The action to take */
  action: GuardrailAction;

  /** Which tripwire was triggered (if any) */
  tripwireName?: string;

  /** Confidence of the match (0-1) */
  confidence: number;

  /** Reason for the trigger */
  reason: string;

  /** Match details */
  match?: {
    pattern: string;
    matchedText: string;
    position: number;
  };
}

// ============================================================================
// DEFAULT TRIPWIRES (From Plan)
// ============================================================================

export const DEFAULT_TRIPWIRES: TripwireConfig[] = [
  // Priority 0: Size/Format checks (run first)
  {
    name: 'excessive-length',
    pattern: (input: string) => input.length > 100000,
    action: 'block',
    priority: 0,
  },

  // Priority 1: Critical security threats
  {
    name: 'sql-injection',
    pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i,
    action: 'block',
    priority: 1,
  },
  {
    name: 'prompt-injection-ignore',
    pattern: new RegExp(GUARDRAIL_PATTERNS.PROMPT_INJECTION_IGNORE),
    action: 'terminate',
    priority: 1,
  },
  {
    name: 'prompt-injection-roleplay',
    pattern: new RegExp(GUARDRAIL_PATTERNS.PROMPT_INJECTION_ROLEPLAY),
    action: 'terminate',
    priority: 1,
  },
  {
    name: 'jailbreak-attempt',
    pattern: /\b(jailbreak|DAN|developer\s*mode|unrestricted|do\s*anything\s*now)\b/i,
    action: 'terminate',
    priority: 1,
  },

  // Priority 2: PII Protection
  {
    name: 'pii-ssn',
    pattern: new RegExp(GUARDRAIL_PATTERNS.SSN_PATTERN),
    action: 'block',
    priority: 2,
  },
  {
    name: 'pii-credit-card',
    pattern: new RegExp(GUARDRAIL_PATTERNS.CREDIT_CARD_PATTERN),
    action: 'block',
    priority: 2,
  },
  {
    name: 'api-key-exposure',
    pattern:
      /\b(sk_live_|pk_live_|api[_-]?key|secret[_-]?key|password)\s*[:=]\s*['"]?[A-Za-z0-9_-]{16,}['"]?/i,
    action: 'block',
    priority: 2,
  },

  // Priority 3: XSS and Code Injection
  {
    name: 'xss-script-tag',
    pattern: /<script[^>]*>[\s\S]*?<\/script>/i,
    action: 'block',
    priority: 3,
  },
  {
    name: 'xss-event-handler',
    pattern: /\bon(load|error|click|mouseover|focus)\s*=\s*['"][^'"]*['"]/i,
    action: 'block',
    priority: 3,
  },
  {
    name: 'command-injection',
    pattern: /;\s*(rm|cat|wget|curl|nc|bash|sh|python|perl|ruby)\s/i,
    action: 'terminate',
    priority: 3,
  },

  // Priority 4: Path Traversal
  {
    name: 'path-traversal',
    pattern: /\.\.[\/\\]/,
    action: 'warn',
    priority: 4,
  },
];

// ============================================================================
// TRIPWIRE SYSTEM
// ============================================================================

export class TripwireSystem {
  private tripwires: TripwireConfig[];
  private bypassRoles: Set<string>;

  constructor(customTripwires: TripwireConfig[] = [], bypassRoles: string[] = ['admin', 'system']) {
    // Merge default tripwires with custom ones
    this.tripwires = [...DEFAULT_TRIPWIRES, ...customTripwires];

    // Sort by priority (lower = runs first)
    this.tripwires.sort((a, b) => a.priority - b.priority);

    this.bypassRoles = new Set(bypassRoles);
  }

  /**
   * Check input against all tripwires.
   * Returns on first match (fail-fast).
   */
  check(context: GuardrailContext, input: GuardrailInput): TripwireResult {
    const prompt = input.prompt || '';

    // Check bypass
    if (this.shouldBypass(context)) {
      return {
        triggered: false,
        action: 'allow',
        confidence: 1.0,
        reason: 'Tripwires bypassed for admin/system role',
      };
    }

    // Check each tripwire in priority order
    for (const tripwire of this.tripwires) {
      // Check role-based bypass for this specific tripwire
      if (tripwire.bypassRoles && context.userRoles) {
        const canBypass = context.userRoles.some(role => tripwire.bypassRoles!.includes(role));
        if (canBypass) continue;
      }

      const matchResult = this.checkTripwire(tripwire, prompt);
      if (matchResult.triggered) {
        return matchResult;
      }
    }

    // No tripwires triggered
    return {
      triggered: false,
      action: 'allow',
      confidence: 1.0,
      reason: 'No tripwires triggered',
    };
  }

  /**
   * Check a single tripwire against input.
   */
  private checkTripwire(tripwire: TripwireConfig, input: string): TripwireResult {
    const { name, pattern, action } = tripwire;

    if (pattern instanceof RegExp) {
      const match = input.match(pattern);
      if (match) {
        return {
          triggered: true,
          action,
          tripwireName: name,
          confidence: 0.95,
          reason: `Tripwire '${name}' triggered`,
          match: {
            pattern: pattern.source,
            matchedText: match[0].substring(0, 100), // Limit for logging
            position: match.index || 0,
          },
        };
      }
    } else if (typeof pattern === 'function') {
      try {
        if (pattern(input)) {
          return {
            triggered: true,
            action,
            tripwireName: name,
            confidence: 0.9,
            reason: `Tripwire '${name}' triggered (function match)`,
          };
        }
      } catch (error) {
        // Function threw - treat as no match but log
        console.warn(`Tripwire '${name}' function threw:`, error);
      }
    }

    return {
      triggered: false,
      action: 'allow',
      confidence: 1.0,
      reason: 'No match',
    };
  }

  /**
   * Check if context allows bypassing tripwires.
   */
  private shouldBypass(context: GuardrailContext): boolean {
    if (!context.userRoles) return false;
    return context.userRoles.some(role => this.bypassRoles.has(role));
  }

  // ===========================================================================
  // MANAGEMENT METHODS
  // ===========================================================================

  /**
   * Add a new tripwire.
   */
  addTripwire(tripwire: TripwireConfig): void {
    this.tripwires.push(tripwire);
    this.tripwires.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a tripwire by name.
   */
  removeTripwire(name: string): boolean {
    const index = this.tripwires.findIndex(t => t.name === name);
    if (index !== -1) {
      this.tripwires.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all tripwires.
   */
  getTripwires(): TripwireConfig[] {
    return [...this.tripwires];
  }

  /**
   * Get tripwire by name.
   */
  getTripwire(name: string): TripwireConfig | undefined {
    return this.tripwires.find(t => t.name === name);
  }

  /**
   * Update a tripwire.
   */
  updateTripwire(name: string, updates: Partial<TripwireConfig>): boolean {
    const tripwire = this.tripwires.find(t => t.name === name);
    if (tripwire) {
      Object.assign(tripwire, updates);
      if (updates.priority !== undefined) {
        this.tripwires.sort((a, b) => a.priority - b.priority);
      }
      return true;
    }
    return false;
  }

  /**
   * Clear all custom tripwires, keeping only defaults.
   */
  resetToDefaults(): void {
    this.tripwires = [...DEFAULT_TRIPWIRES];
    this.tripwires.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Disable a tripwire temporarily.
   */
  disableTripwire(name: string): boolean {
    return this.removeTripwire(name);
  }

  /**
   * Get tripwire statistics.
   */
  getStats(): {
    total: number;
    byAction: Record<GuardrailAction, number>;
    byPriority: Record<number, number>;
  } {
    const byAction: Record<GuardrailAction, number> = {
      allow: 0,
      warn: 0,
      block: 0,
      halt: 0,
      terminate: 0,
    };

    const byPriority: Record<number, number> = {};

    for (const tripwire of this.tripwires) {
      byAction[tripwire.action]++;
      byPriority[tripwire.priority] = (byPriority[tripwire.priority] || 0) + 1;
    }

    return {
      total: this.tripwires.length,
      byAction,
      byPriority,
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new tripwire system instance.
 */
export function createTripwireSystem(
  customTripwires?: TripwireConfig[],
  bypassRoles?: string[]
): TripwireSystem {
  return new TripwireSystem(customTripwires, bypassRoles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_TRIPWIRES as BUILTIN_TRIPWIRES };

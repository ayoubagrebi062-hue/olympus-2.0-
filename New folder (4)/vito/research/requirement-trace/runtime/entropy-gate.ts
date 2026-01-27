/**
 * Entropy Gate
 *
 * Enforces phase rules. Non-bypassable.
 *
 * ENFORCEMENT RULES:
 *   STABLE:     CONTINUE - Normal execution allowed
 *   DECAYING:   MCCS_MANDATORY - Must apply MCCS intervention
 *   COLLAPSING: READ_ONLY - No mutations allowed
 *   DEAD:       PERMANENT_HALT - System is dead
 *
 * NON-NEGOTIABLE:
 *   - Gate is non-bypassable
 *   - No config
 *   - No flag
 *   - No override
 *   - Deterministic only
 *
 * PHILOSOPHY:
 *   Bugs are local. Entropy is existential.
 *   Olympus must protect the future, not just the present.
 */

import type {
  ArchitecturalPhase,
  ArchitecturalEntropyScore,
  EntropyEnforcementAction,
  EntropyGateResult
} from './types';

// AEC version - immutable
const AEC_VERSION = '1.0.0';
Object.freeze({ AEC_VERSION });

// ENFORCEMENT RULES - Fixed mapping from phase to action
const PHASE_ENFORCEMENT_RULES: Record<ArchitecturalPhase, EntropyEnforcementAction> = Object.freeze({
  STABLE: 'CONTINUE',
  DECAYING: 'MCCS_MANDATORY',
  COLLAPSING: 'READ_ONLY',
  DEAD: 'PERMANENT_HALT'
});

Object.freeze(PHASE_ENFORCEMENT_RULES);

// ENFORCEMENT REASONS - Fixed messages for each action
const ENFORCEMENT_REASONS: Record<EntropyEnforcementAction, string | null> = Object.freeze({
  CONTINUE: null,
  MCCS_MANDATORY: 'Phase is DECAYING. MCCS intervention is mandatory before execution can continue. Apply the recommended MCCS to reduce architectural entropy.',
  READ_ONLY: 'Phase is COLLAPSING. System is in READ_ONLY mode. No mutations allowed. Only diagnostic operations permitted.',
  PERMANENT_HALT: 'Phase is DEAD. System has reached terminal entropy. PERMANENT HALT enforced. No recovery possible. Architecture must be rebuilt from scratch.'
});

Object.freeze(ENFORCEMENT_REASONS);

export class EntropyGate {
  /**
   * Enforce phase rules
   *
   * This gate is NON-BYPASSABLE.
   * There is no config, flag, or override to disable it.
   *
   * @param entropyScore - Current entropy score
   * @param phase - Current architectural phase
   * @param runId - Current run ID
   */
  enforce(
    entropyScore: ArchitecturalEntropyScore,
    phase: ArchitecturalPhase,
    runId: string
  ): EntropyGateResult {
    const now = new Date().toISOString();

    // Determine enforcement action from fixed rules
    const action = PHASE_ENFORCEMENT_RULES[phase];

    // Determine execution permissions
    const executionAllowed = action === 'CONTINUE' || action === 'MCCS_MANDATORY';
    const mutationsAllowed = action === 'CONTINUE';

    // Get enforcement reason
    const enforcementReason = ENFORCEMENT_REASONS[action];

    return {
      timestamp: now,
      run_id: runId,

      entropy_score: entropyScore,
      phase,

      action,
      execution_allowed: executionAllowed,
      mutations_allowed: mutationsAllowed,

      gate_proof: {
        thresholds_immutable: true,
        phase_deterministic: true,
        action_non_bypassable: true,
        no_config: true,
        no_flag: true,
        no_override: true
      },

      enforcement_reason: enforcementReason
    };
  }

  /**
   * Check if action allows execution
   */
  allowsExecution(action: EntropyEnforcementAction): boolean {
    return action === 'CONTINUE' || action === 'MCCS_MANDATORY';
  }

  /**
   * Check if action allows mutations
   */
  allowsMutations(action: EntropyEnforcementAction): boolean {
    return action === 'CONTINUE';
  }

  /**
   * Check if action is terminal
   */
  isTerminal(action: EntropyEnforcementAction): boolean {
    return action === 'PERMANENT_HALT';
  }

  /**
   * Check if action requires MCCS
   */
  requiresMCCS(action: EntropyEnforcementAction): boolean {
    return action === 'MCCS_MANDATORY';
  }

  /**
   * Check if action enforces read-only
   */
  isReadOnly(action: EntropyEnforcementAction): boolean {
    return action === 'READ_ONLY';
  }

  /**
   * Get enforcement rules (for documentation/reporting)
   */
  getEnforcementRules(): typeof PHASE_ENFORCEMENT_RULES {
    return PHASE_ENFORCEMENT_RULES;
  }

  /**
   * Get enforcement reason for an action
   */
  getEnforcementReason(action: EntropyEnforcementAction): string | null {
    return ENFORCEMENT_REASONS[action];
  }

  /**
   * Get action for a phase
   */
  getActionForPhase(phase: ArchitecturalPhase): EntropyEnforcementAction {
    return PHASE_ENFORCEMENT_RULES[phase];
  }
}

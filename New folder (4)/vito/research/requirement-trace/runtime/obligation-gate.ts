/**
 * Obligation Gate
 *
 * Integrates with TSL + AAM to control system progress.
 * Blocks progress if critical obligations are unmet.
 *
 * KEY PRINCIPLE:
 * - "Progress without responsibility is chaos."
 * - Critical obligations must be addressed before proceeding
 * - Unaddressed violations block further action
 *
 * GATE DECISIONS:
 * - ALLOW: No blocking obligations, proceed normally
 * - BLOCK_CRITICAL_OBLIGATION: Critical obligation requires immediate attention
 * - BLOCK_VIOLATION_UNADDRESSED: Past omission violation not yet addressed
 *
 * INTEGRATION:
 * - Works with TSL for temporal validation
 * - Works with AAM for authority validation
 * - Enforces obligation resolution
 *
 * NON-NEGOTIABLE:
 * - Deterministic gate decisions
 * - No bypassing critical obligations
 * - Clear blocking reasons
 */

import type {
  RequiredDecision,
  ObligationGateResult,
  OmissionViolation,
  ObligationPriority
} from './types';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * Gate configuration
 */
export interface ObligationGateConfig {
  // Block on critical obligations?
  block_on_critical?: boolean;

  // Block on unaddressed violations?
  block_on_violations?: boolean;

  // Warning threshold (steps before deadline)
  warning_threshold_steps?: number;

  // Priorities that cause blocking
  blocking_priorities?: ObligationPriority[];
}

export class ObligationGate {
  private config: Required<ObligationGateConfig>;

  constructor(config?: Partial<ObligationGateConfig>) {
    this.config = {
      block_on_critical: config?.block_on_critical ?? true,
      block_on_violations: config?.block_on_violations ?? true,
      warning_threshold_steps: config?.warning_threshold_steps ?? 5,
      blocking_priorities: config?.blocking_priorities ?? ['CRITICAL']
    };
  }

  /**
   * Check if system can proceed
   */
  check(
    pendingObligations: RequiredDecision[],
    unaddressedViolations: OmissionViolation[],
    currentStep: number
  ): ObligationGateResult {
    const timestamp = new Date().toISOString();

    // Find blocking obligations (critical and past deadline)
    const blockingObligations = this.findBlockingObligations(
      pendingObligations,
      currentStep
    );

    // Check for unaddressed violations
    const hasUnaddressedViolations =
      this.config.block_on_violations && unaddressedViolations.length > 0;

    // Find warning obligations (approaching deadline)
    const warningObligations = this.findWarningObligations(
      pendingObligations,
      currentStep
    );

    // Determine gate decision
    let proceed = true;
    let decision: ObligationGateResult['decision'] = 'ALLOW';

    if (hasUnaddressedViolations) {
      proceed = false;
      decision = 'BLOCK_VIOLATION_UNADDRESSED';
    } else if (blockingObligations.length > 0 && this.config.block_on_critical) {
      proceed = false;
      decision = 'BLOCK_CRITICAL_OBLIGATION';
    }

    return {
      proceed,
      decision,
      blocking_obligations: blockingObligations,
      unaddressed_violations: unaddressedViolations,
      warning_obligations: warningObligations,
      checked_at: timestamp,
      current_step: currentStep
    };
  }

  /**
   * Check if a specific action can proceed given current obligations
   */
  checkForAction(
    actionType: string,
    pendingObligations: RequiredDecision[],
    unaddressedViolations: OmissionViolation[],
    currentStep: number
  ): ObligationGateResult & { action_allowed: boolean; related_obligations: RequiredDecision[] } {
    const baseResult = this.check(pendingObligations, unaddressedViolations, currentStep);

    // Find obligations related to this action type
    const relatedObligations = pendingObligations.filter(
      obl => obl.required_action_type === actionType
    );

    // Action is allowed if:
    // 1. No blocking obligations for this action type
    // 2. Or the action would fulfill an obligation
    const actionWouldFulfill = relatedObligations.length > 0;
    const actionAllowed = baseResult.proceed || actionWouldFulfill;

    return {
      ...baseResult,
      action_allowed: actionAllowed,
      related_obligations: relatedObligations
    };
  }

  /**
   * Find obligations that should block progress
   */
  private findBlockingObligations(
    obligations: RequiredDecision[],
    currentStep: number
  ): RequiredDecision[] {
    const blocking: RequiredDecision[] = [];

    for (const obl of obligations) {
      // Check if priority is in blocking list
      if (!this.config.blocking_priorities.includes(obl.priority)) {
        continue;
      }

      // Check if deadline is imminent or passed
      const stepsRemaining = obl.deadline_step - currentStep;

      // Block if deadline passed
      if (stepsRemaining <= 0) {
        blocking.push(obl);
        continue;
      }

      // Block if CRITICAL and very close to deadline (< 2 steps)
      if (obl.priority === 'CRITICAL' && stepsRemaining <= 2) {
        blocking.push(obl);
      }
    }

    return blocking;
  }

  /**
   * Find obligations approaching deadline (warnings)
   */
  private findWarningObligations(
    obligations: RequiredDecision[],
    currentStep: number
  ): Array<{ obligation: RequiredDecision; steps_remaining: number }> {
    const warnings: Array<{ obligation: RequiredDecision; steps_remaining: number }> = [];

    for (const obl of obligations) {
      const stepsRemaining = obl.deadline_step - currentStep;

      // Warn if within threshold and not yet passed
      if (stepsRemaining > 0 && stepsRemaining <= this.config.warning_threshold_steps) {
        warnings.push({ obligation: obl, steps_remaining: stepsRemaining });
      }
    }

    // Sort by urgency (least steps remaining first)
    return warnings.sort((a, b) => a.steps_remaining - b.steps_remaining);
  }

  /**
   * Validate that an obligation can be fulfilled by given authority
   */
  validateFulfillmentAuthority(
    obligation: RequiredDecision,
    fulfillerAuthority: string,
    authorityLevel: number
  ): { valid: boolean; reason: string | null } {
    // Map authority class to level
    const requiredLevel = this.getAuthorityLevel(obligation.required_authority_class);

    if (authorityLevel < requiredLevel) {
      return {
        valid: false,
        reason: `Insufficient authority: ${fulfillerAuthority} (level ${authorityLevel}) cannot fulfill obligation requiring ${obligation.required_authority_class} (level ${requiredLevel})`
      };
    }

    return { valid: true, reason: null };
  }

  /**
   * Get authority level (mirrors AAM registry)
   */
  private getAuthorityLevel(authority: string): number {
    const levels: Record<string, number> = {
      'USER': 1,
      'PROJECT': 2,
      'CONSTITUTIONAL': 3,
      'SYSTEM_ROOT': 4
    };
    return levels[authority] ?? 0;
  }

  /**
   * Get gate configuration
   */
  getConfig(): ObligationGateConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ObligationGateConfig>): void {
    if (updates.block_on_critical !== undefined) {
      this.config.block_on_critical = updates.block_on_critical;
    }
    if (updates.block_on_violations !== undefined) {
      this.config.block_on_violations = updates.block_on_violations;
    }
    if (updates.warning_threshold_steps !== undefined) {
      this.config.warning_threshold_steps = updates.warning_threshold_steps;
    }
    if (updates.blocking_priorities !== undefined) {
      this.config.blocking_priorities = [...updates.blocking_priorities];
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    block_on_critical: boolean;
    block_on_violations: boolean;
    warning_threshold_steps: number;
    blocking_priorities: ObligationPriority[];
  } {
    return {
      block_on_critical: this.config.block_on_critical,
      block_on_violations: this.config.block_on_violations,
      warning_threshold_steps: this.config.warning_threshold_steps,
      blocking_priorities: [...this.config.blocking_priorities]
    };
  }
}

/**
 * Create a new ObligationGate
 */
export function createObligationGate(
  config?: Partial<ObligationGateConfig>
): ObligationGate {
  return new ObligationGate(config);
}

/**
 * Obligation Deriver
 *
 * Derives required decisions from system state.
 * Makes omission detectable before it occurs.
 *
 * KEY PRINCIPLE:
 * - "Silence is not neutral - it is a choice."
 * - Obligations emerge from NecessaryFuture, Temporal Contracts, and Invariants
 * - Each obligation has a deadline and required authority
 *
 * INPUT SOURCES:
 * 1. NecessaryFuture - Required future states from NE
 * 2. Temporal Contracts - Contract requirements from TSL
 * 3. Invariant Set - Invariant maintenance requirements
 *
 * OUTPUT:
 * - RequiredDecision[] with deadlines and authority requirements
 *
 * NON-NEGOTIABLE:
 * - Deterministic derivation
 * - No probability or heuristics
 * - Clear authority requirements
 */

import * as crypto from 'crypto';
import type {
  RequiredDecision,
  ObligationDerivationResult,
  ObligationSource,
  ObligationPriority,
  AuthorityClass,
  InvariantCategory,
  TemporalContractSummary
} from './types';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * Necessary future input
 */
export interface NecessaryFutureInput {
  exists: boolean;
  survivable_steps: number;
  first_violation_step: number | null;
  projected_survivability: number;
  required_actions?: Array<{
    action_type: string;
    description: string;
    deadline_step: number;
  }>;
}

/**
 * Temporal state input
 */
export interface TemporalStateInput {
  current_step: number;
  contract: TemporalContractSummary | null;
  entropy_budget_remaining: number;
  entropy_budget_exhausted: boolean;
}

/**
 * Invariant requirement
 */
export interface InvariantRequirement {
  invariant: InvariantCategory;
  requires_action: boolean;
  action_type: string;
  description: string;
  deadline_steps: number;
  minimum_authority: AuthorityClass;
}

/**
 * Deriver configuration
 */
export interface ObligationDeriverConfig {
  // Default deadline for obligations without explicit deadline
  default_deadline_steps?: number;

  // Default priority for derived obligations
  default_priority?: ObligationPriority;
}

export class ObligationDeriver {
  private config: Required<ObligationDeriverConfig>;
  private derivationCount: number = 0;

  constructor(config?: Partial<ObligationDeriverConfig>) {
    this.config = {
      default_deadline_steps: config?.default_deadline_steps ?? 10,
      default_priority: config?.default_priority ?? 'MEDIUM'
    };
  }

  /**
   * Derive obligations from all sources
   */
  derive(
    necessaryFuture: NecessaryFutureInput | null,
    temporalState: TemporalStateInput,
    invariantRequirements: InvariantRequirement[]
  ): ObligationDerivationResult {
    const obligations: RequiredDecision[] = [];

    // Derive from NecessaryFuture
    const nfObligations = this.deriveFromNecessaryFuture(
      necessaryFuture,
      temporalState.current_step
    );
    obligations.push(...nfObligations);

    // Derive from Temporal Contract
    const tcObligations = this.deriveFromTemporalContract(
      temporalState
    );
    obligations.push(...tcObligations);

    // Derive from Invariant Requirements
    const irObligations = this.deriveFromInvariants(
      invariantRequirements,
      temporalState.current_step
    );
    obligations.push(...irObligations);

    // Count by source
    const bySource: Record<ObligationSource, number> = {
      'NECESSARY_FUTURE': 0,
      'TEMPORAL_CONTRACT': 0,
      'INVARIANT_REQUIREMENT': 0,
      'SYSTEM_MANDATE': 0
    };

    const byPriority: Record<ObligationPriority, number> = {
      'CRITICAL': 0,
      'HIGH': 0,
      'MEDIUM': 0,
      'LOW': 0
    };

    for (const obl of obligations) {
      bySource[obl.source]++;
      byPriority[obl.priority]++;
    }

    return {
      obligations,
      by_source: bySource,
      by_priority: byPriority,
      derived_at: new Date().toISOString(),
      derivation_context: {
        current_step: temporalState.current_step,
        contract_id: temporalState.contract?.contract_id || null,
        active_invariants: invariantRequirements.map(ir => ir.invariant)
      }
    };
  }

  /**
   * Derive obligations from NecessaryFuture
   */
  private deriveFromNecessaryFuture(
    nf: NecessaryFutureInput | null,
    currentStep: number
  ): RequiredDecision[] {
    if (!nf || !nf.exists) {
      return [];
    }

    const obligations: RequiredDecision[] = [];

    // If survivable_steps is limited, there's an implicit obligation
    if (nf.survivable_steps > 0 && nf.survivable_steps < 100) {
      // The system must take action within survivable_steps
      const deadlineStep = currentStep + nf.survivable_steps;

      obligations.push(this.createObligation({
        source: 'NECESSARY_FUTURE',
        actionType: 'SURVIVABILITY_ACTION',
        description: `Action required within ${nf.survivable_steps} steps to maintain survivability (projected: ${(nf.projected_survivability * 100).toFixed(1)}%)`,
        requiredAuthority: 'PROJECT',
        protectedInvariant: 'FUTURE_INEVITABILITY_VIOLATION',
        deadlineStep,
        priority: nf.survivable_steps <= 3 ? 'CRITICAL' : 'HIGH',
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: null,
          necessary_future_hash: this.hashNecessaryFuture(nf)
        }
      }));
    }

    // If there's a first_violation_step, action must be taken before it
    if (nf.first_violation_step !== null) {
      const deadlineStep = nf.first_violation_step - 1;

      if (deadlineStep > currentStep) {
        obligations.push(this.createObligation({
          source: 'NECESSARY_FUTURE',
          actionType: 'VIOLATION_PREVENTION',
          description: `Action required before step ${nf.first_violation_step} to prevent inevitable violation`,
          requiredAuthority: 'CONSTITUTIONAL',
          protectedInvariant: 'FUTURE_INEVITABILITY_VIOLATION',
          deadlineStep,
          priority: 'CRITICAL',
          context: {
            trigger_proof_hash: null,
            trigger_run_id: null,
            related_contract_id: null,
            necessary_future_hash: this.hashNecessaryFuture(nf)
          }
        }));
      }
    }

    // Process explicit required actions
    if (nf.required_actions) {
      for (const action of nf.required_actions) {
        obligations.push(this.createObligation({
          source: 'NECESSARY_FUTURE',
          actionType: action.action_type,
          description: action.description,
          requiredAuthority: 'PROJECT',
          protectedInvariant: 'NECESSITY_NOT_ESTABLISHED',
          deadlineStep: action.deadline_step,
          priority: action.deadline_step - currentStep <= 5 ? 'HIGH' : 'MEDIUM',
          context: {
            trigger_proof_hash: null,
            trigger_run_id: null,
            related_contract_id: null,
            necessary_future_hash: this.hashNecessaryFuture(nf)
          }
        }));
      }
    }

    return obligations;
  }

  /**
   * Derive obligations from Temporal Contract
   */
  private deriveFromTemporalContract(
    state: TemporalStateInput
  ): RequiredDecision[] {
    const obligations: RequiredDecision[] = [];
    const contract = state.contract;

    if (!contract) {
      return obligations;
    }

    // Check lifespan obligation
    const stepsRemaining = contract.intended_lifespan - contract.current_step;
    if (stepsRemaining <= 10 && stepsRemaining > 0) {
      obligations.push(this.createObligation({
        source: 'TEMPORAL_CONTRACT',
        actionType: 'LIFESPAN_REVIEW',
        description: `Contract ${contract.contract_id} nearing end of lifespan (${stepsRemaining} steps remaining). Review or extend required.`,
        requiredAuthority: 'PROJECT',
        protectedInvariant: 'LIFESPAN_EXCEEDED',
        deadlineStep: contract.intended_lifespan - 1,
        priority: stepsRemaining <= 3 ? 'CRITICAL' : 'HIGH',
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: contract.contract_id,
          necessary_future_hash: null
        }
      }));
    }

    // Check mutation limit obligation
    const mutationsRemaining = contract.allowed_mutations - contract.mutation_count;
    if (mutationsRemaining <= 5 && mutationsRemaining > 0) {
      obligations.push(this.createObligation({
        source: 'TEMPORAL_CONTRACT',
        actionType: 'MUTATION_BUDGET_REVIEW',
        description: `Contract ${contract.contract_id} nearing mutation limit (${mutationsRemaining} mutations remaining). Budget review required.`,
        requiredAuthority: 'PROJECT',
        protectedInvariant: 'MUTATION_LIMIT_EXCEEDED',
        deadlineStep: state.current_step + mutationsRemaining,
        priority: mutationsRemaining <= 2 ? 'HIGH' : 'MEDIUM',
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: contract.contract_id,
          necessary_future_hash: null
        }
      }));
    }

    // Check entropy drift obligation
    if (contract.current_drift > contract.max_entropy_drift * 0.8) {
      const urgency = contract.current_drift / contract.max_entropy_drift;
      obligations.push(this.createObligation({
        source: 'TEMPORAL_CONTRACT',
        actionType: 'ENTROPY_DRIFT_CORRECTION',
        description: `Entropy drift at ${(urgency * 100).toFixed(1)}% of limit. Correction action required.`,
        requiredAuthority: 'PROJECT',
        protectedInvariant: 'ENTROPY_DRIFT_EXCEEDED',
        deadlineStep: state.current_step + Math.max(1, Math.floor(10 * (1 - urgency))),
        priority: urgency > 0.95 ? 'CRITICAL' : 'HIGH',
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: contract.contract_id,
          necessary_future_hash: null
        }
      }));
    }

    // Check entropy budget exhaustion
    if (state.entropy_budget_remaining < 100 && !state.entropy_budget_exhausted) {
      obligations.push(this.createObligation({
        source: 'TEMPORAL_CONTRACT',
        actionType: 'ENTROPY_BUDGET_CONSERVATION',
        description: `Entropy budget critically low (${state.entropy_budget_remaining} remaining). Conservation measures required.`,
        requiredAuthority: 'CONSTITUTIONAL',
        protectedInvariant: 'ENTROPY_BUDGET_EXHAUSTED',
        deadlineStep: state.current_step + 5,
        priority: 'CRITICAL',
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: contract.contract_id,
          necessary_future_hash: null
        }
      }));
    }

    return obligations;
  }

  /**
   * Derive obligations from Invariant Requirements
   */
  private deriveFromInvariants(
    requirements: InvariantRequirement[],
    currentStep: number
  ): RequiredDecision[] {
    const obligations: RequiredDecision[] = [];

    for (const req of requirements) {
      if (!req.requires_action) {
        continue;
      }

      const deadlineStep = currentStep + req.deadline_steps;
      const priority = this.priorityFromInvariant(req.invariant, req.deadline_steps);

      obligations.push(this.createObligation({
        source: 'INVARIANT_REQUIREMENT',
        actionType: req.action_type,
        description: req.description,
        requiredAuthority: req.minimum_authority,
        protectedInvariant: req.invariant,
        deadlineStep,
        priority,
        context: {
          trigger_proof_hash: null,
          trigger_run_id: null,
          related_contract_id: null,
          necessary_future_hash: null
        }
      }));
    }

    return obligations;
  }

  /**
   * Create a system mandate obligation
   */
  createSystemMandate(
    actionType: string,
    description: string,
    deadlineStep: number,
    protectedInvariant: InvariantCategory,
    priority: ObligationPriority = 'CRITICAL'
  ): RequiredDecision {
    return this.createObligation({
      source: 'SYSTEM_MANDATE',
      actionType,
      description,
      requiredAuthority: 'SYSTEM_ROOT',
      protectedInvariant,
      deadlineStep,
      priority,
      context: {
        trigger_proof_hash: null,
        trigger_run_id: null,
        related_contract_id: null,
        necessary_future_hash: null
      }
    });
  }

  /**
   * Create an obligation with generated ID
   */
  private createObligation(params: {
    source: ObligationSource;
    actionType: string;
    description: string;
    requiredAuthority: AuthorityClass;
    protectedInvariant: InvariantCategory;
    deadlineStep: number;
    priority: ObligationPriority;
    context: RequiredDecision['context'];
  }): RequiredDecision {
    this.derivationCount++;
    const obligationId = `obl-${Date.now()}-${this.derivationCount}`;

    return {
      obligation_id: obligationId,
      source: params.source,
      required_action_type: params.actionType,
      required_decision_description: params.description,
      required_authority_class: params.requiredAuthority,
      protected_invariant: params.protectedInvariant,
      deadline_step: params.deadlineStep,
      priority: params.priority,
      context: params.context
    };
  }

  /**
   * Determine priority based on invariant type and deadline
   */
  private priorityFromInvariant(
    invariant: InvariantCategory,
    deadlineSteps: number
  ): ObligationPriority {
    // CRITICAL invariants always get high priority
    const criticalInvariants: InvariantCategory[] = [
      'ENTROPY_BUDGET_EXHAUSTED',
      'SINGULARITY_BREACH',
      'REALITY_LOCK_VIOLATED'
    ];

    if (criticalInvariants.includes(invariant)) {
      return 'CRITICAL';
    }

    // Short deadlines increase priority
    if (deadlineSteps <= 3) {
      return 'CRITICAL';
    } else if (deadlineSteps <= 7) {
      return 'HIGH';
    } else if (deadlineSteps <= 15) {
      return 'MEDIUM';
    }

    return this.config.default_priority;
  }

  /**
   * Hash a NecessaryFuture for reference
   */
  private hashNecessaryFuture(nf: NecessaryFutureInput): string {
    const canonical = {
      exists: nf.exists,
      survivable_steps: nf.survivable_steps,
      first_violation_step: nf.first_violation_step,
      projected_survivability: nf.projected_survivability
    };
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
  }

  /**
   * Get deriver statistics
   */
  getStats(): {
    total_derived: number;
    default_deadline_steps: number;
    default_priority: ObligationPriority;
  } {
    return {
      total_derived: this.derivationCount,
      default_deadline_steps: this.config.default_deadline_steps,
      default_priority: this.config.default_priority
    };
  }
}

/**
 * Create a new ObligationDeriver
 */
export function createObligationDeriver(
  config?: Partial<ObligationDeriverConfig>
): ObligationDeriver {
  return new ObligationDeriver(config);
}

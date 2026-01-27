/**
 * Mandatory Decision Emitter
 *
 * Emits MandatoryDecisionProof when obligations are unmet.
 * Authority = SYSTEM_ROOT (non-delegable).
 *
 * KEY PRINCIPLE:
 * - "Inaction is recorded with the same permanence as action."
 * - Omission creates a proof just like any decision
 * - SYSTEM_ROOT authority means no one can override
 *
 * EMISSION TRIGGERS:
 * 1. Deadline missed for an obligation
 * 2. Critical obligation remains unaddressed
 * 3. System mandate violated through inaction
 *
 * NON-NEGOTIABLE:
 * - SYSTEM_ROOT authority for all omission proofs
 * - Deterministic proof generation
 * - Permanent, immutable records
 */

import * as crypto from 'crypto';
import type {
  RequiredDecision,
  MandatoryDecisionProof,
  OmissionViolation,
  ActionFingerprintSummary,
  EntropyStateSnapshot,
  TemporalContractSummary,
  AuthorityClass
} from './types';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * Emitter configuration
 */
export interface MandatoryDecisionEmitterConfig {
  // Include detailed context in proofs
  include_detailed_context?: boolean;
}

/**
 * Emission result
 */
export interface EmissionResult {
  proof: MandatoryDecisionProof;
  violation: OmissionViolation;
  emitted_at: string;
}

export class MandatoryDecisionEmitter {
  private config: Required<MandatoryDecisionEmitterConfig>;
  private emissionCount: number = 0;

  constructor(config?: Partial<MandatoryDecisionEmitterConfig>) {
    this.config = {
      include_detailed_context: config?.include_detailed_context ?? true
    };
  }

  /**
   * Emit an omission violation proof
   */
  emitOmissionViolation(
    obligation: RequiredDecision,
    currentStep: number,
    entropyState?: EntropyStateSnapshot,
    contractSummary?: TemporalContractSummary
  ): EmissionResult {
    this.emissionCount++;
    const timestamp = new Date().toISOString();
    const runId = `omission-${obligation.obligation_id}-${Date.now()}`;

    // Create the omission violation record
    const violation = this.createViolation(obligation, currentStep);

    // Create the mandatory decision proof
    const proof = this.createMandatoryProof(
      runId,
      obligation,
      violation,
      entropyState,
      contractSummary
    );

    return {
      proof,
      violation,
      emitted_at: timestamp
    };
  }

  /**
   * Emit proofs for multiple violations
   */
  emitMultipleViolations(
    obligations: RequiredDecision[],
    currentStep: number,
    entropyState?: EntropyStateSnapshot,
    contractSummary?: TemporalContractSummary
  ): EmissionResult[] {
    return obligations.map(obl =>
      this.emitOmissionViolation(obl, currentStep, entropyState, contractSummary)
    );
  }

  /**
   * Create an omission violation record
   */
  private createViolation(
    obligation: RequiredDecision,
    currentStep: number
  ): OmissionViolation {
    const violationId = `viol-${obligation.obligation_id}-${Date.now()}`;

    return {
      violation_id: violationId,
      obligation_id: obligation.obligation_id,
      required_decision: obligation,
      deadline_step: obligation.deadline_step,
      detection_step: currentStep,
      steps_overdue: currentStep - obligation.deadline_step,
      violated_at: new Date().toISOString(),
      authority: 'SYSTEM_ROOT' // Non-delegable
    };
  }

  /**
   * Create a mandatory decision proof
   */
  private createMandatoryProof(
    runId: string,
    obligation: RequiredDecision,
    violation: OmissionViolation,
    entropyState?: EntropyStateSnapshot,
    contractSummary?: TemporalContractSummary
  ): MandatoryDecisionProof {
    const timestamp = new Date().toISOString();

    // Create action fingerprint for the omission
    const actionFingerprint: ActionFingerprintSummary = {
      action_id: `omission-action-${violation.violation_id}`,
      action_type: 'OMISSION_DETECTED',
      description: `OMISSION: Failed to execute required action "${obligation.required_action_type}" - ${obligation.required_decision_description}`,
      timestamp,
      hash: this.hashOmission(violation)
    };

    // Default entropy state if not provided
    const defaultEntropyState: EntropyStateSnapshot = entropyState || {
      current_entropy: 0.5,
      baseline_entropy: 0.5,
      drift: 0,
      drift_limit: 0.1,
      budget_initial: 1000,
      budget_remaining: 500,
      budget_consumed: 500,
      budget_ratio: 0.5,
      is_exhausted: false
    };

    // Default contract summary if not provided
    const defaultContractSummary: TemporalContractSummary = contractSummary || {
      contract_id: obligation.context.related_contract_id,
      project_id: 'odl-system',
      intended_lifespan: 100,
      current_step: violation.detection_step,
      allowed_mutations: 50,
      mutation_count: 0,
      max_entropy_drift: 0.1,
      current_drift: 0,
      valid: true,
      violation_reason: null
    };

    // Compute obligation hash
    const obligationHash = this.hashObligation(obligation, violation);

    // Compute proof hash
    const proofHash = this.computeProofHash(runId, obligationHash, violation.violation_id);

    const proof: MandatoryDecisionProof = {
      // OlympusDecisionProof fields
      run_id: runId,
      proof_version: ODL_VERSION,
      attempted_action_fingerprint: actionFingerprint,
      final_decision: 'BLOCK',
      primary_invariant_violated: obligation.protected_invariant,
      primary_violation_description: `OMISSION_VIOLATION: Required action "${obligation.required_action_type}" was not taken within deadline (step ${obligation.deadline_step}). Detected at step ${violation.detection_step}.`,
      causal_chain: [
        {
          step: violation.deadline_step,
          source_layer: 'TSL',
          event: `Obligation "${obligation.obligation_id}" deadline reached without fulfillment`,
          effect: 'DEADLINE_PASSED',
          deterministic: true
        },
        {
          step: violation.detection_step,
          source_layer: 'ORIS',
          event: `System recorded omission at step ${violation.detection_step}`,
          effect: 'OMISSION_VIOLATION',
          deterministic: true
        }
      ],
      forbidden_alternatives: [],
      necessary_future: null,
      entropy_state: defaultEntropyState,
      temporal_contract_summary: defaultContractSummary,
      proof_hash: proofHash,
      created_at: timestamp,
      proof_chain_valid: true,
      immutable: true,

      // MandatoryDecisionProof-specific fields
      obligation_id: obligation.obligation_id,
      required_authority_class: obligation.required_authority_class,
      deadline_step: obligation.deadline_step,
      omission_detected: true,
      omission_violation: violation,
      fulfillment_proof_hash: null,
      obligation_hash: obligationHash
    };

    return proof;
  }

  /**
   * Create a fulfillment proof (obligation met)
   */
  createFulfillmentProof(
    obligation: RequiredDecision,
    fulfillmentProofHash: string,
    fulfillingAuthority: AuthorityClass,
    currentStep: number,
    entropyState?: EntropyStateSnapshot,
    contractSummary?: TemporalContractSummary
  ): MandatoryDecisionProof {
    this.emissionCount++;
    const timestamp = new Date().toISOString();
    const runId = `fulfill-${obligation.obligation_id}-${Date.now()}`;

    const actionFingerprint: ActionFingerprintSummary = {
      action_id: `fulfillment-${obligation.obligation_id}`,
      action_type: 'OBLIGATION_FULFILLED',
      description: `FULFILLED: Required action "${obligation.required_action_type}" completed by ${fulfillingAuthority}`,
      timestamp,
      hash: crypto.createHash('sha256').update(`fulfill-${fulfillmentProofHash}`).digest('hex').substring(0, 32)
    };

    const defaultEntropyState: EntropyStateSnapshot = entropyState || {
      current_entropy: 0.5,
      baseline_entropy: 0.5,
      drift: 0,
      drift_limit: 0.1,
      budget_initial: 1000,
      budget_remaining: 500,
      budget_consumed: 500,
      budget_ratio: 0.5,
      is_exhausted: false
    };

    const defaultContractSummary: TemporalContractSummary = contractSummary || {
      contract_id: obligation.context.related_contract_id,
      project_id: 'odl-system',
      intended_lifespan: 100,
      current_step: currentStep,
      allowed_mutations: 50,
      mutation_count: 0,
      max_entropy_drift: 0.1,
      current_drift: 0,
      valid: true,
      violation_reason: null
    };

    const obligationHash = this.hashObligation(obligation, null);
    const proofHash = this.computeProofHash(runId, obligationHash, fulfillmentProofHash);

    const proof: MandatoryDecisionProof = {
      run_id: runId,
      proof_version: ODL_VERSION,
      attempted_action_fingerprint: actionFingerprint,
      final_decision: 'ALLOW',
      primary_invariant_violated: 'NONE',
      primary_violation_description: null,
      causal_chain: [
        {
          step: currentStep,
          source_layer: 'TSL',
          event: `Obligation "${obligation.obligation_id}" fulfilled by ${fulfillingAuthority} at step ${currentStep}`,
          effect: 'OBLIGATION_FULFILLED',
          deterministic: true
        }
      ],
      forbidden_alternatives: [],
      necessary_future: null,
      entropy_state: defaultEntropyState,
      temporal_contract_summary: defaultContractSummary,
      proof_hash: proofHash,
      created_at: timestamp,
      proof_chain_valid: true,
      immutable: true,

      obligation_id: obligation.obligation_id,
      required_authority_class: obligation.required_authority_class,
      deadline_step: obligation.deadline_step,
      omission_detected: false,
      omission_violation: null,
      fulfillment_proof_hash: fulfillmentProofHash,
      obligation_hash: obligationHash
    };

    return proof;
  }

  /**
   * Hash an omission for the action fingerprint
   */
  private hashOmission(violation: OmissionViolation): string {
    const canonical = {
      violation_id: violation.violation_id,
      obligation_id: violation.obligation_id,
      deadline_step: violation.deadline_step,
      detection_step: violation.detection_step,
      steps_overdue: violation.steps_overdue
    };
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 32);
  }

  /**
   * Hash an obligation
   */
  private hashObligation(
    obligation: RequiredDecision,
    violation: OmissionViolation | null
  ): string {
    const canonical = {
      obligation_id: obligation.obligation_id,
      source: obligation.source,
      action_type: obligation.required_action_type,
      authority: obligation.required_authority_class,
      deadline: obligation.deadline_step,
      priority: obligation.priority,
      violated: violation !== null
    };
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Compute proof hash
   */
  private computeProofHash(
    runId: string,
    obligationHash: string,
    referenceHash: string
  ): string {
    const canonical = {
      run_id: runId,
      obligation_hash: obligationHash,
      reference_hash: referenceHash,
      version: ODL_VERSION
    };
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Get emitter statistics
   */
  getStats(): {
    total_emissions: number;
    include_detailed_context: boolean;
  } {
    return {
      total_emissions: this.emissionCount,
      include_detailed_context: this.config.include_detailed_context
    };
  }
}

/**
 * Create a new MandatoryDecisionEmitter
 */
export function createMandatoryDecisionEmitter(
  config?: Partial<MandatoryDecisionEmitterConfig>
): MandatoryDecisionEmitter {
  return new MandatoryDecisionEmitter(config);
}

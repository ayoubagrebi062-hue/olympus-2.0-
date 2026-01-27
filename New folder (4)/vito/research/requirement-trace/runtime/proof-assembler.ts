/**
 * Proof Assembler
 *
 * Consumes outputs from all enforcement engines and assembles
 * the canonical OlympusDecisionProof artifact.
 *
 * KEY PRINCIPLE:
 * - "If a decision cannot be explained minimally, it is not yet true."
 * - EXACTLY ONE primary invariant violated per block
 * - Minimal causal chain - no narrative, no duplicates
 *
 * CONSUMES FROM:
 * - IE (Inevitability Engine)
 * - NE (Necessity Engine)
 * - ICE (Intent Collapse Engine)
 * - CIN (Canonical Intent Normalization)
 * - TSL (Temporal Sovereignty Layer)
 * - AEC (Architectural Entropy Control)
 * - RLL (Reality Lock-In Layer)
 *
 * NON-NEGOTIABLE:
 * - Does NOT modify engine logic
 * - Does NOT add enforcement
 * - Deterministic assembly only
 * - One proof per execution
 */

import * as crypto from 'crypto';
import type {
  OlympusDecisionProof,
  OCPMDecision,
  InvariantCategory,
  CausalLink,
  EntropyStateSnapshot,
  TemporalContractSummary,
  ActionFingerprintSummary,
  ProofAssemblyInput,
  EngineOutputs
} from './types';
import { ProofHasher } from './proof-hasher';

// OCPM version - immutable
const OCPM_VERSION = '1.0.0';
Object.freeze({ OCPM_VERSION });

/**
 * Intermediate violation record
 */
interface ViolationRecord {
  category: InvariantCategory;
  description: string;
  source_layer: CausalLink['source_layer'];
  priority: number; // Lower = more primary
}

export class ProofAssembler {
  private hasher: ProofHasher;

  constructor() {
    this.hasher = new ProofHasher();
  }

  /**
   * Assemble proof from engine outputs
   *
   * This is the main entry point for proof assembly.
   * Takes all engine outputs and produces a single, minimal proof.
   */
  assemble(input: ProofAssemblyInput): OlympusDecisionProof {
    const timestamp = new Date().toISOString();

    // Step 1: Create action fingerprint
    const actionFingerprint = this.createActionFingerprint(input.action, timestamp);

    // Step 2: Extract all violations from engine outputs
    const violations = this.extractViolations(input.engine_outputs);

    // Step 3: Determine primary invariant (exactly one)
    const { primary, description } = this.determinePrimaryInvariant(violations);

    // Step 4: Determine final decision
    const finalDecision = this.determineFinalDecision(input, violations);

    // Step 5: Build minimal causal chain
    const causalChain = this.buildCausalChain(input.engine_outputs, violations);

    // Step 6: Extract forbidden alternatives
    const forbiddenAlternatives = this.extractForbiddenAlternatives(input.engine_outputs);

    // Step 7: Build necessary future summary
    const necessaryFuture = this.buildNecessaryFuture(input.engine_outputs);

    // Step 8: Build entropy state snapshot
    const entropyState = this.buildEntropyState(input);

    // Step 9: Build temporal contract summary
    const contractSummary = this.buildContractSummary(input);

    // Step 10: Assemble proof (without hash)
    const proofWithoutHash: Omit<OlympusDecisionProof, 'proof_hash'> = {
      run_id: input.run_id,
      proof_version: OCPM_VERSION,
      attempted_action_fingerprint: actionFingerprint,
      final_decision: finalDecision,
      primary_invariant_violated: primary,
      primary_violation_description: description,
      causal_chain: causalChain,
      forbidden_alternatives: forbiddenAlternatives,
      necessary_future: necessaryFuture,
      entropy_state: entropyState,
      temporal_contract_summary: contractSummary,
      created_at: timestamp,
      proof_chain_valid: this.validateChain(causalChain),
      immutable: true
    };

    // Step 11: Compute proof hash using shared hasher for consistency
    // Create a temporary proof with empty hash to compute the real hash
    const tempProof: OlympusDecisionProof = {
      ...proofWithoutHash,
      proof_hash: ''
    };
    const hashResult = this.hasher.hashProof(tempProof);

    return {
      ...proofWithoutHash,
      proof_hash: hashResult.full_hash
    };
  }

  /**
   * Create action fingerprint
   */
  private createActionFingerprint(
    action: ProofAssemblyInput['action'],
    timestamp: string
  ): ActionFingerprintSummary {
    const hashInput = `${action.action_id}:${action.action_type}:${action.description}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);

    return {
      action_id: action.action_id,
      action_type: action.action_type,
      description: action.description,
      timestamp,
      hash
    };
  }

  /**
   * Extract all violations from engine outputs
   * Each violation is tagged with priority for primary selection
   */
  private extractViolations(outputs: EngineOutputs): ViolationRecord[] {
    const violations: ViolationRecord[] = [];

    // TSL violations (highest priority - temporal sovereignty)
    if (outputs.tsl_result && !outputs.tsl_result.passed) {
      const reason = outputs.tsl_result.block_reason || 'Unknown TSL violation';

      // Categorize TSL violation
      if (reason.includes('MISSING_CONTRACT') || reason.includes('NO_BUDGET')) {
        violations.push({
          category: 'TEMPORAL_CONTRACT_MISSING',
          description: reason,
          source_layer: 'TSL',
          priority: 1
        });
      } else if (reason.includes('BUDGET_EXHAUSTED') || reason.includes('INSUFFICIENT_BUDGET')) {
        violations.push({
          category: 'ENTROPY_BUDGET_EXHAUSTED',
          description: reason,
          source_layer: 'TSL',
          priority: 2
        });
      } else if (reason.includes('ENTROPY_DRIFT')) {
        violations.push({
          category: 'ENTROPY_DRIFT_EXCEEDED',
          description: reason,
          source_layer: 'TSL',
          priority: 3
        });
      } else if (reason.includes('MUTATION_LIMIT')) {
        violations.push({
          category: 'MUTATION_LIMIT_EXCEEDED',
          description: reason,
          source_layer: 'TSL',
          priority: 4
        });
      } else if (reason.includes('LIFESPAN')) {
        violations.push({
          category: 'LIFESPAN_EXCEEDED',
          description: reason,
          source_layer: 'TSL',
          priority: 5
        });
      } else if (reason.includes('FUTURE_VIOLATION') || reason.includes('simulation')) {
        violations.push({
          category: 'FUTURE_INEVITABILITY_VIOLATION',
          description: reason,
          source_layer: 'TSL',
          priority: 6
        });
      } else if (reason.includes('SINGULARITY')) {
        violations.push({
          category: 'SINGULARITY_BREACH',
          description: reason,
          source_layer: 'TSL',
          priority: 7
        });
      } else {
        violations.push({
          category: 'TEMPORAL_CONTRACT_INVALID',
          description: reason,
          source_layer: 'TSL',
          priority: 8
        });
      }
    }

    // IE violations (inevitability)
    if (outputs.ie_result && outputs.ie_result.blocked) {
      violations.push({
        category: 'FUTURE_INEVITABILITY_VIOLATION',
        description: outputs.ie_result.reason || 'Inevitability check failed',
        source_layer: 'IE',
        priority: 10
      });
    }

    // RLL violations (reality lock)
    if (outputs.rll_result && outputs.rll_result.locked) {
      violations.push({
        category: 'REALITY_LOCK_VIOLATED',
        description: outputs.rll_result.reason || 'Reality lock active',
        source_layer: 'RLL',
        priority: 15
      });
    }

    // AEC violations (entropy)
    if (outputs.aec_result && !outputs.aec_result.entropy_valid) {
      violations.push({
        category: 'ARCHITECTURAL_PHASE_VIOLATION',
        description: outputs.aec_result.reason || 'Entropy check failed',
        source_layer: 'AEC',
        priority: 20
      });
    }

    // ICE violations (intent)
    if (outputs.ice_result && !outputs.ice_result.intent_valid) {
      violations.push({
        category: 'INTENT_COLLAPSE_FAILED',
        description: outputs.ice_result.reason || 'Intent collapse failed',
        source_layer: 'ICE',
        priority: 25
      });
    }

    // CIN violations (canonical form)
    if (outputs.cin_result && !outputs.cin_result.canonical) {
      violations.push({
        category: 'CANONICAL_FORM_INVALID',
        description: outputs.cin_result.reason || 'Canonical normalization failed',
        source_layer: 'CIN',
        priority: 30
      });
    }

    // NE violations (necessity)
    if (outputs.ne_result && !outputs.ne_result.necessary) {
      violations.push({
        category: 'NECESSITY_NOT_ESTABLISHED',
        description: outputs.ne_result.reason || 'Necessity not established',
        source_layer: 'NE',
        priority: 35
      });
    }

    return violations;
  }

  /**
   * Determine primary invariant - EXACTLY ONE
   * Lower priority number = more primary
   */
  private determinePrimaryInvariant(
    violations: ViolationRecord[]
  ): { primary: InvariantCategory; description: string | null } {
    if (violations.length === 0) {
      return { primary: 'NONE', description: null };
    }

    // Sort by priority (lower = more primary)
    const sorted = [...violations].sort((a, b) => a.priority - b.priority);
    const primary = sorted[0];

    return {
      primary: primary.category,
      description: primary.description
    };
  }

  /**
   * Determine final decision based on violations and state
   */
  private determineFinalDecision(
    input: ProofAssemblyInput,
    violations: ViolationRecord[]
  ): OCPMDecision {
    // No violations = ALLOW
    if (violations.length === 0) {
      return 'ALLOW';
    }

    // Check for PERMANENT_READ_ONLY condition
    if (input.budget?.exhausted) {
      return 'PERMANENT_READ_ONLY';
    }

    // Check TSL gate action for permanent status
    if (input.engine_outputs.tsl_result?.gate_action === 'PERMANENT_READ_ONLY') {
      return 'PERMANENT_READ_ONLY';
    }

    // Check for budget exhaustion violation
    const hasBudgetExhaustion = violations.some(v =>
      v.category === 'ENTROPY_BUDGET_EXHAUSTED'
    );
    if (hasBudgetExhaustion) {
      return 'PERMANENT_READ_ONLY';
    }

    // All other violations = BLOCK
    return 'BLOCK';
  }

  /**
   * Build minimal causal chain
   * Only includes events that directly lead to the decision
   */
  private buildCausalChain(
    outputs: EngineOutputs,
    violations: ViolationRecord[]
  ): CausalLink[] {
    const chain: CausalLink[] = [];
    let step = 1;

    // If no violations, minimal chain showing ALLOW path
    if (violations.length === 0) {
      if (outputs.tsl_result?.passed) {
        chain.push({
          step: step++,
          source_layer: 'TSL',
          event: 'Temporal gate check passed',
          effect: 'Action permitted',
          deterministic: true
        });
      }
      return chain;
    }

    // Get primary violation
    const sorted = [...violations].sort((a, b) => a.priority - b.priority);
    const primary = sorted[0];

    // Build chain leading to primary violation
    // Only include layers that contributed to the violation

    // Start with the check that triggered
    chain.push({
      step: step++,
      source_layer: primary.source_layer,
      event: `${primary.category} detected`,
      effect: primary.description,
      deterministic: true
    });

    // Add TSL simulation if it shows future violation
    if (outputs.tsl_result?.violations && outputs.tsl_result.violations.length > 0) {
      const firstViolation = outputs.tsl_result.violations[0];
      if (firstViolation && primary.source_layer !== 'TSL') {
        chain.push({
          step: step++,
          source_layer: 'TSL',
          event: `Forward simulation detected ${firstViolation.type}`,
          effect: `Violation at step ${firstViolation.step}`,
          deterministic: true
        });
      }
    }

    // Add final gate decision
    chain.push({
      step: step++,
      source_layer: 'TSL',
      event: 'Gate decision',
      effect: outputs.tsl_result?.gate_action || 'BLOCK_PRESENT',
      deterministic: true
    });

    return chain;
  }

  /**
   * Extract forbidden alternatives as hashes
   */
  private extractForbiddenAlternatives(outputs: EngineOutputs): string[] {
    const alternatives: string[] = [];

    // From TSL violations
    if (outputs.tsl_result?.violations) {
      for (const v of outputs.tsl_result.violations) {
        const hash = crypto.createHash('sha256')
          .update(`${v.type}:${v.step}:${v.severity}`)
          .digest('hex')
          .substring(0, 12);
        alternatives.push(hash);
      }
    }

    // From IE if present
    if (outputs.ie_result?.fingerprint) {
      alternatives.push(outputs.ie_result.fingerprint.substring(0, 12));
    }

    // Deduplicate
    return [...new Set(alternatives)];
  }

  /**
   * Build necessary future summary
   */
  private buildNecessaryFuture(outputs: EngineOutputs): OlympusDecisionProof['necessary_future'] {
    // From TSL simulation
    if (outputs.tsl_result) {
      return {
        exists: outputs.tsl_result.simulation_survives !== undefined,
        survivable_steps: outputs.ne_result?.survivable_steps ?? 0,
        first_violation_step: outputs.tsl_result.first_violation_step ?? null,
        projected_survivability: outputs.tsl_result.survivability ?? 0
      };
    }

    // From NE if available
    if (outputs.ne_result) {
      return {
        exists: true,
        survivable_steps: outputs.ne_result.survivable_steps,
        first_violation_step: null,
        projected_survivability: outputs.ne_result.survivable_steps > 0 ? 1.0 : 0
      };
    }

    return null;
  }

  /**
   * Build entropy state snapshot
   */
  private buildEntropyState(input: ProofAssemblyInput): EntropyStateSnapshot {
    const baseline = input.contract?.baseline_entropy ?? 0;
    const current = input.current_state.entropy;
    const drift = Math.abs(current - baseline);
    const driftLimit = input.contract?.max_entropy_drift ?? 1.0;

    return {
      current_entropy: current,
      baseline_entropy: baseline,
      drift,
      drift_limit: driftLimit,
      budget_initial: input.budget?.initial ?? 0,
      budget_remaining: input.budget?.remaining ?? 0,
      budget_consumed: input.budget?.consumed ?? 0,
      budget_ratio: input.budget?.initial
        ? input.budget.remaining / input.budget.initial
        : 0,
      is_exhausted: input.budget?.exhausted ?? false
    };
  }

  /**
   * Build temporal contract summary
   */
  private buildContractSummary(input: ProofAssemblyInput): TemporalContractSummary {
    const drift = Math.abs(
      input.current_state.entropy - (input.contract?.baseline_entropy ?? 0)
    );

    let valid = true;
    let violationReason: string | null = null;

    // Check validity
    if (!input.contract) {
      valid = false;
      violationReason = 'No temporal contract declared';
    } else if (input.current_state.current_step > input.contract.intended_lifespan) {
      valid = false;
      violationReason = 'Lifespan exceeded';
    } else if (input.current_state.mutation_count > input.contract.allowed_mutations) {
      valid = false;
      violationReason = 'Mutation limit exceeded';
    } else if (drift > input.contract.max_entropy_drift) {
      valid = false;
      violationReason = 'Entropy drift exceeded';
    }

    return {
      contract_id: input.contract?.contract_id ?? null,
      project_id: input.project_id,
      intended_lifespan: input.contract?.intended_lifespan ?? 0,
      current_step: input.current_state.current_step,
      allowed_mutations: input.contract?.allowed_mutations ?? 0,
      mutation_count: input.current_state.mutation_count,
      max_entropy_drift: input.contract?.max_entropy_drift ?? 0,
      current_drift: drift,
      valid,
      violation_reason: violationReason
    };
  }

  /**
   * Validate causal chain structure
   */
  private validateChain(chain: CausalLink[]): boolean {
    if (chain.length === 0) return true;

    // Check step ordering
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].step !== i + 1) return false;
      if (!chain[i].deterministic) return false;
    }

    return true;
  }

}

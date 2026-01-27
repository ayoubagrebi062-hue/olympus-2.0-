/**
 * Temporal Contract Registry
 *
 * Manages temporal contracts for all executions.
 *
 * KEY PRINCIPLE:
 * - Every execution MUST declare a temporal contract
 * - Missing contract = HARD_ABORT
 * - Contracts are immutable once declared
 *
 * CONTRACT REQUIREMENTS:
 * 1. intended_lifespan - How many steps the execution intends to live
 * 2. allowed_future_mutations - Maximum mutations allowed in the future
 * 3. max_entropy_drift - Maximum allowed entropy change from baseline
 *
 * NON-NEGOTIABLE:
 * - No execution proceeds without contract
 * - No contract modification after creation
 * - Deterministic validation
 */

import * as crypto from 'crypto';
import type {
  TemporalContract,
  TemporalContractValidation
} from './types';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

// Contract constraints
const MIN_LIFESPAN = 1;
const MAX_LIFESPAN = 1000;
const MIN_MUTATIONS = 0;
const MAX_MUTATIONS = 100;
const MIN_ENTROPY_DRIFT = 0.0;
const MAX_ENTROPY_DRIFT = 1.0;

export class TemporalContractRegistry {
  // Registered contracts by project ID
  private contracts: Map<string, TemporalContract> = new Map();

  /**
   * Create a new temporal contract
   *
   * @param projectId The project ID
   * @param intendedLifespan How many temporal steps the execution intends to live
   * @param allowedFutureMutations Maximum mutations allowed
   * @param maxEntropyDrift Maximum entropy drift from baseline
   * @param baselineEntropy Current entropy (baseline)
   */
  createContract(
    projectId: string,
    intendedLifespan: number,
    allowedFutureMutations: number,
    maxEntropyDrift: number,
    baselineEntropy: number
  ): TemporalContract {
    const contractId = `TC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const contract: TemporalContract = {
      contract_id: contractId,
      project_id: projectId,
      intended_lifespan: intendedLifespan,
      allowed_future_mutations: allowedFutureMutations,
      max_entropy_drift: maxEntropyDrift,
      baseline_entropy: baselineEntropy,
      created_at: now,
      immutable: true
    };

    // Validate before registering
    const validation = this.validateContract(contract);
    if (!validation.valid) {
      throw new Error(
        `Invalid temporal contract: ${validation.errors.join(', ')}`
      );
    }

    // Register the contract
    this.contracts.set(projectId, contract);

    return contract;
  }

  /**
   * Get contract for a project
   */
  getContract(projectId: string): TemporalContract | null {
    return this.contracts.get(projectId) ?? null;
  }

  /**
   * Check if a project has a contract
   */
  hasContract(projectId: string): boolean {
    return this.contracts.has(projectId);
  }

  /**
   * Validate a temporal contract
   */
  validateContract(contract: TemporalContract | null): TemporalContractValidation {
    const errors: string[] = [];

    // NULL check - missing contract is fatal
    if (!contract) {
      return {
        valid: false,
        contract: null,
        errors: ['MISSING_CONTRACT: No temporal contract declared'],
        rejection_reason: 'Every execution MUST declare a temporal contract. Missing contract = HARD_ABORT.'
      };
    }

    // Validate contract_id
    if (!contract.contract_id || typeof contract.contract_id !== 'string') {
      errors.push('INVALID_CONTRACT_ID: Contract ID must be a non-empty string');
    }

    // Validate project_id
    if (!contract.project_id || typeof contract.project_id !== 'string') {
      errors.push('INVALID_PROJECT_ID: Project ID must be a non-empty string');
    }

    // Validate intended_lifespan
    if (typeof contract.intended_lifespan !== 'number') {
      errors.push('INVALID_LIFESPAN_TYPE: Intended lifespan must be a number');
    } else if (contract.intended_lifespan < MIN_LIFESPAN) {
      errors.push(`LIFESPAN_TOO_SHORT: Intended lifespan must be at least ${MIN_LIFESPAN}`);
    } else if (contract.intended_lifespan > MAX_LIFESPAN) {
      errors.push(`LIFESPAN_TOO_LONG: Intended lifespan must not exceed ${MAX_LIFESPAN}`);
    } else if (!Number.isInteger(contract.intended_lifespan)) {
      errors.push('LIFESPAN_NOT_INTEGER: Intended lifespan must be an integer');
    }

    // Validate allowed_future_mutations
    if (typeof contract.allowed_future_mutations !== 'number') {
      errors.push('INVALID_MUTATIONS_TYPE: Allowed future mutations must be a number');
    } else if (contract.allowed_future_mutations < MIN_MUTATIONS) {
      errors.push(`MUTATIONS_NEGATIVE: Allowed future mutations cannot be negative`);
    } else if (contract.allowed_future_mutations > MAX_MUTATIONS) {
      errors.push(`MUTATIONS_TOO_HIGH: Allowed future mutations must not exceed ${MAX_MUTATIONS}`);
    } else if (!Number.isInteger(contract.allowed_future_mutations)) {
      errors.push('MUTATIONS_NOT_INTEGER: Allowed future mutations must be an integer');
    }

    // Validate max_entropy_drift
    if (typeof contract.max_entropy_drift !== 'number') {
      errors.push('INVALID_ENTROPY_DRIFT_TYPE: Max entropy drift must be a number');
    } else if (contract.max_entropy_drift < MIN_ENTROPY_DRIFT) {
      errors.push(`ENTROPY_DRIFT_NEGATIVE: Max entropy drift cannot be negative`);
    } else if (contract.max_entropy_drift > MAX_ENTROPY_DRIFT) {
      errors.push(`ENTROPY_DRIFT_TOO_HIGH: Max entropy drift must not exceed ${MAX_ENTROPY_DRIFT}`);
    }

    // Validate baseline_entropy
    if (typeof contract.baseline_entropy !== 'number') {
      errors.push('INVALID_BASELINE_TYPE: Baseline entropy must be a number');
    } else if (contract.baseline_entropy < 0 || contract.baseline_entropy > 1) {
      errors.push('BASELINE_OUT_OF_RANGE: Baseline entropy must be between 0 and 1');
    }

    // Validate created_at
    if (!contract.created_at || typeof contract.created_at !== 'string') {
      errors.push('INVALID_TIMESTAMP: Created timestamp must be a valid ISO string');
    }

    // Validate immutable flag
    if (contract.immutable !== true) {
      errors.push('IMMUTABLE_REQUIRED: Contract must be marked as immutable');
    }

    // Build result
    const valid = errors.length === 0;
    const rejectionReason = valid
      ? null
      : `Contract validation failed: ${errors.length} error(s). First: ${errors[0]}`;

    return {
      valid,
      contract,
      errors,
      rejection_reason: rejectionReason
    };
  }

  /**
   * Validate that an execution has a contract (GATE)
   *
   * This is the entry gate - no execution proceeds without a valid contract.
   */
  validateExecutionHasContract(projectId: string): TemporalContractValidation {
    const contract = this.getContract(projectId);
    return this.validateContract(contract);
  }

  /**
   * Check if an entropy value violates the contract's drift limit
   */
  checkEntropyDrift(
    contract: TemporalContract,
    currentEntropy: number
  ): { violated: boolean; drift: number; limit: number } {
    const drift = Math.abs(currentEntropy - contract.baseline_entropy);
    const violated = drift > contract.max_entropy_drift;

    return {
      violated,
      drift,
      limit: contract.max_entropy_drift
    };
  }

  /**
   * Check if mutation count violates the contract's limit
   */
  checkMutationLimit(
    contract: TemporalContract,
    mutationCount: number
  ): { violated: boolean; count: number; limit: number } {
    const violated = mutationCount > contract.allowed_future_mutations;

    return {
      violated,
      count: mutationCount,
      limit: contract.allowed_future_mutations
    };
  }

  /**
   * Check if step count exceeds the contract's lifespan
   */
  checkLifespan(
    contract: TemporalContract,
    stepCount: number
  ): { violated: boolean; step: number; limit: number } {
    const violated = stepCount > contract.intended_lifespan;

    return {
      violated,
      step: stepCount,
      limit: contract.intended_lifespan
    };
  }

  /**
   * Get all registered contracts
   */
  getAllContracts(): TemporalContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get contract count
   */
  getContractCount(): number {
    return this.contracts.size;
  }

  /**
   * Compute contract fingerprint (for verification)
   */
  computeContractFingerprint(contract: TemporalContract): string {
    const canonical = {
      project_id: contract.project_id,
      intended_lifespan: contract.intended_lifespan,
      allowed_future_mutations: contract.allowed_future_mutations,
      max_entropy_drift: contract.max_entropy_drift,
      baseline_entropy: contract.baseline_entropy
    };

    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    const hash = crypto.createHash('sha256').update(json).digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Import contracts (for persistence restoration)
   */
  importContracts(contracts: Record<string, TemporalContract>): void {
    for (const [projectId, contract] of Object.entries(contracts)) {
      this.contracts.set(projectId, contract);
    }
  }

  /**
   * Export contracts (for persistence)
   */
  exportContracts(): Record<string, TemporalContract> {
    const exported: Record<string, TemporalContract> = {};
    for (const [projectId, contract] of this.contracts) {
      exported[projectId] = contract;
    }
    return exported;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_contracts: number;
    avg_lifespan: number;
    avg_mutations: number;
    avg_entropy_drift: number;
  } {
    const contracts = this.getAllContracts();
    const count = contracts.length;

    if (count === 0) {
      return {
        total_contracts: 0,
        avg_lifespan: 0,
        avg_mutations: 0,
        avg_entropy_drift: 0
      };
    }

    const sumLifespan = contracts.reduce((sum, c) => sum + c.intended_lifespan, 0);
    const sumMutations = contracts.reduce((sum, c) => sum + c.allowed_future_mutations, 0);
    const sumDrift = contracts.reduce((sum, c) => sum + c.max_entropy_drift, 0);

    return {
      total_contracts: count,
      avg_lifespan: sumLifespan / count,
      avg_mutations: sumMutations / count,
      avg_entropy_drift: sumDrift / count
    };
  }
}

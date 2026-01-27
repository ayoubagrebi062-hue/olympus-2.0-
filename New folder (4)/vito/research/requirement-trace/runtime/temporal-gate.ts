/**
 * Temporal Gate
 *
 * The final enforcement point for all temporal sovereignty decisions.
 * Integrates all TSL components into a single PASS/FAIL gate.
 *
 * KEY PRINCIPLE:
 * - This is the ONLY entry point for temporal validation
 * - No bypass, no override, no exception
 * - Decision is deterministic and final
 *
 * GATE DECISIONS:
 * - ALLOW_PRESENT: Future is survivable, action permitted
 * - BLOCK_PRESENT: Future would violate constraints, action denied
 * - PERMANENT_READ_ONLY: Budget exhausted, all mutations denied forever
 *
 * NON-NEGOTIABLE:
 * - Gate cannot be bypassed
 * - Gate cannot be overridden
 * - Decision is deterministic
 * - No ML/AI in decision
 */

import type {
  TemporalContract,
  TemporalGateAction,
  EntropyBudgetStatus,
  ForwardSimulationResultV2 as ForwardSimulationResult
} from './types';

import { TemporalContractRegistry } from './temporal-contract-registry';
import { ForwardTemporalSimulator } from './forward-temporal-simulator';
import { TemporalSingularityExpander } from './temporal-singularity-expander';
import { EntropyBudgetManager } from './entropy-budget-manager';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

/**
 * Gate check request
 */
export interface GateCheckRequest {
  projectId: string;
  actionType: 'MUTATION' | 'CREATION' | 'DELETION' | 'MODIFICATION';
  actionDescription: string;
  estimatedEntropyCost: number;
  currentState: {
    entropy: number;
    mutationCount: number;
    intentStrength: number;
    currentStep: number;
  };
  decision?: {
    decision_id: string;
    decision_type: string;
    magnitude: number;
    entropy_impact: number;
    mutation_potential: number;
    intent_impact: number;
  };
}

/**
 * Gate check detail
 */
interface GateCheckDetail {
  check: string;
  passed: boolean;
  reason: string;
  data?: Record<string, unknown>;
}

/**
 * Comprehensive gate result
 */
export interface ComprehensiveGateResult {
  gate_id: string;
  project_id: string;
  action: TemporalGateAction;
  passed: boolean;
  block_reason: string | null;
  contract_id: string | null;
  timestamp: string;
  checks_performed: number;
  checks_passed: number;
  checks: GateCheckDetail[];
  simulation_result: ForwardSimulationResult | null;
  budget_status: EntropyBudgetStatus | null;
  singularity_impact: {
    total_entropy_injection: number;
    total_mutations: number;
    earliest_breach: number | null;
  } | null;
}

export class TemporalGate {
  private contractRegistry: TemporalContractRegistry;
  private simulator: ForwardTemporalSimulator;
  private singularityExpander: TemporalSingularityExpander;
  private budgetManager: EntropyBudgetManager;

  // Gate statistics
  private stats = {
    total_checks: 0,
    allowed: 0,
    blocked: 0,
    read_only: 0
  };

  constructor(
    contractRegistry: TemporalContractRegistry,
    simulator: ForwardTemporalSimulator,
    singularityExpander: TemporalSingularityExpander,
    budgetManager: EntropyBudgetManager
  ) {
    this.contractRegistry = contractRegistry;
    this.simulator = simulator;
    this.singularityExpander = singularityExpander;
    this.budgetManager = budgetManager;
  }

  /**
   * Check if an action is allowed through the gate
   *
   * This is the ONLY entry point for temporal validation.
   * All components are checked, and a single deterministic decision is made.
   */
  check(request: GateCheckRequest): ComprehensiveGateResult {
    const gateId = `GATE-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const checks: GateCheckDetail[] = [];

    this.stats.total_checks++;

    // ==========================================
    // CHECK 1: Contract Exists
    // ==========================================
    const contract = this.contractRegistry.getContract(request.projectId);
    if (!contract) {
      checks.push({
        check: 'CONTRACT_EXISTS',
        passed: false,
        reason: 'No temporal contract declared. Every execution MUST have a contract.'
      });

      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'MISSING_CONTRACT',
        checks,
        null,
        null,
        null,
        timestamp
      );
    }

    checks.push({
      check: 'CONTRACT_EXISTS',
      passed: true,
      reason: `Contract ${contract.contract_id} found`
    });

    // ==========================================
    // CHECK 2: Budget Not Exhausted
    // ==========================================
    const budgetStatus = this.budgetManager.getBudgetStatus(request.projectId);
    if (!budgetStatus) {
      checks.push({
        check: 'BUDGET_EXISTS',
        passed: false,
        reason: 'No entropy budget allocated'
      });

      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'NO_BUDGET',
        checks,
        contract,
        null,
        null,
        timestamp
      );
    }

    if (budgetStatus.is_read_only) {
      checks.push({
        check: 'BUDGET_NOT_EXHAUSTED',
        passed: false,
        reason: `Project is PERMANENT_READ_ONLY since ${budgetStatus.read_only_at}`
      });

      this.stats.read_only++;
      return this.buildResult(
        gateId,
        request,
        'PERMANENT_READ_ONLY',
        'BUDGET_EXHAUSTED',
        checks,
        contract,
        null,
        budgetStatus,
        timestamp
      );
    }

    checks.push({
      check: 'BUDGET_NOT_EXHAUSTED',
      passed: true,
      reason: `Budget: ${budgetStatus.current_budget}/${budgetStatus.initial_budget} (${(budgetStatus.budget_ratio * 100).toFixed(1)}%)`
    });

    // ==========================================
    // CHECK 3: Can Afford Entropy Cost
    // ==========================================
    const canAfford = this.budgetManager.canConsume(
      request.projectId,
      request.estimatedEntropyCost
    );

    if (!canAfford.canConsume) {
      checks.push({
        check: 'CAN_AFFORD_ENTROPY',
        passed: false,
        reason: `Cannot afford ${request.estimatedEntropyCost} entropy. Available: ${canAfford.currentBudget}`,
        data: { required: request.estimatedEntropyCost, available: canAfford.currentBudget }
      });

      this.stats.blocked++;
      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'INSUFFICIENT_BUDGET',
        checks,
        contract,
        null,
        budgetStatus,
        timestamp
      );
    }

    checks.push({
      check: 'CAN_AFFORD_ENTROPY',
      passed: true,
      reason: `Can afford ${request.estimatedEntropyCost} entropy`
    });

    // ==========================================
    // CHECK 4: Lifespan Not Exceeded
    // ==========================================
    const lifespanCheck = this.contractRegistry.checkLifespan(
      contract,
      request.currentState.currentStep
    );

    if (lifespanCheck.violated) {
      checks.push({
        check: 'LIFESPAN_VALID',
        passed: false,
        reason: `Current step ${lifespanCheck.step} exceeds contract lifespan ${lifespanCheck.limit}`,
        data: { current: lifespanCheck.step, limit: lifespanCheck.limit }
      });

      this.stats.blocked++;
      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'LIFESPAN_EXCEEDED',
        checks,
        contract,
        null,
        budgetStatus,
        timestamp
      );
    }

    checks.push({
      check: 'LIFESPAN_VALID',
      passed: true,
      reason: `Step ${request.currentState.currentStep}/${contract.intended_lifespan}`
    });

    // ==========================================
    // CHECK 5: Mutation Limit Not Exceeded
    // ==========================================
    const mutationCheck = this.contractRegistry.checkMutationLimit(
      contract,
      request.currentState.mutationCount
    );

    if (mutationCheck.violated) {
      checks.push({
        check: 'MUTATION_LIMIT_VALID',
        passed: false,
        reason: `Mutation count ${mutationCheck.count} exceeds contract limit ${mutationCheck.limit}`,
        data: { current: mutationCheck.count, limit: mutationCheck.limit }
      });

      this.stats.blocked++;
      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'MUTATION_LIMIT_EXCEEDED',
        checks,
        contract,
        null,
        budgetStatus,
        timestamp
      );
    }

    checks.push({
      check: 'MUTATION_LIMIT_VALID',
      passed: true,
      reason: `Mutations ${request.currentState.mutationCount}/${contract.allowed_future_mutations}`
    });

    // ==========================================
    // CHECK 6: Current Entropy Drift Valid
    // ==========================================
    const entropyCheck = this.contractRegistry.checkEntropyDrift(
      contract,
      request.currentState.entropy
    );

    if (entropyCheck.violated) {
      checks.push({
        check: 'ENTROPY_DRIFT_VALID',
        passed: false,
        reason: `Entropy drift ${entropyCheck.drift.toFixed(4)} exceeds contract limit ${entropyCheck.limit}`,
        data: { drift: entropyCheck.drift, limit: entropyCheck.limit }
      });

      this.stats.blocked++;
      return this.buildResult(
        gateId,
        request,
        'BLOCK_PRESENT',
        'ENTROPY_DRIFT_EXCEEDED',
        checks,
        contract,
        null,
        budgetStatus,
        timestamp
      );
    }

    checks.push({
      check: 'ENTROPY_DRIFT_VALID',
      passed: true,
      reason: `Drift ${entropyCheck.drift.toFixed(4)}/${contract.max_entropy_drift}`
    });

    // ==========================================
    // CHECK 7: Forward Simulation Passes
    // ==========================================
    const simulationResult = this.simulator.simulate(
      contract,
      {
        entropy: request.currentState.entropy,
        mutationCount: request.currentState.mutationCount,
        intentStrength: request.currentState.intentStrength
      },
      { depth: 10 } // Simulate 10 steps forward
    );

    if (!simulationResult.survives_future) {
      checks.push({
        check: 'FORWARD_SIMULATION',
        passed: false,
        reason: `Future violation at step ${simulationResult.first_violation_step}. ${simulationResult.violations.length} violation(s) detected.`,
        data: {
          first_violation: simulationResult.first_violation_step,
          violations: simulationResult.violations.length,
          survivability: simulationResult.projected_survivability
        }
      });

      // Check severity
      const hasFatal = simulationResult.violations.some(v => v.severity === 'FATAL');
      if (hasFatal || simulationResult.recommendation === 'BLOCK_PRESENT') {
        this.stats.blocked++;
        return this.buildResult(
          gateId,
          request,
          'BLOCK_PRESENT',
          'FUTURE_VIOLATION',
          checks,
          contract,
          simulationResult,
          budgetStatus,
          timestamp
        );
      }
    }

    checks.push({
      check: 'FORWARD_SIMULATION',
      passed: simulationResult.survives_future,
      reason: simulationResult.survives_future
        ? `Future viable: ${(simulationResult.projected_survivability * 100).toFixed(1)}% survivability`
        : `Future warning: ${simulationResult.violations.length} violation(s) but non-fatal`
    });

    // ==========================================
    // CHECK 8: Singularity Impact (if decision provided)
    // ==========================================
    let singularityImpact = null;
    if (request.decision) {
      const evaluation = this.singularityExpander.evaluateDecision(
        request.projectId,
        contract,
        request.decision
      );

      if (!evaluation.allowed) {
        checks.push({
          check: 'SINGULARITY_IMPACT',
          passed: false,
          reason: evaluation.reason
        });

        this.stats.blocked++;
        return this.buildResult(
          gateId,
          request,
          'BLOCK_PRESENT',
          'SINGULARITY_BREACH',
          checks,
          contract,
          simulationResult,
          budgetStatus,
          timestamp
        );
      }

      const combinedImpact = this.singularityExpander.getCombinedImpact(request.projectId);
      singularityImpact = {
        total_entropy_injection: combinedImpact.total_entropy_injection,
        total_mutations: combinedImpact.total_mutations,
        earliest_breach: combinedImpact.earliest_breach
      };

      checks.push({
        check: 'SINGULARITY_IMPACT',
        passed: true,
        reason: `Decision impact contained. Total entropy: ${combinedImpact.total_entropy_injection.toFixed(4)}`
      });
    }

    // ==========================================
    // ALL CHECKS PASSED - ALLOW PRESENT
    // ==========================================
    this.stats.allowed++;

    return this.buildResult(
      gateId,
      request,
      'ALLOW_PRESENT',
      null,
      checks,
      contract,
      simulationResult,
      budgetStatus,
      timestamp,
      singularityImpact
    );
  }

  /**
   * Build comprehensive gate result
   */
  private buildResult(
    gateId: string,
    request: GateCheckRequest,
    action: TemporalGateAction,
    blockReason: string | null,
    checks: GateCheckDetail[],
    contract: TemporalContract | null,
    simulationResult: ForwardSimulationResult | null,
    budgetStatus: EntropyBudgetStatus | null,
    timestamp: string,
    singularityImpact?: {
      total_entropy_injection: number;
      total_mutations: number;
      earliest_breach: number | null;
    } | null
  ): ComprehensiveGateResult {
    const passed = action === 'ALLOW_PRESENT';
    const checksPassedCount = checks.filter(c => c.passed).length;

    return {
      gate_id: gateId,
      project_id: request.projectId,
      action,
      passed,
      block_reason: blockReason,
      contract_id: contract?.contract_id ?? null,
      timestamp,
      checks_performed: checks.length,
      checks_passed: checksPassedCount,
      checks,
      simulation_result: simulationResult,
      budget_status: budgetStatus,
      singularity_impact: singularityImpact ?? null
    };
  }

  /**
   * Quick check - just pass/fail
   */
  quickCheck(request: GateCheckRequest): {
    allowed: boolean;
    action: TemporalGateAction;
    reason: string;
  } {
    const result = this.check(request);
    return {
      allowed: result.passed,
      action: result.action,
      reason: result.block_reason || 'All checks passed'
    };
  }

  /**
   * Check and consume entropy if allowed
   */
  checkAndConsume(
    request: GateCheckRequest
  ): {
    result: ComprehensiveGateResult;
    consumed: boolean;
    consumptionMessage: string;
  } {
    const result = this.check(request);

    if (!result.passed) {
      return {
        result,
        consumed: false,
        consumptionMessage: `Action blocked: ${result.block_reason}`
      };
    }

    // Consume entropy
    const consumption = this.budgetManager.consumeEntropy(
      request.projectId,
      request.estimatedEntropyCost,
      `${request.actionType}: ${request.actionDescription}`
    );

    return {
      result,
      consumed: consumption.success,
      consumptionMessage: consumption.message
    };
  }

  /**
   * Get gate statistics
   */
  getStats(): {
    total_checks: number;
    allowed: number;
    blocked: number;
    read_only: number;
    allow_rate: number;
    block_rate: number;
  } {
    const total = this.stats.total_checks || 1;
    return {
      ...this.stats,
      allow_rate: this.stats.allowed / total,
      block_rate: this.stats.blocked / total
    };
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      total_checks: 0,
      allowed: 0,
      blocked: 0,
      read_only: 0
    };
  }

  /**
   * Log gate result
   */
  logResult(result: ComprehensiveGateResult): void {
    console.log('[TSL-GATE] ==========================================');
    console.log(`[TSL-GATE] Gate ID: ${result.gate_id}`);
    console.log(`[TSL-GATE] Project: ${result.project_id}`);
    console.log(`[TSL-GATE] Action: ${result.action}`);
    console.log(`[TSL-GATE] Passed: ${result.passed ? 'YES' : 'NO'}`);

    if (result.block_reason) {
      console.log(`[TSL-GATE] Block Reason: ${result.block_reason}`);
    }

    console.log('[TSL-GATE] ------------------------------------------');
    console.log(`[TSL-GATE] Checks: ${result.checks_passed}/${result.checks_performed} passed`);

    for (const check of result.checks) {
      const symbol = check.passed ? '[PASS]' : '[FAIL]';
      console.log(`[TSL-GATE]   ${symbol} ${check.check}: ${check.reason}`);
    }

    if (result.simulation_result) {
      console.log('[TSL-GATE] ------------------------------------------');
      console.log(`[TSL-GATE] Simulation: ${result.simulation_result.survives_future ? 'SURVIVES' : 'FAILS'}`);
      console.log(`[TSL-GATE] Survivability: ${(result.simulation_result.projected_survivability * 100).toFixed(1)}%`);
    }

    if (result.budget_status) {
      console.log('[TSL-GATE] ------------------------------------------');
      console.log(`[TSL-GATE] Budget: ${result.budget_status.current_budget}/${result.budget_status.initial_budget}`);
      console.log(`[TSL-GATE] State: ${result.budget_status.state}`);
    }

    console.log('[TSL-GATE] ==========================================');
  }
}

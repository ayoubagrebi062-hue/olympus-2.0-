/**
 * Temporal Sovereignty Layer (TSL) Engine
 *
 * The unified engine that integrates all TSL components:
 * - TemporalContractRegistry: Contract management
 * - ForwardTemporalSimulator: Future simulation
 * - TemporalSingularityExpander: Decision impact analysis
 * - EntropyBudgetManager: Resource management
 * - TemporalGate: Final enforcement
 *
 * CHAIN POSITION: IE → AEC → RLL → OCIC → ORIS → ICE → CIN → TSL
 *
 * KEY PRINCIPLE:
 * - TSL controls time, sequence, and entropy
 * - If a system cannot survive its future, it must not be created
 * - Entropy is finite - exhaustion is permanent
 *
 * NON-NEGOTIABLE:
 * - Every execution needs a temporal contract
 * - Forward simulation must pass before action
 * - Entropy budget is immutable once allocated
 * - Gate decision is final
 */

import type {
  TemporalContract,
  TemporalSimulationConfig,
  ForwardSimulationResultV2 as ForwardSimulationResult,
  TemporalSingularityV2 as TemporalSingularity,
  EntropyBudgetV2 as EntropyBudget,
  TSLIntelligenceV2 as TSLIntelligence
} from './types';

import { TemporalContractRegistry } from './temporal-contract-registry';
import { ForwardTemporalSimulator } from './forward-temporal-simulator';
import { TemporalSingularityExpander } from './temporal-singularity-expander';
import { EntropyBudgetManager } from './entropy-budget-manager';
import { TemporalGate, GateCheckRequest, ComprehensiveGateResult } from './temporal-gate';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

/**
 * TSL initialization config
 */
export interface TSLConfig {
  defaultSimulationDepth?: number;
  defaultEntropyBudget?: number;
  defaultLifespan?: number;
  defaultMutationLimit?: number;
  defaultEntropyDrift?: number;
}

/**
 * Project registration request
 */
export interface ProjectRegistration {
  projectId: string;
  intendedLifespan: number;
  allowedMutations: number;
  maxEntropyDrift: number;
  initialEntropyBudget: number;
  baselineEntropy?: number;
}

/**
 * Action request to TSL
 */
export interface TSLActionRequest {
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
 * TSL Action result
 */
export interface TSLActionResult {
  allowed: boolean;
  action: 'ALLOW_PRESENT' | 'BLOCK_PRESENT' | 'PERMANENT_READ_ONLY';
  reason: string;
  gateResult: ComprehensiveGateResult;
  entropyConsumed: boolean;
  newBudgetStatus: {
    current: number;
    initial: number;
    ratio: number;
    state: string;
  } | null;
}

/**
 * TSL Engine - Main orchestrator for Temporal Sovereignty Layer
 */
export class TSLEngine {
  private contractRegistry: TemporalContractRegistry;
  private simulator: ForwardTemporalSimulator;
  private singularityExpander: TemporalSingularityExpander;
  private budgetManager: EntropyBudgetManager;
  private gate: TemporalGate;

  private config: TSLConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<TSLConfig>) {
    // Initialize components
    this.contractRegistry = new TemporalContractRegistry();
    this.simulator = new ForwardTemporalSimulator();
    this.singularityExpander = new TemporalSingularityExpander();
    this.budgetManager = new EntropyBudgetManager();
    this.gate = new TemporalGate(
      this.contractRegistry,
      this.simulator,
      this.singularityExpander,
      this.budgetManager
    );

    // Set config with defaults
    this.config = {
      defaultSimulationDepth: config?.defaultSimulationDepth ?? 10,
      defaultEntropyBudget: config?.defaultEntropyBudget ?? 1000,
      defaultLifespan: config?.defaultLifespan ?? 100,
      defaultMutationLimit: config?.defaultMutationLimit ?? 50,
      defaultEntropyDrift: config?.defaultEntropyDrift ?? 0.3
    };

    this.initialized = true;
  }

  /**
   * Register a new project with TSL
   */
  registerProject(registration: ProjectRegistration): {
    success: boolean;
    contract: TemporalContract | null;
    budget: EntropyBudget | null;
    message: string;
  } {
    const projectId = registration.projectId;

    // Check if already registered
    if (this.contractRegistry.hasContract(projectId)) {
      return {
        success: false,
        contract: null,
        budget: null,
        message: `Project ${projectId} is already registered with TSL`
      };
    }

    try {
      // Create temporal contract
      const contract = this.contractRegistry.createContract(
        projectId,
        registration.intendedLifespan,
        registration.allowedMutations,
        registration.maxEntropyDrift,
        registration.baselineEntropy ?? 0.0
      );

      // Allocate entropy budget
      const budget = this.budgetManager.allocateBudget(
        projectId,
        registration.initialEntropyBudget
      );

      console.log(`[TSL] Project ${projectId} registered successfully`);
      console.log(`[TSL]   Contract: ${contract.contract_id}`);
      console.log(`[TSL]   Lifespan: ${contract.intended_lifespan} steps`);
      console.log(`[TSL]   Budget: ${budget.initial_budget} entropy`);

      return {
        success: true,
        contract,
        budget,
        message: `Project ${projectId} registered with contract ${contract.contract_id}`
      };
    } catch (error) {
      return {
        success: false,
        contract: null,
        budget: null,
        message: `Failed to register project: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Request an action through TSL
   */
  requestAction(request: TSLActionRequest): TSLActionResult {
    // Convert to gate request
    const gateRequest: GateCheckRequest = {
      projectId: request.projectId,
      actionType: request.actionType,
      actionDescription: request.actionDescription,
      estimatedEntropyCost: request.estimatedEntropyCost,
      currentState: request.currentState,
      decision: request.decision
    };

    // Check and consume through gate
    const { result, consumed, consumptionMessage } = this.gate.checkAndConsume(gateRequest);

    // Get new budget status
    const budgetStatus = this.budgetManager.getBudgetStatus(request.projectId);
    const newBudgetStatus = budgetStatus ? {
      current: budgetStatus.current_budget,
      initial: budgetStatus.initial_budget,
      ratio: budgetStatus.budget_ratio,
      state: budgetStatus.state
    } : null;

    return {
      allowed: result.passed,
      action: result.action,
      reason: result.block_reason || 'Action permitted',
      gateResult: result,
      entropyConsumed: consumed,
      newBudgetStatus
    };
  }

  /**
   * Simulate future for a project
   */
  simulateFuture(
    projectId: string,
    currentState: {
      entropy: number;
      mutationCount: number;
      intentStrength: number;
    },
    depth?: number
  ): ForwardSimulationResult | null {
    const contract = this.contractRegistry.getContract(projectId);
    if (!contract) {
      console.log(`[TSL] Cannot simulate: No contract for project ${projectId}`);
      return null;
    }

    return this.simulator.simulate(
      contract,
      currentState,
      { depth: depth ?? this.config.defaultSimulationDepth }
    );
  }

  /**
   * Create a decision singularity
   */
  createDecisionSingularity(
    projectId: string,
    decision: {
      decision_id: string;
      decision_type: string;
      magnitude: number;
      entropy_impact: number;
      mutation_potential: number;
      intent_impact: number;
    }
  ): {
    allowed: boolean;
    singularity: TemporalSingularity | null;
    reason: string;
  } {
    const contract = this.contractRegistry.getContract(projectId);
    if (!contract) {
      return {
        allowed: false,
        singularity: null,
        reason: `No contract for project ${projectId}`
      };
    }

    return this.singularityExpander.evaluateDecision(projectId, contract, decision);
  }

  /**
   * Get project status
   */
  getProjectStatus(projectId: string): {
    registered: boolean;
    contract: TemporalContract | null;
    budget: EntropyBudget | null;
    singularities: TemporalSingularity[];
    isReadOnly: boolean;
    combinedSingularityImpact: {
      total_entropy_injection: number;
      total_mutations: number;
      earliest_breach: number | null;
      all_contained: boolean;
    };
  } | null {
    const contract = this.contractRegistry.getContract(projectId);
    if (!contract) {
      return null;
    }

    const budget = this.budgetManager.getBudget(projectId);
    const singularities = this.singularityExpander.getProjectSingularities(projectId);
    const isReadOnly = this.budgetManager.isReadOnly(projectId);
    const combinedImpact = this.singularityExpander.getCombinedImpact(projectId);

    return {
      registered: true,
      contract,
      budget,
      singularities,
      isReadOnly,
      combinedSingularityImpact: combinedImpact
    };
  }

  /**
   * Check if project is read-only
   */
  isProjectReadOnly(projectId: string): boolean {
    return this.budgetManager.isReadOnly(projectId);
  }

  /**
   * Get remaining entropy budget
   */
  getRemainingBudget(projectId: string): number {
    const budget = this.budgetManager.getBudget(projectId);
    return budget?.current_budget ?? 0;
  }

  /**
   * Estimate remaining operations
   */
  estimateRemainingOperations(
    projectId: string,
    avgCostPerOperation: number
  ): number {
    return this.budgetManager.estimateRemainingOperations(projectId, avgCostPerOperation);
  }

  /**
   * Generate TSL intelligence report
   */
  generateIntelligence(projectId: string): TSLIntelligence | null {
    const status = this.getProjectStatus(projectId);
    if (!status || !status.contract) {
      return null;
    }

    // Extract contract for type safety (we know it exists after the check above)
    const contract = status.contract;

    const budgetStatus = this.budgetManager.getBudgetStatus(projectId);
    const consumptionRate = this.budgetManager.getConsumptionRate(projectId);
    const gateStats = this.gate.getStats();

    // Simulate future if possible
    let futureProjection = null;
    if (budgetStatus && !status.isReadOnly) {
      const simulation = this.simulateFuture(projectId, {
        entropy: contract.baseline_entropy,
        mutationCount: 0,
        intentStrength: 1.0
      }, 20);

      if (simulation) {
        futureProjection = {
          survives: simulation.survives_future,
          survivability: simulation.projected_survivability,
          first_violation_step: simulation.first_violation_step,
          violation_count: simulation.violations.length
        };
      }
    }

    return {
      project_id: projectId,
      timestamp: new Date().toISOString(),
      contract: {
        id: contract.contract_id,
        lifespan: contract.intended_lifespan,
        mutation_limit: contract.allowed_future_mutations,
        entropy_drift_limit: contract.max_entropy_drift
      },
      budget: budgetStatus ? {
        initial: budgetStatus.initial_budget,
        current: budgetStatus.current_budget,
        consumed: budgetStatus.total_consumed,
        ratio: budgetStatus.budget_ratio,
        state: budgetStatus.state,
        is_read_only: budgetStatus.is_read_only
      } : null,
      singularities: {
        count: status.singularities.length,
        contained: status.singularities.filter(s => s.contained).length,
        total_entropy_injection: status.combinedSingularityImpact.total_entropy_injection,
        earliest_breach: status.combinedSingularityImpact.earliest_breach
      },
      consumption_rate: consumptionRate ? {
        avg_per_transaction: consumptionRate.avg_per_transaction,
        rate_per_hour: consumptionRate.rate_per_hour
      } : null,
      future_projection: futureProjection,
      gate_stats: {
        total_checks: gateStats.total_checks,
        allow_rate: gateStats.allow_rate,
        block_rate: gateStats.block_rate
      }
    };
  }

  /**
   * Get TSL statistics
   */
  getStats(): {
    tsl_version: string;
    contracts: {
      total: number;
      avg_lifespan: number;
      avg_mutations: number;
    };
    budgets: {
      total_projects: number;
      active: number;
      read_only: number;
      total_allocated: number;
      total_consumed: number;
    };
    singularities: {
      total: number;
      contained: number;
      uncontained: number;
    };
    gate: {
      total_checks: number;
      allow_rate: number;
      block_rate: number;
    };
  } {
    const contractStats = this.contractRegistry.getStats();
    const budgetStats = this.budgetManager.getStats();
    const singularityStats = this.singularityExpander.getStats();
    const gateStats = this.gate.getStats();

    return {
      tsl_version: TSL_VERSION,
      contracts: {
        total: contractStats.total_contracts,
        avg_lifespan: contractStats.avg_lifespan,
        avg_mutations: contractStats.avg_mutations
      },
      budgets: {
        total_projects: budgetStats.total_projects,
        active: budgetStats.active_projects,
        read_only: budgetStats.read_only_projects,
        total_allocated: budgetStats.total_allocated,
        total_consumed: budgetStats.total_consumed
      },
      singularities: {
        total: singularityStats.total_singularities,
        contained: singularityStats.contained,
        uncontained: singularityStats.uncontained
      },
      gate: {
        total_checks: gateStats.total_checks,
        allow_rate: gateStats.allow_rate,
        block_rate: gateStats.block_rate
      }
    };
  }

  /**
   * Log TSL status
   */
  logStatus(): void {
    const stats = this.getStats();

    console.log('[TSL] ==========================================');
    console.log('[TSL] TEMPORAL SOVEREIGNTY LAYER STATUS');
    console.log('[TSL] ==========================================');
    console.log(`[TSL] Version: ${stats.tsl_version}`);
    console.log('[TSL] ------------------------------------------');
    console.log('[TSL] CONTRACTS:');
    console.log(`[TSL]   Total: ${stats.contracts.total}`);
    console.log(`[TSL]   Avg Lifespan: ${stats.contracts.avg_lifespan.toFixed(1)} steps`);
    console.log(`[TSL]   Avg Mutations: ${stats.contracts.avg_mutations.toFixed(1)}`);
    console.log('[TSL] ------------------------------------------');
    console.log('[TSL] BUDGETS:');
    console.log(`[TSL]   Total Projects: ${stats.budgets.total_projects}`);
    console.log(`[TSL]   Active: ${stats.budgets.active}`);
    console.log(`[TSL]   Read-Only: ${stats.budgets.read_only}`);
    console.log(`[TSL]   Allocated: ${stats.budgets.total_allocated}`);
    console.log(`[TSL]   Consumed: ${stats.budgets.total_consumed}`);
    console.log('[TSL] ------------------------------------------');
    console.log('[TSL] SINGULARITIES:');
    console.log(`[TSL]   Total: ${stats.singularities.total}`);
    console.log(`[TSL]   Contained: ${stats.singularities.contained}`);
    console.log(`[TSL]   Uncontained: ${stats.singularities.uncontained}`);
    console.log('[TSL] ------------------------------------------');
    console.log('[TSL] GATE:');
    console.log(`[TSL]   Total Checks: ${stats.gate.total_checks}`);
    console.log(`[TSL]   Allow Rate: ${(stats.gate.allow_rate * 100).toFixed(1)}%`);
    console.log(`[TSL]   Block Rate: ${(stats.gate.block_rate * 100).toFixed(1)}%`);
    console.log('[TSL] ==========================================');
  }

  /**
   * Export TSL state for persistence
   */
  exportState(): {
    contracts: Record<string, TemporalContract>;
    budgets: Record<string, EntropyBudget>;
    singularities: Record<string, TemporalSingularity>;
  } {
    return {
      contracts: this.contractRegistry.exportContracts(),
      budgets: this.budgetManager.exportBudgets(),
      singularities: this.singularityExpander.exportSingularities()
    };
  }

  /**
   * Import TSL state from persistence
   */
  importState(state: {
    contracts?: Record<string, TemporalContract>;
    budgets?: Record<string, EntropyBudget>;
    singularities?: Record<string, TemporalSingularity>;
  }): void {
    if (state.contracts) {
      this.contractRegistry.importContracts(state.contracts);
    }
    if (state.budgets) {
      this.budgetManager.importBudgets(state.budgets);
    }
    if (state.singularities) {
      this.singularityExpander.importSingularities(state.singularities);
    }
  }

  /**
   * Get access to individual components (for advanced usage)
   */
  getComponents(): {
    contractRegistry: TemporalContractRegistry;
    simulator: ForwardTemporalSimulator;
    singularityExpander: TemporalSingularityExpander;
    budgetManager: EntropyBudgetManager;
    gate: TemporalGate;
  } {
    return {
      contractRegistry: this.contractRegistry,
      simulator: this.simulator,
      singularityExpander: this.singularityExpander,
      budgetManager: this.budgetManager,
      gate: this.gate
    };
  }
}

/**
 * Create TSL Engine instance
 */
export function createTSLEngine(config?: Partial<TSLConfig>): TSLEngine {
  return new TSLEngine(config);
}

/**
 * Entropy Budget Manager
 *
 * Manages finite entropy allocation per project.
 * Budget exhaustion = PERMANENT_READ_ONLY - no exceptions.
 *
 * KEY PRINCIPLE:
 * - Entropy is a finite resource
 * - Every mutation costs entropy
 * - When budget exhausted, project becomes READ_ONLY forever
 * - No rollback, no refund, no exceptions
 *
 * ENTROPY MODEL:
 * - Initial budget allocated at project creation
 * - Every mutation consumes entropy
 * - Budget tracked via append-only ledger
 * - Exhaustion is permanent and irreversible
 *
 * NON-NEGOTIABLE:
 * - No budget increase after creation
 * - No entropy refunds
 * - Append-only ledger (no deletion)
 * - PERMANENT_READ_ONLY is final
 */

import * as crypto from 'crypto';
import type {
  EntropyTransaction,
  EntropyBudgetStatus,
  EntropyBudgetV2 as EntropyBudget
} from './types';

// TSL version - immutable
const TSL_VERSION = '1.0.0';
Object.freeze({ TSL_VERSION });

// Budget constraints
const DEFAULT_INITIAL_BUDGET = 1000;  // Default entropy units
const MIN_INITIAL_BUDGET = 100;
const MAX_INITIAL_BUDGET = 10000;
const ENTROPY_PRECISION = 6;          // Decimal places

/**
 * Transaction types
 */
type TransactionType =
  | 'INITIAL_ALLOCATION'
  | 'MUTATION_COST'
  | 'ENTROPY_INJECTION'
  | 'SYSTEM_OVERHEAD'
  | 'CORRECTION';

/**
 * Project state
 */
type ProjectState = 'ACTIVE' | 'LOW_BUDGET' | 'CRITICAL' | 'EXHAUSTED' | 'PERMANENT_READ_ONLY';

/**
 * Internal budget record
 */
interface BudgetRecord {
  projectId: string;
  initialBudget: number;
  currentBudget: number;
  totalConsumed: number;
  transactions: EntropyTransaction[];
  state: ProjectState;
  createdAt: string;
  lastTransactionAt: string;
  exhaustedAt: string | null;
  readOnlyAt: string | null;
}

export class EntropyBudgetManager {
  // Budget records by project
  private budgets: Map<string, BudgetRecord> = new Map();

  // Thresholds for state transitions
  private readonly LOW_BUDGET_THRESHOLD = 0.25;    // 25% remaining
  private readonly CRITICAL_THRESHOLD = 0.10;      // 10% remaining
  private readonly EXHAUSTED_THRESHOLD = 0.01;     // 1% remaining = exhausted

  /**
   * Allocate initial entropy budget for a project
   *
   * @param projectId The project ID
   * @param initialBudget Initial entropy budget (optional)
   * @returns The created entropy budget
   */
  allocateBudget(
    projectId: string,
    initialBudget?: number
  ): EntropyBudget {
    // Check if already allocated
    if (this.budgets.has(projectId)) {
      throw new Error(`BUDGET_EXISTS: Project ${projectId} already has an entropy budget. Cannot reallocate.`);
    }

    // Validate initial budget
    const budget = initialBudget ?? DEFAULT_INITIAL_BUDGET;
    if (budget < MIN_INITIAL_BUDGET || budget > MAX_INITIAL_BUDGET) {
      throw new Error(`INVALID_BUDGET: Initial budget must be between ${MIN_INITIAL_BUDGET} and ${MAX_INITIAL_BUDGET}`);
    }

    const now = new Date().toISOString();
    const transactionId = this.generateTransactionId();

    // Create initial transaction
    const initialTransaction: EntropyTransaction = {
      transaction_id: transactionId,
      project_id: projectId,
      type: 'INITIAL_ALLOCATION',
      amount: budget,
      balance_before: 0,
      balance_after: budget,
      timestamp: now,
      reason: 'Initial entropy budget allocation',
      metadata: {
        initial_budget: budget,
        source: 'EntropyBudgetManager.allocateBudget'
      }
    };

    // Create budget record
    const record: BudgetRecord = {
      projectId,
      initialBudget: budget,
      currentBudget: budget,
      totalConsumed: 0,
      transactions: [initialTransaction],
      state: 'ACTIVE',
      createdAt: now,
      lastTransactionAt: now,
      exhaustedAt: null,
      readOnlyAt: null
    };

    // Store the record
    this.budgets.set(projectId, record);

    return this.toBudgetOutput(record);
  }

  /**
   * Consume entropy from budget
   *
   * @param projectId The project ID
   * @param amount Amount of entropy to consume
   * @param reason Reason for consumption
   * @returns Transaction result
   */
  consumeEntropy(
    projectId: string,
    amount: number,
    reason: string
  ): {
    success: boolean;
    transaction: EntropyTransaction | null;
    newState: ProjectState;
    message: string;
  } {
    const record = this.budgets.get(projectId);

    // Check budget exists
    if (!record) {
      return {
        success: false,
        transaction: null,
        newState: 'ACTIVE',
        message: `NO_BUDGET: Project ${projectId} has no entropy budget allocated`
      };
    }

    // Check if already read-only
    if (record.state === 'PERMANENT_READ_ONLY') {
      return {
        success: false,
        transaction: null,
        newState: 'PERMANENT_READ_ONLY',
        message: `PERMANENT_READ_ONLY: Project ${projectId} has exhausted its entropy budget and is permanently read-only`
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        transaction: null,
        newState: record.state,
        message: 'INVALID_AMOUNT: Consumption amount must be positive'
      };
    }

    const now = new Date().toISOString();
    const transactionId = this.generateTransactionId();
    const balanceBefore = record.currentBudget;
    const balanceAfter = Math.max(0, this.roundEntropy(balanceBefore - amount));

    // Create transaction
    const transaction: EntropyTransaction = {
      transaction_id: transactionId,
      project_id: projectId,
      type: 'MUTATION_COST',
      amount: -amount, // Negative for consumption
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      timestamp: now,
      reason,
      metadata: {
        consumption_type: 'MUTATION_COST'
      }
    };

    // Update record
    record.currentBudget = balanceAfter;
    record.totalConsumed += amount;
    record.transactions.push(transaction);
    record.lastTransactionAt = now;

    // Update state
    const newState = this.calculateState(record);
    // Store previous state before updating (cast to avoid narrowing issues)
    const previousState = record.state as ProjectState;
    record.state = newState;

    // Handle exhaustion - check if state changed to EXHAUSTED
    if (newState === 'EXHAUSTED' && (previousState as string) !== 'EXHAUSTED') {
      record.exhaustedAt = now;
    }

    // Handle permanent read-only transition
    if (newState === 'PERMANENT_READ_ONLY' && (previousState as string) !== 'PERMANENT_READ_ONLY') {
      record.readOnlyAt = now;
      console.log(`[TSL-ENTROPY] PROJECT ${projectId} IS NOW PERMANENT_READ_ONLY`);
    }

    return {
      success: true,
      transaction,
      newState,
      message: newState === 'PERMANENT_READ_ONLY'
        ? `BUDGET_EXHAUSTED: Project ${projectId} has exhausted its entropy budget and is now PERMANENT_READ_ONLY`
        : `Consumed ${amount} entropy. Remaining: ${balanceAfter}`
    };
  }

  /**
   * Calculate project state based on budget
   */
  private calculateState(record: BudgetRecord): ProjectState {
    // Already read-only is permanent
    if (record.state === 'PERMANENT_READ_ONLY') {
      return 'PERMANENT_READ_ONLY';
    }

    const ratio = record.currentBudget / record.initialBudget;

    if (ratio <= this.EXHAUSTED_THRESHOLD) {
      return 'PERMANENT_READ_ONLY'; // Exhausted = permanent read-only
    }
    if (ratio <= this.CRITICAL_THRESHOLD) {
      return 'CRITICAL';
    }
    if (ratio <= this.LOW_BUDGET_THRESHOLD) {
      return 'LOW_BUDGET';
    }
    return 'ACTIVE';
  }

  /**
   * Check if project can consume entropy
   */
  canConsume(projectId: string, amount: number): {
    canConsume: boolean;
    reason: string;
    currentBudget: number;
    requiredAmount: number;
  } {
    const record = this.budgets.get(projectId);

    if (!record) {
      return {
        canConsume: false,
        reason: 'NO_BUDGET',
        currentBudget: 0,
        requiredAmount: amount
      };
    }

    if (record.state === 'PERMANENT_READ_ONLY') {
      return {
        canConsume: false,
        reason: 'PERMANENT_READ_ONLY',
        currentBudget: record.currentBudget,
        requiredAmount: amount
      };
    }

    if (record.currentBudget < amount) {
      return {
        canConsume: false,
        reason: 'INSUFFICIENT_BUDGET',
        currentBudget: record.currentBudget,
        requiredAmount: amount
      };
    }

    return {
      canConsume: true,
      reason: 'OK',
      currentBudget: record.currentBudget,
      requiredAmount: amount
    };
  }

  /**
   * Get budget status for a project
   */
  getBudgetStatus(projectId: string): EntropyBudgetStatus | null {
    const record = this.budgets.get(projectId);
    if (!record) {
      return null;
    }

    const ratio = record.currentBudget / record.initialBudget;

    return {
      project_id: projectId,
      initial_budget: record.initialBudget,
      current_budget: record.currentBudget,
      total_consumed: record.totalConsumed,
      budget_ratio: ratio,
      state: record.state,
      is_read_only: record.state === 'PERMANENT_READ_ONLY',
      transaction_count: record.transactions.length,
      created_at: record.createdAt,
      last_transaction_at: record.lastTransactionAt,
      exhausted_at: record.exhaustedAt,
      read_only_at: record.readOnlyAt
    };
  }

  /**
   * Get budget output format
   */
  private toBudgetOutput(record: BudgetRecord): EntropyBudget {
    return {
      project_id: record.projectId,
      initial_budget: record.initialBudget,
      current_budget: record.currentBudget,
      total_consumed: record.totalConsumed,
      state: record.state,
      transactions: record.transactions,
      created_at: record.createdAt,
      exhausted_at: record.exhaustedAt,
      read_only_at: record.readOnlyAt
    };
  }

  /**
   * Get full budget record
   */
  getBudget(projectId: string): EntropyBudget | null {
    const record = this.budgets.get(projectId);
    if (!record) {
      return null;
    }
    return this.toBudgetOutput(record);
  }

  /**
   * Check if project has budget
   */
  hasBudget(projectId: string): boolean {
    return this.budgets.has(projectId);
  }

  /**
   * Check if project is read-only
   */
  isReadOnly(projectId: string): boolean {
    const record = this.budgets.get(projectId);
    return record?.state === 'PERMANENT_READ_ONLY';
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(
    projectId: string,
    limit?: number
  ): EntropyTransaction[] {
    const record = this.budgets.get(projectId);
    if (!record) {
      return [];
    }

    const transactions = [...record.transactions].reverse();
    return limit ? transactions.slice(0, limit) : transactions;
  }

  /**
   * Estimate remaining operations
   */
  estimateRemainingOperations(
    projectId: string,
    avgCostPerOperation: number
  ): number {
    const record = this.budgets.get(projectId);
    if (!record || record.state === 'PERMANENT_READ_ONLY') {
      return 0;
    }

    if (avgCostPerOperation <= 0) {
      return Infinity;
    }

    return Math.floor(record.currentBudget / avgCostPerOperation);
  }

  /**
   * Get consumption rate
   */
  getConsumptionRate(projectId: string): {
    total_consumed: number;
    transaction_count: number;
    avg_per_transaction: number;
    time_span_ms: number;
    rate_per_hour: number;
  } | null {
    const record = this.budgets.get(projectId);
    if (!record || record.transactions.length < 2) {
      return null;
    }

    const consumptionTx = record.transactions.filter(t => t.amount < 0);
    if (consumptionTx.length === 0) {
      return {
        total_consumed: 0,
        transaction_count: 0,
        avg_per_transaction: 0,
        time_span_ms: 0,
        rate_per_hour: 0
      };
    }

    const totalConsumed = consumptionTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgPerTx = totalConsumed / consumptionTx.length;

    const firstTime = new Date(record.createdAt).getTime();
    const lastTime = new Date(record.lastTransactionAt).getTime();
    const timeSpan = lastTime - firstTime;

    const ratePerHour = timeSpan > 0
      ? (totalConsumed / timeSpan) * 3600000
      : 0;

    return {
      total_consumed: totalConsumed,
      transaction_count: consumptionTx.length,
      avg_per_transaction: avgPerTx,
      time_span_ms: timeSpan,
      rate_per_hour: ratePerHour
    };
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `TX-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Round entropy to precision
   */
  private roundEntropy(value: number): number {
    const factor = Math.pow(10, ENTROPY_PRECISION);
    return Math.round(value * factor) / factor;
  }

  /**
   * Get all project IDs with budgets
   */
  getAllProjectIds(): string[] {
    return Array.from(this.budgets.keys());
  }

  /**
   * Get statistics
   */
  getStats(): {
    total_projects: number;
    active_projects: number;
    low_budget_projects: number;
    critical_projects: number;
    read_only_projects: number;
    total_allocated: number;
    total_consumed: number;
    total_remaining: number;
  } {
    const records = Array.from(this.budgets.values());
    const count = records.length;

    if (count === 0) {
      return {
        total_projects: 0,
        active_projects: 0,
        low_budget_projects: 0,
        critical_projects: 0,
        read_only_projects: 0,
        total_allocated: 0,
        total_consumed: 0,
        total_remaining: 0
      };
    }

    const stateCount = {
      ACTIVE: 0,
      LOW_BUDGET: 0,
      CRITICAL: 0,
      EXHAUSTED: 0,
      PERMANENT_READ_ONLY: 0
    };

    let totalAllocated = 0;
    let totalConsumed = 0;
    let totalRemaining = 0;

    for (const record of records) {
      stateCount[record.state]++;
      totalAllocated += record.initialBudget;
      totalConsumed += record.totalConsumed;
      totalRemaining += record.currentBudget;
    }

    return {
      total_projects: count,
      active_projects: stateCount.ACTIVE,
      low_budget_projects: stateCount.LOW_BUDGET,
      critical_projects: stateCount.CRITICAL,
      read_only_projects: stateCount.PERMANENT_READ_ONLY,
      total_allocated: totalAllocated,
      total_consumed: totalConsumed,
      total_remaining: totalRemaining
    };
  }

  /**
   * Log budget status
   */
  logBudgetStatus(projectId: string): void {
    const status = this.getBudgetStatus(projectId);
    if (!status) {
      console.log(`[TSL-ENTROPY] No budget found for project ${projectId}`);
      return;
    }

    console.log('[TSL-ENTROPY] ==========================================');
    console.log(`[TSL-ENTROPY] Project: ${status.project_id}`);
    console.log(`[TSL-ENTROPY] State: ${status.state}`);
    console.log('[TSL-ENTROPY] ------------------------------------------');
    console.log(`[TSL-ENTROPY] Initial Budget: ${status.initial_budget}`);
    console.log(`[TSL-ENTROPY] Current Budget: ${status.current_budget}`);
    console.log(`[TSL-ENTROPY] Total Consumed: ${status.total_consumed}`);
    console.log(`[TSL-ENTROPY] Budget Ratio: ${(status.budget_ratio * 100).toFixed(2)}%`);
    console.log('[TSL-ENTROPY] ------------------------------------------');
    console.log(`[TSL-ENTROPY] Transactions: ${status.transaction_count}`);
    console.log(`[TSL-ENTROPY] Is Read-Only: ${status.is_read_only}`);

    if (status.exhausted_at) {
      console.log(`[TSL-ENTROPY] Exhausted At: ${status.exhausted_at}`);
    }
    if (status.read_only_at) {
      console.log(`[TSL-ENTROPY] Read-Only At: ${status.read_only_at}`);
    }

    console.log('[TSL-ENTROPY] ==========================================');
  }

  /**
   * Export budgets for persistence
   */
  exportBudgets(): Record<string, EntropyBudget> {
    const exported: Record<string, EntropyBudget> = {};
    for (const [projectId, record] of this.budgets) {
      exported[projectId] = this.toBudgetOutput(record);
    }
    return exported;
  }

  /**
   * Import budgets from persistence
   * NOTE: This preserves the append-only nature by not allowing modification of existing records
   */
  importBudgets(budgets: Record<string, EntropyBudget>): void {
    for (const [projectId, budget] of Object.entries(budgets)) {
      // Only import if not already exists (append-only)
      if (!this.budgets.has(projectId)) {
        const record: BudgetRecord = {
          projectId: budget.project_id,
          initialBudget: budget.initial_budget,
          currentBudget: budget.current_budget,
          totalConsumed: budget.total_consumed,
          transactions: budget.transactions,
          state: budget.state as ProjectState,
          createdAt: budget.created_at,
          lastTransactionAt: budget.transactions.length > 0
            ? budget.transactions[budget.transactions.length - 1].timestamp
            : budget.created_at,
          exhaustedAt: budget.exhausted_at,
          readOnlyAt: budget.read_only_at
        };
        this.budgets.set(projectId, record);
      }
    }
  }
}

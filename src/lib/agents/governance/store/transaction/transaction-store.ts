/**
 * OLYMPUS 2.0 — Governance Transaction Store
 * Phase 2.3: Transaction-capable governance store
 * @version 1.0.0
 */

import {
  TransactionContext,
  TransactionResult,
  TransactionOperation,
  VerificationEvent,
} from './types';

export interface ITransactionStore {
  beginTransaction(): TransactionContext;
  commitTransaction(context: TransactionContext): Promise<TransactionResult<void>>;
  rollbackTransaction(context: TransactionContext): Promise<TransactionResult<void>>;
  transaction<T>(fn: (context: TransactionContext) => Promise<T>): Promise<TransactionResult<T>>;
}

export class InMemoryTransactionStore implements ITransactionStore {
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private operationLog: TransactionOperation[] = [];

  beginTransaction(): TransactionContext {
    const transactionId = crypto.randomUUID();
    const context: TransactionContext = {
      transactionId,
      startTime: new Date(),
      operations: [],
    };

    this.activeTransactions.set(transactionId, context);
    console.log(`[TransactionStore] Transaction ${transactionId} started`);

    return context;
  }

  async commitTransaction(context: TransactionContext): Promise<TransactionResult<void>> {
    const duration = Date.now() - context.startTime.getTime();

    this.operationLog.push(...context.operations);
    this.activeTransactions.delete(context.transactionId);

    console.log(
      `[TransactionStore] Transaction ${context.transactionId} committed (${duration}ms)`
    );

    return {
      success: true,
    };
  }

  async rollbackTransaction(context: TransactionContext): Promise<TransactionResult<void>> {
    const duration = Date.now() - context.startTime.getTime();
    const rollbackActions = [...context.operations].reverse();

    this.operationLog.push({
      type: 'rollback',
      entity: 'transaction',
      operation: `rollback_${context.transactionId}`,
      timestamp: new Date(),
    });

    this.activeTransactions.delete(context.transactionId);

    console.log(
      `[TransactionStore] Transaction ${context.transactionId} rolled back (${duration}ms)`
    );

    return {
      success: false,
      error: new Error('Transaction rolled back'),
      rollbackActions,
    };
  }

  async transaction<T>(
    fn: (context: TransactionContext) => Promise<T>
  ): Promise<TransactionResult<T>> {
    const context = this.beginTransaction();

    try {
      const result = await fn(context);
      await this.commitTransaction(context);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(
        `[TransactionStore] Transaction ${context.transactionId} failed: ${error.message}`
      );

      const rollbackResult = await this.rollbackTransaction(context);

      return {
        success: false,
        error: error,
        rollbackActions: rollbackResult.rollbackActions,
      };
    }
  }

  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  getOperationLog(): TransactionOperation[] {
    return [...this.operationLog];
  }
}

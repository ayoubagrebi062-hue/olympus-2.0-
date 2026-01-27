/**
 * ============================================================================
 * DISTRIBUTED SAGA ORCHESTRATOR - COMPLEX WORKFLOW COORDINATION
 * ============================================================================
 *
 * "In distributed systems, the saga pattern ensures all-or-nothing semantics."
 *
 * This module implements the Saga pattern for multi-agent workflows:
 * - Choreography-based coordination
 * - Compensating transactions (rollback)
 * - Parallel execution with synchronization barriers
 * - Distributed locking for shared resources
 * - Exactly-once semantics with idempotency
 *
 * Inspired by: AWS Step Functions, Temporal.io, Uber Cadence
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { EventStore, BuildEvent } from './event-sourcing';

// ============================================================================
// TYPES
// ============================================================================

export type SagaStatus =
  | 'pending'
  | 'running'
  | 'compensating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'compensated';

export interface SagaDefinition {
  id: string;
  name: string;
  version: number;
  steps: SagaStep[];
  compensationStrategy: 'backward' | 'forward' | 'selective';
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  metadata: Record<string, unknown>;
}

export interface SagaStep {
  id: string;
  name: string;
  type: 'action' | 'compensation' | 'parallel' | 'conditional' | 'barrier';
  agentId?: string;
  dependencies: string[];
  compensationStepId?: string;
  condition?: (context: SagaContext) => boolean;
  parallelSteps?: string[];
  barrierSteps?: string[];
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  idempotencyKey?: (context: SagaContext) => string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface SagaInstance {
  id: string;
  sagaId: string;
  buildId: string;
  status: SagaStatus;
  currentStepId: string | null;
  completedSteps: string[];
  failedSteps: string[];
  compensatedSteps: string[];
  context: SagaContext;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  version: number;
}

export interface SagaContext {
  buildId: string;
  inputs: Record<string, unknown>;
  outputs: Map<string, unknown>;
  errors: Map<string, Error>;
  metadata: Record<string, unknown>;
}

export interface StepExecution {
  stepId: string;
  sagaInstanceId: string;
  status: StepStatus;
  attempt: number;
  startedAt: Date;
  completedAt: Date | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  compensationOutput: Record<string, unknown> | null;
  idempotencyKey: string;
}

// ============================================================================
// DISTRIBUTED LOCK
// ============================================================================

export interface DistributedLock {
  key: string;
  owner: string;
  expiresAt: Date;
  version: number;
}

export class DistributedLockManager {
  private supabase: SupabaseClient;
  private ownerId: string;
  private renewalIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.ownerId = `lock-owner-${process.pid}-${Date.now()}`;
  }

  /**
   * Acquire a distributed lock with automatic renewal
   */
  async acquire(
    key: string,
    ttlMs: number = 30000,
    waitTimeoutMs: number = 10000
  ): Promise<boolean> {
    const startTime = Date.now();
    const expiresAt = new Date(Date.now() + ttlMs);

    while (Date.now() - startTime < waitTimeoutMs) {
      // Try to acquire
      const { data, error } = await this.supabase.rpc('acquire_distributed_lock', {
        p_key: key,
        p_owner: this.ownerId,
        p_expires_at: expiresAt.toISOString(),
      });

      if (!error && data?.acquired) {
        // Start renewal
        this.startRenewal(key, ttlMs);
        return true;
      }

      // Check if existing lock expired
      const { data: existing } = await this.supabase
        .from('distributed_locks')
        .select('*')
        .eq('key', key)
        .single();

      if (existing && new Date(existing.expires_at) < new Date()) {
        // Lock expired, try to take over
        await this.supabase
          .from('distributed_locks')
          .delete()
          .eq('key', key)
          .lt('expires_at', new Date().toISOString());
        continue;
      }

      // Wait and retry
      await this.sleep(100);
    }

    return false;
  }

  /**
   * Release a lock
   */
  async release(key: string): Promise<boolean> {
    // Stop renewal
    const interval = this.renewalIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.renewalIntervals.delete(key);
    }

    const { error } = await this.supabase
      .from('distributed_locks')
      .delete()
      .eq('key', key)
      .eq('owner', this.ownerId);

    return !error;
  }

  /**
   * Extend lock TTL
   */
  async extend(key: string, ttlMs: number): Promise<boolean> {
    const newExpiry = new Date(Date.now() + ttlMs);

    const { data, error } = await this.supabase
      .from('distributed_locks')
      .update({ expires_at: newExpiry.toISOString(), version: undefined })
      .eq('key', key)
      .eq('owner', this.ownerId)
      .select()
      .single();

    return !error && !!data;
  }

  private startRenewal(key: string, ttlMs: number): void {
    const interval = setInterval(async () => {
      const success = await this.extend(key, ttlMs);
      if (!success) {
        clearInterval(interval);
        this.renewalIntervals.delete(key);
      }
    }, ttlMs / 2);

    this.renewalIntervals.set(key, interval);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// IDEMPOTENCY STORE
// ============================================================================

export class IdempotencyStore {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check if operation was already executed
   */
  async check(key: string): Promise<{ executed: boolean; result?: unknown }> {
    const { data, error } = await this.supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', key)
      .single();

    if (error || !data) {
      return { executed: false };
    }

    return {
      executed: true,
      result: data.result,
    };
  }

  /**
   * Record operation result
   */
  async record(key: string, result: unknown): Promise<void> {
    await this.supabase.from('idempotency_keys').upsert({
      key,
      result,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Execute with idempotency guarantee
   */
  async executeOnce<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Check if already executed
    const existing = await this.check(key);
    if (existing.executed) {
      return existing.result as T;
    }

    // Execute
    const result = await operation();

    // Record
    await this.record(key, result);

    return result;
  }
}

// ============================================================================
// SAGA ORCHESTRATOR
// ============================================================================

export class SagaOrchestrator extends EventEmitter {
  private supabase: SupabaseClient;
  private eventStore: EventStore;
  private lockManager: DistributedLockManager;
  private idempotencyStore: IdempotencyStore;
  private definitions: Map<string, SagaDefinition> = new Map();
  private executionHandlers: Map<
    string,
    (step: SagaStep, context: SagaContext) => Promise<unknown>
  > = new Map();

  constructor(eventStore: EventStore) {
    super();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(url, key);
    this.eventStore = eventStore;
    this.lockManager = new DistributedLockManager(this.supabase);
    this.idempotencyStore = new IdempotencyStore(this.supabase);
  }

  /**
   * Register a saga definition
   */
  registerSaga(definition: SagaDefinition): void {
    this.definitions.set(definition.id, definition);
    this.emit('saga_registered', definition);
  }

  /**
   * Register an execution handler for a step type
   */
  registerHandler(
    stepType: string,
    handler: (step: SagaStep, context: SagaContext) => Promise<unknown>
  ): void {
    this.executionHandlers.set(stepType, handler);
  }

  /**
   * Start a new saga instance
   */
  async startSaga(
    sagaId: string,
    buildId: string,
    inputs: Record<string, unknown>
  ): Promise<SagaInstance> {
    const definition = this.definitions.get(sagaId);
    if (!definition) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    const instance: SagaInstance = {
      id: uuidv4(),
      sagaId,
      buildId,
      status: 'pending',
      currentStepId: null,
      completedSteps: [],
      failedSteps: [],
      compensatedSteps: [],
      context: {
        buildId,
        inputs,
        outputs: new Map(),
        errors: new Map(),
        metadata: {},
      },
      startedAt: new Date(),
      completedAt: null,
      error: null,
      version: 1,
    };

    // Persist instance
    await this.persistInstance(instance);

    // Emit event
    await this.eventStore.append(buildId, 'BUILD_STARTED', {
      sagaId,
      instanceId: instance.id,
    });

    this.emit('saga_started', instance);

    // Start execution
    this.executeAsync(instance, definition);

    return instance;
  }

  /**
   * Resume a paused/failed saga
   */
  async resumeSaga(instanceId: string): Promise<SagaInstance | null> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return null;

    const definition = this.definitions.get(instance.sagaId);
    if (!definition) return null;

    if (instance.status !== 'failed' && instance.status !== 'pending') {
      throw new Error(`Cannot resume saga in ${instance.status} status`);
    }

    instance.status = 'running';
    await this.persistInstance(instance);

    this.executeAsync(instance, definition);

    return instance;
  }

  /**
   * Cancel a running saga (triggers compensation)
   */
  async cancelSaga(instanceId: string, reason: string): Promise<void> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return;

    const definition = this.definitions.get(instance.sagaId);
    if (!definition) return;

    instance.status = 'compensating';
    instance.error = reason;
    await this.persistInstance(instance);

    await this.compensate(instance, definition);
  }

  /**
   * Get saga instance status
   */
  async getInstance(instanceId: string): Promise<SagaInstance | null> {
    const { data, error } = await this.supabase
      .from('saga_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error || !data) return null;

    return this.mapInstanceFromDb(data);
  }

  // =========================================================================
  // EXECUTION ENGINE
  // =========================================================================

  private async executeAsync(instance: SagaInstance, definition: SagaDefinition): Promise<void> {
    try {
      instance.status = 'running';
      await this.persistInstance(instance);

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Saga timeout')), definition.timeoutMs);
      });

      await Promise.race([this.executeSteps(instance, definition), timeoutPromise]);

      instance.status = 'completed';
      instance.completedAt = new Date();
      await this.persistInstance(instance);

      await this.eventStore.append(instance.buildId, 'BUILD_COMPLETED', {
        sagaId: instance.sagaId,
        instanceId: instance.id,
        duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
      });

      this.emit('saga_completed', instance);
    } catch (error) {
      instance.status = 'failed';
      instance.error = (error as Error).message;
      await this.persistInstance(instance);

      await this.eventStore.append(instance.buildId, 'BUILD_FAILED', {
        sagaId: instance.sagaId,
        instanceId: instance.id,
        error: (error as Error).message,
      });

      // Trigger compensation
      await this.compensate(instance, definition);

      this.emit('saga_failed', { instance, error });
    }
  }

  private async executeSteps(instance: SagaInstance, definition: SagaDefinition): Promise<void> {
    const executionOrder = this.buildExecutionOrder(definition);

    for (const stepId of executionOrder) {
      if (instance.completedSteps.includes(stepId)) continue;

      const step = definition.steps.find(s => s.id === stepId);
      if (!step) continue;

      // Check dependencies
      const depsComplete = step.dependencies.every(dep => instance.completedSteps.includes(dep));
      if (!depsComplete) continue;

      // Handle different step types
      switch (step.type) {
        case 'action':
          await this.executeActionStep(instance, definition, step);
          break;

        case 'parallel':
          await this.executeParallelSteps(instance, definition, step);
          break;

        case 'conditional':
          await this.executeConditionalStep(instance, definition, step);
          break;

        case 'barrier':
          await this.executeBarrierStep(instance, definition, step);
          break;
      }

      instance.completedSteps.push(stepId);
      instance.currentStepId = stepId;
      await this.persistInstance(instance);
    }
  }

  private async executeActionStep(
    instance: SagaInstance,
    definition: SagaDefinition,
    step: SagaStep
  ): Promise<void> {
    // Acquire lock for this step
    const lockKey = `saga:${instance.id}:step:${step.id}`;
    const acquired = await this.lockManager.acquire(lockKey);
    if (!acquired) {
      throw new Error(`Failed to acquire lock for step ${step.id}`);
    }

    try {
      // Generate idempotency key
      const idempotencyKey = step.idempotencyKey
        ? step.idempotencyKey(instance.context)
        : `${instance.id}:${step.id}`;

      // Execute with idempotency
      const result = await this.idempotencyStore.executeOnce(idempotencyKey, async () => {
        // Get handler
        const handler = this.executionHandlers.get(step.agentId || step.type);
        if (!handler) {
          throw new Error(`No handler for step type ${step.agentId || step.type}`);
        }

        // Execute with retry
        return await this.executeWithRetry(
          () => handler(step, instance.context),
          step.retryPolicy || definition.retryPolicy
        );
      });

      // Store output
      instance.context.outputs.set(step.id, result);

      await this.eventStore.append(instance.buildId, 'AGENT_COMPLETED', {
        stepId: step.id,
        agentId: step.agentId,
        output: result,
      });
    } finally {
      await this.lockManager.release(lockKey);
    }
  }

  private async executeParallelSteps(
    instance: SagaInstance,
    definition: SagaDefinition,
    step: SagaStep
  ): Promise<void> {
    if (!step.parallelSteps || step.parallelSteps.length === 0) return;

    const parallelPromises = step.parallelSteps.map(async parallelStepId => {
      const parallelStep = definition.steps.find(s => s.id === parallelStepId);
      if (!parallelStep) return;

      if (parallelStep.type === 'action') {
        await this.executeActionStep(instance, definition, parallelStep);
      }

      instance.completedSteps.push(parallelStepId);
    });

    await Promise.all(parallelPromises);
  }

  private async executeConditionalStep(
    instance: SagaInstance,
    definition: SagaDefinition,
    step: SagaStep
  ): Promise<void> {
    if (!step.condition) {
      throw new Error(`Conditional step ${step.id} missing condition`);
    }

    const shouldExecute = step.condition(instance.context);
    if (!shouldExecute) {
      // Skip step and mark as skipped
      await this.eventStore.append(instance.buildId, 'AGENT_SKIPPED', {
        stepId: step.id,
        reason: 'condition_not_met',
      });
      return;
    }

    // Execute as action if condition met
    if (step.agentId) {
      await this.executeActionStep(instance, definition, step);
    }
  }

  private async executeBarrierStep(
    instance: SagaInstance,
    definition: SagaDefinition,
    step: SagaStep
  ): Promise<void> {
    if (!step.barrierSteps || step.barrierSteps.length === 0) return;

    // Wait for all barrier steps to complete
    const timeout = step.timeoutMs || 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const allComplete = step.barrierSteps.every(s => instance.completedSteps.includes(s));

      if (allComplete) {
        return;
      }

      // Refresh instance state
      const updated = await this.getInstance(instance.id);
      if (updated) {
        instance.completedSteps = updated.completedSteps;
      }

      await this.sleep(1000);
    }

    throw new Error(`Barrier timeout waiting for steps: ${step.barrierSteps.join(', ')}`);
  }

  // =========================================================================
  // COMPENSATION (ROLLBACK)
  // =========================================================================

  private async compensate(instance: SagaInstance, definition: SagaDefinition): Promise<void> {
    instance.status = 'compensating';
    await this.persistInstance(instance);

    // Get steps to compensate based on strategy
    let stepsToCompensate: string[] = [];

    switch (definition.compensationStrategy) {
      case 'backward':
        // Compensate in reverse order
        stepsToCompensate = [...instance.completedSteps].reverse();
        break;

      case 'forward':
        // Compensate only failed steps
        stepsToCompensate = instance.failedSteps;
        break;

      case 'selective':
        // Compensate steps that have compensation defined
        stepsToCompensate = instance.completedSteps
          .filter(stepId => {
            const step = definition.steps.find(s => s.id === stepId);
            return step?.compensationStepId;
          })
          .reverse();
        break;
    }

    for (const stepId of stepsToCompensate) {
      const step = definition.steps.find(s => s.id === stepId);
      if (!step?.compensationStepId) continue;

      const compensationStep = definition.steps.find(s => s.id === step.compensationStepId);
      if (!compensationStep) continue;

      try {
        await this.executeActionStep(instance, definition, compensationStep);
        instance.compensatedSteps.push(stepId);
      } catch (error) {
        // Log compensation failure but continue
        this.emit('compensation_failed', {
          instance,
          stepId,
          error,
        });
      }
    }

    await this.persistInstance(instance);
    this.emit('saga_compensated', instance);
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private buildExecutionOrder(definition: SagaDefinition): string[] {
    // Topological sort based on dependencies
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const step = definition.steps.find(s => s.id === stepId);
      if (!step) return;

      for (const dep of step.dependencies) {
        visit(dep);
      }

      order.push(stepId);
    };

    for (const step of definition.steps) {
      visit(step.id);
    }

    return order;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
    let lastError: Error | null = null;
    let backoff = policy.backoffMs;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < policy.maxAttempts) {
          await this.sleep(backoff);
          backoff = Math.min(backoff * policy.backoffMultiplier, policy.maxBackoffMs);
        }
      }
    }

    throw lastError;
  }

  private async persistInstance(instance: SagaInstance): Promise<void> {
    await this.supabase.from('saga_instances').upsert({
      id: instance.id,
      saga_id: instance.sagaId,
      build_id: instance.buildId,
      status: instance.status,
      current_step_id: instance.currentStepId,
      completed_steps: instance.completedSteps,
      failed_steps: instance.failedSteps,
      compensated_steps: instance.compensatedSteps,
      context: {
        buildId: instance.context.buildId,
        inputs: instance.context.inputs,
        outputs: Object.fromEntries(instance.context.outputs),
        errors: Object.fromEntries(
          Array.from(instance.context.errors.entries()).map(([k, v]) => [k, v.message])
        ),
        metadata: instance.context.metadata,
      },
      started_at: instance.startedAt.toISOString(),
      completed_at: instance.completedAt?.toISOString() || null,
      error: instance.error,
      version: instance.version + 1,
    });
  }

  private mapInstanceFromDb(data: Record<string, unknown>): SagaInstance {
    const context = data.context as Record<string, unknown>;

    return {
      id: data.id as string,
      sagaId: data.saga_id as string,
      buildId: data.build_id as string,
      status: data.status as SagaStatus,
      currentStepId: data.current_step_id as string | null,
      completedSteps: data.completed_steps as string[],
      failedSteps: data.failed_steps as string[],
      compensatedSteps: data.compensated_steps as string[],
      context: {
        buildId: context.buildId as string,
        inputs: context.inputs as Record<string, unknown>,
        outputs: new Map(Object.entries(context.outputs as Record<string, unknown>)),
        errors: new Map(
          Object.entries(context.errors as Record<string, string>).map(([k, v]) => [
            k,
            new Error(v),
          ])
        ),
        metadata: context.metadata as Record<string, unknown>,
      },
      startedAt: new Date(data.started_at as string),
      completedAt: data.completed_at ? new Date(data.completed_at as string) : null,
      error: data.error as string | null,
      version: data.version as number,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SAGA BUILDER - Fluent API for defining sagas
// ============================================================================

export class SagaBuilder {
  private definition: Partial<SagaDefinition>;
  private steps: SagaStep[] = [];

  constructor(id: string, name: string) {
    this.definition = {
      id,
      name,
      version: 1,
      compensationStrategy: 'backward',
      timeoutMs: 600000, // 10 minutes
      retryPolicy: {
        maxAttempts: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        maxBackoffMs: 30000,
      },
      metadata: {},
    };
  }

  step(id: string): StepBuilder {
    return new StepBuilder(this, id);
  }

  withTimeout(ms: number): SagaBuilder {
    this.definition.timeoutMs = ms;
    return this;
  }

  withRetryPolicy(policy: Partial<RetryPolicy>): SagaBuilder {
    this.definition.retryPolicy = {
      ...this.definition.retryPolicy!,
      ...policy,
    };
    return this;
  }

  withCompensationStrategy(strategy: 'backward' | 'forward' | 'selective'): SagaBuilder {
    this.definition.compensationStrategy = strategy;
    return this;
  }

  addStep(step: SagaStep): void {
    this.steps.push(step);
  }

  build(): SagaDefinition {
    return {
      ...this.definition,
      steps: this.steps,
    } as SagaDefinition;
  }
}

export class StepBuilder {
  private sagaBuilder: SagaBuilder;
  private step: Partial<SagaStep>;

  constructor(sagaBuilder: SagaBuilder, id: string) {
    this.sagaBuilder = sagaBuilder;
    this.step = {
      id,
      name: id,
      type: 'action',
      dependencies: [],
    };
  }

  named(name: string): StepBuilder {
    this.step.name = name;
    return this;
  }

  withAgent(agentId: string): StepBuilder {
    this.step.agentId = agentId;
    return this;
  }

  dependsOn(...stepIds: string[]): StepBuilder {
    this.step.dependencies = stepIds;
    return this;
  }

  withCompensation(compensationStepId: string): StepBuilder {
    this.step.compensationStepId = compensationStepId;
    return this;
  }

  conditional(condition: (context: SagaContext) => boolean): StepBuilder {
    this.step.type = 'conditional';
    this.step.condition = condition;
    return this;
  }

  parallel(...stepIds: string[]): StepBuilder {
    this.step.type = 'parallel';
    this.step.parallelSteps = stepIds;
    return this;
  }

  barrier(...stepIds: string[]): StepBuilder {
    this.step.type = 'barrier';
    this.step.barrierSteps = stepIds;
    return this;
  }

  withTimeout(ms: number): StepBuilder {
    this.step.timeoutMs = ms;
    return this;
  }

  withIdempotencyKey(keyFn: (context: SagaContext) => string): StepBuilder {
    this.step.idempotencyKey = keyFn;
    return this;
  }

  add(): SagaBuilder {
    this.sagaBuilder.addStep(this.step as SagaStep);
    return this.sagaBuilder;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSagaOrchestrator(eventStore: EventStore): SagaOrchestrator {
  return new SagaOrchestrator(eventStore);
}

export function defineSaga(id: string, name: string): SagaBuilder {
  return new SagaBuilder(id, name);
}

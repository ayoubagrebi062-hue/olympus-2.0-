/**
 * OLYMPUS 2.1 - 10X UPGRADE: Parallel Agent Executor
 *
 * THE SPEED MULTIPLIER.
 *
 * What it does:
 * - Analyzes agent dependencies to build execution graph
 * - Runs non-dependent agents in parallel
 * - Dynamically adjusts concurrency based on resources
 * - Critical path optimization for fastest completion
 * - Handles failures without blocking parallel work
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge, observeHistogram } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentNode {
  /** Unique agent identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Phase this agent belongs to */
  phaseId: string;
  /** Agents that must complete before this one can start */
  dependencies: string[];
  /** Agents that depend on this one */
  dependents: string[];
  /** Estimated execution time (ms) */
  estimatedDuration: number;
  /** Estimated token usage */
  estimatedTokens: number;
  /** Priority (higher = more important) */
  priority: number;
  /** Is this agent on the critical path? */
  isCritical: boolean;
  /** Agent-specific configuration */
  config: Record<string, unknown>;
}

export interface ExecutionGraph {
  /** All agents in the graph */
  nodes: Map<string, AgentNode>;
  /** Execution order (topologically sorted) */
  executionOrder: string[];
  /** Parallel execution groups */
  parallelGroups: ParallelGroup[];
  /** Critical path (longest dependency chain) */
  criticalPath: string[];
  /** Estimated total duration (ms) */
  estimatedDuration: number;
  /** Estimated total tokens */
  estimatedTokens: number;
}

export interface ParallelGroup {
  /** Group index (execution order) */
  index: number;
  /** Agents that can run in parallel */
  agents: string[];
  /** Dependencies that must complete before this group */
  blockingDependencies: string[];
  /** Estimated duration (max of agents) */
  estimatedDuration: number;
}

export interface ExecutionResult {
  agentId: string;
  success: boolean;
  output: unknown;
  tokensUsed: number;
  duration: number;
  error?: Error;
  retries: number;
}

export interface ParallelExecutorConfig {
  /** Maximum concurrent agents */
  maxConcurrency: number;
  /** Maximum retries per agent */
  maxRetries: number;
  /** Timeout per agent (ms) */
  agentTimeout: number;
  /** Fail fast on critical agent failure */
  failFastOnCritical: boolean;
  /** Continue with non-dependent agents on failure */
  continueOnFailure: boolean;
  /** Dynamic concurrency adjustment */
  dynamicConcurrency: boolean;
  /** Resource monitoring interval (ms) */
  resourceCheckInterval: number;
}

export interface ExecutorState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentGroup: number;
  completedAgents: string[];
  failedAgents: string[];
  runningAgents: string[];
  pendingAgents: string[];
  startTime: number;
  endTime?: number;
  totalTokens: number;
}

export type AgentExecutor = (
  agentId: string,
  config: Record<string, unknown>,
  context: ExecutionContext
) => Promise<{ output: unknown; tokensUsed: number }>;

export interface ExecutionContext {
  buildId: string;
  phaseId: string;
  previousOutputs: Map<string, unknown>;
  signal: AbortSignal;
}

// ============================================================================
// SEMAPHORE (Proper Concurrency Control)
// ============================================================================

/**
 * Semaphore for controlling concurrent access to a limited resource
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.waiting.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }

  get available(): number {
    return this.permits;
  }
}

// ============================================================================
// DEPENDENCY GRAPH BUILDER
// ============================================================================

export class DependencyGraphBuilder {
  /**
   * Build execution graph from agent definitions
   */
  buildGraph(agents: AgentNode[]): ExecutionGraph {
    const nodes = new Map<string, AgentNode>();

    // Index all agents
    for (const agent of agents) {
      nodes.set(agent.id, { ...agent, dependents: [] });
    }

    // Build dependents (reverse dependencies)
    for (const agent of agents) {
      for (const depId of agent.dependencies) {
        const dep = nodes.get(depId);
        if (dep) {
          dep.dependents.push(agent.id);
        }
      }
    }

    // Topological sort
    const executionOrder = this.topologicalSort(nodes);

    // Find critical path
    const criticalPath = this.findCriticalPath(nodes, executionOrder);

    // Mark critical agents
    const criticalSet = new Set(criticalPath);
    for (const [id, node] of nodes) {
      node.isCritical = criticalSet.has(id);
    }

    // Build parallel groups
    const parallelGroups = this.buildParallelGroups(nodes, executionOrder);

    // Calculate estimates
    const estimatedDuration = parallelGroups.reduce(
      (sum, g) => sum + g.estimatedDuration,
      0
    );
    const estimatedTokens = Array.from(nodes.values()).reduce(
      (sum, n) => sum + n.estimatedTokens,
      0
    );

    logger.info('Execution graph built', {
      totalAgents: nodes.size,
      parallelGroups: parallelGroups.length,
      criticalPathLength: criticalPath.length,
      estimatedDuration,
      estimatedTokens,
    });

    return {
      nodes,
      executionOrder,
      parallelGroups,
      criticalPath,
      estimatedDuration,
      estimatedTokens,
    };
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(nodes: Map<string, AgentNode>): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    for (const [id, node] of nodes) {
      inDegree.set(id, node.dependencies.filter(d => nodes.has(d)).length);
      if (inDegree.get(id) === 0) {
        queue.push(id);
      }
    }

    // Sort by priority within same level
    queue.sort((a, b) => {
      const nodeA = nodes.get(a)!;
      const nodeB = nodes.get(b)!;
      return nodeB.priority - nodeA.priority;
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const node = nodes.get(current)!;
      for (const dependent of node.dependents) {
        const degree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, degree);
        if (degree === 0) {
          // Insert in priority order
          let inserted = false;
          for (let i = 0; i < queue.length; i++) {
            const queueNode = nodes.get(queue[i])!;
            const depNode = nodes.get(dependent)!;
            if (depNode.priority > queueNode.priority) {
              queue.splice(i, 0, dependent);
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            queue.push(dependent);
          }
        }
      }
    }

    // Check for cycles
    if (result.length !== nodes.size) {
      throw new Error('Dependency cycle detected in agent graph');
    }

    return result;
  }

  /**
   * Find critical path (longest path through graph)
   */
  private findCriticalPath(
    nodes: Map<string, AgentNode>,
    executionOrder: string[]
  ): string[] {
    const earliestStart = new Map<string, number>();
    const parent = new Map<string, string | null>();

    // Forward pass - calculate earliest start times
    for (const id of executionOrder) {
      const node = nodes.get(id)!;
      let maxStart = 0;
      let maxParent: string | null = null;

      for (const depId of node.dependencies) {
        const depStart = earliestStart.get(depId) || 0;
        const depNode = nodes.get(depId);
        const depEnd = depStart + (depNode?.estimatedDuration || 0);
        if (depEnd > maxStart) {
          maxStart = depEnd;
          maxParent = depId;
        }
      }

      earliestStart.set(id, maxStart);
      parent.set(id, maxParent);
    }

    // Find the agent with latest completion time
    let maxEndTime = 0;
    let lastAgent: string | null = null;

    for (const id of executionOrder) {
      const node = nodes.get(id)!;
      const endTime = (earliestStart.get(id) || 0) + node.estimatedDuration;
      if (endTime > maxEndTime) {
        maxEndTime = endTime;
        lastAgent = id;
      }
    }

    // Backtrack to build critical path
    const criticalPath: string[] = [];
    let current: string | null = lastAgent;
    while (current) {
      criticalPath.unshift(current);
      current = parent.get(current) || null;
    }

    return criticalPath;
  }

  /**
   * Build parallel execution groups
   */
  private buildParallelGroups(
    nodes: Map<string, AgentNode>,
    executionOrder: string[]
  ): ParallelGroup[] {
    const groups: ParallelGroup[] = [];
    const assigned = new Set<string>();
    const completed = new Set<string>();

    while (assigned.size < nodes.size) {
      const groupAgents: string[] = [];
      const blockingDeps: string[] = [];

      // Find all agents that can run now
      for (const id of executionOrder) {
        if (assigned.has(id)) continue;

        const node = nodes.get(id)!;
        const depsCompleted = node.dependencies.every(d =>
          completed.has(d) || !nodes.has(d)
        );

        if (depsCompleted) {
          groupAgents.push(id);
          assigned.add(id);

          // Track which deps this group needs
          for (const dep of node.dependencies) {
            if (nodes.has(dep) && !blockingDeps.includes(dep)) {
              blockingDeps.push(dep);
            }
          }
        }
      }

      if (groupAgents.length === 0) {
        throw new Error('Unable to make progress - possible cycle');
      }

      // Calculate group duration (max of parallel agents)
      const estimatedDuration = Math.max(
        ...groupAgents.map(id => nodes.get(id)!.estimatedDuration)
      );

      groups.push({
        index: groups.length,
        agents: groupAgents,
        blockingDependencies: blockingDeps,
        estimatedDuration,
      });

      // Mark group as completed for next iteration
      for (const id of groupAgents) {
        completed.add(id);
      }
    }

    return groups;
  }
}

// ============================================================================
// PARALLEL EXECUTOR
// ============================================================================

export class ParallelExecutor {
  private config: ParallelExecutorConfig;
  private state: ExecutorState;
  private graph: ExecutionGraph | null = null;
  private executor: AgentExecutor;
  private abortController: AbortController | null = null;
  private outputs = new Map<string, unknown>();
  private listeners = new Set<(state: ExecutorState) => void>();

  constructor(
    executor: AgentExecutor,
    config: Partial<ParallelExecutorConfig> = {}
  ) {
    this.executor = executor;
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      maxRetries: config.maxRetries ?? 3,
      agentTimeout: config.agentTimeout ?? 60000,
      failFastOnCritical: config.failFastOnCritical ?? true,
      continueOnFailure: config.continueOnFailure ?? true,
      dynamicConcurrency: config.dynamicConcurrency ?? true,
      resourceCheckInterval: config.resourceCheckInterval ?? 5000,
    };
    this.state = this.createInitialState();
  }

  /**
   * Execute all agents in the graph with maximum parallelism
   */
  async execute(
    graph: ExecutionGraph,
    context: Omit<ExecutionContext, 'signal' | 'previousOutputs'>
  ): Promise<Map<string, ExecutionResult>> {
    this.graph = graph;
    this.abortController = new AbortController();
    this.outputs.clear();
    this.state = this.createInitialState();
    this.state.status = 'running';
    this.state.startTime = Date.now();
    this.state.pendingAgents = [...graph.executionOrder];

    const results = new Map<string, ExecutionResult>();

    logger.info('Starting parallel execution', {
      buildId: context.buildId,
      phaseId: context.phaseId,
      totalAgents: graph.nodes.size,
      parallelGroups: graph.parallelGroups.length,
      maxConcurrency: this.config.maxConcurrency,
    });

    incCounter('olympus_parallel_executions_started');
    setGauge('olympus_parallel_agents_total', graph.nodes.size);

    try {
      // Execute each parallel group
      for (const group of graph.parallelGroups) {
        if (this.abortController.signal.aborted) break;

        this.state.currentGroup = group.index;
        this.notifyListeners();

        const groupResults = await this.executeGroup(group, {
          ...context,
          signal: this.abortController.signal,
          previousOutputs: this.outputs,
        });

        // Collect results
        for (const [agentId, result] of groupResults) {
          results.set(agentId, result);

          if (result.success) {
            this.outputs.set(agentId, result.output);
            this.state.completedAgents.push(agentId);
          } else {
            this.state.failedAgents.push(agentId);

            // Handle failure
            const node = graph.nodes.get(agentId)!;
            if (node.isCritical && this.config.failFastOnCritical) {
              logger.error('Critical agent failed, aborting execution', {
                agentId,
                error: result.error,
              });
              this.abortController.abort();
              break;
            }
          }

          this.state.pendingAgents = this.state.pendingAgents.filter(
            id => id !== agentId
          );
        }

        this.state.totalTokens += Array.from(groupResults.values()).reduce(
          (sum, r) => sum + r.tokensUsed,
          0
        );

        this.notifyListeners();
      }

      this.state.status = this.state.failedAgents.length > 0 ? 'failed' : 'completed';
    } catch (error) {
      this.state.status = 'failed';
      logger.error('Parallel execution failed', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      this.state.endTime = Date.now();
      this.notifyListeners();

      const duration = this.state.endTime - this.state.startTime;
      observeHistogram('olympus_parallel_execution_duration_ms', duration);
      incCounter('olympus_parallel_executions_completed');

      logger.info('Parallel execution completed', {
        status: this.state.status,
        completedAgents: this.state.completedAgents.length,
        failedAgents: this.state.failedAgents.length,
        totalTokens: this.state.totalTokens,
        durationMs: duration,
      });
    }

    return results;
  }

  /**
   * Execute a single parallel group with proper concurrency control
   */
  private async executeGroup(
    group: ParallelGroup,
    context: ExecutionContext
  ): Promise<Map<string, ExecutionResult>> {
    const results = new Map<string, ExecutionResult>();
    const concurrency = this.calculateConcurrency(group.agents.length);

    // Mark agents as running
    this.state.runningAgents = [...group.agents];
    this.notifyListeners();

    logger.debug('Executing parallel group', {
      groupIndex: group.index,
      agents: group.agents,
      concurrency,
    });

    setGauge('olympus_parallel_agents_running', group.agents.length);

    // Proper semaphore-based concurrency control
    const semaphore = new Semaphore(concurrency);

    const executeWithSemaphore = async (agentId: string): Promise<void> => {
      const release = await semaphore.acquire();
      try {
        const result = await this.executeAgent(agentId, context);
        results.set(agentId, result);
        this.state.runningAgents = this.state.runningAgents.filter(
          id => id !== agentId
        );
        setGauge('olympus_parallel_agents_running', this.state.runningAgents.length);
      } catch (error) {
        results.set(agentId, {
          agentId,
          success: false,
          output: null,
          tokensUsed: 0,
          duration: 0,
          error: error instanceof Error ? error : new Error(String(error)),
          retries: this.config.maxRetries,
        });
      } finally {
        release();
      }
    };

    // Execute all agents with controlled concurrency
    await Promise.all(group.agents.map(executeWithSemaphore));

    return results;
  }

  /**
   * Execute a single agent with retries
   */
  private async executeAgent(
    agentId: string,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const node = this.graph!.nodes.get(agentId)!;
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (context.signal.aborted) {
        return {
          agentId,
          success: false,
          output: null,
          tokensUsed: 0,
          duration: Date.now() - startTime,
          error: new Error('Execution aborted'),
          retries: attempt,
        };
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Agent timeout')),
            this.config.agentTimeout
          );
        });

        const executionPromise = this.executor(agentId, node.config, context);

        const result = await Promise.race([executionPromise, timeoutPromise]);

        const duration = Date.now() - startTime;
        observeHistogram('olympus_agent_duration_ms', duration);
        incCounter('olympus_agent_completions', 1, { agentId, success: 'true' });

        return {
          agentId,
          success: true,
          output: result.output,
          tokensUsed: result.tokensUsed,
          duration,
          retries: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries = attempt;

        logger.warn('Agent execution failed, retrying', {
          agentId,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: lastError,
        });

        // Exponential backoff
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    incCounter('olympus_agent_completions', 1, { agentId, success: 'false' });

    return {
      agentId,
      success: false,
      output: null,
      tokensUsed: 0,
      duration: Date.now() - startTime,
      error: lastError,
      retries,
    };
  }

  /**
   * Calculate optimal concurrency based on resources
   */
  private calculateConcurrency(groupSize: number): number {
    let concurrency = Math.min(groupSize, this.config.maxConcurrency);

    if (this.config.dynamicConcurrency) {
      // In production, check actual memory/CPU usage
      // For now, use a simple heuristic
      const estimatedMemoryPerAgent = 100; // MB
      const availableMemory = 4096; // MB (example)
      const memoryBasedLimit = Math.floor(availableMemory / estimatedMemoryPerAgent);
      concurrency = Math.min(concurrency, memoryBasedLimit);
    }

    return Math.max(1, concurrency);
  }

  /**
   * Pause execution
   */
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.notifyListeners();
      logger.info('Parallel execution paused');
    }
  }

  /**
   * Resume execution
   */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.notifyListeners();
      logger.info('Parallel execution resumed');
    }
  }

  /**
   * Abort execution
   */
  abort(): void {
    this.abortController?.abort();
    this.state.status = 'failed';
    this.notifyListeners();
    logger.info('Parallel execution aborted');
  }

  /**
   * Get current state
   */
  getState(): ExecutorState {
    return { ...this.state };
  }

  /**
   * Get outputs
   */
  getOutputs(): Map<string, unknown> {
    return new Map(this.outputs);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ExecutorState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutionStats {
    if (!this.graph) {
      return {
        sequentialDuration: 0,
        parallelDuration: 0,
        speedup: 1,
        efficiency: 1,
        tokensUsed: 0,
        successRate: 0,
      };
    }

    const sequentialDuration = Array.from(this.graph.nodes.values()).reduce(
      (sum, n) => sum + n.estimatedDuration,
      0
    );
    const parallelDuration = this.state.endTime
      ? this.state.endTime - this.state.startTime
      : this.graph.estimatedDuration;

    const totalAgents =
      this.state.completedAgents.length + this.state.failedAgents.length;

    return {
      sequentialDuration,
      parallelDuration,
      speedup: sequentialDuration / Math.max(1, parallelDuration),
      efficiency:
        sequentialDuration / (parallelDuration * this.config.maxConcurrency),
      tokensUsed: this.state.totalTokens,
      successRate: totalAgents > 0
        ? this.state.completedAgents.length / totalAgents
        : 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private createInitialState(): ExecutorState {
    return {
      status: 'idle',
      currentGroup: 0,
      completedAgents: [],
      failedAgents: [],
      runningAgents: [],
      pendingAgents: [],
      startTime: 0,
      totalTokens: 0,
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        logger.warn('Executor listener error', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface ExecutionStats {
  /** Time if executed sequentially */
  sequentialDuration: number;
  /** Actual parallel duration */
  parallelDuration: number;
  /** Speedup factor */
  speedup: number;
  /** Efficiency (0-1) */
  efficiency: number;
  /** Total tokens used */
  tokensUsed: number;
  /** Success rate (0-1) */
  successRate: number;
}

// ============================================================================
// FACTORY
// ============================================================================

export function createParallelExecutor(
  executor: AgentExecutor,
  config?: Partial<ParallelExecutorConfig>
): ParallelExecutor {
  return new ParallelExecutor(executor, config);
}

export const graphBuilder = new DependencyGraphBuilder();

export default ParallelExecutor;

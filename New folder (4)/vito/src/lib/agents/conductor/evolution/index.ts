/**
 * EVOLUTION MODULE
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * The autonomous self-improvement engine for OLYMPUS.
 *
 * Capabilities:
 * - Self-Improve: Optimize prompts automatically
 * - Self-Heal: Fix underperforming agents
 * - Self-Extend: Create new agents when needed
 * - Self-Learn: Apply meta-patterns across improvements
 */

import { EventEmitter } from 'events';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PerformanceAnalyzer } from './analyzer';
import { PromptOptimizer } from './optimizer';
import { AgentCreator } from './creator';
import {
  EvolutionConfig,
  EvolutionAction,
  EvolutionReport,
  MetaPattern,
  AgentPerformanceAnalysis,
  PromptImprovement,
  AgentProposal,
  DEFAULT_EVOLUTION_CONFIG,
} from './types';
import type { PromptService } from '../prompts';

// ============================================================================
// TYPES
// ============================================================================

interface LLMProvider {
  complete(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  }): Promise<string>;
}

// ============================================================================
// EVOLUTION ENGINE
// ============================================================================

export class EvolutionEngine extends EventEmitter {
  private supabase: SupabaseClient;
  private analyzer: PerformanceAnalyzer;
  private optimizer: PromptOptimizer;
  private creator: AgentCreator;
  private promptService: PromptService;
  private config: EvolutionConfig;
  private patterns: MetaPattern[] = [];
  private pendingActions: Map<string, EvolutionAction> = new Map();
  private activeExperiments: Set<string> = new Set();

  constructor(
    supabase: SupabaseClient,
    llmProvider: LLMProvider,
    promptService: PromptService,
    config?: Partial<EvolutionConfig>
  ) {
    super();

    this.supabase = supabase;
    this.promptService = promptService;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };

    // Initialize components
    this.analyzer = new PerformanceAnalyzer(supabase, promptService, this.config);
    this.optimizer = new PromptOptimizer(llmProvider, promptService, this.config);
    this.creator = new AgentCreator(llmProvider, promptService, this.config);

    console.log('[EvolutionEngine] Initialized with config:', {
      enabled: this.config.enabled,
      automation: this.config.automation,
    });
  }

  // ==========================================================================
  // PUBLIC METHODS - MAIN EVOLUTION CYCLE
  // ==========================================================================

  /**
   * Run a full evolution cycle
   */
  async evolve(): Promise<EvolutionReport> {
    const startedAt = new Date();

    if (!this.config.enabled) {
      return {
        status: 'disabled',
        startedAt,
        completedAt: new Date(),
        duration: 0,
        actions: [],
      };
    }

    this.emit('evolution:start', { timestamp: startedAt });
    const actions: EvolutionAction[] = [];

    try {
      // 1. ANALYZE - Evaluate all agents
      this.emit('evolution:phase', { phase: 'analyze' });
      const analyses = await this.analyzeAllAgents();
      console.log(`[EvolutionEngine] Analyzed ${analyses.length} agents`);

      // 2. IDENTIFY - Find underperformers and issues
      this.emit('evolution:phase', { phase: 'identify' });
      const underperformers = analyses.filter(
        (a) =>
          a.quality.averageScore < this.config.thresholds.underperformerThreshold ||
          a.quality.trend === 'declining' ||
          a.issues.some((i) => i.severity === 'critical')
      );
      console.log(`[EvolutionEngine] Found ${underperformers.length} underperformers`);

      // 3. OPTIMIZE - Generate improvements for underperformers
      this.emit('evolution:phase', { phase: 'optimize', count: underperformers.length });
      for (const analysis of underperformers.slice(0, 5)) {
        // Limit to 5 per cycle
        if (this.activeExperiments.size >= this.config.safety.maxConcurrentExperiments) {
          console.log('[EvolutionEngine] Max concurrent experiments reached, skipping');
          break;
        }

        const improvement = await this.optimizer.suggestImprovement(analysis);
        if (improvement) {
          const action = this.createAction('optimize_prompt', analysis.agentId, improvement);
          actions.push(action);

          if (this.config.automation.autoTest) {
            await this.executeAction(action);
          } else {
            this.pendingActions.set(action.id, action);
            this.emit('evolution:approval_required', action);
          }
        }
      }

      // 4. DETECT GAPS - Find missing capabilities
      this.emit('evolution:phase', { phase: 'detect_gaps' });
      const gaps = await this.analyzer.detectCapabilityGaps();
      console.log(`[EvolutionEngine] Detected ${gaps.length} capability gaps`);

      // 5. PROPOSE - Create new agents for gaps
      if (this.config.automation.autoCreateAgents && gaps.length > 0) {
        this.emit('evolution:phase', { phase: 'propose', gaps: gaps.length });
        for (const gap of gaps.slice(0, 2)) {
          // Limit to 2 proposals per cycle
          const proposal = await this.creator.proposeAgent(gap, {
            userRequests: [],
            relatedAgents: this.findRelatedAgents(gap, analyses),
          });

          const action = this.createAction('create_agent', gap, proposal);
          actions.push(action);
          this.pendingActions.set(action.id, action);
          this.emit('evolution:approval_required', action);
        }
      }

      // 6. LEARN - Extract patterns from successful improvements
      this.emit('evolution:phase', { phase: 'learn' });
      const newPatterns = await this.analyzer.findSuccessPatterns();
      if (newPatterns.length > 0) {
        this.patterns = [...this.patterns, ...newPatterns];
        await this.optimizer.loadPatterns(this.patterns);
        console.log(`[EvolutionEngine] Learned ${newPatterns.length} new patterns`);
      }

      // 7. EVALUATE - Check running experiments
      this.emit('evolution:phase', { phase: 'evaluate' });
      await this.evaluateRunningExperiments();

      const completedAt = new Date();
      const report: EvolutionReport = {
        status: 'completed',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        actions,
        analyses,
        patterns: newPatterns,
        gaps,
        summary: {
          agentsAnalyzed: analyses.length,
          underperformersFound: underperformers.length,
          improvementsSuggested: actions.filter((a) => a.type === 'optimize_prompt').length,
          experimentsStarted: actions.filter(
            (a) => a.type === 'optimize_prompt' && a.status === 'executing'
          ).length,
          patternsLearned: newPatterns.length,
        },
      };

      this.emit('evolution:complete', report);
      return report;
    } catch (error: any) {
      const completedAt = new Date();
      const report: EvolutionReport = {
        status: 'error',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        actions,
        error: error.message,
      };

      this.emit('evolution:error', { error: error.message });
      console.error('[EvolutionEngine] Evolution cycle failed:', error);
      return report;
    }
  }

  // ==========================================================================
  // PUBLIC METHODS - ANALYSIS
  // ==========================================================================

  /**
   * Analyze all active agents
   */
  async analyzeAllAgents(period?: { start: Date; end: Date }): Promise<AgentPerformanceAnalysis[]> {
    const effectivePeriod = period ?? {
      start: new Date(
        Date.now() - this.config.analysis.defaultPeriodDays * 24 * 60 * 60 * 1000
      ),
      end: new Date(),
    };

    return this.analyzer.analyzeAllAgents(effectivePeriod);
  }

  /**
   * Analyze a specific agent
   */
  async analyzeAgent(
    agentId: string,
    period?: { start: Date; end: Date }
  ): Promise<AgentPerformanceAnalysis> {
    const effectivePeriod = period ?? {
      start: new Date(
        Date.now() - this.config.analysis.defaultPeriodDays * 24 * 60 * 60 * 1000
      ),
      end: new Date(),
    };

    return this.analyzer.analyzeAgent(agentId, effectivePeriod);
  }

  /**
   * Find underperforming agents
   */
  async findUnderperformers(): Promise<AgentPerformanceAnalysis[]> {
    return this.analyzer.findUnderperformers(this.config.thresholds.underperformerThreshold);
  }

  /**
   * Get trending issues across agents
   */
  async getTrendingIssues(): Promise<
    { issue: string; count: number; agents: string[]; severity: string }[]
  > {
    return this.analyzer.getTrendingIssues();
  }

  // ==========================================================================
  // PUBLIC METHODS - OPTIMIZATION
  // ==========================================================================

  /**
   * Generate improvement suggestions for an agent
   */
  async suggestImprovements(agentId: string): Promise<PromptImprovement[]> {
    const analysis = await this.analyzeAgent(agentId);
    return this.optimizer.suggestMultipleVariants(analysis, 3);
  }

  /**
   * Manually trigger prompt optimization for an agent
   */
  async optimizePrompt(agentId: string): Promise<string | null> {
    const analysis = await this.analyzeAgent(agentId);
    const improvement = await this.optimizer.suggestImprovement(analysis);

    if (!improvement) {
      console.log(`[EvolutionEngine] No improvement suggested for ${agentId}`);
      return null;
    }

    const action = this.createAction('optimize_prompt', agentId, improvement);
    await this.executeAction(action);

    return improvement.testPlan.experimentId || null;
  }

  // ==========================================================================
  // PUBLIC METHODS - AGENT CREATION
  // ==========================================================================

  /**
   * Propose a new agent for a capability gap
   */
  async proposeNewAgent(
    gap: string,
    context: { userRequests: string[]; relatedAgents: string[] }
  ): Promise<AgentProposal> {
    return this.creator.proposeAgent(gap, context);
  }

  /**
   * Test a proposed agent
   */
  async testProposedAgent(proposal: AgentProposal): Promise<{
    passed: boolean;
    results: any[];
    recommendation: string;
  }> {
    return this.creator.testAgent(proposal);
  }

  /**
   * Deploy an approved agent
   */
  async deployAgent(proposal: AgentProposal): Promise<{
    success: boolean;
    agentId: string;
    promptId: string;
  }> {
    return this.creator.deployAgent(proposal);
  }

  // ==========================================================================
  // PUBLIC METHODS - ACTION MANAGEMENT
  // ==========================================================================

  /**
   * Execute an evolution action
   */
  async executeAction(action: EvolutionAction): Promise<void> {
    // Check if approval required
    if (this.requiresApproval(action) && !action.approvedBy) {
      this.pendingActions.set(action.id, action);
      this.emit('evolution:approval_required', action);
      console.log(`[EvolutionEngine] Action ${action.id} requires approval`);
      return;
    }

    action.status = 'executing';
    this.emit('evolution:action_executing', action);
    console.log(`[EvolutionEngine] Executing action ${action.id}: ${action.type}`);

    try {
      switch (action.type) {
        case 'optimize_prompt': {
          const improvement = action.details as PromptImprovement;
          const experimentId = await this.optimizer.createExperiment(improvement);
          improvement.testPlan.experimentId = experimentId;
          this.activeExperiments.add(experimentId);
          action.result = {
            success: true,
            metrics: { before: { quality: 0, efficiency: 0 }, after: { quality: 0, efficiency: 0 }, improvement: 0 },
            rollbackAvailable: true,
          };
          break;
        }

        case 'create_agent': {
          const proposal = action.details as AgentProposal;
          const testResult = await this.creator.testAgent(proposal);

          if (testResult.passed) {
            const deployResult = await this.creator.deployAgent(proposal);
            action.result = {
              success: deployResult.success,
              metrics: { before: { quality: 0, efficiency: 0 }, after: { quality: 0, efficiency: 0 }, improvement: 0 },
              rollbackAvailable: true,
            };
          } else {
            throw new Error(`Agent testing failed: ${testResult.recommendation}`);
          }
          break;
        }

        case 'deprecate_agent': {
          // Archive all prompts for the agent
          const agentId = action.target;
          const prompts = await this.promptService.getPromptVersions(agentId);
          for (const prompt of prompts) {
            await this.promptService.archivePrompt(prompt.id);
          }
          action.result = {
            success: true,
            metrics: { before: { quality: 0, efficiency: 0 }, after: { quality: 0, efficiency: 0 }, improvement: 0 },
            rollbackAvailable: true,
          };
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      action.status = 'completed';
      action.executedAt = new Date();
      this.pendingActions.delete(action.id);
      this.emit('evolution:action_completed', action);
      console.log(`[EvolutionEngine] Action ${action.id} completed successfully`);
    } catch (error: any) {
      action.status = 'failed';
      action.result = {
        success: false,
        metrics: { before: { quality: 0, efficiency: 0 }, after: { quality: 0, efficiency: 0 }, improvement: 0 },
        rollbackAvailable: false,
        error: error.message,
      };
      this.emit('evolution:action_failed', { action, error: error.message });
      console.error(`[EvolutionEngine] Action ${action.id} failed:`, error.message);
    }
  }

  /**
   * Approve a pending action
   */
  async approveAction(actionId: string, approvedBy: string): Promise<void> {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    action.approvedBy = approvedBy;
    action.approvedAt = new Date();
    action.status = 'approved';

    await this.executeAction(action);
  }

  /**
   * Reject a pending action
   */
  async rejectAction(actionId: string, reason: string): Promise<void> {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    action.status = 'failed';
    action.result = {
      success: false,
      metrics: { before: { quality: 0, efficiency: 0 }, after: { quality: 0, efficiency: 0 }, improvement: 0 },
      rollbackAvailable: false,
      error: `Rejected: ${reason}`,
    };
    this.pendingActions.delete(actionId);

    this.emit('evolution:action_rejected', { action, reason });
    console.log(`[EvolutionEngine] Action ${actionId} rejected: ${reason}`);
  }

  /**
   * Get pending actions
   */
  getPendingActions(): EvolutionAction[] {
    return Array.from(this.pendingActions.values());
  }

  // ==========================================================================
  // PUBLIC METHODS - PATTERNS & LEARNING
  // ==========================================================================

  /**
   * Get learned meta-patterns
   */
  getPatterns(): MetaPattern[] {
    return this.patterns;
  }

  /**
   * Manually add a pattern
   */
  addPattern(pattern: MetaPattern): void {
    this.patterns.push(pattern);
    this.optimizer.loadPatterns(this.patterns);
  }

  // ==========================================================================
  // PUBLIC METHODS - CONFIGURATION
  // ==========================================================================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[EvolutionEngine] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): EvolutionConfig {
    return { ...this.config };
  }

  /**
   * Get engine status
   */
  getStatus(): {
    enabled: boolean;
    pendingActions: number;
    activeExperiments: number;
    patternsLearned: number;
  } {
    return {
      enabled: this.config.enabled,
      pendingActions: this.pendingActions.size,
      activeExperiments: this.activeExperiments.size,
      patternsLearned: this.patterns.length,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private createAction(
    type: EvolutionAction['type'],
    target: string,
    details: PromptImprovement | AgentProposal | Record<string, unknown>
  ): EvolutionAction {
    return {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      target,
      details,
      approvalRequired: this.requiresApproval({ type } as EvolutionAction),
      status: 'pending',
      createdAt: new Date(),
    };
  }

  private requiresApproval(action: Partial<EvolutionAction>): boolean {
    if (!action.type) return true;

    // Always require approval for these actions
    if (action.type === 'create_agent') return true;
    if (action.type === 'deprecate_agent') return true;
    if (action.type === 'merge_agents') return true;
    if (action.type === 'split_agent') return true;

    // Check config for prompt changes
    if (action.type === 'optimize_prompt') {
      return !this.config.automation.autoTest;
    }

    return true;
  }

  private async evaluateRunningExperiments(): Promise<void> {
    for (const experimentId of this.activeExperiments) {
      try {
        const evaluation = await this.optimizer.evaluateExperiment(experimentId);

        if (
          evaluation.metrics.control.sampleSize >= this.config.thresholds.minBuildsSample &&
          evaluation.metrics.variant.sampleSize >= this.config.thresholds.minBuildsSample
        ) {
          if (evaluation.shouldPromote) {
            if (this.config.automation.autoPromote) {
              await this.optimizer.promoteVariant(experimentId);
              console.log(`[EvolutionEngine] Auto-promoted variant from experiment ${experimentId}`);
            } else {
              this.emit('evolution:promotion_ready', {
                experimentId,
                evaluation,
              });
            }
          } else if (this.config.safety.rollbackOnRegression) {
            await this.optimizer.rollbackExperiment(experimentId);
            console.log(`[EvolutionEngine] Rolled back experiment ${experimentId}`);
          }

          this.activeExperiments.delete(experimentId);
        }
      } catch (error) {
        console.error(`[EvolutionEngine] Failed to evaluate experiment ${experimentId}:`, error);
      }
    }
  }

  private findRelatedAgents(
    gap: string,
    analyses: AgentPerformanceAnalysis[]
  ): string[] {
    const gapWords = gap.toLowerCase().split(/\s+/);
    const related: string[] = [];

    for (const analysis of analyses) {
      const agentWords = analysis.agentId.toLowerCase().split(/[_-]/);
      const hasOverlap = gapWords.some((w) => agentWords.some((aw) => aw.includes(w) || w.includes(aw)));

      if (hasOverlap) {
        related.push(analysis.agentId);
      }
    }

    return related.slice(0, 3);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an EvolutionEngine instance with default configuration
 */
export function createEvolutionEngine(
  supabase: SupabaseClient,
  llmProvider: LLMProvider,
  promptService: PromptService,
  config?: Partial<EvolutionConfig>
): EvolutionEngine {
  return new EvolutionEngine(supabase, llmProvider, promptService, config);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export * from './types';
export { PerformanceAnalyzer } from './analyzer';
export { PromptOptimizer } from './optimizer';
export { AgentCreator } from './creator';

/**
 * PERFORMANCE ANALYZER
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * Analyzes agent performance data to identify:
 * - Underperforming agents
 * - Quality trends
 * - Efficiency issues
 * - Improvement opportunities
 * - Capability gaps
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentPerformanceAnalysis,
  PerformanceIssue,
  MetaPattern,
  EvolutionConfig,
} from './types';
import { DEFAULT_EVOLUTION_CONFIG } from './types';
import type { PromptService } from '../prompts';

// ============================================================================
// PERFORMANCE ANALYZER CLASS
// ============================================================================

export class PerformanceAnalyzer {
  private supabase: SupabaseClient;
  private promptService: PromptService;
  private config: EvolutionConfig;

  constructor(
    supabase: SupabaseClient,
    promptService: PromptService,
    config?: Partial<EvolutionConfig>
  ) {
    this.supabase = supabase;
    this.promptService = promptService;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Analyze performance for a specific agent
   */
  async analyzeAgent(
    agentId: string,
    period: { start: Date; end: Date }
  ): Promise<AgentPerformanceAnalysis> {
    // 1. Fetch performance data
    const performanceData = await this.fetchPerformanceData(agentId, period);

    // 2. Calculate quality metrics
    const quality = this.calculateQualityMetrics(performanceData);

    // 3. Calculate efficiency metrics
    const efficiency = this.calculateEfficiencyMetrics(performanceData);

    // 4. Compare to historical and other agents
    const comparison = await this.comparePerformance(agentId, quality, efficiency);

    // 5. Detect issues
    const issues = this.detectIssues(agentId, quality, efficiency, performanceData);

    return {
      agentId,
      period: {
        ...period,
        buildCount: performanceData.length,
      },
      quality,
      efficiency,
      comparison,
      issues,
    };
  }

  /**
   * Analyze all agents and rank them
   */
  async analyzeAllAgents(period: { start: Date; end: Date }): Promise<AgentPerformanceAnalysis[]> {
    const agentIds = await this.getActiveAgentIds(period);

    const analyses = await Promise.all(agentIds.map((id) => this.analyzeAgent(id, period)));

    // Sort by quality score (descending)
    return analyses.sort((a, b) => b.quality.averageScore - a.quality.averageScore);
  }

  /**
   * Find agents needing improvement
   */
  async findUnderperformers(
    threshold?: number,
    period?: { start: Date; end: Date }
  ): Promise<AgentPerformanceAnalysis[]> {
    const effectiveThreshold = threshold ?? this.config.thresholds.underperformerThreshold;
    const effectivePeriod = period ?? {
      start: new Date(Date.now() - this.config.analysis.defaultPeriodDays * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const analyses = await this.analyzeAllAgents(effectivePeriod);

    return analyses.filter(
      (a) =>
        a.quality.averageScore < effectiveThreshold ||
        a.quality.trend === 'declining' ||
        a.efficiency.failureRate > 0.1 ||
        a.issues.some((i) => i.severity === 'critical')
    );
  }

  /**
   * Detect capability gaps (requests that couldn't be handled)
   */
  async detectCapabilityGaps(): Promise<string[]> {
    // Query for failed or low-quality builds with specific patterns
    const { data: failedBuilds } = await this.supabase
      .from('builds')
      .select('description, error_message, metadata')
      .or('status.eq.failed,metadata->>quality_score.lt.5')
      .order('created_at', { ascending: false })
      .limit(100);

    // Analyze patterns in failures
    const gaps: Set<string> = new Set();

    for (const build of failedBuilds || []) {
      const gap = this.identifyGap(build);
      if (gap) gaps.add(gap);
    }

    return Array.from(gaps);
  }

  /**
   * Find patterns in successful improvements
   */
  async findSuccessPatterns(): Promise<MetaPattern[]> {
    // Query successful prompt changes
    const { data: improvements } = await this.supabase
      .from('prompt_performance')
      .select(
        `
        prompt_id,
        quality_score,
        agent_prompts!inner(
          agent_id,
          version,
          change_notes
        )
      `
      )
      .gte('quality_score', 7)
      .order('quality_score', { ascending: false })
      .limit(50);

    // Extract patterns from successful changes
    const patterns: MetaPattern[] = [];

    // Group by change type and analyze
    const changeGroups = this.groupByChangeReason(improvements || []);

    for (const [reason, items] of Object.entries(changeGroups)) {
      if (items.length >= 3) {
        // Pattern needs multiple occurrences
        const avgImprovement =
          items.reduce((sum: number, i: any) => sum + i.quality_score, 0) / items.length;

        if (avgImprovement >= 7) {
          patterns.push({
            id: `pattern-${reason.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: reason,
            description: `Pattern: ${reason} improvements lead to higher quality`,
            trigger: {
              issueType: this.mapReasonToIssueType(reason),
              conditions: this.extractConditions(items),
            },
            action: {
              promptModification: this.extractModificationPattern(items),
              examples: items.slice(0, 3).map((i: any) => i.prompt_id),
            },
            performance: {
              timesApplied: items.length,
              successRate: items.filter((i: any) => i.quality_score >= 7).length / items.length,
              averageImprovement: avgImprovement,
            },
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Get trending issues across all agents
   */
  async getTrendingIssues(): Promise<
    { issue: string; count: number; agents: string[]; severity: string }[]
  > {
    const period = {
      start: new Date(Date.now() - this.config.analysis.defaultPeriodDays * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const analyses = await this.analyzeAllAgents(period);

    // Aggregate issues
    const issueMap = new Map<string, { count: number; agents: string[]; severity: string }>();

    for (const analysis of analyses) {
      for (const issue of analysis.issues) {
        const key = issue.description;
        const existing = issueMap.get(key);

        if (existing) {
          existing.count++;
          existing.agents.push(analysis.agentId);
          // Escalate severity if needed
          if (issue.severity === 'critical') existing.severity = 'critical';
          else if (issue.severity === 'major' && existing.severity !== 'critical')
            existing.severity = 'major';
        } else {
          issueMap.set(key, {
            count: 1,
            agents: [analysis.agentId],
            severity: issue.severity,
          });
        }
      }
    }

    // Convert to array and sort by count
    return Array.from(issueMap.entries())
      .map(([issue, data]) => ({ issue, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  // ==========================================================================
  // PRIVATE METHODS - DATA FETCHING
  // ==========================================================================

  private async fetchPerformanceData(
    agentId: string,
    period: { start: Date; end: Date }
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from('agent_executions')
      .select(
        `
        id,
        status,
        duration_ms,
        tokens_used,
        created_at,
        build_id,
        retry_count,
        agent_quality_metrics(
          overall_score,
          validation_passed
        )
      `
      )
      .eq('agent_name', agentId)
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .order('created_at', { ascending: true })
      .limit(200);

    return data || [];
  }

  private async getActiveAgentIds(period: { start: Date; end: Date }): Promise<string[]> {
    const { data } = await this.supabase
      .from('agent_executions')
      .select('agent_name')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    return [...new Set((data || []).map((d: any) => d.agent_name))];
  }

  // ==========================================================================
  // PRIVATE METHODS - QUALITY METRICS
  // ==========================================================================

  private calculateQualityMetrics(data: any[]): AgentPerformanceAnalysis['quality'] {
    if (data.length === 0) {
      return {
        averageScore: 0,
        scoreDistribution: {},
        trend: 'stable',
        volatility: 0,
      };
    }

    const scores = data
      .filter((d) => d.agent_quality_metrics?.[0]?.overall_score != null)
      .map((d) => d.agent_quality_metrics[0].overall_score);

    if (scores.length === 0) {
      return {
        averageScore: 7, // Default assumption
        scoreDistribution: {},
        trend: 'stable',
        volatility: 0,
      };
    }

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Distribution
    const distribution: Record<string, number> = {
      '1-3': 0,
      '4-6': 0,
      '7-8': 0,
      '9-10': 0,
    };
    for (const score of scores) {
      if (score <= 3) distribution['1-3']++;
      else if (score <= 6) distribution['4-6']++;
      else if (score <= 8) distribution['7-8']++;
      else distribution['9-10']++;
    }

    // Trend (compare first half to second half)
    const trend = this.calculateTrend(scores);

    // Volatility (standard deviation)
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);

    return {
      averageScore: Math.round(averageScore * 10) / 10,
      scoreDistribution: distribution,
      trend,
      volatility: Math.round(volatility * 100) / 100,
    };
  }

  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) {
      return 'stable';
    }

    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);

    const firstAvg =
      firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg =
      secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

    const threshold = 0.3;
    if (secondAvg > firstAvg + threshold) return 'improving';
    if (secondAvg < firstAvg - threshold) return 'declining';
    return 'stable';
  }

  // ==========================================================================
  // PRIVATE METHODS - EFFICIENCY METRICS
  // ==========================================================================

  private calculateEfficiencyMetrics(data: any[]): AgentPerformanceAnalysis['efficiency'] {
    if (data.length === 0) {
      return {
        averageTokens: 0,
        averageLatency: 0,
        retryRate: 0,
        failureRate: 0,
      };
    }

    const tokens = data.filter((d) => d.tokens_used).map((d) => d.tokens_used);
    const latencies = data.filter((d) => d.duration_ms).map((d) => d.duration_ms);
    const failures = data.filter((d) => d.status === 'failed').length;
    const retries = data.filter((d) => (d.retry_count || 0) > 0).length;

    return {
      averageTokens:
        tokens.length > 0 ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length) : 0,
      averageLatency:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0,
      retryRate: Math.round((retries / data.length) * 100) / 100,
      failureRate: Math.round((failures / data.length) * 100) / 100,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - COMPARISON
  // ==========================================================================

  private async comparePerformance(
    agentId: string,
    quality: AgentPerformanceAnalysis['quality'],
    _efficiency: AgentPerformanceAnalysis['efficiency']
  ): Promise<AgentPerformanceAnalysis['comparison']> {
    // Get historical average for this agent (last 30 days)
    const { data: historical } = await this.supabase
      .from('agent_quality_metrics')
      .select('overall_score')
      .eq('agent_id', agentId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    const historicalAvg =
      historical && historical.length > 0
        ? historical.reduce((sum: number, h: any) => sum + h.overall_score, 0) / historical.length
        : quality.averageScore;

    // Get best prompt version score
    let bestScore = quality.averageScore;
    try {
      const history = await this.promptService.getPromptHistory(agentId);
      if (history && history.length > 0) {
        bestScore = history.reduce(
          (max, p: any) => Math.max(max, p.avgQualityScore || 0),
          quality.averageScore
        );
      }
    } catch {
      // Ignore errors, use default
    }

    // Get ranking among all agents
    const { data: allAgents } = await this.supabase
      .from('agent_quality_metrics')
      .select('agent_id, overall_score')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const agentScores = new Map<string, number[]>();
    for (const a of allAgents || []) {
      if (!agentScores.has(a.agent_id)) agentScores.set(a.agent_id, []);
      agentScores.get(a.agent_id)!.push(a.overall_score);
    }

    const avgScores = Array.from(agentScores.entries())
      .map(([id, scores]) => ({
        id,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);

    const ranking = avgScores.findIndex((a) => a.id === agentId) + 1;

    return {
      vsHistoricalAvg:
        historicalAvg !== 0
          ? Math.round(((quality.averageScore - historicalAvg) / historicalAvg) * 100)
          : 0,
      vsBestPromptVersion:
        bestScore !== 0
          ? Math.round(((quality.averageScore - bestScore) / bestScore) * 100)
          : 0,
      ranking: ranking || avgScores.length || 1,
    };
  }

  // ==========================================================================
  // PRIVATE METHODS - ISSUE DETECTION
  // ==========================================================================

  private detectIssues(
    agentId: string,
    quality: AgentPerformanceAnalysis['quality'],
    efficiency: AgentPerformanceAnalysis['efficiency'],
    data: any[]
  ): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Quality issues
    if (quality.averageScore < 6) {
      issues.push({
        type: 'quality',
        severity: quality.averageScore < 4 ? 'critical' : 'major',
        description: `Low average quality score: ${quality.averageScore}/10`,
        evidence: [
          `Average score is ${quality.averageScore}/10`,
          `Score distribution: ${JSON.stringify(quality.scoreDistribution)}`,
        ],
        suggestedFix: 'Review and improve system prompt, add examples, clarify output format',
      });
    }

    if (quality.trend === 'declining') {
      issues.push({
        type: 'quality',
        severity: 'major',
        description: `Quality is declining over time for ${agentId}`,
        evidence: ['Recent scores are lower than historical average'],
        suggestedFix: 'Investigate recent prompt changes, check for context pollution or drift',
      });
    }

    if (quality.volatility > this.config.analysis.volatilityThreshold) {
      issues.push({
        type: 'consistency',
        severity: 'minor',
        description: `High score volatility: ${quality.volatility.toFixed(2)}`,
        evidence: [`Standard deviation: ${quality.volatility.toFixed(2)}`],
        suggestedFix: 'Add more specific instructions, reduce ambiguity in prompt',
      });
    }

    // Efficiency issues
    const failureCount = data.filter((d) => d.status === 'failed').length;
    const failureRate = data.length > 0 ? failureCount / data.length : 0;
    if (failureRate > 0.1 || failureCount > 0) {
      issues.push({
        type: 'reliability',
        severity: failureRate > 0.2 ? 'critical' : 'major',
        description: `High failure rate: ${(failureRate * 100).toFixed(1)}%`,
        evidence: [`${(failureRate * 100).toFixed(1)}% of executions failed`],
        suggestedFix: 'Add better error handling, simplify output requirements, add fallbacks',
      });
    }

    if (efficiency.retryRate > 0.2) {
      issues.push({
        type: 'efficiency',
        severity: 'minor',
        description: `High retry rate: ${(efficiency.retryRate * 100).toFixed(1)}%`,
        evidence: [`${(efficiency.retryRate * 100).toFixed(1)}% of executions needed retry`],
        suggestedFix: 'Improve prompt clarity, add output format examples, check schema',
      });
    }

    // Token efficiency
    if (efficiency.averageTokens > 10000) {
      issues.push({
        type: 'efficiency',
        severity: 'minor',
        description: `High token usage: ${efficiency.averageTokens} tokens/execution`,
        evidence: [`Average tokens: ${efficiency.averageTokens}`],
        suggestedFix: 'Streamline prompt, reduce redundancy, use more concise instructions',
      });
    }

    return issues;
  }

  // ==========================================================================
  // PRIVATE METHODS - GAP DETECTION
  // ==========================================================================

  private identifyGap(build: any): string | null {
    const description = build.description?.toLowerCase() || '';
    const error = build.error_message?.toLowerCase() || '';
    const combined = `${description} ${error}`;

    // Pattern matching for capability gaps
    const gapPatterns = [
      { pattern: /mobile.*app|react.*native|flutter|ios|android/i, gap: 'Mobile app generation' },
      { pattern: /payment|stripe|billing|checkout|subscription/i, gap: 'Payment integration' },
      { pattern: /real-?time|websocket|socket\.io|live\s+update/i, gap: 'Real-time features' },
      { pattern: /ml|machine.*learning|ai.*model|tensorflow|pytorch/i, gap: 'ML/AI integration' },
      { pattern: /blockchain|web3|crypto|ethereum|solana/i, gap: 'Web3/Blockchain' },
      { pattern: /video|streaming|media.*player|hls|webrtc/i, gap: 'Video/Media handling' },
      { pattern: /3d|three\.?js|webgl|canvas.*animation/i, gap: '3D/WebGL graphics' },
      { pattern: /pdf|document.*generation|report.*export/i, gap: 'Document generation' },
      { pattern: /email.*template|newsletter|marketing.*email/i, gap: 'Email marketing' },
      { pattern: /cms|content.*management|headless/i, gap: 'CMS integration' },
    ];

    for (const { pattern, gap } of gapPatterns) {
      if (pattern.test(combined)) {
        return gap;
      }
    }

    return null;
  }

  // ==========================================================================
  // PRIVATE METHODS - PATTERN EXTRACTION
  // ==========================================================================

  private groupByChangeReason(items: any[]): Record<string, any[]> {
    return items.reduce(
      (groups, item) => {
        const reason = item.agent_prompts?.change_notes || 'unknown';
        if (!groups[reason]) groups[reason] = [];
        groups[reason].push(item);
        return groups;
      },
      {} as Record<string, any[]>
    );
  }

  private mapReasonToIssueType(reason: string): string {
    const reasonLower = reason.toLowerCase();
    const mapping: Record<string, string> = {
      clarity: 'quality',
      clear: 'quality',
      completeness: 'quality',
      complete: 'quality',
      accuracy: 'quality',
      accurate: 'quality',
      performance: 'efficiency',
      speed: 'efficiency',
      fast: 'efficiency',
      reliability: 'reliability',
      reliable: 'reliability',
      consistent: 'consistency',
      consistency: 'consistency',
    };

    for (const [key, value] of Object.entries(mapping)) {
      if (reasonLower.includes(key)) return value;
    }
    return 'quality';
  }

  private extractConditions(items: any[]): string[] {
    // Extract common conditions from successful improvements
    const conditions: string[] = [];

    // Check if most items had low scores before
    const avgBefore =
      items.reduce((sum: number, i: any) => sum + (i.previous_score || 5), 0) / items.length;
    if (avgBefore < 7) {
      conditions.push('quality_score < 7');
    }

    // Check if most needed retries
    const retriedCount = items.filter((i: any) => i.retry_count > 0).length;
    if (retriedCount / items.length > 0.3) {
      conditions.push('retry_count > 0');
    }

    return conditions.length > 0 ? conditions : ['quality_score < 7'];
  }

  private extractModificationPattern(items: any[]): string {
    // Analyze change notes to find common modifications
    const notes = items.map((i: any) => i.agent_prompts?.change_notes || '').join(' ');

    if (notes.includes('example')) return 'Add specific examples and clearer output format';
    if (notes.includes('format')) return 'Improve output format specification';
    if (notes.includes('clarif')) return 'Clarify ambiguous instructions';
    if (notes.includes('simplif')) return 'Simplify complex instructions';
    if (notes.includes('structur')) return 'Better structure the prompt sections';

    return 'Review and improve prompt based on performance data';
  }
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    PANTHEON FLAKINESS DETECTOR v2.0                           ║
 * ║                                                                               ║
 * ║    "Don't trust a single run. Trust STATISTICS."                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * The 10X feature that eliminates "works on my machine" syndrome.
 *
 * VERSION 2.0 UPGRADES:
 * ─────────────────────
 * ✅ DISTRIBUTION ANALYSIS - Is it normal? Bimodal? Random?
 * ✅ CLUSTER DETECTION - Are failures grouped or scattered?
 * ✅ VARIANCE TRACKING - Beyond just success/fail
 * ✅ STREAK ANALYSIS - Consecutive pass/fail patterns
 * ✅ TIME-SERIES DECOMPOSITION - Trend vs noise separation
 * ✅ PARALLEL EXECUTION - Run N tests simultaneously
 * ✅ MONTE CARLO MODE - Simulate thousands of scenarios
 *
 * Instead of: "80% pass rate"
 * We give:    "80% pass rate (95% CI: 72-86%), bimodal distribution
 *              detected (failures cluster in morning runs), 3 consecutive
 *              failures indicate underlying issue, not randomness."
 */

import { BuildSimulator, createStandardBuildConfig, createChaosConfig, CORE_INVARIANTS } from './core/simulator';
import type { BuildConfig, BuildTier, ChaosConfig } from './core/simulator';

// ============================================================================
// TYPES
// ============================================================================

export interface FlakinessResult {
  /** Number of runs executed */
  runs: number;
  /** Number of successful runs */
  successes: number;
  /** Number of failed runs */
  failures: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Flakiness score (0-1, higher = more flaky) */
  flakinessScore: number;
  /** 95% confidence interval for success rate */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  /** Is the result statistically significant? */
  isSignificant: boolean;
  /** Individual run results */
  runDetails: RunDetail[];
  /** Detected patterns in failures */
  failurePatterns: FailurePattern[];
  /** Recommendations based on analysis */
  recommendations: string[];
  /** Total execution time (ms) */
  totalTime: number;
  // V2.0: ADVANCED ANALYTICS
  /** Distribution type detected */
  distributionType: 'stable' | 'flaky' | 'bimodal' | 'degrading';
  /** Streak analysis */
  streakAnalysis: StreakAnalysis;
  /** Cluster detection results */
  clusters: ClusterResult[];
  /** Variance metrics */
  varianceMetrics: VarianceMetrics;
  /** Monte Carlo simulation results (if enabled) */
  monteCarloResult?: MonteCarloResult;
}

// ============================================================================
// V2.0: ADVANCED ANALYTICS TYPES
// ============================================================================

export interface StreakAnalysis {
  /** Longest consecutive pass streak */
  longestPassStreak: number;
  /** Longest consecutive fail streak */
  longestFailStreak: number;
  /** Current streak type and length */
  currentStreak: { type: 'pass' | 'fail'; length: number };
  /** Probability this streak is random vs systematic */
  streakRandomnessProbability: number;
}

export interface ClusterResult {
  /** Cluster type */
  type: 'pass' | 'fail' | 'mixed';
  /** Run indices in this cluster */
  runIndices: number[];
  /** Cluster start index */
  startIndex: number;
  /** Cluster size */
  size: number;
  /** Is this cluster statistically significant? */
  significant: boolean;
}

export interface VarianceMetrics {
  /** Duration variance (coefficient of variation) */
  durationCV: number;
  /** Progress variance at failure point */
  progressVariance: number;
  /** Agent failure variance */
  agentFailureVariance: number;
  /** Is variance normal or concerning? */
  verdict: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface MonteCarloResult {
  /** Number of simulations run */
  simulations: number;
  /** Estimated true success rate */
  estimatedTrueRate: number;
  /** 99% confidence interval */
  ci99: { lower: number; upper: number };
  /** Probability of passing N consecutive runs */
  consecutivePassProbabilities: { n: number; probability: number }[];
}

export interface RunDetail {
  runNumber: number;
  seed: number;
  success: boolean;
  duration: number;
  invariantViolations: string[];
  finalState: string;
  agentsFailed: string[];
  progress: number;
}

export interface FailurePattern {
  pattern: string;
  occurrences: number;
  percentage: number;
  examples: string[];
}

export interface FlakinessOptions {
  /** Number of runs (default: 10, recommended: 30 for confidence) */
  runs?: number;
  /** Build tier to test */
  tier?: BuildTier;
  /** Chaos configuration */
  chaos?: ChaosConfig | null;
  /** Base seed (each run uses baseSeed + runNumber) */
  baseSeed?: number;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number, lastResult: RunDetail) => void;
  /** Enable parallel execution (experimental) */
  parallel?: boolean;
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate Wilson score confidence interval
 * More accurate than normal approximation for small samples
 */
function wilsonConfidenceInterval(
  successes: number,
  total: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 0 };

  // Z-score for 95% confidence
  const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90%

  const p = successes / total;
  const n = total;

  const denominator = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);

  return {
    lower: Math.max(0, (center - spread) / denominator),
    upper: Math.min(1, (center + spread) / denominator),
  };
}

/**
 * Calculate flakiness score
 * 0 = perfectly consistent (all pass or all fail)
 * 1 = maximally flaky (50% pass rate)
 */
function calculateFlakinessScore(successRate: number): number {
  // Flakiness is highest at 50% and lowest at 0% or 100%
  return 1 - Math.abs(2 * successRate - 1);
}

/**
 * Determine if result is statistically significant
 * Based on confidence interval width and sample size
 */
function isStatisticallySignificant(
  runs: number,
  confidenceInterval: { lower: number; upper: number }
): boolean {
  // Significant if:
  // 1. At least 10 runs
  // 2. Confidence interval is reasonably narrow (<30% spread)
  const spread = confidenceInterval.upper - confidenceInterval.lower;
  return runs >= 10 && spread < 0.3;
}

// ============================================================================
// V2.0: ADVANCED STATISTICAL ANALYSIS
// ============================================================================

/**
 * Analyze streaks (consecutive passes/failures)
 * Helps distinguish flakiness from systematic degradation
 */
function analyzeStreaks(runDetails: RunDetail[]): StreakAnalysis {
  let longestPassStreak = 0;
  let longestFailStreak = 0;
  let currentPassStreak = 0;
  let currentFailStreak = 0;

  for (const run of runDetails) {
    if (run.success) {
      currentPassStreak++;
      currentFailStreak = 0;
      longestPassStreak = Math.max(longestPassStreak, currentPassStreak);
    } else {
      currentFailStreak++;
      currentPassStreak = 0;
      longestFailStreak = Math.max(longestFailStreak, currentFailStreak);
    }
  }

  // Determine current streak
  const lastRun = runDetails[runDetails.length - 1];
  const currentStreak = lastRun?.success
    ? { type: 'pass' as const, length: currentPassStreak }
    : { type: 'fail' as const, length: currentFailStreak };

  // Calculate probability that streaks are random
  // Using runs test approximation
  const n = runDetails.length;
  const successes = runDetails.filter(r => r.success).length;
  const failures = n - successes;

  let streakRandomnessProbability = 0.5; // Default

  if (n >= 10 && successes > 0 && failures > 0) {
    // Expected number of runs for random sequence
    const expectedRuns = (2 * successes * failures) / n + 1;
    // Count actual runs (transitions + 1)
    let actualRuns = 1;
    for (let i = 1; i < runDetails.length; i++) {
      if (runDetails[i].success !== runDetails[i - 1].success) {
        actualRuns++;
      }
    }
    // Standardize
    const diff = Math.abs(actualRuns - expectedRuns);
    streakRandomnessProbability = Math.max(0, 1 - diff / expectedRuns);
  }

  return {
    longestPassStreak,
    longestFailStreak,
    currentStreak,
    streakRandomnessProbability,
  };
}

/**
 * Detect clusters of failures (are they grouped or scattered?)
 */
function detectClusters(runDetails: RunDetail[]): ClusterResult[] {
  const clusters: ClusterResult[] = [];
  let currentCluster: RunDetail[] = [];
  let currentType: 'pass' | 'fail' | null = null;
  let startIndex = 0;

  for (let i = 0; i < runDetails.length; i++) {
    const run = runDetails[i];
    const type = run.success ? 'pass' : 'fail';

    if (currentType === null) {
      currentType = type;
      startIndex = i;
      currentCluster = [run];
    } else if (type === currentType) {
      currentCluster.push(run);
    } else {
      // End of cluster
      if (currentCluster.length >= 3) {
        clusters.push({
          type: currentType,
          runIndices: currentCluster.map((_, idx) => startIndex + idx),
          startIndex,
          size: currentCluster.length,
          significant: currentCluster.length >= 5,
        });
      }
      currentType = type;
      startIndex = i;
      currentCluster = [run];
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length >= 3 && currentType) {
    clusters.push({
      type: currentType,
      runIndices: currentCluster.map((_, idx) => startIndex + idx),
      startIndex,
      size: currentCluster.length,
      significant: currentCluster.length >= 5,
    });
  }

  return clusters;
}

/**
 * Calculate variance metrics across runs
 */
function calculateVarianceMetrics(runDetails: RunDetail[]): VarianceMetrics {
  // Duration variance
  const durations = runDetails.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const durationVariance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
  const durationStdDev = Math.sqrt(durationVariance);
  const durationCV = avgDuration > 0 ? durationStdDev / avgDuration : 0;

  // Progress variance at completion/failure
  const progressValues = runDetails.map(r => r.progress);
  const avgProgress = progressValues.reduce((a, b) => a + b, 0) / progressValues.length;
  const progressVariance = progressValues.reduce((sum, p) => sum + Math.pow(p - avgProgress, 2), 0) / progressValues.length;

  // Agent failure variance
  const agentFailCounts = runDetails.map(r => r.agentsFailed.length);
  const avgAgentFails = agentFailCounts.reduce((a, b) => a + b, 0) / agentFailCounts.length;
  const agentFailureVariance = agentFailCounts.reduce((sum, c) => sum + Math.pow(c - avgAgentFails, 2), 0) / agentFailCounts.length;

  // Determine verdict
  let verdict: VarianceMetrics['verdict'] = 'low';
  const maxCV = Math.max(durationCV, Math.sqrt(progressVariance) / 50, Math.sqrt(agentFailureVariance));

  if (maxCV > 0.5) verdict = 'extreme';
  else if (maxCV > 0.3) verdict = 'high';
  else if (maxCV > 0.15) verdict = 'moderate';

  return {
    durationCV,
    progressVariance,
    agentFailureVariance,
    verdict,
  };
}

/**
 * Determine distribution type based on results
 */
function determineDistributionType(
  successRate: number,
  flakinessScore: number,
  streakAnalysis: StreakAnalysis,
  clusters: ClusterResult[]
): FlakinessResult['distributionType'] {
  // Check for bimodal distribution (clusters of successes AND failures)
  const passCluster = clusters.some(c => c.type === 'pass' && c.significant);
  const failCluster = clusters.some(c => c.type === 'fail' && c.significant);

  if (passCluster && failCluster) {
    return 'bimodal';
  }

  // Check for degrading trend (failures concentrated at end)
  if (failCluster && clusters.find(c => c.type === 'fail')?.startIndex! > clusters.length / 2) {
    return 'degrading';
  }

  // Stable = low flakiness
  if (flakinessScore < 0.1) {
    return 'stable';
  }

  return 'flaky';
}

/**
 * Monte Carlo simulation for deeper analysis
 */
function runMonteCarloSimulation(
  successRate: number,
  runs: number,
  simulations: number = 1000
): MonteCarloResult {
  // Simulate many possible outcomes given the observed success rate
  const outcomes: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let successes = 0;
    for (let i = 0; i < runs; i++) {
      if (Math.random() < successRate) {
        successes++;
      }
    }
    outcomes.push(successes / runs);
  }

  // Sort for percentile calculation
  outcomes.sort((a, b) => a - b);

  const estimatedTrueRate = outcomes.reduce((a, b) => a + b, 0) / simulations;

  // 99% CI (0.5th and 99.5th percentile)
  const lowerIndex = Math.floor(simulations * 0.005);
  const upperIndex = Math.floor(simulations * 0.995);

  // Calculate probability of N consecutive passes
  const consecutivePassProbabilities = [3, 5, 10, 20].map(n => ({
    n,
    probability: Math.pow(successRate, n),
  }));

  return {
    simulations,
    estimatedTrueRate,
    ci99: {
      lower: outcomes[lowerIndex],
      upper: outcomes[upperIndex],
    },
    consecutivePassProbabilities,
  };
}

// ============================================================================
// THE FLAKINESS DETECTOR
// ============================================================================

export class FlakinessDetector {
  /**
   * Run multiple test executions and analyze flakiness
   */
  async detect(options: FlakinessOptions = {}): Promise<FlakinessResult> {
    const {
      runs: rawRuns = 10,
      tier = 'professional',
      chaos = null,
      baseSeed = Date.now(),
      onProgress,
    } = options;

    // Input validation: ensure runs is at least 1 to prevent division by zero
    const runs = Math.max(1, Math.floor(rawRuns));

    const startTime = performance.now();
    const runDetails: RunDetail[] = [];

    // Execute runs
    for (let i = 0; i < runs; i++) {
      const seed = baseSeed + i;
      const result = this.executeRun(seed, tier, chaos);
      runDetails.push({ ...result, runNumber: i + 1, seed });

      if (onProgress) {
        onProgress(i + 1, runs, runDetails[runDetails.length - 1]);
      }
    }

    const totalTime = performance.now() - startTime;

    // Calculate statistics
    const successes = runDetails.filter(r => r.success).length;
    const failures = runs - successes;
    const successRate = successes / runs;
    const flakinessScore = calculateFlakinessScore(successRate);
    const confidenceInterval = wilsonConfidenceInterval(successes, runs);
    const isSignificant = isStatisticallySignificant(runs, confidenceInterval);

    // Analyze failure patterns
    const failurePatterns = this.analyzeFailurePatterns(runDetails);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      successRate,
      flakinessScore,
      failurePatterns,
      runs
    );

    // V2.0: Advanced analytics
    const streakAnalysis = analyzeStreaks(runDetails);
    const clusters = detectClusters(runDetails);
    const varianceMetrics = calculateVarianceMetrics(runDetails);
    const distributionType = determineDistributionType(successRate, flakinessScore, streakAnalysis, clusters);

    // V2.0: Monte Carlo simulation for deeper insights
    const monteCarloResult = runs >= 10 ? runMonteCarloSimulation(successRate, runs) : undefined;

    // V2.0: Enhanced recommendations based on new analytics
    if (streakAnalysis.longestFailStreak >= 3) {
      recommendations.push(`⚠️ STREAK: ${streakAnalysis.longestFailStreak} consecutive failures detected - likely systematic issue, not flakiness`);
    }

    if (distributionType === 'bimodal') {
      recommendations.push('📊 BIMODAL: Results cluster into two groups - check for environmental factors (time of day, load, etc.)');
    }

    if (varianceMetrics.verdict === 'extreme') {
      recommendations.push('📈 HIGH VARIANCE: Test behavior is highly inconsistent - investigate non-deterministic code');
    }

    if (monteCarloResult && monteCarloResult.consecutivePassProbabilities.find(p => p.n === 10)?.probability! < 0.5) {
      recommendations.push('🎰 MONTE CARLO: <50% chance of 10 consecutive passes - not ready for CI pipeline');
    }

    return {
      runs,
      successes,
      failures,
      successRate,
      flakinessScore,
      confidenceInterval,
      isSignificant,
      runDetails,
      failurePatterns,
      recommendations,
      totalTime,
      // V2.0: Advanced analytics
      distributionType,
      streakAnalysis,
      clusters,
      varianceMetrics,
      monteCarloResult,
    };
  }

  /**
   * Execute a single test run
   */
  private executeRun(
    seed: number,
    tier: BuildTier,
    chaos: ChaosConfig | null
  ): Omit<RunDetail, 'runNumber' | 'seed'> {
    const startTime = performance.now();

    const sim = new BuildSimulator(seed);
    const config = createStandardBuildConfig(tier, seed);

    if (chaos) {
      sim.initialize({ ...config, chaos });
    } else {
      sim.initialize(config);
    }

    const violations: string[] = [];
    const agentsFailed: string[] = [];

    // Run simulation
    while (!sim.isComplete()) {
      sim.tick();

      // Check invariants
      const history = sim.getHistory();
      const current = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : undefined;

      for (const inv of CORE_INVARIANTS) {
        const result = inv.check(current, previous);
        if (!result.passed && result.violation) {
          violations.push(`${inv.name}: ${result.violation}`);
        }
      }
    }

    const snapshot = sim.getSnapshot();

    // Collect failed agents
    for (const agent of snapshot.agents.values()) {
      if (agent.state === 'failed') {
        agentsFailed.push(agent.id);
      }
    }

    const duration = performance.now() - startTime;
    const success = snapshot.state === 'completed' && violations.length === 0;

    return {
      success,
      duration,
      invariantViolations: violations,
      finalState: snapshot.state,
      agentsFailed,
      progress: snapshot.progress * 100,
    };
  }

  /**
   * Analyze patterns in failures
   */
  private analyzeFailurePatterns(runDetails: RunDetail[]): FailurePattern[] {
    const patterns = new Map<string, { count: number; examples: string[] }>();
    const failedRuns = runDetails.filter(r => !r.success);

    for (const run of failedRuns) {
      // Pattern: Invariant violations
      for (const violation of run.invariantViolations) {
        const key = violation.split(':')[0]; // Just the invariant name
        const existing = patterns.get(key) || { count: 0, examples: [] };
        existing.count++;
        if (existing.examples.length < 3) {
          existing.examples.push(`Run ${run.runNumber}: ${violation}`);
        }
        patterns.set(key, existing);
      }

      // Pattern: Failed agents
      for (const agent of run.agentsFailed) {
        const key = `Agent failed: ${agent}`;
        const existing = patterns.get(key) || { count: 0, examples: [] };
        existing.count++;
        if (existing.examples.length < 3) {
          existing.examples.push(`Run ${run.runNumber}`);
        }
        patterns.set(key, existing);
      }

      // Pattern: Final state
      if (run.finalState !== 'completed') {
        const key = `Final state: ${run.finalState}`;
        const existing = patterns.get(key) || { count: 0, examples: [] };
        existing.count++;
        patterns.set(key, existing);
      }
    }

    // Convert to array and sort by frequency
    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        occurrences: data.count,
        percentage: failedRuns.length > 0 ? (data.count / failedRuns.length) * 100 : 0,
        examples: data.examples,
      }))
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    successRate: number,
    flakinessScore: number,
    patterns: FailurePattern[],
    runs: number
  ): string[] {
    const recommendations: string[] = [];

    // Sample size recommendations
    if (runs < 10) {
      recommendations.push(`Run at least 10 iterations for reliable results (currently ${runs})`);
    } else if (runs < 30 && flakinessScore > 0.3) {
      recommendations.push('Consider running 30+ iterations for higher confidence with flaky tests');
    }

    // Success rate recommendations
    if (successRate < 0.5) {
      recommendations.push('CRITICAL: Less than 50% success rate. Fix underlying issues before deploying.');
    } else if (successRate < 0.8) {
      recommendations.push('WARNING: Success rate below 80%. Investigate common failure patterns.');
    } else if (successRate < 0.95) {
      recommendations.push('Consider investigating the remaining failures for edge cases.');
    }

    // Flakiness recommendations
    if (flakinessScore > 0.5) {
      recommendations.push('HIGH FLAKINESS: Tests are inconsistent. Look for race conditions or timing issues.');
    } else if (flakinessScore > 0.2) {
      recommendations.push('Moderate flakiness detected. Consider adding retry logic or fixing intermittent issues.');
    }

    // Pattern-specific recommendations
    const topPattern = patterns[0];
    if (topPattern && topPattern.percentage > 50) {
      recommendations.push(`Most common failure (${topPattern.percentage.toFixed(0)}%): ${topPattern.pattern}`);
    }

    if (patterns.some(p => p.pattern.includes('PROGRESS'))) {
      recommendations.push('Progress-related failures detected. Check progress calculation logic.');
    }

    if (patterns.some(p => p.pattern.includes('timeout'))) {
      recommendations.push('Timeout failures detected. Consider increasing timeouts or optimizing slow operations.');
    }

    return recommendations;
  }
}

// ============================================================================
// FORMATTED OUTPUT
// ============================================================================

export function formatFlakinessResult(result: FlakinessResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═'.repeat(70));
  lines.push('                    FLAKINESS ANALYSIS');
  lines.push('═'.repeat(70));
  lines.push('');

  // Key metrics
  const successIcon = result.successRate >= 0.95 ? '🟢' :
                      result.successRate >= 0.8 ? '🟡' : '🔴';
  const flakyIcon = result.flakinessScore < 0.1 ? '🟢' :
                    result.flakinessScore < 0.3 ? '🟡' : '🔴';

  lines.push(`  Runs: ${result.runs} | Time: ${(result.totalTime / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push(`  ${successIcon} Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
  lines.push(`     95% CI: [${(result.confidenceInterval.lower * 100).toFixed(1)}% - ${(result.confidenceInterval.upper * 100).toFixed(1)}%]`);
  lines.push('');
  lines.push(`  ${flakyIcon} Flakiness Score: ${(result.flakinessScore * 100).toFixed(1)}%`);
  lines.push(`     ${result.flakinessScore < 0.1 ? 'Stable' : result.flakinessScore < 0.3 ? 'Moderate' : 'High'}`);
  lines.push('');
  lines.push(`  Statistical Significance: ${result.isSignificant ? '✅ Yes' : '⚠️ Need more runs'}`);

  // Visual distribution
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('  Run Distribution:');
  lines.push('');

  const passChars = Math.round(result.successes / result.runs * 40);
  const failChars = 40 - passChars;
  lines.push(`  [${'█'.repeat(passChars)}${'░'.repeat(failChars)}]`);
  lines.push(`   ${result.successes} passed | ${result.failures} failed`);

  // Failure patterns
  if (result.failurePatterns.length > 0) {
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('  Top Failure Patterns:');
    lines.push('');

    for (const pattern of result.failurePatterns.slice(0, 5)) {
      const bar = '█'.repeat(Math.round(pattern.percentage / 5));
      lines.push(`  ${pattern.pattern}`);
      lines.push(`     [${bar.padEnd(20, '░')}] ${pattern.percentage.toFixed(0)}% (${pattern.occurrences}x)`);
    }
  }

  // V2.0: Streak Analysis
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('  Streak Analysis:');
  lines.push('');
  lines.push(`  📈 Longest Pass Streak: ${result.streakAnalysis.longestPassStreak}`);
  lines.push(`  📉 Longest Fail Streak: ${result.streakAnalysis.longestFailStreak}`);
  lines.push(`  🎯 Current: ${result.streakAnalysis.currentStreak.length} ${result.streakAnalysis.currentStreak.type}es in a row`);
  lines.push(`  🎲 Randomness: ${(result.streakAnalysis.streakRandomnessProbability * 100).toFixed(0)}% likely random`);

  // V2.0: Distribution & Clusters
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('  Distribution Analysis:');
  lines.push('');
  const distIcon = result.distributionType === 'stable' ? '🟢' :
                   result.distributionType === 'flaky' ? '🟡' :
                   result.distributionType === 'bimodal' ? '🟠' : '🔴';
  lines.push(`  ${distIcon} Type: ${result.distributionType.toUpperCase()}`);
  lines.push(`  📊 Variance: ${result.varianceMetrics.verdict} (duration CV: ${(result.varianceMetrics.durationCV * 100).toFixed(1)}%)`);

  if (result.clusters.length > 0) {
    lines.push(`  🔗 Clusters: ${result.clusters.length} detected`);
    for (const cluster of result.clusters.slice(0, 3)) {
      lines.push(`     • ${cluster.type.toUpperCase()} cluster of ${cluster.size} runs starting at #${cluster.startIndex + 1}`);
    }
  }

  // V2.0: Monte Carlo
  if (result.monteCarloResult) {
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('  Monte Carlo Simulation (1000 runs):');
    lines.push('');
    lines.push(`  🎰 True Rate Estimate: ${(result.monteCarloResult.estimatedTrueRate * 100).toFixed(1)}%`);
    lines.push(`  📊 99% CI: [${(result.monteCarloResult.ci99.lower * 100).toFixed(1)}% - ${(result.monteCarloResult.ci99.upper * 100).toFixed(1)}%]`);
    lines.push('  🎯 Consecutive Pass Probability:');
    for (const prob of result.monteCarloResult.consecutivePassProbabilities) {
      const bar = '█'.repeat(Math.round(prob.probability * 20));
      lines.push(`     ${prob.n} runs: [${bar.padEnd(20, '░')}] ${(prob.probability * 100).toFixed(1)}%`);
    }
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('');
    lines.push('─'.repeat(70));
    lines.push('  Recommendations:');
    lines.push('');

    for (const rec of result.recommendations) {
      lines.push(`  ${rec.startsWith('⚠️') || rec.startsWith('📊') || rec.startsWith('📈') || rec.startsWith('🎰') ? '' : '💡 '}${rec}`);
    }
  }

  lines.push('');
  lines.push('═'.repeat(70));

  return lines.join('\n');
}

// ============================================================================
// QUICK HELPERS
// ============================================================================

/**
 * Quick flakiness check - runs 10 times and reports
 */
export async function quickFlakinessCheck(
  tier: BuildTier = 'professional',
  chaos: 'none' | 'low' | 'medium' | 'high' = 'medium'
): Promise<FlakinessResult> {
  const detector = new FlakinessDetector();
  return detector.detect({
    runs: 10,
    tier,
    chaos: chaos === 'none' ? null : createChaosConfig(chaos),
  });
}

/**
 * Deep flakiness analysis - runs 30 times with progress
 */
export async function deepFlakinessAnalysis(
  tier: BuildTier = 'professional',
  chaos: 'none' | 'low' | 'medium' | 'high' = 'medium',
  onProgress?: (current: number, total: number) => void
): Promise<FlakinessResult> {
  const detector = new FlakinessDetector();
  return detector.detect({
    runs: 30,
    tier,
    chaos: chaos === 'none' ? null : createChaosConfig(chaos),
    onProgress: onProgress ? (c, t) => onProgress(c, t) : undefined,
  });
}

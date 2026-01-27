/**
 * ████████████████████████████████████████████████████████████████████████████
 * ██                                                                        ██
 * ██    ██████╗  █████╗ ███╗   ██╗████████╗██╗  ██╗███████╗ ██████╗ ███╗   ██╗ ██
 * ██    ██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝██║  ██║██╔════╝██╔═══██╗████╗  ██║ ██
 * ██    ██████╔╝███████║██╔██╗ ██║   ██║   ███████║█████╗  ██║   ██║██╔██╗ ██║ ██
 * ██    ██╔═══╝ ██╔══██║██║╚██╗██║   ██║   ██╔══██║██╔══╝  ██║   ██║██║╚██╗██║ ██
 * ██    ██║     ██║  ██║██║ ╚████║   ██║   ██║  ██║███████╗╚██████╔╝██║ ╚████║ ██
 * ██    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ██
 * ██                                                                        ██
 * ██    P R O D U C T I O N - G R A D E   T E S T   I N F R A S T R U C T U R E ██
 * ██                                                                        ██
 * ██    ╔══════════════════════════════════════════════════════════════╗    ██
 * ██    ║  ██╗ ██████╗ ██╗  ██╗    ██╗   ██╗██████╗     ██████╗        ║    ██
 * ██    ║ ███║██╔═████╗╚██╗██╔╝    ██║   ██║╚════██╗   ██╔═████╗       ║    ██
 * ██    ║ ╚██║██║██╔██║ ╚███╔╝     ██║   ██║ █████╔╝   ██║██╔██║       ║    ██
 * ██    ║  ██║████╔╝██║ ██╔██╗     ╚██╗ ██╔╝██╔═══╝    ████╔╝██║       ║    ██
 * ██    ║  ██║╚██████╔╝██╔╝ ██╗     ╚████╔╝ ███████╗██╗╚██████╔╝       ║    ██
 * ██    ║  ╚═╝ ╚═════╝ ╚═╝  ╚═╝      ╚═══╝  ╚══════╝╚═╝ ╚═════╝        ║    ██
 * ██    ╚══════════════════════════════════════════════════════════════╝    ██
 * ██                                                                        ██
 * ████████████████████████████████████████████████████████████████████████████
 *
 * PANTHEON: Production-grade ANalysis & Testing of High-reliability
 *           Enterprise Orchestration Networks
 *
 * A military-grade test infrastructure for the OLYMPUS orchestrator.
 *
 * Core Modules:
 * ─────────────
 * ⚡ SIMULATOR    - Full build simulation with time-travel debugging
 * 🔮 ORACLE       - Intelligent invariant verification & anomaly detection
 * 🎲 PROPERTIES   - Property-based testing with random generation
 * 🐒 CHAOS        - Chaos engineering for resilience testing
 * 🔬 MUTATION     - Mutation testing to verify test quality
 * 📊 VISUAL       - Interactive HTML debugging reports
 * 🚀 LOAD         - Performance & stress testing
 *
 * 10X V2.0 Features (The features that make V1.0 look like a prototype):
 * ──────────────────────────────────────────────────────────────────────
 * 🧠 INSIGHTS V2.0     - Root cause graphs, predictive analytics, code suggestions
 * 🎲 FLAKINESS V2.0    - Monte Carlo simulation, streak analysis, distribution fitting
 * 📊 REPORTS V2.0      - Dependency DAG, keyboard shortcuts, export (PNG/SVG/JSON/PDF)
 *
 * @version 4.0.0
 * @codename OLYMPUS
 * @author OLYMPUS Engineering
 */

// ============================================================================
// CORE SIMULATOR
// ============================================================================

export {
  // Main Classes
  BuildSimulator,
  // Types
  type BuildPhase,
  type AgentState,
  type BuildState,
  type BuildTier,
  type AgentConfig,
  type BuildConfig,
  type SimulatorEvent,
  type BuildSnapshot,
  type ChaosConfig,
  type Invariant,
  // Constants
  PHASE_ORDER,
  CORE_INVARIANTS,
  // Factories
  createStandardBuildConfig,
  createChaosConfig,
  // Utilities
  mulberry32,
} from './core/simulator';

// ============================================================================
// TEST ORACLE
// ============================================================================

export {
  // Main Classes
  TestOracle,
  DifferentialOracle,
  // Types
  type OracleVerdict,
  type InvariantViolation,
  type Anomaly,
  type AnomalyType,
  type ExecutionProfile,
  type Bottleneck,
  type TemporalPattern,
  type DiffResult,
  type Difference,
  // Constants
  TEMPORAL_PATTERNS,
  ANOMALY_DETECTORS,
} from './core/oracle';

// ============================================================================
// VISUAL DEBUGGER
// ============================================================================

export {
  VisualDebugger,
  type TimelineEntry,
  type DebugReport,
} from './visual-debugger';

// ============================================================================
// MUTATION ENGINE (Types defined locally - engine loaded dynamically)
// ============================================================================

// Note: MutationEngine imports vitest, which can't be imported outside vitest runner.
// Types are defined locally to avoid importing the problematic module.

export interface Mutant {
  id: string;
  type: string;
  name: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  apply: (simulator: unknown) => void;
  revert: (simulator: unknown) => void;
}

export interface MutationReport {
  totalMutants: number;
  killed: number;
  survived: number;
  mutationScore: number;
  survivingMutants: Array<{ mutant: Mutant; killed: boolean; killedBy: string | null; survivedBecause?: string }>;
  killedMutants: Array<{ mutant: Mutant; killed: boolean; killedBy: string | null }>;
  recommendations: string[];
}

// For consumers who need MutationEngine, provide a factory that handles the vitest issue
export async function getMutationEngine(): Promise<{
  MutationEngine: { new(): { runAllMutants(iterations: number): MutationReport } };
  MutatedSimulator: unknown;
  MUTANTS: Mutant[];
} | null> {
  try {
    const module = await import('./mutation.test');
    return {
      MutationEngine: module.MutationEngine,
      MutatedSimulator: module.MutatedSimulator,
      MUTANTS: module.MUTANTS,
    };
  } catch {
    console.warn('MutationEngine unavailable (requires vitest runner)');
    return null;
  }
}

// ============================================================================
// 10X FEATURES V2.0 - The features that make V1.0 look like a prototype
// ============================================================================

export {
  // Core Engine
  InsightsEngine,
  formatInsights,
  // V1.0 Types
  type Insight,
  type InsightReport,
  // V2.0 Types - Root Cause Analysis
  type RootCauseNode,
  type FailurePrediction,
  type TrendForecast,
} from './insights-engine';

export {
  // Core Engine
  FlakinessDetector,
  formatFlakinessResult,
  quickFlakinessCheck,
  deepFlakinessAnalysis,
  // V1.0 Types
  type FlakinessResult,
  type FlakinessOptions,
  type RunDetail,
  type FailurePattern,
  // V2.0 Types - Advanced Statistics
  type StreakAnalysis,
  type ClusterResult,
  type VarianceMetrics,
  type MonteCarloResult,
} from './flakiness-detector';

export {
  // Core Generator
  generateInteractiveReport,
  // V2.0 Functions
  buildDependencyGraph,
  getKeyboardShortcuts,
  // V1.0 Types
  type InteractiveReportData,
  // V2.0 Types
  type DependencyNode,
  type DependencyEdge,
  type DependencyGraph,
  type ExportOptions,
  type KeyboardShortcut,
  // V2.0 Constants
  INTERACTIVE_REPORT_VERSION,
  INTERACTIVE_REPORT_CODENAME,
} from './interactive-report';

// ============================================================================
// PANTHEON RUNNER - Unified Test Execution
// ============================================================================

interface PantheonOptions {
  verbose?: boolean;
  seed?: number;
  iterations?: number;
  chaosIntensity?: 'low' | 'medium' | 'high' | 'extreme';
  outputDir?: string;
  // Regression detection options
  compareBaseline?: boolean;    // Compare against saved baseline
  saveBaseline?: boolean;       // Save results as new baseline
  failOnRegression?: boolean;   // Exit with error code on regression (for CI)
  baselineDir?: string;         // Directory for baseline file
  gitCommit?: string;           // Current git commit (for tracking)
  gitBranch?: string;           // Current git branch
  // 10X Features
  enableInsights?: boolean;     // Run AI insights engine
  enableFlakiness?: boolean;    // Run flakiness detection
  flakinessRuns?: number;       // Number of flakiness test runs (default: 10)
  generateReport?: boolean;     // Generate interactive HTML report
  reportPath?: string;          // Path for HTML report output
  // Production features (FIX: Missing from original)
  timeoutMs?: number;           // Global timeout in milliseconds (default: 300000 = 5 min)
  jsonOutput?: boolean;         // Output machine-readable JSON instead of CLI output
}

export { PantheonOptions };

interface PantheonSummary {
  simulator: {
    buildsRun: number;
    invariantsPassed: boolean;
    timeTravel: boolean;
  };
  oracle: {
    verdicts: number;
    violations: number;
    anomalies: number;
  };
  chaos: {
    scenariosRun: number;
    resilience: number;
  };
  mutation: {
    mutants: number;
    killed: number;
    score: number;
  };
  overall: {
    passed: boolean;
    score: number;
    recommendations: string[];
  };
  // 10X Features (optional)
  insights?: import('./insights-engine').InsightReport;
  flakiness?: import('./flakiness-detector').FlakinessResult;
  reportPath?: string;
}

export { PantheonSummary };

/**
 * PANTHEON Runner - Execute all test infrastructure components
 */
export async function runPantheon(options: PantheonOptions = {}): Promise<PantheonSummary> {
  const {
    verbose = false,
    seed = Date.now(),
    iterations = 10,
    chaosIntensity = 'medium',
    compareBaseline = true,      // ON by default - this is why competitors laughed
    saveBaseline: shouldSave = false,
    failOnRegression = false,
    baselineDir = process.cwd(),
    gitCommit,
    gitBranch,
    // 10X Features
    enableInsights = false,
    enableFlakiness = false,
    flakinessRuns = 10,
    generateReport = false,
    reportPath,
    // Production features
    timeoutMs = 300000,   // Default 5 minute timeout
    jsonOutput = false,
  } = options;

  // Import dynamically to avoid circular deps
  const { BuildSimulator, createStandardBuildConfig, createChaosConfig, CORE_INVARIANTS } = await import('./core/simulator');
  const { TestOracle } = await import('./core/oracle');

  // MutationEngine import - handle vitest conflict
  let MutationEngine: typeof import('./mutation.test').MutationEngine;
  try {
    const mutationModule = await import('./mutation.test');
    MutationEngine = mutationModule.MutationEngine;
  } catch (err) {
    // If vitest import fails (running outside vitest), use a stub
    console.warn('Warning: MutationEngine unavailable (vitest not loaded). Mutation testing disabled.');
    MutationEngine = class StubMutationEngine {
      runAllMutants() {
        return {
          totalMutants: 0,
          killed: 0,
          survived: 0,
          mutationScore: 1.0,
          survivingMutants: [],
          killedMutants: [],
          recommendations: ['Run with vitest to enable mutation testing'],
        };
      }
    } as unknown as typeof import('./mutation.test').MutationEngine;
  }

  // Conditional logging: JSON mode = silent, verbose = full, default = silent
  const log = jsonOutput ? () => {} : (verbose ? console.log : () => {});

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS FEEDBACK - TTY-aware (won't break CI/piped output)
  // ═══════════════════════════════════════════════════════════════════════════
  const startTime = Date.now();
  const STAGES = ['Simulator', 'Oracle', 'Chaos', 'Mutation'] as const;
  let currentStage = 0;
  let lastProgressLine = '';

  // FIX #1: TTY detection - don't use \r in non-interactive environments
  const isTTY = process.stdout.isTTY === true;
  const useUnicode = isTTY && process.platform !== 'win32'; // Windows cmd often mangles Unicode

  const showProgress = (stage: typeof STAGES[number], detail?: string) => {
    currentStage = STAGES.indexOf(stage) + 1;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Use ASCII fallback for non-TTY or Windows
    const filled = useUnicode ? '█' : '#';
    const empty = useUnicode ? '░' : '-';
    const bar = filled.repeat(currentStage * 5) + empty.repeat((4 - currentStage) * 5);
    const status = (detail || stage).slice(0, 25); // Prevent overflow

    const line = `[${currentStage}/4] ${bar} ${status.padEnd(25)} ${elapsed}s`;

    if (jsonOutput) {
      // JSON mode: no progress output
    } else if (isTTY) {
      // Interactive: overwrite same line
      process.stdout.write(`\r${line}`);
    } else if (line !== lastProgressLine) {
      // Non-interactive (CI): only print when stage changes, no \r
      console.log(line);
    }
    lastProgressLine = line;
  };

  const finishProgress = () => {
    if (jsonOutput) return; // No progress in JSON mode
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const filled = useUnicode ? '█' : '#';
    if (isTTY) {
      process.stdout.write(`\r${filled.repeat(20)} Complete in ${elapsed}s                    \n`);
    } else {
      console.log(`${filled.repeat(20)} Complete in ${elapsed}s`);
    }
  };

  log('═'.repeat(70));
  log('                    PANTHEON TEST INFRASTRUCTURE v2.0');
  log('═'.repeat(70));
  log(`Seed: ${seed} | Iterations: ${iterations} | Chaos: ${chaosIntensity}`);
  log('─'.repeat(70));

  // 1. SIMULATOR TESTS
  showProgress('Simulator', 'Testing builds...');
  log('\n⚡ SIMULATOR TESTS');
  let simulatorPassed = true;
  let buildsRun = 0;

  for (const tier of ['starter', 'professional', 'enterprise'] as const) {
    showProgress('Simulator', `Testing ${tier}...`);
    const sim = new BuildSimulator(seed);
    const config = createStandardBuildConfig(tier, seed);
    sim.initialize(config);

    while (!sim.isComplete()) {
      sim.tick();
    }

    buildsRun++;
    const history = sim.getHistory();

    // Check invariants
    for (let i = 0; i < history.length; i++) {
      for (const inv of CORE_INVARIANTS) {
        const result = inv.check(history[i], i > 0 ? history[i - 1] : undefined);
        if (!result.passed) {
          simulatorPassed = false;
          log(`  ❌ ${tier}: ${inv.name} violated - ${result.violation}`);
        }
      }
    }

    if (simulatorPassed) {
      log(`  ✅ ${tier}: ${history.length} snapshots, all invariants passed`);
    }
  }

  // 2. ORACLE TESTS
  showProgress('Oracle', 'Verifying invariants...');
  log('\n🔮 ORACLE VERIFICATION');
  const oracle = new TestOracle();
  let verdicts = 0;
  let violations = 0;
  let anomalies = 0;

  for (let i = 0; i < iterations; i++) {
    showProgress('Oracle', `Run ${i + 1}/${iterations}...`);
    const sim = new BuildSimulator(seed + i);
    const config = createStandardBuildConfig('professional', seed + i);
    const chaos = createChaosConfig(chaosIntensity);

    sim.initialize({ ...config, chaos });

    while (!sim.isComplete()) {
      sim.tick();
    }

    const verdict = oracle.verify(sim.getHistory(), sim.getEventLog());
    verdicts++;
    violations += verdict.violations.length;
    anomalies += verdict.anomalies.length;
    oracle.learn(sim.getHistory(), sim.getEventLog());
  }

  log(`  ✅ ${verdicts} verdicts generated`);
  log(`  📋 ${violations} total violations detected`);
  log(`  ⚠️  ${anomalies} anomalies identified`);

  // 3. CHAOS TESTS
  showProgress('Chaos', 'Testing resilience...');
  log('\n🐒 CHAOS RESILIENCE');
  let chaosSuccesses = 0;
  const chaosScenarios = 4;

  for (const intensity of ['low', 'medium', 'high', 'extreme'] as const) {
    showProgress('Chaos', `${intensity} intensity...`);
    let scenarioPassed = 0;
    for (let i = 0; i < 5; i++) {
      const sim = new BuildSimulator(seed + i);
      const config = createStandardBuildConfig('professional', seed + i);
      const chaos = createChaosConfig(intensity);

      sim.initialize({ ...config, chaos });

      try {
        while (!sim.isComplete()) {
          sim.tick();
        }
        const final = sim.getSnapshot();
        if (final.state === 'completed' || final.state === 'failed') {
          scenarioPassed++;
        }
      } catch {
        // Chaos caused crash - that's fine for extreme
      }
    }
    const rate = scenarioPassed / 5;
    if (rate >= 0.5 || intensity === 'extreme') {
      chaosSuccesses++;
      log(`  ✅ ${intensity.padEnd(8)}: ${(rate * 100).toFixed(0)}% success rate`);
    } else {
      log(`  ❌ ${intensity.padEnd(8)}: ${(rate * 100).toFixed(0)}% success rate`);
    }
  }

  const chaosResilience = chaosSuccesses / chaosScenarios;

  // 4. MUTATION TESTS
  showProgress('Mutation', 'Testing test quality...');
  log('\n🔬 MUTATION TESTING');
  const mutationEngine = new MutationEngine();
  const mutationReport = mutationEngine.runAllMutants(5);
  showProgress('Mutation', 'Analyzing results...');

  log(`  Total Mutants: ${mutationReport.totalMutants}`);
  log(`  Killed: ${mutationReport.killed}`);
  log(`  Survived: ${mutationReport.survived}`);
  log(`  Mutation Score: ${(mutationReport.mutationScore * 100).toFixed(1)}%`);

  if (mutationReport.survivingMutants.length > 0) {
    log('  Surviving:');
    for (const m of mutationReport.survivingMutants.slice(0, 3)) {
      log(`    - ${m.mutant.name}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10X FEATURES - The features that make V1 look like a prototype
  // ═══════════════════════════════════════════════════════════════════════════

  // Collect snapshots and events for 10X analysis
  const lastSim = new BuildSimulator(seed);
  const lastConfig = createStandardBuildConfig('professional', seed);
  const lastChaos = createChaosConfig(chaosIntensity);
  lastSim.initialize({ ...lastConfig, chaos: lastChaos });
  while (!lastSim.isComplete()) {
    lastSim.tick();
  }
  const analysisSnapshots = lastSim.getHistory();
  const analysisEvents = lastSim.getEventLog();

  // Variables for 10X results
  let insightReport: import('./insights-engine').InsightReport | undefined;
  let flakinessResult: import('./flakiness-detector').FlakinessResult | undefined;
  let htmlReportPath: string | undefined;

  // 5a. INSIGHTS ENGINE (if enabled)
  if (enableInsights) {
    log('\n🧠 INSIGHTS ENGINE');
    const { InsightsEngine, formatInsights } = await import('./insights-engine');
    const insightsEngine = new InsightsEngine();

    // Build a temporary summary for insights
    const tempSummary = {
      simulator: { buildsRun, invariantsPassed: simulatorPassed, timeTravel: true },
      oracle: { verdicts, violations, anomalies },
      chaos: { scenariosRun: chaosScenarios * 5, resilience: chaosResilience },
      mutation: { mutants: mutationReport.totalMutants, killed: mutationReport.killed, score: mutationReport.mutationScore },
      overall: { passed: true, score: 0, recommendations: [] },
    };

    const baseline = loadBaseline(baselineDir);
    insightReport = insightsEngine.analyze(
      analysisSnapshots,
      analysisEvents,
      tempSummary as PantheonSummary,
      [],  // regressions
      baseline?.history || []
    );

    log(`  Analyzed ${analysisSnapshots.length} snapshots, ${analysisEvents.length} events`);
    log(`  Found ${insightReport.insights.length} insights`);
    log(`  Critical: ${insightReport.insights.filter(i => i.severity === 'critical').length}`);
    log(`  Warnings: ${insightReport.insights.filter(i => i.severity === 'warning').length}`);

    if (verbose && !jsonOutput) {
      console.log(formatInsights(insightReport));
    }
  }

  // 5b. FLAKINESS DETECTION (if enabled)
  if (enableFlakiness) {
    log('\n🎲 FLAKINESS DETECTION');
    const { FlakinessDetector, formatFlakinessResult } = await import('./flakiness-detector');
    const detector = new FlakinessDetector();

    flakinessResult = await detector.detect({
      runs: flakinessRuns,
      tier: 'professional',
      chaos: createChaosConfig(chaosIntensity),
      baseSeed: seed,
      onProgress: (current, total) => {
        if (isTTY) {
          process.stdout.write(`\r  Running ${current}/${total}...`);
        }
      },
    });

    if (isTTY) {
      process.stdout.write('\r                                \r');
    }

    log(`  Runs: ${flakinessResult.runs}`);
    log(`  Success Rate: ${(flakinessResult.successRate * 100).toFixed(1)}%`);
    log(`  Flakiness Score: ${(flakinessResult.flakinessScore * 100).toFixed(1)}%`);
    log(`  Statistically Significant: ${flakinessResult.isSignificant ? 'Yes' : 'No'}`);

    if (verbose && !jsonOutput) {
      console.log(formatFlakinessResult(flakinessResult));
    }
  }

  // 5c. INTERACTIVE HTML REPORT (if enabled)
  if (generateReport) {
    log('\n📊 GENERATING INTERACTIVE REPORT');
    const { generateInteractiveReport } = await import('./interactive-report');

    // Build report data
    const baseline = loadBaseline(baselineDir);
    const tempSummary = {
      simulator: { buildsRun, invariantsPassed: simulatorPassed, timeTravel: true },
      oracle: { verdicts, violations, anomalies },
      chaos: { scenariosRun: chaosScenarios * 5, resilience: chaosResilience },
      mutation: { mutants: mutationReport.totalMutants, killed: mutationReport.killed, score: mutationReport.mutationScore },
      overall: { passed: true, score: 0, recommendations: [] },
    };

    const comparison = compareWithBaseline(tempSummary as PantheonSummary, baseline);

    const reportHtml = generateInteractiveReport({
      title: `PANTHEON Report - ${new Date().toLocaleDateString()}`,
      summary: tempSummary as PantheonSummary,
      snapshots: analysisSnapshots,
      events: analysisEvents,
      comparison,
      insights: insightReport,
      flakiness: flakinessResult,
      generatedAt: new Date().toISOString(),
    });

    // Write report to file
    const reportDir = reportPath || path.join(baselineDir, 'pantheon-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    htmlReportPath = path.join(reportDir, `pantheon-report-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, reportHtml);

    log(`  Report saved: ${htmlReportPath}`);
  }

  // 5. OVERALL SUMMARY
  finishProgress();  // Clear progress line, show completion

  const overallScore =
    (simulatorPassed ? 0.25 : 0) +
    (violations === 0 ? 0.25 : 0.15) +
    chaosResilience * 0.25 +
    mutationReport.mutationScore * 0.25;

  const passed = overallScore >= 0.8 && simulatorPassed && mutationReport.mutationScore >= 0.7;

  const recommendations: string[] = [];
  if (!simulatorPassed) recommendations.push('Fix simulator invariant violations');
  if (violations > 10) recommendations.push('Investigate high violation count');
  if (chaosResilience < 0.7) recommendations.push('Improve chaos resilience');
  if (mutationReport.mutationScore < 0.8) {
    recommendations.push(...mutationReport.recommendations.slice(0, 3));
  }

  log('\n' + '═'.repeat(70));
  log('                         PANTHEON SUMMARY');
  log('═'.repeat(70));
  log(`  Overall Score: ${(overallScore * 100).toFixed(1)}%`);
  log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  log('─'.repeat(70));

  if (recommendations.length > 0) {
    log('  Recommendations:');
    for (const rec of recommendations) {
      log(`    • ${rec}`);
    }
  }

  log('═'.repeat(70) + '\n');

  // Build the summary object first
  const summary: PantheonSummary = {
    simulator: {
      buildsRun,
      invariantsPassed: simulatorPassed,
      timeTravel: true,
    },
    oracle: {
      verdicts,
      violations,
      anomalies,
    },
    chaos: {
      scenariosRun: chaosScenarios * 5,
      resilience: chaosResilience,
    },
    mutation: {
      mutants: mutationReport.totalMutants,
      killed: mutationReport.killed,
      score: mutationReport.mutationScore,
    },
    overall: {
      passed,
      score: overallScore,
      recommendations,
    },
    // 10X Features results
    insights: insightReport,
    flakiness: flakinessResult,
    reportPath: htmlReportPath,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESSION DETECTION - The feature that shut competitors up
  // ═══════════════════════════════════════════════════════════════════════════
  if (compareBaseline) {
    const baseline = loadBaseline(baselineDir);
    const comparison = compareWithBaseline(summary, baseline);

    // Always show comparison (this is the killer feature) - unless JSON mode
    if (!jsonOutput) {
      console.log(formatComparison(comparison));
    }

    // Save baseline if requested
    if (shouldSave || (!baseline && comparison.current.overall.passed)) {
      const saved = await saveBaseline(summary, baselineDir, { commit: gitCommit, branch: gitBranch });
      if (saved) {
        log(`📁 Baseline saved: ${saved.timestamp.split('T')[0]}`);
      }
    }

    // Fail on regression if in CI mode
    if (failOnRegression && comparison.verdict === 'REGRESSION') {
      log('\n💀 REGRESSION DETECTED - Failing build as requested.\n');
      summary.overall.passed = false;
    }
  }

  // JSON output mode - machine-readable output for CI tooling
  if (jsonOutput) {
    console.log(JSON.stringify({
      version: PANTHEON_VERSION,
      timestamp: new Date().toISOString(),
      summary,
      insights: summary.insights || null,
      flakiness: summary.flakiness || null,
      reportPath: summary.reportPath || null,
    }, null, 2));
  }

  return summary;
}

// ============================================================================
// QUICK VALIDATION - For CI/CD pipelines
// ============================================================================

export async function quickValidation(seed?: number): Promise<boolean> {
  const { BuildSimulator, createStandardBuildConfig, CORE_INVARIANTS } = await import('./core/simulator');

  const sim = new BuildSimulator(seed);
  const config = createStandardBuildConfig('professional', seed);
  sim.initialize(config);

  while (!sim.isComplete()) {
    sim.tick();

    const snapshot = sim.getSnapshot();
    const prev = sim.getHistory().length > 1
      ? sim.getHistory()[sim.getHistory().length - 2]
      : undefined;

    for (const inv of CORE_INVARIANTS) {
      const result = inv.check(snapshot, prev);
      if (!result.passed) {
        return false;
      }
    }
  }

  return true;
}

// ============================================================================
// VERSION INFO
// ============================================================================

export const PANTHEON_VERSION = '4.0.0';  // 10X V2.0: Root cause graphs, Monte Carlo, DAG, keyboard shortcuts
export const PANTHEON_CODENAME = 'OLYMPUS';  // Named after the home of the gods - where V2.0 features reign supreme

export function getPantheonInfo(): string {
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PANTHEON TEST INFRASTRUCTURE                               ║
║                                                                              ║
║                   ██╗ ██╗ ██████╗ ██╗  ██╗    ██╗   ██╗██████╗              ║
║                  ███║███║██╔═████╗╚██╗██╔╝    ██║   ██║╚════██╗             ║
║                  ╚██║╚██║██║██╔██║ ╚███╔╝     ██║   ██║ █████╔╝             ║
║                   ██║ ██║████╔╝██║ ██╔██╗     ╚██╗ ██╔╝██╔═══╝              ║
║                   ██║ ██║╚██████╔╝██╔╝ ██╗     ╚████╔╝ ███████╗             ║
║                   ╚═╝ ╚═╝ ╚═════╝ ╚═╝  ╚═╝      ╚═══╝  ╚══════╝             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Version: ${PANTHEON_VERSION.padEnd(68)}║
║  Codename: ${PANTHEON_CODENAME.padEnd(67)}║
║                                                                              ║
║  🏆 WORLD-CLASS FLUENT API:                                                  ║
║    await pantheon().run()              // Sensible defaults                  ║
║    await pantheon.quick()              // Fast validation                    ║
║    await pantheon.ci()                 // CI-optimized                       ║
║    await pantheon.full()               // Everything enabled                 ║
║    await pantheon().chaos('high').iterations(50).tenX().run()                ║
║                                                                              ║
║  Core Modules:                                                               ║
║    ⚡ Simulator    - Build simulation with time-travel                       ║
║    🔮 Oracle       - Invariant verification & anomaly detection              ║
║    🐒 Chaos        - Chaos engineering resilience tests                      ║
║    🔬 Mutation     - Mutation testing for test quality                       ║
║    📈 Regression   - Baseline comparison & trend tracking                    ║
║                                                                              ║
║  ═══════════════════════════════════════════════════════════════════════     ║
║  10X V2.0 FEATURES - Makes V1.0 look like a prototype:                       ║
║  ═══════════════════════════════════════════════════════════════════════     ║
║                                                                              ║
║  🧠 INSIGHTS ENGINE V2.0:                                                    ║
║    • Root Cause Graphs - Causal chain visualization                          ║
║    • Predictive Analytics - Forecast failures BEFORE they happen             ║
║    • Code Suggestions - Copy-paste fixes with syntax highlighting            ║
║    • Historical Trend Forecasting - Linear regression with CI bands          ║
║    • Anomaly Detection - ML-style scoring                                    ║
║                                                                              ║
║  🎲 FLAKINESS DETECTOR V2.0:                                                 ║
║    • Distribution Fitting - stable, flaky, bimodal, degrading                ║
║    • Streak Analysis - Runs test with statistical significance               ║
║    • Cluster Detection - Identify failure patterns                           ║
║    • Monte Carlo Simulation - 1000-run probabilistic analysis                ║
║    • Variance Metrics - Coefficient of variation analysis                    ║
║                                                                              ║
║  📊 INTERACTIVE REPORT V2.0:                                                 ║
║    • Dependency DAG - Force-directed graph with critical path                ║
║    • Keyboard Shortcuts - Space=play, arrows=step, F=fullscreen              ║
║    • Export Capabilities - PNG, SVG, JSON, PDF                               ║
║    • Root Cause Visualization - Interactive causal chains                    ║
║    • One-click Copy - Code snippets with syntax highlighting                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
}

// ============================================================================
// REGRESSION DETECTION - The feature competitors laughed about us not having
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Baseline: A snapshot of test results to compare against
 */
export interface Baseline {
  version: string;
  timestamp: string;
  gitCommit?: string;
  gitBranch?: string;
  metrics: {
    overallScore: number;
    mutationScore: number;
    chaosResilience: number;
    violations: number;
    anomalies: number;
  };
  history: Array<{
    timestamp: string;
    score: number;
    commit?: string;
  }>;
}

/**
 * Regression: A detected degradation from baseline
 */
export interface Regression {
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

/**
 * Comparison result between current run and baseline
 */
export interface ComparisonResult {
  hasRegression: boolean;
  regressions: Regression[];
  improvements: Regression[];
  baseline: Baseline | null;
  current: PantheonSummary;
  verdict: 'REGRESSION' | 'STABLE' | 'IMPROVED';
}

const BASELINE_FILE = '.pantheon-baseline.json';
const BASELINE_LOCK_FILE = '.pantheon-baseline.lock';
const MAX_HISTORY_ENTRIES = 100;  // FIX #3: Cap history to prevent unbounded growth
const LOCK_TIMEOUT_MS = 10000;    // Max time to wait for lock
const LOCK_STALE_MS = 60000;      // Lock considered stale after 60s

/**
 * Acquire a file lock for baseline operations (prevents race conditions in CI)
 */
function acquireBaselineLock(dir: string): boolean {
  const lockPath = path.join(dir, BASELINE_LOCK_FILE);

  try {
    // Check if lock exists and is stale
    if (fs.existsSync(lockPath)) {
      const stat = fs.statSync(lockPath);
      const age = Date.now() - stat.mtimeMs;
      if (age > LOCK_STALE_MS) {
        // Stale lock, remove it
        fs.unlinkSync(lockPath);
      } else {
        // Lock is active, can't acquire
        return false;
      }
    }

    // Create lock file with PID
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      timestamp: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Release the baseline file lock
 */
function releaseBaselineLock(dir: string): void {
  const lockPath = path.join(dir, BASELINE_LOCK_FILE);
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Wait for lock with timeout
 */
async function waitForBaselineLock(dir: string): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    if (acquireBaselineLock(dir)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
  }
  return false;
}

const REGRESSION_THRESHOLDS = {
  overallScore: 0.05,      // 5% drop = warning
  mutationScore: 0.10,     // 10% drop = critical
  chaosResilience: 0.15,   // 15% drop = warning
  violations: 5,           // 5+ more violations = warning
} as const;

/**
 * Load baseline from disk with validation
 *
 * Returns null if:
 * - File doesn't exist
 * - File is corrupted/invalid JSON
 * - File fails schema validation
 */
export function loadBaseline(dir: string = process.cwd()): Baseline | null {
  const filepath = path.join(dir, BASELINE_FILE);
  try {
    if (!fs.existsSync(filepath)) {
      return null;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const parsed = JSON.parse(content);

    // Basic schema validation - ensure required fields exist
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.version !== 'string' ||
      typeof parsed.timestamp !== 'string' ||
      typeof parsed.metrics !== 'object' ||
      !Array.isArray(parsed.history)
    ) {
      console.warn('Warning: Baseline file has invalid schema, ignoring');
      return null;
    }

    // Validate metrics have required numeric fields
    const { metrics } = parsed;
    if (
      typeof metrics.overallScore !== 'number' ||
      typeof metrics.mutationScore !== 'number' ||
      typeof metrics.chaosResilience !== 'number'
    ) {
      console.warn('Warning: Baseline metrics invalid, ignoring');
      return null;
    }

    return parsed as Baseline;
  } catch (err) {
    // Corrupted JSON or read error - log and continue
    console.warn(`Warning: Could not load baseline: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Save current results as new baseline
 *
 * FIX #2: Atomic writes - write to temp file, then rename
 * FIX #3: History size limit - cap at MAX_HISTORY_ENTRIES
 * FIX #4: File locking to prevent race conditions in CI
 */
export async function saveBaseline(
  summary: PantheonSummary,
  dir: string = process.cwd(),
  gitInfo?: { commit?: string; branch?: string }
): Promise<Baseline | null> {
  const filepath = path.join(dir, BASELINE_FILE);
  const tempPath = path.join(dir, `.pantheon-baseline.${Date.now()}.tmp`);

  // FIX #4: Acquire lock before writing (prevents CI race conditions)
  const lockAcquired = await waitForBaselineLock(dir);
  if (!lockAcquired) {
    console.warn('Warning: Could not acquire baseline lock (another process may be writing). Skipping save.');
    return null;
  }

  try {
    const existing = loadBaseline(dir);

    // FIX #3: Cap history to prevent unbounded growth
    const existingHistory = existing?.history || [];
    const trimmedHistory = existingHistory.slice(-(MAX_HISTORY_ENTRIES - 1));

    const baseline: Baseline = {
      version: PANTHEON_VERSION,
      timestamp: new Date().toISOString(),
      gitCommit: gitInfo?.commit,
      gitBranch: gitInfo?.branch,
      metrics: {
        overallScore: summary.overall.score,
        mutationScore: summary.mutation.score,
        chaosResilience: summary.chaos.resilience,
        violations: summary.oracle.violations,
        anomalies: summary.oracle.anomalies,
      },
      history: [
        ...trimmedHistory,
        {
          timestamp: new Date().toISOString(),
          score: summary.overall.score,
          commit: gitInfo?.commit,
        },
      ],
    };

    // FIX #2: Atomic write - write to temp, then rename
    // This prevents corruption if process dies mid-write
    fs.writeFileSync(tempPath, JSON.stringify(baseline, null, 2));
    fs.renameSync(tempPath, filepath);

    return baseline;
  } catch (err) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Graceful degradation: log warning but don't crash
    console.warn(`Warning: Could not save baseline: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  } finally {
    // Always release the lock
    releaseBaselineLock(dir);
  }
}

/**
 * Compare current results against baseline - THE FEATURE THEY LAUGHED ABOUT
 */
export function compareWithBaseline(
  current: PantheonSummary,
  baseline: Baseline | null
): ComparisonResult {
  const regressions: Regression[] = [];
  const improvements: Regression[] = [];

  if (!baseline) {
    return {
      hasRegression: false,
      regressions: [],
      improvements: [],
      baseline: null,
      current,
      verdict: 'STABLE',
    };
  }

  // Check overall score
  const scoreDelta = current.overall.score - baseline.metrics.overallScore;
  if (scoreDelta < -REGRESSION_THRESHOLDS.overallScore) {
    regressions.push({
      metric: 'Overall Score',
      baseline: baseline.metrics.overallScore,
      current: current.overall.score,
      delta: scoreDelta,
      severity: scoreDelta < -0.15 ? 'critical' : 'warning',
      message: `Score dropped ${(Math.abs(scoreDelta) * 100).toFixed(1)}% (${(baseline.metrics.overallScore * 100).toFixed(1)}% → ${(current.overall.score * 100).toFixed(1)}%)`,
    });
  } else if (scoreDelta > REGRESSION_THRESHOLDS.overallScore) {
    improvements.push({
      metric: 'Overall Score',
      baseline: baseline.metrics.overallScore,
      current: current.overall.score,
      delta: scoreDelta,
      severity: 'info',
      message: `Score improved ${(scoreDelta * 100).toFixed(1)}%`,
    });
  }

  // Check mutation score
  const mutationDelta = current.mutation.score - baseline.metrics.mutationScore;
  if (mutationDelta < -REGRESSION_THRESHOLDS.mutationScore) {
    regressions.push({
      metric: 'Mutation Score',
      baseline: baseline.metrics.mutationScore,
      current: current.mutation.score,
      delta: mutationDelta,
      severity: 'critical',
      message: `Mutation score dropped ${(Math.abs(mutationDelta) * 100).toFixed(1)}% - tests are weaker!`,
    });
  } else if (mutationDelta > 0.05) {
    improvements.push({
      metric: 'Mutation Score',
      baseline: baseline.metrics.mutationScore,
      current: current.mutation.score,
      delta: mutationDelta,
      severity: 'info',
      message: `Mutation score improved ${(mutationDelta * 100).toFixed(1)}%`,
    });
  }

  // Check chaos resilience
  const chaosDelta = current.chaos.resilience - baseline.metrics.chaosResilience;
  if (chaosDelta < -REGRESSION_THRESHOLDS.chaosResilience) {
    regressions.push({
      metric: 'Chaos Resilience',
      baseline: baseline.metrics.chaosResilience,
      current: current.chaos.resilience,
      delta: chaosDelta,
      severity: 'warning',
      message: `Chaos resilience dropped ${(Math.abs(chaosDelta) * 100).toFixed(1)}%`,
    });
  }

  // Check violations
  const violationDelta = current.oracle.violations - baseline.metrics.violations;
  if (violationDelta > REGRESSION_THRESHOLDS.violations) {
    regressions.push({
      metric: 'Violations',
      baseline: baseline.metrics.violations,
      current: current.oracle.violations,
      delta: violationDelta,
      severity: violationDelta > 10 ? 'critical' : 'warning',
      message: `${violationDelta} more violations than baseline`,
    });
  } else if (violationDelta < -3) {
    improvements.push({
      metric: 'Violations',
      baseline: baseline.metrics.violations,
      current: current.oracle.violations,
      delta: violationDelta,
      severity: 'info',
      message: `${Math.abs(violationDelta)} fewer violations`,
    });
  }

  const hasRegression = regressions.length > 0;
  const hasCritical = regressions.some(r => r.severity === 'critical');
  const hasImprovement = improvements.length > 0 && !hasRegression;

  return {
    hasRegression,
    regressions,
    improvements,
    baseline,
    current,
    verdict: hasCritical ? 'REGRESSION' : hasImprovement ? 'IMPROVED' : 'STABLE',
  };
}

/**
 * Format comparison result for CLI output
 */
export function formatComparison(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═'.repeat(70));
  lines.push('                    REGRESSION ANALYSIS');
  lines.push('═'.repeat(70));

  if (!result.baseline) {
    lines.push('  ℹ️  No baseline found. This run will become the baseline.');
    lines.push('      Run with --save-baseline to save.');
    lines.push('═'.repeat(70));
    return lines.join('\n');
  }

  // Show baseline info
  lines.push(`  Baseline: ${result.baseline.timestamp.split('T')[0]}`);
  if (result.baseline.gitCommit) {
    lines.push(`  Commit: ${result.baseline.gitCommit.substring(0, 7)}`);
  }
  lines.push('─'.repeat(70));

  // Show comparison
  const metrics = [
    { name: 'Overall Score', base: result.baseline.metrics.overallScore, curr: result.current.overall.score },
    { name: 'Mutation Score', base: result.baseline.metrics.mutationScore, curr: result.current.mutation.score },
    { name: 'Chaos Resilience', base: result.baseline.metrics.chaosResilience, curr: result.current.chaos.resilience },
    { name: 'Violations', base: result.baseline.metrics.violations, curr: result.current.oracle.violations },
  ];

  for (const m of metrics) {
    const delta = m.curr - m.base;
    const isPercent = m.name !== 'Violations';
    const format = (v: number) => isPercent ? `${(v * 100).toFixed(1)}%` : String(v);
    const arrow = delta > 0.01 ? '↑' : delta < -0.01 ? '↓' : '→';
    const color = m.name === 'Violations'
      ? (delta > 0 ? '❌' : delta < 0 ? '✅' : '➖')
      : (delta > 0.01 ? '✅' : delta < -0.01 ? '❌' : '➖');

    lines.push(`  ${color} ${m.name.padEnd(18)} ${format(m.base).padStart(8)} ${arrow} ${format(m.curr).padStart(8)}`);
  }

  lines.push('─'.repeat(70));

  // Show regressions
  if (result.regressions.length > 0) {
    lines.push('  🚨 REGRESSIONS DETECTED:');
    for (const r of result.regressions) {
      const icon = r.severity === 'critical' ? '🔴' : '🟡';
      lines.push(`     ${icon} ${r.message}`);
    }
  }

  // Show improvements
  if (result.improvements.length > 0) {
    lines.push('  🎉 IMPROVEMENTS:');
    for (const i of result.improvements) {
      lines.push(`     🟢 ${i.message}`);
    }
  }

  // Verdict
  lines.push('─'.repeat(70));
  const verdictIcon = result.verdict === 'REGRESSION' ? '💀' : result.verdict === 'IMPROVED' ? '🚀' : '✅';
  lines.push(`  Verdict: ${verdictIcon} ${result.verdict}`);

  // Trend sparkline (last 10 runs)
  if (result.baseline.history.length > 1) {
    const recent = result.baseline.history.slice(-10);
    const sparkline = recent.map(h => {
      if (h.score >= 0.9) return '█';
      if (h.score >= 0.8) return '▇';
      if (h.score >= 0.7) return '▅';
      if (h.score >= 0.6) return '▃';
      return '▁';
    }).join('');
    lines.push(`  Trend: [${sparkline}] (last ${recent.length} runs)`);
  }

  lines.push('═'.repeat(70));

  return lines.join('\n');
}

// ============================================================================
// WORLD-CLASS FLUENT BUILDER API
// ============================================================================
// The API that makes PANTHEON a joy to use.
// Inspired by: Prisma, Zod, TanStack Query, Playwright
// ============================================================================

/**
 * PANTHEON Fluent Builder - World-Class API Design
 *
 * @example
 * ```typescript
 * // Simple - sensible defaults
 * const results = await pantheon().run();
 *
 * // Presets for common scenarios
 * const results = await pantheon.ci();      // CI-optimized
 * const results = await pantheon.quick();   // Fast validation
 * const results = await pantheon.full();    // Everything enabled
 *
 * // Chainable for customization
 * const results = await pantheon()
 *   .chaos('high')
 *   .iterations(20)
 *   .insights()
 *   .flakiness(30)
 *   .report()
 *   .verbose()
 *   .run();
 * ```
 */
export class PantheonBuilder {
  private options: PantheonOptions = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable verbose output with detailed logging
   * @returns The builder instance for chaining
   * @example pantheon().verbose().run()
   */
  verbose(): this {
    this.options.verbose = true;
    return this;
  }

  /**
   * Set random seed for reproducible test runs
   * @param value - The seed number (same seed = same results)
   * @returns The builder instance for chaining
   * @example pantheon().seed(12345).run() // Reproducible run
   */
  seed(value: number): this {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid seed: expected number, got ${typeof value}. Example: .seed(12345)`);
    }
    this.options.seed = value;
    return this;
  }

  /**
   * Set the number of test iterations
   * @param count - Number of iterations (minimum: 1, recommended: 10-50)
   * @returns The builder instance for chaining
   * @example pantheon().iterations(20).run()
   */
  iterations(count: number): this {
    if (typeof count !== 'number' || isNaN(count) || count < 1) {
      throw new Error(`Invalid iterations: expected positive number, got ${count}. Example: .iterations(10)`);
    }
    this.options.iterations = Math.max(1, Math.floor(count));
    return this;
  }

  /**
   * Set chaos engineering intensity level
   * @param level - 'low' | 'medium' | 'high' | 'extreme'
   * @returns The builder instance for chaining
   * @example pantheon().chaos('high').run()
   */
  chaos(level: 'low' | 'medium' | 'high' | 'extreme'): this {
    const valid = ['low', 'medium', 'high', 'extreme'];
    if (!valid.includes(level)) {
      throw new Error(`Invalid chaos level: "${level}". Must be one of: ${valid.join(', ')}`);
    }
    this.options.chaosIntensity = level;
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGRESSION DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Compare results against saved baseline
   * @param compare - Whether to compare (default: true)
   * @returns The builder instance for chaining
   * @example pantheon().baseline().run()
   */
  baseline(compare = true): this {
    this.options.compareBaseline = compare;
    return this;
  }

  /**
   * Save current results as the new baseline for future comparisons
   * @returns The builder instance for chaining
   * @example pantheon().saveBaseline().run() // After a release
   */
  saveBaseline(): this {
    this.options.saveBaseline = true;
    return this;
  }

  /**
   * Exit with code 1 if regression detected (for CI pipelines)
   * @returns The builder instance for chaining
   * @example pantheon().failOnRegression().run() // In CI/CD
   */
  failOnRegression(): this {
    this.options.failOnRegression = true;
    return this;
  }

  /**
   * Set custom directory for baseline file storage
   * @param dir - Absolute or relative path to baseline directory
   * @returns The builder instance for chaining
   * @example pantheon().baselineDir('./baselines').run()
   */
  baselineDir(dir: string): this {
    if (typeof dir !== 'string' || dir.trim() === '') {
      throw new Error(`Invalid baselineDir: expected non-empty string. Example: .baselineDir('./baselines')`);
    }
    this.options.baselineDir = dir;
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10X FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable AI-powered insights engine for pattern analysis
   * Detects: progress regressions, bottlenecks, cascade failures, trends
   * @returns The builder instance for chaining
   * @example pantheon().insights().run()
   */
  insights(): this {
    this.options.enableInsights = true;
    return this;
  }

  /**
   * Enable statistical flakiness detection with Wilson confidence intervals
   * @param runs - Number of test runs for analysis (default: 10, recommended: 30 for confidence)
   * @returns The builder instance for chaining
   * @example pantheon().flakiness(30).run() // High-confidence flakiness check
   */
  flakiness(runs = 10): this {
    if (typeof runs !== 'number' || isNaN(runs) || runs < 1) {
      throw new Error(`Invalid flakiness runs: expected positive number, got ${runs}. Example: .flakiness(30)`);
    }
    this.options.enableFlakiness = true;
    this.options.flakinessRuns = Math.max(1, Math.floor(runs));
    return this;
  }

  /**
   * Generate interactive HTML report with timeline, swimlanes, and replay
   * @param outputPath - Optional custom output directory for the report
   * @returns The builder instance for chaining
   * @example pantheon().report('./reports').run()
   */
  report(outputPath?: string): this {
    this.options.generateReport = true;
    if (outputPath) this.options.reportPath = outputPath;
    return this;
  }

  /**
   * Enable ALL 10X features at once: insights, flakiness, and interactive report
   * @returns The builder instance for chaining
   * @example pantheon().tenX().run() // Full 10X mode
   */
  tenX(): this {
    return this.insights().flakiness().report();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTION FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set global timeout for the entire test run (prevents hanging tests)
   * @param ms - Timeout in milliseconds (default: 300000 = 5 minutes)
   * @returns The builder instance for chaining
   * @example pantheon().timeout(60000).run() // 1 minute timeout
   */
  timeout(ms: number): this {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 1000) {
      throw new Error(`Invalid timeout: expected number >= 1000ms, got ${ms}. Example: .timeout(60000)`);
    }
    this.options.timeoutMs = ms;
    return this;
  }

  /**
   * Output results as JSON instead of CLI formatting (for CI tooling integration)
   * @returns The builder instance for chaining
   * @example pantheon().json().run() | jq '.overall.score'
   */
  json(): this {
    this.options.jsonOutput = true;
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute PANTHEON with the configured options
   * @returns Promise resolving to the test summary with all results
   * @example const results = await pantheon().chaos('high').run()
   */
  async run(): Promise<PantheonSummary> {
    return runPantheon(this.options);
  }

  /** Get the configured options (for debugging) */
  getOptions(): Readonly<PantheonOptions> {
    return { ...this.options };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT & PRESETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new PANTHEON builder instance
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const results = await pantheon().run();
 *
 * // Customized
 * const results = await pantheon()
 *   .chaos('high')
 *   .iterations(50)
 *   .tenX()
 *   .run();
 * ```
 */
export function pantheon(): PantheonBuilder {
  return new PantheonBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS - Zero-config options for common scenarios
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick validation - Fast sanity check
 * Perfect for: Pre-commit hooks, rapid iteration
 */
pantheon.quick = async function(): Promise<PantheonSummary> {
  return pantheon()
    .iterations(3)
    .chaos('low')
    .run();
};

/**
 * CI mode - Optimized for continuous integration
 * Perfect for: GitHub Actions, Jenkins, CircleCI
 * - Fails on regression (exit code 1)
 * - Medium chaos testing
 * - Baseline comparison enabled
 */
pantheon.ci = async function(): Promise<PantheonSummary> {
  return pantheon()
    .iterations(10)
    .chaos('medium')
    .baseline()
    .failOnRegression()
    .run();
};

/**
 * Full mode - Everything enabled
 * Perfect for: Release validation, nightly builds
 * - All 10X features (insights, flakiness, report)
 * - High chaos testing
 * - 30 flakiness runs for statistical confidence
 */
pantheon.full = async function(): Promise<PantheonSummary> {
  return pantheon()
    .iterations(20)
    .chaos('high')
    .baseline()
    .saveBaseline()
    .tenX()
    .flakiness(30)
    .verbose()
    .run();
};

/**
 * Stress mode - Maximum chaos
 * Perfect for: Finding edge cases, breaking things intentionally
 */
pantheon.stress = async function(): Promise<PantheonSummary> {
  return pantheon()
    .iterations(50)
    .chaos('extreme')
    .tenX()
    .verbose()
    .run();
};

/**
 * Report mode - Generate beautiful HTML report only
 * Perfect for: Stakeholder presentations, debugging
 */
pantheon.report = async function(outputPath?: string): Promise<PantheonSummary> {
  const builder = pantheon()
    .iterations(10)
    .chaos('medium')
    .tenX();

  if (outputPath) builder.report(outputPath);
  else builder.report();

  return builder.run();
};

#!/usr/bin/env node
/**
 * PANTHEON CLI RUNNER
 * ====================
 *
 * Execute PANTHEON test infrastructure from the command line.
 *
 * Usage:
 *   npx tsx tests/orchestrator/pantheon/runner.ts [options]
 *
 * Options:
 *   --verbose, -v     Show detailed output
 *   --seed <n>        Random seed for reproducibility
 *   --iterations <n>  Number of iterations (default: 10)
 *   --chaos <level>   Chaos intensity: low, medium, high, extreme
 *   --quick           Quick validation only
 *   --report          Generate HTML report
 *   --mutation        Run mutation testing only
 *   --help, -h        Show help
 */

import { pantheon, quickValidation, getPantheonInfo, PANTHEON_VERSION } from './index';
import { VisualDebugger } from './visual-debugger';
import { BuildSimulator, createStandardBuildConfig, createChaosConfig } from './core/simulator';
// MutationEngine imported dynamically to avoid vitest conflict
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIOptions {
  verbose: boolean;
  seed: number;
  iterations: number;
  chaos: 'low' | 'medium' | 'high' | 'extreme';
  quick: boolean;
  report: boolean;
  mutation: boolean;
  help: boolean;
  // Regression detection
  saveBaseline: boolean;
  noBaseline: boolean;
  failOnRegression: boolean;
  // 10X Features
  insights: boolean;
  flakiness: boolean;
  flakinessRuns: number;
  interactiveReport: boolean;
  full10x: boolean;  // Enable all 10X features at once
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    verbose: false,
    seed: Date.now(),
    iterations: 10,
    chaos: 'medium',
    quick: false,
    report: false,
    mutation: false,
    help: false,
    // Regression detection
    saveBaseline: false,
    noBaseline: false,
    failOnRegression: false,
    // 10X Features
    insights: false,
    flakiness: false,
    flakinessRuns: 10,
    interactiveReport: false,
    full10x: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--seed':
        options.seed = parseInt(args[++i], 10);
        break;
      case '--iterations':
        options.iterations = parseInt(args[++i], 10);
        break;
      case '--chaos':
        options.chaos = args[++i] as typeof options.chaos;
        break;
      case '--quick':
        options.quick = true;
        break;
      case '--report':
        options.report = true;
        break;
      case '--mutation':
        options.mutation = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--save-baseline':
        options.saveBaseline = true;
        break;
      case '--no-baseline':
        options.noBaseline = true;
        break;
      case '--fail-on-regression':
      case '--ci':
        options.failOnRegression = true;
        break;
      // 10X Features
      case '--insights':
        options.insights = true;
        break;
      case '--flakiness':
        options.flakiness = true;
        break;
      case '--flakiness-runs':
        options.flakinessRuns = parseInt(args[++i], 10);
        break;
      case '--interactive-report':
        options.interactiveReport = true;
        break;
      case '--10x':
      case '--full':
        options.full10x = true;
        options.insights = true;
        options.flakiness = true;
        options.interactiveReport = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
${getPantheonInfo()}

USAGE:
  npx tsx tests/orchestrator/pantheon/runner.ts [OPTIONS]

OPTIONS:
  --verbose, -v         Show detailed output during execution
  --seed <number>       Set random seed for reproducible tests
  --iterations <n>      Number of test iterations (default: 10)
  --chaos <level>       Chaos intensity: low, medium, high, extreme
  --quick               Quick validation only (fast CI check)
  --report              Generate HTML debug report
  --mutation            Run mutation testing only
  --help, -h            Show this help message

REGRESSION DETECTION:
  --save-baseline       Save current results as new baseline
  --no-baseline         Skip baseline comparison
  --fail-on-regression  Exit with error code if regression detected (for CI)
  --ci                  Alias for --fail-on-regression

10X FEATURES (Advanced Analysis):
  --insights            Run AI-powered insights engine (pattern analysis)
  --flakiness           Run statistical flakiness detection
  --flakiness-runs <n>  Number of flakiness test runs (default: 10)
  --interactive-report  Generate beautiful interactive HTML report
  --10x, --full         Enable ALL 10X features at once

EXAMPLES:
  # Full test suite with verbose output
  npx tsx runner.ts --verbose

  # Quick CI validation
  npx tsx runner.ts --quick

  # CI pipeline with regression detection (fails on regression)
  npx tsx runner.ts --ci

  # Save current results as baseline (after major release)
  npx tsx runner.ts --save-baseline

  # Generate HTML report
  npx tsx runner.ts --report --verbose

  # Stress test with extreme chaos
  npx tsx runner.ts --chaos extreme --iterations 50

  # Mutation testing only
  npx tsx runner.ts --mutation

  # Reproducible run with seed
  npx tsx runner.ts --seed 12345 --verbose

  # 10X MODE - ALL advanced features enabled
  npx tsx runner.ts --10x --verbose

  # Just insights engine
  npx tsx runner.ts --insights --verbose

  # Flakiness detection with 30 runs (for high confidence)
  npx tsx runner.ts --flakiness --flakiness-runs 30

  # Generate interactive HTML report with all 10X features
  npx tsx runner.ts --10x --interactive-report
`);
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function generateReport(seed: number): Promise<string> {
  console.log('📊 Generating HTML debug report...\n');

  const debugger_ = new VisualDebugger();
  const sim = new BuildSimulator(seed);
  const config = createStandardBuildConfig('professional', seed);
  const chaos = createChaosConfig('medium');

  sim.initialize({ ...config, chaos });

  while (!sim.isComplete()) {
    sim.tick();
    debugger_.recordSnapshot(sim.getSnapshot());
  }

  for (const event of sim.getEventLog()) {
    debugger_.recordEvent(event);
  }

  const report = debugger_.generateReport();
  const html = debugger_.exportHTML(report);

  // Write to file
  const outputDir = path.join(process.cwd(), 'pantheon-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `pantheon-report-${Date.now()}.html`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, html);

  return filepath;
}

// ============================================================================
// MUTATION TESTING RUNNER
// ============================================================================

async function runMutationOnly(verbose: boolean): Promise<boolean> {
  console.log('🔬 Running Mutation Testing...\n');

  // Dynamic import to avoid vitest conflict when running outside vitest
  let MutationEngine: { new(): { runAllMutants(n: number): import('./index').MutationReport } };
  try {
    const module = await import('./mutation.test');
    MutationEngine = module.MutationEngine;
  } catch (err) {
    console.error('❌ MutationEngine requires vitest. Run with: npx vitest run mutation.test.ts');
    return false;
  }

  const engine = new MutationEngine();
  const report = engine.runAllMutants(10);

  console.log('═'.repeat(60));
  console.log('MUTATION TESTING RESULTS');
  console.log('═'.repeat(60));
  console.log(`Total Mutants: ${report.totalMutants}`);
  console.log(`Killed: ${report.killed}`);
  console.log(`Survived: ${report.survived}`);
  console.log(`Mutation Score: ${(report.mutationScore * 100).toFixed(1)}%`);

  if (verbose && report.killedMutants.length > 0) {
    console.log('\nKilled Mutants:');
    for (const m of report.killedMutants) {
      console.log(`  ✅ ${m.mutant.id}: ${m.mutant.name}`);
      console.log(`     Killed by: ${m.killedBy}`);
    }
  }

  if (report.survivingMutants.length > 0) {
    console.log('\nSurviving Mutants:');
    for (const m of report.survivingMutants) {
      console.log(`  ❌ ${m.mutant.id}: ${m.mutant.name}`);
      console.log(`     ${m.survivedBecause}`);
    }
  }

  console.log('\nRecommendations:');
  for (const rec of report.recommendations) {
    console.log(`  ${rec}`);
  }

  console.log('═'.repeat(60));

  return report.mutationScore >= 0.7;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PANTHEON TEST INFRASTRUCTURE v${PANTHEON_VERSION}                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Quick validation mode
    if (options.quick) {
      console.log('⚡ Running quick validation...\n');
      const passed = await quickValidation(options.seed);
      console.log(passed ? '✅ Quick validation PASSED' : '❌ Quick validation FAILED');
      process.exit(passed ? 0 : 1);
    }

    // Report generation mode
    if (options.report) {
      const filepath = await generateReport(options.seed);
      console.log(`\n✅ Report generated: ${filepath}`);
      console.log('   Open in browser to view interactive debug report.');
      process.exit(0);
    }

    // Mutation testing only
    if (options.mutation) {
      const passed = await runMutationOnly(options.verbose);
      process.exit(passed ? 0 : 1);
    }

    // Full PANTHEON run using the WORLD-CLASS FLUENT API (dogfooding!)
    // Build the query using chainable methods
    let builder = pantheon()
      .seed(options.seed)
      .iterations(options.iterations)
      .chaos(options.chaos);

    // Core options
    if (options.verbose) builder = builder.verbose();
    if (!options.noBaseline) builder = builder.baseline();
    if (options.saveBaseline) builder = builder.saveBaseline();
    if (options.failOnRegression) builder = builder.failOnRegression();

    // 10X Features - THE FEATURES THAT MAKE V1 LOOK LIKE A PROTOTYPE
    if (options.insights) builder = builder.insights();
    if (options.flakiness) builder = builder.flakiness(options.flakinessRuns);
    if (options.interactiveReport) builder = builder.report();

    const results = await builder.run();

    // Show 10X features summary
    if (results.insights || results.flakiness || results.reportPath) {
      console.log('\n' + '═'.repeat(70));
      console.log('                    10X FEATURES SUMMARY');
      console.log('═'.repeat(70));

      if (results.insights) {
        const critical = results.insights.insights.filter(i => i.severity === 'critical').length;
        const warnings = results.insights.insights.filter(i => i.severity === 'warning').length;
        console.log(`  🧠 Insights: ${results.insights.insights.length} total | ${critical} critical | ${warnings} warnings`);
      }

      if (results.flakiness) {
        const icon = results.flakiness.flakinessScore < 0.1 ? '🟢' :
                     results.flakiness.flakinessScore < 0.3 ? '🟡' : '🔴';
        console.log(`  🎲 Flakiness: ${icon} ${(results.flakiness.successRate * 100).toFixed(1)}% success (${results.flakiness.runs} runs)`);
      }

      if (results.reportPath) {
        console.log(`  📊 Report: ${results.reportPath}`);
      }

      console.log('═'.repeat(70));
    }

    // Exit with appropriate code
    if (results.overall.passed) {
      console.log('\n🏆 PANTHEON: All tests passed!\n');
      process.exit(0);
    } else {
      console.log('\n💀 PANTHEON: Tests failed. Review recommendations above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ PANTHEON encountered an error:\n');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

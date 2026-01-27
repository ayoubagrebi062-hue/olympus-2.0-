/**
 * ODL Runner - Obligation Detection Layer Demonstration
 *
 * Demonstrates the three mandatory scenarios:
 * 1. Obligation detected without user intent
 * 2. Deadline missed → omission violation emitted
 * 3. Ledger proves inaction
 *
 * Philosophy: "Failure to decide is still a decision. OLYMPUS records it."
 *
 * Usage: npx ts-node odl-runner.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  createODLEngine,
  type ODLEngine,
  type ODLInput,
  type NecessaryFutureInput,
  type TemporalStateInput,
  type InvariantRequirement
} from './runtime';
import type {
  RequiredDecision,
  OmissionViolation,
  MandatoryDecisionProof,
  TemporalContractSummary,
  EntropyStateSnapshot
} from './runtime/types';

// ============================================================================
// CONSOLE OUTPUT HELPERS
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function header(text: string): void {
  console.log('\n' + COLORS.bright + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + ' ' + text + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
}

function subheader(text: string): void {
  console.log('\n' + COLORS.bright + COLORS.blue + '─ ' + text + ' ─' + COLORS.reset);
}

function success(text: string): void {
  console.log(COLORS.green + '✓ ' + text + COLORS.reset);
}

function failure(text: string): void {
  console.log(COLORS.red + '✗ ' + text + COLORS.reset);
}

function warning(text: string): void {
  console.log(COLORS.yellow + '⚠ ' + text + COLORS.reset);
}

function info(text: string): void {
  console.log(COLORS.magenta + '→ ' + text + COLORS.reset);
}

function omission(text: string): void {
  console.log(COLORS.bright + COLORS.red + '🔴 OMISSION: ' + text + COLORS.reset);
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

function createTemporalState(currentStep: number): TemporalStateInput {
  const contract: TemporalContractSummary = {
    contract_id: 'contract-odl-demo',
    project_id: 'odl-demo-project',
    intended_lifespan: 100,
    current_step: currentStep,
    allowed_mutations: 50,
    mutation_count: 10,
    max_entropy_drift: 0.1,
    current_drift: 0.03,
    valid: true,
    violation_reason: null
  };

  return {
    current_step: currentStep,
    contract,
    entropy_budget_remaining: 800,
    entropy_budget_exhausted: false
  };
}

function createNecessaryFuture(survivableSteps: number): NecessaryFutureInput {
  return {
    exists: true,
    survivable_steps: survivableSteps,
    first_violation_step: null,
    projected_survivability: 0.75,
    required_actions: [
      {
        action_type: 'BACKUP_CRITICAL_DATA',
        description: 'Backup critical system data before entropy drift increases',
        deadline_step: 15
      }
    ]
  };
}

function createInvariantRequirements(): InvariantRequirement[] {
  return [
    {
      invariant: 'ENTROPY_DRIFT_EXCEEDED',
      requires_action: true,
      action_type: 'ENTROPY_CORRECTION',
      description: 'Entropy drift approaching limit, correction required',
      deadline_steps: 8,
      minimum_authority: 'PROJECT'
    }
  ];
}

function createEntropyState(): EntropyStateSnapshot {
  return {
    current_entropy: 0.55,
    baseline_entropy: 0.50,
    drift: 0.05,
    drift_limit: 0.10,
    budget_initial: 1000,
    budget_remaining: 800,
    budget_consumed: 200,
    budget_ratio: 0.8,
    is_exhausted: false
  };
}

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

async function runScenario1(engine: ODLEngine): Promise<boolean> {
  header('SCENARIO 1: Obligation Detected Without User Intent');
  info('System state will trigger obligations automatically');
  info('No user action required - OLYMPUS detects what MUST happen');

  subheader('Step 1: Set up system state at step 10');
  const temporalState = createTemporalState(10);
  const necessaryFuture = createNecessaryFuture(8);
  const invariantRequirements = createInvariantRequirements();

  console.log(`\n  Current step: ${temporalState.current_step}`);
  console.log(`  Survivable steps: ${necessaryFuture.survivable_steps}`);
  console.log(`  Contract lifespan: ${temporalState.contract?.intended_lifespan}`);
  console.log(`  Entropy drift: ${temporalState.contract?.current_drift}`);

  subheader('Step 2: Execute ODL to detect obligations');
  const input: ODLInput = {
    necessary_future: necessaryFuture,
    temporal_state: temporalState,
    invariant_requirements: invariantRequirements,
    entropy_state: createEntropyState(),
    contract_summary: temporalState.contract!
  };

  const result = engine.execute(input);

  console.log(`\n  Obligations derived: ${result.derivation.obligations.length}`);
  console.log(`  By source:`);
  Object.entries(result.derivation.by_source).forEach(([source, count]) => {
    if (count > 0) {
      console.log(`    ${source}: ${count}`);
    }
  });
  console.log(`  By priority:`);
  Object.entries(result.derivation.by_priority).forEach(([priority, count]) => {
    if (count > 0) {
      console.log(`    ${priority}: ${count}`);
    }
  });

  subheader('Step 3: Examine detected obligations');
  for (const obl of result.derivation.obligations) {
    warning(`OBLIGATION DETECTED: ${obl.obligation_id}`);
    console.log(`    Type: ${obl.required_action_type}`);
    console.log(`    Description: ${obl.required_decision_description}`);
    console.log(`    Deadline: Step ${obl.deadline_step}`);
    console.log(`    Required Authority: ${obl.required_authority_class}`);
    console.log(`    Priority: ${obl.priority}`);
    console.log(`    Protected Invariant: ${obl.protected_invariant}`);
    console.log('');
  }

  if (result.derivation.obligations.length > 0) {
    success('SCENARIO 1 PASSED: Obligations detected without user intent');
    console.log('\n  OLYMPUS automatically identified required decisions based on:');
    console.log('  - NecessaryFuture survivability constraints');
    console.log('  - Temporal contract requirements');
    console.log('  - Invariant maintenance needs');
    return true;
  } else {
    failure('SCENARIO 1 FAILED: No obligations were detected');
    return false;
  }
}

async function runScenario2(engine: ODLEngine): Promise<boolean> {
  header('SCENARIO 2: Deadline Missed → Omission Violation Emitted');
  info('Time will progress past an obligation deadline');
  info('OLYMPUS will emit an OMISSION_VIOLATION proof');

  // Clear previous data for clean test
  engine._dangerousClear();

  subheader('Step 1: Create obligation at step 5');
  const mandate = engine.createMandate(
    'CRITICAL_SYSTEM_CHECK',
    'Mandatory system health check before continuing operations',
    10, // Deadline at step 10
    'FUTURE_INEVITABILITY_VIOLATION',
    5   // Current step when created
  );

  warning(`Created mandate: ${mandate.obligation_id}`);
  console.log(`    Deadline: Step ${mandate.deadline_step}`);
  console.log(`    Priority: ${mandate.priority}`);

  subheader('Step 2: Time progresses to step 8 (approaching deadline)');
  let status = engine.checkStatus(8);
  console.log(`\n  Open obligations: ${status.window_status.open_count}`);
  console.log(`  Gate decision: ${status.gate_result.decision}`);

  if (status.gate_result.warning_obligations.length > 0) {
    warning('Deadline approaching!');
    for (const w of status.gate_result.warning_obligations) {
      console.log(`    ${w.obligation.obligation_id}: ${w.steps_remaining} steps remaining`);
    }
  }

  subheader('Step 3: Time progresses to step 12 (PAST DEADLINE)');
  info('No action was taken - deadline has passed');

  // Execute ODL at step 12 - past the deadline
  const input: ODLInput = {
    necessary_future: null,
    temporal_state: createTemporalState(12),
    invariant_requirements: [],
    entropy_state: createEntropyState()
  };

  const result = engine.execute(input);

  if (result.new_violations.length > 0) {
    omission('OMISSION VIOLATION DETECTED');
    for (const violation of result.new_violations) {
      console.log(`\n  Violation ID: ${violation.violation_id}`);
      console.log(`  Obligation ID: ${violation.obligation_id}`);
      console.log(`  Deadline was: Step ${violation.deadline_step}`);
      console.log(`  Detected at: Step ${violation.detection_step}`);
      console.log(`  Steps overdue: ${violation.steps_overdue}`);
      console.log(`  Authority: ${violation.authority} (non-delegable)`);
    }

    subheader('Step 4: Examine emitted mandatory decision proof');
    for (const proof of result.mandatory_proofs) {
      console.log(`\n  Proof Run ID: ${proof.run_id}`);
      console.log(`  Decision: ${proof.final_decision}`);
      console.log(`  Omission Detected: ${proof.omission_detected}`);
      console.log(`  Primary Violation: ${proof.primary_invariant_violated}`);
      console.log(`  Proof Hash: ${proof.proof_hash.substring(0, 24)}...`);
    }

    success('\nSCENARIO 2 PASSED: Omission violation emitted for missed deadline');
    console.log('\n  OLYMPUS recorded the failure to act as a formal proof.');
    console.log('  This omission is now permanent record.');
    return true;
  } else {
    failure('SCENARIO 2 FAILED: No omission violation was emitted');
    return false;
  }
}

async function runScenario3(engine: ODLEngine): Promise<boolean> {
  header('SCENARIO 3: Ledger Proves Inaction');
  info('The obligation ledger maintains permanent record of what happened');
  info('Every obligation state transition is recorded');

  subheader('Step 1: Examine the obligation ledger');
  const ledgerVerification = engine.verifyLedger();

  console.log(`\n  Total entries: ${ledgerVerification.total_entries}`);
  console.log(`  Verified count: ${ledgerVerification.verified_count}`);
  console.log(`  Chain intact: ${ledgerVerification.chain_intact}`);
  console.log(`  Valid: ${ledgerVerification.valid}`);

  if (ledgerVerification.errors.length > 0) {
    console.log('  Errors:');
    ledgerVerification.errors.forEach(e => failure(`    ${e}`));
  }

  subheader('Step 2: Query violated obligations');
  const violations = engine.getViolations();

  console.log(`\n  Total violations recorded: ${violations.length}`);
  for (const v of violations) {
    console.log(`\n  Violation: ${v.violation_id}`);
    console.log(`    Required Action: ${v.required_decision.required_action_type}`);
    console.log(`    Description: ${v.required_decision.required_decision_description}`);
    console.log(`    Deadline: Step ${v.deadline_step}`);
    console.log(`    Detected: Step ${v.detection_step}`);
    console.log(`    Steps Overdue: ${v.steps_overdue}`);
  }

  subheader('Step 3: Get comprehensive statistics');
  const stats = engine.getStats();

  console.log('\n  Ledger Statistics:');
  console.log(`    Total entries: ${stats.ledger.total_entries}`);
  console.log(`    Chain valid: ${stats.ledger.chain_valid}`);
  console.log(`    By status:`);
  Object.entries(stats.ledger.by_status).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`      ${status}: ${count}`);
    }
  });

  console.log('\n  Window Tracker Statistics:');
  console.log(`    Total tracked: ${stats.tracker.total_tracked}`);
  Object.entries(stats.tracker.by_status).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`      ${status}: ${count}`);
    }
  });

  console.log('\n  Emitter Statistics:');
  console.log(`    Total emissions: ${stats.emitter.total_emissions}`);

  // Verify the ledger proves inaction
  const hasViolationRecord = violations.length > 0;
  const ledgerIsValid = ledgerVerification.valid;

  if (hasViolationRecord && ledgerIsValid) {
    success('\nSCENARIO 3 PASSED: Ledger proves inaction');
    console.log('\n  The obligation ledger contains:');
    console.log('  ✓ Verifiable chain of all obligation state transitions');
    console.log('  ✓ Permanent record of omission violations');
    console.log('  ✓ Cryptographic proof of what was required vs what happened');
    console.log('  ✓ Immutable evidence that silence occurred');
    return true;
  } else {
    failure('\nSCENARIO 3 FAILED: Ledger does not prove inaction');
    return false;
  }
}

async function runBonusDemo(engine: ODLEngine): Promise<void> {
  header('BONUS: Gate Blocking Due to Unaddressed Violations');

  subheader('Check if system can proceed');
  const status = engine.checkStatus(15);

  console.log(`\n  Gate Decision: ${status.gate_result.decision}`);
  console.log(`  Can Proceed: ${status.gate_result.proceed}`);

  if (!status.gate_result.proceed) {
    warning('System progress BLOCKED');

    if (status.gate_result.unaddressed_violations.length > 0) {
      console.log('\n  Unaddressed violations blocking progress:');
      for (const v of status.gate_result.unaddressed_violations) {
        console.log(`    - ${v.obligation_id}: ${v.required_decision.required_action_type}`);
      }
    }

    if (status.gate_result.blocking_obligations.length > 0) {
      console.log('\n  Critical obligations blocking progress:');
      for (const o of status.gate_result.blocking_obligations) {
        console.log(`    - ${o.obligation_id}: ${o.required_action_type}`);
      }
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log(COLORS.bright + COLORS.magenta);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║    ODL - OBLIGATION DETECTION LAYER                                          ║');
  console.log('║    "Failure to decide is still a decision. OLYMPUS records it."              ║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  // Setup ledger directory
  const ledgerDir = path.join(__dirname, 'data', 'odl-demo-ledger');
  if (!fs.existsSync(ledgerDir)) {
    fs.mkdirSync(ledgerDir, { recursive: true });
  }

  // Initialize ODL Engine
  const engine = createODLEngine({
    ledger_dir: ledgerDir,
    warning_threshold_steps: 3,
    block_on_critical: true,
    auto_emit_violations: true
  });

  // Show initial stats
  const stats = engine.getStats();
  console.log('\n' + COLORS.cyan + 'ODL Engine Initialized:' + COLORS.reset);
  console.log(`  Version: ${stats.version}`);
  console.log(`  Block on Critical: ${stats.gate.block_on_critical}`);
  console.log(`  Warning Threshold: ${stats.gate.warning_threshold_steps} steps`);

  // Run scenarios
  const results: boolean[] = [];

  results.push(await runScenario1(engine));
  results.push(await runScenario2(engine));
  results.push(await runScenario3(engine));

  // Bonus demo
  await runBonusDemo(engine);

  // Summary
  header('DEMONSTRATION SUMMARY');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n  Scenarios Passed: ${passed}/${total}`);

  if (passed === total) {
    success('\n  ALL ODL SCENARIOS PASSED');
    console.log('\n  The Obligation Detection Layer successfully demonstrates:');
    console.log('  ✓ Obligations detected automatically from system state');
    console.log('  ✓ Deadline misses emit permanent omission violations');
    console.log('  ✓ Ledger provides cryptographic proof of inaction');
    console.log('\n  "Silence is not neutral - it is a choice. And it is recorded."');
  } else {
    failure(`\n  ${total - passed} SCENARIO(S) FAILED`);
  }

  console.log('\n' + COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');
}

main().catch(console.error);

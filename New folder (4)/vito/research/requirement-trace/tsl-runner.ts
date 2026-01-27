/**
 * TSL Runner - Entry Point for Temporal Sovereignty Layer
 *
 * Demonstrates the full TSL pipeline:
 * 1. Project registration with temporal contract
 * 2. Entropy budget allocation
 * 3. Forward temporal simulation
 * 4. Decision singularity creation
 * 5. Gate enforcement
 *
 * CHAIN: IE → AEC → RLL → OCIC → ORIS → ICE → CIN → TSL
 *
 * Run: npx ts-node research/requirement-trace/tsl-runner.ts
 */

import {
  createTSLEngine,
  TSLEngine,
  type ProjectRegistration,
  type TSLActionRequest,
  type ForwardSimulationResultV2,
  type TSLIntelligenceV2
} from './runtime';

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * Scenario 1: Healthy Project - All actions pass
 */
function runHealthyProjectScenario(tsl: TSLEngine): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SCENARIO 1: HEALTHY PROJECT');
  console.log('='.repeat(60));

  const registration: ProjectRegistration = {
    projectId: 'healthy-project-001',
    intendedLifespan: 100,
    allowedMutations: 50,
    maxEntropyDrift: 0.3,
    initialEntropyBudget: 1000,
    baselineEntropy: 0.1
  };

  const result = tsl.registerProject(registration);
  console.log(`\nRegistration: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Message: ${result.message}`);

  if (!result.success) return;

  // Request some actions
  const actions: TSLActionRequest[] = [
    {
      projectId: 'healthy-project-001',
      actionType: 'CREATION',
      actionDescription: 'Create initial component structure',
      estimatedEntropyCost: 10,
      currentState: {
        entropy: 0.1,
        mutationCount: 0,
        intentStrength: 1.0,
        currentStep: 1
      }
    },
    {
      projectId: 'healthy-project-001',
      actionType: 'MUTATION',
      actionDescription: 'Add user authentication',
      estimatedEntropyCost: 15,
      currentState: {
        entropy: 0.12,
        mutationCount: 1,
        intentStrength: 0.95,
        currentStep: 2
      }
    },
    {
      projectId: 'healthy-project-001',
      actionType: 'MODIFICATION',
      actionDescription: 'Refactor database layer',
      estimatedEntropyCost: 20,
      currentState: {
        entropy: 0.15,
        mutationCount: 2,
        intentStrength: 0.9,
        currentStep: 3
      }
    }
  ];

  console.log('\n--- Requesting Actions ---');
  for (const action of actions) {
    const actionResult = tsl.requestAction(action);
    console.log(`\n[${action.actionType}] ${action.actionDescription}`);
    console.log(`  Allowed: ${actionResult.allowed}`);
    console.log(`  Action: ${actionResult.action}`);
    console.log(`  Entropy Consumed: ${actionResult.entropyConsumed}`);
    if (actionResult.newBudgetStatus) {
      console.log(`  Budget: ${actionResult.newBudgetStatus.current}/${actionResult.newBudgetStatus.initial} (${(actionResult.newBudgetStatus.ratio * 100).toFixed(1)}%)`);
    }
  }

  // Generate intelligence
  console.log('\n--- Intelligence Report ---');
  const intel = tsl.generateIntelligence('healthy-project-001');
  if (intel) {
    console.log(`Budget: ${intel.budget?.current}/${intel.budget?.initial} (${intel.budget?.state})`);
    console.log(`Future: ${intel.future_projection?.survives ? 'SURVIVES' : 'FAILS'} (${(intel.future_projection?.survivability ?? 0) * 100}% survivability)`);
  }
}

/**
 * Scenario 2: Exhaustion Project - Budget runs out
 */
function runExhaustionScenario(tsl: TSLEngine): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SCENARIO 2: BUDGET EXHAUSTION');
  console.log('='.repeat(60));

  const registration: ProjectRegistration = {
    projectId: 'exhaustion-project-001',
    intendedLifespan: 50,
    allowedMutations: 20,
    maxEntropyDrift: 0.2,
    initialEntropyBudget: 100, // Small budget
    baselineEntropy: 0.0
  };

  const result = tsl.registerProject(registration);
  console.log(`\nRegistration: ${result.success ? 'SUCCESS' : 'FAILED'}`);

  if (!result.success) return;

  // Keep consuming until exhausted
  console.log('\n--- Consuming Budget Until Exhaustion ---');
  let step = 1;
  let mutationCount = 0;
  let entropy = 0.0;

  while (true) {
    const action: TSLActionRequest = {
      projectId: 'exhaustion-project-001',
      actionType: 'MUTATION',
      actionDescription: `Heavy mutation ${step}`,
      estimatedEntropyCost: 15, // Heavy cost
      currentState: {
        entropy,
        mutationCount,
        intentStrength: 1.0 - (step * 0.02),
        currentStep: step
      }
    };

    const actionResult = tsl.requestAction(action);
    console.log(`\nStep ${step}: ${actionResult.allowed ? 'ALLOWED' : 'BLOCKED'} (${actionResult.action})`);

    if (actionResult.newBudgetStatus) {
      console.log(`  Budget: ${actionResult.newBudgetStatus.current}/${actionResult.newBudgetStatus.initial} (${actionResult.newBudgetStatus.state})`);
    }

    if (!actionResult.allowed) {
      console.log(`  Reason: ${actionResult.reason}`);
      break;
    }

    step++;
    mutationCount++;
    entropy += 0.01;

    if (step > 20) break; // Safety limit
  }

  // Try one more action after exhaustion
  console.log('\n--- Attempting Action After Exhaustion ---');
  const finalAction: TSLActionRequest = {
    projectId: 'exhaustion-project-001',
    actionType: 'MUTATION',
    actionDescription: 'Post-exhaustion action',
    estimatedEntropyCost: 1,
    currentState: {
      entropy: 0.2,
      mutationCount: 10,
      intentStrength: 0.5,
      currentStep: 100
    }
  };

  const finalResult = tsl.requestAction(finalAction);
  console.log(`Result: ${finalResult.action}`);
  console.log(`Reason: ${finalResult.reason}`);
  console.log(`Is Read-Only: ${tsl.isProjectReadOnly('exhaustion-project-001')}`);
}

/**
 * Scenario 3: Future Violation - Simulation blocks action
 */
function runFutureViolationScenario(tsl: TSLEngine): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SCENARIO 3: FUTURE VIOLATION DETECTION');
  console.log('='.repeat(60));

  const registration: ProjectRegistration = {
    projectId: 'future-violation-001',
    intendedLifespan: 10, // Short lifespan
    allowedMutations: 5,  // Very limited mutations
    maxEntropyDrift: 0.1, // Tight entropy control
    initialEntropyBudget: 500,
    baselineEntropy: 0.0
  };

  const result = tsl.registerProject(registration);
  console.log(`\nRegistration: ${result.success ? 'SUCCESS' : 'FAILED'}`);

  if (!result.success) return;

  // Simulate future first
  console.log('\n--- Forward Simulation (before any action) ---');
  const simulation = tsl.simulateFuture('future-violation-001', {
    entropy: 0.0,
    mutationCount: 0,
    intentStrength: 1.0
  }, 15);

  if (simulation) {
    console.log(`Survives: ${simulation.survives_future}`);
    console.log(`Survivability: ${(simulation.projected_survivability * 100).toFixed(1)}%`);
    console.log(`First Violation: Step ${simulation.first_violation_step}`);
    console.log(`Violations: ${simulation.violations.length}`);

    if (simulation.violations.length > 0) {
      console.log('\nViolation Details:');
      for (const v of simulation.violations.slice(0, 3)) {
        console.log(`  Step ${v.step}: ${v.type} (${v.severity})`);
      }
    }
  }

  // Try action with high entropy state
  console.log('\n--- Action with Dangerous State ---');
  const action: TSLActionRequest = {
    projectId: 'future-violation-001',
    actionType: 'MUTATION',
    actionDescription: 'High entropy mutation',
    estimatedEntropyCost: 10,
    currentState: {
      entropy: 0.08, // Close to drift limit
      mutationCount: 4, // Close to mutation limit
      intentStrength: 0.3, // Weak intent
      currentStep: 8 // Close to lifespan
    }
  };

  const actionResult = tsl.requestAction(action);
  console.log(`Allowed: ${actionResult.allowed}`);
  console.log(`Action: ${actionResult.action}`);
  console.log(`Reason: ${actionResult.reason}`);

  if (actionResult.gateResult.checks) {
    console.log('\nGate Checks:');
    for (const check of actionResult.gateResult.checks) {
      console.log(`  [${check.passed ? 'PASS' : 'FAIL'}] ${check.check}: ${check.reason}`);
    }
  }
}

/**
 * Scenario 4: Decision Singularity - Track decision impact
 */
function runSingularityScenario(tsl: TSLEngine): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SCENARIO 4: DECISION SINGULARITY TRACKING');
  console.log('='.repeat(60));

  const registration: ProjectRegistration = {
    projectId: 'singularity-project-001',
    intendedLifespan: 50,
    allowedMutations: 30,
    maxEntropyDrift: 0.4,
    initialEntropyBudget: 800,
    baselineEntropy: 0.1
  };

  const result = tsl.registerProject(registration);
  console.log(`\nRegistration: ${result.success ? 'SUCCESS' : 'FAILED'}`);

  if (!result.success) return;

  // Create decision singularities
  const decisions = [
    {
      decision_id: 'ARCH-001',
      decision_type: 'ARCHITECTURE',
      magnitude: 0.8,
      entropy_impact: 0.05,
      mutation_potential: 0.3,
      intent_impact: 0.1
    },
    {
      decision_id: 'FEAT-001',
      decision_type: 'FEATURE',
      magnitude: 0.5,
      entropy_impact: 0.02,
      mutation_potential: 0.2,
      intent_impact: 0.05
    },
    {
      decision_id: 'RISK-001',
      decision_type: 'RISKY_CHANGE',
      magnitude: 0.9,
      entropy_impact: 0.15, // High entropy
      mutation_potential: 0.7, // High mutation
      intent_impact: -0.1 // Weakens intent
    }
  ];

  console.log('\n--- Creating Decision Singularities ---');
  for (const decision of decisions) {
    const singResult = tsl.createDecisionSingularity('singularity-project-001', decision);
    console.log(`\n[${decision.decision_type}] ${decision.decision_id}`);
    console.log(`  Allowed: ${singResult.allowed}`);
    console.log(`  Reason: ${singResult.reason}`);

    if (singResult.singularity) {
      console.log(`  Singularity ID: ${singResult.singularity.singularity_id}`);
      console.log(`  Temporal Reach: ${singResult.singularity.temporal_reach} steps`);
      console.log(`  Contained: ${singResult.singularity.contained}`);
      console.log(`  Entropy Injection: ${singResult.singularity.cone.total_entropy_injection.toFixed(4)}`);
    }
  }

  // Get project status
  console.log('\n--- Project Status After Decisions ---');
  const status = tsl.getProjectStatus('singularity-project-001');
  if (status) {
    console.log(`Singularities: ${status.singularities.length}`);
    console.log(`Combined Impact:`);
    console.log(`  Total Entropy: ${status.combinedSingularityImpact.total_entropy_injection.toFixed(4)}`);
    console.log(`  Total Mutations: ${status.combinedSingularityImpact.total_mutations}`);
    console.log(`  All Contained: ${status.combinedSingularityImpact.all_contained}`);
    if (status.combinedSingularityImpact.earliest_breach) {
      console.log(`  Earliest Breach: Step ${status.combinedSingularityImpact.earliest_breach}`);
    }
  }
}

// ============================================
// MAIN RUNNER
// ============================================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TEMPORAL SOVEREIGNTY LAYER (TSL) RUNNER');
  console.log('='.repeat(60));
  console.log('');
  console.log('Chain Position: IE → AEC → RLL → OCIC → ORIS → ICE → CIN → TSL');
  console.log('');
  console.log('TSL enforces:');
  console.log('  - Temporal contracts for every execution');
  console.log('  - Forward simulation before action');
  console.log('  - Finite entropy budgets');
  console.log('  - Decision singularity impact tracking');
  console.log('  - Non-bypassable gate enforcement');
  console.log('');

  // Create TSL engine
  const tsl = createTSLEngine({
    defaultSimulationDepth: 10,
    defaultEntropyBudget: 1000,
    defaultLifespan: 100,
    defaultMutationLimit: 50,
    defaultEntropyDrift: 0.3
  });

  // Run scenarios
  runHealthyProjectScenario(tsl);
  runExhaustionScenario(tsl);
  runFutureViolationScenario(tsl);
  runSingularityScenario(tsl);

  // Final statistics
  console.log('\n');
  console.log('='.repeat(60));
  console.log('TSL FINAL STATISTICS');
  console.log('='.repeat(60));
  tsl.logStatus();

  console.log('\n');
  console.log('='.repeat(60));
  console.log('TSL RUN COMPLETE');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);

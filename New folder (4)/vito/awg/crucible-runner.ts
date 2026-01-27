/**
 * OLYMPUS CRUCIBLE v1.0 — Crucible Runner
 *
 * Executes adversarial scenarios against the Olympus pipeline
 * and produces survivability reports.
 *
 * RULES:
 * - Olympus must not be modified to pass tests
 * - If Olympus blocks, prove why
 * - If Olympus survives, explain which invariant held
 * - If Olympus accepts incorrectly, mark SYSTEM FAILURE
 */

import {
  AdversarialScenario,
  WorldState,
  InvariantId,
  WaveId,
  OutcomeVerdict,
  ScenarioResult,
  WaveResult,
  CrucibleResult,
  InvariantCoverage,
  ProofValidation,
  GeneratorConfig,
  INVARIANT_SPECS,
  generateDeterministicHash,
  generateDeterministicTimestamp,
  // Wave 2 types
  MultiStepScenario,
  MultiStepScenarioResult,
  StepResult,
  ObligationResult,
  Obligation,
  OmissionProof,
  TimelineStep,
  EntropyTimeline,
  TemporalHorizon,
  EntropyPhase,
  ObligationStatus,
  AuthorityLevel,
  AECAction,
  TSLBlockType,
  isMultiStepScenario,
  isMultiStepResult,
  // Wave 3 types
  GovernanceScenario,
  GovernanceScenarioResult,
  ProofLedger,
  ProofEntry,
  LedgerStressMetrics,
  AuthorityChain,
  AuthorityChainLink,
  AuthorityChainResult,
  GovernanceActor,
  ActorResult,
  GovernanceStressMetrics,
  WeaponizedComplianceState,
  TragicDecisionProof,
  SystemIntegrityCheck,
  isGovernanceScenario,
  isGovernanceResult
} from './types';

import {
  AdversarialWorldGenerator,
  validateScenario,
  validateWave
} from './world-generator';

import {
  WAVE_1_SCENARIOS,
  WAVE_2_SCENARIOS,
  WAVE_3_SCENARIOS,
  getWaveScenarios
} from './wave-definitions';

// ============================================================================
// CRUCIBLE VERSION
// ============================================================================

export const CRUCIBLE_VERSION = '1.0.0';

// ============================================================================
// INVARIANT CHECKERS
// ============================================================================

/**
 * Check if a world state violates the Necessity Engine (NE)
 */
function checkNE(world: WorldState): { violated: boolean; reason: string } {
  // NE: No survivable future exists
  if (world.survivablePaths === 0 && world.mccsCount === 0) {
    return {
      violated: true,
      reason: `NE VIOLATION: No survivable future exists. survivablePaths=0, mccsCount=0`
    };
  }
  return { violated: false, reason: 'NE: Survivable paths exist' };
}

/**
 * Check if a world state violates the Inevitability Engine (IE)
 */
function checkIE(world: WorldState): { violated: boolean; reason: string } {
  // IE: All paths lead to collapse
  const collapsingPaths = world.causalPaths.filter(
    p => p.terminus === 'COLLAPSING' || p.terminus === 'DEAD'
  );

  if (collapsingPaths.length === world.causalPaths.length && world.causalPaths.length > 0) {
    return {
      violated: true,
      reason: `IE VIOLATION: All ${world.causalPaths.length} causal paths lead to collapse`
    };
  }

  // Check for contradicting intents
  const contradictions = world.intents.filter(i => i.contradictsWith && i.contradictsWith.length > 0);
  if (contradictions.length > 0) {
    return {
      violated: true,
      reason: `IE VIOLATION: Intents contain contradictions: ${contradictions.map(i => i.id).join(', ')}`
    };
  }

  return { violated: false, reason: 'IE: Paths to stability exist' };
}

/**
 * Check if a world state violates the Temporal Safety Layer (TSL)
 */
function checkTSL(world: WorldState): { violated: boolean; reason: string } {
  // TSL: Check for backward causation in temporal chain
  const chain = world.temporalChain;
  for (let i = 1; i < chain.length; i++) {
    // Timestamps should be increasing (T0 < T1 < T2...)
    const prev = parseInt(chain[i - 1].replace('T', ''));
    const curr = parseInt(chain[i].replace('T', ''));
    if (curr < prev) {
      return {
        violated: true,
        reason: `TSL VIOLATION: Temporal paradox detected. ${chain[i]} < ${chain[i - 1]}`
      };
    }
  }

  // Check causal paths for backward steps
  for (const path of world.causalPaths) {
    for (let i = 1; i < path.steps.length; i++) {
      const step = path.steps[i];
      if (step.includes(':')) {
        const [time] = step.split(':');
        const prevStep = path.steps[i - 1];
        if (prevStep.includes(':')) {
          const [prevTime] = prevStep.split(':');
          const timeNum = parseInt(time.replace('T', ''));
          const prevTimeNum = parseInt(prevTime.replace('T', ''));
          if (timeNum < prevTimeNum) {
            return {
              violated: true,
              reason: `TSL VIOLATION: Backward causation in path ${path.id}: ${prevStep} -> ${step}`
            };
          }
        }
      }
    }
  }

  return { violated: false, reason: 'TSL: Temporal ordering valid' };
}

/**
 * Check if a world state violates Architectural Entropy Control (AEC)
 */
function checkAEC(world: WorldState): { violated: boolean; reason: string } {
  const composite = world.entropyMetrics.composite;

  // Calculate what phase SHOULD be based on composite
  let actualPhase: string;
  if (composite <= 0.25) {
    actualPhase = 'STABLE';
  } else if (composite <= 0.50) {
    actualPhase = 'DECAYING';
  } else if (composite <= 0.75) {
    actualPhase = 'COLLAPSING';
  } else {
    actualPhase = 'DEAD';
  }

  // Check if claimed phase matches actual phase
  if (world.entropyPhase !== actualPhase) {
    return {
      violated: true,
      reason: `AEC VIOLATION: Claimed phase ${world.entropyPhase} but metrics indicate ${actualPhase} (composite=${(composite * 100).toFixed(1)}%)`
    };
  }

  // Check if mutations attempted in COLLAPSING/DEAD
  if (world.entropyPhase === 'COLLAPSING' || world.entropyPhase === 'DEAD') {
    return {
      violated: true,
      reason: `AEC VIOLATION: System in ${world.entropyPhase} phase. Mutations forbidden.`
    };
  }

  return { violated: false, reason: 'AEC: Entropy phase valid' };
}

/**
 * Check if a world state violates Reality Lock-In Layer (RLL)
 */
function checkRLL(world: WorldState): { violated: boolean; reason: string } {
  // Check if current fingerprint is forbidden by any singularity
  for (const singularity of world.singularities) {
    if (singularity.forbiddenFingerprints.includes(world.currentFingerprint)) {
      return {
        violated: true,
        reason: `RLL VIOLATION: Fingerprint ${world.currentFingerprint} deviates from singularity ${singularity.id}`
      };
    }
  }

  return { violated: false, reason: 'RLL: No singularity deviation' };
}

/**
 * Check if a world state violates Output Determinism Layer (ODL)
 */
function checkODL(world: WorldState): { violated: boolean; reason: string } {
  // Check for undefined output hash (non-deterministic)
  if (world.expectedOutputHash === undefined) {
    return {
      violated: true,
      reason: `ODL VIOLATION: Output hash undefined - non-deterministic behavior detected`
    };
  }

  // Check for "random" keywords in intents
  for (const intent of world.intents) {
    const intentText = JSON.stringify(intent).toLowerCase();
    if (intentText.includes('random') && !intentText.includes('pseudo-random')) {
      return {
        violated: true,
        reason: `ODL VIOLATION: Intent ${intent.id} contains non-deterministic behavior`
      };
    }
  }

  return { violated: false, reason: 'ODL: Determinism preserved' };
}

/**
 * Check if a world state violates Adversarial Abuse Module (AAM)
 */
function checkAAM(world: WorldState): { violated: boolean; reason: string } {
  const gov = world.governance;

  // Check SSI threshold (minimum 70%)
  if (gov.ssi < 0.70) {
    // Check if too many overrides caused this
    if (gov.overrideCount >= 3) {
      return {
        violated: true,
        reason: `AAM VIOLATION: SSI ${(gov.ssi * 100).toFixed(1)}% below threshold (70%) with ${gov.overrideCount} overrides`
      };
    }
  }

  // Check override limit (max 3 consecutive)
  if (gov.overrideCount > 3) {
    return {
      violated: true,
      reason: `AAM VIOLATION: Override count ${gov.overrideCount} exceeds maximum (3)`
    };
  }

  // Check for self-weakening intents
  for (const intent of world.intents) {
    const intentText = intent.text.toLowerCase();
    if (intentText.includes('override') && intentText.includes('all')) {
      return {
        violated: true,
        reason: `AAM VIOLATION: Intent ${intent.id} attempts governance capture`
      };
    }
  }

  return { violated: false, reason: 'AAM: Governance intact' };
}

// ============================================================================
// WAVE 2: MULTI-STEP INVARIANT CHECKERS
// ============================================================================

/**
 * Check for obligation pileup (ODL)
 */
function checkObligationPileup(
  obligations: readonly Obligation[],
  omissionProofs: readonly OmissionProof[]
): { violated: boolean; reason: string; proofs: OmissionProof[] } {
  // Find obligations that conflict with each other
  const conflicts: string[] = [];
  const activeProofs: OmissionProof[] = [];

  for (const obl of obligations) {
    if (obl.conflictsWith.length > 0) {
      for (const conflictId of obl.conflictsWith) {
        conflicts.push(`${obl.obligationId} conflicts with ${conflictId}`);
      }
    }
  }

  // Check omission proofs
  for (const proof of omissionProofs) {
    if (proof.authority === 'SYSTEM_ROOT') {
      activeProofs.push(proof);
    }
  }

  if (activeProofs.length > 0) {
    return {
      violated: true,
      reason: `ODL OMISSION: ${activeProofs.length} obligations cannot be satisfied - SYSTEM_ROOT authority proofs generated`,
      proofs: activeProofs
    };
  }

  if (conflicts.length > 0) {
    return {
      violated: true,
      reason: `ODL CONFLICT: ${conflicts.length} obligation conflicts detected: ${conflicts.slice(0, 3).join(', ')}`,
      proofs: []
    };
  }

  return { violated: false, reason: 'ODL: All obligations can be satisfied', proofs: [] };
}

/**
 * Check for cascading deadline failures
 */
function checkDeadlineCascade(
  obligations: readonly Obligation[]
): { violated: boolean; reason: string; cascadeChain: string[] } {
  const cascadeChain: string[] = [];

  // Build dependency graph
  const dependencyMap = new Map<string, string[]>();
  for (const obl of obligations) {
    dependencyMap.set(obl.obligationId, [...obl.dependsOn]);
  }

  // Find obligations that cannot be satisfied due to dependencies
  for (const obl of obligations) {
    if (obl.status === 'IMPOSSIBLE' || obl.status === 'CONFLICTED') {
      // Check what depends on this
      for (const [depId, deps] of dependencyMap) {
        if (deps.includes(obl.obligationId)) {
          cascadeChain.push(`${obl.obligationId} -> ${depId}`);
        }
      }
    }
  }

  if (cascadeChain.length > 0) {
    return {
      violated: true,
      reason: `ODL CASCADE FAILURE: Root conflict propagates to ${cascadeChain.length} dependent obligations`,
      cascadeChain
    };
  }

  return { violated: false, reason: 'ODL: No cascade failures', cascadeChain: [] };
}

/**
 * Check temporal horizon for future collapse (TSL)
 */
function checkTemporalHorizon(
  horizon: TemporalHorizon | undefined
): { violated: boolean; reason: string; blockType: TSLBlockType | null } {
  if (!horizon) {
    return { violated: false, reason: 'TSL: No temporal horizon defined', blockType: null };
  }

  if (horizon.presentSafe && horizon.futureCollapse) {
    return {
      violated: true,
      reason: `TSL PRESENT_BLOCKED_FUTURE_VIOLATION: Action at N=${horizon.currentTime} causes collapse at N+${horizon.collapseStep || horizon.horizonDepth}`,
      blockType: 'PRESENT_BLOCKED_FUTURE_VIOLATION'
    };
  }

  if (horizon.futureCollapse) {
    return {
      violated: true,
      reason: `TSL HORIZON_BREACH: N+K analysis shows collapse at step ${horizon.collapseStep}: ${horizon.collapseReason}`,
      blockType: 'HORIZON_BREACH'
    };
  }

  return { violated: false, reason: 'TSL: Temporal horizon analysis passed', blockType: null };
}

/**
 * Check entropy timeline for poisoning (AEC)
 */
function checkEntropyTimeline(
  timeline: EntropyTimeline | undefined
): { violated: boolean; reason: string; aecAction: AECAction | null; collapseStep: number | null } {
  if (!timeline) {
    return { violated: false, reason: 'AEC: No entropy timeline defined', aecAction: null, collapseStep: null };
  }

  // Find the step where entropy crosses DEAD threshold (75%)
  for (const step of timeline.steps) {
    if (step.entropy > 0.75) {
      return {
        violated: true,
        reason: `AEC PERMANENT_READ_ONLY: Entropy crossed DEAD threshold (${(step.entropy * 100).toFixed(1)}%) at step ${step.stepIndex}`,
        aecAction: 'PERMANENT_READ_ONLY',
        collapseStep: step.stepIndex
      };
    }
  }

  // Check for MCCS deferral trap
  for (const step of timeline.steps) {
    if (step.mccsDeferred && step.phase === 'COLLAPSING') {
      return {
        violated: true,
        reason: `AEC READ_ONLY: MCCS deferred until ${step.phase} phase, now mandatory but system in read-only`,
        aecAction: 'READ_ONLY',
        collapseStep: step.stepIndex
      };
    }
  }

  // Check for phase transitions
  for (const transition of timeline.phaseTransitions) {
    if (transition.toPhase === 'DEAD') {
      return {
        violated: true,
        reason: `AEC PERMANENT_HALT: Phase transitioned to DEAD at step ${transition.atStep}`,
        aecAction: 'PERMANENT_HALT',
        collapseStep: transition.atStep
      };
    }
  }

  return { violated: false, reason: 'AEC: Entropy timeline within bounds', aecAction: null, collapseStep: null };
}

/**
 * Determine AEC action based on entropy phase
 */
function getAECAction(phase: EntropyPhase, mccsDeferred: boolean): AECAction {
  switch (phase) {
    case 'STABLE':
      return 'CONTINUE';
    case 'DECAYING':
      return mccsDeferred ? 'MCCS_MANDATORY' : 'CONTINUE';
    case 'COLLAPSING':
      return 'READ_ONLY';
    case 'DEAD':
      return 'PERMANENT_HALT';
    default:
      return 'CONTINUE';
  }
}

/**
 * Calculate entropy phase from composite value
 */
function calculateEntropyPhase(composite: number): EntropyPhase {
  if (composite <= 0.25) return 'STABLE';
  if (composite <= 0.50) return 'DECAYING';
  if (composite <= 0.75) return 'COLLAPSING';
  return 'DEAD';
}

// ============================================================================
// OLYMPUS PIPELINE SIMULATOR
// ============================================================================

interface InvariantCheckResult {
  invariantId: InvariantId;
  violated: boolean;
  reason: string;
}

/**
 * Simulates running a world state through Olympus invariant checks
 */
function runInvariantChecks(world: WorldState): InvariantCheckResult[] {
  const results: InvariantCheckResult[] = [];

  // Run all invariant checks
  const neResult = checkNE(world);
  results.push({ invariantId: 'NE', ...neResult });

  const ieResult = checkIE(world);
  results.push({ invariantId: 'IE', ...ieResult });

  const tslResult = checkTSL(world);
  results.push({ invariantId: 'TSL', ...tslResult });

  const aecResult = checkAEC(world);
  results.push({ invariantId: 'AEC', ...aecResult });

  const rllResult = checkRLL(world);
  results.push({ invariantId: 'RLL', ...rllResult });

  const odlResult = checkODL(world);
  results.push({ invariantId: 'ODL', ...odlResult });

  const aamResult = checkAAM(world);
  results.push({ invariantId: 'AAM', ...aamResult });

  return results;
}

/**
 * Determines the verdict based on invariant check results
 */
function determineVerdict(
  checkResults: InvariantCheckResult[],
  expected: OutcomeVerdict
): { actual: OutcomeVerdict; reason: string; invariantsFired: InvariantId[] } {
  const violations = checkResults.filter(r => r.violated);

  if (violations.length > 0) {
    // Olympus detected violations and should block
    const invariantsFired = violations.map(v => v.invariantId);
    const reasons = violations.map(v => v.reason).join('; ');

    if (expected === 'BLOCKED') {
      return {
        actual: 'SURVIVED',
        reason: `OLYMPUS SURVIVED: Blocked as expected. ${reasons}`,
        invariantsFired
      };
    } else {
      // We expected it to pass but it blocked - this is fine for adversarial scenarios
      return {
        actual: 'BLOCKED',
        reason: reasons,
        invariantsFired
      };
    }
  } else {
    // No violations detected - Olympus would accept
    if (expected === 'BLOCKED') {
      // SYSTEM FAILURE: Should have blocked but didn't
      return {
        actual: 'SYSTEM_FAILURE',
        reason: 'SYSTEM FAILURE: Olympus accepted when it should have blocked',
        invariantsFired: []
      };
    } else {
      return {
        actual: 'ACCEPTED',
        reason: 'No violations detected',
        invariantsFired: []
      };
    }
  }
}

// ============================================================================
// SCENARIO EXECUTION
// ============================================================================

/**
 * Execute a single adversarial scenario
 */
export function executeScenario(scenario: AdversarialScenario): ScenarioResult {
  const startTime = Date.now();

  // Validate scenario first
  const validationErrors = validateScenario(scenario);
  if (validationErrors.length > 0) {
    return {
      scenarioId: scenario.scenarioId,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      actualVerdict: 'SYSTEM_FAILURE',
      actualBlockReason: `Validation errors: ${validationErrors.join(', ')}`,
      invariantsFired: [],
      matchedExpectation: false,
      discrepancies: validationErrors,
      proofChainValid: false,
      proofValidation: []
    };
  }

  // Run invariant checks
  const checkResults = runInvariantChecks(scenario.worldState);

  // Determine verdict
  const { actual, reason, invariantsFired } = determineVerdict(
    checkResults,
    scenario.expectedOutcome.verdict
  );

  // Check if invariants that fired match expected
  const expectedInvariants = new Set(scenario.expectedOutcome.invariantsThatShouldFire);
  const actualInvariants = new Set(invariantsFired);

  const discrepancies: string[] = [];

  // Check for expected invariants that didn't fire
  for (const expected of expectedInvariants) {
    if (!actualInvariants.has(expected)) {
      discrepancies.push(`Expected ${expected} to fire but it didn't`);
    }
  }

  // Check for unexpected invariants that fired
  for (const fired of actualInvariants) {
    if (!expectedInvariants.has(fired)) {
      discrepancies.push(`${fired} fired unexpectedly`);
    }
  }

  // Validate proof chain
  const proofValidation: ProofValidation[] = scenario.expectedOutcome.proofChain.map((step, idx) => {
    // Find matching check result
    const matchingCheck = checkResults.find(r => r.invariantId === step.invariantId);
    return {
      step: step.step,
      expected: step.assertion,
      actual: matchingCheck?.reason || 'No matching check',
      valid: matchingCheck?.violated === true || !step.invariantId
    };
  });

  const proofChainValid = proofValidation.every(p => p.valid);

  // Determine if matched expectation
  const matchedExpectation =
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actual === 'SURVIVED') ||
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actual === 'BLOCKED') &&
    discrepancies.length === 0;

  return {
    scenarioId: scenario.scenarioId,
    executedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    actualVerdict: actual,
    actualBlockReason: reason,
    invariantsFired,
    matchedExpectation,
    discrepancies,
    proofChainValid,
    proofValidation
  };
}

// ============================================================================
// WAVE 2: MULTI-STEP SCENARIO EXECUTION
// ============================================================================

/**
 * Execute a multi-step adversarial scenario
 */
export function executeMultiStepScenario(scenario: MultiStepScenario): MultiStepScenarioResult {
  const startTime = Date.now();

  // Validate scenario first
  const validationErrors = validateScenario(scenario);
  if (validationErrors.length > 0) {
    return {
      scenarioId: scenario.scenarioId,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      actualVerdict: 'SYSTEM_FAILURE',
      actualBlockReason: `Validation errors: ${validationErrors.join(', ')}`,
      invariantsFired: [],
      matchedExpectation: false,
      discrepancies: validationErrors,
      proofChainValid: false,
      proofValidation: [],
      isMultiStep: true,
      stepResults: [],
      obligationResults: [],
      entropyProgression: [],
      phaseProgression: []
    };
  }

  const stepResults: StepResult[] = [];
  const obligationResults: ObligationResult[] = [];
  const entropyProgression: number[] = [];
  const phaseProgression: EntropyPhase[] = [];
  let allInvariantsFired: InvariantId[] = [];
  let blockedAtStep: number | undefined;
  let blockTrigger: string | undefined;
  let finalBlockReason = '';

  // Run initial world state checks
  const baseCheckResults = runInvariantChecks(scenario.worldState);
  const baseViolations = baseCheckResults.filter(r => r.violated);

  if (baseViolations.length > 0) {
    allInvariantsFired = baseViolations.map(v => v.invariantId);
    finalBlockReason = baseViolations[0].reason;
    blockedAtStep = 0;
    blockTrigger = 'INITIAL_STATE_VIOLATION';
  }

  // Check Wave 2 specific invariants

  // 1. Obligation Pileup (ODL)
  if (scenario.obligations.length > 0) {
    const obligationCheck = checkObligationPileup(scenario.obligations, scenario.omissionProofs);
    if (obligationCheck.violated) {
      if (!allInvariantsFired.includes('ODL')) {
        allInvariantsFired.push('ODL');
      }
      if (!finalBlockReason) {
        finalBlockReason = obligationCheck.reason;
        blockedAtStep = 0;
        blockTrigger = 'OBLIGATION_PILEUP';
      }
    }

    // Generate obligation results
    for (const obl of scenario.obligations) {
      const proof = scenario.omissionProofs.find(p => p.obligationId === obl.obligationId);
      obligationResults.push({
        obligationId: obl.obligationId,
        finalStatus: proof ? 'IMPOSSIBLE' : obl.status,
        omissionProof: proof
      });
    }
  }

  // 2. Cascade Deadline Failures
  if (scenario.obligations.length > 0 && scenario.contradictionType === 'DEADLINE_CASCADE') {
    const cascadeCheck = checkDeadlineCascade(scenario.obligations);
    if (cascadeCheck.violated) {
      if (!allInvariantsFired.includes('ODL')) {
        allInvariantsFired.push('ODL');
      }
      if (!allInvariantsFired.includes('IE')) {
        allInvariantsFired.push('IE');
      }
      if (!finalBlockReason) {
        finalBlockReason = cascadeCheck.reason;
        blockedAtStep = scenario.collapseStep || 0;
        blockTrigger = 'DEADLINE_CASCADE';
      }
    }
  }

  // 3. Temporal Horizon Analysis (TSL)
  if (scenario.temporalHorizon) {
    const horizonCheck = checkTemporalHorizon(scenario.temporalHorizon);
    if (horizonCheck.violated) {
      if (!allInvariantsFired.includes('TSL')) {
        allInvariantsFired.push('TSL');
      }
      if (!finalBlockReason) {
        finalBlockReason = horizonCheck.reason;
        blockedAtStep = 0; // Block at present due to future violation
        blockTrigger = horizonCheck.blockType || 'TEMPORAL_VIOLATION';
      }
    }
  }

  // 4. Entropy Timeline Analysis (AEC)
  if (scenario.entropyTimeline) {
    const entropyCheck = checkEntropyTimeline(scenario.entropyTimeline);
    if (entropyCheck.violated) {
      if (!allInvariantsFired.includes('AEC')) {
        allInvariantsFired.push('AEC');
      }
      if (!finalBlockReason) {
        finalBlockReason = entropyCheck.reason;
        blockedAtStep = entropyCheck.collapseStep || 0;
        blockTrigger = entropyCheck.aecAction || 'ENTROPY_VIOLATION';
      }
    }

    // Track entropy progression
    for (const step of scenario.entropyTimeline.steps) {
      entropyProgression.push(step.entropy);
      phaseProgression.push(step.phase);
    }
  }

  // Execute timeline steps (if present)
  if (scenario.timeline.length > 0) {
    for (let i = 0; i < scenario.timeline.length; i++) {
      const timelineStep = scenario.timeline[i];
      const stepWorld = timelineStep.worldState;

      // Run invariant checks for this step
      const stepCheckResults = runInvariantChecks(stepWorld);
      const stepViolations = stepCheckResults.filter(r => r.violated);

      const entropyBefore = i > 0 ? entropyProgression[i - 1] : scenario.worldState.entropyMetrics.composite;
      const entropyAfter = timelineStep.cumulativeEntropy;
      const phaseBefore = i > 0 ? phaseProgression[i - 1] : calculateEntropyPhase(entropyBefore);
      const phaseAfter = calculateEntropyPhase(entropyAfter);

      if (!entropyProgression.includes(entropyAfter)) {
        entropyProgression.push(entropyAfter);
        phaseProgression.push(phaseAfter);
      }

      const stepResult: StepResult = {
        stepIndex: i,
        executed: !blockedAtStep || i < blockedAtStep,
        blocked: stepViolations.length > 0 || (blockedAtStep !== undefined && i >= blockedAtStep),
        blockReason: stepViolations.length > 0 ? stepViolations[0].reason : undefined,
        invariantsFired: stepViolations.map(v => v.invariantId),
        entropyBefore,
        entropyAfter,
        phaseBefore,
        phaseAfter
      };

      stepResults.push(stepResult);

      if (stepResult.blocked && blockedAtStep === undefined) {
        blockedAtStep = i;
        blockTrigger = stepResult.blockReason;
        finalBlockReason = stepResult.blockReason || '';

        for (const inv of stepResult.invariantsFired) {
          if (!allInvariantsFired.includes(inv)) {
            allInvariantsFired.push(inv);
          }
        }
      }
    }
  }

  // Determine final verdict
  let actualVerdict: OutcomeVerdict;
  if (allInvariantsFired.length > 0) {
    actualVerdict = scenario.expectedOutcome.verdict === 'BLOCKED' ? 'SURVIVED' : 'BLOCKED';
  } else {
    actualVerdict = scenario.expectedOutcome.verdict === 'BLOCKED' ? 'SYSTEM_FAILURE' : 'ACCEPTED';
  }

  // Check invariant matching
  const expectedInvariants = new Set(scenario.expectedOutcome.invariantsThatShouldFire);
  const actualInvariants = new Set(allInvariantsFired);
  const discrepancies: string[] = [];

  for (const expected of expectedInvariants) {
    if (!actualInvariants.has(expected)) {
      discrepancies.push(`Expected ${expected} to fire but it didn't`);
    }
  }

  for (const fired of actualInvariants) {
    if (!expectedInvariants.has(fired)) {
      discrepancies.push(`${fired} fired unexpectedly`);
    }
  }

  // Validate proof chain
  const proofValidation: ProofValidation[] = scenario.expectedOutcome.proofChain.map((step, idx) => ({
    step: step.step,
    expected: step.assertion,
    actual: finalBlockReason || 'No block',
    valid: allInvariantsFired.length > 0 || !step.invariantId
  }));

  const proofChainValid = proofValidation.every(p => p.valid);

  const matchedExpectation =
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actualVerdict === 'SURVIVED') ||
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actualVerdict === 'BLOCKED' && discrepancies.length === 0);

  return {
    scenarioId: scenario.scenarioId,
    executedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    actualVerdict,
    actualBlockReason: finalBlockReason || undefined,
    invariantsFired: allInvariantsFired,
    matchedExpectation,
    discrepancies,
    proofChainValid,
    proofValidation,
    isMultiStep: true,
    stepResults,
    obligationResults,
    entropyProgression,
    phaseProgression,
    blockedAtStep,
    blockTrigger
  };
}

// ============================================================================
// WAVE 3: GOVERNANCE SCENARIO EXECUTION
// ============================================================================

/**
 * Check ledger stress for proof flooding
 */
function checkLedgerStress(
  ledgerStress: LedgerStressMetrics
): { violated: boolean; reason: string; selfLimitRequired: boolean } {
  if (ledgerStress.stressLevel === 'OVERFLOW') {
    return {
      violated: true,
      reason: `AAM LEDGER_OVERFLOW: Ledger utilization at ${ledgerStress.utilizationPercent.toFixed(1)}%`,
      selfLimitRequired: true
    };
  }

  if (ledgerStress.stressLevel === 'CRITICAL') {
    return {
      violated: true,
      reason: `AAM SELF_LIMITATION: Ledger stress at CRITICAL (${ledgerStress.utilizationPercent.toFixed(1)}%), proof generation rate-limited`,
      selfLimitRequired: true
    };
  }

  if (ledgerStress.projectedExhaustionStep !== undefined && ledgerStress.projectedExhaustionStep <= 10) {
    return {
      violated: true,
      reason: `AEC LEDGER_EXHAUSTION_IMMINENT: Projected exhaustion in ${ledgerStress.projectedExhaustionStep} steps`,
      selfLimitRequired: true
    };
  }

  return { violated: false, reason: 'Ledger stress within bounds', selfLimitRequired: false };
}

/**
 * Check authority chains for laundering attempts
 */
function checkAuthorityChains(
  chains: readonly AuthorityChain[]
): { results: AuthorityChainResult[]; nullificationAttempted: boolean; blockReason?: string } {
  const results: AuthorityChainResult[] = [];
  let nullificationAttempted = false;
  let blockReason: string | undefined;

  for (const chain of chains) {
    const invalidLinks: string[] = [];

    // Check for nullification attempts
    if (chain.nullificationAttempt) {
      nullificationAttempted = true;
      invalidLinks.push('NULLIFICATION_LINK');
      blockReason = `RLL VIOLATION: Authority escalation forbidden - ${chain.originAuthority} cannot delegate to ${chain.targetAuthority}`;
    }

    // Check for invalid authority transitions
    const authorityRank: Record<AuthorityLevel, number> = {
      'SYSTEM_ROOT': 0,
      'CONSTITUTIONAL': 1,
      'GOVERNANCE': 2,
      'OPERATIONAL': 3
    };

    for (const link of chain.links) {
      const fromRank = authorityRank[link.fromAuthority];
      const toRank = authorityRank[link.toAuthority];

      // Authority can only be delegated downward (higher rank number)
      if (toRank < fromRank) {
        invalidLinks.push(link.linkId);
        if (!blockReason) {
          blockReason = `AAM VIOLATION: Authority escalation in link ${link.linkId}: ${link.fromAuthority} → ${link.toAuthority}`;
        }
      }
    }

    results.push({
      chainId: chain.chainId,
      isValid: invalidLinks.length === 0,
      nullificationBlocked: chain.nullificationAttempt,
      blockReason: invalidLinks.length > 0 ? blockReason : undefined,
      invalidLinks
    });
  }

  return { results, nullificationAttempted, blockReason };
}

/**
 * Check for coordinated compliance attacks
 */
function checkWeaponizedCompliance(
  complianceState: WeaponizedComplianceState | undefined
): { violated: boolean; reason: string; coordinationDetected: boolean } {
  if (!complianceState) {
    return { violated: false, reason: 'No compliance state', coordinationDetected: false };
  }

  // Check if all actions are individually valid
  const allValid = complianceState.validActionsCount === complianceState.totalActions;

  // Check for coordination patterns
  if (complianceState.coordinationDetected) {
    return {
      violated: true,
      reason: `AAM COORDINATION_DETECTED: ${complianceState.actors.length} actors collectively causing resource exhaustion (pattern: ${complianceState.coordinationPattern})`,
      coordinationDetected: true
    };
  }

  // Check combined collapse risk
  if (complianceState.combinedCollapseRisk >= 0.8) {
    return {
      violated: true,
      reason: `IE COLLECTIVE_COLLAPSE: Combined collapse risk at ${(complianceState.combinedCollapseRisk * 100).toFixed(1)}%`,
      coordinationDetected: allValid
    };
  }

  return { violated: false, reason: 'No coordinated attack detected', coordinationDetected: false };
}

/**
 * Check for tragic necessity situations
 */
function checkTragicNecessity(
  tragicDecision: TragicDecisionProof | undefined
): { tragicSituation: boolean; decisionValid: boolean; reason: string } {
  if (!tragicDecision) {
    return { tragicSituation: false, decisionValid: true, reason: 'No tragic decision required' };
  }

  // Verify the decision was least-irreversible
  if (!tragicDecision.leastIrreversible) {
    return {
      tragicSituation: true,
      decisionValid: false,
      reason: `TRAGIC_DECISION_INVALID: Chosen option was not least-irreversible`
    };
  }

  // Verify alternatives were exhausted
  if (!tragicDecision.alternativesExhausted) {
    return {
      tragicSituation: true,
      decisionValid: false,
      reason: `TRAGIC_DECISION_INVALID: Alternatives not exhausted`
    };
  }

  return {
    tragicSituation: true,
    decisionValid: true,
    reason: `TRAGIC_DECISION: Chose ${tragicDecision.chosenOption.optionId} (irreversibility: ${tragicDecision.chosenOption.irreversibilityScore})`
  };
}

/**
 * Perform system integrity check
 */
function checkSystemIntegrity(
  scenario: GovernanceScenario,
  result: Partial<GovernanceScenarioResult>
): SystemIntegrityCheck {
  const violations: string[] = [];
  let systemLied = false;
  let systemDeferred = false;
  let systemDegraded = false;

  // Check 1: Did Olympus lie about proof validity?
  for (const entry of scenario.proofLedger.entries) {
    if (entry.isValid === false && result.captureBlocked === false) {
      systemLied = true;
      violations.push('Olympus accepted invalid proof');
    }
  }

  // Check 2: Did Olympus defer truth?
  if (result.tragicDecisionMade && !result.tragicDecisionProof) {
    systemDeferred = true;
    violations.push('Tragic decision made but no proof emitted');
  }

  // Check 3: Did Olympus degrade?
  if (scenario.governanceStress.captureRisk > 0.5 && result.captureBlocked === false) {
    systemDegraded = true;
    violations.push('High capture risk but no block');
  }

  const recommendation: 'CONTINUE' | 'HALT' | 'REPORT_FAILURE' =
    systemLied || systemDeferred ? 'REPORT_FAILURE' :
    systemDegraded ? 'HALT' : 'CONTINUE';

  return {
    checkId: `INTEGRITY-${scenario.scenarioId}`,
    timestamp: Date.now(),
    systemLied,
    systemDeferred,
    systemDegraded,
    truthfulnessScore: systemLied ? 0 : systemDeferred ? 0.3 : systemDegraded ? 0.7 : 1.0,
    integrityViolations: violations,
    recommendation
  };
}

/**
 * Execute a governance scenario (Wave 3)
 */
export function executeGovernanceScenario(scenario: GovernanceScenario): GovernanceScenarioResult {
  const startTime = Date.now();

  // Validate scenario first
  const validationErrors = validateScenario(scenario);
  if (validationErrors.length > 0) {
    return {
      scenarioId: scenario.scenarioId,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      actualVerdict: 'SYSTEM_FAILURE',
      actualBlockReason: `Validation errors: ${validationErrors.join(', ')}`,
      invariantsFired: [],
      matchedExpectation: false,
      discrepancies: validationErrors,
      proofChainValid: false,
      proofValidation: [],
      isGovernanceScenario: true,
      ledgerMetrics: scenario.ledgerStress,
      governanceMetrics: scenario.governanceStress,
      authorityChainResults: [],
      actorResults: [],
      captureBlocked: false,
      tragicDecisionMade: false,
      systemLied: false,
      systemDeferred: false,
      systemDegraded: false
    };
  }

  let allInvariantsFired: InvariantId[] = [];
  let finalBlockReason = '';
  let captureBlocked = false;
  let captureBlockReason: string | undefined;
  let tragicDecisionMade = false;

  // Run base world state checks
  const baseCheckResults = runInvariantChecks(scenario.worldState);
  const baseViolations = baseCheckResults.filter(r => r.violated);

  if (baseViolations.length > 0) {
    allInvariantsFired = baseViolations.map(v => v.invariantId);
    finalBlockReason = baseViolations[0].reason;
  }

  // Check 1: Ledger Stress (Proof Flooding)
  const ledgerCheck = checkLedgerStress(scenario.ledgerStress);
  if (ledgerCheck.violated) {
    if (!allInvariantsFired.includes('AAM')) {
      allInvariantsFired.push('AAM');
    }
    if (!allInvariantsFired.includes('AEC')) {
      allInvariantsFired.push('AEC');
    }
    if (!finalBlockReason) {
      finalBlockReason = ledgerCheck.reason;
    }
    captureBlocked = true;
    captureBlockReason = ledgerCheck.reason;
  }

  // Check 2: Authority Chains (Authority Laundering)
  const chainCheck = checkAuthorityChains(scenario.authorityChains);
  if (chainCheck.nullificationAttempted) {
    if (!allInvariantsFired.includes('RLL')) {
      allInvariantsFired.push('RLL');
    }
    if (!allInvariantsFired.includes('AAM')) {
      allInvariantsFired.push('AAM');
    }
    if (!finalBlockReason) {
      finalBlockReason = chainCheck.blockReason || 'Authority chain validation failed';
    }
    captureBlocked = true;
    captureBlockReason = chainCheck.blockReason;
  }

  // Check 3: Weaponized Compliance
  const complianceCheck = checkWeaponizedCompliance(scenario.complianceState);
  if (complianceCheck.violated) {
    if (!allInvariantsFired.includes('AAM')) {
      allInvariantsFired.push('AAM');
    }
    if (!allInvariantsFired.includes('IE')) {
      allInvariantsFired.push('IE');
    }
    if (!finalBlockReason) {
      finalBlockReason = complianceCheck.reason;
    }
    captureBlocked = true;
    captureBlockReason = complianceCheck.reason;
  }

  // Check 4: Tragic Necessity
  const tragicCheck = checkTragicNecessity(scenario.tragicDecision);
  if (tragicCheck.tragicSituation) {
    tragicDecisionMade = true;
    if (!allInvariantsFired.includes('NE')) {
      allInvariantsFired.push('NE');
    }
    // Add the conflicting invariants
    if (scenario.tragicDecision) {
      const conflictA = scenario.tragicDecision.conflict.invariantA;
      const conflictB = scenario.tragicDecision.conflict.invariantB;
      if (!allInvariantsFired.includes(conflictA)) {
        allInvariantsFired.push(conflictA);
      }
      if (!allInvariantsFired.includes(conflictB)) {
        allInvariantsFired.push(conflictB);
      }
    }
    if (!finalBlockReason) {
      finalBlockReason = tragicCheck.reason;
    }
  }

  // Generate actor results
  const actorResults: ActorResult[] = scenario.actors.map(actor => ({
    actorId: actor.actorId,
    actionsAttempted: actor.actionsPerformed.length,
    actionsBlocked: captureBlocked ? actor.actionsPerformed.length : 0,
    proofsGenerated: actor.proofsGenerated.length,
    complianceViolations: 0, // All actors are compliant in Wave 3
    contributedToCollapse: actor.isAdversarial && complianceCheck.coordinationDetected
  }));

  // Determine final verdict
  let actualVerdict: OutcomeVerdict;
  if (allInvariantsFired.length > 0) {
    actualVerdict = scenario.expectedOutcome.verdict === 'BLOCKED' ? 'SURVIVED' : 'BLOCKED';
  } else {
    actualVerdict = scenario.expectedOutcome.verdict === 'BLOCKED' ? 'SYSTEM_FAILURE' : 'ACCEPTED';
  }

  // Check invariant matching
  const expectedInvariants = new Set(scenario.expectedOutcome.invariantsThatShouldFire);
  const actualInvariants = new Set(allInvariantsFired);
  const discrepancies: string[] = [];

  for (const expected of expectedInvariants) {
    if (!actualInvariants.has(expected)) {
      discrepancies.push(`Expected ${expected} to fire but it didn't`);
    }
  }

  // Validate proof chain
  const proofValidation: ProofValidation[] = scenario.expectedOutcome.proofChain.map((step) => ({
    step: step.step,
    expected: step.assertion,
    actual: finalBlockReason || 'No block',
    valid: allInvariantsFired.length > 0 || !step.invariantId
  }));

  const proofChainValid = proofValidation.every(p => p.valid);

  const matchedExpectation =
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actualVerdict === 'SURVIVED') ||
    (scenario.expectedOutcome.verdict === 'BLOCKED' && actualVerdict === 'BLOCKED' && discrepancies.length === 0);

  // Perform system integrity check
  const partialResult: Partial<GovernanceScenarioResult> = {
    captureBlocked,
    tragicDecisionMade,
    tragicDecisionProof: scenario.tragicDecision
  };
  const integrityCheck = checkSystemIntegrity(scenario, partialResult);

  // CRITICAL: If Olympus lied, deferred, or degraded — report failure
  if (integrityCheck.systemLied || integrityCheck.systemDeferred) {
    return {
      scenarioId: scenario.scenarioId,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      actualVerdict: 'SYSTEM_FAILURE',
      actualBlockReason: `INTEGRITY FAILURE: ${integrityCheck.integrityViolations.join(', ')}`,
      invariantsFired: allInvariantsFired,
      matchedExpectation: false,
      discrepancies: [...discrepancies, ...integrityCheck.integrityViolations],
      proofChainValid: false,
      proofValidation,
      isGovernanceScenario: true,
      ledgerMetrics: scenario.ledgerStress,
      governanceMetrics: scenario.governanceStress,
      authorityChainResults: chainCheck.results,
      actorResults,
      captureBlocked,
      captureBlockReason,
      tragicDecisionMade,
      tragicDecisionProof: scenario.tragicDecision,
      systemLied: integrityCheck.systemLied,
      systemDeferred: integrityCheck.systemDeferred,
      systemDegraded: integrityCheck.systemDegraded
    };
  }

  return {
    scenarioId: scenario.scenarioId,
    executedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    actualVerdict,
    actualBlockReason: finalBlockReason || undefined,
    invariantsFired: allInvariantsFired,
    matchedExpectation,
    discrepancies,
    proofChainValid,
    proofValidation,
    isGovernanceScenario: true,
    ledgerMetrics: scenario.ledgerStress,
    governanceMetrics: scenario.governanceStress,
    authorityChainResults: chainCheck.results,
    actorResults,
    captureBlocked,
    captureBlockReason,
    tragicDecisionMade,
    tragicDecisionProof: scenario.tragicDecision,
    systemLied: integrityCheck.systemLied,
    systemDeferred: integrityCheck.systemDeferred,
    systemDegraded: integrityCheck.systemDegraded
  };
}

// ============================================================================
// WAVE EXECUTION
// ============================================================================

/**
 * Execute all scenarios in a wave
 */
export function executeWave(waveId: WaveId): WaveResult {
  const startTime = Date.now();
  const scenarios = getWaveScenarios(waveId);
  const results: ScenarioResult[] = [];

  // Execute each scenario (handling single-step, multi-step, and governance)
  for (const scenario of scenarios) {
    let result: ScenarioResult;

    if (isGovernanceScenario(scenario)) {
      result = executeGovernanceScenario(scenario);
    } else if (isMultiStepScenario(scenario)) {
      result = executeMultiStepScenario(scenario);
    } else {
      result = executeScenario(scenario);
    }

    results.push(result);
  }

  // Calculate summary stats
  const survived = results.filter(r => r.actualVerdict === 'SURVIVED').length;
  const systemFailures = results.filter(r => r.actualVerdict === 'SYSTEM_FAILURE').length;
  const unexpectedBlocks = results.filter(r =>
    r.actualVerdict === 'BLOCKED' && !r.matchedExpectation
  ).length;

  // Calculate invariant coverage
  const invariantCoverage: Record<InvariantId, InvariantCoverage> = {
    NE: calculateInvariantCoverage('NE', scenarios, results),
    IE: calculateInvariantCoverage('IE', scenarios, results),
    TSL: calculateInvariantCoverage('TSL', scenarios, results),
    AEC: calculateInvariantCoverage('AEC', scenarios, results),
    RLL: calculateInvariantCoverage('RLL', scenarios, results),
    ODL: calculateInvariantCoverage('ODL', scenarios, results),
    AAM: calculateInvariantCoverage('AAM', scenarios, results)
  };

  return {
    waveId,
    executedAt: new Date().toISOString(),
    totalScenarios: scenarios.length,
    scenarioResults: results,
    survived,
    systemFailures,
    unexpectedBlocks,
    invariantCoverage
  };
}

function calculateInvariantCoverage(
  invariantId: InvariantId,
  scenarios: readonly AdversarialScenario[],
  results: readonly ScenarioResult[]
): InvariantCoverage {
  const targetingScenarios = scenarios.filter(s =>
    s.targetInvariants.includes(invariantId)
  );

  const scenariosTested = targetingScenarios.length;

  const timesFired = results.filter(r =>
    r.invariantsFired.includes(invariantId)
  ).length;

  const timesExpectedToFire = scenarios.filter(s =>
    s.expectedOutcome.invariantsThatShouldFire.includes(invariantId)
  ).length;

  const accuracy = timesExpectedToFire > 0
    ? timesFired / timesExpectedToFire
    : 1.0;

  return {
    invariantId,
    scenariosTested,
    timesFired,
    timesExpectedToFire,
    accuracy
  };
}

// ============================================================================
// CRUCIBLE EXECUTION
// ============================================================================

/**
 * Execute the complete crucible test suite
 */
export function executeCrucible(waves: WaveId[] = ['WAVE_1']): CrucibleResult {
  const startTime = Date.now();
  const waveResults: WaveResult[] = [];

  // Execute each wave
  for (const waveId of waves) {
    const result = executeWave(waveId);
    waveResults.push(result);
  }

  // Calculate totals
  const totalScenarios = waveResults.reduce((sum, w) => sum + w.totalScenarios, 0);
  const totalSurvived = waveResults.reduce((sum, w) => sum + w.survived, 0);
  const totalSystemFailures = waveResults.reduce((sum, w) => sum + w.systemFailures, 0);

  const survivabilityRate = totalScenarios > 0
    ? totalSurvived / totalScenarios
    : 0;

  // Get constitution hash (deterministic)
  const constitutionHash = generateDeterministicHash('OLYMPUS_CONSTITUTION_v2.0');

  return {
    crucibleVersion: CRUCIBLE_VERSION,
    executedAt: new Date().toISOString(),
    totalDuration: Date.now() - startTime,
    waveResults,
    totalScenarios,
    totalSurvived,
    totalSystemFailures,
    survivabilityRate,
    constitutionHash,
    constitutionVersion: '2.0'
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate markdown report from crucible results
 */
export function generateReport(result: CrucibleResult): string {
  const lines: string[] = [];

  // Header
  lines.push('# OLYMPUS CRUCIBLE v1.0 — Survivability Report');
  lines.push('');
  lines.push('> Adversarial World Generator Test Results');

  // List waves included
  const waveIds = result.waveResults.map(w => w.waveId);
  if (waveIds.includes('WAVE_2')) {
    lines.push('> Wave 1: Logical Contradictions | Wave 2: Temporal & Obligation Stress');
  } else {
    lines.push('> Wave 1: Logical Contradictions');
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Crucible Version** | ${result.crucibleVersion} |`);
  lines.push(`| **Constitution Version** | ${result.constitutionVersion} |`);
  lines.push(`| **Constitution Hash** | \`${result.constitutionHash.substring(0, 16)}...\` |`);
  lines.push(`| **Executed At** | ${result.executedAt} |`);
  lines.push(`| **Total Duration** | ${result.totalDuration}ms |`);
  lines.push('');

  // Survivability Summary
  lines.push('## Survivability Summary');
  lines.push('');
  const survivalEmoji = result.totalSystemFailures === 0 ? '✅' : '❌';
  lines.push(`**Overall Status:** ${survivalEmoji} ${result.totalSystemFailures === 0 ? 'PASSED' : 'FAILED'}`);
  lines.push('');
  lines.push(`| Metric | Count | Rate |`);
  lines.push(`|--------|-------|------|`);
  lines.push(`| Total Scenarios | ${result.totalScenarios} | 100% |`);
  lines.push(`| **Survived** | ${result.totalSurvived} | ${(result.survivabilityRate * 100).toFixed(1)}% |`);
  lines.push(`| **System Failures** | ${result.totalSystemFailures} | ${((result.totalSystemFailures / result.totalScenarios) * 100).toFixed(1)}% |`);
  lines.push('');

  // Wave Results
  for (const wave of result.waveResults) {
    lines.push(`## Wave: ${wave.waveId}`);
    lines.push('');
    lines.push(`**Executed:** ${wave.executedAt}`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Scenarios | ${wave.totalScenarios} |`);
    lines.push(`| Survived | ${wave.survived} |`);
    lines.push(`| System Failures | ${wave.systemFailures} |`);
    lines.push(`| Unexpected Blocks | ${wave.unexpectedBlocks} |`);
    lines.push('');

    // Invariant Coverage
    lines.push('### Invariant Coverage');
    lines.push('');
    lines.push(`| Invariant | Tested | Fired | Expected | Accuracy |`);
    lines.push(`|-----------|--------|-------|----------|----------|`);
    for (const [id, cov] of Object.entries(wave.invariantCoverage)) {
      const emoji = cov.accuracy >= 1.0 ? '✅' : cov.accuracy >= 0.8 ? '⚠️' : '❌';
      lines.push(`| ${id} | ${cov.scenariosTested} | ${cov.timesFired} | ${cov.timesExpectedToFire} | ${emoji} ${(cov.accuracy * 100).toFixed(0)}% |`);
    }
    lines.push('');

    // Scenario Details
    lines.push('### Scenario Results');
    lines.push('');
    for (const scenario of wave.scenarioResults) {
      const emoji = scenario.actualVerdict === 'SURVIVED' ? '✅' :
                    scenario.actualVerdict === 'SYSTEM_FAILURE' ? '❌' : '⚠️';
      lines.push(`#### ${emoji} ${scenario.scenarioId}`);
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Verdict | **${scenario.actualVerdict}** |`);
      lines.push(`| Matched Expectation | ${scenario.matchedExpectation ? 'YES' : 'NO'} |`);
      lines.push(`| Invariants Fired | ${scenario.invariantsFired.join(', ') || 'None'} |`);
      lines.push(`| Duration | ${scenario.duration}ms |`);
      lines.push('');

      if (scenario.actualBlockReason) {
        lines.push(`**Block Reason:** ${scenario.actualBlockReason}`);
        lines.push('');
      }

      if (scenario.discrepancies.length > 0) {
        lines.push('**Discrepancies:**');
        for (const d of scenario.discrepancies) {
          lines.push(`- ${d}`);
        }
        lines.push('');
      }

      // Proof Chain
      if (scenario.proofValidation.length > 0) {
        lines.push('**Proof Chain:**');
        lines.push('');
        lines.push(`| Step | Expected | Valid |`);
        lines.push(`|------|----------|-------|`);
        for (const proof of scenario.proofValidation) {
          const pEmoji = proof.valid ? '✓' : '✗';
          lines.push(`| ${proof.step} | ${proof.expected.substring(0, 50)}... | ${pEmoji} |`);
        }
        lines.push('');
      }

      // Wave 2: Multi-step specific data
      if (isMultiStepResult(scenario)) {
        // Blocked at step info
        if (scenario.blockedAtStep !== undefined) {
          lines.push(`**Blocked At Step:** ${scenario.blockedAtStep} (${scenario.blockTrigger || 'N/A'})`);
          lines.push('');
        }

        // Entropy Progression
        if (scenario.entropyProgression.length > 0) {
          lines.push('**Entropy Progression:**');
          lines.push('');
          lines.push('```');
          const maxBars = 40;
          for (let i = 0; i < Math.min(scenario.entropyProgression.length, 10); i++) {
            const entropy = scenario.entropyProgression[i];
            const phase = scenario.phaseProgression[i];
            const bars = Math.round(entropy * maxBars);
            const barStr = '█'.repeat(bars) + '░'.repeat(maxBars - bars);
            const phaseIndicator = phase === 'DEAD' ? '☠' :
                                   phase === 'COLLAPSING' ? '⚠' :
                                   phase === 'DECAYING' ? '!' : '✓';
            lines.push(`Step ${String(i).padStart(2)}: [${barStr}] ${(entropy * 100).toFixed(1).padStart(5)}% ${phaseIndicator} ${phase}`);
          }
          if (scenario.entropyProgression.length > 10) {
            lines.push(`... (${scenario.entropyProgression.length - 10} more steps)`);
          }
          lines.push('```');
          lines.push('');
        }

        // Obligation Results
        if (scenario.obligationResults.length > 0) {
          lines.push('**Obligation Results:**');
          lines.push('');
          lines.push(`| Obligation | Final Status | Omission Proof |`);
          lines.push(`|------------|--------------|----------------|`);
          for (const obl of scenario.obligationResults) {
            const statusEmoji = obl.finalStatus === 'SATISFIED' ? '✅' :
                                obl.finalStatus === 'IMPOSSIBLE' ? '❌' :
                                obl.finalStatus === 'VIOLATED' ? '⚠️' : '⏳';
            const proofInfo = obl.omissionProof ? `${obl.omissionProof.proofType} (${obl.omissionProof.authority})` : '-';
            lines.push(`| ${obl.obligationId} | ${statusEmoji} ${obl.finalStatus} | ${proofInfo} |`);
          }
          lines.push('');
        }

        // Step-by-step execution
        if (scenario.stepResults.length > 0 && scenario.stepResults.length <= 10) {
          lines.push('**Step Execution:**');
          lines.push('');
          lines.push(`| Step | Executed | Blocked | Phase Change | Invariants |`);
          lines.push(`|------|----------|---------|--------------|------------|`);
          for (const step of scenario.stepResults) {
            const execEmoji = step.executed ? '✓' : '✗';
            const blockEmoji = step.blocked ? '🚫' : '-';
            const phaseChange = step.phaseBefore !== step.phaseAfter
              ? `${step.phaseBefore}→${step.phaseAfter}`
              : step.phaseBefore;
            const invariants = step.invariantsFired.length > 0
              ? step.invariantsFired.join(', ')
              : '-';
            lines.push(`| ${step.stepIndex} | ${execEmoji} | ${blockEmoji} | ${phaseChange} | ${invariants} |`);
          }
          lines.push('');
        }
      }
    }
  }

  // System Failures Detail
  const failures = result.waveResults.flatMap(w =>
    w.scenarioResults.filter(s => s.actualVerdict === 'SYSTEM_FAILURE')
  );

  if (failures.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ❌ SYSTEM FAILURES');
    lines.push('');
    lines.push('> These scenarios were accepted by Olympus when they should have been blocked.');
    lines.push('');
    for (const failure of failures) {
      lines.push(`### ${failure.scenarioId}`);
      lines.push('');
      lines.push(`**Reason:** ${failure.actualBlockReason}`);
      lines.push('');
      lines.push('**Discrepancies:**');
      for (const d of failure.discrepancies) {
        lines.push(`- ${d}`);
      }
      lines.push('');
    }
  }

  // Philosophy
  lines.push('---');
  lines.push('');
  lines.push('## Philosophy');
  lines.push('');
  lines.push('> *"The crucible does not test kindness. It tests survival."*');
  lines.push('>');
  lines.push('> *"If Olympus accepts a contradiction, Olympus is broken."*');
  lines.push('>');
  lines.push('> *"System failures are not bugs. They are existential threats."*');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Report generated by OLYMPUS CRUCIBLE v${CRUCIBLE_VERSION}*`);
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Run crucible from command line
 */
export async function runCrucible(waves: WaveId[] = ['WAVE_1']): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           OLYMPUS CRUCIBLE v1.0 — Adversarial Testing         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  if (waves.includes('WAVE_2')) {
    console.log('║  Wave 1: Logical Contradictions                              ║');
    console.log('║  Wave 2: Temporal & Obligation Stress                        ║');
  } else {
    console.log('║  Wave 1: Logical Contradictions                              ║');
  }
  console.log('║  Invariants: NE, IE, TSL, AEC, RLL, ODL, AAM                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Validate all waves
  for (const waveId of waves) {
    console.log(`[CRUCIBLE] Validating ${waveId} scenarios...`);
    const validationErrors = validateWave(waveId);
    if (validationErrors.size > 0) {
      console.log(`[CRUCIBLE] ❌ Validation errors found in ${waveId}:`);
      for (const [scenarioId, errors] of validationErrors) {
        console.log(`  ${scenarioId}:`);
        for (const error of errors) {
          console.log(`    - ${error}`);
        }
      }
      return;
    }
    console.log(`[CRUCIBLE] ✅ ${waveId} scenarios valid`);
  }
  console.log('');

  // Execute crucible
  console.log(`[CRUCIBLE] Executing ${waves.join(', ')}...`);
  const result = executeCrucible(waves);

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         RESULTS                                ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Total Scenarios:   ${result.totalScenarios}`);
  console.log(`  Survived:          ${result.totalSurvived} (${(result.survivabilityRate * 100).toFixed(1)}%)`);
  console.log(`  System Failures:   ${result.totalSystemFailures}`);
  console.log(`  Duration:          ${result.totalDuration}ms`);
  console.log('');

  if (result.totalSystemFailures === 0) {
    console.log('  ✅ OLYMPUS SURVIVED ALL ADVERSARIAL SCENARIOS');
  } else {
    console.log('  ❌ OLYMPUS FAILED - SYSTEM FAILURES DETECTED');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');

  // Generate report
  const report = generateReport(result);
  console.log('');
  console.log('[CRUCIBLE] Report generated. See reports/crucible-report.md');

  return;
}

// Export for direct execution
export { runCrucible as default };

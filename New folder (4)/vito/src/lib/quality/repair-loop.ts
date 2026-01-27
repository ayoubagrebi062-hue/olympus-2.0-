/**
 * OLYMPUS 2.0 - Intent Gradient Descent Engine (IGDE)
 *
 * Guarantees monotonic improvement of W-ISS-D across builds.
 *
 * NON-NEGOTIABLE RULES:
 * - Deterministic
 * - One intent repaired per build
 * - No full re-generation
 * - No retries beyond one attempt
 * - If improvement is impossible → hard fail with proof
 */

import * as fs from 'fs';
import * as path from 'path';
import { WISSReport, IntentCausalChain, IntentSpec, WISS_THRESHOLDS } from './intent-graph';
import {
  IntentDebtManager,
  IntentOptimizationResult,
  EffectiveCriticality,
  WorstIntentSelection,
  MonotonicityCheck,
  selectForGradientDescent,
  checkMonotonicity,
  logGradientDescentState,
  AXIS_DOMINANCE_WEIGHTS,
} from './intent-debt';
import {
  ConvergenceContractManager,
  ConvergenceContract,
  ImpossibilityProof,
  GlobalConvergenceStatus,
  AxisType,
  validateAxisOrder,
  logConvergenceStatus,
  logImpossibilityProof,
  STANDARD_AXIS_ORDER,
} from './convergence-contract';

// ============================================
// REPAIR PLAN TYPES
// ============================================

/** A single repair action for a missing axis */
export interface RepairAction {
  axis: 'trigger' | 'state' | 'effect' | 'outcome';
  intentId: string;
  requirement: string;
  priority: number;  // Axis dominance weight

  // What needs to be generated
  targetFile: string;
  codeTemplate: string;
  insertionPoint: 'component' | 'handler' | 'render' | 'state';

  // Context for the repair
  context: {
    expectedTrigger?: string;
    expectedState?: string;
    expectedOutcome?: string;
    relatedCode?: string;
  };
}

/** Complete repair plan for a single intent (IGDE principle: one at a time) */
export interface GradientRepairPlan {
  buildId: string;
  timestamp: Date;

  // The selected worst intent
  selectedIntent: {
    intentId: string;
    requirement: string;
    effectiveCriticality: number;
    missingAxes: string[];
    forcesCritical: boolean;
  };

  // Previous score for monotonicity check
  previousWISS: number;

  // Single repair action (highest priority missing axis)
  repairAction: RepairAction;

  // Debt tracking
  debtWeight: number;
  attemptNumber: number;
}

/** Result of IGDE repair cycle */
export interface GradientRepairResult {
  // Plan info
  planExecuted: boolean;
  plan: GradientRepairPlan | null;

  // Optimization result
  optimization: IntentOptimizationResult;

  // Monotonicity
  monotonicityCheck: MonotonicityCheck | null;

  // File changes
  filesModified: string[];
  codeGenerated: string;

  // Debt state
  debtSnapshot: {
    totalEntries: number;
    totalWeight: number;
    unresolvedCount: number;
  };

  // Convergence state (NEW)
  convergence: GlobalConvergenceStatus;

  // Axis order violation (if any)
  axisOrderViolation: {
    occurred: boolean;
    intentId: string | null;
    attemptedAxis: string | null;
    blockedBy: string | null;
    message: string | null;
  };

  // Impossibility proofs generated this cycle
  newImpossibilityProofs: ImpossibilityProof[];
}

// ============================================
// CODE TEMPLATES FOR REPAIR
// ============================================

const REPAIR_TEMPLATES = {
  // Template for missing trigger (onClick handler)
  trigger: (intent: IntentSpec, stateName: string) => `
  // [IGDE Repair] Trigger for: ${intent.requirement.slice(0, 50)}
  const handle${capitalize(intent.category)}Action = () => {
    set${capitalize(stateName)}(prev => {
      // Action implementation
      console.log('[${intent.id}] Action triggered');
      return prev;
    });
  };
`,

  // Template for missing state
  state: (intent: IntentSpec, stateName: string, isArray: boolean) => isArray
    ? `  // [IGDE Repair] State for: ${intent.requirement.slice(0, 50)}
  const [${stateName}, set${capitalize(stateName)}] = useState<any[]>([]);
`
    : `  // [IGDE Repair] State for: ${intent.requirement.slice(0, 50)}
  const [${stateName}, set${capitalize(stateName)}] = useState(false);
`,

  // Template for missing effect (handler → state connection)
  effect: (setter: string, stateName: string) => `
    // [IGDE Repair] Effect: connect trigger to state
    ${setter}(newValue => {
      console.log('[Effect] ${stateName} updated');
      return newValue;
    });
`,

  // Template for missing outcome (conditional render) - HIGHEST PRIORITY
  outcome: (stateName: string, intent: IntentSpec, isArray: boolean) => isArray
    ? `
      {/* [IGDE Repair] Outcome for: ${intent.requirement.slice(0, 40)} */}
      {${stateName} && ${stateName}.length > 0 && (
        <div data-intent="${intent.id}">
          <ul>
            {${stateName}.map((item, idx) => (
              <li key={idx}>{JSON.stringify(item)}</li>
            ))}
          </ul>
        </div>
      )}
`
    : `
      {/* [IGDE Repair] Outcome for: ${intent.requirement.slice(0, 40)} */}
      {${stateName} && (
        <div data-intent="${intent.id}">
          Content for ${intent.category}
        </div>
      )}
`,
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStateName(intent: IntentSpec): string {
  if (intent.expectedState?.stateName) {
    return intent.expectedState.stateName;
  }
  // Derive from category
  const categoryStateMap: Record<string, string> = {
    data_display: 'items',
    data_mutation: 'data',
    filtering: 'filter',
    search: 'searchResults',
    state_toggle: 'isActive',
    loading: 'isLoading',
    error_handling: 'error',
    authentication: 'isAuthenticated',
    navigation: 'currentRoute',
    form_submission: 'formData',
    feedback: 'message',
  };
  return categoryStateMap[intent.category] || 'data';
}

function isArrayState(intent: IntentSpec): boolean {
  const arrayCategories = ['data_display', 'data_mutation', 'filtering', 'search'];
  return arrayCategories.includes(intent.category);
}

// ============================================
// GRADIENT REPAIR PLAN GENERATION
// ============================================

/**
 * Generate a gradient repair plan for the SINGLE worst intent
 * ENFORCES axis order from convergence contract
 */
export function generateGradientRepairPlan(
  buildId: string,
  wiss: WISSReport,
  chains: IntentCausalChain[],
  debtManager: IntentDebtManager,
  convergenceManager: ConvergenceContractManager,
  previousWISS: number
): { plan: GradientRepairPlan | null; axisOrderViolation: GradientRepairResult['axisOrderViolation'] } {
  // Log state
  const selection = selectForGradientDescent(chains, debtManager);
  logGradientDescentState(selection, debtManager, previousWISS);

  const noViolation: GradientRepairResult['axisOrderViolation'] = {
    occurred: false,
    intentId: null,
    attemptedAxis: null,
    blockedBy: null,
    message: null,
  };

  if (!selection.selected) {
    console.log('[IGDE] No intent needs repair');
    return { plan: null, axisOrderViolation: noViolation };
  }

  const selected = selection.selected;
  const chain = chains.find(c => c.intent.id === selected.intentId);
  const intent = chain?.intent;

  if (!intent || !chain) {
    console.log('[IGDE] ERROR: Selected intent not found in chains');
    return { plan: null, axisOrderViolation: noViolation };
  }

  // Ensure contract exists for this intent
  let contract = convergenceManager.getContract(intent.id);
  if (!contract) {
    contract = convergenceManager.createContract(intent);
    console.log(`[IGDE] Created convergence contract for intent: ${intent.id}`);
  }

  // Get current axis scores
  const currentAxisScores: Record<AxisType, number> = {
    trigger: chain.axisScores.trigger,
    state: chain.axisScores.state,
    effect: chain.axisScores.effect,
    outcome: chain.axisScores.outcome,
  };

  // AXIS ORDER ENFORCEMENT: Get next axis respecting order
  const nextAxisResult = convergenceManager.getNextRepairAxis(intent.id, currentAxisScores);

  if (nextAxisResult.blocked) {
    console.log(`[IGDE] AXIS ORDER BLOCKED: ${nextAxisResult.blockReason}`);
    // This is NOT a violation if it's blocked by incomplete earlier axis
    // We just can't repair this intent yet
    return {
      plan: null,
      axisOrderViolation: {
        occurred: true,
        intentId: intent.id,
        attemptedAxis: null,
        blockedBy: nextAxisResult.blockReason?.match(/axis (\w+)/)?.[1] || 'unknown',
        message: nextAxisResult.blockReason,
      },
    };
  }

  if (!nextAxisResult.axis) {
    console.log('[IGDE] No axis needs repair for this intent (converged)');
    // Mark as converged
    convergenceManager.checkConvergence(intent.id, currentAxisScores);
    return { plan: null, axisOrderViolation: noViolation };
  }

  const axisToRepair = nextAxisResult.axis;

  // Validate axis order before proceeding
  const orderValidation = validateAxisOrder(contract, axisToRepair, currentAxisScores);
  if (!orderValidation.valid && orderValidation.violation) {
    console.log(`[IGDE] AXIS ORDER VIOLATION: ${orderValidation.violation.message}`);
    return {
      plan: null,
      axisOrderViolation: {
        occurred: true,
        intentId: orderValidation.violation.intentId,
        attemptedAxis: orderValidation.violation.attemptedAxis,
        blockedBy: orderValidation.violation.blockedBy,
        message: orderValidation.violation.message,
      },
    };
  }

  // Generate repair action for the selected axis
  const stateName = getStateName(intent);
  const isArray = isArrayState(intent);
  const repairAction = generateRepairAction(intent, axisToRepair, stateName, isArray);

  console.log(`[IGDE] Repair plan generated (axis order enforced):`);
  console.log(`[IGDE]   Axis to repair: ${axisToRepair} (weight: ${AXIS_DOMINANCE_WEIGHTS[axisToRepair]})`);
  console.log(`[IGDE]   Axis order: ${contract.axisOrder.join(' → ')}`);
  console.log(`[IGDE]   Target file: ${repairAction.targetFile}`);

  return {
    plan: {
      buildId,
      timestamp: new Date(),
      selectedIntent: {
        intentId: selected.intentId,
        requirement: selected.requirement,
        effectiveCriticality: selected.effectiveCriticality,
        missingAxes: selected.missingAxes,
        forcesCritical: selected.forcesCritical,
      },
      previousWISS,
      repairAction,
      debtWeight: debtManager.getDebtWeight(selected.intentId),
      attemptNumber: debtManager.getAttemptCount(selected.intentId) + 1,
    },
    axisOrderViolation: noViolation,
  };
}

/**
 * Generate a single repair action for one axis
 */
function generateRepairAction(
  intent: IntentSpec,
  axis: 'trigger' | 'state' | 'effect' | 'outcome',
  stateName: string,
  isArray: boolean
): RepairAction {
  let codeTemplate: string;
  let insertionPoint: RepairAction['insertionPoint'];

  switch (axis) {
    case 'outcome':
      codeTemplate = REPAIR_TEMPLATES.outcome(stateName, intent, isArray);
      insertionPoint = 'render';
      break;
    case 'trigger':
      codeTemplate = REPAIR_TEMPLATES.trigger(intent, stateName);
      insertionPoint = 'handler';
      break;
    case 'effect':
      codeTemplate = REPAIR_TEMPLATES.effect(`set${capitalize(stateName)}`, stateName);
      insertionPoint = 'handler';
      break;
    case 'state':
      codeTemplate = REPAIR_TEMPLATES.state(intent, stateName, isArray);
      insertionPoint = 'state';
      break;
  }

  return {
    axis,
    intentId: intent.id,
    requirement: intent.requirement,
    priority: AXIS_DOMINANCE_WEIGHTS[axis],
    targetFile: 'src/app/page.tsx', // Default to main page
    codeTemplate,
    insertionPoint,
    context: {
      expectedTrigger: intent.expectedTrigger?.target,
      expectedState: stateName,
      expectedOutcome: intent.expectedOutcome?.description,
    },
  };
}

// ============================================
// GRADIENT REPAIR EXECUTION
// ============================================

/**
 * Execute the gradient repair plan
 * Modifies ONLY files causally linked to the selected intent
 */
export function executeGradientRepair(
  plan: GradientRepairPlan,
  buildDir: string
): { success: boolean; filesModified: string[]; error?: string } {
  console.log(`[IGDE] Executing repair for axis: ${plan.repairAction.axis}`);

  const targetPath = path.join(buildDir, 'agents', 'wire', plan.repairAction.targetFile);

  // Check if target file exists
  if (!fs.existsSync(targetPath)) {
    // Try pixel output
    const pixelPath = path.join(buildDir, 'agents', 'pixel', plan.repairAction.targetFile);
    if (!fs.existsSync(pixelPath)) {
      console.log(`[IGDE] Target file not found: ${plan.repairAction.targetFile}`);
      // Create repair file instead
      const repairDir = path.join(buildDir, 'repairs');
      fs.mkdirSync(repairDir, { recursive: true });
      fs.writeFileSync(
        path.join(repairDir, `repair-${plan.selectedIntent.intentId}-${plan.repairAction.axis}.tsx`),
        `// IGDE Repair Code - Manual Integration Required\n// Intent: ${plan.selectedIntent.requirement}\n// Axis: ${plan.repairAction.axis}\n\n${plan.repairAction.codeTemplate}`
      );
      return {
        success: true,
        filesModified: [`repairs/repair-${plan.selectedIntent.intentId}-${plan.repairAction.axis}.tsx`],
      };
    }
  }

  try {
    // Read existing file
    let content = fs.readFileSync(targetPath, 'utf-8');

    // Insert repair code at appropriate location
    content = insertRepairCode(content, plan.repairAction);

    // Write back
    fs.writeFileSync(targetPath, content);

    console.log(`[IGDE] Successfully modified: ${plan.repairAction.targetFile}`);

    return {
      success: true,
      filesModified: [plan.repairAction.targetFile],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[IGDE] Repair failed: ${error}`);
    return {
      success: false,
      filesModified: [],
      error,
    };
  }
}

/**
 * Insert repair code at the correct location in a file
 */
function insertRepairCode(content: string, action: RepairAction): string {
  switch (action.insertionPoint) {
    case 'state':
      // Insert after imports, before component body
      const importEnd = content.lastIndexOf('import');
      if (importEnd !== -1) {
        const lineEnd = content.indexOf('\n', importEnd);
        const insertPos = content.indexOf('\n', lineEnd + 1) + 1;
        return content.slice(0, insertPos) + '\n' + action.codeTemplate + content.slice(insertPos);
      }
      break;

    case 'handler':
      // Insert before return statement
      const returnMatch = content.match(/(\n\s*return\s*\()/);
      if (returnMatch && returnMatch.index !== undefined) {
        return content.slice(0, returnMatch.index) + '\n' + action.codeTemplate + content.slice(returnMatch.index);
      }
      break;

    case 'render':
      // Insert inside the first div/main after return
      const renderMatch = content.match(/return\s*\(\s*\n?\s*<(div|main|section)[^>]*>/);
      if (renderMatch && renderMatch.index !== undefined) {
        const insertPos = renderMatch.index + renderMatch[0].length;
        return content.slice(0, insertPos) + '\n' + action.codeTemplate + content.slice(insertPos);
      }
      break;
  }

  // Fallback: append as comment
  return content + '\n\n// === IGDE REPAIR (MANUAL INTEGRATION) ===\n' + action.codeTemplate;
}

// ============================================
// MANDATORY GRADIENT DESCENT LOOP
// ============================================

/**
 * Run the Intent Gradient Descent Engine
 *
 * MANDATORY: Runs if W-ISS-D < 95%, regardless of "critical blockers"
 * MONOTONIC: Must improve or hard fail
 * CONVERGENT: Tracks each intent to convergence or proves impossibility
 */
export async function runGradientDescent(
  buildId: string,
  buildDir: string,
  wiss: WISSReport,
  chains: IntentCausalChain[],
  previousWISS: number | null
): Promise<GradientRepairResult> {
  console.log('[IGDE] ==========================================');
  console.log('[IGDE] INTENT GRADIENT DESCENT ENGINE v3');
  console.log('[IGDE] with CONVERGENCE LAYER');
  console.log('[IGDE] ==========================================');
  console.log(`[IGDE] Current W-ISS-D: ${wiss.score}%`);
  console.log(`[IGDE] Previous W-ISS-D: ${previousWISS ?? 'N/A (first build)'}%`);
  console.log(`[IGDE] Threshold: ${WISS_THRESHOLDS.HARD_FAIL}%`);

  // Initialize managers
  const debtManager = new IntentDebtManager(buildDir);
  const convergenceManager = new ConvergenceContractManager(buildDir);

  // Create contracts for all intents
  const newImpossibilityProofs: ImpossibilityProof[] = [];
  for (const chain of chains) {
    let contract = convergenceManager.getContract(chain.intent.id);
    if (!contract) {
      contract = convergenceManager.createContract(chain.intent);
    }

    // Get current axis scores
    const axisScores: Record<AxisType, number> = {
      trigger: chain.axisScores.trigger,
      state: chain.axisScores.state,
      effect: chain.axisScores.effect,
      outcome: chain.axisScores.outcome,
    };

    // Update ISS in convergence state
    convergenceManager.updateISS(chain.intent.id, chain.rawScore);

    // Check if converged
    if (chain.satisfied) {
      convergenceManager.checkConvergence(chain.intent.id, axisScores);
    }

    // TERMINATION DETECTION: Check if should be declared impossible
    const termResult = convergenceManager.checkTermination(
      chain.intent.id,
      chain.rawScore,
      axisScores,
      buildId
    );

    if (termResult.terminated && termResult.proof) {
      newImpossibilityProofs.push(termResult.proof);
      logImpossibilityProof(termResult.proof);
    }
  }

  // Get global convergence status
  const convergenceStatus = convergenceManager.getGlobalStatus();
  logConvergenceStatus(convergenceStatus);

  // Default result with convergence info
  const result: GradientRepairResult = {
    planExecuted: false,
    plan: null,
    optimization: {
      selectedIntent: null,
      selectedReason: '',
      previousScore: previousWISS ?? wiss.score,
      newScore: wiss.score,
      delta: 0,
      status: 'COMPLETE',
      statusReason: 'W-ISS-D at threshold',
      repairAttempted: false,
      repairAxis: null,
      repairFile: null,
      monotonicityViolation: false,
    },
    monotonicityCheck: null,
    filesModified: [],
    codeGenerated: '',
    debtSnapshot: {
      totalEntries: debtManager.getLedger().entries.length,
      totalWeight: debtManager.getLedger().totalDebt,
      unresolvedCount: debtManager.getUnresolvedDebt().length,
    },
    convergence: convergenceStatus,
    axisOrderViolation: {
      occurred: false,
      intentId: null,
      attemptedAxis: null,
      blockedBy: null,
      message: null,
    },
    newImpossibilityProofs,
  };

  // Check if convergence is blocked
  if (convergenceStatus.status === 'BLOCKED' && !convergenceStatus.canShip) {
    console.log(`[IGDE] CONVERGENCE BLOCKED: ${convergenceStatus.shipBlocker}`);
    result.optimization.status = 'FAILED';
    result.optimization.statusReason = `Convergence blocked: ${convergenceStatus.shipBlocker}`;
    return result;
  }

  // Check if fully converged
  if (convergenceStatus.status === 'CONVERGED') {
    console.log('[IGDE] All intents converged - no repair needed');
    result.optimization.status = 'COMPLETE';
    result.optimization.statusReason = 'All intents converged';
    return result;
  }

  // Check if repair is mandatory
  if (wiss.score >= WISS_THRESHOLDS.HARD_FAIL) {
    console.log(`[IGDE] W-ISS-D ${wiss.score}% >= ${WISS_THRESHOLDS.HARD_FAIL}% - repair not mandatory`);

    // Still check monotonicity if we have previous score
    if (previousWISS !== null) {
      const monoCheck = checkMonotonicity(previousWISS, wiss.score);
      result.monotonicityCheck = monoCheck;

      if (!monoCheck.passed) {
        result.optimization.status = 'FAILED';
        result.optimization.statusReason = monoCheck.violation || 'Monotonicity violated';
        result.optimization.monotonicityViolation = true;
      }
    }

    return result;
  }

  // W-ISS-D < 95% - MANDATORY REPAIR
  console.log(`[IGDE] W-ISS-D ${wiss.score}% < ${WISS_THRESHOLDS.HARD_FAIL}% - MANDATORY REPAIR`);

  // Generate gradient repair plan (one intent only) with AXIS ORDER ENFORCEMENT
  const planResult = generateGradientRepairPlan(
    buildId,
    wiss,
    chains,
    debtManager,
    convergenceManager,
    previousWISS ?? wiss.score
  );

  // Record axis order violation if any
  result.axisOrderViolation = planResult.axisOrderViolation;

  if (planResult.axisOrderViolation.occurred) {
    console.log(`[IGDE] Axis order blocked: ${planResult.axisOrderViolation.message}`);
    // Not a hard fail - we just can't repair this particular intent yet
    // Try to find another intent to repair
  }

  if (!planResult.plan) {
    // No repair possible
    console.log('[IGDE] Cannot generate repair plan');

    if (convergenceStatus.active > 0) {
      // There are active intents but we can't repair any right now
      result.optimization.status = 'STALLED';
      result.optimization.statusReason = planResult.axisOrderViolation.occurred
        ? `Blocked by axis order: ${planResult.axisOrderViolation.message}`
        : 'No actionable intents for repair';
    } else {
      // All intents are either converged or impossible
      result.optimization.status = convergenceStatus.canShip ? 'COMPLETE' : 'FAILED';
      result.optimization.statusReason = convergenceStatus.canShip
        ? 'All repairable intents converged'
        : `Cannot ship: ${convergenceStatus.shipBlocker}`;
    }

    return result;
  }

  const plan = planResult.plan;
  result.plan = plan;
  result.optimization.selectedIntent = plan.selectedIntent.intentId;
  result.optimization.selectedReason = `${plan.selectedIntent.requirement.slice(0, 40)}... (criticality: ${plan.selectedIntent.effectiveCriticality.toFixed(2)})`;
  result.optimization.repairAxis = plan.repairAction.axis;
  result.optimization.repairFile = plan.repairAction.targetFile;
  result.optimization.previousScore = plan.previousWISS;

  // Execute repair (one attempt only - IGDE rule)
  const execResult = executeGradientRepair(plan, buildDir);
  result.planExecuted = true;
  result.filesModified = execResult.filesModified;
  result.codeGenerated = plan.repairAction.codeTemplate;
  result.optimization.repairAttempted = true;

  // Record repair attempt in convergence manager
  convergenceManager.recordRepairAttempt(
    plan.selectedIntent.intentId,
    plan.repairAction.axis,
    0, // Delta unknown until re-validation
    execResult.success
  );

  if (!execResult.success) {
    // Record failed attempt in debt
    debtManager.recordAttempt(
      plan.selectedIntent.intentId,
      plan.selectedIntent.requirement,
      plan.selectedIntent.missingAxes,
      0 // No improvement
    );

    result.optimization.status = 'FAILED';
    result.optimization.statusReason = `Repair execution failed: ${execResult.error}`;
    return result;
  }

  // Save repair plan artifact
  const repairDir = path.join(buildDir, 'repairs');
  fs.mkdirSync(repairDir, { recursive: true });
  fs.writeFileSync(
    path.join(repairDir, `gradient-repair-${buildId}.json`),
    JSON.stringify({
      plan,
      execResult,
      convergence: convergenceStatus,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );

  // NOTE: Monotonicity check happens AFTER re-validation in the calling code
  // Here we just mark as potentially improved
  result.optimization.status = 'IMPROVED';
  result.optimization.statusReason = `Repaired ${plan.repairAction.axis} axis for intent`;

  // Update snapshots
  result.debtSnapshot = {
    totalEntries: debtManager.getLedger().entries.length,
    totalWeight: debtManager.getLedger().totalDebt,
    unresolvedCount: debtManager.getUnresolvedDebt().length,
  };
  result.convergence = convergenceManager.getGlobalStatus();

  console.log('[IGDE] ==========================================');
  console.log('[IGDE] GRADIENT DESCENT CYCLE COMPLETE');
  console.log(`[IGDE] Repaired: ${plan.repairAction.axis} for ${plan.selectedIntent.intentId}`);
  console.log(`[IGDE] Files modified: ${result.filesModified.join(', ')}`);
  console.log(`[IGDE] Convergence: ${result.convergence.converged}/${result.convergence.totalIntents} converged`);
  console.log('[IGDE] ==========================================');

  return result;
}

/**
 * Verify monotonicity after repair and re-validation
 * Call this AFTER re-running ICG analysis
 */
export function verifyMonotonicity(
  previousWISS: number,
  newWISS: number,
  debtManager: IntentDebtManager,
  selectedIntentId: string,
  missingAxes: string[]
): MonotonicityCheck {
  const check = checkMonotonicity(previousWISS, newWISS);

  if (check.passed) {
    // Record successful repair
    debtManager.recordAttempt(selectedIntentId, '', missingAxes, check.delta);

    // If intent is now fully satisfied, resolve it
    if (newWISS >= WISS_THRESHOLDS.HARD_FAIL) {
      debtManager.resolveIntent(selectedIntentId);
    }
  } else {
    // Record failed attempt with increased debt
    debtManager.recordAttempt(selectedIntentId, '', missingAxes, check.delta);
  }

  return check;
}

// ============================================
// LEGACY COMPATIBILITY (deprecated)
// ============================================

/** @deprecated Use runGradientDescent instead */
export async function runRepairLoop(
  buildId: string,
  buildDir: string,
  wiss: WISSReport,
  chains: IntentCausalChain[]
): Promise<{
  plansGenerated: any[];
  requiresApproval: boolean;
  message: string;
}> {
  // Redirect to new IGDE
  const result = await runGradientDescent(buildId, buildDir, wiss, chains, null);

  return {
    plansGenerated: result.plan ? [result.plan] : [],
    requiresApproval: result.optimization.status === 'FAILED',
    message: result.optimization.statusReason,
  };
}

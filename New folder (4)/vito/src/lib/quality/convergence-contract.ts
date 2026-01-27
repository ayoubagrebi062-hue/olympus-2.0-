/**
 * OLYMPUS 2.0 - Intent Convergence Contract System
 *
 * Every intent MUST either:
 * 1) Fully converge (all required axes satisfied), OR
 * 2) Be formally proven impossible
 *
 * This is NOT optional. This layer decides when OLYMPUS stops trying.
 */

import * as fs from 'fs';
import * as path from 'path';
import { IntentSpec } from './intent-graph';

// ============================================
// TYPES
// ============================================

export type AxisType = 'trigger' | 'state' | 'effect' | 'outcome';

/**
 * Defines the convergence requirements for a single intent
 */
export interface ConvergenceContract {
  intentId: string;
  requirement: string;
  priority: IntentSpec['priority'];

  // Which axes are required for this intent to be satisfied
  requiredAxes: AxisType[];

  // Strict order in which axes must be repaired
  // IGDE may ONLY repair the next missing axis in this order
  axisOrder: AxisType[];

  // Maximum repair attempts before declaring impossible
  maxRepairs: number;

  // Minimum acceptable Intent Satisfaction Score (0.0 - 1.0)
  minAcceptableISS: number;

  // Timestamp
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Proof that an intent is impossible to satisfy
 */
export interface ImpossibilityProof {
  intentId: string;
  requirement: string;
  priority: IntentSpec['priority'];

  // Evidence
  missingAxes: AxisType[];
  attemptedRepairs: number;
  lastDelta: number;
  lastISS: number;

  // Blocking dependencies (if detected)
  blockingDependency: {
    type: 'missing_component' | 'circular_dependency' | 'external_api' | 'state_conflict' | 'unknown';
    description: string;
    evidence: string[];
  } | null;

  // Deterministic reason for impossibility
  reason: string;

  // Reproducibility
  reproSteps: string[];

  // Timestamps
  declaredAt: Date;
  buildId: string;
}

/**
 * Status of intent convergence
 */
export type ConvergenceStatus = 'PENDING' | 'IN_PROGRESS' | 'CONVERGED' | 'IMPOSSIBLE';

/**
 * State of a single intent's convergence journey
 */
export interface IntentConvergenceState {
  intentId: string;
  contract: ConvergenceContract;
  status: ConvergenceStatus;

  // Progress
  satisfiedAxes: AxisType[];
  currentAxisIndex: number;  // Which axis we're working on
  repairAttempts: number;
  lastISS: number;

  // History
  repairHistory: Array<{
    attemptNumber: number;
    axis: AxisType;
    timestamp: Date;
    issDelta: number;
    success: boolean;
  }>;

  // If impossible
  impossibilityProof: ImpossibilityProof | null;
}

/**
 * Global convergence summary
 */
export interface GlobalConvergenceStatus {
  totalIntents: number;
  converged: number;
  impossible: number;
  active: number;  // In progress

  // Ship eligibility
  convergenceRate: number;  // converged / totalIntents
  hasNonCriticalImpossible: boolean;
  hasCriticalImpossible: boolean;

  // Final status
  status: 'CONVERGED' | 'BLOCKED' | 'IN_PROGRESS';
  canShip: boolean;
  shipBlocker: string | null;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_MAX_REPAIRS = 3;
const DEFAULT_MIN_ACCEPTABLE_ISS = 0.75;  // 75%
const SHIP_CONVERGENCE_THRESHOLD = 0.95;  // 95%

/**
 * Standard axis order - outcome depends on effect, effect depends on state, state depends on trigger
 */
export const STANDARD_AXIS_ORDER: AxisType[] = ['trigger', 'state', 'effect', 'outcome'];

/**
 * Default required axes based on intent priority
 */
export function getDefaultRequiredAxes(priority: IntentSpec['priority']): AxisType[] {
  switch (priority) {
    case 'critical':
      // Critical intents require ALL axes
      return ['trigger', 'state', 'effect', 'outcome'];
    case 'high':
      // High priority may skip state if simple
      return ['trigger', 'effect', 'outcome'];
    case 'medium':
      // Medium can work with trigger and outcome
      return ['trigger', 'outcome'];
    case 'low':
      // Low priority just needs to be visible
      return ['outcome'];
    default:
      return ['trigger', 'state', 'effect', 'outcome'];
  }
}

/**
 * Get min acceptable ISS based on priority
 */
export function getDefaultMinAcceptableISS(priority: IntentSpec['priority']): number {
  switch (priority) {
    case 'critical': return 1.0;    // Must be 100%
    case 'high': return 0.85;       // 85%
    case 'medium': return 0.75;     // 75%
    case 'low': return 0.5;         // 50%
    default: return 0.75;
  }
}

// ============================================
// CONTRACT MANAGER
// ============================================

const CONTRACT_FILE = 'convergence-contracts.json';
const STATE_FILE = 'convergence-state.json';

interface PersistedState {
  version: number;
  lastUpdated: Date;
  contracts: Record<string, ConvergenceContract>;
  states: Record<string, IntentConvergenceState>;
  impossibilityProofs: ImpossibilityProof[];
}

/**
 * Manages convergence contracts and state for all intents
 */
export class ConvergenceContractManager {
  private basePath: string;
  private contracts: Map<string, ConvergenceContract> = new Map();
  private states: Map<string, IntentConvergenceState> = new Map();
  private impossibilityProofs: ImpossibilityProof[] = [];

  constructor(buildDir: string) {
    this.basePath = path.join(buildDir, '.olympus');
    fs.mkdirSync(this.basePath, { recursive: true });
    this.load();
  }

  /**
   * Load persisted state
   */
  private load(): void {
    const filePath = path.join(this.basePath, STATE_FILE);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: PersistedState = JSON.parse(content);

        for (const [id, contract] of Object.entries(data.contracts)) {
          this.contracts.set(id, contract);
        }
        for (const [id, state] of Object.entries(data.states)) {
          this.states.set(id, state);
        }
        this.impossibilityProofs = data.impossibilityProofs || [];
      } catch (err) {
        console.error('[Convergence] Failed to load state:', err);
      }
    }
  }

  /**
   * Save state to disk
   */
  save(): void {
    const data: PersistedState = {
      version: 1,
      lastUpdated: new Date(),
      contracts: Object.fromEntries(this.contracts),
      states: Object.fromEntries(this.states),
      impossibilityProofs: this.impossibilityProofs,
    };

    const filePath = path.join(this.basePath, STATE_FILE);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Create or update a contract for an intent
   */
  createContract(intent: IntentSpec, overrides?: Partial<ConvergenceContract>): ConvergenceContract {
    const existing = this.contracts.get(intent.id);

    const contract: ConvergenceContract = {
      intentId: intent.id,
      requirement: intent.requirement,
      priority: intent.priority,
      requiredAxes: overrides?.requiredAxes || getDefaultRequiredAxes(intent.priority),
      axisOrder: overrides?.axisOrder || STANDARD_AXIS_ORDER,
      maxRepairs: overrides?.maxRepairs ?? DEFAULT_MAX_REPAIRS,
      minAcceptableISS: overrides?.minAcceptableISS ?? getDefaultMinAcceptableISS(intent.priority),
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.contracts.set(intent.id, contract);

    // Initialize state if not exists
    if (!this.states.has(intent.id)) {
      this.initializeState(intent.id, contract);
    }

    this.save();
    return contract;
  }

  /**
   * Initialize convergence state for an intent
   */
  private initializeState(intentId: string, contract: ConvergenceContract): IntentConvergenceState {
    const state: IntentConvergenceState = {
      intentId,
      contract,
      status: 'PENDING',
      satisfiedAxes: [],
      currentAxisIndex: 0,
      repairAttempts: 0,
      lastISS: 0,
      repairHistory: [],
      impossibilityProof: null,
    };

    this.states.set(intentId, state);
    return state;
  }

  /**
   * Get contract for an intent
   */
  getContract(intentId: string): ConvergenceContract | null {
    return this.contracts.get(intentId) || null;
  }

  /**
   * Get convergence state for an intent
   */
  getState(intentId: string): IntentConvergenceState | null {
    return this.states.get(intentId) || null;
  }

  /**
   * Get the next axis to repair for an intent
   * Returns null if all required axes are satisfied or if blocked
   */
  getNextRepairAxis(intentId: string, currentAxisScores: Record<AxisType, number>): {
    axis: AxisType | null;
    blocked: boolean;
    blockReason: string | null;
  } {
    const contract = this.contracts.get(intentId);
    const state = this.states.get(intentId);

    if (!contract || !state) {
      return { axis: null, blocked: true, blockReason: 'No contract found' };
    }

    // Check each axis in order
    for (let i = 0; i < contract.axisOrder.length; i++) {
      const axis = contract.axisOrder[i];

      // Skip if not required
      if (!contract.requiredAxes.includes(axis)) continue;

      const score = currentAxisScores[axis] || 0;

      // If this axis is incomplete
      if (score < 1.0) {
        // Check if previous required axes are complete
        for (let j = 0; j < i; j++) {
          const prevAxis = contract.axisOrder[j];
          if (contract.requiredAxes.includes(prevAxis)) {
            const prevScore = currentAxisScores[prevAxis] || 0;
            if (prevScore < 1.0) {
              // Blocked by earlier axis
              return {
                axis: null,
                blocked: true,
                blockReason: `Cannot repair ${axis}: earlier axis ${prevAxis} is incomplete (score: ${prevScore})`,
              };
            }
          }
        }

        // This is the next axis to repair
        return { axis, blocked: false, blockReason: null };
      }
    }

    // All required axes are satisfied
    return { axis: null, blocked: false, blockReason: null };
  }

  /**
   * Record a repair attempt
   */
  recordRepairAttempt(
    intentId: string,
    axis: AxisType,
    issDelta: number,
    success: boolean
  ): void {
    const state = this.states.get(intentId);
    if (!state) return;

    state.repairAttempts++;
    state.status = 'IN_PROGRESS';
    state.repairHistory.push({
      attemptNumber: state.repairAttempts,
      axis,
      timestamp: new Date(),
      issDelta,
      success,
    });

    if (success) {
      if (!state.satisfiedAxes.includes(axis)) {
        state.satisfiedAxes.push(axis);
      }
    }

    this.save();
  }

  /**
   * Update ISS for an intent
   */
  updateISS(intentId: string, iss: number): void {
    const state = this.states.get(intentId);
    if (!state) return;

    state.lastISS = iss;
    this.save();
  }

  /**
   * Check if an intent has converged
   */
  checkConvergence(intentId: string, currentAxisScores: Record<AxisType, number>): boolean {
    const contract = this.contracts.get(intentId);
    const state = this.states.get(intentId);

    if (!contract || !state) return false;

    // Check all required axes are satisfied
    for (const axis of contract.requiredAxes) {
      if ((currentAxisScores[axis] || 0) < 1.0) {
        return false;
      }
    }

    // Mark as converged
    state.status = 'CONVERGED';
    state.satisfiedAxes = [...contract.requiredAxes];
    this.save();

    return true;
  }

  /**
   * Check if an intent should be declared impossible
   */
  checkTermination(
    intentId: string,
    currentISS: number,
    currentAxisScores: Record<AxisType, number>,
    buildId: string
  ): { terminated: boolean; proof: ImpossibilityProof | null } {
    const contract = this.contracts.get(intentId);
    const state = this.states.get(intentId);

    if (!contract || !state) {
      return { terminated: false, proof: null };
    }

    // Already converged or impossible
    if (state.status === 'CONVERGED' || state.status === 'IMPOSSIBLE') {
      return { terminated: state.status === 'IMPOSSIBLE', proof: state.impossibilityProof };
    }

    // Check termination conditions
    if (state.repairAttempts >= contract.maxRepairs && currentISS < contract.minAcceptableISS) {
      // Detect blocking dependency
      const blockingDependency = this.detectBlockingDependency(intentId, state, currentAxisScores);

      // Generate deterministic reason
      const reason = this.generateImpossibilityReason(state, contract, currentAxisScores, blockingDependency);

      // Create proof
      const proof: ImpossibilityProof = {
        intentId,
        requirement: contract.requirement,
        priority: contract.priority,
        missingAxes: contract.requiredAxes.filter(axis => (currentAxisScores[axis] || 0) < 1.0),
        attemptedRepairs: state.repairAttempts,
        lastDelta: state.repairHistory.length > 0
          ? state.repairHistory[state.repairHistory.length - 1].issDelta
          : 0,
        lastISS: currentISS,
        blockingDependency,
        reason,
        reproSteps: this.generateReproSteps(state),
        declaredAt: new Date(),
        buildId,
      };

      // Update state
      state.status = 'IMPOSSIBLE';
      state.impossibilityProof = proof;
      this.impossibilityProofs.push(proof);
      this.save();

      return { terminated: true, proof };
    }

    return { terminated: false, proof: null };
  }

  /**
   * Detect what's blocking an intent
   */
  private detectBlockingDependency(
    intentId: string,
    state: IntentConvergenceState,
    axisScores: Record<AxisType, number>
  ): ImpossibilityProof['blockingDependency'] {
    const contract = state.contract;
    const evidence: string[] = [];

    // Check for consistent failure on same axis
    const axisCounts: Record<string, number> = {};
    for (const repair of state.repairHistory) {
      if (!repair.success) {
        axisCounts[repair.axis] = (axisCounts[repair.axis] || 0) + 1;
      }
    }

    const mostFailedAxis = Object.entries(axisCounts)
      .sort(([, a], [, b]) => b - a)[0];

    if (mostFailedAxis && mostFailedAxis[1] >= 2) {
      const axis = mostFailedAxis[0] as AxisType;

      // Determine type based on axis
      if (axis === 'trigger') {
        return {
          type: 'missing_component',
          description: `Trigger axis failed ${mostFailedAxis[1]} times - likely missing UI component or event handler`,
          evidence: [`Axis ${axis} score: ${axisScores[axis] || 0}`, `Failed repairs: ${mostFailedAxis[1]}`],
        };
      }

      if (axis === 'state') {
        return {
          type: 'state_conflict',
          description: `State axis failed ${mostFailedAxis[1]} times - possible state management conflict`,
          evidence: [`Axis ${axis} score: ${axisScores[axis] || 0}`, `Failed repairs: ${mostFailedAxis[1]}`],
        };
      }

      if (axis === 'effect') {
        return {
          type: 'circular_dependency',
          description: `Effect axis failed ${mostFailedAxis[1]} times - trigger may not properly connect to state`,
          evidence: [`Axis ${axis} score: ${axisScores[axis] || 0}`, `Failed repairs: ${mostFailedAxis[1]}`],
        };
      }

      if (axis === 'outcome') {
        return {
          type: 'external_api',
          description: `Outcome axis failed ${mostFailedAxis[1]} times - state may not be rendered`,
          evidence: [`Axis ${axis} score: ${axisScores[axis] || 0}`, `Failed repairs: ${mostFailedAxis[1]}`],
        };
      }
    }

    // No clear pattern
    return {
      type: 'unknown',
      description: 'No clear blocking pattern detected',
      evidence: [`Total repairs: ${state.repairAttempts}`, `Last ISS: ${state.lastISS}`],
    };
  }

  /**
   * Generate deterministic impossibility reason
   */
  private generateImpossibilityReason(
    state: IntentConvergenceState,
    contract: ConvergenceContract,
    axisScores: Record<AxisType, number>,
    blockingDependency: ImpossibilityProof['blockingDependency']
  ): string {
    const missingAxes = contract.requiredAxes.filter(axis => (axisScores[axis] || 0) < 1.0);

    const parts: string[] = [
      `Intent "${contract.requirement.slice(0, 50)}..." declared IMPOSSIBLE.`,
      `Reason: After ${state.repairAttempts}/${contract.maxRepairs} repair attempts,`,
      `ISS=${(state.lastISS * 100).toFixed(1)}% < min=${(contract.minAcceptableISS * 100).toFixed(1)}%.`,
      `Missing axes: [${missingAxes.join(', ')}].`,
    ];

    if (blockingDependency) {
      parts.push(`Blocking: ${blockingDependency.type} - ${blockingDependency.description}`);
    }

    return parts.join(' ');
  }

  /**
   * Generate reproducibility steps
   */
  private generateReproSteps(state: IntentConvergenceState): string[] {
    return [
      `1. Build with intent: ${state.contract.requirement.slice(0, 60)}`,
      `2. Required axes: [${state.contract.requiredAxes.join(', ')}]`,
      `3. Max repairs allowed: ${state.contract.maxRepairs}`,
      `4. Repair history: ${state.repairHistory.map(r => `${r.axis}:${r.success ? 'OK' : 'FAIL'}`).join(' → ')}`,
      `5. Final ISS: ${(state.lastISS * 100).toFixed(1)}% (min: ${(state.contract.minAcceptableISS * 100).toFixed(1)}%)`,
    ];
  }

  /**
   * Calculate global convergence status
   */
  getGlobalStatus(): GlobalConvergenceStatus {
    let converged = 0;
    let impossible = 0;
    let active = 0;
    let hasCriticalImpossible = false;
    let hasNonCriticalImpossible = false;

    for (const state of this.states.values()) {
      switch (state.status) {
        case 'CONVERGED':
          converged++;
          break;
        case 'IMPOSSIBLE':
          impossible++;
          if (state.contract.priority === 'critical') {
            hasCriticalImpossible = true;
          } else {
            hasNonCriticalImpossible = true;
          }
          break;
        case 'IN_PROGRESS':
        case 'PENDING':
          active++;
          break;
      }
    }

    const totalIntents = this.states.size;
    const convergenceRate = totalIntents > 0 ? converged / totalIntents : 0;

    // Determine global status
    let status: GlobalConvergenceStatus['status'];
    if (active === 0 && impossible === 0) {
      status = 'CONVERGED';
    } else if (hasCriticalImpossible || convergenceRate < SHIP_CONVERGENCE_THRESHOLD) {
      status = 'BLOCKED';
    } else {
      status = 'IN_PROGRESS';
    }

    // Can ship?
    const canShip = convergenceRate >= SHIP_CONVERGENCE_THRESHOLD && !hasCriticalImpossible;

    let shipBlocker: string | null = null;
    if (!canShip) {
      if (hasCriticalImpossible) {
        shipBlocker = 'Critical intent declared impossible';
      } else if (convergenceRate < SHIP_CONVERGENCE_THRESHOLD) {
        shipBlocker = `Convergence rate ${(convergenceRate * 100).toFixed(1)}% < ${SHIP_CONVERGENCE_THRESHOLD * 100}%`;
      }
    }

    return {
      totalIntents,
      converged,
      impossible,
      active,
      convergenceRate,
      hasNonCriticalImpossible,
      hasCriticalImpossible,
      status,
      canShip,
      shipBlocker,
    };
  }

  /**
   * Get all impossibility proofs
   */
  getImpossibilityProofs(): ImpossibilityProof[] {
    return [...this.impossibilityProofs];
  }

  /**
   * Get all contracts
   */
  getAllContracts(): ConvergenceContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get all states
   */
  getAllStates(): IntentConvergenceState[] {
    return Array.from(this.states.values());
  }
}

// ============================================
// AXIS ORDER VALIDATOR
// ============================================

export interface AxisOrderViolation {
  intentId: string;
  attemptedAxis: AxisType;
  blockedBy: AxisType;
  blockedByScore: number;
  message: string;
}

/**
 * Validate that a repair attempt follows axis order
 */
export function validateAxisOrder(
  contract: ConvergenceContract,
  targetAxis: AxisType,
  currentAxisScores: Record<AxisType, number>
): { valid: boolean; violation: AxisOrderViolation | null } {
  const targetIndex = contract.axisOrder.indexOf(targetAxis);

  // Check all earlier required axes
  for (let i = 0; i < targetIndex; i++) {
    const earlierAxis = contract.axisOrder[i];

    // Only check if it's required
    if (!contract.requiredAxes.includes(earlierAxis)) continue;

    const score = currentAxisScores[earlierAxis] || 0;
    if (score < 1.0) {
      return {
        valid: false,
        violation: {
          intentId: contract.intentId,
          attemptedAxis: targetAxis,
          blockedBy: earlierAxis,
          blockedByScore: score,
          message: `Cannot repair ${targetAxis}: earlier required axis ${earlierAxis} is incomplete (${(score * 100).toFixed(0)}%)`,
        },
      };
    }
  }

  return { valid: true, violation: null };
}

// ============================================
// LOGGING
// ============================================

export function logConvergenceStatus(status: GlobalConvergenceStatus): void {
  console.log('[Convergence] ==========================================');
  console.log('[Convergence] GLOBAL CONVERGENCE STATUS');
  console.log('[Convergence] ==========================================');
  console.log(`[Convergence] Total Intents: ${status.totalIntents}`);
  console.log(`[Convergence] Converged: ${status.converged} (${(status.convergenceRate * 100).toFixed(1)}%)`);
  console.log(`[Convergence] Impossible: ${status.impossible}`);
  console.log(`[Convergence] Active: ${status.active}`);
  console.log(`[Convergence] Status: ${status.status}`);
  console.log(`[Convergence] Can Ship: ${status.canShip}`);
  if (status.shipBlocker) {
    console.log(`[Convergence] Blocker: ${status.shipBlocker}`);
  }
  console.log('[Convergence] ==========================================');
}

export function logImpossibilityProof(proof: ImpossibilityProof): void {
  console.log('[Convergence] ==========================================');
  console.log('[Convergence] IMPOSSIBILITY PROOF');
  console.log('[Convergence] ==========================================');
  console.log(`[Convergence] Intent: ${proof.requirement.slice(0, 60)}...`);
  console.log(`[Convergence] Priority: ${proof.priority}`);
  console.log(`[Convergence] Reason: ${proof.reason}`);
  console.log(`[Convergence] Missing Axes: [${proof.missingAxes.join(', ')}]`);
  console.log(`[Convergence] Attempts: ${proof.attemptedRepairs}`);
  console.log(`[Convergence] Last ISS: ${(proof.lastISS * 100).toFixed(1)}%`);
  if (proof.blockingDependency) {
    console.log(`[Convergence] Blocking: ${proof.blockingDependency.type}`);
    console.log(`[Convergence]   ${proof.blockingDependency.description}`);
  }
  console.log('[Convergence] Repro Steps:');
  for (const step of proof.reproSteps) {
    console.log(`[Convergence]   ${step}`);
  }
  console.log('[Convergence] ==========================================');
}

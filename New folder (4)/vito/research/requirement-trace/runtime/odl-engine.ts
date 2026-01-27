/**
 * ODL Engine (Obligation Detection Layer)
 *
 * Integrates all ODL components into a cohesive pipeline.
 * Makes silence impossible. Makes inaction provable.
 *
 * KEY PRINCIPLE:
 * - "Failure to decide is still a decision. OLYMPUS records it."
 * - Obligations emerge from system state
 * - Omissions are permanent records
 *
 * PIPELINE:
 * 1. Derive obligations from NE, TSL, invariants
 * 2. Track windows and deadlines
 * 3. Emit violations on deadline miss
 * 4. Record everything in ledger
 * 5. Gate progress based on obligations
 *
 * INTEGRATION:
 * - NE: NecessaryFuture input
 * - TSL: Temporal contracts
 * - AAM: Authority validation
 * - PCL: Proof ledger
 *
 * NON-NEGOTIABLE:
 * - No AI, no heuristics
 * - Deterministic enforcement
 * - Append-only records
 */

import type {
  RequiredDecision,
  ObligationDerivationResult,
  WindowTrackingResult,
  ObligationGateResult,
  OmissionViolation,
  MandatoryDecisionProof,
  ObligationLedgerEntry,
  ODLExecutionResult,
  ODLConfig,
  EntropyStateSnapshot,
  TemporalContractSummary,
  AuthorityClass,
  InvariantCategory
} from './types';
import {
  ObligationDeriver,
  createObligationDeriver,
  NecessaryFutureInput,
  TemporalStateInput,
  InvariantRequirement
} from './obligation-deriver';
import {
  ObligationWindowTracker,
  createObligationWindowTracker
} from './obligation-window-tracker';
import {
  MandatoryDecisionEmitter,
  createMandatoryDecisionEmitter
} from './mandatory-decision-emitter';
import {
  ObligationLedger,
  createObligationLedger
} from './obligation-ledger';
import {
  ObligationGate,
  createObligationGate
} from './obligation-gate';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * ODL execution input
 */
export interface ODLInput {
  // NecessaryFuture from NE
  necessary_future: NecessaryFutureInput | null;

  // Temporal state from TSL
  temporal_state: TemporalStateInput;

  // Invariant requirements
  invariant_requirements: InvariantRequirement[];

  // Entropy state (for proof generation)
  entropy_state?: EntropyStateSnapshot;

  // Contract summary (for proof generation)
  contract_summary?: TemporalContractSummary;
}

/**
 * Fulfillment request
 */
export interface FulfillmentRequest {
  obligation_id: string;
  fulfillment_proof_hash: string;
  fulfilling_authority: AuthorityClass;
  current_step: number;
}

export class ODLEngine {
  private config: Required<ODLConfig>;
  private deriver: ObligationDeriver;
  private windowTracker: ObligationWindowTracker;
  private emitter: MandatoryDecisionEmitter;
  private ledger: ObligationLedger;
  private gate: ObligationGate;
  private initialized: boolean = false;

  constructor(config?: Partial<ODLConfig>) {
    this.config = {
      ledger_dir: config?.ledger_dir ?? './data/obligations',
      warning_threshold_steps: config?.warning_threshold_steps ?? 5,
      block_on_critical: config?.block_on_critical ?? true,
      auto_emit_violations: config?.auto_emit_violations ?? true
    };

    // Create all components
    this.deriver = createObligationDeriver();
    this.windowTracker = createObligationWindowTracker({
      warning_threshold_steps: this.config.warning_threshold_steps
    });
    this.emitter = createMandatoryDecisionEmitter();
    this.ledger = createObligationLedger({
      ledger_dir: this.config.ledger_dir
    });
    this.gate = createObligationGate({
      block_on_critical: this.config.block_on_critical,
      warning_threshold_steps: this.config.warning_threshold_steps
    });

    this.initialized = true;
  }

  /**
   * Execute ODL pipeline
   */
  execute(input: ODLInput): ODLExecutionResult {
    const startTime = Date.now();

    // 1. Derive obligations
    const derivation = this.deriver.derive(
      input.necessary_future,
      input.temporal_state,
      input.invariant_requirements
    );

    // 2. Track new obligations
    this.windowTracker.trackAll(
      derivation.obligations,
      input.temporal_state.current_step
    );

    // Record new obligations in ledger
    for (const obl of derivation.obligations) {
      const existingEntry = this.ledger.findByObligationId(obl.obligation_id);
      if (!existingEntry) {
        this.ledger.recordDetected(obl, input.temporal_state.current_step);
      }
    }

    // 3. Check windows for violations
    const windowStatus = this.windowTracker.checkWindows(
      input.temporal_state.current_step
    );

    // 4. Emit violations for missed deadlines
    const newViolations: OmissionViolation[] = [];
    const mandatoryProofs: MandatoryDecisionProof[] = [];

    if (this.config.auto_emit_violations) {
      const violatedObligations = this.windowTracker.getViolatedObligations();

      for (const obl of violatedObligations) {
        // Check if already recorded as violated
        const ledgerEntry = this.ledger.findByObligationId(obl.obligation_id);
        if (ledgerEntry && ledgerEntry.status === 'VIOLATED') {
          continue; // Already recorded
        }

        // Emit violation
        const emission = this.emitter.emitOmissionViolation(
          obl,
          input.temporal_state.current_step,
          input.entropy_state,
          input.contract_summary
        );

        newViolations.push(emission.violation);
        mandatoryProofs.push(emission.proof);

        // Record in ledger
        this.ledger.recordViolated(
          obl.obligation_id,
          emission.violation,
          input.temporal_state.current_step
        );
      }
    }

    // 5. Gate check
    const pendingObligations = this.windowTracker.getByStatus('PENDING');
    const allViolations = this.ledger.getViolations().map(e => e.violation!);

    const gateResult = this.gate.check(
      pendingObligations,
      allViolations,
      input.temporal_state.current_step
    );

    const executionTime = Date.now() - startTime;

    return {
      derivation,
      window_status: windowStatus,
      gate_result: gateResult,
      new_violations: newViolations,
      mandatory_proofs: mandatoryProofs,
      ledger_entry: null, // Multiple entries may have been written
      execution_time_ms: executionTime,
      odl_version: ODL_VERSION
    };
  }

  /**
   * Detect obligations only (without tracking or emitting)
   */
  detectOnly(input: ODLInput): ObligationDerivationResult {
    return this.deriver.derive(
      input.necessary_future,
      input.temporal_state,
      input.invariant_requirements
    );
  }

  /**
   * Check current obligation status
   */
  checkStatus(currentStep: number): {
    window_status: WindowTrackingResult;
    gate_result: ObligationGateResult;
  } {
    const windowStatus = this.windowTracker.checkWindows(currentStep);

    const pendingObligations = this.windowTracker.getByStatus('PENDING');
    const allViolations = this.ledger.getViolations().map(e => e.violation!);

    const gateResult = this.gate.check(
      pendingObligations,
      allViolations,
      currentStep
    );

    return { window_status: windowStatus, gate_result: gateResult };
  }

  /**
   * Fulfill an obligation
   */
  fulfill(request: FulfillmentRequest): {
    success: boolean;
    ledger_entry: ObligationLedgerEntry | null;
    proof: MandatoryDecisionProof | null;
    error: string | null;
  } {
    const obligation = this.windowTracker.getObligation(request.obligation_id);
    if (!obligation) {
      return {
        success: false,
        ledger_entry: null,
        proof: null,
        error: `Obligation ${request.obligation_id} not found`
      };
    }

    // Validate authority
    const authorityLevel = this.getAuthorityLevel(request.fulfilling_authority);
    const validation = this.gate.validateFulfillmentAuthority(
      obligation,
      request.fulfilling_authority,
      authorityLevel
    );

    if (!validation.valid) {
      return {
        success: false,
        ledger_entry: null,
        proof: null,
        error: validation.reason
      };
    }

    // Mark as fulfilled in tracker
    const fulfilled = this.windowTracker.fulfill(
      request.obligation_id,
      request.current_step
    );

    if (!fulfilled) {
      return {
        success: false,
        ledger_entry: null,
        proof: null,
        error: `Could not fulfill obligation (may be already violated or fulfilled)`
      };
    }

    // Record in ledger
    const ledgerEntry = this.ledger.recordFulfilled(
      request.obligation_id,
      request.fulfillment_proof_hash,
      request.fulfilling_authority,
      request.current_step
    );

    // Create fulfillment proof
    const proof = this.emitter.createFulfillmentProof(
      obligation,
      request.fulfillment_proof_hash,
      request.fulfilling_authority,
      request.current_step
    );

    return {
      success: true,
      ledger_entry: ledgerEntry,
      proof,
      error: null
    };
  }

  /**
   * Create a system mandate (explicit required decision)
   */
  createMandate(
    actionType: string,
    description: string,
    deadlineStep: number,
    protectedInvariant: InvariantCategory,
    currentStep: number
  ): RequiredDecision {
    const mandate = this.deriver.createSystemMandate(
      actionType,
      description,
      deadlineStep,
      protectedInvariant
    );

    // Track the mandate
    this.windowTracker.track(mandate, currentStep);

    // Record in ledger
    this.ledger.recordDetected(mandate, currentStep);

    return mandate;
  }

  /**
   * Get obligation by ID
   */
  getObligation(obligationId: string): RequiredDecision | null {
    return this.windowTracker.getObligation(obligationId);
  }

  /**
   * Get ledger entry by obligation ID
   */
  getLedgerEntry(obligationId: string): ObligationLedgerEntry | null {
    return this.ledger.findByObligationId(obligationId);
  }

  /**
   * Get all pending obligations
   */
  getPendingObligations(): RequiredDecision[] {
    return [
      ...this.windowTracker.getByStatus('DETECTED'),
      ...this.windowTracker.getByStatus('PENDING')
    ];
  }

  /**
   * Get all violations
   */
  getViolations(): OmissionViolation[] {
    return this.ledger.getViolations().map(e => e.violation!);
  }

  /**
   * Get approaching deadlines
   */
  getApproachingDeadlines(currentStep: number): Array<{
    obligation: RequiredDecision;
    steps_remaining: number;
  }> {
    return this.windowTracker.getApproachingDeadlines(currentStep);
  }

  /**
   * Verify ledger integrity
   */
  verifyLedger(): {
    valid: boolean;
    chain_intact: boolean;
    total_entries: number;
    verified_count: number;
    errors: string[];
  } {
    return this.ledger.verify();
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): {
    deriver: ReturnType<ObligationDeriver['getStats']>;
    tracker: ReturnType<ObligationWindowTracker['getStats']>;
    emitter: ReturnType<MandatoryDecisionEmitter['getStats']>;
    ledger: ReturnType<ObligationLedger['getStats']>;
    gate: ReturnType<ObligationGate['getStats']>;
    version: string;
  } {
    return {
      deriver: this.deriver.getStats(),
      tracker: this.windowTracker.getStats(),
      emitter: this.emitter.getStats(),
      ledger: this.ledger.getStats(),
      gate: this.gate.getStats(),
      version: ODL_VERSION
    };
  }

  /**
   * Get authority level
   */
  private getAuthorityLevel(authority: AuthorityClass): number {
    const levels: Record<AuthorityClass, number> = {
      'USER': 1,
      'PROJECT': 2,
      'CONSTITUTIONAL': 3,
      'SYSTEM_ROOT': 4
    };
    return levels[authority] ?? 0;
  }

  /**
   * Clear all data (FOR TESTING ONLY)
   */
  _dangerousClear(): void {
    console.warn('[ODLEngine] WARNING: Clearing all data - TESTING ONLY');
    this.windowTracker._dangerousClear();
    this.ledger._dangerousClear();
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get ODL version
   */
  getVersion(): string {
    return ODL_VERSION;
  }
}

/**
 * Create a new ODLEngine
 */
export function createODLEngine(config?: Partial<ODLConfig>): ODLEngine {
  return new ODLEngine(config);
}

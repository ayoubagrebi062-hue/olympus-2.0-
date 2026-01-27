/**
 * Phase Classifier
 *
 * Classifies architectural phase based on entropy score.
 *
 * PHASES:
 *   STABLE:     entropy <= 0.25 - Healthy architecture
 *   DECAYING:   0.25 < entropy <= 0.50 - MCCS mandatory
 *   COLLAPSING: 0.50 < entropy <= 0.75 - READ_ONLY mode
 *   DEAD:       entropy > 0.75 - PERMANENT HALT
 *
 * RULES:
 *   - Thresholds are FIXED CONSTANTS (compile-time)
 *   - Phase can ONLY worsen without MCCS convergence
 *   - Once DEAD, system is permanently halted
 *
 * NON-NEGOTIABLE:
 *   - No config
 *   - No flag
 *   - No override
 *   - No reset
 *   - Deterministic only
 */

import {
  ENTROPY_PHASE_THRESHOLDS,
  type ArchitecturalPhase,
  type ArchitecturalEntropyScore,
  type EntropyHistoryRecord
} from './types';

// AEC version - immutable
const AEC_VERSION = '1.0.0';
Object.freeze({ AEC_VERSION });

// Phase ordering (for worsening detection)
const PHASE_ORDER: Record<ArchitecturalPhase, number> = Object.freeze({
  STABLE: 0,
  DECAYING: 1,
  COLLAPSING: 2,
  DEAD: 3
});

export interface PhaseClassificationResult {
  phase: ArchitecturalPhase;
  entropy: number;
  thresholds_used: typeof ENTROPY_PHASE_THRESHOLDS;
  previous_phase: ArchitecturalPhase | null;
  phase_worsened: boolean;
  mccs_convergence_detected: boolean;
}

export class PhaseClassifier {
  /**
   * Classify architectural phase based on entropy score
   *
   * THRESHOLDS (FIXED CONSTANTS):
   *   STABLE:     entropy <= 0.25
   *   DECAYING:   0.25 < entropy <= 0.50
   *   COLLAPSING: 0.50 < entropy <= 0.75
   *   DEAD:       entropy > 0.75
   *
   * @param entropyScore - Current entropy score
   * @param previousPhase - Phase from previous run (null if first run)
   * @param mccsConvergence - Whether MCCS convergence was achieved
   */
  classify(
    entropyScore: ArchitecturalEntropyScore,
    previousPhase: ArchitecturalPhase | null,
    mccsConvergence: boolean
  ): PhaseClassificationResult {
    const entropy = entropyScore.entropy;

    // Classify based on fixed thresholds
    let rawPhase = this.classifyFromEntropy(entropy);

    // Apply phase monotonicity rule:
    // Phase can ONLY worsen without MCCS convergence
    // Once DEAD, system is permanently halted (cannot recover)
    let finalPhase = rawPhase;

    if (previousPhase !== null) {
      // DEAD is terminal - no recovery possible
      if (previousPhase === 'DEAD') {
        finalPhase = 'DEAD';
      }
      // Without MCCS convergence, phase cannot improve
      else if (!mccsConvergence) {
        const previousOrder = PHASE_ORDER[previousPhase];
        const rawOrder = PHASE_ORDER[rawPhase];

        // Phase can only stay same or worsen
        if (rawOrder < previousOrder) {
          finalPhase = previousPhase;
        }
      }
      // With MCCS convergence, phase CAN improve
      // (this is the ONLY way to improve)
    }

    // Determine if phase worsened
    const phaseWorsened = previousPhase !== null &&
      PHASE_ORDER[finalPhase] > PHASE_ORDER[previousPhase];

    return {
      phase: finalPhase,
      entropy,
      thresholds_used: ENTROPY_PHASE_THRESHOLDS,
      previous_phase: previousPhase,
      phase_worsened: phaseWorsened,
      mccs_convergence_detected: mccsConvergence
    };
  }

  /**
   * Classify phase from entropy value using fixed thresholds
   */
  private classifyFromEntropy(entropy: number): ArchitecturalPhase {
    if (entropy <= ENTROPY_PHASE_THRESHOLDS.STABLE_MAX) {
      return 'STABLE';
    }
    if (entropy <= ENTROPY_PHASE_THRESHOLDS.DECAYING_MAX) {
      return 'DECAYING';
    }
    if (entropy <= ENTROPY_PHASE_THRESHOLDS.COLLAPSING_MAX) {
      return 'COLLAPSING';
    }
    return 'DEAD';
  }

  /**
   * Check if phase is worse than another
   */
  isWorseThan(current: ArchitecturalPhase, previous: ArchitecturalPhase): boolean {
    return PHASE_ORDER[current] > PHASE_ORDER[previous];
  }

  /**
   * Check if phase is better than another
   */
  isBetterThan(current: ArchitecturalPhase, previous: ArchitecturalPhase): boolean {
    return PHASE_ORDER[current] < PHASE_ORDER[previous];
  }

  /**
   * Check if system is in terminal state
   */
  isTerminal(phase: ArchitecturalPhase): boolean {
    return phase === 'DEAD';
  }

  /**
   * Check if system requires MCCS intervention
   */
  requiresMCCS(phase: ArchitecturalPhase): boolean {
    return phase === 'DECAYING' || phase === 'COLLAPSING';
  }

  /**
   * Check if system is in read-only mode
   */
  isReadOnly(phase: ArchitecturalPhase): boolean {
    return phase === 'COLLAPSING';
  }

  /**
   * Check if system is healthy
   */
  isHealthy(phase: ArchitecturalPhase): boolean {
    return phase === 'STABLE';
  }

  /**
   * Get phase history from records
   */
  getPhaseHistory(records: EntropyHistoryRecord[]): ArchitecturalPhase[] {
    return records.map(r => r.phase);
  }

  /**
   * Get last known phase from history
   */
  getLastPhase(records: EntropyHistoryRecord[]): ArchitecturalPhase | null {
    if (records.length === 0) {
      return null;
    }
    return records[records.length - 1].phase;
  }

  /**
   * Get thresholds (for documentation/reporting)
   */
  getThresholds(): typeof ENTROPY_PHASE_THRESHOLDS {
    return ENTROPY_PHASE_THRESHOLDS;
  }

  /**
   * Get phase order (for documentation/reporting)
   */
  getPhaseOrder(): typeof PHASE_ORDER {
    return PHASE_ORDER;
  }
}

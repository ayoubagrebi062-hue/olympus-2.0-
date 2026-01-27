/**
 * Obligation Window Tracker
 *
 * Tracks temporal windows for each obligation.
 * Deadline miss → OMISSION_VIOLATION
 *
 * KEY PRINCIPLE:
 * - "Time does not forgive. Neither does OLYMPUS."
 * - Each obligation has a finite window for fulfillment
 * - Once the window closes, omission is permanent
 *
 * TRACKING:
 * - Start step (when obligation was detected)
 * - End step (deadline)
 * - Current step
 * - Window status (open/closed/violated)
 *
 * NON-NEGOTIABLE:
 * - Deterministic window computation
 * - No deadline extensions without explicit action
 * - Violations are permanent records
 */

import type {
  RequiredDecision,
  ObligationWindow,
  WindowTrackingResult,
  ObligationPriority,
  ObligationStatus
} from './types';

// ODL version - immutable
const ODL_VERSION = '1.0.0';
Object.freeze({ ODL_VERSION });

/**
 * Tracked obligation with window info
 */
interface TrackedObligation {
  obligation: RequiredDecision;
  start_step: number;
  status: ObligationStatus;
  fulfilled_at_step: number | null;
}

/**
 * Tracker configuration
 */
export interface ObligationWindowTrackerConfig {
  // Steps before deadline to trigger warning
  warning_threshold_steps?: number;
}

export class ObligationWindowTracker {
  private config: Required<ObligationWindowTrackerConfig>;
  private trackedObligations: Map<string, TrackedObligation> = new Map();

  constructor(config?: Partial<ObligationWindowTrackerConfig>) {
    this.config = {
      warning_threshold_steps: config?.warning_threshold_steps ?? 5
    };
  }

  /**
   * Start tracking a new obligation
   */
  track(obligation: RequiredDecision, currentStep: number): void {
    if (this.trackedObligations.has(obligation.obligation_id)) {
      // Already tracking
      return;
    }

    this.trackedObligations.set(obligation.obligation_id, {
      obligation,
      start_step: currentStep,
      status: 'DETECTED',
      fulfilled_at_step: null
    });
  }

  /**
   * Track multiple obligations
   */
  trackAll(obligations: RequiredDecision[], currentStep: number): void {
    for (const obl of obligations) {
      this.track(obl, currentStep);
    }
  }

  /**
   * Mark an obligation as fulfilled
   */
  fulfill(obligationId: string, currentStep: number): boolean {
    const tracked = this.trackedObligations.get(obligationId);
    if (!tracked) {
      return false;
    }

    // Cannot fulfill if already violated
    if (tracked.status === 'VIOLATED') {
      return false;
    }

    // Cannot fulfill if deadline has passed
    if (currentStep > tracked.obligation.deadline_step) {
      tracked.status = 'VIOLATED';
      return false;
    }

    tracked.status = 'FULFILLED';
    tracked.fulfilled_at_step = currentStep;
    return true;
  }

  /**
   * Check window status for all tracked obligations
   */
  checkWindows(currentStep: number): WindowTrackingResult {
    const windows: ObligationWindow[] = [];
    const criticalViolations: string[] = [];
    let openCount = 0;
    let violatedCount = 0;

    for (const [id, tracked] of this.trackedObligations) {
      const window = this.computeWindow(tracked, currentStep);
      windows.push(window);

      // Update status based on window
      if (window.deadline_missed && tracked.status !== 'FULFILLED') {
        tracked.status = 'VIOLATED';
        violatedCount++;

        // Track critical violations
        if (tracked.obligation.priority === 'CRITICAL') {
          criticalViolations.push(id);
        }
      } else if (window.window_open && tracked.status === 'DETECTED') {
        tracked.status = 'PENDING';
        openCount++;
      } else if (tracked.status === 'PENDING') {
        openCount++;
      }
    }

    return {
      windows,
      open_count: openCount,
      violated_count: violatedCount,
      critical_violations: criticalViolations,
      tracked_at: new Date().toISOString()
    };
  }

  /**
   * Compute window state for a tracked obligation
   */
  private computeWindow(
    tracked: TrackedObligation,
    currentStep: number
  ): ObligationWindow {
    const startStep = tracked.start_step;
    const endStep = tracked.obligation.deadline_step;
    const stepsRemaining = Math.max(0, endStep - currentStep);
    const windowOpen = currentStep <= endStep && tracked.status !== 'FULFILLED';
    const deadlineMissed = currentStep > endStep && tracked.status !== 'FULFILLED';

    // Calculate elapsed percentage
    const totalWindow = endStep - startStep;
    const elapsed = currentStep - startStep;
    const elapsedPercentage = totalWindow > 0
      ? Math.min(100, Math.max(0, (elapsed / totalWindow) * 100))
      : 100;

    return {
      obligation_id: tracked.obligation.obligation_id,
      start_step: startStep,
      end_step: endStep,
      current_step: currentStep,
      steps_remaining: stepsRemaining,
      window_open: windowOpen,
      deadline_missed: deadlineMissed,
      elapsed_percentage: elapsedPercentage
    };
  }

  /**
   * Get obligations approaching deadline (within warning threshold)
   */
  getApproachingDeadlines(currentStep: number): Array<{
    obligation: RequiredDecision;
    steps_remaining: number;
  }> {
    const approaching: Array<{
      obligation: RequiredDecision;
      steps_remaining: number;
    }> = [];

    for (const tracked of this.trackedObligations.values()) {
      if (tracked.status === 'FULFILLED' || tracked.status === 'VIOLATED') {
        continue;
      }

      const stepsRemaining = tracked.obligation.deadline_step - currentStep;
      if (stepsRemaining > 0 && stepsRemaining <= this.config.warning_threshold_steps) {
        approaching.push({
          obligation: tracked.obligation,
          steps_remaining: stepsRemaining
        });
      }
    }

    // Sort by urgency (least steps remaining first)
    return approaching.sort((a, b) => a.steps_remaining - b.steps_remaining);
  }

  /**
   * Get all violated obligations
   */
  getViolatedObligations(): RequiredDecision[] {
    const violated: RequiredDecision[] = [];

    for (const tracked of this.trackedObligations.values()) {
      if (tracked.status === 'VIOLATED') {
        violated.push(tracked.obligation);
      }
    }

    return violated;
  }

  /**
   * Get obligations by status
   */
  getByStatus(status: ObligationStatus): RequiredDecision[] {
    const result: RequiredDecision[] = [];

    for (const tracked of this.trackedObligations.values()) {
      if (tracked.status === status) {
        result.push(tracked.obligation);
      }
    }

    return result;
  }

  /**
   * Get obligations by priority
   */
  getByPriority(priority: ObligationPriority): RequiredDecision[] {
    const result: RequiredDecision[] = [];

    for (const tracked of this.trackedObligations.values()) {
      if (tracked.obligation.priority === priority) {
        result.push(tracked.obligation);
      }
    }

    return result;
  }

  /**
   * Get tracked obligation by ID
   */
  getObligation(obligationId: string): RequiredDecision | null {
    const tracked = this.trackedObligations.get(obligationId);
    return tracked?.obligation || null;
  }

  /**
   * Get obligation status
   */
  getStatus(obligationId: string): ObligationStatus | null {
    const tracked = this.trackedObligations.get(obligationId);
    return tracked?.status || null;
  }

  /**
   * Check if an obligation is tracked
   */
  isTracked(obligationId: string): boolean {
    return this.trackedObligations.has(obligationId);
  }

  /**
   * Remove a fulfilled or superseded obligation
   */
  remove(obligationId: string): boolean {
    const tracked = this.trackedObligations.get(obligationId);
    if (!tracked) {
      return false;
    }

    // Cannot remove pending or violated obligations
    if (tracked.status === 'PENDING' || tracked.status === 'VIOLATED') {
      return false;
    }

    this.trackedObligations.delete(obligationId);
    return true;
  }

  /**
   * Get all tracked obligations
   */
  getAllTracked(): RequiredDecision[] {
    return Array.from(this.trackedObligations.values())
      .map(t => t.obligation);
  }

  /**
   * Get tracker statistics
   */
  getStats(): {
    total_tracked: number;
    by_status: Record<ObligationStatus, number>;
    by_priority: Record<ObligationPriority, number>;
    warning_threshold_steps: number;
  } {
    const byStatus: Record<ObligationStatus, number> = {
      'DETECTED': 0,
      'PENDING': 0,
      'FULFILLED': 0,
      'VIOLATED': 0,
      'SUPERSEDED': 0
    };

    const byPriority: Record<ObligationPriority, number> = {
      'CRITICAL': 0,
      'HIGH': 0,
      'MEDIUM': 0,
      'LOW': 0
    };

    for (const tracked of this.trackedObligations.values()) {
      byStatus[tracked.status]++;
      byPriority[tracked.obligation.priority]++;
    }

    return {
      total_tracked: this.trackedObligations.size,
      by_status: byStatus,
      by_priority: byPriority,
      warning_threshold_steps: this.config.warning_threshold_steps
    };
  }

  /**
   * Clear all tracked obligations (FOR TESTING ONLY)
   */
  _dangerousClear(): void {
    console.warn('[ObligationWindowTracker] WARNING: Clearing all tracked obligations - TESTING ONLY');
    this.trackedObligations.clear();
  }
}

/**
 * Create a new ObligationWindowTracker
 */
export function createObligationWindowTracker(
  config?: Partial<ObligationWindowTrackerConfig>
): ObligationWindowTracker {
  return new ObligationWindowTracker(config);
}

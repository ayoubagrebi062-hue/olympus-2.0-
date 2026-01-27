/**
 * Entropy Calculator
 *
 * Computes ArchitecturalEntropy per run using ONLY existing Olympus artifacts:
 * - RSR history (delta over N runs)
 * - Shape mortality velocity
 * - Singularity density
 * - Average MCCS intervention size
 *
 * FORMULA (deterministic, documented inline):
 *   entropy = (0.35 * rsr_trend) + (0.25 * mortality_velocity) +
 *             (0.20 * singularity_density) + (0.20 * mccs_size)
 *
 * Where each component is normalized to [0.0, 1.0]
 *
 * NON-NEGOTIABLE:
 * - No heuristics
 * - No ML
 * - No probability
 * - Deterministic only
 * - Uses ONLY existing Olympus artifacts
 */

import type {
  ArchitecturalEntropyScore,
  EntropyComponents,
  EntropyHistoryRecord
} from './types';

// AEC version - immutable
const AEC_VERSION = '1.0.0';
Object.freeze({ AEC_VERSION });

// FIXED WEIGHTS - Compile-time constants, NEVER change at runtime
const ENTROPY_WEIGHTS = Object.freeze({
  RSR_TREND: 0.35,           // RSR trend is primary indicator
  MORTALITY_VELOCITY: 0.25,   // Mortality velocity
  SINGULARITY_DENSITY: 0.20,  // Singularity density
  MCCS_SIZE: 0.20             // MCCS intervention size
});

// FIXED PARAMETERS - Compile-time constants
const ENTROPY_PARAMS = Object.freeze({
  TREND_WINDOW: 5,           // Number of runs to analyze for trends
  RSR_DECLINE_THRESHOLD: 0.1, // RSR decline per run that indicates severe decay
  MORTALITY_RATE_MAX: 1.0,    // Deaths per run that indicates maximum entropy
  SINGULARITY_RATE_MAX: 0.5,  // Singularities per run that indicates maximum entropy
  MCCS_SIZE_MAX: 4            // Average MCCS interventions that indicates maximum entropy
});

Object.freeze(ENTROPY_PARAMS);

export interface EntropyInputs {
  // Current run context
  currentRSR: number;
  activeShapes: number;
  deadShapes: number;
  activeSingularities: number;
  mccsComputed: number;
  averageMCCSSize: number;

  // Historical data from previous runs
  historicalRecords: EntropyHistoryRecord[];
}

export class EntropyCalculator {
  /**
   * Compute architectural entropy score
   *
   * FORMULA:
   *   entropy = (0.35 * rsr_trend_score) +
   *             (0.25 * mortality_velocity_score) +
   *             (0.20 * singularity_density_score) +
   *             (0.20 * mccs_size_score)
   *
   * Each component is normalized to [0.0, 1.0]
   * Final entropy is clamped to [0.0, 1.0]
   */
  compute(inputs: EntropyInputs): ArchitecturalEntropyScore {
    // Compute each component
    const rsrTrend = this.computeRSRTrendComponent(inputs);
    const mortalityVelocity = this.computeMortalityVelocityComponent(inputs);
    const singularityDensity = this.computeSingularityDensityComponent(inputs);
    const mccsSize = this.computeMCCSSizeComponent(inputs);

    // Build components object
    const components: EntropyComponents = {
      rsr_trend_score: rsrTrend.score,
      rsr_delta_per_run: rsrTrend.deltaPerRun,
      rsr_trend_window: rsrTrend.window,

      mortality_velocity_score: mortalityVelocity.score,
      deaths_per_run: mortalityVelocity.deathsPerRun,
      mortality_window: mortalityVelocity.window,

      singularity_density_score: singularityDensity.score,
      singularities_per_run: singularityDensity.singularitiesPerRun,
      singularity_window: singularityDensity.window,

      mccs_size_score: mccsSize.score,
      average_mccs_size: mccsSize.averageSize,
      mccs_window: mccsSize.window
    };

    // Apply weights and compute final entropy
    // FORMULA: entropy = Σ(weight_i * component_i)
    const entropy = this.clamp(
      (ENTROPY_WEIGHTS.RSR_TREND * components.rsr_trend_score) +
      (ENTROPY_WEIGHTS.MORTALITY_VELOCITY * components.mortality_velocity_score) +
      (ENTROPY_WEIGHTS.SINGULARITY_DENSITY * components.singularity_density_score) +
      (ENTROPY_WEIGHTS.MCCS_SIZE * components.mccs_size_score),
      0.0,
      1.0
    );

    return {
      entropy,
      components,
      weights: {
        rsr_trend: 0.35,
        mortality_velocity: 0.25,
        singularity_density: 0.20,
        mccs_size: 0.20
      },
      proof: {
        formula: 'entropy = (0.35 * rsr_trend) + (0.25 * mortality_velocity) + (0.20 * singularity_density) + (0.20 * mccs_size)',
        deterministic: true,
        no_heuristics: true,
        no_ml: true,
        no_probability: true
      }
    };
  }

  /**
   * Compute RSR Trend Component
   *
   * Measures how RSR is changing over time.
   * Score of 0.0 = RSR improving or stable
   * Score of 1.0 = RSR declining rapidly
   *
   * FORMULA:
   *   delta_per_run = (oldest_rsr - newest_rsr) / window_size
   *   score = clamp(delta_per_run / RSR_DECLINE_THRESHOLD, 0, 1)
   */
  private computeRSRTrendComponent(inputs: EntropyInputs): {
    score: number;
    deltaPerRun: number;
    window: number;
  } {
    const records = inputs.historicalRecords;
    const window = Math.min(records.length, ENTROPY_PARAMS.TREND_WINDOW);

    if (window === 0) {
      // No history - use current RSR inverted as baseline
      // Low RSR = high entropy contribution
      const score = this.clamp(1.0 - inputs.currentRSR, 0, 1);
      return { score, deltaPerRun: 0, window: 0 };
    }

    // Get RSR values from recent history
    const recentRecords = records.slice(-window);
    const rsrValues = recentRecords.map(r => r.context.global_rsr);

    // Add current RSR
    rsrValues.push(inputs.currentRSR);

    // Calculate delta: positive = declining, negative = improving
    const oldestRSR = rsrValues[0];
    const newestRSR = rsrValues[rsrValues.length - 1];
    const totalDelta = oldestRSR - newestRSR; // positive if RSR is declining
    const deltaPerRun = totalDelta / rsrValues.length;

    // Normalize: deltaPerRun / threshold
    // If delta_per_run >= threshold, score = 1.0
    const score = this.clamp(
      deltaPerRun / ENTROPY_PARAMS.RSR_DECLINE_THRESHOLD,
      0,
      1
    );

    return { score, deltaPerRun, window };
  }

  /**
   * Compute Mortality Velocity Component
   *
   * Measures how fast shapes are dying.
   * Score of 0.0 = No deaths
   * Score of 1.0 = Rapid death rate
   *
   * FORMULA:
   *   deaths_per_run = total_dead_shapes / window_size
   *   score = clamp(deaths_per_run / MORTALITY_RATE_MAX, 0, 1)
   */
  private computeMortalityVelocityComponent(inputs: EntropyInputs): {
    score: number;
    deathsPerRun: number;
    window: number;
  } {
    const records = inputs.historicalRecords;
    const window = Math.min(records.length + 1, ENTROPY_PARAMS.TREND_WINDOW);

    // Count total dead shapes from history plus current
    let totalDeaths = inputs.deadShapes;
    const recentRecords = records.slice(-ENTROPY_PARAMS.TREND_WINDOW);
    for (const record of recentRecords) {
      totalDeaths += record.context.shapes_dead;
    }

    const deathsPerRun = totalDeaths / window;

    // Normalize
    const score = this.clamp(
      deathsPerRun / ENTROPY_PARAMS.MORTALITY_RATE_MAX,
      0,
      1
    );

    return { score, deathsPerRun, window };
  }

  /**
   * Compute Singularity Density Component
   *
   * Measures how many singularities are being created.
   * High singularity count = architecture is constantly being locked
   * Score of 0.0 = No singularities
   * Score of 1.0 = High singularity rate
   *
   * FORMULA:
   *   singularities_per_run = total_singularities / window_size
   *   score = clamp(singularities_per_run / SINGULARITY_RATE_MAX, 0, 1)
   */
  private computeSingularityDensityComponent(inputs: EntropyInputs): {
    score: number;
    singularitiesPerRun: number;
    window: number;
  } {
    const records = inputs.historicalRecords;
    const window = Math.min(records.length + 1, ENTROPY_PARAMS.TREND_WINDOW);

    // Count singularities from history plus current
    let totalSingularities = inputs.activeSingularities;

    // Singularities are cumulative, so we count the increase
    if (records.length > 0) {
      const oldestRecord = records[Math.max(0, records.length - ENTROPY_PARAMS.TREND_WINDOW)];
      const singularityIncrease = inputs.activeSingularities - oldestRecord.context.active_singularities;
      totalSingularities = Math.max(0, singularityIncrease);
    }

    const singularitiesPerRun = totalSingularities / window;

    // Normalize
    const score = this.clamp(
      singularitiesPerRun / ENTROPY_PARAMS.SINGULARITY_RATE_MAX,
      0,
      1
    );

    return { score, singularitiesPerRun, window };
  }

  /**
   * Compute MCCS Size Component
   *
   * Measures how large MCCS interventions are becoming.
   * Large interventions = architecture needs major surgery
   * Score of 0.0 = Small interventions (1-2)
   * Score of 1.0 = Large interventions (4+)
   *
   * FORMULA:
   *   score = clamp(average_mccs_size / MCCS_SIZE_MAX, 0, 1)
   */
  private computeMCCSSizeComponent(inputs: EntropyInputs): {
    score: number;
    averageSize: number;
    window: number;
  } {
    const records = inputs.historicalRecords;
    const window = Math.min(records.length + 1, ENTROPY_PARAMS.TREND_WINDOW);

    // Use current average MCCS size
    // If no MCCS computed, use 0 (no entropy contribution)
    const averageSize = inputs.mccsComputed > 0 ? inputs.averageMCCSSize : 0;

    // Normalize
    const score = this.clamp(
      averageSize / ENTROPY_PARAMS.MCCS_SIZE_MAX,
      0,
      1
    );

    return { score, averageSize, window };
  }

  /**
   * Clamp value to range [min, max]
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get entropy weights (for documentation/reporting)
   */
  getWeights(): typeof ENTROPY_WEIGHTS {
    return ENTROPY_WEIGHTS;
  }

  /**
   * Get entropy parameters (for documentation/reporting)
   */
  getParams(): typeof ENTROPY_PARAMS {
    return ENTROPY_PARAMS;
  }
}

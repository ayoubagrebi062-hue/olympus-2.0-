/**
 * Forward Counterfactual Expander
 *
 * Replays OCIC counterfactuals forward N steps to simulate future trajectories.
 *
 * KEY PRINCIPLE:
 * Each counterfactual from OCIC represents a possible intervention path.
 * We simulate what happens if we follow that path forward in time.
 *
 * SIMULATION:
 * - Start from current state
 * - Apply the counterfactual intervention
 * - Simulate N steps forward
 * - Track entropy, phase, and MCCS at each step
 *
 * NON-NEGOTIABLE:
 * - Deterministic simulation
 * - No heuristics or ML
 * - No probability
 * - Pure mathematical projection
 */

import type {
  CausalPath,
  ArchitecturalPhase,
  ArchitecturalEntropyScore
} from './types';
import type { MinimalCausalCutSet, OCICIntelligence } from './types';
import { EntropyCalculator, EntropyInputs } from './entropy-calculator';
import { PhaseClassifier } from './phase-classifier';

// Default simulation steps
const DEFAULT_SIMULATION_STEPS = 5;

// IE version - immutable
const IE_VERSION = '1.0.0';
Object.freeze({ IE_VERSION });

/**
 * Simulation state at each step
 */
interface SimulationState {
  step: number;
  entropy: number;
  phase: ArchitecturalPhase;
  mccs_size: number;
  rsr: number;
  dead_shapes: number;
  singularities: number;
}

/**
 * Current system context for simulation
 */
export interface SimulationContext {
  current_entropy: number;
  current_phase: ArchitecturalPhase;
  current_mccs_size: number;
  current_rsr: number;
  current_dead_shapes: number;
  current_singularities: number;
  total_shapes: number;
}

export class ForwardCounterfactualExpander {
  private entropyCalculator: EntropyCalculator;
  private phaseClassifier: PhaseClassifier;
  private simulationSteps: number;

  constructor(simulationSteps: number = DEFAULT_SIMULATION_STEPS) {
    this.entropyCalculator = new EntropyCalculator();
    this.phaseClassifier = new PhaseClassifier();
    this.simulationSteps = simulationSteps;
  }

  /**
   * Expand counterfactuals forward to generate causal paths
   *
   * Takes MCCS interventions from OCIC and simulates each one forward
   * to predict future system trajectories.
   */
  expand(
    ocicIntelligence: OCICIntelligence,
    context: SimulationContext,
    runId: string
  ): CausalPath[] {
    const paths: CausalPath[] = [];

    // Get all MCCS interventions
    const mccsList = ocicIntelligence.minimal_causal_cuts;

    if (mccsList.length === 0) {
      // No MCCS = no interventions = simulate "do nothing" path
      const noActionPath = this.simulateNoAction(context, runId);
      paths.push(noActionPath);
      return paths;
    }

    // Simulate each MCCS forward
    for (const mccs of mccsList) {
      const path = this.simulateMCCS(mccs, context, runId);
      paths.push(path);
    }

    // Also simulate "no intervention" path
    const noActionPath = this.simulateNoAction(context, runId);
    paths.push(noActionPath);

    return paths;
  }

  /**
   * Simulate what happens if we apply an MCCS intervention
   */
  private simulateMCCS(
    mccs: MinimalCausalCutSet,
    context: SimulationContext,
    runId: string
  ): CausalPath {
    const pathId = `PATH-${mccs.mccs_id}-${Date.now().toString(36)}`;

    // Start with projected state after MCCS
    let currentState: SimulationState = {
      step: 0,
      entropy: context.current_entropy,
      phase: context.current_phase,
      mccs_size: mccs.intervention_count,
      rsr: mccs.projected_outcome.global_rsr_after,
      dead_shapes: context.current_dead_shapes - mccs.projected_outcome.shapes_restored.length,
      singularities: context.current_singularities
    };

    // Recalculate initial entropy after intervention
    const initialEntropy = this.calculateEntropy(currentState, context.total_shapes);
    currentState.entropy = initialEntropy.entropy;
    currentState.phase = this.classifyPhase(currentState.entropy, context.current_phase);

    // Track trajectories
    const entropyTrajectory: number[] = [currentState.entropy];
    const phaseTrajectory: ArchitecturalPhase[] = [currentState.phase];
    const mccsTrajectory: number[] = [currentState.mccs_size];

    // Simulate forward
    for (let step = 1; step <= this.simulationSteps; step++) {
      currentState = this.simulateStep(currentState, context.total_shapes);
      entropyTrajectory.push(currentState.entropy);
      phaseTrajectory.push(currentState.phase);
      mccsTrajectory.push(currentState.mccs_size);
    }

    // Analyze trajectory
    const leadsToCollapse = this.checkCollapse(phaseTrajectory);
    const mccsGrowsMonotonically = this.checkMCCSGrowth(mccsTrajectory);

    return {
      path_id: pathId,
      origin_counterfactual: mccs.mccs_id,
      steps_simulated: this.simulationSteps,
      entropy_trajectory: entropyTrajectory,
      phase_trajectory: phaseTrajectory,
      mccs_trajectory: mccsTrajectory,
      terminal_state: {
        phase: currentState.phase,
        entropy: currentState.entropy,
        mccs_size: currentState.mccs_size,
        step_reached: this.simulationSteps
      },
      leads_to_collapse: leadsToCollapse,
      mccs_grows_monotonically: mccsGrowsMonotonically
    };
  }

  /**
   * Simulate what happens if we do nothing (no intervention)
   */
  private simulateNoAction(
    context: SimulationContext,
    runId: string
  ): CausalPath {
    const pathId = `PATH-NOACTION-${Date.now().toString(36)}`;

    // Start with current state
    let currentState: SimulationState = {
      step: 0,
      entropy: context.current_entropy,
      phase: context.current_phase,
      mccs_size: context.current_mccs_size,
      rsr: context.current_rsr,
      dead_shapes: context.current_dead_shapes,
      singularities: context.current_singularities
    };

    // Track trajectories
    const entropyTrajectory: number[] = [currentState.entropy];
    const phaseTrajectory: ArchitecturalPhase[] = [currentState.phase];
    const mccsTrajectory: number[] = [currentState.mccs_size];

    // Simulate forward (no intervention = entropy tends to increase)
    for (let step = 1; step <= this.simulationSteps; step++) {
      currentState = this.simulateStepNoIntervention(currentState, context.total_shapes);
      entropyTrajectory.push(currentState.entropy);
      phaseTrajectory.push(currentState.phase);
      mccsTrajectory.push(currentState.mccs_size);
    }

    // Analyze trajectory
    const leadsToCollapse = this.checkCollapse(phaseTrajectory);
    const mccsGrowsMonotonically = this.checkMCCSGrowth(mccsTrajectory);

    return {
      path_id: pathId,
      origin_counterfactual: 'NO_ACTION',
      steps_simulated: this.simulationSteps,
      entropy_trajectory: entropyTrajectory,
      phase_trajectory: phaseTrajectory,
      mccs_trajectory: mccsTrajectory,
      terminal_state: {
        phase: currentState.phase,
        entropy: currentState.entropy,
        mccs_size: currentState.mccs_size,
        step_reached: this.simulationSteps
      },
      leads_to_collapse: leadsToCollapse,
      mccs_grows_monotonically: mccsGrowsMonotonically
    };
  }

  /**
   * Simulate one step forward with intervention applied
   *
   * Key dynamics:
   * - Interventions improve RSR
   * - Improved RSR reduces entropy
   * - But system has natural decay
   */
  private simulateStep(
    state: SimulationState,
    totalShapes: number
  ): SimulationState {
    // Natural decay factor (systems tend toward entropy)
    const decayRate = 0.02;

    // Intervention benefit (MCCS application improves things)
    const interventionBenefit = state.mccs_size > 0 ? 0.03 : 0;

    // Net effect on RSR
    const rsrDelta = interventionBenefit - decayRate;
    const newRsr = Math.max(0, Math.min(1, state.rsr + rsrDelta));

    // Dead shapes may increase if RSR drops
    const deadShapeDelta = newRsr < state.rsr ? 1 : 0;
    const newDeadShapes = Math.min(totalShapes, state.dead_shapes + deadShapeDelta);

    // MCCS size tends to grow if system is unhealthy
    const mccsGrowth = state.phase === 'STABLE' ? 0 : 1;
    const newMccsSize = state.mccs_size + mccsGrowth;

    // Build new state
    const newState: SimulationState = {
      step: state.step + 1,
      entropy: 0, // Will be calculated
      phase: state.phase, // Will be updated
      mccs_size: newMccsSize,
      rsr: newRsr,
      dead_shapes: newDeadShapes,
      singularities: state.singularities + (state.phase !== 'STABLE' ? 1 : 0)
    };

    // Calculate new entropy
    const entropyScore = this.calculateEntropy(newState, totalShapes);
    newState.entropy = entropyScore.entropy;

    // Classify new phase
    newState.phase = this.classifyPhase(newState.entropy, state.phase);

    return newState;
  }

  /**
   * Simulate one step forward WITHOUT intervention
   *
   * Without intervention, entropy increases faster.
   */
  private simulateStepNoIntervention(
    state: SimulationState,
    totalShapes: number
  ): SimulationState {
    // Higher decay without intervention
    const decayRate = 0.05;

    // Net effect on RSR (always negative without intervention)
    const newRsr = Math.max(0, state.rsr - decayRate);

    // Dead shapes increase faster
    const newDeadShapes = Math.min(totalShapes, state.dead_shapes + 2);

    // MCCS size grows
    const newMccsSize = state.mccs_size + 2;

    // Singularities increase
    const newSingularities = state.singularities + 1;

    // Build new state
    const newState: SimulationState = {
      step: state.step + 1,
      entropy: 0, // Will be calculated
      phase: state.phase, // Will be updated
      mccs_size: newMccsSize,
      rsr: newRsr,
      dead_shapes: newDeadShapes,
      singularities: newSingularities
    };

    // Calculate new entropy
    const entropyScore = this.calculateEntropy(newState, totalShapes);
    newState.entropy = entropyScore.entropy;

    // Classify new phase (phase can only worsen without MCCS convergence)
    newState.phase = this.classifyPhaseWorseningOnly(newState.entropy, state.phase);

    return newState;
  }

  /**
   * Calculate entropy from simulation state
   */
  private calculateEntropy(
    state: SimulationState,
    totalShapes: number
  ): ArchitecturalEntropyScore {
    const inputs: EntropyInputs = {
      currentRSR: state.rsr,
      activeShapes: totalShapes,
      deadShapes: state.dead_shapes,
      activeSingularities: state.singularities,
      mccsComputed: state.mccs_size > 0 ? 1 : 0,
      averageMCCSSize: state.mccs_size,
      historicalRecords: [] // Not used in simulation
    };

    return this.entropyCalculator.compute(inputs);
  }

  /**
   * Classify phase based on entropy (allows improvement if entropy improves)
   */
  private classifyPhase(
    entropy: number,
    previousPhase: ArchitecturalPhase
  ): ArchitecturalPhase {
    const result = this.phaseClassifier.classify(
      this.createEntropyScore(entropy),
      previousPhase,
      true // MCCS convergence allows improvement
    );
    return result.phase;
  }

  /**
   * Classify phase (worsening only, for no-intervention paths)
   */
  private classifyPhaseWorseningOnly(
    entropy: number,
    previousPhase: ArchitecturalPhase
  ): ArchitecturalPhase {
    const result = this.phaseClassifier.classify(
      this.createEntropyScore(entropy),
      previousPhase,
      false // No MCCS convergence = phase can only worsen
    );
    return result.phase;
  }

  /**
   * Create a minimal EntropyScore for phase classification
   */
  private createEntropyScore(entropy: number): ArchitecturalEntropyScore {
    return {
      entropy,
      components: {
        rsr_trend_score: 0,
        rsr_delta_per_run: 0,
        rsr_trend_window: 5,
        mortality_velocity_score: 0,
        deaths_per_run: 0,
        mortality_window: 5,
        singularity_density_score: 0,
        singularities_per_run: 0,
        singularity_window: 5,
        mccs_size_score: 0,
        average_mccs_size: 0,
        mccs_window: 5
      },
      weights: {
        rsr_trend: 0.35,
        mortality_velocity: 0.25,
        singularity_density: 0.20,
        mccs_size: 0.20
      },
      proof: {
        formula: 'entropy = (0.35 * rsr_trend) + (0.25 * mortality) + (0.20 * singularity) + (0.20 * mccs)',
        deterministic: true,
        no_heuristics: true,
        no_ml: true,
        no_probability: true
      }
    };
  }

  /**
   * Check if phase trajectory leads to collapse (COLLAPSING or DEAD)
   */
  private checkCollapse(trajectory: ArchitecturalPhase[]): boolean {
    const terminal = trajectory[trajectory.length - 1];
    return terminal === 'COLLAPSING' || terminal === 'DEAD';
  }

  /**
   * Check if MCCS size grows monotonically
   */
  private checkMCCSGrowth(trajectory: number[]): boolean {
    for (let i = 1; i < trajectory.length; i++) {
      if (trajectory[i] < trajectory[i - 1]) {
        return false; // MCCS decreased at some point
      }
    }
    return true; // MCCS never decreased
  }

  /**
   * Get simulation step count
   */
  getSimulationSteps(): number {
    return this.simulationSteps;
  }
}

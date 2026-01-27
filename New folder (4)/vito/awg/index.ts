/**
 * OLYMPUS CRUCIBLE v1.0 — Adversarial World Generator
 *
 * Main entry point for the AWG module.
 *
 * Usage:
 *   import { executeCrucible, generateReport } from './awg';
 *   const result = executeCrucible(['WAVE_1']);
 *   const report = generateReport(result);
 */

// Types
export * from './types';

// Wave Definitions
export {
  WAVE_1_SCENARIOS,
  WAVE_2_SCENARIOS,
  WAVE_3_SCENARIOS,
  getWaveScenarios,
  getScenarioById,
  getScenariosTargetingInvariant,
  // Individual Wave 2 scenarios
  SCENARIO_W2A_001,
  SCENARIO_W2A_002,
  SCENARIO_W2B_001,
  SCENARIO_W2B_002,
  SCENARIO_W2C_001,
  SCENARIO_W2C_002,
  SCENARIO_W2C_003,
  // Individual Wave 3 scenarios
  SCENARIO_W3A_001,
  SCENARIO_W3A_002,
  SCENARIO_W3B_001,
  SCENARIO_W3B_002,
  SCENARIO_W3C_001,
  SCENARIO_W3C_002,
  SCENARIO_W3D_001,
  SCENARIO_W3D_002
} from './wave-definitions';

// World Generator
export {
  AdversarialWorldGenerator,
  DeterministicRNG,
  validateScenario,
  validateWave
} from './world-generator';

// Crucible Runner
export {
  CRUCIBLE_VERSION,
  executeScenario,
  executeMultiStepScenario,
  executeGovernanceScenario,
  executeWave,
  executeCrucible,
  generateReport,
  runCrucible
} from './crucible-runner';

/**
 * OCPM Runner
 *
 * Demonstrates the Olympus Core Proof Model in action.
 * Runs two canonical scenarios:
 * 1. Block caused by Future Inevitability
 * 2. Block caused by Entropy Exhaustion
 *
 * KEY PRINCIPLE:
 * - "If a decision cannot be explained minimally, it is not yet true."
 * - Each scenario reduces to exactly ONE primary invariant
 */

import { createOCPMEngine, type OCPMExecutionResult } from './ocpm-engine';
import type { ProofAssemblyInput } from './types';

// ============================================================================
// SCENARIO 1: FUTURE INEVITABILITY BLOCK
// ============================================================================
// An action that would lead to inevitable system failure is blocked.
// The forward simulation detects that allowing this action leads to
// unavoidable entropy exhaustion within 5 steps.
// No survivable paths exist. The action MUST be blocked.
// ============================================================================

function createFutureInevitabilityScenario(): ProofAssemblyInput {
  const runId = `ocpm-demo-future-${Date.now()}`;

  return {
    run_id: runId,
    project_id: 'olympus-demo',
    action: {
      action_id: 'action-delete-critical-config',
      action_type: 'delete',
      description: 'Delete critical system configuration file'
    },
    current_state: {
      entropy: 0.4523,
      mutation_count: 23,
      current_step: 47
    },
    contract: {
      contract_id: 'contract-session-001',
      intended_lifespan: 100,
      allowed_mutations: 50,
      max_entropy_drift: 0.05,
      baseline_entropy: 0.4289
    },
    budget: {
      initial: 1000,
      remaining: 847,
      consumed: 153,
      exhausted: false
    },
    engine_outputs: {
      // IE: Inevitability Engine detected future violation
      ie_result: {
        inevitable: true,
        blocked: true,
        reason: 'Forward simulation detected inevitable entropy exhaustion at step 3. No survivable paths exist (0/128). Action would lead to SYSTEM_UNRECOVERABLE.',
        fingerprint: 'sha256:8f14e45fceea167a5a36dedd4bea2543'
      },

      // NE: Necessity Engine found no survivable alternative
      ne_result: {
        necessary: false,
        survivable_steps: 0,
        reason: 'No survivable alternatives exist - action would lock system into unrecoverable state'
      },

      // ICE: Intent Collapse Engine
      ice_result: {
        collapsed: true,
        intent_valid: false,
        reason: 'Intent collapses to DESTRUCTIVE pattern with cascade failure probability 0.88'
      },

      // CIN: Canonical Intent Normalization
      cin_result: {
        canonical: true,
        normalized: true,
        reason: 'Canonical form DELETE_CRITICAL_RESOURCE is blocked by policy'
      },

      // TSL: Temporal Sovereignty Layer - detects future violation
      tsl_result: {
        gate_action: 'BLOCK_PRESENT',
        passed: false,
        block_reason: 'FUTURE_VIOLATION: Forward simulation detected inevitable entropy exhaustion',
        simulation_survives: false,
        first_violation_step: 3,
        survivability: 0,
        violations: [
          { type: 'ENTROPY_EXHAUSTION_INEVITABLE', step: 3, severity: 'CRITICAL' },
          { type: 'CASCADE_FAILURE', step: 5, severity: 'CRITICAL' },
          { type: 'SYSTEM_UNRECOVERABLE', step: 7, severity: 'TERMINAL' }
        ]
      },

      // AEC: Architectural Entropy Control - would allow (not exhausted yet)
      aec_result: {
        entropy_valid: true,
        current_entropy: 0.4523,
        drift: 0.0234,
        phase: 'STABLE',
        reason: 'Entropy within bounds, but action blocked by IE forward simulation'
      },

      // RLL: Reality Lock-In Layer - would block (violates locked decision)
      rll_result: {
        locked: true,
        singularity_id: 'config-creation-001',
        reason: 'Action would violate locked decision config-creation-001'
      }
    }
  };
}

// ============================================================================
// SCENARIO 2: ENTROPY EXHAUSTION BLOCK
// ============================================================================
// An action is blocked because the entropy budget has been exhausted.
// The system has entered PERMANENT_READ_ONLY mode.
// ============================================================================

function createEntropyExhaustionScenario(): ProofAssemblyInput {
  const runId = `ocpm-demo-entropy-${Date.now()}`;

  return {
    run_id: runId,
    project_id: 'olympus-demo',
    action: {
      action_id: 'action-modify-user-data',
      action_type: 'update',
      description: 'Update user profile settings'
    },
    current_state: {
      entropy: 0.8923,
      mutation_count: 50,
      current_step: 100
    },
    contract: {
      contract_id: 'contract-session-expired',
      intended_lifespan: 100,
      allowed_mutations: 50,
      max_entropy_drift: 0.05,
      baseline_entropy: 0.4289
    },
    budget: {
      initial: 1000,
      remaining: 0,     // EXHAUSTED!
      consumed: 1000,
      exhausted: true   // KEY FLAG
    },
    engine_outputs: {
      // IE: Inevitability Engine - cannot simulate (budget exhausted)
      ie_result: {
        inevitable: false,
        blocked: true,
        reason: 'Cannot execute forward simulation - entropy budget exhausted',
        fingerprint: 'sha256:3c59dc048e8850243be8079a5c74d079'
      },

      // NE: Necessity Engine - cannot enumerate (budget exhausted)
      ne_result: {
        necessary: false,
        survivable_steps: 0,
        reason: 'Entropy budget exhausted - no mutations permitted'
      },

      // ICE: Intent Collapse Engine
      ice_result: {
        collapsed: true,
        intent_valid: false,
        reason: 'Any mutation blocked - entropy budget exhausted'
      },

      // CIN: Canonical Intent Normalization
      cin_result: {
        canonical: true,
        normalized: true,
        reason: 'Canonical form blocked - system in permanent read-only'
      },

      // TSL: Temporal Sovereignty Layer - BUDGET EXHAUSTED
      tsl_result: {
        gate_action: 'PERMANENT_READ_ONLY',
        passed: false,
        block_reason: 'BUDGET_EXHAUSTED: 0/1000 remaining, drift 0.4634 exceeds limit 0.05, phase TERMINAL',
        simulation_survives: false,
        first_violation_step: 0,
        survivability: 0,
        violations: [
          { type: 'BUDGET_EXHAUSTED', step: 0, severity: 'TERMINAL' },
          { type: 'DRIFT_EXCEEDED', step: 0, severity: 'CRITICAL' },
          { type: 'LIFESPAN_REACHED', step: 100, severity: 'CRITICAL' }
        ]
      },

      // AEC: Architectural Entropy Control - EXHAUSTED
      aec_result: {
        entropy_valid: false,
        current_entropy: 0.8923,
        drift: 0.4634,
        phase: 'TERMINAL',
        reason: 'ENTROPY EXHAUSTED: Budget 0/1000, drift 0.4634 (limit 0.05), phase TERMINAL'
      },

      // RLL: Reality Lock-In Layer
      rll_result: {
        locked: true,
        singularity_id: 'system-freeze-001',
        reason: 'System locked in read-only state - entropy exhaustion lock active'
      }
    }
  };
}

// ============================================================================
// RUNNER
// ============================================================================

function logSeparator(title: string): void {
  console.log('\n');
  console.log('=' .repeat(80));
  console.log(title.padStart(40 + title.length / 2).padEnd(80));
  console.log('='.repeat(80));
  console.log('\n');
}

function logProofSummary(result: OCPMExecutionResult): void {
  const proof = result.proof;

  console.log('+' + '-'.repeat(78) + '+');
  console.log('| PROOF SUMMARY' + ' '.repeat(64) + '|');
  console.log('+' + '-'.repeat(78) + '+');
  console.log(`| Run ID:              ${proof.run_id.substring(0, 53).padEnd(55)} |`);
  console.log(`| Decision:            ${proof.final_decision.padEnd(55)} |`);
  console.log(`| Primary Invariant:   ${proof.primary_invariant_violated.padEnd(55)} |`);
  console.log('+' + '-'.repeat(78) + '+');
  console.log(`| Causal Chain Links:  ${String(proof.causal_chain.length).padEnd(55)} |`);
  console.log(`| Forbidden Alts:      ${String(proof.forbidden_alternatives.length).padEnd(55)} |`);
  console.log(`| Reduced:             ${(result.reduced ? 'YES' : 'NO').padEnd(55)} |`);
  console.log(`| Verified:            ${(result.verified ? 'YES' : 'NO').padEnd(55)} |`);
  console.log('+' + '-'.repeat(78) + '+');

  if (proof.primary_violation_description) {
    const desc = proof.primary_violation_description.substring(0, 53);
    console.log(`| Violation:           ${desc.padEnd(55)} |`);
    console.log('+' + '-'.repeat(78) + '+');
  }

  console.log(`| Proof Hash:          ${proof.proof_hash.substring(0, 53).padEnd(55)} |`);
  console.log(`| Execution Time:      ${(result.execution_time_ms + 'ms').padEnd(55)} |`);
  console.log('+' + '-'.repeat(78) + '+');

  // Causal chain detail
  if (proof.causal_chain.length > 0) {
    console.log('\n  CAUSAL CHAIN:');
    for (const link of proof.causal_chain) {
      console.log(`    ${link.step}. [${link.source_layer}] ${link.event.substring(0, 50)}`);
      console.log(`       -> ${link.effect.substring(0, 50)}`);
    }
  }

  // Entropy state
  console.log('\n  ENTROPY STATE:');
  console.log(`    Current:    ${proof.entropy_state.current_entropy.toFixed(4)}`);
  console.log(`    Baseline:   ${proof.entropy_state.baseline_entropy.toFixed(4)}`);
  console.log(`    Drift:      ${proof.entropy_state.drift.toFixed(4)} / ${proof.entropy_state.drift_limit}`);
  console.log(`    Budget:     ${proof.entropy_state.budget_remaining} / ${proof.entropy_state.budget_initial}`);
  console.log(`    Exhausted:  ${proof.entropy_state.is_exhausted ? 'YES' : 'NO'}`);

  // Necessary future (if present)
  if (proof.necessary_future) {
    console.log('\n  NECESSARY FUTURE:');
    console.log(`    Exists:           ${proof.necessary_future.exists ? 'YES' : 'NO'}`);
    console.log(`    Survivable Steps: ${proof.necessary_future.survivable_steps}`);
    if (proof.necessary_future.first_violation_step !== null) {
      console.log(`    First Violation:  Step ${proof.necessary_future.first_violation_step}`);
    }
    console.log(`    Survivability:    ${(proof.necessary_future.projected_survivability * 100).toFixed(1)}%`);
  }
}

async function runOCPMDemonstration(): Promise<void> {
  console.log('\n');
  console.log('################################################################################');
  console.log('#                                                                              #');
  console.log('#                 OLYMPUS CORE PROOF MODEL (OCPM) v1.0.0                       #');
  console.log('#                                                                              #');
  console.log('#       "If a decision cannot be explained minimally, it is not yet true."    #');
  console.log('#                                                                              #');
  console.log('################################################################################');

  // Create OCPM Engine
  const engine = createOCPMEngine({
    output_dir: './data/decision-proofs',
    reduce_proofs: true,
    verify_after_assembly: true,
    write_json: true,
    write_markdown: true
  });

  console.log('\n[OCPM] Engine initialized');
  console.log('[OCPM] Configuration:', JSON.stringify(engine.getStats().config, null, 2));

  // -------------------------------------------------------------------------
  // SCENARIO 1: Future Inevitability Block
  // -------------------------------------------------------------------------

  logSeparator('SCENARIO 1: FUTURE INEVITABILITY BLOCK');

  console.log('CONTEXT:');
  console.log('  A user attempts to delete a critical configuration file.');
  console.log('  The Inevitability Engine (IE) runs forward simulation and detects');
  console.log('  that this action leads to INEVITABLE entropy exhaustion at step 3.');
  console.log('  No survivable paths exist. The action MUST be blocked.');
  console.log('');
  console.log('EXPECTED:');
  console.log('  - Decision: BLOCK');
  console.log('  - Primary Invariant: FUTURE_INEVITABILITY_VIOLATION');
  console.log('  - ONE invariant only (others are secondary effects)');

  const futureInput = createFutureInevitabilityScenario();
  const futureResult = engine.execute(futureInput);

  logProofSummary(futureResult);

  // Verify the invariant is correct
  if (futureResult.proof.primary_invariant_violated !== 'FUTURE_INEVITABILITY_VIOLATION') {
    console.log('\n[!] WARNING: Expected FUTURE_INEVITABILITY_VIOLATION, got', futureResult.proof.primary_invariant_violated);
  } else {
    console.log('\n[OK] CORRECT: Primary invariant is FUTURE_INEVITABILITY_VIOLATION');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: Entropy Exhaustion Block
  // -------------------------------------------------------------------------

  logSeparator('SCENARIO 2: ENTROPY EXHAUSTION BLOCK');

  console.log('CONTEXT:');
  console.log('  A user attempts to update their profile settings.');
  console.log('  However, the system has exhausted its entropy budget:');
  console.log('    - Budget: 0/1000 remaining');
  console.log('    - Drift: 0.4634 (limit 0.05)');
  console.log('    - Phase: TERMINAL');
  console.log('  The system has entered PERMANENT_READ_ONLY mode.');
  console.log('');
  console.log('EXPECTED:');
  console.log('  - Decision: PERMANENT_READ_ONLY');
  console.log('  - Primary Invariant: ENTROPY_BUDGET_EXHAUSTED');
  console.log('  - ONE invariant only (drift exceeded is secondary)');

  const entropyInput = createEntropyExhaustionScenario();
  const entropyResult = engine.execute(entropyInput);

  logProofSummary(entropyResult);

  // Verify the invariant is correct
  if (entropyResult.proof.primary_invariant_violated !== 'ENTROPY_BUDGET_EXHAUSTED') {
    console.log('\n[!] WARNING: Expected ENTROPY_BUDGET_EXHAUSTED, got', entropyResult.proof.primary_invariant_violated);
  } else {
    console.log('\n[OK] CORRECT: Primary invariant is ENTROPY_BUDGET_EXHAUSTED');
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------

  logSeparator('OCPM DEMONSTRATION COMPLETE');

  console.log('RESULTS:');
  console.log('');
  console.log('  Scenario 1 (Future Inevitability):');
  console.log(`    Decision:            ${futureResult.proof.final_decision}`);
  console.log(`    Primary Invariant:   ${futureResult.proof.primary_invariant_violated}`);
  console.log(`    Verified:            ${futureResult.verified ? 'YES' : 'NO'}`);
  console.log(`    Proof Hash:          ${futureResult.proof.proof_hash.substring(0, 16)}...`);
  console.log('');
  console.log('  Scenario 2 (Entropy Exhaustion):');
  console.log(`    Decision:            ${entropyResult.proof.final_decision}`);
  console.log(`    Primary Invariant:   ${entropyResult.proof.primary_invariant_violated}`);
  console.log(`    Verified:            ${entropyResult.verified ? 'YES' : 'NO'}`);
  console.log(`    Proof Hash:          ${entropyResult.proof.proof_hash.substring(0, 16)}...`);
  console.log('');
  console.log('KEY PRINCIPLE DEMONSTRATED:');
  console.log('  - Each decision has exactly ONE primary invariant');
  console.log('  - Proofs are reduced to minimal sufficient form');
  console.log('  - All proofs are verified and hash-locked');
  console.log('  - "If a decision cannot be explained minimally, it is not yet true."');
  console.log('');
  console.log('################################################################################');
}

// Run if executed directly
runOCPMDemonstration().catch(console.error);

export { runOCPMDemonstration };

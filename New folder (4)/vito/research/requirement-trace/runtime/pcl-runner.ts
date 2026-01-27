/**
 * PCL Runner
 *
 * Demonstrates the Proof Continuity Layer in action.
 * Runs scenarios showing:
 * 1. A proof blocked due to past forbidden precedent
 * 2. A proof allowed ONLY after explicit refutation
 *
 * KEY PRINCIPLE:
 * - "A truth that cannot persist is not yet true."
 * - OLYMPUS cannot contradict itself without explicit proof-level refutation
 */

import { createOCPMEngine } from './ocpm-engine';
import { createPCLEngine, type PCLInput } from './pcl-engine';
import type {
  ProofAssemblyInput,
  RefutationRecord,
  PCLExecutionResult
} from './types';

// ============================================================================
// SCENARIO SETUP: Create initial proofs in the ledger
// ============================================================================

function createInitialBlockingProof(): ProofAssemblyInput {
  const runId = `pcl-initial-block-${Date.now()}`;

  return {
    run_id: runId,
    project_id: 'olympus-demo',
    action: {
      action_id: 'action-delete-config',
      action_type: 'delete',
      description: 'Delete critical system configuration'
    },
    current_state: {
      entropy: 0.4523,
      mutation_count: 10,
      current_step: 25
    },
    contract: {
      contract_id: 'contract-demo-001',
      intended_lifespan: 100,
      allowed_mutations: 50,
      max_entropy_drift: 0.05,
      baseline_entropy: 0.4289
    },
    budget: {
      initial: 1000,
      remaining: 900,
      consumed: 100,
      exhausted: false
    },
    engine_outputs: {
      ie_result: {
        inevitable: true,
        blocked: true,
        reason: 'Action would cause inevitable system failure',
        fingerprint: 'sha256:configdelete001'
      },
      ne_result: {
        necessary: false,
        survivable_steps: 0,
        reason: 'No survivable paths'
      },
      ice_result: {
        collapsed: true,
        intent_valid: false,
        reason: 'Destructive intent detected'
      },
      cin_result: {
        canonical: true,
        normalized: true,
        reason: 'Canonical form: DELETE_CRITICAL_RESOURCE'
      },
      tsl_result: {
        gate_action: 'BLOCK_PRESENT',
        passed: false,
        block_reason: 'FUTURE_VIOLATION: Would cause inevitable failure',
        simulation_survives: false,
        first_violation_step: 3,
        survivability: 0,
        violations: [
          { type: 'FUTURE_INEVITABILITY_VIOLATION', step: 3, severity: 'CRITICAL' }
        ]
      },
      aec_result: {
        entropy_valid: true,
        current_entropy: 0.4523,
        drift: 0.0234,
        phase: 'STABLE'
      },
      rll_result: {
        locked: false
      }
    }
  };
}

// ============================================================================
// SCENARIO 1: Proof BLOCKED due to past forbidden precedent
// ============================================================================
// A new proof attempts an action that was previously forbidden.
// Without explicit refutation, it must be REJECTED.
// ============================================================================

function createConflictingProof(): ProofAssemblyInput {
  const runId = `pcl-conflict-${Date.now()}`;

  return {
    run_id: runId,
    project_id: 'olympus-demo',
    action: {
      action_id: 'action-delete-config-retry',
      action_type: 'delete',
      description: 'Delete critical system configuration'  // Same action as before!
    },
    current_state: {
      entropy: 0.4600,
      mutation_count: 15,
      current_step: 30
    },
    contract: {
      contract_id: 'contract-demo-001',
      intended_lifespan: 100,
      allowed_mutations: 50,
      max_entropy_drift: 0.05,
      baseline_entropy: 0.4289
    },
    budget: {
      initial: 1000,
      remaining: 850,
      consumed: 150,
      exhausted: false
    },
    engine_outputs: {
      // This time, OCPM might allow it (conditions changed)
      ie_result: {
        inevitable: false,
        blocked: false,
        reason: 'Forward simulation shows path exists',
        fingerprint: 'sha256:configdelete002'
      },
      ne_result: {
        necessary: true,
        survivable_steps: 5,
        reason: 'Alternative paths found'
      },
      ice_result: {
        collapsed: true,
        intent_valid: true,
        reason: 'Intent validated'
      },
      cin_result: {
        canonical: true,
        normalized: true,
        reason: 'Canonical form valid'
      },
      tsl_result: {
        gate_action: 'ALLOW_PRESENT',
        passed: true,
        simulation_survives: true,
        survivability: 0.8,
        violations: []
      },
      aec_result: {
        entropy_valid: true,
        current_entropy: 0.4600,
        drift: 0.0311,
        phase: 'STABLE'
      },
      rll_result: {
        locked: false
      }
    }
  };
}

// ============================================================================
// SCENARIO 2: Proof ALLOWED after explicit refutation
// ============================================================================
// Same conflicting proof, but with explicit refutation of the prior precedent.
// With proper justification, it should be ACCEPTED.
// ============================================================================

function createRefutationForInitialProof(
  initialProofHash: string,
  initialRunId: string
): RefutationRecord {
  return {
    refuted_proof_hash: initialProofHash,
    refuted_proof_run_id: initialRunId,
    refuted_invariant: 'FUTURE_INEVITABILITY_VIOLATION',
    refutation_reason: 'System conditions have changed. Forward simulation now shows survivable paths exist. The original inevitability assessment was based on outdated entropy projections.',
    refutation_authority: 'TEMPORAL_EVOLUTION',
    refuted_at: new Date().toISOString()
  };
}

// ============================================================================
// RUNNER
// ============================================================================

function logSeparator(title: string): void {
  console.log('\n');
  console.log('='.repeat(80));
  console.log(title.padStart(40 + title.length / 2).padEnd(80));
  console.log('='.repeat(80));
  console.log('\n');
}

function logPCLResult(result: PCLExecutionResult, scenario: string): void {
  const proof = result.proof;
  const gate = result.gate_result;

  console.log('+' + '-'.repeat(78) + '+');
  console.log(`| ${scenario.padEnd(76)} |`);
  console.log('+' + '-'.repeat(78) + '+');
  console.log(`| Run ID:              ${proof.run_id.substring(0, 53).padEnd(55)} |`);
  console.log(`| Gate Decision:       ${gate.decision.padEnd(55)} |`);

  if (gate.rejection_reason) {
    const reason = gate.rejection_reason.substring(0, 53);
    console.log(`| Rejection Reason:    ${reason.padEnd(55)} |`);
  }

  console.log('+' + '-'.repeat(78) + '+');
  console.log(`| Precedents Checked:  ${String(result.report.precedent_summary.total_checked).padEnd(55)} |`);
  console.log(`| Blocking:            ${String(result.report.precedent_summary.blocking).padEnd(55)} |`);
  console.log(`| Refuted:             ${String(result.report.precedent_summary.refuted).padEnd(55)} |`);
  console.log('+' + '-'.repeat(78) + '+');

  if (result.ledger_entry) {
    console.log(`| Ledger Index:        ${String(result.ledger_entry.index).padEnd(55)} |`);
    console.log(`| Entry Hash:          ${result.ledger_entry.entry_hash.substring(0, 53).padEnd(55)} |`);
  } else {
    console.log(`| Ledger Index:        ${'NOT IN LEDGER'.padEnd(55)} |`);
  }

  console.log(`| Execution Time:      ${(result.execution_time_ms + 'ms').padEnd(55)} |`);
  console.log('+' + '-'.repeat(78) + '+');

  // Show parent proofs
  if (proof.parent_proof_hashes.length > 0) {
    console.log('\n  PARENT PROOFS:');
    for (const parent of proof.parent_proof_hashes) {
      console.log(`    - ${parent.substring(0, 40)}...`);
    }
  }

  // Show refutations
  if (proof.refuted_precedents.length > 0) {
    console.log('\n  REFUTATIONS:');
    for (const refutation of proof.refuted_precedents) {
      console.log(`    - Refuted: ${refutation.refuted_invariant}`);
      console.log(`      Proof:   ${refutation.refuted_proof_hash.substring(0, 40)}...`);
      console.log(`      Reason:  ${refutation.refutation_reason.substring(0, 50)}...`);
      console.log(`      Authority: ${refutation.refutation_authority}`);
    }
  }
}

async function runPCLDemonstration(): Promise<void> {
  console.log('\n');
  console.log('################################################################################');
  console.log('#                                                                              #');
  console.log('#                   PROOF CONTINUITY LAYER (PCL) v1.0.0                        #');
  console.log('#                                                                              #');
  console.log('#              "A truth that cannot persist is not yet true."                  #');
  console.log('#                                                                              #');
  console.log('################################################################################');

  // Create engines
  const ocpmEngine = createOCPMEngine({
    output_dir: './data/decision-proofs',
    write_json: false,
    write_markdown: false
  });

  const pclEngine = createPCLEngine({
    ledger_dir: './data/proof-ledger-demo',
    enforce_precedents: true,
    write_reports: true
  });

  // Clear ledger for demo (TESTING ONLY)
  pclEngine._dangerousClearLedger();

  console.log('\n[PCL] Engines initialized');
  console.log('[PCL] Configuration:', JSON.stringify(pclEngine.getStats().config, null, 2));

  // -------------------------------------------------------------------------
  // SETUP: Add initial blocking proof to ledger
  // -------------------------------------------------------------------------

  logSeparator('SETUP: Initial Blocking Proof');

  console.log('CONTEXT:');
  console.log('  First, we add a proof that BLOCKED an action.');
  console.log('  This establishes a precedent that the action is forbidden.');
  console.log('  The action: "Delete critical system configuration"');
  console.log('  The reason: Future inevitability violation (would cause failure)');

  const initialInput = createInitialBlockingProof();
  const initialOCPMResult = ocpmEngine.execute(initialInput);

  console.log('\n[OCPM] Initial proof created:');
  console.log(`  Decision: ${initialOCPMResult.proof.final_decision}`);
  console.log(`  Invariant: ${initialOCPMResult.proof.primary_invariant_violated}`);
  console.log(`  Proof Hash: ${initialOCPMResult.proof.proof_hash.substring(0, 32)}...`);

  // Add to PCL
  const initialPCLInput: PCLInput = {
    proof: initialOCPMResult.proof,
    ocpm_verified: initialOCPMResult.verified,
    refutations: []
  };

  const initialPCLResult = pclEngine.execute(initialPCLInput);

  console.log('\n[PCL] Initial proof added to ledger:');
  console.log(`  Gate Decision: ${initialPCLResult.gate_result.decision}`);
  console.log(`  Ledger Index: ${initialPCLResult.ledger_entry?.index}`);

  const initialProofHash = initialOCPMResult.proof.proof_hash;
  const initialRunId = initialOCPMResult.proof.run_id;

  // -------------------------------------------------------------------------
  // SCENARIO 1: Proof BLOCKED due to precedent
  // -------------------------------------------------------------------------

  logSeparator('SCENARIO 1: BLOCKED BY PRECEDENT');

  console.log('CONTEXT:');
  console.log('  A new proof attempts the SAME action that was previously blocked.');
  console.log('  Even though OCPM now allows it (conditions changed), PCL must check');
  console.log('  precedent. Without explicit refutation, the proof should be REJECTED.');
  console.log('');
  console.log('EXPECTED:');
  console.log('  - Gate Decision: REJECT_PROOF');
  console.log('  - Reason: Unrefuted precedent conflict');

  const conflictInput = createConflictingProof();
  const conflictOCPMResult = ocpmEngine.execute(conflictInput);

  console.log('\n[OCPM] Conflicting proof created:');
  console.log(`  Decision: ${conflictOCPMResult.proof.final_decision}`);
  console.log(`  Verified: ${conflictOCPMResult.verified}`);

  // Try to add to PCL WITHOUT refutation
  const conflictPCLInput: PCLInput = {
    proof: conflictOCPMResult.proof,
    ocpm_verified: conflictOCPMResult.verified,
    refutations: []  // No refutation!
  };

  const conflictPCLResult = pclEngine.execute(conflictPCLInput);

  logPCLResult(conflictPCLResult, 'SCENARIO 1: NO REFUTATION');

  if (conflictPCLResult.gate_result.decision === 'REJECT_PROOF') {
    console.log('\n[OK] CORRECT: Proof REJECTED due to unrefuted precedent');
  } else {
    console.log('\n[!] WARNING: Expected REJECT_PROOF');
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: Proof ALLOWED after explicit refutation
  // -------------------------------------------------------------------------

  logSeparator('SCENARIO 2: ALLOWED WITH REFUTATION');

  console.log('CONTEXT:');
  console.log('  Same action, but now with EXPLICIT REFUTATION of the prior precedent.');
  console.log('  The refutation explains why the old decision no longer applies:');
  console.log('    - System conditions have changed');
  console.log('    - Forward simulation now shows survivable paths');
  console.log('    - Authority: TEMPORAL_EVOLUTION');
  console.log('');
  console.log('EXPECTED:');
  console.log('  - Gate Decision: ACCEPT_PROOF');
  console.log('  - Refutation recorded in proof');

  // Create refutation
  const refutation = createRefutationForInitialProof(initialProofHash, initialRunId);

  console.log('\n[PCL] Refutation created:');
  console.log(`  Refuted Proof: ${refutation.refuted_proof_hash.substring(0, 32)}...`);
  console.log(`  Refuted Invariant: ${refutation.refuted_invariant}`);
  console.log(`  Authority: ${refutation.refutation_authority}`);
  console.log(`  Reason: ${refutation.refutation_reason.substring(0, 60)}...`);

  // Create a new proof input (same action)
  const retryInput = createConflictingProof();
  retryInput.run_id = `pcl-retry-${Date.now()}`;
  const retryOCPMResult = ocpmEngine.execute(retryInput);

  // Try to add to PCL WITH refutation
  const retryPCLInput: PCLInput = {
    proof: retryOCPMResult.proof,
    ocpm_verified: retryOCPMResult.verified,
    refutations: [refutation]  // With refutation!
  };

  const retryPCLResult = pclEngine.execute(retryPCLInput);

  logPCLResult(retryPCLResult, 'SCENARIO 2: WITH REFUTATION');

  if (retryPCLResult.gate_result.decision === 'ACCEPT_PROOF') {
    console.log('\n[OK] CORRECT: Proof ACCEPTED after explicit refutation');
  } else {
    console.log('\n[!] WARNING: Expected ACCEPT_PROOF');
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------

  logSeparator('PCL DEMONSTRATION COMPLETE');

  console.log('LEDGER STATE:');
  const stats = pclEngine.getLedgerStats();
  console.log(`  Total Entries: ${stats.total_entries}`);
  console.log(`  Chain Valid: ${stats.chain_valid ? 'YES' : 'NO'}`);
  console.log('');

  console.log('RESULTS:');
  console.log('');
  console.log('  Scenario 1 (No Refutation):');
  console.log(`    Gate Decision:  ${conflictPCLResult.gate_result.decision}`);
  console.log(`    In Ledger:      ${conflictPCLResult.ledger_entry ? 'YES' : 'NO'}`);
  console.log('');
  console.log('  Scenario 2 (With Refutation):');
  console.log(`    Gate Decision:  ${retryPCLResult.gate_result.decision}`);
  console.log(`    In Ledger:      ${retryPCLResult.ledger_entry ? 'YES' : 'NO'}`);
  console.log(`    Refutations:    ${retryPCLResult.proof.refuted_precedents.length}`);
  console.log('');
  console.log('KEY PRINCIPLE DEMONSTRATED:');
  console.log('  - OLYMPUS cannot contradict itself without explicit proof-level refutation');
  console.log('  - Past decisions constrain future decisions');
  console.log('  - Refutation must be explicit and justified');
  console.log('  - "A truth that cannot persist is not yet true."');
  console.log('');
  console.log('################################################################################');
}

// Run if executed directly
runPCLDemonstration().catch(console.error);

export { runPCLDemonstration };

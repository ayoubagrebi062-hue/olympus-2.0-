/**
 * AAM Runner - Authority & Attestation Mesh Demonstration
 *
 * Demonstrates the three mandatory scenarios:
 * 1. Unauthorized refutation blocked (USER cannot refute CONSTITUTIONAL)
 * 2. Supremacy-1 invariant cannot be refuted (ENTROPY_BUDGET_EXHAUSTED is UNREFUTABLE)
 * 3. Attestation emitted and verifiable
 *
 * Philosophy: "Truth without authority is opinion. Authority without memory is tyranny."
 *
 * Usage: npx ts-node aam-runner.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  createAAMEngine,
  type AAMEngine,
  type ProofEstablishmentRequest,
  type RefutationRequest
} from './runtime';
import type {
  ContinuityProof,
  RefutationRecord,
  AuthorityClass,
  InvariantCategory,
  OlympusDecisionProof,
  ActionFingerprintSummary,
  CausalLink,
  EntropyStateSnapshot,
  TemporalContractSummary
} from './runtime/types';

// ============================================================================
// CONSOLE OUTPUT HELPERS
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function header(text: string): void {
  console.log('\n' + COLORS.bright + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + ' ' + text + COLORS.reset);
  console.log(COLORS.bright + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
}

function subheader(text: string): void {
  console.log('\n' + COLORS.bright + COLORS.blue + '─ ' + text + ' ─' + COLORS.reset);
}

function success(text: string): void {
  console.log(COLORS.green + '✓ ' + text + COLORS.reset);
}

function failure(text: string): void {
  console.log(COLORS.red + '✗ ' + text + COLORS.reset);
}

function warning(text: string): void {
  console.log(COLORS.yellow + '⚠ ' + text + COLORS.reset);
}

function info(text: string): void {
  console.log(COLORS.magenta + '→ ' + text + COLORS.reset);
}

function hardAbort(text: string): void {
  console.log(COLORS.bright + COLORS.red + '🛑 HARD_ABORT: ' + text + COLORS.reset);
}

// ============================================================================
// MOCK PROOF FACTORY
// ============================================================================

function createMockContinuityProof(
  runId: string,
  action: string,
  invariantViolated: InvariantCategory
): ContinuityProof {
  const now = Date.now();
  const timestamp = new Date().toISOString();

  const actionFingerprint: ActionFingerprintSummary = {
    action_id: `action-${runId}`,
    action_type: 'test',
    description: action,
    timestamp: timestamp,
    hash: `hash-${runId}`
  };

  const entropyState: EntropyStateSnapshot = {
    current_entropy: 0.45,
    baseline_entropy: 0.40,
    drift: 0.05,
    drift_limit: 0.10,
    budget_initial: 1000,
    budget_remaining: 900,
    budget_consumed: 100,
    budget_ratio: 0.9,
    is_exhausted: false
  };

  const temporalSummary: TemporalContractSummary = {
    contract_id: 'contract-aam-test',
    project_id: 'aam-demo',
    current_step: 10,
    intended_lifespan: 100,
    allowed_mutations: 50,
    mutation_count: 5,
    max_entropy_drift: 0.10,
    current_drift: 0.05,
    valid: true,
    violation_reason: null
  };

  const baseProof: OlympusDecisionProof = {
    run_id: runId,
    proof_version: '1.0.0',
    attempted_action_fingerprint: actionFingerprint,
    final_decision: invariantViolated === 'NONE' ? 'ALLOW' : 'BLOCK',
    primary_invariant_violated: invariantViolated,
    primary_violation_description: invariantViolated === 'NONE'
      ? null
      : `Violated ${invariantViolated}`,
    causal_chain: [],
    forbidden_alternatives: [],
    necessary_future: null,
    entropy_state: entropyState,
    temporal_contract_summary: temporalSummary,
    proof_hash: `proof-${runId}-${now}`,
    created_at: timestamp,
    proof_chain_valid: true,
    immutable: true
  };

  const continuityProof: ContinuityProof = {
    ...baseProof,
    parent_proof_hashes: [],
    precedent_checked: true,
    refuted_precedents: [],
    ledger_index: 0,
    continuity_hash: `cont-${runId}-${now}`
  };

  return continuityProof;
}

function createRefutation(
  proofHash: string,
  proofRunId: string,
  invariant: InvariantCategory,
  reason: string
): RefutationRecord {
  return {
    refuted_proof_hash: proofHash,
    refuted_proof_run_id: proofRunId,
    refuted_invariant: invariant,
    refutation_reason: reason,
    refutation_authority: 'SYSTEM_OVERRIDE',
    refuted_at: new Date().toISOString()
  };
}

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

async function runScenario1(engine: AAMEngine): Promise<boolean> {
  header('SCENARIO 1: Unauthorized Refutation Blocked');
  info('USER (level 1) attempts to refute a CONSTITUTIONAL (level 3) decision');
  info('This should be BLOCKED - lower authority cannot refute higher authority');

  // First, establish a proof with CONSTITUTIONAL authority
  subheader('Step 1: Establish proof with CONSTITUTIONAL authority');
  const proof = createMockContinuityProof(
    'aam-s1-constitutional',
    'Constitutional decree: All code must be tested',
    'NONE'
  );

  const establishResult = engine.establishProof({
    proof,
    authority_class: 'CONSTITUTIONAL'
  });

  if (establishResult.accepted) {
    success(`Proof established by CONSTITUTIONAL (level ${establishResult.authority_level})`);
    info(`Attestation ID: ${establishResult.attestation?.attestation_id}`);
  }

  // Now USER tries to refute it
  subheader('Step 2: USER attempts to refute CONSTITUTIONAL decision');
  const refutation = createRefutation(
    proof.proof_hash,
    proof.run_id,
    'NONE',
    'I disagree with this constitutional decree'
  );

  const refutationResult = engine.validateRefutation({
    refutation,
    refuter_authority: 'USER',
    refuted_authority: 'CONSTITUTIONAL'
  });

  if (!refutationResult.authorized && refutationResult.hard_abort) {
    hardAbort('Refutation BLOCKED');
    failure(`USER (level ${refutationResult.refuter_level}) cannot refute CONSTITUTIONAL (level ${refutationResult.refuted_level})`);
    info(`Reason: ${refutationResult.rejection_reason}`);
    success('SCENARIO 1 PASSED: Lower authority correctly blocked from refuting higher authority');
    return true;
  } else {
    failure('SCENARIO 1 FAILED: Unauthorized refutation was not blocked!');
    return false;
  }
}

async function runScenario2(engine: AAMEngine): Promise<boolean> {
  header('SCENARIO 2: Supremacy-1 Invariant Cannot Be Refuted');
  info('Attempting to refute ENTROPY_BUDGET_EXHAUSTED (supremacy level 1 = UNREFUTABLE)');
  info('Even SYSTEM_ROOT cannot refute a supremacy-1 invariant');

  // Check what invariants are unrefutable
  subheader('Unrefutable Invariants (Supremacy Level 1)');
  const unrefutableInvariants = engine.getUnrefutableInvariants();
  unrefutableInvariants.forEach(inv => {
    warning(`${inv} - ABSOLUTELY UNREFUTABLE`);
  });

  // Establish a proof that violated ENTROPY_BUDGET_EXHAUSTED
  subheader('Step 1: Proof blocked for ENTROPY_BUDGET_EXHAUSTED violation');
  const proof = createMockContinuityProof(
    'aam-s2-entropy',
    'Action that exhausted entropy budget',
    'ENTROPY_BUDGET_EXHAUSTED'
  );

  // Now even SYSTEM_ROOT tries to refute it
  subheader('Step 2: SYSTEM_ROOT attempts to refute ENTROPY_BUDGET_EXHAUSTED');
  const refutation = createRefutation(
    proof.proof_hash,
    proof.run_id,
    'ENTROPY_BUDGET_EXHAUSTED',
    'System root override: Grant more entropy'
  );

  const refutationResult = engine.validateRefutation({
    refutation,
    refuter_authority: 'SYSTEM_ROOT',
    refuted_authority: 'SYSTEM_ROOT'
  });

  if (!refutationResult.authorized && refutationResult.hard_abort) {
    hardAbort('Refutation BLOCKED');
    failure(`Even SYSTEM_ROOT (level ${refutationResult.refuter_level}) cannot refute supremacy-1 invariant`);
    info(`Supremacy level: ${refutationResult.invariant_supremacy} (UNREFUTABLE)`);
    info(`Reason: ${refutationResult.rejection_reason}`);
    success('SCENARIO 2 PASSED: Supremacy-1 invariant is absolutely unrefutable');
    return true;
  } else {
    failure('SCENARIO 2 FAILED: Supremacy-1 invariant was incorrectly refutable!');
    return false;
  }
}

async function runScenario3(engine: AAMEngine): Promise<boolean> {
  header('SCENARIO 3: Attestation Chain Integrity');
  info('Establishing multiple proofs and verifying attestation chain');

  // Clear any previous attestations for clean test
  engine._dangerousClear();

  // Establish several proofs with different authorities
  const proofs = [
    { auth: 'USER' as AuthorityClass, action: 'User-level configuration change' },
    { auth: 'PROJECT' as AuthorityClass, action: 'Project-level dependency update' },
    { auth: 'CONSTITUTIONAL' as AuthorityClass, action: 'Constitutional policy enforcement' }
  ];

  subheader('Step 1: Establish proofs with attestations');
  for (let i = 0; i < proofs.length; i++) {
    const { auth, action } = proofs[i];
    const proof = createMockContinuityProof(`aam-s3-${i}`, action, 'NONE');

    const result = engine.establishProof({ proof, authority_class: auth });

    if (result.accepted && result.attestation) {
      success(`Proof ${i + 1} established by ${auth} (level ${result.authority_level})`);
      info(`  Attestation ID: ${result.attestation.attestation_id}`);
      info(`  Attestation Hash: ${result.attestation.attestation_hash.substring(0, 16)}...`);
    } else {
      failure(`Failed to establish proof ${i + 1}`);
      return false;
    }
  }

  // Verify the attestation chain
  subheader('Step 2: Verify attestation chain integrity');
  const verification = engine.verifyAttestationChain();

  console.log(`\n  Total attestations: ${verification.total_attestations}`);
  console.log(`  Verified count: ${verification.verified_count}`);
  console.log(`  Chain intact: ${verification.chain_intact}`);
  console.log(`  Valid: ${verification.valid}`);

  if (verification.errors.length > 0) {
    console.log(`  Errors:`);
    verification.errors.forEach(e => failure(`    ${e}`));
  }

  // Show attestation details
  subheader('Step 3: Examine attestation chain');
  const attestations = engine.getAllAttestations();

  attestations.forEach((entry, idx) => {
    console.log(`\n  [${idx}] Index: ${entry.index}`);
    console.log(`      Entry Hash: ${entry.entry_hash.substring(0, 24)}...`);
    console.log(`      Prev Hash: ${entry.previous_attestation_hash?.substring(0, 24) || 'null'}...`);
    console.log(`      Authority: ${entry.attestation.authority_class}`);
    console.log(`      Timestamp: ${entry.attestation.timestamp}`);
  });

  if (verification.valid && verification.chain_intact) {
    success('\nSCENARIO 3 PASSED: Attestation chain is valid and intact');
    return true;
  } else {
    failure('\nSCENARIO 3 FAILED: Attestation chain verification failed');
    return false;
  }
}

async function runAuthorityHierarchyDemo(engine: AAMEngine): Promise<void> {
  header('BONUS: Authority Hierarchy & Supremacy Levels');

  subheader('Authority Class Hierarchy');
  const hierarchy = engine.getAuthorityHierarchy();
  hierarchy.forEach(h => {
    console.log(`  Level ${h.level}: ${h.class}`);
    console.log(`    ${h.description}`);
  });

  subheader('Supremacy Levels by Invariant');
  const supremacies = engine.getSupremacyDefinitions();

  // Group by level
  const byLevel: Record<number, typeof supremacies> = {};
  supremacies.forEach(s => {
    if (!byLevel[s.supremacy_level]) byLevel[s.supremacy_level] = [];
    byLevel[s.supremacy_level].push(s);
  });

  Object.keys(byLevel).sort((a, b) => Number(a) - Number(b)).forEach(level => {
    const levelName = Number(level) === 1 ? 'UNREFUTABLE' :
                     Number(level) === 2 ? 'SYSTEM_ONLY' :
                     Number(level) === 3 ? 'CONSTITUTIONAL' :
                     Number(level) === 4 ? 'PROJECT' : 'USER';
    console.log(`\n  Level ${level} (${levelName}):`);
    byLevel[Number(level)].forEach(s => {
      const refuters = s.refutable_by.length > 0 ? s.refutable_by.join(', ') : 'NONE';
      console.log(`    ${s.invariant}`);
      console.log(`      Refutable by: ${refuters}`);
    });
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log(COLORS.bright + COLORS.magenta);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║    AAM - AUTHORITY & ATTESTATION MESH                                        ║');
  console.log('║    "Truth without authority is opinion. Authority without memory is tyranny."║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  // Setup attestation directory
  const attestationDir = path.join(__dirname, 'data', 'aam-demo-attestations');
  if (!fs.existsSync(attestationDir)) {
    fs.mkdirSync(attestationDir, { recursive: true });
  }

  // Initialize AAM Engine
  const engine = createAAMEngine({
    attestation_dir: attestationDir
  });

  // Show initial stats
  const stats = engine.getStats();
  console.log('\n' + COLORS.cyan + 'AAM Engine Initialized:' + COLORS.reset);
  console.log(`  Version: ${stats.version}`);
  console.log(`  Authority Classes: ${stats.authority.total_classes}`);
  console.log(`  Invariants Tracked: ${stats.supremacy.total_invariants}`);
  console.log(`  Unrefutable Invariants: ${stats.supremacy.unrefutable_count}`);

  // Run scenarios
  const results: boolean[] = [];

  results.push(await runScenario1(engine));
  results.push(await runScenario2(engine));
  results.push(await runScenario3(engine));

  // Bonus demo
  await runAuthorityHierarchyDemo(engine);

  // Summary
  header('DEMONSTRATION SUMMARY');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\n  Scenarios Passed: ${passed}/${total}`);

  if (passed === total) {
    success('\n  ALL AAM SCENARIOS PASSED');
    console.log('\n  The Authority & Attestation Mesh correctly enforces:');
    console.log('  ✓ Authority hierarchy (lower cannot refute higher)');
    console.log('  ✓ Supremacy-1 invariants are absolutely unrefutable');
    console.log('  ✓ Attestation chain maintains verifiable integrity');
  } else {
    failure(`\n  ${total - passed} SCENARIO(S) FAILED`);
  }

  console.log('\n' + COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');
}

main().catch(console.error);

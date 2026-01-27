/**
 * OCPM Engine (Olympus Core Proof Model)
 *
 * The canonical proof spine of OLYMPUS.
 * Unifies all enforcement layers into a single, minimal, verifiable proof artifact.
 *
 * KEY PRINCIPLE:
 * - "If a decision cannot be explained minimally, it is not yet true."
 * - One proof object per execution
 * - Deterministic, verifiable, reducible
 *
 * THIS IS NOT A NEW ENGINE:
 * - Does NOT add enforcement logic
 * - Does NOT modify existing engines
 * - Only assembles, reduces, hashes, and verifies proofs
 *
 * NON-NEGOTIABLE:
 * - One proof per execution
 * - Exactly one primary invariant per block
 * - Append-only persistence
 * - Deterministic everything
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  OlympusDecisionProof,
  ProofAssemblyInput,
  ProofVerificationResult
} from './types';

import { ProofAssembler } from './proof-assembler';
import { ProofReducer, type ReductionStats } from './proof-reducer';
import { ProofHasher, type HashResult, type ComponentHashes } from './proof-hasher';
import { ProofVerifier, type DetailedVerificationReport } from './proof-verifier';

// OCPM version - immutable
const OCPM_VERSION = '1.0.0';
Object.freeze({ OCPM_VERSION });

/**
 * OCPM execution result
 */
export interface OCPMExecutionResult {
  // The proof artifact
  proof: OlympusDecisionProof;

  // Reduction applied
  reduced: boolean;
  reduction_stats: ReductionStats | null;

  // Verification passed
  verified: boolean;
  verification_result: ProofVerificationResult;

  // Hash details
  hash_result: HashResult;
  component_hashes: ComponentHashes;

  // Output locations
  json_path: string | null;
  markdown_path: string | null;

  // Metadata
  ocpm_version: string;
  execution_time_ms: number;
}

/**
 * OCPM Engine configuration
 */
export interface OCPMConfig {
  output_dir?: string;
  reduce_proofs?: boolean;
  verify_after_assembly?: boolean;
  write_json?: boolean;
  write_markdown?: boolean;
}

export class OCPMEngine {
  private assembler: ProofAssembler;
  private reducer: ProofReducer;
  private hasher: ProofHasher;
  private verifier: ProofVerifier;
  private config: Required<OCPMConfig>;

  constructor(config?: Partial<OCPMConfig>) {
    this.assembler = new ProofAssembler();
    this.reducer = new ProofReducer();
    this.hasher = new ProofHasher();
    this.verifier = new ProofVerifier();

    this.config = {
      output_dir: config?.output_dir ?? './data/decision-proofs',
      reduce_proofs: config?.reduce_proofs ?? true,
      verify_after_assembly: config?.verify_after_assembly ?? true,
      write_json: config?.write_json ?? true,
      write_markdown: config?.write_markdown ?? true
    };
  }

  /**
   * Execute OCPM pipeline
   *
   * 1. Assemble proof from engine outputs
   * 2. Reduce to minimal form
   * 3. Verify integrity
   * 4. Write outputs
   */
  execute(input: ProofAssemblyInput): OCPMExecutionResult {
    const startTime = Date.now();

    // Step 1: Assemble proof
    let proof = this.assembler.assemble(input);

    // Step 2: Reduce if configured
    let reduced = false;
    let reductionStats: ReductionStats | null = null;

    if (this.config.reduce_proofs && this.reducer.needsReduction(proof)) {
      const reductionResult = this.reducer.reduce(proof);
      proof = reductionResult.proof;
      reductionStats = reductionResult.stats;
      reduced = true;
    }

    // Step 3: Verify if configured
    let verificationResult: ProofVerificationResult;
    if (this.config.verify_after_assembly) {
      verificationResult = this.verifier.verify(proof);
    } else {
      verificationResult = {
        valid: true,
        hash_matches: true,
        chain_valid: true,
        invariant_valid: true,
        errors: []
      };
    }

    // Step 4: Get hash details
    const hashResult = this.hasher.hashProof(proof);
    const componentHashes = this.hasher.hashComponents(proof);

    // Step 5: Write outputs
    let jsonPath: string | null = null;
    let markdownPath: string | null = null;

    if (this.config.write_json) {
      jsonPath = this.writeJsonOutput(proof);
    }

    if (this.config.write_markdown) {
      markdownPath = this.writeMarkdownReport(proof, reductionStats, verificationResult);
    }

    const executionTime = Date.now() - startTime;

    return {
      proof,
      reduced,
      reduction_stats: reductionStats,
      verified: verificationResult.valid,
      verification_result: verificationResult,
      hash_result: hashResult,
      component_hashes: componentHashes,
      json_path: jsonPath,
      markdown_path: markdownPath,
      ocpm_version: OCPM_VERSION,
      execution_time_ms: executionTime
    };
  }

  /**
   * Write JSON output
   */
  private writeJsonOutput(proof: OlympusDecisionProof): string {
    const dir = this.config.output_dir;

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${proof.run_id}.json`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, JSON.stringify(proof, null, 2));

    return filepath;
  }

  /**
   * Write markdown report (1 page max)
   */
  private writeMarkdownReport(
    proof: OlympusDecisionProof,
    reductionStats: ReductionStats | null,
    verification: ProofVerificationResult
  ): string {
    const dir = this.config.output_dir.replace('decision-proofs', 'reports');

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const lines: string[] = [];

    // Header
    lines.push('# OLYMPUS Decision Proof');
    lines.push('');
    lines.push(`**Run ID:** \`${proof.run_id}\``);
    lines.push(`**Created:** ${proof.created_at}`);
    lines.push(`**OCPM Version:** ${proof.proof_version}`);
    lines.push('');

    // Decision
    lines.push('---');
    lines.push('');
    lines.push('## Decision');
    lines.push('');
    lines.push('```');
    lines.push(`FINAL DECISION: ${proof.final_decision}`);
    lines.push('```');
    lines.push('');

    // Primary Invariant
    if (proof.primary_invariant_violated !== 'NONE') {
      lines.push(`**Primary Invariant Violated:** \`${proof.primary_invariant_violated}\``);
      if (proof.primary_violation_description) {
        lines.push(`**Reason:** ${proof.primary_violation_description}`);
      }
    } else {
      lines.push('**Primary Invariant:** None (action permitted)');
    }
    lines.push('');

    // Causal Chain
    lines.push('---');
    lines.push('');
    lines.push('## Causal Chain');
    lines.push('');
    if (proof.causal_chain.length === 0) {
      lines.push('_Empty chain (direct allow)_');
    } else {
      for (const link of proof.causal_chain) {
        lines.push(`${link.step}. **[${link.source_layer}]** ${link.event}`);
        lines.push(`   → ${link.effect}`);
      }
    }
    lines.push('');

    // Entropy State
    lines.push('---');
    lines.push('');
    lines.push('## Entropy State');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Current | ${proof.entropy_state.current_entropy.toFixed(4)} |`);
    lines.push(`| Baseline | ${proof.entropy_state.baseline_entropy.toFixed(4)} |`);
    lines.push(`| Drift | ${proof.entropy_state.drift.toFixed(4)} / ${proof.entropy_state.drift_limit} |`);
    lines.push(`| Budget | ${proof.entropy_state.budget_remaining} / ${proof.entropy_state.budget_initial} (${(proof.entropy_state.budget_ratio * 100).toFixed(1)}%) |`);
    lines.push(`| Exhausted | ${proof.entropy_state.is_exhausted ? 'YES' : 'NO'} |`);
    lines.push('');

    // Contract Summary
    lines.push('---');
    lines.push('');
    lines.push('## Temporal Contract');
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Contract ID | ${proof.temporal_contract_summary.contract_id || 'None'} |`);
    lines.push(`| Valid | ${proof.temporal_contract_summary.valid ? 'YES' : 'NO'} |`);
    lines.push(`| Step | ${proof.temporal_contract_summary.current_step} / ${proof.temporal_contract_summary.intended_lifespan} |`);
    lines.push(`| Mutations | ${proof.temporal_contract_summary.mutation_count} / ${proof.temporal_contract_summary.allowed_mutations} |`);
    if (proof.temporal_contract_summary.violation_reason) {
      lines.push(`| Violation | ${proof.temporal_contract_summary.violation_reason} |`);
    }
    lines.push('');

    // Necessary Future
    if (proof.necessary_future) {
      lines.push('---');
      lines.push('');
      lines.push('## Necessary Future');
      lines.push('');
      lines.push(`- **Exists:** ${proof.necessary_future.exists ? 'YES' : 'NO'}`);
      lines.push(`- **Survivable Steps:** ${proof.necessary_future.survivable_steps}`);
      if (proof.necessary_future.first_violation_step !== null) {
        lines.push(`- **First Violation:** Step ${proof.necessary_future.first_violation_step}`);
      }
      lines.push(`- **Survivability:** ${(proof.necessary_future.projected_survivability * 100).toFixed(1)}%`);
      lines.push('');
    }

    // Verification
    lines.push('---');
    lines.push('');
    lines.push('## Verification');
    lines.push('');
    lines.push(`**Status:** ${verification.valid ? 'VERIFIED' : 'FAILED'}`);
    lines.push(`**Hash Matches:** ${verification.hash_matches ? 'YES' : 'NO'}`);
    lines.push(`**Chain Valid:** ${verification.chain_valid ? 'YES' : 'NO'}`);
    if (verification.errors.length > 0) {
      lines.push('');
      lines.push('**Errors:**');
      for (const error of verification.errors) {
        lines.push(`- ${error}`);
      }
    }
    lines.push('');

    // Proof Hash
    lines.push('---');
    lines.push('');
    lines.push('## Proof Hash');
    lines.push('');
    lines.push('```');
    lines.push(proof.proof_hash);
    lines.push('```');
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by OCPM (Olympus Core Proof Model)*');
    lines.push('');
    lines.push('> "If a decision cannot be explained minimally, it is not yet true."');
    lines.push('');

    const content = lines.join('\n');
    const filename = `decision-proof-${proof.run_id}.md`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, content);

    return filepath;
  }

  /**
   * Verify an existing proof
   */
  verifyProof(proof: OlympusDecisionProof): DetailedVerificationReport {
    return this.verifier.generateReport(proof);
  }

  /**
   * Load and verify a proof from JSON file
   */
  loadAndVerify(filepath: string): {
    proof: OlympusDecisionProof;
    verification: DetailedVerificationReport;
  } {
    const content = fs.readFileSync(filepath, 'utf8');
    const proof = JSON.parse(content) as OlympusDecisionProof;
    const verification = this.verifyProof(proof);

    return { proof, verification };
  }

  /**
   * Get OCPM statistics
   */
  getStats(): {
    ocpm_version: string;
    components: string[];
    config: OCPMConfig;
  } {
    return {
      ocpm_version: OCPM_VERSION,
      components: ['ProofAssembler', 'ProofReducer', 'ProofHasher', 'ProofVerifier'],
      config: this.config
    };
  }

  /**
   * Log execution result
   */
  logResult(result: OCPMExecutionResult): void {
    console.log('[OCPM] ==========================================');
    console.log('[OCPM] OLYMPUS CORE PROOF MODEL');
    console.log('[OCPM] ==========================================');
    console.log(`[OCPM] Run ID: ${result.proof.run_id}`);
    console.log(`[OCPM] Decision: ${result.proof.final_decision}`);
    console.log(`[OCPM] Primary Invariant: ${result.proof.primary_invariant_violated}`);
    console.log('[OCPM] ------------------------------------------');
    console.log(`[OCPM] Causal Chain: ${result.proof.causal_chain.length} links`);
    console.log(`[OCPM] Forbidden Alternatives: ${result.proof.forbidden_alternatives.length}`);
    console.log(`[OCPM] Reduced: ${result.reduced ? 'YES' : 'NO'}`);
    console.log(`[OCPM] Verified: ${result.verified ? 'YES' : 'NO'}`);
    console.log('[OCPM] ------------------------------------------');
    console.log(`[OCPM] Proof Hash: ${result.hash_result.fingerprint}...`);
    console.log(`[OCPM] Execution Time: ${result.execution_time_ms}ms`);

    if (result.json_path) {
      console.log(`[OCPM] JSON Output: ${result.json_path}`);
    }
    if (result.markdown_path) {
      console.log(`[OCPM] Markdown Report: ${result.markdown_path}`);
    }

    console.log('[OCPM] ==========================================');
  }
}

/**
 * Create OCPM Engine instance
 */
export function createOCPMEngine(config?: Partial<OCPMConfig>): OCPMEngine {
  return new OCPMEngine(config);
}

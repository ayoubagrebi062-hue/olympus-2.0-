/**
 * PCL Engine (Proof Continuity Layer)
 *
 * Binds OlympusDecisionProofs across time.
 * Introduces memory, precedent, and irreversibility.
 *
 * KEY PRINCIPLE:
 * - "A truth that cannot persist is not yet true."
 * - OLYMPUS cannot contradict itself without explicit proof-level refutation
 *
 * PIPELINE:
 * 1. Resolve lineage (parent proofs)
 * 2. Validate precedents (check for conflicts)
 * 3. Gate decision (ACCEPT or REJECT)
 * 4. If accepted, enhance proof and append to ledger
 * 5. Generate continuity report
 *
 * NON-NEGOTIABLE:
 * - Does NOT modify OCPM internals
 * - Does NOT re-evaluate decisions
 * - Does NOT add intelligence or heuristics
 * - Deterministic only
 * - Append-only forever
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  OlympusDecisionProof,
  ContinuityProof,
  PCLConfig,
  PCLExecutionResult,
  ContinuityReport,
  RefutationRecord
} from './types';

import { ProofLedger, createProofLedger } from './proof-ledger';
import { ProofLineageResolver, createLineageResolver } from './proof-lineage-resolver';
import { PrecedentValidator, createPrecedentValidator } from './precedent-validator';
import { ContinuityGate, createContinuityGate } from './continuity-gate';

// PCL version - immutable
const PCL_VERSION = '1.0.0';
Object.freeze({ PCL_VERSION });

/**
 * PCL input - an OCPM-verified proof plus optional refutations
 */
export interface PCLInput {
  // The OCPM-verified proof
  proof: OlympusDecisionProof;

  // Whether OCPM verification passed
  ocpm_verified: boolean;

  // Explicit refutations (if any)
  refutations?: RefutationRecord[];
}

export class PCLEngine {
  private ledger: ProofLedger;
  private lineageResolver: ProofLineageResolver;
  private precedentValidator: PrecedentValidator;
  private continuityGate: ContinuityGate;
  private config: Required<PCLConfig>;
  private reportDir: string;

  constructor(config?: Partial<PCLConfig>) {
    this.config = {
      ledger_dir: config?.ledger_dir ?? './data/proof-ledger',
      enforce_precedents: config?.enforce_precedents ?? true,
      max_lineage_depth: config?.max_lineage_depth ?? 10,
      write_reports: config?.write_reports ?? true
    };

    // Initialize components
    this.ledger = createProofLedger(this.config.ledger_dir);
    this.lineageResolver = createLineageResolver({
      max_depth: this.config.max_lineage_depth
    });
    this.precedentValidator = createPrecedentValidator({
      enforce_hard_precedents: this.config.enforce_precedents
    });
    this.continuityGate = createContinuityGate(
      this.lineageResolver,
      this.precedentValidator,
      { enforce_precedents: this.config.enforce_precedents }
    );

    this.reportDir = this.config.ledger_dir.replace('proof-ledger', 'continuity-reports');
  }

  /**
   * Execute PCL pipeline
   *
   * 1. Resolve lineage
   * 2. Validate precedents
   * 3. Gate check
   * 4. Enhance and append (if accepted)
   * 5. Generate report
   */
  execute(input: PCLInput): PCLExecutionResult {
    const startTime = Date.now();
    const refutations = input.refutations ?? [];

    // Step 1-3: Gate check (includes lineage + precedent validation)
    const gateResult = this.continuityGate.check(
      input.proof,
      input.ocpm_verified,
      refutations,
      this.ledger
    );

    // Step 4: If accepted, enhance and append
    let continuityProof: ContinuityProof;
    let ledgerEntry = null;

    if (gateResult.decision === 'ACCEPT_PROOF') {
      // Get next ledger index
      const ledgerIndex = this.ledger.getNextIndex();

      // Enhance proof with continuity information
      continuityProof = this.continuityGate.enhanceProof(
        input.proof,
        gateResult.lineage,
        refutations,
        ledgerIndex
      );

      // Append to ledger
      ledgerEntry = this.ledger.append(continuityProof);
    } else {
      // Create a continuity proof for reporting, but don't append
      continuityProof = {
        ...input.proof,
        parent_proof_hashes: gateResult.lineage.all_parents,
        precedent_checked: true,
        refuted_precedents: refutations,
        ledger_index: -1, // Not in ledger
        continuity_hash: ''
      };
    }

    // Step 5: Generate report
    const report = this.continuityGate.generateReport(continuityProof, gateResult);

    // Write report if configured
    if (this.config.write_reports) {
      this.writeReport(report);
    }

    const executionTime = Date.now() - startTime;

    return {
      proof: continuityProof,
      gate_result: gateResult,
      report,
      ledger_entry: ledgerEntry,
      execution_time_ms: executionTime,
      pcl_version: PCL_VERSION
    };
  }

  /**
   * Write continuity report to disk
   */
  private writeReport(report: ContinuityReport): void {
    // Ensure directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const lines: string[] = [];

    // Header
    lines.push('# Proof Continuity Report');
    lines.push('');
    lines.push(`**Run ID:** \`${report.proof_run_id}\``);
    lines.push(`**Proof Hash:** \`${report.proof_hash.substring(0, 16)}...\``);
    lines.push(`**Generated:** ${report.generated_at}`);
    lines.push('');

    // Gate Decision
    lines.push('---');
    lines.push('');
    lines.push('## Gate Decision');
    lines.push('');
    lines.push('```');
    lines.push(report.gate_decision);
    lines.push('```');
    lines.push('');

    // Precedent Summary
    lines.push('---');
    lines.push('');
    lines.push('## Precedent Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Checked | ${report.precedent_summary.total_checked} |`);
    lines.push(`| Applicable | ${report.precedent_summary.applicable} |`);
    lines.push(`| Blocking | ${report.precedent_summary.blocking} |`);
    lines.push(`| Refuted | ${report.precedent_summary.refuted} |`);
    lines.push('');

    // Upheld Precedents
    if (report.upheld_precedents.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Upheld Precedents');
      lines.push('');
      for (const upheld of report.upheld_precedents) {
        lines.push(`- \`${upheld.proof_hash.substring(0, 12)}...\`: ${upheld.invariant}`);
      }
      lines.push('');
    }

    // Refuted Precedents
    if (report.refuted_precedents.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Refuted Precedents');
      lines.push('');
      for (const refuted of report.refuted_precedents) {
        lines.push(`### Refutation: ${refuted.refuted_invariant}`);
        lines.push('');
        lines.push(`- **Refuted Proof:** \`${refuted.refuted_proof_hash.substring(0, 12)}...\``);
        lines.push(`- **Run ID:** ${refuted.refuted_proof_run_id}`);
        lines.push(`- **Authority:** ${refuted.refutation_authority}`);
        lines.push(`- **Reason:** ${refuted.refutation_reason}`);
        lines.push(`- **Timestamp:** ${refuted.refuted_at}`);
        lines.push('');
      }
    }

    // Chain Info
    lines.push('---');
    lines.push('');
    lines.push('## Continuity Chain');
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Ledger Index | ${report.chain_info.ledger_index} |`);
    lines.push(`| Parent Count | ${report.chain_info.parent_count} |`);
    lines.push(`| Lineage Depth | ${report.chain_info.lineage_depth} |`);
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Generated by PCL (Proof Continuity Layer)*');
    lines.push('');
    lines.push('> "A truth that cannot persist is not yet true."');
    lines.push('');

    const content = lines.join('\n');
    const filename = `continuity-${report.proof_run_id}.md`;
    const filepath = path.join(this.reportDir, filename);

    fs.writeFileSync(filepath, content);
  }

  /**
   * Get ledger statistics
   */
  getLedgerStats() {
    return this.ledger.getStats();
  }

  /**
   * Get proof by hash
   */
  getProof(proofHash: string) {
    return this.ledger.getByProofHash(proofHash);
  }

  /**
   * Get all entries
   */
  getAllEntries() {
    return this.ledger.getAllEntries();
  }

  /**
   * Verify ledger integrity
   */
  verifyLedgerIntegrity(): boolean {
    return this.ledger.verifyChainIntegrity();
  }

  /**
   * Create a refutation for a prior proof
   */
  createRefutation(
    priorProofHash: string,
    invariant: string,
    reason: string,
    authority: RefutationRecord['refutation_authority']
  ): RefutationRecord | null {
    const entry = this.ledger.getByProofHash(priorProofHash);
    if (!entry) return null;

    return this.precedentValidator.createRefutation(
      entry.proof,
      invariant as any,
      reason,
      authority
    );
  }

  /**
   * Get PCL statistics
   */
  getStats(): {
    pcl_version: string;
    config: PCLConfig;
    ledger_stats: ReturnType<ProofLedger['getStats']>;
  } {
    return {
      pcl_version: PCL_VERSION,
      config: this.config,
      ledger_stats: this.ledger.getStats()
    };
  }

  /**
   * Log execution result
   */
  logResult(result: PCLExecutionResult): void {
    console.log('[PCL] ==========================================');
    console.log('[PCL] PROOF CONTINUITY LAYER');
    console.log('[PCL] ==========================================');
    console.log(`[PCL] Run ID: ${result.proof.run_id}`);
    console.log(`[PCL] Gate Decision: ${result.gate_result.decision}`);

    if (result.gate_result.rejection_reason) {
      console.log(`[PCL] Rejection Reason: ${result.gate_result.rejection_reason}`);
    }

    console.log('[PCL] ------------------------------------------');
    console.log(`[PCL] Precedents Checked: ${result.report.precedent_summary.total_checked}`);
    console.log(`[PCL] Blocking: ${result.report.precedent_summary.blocking}`);
    console.log(`[PCL] Refuted: ${result.report.precedent_summary.refuted}`);
    console.log('[PCL] ------------------------------------------');

    if (result.ledger_entry) {
      console.log(`[PCL] Ledger Index: ${result.ledger_entry.index}`);
      console.log(`[PCL] Entry Hash: ${result.ledger_entry.entry_hash.substring(0, 16)}...`);
    } else {
      console.log('[PCL] NOT ADDED TO LEDGER');
    }

    console.log(`[PCL] Execution Time: ${result.execution_time_ms}ms`);
    console.log('[PCL] ==========================================');
  }

  /**
   * Clear ledger (FOR TESTING ONLY)
   */
  _dangerousClearLedger(): void {
    this.ledger._dangerousClear();
  }
}

/**
 * Create PCL Engine instance
 */
export function createPCLEngine(config?: Partial<PCLConfig>): PCLEngine {
  return new PCLEngine(config);
}

/**
 * OLYMPUS 2.0 - Governance Runtime Startup
 *
 * Enforces governance seal check on system startup.
 * If seal invalid → runtime refuses execution.
 *
 * Non-negotiable: System will NOT start without valid seal.
 */

import { GOVERNANCE_SEAL } from './governance-seal';
import { sealInvariant } from './invariant/seal-invariant';
import { MinimalInvariantEngine } from './invariant/core';
import { AgentIdentity, AgentRole } from './types';
import type { AgentId } from '../types';
import type { ILedgerStore } from './ledger/types';
import type { VerificationEvent } from './store/transaction/types';

/**
 * Runtime startup result
 */
export interface RuntimeStartupResult {
  allowed: boolean;
  reason?: string;
  sealVersion: string;
  sealHash: string;
  checkedAt: Date;
}

/**
 * Governance runtime startup checker
 * Enforces seal before any execution
 */
export class GovernanceRuntimeStartup {
  private ledger?: ILedgerStore;

  constructor(ledger?: ILedgerStore) {
    this.ledger = ledger;
  }

  /**
   * Validate seal and allow/refuse runtime execution
   * If seal invalid → runtime refuses execution
   */
  async validateAndStart(agentIdentity?: AgentIdentity): Promise<RuntimeStartupResult> {
    const checkedAt = new Date();

    console.log('='.repeat(60));
    console.log('GOVERNANCE RUNTIME STARTUP');
    console.log('='.repeat(60));
    console.log(`Seal Version: ${GOVERNANCE_SEAL.version}`);
    console.log(`Seal Status: ${GOVERNANCE_SEAL.sealed ? 'SEALED' : 'UNSEALED'}`);
    console.log(`Seal Hash: ${GOVERNANCE_SEAL.sealHash}`);
    console.log(`Checked At: ${checkedAt.toISOString()}`);
    console.log('='.repeat(60));

    // Step 1: Run seal invariant
    const invariantEngine = new MinimalInvariantEngine();
    invariantEngine.register(sealInvariant);

    // Create dummy agent identity for invariant check
    const identity: AgentIdentity = agentIdentity || {
      agentId: 'runtime-startup-check' as AgentId,
      version: '8.0.0',
      fingerprint: 'startup-check-fingerprint',
      role: AgentRole.MONITOR,
      tenantId: 'system',
      buildId: 'startup-check',
    };

    const verificationEvent = await invariantEngine.verifyAll(identity);

    // Step 2: Check if seal invariant passed
    const sealResult = verificationEvent.invariantResults.find(
      r => r.invariantName === 'GOVERNANCE_SEAL'
    );

    if (!sealResult || !sealResult.passed) {
      // SEAL BREACH DETECTED - REFUSE EXECUTION
      const reason = sealResult?.reason || 'Unknown seal breach';
      console.error('❌ GOVERNANCE SEAL BREACH DETECTED');
      console.error(`❌ Reason: ${reason}`);
      console.error('❌ RUNTIME EXECUTION REFUSED');
      console.error('='.repeat(60));

      // Append to ledger if available
      if (this.ledger) {
        await this.appendSealBreachToLedger(reason, verificationEvent);
      }

      return {
        allowed: false,
        reason,
        sealVersion: GOVERNANCE_SEAL.version,
        sealHash: GOVERNANCE_SEAL.sealHash,
        checkedAt,
      };
    }

    // Step 3: Seal is valid - allow execution
    console.log('✅ GOVERNANCE SEAL VALID');
    console.log('✅ RUNTIME EXECUTION ALLOWED');
    console.log('='.repeat(60));

    // Append seal verification to ledger if available
    if (this.ledger) {
      await this.appendSealVerificationToLedger(verificationEvent);
    }

    return {
      allowed: true,
      sealVersion: GOVERNANCE_SEAL.version,
      sealHash: GOVERNANCE_SEAL.sealHash,
      checkedAt,
    };
  }

  /**
   * Append seal breach to ledger
   * Critical: All seal breaches must be logged
   */
  private async appendSealBreachToLedger(
    reason: string,
    verificationEvent: VerificationEvent
  ): Promise<void> {
    if (!this.ledger) return;

    try {
      await this.ledger.append({
        buildId: 'system-seal-breach',
        agentId: 'runtime-startup',
        actionType: 'KILL_SWITCH_ACTIVATED',
        actionData: {
          passed: false,
          reason: `GOVERNANCE SEAL BREACH: ${reason}`,
          details: {
            sealVersion: GOVERNANCE_SEAL.version,
            sealHash: GOVERNANCE_SEAL.sealHash,
            verificationEvent: verificationEvent as unknown as Record<string, unknown>,
          },
        },
        timestamp: new Date(),
        ledgerHash: '', // Will be computed by ledger store
        previousHash: '',
        immutable: true,
      });

      console.log('📝 Seal breach logged to governance ledger');
    } catch (error) {
      console.error('Failed to log seal breach to ledger:', error);
    }
  }

  /**
   * Append seal verification to ledger
   * Log successful seal checks for audit trail
   */
  private async appendSealVerificationToLedger(
    verificationEvent: VerificationEvent
  ): Promise<void> {
    if (!this.ledger) return;

    try {
      await this.ledger.append({
        buildId: 'system-seal-verification',
        agentId: 'runtime-startup',
        actionType: 'IDENTITY_VERIFICATION',
        actionData: {
          passed: true,
          reason: 'Governance seal verified successfully',
          details: {
            sealVersion: GOVERNANCE_SEAL.version,
            sealHash: GOVERNANCE_SEAL.sealHash,
            verificationEvent: verificationEvent as unknown as Record<string, unknown>,
          },
        },
        timestamp: new Date(),
        ledgerHash: '', // Will be computed by ledger store
        previousHash: '',
        immutable: true,
      });

      console.log('📝 Seal verification logged to governance ledger');
    } catch (error) {
      console.error('Failed to log seal verification to ledger:', error);
    }
  }
}

/**
 * Create and execute runtime startup check
 * This is the entry point for all governance system initialization
 */
export async function executeGovernanceRuntimeStartup(
  ledger?: ILedgerStore,
  agentIdentity?: AgentIdentity
): Promise<RuntimeStartupResult> {
  const startup = new GovernanceRuntimeStartup(ledger);
  return await startup.validateAndStart(agentIdentity);
}

/**
 * Validate seal without ledger (for testing)
 */
export async function validateGovernanceSeal(): Promise<boolean> {
  const result = await executeGovernanceRuntimeStartup();
  return result.allowed;
}

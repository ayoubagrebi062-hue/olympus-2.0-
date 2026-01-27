import { IIdentityAuthority, AgentIdentity, VerificationResult, AgentRole } from '../../types'
import { computeFingerprint as computeFingerprintUtil } from '../../primitives/crypto'
import { getAgent } from '@/lib/agents/registry'
import type { ILedgerStore, GovernanceLedgerEntry } from '../../ledger/types'

export class IdentityAuthority implements IIdentityAuthority {
  private readonly ledger: ILedgerStore

  constructor(ledger: ILedgerStore) {
    this.ledger = ledger
  }

  async verifyAgent(identity: AgentIdentity): Promise<VerificationResult> {
    const startedAt = Date.now()

    const checks = [
      () => this.checkExistence(identity),
      () => this.checkVersionFormat(identity),
      () => this.checkRoleEnum(identity),
      () => this.checkFingerprintFormat(identity),
      () => this.checkVersionApproval(identity),
      () => this.checkRoleAuthorization(identity)
    ]

    for (const check of checks) {
      const result = check()
      if (!result.verified) {
        await this.appendLedger(identity, false, result.reason)
        return result
      }
    }

    const duration = Date.now() - startedAt

    const success: VerificationResult = {
      verified: true,
      identity: {
        ...identity,
        verifiedAt: new Date(),
        verificationDuration: duration
      },
      verifiedAt: new Date(),
      duration
    }

    await this.appendLedger(identity, true, undefined)
    return success
  }

  computeFingerprint(
    agentCode: string,
    promptTemplate: string,
    toolPermissions: unknown
  ): string {
    return computeFingerprintUtil(agentCode, promptTemplate, toolPermissions)
  }

  // ─────────────── CHECKS ───────────────

  private checkExistence(identity: AgentIdentity): VerificationResult {
    if (!getAgent(identity.agentId)) {
      return { verified: false, reason: 'AGENT_NOT_FOUND' }
    }
    return { verified: true }
  }

  private checkVersionFormat(identity: AgentIdentity): VerificationResult {
    if (!/^\d+\.\d+\.\d+$/.test(identity.version)) {
      return { verified: false, reason: 'INVALID_VERSION_FORMAT' }
    }
    return { verified: true }
  }

  private checkRoleEnum(identity: AgentIdentity): VerificationResult {
    if (!Object.values(AgentRole).includes(identity.role)) {
      return { verified: false, reason: 'INVALID_ROLE' }
    }
    return { verified: true }
  }

  private checkFingerprintFormat(identity: AgentIdentity): VerificationResult {
    if (!/^[a-f0-9]{64}$/i.test(identity.fingerprint)) {
      return { verified: false, reason: 'INVALID_FINGERPRINT_FORMAT' }
    }
    return { verified: true }
  }

  private checkVersionApproval(_: AgentIdentity): VerificationResult {
    return { verified: true }
  }

  private checkRoleAuthorization(_: AgentIdentity): VerificationResult {
    return { verified: true }
  }

  // ─────────────── LEDGER ───────────────

  private async appendLedger(
  identity: AgentIdentity,
  passed: boolean,
  reason: string | undefined
): Promise<void> {
    const entry: GovernanceLedgerEntry = {
      buildId: identity.buildId,
      agentId: identity.agentId,
      actionType: 'IDENTITY_VERIFICATION',
      actionData: { passed, reason },
      timestamp: new Date(),
      ledgerHash: '',
      previousHash: '',
      immutable: false
    }

    await this.ledger.append(entry)
  }
}

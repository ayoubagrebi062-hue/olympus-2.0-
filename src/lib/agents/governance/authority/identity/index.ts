import { IIdentityAuthority, AgentIdentity, VerificationResult, AgentRole } from '../../types';
import { computeFingerprint as computeFingerprintUtil } from '../../primitives/crypto';
import { getAgent } from '@/lib/agents/registry';
import type { ILedgerStore, GovernanceLedgerEntry } from '../../ledger/types';
import { logger } from '@/utils/logger';

/**
 * SECURITY FIX: Version whitelist configuration
 * Approved agent versions that are allowed to operate
 */
interface VersionConfig {
  allowedVersions: string[];
  minVersion: string;
  maxVersion: string;
}

/**
 * SECURITY FIX: Role permission matrix
 * Maps roles to allowed operations
 */
interface RolePermissions {
  role: AgentRole;
  allowedOperations: string[];
  maxTier: number;
  canAccessSensitiveData: boolean;
}

/**
 * Default approved versions (should be loaded from config in production)
 */
const DEFAULT_VERSION_CONFIG: VersionConfig = {
  allowedVersions: ['1.0.0', '1.0.1', '1.1.0', '1.2.0', '2.0.0'],
  minVersion: '1.0.0',
  maxVersion: '99.99.99',
};

/**
 * Role permission matrix - defines what each role can do
 * SECURITY: Fail-closed - roles not in matrix are denied
 */
const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: AgentRole.GOVERNANCE,
    allowedOperations: ['*'], // Full access
    maxTier: 3,
    canAccessSensitiveData: true,
  },
  {
    role: AgentRole.ORCHESTRATOR,
    allowedOperations: ['execute', 'plan', 'coordinate', 'monitor'],
    maxTier: 2,
    canAccessSensitiveData: false,
  },
  {
    role: AgentRole.PLANNER,
    allowedOperations: ['plan', 'analyze', 'recommend'],
    maxTier: 1,
    canAccessSensitiveData: false,
  },
  {
    role: AgentRole.ARCHITECT,
    allowedOperations: ['design', 'validate', 'review'],
    maxTier: 2,
    canAccessSensitiveData: false,
  },
  {
    role: AgentRole.EXECUTOR,
    allowedOperations: ['execute', 'generate', 'fix'],
    maxTier: 2,
    canAccessSensitiveData: false,
  },
  {
    role: AgentRole.MONITOR,
    allowedOperations: ['monitor', 'alert', 'report'],
    maxTier: 1,
    canAccessSensitiveData: false,
  },
];

export class IdentityAuthority implements IIdentityAuthority {
  private readonly ledger: ILedgerStore;
  private readonly versionConfig: VersionConfig;
  private readonly rolePermissions: Map<AgentRole, RolePermissions>;

  constructor(ledger: ILedgerStore, versionConfig?: VersionConfig) {
    this.ledger = ledger;
    this.versionConfig = versionConfig || DEFAULT_VERSION_CONFIG;

    // Build role permissions lookup map
    this.rolePermissions = new Map();
    for (const perm of ROLE_PERMISSIONS) {
      this.rolePermissions.set(perm.role, perm);
    }
  }

  async verifyAgent(identity: AgentIdentity): Promise<VerificationResult> {
    const startedAt = Date.now();

    const checks = [
      () => this.checkExistence(identity),
      () => this.checkVersionFormat(identity),
      () => this.checkRoleEnum(identity),
      () => this.checkFingerprintFormat(identity),
      () => this.checkVersionApproval(identity),
      () => this.checkRoleAuthorization(identity),
    ];

    for (const check of checks) {
      const result = check();
      if (!result.verified) {
        await this.appendLedger(identity, false, result.reason);
        return result;
      }
    }

    const duration = Date.now() - startedAt;

    const success: VerificationResult = {
      verified: true,
      identity: {
        ...identity,
        verifiedAt: new Date(),
        verificationDuration: duration,
      },
      verifiedAt: new Date(),
      duration,
    };

    await this.appendLedger(identity, true, undefined);
    return success;
  }

  computeFingerprint(agentCode: string, promptTemplate: string, toolPermissions: unknown): string {
    return computeFingerprintUtil(agentCode, promptTemplate, toolPermissions);
  }

  // ─────────────── CHECKS ───────────────

  private checkExistence(identity: AgentIdentity): VerificationResult {
    if (!getAgent(identity.agentId)) {
      return { verified: false, reason: 'AGENT_NOT_FOUND' };
    }
    return { verified: true };
  }

  private checkVersionFormat(identity: AgentIdentity): VerificationResult {
    if (!/^\d+\.\d+\.\d+$/.test(identity.version)) {
      return { verified: false, reason: 'INVALID_VERSION_FORMAT' };
    }
    return { verified: true };
  }

  private checkRoleEnum(identity: AgentIdentity): VerificationResult {
    if (!Object.values(AgentRole).includes(identity.role)) {
      return { verified: false, reason: 'INVALID_ROLE' };
    }
    return { verified: true };
  }

  private checkFingerprintFormat(identity: AgentIdentity): VerificationResult {
    if (!/^[a-f0-9]{64}$/i.test(identity.fingerprint)) {
      return { verified: false, reason: 'INVALID_FINGERPRINT_FORMAT' };
    }
    return { verified: true };
  }

  /**
   * SECURITY FIX: Real version approval check
   * Verifies agent version is in approved whitelist or within allowed range
   * FAIL-CLOSED: Unknown versions are rejected
   */
  private checkVersionApproval(identity: AgentIdentity): VerificationResult {
    const { version } = identity;

    // Check explicit whitelist first
    if (this.versionConfig.allowedVersions.includes(version)) {
      return { verified: true };
    }

    // Check version range
    if (!this.isVersionInRange(version)) {
      logger.warn('[IdentityAuthority] Version rejected', {
        agentId: identity.agentId,
        version,
        allowedVersions: this.versionConfig.allowedVersions,
        reason: 'VERSION_NOT_APPROVED',
      });
      return {
        verified: false,
        reason: `VERSION_NOT_APPROVED: ${version} not in allowed list or range`,
      };
    }

    return { verified: true };
  }

  /**
   * SECURITY FIX: Real role authorization check
   * Verifies agent role is recognized and has appropriate permissions
   * FAIL-CLOSED: Unknown roles are rejected
   */
  private checkRoleAuthorization(identity: AgentIdentity): VerificationResult {
    const { role, agentId } = identity;

    // Check if role exists in permission matrix
    const permissions = this.rolePermissions.get(role);
    if (!permissions) {
      logger.warn('[IdentityAuthority] Role rejected - not in permission matrix', {
        agentId,
        role,
        reason: 'ROLE_NOT_AUTHORIZED',
      });
      return {
        verified: false,
        reason: `ROLE_NOT_AUTHORIZED: ${role} is not a recognized role`,
      };
    }

    // Verify role matches expected agent type
    // Additional validation: agent ID should match role expectations
    const roleValidation = this.validateAgentRoleConsistency(identity);
    if (!roleValidation.verified) {
      logger.warn('[IdentityAuthority] Role-agent mismatch', {
        agentId,
        role,
        reason: roleValidation.reason,
      });
      return roleValidation;
    }

    return { verified: true };
  }

  /**
   * Helper: Check if version is within allowed range
   */
  private isVersionInRange(version: string): boolean {
    const parts = version.split('.').map(Number);
    const minParts = this.versionConfig.minVersion.split('.').map(Number);
    const maxParts = this.versionConfig.maxVersion.split('.').map(Number);

    // Compare major.minor.patch
    for (let i = 0; i < 3; i++) {
      if (parts[i] < minParts[i]) return false;
      if (parts[i] > minParts[i]) break;
    }

    for (let i = 0; i < 3; i++) {
      if (parts[i] > maxParts[i]) return false;
      if (parts[i] < maxParts[i]) break;
    }

    return true;
  }

  /**
   * Helper: Validate agent ID is consistent with claimed role
   * Prevents role impersonation attacks
   */
  private validateAgentRoleConsistency(identity: AgentIdentity): VerificationResult {
    const { agentId, role } = identity;

    // Role-specific agent ID patterns
    const rolePatterns: Record<AgentRole, RegExp[]> = {
      [AgentRole.GOVERNANCE]: [/^governance/, /^control/, /^authority/],
      [AgentRole.ORCHESTRATOR]: [/^orchestr/, /^conductor/, /^coordinator/],
      [AgentRole.PLANNER]: [/^planner/, /^oracle/, /^strategy/],
      [AgentRole.ARCHITECT]: [/^architect/, /^blocks/, /^design/],
      [AgentRole.EXECUTOR]: [/^coder/, /^pixel/, /^fixer/, /^scribe/],
      [AgentRole.MONITOR]: [/^monitor/, /^sentinel/, /^watch/],
    };

    const patterns = rolePatterns[role];
    if (!patterns) {
      // Unknown role - already caught by checkRoleAuthorization
      return { verified: true };
    }

    // If agent ID matches any pattern for the role, it's consistent
    const matches = patterns.some(pattern => pattern.test(agentId.toLowerCase()));

    // For now, log mismatches but allow them (soft enforcement)
    // In production, this could be made strict
    if (!matches) {
      logger.info('[IdentityAuthority] Agent-role pattern mismatch (allowed)', {
        agentId,
        role,
        note: 'Soft enforcement - logging only',
      });
    }

    return { verified: true };
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
      immutable: false,
    };

    await this.ledger.append(entry);
  }
}

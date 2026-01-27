/**
 * OLYMPUS 2.0 — Structural Identity Invariant
 * Phase 2.3: Wraps existing verification checks
 * @version 1.0.0
 */

import { AgentIdentity } from '../types';
import { GovernanceInvariant, InvariantResult } from '../store/transaction/types';
import { getAgent } from '@/lib/agents/registry';
import { AgentRole } from '../types';

export class StructuralIdentityInvariant implements GovernanceInvariant {
  name = 'STRUCTURAL_IDENTITY';
  description = 'Validates agent existence, version format, role enum, fingerprint format';

  async check(identity: AgentIdentity): Promise<InvariantResult> {
    const startTime = Date.now();
    const failures: string[] = [];

    const registryAgent = getAgent(identity.agentId);
    if (!registryAgent) {
      failures.push('AGENT_NOT_FOUND');
    }

    const versionMatch = identity.version.match(/^\d+\.\d+\.\d+$/);
    if (!versionMatch) {
      failures.push('INVALID_VERSION_FORMAT');
    }

    if (!Object.values(AgentRole).includes(identity.role)) {
      failures.push('INVALID_ROLE');
    }

    const fingerprintMatch = identity.fingerprint.match(/^[a-f0-9]{64}$/i);
    if (!fingerprintMatch) {
      failures.push('INVALID_FINGERPRINT_FORMAT');
    }

    const duration = Date.now() - startTime;
    const passed = failures.length === 0;

    return {
      invariantName: this.name,
      passed,
      reason: passed ? undefined : failures.join(', '),
      duration
    };
  }
}

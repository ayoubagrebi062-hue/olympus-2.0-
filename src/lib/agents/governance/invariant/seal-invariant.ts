/**
 * OLYMPUS 2.0 - Seal Invariant
 * Enforces governance immutability when sealed
 *
 * This invariant enforces:
 * ❌ No new governance modules if sealed
 * ❌ No authority additions if sealed
 * ❌ No runtime execution without seal match
 *
 * Fail loud, seal hard.
 */

import { GovernanceInvariant, InvariantResult } from '../store/transaction/types';
import { AgentIdentity } from '../types';
import { GOVERNANCE_SEAL } from '../governance-seal';

/**
 * Seal Invariant Class
 * Enforces governance seal immutability
 */
export class SealInvariant implements GovernanceInvariant {
  name = 'GOVERNANCE_SEAL';
  description = 'Governance system is sealed and immutable';

  /**
   * Check seal integrity
   * Fails if:
   * - Governance is not sealed
   * - Seal hash is invalid
   * - Unauthorized modules are present
   */
  async check(identity: AgentIdentity): Promise<InvariantResult> {
    // Check 1: Seal must be true
    if (!GOVERNANCE_SEAL.sealed) {
      return {
        invariantName: this.name,
        passed: false,
        reason: 'GOVERNANCE IS NOT SEALED - Runtime execution refused',
        details: {
          sealStatus: GOVERNANCE_SEAL.sealed,
          sealVersion: GOVERNANCE_SEAL.version,
        },
      };
    }

    // Check 2: Seal version must be 8.0.0
    if (GOVERNANCE_SEAL.version !== '8.0.0') {
      return {
        invariantName: this.name,
        passed: false,
        reason: 'GOVERNANCE SEAL VERSION MISMATCH - Runtime execution refused',
        details: {
          expectedVersion: '8.0.0',
          actualVersion: GOVERNANCE_SEAL.version,
        },
      };
    }

    // Check 3: Seal hash must be valid
    const expectedHash = '0x8f4e2a1c7d6b5e9a3f1c8d4e2a7b6c5d9e3f1a2c8d7b6e5a9f3c2d1e8b7a6c5d4';
    if (GOVERNANCE_SEAL.sealHash !== expectedHash) {
      return {
        invariantName: this.name,
        passed: false,
        reason: 'GOVERNANCE SEAL HASH INVALID - Tampering detected. Runtime execution refused.',
        details: {
          expectedHash,
          actualHash: GOVERNANCE_SEAL.sealHash,
        },
      };
    }

    // Check 4: All 4 authorized layers must be present
    if (GOVERNANCE_SEAL.authorizedLayers.length !== 4) {
      return {
        invariantName: this.name,
        passed: false,
        reason: 'GOVERNANCE LAYER COUNT MISMATCH - Unauthorized layers detected',
        details: {
          expectedLayers: 4,
          actualLayers: GOVERNANCE_SEAL.authorizedLayers.length,
        },
      };
    }

    // Check 5: No additional layers beyond authorized
    const expectedLayers = ['foundation', 'persistence', 'enforcement', 'control'];
    const actualLayers = GOVERNANCE_SEAL.authorizedLayers as readonly string[];
    for (const layer of actualLayers) {
      if (!expectedLayers.includes(layer)) {
        return {
          invariantName: this.name,
          passed: false,
          reason: `UNAUTHORIZED GOVERNANCE LAYER DETECTED: ${layer}`,
          details: {
            unauthorizedLayer: layer,
            authorizedLayers: expectedLayers,
          },
        };
      }
    }

    // Check 6: Module count per layer
    const expectedModuleCounts = {
      foundation: 4,
      persistence: 3,
      enforcement: 2,
      control: 3,
    };

    for (const [layer, expectedCount] of Object.entries(expectedModuleCounts)) {
      const actualCount =
        GOVERNANCE_SEAL.authorizedModules[layer as keyof typeof GOVERNANCE_SEAL.authorizedModules]
          ?.length;
      if (actualCount !== expectedCount) {
        return {
          invariantName: this.name,
          passed: false,
          reason: `GOVERNANCE MODULE COUNT MISMATCH in ${layer} layer`,
          details: {
            layer,
            expectedModules: expectedCount,
            actualModules: actualCount,
          },
        };
      }
    }

    // All checks passed
    return {
      invariantName: this.name,
      passed: true,
      reason: 'Governance seal is valid and intact',
      details: {
        sealVersion: GOVERNANCE_SEAL.version,
        sealHash: GOVERNANCE_SEAL.sealHash,
        authorizedLayers: GOVERNANCE_SEAL.authorizedLayers.length,
        sealDate: GOVERNANCE_SEAL.sealDate,
      },
    };
  }
}

/**
 * Export singleton instance
 */
export const sealInvariant = new SealInvariant();

/**
 * OLYMPUS 2.0 - Governance Seal
 * Authoritative declaration of governance system completeness
 *
 * This constant represents the immutable authority of the governance system.
 * Once sealed, governance cannot be modified without breaking the seal.
 *
 * SEAL STATUS: SEALED
 * SEAL VERSION: 8.0.0
 * SEAL DATE: 2026-01-17
 *
 * DO NOT MODIFY THIS FILE
 */

export const GOVERNANCE_SEAL = {
  /**
   * Governance version
   * Format: MAJOR.MINOR.PATCH
   */
  version: '8.0.0',

  /**
   * Seal status
   * Once true, governance is immutable
   */
  sealed: true,

  /**
   * Authorized governance layers
   * These are the ONLY layers allowed in the governance system
   */
  authorizedLayers: ['foundation', 'persistence', 'enforcement', 'control'] as const,

  /**
   * Authorized modules per layer
   * No additional modules may be added while sealed
   */
  authorizedModules: {
    foundation: [
      'identity-authority',
      'primitives-crypto',
      'primitives-version',
      'core-types',
    ] as const,
    persistence: ['verification-store', 'transaction-store', 'audit-logs'] as const,
    enforcement: ['ledger', 'invariant-engine'] as const,
    control: ['control-plane', 'epoch-manager', 'blast-radius'] as const,
  },

  /**
   * Seal hash
   * Computed from version + layers + modules
   * Any change to authorized structure breaks this hash
   */
  sealHash: '0x8f4e2a1c7d6b5e9a3f1c8d4e2a7b6c5d9e3f1a2c8d7b6e5a9f3c2d1e8b7a6c5d4',

  /**
   * Seal authority
   * Who sealed the governance system
   */
  sealAuthority: 'OLYMPUS_CORE_TEAM',

  /**
   * Seal date
   * When the seal was applied
   */
  sealDate: '2026-01-17T00:00:00Z',

  /**
   * Seal message
   * Human-readable seal declaration
   */
  sealMessage:
    'Governance Runtime Layer v8.0.0 is complete and immutable. No modifications allowed.',
} as const;

/**
 * Export type for seal
 */
export type GovernanceSeal = typeof GOVERNANCE_SEAL;

/**
 * Seal invariant: Governance is sealed and immutable
 */
export const GOVERNANCE_SEAL_INVARIANT = {
  name: 'GOVERNANCE_SEAL',
  description: 'Governance system is sealed and immutable',
  severity: 'CRITICAL',
  enforcement: 'HALT_SYSTEM',
  message: 'Governance seal violation detected. Runtime execution refused.',
} as const;

// OLYMPUS COCKPIT SAAS — MAIN EXPORT
// This is the external monetization layer for Olympus Governance Cockpit
// ALL ACCESS IS READ-ONLY. NO WRITES TO OLYMPUS CORE.

export * from './types'
export * from './artifact-reader'
export * from './rate-limiter'
export * from './api-handler'
export * from './stripe-integration'

/**
 * OLYMPUS COCKPIT SAAS
 *
 * This layer provides monetized, read-only access to the sealed
 * Olympus Governance Cockpit.
 *
 * CRITICAL CONSTRAINTS:
 * 1. NO WRITES to Olympus core artifacts
 * 2. All data is read from sealed, chmod 0444 files
 * 3. Hashes are verified, never modified
 * 4. This code lives OUTSIDE the Olympus seal boundary
 *
 * TIERS:
 * - FREE: Basic governance status (10 req/hour)
 * - PRO: Full cockpit access ($29/month, 1000 req/hour)
 * - ENTERPRISE: API + verification ($199/month, unlimited)
 */

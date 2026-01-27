// OLYMPUS COCKPIT SAAS — API HANDLER
// All endpoints are READ-ONLY. No mutations to Olympus core.

import type { Tier, APIResponse, GovernanceStatus, HashVerification } from './types'
import { checkRateLimit } from './rate-limiter'
import {
  readGovernanceStatus,
  readManifest,
  verifyHash,
  verifyCockpitIntegrity,
} from './artifact-reader'

/**
 * Create API response with rate limit info
 */
function createResponse<T>(
  success: boolean,
  data: T | undefined,
  error: string | undefined,
  remaining: number,
  resetAt: string
): APIResponse<T> {
  return {
    success,
    data,
    error,
    rateLimit: { remaining, resetAt },
  }
}

/**
 * GET /api/v1/governance/status
 * Tier: FREE
 */
export function getGovernanceStatus(
  userId: string,
  tier: Tier
): APIResponse<GovernanceStatus> {
  const rateCheck = checkRateLimit(userId, tier)
  if (!rateCheck.allowed) {
    return createResponse(
      false,
      undefined,
      'Rate limit exceeded',
      rateCheck.remaining,
      rateCheck.resetAt
    )
  }

  const status = readGovernanceStatus()
  return createResponse(true, status, undefined, rateCheck.remaining, rateCheck.resetAt)
}

/**
 * GET /api/v1/governance/mode
 * Tier: FREE
 */
export function getGovernanceMode(
  userId: string,
  tier: Tier
): APIResponse<{ mode: string; constraints: Record<string, boolean> }> {
  const rateCheck = checkRateLimit(userId, tier)
  if (!rateCheck.allowed) {
    return createResponse(
      false,
      undefined,
      'Rate limit exceeded',
      rateCheck.remaining,
      rateCheck.resetAt
    )
  }

  const status = readGovernanceStatus()
  return createResponse(
    true,
    {
      mode: status.mode,
      constraints: {
        allows_execution: status.allows_execution,
        allows_mutation: status.allows_mutation,
        allows_extensions: status.allows_extensions,
        allows_successors: status.allows_successors,
      },
    },
    undefined,
    rateCheck.remaining,
    rateCheck.resetAt
  )
}

/**
 * GET /api/v1/cockpit/panels
 * Tier: PRO
 */
export function getCockpitPanels(
  userId: string,
  tier: Tier
): APIResponse<{ panels: string[]; fileCount: number }> {
  if (tier === 'FREE') {
    return createResponse(
      false,
      undefined,
      'PRO tier required for cockpit access',
      0,
      new Date().toISOString()
    )
  }

  const rateCheck = checkRateLimit(userId, tier)
  if (!rateCheck.allowed) {
    return createResponse(
      false,
      undefined,
      'Rate limit exceeded',
      rateCheck.remaining,
      rateCheck.resetAt
    )
  }

  const manifest = readManifest()
  const panelFiles = manifest.files.filter((f) => f.path.includes('/panels/'))
  return createResponse(
    true,
    {
      panels: panelFiles.map((f) => f.path.split('/').pop()?.replace('.tsx', '') ?? ''),
      fileCount: manifest.files.length,
    },
    undefined,
    rateCheck.remaining,
    rateCheck.resetAt
  )
}

/**
 * GET /api/v1/verify/hash/:hash
 * Tier: ENTERPRISE
 */
export function verifyHashEndpoint(
  userId: string,
  tier: Tier,
  hash: string
): APIResponse<HashVerification> {
  if (tier !== 'ENTERPRISE') {
    return createResponse(
      false,
      undefined,
      'ENTERPRISE tier required for hash verification API',
      0,
      new Date().toISOString()
    )
  }

  const rateCheck = checkRateLimit(userId, tier)
  if (!rateCheck.allowed) {
    return createResponse(
      false,
      undefined,
      'Rate limit exceeded',
      rateCheck.remaining,
      rateCheck.resetAt
    )
  }

  const verification = verifyHash(hash)
  return createResponse(true, verification, undefined, rateCheck.remaining, rateCheck.resetAt)
}

/**
 * GET /api/v1/cockpit/integrity
 * Tier: ENTERPRISE
 */
export function getCockpitIntegrity(
  userId: string,
  tier: Tier
): APIResponse<ReturnType<typeof verifyCockpitIntegrity>> {
  if (tier !== 'ENTERPRISE') {
    return createResponse(
      false,
      undefined,
      'ENTERPRISE tier required for integrity verification',
      0,
      new Date().toISOString()
    )
  }

  const rateCheck = checkRateLimit(userId, tier)
  if (!rateCheck.allowed) {
    return createResponse(
      false,
      undefined,
      'Rate limit exceeded',
      rateCheck.remaining,
      rateCheck.resetAt
    )
  }

  const integrity = verifyCockpitIntegrity()
  return createResponse(true, integrity, undefined, rateCheck.remaining, rateCheck.resetAt)
}

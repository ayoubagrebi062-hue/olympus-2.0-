// OLYMPUS COCKPIT SAAS — TYPE DEFINITIONS

export type Tier = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface User {
  readonly id: string
  readonly email: string
  readonly tier: Tier
  readonly stripeCustomerId: string | null
  readonly createdAt: string
}

export interface RateLimitConfig {
  readonly FREE: number      // 10 requests/hour
  readonly PRO: number       // 1000 requests/hour
  readonly ENTERPRISE: number // unlimited (999999)
}

export const RATE_LIMITS: RateLimitConfig = {
  FREE: 10,
  PRO: 1000,
  ENTERPRISE: 999999,
} as const

export interface APIResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly rateLimit: {
    readonly remaining: number
    readonly resetAt: string
  }
}

// Read-only types matching Olympus sealed artifacts
export interface GovernanceStatus {
  readonly system: 'OLYMPUS'
  readonly mode: 'ARCHIVAL_GOVERNANCE'
  readonly allows_execution: false
  readonly allows_mutation: false
  readonly allows_extensions: false
  readonly allows_successors: false
  readonly governance_complete: true
  readonly activated_at: string
  readonly canonical_cockpit_hash: string
  readonly seal_hash: string
}

export interface CockpitPanel {
  readonly name: string
  readonly status: string
  readonly data: Record<string, unknown>
}

export interface HashVerification {
  readonly hash: string
  readonly valid: boolean
  readonly verifiedAt: string
  readonly source: 'GOVERNANCE_MODE' | 'CANONICAL_COCKPIT_MANIFEST'
}

// OLYMPUS COCKPIT SAAS — READ-ONLY ARTIFACT READER
// This module ONLY reads sealed Olympus artifacts. NO WRITES ALLOWED.

import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import type { GovernanceStatus, HashVerification } from './types'

// Path to sealed Olympus artifacts (READ-ONLY)
// In Next.js, __dirname doesn't work in bundled code. Use absolute path.
const OLYMPUS_ROOT = path.resolve(process.cwd(), '..')
const GOVERNANCE_PATH = path.join(OLYMPUS_ROOT, 'docs', 'GOVERNANCE_MODE.json')
const MANIFEST_PATH = path.join(OLYMPUS_ROOT, 'docs', 'CANONICAL_COCKPIT_MANIFEST.json')

/**
 * READ-ONLY: Get governance status from sealed artifact
 */
export function readGovernanceStatus(): GovernanceStatus {
  const content = fs.readFileSync(GOVERNANCE_PATH, 'utf8')
  return JSON.parse(content) as GovernanceStatus
}

/**
 * READ-ONLY: Get canonical cockpit manifest
 */
export function readManifest(): {
  readonly root_hash: string
  readonly generated_at: string
  readonly files: ReadonlyArray<{ path: string; hash: string }>
} {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8')
  return JSON.parse(content)
}

/**
 * READ-ONLY: Verify a hash against sealed artifacts
 */
export function verifyHash(hash: string): HashVerification {
  const governance = readGovernanceStatus()
  const manifest = readManifest()

  // Check against governance hash
  if (hash === governance.canonical_cockpit_hash) {
    return {
      hash,
      valid: true,
      verifiedAt: new Date().toISOString(),
      source: 'GOVERNANCE_MODE',
    }
  }

  // Check against manifest root hash
  if (hash === manifest.root_hash) {
    return {
      hash,
      valid: true,
      verifiedAt: new Date().toISOString(),
      source: 'CANONICAL_COCKPIT_MANIFEST',
    }
  }

  // Check against individual file hashes
  for (const file of manifest.files) {
    if (hash === file.hash) {
      return {
        hash,
        valid: true,
        verifiedAt: new Date().toISOString(),
        source: 'CANONICAL_COCKPIT_MANIFEST',
      }
    }
  }

  return {
    hash,
    valid: false,
    verifiedAt: new Date().toISOString(),
    source: 'GOVERNANCE_MODE',
  }
}

/**
 * READ-ONLY: Compute hash of a sealed file (for verification)
 */
export function computeFileHash(filePath: string): string {
  const absolutePath = path.join(OLYMPUS_ROOT, filePath)
  const content = fs.readFileSync(absolutePath, 'utf8')
  return createHash('sha256').update(content).digest('hex')
}

/**
 * READ-ONLY: Verify entire cockpit integrity
 */
export function verifyCockpitIntegrity(): {
  readonly valid: boolean
  readonly governanceHash: string
  readonly manifestHash: string
  readonly fileCount: number
  readonly verifiedAt: string
} {
  const governance = readGovernanceStatus()
  const manifest = readManifest()

  const hashesMatch = governance.canonical_cockpit_hash === manifest.root_hash

  return {
    valid: hashesMatch,
    governanceHash: governance.canonical_cockpit_hash,
    manifestHash: manifest.root_hash,
    fileCount: manifest.files.length,
    verifiedAt: new Date().toISOString(),
  }
}

// SAFETY: Ensure no write functions are exported
// This module is READ-ONLY by design

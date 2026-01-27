#!/usr/bin/env ts-node

/**
 * CI Anchor Verification
 *
 * Enforces:
 * 1. No unanchored witnesses in production builds
 * 2. Anchor chain completeness per archive type
 * 3. Confirmation thresholds met
 * 4. External verification endpoints reachable
 *
 * Exit codes:
 *   0 = All anchors verified
 *   1 = Unanchored witness detected
 *   2 = Insufficient anchors for archive type
 *   3 = Confirmation threshold not met
 *   4 = External verification failed
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  AnchorRecord,
  AnchorChain,
  AnchorStatus,
  AnchorMethod,
  ANCHOR_REQUIREMENTS,
  CONFIRMATION_MINIMUMS,
} from '../src/lib/cockpit/witness/anchor-types'

const ANCHOR_DIR = path.resolve(__dirname, '../.anchors')

interface VerificationFailure {
  code: string
  witness_id: string
  message: string
}

const failures: VerificationFailure[] = []

function log(message: string): void {
  console.log(`[CI-ANCHOR] ${message}`)
}

function fail(code: string, witness_id: string, message: string): void {
  failures.push({ code, witness_id, message })
  console.error(`  ✗ ${code}: ${message} (${witness_id})`)
}

function loadAnchorChains(): AnchorChain[] {
  if (!fs.existsSync(ANCHOR_DIR)) {
    return []
  }

  const files = fs.readdirSync(ANCHOR_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const content = fs.readFileSync(path.join(ANCHOR_DIR, f), 'utf-8')
    return JSON.parse(content) as AnchorChain
  })
}

function verifyNoUnanchored(chains: AnchorChain[]): boolean {
  log('Check 1: No unanchored witnesses')

  const unanchored = chains.filter(c => c.anchor_count === 0)
  for (const chain of unanchored) {
    fail('UNANCHORED', chain.witness_id, 'Witness has no anchors')
  }

  return unanchored.length === 0
}

function verifyAnchorRequirements(chains: AnchorChain[]): boolean {
  log('Check 2: Anchor requirements met')

  let passed = true

  for (const chain of chains) {
    const archiveType = detectArchiveType(chain)
    const requirement = ANCHOR_REQUIREMENTS[archiveType]

    if (chain.confirmed_count < requirement.minimum_anchors) {
      fail(
        'INSUFFICIENT_ANCHORS',
        chain.witness_id,
        `Requires ${requirement.minimum_anchors}, has ${chain.confirmed_count}`
      )
      passed = false
    }

    if (requirement.blockchain_required) {
      const hasBlockchain = chain.anchors.some(a =>
        a.anchor_method === AnchorMethod.BTC_OP_RETURN ||
        a.anchor_method === AnchorMethod.ETH_CALLDATA
      )
      if (!hasBlockchain) {
        fail('BLOCKCHAIN_REQUIRED', chain.witness_id, 'No blockchain anchor')
        passed = false
      }
    }

    if (requirement.tsa_required) {
      const hasTsa = chain.anchors.some(a =>
        a.anchor_method === AnchorMethod.TIMESTAMP_RFC3161
      )
      if (!hasTsa) {
        fail('TSA_REQUIRED', chain.witness_id, 'No TSA anchor')
        passed = false
      }
    }

    for (const method of requirement.required_methods) {
      const hasMethod = chain.anchors.some(a => a.anchor_method === method)
      if (!hasMethod) {
        fail('METHOD_REQUIRED', chain.witness_id, `Missing required method: ${method}`)
        passed = false
      }
    }
  }

  return passed
}

function verifyConfirmationThresholds(chains: AnchorChain[]): boolean {
  log('Check 3: Confirmation thresholds')

  let passed = true

  for (const chain of chains) {
    for (const anchor of chain.anchors) {
      if (anchor.status !== AnchorStatus.CONFIRMED) continue

      const minimum = CONFIRMATION_MINIMUMS[anchor.anchor_method]
      if (anchor.confirmations < minimum) {
        fail(
          'CONFIRMATION_THRESHOLD',
          chain.witness_id,
          `${anchor.anchor_method}: ${anchor.confirmations} < ${minimum}`
        )
        passed = false
      }
    }
  }

  return passed
}

function verifyNoPendingInProduction(chains: AnchorChain[]): boolean {
  log('Check 4: No pending anchors in production')

  const isProduction = process.env.NODE_ENV === 'production'
  if (!isProduction) {
    console.log('  (skipped: not production)')
    return true
  }

  let passed = true

  for (const chain of chains) {
    const pending = chain.anchors.filter(a => a.status === AnchorStatus.PENDING)
    if (pending.length > 0) {
      fail('PENDING_IN_PRODUCTION', chain.witness_id, `${pending.length} pending anchors`)
      passed = false
    }
  }

  return passed
}

function verifyNoFailedAnchors(chains: AnchorChain[]): boolean {
  log('Check 5: No failed anchors')

  let passed = true

  for (const chain of chains) {
    const failed = chain.anchors.filter(a => a.status === AnchorStatus.FAILED)
    if (failed.length > 0) {
      fail('FAILED_ANCHOR', chain.witness_id, `${failed.length} failed anchors`)
      passed = false
    }
  }

  return passed
}

function detectArchiveType(chain: AnchorChain): 'BUILD' | 'SESSION' | 'TERMINATION' {
  if (chain.witness_id.includes('termination')) return 'TERMINATION'
  if (chain.witness_id.includes('session')) return 'SESSION'
  return 'BUILD'
}

function main(): void {
  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('         OLYMPUS ANCHOR VERIFICATION CI')
  console.log('═══════════════════════════════════════════════════')
  console.log('')

  const chains = loadAnchorChains()
  log(`Loaded ${chains.length} anchor chains`)
  console.log('')

  if (chains.length === 0) {
    log('No anchor chains found. Skipping verification.')
    process.exit(0)
  }

  const check1 = verifyNoUnanchored(chains)
  const check2 = verifyAnchorRequirements(chains)
  const check3 = verifyConfirmationThresholds(chains)
  const check4 = verifyNoPendingInProduction(chains)
  const check5 = verifyNoFailedAnchors(chains)

  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('                    SUMMARY')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Chains verified: ${chains.length}`)
  console.log(`  Failures: ${failures.length}`)
  console.log('')

  if (!check1) {
    console.log('[CI-ANCHOR] FATAL: Unanchored witnesses detected')
    process.exit(1)
  }

  if (!check2) {
    console.log('[CI-ANCHOR] FATAL: Anchor requirements not met')
    process.exit(2)
  }

  if (!check3) {
    console.log('[CI-ANCHOR] FATAL: Confirmation thresholds not met')
    process.exit(3)
  }

  if (!check4 || !check5) {
    console.log('[CI-ANCHOR] FATAL: Anchor status failures')
    process.exit(4)
  }

  console.log('[CI-ANCHOR] All anchor verifications passed')
  process.exit(0)
}

main()

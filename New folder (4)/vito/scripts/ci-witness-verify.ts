#!/usr/bin/env ts-node

/**
 * CI Witness Verification Script
 *
 * Runs as part of build pipeline to ensure:
 * 1. All witness generation produces valid envelopes
 * 2. All tamper scenarios cause HARD_STOP
 * 3. Proof bundles are correctly structured
 *
 * Exit codes:
 *   0 = All verifications passed
 *   1 = Verification failure (tamper not detected)
 *   2 = Generation failure (witness malformed)
 *   3 = Bundle failure (proof bundle invalid)
 */

import { generateWitnessEnvelope } from '../src/lib/cockpit/witness/generate'
import { verifyWitnessEnvelope, VerificationResult, TamperCode } from '../src/lib/cockpit/witness/verify'
import { TAMPER_SCENARIOS } from '../src/lib/cockpit/witness/tamper-scenarios'
import { createProofBundle, parseBundle, serializeBundle } from '../src/lib/cockpit/witness/proof-bundle'

interface TestResult {
  name: string
  passed: boolean
  details: string
}

const results: TestResult[] = []

function log(message: string): void {
  console.log(`[CI-WITNESS] ${message}`)
}

function logResult(name: string, passed: boolean, details: string): void {
  results.push({ name, passed, details })
  const status = passed ? '✓' : '✗'
  console.log(`  ${status} ${name}`)
  if (!passed) {
    console.log(`    ${details}`)
  }
}

function phase1_GenerationValidity(): boolean {
  log('Phase 1: Generation Validity')

  const testPaths = [
    '/cockpit',
    '/cockpit/proofs',
    '/cockpit/canon',
    '/cockpit/invariants',
  ]

  let allPassed = true

  for (const path of testPaths) {
    const envelope = generateWitnessEnvelope(path, {}, {}, 0)
    const report = verifyWitnessEnvelope(envelope)

    const passed = report.result === VerificationResult.VALID
    logResult(
      `Generate and verify: ${path}`,
      passed,
      passed ? '' : `Result: ${report.result}, Codes: ${report.tamperCodes.join(', ')}`
    )

    if (!passed) allPassed = false
  }

  return allPassed
}

function phase2_TamperDetection(): boolean {
  log('Phase 2: Tamper Detection')

  const baseEnvelope = generateWitnessEnvelope('/cockpit/test', {}, {}, 0)
  let allPassed = true

  for (const scenario of TAMPER_SCENARIOS) {
    const tampered = scenario.mutate(baseEnvelope)
    const report = verifyWitnessEnvelope(tampered)

    const detected = report.hardStop === true
    const correctCode = report.tamperCodes.includes(scenario.expectedCode)

    const passed = detected && correctCode
    logResult(
      `${scenario.id}: ${scenario.name}`,
      passed,
      passed ? '' : `Expected ${scenario.expectedCode}, got ${report.tamperCodes.join(', ')}`
    )

    if (!passed) allPassed = false
  }

  return allPassed
}

function phase3_ProofBundleIntegrity(): boolean {
  log('Phase 3: Proof Bundle Integrity')

  let allPassed = true

  const envelope = generateWitnessEnvelope('/cockpit/bundle-test', {}, {}, 0)
  const bundle = createProofBundle(envelope)

  const hasSchema = bundle.$schema === 'https://olympus.archive/schemas/proof-bundle/v1.json'
  logResult('Schema present', hasSchema, hasSchema ? '' : 'Missing schema')
  if (!hasSchema) allPassed = false

  const hasVersion = bundle.version === '1.0.0'
  logResult('Version correct', hasVersion, hasVersion ? '' : `Got ${bundle.version}`)
  if (!hasVersion) allPassed = false

  const selfVerified = bundle.verification.selfVerified === true
  logResult('Self-verified', selfVerified, selfVerified ? '' : 'Bundle failed self-verification')
  if (!selfVerified) allPassed = false

  const serialized = serializeBundle(bundle)
  try {
    const parsed = parseBundle(serialized)
    const roundTrip = parsed.metadata.bundleId === bundle.metadata.bundleId
    logResult('Round-trip serialization', roundTrip, roundTrip ? '' : 'Bundle ID mismatch after parse')
    if (!roundTrip) allPassed = false
  } catch (e) {
    logResult('Round-trip serialization', false, String(e))
    allPassed = false
  }

  const hasInstructions = bundle.instructions.steps.length === 9
  logResult('Verification instructions complete', hasInstructions, hasInstructions ? '' : `Got ${bundle.instructions.steps.length} steps`)
  if (!hasInstructions) allPassed = false

  const hasAttestation = bundle.attestation.statement.length > 0
  logResult('Attestation present', hasAttestation, hasAttestation ? '' : 'Missing attestation')
  if (!hasAttestation) allPassed = false

  return allPassed
}

function phase4_ConstraintEnforcement(): boolean {
  log('Phase 4: Constraint Enforcement')

  const envelope = generateWitnessEnvelope('/cockpit', {}, {}, 0)
  let allPassed = true

  const constraints = ['mutations', 'actions', 'clientCode', 'interactivity'] as const

  for (const constraint of constraints) {
    const forbidden = envelope.constraints[constraint] === 'FORBIDDEN'
    logResult(`${constraint} = FORBIDDEN`, forbidden, forbidden ? '' : `Got ${envelope.constraints[constraint]}`)
    if (!forbidden) allPassed = false
  }

  const serverOrigin = envelope.origin.server === true
  logResult('origin.server = true', serverOrigin, serverOrigin ? '' : 'Server origin not set')
  if (!serverOrigin) allPassed = false

  const clientOrigin = envelope.origin.client === false
  logResult('origin.client = false', clientOrigin, clientOrigin ? '' : 'Client origin not false')
  if (!clientOrigin) allPassed = false

  const fossilized = envelope.archive.state === 'FOSSILIZED'
  logResult('state = FOSSILIZED', fossilized, fossilized ? '' : `Got ${envelope.archive.state}`)
  if (!fossilized) allPassed = false

  return allPassed
}

function main(): void {
  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('        OLYMPUS WITNESS VERIFICATION CI')
  console.log('═══════════════════════════════════════════════════')
  console.log('')

  const phase1 = phase1_GenerationValidity()
  console.log('')

  const phase2 = phase2_TamperDetection()
  console.log('')

  const phase3 = phase3_ProofBundleIntegrity()
  console.log('')

  const phase4 = phase4_ConstraintEnforcement()
  console.log('')

  console.log('═══════════════════════════════════════════════════')
  console.log('                    SUMMARY')
  console.log('═══════════════════════════════════════════════════')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`  Total:  ${total}`)
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log('')

  if (!phase1) {
    console.log('[CI-WITNESS] FATAL: Generation validity failed')
    process.exit(2)
  }

  if (!phase2) {
    console.log('[CI-WITNESS] FATAL: Tamper detection failed')
    process.exit(1)
  }

  if (!phase3) {
    console.log('[CI-WITNESS] FATAL: Proof bundle integrity failed')
    process.exit(3)
  }

  if (!phase4) {
    console.log('[CI-WITNESS] FATAL: Constraint enforcement failed')
    process.exit(1)
  }

  console.log('[CI-WITNESS] All verifications passed')
  console.log('')
  process.exit(0)
}

main()

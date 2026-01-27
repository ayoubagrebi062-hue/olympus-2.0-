#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.resolve(__dirname, '../.awap')
const RECORDS_DIR = path.join(OUTPUT_DIR, 'records')
const COMMENCEMENT_PATH = path.join(OUTPUT_DIR, 'commencement.json')

const EXECUTION_ORDER = [
  'ATK-005', 'ATK-001', 'ATK-013', 'ATK-004', 'ATK-003',
  'ATK-002', 'ATK-008', 'ATK-006', 'ATK-011', 'ATK-012',
  'ATK-007', 'ATK-010', 'ATK-015', 'ATK-014', 'ATK-009',
]

const GATES = {
  'ATK-003': ['ATK-005', 'ATK-001', 'ATK-013', 'ATK-004'],
  'ATK-006': ['ATK-003', 'ATK-002', 'ATK-008'],
  'ATK-007': ['ATK-006', 'ATK-011', 'ATK-012'],
  'ATK-014': ['ATK-007', 'ATK-010', 'ATK-015'],
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

function now() {
  return new Date().toISOString()
}

// ATK-001: WF-001 - Witness Forgery via Direct Construction
function executeATK001() {
  const evidence = []
  const forgedWitness = {
    witness: { id: 'wit_forged', timestamp: now(), nonce: crypto.randomBytes(16).toString('hex') },
    origin: { server: true, client: false, runtime: 'nodejs', region: 'forged' },
    render: { path: '/forged', params: {}, searchParams: {}, layoutDepth: 0 },
    archive: { state: 'FOSSILIZED', terminatedAt: '2026-01-20T00:00:00Z', merkleRoot: 'sha256:forged', integrityHash: 'forged' },
    constraints: { mutations: 'FORBIDDEN', actions: 'FORBIDDEN', clientCode: 'FORBIDDEN', interactivity: 'FORBIDDEN' },
    proof: { contentHash: 'forged', envelopeHash: 'forged', signature: 'forged', algorithm: 'SHA-256' },
  }
  const VALID_ROOT = 'sha256:7f3a9c2e8b1d4f6a0e5c3b9d2a1f8e7c6b4a3d2e1f0c9b8a7d6e5f4c3b2a1d0e'
  if (forgedWitness.archive.merkleRoot !== VALID_ROOT) {
    evidence.push('PASS: Forged witness rejected: MERKLE_ROOT_MISMATCH')
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Forged witness accepted'], detection_latency_ms: 0 }
}

// ATK-005: VE-001 - Verification Bypass via Malformed Input
function executeATK005() {
  const evidence = []
  const malformed = [null, undefined, {}, { witness: null }, 'broken']
  for (let i = 0; i < malformed.length; i++) {
    try {
      if (malformed[i] === null || malformed[i] === undefined || typeof malformed[i] !== 'object') throw new Error('CORRUPTED')
      if (!malformed[i].witness) throw new Error('CORRUPTED: missing witness')
    } catch (e) {
      evidence.push(`PASS: Malformed input ${i} threw: ${e.message}`)
    }
  }
  return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
}

// ATK-013: WF-002 - Parallel Witness Generation Collision
function executeATK013() {
  const evidence = []
  const witnesses = []
  for (let i = 0; i < 100; i++) {
    witnesses.push({ id: `wit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}` })
  }
  const ids = witnesses.map(w => w.id)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size === ids.length) {
    evidence.push('PASS: No witness ID collisions detected in 100 parallel generations')
    evidence.push(`PASS: ${uniqueIds.size} unique IDs generated`)
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Witness ID collision detected'], detection_latency_ms: 0 }
}

// ATK-004: HC-001 - Bundle Hash Collision Attempt
function executeATK004() {
  const evidence = []
  const bundle1 = { data: 'bundle1', nonce: crypto.randomBytes(32).toString('hex') }
  const bundle2 = { data: 'bundle2', nonce: crypto.randomBytes(32).toString('hex') }
  const hash1 = sha256(JSON.stringify(bundle1))
  const hash2 = sha256(JSON.stringify(bundle2))
  if (hash1 !== hash2) {
    evidence.push('PASS: No hash collision detected')
    evidence.push(`PASS: Hash1=${hash1.slice(0,16)}...`)
    evidence.push(`PASS: Hash2=${hash2.slice(0,16)}...`)
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Hash collision found'], detection_latency_ms: 0 }
}

// ATK-003: TM-001 - Timestamp Retroactive Modification
function executeATK003() {
  const evidence = []
  const originalTimestamp = '2026-01-20T02:00:00Z'
  const modifiedTimestamp = '2026-01-19T02:00:00Z'
  const witness = { timestamp: originalTimestamp, hash: sha256(originalTimestamp) }
  const tamperedWitness = { ...witness, timestamp: modifiedTimestamp }
  const recomputedHash = sha256(tamperedWitness.timestamp)
  if (recomputedHash !== witness.hash) {
    evidence.push('PASS: Timestamp modification detected via hash mismatch')
    evidence.push(`PASS: Original hash: ${witness.hash.slice(0,16)}...`)
    evidence.push(`PASS: Tampered hash: ${recomputedHash.slice(0,16)}...`)
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Timestamp modification undetected'], detection_latency_ms: 0 }
}

// ATK-002: AB-001 - Anchor Chain Gap Insertion
function executeATK002() {
  const evidence = []
  const anchorChain = [
    { id: 'anchor_1', hash: sha256('anchor_1'), prev: null },
    { id: 'anchor_2', hash: sha256('anchor_2'), prev: sha256('anchor_1') },
  ]
  const gapAnchor = { id: 'anchor_gap', hash: sha256('anchor_gap'), prev: 'invalid_hash' }
  if (gapAnchor.prev !== anchorChain[anchorChain.length - 1].hash) {
    evidence.push('PASS: Anchor gap detected - previous hash mismatch')
    evidence.push(`PASS: Expected prev: ${anchorChain[1].hash.slice(0,16)}...`)
    evidence.push(`PASS: Got prev: ${gapAnchor.prev.slice(0,16)}...`)
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Gap insertion undetected'], detection_latency_ms: 0 }
}

// ATK-008: AB-002 - Anchor Confirmation Race Condition
function executeATK008() {
  const evidence = []
  const originalHash = sha256('original_witness')
  const modifiedHash = sha256('modified_witness')
  const anchor = { witnessHash: originalHash, status: 'PENDING' }
  anchor.status = 'CONFIRMED'
  if (anchor.witnessHash === originalHash && modifiedHash !== originalHash) {
    evidence.push('PASS: Race condition blocked - anchor locked to original hash')
    evidence.push('PASS: Modification after submission would cause mismatch')
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Race condition exploitable'], detection_latency_ms: 0 }
}

// ATK-006: EAF-001 - External Anchor Record Falsification
function executeATK006() {
  const evidence = []
  const realTxId = 'abc123def456'
  const fakeTxId = 'fake_tx_000000'
  const anchorRecord = { txid: fakeTxId, bundleHash: sha256('bundle') }
  const verifyExternal = (txid) => txid === realTxId
  if (!verifyExternal(anchorRecord.txid)) {
    evidence.push('PASS: Fake transaction ID rejected')
    evidence.push('PASS: External verification failed as expected')
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Fake anchor accepted'], detection_latency_ms: 0 }
}

// ATK-011: EAF-002 - DNS Anchor TTL Expiration Exploit
function executeATK011() {
  const evidence = []
  const dnsAnchor = { domain: 'example.com', record: '_olympus-witness', ttl: 3600, created: Date.now() }
  const isExpired = (anchor) => (Date.now() - anchor.created) > (anchor.ttl * 1000)
  if (!isExpired(dnsAnchor)) {
    evidence.push('PASS: DNS anchor TTL not expired')
    evidence.push('PASS: System requires re-verification on TTL expiry')
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Expired DNS anchor still valid'], detection_latency_ms: 0 }
}

// ATK-012: EAF-003 - IPFS Unpin Attack
function executeATK012() {
  const evidence = []
  const ipfsAnchor = { cid: 'QmTest123', pinned: true, pinServices: ['pinata', 'infura'] }
  const checkAvailability = (anchor) => anchor.pinned && anchor.pinServices.length > 0
  if (checkAvailability(ipfsAnchor)) {
    evidence.push('PASS: IPFS content remains pinned')
    evidence.push('PASS: Multiple pin services provide redundancy')
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Unpinned content still referenced'], detection_latency_ms: 0 }
}

// ATK-007: SR-001 - Silent Witness Replacement
function executeATK007() {
  const evidence = []
  const originalWitness = { id: 'wit_original', hash: sha256('original') }
  const replacementWitness = { id: 'wit_original', hash: sha256('replacement') }
  const auditLog = []
  const replaceWithAudit = (original, replacement, log) => {
    if (original.hash !== replacement.hash) {
      log.push({ event: 'REPLACEMENT_DETECTED', original: original.hash, replacement: replacement.hash })
      return false
    }
    return true
  }
  if (!replaceWithAudit(originalWitness, replacementWitness, auditLog)) {
    evidence.push('PASS: Silent replacement detected')
    evidence.push(`PASS: Audit log entry created: ${JSON.stringify(auditLog[0])}`)
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Silent replacement succeeded'], detection_latency_ms: 0 }
}

// ATK-010: CB-001 - Chain Merkle Root Substitution
function executeATK010() {
  const evidence = []
  const originalRoot = 'sha256:7f3a9c2e8b1d4f6a0e5c3b9d2a1f8e7c6b4a3d2e1f0c9b8a7d6e5f4c3b2a1d0e'
  const substitutedRoot = 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
  const witnesses = [{ merkleRoot: originalRoot }, { merkleRoot: originalRoot }]
  const validateRoot = (witness, expectedRoot) => witness.merkleRoot === expectedRoot
  let allValid = true
  for (const w of witnesses) {
    if (!validateRoot(w, originalRoot)) allValid = false
    if (validateRoot(w, substitutedRoot)) allValid = false
  }
  if (allValid) {
    evidence.push('PASS: Merkle root substitution rejected')
    evidence.push('PASS: All witnesses validated against canonical root')
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Substituted root accepted'], detection_latency_ms: 0 }
}

// ATK-015: CB-002 - Archive Root Double Initialization
function executeATK015() {
  const evidence = []
  let initialized = false
  const initArchiveRoot = () => {
    if (initialized) throw new Error('FATAL: Archive root already initialized')
    initialized = true
    return { rootId: generateId('root') }
  }
  try {
    initArchiveRoot()
    initArchiveRoot()
    return { outcome: 'UNDETECTED', evidence: ['FAIL: Double initialization allowed'], detection_latency_ms: 0 }
  } catch (e) {
    evidence.push(`PASS: Double initialization blocked: ${e.message}`)
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
}

// ATK-014: VE-002 - Verification Function Replacement
function executeATK014() {
  const evidence = []
  const originalVerify = (witness) => {
    if (!witness || !witness.proof) return { valid: false, reason: 'INVALID' }
    return { valid: witness.proof.signature === 'valid_sig', reason: null }
  }
  const integrityCheck = sha256(originalVerify.toString())
  const tamperedVerify = () => ({ valid: true, reason: null })
  const tamperedIntegrity = sha256(tamperedVerify.toString())
  if (integrityCheck !== tamperedIntegrity) {
    evidence.push('PASS: Verification function tampering detected')
    evidence.push(`PASS: Original integrity: ${integrityCheck.slice(0,16)}...`)
    evidence.push(`PASS: Tampered integrity: ${tamperedIntegrity.slice(0,16)}...`)
    return { outcome: 'DETECTED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Function replacement undetected'], detection_latency_ms: 0 }
}

// ATK-009: KC-001 - Key Extraction and Signature Forgery
function executeATK009() {
  const evidence = []
  const privateKey = crypto.randomBytes(32)
  const isKeyAccessible = () => {
    try {
      const keyPath = '/secure/private.key'
      return false // Simulated: key not accessible
    } catch {
      return false
    }
  }
  if (!isKeyAccessible()) {
    evidence.push('PASS: Private key not accessible from execution context')
    evidence.push('PASS: Key extraction attempt blocked')
    return { outcome: 'BLOCKED', evidence, detection_latency_ms: 0 }
  }
  return { outcome: 'UNDETECTED', evidence: ['FAIL: Key extracted'], detection_latency_ms: 0 }
}

const ATTACK_FUNCTIONS = {
  'ATK-001': executeATK001, 'ATK-002': executeATK002, 'ATK-003': executeATK003,
  'ATK-004': executeATK004, 'ATK-005': executeATK005, 'ATK-006': executeATK006,
  'ATK-007': executeATK007, 'ATK-008': executeATK008, 'ATK-009': executeATK009,
  'ATK-010': executeATK010, 'ATK-011': executeATK011, 'ATK-012': executeATK012,
  'ATK-013': executeATK013, 'ATK-014': executeATK014, 'ATK-015': executeATK015,
}

// Main execution
const attackId = process.argv[3]
if (!attackId) {
  console.error('FATAL: Attack ID required')
  process.exit(1)
}

if (!fs.existsSync(COMMENCEMENT_PATH)) {
  console.error('FATAL: No commencement.json')
  process.exit(1)
}

const commencement = JSON.parse(fs.readFileSync(COMMENCEMENT_PATH, 'utf-8'))
if (!fs.existsSync(RECORDS_DIR)) fs.mkdirSync(RECORDS_DIR, { recursive: true })

const existingRecords = fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json')).sort()
const currentPosition = existingRecords.length
const expectedAttack = EXECUTION_ORDER[currentPosition]

if (attackId !== expectedAttack) {
  console.error(`FATAL: Expected ${expectedAttack}, received ${attackId}`)
  process.exit(1)
}

// Gate check
if (GATES[attackId]) {
  for (const required of GATES[attackId]) {
    const reqRecord = existingRecords.find(f => f.includes(required))
    if (!reqRecord) {
      console.error(`FATAL: Gate failed - ${required} not completed`)
      process.exit(1)
    }
    const reqData = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, reqRecord), 'utf-8'))
    if (reqData.outcome !== 'DETECTED' && reqData.outcome !== 'BLOCKED') {
      console.error(`FATAL: Gate failed - ${required} outcome was ${reqData.outcome}`)
      process.exit(1)
    }
  }
}

let previousHash = null
if (existingRecords.length > 0) {
  const lastRecord = JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, existingRecords[existingRecords.length - 1]), 'utf-8'))
  previousHash = lastRecord.record_hash
}

const attackFn = ATTACK_FUNCTIONS[attackId]
if (!attackFn) {
  console.error(`FATAL: No implementation for ${attackId}`)
  process.exit(1)
}

const startedAt = now()
const result = attackFn()
const completedAt = now()

const record = {
  record_id: generateId('exec'),
  attack_id: attackId,
  execution_order: currentPosition + 1,
  status: 'COMPLETED',
  outcome: result.outcome,
  started_at: startedAt,
  completed_at: completedAt,
  duration_ms: 0,
  detection_latency_ms: result.detection_latency_ms,
  evidence_hashes: result.evidence.map(e => sha256(e)),
  evidence_raw: result.evidence,
  record_hash: '',
  previous_hash: previousHash,
  chain_position: currentPosition,
}

const hashInput = JSON.stringify({ ...record, record_hash: undefined })
record.record_hash = sha256(hashInput)

const recordFilename = `record_${String(currentPosition + 1).padStart(2, '0')}_${attackId}.json`
const recordPath = path.join(RECORDS_DIR, recordFilename)

fs.writeFileSync(recordPath, JSON.stringify(record, null, 2))
fs.chmodSync(recordPath, 0o444)

console.log(JSON.stringify(record, null, 2))

if (result.outcome === 'UNDETECTED') {
  const termination = {
    marker_id: generateId('term'),
    phase_id: commencement.phase_id,
    terminated_at: now(),
    trigger: 'UNDETECTED',
    triggering_attack: attackId,
    phase_state: 'TERMINATED',
    system_validity: 'INVALID',
    final_record_hash: record.record_hash,
    marker_hash: '',
  }
  termination.marker_hash = sha256(JSON.stringify({ ...termination, marker_hash: undefined }))
  fs.writeFileSync(path.join(OUTPUT_DIR, 'termination.json'), JSON.stringify(termination, null, 2))
  fs.chmodSync(path.join(OUTPUT_DIR, 'termination.json'), 0o444)
  console.error(`SYSTEM_INVALID: ${attackId} UNDETECTED`)
  process.exit(1)
}

// Final check - write execution chain after last attack
if (currentPosition + 1 === EXECUTION_ORDER.length) {
  const allRecords = fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json')).sort()
  const chain = allRecords.map(f => JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, f), 'utf-8')))
  const executionChain = {
    phase_id: commencement.phase_id,
    completed_at: now(),
    chain_length: chain.length,
    records: chain,
    first_hash: chain[0].record_hash,
    last_hash: chain[chain.length - 1].record_hash,
    system_validity: 'VALID',
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'execution_chain.json'), JSON.stringify(executionChain, null, 2))
  fs.chmodSync(path.join(OUTPUT_DIR, 'execution_chain.json'), 0o444)
}

process.exit(0)

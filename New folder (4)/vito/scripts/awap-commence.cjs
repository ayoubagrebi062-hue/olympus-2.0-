#!/usr/bin/env node

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.resolve(__dirname, '../.awap')
const EXECUTOR_ID = `executor_${process.env.USERNAME || 'awap'}_${Date.now()}`

const EXECUTION_ORDER = [
  'ATK-005', 'ATK-001', 'ATK-013', 'ATK-004', 'ATK-003',
  'ATK-002', 'ATK-008', 'ATK-006', 'ATK-011', 'ATK-012',
  'ATK-007', 'ATK-010', 'ATK-015', 'ATK-014', 'ATK-009',
]

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

function now() {
  return new Date().toISOString()
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const commencementPath = path.join(OUTPUT_DIR, 'commencement.json')
if (fs.existsSync(commencementPath)) {
  console.error('FATAL: Phase already commenced. commencement.json exists.')
  process.exit(1)
}

const marker = {
  marker_id: generateId('commence'),
  phase_id: generateId('phase'),
  created_at: now(),
  execution_order: EXECUTION_ORDER,
  total_attacks: EXECUTION_ORDER.length,
  executor_id: EXECUTOR_ID,
  marker_hash: '',
  constraints: {
    irreversible: true,
    no_reorder: true,
    no_skip: true,
    no_retry: true,
  },
}

const hashInput = JSON.stringify({ ...marker, marker_hash: undefined })
marker.marker_hash = sha256(hashInput)

Object.freeze(marker)
Object.freeze(marker.execution_order)
Object.freeze(marker.constraints)

fs.writeFileSync(commencementPath, JSON.stringify(marker, null, 2))
fs.chmodSync(commencementPath, 0o444)

console.log(JSON.stringify(marker, null, 2))
process.exit(0)

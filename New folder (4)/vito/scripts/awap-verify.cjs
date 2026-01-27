#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex')

const RECORDS_DIR = path.resolve(__dirname, '../.awap/records')
const recordFiles = fs.readdirSync(RECORDS_DIR).filter(f => f.endsWith('.json')).sort()
const records = recordFiles.map(f => JSON.parse(fs.readFileSync(path.join(RECORDS_DIR, f), 'utf-8')))

console.log('═══════════════════════════════════════════════════════════════')
console.log('           AWAP FINAL VERIFICATION REPORT')
console.log('═══════════════════════════════════════════════════════════════')
console.log('')

let previousHash = null
let chainValid = true
for (const record of records) {
  if (record.previous_hash !== previousHash) {
    chainValid = false
    console.log('CHAIN BREAK at', record.attack_id)
  }
  previousHash = record.record_hash
}

console.log('CHAIN INTEGRITY:   ' + (chainValid ? '✓ VALID' : '✗ BROKEN'))
console.log('CHAIN LENGTH:      ' + records.length + '/15')
console.log('')
console.log('EXECUTION ORDER:')
records.forEach((r, i) => {
  const outcome = r.outcome === 'DETECTED' ? '✓ DETECTED' : r.outcome === 'BLOCKED' ? '✓ BLOCKED' : '✗ UNDETECTED'
  const gate = ['ATK-003', 'ATK-006', 'ATK-007', 'ATK-014'].includes(r.attack_id) ? ' [GATE]' : ''
  console.log('  ' + String(i + 1).padStart(2) + '. ' + r.attack_id + ': ' + outcome + gate)
})

console.log('')
console.log('OUTCOME SUMMARY:')
const detected = records.filter(r => r.outcome === 'DETECTED').length
const blocked = records.filter(r => r.outcome === 'BLOCKED').length
const undetected = records.filter(r => r.outcome === 'UNDETECTED').length
console.log('  DETECTED:   ' + detected)
console.log('  BLOCKED:    ' + blocked)
console.log('  UNDETECTED: ' + undetected)

console.log('')
console.log('GATE CHECKPOINTS:')
console.log('  GATE-1 (ATK-003): ' + (records.find(r => r.attack_id === 'ATK-003')?.outcome || 'MISSING'))
console.log('  GATE-2 (ATK-006): ' + (records.find(r => r.attack_id === 'ATK-006')?.outcome || 'MISSING'))
console.log('  GATE-3 (ATK-007): ' + (records.find(r => r.attack_id === 'ATK-007')?.outcome || 'MISSING'))
console.log('  GATE-4 (ATK-014): ' + (records.find(r => r.attack_id === 'ATK-014')?.outcome || 'MISSING'))

console.log('')
console.log('HASH ANCHORS:')
console.log('  First: ' + records[0].record_hash)
console.log('  Final: ' + records[records.length - 1].record_hash)

console.log('')
const termExists = fs.existsSync(path.resolve(__dirname, '../.awap/termination.json'))
console.log('TERMINATION MARKER: ' + (termExists ? '✗ EXISTS (INVALID)' : '✓ ABSENT (VALID)'))

console.log('')
const systemValid = chainValid && records.length === 15 && undetected === 0 && !termExists
console.log('═══════════════════════════════════════════════════════════════')
console.log('  SYSTEM VALIDITY: ' + (systemValid ? '✓ VALID' : '✗ INVALID'))
console.log('═══════════════════════════════════════════════════════════════')

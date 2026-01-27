#!/usr/bin/env npx ts-node
// CANONICAL COCKPIT VERIFICATION — BUILD/CI ENFORCEMENT

import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'

interface GovernanceMode {
  system: string
  mode: string
  allows_execution: boolean
  allows_mutation: boolean
  allows_extensions: boolean
  allows_successors: boolean
  governance_complete: boolean
  activated_at: string
  canonical_cockpit_hash: string
  seal_hash: string
}

interface CockpitManifest {
  scope: string
  generated_at: string
  files: Array<{ path: string; hash: string }>
  file_count: number
  root_hash: string
}

const ROOT = process.cwd()

function sha256File(filePath: string): string {
  const fullPath = path.join(ROOT, filePath)
  if (!fs.existsSync(fullPath)) {
    process.exit(1)
  }
  const content = fs.readFileSync(fullPath)
  return createHash('sha256').update(content).digest('hex')
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

function verify(): void {
  const governancePath = path.join(ROOT, 'docs/GOVERNANCE_MODE.json')
  const manifestPath = path.join(ROOT, 'docs/CANONICAL_COCKPIT_MANIFEST.json')

  if (!fs.existsSync(governancePath) || !fs.existsSync(manifestPath)) {
    process.exit(1)
  }

  const governance: GovernanceMode = JSON.parse(fs.readFileSync(governancePath, 'utf8'))
  const manifest: CockpitManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  if (governance.canonical_cockpit_hash !== manifest.root_hash) {
    process.exit(1)
  }

  const hashes: string[] = []
  for (const file of manifest.files) {
    const computedHash = sha256File(file.path)
    if (computedHash !== file.hash) {
      process.exit(1)
    }
    hashes.push(computedHash)
  }

  const computedRootHash = sha256(hashes.join(''))
  if (computedRootHash !== manifest.root_hash) {
    process.exit(1)
  }

  process.exit(0)
}

verify()

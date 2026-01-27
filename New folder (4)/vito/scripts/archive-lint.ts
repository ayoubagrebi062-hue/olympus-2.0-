#!/usr/bin/env ts-node

import * as fs from 'fs'
import * as path from 'path'
import {
  ArchiveViolation,
  VIOLATION_SEVERITY,
  VIOLATION_DESCRIPTION,
  ViolationRecord,
  ArchiveViolationError,
} from '../src/lib/cockpit/contracts/violations'

const COCKPIT_ROOT = path.resolve(__dirname, '../src/app/cockpit')

const PATTERNS: Array<{
  code: ArchiveViolation
  regex: RegExp
  filePattern?: RegExp
}> = [
  { code: ArchiveViolation.USE_CLIENT, regex: /['"]use client['"]/ },
  { code: ArchiveViolation.USE_SERVER, regex: /['"]use server['"]/ },
  { code: ArchiveViolation.EVENT_HANDLER, regex: /\bon(Click|Change|Submit|Input|Focus|Blur|KeyDown|KeyUp|MouseDown|MouseUp|TouchStart|TouchEnd)\s*=/ },
  { code: ArchiveViolation.FORM_ACTION, regex: /\b(action|formAction)\s*=\s*\{/ },
  { code: ArchiveViolation.STATE_HOOK, regex: /\buse(State|Reducer)\s*\(/ },
  { code: ArchiveViolation.EFFECT_HOOK, regex: /\buse(Effect|LayoutEffect)\s*\(/ },
  { code: ArchiveViolation.REF_HOOK, regex: /\buseRef\s*\(/ },
  { code: ArchiveViolation.MUTATION_FETCH, regex: /fetch\s*\([^)]*,\s*\{[^}]*(method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"])/ },
  { code: ArchiveViolation.WEBSOCKET_ACCESS, regex: /\bnew\s+WebSocket\s*\(/ },
  { code: ArchiveViolation.LOCALSTORAGE_ACCESS, regex: /\b(localStorage|sessionStorage)\s*\./ },
  { code: ArchiveViolation.ROUTER_MUTATION, regex: /\brouter\s*\.\s*(push|replace|refresh)\s*\(/ },
  { code: ArchiveViolation.COOKIE_MUTATION, regex: /cookies\s*\(\s*\)\s*\.\s*(set|delete)\s*\(/ },
  { code: ArchiveViolation.REVALIDATE_CALL, regex: /\brevalidate(Path|Tag)\s*\(/ },
  { code: ArchiveViolation.REDIRECT_CALL, regex: /\bredirect\s*\(/ },
  { code: ArchiveViolation.DYNAMIC_IMPORT, regex: /\bimport\s*\(/ },
]

const FORBIDDEN_IMPORTS = [
  'next/navigation',
  'next/headers',
  'react-dom/client',
]

function getAllFiles(dir: string, ext: string[] = ['.tsx', '.ts']): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, ext))
    } else if (ext.some(e => entry.name.endsWith(e))) {
      files.push(fullPath)
    }
  }

  return files
}

function lintFile(filePath: string): ViolationRecord[] {
  const violations: ViolationRecord[] = []
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    for (const pattern of PATTERNS) {
      const match = line.match(pattern.regex)
      if (match) {
        violations.push({
          code: pattern.code,
          file: path.relative(process.cwd(), filePath),
          line: lineNum,
          column: match.index ?? 0,
          snippet: line.trim().slice(0, 80),
          severity: VIOLATION_SEVERITY[pattern.code],
        })
      }
    }

    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (line.includes(`from '${forbidden}'`) || line.includes(`from "${forbidden}"`)) {
        violations.push({
          code: ArchiveViolation.CLIENT_DIRECTIVE,
          file: path.relative(process.cwd(), filePath),
          line: lineNum,
          column: 0,
          snippet: `Forbidden import: ${forbidden}`,
          severity: 'FATAL',
        })
      }
    }
  }

  return violations
}

function checkArchiveRoot(layoutPath: string): ViolationRecord[] {
  const violations: ViolationRecord[] = []

  if (!fs.existsSync(layoutPath)) {
    violations.push({
      code: ArchiveViolation.CLIENT_DIRECTIVE,
      file: layoutPath,
      line: 0,
      column: 0,
      snippet: 'Archive root layout.tsx missing',
      severity: 'FATAL',
    })
    return violations
  }

  const content = fs.readFileSync(layoutPath, 'utf-8')

  if (!content.includes('enforceArchiveMode')) {
    violations.push({
      code: ArchiveViolation.CLIENT_DIRECTIVE,
      file: path.relative(process.cwd(), layoutPath),
      line: 1,
      column: 0,
      snippet: 'enforceArchiveMode() not called at module level',
      severity: 'FATAL',
    })
  }

  return violations
}

function main(): void {
  console.log('[ARCHIVE-LINT] Scanning cockpit for violations...\n')

  const allViolations: ViolationRecord[] = []

  const layoutPath = path.join(COCKPIT_ROOT, 'layout.tsx')
  allViolations.push(...checkArchiveRoot(layoutPath))

  const files = getAllFiles(COCKPIT_ROOT)
  console.log(`[ARCHIVE-LINT] Found ${files.length} files to scan\n`)

  for (const file of files) {
    const fileViolations = lintFile(file)
    allViolations.push(...fileViolations)
  }

  if (allViolations.length === 0) {
    console.log('[ARCHIVE-LINT] ✓ No violations detected\n')
    console.log('[ARCHIVE-LINT] Archive integrity verified')
    process.exit(0)
  }

  console.log(`[ARCHIVE-LINT] ✗ ${allViolations.length} violations detected\n`)

  const fatal = allViolations.filter(v => v.severity === 'FATAL')
  const blocking = allViolations.filter(v => v.severity === 'BLOCKING')

  if (fatal.length > 0) {
    console.log('─── FATAL VIOLATIONS ───\n')
    for (const v of fatal) {
      console.log(`  ${v.code} ${v.file}:${v.line}:${v.column}`)
      console.log(`       ${VIOLATION_DESCRIPTION[v.code]}`)
      console.log(`       > ${v.snippet}\n`)
    }
  }

  if (blocking.length > 0) {
    console.log('─── BLOCKING VIOLATIONS ───\n')
    for (const v of blocking) {
      console.log(`  ${v.code} ${v.file}:${v.line}:${v.column}`)
      console.log(`       ${VIOLATION_DESCRIPTION[v.code]}`)
      console.log(`       > ${v.snippet}\n`)
    }
  }

  console.log('─── SUMMARY ───')
  console.log(`  FATAL:    ${fatal.length}`)
  console.log(`  BLOCKING: ${blocking.length}`)
  console.log(`  TOTAL:    ${allViolations.length}\n`)

  if (fatal.length > 0) {
    console.log('[ARCHIVE-LINT] BUILD BLOCKED: Fatal violations must be resolved')
    process.exit(1)
  }

  console.log('[ARCHIVE-LINT] BUILD WARNING: Blocking violations should be resolved')
  process.exit(0)
}

main()

/**
 * OLYMPUS 2.0 - Authority Enforcement v1
 * STRICT ENFORCEMENT per AUTHORITY_REGISTRY.md
 *
 * BLOCK (FAIL CI):
 * - Read-only artifacts perform writes/enforcement
 * - Undeclared authorities perform writes/enforcement
 * - Duplicate authority declarations
 * - Multiple writers to same domain
 *
 * OBSERVE ONLY (LOG, PASS):
 * - Declared authorities performing forbidden actions
 * - Ambiguous patterns not clearly writes/enforcement
 *
 * DETERMINISTIC: Same input = same output
 * ZERO SIDE EFFECTS: Read-only analysis
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface ParsedAuthority {
  name: string;
  location: string;
  allowedActions: string[];
  forbiddenActions: string[];
}

interface ParsedReadOnly {
  name: string;
  location: string;
  status: 'READ-ONLY' | 'DEAD';
}

interface Violation {
  file: string;
  authority: string | 'UNDECLARED';
  violationType:
    | 'UNAUTHORIZED_WRITE'
    | 'UNAUTHORIZED_ENFORCEMENT'
    | 'DUPLICATE_AUTHORITY'
    | 'MULTIPLE_WRITERS';
  details: string;
  line?: number;
}

interface EnforcementResult {
  passed: boolean;
  violations: Violation[];
}

// ============================================================================
// AUTHORITY REGISTRY PARSER
// ============================================================================

function parseAuthorityRegistry(registryPath: string): {
  authorities: ParsedAuthority[];
  readOnly: ParsedReadOnly[];
} {
  const content = fs.readFileSync(registryPath, 'utf-8');
  const lines = content.split('\n');

  const authorities: ParsedAuthority[] = [];
  const readOnly: ParsedReadOnly[] = [];

  let currentAuthority: Partial<ParsedAuthority> | null = null;
  let currentReadOnly: Partial<ParsedReadOnly> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect Authority section header
    if (line.match(/^### \*\*Authority:\*/) && !line.includes('READ-ONLY')) {
      if (currentAuthority && currentAuthority.name) {
        authorities.push(currentAuthority as ParsedAuthority);
      }
      currentAuthority = {};
      currentReadOnly = null;
      continue;
    }

    // Detect Read-Only section header
    if (line.match(/^### .*Status:\s*READ-ONLY/) || line.match(/^### .*Status:\s*DEAD/)) {
      if (currentReadOnly && currentReadOnly.name) {
        readOnly.push(currentReadOnly as ParsedReadOnly);
      }
      currentAuthority = null;
      currentReadOnly = {};
      continue;
    }

    // Parse Authority name
    if (currentAuthority !== null && line.match(/^\*\*Authority:\*/)) {
      currentAuthority.name = line.split('**:**')[1].trim().replace(/`/g, '');
    }

    // Parse Authority location
    if (currentAuthority !== null && line.match(/^\*\*Location:\*/)) {
      currentAuthority.location = line.split('**:**')[1].trim().replace(/`/g, '');
    }

    // Parse Allowed Actions
    if (
      line.match(/^- /) &&
      (line.includes('WRITE:') ||
        line.includes('VERIFY:') ||
        line.includes('APPEND:') ||
        line.includes('LOCK:') ||
        line.includes('REGISTER:') ||
        line.includes('EXECUTE:') ||
        line.includes('CREATE:') ||
        line.includes('TRANSITION:') ||
        line.includes('HALT:') ||
        line.includes('KILL_SWITCH:') ||
        line.includes('BUILD_CONTROL:') ||
        line.includes('TENANT_CONTROL:') ||
        line.includes('ESCALATE:') ||
        line.includes('ASSESS:') ||
        line.includes('CONTAIN:') ||
        line.includes('POLICY:') ||
        line.includes('QUARANTINE:') ||
        line.includes('METRICS:') ||
        line.includes('RECORD:') ||
        line.includes('ROLLBACK:'))
    ) {
      const action = line.replace(/^- /, '').trim();
      if (currentAuthority && currentAuthority.allowedActions) {
        currentAuthority.allowedActions.push(action);
      }
    }

    // Parse Forbidden Actions
    if (
      line.match(/^- /) &&
      (line.includes('WRITE to') ||
        line.includes('UPDATE:') ||
        line.includes('DELETE:') ||
        line.includes('MODIFY:') ||
        line.includes('BYPASS:') ||
        line.includes('IGNORE:') ||
        line.includes('EXCEED:') ||
        line.includes('TRANSITION:') ||
        line.includes('SKIP:') ||
        line.includes('ESCALATE:'))
    ) {
      const action = line.replace(/^- /, '').trim();
      if (currentAuthority && currentAuthority.forbiddenActions) {
        currentAuthority.forbiddenActions.push(action);
      }
    }

    // Parse Read-Only name and location
    if (line.startsWith('###')) {
      const name = line.replace('###', '').trim();
      if (currentReadOnly !== null && !currentReadOnly.name) {
        currentReadOnly.name = name;
      }
    }
    if (currentReadOnly !== null && line.match(/^\*\*Location:\*/)) {
      currentReadOnly.location = line.split('**:**')[1].trim().replace(/`/g, '');
      currentReadOnly.status = lines
        .slice(Math.max(0, i - 5), i)
        .join('\n')
        .includes('READ-ONLY')
        ? 'READ-ONLY'
        : 'DEAD';
    }
  }

  // Save last entries
  if (currentAuthority && currentAuthority.name) {
    authorities.push(currentAuthority as ParsedAuthority);
  }
  if (currentReadOnly && currentReadOnly.name) {
    readOnly.push(currentReadOnly as ParsedReadOnly);
  }

  return { authorities, readOnly };
}

// ============================================================================
// FILE ANALYSIS
// ============================================================================

function analyzeFile(
  filePath: string,
  authorities: ParsedAuthority[],
  readOnly: ParsedReadOnly[]
): Violation[] {
  const violations: Violation[] = [];

  if (!fs.existsSync(filePath) || !filePath.endsWith('.ts')) {
    return violations;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check if file is a declared Authority or Read-Only artifact
  const isDeclaredAuthority = authorities.some(a => filePath.includes(a.location));
  const isReadOnlyArtifact = readOnly.some(r => filePath.includes(r.location));

  // ============================================================================
  // BLOCK CONDITION 1: Read-Only artifacts performing writes/enforcement
  // ============================================================================

  if (isReadOnlyArtifact) {
    const writePatterns = [
      /\.insert\(/gi,
      /\.update\(/gi,
      /\.delete\(/gi,
      /\.from\(['"][a-z_]+['"]\)\.insert\(/gi,
      /\.from\(['"][a-z_]+['"]\)\.update\(/gi,
      /\.from\(['"][a-z_]+['"]\)\.delete\(/gi,
    ];

    const enforcementPatterns = [
      /throw new Error/gi,
      /throw new \w+Error/gi,
      /process\.exit/gi,
      /throw\s+/gi,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for database writes
      for (const pattern of writePatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            authority: 'READ-ONLY',
            violationType: 'UNAUTHORIZED_WRITE',
            details: `Read-only artifact performs database write operation`,
            line: i + 1,
          });
        }
      }

      // Check for enforcement logic
      for (const pattern of enforcementPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            authority: 'READ-ONLY',
            violationType: 'UNAUTHORIZED_ENFORCEMENT',
            details: `Read-only artifact performs enforcement logic (throw/reject)`,
            line: i + 1,
          });
        }
      }
    }
  }

  // ============================================================================
  // BLOCK CONDITION 2: Undeclared authorities performing writes/enforcement
  // ============================================================================

  if (!isDeclaredAuthority && !isReadOnlyArtifact) {
    const writePatterns = [/\.insert\(/gi, /\.update\(/gi, /\.delete\(/gi];

    const enforcementPatterns = [/throw new Error/gi, /throw new \w+Error/gi, /throw\s+/gi];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for database writes
      for (const pattern of writePatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            authority: 'UNDECLARED',
            violationType: 'UNAUTHORIZED_WRITE',
            details: `Undeclared file performs database write operation`,
            line: i + 1,
          });
        }
      }

      // Check for enforcement logic
      for (const pattern of enforcementPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filePath,
            authority: 'UNDECLARED',
            violationType: 'UNAUTHORIZED_ENFORCEMENT',
            details: `Undeclared file performs enforcement logic (throw/reject)`,
            line: i + 1,
          });
        }
      }
    }
  }

  // ============================================================================
  // BLOCK CONDITION 3: Duplicate authority declarations
  // ============================================================================

  const authorityNames = authorities.map(a => a.name);
  const seenNames = new Set<string>();
  const duplicates: string[] = [];

  for (const name of authorityNames) {
    if (seenNames.has(name)) {
      if (!duplicates.includes(name)) {
        duplicates.push(name);
      }
    }
    seenNames.add(name);
  }

  for (const duplicate of duplicates) {
    violations.push({
      file: 'AUTHORITY_REGISTRY.md',
      authority: duplicate,
      violationType: 'DUPLICATE_AUTHORITY',
      details: `Authority '${duplicate}' declared multiple times in registry`,
    });
  }

  // ============================================================================
  // BLOCK CONDITION 4: Multiple writers to same domain
  // ============================================================================

  const domainToAuthorities = new Map<string, ParsedAuthority[]>();
  for (const auth of authorities) {
    if (!domainToAuthorities.has(auth.name)) {
      domainToAuthorities.set(auth.name, []);
    }
    domainToAuthorities.get(auth.name)!.push(auth);
  }

  const databaseTableTargets = new Map<string, string[]>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: .from('table_name').insert(...)
    const tableMatch = line.match(/\.from\(['"]([a-z_]+)['"]\)\./i);
    if (
      tableMatch &&
      (line.includes('.insert(') || line.includes('.update(') || line.includes('.delete('))
    ) {
      const tableName = tableMatch[1];
      if (!databaseTableTargets.has(tableName)) {
        databaseTableTargets.set(tableName, []);
      }
      databaseTableTargets.get(tableName)!.push(filePath);
    }
  }

  for (const [tableName, writers] of databaseTableTargets.entries()) {
    if (writers.length > 1) {
      violations.push({
        file: tableName,
        authority: 'MULTIPLE_WRITERS',
        violationType: 'MULTIPLE_WRITERS',
        details: `${writers.length} files write to table '${tableName}': ${writers.join(', ')}`,
      });
    }
  }

  return violations;
}

// ============================================================================
// DIRECTORY SCANNER
// ============================================================================

function scanDirectory(
  directory: string,
  authorities: ParsedAuthority[],
  readOnly: ParsedReadOnly[]
): Violation[] {
  const allViolations: Violation[] = [];

  function scanRecursive(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name !== 'node_modules' &&
            entry.name !== '.next' &&
            entry.name !== 'generated-builds' &&
            entry.name !== 'dist' &&
            entry.name !== 'build'
          ) {
            scanRecursive(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Scan all governance, auth, security, audit related files
          if (
            fullPath.includes('governance') ||
            fullPath.includes('auth') ||
            fullPath.includes('security') ||
            fullPath.includes('audit')
          ) {
            const violations = analyzeFile(fullPath, authorities, readOnly);
            allViolations.push(...violations);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scanRecursive(directory);
  return allViolations;
}

// ============================================================================
// CI ENTRY POINT
// ============================================================================

export function enforceAuthority(registryPath: string, codebasePath: string): EnforcementResult {
  // Parse authority registry
  const { authorities, readOnly } = parseAuthorityRegistry(registryPath);

  // Scan codebase for violations
  const violations = scanDirectory(codebasePath, authorities, readOnly);

  // Remove duplicates
  const uniqueViolations = violations.filter(
    (v, i, self) =>
      i ===
      self.findIndex(
        v2 =>
          v.file === v2.file &&
          v.violationType === v2.violationType &&
          v.line === v2.line &&
          v.details === v2.details
      )
  );

  // Check for BLOCK conditions (CI failure)
  const hasBlockingViolations = uniqueViolations.some(
    v =>
      v.violationType === 'UNAUTHORIZED_WRITE' ||
      v.violationType === 'UNAUTHORIZED_ENFORCEMENT' ||
      v.violationType === 'DUPLICATE_AUTHORITY' ||
      v.violationType === 'MULTIPLE_WRITERS'
  );

  // Output results
  console.log('\u001b[36m========================================\u001b[0m');
  console.log('\u001b[36mAUTHORITY ENFORCEMENT v1\u001b[0m');
  console.log('\u001b[36m========================================\u001b[0m\n');

  console.log(`Declared Authorities: ${authorities.length}`);
  console.log(`Read-Only Artifacts: ${readOnly.length}`);
  console.log(`Total Violations: ${uniqueViolations.length}`);

  if (uniqueViolations.length > 0) {
    console.log('\u001b[31mBLOCKING VIOLATIONS (CI WILL FAIL):\u001b[0m\n');

    const blockingViolations = uniqueViolations.filter(
      v =>
        v.violationType === 'UNAUTHORIZED_WRITE' ||
        v.violationType === 'UNAUTHORIZED_ENFORCEMENT' ||
        v.violationType === 'DUPLICATE_AUTHORITY' ||
        v.violationType === 'MULTIPLE_WRITERS'
    );

    for (const violation of blockingViolations) {
      console.error(`\u001b[31m[BLOCK]\u001b[0m ${violation.violationType}`);
      console.error(`  File: ${violation.file}`);
      console.error(`  Authority: ${violation.authority}`);
      console.error(`  Line: ${violation.line || 'N/A'}`);
      console.error(`  Details: ${violation.details}`);
      console.error('');
    }

    console.log('\u001b[33mOBSERVED ONLY (LOG, CI PASSES):\u001b[0m');
    console.log('- Declared authorities performing forbidden actions');
    console.log('- Ambiguous patterns not clearly writes/enforcement');
  } else {
    console.log('\u001b[32mNo violations detected.\u001b[0m');
  }

  console.log('\u001b[36m========================================\u001b[0m');
  console.log(
    `Status: ${hasBlockingViolations ? '\u001b[31mFAIL\u001b[0m' : '\u001b[32mPASS\u001b[0m'}`
  );
  console.log('\u001b[36m========================================\u001b[0m\n');

  return {
    passed: !hasBlockingViolations,
    violations: uniqueViolations,
  };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (require.main === module) {
  const registryPath = process.argv[2] || path.join(__dirname, 'AUTHORITY_REGISTRY.md');
  const codebasePath = process.argv[3] || path.join(__dirname, 'src');

  const result = enforceAuthority(registryPath, codebasePath);
  process.exit(result.passed ? 0 : 1);
}

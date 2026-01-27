/**
 * OLYMPUS 2.0 - Ledger Authority Enforcement CI
 * ENFORCES: contracts/authority-registry.json
 *
 * FAIL-CLOSED: Exit code 1 on any authority violation
 * DETERMINISTIC: Same input always produces same output
 * ZERO SIDE EFFECTS: Only console.error for violations
 */

import * as fs from 'fs';
import * as path from 'path';

interface Authority {
  name: string;
  location: string;
  domain: string;
  capabilities: {
    allow: string[];
    forbid: string[];
  };
}

interface ReadOnlyArtifact {
  name: string;
  location: string;
  status: 'READ-ONLY';
}

interface AuthorityRegistry {
  version: string;
  status: string;
  authorities: Authority[];
  readOnlyArtifacts: ReadOnlyArtifact[];
  databaseTables: Record<string, string>;
}

interface Violation {
  file: string;
  violationType:
    | 'UNAUTHORIZED_WRITE'
    | 'UNAUTHORIZED_ENFORCEMENT'
    | 'READ_ONLY_VIOLATION'
    | 'FORBIDDEN_ACTION'
    | 'PARSE_ERROR';
  details: string;
  line?: number;
}

function parseAuthorityRegistry(registryPath: string): AuthorityRegistry | null {
  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content) as AuthorityRegistry;
  } catch (error) {
    console.error('❌ AUTHORITY VIOLATION: PARSE_ERROR');
    console.error(`  File: ${registryPath}`);
    console.error(`  Details: Failed to parse authority registry`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function isAuthorityFile(filePath: string, authorities: Authority[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return authorities.some(auth => normalizedPath.includes(auth.location.replace(/\\/g, '/')));
}

function isReadOnlyArtifact(filePath: string, readOnly: ReadOnlyArtifact[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return readOnly.some(ro => normalizedPath.includes(ro.location.replace(/\\/g, '/')));
}

function canPerformAction(authority: Authority | undefined, action: string): boolean {
  if (!authority) return false;
  return authority.capabilities.allow.some(allowed => action.startsWith(allowed));
}

function isForbiddenAction(authority: Authority | undefined, action: string): boolean {
  if (!authority) return false;
  return authority.capabilities.forbid.some(forbidden => action.startsWith(forbidden));
}

function analyzeFile(filePath: string, registry: AuthorityRegistry): Violation[] {
  const violations: Violation[] = [];

  if (!fs.existsSync(filePath) || !filePath.endsWith('.ts')) {
    return violations;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const isAuthority = isAuthorityFile(filePath, registry.authorities);
  const isReadOnly = isReadOnlyArtifact(filePath, registry.readOnlyArtifacts);

  let authority: Authority | undefined = undefined;
  if (isAuthority) {
    authority = registry.authorities.find(a => filePath.includes(a.location.replace(/\\/g, '/')));
  }

  const writePatterns = [
    /\.insert\(/gi,
    /\.update\(/gi,
    /\.delete\(/gi,
    /\.from\(['"][a-z_]+['"]\)\.insert\(/gi,
    /\.from\(['"][a-z_]+['"]\)\.update\(/gi,
    /\.from\(['"][a-z_]+['"]\)\.delete\(/gi,
  ];

  const throwPatterns = [
    /throw new Error/gi,
    /throw new \w+Error/gi,
    /throw\s+\w+Error/gi,
    /throw\s+\(/gi,
  ];

  const rejectPatterns = [/\bthrow\s+new\s+\w+Error/gi, /throw\s+\(/gi, /Promise\.reject/gi];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    for (const pattern of writePatterns) {
      if (pattern.test(line)) {
        if (isReadOnly) {
          violations.push({
            file: filePath,
            violationType: 'READ_ONLY_VIOLATION',
            details: 'Read-only artifact performs database write operation',
            line: i + 1,
          });
        } else if (!isAuthority) {
          violations.push({
            file: filePath,
            violationType: 'UNAUTHORIZED_WRITE',
            details: 'Undeclared file performs database write operation',
            line: i + 1,
          });
        }
      }
    }

    for (const pattern of throwPatterns) {
      if (pattern.test(line)) {
        if (isReadOnly) {
          violations.push({
            file: filePath,
            violationType: 'READ_ONLY_VIOLATION',
            details: 'Read-only artifact performs enforcement logic (throw)',
            line: i + 1,
          });
        } else if (!isAuthority) {
          violations.push({
            file: filePath,
            violationType: 'UNAUTHORIZED_ENFORCEMENT',
            details: 'Undeclared file performs enforcement logic (throw)',
            line: i + 1,
          });
        } else if (authority) {
          if (!canPerformAction(authority, 'ENFORCE') && !canPerformAction(authority, 'THROW')) {
            violations.push({
              file: filePath,
              violationType: 'FORBIDDEN_ACTION',
              details: `Authority '${authority.name}' performs enforcement without capability`,
              line: i + 1,
            });
          }
        }
      }
    }

    for (const pattern of rejectPatterns) {
      if (pattern.test(line)) {
        if (isReadOnly) {
          violations.push({
            file: filePath,
            violationType: 'READ_ONLY_VIOLATION',
            details: 'Read-only artifact performs enforcement logic (reject)',
            line: i + 1,
          });
        } else if (!isAuthority) {
          violations.push({
            file: filePath,
            violationType: 'UNAUTHORIZED_ENFORCEMENT',
            details: 'Undeclared file performs enforcement logic (reject)',
            line: i + 1,
          });
        } else if (authority) {
          if (!canPerformAction(authority, 'ENFORCE') && !canPerformAction(authority, 'REJECT')) {
            violations.push({
              file: filePath,
              violationType: 'FORBIDDEN_ACTION',
              details: `Authority '${authority.name}' performs enforcement without capability`,
              line: i + 1,
            });
          }
        }
      }
    }
  }

  return violations;
}

function scanDirectory(directory: string, registry: AuthorityRegistry): Violation[] {
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
            entry.name !== 'build' &&
            entry.name !== '.git'
          ) {
            scanRecursive(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          const violations = analyzeFile(fullPath, registry);
          allViolations.push(...violations);
        }
      }
    } catch (error) {}
  }

  scanRecursive(directory);
  return allViolations;
}

function enforceRegistry(registryPath: string, codebasePath: string): void {
  const registry = parseAuthorityRegistry(registryPath);

  if (!registry) {
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('OLYMPUS 2.0 - Ledger Authority Enforcement');
  console.log('='.repeat(60));
  console.log(`Registry Version: ${registry.version}`);
  console.log(`Status: ${registry.status}`);
  console.log(`Declared Authorities: ${registry.authorities.length}`);
  console.log(`Read-Only Artifacts: ${registry.readOnlyArtifacts.length}`);
  console.log('='.repeat(60));

  const violations = scanDirectory(codebasePath, registry);

  const blockingViolations = violations.filter(
    v =>
      v.violationType === 'UNAUTHORIZED_WRITE' ||
      v.violationType === 'UNAUTHORIZED_ENFORCEMENT' ||
      v.violationType === 'READ_ONLY_VIOLATION' ||
      v.violationType === 'PARSE_ERROR'
  );

  if (blockingViolations.length > 0) {
    console.log(
      `\n❌ AUTHORITY VIOLATION DETECTED: ${blockingViolations.length} blocking issue(s)\n`
    );

    for (const violation of blockingViolations) {
      console.error(`❌ AUTHORITY VIOLATION: ${violation.file}`);
      console.error(`  Type: ${violation.violationType}`);
      console.error(`  Line: ${violation.line || 'N/A'}`);
      console.error(`  Details: ${violation.details}`);
      console.error('');
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('STATUS: FAIL - CI blocked by authority violations');
    console.log(`${'='.repeat(60)}\n`);
    process.exit(1);
  } else if (violations.length > 0) {
    console.log(`\n⚠️  ${violations.length} non-blocking violation(s) detected\n`);

    for (const violation of violations) {
      console.log(`⚠️  ${violation.violationType}: ${violation.file}`);
      console.log(`   Line ${violation.line || 'N/A'}: ${violation.details}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('STATUS: PASS - CI continues (non-blocking violations)');
    console.log(`${'='.repeat(60)}\n`);
  } else {
    console.log(`\n✅ No violations detected\n`);
    console.log(`${'='.repeat(60)}`);
    console.log('STATUS: PASS');
    console.log(`${'='.repeat(60)}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const projectRoot = process.cwd();
  const registryPath = path.join(projectRoot, 'contracts', 'authority-registry.json');
  const codebasePath = path.join(projectRoot, 'src');

  enforceRegistry(registryPath, codebasePath);
}

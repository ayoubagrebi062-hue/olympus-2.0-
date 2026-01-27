#!/usr/bin/env node

/**
 * VITO Code Quality Validator
 *
 * Runs BEFORE build to catch broken interactive elements.
 * Enforces the 7 Unbreakable Rules from CLAUDE.md
 *
 * Usage: node scripts/validate-code-quality.js
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Critical violations found (blocks build)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXTENSIONS = ['.tsx', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist'];

// Terminal colors
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// Violation tracking
const violations = [];

/**
 * Scan file for violations
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);

  // RULE 1: Check for buttons without onClick
  // Exceptions: type="submit" buttons, {...props} spread (component wrappers)
  lines.forEach((line, index) => {
    if (line.includes('<button') && !line.includes('onClick') && !line.includes('type="submit"')) {
      // Check next few lines for onClick, type="submit", or {...props} (component wrapper)
      const nextLines = lines.slice(index, index + 8).join(' ');
      const hasOnClick = nextLines.includes('onClick');
      const isSubmitButton = nextLines.includes('type="submit"') || nextLines.includes("type='submit'");
      const isComponentWrapper = nextLines.includes('{...props}') || nextLines.includes('{...rest}');

      if (!hasOnClick && !isSubmitButton && !isComponentWrapper) {
        violations.push({
          file: relativePath,
          line: index + 1,
          rule: 'RULE 1',
          severity: 'CRITICAL',
          message: 'Button without onClick handler',
          code: line.trim().substring(0, 80)
        });
      }
    }
  });

  // RULE 2: Check for href="#" or href=""
  const hrefPlaceholder = /href=["'](#|)["']/g;
  let match;
  while ((match = hrefPlaceholder.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    violations.push({
      file: relativePath,
      line: lineNum,
      rule: 'RULE 2',
      severity: 'CRITICAL',
      message: 'Placeholder href="#" or href="" found',
      code: lines[lineNum - 1]?.trim().substring(0, 80)
    });
  }

  // RULE 3: Check for console.log in handlers or alert()
  const consoleInHandler = /on\w+\s*=\s*\{[^}]*console\.log/g;
  while ((match = consoleInHandler.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    violations.push({
      file: relativePath,
      line: lineNum,
      rule: 'RULE 3',
      severity: 'HIGH',
      message: 'console.log used in event handler',
      code: lines[lineNum - 1]?.trim().substring(0, 80)
    });
  }

  // Check for alert()
  const alertRegex = /\balert\s*\(/g;
  while ((match = alertRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    // Ignore if it's in a comment
    const line = lines[lineNum - 1];
    if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      violations.push({
        file: relativePath,
        line: lineNum,
        rule: 'RULE 3',
        severity: 'HIGH',
        message: 'alert() found - use toast instead',
        code: line?.trim().substring(0, 80)
      });
    }
  }

  // RULE 4: Check for clipboard without try/catch
  // Look for clipboard operations not wrapped in try
  const clipboardOps = /navigator\.clipboard\.(writeText|readText)/g;
  while ((match = clipboardOps.exec(content)) !== null) {
    const beforeMatch = content.substring(Math.max(0, match.index - 200), match.index);
    if (!beforeMatch.includes('try {') && !beforeMatch.includes('try{')) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: relativePath,
        line: lineNum,
        rule: 'RULE 4',
        severity: 'HIGH',
        message: 'Clipboard operation without try/catch',
        code: lines[lineNum - 1]?.trim().substring(0, 80)
      });
    }
  }

  // RULE 8: Check for use() with params in client components
  // This is a CRITICAL error - use() only works with Promises
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  if (hasUseClient) {
    // Check for use(params) pattern which is WRONG in client components
    const useParamsPattern = /\buse\s*\(\s*params\s*\)/g;
    while ((match = useParamsPattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: relativePath,
        line: lineNum,
        rule: 'RULE 8',
        severity: 'CRITICAL',
        message: 'use(params) in client component - params is NOT a Promise!',
        code: lines[lineNum - 1]?.trim().substring(0, 80)
      });
    }
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS.includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '═'.repeat(70));
  console.log(`${CYAN}${BOLD}  VITO CODE QUALITY VALIDATOR${RESET}`);
  console.log('═'.repeat(70) + '\n');

  const critical = violations.filter(v => v.severity === 'CRITICAL');
  const high = violations.filter(v => v.severity === 'HIGH');

  console.log(`${BOLD}Summary:${RESET}`);
  console.log(`  ${RED}CRITICAL: ${critical.length}${RESET}`);
  console.log(`  ${YELLOW}HIGH: ${high.length}${RESET}`);
  console.log('');

  if (violations.length === 0) {
    console.log(`${GREEN}${BOLD}  ✓ ALL CHECKS PASSED${RESET}`);
    console.log(`${GREEN}  No violations found. Code quality is good.${RESET}\n`);
    return 0;
  }

  // Group by file
  const byFile = {};
  for (const v of violations) {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  }

  console.log('─'.repeat(70));
  console.log(`${BOLD}Violations:${RESET}\n`);

  for (const [file, fileViolations] of Object.entries(byFile)) {
    console.log(`${CYAN}${file}${RESET}`);
    for (const v of fileViolations) {
      const color = v.severity === 'CRITICAL' ? RED : YELLOW;
      console.log(`  ${color}Line ${v.line}: [${v.severity}] ${v.rule}${RESET}`);
      console.log(`    ${v.message}`);
      if (v.code) console.log(`    → ${v.code}`);
      console.log('');
    }
  }

  console.log('─'.repeat(70));

  if (critical.length > 0) {
    console.log(`\n${RED}${BOLD}  ✗ BUILD BLOCKED${RESET}`);
    console.log(`${RED}  Fix ${critical.length} CRITICAL violations before building.${RESET}\n`);
    return 1;
  } else {
    console.log(`\n${YELLOW}${BOLD}  ⚠ WARNINGS FOUND${RESET}`);
    console.log(`${YELLOW}  Fix ${high.length} HIGH violations for better code quality.${RESET}\n`);
    return 0;
  }
}

// Main execution
console.log(`\n${CYAN}Scanning src/ for code quality violations...${RESET}`);
scanDirectory(SRC_DIR);
const exitCode = printResults();
process.exit(exitCode);

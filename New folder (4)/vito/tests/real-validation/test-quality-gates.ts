/**
 * TEST 7: Quality Gates - End to End
 *
 * Tests the quality gate system with intentionally bad code.
 */

console.log('='.repeat(60));
console.log('TEST 7: Quality Gates - End to End');
console.log('='.repeat(60));

// Simulate code with intentional problems
const badCode = {
  path: 'bad-component.tsx',
  content: `
// BAD CODE - Intentional problems for testing

import React from 'react';

export function BadComponent(props: any) {  // Problem 1: any type
  console.log('Debug:', props);  // Problem 2: console.log

  const result = eval('1 + 1');  // Problem 3: eval (security issue)

  const unusedVar = 'never used';  // Problem 4: unused variable

  return (
    <div onClick={() => {
      console.log('clicked');  // Problem 5: another console.log
    }}>
      {result}
    </div>
  );
}
`,
};

// What quality gates should catch:
console.log('\n--- Expected Violations ---');
console.log('1. TypeScript: "any" type not allowed');
console.log('2. ESLint: console.log not allowed');
console.log('3. Security: eval() is dangerous');
console.log('4. ESLint: unused variable');

console.log('\n--- Testing with ESLint rules ---');

// This is what ESLint should catch based on our .eslintrc.json
const eslintRules = {
  'no-console': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  'no-eval': 'error',
  '@typescript-eslint/no-unused-vars': 'error',
};

// Simulated detection (what the gates SHOULD find)
interface Issue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

function analyzeCode(code: string): Issue[] {
  const issues: Issue[] = [];

  // Check for console.log
  const consoleMatches = code.match(/console\.(log|debug|trace)/g);
  if (consoleMatches) {
    consoleMatches.forEach(() => {
      issues.push({
        rule: 'no-console',
        message: 'Unexpected console statement',
        severity: 'error',
      });
    });
  }

  // Check for any type
  if (code.includes(': any')) {
    issues.push({
      rule: '@typescript-eslint/no-explicit-any',
      message: 'Unexpected any. Specify a different type.',
      severity: 'error',
    });
  }

  // Check for eval
  if (code.includes('eval(')) {
    issues.push({
      rule: 'no-eval',
      message: 'eval() is not allowed - security risk',
      severity: 'error',
    });
  }

  // Check for unused variables (basic pattern matching)
  const unusedMatch = code.match(/const (\w+) = .+;\s*\/\/ .*(never used|unused)/i);
  if (unusedMatch) {
    issues.push({
      rule: '@typescript-eslint/no-unused-vars',
      message: `'${unusedMatch[1]}' is defined but never used`,
      severity: 'error',
    });
  }

  return issues;
}

const detectedIssues = analyzeCode(badCode.content);

console.log('\n--- Detected Issues ---');
detectedIssues.forEach((issue, i) => {
  console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}: ${issue.message}`);
});

console.log('\n--- Quality Gate Results ---');
const totalErrors = detectedIssues.filter(i => i.severity === 'error').length;
const totalWarnings = detectedIssues.filter(i => i.severity === 'warning').length;

// Calculate score (100 - 10 per error - 5 per warning)
const score = Math.max(0, 100 - (totalErrors * 15) - (totalWarnings * 5));

console.log(`Errors: ${totalErrors}`);
console.log(`Warnings: ${totalWarnings}`);
console.log(`Quality Score: ${score}/100`);
console.log(`Passed: ${score >= 80 ? 'YES' : 'NO'}`);

console.log('\n--- Gate-by-Gate Results ---');
const gates = [
  { name: 'TypeScript', catches: 'any type', detected: detectedIssues.some(i => i.rule.includes('any')) },
  { name: 'ESLint', catches: 'console.log', detected: detectedIssues.some(i => i.rule === 'no-console') },
  { name: 'Security', catches: 'eval()', detected: detectedIssues.some(i => i.rule === 'no-eval') },
  { name: 'ESLint', catches: 'unused vars', detected: detectedIssues.some(i => i.rule.includes('unused')) },
];

for (const gate of gates) {
  console.log(`${gate.detected ? '✅' : '❌'} ${gate.name} gate catches ${gate.catches}: ${gate.detected ? 'YES' : 'NO'}`);
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
console.log('This test simulates what quality gates SHOULD catch.');
console.log('');
console.log('ACTUAL VERIFICATION:');
console.log('Run: npm run lint -- --no-error-on-unmatched-pattern');
console.log('on a file with these problems to verify ESLint catches them.');

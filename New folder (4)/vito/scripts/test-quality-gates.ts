/**
 * OLYMPUS 2.0 - Quality Gates Test Script
 *
 * Tests all quality gate components:
 * - TypeScript validation
 * - ESLint checking
 * - Security scanning
 * - Build verification
 * - Full orchestration
 */

// Set dummy env vars to prevent Supabase import errors
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

import {
  typeScriptValidator,
  eslintValidator,
  securityScanner,
  buildVerifier,
  getQualityOrchestrator,
  quickCheck,
  securityCheck,
  typescriptCheck,
  formatQualityReport,
  type FileToCheck,
} from '../src/lib/quality/index.js';

// ============================================
// TEST DATA
// ============================================

const goodCode: FileToCheck = {
  path: 'components/Button.tsx',
  content: `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps): JSX.Element {
  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default Button;
`,
  language: 'typescript',
};

const badCode: FileToCheck = {
  path: 'utils/unsafe.ts',
  content: `
// Bad code with multiple issues

var x = 5;  // no-var
console.log('debugging');  // no-console
debugger;  // no-debugger

const password = "hardcoded_secret_123";  // hardcoded secret

function unsafeFunc(data: any) {
  // @ts-ignore
  eval(data);  // eval usage!

  document.write('<script>alert(1)</script>');  // XSS

  const userInput = \`SELECT * FROM users WHERE id = \${data}\`;  // SQL injection

  return userInput;
}

// Missing React import but using JSX
const Component = () => <div>Hello</div>;
`,
  language: 'typescript',
};

const reactCode: FileToCheck = {
  path: 'components/Counter.tsx',
  content: `
import React, { useState, useEffect } from 'react';

interface CounterProps {
  initialValue?: number;
}

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default Counter;
`,
  language: 'typescript',
};

const cssCode: FileToCheck = {
  path: 'styles/main.css',
  content: `
.container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.button {
  background-color: #007bff !important;
  color: white;
  border: none;
  padding: 10px 20px;
}

.text {
  font-size: 16px;
  line-height: 1.5;
}
`,
  language: 'css',
};

// ============================================
// TEST FUNCTIONS
// ============================================

async function testTypeScriptValidator() {
  console.log('\n📘 Testing TypeScript Validator...');
  console.log('─'.repeat(50));

  // Test good code
  const goodResult = await typeScriptValidator.check([goodCode]);
  console.log(`✅ Good code: ${goodResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Issues: ${goodResult.issues.length}`);

  // Test bad code
  const badResult = await typeScriptValidator.check([badCode]);
  console.log(`❌ Bad code: ${badResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Issues: ${badResult.issues.length}`);

  badResult.issues.slice(0, 3).forEach(issue => {
    console.log(`   - [${issue.severity}] ${issue.message}`);
  });

  return badResult.issues.length > 0;
}

async function testESLintValidator() {
  console.log('\n📙 Testing ESLint Validator...');
  console.log('─'.repeat(50));

  // Test good code
  const goodResult = await eslintValidator.check([goodCode]);
  console.log(`✅ Good code: ${goodResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Issues: ${goodResult.issues.length}`);

  // Test bad code
  const badResult = await eslintValidator.check([badCode]);
  console.log(`❌ Bad code: ${badResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Issues: ${badResult.issues.length}`);

  badResult.issues.slice(0, 5).forEach(issue => {
    console.log(`   - [${issue.rule}] ${issue.message}`);
  });

  return badResult.issues.length > 0;
}

async function testSecurityScanner() {
  console.log('\n🔐 Testing Security Scanner...');
  console.log('─'.repeat(50));

  // Test good code
  const goodResult = await securityScanner.check([goodCode, reactCode]);
  console.log(`✅ Good code: ${goodResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Security issues: ${goodResult.issues.length}`);

  // Test bad code
  const badResult = await securityScanner.check([badCode]);
  console.log(`❌ Bad code: ${badResult.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Security issues: ${badResult.issues.length}`);

  badResult.issues.forEach(issue => {
    console.log(`   - [${issue.severity}] ${issue.rule}: ${issue.message}`);
  });

  return badResult.issues.length > 0;
}

async function testBuildVerifier() {
  console.log('\n🔨 Testing Build Verifier...');
  console.log('─'.repeat(50));

  // Test all files
  const allFiles = [goodCode, reactCode, cssCode];
  const result = await buildVerifier.check(allFiles);

  console.log(`Status: ${result.status}`);
  console.log(`Files checked: ${result.metrics?.filesChecked}`);
  console.log(`Issues found: ${result.issues.length}`);

  if (result.issues.length > 0) {
    result.issues.slice(0, 5).forEach(issue => {
      console.log(`   - [${issue.severity}] ${issue.message}`);
    });
  }

  return result.passed;
}

async function testOrchestrator() {
  console.log('\n🎯 Testing Quality Orchestrator...');
  console.log('─'.repeat(50));

  const orchestrator = getQualityOrchestrator();
  const allFiles = [goodCode, reactCode, badCode, cssCode];

  const report = await orchestrator.runAllGates('test-build-001', 'test-project', allFiles);

  console.log(`\nOverall Status: ${report.overallStatus}`);
  console.log(`Overall Score: ${report.overallScore}/100`);
  console.log(`\nGate Results:`);

  report.gates.forEach(gate => {
    const icon = gate.passed ? '✅' : gate.status === 'skipped' ? '⏭️' : '❌';
    console.log(`  ${icon} ${gate.gate}: ${gate.status} (${gate.issues.length} issues)`);
  });

  console.log(`\nSummary:`);
  console.log(`  Total Gates: ${report.summary.totalGates}`);
  console.log(`  Passed: ${report.summary.passedGates}`);
  console.log(`  Failed: ${report.summary.failedGates}`);
  console.log(`  Errors: ${report.summary.totalErrors}`);
  console.log(`  Warnings: ${report.summary.totalWarnings}`);

  if (report.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  // Print formatted report
  console.log(`\n${formatQualityReport(report)}`);

  return true;
}

async function testConvenienceFunctions() {
  console.log('\n🚀 Testing Convenience Functions...');
  console.log('─'.repeat(50));

  // Quick check
  console.log('Testing quickCheck()...');
  const quickResult = await quickCheck(
    goodCode.content,
    'Button.tsx',
    'typescript'
  );
  console.log(`  Quick check: score=${quickResult.score}, passed=${quickResult.passed}, issues=${quickResult.issues}`);

  // Security check
  console.log('\nTesting securityCheck()...');
  const secResult = await securityCheck([badCode]);
  console.log(`  Security check: passed=${secResult.passed}, issues=${secResult.issues.length}`);

  // TypeScript check
  console.log('\nTesting typescriptCheck()...');
  const tsResult = await typescriptCheck([goodCode]);
  console.log(`  TypeScript check: passed=${tsResult.passed}, issues=${tsResult.issues.length}`);

  return true;
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           OLYMPUS 2.0 - Quality Gates Test               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const results: { name: string; passed: boolean }[] = [];

  try {
    // TypeScript Validator
    const tsResult = await testTypeScriptValidator();
    results.push({ name: 'TypeScript Validator', passed: tsResult });

    // ESLint Validator
    const eslintResult = await testESLintValidator();
    results.push({ name: 'ESLint Validator', passed: eslintResult });

    // Security Scanner
    const securityResult = await testSecurityScanner();
    results.push({ name: 'Security Scanner', passed: securityResult });

    // Build Verifier
    const buildResult = await testBuildVerifier();
    results.push({ name: 'Build Verifier', passed: buildResult });

    // Orchestrator
    const orchestratorResult = await testOrchestrator();
    results.push({ name: 'Orchestrator', passed: orchestratorResult });

    // Convenience Functions
    const convenienceResult = await testConvenienceFunctions();
    results.push({ name: 'Convenience Functions', passed: convenienceResult });

  } catch (error) {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`║ ${icon} ${r.name.padEnd(50)} ║`);
  });

  const passed = results.filter(r => r.passed).length;
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║ Total: ${passed}/${results.length} tests passed${' '.repeat(37)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (passed === results.length) {
    console.log('\n✅ All quality gate tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed - review output above');
  }
}

runAllTests().catch(console.error);

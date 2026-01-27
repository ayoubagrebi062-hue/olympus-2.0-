/**
 * OLYMPUS 2.0 - Quick Test Runner
 *
 * Single test runner for debugging and verifying API connection.
 * Run with: npm run test:quick
 */

import { wireGenerator } from './wire-adapter';
import { generateWithRetry, FeatureChecklist } from '../generation-retry';

// ════════════════════════════════════════════════════════════════════════════════
// TEST CASE
// ════════════════════════════════════════════════════════════════════════════════

const QUICK_TEST = {
  prompt: `Build a simple dashboard page with:
1. A header with title "Dashboard" and a "New Project" button
2. A stats grid with 3 cards showing: Total Projects (12), Active Tasks (28), Team Members (5)
3. A recent activity feed with 4-5 sample items

Use shadcn/ui components (Card, Button, etc.) and Tailwind CSS.
Include loading state with Skeleton components.
Include error state with retry button.
Make it responsive (stack on mobile).`,
  pageType: 'dashboard',
  checklist: {
    critical: [
      {
        id: 'stats',
        name: 'Stats Cards',
        description: '3 KPI cards',
        acceptanceCriteria: ['Projects card', 'Tasks card', 'Members card'],
        assignedTo: 'WIRE' as const,
      },
      {
        id: 'loading_states',
        name: 'Loading States',
        description: 'Skeleton loaders',
        acceptanceCriteria: ['Skeleton for stats', 'isLoading state'],
        assignedTo: 'WIRE' as const,
      },
      {
        id: 'responsive',
        name: 'Responsive Layout',
        description: 'Mobile friendly',
        acceptanceCriteria: ['Grid cols responsive', 'Stack on mobile'],
        assignedTo: 'WIRE' as const,
      },
    ],
    important: [
      {
        id: 'activity_feed',
        name: 'Activity Feed',
        description: 'Recent activity list',
        acceptanceCriteria: ['List of activities', 'Timestamps'],
        assignedTo: 'WIRE' as const,
      },
    ],
    niceToHave: [],
  } as FeatureChecklist,
};

// ════════════════════════════════════════════════════════════════════════════════
// QUICK TEST RUNNER
// ════════════════════════════════════════════════════════════════════════════════

async function runQuickTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              OLYMPUS 2.0 QUICK TEST                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Testing API connection with single dashboard generation...');
  console.log('');
  console.log('PROMPT:');
  console.log('─'.repeat(60));
  console.log(QUICK_TEST.prompt);
  console.log('─'.repeat(60));
  console.log('');

  const startTime = Date.now();

  try {
    const result = await generateWithRetry(
      wireGenerator,
      QUICK_TEST.prompt,
      QUICK_TEST.checklist,
      'WIRE',
      QUICK_TEST.pageType
    );

    const totalTime = Date.now() - startTime;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RESULT:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Status:    ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Attempts:  ${result.attempts}`);
    console.log(`  Time:      ${totalTime}ms`);
    console.log(`  Code Size: ${result.code?.length || 0} characters`);
    console.log(`  Lines:     ${result.code?.split('\n').length || 0}`);

    if (result.failures.length > 0) {
      console.log('');
      console.log('FAILURES:');
      result.failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('GENERATED CODE (first 1000 chars):');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(result.code?.substring(0, 1000) || 'NO CODE GENERATED');
    if (result.code && result.code.length > 1000) {
      console.log('...');
      console.log(`[${result.code.length - 1000} more characters]`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('VALIDATION CHECKS:');
    console.log('═══════════════════════════════════════════════════════════════');

    const code = result.code || '';

    // Check for common issues
    const checks = [
      { name: 'Has useState', passed: /useState/.test(code) },
      { name: 'Has loading state', passed: /isLoading|loading/i.test(code) },
      { name: 'Has Skeleton', passed: /Skeleton/.test(code) },
      { name: 'Has responsive classes', passed: /sm:|md:|lg:/.test(code) },
      { name: 'Uses theme tokens', passed: /bg-background|bg-card|text-foreground/.test(code) },
      { name: 'No hardcoded hex', passed: !/#[0-9a-fA-F]{6}/.test(code) },
      { name: 'No TODO comments', passed: !/\/\/\s*TODO/i.test(code) },
      { name: 'No lorem ipsum', passed: !/lorem ipsum/i.test(code) },
      { name: 'Has onClick handlers', passed: /onClick=\{/.test(code) },
      { name: 'No empty handlers', passed: !/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(code) },
    ];

    checks.forEach(check => {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const passedChecks = checks.filter(c => c.passed).length;
    console.log('');
    console.log(`  Score: ${passedChecks}/${checks.length} checks passed`);

    // Estimate cost
    const inputTokens = QUICK_TEST.prompt.length / 4; // rough estimate
    const outputTokens = (result.code?.length || 0) / 4;
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = (totalTokens / 1000) * 0.003 * result.attempts; // Claude Sonnet pricing

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('COST ESTIMATE:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Input Tokens:  ~${Math.round(inputTokens)}`);
    console.log(`  Output Tokens: ~${Math.round(outputTokens)}`);
    console.log(`  Total Tokens:  ~${Math.round(totalTokens)}`);
    console.log(`  Attempts:      ${result.attempts}`);
    console.log(`  Est. Cost:     $${estimatedCost.toFixed(4)}`);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('QUICK TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('QUICK TEST FAILED:');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.message.includes('API key')) {
      console.error('');
      console.error('Make sure ANTHROPIC_API_KEY is set:');
      console.error('  export ANTHROPIC_API_KEY="your-key-here"');
    }

    process.exit(1);
  }
}

// Run the test
runQuickTest();

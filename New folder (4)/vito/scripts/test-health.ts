/**
 * OLYMPUS 2.0 - Health Monitor Test
 * Run: npx tsx scripts/test-health.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  getHealthMonitor,
  checkAllProviders,
} from '../src/lib/agents/providers/health';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Health Monitor Test');
  console.log('='.repeat(50));
  console.log('');

  // Check all providers
  console.log('Checking all providers...');
  const results = await checkAllProviders();

  for (const result of results) {
    console.log(`\n${result.provider}:`);
    console.log(`  Healthy: ${result.healthy ? '✅' : '❌'}`);
    console.log(`  Latency: ${result.latencyMs}ms`);
    if (result.models?.length) {
      console.log(`  Models: ${result.models.slice(0, 3).join(', ')}${result.models.length > 3 ? '...' : ''}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  }

  // Get health report
  console.log('\n--- Health Report ---');
  const monitor = getHealthMonitor();
  monitor.printReport();

  // Get best provider
  const best = monitor.getBestProvider(true);
  console.log(`Best provider (prefer local): ${best || 'none available'}`);

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Health Monitor Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

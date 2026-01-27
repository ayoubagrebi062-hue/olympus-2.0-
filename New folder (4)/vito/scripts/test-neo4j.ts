/**
 * OLYMPUS 2.0 - Neo4j Connection Test
 * Run: npx ts-node scripts/test-neo4j.ts
 */

import { healthCheck, upsertUser, getUserContext, closeDriver } from '../src/lib/db/neo4j.js';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Neo4j Connection Test');
  console.log('='.repeat(50));
  console.log('');

  console.log('Testing Neo4j connection...');
  console.log(`URI: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`);
  console.log('');

  const healthy = await healthCheck();
  console.log('Health check:', healthy ? '✅ PASS' : '❌ FAIL');

  if (healthy) {
    console.log('');

    // Test user creation
    console.log('Creating test user...');
    await upsertUser('test-user-1', 'test@olympus.dev', 'Test User');
    console.log('User created: ✅ PASS');

    // Test context retrieval
    console.log('');
    console.log('Retrieving user context...');
    const context = await getUserContext('test-user-1');
    console.log('Context retrieved: ✅ PASS');
    console.log('Context:', JSON.stringify(context, null, 2));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(healthy ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
  console.log('='.repeat(50));

  await closeDriver();
  process.exit(healthy ? 0 : 1);
}

test().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

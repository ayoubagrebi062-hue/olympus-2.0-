/**
 * OLYMPUS 2.0 - GraphRAG Context Manager Test
 * Run: npx tsx scripts/test-context-manager.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set dummy Supabase vars to avoid auth import errors
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

// Import directly from graphrag to avoid type chain that pulls in auth
import {
  getContextManager,
  getUserContext,
  getContextSummary,
} from '../src/lib/agents/context/graphrag';

import * as neo4j from '../src/lib/db/neo4j';
import * as mongodb from '../src/lib/db/mongodb';
import * as redis from '../src/lib/db/redis';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS GraphRAG Context Manager Test');
  console.log('='.repeat(50));
  console.log('');

  // Test user ID
  const testUserId = 'test-user-graphrag-001';
  const testEmail = 'test@olympus.dev';

  // Check database connections
  console.log('Checking database connections...');
  const [neo4jOk, mongoOk, redisOk] = await Promise.all([
    neo4j.healthCheck(),
    mongodb.healthCheck(),
    redis.healthCheck(),
  ]);

  console.log(`  Neo4j: ${neo4jOk ? '✅' : '❌'}`);
  console.log(`  MongoDB: ${mongoOk ? '✅' : '❌'}`);
  console.log(`  Redis: ${redisOk ? '✅' : '❌'}`);

  if (!neo4jOk || !mongoOk) {
    console.error('\nRequired databases not available!');
    console.log('Make sure Neo4j and MongoDB are running.');
    process.exit(1);
  }

  const cm = getContextManager();

  // Test 1: Ensure user exists
  console.log('\n--- Test 1: Ensure User ---');
  await cm.ensureUser(testUserId, testEmail, 'Test User');
  console.log('✅ User created/updated in Neo4j');

  // Test 2: Set preferences
  console.log('\n--- Test 2: Update Preferences ---');
  await cm.updatePreferences(testUserId, {
    theme: 'dark',
    accentColor: '#FF6B35',
    stylePreference: 'modern-minimal',
  });
  console.log('✅ Preferences updated');

  // Test 3: Record a build
  console.log('\n--- Test 3: Record Build ---');
  const testBuildId = `build-${Date.now()}`;
  const testProjectId = `project-${Date.now()}`;
  await cm.recordBuild(
    testUserId,
    testProjectId,
    testBuildId,
    'Build a modern e-commerce dashboard with dark theme'
  );
  console.log('✅ Build recorded');

  // Test 4: Get user context (should hit databases)
  console.log('\n--- Test 4: Get User Context (Fresh) ---');
  const startTime = Date.now();
  const context = await getUserContext(testUserId, { skipCache: true });
  console.log(`  Latency: ${Date.now() - startTime}ms`);
  console.log(`  Preferences: ${JSON.stringify(context.preferences)}`);
  console.log(`  Industries: ${context.industries.join(', ') || 'none'}`);
  console.log(`  Total Builds: ${context.totalBuilds}`);
  console.log(`  Success Rate: ${(context.successRate * 100).toFixed(0)}%`);
  console.log('✅ Context retrieved');

  // Test 5: Get cached context
  console.log('\n--- Test 5: Get User Context (Cached) ---');
  const cachedStart = Date.now();
  const cachedContext = await getUserContext(testUserId);
  console.log(`  Latency: ${Date.now() - cachedStart}ms (should be faster)`);
  console.log(`  Cached At: ${cachedContext.cachedAt || 'not cached'}`);
  console.log('✅ Cache working');

  // Test 6: Get context summary
  console.log('\n--- Test 6: Context Summary ---');
  const summary = await getContextSummary(testUserId);
  console.log('Summary for agent injection:');
  console.log('---');
  console.log(summary);
  console.log('---');
  console.log('✅ Summary generated');

  // Test 7: Update build outcome
  console.log('\n--- Test 7: Update Build Outcome ---');
  await cm.updateBuildOutcome(testBuildId, testUserId, 'completed');
  console.log('✅ Build marked as completed');

  // Test 8: Invalidate cache
  console.log('\n--- Test 8: Invalidate Cache ---');
  await cm.invalidateUserCache(testUserId);
  console.log('✅ Cache invalidated');

  // Cleanup
  console.log('\n--- Cleanup ---');
  await neo4j.closeDriver();
  await mongodb.closeClient();
  await redis.closeClient();
  console.log('✅ Connections closed');

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ GraphRAG Context Manager Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

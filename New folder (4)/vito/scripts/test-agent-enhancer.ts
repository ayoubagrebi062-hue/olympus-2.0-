/**
 * OLYMPUS 2.0 - Agent Context Enhancer Test
 * Run: npx tsx scripts/test-agent-enhancer.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set dummy Supabase vars to avoid auth import errors
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

import {
  enhanceAgentContext,
  recordAgentExecution,
  recordLearnedPattern,
  recordLearnedComponent,
  recordBuildFeedback,
  updateUserPreferencesFromBuild,
} from '../src/lib/agents/context/agent-enhancer';
import { getContextManager } from '../src/lib/agents/context/graphrag';
import * as neo4j from '../src/lib/db/neo4j';
import * as mongodb from '../src/lib/db/mongodb';
import * as redis from '../src/lib/db/redis';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Agent Context Enhancer Test');
  console.log('='.repeat(50));
  console.log('');

  // Test user/build IDs
  const testUserId = 'test-user-enhancer-001';
  const testEmail = 'enhancer-test@olympus.dev';
  const testBuildId = `build-${Date.now()}`;
  const testProjectId = `project-${Date.now()}`;

  // Check database connections
  console.log('Checking connections...');
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
    process.exit(1);
  }
  console.log('✅ All databases connected\n');

  // Setup: Create test user
  console.log('--- Setup: Create Test User ---');
  const cm = getContextManager();
  await cm.ensureUser(testUserId, testEmail, 'Enhancer Test User');
  await cm.updatePreferences(testUserId, {
    theme: 'dark',
    stylePreference: 'modern-minimal',
  });
  console.log('✅ Test user created\n');

  // Test 1: Enhance agent context (without embedding search first)
  console.log('--- Test 1: Basic Context Enhancement ---');
  const basicContext = await enhanceAgentContext(testUserId, 'Build a dashboard', {
    includeEmbeddingSearch: false,
  });
  console.log(`  User ID: ${basicContext.userId}`);
  console.log(`  Has preferences: ${Object.keys(basicContext.userContext.preferences).length > 0 ? '✅' : '❌'}`);
  console.log(`  Context summary length: ${basicContext.contextSummary.length} chars`);
  console.log('✅ Basic context enhanced\n');

  // Test 2: Full context enhancement with embedding search
  console.log('--- Test 2: Full Context Enhancement ---');
  const prompt = 'Build an e-commerce dashboard with product management and sales analytics';
  const startTime = Date.now();
  const fullContext = await enhanceAgentContext(testUserId, prompt);
  console.log(`  Latency: ${Date.now() - startTime}ms`);
  console.log(`  Similar prompts: ${fullContext.similarPrompts.length}`);
  console.log(`  Recommended patterns: ${fullContext.recommendedPatterns.length}`);
  console.log(`  Recommended components: ${fullContext.recommendedComponents.length}`);
  console.log('✅ Full context enhanced\n');

  // Test 3: Context summary output
  console.log('--- Test 3: Context Summary ---');
  console.log('Preview:');
  console.log(fullContext.contextSummary.substring(0, 300) + '...');
  console.log('✅ Context summary generated\n');

  // Test 4: Record agent execution
  console.log('--- Test 4: Record Agent Execution ---');
  await recordAgentExecution({
    buildId: testBuildId,
    userId: testUserId,
    agentId: 'oracle',
    prompt: 'Analyze market for e-commerce dashboards',
    output: 'Market analysis: Growing demand for real-time analytics...',
    model: 'gpt-4',
    tokens: 150,
    latencyMs: 2500,
    success: true,
  });
  console.log('✅ Agent execution recorded\n');

  // Test 5: Record learned pattern
  console.log('--- Test 5: Record Learned Pattern ---');
  await recordLearnedPattern({
    userId: testUserId,
    buildId: testBuildId,
    patternType: 'layout',
    name: 'dashboard-grid-layout',
    description: 'A responsive grid layout for dashboards with sidebar navigation',
  });
  console.log('✅ Learned pattern recorded\n');

  // Test 6: Record learned component
  console.log('--- Test 6: Record Learned Component ---');
  await recordLearnedComponent(
    testUserId,
    testBuildId,
    'SalesChart',
    'data-visualization',
    'A real-time sales chart component with multiple visualization options',
    ['data', 'timeRange', 'chartType'],
    'const SalesChart = ({ data, timeRange }) => ...'
  );
  console.log('✅ Learned component recorded\n');

  // Test 7: Record build feedback
  console.log('--- Test 7: Record Build Feedback ---');
  await recordBuildFeedback(
    testUserId,
    testBuildId,
    'The dashboard looks great! Love the dark theme.',
    'positive',
    'design'
  );
  console.log('✅ Feedback recorded\n');

  // Test 8: Update preferences from build
  console.log('--- Test 8: Update Preferences From Build ---');
  await updateUserPreferencesFromBuild(
    testUserId,
    testProjectId,
    ['Next.js', 'TypeScript', 'Tailwind CSS', 'Recharts'],
    'dashboard-grid-layout',
    'data-rich'
  );
  console.log('✅ Preferences updated from build\n');

  // Test 9: Verify learning worked
  console.log('--- Test 9: Verify Learning ---');
  const techPrefs = await neo4j.getUserTechPreferences(testUserId);
  console.log(`  Tech preferences: ${techPrefs.map(t => t.name).join(', ')}`);
  const components = await neo4j.getUserLearnedComponents(testUserId);
  console.log(`  Learned components: ${components.map(c => c.name).join(', ')}`);
  console.log('✅ Learning verified\n');

  // Cleanup
  await neo4j.closeDriver();
  await mongodb.closeClient();
  await redis.closeClient();

  console.log('='.repeat(50));
  console.log('✅ Agent Context Enhancer Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

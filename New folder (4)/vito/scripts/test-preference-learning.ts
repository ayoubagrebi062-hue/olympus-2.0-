/**
 * OLYMPUS 2.0 - Preference Learning Test
 * Run: npx tsx scripts/test-preference-learning.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set dummy Supabase vars
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

import {
  analyzeFeedback,
  learnFromFeedback,
  getLearnedPreferences,
  getTopPreferences,
} from '../src/lib/agents/context/preference-learning';
import { getContextManager } from '../src/lib/agents/context/graphrag';
import * as neo4j from '../src/lib/db/neo4j';
import * as mongodb from '../src/lib/db/mongodb';
import * as redis from '../src/lib/db/redis';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Preference Learning Test');
  console.log('='.repeat(50));
  console.log('');

  const testUserId = 'test-user-learning-001';
  const testEmail = 'learning-test@olympus.dev';
  const testBuildId = `build-${Date.now()}`;

  // Check connections
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
  console.log('✅ Connected\n');

  // Setup
  console.log('--- Setup ---');
  const cm = getContextManager();
  await cm.ensureUser(testUserId, testEmail, 'Learning Test User');
  console.log('✅ Test user created\n');

  // Test 1: Feedback analysis - positive
  console.log('--- Test 1: Positive Feedback Analysis ---');
  const positiveFeedback = 'The design looks amazing! I love the dark theme and the clean layout is perfect.';
  const positiveAnalysis = await analyzeFeedback(positiveFeedback);
  console.log(`  Sentiment: ${positiveAnalysis.sentiment}`);
  console.log(`  Aspects: ${positiveAnalysis.aspects.map(a => `${a.category} (${a.sentiment})`).join(', ')}`);
  console.log('✅ Positive feedback analyzed\n');

  // Test 2: Feedback analysis - negative
  console.log('--- Test 2: Negative Feedback Analysis ---');
  const negativeFeedback = 'The navigation is confusing and the colors look terrible. Very poor design choices.';
  const negativeAnalysis = await analyzeFeedback(negativeFeedback);
  console.log(`  Sentiment: ${negativeAnalysis.sentiment}`);
  console.log(`  Aspects: ${negativeAnalysis.aspects.map(a => `${a.category} (${a.sentiment})`).join(', ')}`);
  console.log('✅ Negative feedback analyzed\n');

  // Test 3: Feedback analysis - mixed
  console.log('--- Test 3: Mixed Feedback Analysis ---');
  const mixedFeedback = 'I love the button styles but the header looks ugly. The layout is good overall.';
  const mixedAnalysis = await analyzeFeedback(mixedFeedback);
  console.log(`  Sentiment: ${mixedAnalysis.sentiment}`);
  console.log(`  Aspects: ${mixedAnalysis.aspects.map(a => `${a.category} (${a.sentiment})`).join(', ')}`);
  console.log('✅ Mixed feedback analyzed\n');

  // Test 4: Learn from feedback
  console.log('--- Test 4: Learn From Feedback ---');
  await learnFromFeedback(testUserId, testBuildId, positiveFeedback);
  console.log('✅ Learned from positive feedback\n');

  // Test 5: Set up some preferences
  console.log('--- Test 5: Setup Test Preferences ---');
  await neo4j.setUserTechPreference(testUserId, 'Next.js', 1.0);
  await neo4j.setUserTechPreference(testUserId, 'TypeScript', 0.9);
  await neo4j.setUserTechPreference(testUserId, 'Tailwind CSS', 0.85);
  await neo4j.setUserDesignPattern(testUserId, 'dark-mode', 0.95);
  await neo4j.setUserDesignPattern(testUserId, 'modern-minimal', 0.8);
  await neo4j.recordLearnedComponent(testUserId, 'DashboardCard', 'ui-component', testBuildId);
  await neo4j.recordLearnedComponent(testUserId, 'DataTable', 'data-display', testBuildId);
  console.log('✅ Test preferences set\n');

  // Test 6: Get learned preferences
  console.log('--- Test 6: Get Learned Preferences ---');
  const prefs = await getLearnedPreferences(testUserId);
  console.log(`  Tech Stack: ${prefs.techStack.map(t => `${t.name}(${t.score.toFixed(2)})`).join(', ')}`);
  console.log(`  Design Patterns: ${prefs.designPatterns.map(p => `${p.name}(${p.score.toFixed(2)})`).join(', ')}`);
  console.log(`  Components: ${prefs.componentTypes.map(c => `${c.name}(${c.frequency}x)`).join(', ')}`);
  console.log('✅ Preferences retrieved\n');

  // Test 7: Get top preferences (for prompt injection)
  console.log('--- Test 7: Get Top Preferences ---');
  const topPrefs = await getTopPreferences(testUserId, 3);
  console.log(`  Top Tech: ${topPrefs.tech.join(', ')}`);
  console.log(`  Top Patterns: ${topPrefs.patterns.join(', ')}`);
  console.log(`  Top Components: ${topPrefs.components.join(', ')}`);
  console.log('✅ Top preferences retrieved\n');

  // Cleanup
  await neo4j.closeDriver();
  await mongodb.closeClient();
  await redis.closeClient();

  console.log('='.repeat(50));
  console.log('✅ Preference Learning Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

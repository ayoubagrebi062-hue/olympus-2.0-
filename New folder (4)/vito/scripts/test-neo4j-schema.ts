/**
 * OLYMPUS 2.0 - Neo4j Schema Test
 * Run: npx tsx scripts/test-neo4j-schema.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as neo4j from '../src/lib/db/neo4j';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Neo4j Schema Test');
  console.log('='.repeat(50));
  console.log('');

  // Check connection
  console.log('Checking Neo4j connection...');
  const healthy = await neo4j.healthCheck();
  if (!healthy) {
    console.error('Neo4j not available!');
    process.exit(1);
  }
  console.log('✅ Neo4j connected\n');

  // Test 1: Initialize schema
  console.log('--- Test 1: Initialize Schema ---');
  await neo4j.initializeSchema();
  console.log('✅ Schema initialized with constraints, indexes, and seed data\n');

  // Test user ID
  const testUserId = 'test-user-schema-001';
  const testEmail = 'schema-test@olympus.dev';
  const testProjectId = `project-${Date.now()}`;
  const testBuildId = `build-${Date.now()}`;

  // Test 2: Create user
  console.log('--- Test 2: Create User ---');
  await neo4j.upsertUser(testUserId, testEmail, 'Schema Test User');
  console.log('✅ User created\n');

  // Test 3: Set industry
  console.log('--- Test 3: Set User Industry ---');
  await neo4j.setUserIndustry(testUserId, 'E-commerce');
  console.log('✅ Industry set to E-commerce\n');

  // Test 4: Set tech preferences
  console.log('--- Test 4: Set Tech Preferences ---');
  await neo4j.setUserTechPreference(testUserId, 'Next.js', 1.0);
  await neo4j.setUserTechPreference(testUserId, 'TypeScript', 0.9);
  await neo4j.setUserTechPreference(testUserId, 'Tailwind CSS', 0.8);
  const techPrefs = await neo4j.getUserTechPreferences(testUserId);
  console.log(`  Tech Preferences: ${techPrefs.map(t => `${t.name} (${t.weight})`).join(', ')}`);
  console.log('✅ Tech preferences set\n');

  // Test 5: Set design pattern
  console.log('--- Test 5: Set Design Pattern ---');
  await neo4j.setUserDesignPattern(testUserId, 'modern-minimal', 1.0);
  await neo4j.setUserDesignPattern(testUserId, 'dark-mode-first', 0.8);
  const designPrefs = await neo4j.getUserDesignPatterns(testUserId);
  console.log(`  Design Patterns: ${designPrefs.map(d => `${d.name} (${d.weight})`).join(', ')}`);
  console.log('✅ Design patterns set\n');

  // Test 6: Record build
  console.log('--- Test 6: Record Build ---');
  await neo4j.recordBuild(testUserId, testProjectId, testBuildId, 'Build an e-commerce dashboard');
  console.log('✅ Build recorded\n');

  // Test 7: Record project tech
  console.log('--- Test 7: Record Project Tech ---');
  await neo4j.recordProjectTech(testProjectId, ['Next.js', 'TypeScript', 'Tailwind CSS', 'Stripe']);
  const projectTech = await neo4j.getProjectTech(testProjectId);
  console.log(`  Project Tech: ${projectTech.join(', ')}`);
  console.log('✅ Project tech recorded\n');

  // Test 8: Record learned component
  console.log('--- Test 8: Record Learned Component ---');
  await neo4j.recordLearnedComponent(testUserId, 'ProductCard', 'ui-component', testBuildId);
  await neo4j.recordLearnedComponent(testUserId, 'CheckoutForm', 'form-component', testBuildId);
  const components = await neo4j.getUserLearnedComponents(testUserId);
  console.log(`  Learned Components: ${components.map(c => `${c.name} (${c.type})`).join(', ')}`);
  console.log('✅ Components recorded\n');

  // Test 9: Get extended user context
  console.log('--- Test 9: Get Extended User Context ---');
  const extendedContext = await neo4j.getExtendedUserContext(testUserId);
  console.log(`  Industries: ${extendedContext.industries.join(', ')}`);
  console.log(`  Tech Preferences: ${extendedContext.techPreferences.length} items`);
  console.log(`  Design Patterns: ${extendedContext.designPatterns.length} items`);
  console.log(`  Learned Components: ${extendedContext.learnedComponents.length} items`);
  console.log(`  Recent Builds: ${extendedContext.recentBuilds.length} items`);
  console.log('✅ Extended context retrieved\n');

  // Test 10: Find similar projects (may be empty if this is first project)
  console.log('--- Test 10: Find Similar Projects ---');
  const similar = await neo4j.findSimilarProjects(testUserId);
  console.log(`  Found ${similar.length} similar projects`);
  console.log('✅ Similarity search complete\n');

  // Cleanup
  await neo4j.closeDriver();

  console.log('='.repeat(50));
  console.log('✅ Neo4j Schema Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

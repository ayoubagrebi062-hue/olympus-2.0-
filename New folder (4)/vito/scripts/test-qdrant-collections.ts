/**
 * OLYMPUS 2.0 - Qdrant Collections Test
 * Run: npx tsx scripts/test-qdrant-collections.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as qdrant from '../src/lib/db/qdrant';

// Generate a random embedding for testing
function randomEmbedding(size: number = 1536): number[] {
  return Array.from({ length: size }, () => Math.random() * 2 - 1);
}

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Qdrant Collections Test');
  console.log('='.repeat(50));
  console.log('');

  // Check connection
  console.log('Checking Qdrant connection...');
  const healthy = await qdrant.healthCheck();
  if (!healthy) {
    console.error('Qdrant not available!');
    process.exit(1);
  }
  console.log('✅ Qdrant connected\n');

  // Test 1: Initialize collections
  console.log('--- Test 1: Initialize Collections ---');
  await qdrant.initializeCollections();
  console.log('✅ Collections initialized\n');

  // Test 2: Get collection stats
  console.log('--- Test 2: Collection Stats ---');
  const stats = await qdrant.getCollectionStats();
  for (const [name, stat] of Object.entries(stats)) {
    console.log(`  ${name}: ${stat.pointsCount} points`);
  }
  console.log('✅ Stats retrieved\n');

  // Test user ID
  const testUserId = 'test-user-qdrant-001';
  const testProjectId = `project-${Date.now()}`;
  const testBuildId = `build-${Date.now()}`;

  // Test 3: Store prompt embedding
  console.log('--- Test 3: Store Prompt Embedding ---');
  const promptEmbedding = randomEmbedding();
  await qdrant.storePromptEmbedding(
    testUserId,
    testProjectId,
    'Build an e-commerce dashboard with product management',
    promptEmbedding,
    'success'
  );
  console.log('✅ Prompt embedding stored\n');

  // Test 4: Store code embedding
  console.log('--- Test 4: Store Code Embedding ---');
  const codeEmbedding = randomEmbedding();
  await qdrant.storeCodeEmbedding(
    testProjectId,
    'src/components/ProductCard.tsx',
    'export const ProductCard = ({ product }) => { return <div>{product.name}</div>; }',
    codeEmbedding,
    'typescript'
  );
  console.log('✅ Code embedding stored\n');

  // Test 5: Store user preference embedding
  console.log('--- Test 5: Store User Preference Embedding ---');
  const prefEmbedding = randomEmbedding();
  await qdrant.storeUserPreferenceEmbedding(
    testUserId,
    'style',
    'Modern minimal design with dark mode preference',
    prefEmbedding,
    { colors: ['#1a1a1a', '#ffffff', '#3b82f6'] }
  );
  console.log('✅ User preference embedding stored\n');

  // Test 6: Store feedback embedding
  console.log('--- Test 6: Store Feedback Embedding ---');
  const feedbackEmbedding = randomEmbedding();
  await qdrant.storeFeedbackEmbedding(
    testUserId,
    testBuildId,
    'The design looks great but needs more contrast',
    feedbackEmbedding,
    'positive',
    'design'
  );
  console.log('✅ Feedback embedding stored\n');

  // Test 7: Store design pattern embedding
  console.log('--- Test 7: Store Design Pattern Embedding ---');
  const patternEmbedding = randomEmbedding();
  await qdrant.storeDesignPatternEmbedding(
    'card-grid-layout',
    'A responsive grid of cards with hover effects',
    patternEmbedding,
    'layout',
    ['Product listing', 'Blog posts', 'Team members']
  );
  console.log('✅ Design pattern embedding stored\n');

  // Test 8: Store component embedding
  console.log('--- Test 8: Store Component Embedding ---');
  const componentEmbedding = randomEmbedding();
  await qdrant.storeComponentEmbedding(
    'DataTable',
    'A sortable, filterable data table component',
    componentEmbedding,
    'data-display',
    ['data', 'columns', 'onSort', 'onFilter'],
    'const DataTable = ({ data, columns }) => { ... }'
  );
  console.log('✅ Component embedding stored\n');

  // Test 9: Search similar prompts
  console.log('--- Test 9: Search Similar Prompts ---');
  const searchEmbedding = randomEmbedding();
  const similarPrompts = await qdrant.findSimilarPrompts(searchEmbedding, 3);
  console.log(`  Found ${similarPrompts.length} similar prompts`);
  for (const p of similarPrompts) {
    console.log(`    - "${p.prompt.substring(0, 50)}..." (${(p.similarity * 100).toFixed(1)}%)`);
  }
  console.log('✅ Prompt search complete\n');

  // Test 10: Search similar components
  console.log('--- Test 10: Search Similar Components ---');
  const similarComponents = await qdrant.findSimilarComponents(searchEmbedding, 3);
  console.log(`  Found ${similarComponents.length} similar components`);
  for (const c of similarComponents) {
    console.log(`    - ${c.componentName} (${(c.similarity * 100).toFixed(1)}%)`);
  }
  console.log('✅ Component search complete\n');

  // Test 11: Multi-collection search
  console.log('--- Test 11: Multi-Collection Search ---');
  const multiResults = await qdrant.searchMultipleCollections(
    searchEmbedding,
    [qdrant.COLLECTIONS.PROMPTS, qdrant.COLLECTIONS.COMPONENTS, qdrant.COLLECTIONS.DESIGN_PATTERNS],
    2
  );
  console.log(`  Found ${multiResults.length} results across collections`);
  for (const r of multiResults.slice(0, 5)) {
    console.log(`    - [${r.collection}] score: ${(r.score * 100).toFixed(1)}%`);
  }
  console.log('✅ Multi-collection search complete\n');

  // Test 12: Get updated stats
  console.log('--- Test 12: Updated Collection Stats ---');
  const updatedStats = await qdrant.getCollectionStats();
  for (const [name, stat] of Object.entries(updatedStats)) {
    console.log(`  ${name}: ${stat.pointsCount} points`);
  }
  console.log('✅ Stats updated\n');

  console.log('='.repeat(50));
  console.log('✅ Qdrant Collections Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

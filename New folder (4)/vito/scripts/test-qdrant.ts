/**
 * OLYMPUS 2.0 - Qdrant Connection Test
 * Run: npx tsx scripts/test-qdrant.ts
 */

import qdrant from '../src/lib/db/qdrant.js';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Qdrant Connection Test');
  console.log('='.repeat(50));
  console.log('');

  console.log('Testing Qdrant connection...');
  console.log(`URL: ${process.env.QDRANT_URL || 'http://localhost:6333'}`);
  console.log('');

  const healthy = await qdrant.healthCheck();
  console.log('Health check:', healthy ? '✅ PASS' : '❌ FAIL');

  if (healthy) {
    console.log('');

    // Initialize collections
    console.log('Initializing collections...');
    await qdrant.initializeCollections();
    console.log('Collections initialized: ✅ PASS');

    // Test vector storage (fake embedding)
    console.log('');
    console.log('Testing vector storage...');
    const fakeEmbedding = new Array(1536).fill(0).map(() => Math.random());
    await qdrant.storePromptEmbedding(
      'test-user',
      'test-project',
      'Build a landing page for a coffee shop',
      fakeEmbedding,
      'success'
    );
    console.log('Vector stored: ✅ PASS');

    // Get collection info
    console.log('');
    console.log('Collection info:');
    const info = await qdrant.getCollectionInfo(qdrant.COLLECTIONS.PROMPTS);
    console.log(`  - Points count: ${info.points_count}`);
    console.log(`  - Vector size: ${info.config.params.vectors.size}`);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(healthy ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
  console.log('='.repeat(50));

  process.exit(healthy ? 0 : 1);
}

test().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

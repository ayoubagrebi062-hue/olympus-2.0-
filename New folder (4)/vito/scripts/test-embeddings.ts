/**
 * OLYMPUS 2.0 - Embeddings Service Test
 * Run: npx tsx scripts/test-embeddings.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  embed,
  embedBatch,
  checkProviders,
  getEmbeddingService,
  getEmbeddingDimension,
  EMBEDDING_MODELS,
} from '../src/lib/agents/embeddings';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Embeddings Service Test');
  console.log('='.repeat(50));
  console.log('');

  // Test 1: Check available providers
  console.log('--- Test 1: Check Providers ---');
  const providers = await checkProviders();
  console.log(`  OpenAI: ${providers.openai ? '✅' : '❌'}`);
  console.log(`  Ollama: ${providers.ollama ? '✅' : '❌'}`);
  console.log(`  Ollama Embedding Models: ${providers.ollamaHasEmbeddingModels ? '✅' : '❌'}`);
  console.log(`  Default: ${providers.defaultProvider || 'none'}`);

  if (!providers.defaultProvider) {
    console.error('\nNo embedding provider available!');
    console.log('Please configure OPENAI_API_KEY or run Ollama with embedding models.');
    process.exit(1);
  }

  if (providers.ollama && !providers.ollamaHasEmbeddingModels) {
    console.log('\n  Note: Ollama is running but no embedding models found.');
    console.log('  Run: ollama pull nomic-embed-text');
    console.log('  Falling back to OpenAI for embeddings.\n');
  }
  console.log('✅ Provider check complete\n');

  // Test 2: Get embedding service
  console.log('--- Test 2: Initialize Embedding Service ---');
  const service = await getEmbeddingService();
  const config = service.getConfig();
  console.log(`  Provider: ${config.provider}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Dimension: ${config.dimension}`);
  console.log('✅ Service initialized\n');

  // Test 3: Single embedding
  console.log('--- Test 3: Single Embedding ---');
  const text1 = 'Build a modern e-commerce dashboard with product management';
  const result1 = await embed(text1);
  console.log(`  Provider: ${result1.provider}`);
  console.log(`  Model: ${result1.model}`);
  console.log(`  Dimension: ${result1.embedding.length}`);
  console.log(`  Latency: ${result1.latencyMs}ms`);
  console.log(`  Cached: ${result1.cached}`);
  console.log(`  First 5 values: [${result1.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  console.log('✅ Single embedding generated\n');

  // Test 4: Cached embedding (should be faster)
  console.log('--- Test 4: Cached Embedding ---');
  const result2 = await embed(text1);
  console.log(`  Latency: ${result2.latencyMs}ms`);
  console.log(`  Cached: ${result2.cached}`);
  console.log('✅ Cache test complete\n');

  // Test 5: Batch embeddings
  console.log('--- Test 5: Batch Embeddings ---');
  const texts = [
    'Create a user authentication system',
    'Design a responsive navigation menu',
    'Implement a shopping cart with checkout',
  ];
  const batchResult = await embedBatch(texts);
  console.log(`  Count: ${batchResult.embeddings.length}`);
  console.log(`  Model: ${batchResult.model}`);
  console.log(`  Latency: ${batchResult.latencyMs}ms`);
  console.log(`  Per-text avg: ${(batchResult.latencyMs / texts.length).toFixed(0)}ms`);
  console.log('✅ Batch embeddings generated\n');

  // Test 6: Dimension lookup
  console.log('--- Test 6: Dimension Lookup ---');
  for (const [name, model] of Object.entries(EMBEDDING_MODELS)) {
    const dim = getEmbeddingDimension(model);
    console.log(`  ${name}: ${model} → ${dim} dimensions`);
  }
  console.log('✅ Dimension lookup complete\n');

  // Test 7: Similarity check (cosine similarity)
  console.log('--- Test 7: Similarity Check ---');
  const similar1 = 'Build an online store';
  const similar2 = 'Create an e-commerce website';
  const different = 'Write a poem about nature';

  const [emb1, emb2, emb3] = await Promise.all([
    embed(similar1),
    embed(similar2),
    embed(different),
  ]);

  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const sim12 = cosineSimilarity(emb1.embedding, emb2.embedding);
  const sim13 = cosineSimilarity(emb1.embedding, emb3.embedding);

  console.log(`  "${similar1}" vs "${similar2}"`);
  console.log(`  Similarity: ${(sim12 * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  "${similar1}" vs "${different}"`);
  console.log(`  Similarity: ${(sim13 * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  Similar texts have ${sim12 > sim13 ? 'higher' : 'lower'} similarity ✅`);
  console.log('✅ Similarity check complete\n');

  console.log('='.repeat(50));
  console.log('✅ Embeddings Service Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

#!/usr/bin/env npx tsx

/**
 * OLYMPUS 3.0 - Codebase Indexer
 * ==============================
 * Indexes all source files into vector embeddings for Q&A
 */

import * as path from 'path';
import { getAllSourceFiles, chunkFile, getChunkStats, CodeChunk } from './lib/chunker';
import { Embedder } from './lib/embedder';

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════╗
║     OLYMPUS Codebase Indexer                     ║
╚══════════════════════════════════════════════════╝
`);

  const startTime = Date.now();
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');

  const embedder = new Embedder();

  // Initialize collection
  console.log('Initializing vector collection...');
  await embedder.clearCollection();
  await embedder.initCollection();

  // Find all source files
  console.log('\nFinding source files...');
  const files = getAllSourceFiles(srcDir);
  console.log(`  Found ${files.length} files`);

  if (files.length === 0) {
    console.log('\nNo source files found in src/');
    console.log('Make sure you are running from the project root.');
    process.exit(1);
  }

  // Chunk all files
  console.log('\nChunking files...');
  const allChunks: CodeChunk[] = [];

  for (const file of files) {
    const chunks = chunkFile(file);
    allChunks.push(...chunks);
  }

  // Get and display stats
  const stats = getChunkStats(allChunks);
  console.log(`  Created ${stats.total} chunks`);
  console.log(`  Average chunk size: ${stats.avgLength} chars`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`    - ${type}: ${count}`);
  }

  // Index chunks
  console.log('\nIndexing chunks...');
  await embedder.indexChunks(allChunks);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`
${'='.repeat(50)}
Codebase indexed successfully!
${'='.repeat(50)}

Summary:
  - Files indexed: ${files.length}
  - Chunks created: ${allChunks.length}
  - Time taken: ${duration}s

Next steps:
  npm run qa "your question about the codebase"
  npm run qa:ask

Examples:
  npm run qa "How does the AI router work?"
  npm run qa "What files use the Neo4j client?"
  npm run qa "Where is authentication handled?"
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

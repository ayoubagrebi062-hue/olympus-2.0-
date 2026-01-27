/**
 * OLYMPUS 2.0 - Example Database Indexer
 *
 * Scans all example files and indexes them into Qdrant for semantic retrieval.
 * Run with: npx ts-node src/scripts/index-examples.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ensureCollection,
  upsertVectors,
  COLLECTIONS,
  EMBEDDING_DIMENSIONS,
  getCollectionStats,
} from '../lib/db/qdrant';
import { embedBatch, checkProviders, getEmbeddingDimension } from '../lib/agents/embeddings';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ExampleMetadata {
  name: string;
  description: string;
  tags: string[];
  quality: number;
  source?: string;
  filePath: string;
  fileType: 'component' | 'schema' | 'api' | 'pattern';
  category: string;
  code: string;
}

interface IndexingResult {
  totalFiles: number;
  indexed: number;
  failed: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const COLLECTION_NAME = 'olympus_examples';
const BATCH_SIZE = 10;

// ═══════════════════════════════════════════════════════════════
// JSDOC PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Parse JSDoc-style metadata from file content
 */
function parseJSDocMetadata(content: string, filePath: string): ExampleMetadata | null {
  // Match JSDoc block at the start of the file
  const jsDocMatch = content.match(/^\/\*\*[\s\S]*?\*\//);
  if (!jsDocMatch) {
    return null;
  }

  const jsDoc = jsDocMatch[0];

  // Extract @name
  const nameMatch = jsDoc.match(/@name\s+(.+)/);
  const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, path.extname(filePath));

  // Extract @description
  const descMatch = jsDoc.match(/@description\s+(.+)/);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract @tags
  const tagsMatch = jsDoc.match(/@tags\s+(.+)/);
  const tags = tagsMatch
    ? tagsMatch[1].split(',').map((t) => t.trim().toLowerCase())
    : [];

  // Extract @quality
  const qualityMatch = jsDoc.match(/@quality\s+(\d)\/5/);
  const quality = qualityMatch ? parseInt(qualityMatch[1], 10) : 3;

  // Extract @source
  const sourceMatch = jsDoc.match(/@source\s+(.+)/);
  const source = sourceMatch ? sourceMatch[1].trim() : undefined;

  // Determine file type and category from path
  const relativePath = path.relative(EXAMPLES_DIR, filePath);
  const pathParts = relativePath.split(path.sep);

  let fileType: 'component' | 'schema' | 'api' | 'pattern' = 'component';
  let category = 'general';

  if (pathParts.length >= 2) {
    const typeFolder = pathParts[0].toLowerCase();
    category = pathParts[1].toLowerCase();

    if (typeFolder.includes('component')) {
      fileType = 'component';
    } else if (typeFolder.includes('schema')) {
      fileType = 'schema';
    } else if (typeFolder.includes('api')) {
      fileType = 'api';
    } else if (typeFolder.includes('pattern')) {
      fileType = 'pattern';
    }
  }

  return {
    name,
    description,
    tags,
    quality,
    source,
    filePath: relativePath,
    fileType,
    category,
    code: content,
  };
}

// ═══════════════════════════════════════════════════════════════
// FILE SCANNER
// ═══════════════════════════════════════════════════════════════

/**
 * Recursively scan directory for example files
 */
function scanExamplesDirectory(dir: string): string[] {
  const files: string[] = [];
  const extensions = ['.tsx', '.ts', '.prisma', '.jsx', '.js'];

  function scan(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files;
}

/**
 * Load and parse all example files
 */
function loadExamples(): ExampleMetadata[] {
  const files = scanExamplesDirectory(EXAMPLES_DIR);
  const examples: ExampleMetadata[] = [];

  console.log(`[Indexer] Found ${files.length} files to process`);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const metadata = parseJSDocMetadata(content, file);

      if (metadata) {
        examples.push(metadata);
        console.log(`  ✓ Parsed: ${metadata.name} (${metadata.fileType}/${metadata.category})`);
      } else {
        console.log(`  ⚠ Skipped (no JSDoc): ${path.basename(file)}`);
      }
    } catch (error) {
      console.error(`  ✗ Error reading ${file}:`, error);
    }
  }

  return examples;
}

// ═══════════════════════════════════════════════════════════════
// EMBEDDING GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate search text for embedding
 */
function generateSearchText(example: ExampleMetadata): string {
  const parts = [
    example.name,
    example.description,
    `Type: ${example.fileType}`,
    `Category: ${example.category}`,
    `Tags: ${example.tags.join(', ')}`,
  ];

  if (example.source) {
    parts.push(`Source: ${example.source}`);
  }

  // Include first 500 chars of code for semantic matching
  const codePreview = example.code.substring(0, 500);
  parts.push(`Code: ${codePreview}`);

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// QDRANT INDEXER
// ═══════════════════════════════════════════════════════════════

/**
 * Index examples into Qdrant in batches
 */
async function indexExamples(
  examples: ExampleMetadata[],
  vectorSize: number
): Promise<IndexingResult> {
  const result: IndexingResult = {
    totalFiles: examples.length,
    indexed: 0,
    failed: 0,
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < examples.length; i += BATCH_SIZE) {
    const batch = examples.slice(i, i + BATCH_SIZE);
    console.log(`\n[Indexer] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(examples.length / BATCH_SIZE)}`);

    try {
      // Generate search texts
      const searchTexts = batch.map(generateSearchText);

      // Generate embeddings
      const embeddingResult = await embedBatch(searchTexts);
      console.log(`  Generated ${embeddingResult.embeddings.length} embeddings via ${embeddingResult.provider}`);

      // Prepare points for Qdrant
      const points = batch.map((example, idx) => ({
        id: `example-${example.fileType}-${example.category}-${example.name.toLowerCase().replace(/\s+/g, '-')}`,
        vector: embeddingResult.embeddings[idx],
        payload: {
          name: example.name,
          description: example.description,
          tags: example.tags,
          quality: example.quality,
          source: example.source,
          filePath: example.filePath,
          fileType: example.fileType,
          category: example.category,
          codePreview: example.code.substring(0, 2000), // Store preview
          codeLength: example.code.length,
          indexedAt: new Date().toISOString(),
        },
      }));

      // Upsert to Qdrant
      await upsertVectors(COLLECTION_NAME, points);
      result.indexed += batch.length;
      console.log(`  ✓ Indexed ${batch.length} examples`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.failed += batch.length;
      result.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${errorMsg}`);
      console.error(`  ✗ Batch failed:`, errorMsg);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// COLLECTION SETUP
// ═══════════════════════════════════════════════════════════════

/**
 * Ensure the examples collection exists
 */
async function setupCollection(vectorSize: number): Promise<void> {
  console.log(`[Indexer] Setting up collection: ${COLLECTION_NAME} (vector size: ${vectorSize})`);
  await ensureCollection(COLLECTION_NAME, vectorSize);
}

// ═══════════════════════════════════════════════════════════════
// SEARCH UTILITIES
// ═══════════════════════════════════════════════════════════════

import { search as qdrantSearch, getCollectionInfo } from '../lib/db/qdrant';
import { embed, EMBEDDING_MODELS } from '../lib/agents/embeddings';

// Cache collection dimension to avoid repeated lookups
let cachedCollectionDimension: number | null = null;

/**
 * Get the dimension of the olympus_examples collection
 * Falls back to 768 (nomic-embed-text) if unknown
 */
async function getCollectionDimension(): Promise<number> {
  if (cachedCollectionDimension !== null) {
    return cachedCollectionDimension;
  }

  try {
    const info = await getCollectionInfo(COLLECTION_NAME);
    // Qdrant stores vector config in different formats
    const vectorConfig = info?.config?.params?.vectors;
    if (typeof vectorConfig === 'object' && vectorConfig.size) {
      cachedCollectionDimension = vectorConfig.size;
    } else if (info?.config?.params?.vector_size != null) {
      cachedCollectionDimension = info.config.params.vector_size;
    } else {
      // Default to 768 (nomic-embed-text) which was used to create the collection
      cachedCollectionDimension = 768;
    }
    console.log(`[searchExamples] Collection dimension detected: ${cachedCollectionDimension}`);
    return cachedCollectionDimension!;
  } catch (error) {
    console.warn('[searchExamples] Could not detect collection dimension, defaulting to 768');
    cachedCollectionDimension = 768;
    return cachedCollectionDimension;
  }
}

/**
 * Search for similar examples
 * FIXED: Now detects collection dimension and uses matching embedding model
 */
export async function searchExamples(
  query: string,
  options: {
    limit?: number;
    fileType?: 'component' | 'schema' | 'api' | 'pattern';
    category?: string;
    minQuality?: number;
    tags?: string[];
  } = {}
): Promise<Array<{
  name: string;
  description: string;
  filePath: string;
  fileType: string;
  category: string;
  quality: number;
  tags: string[];
  codePreview: string;
  similarity: number;
}>> {
  const { limit = 5, fileType, category, minQuality, tags } = options;

  // Detect collection dimension and use matching embedding model
  const collectionDim = await getCollectionDimension();

  // Select embedding model based on collection dimension
  // 768 = nomic-embed-text (Ollama)
  // 1536 = text-embedding-3-small (OpenAI)
  const embeddingOptions = collectionDim === 768
    ? { provider: 'ollama' as const, model: EMBEDDING_MODELS.OLLAMA_NOMIC }
    : { provider: 'openai' as const, model: EMBEDDING_MODELS.OPENAI_3_SMALL };

  // Generate query embedding with matching dimensions
  const queryEmbedding = await embed(query, embeddingOptions);

  // Build filter
  const mustConditions: any[] = [];

  if (fileType) {
    mustConditions.push({ key: 'fileType', match: { value: fileType } });
  }

  if (category) {
    mustConditions.push({ key: 'category', match: { value: category } });
  }

  if (minQuality) {
    mustConditions.push({ key: 'quality', range: { gte: minQuality } });
  }

  if (tags && tags.length > 0) {
    // Match any of the specified tags
    mustConditions.push({
      should: tags.map((tag) => ({
        key: 'tags',
        match: { value: tag },
      })),
    });
  }

  const filter = mustConditions.length > 0 ? { must: mustConditions } : undefined;

  // Search Qdrant
  const results = await qdrantSearch(COLLECTION_NAME, queryEmbedding.embedding, limit, filter);

  return results.map((r) => ({
    name: r.payload.name as string,
    description: r.payload.description as string,
    filePath: r.payload.filePath as string,
    fileType: r.payload.fileType as string,
    category: r.payload.category as string,
    quality: r.payload.quality as number,
    tags: r.payload.tags as string[],
    codePreview: r.payload.codePreview as string,
    similarity: r.score,
  }));
}

/**
 * Get examples by file type
 */
export async function getExamplesByType(
  fileType: 'component' | 'schema' | 'api' | 'pattern',
  query: string = '',
  limit: number = 10
): Promise<ReturnType<typeof searchExamples>> {
  const searchQuery = query || `${fileType} examples`;
  return searchExamples(searchQuery, { fileType, limit });
}

/**
 * Get examples by category
 */
export async function getExamplesByCategory(
  category: string,
  query: string = '',
  limit: number = 10
): Promise<ReturnType<typeof searchExamples>> {
  const searchQuery = query || `${category} examples`;
  return searchExamples(searchQuery, { category, limit });
}

/**
 * Get high-quality examples (4+ stars)
 */
export async function getHighQualityExamples(
  query: string,
  limit: number = 5
): Promise<ReturnType<typeof searchExamples>> {
  return searchExamples(query, { minQuality: 4, limit });
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('        OLYMPUS Example Database Indexer');
  console.log('═══════════════════════════════════════════════════════════');
  console.log();

  // Check embedding providers
  console.log('[Indexer] Checking embedding providers...');
  const providers = await checkProviders();
  console.log(`  OpenAI: ${providers.openai ? '✓' : '✗'}`);
  console.log(`  Ollama: ${providers.ollama ? '✓' : '✗'} ${providers.ollamaHasEmbeddingModels ? '(with embedding models)' : ''}`);
  console.log(`  Default: ${providers.defaultProvider}`);

  if (!providers.defaultProvider) {
    console.error('\n✗ No embedding provider available!');
    console.error('  Configure OPENAI_API_KEY or run Ollama with nomic-embed-text model.');
    process.exit(1);
  }

  // Determine vector size based on provider
  const model = providers.defaultProvider === 'ollama' ? 'nomic-embed-text' : 'text-embedding-3-small';
  const vectorSize = getEmbeddingDimension(model);
  console.log(`\n[Indexer] Using model: ${model} (dimension: ${vectorSize})`);

  // Setup collection
  await setupCollection(vectorSize);

  // Load examples
  console.log('\n[Indexer] Scanning examples directory...');
  const examples = loadExamples();

  if (examples.length === 0) {
    console.log('\n⚠ No examples found to index.');
    console.log('  Make sure example files have JSDoc comments with @name, @description, @tags.');
    process.exit(0);
  }

  console.log(`\n[Indexer] Found ${examples.length} examples to index`);

  // Index examples
  console.log('\n[Indexer] Starting indexing...');
  const result = await indexExamples(examples, vectorSize);

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    INDEXING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total files:  ${result.totalFiles}`);
  console.log(`  Indexed:      ${result.indexed} ✓`);
  console.log(`  Failed:       ${result.failed} ✗`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((err) => console.log(`  - ${err}`));
  }

  // Get collection stats
  try {
    const stats = await getCollectionStats();
    console.log('\n[Qdrant] Collection stats:');
    for (const [key, value] of Object.entries(stats)) {
      console.log(`  ${key}: ${value.pointsCount} points`);
    }
  } catch {
    // Stats may not be available if Qdrant isn't running
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Examples are now searchable via semantic queries!');
  console.log('  Use searchExamples() to find relevant code examples.');
  console.log('═══════════════════════════════════════════════════════════');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { loadExamples, indexExamples, parseJSDocMetadata, COLLECTION_NAME };

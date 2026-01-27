/**
 * OLYMPUS 2.0 - Full Infrastructure Test
 * Tests all database connections: Neo4j, Qdrant, MongoDB, Redis
 * Run: npx tsx scripts/test-all-connections.ts
 */

import neo4j from '../src/lib/db/neo4j.js';
import qdrant from '../src/lib/db/qdrant.js';
import mongodb from '../src/lib/db/mongodb.js';
import redis from '../src/lib/db/redis.js';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function testNeo4j(): Promise<TestResult> {
  const name = 'Neo4j (Graph Database)';
  try {
    const healthy = await neo4j.healthCheck();
    if (!healthy) {
      return { name, passed: false, error: 'Health check failed' };
    }

    // Test user operations
    await neo4j.upsertUser('infra-test', 'test@olympus.dev', 'Infrastructure Test');
    const context = await neo4j.getUserContext('infra-test');

    return {
      name,
      passed: true,
      details: `URI: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`,
    };
  } catch (error: any) {
    return { name, passed: false, error: error.message };
  }
}

async function testQdrant(): Promise<TestResult> {
  const name = 'Qdrant (Vector Database)';
  try {
    const healthy = await qdrant.healthCheck();
    if (!healthy) {
      return { name, passed: false, error: 'Health check failed' };
    }

    // Initialize collections
    await qdrant.initializeCollections();

    // Get collection info
    const info = await qdrant.getCollectionInfo(qdrant.COLLECTIONS.PROMPTS);

    return {
      name,
      passed: true,
      details: `URL: ${process.env.QDRANT_URL || 'http://localhost:6333'} | Points: ${info.points_count}`,
    };
  } catch (error: any) {
    return { name, passed: false, error: error.message };
  }
}

async function testMongoDB(): Promise<TestResult> {
  const name = 'MongoDB (Document Store)';
  try {
    const healthy = await mongodb.healthCheck();
    if (!healthy) {
      return { name, passed: false, error: 'Health check failed' };
    }

    // Test build logging
    const testId = `infra-test-${Date.now()}`;
    await mongodb.logBuild(testId, 'infra-test', 'test-project', 'Infrastructure test');
    const build = await mongodb.getBuild(testId);

    return {
      name,
      passed: true,
      details: `URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/olympus'}`,
    };
  } catch (error: any) {
    return { name, passed: false, error: error.message };
  }
}

async function testRedis(): Promise<TestResult> {
  const name = 'Redis (Cache/Sessions)';
  try {
    const healthy = await redis.healthCheck();
    if (!healthy) {
      return { name, passed: false, error: 'Health check failed' };
    }

    // Test cache operations
    await redis.setCache('infra-test', { timestamp: Date.now() }, 60);
    const cached = await redis.getCache('infra-test');
    await redis.deleteCache('infra-test');

    return {
      name,
      passed: true,
      details: `URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`,
    };
  } catch (error: any) {
    return { name, passed: false, error: error.message };
  }
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           OLYMPUS 2.0 - Infrastructure Test                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Testing all database connections for Blueprint stack      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: TestResult[] = [];

  // Run all tests
  console.log('Testing Neo4j...');
  results.push(await testNeo4j());

  console.log('Testing Qdrant...');
  results.push(await testQdrant());

  console.log('Testing MongoDB...');
  results.push(await testMongoDB());

  console.log('Testing Redis...');
  results.push(await testRedis());

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                       RESULTS                              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`║ ${status} │ ${result.name.padEnd(40)} ║`);
    if (result.details) {
      console.log(`║        │ ${result.details.substring(0, 48).padEnd(40)} ║`);
    }
    if (result.error) {
      console.log(`║        │ Error: ${result.error.substring(0, 40).padEnd(40)} ║`);
      allPassed = false;
    }
  }

  console.log('╠════════════════════════════════════════════════════════════╣');
  const summary = allPassed
    ? '✅ ALL INFRASTRUCTURE TESTS PASSED'
    : '❌ SOME TESTS FAILED';
  console.log(`║ ${summary.padEnd(58)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Cleanup
  await neo4j.closeDriver();
  await mongodb.closeClient();
  await redis.closeClient();

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Infrastructure test failed:', error);
  process.exit(1);
});

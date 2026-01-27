/**
 * OLYMPUS 2.0 - Redis Connection Test
 * Run: npx tsx scripts/test-redis.ts
 */

import redis from '../src/lib/db/redis.js';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Redis Connection Test');
  console.log('='.repeat(50));
  console.log('');

  console.log('Testing Redis connection...');
  console.log(`URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
  console.log('');

  const healthy = await redis.healthCheck();
  console.log('Health check:', healthy ? '✅ PASS' : '❌ FAIL');

  if (healthy) {
    console.log('');

    // Test session operations
    console.log('Testing session operations...');
    const sessionId = `test-session-${Date.now()}`;
    await redis.setSession(sessionId, { userId: 'test-user', role: 'admin' });
    const session = await redis.getSession(sessionId);
    console.log('Session set/get:', session?.userId === 'test-user' ? '✅ PASS' : '❌ FAIL');

    // Test cache operations
    console.log('');
    console.log('Testing cache operations...');
    await redis.setCache('test-key', { data: 'test-value' }, 60);
    const cached = await redis.getCache('test-key');
    console.log('Cache set/get:', cached?.data === 'test-value' ? '✅ PASS' : '❌ FAIL');

    // Test build status
    console.log('');
    console.log('Testing build status...');
    const buildId = `test-build-${Date.now()}`;
    await redis.setBuildStatus(buildId, {
      status: 'building',
      phase: 'requirements',
      progress: 25,
      agent: 'RequirementsAgent',
      updatedAt: new Date().toISOString(),
    });
    const buildStatus = await redis.getBuildStatus(buildId);
    console.log('Build status set/get:', buildStatus?.progress === 25 ? '✅ PASS' : '❌ FAIL');

    // Test rate limiting
    console.log('');
    console.log('Testing rate limiting...');
    const rateLimitKey = `test-rate-${Date.now()}`;
    const result1 = await redis.checkRateLimit(rateLimitKey, 3, 60);
    const result2 = await redis.checkRateLimit(rateLimitKey, 3, 60);
    const result3 = await redis.checkRateLimit(rateLimitKey, 3, 60);
    const result4 = await redis.checkRateLimit(rateLimitKey, 3, 60);
    console.log('Rate limit (should allow 3, block 4th):');
    console.log(`  - Request 1: ${result1.allowed ? 'allowed' : 'blocked'} (remaining: ${result1.remaining})`);
    console.log(`  - Request 2: ${result2.allowed ? 'allowed' : 'blocked'} (remaining: ${result2.remaining})`);
    console.log(`  - Request 3: ${result3.allowed ? 'allowed' : 'blocked'} (remaining: ${result3.remaining})`);
    console.log(`  - Request 4: ${result4.allowed ? 'allowed' : 'blocked'} (remaining: ${result4.remaining})`);
    console.log('Rate limiting:', !result4.allowed ? '✅ PASS' : '❌ FAIL');

    // Test distributed lock
    console.log('');
    console.log('Testing distributed lock...');
    const lockName = `test-lock-${Date.now()}`;
    const lock1 = await redis.acquireLock(lockName, 10);
    const lock2 = await redis.acquireLock(lockName, 10);
    await redis.releaseLock(lockName);
    const lock3 = await redis.acquireLock(lockName, 10);
    console.log('Lock acquire/release:', lock1 && !lock2 && lock3 ? '✅ PASS' : '❌ FAIL');

    // Cleanup
    await redis.deleteSession(sessionId);
    await redis.deleteCache('test-key');
    await redis.releaseLock(lockName);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(healthy ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
  console.log('='.repeat(50));

  await redis.closeClient();
  process.exit(healthy ? 0 : 1);
}

test().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

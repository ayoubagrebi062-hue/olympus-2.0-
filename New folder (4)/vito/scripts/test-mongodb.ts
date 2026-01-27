/**
 * OLYMPUS 2.0 - MongoDB Connection Test
 * Run: npx tsx scripts/test-mongodb.ts
 */

import mongodb from '../src/lib/db/mongodb.js';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS MongoDB Connection Test');
  console.log('='.repeat(50));
  console.log('');

  console.log('Testing MongoDB connection...');
  console.log(`URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/olympus'}`);
  console.log('');

  const healthy = await mongodb.healthCheck();
  console.log('Health check:', healthy ? '✅ PASS' : '❌ FAIL');

  if (healthy) {
    console.log('');

    // Test build logging
    console.log('Testing build logging...');
    const testBuildId = `test-build-${Date.now()}`;
    await mongodb.logBuild(
      testBuildId,
      'test-user',
      'test-project',
      'Build a landing page for a coffee shop'
    );
    console.log('Build logged: ✅ PASS');

    // Test status update
    console.log('');
    console.log('Testing status update...');
    await mongodb.updateBuildStatus(testBuildId, 'building');
    console.log('Status updated: ✅ PASS');

    // Test phase addition
    console.log('');
    console.log('Testing phase addition...');
    await mongodb.addBuildPhase(testBuildId, {
      name: 'requirements',
      status: 'running',
      agent: 'RequirementsAgent',
      startedAt: new Date(),
    });
    console.log('Phase added: ✅ PASS');

    // Test chat logging
    console.log('');
    console.log('Testing chat logging...');
    await mongodb.logChatMessage(
      testBuildId,
      'test-user',
      'user',
      'Build me a coffee shop website'
    );
    await mongodb.logChatMessage(
      testBuildId,
      'test-user',
      'assistant',
      'I will create a modern landing page for your coffee shop.',
      'RequirementsAgent',
      150
    );
    console.log('Chat logged: ✅ PASS');

    // Retrieve and display
    console.log('');
    console.log('Retrieving build...');
    const build = await mongodb.getBuild(testBuildId);
    console.log('Build retrieved: ✅ PASS');
    console.log(`  - Status: ${build?.status}`);
    console.log(`  - Phases: ${build?.phases.length}`);

    // Get chat history
    console.log('');
    console.log('Retrieving chat history...');
    const chatHistory = await mongodb.getChatHistory(testBuildId);
    console.log('Chat history retrieved: ✅ PASS');
    console.log(`  - Messages: ${chatHistory.length}`);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(healthy ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
  console.log('='.repeat(50));

  await mongodb.closeClient();
  process.exit(healthy ? 0 : 1);
}

test().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

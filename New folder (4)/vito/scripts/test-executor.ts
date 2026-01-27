/**
 * OLYMPUS 2.0 - Executor with Routing Test
 * Run: npx tsx scripts/test-executor.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getRouter, routedExecute } from '../src/lib/agents/providers/router';
import { initializeProviders, startHealthMonitoring, getHealthMonitor } from '../src/lib/agents/providers';
import { AIMessage } from '../src/lib/agents/providers/types';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Executor with Routing Test');
  console.log('='.repeat(50));
  console.log('');

  // Initialize providers
  console.log('Initializing providers...');
  const providers = await initializeProviders();

  if (!providers.ollama && !providers.groq) {
    console.error('No providers available!');
    process.exit(1);
  }

  // Start health monitoring
  startHealthMonitoring();

  // Check all providers
  const monitor = getHealthMonitor();
  await monitor.checkAll();

  // Test agent execution with routing
  const testAgents = [
    { id: 'oracle', description: 'Discovery agent - should use Ollama/DeepSeek' },
    { id: 'pixel', description: 'Frontend agent - should use Ollama/Llama' },
    { id: 'junit', description: 'Testing agent - should use Groq (fast)' },
  ];

  for (const agent of testAgents) {
    console.log(`\n--- Testing: ${agent.id} ---`);
    console.log(`Expected: ${agent.description}`);

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: 'What are 3 key features of a todo app? List them briefly.' },
    ];

    const startTime = Date.now();
    const result = await routedExecute(agent.id, { messages, maxTokens: 200 });

    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Provider: ${result.providersUsed.join(' → ')}`);
    console.log(`Latency: ${Date.now() - startTime}ms`);
    console.log(`Cost: $${result.totalCost.toFixed(6)} ${result.totalCost === 0 ? '(FREE!)' : ''}`);

    if (result.success && result.response) {
      const preview = result.response.content.substring(0, 150);
      console.log(`Response: ${preview}...`);
    } else {
      console.log(`Error: ${result.error}`);
    }
  }

  // Print health report
  console.log('');
  monitor.printReport();

  // Summary
  const stats = getRouter().getStats();
  console.log('Executor Stats:');
  console.log(`  Available providers: ${stats.availableProviders.join(', ')}`);

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Executor Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

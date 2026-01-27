/**
 * OLYMPUS 2.0 - AI Router Test
 * Run: npx tsx scripts/test-router.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getRouter, routedExecute } from '../src/lib/agents/providers/router';
import { AIMessage } from '../src/lib/agents/providers/types';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS AI Router Test');
  console.log('='.repeat(50));
  console.log('');

  const router = getRouter();
  const stats = router.getStats();

  console.log('Available providers:', stats.availableProviders.join(', '));

  // Test routing for different agents
  const testAgents = [
    { id: 'oracle', category: 'discovery', expected: 'ollama' },
    { id: 'pixel', category: 'frontend', expected: 'ollama' },
    { id: 'junit', category: 'testing', expected: 'groq' },
  ];

  for (const agent of testAgents) {
    console.log(`\n--- Testing agent: ${agent.id} (${agent.category}) ---`);
    console.log(`Expected primary: ${agent.expected}`);

    const messages: AIMessage[] = [
      { role: 'user', content: 'What is 2 + 2? Reply with just the number.' }
    ];

    const startTime = Date.now();
    const result = await routedExecute(agent.id, { messages, maxTokens: 50 });
    const latency = Date.now() - startTime;

    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Providers tried: ${result.providersUsed.join(' → ')}`);
    console.log(`Latency: ${latency}ms`);
    console.log(`Cost: $${result.totalCost.toFixed(6)}`);

    if (result.success && result.response) {
      const preview = result.response.content.trim().substring(0, 50);
      console.log(`Response: "${preview}${result.response.content.length > 50 ? '...' : ''}"`);
    } else {
      console.log(`Error: ${result.error}`);
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Router Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

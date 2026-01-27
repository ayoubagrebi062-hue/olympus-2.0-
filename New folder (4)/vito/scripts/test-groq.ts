/**
 * OLYMPUS 2.0 - Groq Provider Test
 * Run: npx tsx scripts/test-groq.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getGroqProvider, isGroqAvailable, groqComplete, GROQ_MODELS } from '../src/lib/agents/providers/groq';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Groq Provider Test');
  console.log('='.repeat(50));
  console.log('');

  // Check availability
  console.log('Checking Groq availability...');
  const available = await isGroqAvailable();
  console.log('Groq available:', available ? '✅ YES' : '❌ NO');

  if (!available) {
    console.log('\n⚠️ Check GROQ_API_KEY in .env.local');
    process.exit(1);
  }

  // List models
  console.log('');
  console.log('Available models:');
  const provider = getGroqProvider();
  const models = await provider.getModels();
  models.slice(0, 5).forEach(m => console.log(`  - ${m}`));

  // Test completion (using fast 8B model)
  console.log('');
  console.log('Testing completion with Llama 3.1 8B...');
  const startTime = Date.now();

  try {
    const response = await groqComplete(
      'What is 2 + 2? Reply with just the number.',
      {
        model: GROQ_MODELS.LLAMA_8B,
        temperature: 0,
        maxTokens: 50,
      }
    );

    const latency = Date.now() - startTime;
    console.log(`Response: "${response.trim()}"`);
    console.log(`Latency: ${latency}ms`);
    console.log('Groq Llama 8B: ✅ PASS');

    // Show speed comparison
    const localLatency = 9000; // Llama 3.1 local was ~9s
    console.log(`\n💡 Groq is ${Math.round(localLatency / latency)}x faster than local inference`);
  } catch (error) {
    console.log('Groq Llama 8B: ❌ FAIL', error);
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Groq Provider Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

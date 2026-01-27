/**
 * OLYMPUS 2.0 - Ollama Provider Test
 * Run: npx tsx scripts/test-ollama.ts
 */

import { getOllamaProvider, isOllamaRunning, listOllamaModels, ollamaComplete } from '../src/lib/agents/providers/ollama';

async function test() {
  console.log('='.repeat(50));
  console.log('OLYMPUS Ollama Provider Test');
  console.log('='.repeat(50));
  console.log('');

  // Check availability
  console.log('Checking Ollama availability...');
  const running = await isOllamaRunning();
  console.log('Ollama running:', running ? '✅ YES' : '❌ NO');

  if (!running) {
    console.log('\n⚠️ Start Ollama first: ollama serve');
    process.exit(1);
  }

  // List models
  console.log('');
  console.log('Installed models:');
  const models = await listOllamaModels();
  models.forEach(m => console.log(`  - ${m}`));

  // Test completion with DeepSeek-R1
  console.log('');
  console.log('Testing completion with DeepSeek-R1...');
  const startTime = Date.now();

  try {
    const response = await ollamaComplete(
      'What is 2 + 2? Reply with just the number.',
      {
        model: 'deepseek-r1:latest',
        temperature: 0,
        maxTokens: 50,
      }
    );

    const latency = Date.now() - startTime;
    console.log(`Response: "${response.trim().substring(0, 100)}..."`);
    console.log(`Latency: ${latency}ms`);
    console.log('DeepSeek-R1: ✅ PASS');
  } catch (error) {
    console.log('DeepSeek-R1: ❌ FAIL', error);
  }

  // Test with Llama 3.1
  console.log('');
  console.log('Testing completion with Llama 3.1...');
  const startTime2 = Date.now();

  try {
    const response = await ollamaComplete(
      'Say hello in one word.',
      {
        model: 'llama3.1:latest',
        temperature: 0,
        maxTokens: 20,
      }
    );

    const latency = Date.now() - startTime2;
    console.log(`Response: "${response.trim().substring(0, 50)}"`);
    console.log(`Latency: ${latency}ms`);
    console.log('Llama 3.1: ✅ PASS');
  } catch (error) {
    console.log('Llama 3.1: ❌ FAIL', error);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('✅ Ollama Provider Test Complete');
  console.log('='.repeat(50));

  process.exit(0);
}

test().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

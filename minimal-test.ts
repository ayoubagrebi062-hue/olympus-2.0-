import { config } from 'dotenv';
config({ path: '.env' });
import { PipelineRunner } from './src/lib/agents/pipeline/runner';

async function minimalTest() {
  console.log('Testing minimal pipeline execution with RAG disabled...');

  try {
    // Create runner with RAG disabled for speed
    const runner = new PipelineRunner({
      enableRAG: false,
      targetScore: 80,
      maxIterations: 1,
    });

    const result = await runner.run('Create a simple button component', 'react');

    console.log('✅ Minimal test passed!');
    console.log('Generated:', result.filename);
    console.log('Score:', result.review?.score);
  } catch (error) {
    console.error('❌ Minimal test failed:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
  }
}

minimalTest();

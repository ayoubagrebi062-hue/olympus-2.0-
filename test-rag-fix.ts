import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';

async function testRAGFix() {
  console.log('Testing RAG fix...');

  try {
    const result = await generateComponent('Build a simple button component with hover effects', {
      framework: 'react',
      targetScore: 90,
      maxIterations: 1,
    });

    console.log('✅ RAG fix successful!');
    console.log('Generated component:', result.filename);
    console.log('Score:', result.review?.score);
  } catch (error) {
    console.error('❌ RAG still broken:', error);
  }
}

testRAGFix();

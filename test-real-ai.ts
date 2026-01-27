import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';

async function testRealAI() {
  console.log('🧪 Testing Real AI Integration...');

  try {
    const result = await generateComponent(
      'Create a beautiful button component with hover effects and TypeScript',
      {
        framework: 'react',
        targetScore: 95,
        maxIterations: 1,
      }
    );

    console.log('✅ AI Integration Test Complete');
    console.log('📦 Filename:', result.filename);
    console.log('📏 Code Length:', result.code.length);
    console.log('🎖️ Quality Score:', result.review.score);
    console.log('📄 Generated Code Preview:');
    console.log(result.code.substring(0, 300) + '...');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealAI();

import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function testBuilder() {
  console.log('Testing OLYMPUS Builder with enhanced UI...');

  try {
    // Test 1: Build enhanced marketing landing page
    console.log('Building enhanced marketing landing page...');
    const result1 = await generateComponent(
      'Build a stunning marketing landing page with hero section, features grid, testimonials carousel, pricing table, and FAQ. Include advanced animations, photo generation integration, and conversion optimization. Make it 50X better than competitors.',
      {
        framework: 'react',
        targetScore: 95,
        maxIterations: 2,
      }
    );
    console.log('✅ Marketing page built:', result1.filename);

    // Save the generated code
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const filePath = path.join(outputDir, result1.filename);
    fs.writeFileSync(filePath, result1.code);
    console.log('💾 Code saved to:', filePath);

    console.log('🎉 Enhanced build completed successfully!');
    console.log('Generated code saved to ./generated/');

  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

testBuilder();
import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function buildDashboard() {
  console.log('Building enhanced dashboard...');

  try {
    const result = await generateComponent(
      'Build a comprehensive platform dashboard with sidebar navigation, real-time notifications system, advanced analytics charts, drag-drop widget customization, and multi-language support. Include complex animations and photo generation for user avatars. Make it 50X better than Linear/Notion.',
      {
        framework: 'react',
        targetScore: 95,
        maxIterations: 2,
      }
    );
    console.log('✅ Dashboard built:', result.filename);

    // Save the generated code
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const filePath = path.join(outputDir, result.filename);
    fs.writeFileSync(filePath, result.code);
    console.log('💾 Code saved to:', filePath);

    console.log('🎉 Dashboard build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

buildDashboard();

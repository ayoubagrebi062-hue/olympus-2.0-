import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function buildSidebar() {
  console.log('Building Sidebar component...');

  try {
    const result = await generateComponent(
      'Build a professional sidebar navigation component with menu items, icons, collapsible sections, and user profile section. Include hover effects, active states, and responsive design. Make it part of a 50X design system.',
      {
        framework: 'react',
        targetScore: 95,
        maxIterations: 2,
      }
    );
    console.log('✅ Sidebar built:', result.filename);

    // Save to dashboard directory
    const outputDir = path.join(process.cwd(), 'generated');
    const filePath = path.join(outputDir, 'Sidebar.tsx');
    fs.writeFileSync(filePath, result.code);
    console.log('💾 Code saved to:', filePath);
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

buildSidebar();

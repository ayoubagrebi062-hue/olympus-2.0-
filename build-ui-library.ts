import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function buildUIComponents() {
  console.log('Building enhanced UI component library...');

  try {
    const result = await generateComponent(
      'Build a complete UI component library with atoms (buttons, inputs, badges), molecules (forms, cards, tooltips), and organisms (navigation bars, modals, data tables). Include advanced animations, glassmorphism effects, accessibility features, and photo generation integration for avatars. Make it 50X better than shadcn/ui.',
      {
        framework: 'react',
        targetScore: 95,
        maxIterations: 2,
      }
    );
    console.log('✅ UI library built:', result.filename);

    // Save the generated code
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const filePath = path.join(outputDir, result.filename);
    fs.writeFileSync(filePath, result.code);
    console.log('💾 Code saved to:', filePath);

    console.log('🎉 UI component library completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

buildUIComponents();

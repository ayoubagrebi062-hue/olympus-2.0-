import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function perfectComponentMission() {
  console.log('🎯 EXECUTING PERFECT COMPONENT MISSION');
  console.log('Targeting 100% quality score with focused, achievable scope...\n');

  try {
    const missionPrompt = `
# PERFECT COMPONENT MISSION

Create a single, perfect React component that demonstrates 50X quality:

## REQUIREMENTS
- Component: Advanced Data Table with sorting, filtering, pagination
- Framework: React + TypeScript
- Styling: Tailwind CSS with glassmorphism
- Features: Full CRUD operations, search, export, responsive
- Quality: 100% accessibility, performance optimized, error handling
- Animations: Smooth transitions, loading states
- Integration: Ready for API calls, state management

## STANDARDS
- WCAG AA accessibility compliance
- 60fps animations
- Mobile-first responsive
- Comprehensive error boundaries
- TypeScript strict mode
- Zero console errors
- Production deployment ready

Make this component so perfect it could be featured in design systems like Ant Design or Material UI.
`;

    console.log('📝 MISSION BRIEF LENGTH:', missionPrompt.length, 'characters');
    console.log('🎯 TARGET: 100% Quality Score');
    console.log('⚡ SCOPE: Single perfect component');

    const result = await generateComponent(
      missionPrompt,
      {
        framework: 'react',
        targetScore: 100, // Maximum quality target
        maxIterations: 3,
      }
    );

    console.log('\n✅ MISSION ACCOMPLISHED!');
    console.log('📦 Generated Component:', result.filename);
    console.log('📏 Code Size:', result.code.length, 'characters');
    console.log('🎖️ Quality Score:', result.review?.score || 'Unknown');
    console.log('⭐ Target Achieved:', (result.review?.score || 0) >= 100 ? 'YES' : 'NO');

    if ((result.review?.score || 0) >= 100) {
      console.log('🏆 PERFECT SCORE ACHIEVED! 100% QUALITY!');
    }

    // Save the masterpiece
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const filePath = path.join(outputDir, result.filename);
    fs.writeFileSync(filePath, result.code);
    console.log('💾 Masterpiece saved to:', filePath);

  } catch (error) {
    console.error('\n❌ MISSION FAILED:', error);
  }
}

perfectComponentMission();
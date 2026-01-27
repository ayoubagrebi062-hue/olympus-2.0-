import { config } from 'dotenv';
config({ path: '.env' });
import { generateComponent } from './src/lib/agents/pipeline/runner';
import * as fs from 'fs';
import * as path from 'path';

async function buildAllSubComponents() {
  const components = [
    {
      name: 'Notifications',
      prompt:
        'Build a notifications component with real-time alerts, dismissible messages, and different notification types (success, warning, error, info). Include animations and accessibility features.',
      filename: 'Notifications.tsx',
    },
    {
      name: 'AnalyticsCharts',
      prompt:
        'Build an analytics charts component with interactive charts, data visualization, and real-time updates. Include bar charts, line graphs, and pie charts with hover effects.',
      filename: 'AnalyticsCharts.tsx',
    },
    {
      name: 'Widgets',
      prompt:
        'Build a customizable widgets component system with drag-drop functionality, widget gallery, and different widget types (stats, charts, lists, calendars).',
      filename: 'Widgets.tsx',
    },
    {
      name: 'LanguageSwitcher',
      prompt:
        'Build a language switcher component with dropdown menu, flag icons, and language detection. Support multiple languages with smooth transitions.',
      filename: 'LanguageSwitcher.tsx',
    },
    {
      name: 'AvatarGenerator',
      prompt:
        'Build an AI-powered avatar generator with photo upload, AI enhancement, and avatar customization. Integrate with photo generation APIs for professional results.',
      filename: 'AvatarGenerator.tsx',
    },
  ];

  const outputDir = path.join(process.cwd(), 'generated');

  for (const component of components) {
    console.log(`\n🔨 Building ${component.name}...`);

    try {
      const result = await generateComponent(
        component.prompt +
          ' Make it part of a 50X design system with professional styling and animations.',
        {
          framework: 'react',
          targetScore: 95,
          maxIterations: 2,
        }
      );

      console.log(`✅ ${component.name} built:`, result.filename);

      const filePath = path.join(outputDir, component.filename);
      fs.writeFileSync(filePath, result.code);
      console.log(`💾 Saved to: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to build ${component.name}:`, error);
    }
  }

  console.log('\n🎉 All sub-components build attempt completed!');
}

buildAllSubComponents();

#!/usr/bin/env npx ts-node

/**
 * OLYMPUS 3.0 - README Generator
 * ==============================
 * Automatically generates README.md from codebase analysis
 */

import * as fs from 'fs';
import * as path from 'path';

interface ProjectAnalysis {
  name: string;
  description: string;
  techStack: string[];
  features: string[];
  structure: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
}

function getDirectoryStructure(dir: string, depth: number, prefix: string = ''): string {
  if (depth === 0 || !fs.existsSync(dir)) return '';

  let result = '';
  try {
    const items = fs.readdirSync(dir).filter(
      item => !item.startsWith('.') &&
              item !== 'node_modules' &&
              item !== 'dist' &&
              item !== '.next'
    );

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      result += `${prefix}${isLast ? '└── ' : '├── '}${item}\n`;

      if (stats.isDirectory()) {
        result += getDirectoryStructure(
          fullPath,
          depth - 1,
          prefix + (isLast ? '    ' : '│   ')
        );
      }
    });
  } catch {
    // Ignore permission errors
  }

  return result;
}

function analyzeProject(rootDir: string): ProjectAnalysis {
  const packageJsonPath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Get directory structure
  const srcDir = path.join(rootDir, 'src');
  const structure = fs.existsSync(srcDir)
    ? getDirectoryStructure(srcDir, 3)
    : getDirectoryStructure(rootDir, 2);

  // Analyze tech stack from dependencies
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});

  const techStack: string[] = [];

  // Detect frameworks and tools
  if (deps.includes('next')) techStack.push('Next.js');
  if (deps.includes('react')) techStack.push('React');
  if (deps.includes('typescript') || devDeps.includes('typescript')) techStack.push('TypeScript');
  if (devDeps.includes('tailwindcss')) techStack.push('Tailwind CSS');
  if (deps.includes('neo4j-driver')) techStack.push('Neo4j');
  if (deps.includes('mongodb')) techStack.push('MongoDB');
  if (deps.includes('ioredis') || deps.includes('@upstash/redis')) techStack.push('Redis');
  if (deps.includes('@qdrant/js-client-rest')) techStack.push('Qdrant');
  if (deps.includes('@supabase/supabase-js')) techStack.push('Supabase');
  if (deps.includes('@anthropic-ai/sdk')) techStack.push('Anthropic Claude');
  if (deps.includes('openai')) techStack.push('OpenAI');
  if (deps.includes('stripe')) techStack.push('Stripe');
  if (devDeps.includes('vitest')) techStack.push('Vitest');
  if (devDeps.includes('@playwright/test')) techStack.push('Playwright');

  // Detect features from file structure
  const features: string[] = [];

  if (fs.existsSync(path.join(srcDir, 'lib/agents'))) {
    features.push('Multi-agent AI system');
  }
  if (fs.existsSync(path.join(srcDir, 'lib/rag'))) {
    features.push('RAG (Retrieval-Augmented Generation)');
  }
  if (fs.existsSync(path.join(srcDir, 'lib/graph'))) {
    features.push('Knowledge graph integration');
  }
  if (fs.existsSync(path.join(srcDir, 'lib/templates'))) {
    features.push('Template-based generation');
  }
  if (fs.existsSync(path.join(srcDir, 'lib/validation'))) {
    features.push('AI output validation');
  }
  if (fs.existsSync(path.join(srcDir, 'app/api'))) {
    features.push('REST API endpoints');
  }
  if (fs.existsSync(path.join(srcDir, 'components/ui'))) {
    features.push('Component library');
  }

  return {
    name: packageJson.name || 'olympus',
    description: packageJson.description || 'AI-powered SaaS builder platform',
    techStack,
    features,
    structure,
    scripts: packageJson.scripts || {},
    dependencies: deps,
    devDependencies: devDeps,
  };
}

function describeScript(name: string, command: string): string {
  const descriptions: Record<string, string> = {
    dev: 'Start development server',
    build: 'Build for production',
    start: 'Start production server',
    lint: 'Run ESLint',
    'type-check': 'Run TypeScript compiler check',
    test: 'Run unit tests',
    'test:watch': 'Run tests in watch mode',
    'test:e2e': 'Run end-to-end tests',
    'test:e2e:ui': 'Run E2E tests with UI',
    'test:e2e:headed': 'Run E2E tests in headed mode',
    'test:e2e:debug': 'Debug E2E tests',
    'test:full': 'Run all checks (type-check, lint, build)',
    'docs:all': 'Generate all documentation',
    'docs:readme': 'Generate README',
    'docs:adr': 'Generate Architecture Decision Records',
  };

  return descriptions[name] || command.slice(0, 60) + (command.length > 60 ? '...' : '');
}

function generateReadme(rootDir: string): string {
  console.log('Analyzing project...');
  const analysis = analyzeProject(rootDir);

  console.log('Generating README...');

  const readme = `# ${analysis.name}

> ${analysis.description}

## Features

${analysis.features.length > 0
  ? analysis.features.map(f => `- ${f}`).join('\n')
  : '- AI-powered code generation\n- Multi-agent architecture\n- Real-time preview'}

## Tech Stack

${analysis.techStack.map(t => `- ${t}`).join('\n')}

## Project Structure

\`\`\`
src/
${analysis.structure}
\`\`\`

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for databases)

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${analysis.name}

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev
\`\`\`

### Environment Variables

Create a \`.env.local\` file with:

\`\`\`env
# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Databases
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

MONGODB_URI=mongodb://localhost:27017/olympus

REDIS_URL=redis://localhost:6379

QDRANT_URL=http://localhost:6333

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Ollama (for local inference)
OLLAMA_BASE_URL=http://localhost:11434
\`\`\`

## Available Scripts

${Object.entries(analysis.scripts)
  .filter(([key]) => !key.startsWith('_'))
  .slice(0, 15) // Limit to 15 most important scripts
  .map(([key, value]) => `- \`npm run ${key}\` - ${describeScript(key, value as string)}`)
  .join('\n')}

## Architecture

OLYMPUS uses a multi-agent architecture where specialized AI agents collaborate to build SaaS applications:

\`\`\`
                    ┌─────────────┐
                    │   Executor  │
                    │  (Orchestr) │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │   Frontend  │ │   Backend   │ │   Design    │
    │    Agent    │ │    Agent    │ │    Agent    │
    └─────────────┘ └─────────────┘ └─────────────┘
\`\`\`

## Testing

\`\`\`bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Type checking
npm run type-check
\`\`\`

## Documentation

- [User Acceptance Criteria](docs/USER-ACCEPTANCE-CRITERIA.md)
- [Architecture Decisions](docs/adr/)
- [API Documentation](docs/generated/API.generated.md)

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing\`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*This README was auto-generated on ${new Date().toISOString().split('T')[0]}*
`;

  return readme;
}

// Main execution
async function main(): Promise<void> {
  try {
    const rootDir = process.cwd();
    const readme = generateReadme(rootDir);

    // Write to docs/generated
    const outputDir = path.join(rootDir, 'docs', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'README.generated.md');
    fs.writeFileSync(outputPath, readme);

    console.log(`\nREADME generated at ${outputPath}`);
    console.log('Review and copy to project root when ready.');
  } catch (error) {
    console.error('Error generating README:', error);
    process.exit(1);
  }
}

main();

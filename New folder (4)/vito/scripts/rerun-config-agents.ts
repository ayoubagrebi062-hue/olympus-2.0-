/**
 * RE-RUN CONFIG AGENTS
 *
 * Re-runs ARCHON and FORGE agents specifically to generate missing config files:
 * - package.json
 * - tsconfig.json
 * - tsconfig.node.json
 * - next.config.js
 * - postcss.config.js
 * - tailwind.config.ts
 * - .env.example
 * - .gitignore
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

// Validate environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✓' : '✗');
  console.error('  ANTHROPIC_API_KEY:', ANTHROPIC_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_KEY,
});

const CONFIG_FILES_PROMPT = `
You are a senior Next.js architect. Your ONLY task is to generate the missing configuration files for an OLYMPUS-built Next.js 14 project.

Based on the architecture decisions already made for this build, generate these EXACT config files:

## REQUIRED FILES TO GENERATE

### 1. package.json
Generate a complete package.json with:
- Next.js 14+
- React 18
- Supabase (@supabase/supabase-js, @supabase/ssr)
- Prisma
- Tailwind CSS
- shadcn/ui dependencies (class-variance-authority, clsx, tailwind-merge)
- Lucide React icons
- Framer Motion
- Zod
- Zustand
- All necessary devDependencies (TypeScript, ESLint, etc.)

### 2. tsconfig.json
Standard Next.js 14 tsconfig with:
- Strict mode
- Path aliases (@/*)
- Next.js plugin

### 3. tsconfig.node.json
For Vite/build tools compatibility:
- Composite: true
- Include vite.config.ts, tailwind.config.ts, postcss.config.js

### 4. next.config.js
Standard Next.js 14+ config:
- reactStrictMode: true
- Image configuration with remotePatterns
- ESLint ignoreDuringBuilds: false
- TypeScript ignoreBuildErrors: false

⚠️ CRITICAL: DO NOT USE DEPRECATED OPTIONS:
- NO experimental.appDir (removed in Next.js 14+)
- NO experimental.serverActions (enabled by default in Next.js 14+)

EXACT TEMPLATE TO USE:
\`\`\`js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
\`\`\`

### 5. postcss.config.js
Standard PostCSS for Tailwind:
- tailwindcss plugin
- autoprefixer plugin

### 6. tailwind.config.ts
Complete Tailwind config with:
- Content paths for src/
- shadcn/ui CSS variable theme
- Dark mode support

### 7. .env.example
Template for required environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL

### 8. .gitignore
Standard Next.js gitignore:
- node_modules
- .next
- .env files
- IDE files

## OUTPUT FORMAT

Return a JSON array of artifacts. Each artifact MUST have:
- type: "config"
- path: the exact file path (e.g., "package.json", "tsconfig.json")
- content: the complete file content as a string

Example:
{
  "artifacts": [
    {
      "type": "config",
      "path": "package.json",
      "content": "{ ... full content ... }"
    },
    ...
  ]
}

CRITICAL: Generate ALL 8 files. Do not skip any. Include complete, valid content for each.
`;

async function loadBuildContext(): Promise<string> {
  // Load the original build description
  const { data: build } = await supabase
    .from('builds')
    .select('description, config')
    .eq('id', BUILD_ID)
    .single();

  // Load ARCHON's architecture decisions
  const { data: archon } = await supabase
    .from('build_agent_outputs')
    .select('artifacts')
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'archon')
    .single();

  const archonDoc = archon?.artifacts?.find((a: any) => a.type === 'document');

  return `
## BUILD DESCRIPTION
${build?.description || 'OLYMPUS self-build project'}

## ARCHITECTURE DECISIONS (from ARCHON)
${archonDoc?.content || 'Standard Next.js 14 App Router with Supabase, Prisma, Tailwind CSS, shadcn/ui'}
`;
}

async function generateConfigFiles(context: string): Promise<any[]> {
  console.log('[ConfigAgent] Calling Claude to generate config files...');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: `${CONFIG_FILES_PROMPT}\n\n## BUILD CONTEXT\n${context}`,
      },
    ],
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse the JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*"artifacts"[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Response:', content.text.substring(0, 500));
    throw new Error('Failed to extract artifacts JSON from response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.artifacts || [];
}

async function saveArtifacts(artifacts: any[]): Promise<void> {
  // Load existing ARCHON output
  const { data: existing } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'archon')
    .single();

  if (!existing) {
    throw new Error('ARCHON output not found');
  }

  // Merge new artifacts with existing
  const existingArtifacts = existing.artifacts || [];
  const mergedArtifacts = [...existingArtifacts, ...artifacts];

  // Update ARCHON output with config files
  const { error } = await supabase
    .from('build_agent_outputs')
    .update({
      artifacts: mergedArtifacts,
      updated_at: new Date().toISOString(),
    })
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'archon');

  if (error) {
    throw new Error(`Failed to save artifacts: ${error.message}`);
  }

  console.log(`[ConfigAgent] Saved ${artifacts.length} config artifacts to ARCHON output`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('RE-RUNNING CONFIG GENERATION FOR BUILD:', BUILD_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Load build context
    console.log('[Step 1] Loading build context...');
    const context = await loadBuildContext();
    console.log('[Step 1] Context loaded');

    // Step 2: Generate config files
    console.log('[Step 2] Generating config files with Claude...');
    const artifacts = await generateConfigFiles(context);
    console.log(`[Step 2] Generated ${artifacts.length} config files:`);
    for (const a of artifacts) {
      console.log(`  - ${a.path} (${a.content?.length || 0} chars)`);
    }

    // Step 3: Save artifacts
    console.log('[Step 3] Saving artifacts to database...');
    await saveArtifacts(artifacts);

    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! Config files generated and saved.');
    console.log('Run the build validation to verify.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

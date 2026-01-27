/**
 * EXTRACT AND VALIDATE BUILD
 *
 * 1. Extracts all artifacts from database
 * 2. Writes them to disk
 * 3. Runs npm install + npm run build
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';
const OUTPUT_DIR = path.resolve(__dirname, '../generated-project');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Artifact {
  type: string;
  path?: string;
  content?: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXTRACT AND VALIDATE BUILD:', BUILD_ID);
  console.log('Output directory:', OUTPUT_DIR);
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Load all agent outputs
  console.log('[Step 1] Loading agent outputs from database...');
  const { data: outputs, error } = await supabase
    .from('build_agent_outputs')
    .select('agent_id, artifacts')
    .eq('build_id', BUILD_ID);

  if (error) {
    console.error('Error loading outputs:', error.message);
    process.exit(1);
  }

  console.log(`[Step 1] Loaded ${outputs?.length || 0} agent outputs`);

  // Step 2: Extract all artifacts with paths
  console.log('[Step 2] Extracting artifacts...');
  const allArtifacts: { agentId: string; artifact: Artifact }[] = [];

  for (const output of outputs || []) {
    const artifacts = output.artifacts || [];
    for (const artifact of artifacts) {
      if (artifact.path && artifact.content) {
        allArtifacts.push({ agentId: output.agent_id, artifact });
      }
    }
  }

  console.log(`[Step 2] Found ${allArtifacts.length} artifacts with paths`);

  // Step 3: Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Step 4: Write all files
  console.log('[Step 3] Writing files to disk...');
  let written = 0;
  const filesByAgent: Record<string, number> = {};

  for (const { agentId, artifact } of allArtifacts) {
    const filePath = path.join(OUTPUT_DIR, artifact.path!);
    const dir = path.dirname(filePath);

    // Create directory if needed
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Handle content that might be an object
    let content = artifact.content!;
    if (typeof content === 'object') {
      content = JSON.stringify(content, null, 2);
    }

    // Write file
    writeFileSync(filePath, content, 'utf-8');
    written++;
    filesByAgent[agentId] = (filesByAgent[agentId] || 0) + 1;
  }

  console.log(`[Step 3] Wrote ${written} files:`);
  for (const [agent, count] of Object.entries(filesByAgent).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${agent}: ${count} files`);
  }

  // Step 4: Check critical files
  console.log('');
  console.log('[Step 4] Checking critical files...');
  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'tsconfig.node.json',
    'next.config.js',
    'postcss.config.js',
    'tailwind.config.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/globals.css',
  ];

  const missing: string[] = [];
  for (const file of criticalFiles) {
    const fullPath = path.join(OUTPUT_DIR, file);
    if (existsSync(fullPath)) {
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ✗ ${file} - MISSING`);
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    console.log('');
    console.log('WARNING: Some critical files are missing.');
    console.log('The scaffolder will fill them in during build.');
  }

  // Step 5: Run npm install
  console.log('');
  console.log('[Step 5] Running npm install...');
  try {
    execSync('npm install', {
      cwd: OUTPUT_DIR,
      stdio: 'inherit',
      timeout: 300000, // 5 minutes
    });
    console.log('[Step 5] npm install completed');
  } catch (error) {
    console.error('[Step 5] npm install FAILED');
    console.error('You may need to run it manually.');
  }

  // Step 6: Run npm run build
  console.log('');
  console.log('[Step 6] Running npm run build...');
  try {
    execSync('npm run build', {
      cwd: OUTPUT_DIR,
      stdio: 'inherit',
      timeout: 600000, // 10 minutes
    });
    console.log('');
    console.log('='.repeat(60));
    console.log('BUILD VALIDATED SUCCESSFULLY!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('[Step 6] npm run build FAILED');
    console.error('Check the errors above and fix the code.');
    process.exit(1);
  }
}

main().catch(console.error);

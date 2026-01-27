#!/usr/bin/env npx ts-node

/**
 * OLYMPUS 3.0 - Master Documentation Generator
 * =============================================
 * Runs all documentation generators
 */

import { execSync, ExecSyncOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface GeneratorResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
}

async function runGenerator(name: string, script: string): Promise<GeneratorResult> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Generating ${name}...`);
  console.log('='.repeat(50));

  try {
    const options: ExecSyncOptions = {
      stdio: 'inherit',
      cwd: process.cwd(),
    };

    execSync(`npx tsx ${path.join(__dirname, script)}`, options);

    return { name, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to generate ${name}: ${errorMessage}`);
    return { name, success: false, error: errorMessage };
  }
}

async function generateAllDocs(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════╗
║     OLYMPUS Documentation Generator              ║
╚══════════════════════════════════════════════════╝
`);

  const startTime = Date.now();

  const generators = [
    { name: 'README', script: 'generate-readme.ts' },
    { name: 'ADRs', script: 'generate-adr.ts' },
    { name: 'API Docs', script: 'generate-api-docs.ts' },
  ];

  const results: GeneratorResult[] = [];

  for (const gen of generators) {
    const result = await runGenerator(gen.name, gen.script);
    results.push(result);
  }

  // Generate summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('Documentation Generation Summary');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful: ${successful.length}/${results.length}`);
  for (const result of successful) {
    console.log(`  [OK] ${result.name}`);
  }

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}/${results.length}`);
    for (const result of failed) {
      console.log(`  [FAIL] ${result.name}: ${result.error}`);
    }
  }

  // List generated files
  console.log('\nGenerated files:');

  const generatedDir = path.join(process.cwd(), 'docs', 'generated');
  if (fs.existsSync(generatedDir)) {
    const files = fs.readdirSync(generatedDir);
    for (const file of files) {
      const stats = fs.statSync(path.join(generatedDir, file));
      const size = (stats.size / 1024).toFixed(1);
      console.log(`  docs/generated/${file} (${size} KB)`);
    }
  }

  const adrDir = path.join(process.cwd(), 'docs', 'adr');
  if (fs.existsSync(adrDir)) {
    const files = fs.readdirSync(adrDir);
    console.log(`  docs/adr/ (${files.length} files)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${duration}s`);

  // Exit with error if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// Main execution
generateAllDocs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * BUILD INTEGRITY VALIDATOR
 *
 * WEAKNESS FIX: Previously, builds were marked "completed" based on agent events
 * without verifying the actual output works. This caused:
 * - 404 errors on static files (.next/static/chunks missing)
 * - MIME type errors (server returning HTML instead of JS)
 * - Broken deployments that "passed" all agent checks
 *
 * THIS VALIDATOR ensures the build actually WORKS before declaring success.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface BuildValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    filesWritten: boolean;
    nextBuildSuccess: boolean;
    staticChunksExist: boolean;
    cssFilesExist: boolean;
    manifestValid: boolean;
  };
  stats: {
    totalFiles: number;
    jsChunks: number;
    cssFiles: number;
    buildTime?: number;
  };
}

export interface ValidationConfig {
  projectPath: string;
  runNextBuild?: boolean;  // Whether to run `npm run build`
  timeout?: number;        // Build timeout in ms
  skipBuild?: boolean;     // Skip build, only validate existing .next
}

/**
 * CRITICAL VALIDATION: Verify build output actually works
 * This is the missing piece that caused the 404 errors
 */
export async function validateBuildIntegrity(
  config: ValidationConfig
): Promise<BuildValidationResult> {
  const result: BuildValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
    checks: {
      filesWritten: false,
      nextBuildSuccess: false,
      staticChunksExist: false,
      cssFilesExist: false,
      manifestValid: false,
    },
    stats: {
      totalFiles: 0,
      jsChunks: 0,
      cssFiles: 0,
    },
  };

  const { projectPath, runNextBuild = true, timeout = 300000, skipBuild = false } = config;
  const nextDir = join(projectPath, '.next');
  const staticDir = join(nextDir, 'static');
  const chunksDir = join(staticDir, 'chunks');

  console.log(`[BuildValidator] Validating build at: ${projectPath}`);

  // Step 1: Check if source files exist
  const srcDir = join(projectPath, 'src');
  if (existsSync(srcDir)) {
    result.checks.filesWritten = true;
    result.stats.totalFiles = countFiles(srcDir);
    console.log(`[BuildValidator] Source files found: ${result.stats.totalFiles}`);
  } else {
    result.errors.push('Source directory (src/) not found');
    return result;
  }

  // Step 2: Run Next.js build (unless skipped)
  if (runNextBuild && !skipBuild) {
    console.log(`[BuildValidator] Running npm run build...`);
    const buildStart = Date.now();

    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: projectPath,
        timeout,
        env: { ...process.env, CI: 'true' }, // Suppress interactive prompts
      });

      result.stats.buildTime = Date.now() - buildStart;
      result.checks.nextBuildSuccess = true;
      console.log(`[BuildValidator] Build completed in ${result.stats.buildTime}ms`);

      // Check for warnings in build output
      if (stderr && stderr.includes('warning')) {
        result.warnings.push('Build completed with warnings');
      }
    } catch (error) {
      const err = error as Error & { stdout?: string; stderr?: string };
      result.errors.push(`Build failed: ${err.message}`);
      if (err.stderr) {
        result.errors.push(`Build stderr: ${err.stderr.substring(0, 500)}`);
      }
      return result;
    }
  } else if (skipBuild) {
    // Check if .next already exists
    if (existsSync(nextDir)) {
      result.checks.nextBuildSuccess = true;
      console.log(`[BuildValidator] Skipping build, using existing .next`);
    } else {
      result.errors.push('.next directory not found (skipBuild=true but no existing build)');
      return result;
    }
  }

  // Step 3: Verify .next/static/chunks exists and has files
  if (existsSync(chunksDir)) {
    const chunks = readdirSync(chunksDir).filter(f => f.endsWith('.js'));
    result.stats.jsChunks = chunks.length;

    if (chunks.length > 0) {
      result.checks.staticChunksExist = true;
      console.log(`[BuildValidator] JS chunks found: ${chunks.length}`);

      // Critical check: Verify app/page.js chunk exists
      const appChunks = chunks.filter(f => f.includes('app') || f.includes('page'));
      if (appChunks.length === 0) {
        result.warnings.push('No app/page chunks found - may cause route issues');
      }
    } else {
      result.errors.push('No JS chunks found in .next/static/chunks/');
    }
  } else {
    result.errors.push('.next/static/chunks/ directory not found');
  }

  // Step 4: Verify CSS files exist
  const cssDir = join(staticDir, 'css');
  if (existsSync(cssDir)) {
    const cssFiles = readdirSync(cssDir).filter(f => f.endsWith('.css'));
    result.stats.cssFiles = cssFiles.length;

    if (cssFiles.length > 0) {
      result.checks.cssFilesExist = true;
      console.log(`[BuildValidator] CSS files found: ${cssFiles.length}`);
    } else {
      result.warnings.push('No CSS files found - may cause styling issues');
    }
  } else {
    result.warnings.push('.next/static/css/ directory not found');
  }

  // Step 5: Verify build manifest exists and is valid
  const manifestPath = join(nextDir, 'build-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = require(manifestPath);
      if (manifest && typeof manifest === 'object') {
        result.checks.manifestValid = true;
        console.log(`[BuildValidator] Build manifest valid`);
      }
    } catch {
      result.errors.push('Build manifest exists but is invalid');
    }
  } else {
    result.errors.push('Build manifest not found');
  }

  // Final validation: All critical checks must pass
  result.valid =
    result.checks.filesWritten &&
    result.checks.nextBuildSuccess &&
    result.checks.staticChunksExist &&
    result.checks.manifestValid &&
    result.errors.length === 0;

  console.log(`[BuildValidator] Validation ${result.valid ? 'PASSED' : 'FAILED'}`);
  if (!result.valid) {
    console.log(`[BuildValidator] Errors: ${result.errors.join(', ')}`);
  }

  return result;
}

/**
 * Quick validation - just check if .next has essential files
 * Use this for fast checks without running a full build
 */
export function quickValidateNextBuild(projectPath: string): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  const nextDir = join(projectPath, '.next');

  const requiredPaths = [
    '.next',
    '.next/static',
    '.next/static/chunks',
    '.next/build-manifest.json',
  ];

  for (const relPath of requiredPaths) {
    const fullPath = join(projectPath, relPath);
    if (!existsSync(fullPath)) {
      missing.push(relPath);
    }
  }

  // Check if chunks directory has at least some JS files
  const chunksDir = join(projectPath, '.next/static/chunks');
  if (existsSync(chunksDir)) {
    const jsFiles = readdirSync(chunksDir).filter(f => f.endsWith('.js'));
    if (jsFiles.length < 3) {
      missing.push('.next/static/chunks/*.js (insufficient chunks)');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Count files recursively in a directory
 */
function countFiles(dir: string, count = 0): number {
  if (!existsSync(dir)) return count;

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip node_modules and .next
        if (item !== 'node_modules' && item !== '.next') {
          count = countFiles(fullPath, count);
        }
      } else if (stat.isFile()) {
        count++;
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return count;
}

/**
 * Validate and return actionable error message
 */
export function getValidationErrorMessage(result: BuildValidationResult): string {
  if (result.valid) {
    return 'Build validation passed';
  }

  const issues: string[] = [];

  if (!result.checks.filesWritten) {
    issues.push('- Source files not written to disk');
  }
  if (!result.checks.nextBuildSuccess) {
    issues.push('- Next.js build failed - check for TypeScript/syntax errors');
  }
  if (!result.checks.staticChunksExist) {
    issues.push('- Static JS chunks missing - .next/static/chunks/ is empty');
  }
  if (!result.checks.manifestValid) {
    issues.push('- Build manifest invalid - build may be corrupted');
  }

  issues.push(...result.errors.map(e => `- ${e}`));

  return `Build validation failed:\n${issues.join('\n')}\n\nFix: Delete .next folder and run 'npm run build'`;
}

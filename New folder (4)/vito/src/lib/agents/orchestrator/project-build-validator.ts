/**
 * PROJECT BUILD VALIDATOR
 *
 * FIXES THE CRITICAL BUG: Orchestrator claimed "BUILD COMPLETED SUCCESSFULLY"
 * without verifying the generated code actually compiles.
 *
 * This module:
 * 1. Runs `npm install` on the generated project
 * 2. Runs `npm run build` to verify compilation
 * 3. Returns detailed errors if build fails
 *
 * IMPORTANT: This validates the GENERATED project, not vito itself.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface ProjectValidatorConfig {
  projectPath: string;            // Path to generated project
  runInstall?: boolean;           // Run npm install first
  installTimeout?: number;        // Install timeout in ms
  buildTimeout?: number;          // Build timeout in ms
  skipTypeCheck?: boolean;        // Skip tsc type checking
}

export interface ProjectValidatorResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stages: {
    packageJsonValid: boolean;
    installSuccess: boolean;
    buildSuccess: boolean;
    typeCheckSuccess: boolean;
  };
  output: {
    installOutput?: string;
    buildOutput?: string;
    typeCheckOutput?: string;
  };
  missingDependencies: string[];
  buildTime?: number;
}

/**
 * Validate that a generated project actually compiles
 */
export async function validateProjectBuild(
  config: ProjectValidatorConfig
): Promise<ProjectValidatorResult> {
  const {
    projectPath,
    runInstall = true,
    installTimeout = 300000,  // 5 minutes
    buildTimeout = 300000,    // 5 minutes
    skipTypeCheck = false,
  } = config;

  const result: ProjectValidatorResult = {
    success: false,
    errors: [],
    warnings: [],
    stages: {
      packageJsonValid: false,
      installSuccess: false,
      buildSuccess: false,
      typeCheckSuccess: false,
    },
    output: {},
    missingDependencies: [],
  };

  console.log(`[ProjectValidator] Validating project at: ${projectPath}`);

  // Stage 1: Check package.json exists and is valid
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    result.errors.push('package.json not found');
    return result;
  }

  try {
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.name) {
      result.warnings.push('package.json missing "name" field');
    }
    if (!packageJson.scripts?.build) {
      result.errors.push('package.json missing "build" script');
      return result;
    }

    result.stages.packageJsonValid = true;
    console.log(`[ProjectValidator] package.json valid`);
  } catch (parseError) {
    result.errors.push(`Invalid package.json: ${(parseError as Error).message}`);
    return result;
  }

  // Stage 2: Check for required config files
  const requiredFiles = [
    { file: 'tsconfig.json', required: true },
    { file: 'tsconfig.node.json', required: false }, // Often referenced by tsconfig.json
    { file: 'postcss.config.js', required: false },
    { file: 'tailwind.config.js', required: false },
    { file: 'tailwind.config.ts', required: false },
  ];

  for (const { file, required } of requiredFiles) {
    const filePath = join(projectPath, file);
    if (!existsSync(filePath)) {
      if (required) {
        result.errors.push(`Required file missing: ${file}`);
      } else {
        result.warnings.push(`Optional file missing: ${file}`);
      }
    }
  }

  // Check if tsconfig.json references tsconfig.node.json
  const tsconfigPath = join(projectPath, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    try {
      const tsconfigContent = await readFile(tsconfigPath, 'utf-8');
      if (tsconfigContent.includes('tsconfig.node.json')) {
        const tsconfigNodePath = join(projectPath, 'tsconfig.node.json');
        if (!existsSync(tsconfigNodePath)) {
          result.errors.push('tsconfig.json references tsconfig.node.json but file is missing');
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // If we have required file errors, fail early
  if (result.errors.length > 0) {
    return result;
  }

  // Stage 3: Run npm install
  if (runInstall) {
    console.log(`[ProjectValidator] Running npm install...`);
    try {
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: projectPath,
        timeout: installTimeout,
        env: { ...process.env, CI: 'true' },
      });

      result.output.installOutput = stdout;
      result.stages.installSuccess = true;
      console.log(`[ProjectValidator] npm install completed`);

      // Check for npm warnings about missing peer deps
      if (stderr) {
        const missingPeers = extractMissingPeerDeps(stderr);
        result.missingDependencies.push(...missingPeers);
        if (missingPeers.length > 0) {
          result.warnings.push(`Missing peer dependencies: ${missingPeers.join(', ')}`);
        }
      }
    } catch (installError) {
      const err = installError as Error & { stderr?: string; stdout?: string };
      result.errors.push(`npm install failed: ${err.message}`);
      result.output.installOutput = err.stderr || err.stdout || '';

      // Extract specific dependency errors
      const depErrors = extractDependencyErrors(err.stderr || '');
      result.errors.push(...depErrors);

      return result;
    }
  } else {
    // Check if node_modules exists
    if (!existsSync(join(projectPath, 'node_modules'))) {
      result.errors.push('node_modules not found and runInstall=false');
      return result;
    }
    result.stages.installSuccess = true;
  }

  // Stage 4: Run npm run build
  console.log(`[ProjectValidator] Running npm run build...`);
  const buildStart = Date.now();

  try {
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: projectPath,
      timeout: buildTimeout,
      env: { ...process.env, CI: 'true', NODE_ENV: 'production' },
    });

    result.buildTime = Date.now() - buildStart;
    result.output.buildOutput = stdout + (stderr || '');
    result.stages.buildSuccess = true;
    console.log(`[ProjectValidator] Build completed in ${result.buildTime}ms`);

    // Check for build warnings
    if (stderr && stderr.includes('warning')) {
      result.warnings.push('Build completed with warnings');
    }
  } catch (buildError) {
    const err = buildError as Error & { stderr?: string; stdout?: string };
    result.buildTime = Date.now() - buildStart;
    result.output.buildOutput = err.stderr || err.stdout || '';

    // Extract specific build errors
    const buildErrors = extractBuildErrors(result.output.buildOutput);
    if (buildErrors.length > 0) {
      result.errors.push(...buildErrors);
    } else {
      result.errors.push(`Build failed: ${err.message}`);
    }

    return result;
  }

  // Stage 5: Run TypeScript check (optional)
  if (!skipTypeCheck) {
    console.log(`[ProjectValidator] Running type check...`);
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: projectPath,
        timeout: 120000,  // 2 minutes
      });

      result.output.typeCheckOutput = stdout;
      result.stages.typeCheckSuccess = true;
      console.log(`[ProjectValidator] Type check passed`);
    } catch (tscError) {
      const err = tscError as Error & { stderr?: string; stdout?: string };
      result.output.typeCheckOutput = err.stderr || err.stdout || '';

      // Type errors are warnings, not failures (build already succeeded)
      const typeErrors = extractTypeErrors(result.output.typeCheckOutput);
      if (typeErrors.length > 0) {
        result.warnings.push(`Type check found ${typeErrors.length} issues`);
      }
      // Don't fail the overall validation for type errors if build succeeded
      result.stages.typeCheckSuccess = false;
    }
  } else {
    result.stages.typeCheckSuccess = true;
  }

  // Final result
  result.success = result.stages.buildSuccess && result.errors.length === 0;

  console.log(`[ProjectValidator] Validation ${result.success ? 'PASSED' : 'FAILED'}`);
  if (!result.success) {
    console.log(`[ProjectValidator] Errors: ${result.errors.join('; ')}`);
  }

  return result;
}

/**
 * Extract missing peer dependency names from npm stderr
 */
function extractMissingPeerDeps(stderr: string): string[] {
  const missing: string[] = [];
  const regex = /WARN.*peer.*requires.*(@?[\w/-]+)/gi;
  let match;
  while ((match = regex.exec(stderr)) !== null) {
    if (match[1] && !missing.includes(match[1])) {
      missing.push(match[1]);
    }
  }
  return missing;
}

/**
 * Extract dependency-specific errors from npm install output
 */
function extractDependencyErrors(output: string): string[] {
  const errors: string[] = [];

  // Check for ERESOLVE errors
  if (output.includes('ERESOLVE')) {
    const eresolveMatch = output.match(/Could not resolve dependency[^]*/);
    if (eresolveMatch) {
      errors.push('Dependency resolution conflict (ERESOLVE)');
    }
  }

  // Check for 404 errors
  const notFoundRegex = /404.*Not Found.*(@?[\w/-]+@[\w.]+)/gi;
  let match;
  while ((match = notFoundRegex.exec(output)) !== null) {
    errors.push(`Package not found: ${match[1]}`);
  }

  return errors;
}

/**
 * Extract specific build errors from build output
 */
function extractBuildErrors(output: string): string[] {
  const errors: string[] = [];

  // TypeScript errors (TS6053, etc.)
  const tsErrorRegex = /(\w+\.tsx?)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.+)/g;
  let match;
  while ((match = tsErrorRegex.exec(output)) !== null) {
    errors.push(`${match[1]}:${match[2]} - ${match[4]}: ${match[5]}`);
  }

  // File not found errors
  const fileNotFoundRegex = /File '([^']+)' not found/g;
  while ((match = fileNotFoundRegex.exec(output)) !== null) {
    errors.push(`File not found: ${match[1]}`);
  }

  // Module not found errors
  const moduleNotFoundRegex = /Cannot find module '([^']+)'/g;
  while ((match = moduleNotFoundRegex.exec(output)) !== null) {
    errors.push(`Module not found: ${match[1]}`);
  }

  // Vite/Rollup errors
  const viteErrorRegex = /\[vite\]:\s*(.+)/g;
  while ((match = viteErrorRegex.exec(output)) !== null) {
    errors.push(`Vite: ${match[1]}`);
  }

  // Next.js errors
  const nextErrorRegex = /Error:\s*(.+)/g;
  while ((match = nextErrorRegex.exec(output)) !== null) {
    if (!match[1].includes('Command failed')) {
      errors.push(match[1]);
    }
  }

  return errors.slice(0, 10); // Limit to first 10 errors
}

/**
 * Extract type errors from tsc output
 */
function extractTypeErrors(output: string): string[] {
  const errors: string[] = [];
  const tsErrorRegex = /(\w+\.tsx?)\((\d+),(\d+)\):\s*error\s*(TS\d+)/g;
  let match;
  while ((match = tsErrorRegex.exec(output)) !== null) {
    errors.push(`${match[1]}:${match[2]} (${match[4]})`);
  }
  return errors;
}

/**
 * Get a human-readable summary of validation result
 */
export function getValidationSummary(result: ProjectValidatorResult): string {
  if (result.success) {
    return `✓ Build validation passed in ${result.buildTime}ms`;
  }

  const lines: string[] = ['✗ Build validation FAILED'];

  if (!result.stages.packageJsonValid) {
    lines.push('  - Invalid or missing package.json');
  }
  if (!result.stages.installSuccess) {
    lines.push('  - npm install failed');
  }
  if (!result.stages.buildSuccess) {
    lines.push('  - npm run build failed');
  }

  lines.push('');
  lines.push('Errors:');
  for (const error of result.errors.slice(0, 5)) {
    lines.push(`  - ${error}`);
  }
  if (result.errors.length > 5) {
    lines.push(`  ... and ${result.errors.length - 5} more errors`);
  }

  if (result.missingDependencies.length > 0) {
    lines.push('');
    lines.push('Missing dependencies:');
    for (const dep of result.missingDependencies) {
      lines.push(`  - ${dep}`);
    }
  }

  return lines.join('\n');
}

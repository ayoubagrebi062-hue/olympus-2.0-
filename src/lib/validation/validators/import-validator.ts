/**
 * OLYMPUS 3.0 - Import Validator
 * ==============================
 * Validates package imports and catches hallucinated packages
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { ValidationIssue, GeneratedFile } from '../types';

// Known valid packages (cached)
const KNOWN_PACKAGES = new Set([
  'react',
  'react-dom',
  'next',
  'next/image',
  'next/link',
  'next/navigation',
  'next/font',
  'next/headers',
  'next/server',
  'tailwindcss',
  'lucide-react',
  'framer-motion',
  'clsx',
  'class-variance-authority',
  '@radix-ui/react-slot',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-accordion',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-label',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-tooltip',
  'zod',
  'react-hook-form',
  '@hookform/resolvers',
  'zustand',
  'swr',
  'date-fns',
  'lodash',
  'axios',
  'uuid',
  'nanoid',
  '@supabase/supabase-js',
  '@supabase/ssr',
  'mongodb',
  'redis',
  'ioredis',
  '@anthropic-ai/sdk',
  'openai',
  'stripe',
  '@stripe/stripe-js',
  'tailwind-merge',
  'sharp',
  'neo4j-driver',
  '@qdrant/js-client-rest',
]);

// Packages that are known to NOT exist (hallucinated)
const HALLUCINATED_PACKAGES = new Set([
  'react-magic-ui',
  'next-super-image',
  'tailwind-animate-extra',
  '@shadcn/button',
  '@shadcn/ui',
  'shadcn-ui',
  'super-icons',
  'mega-utils',
  'awesome-helpers',
  'react-awesome-component',
  'next-magic',
  'ai-utils',
]);

// Node.js built-in modules
const NODE_BUILTINS = new Set([
  'fs',
  'path',
  'os',
  'http',
  'https',
  'crypto',
  'util',
  'stream',
  'events',
  'buffer',
  'querystring',
  'url',
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'net',
  'readline',
  'repl',
  'tls',
  'tty',
  'vm',
  'zlib',
  'assert',
  'async_hooks',
  'console',
  'constants',
  'domain',
  'inspector',
  'module',
  'perf_hooks',
  'process',
  'punycode',
  'string_decoder',
  'timers',
  'trace_events',
  'v8',
  'wasi',
  'worker_threads',
]);

/**
 * Validate imports in a generated file
 */
export async function validateImports(file: GeneratedFile): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const { content, path: _path } = file;

  // Extract imports
  const imports: { pkg: string; line: number }[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineNum) => {
    // Check import statements
    const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      imports.push({ pkg: importMatch[1], line: lineNum + 1 });
    }

    // Check require statements
    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      imports.push({ pkg: requireMatch[1], line: lineNum + 1 });
    }

    // Check dynamic imports
    const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (dynamicMatch) {
      imports.push({ pkg: dynamicMatch[1], line: lineNum + 1 });
    }
  });

  for (const { pkg, line } of imports) {
    // Skip relative imports
    if (pkg.startsWith('.') || pkg.startsWith('@/') || pkg.startsWith('~/')) {
      continue;
    }

    // Skip Node.js built-ins
    if (isNodeBuiltin(pkg)) {
      continue;
    }

    // Extract package name (handle scoped packages)
    const packageName = getPackageName(pkg);

    // Check known hallucinated packages first
    if (HALLUCINATED_PACKAGES.has(packageName)) {
      issues.push({
        code: 'HALLUCINATED_PACKAGE',
        message: `Package "${packageName}" does not exist (AI hallucination)`,
        severity: 'error',
        line,
        suggestion: 'Find a real alternative or remove this import',
      });
      continue;
    }

    // Check known valid packages
    if (KNOWN_PACKAGES.has(packageName) || KNOWN_PACKAGES.has(pkg)) {
      continue;
    }

    // For unknown packages, add a warning (don't block)
    issues.push({
      code: 'UNKNOWN_PACKAGE',
      message: `Package "${packageName}" is not in known packages list`,
      severity: 'warning',
      line,
      suggestion: 'Verify package exists on npm before deployment',
    });
  }

  return issues;
}

/**
 * Extract package name from import path
 */
function getPackageName(importPath: string): string {
  // Handle scoped packages (@org/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.slice(0, 2).join('/');
  }
  // Regular packages
  return importPath.split('/')[0];
}

/**
 * Check if a package is a Node.js built-in
 */
function isNodeBuiltin(pkg: string): boolean {
  const basePkg = pkg.replace(/^node:/, '');
  return NODE_BUILTINS.has(basePkg) || pkg.startsWith('node:');
}

/**
 * OLYMPUS 2.1 - SECURITY BLUEPRINT
 * Dependency Scanner - Validates npm packages suggested by agents
 *
 * Checks:
 * - Known vulnerable packages (blocklist)
 * - Typosquatting attacks
 * - Suspicious package patterns
 * - Version constraints
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKLISTED PACKAGES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlockedPackage {
  name: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
  cve?: string;
  alternative?: string;
}

export const BLOCKED_PACKAGES: BlockedPackage[] = [
  // Known supply chain attacks
  {
    name: 'event-stream',
    reason: 'Supply chain attack - malicious code injection (2018)',
    severity: 'critical',
    cve: 'CVE-2018-16487',
    alternative: 'Use native streams or highland',
  },
  {
    name: 'flatmap-stream',
    reason: 'Malicious package - part of event-stream attack',
    severity: 'critical',
  },
  {
    name: 'ua-parser-js',
    reason: 'Supply chain attack - crypto miner injection (2021)',
    severity: 'critical',
    cve: 'CVE-2021-23424',
    alternative: 'Use bowser or platform.js',
  },
  {
    name: 'coa',
    reason: 'Supply chain attack - malicious code (2021)',
    severity: 'critical',
    alternative: 'Use commander or yargs',
  },
  {
    name: 'rc',
    reason: 'Supply chain attack - malicious code (2021)',
    severity: 'critical',
    alternative: 'Use dotenv or convict',
  },

  // Known vulnerable (unfixed)
  {
    name: 'lodash',
    reason: 'Multiple prototype pollution vulnerabilities',
    severity: 'medium',
    alternative: 'Use lodash-es (tree-shakeable) or native methods',
  },
  {
    name: 'moment',
    reason: 'Deprecated - security issues and large bundle size',
    severity: 'medium',
    alternative: 'Use date-fns or dayjs',
  },
  {
    name: 'request',
    reason: 'Deprecated - no longer maintained',
    severity: 'medium',
    alternative: 'Use axios, ky, or native fetch',
  },

  // Typosquatting attacks
  {
    name: 'crossenv',
    reason: 'Typosquat of cross-env - malicious',
    severity: 'critical',
    alternative: 'Use cross-env',
  },
  {
    name: 'cross-env.js',
    reason: 'Typosquat of cross-env - malicious',
    severity: 'critical',
    alternative: 'Use cross-env',
  },
  {
    name: 'mongose',
    reason: 'Typosquat of mongoose - suspicious',
    severity: 'high',
    alternative: 'Use mongoose',
  },
  {
    name: 'expresss',
    reason: 'Typosquat of express - suspicious',
    severity: 'high',
    alternative: 'Use express',
  },
  {
    name: 'lodashs',
    reason: 'Typosquat of lodash - suspicious',
    severity: 'high',
    alternative: 'Use lodash-es',
  },

  // Crypto miners
  {
    name: 'coinhive',
    reason: 'Cryptocurrency miner',
    severity: 'critical',
  },
  {
    name: 'cryptonight-wasm',
    reason: 'Cryptocurrency mining library',
    severity: 'critical',
  },

  // Data collection
  {
    name: 'analytics-node',
    reason: 'Avoid unless explicitly needed - data collection',
    severity: 'medium',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPICIOUS PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const SUSPICIOUS_PATTERNS = {
  // Packages that shouldn't be in production
  devOnlyPackages: [
    '@types/*', // Type definitions
    'typescript', // Should be devDep
    'eslint*', // Linting
    'prettier*', // Formatting
    '*-cli', // CLI tools
    '@testing-library/*',
    'jest',
    'vitest',
    'playwright',
    'cypress',
  ],

  // Extremely permissive version ranges
  dangerousVersions: [
    '*', // Any version
    'latest', // Always latest
    '>0.0.0', // Any version above 0
    '>=0.0.0', // Same as above
  ],

  // Suspicious package name patterns
  suspiciousNames: [
    /^@[a-z]+-[a-z]+\//, // Unusual scoped names
    /^[a-z]{1,3}$/, // Very short names
    /password|secret|hack|crack|exploit/i,
    /^node-[a-z]+$/, // Might be typosquat
    /\d+$/, // Ends with numbers (typosquat pattern)
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVED PACKAGES (whitelist for OLYMPUS)
// ═══════════════════════════════════════════════════════════════════════════════

export const APPROVED_PACKAGES = [
  // Core
  'next',
  'react',
  'react-dom',
  '@supabase/supabase-js',
  '@supabase/ssr',
  'prisma',
  '@prisma/client',

  // Styling
  'tailwindcss',
  'postcss',
  'autoprefixer',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'lucide-react',
  'framer-motion',
  '@radix-ui/*',

  // State & Data
  'zustand',
  '@tanstack/react-query',
  'swr',

  // Forms & Validation
  'zod',
  'react-hook-form',
  '@hookform/resolvers',

  // Utilities
  'date-fns',
  'nanoid',
  'lodash-es',
  'ky',
  'axios',

  // Payments
  '@stripe/stripe-js',
  'stripe',

  // AI
  '@anthropic-ai/sdk',
  'openai',
  'ai',

  // Testing (as devDeps)
  'vitest',
  '@playwright/test',
  '@testing-library/react',
  '@testing-library/jest-dom',
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DependencyIssue {
  package: string;
  version?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'blocked' | 'suspicious_name' | 'dangerous_version' | 'dev_in_prod' | 'not_approved';
  reason: string;
  alternative?: string;
  cve?: string;
}

export interface DependencyScanResult {
  safe: boolean;
  issues: DependencyIssue[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  blockedPackages: string[];
  summary: string;
  recommendation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

export interface PackageInfo {
  name: string;
  version: string;
  isDev?: boolean;
}

function checkBlocklist(pkg: PackageInfo): DependencyIssue | null {
  const blocked = BLOCKED_PACKAGES.find(
    b => b.name === pkg.name || pkg.name.toLowerCase() === b.name.toLowerCase()
  );

  if (blocked) {
    return {
      package: pkg.name,
      version: pkg.version,
      severity: blocked.severity,
      type: 'blocked',
      reason: blocked.reason,
      alternative: blocked.alternative,
      cve: blocked.cve,
    };
  }

  return null;
}

function checkSuspiciousName(pkg: PackageInfo): DependencyIssue | null {
  for (const pattern of SUSPICIOUS_PATTERNS.suspiciousNames) {
    if (pattern.test(pkg.name)) {
      return {
        package: pkg.name,
        version: pkg.version,
        severity: 'medium',
        type: 'suspicious_name',
        reason: `Package name matches suspicious pattern: ${pattern}`,
      };
    }
  }
  return null;
}

function checkDangerousVersion(pkg: PackageInfo): DependencyIssue | null {
  if (SUSPICIOUS_PATTERNS.dangerousVersions.includes(pkg.version)) {
    return {
      package: pkg.name,
      version: pkg.version,
      severity: 'high',
      type: 'dangerous_version',
      reason: `Dangerous version specifier: "${pkg.version}" allows any version`,
    };
  }
  return null;
}

function checkDevInProd(pkg: PackageInfo): DependencyIssue | null {
  if (pkg.isDev) return null; // Already marked as dev dependency

  for (const pattern of SUSPICIOUS_PATTERNS.devOnlyPackages) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    if (regex.test(pkg.name)) {
      return {
        package: pkg.name,
        version: pkg.version,
        severity: 'low',
        type: 'dev_in_prod',
        reason: `${pkg.name} should be a devDependency, not a production dependency`,
      };
    }
  }
  return null;
}

function checkApproved(pkg: PackageInfo, strictMode: boolean): DependencyIssue | null {
  if (!strictMode) return null;

  const isApproved = APPROVED_PACKAGES.some(approved => {
    if (approved.endsWith('*')) {
      const prefix = approved.slice(0, -1);
      return pkg.name.startsWith(prefix);
    }
    return pkg.name === approved;
  });

  if (!isApproved) {
    return {
      package: pkg.name,
      version: pkg.version,
      severity: 'low',
      type: 'not_approved',
      reason: `Package not in OLYMPUS approved list - requires manual review`,
    };
  }

  return null;
}

export function scanDependencies(
  packages: PackageInfo[],
  options: { strictMode?: boolean } = {}
): DependencyScanResult {
  const issues: DependencyIssue[] = [];
  const blockedPackages: string[] = [];

  for (const pkg of packages) {
    // Check blocklist first (most critical)
    const blocklistIssue = checkBlocklist(pkg);
    if (blocklistIssue) {
      issues.push(blocklistIssue);
      blockedPackages.push(pkg.name);
      continue; // No need to check further
    }

    // Check suspicious name
    const nameIssue = checkSuspiciousName(pkg);
    if (nameIssue) issues.push(nameIssue);

    // Check dangerous version
    const versionIssue = checkDangerousVersion(pkg);
    if (versionIssue) issues.push(versionIssue);

    // Check dev in prod
    const devIssue = checkDevInProd(pkg);
    if (devIssue) issues.push(devIssue);

    // Check approved list (strict mode)
    const approvedIssue = checkApproved(pkg, options.strictMode ?? false);
    if (approvedIssue) issues.push(approvedIssue);
  }

  // Sort by severity
  issues.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const safe = criticalCount === 0 && highCount === 0;

  let summary = 'All dependencies passed security scan';
  let recommendation = 'Dependencies are safe to use';

  if (issues.length > 0) {
    summary = `Found ${issues.length} issue(s): ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low`;

    if (criticalCount > 0) {
      recommendation = `BLOCK: Remove critical packages: ${blockedPackages.join(', ')}`;
    } else if (highCount > 0) {
      recommendation = 'Review high severity issues before deployment';
    } else {
      recommendation = 'Low risk issues - consider addressing';
    }
  }

  return {
    safe,
    issues,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    blockedPackages,
    summary,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE.JSON PARSER
// ═══════════════════════════════════════════════════════════════════════════════

export function parsePackageJson(content: string): PackageInfo[] {
  try {
    const pkg = JSON.parse(content);
    const packages: PackageInfo[] = [];

    // Production dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        packages.push({ name, version: version as string, isDev: false });
      }
    }

    // Dev dependencies
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        packages.push({ name, version: version as string, isDev: true });
      }
    }

    return packages;
  } catch {
    return [];
  }
}

export function scanPackageJson(content: string, strictMode = false): DependencyScanResult {
  const packages = parsePackageJson(content);
  return scanDependencies(packages, { strictMode });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const DEPENDENCY_SCANNER = {
  blocked: BLOCKED_PACKAGES,
  approved: APPROVED_PACKAGES,
  suspicious: SUSPICIOUS_PATTERNS,
  scan: scanDependencies,
  scanPackageJson,
  parsePackageJson,
};

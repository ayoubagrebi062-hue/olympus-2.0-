/**
 * OLYMPUS 2.0 - Tool Permissions & Sandboxing
 *
 * Security layer for controlling tool access to filesystem, network, and execution.
 * PATCH 2: Critical security for Week 2.
 */

/**
 * Tool permission levels
 */
export type ToolPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:internal'
  | 'network:external'
  | 'execution:safe'
  | 'execution:unsafe';

/**
 * Permission configuration
 */
export interface ToolPermissionConfig {
  /** Allowed permissions for this context */
  allowed: ToolPermission[];

  /** Filesystem restrictions */
  filesystem?: {
    /** Allowed paths (glob patterns) */
    allowedPaths?: string[];
    /** Blocked paths (glob patterns) */
    blockedPaths?: string[];
    /** Max file size for read/write */
    maxFileSize?: number;
  };

  /** Network restrictions */
  network?: {
    /** Allowed domains */
    allowedDomains?: string[];
    /** Blocked domains */
    blockedDomains?: string[];
    /** Block internal IPs (10.x, 192.168.x, etc.) */
    blockInternalIps?: boolean;
  };
}

/**
 * Default permission config - RESTRICTIVE
 */
export const DEFAULT_PERMISSIONS: ToolPermissionConfig = {
  allowed: ['execution:safe'],
  filesystem: {
    allowedPaths: [],
    blockedPaths: ['**/*'],
    maxFileSize: 0, // No filesystem access by default
  },
  network: {
    allowedDomains: [],
    blockedDomains: ['*'],
    blockInternalIps: true,
  },
};

/**
 * Sandbox permission config - for builds
 */
export const SANDBOX_PERMISSIONS: ToolPermissionConfig = {
  allowed: ['filesystem:read', 'filesystem:write', 'execution:safe'],
  filesystem: {
    allowedPaths: ['/tmp/olympus/**', './output/**', 'output/**'],
    blockedPaths: ['/etc/**', '/root/**', '~/**', '../**', '**/../**'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  network: {
    allowedDomains: [],
    blockedDomains: ['*'],
    blockInternalIps: true,
  },
};

/**
 * Full permission config - for trusted operations only
 */
export const TRUSTED_PERMISSIONS: ToolPermissionConfig = {
  allowed: ['filesystem:read', 'filesystem:write', 'network:external', 'execution:safe'],
  filesystem: {
    allowedPaths: ['**/*'],
    blockedPaths: ['/etc/shadow', '/etc/passwd', '**/.ssh/**', '**/.env'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  network: {
    allowedDomains: ['*'],
    blockedDomains: [],
    blockInternalIps: true,
  },
};

/**
 * Check if a tool operation is allowed
 */
export function checkPermission(
  operation: ToolPermission,
  config: ToolPermissionConfig = DEFAULT_PERMISSIONS
): boolean {
  return config.allowed.includes(operation);
}

/**
 * Validate filesystem path against config
 */
export function validatePath(
  path: string,
  operation: 'read' | 'write',
  config: ToolPermissionConfig
): { allowed: boolean; reason?: string } {
  const permission = operation === 'read' ? 'filesystem:read' : 'filesystem:write';

  if (!checkPermission(permission, config)) {
    return { allowed: false, reason: `Filesystem ${operation} not permitted` };
  }

  // Normalize path
  const normalizedPath = path.replace(/\\/g, '/');

  // Check for path traversal
  if (normalizedPath.includes('..') || normalizedPath.includes('//')) {
    return { allowed: false, reason: 'Path traversal detected' };
  }

  // Check for absolute paths to sensitive locations
  const sensitivePatterns = ['/etc/', '/root/', '/var/log/', '/.ssh/', '/.env'];
  for (const sensitive of sensitivePatterns) {
    if (normalizedPath.includes(sensitive)) {
      return { allowed: false, reason: `Access to sensitive path blocked: ${sensitive}` };
    }
  }

  // Check blocked paths
  if (config.filesystem?.blockedPaths) {
    for (const blocked of config.filesystem.blockedPaths) {
      if (matchGlob(normalizedPath, blocked)) {
        return { allowed: false, reason: `Path matches blocked pattern: ${blocked}` };
      }
    }
  }

  // Check allowed paths
  if (config.filesystem?.allowedPaths && config.filesystem.allowedPaths.length > 0) {
    const isAllowed = config.filesystem.allowedPaths.some(allowed =>
      matchGlob(normalizedPath, allowed)
    );
    if (!isAllowed) {
      return { allowed: false, reason: 'Path not in allowed list' };
    }
  }

  return { allowed: true };
}

/**
 * Validate URL against config
 */
export function validateUrl(
  url: string,
  config: ToolPermissionConfig
): { allowed: boolean; reason?: string } {
  if (!checkPermission('network:external', config)) {
    return { allowed: false, reason: 'External network access not permitted' };
  }

  try {
    const parsed = new URL(url);

    // Check for internal IPs
    if (config.network?.blockInternalIps) {
      const ip = parsed.hostname;
      if (isInternalIp(ip)) {
        return { allowed: false, reason: 'Internal IP addresses blocked' };
      }
    }

    // Check blocked domains
    if (config.network?.blockedDomains) {
      for (const blocked of config.network.blockedDomains) {
        if (blocked === '*' && config.network.allowedDomains?.length === 0) {
          return { allowed: false, reason: 'All domains blocked' };
        }
        if (blocked !== '*' && matchDomain(parsed.hostname, blocked)) {
          return { allowed: false, reason: `Domain blocked: ${blocked}` };
        }
      }
    }

    // Check allowed domains
    if (config.network?.allowedDomains && config.network.allowedDomains.length > 0) {
      const isAllowed = config.network.allowedDomains.some(allowed =>
        matchDomain(parsed.hostname, allowed)
      );
      if (!isAllowed) {
        return { allowed: false, reason: 'Domain not in allowed list' };
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid URL' };
  }
}

/**
 * Simple glob matching
 */
function matchGlob(path: string, pattern: string): boolean {
  // Handle special case of blocking all
  if (pattern === '**/*') return true;

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '{{GLOBSTAR}}') // Temp placeholder
    .replace(/\*/g, '[^/]*') // Single star = anything except /
    .replace(/{{GLOBSTAR}}/g, '.*'); // Double star = anything

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Match domain against pattern
 */
function matchDomain(domain: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('*.')) {
    return domain.endsWith(pattern.slice(1)) || domain === pattern.slice(2);
  }
  return domain === pattern;
}

/**
 * Check if hostname is an internal IP
 */
function isInternalIp(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // Check for IPv6 localhost
  if (hostname === '::1' || hostname === '[::1]') return true;

  // Check for internal IP ranges
  const ipParts = hostname.split('.').map(Number);
  if (ipParts.length !== 4 || ipParts.some(isNaN)) return false;

  // 10.0.0.0/8
  if (ipParts[0] === 10) return true;
  // 172.16.0.0/12
  if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) return true;
  // 192.168.0.0/16
  if (ipParts[0] === 192 && ipParts[1] === 168) return true;
  // 169.254.0.0/16 (link-local / AWS metadata)
  if (ipParts[0] === 169 && ipParts[1] === 254) return true;
  // 127.0.0.0/8 (loopback)
  if (ipParts[0] === 127) return true;

  return false;
}

/**
 * Create a permission context for a specific operation
 */
export function createPermissionContext(
  baseConfig: ToolPermissionConfig,
  overrides?: Partial<ToolPermissionConfig>
): ToolPermissionConfig {
  return {
    ...baseConfig,
    ...overrides,
    filesystem: {
      ...baseConfig.filesystem,
      ...overrides?.filesystem,
    },
    network: {
      ...baseConfig.network,
      ...overrides?.network,
    },
  };
}

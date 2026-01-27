/**
 * OLYMPUS 2.0 - Version Primitives
 * Phase 0: Semantic version utilities
 * @version 1.0.0
 */

/**
 * Check if version is a patch version (X.Y.Z where Z > 0)
 */
export function isPatchVersion(version: string): boolean {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const [, major, minor, patch] = match.map(Number);
  return patch > 0;
}

/**
 * Compare semantic versions
 * Returns: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] < parts2[i]) return -1;
    if (parts1[i] > parts2[i]) return 1;
  }

  return 0;
}

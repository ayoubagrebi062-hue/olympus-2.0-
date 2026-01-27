/**
 * Authority Class Registry
 *
 * Defines authority classes and ordering.
 * SYSTEM_ROOT > CONSTITUTIONAL > PROJECT > USER
 * Immutable after bootstrap.
 *
 * KEY PRINCIPLE:
 * - "Truth without authority is opinion."
 * - Authority hierarchy is fixed at bootstrap
 * - Cannot be modified after initialization
 *
 * AUTHORITY LEVELS:
 * - SYSTEM_ROOT (4): Absolute system authority, cannot be overridden
 * - CONSTITUTIONAL (3): System constitution rules
 * - PROJECT (2): Project-scoped authority
 * - USER (1): User-level decisions
 *
 * NON-NEGOTIABLE:
 * - No runtime modification after bootstrap
 * - Authority levels are deterministic
 * - Higher level can refute lower level (not vice versa)
 */

import type {
  AuthorityClass,
  AuthorityClassDefinition
} from './types';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * Default authority class definitions
 * These are frozen after bootstrap
 */
const DEFAULT_AUTHORITY_CLASSES: AuthorityClassDefinition[] = [
  {
    class: 'USER',
    level: 1,
    description: 'User-level decisions. Lowest authority. Can only refute own prior decisions.',
    can_refute: ['USER'],
    immutable: false
  },
  {
    class: 'PROJECT',
    level: 2,
    description: 'Project-scoped authority. Can refute USER and PROJECT decisions within scope.',
    can_refute: ['USER', 'PROJECT'],
    immutable: false
  },
  {
    class: 'CONSTITUTIONAL',
    level: 3,
    description: 'System constitution rules. Can refute all except SYSTEM_ROOT.',
    can_refute: ['USER', 'PROJECT', 'CONSTITUTIONAL'],
    immutable: true
  },
  {
    class: 'SYSTEM_ROOT',
    level: 4,
    description: 'Absolute system authority. Can refute anything. Cannot be refuted.',
    can_refute: ['USER', 'PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    immutable: true
  }
];

export class AuthorityClassRegistry {
  private classes: Map<AuthorityClass, AuthorityClassDefinition>;
  private bootstrapped: boolean = false;
  private frozen: boolean = false;

  constructor() {
    this.classes = new Map();
  }

  /**
   * Bootstrap the registry with default authority classes
   * This can only be called once
   */
  bootstrap(): void {
    if (this.bootstrapped) {
      throw new Error('AuthorityClassRegistry already bootstrapped');
    }

    for (const def of DEFAULT_AUTHORITY_CLASSES) {
      this.classes.set(def.class, { ...def });
    }

    this.bootstrapped = true;
    this.freeze();
  }

  /**
   * Freeze the registry - no more modifications allowed
   */
  private freeze(): void {
    this.frozen = true;

    // Deep freeze all definitions
    for (const [key, def] of this.classes) {
      Object.freeze(def);
      Object.freeze(def.can_refute);
      this.classes.set(key, def);
    }
  }

  /**
   * Get authority class definition
   */
  getClass(authorityClass: AuthorityClass): AuthorityClassDefinition | null {
    this.ensureBootstrapped();
    return this.classes.get(authorityClass) || null;
  }

  /**
   * Get authority level for a class
   */
  getLevel(authorityClass: AuthorityClass): number {
    this.ensureBootstrapped();
    const def = this.classes.get(authorityClass);
    return def?.level ?? 0;
  }

  /**
   * Check if one authority can refute another
   */
  canRefute(refuter: AuthorityClass, refuted: AuthorityClass): boolean {
    this.ensureBootstrapped();

    const refuterDef = this.classes.get(refuter);
    if (!refuterDef) return false;

    return refuterDef.can_refute.includes(refuted);
  }

  /**
   * Compare two authority classes
   * Returns:
   *  > 0 if a > b
   *  < 0 if a < b
   *  = 0 if a == b
   */
  compare(a: AuthorityClass, b: AuthorityClass): number {
    this.ensureBootstrapped();

    const levelA = this.getLevel(a);
    const levelB = this.getLevel(b);

    return levelA - levelB;
  }

  /**
   * Get all authority classes in descending order (highest first)
   */
  getAllClasses(): AuthorityClassDefinition[] {
    this.ensureBootstrapped();

    return [...this.classes.values()]
      .sort((a, b) => b.level - a.level);
  }

  /**
   * Get classes that can refute a given class
   */
  getRefuters(target: AuthorityClass): AuthorityClass[] {
    this.ensureBootstrapped();

    const refuters: AuthorityClass[] = [];

    for (const [cls, def] of this.classes) {
      if (def.can_refute.includes(target)) {
        refuters.push(cls);
      }
    }

    return refuters.sort((a, b) => this.compare(b, a));
  }

  /**
   * Check if the registry is bootstrapped
   */
  isBootstrapped(): boolean {
    return this.bootstrapped;
  }

  /**
   * Check if the registry is frozen
   */
  isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Ensure registry is bootstrapped before operations
   */
  private ensureBootstrapped(): void {
    if (!this.bootstrapped) {
      throw new Error('AuthorityClassRegistry not bootstrapped. Call bootstrap() first.');
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total_classes: number;
    highest_level: number;
    lowest_level: number;
    frozen: boolean;
  } {
    this.ensureBootstrapped();

    const levels = [...this.classes.values()].map(d => d.level);

    return {
      total_classes: this.classes.size,
      highest_level: Math.max(...levels),
      lowest_level: Math.min(...levels),
      frozen: this.frozen
    };
  }

  /**
   * Validate an authority class string
   */
  isValidClass(cls: string): cls is AuthorityClass {
    return ['USER', 'PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'].includes(cls);
  }

  /**
   * Get the minimum authority required to establish a decision
   * (Default is USER)
   */
  getMinimumAuthority(): AuthorityClass {
    return 'USER';
  }

  /**
   * Get the maximum authority (SYSTEM_ROOT)
   */
  getMaximumAuthority(): AuthorityClass {
    return 'SYSTEM_ROOT';
  }
}

// Singleton instance
let registryInstance: AuthorityClassRegistry | null = null;

/**
 * Get or create the singleton AuthorityClassRegistry
 */
export function getAuthorityClassRegistry(): AuthorityClassRegistry {
  if (!registryInstance) {
    registryInstance = new AuthorityClassRegistry();
    registryInstance.bootstrap();
  }
  return registryInstance;
}

/**
 * Create a new AuthorityClassRegistry (for testing)
 * In production, use getAuthorityClassRegistry() for singleton
 */
export function createAuthorityClassRegistry(): AuthorityClassRegistry {
  const registry = new AuthorityClassRegistry();
  registry.bootstrap();
  return registry;
}

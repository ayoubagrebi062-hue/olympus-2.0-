/**
 * Invariant Supremacy Registry
 *
 * Assigns supremacy_level to each invariant.
 * Supremacy level 1 = UNREFUTABLE (cannot be overridden by any authority).
 *
 * KEY PRINCIPLE:
 * - Some truths are absolute and cannot be refuted
 * - Supremacy hierarchy determines what can override what
 * - Lower supremacy number = higher priority
 *
 * SUPREMACY LEVELS:
 * - Level 1: UNREFUTABLE - Cannot be refuted by any authority
 * - Level 2: SYSTEM_ONLY - Only SYSTEM_ROOT can refute
 * - Level 3: CONSTITUTIONAL - CONSTITUTIONAL or higher can refute
 * - Level 4: PROJECT - PROJECT or higher can refute
 * - Level 5: USER - Any authority can refute
 *
 * NON-NEGOTIABLE:
 * - Level 1 invariants are ABSOLUTE
 * - Cannot downgrade supremacy after bootstrap
 * - Deterministic enforcement
 */

import type {
  InvariantCategory,
  SupremacyLevel,
  InvariantSupremacy,
  AuthorityClass
} from './types';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * Default invariant supremacy definitions
 * Level 1 = UNREFUTABLE
 */
const DEFAULT_INVARIANT_SUPREMACY: InvariantSupremacy[] = [
  // =========================================================================
  // LEVEL 1: UNREFUTABLE - These can NEVER be overridden
  // =========================================================================
  {
    invariant: 'ENTROPY_BUDGET_EXHAUSTED',
    supremacy_level: 1,
    minimum_authority: 'SYSTEM_ROOT',
    refutable_by: [], // EMPTY = UNREFUTABLE
    description: 'Entropy budget exhaustion is absolute. Once exhausted, permanently read-only.'
  },
  {
    invariant: 'SINGULARITY_BREACH',
    supremacy_level: 1,
    minimum_authority: 'SYSTEM_ROOT',
    refutable_by: [],
    description: 'Singularity breaches are absolute violations. Cannot be undone.'
  },

  // =========================================================================
  // LEVEL 2: SYSTEM_ONLY - Only SYSTEM_ROOT can refute
  // =========================================================================
  {
    invariant: 'TEMPORAL_CONTRACT_MISSING',
    supremacy_level: 2,
    minimum_authority: 'CONSTITUTIONAL',
    refutable_by: ['SYSTEM_ROOT'],
    description: 'Missing temporal contract. Only system root can override.'
  },
  {
    invariant: 'TEMPORAL_CONTRACT_INVALID',
    supremacy_level: 2,
    minimum_authority: 'CONSTITUTIONAL',
    refutable_by: ['SYSTEM_ROOT'],
    description: 'Invalid temporal contract. Only system root can override.'
  },
  {
    invariant: 'REALITY_LOCK_VIOLATED',
    supremacy_level: 2,
    minimum_authority: 'CONSTITUTIONAL',
    refutable_by: ['SYSTEM_ROOT'],
    description: 'Reality lock violation. Only system root can override.'
  },

  // =========================================================================
  // LEVEL 3: CONSTITUTIONAL - CONSTITUTIONAL or higher can refute
  // =========================================================================
  {
    invariant: 'FUTURE_INEVITABILITY_VIOLATION',
    supremacy_level: 3,
    minimum_authority: 'PROJECT',
    refutable_by: ['CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Future inevitability violation. Constitutional authority can refute with justification.'
  },
  {
    invariant: 'ENTROPY_DRIFT_EXCEEDED',
    supremacy_level: 3,
    minimum_authority: 'PROJECT',
    refutable_by: ['CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Entropy drift exceeded. Constitutional authority can refute.'
  },
  {
    invariant: 'MUTATION_LIMIT_EXCEEDED',
    supremacy_level: 3,
    minimum_authority: 'PROJECT',
    refutable_by: ['CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Mutation limit exceeded. Constitutional authority can refute.'
  },
  {
    invariant: 'LIFESPAN_EXCEEDED',
    supremacy_level: 3,
    minimum_authority: 'PROJECT',
    refutable_by: ['CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Lifespan exceeded. Constitutional authority can refute.'
  },

  // =========================================================================
  // LEVEL 4: PROJECT - PROJECT or higher can refute
  // =========================================================================
  {
    invariant: 'INTENT_COLLAPSE_FAILED',
    supremacy_level: 4,
    minimum_authority: 'USER',
    refutable_by: ['PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Intent collapse failed. Project authority can refute.'
  },
  {
    invariant: 'CANONICAL_FORM_INVALID',
    supremacy_level: 4,
    minimum_authority: 'USER',
    refutable_by: ['PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Canonical form invalid. Project authority can refute.'
  },
  {
    invariant: 'ARCHITECTURAL_PHASE_VIOLATION',
    supremacy_level: 4,
    minimum_authority: 'PROJECT',
    refutable_by: ['PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Architectural phase violation. Project authority can refute.'
  },

  // =========================================================================
  // LEVEL 5: USER - Any authority can refute
  // =========================================================================
  {
    invariant: 'NECESSITY_NOT_ESTABLISHED',
    supremacy_level: 5,
    minimum_authority: 'USER',
    refutable_by: ['USER', 'PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'Necessity not established. Any authority can refute.'
  },
  {
    invariant: 'NONE',
    supremacy_level: 5,
    minimum_authority: 'USER',
    refutable_by: ['USER', 'PROJECT', 'CONSTITUTIONAL', 'SYSTEM_ROOT'],
    description: 'No invariant violated. Allow decision.'
  }
];

export class InvariantSupremacyRegistry {
  private supremacies: Map<InvariantCategory, InvariantSupremacy>;
  private bootstrapped: boolean = false;
  private frozen: boolean = false;

  constructor() {
    this.supremacies = new Map();
  }

  /**
   * Bootstrap the registry with default supremacy definitions
   */
  bootstrap(): void {
    if (this.bootstrapped) {
      throw new Error('InvariantSupremacyRegistry already bootstrapped');
    }

    for (const def of DEFAULT_INVARIANT_SUPREMACY) {
      this.supremacies.set(def.invariant, { ...def });
    }

    this.bootstrapped = true;
    this.freeze();
  }

  /**
   * Freeze the registry
   */
  private freeze(): void {
    this.frozen = true;

    for (const [key, def] of this.supremacies) {
      Object.freeze(def);
      Object.freeze(def.refutable_by);
      this.supremacies.set(key, def);
    }
  }

  /**
   * Get supremacy definition for an invariant
   */
  getSupremacy(invariant: InvariantCategory): InvariantSupremacy | null {
    this.ensureBootstrapped();
    return this.supremacies.get(invariant) || null;
  }

  /**
   * Get supremacy level for an invariant
   */
  getSupremacyLevel(invariant: InvariantCategory): SupremacyLevel {
    this.ensureBootstrapped();
    const def = this.supremacies.get(invariant);
    return def?.supremacy_level ?? 5;
  }

  /**
   * Check if an invariant is refutable at all
   */
  isRefutable(invariant: InvariantCategory): boolean {
    this.ensureBootstrapped();
    const def = this.supremacies.get(invariant);
    return def ? def.refutable_by.length > 0 : true;
  }

  /**
   * Check if an invariant is UNREFUTABLE (supremacy level 1)
   */
  isUnrefutable(invariant: InvariantCategory): boolean {
    this.ensureBootstrapped();
    const def = this.supremacies.get(invariant);
    return def?.supremacy_level === 1;
  }

  /**
   * Check if an authority can refute an invariant
   */
  canRefute(authority: AuthorityClass, invariant: InvariantCategory): boolean {
    this.ensureBootstrapped();

    const def = this.supremacies.get(invariant);
    if (!def) return true; // Unknown invariants are refutable by anyone

    // Level 1 = UNREFUTABLE
    if (def.supremacy_level === 1) {
      return false;
    }

    return def.refutable_by.includes(authority);
  }

  /**
   * Get all invariants at a specific supremacy level
   */
  getInvariantsAtLevel(level: SupremacyLevel): InvariantCategory[] {
    this.ensureBootstrapped();

    const result: InvariantCategory[] = [];
    for (const [invariant, def] of this.supremacies) {
      if (def.supremacy_level === level) {
        result.push(invariant);
      }
    }
    return result;
  }

  /**
   * Get all UNREFUTABLE invariants
   */
  getUnrefutableInvariants(): InvariantCategory[] {
    return this.getInvariantsAtLevel(1);
  }

  /**
   * Get minimum authority required to establish an invariant
   */
  getMinimumAuthority(invariant: InvariantCategory): AuthorityClass {
    this.ensureBootstrapped();
    const def = this.supremacies.get(invariant);
    return def?.minimum_authority ?? 'USER';
  }

  /**
   * Get all supremacy definitions
   */
  getAllSupremacies(): InvariantSupremacy[] {
    this.ensureBootstrapped();
    return [...this.supremacies.values()].sort((a, b) =>
      a.supremacy_level - b.supremacy_level
    );
  }

  /**
   * Ensure registry is bootstrapped
   */
  private ensureBootstrapped(): void {
    if (!this.bootstrapped) {
      throw new Error('InvariantSupremacyRegistry not bootstrapped. Call bootstrap() first.');
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total_invariants: number;
    unrefutable_count: number;
    by_level: Record<SupremacyLevel, number>;
    frozen: boolean;
  } {
    this.ensureBootstrapped();

    const byLevel: Record<SupremacyLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const def of this.supremacies.values()) {
      byLevel[def.supremacy_level]++;
    }

    return {
      total_invariants: this.supremacies.size,
      unrefutable_count: byLevel[1],
      by_level: byLevel,
      frozen: this.frozen
    };
  }

  /**
   * Check if registry is bootstrapped
   */
  isBootstrapped(): boolean {
    return this.bootstrapped;
  }

  /**
   * Check if registry is frozen
   */
  isFrozen(): boolean {
    return this.frozen;
  }
}

// Singleton instance
let registryInstance: InvariantSupremacyRegistry | null = null;

/**
 * Get or create the singleton InvariantSupremacyRegistry
 */
export function getInvariantSupremacyRegistry(): InvariantSupremacyRegistry {
  if (!registryInstance) {
    registryInstance = new InvariantSupremacyRegistry();
    registryInstance.bootstrap();
  }
  return registryInstance;
}

/**
 * Create a new InvariantSupremacyRegistry (for testing)
 */
export function createInvariantSupremacyRegistry(): InvariantSupremacyRegistry {
  const registry = new InvariantSupremacyRegistry();
  registry.bootstrap();
  return registry;
}

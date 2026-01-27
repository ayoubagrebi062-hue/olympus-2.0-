/**
 * AAM Engine (Authority & Attestation Mesh)
 *
 * Integrates all AAM components into a cohesive pipeline.
 * Enforces authority hierarchy and emits verifiable attestations.
 *
 * KEY PRINCIPLE:
 * - "Truth without authority is opinion. Authority without memory is tyranny."
 * - Authority determines who can establish and refute truths
 * - Attestations ensure decisions are externally witnessable
 *
 * PIPELINE:
 * 1. Validate authority for proof establishment
 * 2. Validate authority for refutation attempts
 * 3. Check invariant supremacy rules
 * 4. Emit attestation on acceptance
 * 5. Detect any chain forks
 *
 * NON-NEGOTIABLE:
 * - No AI, no heuristics, no learning
 * - Deterministic enforcement only
 * - HARD_ABORT on unauthorized actions
 */

import type {
  AuthorityClass,
  SupremacyLevel,
  ContinuityProof,
  AuthorizedContinuityProof,
  RefutationRecord,
  AttestationRecord,
  ForkDetectionResult,
  LedgerEntry,
  InvariantCategory
} from './types';
import {
  AuthorityClassRegistry,
  createAuthorityClassRegistry
} from './authority-class-registry';
import {
  InvariantSupremacyRegistry,
  createInvariantSupremacyRegistry
} from './invariant-supremacy-registry';
import {
  RefutationAuthorityValidator,
  createRefutationAuthorityValidator
} from './refutation-authority-validator';
import {
  AttestationEmitter,
  createAttestationEmitter,
  AttestationEmitterConfig
} from './attestation-emitter';
import {
  ForkDetector,
  createForkDetector
} from './fork-detector';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * AAM Engine configuration
 */
export interface AAMEngineConfig {
  attestation_dir?: string;
  enable_git_attestation?: boolean;
  git_repo_path?: string;
}

/**
 * Proof establishment request
 */
export interface ProofEstablishmentRequest {
  proof: ContinuityProof;
  authority_class: AuthorityClass;
}

/**
 * Proof establishment result
 */
export interface ProofEstablishmentResult {
  accepted: boolean;
  authorized_proof: AuthorizedContinuityProof | null;
  attestation: AttestationRecord | null;
  rejection_reason: string | null;
  authority_level: number;
  supremacy_level: SupremacyLevel;
}

/**
 * Refutation request
 */
export interface RefutationRequest {
  refutation: RefutationRecord;
  refuter_authority: AuthorityClass;
  refuted_authority: AuthorityClass;
}

/**
 * Refutation result
 */
export interface RefutationResult {
  authorized: boolean;
  hard_abort: boolean;
  rejection_reason: string | null;
  refuter_level: number;
  refuted_level: number;
  invariant_supremacy: SupremacyLevel;
}

/**
 * AAM Engine - Authority & Attestation Mesh
 */
export class AAMEngine {
  private authorityRegistry: AuthorityClassRegistry;
  private supremacyRegistry: InvariantSupremacyRegistry;
  private refutationValidator: RefutationAuthorityValidator;
  private attestationEmitter: AttestationEmitter;
  private forkDetector: ForkDetector;
  private initialized: boolean = false;

  constructor(config?: Partial<AAMEngineConfig>) {
    // Create all components
    this.authorityRegistry = createAuthorityClassRegistry();
    this.supremacyRegistry = createInvariantSupremacyRegistry();
    this.refutationValidator = createRefutationAuthorityValidator(
      this.authorityRegistry,
      this.supremacyRegistry
    );
    this.attestationEmitter = createAttestationEmitter({
      attestation_dir: config?.attestation_dir,
      enable_git_attestation: config?.enable_git_attestation,
      git_repo_path: config?.git_repo_path
    });
    this.forkDetector = createForkDetector();

    this.initialized = true;
  }

  /**
   * Establish a proof with authority validation
   */
  establishProof(request: ProofEstablishmentRequest): ProofEstablishmentResult {
    const { proof, authority_class } = request;

    // Get authority level
    const authorityLevel = this.authorityRegistry.getLevel(authority_class);

    // Get invariant supremacy level
    const invariant = proof.primary_invariant_violated || 'NONE';
    const supremacyLevel = this.supremacyRegistry.getSupremacyLevel(invariant);

    // Check if authority meets minimum requirement for this invariant
    const minimumAuthority = this.supremacyRegistry.getMinimumAuthority(invariant);
    const minimumLevel = this.authorityRegistry.getLevel(minimumAuthority);

    if (authorityLevel < minimumLevel) {
      return {
        accepted: false,
        authorized_proof: null,
        attestation: null,
        rejection_reason: `Authority ${authority_class} (level ${authorityLevel}) does not meet ` +
          `minimum requirement ${minimumAuthority} (level ${minimumLevel}) for invariant ${invariant}`,
        authority_level: authorityLevel,
        supremacy_level: supremacyLevel
      };
    }

    // Create authorized proof
    const authorizedProof: AuthorizedContinuityProof = {
      ...proof,
      authority_class,
      authority_level: authorityLevel,
      invariant_supremacy_level: supremacyLevel,
      attestation_reference: null // Will be filled after attestation
    };

    // Emit attestation
    const attestation = this.attestationEmitter.emit(
      proof,
      authority_class,
      authorityLevel
    );

    // Update attestation reference
    authorizedProof.attestation_reference = attestation.attestation_id;

    return {
      accepted: true,
      authorized_proof: authorizedProof,
      attestation,
      rejection_reason: null,
      authority_level: authorityLevel,
      supremacy_level: supremacyLevel
    };
  }

  /**
   * Validate a refutation attempt
   */
  validateRefutation(request: RefutationRequest): RefutationResult {
    const { refutation, refuter_authority, refuted_authority } = request;

    // Use the refutation validator
    const validation = this.refutationValidator.validateDetailed(
      refuter_authority,
      refuted_authority,
      refutation.refuted_invariant
    );

    return {
      authorized: validation.result.authorized,
      hard_abort: validation.hard_abort,
      rejection_reason: validation.result.rejection_reason,
      refuter_level: validation.result.refuter_level,
      refuted_level: validation.result.refuted_level,
      invariant_supremacy: validation.result.invariant_supremacy
    };
  }

  /**
   * Check if an invariant can be refuted at all
   */
  isRefutable(invariant: InvariantCategory): boolean {
    return this.supremacyRegistry.isRefutable(invariant);
  }

  /**
   * Check if an invariant is absolutely unrefutable (supremacy level 1)
   */
  isUnrefutable(invariant: InvariantCategory): boolean {
    return this.supremacyRegistry.isUnrefutable(invariant);
  }

  /**
   * Get authority required to refute a specific invariant
   */
  getMinimumRefutationAuthority(invariant: InvariantCategory): AuthorityClass | null {
    return this.refutationValidator.getMinimumRefutationAuthority(invariant);
  }

  /**
   * Detect fork between local and remote ledger
   */
  detectFork(
    localEntries: readonly LedgerEntry[],
    remoteEntries: readonly LedgerEntry[]
  ): ForkDetectionResult {
    return this.forkDetector.detectLedgerFork(localEntries, remoteEntries);
  }

  /**
   * Verify the attestation chain
   */
  verifyAttestationChain(): {
    valid: boolean;
    chain_intact: boolean;
    total_attestations: number;
    verified_count: number;
    errors: string[];
  } {
    return this.attestationEmitter.verify();
  }

  /**
   * Get all attestations
   */
  getAllAttestations(): readonly import('./types').AttestationLogEntry[] {
    return this.attestationEmitter.getAllEntries();
  }

  /**
   * Get attestation by index
   */
  getAttestationByIndex(index: number): import('./types').AttestationLogEntry | null {
    return this.attestationEmitter.getByIndex(index);
  }

  /**
   * Get authority hierarchy
   */
  getAuthorityHierarchy(): { class: AuthorityClass; level: number; description: string }[] {
    return this.authorityRegistry.getAllClasses().map(c => ({
      class: c.class,
      level: c.level,
      description: c.description
    }));
  }

  /**
   * Get all supremacy definitions
   */
  getSupremacyDefinitions(): {
    invariant: InvariantCategory;
    supremacy_level: SupremacyLevel;
    refutable_by: AuthorityClass[];
  }[] {
    return this.supremacyRegistry.getAllSupremacies().map(s => ({
      invariant: s.invariant,
      supremacy_level: s.supremacy_level,
      refutable_by: [...s.refutable_by]
    }));
  }

  /**
   * Get unrefutable invariants (supremacy level 1)
   */
  getUnrefutableInvariants(): InvariantCategory[] {
    return this.supremacyRegistry.getUnrefutableInvariants();
  }

  /**
   * Get comprehensive AAM statistics
   */
  getStats(): {
    authority: {
      total_classes: number;
      highest_level: number;
      lowest_level: number;
    };
    supremacy: {
      total_invariants: number;
      unrefutable_count: number;
      by_level: Record<SupremacyLevel, number>;
    };
    attestation: {
      total_attestations: number;
      chain_valid: boolean;
      first_timestamp: string | null;
      last_timestamp: string | null;
    };
    version: string;
  } {
    const authorityStats = this.authorityRegistry.getStats();
    const supremacyStats = this.supremacyRegistry.getStats();
    const attestationStats = this.attestationEmitter.getStats();

    return {
      authority: {
        total_classes: authorityStats.total_classes,
        highest_level: authorityStats.highest_level,
        lowest_level: authorityStats.lowest_level
      },
      supremacy: {
        total_invariants: supremacyStats.total_invariants,
        unrefutable_count: supremacyStats.unrefutable_count,
        by_level: supremacyStats.by_level
      },
      attestation: {
        total_attestations: attestationStats.total_attestations,
        chain_valid: attestationStats.chain_valid,
        first_timestamp: attestationStats.first_timestamp,
        last_timestamp: attestationStats.last_timestamp
      },
      version: AAM_VERSION
    };
  }

  /**
   * Clear attestations (FOR TESTING ONLY)
   */
  _dangerousClear(): void {
    console.warn('[AAMEngine] WARNING: Clearing attestations - TESTING ONLY');
    this.attestationEmitter._dangerousClear();
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get AAM version
   */
  getVersion(): string {
    return AAM_VERSION;
  }
}

/**
 * Create a new AAMEngine
 */
export function createAAMEngine(config?: Partial<AAMEngineConfig>): AAMEngine {
  return new AAMEngine(config);
}

/**
 * Fork Detector
 *
 * Detects ledger divergence between local and remote/reference chains.
 * Outputs last common ledger_index and conflicting continuity_hashes.
 *
 * KEY PRINCIPLE:
 * - A single source of truth must be maintained
 * - Forks indicate serious integrity issues
 * - Early detection prevents trust violations
 *
 * DETECTION STRATEGY:
 * 1. Compare chains from index 0
 * 2. Find first point of divergence
 * 3. Classify severity based on divergence depth
 *
 * SEVERITY LEVELS:
 * - NONE: No fork detected
 * - MINOR: Divergence in recent entries (< 10)
 * - MAJOR: Divergence in older entries (10-100)
 * - CRITICAL: Divergence in foundational entries (> 100)
 *
 * NON-NEGOTIABLE:
 * - Deterministic comparison
 * - No automatic resolution
 * - Clear divergence reporting
 */

import type {
  ForkDetectionResult,
  LedgerEntry,
  AttestationLogEntry
} from './types';

// AAM version - immutable
const AAM_VERSION = '1.0.0';
Object.freeze({ AAM_VERSION });

/**
 * Chain entry interface (generic for ledger or attestation)
 */
interface ChainEntry {
  index: number;
  hash: string;
  previous_hash: string | null;
}

/**
 * Fork detector configuration
 */
export interface ForkDetectorConfig {
  // Threshold for MINOR severity
  minor_threshold?: number;

  // Threshold for MAJOR severity
  major_threshold?: number;
}

export class ForkDetector {
  private config: Required<ForkDetectorConfig>;

  constructor(config?: Partial<ForkDetectorConfig>) {
    this.config = {
      minor_threshold: config?.minor_threshold ?? 10,
      major_threshold: config?.major_threshold ?? 100
    };
  }

  /**
   * Detect fork between local and remote ledger entries
   */
  detectLedgerFork(
    localEntries: readonly LedgerEntry[],
    remoteEntries: readonly LedgerEntry[]
  ): ForkDetectionResult {
    const localChain = localEntries.map(e => ({
      index: e.index,
      hash: e.entry_hash,
      previous_hash: e.previous_entry_hash
    }));

    const remoteChain = remoteEntries.map(e => ({
      index: e.index,
      hash: e.entry_hash,
      previous_hash: e.previous_entry_hash
    }));

    return this.detectFork(localChain, remoteChain);
  }

  /**
   * Detect fork between local and remote attestation entries
   */
  detectAttestationFork(
    localEntries: readonly AttestationLogEntry[],
    remoteEntries: readonly AttestationLogEntry[]
  ): ForkDetectionResult {
    const localChain = localEntries.map(e => ({
      index: e.index,
      hash: e.entry_hash,
      previous_hash: e.previous_attestation_hash
    }));

    const remoteChain = remoteEntries.map(e => ({
      index: e.index,
      hash: e.entry_hash,
      previous_hash: e.previous_attestation_hash
    }));

    return this.detectFork(localChain, remoteChain);
  }

  /**
   * Core fork detection algorithm
   */
  private detectFork(
    localChain: ChainEntry[],
    remoteChain: ChainEntry[]
  ): ForkDetectionResult {
    // Empty chains = no fork
    if (localChain.length === 0 && remoteChain.length === 0) {
      return this.noForkResult();
    }

    // One empty = potential fork at index 0
    if (localChain.length === 0 || remoteChain.length === 0) {
      if (localChain.length > 0) {
        return {
          fork_detected: true,
          last_common_index: null,
          last_common_hash: null,
          divergence_point: {
            local_hash: localChain[0].hash,
            remote_hash: '',
            index: 0
          },
          conflict_severity: this.classifySeverity(0, localChain.length)
        };
      }
      return this.noForkResult();
    }

    // Compare chains entry by entry
    const minLength = Math.min(localChain.length, remoteChain.length);
    let lastCommonIndex: number | null = null;
    let lastCommonHash: string | null = null;

    for (let i = 0; i < minLength; i++) {
      const local = localChain[i];
      const remote = remoteChain[i];

      // Check index consistency
      if (local.index !== i || remote.index !== i) {
        return {
          fork_detected: true,
          last_common_index: lastCommonIndex,
          last_common_hash: lastCommonHash,
          divergence_point: {
            local_hash: local.hash,
            remote_hash: remote.hash,
            index: i
          },
          conflict_severity: this.classifySeverity(i, Math.max(localChain.length, remoteChain.length))
        };
      }

      // Check hash match
      if (local.hash !== remote.hash) {
        return {
          fork_detected: true,
          last_common_index: lastCommonIndex,
          last_common_hash: lastCommonHash,
          divergence_point: {
            local_hash: local.hash,
            remote_hash: remote.hash,
            index: i
          },
          conflict_severity: this.classifySeverity(i, Math.max(localChain.length, remoteChain.length))
        };
      }

      // Check previous hash link (except for first entry)
      if (i > 0) {
        if (local.previous_hash !== remote.previous_hash) {
          return {
            fork_detected: true,
            last_common_index: lastCommonIndex,
            last_common_hash: lastCommonHash,
            divergence_point: {
              local_hash: local.hash,
              remote_hash: remote.hash,
              index: i
            },
            conflict_severity: this.classifySeverity(i, Math.max(localChain.length, remoteChain.length))
          };
        }
      }

      lastCommonIndex = i;
      lastCommonHash = local.hash;
    }

    // Check if one chain is longer
    if (localChain.length !== remoteChain.length) {
      // Not technically a fork, just different lengths
      // The shorter chain is a prefix of the longer
      return {
        fork_detected: false,
        last_common_index: lastCommonIndex,
        last_common_hash: lastCommonHash,
        divergence_point: null,
        conflict_severity: 'NONE'
      };
    }

    // No fork detected
    return {
      fork_detected: false,
      last_common_index: lastCommonIndex,
      last_common_hash: lastCommonHash,
      divergence_point: null,
      conflict_severity: 'NONE'
    };
  }

  /**
   * Classify severity based on divergence point
   */
  private classifySeverity(
    divergenceIndex: number,
    totalLength: number
  ): ForkDetectionResult['conflict_severity'] {
    const entriesFromEnd = totalLength - divergenceIndex;

    if (entriesFromEnd <= this.config.minor_threshold) {
      return 'MINOR';
    } else if (entriesFromEnd <= this.config.major_threshold) {
      return 'MAJOR';
    } else {
      return 'CRITICAL';
    }
  }

  /**
   * Create a no-fork result
   */
  private noForkResult(): ForkDetectionResult {
    return {
      fork_detected: false,
      last_common_index: null,
      last_common_hash: null,
      divergence_point: null,
      conflict_severity: 'NONE'
    };
  }

  /**
   * Compare a local chain against a list of remote hashes
   * (Lightweight comparison when full entries aren't available)
   */
  detectForkFromHashes(
    localEntries: readonly LedgerEntry[],
    remoteHashes: string[]
  ): ForkDetectionResult {
    if (localEntries.length === 0 && remoteHashes.length === 0) {
      return this.noForkResult();
    }

    if (localEntries.length === 0 || remoteHashes.length === 0) {
      return {
        fork_detected: true,
        last_common_index: null,
        last_common_hash: null,
        divergence_point: localEntries.length > 0 ? {
          local_hash: localEntries[0].entry_hash,
          remote_hash: '',
          index: 0
        } : null,
        conflict_severity: 'MINOR'
      };
    }

    const minLength = Math.min(localEntries.length, remoteHashes.length);
    let lastCommonIndex: number | null = null;
    let lastCommonHash: string | null = null;

    for (let i = 0; i < minLength; i++) {
      if (localEntries[i].entry_hash !== remoteHashes[i]) {
        return {
          fork_detected: true,
          last_common_index: lastCommonIndex,
          last_common_hash: lastCommonHash,
          divergence_point: {
            local_hash: localEntries[i].entry_hash,
            remote_hash: remoteHashes[i],
            index: i
          },
          conflict_severity: this.classifySeverity(i, Math.max(localEntries.length, remoteHashes.length))
        };
      }

      lastCommonIndex = i;
      lastCommonHash = localEntries[i].entry_hash;
    }

    return {
      fork_detected: false,
      last_common_index: lastCommonIndex,
      last_common_hash: lastCommonHash,
      divergence_point: null,
      conflict_severity: 'NONE'
    };
  }

  /**
   * Check if a single entry matches expected values
   */
  verifyEntry(
    entry: LedgerEntry,
    expectedIndex: number,
    expectedPreviousHash: string | null
  ): { valid: boolean; reason: string | null } {
    if (entry.index !== expectedIndex) {
      return {
        valid: false,
        reason: `Index mismatch: expected ${expectedIndex}, got ${entry.index}`
      };
    }

    if (entry.previous_entry_hash !== expectedPreviousHash) {
      return {
        valid: false,
        reason: `Previous hash mismatch at index ${entry.index}`
      };
    }

    return { valid: true, reason: null };
  }

  /**
   * Get fork detector configuration
   */
  getConfig(): ForkDetectorConfig {
    return { ...this.config };
  }
}

/**
 * Create a new ForkDetector
 */
export function createForkDetector(
  config?: Partial<ForkDetectorConfig>
): ForkDetector {
  return new ForkDetector(config);
}

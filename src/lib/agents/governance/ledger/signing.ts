/**
 * OLYMPUS 2.0 - Ledger Digital Signatures
 *
 * SECURITY FIX: Cluster #4 - Cryptographic Integrity
 * Provides digital signature creation and verification for ledger entries.
 * Ensures tamper-proof audit trail.
 *
 * @version 1.0.0
 */

import { createSign, createVerify, generateKeyPairSync, KeyObject } from 'crypto';
import { createHash } from 'crypto';
import type { GovernanceLedgerEntry } from './types';
import { logger } from '@/utils/logger';

/**
 * Signature configuration
 */
export interface SigningConfig {
  algorithm: 'RSA-SHA256' | 'RSA-SHA512';
  keySize: 2048 | 4096;
  /** If true, entries without signatures are rejected on verification */
  requireSignatures: boolean;
}

/**
 * Signed entry with signature metadata
 */
export interface SignedLedgerEntry extends GovernanceLedgerEntry {
  signature?: string;
  signedAt?: Date;
  signedBy?: string;
  signatureVersion?: string;
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
  signedAt?: Date;
  signedBy?: string;
}

/**
 * Integrity verification result for entire chain
 */
export interface ChainIntegrityResult {
  valid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  brokenAt?: number;
  reason?: string;
  tamperDetected: boolean;
}

const DEFAULT_CONFIG: SigningConfig = {
  algorithm: 'RSA-SHA256',
  keySize: 2048,
  requireSignatures: process.env.NODE_ENV === 'production',
};

/**
 * LedgerSigner - Signs and verifies ledger entries
 */
export class LedgerSigner {
  private config: SigningConfig;
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private signerId: string;

  constructor(config: Partial<SigningConfig> = {}, signerId: string = 'governance-system') {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.signerId = signerId;
  }

  /**
   * Initialize with existing keys
   */
  setKeys(privateKey: string, publicKey: string): void {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    logger.info('[LedgerSigner] Keys loaded');
  }

  /**
   * Generate new key pair (for initial setup)
   */
  generateKeys(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: this.config.keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    logger.info('[LedgerSigner] New key pair generated');
    return { privateKey, publicKey };
  }

  /**
   * Sign a ledger entry
   */
  sign(entry: GovernanceLedgerEntry): SignedLedgerEntry {
    if (!this.privateKey) {
      throw new Error('Private key not set. Call setKeys() or generateKeys() first.');
    }

    // Create canonical representation for signing
    const dataToSign = this.createCanonicalData(entry);

    // Create signature
    const signer = createSign(this.config.algorithm);
    signer.update(dataToSign);
    const signature = signer.sign(this.privateKey, 'base64');

    const signedEntry: SignedLedgerEntry = {
      ...entry,
      signature,
      signedAt: new Date(),
      signedBy: this.signerId,
      signatureVersion: '1.0',
    };

    return signedEntry;
  }

  /**
   * Verify a signed entry
   */
  verify(entry: SignedLedgerEntry): SignatureVerificationResult {
    // Check if signature exists
    if (!entry.signature) {
      if (this.config.requireSignatures) {
        return { valid: false, reason: 'Missing signature' };
      }
      // Allow unsigned entries when signatures are optional
      return { valid: true, reason: 'Unsigned entry (allowed)' };
    }

    if (!this.publicKey) {
      return { valid: false, reason: 'Public key not set' };
    }

    try {
      // Recreate canonical data
      const dataToVerify = this.createCanonicalData(entry);

      // Verify signature
      const verifier = createVerify(this.config.algorithm);
      verifier.update(dataToVerify);
      const isValid = verifier.verify(this.publicKey, entry.signature, 'base64');

      if (!isValid) {
        logger.warn('[LedgerSigner] Invalid signature detected', {
          entryId: entry.id,
          buildId: entry.buildId,
        });
        return { valid: false, reason: 'Invalid signature - possible tampering' };
      }

      return {
        valid: true,
        signedAt: entry.signedAt,
        signedBy: entry.signedBy,
      };
    } catch (error) {
      logger.error('[LedgerSigner] Verification error', { error });
      return { valid: false, reason: `Verification failed: ${(error as Error).message}` };
    }
  }

  /**
   * Verify entire chain integrity (hash chain + signatures)
   */
  verifyChainIntegrity(entries: SignedLedgerEntry[]): ChainIntegrityResult {
    if (entries.length === 0) {
      return {
        valid: true,
        totalEntries: 0,
        verifiedEntries: 0,
        tamperDetected: false,
      };
    }

    let verifiedCount = 0;
    let previousHash = entries[0].previousHash;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // 1. Verify hash chain
      const expectedHash = this.computeEntryHash(entry, previousHash);
      if (entry.ledgerHash && entry.ledgerHash !== expectedHash) {
        logger.error('[LedgerSigner] Hash chain broken', {
          index: i,
          expected: expectedHash,
          actual: entry.ledgerHash,
        });
        return {
          valid: false,
          totalEntries: entries.length,
          verifiedEntries: verifiedCount,
          brokenAt: i,
          reason: `Hash chain broken at entry ${i}`,
          tamperDetected: true,
        };
      }

      // 2. Verify signature
      const sigResult = this.verify(entry);
      if (!sigResult.valid) {
        logger.error('[LedgerSigner] Signature verification failed', {
          index: i,
          reason: sigResult.reason,
        });
        return {
          valid: false,
          totalEntries: entries.length,
          verifiedEntries: verifiedCount,
          brokenAt: i,
          reason: `Signature invalid at entry ${i}: ${sigResult.reason}`,
          tamperDetected: true,
        };
      }

      previousHash = entry.ledgerHash || expectedHash;
      verifiedCount++;
    }

    logger.info('[LedgerSigner] Chain integrity verified', {
      totalEntries: entries.length,
      verifiedEntries: verifiedCount,
    });

    return {
      valid: true,
      totalEntries: entries.length,
      verifiedEntries: verifiedCount,
      tamperDetected: false,
    };
  }

  /**
   * Check if signer has keys configured
   */
  hasKeys(): boolean {
    return this.privateKey !== null && this.publicKey !== null;
  }

  /**
   * Get public key (for distribution)
   */
  getPublicKey(): string | null {
    return this.publicKey;
  }

  // ─────────────── PRIVATE ───────────────

  /**
   * Create canonical data representation for signing
   * Ensures consistent ordering for verification
   */
  private createCanonicalData(entry: GovernanceLedgerEntry): string {
    return JSON.stringify({
      actionType: entry.actionType,
      agentId: entry.agentId,
      buildId: entry.buildId,
      actionData: entry.actionData,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp,
      immutable: entry.immutable,
      ledgerHash: entry.ledgerHash,
      previousHash: entry.previousHash,
    });
  }

  /**
   * Compute entry hash (same as hashing.ts but inline)
   */
  private computeEntryHash(entry: GovernanceLedgerEntry, previousHash: string): string {
    const data = JSON.stringify({
      actionType: entry.actionType,
      agentId: entry.agentId,
      buildId: entry.buildId,
      actionData: entry.actionData,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp,
      immutable: entry.immutable,
      previousHash,
    });

    return createHash('sha256').update(data).digest('hex');
  }
}

// ─────────────── TAMPER DETECTION ───────────────

/**
 * TamperAlert - Emitted when tampering is detected
 */
export interface TamperAlert {
  id: string;
  detectedAt: Date;
  severity: 'critical';
  type: 'hash_chain_broken' | 'signature_invalid' | 'entry_modified';
  entryIndex: number;
  buildId?: string;
  details: string;
}

/**
 * Tamper detection callback
 */
export type TamperCallback = (alert: TamperAlert) => void;

/**
 * IntegrityMonitor - Monitors ledger for tampering
 */
export class IntegrityMonitor {
  private signer: LedgerSigner;
  private callbacks: TamperCallback[] = [];

  constructor(signer: LedgerSigner) {
    this.signer = signer;
  }

  /**
   * Register tamper detection callback
   */
  onTamperDetected(callback: TamperCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Run integrity check and alert on issues
   */
  async checkIntegrity(entries: SignedLedgerEntry[]): Promise<ChainIntegrityResult> {
    const result = this.signer.verifyChainIntegrity(entries);

    if (result.tamperDetected) {
      const alert: TamperAlert = {
        id: `tamper-${Date.now()}`,
        detectedAt: new Date(),
        severity: 'critical',
        type: result.reason?.includes('signature') ? 'signature_invalid' : 'hash_chain_broken',
        entryIndex: result.brokenAt || 0,
        buildId: entries[result.brokenAt || 0]?.buildId,
        details: result.reason || 'Unknown tampering detected',
      };

      // Notify all callbacks
      for (const callback of this.callbacks) {
        try {
          callback(alert);
        } catch (error) {
          logger.error('[IntegrityMonitor] Callback error', { error });
        }
      }

      // Also log to console for immediate visibility
      console.error('🚨 TAMPER ALERT:', alert);
    }

    return result;
  }
}

// ─────────────── SINGLETON ───────────────

let defaultSigner: LedgerSigner | null = null;

/**
 * Get default signer instance
 */
export function getLedgerSigner(): LedgerSigner {
  if (!defaultSigner) {
    defaultSigner = new LedgerSigner();
  }
  return defaultSigner;
}

export default LedgerSigner;

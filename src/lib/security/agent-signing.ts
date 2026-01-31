/**
 * OLYMPUS 2.1 - Agent Request Signing
 *
 * SECURITY FIX: Cluster #4 Hardening - Inter-Agent Communication Security
 * Implements HMAC signing for agent-to-agent messages to prevent:
 * - Agent impersonation
 * - Message tampering
 * - Replay attacks
 *
 * @version 1.0.0
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { logger } from '@/utils/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signed message envelope
 */
export interface SignedAgentMessage<T = unknown> {
  /** Original message payload */
  payload: T;
  /** Sending agent ID */
  agentId: string;
  /** Message timestamp (Unix ms) */
  timestamp: number;
  /** Unique nonce to prevent replay */
  nonce: string;
  /** HMAC-SHA256 signature */
  signature: string;
  /** Signature version for upgrades */
  signatureVersion: '1.0';
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
  agentId?: string;
  age?: number;
}

/**
 * Agent signing configuration
 */
export interface AgentSigningConfig {
  /** Secret key for HMAC (should be unique per agent pair or shared) */
  secretKey: string;
  /** Maximum message age in ms (default: 5 minutes) */
  maxMessageAge?: number;
  /** Nonce cache TTL in ms (default: 10 minutes) */
  nonceCacheTtl?: number;
  /** Maximum nonce cache size */
  maxNonceCacheSize?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_MESSAGE_AGE = 5 * 60 * 1000; // 5 minutes
const DEFAULT_NONCE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const DEFAULT_MAX_NONCE_CACHE_SIZE = 10000;
const SIGNATURE_ALGORITHM = 'sha256';

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT SIGNER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AgentSigner - Signs and verifies inter-agent messages
 */
export class AgentSigner {
  private secretKey: Buffer;
  private maxMessageAge: number;
  private nonceCacheTtl: number;
  private maxNonceCacheSize: number;

  // Nonce cache to prevent replay attacks
  private nonceCache: Map<string, number> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: AgentSigningConfig) {
    this.secretKey = Buffer.from(config.secretKey, 'utf-8');
    this.maxMessageAge = config.maxMessageAge ?? DEFAULT_MAX_MESSAGE_AGE;
    this.nonceCacheTtl = config.nonceCacheTtl ?? DEFAULT_NONCE_CACHE_TTL;
    this.maxNonceCacheSize = config.maxNonceCacheSize ?? DEFAULT_MAX_NONCE_CACHE_SIZE;

    // Start nonce cleanup
    this.startNonceCleanup();
  }

  /**
   * Sign a message for sending to another agent
   */
  sign<T>(payload: T, agentId: string): SignedAgentMessage<T> {
    const timestamp = Date.now();
    const nonce = this.generateNonce();

    // Create canonical data for signing
    const dataToSign = this.createCanonicalData(payload, agentId, timestamp, nonce);

    // Create HMAC signature
    const signature = this.createSignature(dataToSign);

    const signedMessage: SignedAgentMessage<T> = {
      payload,
      agentId,
      timestamp,
      nonce,
      signature,
      signatureVersion: '1.0',
    };

    logger.debug('[AgentSigner] Message signed', { agentId, nonce: nonce.slice(0, 8) + '...' });

    return signedMessage;
  }

  /**
   * Verify a signed message from another agent
   */
  verify<T>(message: SignedAgentMessage<T>): SignatureVerificationResult {
    const now = Date.now();

    // 1. Check message age (prevent delayed replay)
    const age = now - message.timestamp;
    if (age > this.maxMessageAge) {
      logger.warn('[AgentSigner] Message too old', {
        agentId: message.agentId,
        age,
        maxAge: this.maxMessageAge,
      });
      return {
        valid: false,
        reason: `Message expired (age: ${age}ms, max: ${this.maxMessageAge}ms)`,
        age,
      };
    }

    // 2. Check future timestamp (clock skew tolerance: 30 seconds)
    if (message.timestamp > now + 30000) {
      logger.warn('[AgentSigner] Message from future', {
        agentId: message.agentId,
        timestamp: message.timestamp,
        now,
      });
      return {
        valid: false,
        reason: 'Message timestamp in future (clock skew too high)',
      };
    }

    // 3. Check nonce replay
    if (this.isNonceUsed(message.nonce)) {
      logger.warn('[AgentSigner] Nonce replay detected', {
        agentId: message.agentId,
        nonce: message.nonce.slice(0, 8) + '...',
      });
      return {
        valid: false,
        reason: 'Nonce already used (replay attack detected)',
        agentId: message.agentId,
      };
    }

    // 4. Verify signature
    const dataToVerify = this.createCanonicalData(
      message.payload,
      message.agentId,
      message.timestamp,
      message.nonce
    );

    const expectedSignature = this.createSignature(dataToVerify);

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(message.signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      logger.warn('[AgentSigner] Signature length mismatch', { agentId: message.agentId });
      return {
        valid: false,
        reason: 'Invalid signature format',
        agentId: message.agentId,
      };
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      logger.warn('[AgentSigner] Signature verification failed', { agentId: message.agentId });
      return {
        valid: false,
        reason: 'Invalid signature (message may be tampered)',
        agentId: message.agentId,
      };
    }

    // 5. Record nonce to prevent replay
    this.recordNonce(message.nonce);

    logger.debug('[AgentSigner] Message verified', {
      agentId: message.agentId,
      age,
    });

    return {
      valid: true,
      agentId: message.agentId,
      age,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.nonceCache.clear();
  }

  // ─────────────── PRIVATE ───────────────

  /**
   * Generate cryptographically secure nonce
   */
  private generateNonce(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Create canonical data representation for signing
   */
  private createCanonicalData<T>(
    payload: T,
    agentId: string,
    timestamp: number,
    nonce: string
  ): string {
    // Sort keys for deterministic ordering
    const canonicalPayload = JSON.stringify(payload, Object.keys(payload as object).sort());

    return JSON.stringify({
      a: agentId,
      n: nonce,
      p: canonicalPayload,
      t: timestamp,
      v: '1.0',
    });
  }

  /**
   * Create HMAC signature
   */
  private createSignature(data: string): string {
    return createHmac(SIGNATURE_ALGORITHM, this.secretKey).update(data).digest('hex');
  }

  /**
   * Check if nonce was already used
   */
  private isNonceUsed(nonce: string): boolean {
    return this.nonceCache.has(nonce);
  }

  /**
   * Record nonce as used
   */
  private recordNonce(nonce: string): void {
    // Enforce max size
    if (this.nonceCache.size >= this.maxNonceCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.nonceCache.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, Math.floor(this.maxNonceCacheSize * 0.2));
      for (const [key] of toRemove) {
        this.nonceCache.delete(key);
      }
    }

    this.nonceCache.set(nonce, Date.now());
  }

  /**
   * Start periodic nonce cleanup
   */
  private startNonceCleanup(): void {
    if (typeof setInterval === 'undefined') return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiry = now - this.nonceCacheTtl;

      let removed = 0;
      for (const [nonce, timestamp] of this.nonceCache.entries()) {
        if (timestamp < expiry) {
          this.nonceCache.delete(nonce);
          removed++;
        }
      }

      if (removed > 0) {
        logger.debug('[AgentSigner] Nonce cleanup', { removed, remaining: this.nonceCache.size });
      }
    }, 60000); // Every minute
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT KEY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages signing keys for different agent pairs
 */
export class AgentKeyRegistry {
  private signers: Map<string, AgentSigner> = new Map();
  private defaultConfig: Omit<AgentSigningConfig, 'secretKey'>;

  constructor(
    config: Omit<AgentSigningConfig, 'secretKey'> = {
      maxMessageAge: DEFAULT_MAX_MESSAGE_AGE,
      nonceCacheTtl: DEFAULT_NONCE_CACHE_TTL,
      maxNonceCacheSize: DEFAULT_MAX_NONCE_CACHE_SIZE,
    }
  ) {
    this.defaultConfig = config;
  }

  /**
   * Register a shared key for agent communication
   * Use format: "agentA:agentB" with alphabetical ordering
   */
  registerKey(agentPair: string, secretKey: string): void {
    const normalizedPair = this.normalizePair(agentPair);

    if (this.signers.has(normalizedPair)) {
      this.signers.get(normalizedPair)?.destroy();
    }

    this.signers.set(
      normalizedPair,
      new AgentSigner({
        ...this.defaultConfig,
        secretKey,
      })
    );

    logger.info('[AgentKeyRegistry] Key registered', { pair: normalizedPair });
  }

  /**
   * Get signer for agent pair
   */
  getSigner(agentA: string, agentB: string): AgentSigner | null {
    const pair = this.normalizePair(`${agentA}:${agentB}`);
    return this.signers.get(pair) ?? null;
  }

  /**
   * Sign message from one agent to another
   */
  signMessage<T>(fromAgent: string, toAgent: string, payload: T): SignedAgentMessage<T> | null {
    const signer = this.getSigner(fromAgent, toAgent);
    if (!signer) {
      logger.error('[AgentKeyRegistry] No key registered for pair', { fromAgent, toAgent });
      return null;
    }
    return signer.sign(payload, fromAgent);
  }

  /**
   * Verify message between agents
   */
  verifyMessage<T>(
    fromAgent: string,
    toAgent: string,
    message: SignedAgentMessage<T>
  ): SignatureVerificationResult {
    const signer = this.getSigner(fromAgent, toAgent);
    if (!signer) {
      return {
        valid: false,
        reason: 'No key registered for agent pair',
      };
    }

    // Verify agent ID matches
    if (message.agentId !== fromAgent) {
      return {
        valid: false,
        reason: `Agent ID mismatch (expected: ${fromAgent}, got: ${message.agentId})`,
        agentId: message.agentId,
      };
    }

    return signer.verify(message);
  }

  /**
   * Cleanup all signers
   */
  destroy(): void {
    for (const signer of this.signers.values()) {
      signer.destroy();
    }
    this.signers.clear();
  }

  /**
   * Normalize agent pair for consistent lookup
   */
  private normalizePair(pair: string): string {
    const parts = pair.split(':');
    if (parts.length !== 2) return pair;
    return parts.sort().join(':');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE AGENT SIGNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-configured signer for governance system agents
 * Uses environment variable OLYMPUS_AGENT_SIGNING_KEY
 */
let governanceSigner: AgentSigner | null = null;

/**
 * Get or create governance agent signer
 */
export function getGovernanceSigner(): AgentSigner {
  if (governanceSigner) {
    return governanceSigner;
  }

  const secretKey = process.env.OLYMPUS_AGENT_SIGNING_KEY;

  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[AgentSigning] OLYMPUS_AGENT_SIGNING_KEY is required in production. ' +
          'Set this environment variable to a cryptographically random string.'
      );
    }
    // Dev-only: generate a random ephemeral key (different each restart)
    const ephemeralKey = require('crypto').randomBytes(32).toString('hex');
    logger.warn(
      '[AgentSigning] No signing key configured — using ephemeral key (dev only, changes on restart)'
    );
    governanceSigner = new AgentSigner({
      secretKey: ephemeralKey,
      maxMessageAge: 5 * 60 * 1000,
      nonceCacheTtl: 10 * 60 * 1000,
      maxNonceCacheSize: 5000,
    });
    return governanceSigner;
  }

  governanceSigner = new AgentSigner({
    secretKey,
    maxMessageAge: 5 * 60 * 1000, // 5 minutes
    nonceCacheTtl: 10 * 60 * 1000, // 10 minutes
    maxNonceCacheSize: 5000,
  });

  return governanceSigner;
}

/**
 * Sign a governance inter-agent message
 */
export function signGovernanceMessage<T>(payload: T, agentId: string): SignedAgentMessage<T> {
  return getGovernanceSigner().sign(payload, agentId);
}

/**
 * Verify a governance inter-agent message
 */
export function verifyGovernanceMessage<T>(
  message: SignedAgentMessage<T>
): SignatureVerificationResult {
  return getGovernanceSigner().verify(message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default AgentSigner;

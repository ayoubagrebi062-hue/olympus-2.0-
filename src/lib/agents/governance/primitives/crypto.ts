/**
 * OLYMPUS 2.0 - Cryptographic Primitives
 * Phase 0: Minimal crypto utilities for identity verification
 * @version 1.0.0
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Compute SHA-256 fingerprint of agent definition
 * Fingerprint = SHA-256(code + prompt + permissions)
 */
export function computeFingerprint(
  agentCode: string,
  promptTemplate: string,
  toolPermissions: unknown
): string {
  const data = JSON.stringify({
    code: agentCode,
    prompt: promptTemplate,
    permissions: toolPermissions,
  });

  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate UUID v4
 * Simple replacement for generateUUID()
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate cryptographically random nonce
 * For lease nonce generation (future phase)
 */
export function generateNonce(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

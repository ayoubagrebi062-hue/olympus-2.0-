/**
 * OLYMPUS 2.0 — Ledger Hashing Utilities
 * Phase 2.4: SHA-256 Chain Hashing
 * @version 1.0.0
 */

import { createHash } from 'crypto';
import type { GovernanceLedgerEntry, LedgerHash } from './types';

export function computeLedgerHash(entry: GovernanceLedgerEntry, previousHash: string): string {
  const data = JSON.stringify({
    actionType: entry.actionType,
    agentId: entry.agentId,
    buildId: entry.buildId,
    actionData: entry.actionData,
    timestamp: entry.timestamp.getTime(),
    immutable: entry.immutable,
    previousHash: previousHash,
  });

  return createHash('sha256').update(data).digest('hex');
}

export function verifyLedgerChain(entries: GovernanceLedgerEntry[]): boolean {
  if (entries.length === 0) {
    return true;
  }

  let previousHash = entries[0].previousHash;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedHash = computeLedgerHash(entry, previousHash);

    if (entry.ledgerHash !== expectedHash) {
      console.error(
        `[LedgerHashing] Chain broken at entry ${i}: expected ${expectedHash}, got ${entry.ledgerHash}`
      );
      return false;
    }

    previousHash = entry.ledgerHash;
  }

  console.log(`[LedgerHashing] Verified ${entries.length} entries in chain`);
  return true;
}

export function computeChainRootHash(entries: GovernanceLedgerEntry[]): string {
  if (entries.length === 0) {
    return createHash('sha256').update('').digest('hex');
  }

  const lastEntry = entries[entries.length - 1];
  return lastEntry.ledgerHash;
}

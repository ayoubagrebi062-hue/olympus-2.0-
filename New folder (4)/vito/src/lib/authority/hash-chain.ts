/**
 * OLYMPUS Hash Chain
 *
 * Cryptographic event continuity.
 * Every event chains to previous.
 * Tampering breaks the chain.
 * Fail loudly on verification failure.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ChainedEvent {
  sequence: number;
  timestamp: string;
  eventType: string;
  payload: unknown;
  previousHash: string;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  brokenAt: number | null;
  reason: string | null;
  checkedCount: number;
  firstSequence: number;
  lastSequence: number;
}

export interface ChainState {
  buildId: string;
  lastHash: string;
  lastSequence: number;
  genesisHash: string;
  eventCount: number;
}

// =============================================================================
// HASH FUNCTION (SHA-256 via Web Crypto API)
// =============================================================================

async function sha256(data: string): Promise<string> {
  // In Node.js environment
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for Node.js without Web Crypto
  try {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch {
    // Last resort: simple hash (NOT cryptographically secure, only for dev)
    console.warn('[HASH CHAIN] WARNING: Using fallback hash - NOT SECURE');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

// Synchronous version for hot path (uses cached last hash)
function computeEventFingerprint(event: Omit<ChainedEvent, 'hash'>): string {
  return JSON.stringify({
    seq: event.sequence,
    ts: event.timestamp,
    type: event.eventType,
    payload: event.payload,
    prev: event.previousHash,
  });
}

// =============================================================================
// CHAIN STORAGE (In-memory, replace with append-only log in production)
// =============================================================================

const chains: Map<string, ChainedEvent[]> = new Map();
const chainStates: Map<string, ChainState> = new Map();

const GENESIS_HASH = '0'.repeat(64); // All zeros for genesis

// =============================================================================
// CHAIN OPERATIONS
// =============================================================================

/**
 * Initialize a new chain for a build.
 * MUST be called before any events are added.
 */
export async function initializeChain(buildId: string): Promise<ChainState> {
  if (chainStates.has(buildId)) {
    throw new Error(`[HASH CHAIN] Chain already exists for build ${buildId}`);
  }

  const state: ChainState = {
    buildId,
    lastHash: GENESIS_HASH,
    lastSequence: 0,
    genesisHash: GENESIS_HASH,
    eventCount: 0,
  };

  chains.set(buildId, []);
  chainStates.set(buildId, state);

  console.log(`[HASH CHAIN] Initialized chain for build ${buildId}`);
  return state;
}

/**
 * Append an event to the chain.
 * Returns the chained event with computed hash.
 * THROWS if chain is broken or doesn't exist.
 */
export async function appendToChain(
  buildId: string,
  eventType: string,
  payload: unknown
): Promise<ChainedEvent> {
  const state = chainStates.get(buildId);
  if (!state) {
    throw new Error(`[HASH CHAIN] No chain exists for build ${buildId}. Call initializeChain first.`);
  }

  const chain = chains.get(buildId)!;
  const sequence = state.lastSequence + 1;
  const timestamp = new Date().toISOString();

  // Build event without hash
  const eventWithoutHash: Omit<ChainedEvent, 'hash'> = {
    sequence,
    timestamp,
    eventType,
    payload,
    previousHash: state.lastHash,
  };

  // Compute hash
  const fingerprint = computeEventFingerprint(eventWithoutHash);
  const hash = await sha256(fingerprint);

  // Complete event
  const chainedEvent: ChainedEvent = {
    ...eventWithoutHash,
    hash,
  };

  // Append to chain
  chain.push(chainedEvent);

  // Update state
  state.lastHash = hash;
  state.lastSequence = sequence;
  state.eventCount++;

  return chainedEvent;
}

/**
 * Verify chain integrity from start to end.
 * Returns verification result with details on any breaks.
 */
export async function verifyChain(buildId: string): Promise<ChainVerification> {
  const chain = chains.get(buildId);
  if (!chain) {
    return {
      valid: false,
      brokenAt: null,
      reason: 'Chain does not exist',
      checkedCount: 0,
      firstSequence: 0,
      lastSequence: 0,
    };
  }

  if (chain.length === 0) {
    return {
      valid: true,
      brokenAt: null,
      reason: null,
      checkedCount: 0,
      firstSequence: 0,
      lastSequence: 0,
    };
  }

  let previousHash = GENESIS_HASH;

  for (let i = 0; i < chain.length; i++) {
    const event = chain[i];

    // Check previous hash link
    if (event.previousHash !== previousHash) {
      return {
        valid: false,
        brokenAt: event.sequence,
        reason: `Previous hash mismatch at sequence ${event.sequence}. Expected ${previousHash.slice(0, 16)}..., got ${event.previousHash.slice(0, 16)}...`,
        checkedCount: i + 1,
        firstSequence: chain[0].sequence,
        lastSequence: event.sequence,
      };
    }

    // Recompute hash
    const eventWithoutHash: Omit<ChainedEvent, 'hash'> = {
      sequence: event.sequence,
      timestamp: event.timestamp,
      eventType: event.eventType,
      payload: event.payload,
      previousHash: event.previousHash,
    };
    const fingerprint = computeEventFingerprint(eventWithoutHash);
    const computedHash = await sha256(fingerprint);

    if (computedHash !== event.hash) {
      return {
        valid: false,
        brokenAt: event.sequence,
        reason: `Hash mismatch at sequence ${event.sequence}. Event may have been tampered.`,
        checkedCount: i + 1,
        firstSequence: chain[0].sequence,
        lastSequence: event.sequence,
      };
    }

    previousHash = event.hash;
  }

  return {
    valid: true,
    brokenAt: null,
    reason: null,
    checkedCount: chain.length,
    firstSequence: chain[0].sequence,
    lastSequence: chain[chain.length - 1].sequence,
  };
}

/**
 * Get chain state for a build.
 */
export function getChainState(buildId: string): ChainState | null {
  return chainStates.get(buildId) || null;
}

/**
 * Get all events in chain.
 */
export function getChainEvents(buildId: string): ChainedEvent[] {
  return chains.get(buildId) || [];
}

/**
 * Get events after a specific sequence.
 */
export function getChainEventsAfter(buildId: string, afterSequence: number): ChainedEvent[] {
  const chain = chains.get(buildId) || [];
  return chain.filter(e => e.sequence > afterSequence);
}

/**
 * Get specific event by sequence.
 */
export function getChainEvent(buildId: string, sequence: number): ChainedEvent | null {
  const chain = chains.get(buildId) || [];
  return chain.find(e => e.sequence === sequence) || null;
}

/**
 * Verify a single event's hash.
 */
export async function verifyEvent(event: ChainedEvent): Promise<boolean> {
  const eventWithoutHash: Omit<ChainedEvent, 'hash'> = {
    sequence: event.sequence,
    timestamp: event.timestamp,
    eventType: event.eventType,
    payload: event.payload,
    previousHash: event.previousHash,
  };
  const fingerprint = computeEventFingerprint(eventWithoutHash);
  const computedHash = await sha256(fingerprint);
  return computedHash === event.hash;
}

// =============================================================================
// TRUST METRICS
// =============================================================================

export interface TrustMetrics {
  chainValid: boolean;
  lastVerifiedAt: string | null;
  totalEvents: number;
  verificationCount: number;
  lastBrokenAt: number | null;
  trustScore: number; // 0-100
}

const trustMetrics: Map<string, TrustMetrics> = new Map();

/**
 * Update trust metrics after verification.
 */
export function updateTrustMetrics(buildId: string, verification: ChainVerification): TrustMetrics {
  const existing = trustMetrics.get(buildId) || {
    chainValid: true,
    lastVerifiedAt: null,
    totalEvents: 0,
    verificationCount: 0,
    lastBrokenAt: null,
    trustScore: 100,
  };

  const metrics: TrustMetrics = {
    chainValid: verification.valid,
    lastVerifiedAt: new Date().toISOString(),
    totalEvents: verification.checkedCount,
    verificationCount: existing.verificationCount + 1,
    lastBrokenAt: verification.brokenAt || existing.lastBrokenAt,
    trustScore: verification.valid ? 100 : 0, // Binary for now
  };

  trustMetrics.set(buildId, metrics);
  return metrics;
}

/**
 * Get trust metrics for a build.
 */
export function getTrustMetrics(buildId: string): TrustMetrics | null {
  return trustMetrics.get(buildId) || null;
}

/**
 * OLYMPUS Authority Ledger
 *
 * Every irreversible action writes here BEFORE execution.
 * If it's not in the ledger, it didn't happen.
 * Fail loudly if ledger write fails.
 */

import { AuthorityEntry, AuthorityEventType } from '../realtime/protocol';

// =============================================================================
// LEDGER STORAGE (In-memory for now, replace with PostgreSQL)
// =============================================================================

const ledger: Map<string, AuthorityEntry[]> = new Map();
let globalSequence = 0;

function generateId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// CORE LEDGER OPERATIONS
// =============================================================================

/**
 * Write an entry to the authority ledger.
 * This MUST succeed before the associated action executes.
 * Throws on failure - do not catch and continue.
 */
export function writeToLedger(
  buildId: string,
  eventType: AuthorityEventType,
  actorId: string | null,
  details: Record<string, unknown>
): AuthorityEntry {
  const entry: AuthorityEntry = {
    id: generateId(),
    buildId,
    eventType,
    actorId,
    details,
    timestamp: new Date().toISOString(),
    sequence: ++globalSequence,
  };

  // Get or create build ledger
  if (!ledger.has(buildId)) {
    ledger.set(buildId, []);
  }

  const buildLedger = ledger.get(buildId)!;

  // CRITICAL: This must be atomic in production (database transaction)
  try {
    buildLedger.push(entry);
    console.log(`[AUTHORITY] ${eventType} | build=${buildId} | seq=${entry.sequence}`);
    return entry;
  } catch (error) {
    // FATAL: Ledger write failed
    console.error(`[AUTHORITY] FATAL: Failed to write ledger entry`, error);
    throw new Error(`Authority ledger write failed: ${error}`);
  }
}

/**
 * Read all entries for a build.
 */
export function readBuildLedger(buildId: string): AuthorityEntry[] {
  return ledger.get(buildId) || [];
}

/**
 * Read entries after a specific sequence number.
 */
export function readLedgerAfter(buildId: string, afterSequence: number): AuthorityEntry[] {
  const entries = ledger.get(buildId) || [];
  return entries.filter(e => e.sequence > afterSequence);
}

/**
 * Get the latest sequence number for a build.
 */
export function getLatestSequence(buildId: string): number {
  const entries = ledger.get(buildId) || [];
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].sequence;
}

// =============================================================================
// CONVENIENCE WRITERS (Type-safe wrappers)
// =============================================================================

export const Authority = {
  buildStart(buildId: string, operatorId: string, parameters: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_START', operatorId, { parameters });
  },

  buildPause(buildId: string, operatorId: string, reason?: string): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_PAUSE', operatorId, { reason });
  },

  buildResume(buildId: string, operatorId: string): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_RESUME', operatorId, {});
  },

  buildCancel(buildId: string, operatorId: string, preserveArtifacts: boolean): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_CANCEL', operatorId, { preserveArtifacts });
  },

  buildComplete(buildId: string, summary: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_COMPLETE', null, { summary });
  },

  buildFail(buildId: string, error: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'BUILD_FAIL', null, { error });
  },

  phaseStart(buildId: string, phase: string, agentCount: number): AuthorityEntry {
    return writeToLedger(buildId, 'PHASE_START', null, { phase, agentCount });
  },

  phaseComplete(buildId: string, phase: string, tokensUsed: number, durationMs: number): AuthorityEntry {
    return writeToLedger(buildId, 'PHASE_COMPLETE', null, { phase, tokensUsed, durationMs });
  },

  phaseFail(buildId: string, phase: string, failedAgent: string, reason: string): AuthorityEntry {
    return writeToLedger(buildId, 'PHASE_FAIL', null, { phase, failedAgent, reason });
  },

  agentStart(buildId: string, agent: string, phase: string): AuthorityEntry {
    return writeToLedger(buildId, 'AGENT_START', null, { agent, phase });
  },

  agentComplete(buildId: string, agent: string, artifactId: string, tokensUsed: number): AuthorityEntry {
    return writeToLedger(buildId, 'AGENT_COMPLETE', null, { agent, artifactId, tokensUsed });
  },

  agentFail(buildId: string, agent: string, error: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'AGENT_FAIL', null, { agent, error });
  },

  agentSkip(buildId: string, agent: string, reason: string): AuthorityEntry {
    return writeToLedger(buildId, 'AGENT_SKIP', null, { agent, reason });
  },

  gateOpen(buildId: string, gateId: string, gateType: string, context: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'GATE_OPEN', null, { gateId, gateType, context });
  },

  gateResolve(buildId: string, gateId: string, operatorId: string, decision: string, metadata?: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'GATE_RESOLVE', operatorId, { gateId, decision, metadata });
  },

  artifactCreate(buildId: string, artifactId: string, agent: string, type: string, name: string): AuthorityEntry {
    return writeToLedger(buildId, 'ARTIFACT_CREATE', null, { artifactId, agent, type, name });
  },

  costUpdate(buildId: string, tokensUsed: number, estimatedCost: number, provider: string): AuthorityEntry {
    return writeToLedger(buildId, 'COST_UPDATE', null, { tokensUsed, estimatedCost, provider });
  },

  error(buildId: string, code: string, message: string, context?: Record<string, unknown>): AuthorityEntry {
    return writeToLedger(buildId, 'ERROR', null, { code, message, context });
  },
};

// =============================================================================
// LEDGER AUDIT
// =============================================================================

export interface AuditReport {
  buildId: string;
  totalEntries: number;
  entriesByType: Record<string, number>;
  firstEntry: AuthorityEntry | null;
  lastEntry: AuthorityEntry | null;
  timeline: AuthorityEntry[];
}

export function generateAuditReport(buildId: string): AuditReport {
  const entries = readBuildLedger(buildId);

  const entriesByType: Record<string, number> = {};
  for (const entry of entries) {
    entriesByType[entry.eventType] = (entriesByType[entry.eventType] || 0) + 1;
  }

  return {
    buildId,
    totalEntries: entries.length,
    entriesByType,
    firstEntry: entries[0] || null,
    lastEntry: entries[entries.length - 1] || null,
    timeline: entries,
  };
}

/**
 * Verify ledger integrity - check sequences are contiguous.
 */
export function verifyLedgerIntegrity(buildId: string): { valid: boolean; gaps: number[] } {
  const entries = readBuildLedger(buildId);
  const gaps: number[] = [];

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].sequence !== entries[i - 1].sequence + 1) {
      gaps.push(entries[i - 1].sequence);
    }
  }

  return { valid: gaps.length === 0, gaps };
}

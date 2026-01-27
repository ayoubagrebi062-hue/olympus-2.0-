// OLYMPUS GOVERNANCE ENFORCEMENT — NO BYPASS WITHOUT WRITTEN OVERRIDE

import { createHash } from 'crypto';
import type { Gate, DecisionTrace, Severity } from '../types/core';

// HARD STOP — SYSTEM HALT
export function HARD_STOP(reason: string): never {
  const error = new Error(`[OLYMPUS] HARD_STOP: ${reason}`);
  error.name = 'OLYMPUS_HARD_STOP';
  console.error(`[OLYMPUS] FATAL: ${reason}`);
  throw error;
}

// HASH CHAIN FOR DECISION INTEGRITY
let previousHash: string | null = null;

export function hashDecision(
  decision: Omit<DecisionTrace, 'id' | 'hash' | 'parentHash'>
): DecisionTrace {
  const content = JSON.stringify({
    ...decision,
    parentHash: previousHash,
  });
  const hash = createHash('sha256').update(content).digest('hex');
  const trace: DecisionTrace = {
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...decision,
    hash,
    parentHash: previousHash,
  };
  previousHash = hash;
  return trace;
}

// GATE ENFORCEMENT
export function enforceGate(gate: Gate, action: string): void {
  if (gate.state === 'blocked') {
    HARD_STOP(`GATE_BLOCKED: ${gate.id} — ${gate.reason ?? 'NO_REASON_PROVIDED'}`);
  }
  if (gate.state === 'failed') {
    HARD_STOP(`GATE_FAILED: ${gate.id} — ${gate.reason ?? 'NO_REASON_PROVIDED'}`);
  }
  if (gate.state === 'pending' && gate.type !== 'phase') {
    HARD_STOP(`GATE_PENDING: ${gate.id} — Cannot proceed without gate resolution`);
  }
}

// IRREVERSIBLE ACTION REQUIRES WRITTEN REASON
export interface IrreversibleActionRequest {
  readonly action: string;
  readonly reason: string;
  readonly actorId: string;
  readonly constraints: readonly string[];
  readonly alternativesConsidered: readonly string[];
}

export function authorizeIrreversibleAction(request: IrreversibleActionRequest): DecisionTrace {
  if (!request.reason || request.reason.trim().length < 10) {
    HARD_STOP(
      `INSUFFICIENT_REASON: Action "${request.action}" requires written reason (min 10 chars)`
    );
  }
  if (!request.actorId) {
    HARD_STOP(`NO_ACTOR: Action "${request.action}" requires actor identity`);
  }
  if (request.constraints.length === 0) {
    HARD_STOP(`NO_CONSTRAINTS: Action "${request.action}" requires explicit constraints`);
  }
  if (request.alternativesConsidered.length === 0) {
    HARD_STOP(`NO_ALTERNATIVES: Action "${request.action}" requires alternatives considered`);
  }

  return hashDecision({
    timestamp: new Date().toISOString(),
    actor: request.actorId,
    action: request.action,
    reason: request.reason,
    constraints: request.constraints,
    alternativesConsidered: request.alternativesConsidered,
  });
}

// NO AUTO-APPROVE
export function requireManualApproval(gateId: string, actorId: string, reason: string): Gate {
  if (!actorId) HARD_STOP(`APPROVAL_REQUIRES_ACTOR: ${gateId}`);
  if (!reason || reason.trim().length < 10) HARD_STOP(`APPROVAL_REQUIRES_REASON: ${gateId}`);

  return {
    id: gateId,
    type: 'phase',
    state: 'passed',
    reason,
    actorId,
    constraints: ['manual_approval_required'],
    alternativesConsidered: ['auto_approve_rejected'],
    hash: createHash('sha256').update(`${gateId}:${actorId}:${reason}`).digest('hex'),
    decidedAt: new Date().toISOString(),
  };
}

// NO SILENT FAILURE
export function recordFailure(
  severity: Severity,
  message: string,
  context: { agentId?: string; phaseId?: string; stack?: string }
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    ...context,
  };
  console.error(`[OLYMPUS] ${severity}: ${message}`, entry);

  if (severity === 'FATAL') {
    HARD_STOP(message);
  }
}

// NO OPTIMISTIC SUCCESS — VERIFY BEFORE PROCEEDING
export function verifyState<T>(actual: T, expected: T, context: string): void {
  if (actual !== expected) {
    HARD_STOP(`STATE_MISMATCH: ${context} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

// TRUST DEGRADATION CHECK
export function checkTrustDegradation(
  previousScore: number,
  currentScore: number,
  threshold: number = 10
): boolean {
  const degradation = previousScore - currentScore;
  if (degradation >= threshold) {
    console.warn(
      `[OLYMPUS] TRUST_DEGRADATION: ${degradation} points (${previousScore} → ${currentScore})`
    );
    return true;
  }
  return false;
}

// EXPORT DECISION CHAIN FOR AUDIT
export function getDecisionChainHash(): string | null {
  return previousHash;
}

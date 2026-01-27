/**
 * OLYMPUS 2.0 — Governance Transaction & Invariant Core
 * Phase 2.3: Transaction Abstraction & Verification Events
 * @version 1.0.0
 */

import { AgentIdentity } from '../../types';

export interface VerificationEvent {
  verificationId: string;
  agentId: string;
  buildId: string;
  invariantResults: InvariantResult[];
  timestamp: Date;
}

export interface InvariantResult {
  invariantName: string;
  passed: boolean;
  reason?: string;
  duration?: number;
  details?: Record<string, unknown>;
}

export interface InvariantCheck {
  name: string;
  check: (identity: AgentIdentity) => Promise<InvariantResult>;
}

export interface GovernanceInvariant {
  name: string;
  description: string;
  check: (identity: AgentIdentity) => Promise<InvariantResult>;
}

export interface TransactionContext {
  transactionId: string;
  startTime: Date;
  operations: TransactionOperation[];
}

export interface TransactionOperation {
  type: string;
  entity: string;
  operation: string;
  timestamp: Date;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rollbackActions?: TransactionOperation[];
}

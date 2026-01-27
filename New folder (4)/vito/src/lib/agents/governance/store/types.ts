/**
 * OLYMPUS 2.0 — Governance Store Interfaces
 * Phase 2.1: Store Abstraction Layer
 * @version 1.0.0
 */

import { AgentIdentity } from '../types';

export interface IAgentIdentityStore {
  saveIdentity(identity: AgentIdentity): Promise<void>;
  getIdentity(
    agentId: string,
    buildId: string
  ): Promise<AgentIdentity | null>;
}

export interface IAuditLogEntry {
  id?: string;
  agentId: string;
  tenantId?: string;
  buildId?: string;
  action: string;
  passed: boolean;
  reason?: string;
  createdAt?: Date;
}

export interface IAuditLogStore {
  append(entry: IAuditLogEntry): Promise<void>;
}

export interface IGovernanceStore {
  agentIdentities: IAgentIdentityStore;
  auditLogs: IAuditLogStore;
}

/**
 * OLYMPUS 2.0 - Governance Core Types
 * Phase 0: Foundation Types
 * @version 1.0.0
 */

import type { AgentId } from '../types';

/**
 * Agent Role Classes
 * Maps to constitutional permission matrix
 */
export enum AgentRole {
  PLANNER = 'planner',
  ARCHITECT = 'architect',
  EXECUTOR = 'executor',
  MONITOR = 'monitor',
  ORCHESTRATOR = 'orchestrator',
  GOVERNANCE = 'governance'
}

/**
 * Agent Identity Structure
 * The minimal identity claim an agent presents to governance
 */
export interface AgentIdentity {
  agentId: AgentId;          // Agent ID from registry
  version: string;          // Semantic version "X.Y.Z"
  fingerprint: string;        // SHA-256 hash
  role: AgentRole;          // Assigned role class
  tenantId: string;         // Tenant UUID
  buildId: string;          // Build UUID
  phase?: string;           // Optional: current phase
  verifiedAt?: Date;       // When this identity was verified
  verificationDuration?: number; // Duration in ms
}

/**
 * Verification Result
 * Deterministic pass/fail with optional reason
 */
export interface VerificationResult {
  verified: boolean;
  identity?: AgentIdentity;  // Only populated if verified=true
  reason?: string;          // Only populated if verified=false
  verifiedAt?: Date;      // When verification completed
  duration?: number;        // Verification duration in ms
}

/**
 * Identity Authority Interface
 * Minimal contract for agent identity verification
 */
export interface IIdentityAuthority {
  verifyAgent(identity: AgentIdentity): Promise<VerificationResult>;
  computeFingerprint(agentCode: string, promptTemplate: string, toolPermissions: any): string;
}

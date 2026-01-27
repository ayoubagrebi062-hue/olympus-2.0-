/**
 * OLYMPUS Authority Engine
 *
 * Extends ledger into enforcement.
 * Actions require authorization.
 * Denial must be justified.
 * Trust degrades on violations.
 */

import { writeToLedger, readBuildLedger } from './ledger';
import { AuthorityEntry, AuthorityEventType } from '../realtime/protocol';
import {
  appendToChain,
  initializeChain,
  verifyChain,
  getChainState,
  updateTrustMetrics,
  getTrustMetrics,
  TrustMetrics,
  ChainState,
} from './hash-chain';

// =============================================================================
// TYPES
// =============================================================================

export type ActionType =
  | 'BUILD_START'
  | 'BUILD_PAUSE'
  | 'BUILD_RESUME'
  | 'BUILD_CANCEL'
  | 'PHASE_ADVANCE'
  | 'GATE_RESOLVE'
  | 'ARTIFACT_APPROVE'
  | 'ARTIFACT_REJECT'
  | 'AGENT_SKIP'
  | 'AGENT_RETRY'
  | 'COST_OVERRIDE';

export interface AuthorizationRequest {
  buildId: string;
  actionType: ActionType;
  actorId: string;
  actorRole: 'operator' | 'observer' | 'system';
  context: Record<string, unknown>;
  reason?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  requestId: string;
  actionType: ActionType;
  actorId: string;
  reason: string;
  constraints: AuthorizationConstraint[];
  expiresAt: string | null;
  chainedEventHash: string | null;
}

export interface AuthorizationConstraint {
  type: 'REQUIRES_CHECKLIST' | 'REQUIRES_CONFIRMATION' | 'TIME_LIMIT' | 'COST_LIMIT' | 'AUDIT_REQUIRED';
  value: unknown;
  description: string;
}

export interface AuthorizationDenial {
  requestId: string;
  actionType: ActionType;
  actorId: string;
  reason: string;
  violations: string[];
  suggestedActions: string[];
}

export interface TrustLevel {
  score: number; // 0-100
  level: 'TRUSTED' | 'DEGRADED' | 'UNTRUSTED' | 'COMPROMISED';
  factors: TrustFactor[];
  lastUpdated: string;
}

export interface TrustFactor {
  name: string;
  impact: number; // -100 to +100
  reason: string;
}

// =============================================================================
// STATE
// =============================================================================

const authorizations: Map<string, AuthorizationResult[]> = new Map();
const denials: Map<string, AuthorizationDenial[]> = new Map();
const trustLevels: Map<string, TrustLevel> = new Map();

let authorizationSequence = 0;

function generateRequestId(): string {
  return `auth_req_${++authorizationSequence}_${Date.now()}`;
}

// =============================================================================
// AUTHORIZATION RULES
// =============================================================================

interface AuthorizationRule {
  actionType: ActionType;
  allowedRoles: ('operator' | 'observer' | 'system')[];
  requiresChecklist: boolean;
  requiresConfirmation: boolean;
  maxCost: number | null;
  timeLimitMs: number | null;
  customCheck?: (request: AuthorizationRequest) => { allowed: boolean; reason: string };
}

const AUTHORIZATION_RULES: AuthorizationRule[] = [
  {
    actionType: 'BUILD_START',
    allowedRoles: ['operator', 'system'],
    requiresChecklist: false,
    requiresConfirmation: false,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'BUILD_PAUSE',
    allowedRoles: ['operator'],
    requiresChecklist: false,
    requiresConfirmation: false,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'BUILD_RESUME',
    allowedRoles: ['operator'],
    requiresChecklist: false,
    requiresConfirmation: false,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'BUILD_CANCEL',
    allowedRoles: ['operator'],
    requiresChecklist: true,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: 300000, // 5 minute decision window
  },
  {
    actionType: 'PHASE_ADVANCE',
    allowedRoles: ['operator'],
    requiresChecklist: true,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'GATE_RESOLVE',
    allowedRoles: ['operator'],
    requiresChecklist: true,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: null,
    customCheck: (request) => {
      const decision = request.context.decision as string;
      if (!decision) {
        return { allowed: false, reason: 'Gate resolution requires a decision' };
      }
      return { allowed: true, reason: 'Decision provided' };
    },
  },
  {
    actionType: 'ARTIFACT_APPROVE',
    allowedRoles: ['operator'],
    requiresChecklist: false,
    requiresConfirmation: false,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'ARTIFACT_REJECT',
    allowedRoles: ['operator'],
    requiresChecklist: false,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'AGENT_SKIP',
    allowedRoles: ['operator'],
    requiresChecklist: true,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: null,
  },
  {
    actionType: 'AGENT_RETRY',
    allowedRoles: ['operator', 'system'],
    requiresChecklist: false,
    requiresConfirmation: false,
    maxCost: 50000, // Max 50k tokens per retry
    timeLimitMs: null,
  },
  {
    actionType: 'COST_OVERRIDE',
    allowedRoles: ['operator'],
    requiresChecklist: true,
    requiresConfirmation: true,
    maxCost: null,
    timeLimitMs: 60000, // 1 minute decision window
  },
];

// =============================================================================
// AUTHORIZATION ENGINE
// =============================================================================

/**
 * Request authorization for an action.
 * Returns authorization result with constraints.
 * Writes to ledger and hash chain.
 */
export async function requestAuthorization(
  request: AuthorizationRequest
): Promise<AuthorizationResult | AuthorizationDenial> {
  const requestId = generateRequestId();

  // Find applicable rule
  const rule = AUTHORIZATION_RULES.find(r => r.actionType === request.actionType);
  if (!rule) {
    return createDenial(requestId, request, 'Unknown action type', [`Action type '${request.actionType}' is not recognized`]);
  }

  // Check role permission
  if (!rule.allowedRoles.includes(request.actorRole)) {
    return createDenial(
      requestId,
      request,
      'Role not authorized',
      [`Role '${request.actorRole}' cannot perform '${request.actionType}'. Allowed: ${rule.allowedRoles.join(', ')}`],
      ['Switch to an authorized role', 'Request operator assistance']
    );
  }

  // Check trust level
  const trustLevel = getTrustLevel(request.buildId);
  if (trustLevel.level === 'COMPROMISED') {
    return createDenial(
      requestId,
      request,
      'Trust compromised',
      ['Build trust level is COMPROMISED. No actions permitted.'],
      ['Investigate trust violations', 'Start a new build']
    );
  }

  // Custom check
  if (rule.customCheck) {
    const customResult = rule.customCheck(request);
    if (!customResult.allowed) {
      return createDenial(requestId, request, customResult.reason, [customResult.reason]);
    }
  }

  // Build constraints
  const constraints: AuthorizationConstraint[] = [];

  if (rule.requiresChecklist) {
    constraints.push({
      type: 'REQUIRES_CHECKLIST',
      value: true,
      description: 'Complete understanding checklist before proceeding',
    });
  }

  if (rule.requiresConfirmation) {
    constraints.push({
      type: 'REQUIRES_CONFIRMATION',
      value: true,
      description: 'Explicit confirmation required',
    });
  }

  if (rule.timeLimitMs) {
    constraints.push({
      type: 'TIME_LIMIT',
      value: rule.timeLimitMs,
      description: `Decision must be made within ${rule.timeLimitMs / 1000} seconds`,
    });
  }

  if (rule.maxCost) {
    constraints.push({
      type: 'COST_LIMIT',
      value: rule.maxCost,
      description: `Maximum cost: ${rule.maxCost} tokens`,
    });
  }

  // Always audit
  constraints.push({
    type: 'AUDIT_REQUIRED',
    value: true,
    description: 'This action will be recorded in the authority ledger',
  });

  // Calculate expiration
  const expiresAt = rule.timeLimitMs
    ? new Date(Date.now() + rule.timeLimitMs).toISOString()
    : null;

  // Write to ledger
  writeToLedger(request.buildId, 'AUTHORIZATION_REQUEST' as AuthorityEventType, request.actorId, {
    requestId,
    actionType: request.actionType,
    context: request.context,
    constraints: constraints.map(c => c.type),
  });

  // Write to hash chain
  let chainedEventHash: string | null = null;
  try {
    const chainEvent = await appendToChain(request.buildId, 'AUTHORIZATION_GRANTED', {
      requestId,
      actionType: request.actionType,
      actorId: request.actorId,
      constraints,
    });
    chainedEventHash = chainEvent.hash;
  } catch (error) {
    // Chain might not be initialized
    console.warn('[AUTHORITY ENGINE] Failed to append to chain:', error);
  }

  const result: AuthorizationResult = {
    authorized: true,
    requestId,
    actionType: request.actionType,
    actorId: request.actorId,
    reason: `Action '${request.actionType}' authorized for ${request.actorRole}`,
    constraints,
    expiresAt,
    chainedEventHash,
  };

  // Store authorization
  if (!authorizations.has(request.buildId)) {
    authorizations.set(request.buildId, []);
  }
  authorizations.get(request.buildId)!.push(result);

  return result;
}

function createDenial(
  requestId: string,
  request: AuthorizationRequest,
  reason: string,
  violations: string[],
  suggestedActions: string[] = []
): AuthorizationDenial {
  const denial: AuthorizationDenial = {
    requestId,
    actionType: request.actionType,
    actorId: request.actorId,
    reason,
    violations,
    suggestedActions,
  };

  // Store denial
  if (!denials.has(request.buildId)) {
    denials.set(request.buildId, []);
  }
  denials.get(request.buildId)!.push(denial);

  // Write denial to ledger
  writeToLedger(request.buildId, 'AUTHORIZATION_DENIED' as AuthorityEventType, request.actorId, {
    requestId,
    actionType: request.actionType,
    reason,
    violations,
  });

  // Degrade trust on denial
  degradeTrust(request.buildId, {
    name: 'AUTHORIZATION_DENIED',
    impact: -5,
    reason: `Authorization denied: ${reason}`,
  });

  return denial;
}

/**
 * Verify an authorization is still valid.
 */
export function verifyAuthorization(buildId: string, requestId: string): { valid: boolean; reason: string } {
  const buildAuths = authorizations.get(buildId) || [];
  const auth = buildAuths.find(a => a.requestId === requestId);

  if (!auth) {
    return { valid: false, reason: 'Authorization not found' };
  }

  if (auth.expiresAt && new Date(auth.expiresAt) < new Date()) {
    return { valid: false, reason: 'Authorization expired' };
  }

  return { valid: true, reason: 'Authorization valid' };
}

/**
 * Execute an authorized action.
 * MUST have valid authorization first.
 */
export async function executeAuthorizedAction<T>(
  buildId: string,
  requestId: string,
  executor: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  const verification = verifyAuthorization(buildId, requestId);
  if (!verification.valid) {
    return { success: false, error: verification.reason };
  }

  const auth = authorizations.get(buildId)?.find(a => a.requestId === requestId);
  if (!auth) {
    return { success: false, error: 'Authorization not found' };
  }

  try {
    // Write execution start to chain
    await appendToChain(buildId, 'ACTION_EXECUTION_START', {
      requestId,
      actionType: auth.actionType,
    });

    // Execute
    const result = await executor();

    // Write execution complete to chain
    await appendToChain(buildId, 'ACTION_EXECUTION_COMPLETE', {
      requestId,
      actionType: auth.actionType,
      success: true,
    });

    return { success: true, result };
  } catch (error) {
    // Write execution failure to chain
    await appendToChain(buildId, 'ACTION_EXECUTION_FAILED', {
      requestId,
      actionType: auth.actionType,
      error: String(error),
    });

    // Degrade trust on failure
    degradeTrust(buildId, {
      name: 'EXECUTION_FAILURE',
      impact: -10,
      reason: `Action execution failed: ${error}`,
    });

    return { success: false, error: String(error) };
  }
}

// =============================================================================
// TRUST MANAGEMENT
// =============================================================================

/**
 * Get current trust level for a build.
 */
export function getTrustLevel(buildId: string): TrustLevel {
  const existing = trustLevels.get(buildId);
  if (existing) return existing;

  // Default trust level
  const defaultTrust: TrustLevel = {
    score: 100,
    level: 'TRUSTED',
    factors: [],
    lastUpdated: new Date().toISOString(),
  };

  trustLevels.set(buildId, defaultTrust);
  return defaultTrust;
}

/**
 * Degrade trust based on a factor.
 */
export function degradeTrust(buildId: string, factor: TrustFactor): TrustLevel {
  const current = getTrustLevel(buildId);

  const newScore = Math.max(0, Math.min(100, current.score + factor.impact));

  const newLevel: TrustLevel = {
    score: newScore,
    level: scoreToLevel(newScore),
    factors: [...current.factors, { ...factor, impact: factor.impact }],
    lastUpdated: new Date().toISOString(),
  };

  trustLevels.set(buildId, newLevel);

  console.log(`[AUTHORITY ENGINE] Trust degraded: ${buildId} -> ${newLevel.level} (${newScore})`);

  // Write trust change to ledger
  writeToLedger(buildId, 'TRUST_DEGRADATION' as AuthorityEventType, null, {
    previousScore: current.score,
    newScore,
    factor: factor.name,
    reason: factor.reason,
  });

  return newLevel;
}

/**
 * Restore trust (requires verification).
 */
export async function restoreTrust(buildId: string, verifierId: string): Promise<TrustLevel> {
  // Verify chain integrity
  const verification = await verifyChain(buildId);
  if (!verification.valid) {
    throw new Error(`Cannot restore trust: Chain verification failed at sequence ${verification.brokenAt}`);
  }

  const current = getTrustLevel(buildId);

  const restorationFactor: TrustFactor = {
    name: 'TRUST_RESTORATION',
    impact: 25, // Partial restoration
    reason: `Trust restored by ${verifierId} after chain verification`,
  };

  const newScore = Math.min(100, current.score + restorationFactor.impact);

  const newLevel: TrustLevel = {
    score: newScore,
    level: scoreToLevel(newScore),
    factors: [...current.factors, restorationFactor],
    lastUpdated: new Date().toISOString(),
  };

  trustLevels.set(buildId, newLevel);

  writeToLedger(buildId, 'TRUST_RESTORATION' as AuthorityEventType, verifierId, {
    previousScore: current.score,
    newScore,
    chainVerification: verification,
  });

  return newLevel;
}

function scoreToLevel(score: number): 'TRUSTED' | 'DEGRADED' | 'UNTRUSTED' | 'COMPROMISED' {
  if (score >= 80) return 'TRUSTED';
  if (score >= 50) return 'DEGRADED';
  if (score >= 20) return 'UNTRUSTED';
  return 'COMPROMISED';
}

// =============================================================================
// DECISION TRACKING (For WHY Inspector)
// =============================================================================

export interface DecisionRecord {
  id: string;
  buildId: string;
  type: 'AUTHORIZATION' | 'GATE' | 'OVERRIDE' | 'SYSTEM';
  actorId: string;
  actorRole: string;
  action: string;
  decision: string;
  reasoning: string[];
  context: Record<string, unknown>;
  constraints: string[];
  alternatives: string[];
  timestamp: string;
  chainHash: string | null;
}

const decisions: Map<string, DecisionRecord[]> = new Map();

/**
 * Record a decision for later interrogation.
 */
export async function recordDecision(
  buildId: string,
  type: DecisionRecord['type'],
  actorId: string,
  actorRole: string,
  action: string,
  decision: string,
  reasoning: string[],
  context: Record<string, unknown>,
  constraints: string[] = [],
  alternatives: string[] = []
): Promise<DecisionRecord> {
  const id = `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let chainHash: string | null = null;
  try {
    const chainEvent = await appendToChain(buildId, 'DECISION_RECORDED', {
      decisionId: id,
      type,
      action,
      decision,
    });
    chainHash = chainEvent.hash;
  } catch (error) {
    console.warn('[AUTHORITY ENGINE] Failed to chain decision:', error);
  }

  const record: DecisionRecord = {
    id,
    buildId,
    type,
    actorId,
    actorRole,
    action,
    decision,
    reasoning,
    context,
    constraints,
    alternatives,
    timestamp: new Date().toISOString(),
    chainHash,
  };

  if (!decisions.has(buildId)) {
    decisions.set(buildId, []);
  }
  decisions.get(buildId)!.push(record);

  return record;
}

/**
 * Get all decisions for a build.
 */
export function getDecisions(buildId: string): DecisionRecord[] {
  return decisions.get(buildId) || [];
}

/**
 * Get decision by ID.
 */
export function getDecision(buildId: string, decisionId: string): DecisionRecord | null {
  const buildDecisions = decisions.get(buildId) || [];
  return buildDecisions.find(d => d.id === decisionId) || null;
}

/**
 * Query decisions by criteria.
 */
export function queryDecisions(
  buildId: string,
  criteria: {
    type?: DecisionRecord['type'];
    actorId?: string;
    action?: string;
    afterTimestamp?: string;
    beforeTimestamp?: string;
  }
): DecisionRecord[] {
  const buildDecisions = decisions.get(buildId) || [];

  return buildDecisions.filter(d => {
    if (criteria.type && d.type !== criteria.type) return false;
    if (criteria.actorId && d.actorId !== criteria.actorId) return false;
    if (criteria.action && d.action !== criteria.action) return false;
    if (criteria.afterTimestamp && d.timestamp < criteria.afterTimestamp) return false;
    if (criteria.beforeTimestamp && d.timestamp > criteria.beforeTimestamp) return false;
    return true;
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  initializeChain,
  verifyChain,
  getChainState,
  getTrustMetrics,
  updateTrustMetrics,
} from './hash-chain';

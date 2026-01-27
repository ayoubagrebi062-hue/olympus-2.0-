/**
 * OLYMPUS 2.1 - 10X UPGRADE: Type-Safe SSE Event Schema
 *
 * THIS IS THE CONTRACT BETWEEN BACKEND AND FRONTEND.
 *
 * Rules:
 * 1. NEVER change these types without updating both sides
 * 2. All events MUST include buildId and timestamp
 * 3. Use discriminated union for exhaustive type checking
 */

import type { BuildState, PhaseState, AgentState, Severity } from './core';

// ============================================================================
// BASE EVENT
// ============================================================================

interface BaseSSEEvent {
  readonly buildId: string;
  readonly timestamp: string;
}

// ============================================================================
// BUILD LIFECYCLE EVENTS
// ============================================================================

export interface BuildStartedEvent extends BaseSSEEvent {
  readonly type: 'build_started';
  readonly totalAgents: number;
  readonly estimatedDuration?: number;
}

export interface BuildProgressEvent extends BaseSSEEvent {
  readonly type: 'progress';
  readonly currentPhase: string;
  readonly tokensUsed: number;
  readonly message?: string;
}

export interface BuildCompletedEvent extends BaseSSEEvent {
  readonly type: 'build_completed';
  readonly success: boolean;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly error?: string;
  readonly artifactCount: number;
}

// ============================================================================
// PHASE EVENTS
// ============================================================================

export interface PhaseStartedEvent extends BaseSSEEvent {
  readonly type: 'phase_started';
  readonly phase: string;
  readonly phaseName: string;
  readonly agentCount: number;
}

export interface PhaseCompletedEvent extends BaseSSEEvent {
  readonly type: 'phase_completed';
  readonly phase: string;
  readonly status: 'completed' | 'failed' | 'skipped';
  readonly duration: number;
  readonly error?: string;
}

// ============================================================================
// AGENT EVENTS
// ============================================================================

export interface AgentStartedEvent extends BaseSSEEvent {
  readonly type: 'agent_started';
  readonly agentId: string;
  readonly agentName: string;
  readonly phase: string;
}

export interface AgentCompletedEvent extends BaseSSEEvent {
  readonly type: 'agent_completed';
  readonly agentId: string;
  readonly artifactsCount: number;
  readonly tokensUsed: number;
  readonly duration: number;
}

export interface AgentErrorEvent extends BaseSSEEvent {
  readonly type: 'agent_error';
  readonly agentId: string;
  readonly phase: string;
  readonly error: string;
  readonly recoverable: boolean;
  readonly retryCount?: number;
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export interface ConnectionEvent extends BaseSSEEvent {
  readonly type: 'connected';
}

export interface ErrorEvent extends BaseSSEEvent {
  readonly type: 'error';
  readonly error: string;
  readonly code?: string;
  readonly fatal: boolean;
}

export interface HeartbeatEvent extends BaseSSEEvent {
  readonly type: 'heartbeat';
  readonly serverTime: string;
}

// ============================================================================
// DISCRIMINATED UNION
// ============================================================================

export type SSEEvent =
  | BuildStartedEvent
  | BuildProgressEvent
  | BuildCompletedEvent
  | PhaseStartedEvent
  | PhaseCompletedEvent
  | AgentStartedEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | ConnectionEvent
  | ErrorEvent
  | HeartbeatEvent;

// ============================================================================
// TYPE GUARDS (for exhaustive switch statements)
// ============================================================================

export function isBuildEvent(
  event: SSEEvent
): event is BuildStartedEvent | BuildProgressEvent | BuildCompletedEvent {
  return (
    event.type === 'build_started' || event.type === 'progress' || event.type === 'build_completed'
  );
}

export function isPhaseEvent(event: SSEEvent): event is PhaseStartedEvent | PhaseCompletedEvent {
  return event.type === 'phase_started' || event.type === 'phase_completed';
}

export function isAgentEvent(
  event: SSEEvent
): event is AgentStartedEvent | AgentCompletedEvent | AgentErrorEvent {
  return (
    event.type === 'agent_started' ||
    event.type === 'agent_completed' ||
    event.type === 'agent_error'
  );
}

// ============================================================================
// VALIDATION (for runtime safety)
// ============================================================================

export function validateSSEEvent(data: unknown): SSEEvent | null {
  if (!data || typeof data !== 'object') return null;

  const event = data as Record<string, unknown>;

  if (typeof event.type !== 'string') return null;
  if (typeof event.buildId !== 'string') return null;
  if (typeof event.timestamp !== 'string') return null;

  // Validate based on type
  switch (event.type) {
    case 'build_started':
      if (typeof event.totalAgents !== 'number') return null;
      break;
    case 'progress':
      if (typeof event.tokensUsed !== 'number') return null;
      break;
    case 'build_completed':
      if (typeof event.success !== 'boolean') return null;
      break;
    case 'agent_error':
      if (typeof event.error !== 'string') return null;
      if (typeof event.recoverable !== 'boolean') return null;
      break;
    case 'error':
      if (typeof event.error !== 'string') return null;
      break;
    // Other events have minimal requirements, covered by base validation
  }

  return event as unknown as SSEEvent;
}

// ============================================================================
// FACTORY FUNCTIONS (for backend to create events)
// ============================================================================

export function createBuildStartedEvent(buildId: string, totalAgents: number): BuildStartedEvent {
  return {
    type: 'build_started',
    buildId,
    timestamp: new Date().toISOString(),
    totalAgents,
  };
}

export function createBuildCompletedEvent(
  buildId: string,
  success: boolean,
  stats: { totalTokens: number; totalCost: number; artifactCount: number; error?: string }
): BuildCompletedEvent {
  return {
    type: 'build_completed',
    buildId,
    timestamp: new Date().toISOString(),
    success,
    ...stats,
  };
}

export function createAgentErrorEvent(
  buildId: string,
  agentId: string,
  phase: string,
  error: string,
  recoverable: boolean
): AgentErrorEvent {
  return {
    type: 'agent_error',
    buildId,
    timestamp: new Date().toISOString(),
    agentId,
    phase,
    error,
    recoverable,
  };
}

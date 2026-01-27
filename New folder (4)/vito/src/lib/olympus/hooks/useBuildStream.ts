/**
 * OLYMPUS 2.0 - SSE Build Stream Hook
 *
 * Connects to the build orchestrator via SSE for real-time updates.
 * Dispatches actions to the Olympus state reducer.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { OlympusAction } from '../state/build-state';
import type { Phase, Agent, OutputEntry, BuildError, Severity } from '../types/core';

export interface BuildStreamEvent {
  type: string;
  buildId: string;
  [key: string]: unknown;
}

export interface UseBuildStreamOptions {
  buildId: string | null;
  dispatch: React.Dispatch<OlympusAction>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to connect to the build SSE stream and dispatch state updates.
 */
export function useBuildStream({
  buildId,
  dispatch,
  onConnected,
  onDisconnected,
  onError,
}: UseBuildStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const connect = useCallback(() => {
    if (!buildId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/builds/${buildId}/stream`;
    console.log(`[SSE] Connecting to ${url}`);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log(`[SSE] Connected to build ${buildId}`);
      reconnectAttemptsRef.current = 0;
      dispatch({ type: 'CONNECTION_CHANGED', connected: true });
      onConnected?.();
    };

    eventSource.onerror = (error) => {
      console.error(`[SSE] Connection error for build ${buildId}:`, error);
      dispatch({ type: 'CONNECTION_CHANGED', connected: false });
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.error(`[SSE] Max reconnection attempts reached for build ${buildId}`);
        onError?.(new Error('Failed to connect to build stream'));
        onDisconnected?.();
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BuildStreamEvent;
        handleStreamEvent(data, dispatch);
      } catch (err) {
        console.error(`[SSE] Failed to parse event:`, err, event.data);
      }
    };

    // Handle specific event types
    eventSource.addEventListener('connected', () => {
      console.log(`[SSE] Stream connected event received`);
    });

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ type: 'progress', ...data }, dispatch);
      } catch (err) {
        console.error(`[SSE] Failed to parse progress event:`, err);
      }
    });

    eventSource.addEventListener('phase_completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ type: 'phase_completed', ...data }, dispatch);
      } catch (err) {
        console.error(`[SSE] Failed to parse phase event:`, err);
      }
    });

    eventSource.addEventListener('agent_completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ type: 'agent_completed', ...data }, dispatch);
      } catch (err) {
        console.error(`[SSE] Failed to parse agent event:`, err);
      }
    });

    eventSource.addEventListener('build_completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ type: 'build_completed', ...data }, dispatch);
        // Build is done, close the connection
        eventSource.close();
        onDisconnected?.();
      } catch (err) {
        console.error(`[SSE] Failed to parse build_completed event:`, err);
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        handleStreamEvent({ type: 'error', ...data }, dispatch);
      } catch (err) {
        // This might be a connection error, not a data error
        console.error(`[SSE] Error event:`, err);
      }
    });
  }, [buildId, dispatch, onConnected, onDisconnected, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch({ type: 'CONNECTION_CHANGED', connected: false });
    onDisconnected?.();
  }, [dispatch, onDisconnected]);

  // Connect when buildId changes
  useEffect(() => {
    if (buildId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [buildId, connect, disconnect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnect: connect,
    disconnect,
  };
}

/**
 * Handle SSE events and dispatch appropriate actions.
 */
function handleStreamEvent(
  event: BuildStreamEvent,
  dispatch: React.Dispatch<OlympusAction>
) {
  console.log(`[SSE] Event: ${event.type}`, event);

  switch (event.type) {
    case 'build_started':
      dispatch({
        type: 'BUILD_UPDATED',
        build: {
          state: 'running',
        },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry('info', `Build started with ${event.totalAgents} agents`, event.buildId),
      });
      break;

    case 'progress':
      dispatch({
        type: 'BUILD_UPDATED',
        build: {
          tokenUsage: event.tokensUsed as number,
        },
      });
      if (event.message) {
        dispatch({
          type: 'OUTPUT_RECEIVED',
          entry: createOutputEntry('info', event.message as string, event.buildId, event.currentPhase as string),
        });
      }
      break;

    case 'phase_started':
      dispatch({
        type: 'PHASE_UPDATED',
        phaseId: event.phase as string,
        phase: { state: 'running' },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry('info', `Phase ${event.phase} started`, event.buildId, event.phase as string),
      });
      break;

    case 'phase_completed':
      dispatch({
        type: 'PHASE_UPDATED',
        phaseId: event.phase as string,
        phase: {
          state: event.status === 'completed' ? 'complete' : 'failed',
        },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry(
          event.status === 'completed' ? 'info' : 'error',
          `Phase ${event.phase} ${event.status}`,
          event.buildId,
          event.phase as string
        ),
      });
      break;

    case 'agent_started':
      dispatch({
        type: 'AGENT_UPDATED',
        agentId: event.agentId as string,
        agent: { state: 'working' },
      });
      break;

    case 'agent_completed':
      dispatch({
        type: 'AGENT_UPDATED',
        agentId: event.agentId as string,
        agent: {
          state: 'done',
          outputCount: event.artifactsCount as number,
          tokenUsage: event.tokensUsed as number,
        },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry(
          'info',
          `Agent ${event.agentId} completed (${event.artifactsCount} artifacts)`,
          event.buildId,
          undefined,
          event.agentId as string
        ),
      });
      break;

    case 'agent_error':
      dispatch({
        type: 'ERROR_OCCURRED',
        error: {
          id: `error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: (event.recoverable ? 'WARNING' : 'BLOCKING') as Severity,
          message: event.error as string,
          agentId: event.agentId as string,
          phaseId: event.phase as string,
          stack: null,
          recoverable: event.recoverable as boolean,
        },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry(
          'error',
          `Agent error: ${event.error}`,
          event.buildId,
          event.phase as string,
          event.agentId as string,
          event.recoverable ? 'WARNING' : 'BLOCKING'
        ),
      });
      break;

    case 'build_completed':
      dispatch({
        type: 'BUILD_UPDATED',
        build: {
          state: event.success ? 'complete' : 'failed',
          tokenUsage: event.totalTokens as number,
          totalCost: event.totalCost as number,
        },
      });
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: createOutputEntry(
          event.success ? 'info' : 'error',
          event.success
            ? `Build completed successfully (${event.totalTokens} tokens, $${(event.totalCost as number)?.toFixed(4)})`
            : `Build failed: ${event.error}`,
          event.buildId
        ),
      });
      break;

    case 'error':
      dispatch({
        type: 'ERROR_OCCURRED',
        error: {
          id: `error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: 'FATAL',
          message: event.error as string,
          agentId: null,
          phaseId: null,
          stack: null,
          recoverable: false,
        },
      });
      break;

    default:
      // Log unknown events for debugging
      console.log(`[SSE] Unknown event type: ${event.type}`, event);
  }
}

/**
 * Helper to create output entries.
 */
function createOutputEntry(
  level: 'info' | 'warning' | 'error',
  message: string,
  buildId: string,
  phaseId?: string,
  agentId?: string,
  severity?: Severity
): OutputEntry {
  return {
    id: `output-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    severity: severity || (level === 'error' ? 'BLOCKING' : level === 'warning' ? 'WARNING' : 'INFO'),
    message,
    phaseId: phaseId || '',
    agentId: agentId || '',
    agentName: agentId || '',
    metadata: null,
  };
}

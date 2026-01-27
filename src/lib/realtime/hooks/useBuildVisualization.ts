/**
 * OLYMPUS 2.1 - 10X UPGRADE: React Hook for Build Visualization
 *
 * Drop-in hook for real-time build visualization in React components.
 *
 * Usage:
 * ```tsx
 * const { state, metrics, timeline, isComplete } = useBuildVisualization(buildId);
 *
 * return (
 *   <div>
 *     <ProgressBar value={metrics.progress} />
 *     <TokenMeter used={metrics.tokensUsed} limit={metrics.tokensLimit} />
 *     <AgentGrid agents={state.phases.flatMap(p => p.agents)} />
 *     <Timeline events={timeline} />
 *   </div>
 * );
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { BuildVisualization, TimelineEvent, LivePreview } from '../build-visualizer';

// ============================================================================
// TYPES
// ============================================================================

export interface UseBuildVisualizationOptions {
  /** Build ID to visualize */
  buildId: string;
  /** SSE endpoint URL (default: /api/olympus/build/stream) */
  endpoint?: string;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
}

export interface BuildVisualizationHookResult {
  /** Full visualization state */
  state: BuildVisualization | null;
  /** Current metrics (convenience accessor) */
  metrics: BuildVisualization['metrics'] | null;
  /** Timeline events (convenience accessor) */
  timeline: TimelineEvent[];
  /** Live code preview */
  livePreview: LivePreview | null;
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Is build complete? */
  isComplete: boolean;
  /** Is build successful? */
  isSuccess: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Cancel the build */
  cancel: () => void;
  /** Current phase name */
  currentPhase: string | null;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Formatted elapsed time */
  elapsedTime: string;
  /** Formatted estimated remaining */
  estimatedRemaining: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function calculateOverallProgress(state: BuildVisualization | null): number {
  if (!state) return 0;
  if (state.status === 'complete') return 100;
  if (state.status === 'failed' || state.status === 'cancelled') return 0;

  const { agentsComplete, agentsTotal } = state.metrics;
  if (agentsTotal === 0) return 0;
  return Math.round((agentsComplete / agentsTotal) * 100);
}

// ============================================================================
// HOOK
// ============================================================================

export function useBuildVisualization(
  options: UseBuildVisualizationOptions
): BuildVisualizationHookResult {
  const {
    buildId,
    endpoint = '/api/olympus/build/stream',
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  // State
  const [state, setState] = useState<BuildVisualization | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  const [error, setError] = useState<string | null>(null);

  // Refs for reconnection logic
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Cleanup existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setError(null);

    const url = `${endpoint}?buildId=${encodeURIComponent(buildId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        // Handle different event types
        if (data.type === 'visualization') {
          setState(data.state);
        } else if (data.type === 'update') {
          setState(prev => (prev ? { ...prev, ...data.updates } : null));
        } else if (data.type === 'complete') {
          setState(prev =>
            prev ? { ...prev, status: data.success ? 'complete' : 'failed' } : null
          );
          eventSource.close();
          setConnectionStatus('disconnected');
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setConnectionStatus('error');

      // Auto-reconnect logic
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay * reconnectAttemptsRef.current); // Exponential backoff
      } else {
        setError('Connection lost. Max reconnect attempts reached.');
      }
    };

    return () => {
      eventSource.close();
    };
  }, [buildId, endpoint, autoReconnect, reconnectDelay, maxReconnectAttempts]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Cancel build
  const cancel = useCallback(async () => {
    try {
      await fetch(`/api/olympus/build/${buildId}/cancel`, { method: 'POST' });
      setState(prev => (prev ? { ...prev, status: 'cancelled' } : null));
    } catch (e) {
      setError('Failed to cancel build');
    }
  }, [buildId]);

  // Computed values
  const metrics = state?.metrics ?? null;
  const timeline = state?.timeline ?? [];
  const livePreview = state?.livePreview ?? null;
  const isComplete =
    state?.status === 'complete' || state?.status === 'failed' || state?.status === 'cancelled';
  const isSuccess = state?.status === 'complete';
  const currentPhase = state?.currentPhase ?? null;
  const overallProgress = calculateOverallProgress(state);
  const elapsedTime = formatDuration(metrics?.elapsedTime ?? 0);
  const estimatedRemaining = formatDuration(metrics?.estimatedRemaining ?? 0);

  return {
    state,
    metrics,
    timeline,
    livePreview,
    connectionStatus,
    isComplete,
    isSuccess,
    error,
    reconnect,
    cancel,
    currentPhase,
    overallProgress,
    elapsedTime,
    estimatedRemaining,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for just the metrics (lighter weight)
 */
export function useBuildMetrics(buildId: string) {
  const { metrics, elapsedTime, estimatedRemaining, overallProgress } = useBuildVisualization({
    buildId,
  });
  return { metrics, elapsedTime, estimatedRemaining, overallProgress };
}

/**
 * Hook for timeline events with filtering
 */
export function useBuildTimeline(buildId: string, filter?: TimelineEvent['type'][]) {
  const { timeline } = useBuildVisualization({ buildId });

  const filteredTimeline = useMemo(() => {
    if (!filter || filter.length === 0) return timeline;
    return timeline.filter(event => filter.includes(event.type));
  }, [timeline, filter]);

  return filteredTimeline;
}

export default useBuildVisualization;

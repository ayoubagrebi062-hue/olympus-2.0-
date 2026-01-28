'use client';

/**
 * OLYMPUS 2.0 - Production Build Stream Hook
 *
 * React hook for consuming multiplexed build streams with:
 * - Automatic reconnection
 * - Progress tracking per agent
 * - Error handling with recovery
 * - Metrics collection
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { StreamEvent, AgentCompleteEvent, AgentProgressEvent, BuildProgressEvent, ChunkEvent } from './types';
import { SSEDecoder } from './sse-encoder';
import { ReconnectionManager } from './reconnection';
import { MultiplexedEvent } from './multiplexer';

export interface AgentState {
  id: string;
  name: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  progress: number;
  content: string;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

export interface BuildStreamState {
  buildId: string | null;
  status: 'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'complete' | 'error';
  progress: number;
  currentPhase: string;
  agents: Map<string, AgentState>;
  errors: Array<{ agentId?: string; message: string; timestamp: Date }>;
  startedAt: Date | null;
  completedAt: Date | null;
  totalTokens: number;
  totalDurationMs: number;
}

export interface UseBuildStreamOptions {
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Callback when agent starts */
  onAgentStart?: (agentId: string, agentName: string) => void;
  /** Callback when agent completes */
  onAgentComplete?: (agentId: string, success: boolean) => void;
  /** Callback when build completes */
  onBuildComplete?: (success: boolean, stats: { totalTokens: number; durationMs: number }) => void;
  /** Callback on any event */
  onEvent?: (event: MultiplexedEvent) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseBuildStreamResult {
  /** Current build state */
  state: BuildStreamState;
  /** Start a new build stream */
  startBuild: (options: { agents?: Array<{ id: string; name: string }> }) => Promise<void>;
  /** Stop the current build */
  stopBuild: () => void;
  /** Get content for a specific agent */
  getAgentContent: (agentId: string) => string;
  /** Get progress for a specific agent */
  getAgentProgress: (agentId: string) => number;
  /** Check if build is active */
  isActive: boolean;
  /** Reconnection state */
  reconnection: {
    isReconnecting: boolean;
    attempts: number;
    lastError?: string;
  };
}

/**
 * React hook for consuming build streams
 */
export function useBuildStream(options: UseBuildStreamOptions = {}): UseBuildStreamResult {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    onAgentStart,
    onAgentComplete,
    onBuildComplete,
    onEvent,
    onError,
  } = options;

  // State
  const [state, setState] = useState<BuildStreamState>({
    buildId: null,
    status: 'idle',
    progress: 0,
    currentPhase: '',
    agents: new Map(),
    errors: [],
    startedAt: null,
    completedAt: null,
    totalTokens: 0,
    totalDurationMs: 0,
  });

  const [reconnection, setReconnection] = useState({
    isReconnecting: false,
    attempts: 0,
    lastError: undefined as string | undefined,
  });

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const decoderRef = useRef(new SSEDecoder());
  const reconnectionManagerRef = useRef(new ReconnectionManager({
    maxRetries: maxReconnectAttempts,
  }));
  const optionsRef = useRef(options);
  const buildOptionsRef = useRef<{ agents?: Array<{ id: string; name: string }> }>({});

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Handle stream events
  const handleEvent = useCallback((event: MultiplexedEvent) => {
    optionsRef.current.onEvent?.(event);

    setState(prev => {
      const next = { ...prev };

      switch (event.type) {
        case 'build:start':
          next.status = 'streaming';
          next.startedAt = new Date();
          break;

        case 'build:phase':
          next.currentPhase = (event as any).data.phase;
          break;

        case 'build:progress': {
          const progressEvent = event as BuildProgressEvent;
          next.progress = progressEvent.data.progress;
          break;
        }

        case 'build:complete':
          next.status = 'complete';
          next.completedAt = new Date();
          next.progress = 100;
          if (next.startedAt) {
            next.totalDurationMs = Date.now() - next.startedAt.getTime();
          }
          optionsRef.current.onBuildComplete?.(true, {
            totalTokens: next.totalTokens,
            durationMs: next.totalDurationMs,
          });
          break;

        case 'build:error':
          next.status = 'error';
          next.errors = [...next.errors, {
            message: (event as any).data.error?.message || 'Build error',
            timestamp: new Date(),
          }];
          optionsRef.current.onBuildComplete?.(false, {
            totalTokens: next.totalTokens,
            durationMs: Date.now() - (next.startedAt?.getTime() || Date.now()),
          });
          break;

        case 'agent:start': {
          const channelId = event.channelId;
          const channelName = event.channelName || channelId;
          const newAgents = new Map(next.agents);
          newAgents.set(channelId, {
            id: channelId,
            name: channelName,
            status: 'streaming',
            progress: 0,
            content: '',
            tokensUsed: 0,
            durationMs: 0,
          });
          next.agents = newAgents;
          optionsRef.current.onAgentStart?.(channelId, channelName);
          break;
        }

        case 'agent:progress': {
          const progressEvent = event as AgentProgressEvent;
          const agentId = event.channelId;
          const agent = next.agents.get(agentId);
          if (agent) {
            const newAgents = new Map(next.agents);
            newAgents.set(agentId, {
              ...agent,
              progress: progressEvent.data.progress,
              tokensUsed: progressEvent.data.tokensUsed || agent.tokensUsed,
            });
            next.agents = newAgents;
          }
          break;
        }

        case 'agent:complete': {
          const completeEvent = event as AgentCompleteEvent;
          const agentId = event.channelId;
          const agent = next.agents.get(agentId);
          if (agent) {
            const newAgents = new Map(next.agents);
            newAgents.set(agentId, {
              ...agent,
              status: completeEvent.data.success ? 'complete' : 'error',
              progress: 100,
              tokensUsed: completeEvent.data.tokensUsed,
              durationMs: completeEvent.data.durationMs,
            });
            next.agents = newAgents;
            next.totalTokens += completeEvent.data.tokensUsed;
          }
          optionsRef.current.onAgentComplete?.(agentId, completeEvent.data.success);
          break;
        }

        case 'stream:chunk': {
          const chunkEvent = event as ChunkEvent;
          const agentId = event.channelId;
          const agent = next.agents.get(agentId);
          if (agent) {
            const newAgents = new Map(next.agents);
            newAgents.set(agentId, {
              ...agent,
              content: agent.content + chunkEvent.data.content,
            });
            next.agents = newAgents;
          }
          break;
        }

        case 'stream:complete': {
          const agentId = event.channelId;
          const agent = next.agents.get(agentId);
          if (agent && agent.status === 'streaming') {
            const newAgents = new Map(next.agents);
            newAgents.set(agentId, {
              ...agent,
              status: 'complete',
              progress: 100,
            });
            next.agents = newAgents;
          }
          break;
        }

        case 'stream:error': {
          const agentId = event.channelId;
          const agent = next.agents.get(agentId);
          if (agent) {
            const newAgents = new Map(next.agents);
            newAgents.set(agentId, {
              ...agent,
              status: 'error',
              error: (event as any).data.error?.message,
            });
            next.agents = newAgents;
          }
          next.errors = [...next.errors, {
            agentId: agentId !== '__broadcast__' ? agentId : undefined,
            message: (event as any).data.error?.message || 'Stream error',
            timestamp: new Date(),
          }];
          break;
        }
      }

      // Update last event ID for reconnection
      reconnectionManagerRef.current.setLastEventId(event.id);

      return next;
    });
  }, []);

  // Start build
  const startBuild = useCallback(async (buildOptions: { agents?: Array<{ id: string; name: string }> }) => {
    buildOptionsRef.current = buildOptions;

    setState(prev => ({
      ...prev,
      buildId: null,
      status: 'connecting',
      progress: 0,
      agents: new Map(),
      errors: [],
      startedAt: null,
      completedAt: null,
      totalTokens: 0,
      totalDurationMs: 0,
    }));

    abortControllerRef.current = new AbortController();
    decoderRef.current.reset();
    reconnectionManagerRef.current.reset();

    await connectStream(buildOptions);
  }, []);

  // Connect to stream
  const connectStream = useCallback(async (buildOptions: { agents?: Array<{ id: string; name: string }> }) => {
    try {
      const lastEventId = reconnectionManagerRef.current.getLastEventId();

      const response = await fetch('/api/stream/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || 'demo' : 'demo'}`,
        },
        body: JSON.stringify({
          ...buildOptions,
          lastEventId,
        }),
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buildId = response.headers.get('X-Build-ID');
      setState(prev => ({ ...prev, buildId }));

      reconnectionManagerRef.current.connected();
      setReconnection({ isReconnecting: false, attempts: 0, lastError: undefined });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const events = decoderRef.current.decode(text);

        for (const event of events) {
          handleEvent(event as MultiplexedEvent);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Intentional abort
      }

      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      optionsRef.current.onError?.(error instanceof Error ? error : new Error(errorMessage));

      // Handle reconnection
      if (autoReconnect) {
        reconnectionManagerRef.current.disconnected(error instanceof Error ? error : undefined);
        setReconnection(prev => ({
          isReconnecting: true,
          attempts: prev.attempts + 1,
          lastError: errorMessage,
        }));

        setState(prev => ({ ...prev, status: 'reconnecting' }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          errors: [...prev.errors, { message: errorMessage, timestamp: new Date() }],
        }));
      }
    }
  }, [autoReconnect, handleEvent]);

  // Set up reconnection manager
  useEffect(() => {
    const manager = reconnectionManagerRef.current;

    manager.on('reconnect', () => {
      connectStream(buildOptionsRef.current);
    });

    manager.on('failed', (error: Error) => {
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, { message: error.message, timestamp: new Date() }],
      }));
      setReconnection(prev => ({ ...prev, isReconnecting: false }));
    });

    return () => {
      manager.cancel();
      manager.removeAllListeners();
    };
  }, [connectStream]);

  // Stop build
  const stopBuild = useCallback(() => {
    abortControllerRef.current?.abort();
    reconnectionManagerRef.current.cancel();
    setState(prev => ({ ...prev, status: 'idle' }));
    setReconnection({ isReconnecting: false, attempts: 0, lastError: undefined });
  }, []);

  // Get agent content
  const getAgentContent = useCallback((agentId: string): string => {
    return state.agents.get(agentId)?.content || '';
  }, [state.agents]);

  // Get agent progress
  const getAgentProgress = useCallback((agentId: string): number => {
    return state.agents.get(agentId)?.progress || 0;
  }, [state.agents]);

  // Is active
  const isActive = useMemo(() => {
    return state.status === 'connecting' || state.status === 'streaming' || state.status === 'reconnecting';
  }, [state.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      reconnectionManagerRef.current.cancel();
    };
  }, []);

  return {
    state,
    startBuild,
    stopBuild,
    getAgentContent,
    getAgentProgress,
    isActive,
    reconnection,
  };
}

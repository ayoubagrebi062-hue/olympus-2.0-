'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamEvent, ChunkEvent, TokenEvent, AgentProgressEvent, BuildProgressEvent, StreamCompleteEvent, StreamErrorEvent } from './types';
import { SSEDecoder } from './sse-encoder';

export interface UseStreamOptions {
  onToken?: (token: string) => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: StreamEvent) => void;
}

export interface UseStreamResult {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  progress: number;
  start: (url: string, body: object) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * React hook for consuming SSE streams
 */
export function useStream(options: UseStreamOptions = {}): UseStreamResult {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const decoderRef = useRef(new SSEDecoder());
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setError(null);
    setProgress(0);
    decoderRef.current.reset();
  }, []);

  const start = useCallback(async (url: string, body: object) => {
    reset();
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const events = decoderRef.current.decode(text);

        for (const event of events) {
          optionsRef.current.onEvent?.(event);

          switch (event.type) {
            case 'stream:token': {
              const tokenEvent = event as TokenEvent;
              const token = tokenEvent.data.token;
              setContent(prev => prev + token);
              optionsRef.current.onToken?.(token);
              break;
            }

            case 'stream:chunk': {
              const chunkEvent = event as ChunkEvent;
              const chunk = chunkEvent.data.content;
              setContent(prev => prev + chunk);
              optionsRef.current.onChunk?.(chunk);
              break;
            }

            case 'stream:complete': {
              const completeEvent = event as StreamCompleteEvent;
              setIsStreaming(false);
              setProgress(100);
              optionsRef.current.onComplete?.(completeEvent.data.content);
              break;
            }

            case 'stream:error': {
              const errorEvent = event as StreamErrorEvent;
              const err = new Error(errorEvent.data.error.message);
              setError(err);
              setIsStreaming(false);
              optionsRef.current.onError?.(err);
              break;
            }

            case 'agent:progress': {
              const progressEvent = event as AgentProgressEvent;
              setProgress(progressEvent.data.progress);
              break;
            }

            case 'build:progress': {
              const buildProgressEvent = event as BuildProgressEvent;
              setProgress(buildProgressEvent.data.progress);
              break;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        setIsStreaming(false);
        optionsRef.current.onError?.(err);
      }
    }
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    content,
    isStreaming,
    error,
    progress,
    start,
    stop,
    reset,
  };
}

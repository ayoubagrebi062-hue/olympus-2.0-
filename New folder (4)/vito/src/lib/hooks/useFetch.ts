/**
 * OLYMPUS 2.0 - Enhanced Fetch Hook
 * Provides AbortController support and retry logic for fetch calls
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface FetchState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

interface UseFetchResult<T> extends FetchState<T> {
  refetch: () => Promise<void>;
  abort: () => void;
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch with abort controller, timeout, and retry support.
 */
export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
  abortController?: AbortController
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchOptions
  } = options;

  const controller = abortController || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error?.message || data.message || `Request failed with status ${response.status}`);
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      lastError = err as Error;

      // Don't retry on abort or client errors
      if (
        controller.signal.aborted ||
        (lastError.message && lastError.message.includes('status 4'))
      ) {
        throw lastError;
      }

      // Retry with exponential backoff
      if (attempt < retries) {
        await sleep(retryDelay * Math.pow(2, attempt));
      }
    }
  }

  clearTimeout(timeoutId);
  throw lastError || new Error('Request failed after retries');
}

/**
 * Hook for fetching data with automatic abort on unmount,
 * retry logic, and loading states.
 */
export function useFetch<T>(
  url: string | null,
  options: FetchOptions = {},
  deps: unknown[] = []
): UseFetchResult<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: !!url,
    isRetrying: false,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!url) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Abort any existing request
    abort();

    // Create new controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isRetrying: false,
      retryCount: 0,
    }));

    try {
      const data = await fetchWithRetry<T>(
        url,
        options,
        abortControllerRef.current
      );

      setState({
        data,
        error: null,
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
      });
    } catch (err) {
      // Ignore abort errors
      if ((err as Error).name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        error: (err as Error).message || 'An error occurred',
        isLoading: false,
        isRetrying: false,
      }));
    }
  }, [url, abort, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();

    // Cleanup: abort on unmount
    return () => {
      abort();
    };
  }, [fetchData, ...deps]);

  return {
    ...state,
    refetch: fetchData,
    abort,
  };
}

/**
 * Hook for manual fetch operations (mutations) with abort and retry support.
 */
export function useMutation<T, TBody = unknown>() {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const mutate = useCallback(async (
    url: string,
    body?: TBody,
    options: FetchOptions = {}
  ): Promise<T | null> => {
    // Abort any existing request
    abort();

    // Create new controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const data = await fetchWithRetry<T>(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          ...options,
        },
        abortControllerRef.current
      );

      setState({
        data,
        error: null,
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
      });

      return data;
    } catch (err) {
      // Ignore abort errors
      if ((err as Error).name === 'AbortError') {
        return null;
      }

      setState(prev => ({
        ...prev,
        error: (err as Error).message || 'An error occurred',
        isLoading: false,
      }));

      throw err;
    }
  }, [abort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return {
    ...state,
    mutate,
    abort,
    reset: () => setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    }),
  };
}

export default useFetch;

/**
 * OLYMPUS 2.0 - API Client Core
 */

import type { ApiResponse, ApiErrorResponse, ApiClientConfig, RequestOptions } from './types';

export class ApiClientError extends Error {
  constructor(public response: ApiErrorResponse) {
    super(response.error.message);
    this.name = 'ApiClientError';
  }
  get code() {
    return this.response.error.code;
  }
}

export class ApiClient {
  private baseUrl: string;
  private tenantId?: string;
  private onError?: (error: ApiErrorResponse) => void;
  private onUnauthorized?: () => void;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.tenantId = config.tenantId;
    this.onError = config.onError;
    this.onUnauthorized = config.onUnauthorized;
  }

  setTenantId(id: string) {
    this.tenantId = id;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.tenantId) headers['X-Tenant-Id'] = this.tenantId;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: options.signal,
    });

    const data = await res.json();

    if (!res.ok || data.success === false) {
      const errorResponse = data as ApiErrorResponse;
      if (res.status === 401) this.onUnauthorized?.();
      this.onError?.(errorResponse);
      throw new ApiClientError(errorResponse);
    }

    return (data as ApiResponse<T>).data;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>('GET', path, undefined, options);
  }
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', path, body, options);
  }
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PATCH', path, body, options);
  }
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', path, body, options);
  }
  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

let defaultClient: ApiClient | null = null;

export function getApiClient(config?: ApiClientConfig): ApiClient {
  if (!defaultClient) defaultClient = new ApiClient(config);
  return defaultClient;
}

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

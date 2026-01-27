/**
 * OLYMPUS 2.0 - API Client Resources
 */

import { getApiClient } from './core';
import type {
  Tenant,
  TenantMember,
  Project,
  ProjectFile,
  EnvVar,
  Build,
  BuildLog,
  Deployment,
  DeploymentDomain,
  PaginationMeta,
} from './types';

type Paginated<T> = { items: T[]; pagination: PaginationMeta };
type ListParams = { page?: number; pageSize?: number; status?: string; search?: string };

export const tenants = {
  list: () => getApiClient().get<{ tenants: Tenant[] }>('/api/tenants'),
  get: (id: string) => getApiClient().get<{ tenant: Tenant }>(`/api/tenants/${id}`),
  create: (data: { name: string; slug: string }) =>
    getApiClient().post<{ tenant: Tenant }>('/api/tenants', data),
  update: (id: string, data: Partial<Tenant>) =>
    getApiClient().patch<{ tenant: Tenant }>(`/api/tenants/${id}`, data),
  delete: (id: string) => getApiClient().delete(`/api/tenants/${id}`),
  members: {
    list: (tenantId: string) =>
      getApiClient().get<{ members: TenantMember[] }>(`/api/tenants/${tenantId}/members`),
    invite: (tenantId: string, email: string, role: string) =>
      getApiClient().post(`/api/tenants/${tenantId}/members`, { email, role }),
    updateRole: (tenantId: string, userId: string, role: string) =>
      getApiClient().patch(`/api/tenants/${tenantId}/members/${userId}`, { role }),
    remove: (tenantId: string, userId: string) =>
      getApiClient().delete(`/api/tenants/${tenantId}/members/${userId}`),
  },
  settings: {
    get: (tenantId: string) =>
      getApiClient().get<{ settings: Record<string, unknown> }>(
        `/api/tenants/${tenantId}/settings`
      ),
    update: (tenantId: string, settings: Record<string, unknown>) =>
      getApiClient().patch(`/api/tenants/${tenantId}/settings`, settings),
  },
};

export const projects = {
  list: (params?: ListParams) =>
    getApiClient().get<Paginated<Project>>(`/api/projects?${new URLSearchParams(params as any)}`),
  get: (id: string) => getApiClient().get<{ project: Project }>(`/api/projects/${id}`),
  create: (data: { name: string; description?: string; visibility?: string }) =>
    getApiClient().post<{ project: Project }>('/api/projects', data),
  update: (id: string, data: Partial<Project>) =>
    getApiClient().patch<{ project: Project }>(`/api/projects/${id}`, data),
  delete: (id: string) => getApiClient().delete(`/api/projects/${id}`),
  files: {
    list: (projectId: string, folder?: string) =>
      getApiClient().get<{ files: ProjectFile[]; flatList: ProjectFile[] }>(
        `/api/projects/${projectId}/files${folder ? `?folder=${folder}` : ''}`
      ),
    get: (projectId: string, path: string) =>
      getApiClient().get<{ file: ProjectFile & { content: string } }>(
        `/api/projects/${projectId}/files${path}`
      ),
    create: (projectId: string, path: string, content: string) =>
      getApiClient().post<{ file: ProjectFile }>(`/api/projects/${projectId}/files`, {
        path,
        content,
      }),
    update: (projectId: string, path: string, content: string) =>
      getApiClient().patch<{ file: ProjectFile }>(`/api/projects/${projectId}/files${path}`, {
        content,
      }),
    delete: (projectId: string, path: string) =>
      getApiClient().delete(`/api/projects/${projectId}/files${path}`),
  },
  env: {
    list: (projectId: string) =>
      getApiClient().get<{ envVars: EnvVar[] }>(`/api/projects/${projectId}/env`),
    set: (projectId: string, key: string, value: string, isSecret?: boolean) =>
      getApiClient().post(`/api/projects/${projectId}/env`, { key, value, isSecret }),
    delete: (projectId: string, key: string) =>
      getApiClient().delete(`/api/projects/${projectId}/env?key=${key}`),
  },
};

export const builds = {
  list: (params?: ListParams & { projectId?: string }) =>
    getApiClient().get<Paginated<Build>>(`/api/builds?${new URLSearchParams(params as any)}`),
  get: (id: string) => getApiClient().get<{ build: Build }>(`/api/builds/${id}`),
  start: (
    projectId: string,
    description: string,
    tier: string,
    options?: Record<string, unknown>
  ) =>
    getApiClient().post<{ build: Build }>('/api/builds', { projectId, description, tier, options }),
  cancel: (id: string, reason?: string) =>
    getApiClient().post<{ build: Build }>(`/api/builds/${id}/cancel`, { reason }),
  retry: (id: string) => getApiClient().post<{ build: Build }>(`/api/builds/${id}/retry`),
  iterate: (id: string, feedback: string, focusAreas?: string[]) =>
    getApiClient().post(`/api/builds/${id}/iterate`, { feedback, focusAreas }),
  logs: (id: string) => getApiClient().get<{ logs: BuildLog[] }>(`/api/builds/${id}/logs`),
  outputs: (id: string, type?: string) =>
    getApiClient().get<{ files?: unknown[]; artifacts?: unknown[]; metrics?: unknown }>(
      `/api/builds/${id}/outputs?type=${type || 'files'}`
    ),
};

export const deployments = {
  list: (params?: ListParams & { projectId?: string; environment?: string }) =>
    getApiClient().get<Paginated<Deployment>>(
      `/api/deployments?${new URLSearchParams(params as any)}`
    ),
  get: (id: string) => getApiClient().get<{ deployment: Deployment }>(`/api/deployments/${id}`),
  create: (projectId: string, environment: string, config?: Record<string, unknown>) =>
    getApiClient().post<{ deployment: Deployment }>('/api/deployments', {
      projectId,
      environment,
      config,
    }),
  delete: (id: string) => getApiClient().delete(`/api/deployments/${id}`),
  promote: (id: string, targetEnvironment: string) =>
    getApiClient().post<{ deployment: Deployment }>(`/api/deployments/${id}/promote`, {
      targetEnvironment,
    }),
  rollback: (id: string, reason?: string) =>
    getApiClient().post<{ deployment: Deployment }>(`/api/deployments/${id}/rollback`, { reason }),
  redeploy: (id: string, clearCache?: boolean) =>
    getApiClient().post<{ deployment: Deployment }>(`/api/deployments/${id}/redeploy`, {
      clearCache,
    }),
  domains: {
    list: (deployId: string) =>
      getApiClient().get<{ domains: DeploymentDomain[] }>(`/api/deployments/${deployId}/domains`),
    add: (deployId: string, domain: string, isPrimary?: boolean) =>
      getApiClient().post(`/api/deployments/${deployId}/domains`, { domain, isPrimary }),
    remove: (deployId: string, domain: string) =>
      getApiClient().delete(`/api/deployments/${deployId}/domains?domain=${domain}`),
  },
};

/**
 * OLYMPUS 2.0 - API Client
 */

export * from './types';
export { ApiClient, ApiClientError, getApiClient, createApiClient } from './core';
export { auth } from './auth';
export { tenants, projects, builds, deployments } from './resources';

// Convenience re-export of all API methods
import { auth } from './auth';
import { tenants, projects, builds, deployments } from './resources';

export const api = {
  auth,
  tenants,
  projects,
  builds,
  deployments,
};

/**
 * OLYMPUS 2.0 - API Client Types
 */

/** API response wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { pagination?: PaginationMeta };
}

/** API error response */
export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown; requestId: string };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
}

/** Client configuration */
export interface ApiClientConfig {
  baseUrl?: string;
  tenantId?: string;
  onError?: (error: ApiErrorResponse) => void;
  onUnauthorized?: () => void;
}

/** Request options */
export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Auth types */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
export interface LoginResponse {
  user: User;
  session: Session;
  tenants: TenantMembership[];
}

/** Tenant types */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
}
export interface TenantMembership extends Tenant {
  role: string;
}
export interface TenantMember {
  userId: string;
  role: string;
  user: User;
  joinedAt: string;
}

/** Project types */
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectFile {
  id: string;
  path: string;
  name: string;
  type: string;
  size: number;
}
export interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string[];
  isSecret: boolean;
}

/** Build types */
export interface Build {
  id: string;
  projectId: string;
  description: string;
  tier: string;
  status: string;
  progress: number;
  currentStep?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
export interface BuildLog {
  id: string;
  level: string;
  message: string;
  step?: string;
  timestamp: string;
}

/** Deploy types */
export interface Deployment {
  id: string;
  projectId: string;
  buildId: string;
  environment: string;
  target: string;
  status: string;
  url?: string;
  domain?: string;
  createdAt: string;
  deployedAt?: string;
}
export interface DeploymentDomain {
  id: string;
  domain: string;
  isPrimary: boolean;
  sslStatus: string;
}

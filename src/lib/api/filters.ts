/**
 * OLYMPUS 2.0 - Filter Utilities
 */

/** Allowed filter fields per resource */
export const ALLOWED_FILTERS: Record<string, string[]> = {
  projects: ['status', 'visibility', 'created_at', 'updated_at', 'name'],
  builds: ['status', 'tier', 'created_at', 'project_id'],
  deployments: ['status', 'environment', 'target', 'created_at', 'project_id'],
  files: ['content_type', 'created_at', 'size'],
  members: ['role', 'created_at'],
  invoices: ['status', 'created_at'],
};

/** Validate filter field is allowed */
export function isAllowedFilter(resource: string, field: string): boolean {
  return ALLOWED_FILTERS[resource]?.includes(field) ?? false;
}

/** Sanitize filters to only allowed fields */
export function sanitizeFilters(
  resource: string,
  filters: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (isAllowedFilter(resource, key) && value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/** Parse common query params into filters */
export function parseCommonFilters(searchParams: URLSearchParams): {
  status?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
} {
  const filters: Record<string, unknown> = {};
  const status = searchParams.get('status');
  if (status) filters.status = status.split(',');
  const createdAfter = searchParams.get('createdAfter');
  if (createdAfter) filters.createdAfter = new Date(createdAfter);
  const createdBefore = searchParams.get('createdBefore');
  if (createdBefore) filters.createdBefore = new Date(createdBefore);
  const updatedAfter = searchParams.get('updatedAfter');
  if (updatedAfter) filters.updatedAfter = new Date(updatedAfter);
  const updatedBefore = searchParams.get('updatedBefore');
  if (updatedBefore) filters.updatedBefore = new Date(updatedBefore);
  return filters as any;
}

/** Build Supabase filter conditions */
export function buildSupabaseFilters(query: any, filters: Record<string, unknown>): any {
  let q = query;
  if (filters.status && Array.isArray(filters.status)) q = q.in('status', filters.status);
  if (filters.createdAfter) q = q.gte('created_at', (filters.createdAfter as Date).toISOString());
  if (filters.createdBefore) q = q.lte('created_at', (filters.createdBefore as Date).toISOString());
  if (filters.updatedAfter) q = q.gte('updated_at', (filters.updatedAfter as Date).toISOString());
  if (filters.updatedBefore) q = q.lte('updated_at', (filters.updatedBefore as Date).toISOString());
  for (const [key, value] of Object.entries(filters)) {
    if (['status', 'createdAfter', 'createdBefore', 'updatedAfter', 'updatedBefore'].includes(key))
      continue;
    if (value !== undefined && value !== null) {
      q = Array.isArray(value) ? q.in(key, value) : q.eq(key, value);
    }
  }
  return q;
}

/** Sort options */
export interface SortOptions {
  column: string;
  ascending: boolean;
}

/** Parse sort from query */
export function parseSortParams(
  searchParams: URLSearchParams,
  allowedColumns: string[]
): SortOptions {
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  return {
    column: allowedColumns.includes(sortBy) ? sortBy : 'created_at',
    ascending: sortOrder === 'asc',
  };
}

/** Apply sorting to query */
export function applySorting(query: any, sort: SortOptions): any {
  return query.order(sort.column, { ascending: sort.ascending });
}

/**
 * OLYMPUS 2.0 - Full-Text Search
 */

import { createServiceRoleClient } from '@/lib/auth/clients';

/** Local pagination metadata for search */
interface SearchPaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Calculate pagination metadata */
function calculatePagination({ page, pageSize, totalCount }: { page: number; pageSize: number; totalCount: number }): SearchPaginationMeta {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** Search options */
export interface SearchOptions {
  tenantId: string;
  query: string;
  table: 'projects' | 'builds' | 'deployments' | 'files';
  fields?: string[];
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

/** Search result */
export interface SearchResult<T> {
  items: T[];
  pagination: SearchPaginationMeta;
  query: string;
  took: number;
}

/** Searchable fields per table */
const SEARCHABLE_FIELDS: Record<string, string[]> = {
  projects: ['name', 'description', 'slug'],
  builds: ['description', 'metadata'],
  deployments: ['domain', 'metadata'],
  files: ['path', 'name'],
};

/** Build tsvector query */
function buildSearchQuery(query: string): string {
  return query.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(Boolean).map((t) => `${t}:*`).join(' & ');
}

/** Search records with full-text search */
export async function search<T>(options: SearchOptions): Promise<SearchResult<T>> {
  const { tenantId, query, table, filters = {}, page = 1, pageSize = 20 } = options;
  const startTime = Date.now();
  const supabase = createServiceRoleClient();
  const offset = (page - 1) * pageSize;
  const tsQuery = buildSearchQuery(query);

  if (!tsQuery) {
    return { items: [], pagination: calculatePagination({ page, pageSize, totalCount: 0 }), query, took: 0 };
  }

  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).textSearch('search_vector', tsQuery, { type: 'websearch' });

  let dataQuery = supabase.from(table).select('*').eq('tenant_id', tenantId)
    .textSearch('search_vector', tsQuery, { type: 'websearch' }).range(offset, offset + pageSize - 1);

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) dataQuery = dataQuery.eq(key, value);
  }

  const { data, error } = await dataQuery;
  if (error) throw new Error(`Search failed: ${error.message}`);

  return {
    items: (data || []) as T[],
    pagination: calculatePagination({ page, pageSize, totalCount: count || 0 }),
    query,
    took: Date.now() - startTime,
  };
}

/** Quick search across multiple tables */
export async function quickSearch(tenantId: string, query: string, limit = 5) {
  const [projects, builds, deployments] = await Promise.all([
    search({ tenantId, query, table: 'projects', pageSize: limit }),
    search({ tenantId, query, table: 'builds', pageSize: limit }),
    search({ tenantId, query, table: 'deployments', pageSize: limit }),
  ]);
  return { projects: projects.items, builds: builds.items, deployments: deployments.items };
}

/** Search suggestions (autocomplete) */
export async function searchSuggestions(tenantId: string, query: string, limit = 10): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('projects').select('name').eq('tenant_id', tenantId).ilike('name', `%${query}%`).limit(limit);
  return (data || []).map((p: any) => p.name);
}

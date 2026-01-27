/**
 * OLYMPUS 2.0 - Query Builder Utilities
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import type { PaginationMeta } from './types';

/** Filter operators */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'in'
  | 'is';

/** Filter definition */
export interface Filter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

/** Query options */
export interface QueryOptions {
  select?: string;
  filters?: Filter[];
  search?: { columns: string[]; query: string };
  orderBy?: { column: string; ascending?: boolean }[];
  pagination?: { page: number; pageSize: number };
}

/** Build and execute query */
export async function executeQuery<T>(
  table: string,
  tenantId: string,
  options: QueryOptions = {}
): Promise<{ data: T[]; pagination: PaginationMeta }> {
  const supabase = createServiceRoleClient();
  const { select = '*', filters = [], orderBy = [], pagination } = options;
  const { page = 1, pageSize = 20 } = pagination || {};

  let query = supabase.from(table).select(select, { count: 'exact' }).eq('tenant_id', tenantId);

  // Apply filters
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }

  // Apply search
  if (options.search?.query) {
    const searchTerms = options.search.query.split(/\s+/).filter(Boolean);
    if (searchTerms.length > 0) {
      // Use OR for multiple columns
      const orConditions = options.search.columns
        .map(col => `${col}.ilike.%${options.search!.query}%`)
        .join(',');
      query = query.or(orConditions);
    }
  }

  // Apply ordering
  for (const order of orderBy) {
    query = query.order(order.column, { ascending: order.ascending ?? false });
  }

  // Apply pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Query failed: ${error.message}`);

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: (data || []) as T[],
    pagination: { page, pageSize, totalCount, totalPages, hasMore: page < totalPages },
  };
}

/** Apply single filter to query */
function applyFilter(query: any, filter: Filter): any {
  const { column, operator, value } = filter;

  switch (operator) {
    case 'eq':
      return query.eq(column, value);
    case 'neq':
      return query.neq(column, value);
    case 'gt':
      return query.gt(column, value);
    case 'gte':
      return query.gte(column, value);
    case 'lt':
      return query.lt(column, value);
    case 'lte':
      return query.lte(column, value);
    case 'like':
      return query.like(column, value);
    case 'ilike':
      return query.ilike(column, value);
    case 'in':
      return query.in(column, value as unknown[]);
    case 'is':
      return query.is(column, value);
    default:
      return query;
  }
}

/** Parse filter string into Filter object */
export function parseFilterString(filterStr: string): Filter | null {
  // Format: column:operator:value
  const match = filterStr.match(/^([a-z_]+):([a-z]+):(.+)$/i);
  if (!match) return null;

  const [, column, operator, value] = match;

  // Parse value
  let parsedValue: unknown = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (value === 'null') parsedValue = null;
  else if (value.startsWith('[') && value.endsWith(']')) {
    parsedValue = value.slice(1, -1).split(',');
  } else if (!isNaN(Number(value))) {
    parsedValue = Number(value);
  }

  return { column, operator: operator as FilterOperator, value: parsedValue };
}

/** Parse multiple filters from query string */
export function parseFiltersFromQuery(searchParams: URLSearchParams): Filter[] {
  const filters: Filter[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (key === 'filter') {
      const filter = parseFilterString(value);
      if (filter) filters.push(filter);
    }
  }

  return filters;
}

/** Build date range filter */
export function dateRangeFilter(column: string, start?: Date, end?: Date): Filter[] {
  const filters: Filter[] = [];
  if (start) filters.push({ column, operator: 'gte', value: start.toISOString() });
  if (end) filters.push({ column, operator: 'lte', value: end.toISOString() });
  return filters;
}

/** Build status filter */
export function statusFilter(statuses: string | string[]): Filter {
  const values = Array.isArray(statuses) ? statuses : [statuses];
  return { column: 'status', operator: 'in', value: values };
}

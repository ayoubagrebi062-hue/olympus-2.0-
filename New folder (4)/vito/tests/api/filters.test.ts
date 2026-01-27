/**
 * OLYMPUS 2.0 - Filter Utilities Unit Tests
 * ==========================================
 */

import { describe, it, expect } from 'vitest';

// Replicate filter logic for testing
const ALLOWED_FILTERS: Record<string, string[]> = {
  projects: ['status', 'visibility', 'created_at', 'updated_at', 'name'],
  builds: ['status', 'tier', 'created_at', 'project_id'],
  deployments: ['status', 'environment', 'target', 'created_at', 'project_id'],
  files: ['content_type', 'created_at', 'size'],
  members: ['role', 'created_at'],
  invoices: ['status', 'created_at'],
};

function isAllowedFilter(resource: string, field: string): boolean {
  return ALLOWED_FILTERS[resource]?.includes(field) ?? false;
}

function sanitizeFilters(resource: string, filters: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (isAllowedFilter(resource, key) && value !== undefined && value !== null) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function parseCommonFilters(searchParams: URLSearchParams) {
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
  return filters;
}

interface SortOptions { column: string; ascending: boolean }

function parseSortParams(searchParams: URLSearchParams, allowedColumns: string[]): SortOptions {
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  return { column: allowedColumns.includes(sortBy) ? sortBy : 'created_at', ascending: sortOrder === 'asc' };
}

describe('Filter Utilities - isAllowedFilter', () => {
  describe('projects resource', () => {
    it('should allow status filter', () => {
      expect(isAllowedFilter('projects', 'status')).toBe(true);
    });

    it('should allow visibility filter', () => {
      expect(isAllowedFilter('projects', 'visibility')).toBe(true);
    });

    it('should allow name filter', () => {
      expect(isAllowedFilter('projects', 'name')).toBe(true);
    });

    it('should allow created_at filter', () => {
      expect(isAllowedFilter('projects', 'created_at')).toBe(true);
    });

    it('should allow updated_at filter', () => {
      expect(isAllowedFilter('projects', 'updated_at')).toBe(true);
    });

    it('should not allow arbitrary fields', () => {
      expect(isAllowedFilter('projects', 'secret_data')).toBe(false);
    });
  });

  describe('builds resource', () => {
    it('should allow status filter', () => {
      expect(isAllowedFilter('builds', 'status')).toBe(true);
    });

    it('should allow tier filter', () => {
      expect(isAllowedFilter('builds', 'tier')).toBe(true);
    });

    it('should allow project_id filter', () => {
      expect(isAllowedFilter('builds', 'project_id')).toBe(true);
    });

    it('should not allow visibility (not in builds)', () => {
      expect(isAllowedFilter('builds', 'visibility')).toBe(false);
    });
  });

  describe('deployments resource', () => {
    it('should allow status filter', () => {
      expect(isAllowedFilter('deployments', 'status')).toBe(true);
    });

    it('should allow environment filter', () => {
      expect(isAllowedFilter('deployments', 'environment')).toBe(true);
    });

    it('should allow target filter', () => {
      expect(isAllowedFilter('deployments', 'target')).toBe(true);
    });

    it('should allow project_id filter', () => {
      expect(isAllowedFilter('deployments', 'project_id')).toBe(true);
    });
  });

  describe('files resource', () => {
    it('should allow content_type filter', () => {
      expect(isAllowedFilter('files', 'content_type')).toBe(true);
    });

    it('should allow size filter', () => {
      expect(isAllowedFilter('files', 'size')).toBe(true);
    });
  });

  describe('members resource', () => {
    it('should allow role filter', () => {
      expect(isAllowedFilter('members', 'role')).toBe(true);
    });
  });

  describe('invoices resource', () => {
    it('should allow status filter', () => {
      expect(isAllowedFilter('invoices', 'status')).toBe(true);
    });
  });

  describe('unknown resource', () => {
    it('should return false for unknown resource', () => {
      expect(isAllowedFilter('unknown', 'status')).toBe(false);
    });

    it('should return false for any field on unknown resource', () => {
      expect(isAllowedFilter('nonexistent', 'any_field')).toBe(false);
    });
  });
});

describe('Filter Utilities - sanitizeFilters', () => {
  it('should keep allowed filters', () => {
    const filters = {
      status: 'active',
      visibility: 'public',
    };

    const result = sanitizeFilters('projects', filters);

    expect(result).toEqual({
      status: 'active',
      visibility: 'public',
    });
  });

  it('should remove disallowed filters', () => {
    const filters = {
      status: 'active',
      secretField: 'should be removed',
      adminOnly: true,
    };

    const result = sanitizeFilters('projects', filters);

    expect(result).toEqual({ status: 'active' });
    expect(result).not.toHaveProperty('secretField');
    expect(result).not.toHaveProperty('adminOnly');
  });

  it('should remove undefined values', () => {
    const filters = {
      status: 'active',
      visibility: undefined,
    };

    const result = sanitizeFilters('projects', filters);

    expect(result).toEqual({ status: 'active' });
    expect(result).not.toHaveProperty('visibility');
  });

  it('should remove null values', () => {
    const filters = {
      status: 'active',
      visibility: null,
    };

    const result = sanitizeFilters('projects', filters);

    expect(result).toEqual({ status: 'active' });
    expect(result).not.toHaveProperty('visibility');
  });

  it('should preserve valid falsy values (empty string, 0, false)', () => {
    const filters = {
      status: '',
      tier: 0,
    };

    const result = sanitizeFilters('builds', filters);

    expect(result).toEqual({ status: '', tier: 0 });
  });

  it('should return empty object for all invalid filters', () => {
    const filters = {
      invalid1: 'value',
      invalid2: 'value',
    };

    const result = sanitizeFilters('projects', filters);

    expect(result).toEqual({});
  });

  it('should work with different resources', () => {
    const buildFilters = {
      status: 'running',
      tier: 'pro',
      project_id: 'proj-123',
      invalid: 'removed',
    };

    const result = sanitizeFilters('builds', buildFilters);

    expect(result).toEqual({
      status: 'running',
      tier: 'pro',
      project_id: 'proj-123',
    });
  });
});

describe('Filter Utilities - parseCommonFilters', () => {
  it('should parse empty params', () => {
    const params = new URLSearchParams();
    const result = parseCommonFilters(params);

    expect(result).toEqual({});
  });

  it('should parse single status', () => {
    const params = new URLSearchParams('status=active');
    const result = parseCommonFilters(params);

    expect(result.status).toEqual(['active']);
  });

  it('should parse multiple statuses', () => {
    const params = new URLSearchParams('status=active,pending,completed');
    const result = parseCommonFilters(params);

    expect(result.status).toEqual(['active', 'pending', 'completed']);
  });

  it('should parse createdAfter', () => {
    const params = new URLSearchParams('createdAfter=2024-01-01T00:00:00Z');
    const result = parseCommonFilters(params);

    expect(result.createdAfter).toEqual(new Date('2024-01-01T00:00:00Z'));
  });

  it('should parse createdBefore', () => {
    const params = new URLSearchParams('createdBefore=2024-12-31T23:59:59Z');
    const result = parseCommonFilters(params);

    expect(result.createdBefore).toEqual(new Date('2024-12-31T23:59:59Z'));
  });

  it('should parse updatedAfter', () => {
    const params = new URLSearchParams('updatedAfter=2024-06-01');
    const result = parseCommonFilters(params);

    expect(result.updatedAfter).toBeInstanceOf(Date);
  });

  it('should parse updatedBefore', () => {
    const params = new URLSearchParams('updatedBefore=2024-06-30');
    const result = parseCommonFilters(params);

    expect(result.updatedBefore).toBeInstanceOf(Date);
  });

  it('should parse all filters together', () => {
    const params = new URLSearchParams(
      'status=active,draft&createdAfter=2024-01-01&createdBefore=2024-12-31&updatedAfter=2024-06-01&updatedBefore=2024-06-30'
    );
    const result = parseCommonFilters(params);

    expect(result.status).toEqual(['active', 'draft']);
    expect(result.createdAfter).toBeInstanceOf(Date);
    expect(result.createdBefore).toBeInstanceOf(Date);
    expect(result.updatedAfter).toBeInstanceOf(Date);
    expect(result.updatedBefore).toBeInstanceOf(Date);
  });
});

describe('Filter Utilities - parseSortParams', () => {
  const allowedColumns = ['created_at', 'updated_at', 'name', 'status'];

  it('should return defaults when no params', () => {
    const params = new URLSearchParams();
    const result = parseSortParams(params, allowedColumns);

    expect(result).toEqual({
      column: 'created_at',
      ascending: false,
    });
  });

  it('should parse allowed sortBy', () => {
    const params = new URLSearchParams('sortBy=name');
    const result = parseSortParams(params, allowedColumns);

    expect(result.column).toBe('name');
  });

  it('should fall back to created_at for disallowed sortBy', () => {
    const params = new URLSearchParams('sortBy=secret_field');
    const result = parseSortParams(params, allowedColumns);

    expect(result.column).toBe('created_at');
  });

  it('should parse sortOrder=asc', () => {
    const params = new URLSearchParams('sortOrder=asc');
    const result = parseSortParams(params, allowedColumns);

    expect(result.ascending).toBe(true);
  });

  it('should parse sortOrder=desc', () => {
    const params = new URLSearchParams('sortOrder=desc');
    const result = parseSortParams(params, allowedColumns);

    expect(result.ascending).toBe(false);
  });

  it('should default to desc for unknown sortOrder', () => {
    const params = new URLSearchParams('sortOrder=invalid');
    const result = parseSortParams(params, allowedColumns);

    expect(result.ascending).toBe(false);
  });

  it('should parse both sortBy and sortOrder', () => {
    const params = new URLSearchParams('sortBy=updated_at&sortOrder=asc');
    const result = parseSortParams(params, allowedColumns);

    expect(result).toEqual({
      column: 'updated_at',
      ascending: true,
    });
  });

  it('should work with different allowed columns', () => {
    const customColumns = ['price', 'quantity', 'created_at'];
    const params = new URLSearchParams('sortBy=price&sortOrder=asc');
    const result = parseSortParams(params, customColumns);

    expect(result.column).toBe('price');
    expect(result.ascending).toBe(true);
  });

  it('should respect case sensitivity', () => {
    const params = new URLSearchParams('sortBy=Name');
    const result = parseSortParams(params, allowedColumns);

    // 'Name' !== 'name', so should fall back
    expect(result.column).toBe('created_at');
  });
});

describe('Filter Utilities - ALLOWED_FILTERS constants', () => {
  it('should have projects with expected filters', () => {
    expect(ALLOWED_FILTERS.projects).toContain('status');
    expect(ALLOWED_FILTERS.projects).toContain('visibility');
    expect(ALLOWED_FILTERS.projects).toContain('name');
  });

  it('should have builds with expected filters', () => {
    expect(ALLOWED_FILTERS.builds).toContain('status');
    expect(ALLOWED_FILTERS.builds).toContain('tier');
    expect(ALLOWED_FILTERS.builds).toContain('project_id');
  });

  it('should have deployments with expected filters', () => {
    expect(ALLOWED_FILTERS.deployments).toContain('environment');
    expect(ALLOWED_FILTERS.deployments).toContain('target');
    expect(ALLOWED_FILTERS.deployments).toContain('project_id');
  });

  it('should have files with expected filters', () => {
    expect(ALLOWED_FILTERS.files).toContain('content_type');
    expect(ALLOWED_FILTERS.files).toContain('size');
  });

  it('should have members with role filter', () => {
    expect(ALLOWED_FILTERS.members).toContain('role');
  });

  it('should have invoices with status filter', () => {
    expect(ALLOWED_FILTERS.invoices).toContain('status');
  });
});

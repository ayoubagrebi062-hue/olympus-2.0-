/**
 * OLYMPUS 2.0 - Builds API Tests
 * ==============================
 * Unit tests for build lifecycle and operations logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Build status types
type BuildStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

interface Build {
  id: string;
  project_id: string;
  tenant_id: string;
  status: BuildStatus;
  prompt?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

describe('Build Status Transitions', () => {
  const VALID_TRANSITIONS: Record<BuildStatus, BuildStatus[]> = {
    pending: ['running', 'cancelled'],
    running: ['success', 'failed', 'cancelled'],
    success: [],
    failed: [],
    cancelled: [],
  };

  function canTransition(from: BuildStatus, to: BuildStatus): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  describe('From pending status', () => {
    it('should allow transition to running', () => {
      expect(canTransition('pending', 'running')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(canTransition('pending', 'cancelled')).toBe(true);
    });

    it('should not allow transition to success', () => {
      expect(canTransition('pending', 'success')).toBe(false);
    });

    it('should not allow transition to failed', () => {
      expect(canTransition('pending', 'failed')).toBe(false);
    });
  });

  describe('From running status', () => {
    it('should allow transition to success', () => {
      expect(canTransition('running', 'success')).toBe(true);
    });

    it('should allow transition to failed', () => {
      expect(canTransition('running', 'failed')).toBe(true);
    });

    it('should allow transition to cancelled', () => {
      expect(canTransition('running', 'cancelled')).toBe(true);
    });

    it('should not allow transition to pending', () => {
      expect(canTransition('running', 'pending')).toBe(false);
    });
  });

  describe('Terminal states', () => {
    it('success should not allow any transitions', () => {
      expect(VALID_TRANSITIONS['success']).toHaveLength(0);
    });

    it('failed should not allow any transitions', () => {
      expect(VALID_TRANSITIONS['failed']).toHaveLength(0);
    });

    it('cancelled should not allow any transitions', () => {
      expect(VALID_TRANSITIONS['cancelled']).toHaveLength(0);
    });
  });
});

describe('Build Operations', () => {
  describe('Cancel Build', () => {
    function canCancel(build: Build): boolean {
      return ['pending', 'running'].includes(build.status);
    }

    it('should allow cancelling pending builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      expect(canCancel(build)).toBe(true);
    });

    it('should allow cancelling running builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'running',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      };

      expect(canCancel(build)).toBe(true);
    });

    it('should not allow cancelling successful builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'success',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      expect(canCancel(build)).toBe(false);
    });

    it('should not allow cancelling failed builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'failed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      expect(canCancel(build)).toBe(false);
    });
  });

  describe('Retry Build', () => {
    function canRetry(build: Build): boolean {
      return ['failed', 'cancelled'].includes(build.status);
    }

    it('should allow retrying failed builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'failed',
        created_at: new Date().toISOString(),
      };

      expect(canRetry(build)).toBe(true);
    });

    it('should allow retrying cancelled builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'cancelled',
        created_at: new Date().toISOString(),
      };

      expect(canRetry(build)).toBe(true);
    });

    it('should not allow retrying running builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'running',
        created_at: new Date().toISOString(),
      };

      expect(canRetry(build)).toBe(false);
    });

    it('should not allow retrying successful builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'success',
        created_at: new Date().toISOString(),
      };

      expect(canRetry(build)).toBe(false);
    });

    it('should not allow retrying pending builds', () => {
      const build: Build = {
        id: 'build-1',
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      expect(canRetry(build)).toBe(false);
    });
  });
});

describe('Build Input Validation', () => {
  interface CreateBuildInput {
    project_id?: string;
    prompt?: string;
    template_id?: string;
  }

  function validateCreateBuildInput(input: CreateBuildInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.project_id) {
      errors.push('project_id is required');
    }

    if (!input.prompt && !input.template_id) {
      errors.push('Either prompt or template_id is required');
    }

    if (input.prompt && input.prompt.length > 10000) {
      errors.push('Prompt exceeds maximum length of 10000 characters');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should accept valid input with prompt', () => {
    const input: CreateBuildInput = {
      project_id: 'proj-123',
      prompt: 'Build a landing page',
    };

    const result = validateCreateBuildInput(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept valid input with template_id', () => {
    const input: CreateBuildInput = {
      project_id: 'proj-123',
      template_id: 'template-123',
    };

    const result = validateCreateBuildInput(input);
    expect(result.valid).toBe(true);
  });

  it('should reject missing project_id', () => {
    const input: CreateBuildInput = {
      prompt: 'Build something',
    };

    const result = validateCreateBuildInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('project_id is required');
  });

  it('should reject missing prompt and template_id', () => {
    const input: CreateBuildInput = {
      project_id: 'proj-123',
    };

    const result = validateCreateBuildInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Either prompt or template_id is required');
  });

  it('should reject overly long prompts', () => {
    const input: CreateBuildInput = {
      project_id: 'proj-123',
      prompt: 'a'.repeat(10001),
    };

    const result = validateCreateBuildInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Prompt exceeds maximum length of 10000 characters');
  });
});

describe('Build Tenant Isolation', () => {
  function buildBelongsToTenant(build: Build, tenantId: string): boolean {
    return build.tenant_id === tenantId;
  }

  it('should allow access to builds from same tenant', () => {
    const build: Build = {
      id: 'build-1',
      project_id: 'proj-1',
      tenant_id: 'tenant-a',
      status: 'success',
      created_at: new Date().toISOString(),
    };

    expect(buildBelongsToTenant(build, 'tenant-a')).toBe(true);
  });

  it('should deny access to builds from different tenant', () => {
    const build: Build = {
      id: 'build-1',
      project_id: 'proj-1',
      tenant_id: 'tenant-a',
      status: 'success',
      created_at: new Date().toISOString(),
    };

    expect(buildBelongsToTenant(build, 'tenant-b')).toBe(false);
  });
});

describe('Build Limits', () => {
  interface UsageLimit {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }

  function checkBuildLimit(current: number, limit: number): UsageLimit {
    const remaining = Math.max(0, limit - current);
    return {
      allowed: current < limit,
      current,
      limit,
      remaining,
    };
  }

  it('should allow builds when under limit', () => {
    const result = checkBuildLimit(5, 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(95);
  });

  it('should block builds when at limit', () => {
    const result = checkBuildLimit(100, 100);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should block builds when over limit', () => {
    const result = checkBuildLimit(150, 100);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('Build Logs', () => {
  interface BuildLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }

  function filterLogsByLevel(logs: BuildLog[], level: BuildLog['level']): BuildLog[] {
    return logs.filter((log) => log.level === level);
  }

  it('should filter logs by level', () => {
    const logs: BuildLog[] = [
      { timestamp: '2024-01-01T00:00:01Z', level: 'info', message: 'Build started' },
      { timestamp: '2024-01-01T00:00:02Z', level: 'warn', message: 'Slow dependency' },
      { timestamp: '2024-01-01T00:00:03Z', level: 'error', message: 'Build failed' },
      { timestamp: '2024-01-01T00:00:04Z', level: 'info', message: 'Retrying...' },
    ];

    expect(filterLogsByLevel(logs, 'info')).toHaveLength(2);
    expect(filterLogsByLevel(logs, 'warn')).toHaveLength(1);
    expect(filterLogsByLevel(logs, 'error')).toHaveLength(1);
  });

  describe('Log pagination', () => {
    function paginateLogs(logs: BuildLog[], page: number, pageSize: number): BuildLog[] {
      const start = (page - 1) * pageSize;
      return logs.slice(start, start + pageSize);
    }

    it('should paginate logs correctly', () => {
      const logs: BuildLog[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        level: 'info',
        message: `Log entry ${i}`,
      }));

      const page1 = paginateLogs(logs, 1, 20);
      const page2 = paginateLogs(logs, 2, 20);
      const page3 = paginateLogs(logs, 3, 20);

      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(20);
      expect(page3).toHaveLength(10);
    });
  });
});

describe('Build Artifacts', () => {
  interface BuildArtifact {
    buildId: string;
    files: Array<{ path: string; size: number }>;
    totalSize: number;
  }

  function calculateTotalSize(files: Array<{ path: string; size: number }>): number {
    return files.reduce((sum, file) => sum + file.size, 0);
  }

  it('should calculate total artifact size', () => {
    const files = [
      { path: 'src/index.tsx', size: 1024 },
      { path: 'src/App.tsx', size: 2048 },
      { path: 'src/utils.ts', size: 512 },
    ];

    expect(calculateTotalSize(files)).toBe(3584);
  });

  it('should handle empty file list', () => {
    expect(calculateTotalSize([])).toBe(0);
  });
});

describe('Build Duration', () => {
  function calculateDuration(startedAt: string, completedAt: string): number {
    return new Date(completedAt).getTime() - new Date(startedAt).getTime();
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  it('should calculate build duration in milliseconds', () => {
    const startedAt = '2024-01-01T00:00:00Z';
    const completedAt = '2024-01-01T00:05:30Z';

    expect(calculateDuration(startedAt, completedAt)).toBe(330000); // 5m 30s
  });

  it('should format duration correctly', () => {
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(3660000)).toBe('1h 1m');
  });
});

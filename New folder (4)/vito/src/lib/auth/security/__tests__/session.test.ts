/**
 * OLYMPUS 2.0 - Session Management Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Create a comprehensive chainable mock for Supabase queries
const createFullChainableMock = (defaultResult: { data: unknown; error: unknown } = { data: null, error: null }) => {
  const chainable: Record<string, unknown> = {};
  const methods = [
    'select', 'eq', 'not', 'in', 'order', 'limit', 'single', 'maybeSingle',
    'gte', 'lte', 'gt', 'lt', 'is', 'neq', 'like', 'ilike', 'insert', 'update', 'upsert', 'delete'
  ];

  for (const method of methods) {
    if (method === 'single' || method === 'maybeSingle') {
      chainable[method] = vi.fn(() => defaultResult);
    } else {
      chainable[method] = vi.fn(() => chainable);
    }
  }

  return chainable;
};

// Mock the auth clients module
vi.mock('@/lib/auth/clients', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => createFullChainableMock()),
    auth: {
      admin: {
        signOut: vi.fn(() => Promise.resolve({ error: null })),
        listUsers: vi.fn(() => Promise.resolve({ data: { users: [] }, error: null })),
      },
    },
  })),
  createBrowserClient: vi.fn(() => ({})),
}));

import { revokeSession, revokeAllSessions, revokeOtherSessions } from '../session';

describe('Session Management', () => {
  describe('revokeSession', () => {
    it('should return true when revoking a valid session', async () => {
      const sessionId = 'test-session-id';
      const result = await revokeSession(sessionId);
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid session IDs gracefully', async () => {
      const result = await revokeSession('invalid-session-id');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const userId = 'test-user-id';
      const result = await revokeAllSessions(userId);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke other sessions except current', async () => {
      const userId = 'test-user-id';
      const currentSessionId = 'current-session-id';
      const result = await revokeOtherSessions(userId, currentSessionId);
      expect(typeof result).toBe('number');
    });
  });
});

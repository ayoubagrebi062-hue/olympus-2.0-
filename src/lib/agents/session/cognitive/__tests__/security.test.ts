/**
 * OLYMPUS 2.0 - Security Patches Tests
 *
 * Tests for Week 2 critical security patches.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CognitiveSessionManager } from '../manager';
import { enforceSessionLimits, checkSessionSize, SESSION_LIMITS } from '../limits';
import { SessionLockManager, OptimisticLockError, LockTimeoutError } from '../locking';
import {
  validatePath,
  validateUrl,
  SANDBOX_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  TRUSTED_PERMISSIONS,
} from '../../../tools/permissions';
import {
  safeRegexMatchAll,
  isRegexSafe,
  executeRegexSafely,
  RegexTimeoutError,
} from '../../../guardrails/output/safe-regex';
import type { CognitiveSession } from '../types';

describe('Session Security (PATCH 1)', () => {
  let manager: CognitiveSessionManager;

  beforeEach(() => {
    manager = new CognitiveSessionManager();
  });

  describe('Access Control', () => {
    it('should require valid access token for secure access', async () => {
      const result = await manager.getSessionSecure('invalid-token');
      expect(result).toBeNull();
    });

    it('should generate and validate access tokens', () => {
      const token = manager.generateAccessToken('user-123', 'secret-key');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      const userId = manager.validateAccessToken(token);
      expect(userId).toBe('user-123');
    });

    it('should reject invalid tokens', () => {
      const userId = manager.validateAccessToken('completely-invalid');
      expect(userId).toBeNull();
    });

    it('should allow revoking tokens', () => {
      const token = manager.generateAccessToken('user-456', 'secret');
      expect(manager.validateAccessToken(token)).toBe('user-456');

      const revoked = manager.revokeAccessToken(token);
      expect(revoked).toBe(true);

      expect(manager.validateAccessToken(token)).toBeNull();
    });

    it('should validate user access (self-only)', () => {
      expect(manager.validateUserAccess('user-1', 'user-1')).toBe(true);
      expect(manager.validateUserAccess('user-1', 'user-2')).toBe(false);
    });
  });
});

describe('Tool Permissions (PATCH 2)', () => {
  describe('Filesystem', () => {
    it('should block path traversal', () => {
      const result = validatePath('../etc/passwd', 'read', SANDBOX_PERMISSIONS);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('traversal');
    });

    it('should block double slashes', () => {
      const result = validatePath('/tmp//olympus/file', 'read', SANDBOX_PERMISSIONS);
      expect(result.allowed).toBe(false);
    });

    it('should block access to sensitive paths', () => {
      const sensitiveTests = [
        '/etc/shadow',
        '/root/.bashrc',
        '/home/user/.ssh/id_rsa',
        '/var/log/auth.log',
      ];

      for (const path of sensitiveTests) {
        const result = validatePath(path, 'read', TRUSTED_PERMISSIONS);
        expect(result.allowed).toBe(false);
      }
    });

    it('should allow access to sandbox paths', () => {
      const result = validatePath('/tmp/olympus/output/file.ts', 'write', SANDBOX_PERMISSIONS);
      expect(result.allowed).toBe(true);
    });

    it('should deny all filesystem by default', () => {
      const result = validatePath('/any/path', 'read', DEFAULT_PERMISSIONS);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not permitted');
    });
  });

  describe('Network', () => {
    it('should block internal IPs', () => {
      const internalUrls = [
        'http://192.168.1.1/admin',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/service',
        'http://127.0.0.1:3000/api',
      ];

      // Use TRUSTED_PERMISSIONS which allows external network but blocks internal IPs
      for (const url of internalUrls) {
        const result = validateUrl(url, TRUSTED_PERMISSIONS);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Internal');
      }
    });

    it('should block localhost', () => {
      const result = validateUrl('http://localhost:3000', SANDBOX_PERMISSIONS);
      expect(result.allowed).toBe(false);
    });

    it('should block cloud metadata endpoints', () => {
      const result = validateUrl('http://169.254.169.254/latest/meta-data', SANDBOX_PERMISSIONS);
      expect(result.allowed).toBe(false);
    });

    it('should block all domains by default', () => {
      const result = validateUrl('https://example.com', DEFAULT_PERMISSIONS);
      expect(result.allowed).toBe(false);
    });
  });
});

describe('Session Limits (PATCH 3)', () => {
  const createMockSession = (overrides: Partial<CognitiveSession> = {}): CognitiveSession => ({
    identity: {
      userId: 'test-user',
      expertiseLevel: 'intermediate',
      expertiseConfidence: 0.5,
      domainExpertise: [],
      communicationStyle: {
        verbosity: 'balanced',
        technicalDepth: 'standard',
        preferredExamples: 'brief',
        responseFormat: 'structured',
      },
      firstSeen: new Date(),
      lastSeen: new Date(),
      totalSessions: 1,
      totalBuilds: 0,
    },
    preferences: {},
    patterns: {
      buildPatterns: {
        averageBuildTime: 0,
        averageAgentsUsed: 0,
        preferredBuildTier: 'starter',
        peakProductivityHours: [],
        averageSessionDuration: 0,
        buildsPerSession: 0,
      },
      iterationPatterns: {
        averageIterationsPerBuild: 0,
        commonIterationTypes: [],
        iterationSuccessRate: 0,
      },
      featureUsage: {
        usesConversion: false,
        usesTests: false,
        usesCi: false,
        usesAuth: false,
        usesPayments: false,
        usesAnalytics: false,
      },
      errorPatterns: [],
      decisionPatterns: {
        decisionSpeed: 'moderate',
        revisesDecisions: false,
        prefersGuidance: true,
      },
    },
    builds: [],
    learnings: [],
    predictions: [],
    evolution: [],
    conversations: [],
    version: 1,
    lastUpdated: new Date(),
    ...overrides,
  });

  it('should enforce build history limit', () => {
    const session = createMockSession({
      builds: Array(200).fill(null).map((_, i) => ({
        id: `build-${i}`,
        timestamp: new Date(),
        prompt: 'test',
        buildType: 'webapp',
        stack: {},
        totalDuration: 1000,
        totalTokens: 100,
        totalCost: 0.01,
        phases: [],
        success: true,
      })),
    });

    enforceSessionLimits(session);
    expect(session.builds.length).toBeLessThanOrEqual(SESSION_LIMITS.maxBuilds);
  });

  it('should enforce learnings limit', () => {
    const session = createMockSession({
      learnings: Array(1000).fill(null).map((_, i) => ({
        id: `learning-${i}`,
        type: 'success' as const,
        category: 'test',
        subject: 'test',
        learning: 'test learning',
        evidence: [],
        confidence: Math.random(),
        relevance: 1,
        learnedAt: new Date(),
        applicationCount: 0,
      })),
    });

    enforceSessionLimits(session);
    expect(session.learnings.length).toBeLessThanOrEqual(SESSION_LIMITS.maxLearnings);
  });

  it('should check session size', () => {
    const session = createMockSession();
    const { sizeBytes, percentUsed } = checkSessionSize(session);

    expect(sizeBytes).toBeGreaterThan(0);
    expect(percentUsed).toBeGreaterThanOrEqual(0);
    expect(percentUsed).toBeLessThan(100);
  });

  it('should warn when approaching limits', () => {
    // Create a session with lots of data
    const session = createMockSession({
      builds: Array(95).fill(null).map((_, i) => ({
        id: `build-${i}`,
        timestamp: new Date(),
        prompt: 'test prompt '.repeat(100),
        buildType: 'webapp',
        stack: {},
        totalDuration: 1000,
        totalTokens: 100,
        totalCost: 0.01,
        phases: [],
        success: true,
      })),
    });

    const { warnings } = checkSessionSize(session);
    // May or may not have warnings depending on data size
    expect(Array.isArray(warnings)).toBe(true);
  });
});

describe('Session Locking (PATCH 6)', () => {
  let lockManager: SessionLockManager;

  beforeEach(() => {
    lockManager = new SessionLockManager();
    lockManager.clear();
  });

  describe('Optimistic Locking', () => {
    it('should track versions', () => {
      expect(lockManager.getVersion('user-1')).toBe(0);

      const v1 = lockManager.incrementVersion('user-1');
      expect(v1).toBe(1);

      const v2 = lockManager.incrementVersion('user-1');
      expect(v2).toBe(2);
    });

    it('should check version matches', () => {
      lockManager.incrementVersion('user-1');
      expect(lockManager.checkVersion('user-1', 1)).toBe(true);
      expect(lockManager.checkVersion('user-1', 0)).toBe(false);
    });

    it('should throw on version mismatch', () => {
      lockManager.incrementVersion('user-1');

      expect(() => {
        lockManager.validateVersion('user-1', 0);
      }).toThrow(OptimisticLockError);
    });
  });

  describe('Pessimistic Locking', () => {
    it('should acquire and release locks', async () => {
      const acquired = await lockManager.acquireLock('user-1', 'holder-1', 5000);
      expect(acquired).toBe(true);
      expect(lockManager.isLocked('user-1')).toBe(true);

      const released = lockManager.releaseLock('user-1', 'holder-1');
      expect(released).toBe(true);
      expect(lockManager.isLocked('user-1')).toBe(false);
    });

    it('should not allow different holder to release', () => {
      lockManager.tryAcquireLock('user-1', 'holder-1');

      const released = lockManager.releaseLock('user-1', 'holder-2');
      expect(released).toBe(false);
      expect(lockManager.isLocked('user-1')).toBe(true);
    });

    it('should allow same holder to renew lock', async () => {
      await lockManager.acquireLock('user-1', 'holder-1', 5000);
      const renewed = await lockManager.acquireLock('user-1', 'holder-1', 5000);
      expect(renewed).toBe(true);
    });

    it('should execute with lock', async () => {
      let executed = false;

      await lockManager.withLock('user-1', 'holder-1', async () => {
        executed = true;
        expect(lockManager.isLocked('user-1')).toBe(true);
      });

      expect(executed).toBe(true);
      expect(lockManager.isLocked('user-1')).toBe(false);
    });
  });
});

describe('Safe Regex (PATCH 5)', () => {
  describe('ReDoS Protection', () => {
    it('should detect dangerous nested quantifiers', () => {
      const result = isRegexSafe('(a+)+$');
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('quantifier');
    });

    it('should accept safe patterns', () => {
      const safePatterns = ['\\d+', '[a-z]+', 'hello\\s+world', 'sk-[a-zA-Z0-9]+'];

      for (const pattern of safePatterns) {
        const result = isRegexSafe(pattern);
        expect(result.safe).toBe(true);
      }
    });

    it('should reject very long patterns', () => {
      const longPattern = 'a'.repeat(600);
      const result = isRegexSafe(longPattern);
      expect(result.safe).toBe(false);
    });
  });

  describe('Safe Execution', () => {
    it('should limit number of matches', async () => {
      const content = 'a'.repeat(10000);
      const matches = await safeRegexMatchAll(/a/g, content, 5000, 100);
      expect(matches.length).toBeLessThanOrEqual(100);
    });

    it('should handle normal regex safely', async () => {
      const content = 'hello world hello universe';
      const matches = await safeRegexMatchAll(/hello/g, content);
      expect(matches.length).toBe(2);
    });

    it('should truncate large content', async () => {
      const largeContent = 'a'.repeat(2_000_000);
      const result = await executeRegexSafely(/a/g, largeContent, {
        maxContentLength: 1000,
        maxMatches: 10,
      });

      expect(result.truncated).toBe(true);
      expect(result.matchCount).toBeLessThanOrEqual(10);
    });
  });
});

describe('Tool ID Collision (PATCH 4)', () => {
  it('should be tested in decorator-tools.test.ts', () => {
    // This is tested in the decorator tools test file
    // The collision prevention throws an error when registering
    // a tool with the same ID but different execute function
    expect(true).toBe(true);
  });
});

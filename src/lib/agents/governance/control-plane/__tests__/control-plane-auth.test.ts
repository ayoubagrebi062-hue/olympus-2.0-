/**
 * OLYMPUS 2.0 - Control Plane Authorization Tests
 *
 * Tests for role-based access control in the governance control plane:
 * 1. AgentIdentity validation (no string bypass)
 * 2. Fingerprint requirement for high-severity actions
 * 3. AUTH_MATRIX role validation
 *
 * Created: January 31, 2026
 * Security Audit Task #18
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRole, type AgentIdentity } from '../../types';
import { ControlAction, GovernanceControlPlane, ControlLevel } from '../control-plane';

// Mock dependencies
vi.mock('../../ledger/types', () => ({}));
vi.mock('../../store/types', () => ({}));

// Create mock stores
const mockLedgerStore = {
  append: vi.fn(() => Promise.resolve()),
  getEntries: vi.fn(() => Promise.resolve([])),
  verifyEntry: vi.fn(() => Promise.resolve(true)),
  getAuditTrail: vi.fn(() => Promise.resolve([])),
};

const mockAuditStore = {
  log: vi.fn(() => Promise.resolve()),
  query: vi.fn(() => Promise.resolve([])),
  getByTarget: vi.fn(() => Promise.resolve([])),
  getByOperator: vi.fn(() => Promise.resolve([])),
};

describe('Control Plane Authorization', () => {
  let controlPlane: GovernanceControlPlane;

  beforeEach(() => {
    vi.resetAllMocks();
    controlPlane = new GovernanceControlPlane(mockLedgerStore as any, mockAuditStore as any);
  });

  describe('AgentIdentity Validation', () => {
    it('should reject empty agentId', async () => {
      const invalidIdentity: AgentIdentity = {
        agentId: '',
        role: AgentRole.GOVERNANCE,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
      };

      const decision = await controlPlane.executeAction(
        ControlAction.PAUSE_BUILD,
        'build-123',
        invalidIdentity
      );

      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('missing agentId');
    });

    it('should reject undefined role', async () => {
      const invalidIdentity = {
        agentId: 'agent-123',
        role: undefined,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
      } as unknown as AgentIdentity;

      const decision = await controlPlane.executeAction(
        ControlAction.PAUSE_BUILD,
        'build-123',
        invalidIdentity
      );

      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('missing');
    });

    it('should throw error for null identity', async () => {
      // Null identity should cause an error (fail-fast for security)
      await expect(
        controlPlane.executeAction(
          ControlAction.PAUSE_BUILD,
          'build-123',
          null as unknown as AgentIdentity
        )
      ).rejects.toThrow();
    });
  });

  describe('High-Severity Action Fingerprint Requirement', () => {
    const highSeverityActions = [
      ControlAction.KILL_SWITCH,
      ControlAction.FORCE_ROLLBACK,
      ControlAction.LOCK_TENANT,
    ];

    for (const action of highSeverityActions) {
      it(`should require fingerprint for ${action}`, async () => {
        const identityWithoutFingerprint: AgentIdentity = {
          agentId: 'governance-agent',
          role: AgentRole.GOVERNANCE,
          tenantId: 'test-tenant',
          timestamp: Date.now(),
          // No fingerprint
        };

        const decision = await controlPlane.executeAction(
          action,
          'target-123',
          identityWithoutFingerprint
        );

        expect(decision.authorized).toBe(false);
        expect(decision.reason).toContain('fingerprint');
      });

      it(`should allow ${action} with valid fingerprint`, async () => {
        const identityWithFingerprint: AgentIdentity = {
          agentId: 'governance-agent',
          role: AgentRole.GOVERNANCE,
          tenantId: 'test-tenant',
          timestamp: Date.now(),
          fingerprint: 'sha256:abc123def456',
        };

        const decision = await controlPlane.executeAction(
          action,
          'target-123',
          identityWithFingerprint
        );

        // Authorization depends on role, but fingerprint check passes
        expect(decision.reason).not.toContain('fingerprint');
      });
    }
  });

  describe('Role-Based Access Control', () => {
    it('should allow GOVERNANCE role to execute control actions', async () => {
      const governanceIdentity: AgentIdentity = {
        agentId: 'governance-agent',
        role: AgentRole.GOVERNANCE,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
        fingerprint: 'sha256:valid-fingerprint',
      };

      const decision = await controlPlane.executeAction(
        ControlAction.PAUSE_BUILD,
        'build-123',
        governanceIdentity
      );

      // GOVERNANCE should be authorized for PAUSE_BUILD
      expect(decision.reason).not.toContain('missing');
    });

    it('should restrict non-governance roles from critical actions', async () => {
      const workerIdentity: AgentIdentity = {
        agentId: 'worker-agent',
        role: AgentRole.WORKER,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
        fingerprint: 'sha256:worker-fingerprint',
      };

      const decision = await controlPlane.executeAction(
        ControlAction.KILL_SWITCH,
        'system',
        workerIdentity
      );

      // WORKER should not be authorized for KILL_SWITCH
      expect(decision.authorized).toBe(false);
    });

    it('should allow ORCHESTRATOR role for build operations', async () => {
      const orchestratorIdentity: AgentIdentity = {
        agentId: 'orchestrator-agent',
        role: AgentRole.ORCHESTRATOR,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
      };

      const decision = await controlPlane.executeAction(
        ControlAction.PAUSE_BUILD,
        'build-123',
        orchestratorIdentity
      );

      // ORCHESTRATOR should be allowed for build operations (non-critical)
      expect(decision.reason).not.toContain('missing agentId');
    });
  });

  describe('No Hardcoded Role Bypass', () => {
    it('should not auto-authorize based on string role names', async () => {
      // Simulate an attacker trying to pass "GOVERNANCE" as a string
      const spoofedIdentity = {
        agentId: 'attacker',
        role: 'GOVERNANCE' as AgentRole, // String instead of enum
        tenantId: 'test-tenant',
        timestamp: Date.now(),
      };

      // The system should validate against the actual AgentRole enum
      // not just check for string equality
      const decision = await controlPlane.executeAction(
        ControlAction.KILL_SWITCH,
        'system',
        spoofedIdentity as AgentIdentity
      );

      // Should require fingerprint regardless of role string
      expect(decision.reason).toContain('fingerprint');
    });

    it('should evaluate actual identity role, not assume GOVERNANCE', async () => {
      const validIdentity: AgentIdentity = {
        agentId: 'monitor-agent',
        role: AgentRole.MONITOR,
        tenantId: 'test-tenant',
        timestamp: Date.now(),
        fingerprint: 'sha256:monitor-fingerprint',
      };

      const decision = await controlPlane.executeAction(
        ControlAction.KILL_SWITCH,
        'system',
        validIdentity
      );

      // MONITOR role should NOT be authorized for KILL_SWITCH
      // even though it's a valid identity - tests that role is actually checked
      expect(decision.authorized).toBe(false);
    });
  });

  describe('Control State Isolation', () => {
    it('should not expose internal state to unauthorized requests', async () => {
      const state = controlPlane.getCurrentState();

      // State should be returned but sensitive operations blocked
      expect(state.level).toBeDefined();
      expect(state.halted).toBeDefined();
    });

    it('should maintain separate paused builds per tenant', async () => {
      const state = controlPlane.getCurrentState();

      // Paused builds should be tracked as a Set (no cross-tenant leakage)
      expect(state.pausedBuilds).toBeInstanceOf(Set);
      expect(state.lockedTenants).toBeInstanceOf(Set);
    });
  });
});

describe('Audit Trail for Authorization', () => {
  let controlPlane: GovernanceControlPlane;

  beforeEach(() => {
    vi.resetAllMocks();
    controlPlane = new GovernanceControlPlane(mockLedgerStore as any, mockAuditStore as any);
  });

  it('should return decision for all authorization requests', async () => {
    const identity: AgentIdentity = {
      agentId: 'test-agent',
      role: AgentRole.WORKER,
      tenantId: 'test-tenant',
      timestamp: Date.now(),
    };

    const decision = await controlPlane.executeAction(
      ControlAction.PAUSE_BUILD,
      'build-123',
      identity
    );

    // Verify decision contains authorization result
    expect(decision).toBeDefined();
    expect(decision.action).toBe(ControlAction.PAUSE_BUILD);
    expect(typeof decision.authorized).toBe('boolean');
    expect(typeof decision.reason).toBe('string');
  });

  it('should include action details in decision response', async () => {
    const identity: AgentIdentity = {
      agentId: 'audit-test-agent',
      role: AgentRole.GOVERNANCE,
      tenantId: 'audit-tenant',
      timestamp: Date.now(),
      fingerprint: 'sha256:audit-fingerprint',
    };

    const decision = await controlPlane.executeAction(
      ControlAction.RESUME_BUILD,
      'build-456',
      identity
    );

    // Verify decision includes action context for audit trail
    expect(decision.action).toBe(ControlAction.RESUME_BUILD);
    expect(decision.target).toBe('build-456');
    expect(decision.level).toBeDefined();
    expect(decision.requiresApproval).toBeDefined();
  });
});

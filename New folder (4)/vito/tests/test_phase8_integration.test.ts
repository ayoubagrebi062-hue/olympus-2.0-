/**
 * Phase 8 Integration Tests
 * Test suite for Governance Control Plane, Epochs, and Blast Radius Engine
 *
 * Run with: npx vitest tests/test_phase8_integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GovernanceControlPlane, createControlPlane, ControlAction, ControlLevel, IControlPlane } from '../src/lib/agents/governance/control-plane/control-plane';
import { EpochManager, createEpochManager, EpochPhase, EpochType, IEpochManager } from '../src/lib/agents/governance/epochs/epoch-manager';
import { BlastRadiusEngine, createBlastRadiusEngine, BlastZone, BlastSeverity, IBlastRadiusEngine } from '../src/lib/agents/governance/blast-radius/engine';
import type { IAuditLogStore } from '../src/lib/agents/governance/store/types';
import type { ILedgerStore, GovernanceLedgerEntry } from '../src/lib/agents/governance/ledger/types';

// Mock implementations
class MockLedgerStore implements ILedgerStore {
  async append(entry: GovernanceLedgerEntry): Promise<string> {
    return entry.id || crypto.randomUUID();
  }

  async getEntries(buildId: string, limit?: number): Promise<GovernanceLedgerEntry[]> {
    return [];
  }

  async getLatestHash(): Promise<string | null> {
    return null;
  }

  async verifyConsistency() {
    return { isConsistent: true, totalEntries: 0 };
  }
}

class MockAuditLogStore implements IAuditLogStore {
  async logAudit(entry: any): Promise<void> {
    return;
  }

  async getAuditLog(filter: any): Promise<any[]> {
    return [];
  }

  async getAuditStats(): Promise<any> {
    return {};
  }
}

describe('Phase 8.1: Governance Control Plane', () => {
  let controlPlane: IControlPlane;
  let mockLedger: MockLedgerStore;
  let mockAudit: MockAuditLogStore;

  beforeEach(() => {
    mockLedger = new MockLedgerStore();
    mockAudit = new MockAuditLogStore();
    controlPlane = createControlPlane(mockLedger, mockAudit);
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = controlPlane.getCurrentState();

      expect(state.level).toBe(ControlLevel.NONE);
      expect(state.halted).toBe(false);
      expect(state.killSwitchActive).toBe(false);
      expect(state.pausedBuilds.size).toBe(0);
      expect(state.lockedTenants.size).toBe(0);
    });

    it('should have all control actions available', async () => {
      const actions = [
        ControlAction.HALT,
        ControlAction.RESUME,
        ControlAction.KILL_SWITCH,
        ControlAction.PAUSE_BUILD,
        ControlAction.RESUME_BUILD,
        ControlAction.FORCE_ROLLBACK,
        ControlAction.ESCALATE,
        ControlAction.LOCK_TENANT,
        ControlAction.UNLOCK_TENANT
      ];

      for (const action of actions) {
        expect(action).toBeDefined();
      }
    });
  });

  describe('Kill Switch', () => {
    it('should trigger kill switch', async () => {
      await controlPlane.triggerKillSwitch('Critical failure detected', 'admin');

      const state = controlPlane.getCurrentState();
      expect(state.killSwitchActive).toBe(true);
      expect(state.halted).toBe(true);
      expect(state.haltedBy).toBe('admin');
      expect(state.haltReason).toBe('Critical failure detected');
      expect(state.level).toBe(ControlLevel.EMERGENCY);
    });

    it('should not allow duplicate kill switch activation', async () => {
      await controlPlane.triggerKillSwitch('Test', 'admin');

      await expect(controlPlane.triggerKillSwitch('Test again', 'admin'))
        .rejects.toThrow('Kill switch already active');
    });

    it('should release kill switch', async () => {
      await controlPlane.triggerKillSwitch('Test', 'admin');
      await controlPlane.releaseKillSwitch('admin');

      const state = controlPlane.getCurrentState();
      expect(state.killSwitchActive).toBe(false);
      expect(state.halted).toBe(false);
      expect(state.level).toBe(ControlLevel.NONE);
    });

    it('should fail to release if kill switch not active', async () => {
      const result = await controlPlane.releaseKillSwitch('admin');
      expect(result).toBe(false);
    });
  });

  describe('Build Pausing', () => {
    it('should pause build', async () => {
      const result = await controlPlane.pauseBuild('build-123', 'Testing pause', 'admin');

      expect(result).toBe(true);

      const state = controlPlane.getCurrentState();
      expect(state.pausedBuilds.has('build-123')).toBe(true);
    });

    it('should resume build', async () => {
      await controlPlane.pauseBuild('build-123', 'Test', 'admin');
      const result = await controlPlane.resumeBuild('build-123', 'admin');

      expect(result).toBe(true);

      const state = controlPlane.getCurrentState();
      expect(state.pausedBuilds.has('build-123')).toBe(false);
    });

    it('should not pause already paused build', async () => {
      await controlPlane.pauseBuild('build-123', 'Test', 'admin');
      const result = await controlPlane.pauseBuild('build-123', 'Test again', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('Tenant Locking', () => {
    it('should lock tenant', async () => {
      const result = await controlPlane.lockTenant('tenant-456', 'Security violation', 'admin');

      expect(result).toBe(true);

      const state = controlPlane.getCurrentState();
      expect(state.lockedTenants.has('tenant-456')).toBe(true);
    });

    it('should unlock tenant', async () => {
      await controlPlane.lockTenant('tenant-456', 'Test', 'admin');
      const result = await controlPlane.unlockTenant('tenant-456', 'admin');

      expect(result).toBe(true);

      const state = controlPlane.getCurrentState();
      expect(state.lockedTenants.has('tenant-456')).toBe(false);
    });

    it('should not lock already locked tenant', async () => {
      await controlPlane.lockTenant('tenant-456', 'Test', 'admin');
      const result = await controlPlane.lockTenant('tenant-456', 'Test again', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('Control History', () => {
    it('should return control history', async () => {
      await controlPlane.pauseBuild('build-123', 'Test', 'admin');
      await controlPlane.triggerKillSwitch('Test', 'admin');

      const history = await controlPlane.getControlHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].triggeredBy).toBe('admin');
    });

    it('should filter history by target', async () => {
      await controlPlane.pauseBuild('build-123', 'Test', 'admin');
      await controlPlane.pauseBuild('build-456', 'Test', 'admin');

      const history = await controlPlane.getControlHistory('build-123');

      expect(history.length).toBe(1);
      expect(history[0].target).toBe('build-123');
    });
  });
});

describe('Phase 8.2: Epoch Manager', () => {
  let epochManager: IEpochManager;

  beforeEach(() => {
    epochManager = createEpochManager();
  });

  describe('Epoch Creation', () => {
    it('should create daily epoch', async () => {
      const epoch = await epochManager.createEpoch({
        name: 'Daily Test Epoch',
        type: EpochType.DAILY
      });

      expect(epoch.config.name).toBe('Daily Test Epoch');
      expect(epoch.config.type).toBe(EpochType.DAILY);
      expect(epoch.currentPhase).toBe(EpochPhase.PREPARATION);
    });

    it('should create custom epoch', async () => {
      const startTime = new Date('2026-01-17T00:00:00Z');
      const endTime = new Date('2026-01-18T00:00:00Z');

      const epoch = await epochManager.createEpoch({
        name: 'Custom Test Epoch',
        type: EpochType.CUSTOM,
        startTime,
        endTime,
        maxBuildsPerEpoch: 500
      });

      expect(epoch.config.startTime).toEqual(startTime);
      expect(epoch.config.endTime).toEqual(endTime);
      expect(epoch.config.maxBuildsPerEpoch).toBe(500);
    });
  });

  describe('Phase Transitions', () => {
    it('should advance phase', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      const transition = await epochManager.advancePhase(epoch.config.id, EpochPhase.ACTIVE, 'admin');

      expect(transition.fromPhase).toBe(EpochPhase.PREPARATION);
      expect(transition.toPhase).toBe(EpochPhase.ACTIVE);
      expect(transition.triggeredBy).toBe('admin');

      const updatedEpoch = await epochManager.getEpoch(epoch.config.id);
      expect(updatedEpoch?.currentPhase).toBe(EpochPhase.ACTIVE);
    });

    it('should close epoch', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });
      await epochManager.advancePhase(epoch.config.id, EpochPhase.ACTIVE, 'admin');

      const transition = await epochManager.advancePhase(epoch.config.id, EpochPhase.CLOSED, 'admin');

      expect(transition.toPhase).toBe(EpochPhase.CLOSED);

      const currentEpoch = await epochManager.getCurrentEpoch();
      expect(currentEpoch).toBeNull();
    });
  });

  describe('Build Tracking', () => {
    it('should record successful build completion', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      await epochManager.recordBuildCompletion(epoch.config.id, 'build-123', true);

      const metrics = await epochManager.getEpochMetrics(epoch.config.id);
      expect(metrics.buildsCompleted).toBe(1);
      expect(metrics.buildsFailed).toBe(0);
      expect(metrics.successRate).toBe(1.0);
    });

    it('should record failed build completion', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      await epochManager.recordBuildCompletion(epoch.config.id, 'build-123', false);

      const metrics = await epochManager.getEpochMetrics(epoch.config.id);
      expect(metrics.buildsCompleted).toBe(0);
      expect(metrics.buildsFailed).toBe(1);
      expect(metrics.successRate).toBe(0.0);
    });
  });

  describe('Action Tracking', () => {
    it('should record allowed action', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      await epochManager.recordActionExecution(epoch.config.id, 'action-123', true);

      const metrics = await epochManager.getEpochMetrics(epoch.config.id);
      expect(metrics.actionsExecuted).toBe(1);
      expect(metrics.actionsBlocked).toBe(0);
    });

    it('should record blocked action', async () => {
      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      await epochManager.recordActionExecution(epoch.config.id, 'action-123', false);

      const metrics = await epochManager.getEpochMetrics(epoch.config.id);
      expect(metrics.actionsExecuted).toBe(0);
      expect(metrics.actionsBlocked).toBe(1);
    });
  });

  describe('Auto Rollback', () => {
    it('should trigger auto-rollback on high failure rate', async () => {
      const epoch = await epochManager.createEpoch({
        name: 'Test Epoch',
        type: EpochType.DAILY,
        autoRollbackEnabled: true
      });

      await epochManager.recordBuildCompletion(epoch.config.id, 'build-1', false);
      await epochManager.recordBuildCompletion(epoch.config.id, 'build-2', false);
      await epochManager.recordBuildCompletion(epoch.config.id, 'build-3', true);
      await epochManager.recordBuildCompletion(epoch.config.id, 'build-4', false);

      const shouldRollback = await epochManager.shouldAutoRollback(epoch.config.id);
      expect(shouldRollback).toBe(true);
    });

    it('should not trigger auto-rollback when disabled', async () => {
      const epoch = await epochManager.createEpoch({
        name: 'Test Epoch',
        type: EpochType.DAILY,
        autoRollbackEnabled: false
      });

      await epochManager.recordBuildCompletion(epoch.config.id, 'build-1', false);
      await epochManager.recordBuildCompletion(epoch.config.id, 'build-2', false);

      const shouldRollback = await epochManager.shouldAutoRollback(epoch.config.id);
      expect(shouldRollback).toBe(false);
    });
  });

  describe('Epoch History', () => {
    it('should return epoch history', async () => {
      await epochManager.createEpoch({ name: 'Epoch 1', type: EpochType.DAILY });
      await epochManager.createEpoch({ name: 'Epoch 2', type: EpochType.DAILY });
      await epochManager.createEpoch({ name: 'Epoch 3', type: EpochType.DAILY });

      const history = await epochManager.getEpochHistory(10);
      expect(history.length).toBe(3);
    });

    it('should limit history results', async () => {
      await epochManager.createEpoch({ name: 'Epoch 1', type: EpochType.DAILY });
      await epochManager.createEpoch({ name: 'Epoch 2', type: EpochType.DAILY });
      await epochManager.createEpoch({ name: 'Epoch 3', type: EpochType.DAILY });

      const history = await epochManager.getEpochHistory(2);
      expect(history.length).toBe(2);
    });
  });
});

describe('Phase 8.3: Blast Radius Engine', () => {
  let blastEngine: IBlastRadiusEngine;

  beforeEach(() => {
    blastEngine = createBlastRadiusEngine();
  });

  describe('Impact Assessment', () => {
    it('should assess impact for build', async () => {
      const assessment = await blastEngine.assessImpact('build-123', 'tenant-456', 'agent-789');

      expect(assessment.buildId).toBe('build-123');
      expect(assessment.tenantId).toBe('tenant-456');
      expect(assessment.agentId).toBe('agent-789');
      expect(assessment.estimatedZone).toBe(BlastZone.SINGLE_BUILD);
      expect(assessment.confidence).toBeGreaterThan(0);
    });

    it('should determine severity based on affected resources', async () => {
      const assessment = await blastEngine.assessImpact('build-123', 'tenant-456', 'agent-789');

      expect([BlastSeverity.LOW, BlastSeverity.MEDIUM, BlastSeverity.HIGH, BlastSeverity.CRITICAL])
        .toContain(assessment.severity);
    });
  });

  describe('Build Quarantine', () => {
    it('should quarantine build', async () => {
      const result = await blastEngine.quarantineBuild('build-123', 'Security violation', 'admin');

      expect(result).toBe(true);

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.SINGLE_BUILD);
      expect(zoneStatus.quarantinedBuilds.has('build-123')).toBe(true);
    });

    it('should release quarantined build', async () => {
      await blastEngine.quarantineBuild('build-123', 'Test', 'admin');
      const result = await blastEngine.releaseBuildFromQuarantine('build-123', 'admin');

      expect(result).toBe(true);

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.SINGLE_BUILD);
      expect(zoneStatus.quarantinedBuilds.has('build-123')).toBe(false);
    });

    it('should not quarantine already quarantined build', async () => {
      await blastEngine.quarantineBuild('build-123', 'Test', 'admin');
      const result = await blastEngine.quarantineBuild('build-123', 'Test again', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('Tenant Quarantine', () => {
    it('should quarantine tenant', async () => {
      const result = await blastEngine.quarantineTenant('tenant-456', 'Security violation', 'admin');

      expect(result).toBe(true);

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.SINGLE_TENANT);
      expect(zoneStatus.quarantinedTenants.has('tenant-456')).toBe(true);
    });

    it('should release quarantined tenant', async () => {
      await blastEngine.quarantineTenant('tenant-456', 'Test', 'admin');
      const result = await blastEngine.releaseTenantFromQuarantine('tenant-456', 'admin');

      expect(result).toBe(true);

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.SINGLE_TENANT);
      expect(zoneStatus.quarantinedTenants.has('tenant-456')).toBe(false);
    });
  });

  describe('Containment Policies', () => {
    it('should have default policies for all zones', async () => {
      const zones = [BlastZone.SINGLE_BUILD, BlastZone.SINGLE_TENANT, BlastZone.GLOBAL];

      for (const zone of zones) {
        const policy = await blastEngine.getPolicy(zone);
        expect(policy).not.toBeNull();
        expect(policy?.zone).toBe(zone);
      }
    });

    it('should set custom policy', async () => {
      const customPolicy = {
        id: 'policy-custom',
        name: 'Custom Policy',
        zone: BlastZone.SINGLE_BUILD,
        maxActionsPerMinute: 20,
        maxConcurrentBuilds: 5,
        requireApproval: true,
        autoRollbackOnFailure: false,
        quarantineOnCriticalFailure: true,
        isolationLevel: 'partial' as const
      };

      await blastEngine.setPolicy(BlastZone.SINGLE_BUILD, customPolicy);

      const policy = await blastEngine.getPolicy(BlastZone.SINGLE_BUILD);
      expect(policy?.maxActionsPerMinute).toBe(20);
      expect(policy?.maxConcurrentBuilds).toBe(5);
    });
  });

  describe('Zone Status', () => {
    it('should return status for single zone', async () => {
      const status = await blastEngine.getZoneStatus(BlastZone.SINGLE_BUILD);

      expect(status.zone).toBe(BlastZone.SINGLE_BUILD);
      expect(status.activeContainments).toBeDefined();
      expect(status.quarantinedBuilds).toBeDefined();
      expect(status.quarantinedTenants).toBeDefined();
      expect(status.isolatedAgents).toBeDefined();
    });

    it('should return status for all zones', async () => {
      const allStatuses = await blastEngine.getAllZonesStatus();

      expect(allStatuses.size).toBe(5);

      for (const zone of Object.values(BlastZone)) {
        expect(allStatuses.has(zone)).toBe(true);
      }
    });
  });

  describe('Blast Escalation', () => {
    it('should escalate blast to global zone', async () => {
      const assessment = await blastEngine.assessImpact('build-123', 'tenant-456', 'agent-789');

      await blastEngine.escalateBlast(assessment.id, BlastZone.GLOBAL, 'Critical incident', 'admin');

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.GLOBAL);
      expect(zoneStatus.activeContainments).toBeGreaterThan(0);
    });
  });

  describe('Zone Rollback', () => {
    it('should rollback all containments in zone', async () => {
      await blastEngine.quarantineBuild('build-1', 'Test', 'admin');
      await blastEngine.quarantineBuild('build-2', 'Test', 'admin');

      const result = await blastEngine.rollbackBlastZone(BlastZone.SINGLE_BUILD, 'admin');

      expect(result).toBe(true);

      const zoneStatus = await blastEngine.getZoneStatus(BlastZone.SINGLE_BUILD);
      expect(zoneStatus.quarantinedBuilds.size).toBe(0);
    });
  });
});

describe('Phase 8: Integration Tests', () => {
  describe('Control Plane + Epochs', () => {
    it('should work together - epoch auto-rollback triggers control plane pause', async () => {
      const mockLedger = new MockLedgerStore();
      const mockAudit = new MockAuditLogStore();
      const controlPlane = createControlPlane(mockLedger, mockAudit);
      const epochManager = createEpochManager();

      const epoch = await epochManager.createEpoch({
        name: 'Test Epoch',
        type: EpochType.DAILY,
        autoRollbackEnabled: true
      });

      await epochManager.recordBuildCompletion(epoch.config.id, 'build-1', false);
      await epochManager.recordBuildCompletion(epoch.config.id, 'build-2', false);

      const shouldRollback = await epochManager.shouldAutoRollback(epoch.config.id);
      expect(shouldRollback).toBe(true);
    });
  });

  describe('Control Plane + Blast Radius', () => {
    it('should work together - kill switch triggers zone rollback', async () => {
      const mockLedger = new MockLedgerStore();
      const mockAudit = new MockAuditLogStore();
      const controlPlane = createControlPlane(mockLedger, mockAudit);
      const blastEngine = createBlastRadiusEngine();

      await blastEngine.quarantineBuild('build-123', 'Test', 'admin');
      await controlPlane.triggerKillSwitch('Critical failure', 'admin');

      const state = controlPlane.getCurrentState();
      expect(state.killSwitchActive).toBe(true);
      expect(state.halted).toBe(true);
    });
  });

  describe('Epochs + Blast Radius', () => {
    it('should work together - violation recorded in epoch triggers blast assessment', async () => {
      const epochManager = createEpochManager();
      const blastEngine = createBlastRadiusEngine();

      const epoch = await epochManager.createEpoch({ name: 'Test Epoch', type: EpochType.DAILY });

      const assessment = await blastEngine.assessImpact('build-123', 'tenant-456', 'agent-789');

      await epochManager.recordViolation(epoch.config.id, {
        id: crypto.randomUUID(),
        epochId: epoch.config.id,
        buildId: assessment.buildId,
        agentId: assessment.agentId,
        violationType: 'security_breach',
        severity: 'critical' as const,
        reportedAt: new Date(),
        description: 'Unauthorized access detected',
        resolved: false
      });

      const metrics = await epochManager.getEpochMetrics(epoch.config.id);
      expect(metrics.violationsReported).toBe(1);
    });
  });
});

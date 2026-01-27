/**
 * OLYMPUS 2.0 - Blast Radius Engine
 * Phase 8.3: Impact Isolation & Containment
 * @version 1.0.0
 */

export enum BlastZone {
  SINGLE_BUILD = 'single_build',
  SINGLE_TENANT = 'single_tenant',
  SINGLE_AGENT = 'single_agent',
  TENANT_GROUP = 'tenant_group',
  GLOBAL = 'global'
}

export enum BlastSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ImpactAssessment {
  id: string;
  buildId: string;
  tenantId: string;
  agentId: string;
  estimatedZone: BlastZone;
  severity: BlastSeverity;
  affectedResources: string[];
  affectedAgents: string[];
  affectedTenants: string[];
  estimatedDuration: number;
  confidence: number;
  assessedAt: Date;
  assessedBy: string;
}

export interface ContainmentPolicy {
  id: string;
  name: string;
  zone: BlastZone;
  maxActionsPerMinute: number;
  maxConcurrentBuilds: number;
  requireApproval: boolean;
  autoRollbackOnFailure: boolean;
  quarantineOnCriticalFailure: boolean;
  isolationLevel: 'none' | 'partial' | 'full';
}

export interface ContainmentAction {
  id: string;
  assessmentId: string;
  action: 'ISOLATE' | 'QUARANTINE' | 'ROLLBACK' | 'ESCALATE';
  target: string;
  zone: BlastZone;
  triggeredAt: Date;
  triggeredBy: string;
  executed: boolean;
  executedAt?: Date;
  result?: string;
}

export interface BlastZoneStatus {
  zone: BlastZone;
  activeContainments: number;
  quarantinedBuilds: Set<string>;
  quarantinedTenants: Set<string>;
  isolatedAgents: Set<string>;
  lastIncident?: Date;
  containmentHistory: ContainmentAction[];
}

export interface IBlastRadiusEngine {
  assessImpact(buildId: string, tenantId: string, agentId: string): Promise<ImpactAssessment>;
  applyContainment(assessmentId: string, operator: string): Promise<ContainmentAction>;
  releaseContainment(containmentId: string, operator: string): Promise<boolean>;
  getZoneStatus(zone: BlastZone): Promise<BlastZoneStatus>;
  getAllZonesStatus(): Promise<Map<BlastZone, BlastZoneStatus>>;
  setPolicy(zone: BlastZone, policy: ContainmentPolicy): Promise<void>;
  getPolicy(zone: BlastZone): Promise<ContainmentPolicy | null>;
  escalateBlast(assessmentId: string, targetZone: BlastZone, reason: string, operator: string): Promise<void>;
  rollbackBlastZone(zone: BlastZone, operator: string): Promise<boolean>;
  quarantineBuild(buildId: string, reason: string, operator: string): Promise<boolean>;
  releaseBuildFromQuarantine(buildId: string, operator: string): Promise<boolean>;
  quarantineTenant(tenantId: string, reason: string, operator: string): Promise<boolean>;
  releaseTenantFromQuarantine(tenantId: string, operator: string): Promise<boolean>;
}

export class BlastRadiusEngine implements IBlastRadiusEngine {
  private assessments: Map<string, ImpactAssessment> = new Map();
  private policies: Map<BlastZone, ContainmentPolicy> = new Map();
  private zoneStatuses: Map<BlastZone, BlastZoneStatus> = new Map();
  private containmentHistory: ContainmentAction[] = [];
  private quarantinedBuilds: Set<string> = new Set();
  private quarantinedTenants: Set<string> = new Set();
  private isolatedAgents: Set<string> = new Set();

  constructor() {
    this.initializeDefaultPolicies();
    this.initializeZoneStatuses();
  }

  async assessImpact(buildId: string, tenantId: string, agentId: string): Promise<ImpactAssessment> {
    const assessment: ImpactAssessment = {
      id: crypto.randomUUID(),
      buildId,
      tenantId,
      agentId,
      estimatedZone: this.determineZone(buildId, tenantId, agentId),
      severity: BlastSeverity.MEDIUM,
      affectedResources: await this.analyzeAffectedResources(buildId, tenantId),
      affectedAgents: [agentId],
      affectedTenants: [tenantId],
      estimatedDuration: 0,
      confidence: 0.8,
      assessedAt: new Date(),
      assessedBy: 'system'
    };

    assessment.estimatedDuration = await this.estimateContainmentDuration(assessment);
    assessment.severity = this.determineSeverity(assessment);

    this.assessments.set(assessment.id, assessment);

    console.log(`[BlastRadiusEngine] Impact assessed for build ${buildId}: zone=${assessment.estimatedZone}, severity=${assessment.severity}`);

    return assessment;
  }

  async applyContainment(assessmentId: string, operator: string): Promise<ContainmentAction> {
    const assessment = this.assessments.get(assessmentId);

    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const policy = await this.getPolicy(assessment.estimatedZone);

    const actionType = this.determineContainmentAction(assessment, policy);

    const action: ContainmentAction = {
      id: crypto.randomUUID(),
      assessmentId,
      action: actionType,
      target: assessment.buildId,
      zone: assessment.estimatedZone,
      triggeredAt: new Date(),
      triggeredBy: operator,
      executed: false
    };

    await this.executeContainment(action, assessment);

    action.executed = true;
    action.executedAt = new Date();

    this.containmentHistory.push(action);
    this.updateZoneStatus(assessment.estimatedZone, action);

    return action;
  }

  async releaseContainment(containmentId: string, operator: string): Promise<boolean> {
    const action = this.containmentHistory.find(a => a.id === containmentId);

    if (!action) {
      return false;
    }

    if (action.zone === BlastZone.SINGLE_BUILD) {
      return await this.releaseBuildFromQuarantine(action.target, operator);
    } else if (action.zone === BlastZone.SINGLE_TENANT) {
      return await this.releaseTenantFromQuarantine(action.target, operator);
    }

    return true;
  }

  async getZoneStatus(zone: BlastZone): Promise<BlastZoneStatus> {
    return this.zoneStatuses.get(zone) || this.createEmptyZoneStatus(zone);
  }

  async getAllZonesStatus(): Promise<Map<BlastZone, BlastZoneStatus>> {
    const statusMap = new Map<BlastZone, BlastZoneStatus>();

    for (const zone of Object.values(BlastZone)) {
      statusMap.set(zone, await this.getZoneStatus(zone));
    }

    return statusMap;
  }

  async setPolicy(zone: BlastZone, policy: ContainmentPolicy): Promise<void> {
    this.policies.set(zone, policy);
    console.log(`[BlastRadiusEngine] Policy updated for zone ${zone}: ${policy.name}`);
  }

  async getPolicy(zone: BlastZone): Promise<ContainmentPolicy | null> {
    return this.policies.get(zone) || null;
  }

  async escalateBlast(assessmentId: string, targetZone: BlastZone, reason: string, operator: string): Promise<void> {
    const assessment = this.assessments.get(assessmentId);

    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    assessment.estimatedZone = targetZone;
    assessment.severity = BlastSeverity.CRITICAL;

    await this.applyContainment(assessmentId, operator);

    console.log(`[BlastRadiusEngine] Escalated blast ${assessmentId} to ${targetZone}: ${reason}`);
  }

  async rollbackBlastZone(zone: BlastZone, operator: string): Promise<boolean> {
    const status = await this.getZoneStatus(zone);

    for (const buildId of status.quarantinedBuilds) {
      await this.releaseBuildFromQuarantine(buildId, operator);
    }

    for (const tenantId of status.quarantinedTenants) {
      await this.releaseTenantFromQuarantine(tenantId, operator);
    }

    console.log(`[BlastRadiusEngine] Rolled back blast zone ${zone}`);

    return true;
  }

  async quarantineBuild(buildId: string, reason: string, operator: string): Promise<boolean> {
    if (this.quarantinedBuilds.has(buildId)) {
      return false;
    }

    this.quarantinedBuilds.add(buildId);

    const singleBuildStatus = this.zoneStatuses.get(BlastZone.SINGLE_BUILD);
    if (singleBuildStatus) {
      singleBuildStatus.quarantinedBuilds.add(buildId);
      singleBuildStatus.lastIncident = new Date();
    }

    console.log(`[BlastRadiusEngine] Quarantined build ${buildId}: ${reason}`);

    return true;
  }

  async releaseBuildFromQuarantine(buildId: string, operator: string): Promise<boolean> {
    if (!this.quarantinedBuilds.has(buildId)) {
      return false;
    }

    this.quarantinedBuilds.delete(buildId);

    const singleBuildStatus = this.zoneStatuses.get(BlastZone.SINGLE_BUILD);
    if (singleBuildStatus) {
      singleBuildStatus.quarantinedBuilds.delete(buildId);
    }

    console.log(`[BlastRadiusEngine] Released build ${buildId} from quarantine`);

    return true;
  }

  async quarantineTenant(tenantId: string, reason: string, operator: string): Promise<boolean> {
    if (this.quarantinedTenants.has(tenantId)) {
      return false;
    }

    this.quarantinedTenants.add(tenantId);

    const singleTenantStatus = this.zoneStatuses.get(BlastZone.SINGLE_TENANT);
    if (singleTenantStatus) {
      singleTenantStatus.quarantinedTenants.add(tenantId);
      singleTenantStatus.lastIncident = new Date();
    }

    console.log(`[BlastRadiusEngine] Quarantined tenant ${tenantId}: ${reason}`);

    return true;
  }

  async releaseTenantFromQuarantine(tenantId: string, operator: string): Promise<boolean> {
    if (!this.quarantinedTenants.has(tenantId)) {
      return false;
    }

    this.quarantinedTenants.delete(tenantId);

    const singleTenantStatus = this.zoneStatuses.get(BlastZone.SINGLE_TENANT);
    if (singleTenantStatus) {
      singleTenantStatus.quarantinedTenants.delete(tenantId);
    }

    console.log(`[BlastRadiusEngine] Released tenant ${tenantId} from quarantine`);

    return true;
  }

  private initializeDefaultPolicies(): void {
    this.policies.set(BlastZone.SINGLE_BUILD, {
      id: 'policy-single-build',
      name: 'Single Build Containment',
      zone: BlastZone.SINGLE_BUILD,
      maxActionsPerMinute: 10,
      maxConcurrentBuilds: 1,
      requireApproval: false,
      autoRollbackOnFailure: true,
      quarantineOnCriticalFailure: true,
      isolationLevel: 'partial'
    });

    this.policies.set(BlastZone.SINGLE_TENANT, {
      id: 'policy-single-tenant',
      name: 'Single Tenant Containment',
      zone: BlastZone.SINGLE_TENANT,
      maxActionsPerMinute: 5,
      maxConcurrentBuilds: 5,
      requireApproval: true,
      autoRollbackOnFailure: true,
      quarantineOnCriticalFailure: true,
      isolationLevel: 'full'
    });

    this.policies.set(BlastZone.GLOBAL, {
      id: 'policy-global',
      name: 'Global Emergency Containment',
      zone: BlastZone.GLOBAL,
      maxActionsPerMinute: 1,
      maxConcurrentBuilds: 0,
      requireApproval: true,
      autoRollbackOnFailure: true,
      quarantineOnCriticalFailure: true,
      isolationLevel: 'full'
    });
  }

  private initializeZoneStatuses(): void {
    for (const zone of Object.values(BlastZone)) {
      this.zoneStatuses.set(zone, this.createEmptyZoneStatus(zone));
    }
  }

  private createEmptyZoneStatus(zone: BlastZone): BlastZoneStatus {
    return {
      zone,
      activeContainments: 0,
      quarantinedBuilds: new Set(),
      quarantinedTenants: new Set(),
      isolatedAgents: new Set(),
      containmentHistory: []
    };
  }

  private determineZone(buildId: string, tenantId: string, agentId: string): BlastZone {
    if (this.quarantinedTenants.has(tenantId)) {
      return BlastZone.GLOBAL;
    }

    if (this.quarantinedBuilds.has(buildId)) {
      return BlastZone.SINGLE_BUILD;
    }

    return BlastZone.SINGLE_BUILD;
  }

  private async analyzeAffectedResources(buildId: string, tenantId: string): Promise<string[]> {
    return [
      `build:${buildId}`,
      `tenant:${tenantId}`,
      `storage:${tenantId}`,
      `cache:${tenantId}`
    ];
  }

  private determineSeverity(assessment: ImpactAssessment): BlastSeverity {
    if (assessment.estimatedZone === BlastZone.GLOBAL) {
      return BlastSeverity.CRITICAL;
    }

    if (assessment.estimatedZone === BlastZone.TENANT_GROUP) {
      return BlastSeverity.HIGH;
    }

    if (assessment.affectedResources.length > 10) {
      return BlastSeverity.HIGH;
    }

    return BlastSeverity.MEDIUM;
  }

  private async estimateContainmentDuration(assessment: ImpactAssessment): Promise<number> {
    switch (assessment.estimatedZone) {
      case BlastZone.SINGLE_BUILD:
        return 5 * 60 * 1000;
      case BlastZone.SINGLE_TENANT:
        return 30 * 60 * 1000;
      case BlastZone.TENANT_GROUP:
        return 60 * 60 * 1000;
      case BlastZone.GLOBAL:
        return 120 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }

  private determineContainmentAction(assessment: ImpactAssessment, policy: ContainmentPolicy | null): 'ISOLATE' | 'QUARANTINE' | 'ROLLBACK' | 'ESCALATE' {
    if (assessment.severity === BlastSeverity.CRITICAL) {
      return 'ESCALATE';
    }

    if (policy?.quarantineOnCriticalFailure && assessment.severity === BlastSeverity.HIGH) {
      return 'QUARANTINE';
    }

    if (policy?.isolationLevel === 'full') {
      return 'ISOLATE';
    }

    return 'QUARANTINE';
  }

  private async executeContainment(action: ContainmentAction, assessment: ImpactAssessment): Promise<void> {
    switch (action.action) {
      case 'ISOLATE':
        this.isolatedAgents.add(assessment.agentId);
        break;
      case 'QUARANTINE':
        if (action.zone === BlastZone.SINGLE_BUILD) {
          await this.quarantineBuild(action.target, 'Containment action', action.triggeredBy);
        } else if (action.zone === BlastZone.SINGLE_TENANT) {
          await this.quarantineTenant(action.target, 'Containment action', action.triggeredBy);
        }
        break;
      case 'ROLLBACK':
        await this.rollbackBlastZone(action.zone, action.triggeredBy);
        break;
      case 'ESCALATE':
        await this.escalateBlast(assessment.id, BlastZone.GLOBAL, 'Automatic escalation due to critical severity', action.triggeredBy);
        break;
    }
  }

  private updateZoneStatus(zone: BlastZone, action: ContainmentAction): void {
    const status = this.zoneStatuses.get(zone);

    if (status) {
      status.activeContainments++;
      status.containmentHistory.push(action);
      status.lastIncident = action.triggeredAt;
    }
  }
}

export function createBlastRadiusEngine(): IBlastRadiusEngine {
  return new BlastRadiusEngine();
}

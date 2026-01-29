/**
 * OLYMPUS Contract Audit Types
 *
 * Type definitions for the production audit integration.
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AuditTriggerConfig {
  /** When to trigger audits */
  triggerOn: 'phase-complete' | 'build-complete' | 'checkpoint-save';

  /** If true, halt pipeline on critical findings */
  blockOnCritical: boolean;

  /** If true, halt pipeline on high findings */
  blockOnHigh: boolean;

  /** Where to save audit reports */
  reportPath: string;

  /** What severity levels trigger notifications */
  notifyOn: ('critical' | 'high' | 'medium')[];

  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Paths to exclude from audit */
  excludePaths?: string[];

  /** Rule IDs to exclude */
  excludeRules?: string[];
}

export interface AuditProductionConfig {
  /** Enable/disable audit system */
  enabled: boolean;

  /** Trigger configuration */
  triggerOn: 'phase-complete' | 'build-complete' | 'checkpoint-save';

  /** Blocking configuration */
  blocking: {
    critical: boolean;
    high: boolean;
    medium: boolean;
  };

  /** Reporting configuration */
  reporting: {
    savePath: string;
    format: ('json' | 'html' | 'markdown')[];
    retentionDays: number;
  };

  /** Notification configuration */
  notifications: {
    enabled: boolean;
    channels: ('console' | 'file' | 'webhook' | 'slack')[];
    triggerOn: ('critical' | 'high' | 'medium')[];
    webhookUrl?: string;
  };

  /** Exclusions */
  exclusions: {
    paths: string[];
    rules: string[];
    agents: string[];
  };

  /** Performance settings */
  performance: {
    timeout: number;
    maxFindings: number;
    parallelPhases: boolean;
  };
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'taint_flow' | 'attack_pattern' | 'semantic_attack' | 'security_violation' | 'contract_violation';
  title: string;
  location: string;
  description: string;
  evidence?: string;
  cwe?: string;
  recommendation?: string;
  potentialFP?: boolean;
  fpReason?: string;
}

export interface AuditResult {
  version: string;
  buildId: string;
  timestamp: string;
  summary: {
    passed: boolean;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    totalViolations: number;
  };
  paranoid?: {
    riskScore: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    taintFlows: Array<{
      taintSource: string;
      sourceAgent: string;
      sinkType: string;
      sinkAgent: string;
      path: string[];
      severity: 'critical' | 'high' | 'medium';
      recommendation: string;
      cwe: string;
    }>;
    attacksDetected: Array<{
      pattern?: {
        name: string;
        severity: 'critical' | 'high' | 'medium';
        description: string;
        cwe: string;
      };
      location: string;
      evidence: string;
    }>;
    semanticDetections: Array<{
      signatureId: string;
      signatureName: string;
      category: string;
      canonicalIntent: string;
      confidence: number;
      severity: 'critical' | 'high' | 'medium';
      cwe: string;
      location: string;
      evidence: string;
    }>;
    crossAgentVulns: Array<{
      sourceAgent: string;
      sinkAgent: string;
      vulnerability: string;
      severity: 'critical' | 'high' | 'medium';
    }>;
  };
  security?: {
    passed: boolean;
    violations: Array<{
      type: string;
      name: string;
      location: string;
      value: string;
      suggestion: string;
    }>;
  };
  contracts?: {
    results: Array<{
      contract: string;
      violations: number;
      status: 'pass' | 'fail' | 'critical';
    }>;
  };
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface AuditEvent {
  type: 'audit_started' | 'audit_completed' | 'audit_failed' | 'finding_detected' | 'build_blocked';
  timestamp: Date;
  buildId: string;
  phaseId?: string;
  data: Record<string, unknown>;
}

export type AuditEventHandler = (event: AuditEvent) => void | Promise<void>;

// ============================================================================
// HISTORY TYPES
// ============================================================================

export interface AuditHistoryEntry {
  id: string;
  projectId: string;
  buildId: string;
  timestamp: Date;
  duration: number;
  findings: AuditFinding[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
  };
  blocked: boolean;
  config: Partial<AuditTriggerConfig>;
}

export interface RecurringPattern {
  patternId: string;
  type: string;
  title: string;
  occurrences: number;
  lastSeen: Date;
  firstSeen: Date;
  affectedPhases: string[];
  suggestedFix?: string;
}

export interface PredictedRisk {
  riskId: string;
  confidence: number;
  type: string;
  description: string;
  basedOn: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AuditBlockError extends Error {
  constructor(
    message: string,
    public readonly reportPath: string,
    public readonly findings: AuditFinding[] = [],
    public readonly criticalCount: number = 0,
    public readonly highCount: number = 0
  ) {
    super(message);
    this.name = 'AuditBlockError';
  }
}

export class AuditExecutionError extends Error {
  constructor(
    message: string,
    public readonly phase: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AuditExecutionError';
  }
}

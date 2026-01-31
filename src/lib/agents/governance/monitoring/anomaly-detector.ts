/**
 * OLYMPUS 2.1 - Governance Anomaly Detection
 *
 * SECURITY FIX: Cluster #4 Hardening - Behavioral Analysis
 * Detects unusual patterns in governance decisions:
 * - Excessive suppressions
 * - Permission escalations
 * - Rapid state changes
 * - Unusual agent behavior
 *
 * @version 1.0.0
 */

import { logger } from '@/utils/logger';
import { BoundedCache } from '@/lib/utils/bounded-cache';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Governance event for tracking
 */
export interface GovernanceEvent {
  type: GovernanceEventType;
  agentId: string;
  buildId?: string;
  tenantId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type GovernanceEventType =
  | 'SUPPRESSION'
  | 'PERMISSION_ESCALATION'
  | 'STATE_CHANGE'
  | 'MODE_CHANGE'
  | 'POLICY_VIOLATION'
  | 'REMEDIATION'
  | 'KILL_SWITCH'
  | 'AGENT_REGISTRATION'
  | 'BUILD_LOCK'
  | 'BUILD_UNLOCK';

/**
 * Anomaly severity levels
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detected anomaly
 */
export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  detectedAt: Date;
  description: string;
  affectedEntity: string;
  eventCount: number;
  threshold: number;
  events: GovernanceEvent[];
  recommendation: string;
}

export type AnomalyType =
  | 'EXCESSIVE_SUPPRESSIONS'
  | 'RAPID_ESCALATIONS'
  | 'STATE_THRASHING'
  | 'UNUSUAL_AGENT_ACTIVITY'
  | 'KILL_SWITCH_ABUSE'
  | 'MASS_VIOLATIONS'
  | 'RAPID_MODE_CHANGES'
  | 'SUSPICIOUS_REGISTRATION';

/**
 * Detection rule configuration
 */
export interface DetectionRule {
  type: AnomalyType;
  eventType: GovernanceEventType | GovernanceEventType[];
  threshold: number;
  windowMs: number;
  severity: AnomalySeverity;
  description: string;
  recommendation: string;
}

/**
 * Anomaly callback
 */
export type AnomalyCallback = (anomaly: Anomaly) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT DETECTION RULES
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_DETECTION_RULES: DetectionRule[] = [
  // Excessive suppressions in short time
  {
    type: 'EXCESSIVE_SUPPRESSIONS',
    eventType: 'SUPPRESSION',
    threshold: 10,
    windowMs: 5 * 60 * 1000, // 10+ suppressions in 5 minutes
    severity: 'high',
    description: 'Unusual number of policy suppressions detected',
    recommendation: 'Review suppression reasons and verify operator authorization',
  },

  // Rapid permission escalations
  {
    type: 'RAPID_ESCALATIONS',
    eventType: 'PERMISSION_ESCALATION',
    threshold: 5,
    windowMs: 10 * 60 * 1000, // 5+ escalations in 10 minutes
    severity: 'critical',
    description: 'Multiple permission escalations in short time',
    recommendation: 'Immediately audit permission changes and verify legitimacy',
  },

  // State thrashing (rapid back-and-forth)
  {
    type: 'STATE_THRASHING',
    eventType: 'STATE_CHANGE',
    threshold: 20,
    windowMs: 5 * 60 * 1000, // 20+ state changes in 5 minutes
    severity: 'medium',
    description: 'Excessive state changes detected (possible thrashing)',
    recommendation: 'Check for loops or conflicting automation',
  },

  // Kill switch abuse
  {
    type: 'KILL_SWITCH_ABUSE',
    eventType: 'KILL_SWITCH',
    threshold: 3,
    windowMs: 60 * 60 * 1000, // 3+ kill switches in 1 hour
    severity: 'critical',
    description: 'Multiple kill switch activations detected',
    recommendation: 'Investigate system stability and operator actions',
  },

  // Mass policy violations
  {
    type: 'MASS_VIOLATIONS',
    eventType: 'POLICY_VIOLATION',
    threshold: 50,
    windowMs: 5 * 60 * 1000, // 50+ violations in 5 minutes
    severity: 'high',
    description: 'Mass policy violations detected (possible attack)',
    recommendation: 'Consider enabling kill switch and investigating source',
  },

  // Rapid mode changes
  {
    type: 'RAPID_MODE_CHANGES',
    eventType: 'MODE_CHANGE',
    threshold: 5,
    windowMs: 30 * 60 * 1000, // 5+ mode changes in 30 minutes
    severity: 'medium',
    description: 'Frequent governance mode changes',
    recommendation: 'Review mode change reasons and stabilize configuration',
  },

  // Suspicious agent registration
  {
    type: 'SUSPICIOUS_REGISTRATION',
    eventType: 'AGENT_REGISTRATION',
    threshold: 10,
    windowMs: 60 * 60 * 1000, // 10+ registrations in 1 hour
    severity: 'high',
    description: 'Unusual number of agent registrations',
    recommendation: 'Verify agent identities and review registration source',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class AnomalyDetector {
  private rules: DetectionRule[];
  private callbacks: AnomalyCallback[] = [];
  private anomalyCount: number = 0;

  // Event windows per entity (agentId or tenantId)
  private eventWindows: BoundedCache<string, GovernanceEvent[]>;

  // Recently detected anomalies (to prevent duplicate alerts)
  private recentAnomalies: BoundedCache<string, Anomaly>;

  constructor(rules: DetectionRule[] = DEFAULT_DETECTION_RULES) {
    this.rules = rules;

    // Initialize caches with reasonable limits
    this.eventWindows = new BoundedCache<string, GovernanceEvent[]>({
      maxSize: 1000,
      ttlMs: 60 * 60 * 1000, // 1 hour
      cleanupIntervalMs: 5 * 60 * 1000,
    });

    this.recentAnomalies = new BoundedCache<string, Anomaly>({
      maxSize: 500,
      ttlMs: 30 * 60 * 1000, // 30 minutes (cooldown for duplicate alerts)
      cleanupIntervalMs: 5 * 60 * 1000,
    });

    logger.info('[AnomalyDetector] Initialized', { ruleCount: this.rules.length });
  }

  /**
   * Register callback for anomaly alerts
   */
  onAnomalyDetected(callback: AnomalyCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Record a governance event for analysis
   */
  recordEvent(event: GovernanceEvent): Anomaly[] {
    const entityKey = event.tenantId || event.agentId || 'global';
    const eventTypeKey = `${entityKey}:${event.type}`;

    // Get or create event window for this entity/type
    let events = this.eventWindows.get(eventTypeKey) ?? [];

    // Add new event
    events.push(event);

    // Clean old events outside all rule windows
    const maxWindow = Math.max(...this.rules.map(r => r.windowMs));
    const cutoff = Date.now() - maxWindow;
    events = events.filter(e => e.timestamp > cutoff);

    // Store updated window
    this.eventWindows.set(eventTypeKey, events);

    // Check for anomalies
    return this.checkRules(events, event);
  }

  /**
   * Check all rules against current events
   */
  private checkRules(events: GovernanceEvent[], triggerEvent: GovernanceEvent): Anomaly[] {
    const detected: Anomaly[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      // Check if rule applies to this event type
      const eventTypes = Array.isArray(rule.eventType) ? rule.eventType : [rule.eventType];
      if (!eventTypes.includes(triggerEvent.type)) continue;

      // Filter events within rule window
      const windowStart = now - rule.windowMs;
      const windowEvents = events.filter(e => e.timestamp >= windowStart);

      // Check threshold
      if (windowEvents.length >= rule.threshold) {
        const anomalyKey = `${rule.type}:${triggerEvent.agentId || triggerEvent.tenantId}`;

        // Skip if recently alerted
        if (this.recentAnomalies.has(anomalyKey)) continue;

        // Create anomaly
        const anomaly = this.createAnomaly(rule, windowEvents, triggerEvent);
        detected.push(anomaly);

        // Record to prevent duplicate alerts
        this.recentAnomalies.set(anomalyKey, anomaly);

        // Notify callbacks
        this.notifyCallbacks(anomaly);
      }
    }

    return detected;
  }

  /**
   * Create anomaly object
   */
  private createAnomaly(
    rule: DetectionRule,
    events: GovernanceEvent[],
    triggerEvent: GovernanceEvent
  ): Anomaly {
    this.anomalyCount++;

    const anomaly: Anomaly = {
      id: `anomaly-${Date.now()}-${this.anomalyCount}`,
      type: rule.type,
      severity: rule.severity,
      detectedAt: new Date(),
      description: rule.description,
      affectedEntity: triggerEvent.tenantId || triggerEvent.agentId || 'unknown',
      eventCount: events.length,
      threshold: rule.threshold,
      events: events.slice(-10), // Keep last 10 for context
      recommendation: rule.recommendation,
    };

    logger.warn('[AnomalyDetector] Anomaly detected', {
      type: anomaly.type,
      severity: anomaly.severity,
      entity: anomaly.affectedEntity,
      eventCount: anomaly.eventCount,
      threshold: anomaly.threshold,
    });

    return anomaly;
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(anomaly: Anomaly): void {
    for (const callback of this.callbacks) {
      try {
        callback(anomaly);
      } catch (error) {
        logger.error('[AnomalyDetector] Callback error', { error });
      }
    }
  }

  /**
   * Get detection statistics
   */
  getStats(): {
    totalAnomalies: number;
    trackedEntities: number;
    activeRules: number;
  } {
    return {
      totalAnomalies: this.anomalyCount,
      trackedEntities: this.eventWindows.size,
      activeRules: this.rules.length,
    };
  }

  /**
   * Clear all tracked events and anomalies
   */
  reset(): void {
    this.eventWindows.clear();
    this.recentAnomalies.clear();
    this.anomalyCount = 0;
    logger.info('[AnomalyDetector] Reset complete');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.eventWindows.destroy();
    this.recentAnomalies.destroy();
    this.callbacks = [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT BEHAVIOR ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Agent behavior profile
 */
export interface AgentBehaviorProfile {
  agentId: string;
  firstSeen: Date;
  lastSeen: Date;
  eventCounts: Record<GovernanceEventType, number>;
  averageEventsPerHour: number;
  suspicionScore: number;
}

/**
 * Analyzes individual agent behavior patterns
 */
export class AgentBehaviorAnalyzer {
  private profiles: BoundedCache<string, AgentBehaviorProfile>;
  private baselineWindow = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.profiles = new BoundedCache<string, AgentBehaviorProfile>({
      maxSize: 500,
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupIntervalMs: 60 * 60 * 1000,
    });
  }

  /**
   * Update agent profile with new event
   */
  recordEvent(event: GovernanceEvent): AgentBehaviorProfile {
    const profile = this.profiles.get(event.agentId) ?? this.createProfile(event.agentId);

    // Update event counts
    profile.eventCounts[event.type] = (profile.eventCounts[event.type] || 0) + 1;
    profile.lastSeen = new Date();

    // Recalculate average and suspicion
    const hoursSinceFirst =
      Math.max(1, Date.now() - profile.firstSeen.getTime()) / (60 * 60 * 1000);
    const totalEvents = Object.values(profile.eventCounts).reduce((a, b) => a + b, 0);
    profile.averageEventsPerHour = totalEvents / hoursSinceFirst;

    // Calculate suspicion score based on event types
    profile.suspicionScore = this.calculateSuspicionScore(profile);

    this.profiles.set(event.agentId, profile);
    return profile;
  }

  /**
   * Get agent profile
   */
  getProfile(agentId: string): AgentBehaviorProfile | null {
    return this.profiles.get(agentId) ?? null;
  }

  /**
   * Get all suspicious agents (suspicionScore > threshold)
   */
  getSuspiciousAgents(threshold: number = 0.7): AgentBehaviorProfile[] {
    const suspicious: AgentBehaviorProfile[] = [];

    for (const key of this.profiles.keys()) {
      const profile = this.profiles.get(key);
      if (profile && profile.suspicionScore > threshold) {
        suspicious.push(profile);
      }
    }

    return suspicious.sort((a, b) => b.suspicionScore - a.suspicionScore);
  }

  /**
   * Create new agent profile
   */
  private createProfile(agentId: string): AgentBehaviorProfile {
    return {
      agentId,
      firstSeen: new Date(),
      lastSeen: new Date(),
      eventCounts: {} as Record<GovernanceEventType, number>,
      averageEventsPerHour: 0,
      suspicionScore: 0,
    };
  }

  /**
   * Calculate suspicion score (0-1)
   */
  private calculateSuspicionScore(profile: AgentBehaviorProfile): number {
    let score = 0;
    const weights: Partial<Record<GovernanceEventType, number>> = {
      KILL_SWITCH: 0.5,
      PERMISSION_ESCALATION: 0.3,
      SUPPRESSION: 0.2,
      POLICY_VIOLATION: 0.15,
      MODE_CHANGE: 0.1,
    };

    for (const [eventType, weight] of Object.entries(weights)) {
      const count = profile.eventCounts[eventType as GovernanceEventType] || 0;
      score += Math.min(count / 10, 1) * weight;
    }

    // High activity rate adds to suspicion
    if (profile.averageEventsPerHour > 100) {
      score += 0.2;
    } else if (profile.averageEventsPerHour > 50) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.profiles.destroy();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ═══════════════════════════════════════════════════════════════════════════════

let defaultDetector: AnomalyDetector | null = null;
let defaultAnalyzer: AgentBehaviorAnalyzer | null = null;

/**
 * Get default anomaly detector
 */
export function getAnomalyDetector(): AnomalyDetector {
  if (!defaultDetector) {
    defaultDetector = new AnomalyDetector();
  }
  return defaultDetector;
}

/**
 * Get default behavior analyzer
 */
export function getBehaviorAnalyzer(): AgentBehaviorAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new AgentBehaviorAnalyzer();
  }
  return defaultAnalyzer;
}

/**
 * Record governance event with both detection and analysis
 */
export function recordGovernanceEvent(event: GovernanceEvent): {
  anomalies: Anomaly[];
  profile: AgentBehaviorProfile;
} {
  const anomalies = getAnomalyDetector().recordEvent(event);
  const profile = getBehaviorAnalyzer().recordEvent(event);

  return { anomalies, profile };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default AnomalyDetector;

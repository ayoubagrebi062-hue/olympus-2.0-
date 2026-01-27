/**
 * OLYMPUS 2.0 - Alert Configuration
 * Defines alerting rules and thresholds for monitoring
 */

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'email' | 'slack' | 'pagerduty' | 'webhook';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window: number; // seconds
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  cooldown: number; // seconds between alerts
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

// ============================================================================
// ALERT RULES
// ============================================================================

export const alertRules: AlertRule[] = [
  // Error Rate Alerts
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5% of requests',
    metric: 'error_rate_percent',
    condition: 'gt',
    threshold: 5,
    window: 300, // 5 minutes
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
    cooldown: 900, // 15 minutes
  },
  {
    id: 'elevated_error_rate',
    name: 'Elevated Error Rate',
    description: 'Error rate exceeds 1% of requests',
    metric: 'error_rate_percent',
    condition: 'gt',
    threshold: 1,
    window: 300,
    severity: 'warning',
    channels: ['slack'],
    enabled: true,
    cooldown: 1800,
  },

  // Latency Alerts
  {
    id: 'high_latency_p95',
    name: 'High API Latency (P95)',
    description: 'P95 API response time exceeds 2 seconds',
    metric: 'api_latency_p95_ms',
    condition: 'gt',
    threshold: 2000,
    window: 300,
    severity: 'warning',
    channels: ['slack'],
    enabled: true,
    cooldown: 900,
  },
  {
    id: 'critical_latency_p99',
    name: 'Critical API Latency (P99)',
    description: 'P99 API response time exceeds 5 seconds',
    metric: 'api_latency_p99_ms',
    condition: 'gt',
    threshold: 5000,
    window: 300,
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
    cooldown: 600,
  },

  // Build Alerts
  {
    id: 'build_failure_rate',
    name: 'High Build Failure Rate',
    description: 'Build failure rate exceeds 20%',
    metric: 'build_failure_rate_percent',
    condition: 'gt',
    threshold: 20,
    window: 3600, // 1 hour
    severity: 'warning',
    channels: ['slack', 'email'],
    enabled: true,
    cooldown: 3600,
  },
  {
    id: 'build_queue_depth',
    name: 'Build Queue Backlog',
    description: 'More than 50 builds queued',
    metric: 'build_queue_depth',
    condition: 'gt',
    threshold: 50,
    window: 60,
    severity: 'warning',
    channels: ['slack'],
    enabled: true,
    cooldown: 600,
  },

  // Database Alerts
  {
    id: 'db_connection_errors',
    name: 'Database Connection Errors',
    description: 'Database connection errors detected',
    metric: 'db_connection_errors',
    condition: 'gt',
    threshold: 5,
    window: 60,
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
    cooldown: 300,
  },
  {
    id: 'db_query_slow',
    name: 'Slow Database Queries',
    description: 'Average query time exceeds 500ms',
    metric: 'db_query_avg_ms',
    condition: 'gt',
    threshold: 500,
    window: 300,
    severity: 'warning',
    channels: ['slack'],
    enabled: true,
    cooldown: 900,
  },

  // Infrastructure Alerts
  {
    id: 'memory_usage_high',
    name: 'High Memory Usage',
    description: 'Memory usage exceeds 85%',
    metric: 'memory_usage_percent',
    condition: 'gt',
    threshold: 85,
    window: 300,
    severity: 'warning',
    channels: ['slack'],
    enabled: true,
    cooldown: 600,
  },
  {
    id: 'cpu_usage_critical',
    name: 'Critical CPU Usage',
    description: 'CPU usage exceeds 95%',
    metric: 'cpu_usage_percent',
    condition: 'gt',
    threshold: 95,
    window: 120,
    severity: 'critical',
    channels: ['slack', 'pagerduty'],
    enabled: true,
    cooldown: 300,
  },

  // Business Alerts
  {
    id: 'payment_failures',
    name: 'Payment Processing Failures',
    description: 'Payment failure rate exceeds 2%',
    metric: 'payment_failure_rate_percent',
    condition: 'gt',
    threshold: 2,
    window: 3600,
    severity: 'critical',
    channels: ['slack', 'pagerduty', 'email'],
    enabled: true,
    cooldown: 1800,
  },
  {
    id: 'signup_drop',
    name: 'Signup Rate Drop',
    description: 'Signup rate dropped below expected threshold',
    metric: 'signups_per_hour',
    condition: 'lt',
    threshold: 5,
    window: 3600,
    severity: 'info',
    channels: ['slack'],
    enabled: true,
    cooldown: 7200,
  },
];

// ============================================================================
// ALERT STATE
// ============================================================================

const activeAlerts: Map<string, Alert> = new Map();
const alertCooldowns: Map<string, number> = new Map();

// ============================================================================
// ALERT FUNCTIONS
// ============================================================================

/**
 * Check if alert should fire
 */
export function shouldAlert(rule: AlertRule, value: number): boolean {
  switch (rule.condition) {
    case 'gt':
      return value > rule.threshold;
    case 'lt':
      return value < rule.threshold;
    case 'eq':
      return value === rule.threshold;
    case 'gte':
      return value >= rule.threshold;
    case 'lte':
      return value <= rule.threshold;
    default:
      return false;
  }
}

/**
 * Check if alert is in cooldown period
 */
export function isInCooldown(ruleId: string): boolean {
  const cooldownEnd = alertCooldowns.get(ruleId);
  if (!cooldownEnd) return false;
  return Date.now() < cooldownEnd;
}

/**
 * Evaluate an alert rule against current metrics
 */
export function evaluateAlertRule(
  rule: AlertRule,
  currentValue: number
): Alert | null {
  if (!rule.enabled) return null;
  if (isInCooldown(rule.id)) return null;
  if (!shouldAlert(rule, currentValue)) return null;

  const alert: Alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `${rule.name}: ${rule.description}. Current value: ${currentValue}, Threshold: ${rule.threshold}`,
    value: currentValue,
    threshold: rule.threshold,
    timestamp: new Date(),
    acknowledged: false,
  };

  // Set cooldown
  alertCooldowns.set(rule.id, Date.now() + rule.cooldown * 1000);

  // Store active alert
  activeAlerts.set(alert.id, alert);

  return alert;
}

/**
 * Send alert to configured channels
 */
export async function sendAlert(
  alert: Alert,
  channels: AlertChannel[]
): Promise<void> {
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'slack':
          await sendSlackAlert(alert);
          break;
        case 'email':
          await sendEmailAlert(alert);
          break;
        case 'pagerduty':
          await sendPagerDutyAlert(alert);
          break;
        case 'webhook':
          await sendWebhookAlert(alert);
          break;
      }
    } catch (error) {
      console.error(`[alerts] Failed to send ${channel} alert:`, error);
    }
  }
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(alert: Alert): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color =
    alert.severity === 'critical'
      ? '#dc2626'
      : alert.severity === 'warning'
      ? '#f59e0b'
      : '#3b82f6';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
          text: alert.message,
          fields: [
            { title: 'Current Value', value: String(alert.value), short: true },
            { title: 'Threshold', value: String(alert.threshold), short: true },
          ],
          footer: 'OLYMPUS Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    }),
  });
}

/**
 * Send email alert (placeholder)
 */
async function sendEmailAlert(alert: Alert): Promise<void> {
  // Implement email sending via Resend/SendGrid
  console.log('[alerts] Email alert:', alert.message);
}

/**
 * Send PagerDuty alert (placeholder)
 */
async function sendPagerDutyAlert(alert: Alert): Promise<void> {
  const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
  if (!routingKey) return;

  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: routingKey,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        severity: alert.severity === 'critical' ? 'critical' : 'warning',
        source: 'OLYMPUS',
        timestamp: alert.timestamp.toISOString(),
        custom_details: {
          rule_id: alert.ruleId,
          value: alert.value,
          threshold: alert.threshold,
        },
      },
    }),
  });
}

/**
 * Send webhook alert (placeholder)
 */
async function sendWebhookAlert(alert: Alert): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
}

/**
 * Get all active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values());
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId);
  if (!alert) return false;

  alert.acknowledged = true;
  return true;
}

/**
 * Clear resolved alerts
 */
export function clearResolvedAlerts(): void {
  for (const [id, alert] of activeAlerts.entries()) {
    if (alert.acknowledged) {
      activeAlerts.delete(id);
    }
  }
}

/**
 * Get alert rules
 */
export function getAlertRules(): AlertRule[] {
  return [...alertRules];
}

/**
 * Update alert rule
 */
export function updateAlertRule(
  ruleId: string,
  updates: Partial<AlertRule>
): boolean {
  const ruleIndex = alertRules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) return false;

  alertRules[ruleIndex] = { ...alertRules[ruleIndex], ...updates };
  return true;
}

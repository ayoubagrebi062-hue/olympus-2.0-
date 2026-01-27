/**
 * OLYMPUS 3.0 - Usage Tracking Types
 *
 * Type definitions for usage tracking and cost monitoring.
 *
 * @version 3.0.0
 */

// ============================================================================
// USAGE DATA
// ============================================================================

export interface CurrentUsage {
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  monthlyTokens: number;
  buildsToday: number;
}

export interface UsageRecord {
  tenantId: string;
  userId: string;
  buildId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export interface UsageSummary {
  tenantId: string;
  period: 'hour' | 'day' | 'month';
  totalCost: number;
  totalTokens: number;
  buildCount: number;
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// TTL CONSTANTS (in seconds)
// ============================================================================

export const USAGE_TTL = {
  HOURLY: 3600,        // 1 hour
  DAILY: 86400,        // 24 hours
  MONTHLY: 2678400,    // 31 days
} as const;

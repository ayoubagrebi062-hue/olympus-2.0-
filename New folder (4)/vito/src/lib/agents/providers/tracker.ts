/**
 * OLYMPUS 2.0 - Token Usage Tracker
 */

import type { TokenUsage, AIModel } from './types';
import { MODEL_CAPABILITIES } from './types';

/** Usage record per agent */
export interface AgentUsageRecord {
  agentId: string;
  model: AIModel;
  usage: TokenUsage;
  cost: number;
  timestamp: Date;
  requestId: string;
}

/** Build usage summary */
export interface BuildUsageSummary {
  buildId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  byAgent: Record<string, { tokens: number; cost: number; calls: number }>;
  byModel: Record<AIModel, { tokens: number; cost: number; calls: number }>;
}

/** Token tracker class */
export class TokenTracker {
  private records: AgentUsageRecord[] = [];
  private buildId: string;
  private maxTokens: number;

  constructor(buildId: string, maxTokens: number = 1000000) {
    this.buildId = buildId;
    this.maxTokens = maxTokens;
  }

  /** Record usage for an agent call */
  record(agentId: string, model: AIModel, usage: TokenUsage, requestId: string): void {
    // Get capabilities with fallback for versioned model names (e.g., gpt-4o-2024-08-06 -> gpt-4o)
    let capabilities = MODEL_CAPABILITIES[model];
    if (!capabilities) {
      // Try base model name without version suffix
      const baseModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, '') as AIModel;
      capabilities = MODEL_CAPABILITIES[baseModel];
    }
    // Default to free if model not found (prevents undefined errors)
    const costPer1kInput = capabilities?.costPer1kInput ?? 0;
    const costPer1kOutput = capabilities?.costPer1kOutput ?? 0;
    const cost = (usage.inputTokens / 1000) * costPer1kInput + (usage.outputTokens / 1000) * costPer1kOutput;

    this.records.push({ agentId, model, usage, cost, timestamp: new Date(), requestId });
  }

  /** Get current total usage */
  getTotalTokens(): number {
    return this.records.reduce((sum, r) => sum + r.usage.totalTokens, 0);
  }

  /** Get remaining token budget */
  getRemainingTokens(): number {
    return Math.max(0, this.maxTokens - this.getTotalTokens());
  }

  /** Check if budget exceeded */
  isOverBudget(): boolean {
    return this.getTotalTokens() > this.maxTokens;
  }

  /** Get usage summary */
  getSummary(): BuildUsageSummary {
    const byAgent: Record<string, { tokens: number; cost: number; calls: number }> = {};
    const byModel: Record<string, { tokens: number; cost: number; calls: number }> = {};

    for (const record of this.records) {
      // By agent
      if (!byAgent[record.agentId]) {
        byAgent[record.agentId] = { tokens: 0, cost: 0, calls: 0 };
      }
      byAgent[record.agentId].tokens += record.usage.totalTokens;
      byAgent[record.agentId].cost += record.cost;
      byAgent[record.agentId].calls += 1;

      // By model
      if (!byModel[record.model]) {
        byModel[record.model] = { tokens: 0, cost: 0, calls: 0 };
      }
      byModel[record.model].tokens += record.usage.totalTokens;
      byModel[record.model].cost += record.cost;
      byModel[record.model].calls += 1;
    }

    return {
      buildId: this.buildId,
      totalInputTokens: this.records.reduce((sum, r) => sum + r.usage.inputTokens, 0),
      totalOutputTokens: this.records.reduce((sum, r) => sum + r.usage.outputTokens, 0),
      totalTokens: this.getTotalTokens(),
      totalCost: this.records.reduce((sum, r) => sum + r.cost, 0),
      byAgent,
      byModel: byModel as Record<AIModel, { tokens: number; cost: number; calls: number }>,
    };
  }

  /** Get all records */
  getRecords(): AgentUsageRecord[] {
    return [...this.records];
  }

  /** Calculate estimated cost for a request */
  static estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    // Get capabilities with fallback for versioned model names
    let capabilities = MODEL_CAPABILITIES[model];
    if (!capabilities) {
      const baseModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, '') as AIModel;
      capabilities = MODEL_CAPABILITIES[baseModel];
    }
    const costPer1kInput = capabilities?.costPer1kInput ?? 0;
    const costPer1kOutput = capabilities?.costPer1kOutput ?? 0;
    return (inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput;
  }
}

/**
 * OLYMPUS Audit History Tracker
 *
 * Tracks audit findings over time for pattern detection,
 * recurring issue identification, and predictive analysis.
 *
 * @module audit-history
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  AuditHistoryEntry,
  AuditFinding,
  RecurringPattern,
  PredictedRisk,
} from './audit-types';

// ============================================================================
// HISTORY STORAGE
// ============================================================================

const DEFAULT_HISTORY_PATH = './.audit-history';
const MAX_HISTORY_ENTRIES = 1000;
const PATTERN_THRESHOLD = 2; // Minimum occurrences to be considered a pattern

/**
 * Audit History Tracker
 *
 * Persists audit history and provides pattern analysis.
 */
export class AuditHistoryTracker {
  private historyPath: string;
  private entries: Map<string, AuditHistoryEntry> = new Map();
  private initialized = false;

  constructor(historyPath: string = DEFAULT_HISTORY_PATH) {
    this.historyPath = historyPath;
  }

  /**
   * Initialize the tracker
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      fs.mkdirSync(this.historyPath, { recursive: true });
      await this.loadHistory();
      this.initialized = true;
    } catch (err) {
      console.warn('[AUDIT-HISTORY] Failed to initialize:', err);
    }
  }

  /**
   * Load history from disk
   */
  private async loadHistory(): Promise<void> {
    const indexPath = path.join(this.historyPath, 'index.json');

    if (!fs.existsSync(indexPath)) {
      return;
    }

    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      for (const entryId of index.entries || []) {
        const entryPath = path.join(this.historyPath, `${entryId}.json`);
        if (fs.existsSync(entryPath)) {
          const entry = JSON.parse(fs.readFileSync(entryPath, 'utf-8'));
          entry.timestamp = new Date(entry.timestamp);
          this.entries.set(entryId, entry);
        }
      }
    } catch (err) {
      console.warn('[AUDIT-HISTORY] Failed to load history:', err);
    }
  }

  /**
   * Save history to disk
   */
  private async saveHistory(): Promise<void> {
    try {
      const entryIds = Array.from(this.entries.keys());

      // Save index
      const indexPath = path.join(this.historyPath, 'index.json');
      fs.writeFileSync(indexPath, JSON.stringify({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entries: entryIds,
        totalCount: entryIds.length,
      }, null, 2));

      // Save individual entries
      for (const [id, entry] of Array.from(this.entries.entries())) {
        const entryPath = path.join(this.historyPath, `${id}.json`);
        fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2));
      }
    } catch (err) {
      console.warn('[AUDIT-HISTORY] Failed to save history:', err);
    }
  }

  /**
   * Record a new audit
   */
  async recordAudit(entry: AuditHistoryEntry): Promise<void> {
    await this.initialize();

    this.entries.set(entry.id, entry);

    // Prune old entries if needed
    if (this.entries.size > MAX_HISTORY_ENTRIES) {
      const sorted = Array.from(this.entries.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

      const toRemove = sorted.slice(0, this.entries.size - MAX_HISTORY_ENTRIES);
      for (const [id] of toRemove) {
        this.entries.delete(id);
        try {
          fs.unlinkSync(path.join(this.historyPath, `${id}.json`));
        } catch {
          // Ignore deletion errors
        }
      }
    }

    await this.saveHistory();
  }

  /**
   * Get entries for a project
   */
  async getProjectHistory(projectId: string): Promise<AuditHistoryEntry[]> {
    await this.initialize();

    return Array.from(this.entries.values())
      .filter(e => e.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Detect recurring patterns
   */
  async getRecurringPatterns(projectId?: string): Promise<RecurringPattern[]> {
    await this.initialize();

    const entries = projectId
      ? Array.from(this.entries.values()).filter(e => e.projectId === projectId)
      : Array.from(this.entries.values());

    // Count occurrences of each finding pattern
    const patternCounts = new Map<string, {
      type: string;
      title: string;
      occurrences: number;
      firstSeen: Date;
      lastSeen: Date;
      phases: Set<string>;
      cwe?: string;
    }>();

    for (const entry of entries) {
      for (const finding of entry.findings) {
        const key = this.getFindingKey(finding);
        const existing = patternCounts.get(key);

        if (existing) {
          existing.occurrences++;
          existing.phases.add(entry.buildId);
          if (entry.timestamp > existing.lastSeen) {
            existing.lastSeen = entry.timestamp;
          }
          if (entry.timestamp < existing.firstSeen) {
            existing.firstSeen = entry.timestamp;
          }
        } else {
          patternCounts.set(key, {
            type: finding.type,
            title: finding.title,
            occurrences: 1,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp,
            phases: new Set([entry.buildId]),
            cwe: finding.cwe,
          });
        }
      }
    }

    // Filter to recurring patterns only
    const patterns: RecurringPattern[] = [];
    for (const [key, data] of Array.from(patternCounts.entries())) {
      if (data.occurrences >= PATTERN_THRESHOLD) {
        patterns.push({
          patternId: key,
          type: data.type,
          title: data.title,
          occurrences: data.occurrences,
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
          affectedPhases: Array.from(data.phases),
          suggestedFix: this.generateFixSuggestion(data.type, data.title),
        });
      }
    }

    return patterns.sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate fix suggestion based on pattern
   */
  private generateFixSuggestion(type: string, title: string): string {
    // Common fix suggestions based on finding type
    const suggestions: Record<string, string> = {
      taint_flow: 'Add input validation/sanitization at the source agent or sanitization before the sink',
      attack_pattern: 'Review the detected pattern and implement appropriate filtering or validation',
      semantic_attack: 'Add semantic-aware input validation to detect rephrased attack attempts',
      security_violation: 'Remove hardcoded secrets and use environment variables or secret management',
      contract_violation: 'Update agent output to match the contract specification',
    };

    const baseSuggestion = suggestions[type] || 'Review and address the finding';

    // Add title-specific suggestions
    if (title.toLowerCase().includes('prompt injection')) {
      return 'Implement prompt injection filtering: validate inputs, use delimiters, limit user control';
    }
    if (title.toLowerCase().includes('taint')) {
      return 'Add sanitization between agents: escape, validate, or transform data at trust boundaries';
    }
    if (title.toLowerCase().includes('secret') || title.toLowerCase().includes('credential')) {
      return 'Remove hardcoded credentials. Use environment variables, vault, or secret manager';
    }

    return baseSuggestion;
  }

  /**
   * Predict risks based on historical patterns
   */
  async predictRisks(
    projectId: string,
    newAgentOutputs: Record<string, unknown>
  ): Promise<PredictedRisk[]> {
    await this.initialize();

    const risks: PredictedRisk[] = [];
    const patterns = await this.getRecurringPatterns(projectId);

    // Check if new output contains patterns similar to historical issues
    const outputStr = JSON.stringify(newAgentOutputs).toLowerCase();

    for (const pattern of patterns) {
      // Calculate probability based on occurrence frequency
      const probability = Math.min(pattern.occurrences / 10, 0.9);

      // Check for related keywords in new output
      const keywords = this.extractKeywords(pattern.title);
      const matchedKeywords = keywords.filter(kw => outputStr.includes(kw));

      if (matchedKeywords.length > 0) {
        risks.push({
          riskId: `PRED-${pattern.patternId}`,
          confidence: probability * (matchedKeywords.length / keywords.length),
          type: pattern.type,
          description: `Historical pattern "${pattern.title}" may recur. Seen ${pattern.occurrences} times before.`,
          basedOn: pattern.affectedPhases.slice(0, 5),
        });
      }
    }

    return risks
      .filter(r => r.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalAudits: number;
    totalFindings: number;
    findingsByType: Record<string, number>;
    findingsBySeverity: Record<string, number>;
    blockedBuilds: number;
    averageDuration: number;
  }> {
    await this.initialize();

    const entries = Array.from(this.entries.values());

    const findingsByType: Record<string, number> = {};
    const findingsBySeverity: Record<string, number> = {};
    let totalFindings = 0;
    let blockedBuilds = 0;
    let totalDuration = 0;

    for (const entry of entries) {
      if (entry.blocked) blockedBuilds++;
      totalDuration += entry.duration;

      for (const finding of entry.findings) {
        totalFindings++;
        findingsByType[finding.type] = (findingsByType[finding.type] || 0) + 1;
        findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
      }
    }

    return {
      totalAudits: entries.length,
      totalFindings,
      findingsByType,
      findingsBySeverity,
      blockedBuilds,
      averageDuration: entries.length > 0 ? totalDuration / entries.length : 0,
    };
  }

  /**
   * Generate a unique key for a finding
   */
  private getFindingKey(finding: AuditFinding): string {
    return `${finding.type}:${finding.title}`.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Extract keywords from a title
   */
  private extractKeywords(title: string): string[] {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
  }

  /**
   * Clear all history (for testing)
   */
  async clearHistory(): Promise<void> {
    this.entries.clear();
    try {
      const files = fs.readdirSync(this.historyPath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.historyPath, file));
      }
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let historyTrackerInstance: AuditHistoryTracker | null = null;

/**
 * Get the global history tracker instance
 */
export function getHistoryTracker(): AuditHistoryTracker {
  if (!historyTrackerInstance) {
    historyTrackerInstance = new AuditHistoryTracker();
  }
  return historyTrackerInstance;
}

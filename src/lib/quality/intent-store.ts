/**
 * OLYMPUS 2.0 - Intent Graph Store
 *
 * Intent Graph is the PRIMARY ARTIFACT, not code.
 * Code is DERIVED from intent.
 *
 * This store provides:
 * - Versioned intent graphs
 * - Persistence across builds
 * - Diff between versions
 * - Intent graph as source of truth
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { IntentSpec, IntentCausalChain, WISSReport, ICGReport } from './intent-graph';

// ============================================
// VERSIONED INTENT GRAPH
// ============================================

/** Version identifier for intent graphs */
export interface IntentGraphVersion {
  id: string; // UUID
  buildId: string; // Associated build
  version: number; // Monotonic version number
  timestamp: Date;
  hash: string; // Content hash for integrity
}

/** Complete versioned intent graph */
export interface VersionedIntentGraph {
  meta: IntentGraphVersion;

  // The intents themselves
  intents: IntentSpec[];

  // Validation results
  chains: IntentCausalChain[];
  wiss: WISSReport;

  // Derivation info
  derivedFrom?: string; // Previous version ID
  changes?: IntentGraphDiff;
}

/** Diff between two intent graph versions */
export interface IntentGraphDiff {
  from: string; // Version ID
  to: string; // Version ID

  // Intent changes
  intentsAdded: IntentSpec[];
  intentsRemoved: IntentSpec[];
  intentsModified: Array<{
    intentId: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;

  // Score changes
  wissScoreDelta: number;
  criticalBlockerChanged: boolean;

  // Axis changes
  axisDeltas: {
    trigger: number;
    state: number;
    effect: number;
    outcome: number;
  };
}

/** Intent graph history entry */
export interface IntentGraphHistoryEntry {
  versionId: string;
  buildId: string;
  timestamp: Date;
  wissScore: number;
  criticalBlocker: boolean;
  totalIntents: number;
  satisfiedIntents: number;
}

// ============================================
// INTENT GRAPH STORE
// ============================================

const STORE_DIR = '.olympus/intent-graphs';

/**
 * IntentGraphStore - Manages versioned intent graphs
 */
export class IntentGraphStore {
  private baseDir: string;
  private historyPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.baseDir = path.join(projectRoot, STORE_DIR);
    this.historyPath = path.join(this.baseDir, 'history.json');

    // Ensure store directory exists
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  /**
   * Save an intent graph with versioning
   */
  save(
    buildId: string,
    intents: IntentSpec[],
    chains: IntentCausalChain[],
    wiss: WISSReport
  ): VersionedIntentGraph {
    // Get current version number
    const history = this.getHistory();
    const lastVersion = history[history.length - 1];
    const newVersion = lastVersion ? lastVersion.versionId : 0;

    // Create content hash
    const contentHash = this.hashContent(intents, wiss);

    // Create version metadata
    const meta: IntentGraphVersion = {
      id: crypto.randomUUID(),
      buildId,
      version: typeof newVersion === 'number' ? newVersion + 1 : 1,
      timestamp: new Date(),
      hash: contentHash,
    };

    // Calculate diff from previous version
    let changes: IntentGraphDiff | undefined;
    if (lastVersion) {
      const previousGraph = this.load(lastVersion.versionId);
      if (previousGraph) {
        changes = this.diff(previousGraph, { meta, intents, chains, wiss });
      }
    }

    // Create versioned graph
    const versionedGraph: VersionedIntentGraph = {
      meta,
      intents,
      chains,
      wiss,
      derivedFrom: lastVersion?.versionId,
      changes,
    };

    // Save to disk
    const graphPath = path.join(this.baseDir, `${meta.id}.json`);
    fs.writeFileSync(graphPath, JSON.stringify(versionedGraph, null, 2));

    // Update history
    history.push({
      versionId: meta.id,
      buildId,
      timestamp: meta.timestamp,
      wissScore: wiss.score,
      criticalBlocker: wiss.criticalBlocker,
      totalIntents: intents.length,
      satisfiedIntents: chains.filter(c => c.satisfied).length,
    });
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));

    console.log(`[IntentStore] Saved intent graph v${meta.version} (${meta.id})`);
    console.log(`[IntentStore]   Intents: ${intents.length}`);
    console.log(`[IntentStore]   W-ISS-D: ${wiss.score}%`);
    if (changes) {
      console.log(`[IntentStore]   Changes from previous:`);
      console.log(`[IntentStore]     Added: ${changes.intentsAdded.length}`);
      console.log(`[IntentStore]     Removed: ${changes.intentsRemoved.length}`);
      console.log(
        `[IntentStore]     W-ISS-D delta: ${changes.wissScoreDelta > 0 ? '+' : ''}${changes.wissScoreDelta}%`
      );
    }

    return versionedGraph;
  }

  /**
   * Load a specific version
   */
  load(versionId: string): VersionedIntentGraph | null {
    const graphPath = path.join(this.baseDir, `${versionId}.json`);
    if (!fs.existsSync(graphPath)) return null;

    const content = fs.readFileSync(graphPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Load the latest version
   */
  loadLatest(): VersionedIntentGraph | null {
    const history = this.getHistory();
    if (history.length === 0) return null;

    const latest = history[history.length - 1];
    return this.load(latest.versionId);
  }

  /**
   * Get version history
   */
  getHistory(): IntentGraphHistoryEntry[] {
    if (!fs.existsSync(this.historyPath)) return [];

    const content = fs.readFileSync(this.historyPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Diff two intent graphs
   */
  diff(from: VersionedIntentGraph, to: VersionedIntentGraph): IntentGraphDiff {
    const fromIntentIds = new Set(from.intents.map(i => i.id));
    const toIntentIds = new Set(to.intents.map(i => i.id));

    // Find added intents
    const intentsAdded = to.intents.filter(i => !fromIntentIds.has(i.id));

    // Find removed intents
    const intentsRemoved = from.intents.filter(i => !toIntentIds.has(i.id));

    // Find modified intents
    const intentsModified: IntentGraphDiff['intentsModified'] = [];
    for (const toIntent of to.intents) {
      const fromIntent = from.intents.find(i => i.id === toIntent.id);
      if (fromIntent) {
        // Check for changes
        if (fromIntent.priority !== toIntent.priority) {
          intentsModified.push({
            intentId: toIntent.id,
            field: 'priority',
            oldValue: fromIntent.priority,
            newValue: toIntent.priority,
          });
        }
        if (fromIntent.requirement !== toIntent.requirement) {
          intentsModified.push({
            intentId: toIntent.id,
            field: 'requirement',
            oldValue: fromIntent.requirement,
            newValue: toIntent.requirement,
          });
        }
      }
    }

    // Calculate score changes
    const wissScoreDelta = to.wiss.score - from.wiss.score;
    const criticalBlockerChanged = from.wiss.criticalBlocker !== to.wiss.criticalBlocker;

    // Calculate axis deltas
    const axisDeltas = {
      trigger: to.wiss.axisAverages.trigger - from.wiss.axisAverages.trigger,
      state: to.wiss.axisAverages.state - from.wiss.axisAverages.state,
      effect: to.wiss.axisAverages.effect - from.wiss.axisAverages.effect,
      outcome: to.wiss.axisAverages.outcome - from.wiss.axisAverages.outcome,
    };

    return {
      from: from.meta.id,
      to: to.meta.id,
      intentsAdded,
      intentsRemoved,
      intentsModified,
      wissScoreDelta,
      criticalBlockerChanged,
      axisDeltas,
    };
  }

  /**
   * Get trend data for W-ISS-D over time
   */
  getTrend(limit: number = 10): Array<{
    version: number;
    timestamp: Date;
    wissScore: number;
    criticalBlocker: boolean;
  }> {
    const history = this.getHistory();
    const recent = history.slice(-limit);

    return recent.map((entry, index) => ({
      version: index + 1,
      timestamp: new Date(entry.timestamp),
      wissScore: entry.wissScore,
      criticalBlocker: entry.criticalBlocker,
    }));
  }

  /**
   * Check if the intent graph has regressed
   */
  hasRegressed(): { regressed: boolean; details?: string } {
    const history = this.getHistory();
    if (history.length < 2) {
      return { regressed: false };
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    if (latest.wissScore < previous.wissScore) {
      return {
        regressed: true,
        details: `W-ISS-D dropped from ${previous.wissScore}% to ${latest.wissScore}%`,
      };
    }

    if (!previous.criticalBlocker && latest.criticalBlocker) {
      return {
        regressed: true,
        details: `Critical blocker introduced`,
      };
    }

    return { regressed: false };
  }

  /**
   * Generate a content hash for integrity checking
   */
  private hashContent(intents: IntentSpec[], wiss: WISSReport): string {
    const content = JSON.stringify({ intents, wiss });
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _store: IntentGraphStore | null = null;

export function getIntentStore(projectRoot?: string): IntentGraphStore {
  if (!_store) {
    _store = new IntentGraphStore(projectRoot);
  }
  return _store;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Export intent graph in human-readable format
 */
export function exportIntentGraphReadable(graph: VersionedIntentGraph): string {
  const lines: string[] = [
    '# OLYMPUS Intent Graph',
    `Version: ${graph.meta.version}`,
    `Build: ${graph.meta.buildId}`,
    `Date: ${graph.meta.timestamp}`,
    `Hash: ${graph.meta.hash}`,
    '',
    '## W-ISS-D Score',
    `Score: ${graph.wiss.score}% (${graph.wiss.status})`,
    `Critical: ${graph.wiss.criticalIntentsSatisfied}/${graph.wiss.criticalIntentsTotal}`,
    `Blocker: ${graph.wiss.criticalBlocker ? 'YES' : 'No'}`,
    '',
    '## Axis Averages',
    `Trigger: ${Math.round(graph.wiss.axisAverages.trigger * 100)}%`,
    `State:   ${Math.round(graph.wiss.axisAverages.state * 100)}%`,
    `Effect:  ${Math.round(graph.wiss.axisAverages.effect * 100)}%`,
    `Outcome: ${Math.round(graph.wiss.axisAverages.outcome * 100)}%`,
    '',
    '## Intents',
  ];

  for (const intent of graph.intents) {
    const chain = graph.chains.find(c => c.intent.id === intent.id);
    const status = chain?.satisfied ? '✓' : '✗';
    const score = chain ? Math.round(chain.rawScore * 100) : 0;

    lines.push(`- [${status}] ${intent.requirement.slice(0, 60)} (${intent.priority}, ${score}%)`);
  }

  if (graph.wiss.blockers.length > 0) {
    lines.push('');
    lines.push('## Critical Blockers');
    for (const blocker of graph.wiss.blockers) {
      lines.push(`- ${blocker.requirement.slice(0, 60)}`);
      lines.push(`  Missing: ${blocker.missingAxes.join(', ')}`);
    }
  }

  if (graph.changes) {
    lines.push('');
    lines.push('## Changes from Previous');
    lines.push(
      `W-ISS-D: ${graph.changes.wissScoreDelta > 0 ? '+' : ''}${graph.changes.wissScoreDelta}%`
    );
    if (graph.changes.intentsAdded.length > 0) {
      lines.push(`Added: ${graph.changes.intentsAdded.length} intents`);
    }
    if (graph.changes.intentsRemoved.length > 0) {
      lines.push(`Removed: ${graph.changes.intentsRemoved.length} intents`);
    }
  }

  return lines.join('\n');
}

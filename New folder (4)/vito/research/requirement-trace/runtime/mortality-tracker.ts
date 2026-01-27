/**
 * ORIS Mortality Tracker
 *
 * Tracks shape mortality (deaths/survivals) per handoff over time.
 * Classifies shapes as HEALTHY, FLAKY, DEGRADING, or SYSTEMICALLY_BROKEN.
 *
 * DETERMINISTIC classification - no inference, no override.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  MortalityStatus,
  MortalityDatabase,
  ShapeMortalityRecord,
  HandoffMortalityRecord,
  ShapeKind,
  ShapeCriticality
} from './types';
import type { HandoffId, LossClass } from '../types';
import type { ShapeTraceResult, HandoffLossResult } from '../registry/types';
import type { CriticalShapeDeclaration } from '../registry/shapes';

// Mortality thresholds are IMMUTABLE
const MORTALITY_THRESHOLDS = Object.freeze({
  HEALTHY_MIN: 0.95,           // >95% survival = HEALTHY
  FLAKY_MIN: 0.70,             // 70-95% = FLAKY
  BROKEN_MAX: 0.70,            // <70% = SYSTEMICALLY_BROKEN
  DECLINING_WINDOW: 5,         // Look at last 5 runs for trend
  DECLINING_DROP_THRESHOLD: 0.10  // 10% drop = DECLINING
});

Object.freeze(MORTALITY_THRESHOLDS);

const HANDOFF_IDS: HandoffId[] = ['H1', 'H2', 'H3', 'H4', 'H5'];

export class MortalityTracker {
  private database: MortalityDatabase;
  private dataPath: string;
  private runHistory: Map<string, number[]> = new Map(); // shape_id -> last N survival rates

  constructor(dataDir: string) {
    this.dataPath = path.join(dataDir, 'shape-mortality.json');
    this.database = this.loadDatabase();
  }

  /**
   * Load mortality database from disk
   */
  private loadDatabase(): MortalityDatabase {
    if (fs.existsSync(this.dataPath)) {
      try {
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(data) as MortalityDatabase;
      } catch {
        // Corrupted file - start fresh
      }
    }

    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      shapes: {}
    };
  }

  /**
   * Save mortality database to disk
   */
  private saveDatabase(): void {
    this.database.last_updated = new Date().toISOString();
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(this.database, null, 2));
  }

  /**
   * Record shape survival/death for a run
   */
  recordRun(
    shapes: CriticalShapeDeclaration[],
    traceResults: Record<string, ShapeTraceResult>
  ): void {
    const timestamp = new Date().toISOString();

    for (const shape of shapes) {
      const traceResult = traceResults[shape.id];
      if (!traceResult) continue;

      // Initialize record if new shape
      if (!this.database.shapes[shape.id]) {
        this.database.shapes[shape.id] = this.createNewRecord(shape, timestamp);
      }

      const record = this.database.shapes[shape.id];
      record.total_runs++;
      record.last_updated = timestamp;

      // Track per-handoff mortality
      for (const handoffId of HANDOFF_IDS) {
        const handoffLoss = traceResult.handoff_losses[handoffId];
        this.recordHandoffResult(record, handoffId, handoffLoss, timestamp);
      }

      // Update overall survival rate
      this.updateOverallSurvivalRate(record);

      // Update mortality status
      this.classifyMortalityStatus(record);

      // Update trend
      this.updateTrend(record);
    }

    this.saveDatabase();
  }

  /**
   * Create a new mortality record for a shape
   */
  private createNewRecord(
    shape: CriticalShapeDeclaration,
    timestamp: string
  ): ShapeMortalityRecord {
    const perHandoff: Record<HandoffId, HandoffMortalityRecord> = {} as Record<HandoffId, HandoffMortalityRecord>;

    for (const handoffId of HANDOFF_IDS) {
      perHandoff[handoffId] = {
        handoff_id: handoffId,
        total_passes: 0,
        total_deaths: 0,
        survival_rate: 1.0,
        last_death_timestamp: null,
        consecutive_deaths: 0,
        consecutive_survivals: 0
      };
    }

    return {
      shape_id: shape.id,
      shape_kind: shape.kind,
      criticality: shape.criticality,
      first_observed: timestamp,
      last_updated: timestamp,
      total_runs: 0,
      overall_survival_rate: 1.0,
      mortality_status: 'HEALTHY',
      per_handoff: perHandoff,
      trend: 'STABLE',
      trend_window_runs: 0
    };
  }

  /**
   * Record result for a specific handoff
   */
  private recordHandoffResult(
    record: ShapeMortalityRecord,
    handoffId: HandoffId,
    handoffLoss: HandoffLossResult | undefined,
    timestamp: string
  ): void {
    const handoffRecord = record.per_handoff[handoffId];
    if (!handoffRecord) return;

    const died = handoffLoss?.loss_detected && handoffLoss.loss_class !== null;

    if (died) {
      handoffRecord.total_deaths++;
      handoffRecord.last_death_timestamp = timestamp;
      handoffRecord.consecutive_deaths++;
      handoffRecord.consecutive_survivals = 0;
    } else {
      handoffRecord.total_passes++;
      handoffRecord.consecutive_survivals++;
      handoffRecord.consecutive_deaths = 0;
    }

    const total = handoffRecord.total_passes + handoffRecord.total_deaths;
    handoffRecord.survival_rate = total > 0 ? handoffRecord.total_passes / total : 1.0;
  }

  /**
   * Update overall survival rate for a shape
   */
  private updateOverallSurvivalRate(record: ShapeMortalityRecord): void {
    // Overall survival = minimum survival rate across all handoffs
    // (a chain is only as strong as its weakest link)
    let minRate = 1.0;
    for (const handoffId of HANDOFF_IDS) {
      const hr = record.per_handoff[handoffId];
      if (hr.total_passes + hr.total_deaths > 0) {
        minRate = Math.min(minRate, hr.survival_rate);
      }
    }
    record.overall_survival_rate = minRate;
  }

  /**
   * Classify mortality status based on survival rate
   * DETERMINISTIC - no inference
   */
  private classifyMortalityStatus(record: ShapeMortalityRecord): void {
    const rate = record.overall_survival_rate;

    if (rate >= MORTALITY_THRESHOLDS.HEALTHY_MIN) {
      // Check if previously better and now declining
      if (record.mortality_status === 'HEALTHY' && record.trend === 'DECLINING') {
        record.mortality_status = 'DEGRADING';
      } else {
        record.mortality_status = 'HEALTHY';
      }
    } else if (rate >= MORTALITY_THRESHOLDS.FLAKY_MIN) {
      // Check for degradation
      if (record.trend === 'DECLINING') {
        record.mortality_status = 'DEGRADING';
      } else {
        record.mortality_status = 'FLAKY';
      }
    } else {
      record.mortality_status = 'SYSTEMICALLY_BROKEN';
    }
  }

  /**
   * Update trend based on recent runs
   */
  private updateTrend(record: ShapeMortalityRecord): void {
    // Track survival rate history
    if (!this.runHistory.has(record.shape_id)) {
      this.runHistory.set(record.shape_id, []);
    }

    const history = this.runHistory.get(record.shape_id)!;
    history.push(record.overall_survival_rate);

    // Keep only last N runs
    if (history.length > MORTALITY_THRESHOLDS.DECLINING_WINDOW) {
      history.shift();
    }

    record.trend_window_runs = history.length;

    if (history.length < 3) {
      // Not enough data
      record.trend = 'STABLE';
      return;
    }

    // Calculate trend: compare first half average to second half average
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, midpoint);
    const secondHalf = history.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;

    if (change < -MORTALITY_THRESHOLDS.DECLINING_DROP_THRESHOLD) {
      record.trend = 'DECLINING';
    } else if (change > MORTALITY_THRESHOLDS.DECLINING_DROP_THRESHOLD) {
      record.trend = 'IMPROVING';
    } else {
      record.trend = 'STABLE';
    }
  }

  /**
   * Get mortality record for a shape
   */
  getRecord(shapeId: string): ShapeMortalityRecord | null {
    return this.database.shapes[shapeId] || null;
  }

  /**
   * Get all mortality records
   */
  getAllRecords(): Record<string, ShapeMortalityRecord> {
    return { ...this.database.shapes };
  }

  /**
   * Get mortality status for a shape
   */
  getMortalityStatus(shapeId: string): MortalityStatus {
    const record = this.database.shapes[shapeId];
    return record?.mortality_status || 'HEALTHY';
  }

  /**
   * Get survival rate for a shape
   */
  getSurvivalRate(shapeId: string): number {
    const record = this.database.shapes[shapeId];
    return record?.overall_survival_rate ?? 1.0;
  }

  /**
   * Get trend for a shape
   */
  getTrend(shapeId: string): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    const record = this.database.shapes[shapeId];
    return record?.trend || 'STABLE';
  }

  /**
   * Get most vulnerable shapes (sorted by survival rate, ascending)
   */
  getMostVulnerableShapes(limit: number = 5): string[] {
    return Object.values(this.database.shapes)
      .sort((a, b) => a.overall_survival_rate - b.overall_survival_rate)
      .slice(0, limit)
      .map(r => r.shape_id);
  }

  /**
   * Get most dangerous handoffs (sorted by death count, descending)
   */
  getMostDangerousHandoffs(limit: number = 3): HandoffId[] {
    const handoffDeaths: Record<HandoffId, number> = {
      H1: 0, H2: 0, H3: 0, H4: 0, H5: 0
    };

    for (const record of Object.values(this.database.shapes)) {
      for (const handoffId of HANDOFF_IDS) {
        handoffDeaths[handoffId] += record.per_handoff[handoffId]?.total_deaths || 0;
      }
    }

    return (Object.entries(handoffDeaths) as [HandoffId, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Get mortality analysis summary
   */
  getAnalysisSummary(): {
    healthy_count: number;
    flaky_count: number;
    degrading_count: number;
    broken_count: number;
    most_vulnerable_shapes: string[];
    most_dangerous_handoffs: HandoffId[];
  } {
    const records = Object.values(this.database.shapes);

    return {
      healthy_count: records.filter(r => r.mortality_status === 'HEALTHY').length,
      flaky_count: records.filter(r => r.mortality_status === 'FLAKY').length,
      degrading_count: records.filter(r => r.mortality_status === 'DEGRADING').length,
      broken_count: records.filter(r => r.mortality_status === 'SYSTEMICALLY_BROKEN').length,
      most_vulnerable_shapes: this.getMostVulnerableShapes(),
      most_dangerous_handoffs: this.getMostDangerousHandoffs()
    };
  }

  /**
   * Check if a shape is systemically broken
   */
  isSystemicallyBroken(shapeId: string): boolean {
    return this.getMortalityStatus(shapeId) === 'SYSTEMICALLY_BROKEN';
  }

  /**
   * Reset database (for testing only)
   */
  reset(): void {
    this.database = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      shapes: {}
    };
    this.runHistory.clear();
    this.saveDatabase();
  }
}

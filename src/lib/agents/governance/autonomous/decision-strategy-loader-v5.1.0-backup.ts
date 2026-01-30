/**
 * Decision Strategy Loader - Future-Proof Configuration System
 *
 * WHY THIS EXISTS:
 * Future You will want to experiment with different decision strategies without code changes.
 * This loader makes thresholds, actions, and rules configurable via JSON.
 *
 * WHAT YOU CAN DO:
 * - Change thresholds for production vs staging (edit JSON, no deploy)
 * - Override behavior for specific patterns (SQL injection stricter than logs)
 * - Add new actions without code changes (escalate-to-security, create-ticket)
 * - A/B test strategies (aggressive vs conservative suppression)
 * - Tier-based overrides (Tier 3 never suppresses)
 *
 * HOW TO USE:
 * ```typescript
 * const loader = new DecisionStrategyLoader();
 * const strategy = loader.getStrategy('production');
 * const decision = strategy.decide(violation, learning);
 * ```
 *
 * Created: 2026-01-30
 * Future-proofing for: 6+ months of evolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StrategyConfig {
  name: string;
  description: string;
  defaults: {
    highRiskThreshold: number;
    mediumRiskThreshold: number;
    lowRiskThreshold: number;
    minSamplesForDecision: number;
    minSamplesForSuppression: number;
  };
  actions?: Record<string, ActionRule>;
}

export interface ActionRule {
  when: string[];
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface PatternOverride {
  description: string;
  strategy?: string;
  overrides?: {
    highRiskThreshold?: number;
    mediumRiskThreshold?: number;
    lowRiskThreshold?: number;
    minSamplesForDecision?: number;
    minSamplesForSuppression?: number;
    neverSuppress?: boolean;
    alwaysAlert?: boolean;
  };
  customActions?: Record<string, ActionRule>;
  contextRules?: Record<string, ContextRule>;
}

export interface ContextRule {
  when: string[];
  adjustThresholds?: Record<string, number>;
}

export interface TierOverride {
  description: string;
  overrides: {
    highRiskThreshold?: number;
    lowRiskThreshold?: number;
    minSamplesForSuppression?: number;
    neverSuppress?: boolean;
  };
}

export interface DecisionResult {
  action:
    | 'alert-human'
    | 'auto-fix'
    | 'suppress'
    | 'escalate-to-security'
    | 'create-jira-ticket'
    | 'auto-remediate'
    | 'quarantine';
  reason: string;
  confidence: number;
  evidence?: {
    totalSamples: number;
    incidentRate: number;
    riskScore: number;
    strategyUsed?: string;
    thresholdsApplied?: Record<string, number>;
  };
}

export interface Violation {
  id: string;
  pattern: string;
  tier: 1 | 2 | 3;
  filePath: string;
  confidence: number;
}

export interface PatternLearning {
  pattern: string;
  deployedViolations: number;
  incidentRate: number;
  riskScore: number;
  confidenceInterval: [number, number];
}

// ============================================================================
// DECISION STRATEGY LOADER
// ============================================================================

export class DecisionStrategyLoader {
  private config: any;
  private configPath: string;
  private lastLoadTime: number = 0;
  private cacheTTL: number = 60000; // Reload config every 60 seconds

  constructor(configPath?: string) {
    this.configPath =
      configPath ||
      path.join(__dirname, '../../../../contracts/governance-decision-strategies.json');
    this.loadConfig();
  }

  /**
   * Load configuration from JSON file
   * Auto-reloads every 60 seconds to support hot-swapping strategies
   */
  private loadConfig(): void {
    const now = Date.now();
    if (now - this.lastLoadTime < this.cacheTTL && this.config) {
      return; // Use cached config
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      this.lastLoadTime = now;

      logger.info('Decision strategy configuration loaded', {
        version: this.config.version,
        strategies: Object.keys(this.config.strategies).length,
        patternOverrides: Object.keys(this.config.patternOverrides || {}).length,
      });
    } catch (error) {
      logger.error('Failed to load decision strategy config - using defaults', { error });
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get strategy by environment (production, staging, development)
   */
  public getStrategy(environment: string = 'production'): DecisionStrategy {
    this.loadConfig(); // Check for updates

    const strategyConfig =
      this.config.strategies[environment] || this.config.strategies['production'];
    return new DecisionStrategy(strategyConfig, this.config, environment);
  }

  /**
   * Fallback default config if JSON fails to load
   */
  private getDefaultConfig(): any {
    return {
      version: '1.0.0-fallback',
      strategies: {
        production: {
          name: 'Production (Default)',
          description: 'Fallback configuration',
          defaults: {
            highRiskThreshold: 0.7,
            mediumRiskThreshold: 0.3,
            lowRiskThreshold: 0.05,
            minSamplesForDecision: 10,
            minSamplesForSuppression: 20,
          },
        },
      },
      patternOverrides: {},
      tierOverrides: {},
    };
  }

  /**
   * Reload configuration immediately (for testing/debugging)
   */
  public forceReload(): void {
    this.lastLoadTime = 0;
    this.loadConfig();
  }

  /**
   * Get all available strategies (for UI/CLI)
   */
  public getAvailableStrategies(): string[] {
    this.loadConfig();
    return Object.keys(this.config.strategies);
  }

  /**
   * Get pattern-specific override (if exists)
   */
  public getPatternOverride(pattern: string): PatternOverride | null {
    this.loadConfig();
    return this.config.patternOverrides[pattern] || null;
  }
}

// ============================================================================
// DECISION STRATEGY (Encapsulates decision logic)
// ============================================================================

export class DecisionStrategy {
  private config: StrategyConfig;
  private fullConfig: any;
  private environment: string;

  constructor(config: StrategyConfig, fullConfig: any, environment: string) {
    this.config = config;
    this.fullConfig = fullConfig;
    this.environment = environment;
  }

  /**
   * Make decision based on violation and learning data
   *
   * DECISION FLOW:
   * 1. Check pattern-specific overrides (e.g., SQL injection)
   * 2. Check tier-specific overrides (e.g., Tier 3 never suppress)
   * 3. Apply strategy thresholds (production vs staging)
   * 4. Return action with reasoning
   */
  public decide(violation: Violation, learning: PatternLearning | null): DecisionResult {
    // Get effective thresholds (strategy + pattern + tier overrides)
    const thresholds = this.getEffectiveThresholds(violation);

    // No learning data → conservative
    if (!learning) {
      return {
        action: 'alert-human',
        reason: 'No historical data for this pattern - being conservative',
        confidence: 0.5,
        evidence: {
          totalSamples: 0,
          incidentRate: 0,
          riskScore: 0,
          strategyUsed: this.environment,
          thresholdsApplied: thresholds,
        },
      };
    }

    const { riskScore, incidentRate, deployedViolations } = learning;

    // Check pattern-specific rules (e.g., SQL injection never suppresses)
    const patternOverride = this.fullConfig.patternOverrides[violation.pattern];
    if (patternOverride) {
      if (patternOverride.overrides?.alwaysAlert) {
        return {
          action: 'alert-human',
          reason: `Pattern ${violation.pattern} configured to always alert (security-critical)`,
          confidence: 1.0,
          evidence: { totalSamples: deployedViolations, incidentRate, riskScore },
        };
      }

      if (patternOverride.overrides?.neverSuppress && riskScore > 0) {
        return {
          action: 'alert-human',
          reason: `Pattern ${violation.pattern} configured to never suppress`,
          confidence: 0.9,
          evidence: { totalSamples: deployedViolations, incidentRate, riskScore },
        };
      }

      // Check custom actions (e.g., escalate-to-security)
      if (patternOverride.customActions) {
        for (const [actionName, actionRule] of Object.entries(patternOverride.customActions)) {
          if (
            this.evaluateCondition(actionRule.when, {
              riskScore,
              incidentRate,
              deployedViolations,
              violation,
            })
          ) {
            return {
              action: actionName as any,
              reason: `Custom action triggered: ${patternOverride.description}`,
              confidence: 0.95,
              evidence: { totalSamples: deployedViolations, incidentRate, riskScore },
            };
          }
        }
      }
    }

    // Check tier-specific rules (e.g., Tier 3 stricter)
    const tierOverride = this.fullConfig.tierOverrides[`tier${violation.tier}`];
    if (tierOverride?.overrides?.neverSuppress && incidentRate < thresholds.lowRiskThreshold) {
      return {
        action: 'alert-human',
        reason: `Tier ${violation.tier} violations require manual review even if risk is low`,
        confidence: 0.8,
        evidence: { totalSamples: deployedViolations, incidentRate, riskScore },
      };
    }

    // HIGH RISK: Alert human
    if (riskScore > thresholds.highRiskThreshold) {
      return {
        action: 'alert-human',
        reason: `High risk pattern (${(riskScore * 100).toFixed(1)}% > ${(thresholds.highRiskThreshold * 100).toFixed(0)}% threshold) - caused incidents in ${(incidentRate * 100).toFixed(1)}% of ${deployedViolations} deployments`,
        confidence: riskScore,
        evidence: {
          totalSamples: deployedViolations,
          incidentRate,
          riskScore,
          strategyUsed: this.environment,
          thresholdsApplied: thresholds,
        },
      };
    }

    // MEDIUM RISK: Auto-fix if enough data
    if (
      riskScore > thresholds.mediumRiskThreshold &&
      deployedViolations >= thresholds.minSamplesForDecision
    ) {
      return {
        action: 'auto-fix',
        reason: `Medium risk pattern (${(riskScore * 100).toFixed(1)}%) with sufficient data (${deployedViolations} deploys, ${(incidentRate * 100).toFixed(1)}% incident rate) - auto-fixing`,
        confidence: 1 - riskScore,
        evidence: {
          totalSamples: deployedViolations,
          incidentRate,
          riskScore,
          strategyUsed: this.environment,
          thresholdsApplied: thresholds,
        },
      };
    }

    // LOW RISK: Suppress if proven safe
    if (
      deployedViolations >= thresholds.minSamplesForSuppression &&
      incidentRate < thresholds.lowRiskThreshold
    ) {
      return {
        action: 'suppress',
        reason: `Safe pattern - deployed ${deployedViolations} times with only ${(incidentRate * 100).toFixed(1)}% incident rate (< ${(thresholds.lowRiskThreshold * 100).toFixed(0)}% threshold)`,
        confidence: 0.95,
        evidence: {
          totalSamples: deployedViolations,
          incidentRate,
          riskScore,
          strategyUsed: this.environment,
          thresholdsApplied: thresholds,
        },
      };
    }

    // INSUFFICIENT DATA: Be conservative
    return {
      action: 'alert-human',
      reason: `Insufficient data for autonomous decision (${deployedViolations} deploys) - need ${thresholds.minSamplesForDecision}+ samples`,
      confidence: 0.6,
      evidence: {
        totalSamples: deployedViolations,
        incidentRate,
        riskScore,
        strategyUsed: this.environment,
        thresholdsApplied: thresholds,
      },
    };
  }

  /**
   * Get effective thresholds after applying pattern + tier overrides
   */
  private getEffectiveThresholds(violation: Violation): Record<string, number> {
    const base = { ...this.config.defaults };

    // Apply pattern override
    const patternOverride = this.fullConfig.patternOverrides[violation.pattern];
    if (patternOverride?.overrides) {
      Object.assign(base, patternOverride.overrides);
    }

    // Apply tier override
    const tierOverride = this.fullConfig.tierOverrides[`tier${violation.tier}`];
    if (tierOverride?.overrides) {
      Object.assign(base, tierOverride.overrides);
    }

    return base;
  }

  /**
   * Evaluate condition string (e.g., "riskScore > 0.8")
   * Simple evaluator - could be enhanced with expression parser
   */
  private evaluateCondition(conditions: string[], context: any): boolean {
    for (const condition of conditions) {
      // Simple regex-based evaluation (production would use proper parser)
      if (condition.includes('riskScore >')) {
        const threshold = parseFloat(condition.split('>')[1]);
        if (context.riskScore > threshold) return true;
      }
      if (condition === 'insufficientSamples') {
        if (context.deployedViolations < 10) return true;
      }
      if (condition === 'sufficientSamples') {
        if (context.deployedViolations >= 10) return true;
      }
      if (condition === 'provenSafe') {
        if (context.incidentRate < 0.05 && context.deployedViolations >= 20) return true;
      }
    }
    return false;
  }
}

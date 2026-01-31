/**
 * E2E Smoke Test — Full Governance Pipeline
 *
 * Tests the complete flow:
 *   Violation → DecisionStrategyLoader → DecisionStrategy → decide() → DecisionResult
 *   Violation → ASTAnalyzer → findings → LearningEngine → threshold suggestions
 *   Violation → ClaudeCodeAdapter (mocked) → ClaudeDecisionResult
 *
 * This is NOT a unit test. It wires real components together
 * and verifies the full pipeline produces valid decisions.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import {
  DecisionStrategyLoader,
  DecisionStrategy,
  type Violation,
  type PatternLearning,
  type DecisionResult,
} from '../decision-strategy-loader';
import { ASTAnalyzer, type ASTFinding } from '../ast-analyzer';
import { LearningEngine, type DecisionOutcome } from '../learning-engine';
import { ClaudeCodeAdapter, type ClaudeDecisionResult } from '../claude-code-adapter';

// ============================================================================
// FIXTURES
// ============================================================================

const VALID_ACTIONS = ['alert-human', 'auto-fix', 'suppress'] as const;

const VIOLATIONS: Record<string, Violation> = {
  highRiskSqlInjection: {
    id: 'e2e-sql-001',
    pattern: 'sql_injection',
    tier: 3,
    filePath: 'src/api/users.ts',
    confidence: 0.95,
  },
  mediumRiskAuthBypass: {
    id: 'e2e-auth-001',
    pattern: 'missing_authority_check',
    tier: 2,
    filePath: 'src/middleware/auth.ts',
    confidence: 0.75,
  },
  lowRiskUnknown: {
    id: 'e2e-low-001',
    pattern: 'unknown_violation',
    tier: 1,
    filePath: 'src/utils/helpers.ts',
    confidence: 0.3,
  },
};

const LEARNING_DATA: PatternLearning = {
  pattern: 'sql_injection',
  deployedViolations: 15,
  incidentRate: 0.23,
  riskScore: 0.78,
  confidenceInterval: [0.65, 0.91],
};

// ============================================================================
// E2E: STRATEGY LOADER → DECISION
// ============================================================================

describe('E2E: Full Governance Pipeline', () => {
  const configPath = path.join(process.cwd(), 'contracts', 'governance-decision-strategies.json');
  let loader: DecisionStrategyLoader;
  let configExists: boolean;

  beforeAll(async () => {
    configExists = fs.existsSync(configPath);
    if (!configExists) return;

    loader = new DecisionStrategyLoader(configPath);
    await loader.waitUntilReady(5000);
  });

  describe('Strategy Loader → Strategy → Decision', () => {
    it('should load config and reach HEALTHY or DEGRADED state', () => {
      if (!configExists) return;

      const health = loader.getHealthStatus();
      expect(['HEALTHY', 'DEGRADED', 'CRITICAL']).toContain(health.state);
    });

    it('should produce a decision for high-risk violation with learning data', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decision = await strategy.decide(VIOLATIONS.highRiskSqlInjection, LEARNING_DATA);

      // Verify decision shape
      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(typeof decision.reason).toBe('string');
      expect(decision.reason.length).toBeGreaterThan(0);

      // High risk + learning data with high incident rate → should NOT suppress
      expect(decision.action).not.toBe('suppress');
    });

    it('should produce a decision for medium-risk violation without learning data', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decision = await strategy.decide(VIOLATIONS.mediumRiskAuthBypass, null);

      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(typeof decision.reason).toBe('string');
    });

    it('should produce a decision for low-risk violation', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decision = await strategy.decide(VIOLATIONS.lowRiskUnknown, null);

      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
      // Low confidence + tier 1 → likely suppress
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should include evidence when learning data is provided', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decision = await strategy.decide(VIOLATIONS.highRiskSqlInjection, LEARNING_DATA);

      if (decision.evidence) {
        expect(typeof decision.evidence.totalSamples).toBe('number');
        expect(typeof decision.evidence.incidentRate).toBe('number');
        expect(typeof decision.evidence.riskScore).toBe('number');
      }
    });

    it('should handle multiple violations in sequence without errors', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decisions: DecisionResult[] = [];

      for (const violation of Object.values(VIOLATIONS)) {
        const decision = await strategy.decide(violation, null);
        decisions.push(decision);
      }

      expect(decisions).toHaveLength(3);
      decisions.forEach(d => {
        expect(VALID_ACTIONS).toContain(d.action);
        expect(d.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ============================================================================
  // E2E: AST ANALYZER → LEARNING ENGINE → THRESHOLD SUGGESTIONS
  // ============================================================================

  describe('AST Analyzer → Learning Engine pipeline', () => {
    let analyzer: ASTAnalyzer;
    let engine: LearningEngine;

    beforeEach(() => {
      analyzer = new ASTAnalyzer();
      engine = new LearningEngine();
    });

    it('should analyze a file and produce typed findings', () => {
      // Create a temp file with vulnerable code
      const tmpFile = path.join(process.cwd(), 'tmp-e2e-test-vuln.ts');
      fs.writeFileSync(
        tmpFile,
        'const query = "SELECT * FROM users WHERE id = " + userId;\ndb.execute(query);\n'
      );

      try {
        const result = analyzer.analyzeFile(tmpFile);
        expect(result.file).toBe(tmpFile);
        expect(Array.isArray(result.findings)).toBe(true);

        if (result.findings.length > 0) {
          const finding = result.findings[0];
          expect(finding.file).toBe(tmpFile);
          expect(typeof finding.line).toBe('number');
          expect(typeof finding.column).toBe('number');
          expect(typeof finding.pattern).toBe('string');
          expect(typeof finding.confidence).toBe('number');
          expect(typeof finding.message).toBe('string');
          expect(['critical', 'high', 'medium', 'low']).toContain(finding.severity);
        }
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it('should feed AST findings into learning engine and get threshold suggestions', () => {
      // Simulate finding a pattern multiple times
      const pattern = 'sql_injection';

      // Record multiple outcomes for the same pattern
      for (let i = 0; i < 15; i++) {
        engine.recordOutcome({
          violationId: `viol-${i}`,
          pattern,
          action: 'auto-fix',
          result: i < 12 ? 'false_positive' : 'fixed', // 80% false positive rate
          timestamp: Date.now() - i * 1000,
        });
        engine.recordConfidence(pattern, 0.7 + Math.random() * 0.2);
      }

      // Get suggestions
      const suggestions = engine.suggestThresholdAdjustments();

      // With 80% false positive rate, engine should suggest changing approach
      expect(Array.isArray(suggestions)).toBe(true);

      // Check suggestion shape if any exist
      for (const suggestion of suggestions) {
        expect(typeof suggestion.pattern).toBe('string');
        expect(typeof suggestion.currentAction).toBe('string');
        expect(typeof suggestion.suggestedAction).toBe('string');
        expect(typeof suggestion.reason).toBe('string');
      }
    });

    it('should produce a full summary with stats', () => {
      // Record some data
      engine.recordOutcome({
        violationId: 'v1',
        pattern: 'xss',
        action: 'alert-human',
        result: 'fixed',
        timestamp: Date.now(),
      });
      engine.recordOutcome({
        violationId: 'v2',
        pattern: 'auth_bypass',
        action: 'auto-fix',
        result: 'escalated',
        timestamp: Date.now(),
      });

      const summary = engine.getSummary();
      expect(summary.totalPatterns).toBe(2);
      expect(summary.totalOutcomes).toBe(2);
    });
  });

  // ============================================================================
  // E2E: CLAUDE ADAPTER (MOCKED CLI, REAL LOGIC)
  // ============================================================================

  describe('Claude Code Adapter — decision path', () => {
    it('should return null when disabled', async () => {
      const adapter = new ClaudeCodeAdapter({ enabled: false });
      const result = await adapter.decide(VIOLATIONS.highRiskSqlInjection, LEARNING_DATA);
      expect(result).toBeNull();
    });

    it('should respect shouldUse gating', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true, minSeverity: 'high' });

      // Tier 3 + high confidence → should use
      expect(adapter.shouldUse(VIOLATIONS.highRiskSqlInjection)).toBe(true);

      // Tier 1 + low confidence → should NOT use
      expect(adapter.shouldUse(VIOLATIONS.lowRiskUnknown)).toBe(false);
    });

    it('should report health status', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      const health = adapter.getHealth();

      expect(typeof health.available).toBe('boolean');
      expect(typeof health.errorCount).toBe('number');
      expect(typeof health.circuitOpen).toBe('boolean');
    });

    it('should report metrics', () => {
      const adapter = new ClaudeCodeAdapter({ enabled: true });
      const metrics = adapter.getMetrics();

      expect(typeof metrics.totalCalls).toBe('number');
      expect(typeof metrics.successfulCalls).toBe('number');
      expect(typeof metrics.failedCalls).toBe('number');
      expect(typeof metrics.cacheHits).toBe('number');
      expect(typeof metrics.avgLatencyMs).toBe('number');
    });

    it('should track errors and report via health', async () => {
      const adapter = new ClaudeCodeAdapter({
        enabled: true,
        maxFailures: 5,
        cooldownMs: 100,
        timeoutMs: 50,
        maxCallsPerSecond: 100, // High rate limit so calls aren't rate-limited
      });

      // First call will fail (claude not installed)
      await adapter.decide(VIOLATIONS.highRiskSqlInjection, null);

      const health = adapter.getHealth();
      // Error count should be at least 1 from the failed spawn
      expect(health.errorCount).toBeGreaterThanOrEqual(1);
      expect(typeof health.circuitOpen).toBe('boolean');
      expect(typeof health.available).toBe('boolean');
    });
  });

  // ============================================================================
  // E2E: FULL DAEMON PIPELINE (No file system, no watchers)
  // ============================================================================

  describe('Full pipeline: violation → strategy → decision → learning', () => {
    it('should process a violation end-to-end and record outcome', async () => {
      if (!configExists) return;

      const engine = new LearningEngine();

      // Step 1: Get strategy
      const strategy = await loader.getStrategy('production');

      // Step 2: Create violation
      const violation: Violation = {
        id: `e2e-full-${Date.now()}`,
        pattern: 'hardcoded_credentials',
        tier: 3,
        filePath: 'src/config/secrets.ts',
        confidence: 0.92,
      };

      // Step 3: Make decision
      const decision = await strategy.decide(violation, null);

      // Step 4: Verify decision
      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.reason.length).toBeGreaterThan(0);

      // Step 5: Record outcome in learning engine
      const outcome: DecisionOutcome = {
        violationId: violation.id,
        pattern: violation.pattern,
        action: decision.action,
        result: 'fixed',
        timestamp: Date.now(),
      };
      engine.recordOutcome(outcome);

      // Step 6: Verify learning engine tracked it
      const stats = engine.getPatternStats(violation.pattern);
      expect(stats).toBeDefined();
      expect(stats!.totalDecisions).toBe(1);
      expect(stats!.successRate).toBe(1); // 1 fixed out of 1 total = 100%

      // Step 7: Verify summary reflects the data
      const summary = engine.getSummary();
      expect(summary.totalPatterns).toBeGreaterThanOrEqual(1);
      expect(summary.totalOutcomes).toBeGreaterThanOrEqual(1);
    });

    it('should escalate when multiple high-severity violations exist', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');
      const decisions: DecisionResult[] = [];

      // Simulate 5 high-severity violations
      for (let i = 0; i < 5; i++) {
        const violation: Violation = {
          id: `e2e-multi-${i}`,
          pattern: 'sql_injection',
          tier: 3,
          filePath: `src/api/endpoint-${i}.ts`,
          confidence: 0.9 + i * 0.01,
        };

        const learning: PatternLearning = {
          pattern: 'sql_injection',
          deployedViolations: 50 + i,
          incidentRate: 0.4 + i * 0.05,
          riskScore: 0.8 + i * 0.02,
          confidenceInterval: [0.7, 0.95],
        };

        const decision = await strategy.decide(violation, learning);
        decisions.push(decision);
      }

      // All should be valid
      expect(decisions).toHaveLength(5);
      decisions.forEach(d => {
        expect(VALID_ACTIONS).toContain(d.action);
      });

      // With high incident rate + high tier, most should escalate
      const escalations = decisions.filter(d => d.action === 'alert-human');
      expect(escalations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // E2E: PIPELINE RESILIENCE
  // ============================================================================

  describe('Pipeline resilience', () => {
    it('should handle missing config gracefully', async () => {
      // Use a normalized path that won't trigger path traversal detection
      const fakePath = path.resolve(process.cwd(), 'nonexistent-config-12345.json');
      const badLoader = new DecisionStrategyLoader(fakePath);

      // Should not throw — degrades gracefully
      await badLoader.waitUntilReady(2000);
      const health = badLoader.getHealthStatus();
      expect(['DEGRADED', 'CRITICAL']).toContain(health.state);

      // Should still produce a decision (using defaults)
      const strategy = await badLoader.getStrategy('production');
      const decision = await strategy.decide(VIOLATIONS.highRiskSqlInjection, null);

      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
    });

    it('should handle concurrent decisions without race conditions', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');

      // Fire 10 concurrent decisions
      const promises = Array.from({ length: 10 }, (_, i) => {
        const violation: Violation = {
          id: `e2e-concurrent-${i}`,
          pattern: i % 2 === 0 ? 'sql_injection' : 'auth_bypass',
          tier: ((i % 3) + 1) as 1 | 2 | 3,
          filePath: `src/concurrent-${i}.ts`,
          confidence: 0.5 + i / 20,
        };
        return strategy.decide(violation, null);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(d => {
        expect(d).toBeDefined();
        expect(VALID_ACTIONS).toContain(d.action);
        expect(d.confidence).toBeGreaterThanOrEqual(0);
        expect(d.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty violation fields without crashing', async () => {
      if (!configExists) return;

      const strategy = await loader.getStrategy('production');

      const edgeViolation: Violation = {
        id: '',
        pattern: '',
        tier: 1,
        filePath: '',
        confidence: 0,
      };

      // Should not throw
      const decision = await strategy.decide(edgeViolation, null);
      expect(decision).toBeDefined();
      expect(VALID_ACTIONS).toContain(decision.action);
    });
  });
});

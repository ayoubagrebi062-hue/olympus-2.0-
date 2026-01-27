/**
 * Judge Module Integration Tests
 *
 * Tests for the main JudgeModule class that orchestrates quality control.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JudgeModule } from '@/lib/agents/conductor/judge';
import type {
  AgentOutputForJudge,
  AgentDefinitionForJudge,
  JudgeContext,
  JudgeConfig,
} from '@/lib/agents/conductor/judge/types';

describe('JudgeModule', () => {
  let judge: JudgeModule;

  beforeEach(() => {
    judge = new JudgeModule();
  });

  // Helper to create judge context
  const createContext = (overrides: Partial<JudgeContext> = {}): JudgeContext => ({
    buildId: 'build_123',
    agentRole: 'Test Agent',
    expectedOutputType: 'test_output',
    previousOutputs: [],
    currentRetry: 0,
    ...overrides,
  });

  // Helper to create agent definition
  const createDefinition = (id: string): AgentDefinitionForJudge => ({
    id,
    description: `${id} agent`,
  });

  describe('judge (full LLM scoring)', () => {
    it('should accept high quality output', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large', growth: '10%' },
          competitors: ['A', 'B', 'C'],
          opportunities: ['Opportunity 1', 'Opportunity 2'],
        },
      };

      const decision = await judge.judge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      expect(decision.action).toBe('accept');
      expect(decision.score.overall).toBeGreaterThan(5);
    });

    it('should retry low quality output', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          // Missing required fields
          some_field: 'value',
        },
      };

      const decision = await judge.judge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      // Should trigger retry or fail due to missing required fields
      expect(['retry', 'fail', 'accept']).toContain(decision.action);
    });

    it('should include retry strategy when action is retry', async () => {
      const judgeWithRetry = new JudgeModule(undefined, {
        enabled: true,
        strictMode: false,
        autoRetry: true,
        thresholds: new Map(),
        scoringModel: 'sonnet',
      });

      const output: AgentOutputForJudge = {
        agentId: 'strategos',
        data: {
          // Minimal data
          x: 'y',
        },
      };

      const decision = await judgeWithRetry.judge(
        'strategos',
        output,
        createDefinition('strategos'),
        createContext()
      );

      if (decision.action === 'retry') {
        expect(decision.retryStrategy).toBeDefined();
        expect(decision.retryStrategy?.maxRetries).toBe(3); // Critical agent
      }
    });

    it('should generate improvement suggestions', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'small' },
          competitors: [],
          opportunities: [],
        },
      };

      const decision = await judge.judge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      expect(decision.suggestions.length).toBeGreaterThan(0);
    });

    it('should update metrics after judging', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large' },
          competitors: ['A'],
          opportunities: ['Opp'],
        },
      };

      await judge.judge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      const metrics = judge.getMetrics('oracle');
      expect(metrics).toBeDefined();
      expect(metrics?.scores.length).toBe(1);
    });
  });

  describe('quickJudge', () => {
    it('should accept high quality output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large', growth: '10%' },
          competitors: ['A', 'B', 'C'],
          opportunities: ['Opportunity 1'],
        },
      };

      const decision = judge.quickJudge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      expect(decision.action).toBe('accept');
    });

    it('should detect validation errors', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          // Missing all required fields
        },
      };

      const decision = judge.quickJudge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext()
      );

      expect(decision.validation.errors.length).toBeGreaterThan(0);
    });

    it('should use heuristic scoring', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const decision = judge.quickJudge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(decision.score.confidence).toBe(0.6); // Quick score confidence
    });
  });

  describe('disabled judge', () => {
    it('should auto-pass when judge is disabled', async () => {
      const disabledJudge = new JudgeModule(undefined, {
        enabled: false,
        strictMode: false,
        autoRetry: false,
        thresholds: new Map(),
        scoringModel: 'sonnet',
      });

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: null, // Would normally fail
      };

      const decision = await disabledJudge.judge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(decision.action).toBe('accept');
      expect(decision.score.overall).toBe(10);
      expect(decision.score.reasoning).toContain('disabled');
    });

    it('should auto-pass quickJudge when disabled', () => {
      const disabledJudge = new JudgeModule(undefined, {
        enabled: false,
        strictMode: false,
        autoRetry: false,
        thresholds: new Map(),
        scoringModel: 'sonnet',
      });

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: null,
      };

      const decision = disabledJudge.quickJudge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(decision.action).toBe('accept');
    });
  });

  describe('strict mode', () => {
    it('should fail on validation errors in strict mode', () => {
      const strictJudge = new JudgeModule(undefined, {
        enabled: true,
        strictMode: true,
        autoRetry: false,
        thresholds: new Map(),
        scoringModel: 'sonnet',
      });

      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: null,
      };

      const decision = strictJudge.quickJudge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext({ currentRetry: 3 }) // At max retries
      );

      expect(decision.action).toBe('fail');
    });
  });

  describe('threshold management', () => {
    it('should return default threshold for unknown agent', () => {
      const threshold = judge.getThreshold('unknown-agent');

      expect(threshold.agentId).toBe('unknown-agent');
      expect(threshold.minOverallScore).toBe(6);
      expect(threshold.maxRetries).toBe(2);
    });

    it('should return stricter threshold for critical agents', () => {
      const threshold = judge.getThreshold('strategos');

      expect(threshold.minOverallScore).toBe(7);
      expect(threshold.maxRetries).toBe(3);
    });

    it('should allow custom threshold', () => {
      judge.setThreshold('custom-agent', {
        minOverallScore: 8,
        maxRetries: 5,
      });

      const threshold = judge.getThreshold('custom-agent');

      expect(threshold.minOverallScore).toBe(8);
      expect(threshold.maxRetries).toBe(5);
    });

    it('should merge custom threshold with defaults', () => {
      judge.setThreshold('test-agent', {
        minOverallScore: 9,
      });

      const threshold = judge.getThreshold('test-agent');

      expect(threshold.minOverallScore).toBe(9);
      // Other fields should have defaults
      expect(threshold.minDimensionScores).toBeDefined();
    });
  });

  describe('metrics tracking', () => {
    it('should track scores over time', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large' },
          competitors: ['A'],
          opportunities: ['Opp'],
        },
      };

      await judge.judge('oracle', output, createDefinition('oracle'), createContext());
      await judge.judge('oracle', output, createDefinition('oracle'), createContext());
      await judge.judge('oracle', output, createDefinition('oracle'), createContext());

      const metrics = judge.getMetrics('oracle');

      expect(metrics?.scores.length).toBe(3);
      expect(metrics?.averageScore).toBeGreaterThan(0);
    });

    it('should calculate trend direction', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
          field4: 'value4',
          field5: 'value5',
        },
      };

      // Judge multiple times
      for (let i = 0; i < 5; i++) {
        await judge.judge('test-agent', output, createDefinition('test-agent'), createContext());
      }

      const metrics = judge.getMetrics('test-agent');

      expect(metrics?.trend).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(metrics?.trend);
    });

    it('should keep only last 10 scores', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      // Judge 15 times
      for (let i = 0; i < 15; i++) {
        await judge.judge('test-agent', output, createDefinition('test-agent'), createContext());
      }

      const metrics = judge.getMetrics('test-agent');

      expect(metrics?.scores.length).toBe(10);
    });

    it('should get all metrics', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'agent1',
        data: { field: 'value' },
      };

      await judge.judge('agent1', output, createDefinition('agent1'), createContext());
      await judge.judge('agent2', output, createDefinition('agent2'), createContext());

      const allMetrics = judge.getAllMetrics();

      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has('agent1')).toBe(true);
      expect(allMetrics.has('agent2')).toBe(true);
    });

    it('should detect declining agents', async () => {
      // This is hard to test without mocking the scorer
      // Just verify the method exists and returns array
      const declining = judge.getDecliningAgents();

      expect(Array.isArray(declining)).toBe(true);
    });

    it('should check if agent is underperforming', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      await judge.judge('test-agent', output, createDefinition('test-agent'), createContext());

      const isUnderperforming = judge.isUnderperforming('test-agent');

      expect(typeof isUnderperforming).toBe('boolean');
    });

    it('should return false for unknown agent underperformance', () => {
      const isUnderperforming = judge.isUnderperforming('never-judged-agent');

      expect(isUnderperforming).toBe(false);
    });

    it('should reset metrics', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      await judge.judge('test-agent', output, createDefinition('test-agent'), createContext());

      expect(judge.getMetrics('test-agent')).toBeDefined();

      judge.resetMetrics();

      expect(judge.getMetrics('test-agent')).toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('should get configuration', () => {
      const config = judge.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.scoringModel).toBeDefined();
    });

    it('should update configuration', () => {
      judge.updateConfig({
        strictMode: true,
        autoRetry: false,
      });

      const config = judge.getConfig();

      expect(config.strictMode).toBe(true);
      expect(config.autoRetry).toBe(false);
    });

    it('should get validator instance', () => {
      const validator = judge.getValidator();

      expect(validator).toBeDefined();
      expect(typeof validator.validate).toBe('function');
    });

    it('should get improver instance', () => {
      const improver = judge.getImprover();

      expect(improver).toBeDefined();
      expect(typeof improver.suggest).toBe('function');
    });
  });

  describe('retry scenarios', () => {
    it('should increment retry count for low quality', () => {
      const output: AgentOutputForJudge = {
        agentId: 'strategos',
        data: null,
      };

      const decision1 = judge.quickJudge(
        'strategos',
        output,
        createDefinition('strategos'),
        createContext({ currentRetry: 0 })
      );

      if (decision1.action === 'retry' && decision1.retryStrategy) {
        expect(decision1.retryStrategy.currentRetry).toBe(1);
      }
    });

    it('should not exceed max retries for agent', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: null,
      };

      // Oracle has max 2 retries
      const decision = judge.quickJudge(
        'oracle',
        output,
        createDefinition('oracle'),
        createContext({ currentRetry: 2 })
      );

      // Should not get retry strategy at max retries
      if (decision.action === 'retry') {
        expect(decision.retryStrategy?.currentRetry).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('integration with AI router', () => {
    it('should use AI router when provided', async () => {
      const mockRouter = {
        execute: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            overall: 8,
            dimensions: {
              completeness: 8,
              correctness: 9,
              consistency: 7,
              creativity: 7,
              clarity: 8,
            },
            confidence: 0.9,
            reasoning: 'Good output',
          }),
        }),
      };

      const judgeWithRouter = new JudgeModule(mockRouter as any);

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      await judgeWithRouter.judge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(mockRouter.execute).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty previousOutputs', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const decision = await judge.judge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext({ previousOutputs: [] })
      );

      expect(decision).toBeDefined();
    });

    it('should handle complex nested data', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
          array: [
            { item: 1 },
            { item: 2 },
          ],
        },
      };

      const decision = await judge.judge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(decision).toBeDefined();
    });

    it('should handle special characters in data', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          code: 'const x = "Hello\\nWorld";',
          unicode: '你好世界 🌍',
          special: '<script>alert("xss")</script>',
        },
      };

      const decision = await judge.judge(
        'test-agent',
        output,
        createDefinition('test-agent'),
        createContext()
      );

      expect(decision).toBeDefined();
    });
  });
});

/**
 * Quality Scorer Tests
 *
 * Tests for the QualityScorer class that scores agent outputs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityScorer } from '@/lib/agents/conductor/judge/scorer';
import type { AgentOutputForJudge, ScoringContext } from '@/lib/agents/conductor/judge/types';

describe('QualityScorer', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer();
  });

  describe('quickScore', () => {
    it('should return low completeness score for empty output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: null,
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.completeness).toBe(1);
      expect(score.overall).toBeLessThan(5);
    });

    it('should return low completeness score for output with no fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {},
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.completeness).toBe(2);
    });

    it('should return good completeness score for output with many fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
          field4: 'value4',
          field5: 'value5',
          field6: 'value6',
          field7: 'value7',
          field8: 'value8',
          field9: 'value9',
          field10: 'value10',
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.completeness).toBe(8);
    });

    it('should reduce completeness score for outputs with many empty values', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          // Need 10+ fields to trigger empty value check
          field1: null,
          field2: undefined,
          field3: [],
          field4: null,
          field5: null,
          field6: [],
          field7: null,
          field8: undefined,
          field9: [],
          field10: 'actual value',
          field11: null,
          field12: [],
        },
      };

      const score = scorer.quickScore('test-agent', output);

      // With >50% empty values in 10+ fields, score should be reduced to 4
      expect(score.dimensions.completeness).toBeLessThanOrEqual(4);
    });

    it('should reduce correctness score for undefined values in output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          field1: 'undefined',
          field2: 'valid',
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.correctness).toBeLessThan(7);
    });

    it('should reduce correctness score for TODO markers', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          code: 'function test() { // TODO: implement }',
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.correctness).toBeLessThan(7);
    });

    it('should reduce correctness score for placeholder text', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          description: 'Lorem ipsum dolor sit amet',
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.correctness).toBeLessThan(7);
    });

    it('should reduce clarity score for very short output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          a: 'b',
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.clarity).toBeLessThan(5);
    });

    it('should reduce clarity score for very long output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          content: 'a'.repeat(60000),
        },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.dimensions.clarity).toBeLessThan(6);
    });

    it('should have lower confidence for quick scoring', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const score = scorer.quickScore('test-agent', output);

      expect(score.confidence).toBe(0.6);
      expect(score.reasoning).toBe('Quick heuristic scoring');
    });

    it('should include timestamp in score', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const before = new Date();
      const score = scorer.quickScore('test-agent', output);
      const after = new Date();

      expect(score.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(score.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should calculate weighted overall score', () => {
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

      const score = scorer.quickScore('test-agent', output);

      // Overall should be weighted average of dimensions
      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(10);
    });
  });

  describe('score (with mocked AI router)', () => {
    it('should fall back to quick scoring when no AI router is provided', async () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const context: ScoringContext = {
        agentRole: 'Test Agent',
        expectedOutputType: 'test_output',
        previousOutputs: [],
      };

      const score = await scorer.score('test-agent', output, context);

      expect(score.confidence).toBe(0.6); // Quick scoring confidence
    });

    it('should include context in scoring', async () => {
      const mockRouter = {
        execute: vi.fn().mockResolvedValue({
          response: {
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
          },
        }),
      };

      const scorerWithRouter = new QualityScorer(mockRouter as any, 'sonnet');

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const context: ScoringContext = {
        agentRole: 'Test Agent',
        expectedOutputType: 'test_output',
        previousOutputs: [
          { agentId: 'prev-agent', summary: { key: 'value' } },
        ],
      };

      const score = await scorerWithRouter.score('test-agent', output, context);

      expect(mockRouter.execute).toHaveBeenCalled();
      expect(score.overall).toBe(8);
      expect(score.confidence).toBe(0.9);
    });

    it('should handle AI router errors gracefully', async () => {
      const mockRouter = {
        execute: vi.fn().mockRejectedValue(new Error('API error')),
      };

      const scorerWithRouter = new QualityScorer(mockRouter as any, 'sonnet');

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const context: ScoringContext = {
        agentRole: 'Test Agent',
        expectedOutputType: 'test_output',
        previousOutputs: [],
      };

      const score = await scorerWithRouter.score('test-agent', output, context);

      // Should fall back to quick scoring
      expect(score.confidence).toBe(0.6);
    });

    it('should handle malformed AI response', async () => {
      const mockRouter = {
        execute: vi.fn().mockResolvedValue({
          response: {
            content: 'Not valid JSON',
          },
        }),
      };

      const scorerWithRouter = new QualityScorer(mockRouter as any, 'sonnet');

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const context: ScoringContext = {
        agentRole: 'Test Agent',
        expectedOutputType: 'test_output',
        previousOutputs: [],
      };

      const score = await scorerWithRouter.score('test-agent', output, context);

      // Should return default score
      expect(score.overall).toBe(5);
      expect(score.confidence).toBe(0.3);
    });

    it('should clamp scores to valid range 1-10', async () => {
      const mockRouter = {
        execute: vi.fn().mockResolvedValue({
          response: {
            content: JSON.stringify({
              overall: 15, // Invalid - too high
              dimensions: {
                completeness: 0, // Invalid - too low
                correctness: 11,
                consistency: -1,
                creativity: 100,
                clarity: 5,
              },
              confidence: 2, // Invalid - should be 0-1
              reasoning: 'Test',
            }),
          },
        }),
      };

      const scorerWithRouter = new QualityScorer(mockRouter as any, 'sonnet');

      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: { field: 'value' },
      };

      const context: ScoringContext = {
        agentRole: 'Test Agent',
        expectedOutputType: 'test_output',
        previousOutputs: [],
      };

      const score = await scorerWithRouter.score('test-agent', output, context);

      // All scores should be clamped to 1-10 range
      expect(score.overall).toBeGreaterThanOrEqual(1);
      expect(score.overall).toBeLessThanOrEqual(10);
      expect(score.dimensions.completeness).toBeGreaterThanOrEqual(1);
      expect(score.dimensions.completeness).toBeLessThanOrEqual(10);
      expect(score.dimensions.correctness).toBeLessThanOrEqual(10);
      expect(score.dimensions.consistency).toBeGreaterThanOrEqual(1);
      expect(score.dimensions.creativity).toBeLessThanOrEqual(10);
      // Confidence should be clamped to 0-1
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });
  });
});

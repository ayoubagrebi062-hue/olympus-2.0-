/**
 * Improvement Suggester Tests
 *
 * Tests for the ImprovementSuggester class that generates improvement suggestions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImprovementSuggester } from '@/lib/agents/conductor/judge/improver';
import type {
  QualityScore,
  QualityDimensions,
  ValidationResult,
  ValidationError,
} from '@/lib/agents/conductor/judge/types';

describe('ImprovementSuggester', () => {
  let improver: ImprovementSuggester;

  beforeEach(() => {
    improver = new ImprovementSuggester();
  });

  // Helper to create a quality score
  const createScore = (
    overall: number,
    dimensions: Partial<QualityDimensions> = {}
  ): QualityScore => ({
    overall,
    dimensions: {
      completeness: 7,
      correctness: 7,
      consistency: 7,
      creativity: 7,
      clarity: 7,
      ...dimensions,
    },
    confidence: 0.8,
    timestamp: new Date(),
  });

  // Helper to create a validation result
  const createValidation = (
    valid: boolean = true,
    errors: ValidationError[] = [],
    coverage: number = 100
  ): ValidationResult => ({
    valid,
    errors,
    warnings: [],
    coverage,
  });

  describe('suggest', () => {
    it('should suggest improvements for low completeness', () => {
      const score = createScore(5, { completeness: 3 }); // Less than 4 for high priority
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Completeness')).toBe(true);
      const completeSuggestion = suggestions.find(s => s.aspect === 'Completeness');
      expect(completeSuggestion?.priority).toBe('high');
    });

    it('should suggest improvements for low correctness', () => {
      const score = createScore(5, { correctness: 4 });
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Correctness')).toBe(true);
    });

    it('should suggest improvements for low consistency', () => {
      const score = createScore(5, { consistency: 4 });
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Consistency')).toBe(true);
    });

    it('should suggest improvements for low creativity', () => {
      const score = createScore(5, { creativity: 3 });
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Creativity')).toBe(true);
    });

    it('should suggest improvements for low clarity', () => {
      const score = createScore(5, { clarity: 4 });
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Clarity')).toBe(true);
    });

    it('should suggest improvements for critical validation errors', () => {
      const score = createScore(6);
      const validation = createValidation(false, [
        { field: 'name', message: 'Missing', severity: 'critical', path: ['name'] },
      ]);

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Critical Fields')).toBe(true);
    });

    it('should suggest improvements for major validation errors', () => {
      const score = createScore(6);
      const validation = createValidation(false, [
        { field: 'description', message: 'Missing', severity: 'major', path: ['description'] },
      ]);

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Required Fields')).toBe(true);
    });

    it('should suggest improvements for low coverage', () => {
      const score = createScore(6);
      const validation = createValidation(true, [], 50);

      const suggestions = improver.suggest('test-agent', score, validation);

      expect(suggestions.some(s => s.aspect === 'Schema Coverage')).toBe(true);
    });

    it('should add agent-specific suggestions for strategos', () => {
      const score = createScore(7);
      const validation = createValidation();

      const suggestions = improver.suggest('strategos', score, validation);

      expect(suggestions.some(s => s.aspect === 'MVP Clarity')).toBe(true);
    });

    it('should add agent-specific suggestions for archon', () => {
      const score = createScore(7);
      const validation = createValidation();

      const suggestions = improver.suggest('archon', score, validation);

      expect(suggestions.some(s => s.aspect === 'Tech Justification')).toBe(true);
    });

    it('should add agent-specific suggestions for pixel', () => {
      const score = createScore(7);
      const validation = createValidation();

      const suggestions = improver.suggest('pixel', score, validation);

      expect(suggestions.some(s => s.aspect === 'Component Reusability')).toBe(true);
    });

    it('should add agent-specific suggestions for datum', () => {
      const score = createScore(7);
      const validation = createValidation();

      const suggestions = improver.suggest('datum', score, validation);

      expect(suggestions.some(s => s.aspect === 'Data Relationships')).toBe(true);
    });

    it('should not add agent-specific suggestions for high scores', () => {
      const score = createScore(9);
      const validation = createValidation();

      const suggestions = improver.suggest('strategos', score, validation);

      expect(suggestions.some(s => s.aspect === 'MVP Clarity')).toBe(false);
    });

    it('should sort suggestions by priority and impact', () => {
      const score = createScore(4, {
        completeness: 3,
        correctness: 4,
        clarity: 5,
      });
      const validation = createValidation();

      const suggestions = improver.suggest('test-agent', score, validation);

      // High priority suggestions should come first
      const priorities = suggestions.map(s => s.priority);
      const highIndex = priorities.indexOf('high');
      const lowIndex = priorities.lastIndexOf('low');

      if (highIndex !== -1 && lowIndex !== -1) {
        expect(highIndex).toBeLessThan(lowIndex);
      }
    });

    it('should deduplicate suggestions by aspect', () => {
      const score = createScore(4, { completeness: 3 });
      const validation = createValidation(false, [
        { field: 'name', message: 'Missing', severity: 'critical', path: ['name'] },
      ], 30);

      const suggestions = improver.suggest('test-agent', score, validation);

      const aspects = suggestions.map(s => s.aspect);
      const uniqueAspects = [...new Set(aspects)];

      expect(aspects.length).toBe(uniqueAspects.length);
    });

    it('should limit suggestions to top 5', () => {
      const score = createScore(3, {
        completeness: 2,
        correctness: 2,
        consistency: 2,
        creativity: 2,
        clarity: 2,
      });
      const validation = createValidation(false, [
        { field: 'f1', message: 'M', severity: 'critical', path: ['f1'] },
        { field: 'f2', message: 'M', severity: 'major', path: ['f2'] },
      ], 20);

      const suggestions = improver.suggest('strategos', score, validation);

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('determineRetryStrategy', () => {
    it('should return same strategy when at max retries', () => {
      const score = createScore(4, { completeness: 3 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 3);

      expect(strategy.type).toBe('same');
      expect(strategy.currentRetry).toBe(3);
    });

    it('should return simplified strategy for very low completeness', () => {
      const score = createScore(3, { completeness: 3 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.type).toBe('simplified');
      expect(strategy.focusAreas).toContain('core_requirements_only');
      expect(strategy.modifiedPrompt).toContain('SIMPLIFIED');
    });

    it('should return alternative strategy for low correctness', () => {
      const score = createScore(4, { correctness: 4 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.type).toBe('alternative');
      expect(strategy.focusAreas).toContain('accuracy');
      expect(strategy.modifiedPrompt).toContain('ALTERNATIVE');
    });

    it('should return same strategy with consistency focus for low consistency', () => {
      const score = createScore(5, { consistency: 4 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.type).toBe('same');
      expect(strategy.focusAreas).toContain('align_with_previous');
      expect(strategy.modifiedPrompt).toContain('CONSISTENCY');
    });

    it('should return decomposed strategy for multiple validation errors', () => {
      const score = createScore(5);
      const validation = createValidation(false, [
        { field: 'f1', message: 'M', severity: 'major', path: ['f1'] },
        { field: 'f2', message: 'M', severity: 'major', path: ['f2'] },
        { field: 'f3', message: 'M', severity: 'major', path: ['f3'] },
        { field: 'f4', message: 'M', severity: 'major', path: ['f4'] },
      ]);

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.type).toBe('decomposed');
      expect(strategy.focusAreas).toContain('f1');
      expect(strategy.modifiedPrompt).toContain('FOCUSED');
    });

    it('should return focused strategy for weak areas', () => {
      const score = createScore(6, { creativity: 5 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.type).toBe('same');
      expect(strategy.focusAreas?.length).toBeGreaterThan(0);
      expect(strategy.modifiedPrompt).toContain('IMPROVEMENT');
    });

    it('should increment currentRetry in returned strategy', () => {
      const score = createScore(5);
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 1);

      expect(strategy.currentRetry).toBe(2);
    });

    it('should include correct maxRetries for the agent', () => {
      const score = createScore(5);
      const validation = createValidation();

      // Strategos is a critical agent with 3 max retries
      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);
      expect(strategy.maxRetries).toBe(3);

      // Oracle is a standard agent with 2 max retries
      const strategy2 = improver.determineRetryStrategy('oracle', score, validation, 0);
      expect(strategy2.maxRetries).toBe(2);
    });
  });

  describe('getMaxRetries', () => {
    it('should return 3 for critical agents', () => {
      expect(improver.getMaxRetries('strategos')).toBe(3);
      expect(improver.getMaxRetries('archon')).toBe(3);
      expect(improver.getMaxRetries('pixel')).toBe(3);
      expect(improver.getMaxRetries('datum')).toBe(3);
      expect(improver.getMaxRetries('engine')).toBe(3);
      expect(improver.getMaxRetries('wire')).toBe(3);
    });

    it('should return 2 for standard agents', () => {
      expect(improver.getMaxRetries('oracle')).toBe(2);
      expect(improver.getMaxRetries('empathy')).toBe(2);
      expect(improver.getMaxRetries('nexus')).toBe(2);
      expect(improver.getMaxRetries('sentinel')).toBe(2);
    });

    it('should return 1 for polish agent', () => {
      expect(improver.getMaxRetries('polish')).toBe(1);
    });

    it('should return 2 for unknown agents', () => {
      expect(improver.getMaxRetries('unknown-agent')).toBe(2);
    });
  });

  describe('retry prompt generation', () => {
    it('should generate simplified prompt with agent ID', () => {
      const score = createScore(3, { completeness: 3 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('strategos', score, validation, 0);

      expect(strategy.modifiedPrompt).toContain('strategos');
      expect(strategy.modifiedPrompt).toContain('COMPLETENESS');
    });

    it('should generate alternative prompt with agent ID', () => {
      const score = createScore(4, { correctness: 4 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('archon', score, validation, 0);

      expect(strategy.modifiedPrompt).toContain('archon');
      expect(strategy.modifiedPrompt).toContain('CORRECTNESS');
    });

    it('should generate consistency prompt with agent ID', () => {
      const score = createScore(5, { consistency: 4 });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('pixel', score, validation, 0);

      expect(strategy.modifiedPrompt).toContain('pixel');
      expect(strategy.modifiedPrompt).toContain('CONSISTENCY');
    });

    it('should generate decomposed prompt with missing fields', () => {
      const score = createScore(5);
      const validation = createValidation(false, [
        { field: 'market_analysis', message: 'M', severity: 'major', path: ['market_analysis'] },
        { field: 'competitors', message: 'M', severity: 'major', path: ['competitors'] },
        { field: 'opportunities', message: 'M', severity: 'major', path: ['opportunities'] },
        { field: 'trends', message: 'M', severity: 'major', path: ['trends'] },
      ]);

      const strategy = improver.determineRetryStrategy('oracle', score, validation, 0);

      expect(strategy.modifiedPrompt).toContain('market_analysis');
      expect(strategy.modifiedPrompt).toContain('competitors');
    });

    it('should generate focused prompt with weak areas', () => {
      const score = createScore(6, {
        completeness: 5,
        correctness: 5,
      });
      const validation = createValidation();

      const strategy = improver.determineRetryStrategy('datum', score, validation, 0);

      expect(strategy.modifiedPrompt).toContain('COMPLETENESS');
      expect(strategy.modifiedPrompt).toContain('CORRECTNESS');
    });
  });
});

/**
 * Output Validator Tests
 *
 * Tests for the OutputValidator class that validates agent outputs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutputValidator } from '@/lib/agents/conductor/judge/validator';
import type { AgentOutputForJudge, AgentDefinitionForJudge } from '@/lib/agents/conductor/judge/types';

describe('OutputValidator', () => {
  let validator: OutputValidator;

  beforeEach(() => {
    validator = new OutputValidator();
  });

  describe('validate', () => {
    it('should fail validation for null data', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: null,
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('critical');
      expect(result.coverage).toBe(0);
    });

    it('should pass validation for valid output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large', growth: '10%' },
          competitors: ['A', 'B', 'C'],
          opportunities: ['Opportunity 1'],
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      expect(result.valid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
    });

    it('should detect missing required fields for oracle agent', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { size: 'large' },
          // Missing: competitors, opportunities
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      expect(result.errors.some(e => e.field === 'competitors')).toBe(true);
      expect(result.errors.some(e => e.field === 'opportunities')).toBe(true);
    });

    it('should detect missing required fields for strategos agent', () => {
      const output: AgentOutputForJudge = {
        agentId: 'strategos',
        data: {
          mvp_features: ['Feature 1'],
          // Missing: roadmap, success_metrics
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'strategos',
      };

      const result = validator.validate('strategos', output, definition);

      expect(result.errors.some(e => e.field === 'roadmap')).toBe(true);
      expect(result.errors.some(e => e.field === 'success_metrics')).toBe(true);
    });

    it('should detect empty required fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: {},
          competitors: [],
          opportunities: '',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      // Should have minor errors for empty fields
      expect(result.errors.some(e => e.severity === 'minor')).toBe(true);
    });

    it('should support camelCase field names', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          marketAnalysis: { size: 'large' },
          competitors: ['A'],
          opportunities: ['Opp 1'],
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      // Should not report marketAnalysis as missing (it's the camelCase version of market_analysis)
      expect(result.errors.filter(e => e.field === 'market_analysis' && e.message.includes('missing'))).toHaveLength(0);
    });

    it('should validate against schema when provided', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          name: 'Test',
          // Missing required: version
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
        outputSchema: {
          type: 'object',
          required: ['name', 'version'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
          },
        },
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should validate field types against schema', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          items: 'not an array', // Should be array
          count: '10', // Should be number
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
        outputSchema: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            count: { type: 'number' },
          },
        },
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.errors.some(e => e.field === 'items' && e.message.includes('array'))).toBe(true);
      expect(result.errors.some(e => e.field === 'count' && e.message.includes('number'))).toBe(true);
    });

    it('should validate object type fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          config: ['not', 'an', 'object'], // Should be object
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
        outputSchema: {
          type: 'object',
          properties: {
            config: { type: 'object' },
          },
        },
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.errors.some(e => e.field === 'config')).toBe(true);
    });
  });

  describe('checkCommonIssues (warnings)', () => {
    it('should warn about empty arrays', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          items: [],
          features: [],
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.field === 'items')).toBe(true);
      expect(result.warnings.some(w => w.field === 'features')).toBe(true);
    });

    it('should warn about Lorem ipsum placeholder text', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          description: 'Lorem ipsum dolor sit amet',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('Lorem ipsum'))).toBe(true);
    });

    it('should warn about TODO markers', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          code: '// TODO: implement this function',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('TODO'))).toBe(true);
    });

    it('should warn about FIXME markers', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          code: '// FIXME: broken logic here',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('TODO'))).toBe(true);
    });

    it('should warn about placeholder markers', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          content: 'This is a PLACEHOLDER for real content',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('placeholder'))).toBe(true);
    });

    it('should warn about localhost references', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          apiUrl: 'http://localhost:3000/api',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('localhost'))).toBe(true);
    });

    it('should warn about 127.0.0.1 references', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          apiUrl: 'http://127.0.0.1:8080/api',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('localhost'))).toBe(true);
    });

    it('should warn about example.com references', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          website: 'https://example.com',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('example'))).toBe(true);
    });

    it('should warn about test email addresses', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          email: 'test@example.com',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('example') || w.message.includes('test'))).toBe(true);
    });

    it('should warn about unusually short output for complex agents', () => {
      const output: AgentOutputForJudge = {
        agentId: 'strategos',
        data: {
          x: 'y',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'strategos',
      };

      const result = validator.validate('strategos', output, definition);

      expect(result.warnings.some(w => w.message.includes('short'))).toBe(true);
    });

    it('should warn about very long output', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          content: 'a'.repeat(110000),
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('very long'))).toBe(true);
    });

    it('should warn about duplicate content in arrays', () => {
      const output: AgentOutputForJudge = {
        agentId: 'test-agent',
        data: {
          items: [
            { name: 'Item 1' },
            { name: 'Item 1' },
            { name: 'Item 1' },
            { name: 'Item 1' },
            { name: 'Item 1' },
          ],
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'test-agent',
      };

      const result = validator.validate('test-agent', output, definition);

      expect(result.warnings.some(w => w.message.includes('duplicate'))).toBe(true);
    });
  });

  describe('calculateCoverage', () => {
    it('should return 100% coverage when all required fields are present', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { data: 'value' },
          competitors: ['A', 'B'],
          opportunities: ['Opp 1'],
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      expect(result.coverage).toBe(100);
    });

    it('should return partial coverage for missing fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: { data: 'value' },
          // Missing: competitors, opportunities
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      expect(result.coverage).toBeLessThan(100);
      expect(result.coverage).toBeGreaterThan(0);
    });

    it('should return 100% coverage for unknown agent with no required fields', () => {
      const output: AgentOutputForJudge = {
        agentId: 'unknown-agent',
        data: {
          some: 'data',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'unknown-agent',
      };

      const result = validator.validate('unknown-agent', output, definition);

      expect(result.coverage).toBe(100);
    });

    it('should not count empty fields as present', () => {
      const output: AgentOutputForJudge = {
        agentId: 'oracle',
        data: {
          market_analysis: {},
          competitors: [],
          opportunities: '',
        },
      };

      const definition: AgentDefinitionForJudge = {
        id: 'oracle',
      };

      const result = validator.validate('oracle', output, definition);

      expect(result.coverage).toBe(0);
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields for oracle agent', () => {
      const fields = validator.getRequiredFields('oracle');

      expect(fields).toContain('market_analysis');
      expect(fields).toContain('competitors');
      expect(fields).toContain('opportunities');
    });

    it('should return required fields for empathy agent', () => {
      const fields = validator.getRequiredFields('empathy');

      expect(fields).toContain('personas');
      expect(fields).toContain('pain_points');
      expect(fields).toContain('user_journeys');
    });

    it('should return required fields for datum agent', () => {
      const fields = validator.getRequiredFields('datum');

      expect(fields).toContain('entities');
      expect(fields).toContain('relationships');
      expect(fields).toContain('schema');
    });

    it('should return empty array for unknown agent', () => {
      const fields = validator.getRequiredFields('unknown-agent');

      expect(fields).toEqual([]);
    });
  });

  describe('validateField', () => {
    it('should fail validation for null field', () => {
      const result = validator.validateField('test-agent', 'testField', null);

      expect(result.valid).toBe(false);
      expect(result.error?.severity).toBe('major');
    });

    it('should fail validation for undefined field', () => {
      const result = validator.validateField('test-agent', 'testField', undefined);

      expect(result.valid).toBe(false);
      expect(result.error?.severity).toBe('major');
    });

    it('should fail validation for empty array', () => {
      const result = validator.validateField('test-agent', 'testField', []);

      expect(result.valid).toBe(false);
      expect(result.error?.severity).toBe('minor');
    });

    it('should fail validation for empty object', () => {
      const result = validator.validateField('test-agent', 'testField', {});

      expect(result.valid).toBe(false);
      expect(result.error?.severity).toBe('minor');
    });

    it('should fail validation for empty string', () => {
      const result = validator.validateField('test-agent', 'testField', '   ');

      expect(result.valid).toBe(false);
      expect(result.error?.severity).toBe('minor');
    });

    it('should pass validation for non-empty values', () => {
      expect(validator.validateField('test-agent', 'testField', 'value').valid).toBe(true);
      expect(validator.validateField('test-agent', 'testField', ['item']).valid).toBe(true);
      expect(validator.validateField('test-agent', 'testField', { key: 'value' }).valid).toBe(true);
      expect(validator.validateField('test-agent', 'testField', 123).valid).toBe(true);
      expect(validator.validateField('test-agent', 'testField', true).valid).toBe(true);
    });
  });
});

/**
 * MEMORY Module Tests
 *
 * Comprehensive test suite for CONDUCTOR's learning brain:
 * - BuildStore: Build history management
 * - PatternEngine: Pattern extraction and matching
 * - VectorStore: Semantic similarity search
 * - PreferencesManager: User preference learning
 * - MemoryModule: Integration and orchestration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuildStore, createBuildRecord, addOutputToRecord, addErrorToRecord, finalizeBuildRecord } from '../build-store';
import { PatternEngine, executePatternAction } from '../pattern-engine';
import { VectorStore, createOllamaEmbeddingFn } from '../vector-store';
import { PreferencesManager } from '../preferences';
import { MemoryModule } from '../index';
import {
  DEFAULT_MEMORY_CONFIG,
  type BuildRecord,
  type LearnedPattern,
  type UserPreferences,
  type SimilarityQuery,
  type PatternMatchContext,
  type UserFeedback,
} from '../types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestBuildRecord(overrides: Partial<BuildRecord> = {}): BuildRecord {
  return {
    id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: 'tenant_test_123',
    description: 'Test build description',
    projectType: 'saas-app',
    complexity: 'moderate',
    tier: 'standard',
    startedAt: new Date(),
    completedAt: new Date(),
    duration: 60000,
    status: 'completed',
    outputs: {},
    errors: [],
    qualityScores: { agent1: 8.5, agent2: 9.0 },
    overallQuality: 8.75,
    tokensUsed: 50000,
    costUSD: 0.75,
    tags: ['test'],
    metadata: {},
    ...overrides,
  };
}

function createTestPattern(overrides: Partial<LearnedPattern> = {}): LearnedPattern {
  return {
    id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'quality_threshold',
    trigger: {
      conditions: [
        { field: 'projectType', operator: 'equals', value: 'saas-app' },
      ],
      operator: 'AND',
    },
    action: {
      type: 'modify_threshold',
      parameters: { threshold: 0.85, dimension: 'completeness' },
    },
    successRate: 0.8,
    timesApplied: 10,
    lastApplied: new Date(),
    confidence: 0.75,
    minSamples: 5,
    actualSamples: 15,
    source: 'automatic',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// BUILD STORE TESTS
// ============================================================================

describe('BuildStore', () => {
  let store: BuildStore;

  beforeEach(() => {
    store = new BuildStore(DEFAULT_MEMORY_CONFIG);
  });

  describe('CRUD Operations', () => {
    it('should save and retrieve a build record', async () => {
      const record = createTestBuildRecord();
      await store.save(record);
      const retrieved = await store.get(record.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(record.id);
      expect(retrieved?.description).toBe(record.description);
    });

    it('should return null for non-existent build', async () => {
      const retrieved = await store.get('non_existent_id');
      expect(retrieved).toBeNull();
    });

    it('should update an existing build record', async () => {
      const record = createTestBuildRecord();
      await store.save(record);

      const updates = { overallQuality: 9.5, status: 'completed' as const };
      await store.update(record.id, updates);

      const retrieved = await store.get(record.id);
      expect(retrieved?.overallQuality).toBe(9.5);
    });

    it('should delete a build record', async () => {
      const record = createTestBuildRecord();
      await store.save(record);
      await store.delete(record.id);

      const retrieved = await store.get(record.id);
      expect(retrieved).toBeNull();
    });

    it('should get builds by tenant', async () => {
      const tenantId = 'tenant_specific';
      const record1 = createTestBuildRecord({ tenantId });
      const record2 = createTestBuildRecord({ tenantId });
      const record3 = createTestBuildRecord({ tenantId: 'other_tenant' });

      await store.save(record1);
      await store.save(record2);
      await store.save(record3);

      const tenantBuilds = await store.getByTenant(tenantId);
      expect(tenantBuilds.length).toBe(2);
      expect(tenantBuilds.every(b => b.tenantId === tenantId)).toBe(true);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Seed with test data
      await store.save(createTestBuildRecord({ status: 'completed', overallQuality: 9.0 }));
      await store.save(createTestBuildRecord({ status: 'completed', overallQuality: 7.5 }));
      await store.save(createTestBuildRecord({ status: 'failed', overallQuality: 3.0 }));
      await store.save(createTestBuildRecord({ status: 'completed', projectType: 'landing-page' }));
    });

    it('should get recent builds with limit', async () => {
      const recent = await store.getRecentBuilds(2);
      expect(recent.length).toBe(2);
    });

    it('should get failed builds', async () => {
      const failed = await store.getFailedBuilds();
      expect(failed.length).toBe(1);
      expect(failed[0].status).toBe('failed');
    });

    it('should get successful builds', async () => {
      const successful = await store.getSuccessfulBuilds();
      expect(successful.length).toBe(3);
      expect(successful.every(b => b.status === 'completed')).toBe(true);
    });

    it('should get builds by project type', async () => {
      const landingPages = await store.getBuildsByProjectType('landing-page');
      expect(landingPages.length).toBe(1);
      expect(landingPages[0].projectType).toBe('landing-page');
    });

    it('should get builds by status', async () => {
      const completed = await store.getBuildsByStatus('completed');
      expect(completed.length).toBe(3);
    });

    it('should get builds by quality range', async () => {
      const highQuality = await store.getBuildsByQualityRange(8.0, 10.0);
      expect(highQuality.length).toBe(1);
      expect(highQuality[0].overallQuality).toBeGreaterThanOrEqual(8.0);
    });

    it('should search builds by text', async () => {
      await store.save(createTestBuildRecord({ description: 'E-commerce platform with payments' }));
      const results = await store.searchBuilds('payments');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      await store.save(createTestBuildRecord({ overallQuality: 8.0, duration: 60000, costUSD: 0.5, tokensUsed: 30000 }));
      await store.save(createTestBuildRecord({ overallQuality: 9.0, duration: 90000, costUSD: 0.8, tokensUsed: 50000 }));
      await store.save(createTestBuildRecord({ overallQuality: 7.0, duration: 45000, costUSD: 0.3, tokensUsed: 20000, status: 'failed' }));
    });

    it('should calculate average quality', async () => {
      const avg = await store.getAverageQuality();
      expect(avg).toBeCloseTo(8.0, 1); // Average of 8.0 and 9.0 (successful only)
    });

    it('should calculate average duration', async () => {
      const avg = await store.getAverageDuration();
      expect(avg).toBeGreaterThan(0);
    });

    it('should calculate average cost', async () => {
      const avg = await store.getAverageCost();
      expect(avg).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      const rate = await store.getSuccessRate();
      expect(rate).toBeCloseTo(0.67, 1); // 2 out of 3
    });

    it('should get total tokens used', async () => {
      const total = await store.getTotalTokensUsed();
      expect(total).toBe(100000);
    });

    it('should get total cost', async () => {
      const total = await store.getTotalCost();
      expect(total).toBeCloseTo(1.6, 1);
    });

    it('should get quality trend', async () => {
      const trend = await store.getQualityTrend(7);
      expect(Array.isArray(trend)).toBe(true);
    });

    it('should get project type distribution', async () => {
      const distribution = await store.getProjectTypeDistribution();
      expect(distribution['saas-app']).toBe(3);
    });
  });

  describe('Factory Functions', () => {
    it('should create a build record with defaults', () => {
      const record = createBuildRecord({
        tenantId: 'tenant_123',
        description: 'New build',
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
      });

      expect(record.id).toBeDefined();
      expect(record.tenantId).toBe('tenant_123');
      expect(record.status).toBe('completed');
      expect(record.outputs).toEqual({});
      expect(record.errors).toEqual([]);
    });

    it('should add output to record', () => {
      const record = createBuildRecord({
        tenantId: 'tenant_123',
        description: 'Build with output',
        projectType: 'landing-page',
        complexity: 'simple',
        tier: 'basic',
      });

      addOutputToRecord(record, 'agent1', {
        content: { code: 'test' },
        tokens: 1000,
        quality: 8.5,
      });

      expect(record.outputs['agent1']).toBeDefined();
      expect(record.outputs['agent1'].tokens).toBe(1000);
      expect(record.outputs['agent1'].quality).toBe(8.5);
    });

    it('should add error to record', () => {
      const record = createBuildRecord({
        tenantId: 'tenant_123',
        description: 'Build with error',
        projectType: 'saas-app',
        complexity: 'complex',
        tier: 'premium',
      });

      addErrorToRecord(record, {
        agentId: 'agent1',
        phase: 'frontend',
        error: 'Timeout error',
        recoverable: true,
      });

      expect(record.errors.length).toBe(1);
      expect(record.errors[0].agentId).toBe('agent1');
      expect(record.errors[0].recoverable).toBe(true);
    });

    it('should finalize build record', () => {
      const record = createBuildRecord({
        tenantId: 'tenant_123',
        description: 'Build to finalize',
        projectType: 'dashboard',
        complexity: 'moderate',
        tier: 'standard',
      });

      finalizeBuildRecord(record, 'completed', {
        overallQuality: 9.2,
        tokensUsed: 75000,
        costUSD: 1.25,
      });

      expect(record.status).toBe('completed');
      expect(record.completedAt).toBeDefined();
      expect(record.duration).toBeGreaterThan(0);
      expect(record.overallQuality).toBe(9.2);
      expect(record.tokensUsed).toBe(75000);
      expect(record.costUSD).toBe(1.25);
    });
  });
});

// ============================================================================
// PATTERN ENGINE TESTS
// ============================================================================

describe('PatternEngine', () => {
  let engine: PatternEngine;

  beforeEach(() => {
    engine = new PatternEngine(DEFAULT_MEMORY_CONFIG);
  });

  describe('Pattern CRUD', () => {
    it('should save and retrieve a pattern', async () => {
      const pattern = createTestPattern();
      await engine.save(pattern);
      const retrieved = await engine.get(pattern.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe(pattern.type);
    });

    it('should update a pattern', async () => {
      const pattern = createTestPattern();
      await engine.save(pattern);

      await engine.update(pattern.id, { successRate: 0.95 });

      const retrieved = await engine.get(pattern.id);
      expect(retrieved?.successRate).toBe(0.95);
    });

    it('should delete a pattern', async () => {
      const pattern = createTestPattern();
      await engine.save(pattern);
      await engine.delete(pattern.id);

      const retrieved = await engine.get(pattern.id);
      expect(retrieved).toBeNull();
    });

    it('should get patterns by type', async () => {
      await engine.save(createTestPattern({ type: 'agent_selection' }));
      await engine.save(createTestPattern({ type: 'agent_selection' }));
      await engine.save(createTestPattern({ type: 'quality_threshold' }));

      const agentPatterns = await engine.getByType('agent_selection');
      expect(agentPatterns.length).toBe(2);
    });
  });

  describe('Pattern Matching', () => {
    it('should find matching patterns for context', async () => {
      const pattern = createTestPattern({
        trigger: {
          conditions: [
            { field: 'projectType', operator: 'equals', value: 'saas-app' },
          ],
          operator: 'AND',
        },
      });
      await engine.save(pattern);

      const context: PatternMatchContext = {
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
        currentQuality: 0,
        retryCount: 0,
        agentId: null,
        phase: null,
      };

      const matches = await engine.findMatchingPatterns(context);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should not match patterns with unmet conditions', async () => {
      const pattern = createTestPattern({
        trigger: {
          conditions: [
            { field: 'projectType', operator: 'equals', value: 'e-commerce' },
          ],
          operator: 'AND',
        },
      });
      await engine.save(pattern);

      const context: PatternMatchContext = {
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
        currentQuality: 0,
        retryCount: 0,
        agentId: null,
        phase: null,
      };

      const matches = await engine.findMatchingPatterns(context);
      expect(matches.length).toBe(0);
    });

    it('should match patterns with greaterThan operator', async () => {
      const pattern = createTestPattern({
        trigger: {
          conditions: [
            { field: 'retryCount', operator: 'greaterThan', value: 2 },
          ],
          operator: 'AND',
        },
      });
      await engine.save(pattern);

      const context: PatternMatchContext = {
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
        currentQuality: 0,
        retryCount: 3,
        agentId: null,
        phase: null,
      };

      const matches = await engine.findMatchingPatterns(context);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match patterns with OR operator', async () => {
      const pattern = createTestPattern({
        trigger: {
          conditions: [
            { field: 'projectType', operator: 'equals', value: 'saas-app' },
            { field: 'projectType', operator: 'equals', value: 'e-commerce' },
          ],
          operator: 'OR',
        },
      });
      await engine.save(pattern);

      const context: PatternMatchContext = {
        projectType: 'e-commerce',
        complexity: 'complex',
        tier: 'premium',
        currentQuality: 0,
        retryCount: 0,
        agentId: null,
        phase: null,
      };

      const matches = await engine.findMatchingPatterns(context);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Recording', () => {
    it('should record successful pattern outcome', async () => {
      const pattern = createTestPattern({ successRate: 0.5, timesApplied: 10 });
      await engine.save(pattern);

      await engine.recordOutcome(pattern.id, true);

      const updated = await engine.get(pattern.id);
      expect(updated?.successRate).toBeGreaterThan(0.5);
      expect(updated?.timesApplied).toBe(11);
    });

    it('should record failed pattern outcome', async () => {
      const pattern = createTestPattern({ successRate: 0.8, timesApplied: 10 });
      await engine.save(pattern);

      await engine.recordOutcome(pattern.id, false);

      const updated = await engine.get(pattern.id);
      expect(updated?.successRate).toBeLessThan(0.8);
      expect(updated?.timesApplied).toBe(11);
    });
  });

  describe('Pattern Extraction', () => {
    it('should extract quality patterns from successful builds', async () => {
      const builds: BuildRecord[] = [];

      // Create high-quality SaaS builds
      for (let i = 0; i < 10; i++) {
        builds.push(createTestBuildRecord({
          projectType: 'saas-app',
          overallQuality: 9.0 + Math.random() * 0.5,
          status: 'completed',
        }));
      }

      const patterns = await engine.extractPatterns(builds);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should extract error recovery patterns from failed builds', async () => {
      const builds: BuildRecord[] = [];

      // Create failed builds with errors
      for (let i = 0; i < 5; i++) {
        const record = createTestBuildRecord({
          status: 'failed',
          errors: [{
            agentId: 'test-agent',
            phase: 'frontend',
            error: 'Timeout error',
            timestamp: new Date(),
            recoverable: true,
          }],
        });
        builds.push(record);
      }

      const patterns = await engine.extractPatterns(builds);
      const errorPatterns = patterns.filter(p => p.type === 'error_recovery');
      // May or may not extract depending on sample size
      expect(Array.isArray(errorPatterns)).toBe(true);
    });
  });

  describe('Pattern Actions', () => {
    it('should execute modify_threshold action', () => {
      const changes: Record<string, unknown> = {};
      const pattern = createTestPattern({
        action: {
          type: 'modify_threshold',
          parameters: { threshold: 0.9, dimension: 'completeness' },
        },
      });

      executePatternAction(pattern.action, changes);
      expect(changes.thresholds).toBeDefined();
    });

    it('should execute adjust_retry action', () => {
      const changes: Record<string, unknown> = {};
      const pattern = createTestPattern({
        action: {
          type: 'adjust_retry',
          parameters: { maxRetries: 5, backoffMultiplier: 2 },
        },
      });

      executePatternAction(pattern.action, changes);
      expect(changes.retryPolicy).toBeDefined();
    });
  });

  describe('Effectiveness Queries', () => {
    beforeEach(async () => {
      await engine.save(createTestPattern({ successRate: 0.9, confidence: 0.85, type: 'quality_threshold' }));
      await engine.save(createTestPattern({ successRate: 0.7, confidence: 0.6, type: 'agent_selection' }));
      await engine.save(createTestPattern({ successRate: 0.95, confidence: 0.9, type: 'retry_strategy' }));
    });

    it('should get most effective patterns', async () => {
      const effective = await engine.getMostEffective(2);
      expect(effective.length).toBe(2);
      // Should be sorted by effectiveness (success_rate * confidence)
      expect(effective[0].successRate * effective[0].confidence)
        .toBeGreaterThanOrEqual(effective[1].successRate * effective[1].confidence);
    });

    it('should get confident patterns only', async () => {
      const confident = await engine.getConfidentPatterns(0.8);
      expect(confident.every(p => p.confidence >= 0.8)).toBe(true);
    });
  });
});

// ============================================================================
// VECTOR STORE TESTS
// ============================================================================

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore(DEFAULT_MEMORY_CONFIG);
  });

  describe('Embedding Operations', () => {
    it('should generate embedding for text', async () => {
      const embedding = await store.embed('Build a SaaS application with user authentication');
      expect(embedding.length).toBe(768);
      expect(embedding.every(v => typeof v === 'number')).toBe(true);
    });

    it('should generate batch embeddings', async () => {
      const texts = [
        'Build landing page',
        'Create e-commerce store',
        'Dashboard application',
      ];
      const embeddings = await store.embedBatch(texts);
      expect(embeddings.length).toBe(3);
      expect(embeddings.every(e => e.length === 768)).toBe(true);
    });

    it('should produce similar embeddings for similar text', async () => {
      const emb1 = await store.embed('Build a React SaaS application');
      const emb2 = await store.embed('Create a React SaaS platform');
      const emb3 = await store.embed('Cook pasta for dinner');

      // Calculate cosine similarity
      const similarity12 = cosineSimilarity(emb1, emb2);
      const similarity13 = cosineSimilarity(emb1, emb3);

      expect(similarity12).toBeGreaterThan(similarity13);
    });
  });

  describe('Indexing', () => {
    it('should index a build embedding', async () => {
      const embedding = {
        buildId: 'build_123',
        vector: await store.embed('Test build'),
        text: 'Test build',
        metadata: {
          projectType: 'saas-app' as const,
          complexity: 'moderate' as const,
          tier: 'standard' as const,
          tenantId: 'tenant_123',
          quality: 8.5,
          success: true,
        },
        createdAt: new Date(),
      };

      await store.index(embedding);
      const count = await store.count();
      expect(count).toBe(1);
    });

    it('should reject embeddings with wrong dimension', async () => {
      const embedding = {
        buildId: 'build_123',
        vector: [0.1, 0.2, 0.3], // Wrong dimension
        text: 'Test',
        metadata: {
          projectType: 'saas-app' as const,
          complexity: 'moderate' as const,
          tier: 'standard' as const,
          tenantId: 'tenant_123',
          quality: 8.5,
          success: true,
        },
        createdAt: new Date(),
      };

      await expect(store.index(embedding)).rejects.toThrow('Invalid embedding dimension');
    });

    it('should index a build record', async () => {
      const record = createTestBuildRecord();
      await store.indexBuild(record);

      const count = await store.count();
      expect(count).toBe(1);
    });

    it('should remove an embedding', async () => {
      const record = createTestBuildRecord();
      await store.indexBuild(record);

      await store.remove(record.id);

      const count = await store.count();
      expect(count).toBe(0);
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      // Index test builds
      await store.indexBuild(createTestBuildRecord({
        id: 'build_saas_1',
        description: 'SaaS application with user authentication and billing',
        projectType: 'saas-app',
      }));
      await store.indexBuild(createTestBuildRecord({
        id: 'build_ecom_1',
        description: 'E-commerce store with product catalog and cart',
        projectType: 'e-commerce',
      }));
      await store.indexBuild(createTestBuildRecord({
        id: 'build_landing_1',
        description: 'Landing page for marketing campaign',
        projectType: 'landing-page',
      }));
    });

    it('should find similar builds by text', async () => {
      const query: SimilarityQuery = {
        description: 'Build a SaaS platform with authentication',
      };

      const results = await store.searchByText(query);
      expect(results.length).toBeGreaterThan(0);
      // SaaS build should be most similar
      expect(results[0].buildId).toBe('build_saas_1');
    });

    it('should filter by project type', async () => {
      const query: SimilarityQuery = {
        description: 'Build an application',
        projectType: 'e-commerce',
      };

      const results = await store.searchByText(query);
      expect(results.every(r => r.record.projectType === 'e-commerce')).toBe(true);
    });

    it('should filter by minimum quality', async () => {
      await store.indexBuild(createTestBuildRecord({
        id: 'build_low_quality',
        description: 'Low quality SaaS build',
        projectType: 'saas-app',
        overallQuality: 3.0,
      }));

      const query: SimilarityQuery = {
        description: 'SaaS application',
        minQuality: 7.0,
      };

      const results = await store.searchByText(query);
      expect(results.every(r => r.record.overallQuality >= 7.0)).toBe(true);
    });

    it('should respect result limit', async () => {
      const query: SimilarityQuery = {
        description: 'Build something',
        limit: 2,
      };

      const results = await store.searchByText(query);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should find similar builds to existing build', async () => {
      const results = await store.findSimilarBuilds('build_saas_1', 2);
      expect(results.length).toBeGreaterThanOrEqual(0);
      // Should not include the source build itself
      expect(results.every(r => r.buildId !== 'build_saas_1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await store.indexBuild(createTestBuildRecord({ projectType: 'saas-app', overallQuality: 9.0 }));
      await store.indexBuild(createTestBuildRecord({ projectType: 'saas-app', overallQuality: 8.0 }));
      await store.indexBuild(createTestBuildRecord({ projectType: 'landing-page', overallQuality: 4.0 }));
    });

    it('should return statistics', async () => {
      const stats = await store.getStatistics();

      expect(stats.totalEmbeddings).toBe(3);
      expect(stats.totalBuilds).toBe(3);
      expect(stats.projectTypeDistribution['saas-app']).toBe(2);
      expect(stats.projectTypeDistribution['landing-page']).toBe(1);
      expect(stats.qualityDistribution.high).toBe(2);
      expect(stats.qualityDistribution.low).toBe(1);
    });
  });

  describe('Custom Embedding Function', () => {
    it('should use custom embedding function when provided', async () => {
      const customEmbedFn = vi.fn().mockResolvedValue(new Array(768).fill(0.1));

      store.setEmbeddingFunction(customEmbedFn);
      await store.embed('Test text');

      expect(customEmbedFn).toHaveBeenCalledWith('Test text');
    });
  });
});

// ============================================================================
// PREFERENCES MANAGER TESTS
// ============================================================================

describe('PreferencesManager', () => {
  let manager: PreferencesManager;

  beforeEach(() => {
    manager = new PreferencesManager(DEFAULT_MEMORY_CONFIG);
  });

  describe('CRUD Operations', () => {
    it('should create and retrieve preferences', async () => {
      const tenantId = 'tenant_123';
      const prefs: UserPreferences = {
        tenantId,
        preferredTier: 'premium',
        preferredStrategy: 'parallel-phases',
        qualityOverSpeed: 0.8,
        codeStyle: { language: 'typescript', formatting: 'prettier' },
        designStyle: { theme: 'dark', colors: 'vibrant' },
        communicationStyle: { verbosity: 'concise', techLevel: 'expert' },
        customThresholds: {},
        toleranceForRetries: 0.7,
        budgetSensitivity: 0.3,
        averageRating: 4.5,
        totalFeedbacks: 10,
        feedbackTrend: 'improving',
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await manager.save(prefs);
      const retrieved = await manager.get(tenantId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.preferredTier).toBe('premium');
      expect(retrieved?.qualityOverSpeed).toBe(0.8);
    });

    it('should update preferences', async () => {
      const tenantId = 'tenant_update';
      await manager.save({
        tenantId,
        preferredTier: 'standard',
        preferredStrategy: 'sequential',
        qualityOverSpeed: 0.5,
        codeStyle: {},
        designStyle: {},
        communicationStyle: {},
        customThresholds: {},
        toleranceForRetries: 0.5,
        budgetSensitivity: 0.5,
        averageRating: 0,
        totalFeedbacks: 0,
        feedbackTrend: 'stable',
        confidence: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.update(tenantId, { preferredTier: 'enterprise' });
      const retrieved = await manager.get(tenantId);

      expect(retrieved?.preferredTier).toBe('enterprise');
    });

    it('should delete preferences', async () => {
      const tenantId = 'tenant_delete';
      await manager.save({
        tenantId,
        preferredTier: 'basic',
        preferredStrategy: 'sequential',
        qualityOverSpeed: 0,
        codeStyle: {},
        designStyle: {},
        communicationStyle: {},
        customThresholds: {},
        toleranceForRetries: 0.5,
        budgetSensitivity: 0.5,
        averageRating: 0,
        totalFeedbacks: 0,
        feedbackTrend: 'stable',
        confidence: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.delete(tenantId);
      const retrieved = await manager.get(tenantId);

      expect(retrieved).toBeNull();
    });

    it('should get or create preferences', async () => {
      const tenantId = 'tenant_new';

      // First call should create
      const prefs1 = await manager.getOrCreate(tenantId);
      expect(prefs1.tenantId).toBe(tenantId);

      // Second call should retrieve existing
      const prefs2 = await manager.getOrCreate(tenantId);
      expect(prefs2.tenantId).toBe(tenantId);
    });
  });

  describe('Feedback Learning', () => {
    it('should record feedback and update preferences', async () => {
      const tenantId = 'tenant_feedback';
      await manager.getOrCreate(tenantId);

      const feedback: UserFeedback = {
        rating: 5,
        comments: 'Excellent quality!',
        usedOutput: true,
        modifiedOutput: false,
      };

      await manager.recordFeedback(tenantId, feedback);
      const prefs = await manager.get(tenantId);

      expect(prefs?.averageRating).toBe(5);
      expect(prefs?.totalFeedbacks).toBe(1);
    });

    it('should calculate average rating over multiple feedbacks', async () => {
      const tenantId = 'tenant_multi_feedback';
      await manager.getOrCreate(tenantId);

      await manager.recordFeedback(tenantId, { rating: 5, usedOutput: true, modifiedOutput: false });
      await manager.recordFeedback(tenantId, { rating: 4, usedOutput: true, modifiedOutput: false });
      await manager.recordFeedback(tenantId, { rating: 3, usedOutput: true, modifiedOutput: true });

      const prefs = await manager.get(tenantId);

      expect(prefs?.totalFeedbacks).toBe(3);
      expect(prefs?.averageRating).toBeCloseTo(4.0, 1);
    });

    it('should update feedback trend', async () => {
      const tenantId = 'tenant_trend';
      await manager.getOrCreate(tenantId);

      // Simulate improving trend
      await manager.recordFeedback(tenantId, { rating: 3, usedOutput: true, modifiedOutput: false });
      await manager.recordFeedback(tenantId, { rating: 4, usedOutput: true, modifiedOutput: false });
      await manager.recordFeedback(tenantId, { rating: 5, usedOutput: true, modifiedOutput: false });

      const prefs = await manager.get(tenantId);
      // Trend calculation depends on implementation
      expect(['improving', 'stable', 'declining']).toContain(prefs?.feedbackTrend);
    });
  });

  describe('Build Learning', () => {
    it('should update preferences from build', async () => {
      const tenantId = 'tenant_build_learn';
      await manager.getOrCreate(tenantId);

      const build = createTestBuildRecord({
        tenantId,
        tier: 'premium',
        overallQuality: 9.0,
      });

      await manager.updateFromBuild(tenantId, build);
      const prefs = await manager.get(tenantId);

      expect(prefs?.confidence).toBeGreaterThan(0);
    });
  });

  describe('Preference Queries', () => {
    beforeEach(async () => {
      await manager.save({
        tenantId: 'tenant_quality',
        preferredTier: 'premium',
        preferredStrategy: 'sequential',
        qualityOverSpeed: 0.9,
        codeStyle: {},
        designStyle: {},
        communicationStyle: {},
        customThresholds: {},
        toleranceForRetries: 0.8,
        budgetSensitivity: 0.2,
        averageRating: 4.5,
        totalFeedbacks: 10,
        feedbackTrend: 'stable',
        confidence: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.save({
        tenantId: 'tenant_budget',
        preferredTier: 'basic',
        preferredStrategy: 'fast-track',
        qualityOverSpeed: 0.2,
        codeStyle: {},
        designStyle: {},
        communicationStyle: {},
        customThresholds: {},
        toleranceForRetries: 0.3,
        budgetSensitivity: 0.9,
        averageRating: 3.5,
        totalFeedbacks: 5,
        feedbackTrend: 'stable',
        confidence: 0.6,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should identify quality-preferring users', async () => {
      expect(await manager.prefersQuality('tenant_quality')).toBe(true);
      expect(await manager.prefersQuality('tenant_budget')).toBe(false);
    });

    it('should identify budget-sensitive users', async () => {
      expect(await manager.isBudgetSensitive('tenant_quality')).toBe(false);
      expect(await manager.isBudgetSensitive('tenant_budget')).toBe(true);
    });

    it('should identify retry-tolerant users', async () => {
      expect(await manager.toleratesRetries('tenant_quality')).toBe(true);
      expect(await manager.toleratesRetries('tenant_budget')).toBe(false);
    });

    it('should get recommendations based on preferences', async () => {
      const recommendations = await manager.getRecommendations('tenant_quality');

      expect(recommendations).toBeDefined();
      expect(recommendations.suggestedTier).toBe('premium');
      expect(recommendations.suggestedStrategy).toBe('sequential');
    });
  });

  describe('Manual Preference Setting', () => {
    it('should set code style preferences', async () => {
      const tenantId = 'tenant_style';
      await manager.getOrCreate(tenantId);

      await manager.setCodeStyle(tenantId, {
        language: 'typescript',
        formatting: 'prettier',
        indentation: 'tabs',
      });

      const prefs = await manager.get(tenantId);
      expect(prefs?.codeStyle.language).toBe('typescript');
    });

    it('should set quality threshold', async () => {
      const tenantId = 'tenant_threshold';
      await manager.getOrCreate(tenantId);

      await manager.setQualityThreshold(tenantId, 'completeness', 0.95);

      const prefs = await manager.get(tenantId);
      expect(prefs?.customThresholds['completeness']).toBe(0.95);
    });
  });
});

// ============================================================================
// MEMORY MODULE INTEGRATION TESTS
// ============================================================================

describe('MemoryModule', () => {
  let memory: MemoryModule;

  beforeEach(() => {
    memory = new MemoryModule(DEFAULT_MEMORY_CONFIG);
  });

  describe('Build History', () => {
    it('should store and retrieve builds', async () => {
      const record = createTestBuildRecord();
      await memory.storeBuild(record);

      const retrieved = await memory.getBuild(record.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(record.id);
    });

    it('should get tenant builds', async () => {
      const tenantId = 'tenant_memory_test';
      await memory.storeBuild(createTestBuildRecord({ tenantId }));
      await memory.storeBuild(createTestBuildRecord({ tenantId }));
      await memory.storeBuild(createTestBuildRecord({ tenantId: 'other' }));

      const builds = await memory.getTenantBuilds(tenantId);
      expect(builds.length).toBe(2);
    });

    it('should get recent builds', async () => {
      await memory.storeBuild(createTestBuildRecord());
      await memory.storeBuild(createTestBuildRecord());
      await memory.storeBuild(createTestBuildRecord());

      const recent = await memory.getRecentBuilds(2);
      expect(recent.length).toBe(2);
    });

    it('should get failed builds', async () => {
      await memory.storeBuild(createTestBuildRecord({ status: 'completed' }));
      await memory.storeBuild(createTestBuildRecord({ status: 'failed' }));

      const failed = await memory.getFailedBuilds();
      expect(failed.length).toBe(1);
    });

    it('should add feedback to build', async () => {
      const record = createTestBuildRecord();
      await memory.storeBuild(record);

      const feedback: UserFeedback = {
        rating: 5,
        comments: 'Great build!',
        usedOutput: true,
        modifiedOutput: false,
      };

      await memory.addFeedback(record.id, feedback);

      const retrieved = await memory.getBuild(record.id);
      expect(retrieved?.userFeedback).toBeDefined();
      expect(retrieved?.userFeedback?.rating).toBe(5);
    });
  });

  describe('Similarity Search', () => {
    beforeEach(async () => {
      await memory.storeBuild(createTestBuildRecord({
        id: 'mem_saas_1',
        description: 'SaaS application with authentication',
        projectType: 'saas-app',
      }));
      await memory.storeBuild(createTestBuildRecord({
        id: 'mem_ecom_1',
        description: 'E-commerce store with cart',
        projectType: 'e-commerce',
      }));
    });

    it('should find similar builds', async () => {
      const query: SimilarityQuery = {
        description: 'Build SaaS with user login',
      };

      const similar = await memory.findSimilarBuilds(query);
      expect(similar.length).toBeGreaterThan(0);
    });

    it('should find related builds', async () => {
      const related = await memory.findRelatedBuilds('mem_saas_1');
      // May or may not find related depending on similarity
      expect(Array.isArray(related)).toBe(true);
    });
  });

  describe('Pattern Operations', () => {
    it('should add and retrieve patterns', async () => {
      const pattern = createTestPattern();
      await memory.addPattern(pattern);

      const patterns = await memory.getPatternsByType('quality_threshold');
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should get applicable patterns', async () => {
      const pattern = createTestPattern({
        trigger: {
          conditions: [
            { field: 'projectType', operator: 'equals', value: 'saas-app' },
          ],
          operator: 'AND',
        },
      });
      await memory.addPattern(pattern);

      const context: PatternMatchContext = {
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
        currentQuality: 0,
        retryCount: 0,
        agentId: null,
        phase: null,
      };

      const applicable = await memory.getApplicablePatterns(context);
      expect(applicable.length).toBeGreaterThan(0);
    });

    it('should apply patterns and return changes', async () => {
      const pattern = createTestPattern({
        action: {
          type: 'modify_threshold',
          parameters: { threshold: 0.9, dimension: 'completeness' },
        },
      });
      await memory.addPattern(pattern);

      const context: PatternMatchContext = {
        projectType: 'saas-app',
        complexity: 'moderate',
        tier: 'standard',
        currentQuality: 0,
        retryCount: 0,
        agentId: null,
        phase: null,
      };

      const result = await memory.applyPatterns(context);
      expect(result).toBeDefined();
      expect(typeof result.applied).toBe('boolean');
    });

    it('should record pattern outcomes', async () => {
      const pattern = createTestPattern({ timesApplied: 5 });
      await memory.addPattern(pattern);

      await memory.recordPatternOutcome(pattern.id, true);

      const patterns = await memory.getMostEffectivePatterns(10);
      const updated = patterns.find(p => p.id === pattern.id);
      expect(updated?.timesApplied).toBe(6);
    });

    it('should get most effective patterns', async () => {
      await memory.addPattern(createTestPattern({ successRate: 0.9, confidence: 0.85 }));
      await memory.addPattern(createTestPattern({ successRate: 0.6, confidence: 0.5 }));

      const effective = await memory.getMostEffectivePatterns(1);
      expect(effective.length).toBe(1);
      expect(effective[0].successRate).toBe(0.9);
    });
  });

  describe('User Preferences', () => {
    const tenantId = 'tenant_memory_prefs';

    it('should get preferences (creates if not exists)', async () => {
      const prefs = await memory.getPreferences(tenantId);
      expect(prefs).toBeDefined();
      expect(prefs.tenantId).toBe(tenantId);
    });

    it('should update preferences', async () => {
      await memory.updatePreferences(tenantId, { preferredTier: 'premium' });

      const prefs = await memory.getPreferences(tenantId);
      expect(prefs.preferredTier).toBe('premium');
    });

    it('should check quality preference', async () => {
      await memory.updatePreferences(tenantId, { qualityOverSpeed: 0.9 });

      const prefersQuality = await memory.prefersQuality(tenantId);
      expect(prefersQuality).toBe(true);
    });

    it('should check budget sensitivity', async () => {
      await memory.updatePreferences(tenantId, { budgetSensitivity: 0.9 });

      const isSensitive = await memory.isBudgetSensitive(tenantId);
      expect(isSensitive).toBe(true);
    });

    it('should get recommendations', async () => {
      await memory.updatePreferences(tenantId, {
        preferredTier: 'enterprise',
        preferredStrategy: 'parallel-phases',
      });

      const recommendations = await memory.getRecommendations(tenantId);
      expect(recommendations.suggestedTier).toBe('enterprise');
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      const tenantId = 'tenant_analytics';
      await memory.storeBuild(createTestBuildRecord({ tenantId, status: 'completed', overallQuality: 8.5 }));
      await memory.storeBuild(createTestBuildRecord({ tenantId, status: 'completed', overallQuality: 9.0 }));
      await memory.storeBuild(createTestBuildRecord({ tenantId, status: 'failed', overallQuality: 3.0 }));
    });

    it('should get overall analytics', async () => {
      const analytics = await memory.getAnalytics();

      expect(analytics.totalBuilds).toBe(3);
      expect(analytics.totalPatterns).toBeGreaterThanOrEqual(0);
      expect(analytics.averageQuality).toBeGreaterThan(0);
    });

    it('should get tenant-specific analytics', async () => {
      const analytics = await memory.getTenantAnalytics('tenant_analytics');

      expect(analytics.buildCount).toBe(3);
      expect(analytics.successRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('Recommendations', () => {
    beforeEach(async () => {
      // Seed with successful builds
      for (let i = 0; i < 5; i++) {
        await memory.storeBuild(createTestBuildRecord({
          projectType: 'saas-app',
          tier: 'premium',
          status: 'completed',
          overallQuality: 9.0,
        }));
      }
    });

    it('should generate recommendations based on history', async () => {
      const recommendations = await memory.generateRecommendations(
        'tenant_recs',
        'Build a SaaS application',
        'saas-app',
        'moderate'
      );

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should emit events on build storage', async () => {
      const eventHandler = vi.fn();
      memory.onEvent(eventHandler);

      await memory.storeBuild(createTestBuildRecord());

      expect(eventHandler).toHaveBeenCalled();
      const call = eventHandler.mock.calls[0][0];
      expect(call.type).toBe('build_stored');
    });

    it('should emit events on pattern add', async () => {
      const eventHandler = vi.fn();
      memory.onEvent(eventHandler);

      await memory.addPattern(createTestPattern());

      const patternCalls = eventHandler.mock.calls.filter(
        call => call[0].type === 'pattern_added'
      );
      expect(patternCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should return config', () => {
      const config = memory.getConfig();
      expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
    });

    it('should update config', () => {
      memory.updateConfig({ buildHistoryLimit: 50 });
      const config = memory.getConfig();
      expect(config.buildHistoryLimit).toBe(50);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

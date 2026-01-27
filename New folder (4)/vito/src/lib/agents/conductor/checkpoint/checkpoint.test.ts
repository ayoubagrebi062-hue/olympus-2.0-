/**
 * CHECKPOINT System Tests
 *
 * Comprehensive test suite for the build state checkpointing and resume system.
 * Target: 60+ tests covering compression, stores, manager, and integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Manager
  CheckpointManager,
  createCheckpointManager,
  // Stores
  InMemoryCheckpointStore,
  SupabaseCheckpointStore,
  createCheckpointStore,
  // Compression
  compress,
  decompress,
  compressSync,
  decompressSync,
  shouldCompress,
  getStringByteSize,
  estimateCompressionRatio,
  validateCompression,
  validateCompressionSync,
  // Utilities
  getAgentPhase,
  getAgentsForPhase,
  getAllAgentsOrdered,
  createCheckpointSystem,
  AGENT_PHASE_MAP,
  // Types
  type Checkpoint,
  type CheckpointState,
  type CheckpointConfig,
  type ICheckpointStore,
  type SerializedBuildContext,
  type SerializedAgentOutput,
  type QualityScoreSnapshot,
  type Decision,
  type CheckpointTiming,
  type CheckpointCosts,
} from './index';
import { DEFAULT_CHECKPOINT_CONFIG } from './types';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockBuildContext(overrides: Partial<SerializedBuildContext> = {}): SerializedBuildContext {
  return {
    buildId: 'test-build-123',
    projectId: 'test-project-456',
    tenantId: 'test-tenant-789',
    tier: 'standard',
    description: 'Test project for checkpoint testing',
    projectType: 'saas-app',
    complexity: 'moderate',
    iteration: 1,
    userFeedback: [],
    focusAreas: [],
    buildPlan: {
      phases: [
        { name: 'discovery', agents: ['oracle', 'empathy'], status: 'completed' },
        { name: 'design', agents: ['palette', 'blocks'], status: 'pending' },
      ],
      totalAgents: 4,
      estimatedTokens: 50000,
      estimatedCost: 1.5,
    },
    ...overrides,
  };
}

function createMockAgentOutputs(): Map<string, SerializedAgentOutput> {
  const outputs = new Map<string, SerializedAgentOutput>();
  outputs.set('oracle', {
    agentId: 'oracle',
    phase: 'discovery',
    output: { marketAnalysis: 'test data', competitors: ['A', 'B'] },
    completedAt: new Date(),
    tokensUsed: 5000,
  });
  outputs.set('empathy', {
    agentId: 'empathy',
    phase: 'discovery',
    output: { personas: [{ name: 'User A' }] },
    completedAt: new Date(),
    tokensUsed: 3000,
  });
  return outputs;
}

function createMockQualityScores(): Map<string, QualityScoreSnapshot> {
  const scores = new Map<string, QualityScoreSnapshot>();
  scores.set('oracle', {
    overall: 8.5,
    dimensions: { completeness: 9, accuracy: 8, consistency: 8, relevance: 9 },
    confidence: 0.9,
  });
  return scores;
}

function createMockDecisions(): Decision[] {
  return [
    { key: 'framework', value: 'Next.js 15', reason: 'Modern SSR support', madeBy: 'archon', madeAt: new Date() },
    { key: 'styling', value: 'Tailwind', reason: 'Utility-first CSS', madeBy: 'palette', madeAt: new Date() },
  ];
}

function createMockTiming(): CheckpointTiming {
  return {
    buildStartedAt: new Date(Date.now() - 60000),
    checkpointCreatedAt: new Date(),
    totalDurationMs: 60000,
    agentDurations: new Map([['oracle', 30000], ['empathy', 25000]]),
  };
}

function createMockCosts(): CheckpointCosts {
  return {
    tokensUsed: 8000,
    estimatedCost: 0.24,
    costByAgent: new Map([['oracle', 0.15], ['empathy', 0.09]]),
  };
}

// ============================================================================
// COMPRESSION TESTS (15 tests)
// ============================================================================

describe('Compression Utilities', () => {
  describe('compress/decompress', () => {
    it('should compress and decompress a simple string', async () => {
      const original = 'Hello, World! This is a test string.';
      const compressed = await compress(original);
      const decompressed = await decompress(compressed);
      expect(decompressed).toBe(original);
    });

    it('should compress and decompress a large string', async () => {
      const original = 'A'.repeat(10000);
      const compressed = await compress(original);
      const decompressed = await decompress(compressed);
      expect(decompressed).toBe(original);
    });

    it('should compress and decompress JSON data', async () => {
      const data = { key: 'value', nested: { array: [1, 2, 3] }, unicode: '日本語' };
      const original = JSON.stringify(data);
      const compressed = await compress(original);
      const decompressed = await decompress(compressed);
      expect(JSON.parse(decompressed)).toEqual(data);
    });

    it('should achieve compression for repetitive data', async () => {
      const original = 'test data '.repeat(1000);
      const compressed = await compress(original);
      expect(compressed.length).toBeLessThan(original.length);
    });

    it('should handle empty string', async () => {
      const compressed = await compress('');
      const decompressed = await decompress(compressed);
      expect(decompressed).toBe('');
    });

    it('should handle unicode characters', async () => {
      const original = '日本語テスト 🎉 émojis и кириллица';
      const compressed = await compress(original);
      const decompressed = await decompress(compressed);
      expect(decompressed).toBe(original);
    });
  });

  describe('compressSync/decompressSync', () => {
    it('should compress and decompress synchronously', () => {
      const original = 'Sync compression test';
      const compressed = compressSync(original);
      const decompressed = decompressSync(compressed);
      expect(decompressed).toBe(original);
    });

    it('should handle repetitive data synchronously', () => {
      const original = 'AAAAAAAAAAAAAAAA';
      const compressed = compressSync(original);
      const decompressed = decompressSync(compressed);
      expect(decompressed).toBe(original);
    });
  });

  describe('utility functions', () => {
    it('shouldCompress returns true for large data', () => {
      const largeData = 'x'.repeat(20000);
      expect(shouldCompress(largeData, 10000)).toBe(true);
    });

    it('shouldCompress returns false for small data', () => {
      const smallData = 'small';
      expect(shouldCompress(smallData, 10000)).toBe(false);
    });

    it('getStringByteSize calculates UTF-8 bytes correctly', () => {
      expect(getStringByteSize('hello')).toBe(5);
      expect(getStringByteSize('日本語')).toBe(9); // 3 bytes per character
    });

    it('estimateCompressionRatio calculates ratio', () => {
      const ratio = estimateCompressionRatio('original string (100)', 'comp (50)');
      expect(ratio).toBeCloseTo(0.5, 1);
    });

    it('validateCompression returns true for working compression', async () => {
      const result = await validateCompression();
      expect(result).toBe(true);
    });

    it('validateCompressionSync returns true for working sync compression', () => {
      const result = validateCompressionSync();
      expect(result).toBe(true);
    });
  });
});

// ============================================================================
// IN-MEMORY STORE TESTS (15 tests)
// ============================================================================

describe('InMemoryCheckpointStore', () => {
  let store: InMemoryCheckpointStore;

  beforeEach(() => {
    store = new InMemoryCheckpointStore();
  });

  afterEach(() => {
    store.clear();
  });

  it('should save and load a checkpoint', async () => {
    const checkpoint = createTestCheckpoint('build-1', 1);
    await store.save(checkpoint);
    const loaded = await store.load(checkpoint.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(checkpoint.id);
    expect(loaded!.buildId).toBe('build-1');
  });

  it('should load latest checkpoint for a build', async () => {
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 2));
    await store.save(createTestCheckpoint('build-1', 3));

    const latest = await store.loadLatest('build-1');
    expect(latest).not.toBeNull();
    expect(latest!.sequence).toBe(3);
  });

  it('should return null for non-existent checkpoint', async () => {
    const loaded = await store.load('non-existent-id');
    expect(loaded).toBeNull();
  });

  it('should return null for non-existent build', async () => {
    const latest = await store.loadLatest('non-existent-build');
    expect(latest).toBeNull();
  });

  it('should list checkpoints by buildId', async () => {
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 2));
    await store.save(createTestCheckpoint('build-2', 1));

    const checkpoints = await store.list({ buildId: 'build-1' });
    expect(checkpoints.length).toBe(2);
  });

  it('should list checkpoints by tenantId', async () => {
    const cp1 = createTestCheckpoint('build-1', 1);
    const cp2 = createTestCheckpoint('build-2', 1);
    cp2.tenantId = 'other-tenant';

    await store.save(cp1);
    await store.save(cp2);

    const checkpoints = await store.list({ tenantId: 'test-tenant-123' });
    expect(checkpoints.length).toBe(1);
  });

  it('should filter by phase', async () => {
    const cp1 = createTestCheckpoint('build-1', 1);
    cp1.phase = 'discovery';
    const cp2 = createTestCheckpoint('build-1', 2);
    cp2.phase = 'design';

    await store.save(cp1);
    await store.save(cp2);

    const checkpoints = await store.list({ buildId: 'build-1', phase: 'discovery' });
    expect(checkpoints.length).toBe(1);
    expect(checkpoints[0].phase).toBe('discovery');
  });

  it('should order by sequence ascending', async () => {
    await store.save(createTestCheckpoint('build-1', 3));
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 2));

    const checkpoints = await store.list({ buildId: 'build-1', orderBy: 'sequence', orderDirection: 'asc' });
    expect(checkpoints.map(c => c.sequence)).toEqual([1, 2, 3]);
  });

  it('should order by sequence descending', async () => {
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 3));
    await store.save(createTestCheckpoint('build-1', 2));

    const checkpoints = await store.list({ buildId: 'build-1', orderBy: 'sequence', orderDirection: 'desc' });
    expect(checkpoints.map(c => c.sequence)).toEqual([3, 2, 1]);
  });

  it('should delete a checkpoint', async () => {
    const cp = createTestCheckpoint('build-1', 1);
    await store.save(cp);
    await store.delete(cp.id);

    const loaded = await store.load(cp.id);
    expect(loaded).toBeNull();
  });

  it('should delete all checkpoints for a build', async () => {
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 2));
    await store.save(createTestCheckpoint('build-2', 1));

    await store.deleteForBuild('build-1');

    expect((await store.list({ buildId: 'build-1' })).length).toBe(0);
    expect((await store.list({ buildId: 'build-2' })).length).toBe(1);
  });

  it('should cleanup expired checkpoints', async () => {
    const cp1 = createTestCheckpoint('build-1', 1);
    cp1.expiresAt = new Date(Date.now() - 86400000); // Expired yesterday

    const cp2 = createTestCheckpoint('build-1', 2);
    cp2.expiresAt = new Date(Date.now() + 86400000); // Expires tomorrow

    await store.save(cp1);
    await store.save(cp2);

    const deleted = await store.cleanup(new Date());
    expect(deleted).toBe(1);
    expect(store.size()).toBe(1);
  });

  it('should get stats for a build', async () => {
    await store.save(createTestCheckpoint('build-1', 1));
    await store.save(createTestCheckpoint('build-1', 2));

    const stats = await store.getStats('build-1');
    expect(stats.checkpointCount).toBe(2);
    expect(stats.completionPercent).toBeGreaterThan(0);
  });

  it('should return empty stats for non-existent build', async () => {
    const stats = await store.getStats('non-existent');
    expect(stats.checkpointCount).toBe(0);
    expect(stats.totalSizeBytes).toBe(0);
  });
});

// ============================================================================
// CHECKPOINT MANAGER TESTS (20 tests)
// ============================================================================

describe('CheckpointManager', () => {
  let store: InMemoryCheckpointStore;
  let manager: CheckpointManager;

  beforeEach(() => {
    store = new InMemoryCheckpointStore();
    manager = new CheckpointManager(store, { enabled: true });
  });

  afterEach(() => {
    manager.shutdown();
    store.clear();
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint with all data', async () => {
      const checkpoint = await manager.createCheckpoint(
        'build-1',
        'tenant-1',
        'oracle',
        'discovery',
        1,
        createMockBuildContext(),
        createMockAgentOutputs(),
        createMockQualityScores(),
        createMockDecisions(),
        createMockTiming(),
        createMockCosts()
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.buildId).toBe('build-1');
      expect(checkpoint.tenantId).toBe('tenant-1');
      expect(checkpoint.agentId).toBe('oracle');
      expect(checkpoint.phase).toBe('discovery');
      expect(checkpoint.sequence).toBe(1);
    });

    it('should store checkpoint in store', async () => {
      await manager.createCheckpoint(
        'build-1',
        'tenant-1',
        'oracle',
        'discovery',
        1,
        createMockBuildContext(),
        createMockAgentOutputs(),
        createMockQualityScores(),
        createMockDecisions(),
        createMockTiming(),
        createMockCosts()
      );

      expect(store.size()).toBe(1);
    });

    it('should throw when disabled', async () => {
      const disabledManager = new CheckpointManager(store, { enabled: false });

      await expect(
        disabledManager.createCheckpoint(
          'build-1',
          'tenant-1',
          'oracle',
          'discovery',
          1,
          createMockBuildContext(),
          createMockAgentOutputs(),
          createMockQualityScores(),
          createMockDecisions(),
          createMockTiming(),
          createMockCosts()
        )
      ).rejects.toThrow('disabled');

      disabledManager.shutdown();
    });
  });

  describe('shouldCreateCheckpoint', () => {
    it('should return true at checkpoint interval', () => {
      expect(manager.shouldCreateCheckpoint(0)).toBe(true); // 1 % 1 === 0
      expect(manager.shouldCreateCheckpoint(1)).toBe(true);
      expect(manager.shouldCreateCheckpoint(2)).toBe(true);
    });

    it('should respect custom interval', () => {
      const customManager = new CheckpointManager(store, { enabled: true, checkpointInterval: 3 });
      expect(customManager.shouldCreateCheckpoint(0)).toBe(false); // 1 % 3 !== 0
      expect(customManager.shouldCreateCheckpoint(1)).toBe(false); // 2 % 3 !== 0
      expect(customManager.shouldCreateCheckpoint(2)).toBe(true);  // 3 % 3 === 0
      customManager.shutdown();
    });

    it('should return false when disabled', () => {
      const disabledManager = new CheckpointManager(store, { enabled: false });
      expect(disabledManager.shouldCreateCheckpoint(0)).toBe(false);
      disabledManager.shutdown();
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint by ID', async () => {
      const created = await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      const loaded = await manager.loadCheckpoint(created.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(created.id);
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await manager.loadCheckpoint('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('loadLatestCheckpoint', () => {
    it('should load the latest checkpoint for a build', async () => {
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'empathy', 'discovery', 2,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      const latest = await manager.loadLatestCheckpoint('build-1');
      expect(latest).not.toBeNull();
      expect(latest!.sequence).toBe(2);
    });
  });

  describe('canResume', () => {
    it('should return canResume=false when no checkpoints', async () => {
      const result = await manager.canResume('non-existent-build');
      expect(result.canResume).toBe(false);
      expect(result.reason).toContain('No checkpoints');
    });

    it('should return canResume=true when valid checkpoint exists', async () => {
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      const result = await manager.canResume('build-1');
      expect(result.canResume).toBe(true);
      expect(result.latestCheckpoint).toBeDefined();
    });

    it('should return canResume=false when checkpoint expired', async () => {
      const cp = await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      // Manually expire it
      cp.expiresAt = new Date(Date.now() - 1000);
      await store.save(cp);

      const result = await manager.canResume('build-1');
      expect(result.canResume).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('prepareResume', () => {
    it('should prepare resume from latest checkpoint', async () => {
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      const prepared = await manager.prepareResume('build-1');
      expect(prepared.checkpoint).toBeDefined();
      expect(prepared.context).toBeDefined();
      expect(prepared.skipAgents).toContain('oracle');
      expect(prepared.skipAgents).toContain('empathy');
    });

    it('should prepare resume from specific checkpoint', async () => {
      const cp1 = await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'empathy', 'discovery', 2,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      const prepared = await manager.prepareResume('build-1', { fromCheckpoint: cp1.id });
      expect(prepared.checkpoint.id).toBe(cp1.id);
      expect(prepared.checkpoint.sequence).toBe(1);
    });

    it('should throw when no checkpoint found', async () => {
      await expect(manager.prepareResume('non-existent')).rejects.toThrow('No checkpoint found');
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete a single checkpoint', async () => {
      const cp = await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      await manager.deleteCheckpoint(cp.id);
      expect(store.size()).toBe(0);
    });
  });

  describe('deleteCheckpointsForBuild', () => {
    it('should delete all checkpoints for a build', async () => {
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'empathy', 'discovery', 2,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      await manager.deleteCheckpointsForBuild('build-1');
      expect(store.size()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired checkpoints', async () => {
      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      // Manually expire it
      const cp = (await store.list({ buildId: 'build-1' }))[0];
      cp.expiresAt = new Date(Date.now() - 1000);
      await store.save(cp);

      const deleted = await manager.cleanup();
      expect(deleted).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit checkpoint:created event', async () => {
      const events: any[] = [];
      manager.onEvent((e) => events.push(e));

      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('checkpoint:created');
    });

    it('should emit checkpoint:loaded event', async () => {
      const events: any[] = [];

      const cp = await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      manager.onEvent((e) => events.push(e));
      await manager.loadCheckpoint(cp.id);

      expect(events.some(e => e.type === 'checkpoint:loaded')).toBe(true);
    });

    it('should allow unsubscribing from events', async () => {
      const events: any[] = [];
      const unsubscribe = manager.onEvent((e) => events.push(e));

      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'oracle', 'discovery', 1,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      unsubscribe();

      await manager.createCheckpoint(
        'build-1', 'tenant-1', 'empathy', 'discovery', 2,
        createMockBuildContext(), createMockAgentOutputs(), createMockQualityScores(),
        createMockDecisions(), createMockTiming(), createMockCosts()
      );

      expect(events.length).toBe(1); // Only first event captured
    });
  });

  describe('configuration', () => {
    it('should get current configuration', () => {
      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
    });

    it('should update configuration', () => {
      manager.updateConfig({ checkpointInterval: 5 });
      expect(manager.getConfig().checkpointInterval).toBe(5);
    });

    it('should enable/disable via setEnabled', () => {
      manager.setEnabled(false);
      expect(manager.getConfig().enabled).toBe(false);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS (10 tests)
// ============================================================================

describe('Utility Functions', () => {
  describe('getAgentPhase', () => {
    it('should return correct phase for discovery agents', () => {
      expect(getAgentPhase('oracle')).toBe('discovery');
      expect(getAgentPhase('empathy')).toBe('discovery');
    });

    it('should return correct phase for design agents', () => {
      expect(getAgentPhase('palette')).toBe('design');
      expect(getAgentPhase('blocks')).toBe('design');
    });

    it('should return correct phase for architecture agents', () => {
      expect(getAgentPhase('archon')).toBe('architecture');
      expect(getAgentPhase('datum')).toBe('architecture');
    });

    it('should return unknown for unmapped agents', () => {
      expect(getAgentPhase('unknown-agent')).toBe('unknown');
    });
  });

  describe('getAgentsForPhase', () => {
    it('should return discovery agents', () => {
      const agents = getAgentsForPhase('discovery');
      expect(agents).toContain('oracle');
      expect(agents).toContain('empathy');
    });

    it('should return frontend agents', () => {
      const agents = getAgentsForPhase('frontend');
      expect(agents).toContain('pixel');
      expect(agents).toContain('wire');
    });

    it('should return empty array for unknown phase', () => {
      const agents = getAgentsForPhase('unknown-phase');
      expect(agents).toEqual([]);
    });
  });

  describe('getAllAgentsOrdered', () => {
    it('should return all agents in phase order', () => {
      const agents = getAllAgentsOrdered();
      expect(agents.length).toBeGreaterThan(30);

      // Discovery agents should come before design agents
      const oracleIndex = agents.indexOf('oracle');
      const paletteIndex = agents.indexOf('palette');
      expect(oracleIndex).toBeLessThan(paletteIndex);
    });
  });

  describe('AGENT_PHASE_MAP', () => {
    it('should contain all expected phases', () => {
      const phases = new Set(Object.values(AGENT_PHASE_MAP));
      expect(phases.has('discovery')).toBe(true);
      expect(phases.has('design')).toBe(true);
      expect(phases.has('architecture')).toBe(true);
      expect(phases.has('frontend')).toBe(true);
      expect(phases.has('backend')).toBe(true);
    });
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS (5 tests)
// ============================================================================

describe('Factory Functions', () => {
  describe('createCheckpointStore', () => {
    it('should create in-memory store by default', () => {
      const store = createCheckpointStore();
      expect(store).toBeInstanceOf(InMemoryCheckpointStore);
    });

    it('should create in-memory store when type is memory', () => {
      const store = createCheckpointStore({ type: 'memory' });
      expect(store).toBeInstanceOf(InMemoryCheckpointStore);
    });

    it('should create Supabase store when credentials provided', () => {
      const store = createCheckpointStore({
        type: 'supabase',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
      });
      expect(store).toBeInstanceOf(SupabaseCheckpointStore);
    });
  });

  describe('createCheckpointManager', () => {
    it('should create manager with default config', () => {
      const store = new InMemoryCheckpointStore();
      const manager = createCheckpointManager(store);
      expect(manager.getConfig().enabled).toBe(true);
      manager.shutdown();
    });

    it('should create manager with custom config', () => {
      const store = new InMemoryCheckpointStore();
      const manager = createCheckpointManager(store, { checkpointInterval: 10 });
      expect(manager.getConfig().checkpointInterval).toBe(10);
      manager.shutdown();
    });
  });

  describe('createCheckpointSystem', () => {
    it('should create complete checkpoint system', () => {
      const { manager, store } = createCheckpointSystem({ storeType: 'memory' });
      expect(manager).toBeInstanceOf(CheckpointManager);
      expect(store).toBeInstanceOf(InMemoryCheckpointStore);
      manager.shutdown();
    });
  });
});

// ============================================================================
// DEFAULT CONFIG TESTS (3 tests)
// ============================================================================

describe('Default Configuration', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CHECKPOINT_CONFIG.autoCheckpoint).toBe(true);
    expect(DEFAULT_CHECKPOINT_CONFIG.checkpointInterval).toBe(1);
  });

  it('should have reasonable compression threshold', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.compressionThreshold).toBe(10 * 1024); // 10KB
  });

  it('should have reasonable expiration', () => {
    expect(DEFAULT_CHECKPOINT_CONFIG.defaultExpirationDays).toBe(7);
    expect(DEFAULT_CHECKPOINT_CONFIG.maxCheckpointsPerBuild).toBe(50);
  });
});

// ============================================================================
// HELPER: Create Test Checkpoint
// ============================================================================

function createTestCheckpoint(buildId: string, sequence: number): Checkpoint {
  const state: CheckpointState = {
    buildContext: createMockBuildContext({ buildId }),
    agentOutputs: createMockAgentOutputs(),
    qualityScores: createMockQualityScores(),
    decisions: createMockDecisions(),
    knowledge: {},
    progress: {
      completedAgents: ['oracle', 'empathy'],
      pendingAgents: ['palette', 'blocks'],
      failedAgents: [],
      skippedAgents: [],
      currentPhase: 'discovery',
      totalAgents: 4,
      completedCount: 2,
    },
    timing: createMockTiming(),
    costs: createMockCosts(),
  };

  return {
    id: `cp-${buildId}-${sequence}`,
    buildId,
    tenantId: 'test-tenant-123',
    sequence,
    agentId: 'oracle',
    phase: 'discovery',
    state,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    sizeBytes: 1000,
    compressed: false,
  };
}

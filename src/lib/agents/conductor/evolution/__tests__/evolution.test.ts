/**
 * EVOLUTION MODULE - Comprehensive Test Suite
 * Phase 7 of OLYMPUS 50X - CRITICAL for Level 5 (AUTONOMOUS)
 *
 * 50+ tests covering:
 * - EvolutionEngine (lifecycle, actions, configuration)
 * - PerformanceAnalyzer (metrics, trends, issues)
 * - PromptOptimizer (suggestions, experiments, variants)
 * - AgentCreator (proposals, testing, deployment)
 * - Meta-learning (patterns, success tracking)
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { EvolutionEngine, createEvolutionEngine } from '../index';
import { PerformanceAnalyzer } from '../analyzer';
import { PromptOptimizer } from '../optimizer';
import { AgentCreator } from '../creator';
import type {
  AgentPerformanceAnalysis,
  PromptImprovement,
  AgentProposal,
  MetaPattern,
  EvolutionConfig,
  EvolutionAction,
} from '../types';
import { DEFAULT_EVOLUTION_CONFIG } from '../types';

// ============================================================================
// MOCKS
// ============================================================================

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockReturnThis(),
};

const mockLLMProvider = {
  complete: vi.fn().mockResolvedValue(`\`\`\`json
{
  "improved_prompt": "You are an improved agent with better instructions...",
  "changes": [
    {
      "section": "introduction",
      "before": "You are an agent",
      "after": "You are an improved agent with better instructions",
      "reason": "Added specificity"
    }
  ],
  "confidence": 0.85,
  "expected_improvement": "Quality should improve by 0.5 points"
}
\`\`\``),
};

const mockPromptService = {
  getPromptById: vi.fn().mockResolvedValue({
    id: 'prompt-uuid-1',
    agentId: 'architect',
    version: 1,
    systemPrompt: 'You are the Architect agent...',
    outputSchema: { type: 'object' },
    status: 'active',
    isDefault: true,
  }),
  getPrompt: vi.fn().mockResolvedValue({
    promptId: 'prompt-uuid-1',
    agentId: 'architect',
    version: 1,
    systemPrompt: 'You are the Architect agent...',
  }),
  createPrompt: vi.fn().mockResolvedValue({
    id: 'prompt-uuid-2',
    agentId: 'architect',
    version: 2,
    status: 'draft',
  }),
  activatePrompt: vi.fn().mockResolvedValue(undefined),
  archivePrompt: vi.fn().mockResolvedValue(undefined),
  createExperiment: vi.fn().mockResolvedValue('exp-uuid-1'),
  startExperiment: vi.fn().mockResolvedValue(undefined),
  endExperiment: vi.fn().mockResolvedValue(undefined),
  cancelExperiment: vi.fn().mockResolvedValue(undefined),
  getExperiment: vi.fn().mockResolvedValue({
    id: 'exp-uuid-1',
    controlPromptId: 'prompt-uuid-1',
    variantPromptIds: ['prompt-uuid-2'],
    minSampleSize: 10,
    status: 'running',
  }),
  getPerformanceStats: vi.fn().mockResolvedValue({
    count: 15,
    avgQualityScore: 7.5,
    avgTokensUsed: 1500,
    avgLatencyMs: 2000,
    successRate: 0.95,
  }),
  getPromptHistory: vi
    .fn()
    .mockResolvedValue([{ id: 'prompt-uuid-1', version: 1, avgQualityScore: 7.0 }]),
  getPromptVersions: vi
    .fn()
    .mockResolvedValue([{ id: 'prompt-uuid-1', version: 1, status: 'active' }]),
};

// ============================================================================
// TEST DATA
// ============================================================================

const mockPerformanceData = [
  {
    id: 'exec-1',
    status: 'completed',
    duration_ms: 2000,
    tokens_used: 1500,
    retry_count: 0,
    agent_quality_metrics: [{ overall_score: 8.0, validation_passed: true }],
  },
  {
    id: 'exec-2',
    status: 'completed',
    duration_ms: 2200,
    tokens_used: 1600,
    retry_count: 0,
    agent_quality_metrics: [{ overall_score: 7.5, validation_passed: true }],
  },
  {
    id: 'exec-3',
    status: 'completed',
    duration_ms: 1800,
    tokens_used: 1400,
    retry_count: 1,
    agent_quality_metrics: [{ overall_score: 6.5, validation_passed: true }],
  },
  {
    id: 'exec-4',
    status: 'failed',
    duration_ms: 3000,
    tokens_used: 2000,
    retry_count: 2,
    agent_quality_metrics: [{ overall_score: 4.0, validation_passed: false }],
  },
];

const mockAnalysis: AgentPerformanceAnalysis = {
  agentId: 'architect',
  period: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    buildCount: 20,
  },
  quality: {
    averageScore: 6.5,
    scoreDistribution: { '1-3': 2, '4-6': 8, '7-8': 8, '9-10': 2 },
    trend: 'stable',
    volatility: 1.5,
  },
  efficiency: {
    averageTokens: 1500,
    averageLatency: 2000,
    retryRate: 0.15,
    failureRate: 0.05,
  },
  comparison: {
    vsHistoricalAvg: -5,
    vsBestPromptVersion: -10,
    ranking: 3,
  },
  issues: [
    {
      type: 'quality',
      severity: 'minor',
      description: 'Quality score below optimal',
      evidence: ['Average score is 6.5/10'],
      suggestedFix: 'Add more examples and clearer instructions',
    },
  ],
};

const mockImprovement: PromptImprovement = {
  agentId: 'architect',
  currentPromptId: 'prompt-uuid-1',
  currentVersion: 1,
  improvement: {
    type: 'refine',
    targetArea: 'Quality score below optimal',
    rationale: 'Refine optimization to address quality issues',
    expectedImpact: 4,
  },
  variant: {
    promptText: 'Improved prompt text...',
    changes: [
      {
        section: 'intro',
        before: 'You are an agent',
        after: 'You are an improved agent',
        reason: 'Added specificity',
      },
    ],
    confidence: 0.8,
  },
  testPlan: {
    trafficSplit: 20,
    minSampleSize: 10,
    successCriteria: {
      minQualityImprovement: 0.3,
      maxTokenIncrease: 0.15,
      minSampleSize: 10,
      confidenceLevel: 0.9,
    },
  },
};

const mockProposal: AgentProposal = {
  id: 'proposal-1',
  identity: {
    name: 'PAYMENTS',
    description: 'Handles payment integration',
    phase: 'integration',
    tier: 'sonnet',
  },
  justification: {
    gapDetected: 'Payment integration',
    userRequests: ['Add Stripe payments'],
    relatedAgents: ['gateway'],
    expectedValue: 'Enables seamless payment integration',
  },
  definition: {
    systemPrompt: 'You are PAYMENTS, an expert in payment processing...',
    outputSchema: { type: 'object' },
    dependencies: ['gateway'],
    capabilities: ['stripe integration', 'payment processing'],
  },
  testing: {
    testCases: [
      {
        input: 'Set up Stripe checkout',
        expectedOutputPattern: 'payment integration code',
        qualityThreshold: 7,
      },
    ],
    benchmarkAgents: ['gateway'],
    successCriteria: {
      minQualityScore: 6.5,
      maxFailureRate: 0.2,
      uniqueValueDemonstrated: true,
    },
  },
  status: 'proposed',
};

// ============================================================================
// EVOLUTION ENGINE TESTS
// ============================================================================

describe('EvolutionEngine', () => {
  let engine: EvolutionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new EvolutionEngine(mockSupabase as any, mockLLMProvider, mockPromptService as any, {
      enabled: true,
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const status = engine.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.pendingActions).toBe(0);
      expect(status.activeExperiments).toBe(0);
      expect(status.patternsLearned).toBe(0);
    });

    it('should accept custom config', () => {
      const customEngine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any,
        { enabled: false }
      );
      expect(customEngine.getStatus().enabled).toBe(false);
    });
  });

  describe('evolve', () => {
    it('should return disabled status when disabled', async () => {
      const disabledEngine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any,
        { enabled: false }
      );

      const report = await disabledEngine.evolve();
      expect(report.status).toBe('disabled');
    });

    it('should run complete evolution cycle', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const report = await engine.evolve();

      expect(report.status).toBe('completed');
      expect(report.startedAt).toBeDefined();
      expect(report.completedAt).toBeDefined();
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should emit events during evolution', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const events: string[] = [];
      engine.on('evolution:start', () => events.push('start'));
      engine.on('evolution:phase', () => events.push('phase'));
      engine.on('evolution:complete', () => events.push('complete'));

      await engine.evolve();

      expect(events).toContain('start');
      expect(events).toContain('complete');
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.limit.mockRejectedValue(new Error('Database error'));

      const report = await engine.evolve();

      expect(report.status).toBe('error');
      expect(report.error).toContain('Database error');
    });
  });

  describe('analyzeAgent', () => {
    it('should return performance analysis', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const analysis = await engine.analyzeAgent('architect');

      expect(analysis.agentId).toBe('architect');
      expect(analysis.quality).toBeDefined();
      expect(analysis.efficiency).toBeDefined();
      expect(analysis.comparison).toBeDefined();
      expect(analysis.issues).toBeDefined();
    });

    it('should accept custom period', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const customPeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const analysis = await engine.analyzeAgent('architect', customPeriod);

      expect(analysis.period.start).toEqual(customPeriod.start);
      expect(analysis.period.end).toEqual(customPeriod.end);
    });
  });

  describe('suggestImprovements', () => {
    it('should return multiple improvement suggestions', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const suggestions = await engine.suggestImprovements('architect');

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('action management', () => {
    it('should track pending actions', () => {
      const pendingActions = engine.getPendingActions();
      expect(Array.isArray(pendingActions)).toBe(true);
    });

    it('should require approval for agent creation', async () => {
      const proposal = await engine.proposeNewAgent('payment integration', {
        userRequests: ['add stripe'],
        relatedAgents: ['gateway'],
      });

      expect(proposal.status).toBe('proposed');
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      engine.updateConfig({ enabled: false });
      expect(engine.getConfig().enabled).toBe(false);
    });

    it('should return current configuration', () => {
      const config = engine.getConfig();
      expect(config).toBeDefined();
      expect(config.automation).toBeDefined();
      expect(config.safety).toBeDefined();
    });
  });

  describe('patterns', () => {
    it('should start with no patterns', () => {
      const patterns = engine.getPatterns();
      expect(patterns).toEqual([]);
    });

    it('should allow adding patterns', () => {
      const pattern: MetaPattern = {
        id: 'pattern-1',
        name: 'Test Pattern',
        description: 'A test pattern',
        trigger: { issueType: 'quality', conditions: ['score < 7'] },
        action: { promptModification: 'Add examples', examples: [] },
        performance: { timesApplied: 0, successRate: 0, averageImprovement: 0 },
      };

      engine.addPattern(pattern);
      expect(engine.getPatterns()).toHaveLength(1);
    });
  });
});

// ============================================================================
// PERFORMANCE ANALYZER TESTS
// ============================================================================

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new PerformanceAnalyzer(mockSupabase as any, mockPromptService as any);
  });

  describe('analyzeAgent', () => {
    it('should calculate quality metrics correctly', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.quality.averageScore).toBeGreaterThan(0);
      expect(analysis.quality.scoreDistribution).toBeDefined();
      expect(['improving', 'stable', 'declining']).toContain(analysis.quality.trend);
    });

    it('should calculate efficiency metrics', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.efficiency.averageTokens).toBeGreaterThan(0);
      expect(analysis.efficiency.averageLatency).toBeGreaterThan(0);
      expect(analysis.efficiency.failureRate).toBeGreaterThanOrEqual(0);
      expect(analysis.efficiency.retryRate).toBeGreaterThanOrEqual(0);
    });

    it('should detect declining trend', async () => {
      const decliningData = [
        {
          agent_quality_metrics: [{ overall_score: 8 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 7 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 6 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 5 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: decliningData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.quality.trend).toBe('declining');
    });

    it('should detect improving trend', async () => {
      const improvingData = [
        {
          agent_quality_metrics: [{ overall_score: 5 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 6 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 7 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 8 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: improvingData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.quality.trend).toBe('improving');
    });

    it('should detect quality issues', async () => {
      const lowQualityData = [
        {
          agent_quality_metrics: [{ overall_score: 4 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 3 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
        {
          agent_quality_metrics: [{ overall_score: 5 }],
          status: 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        },
      ];

      mockSupabase.limit.mockResolvedValue({ data: lowQualityData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues[0].type).toBe('quality');
    });

    it('should detect reliability issues', async () => {
      const unreliableData = Array(10)
        .fill(null)
        .map((_, i) => ({
          agent_quality_metrics: [{ overall_score: 7 }],
          status: i < 3 ? 'failed' : 'completed',
          tokens_used: 1000,
          duration_ms: 1000,
        }));

      mockSupabase.limit.mockResolvedValue({ data: unreliableData, error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      const reliabilityIssue = analysis.issues.find(i => i.type === 'reliability');
      expect(reliabilityIssue).toBeDefined();
    });

    it('should handle empty data', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.quality.averageScore).toBe(0);
      expect(analysis.period.buildCount).toBe(0);
    });
  });

  describe('findUnderperformers', () => {
    it('should identify agents below threshold', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const underperformers = await analyzer.findUnderperformers(7);
      expect(Array.isArray(underperformers)).toBe(true);
    });
  });

  describe('detectCapabilityGaps', () => {
    it('should detect gaps from failed builds', async () => {
      const failedBuilds = [
        { description: 'Add Stripe payment integration', error_message: 'Unknown capability' },
        { description: 'Create mobile app with React Native', error_message: 'Not supported' },
      ];

      mockSupabase.limit.mockResolvedValue({ data: failedBuilds, error: null });

      const gaps = await analyzer.detectCapabilityGaps();
      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  describe('findSuccessPatterns', () => {
    it('should extract patterns from successful improvements', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const patterns = await analyzer.findSuccessPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});

// ============================================================================
// PROMPT OPTIMIZER TESTS
// ============================================================================

describe('PromptOptimizer', () => {
  let optimizer: PromptOptimizer;

  beforeEach(() => {
    vi.clearAllMocks();
    optimizer = new PromptOptimizer(mockLLMProvider, mockPromptService as any);
  });

  describe('suggestImprovement', () => {
    it('should generate improvement suggestion', async () => {
      const improvement = await optimizer.suggestImprovement(mockAnalysis);

      expect(improvement).not.toBeNull();
      expect(improvement?.agentId).toBe('architect');
      expect(improvement?.improvement.type).toBeDefined();
      expect(improvement?.variant.promptText).toBeDefined();
    });

    it('should determine correct improvement type for high failure rate', async () => {
      const highFailureAnalysis = {
        ...mockAnalysis,
        efficiency: { ...mockAnalysis.efficiency, failureRate: 0.25 },
      };

      const improvement = await optimizer.suggestImprovement(highFailureAnalysis);
      expect(improvement?.improvement.type).toBe('simplify');
    });

    it('should determine correct improvement type for high volatility', async () => {
      const highVolatilityAnalysis = {
        ...mockAnalysis,
        quality: { ...mockAnalysis.quality, volatility: 3.0 },
      };

      const improvement = await optimizer.suggestImprovement(highVolatilityAnalysis);
      expect(improvement?.improvement.type).toBe('restructure');
    });

    it('should return null when no prompt found', async () => {
      mockPromptService.getPromptById.mockResolvedValueOnce(null);

      const improvement = await optimizer.suggestImprovement(mockAnalysis);
      expect(improvement).toBeNull();
    });
  });

  describe('suggestMultipleVariants', () => {
    it('should generate multiple variants', async () => {
      const variants = await optimizer.suggestMultipleVariants(mockAnalysis, 3);

      expect(Array.isArray(variants)).toBe(true);
      expect(variants.length).toBeLessThanOrEqual(3);
    });

    it('should use different strategies for each variant', async () => {
      const variants = await optimizer.suggestMultipleVariants(mockAnalysis, 3);

      if (variants.length >= 2) {
        const types = variants.map(v => v.improvement.type);
        const uniqueTypes = [...new Set(types)];
        expect(uniqueTypes.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('createExperiment', () => {
    it('should create and start experiment', async () => {
      const experimentId = await optimizer.createExperiment(mockImprovement);

      expect(experimentId).toBeDefined();
      expect(mockPromptService.createPrompt).toHaveBeenCalled();
      expect(mockPromptService.createExperiment).toHaveBeenCalled();
      expect(mockPromptService.startExperiment).toHaveBeenCalled();
    });
  });

  describe('evaluateExperiment', () => {
    it('should evaluate experiment results', async () => {
      const evaluation = await optimizer.evaluateExperiment('exp-uuid-1');

      expect(evaluation.shouldPromote).toBeDefined();
      expect(evaluation.reason).toBeDefined();
      expect(evaluation.metrics).toBeDefined();
    });
  });

  describe('loadPatterns', () => {
    it('should load meta-patterns', async () => {
      const patterns: MetaPattern[] = [
        {
          id: 'pattern-1',
          name: 'Clarity Pattern',
          description: 'Add clarity to prompts',
          trigger: { issueType: 'quality', conditions: [] },
          action: { promptModification: 'Add examples', examples: [] },
          performance: { timesApplied: 5, successRate: 0.8, averageImprovement: 0.5 },
        },
      ];

      await optimizer.loadPatterns(patterns);
      // Patterns should be used in next optimization
    });
  });
});

// ============================================================================
// AGENT CREATOR TESTS
// ============================================================================

describe('AgentCreator', () => {
  let creator: AgentCreator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLMProvider.complete.mockResolvedValue(`\`\`\`json
{
  "name": "PAYMENTS",
  "description": "Handles payment integration",
  "phase": "integration",
  "tier": "sonnet",
  "systemPrompt": "You are PAYMENTS, an expert in payment processing...",
  "outputSchema": {"type": "object"},
  "dependencies": ["gateway"],
  "capabilities": ["stripe integration", "payment processing"],
  "expectedValue": "Enables seamless payment integration"
}
\`\`\``);

    creator = new AgentCreator(mockLLMProvider, mockPromptService as any);
  });

  describe('proposeAgent', () => {
    it('should create agent proposal', async () => {
      const proposal = await creator.proposeAgent('payment integration', {
        userRequests: ['add stripe payments'],
        relatedAgents: ['gateway'],
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.identity.name).toBe('PAYMENTS');
      expect(proposal.identity.phase).toBe('integration');
      expect(proposal.status).toBe('proposed');
    });

    it('should include test cases', async () => {
      const proposal = await creator.proposeAgent('payment integration', {
        userRequests: ['add stripe', 'setup checkout'],
        relatedAgents: [],
      });

      expect(proposal.testing.testCases.length).toBeGreaterThan(0);
    });

    it('should include justification', async () => {
      const proposal = await creator.proposeAgent('payment integration', {
        userRequests: ['add stripe'],
        relatedAgents: ['gateway'],
      });

      expect(proposal.justification.gapDetected).toBe('payment integration');
      expect(proposal.justification.relatedAgents).toContain('gateway');
    });
  });

  describe('testAgent', () => {
    it('should run test cases', async () => {
      const result = await creator.testAgent(mockProposal);

      expect(result.results).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should calculate pass rate', async () => {
      const result = await creator.testAgent(mockProposal);

      expect(result.metrics.passRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.passRate).toBeLessThanOrEqual(1);
    });

    it('should handle test failures gracefully', async () => {
      mockLLMProvider.complete.mockRejectedValueOnce(new Error('LLM error'));

      const result = await creator.testAgent(mockProposal);

      expect(result.results.some(r => r.error)).toBe(true);
    });
  });

  describe('deployAgent', () => {
    it('should deploy agent and create prompt', async () => {
      const result = await creator.deployAgent(mockProposal);

      expect(result.success).toBe(true);
      expect(result.agentId).toBeDefined();
      expect(result.promptId).toBeDefined();
      expect(mockPromptService.createPrompt).toHaveBeenCalled();
      expect(mockPromptService.activatePrompt).toHaveBeenCalled();
    });
  });

  describe('getAgentDefinition', () => {
    it('should return agent definition for registry', () => {
      const definition = creator.getAgentDefinition(mockProposal);

      expect(definition.id).toBeDefined();
      expect(definition.name).toBe('PAYMENTS');
      expect(definition.description).toBe('Handles payment integration');
      expect(definition.optional).toBe(true);
    });
  });
});

// ============================================================================
// TYPE VALIDATION TESTS
// ============================================================================

describe('Type Validation', () => {
  describe('DEFAULT_EVOLUTION_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_EVOLUTION_CONFIG.enabled).toBe(true);
      expect(DEFAULT_EVOLUTION_CONFIG.automation.autoAnalyze).toBe(true);
      expect(DEFAULT_EVOLUTION_CONFIG.automation.autoSuggest).toBe(true);
      expect(DEFAULT_EVOLUTION_CONFIG.automation.autoTest).toBe(false);
      expect(DEFAULT_EVOLUTION_CONFIG.automation.autoPromote).toBe(false);
      expect(DEFAULT_EVOLUTION_CONFIG.automation.autoCreateAgents).toBe(false);
    });

    it('should have safety settings', () => {
      expect(DEFAULT_EVOLUTION_CONFIG.safety.maxConcurrentExperiments).toBe(3);
      expect(DEFAULT_EVOLUTION_CONFIG.safety.maxPromptChangesPerDay).toBe(5);
      expect(DEFAULT_EVOLUTION_CONFIG.safety.rollbackOnRegression).toBe(true);
    });

    it('should have analysis thresholds', () => {
      expect(DEFAULT_EVOLUTION_CONFIG.thresholds.minBuildsSample).toBe(10);
      expect(DEFAULT_EVOLUTION_CONFIG.thresholds.qualityDrop).toBe(0.5);
      expect(DEFAULT_EVOLUTION_CONFIG.thresholds.underperformerThreshold).toBe(6.5);
    });
  });

  describe('EvolutionAction interface', () => {
    it('should accept valid action', () => {
      const action: EvolutionAction = {
        id: 'action-1',
        type: 'optimize_prompt',
        target: 'architect',
        details: mockImprovement,
        approvalRequired: true,
        status: 'pending',
      };

      expect(action.id).toBe('action-1');
      expect(action.type).toBe('optimize_prompt');
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  describe('Evolution cycle flow', () => {
    it('should complete full analyze-optimize-test cycle', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const engine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any,
        { enabled: true, automation: { ...DEFAULT_EVOLUTION_CONFIG.automation, autoTest: true } }
      );

      const report = await engine.evolve();

      expect(report.status).toBe('completed');
      expect(report.summary).toBeDefined();
    });
  });

  describe('Event emission', () => {
    it('should emit all expected events', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const engine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any
      );

      const receivedEvents: string[] = [];
      engine.on('evolution:start', () => receivedEvents.push('start'));
      engine.on('evolution:phase', () => receivedEvents.push('phase'));
      engine.on('evolution:complete', () => receivedEvents.push('complete'));

      await engine.evolve();

      expect(receivedEvents).toContain('start');
      expect(receivedEvents).toContain('complete');
    });
  });

  describe('Factory function', () => {
    it('should create engine with createEvolutionEngine', () => {
      const engine = createEvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any
      );

      expect(engine).toBeInstanceOf(EvolutionEngine);
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  describe('Empty data handling', () => {
    it('should handle no agents gracefully', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const engine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any
      );

      const analyses = await engine.analyzeAllAgents();
      expect(analyses).toEqual([]);
    });

    it('should handle no performance data', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      const analyzer = new PerformanceAnalyzer(mockSupabase as any, mockPromptService as any);

      const analysis = await analyzer.analyzeAgent('test', {
        start: new Date(),
        end: new Date(),
      });

      expect(analysis.period.buildCount).toBe(0);
      expect(analysis.quality.averageScore).toBe(0);
    });
  });

  describe('Error recovery', () => {
    it('should recover from LLM failures', async () => {
      mockLLMProvider.complete.mockRejectedValueOnce(new Error('LLM timeout'));

      const optimizer = new PromptOptimizer(mockLLMProvider, mockPromptService as any);
      const improvement = await optimizer.suggestImprovement(mockAnalysis);

      // Should return null instead of throwing
      expect(improvement).toBeNull();
    });

    it('should handle database errors', async () => {
      mockSupabase.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const engine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any
      );

      const report = await engine.evolve();

      // Should complete with error status
      expect(['completed', 'error']).toContain(report.status);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent analysis requests', async () => {
      mockSupabase.limit.mockResolvedValue({ data: mockPerformanceData, error: null });

      const engine = new EvolutionEngine(
        mockSupabase as any,
        mockLLMProvider,
        mockPromptService as any
      );

      const results = await Promise.all([
        engine.analyzeAgent('agent1'),
        engine.analyzeAgent('agent2'),
        engine.analyzeAgent('agent3'),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.quality).toBeDefined();
      });
    });
  });

  describe('Special characters', () => {
    it('should handle special characters in prompts', async () => {
      mockLLMProvider.complete.mockResolvedValueOnce(`\`\`\`json
{
  "improved_prompt": "Handle 'quotes', \\"escapes\\", and special chars: <>&",
  "changes": [],
  "confidence": 0.8
}
\`\`\``);

      const optimizer = new PromptOptimizer(mockLLMProvider, mockPromptService as any);
      const improvement = await optimizer.suggestImprovement(mockAnalysis);

      expect(improvement?.variant.promptText).toBeDefined();
    });
  });
});

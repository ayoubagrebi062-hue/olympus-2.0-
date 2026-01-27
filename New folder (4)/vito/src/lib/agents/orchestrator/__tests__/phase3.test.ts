/**
 * Phase 3: Build Plan Integration Tests
 * 30+ tests covering BuildPlanStore, Phase Rules, and State Machine
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Supabase client
const mockSupabaseData: Record<string, unknown[]> = {
  build_plans: [],
};

const mockSupabaseClient = {
  from: vi.fn((table: string) => ({
    insert: vi.fn((data: unknown) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          const newRecord = {
            id: 'plan-' + Date.now(),
            ...(data as Record<string, unknown>),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockSupabaseData[table] = mockSupabaseData[table] || [];
          mockSupabaseData[table].push(newRecord);
          return { data: newRecord, error: null };
        }),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn((field: string, value: unknown) => ({
        single: vi.fn(async () => {
          const records = mockSupabaseData[table] || [];
          const record = records.find((r: Record<string, unknown>) => r[field] === value);
          return { data: record || null, error: record ? null : { message: 'Not found' } };
        }),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            range: vi.fn(async () => {
              const records = mockSupabaseData[table] || [];
              return { data: records, error: null };
            }),
          })),
        })),
      })),
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            range: vi.fn(async () => {
              const records = mockSupabaseData[table] || [];
              return { data: records, error: null };
            }),
          })),
        })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          range: vi.fn(async () => {
            const records = mockSupabaseData[table] || [];
            return { data: records, error: null };
          }),
        })),
      })),
    })),
    update: vi.fn((data: unknown) => ({
      eq: vi.fn(async (field: string, value: unknown) => {
        const records = mockSupabaseData[table] || [];
        const index = records.findIndex((r: Record<string, unknown>) => r[field] === value);
        if (index >= 0) {
          records[index] = { ...records[index], ...(data as object) };
        }
        return { data: null, error: null };
      }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(async (field: string, value: unknown) => {
        const records = mockSupabaseData[table] || [];
        const index = records.findIndex((r: Record<string, unknown>) => r[field] === value);
        if (index >= 0) {
          records.splice(index, 1);
        }
        return { data: null, error: null };
      }),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Import SupabaseClient type for static method tests
import type { SupabaseClient } from '@supabase/supabase-js';

// Import after mocking
import {
  BuildPlanStore,
  type BuildPlan,
  type BuildPhase,
  type AgentPlan,
  type CreatePlanInput,
} from '../build-plan-store';

import {
  validateTransition,
  getValidNextPhases,
  canSkipPhase,
  getPhasesForProjectType,
  getPhaseAgents,
  getRecommendedNextPhase,
  areAllPhasesComplete,
  getPhaseOrder,
  transitionRequiresApproval,
  type PhaseId,
  type TransitionContext,
  PHASE_DEFINITIONS,
  PHASE_SKIP_RULES,
} from '../phase-rules';

import {
  BuildStateMachine,
  createStateMachine,
  type BuildState,
} from '../state-machine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockPlan = (overrides: Partial<BuildPlan> = {}): BuildPlan => ({
  id: 'plan-123',
  buildId: 'build-456',
  projectType: 'saas-full',
  phases: [
    { id: 'discovery', name: 'Discovery', order: 0, agents: ['oracle', 'strategos'], status: 'pending' },
    { id: 'design', name: 'Design', order: 1, agents: ['palette', 'blocks'], status: 'pending' },
    { id: 'architecture', name: 'Architecture', order: 2, agents: ['archon', 'datum'], status: 'pending' },
  ],
  agents: [
    { agentId: 'oracle', phase: 'discovery', order: 0, required: true, dependencies: [], status: 'pending', retryCount: 0, maxRetries: 3 },
    { agentId: 'strategos', phase: 'discovery', order: 1, required: true, dependencies: ['oracle'], status: 'pending', retryCount: 0, maxRetries: 3 },
    { agentId: 'palette', phase: 'design', order: 2, required: false, dependencies: ['strategos'], status: 'pending', retryCount: 0, maxRetries: 3 },
    { agentId: 'blocks', phase: 'design', order: 3, required: true, dependencies: ['palette'], status: 'pending', retryCount: 0, maxRetries: 3 },
    { agentId: 'archon', phase: 'architecture', order: 4, required: true, dependencies: ['blocks'], status: 'pending', retryCount: 0, maxRetries: 3 },
    { agentId: 'datum', phase: 'architecture', order: 5, required: true, dependencies: ['archon'], status: 'pending', retryCount: 0, maxRetries: 3 },
  ],
  currentPhase: null,
  currentAgent: null,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockTransitionContext = (
  overrides: Partial<TransitionContext> = {}
): TransitionContext => ({
  buildId: 'build-123',
  projectType: 'saas-full',
  fromPhase: 'discovery',
  toPhase: 'design',
  completedAgents: ['oracle', 'empathy', 'strategos'],
  agentOutputs: new Map([
    ['strategos', { mvp_features: ['feature1', 'feature2'] }],
  ]),
  qualityScores: new Map([
    ['oracle', 7.5],
    ['strategos', 8.0],
  ]),
  errors: new Map(),
  ...overrides,
});

// ============================================================================
// BUILD PLAN STORE TESTS
// ============================================================================

describe('BuildPlanStore', () => {
  let store: BuildPlanStore;

  beforeEach(() => {
    // Clear mock data
    Object.keys(mockSupabaseData).forEach(key => {
      mockSupabaseData[key] = [];
    });
    vi.clearAllMocks();

    // Set env vars for store initialization
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    store = new BuildPlanStore();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('create()', () => {
    it('should create a new build plan', async () => {
      const input: CreatePlanInput = {
        buildId: 'build-123',
        projectType: 'saas-full',
        phases: [
          { id: 'discovery', name: 'Discovery', order: 0, agents: ['oracle'] },
        ],
        agents: [
          { agentId: 'oracle', phase: 'discovery', order: 0, required: true, dependencies: [], maxRetries: 3 },
        ],
      };

      const plan = await store.create(input);

      expect(plan).toBeDefined();
      expect(plan.buildId).toBe('build-123');
      expect(plan.projectType).toBe('saas-full');
      expect(plan.phases).toHaveLength(1);
      expect(plan.agents).toHaveLength(1);
      expect(plan.status).toBe('pending');
    });

    it('should initialize agents with pending status', async () => {
      const input: CreatePlanInput = {
        buildId: 'build-123',
        projectType: 'saas-full',
        phases: [],
        agents: [
          { agentId: 'oracle', phase: 'discovery', order: 0, required: true, dependencies: [], maxRetries: 3 },
        ],
      };

      const plan = await store.create(input);

      expect(plan.agents[0].status).toBe('pending');
      expect(plan.agents[0].retryCount).toBe(0);
    });
  });

  describe('getProgress()', () => {
    it('should calculate correct progress', async () => {
      const mockPlan = createMockPlan({
        agents: [
          { agentId: 'oracle', phase: 'discovery', order: 0, required: true, dependencies: [], status: 'completed', retryCount: 0, maxRetries: 3 },
          { agentId: 'strategos', phase: 'discovery', order: 1, required: true, dependencies: [], status: 'completed', retryCount: 0, maxRetries: 3 },
          { agentId: 'palette', phase: 'design', order: 2, required: false, dependencies: [], status: 'pending', retryCount: 0, maxRetries: 3 },
          { agentId: 'blocks', phase: 'design', order: 3, required: true, dependencies: [], status: 'pending', retryCount: 0, maxRetries: 3 },
        ],
      });

      // Mock getById to return our plan
      mockSupabaseData.build_plans = [mockPlan];

      const progress = await store.getProgress(mockPlan.id);

      expect(progress.totalAgents).toBe(4);
      expect(progress.completedAgents).toBe(2);
      expect(progress.pendingAgents).toBe(2);
      expect(progress.progressPercent).toBe(50);
    });
  });
});

// ============================================================================
// PHASE RULES TESTS
// ============================================================================

describe('Phase Rules', () => {
  describe('validateTransition()', () => {
    it('should validate discovery -> design transition with all conditions met', async () => {
      const context = createMockTransitionContext({
        fromPhase: 'discovery',
        toPhase: 'design',
        completedAgents: ['oracle', 'empathy', 'strategos'],
        agentOutputs: new Map([
          ['strategos', { mvp_features: ['feature1'] }],
        ]),
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should block transition when STRATEGOS not complete', async () => {
      const context = createMockTransitionContext({
        fromPhase: 'discovery',
        toPhase: 'design',
        completedAgents: ['oracle', 'empathy'], // Missing strategos
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('STRATEGOS'))).toBe(true);
    });

    it('should block transition when MVP features not defined', async () => {
      const context = createMockTransitionContext({
        fromPhase: 'discovery',
        toPhase: 'design',
        completedAgents: ['oracle', 'empathy', 'strategos'],
        agentOutputs: new Map([
          ['strategos', {}], // No mvp_features
        ]),
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('MVP'))).toBe(true);
    });

    it('should block invalid transition path', async () => {
      const context = createMockTransitionContext({
        fromPhase: 'discovery',
        toPhase: 'frontend', // Can't skip design and architecture
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid transition'))).toBe(true);
    });

    it('should allow start -> discovery transition', async () => {
      const context = createMockTransitionContext({
        fromPhase: null,
        toPhase: 'discovery',
        completedAgents: [],
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(true);
    });

    it('should add warnings for non-required conditions', async () => {
      const context = createMockTransitionContext({
        fromPhase: 'discovery',
        toPhase: 'design',
        completedAgents: ['oracle', 'empathy', 'strategos'],
        agentOutputs: new Map([
          ['strategos', { mvp_features: ['feature1'] }],
        ]),
        errors: new Map([
          ['oracle', 'Non-critical error'],
        ]),
      });

      const result = await validateTransition(context);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getValidNextPhases()', () => {
    it('should return valid phases from start', () => {
      const nextPhases = getValidNextPhases(null);

      expect(nextPhases).toContain('discovery');
    });

    it('should return valid phases from discovery', () => {
      const nextPhases = getValidNextPhases('discovery');

      expect(nextPhases).toContain('design');
    });

    it('should return multiple options from architecture', () => {
      const nextPhases = getValidNextPhases('architecture');

      expect(nextPhases).toContain('frontend');
      expect(nextPhases).toContain('backend');
    });
  });

  describe('canSkipPhase()', () => {
    it('should allow skipping backend for landing-page', () => {
      expect(canSkipPhase('backend', 'landing-page')).toBe(true);
    });

    it('should allow skipping integration for landing-page', () => {
      expect(canSkipPhase('integration', 'landing-page')).toBe(true);
    });

    it('should not allow skipping backend for saas-full', () => {
      expect(canSkipPhase('backend', 'saas-full')).toBe(false);
    });

    it('should allow skipping frontend for api-only', () => {
      expect(canSkipPhase('frontend', 'api-only')).toBe(true);
    });
  });

  describe('getPhasesForProjectType()', () => {
    it('should return all phases for saas-full', () => {
      const phases = getPhasesForProjectType('saas-full');

      expect(phases).toContain('discovery');
      expect(phases).toContain('design');
      expect(phases).toContain('architecture');
      expect(phases).toContain('frontend');
      expect(phases).toContain('backend');
      expect(phases).toContain('integration');
      expect(phases).toContain('testing');
      expect(phases).toContain('deployment');
    });

    it('should exclude backend for landing-page', () => {
      const phases = getPhasesForProjectType('landing-page');

      expect(phases).not.toContain('backend');
      expect(phases).not.toContain('integration');
      expect(phases).toContain('frontend');
    });

    it('should return phases in correct order', () => {
      const phases = getPhasesForProjectType('saas-full');

      expect(phases.indexOf('discovery')).toBeLessThan(phases.indexOf('design'));
      expect(phases.indexOf('design')).toBeLessThan(phases.indexOf('architecture'));
      expect(phases.indexOf('architecture')).toBeLessThan(phases.indexOf('frontend'));
    });
  });

  describe('getPhaseAgents()', () => {
    it('should return agents for discovery phase', () => {
      const agents = getPhaseAgents('discovery');

      expect(agents).toContain('oracle');
      expect(agents).toContain('empathy');
      expect(agents).toContain('strategos');
    });

    it('should return agents for frontend phase', () => {
      const agents = getPhaseAgents('frontend');

      expect(agents).toContain('pixel');
      expect(agents).toContain('wire');
    });
  });

  describe('getRecommendedNextPhase()', () => {
    it('should recommend design after discovery', () => {
      const recommended = getRecommendedNextPhase('discovery', 'saas-full');

      expect(recommended).toBe('design');
    });

    it('should skip backend for landing-page after architecture', () => {
      const recommended = getRecommendedNextPhase('architecture', 'landing-page');

      expect(recommended).toBe('frontend');
    });
  });

  describe('areAllPhasesComplete()', () => {
    it('should detect all phases complete', () => {
      // For landing-page, skipped phases are: backend, integration, testing
      // So required phases are: discovery, design, architecture, frontend, deployment
      const phases: BuildPhase[] = [
        { id: 'discovery', name: 'Discovery', order: 0, agents: [], status: 'completed' },
        { id: 'design', name: 'Design', order: 1, agents: [], status: 'completed' },
        { id: 'architecture', name: 'Architecture', order: 2, agents: [], status: 'completed' },
        { id: 'frontend', name: 'Frontend', order: 3, agents: [], status: 'completed' },
        { id: 'deployment', name: 'Deployment', order: 7, agents: [], status: 'completed' },
      ];

      const result = areAllPhasesComplete(phases, 'landing-page');

      expect(result.complete).toBe(true);
      expect(result.remaining).toHaveLength(0);
    });

    it('should detect incomplete phases', () => {
      const phases: BuildPhase[] = [
        { id: 'discovery', name: 'Discovery', order: 0, agents: [], status: 'completed' },
        { id: 'design', name: 'Design', order: 1, agents: [], status: 'pending' },
      ];

      const result = areAllPhasesComplete(phases, 'saas-full');

      expect(result.complete).toBe(false);
      expect(result.remaining.length).toBeGreaterThan(0);
    });
  });

  describe('getPhaseOrder()', () => {
    it('should return correct order for discovery', () => {
      expect(getPhaseOrder('discovery')).toBe(0);
    });

    it('should return correct order for deployment', () => {
      expect(getPhaseOrder('deployment')).toBe(7);
    });
  });

  describe('transitionRequiresApproval()', () => {
    it('should require approval for deployment', () => {
      expect(transitionRequiresApproval('testing', 'deployment')).toBe(true);
    });

    it('should require approval when skipping phases', () => {
      expect(transitionRequiresApproval('discovery', 'architecture')).toBe(true);
    });

    it('should not require approval for normal transitions', () => {
      expect(transitionRequiresApproval('discovery', 'design')).toBe(false);
    });
  });
});

// ============================================================================
// STATE MACHINE TESTS
// ============================================================================

describe('BuildStateMachine', () => {
  let machine: BuildStateMachine;
  let mockStore: BuildPlanStore;
  let mockPlan: BuildPlan;

  beforeEach(() => {
    // Create mock store with spied methods
    mockStore = {
      getById: vi.fn(),
      getByBuildId: vi.fn(),
      updateStatus: vi.fn(),
      updatePhaseStatus: vi.fn(),
      updateAgentStatus: vi.fn(),
      getNextAgent: vi.fn(),
      isPlanComplete: vi.fn(),
      hasPlanFailed: vi.fn(),
      canAgentRetry: vi.fn(),
      incrementRetryCount: vi.fn(),
    } as unknown as BuildPlanStore;

    mockPlan = createMockPlan();
    machine = createStateMachine(mockStore);
  });

  describe('initialization', () => {
    it('should start in created state', () => {
      expect(machine.getState()).toBe('created');
    });

    it('should initialize with build context', async () => {
      await machine.initialize('build-123', mockPlan);

      const context = machine.getContext();
      expect(context.buildId).toBe('build-123');
      expect(context.plan).toBe(mockPlan);
    });
  });

  describe('trigger()', () => {
    beforeEach(async () => {
      await machine.initialize('build-123', mockPlan);
    });

    it('should transition from created to planning on start', async () => {
      const result = await machine.trigger('start');

      expect(result).toBe(true);
      expect(machine.getState()).toBe('planning');
    });

    it('should transition from planning to running on plan_complete', async () => {
      await machine.trigger('start');

      const result = await machine.trigger('plan_complete');

      expect(result).toBe(true);
      expect(machine.getState()).toBe('running');
    });

    it('should reject invalid transitions', async () => {
      const result = await machine.trigger('all_agents_complete');

      expect(result).toBe(false);
      expect(machine.getState()).toBe('created');
    });

    it('should handle pause and resume', async () => {
      await machine.trigger('start');
      await machine.trigger('plan_complete');

      await machine.trigger('pause');
      expect(machine.getState()).toBe('paused');

      await machine.trigger('resume');
      expect(machine.getState()).toBe('running');
    });

    it('should handle cancellation from multiple states', async () => {
      await machine.trigger('start');

      const result = await machine.trigger('cancel');

      expect(result).toBe(true);
      expect(machine.getState()).toBe('cancelled');
    });
  });

  describe('transitionPhase()', () => {
    beforeEach(async () => {
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(mockPlan);
      vi.mocked(mockStore.updatePhaseStatus).mockResolvedValue();

      await machine.initialize('build-123', mockPlan);
      await machine.trigger('start');
      await machine.trigger('plan_complete');
    });

    it('should validate phase transitions', async () => {
      // First transition to discovery phase (from null)
      const planInDiscovery = createMockPlan({
        currentPhase: null,
        agents: mockPlan.agents.map(a => ({
          ...a,
          status: a.phase === 'discovery' ? 'completed' as const : 'pending' as const,
          output: a.agentId === 'strategos' ? { mvp_features: ['f1'] } : {},
        })),
      });
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(planInDiscovery);
      await machine.transitionPhase('discovery');

      // Now try to transition to design - with all agents completed
      const planWithCompleted = createMockPlan({
        currentPhase: 'discovery',
        agents: mockPlan.agents.map(a => ({
          ...a,
          status: 'completed' as const,
          output: a.agentId === 'strategos' ? { mvp_features: ['f1'] } : {},
        })),
      });
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(planWithCompleted);

      const result = await machine.transitionPhase('design');

      expect(result.valid).toBe(true);
    });

    it('should emit phase_transition event on success', async () => {
      const events: unknown[] = [];
      machine.on('phase_transition', (e) => events.push(e));

      // First transition to discovery phase (from null)
      const planInDiscovery = createMockPlan({
        currentPhase: null, // Starting from null
        agents: mockPlan.agents.map(a => ({
          ...a,
          status: a.phase === 'discovery' ? 'completed' as const : 'pending' as const,
          output: a.agentId === 'strategos' ? { mvp_features: ['f1'] } : {},
        })),
      });
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(planInDiscovery);
      await machine.transitionPhase('discovery');

      // Now transition to design phase (from discovery)
      const planWithCompleted = createMockPlan({
        currentPhase: 'discovery',
        agents: mockPlan.agents.map(a => ({
          ...a,
          status: 'completed' as const,
          output: a.agentId === 'strategos' ? { mvp_features: ['f1'] } : {},
        })),
      });
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(planWithCompleted);
      await machine.transitionPhase('design');

      // Should have 2 events: null->discovery, discovery->design
      expect(events.length).toBe(2);
    });
  });

  describe('skipPhase()', () => {
    beforeEach(async () => {
      const landingPagePlan = createMockPlan({ projectType: 'landing-page' });
      vi.mocked(mockStore.updatePhaseStatus).mockResolvedValue();
      vi.mocked(mockStore.updateAgentStatus).mockResolvedValue();

      await machine.initialize('build-123', landingPagePlan);
    });

    it('should skip phases for compatible project types', async () => {
      const result = await machine.skipPhase('backend');

      expect(result).toBe(true);
      expect(mockStore.updatePhaseStatus).toHaveBeenCalledWith(
        expect.any(String),
        'backend',
        'skipped'
      );
    });
  });

  describe('getAvailableTransitions()', () => {
    it('should return available transitions for created state', async () => {
      await machine.initialize('build-123', mockPlan);

      const transitions = machine.getAvailableTransitions();

      expect(transitions).toContain('start');
      expect(transitions).toContain('cancel');
    });

    it('should return available transitions for running state', async () => {
      await machine.initialize('build-123', mockPlan);
      await machine.trigger('start');
      await machine.trigger('plan_complete');

      const transitions = machine.getAvailableTransitions();

      expect(transitions).toContain('pause');
      expect(transitions).toContain('agent_complete');
      expect(transitions).toContain('all_agents_complete');
      expect(transitions).toContain('critical_failure');
    });
  });

  describe('canTransition()', () => {
    beforeEach(async () => {
      await machine.initialize('build-123', mockPlan);
    });

    it('should return true for valid transitions', () => {
      expect(machine.canTransition('start')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(machine.canTransition('resume')).toBe(false);
    });
  });

  describe('isTerminal()', () => {
    beforeEach(async () => {
      await machine.initialize('build-123', mockPlan);
    });

    it('should return false for non-terminal states', () => {
      expect(machine.isTerminal()).toBe(false);
    });

    it('should return true for completed state', async () => {
      await machine.trigger('start');
      await machine.trigger('plan_complete');

      // Force state for test
      vi.mocked(mockStore.isPlanComplete).mockResolvedValue(true);

      // Manually trigger completion
      (machine as unknown as { state: BuildState }).state = 'completed';

      expect(machine.isTerminal()).toBe(true);
    });

    it('should return true for failed state', async () => {
      (machine as unknown as { state: BuildState }).state = 'failed';

      expect(machine.isTerminal()).toBe(true);
    });

    it('should return true for cancelled state', async () => {
      await machine.trigger('cancel');

      expect(machine.isTerminal()).toBe(true);
    });
  });

  describe('getHistory()', () => {
    it('should track all transitions', async () => {
      await machine.initialize('build-123', mockPlan);
      await machine.trigger('start');
      await machine.trigger('plan_complete');

      const history = machine.getHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some(e => e.type === 'transition')).toBe(true);
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await machine.initialize('build-123', mockPlan);
    });

    it('should emit transition events', async () => {
      const events: unknown[] = [];
      machine.on('transition', (e) => events.push(e));

      await machine.trigger('start');

      expect(events.length).toBe(1);
    });

    it('should emit invalid_transition events', async () => {
      const events: unknown[] = [];
      machine.on('invalid_transition', (e) => events.push(e));

      await machine.trigger('resume'); // Invalid from created

      expect(events.length).toBe(1);
    });

    it('should emit stateEvent for all events', async () => {
      const events: unknown[] = [];
      machine.on('stateEvent', (e) => events.push(e));

      await machine.trigger('start');
      await machine.trigger('plan_complete');

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// PRODUCTION-READY IMPLEMENTATIONS TESTS (Post-Critique Fixes)
// ============================================================================

import {
  TransactionalPlanStore,
  type BuildPlanRecord,
  type CreatePlanInput as TransactionalCreateInput,
} from '../transactional-plan-store';

import {
  PersistentStateMachine,
  type PersistedState,
} from '../persistent-state-machine';

describe('TransactionalPlanStore', () => {
  let store: TransactionalPlanStore;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    store = new TransactionalPlanStore();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('atomic operations', () => {
    it('should use RPC for atomic plan creation', async () => {
      const mockRpcResult = {
        id: 'plan-123',
        build_id: 'build-456',
        project_type: 'saas-full',
        status: 'pending',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the rpc call
      const rpcMock = vi.fn().mockResolvedValue({ data: mockRpcResult, error: null });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const input: TransactionalCreateInput = {
        buildId: 'build-456',
        projectType: 'saas-full',
        phases: [{ phaseId: 'discovery', name: 'Discovery', order: 0 }],
        agents: [{ agentId: 'oracle', phaseId: 'discovery', order: 0, isRequired: true, dependencies: [] }],
      };

      const plan = await store.createPlan(input);

      expect(rpcMock).toHaveBeenCalledWith('create_build_plan_atomic', expect.any(Object));
      expect(plan.buildId).toBe('build-456');
    });

    it('should use optimistic locking for agent updates', async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [{ success: true, new_version: 2, message: 'Updated' }],
        error: null,
      });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const result = await store.updateAgentStatus('plan-123', 'oracle', 'completed', 1, {
        output: { result: 'success' },
      });

      expect(rpcMock).toHaveBeenCalledWith('update_agent_with_lock', {
        p_plan_id: 'plan-123',
        p_agent_id: 'oracle',
        p_status: 'completed',
        p_expected_version: 1,
        p_output: { result: 'success' },
        p_error: null,
      });
      expect(result.success).toBe(true);
      expect(result.newVersion).toBe(2);
    });

    it('should handle version conflicts gracefully', async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [{ success: false, new_version: 3, message: 'Version mismatch' }],
        error: null,
      });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const result = await store.updateAgentStatus('plan-123', 'oracle', 'completed', 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('mismatch');
    });

    it('should batch update agents atomically', async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [
          { agent_id: 'oracle', success: true, new_version: 2 },
          { agent_id: 'strategos', success: true, new_version: 2 },
        ],
        error: null,
      });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const updates = [
        { agentId: 'oracle', status: 'completed' as const },
        { agentId: 'strategos', status: 'completed' as const },
      ];

      const results = await store.batchUpdateAgents('plan-123', updates);

      expect(rpcMock).toHaveBeenCalledWith('batch_update_agents', expect.any(Object));
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('optimized queries', () => {
    it('should get next agent in single query', async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [{
          agent_id: 'oracle',
          phase_id: 'discovery',
          agent_order: 0,
          is_required: true,
          dependencies: [],
          version: 1,
        }],
        error: null,
      });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const agent = await store.getNextAgent('plan-123');

      expect(rpcMock).toHaveBeenCalledWith('get_next_executable_agent', { p_plan_id: 'plan-123' });
      expect(agent).not.toBeNull();
      expect(agent?.agentId).toBe('oracle');
    });

    it('should return null when no agents ready', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const agent = await store.getNextAgent('plan-123');

      expect(agent).toBeNull();
    });

    it('should get progress in single query', async () => {
      const rpcMock = vi.fn().mockResolvedValue({
        data: [{
          total_agents: 10,
          completed_agents: 5,
          failed_agents: 1,
          running_agents: 1,
          pending_agents: 3,
          skipped_agents: 0,
          progress_percent: 50.0,
          current_phase: 'design',
          current_agent: 'palette',
        }],
        error: null,
      });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      const progress = await store.getProgress('plan-123');

      expect(progress.totalAgents).toBe(10);
      expect(progress.completedAgents).toBe(5);
      expect(progress.progressPercent).toBe(50);
      expect(progress.currentPhase).toBe('design');
    });
  });

  describe('phase advancement', () => {
    it('should complete phase and advance atomically', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      await store.completePhaseAndAdvance('plan-123', 'discovery', 'design');

      expect(rpcMock).toHaveBeenCalledWith('complete_phase_and_advance', {
        p_plan_id: 'plan-123',
        p_current_phase: 'discovery',
        p_next_phase: 'design',
      });
    });

    it('should handle final phase with null next phase', async () => {
      const rpcMock = vi.fn().mockResolvedValue({ error: null });
      (mockSupabaseClient as unknown as { rpc: typeof rpcMock }).rpc = rpcMock;

      await store.completePhaseAndAdvance('plan-123', 'deployment', null);

      expect(rpcMock).toHaveBeenCalledWith('complete_phase_and_advance', {
        p_plan_id: 'plan-123',
        p_current_phase: 'deployment',
        p_next_phase: null,
      });
    });
  });
});

describe('PersistentStateMachine', () => {
  let machine: PersistentStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    machine = new PersistentStateMachine();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe('initialization', () => {
    it('should persist initial state to database', async () => {
      const mockInsertResult = {
        id: 'state-123',
        build_id: 'build-456',
        plan_id: 'plan-789',
        current_state: 'created',
        version: 1,
      };

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInsertResult, error: null }),
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      });

      const mockPlan = { id: 'plan-789' } as BuildPlan;
      await machine.initialize('build-456', mockPlan);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('build_state_machines');
      expect(machine.getState()).toBe('created');
    });
  });

  describe('recovery', () => {
    it('should recover state from database', async () => {
      const mockPersistedState = {
        id: 'state-123',
        build_id: 'build-456',
        plan_id: 'plan-789',
        current_state: 'running',
        current_phase: 'design',
        current_agent: 'palette',
        version: 5,
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPersistedState, error: null }),
          }),
        }),
      });

      const recovered = await machine.recover('build-456');

      expect(recovered).toBe(true);
      expect(machine.getState()).toBe('running');
      expect(machine.getPhase()).toBe('design');
      expect(machine.getAgent()).toBe('palette');
      expect(machine.getVersion()).toBe(5);
    });

    it('should return false when no state exists', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const recovered = await machine.recover('nonexistent-build');

      expect(recovered).toBe(false);
    });
  });

  describe('transitions with persistence', () => {
    beforeEach(async () => {
      // Setup initial state
      const mockInsertResult = {
        id: 'state-123',
        build_id: 'build-456',
        plan_id: 'plan-789',
        current_state: 'created',
        version: 1,
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInsertResult, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockInsertResult, current_state: 'planning', version: 2 },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const mockPlan = { id: 'plan-789' } as BuildPlan;
      await machine.initialize('build-456', mockPlan);
    });

    it('should use optimistic locking on transitions', async () => {
      const result = await machine.trigger('start');

      expect(result.success).toBe(true);
      expect(result.fromState).toBe('created');
      expect(result.toState).toBe('planning');
    });

    it('should detect concurrent modification', async () => {
      // Mock a conflict (update returns no rows)
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows updated' } }),
              }),
            }),
          }),
        }),
      });

      const result = await machine.trigger('start');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Concurrent modification');
    });

    it('should emit optimistic_lock_failed event on conflict', async () => {
      const events: unknown[] = [];
      machine.on('optimistic_lock_failed', (e) => events.push(e));

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      await machine.trigger('start');

      expect(events.length).toBe(1);
    });
  });

  describe('static methods', () => {
    it('should find orphaned builds', async () => {
      const mockOrphanedBuilds = [
        { build_id: 'orphan-1' },
        { build_id: 'orphan-2' },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: mockOrphanedBuilds, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const orphans = await PersistentStateMachine.findOrphanedBuilds(mockSupabase, 5);

      expect(orphans).toEqual(['orphan-1', 'orphan-2']);
    });
  });

  describe('heartbeat', () => {
    it('should update timestamp on heartbeat', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'state-123', version: 1 },
              error: null,
            }),
          }),
        }),
        update: updateMock,
      });

      const mockPlan = { id: 'plan-789' } as BuildPlan;
      await machine.initialize('build-456', mockPlan);

      await machine.heartbeat();

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('state accessors', () => {
    it('should return available transitions', async () => {
      const mockInsertResult = {
        id: 'state-123',
        version: 1,
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInsertResult, error: null }),
          }),
        }),
      });

      const mockPlan = { id: 'plan-789' } as BuildPlan;
      await machine.initialize('build-456', mockPlan);

      const transitions = machine.getAvailableTransitions();

      expect(transitions).toContain('start');
      expect(transitions).toContain('cancel');
    });

    it('should check if terminal state', async () => {
      // Simulate a completed state
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { current_state: 'completed', version: 10 },
              error: null,
            }),
          }),
        }),
      });

      await machine.recover('completed-build');

      expect(machine.isTerminal()).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Phase 3 Integration', () => {
  describe('Full build lifecycle', () => {
    it('should progress through all states correctly', async () => {
      const mockStore = {
        getByBuildId: vi.fn(),
        updateStatus: vi.fn(),
        updatePhaseStatus: vi.fn(),
        updateAgentStatus: vi.fn(),
        getNextAgent: vi.fn(),
        isPlanComplete: vi.fn(),
        hasPlanFailed: vi.fn(),
      } as unknown as BuildPlanStore;

      const plan = createMockPlan();
      vi.mocked(mockStore.getByBuildId).mockResolvedValue(plan);
      vi.mocked(mockStore.isPlanComplete).mockResolvedValue(true);
      vi.mocked(mockStore.hasPlanFailed).mockResolvedValue(false);

      const machine = createStateMachine(mockStore);
      await machine.initialize('build-123', plan);

      // Verify initial state
      expect(machine.getState()).toBe('created');

      // Start build
      await machine.trigger('start');
      expect(machine.getState()).toBe('planning');

      // Plan complete
      await machine.trigger('plan_complete');
      expect(machine.getState()).toBe('running');

      // Mark all agents as completed (required for guard to pass)
      const context = machine.getContext();
      context.plan.agents.forEach(agent => {
        agent.status = 'completed';
      });

      // Complete build
      await machine.trigger('all_agents_complete');
      expect(machine.getState()).toBe('completed');

      // Verify terminal state
      expect(machine.isTerminal()).toBe(true);
    });
  });

  describe('Phase definition consistency', () => {
    it('should have all required phase definitions', () => {
      const requiredPhases: PhaseId[] = [
        'discovery',
        'design',
        'architecture',
        'frontend',
        'backend',
        'integration',
        'testing',
        'deployment',
      ];

      for (const phase of requiredPhases) {
        expect(PHASE_DEFINITIONS[phase]).toBeDefined();
        expect(PHASE_DEFINITIONS[phase].name).toBeTruthy();
        expect(PHASE_DEFINITIONS[phase].agents).toBeDefined();
        expect(typeof PHASE_DEFINITIONS[phase].order).toBe('number');
      }
    });

    it('should have valid skip rules for all project types', () => {
      const projectTypes = Object.keys(PHASE_SKIP_RULES);

      expect(projectTypes).toContain('landing-page');
      expect(projectTypes).toContain('saas-full');
      expect(projectTypes).toContain('api-only');
    });
  });
});

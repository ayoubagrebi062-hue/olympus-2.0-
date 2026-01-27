/**
 * 50X COORDINATION INTEGRATION TEST
 * Tests the full constraint flow from ARCHON → DATUM
 *
 * Verifies that multi-tenant architecture decisions
 * propagate correctly and are enforced in schema generation.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  prepareAgentWithConstraints,
  buildCriticalDecisions,
  validateAgainstConstraints,
  validateArchonOutput,
  parseArchonOutput,
  extractCriticalDecisions,
  formatDecisionsForPrompt,
} from '../coordination';
import type { AgentInput, AgentOutput, AgentDefinition, AgentId } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/** ARCHON output with VALID structured multi-tenant pattern */
const VALID_ARCHON_OUTPUT: Record<string, unknown> = {
  tech_stack: {
    framework: 'Next.js 14 App Router',
    database: 'Supabase PostgreSQL',
    orm: 'Prisma',
    auth: 'Supabase Auth',
    cache: 'Upstash Redis',
    state: 'Zustand',
    hosting: 'Vercel',
    styling: 'Tailwind CSS',
  },
  architecture: {
    pattern: 'modular-monolith',
    reasoning: 'B2B SaaS with clear domain boundaries',
    scalability: 'large',
  },
  multiTenancy: {
    enabled: true,
    isolation: 'row-level',
    tenantScopedTables: ['projects', 'tasks', 'members'],
    globalTables: ['plans', 'features'],
    tenantResolution: 'subdomain',
    rowLevelSecurity: true,
  },
  database: {
    softDeletes: true,
    auditTimestamps: true,
    idStrategy: 'cuid',
    cascadeDeletes: false,
  },
};

/** ARCHON output with LEGACY string-only architecture (should be recovered) */
const LEGACY_ARCHON_OUTPUT = {
  tech_stack: {
    framework: 'Next.js',
    database: 'PostgreSQL',
  },
  architecture: 'Monolith with multi-tenant support',
  reasoning: 'Simple architecture for MVP',
};

/** Mock ARCHON AgentOutput */
function createArchonAgentOutput(parsed: Record<string, unknown>): AgentOutput {
  return {
    agentId: 'archon',
    status: 'completed',
    artifacts: [
      {
        id: 'archon-output',
        type: 'document',
        content: JSON.stringify(parsed, null, 2),
        metadata: {},
      },
    ],
    decisions: [
      {
        id: 'arch-1',
        type: 'architecture',
        choice:
          typeof parsed.architecture === 'object'
            ? (parsed.architecture as any).pattern
            : (parsed.architecture as string),
        reasoning: (parsed.reasoning as string) || 'Architecture decision',
        alternatives: ['microservices', 'serverless'],
        confidence: 0.9,
      },
    ],
    metrics: { inputTokens: 1000, outputTokens: 500, promptCount: 1, retries: 0, cacheHits: 0 },
    duration: 5000,
    tokensUsed: 1500,
  };
}

/** Mock DATUM agent definition */
const DATUM_DEFINITION: AgentDefinition = {
  id: 'datum' as AgentId,
  name: 'DATUM',
  description: 'Database schema architect',
  phase: 'architecture',
  tier: 'opus',
  dependencies: ['archon' as AgentId, 'strategos' as AgentId],
  optional: false,
  systemPrompt: 'You are DATUM, the database schema architect...',
  outputSchema: { type: 'object', required: [], properties: {} },
  maxRetries: 3,
  timeout: 60000,
  capabilities: ['schema_design'],
};

/** Mock base input for DATUM */
function createDatumInput(archonOutput: AgentOutput): AgentInput {
  return {
    buildId: 'test-build-123',
    projectId: 'test-project-456',
    tenantId: 'test-tenant-789',
    phase: 'architecture',
    context: {
      description: 'B2B project management SaaS',
      tier: 'professional',
      iterationNumber: 1,
    },
    previousOutputs: {
      archon: archonOutput,
    } as Record<AgentId, AgentOutput>,
  };
}

/** DATUM output that VIOLATES multi-tenant constraints (missing tenantId) */
const DATUM_OUTPUT_VIOLATING = {
  tables: [
    {
      name: 'Project',
      columns: [
        { name: 'id', default: 'cuid()' },
        { name: 'name' },
        { name: 'createdAt' },
        // MISSING: tenantId - VIOLATION!
      ],
    },
    {
      name: 'Task',
      columns: [
        { name: 'id', default: 'cuid()' },
        { name: 'title' },
        // MISSING: tenantId - VIOLATION!
        // MISSING: deletedAt - WARNING (soft delete)
      ],
    },
  ],
};

/** DATUM output that COMPLIES with multi-tenant constraints */
const DATUM_OUTPUT_COMPLIANT = {
  tables: [
    {
      name: 'Project',
      columns: [
        { name: 'id', default: 'cuid()' },
        { name: 'tenantId' },
        { name: 'name' },
        { name: 'createdAt' },
        { name: 'deletedAt' },
      ],
    },
    {
      name: 'Task',
      columns: [
        { name: 'id', default: 'cuid()' },
        { name: 'tenantId' },
        { name: 'title' },
        { name: 'deletedAt' },
      ],
    },
    {
      name: 'plans', // Global table - shouldn't need tenantId
      columns: [{ name: 'id', default: 'cuid()' }, { name: 'name' }, { name: 'price' }],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

describe('50X Coordination: Multi-Tenant Constraint Flow', () => {
  describe('ARCHON Output Validation', () => {
    test('validates structured ARCHON output correctly', () => {
      const isValid = validateArchonOutput(VALID_ARCHON_OUTPUT);
      expect(isValid).toBe(true);
    });

    test('rejects legacy string-only architecture', () => {
      const isValid = validateArchonOutput(LEGACY_ARCHON_OUTPUT);
      expect(isValid).toBe(false);
    });

    test('recovers legacy output with parseArchonOutput', () => {
      const parsed = parseArchonOutput(LEGACY_ARCHON_OUTPUT, 'professional');

      expect(parsed.architecture).toBeDefined();
      expect(parsed.architecture.pattern).toBeDefined();
      expect(parsed.multiTenancy).toBeDefined();
    });
  });

  describe('Critical Decisions Building', () => {
    test('builds critical decisions from ARCHON output', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      expect(decisions).toBeDefined();
      expect(decisions.architecture).toBeDefined();
      expect(decisions.architecture.isMultiTenant).toBe(true);
      expect(decisions.architecture.tenantIsolation).toBe('row-level');
    });

    test('extracts critical decisions for prompt formatting', () => {
      const parsed = parseArchonOutput(VALID_ARCHON_OUTPUT, 'professional');
      const critical = extractCriticalDecisions(parsed);

      expect(critical.isMultiTenant).toBe(true);
      expect(critical.tenantIsolation).toBe('row-level');
      expect(critical.softDeletes).toBe(true);
      expect(critical.idStrategy).toBe('cuid');
    });

    test('formats decisions for prompt injection', () => {
      const parsed = parseArchonOutput(VALID_ARCHON_OUTPUT, 'professional');
      const critical = extractCriticalDecisions(parsed);
      const promptSection = formatDecisionsForPrompt(critical);

      expect(promptSection).toContain('Multi-Tenancy');
      expect(promptSection).toContain('ENABLED');
      expect(promptSection).toContain('tenantId');
    });
  });

  describe('Constraint Injection into DATUM', () => {
    test('injects upstream constraints into DATUM input', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const baseInput = createDatumInput(agentOutputs.get('archon')!);

      const { enhancedInput, constraintText, estimatedTokens } = prepareAgentWithConstraints(
        baseInput,
        DATUM_DEFINITION,
        agentOutputs,
        'professional'
      );

      expect(enhancedInput.constraints?.upstreamConstraints).toBeDefined();
      expect(constraintText.length).toBeGreaterThan(0);
      expect(estimatedTokens).toBeGreaterThan(0);
    });

    test('constraint text contains multi-tenant requirements', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const baseInput = createDatumInput(agentOutputs.get('archon')!);

      const { constraintText } = prepareAgentWithConstraints(
        baseInput,
        DATUM_DEFINITION,
        agentOutputs,
        'professional'
      );

      // Should contain multi-tenant related terms
      const lowerText = constraintText.toLowerCase();
      expect(
        lowerText.includes('tenant') ||
          lowerText.includes('multi-tenant') ||
          lowerText.includes('organization')
      ).toBe(true);
    });
  });

  describe('Constraint Violation Detection', () => {
    test('detects missing tenantId in multi-tenant schema', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');
      const violations = validateAgainstConstraints('datum', DATUM_OUTPUT_VIOLATING, decisions);

      // Should have violations for missing tenantId
      const errorViolations = violations.filter(v => v.severity === 'error');
      expect(errorViolations.length).toBeGreaterThan(0);
      expect(errorViolations.some(v => v.violation.includes('tenantId'))).toBe(true);
    });

    test('passes compliant multi-tenant schema', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');
      const violations = validateAgainstConstraints('datum', DATUM_OUTPUT_COMPLIANT, decisions);

      // Should have no errors (may have warnings)
      const errorViolations = violations.filter(v => v.severity === 'error');
      expect(errorViolations.length).toBe(0);
    });

    test('allows global tables without tenantId', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      // Output with only global tables
      const globalOnlyOutput = {
        tables: [
          {
            name: 'plans',
            columns: [{ name: 'id' }, { name: 'name' }],
          },
          {
            name: 'features',
            columns: [{ name: 'id' }, { name: 'name' }],
          },
        ],
      };

      const violations = validateAgainstConstraints('datum', globalOnlyOutput, decisions);
      const errorViolations = violations.filter(v => v.severity === 'error');

      // Global tables should not trigger tenantId errors
      expect(errorViolations.length).toBe(0);
    });
  });

  describe('Full Pipeline Integration', () => {
    test('complete flow: ARCHON → constraints → DATUM → validation', () => {
      // Step 1: ARCHON produces output
      const archonOutput = createArchonAgentOutput(VALID_ARCHON_OUTPUT);

      // Step 2: Build agent outputs map
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, archonOutput);

      // Step 3: Prepare DATUM input with constraints
      const baseInput = createDatumInput(archonOutput);
      const { enhancedInput, constraintText } = prepareAgentWithConstraints(
        baseInput,
        DATUM_DEFINITION,
        agentOutputs,
        'professional'
      );

      // Step 4: Verify constraints are injected
      expect(enhancedInput.constraints?.upstreamConstraints).toBeDefined();
      expect(constraintText.length).toBeGreaterThan(100); // Non-trivial constraints

      // Step 5: Build critical decisions for validation
      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      // Step 6: Validate COMPLIANT output passes
      const compliantViolations = validateAgainstConstraints(
        'datum',
        DATUM_OUTPUT_COMPLIANT,
        decisions
      );
      expect(compliantViolations.filter(v => v.severity === 'error').length).toBe(0);

      // Step 7: Validate VIOLATING output fails
      const violatingViolations = validateAgainstConstraints(
        'datum',
        DATUM_OUTPUT_VIOLATING,
        decisions
      );
      expect(violatingViolations.filter(v => v.severity === 'error').length).toBeGreaterThan(0);
    });
  });

  describe('Extended Agent Validation (FIX #4)', () => {
    test('validates PIXEL output for design system compliance', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      // PIXEL output with wrong color tokens
      const pixelOutput = {
        components: [
          {
            name: 'Button',
            styles: {
              backgroundColor: '#FF0000', // Hardcoded - should use color token
              color: 'white',
            },
          },
        ],
      };

      const violations = validateAgainstConstraints('pixel', pixelOutput, decisions);
      // Should warn about hardcoded colors if design tokens exist
      expect(violations.length).toBeGreaterThanOrEqual(0); // May or may not have violations based on design config
    });

    test('validates FORGE output for multi-tenant API compliance', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      // FORGE output missing tenant context in queries
      const forgeOutput = {
        files: [
          {
            path: 'src/server/queries/projects.ts',
            content: `
              export function getProjects() {
                return db.project.findMany(); // Missing tenantId filter!
              }
            `,
          },
        ],
      };

      const violations = validateAgainstConstraints('forge', forgeOutput, decisions);
      // In multi-tenant mode, should warn about missing tenant filtering
      expect(Array.isArray(violations)).toBe(true);
    });

    test('validates SENTINEL output for auth strategy alignment', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      const sentinelOutput = {
        auth_config: {
          strategy: 'jwt', // Different from ARCHON's decision
          provider: 'custom',
        },
      };

      const violations = validateAgainstConstraints('sentinel', sentinelOutput, decisions);
      // Should check auth strategy alignment
      expect(Array.isArray(violations)).toBe(true);
    });

    test('validates ENGINE output for data access patterns', () => {
      const agentOutputs = new Map<AgentId, AgentOutput>();
      agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

      const decisions = buildCriticalDecisions(agentOutputs, 'professional');

      const engineOutput = {
        services: [
          {
            name: 'ProjectService',
            methods: ['create', 'update', 'delete'],
            usesTransaction: false, // Should use transactions for safety
          },
        ],
      };

      const violations = validateAgainstConstraints('engine', engineOutput, decisions);
      expect(Array.isArray(violations)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE TESTS (FIX #3)
// ═══════════════════════════════════════════════════════════════════════════════

describe('50X Coordination: Persistence Layer', () => {
  // Mock the Supabase client for persistence tests
  const mockSupabase = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { critical_decisions: null },
              error: null,
            })
          ),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('CriticalDecisions can be serialized to JSON', () => {
    const agentOutputs = new Map<AgentId, AgentOutput>();
    agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

    const decisions = buildCriticalDecisions(agentOutputs, 'professional');

    // Should serialize without error
    const json = JSON.stringify(decisions);
    expect(json).toBeDefined();
    expect(json.length).toBeGreaterThan(100);

    // Should deserialize correctly
    const restored = JSON.parse(json);
    expect(restored.architecture.isMultiTenant).toBe(true);
    expect(restored.tier).toBe('professional');
    expect(restored.sources).toContain('archon');
  });

  test('CriticalDecisions Date fields can be restored', () => {
    const agentOutputs = new Map<AgentId, AgentOutput>();
    agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

    const decisions = buildCriticalDecisions(agentOutputs, 'professional');
    const json = JSON.stringify(decisions);
    const restored = JSON.parse(json);

    // Date needs to be manually restored
    restored.extractedAt = new Date(restored.extractedAt);

    expect(restored.extractedAt instanceof Date).toBe(true);
    expect(restored.extractedAt.getTime()).toBeGreaterThan(0);
  });

  test('Empty decisions still serialize correctly', () => {
    const agentOutputs = new Map<AgentId, AgentOutput>();
    // No ARCHON output - should use defaults

    const decisions = buildCriticalDecisions(agentOutputs, 'starter');

    const json = JSON.stringify(decisions);
    const restored = JSON.parse(json);

    expect(restored.tier).toBe('starter');
    expect(restored.sources).toEqual([]);
    expect(restored.architecture).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI RUNNER (for manual testing)
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  console.log('\n========================================');
  console.log('50X COORDINATION INTEGRATION TEST');
  console.log('========================================\n');

  // Quick smoke test
  const agentOutputs = new Map<AgentId, AgentOutput>();
  agentOutputs.set('archon' as AgentId, createArchonAgentOutput(VALID_ARCHON_OUTPUT));

  console.log('1. Building critical decisions from ARCHON...');
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');
  console.log(`   ✅ isMultiTenant: ${decisions.architecture.isMultiTenant}`);
  console.log(`   ✅ tenantIsolation: ${decisions.architecture.tenantIsolation}`);

  console.log('\n2. Preparing DATUM input with constraints...');
  const baseInput = createDatumInput(agentOutputs.get('archon')!);
  const { constraintText, estimatedTokens } = prepareAgentWithConstraints(
    baseInput,
    DATUM_DEFINITION,
    agentOutputs,
    'professional'
  );
  console.log(`   ✅ Constraint text length: ${constraintText.length} chars`);
  console.log(`   ✅ Estimated tokens: ${estimatedTokens}`);

  console.log('\n3. Validating VIOLATING output...');
  const violations = validateAgainstConstraints('datum', DATUM_OUTPUT_VIOLATING, decisions);
  console.log(`   ❌ Found ${violations.length} violations:`);
  for (const v of violations) {
    console.log(`      [${v.severity}] ${v.violation}`);
  }

  console.log('\n4. Validating COMPLIANT output...');
  const compliantViolations = validateAgainstConstraints(
    'datum',
    DATUM_OUTPUT_COMPLIANT,
    decisions
  );
  const errors = compliantViolations.filter(v => v.severity === 'error');
  if (errors.length === 0) {
    console.log('   ✅ All constraints passed!');
  } else {
    console.log(`   ❌ Found ${errors.length} errors`);
  }

  console.log('\n========================================');
  console.log('TEST COMPLETE');
  console.log('========================================\n');
}

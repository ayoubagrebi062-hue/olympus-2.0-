/**
 * 50X COORDINATION INTEGRATION TEST (CLI)
 * Tests the full constraint flow from ARCHON → DATUM
 *
 * Run with: npx tsx test-multi-tenant-flow.ts
 */

import {
  prepareAgentWithConstraints,
  buildCriticalDecisions,
  validateAgainstConstraints,
  validateArchonOutput,
  parseArchonOutput,
  extractCriticalDecisions,
  formatDecisionsForPrompt,
} from './src/lib/agents/coordination';
import type { AgentInput, AgentOutput, AgentDefinition } from './src/lib/agents/types';

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

/** ARCHON output with LEGACY string-only architecture */
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
        choice: typeof parsed.architecture === 'object'
          ? (parsed.architecture as any).pattern
          : parsed.architecture as string,
        reasoning: parsed.reasoning as string || 'Architecture decision',
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
  id: 'datum',
  name: 'DATUM',
  description: 'Database schema architect',
  phase: 'architecture',
  tier: 'opus',
  dependencies: ['archon', 'strategos'],
  systemPrompt: 'You are DATUM, the database schema architect...',
  outputSchema: {},
  maxRetries: 3,
  timeout: 60000,
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
    },
  };
}

/** DATUM output that VIOLATES multi-tenant constraints */
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
      name: 'plans',
      columns: [
        { name: 'id', default: 'cuid()' },
        { name: 'name' },
        { name: 'price' },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    const result = fn();
    if (result) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${name}: ${(error as Error).message}`);
    failed++;
  }
}

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║         50X COORDINATION - MULTI-TENANT CONSTRAINT FLOW TEST                ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ ARCHON Output Validation\n');

test('validates structured ARCHON output correctly', () => {
  return validateArchonOutput(VALID_ARCHON_OUTPUT) === true;
});

test('rejects legacy string-only architecture', () => {
  return validateArchonOutput(LEGACY_ARCHON_OUTPUT) === false;
});

test('recovers legacy output with parseArchonOutput', () => {
  const parsed = parseArchonOutput(LEGACY_ARCHON_OUTPUT, 'professional');
  return parsed.architecture !== undefined && parsed.architecture.pattern !== undefined;
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Critical Decisions Building\n');

test('builds critical decisions from ARCHON output', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');
  return decisions.architecture.isMultiTenant === true;
});

test('extracts critical decisions for prompt formatting', () => {
  const parsed = parseArchonOutput(VALID_ARCHON_OUTPUT, 'professional');
  const critical = extractCriticalDecisions(parsed);
  return critical.isMultiTenant === true && critical.softDeletes === true;
});

test('formats decisions for prompt injection', () => {
  const parsed = parseArchonOutput(VALID_ARCHON_OUTPUT, 'professional');
  const critical = extractCriticalDecisions(parsed);
  const promptSection = formatDecisionsForPrompt(critical);
  return promptSection.includes('Multi-Tenancy') && promptSection.includes('ENABLED');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Constraint Injection into DATUM\n');

test('injects upstream constraints into DATUM input', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const baseInput = createDatumInput(agentOutputs.get('archon')!);

  const { enhancedInput, constraintText, estimatedTokens } = prepareAgentWithConstraints(
    baseInput,
    DATUM_DEFINITION,
    agentOutputs,
    'professional'
  );

  return (
    enhancedInput.constraints?.upstreamConstraints !== undefined &&
    constraintText.length > 0 &&
    estimatedTokens > 0
  );
});

test('constraint text contains multi-tenant requirements', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const baseInput = createDatumInput(agentOutputs.get('archon')!);

  const { constraintText } = prepareAgentWithConstraints(
    baseInput,
    DATUM_DEFINITION,
    agentOutputs,
    'professional'
  );

  const lowerText = constraintText.toLowerCase();
  return lowerText.includes('tenant') || lowerText.includes('multi-tenant');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Constraint Violation Detection\n');

test('detects missing tenantId in multi-tenant schema', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');
  const violations = validateAgainstConstraints('datum', DATUM_OUTPUT_VIOLATING, decisions);
  const errorViolations = violations.filter(v => v.severity === 'error');
  return errorViolations.length > 0 && errorViolations.some(v => v.violation.includes('tenantId'));
});

test('passes compliant multi-tenant schema', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');
  const violations = validateAgainstConstraints('datum', DATUM_OUTPUT_COMPLIANT, decisions);
  const errorViolations = violations.filter(v => v.severity === 'error');
  return errorViolations.length === 0;
});

test('allows global tables without tenantId', () => {
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');

  const globalOnlyOutput = {
    tables: [
      { name: 'plans', columns: [{ name: 'id' }, { name: 'name' }] },
      { name: 'features', columns: [{ name: 'id' }, { name: 'name' }] },
    ],
  };

  const violations = validateAgainstConstraints('datum', globalOnlyOutput, decisions);
  const errorViolations = violations.filter(v => v.severity === 'error');
  return errorViolations.length === 0;
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ Full Pipeline Integration\n');

test('complete flow: ARCHON → constraints → DATUM → validation', () => {
  // Step 1: ARCHON produces output
  const archonOutput = createArchonAgentOutput(VALID_ARCHON_OUTPUT);

  // Step 2: Build agent outputs map
  const agentOutputs = new Map<string, AgentOutput>();
  agentOutputs.set('archon', archonOutput);

  // Step 3: Prepare DATUM input with constraints
  const baseInput = createDatumInput(archonOutput);
  const { enhancedInput, constraintText } = prepareAgentWithConstraints(
    baseInput,
    DATUM_DEFINITION,
    agentOutputs,
    'professional'
  );

  // Step 4: Verify constraints are injected
  if (!enhancedInput.constraints?.upstreamConstraints) return false;
  if (constraintText.length < 100) return false;

  // Step 5: Build critical decisions for validation
  const decisions = buildCriticalDecisions(agentOutputs, 'professional');

  // Step 6: Validate COMPLIANT output passes
  const compliantViolations = validateAgainstConstraints('datum', DATUM_OUTPUT_COMPLIANT, decisions);
  if (compliantViolations.filter(v => v.severity === 'error').length > 0) return false;

  // Step 7: Validate VIOLATING output fails
  const violatingViolations = validateAgainstConstraints('datum', DATUM_OUTPUT_VIOLATING, decisions);
  if (violatingViolations.filter(v => v.severity === 'error').length === 0) return false;

  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log(`║  RESULTS: ${passed} passed, ${failed} failed                                              ║`);
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED - 50X Coordination is working correctly!\n');
} else {
  console.log('❌ SOME TESTS FAILED - Check the output above for details.\n');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('📋 CONSTRAINT PREVIEW (what DATUM receives):\n');

const agentOutputs = new Map<string, AgentOutput>();
agentOutputs.set('archon', createArchonAgentOutput(VALID_ARCHON_OUTPUT));
const baseInput = createDatumInput(agentOutputs.get('archon')!);
const { constraintText } = prepareAgentWithConstraints(
  baseInput,
  DATUM_DEFINITION,
  agentOutputs,
  'professional'
);
console.log(constraintText.slice(0, 800));
console.log('...\n');

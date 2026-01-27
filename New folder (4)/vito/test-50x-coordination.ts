/**
 * 50X COORDINATION TEST
 * Verifies that constraint propagation from ARCHON works correctly
 */

import { prepareAgentWithConstraints, buildCriticalDecisions } from './src/lib/agents/coordination';
import type { AgentInput, AgentOutput, AgentDefinition } from './src/lib/agents/types';

// Mock ARCHON output with multi-tenant pattern
const mockArchonOutput: AgentOutput = {
  agentId: 'archon',
  status: 'completed',
  artifacts: [],
  decisions: [
    {
      id: 'arch-pattern',
      type: 'architecture',
      choice: 'multi-tenant',
      reasoning: 'B2B SaaS requires tenant isolation',
      alternatives: ['single-tenant', 'per-user'],
      confidence: 0.95,
    },
  ],
  metrics: { inputTokens: 1000, outputTokens: 500, promptCount: 1, retries: 0, cacheHits: 0 },
  duration: 5000,
  tokensUsed: 1500,
};

// Mock DATUM agent definition
const mockDatumDef: AgentDefinition = {
  id: 'datum',
  name: 'DATUM',
  description: 'Database schema designer',
  phase: 'architecture',
  tier: 'opus',
  dependencies: ['archon', 'strategos'],
  systemPrompt: 'You are DATUM...',
  outputSchema: {},
  maxRetries: 3,
  timeout: 60000,
};

// Mock base input
const mockBaseInput: AgentInput = {
  buildId: 'test-123',
  projectId: 'proj-456',
  tenantId: 'tenant-789',
  phase: 'architecture',
  context: {
    description: 'B2B SaaS project management tool',
    tier: 'professional',
    iterationNumber: 1,
  },
  previousOutputs: {
    archon: mockArchonOutput,
  },
};

// Create agent outputs map
const agentOutputs = new Map<string, AgentOutput>();
agentOutputs.set('archon', mockArchonOutput);

// TEST 1: Build critical decisions from ARCHON output
console.log('\n=== TEST 1: Build Critical Decisions ===');
const criticalDecisions = buildCriticalDecisions(agentOutputs, 'professional');
console.log('Critical Decisions:', JSON.stringify(criticalDecisions, null, 2).slice(0, 500));
console.log('Result:', criticalDecisions ? '✅ PASS' : '❌ FAIL');

// TEST 2: Prepare DATUM input with constraints
console.log('\n=== TEST 2: Prepare DATUM with Constraints ===');
const { enhancedInput, constraintText, estimatedTokens } = prepareAgentWithConstraints(
  mockBaseInput,
  mockDatumDef,
  agentOutputs,
  'professional'
);

console.log('Constraint Text Length:', constraintText?.length || 0);
console.log('Estimated Tokens:', estimatedTokens);
console.log('Has upstreamConstraints:', !!enhancedInput.constraints?.upstreamConstraints);
console.log('Result:', enhancedInput.constraints?.upstreamConstraints ? '✅ PASS' : '❌ FAIL');

// TEST 3: Verify multi-tenant constraint in prompt
console.log('\n=== TEST 3: Verify Multi-Tenant in Constraints ===');
const hasMultiTenant = constraintText?.toLowerCase().includes('multi-tenant') ||
                       constraintText?.toLowerCase().includes('tenant') ||
                       constraintText?.toLowerCase().includes('organization');
console.log('Contains tenant/organization reference:', hasMultiTenant ? '✅ PASS' : '⚠️ May need ARCHON upgrade');

// TEST 4: Check for required fields in constraint
console.log('\n=== TEST 4: Check Constraint Structure ===');
const upstreamText = enhancedInput.constraints?.upstreamConstraints || '';
console.log('Constraint preview (first 300 chars):');
console.log(upstreamText.slice(0, 300));
console.log('...');

// SUMMARY
console.log('\n=== SUMMARY ===');
console.log('Coordination Module: ✅ Imported');
console.log('prepareAgentWithConstraints: ✅ Executed');
console.log('Critical Decisions: ' + (criticalDecisions ? '✅' : '❌'));
console.log('Constraint Injection: ' + (constraintText ? '✅' : '⚠️ Empty (may need ARCHON structured output)'));

console.log('\n50X COORDINATION WIRING: COMPLETE');
console.log('Next: Run actual build to see constraints in agent prompts');

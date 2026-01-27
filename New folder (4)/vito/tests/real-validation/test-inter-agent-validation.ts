/**
 * TEST 3: Inter-Agent Validation - REAL TEST
 *
 * Tests that validateAgentDependencies() actually blocks execution
 * when dependency output is missing or invalid.
 */

import { validateAgentDependencies } from '../../src/lib/agents/executor/enhanced-executor';
import type { AgentOutput, AgentId } from '../../src/lib/agents/types';

// Helper to create mock agent output
function createMockOutput(agentId: AgentId, artifacts: Array<{ id: string; type: string; content: string }>): AgentOutput {
  return {
    agentId,
    status: 'completed',
    artifacts: artifacts.map(a => ({
      id: a.id,
      type: a.type as 'code' | 'schema' | 'config' | 'document' | 'design' | 'test' | 'asset',
      content: a.content,
      metadata: {},
    })),
    decisions: [],
    metrics: { inputTokens: 0, outputTokens: 0, promptCount: 0, retries: 0, cacheHits: 0 },
    duration: 0,
    tokensUsed: 0,
  };
}

console.log('='.repeat(60));
console.log('TEST 3: Inter-Agent Validation');
console.log('='.repeat(60));

// TEST 3.1: Call PIXEL without BLOCKS output
console.log('\n--- TEST 3.1: PIXEL without BLOCKS ---');
const result1 = validateAgentDependencies('pixel', {});
console.log('Valid:', result1.valid);
console.log('Errors:', result1.errors);
console.log('Warnings:', result1.warnings);
console.log('BLOCKS EXECUTION?', result1.valid ? 'NO - BUG!' : 'YES - Working correctly');

// TEST 3.2: Call PIXEL with BLOCKS output but missing components
console.log('\n--- TEST 3.2: PIXEL with incomplete BLOCKS output ---');
const incompleteBlocks = createMockOutput('blocks', [
  { id: 'some_artifact', type: 'document', content: 'No components here' },
]);
const result2 = validateAgentDependencies('pixel', { blocks: incompleteBlocks });
console.log('Valid:', result2.valid);
console.log('Errors:', result2.errors);
console.log('Warnings:', result2.warnings);
console.log('BLOCKS EXECUTION?', result2.valid ? 'NO - BUG!' : 'YES - Working correctly');

// TEST 3.3: Call PIXEL with valid BLOCKS output
console.log('\n--- TEST 3.3: PIXEL with valid BLOCKS output ---');
const validBlocks = createMockOutput('blocks', [
  { id: 'components', type: 'schema', content: 'Button, Card, Input components' },
  { id: 'design_tokens', type: 'config', content: 'colors, spacing, typography' },
]);
const result3 = validateAgentDependencies('pixel', { blocks: validBlocks });
console.log('Valid:', result3.valid);
console.log('Errors:', result3.errors);
console.log('Warnings:', result3.warnings);
console.log('ALLOWS EXECUTION?', result3.valid ? 'YES - Working correctly' : 'NO - BUG!');

// TEST 3.4: Call FORGE without DATUM
console.log('\n--- TEST 3.4: FORGE without DATUM ---');
const result4 = validateAgentDependencies('forge', {});
console.log('Valid:', result4.valid);
console.log('Errors:', result4.errors);
console.log('BLOCKS EXECUTION?', result4.valid ? 'NO - BUG!' : 'YES - Working correctly');

// TEST 3.5: Agent with no dependencies (should pass)
console.log('\n--- TEST 3.5: ORACLE (no dependencies) ---');
const result5 = validateAgentDependencies('oracle', {});
console.log('Valid:', result5.valid);
console.log('Errors:', result5.errors);
console.log('ALLOWS EXECUTION?', result5.valid ? 'YES - Working correctly' : 'NO - BUG!');

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
const passed = [
  !result1.valid,  // Should block
  !result2.valid,  // Should block
  result3.valid,   // Should allow
  !result4.valid,  // Should block
  result5.valid,   // Should allow
];
console.log(`Tests passed: ${passed.filter(p => p).length}/${passed.length}`);
console.log('Inter-agent validation:', passed.every(p => p) ? 'WORKING' : 'BROKEN');

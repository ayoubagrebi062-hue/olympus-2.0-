/**
 * TEST 3: Inter-Agent Validation - STANDALONE TEST
 *
 * Copies the actual validation logic to test without importing
 * the full codebase (which triggers Supabase auth).
 */

// ============================================
// COPY OF VALIDATION LOGIC FROM enhanced-executor.ts
// ============================================

type AgentId = 'oracle' | 'empathy' | 'venture' | 'strategos' | 'scope'
  | 'palette' | 'grid' | 'blocks' | 'cartographer' | 'flow'
  | 'archon' | 'datum' | 'nexus' | 'forge' | 'sentinel' | 'atlas'
  | 'pixel' | 'wire' | 'polish'
  | 'engine' | 'gateway' | 'keeper' | 'cron'
  | 'bridge' | 'sync' | 'notify' | 'search'
  | 'junit' | 'cypress' | 'load' | 'a11y'
  | 'docker' | 'pipeline' | 'monitor' | 'scale';

interface AgentOutput {
  agentId: AgentId;
  artifacts: Array<{ id: string; type: string; content: string }>;
  decisions: Array<{ type: string; choice: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface DependencyValidationRule {
  sourceAgent: AgentId;
  targetAgent: AgentId;
  requiredFields: string[];
  validate: (output: AgentOutput) => ValidationResult;
}

const DEPENDENCY_VALIDATION_RULES: Partial<Record<AgentId, DependencyValidationRule[]>> = {
  pixel: [{
    sourceAgent: 'blocks',
    targetAgent: 'pixel',
    requiredFields: ['components', 'design_tokens'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const hasComponents = output.artifacts.some(a =>
        a.type === 'schema' && a.id === 'components'
      ) || output.decisions.some(d =>
        d.type === 'component' || d.choice?.includes('component')
      );

      if (!hasComponents) {
        errors.push('BLOCKS output missing component definitions. PIXEL cannot generate UI without component specs.');
      }

      const hasDesignTokens = output.artifacts.some(a =>
        a.id === 'design_tokens' || a.content?.includes('tokens')
      );

      if (!hasDesignTokens) {
        warnings.push('BLOCKS output missing design tokens. UI consistency may suffer.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  forge: [{
    sourceAgent: 'datum',
    targetAgent: 'forge',
    requiredFields: ['tables', 'relationships'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const hasTables = output.artifacts.some(a =>
        a.type === 'schema' && (a.id === 'tables' || a.id === 'schema')
      ) || output.decisions.some(d =>
        d.type === 'schema' || d.choice?.includes('table')
      );

      if (!hasTables) {
        errors.push('DATUM output missing database tables. FORGE cannot generate backend without schema.');
      }

      const hasRelationships = output.artifacts.some(a =>
        a.id === 'relationships' || a.content?.includes('relationship')
      );

      if (!hasRelationships) {
        warnings.push('DATUM output missing table relationships. Data integrity may be compromised.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],

  engine: [{
    sourceAgent: 'nexus',
    targetAgent: 'engine',
    requiredFields: ['endpoints', 'schemas'],
    validate: (output: AgentOutput) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const hasEndpoints = output.artifacts.some(a =>
        a.type === 'schema' && a.id === 'endpoints'
      ) || output.decisions.some(d =>
        d.type === 'api' || d.choice?.includes('endpoint')
      );

      if (!hasEndpoints) {
        errors.push('NEXUS output missing API endpoints. ENGINE cannot implement business logic without API contract.');
      }

      return { valid: errors.length === 0, errors, warnings };
    },
  }],
};

function validateAgentDependencies(
  agentId: AgentId,
  previousOutputs: Record<string, AgentOutput>
): ValidationResult {
  const rules = DEPENDENCY_VALIDATION_RULES[agentId];

  if (!rules || rules.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const rule of rules) {
    const sourceOutput = previousOutputs[rule.sourceAgent];

    if (!sourceOutput) {
      allErrors.push(
        `Missing required dependency: ${rule.sourceAgent} output not found. ` +
        `${agentId.toUpperCase()} requires output from ${rule.sourceAgent.toUpperCase()}.`
      );
      continue;
    }

    const result = rule.validate(sourceOutput);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ============================================
// ACTUAL TESTS
// ============================================

console.log('='.repeat(60));
console.log('TEST 3: Inter-Agent Validation (STANDALONE)');
console.log('='.repeat(60));

// TEST 3.1: Call PIXEL without BLOCKS output
console.log('\n--- TEST 3.1: PIXEL without BLOCKS ---');
const result1 = validateAgentDependencies('pixel', {});
console.log('Valid:', result1.valid);
console.log('Errors:', result1.errors);
console.log('BLOCKS EXECUTION?', result1.valid ? 'NO ❌ BUG!' : 'YES ✅ Working');

// TEST 3.2: Call PIXEL with BLOCKS output but missing components
console.log('\n--- TEST 3.2: PIXEL with incomplete BLOCKS output ---');
const incompleteBlocks: AgentOutput = {
  agentId: 'blocks',
  artifacts: [{ id: 'random', type: 'document', content: 'nothing useful' }],
  decisions: [],
};
const result2 = validateAgentDependencies('pixel', { blocks: incompleteBlocks });
console.log('Valid:', result2.valid);
console.log('Errors:', result2.errors);
console.log('Warnings:', result2.warnings);
console.log('BLOCKS EXECUTION?', result2.valid ? 'NO ❌ BUG!' : 'YES ✅ Working');

// TEST 3.3: Call PIXEL with valid BLOCKS output
console.log('\n--- TEST 3.3: PIXEL with valid BLOCKS output ---');
const validBlocks: AgentOutput = {
  agentId: 'blocks',
  artifacts: [
    { id: 'components', type: 'schema', content: 'Button, Card, Input' },
    { id: 'design_tokens', type: 'config', content: 'colors, spacing' },
  ],
  decisions: [],
};
const result3 = validateAgentDependencies('pixel', { blocks: validBlocks });
console.log('Valid:', result3.valid);
console.log('Errors:', result3.errors);
console.log('Warnings:', result3.warnings);
console.log('ALLOWS EXECUTION?', result3.valid ? 'YES ✅ Working' : 'NO ❌ BUG!');

// TEST 3.4: Call FORGE without DATUM
console.log('\n--- TEST 3.4: FORGE without DATUM ---');
const result4 = validateAgentDependencies('forge', {});
console.log('Valid:', result4.valid);
console.log('Errors:', result4.errors);
console.log('BLOCKS EXECUTION?', result4.valid ? 'NO ❌ BUG!' : 'YES ✅ Working');

// TEST 3.5: Agent with no dependencies (should pass)
console.log('\n--- TEST 3.5: ORACLE (no dependencies) ---');
const result5 = validateAgentDependencies('oracle', {});
console.log('Valid:', result5.valid);
console.log('Errors:', result5.errors);
console.log('ALLOWS EXECUTION?', result5.valid ? 'YES ✅ Working' : 'NO ❌ BUG!');

// TEST 3.6: ENGINE without NEXUS
console.log('\n--- TEST 3.6: ENGINE without NEXUS ---');
const result6 = validateAgentDependencies('engine', {});
console.log('Valid:', result6.valid);
console.log('Errors:', result6.errors);
console.log('BLOCKS EXECUTION?', result6.valid ? 'NO ❌ BUG!' : 'YES ✅ Working');

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
const tests = [
  { name: 'PIXEL without BLOCKS blocks execution', passed: !result1.valid },
  { name: 'PIXEL with incomplete BLOCKS blocks execution', passed: !result2.valid },
  { name: 'PIXEL with valid BLOCKS allows execution', passed: result3.valid },
  { name: 'FORGE without DATUM blocks execution', passed: !result4.valid },
  { name: 'ORACLE (no deps) allows execution', passed: result5.valid },
  { name: 'ENGINE without NEXUS blocks execution', passed: !result6.valid },
];

for (const t of tests) {
  console.log(`${t.passed ? '✅' : '❌'} ${t.name}`);
}

const allPassed = tests.every(t => t.passed);
console.log(`\nTests passed: ${tests.filter(t => t.passed).length}/${tests.length}`);
console.log(`Inter-agent validation: ${allPassed ? 'WORKING ✅' : 'BROKEN ❌'}`);

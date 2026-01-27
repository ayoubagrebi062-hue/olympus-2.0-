/**
 * RESILIENCE ENGINE v3.1 - PROOF IT WORKS
 *
 * Run this file to see the engine in action:
 *   npx ts-node src/lib/agents/orchestrator/resilience-engine.test.ts
 *
 * Or import and call: runResilienceDemo()
 */

import {
  getResilienceEngine,
  destroyResilienceEngine,
  ResilienceEngine,
  type ResilienceEvent,
  type FailureCategory,
  type TraceSpan,
} from './resilience-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const log = (msg: string) => console.log(`\x1b[36m[TEST]\x1b[0m ${msg}`);
const pass = (msg: string) => console.log(`\x1b[32m  ✓ ${msg}\x1b[0m`);
const fail = (msg: string) => console.log(`\x1b[31m  ✗ ${msg}\x1b[0m`);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    pass(message);
    testsPassed++;
  } else {
    fail(message);
    testsFailed++;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

async function testCircuitBreaker(): Promise<void> {
  log('TEST 1: Circuit Breaker');

  const engine = getResilienceEngine('test-circuit-1', {
    config: {
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        volumeThreshold: 1,
      },
    },
  });

  const events: ResilienceEvent[] = [];
  engine.events.onAll(e => events.push(e));

  // Initially circuit is closed (can call)
  assert(!engine.isCircuitOpen('oracle'), 'Circuit is CLOSED initially (can call agent)');

  // Record failures with category
  engine.recordFailure('oracle', 'Error 1', 'UNKNOWN');
  engine.recordFailure('oracle', 'Error 2', 'UNKNOWN');
  assert(!engine.isCircuitOpen('oracle'), 'Circuit still CLOSED after 2 failures');

  engine.recordFailure('oracle', 'Error 3', 'UNKNOWN');
  assert(engine.isCircuitOpen('oracle'), 'Circuit OPEN after 3 failures');

  // Check event was emitted
  const openEvent = events.find(e => e.type === 'circuit:open');
  assert(!!openEvent, 'circuit:open event emitted');

  // Wait for timeout
  await sleep(1100);
  assert(!engine.isCircuitOpen('oracle'), 'Circuit HALF-OPEN after timeout (allows calls)');

  // Record success with latency to close
  engine.recordSuccess('oracle', 100);
  engine.recordSuccess('oracle', 100);
  assert(!engine.isCircuitOpen('oracle'), 'Circuit CLOSED after successes');

  destroyResilienceEngine('test-circuit-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: BULKHEAD
// ═══════════════════════════════════════════════════════════════════════════════

async function testBulkhead(): Promise<void> {
  log('TEST 2: Bulkhead (Concurrency Limiting)');

  const engine = getResilienceEngine('test-bulkhead-1', {
    config: {
      bulkhead: {
        enabled: true,
        maxConcurrentPerAgent: 2,
        maxConcurrentTotal: 5,
        maxWaitMs: 100, // Short timeout for test
        fairQueuing: true,
      },
    },
  });

  const events: ResilienceEvent[] = [];
  engine.events.onAll(e => events.push(e));

  // Acquire 2 slots (should succeed)
  await engine.acquireBulkhead('oracle');
  await engine.acquireBulkhead('oracle');

  const status = engine.getBulkheadStatus();
  assert(status.totalInFlight === 2, 'Two slots acquired');
  assert(status.perAgent['oracle']?.current === 2, 'Two slots for oracle');

  // Third should timeout (maxWaitMs = 100ms)
  let rejected = false;
  try {
    await engine.acquireBulkhead('oracle');
  } catch (e) {
    rejected = true;
  }
  assert(rejected, 'Third request rejected (per-agent limit)');

  // Release and verify
  engine.releaseBulkhead('oracle');
  engine.releaseBulkhead('oracle');

  const statusAfter = engine.getBulkheadStatus();
  assert(statusAfter.totalInFlight === 0, 'All slots released');

  // Check events
  const acquiredEvents = events.filter(e => e.type === 'bulkhead:acquired');
  const rejectedEvents = events.filter(e => e.type === 'bulkhead:rejected');
  assert(acquiredEvents.length === 2, 'Two acquired events');
  assert(rejectedEvents.length === 1, 'One rejected event');

  destroyResilienceEngine('test-bulkhead-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: GRACEFUL DEGRADATION
// ═══════════════════════════════════════════════════════════════════════════════

async function testDegradation(): Promise<void> {
  log('TEST 3: Graceful Degradation');

  const engine = getResilienceEngine('test-degrade-1', {
    config: {
      degradation: {
        enabled: true,
        autoDegrade: false, // Manual control for test
        startTier: 'PLATINUM',
        degradeOnTimeout: false,
        degradeOnAgentFailure: 100, // High so we control manually
      },
    },
  });

  const events: ResilienceEvent[] = [];
  engine.events.onAll(e => events.push(e));

  assert(engine.getCurrentTier() === 'PLATINUM', 'Starts at PLATINUM');

  // Degrade
  engine.degradeTier('Testing degradation');
  assert(engine.getCurrentTier() === 'GOLD', 'Degraded to GOLD');

  engine.degradeTier('More problems');
  assert(engine.getCurrentTier() === 'SILVER', 'Degraded to SILVER');

  engine.degradeTier('Critical issues');
  assert(engine.getCurrentTier() === 'BRONZE', 'Degraded to BRONZE');

  engine.degradeTier('Cannot go lower');
  assert(engine.getCurrentTier() === 'BRONZE', 'Stays at BRONZE (minimum)');

  // Check event
  const tierEvents = events.filter(e => e.type === 'degradation:tier_change');
  assert(tierEvents.length === 3, 'Three tier change events');

  // Upgrade
  engine.upgradeTier('System recovered');
  assert(engine.getCurrentTier() === 'SILVER', 'Upgraded to SILVER');

  destroyResilienceEngine('test-degrade-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: HEALTH SCORING
// ═══════════════════════════════════════════════════════════════════════════════

async function testHealthScoring(): Promise<void> {
  log('TEST 4: Health Scoring');

  const engine = getResilienceEngine('test-health-1');

  // Calculate health with a simple prompt
  const score = engine.calculateHealthScore('Build me an e-commerce site', 'GOLD');

  assert(typeof score.overall === 'number', 'Health score is a number');
  assert(score.overall >= 0 && score.overall <= 100, 'Score between 0-100');
  assert(typeof score.prediction === 'string', 'Has prediction string');
  assert(Array.isArray(score.recommendations), 'Has recommendations array');
  assert(typeof score.factors === 'object', 'Has factors object');

  // Test shouldProceed
  const decision = engine.shouldProceed(score);
  assert(typeof decision.proceed === 'boolean', 'shouldProceed returns boolean');

  destroyResilienceEngine('test-health-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: SELF-HEALING
// ═══════════════════════════════════════════════════════════════════════════════

async function testSelfHealing(): Promise<void> {
  log('TEST 5: Self-Healing Analysis');

  const engine = getResilienceEngine('test-heal-1', {
    config: {
      selfHealing: {
        enabled: true,
        maxAttempts: 3,
        analyzeFailures: true,
        autoSimplify: true,
      },
    },
  });

  // Test timeout analysis - should suggest SIMPLIFY_PROMPT or REDUCE_SCOPE
  const timeoutActions = engine.analyzeFailure('oracle', 'Request timed out after 30s', {
    prompt: 'test',
  });
  assert(timeoutActions.length > 0, 'Timeout produces healing actions');
  // Actions could be SIMPLIFY_PROMPT, REDUCE_SCOPE, SWITCH_MODEL, ADD_CONTEXT, or RETRY_WITH_CACHE
  assert(
    timeoutActions.some(
      a =>
        a.type === 'SIMPLIFY_PROMPT' || a.type === 'REDUCE_SCOPE' || a.type === 'RETRY_WITH_CACHE'
    ),
    'Suggests valid action for timeout'
  );

  // Test rate limit analysis - could suggest REDUCE_SCOPE or other actions
  const rateLimitActions = engine.analyzeFailure('oracle', 'Rate limit exceeded (429)', {
    prompt: 'test',
  });
  assert(rateLimitActions.length > 0, 'Rate limit produces healing actions');
  assert(
    rateLimitActions.some(a =>
      [
        'SIMPLIFY_PROMPT',
        'REDUCE_SCOPE',
        'SWITCH_MODEL',
        'ADD_CONTEXT',
        'RETRY_WITH_CACHE',
      ].includes(a.type)
    ),
    'Suggests valid action for rate limit'
  );

  // Test quality failure - could suggest ADD_CONTEXT or SIMPLIFY_PROMPT
  const qualityActions = engine.analyzeFailure('oracle', 'Quality score below threshold', {
    prompt: 'test',
  });
  assert(
    qualityActions.some(
      a => a.type === 'ADD_CONTEXT' || a.type === 'SIMPLIFY_PROMPT' || a.type === 'REDUCE_SCOPE'
    ),
    'Suggests valid action for quality failure'
  );

  destroyResilienceEngine('test-heal-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: SECURITY (Chaos Engineering Protections)
// ═══════════════════════════════════════════════════════════════════════════════

async function testSecurity(): Promise<void> {
  log('TEST 6: Security Protections');

  // Test invalid buildId
  let invalidIdRejected = false;
  try {
    getResilienceEngine('../../../etc/passwd');
  } catch (e: any) {
    invalidIdRejected = e.message.includes('Invalid buildId');
  }
  assert(invalidIdRejected, 'Path traversal buildId rejected');

  // Test empty buildId
  let emptyIdRejected = false;
  try {
    getResilienceEngine('');
  } catch (e: any) {
    emptyIdRejected = e.message.includes('required');
  }
  assert(emptyIdRejected, 'Empty buildId rejected');

  // Test valid buildId
  let validIdAccepted = false;
  try {
    const engine = getResilienceEngine('valid-build-123_test');
    validIdAccepted = true;
    destroyResilienceEngine('valid-build-123_test');
  } catch {
    validIdAccepted = false;
  }
  assert(validIdAccepted, 'Valid buildId accepted');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: TRACING
// ═══════════════════════════════════════════════════════════════════════════════

async function testTracing(): Promise<void> {
  log('TEST 7: Distributed Tracing');

  const engine = getResilienceEngine('test-trace-1', {
    config: {
      tracing: {
        enabled: true,
        sampleRate: 1.0,
      },
    },
  });

  const events: ResilienceEvent[] = [];
  engine.events.onAll(e => events.push(e));

  // Start a trace (not span - API is startTrace)
  const span: TraceSpan = engine.startTrace('agent:oracle');
  assert(typeof span.spanId === 'string', 'startTrace returns TraceSpan with spanId');
  assert(typeof span.traceId === 'string', 'TraceSpan has traceId');

  // End the span
  await sleep(50);
  engine.endSpan(span, 'SUCCESS');

  // Check events
  const startEvent = events.find(e => e.type === 'trace:span_start');
  const endEvent = events.find(e => e.type === 'trace:span_end');
  assert(!!startEvent, 'trace:span_start event emitted');
  assert(!!endEvent, 'trace:span_end event emitted');

  destroyResilienceEngine('test-trace-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8: EVENTS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

async function testEventsSystem(): Promise<void> {
  log('TEST 8: Typed Events System');

  const engine = getResilienceEngine('test-events-1');

  // Test onAll
  const allEvents: ResilienceEvent[] = [];
  const unsubAll = engine.events.onAll(e => allEvents.push(e));

  // Test specific event subscription
  let circuitEventCount = 0;
  const unsubCircuit = engine.events.on('circuit:open', () => {
    circuitEventCount++;
  });

  // Trigger some events by causing failures
  engine.recordFailure('oracle', 'Error 1', 'UNKNOWN');
  engine.recordFailure('oracle', 'Error 2', 'UNKNOWN');
  engine.recordFailure('oracle', 'Error 3', 'UNKNOWN');
  engine.recordFailure('oracle', 'Error 4', 'UNKNOWN');
  engine.recordFailure('oracle', 'Error 5', 'UNKNOWN');

  assert(allEvents.length > 0, 'onAll receives events');
  assert(circuitEventCount === 1, 'Specific subscription works');

  // Test unsubscribe
  unsubAll();
  unsubCircuit();
  const countBefore = allEvents.length;
  engine.recordFailure('oracle', 'Error 6', 'UNKNOWN');
  assert(allEvents.length === countBefore, 'Unsubscribe works');

  destroyResilienceEngine('test-events-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function runResilienceDemo(): Promise<{ passed: number; failed: number }> {
  console.log('\n' + '═'.repeat(70));
  console.log('  OLYMPUS RESILIENCE ENGINE v3.1 - PROOF IT WORKS');
  console.log('═'.repeat(70) + '\n');

  testsPassed = 0;
  testsFailed = 0;

  try {
    await testCircuitBreaker();
    await testBulkhead();
    await testDegradation();
    await testHealthScoring();
    await testSelfHealing();
    await testSecurity();
    await testTracing();
    await testEventsSystem();
  } catch (e) {
    console.error('\n\x1b[31mTest suite crashed:\x1b[0m', e);
    testsFailed++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log(
    `  RESULTS: \x1b[32m${testsPassed} passed\x1b[0m, \x1b[31m${testsFailed} failed\x1b[0m`
  );
  console.log('═'.repeat(70) + '\n');

  return { passed: testsPassed, failed: testsFailed };
}

// Run if executed directly
if (require.main === module) {
  runResilienceDemo().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

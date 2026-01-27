/**
 * CHAOS DESTRUCTION TESTS
 * ========================
 * Intentionally trying to BREAK PANTHEON.
 * Every failure here = a bug we need to fix.
 */

import { describe, it, expect } from 'vitest';
import {
  BuildSimulator,
  createStandardBuildConfig,
  CORE_INVARIANTS,
} from './core/simulator';
import {
  BuildConfig,
  AgentConfig,
  ChaosConfig,
  BuildSnapshot,
} from './core/types';
import { TestOracle } from './core/oracle';
import { VisualDebugger } from './visual-debugger';

// ============================================================================
// 1. GARBAGE DATA ATTACKS
// ============================================================================

describe('CHAOS: Garbage Data', () => {
  it('null config should not crash', () => {
    const sim = new BuildSimulator(42);

    // ATTACK: Pass null/undefined
    expect(() => {
      sim.initialize(null as unknown as BuildConfig);
    }).toThrow(); // SHOULD throw, not crash with cryptic error
  });

  it('empty agents array should handle gracefully', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'empty-build',
      tier: 'starter',
      agents: [], // ATTACK: No agents
      maxConcurrency: 5,
      maxRetries: 3,
    };

    sim.initialize(config);
    sim.tick();

    // SHOULD: Complete immediately with 100% progress
    expect(sim.isComplete()).toBe(true);
    expect(sim.getSnapshot().progress).toBe(100);
  });

  it('negative concurrency should be rejected', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'bad-config',
      tier: 'starter',
      agents: [{ id: 'a', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0 }],
      maxConcurrency: -5, // ATTACK: Negative
      maxRetries: 3,
    };

    expect(() => sim.initialize(config)).toThrow();
  });

  it('NaN values should be rejected', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'nan-config',
      tier: 'starter',
      agents: [{ id: 'a', phase: 'discovery', dependencies: [], optional: false, estimatedDuration: NaN, failureRate: NaN }],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    expect(() => sim.initialize(config)).toThrow();
  });

  it('circular dependencies should be detected', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'circular',
      tier: 'starter',
      agents: [
        { id: 'a', phase: 'discovery', dependencies: ['b'], optional: false, estimatedDuration: 100, failureRate: 0 },
        { id: 'b', phase: 'discovery', dependencies: ['c'], optional: false, estimatedDuration: 100, failureRate: 0 },
        { id: 'c', phase: 'discovery', dependencies: ['a'], optional: false, estimatedDuration: 100, failureRate: 0 }, // CYCLE!
      ],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    expect(() => sim.initialize(config)).toThrow(/circular|cycle|loop/i);
  });

  it('non-existent dependency should be detected', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'missing-dep',
      tier: 'starter',
      agents: [
        { id: 'a', phase: 'discovery', dependencies: ['ghost'], optional: false, estimatedDuration: 100, failureRate: 0 }, // 'ghost' doesn't exist!
      ],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    expect(() => sim.initialize(config)).toThrow(/ghost|not found|missing/i);
  });

  it('invalid phase should be rejected', () => {
    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'bad-phase',
      tier: 'starter',
      agents: [
        { id: 'a', phase: 'nonexistent' as any, dependencies: [], optional: false, estimatedDuration: 100, failureRate: 0 },
      ],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    expect(() => sim.initialize(config)).toThrow(/phase|invalid/i);
  });
});

// ============================================================================
// 2. PERFORMANCE ATTACKS (1000 calls/second)
// ============================================================================

describe('CHAOS: Performance', () => {
  it('1000 rapid initializations should not leak memory', () => {
    const startMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 1000; i++) {
      const sim = new BuildSimulator(i);
      const config = createStandardBuildConfig('starter', i);
      sim.initialize(config);
      // Don't store reference - should be GC'd
    }

    // Force GC if available
    if (global.gc) global.gc();

    const endMemory = process.memoryUsage().heapUsed;
    const growthMB = (endMemory - startMemory) / 1024 / 1024;

    // SHOULD: Less than 50MB growth for 1000 builds
    expect(growthMB).toBeLessThan(50);
  });

  it('10000 ticks should complete in under 1 second', () => {
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('professional', 42);
    sim.initialize(config);

    const start = performance.now();
    let ticks = 0;

    while (!sim.isComplete() && ticks < 10000) {
      sim.tick();
      ticks++;
    }

    const duration = performance.now() - start;

    // SHOULD: Complete in under 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('history should not grow unbounded', () => {
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('enterprise', 42);
    sim.initialize(config);

    // Run to completion
    while (!sim.isComplete()) {
      sim.tick();
    }

    const history = sim.getHistory();

    // SHOULD: History bounded to reasonable size
    // Enterprise has ~35 agents, shouldn't need 1000+ snapshots
    expect(history.length).toBeLessThan(500);
  });
});

// ============================================================================
// 3. DEPENDENCY REMOVAL ATTACKS
// ============================================================================

describe('CHAOS: Missing Dependencies', () => {
  it('removing agent mid-simulation should not crash', () => {
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('professional', 42);
    sim.initialize(config);

    // Run a few ticks
    for (let i = 0; i < 5; i++) {
      sim.tick();
    }

    // ATTACK: Corrupt the snapshot by removing an agent
    const snapshot = sim.getSnapshot();
    const firstAgent = snapshot.agents.keys().next().value;
    snapshot.agents.delete(firstAgent);

    // Should not crash on next tick
    expect(() => sim.tick()).not.toThrow();
  });

  it('oracle should handle empty event log', () => {
    const oracle = new TestOracle();

    // ATTACK: Empty inputs
    const verdict = oracle.verify([], []);

    expect(verdict).toBeDefined();
    expect(verdict.valid).toBe(true); // Nothing to violate
  });

  it('oracle should handle single snapshot', () => {
    const oracle = new TestOracle();
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('starter', 42);
    sim.initialize(config);

    // Only one snapshot
    const verdict = oracle.verify([sim.getSnapshot()], []);

    expect(verdict).toBeDefined();
  });
});

// ============================================================================
// 4. LARGE INPUT ATTACKS (10MB when expecting 10KB)
// ============================================================================

describe('CHAOS: Large Inputs', () => {
  it('1000 agents should not crash', () => {
    const sim = new BuildSimulator(42);

    // ATTACK: Massive agent list
    const agents: AgentConfig[] = [];
    for (let i = 0; i < 1000; i++) {
      agents.push({
        id: `agent-${i}`,
        phase: 'implementation',
        dependencies: i > 0 ? [`agent-${i - 1}`] : [], // Chain dependencies
        optional: false,
        estimatedDuration: 10,
        failureRate: 0,
      });
    }

    const config: BuildConfig = {
      id: 'massive',
      tier: 'enterprise',
      agents,
      maxConcurrency: 100,
      maxRetries: 1,
    };

    // Should initialize without crashing
    expect(() => sim.initialize(config)).not.toThrow();

    // Should complete (eventually)
    let ticks = 0;
    const maxTicks = 10000;
    while (!sim.isComplete() && ticks < maxTicks) {
      sim.tick();
      ticks++;
    }

    expect(sim.isComplete()).toBe(true);
  });

  it('agent with 100 dependencies should work', () => {
    const sim = new BuildSimulator(42);

    const agents: AgentConfig[] = [];

    // Create 100 independent agents
    for (let i = 0; i < 100; i++) {
      agents.push({
        id: `prereq-${i}`,
        phase: 'discovery',
        dependencies: [],
        optional: false,
        estimatedDuration: 10,
        failureRate: 0,
      });
    }

    // One agent depends on ALL of them
    agents.push({
      id: 'mega-agent',
      phase: 'implementation',
      dependencies: agents.map(a => a.id),
      optional: false,
      estimatedDuration: 10,
      failureRate: 0,
    });

    const config: BuildConfig = {
      id: 'mega-deps',
      tier: 'enterprise',
      agents,
      maxConcurrency: 50,
      maxRetries: 1,
    };

    sim.initialize(config);

    while (!sim.isComplete()) {
      sim.tick();
    }

    const snapshot = sim.getSnapshot();
    const megaAgent = snapshot.agents.get('mega-agent');

    expect(megaAgent?.state).toBe('completed');
  });

  it('visual debugger should handle 10000 events', () => {
    const debugger_ = new VisualDebugger();
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('enterprise', 42);
    sim.initialize(config);

    // Generate lots of snapshots
    while (!sim.isComplete()) {
      sim.tick();
      debugger_.recordSnapshot(sim.getSnapshot());
    }

    for (const event of sim.getEventLog()) {
      debugger_.recordEvent(event);
    }

    // Should generate report without crashing
    const start = performance.now();
    const report = debugger_.generateReport();
    const duration = performance.now() - start;

    expect(report).toBeDefined();
    expect(report.html.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5000); // Under 5 seconds
  });
});

// ============================================================================
// 5. JAVASCRIPT DISABLED (N/A for Node - but check browser assumptions)
// ============================================================================

describe('CHAOS: No Browser Assumptions', () => {
  it('should not depend on window object', () => {
    // Verify no window references in core modules
    expect(typeof window).toBe('undefined');

    // Should still work
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('starter', 42);
    sim.initialize(config);

    while (!sim.isComplete()) {
      sim.tick();
    }

    expect(sim.getSnapshot().state).toBe('completed');
  });

  it('should not depend on document object', () => {
    expect(typeof document).toBe('undefined');

    // VisualDebugger generates HTML but doesn't need DOM
    const debugger_ = new VisualDebugger();
    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('starter', 42);
    sim.initialize(config);

    while (!sim.isComplete()) {
      sim.tick();
      debugger_.recordSnapshot(sim.getSnapshot());
    }

    const report = debugger_.generateReport();
    expect(report.html).toContain('<!DOCTYPE html>');
  });
});

// ============================================================================
// 6. ATTACKER EXPLOITS
// ============================================================================

describe('CHAOS: Security', () => {
  it('agent ID with script injection should be escaped in HTML', () => {
    const debugger_ = new VisualDebugger();
    const sim = new BuildSimulator(42);

    // ATTACK: XSS in agent ID
    const config: BuildConfig = {
      id: '<script>alert("xss")</script>',
      tier: 'starter',
      agents: [{
        id: '<img onerror="alert(1)" src=x>',
        phase: 'discovery',
        dependencies: [],
        optional: false,
        estimatedDuration: 100,
        failureRate: 0,
      }],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    sim.initialize(config);
    while (!sim.isComplete()) {
      sim.tick();
      debugger_.recordSnapshot(sim.getSnapshot());
    }

    const report = debugger_.generateReport();

    // SHOULD: HTML should not contain unescaped script tags
    expect(report.html).not.toContain('<script>alert');
    expect(report.html).not.toContain('onerror=');
  });

  it('prototype pollution should not affect simulation', () => {
    // ATTACK: Try to pollute Object prototype
    const maliciousConfig = JSON.parse('{"__proto__": {"polluted": true}}');

    const sim = new BuildSimulator(42);
    const config = createStandardBuildConfig('starter', 42);

    // Merge malicious config (simulating user input)
    const merged = { ...config, ...maliciousConfig };

    sim.initialize(merged);

    // Should not have polluted Object.prototype
    expect(({} as any).polluted).toBeUndefined();
  });

  it('extremely long agent ID should be truncated or rejected', () => {
    const sim = new BuildSimulator(42);

    // ATTACK: 1MB agent ID
    const longId = 'a'.repeat(1024 * 1024);

    const config: BuildConfig = {
      id: 'long-id-test',
      tier: 'starter',
      agents: [{
        id: longId,
        phase: 'discovery',
        dependencies: [],
        optional: false,
        estimatedDuration: 100,
        failureRate: 0,
      }],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    // SHOULD: Either reject or truncate, not crash
    expect(() => sim.initialize(config)).not.toThrow();
  });

  it('regex DoS in agent matching should be prevented', () => {
    // ATTACK: ReDoS pattern (if we had regex matching)
    const evilRegex = 'a'.repeat(30) + '!';

    const sim = new BuildSimulator(42);
    const config: BuildConfig = {
      id: 'redos-test',
      tier: 'starter',
      agents: [{
        id: evilRegex,
        phase: 'discovery',
        dependencies: [],
        optional: false,
        estimatedDuration: 100,
        failureRate: 0,
      }],
      maxConcurrency: 5,
      maxRetries: 3,
    };

    const start = performance.now();
    sim.initialize(config);
    while (!sim.isComplete()) {
      sim.tick();
    }
    const duration = performance.now() - start;

    // Should complete quickly, not hang on regex
    expect(duration).toBeLessThan(1000);
  });
});

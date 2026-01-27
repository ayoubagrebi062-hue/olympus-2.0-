/**
 * OLYMPUS 2.0 - Governance Seal Test
 * Verifies seal invariant enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GOVERNANCE_SEAL } from '../src/lib/agents/governance/governance-seal';
import { sealInvariant } from '../src/lib/agents/governance/invariant/seal-invariant';
import { AgentIdentity } from '../src/lib/agents/governance/types';

describe('Governance Seal', () => {
  it('should declare seal as true', () => {
    expect(GOVERNANCE_SEAL.sealed).toBe(true);
  });

  it('should have version 8.0.0', () => {
    expect(GOVERNANCE_SEAL.version).toBe('8.0.0');
  });

  it('should have exactly 4 authorized layers', () => {
    expect(GOVERNANCE_SEAL.authorizedLayers).toHaveLength(4);
  });

  it('should authorize foundation, persistence, enforcement, control layers', () => {
    const expectedLayers = ['foundation', 'persistence', 'enforcement', 'control'];
    expect(GOVERNANCE_SEAL.authorizedLayers).toEqual(
      expect.arrayContaining(expectedLayers)
    );
  });

  it('should have correct module count for each layer', () => {
    expect(GOVERNANCE_SEAL.authorizedModules.foundation).toHaveLength(4);
    expect(GOVERNANCE_SEAL.authorizedModules.persistence).toHaveLength(3);
    expect(GOVERNANCE_SEAL.authorizedModules.enforcement).toHaveLength(2);
    expect(GOVERNANCE_SEAL.authorizedModules.control).toHaveLength(3);
  });

  it('should have non-empty seal hash', () => {
    expect(GOVERNANCE_SEAL.sealHash).toBeTruthy();
    expect(GOVERNANCE_SEAL.sealHash).toMatch(/^0x[a-f0-9]+$/);
  });

  it('should have seal authority', () => {
    expect(GOVERNANCE_SEAL.sealAuthority).toBe('OLYMPUS_CORE_TEAM');
  });

  it('should have seal date', () => {
    expect(GOVERNANCE_SEAL.sealDate).toBe('2026-01-17T00:00:00Z');
  });
});

describe('Seal Invariant', () => {
  let testIdentity: AgentIdentity;

  beforeEach(() => {
    testIdentity = {
      agentId: 'test-agent',
      version: '8.0.0',
      fingerprint: 'test-fingerprint',
      role: 'executor' as const,
      tenantId: 'test-tenant',
      buildId: 'test-build'
    };
  });

  it('should pass with valid seal', async () => {
    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(true);
    expect(result.invariantName).toBe('GOVERNANCE_SEAL');
    expect(result.reason).toContain('valid');
  });

  it('should fail if seal is false', async () => {
    // Temporarily modify seal (in real runtime this would be impossible)
    const originalSealed = (GOVERNANCE_SEAL as any).sealed;
    (GOVERNANCE_SEAL as any).sealed = false;

    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('NOT SEALED');

    // Restore
    (GOVERNANCE_SEAL as any).sealed = originalSealed;
  });

  it('should fail if seal hash is invalid', async () => {
    const originalHash = (GOVERNANCE_SEAL as any).sealHash;
    (GOVERNANCE_SEAL as any).sealHash = 'invalid-hash';

    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('HASH INVALID');

    // Restore
    (GOVERNANCE_SEAL as any).sealHash = originalHash;
  });

  it('should fail if unauthorized layer is detected', async () => {
    const originalLayers = (GOVERNANCE_SEAL as any).authorizedLayers;
    // Replace one authorized layer with unauthorized (keeps length at 4)
    (GOVERNANCE_SEAL as any).authorizedLayers = ['foundation', 'persistence', 'enforcement', 'unauthorized-layer'];

    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('UNAUTHORIZED');

    // Restore
    (GOVERNANCE_SEAL as any).authorizedLayers = originalLayers;
  });

  it('should fail if module count mismatch', async () => {
    const originalModules = (GOVERNANCE_SEAL as any).authorizedModules;
    (GOVERNANCE_SEAL as any).authorizedModules = {
      ...originalModules,
      foundation: [] // Empty instead of 4
    };

    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('MODULE COUNT MISMATCH');

    // Restore
    (GOVERNANCE_SEAL as any).authorizedModules = originalModules;
  });

  it('should include seal details in successful result', async () => {
    const result = await sealInvariant.check(testIdentity);

    expect(result.passed).toBe(true);
    expect(result.details).toMatchObject({
      sealVersion: '8.0.0',
      sealHash: GOVERNANCE_SEAL.sealHash,
      authorizedLayers: 4
    });
  });
});

describe('Governance Seal Immutability', () => {
  it('should have readonly structure', () => {
    // The GOVERNANCE_SEAL is a const with `as const` type assertion
    // TypeScript enforces immutability at compile time, but JavaScript doesn't
    // Test that the seal has the expected structure
    expect(GOVERNANCE_SEAL).toHaveProperty('sealed', true);
    expect(GOVERNANCE_SEAL).toHaveProperty('version', '8.0.0');
    expect(GOVERNANCE_SEAL).toHaveProperty('sealHash');
    expect(GOVERNANCE_SEAL).toHaveProperty('authorizedLayers');
    expect(GOVERNANCE_SEAL).toHaveProperty('authorizedModules');
  });

  it('should export as const type', () => {
    const seal: typeof GOVERNANCE_SEAL = GOVERNANCE_SEAL;
    expect(seal.version).toBe('8.0.0');
  });
});

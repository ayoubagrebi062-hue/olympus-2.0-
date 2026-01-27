/**
 * CRITICAL-SUMMARIZER - Comprehensive Unit Tests
 * ===============================================
 * Tests for critical decision extraction and formatting.
 * Target: 80%+ coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCriticalDecisions,
  updateCriticalDecisions,
  formatCriticalDecisionsForPrompt,
  type DesignDecisions,
  type DataDecisions,
  type ApiDecisions,
  type SecurityDecisions,
  type PageDecisions,
  type CriticalDecisions,
} from '../critical-summarizer';
import type { AgentId, AgentOutput, Decision, Artifact } from '../../types';

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockArtifact(content: string, type: string = 'document'): Artifact {
  return {
    id: `artifact-${Date.now()}`,
    type: type as any,
    path: '/mock/path',
    content,
    size: content.length,
    metadata: {},
  };
}

function createMockOutput(artifacts: Artifact[] = [], decisions: Decision[] = []): AgentOutput {
  return {
    agentId: 'mock-agent' as AgentId,
    success: true,
    artifacts,
    decisions,
    metrics: {
      tokensUsed: 100,
      durationMs: 1000,
      retries: 0,
    },
  };
}

function createArchonOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'document')]);
}

function createPaletteOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'design')]);
}

function createDatumOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'document')]);
}

function createNexusOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'document')]);
}

function createSentinelOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'document')]);
}

function createCartographerOutput(data: Record<string, unknown> = {}): AgentOutput {
  return createMockOutput([createMockArtifact(JSON.stringify(data), 'document')]);
}

// ============================================================================
// buildCriticalDecisions()
// ============================================================================

describe('buildCriticalDecisions', () => {
  describe('basic functionality', () => {
    it('should return CriticalDecisions object', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('extractedAt');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('architecture');
      expect(result).toHaveProperty('design');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('api');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('rawDecisions');
    });

    it('should set correct tier', () => {
      const outputs = new Map<AgentId, AgentOutput>();

      const starter = buildCriticalDecisions(outputs, 'starter');
      expect(starter.tier).toBe('starter');

      const professional = buildCriticalDecisions(outputs, 'professional');
      expect(professional.tier).toBe('professional');

      const ultimate = buildCriticalDecisions(outputs, 'ultimate');
      expect(ultimate.tier).toBe('ultimate');

      const enterprise = buildCriticalDecisions(outputs, 'enterprise');
      expect(enterprise.tier).toBe('enterprise');
    });

    it('should set extractedAt timestamp', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const before = new Date();
      const result = buildCriticalDecisions(outputs, 'starter');
      const after = new Date();

      expect(result.extractedAt).toBeInstanceOf(Date);
      expect(result.extractedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.extractedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should collect sources from all outputs', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('archon', createMockOutput());
      outputs.set('palette', createMockOutput());
      outputs.set('datum', createMockOutput());

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.sources).toContain('archon');
      expect(result.sources).toContain('palette');
      expect(result.sources).toContain('datum');
      expect(result.sources.length).toBe(3);
    });

    it('should collect raw decisions from all outputs', () => {
      const decision1: Decision = {
        id: 'd1',
        type: 'architecture',
        description: 'Decision 1',
        rationale: 'Reason 1',
        timestamp: new Date(),
      };
      const decision2: Decision = {
        id: 'd2',
        type: 'design',
        description: 'Decision 2',
        rationale: 'Reason 2',
        timestamp: new Date(),
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('archon', createMockOutput([], [decision1]));
      outputs.set('palette', createMockOutput([], [decision2]));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.rawDecisions.length).toBe(2);
    });
  });

  describe('ARCHON extraction', () => {
    it('should extract architecture decisions from ARCHON', () => {
      const archonData = {
        techStack: {
          frontend: { framework: 'Next.js' },
          styling: { approach: 'Tailwind' },
        },
        patterns: {
          stateManagement: 'zustand',
          dataFetching: 'react-query',
        },
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('archon', createArchonOutput(archonData));

      const result = buildCriticalDecisions(outputs, 'professional');

      expect(result.architecture).toBeDefined();
    });

    it('should handle missing ARCHON output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.architecture).toBeDefined();
    });
  });

  describe('PALETTE extraction', () => {
    it('should extract design decisions from PALETTE', () => {
      const paletteData = {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          foreground: '#0f172a',
          muted: '#f1f5f9',
          destructive: '#ef4444',
          border: '#e2e8f0',
        },
        typography: {
          family: 'Inter',
          scale: 'default',
        },
        style: {
          borderRadius: 'medium',
          spacing: 'default',
        },
        darkMode: true,
        animations: 'subtle',
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('palette', createPaletteOutput(paletteData));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.design.colorPalette).toBeDefined();
      expect(result.design.colorPalette?.primary).toBe('#3b82f6');
      expect(result.design.typography?.fontFamily).toBe('Inter');
      expect(result.design.borderRadius).toBe('medium');
      expect(result.design.darkMode).toBe(true);
    });

    it('should use defaults when PALETTE data is missing', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('palette', createPaletteOutput({}));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.design.colorPalette?.primary).toBe('#3b82f6');
    });

    it('should handle missing PALETTE output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.design).toEqual({});
    });
  });

  describe('DATUM extraction', () => {
    it('should extract data decisions from DATUM', () => {
      const datumData = {
        tables: [
          {
            name: 'users',
            columns: [{ name: 'id' }, { name: 'email' }, { name: 'deletedAt' }],
          },
          { name: 'posts', columns: [{ name: 'id' }, { name: 'title' }] },
        ],
        relationships: [{ from: 'posts', to: 'users', type: 'one-to-many', onDelete: 'Cascade' }],
        enums: [{ name: 'UserRole', values: ['admin', 'user', 'guest'] }],
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('datum', createDatumOutput(datumData));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.data.entities).toContain('users');
      expect(result.data.entities).toContain('posts');
      expect(result.data.relationships?.length).toBe(1);
      expect(result.data.relationships?.[0].cascadeDelete).toBe(true);
      expect(result.data.softDeleteEntities).toContain('users');
      expect(result.data.enums?.length).toBe(1);
    });

    it('should handle missing DATUM output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.data).toEqual({});
    });
  });

  describe('NEXUS extraction', () => {
    it('should extract API decisions from NEXUS', () => {
      const nexusData = {
        endpoints: [
          { method: 'GET', path: '/api/users', description: 'List users', auth: true },
          { method: 'POST', path: '/api/auth/login', description: 'Login', public: true },
          { method: 'DELETE', path: '/api/admin/users', description: 'Delete user', role: 'admin' },
        ],
        webhooks: [{ path: '/api/webhooks/stripe' }],
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('nexus', createNexusOutput(nexusData));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.api.endpoints?.length).toBe(3);
      expect(result.api.publicEndpoints).toContain('/api/auth/login');
      expect(result.api.adminEndpoints).toContain('/api/admin/users');
      expect(result.api.webhooks).toContain('/api/webhooks/stripe');
    });

    it('should handle missing NEXUS output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.api).toEqual({});
    });
  });

  describe('SENTINEL extraction', () => {
    it('should extract security decisions from SENTINEL', () => {
      const sentinelData = {
        auth_config: {
          provider: 'supabase',
          mfa: { enabled: true, requiredFor: ['admin'] },
          session: { duration: 604800, refresh: true, maxConcurrent: 3 },
        },
        security_rules: [
          { type: 'rate_limit', endpoint: '/api/auth', limit: 100, window: 3600 },
          { type: 'encryption', fields: ['password', 'ssn'] },
          { type: 'audit', events: ['login', 'logout'] },
        ],
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('sentinel', createSentinelOutput(sentinelData));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.security.authMethod).toBe('supabase');
      expect(result.security.mfaRequired).toBe(true);
      expect(result.security.mfaRoles).toContain('admin');
      expect(result.security.session?.duration).toBe(604800);
      expect(result.security.rateLimits?.length).toBe(1);
      expect(result.security.encryptedFields).toContain('password');
      expect(result.security.auditEvents).toContain('login');
    });

    it('should handle missing SENTINEL output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.security).toEqual({});
    });
  });

  describe('CARTOGRAPHER extraction', () => {
    it('should extract page decisions from CARTOGRAPHER', () => {
      const cartographerData = {
        pages: [
          {
            name: 'Home',
            path: '/',
            layout: 'marketing',
            auth: false,
            sections: ['Hero', 'Features'],
          },
          {
            name: 'Dashboard',
            path: '/dashboard',
            layout: 'dashboard',
            protected: true,
            sections: ['Stats'],
          },
        ],
        navigation: {
          main: ['Home', 'About', 'Pricing'],
          footer: ['Privacy', 'Terms'],
          sidebar: ['Dashboard', 'Settings'],
        },
        layouts: [{ name: 'default' }, { name: 'dashboard' }],
      };

      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('cartographer', createCartographerOutput(cartographerData));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.pages.pages?.length).toBe(2);
      expect(result.pages.pages?.[0].path).toBe('/');
      expect(result.pages.pages?.[1].requiresAuth).toBe(true);
      expect(result.pages.navigation?.main).toContain('Home');
      expect(result.pages.layouts).toContain('default');
    });

    it('should handle missing CARTOGRAPHER output', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.pages).toEqual({});
    });
  });

  describe('empty/invalid data handling', () => {
    it('should handle empty artifact content', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('palette', createMockOutput([createMockArtifact('', 'design')]));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in artifact', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('palette', createMockOutput([createMockArtifact('not valid json', 'design')]));

      // Should not throw
      expect(() => buildCriticalDecisions(outputs, 'starter')).not.toThrow();
    });

    it('should handle output with no artifacts', () => {
      const outputs = new Map<AgentId, AgentOutput>();
      outputs.set('palette', createMockOutput([]));

      const result = buildCriticalDecisions(outputs, 'starter');

      expect(result.design).toEqual({});
    });
  });
});

// ============================================================================
// updateCriticalDecisions()
// ============================================================================

describe('updateCriticalDecisions', () => {
  let baseDecisions: CriticalDecisions;

  beforeEach(() => {
    baseDecisions = {
      tier: 'starter',
      extractedAt: new Date('2024-01-01'),
      sources: ['archon'],
      architecture: {
        framework: 'Next.js',
        styling: 'Tailwind',
        componentLibrary: 'shadcn/ui',
        stateManagement: 'zustand',
        dataFetching: 'react-query',
        databaseType: 'postgresql',
        orm: 'prisma',
        authProvider: 'supabase',
        testingFramework: 'vitest',
        deploymentTarget: 'vercel',
      },
      design: {},
      data: {},
      api: {},
      security: {},
      pages: {},
      rawDecisions: [],
    };
  });

  describe('basic functionality', () => {
    it('should update extractedAt timestamp', () => {
      const output = createMockOutput();
      const before = new Date();
      const result = updateCriticalDecisions(baseDecisions, 'palette', output);
      const after = new Date();

      expect(result.extractedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.extractedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should add new source if not present', () => {
      const output = createMockOutput();
      const result = updateCriticalDecisions(baseDecisions, 'palette', output);

      expect(result.sources).toContain('archon');
      expect(result.sources).toContain('palette');
    });

    it('should not duplicate existing source', () => {
      const output = createMockOutput();
      const result = updateCriticalDecisions(baseDecisions, 'archon', output);

      const archonCount = result.sources.filter(s => s === 'archon').length;
      expect(archonCount).toBe(1);
    });

    it('should append raw decisions', () => {
      const decision: Decision = {
        id: 'd1',
        type: 'design',
        description: 'New decision',
        rationale: 'Reason',
        timestamp: new Date(),
      };
      const output = createMockOutput([], [decision]);

      const result = updateCriticalDecisions(baseDecisions, 'palette', output);

      expect(result.rawDecisions.length).toBe(1);
      expect(result.rawDecisions[0].description).toBe('New decision');
    });

    it('should not mutate original decisions', () => {
      const output = createPaletteOutput({ colors: { primary: '#ff0000' } });
      const originalExtractedAt = baseDecisions.extractedAt;

      updateCriticalDecisions(baseDecisions, 'palette', output);

      expect(baseDecisions.extractedAt).toBe(originalExtractedAt);
      expect(baseDecisions.design).toEqual({});
    });
  });

  describe('agent-specific updates', () => {
    it('should update architecture for archon', () => {
      const output = createArchonOutput({
        techStack: { frontend: { framework: 'Remix' } },
      });

      const result = updateCriticalDecisions(baseDecisions, 'archon', output);

      expect(result.architecture).toBeDefined();
    });

    it('should update design for palette', () => {
      const output = createPaletteOutput({
        colors: { primary: '#ff0000' },
      });

      const result = updateCriticalDecisions(baseDecisions, 'palette', output);

      expect(result.design.colorPalette?.primary).toBe('#ff0000');
    });

    it('should update design for blocks', () => {
      const output = createPaletteOutput({
        colors: { secondary: '#00ff00' },
      });

      const result = updateCriticalDecisions(baseDecisions, 'blocks', output);

      expect(result.design.colorPalette).toBeDefined();
    });

    it('should update design for wire', () => {
      const output = createPaletteOutput({
        style: { borderRadius: 'large' },
      });

      const result = updateCriticalDecisions(baseDecisions, 'wire', output);

      expect(result.design.borderRadius).toBe('large');
    });

    it('should update data for datum', () => {
      const output = createDatumOutput({
        tables: [{ name: 'products' }],
      });

      const result = updateCriticalDecisions(baseDecisions, 'datum', output);

      expect(result.data.entities).toContain('products');
    });

    it('should update api for nexus', () => {
      const output = createNexusOutput({
        endpoints: [{ method: 'GET', path: '/api/test' }],
      });

      const result = updateCriticalDecisions(baseDecisions, 'nexus', output);

      expect(result.api.endpoints?.length).toBe(1);
    });

    it('should update security for sentinel', () => {
      const output = createSentinelOutput({
        auth_config: { provider: 'clerk' },
      });

      const result = updateCriticalDecisions(baseDecisions, 'sentinel', output);

      expect(result.security.authMethod).toBe('clerk');
    });

    it('should update pages for cartographer', () => {
      const output = createCartographerOutput({
        pages: [{ name: 'About', path: '/about' }],
      });

      const result = updateCriticalDecisions(baseDecisions, 'cartographer', output);

      expect(result.pages.pages?.length).toBe(1);
    });
  });

  describe('merge behavior', () => {
    it('should merge design decisions', () => {
      baseDecisions.design = {
        borderRadius: 'large',
        darkMode: false,
      };

      const output = createPaletteOutput({
        typography: { family: 'Roboto' },
        animations: 'expressive',
      });

      const result = updateCriticalDecisions(baseDecisions, 'palette', output);

      // extractPaletteDecisions creates new colorPalette with defaults
      // but non-overlapping fields from baseDecisions should remain
      // The spread merges: existing design fields + extracted fields
      expect(result.design.typography?.fontFamily).toBe('Roboto');
      expect(result.design.animations).toBe('expressive');
      // Note: colorPalette gets default values from extractPaletteDecisions
      expect(result.design.colorPalette?.primary).toBe('#3b82f6'); // default
    });

    it('should merge data decisions', () => {
      baseDecisions.data = { entities: ['users'] };

      const output = createDatumOutput({
        tables: [{ name: 'products' }],
      });

      const result = updateCriticalDecisions(baseDecisions, 'datum', output);

      expect(result.data.entities).toContain('products');
    });
  });
});

// ============================================================================
// formatCriticalDecisionsForPrompt()
// ============================================================================

describe('formatCriticalDecisionsForPrompt', () => {
  let decisions: CriticalDecisions;

  beforeEach(() => {
    decisions = {
      tier: 'professional',
      extractedAt: new Date(),
      sources: ['archon', 'palette', 'datum', 'nexus', 'sentinel', 'cartographer'],
      architecture: {
        framework: 'Next.js',
        styling: 'Tailwind',
        componentLibrary: 'shadcn/ui',
        stateManagement: 'zustand',
        dataFetching: 'react-query',
        databaseType: 'postgresql',
        orm: 'prisma',
        authProvider: 'supabase',
        testingFramework: 'vitest',
        deploymentTarget: 'vercel',
      },
      design: {
        colorPalette: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          foreground: '#0f172a',
          muted: '#f1f5f9',
          destructive: '#ef4444',
          border: '#e2e8f0',
        },
        typography: {
          fontFamily: 'Inter',
          headingFont: 'Playfair Display',
          scale: 'default',
        },
        borderRadius: 'medium',
        darkMode: true,
        animations: 'subtle',
        spacing: 'default',
      },
      data: {
        entities: ['users', 'posts', 'comments'],
        relationships: [{ from: 'posts', to: 'users', type: 'one-to-many', cascadeDelete: true }],
        softDeleteEntities: ['users'],
        searchableEntities: [],
        auditedEntities: [],
        enums: [{ name: 'UserRole', values: ['admin', 'user'] }],
      },
      api: {
        endpoints: [
          { method: 'GET', path: '/api/users', description: 'List', requiresAuth: true },
          { method: 'POST', path: '/api/auth/login', description: 'Login', requiresAuth: false },
        ],
        webhooks: ['/api/webhooks/stripe'],
        publicEndpoints: ['/api/auth/login'],
        adminEndpoints: ['/api/admin/users'],
      },
      security: {
        authMethod: 'supabase',
        mfaRequired: true,
        mfaRoles: ['admin'],
        session: { duration: 604800, refreshEnabled: true, maxConcurrent: 5 },
        rateLimits: [{ endpoint: '/api/auth', limit: 100, window: 3600 }],
        encryptedFields: ['password'],
        auditEvents: ['login'],
      },
      pages: {
        pages: [
          { name: 'Home', path: '/', layout: 'marketing', requiresAuth: false, sections: ['Hero'] },
          {
            name: 'Dashboard',
            path: '/dashboard',
            layout: 'dashboard',
            requiresAuth: true,
            sections: ['Stats'],
          },
        ],
        navigation: {
          main: ['Home', 'About'],
          footer: ['Privacy'],
          sidebar: ['Dashboard'],
        },
        layouts: ['default', 'dashboard'],
      },
      rawDecisions: [],
    };
  });

  describe('basic output', () => {
    it('should return a string', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      expect(typeof result).toBe('string');
    });

    it('should always include architecture', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      // Architecture section should be present
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('frontend agents', () => {
    const frontendAgents: AgentId[] = ['pixel', 'blocks', 'wire', 'polish', 'flow'];

    frontendAgents.forEach(agent => {
      it(`should include design decisions for ${agent}`, () => {
        const result = formatCriticalDecisionsForPrompt(decisions, agent);

        expect(result).toContain('DESIGN CONSTRAINTS');
        expect(result).toContain('Colors:');
        expect(result).toContain('#3b82f6');
      });
    });
  });

  describe('backend agents', () => {
    const backendAgents: AgentId[] = ['datum', 'forge', 'nexus', 'engine', 'gateway'];

    backendAgents.forEach(agent => {
      it(`should include data decisions for ${agent}`, () => {
        const result = formatCriticalDecisionsForPrompt(decisions, agent);

        expect(result).toContain('DATA MODEL CONSTRAINTS');
        expect(result).toContain('users');
      });
    });
  });

  describe('forge agent', () => {
    it('should include API decisions for forge', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'forge');

      expect(result).toContain('API CONSTRAINTS');
      expect(result).toContain('/api/users');
    });
  });

  describe('security agents', () => {
    const securityAgents: AgentId[] = ['sentinel', 'forge', 'nexus'];

    securityAgents.forEach(agent => {
      it(`should include security decisions for ${agent}`, () => {
        const result = formatCriticalDecisionsForPrompt(decisions, agent);

        expect(result).toContain('SECURITY CONSTRAINTS');
        expect(result).toContain('supabase');
      });
    });
  });

  describe('page agents', () => {
    const pageAgents: AgentId[] = ['pixel', 'wire', 'cartographer'];

    pageAgents.forEach(agent => {
      it(`should include page decisions for ${agent}`, () => {
        const result = formatCriticalDecisionsForPrompt(decisions, agent);

        expect(result).toContain('PAGE STRUCTURE');
        expect(result).toContain('/dashboard');
      });
    });
  });

  describe('empty sections', () => {
    it('should not include design section when empty', () => {
      decisions.design = {};
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      expect(result).not.toContain('DESIGN CONSTRAINTS');
    });

    it('should not include data section when empty', () => {
      decisions.data = {};
      const result = formatCriticalDecisionsForPrompt(decisions, 'forge');

      expect(result).not.toContain('DATA MODEL CONSTRAINTS');
    });

    it('should not include api section when empty', () => {
      decisions.api = {};
      const result = formatCriticalDecisionsForPrompt(decisions, 'forge');

      expect(result).not.toContain('API CONSTRAINTS');
    });

    it('should not include security section when empty', () => {
      decisions.security = {};
      const result = formatCriticalDecisionsForPrompt(decisions, 'sentinel');

      expect(result).not.toContain('SECURITY CONSTRAINTS');
    });

    it('should not include pages section when empty', () => {
      decisions.pages = {};
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      expect(result).not.toContain('PAGE STRUCTURE');
    });
  });

  describe('format details', () => {
    it('should format typography with heading font', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      expect(result).toContain('Heading Font: Playfair Display');
    });

    it('should format dark mode status', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'pixel');

      expect(result).toContain('Dark Mode: ENABLED');
    });

    it('should format relationships with cascade', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'datum');

      expect(result).toContain('CASCADE DELETE');
    });

    it('should format auth icons in endpoints', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'forge');

      // 🔒 for auth required, 🌐 for public
      expect(result).toContain('🔒');
      expect(result).toContain('🌐');
    });

    it('should limit endpoints to 20', () => {
      decisions.api.endpoints = Array.from({ length: 25 }, (_, i) => ({
        method: 'GET' as const,
        path: `/api/endpoint${i}`,
        description: `Endpoint ${i}`,
        requiresAuth: true,
      }));

      const result = formatCriticalDecisionsForPrompt(decisions, 'forge');

      expect(result).toContain('... and 5 more');
    });

    it('should format rate limits', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'sentinel');

      expect(result).toContain('100/3600s');
    });

    it('should format session info', () => {
      const result = formatCriticalDecisionsForPrompt(decisions, 'sentinel');

      expect(result).toContain('Duration: 604800s');
      expect(result).toContain('Refresh: ENABLED');
      expect(result).toContain('Max Concurrent: 5');
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle malformed artifact content', () => {
    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('palette', createMockOutput([createMockArtifact('{ broken json', 'design')]));

    expect(() => buildCriticalDecisions(outputs, 'starter')).not.toThrow();
  });

  it('should handle null values in data', () => {
    const datumData = {
      tables: null,
      relationships: null,
    };

    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('datum', createDatumOutput(datumData));

    expect(() => buildCriticalDecisions(outputs, 'starter')).not.toThrow();
  });

  it('should handle empty arrays in data', () => {
    const datumData = {
      tables: [],
      relationships: [],
      enums: [],
    };

    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('datum', createDatumOutput(datumData));

    const result = buildCriticalDecisions(outputs, 'starter');

    expect(result.data.entities).toEqual([]);
    expect(result.data.relationships).toEqual([]);
  });

  it('should handle artifact with wrong type', () => {
    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set(
      'archon',
      createMockOutput([
        createMockArtifact('{}', 'code'), // Wrong type, should be document
      ])
    );

    const result = buildCriticalDecisions(outputs, 'starter');

    // Should use defaults when no document artifact found
    expect(result.architecture).toBeDefined();
  });

  it('should handle artifact with raw metadata flag', () => {
    const artifact = createMockArtifact('{}', 'document');
    artifact.metadata = { raw: true };

    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('archon', createMockOutput([artifact]));

    const result = buildCriticalDecisions(outputs, 'starter');

    // Should skip artifacts with raw metadata
    expect(result.architecture).toBeDefined();
  });

  it('should handle very long content', () => {
    const largeData = {
      tables: Array.from({ length: 100 }, (_, i) => ({ name: `table${i}` })),
    };

    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('datum', createDatumOutput(largeData));

    const result = buildCriticalDecisions(outputs, 'starter');

    expect(result.data.entities?.length).toBe(100);
  });

  it('should handle unicode in content', () => {
    const paletteData = {
      typography: { family: '思源黑体' },
    };

    const outputs = new Map<AgentId, AgentOutput>();
    outputs.set('palette', createPaletteOutput(paletteData));

    const result = buildCriticalDecisions(outputs, 'starter');

    expect(result.design.typography?.fontFamily).toBe('思源黑体');
  });
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

describe('Type Exports', () => {
  it('should export DesignDecisions type', () => {
    const design: DesignDecisions = {
      colorPalette: {
        primary: '#000',
        secondary: '#000',
        accent: '#000',
        background: '#000',
        foreground: '#000',
        muted: '#000',
        destructive: '#000',
        border: '#000',
      },
      typography: { fontFamily: 'Arial', scale: 'default' },
      borderRadius: 'medium',
      spacing: 'default',
      darkMode: true,
      animations: 'subtle',
    };

    expect(design.colorPalette.primary).toBe('#000');
  });

  it('should export DataDecisions type', () => {
    const data: DataDecisions = {
      entities: ['users'],
      relationships: [],
      softDeleteEntities: [],
      searchableEntities: [],
      auditedEntities: [],
      enums: [],
    };

    expect(data.entities).toContain('users');
  });

  it('should export ApiDecisions type', () => {
    const api: ApiDecisions = {
      endpoints: [],
      webhooks: [],
      publicEndpoints: [],
      adminEndpoints: [],
    };

    expect(api.endpoints).toEqual([]);
  });

  it('should export SecurityDecisions type', () => {
    const security: SecurityDecisions = {
      authMethod: 'supabase',
      mfaRequired: false,
      mfaRoles: [],
      session: { duration: 3600, refreshEnabled: true, maxConcurrent: 5 },
      rateLimits: [],
      encryptedFields: [],
      auditEvents: [],
    };

    expect(security.authMethod).toBe('supabase');
  });

  it('should export PageDecisions type', () => {
    const pages: PageDecisions = {
      pages: [],
      navigation: { main: [], footer: [] },
      layouts: [],
    };

    expect(pages.pages).toEqual([]);
  });

  it('should export CriticalDecisions type', () => {
    const decisions: Partial<CriticalDecisions> = {
      tier: 'starter',
      sources: [],
    };

    expect(decisions.tier).toBe('starter');
  });
});

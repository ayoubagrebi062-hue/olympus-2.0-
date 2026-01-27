/**
 * OLYMPUS 2.1 - Critical Decision Summarizer
 *
 * Extracts and structures critical decisions from agent outputs
 * for propagation to downstream agents.
 *
 * THE PROBLEM:
 * Before: Decisions buried in agent outputs as unstructured text
 * After: Structured CriticalDecisions object passed to downstream agents
 */

import type { AgentId, AgentOutput, Decision, Artifact } from '../types';
import {
  ArchonEnhancedOutput,
  CriticalArchitectureDecisions,
  parseArchonOutput,
  extractCriticalDecisions,
  formatDecisionsForPrompt,
} from './archon-schema-upgrade';
import { safeJsonParse } from '@/lib/utils/safe-json';

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL DECISION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Design decisions from PALETTE/BLOCKS/WIRE
 */
export interface DesignDecisions {
  /** Color palette with semantic names */
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    destructive: string;
    border: string;
  };
  /** Typography scale */
  typography: {
    fontFamily: string;
    headingFont?: string;
    scale: 'default' | 'tight' | 'relaxed';
  };
  /** Border radius convention */
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  /** Spacing scale */
  spacing: 'tight' | 'default' | 'relaxed';
  /** Dark mode support */
  darkMode: boolean;
  /** Animation preferences */
  animations: 'none' | 'subtle' | 'expressive';

  // FIX #4: Extended fields for validation
  /** Named color tokens for validation */
  colorTokens?: string[];
  /** Standard component variants */
  componentVariants?: string[];
}

/**
 * Data model decisions from DATUM
 */
export interface DataDecisions {
  /** All defined entities */
  entities: string[];
  /** Entity relationships */
  relationships: Array<{
    from: string;
    to: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    cascadeDelete: boolean;
  }>;
  /** Entities with soft delete */
  softDeleteEntities: string[];
  /** Entities needing full-text search */
  searchableEntities: string[];
  /** Entities with audit logging */
  auditedEntities: string[];
  /** Enum definitions */
  enums: Array<{
    name: string;
    values: string[];
  }>;
}

/**
 * API decisions from NEXUS
 */
export interface ApiDecisions {
  /** All defined endpoints */
  endpoints: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description: string;
    requiresAuth: boolean;
    requiredRole?: string;
  }>;
  /** Webhook endpoints */
  webhooks: string[];
  /** Public (no auth) endpoints */
  publicEndpoints: string[];
  /** Admin-only endpoints */
  adminEndpoints: string[];
}

/**
 * Security decisions from SENTINEL
 */
export interface SecurityDecisions {
  /** Authentication method */
  authMethod: 'supabase' | 'nextauth' | 'clerk' | 'custom';
  /** MFA configuration */
  mfaRequired: boolean;
  mfaRoles: string[];
  /** Session configuration */
  session: {
    duration: number;
    refreshEnabled: boolean;
    maxConcurrent: number;
  };
  /** Rate limiting rules */
  rateLimits: Array<{
    endpoint: string;
    limit: number;
    window: number;
  }>;
  /** Sensitive fields to encrypt */
  encryptedFields: string[];
  /** Audit log events */
  auditEvents: string[];
}

/**
 * Page structure decisions from CARTOGRAPHER
 */
export interface PageDecisions {
  /** All pages */
  pages: Array<{
    name: string;
    path: string;
    layout: 'default' | 'dashboard' | 'auth' | 'marketing' | 'minimal';
    requiresAuth: boolean;
    sections: string[];
  }>;
  /** Navigation structure */
  navigation: {
    main: string[];
    footer: string[];
    sidebar?: string[];
  };
  /** Shared layouts */
  layouts: string[];
}

/**
 * Complete critical decisions across all agents
 */
export interface CriticalDecisions {
  projectType?: string;
  techStack?: string[];
  keyRequirements?: string[];
  complexity?: string;
  primaryFramework?: string;
  stylingApproach?: string;
  stateManagement?: string;
  routingStrategy?: string;
  componentLibrary?: string;
  /** Build tier */
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise';
  /** Timestamp of extraction */
  extractedAt: Date;
  /** Which agents contributed */
  sources: AgentId[];

  /** Architecture (from ARCHON) */
  architecture: CriticalArchitectureDecisions;

  /** Design (from PALETTE, BLOCKS, WIRE) */
  design: Partial<DesignDecisions>;

  /** Data (from DATUM) */
  data: Partial<DataDecisions>;

  /** API (from NEXUS) */
  api: Partial<ApiDecisions>;

  /** Security (from SENTINEL) */
  security: Partial<SecurityDecisions>;

  /** Pages (from CARTOGRAPHER) */
  pages: Partial<PageDecisions>;

  /** Raw decisions for reference */
  rawDecisions: Decision[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION EXTRACTORS BY AGENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract decisions from ARCHON output
 */
function extractArchonDecisions(
  output: AgentOutput,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise'
): CriticalArchitectureDecisions {
  // Find the main artifact with JSON output
  const docArtifact = output.artifacts.find(
    (a) => a.type === 'document' && !a.metadata?.raw
  );

  if (!docArtifact) {
    // Return defaults if no output
    const defaults = parseArchonOutput({}, tier);
    return extractCriticalDecisions(defaults);
  }

  // 50X RELIABILITY: Safe JSON parse for ARCHON decisions
  const parsed = safeJsonParse<Record<string, unknown>>(
    docArtifact.content, {}, 'critical-summarizer:archonDecisions'
  );
  const enhanced = parseArchonOutput(parsed, tier);
  return extractCriticalDecisions(enhanced);
}

/**
 * Extract decisions from PALETTE output
 */
function extractPaletteDecisions(output: AgentOutput): Partial<DesignDecisions> {
  const docArtifact = output.artifacts.find(
    (a) => a.type === 'document' || a.type === 'design'
  );

  if (!docArtifact) return {};

  // 50X RELIABILITY: Safe JSON parse for PALETTE decisions
  const parsed = safeJsonParse<Record<string, any>>(
    docArtifact.content, {}, 'critical-summarizer:paletteDecisions'
  );

  return {
    colorPalette: {
      primary: parsed.colors?.primary || parsed.palette?.primary || '#3b82f6',
      secondary: parsed.colors?.secondary || parsed.palette?.secondary || '#64748b',
      accent: parsed.colors?.accent || parsed.palette?.accent || '#f59e0b',
      background: parsed.colors?.background || '#ffffff',
      foreground: parsed.colors?.foreground || '#0f172a',
      muted: parsed.colors?.muted || '#f1f5f9',
      destructive: parsed.colors?.destructive || parsed.colors?.error || '#ef4444',
      border: parsed.colors?.border || '#e2e8f0',
    },
    typography: {
      fontFamily: parsed.typography?.family || parsed.font?.family || 'Inter',
      headingFont: parsed.typography?.headingFamily,
      scale: parsed.typography?.scale || 'default',
    },
    borderRadius: parsed.style?.borderRadius || parsed.radius || 'medium',
    spacing: parsed.style?.spacing || 'default',
    darkMode: parsed.darkMode !== false,
    animations: parsed.animations || 'subtle',
  };
}

/**
 * Extract decisions from DATUM output
 */
function extractDatumDecisions(output: AgentOutput): Partial<DataDecisions> {
  const docArtifact = output.artifacts.find((a) => a.type === 'document');

  if (!docArtifact) return {};

  // 50X RELIABILITY: Safe JSON parse for DATUM decisions
  const parsed = safeJsonParse<Record<string, any>>(
    docArtifact.content, {}, 'critical-summarizer:datumDecisions'
  );

  const entities = parsed.tables?.map((t: any) => t.name) || [];
  const relationships = parsed.relationships?.map((r: any) => ({
    from: r.from || r.source,
    to: r.to || r.target,
    type: r.type || 'one-to-many',
    cascadeDelete: r.onDelete === 'Cascade',
  })) || [];

  const softDeleteEntities = parsed.tables
    ?.filter((t: any) =>
      t.columns?.some((c: any) => c.name === 'deletedAt')
    )
    .map((t: any) => t.name) || [];

  const enums = parsed.enums?.map((e: any) => ({
    name: e.name,
    values: e.values || [],
  })) || [];

  return {
    entities,
    relationships,
    softDeleteEntities,
    searchableEntities: [],
    auditedEntities: [],
    enums,
  };
}

/**
 * Extract decisions from NEXUS output
 */
function extractNexusDecisions(output: AgentOutput): Partial<ApiDecisions> {
  const docArtifact = output.artifacts.find((a) => a.type === 'document');

  if (!docArtifact) return {};

  // 50X RELIABILITY: Safe JSON parse for NEXUS decisions
  const parsed = safeJsonParse<Record<string, any>>(
    docArtifact.content, {}, 'critical-summarizer:nexusDecisions'
  );

  const endpoints = parsed.endpoints?.map((e: any) => ({
    method: e.method || 'GET',
    path: e.path || e.url,
    description: e.description || '',
    requiresAuth: e.auth !== false && !e.public,
    requiredRole: e.role || e.requiredRole,
  })) || [];

  const publicEndpoints = endpoints
    .filter((e: any) => !e.requiresAuth)
    .map((e: any) => e.path);

  const adminEndpoints = endpoints
    .filter((e: any) => e.requiredRole === 'admin')
    .map((e: any) => e.path);

  const webhooks = parsed.webhooks?.map((w: any) => w.path || w) || [];

  return {
    endpoints,
    webhooks,
    publicEndpoints,
    adminEndpoints,
  };
}

/**
 * Extract decisions from SENTINEL output
 */
function extractSentinelDecisions(output: AgentOutput): Partial<SecurityDecisions> {
  const docArtifact = output.artifacts.find((a) => a.type === 'document');

  if (!docArtifact) return {};

  // 50X RELIABILITY: Safe JSON parse for SENTINEL decisions
  const parsed = safeJsonParse<Record<string, any>>(
    docArtifact.content, {}, 'critical-summarizer:sentinelDecisions'
  );

  return {
    authMethod: parsed.auth_config?.provider || 'supabase',
    mfaRequired: parsed.auth_config?.mfa?.enabled || false,
    mfaRoles: parsed.auth_config?.mfa?.requiredFor || [],
    session: {
      duration: parsed.auth_config?.session?.duration || 604800,
      refreshEnabled: parsed.auth_config?.session?.refresh !== false,
      maxConcurrent: parsed.auth_config?.session?.maxConcurrent || 5,
    },
    rateLimits: parsed.security_rules
      ?.filter((r: any) => r.type === 'rate_limit')
      .map((r: any) => ({
        endpoint: r.endpoint || r.path,
        limit: r.limit,
        window: r.window || 3600,
      })) || [],
    encryptedFields: parsed.security_rules
      ?.filter((r: any) => r.type === 'encryption')
      .flatMap((r: any) => r.fields) || [],
    auditEvents: parsed.security_rules
      ?.filter((r: any) => r.type === 'audit')
      .flatMap((r: any) => r.events) || [],
  };
}

/**
 * Extract decisions from CARTOGRAPHER output
 */
function extractCartographerDecisions(output: AgentOutput): Partial<PageDecisions> {
  const docArtifact = output.artifacts.find((a) => a.type === 'document');

  if (!docArtifact) return {};

  // 50X RELIABILITY: Safe JSON parse for CARTOGRAPHER decisions
  const parsed = safeJsonParse<Record<string, any>>(
    docArtifact.content, {}, 'critical-summarizer:cartographerDecisions'
  );

  const pages = parsed.pages?.map((p: any) => ({
    name: p.name || p.title,
    path: p.path || p.route,
    layout: p.layout || 'default',
    requiresAuth: p.auth !== false && p.protected !== false,
    sections: p.sections?.map((s: any) => s.name || s) || [],
  })) || [];

  return {
    pages,
    navigation: {
      main: parsed.navigation?.main || parsed.nav?.items || [],
      footer: parsed.navigation?.footer || parsed.footer?.links || [],
      sidebar: parsed.navigation?.sidebar,
    },
    layouts: parsed.layouts?.map((l: any) => l.name || l) || [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SUMMARIZER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build critical decisions from all available agent outputs
 */
export function buildCriticalDecisions(
  outputs: Map<AgentId, AgentOutput>,
  tier: 'starter' | 'professional' | 'ultimate' | 'enterprise'
): CriticalDecisions {
  const sources: AgentId[] = [];
  const rawDecisions: Decision[] = [];

  // Collect all decisions from outputs
  outputs.forEach((output, agentId) => {
    sources.push(agentId);
    rawDecisions.push(...output.decisions);
  });

  // Extract structured decisions from each agent
  const archonOutput = outputs.get('archon');
  const architecture = archonOutput
    ? extractArchonDecisions(archonOutput, tier)
    : extractCriticalDecisions(parseArchonOutput({}, tier));

  const paletteOutput = outputs.get('palette');
  const design = paletteOutput ? extractPaletteDecisions(paletteOutput) : {};

  const datumOutput = outputs.get('datum');
  const data = datumOutput ? extractDatumDecisions(datumOutput) : {};

  const nexusOutput = outputs.get('nexus');
  const api = nexusOutput ? extractNexusDecisions(nexusOutput) : {};

  const sentinelOutput = outputs.get('sentinel');
  const security = sentinelOutput ? extractSentinelDecisions(sentinelOutput) : {};

  const cartographerOutput = outputs.get('cartographer');
  const pages = cartographerOutput ? extractCartographerDecisions(cartographerOutput) : {};

  return {
    tier,
    extractedAt: new Date(),
    sources,
    architecture,
    design,
    data,
    api,
    security,
    pages,
    rawDecisions,
  };
}

/**
 * Update critical decisions with new agent output
 */
export function updateCriticalDecisions(
  existing: CriticalDecisions,
  agentId: AgentId,
  output: AgentOutput
): CriticalDecisions {
  const updated = { ...existing };
  updated.extractedAt = new Date();

  if (!updated.sources.includes(agentId)) {
    updated.sources.push(agentId);
  }

  updated.rawDecisions = [...existing.rawDecisions, ...output.decisions];

  // Update specific section based on agent
  switch (agentId) {
    case 'archon':
      updated.architecture = extractArchonDecisions(output, existing.tier);
      break;
    case 'palette':
      updated.design = { ...updated.design, ...extractPaletteDecisions(output) };
      break;
    case 'blocks':
    case 'wire':
      // BLOCKS and WIRE can also contribute to design
      const blockDesign = extractPaletteDecisions(output);
      updated.design = { ...updated.design, ...blockDesign };
      break;
    case 'datum':
      updated.data = { ...updated.data, ...extractDatumDecisions(output) };
      break;
    case 'nexus':
      updated.api = { ...updated.api, ...extractNexusDecisions(output) };
      break;
    case 'sentinel':
      updated.security = { ...updated.security, ...extractSentinelDecisions(output) };
      break;
    case 'cartographer':
      updated.pages = { ...updated.pages, ...extractCartographerDecisions(output) };
      break;
  }

  return updated;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR PROMPT INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format critical decisions for injection into agent prompt
 */
export function formatCriticalDecisionsForPrompt(
  decisions: CriticalDecisions,
  targetAgent: AgentId
): string {
  const sections: string[] = [];

  // Always include architecture decisions
  sections.push(formatDecisionsForPrompt(decisions.architecture));

  // Add design decisions for frontend agents
  const frontendAgents: AgentId[] = ['pixel', 'blocks', 'wire', 'polish', 'flow'];
  if (frontendAgents.includes(targetAgent) && Object.keys(decisions.design).length > 0) {
    sections.push(formatDesignDecisions(decisions.design));
  }

  // Add data decisions for backend agents
  const backendAgents: AgentId[] = ['datum', 'forge', 'nexus', 'engine', 'gateway'];
  if (backendAgents.includes(targetAgent) && Object.keys(decisions.data).length > 0) {
    sections.push(formatDataDecisions(decisions.data));
  }

  // Add API decisions for FORGE
  if (targetAgent === 'forge' && Object.keys(decisions.api).length > 0) {
    sections.push(formatApiDecisions(decisions.api));
  }

  // Add security decisions for security-sensitive agents
  const securityAgents: AgentId[] = ['sentinel', 'forge', 'nexus'];
  if (securityAgents.includes(targetAgent) && Object.keys(decisions.security).length > 0) {
    sections.push(formatSecurityDecisions(decisions.security));
  }

  // Add page decisions for page-generating agents
  const pageAgents: AgentId[] = ['pixel', 'wire', 'cartographer'];
  if (pageAgents.includes(targetAgent) && Object.keys(decisions.pages).length > 0) {
    sections.push(formatPageDecisions(decisions.pages));
  }

  return sections.join('\n\n');
}

/**
 * Format design decisions
 */
function formatDesignDecisions(design: Partial<DesignDecisions>): string {
  const lines: string[] = [
    '## DESIGN CONSTRAINTS (from PALETTE/BLOCKS)',
    '',
  ];

  if (design.colorPalette) {
    lines.push('### Colors:');
    lines.push(`- Primary: ${design.colorPalette.primary}`);
    lines.push(`- Secondary: ${design.colorPalette.secondary}`);
    lines.push(`- Accent: ${design.colorPalette.accent}`);
    lines.push(`- Background: ${design.colorPalette.background}`);
    lines.push(`- Foreground: ${design.colorPalette.foreground}`);
    lines.push(`- Destructive: ${design.colorPalette.destructive}`);
    lines.push('');
  }

  if (design.typography) {
    lines.push('### Typography:');
    lines.push(`- Font: ${design.typography.fontFamily}`);
    if (design.typography.headingFont) {
      lines.push(`- Heading Font: ${design.typography.headingFont}`);
    }
    lines.push(`- Scale: ${design.typography.scale}`);
    lines.push('');
  }

  if (design.borderRadius) {
    lines.push(`### Border Radius: ${design.borderRadius}`);
  }

  if (design.darkMode !== undefined) {
    lines.push(`### Dark Mode: ${design.darkMode ? 'ENABLED' : 'DISABLED'}`);
  }

  if (design.animations) {
    lines.push(`### Animations: ${design.animations}`);
  }

  return lines.join('\n');
}

/**
 * Format data decisions
 */
function formatDataDecisions(data: Partial<DataDecisions>): string {
  const lines: string[] = [
    '## DATA MODEL CONSTRAINTS (from DATUM)',
    '',
  ];

  if (data.entities?.length) {
    lines.push('### Entities:');
    data.entities.forEach((e) => lines.push(`- ${e}`));
    lines.push('');
  }

  if (data.relationships?.length) {
    lines.push('### Relationships:');
    data.relationships.forEach((r) => {
      lines.push(`- ${r.from} → ${r.to} (${r.type}${r.cascadeDelete ? ', CASCADE DELETE' : ''})`);
    });
    lines.push('');
  }

  if (data.enums?.length) {
    lines.push('### Enums:');
    data.enums.forEach((e) => {
      lines.push(`- ${e.name}: ${e.values.join(' | ')}`);
    });
    lines.push('');
  }

  if (data.softDeleteEntities?.length) {
    lines.push(`### Soft Delete Entities: ${data.softDeleteEntities.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format API decisions
 */
function formatApiDecisions(api: Partial<ApiDecisions>): string {
  const lines: string[] = [
    '## API CONSTRAINTS (from NEXUS)',
    '',
  ];

  if (api.endpoints?.length) {
    lines.push('### Defined Endpoints:');
    api.endpoints.slice(0, 20).forEach((e) => {
      const auth = e.requiresAuth ? '🔒' : '🌐';
      lines.push(`- ${auth} ${e.method} ${e.path}`);
    });
    if (api.endpoints.length > 20) {
      lines.push(`  ... and ${api.endpoints.length - 20} more`);
    }
    lines.push('');
  }

  if (api.publicEndpoints?.length) {
    lines.push('### Public Endpoints (no auth):');
    api.publicEndpoints.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
  }

  if (api.adminEndpoints?.length) {
    lines.push('### Admin-Only Endpoints:');
    api.adminEndpoints.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format security decisions
 */
function formatSecurityDecisions(security: Partial<SecurityDecisions>): string {
  const lines: string[] = [
    '## SECURITY CONSTRAINTS (from SENTINEL)',
    '',
  ];

  if (security.authMethod) {
    lines.push(`### Auth Provider: ${security.authMethod}`);
  }

  if (security.mfaRequired) {
    lines.push(`### MFA Required for: ${security.mfaRoles?.join(', ') || 'all'}`);
  }

  if (security.session) {
    lines.push('### Session:');
    lines.push(`- Duration: ${security.session.duration}s`);
    lines.push(`- Refresh: ${security.session.refreshEnabled ? 'ENABLED' : 'DISABLED'}`);
    lines.push(`- Max Concurrent: ${security.session.maxConcurrent}`);
    lines.push('');
  }

  if (security.rateLimits?.length) {
    lines.push('### Rate Limits:');
    security.rateLimits.forEach((r) => {
      lines.push(`- ${r.endpoint}: ${r.limit}/${r.window}s`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format page decisions
 */
function formatPageDecisions(pages: Partial<PageDecisions>): string {
  const lines: string[] = [
    '## PAGE STRUCTURE (from CARTOGRAPHER)',
    '',
  ];

  if (pages.pages?.length) {
    lines.push('### Pages:');
    pages.pages.forEach((p) => {
      const auth = p.requiresAuth ? '🔒' : '🌐';
      lines.push(`- ${auth} ${p.path} → ${p.name} (${p.layout} layout)`);
    });
    lines.push('');
  }

  if (pages.navigation) {
    lines.push('### Navigation:');
    if (pages.navigation.main?.length) {
      lines.push(`- Main: ${pages.navigation.main.join(', ')}`);
    }
    if (pages.navigation.footer?.length) {
      lines.push(`- Footer: ${pages.navigation.footer.join(', ')}`);
    }
    if (pages.navigation.sidebar?.length) {
      lines.push(`- Sidebar: ${pages.navigation.sidebar.join(', ')}`);
    }
    lines.push('');
  }

  if (pages.layouts?.length) {
    lines.push(`### Layouts: ${pages.layouts.join(', ')}`);
  }

  return lines.join('\n');
}

// Types are already exported at definition - no need for re-export

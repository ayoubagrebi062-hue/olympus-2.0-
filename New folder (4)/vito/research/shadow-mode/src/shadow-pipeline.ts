/**
 * Shadow Mode Pipeline Runner
 *
 * Executes the provisional intent-admissibility-frontier pipeline
 * in parallel with the canonical pipeline for observational comparison.
 *
 * Authority: OBSERVATIONAL_ONLY (except enforcing layers)
 * Position: PRE-SEMANTIC
 * Blocking: HCA-1, PIL-1 ENABLED (promoted 2026-01-19)
 *
 * Pipeline Stages:
 *   PROVENANCE_PARSER → IAL-0 → HIA-1 → HCA-1 → PIL-1 → HIC-1 → VERDICT
 *
 * Active Layers:
 *   - HCA-1: ENFORCING (blocking=true, promoted 2026-01-19)
 *   - PIL-1: ENFORCING (blocking=true, promoted 2026-01-19)
 *
 * Topology: FROZEN (order-invariant-required)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// HCA-1 Integration (Position: AFTER_HIA-1)
import {
  executeHCA1Stage,
  HCA1_CONFIG,
} from './hca1-shadow-layer';

// PIL-1 Integration (Position: AFTER_HCA-1, BEFORE_HIC-1)
import {
  executePIL1Stage,
  PIL1_CONFIG,
} from './pil1-shadow-layer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Verdict = 'ADMIT' | 'REJECT';
type DivergenceType = 'SHADOW_MORE_STRICT' | 'SHADOW_MORE_PERMISSIVE' | 'SAME_VERDICT_DIFFERENT_REASON' | null;

interface Intent {
  id: string;
  action: string;
  target: string;
  requirements?: string[];
  trigger?: {
    type: string;
    source?: string;
  };
}

interface IntentProvenance {
  declared: string[];
  derived: string[];
  confidence: number;
  sourceMapping?: Array<{
    intent: string;
    sourceText: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  semanticTags?: string[];
}

interface ShadowPipelineInput {
  requestId: string;
  timestamp: Date;
  request: {
    intents: Intent[];
    context?: Record<string, unknown>;
    rawInput?: string;
  };
  canonicalVerdict: Verdict;
  canonicalReason?: string;
}

interface ComponentResult {
  component: string;
  passed: boolean;
  rejectionCodes: string[];
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface ShadowPipelineOutput {
  requestId: string;
  timestamp: string;
  provisionalVerdict: Verdict;
  divergenceReason: string | null;
  divergenceType: DivergenceType;
  intentProvenance: IntentProvenance;
  rejectionTaxonomy: string[];
  componentResults: ComponentResult[];
  processingTimeMs: number;
  isDivergent: boolean;
  canonicalVerdict: Verdict;
}

interface DivergenceEntry extends ShadowPipelineOutput {
  latencyMs: {
    canonical: number;
    shadow: number;
  };
  requestHash: string;
}

interface MetricsSnapshot {
  timestamp: string;
  volume: {
    totalRequests: number;
    divergentRequests: number;
  };
  verdicts: {
    canonical: { admitted: number; rejected: number };
    provisional: { admitted: number; rejected: number };
  };
  divergence: {
    byType: {
      shadowMoreStrict: number;
      shadowMorePermissive: number;
      sameVerdictDifferentReason: number;
    };
    byRejectionCode: Record<string, number>;
  };
  successCriteria: {
    falsePositives: number;
    falseNegatives: number;
    determinismViolations: number;
  };
}

// ============================================================================
// SHADOW PIPELINE CONFIGURATION
// ============================================================================

const SHADOW_CONFIG = {
  mode: 'PROVISIONAL' as const,
  position: 'PRE-SEMANTIC' as const,
  authority: 'OBSERVATIONAL_ONLY' as const,
  blocking: false, // Default for most layers
  timeoutMs: 5000,
  logDir: path.join(__dirname, '..', 'logs'),
  layerOverrides: {
    'HCA-1': {
      mode: 'ENFORCING' as const,
      blocking: true, // Promoted 2026-01-19 via SSC-2 validation
      attribution: 'REQUIRED' as const,
    },
    'PIL-1': {
      mode: 'ENFORCING' as const,
      blocking: true, // Promoted 2026-01-19 via SSC-3 validation
      attribution: 'REQUIRED' as const,
      position: 'AFTER_HCA-1',
      enabledAt: '2026-01-19T08:45:43.940Z',
      promotedAt: '2026-01-19T09:15:00.000Z',
    },
  },
};

// ============================================================================
// PIPELINE COMPONENT STUBS
// These would import from the actual research track implementations
// ============================================================================

// Stub: Provenance Parser (from semantic-intent-fidelity)
function parseIntentProvenance(request: ShadowPipelineInput['request']): IntentProvenance {
  const declared = request.intents.map(i => `${i.action}:${i.target}`);
  const derived: string[] = [];
  const semanticTags: string[] = [];

  // Extract semantic tags from requirements
  for (const intent of request.intents) {
    if (intent.requirements) {
      for (const req of intent.requirements) {
        const tags = extractSemanticTags(req);
        semanticTags.push(...tags);
      }
    }
  }

  return {
    declared,
    derived,
    confidence: 1.0,
    semanticTags: [...new Set(semanticTags)],
  };
}

// Stub: IAL-0 Authenticator (from intent-authentication-layer)
function authenticateIntent(provenance: IntentProvenance): ComponentResult {
  const startTime = Date.now();
  const rejectionCodes: string[] = [];

  // IAL-0 basic checks would go here
  // For now, always pass (actual implementation in ial0-authenticator.ts)

  return {
    component: 'IAL-0',
    passed: rejectionCodes.length === 0,
    rejectionCodes,
    latencyMs: Date.now() - startTime,
  };
}

// Stub: HIA-1 Hostility Detection (from hostile-intent-axioms)
function detectSemanticHostility(
  provenance: IntentProvenance,
  intents: Intent[]
): ComponentResult {
  const startTime = Date.now();
  const rejectionCodes: string[] = [];

  // HIA-1 axiom checks would go here
  // For now, check semantic tags for known hostile patterns
  const tags = provenance.semanticTags || [];

  // Example: Check for HIA-001 (Privilege Escalation Abuse)
  if (tags.includes('PRIVILEGE_ESCALATION') && tags.includes('UNAUTHORIZED_ACCESS')) {
    rejectionCodes.push('HIA-001');
  }

  return {
    component: 'HIA-1',
    passed: rejectionCodes.length === 0,
    rejectionCodes,
    latencyMs: Date.now() - startTime,
  };
}

// Stub: HIC-1 Composition Check (from hostile-intent-composition)
function checkCompositionHostility(
  provenance: IntentProvenance,
  intents: Intent[]
): ComponentResult {
  const startTime = Date.now();
  const rejectionCodes: string[] = [];

  // HIC-1 composition checks would go here
  const tags = provenance.semanticTags || [];

  // HIC-001: Blind Spot Attack
  if (tags.includes('REDUCES_OBSERVABILITY') &&
      (tags.includes('ACCESSES_SENSITIVE') || tags.includes('MODIFIES_SENSITIVE'))) {
    rejectionCodes.push('HIC-001');
  }

  // HIC-002: Privilege Escalation Chain
  if (tags.includes('USER_TRIGGERED') && tags.includes('SETS_PRIVILEGE_STATE') &&
      tags.includes('CONDITIONAL_BEHAVIOR') && tags.includes('PRIVILEGE_DEPENDENT')) {
    rejectionCodes.push('HIC-002');
  }

  // HIC-003: Credential Exfiltration Risk
  if (tags.includes('STORES_CREDENTIAL') &&
      (tags.includes('EXPORTS_DATA') || tags.includes('TRANSMITS_DATA'))) {
    rejectionCodes.push('HIC-003');
  }

  return {
    component: 'HIC-1',
    passed: rejectionCodes.length === 0,
    rejectionCodes,
    latencyMs: Date.now() - startTime,
  };
}

// ============================================================================
// SEMANTIC TAG EXTRACTION
// ============================================================================

const SEMANTIC_TAG_PATTERNS: Record<string, RegExp[]> = {
  REDUCES_OBSERVABILITY: [
    /\b(reduce|decrease|lower|minimize|limit)\s+(the\s+)?(log|logging|trace|tracing|monitoring|audit)/i,
    /\b(turn off|disable)\s+(verbose|debug|detailed)/i,
    /\bminimize\s+audit/i,
  ],
  ACCESSES_SENSITIVE: [
    /\b(access|read|retrieve|fetch|get|export|view)\s+(all\s+)?(customer|user|client|patient|employee|financial|payment|credit|salary)/i,
    /\bsensitive\s+(data|records|information)/i,
  ],
  MODIFIES_SENSITIVE: [
    /\b(modify|update|change|edit|alter)\s+(user\s+)?(permission|role|privilege|access)/i,
    /\b(delete|remove)\s+(all\s+)?(record|data|user)/i,
  ],
  STORES_CREDENTIAL: [
    /\b(store|save|cache|persist)\s+(the\s+)?(password|credential|token|secret|api.?key)/i,
  ],
  EXPORTS_DATA: [
    /\b(export|download|backup|dump)\s+(all\s+)?(data|storage|database|records)/i,
  ],
  TRANSMITS_DATA: [
    /\b(send|transmit|post|upload)\s+(to\s+)?(external|third.?party|analytics|remote)/i,
  ],
  PRIVILEGE_ESCALATION: [
    /\b(escalate|elevate|grant\s+admin|become\s+admin|gain\s+root)/i,
    /\b(bypass|skip|ignore)\s+(auth|permission|access\s+check)/i,
  ],
  USER_TRIGGERED: [
    /\bwhen\s+(user|button|click|toggle|checkbox)/i,
    /\bon\s+(click|toggle|change|submit)/i,
  ],
  SETS_PRIVILEGE_STATE: [
    /\bset\s+(the\s+)?(state\s+)?(variable\s+)?(is.?admin|is.?super|debug.?mode|admin.?mode)/i,
  ],
  CONDITIONAL_BEHAVIOR: [
    /\bif\s+(is.?admin|is.?super|debug.?mode|has.?permission)/i,
    /\bwhen\s+(is.?admin|is.?super)/i,
  ],
  PRIVILEGE_DEPENDENT: [
    /\bshow\s+(admin|unfiltered|all|restricted)/i,
    /\baccess\s+(admin|protected|restricted)/i,
  ],
};

function extractSemanticTags(text: string): string[] {
  const tags: string[] = [];
  for (const [tag, patterns] of Object.entries(SEMANTIC_TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        tags.push(tag);
        break;
      }
    }
  }
  return tags;
}

// ============================================================================
// SHADOW PIPELINE EXECUTOR
// ============================================================================

export async function executeShadowPipeline(
  input: ShadowPipelineInput
): Promise<ShadowPipelineOutput> {
  const startTime = Date.now();
  const componentResults: ComponentResult[] = [];
  let rejectionTaxonomy: string[] = [];

  // Stage 1: Provenance Parsing
  const provenance = parseIntentProvenance(input.request);

  // Stage 2: IAL-0 Authentication
  const ial0Result = authenticateIntent(provenance);
  componentResults.push(ial0Result);
  if (!ial0Result.passed) {
    rejectionTaxonomy.push(...ial0Result.rejectionCodes);
  }

  // Stage 3: HIA-1 Hostility Detection (only if IAL-0 passed)
  if (ial0Result.passed) {
    const hia1Result = detectSemanticHostility(provenance, input.request.intents);
    componentResults.push(hia1Result);
    if (!hia1Result.passed) {
      rejectionTaxonomy.push(...hia1Result.rejectionCodes);
    }

    // Stage 3.5: HCA-1 Capability Analysis (AFTER HIA-1, BEFORE HIC-1)
    // Position: AFTER_HIA-1 | Mode: ENFORCING | Blocking: ENABLED | Attribution: REQUIRED
    if (hia1Result.passed) {
      // Build intent text for capability analysis
      const intentText = input.request.intents
        .map(i => `${i.action} ${i.target} ${(i.requirements || []).join(' ')}`)
        .join(' ');

      const hca1Result = executeHCA1Stage(intentText, provenance);
      componentResults.push({
        component: 'HCA-1',
        passed: hca1Result.passed,
        rejectionCodes: hca1Result.rejectionCodes,
        latencyMs: hca1Result.durationMs,
        details: {
          layerId: HCA1_CONFIG.layerId,
          position: HCA1_CONFIG.position,
          mode: HCA1_CONFIG.mode,
          attribution: HCA1_CONFIG.attribution,
          rulePrefix: HCA1_CONFIG.rulePrefix,
          capabilities: hca1Result.stateSnapshot?.detectedCapabilities,
        },
      });
      if (!hca1Result.passed) {
        rejectionTaxonomy.push(...hca1Result.rejectionCodes);
      }

      // Stage 3.6: PIL-1 Power Invariant Check (AFTER HCA-1, BEFORE HIC-1)
      // Position: AFTER_HCA-1 | Mode: SHADOW_ENFORCING | Blocking: DISABLED | Attribution: REQUIRED
      const pil1Result = executePIL1Stage(
        hca1Result.stateSnapshot?.detectedCapabilities || [],
        {
          actorId: 'actor_request',
          actorScope: input.request.context?.scope as string,
        }
      );
      componentResults.push({
        component: 'PIL-1',
        passed: pil1Result.passed,
        rejectionCodes: pil1Result.rejectionCodes,
        latencyMs: pil1Result.durationMs,
        details: {
          layerId: PIL1_CONFIG.layerId,
          position: PIL1_CONFIG.position,
          mode: PIL1_CONFIG.mode,
          blocking: PIL1_CONFIG.blocking,
          attribution: PIL1_CONFIG.attribution,
          replayHash: pil1Result.replayHash,
          violations: pil1Result.violations,
          stateSnapshot: pil1Result.stateSnapshot,
        },
      });
      // PIL-1 is ENFORCING (blocking=true), add violations to rejection taxonomy
      if (!pil1Result.passed) {
        rejectionTaxonomy.push(...pil1Result.rejectionCodes);
      }

      // Stage 4: HIC-1 Composition Check (only if HCA-1 passed)
      if (hca1Result.passed) {
        const hic1Result = checkCompositionHostility(provenance, input.request.intents);
        componentResults.push(hic1Result);
        if (!hic1Result.passed) {
          rejectionTaxonomy.push(...hic1Result.rejectionCodes);
        }
      }
    }
  }

  // Determine verdict
  const provisionalVerdict: Verdict = rejectionTaxonomy.length > 0 ? 'REJECT' : 'ADMIT';
  const isDivergent = provisionalVerdict !== input.canonicalVerdict;

  // Determine divergence type and reason
  let divergenceType: DivergenceType = null;
  let divergenceReason: string | null = null;

  if (isDivergent) {
    if (provisionalVerdict === 'REJECT' && input.canonicalVerdict === 'ADMIT') {
      divergenceType = 'SHADOW_MORE_STRICT';
      divergenceReason = `Shadow rejected with codes [${rejectionTaxonomy.join(', ')}] but canonical admitted`;
    } else if (provisionalVerdict === 'ADMIT' && input.canonicalVerdict === 'REJECT') {
      divergenceType = 'SHADOW_MORE_PERMISSIVE';
      divergenceReason = `Shadow admitted but canonical rejected`;
    }
  }

  return {
    requestId: input.requestId,
    timestamp: input.timestamp.toISOString(),
    provisionalVerdict,
    divergenceReason,
    divergenceType,
    intentProvenance: provenance,
    rejectionTaxonomy,
    componentResults,
    processingTimeMs: Date.now() - startTime,
    isDivergent,
    canonicalVerdict: input.canonicalVerdict,
  };
}

// ============================================================================
// DIVERGENCE LOGGER
// ============================================================================

class DivergenceLogger {
  private logFile: string;
  private entries: DivergenceEntry[] = [];

  constructor() {
    // Ensure log directory exists
    if (!fs.existsSync(SHADOW_CONFIG.logDir)) {
      fs.mkdirSync(SHADOW_CONFIG.logDir, { recursive: true });
    }
    this.logFile = path.join(SHADOW_CONFIG.logDir, 'shadow-diff.json');
    this.loadExisting();
  }

  private loadExisting(): void {
    if (fs.existsSync(this.logFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.logFile, 'utf-8'));
        this.entries = data.entries || [];
      } catch {
        this.entries = [];
      }
    }
  }

  log(output: ShadowPipelineOutput, canonicalLatencyMs: number): void {
    const entry: DivergenceEntry = {
      ...output,
      latencyMs: {
        canonical: canonicalLatencyMs,
        shadow: output.processingTimeMs,
      },
      requestHash: crypto
        .createHash('sha256')
        .update(JSON.stringify(output.intentProvenance))
        .digest('hex'),
    };

    this.entries.push(entry);
    this.persist();
  }

  private persist(): void {
    const logData = {
      version: '1.0.0',
      mode: SHADOW_CONFIG.mode,
      target: 'intent-admissibility-frontier',
      startTimestamp: this.entries[0]?.timestamp || new Date().toISOString(),
      entries: this.entries,
      summary: this.computeSummary(),
    };

    fs.writeFileSync(this.logFile, JSON.stringify(logData, null, 2));
  }

  private computeSummary() {
    const divergent = this.entries.filter(e => e.isDivergent);
    return {
      totalEntries: this.entries.length,
      divergentCount: divergent.length,
      divergenceRate: this.entries.length > 0
        ? divergent.length / this.entries.length
        : 0,
      byType: {
        shadowMoreStrict: divergent.filter(e => e.divergenceType === 'SHADOW_MORE_STRICT').length,
        shadowMorePermissive: divergent.filter(e => e.divergenceType === 'SHADOW_MORE_PERMISSIVE').length,
        sameVerdictDifferentReason: divergent.filter(e => e.divergenceType === 'SAME_VERDICT_DIFFERENT_REASON').length,
      },
      byRejectionCode: this.countByRejectionCode(divergent),
    };
  }

  private countByRejectionCode(entries: DivergenceEntry[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      for (const code of entry.rejectionTaxonomy) {
        counts[code] = (counts[code] || 0) + 1;
      }
    }
    return counts;
  }

  getEntries(): DivergenceEntry[] {
    return this.entries;
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  private metricsFile: string;
  private startTimestamp: Date;
  private metrics: MetricsSnapshot;

  constructor() {
    this.metricsFile = path.join(SHADOW_CONFIG.logDir, 'shadow-metrics.json');
    this.startTimestamp = new Date();
    this.metrics = this.initializeMetrics();
    this.loadExisting();
  }

  private initializeMetrics(): MetricsSnapshot {
    return {
      timestamp: new Date().toISOString(),
      volume: { totalRequests: 0, divergentRequests: 0 },
      verdicts: {
        canonical: { admitted: 0, rejected: 0 },
        provisional: { admitted: 0, rejected: 0 },
      },
      divergence: {
        byType: {
          shadowMoreStrict: 0,
          shadowMorePermissive: 0,
          sameVerdictDifferentReason: 0,
        },
        byRejectionCode: {},
      },
      successCriteria: {
        falsePositives: 0,
        falseNegatives: 0,
        determinismViolations: 0,
      },
    };
  }

  private loadExisting(): void {
    if (fs.existsSync(this.metricsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8'));
        if (data.metrics) {
          this.metrics = data.metrics;
        }
      } catch {
        // Use fresh metrics
      }
    }
  }

  record(output: ShadowPipelineOutput): void {
    this.metrics.volume.totalRequests++;

    // Record canonical verdict
    if (output.canonicalVerdict === 'ADMIT') {
      this.metrics.verdicts.canonical.admitted++;
    } else {
      this.metrics.verdicts.canonical.rejected++;
    }

    // Record provisional verdict
    if (output.provisionalVerdict === 'ADMIT') {
      this.metrics.verdicts.provisional.admitted++;
    } else {
      this.metrics.verdicts.provisional.rejected++;
    }

    // Record divergence
    if (output.isDivergent) {
      this.metrics.volume.divergentRequests++;

      if (output.divergenceType === 'SHADOW_MORE_STRICT') {
        this.metrics.divergence.byType.shadowMoreStrict++;
        // Shadow rejected canonical-admitted = potential false positive
        // (unless canonical was wrong, which we'll verify in review)
      } else if (output.divergenceType === 'SHADOW_MORE_PERMISSIVE') {
        this.metrics.divergence.byType.shadowMorePermissive++;
        // Shadow admitted canonical-rejected = potential false negative
      }

      for (const code of output.rejectionTaxonomy) {
        this.metrics.divergence.byRejectionCode[code] =
          (this.metrics.divergence.byRejectionCode[code] || 0) + 1;
      }
    }

    this.metrics.timestamp = new Date().toISOString();
    this.persist();
  }

  private persist(): void {
    const fullMetrics = {
      version: '1.0.0',
      mode: SHADOW_CONFIG.mode,
      target: 'intent-admissibility-frontier',
      window: {
        startTimestamp: this.startTimestamp.toISOString(),
        endTimestamp: new Date().toISOString(),
        durationHours: (Date.now() - this.startTimestamp.getTime()) / (1000 * 60 * 60),
        isRolling: true,
      },
      metrics: this.metrics,
      successCriteria: {
        zeroFalsePositives: {
          status: this.metrics.successCriteria.falsePositives === 0 ? 'PASSING' : 'FAILING',
          currentValue: this.metrics.successCriteria.falsePositives,
          threshold: 0,
        },
        zeroHostileMisses: {
          status: this.metrics.successCriteria.falseNegatives === 0 ? 'PASSING' : 'FAILING',
          currentValue: this.metrics.successCriteria.falseNegatives,
          threshold: 0,
        },
        determinismMaintained: {
          status: this.metrics.successCriteria.determinismViolations === 0 ? 'PASSING' : 'FAILING',
          currentValue: this.metrics.successCriteria.determinismViolations === 0 ? 1.0 : 0.99,
          threshold: 1.0,
        },
      },
      reviewGate: {
        trialsProcessed: this.metrics.volume.totalRequests,
        trialsRequired: 1000,
        timeElapsedHours: (Date.now() - this.startTimestamp.getTime()) / (1000 * 60 * 60),
        timeRequiredHours: 168, // 7 days
        gateTriggered: this.metrics.volume.totalRequests >= 1000 ||
          (Date.now() - this.startTimestamp.getTime()) >= 168 * 60 * 60 * 1000,
        triggerReason: null,
      },
    };

    fs.writeFileSync(this.metricsFile, JSON.stringify(fullMetrics, null, 2));
  }

  getMetrics(): MetricsSnapshot {
    return this.metrics;
  }
}

// ============================================================================
// SHADOW MODE RUNNER
// ============================================================================

const divergenceLogger = new DivergenceLogger();
const metricsCollector = new MetricsCollector();

/**
 * Main entry point for shadow mode execution.
 * Called from the canonical pipeline in non-blocking mode.
 */
export async function runShadowMode(
  input: ShadowPipelineInput,
  canonicalLatencyMs: number
): Promise<void> {
  // Execute shadow pipeline (non-blocking, fire-and-forget)
  try {
    const output = await Promise.race([
      executeShadowPipeline(input),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Shadow timeout')), SHADOW_CONFIG.timeoutMs)
      ),
    ]);

    // Log results
    divergenceLogger.log(output, canonicalLatencyMs);
    metricsCollector.record(output);

  } catch (error) {
    // Shadow mode failures are silent - they must not affect canonical pipeline
    console.error('[SHADOW-MODE] Error:', error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SHADOW_CONFIG,
  DivergenceLogger,
  MetricsCollector,
  extractSemanticTags,
};

export type {
  ShadowPipelineInput,
  ShadowPipelineOutput,
  IntentProvenance,
  Intent,
  Verdict,
  DivergenceEntry,
  MetricsSnapshot,
};

/**
 * OLYMPUS 2.0 - External Reality Anchors (ERA)
 *
 * Allows intents to be verified against the external world,
 * not just code structure.
 *
 * This layer connects intent to reality.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  RealityPolicy,
  RealityPolicyRegistry,
  SampleResult,
  QuorumResult,
  GovernanceFailure,
  GovernanceReport,
  aggregateQuorum,
  detectGovernanceFailures,
  generateGovernanceReport,
  hashPayload,
  logQuorumResult,
  logGovernanceReport,
} from './reality-policy';

// ============================================
// ANCHOR TYPES
// ============================================

export type AnchorType = 'http' | 'db' | 'memory' | 'simulation';

/**
 * HTTP anchor - verify against HTTP endpoint
 */
export interface HttpAnchorQuery {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;  // ms, default 5000
}

/**
 * Database anchor - verify against database state
 */
export interface DbAnchorQuery {
  driver: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  connectionString?: string;  // Use env var if not provided
  query: string;
  params?: any[];
}

/**
 * Memory anchor - verify in-memory state (for testing)
 */
export interface MemoryAnchorQuery {
  selector: string;  // JSON path or object key
  source: 'localStorage' | 'sessionStorage' | 'window' | 'document';
}

/**
 * Simulation anchor - verify against simulated behavior
 */
export interface SimulationAnchorQuery {
  scenario: string;
  steps: Array<{
    action: string;
    target: string;
    value?: any;
  }>;
  assertAfter: string;  // Selector to check after simulation
}

/**
 * Union of all query types
 */
export type AnchorQuery = HttpAnchorQuery | DbAnchorQuery | MemoryAnchorQuery | SimulationAnchorQuery;

/**
 * Predicate for matching expected values
 */
export interface AnchorPredicate {
  type: 'equals' | 'contains' | 'matches' | 'exists' | 'greaterThan' | 'lessThan' | 'custom';
  value?: any;
  path?: string;  // JSON path to extract from response
  customFn?: string;  // Serialized function for custom matching
}

/**
 * Reality Anchor Definition
 */
export interface RealityAnchor {
  id: string;
  intentId: string;
  name: string;
  description: string;

  // Anchor specification
  type: AnchorType;
  query: AnchorQuery;
  expected: AnchorPredicate;

  // Criticality
  critical: boolean;  // If true, failure = intent fails outcome

  // Execution constraints
  timeout: number;     // ms, default 5000
  retries: number;     // default 0 (no retries for determinism)
  delayBetweenRetries: number;  // ms

  // Metadata
  createdAt: Date;
  lastExecutedAt?: Date;
  lastResult?: AnchorExecutionResult;
}

/**
 * Result of executing a single anchor
 */
export interface AnchorExecutionResult {
  anchorId: string;
  intentId: string;
  anchorType: AnchorType;

  // Execution details
  executedAt: Date;
  durationMs: number;

  // Results
  actual: any;
  expected: AnchorPredicate;
  match: boolean;

  // Error handling
  error: string | null;
  errorType: 'timeout' | 'connection' | 'parse' | 'predicate' | null;

  // Status
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'TIMEOUT' | 'SKIPPED';
  critical: boolean;

  // RGL: Governance data (populated when using governed execution)
  governance?: {
    trustScore: number;
    successRate: number;
    samplesExecuted: number;
    variance: number;
    finalVerdict: boolean;
    verdictReason: string;
  };
}

/**
 * Summary of all anchor executions for a build
 */
export interface ExternalValidationReport {
  buildId: string;
  executedAt: Date;
  totalDurationMs: number;

  // Counts
  anchorsExecuted: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;

  // Critical failures
  criticalFailures: number;
  hasCriticalFailure: boolean;

  // Details
  details: AnchorExecutionResult[];

  // Summary by intent (now includes trust-adjusted scores)
  intentSummary: Record<string, {
    intentId: string;
    anchorsTotal: number;
    anchorsPassed: number;
    externalOutcomeScore: number;       // 0.0 - 1.0
    trustAdjustedScore: number;         // externalOutcomeScore * avgTrustScore
    averageTrustScore: number;          // Average trust across anchors
  }>;

  // RGL: Governance summary
  governance?: {
    anchorsGoverned: number;
    anchorsPassed: number;
    anchorsFailed: number;
    averageTrustScore: number;
    lowestTrustScore: number;
    governancePass: boolean;
    governanceBlocker: string | null;
    failures: Array<{
      type: string;
      anchorId: string;
      intentId: string;
      message: string;
      critical: boolean;
    }>;
  };
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_TIMEOUT = 5000;  // 5 seconds
const DEFAULT_RETRIES = 0;     // No retries for determinism
const MAX_TIMEOUT = 30000;     // 30 seconds max

// ============================================
// ANCHOR REGISTRY
// ============================================

const ANCHOR_FILE = 'reality-anchors.json';

interface PersistedAnchors {
  version: number;
  lastUpdated: Date;
  anchors: Record<string, RealityAnchor>;
}

/**
 * Manages reality anchors for intents
 */
export class RealityAnchorRegistry {
  private basePath: string;
  private anchors: Map<string, RealityAnchor> = new Map();

  constructor(buildDir: string) {
    this.basePath = path.join(buildDir, '.olympus');
    fs.mkdirSync(this.basePath, { recursive: true });
    this.load();
  }

  /**
   * Load persisted anchors
   */
  private load(): void {
    const filePath = path.join(this.basePath, ANCHOR_FILE);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: PersistedAnchors = JSON.parse(content);
        for (const [id, anchor] of Object.entries(data.anchors)) {
          this.anchors.set(id, anchor);
        }
      } catch (err) {
        console.error('[ERA] Failed to load anchors:', err);
      }
    }
  }

  /**
   * Save anchors to disk
   */
  save(): void {
    const data: PersistedAnchors = {
      version: 1,
      lastUpdated: new Date(),
      anchors: Object.fromEntries(this.anchors),
    };

    const filePath = path.join(this.basePath, ANCHOR_FILE);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Register a new anchor for an intent
   */
  registerAnchor(
    intentId: string,
    name: string,
    type: AnchorType,
    query: AnchorQuery,
    expected: AnchorPredicate,
    options: {
      critical?: boolean;
      description?: string;
      timeout?: number;
      retries?: number;
    } = {}
  ): RealityAnchor {
    const id = `anchor-${intentId}-${name.replace(/\s+/g, '-').toLowerCase()}`;

    const anchor: RealityAnchor = {
      id,
      intentId,
      name,
      description: options.description || `Reality anchor: ${name}`,
      type,
      query,
      expected,
      critical: options.critical ?? false,
      timeout: Math.min(options.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT),
      retries: options.retries ?? DEFAULT_RETRIES,
      delayBetweenRetries: 1000,
      createdAt: new Date(),
    };

    this.anchors.set(id, anchor);
    this.save();

    console.log(`[ERA] Registered anchor: ${id} (${type}, critical: ${anchor.critical})`);
    return anchor;
  }

  /**
   * Get all anchors for an intent
   */
  getAnchorsForIntent(intentId: string): RealityAnchor[] {
    return Array.from(this.anchors.values()).filter(a => a.intentId === intentId);
  }

  /**
   * Get all registered anchors
   */
  getAllAnchors(): RealityAnchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Get anchor by ID
   */
  getAnchor(anchorId: string): RealityAnchor | null {
    return this.anchors.get(anchorId) || null;
  }

  /**
   * Update anchor with execution result
   */
  updateResult(anchorId: string, result: AnchorExecutionResult): void {
    const anchor = this.anchors.get(anchorId);
    if (anchor) {
      anchor.lastExecutedAt = result.executedAt;
      anchor.lastResult = result;
      this.save();
    }
  }

  /**
   * Remove anchor
   */
  removeAnchor(anchorId: string): void {
    this.anchors.delete(anchorId);
    this.save();
  }
}

// ============================================
// ANCHOR EXECUTION ENGINE
// ============================================

/**
 * Execute a single anchor with timeout
 */
async function executeAnchorWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<{ result: T | null; timedOut: boolean; error: Error | null }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ result: null, timedOut: true, error: null });
    }, timeoutMs);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve({ result, timedOut: false, error: null });
      })
      .catch(error => {
        clearTimeout(timer);
        resolve({ result: null, timedOut: false, error });
      });
  });
}

/**
 * Execute HTTP anchor
 */
async function executeHttpAnchor(query: HttpAnchorQuery): Promise<any> {
  const controller = new AbortController();
  const timeout = query.timeout || DEFAULT_TIMEOUT;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(query.url, {
      method: query.method,
      headers: query.headers,
      body: query.body ? JSON.stringify(query.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Try to parse as JSON, fall back to text
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return {
        status: response.status,
        ok: response.ok,
        data: await response.json(),
      };
    }

    return {
      status: response.status,
      ok: response.ok,
      data: await response.text(),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Execute DB anchor (stub - would need actual DB drivers)
 */
async function executeDbAnchor(query: DbAnchorQuery): Promise<any> {
  // In production, this would use actual database drivers
  // For now, we return a structured error indicating DB anchors need configuration
  console.log(`[ERA] DB anchor execution for ${query.driver}: ${query.query}`);

  return {
    error: 'DB_NOT_CONFIGURED',
    message: `Database anchor for ${query.driver} requires driver configuration`,
    query: query.query,
  };
}

/**
 * Execute memory anchor (stub - would need browser context)
 */
async function executeMemoryAnchor(query: MemoryAnchorQuery): Promise<any> {
  // Memory anchors need browser context (e.g., Playwright, Puppeteer)
  console.log(`[ERA] Memory anchor execution for ${query.source}: ${query.selector}`);

  return {
    error: 'MEMORY_NOT_AVAILABLE',
    message: 'Memory anchors require browser context for execution',
    selector: query.selector,
    source: query.source,
  };
}

/**
 * Execute simulation anchor (stub - would need test runner)
 */
async function executeSimulationAnchor(query: SimulationAnchorQuery): Promise<any> {
  // Simulation anchors need a test runner (e.g., Playwright, Cypress)
  console.log(`[ERA] Simulation anchor for scenario: ${query.scenario}`);

  return {
    error: 'SIMULATION_NOT_AVAILABLE',
    message: 'Simulation anchors require test runner integration',
    scenario: query.scenario,
    steps: query.steps.length,
  };
}

/**
 * Match actual value against expected predicate
 */
function matchPredicate(actual: any, predicate: AnchorPredicate): boolean {
  // Extract value at path if specified
  let value = actual;
  if (predicate.path) {
    const parts = predicate.path.split('.');
    for (const part of parts) {
      if (value === null || value === undefined) return false;
      value = value[part];
    }
  }

  switch (predicate.type) {
    case 'equals':
      return JSON.stringify(value) === JSON.stringify(predicate.value);

    case 'contains':
      if (typeof value === 'string') {
        return value.includes(String(predicate.value));
      }
      if (Array.isArray(value)) {
        return value.some(v => JSON.stringify(v) === JSON.stringify(predicate.value));
      }
      return false;

    case 'matches':
      if (typeof value !== 'string') return false;
      try {
        const regex = new RegExp(String(predicate.value));
        return regex.test(value);
      } catch {
        return false;
      }

    case 'exists':
      return value !== null && value !== undefined;

    case 'greaterThan':
      return typeof value === 'number' && value > (predicate.value as number);

    case 'lessThan':
      return typeof value === 'number' && value < (predicate.value as number);

    case 'custom':
      // Custom predicates are not executed for security
      console.warn('[ERA] Custom predicates are not executed for security reasons');
      return false;

    default:
      return false;
  }
}

/**
 * Execute a single anchor
 */
export async function executeAnchor(anchor: RealityAnchor): Promise<AnchorExecutionResult> {
  const startTime = Date.now();

  console.log(`[ERA] Executing anchor: ${anchor.id} (${anchor.type})`);

  const baseResult: Partial<AnchorExecutionResult> = {
    anchorId: anchor.id,
    intentId: anchor.intentId,
    anchorType: anchor.type,
    executedAt: new Date(),
    expected: anchor.expected,
    critical: anchor.critical,
  };

  try {
    let actual: any;

    // Execute based on type
    switch (anchor.type) {
      case 'http':
        actual = await executeHttpAnchor(anchor.query as HttpAnchorQuery);
        break;
      case 'db':
        actual = await executeDbAnchor(anchor.query as DbAnchorQuery);
        break;
      case 'memory':
        actual = await executeMemoryAnchor(anchor.query as MemoryAnchorQuery);
        break;
      case 'simulation':
        actual = await executeSimulationAnchor(anchor.query as SimulationAnchorQuery);
        break;
      default:
        throw new Error(`Unknown anchor type: ${anchor.type}`);
    }

    // Check for execution errors from stubs
    if (actual?.error) {
      return {
        ...baseResult,
        durationMs: Date.now() - startTime,
        actual,
        match: false,
        error: actual.message || actual.error,
        errorType: 'connection',
        status: 'ERROR',
      } as AnchorExecutionResult;
    }

    // Match against predicate
    const match = matchPredicate(actual, anchor.expected);

    return {
      ...baseResult,
      durationMs: Date.now() - startTime,
      actual,
      match,
      error: null,
      errorType: null,
      status: match ? 'PASSED' : 'FAILED',
    } as AnchorExecutionResult;

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');

    return {
      ...baseResult,
      durationMs: Date.now() - startTime,
      actual: null,
      match: false,
      error: error.message,
      errorType: isTimeout ? 'timeout' : 'connection',
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
    } as AnchorExecutionResult;
  }
}

/**
 * Execute all anchors for a build
 * Time-boxed, deterministic execution
 */
export async function executeAllAnchors(
  buildId: string,
  registry: RealityAnchorRegistry
): Promise<ExternalValidationReport> {
  const startTime = Date.now();
  const anchors = registry.getAllAnchors();

  console.log('[ERA] ==========================================');
  console.log('[ERA] EXTERNAL REALITY ANCHOR EXECUTION');
  console.log('[ERA] ==========================================');
  console.log(`[ERA] Build: ${buildId}`);
  console.log(`[ERA] Anchors to execute: ${anchors.length}`);

  const results: AnchorExecutionResult[] = [];
  const intentSummary: ExternalValidationReport['intentSummary'] = {};

  // Execute anchors sequentially for determinism
  for (const anchor of anchors) {
    const result = await executeAnchor(anchor);
    results.push(result);
    registry.updateResult(anchor.id, result);

    // Update intent summary
    if (!intentSummary[anchor.intentId]) {
      intentSummary[anchor.intentId] = {
        intentId: anchor.intentId,
        anchorsTotal: 0,
        anchorsPassed: 0,
        externalOutcomeScore: 0,
        trustAdjustedScore: 0,      // Default: same as external (no governance)
        averageTrustScore: 1.0,     // Default: fully trusted
      };
    }

    intentSummary[anchor.intentId].anchorsTotal++;
    if (result.status === 'PASSED') {
      intentSummary[anchor.intentId].anchorsPassed++;
    }
  }

  // Calculate external outcome scores
  for (const summary of Object.values(intentSummary)) {
    summary.externalOutcomeScore = summary.anchorsTotal > 0
      ? summary.anchorsPassed / summary.anchorsTotal
      : 1.0;  // No anchors = assume pass
    // For non-governed execution, trust-adjusted is same as external
    summary.trustAdjustedScore = summary.externalOutcomeScore;
  }

  // Count results
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const errors = results.filter(r => r.status === 'ERROR' || r.status === 'TIMEOUT').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;
  const criticalFailures = results.filter(r =>
    r.critical && (r.status === 'FAILED' || r.status === 'ERROR' || r.status === 'TIMEOUT')
  ).length;

  const report: ExternalValidationReport = {
    buildId,
    executedAt: new Date(),
    totalDurationMs: Date.now() - startTime,
    anchorsExecuted: anchors.length,
    passed,
    failed,
    errors,
    skipped,
    criticalFailures,
    hasCriticalFailure: criticalFailures > 0,
    details: results,
    intentSummary,
  };

  // Log summary
  console.log('[ERA] ==========================================');
  console.log('[ERA] EXECUTION COMPLETE');
  console.log(`[ERA] Duration: ${report.totalDurationMs}ms`);
  console.log(`[ERA] Passed: ${passed}/${anchors.length}`);
  console.log(`[ERA] Failed: ${failed}`);
  console.log(`[ERA] Errors: ${errors}`);
  console.log(`[ERA] Critical Failures: ${criticalFailures}`);
  console.log('[ERA] ==========================================');

  return report;
}

// ============================================
// ANCHOR FACTORY HELPERS
// ============================================

/**
 * Create an HTTP GET anchor
 */
export function createHttpGetAnchor(
  intentId: string,
  name: string,
  url: string,
  expectedStatus: number = 200,
  critical: boolean = false
): Omit<RealityAnchor, 'id' | 'createdAt'> {
  return {
    intentId,
    name,
    description: `HTTP GET ${url} expects ${expectedStatus}`,
    type: 'http',
    query: {
      method: 'GET',
      url,
      timeout: DEFAULT_TIMEOUT,
    } as HttpAnchorQuery,
    expected: {
      type: 'equals',
      path: 'status',
      value: expectedStatus,
    },
    critical,
    timeout: DEFAULT_TIMEOUT,
    retries: 0,
    delayBetweenRetries: 0,
  };
}

/**
 * Create an HTTP POST anchor with body validation
 */
export function createHttpPostAnchor(
  intentId: string,
  name: string,
  url: string,
  body: any,
  expectedPath: string,
  expectedValue: any,
  critical: boolean = false
): Omit<RealityAnchor, 'id' | 'createdAt'> {
  return {
    intentId,
    name,
    description: `HTTP POST ${url} expects ${expectedPath} = ${JSON.stringify(expectedValue)}`,
    type: 'http',
    query: {
      method: 'POST',
      url,
      body,
      headers: { 'Content-Type': 'application/json' },
      timeout: DEFAULT_TIMEOUT,
    } as HttpAnchorQuery,
    expected: {
      type: 'equals',
      path: `data.${expectedPath}`,
      value: expectedValue,
    },
    critical,
    timeout: DEFAULT_TIMEOUT,
    retries: 0,
    delayBetweenRetries: 0,
  };
}

/**
 * Create an existence check anchor
 */
export function createExistsAnchor(
  intentId: string,
  name: string,
  url: string,
  path: string,
  critical: boolean = false
): Omit<RealityAnchor, 'id' | 'createdAt'> {
  return {
    intentId,
    name,
    description: `Check ${path} exists at ${url}`,
    type: 'http',
    query: {
      method: 'GET',
      url,
      timeout: DEFAULT_TIMEOUT,
    } as HttpAnchorQuery,
    expected: {
      type: 'exists',
      path: `data.${path}`,
    },
    critical,
    timeout: DEFAULT_TIMEOUT,
    retries: 0,
    delayBetweenRetries: 0,
  };
}

// ============================================
// EXTERNAL OUTCOME SCORE CALCULATOR
// ============================================

/**
 * Calculate external outcome score for an intent
 * Returns null if no anchors exist for the intent
 */
export function calculateExternalOutcomeScore(
  intentId: string,
  report: ExternalValidationReport
): number | null {
  const summary = report.intentSummary[intentId];

  if (!summary || summary.anchorsTotal === 0) {
    return null;  // No anchors = no external validation
  }

  return summary.externalOutcomeScore;
}

/**
 * Calculate combined outcome score
 * Combined = min(internal, external) when external exists
 */
export function calculateCombinedOutcomeScore(
  internalScore: number,
  externalScore: number | null
): number {
  if (externalScore === null) {
    return internalScore;  // No external = use internal only
  }

  return Math.min(internalScore, externalScore);
}

// ============================================
// GOVERNED EXECUTION (RGL Integration)
// ============================================

/**
 * Execute a single sample for governance
 * Returns sample result with timing and payload hash
 */
async function executeSample(
  anchor: RealityAnchor,
  sampleIndex: number,
  timeoutMs: number
): Promise<SampleResult> {
  const startTime = Date.now();
  const executedAt = new Date();

  try {
    // Execute with timeout wrapper
    const { result, timedOut, error } = await executeAnchorWithTimeout(
      () => executeAnchorCore(anchor),
      timeoutMs
    );

    if (timedOut) {
      return {
        sampleIndex,
        executedAt,
        durationMs: Date.now() - startTime,
        success: false,
        payload: null,
        payloadHash: '',
        error: 'TIMEOUT',
        timedOut: true,
      };
    }

    if (error) {
      return {
        sampleIndex,
        executedAt,
        durationMs: Date.now() - startTime,
        success: false,
        payload: null,
        payloadHash: '',
        error: error.message,
        timedOut: false,
      };
    }

    return {
      sampleIndex,
      executedAt,
      durationMs: Date.now() - startTime,
      success: result?.match ?? false,
      payload: result?.actual,
      payloadHash: hashPayload(result?.actual),
      error: null,
      timedOut: false,
    };

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      sampleIndex,
      executedAt,
      durationMs: Date.now() - startTime,
      success: false,
      payload: null,
      payloadHash: '',
      error: error.message,
      timedOut: false,
    };
  }
}

/**
 * Core execution logic (without governance wrapper)
 * Returns { match, actual } for sample collection
 */
async function executeAnchorCore(anchor: RealityAnchor): Promise<{ match: boolean; actual: any }> {
  let actual: any;

  switch (anchor.type) {
    case 'http':
      actual = await executeHttpAnchor(anchor.query as HttpAnchorQuery);
      break;
    case 'db':
      actual = await executeDbAnchor(anchor.query as DbAnchorQuery);
      break;
    case 'memory':
      actual = await executeMemoryAnchor(anchor.query as MemoryAnchorQuery);
      break;
    case 'simulation':
      actual = await executeSimulationAnchor(anchor.query as SimulationAnchorQuery);
      break;
    default:
      throw new Error(`Unknown anchor type: ${anchor.type}`);
  }

  // Check for execution errors from stubs
  if (actual?.error) {
    return { match: false, actual };
  }

  const match = matchPredicate(actual, anchor.expected);
  return { match, actual };
}

/**
 * Execute anchor with governance (quorum/trust scoring)
 */
export async function executeAnchorWithGovernance(
  anchor: RealityAnchor,
  policy: RealityPolicy
): Promise<QuorumResult> {
  const startTime = Date.now();

  console.log(`[RGL] Executing anchor with governance: ${anchor.id} (mode: ${policy.mode})`);

  const samples: SampleResult[] = [];
  const samplesToExecute = policy.mode === 'quorum' ? policy.samples : 1;

  // Execute samples sequentially with backoff
  for (let i = 0; i < samplesToExecute; i++) {
    if (i > 0) {
      // Wait for backoff between samples
      await new Promise(resolve => setTimeout(resolve, policy.retryBackoff));
    }

    const sample = await executeSample(anchor, i, policy.timeoutMs);
    samples.push(sample);

    // Log sample result
    const icon = sample.success ? '✓' : sample.timedOut ? '⏱' : '✗';
    console.log(`[RGL]   Sample ${i + 1}/${samplesToExecute}: ${icon} (${sample.durationMs}ms)`);
  }

  // Aggregate results
  const quorum = aggregateQuorum(anchor.id, samples, policy, Date.now() - startTime);

  // Log quorum result
  logQuorumResult(quorum);

  return quorum;
}

/**
 * Execute all anchors with governance
 * Uses RealityPolicyRegistry for per-anchor policies
 */
export async function executeAllAnchorsGoverned(
  buildId: string,
  anchorRegistry: RealityAnchorRegistry,
  policyRegistry: RealityPolicyRegistry
): Promise<{
  report: ExternalValidationReport;
  governance: GovernanceReport;
}> {
  const startTime = Date.now();
  const anchors = anchorRegistry.getAllAnchors();

  console.log('[RGL] ==========================================');
  console.log('[RGL] GOVERNED REALITY ANCHOR EXECUTION');
  console.log('[RGL] ==========================================');
  console.log(`[RGL] Build: ${buildId}`);
  console.log(`[RGL] Anchors to govern: ${anchors.length}`);

  const quorumResults: QuorumResult[] = [];
  const executionResults: AnchorExecutionResult[] = [];
  const intentIds: Record<string, string> = {};
  const criticalAnchors = new Set<string>();

  // Track intent summaries for trust-adjusted scores
  const intentSummary: ExternalValidationReport['intentSummary'] = {};

  // Execute anchors sequentially for determinism
  for (const anchor of anchors) {
    intentIds[anchor.id] = anchor.intentId;
    if (anchor.critical) {
      criticalAnchors.add(anchor.id);
    }

    // Get policy (auto-creates default, enforces quorum for critical)
    const policy = policyRegistry.getPolicy(anchor.id, anchor.critical);

    // Execute with governance
    const quorum = await executeAnchorWithGovernance(anchor, policy);
    quorumResults.push(quorum);

    // Convert to AnchorExecutionResult format
    const result: AnchorExecutionResult = {
      anchorId: anchor.id,
      intentId: anchor.intentId,
      anchorType: anchor.type,
      executedAt: quorum.executedAt,
      durationMs: quorum.totalDurationMs,
      actual: quorum.samples.length > 0 ? quorum.samples[0].payload : null,
      expected: anchor.expected,
      match: quorum.finalVerdict,
      error: quorum.samples.find(s => s.error)?.error || null,
      errorType: quorum.samplesTimedOut > 0 ? 'timeout' : null,
      status: quorum.finalVerdict ? 'PASSED' :
              quorum.samplesTimedOut === quorum.samplesExecuted ? 'TIMEOUT' :
              quorum.samplesSucceeded === 0 ? 'ERROR' : 'FAILED',
      critical: anchor.critical,
      governance: {
        trustScore: quorum.trustScore,
        successRate: quorum.successRate,
        samplesExecuted: quorum.samplesExecuted,
        variance: quorum.payloadVariance,
        finalVerdict: quorum.finalVerdict,
        verdictReason: quorum.verdictReason,
      },
    };

    executionResults.push(result);
    anchorRegistry.updateResult(anchor.id, result);

    // Update intent summary
    if (!intentSummary[anchor.intentId]) {
      intentSummary[anchor.intentId] = {
        intentId: anchor.intentId,
        anchorsTotal: 0,
        anchorsPassed: 0,
        externalOutcomeScore: 0,
        trustAdjustedScore: 0,
        averageTrustScore: 0,
      };
    }

    intentSummary[anchor.intentId].anchorsTotal++;
    if (quorum.finalVerdict) {
      intentSummary[anchor.intentId].anchorsPassed++;
    }
  }

  // Calculate external outcome scores and trust-adjusted scores
  for (const summary of Object.values(intentSummary)) {
    const anchorsForIntent = executionResults.filter(r => r.intentId === summary.intentId);

    // External outcome = passed / total
    summary.externalOutcomeScore = summary.anchorsTotal > 0
      ? summary.anchorsPassed / summary.anchorsTotal
      : 1.0;

    // Average trust score for intent
    const trustScores = anchorsForIntent
      .filter(r => r.governance)
      .map(r => r.governance!.trustScore);
    summary.averageTrustScore = trustScores.length > 0
      ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
      : 1.0;

    // Trust-adjusted score = externalOutcome * avgTrust
    summary.trustAdjustedScore = summary.externalOutcomeScore * summary.averageTrustScore;
  }

  // Generate governance report
  const governanceReport = generateGovernanceReport(
    buildId,
    quorumResults,
    intentIds,
    criticalAnchors,
    Date.now() - startTime
  );

  // Build standard report
  const passed = executionResults.filter(r => r.status === 'PASSED').length;
  const failed = executionResults.filter(r => r.status === 'FAILED').length;
  const errors = executionResults.filter(r => r.status === 'ERROR' || r.status === 'TIMEOUT').length;
  const skipped = executionResults.filter(r => r.status === 'SKIPPED').length;
  const criticalFailures = executionResults.filter(r =>
    r.critical && (r.status === 'FAILED' || r.status === 'ERROR' || r.status === 'TIMEOUT')
  ).length;

  const report: ExternalValidationReport = {
    buildId,
    executedAt: new Date(),
    totalDurationMs: Date.now() - startTime,
    anchorsExecuted: anchors.length,
    passed,
    failed,
    errors,
    skipped,
    criticalFailures,
    hasCriticalFailure: criticalFailures > 0,
    details: executionResults,
    intentSummary,
    governance: {
      anchorsGoverned: governanceReport.anchorsGoverned,
      anchorsPassed: governanceReport.anchorsPassed,
      anchorsFailed: governanceReport.anchorsFailed,
      averageTrustScore: governanceReport.averageTrustScore,
      lowestTrustScore: governanceReport.lowestTrustScore,
      governancePass: governanceReport.governancePass,
      governanceBlocker: governanceReport.governanceBlocker,
      failures: governanceReport.failures.map(f => ({
        type: f.type,
        anchorId: f.anchorId,
        intentId: f.intentId,
        message: f.message,
        critical: f.critical,
      })),
    },
  };

  // Log reports
  logGovernanceReport(governanceReport);

  console.log('[RGL] ==========================================');
  console.log('[RGL] GOVERNED EXECUTION COMPLETE');
  console.log(`[RGL] Duration: ${report.totalDurationMs}ms`);
  console.log(`[RGL] Passed: ${passed}/${anchors.length} (${(passed/anchors.length*100).toFixed(0)}%)`);
  console.log(`[RGL] Governance: ${governanceReport.governancePass ? 'PASSED' : 'FAILED'}`);
  console.log('[RGL] ==========================================');

  return { report, governance: governanceReport };
}

// ============================================
// LOGGING
// ============================================

export function logAnchorResult(result: AnchorExecutionResult): void {
  const status = result.status;
  const icon = status === 'PASSED' ? '✓' : status === 'FAILED' ? '✗' : '⚠';
  const critical = result.critical ? '[CRITICAL]' : '';

  console.log(`[ERA] ${icon} ${result.anchorId} ${critical}`);
  console.log(`[ERA]   Type: ${result.anchorType}`);
  console.log(`[ERA]   Duration: ${result.durationMs}ms`);
  console.log(`[ERA]   Status: ${status}`);

  if (result.error) {
    console.log(`[ERA]   Error: ${result.error}`);
  }

  if (status === 'FAILED') {
    console.log(`[ERA]   Expected: ${JSON.stringify(result.expected)}`);
    console.log(`[ERA]   Actual: ${JSON.stringify(result.actual).slice(0, 100)}`);
  }
}

export function logExternalValidationReport(report: ExternalValidationReport): void {
  console.log('[ERA] ==========================================');
  console.log('[ERA] EXTERNAL VALIDATION REPORT');
  console.log('[ERA] ==========================================');
  console.log(`[ERA] Build: ${report.buildId}`);
  console.log(`[ERA] Executed: ${report.anchorsExecuted} anchors`);
  console.log(`[ERA] Passed: ${report.passed}`);
  console.log(`[ERA] Failed: ${report.failed}`);
  console.log(`[ERA] Errors: ${report.errors}`);
  console.log(`[ERA] Critical Failures: ${report.criticalFailures}`);
  console.log(`[ERA] Has Critical Failure: ${report.hasCriticalFailure}`);
  console.log('[ERA] ------------------------------------------');
  console.log('[ERA] Intent Summary:');

  for (const [intentId, summary] of Object.entries(report.intentSummary)) {
    console.log(`[ERA]   ${intentId}: ${summary.anchorsPassed}/${summary.anchorsTotal} (${(summary.externalOutcomeScore * 100).toFixed(0)}%)`);
  }

  console.log('[ERA] ==========================================');
}

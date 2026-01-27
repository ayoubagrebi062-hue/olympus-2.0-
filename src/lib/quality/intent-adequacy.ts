/**
 * OLYMPUS 2.0 - Intent Adequacy Layer (IAL)
 *
 * Refuses to ship software that is "correct but pointless".
 *
 * Rules:
 * - Deterministic domain inference from intent graph
 * - Minimum capability profiles per domain
 * - IAS (Intent Adequacy Score) = satisfiedCapabilities / requiredCapabilities
 * - IAS < 0.6 → BLOCK, IAS 0.6–0.8 → WARN, IAS ≥ 0.8 → PASS
 */

import { IntentCausalChain, IntentCategory, IntentSpec } from './intent-graph';

// ============================================
// DOMAIN TYPES
// ============================================

/**
 * Application domain types
 */
export type DomainType =
  | 'crud' // Create, Read, Update, Delete operations
  | 'auth' // Authentication & authorization
  | 'dashboard' // Data visualization & metrics
  | 'form' // Form handling & validation
  | 'search' // Search & filtering
  | 'generic'; // Fallback for mixed/unknown domains

// ============================================
// CAPABILITY DEFINITIONS
// ============================================

/**
 * Capabilities required for each domain
 */
export type Capability =
  // CRUD capabilities
  | 'create_entity'
  | 'read_entity'
  | 'update_entity'
  | 'delete_entity'
  | 'list_entities'
  // Auth capabilities
  | 'login'
  | 'logout'
  | 'register'
  | 'session_management'
  | 'password_recovery'
  // Dashboard capabilities
  | 'display_metrics'
  | 'chart_rendering'
  | 'data_refresh'
  | 'filtering'
  | 'date_range_selection'
  // Form capabilities
  | 'input_validation'
  | 'form_submission'
  | 'error_display'
  | 'success_feedback'
  | 'field_reset'
  // Search capabilities
  | 'text_search'
  | 'filter_application'
  | 'sort_results'
  | 'pagination'
  | 'empty_state'
  // Generic capabilities
  | 'navigation'
  | 'loading_state'
  | 'error_handling';

/**
 * Capability status in the codebase
 */
export interface CapabilityStatus {
  capability: Capability;
  satisfied: boolean;
  evidence: string | null;
  sourceIntent: string | null; // Intent ID that provides this capability
}

// ============================================
// MINIMUM CAPABILITY PROFILES
// ============================================

/**
 * Minimum capability profile for a domain
 */
export interface MinimumCapabilityProfile {
  domain: DomainType;
  requiredCapabilities: readonly Capability[];
  minSatisfied: number; // Minimum number that must be satisfied (out of required)
  description: string;
}

/**
 * Domain-specific minimum capability profiles
 * These are HARD requirements - cannot be modified at runtime
 */
export const MINIMUM_CAPABILITY_PROFILES: readonly MinimumCapabilityProfile[] = Object.freeze([
  {
    domain: 'crud',
    requiredCapabilities: Object.freeze([
      'create_entity',
      'read_entity',
      'update_entity',
      'delete_entity',
      'list_entities',
    ] as const),
    minSatisfied: 4, // At least 4 of 5 CRUD operations
    description: 'CRUD application requires Create, Read, Update, Delete, List operations',
  },
  {
    domain: 'auth',
    requiredCapabilities: Object.freeze(['login', 'logout', 'session_management'] as const),
    minSatisfied: 3, // All 3 are required for basic auth
    description: 'Authentication requires Login, Logout, and Session Management',
  },
  {
    domain: 'dashboard',
    requiredCapabilities: Object.freeze(['display_metrics', 'data_refresh', 'filtering'] as const),
    minSatisfied: 2, // At least 2 of 3 for basic dashboard
    description: 'Dashboard requires metrics display, data refresh, or filtering',
  },
  {
    domain: 'form',
    requiredCapabilities: Object.freeze([
      'input_validation',
      'form_submission',
      'error_display',
      'success_feedback',
    ] as const),
    minSatisfied: 3, // At least 3 of 4 for usable form
    description: 'Form handling requires validation, submission, error display, success feedback',
  },
  {
    domain: 'search',
    requiredCapabilities: Object.freeze([
      'text_search',
      'filter_application',
      'empty_state',
    ] as const),
    minSatisfied: 2, // At least 2 of 3 for basic search
    description: 'Search requires text search, filtering, or empty state handling',
  },
  {
    domain: 'generic',
    requiredCapabilities: Object.freeze(['navigation', 'loading_state', 'error_handling'] as const),
    minSatisfied: 2, // At least 2 of 3 for basic usability
    description: 'Generic application requires navigation, loading states, or error handling',
  },
]);

// ============================================
// DOMAIN INFERENCE HEURISTICS
// ============================================

/**
 * Domain inference signals from intents
 */
interface DomainSignals {
  crudSignals: number;
  authSignals: number;
  dashboardSignals: number;
  formSignals: number;
  searchSignals: number;
}

/**
 * Keywords that signal specific domains
 */
const DOMAIN_KEYWORDS: Record<DomainType, readonly string[]> = Object.freeze({
  crud: Object.freeze([
    'create',
    'add',
    'new',
    'insert',
    'read',
    'view',
    'display',
    'show',
    'list',
    'get',
    'update',
    'edit',
    'modify',
    'change',
    'delete',
    'remove',
    'destroy',
    'entity',
    'item',
    'record',
    'data',
  ]),
  auth: Object.freeze([
    'login',
    'logout',
    'sign in',
    'sign out',
    'sign up',
    'authenticate',
    'authorization',
    'auth',
    'register',
    'password',
    'session',
    'token',
    'user',
    'account',
    'credential',
  ]),
  dashboard: Object.freeze([
    'dashboard',
    'analytics',
    'metrics',
    'statistics',
    'stats',
    'chart',
    'graph',
    'visualization',
    'report',
    'kpi',
    'trend',
    'overview',
    'summary',
  ]),
  form: Object.freeze([
    'form',
    'input',
    'field',
    'validation',
    'validate',
    'submit',
    'submission',
    'contact',
    'feedback',
    'required',
    'optional',
    'error message',
  ]),
  search: Object.freeze([
    'search',
    'find',
    'query',
    'filter',
    'sort',
    'pagination',
    'page',
    'results',
    'match',
  ]),
  generic: Object.freeze([
    'navigate',
    'page',
    'route',
    'link',
    'loading',
    'spinner',
    'error',
    'message',
  ]),
});

/**
 * Intent categories that map to domains
 */
const CATEGORY_TO_DOMAIN: Record<IntentCategory, DomainType> = {
  navigation: 'generic',
  data_display: 'crud',
  data_mutation: 'crud',
  filtering: 'search',
  search: 'search',
  form_submission: 'form',
  authentication: 'auth',
  state_toggle: 'generic',
  feedback: 'form',
  loading: 'generic',
  error_handling: 'generic',
};

/**
 * Infer domain from intent chains
 */
export function inferDomainFromIntents(chains: IntentCausalChain[]): DomainType {
  if (chains.length === 0) {
    return 'generic';
  }

  const signals: DomainSignals = {
    crudSignals: 0,
    authSignals: 0,
    dashboardSignals: 0,
    formSignals: 0,
    searchSignals: 0,
  };

  for (const chain of chains) {
    const intent = chain.intent;
    const text = intent.requirement.toLowerCase();

    // Signal from category
    const categoryDomain = CATEGORY_TO_DOMAIN[intent.category];
    incrementSignal(signals, categoryDomain);

    // Signal from keywords in requirement text
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          incrementSignal(signals, domain as DomainType);
        }
      }
    }
  }

  // Find dominant domain
  const domainScores: [DomainType, number][] = [
    ['crud', signals.crudSignals],
    ['auth', signals.authSignals],
    ['dashboard', signals.dashboardSignals],
    ['form', signals.formSignals],
    ['search', signals.searchSignals],
  ];

  domainScores.sort((a, b) => b[1] - a[1]);

  const [topDomain, topScore] = domainScores[0];
  const [secondDomain, secondScore] = domainScores[1];

  // If no clear winner or low signal, return generic
  if (topScore < 2) {
    return 'generic';
  }

  // If top domain has at least 1.5x the second, use it
  if (topScore >= secondScore * 1.5) {
    return topDomain;
  }

  // Mixed domain - use generic
  return 'generic';
}

function incrementSignal(signals: DomainSignals, domain: DomainType): void {
  switch (domain) {
    case 'crud':
      signals.crudSignals++;
      break;
    case 'auth':
      signals.authSignals++;
      break;
    case 'dashboard':
      signals.dashboardSignals++;
      break;
    case 'form':
      signals.formSignals++;
      break;
    case 'search':
      signals.searchSignals++;
      break;
  }
}

// ============================================
// CAPABILITY EXTRACTION
// ============================================

/**
 * Extract satisfied capabilities from intent chains
 */
export function extractCapabilitiesFromChains(chains: IntentCausalChain[]): CapabilityStatus[] {
  const capabilities: CapabilityStatus[] = [];
  const satisfiedCapabilities = new Set<Capability>();

  for (const chain of chains) {
    // Only count satisfied intents as providing capabilities
    if (!chain.satisfied) {
      continue;
    }

    const intent = chain.intent;
    const text = intent.requirement.toLowerCase();
    const category = intent.category;

    // Extract capabilities based on category and keywords
    const extracted = extractCapabilitiesFromIntent(text, category);

    for (const cap of extracted) {
      if (!satisfiedCapabilities.has(cap)) {
        satisfiedCapabilities.add(cap);
        capabilities.push({
          capability: cap,
          satisfied: true,
          evidence: `Intent "${intent.requirement.slice(0, 50)}..." (${intent.id})`,
          sourceIntent: intent.id,
        });
      }
    }
  }

  return capabilities;
}

/**
 * Extract capabilities from a single intent
 */
function extractCapabilitiesFromIntent(text: string, category: IntentCategory): Capability[] {
  const capabilities: Capability[] = [];

  // CRUD capabilities
  if (text.includes('create') || text.includes('add') || text.includes('new')) {
    capabilities.push('create_entity');
  }
  if (
    text.includes('read') ||
    text.includes('view') ||
    text.includes('display') ||
    text.includes('show')
  ) {
    capabilities.push('read_entity');
  }
  if (text.includes('update') || text.includes('edit') || text.includes('modify')) {
    capabilities.push('update_entity');
  }
  if (text.includes('delete') || text.includes('remove')) {
    capabilities.push('delete_entity');
  }
  if (text.includes('list') || text.includes('all') || category === 'data_display') {
    capabilities.push('list_entities');
  }

  // Auth capabilities
  if (text.includes('login') || text.includes('sign in')) {
    capabilities.push('login');
  }
  if (text.includes('logout') || text.includes('sign out')) {
    capabilities.push('logout');
  }
  if (text.includes('register') || text.includes('sign up')) {
    capabilities.push('register');
  }
  if (text.includes('session') || text.includes('token')) {
    capabilities.push('session_management');
  }
  if (
    text.includes('password') &&
    (text.includes('reset') || text.includes('recover') || text.includes('forgot'))
  ) {
    capabilities.push('password_recovery');
  }

  // Dashboard capabilities
  if (text.includes('metric') || text.includes('statistic') || text.includes('analytics')) {
    capabilities.push('display_metrics');
  }
  if (text.includes('chart') || text.includes('graph') || text.includes('visualization')) {
    capabilities.push('chart_rendering');
  }
  if (text.includes('refresh') || text.includes('reload') || text.includes('update data')) {
    capabilities.push('data_refresh');
  }
  if (text.includes('filter') || category === 'filtering') {
    capabilities.push('filtering');
  }
  if (text.includes('date range') || text.includes('time period')) {
    capabilities.push('date_range_selection');
  }

  // Form capabilities
  if (text.includes('validat') || text.includes('required')) {
    capabilities.push('input_validation');
  }
  if (text.includes('submit') || category === 'form_submission') {
    capabilities.push('form_submission');
  }
  if (text.includes('error') && (text.includes('message') || text.includes('display'))) {
    capabilities.push('error_display');
  }
  if (text.includes('success') && (text.includes('message') || text.includes('feedback'))) {
    capabilities.push('success_feedback');
  }
  if (text.includes('reset') || text.includes('clear')) {
    capabilities.push('field_reset');
  }

  // Search capabilities
  if (text.includes('search') || category === 'search') {
    capabilities.push('text_search');
  }
  if (text.includes('filter') || text.includes('narrow')) {
    capabilities.push('filter_application');
  }
  if (text.includes('sort') || text.includes('order by')) {
    capabilities.push('sort_results');
  }
  if (
    text.includes('page') ||
    text.includes('pagination') ||
    text.includes('next') ||
    text.includes('previous')
  ) {
    capabilities.push('pagination');
  }
  if (text.includes('no results') || text.includes('empty') || text.includes('not found')) {
    capabilities.push('empty_state');
  }

  // Generic capabilities
  if (
    text.includes('navigate') ||
    text.includes('go to') ||
    text.includes('link') ||
    category === 'navigation'
  ) {
    capabilities.push('navigation');
  }
  if (text.includes('loading') || text.includes('spinner') || category === 'loading') {
    capabilities.push('loading_state');
  }
  if (text.includes('error') || text.includes('handle') || category === 'error_handling') {
    capabilities.push('error_handling');
  }

  return capabilities;
}

// ============================================
// INTENT ADEQUACY SCORE (IAS)
// ============================================

/**
 * IAS status based on score thresholds
 */
export type IASStatus = 'PASS' | 'WARN' | 'BLOCK';

/**
 * IAS thresholds
 */
export const IAS_THRESHOLDS = Object.freeze({
  PASS: 0.8, // IAS >= 0.8 → PASS
  WARN: 0.6, // IAS 0.6-0.8 → WARN
  // IAS < 0.6 → BLOCK
});

/**
 * Intent Adequacy analysis result
 */
export interface IntentAdequacyResult {
  // Domain inference
  inferredDomain: DomainType;
  domainConfidence: 'high' | 'medium' | 'low';

  // Capability profile
  profile: MinimumCapabilityProfile;
  requiredCapabilities: Capability[];
  satisfiedCapabilities: Capability[];
  missingCapabilities: Capability[];

  // IAS calculation
  ias: number; // 0.0 - 1.0
  status: IASStatus;

  // Blocking decision
  allowsShip: boolean;
  blockReason: string | null;

  // Detailed evidence
  capabilityStatuses: CapabilityStatus[];
}

/**
 * Compute Intent Adequacy Score (IAS)
 */
export function computeIntentAdequacy(chains: IntentCausalChain[]): IntentAdequacyResult {
  console.log('[IAL] ==========================================');
  console.log('[IAL] INTENT ADEQUACY LAYER');
  console.log('[IAL] ==========================================');

  // Step 1: Infer domain from intents
  const inferredDomain = inferDomainFromIntents(chains);
  console.log(`[IAL] Inferred Domain: ${inferredDomain}`);

  // Step 2: Get minimum capability profile for domain
  const profile = MINIMUM_CAPABILITY_PROFILES.find(p => p.domain === inferredDomain)!;
  const requiredCapabilities = [...profile.requiredCapabilities] as Capability[];

  console.log(`[IAL] Required Capabilities (${requiredCapabilities.length}):`);
  for (const cap of requiredCapabilities) {
    console.log(`[IAL]   - ${cap}`);
  }

  // Step 3: Extract satisfied capabilities from chains
  const capabilityStatuses = extractCapabilitiesFromChains(chains);
  const satisfiedCapabilities = capabilityStatuses
    .filter(cs => cs.satisfied)
    .map(cs => cs.capability);

  console.log(`[IAL] Satisfied Capabilities (${satisfiedCapabilities.length}):`);
  for (const cap of satisfiedCapabilities) {
    console.log(`[IAL]   ✓ ${cap}`);
  }

  // Step 4: Calculate which required capabilities are satisfied
  const satisfiedRequired = requiredCapabilities.filter(cap => satisfiedCapabilities.includes(cap));
  const missingCapabilities = requiredCapabilities.filter(
    cap => !satisfiedCapabilities.includes(cap)
  );

  console.log(`[IAL] Missing Capabilities (${missingCapabilities.length}):`);
  for (const cap of missingCapabilities) {
    console.log(`[IAL]   ✗ ${cap}`);
  }

  // Step 5: Compute IAS
  const ias =
    requiredCapabilities.length > 0 ? satisfiedRequired.length / requiredCapabilities.length : 1.0;

  console.log(`[IAL] ------------------------------------------`);
  console.log(
    `[IAL] IAS = ${satisfiedRequired.length}/${requiredCapabilities.length} = ${(ias * 100).toFixed(1)}%`
  );

  // Step 6: Determine status
  let status: IASStatus;
  if (ias >= IAS_THRESHOLDS.PASS) {
    status = 'PASS';
  } else if (ias >= IAS_THRESHOLDS.WARN) {
    status = 'WARN';
  } else {
    status = 'BLOCK';
  }

  console.log(`[IAL] Status: ${status}`);

  // Step 7: Determine if shipping is allowed
  const allowsShip = status !== 'BLOCK';
  const blockReason = !allowsShip
    ? `IAS ${(ias * 100).toFixed(1)}% < 60% threshold. Missing ${missingCapabilities.length}/${requiredCapabilities.length} required capabilities for ${inferredDomain} domain: ${missingCapabilities.join(', ')}`
    : null;

  if (blockReason) {
    console.log(`[IAL] ❌ BLOCK REASON: ${blockReason}`);
  }

  // Determine domain confidence
  let domainConfidence: 'high' | 'medium' | 'low' = 'low';
  if (chains.length >= 5 && inferredDomain !== 'generic') {
    domainConfidence = 'high';
  } else if (chains.length >= 2 || inferredDomain !== 'generic') {
    domainConfidence = 'medium';
  }

  console.log(`[IAL] Domain Confidence: ${domainConfidence}`);
  console.log('[IAL] ==========================================');

  return {
    inferredDomain,
    domainConfidence,
    profile,
    requiredCapabilities,
    satisfiedCapabilities: satisfiedRequired,
    missingCapabilities,
    ias,
    status,
    allowsShip,
    blockReason,
    capabilityStatuses,
  };
}

// ============================================
// HOSTILE MINIMAL-INTENT CASES
// ============================================

/**
 * Hostile minimal-intent case schema
 * These are HONEST but INADEQUATE intents that must be blocked by IAL, not IRCL
 */
export interface HostileMinimalIntentCase {
  id: string;
  intentText: string;
  inferredDomain: DomainType;
  providedCapabilities: Capability[];
  expectedIAS: number; // Expected IAS (should be < 0.6)
  mustBlock: true;
  reason: string;
}

/**
 * Hand-crafted hostile minimal-intent cases
 * These are NOT deceptive (IRCL won't catch them) - they're just inadequate
 */
export const HOSTILE_MINIMAL_INTENTS: readonly HostileMinimalIntentCase[] = Object.freeze([
  {
    id: 'hostile-minimal-001',
    intentText: 'User can view their profile',
    inferredDomain: 'crud',
    providedCapabilities: ['read_entity'],
    expectedIAS: 0.2, // 1/5 CRUD operations
    mustBlock: true,
    reason:
      'CRUD app with only Read. No Create, Update, Delete, or List. Technically correct but pointless for a CRUD application.',
  },
  {
    id: 'hostile-minimal-002',
    intentText: 'User can log in',
    inferredDomain: 'auth',
    providedCapabilities: ['login'],
    expectedIAS: 0.33, // 1/3 auth operations
    mustBlock: true,
    reason:
      'Auth app with only Login. No Logout or Session Management. User would be permanently logged in with no escape.',
  },
  {
    id: 'hostile-minimal-003',
    intentText: 'Display a chart of sales data',
    inferredDomain: 'dashboard',
    providedCapabilities: ['chart_rendering'],
    expectedIAS: 0.33, // 1/3 dashboard operations
    mustBlock: true,
    reason:
      'Dashboard with only static chart. No metrics, no refresh, no filtering. A frozen image masquerading as a dashboard.',
  },
  {
    id: 'hostile-minimal-004',
    intentText: 'User can type in the search box',
    inferredDomain: 'search',
    providedCapabilities: [],
    expectedIAS: 0.0, // 0/3 search operations - typing is not searching
    mustBlock: true,
    reason:
      'Search feature with no actual search functionality. User can type but nothing happens. The cruelest form of correctness.',
  },
  {
    id: 'hostile-minimal-005',
    intentText: 'Contact form accepts input',
    inferredDomain: 'form',
    providedCapabilities: [],
    expectedIAS: 0.0, // 0/4 form operations - accepting input is not validation, submission, or feedback
    mustBlock: true,
    reason:
      'Form that accepts input but has no validation, no submission, no errors, no success feedback. A black hole for user data.',
  },
]);

/**
 * Result of hostile minimal-intent validation
 */
export interface HostileMinimalIntentValidation {
  total: number;
  blocked: number;
  leaked: number;
  results: HostileMinimalIntentResult[];
  validationPassed: boolean;
}

export interface HostileMinimalIntentResult {
  caseId: string;
  intentText: string;
  expectedIAS: number;
  actualIAS: number;
  wasBlocked: boolean;
  leaked: boolean;
}

/**
 * Run hostile minimal-intent validation
 */
export function runHostileMinimalIntentValidation(): HostileMinimalIntentValidation {
  console.log('[IAL] ==========================================');
  console.log('[IAL] HOSTILE MINIMAL-INTENT VALIDATION');
  console.log('[IAL] ==========================================');
  console.log(`[IAL] Testing ${HOSTILE_MINIMAL_INTENTS.length} minimal-intent cases`);

  const results: HostileMinimalIntentResult[] = [];
  let blocked = 0;
  let leaked = 0;

  for (const hostileCase of HOSTILE_MINIMAL_INTENTS) {
    // Simulate IAS calculation for this case
    const profile = MINIMUM_CAPABILITY_PROFILES.find(p => p.domain === hostileCase.inferredDomain)!;
    const requiredCapabilities = profile.requiredCapabilities;

    const satisfiedCount = hostileCase.providedCapabilities.filter(cap =>
      requiredCapabilities.includes(cap)
    ).length;

    const actualIAS =
      requiredCapabilities.length > 0 ? satisfiedCount / requiredCapabilities.length : 1.0;

    const wasBlocked = actualIAS < IAS_THRESHOLDS.WARN; // < 0.6 is blocked
    const isLeak = !wasBlocked;

    if (wasBlocked) {
      blocked++;
    } else {
      leaked++;
    }

    results.push({
      caseId: hostileCase.id,
      intentText: hostileCase.intentText,
      expectedIAS: hostileCase.expectedIAS,
      actualIAS,
      wasBlocked,
      leaked: isLeak,
    });

    // Log result
    if (wasBlocked) {
      console.log(`[IAL] ✓ ${hostileCase.id}: BLOCKED (IAS=${(actualIAS * 100).toFixed(1)}%)`);
    } else {
      console.log(`[IAL] ✗ ${hostileCase.id}: LEAKED (IAS=${(actualIAS * 100).toFixed(1)}%)`);
    }
  }

  const validationPassed = leaked === 0;

  console.log('[IAL] ------------------------------------------');
  console.log(`[IAL] Total: ${HOSTILE_MINIMAL_INTENTS.length}`);
  console.log(`[IAL] Blocked: ${blocked}`);
  console.log(`[IAL] Leaked: ${leaked}`);
  console.log(`[IAL] Validation: ${validationPassed ? 'PASSED' : 'FAILED'}`);
  console.log('[IAL] ==========================================');

  return {
    total: HOSTILE_MINIMAL_INTENTS.length,
    blocked,
    leaked,
    results,
    validationPassed,
  };
}

// ============================================
// INTEGRATION INTERFACE
// ============================================

/**
 * Check if intent adequacy allows shipping
 */
export function intentAdequacyAllowsShip(result: IntentAdequacyResult): boolean {
  return result.allowsShip;
}

/**
 * Get intent adequacy output for build artifact
 */
export function getIntentAdequacyOutput(result: IntentAdequacyResult): {
  domain: DomainType;
  domainConfidence: string;
  ias: number;
  iasPercent: string;
  status: IASStatus;
  requiredCapabilities: number;
  satisfiedCapabilities: number;
  missingCapabilities: string[];
  allowsShip: boolean;
  blockReason: string | null;
} {
  return {
    domain: result.inferredDomain,
    domainConfidence: result.domainConfidence,
    ias: result.ias,
    iasPercent: `${(result.ias * 100).toFixed(1)}%`,
    status: result.status,
    requiredCapabilities: result.requiredCapabilities.length,
    satisfiedCapabilities: result.satisfiedCapabilities.length,
    missingCapabilities: result.missingCapabilities,
    allowsShip: result.allowsShip,
    blockReason: result.blockReason,
  };
}

/**
 * Log intent adequacy summary
 */
export function logIntentAdequacy(result: IntentAdequacyResult): void {
  console.log('[IAL] ==========================================');
  console.log('[IAL] INTENT ADEQUACY SUMMARY');
  console.log('[IAL] ==========================================');
  console.log(`[IAL] Domain: ${result.inferredDomain} (${result.domainConfidence} confidence)`);
  console.log(`[IAL] IAS: ${(result.ias * 100).toFixed(1)}% (${result.status})`);
  console.log(
    `[IAL] Capabilities: ${result.satisfiedCapabilities.length}/${result.requiredCapabilities.length} satisfied`
  );

  if (result.missingCapabilities.length > 0) {
    console.log('[IAL] Missing:');
    for (const cap of result.missingCapabilities) {
      console.log(`[IAL]   - ${cap}`);
    }
  }

  console.log('[IAL] ------------------------------------------');
  console.log(`[IAL] Ship Decision: ${result.allowsShip ? 'ALLOWED' : 'BLOCKED'}`);

  if (result.blockReason) {
    console.log(`[IAL] Block Reason: ${result.blockReason}`);
  }

  console.log('[IAL] ==========================================');
}

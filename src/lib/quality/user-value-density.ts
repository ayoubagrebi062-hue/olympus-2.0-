/**
 * OLYMPUS 2.0 - User Value Density Layer (UVDL)
 *
 * Refuses to ship software that is technically adequate but experientially worthless.
 *
 * Rules:
 * - Deterministic penalties only - NO heuristics, NO ML
 * - UVDScore per intent computed from 5 signals
 * - SystemUVD = weighted mean by intent priority
 * - Critical intent with UVD < 0.5 → BLOCK
 * - SystemUVD < 0.6 → BLOCK
 */

import { IntentCausalChain, IntentSpec, CRITICALITY_WEIGHTS } from './intent-graph';

// ============================================
// UVD SCORE COMPONENTS
// ============================================

/**
 * Components that contribute to User Value Density
 */
export interface UVDComponents {
  /** Depth of causal chain (trigger → state → effect → outcome) */
  causalChainDepth: number;

  /** Number of distinct observable outcomes */
  observableOutcomes: number;

  /** Presence of behavioral feedback (loading, success, progress) */
  behavioralFeedback: BehavioralFeedbackSignals;

  /** Error handling signals (error states, recovery options) */
  errorHandling: ErrorHandlingSignals;

  /** External effect acknowledgment (API calls, persistence, notifications) */
  externalEffects: ExternalEffectSignals;
}

/**
 * Behavioral feedback signals
 */
export interface BehavioralFeedbackSignals {
  hasLoadingState: boolean;
  hasSuccessFeedback: boolean;
  hasProgressIndicator: boolean;
  hasEmptyState: boolean;
  hasHoverFeedback: boolean;
}

/**
 * Error handling signals
 */
export interface ErrorHandlingSignals {
  hasErrorState: boolean;
  hasErrorMessage: boolean;
  hasRetryOption: boolean;
  hasValidationFeedback: boolean;
  hasFallbackBehavior: boolean;
}

/**
 * External effect signals
 */
export interface ExternalEffectSignals {
  hasApiCall: boolean;
  hasPersistence: boolean;
  hasNotification: boolean;
  hasExternalAnchor: boolean;
  hasRealWorldEffect: boolean;
}

// ============================================
// UVD PENALTIES (DETERMINISTIC)
// ============================================

/**
 * Penalty types and their fixed deductions
 * These are DETERMINISTIC - no heuristics, no ML
 */
export const UVD_PENALTIES = Object.freeze({
  // Causal chain penalties
  NO_TRIGGER: 0.2, // Intent has no trigger mechanism
  NO_STATE: 0.15, // Intent has no state management
  NO_EFFECT: 0.2, // Trigger doesn't connect to state
  NO_OUTCOME: 0.25, // No observable outcome
  SHALLOW_CHAIN: 0.1, // Chain depth < 3 (missing links)

  // Behavioral feedback penalties
  NO_LOADING_STATE: 0.08, // Async operation without loading indicator
  NO_SUCCESS_FEEDBACK: 0.1, // Mutation without success confirmation
  NO_EMPTY_STATE: 0.05, // List without empty state handling

  // Error handling penalties
  NO_ERROR_STATE: 0.12, // No error handling at all
  NO_ERROR_MESSAGE: 0.08, // Error state without message
  NO_RETRY_OPTION: 0.05, // Recoverable error without retry
  NO_VALIDATION: 0.1, // Form without validation feedback

  // External effect penalties
  UNACKNOWLEDGED_API: 0.15, // API call without status handling
  NO_PERSISTENCE_CONFIRM: 0.1, // Save without confirmation
  ORPHAN_MUTATION: 0.2, // State change with no visible effect
});

/**
 * Penalty application result
 */
export interface UVDPenalty {
  type: keyof typeof UVD_PENALTIES;
  deduction: number;
  reason: string;
}

// ============================================
// UVD SCORE CALCULATION
// ============================================

/**
 * UVD Score for a single intent
 */
export interface IntentUVDScore {
  intentId: string;
  requirement: string;
  priority: IntentSpec['priority'];

  // Base score starts at 1.0
  baseScore: number;

  // Component analysis
  components: UVDComponents;

  // Applied penalties
  penalties: UVDPenalty[];
  totalPenalty: number;

  // Final score (baseScore - totalPenalty, clamped to 0-1)
  score: number;

  // Human-readable explanation
  explanation: string;

  // Blocking decision for critical intents
  blocksShip: boolean;
  blockReason: string | null;
}

/**
 * Extract UVD components from an intent chain
 */
export function extractUVDComponents(chain: IntentCausalChain): UVDComponents {
  // Calculate causal chain depth (0-4 based on presence of each axis)
  let depth = 0;
  if (chain.foundTrigger) depth++;
  if (chain.foundState) depth++;
  if (chain.axisScores.effect > 0) depth++;
  if (chain.foundOutcome) depth++;

  // Count observable outcomes
  let outcomes = 0;
  if (chain.foundOutcome) {
    outcomes = 1;
    // Additional outcomes from conditional rendering
    if (chain.foundOutcome.conditional) outcomes++;
    // Additional outcomes from state-dependent rendering
    if (chain.foundOutcome.dependsOnState.length > 1) {
      outcomes += chain.foundOutcome.dependsOnState.length - 1;
    }
  }

  // Extract behavioral feedback signals from code patterns
  const behavioralFeedback = extractBehavioralFeedback(chain);

  // Extract error handling signals
  const errorHandling = extractErrorHandling(chain);

  // Extract external effect signals
  const externalEffects = extractExternalEffects(chain);

  return {
    causalChainDepth: depth,
    observableOutcomes: outcomes,
    behavioralFeedback,
    errorHandling,
    externalEffects,
  };
}

/**
 * Extract behavioral feedback signals from chain
 */
function extractBehavioralFeedback(chain: IntentCausalChain): BehavioralFeedbackSignals {
  const intent = chain.intent;
  const requirement = intent.requirement.toLowerCase();
  const category = intent.category;

  // Detect loading state from intent or state patterns
  const hasLoadingState =
    chain.foundState?.stateName.toLowerCase().includes('loading') ||
    chain.foundState?.stateName.toLowerCase().includes('pending') ||
    requirement.includes('loading') ||
    category === 'loading';

  // Detect success feedback
  const hasSuccessFeedback =
    chain.foundState?.stateName.toLowerCase().includes('success') ||
    requirement.includes('success') ||
    requirement.includes('confirmation') ||
    category === 'feedback';

  // Detect progress indicator
  const hasProgressIndicator =
    chain.foundState?.stateName.toLowerCase().includes('progress') ||
    requirement.includes('progress');

  // Detect empty state handling
  const hasEmptyState =
    requirement.includes('empty') ||
    requirement.includes('no results') ||
    requirement.includes('no items');

  // Detect hover feedback (usually not detectable from intent)
  const hasHoverFeedback = requirement.includes('hover') || requirement.includes('tooltip');

  return {
    hasLoadingState,
    hasSuccessFeedback,
    hasProgressIndicator,
    hasEmptyState,
    hasHoverFeedback,
  };
}

/**
 * Extract error handling signals from chain
 */
function extractErrorHandling(chain: IntentCausalChain): ErrorHandlingSignals {
  const intent = chain.intent;
  const requirement = intent.requirement.toLowerCase();
  const category = intent.category;

  // Detect error state
  const hasErrorState =
    chain.foundState?.stateName.toLowerCase().includes('error') ||
    requirement.includes('error') ||
    category === 'error_handling';

  // Detect error message
  const hasErrorMessage =
    requirement.includes('error message') ||
    requirement.includes('show error') ||
    chain.foundOutcome?.outcomeType === 'error_display';

  // Detect retry option
  const hasRetryOption = requirement.includes('retry') || requirement.includes('try again');

  // Detect validation feedback
  const hasValidationFeedback =
    requirement.includes('validation') ||
    requirement.includes('invalid') ||
    requirement.includes('required field');

  // Detect fallback behavior
  const hasFallbackBehavior =
    requirement.includes('fallback') ||
    requirement.includes('default') ||
    requirement.includes('offline');

  return {
    hasErrorState,
    hasErrorMessage,
    hasRetryOption,
    hasValidationFeedback,
    hasFallbackBehavior,
  };
}

/**
 * Extract external effect signals from chain
 */
function extractExternalEffects(chain: IntentCausalChain): ExternalEffectSignals {
  const intent = chain.intent;
  const requirement = intent.requirement.toLowerCase();
  const category = intent.category;

  // Detect API call
  const hasApiCall =
    requirement.includes('api') ||
    requirement.includes('fetch') ||
    requirement.includes('request') ||
    requirement.includes('server') ||
    category === 'data_mutation';

  // Detect persistence
  const hasPersistence =
    requirement.includes('save') ||
    requirement.includes('store') ||
    requirement.includes('persist') ||
    requirement.includes('database');

  // Detect notification
  const hasNotification =
    requirement.includes('notify') ||
    requirement.includes('notification') ||
    requirement.includes('alert') ||
    requirement.includes('email');

  // Detect external anchor (from ERA)
  const hasExternalAnchor = chain.outcomeScores.external !== null;

  // Detect real-world effect
  const hasRealWorldEffect =
    requirement.includes('payment') ||
    requirement.includes('order') ||
    requirement.includes('ship') ||
    requirement.includes('send') ||
    requirement.includes('publish');

  return {
    hasApiCall,
    hasPersistence,
    hasNotification,
    hasExternalAnchor,
    hasRealWorldEffect,
  };
}

/**
 * Calculate UVD penalties for an intent
 */
export function calculateUVDPenalties(
  chain: IntentCausalChain,
  components: UVDComponents
): UVDPenalty[] {
  const penalties: UVDPenalty[] = [];
  const intent = chain.intent;
  const category = intent.category;

  // ==========================================
  // CAUSAL CHAIN PENALTIES
  // ==========================================

  // No trigger penalty
  if (!chain.foundTrigger && chain.intent.expectedTrigger) {
    penalties.push({
      type: 'NO_TRIGGER',
      deduction: UVD_PENALTIES.NO_TRIGGER,
      reason: 'Intent has no trigger mechanism - user cannot initiate this behavior',
    });
  }

  // No state penalty
  if (!chain.foundState && chain.intent.expectedState) {
    penalties.push({
      type: 'NO_STATE',
      deduction: UVD_PENALTIES.NO_STATE,
      reason: 'Intent has no state management - behavior cannot persist or update',
    });
  }

  // No effect penalty (trigger doesn't connect to state)
  if (chain.axisScores.effect === 0 && chain.foundTrigger && chain.foundState) {
    penalties.push({
      type: 'NO_EFFECT',
      deduction: UVD_PENALTIES.NO_EFFECT,
      reason: 'Trigger does not connect to state - action has no effect',
    });
  }

  // No outcome penalty
  if (!chain.foundOutcome && chain.intent.expectedOutcome) {
    penalties.push({
      type: 'NO_OUTCOME',
      deduction: UVD_PENALTIES.NO_OUTCOME,
      reason: 'Intent has no observable outcome - user sees nothing',
    });
  }

  // Shallow chain penalty
  if (components.causalChainDepth < 3 && chain.intent.expectedTrigger) {
    penalties.push({
      type: 'SHALLOW_CHAIN',
      deduction: UVD_PENALTIES.SHALLOW_CHAIN,
      reason: `Causal chain depth ${components.causalChainDepth}/4 - missing links in user experience`,
    });
  }

  // ==========================================
  // BEHAVIORAL FEEDBACK PENALTIES
  // ==========================================

  // No loading state for async operations
  const isAsyncOperation =
    category === 'data_mutation' ||
    category === 'form_submission' ||
    category === 'search' ||
    components.externalEffects.hasApiCall;

  if (isAsyncOperation && !components.behavioralFeedback.hasLoadingState) {
    penalties.push({
      type: 'NO_LOADING_STATE',
      deduction: UVD_PENALTIES.NO_LOADING_STATE,
      reason: 'Async operation without loading indicator - user left waiting blindly',
    });
  }

  // No success feedback for mutations
  const isMutation =
    category === 'data_mutation' ||
    category === 'form_submission' ||
    components.externalEffects.hasPersistence;

  if (isMutation && !components.behavioralFeedback.hasSuccessFeedback) {
    penalties.push({
      type: 'NO_SUCCESS_FEEDBACK',
      deduction: UVD_PENALTIES.NO_SUCCESS_FEEDBACK,
      reason: 'Mutation without success confirmation - user unsure if action worked',
    });
  }

  // No empty state for lists
  const isList = category === 'data_display' || category === 'filtering' || category === 'search';

  if (isList && !components.behavioralFeedback.hasEmptyState && components.observableOutcomes > 0) {
    penalties.push({
      type: 'NO_EMPTY_STATE',
      deduction: UVD_PENALTIES.NO_EMPTY_STATE,
      reason: 'List without empty state handling - user confused when no items',
    });
  }

  // ==========================================
  // ERROR HANDLING PENALTIES
  // ==========================================

  // No error state for operations that can fail
  const canFail =
    isAsyncOperation ||
    components.externalEffects.hasApiCall ||
    components.externalEffects.hasPersistence;

  if (canFail && !components.errorHandling.hasErrorState) {
    penalties.push({
      type: 'NO_ERROR_STATE',
      deduction: UVD_PENALTIES.NO_ERROR_STATE,
      reason: 'Operation can fail but has no error handling - user abandoned on failure',
    });
  }

  // Error state without message
  if (components.errorHandling.hasErrorState && !components.errorHandling.hasErrorMessage) {
    penalties.push({
      type: 'NO_ERROR_MESSAGE',
      deduction: UVD_PENALTIES.NO_ERROR_MESSAGE,
      reason: 'Error state without message - user knows something failed but not what',
    });
  }

  // No retry option for recoverable errors
  if (
    components.errorHandling.hasErrorState &&
    canFail &&
    !components.errorHandling.hasRetryOption
  ) {
    penalties.push({
      type: 'NO_RETRY_OPTION',
      deduction: UVD_PENALTIES.NO_RETRY_OPTION,
      reason: 'Recoverable error without retry option - user must refresh manually',
    });
  }

  // Form without validation feedback
  if (category === 'form_submission' && !components.errorHandling.hasValidationFeedback) {
    penalties.push({
      type: 'NO_VALIDATION',
      deduction: UVD_PENALTIES.NO_VALIDATION,
      reason: 'Form without validation feedback - user submits blindly',
    });
  }

  // ==========================================
  // EXTERNAL EFFECT PENALTIES
  // ==========================================

  // API call without status handling
  if (
    components.externalEffects.hasApiCall &&
    !components.behavioralFeedback.hasLoadingState &&
    !components.errorHandling.hasErrorState
  ) {
    penalties.push({
      type: 'UNACKNOWLEDGED_API',
      deduction: UVD_PENALTIES.UNACKNOWLEDGED_API,
      reason: 'API call without status handling - fire and forget, user in the dark',
    });
  }

  // Persistence without confirmation
  if (
    components.externalEffects.hasPersistence &&
    !components.behavioralFeedback.hasSuccessFeedback
  ) {
    penalties.push({
      type: 'NO_PERSISTENCE_CONFIRM',
      deduction: UVD_PENALTIES.NO_PERSISTENCE_CONFIRM,
      reason: 'Save operation without confirmation - user unsure if data was saved',
    });
  }

  // Orphan mutation (state change with no visible effect)
  if (chain.foundState && !chain.foundState.usedInRender && !chain.foundOutcome) {
    penalties.push({
      type: 'ORPHAN_MUTATION',
      deduction: UVD_PENALTIES.ORPHAN_MUTATION,
      reason: 'State change with no visible effect - action happens but user sees nothing',
    });
  }

  return penalties;
}

/**
 * Calculate UVD score for a single intent
 */
export function calculateIntentUVD(chain: IntentCausalChain): IntentUVDScore {
  const intent = chain.intent;

  // Extract components
  const components = extractUVDComponents(chain);

  // Calculate penalties
  const penalties = calculateUVDPenalties(chain, components);
  const totalPenalty = penalties.reduce((sum, p) => sum + p.deduction, 0);

  // Calculate final score (clamped to 0-1)
  const baseScore = 1.0;
  const score = Math.max(0, Math.min(1, baseScore - totalPenalty));

  // Check if this blocks shipping (critical intent with UVD < 0.5)
  const isCritical = intent.priority === 'critical';
  const blocksShip = isCritical && score < 0.5;
  const blockReason = blocksShip
    ? `Critical intent "${intent.requirement.slice(0, 40)}..." has UVD ${(score * 100).toFixed(1)}% < 50%`
    : null;

  // Generate explanation
  const explanation = generateExplanation(intent, components, penalties, score);

  return {
    intentId: intent.id,
    requirement: intent.requirement,
    priority: intent.priority,
    baseScore,
    components,
    penalties,
    totalPenalty,
    score,
    explanation,
    blocksShip,
    blockReason,
  };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  intent: IntentSpec,
  components: UVDComponents,
  penalties: UVDPenalty[],
  score: number
): string {
  const parts: string[] = [];

  // Score summary
  parts.push(`UVD Score: ${(score * 100).toFixed(1)}%`);

  // Chain depth
  parts.push(`Chain Depth: ${components.causalChainDepth}/4`);

  // Outcomes
  parts.push(`Observable Outcomes: ${components.observableOutcomes}`);

  // Penalties
  if (penalties.length > 0) {
    parts.push(`Penalties (${penalties.length}): ${penalties.map(p => p.type).join(', ')}`);
  } else {
    parts.push('No penalties');
  }

  return parts.join(' | ');
}

// ============================================
// SYSTEM UVD CALCULATION
// ============================================

/**
 * System-level UVD result
 */
export interface SystemUVDResult {
  /** Weighted mean of intent UVD scores */
  systemUVD: number;
  systemUVDPercent: string;

  /** Total weight used in calculation */
  totalWeight: number;

  /** Number of intents analyzed */
  intentsAnalyzed: number;

  /** Per-intent scores */
  intentScores: IntentUVDScore[];

  /** Intents that block shipping */
  blockingIntents: IntentUVDScore[];

  /** Overall allows ship decision */
  allowsShip: boolean;
  blockReason: string | null;

  /** Summary statistics */
  summary: {
    averageUVD: number;
    lowestUVD: number;
    highestUVD: number;
    criticalIntentsCount: number;
    criticalIntentsBlocked: number;
    totalPenaltiesApplied: number;
  };
}

/**
 * UVD thresholds
 */
export const UVD_THRESHOLDS = Object.freeze({
  CRITICAL_INTENT_MIN: 0.5, // Critical intent must have UVD >= 0.5
  SYSTEM_MIN: 0.6, // System UVD must be >= 0.6
});

/**
 * Compute System UVD from intent chains
 */
export function computeSystemUVD(chains: IntentCausalChain[]): SystemUVDResult {
  console.log('[UVDL] ==========================================');
  console.log('[UVDL] USER VALUE DENSITY LAYER');
  console.log('[UVDL] ==========================================');
  console.log(`[UVDL] Analyzing ${chains.length} intents`);

  if (chains.length === 0) {
    console.log('[UVDL] No intents to analyze');
    return {
      systemUVD: 1.0,
      systemUVDPercent: '100.0%',
      totalWeight: 0,
      intentsAnalyzed: 0,
      intentScores: [],
      blockingIntents: [],
      allowsShip: true,
      blockReason: null,
      summary: {
        averageUVD: 1.0,
        lowestUVD: 1.0,
        highestUVD: 1.0,
        criticalIntentsCount: 0,
        criticalIntentsBlocked: 0,
        totalPenaltiesApplied: 0,
      },
    };
  }

  // Calculate UVD for each intent
  const intentScores: IntentUVDScore[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  let totalPenalties = 0;

  for (const chain of chains) {
    const uvdScore = calculateIntentUVD(chain);
    intentScores.push(uvdScore);

    // Weight by priority
    const weight = CRITICALITY_WEIGHTS[chain.intent.priority];
    totalWeight += weight;
    weightedSum += uvdScore.score * weight;
    totalPenalties += uvdScore.penalties.length;

    console.log(
      `[UVDL]   ${uvdScore.intentId}: ${(uvdScore.score * 100).toFixed(1)}% (${uvdScore.penalties.length} penalties)`
    );
  }

  // Calculate system UVD (weighted mean)
  const systemUVD = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  console.log('[UVDL] ------------------------------------------');
  console.log(`[UVDL] System UVD: ${(systemUVD * 100).toFixed(1)}%`);

  // Find blocking intents
  const blockingIntents = intentScores.filter(s => s.blocksShip);

  // Determine if shipping is allowed
  let allowsShip = true;
  let blockReason: string | null = null;

  // Check critical intent threshold
  if (blockingIntents.length > 0) {
    allowsShip = false;
    blockReason = `${blockingIntents.length} critical intent(s) have UVD < 50%: ${blockingIntents.map(b => b.intentId).join(', ')}`;
    console.log(`[UVDL] ❌ BLOCKED: ${blockReason}`);
  }

  // Check system UVD threshold
  if (systemUVD < UVD_THRESHOLDS.SYSTEM_MIN) {
    allowsShip = false;
    const reason = `System UVD ${(systemUVD * 100).toFixed(1)}% < ${(UVD_THRESHOLDS.SYSTEM_MIN * 100).toFixed(1)}% threshold`;
    blockReason = blockReason ? `${blockReason}; ${reason}` : reason;
    console.log(`[UVDL] ❌ BLOCKED: ${reason}`);
  }

  // Calculate summary statistics
  const scores = intentScores.map(s => s.score);
  const criticalIntents = intentScores.filter(s => s.priority === 'critical');

  const summary = {
    averageUVD: scores.reduce((a, b) => a + b, 0) / scores.length,
    lowestUVD: Math.min(...scores),
    highestUVD: Math.max(...scores),
    criticalIntentsCount: criticalIntents.length,
    criticalIntentsBlocked: blockingIntents.length,
    totalPenaltiesApplied: totalPenalties,
  };

  console.log(`[UVDL] Average UVD: ${(summary.averageUVD * 100).toFixed(1)}%`);
  console.log(
    `[UVDL] Range: ${(summary.lowestUVD * 100).toFixed(1)}% - ${(summary.highestUVD * 100).toFixed(1)}%`
  );
  console.log(
    `[UVDL] Critical Intents: ${summary.criticalIntentsBlocked}/${summary.criticalIntentsCount} blocked`
  );
  console.log(`[UVDL] Total Penalties: ${summary.totalPenaltiesApplied}`);
  console.log(`[UVDL] Allows Ship: ${allowsShip}`);
  console.log('[UVDL] ==========================================');

  return {
    systemUVD,
    systemUVDPercent: `${(systemUVD * 100).toFixed(1)}%`,
    totalWeight,
    intentsAnalyzed: intentScores.length,
    intentScores,
    blockingIntents,
    allowsShip,
    blockReason,
    summary,
  };
}

// ============================================
// HOSTILE LOW-VALUE INTENTS
// ============================================

/**
 * Hostile low-value intent case
 * These PASS IAL and IRCL but FAIL UVDL
 */
export interface HostileLowValueCase {
  id: string;
  intentText: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Why it passes IAL (has minimum capabilities)
  iasReason: string;

  // Why it passes IRCL (not contradictory or impossible)
  irclReason: string;

  // Why it fails UVDL (low user value)
  uvdlReason: string;
  expectedPenalties: (keyof typeof UVD_PENALTIES)[];
  expectedUVD: number; // Expected score (should be low)

  mustBlock: true;
}

/**
 * Hand-crafted hostile low-value intents
 * These are technically adequate but experientially worthless
 */
export const HOSTILE_LOW_VALUE_INTENTS: readonly HostileLowValueCase[] = Object.freeze([
  {
    id: 'hostile-lowvalue-001',
    intentText: 'User can click a button that updates internal state',
    category: 'state_toggle',
    priority: 'critical',
    iasReason: 'Has trigger (button) and state management - passes generic domain requirements',
    irclReason: 'Intent is clear, specific, and achievable - not contradictory',
    uvdlReason:
      'State change with no visible effect. User clicks, nothing happens visually. Technically correct, experientially dead.',
    expectedPenalties: ['ORPHAN_MUTATION', 'NO_OUTCOME', 'NO_SUCCESS_FEEDBACK'],
    expectedUVD: 0.45, // < 0.5 critical threshold
    mustBlock: true,
  },
  {
    id: 'hostile-lowvalue-002',
    intentText: 'System fetches data from API and stores it in state',
    category: 'data_display',
    priority: 'high',
    iasReason: 'Has data display capability, reads from external source - passes CRUD requirements',
    irclReason: 'Intent is implementable with clear trigger (load) and state pattern',
    uvdlReason:
      'API call with no loading state, no error handling, no success feedback. Data exists but user experience is empty.',
    expectedPenalties: ['NO_LOADING_STATE', 'NO_ERROR_STATE', 'UNACKNOWLEDGED_API', 'NO_OUTCOME'],
    expectedUVD: 0.4,
    mustBlock: true,
  },
  {
    id: 'hostile-lowvalue-003',
    intentText: 'Form accepts user input and saves to database',
    category: 'form_submission',
    priority: 'critical',
    iasReason: 'Has form submission and persistence - passes form domain requirements',
    irclReason: 'Intent specifies clear flow: input → submit → persist',
    uvdlReason:
      'No validation feedback, no success confirmation, no error handling, no loading state. User submits into void.',
    expectedPenalties: [
      'NO_VALIDATION',
      'NO_SUCCESS_FEEDBACK',
      'NO_ERROR_STATE',
      'NO_LOADING_STATE',
      'NO_PERSISTENCE_CONFIRM',
    ],
    expectedUVD: 0.42, // < 0.5 critical threshold
    mustBlock: true,
  },
]);

/**
 * Result of hostile low-value validation
 */
export interface HostileLowValueValidation {
  total: number;
  blocked: number;
  leaked: number;
  results: HostileLowValueResult[];
  validationPassed: boolean;
}

export interface HostileLowValueResult {
  caseId: string;
  intentText: string;
  expectedUVD: number;
  simulatedUVD: number;
  wasBlocked: boolean;
  leaked: boolean;
  penalties: string[];
}

/**
 * Run hostile low-value intent validation
 */
export function runHostileLowValueValidation(): HostileLowValueValidation {
  console.log('[UVDL] ==========================================');
  console.log('[UVDL] HOSTILE LOW-VALUE VALIDATION');
  console.log('[UVDL] ==========================================');
  console.log(`[UVDL] Testing ${HOSTILE_LOW_VALUE_INTENTS.length} low-value cases`);

  const results: HostileLowValueResult[] = [];
  let blocked = 0;
  let leaked = 0;

  for (const hostileCase of HOSTILE_LOW_VALUE_INTENTS) {
    // Simulate UVD calculation for this case
    const totalPenalty = hostileCase.expectedPenalties.reduce(
      (sum, p) => sum + UVD_PENALTIES[p],
      0
    );
    const simulatedUVD = Math.max(0, 1.0 - totalPenalty);

    // Check if it would be blocked
    const isCritical = hostileCase.priority === 'critical';
    const blockedByCritical = isCritical && simulatedUVD < UVD_THRESHOLDS.CRITICAL_INTENT_MIN;
    const blockedBySystem = simulatedUVD < UVD_THRESHOLDS.SYSTEM_MIN;
    const wasBlocked = blockedByCritical || blockedBySystem;
    const isLeak = !wasBlocked;

    if (wasBlocked) {
      blocked++;
    } else {
      leaked++;
    }

    results.push({
      caseId: hostileCase.id,
      intentText: hostileCase.intentText,
      expectedUVD: hostileCase.expectedUVD,
      simulatedUVD,
      wasBlocked,
      leaked: isLeak,
      penalties: hostileCase.expectedPenalties,
    });

    // Log result
    if (wasBlocked) {
      console.log(`[UVDL] ✓ ${hostileCase.id}: BLOCKED (UVD=${(simulatedUVD * 100).toFixed(1)}%)`);
    } else {
      console.log(`[UVDL] ✗ ${hostileCase.id}: LEAKED (UVD=${(simulatedUVD * 100).toFixed(1)}%)`);
    }
  }

  const validationPassed = leaked === 0;

  console.log('[UVDL] ------------------------------------------');
  console.log(`[UVDL] Total: ${HOSTILE_LOW_VALUE_INTENTS.length}`);
  console.log(`[UVDL] Blocked: ${blocked}`);
  console.log(`[UVDL] Leaked: ${leaked}`);
  console.log(`[UVDL] Validation: ${validationPassed ? 'PASSED' : 'FAILED'}`);
  console.log('[UVDL] ==========================================');

  return {
    total: HOSTILE_LOW_VALUE_INTENTS.length,
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
 * Check if UVDL allows shipping
 */
export function uvdlAllowsShip(result: SystemUVDResult): boolean {
  return result.allowsShip;
}

/**
 * Get UVDL output for build artifact
 */
export function getUVDLOutput(result: SystemUVDResult): {
  systemUVD: number;
  systemUVDPercent: string;
  allowsShip: boolean;
  blockReason: string | null;
  intents: Array<{
    intentId: string;
    score: number;
    penalties: string[];
    explanation: string;
  }>;
  summary: {
    intentsAnalyzed: number;
    averageUVD: number;
    lowestUVD: number;
    criticalBlocked: number;
    totalPenalties: number;
  };
} {
  return {
    systemUVD: result.systemUVD,
    systemUVDPercent: result.systemUVDPercent,
    allowsShip: result.allowsShip,
    blockReason: result.blockReason,
    intents: result.intentScores.map(s => ({
      intentId: s.intentId,
      score: s.score,
      penalties: s.penalties.map(p => p.type),
      explanation: s.explanation,
    })),
    summary: {
      intentsAnalyzed: result.intentsAnalyzed,
      averageUVD: result.summary.averageUVD,
      lowestUVD: result.summary.lowestUVD,
      criticalBlocked: result.summary.criticalIntentsBlocked,
      totalPenalties: result.summary.totalPenaltiesApplied,
    },
  };
}

/**
 * Log UVDL summary
 */
export function logUVDLResult(result: SystemUVDResult): void {
  console.log('[UVDL] ==========================================');
  console.log('[UVDL] USER VALUE DENSITY SUMMARY');
  console.log('[UVDL] ==========================================');
  console.log(`[UVDL] System UVD: ${result.systemUVDPercent}`);
  console.log(`[UVDL] Intents: ${result.intentsAnalyzed}`);
  console.log(`[UVDL] Average: ${(result.summary.averageUVD * 100).toFixed(1)}%`);
  console.log(
    `[UVDL] Range: ${(result.summary.lowestUVD * 100).toFixed(1)}% - ${(result.summary.highestUVD * 100).toFixed(1)}%`
  );
  console.log(
    `[UVDL] Critical Blocked: ${result.summary.criticalIntentsBlocked}/${result.summary.criticalIntentsCount}`
  );
  console.log(`[UVDL] Total Penalties: ${result.summary.totalPenaltiesApplied}`);
  console.log('[UVDL] ------------------------------------------');
  console.log(`[UVDL] Ship Decision: ${result.allowsShip ? 'ALLOWED' : 'BLOCKED'}`);

  if (result.blockReason) {
    console.log(`[UVDL] Block Reason: ${result.blockReason}`);
  }

  if (result.blockingIntents.length > 0) {
    console.log('[UVDL] Blocking Intents:');
    for (const intent of result.blockingIntents) {
      console.log(`[UVDL]   - ${intent.intentId}: ${(intent.score * 100).toFixed(1)}%`);
    }
  }

  console.log('[UVDL] ==========================================');
}

/**
 * OLYMPUS 2.0 - Intent Contradiction Detection (IRCL)
 *
 * Detects when intents are ambiguous, contradictory, or impossible.
 * Generates user-level feedback for clarification.
 *
 * This layer diagnoses, not repairs.
 */

import { IntentSpec, IntentCausalChain, ICGReport, WISSReport } from './intent-graph';
import {
  IntentAssumption,
  IntentAssumptionSummary,
  extractAllAssumptions,
  getCriticalDeniedAssumptions,
} from './intent-assumptions';
import { ExternalValidationReport } from './reality-anchor';
import { GovernanceReport, GovernanceFailure } from './reality-policy';

// ============================================
// IMPOSSIBILITY CLASSIFICATION (TASK 3)
// ============================================

/**
 * Types of intent impossibility
 */
export type IntentImpossibilityType =
  | 'MISSING_EXTERNAL_DEPENDENCY' // External API/service not available
  | 'LOGICAL_CONTRADICTION' // Conflicting requirements
  | 'UNSATISFIABLE_CONSTRAINT' // Constraint cannot be met
  | 'UNDER_SPECIFIED_INTENT'; // Not enough information to implement

/**
 * Detailed impossibility record
 */
export interface IntentImpossibility {
  type: IntentImpossibilityType;
  intentId: string;
  requirement: string;
  priority: string;

  // What makes it impossible
  reason: string;
  evidence: string[];

  // Related entities
  relatedIntents: string[]; // Conflicting intents
  relatedAssumptions: string[]; // Failed assumptions
  relatedAnchors: string[]; // Failed external anchors

  // Classification confidence
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  // Detected at
  detectedAt: Date;
}

// ============================================
// CONTRADICTION TYPES (TASK 2)
// ============================================

/**
 * Types of contradictions
 */
export type ContradictionType =
  | 'INTENT_VS_EXTERNAL_REALITY' // Intent expects something external doesn't provide
  | 'INTENT_VS_INTERNAL_STRUCTURE' // Intent expects something code doesn't have
  | 'INTENT_VS_INTENT'; // Two intents conflict with each other

/**
 * A detected contradiction
 */
export interface IntentContradiction {
  id: string;
  type: ContradictionType;

  // The conflicting parties
  sourceIntentId: string;
  sourceDescription: string;

  // What it conflicts with
  targetType: 'intent' | 'code' | 'external';
  targetId: string;
  targetDescription: string;

  // Nature of conflict
  conflictDescription: string;
  severity: 'BLOCKING' | 'DEGRADING' | 'WARNING';

  // Evidence
  evidence: string[];

  // Resolution hint (not a fix, just direction)
  clarificationNeeded: string;

  detectedAt: Date;
}

// ============================================
// REFINEMENT STATUS
// ============================================

/**
 * Overall status of intent refinement analysis
 */
export type RefinementStatus =
  | 'CLEAR' // All intents are clear and satisfiable
  | 'AMBIGUOUS' // Some intents lack clarity
  | 'CONTRADICTORY' // Intents contradict each other or reality
  | 'IMPOSSIBLE'; // One or more intents cannot be satisfied

/**
 * User-facing feedback for intent issues
 */
export interface IntentUserFeedback {
  summary: string;
  status: RefinementStatus;
  requiredClarifications: RequiredClarification[];
  impossibleIntents: IntentImpossibility[];
  recommendedActions: string[];
}

/**
 * A specific clarification needed from user
 */
export interface RequiredClarification {
  intentId: string;
  requirement: string;
  question: string;
  context: string;
  suggestedOptions?: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Complete refinement report
 */
export interface IntentRefinementReport {
  status: RefinementStatus;
  analyzedAt: Date;

  // Assumptions
  assumptions: IntentAssumptionSummary[];
  totalAssumptions: number;
  deniedAssumptions: number;
  criticalDeniedAssumptions: number;

  // Contradictions
  contradictions: IntentContradiction[];
  blockingContradictions: number;

  // Impossibilities
  impossibilities: IntentImpossibility[];

  // User feedback
  userFeedback: IntentUserFeedback;

  // Can we proceed with build?
  canProceed: boolean;
  proceedBlocker: string | null;
}

// ============================================
// CONTRADICTION DETECTION
// ============================================

let contradictionIdCounter = 0;

function generateContradictionId(): string {
  return `contradiction-${++contradictionIdCounter}`;
}

/**
 * Detect Intent vs External Reality contradictions
 * Uses ERA (External Reality Anchors) and RGL (Governance) results
 */
export function detectExternalRealityContradictions(
  chains: IntentCausalChain[],
  eraReport: ExternalValidationReport | null,
  governanceReport: GovernanceReport | null
): IntentContradiction[] {
  const contradictions: IntentContradiction[] = [];

  if (!eraReport) return contradictions;

  // Check for ERA failures
  for (const detail of eraReport.details) {
    if (detail.status !== 'PASSED') {
      const chain = chains.find(c => c.intent.id === detail.intentId);
      if (!chain) continue;

      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_EXTERNAL_REALITY',
        sourceIntentId: detail.intentId,
        sourceDescription: chain.intent.requirement,
        targetType: 'external',
        targetId: detail.anchorId,
        targetDescription: `External anchor ${detail.anchorType}`,
        conflictDescription: detail.error || `External validation failed: ${detail.status}`,
        severity: detail.critical ? 'BLOCKING' : 'DEGRADING',
        evidence: [
          `Anchor type: ${detail.anchorType}`,
          `Status: ${detail.status}`,
          detail.error ? `Error: ${detail.error}` : '',
        ].filter(Boolean),
        clarificationNeeded: generateExternalClarification(detail, chain.intent),
        detectedAt: new Date(),
      });
    }
  }

  // Check for governance failures
  if (governanceReport) {
    for (const failure of governanceReport.failures) {
      const chain = chains.find(c => c.intent.id === failure.intentId);
      if (!chain) continue;

      // Map governance failure to contradiction
      const severity: IntentContradiction['severity'] = failure.critical ? 'BLOCKING' : 'DEGRADING';
      let conflictDescription: string;

      switch (failure.type) {
        case 'FLAKY_REALITY':
          conflictDescription = 'External reality is flaky/non-deterministic';
          break;
        case 'UNTRUSTWORTHY_REALITY':
          conflictDescription = 'External reality is untrustworthy (low confidence)';
          break;
        case 'INSUFFICIENT_EVIDENCE':
          conflictDescription = 'Not enough evidence to validate against external reality';
          break;
        default:
          conflictDescription = failure.message;
      }

      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_EXTERNAL_REALITY',
        sourceIntentId: failure.intentId,
        sourceDescription: chain.intent.requirement,
        targetType: 'external',
        targetId: failure.anchorId,
        targetDescription: `Governance: ${failure.type}`,
        conflictDescription,
        severity,
        evidence: [failure.message],
        clarificationNeeded: `The external validation for this intent is unreliable. Consider: Is the external dependency available? Is the expected behavior deterministic?`,
        detectedAt: new Date(),
      });
    }
  }

  return contradictions;
}

/**
 * Detect Intent vs Internal Structure contradictions
 * Uses ICG axis scores to detect missing components
 */
export function detectInternalStructureContradictions(
  chains: IntentCausalChain[]
): IntentContradiction[] {
  const contradictions: IntentContradiction[] = [];

  for (const chain of chains) {
    const { axisScores, intent, gaps } = chain;

    // Missing trigger
    if (axisScores.trigger === 0 && intent.expectedTrigger) {
      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_INTERNAL_STRUCTURE',
        sourceIntentId: intent.id,
        sourceDescription: intent.requirement,
        targetType: 'code',
        targetId: `trigger:${intent.expectedTrigger.target}`,
        targetDescription: 'Missing trigger element',
        conflictDescription: `Intent expects a ${intent.expectedTrigger.type} trigger on "${intent.expectedTrigger.target}" but none was found in code`,
        severity: intent.priority === 'critical' ? 'BLOCKING' : 'DEGRADING',
        evidence: [
          `Expected trigger: ${intent.expectedTrigger.type} on ${intent.expectedTrigger.target}`,
          'No matching trigger found in codebase',
        ],
        clarificationNeeded: `Is "${intent.expectedTrigger.target}" the correct element name? Should this intent have a different trigger mechanism?`,
        detectedAt: new Date(),
      });
    }

    // Missing state
    if (axisScores.state === 0 && intent.expectedState) {
      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_INTERNAL_STRUCTURE',
        sourceIntentId: intent.id,
        sourceDescription: intent.requirement,
        targetType: 'code',
        targetId: `state:${intent.expectedState.stateName}`,
        targetDescription: 'Missing state management',
        conflictDescription: `Intent expects state "${intent.expectedState.stateName}" but no matching useState was found`,
        severity: intent.priority === 'critical' ? 'BLOCKING' : 'DEGRADING',
        evidence: [
          `Expected state: ${intent.expectedState.stateName}`,
          'No matching state hook found in codebase',
        ],
        clarificationNeeded: `Should the application manage "${intent.expectedState.stateName}" state? Is this data fetched from elsewhere?`,
        detectedAt: new Date(),
      });
    }

    // Broken effect chain (trigger doesn't connect to state)
    if (axisScores.effect === 0 && chain.foundTrigger && chain.foundState) {
      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_INTERNAL_STRUCTURE',
        sourceIntentId: intent.id,
        sourceDescription: intent.requirement,
        targetType: 'code',
        targetId: `effect:${chain.foundTrigger.handler}`,
        targetDescription: 'Broken causal chain',
        conflictDescription: `Trigger "${chain.foundTrigger.handler}" does not update state "${chain.foundState.stateName}"`,
        severity: 'BLOCKING',
        evidence: [
          `Trigger: ${chain.foundTrigger.handler} at ${chain.foundTrigger.file}:${chain.foundTrigger.line}`,
          `State: ${chain.foundState.stateName} at ${chain.foundState.file}:${chain.foundState.line}`,
          'Handler does not call state setter',
        ],
        clarificationNeeded: `Should clicking "${chain.foundTrigger.element}" update "${chain.foundState.stateName}"? Is there a different state that should be updated?`,
        detectedAt: new Date(),
      });
    }

    // Missing outcome
    if (axisScores.outcome === 0 && intent.expectedOutcome) {
      contradictions.push({
        id: generateContradictionId(),
        type: 'INTENT_VS_INTERNAL_STRUCTURE',
        sourceIntentId: intent.id,
        sourceDescription: intent.requirement,
        targetType: 'code',
        targetId: `outcome:${intent.expectedOutcome.target}`,
        targetDescription: 'Missing observable outcome',
        conflictDescription: `Intent expects "${intent.expectedOutcome.target}" to ${intent.expectedOutcome.assertion.type} but no matching render was found`,
        severity: intent.priority === 'critical' ? 'BLOCKING' : 'WARNING',
        evidence: [
          `Expected outcome: ${intent.expectedOutcome.description}`,
          'No conditional rendering found for this outcome',
        ],
        clarificationNeeded: `How should "${intent.expectedOutcome.target}" be displayed? What conditions control its visibility?`,
        detectedAt: new Date(),
      });
    }

    // Add gaps as contradictions
    for (const gap of gaps.filter(g => g.severity === 'critical')) {
      if (
        !contradictions.some(
          c => c.sourceIntentId === intent.id && c.conflictDescription.includes(gap.message)
        )
      ) {
        contradictions.push({
          id: generateContradictionId(),
          type: 'INTENT_VS_INTERNAL_STRUCTURE',
          sourceIntentId: intent.id,
          sourceDescription: intent.requirement,
          targetType: 'code',
          targetId: `gap:${gap.type}`,
          targetDescription: gap.type,
          conflictDescription: gap.message,
          severity: 'BLOCKING',
          evidence: [gap.message],
          clarificationNeeded: gap.suggestion || 'Please clarify the expected behavior',
          detectedAt: new Date(),
        });
      }
    }
  }

  return contradictions;
}

/**
 * Detect Intent vs Intent contradictions
 * Finds conflicting requirements between intents
 */
export function detectIntentVsIntentContradictions(
  chains: IntentCausalChain[]
): IntentContradiction[] {
  const contradictions: IntentContradiction[] = [];

  // Build index of intents by state
  const intentsByState = new Map<string, IntentCausalChain[]>();
  for (const chain of chains) {
    if (chain.foundState) {
      const key = chain.foundState.stateName;
      if (!intentsByState.has(key)) {
        intentsByState.set(key, []);
      }
      intentsByState.get(key)!.push(chain);
    }
  }

  // Detect conflicting state modifications
  for (const [stateName, stateChains] of intentsByState) {
    if (stateChains.length < 2) continue;

    // Check for conflicting expected transitions
    const transitions = stateChains
      .filter(c => c.intent.expectedState?.expectedTransition)
      .map(c => ({
        chain: c,
        transition: c.intent.expectedState!.expectedTransition!,
      }));

    for (let i = 0; i < transitions.length; i++) {
      for (let j = i + 1; j < transitions.length; j++) {
        const a = transitions[i];
        const b = transitions[j];

        // Check for opposite transitions
        if (areTransitionsConflicting(a.transition, b.transition)) {
          contradictions.push({
            id: generateContradictionId(),
            type: 'INTENT_VS_INTENT',
            sourceIntentId: a.chain.intent.id,
            sourceDescription: a.chain.intent.requirement,
            targetType: 'intent',
            targetId: b.chain.intent.id,
            targetDescription: b.chain.intent.requirement,
            conflictDescription: `Both intents modify "${stateName}" but expect conflicting transitions: "${a.transition}" vs "${b.transition}"`,
            severity: 'BLOCKING',
            evidence: [
              `Intent A expects: ${a.transition}`,
              `Intent B expects: ${b.transition}`,
              `Both modify state: ${stateName}`,
            ],
            clarificationNeeded: `These two requirements conflict on how "${stateName}" should behave. Which behavior takes priority?`,
            detectedAt: new Date(),
          });
        }
      }
    }
  }

  // Detect conflicting outcomes
  const intentsByOutcome = new Map<string, IntentCausalChain[]>();
  for (const chain of chains) {
    if (chain.intent.expectedOutcome) {
      const key = chain.intent.expectedOutcome.target;
      if (!intentsByOutcome.has(key)) {
        intentsByOutcome.set(key, []);
      }
      intentsByOutcome.get(key)!.push(chain);
    }
  }

  for (const [target, outcomeChains] of intentsByOutcome) {
    if (outcomeChains.length < 2) continue;

    // Check for conflicting assertions on same target
    const assertions = outcomeChains.map(c => ({
      chain: c,
      assertion: c.intent.expectedOutcome!.assertion,
    }));

    for (let i = 0; i < assertions.length; i++) {
      for (let j = i + 1; j < assertions.length; j++) {
        const a = assertions[i];
        const b = assertions[j];

        if (areAssertionsConflicting(a.assertion, b.assertion)) {
          contradictions.push({
            id: generateContradictionId(),
            type: 'INTENT_VS_INTENT',
            sourceIntentId: a.chain.intent.id,
            sourceDescription: a.chain.intent.requirement,
            targetType: 'intent',
            targetId: b.chain.intent.id,
            targetDescription: b.chain.intent.requirement,
            conflictDescription: `Both intents expect different behaviors from "${target}": "${a.assertion.type}" vs "${b.assertion.type}"`,
            severity: 'DEGRADING',
            evidence: [
              `Intent A expects: ${target} ${a.assertion.type}`,
              `Intent B expects: ${target} ${b.assertion.type}`,
            ],
            clarificationNeeded: `How should "${target}" behave when both requirements apply?`,
            detectedAt: new Date(),
          });
        }
      }
    }
  }

  return contradictions;
}

/**
 * Check if two state transitions conflict
 */
function areTransitionsConflicting(a: string, b: string): boolean {
  const opposites = [
    ['grows', 'shrinks'],
    ['increases', 'decreases'],
    ['true', 'false'],
    ['show', 'hide'],
    ['enable', 'disable'],
    ['add', 'remove'],
    ['open', 'close'],
    ['expand', 'collapse'],
  ];

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  for (const [x, y] of opposites) {
    if ((aLower.includes(x) && bLower.includes(y)) || (aLower.includes(y) && bLower.includes(x))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two assertions conflict
 */
function areAssertionsConflicting(
  a: { type: string; value?: any },
  b: { type: string; value?: any }
): boolean {
  const conflictingTypes = [
    ['appears', 'disappears'],
    ['increases', 'decreases'],
    ['toggles', 'equals'], // toggles vs static value
  ];

  for (const [x, y] of conflictingTypes) {
    if ((a.type === x && b.type === y) || (a.type === y && b.type === x)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate clarification text for external contradiction
 */
function generateExternalClarification(
  detail: ExternalValidationReport['details'][0],
  intent: IntentSpec
): string {
  if (detail.status === 'TIMEOUT') {
    return `The external service is not responding in time. Is the endpoint available? Is the timeout expectation realistic?`;
  }

  if (detail.status === 'ERROR') {
    return `The external service returned an error. Is the API endpoint correct? Are credentials configured?`;
  }

  if (detail.status === 'FAILED') {
    return `The external reality doesn't match expectations. Is the expected value correct? Has the external service changed?`;
  }

  return `External validation failed. Please verify the external dependency is available and behaving as expected.`;
}

// ============================================
// IMPOSSIBILITY CLASSIFICATION
// ============================================

/**
 * Classify impossibilities from contradictions and assumptions
 */
export function classifyImpossibilities(
  chains: IntentCausalChain[],
  assumptions: IntentAssumptionSummary[],
  contradictions: IntentContradiction[]
): IntentImpossibility[] {
  const impossibilities: IntentImpossibility[] = [];

  // 1. Critical denied assumptions → MISSING_EXTERNAL_DEPENDENCY or UNSATISFIABLE_CONSTRAINT
  const criticalDenied = getCriticalDeniedAssumptions(assumptions);
  for (const assumption of criticalDenied) {
    const chain = chains.find(c => c.intent.id === assumption.intentId);
    if (!chain) continue;

    const type: IntentImpossibilityType =
      assumption.category === 'API_AVAILABLE' ||
      assumption.category === 'NETWORK_AVAILABLE' ||
      assumption.category === 'DEPENDENCY_PRESENT'
        ? 'MISSING_EXTERNAL_DEPENDENCY'
        : 'UNSATISFIABLE_CONSTRAINT';

    impossibilities.push({
      type,
      intentId: assumption.intentId,
      requirement: chain.intent.requirement,
      priority: chain.intent.priority,
      reason: `Critical assumption "${assumption.description}" was denied`,
      evidence: [assumption.description, assumption.validationEvidence || 'No evidence available'],
      relatedIntents: [],
      relatedAssumptions: [assumption.id],
      relatedAnchors: [],
      confidence: 'HIGH',
      detectedAt: new Date(),
    });
  }

  // 2. Blocking contradictions → Classify by type
  const blockingContradictions = contradictions.filter(c => c.severity === 'BLOCKING');

  for (const contradiction of blockingContradictions) {
    const chain = chains.find(c => c.intent.id === contradiction.sourceIntentId);
    if (!chain) continue;

    // Skip if already marked impossible
    if (impossibilities.some(i => i.intentId === contradiction.sourceIntentId)) continue;

    let type: IntentImpossibilityType;
    let reason: string;

    switch (contradiction.type) {
      case 'INTENT_VS_EXTERNAL_REALITY':
        type = 'MISSING_EXTERNAL_DEPENDENCY';
        reason = `External dependency not available: ${contradiction.conflictDescription}`;
        break;

      case 'INTENT_VS_INTENT':
        type = 'LOGICAL_CONTRADICTION';
        reason = `Conflicts with intent "${contradiction.targetId}": ${contradiction.conflictDescription}`;
        break;

      case 'INTENT_VS_INTERNAL_STRUCTURE':
        type = 'UNSATISFIABLE_CONSTRAINT';
        reason = `Code structure doesn't support: ${contradiction.conflictDescription}`;
        break;

      default:
        type = 'UNSATISFIABLE_CONSTRAINT';
        reason = contradiction.conflictDescription;
    }

    impossibilities.push({
      type,
      intentId: contradiction.sourceIntentId,
      requirement: chain.intent.requirement,
      priority: chain.intent.priority,
      reason,
      evidence: contradiction.evidence,
      relatedIntents: contradiction.type === 'INTENT_VS_INTENT' ? [contradiction.targetId] : [],
      relatedAssumptions: [],
      relatedAnchors: contradiction.targetType === 'external' ? [contradiction.targetId] : [],
      confidence: 'MEDIUM',
      detectedAt: new Date(),
    });
  }

  // 3. Check for under-specified intents (all axes unknown or very low)
  for (const chain of chains) {
    // Skip if already marked impossible
    if (impossibilities.some(i => i.intentId === chain.intent.id)) continue;

    const { axisScores, foundTrigger, foundState, foundOutcome } = chain;
    const totalScore =
      axisScores.trigger + axisScores.state + axisScores.effect + axisScores.outcome;

    // If everything is missing and no elements found
    if (totalScore === 0 && !foundTrigger && !foundState && !foundOutcome) {
      impossibilities.push({
        type: 'UNDER_SPECIFIED_INTENT',
        intentId: chain.intent.id,
        requirement: chain.intent.requirement,
        priority: chain.intent.priority,
        reason: 'Intent is too vague to implement - no code artifacts could be traced',
        evidence: [
          'No trigger found',
          'No state management found',
          'No outcome rendering found',
          'All axis scores are 0',
        ],
        relatedIntents: [],
        relatedAssumptions: [],
        relatedAnchors: [],
        confidence: 'HIGH',
        detectedAt: new Date(),
      });
    }
  }

  return impossibilities;
}

// ============================================
// USER FEEDBACK GENERATION (TASK 4)
// ============================================

/**
 * Generate user-facing feedback from analysis
 */
export function generateUserFeedback(
  chains: IntentCausalChain[],
  assumptions: IntentAssumptionSummary[],
  contradictions: IntentContradiction[],
  impossibilities: IntentImpossibility[]
): IntentUserFeedback {
  // Determine overall status
  let status: RefinementStatus;

  if (impossibilities.length > 0) {
    status = 'IMPOSSIBLE';
  } else if (contradictions.filter(c => c.severity === 'BLOCKING').length > 0) {
    status = 'CONTRADICTORY';
  } else if (contradictions.length > 0 || assumptions.some(s => s.unknownAssumptions > 0)) {
    status = 'AMBIGUOUS';
  } else {
    status = 'CLEAR';
  }

  // Generate clarifications
  const requiredClarifications = generateClarifications(chains, contradictions, impossibilities);

  // Generate summary
  const summary = generateSummary(status, impossibilities, contradictions, requiredClarifications);

  // Generate recommended actions
  const recommendedActions = generateRecommendedActions(
    status,
    impossibilities,
    contradictions,
    requiredClarifications
  );

  return {
    summary,
    status,
    requiredClarifications,
    impossibleIntents: impossibilities,
    recommendedActions,
  };
}

/**
 * Generate specific clarifications needed from user
 */
function generateClarifications(
  chains: IntentCausalChain[],
  contradictions: IntentContradiction[],
  impossibilities: IntentImpossibility[]
): RequiredClarification[] {
  const clarifications: RequiredClarification[] = [];

  // From impossibilities
  for (const imp of impossibilities) {
    const chain = chains.find(c => c.intent.id === imp.intentId);
    if (!chain) continue;

    let question: string;
    let suggestedOptions: string[] | undefined;

    switch (imp.type) {
      case 'MISSING_EXTERNAL_DEPENDENCY':
        question = 'What external service or API should this feature use?';
        suggestedOptions = [
          'Configure the missing API endpoint',
          'Use a mock/stub for development',
          'Remove this requirement',
        ];
        break;

      case 'LOGICAL_CONTRADICTION':
        question = 'Which of the conflicting requirements should take priority?';
        suggestedOptions = imp.relatedIntents.map(id => `Keep intent ${id}`);
        suggestedOptions.push('Merge both requirements differently');
        break;

      case 'UNSATISFIABLE_CONSTRAINT':
        question = 'Can this constraint be relaxed or modified?';
        suggestedOptions = [
          'Change the expected behavior',
          'Add the missing code component',
          'Remove this constraint',
        ];
        break;

      case 'UNDER_SPECIFIED_INTENT':
        question = 'Can you provide more details about what this feature should do?';
        suggestedOptions = [
          'Specify the trigger (what action starts this)',
          'Specify the outcome (what should happen)',
          'Provide an example user flow',
        ];
        break;

      default:
        question = 'Please clarify this requirement';
    }

    clarifications.push({
      intentId: imp.intentId,
      requirement: imp.requirement,
      question,
      context: imp.reason,
      suggestedOptions,
      priority: chain.intent.priority === 'critical' ? 'CRITICAL' : 'HIGH',
    });
  }

  // From blocking contradictions not already covered
  for (const contradiction of contradictions.filter(c => c.severity === 'BLOCKING')) {
    if (clarifications.some(c => c.intentId === contradiction.sourceIntentId)) continue;

    clarifications.push({
      intentId: contradiction.sourceIntentId,
      requirement: contradiction.sourceDescription,
      question: contradiction.clarificationNeeded,
      context: contradiction.conflictDescription,
      priority: 'HIGH',
    });
  }

  // Sort by priority
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  clarifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return clarifications;
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  status: RefinementStatus,
  impossibilities: IntentImpossibility[],
  contradictions: IntentContradiction[],
  clarifications: RequiredClarification[]
): string {
  switch (status) {
    case 'CLEAR':
      return 'All intents are clear and can be implemented. No contradictions or ambiguities detected.';

    case 'AMBIGUOUS':
      return `Some intents need clarification. ${clarifications.length} question(s) need to be answered before proceeding.`;

    case 'CONTRADICTORY':
      const blockingCount = contradictions.filter(c => c.severity === 'BLOCKING').length;
      return `${blockingCount} blocking contradiction(s) detected between requirements. These conflicts must be resolved before the build can proceed.`;

    case 'IMPOSSIBLE':
      const criticalImp = impossibilities.filter(i => i.priority === 'critical').length;
      if (criticalImp > 0) {
        return `${criticalImp} critical intent(s) cannot be satisfied. The build is blocked until these issues are resolved.`;
      }
      return `${impossibilities.length} intent(s) cannot be satisfied as specified. Review and modify the requirements to proceed.`;
  }
}

/**
 * Generate recommended actions
 */
function generateRecommendedActions(
  status: RefinementStatus,
  impossibilities: IntentImpossibility[],
  contradictions: IntentContradiction[],
  clarifications: RequiredClarification[]
): string[] {
  const actions: string[] = [];

  if (status === 'CLEAR') {
    actions.push('Proceed with build - all requirements are satisfiable');
    return actions;
  }

  // Group by issue type
  const missingDeps = impossibilities.filter(i => i.type === 'MISSING_EXTERNAL_DEPENDENCY');
  const logicalConflicts = impossibilities.filter(i => i.type === 'LOGICAL_CONTRADICTION');
  const unsatisfiable = impossibilities.filter(i => i.type === 'UNSATISFIABLE_CONSTRAINT');
  const underSpecified = impossibilities.filter(i => i.type === 'UNDER_SPECIFIED_INTENT');

  if (missingDeps.length > 0) {
    actions.push(`Configure ${missingDeps.length} missing external dependency/dependencies`);
  }

  if (logicalConflicts.length > 0) {
    actions.push(
      `Resolve ${logicalConflicts.length} conflicting requirement(s) by choosing which takes priority`
    );
  }

  if (unsatisfiable.length > 0) {
    actions.push(`Modify ${unsatisfiable.length} constraint(s) that cannot be satisfied`);
  }

  if (underSpecified.length > 0) {
    actions.push(`Provide more detail for ${underSpecified.length} under-specified intent(s)`);
  }

  if (clarifications.filter(c => c.priority === 'CRITICAL').length > 0) {
    actions.push('Answer critical clarification questions before proceeding');
  }

  return actions;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Run complete Intent Refinement & Contradiction analysis
 */
export function runIntentRefinementAnalysis(
  icgReport: ICGReport,
  eraReport: ExternalValidationReport | null,
  governanceReport: GovernanceReport | null
): IntentRefinementReport {
  console.log('[IRCL] ==========================================');
  console.log('[IRCL] INTENT REFINEMENT & CONTRADICTION LAYER');
  console.log('[IRCL] ==========================================');

  const chains = icgReport.chains;

  // Step 1: Extract assumptions
  console.log('[IRCL] Step 1: Extracting intent assumptions...');
  const assumptions = extractAllAssumptions(chains);
  const totalAssumptions = assumptions.reduce((sum, s) => sum + s.totalAssumptions, 0);
  const deniedAssumptions = assumptions.reduce((sum, s) => sum + s.deniedAssumptions, 0);
  const criticalDeniedAssumptions = assumptions.reduce((sum, s) => sum + s.criticalDenied, 0);
  console.log(
    `[IRCL]   Extracted ${totalAssumptions} assumptions (${deniedAssumptions} denied, ${criticalDeniedAssumptions} critical)`
  );

  // Step 2: Detect contradictions
  console.log('[IRCL] Step 2: Detecting contradictions...');
  const externalContradictions = detectExternalRealityContradictions(
    chains,
    eraReport,
    governanceReport
  );
  const internalContradictions = detectInternalStructureContradictions(chains);
  const intentContradictions = detectIntentVsIntentContradictions(chains);
  const contradictions = [
    ...externalContradictions,
    ...internalContradictions,
    ...intentContradictions,
  ];
  const blockingContradictions = contradictions.filter(c => c.severity === 'BLOCKING').length;
  console.log(
    `[IRCL]   Found ${contradictions.length} contradictions (${blockingContradictions} blocking)`
  );
  console.log(`[IRCL]     - External reality: ${externalContradictions.length}`);
  console.log(`[IRCL]     - Internal structure: ${internalContradictions.length}`);
  console.log(`[IRCL]     - Intent vs intent: ${intentContradictions.length}`);

  // Step 3: Classify impossibilities
  console.log('[IRCL] Step 3: Classifying impossibilities...');
  const impossibilities = classifyImpossibilities(chains, assumptions, contradictions);
  console.log(`[IRCL]   Found ${impossibilities.length} impossible intent(s)`);
  for (const imp of impossibilities) {
    console.log(`[IRCL]     - ${imp.type}: ${imp.requirement.slice(0, 40)}...`);
  }

  // Step 4: Generate user feedback
  console.log('[IRCL] Step 4: Generating user feedback...');
  const userFeedback = generateUserFeedback(chains, assumptions, contradictions, impossibilities);
  console.log(`[IRCL]   Status: ${userFeedback.status}`);
  console.log(`[IRCL]   Clarifications needed: ${userFeedback.requiredClarifications.length}`);

  // Determine if we can proceed
  // IRCL POLICY: Only CLEAR allows shipping
  // - CLEAR → Proceed
  // - AMBIGUOUS → BLOCK (clarification required)
  // - CONTRADICTORY → BLOCK (intent correction required)
  // - IMPOSSIBLE → BLOCK (intent revision required)
  // There is NO ship-with-warning for intent flaws.
  const canProceed = userFeedback.status === 'CLEAR';

  const proceedBlocker = !canProceed ? userFeedback.summary : null;

  console.log('[IRCL] ------------------------------------------');
  console.log(`[IRCL] RESULT: ${canProceed ? 'CAN PROCEED' : 'BLOCKED'}`);
  if (proceedBlocker) {
    console.log(`[IRCL] Blocker: ${proceedBlocker}`);
  }
  console.log('[IRCL] ==========================================');

  return {
    status: userFeedback.status,
    analyzedAt: new Date(),
    assumptions,
    totalAssumptions,
    deniedAssumptions,
    criticalDeniedAssumptions,
    contradictions,
    blockingContradictions,
    impossibilities,
    userFeedback,
    canProceed,
    proceedBlocker,
  };
}

// ============================================
// LOGGING
// ============================================

export function logIntentRefinementReport(report: IntentRefinementReport): void {
  console.log('[IRCL] ==========================================');
  console.log('[IRCL] INTENT REFINEMENT REPORT');
  console.log('[IRCL] ==========================================');
  console.log(`[IRCL] Status: ${report.status}`);
  console.log(`[IRCL] Can Proceed: ${report.canProceed}`);
  console.log(
    `[IRCL] Assumptions: ${report.totalAssumptions} (${report.criticalDeniedAssumptions} critical denied)`
  );
  console.log(
    `[IRCL] Contradictions: ${report.contradictions.length} (${report.blockingContradictions} blocking)`
  );
  console.log(`[IRCL] Impossibilities: ${report.impossibilities.length}`);

  if (report.userFeedback.requiredClarifications.length > 0) {
    console.log('[IRCL] ------------------------------------------');
    console.log('[IRCL] REQUIRED CLARIFICATIONS:');
    for (const clarification of report.userFeedback.requiredClarifications.slice(0, 5)) {
      console.log(`[IRCL]   [${clarification.priority}] ${clarification.intentId}`);
      console.log(`[IRCL]     Q: ${clarification.question}`);
    }
  }

  if (!report.canProceed && report.proceedBlocker) {
    console.log('[IRCL] ------------------------------------------');
    console.log(`[IRCL] BLOCKER: ${report.proceedBlocker}`);
  }

  console.log('[IRCL] ==========================================');
}

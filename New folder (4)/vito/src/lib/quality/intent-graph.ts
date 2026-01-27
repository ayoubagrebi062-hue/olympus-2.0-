/**
 * OLYMPUS 2.0 - Intent-Causal Graph (ICG)
 *
 * Bridges the gap between WHAT the user asked for and WHAT the code does.
 *
 * This is NOT validation of mechanics.
 * This is validation of MEANING.
 *
 * The question changes from:
 *   "Did something happen?" → "Did the RIGHT thing happen for the RIGHT reason?"
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// INTENT SPECIFICATION
// ============================================

/** What the user actually wants (extracted from Scope/Oracle) */
export interface IntentSpec {
  id: string;                    // Unique identifier
  requirement: string;           // Human-readable requirement
  category: IntentCategory;      // Type of intent
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'oracle' | 'scope' | 'empathy' | 'user';

  // Expected causal chain
  expectedTrigger?: TriggerSpec;
  expectedState?: StateSpec;
  expectedOutcome?: OutcomeSpec;
}

export type IntentCategory =
  | 'navigation'      // "User can go to settings"
  | 'data_display'    // "Show list of tasks"
  | 'data_mutation'   // "User can add a task"
  | 'filtering'       // "Filter tasks by status"
  | 'search'          // "Search for items"
  | 'form_submission' // "Submit contact form"
  | 'authentication'  // "User can login"
  | 'state_toggle'    // "Toggle dark mode"
  | 'feedback'        // "Show success message"
  | 'loading'         // "Show loading state"
  | 'error_handling'; // "Show error on failure"

/** Expected trigger for an intent */
export interface TriggerSpec {
  type: 'click' | 'submit' | 'change' | 'load' | 'navigation';
  target: string;       // "FilterButton", "AddTaskForm", "SearchInput"
  targetPattern?: RegExp; // Pattern to match in code
}

/** Expected state change for an intent */
export interface StateSpec {
  stateName: string;           // "filter", "tasks", "isLoading"
  statePattern?: RegExp;       // Pattern to match useState
  derivedState?: string[];     // State computed from this state
  expectedTransition?: string; // "empty → populated", "false → true"
}

/** Expected observable outcome */
export interface OutcomeSpec {
  type: OutcomeType;
  target: string;              // "TaskList", "ErrorMessage", "LoadingSpinner"
  assertion: OutcomeAssertion;
  description: string;         // Human-readable description
}

export type OutcomeType =
  | 'list_change'       // List length changes
  | 'visibility_toggle' // Element appears/disappears
  | 'content_change'    // Text/content changes
  | 'navigation'        // Route changes
  | 'class_change'      // CSS class toggles
  | 'attribute_change'  // Attribute value changes
  | 'error_display'     // Error message appears
  | 'loading_state';    // Loading indicator

export interface OutcomeAssertion {
  type: 'increases' | 'decreases' | 'changes' | 'appears' | 'disappears' | 'toggles' | 'equals';
  value?: string | number;
  tolerance?: number;
}

// ============================================
// INTENT-CAUSAL CHAIN
// ============================================

/** A complete chain from intent to proof */
export interface IntentCausalChain {
  intent: IntentSpec;

  // What we found in the code
  foundTrigger: FoundTrigger | null;
  foundState: FoundState | null;
  foundOutcome: FoundOutcome | null;

  // W-ISS-D: Decomposed scoring per axis (0.0 - 1.0)
  axisScores: {
    trigger: number;   // Did we find the expected trigger?
    state: number;     // Did we find the expected state management?
    effect: number;    // Does the trigger connect to state?
    outcome: number;   // Is the outcome observable in render? (COMBINED score)
  };

  // ERA: External Reality Anchor scores for outcome axis
  outcomeScores: {
    internal: number;               // Code structure outcome (render validation)
    external: number | null;        // External anchor validation (null = no anchors)
    trustScore: number;             // RGL: Trust score for external validation (0-1)
    trustAdjustedExternal: number | null;  // external * trustScore
    combined: number;               // min(internal, trustAdjustedExternal) when external exists
  };

  // Computed scores
  rawScore: number;      // Average of axis scores (0.0 - 1.0)
  weightedScore: number; // rawScore × criticality weight

  // Satisfaction
  satisfied: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  gaps: IntentGap[];
}

// ============================================
// W-ISS-D: WEIGHTED INTENT SATISFACTION SCORE - DECOMPOSED
// ============================================

/** Criticality weights for intent priority */
export const CRITICALITY_WEIGHTS: Record<IntentSpec['priority'], number> = {
  critical: 4.0,  // 4× weight
  high: 2.0,      // 2× weight
  medium: 1.0,    // 1× weight (baseline)
  low: 0.5,       // 0.5× weight
};

/** W-ISS-D thresholds */
export const WISS_THRESHOLDS = {
  SHIP: 100,           // 100% = can ship
  WARNING: 98,         // 98-99% = pass with visible warning
  HARD_FAIL: 95,       // <95% = hard fail
  CRITICAL_REQUIRED: 1.0, // Any CRITICAL intent must have score = 1.0
};

/** W-ISS-D Report */
export interface WISSReport {
  score: number;           // 0-100, the final W-ISS-D score
  status: 'SHIP' | 'WARNING' | 'FAIL';

  // Decomposed metrics
  totalWeight: number;
  achievedWeight: number;

  // Critical intent enforcement
  criticalIntentsTotal: number;
  criticalIntentsSatisfied: number;
  criticalBlocker: boolean;  // Any critical intent < 1.0 blocks shipping

  // Breakdown by axis
  axisAverages: {
    trigger: number;
    state: number;
    effect: number;
    outcome: number;
  };

  // Blocking intents (critical intents that failed)
  blockers: Array<{
    intentId: string;
    requirement: string;
    score: number;
    missingAxes: string[];
  }>;
}

export interface FoundTrigger {
  file: string;
  line: number;
  element: string;      // "button", "form", "input"
  handler: string;      // Handler function name
  handlerCode: string;  // Actual handler code
}

export interface FoundState {
  file: string;
  line: number;
  stateName: string;
  setter: string;
  usedInHandler: boolean;
  usedInRender: boolean;
  derivedFrom?: string[];
}

export interface FoundOutcome {
  file: string;
  line: number;
  outcomeType: OutcomeType;
  targetElement: string;
  conditional: boolean;    // Is it conditionally rendered?
  dependsOnState: string[];
}

export interface IntentGap {
  type: 'missing_trigger' | 'missing_state' | 'missing_outcome' | 'broken_chain' | 'weak_assertion';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// ============================================
// INTENT-CAUSAL GRAPH REPORT
// ============================================

export interface ICGReport {
  passed: boolean;
  intentSatisfactionScore: number;  // 0-100 (legacy, use wiss.score instead)

  // W-ISS-D: The primary metric
  wiss: WISSReport;

  totalIntents: number;
  satisfiedIntents: number;
  partiallySatisfied: number;
  unsatisfiedIntents: number;

  chains: IntentCausalChain[];
  criticalGaps: IntentGap[];

  summary: {
    byCategory: Record<IntentCategory, { total: number; satisfied: number }>;
    byPriority: Record<string, { total: number; satisfied: number }>;
  };
}

// ============================================
// INTENT EXTRACTION
// ============================================

/** Patterns to extract intents from agent outputs */
const INTENT_EXTRACTION_PATTERNS: Record<IntentCategory, RegExp[]> = {
  navigation: [
    /navigate\s+to\s+(\w+)/gi,
    /go\s+to\s+(\w+)/gi,
    /link\s+to\s+(\w+)/gi,
    /(\w+)\s+page/gi,
  ],
  data_display: [
    /display\s+(?:list\s+of\s+)?(\w+)/gi,
    /show\s+(?:all\s+)?(\w+)/gi,
    /view\s+(\w+)/gi,
    /(\w+)\s+list/gi,
  ],
  data_mutation: [
    /add\s+(?:new\s+)?(\w+)/gi,
    /create\s+(\w+)/gi,
    /edit\s+(\w+)/gi,
    /update\s+(\w+)/gi,
    /delete\s+(\w+)/gi,
    /remove\s+(\w+)/gi,
  ],
  filtering: [
    /filter\s+(?:by\s+)?(\w+)/gi,
    /sort\s+(?:by\s+)?(\w+)/gi,
    /(\w+)\s+filter/gi,
  ],
  search: [
    /search\s+(?:for\s+)?(\w+)/gi,
    /find\s+(\w+)/gi,
    /(\w+)\s+search/gi,
  ],
  form_submission: [
    /submit\s+(\w+)\s+form/gi,
    /(\w+)\s+form/gi,
    /contact\s+form/gi,
  ],
  authentication: [
    /log\s*in/gi,
    /sign\s*in/gi,
    /log\s*out/gi,
    /sign\s*out/gi,
    /register/gi,
    /sign\s*up/gi,
  ],
  state_toggle: [
    /toggle\s+(\w+)/gi,
    /switch\s+(\w+)/gi,
    /enable\s+(\w+)/gi,
    /disable\s+(\w+)/gi,
    /dark\s*mode/gi,
  ],
  feedback: [
    /show\s+(?:success\s+)?message/gi,
    /notification/gi,
    /toast/gi,
    /alert/gi,
  ],
  loading: [
    /loading\s+(?:state|indicator|spinner)/gi,
    /show\s+loading/gi,
  ],
  error_handling: [
    /error\s+(?:message|handling)/gi,
    /show\s+error/gi,
    /handle\s+(?:errors?|failure)/gi,
  ],
};

/** Priority keywords */
const PRIORITY_KEYWORDS = {
  critical: ['must', 'required', 'essential', 'critical', 'core', 'main'],
  high: ['should', 'important', 'key', 'primary'],
  medium: ['can', 'allow', 'enable'],
  low: ['optional', 'nice to have', 'if possible'],
};

/**
 * Extract intents from Scope agent output
 */
export function extractIntentsFromScope(scopeArtifacts: any[]): IntentSpec[] {
  const intents: IntentSpec[] = [];
  let intentId = 0;

  for (const artifact of scopeArtifacts) {
    if (!artifact.content) continue;

    const content = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content);

    // Extract features/requirements from scope
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

      // Detect intent category
      for (const [category, patterns] of Object.entries(INTENT_EXTRACTION_PATTERNS)) {
        for (const pattern of patterns) {
          pattern.lastIndex = 0; // Reset regex
          const match = pattern.exec(trimmed);
          if (match) {
            const intent = createIntentFromMatch(
              `intent_${++intentId}`,
              trimmed,
              category as IntentCategory,
              match,
              'scope'
            );
            intents.push(intent);
            break;
          }
        }
      }
    }
  }

  return deduplicateIntents(intents);
}

/**
 * Extract intents from Oracle agent output (user analysis)
 */
export function extractIntentsFromOracle(oracleArtifacts: any[]): IntentSpec[] {
  const intents: IntentSpec[] = [];
  let intentId = 1000;

  for (const artifact of oracleArtifacts) {
    if (!artifact.content) continue;

    const content = typeof artifact.content === 'string'
      ? artifact.content
      : JSON.stringify(artifact.content);

    // Oracle outputs often contain user goals and needs
    const goalPatterns = [
      /user\s+(?:wants?|needs?)\s+to\s+(.+)/gi,
      /(?:goal|objective):\s*(.+)/gi,
      /(?:feature|requirement):\s*(.+)/gi,
    ];

    for (const pattern of goalPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const requirement = match[1].trim();
        const category = detectCategory(requirement);

        intents.push(createIntentFromMatch(
          `intent_${++intentId}`,
          requirement,
          category,
          match,
          'oracle'
        ));
      }
    }
  }

  return deduplicateIntents(intents);
}

/**
 * Create intent spec from a matched pattern
 */
function createIntentFromMatch(
  id: string,
  requirement: string,
  category: IntentCategory,
  match: RegExpExecArray,
  source: IntentSpec['source']
): IntentSpec {
  const priority = detectPriority(requirement);
  const entity = match[1] || '';

  // Build expected trigger based on category
  const trigger = buildExpectedTrigger(category, entity);
  const state = buildExpectedState(category, entity);
  const outcome = buildExpectedOutcome(category, entity);

  return {
    id,
    requirement,
    category,
    priority,
    source,
    expectedTrigger: trigger,
    expectedState: state,
    expectedOutcome: outcome,
  };
}

function detectCategory(text: string): IntentCategory {
  const lower = text.toLowerCase();

  for (const [category, patterns] of Object.entries(INTENT_EXTRACTION_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(lower)) {
        return category as IntentCategory;
      }
    }
  }

  return 'data_display'; // Default
}

function detectPriority(text: string): IntentSpec['priority'] {
  const lower = text.toLowerCase();

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return priority as IntentSpec['priority'];
    }
  }

  return 'medium';
}

function buildExpectedTrigger(category: IntentCategory, entity: string): TriggerSpec | undefined {
  switch (category) {
    case 'navigation':
      return { type: 'click', target: `${entity}Link`, targetPattern: new RegExp(`href.*${entity}`, 'i') };
    case 'data_mutation':
      return { type: 'click', target: `Add${entity}Button`, targetPattern: new RegExp(`add.*${entity}|create.*${entity}`, 'i') };
    case 'filtering':
      return { type: 'click', target: `${entity}Filter`, targetPattern: new RegExp(`filter.*${entity}|${entity}.*filter`, 'i') };
    case 'search':
      return { type: 'change', target: `${entity}Search`, targetPattern: new RegExp(`search.*${entity}`, 'i') };
    case 'form_submission':
      return { type: 'submit', target: `${entity}Form`, targetPattern: new RegExp(`form.*${entity}|${entity}.*form`, 'i') };
    case 'state_toggle':
      return { type: 'click', target: `${entity}Toggle`, targetPattern: new RegExp(`toggle.*${entity}`, 'i') };
    default:
      return undefined;
  }
}

function buildExpectedState(category: IntentCategory, entity: string): StateSpec | undefined {
  const entityLower = entity.toLowerCase();

  switch (category) {
    case 'data_display':
      return { stateName: `${entityLower}s`, statePattern: new RegExp(`\\[${entityLower}s?,\\s*set`, 'i') };
    case 'data_mutation':
      return { stateName: `${entityLower}s`, statePattern: new RegExp(`\\[${entityLower}s?,\\s*set`, 'i'), expectedTransition: 'list grows' };
    case 'filtering':
      return { stateName: 'filter', statePattern: /\[filter.*,\s*set/i, derivedState: [`filtered${entity}s`] };
    case 'search':
      return { stateName: 'searchQuery', statePattern: /\[search.*,\s*set/i };
    case 'state_toggle':
      return { stateName: `is${entity}`, statePattern: new RegExp(`\\[is${entity},\\s*set`, 'i'), expectedTransition: 'boolean toggle' };
    case 'loading':
      return { stateName: 'isLoading', statePattern: /\[isLoading,\s*set/i };
    default:
      return undefined;
  }
}

function buildExpectedOutcome(category: IntentCategory, entity: string): OutcomeSpec | undefined {
  switch (category) {
    case 'data_display':
      return {
        type: 'list_change',
        target: `${entity}List`,
        assertion: { type: 'appears' },
        description: `${entity} list is displayed`,
      };
    case 'data_mutation':
      return {
        type: 'list_change',
        target: `${entity}List`,
        assertion: { type: 'increases' },
        description: `${entity} list grows after adding`,
      };
    case 'filtering':
      return {
        type: 'list_change',
        target: `${entity}List`,
        assertion: { type: 'changes' },
        description: `${entity} list filters based on selection`,
      };
    case 'state_toggle':
      return {
        type: 'visibility_toggle',
        target: `${entity}Panel`,
        assertion: { type: 'toggles' },
        description: `${entity} visibility toggles`,
      };
    case 'error_handling':
      return {
        type: 'error_display',
        target: 'ErrorMessage',
        assertion: { type: 'appears' },
        description: 'Error message is displayed on failure',
      };
    case 'loading':
      return {
        type: 'loading_state',
        target: 'LoadingSpinner',
        assertion: { type: 'appears' },
        description: 'Loading indicator is shown',
      };
    default:
      return undefined;
  }
}

function deduplicateIntents(intents: IntentSpec[]): IntentSpec[] {
  const seen = new Set<string>();
  return intents.filter(intent => {
    const key = `${intent.category}:${intent.requirement.toLowerCase().slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// INTENT-CAUSAL CHAIN VALIDATION
// ============================================

/**
 * Validate that code satisfies an intent
 */
export function validateIntentChain(
  intent: IntentSpec,
  codeFiles: Array<{ path: string; content: string }>
): IntentCausalChain {
  const gaps: IntentGap[] = [];

  // Find trigger
  const foundTrigger = findTriggerForIntent(intent, codeFiles);
  if (!foundTrigger && intent.expectedTrigger) {
    gaps.push({
      type: 'missing_trigger',
      severity: intent.priority === 'critical' ? 'critical' : 'warning',
      message: `No trigger found for "${intent.requirement}"`,
      suggestion: `Add ${intent.expectedTrigger.type} handler for ${intent.expectedTrigger.target}`,
    });
  }

  // Find state
  const foundState = findStateForIntent(intent, codeFiles);
  if (!foundState && intent.expectedState) {
    gaps.push({
      type: 'missing_state',
      severity: intent.priority === 'critical' ? 'critical' : 'warning',
      message: `No state management found for "${intent.requirement}"`,
      suggestion: `Add useState for ${intent.expectedState.stateName}`,
    });
  }

  // Find outcome
  const foundOutcome = findOutcomeForIntent(intent, codeFiles, foundState);
  if (!foundOutcome && intent.expectedOutcome) {
    gaps.push({
      type: 'missing_outcome',
      severity: 'warning',
      message: `No observable outcome found for "${intent.requirement}"`,
      suggestion: `Ensure ${intent.expectedOutcome.target} renders based on state`,
    });
  }

  // Check chain connectivity
  if (foundTrigger && foundState && !triggerConnectsToState(foundTrigger, foundState)) {
    gaps.push({
      type: 'broken_chain',
      severity: 'critical',
      message: `Trigger does not connect to state for "${intent.requirement}"`,
      suggestion: `Ensure ${foundTrigger.handler} calls ${foundState.setter}`,
    });
  }

  if (foundState && foundOutcome && !stateConnectsToOutcome(foundState, foundOutcome)) {
    gaps.push({
      type: 'broken_chain',
      severity: 'critical',
      message: `State does not connect to outcome for "${intent.requirement}"`,
      suggestion: `Ensure ${foundOutcome.targetElement} depends on ${foundState.stateName}`,
    });
  }

  // W-ISS-D: Calculate axis scores (0.0 - 1.0)
  const triggerExpected = !!intent.expectedTrigger;
  const stateExpected = !!intent.expectedState;
  const outcomeExpected = !!intent.expectedOutcome;

  // Axis 1: Trigger score
  let triggerScore = 1.0; // Default if not expected
  if (triggerExpected) {
    triggerScore = foundTrigger ? 1.0 : 0.0;
  }

  // Axis 2: State score
  let stateScore = 1.0; // Default if not expected
  if (stateExpected) {
    if (foundState) {
      // Partial credit: 0.5 if found but not used properly
      stateScore = foundState.usedInHandler && foundState.usedInRender ? 1.0 :
                   foundState.usedInHandler || foundState.usedInRender ? 0.5 : 0.25;
    } else {
      stateScore = 0.0;
    }
  }

  // Axis 3: Effect score (trigger → state connection)
  let effectScore = 1.0; // Default if no chain expected
  if (triggerExpected && stateExpected) {
    if (foundTrigger && foundState) {
      effectScore = triggerConnectsToState(foundTrigger, foundState) ? 1.0 : 0.0;
    } else {
      effectScore = 0.0;
    }
  }

  // Axis 4: Outcome score (state → render connection)
  let outcomeScore = 1.0; // Default if not expected
  if (outcomeExpected) {
    if (foundOutcome) {
      // Check if outcome depends on state
      if (foundState && stateConnectsToOutcome(foundState, foundOutcome)) {
        outcomeScore = 1.0;
      } else if (foundOutcome.conditional) {
        outcomeScore = 0.5; // Conditional but not proven to depend on our state
      } else {
        outcomeScore = 0.25;
      }
    } else {
      outcomeScore = 0.0;
    }
  }

  // ERA: Outcome scores - internal is from code structure, external from reality anchors
  // RGL: Trust scores adjust external validation for reliability
  const outcomeScores = {
    internal: outcomeScore,
    external: null as number | null,             // Will be set by ERA execution
    trustScore: 1.0,                             // Will be set by RGL execution
    trustAdjustedExternal: null as number | null, // external * trustScore
    combined: outcomeScore,                      // min(internal, trustAdjustedExternal) when external exists
  };

  const axisScores = {
    trigger: triggerScore,
    state: stateScore,
    effect: effectScore,
    outcome: outcomeScores.combined,  // Use combined score
  };

  // Calculate raw score (average of axes)
  const rawScore = (triggerScore + stateScore + effectScore + outcomeScores.combined) / 4;

  // Calculate weighted score
  const weight = CRITICALITY_WEIGHTS[intent.priority];
  const weightedScore = rawScore * weight;

  // Calculate satisfaction (all axes must be > 0 for critical intents)
  const satisfied = intent.priority === 'critical'
    ? rawScore === 1.0  // Critical intents require perfect score
    : gaps.filter(g => g.severity === 'critical').length === 0;

  const confidence = calculateConfidence(foundTrigger, foundState, foundOutcome, gaps);

  return {
    intent,
    foundTrigger,
    foundState,
    foundOutcome,
    axisScores,
    outcomeScores,
    rawScore,
    weightedScore,
    satisfied,
    confidence,
    gaps,
  };
}

function findTriggerForIntent(
  intent: IntentSpec,
  codeFiles: Array<{ path: string; content: string }>
): FoundTrigger | null {
  if (!intent.expectedTrigger) return null;

  const { type, targetPattern } = intent.expectedTrigger;
  const eventAttr = type === 'click' ? 'onClick' : type === 'submit' ? 'onSubmit' : 'onChange';

  for (const file of codeFiles) {
    if (!file.path.endsWith('.tsx')) continue;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for event handler
      const handlerMatch = line.match(new RegExp(`${eventAttr}\\s*=\\s*\\{([^}]+)\\}`));
      if (handlerMatch) {
        // Check if it matches the target pattern
        if (targetPattern && targetPattern.test(line)) {
          return {
            file: file.path,
            line: i + 1,
            element: detectElement(line),
            handler: handlerMatch[1].trim(),
            handlerCode: extractHandlerCode(handlerMatch[1].trim(), file.content),
          };
        }

        // Also match by nearby context
        const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
        if (targetPattern && targetPattern.test(context)) {
          return {
            file: file.path,
            line: i + 1,
            element: detectElement(line),
            handler: handlerMatch[1].trim(),
            handlerCode: extractHandlerCode(handlerMatch[1].trim(), file.content),
          };
        }
      }
    }
  }

  return null;
}

function findStateForIntent(
  intent: IntentSpec,
  codeFiles: Array<{ path: string; content: string }>
): FoundState | null {
  if (!intent.expectedState) return null;

  const { statePattern, stateName } = intent.expectedState;

  for (const file of codeFiles) {
    if (!file.path.endsWith('.tsx')) continue;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for useState
      const useStateMatch = line.match(/const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/);
      if (useStateMatch) {
        const foundStateName = useStateMatch[1];
        const setter = useStateMatch[2];

        // Check if it matches expected state
        if (statePattern && statePattern.test(line)) {
          return {
            file: file.path,
            line: i + 1,
            stateName: foundStateName,
            setter,
            usedInHandler: file.content.includes(setter + '('),
            usedInRender: isStateUsedInRender(foundStateName, file.content),
          };
        }

        // Also check by name similarity
        if (foundStateName.toLowerCase().includes(stateName.toLowerCase()) ||
            stateName.toLowerCase().includes(foundStateName.toLowerCase())) {
          return {
            file: file.path,
            line: i + 1,
            stateName: foundStateName,
            setter,
            usedInHandler: file.content.includes(setter + '('),
            usedInRender: isStateUsedInRender(foundStateName, file.content),
          };
        }
      }
    }
  }

  return null;
}

function findOutcomeForIntent(
  intent: IntentSpec,
  codeFiles: Array<{ path: string; content: string }>,
  foundState: FoundState | null
): FoundOutcome | null {
  if (!intent.expectedOutcome) return null;

  for (const file of codeFiles) {
    if (!file.path.endsWith('.tsx')) continue;

    const lines = file.content.split('\n');

    // Look for conditional rendering based on state
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for conditional rendering patterns
      const conditionalPatterns = [
        /\{.*&&\s*</,           // {condition && <Element>}
        /\{.*\?\s*</,           // {condition ? <Element> : ...}
        /\.map\s*\(/,           // .map( for lists
      ];

      if (conditionalPatterns.some(p => p.test(line))) {
        // Check if it depends on our state
        if (foundState && line.includes(foundState.stateName)) {
          return {
            file: file.path,
            line: i + 1,
            outcomeType: detectOutcomeType(line, intent.expectedOutcome.type),
            targetElement: detectElement(line),
            conditional: true,
            dependsOnState: [foundState.stateName],
          };
        }
      }
    }
  }

  return null;
}

function detectElement(line: string): string {
  const match = line.match(/<(\w+)/);
  return match ? match[1] : 'unknown';
}

function extractHandlerCode(handlerRef: string, content: string): string {
  // If it's an inline arrow function, return as-is
  if (handlerRef.includes('=>')) {
    return handlerRef;
  }

  // Otherwise, find the function definition
  const funcPattern = new RegExp(`(?:const|function)\\s+${handlerRef}\\s*=?[^{]*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  const match = content.match(funcPattern);
  return match ? match[1].trim() : handlerRef;
}

function isStateUsedInRender(stateName: string, content: string): boolean {
  const returnMatch = content.match(/return\s*\([\s\S]*?\);?\s*\}/);
  if (!returnMatch) return false;

  const jsxContent = returnMatch[0];
  return jsxContent.includes(stateName);
}

function triggerConnectsToState(trigger: FoundTrigger, state: FoundState): boolean {
  // Check if handler code contains the setter
  return trigger.handlerCode.includes(state.setter);
}

function stateConnectsToOutcome(state: FoundState, outcome: FoundOutcome): boolean {
  return outcome.dependsOnState.includes(state.stateName);
}

function detectOutcomeType(line: string, expected: OutcomeType): OutcomeType {
  if (line.includes('.map(')) return 'list_change';
  if (line.includes('&&')) return 'visibility_toggle';
  if (line.includes('?')) return 'visibility_toggle';
  return expected;
}

function calculateConfidence(
  trigger: FoundTrigger | null,
  state: FoundState | null,
  outcome: FoundOutcome | null,
  gaps: IntentGap[]
): 'high' | 'medium' | 'low' | 'none' {
  const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
  const hasAll = trigger && state && outcome;

  if (criticalGaps > 0) return 'none';
  if (hasAll && state?.usedInHandler && state?.usedInRender) return 'high';
  if (hasAll) return 'medium';
  if (trigger || state) return 'low';
  return 'none';
}

// ============================================
// INTENT-CAUSAL GRAPH ANALYSIS
// ============================================

/**
 * Run full Intent-Causal Graph analysis
 */
export function runICGAnalysis(
  buildDir: string,
  agentOutputs: Map<string, any>
): ICGReport {
  console.log('[ICG] Starting Intent-Causal Graph analysis...');

  // Extract intents from agent outputs
  const scopeArtifacts = agentOutputs.get('scope')?.artifacts || [];
  const oracleArtifacts = agentOutputs.get('oracle')?.artifacts || [];

  const intentsFromScope = extractIntentsFromScope(scopeArtifacts);
  const intentsFromOracle = extractIntentsFromOracle(oracleArtifacts);
  const allIntents = [...intentsFromScope, ...intentsFromOracle];

  console.log(`[ICG] Extracted ${allIntents.length} intents (${intentsFromScope.length} from scope, ${intentsFromOracle.length} from oracle)`);

  // If no intents extracted, try to infer from code structure
  if (allIntents.length === 0) {
    console.log('[ICG] No intents from agents, inferring from code structure...');
    const inferredIntents = inferIntentsFromCode(buildDir);
    allIntents.push(...inferredIntents);
    console.log(`[ICG] Inferred ${inferredIntents.length} intents from code`);
  }

  // Load all code files
  const codeFiles = loadCodeFiles(buildDir);
  console.log(`[ICG] Loaded ${codeFiles.length} code files for analysis`);

  // Validate each intent
  const chains: IntentCausalChain[] = [];
  for (const intent of allIntents) {
    const chain = validateIntentChain(intent, codeFiles);
    chains.push(chain);
  }

  // Calculate basic metrics
  const satisfiedIntents = chains.filter(c => c.satisfied).length;
  const partiallySatisfied = chains.filter(c => !c.satisfied && c.confidence !== 'none').length;
  const unsatisfiedIntents = chains.filter(c => !c.satisfied && c.confidence === 'none').length;

  const criticalGaps = chains.flatMap(c => c.gaps.filter(g => g.severity === 'critical'));

  // ==========================================
  // W-ISS-D: WEIGHTED INTENT SATISFACTION SCORE - DECOMPOSED
  // ==========================================

  // Calculate total and achieved weights
  let totalWeight = 0;
  let achievedWeight = 0;

  for (const chain of chains) {
    const weight = CRITICALITY_WEIGHTS[chain.intent.priority];
    totalWeight += weight;
    achievedWeight += chain.weightedScore;
  }

  // Calculate W-ISS-D score (0-100)
  const wissScore = totalWeight > 0
    ? Math.round((achievedWeight / totalWeight) * 100)
    : 100;

  // Check critical intent enforcement
  const criticalChains = chains.filter(c => c.intent.priority === 'critical');
  const criticalIntentsTotal = criticalChains.length;
  const criticalIntentsSatisfied = criticalChains.filter(c => c.rawScore === 1.0).length;
  const criticalBlocker = criticalIntentsTotal > 0 && criticalIntentsSatisfied < criticalIntentsTotal;

  // Find blockers (critical intents that failed)
  const blockers = criticalChains
    .filter(c => c.rawScore < 1.0)
    .map(c => ({
      intentId: c.intent.id,
      requirement: c.intent.requirement,
      score: c.rawScore,
      missingAxes: Object.entries(c.axisScores)
        .filter(([_, score]) => score < 1.0)
        .map(([axis, _]) => axis),
    }));

  // Calculate axis averages
  const axisAverages = {
    trigger: chains.length > 0 ? chains.reduce((sum, c) => sum + c.axisScores.trigger, 0) / chains.length : 1,
    state: chains.length > 0 ? chains.reduce((sum, c) => sum + c.axisScores.state, 0) / chains.length : 1,
    effect: chains.length > 0 ? chains.reduce((sum, c) => sum + c.axisScores.effect, 0) / chains.length : 1,
    outcome: chains.length > 0 ? chains.reduce((sum, c) => sum + c.axisScores.outcome, 0) / chains.length : 1,
  };

  // Determine W-ISS-D status
  let wissStatus: WISSReport['status'];
  if (criticalBlocker) {
    wissStatus = 'FAIL';  // Critical blocker always fails
  } else if (wissScore >= WISS_THRESHOLDS.SHIP) {
    wissStatus = 'SHIP';
  } else if (wissScore >= WISS_THRESHOLDS.WARNING) {
    wissStatus = 'WARNING';
  } else {
    wissStatus = 'FAIL';
  }

  const wiss: WISSReport = {
    score: wissScore,
    status: wissStatus,
    totalWeight,
    achievedWeight,
    criticalIntentsTotal,
    criticalIntentsSatisfied,
    criticalBlocker,
    axisAverages,
    blockers,
  };

  // Legacy ISS (for backwards compatibility)
  const intentSatisfactionScore = allIntents.length > 0
    ? Math.round((satisfiedIntents / allIntents.length) * 100)
    : 100;

  // Build summary
  const byCategory: Record<IntentCategory, { total: number; satisfied: number }> = {} as any;
  const byPriority: Record<string, { total: number; satisfied: number }> = {};

  for (const chain of chains) {
    const cat = chain.intent.category;
    const pri = chain.intent.priority;

    if (!byCategory[cat]) byCategory[cat] = { total: 0, satisfied: 0 };
    if (!byPriority[pri]) byPriority[pri] = { total: 0, satisfied: 0 };

    byCategory[cat].total++;
    byPriority[pri].total++;

    if (chain.satisfied) {
      byCategory[cat].satisfied++;
      byPriority[pri].satisfied++;
    }
  }

  // Determine pass/fail based on W-ISS-D
  const passed = wissStatus !== 'FAIL' || allIntents.length === 0;

  console.log(`[ICG] ==========================================`);
  console.log(`[ICG] W-ISS-D ANALYSIS COMPLETE`);
  console.log(`[ICG] ==========================================`);
  console.log(`[ICG]   W-ISS-D Score: ${wissScore}% (${wissStatus})`);
  console.log(`[ICG]   Weight: ${achievedWeight.toFixed(2)}/${totalWeight.toFixed(2)}`);
  console.log(`[ICG]   Critical: ${criticalIntentsSatisfied}/${criticalIntentsTotal} satisfied`);
  if (criticalBlocker) {
    console.log(`[ICG]   ⛔ CRITICAL BLOCKER: ${blockers.length} critical intent(s) not fully satisfied`);
    for (const blocker of blockers) {
      console.log(`[ICG]      - "${blocker.requirement.slice(0, 50)}..." (${Math.round(blocker.score * 100)}%)`);
      console.log(`[ICG]        Missing: ${blocker.missingAxes.join(', ')}`);
    }
  }
  console.log(`[ICG]   Axis Averages:`);
  console.log(`[ICG]      Trigger: ${Math.round(axisAverages.trigger * 100)}%`);
  console.log(`[ICG]      State:   ${Math.round(axisAverages.state * 100)}%`);
  console.log(`[ICG]      Effect:  ${Math.round(axisAverages.effect * 100)}%`);
  console.log(`[ICG]      Outcome: ${Math.round(axisAverages.outcome * 100)}%`);
  console.log(`[ICG] ==========================================`);

  return {
    passed,
    intentSatisfactionScore,
    wiss,
    totalIntents: allIntents.length,
    satisfiedIntents,
    partiallySatisfied,
    unsatisfiedIntents,
    chains,
    criticalGaps,
    summary: {
      byCategory,
      byPriority,
    },
  };
}

/**
 * Infer intents from code structure when no agent outputs available
 */
function inferIntentsFromCode(buildDir: string): IntentSpec[] {
  const intents: IntentSpec[] = [];
  const agentsDir = path.join(buildDir, 'agents');

  if (!fs.existsSync(agentsDir)) return intents;

  const files = loadCodeFiles(buildDir);
  let intentId = 2000;

  for (const file of files) {
    // Infer navigation intents from Link/a elements
    const linkMatches = file.content.matchAll(/href\s*=\s*['"](\/[^'"]*)['"]/g);
    for (const match of linkMatches) {
      const route = match[1];
      if (route !== '/' && !route.startsWith('/#')) {
        intents.push({
          id: `inferred_${++intentId}`,
          requirement: `Navigate to ${route}`,
          category: 'navigation',
          priority: 'medium',
          source: 'scope',
          expectedTrigger: { type: 'click', target: 'Link', targetPattern: new RegExp(route) },
        });
      }
    }

    // Infer data display intents from .map() calls
    const mapMatches = file.content.matchAll(/(\w+)\.map\s*\(/g);
    for (const match of mapMatches) {
      const listName = match[1];
      if (!['children', 'items', 'options'].includes(listName.toLowerCase())) {
        intents.push({
          id: `inferred_${++intentId}`,
          requirement: `Display ${listName}`,
          category: 'data_display',
          priority: 'medium',
          source: 'scope',
          expectedState: { stateName: listName, statePattern: new RegExp(`\\[${listName},\\s*set`) },
          expectedOutcome: {
            type: 'list_change',
            target: `${listName}List`,
            assertion: { type: 'appears' },
            description: `${listName} are displayed`,
          },
        });
      }
    }

    // Infer form intents from onSubmit handlers
    const formMatches = file.content.matchAll(/onSubmit\s*=\s*\{(\w+)\}/g);
    for (const match of formMatches) {
      intents.push({
        id: `inferred_${++intentId}`,
        requirement: `Submit form`,
        category: 'form_submission',
        priority: 'high',
        source: 'scope',
        expectedTrigger: { type: 'submit', target: 'Form' },
      });
    }
  }

  return deduplicateIntents(intents);
}

/**
 * Load all code files from build directory
 */
function loadCodeFiles(buildDir: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const agentsDir = path.join(buildDir, 'agents');

  if (!fs.existsSync(agentsDir)) return files;

  const scanDir = (dir: string) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push({
          path: path.relative(buildDir, fullPath),
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  };

  scanDir(agentsDir);
  return files;
}

/**
 * Generate intent-causal-graph.json artifact
 */
export function generateICGArtifact(report: ICGReport): string {
  const artifact = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    intentSatisfactionScore: report.intentSatisfactionScore,
    status: report.passed ? 'PASSED' : 'FAILED',
    chains: report.chains.map(chain => ({
      requirement: chain.intent.requirement,
      category: chain.intent.category,
      priority: chain.intent.priority,
      satisfied: chain.satisfied,
      confidence: chain.confidence,
      trigger: chain.foundTrigger ? {
        file: chain.foundTrigger.file,
        line: chain.foundTrigger.line,
        element: chain.foundTrigger.element,
      } : null,
      state: chain.foundState ? {
        file: chain.foundState.file,
        stateName: chain.foundState.stateName,
        usedInRender: chain.foundState.usedInRender,
      } : null,
      outcome: chain.foundOutcome ? {
        file: chain.foundOutcome.file,
        type: chain.foundOutcome.outcomeType,
        conditional: chain.foundOutcome.conditional,
      } : null,
      gaps: chain.gaps,
    })),
  };

  return JSON.stringify(artifact, null, 2);
}

// ============================================
// ERA: EXTERNAL REALITY ANCHOR INTEGRATION
// ============================================

/**
 * External validation input with trust scores
 */
export interface ExternalValidationInput {
  externalScore: number | null;   // Raw external outcome score (0-1)
  trustScore: number;             // RGL trust score (0-1)
}

/**
 * Apply external validation results to chains
 * Updates outcomeScores with external scores and trust-adjusted scores
 *
 * RGL Integration:
 * - trustAdjustedExternal = externalScore * trustScore
 * - combined = min(internal, trustAdjustedExternal)
 * - No anchor may pass with trustScore < 0.7
 */
export function applyExternalValidation(
  chains: IntentCausalChain[],
  externalValidation: Record<string, ExternalValidationInput>
): IntentCausalChain[] {
  const MIN_TRUST_THRESHOLD = 0.7;

  return chains.map(chain => {
    const validation = externalValidation[chain.intent.id];

    if (!validation || validation.externalScore === null || validation.externalScore === undefined) {
      // No external validation for this intent
      return chain;
    }

    const { externalScore, trustScore } = validation;

    // RGL: Calculate trust-adjusted external score
    // If trust is below threshold, the external score is penalized to 0
    const effectiveTrustScore = trustScore >= MIN_TRUST_THRESHOLD ? trustScore : 0;
    const trustAdjustedExternal = externalScore * effectiveTrustScore;

    // Calculate combined score: min(internal, trustAdjustedExternal)
    const combined = Math.min(chain.outcomeScores.internal, trustAdjustedExternal);

    // Update outcome scores with full trust information
    const updatedOutcomeScores = {
      internal: chain.outcomeScores.internal,
      external: externalScore,
      trustScore,
      trustAdjustedExternal,
      combined,
    };

    // Update axis scores with new combined outcome
    const updatedAxisScores = {
      ...chain.axisScores,
      outcome: combined,
    };

    // Recalculate raw score
    const rawScore = (
      updatedAxisScores.trigger +
      updatedAxisScores.state +
      updatedAxisScores.effect +
      updatedAxisScores.outcome
    ) / 4;

    // Recalculate weighted score
    const weight = CRITICALITY_WEIGHTS[chain.intent.priority];
    const weightedScore = rawScore * weight;

    // Recalculate satisfaction
    // RGL: An intent cannot be satisfied if trust score is below threshold
    const trustPasses = trustScore >= MIN_TRUST_THRESHOLD;
    const satisfied = chain.intent.priority === 'critical'
      ? rawScore === 1.0 && trustPasses
      : chain.gaps.filter(g => g.severity === 'critical').length === 0 &&
        trustAdjustedExternal >= 0.75 && trustPasses;

    // Add gap if trust is too low
    const gaps = [...chain.gaps];
    if (!trustPasses && externalScore !== null) {
      gaps.push({
        type: 'weak_assertion',
        severity: chain.intent.priority === 'critical' ? 'critical' : 'warning',
        message: `External reality is untrustworthy: ${(trustScore * 100).toFixed(0)}% < ${(MIN_TRUST_THRESHOLD * 100).toFixed(0)}%`,
        suggestion: 'Investigate flakiness or inconsistency in external validation anchors',
      });
    }

    return {
      ...chain,
      axisScores: updatedAxisScores,
      outcomeScores: updatedOutcomeScores,
      rawScore,
      weightedScore,
      satisfied,
      gaps,
    };
  });
}

/**
 * Legacy overload for backwards compatibility
 * @deprecated Use the version with ExternalValidationInput for trust scoring
 */
export function applyExternalValidationLegacy(
  chains: IntentCausalChain[],
  externalScores: Record<string, number | null>
): IntentCausalChain[] {
  // Convert to new format with default trust score of 1.0
  const validation: Record<string, ExternalValidationInput> = {};
  for (const [intentId, score] of Object.entries(externalScores)) {
    validation[intentId] = {
      externalScore: score,
      trustScore: 1.0,  // Default: fully trusted
    };
  }
  return applyExternalValidation(chains, validation);
}

/**
 * Recalculate W-ISS-D report after external validation
 */
export function recalculateWISSAfterERA(
  originalReport: ICGReport,
  updatedChains: IntentCausalChain[]
): ICGReport {
  // Recalculate totals
  const totalIntents = updatedChains.length;
  const satisfiedIntents = updatedChains.filter(c => c.satisfied).length;
  const partiallySatisfied = updatedChains.filter(c => !c.satisfied && c.rawScore > 0).length;
  const unsatisfiedIntents = updatedChains.filter(c => c.rawScore === 0).length;

  // Calculate W-ISS-D
  const totalWeight = updatedChains.reduce(
    (sum, c) => sum + CRITICALITY_WEIGHTS[c.intent.priority],
    0
  );
  const weightedSum = updatedChains.reduce((sum, c) => sum + c.weightedScore, 0);
  const wissScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  // Check critical intents
  const criticalChains = updatedChains.filter(c => c.intent.priority === 'critical');
  const criticalIntentsSatisfied = criticalChains.filter(c => c.satisfied).length;
  const criticalIntentsTotal = criticalChains.length;
  const criticalBlocker = criticalIntentsSatisfied < criticalIntentsTotal;

  // Calculate axis averages
  const axisAverages = {
    trigger: updatedChains.length > 0
      ? updatedChains.reduce((sum, c) => sum + c.axisScores.trigger, 0) / updatedChains.length
      : 1,
    state: updatedChains.length > 0
      ? updatedChains.reduce((sum, c) => sum + c.axisScores.state, 0) / updatedChains.length
      : 1,
    effect: updatedChains.length > 0
      ? updatedChains.reduce((sum, c) => sum + c.axisScores.effect, 0) / updatedChains.length
      : 1,
    outcome: updatedChains.length > 0
      ? updatedChains.reduce((sum, c) => sum + c.axisScores.outcome, 0) / updatedChains.length
      : 1,
  };

  // Determine status
  let status: 'SHIP' | 'WARNING' | 'FAIL';
  if (criticalBlocker) {
    status = 'FAIL';
  } else if (wissScore >= WISS_THRESHOLDS.SHIP) {
    status = 'SHIP';
  } else if (wissScore >= WISS_THRESHOLDS.WARNING) {
    status = 'WARNING';
  } else {
    status = 'FAIL';
  }

  // Find blockers
  const blockers = updatedChains
    .filter(c => c.intent.priority === 'critical' && !c.satisfied)
    .map(c => ({
      intentId: c.intent.id,
      requirement: c.intent.requirement,
      score: c.rawScore,
      missingAxes: Object.entries(c.axisScores)
        .filter(([_, score]) => score < 1.0)
        .map(([axis]) => axis),
    }));

  const wiss: WISSReport = {
    score: wissScore,
    status,
    totalWeight,
    achievedWeight: weightedSum,
    criticalIntentsSatisfied,
    criticalIntentsTotal,
    criticalBlocker,
    axisAverages,
    blockers,
  };

  return {
    ...originalReport,
    chains: updatedChains,
    wiss,
    intentSatisfactionScore: wissScore,
    totalIntents,
    satisfiedIntents,
    partiallySatisfied,
    unsatisfiedIntents,
    passed: wissScore >= WISS_THRESHOLDS.HARD_FAIL && !criticalBlocker,
  };
}

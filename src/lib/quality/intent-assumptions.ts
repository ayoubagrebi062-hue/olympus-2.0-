/**
 * OLYMPUS 2.0 - Intent Assumption Extraction (IRCL)
 *
 * Extracts implicit assumptions from intents that must hold true
 * for the intent to be satisfiable.
 *
 * This layer diagnoses, not repairs.
 */

import { IntentSpec, IntentCausalChain, IntentCategory } from './intent-graph';

// ============================================
// ASSUMPTION TYPES
// ============================================

/**
 * Categories of assumptions that intents implicitly make
 */
export type AssumptionCategory =
  | 'DATA_EXISTS' // Assumes data/entities exist
  | 'API_AVAILABLE' // Assumes API endpoints are reachable
  | 'PERMISSION_GRANTED' // Assumes user has permission
  | 'LATENCY_ACCEPTABLE' // Assumes operations complete in time
  | 'STATE_VALID' // Assumes state can be in expected configuration
  | 'DEPENDENCY_PRESENT' // Assumes external dependency exists
  | 'FORMAT_COMPATIBLE' // Assumes data formats are compatible
  | 'NETWORK_AVAILABLE' // Assumes network connectivity
  | 'STORAGE_AVAILABLE' // Assumes storage/persistence is available
  | 'BROWSER_CAPABILITY'; // Assumes browser supports required features

/**
 * An implicit assumption extracted from an intent
 */
export interface IntentAssumption {
  id: string;
  intentId: string;
  category: AssumptionCategory;

  // What is being assumed
  description: string;

  // The specific thing being assumed
  subject: string; // e.g., "User data", "Auth API", "localStorage"

  // Where this assumption comes from
  sourceAxis: 'trigger' | 'state' | 'effect' | 'outcome' | 'requirement';
  sourceEvidence: string; // Quote or reference from intent

  // Validation status
  validated: boolean;
  validationResult?: 'CONFIRMED' | 'DENIED' | 'UNKNOWN';
  validationEvidence?: string;

  // Criticality
  critical: boolean; // If this assumption fails, intent is impossible

  // Traceability
  extractedAt: Date;
}

/**
 * Summary of assumptions for an intent
 */
export interface IntentAssumptionSummary {
  intentId: string;
  requirement: string;
  totalAssumptions: number;
  confirmedAssumptions: number;
  deniedAssumptions: number;
  unknownAssumptions: number;
  criticalDenied: number; // Critical assumptions that were denied
  assumptions: IntentAssumption[];
}

// ============================================
// ASSUMPTION EXTRACTION RULES
// ============================================

/**
 * Rules for extracting assumptions from intent categories
 */
const CATEGORY_ASSUMPTION_RULES: Record<IntentCategory, AssumptionCategory[]> = {
  navigation: ['NETWORK_AVAILABLE', 'STATE_VALID'],
  data_display: ['DATA_EXISTS', 'API_AVAILABLE', 'FORMAT_COMPATIBLE'],
  data_mutation: ['DATA_EXISTS', 'API_AVAILABLE', 'PERMISSION_GRANTED', 'STATE_VALID'],
  filtering: ['DATA_EXISTS', 'STATE_VALID'],
  search: ['DATA_EXISTS', 'API_AVAILABLE', 'LATENCY_ACCEPTABLE'],
  form_submission: [
    'API_AVAILABLE',
    'PERMISSION_GRANTED',
    'FORMAT_COMPATIBLE',
    'NETWORK_AVAILABLE',
  ],
  authentication: ['API_AVAILABLE', 'NETWORK_AVAILABLE', 'STORAGE_AVAILABLE'],
  state_toggle: ['STATE_VALID', 'STORAGE_AVAILABLE'],
  feedback: ['STATE_VALID'],
  loading: ['LATENCY_ACCEPTABLE'],
  error_handling: ['STATE_VALID'],
};

/**
 * Keyword patterns that indicate specific assumptions
 */
const ASSUMPTION_INDICATORS: Record<AssumptionCategory, RegExp[]> = {
  DATA_EXISTS: [
    /display\s+(\w+)/i,
    /show\s+(\w+)/i,
    /list\s+of\s+(\w+)/i,
    /(\w+)\s+data/i,
    /user('s)?\s+(\w+)/i,
  ],
  API_AVAILABLE: [
    /fetch/i,
    /load/i,
    /api/i,
    /endpoint/i,
    /server/i,
    /backend/i,
    /submit/i,
    /save/i,
  ],
  PERMISSION_GRANTED: [/delete/i, /remove/i, /edit/i, /update/i, /admin/i, /manage/i, /create/i],
  LATENCY_ACCEPTABLE: [/real-?time/i, /instant/i, /immediate/i, /fast/i, /quick/i, /live/i],
  STATE_VALID: [/toggle/i, /switch/i, /change/i, /update/i, /filter/i, /sort/i],
  DEPENDENCY_PRESENT: [
    /requires?\s+(\w+)/i,
    /depends?\s+on\s+(\w+)/i,
    /needs?\s+(\w+)/i,
    /uses?\s+(\w+)/i,
  ],
  FORMAT_COMPATIBLE: [/json/i, /csv/i, /format/i, /parse/i, /convert/i],
  NETWORK_AVAILABLE: [/online/i, /connect/i, /sync/i, /upload/i, /download/i],
  STORAGE_AVAILABLE: [/save/i, /persist/i, /store/i, /remember/i, /localStorage/i, /session/i],
  BROWSER_CAPABILITY: [
    /geolocation/i,
    /notification/i,
    /camera/i,
    /microphone/i,
    /clipboard/i,
    /webgl/i,
  ],
};

// ============================================
// ASSUMPTION EXTRACTION
// ============================================

let assumptionIdCounter = 0;

/**
 * Generate unique assumption ID
 */
function generateAssumptionId(intentId: string): string {
  return `assumption-${intentId}-${++assumptionIdCounter}`;
}

/**
 * Extract assumptions from a single intent
 */
export function extractAssumptionsFromIntent(
  intent: IntentSpec,
  chain?: IntentCausalChain
): IntentAssumption[] {
  const assumptions: IntentAssumption[] = [];
  const requirement = intent.requirement.toLowerCase();

  // 1. Extract based on category
  const categoryAssumptions = CATEGORY_ASSUMPTION_RULES[intent.category] || [];
  for (const category of categoryAssumptions) {
    const assumption = createCategoryAssumption(intent, category);
    if (assumption) {
      assumptions.push(assumption);
    }
  }

  // 2. Extract based on requirement keywords
  for (const [category, patterns] of Object.entries(ASSUMPTION_INDICATORS)) {
    for (const pattern of patterns) {
      const match = pattern.exec(requirement);
      if (match) {
        const subject =
          match[1] || extractSubjectFromRequirement(requirement, category as AssumptionCategory);
        const assumption = createKeywordAssumption(
          intent,
          category as AssumptionCategory,
          subject,
          match[0]
        );
        // Avoid duplicates
        if (!assumptions.some(a => a.category === category && a.subject === assumption.subject)) {
          assumptions.push(assumption);
        }
      }
    }
  }

  // 3. Extract from trigger expectations
  if (intent.expectedTrigger) {
    const triggerAssumption: IntentAssumption = {
      id: generateAssumptionId(intent.id),
      intentId: intent.id,
      category: 'STATE_VALID',
      description: `UI element "${intent.expectedTrigger.target}" must be rendered and interactive`,
      subject: intent.expectedTrigger.target,
      sourceAxis: 'trigger',
      sourceEvidence: `Expected trigger: ${intent.expectedTrigger.type} on ${intent.expectedTrigger.target}`,
      validated: false,
      critical: true,
      extractedAt: new Date(),
    };
    assumptions.push(triggerAssumption);
  }

  // 4. Extract from state expectations
  if (intent.expectedState) {
    const stateAssumption: IntentAssumption = {
      id: generateAssumptionId(intent.id),
      intentId: intent.id,
      category: 'STATE_VALID',
      description: `State "${intent.expectedState.stateName}" must be manageable`,
      subject: intent.expectedState.stateName,
      sourceAxis: 'state',
      sourceEvidence: `Expected state: ${intent.expectedState.stateName}`,
      validated: false,
      critical: true,
      extractedAt: new Date(),
    };
    assumptions.push(stateAssumption);
  }

  // 5. Extract from outcome expectations
  if (intent.expectedOutcome) {
    const outcomeAssumption: IntentAssumption = {
      id: generateAssumptionId(intent.id),
      intentId: intent.id,
      category: 'STATE_VALID',
      description: `Outcome "${intent.expectedOutcome.target}" must be observable in the UI`,
      subject: intent.expectedOutcome.target,
      sourceAxis: 'outcome',
      sourceEvidence: intent.expectedOutcome.description,
      validated: false,
      critical: intent.priority === 'critical',
      extractedAt: new Date(),
    };
    assumptions.push(outcomeAssumption);
  }

  // 6. Validate assumptions against chain if available
  if (chain) {
    validateAssumptionsAgainstChain(assumptions, chain);
  }

  return assumptions;
}

/**
 * Create assumption based on intent category
 */
function createCategoryAssumption(
  intent: IntentSpec,
  category: AssumptionCategory
): IntentAssumption | null {
  const descriptions: Record<AssumptionCategory, (intent: IntentSpec) => string> = {
    DATA_EXISTS: i => `Data required for "${i.requirement.slice(0, 30)}" must exist`,
    API_AVAILABLE: i => `Backend API for "${i.category}" must be available and responding`,
    PERMISSION_GRANTED: i => `User must have permission to perform "${i.category}" action`,
    LATENCY_ACCEPTABLE: i => `Operation must complete within acceptable latency`,
    STATE_VALID: i => `Application state must be in valid configuration for "${i.category}"`,
    DEPENDENCY_PRESENT: i => `Required dependencies for "${i.category}" must be available`,
    FORMAT_COMPATIBLE: i => `Data formats must be compatible for processing`,
    NETWORK_AVAILABLE: i => `Network connectivity must be available`,
    STORAGE_AVAILABLE: i => `Client-side storage must be available and accessible`,
    BROWSER_CAPABILITY: i => `Browser must support required capabilities`,
  };

  const subjects: Record<AssumptionCategory, (intent: IntentSpec) => string> = {
    DATA_EXISTS: i => extractEntityFromRequirement(i.requirement) || 'data',
    API_AVAILABLE: i => `${i.category} API`,
    PERMISSION_GRANTED: i => `${i.category} permission`,
    LATENCY_ACCEPTABLE: i => 'operation latency',
    STATE_VALID: i => 'application state',
    DEPENDENCY_PRESENT: i => 'dependencies',
    FORMAT_COMPATIBLE: i => 'data format',
    NETWORK_AVAILABLE: i => 'network',
    STORAGE_AVAILABLE: i => 'storage',
    BROWSER_CAPABILITY: i => 'browser',
  };

  // Determine criticality based on category and intent priority
  const criticalCategories: AssumptionCategory[] = [
    'DATA_EXISTS',
    'API_AVAILABLE',
    'PERMISSION_GRANTED',
  ];

  return {
    id: generateAssumptionId(intent.id),
    intentId: intent.id,
    category,
    description: descriptions[category](intent),
    subject: subjects[category](intent),
    sourceAxis: 'requirement',
    sourceEvidence: intent.requirement,
    validated: false,
    critical: criticalCategories.includes(category) || intent.priority === 'critical',
    extractedAt: new Date(),
  };
}

/**
 * Create assumption from keyword match
 */
function createKeywordAssumption(
  intent: IntentSpec,
  category: AssumptionCategory,
  subject: string,
  evidence: string
): IntentAssumption {
  const descriptions: Record<AssumptionCategory, string> = {
    DATA_EXISTS: `"${subject}" data must exist and be accessible`,
    API_AVAILABLE: `API endpoint for "${subject}" must be available`,
    PERMISSION_GRANTED: `User must have permission to ${evidence}`,
    LATENCY_ACCEPTABLE: `"${subject}" operation must complete quickly`,
    STATE_VALID: `State for "${subject}" must be valid`,
    DEPENDENCY_PRESENT: `"${subject}" dependency must be present`,
    FORMAT_COMPATIBLE: `"${subject}" format must be compatible`,
    NETWORK_AVAILABLE: `Network must be available for "${subject}"`,
    STORAGE_AVAILABLE: `Storage must be available for "${subject}"`,
    BROWSER_CAPABILITY: `Browser must support "${subject}"`,
  };

  return {
    id: generateAssumptionId(intent.id),
    intentId: intent.id,
    category,
    description: descriptions[category],
    subject,
    sourceAxis: 'requirement',
    sourceEvidence: evidence,
    validated: false,
    critical: intent.priority === 'critical',
    extractedAt: new Date(),
  };
}

/**
 * Extract entity name from requirement text
 */
function extractEntityFromRequirement(requirement: string): string | null {
  const patterns = [
    /(?:display|show|list|view|get|fetch|load)\s+(?:all\s+)?(?:the\s+)?(\w+)/i,
    /(\w+)\s+(?:list|data|items|records)/i,
    /user(?:'s)?\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(requirement);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract subject based on category and requirement
 */
function extractSubjectFromRequirement(requirement: string, category: AssumptionCategory): string {
  const entity = extractEntityFromRequirement(requirement);
  if (entity) return entity;

  // Default subjects
  const defaults: Record<AssumptionCategory, string> = {
    DATA_EXISTS: 'data',
    API_AVAILABLE: 'API',
    PERMISSION_GRANTED: 'action',
    LATENCY_ACCEPTABLE: 'operation',
    STATE_VALID: 'state',
    DEPENDENCY_PRESENT: 'dependency',
    FORMAT_COMPATIBLE: 'format',
    NETWORK_AVAILABLE: 'network',
    STORAGE_AVAILABLE: 'storage',
    BROWSER_CAPABILITY: 'capability',
  };

  return defaults[category];
}

/**
 * Validate assumptions against the causal chain
 */
function validateAssumptionsAgainstChain(
  assumptions: IntentAssumption[],
  chain: IntentCausalChain
): void {
  for (const assumption of assumptions) {
    switch (assumption.sourceAxis) {
      case 'trigger':
        if (chain.foundTrigger) {
          assumption.validated = true;
          assumption.validationResult = 'CONFIRMED';
          assumption.validationEvidence = `Found trigger at ${chain.foundTrigger.file}:${chain.foundTrigger.line}`;
        } else if (chain.axisScores.trigger === 0) {
          assumption.validated = true;
          assumption.validationResult = 'DENIED';
          assumption.validationEvidence = 'No trigger found in code';
        }
        break;

      case 'state':
        if (chain.foundState) {
          assumption.validated = true;
          assumption.validationResult = 'CONFIRMED';
          assumption.validationEvidence = `Found state "${chain.foundState.stateName}" at ${chain.foundState.file}:${chain.foundState.line}`;
        } else if (chain.axisScores.state === 0) {
          assumption.validated = true;
          assumption.validationResult = 'DENIED';
          assumption.validationEvidence = 'No state management found in code';
        }
        break;

      case 'outcome':
        if (chain.foundOutcome) {
          assumption.validated = true;
          assumption.validationResult = 'CONFIRMED';
          assumption.validationEvidence = `Found outcome at ${chain.foundOutcome.file}:${chain.foundOutcome.line}`;
        } else if (chain.axisScores.outcome === 0) {
          assumption.validated = true;
          assumption.validationResult = 'DENIED';
          assumption.validationEvidence = 'No observable outcome found in code';
        }
        break;

      case 'effect':
        if (chain.axisScores.effect === 1) {
          assumption.validated = true;
          assumption.validationResult = 'CONFIRMED';
          assumption.validationEvidence = 'Trigger connects to state';
        } else if (chain.axisScores.effect === 0) {
          assumption.validated = true;
          assumption.validationResult = 'DENIED';
          assumption.validationEvidence = 'Trigger does not connect to state';
        }
        break;
    }
  }
}

// ============================================
// BATCH EXTRACTION
// ============================================

/**
 * Extract assumptions from all intents
 */
export function extractAllAssumptions(chains: IntentCausalChain[]): IntentAssumptionSummary[] {
  const summaries: IntentAssumptionSummary[] = [];

  for (const chain of chains) {
    const assumptions = extractAssumptionsFromIntent(chain.intent, chain);

    const confirmed = assumptions.filter(a => a.validationResult === 'CONFIRMED').length;
    const denied = assumptions.filter(a => a.validationResult === 'DENIED').length;
    const unknown = assumptions.filter(
      a => a.validationResult === 'UNKNOWN' || !a.validated
    ).length;
    const criticalDenied = assumptions.filter(
      a => a.critical && a.validationResult === 'DENIED'
    ).length;

    summaries.push({
      intentId: chain.intent.id,
      requirement: chain.intent.requirement,
      totalAssumptions: assumptions.length,
      confirmedAssumptions: confirmed,
      deniedAssumptions: denied,
      unknownAssumptions: unknown,
      criticalDenied,
      assumptions,
    });
  }

  return summaries;
}

/**
 * Get all denied assumptions across intents
 */
export function getDeniedAssumptions(summaries: IntentAssumptionSummary[]): IntentAssumption[] {
  return summaries.flatMap(s => s.assumptions.filter(a => a.validationResult === 'DENIED'));
}

/**
 * Get critical denied assumptions (these block the intent)
 */
export function getCriticalDeniedAssumptions(
  summaries: IntentAssumptionSummary[]
): IntentAssumption[] {
  return summaries.flatMap(s =>
    s.assumptions.filter(a => a.critical && a.validationResult === 'DENIED')
  );
}

// ============================================
// LOGGING
// ============================================

export function logAssumptionSummary(summary: IntentAssumptionSummary): void {
  const icon = summary.criticalDenied > 0 ? '⚠' : summary.deniedAssumptions > 0 ? '!' : '✓';
  console.log(`[IRCL] ${icon} Intent: ${summary.intentId}`);
  console.log(`[IRCL]   "${summary.requirement.slice(0, 50)}..."`);
  console.log(
    `[IRCL]   Assumptions: ${summary.totalAssumptions} (✓${summary.confirmedAssumptions} ✗${summary.deniedAssumptions} ?${summary.unknownAssumptions})`
  );

  if (summary.criticalDenied > 0) {
    console.log(`[IRCL]   ⚠️ ${summary.criticalDenied} CRITICAL assumption(s) denied`);
    for (const assumption of summary.assumptions.filter(
      a => a.critical && a.validationResult === 'DENIED'
    )) {
      console.log(`[IRCL]     - ${assumption.category}: ${assumption.description}`);
    }
  }
}

export function logAllAssumptions(summaries: IntentAssumptionSummary[]): void {
  console.log('[IRCL] ==========================================');
  console.log('[IRCL] INTENT ASSUMPTION ANALYSIS');
  console.log('[IRCL] ==========================================');

  const totalAssumptions = summaries.reduce((sum, s) => sum + s.totalAssumptions, 0);
  const totalConfirmed = summaries.reduce((sum, s) => sum + s.confirmedAssumptions, 0);
  const totalDenied = summaries.reduce((sum, s) => sum + s.deniedAssumptions, 0);
  const totalCriticalDenied = summaries.reduce((sum, s) => sum + s.criticalDenied, 0);

  console.log(`[IRCL] Total: ${totalAssumptions} assumptions across ${summaries.length} intents`);
  console.log(
    `[IRCL] Confirmed: ${totalConfirmed} | Denied: ${totalDenied} | Critical Denied: ${totalCriticalDenied}`
  );
  console.log('[IRCL] ------------------------------------------');

  for (const summary of summaries) {
    logAssumptionSummary(summary);
  }

  console.log('[IRCL] ==========================================');
}

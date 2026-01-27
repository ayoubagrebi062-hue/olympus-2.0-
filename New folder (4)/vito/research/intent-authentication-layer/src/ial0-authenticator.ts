/**
 * RESEARCH: intent-authentication-layer
 *
 * IAL-0: Intent Authentication Layer
 * Determines admissibility of intents before constitutional evaluation.
 *
 * Authority: EXPERIMENTAL (cannot ship)
 */

import * as crypto from 'crypto';

// ============================================
// VERSION IDENTITY
// ============================================

export const IAL0_VERSION = '0.1.0-research';

export const IAL0_IDENTITY = Object.freeze({
  name: 'Intent Authentication Layer',
  version: IAL0_VERSION,
  authority: 'EXPERIMENTAL' as const,
  canShip: false,
});

// ============================================
// TYPES
// ============================================

export type RejectionReason =
  | 'REJECT_NO_PROVENANCE'
  | 'REJECT_MALFORMED'
  | 'REJECT_UNDERSPECIFIED'
  | 'REJECT_HOSTILE'
  | 'REJECT_PHANTOM';

export interface Provenance {
  source: string;
  span: {
    start: number;
    end: number;
    text: string;
  };
  rule: string;
  confidence: number;
}

export interface Intent {
  id: string;
  requirement: string;
  category?: string;
  priority?: string;
  trigger?: {
    type: string;
    event?: string;
    target?: string;
    condition?: string;
    provenance?: Provenance;
  };
  state?: {
    name: string;
    provenance?: Provenance;
  };
  effect?: {
    action: string;
    target?: string;
    value?: unknown;
    provenance?: Provenance;
  };
  outcome?: {
    description: string;
    provenance?: Provenance;
  };
  provenance?: Provenance;
}

export interface RejectionDetails {
  check: string;
  message: string;
  suggestion?: string;
  evidence?: Record<string, unknown>;
}

export interface RejectedIntent {
  intentId: string;
  status: 'REJECTED';
  reason: RejectionReason;
  details: RejectionDetails;
  timestamp: string;
}

export interface AuthenticationResult {
  version: string;
  sourceHash: string;
  authenticatedAt: string;
  authenticated: Intent[];
  rejected: RejectedIntent[];
  summary: {
    total: number;
    authenticated: number;
    rejected: number;
    authenticationRate: number;
    rejectionsByReason: Record<RejectionReason, number>;
  };
  guarantees: {
    noPhantoms: boolean;
    minimumSpecificity: boolean;
    deterministic: boolean;
  };
}

// ============================================
// HOSTILE PATTERNS
// ============================================

const HOSTILE_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /bypass.*(auth|security|safety|check|validation)/i, code: 'HOST-001' },
  { pattern: /ignore.*(constraint|rule|check|limit)/i, code: 'HOST-002' },
  { pattern: /disable.*(validation|verification|check|safety)/i, code: 'HOST-003' },
  { pattern: /skip.*(check|test|verification|validation)/i, code: 'HOST-004' },
  { pattern: /override.*(security|permission|access|limit)/i, code: 'HOST-005' },
  { pattern: /backdoor|secret.*(access|entry|admin)/i, code: 'HOST-006' },
  { pattern: /unlimited.*(admin|access|permission)/i, code: 'HOST-007' },
  { pattern: /always.*(succeed|pass|allow)|never.*(fail|reject|block)/i, code: 'HOST-008' },
];

// ============================================
// PHANTOM PATTERNS
// ============================================

const PHANTOM_SUFFIXES = ['thes', 'ons', 'ats', 'ifs', 'pointss', 'updatess', 'showss', 'meetingss'];
const PHANTOM_LINK_PATTERN = /^(On|The|A|An|In|At|To|If|Is|It)Link$/i;
const PHANTOM_BUTTON_PATTERN = /^(On|The|A|An|In|At|To|If|Is|It)Button$/i;

function isPhantomName(name: string): boolean {
  const lower = name.toLowerCase();

  // Check direct phantom suffixes
  if (PHANTOM_SUFFIXES.includes(lower)) {
    return true;
  }

  // Check Link/Button patterns from articles
  if (PHANTOM_LINK_PATTERN.test(name) || PHANTOM_BUTTON_PATTERN.test(name)) {
    return true;
  }

  return false;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateProvenance(intent: Intent, sourceText: string): RejectedIntent | null {
  // Check 1: Provenance exists
  if (!intent.provenance) {
    return {
      intentId: intent.id || 'unknown',
      status: 'REJECTED',
      reason: 'REJECT_NO_PROVENANCE',
      details: {
        check: 'IAL-0-PROV',
        message: 'Intent has no provenance object',
        suggestion: 'Use provenance parser to extract intents with source tracking',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 2: Source is "input"
  if (intent.provenance.source !== 'input') {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_NO_PROVENANCE',
      details: {
        check: 'IAL-0-PROV',
        message: `Provenance source is "${intent.provenance.source}", must be "input"`,
        suggestion: 'Ensure intents are derived from user input, not templates',
        evidence: { source: intent.provenance.source },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 3: Confidence >= 0.5
  if (intent.provenance.confidence < 0.5) {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_NO_PROVENANCE',
      details: {
        check: 'IAL-0-PROV',
        message: `Provenance confidence ${intent.provenance.confidence} is below minimum 0.5`,
        suggestion: 'Use more specific extraction rules or clearer input text',
        evidence: { confidence: intent.provenance.confidence },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 4: Span text matches source
  if (intent.provenance.span) {
    const { start, end, text } = intent.provenance.span;
    const actualText = sourceText.substring(start, end);

    if (actualText !== text) {
      return {
        intentId: intent.id,
        status: 'REJECTED',
        reason: 'REJECT_NO_PROVENANCE',
        details: {
          check: 'IAL-0-PROV',
          message: 'Span text does not match source text at indices',
          suggestion: 'Verify span indices are correct',
          evidence: { expected: text, actual: actualText, start, end },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

function validateStructure(intent: Intent): RejectedIntent | null {
  // Check 1: ID exists and non-empty
  if (!intent.id || intent.id.trim() === '') {
    return {
      intentId: 'unknown',
      status: 'REJECTED',
      reason: 'REJECT_MALFORMED',
      details: {
        check: 'IAL-0-STRUCT',
        message: 'Intent ID is missing or empty',
        suggestion: 'Provide a unique identifier like "INT-001"',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 2: Requirement exists and >= 10 chars
  if (!intent.requirement || intent.requirement.length < 10) {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_MALFORMED',
      details: {
        check: 'IAL-0-STRUCT',
        message: `Requirement too short (${intent.requirement?.length || 0} chars, need 10+)`,
        suggestion: 'Write a more descriptive requirement',
        evidence: { length: intent.requirement?.length || 0 },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 3: Valid category
  const validCategories = ['functional', 'constraint', 'initialization', 'navigation', 'validation'];
  if (!intent.category || !validCategories.includes(intent.category)) {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_MALFORMED',
      details: {
        check: 'IAL-0-STRUCT',
        message: `Invalid category "${intent.category}"`,
        suggestion: `Use one of: ${validCategories.join(', ')}`,
        evidence: { category: intent.category, valid: validCategories },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Check 4: Valid priority
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!intent.priority || !validPriorities.includes(intent.priority)) {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_MALFORMED',
      details: {
        check: 'IAL-0-STRUCT',
        message: `Invalid priority "${intent.priority}"`,
        suggestion: `Use one of: ${validPriorities.join(', ')}`,
        evidence: { priority: intent.priority, valid: validPriorities },
      },
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

function validateSpecificity(intent: Intent): RejectedIntent | null {
  let axisCount = 0;
  const axesFound: string[] = [];
  const axesMissing: string[] = [];

  // Check trigger axis
  if (intent.trigger && intent.trigger.type) {
    axisCount++;
    axesFound.push('trigger');
  } else {
    axesMissing.push('trigger');
  }

  // Check state axis (state name OR effect target)
  if ((intent.state && intent.state.name) || (intent.effect && intent.effect.target)) {
    axisCount++;
    axesFound.push('state');
  } else {
    axesMissing.push('state');
  }

  // Check effect axis
  if (intent.effect && intent.effect.action) {
    axisCount++;
    axesFound.push('effect');
  } else {
    axesMissing.push('effect');
  }

  // Check outcome axis
  if (intent.outcome && intent.outcome.description) {
    axisCount++;
    axesFound.push('outcome');
  } else {
    axesMissing.push('outcome');
  }

  if (axisCount < 2) {
    return {
      intentId: intent.id,
      status: 'REJECTED',
      reason: 'REJECT_UNDERSPECIFIED',
      details: {
        check: 'IAL-0-SPEC',
        message: `Intent specifies only ${axisCount} of 4 axes (minimum: 2)`,
        suggestion: 'Add trigger, state, effect, or outcome to make intent evaluable',
        evidence: { axisCount, axesFound, axesMissing },
      },
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

function validateHostile(intent: Intent): RejectedIntent | null {
  const requirement = intent.requirement.toLowerCase();

  for (const { pattern, code } of HOSTILE_PATTERNS) {
    if (pattern.test(requirement)) {
      return {
        intentId: intent.id,
        status: 'REJECTED',
        reason: 'REJECT_HOSTILE',
        details: {
          check: 'IAL-0-HOSTILE',
          message: `Intent matches hostile pattern ${code}`,
          suggestion: 'Rephrase requirement without hostile terms',
          evidence: { pattern: pattern.source, code },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

function validatePhantom(intent: Intent, sourceText: string): RejectedIntent | null {
  const sourceLower = sourceText.toLowerCase();

  // Check trigger target
  if (intent.trigger?.target) {
    const targetLower = intent.trigger.target.toLowerCase();
    if (!sourceLower.includes(targetLower)) {
      return {
        intentId: intent.id,
        status: 'REJECTED',
        reason: 'REJECT_PHANTOM',
        details: {
          check: 'IAL-0-PHANTOM',
          message: `Trigger target "${intent.trigger.target}" not found in source text`,
          suggestion: 'Ensure target element name appears in original description',
          evidence: { target: intent.trigger.target },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Check state name for phantom patterns
  if (intent.state?.name) {
    if (isPhantomName(intent.state.name)) {
      return {
        intentId: intent.id,
        status: 'REJECTED',
        reason: 'REJECT_PHANTOM',
        details: {
          check: 'IAL-0-PHANTOM',
          message: `State name "${intent.state.name}" appears to be a phantom (word fragment)`,
          suggestion: 'Use actual state names from the description',
          evidence: { stateName: intent.state.name },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Check effect target
  if (intent.effect?.target) {
    const targetLower = intent.effect.target.toLowerCase();
    // Allow common targets like "counter", "value", etc. even if not literally in source
    const commonTargets = ['counter', 'value', 'count', 'number', 'display', 'list', 'item'];
    if (!sourceLower.includes(targetLower) && !commonTargets.includes(targetLower)) {
      return {
        intentId: intent.id,
        status: 'REJECTED',
        reason: 'REJECT_PHANTOM',
        details: {
          check: 'IAL-0-PHANTOM',
          message: `Effect target "${intent.effect.target}" not found in source text`,
          suggestion: 'Ensure target element name appears in original description',
          evidence: { target: intent.effect.target },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

// ============================================
// MAIN AUTHENTICATION FUNCTION
// ============================================

export function authenticateIntent(intent: Intent, sourceText: string): 'AUTHENTICATED' | RejectedIntent {
  // Check 1: Provenance
  const provResult = validateProvenance(intent, sourceText);
  if (provResult) return provResult;

  // Check 2: Structure
  const structResult = validateStructure(intent);
  if (structResult) return structResult;

  // Check 3: Specificity
  const specResult = validateSpecificity(intent);
  if (specResult) return specResult;

  // Check 4: Hostile
  const hostileResult = validateHostile(intent);
  if (hostileResult) return hostileResult;

  // Check 5: Phantom
  const phantomResult = validatePhantom(intent, sourceText);
  if (phantomResult) return phantomResult;

  return 'AUTHENTICATED';
}

export function authenticateBatch(intents: Intent[], sourceText: string): AuthenticationResult {
  const authenticated: Intent[] = [];
  const rejected: RejectedIntent[] = [];

  const rejectionsByReason: Record<RejectionReason, number> = {
    REJECT_NO_PROVENANCE: 0,
    REJECT_MALFORMED: 0,
    REJECT_UNDERSPECIFIED: 0,
    REJECT_HOSTILE: 0,
    REJECT_PHANTOM: 0,
  };

  for (const intent of intents) {
    const result = authenticateIntent(intent, sourceText);

    if (result === 'AUTHENTICATED') {
      authenticated.push(intent);
    } else {
      rejected.push(result);
      rejectionsByReason[result.reason]++;
    }
  }

  const total = intents.length;
  const authCount = authenticated.length;
  const rejCount = rejected.length;

  return {
    version: IAL0_VERSION,
    sourceHash: crypto.createHash('sha256').update(sourceText).digest('hex'),
    authenticatedAt: new Date().toISOString(),
    authenticated,
    rejected,
    summary: {
      total,
      authenticated: authCount,
      rejected: rejCount,
      authenticationRate: total > 0 ? authCount / total : 0,
      rejectionsByReason,
    },
    guarantees: {
      noPhantoms: rejectionsByReason.REJECT_PHANTOM === 0 && authenticated.every(i => !containsPhantom(i, sourceText)),
      minimumSpecificity: authenticated.every(i => countAxes(i) >= 2),
      deterministic: true,
    },
  };
}

// Helper functions
function containsPhantom(intent: Intent, sourceText: string): boolean {
  return validatePhantom(intent, sourceText) !== null;
}

function countAxes(intent: Intent): number {
  let count = 0;
  if (intent.trigger?.type) count++;
  if (intent.state?.name || intent.effect?.target) count++;
  if (intent.effect?.action) count++;
  if (intent.outcome?.description) count++;
  return count;
}

// ============================================
// EXPORTS
// ============================================

export { IAL0_IDENTITY, IAL0_VERSION };

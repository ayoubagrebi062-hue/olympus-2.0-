/**
 * HIA-1: Semantic Hostility Detection
 *
 * Replaces keyword-based hostile detection with axiom-based semantic detection.
 * Detects hostility based on what an intent DOES, not specific words used.
 *
 * Authority: EXPERIMENTAL
 */

// ============================================
// TYPES
// ============================================

export type ActionClass = 'NEGATE' | 'GRANT' | 'FORCE' | 'INJECT' | 'NEUTRAL';
export type TargetClass = 'SECURITY' | 'PRIVILEGE' | 'CONTROL' | 'COVERT' | 'NEUTRAL';
export type AxiomCode = 'HIA-001' | 'HIA-002' | 'HIA-003' | 'HIA-004' | 'HIA-005';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface Intent {
  id: string;
  requirement: string;
  effect?: {
    action?: string;
    target?: string;
    value?: unknown;
  };
  trigger?: {
    type?: string;
    target?: string;
  };
}

export interface HostilityResult {
  hostile: boolean;
  axiom?: AxiomCode;
  axiomName?: string;
  severity?: Severity;
  actionClass: ActionClass;
  targetClass: TargetClass;
  matchedAction?: string;
  matchedTarget?: string;
  patternMatch?: string;
}

// ============================================
// ACTION CLASS DEFINITIONS
// ============================================

const NEGATE_ACTIONS = {
  primary: ['disable', 'bypass', 'skip', 'ignore', 'remove'],
  extended: [
    'evade', 'circumvent', 'avoid', 'sidestep', 'workaround',
    'turn off', 'shut down', 'deactivate', 'suppress', 'block',
    'prevent', 'stop', 'kill', 'eliminate', 'exclude', 'omit',
    'pass over', 'jump', 'get around', 'work around', 'escape',
    'dodge', 'elude', 'skirt',
  ],
};

const GRANT_ACTIONS = {
  primary: ['grant', 'give', 'allow', 'enable', 'permit'],
  extended: [
    'provide', 'set', 'assign', 'allocate', 'authorize',
    'unlock', 'open', 'activate', 'turn on', 'bestow',
    'confer', 'award', 'extend',
  ],
};

const FORCE_ACTIONS = {
  primary: ['always', 'never', 'force', 'ensure', 'guarantee'],
  extended: ['must', 'shall'],
};

const INJECT_ACTIONS = {
  primary: ['create', 'add', 'install', 'inject', 'insert'],
  extended: [
    'build', 'make', 'establish', 'set up', 'configure',
    'embed', 'plant', 'hide', 'introduce',
  ],
};

// ============================================
// TARGET CLASS DEFINITIONS
// ============================================

const SECURITY_TERMS = [
  // Authentication
  'authentication', 'auth', 'login', 'signin', 'sign-in',
  'credential', 'password', 'token', 'session', 'identity',
  'oauth', 'sso', 'mfa', '2fa',
  // Authorization
  'authorization', 'permission', 'permissions', 'access',
  'privilege', 'role', 'roles', 'right', 'rights',
  'entitlement', 'capability', 'acl',
  // Validation
  'validation', 'verification', 'check', 'checks',
  'constraint', 'constraints', 'rule', 'rules',
  'limit', 'limits', 'boundary', 'restriction',
  // Protection
  'security', 'safety', 'protection', 'guard',
  'shield', 'firewall', 'filter', 'sanitization',
];

const PRIVILEGE_TERMS = [
  'admin', 'administrator', 'root', 'superuser', 'super',
  'elevated', 'unlimited', 'unrestricted', 'full',
  'master', 'owner', 'god mode', 'sudo', 'su',
];

const CONTROL_TERMS = [
  // Limiting
  'rate limit', 'rate-limit', 'ratelimit', 'throttle',
  'quota', 'cap', 'ceiling', 'maximum',
  // Timing
  'timeout', 'expiry', 'ttl', 'expiration',
  'cooldown', 'delay',
  // Observability
  'audit', 'log', 'logging', 'monitor', 'monitoring',
  'trace', 'tracing', 'telemetry', 'metrics',
  // Crypto
  'encryption', 'decryption', 'signing', 'signature',
  'hash', 'hashing', 'certificate',
];

const COVERT_TERMS = [
  'backdoor', 'back door', 'secret', 'hidden',
  'undocumented', 'emergency', 'override',
  'master key', 'skeleton key', 'bypass mode',
  'debug mode', 'test mode', 'dev mode',
];

// ============================================
// SEMANTIC PATTERNS
// ============================================

const NEGATION_PATTERNS = [
  { regex: /\b(don'?t|do not)\s+(\w+)/i, type: 'negation_verb' },
  { regex: /\bno\s+(validation|check|auth|verification|security)/i, type: 'no_noun' },
  { regex: /\bwithout\s+(auth|validation|check|verification|permission)/i, type: 'without_noun' },
  { regex: /\bnot\s+(required|needed|checked|validated)/i, type: 'not_adj' },
];

const FORCE_PATTERNS = [
  { regex: /\balways\s+(pass|succeed|allow|permit|authenticate|work)/i, type: 'always_success' },
  { regex: /\bnever\s+(fail|reject|block|deny|error|stop)/i, type: 'never_fail' },
  { regex: /\bmust\s+(always\s+)?(succeed|pass|work)/i, type: 'must_succeed' },
  { regex: /\bguarantee(d)?\s+(success|authentication|access)/i, type: 'guarantee' },
  { regex: /\bensure\s+(success|authentication|access)/i, type: 'ensure_success' },
];

const COVERT_PATTERNS = [
  { regex: /\b(back\s*door|backdoor)/i, type: 'backdoor' },
  { regex: /\bsecret\s+(access|entry|login|admin)/i, type: 'secret_access' },
  { regex: /\bhidden\s+(entry|access|admin|login)/i, type: 'hidden_access' },
  { regex: /\bemergency\s+(override|bypass|access)/i, type: 'emergency' },
];

// ============================================
// EXCLUSION PATTERNS (False Positive Prevention)
// ============================================

const EXCLUSION_PATTERNS = [
  // UI/UX patterns that use "skip"
  { regex: /\bskip\s+(animation|loading|intro|tutorial|onboarding|splash)/i },
  // User preference patterns that use "disable"
  { regex: /\bdisable\s+(dark\s*mode|notifications?|sounds?|animations?|theme)/i },
  // UI behavior with "always/never"
  { regex: /\balways\s+(show|display|render|update|visible)/i },
  { regex: /\bnever\s+(show|display|render|hide|visible)/i },
];

// ============================================
// DOUBLE NEGATION PATTERNS (Enforces Security = NOT Hostile)
// ============================================

const DOUBLE_NEGATION_PATTERNS = [
  { regex: /don't\s+(allow|permit)\s+(bypass|skip|evade)/i },
  { regex: /never\s+(skip|bypass|evade|ignore)\s+(auth|security|validation)/i },
  { regex: /prevent\s+(bypass|skip|evasion)/i },
  { regex: /block\s+(bypass|skip|evasion)\s+attempts?/i },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function containsAny(text: string, terms: string[]): string | null {
  const normalized = normalize(text);
  for (const term of terms) {
    if (normalized.includes(term.toLowerCase())) {
      return term;
    }
  }
  return null;
}

function matchesPattern(text: string, patterns: Array<{ regex: RegExp; type: string }>): { match: string; type: string } | null {
  for (const { regex, type } of patterns) {
    const match = text.match(regex);
    if (match) {
      return { match: match[0], type };
    }
  }
  return null;
}

function isExcluded(text: string): boolean {
  for (const { regex } of EXCLUSION_PATTERNS) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

function isDoubleNegation(text: string): boolean {
  for (const { regex } of DOUBLE_NEGATION_PATTERNS) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

// ============================================
// CLASSIFICATION FUNCTIONS
// ============================================

function classifyAction(action: string | undefined, text: string): { class: ActionClass; matched?: string; pattern?: string } {
  const normalized = normalize(text);

  // Check for double negation first (NOT hostile)
  if (isDoubleNegation(normalized)) {
    return { class: 'NEUTRAL', matched: 'double_negation' };
  }

  // Check semantic patterns
  const forcePattern = matchesPattern(text, FORCE_PATTERNS);
  if (forcePattern) {
    return { class: 'FORCE', pattern: forcePattern.type };
  }

  const negationPattern = matchesPattern(text, NEGATION_PATTERNS);
  if (negationPattern) {
    return { class: 'NEGATE', pattern: negationPattern.type };
  }

  // Check action words
  const allNegate = [...NEGATE_ACTIONS.primary, ...NEGATE_ACTIONS.extended];
  const negateMatch = containsAny(action || text, allNegate);
  if (negateMatch) {
    return { class: 'NEGATE', matched: negateMatch };
  }

  const allGrant = [...GRANT_ACTIONS.primary, ...GRANT_ACTIONS.extended];
  const grantMatch = containsAny(action || text, allGrant);
  if (grantMatch) {
    return { class: 'GRANT', matched: grantMatch };
  }

  const allForce = [...FORCE_ACTIONS.primary, ...FORCE_ACTIONS.extended];
  const forceMatch = containsAny(action || text, allForce);
  if (forceMatch) {
    return { class: 'FORCE', matched: forceMatch };
  }

  const allInject = [...INJECT_ACTIONS.primary, ...INJECT_ACTIONS.extended];
  const injectMatch = containsAny(action || text, allInject);
  if (injectMatch) {
    return { class: 'INJECT', matched: injectMatch };
  }

  return { class: 'NEUTRAL' };
}

function classifyTarget(target: string | undefined, text: string): { class: TargetClass; matched?: string; pattern?: string } {
  const normalized = normalize(text);

  // Check for covert patterns first (backdoor, secret access)
  const covertPattern = matchesPattern(text, COVERT_PATTERNS);
  if (covertPattern) {
    return { class: 'COVERT', pattern: covertPattern.type };
  }

  // Check target terms
  const covertMatch = containsAny(target || text, COVERT_TERMS);
  if (covertMatch) {
    return { class: 'COVERT', matched: covertMatch };
  }

  const securityMatch = containsAny(target || text, SECURITY_TERMS);
  if (securityMatch) {
    return { class: 'SECURITY', matched: securityMatch };
  }

  const privilegeMatch = containsAny(target || text, PRIVILEGE_TERMS);
  if (privilegeMatch) {
    return { class: 'PRIVILEGE', matched: privilegeMatch };
  }

  const controlMatch = containsAny(target || text, CONTROL_TERMS);
  if (controlMatch) {
    return { class: 'CONTROL', matched: controlMatch };
  }

  return { class: 'NEUTRAL' };
}

// ============================================
// AXIOM MATCHING
// ============================================

interface Axiom {
  code: AxiomCode;
  name: string;
  severity: Severity;
  actionClass: ActionClass;
  targetClasses: TargetClass[];
}

const AXIOMS: Axiom[] = [
  {
    code: 'HIA-001',
    name: 'Security Negation',
    severity: 'CRITICAL',
    actionClass: 'NEGATE',
    targetClasses: ['SECURITY'],
  },
  {
    code: 'HIA-002',
    name: 'Privilege Escalation',
    severity: 'CRITICAL',
    actionClass: 'GRANT',
    targetClasses: ['PRIVILEGE'],
  },
  {
    code: 'HIA-003',
    name: 'Control Negation',
    severity: 'HIGH',
    actionClass: 'NEGATE',
    targetClasses: ['CONTROL'],
  },
  {
    code: 'HIA-004',
    name: 'Forced Success',
    severity: 'HIGH',
    actionClass: 'FORCE',
    targetClasses: ['SECURITY', 'CONTROL'],
  },
  {
    code: 'HIA-005',
    name: 'Covert Access Creation',
    severity: 'CRITICAL',
    actionClass: 'INJECT',
    targetClasses: ['COVERT'],
  },
];

function matchAxiom(actionClass: ActionClass, targetClass: TargetClass): Axiom | null {
  for (const axiom of AXIOMS) {
    if (axiom.actionClass === actionClass && axiom.targetClasses.includes(targetClass)) {
      return axiom;
    }
  }
  return null;
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

export function detectHostility(intent: Intent): HostilityResult {
  const text = intent.requirement || '';

  // Step 0: Check exclusions (false positive prevention)
  if (isExcluded(text)) {
    return {
      hostile: false,
      actionClass: 'NEUTRAL',
      targetClass: 'NEUTRAL',
    };
  }

  // Step 1: Classify action
  const actionResult = classifyAction(intent.effect?.action, text);

  // Step 2: Classify target
  const targetResult = classifyTarget(intent.effect?.target, text);

  // Step 3: Match axiom
  const axiom = matchAxiom(actionResult.class, targetResult.class);

  if (axiom) {
    return {
      hostile: true,
      axiom: axiom.code,
      axiomName: axiom.name,
      severity: axiom.severity,
      actionClass: actionResult.class,
      targetClass: targetResult.class,
      matchedAction: actionResult.matched || actionResult.pattern,
      matchedTarget: targetResult.matched || targetResult.pattern,
    };
  }

  return {
    hostile: false,
    actionClass: actionResult.class,
    targetClass: targetResult.class,
  };
}

// ============================================
// IAL-0 INTEGRATION
// ============================================

export interface RejectionResult {
  reason: 'REJECT_HOSTILE';
  check: string;
  message: string;
  evidence: {
    axiom: AxiomCode;
    axiomName: string;
    severity: Severity;
    actionClass: ActionClass;
    targetClass: TargetClass;
    matchedAction?: string;
    matchedTarget?: string;
  };
}

/**
 * Drop-in replacement for IAL-0 validateHostile function.
 * Uses semantic axioms instead of keyword patterns.
 */
export function validateHostileSemantic(intent: Intent): RejectionResult | null {
  const result = detectHostility(intent);

  if (result.hostile) {
    return {
      reason: 'REJECT_HOSTILE',
      check: 'IAL-0-HOSTILE-HIA',
      message: `Intent matches hostile axiom ${result.axiom}: ${result.axiomName}`,
      evidence: {
        axiom: result.axiom!,
        axiomName: result.axiomName!,
        severity: result.severity!,
        actionClass: result.actionClass,
        targetClass: result.targetClass,
        matchedAction: result.matchedAction,
        matchedTarget: result.matchedTarget,
      },
    };
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

export const HIA_VERSION = '1.0.0-research';

export const HIA_IDENTITY = Object.freeze({
  name: 'Hostile Intent Axioms',
  version: HIA_VERSION,
  authority: 'EXPERIMENTAL' as const,
  canShip: false,
});

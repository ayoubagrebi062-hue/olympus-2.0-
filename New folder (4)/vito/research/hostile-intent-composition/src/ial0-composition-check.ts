/**
 * HIC-1: Intent Composition Hostility Check
 *
 * Detects hostility emerging from combinations of individually admissible intents.
 * Each intent may pass HIA-1 single-intent checks but become hostile when combined.
 *
 * Authority: EXPERIMENTAL
 */

// ============================================
// TYPES
// ============================================

export type HICRule = 'HIC-001' | 'HIC-002' | 'HIC-003' | 'HIC-004' | 'HIC-005' | 'HIC-006';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type SemanticTag =
  | 'REDUCES_OBSERVABILITY'
  | 'ACCESSES_SENSITIVE'
  | 'MODIFIES_SENSITIVE'
  | 'STORES_CREDENTIAL'
  | 'EXPORTS_DATA'
  | 'TRANSMITS_DATA'
  | 'CHECKS_PERMISSION'
  | 'CACHES_RESULT'
  | 'USES_CACHED'
  | 'SETS_MODE'
  | 'READS_MODE'
  | 'GRANTS_ACCESS'
  | 'ELEVATES_CONTEXT'
  | 'CHECKS_ENVIRONMENT'
  | 'CONDITIONAL_BEHAVIOR'
  | 'USER_TRIGGERED';

export interface Intent {
  id: string;
  requirement: string;
  category?: string;
  priority?: string;
  trigger?: {
    type?: string;
    target?: string;
    event?: string;
  };
  state?: {
    name?: string;
  };
  effect?: {
    action?: string;
    target?: string;
    value?: unknown;
  };
  provenance?: {
    source?: string;
    span?: {
      start: number;
      end: number;
      text: string;
    };
    rule?: string;
    confidence?: number;
  };
}

export interface TaggedIntent extends Intent {
  tags: SemanticTag[];
  stateReferences: string[];
  stateWrites: string[];
}

export interface Violation {
  rule: HICRule;
  ruleName: string;
  severity: Severity;
  contributingIntents: string[];
  explanation: string;
}

export interface CompositionResult {
  hostile: boolean;
  violations: Violation[];
  taggedIntents: Array<{
    id: string;
    tags: SemanticTag[];
  }>;
}

// ============================================
// TAG EXTRACTION PATTERNS
// ============================================

const OBSERVABILITY_REDUCTION_PATTERNS = [
  /\b(reduce|decrease|lower|minimize|limit)\s+(the\s+)?(log|logging|trace|tracing|monitoring|audit)/i,
  /\b(log|trace|monitor|audit)\s+(only\s+)?(error|critical|warning|exception)/i,
  /\b(turn off|disable)\s+(verbose|debug|detailed)(\s+\w+)?\s+(log|logging|mode)/i,
  /\b(turn off|disable)\s+verbose/i,
  /\bsilent\s+mode/i,
  /\bquiet\s+(log|logging|output)/i,
  /\bminimize\s+audit/i,
];

const SENSITIVE_ACCESS_PATTERNS = [
  /\b(access|read|get|fetch|retrieve|query|view)\s+(all\s+)?(user|customer|patient|client|employee|member)/i,
  /\b(access|read|get|fetch|retrieve|query|export)\s+(all\s+)?(record|data|information)/i,
  /\b(financial|medical|health|personal|private)\s+(record|data|information|transaction)/i,
  /\b(export|download)\s+(all\s+)?(customer|user|patient)/i,
  /\bcustomer\s+record/i,
];

const SENSITIVE_MODIFY_PATTERNS = [
  /\b(modify|update|change|edit|alter)\s+(user|customer|account|permission)/i,
  /\b(permission|role|access)\s+(update|change|modify)/i,
];

const CREDENTIAL_STORAGE_PATTERNS = [
  /\b(store|save|cache|keep|persist|remember)\s+.{0,30}(password|credential|token|secret|key|apitoken|api.?token)/i,
  /\b(password|credential|token|secret|apitoken)\s+.{0,20}(store|save|cache|keep|persist)/i,
  /\blocalstorage\s*[.\[].{0,30}(password|token|credential|secret)/i,
  /\bsession.?storage\s*[.\[].{0,30}(password|token|credential|secret)/i,
];

const EXPORT_DATA_PATTERNS = [
  /\b(export|download)\s+(all\s+)?(localstorage|sessionstorage|storage|data|settings)/i,
  /\bdownload.{0,20}(backup|file|json|csv)/i,
  /\b(export|download).{0,20}(to|as)\s+(file|json|csv)/i,
];

const TRANSMIT_DATA_PATTERNS = [
  /\b(send|transmit|post|push)\s+(all\s+)?(session|data|storage|settings)/i,
  /\b(send|transmit)\s+to\s+(analytics|external|api|webhook|service)/i,
  /\bto\s+analytics\s+service/i,
];

const PERMISSION_CHECK_PATTERNS = [
  /\b(check|verify|validate)\s+.{0,20}(permission|role|admin|access|authorized)/i,
  /\bif\s+.{0,15}(admin|authorized|has.?permission|is.?admin)/i,
  /\b(is|check.?if)\s+(user\s+)?(admin|authorized)/i,
];

const CACHE_RESULT_PATTERNS = [
  /\b(store|cache|save)\s+(result|value)\s+in\s+(\w+)/i,
  /\band\s+(store|cache|save)\s+(in|result)/i,
  /\b(store|cache).{0,15}(permission|admin|role|level)/i,
];

const USES_CACHED_PATTERNS = [
  /\buse\s+(cached|stored)\s+(\w+)/i,
  /\bread\s+cached\s+(\w+)/i,
  /\bwhen\s+\w+\s+is\s+(true|active|enabled)/i,
];

const ENVIRONMENT_CHECK_PATTERNS = [
  /\b(check|read|get)\s+.{0,20}(environment|env|NODE_ENV|RAILS_ENV)/i,
  /\b(development|production|staging|test)\s+(mode|environment)/i,
  /\bif\s+.{0,20}(dev|development|prod|production|staging|test)\s*(mode|env|environment|true|is)/i,
  /\bdetermine\s+if\s+running\s+in/i,
  /\benvironment\s+variable/i,
];

const CONDITIONAL_BEHAVIOR_PATTERNS = [
  /\bif\s+\w+\s+is\s+(true|active|enabled|set)/i,
  /\bwhen\s+\w+\s+is\s+(true|active|enabled)/i,
  /\bif\s+(is|in)\s*(development|dev|test|debug)/i,
  /\ballow\s+.{0,20}without\s+(auth|authentication|token)/i,
];

const GRANTS_ACCESS_PATTERNS = [
  /\ballow\s+(user|users)\s+to\s+(view|read|access|see|send)/i,
  /\bgrant\s+(access|permission)/i,
  /\bsend\s+connection\s+request/i,
  /\bauto.?accept/i,
];

const USER_TRIGGER_TYPES = ['click', 'input', 'submit', 'change'];

// ============================================
// SENSITIVE RESOURCE TERMS
// ============================================

const SENSITIVE_RESOURCES = [
  'user', 'customer', 'patient', 'employee', 'member', 'client',
  'financial', 'medical', 'health', 'personal', 'private',
  'password', 'credential', 'token', 'secret', 'key',
  'ssn', 'social security', 'credit card', 'bank account',
  'transaction', 'payment', 'account',
];

const PRIVILEGE_MODE_TERMS = [
  'debug', 'debugmode', 'admin', 'adminmode', 'super', 'supermode',
  'elevated', 'privilege', 'root', 'dev', 'devmode', 'test', 'testmode',
];

// ============================================
// TAG EXTRACTION
// ============================================

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const normalized = normalize(text);
  return patterns.some(p => p.test(normalized));
}

function extractStateReferences(intent: Intent): string[] {
  const refs: string[] = [];
  const text = normalize(intent.requirement || '');

  // Check state field
  if (intent.state?.name) {
    refs.push(normalize(intent.state.name));
  }

  // Check for "when X is true/active" patterns
  const whenMatch = text.match(/when\s+(\w+)\s+is\s+(true|active|enabled)/i);
  if (whenMatch) {
    refs.push(normalize(whenMatch[1]));
  }

  // Check for "if X is true" patterns
  const ifMatch = text.match(/if\s+(\w+)\s+is\s+(true|active|enabled|set)/i);
  if (ifMatch) {
    refs.push(normalize(ifMatch[1]));
  }

  // Check for "use cached X" patterns
  const useCachedMatch = text.match(/use\s+(?:cached\s+)?(\w+)\s+to/i);
  if (useCachedMatch) {
    refs.push(normalize(useCachedMatch[1]));
  }

  // Check for "read X to" patterns
  const readMatch = text.match(/read\s+(?:cached\s+)?(\w+)/i);
  if (readMatch && !['environment', 'env'].includes(normalize(readMatch[1]))) {
    refs.push(normalize(readMatch[1]));
  }

  return [...new Set(refs)];
}

function extractStateWrites(intent: Intent): string[] {
  const writes: string[] = [];
  const text = normalize(intent.requirement || '');

  // Check effect.target with "set" action
  if (intent.effect?.action === 'set' && intent.effect?.target) {
    writes.push(normalize(intent.effect.target));
  }

  // Check for "store in X" patterns
  const storeMatch = text.match(/(?:store|cache|save)\s+(?:result\s+)?in\s+(\w+)/i);
  if (storeMatch) {
    writes.push(normalize(storeMatch[1]));
  }

  // Check for "set X to" patterns
  const setMatch = text.match(/set\s+(\w+)\s+to/i);
  if (setMatch) {
    writes.push(normalize(setMatch[1]));
  }

  return [...new Set(writes)];
}

function extractTags(intent: Intent): TaggedIntent {
  const tags: SemanticTag[] = [];
  const text = intent.requirement || '';

  // REDUCES_OBSERVABILITY
  if (matchesAny(text, OBSERVABILITY_REDUCTION_PATTERNS)) {
    tags.push('REDUCES_OBSERVABILITY');
  }

  // ACCESSES_SENSITIVE
  if (matchesAny(text, SENSITIVE_ACCESS_PATTERNS)) {
    tags.push('ACCESSES_SENSITIVE');
  }

  // MODIFIES_SENSITIVE
  if (matchesAny(text, SENSITIVE_MODIFY_PATTERNS)) {
    tags.push('MODIFIES_SENSITIVE');
  }

  // STORES_CREDENTIAL
  if (matchesAny(text, CREDENTIAL_STORAGE_PATTERNS)) {
    tags.push('STORES_CREDENTIAL');
  }

  // EXPORTS_DATA
  if (matchesAny(text, EXPORT_DATA_PATTERNS)) {
    tags.push('EXPORTS_DATA');
  }

  // TRANSMITS_DATA
  if (matchesAny(text, TRANSMIT_DATA_PATTERNS)) {
    tags.push('TRANSMITS_DATA');
  }

  // CHECKS_PERMISSION
  if (matchesAny(text, PERMISSION_CHECK_PATTERNS)) {
    tags.push('CHECKS_PERMISSION');
  }

  // CACHES_RESULT
  if (matchesAny(text, CACHE_RESULT_PATTERNS)) {
    tags.push('CACHES_RESULT');
  }

  // USES_CACHED
  if (matchesAny(text, USES_CACHED_PATTERNS)) {
    tags.push('USES_CACHED');
  }

  // CHECKS_ENVIRONMENT
  if (matchesAny(text, ENVIRONMENT_CHECK_PATTERNS)) {
    tags.push('CHECKS_ENVIRONMENT');
  }

  // CONDITIONAL_BEHAVIOR
  if (matchesAny(text, CONDITIONAL_BEHAVIOR_PATTERNS)) {
    tags.push('CONDITIONAL_BEHAVIOR');
  }

  // GRANTS_ACCESS
  if (matchesAny(text, GRANTS_ACCESS_PATTERNS)) {
    tags.push('GRANTS_ACCESS');
  }

  // SETS_MODE - check if setting a privilege-related mode
  const stateWrites = extractStateWrites(intent);
  const isSettingPrivilegeMode = stateWrites.some(w =>
    PRIVILEGE_MODE_TERMS.some(term => w.includes(term))
  );
  if (isSettingPrivilegeMode) {
    tags.push('SETS_MODE');
  }

  // READS_MODE - check if reading a privilege-related mode
  const stateRefs = extractStateReferences(intent);
  const isReadingPrivilegeMode = stateRefs.some(r =>
    PRIVILEGE_MODE_TERMS.some(term => r.includes(term))
  );
  if (isReadingPrivilegeMode) {
    tags.push('READS_MODE');
  }

  // USER_TRIGGERED
  if (intent.trigger?.type && USER_TRIGGER_TYPES.includes(intent.trigger.type)) {
    tags.push('USER_TRIGGERED');
  }

  return {
    ...intent,
    tags,
    stateReferences: stateRefs,
    stateWrites,
  };
}

// ============================================
// RULE CHECKERS
// ============================================

function checkHIC001(intents: TaggedIntent[]): Violation | null {
  // HIC-001: Blind Spot Attack
  // Observability reduced + sensitive data access/modification
  const reducingObservability = intents.filter(i => i.tags.includes('REDUCES_OBSERVABILITY'));
  const accessingSensitive = intents.filter(i =>
    i.tags.includes('ACCESSES_SENSITIVE') ||
    i.tags.includes('MODIFIES_SENSITIVE') ||
    i.tags.includes('EXPORTS_DATA')
  );

  if (reducingObservability.length > 0 && accessingSensitive.length > 0) {
    return {
      rule: 'HIC-001',
      ruleName: 'Blind Spot Attack',
      severity: 'CRITICAL',
      contributingIntents: [
        ...reducingObservability.map(i => i.id),
        ...accessingSensitive.map(i => i.id),
      ],
      explanation: `Intent(s) ${reducingObservability.map(i => i.id).join(', ')} reduce observability ` +
        `(logging/monitoring). Intent(s) ${accessingSensitive.map(i => i.id).join(', ')} access or modify ` +
        `sensitive data. Combined: Sensitive data operations while observability is reduced creates ` +
        `conditions for undetected data theft or manipulation.`,
    };
  }

  return null;
}

function checkHIC002(intents: TaggedIntent[]): Violation | null {
  // HIC-002: Privilege Escalation Chain
  // User-controllable state + privilege-dependent action

  // Find intents that set privilege-related modes and are user-triggered
  const settersWithUserTrigger = intents.filter(i =>
    i.tags.includes('USER_TRIGGERED') &&
    i.stateWrites.some(w => PRIVILEGE_MODE_TERMS.some(term => w.includes(term)))
  );

  // Find intents that read those modes and access sensitive data
  for (const setter of settersWithUserTrigger) {
    for (const stateVar of setter.stateWrites) {
      // Find intents that reference this state and do something sensitive
      const readers = intents.filter(i =>
        i.id !== setter.id &&
        i.stateReferences.includes(stateVar) &&
        (i.tags.includes('ACCESSES_SENSITIVE') ||
         i.tags.includes('MODIFIES_SENSITIVE') ||
         i.tags.includes('ELEVATES_CONTEXT') ||
         i.tags.includes('CONDITIONAL_BEHAVIOR'))
      );

      if (readers.length > 0) {
        return {
          rule: 'HIC-002',
          ruleName: 'Privilege Escalation Chain',
          severity: 'CRITICAL',
          contributingIntents: [setter.id, ...readers.map(i => i.id)],
          explanation: `Intent ${setter.id} allows user to set state '${stateVar}' via ${setter.trigger?.type}. ` +
            `Intent(s) ${readers.map(i => i.id).join(', ')} read this state to enable privileged behavior. ` +
            `Combined: User-controllable privilege flag creates escalation path.`,
        };
      }
    }
  }

  return null;
}

function checkHIC003(intents: TaggedIntent[]): Violation | null {
  // HIC-003: Credential Exfiltration Risk
  // Credential storage + data export/transmit

  const storingCredentials = intents.filter(i => i.tags.includes('STORES_CREDENTIAL'));
  const exportingData = intents.filter(i =>
    i.tags.includes('EXPORTS_DATA') || i.tags.includes('TRANSMITS_DATA')
  );

  // Check if export targets overlap with credential storage locations
  if (storingCredentials.length > 0 && exportingData.length > 0) {
    // Check for localStorage/sessionStorage overlap
    const credentialStoresLocalStorage = storingCredentials.some(i =>
      normalize(i.requirement).includes('localstorage') ||
      normalize(i.requirement).includes('sessionstorage') ||
      normalize(i.requirement).includes('session storage')
    );

    const exportsStorage = exportingData.some(i =>
      normalize(i.requirement).includes('localstorage') ||
      normalize(i.requirement).includes('sessionstorage') ||
      normalize(i.requirement).includes('storage') ||
      normalize(i.requirement).includes('all')
    );

    if (credentialStoresLocalStorage && exportsStorage) {
      return {
        rule: 'HIC-003',
        ruleName: 'Credential Exfiltration Risk',
        severity: 'CRITICAL',
        contributingIntents: [
          ...storingCredentials.map(i => i.id),
          ...exportingData.map(i => i.id),
        ],
        explanation: `Intent(s) ${storingCredentials.map(i => i.id).join(', ')} store credentials in accessible storage. ` +
          `Intent(s) ${exportingData.map(i => i.id).join(', ')} export or transmit storage contents. ` +
          `Combined: Credentials can be exfiltrated via export mechanism.`,
      };
    }

    // Check for session data transmission
    const credentialStoresSession = storingCredentials.some(i =>
      normalize(i.requirement).includes('session')
    );
    const transmitsSession = exportingData.some(i =>
      normalize(i.requirement).includes('session') ||
      normalize(i.requirement).includes('all')
    );

    if (credentialStoresSession && transmitsSession) {
      return {
        rule: 'HIC-003',
        ruleName: 'Credential Exfiltration Risk',
        severity: 'CRITICAL',
        contributingIntents: [
          ...storingCredentials.map(i => i.id),
          ...exportingData.map(i => i.id),
        ],
        explanation: `Intent(s) ${storingCredentials.map(i => i.id).join(', ')} store credentials in session. ` +
          `Intent(s) ${exportingData.map(i => i.id).join(', ')} transmit session data externally. ` +
          `Combined: Credentials can be exfiltrated to external service.`,
      };
    }
  }

  return null;
}

function checkHIC004(intents: TaggedIntent[]): Violation | null {
  // HIC-004: TOCTOU - Temporal Permission Decoupling
  // Permission check + cache + use without re-check

  // Find intents that check permission AND cache result
  const permissionCachers = intents.filter(i =>
    (i.tags.includes('CHECKS_PERMISSION') || i.tags.includes('CACHES_RESULT')) &&
    i.stateWrites.length > 0
  );

  for (const cacher of permissionCachers) {
    for (const stateVar of cacher.stateWrites) {
      // Find intents that use this cached permission with different trigger
      const users = intents.filter(i =>
        i.id !== cacher.id &&
        (i.stateReferences.includes(stateVar) || i.tags.includes('USES_CACHED')) &&
        // Different trigger event indicates temporal separation
        (cacher.trigger?.event !== i.trigger?.event ||
         cacher.trigger?.type !== i.trigger?.type ||
         cacher.trigger?.target !== i.trigger?.target)
      );

      // Check if the cached variable is permission-related
      const isPermissionVar = ['isadmin', 'admin', 'permission', 'role', 'level', 'authorized', 'userlevel']
        .some(term => stateVar.includes(term));

      if (users.length > 0 && isPermissionVar) {
        return {
          rule: 'HIC-004',
          ruleName: 'Temporal Permission Decoupling (TOCTOU)',
          severity: 'HIGH',
          contributingIntents: [cacher.id, ...users.map(i => i.id)],
          explanation: `Intent ${cacher.id} checks and caches permission in '${stateVar}'. ` +
            `Intent(s) ${users.map(i => i.id).join(', ')} use cached permission later without re-verification. ` +
            `Combined: Time gap between check and use allows stale permission bypass.`,
        };
      }
    }
  }

  return null;
}

function checkHIC005(intents: TaggedIntent[]): Violation | null {
  // HIC-005: Access Accumulation
  // Multiple grants that form transitive access path

  const accessGrants = intents.filter(i => i.tags.includes('GRANTS_ACCESS'));

  if (accessGrants.length >= 3) {
    // Check for patterns that allow transitive access
    const allowsConnectToAnyone = accessGrants.some(i =>
      normalize(i.requirement).includes('any') &&
      (normalize(i.requirement).includes('connect') ||
       normalize(i.requirement).includes('request'))
    );

    const allowsViewConnections = accessGrants.some(i =>
      normalize(i.requirement).includes('connection') &&
      normalize(i.requirement).includes('view')
    );

    const autoAccepts = intents.some(i =>
      normalize(i.requirement).includes('auto') &&
      normalize(i.requirement).includes('accept')
    );

    if (allowsConnectToAnyone && allowsViewConnections && autoAccepts) {
      return {
        rule: 'HIC-005',
        ruleName: 'Access Accumulation',
        severity: 'HIGH',
        contributingIntents: accessGrants.map(i => i.id),
        explanation: `Multiple intents grant incremental access that forms transitive path. ` +
          `Connect to anyone + view connections + auto-accept = access any profile. ` +
          `Combined: Accumulated access exceeds intended scope.`,
      };
    }
  }

  return null;
}

function checkHIC006(intents: TaggedIntent[]): Violation | null {
  // HIC-006: Environment-Conditional Security
  // Environment check + security-relevant conditional behavior

  const envCheckers = intents.filter(i => i.tags.includes('CHECKS_ENVIRONMENT'));

  for (const envChecker of envCheckers) {
    // Find the state variable being set
    const envStateVars = envChecker.stateWrites;

    // Find intents that read this env state and have conditional security behavior
    const conditionalSecurityIntents = intents.filter(i =>
      i.id !== envChecker.id &&
      i.tags.includes('CONDITIONAL_BEHAVIOR') &&
      (
        // Either references the env state directly
        i.stateReferences.some(r => envStateVars.includes(r)) ||
        // Or mentions dev/test/prod in condition
        normalize(i.requirement).match(/if\s+.{0,20}(dev|development|test|prod|production)/i) ||
        // Or mentions the env variable name
        envStateVars.some(v => normalize(i.requirement).includes(v))
      )
    );

    // Check if the conditional behavior is security-relevant
    for (const conditional of conditionalSecurityIntents) {
      const text = normalize(conditional.requirement);
      const isSecurityRelevant =
        text.includes('auth') ||
        text.includes('without') ||
        text.includes('skip') ||
        text.includes('bypass') ||
        text.includes('expose') ||
        text.includes('internal') ||
        text.includes('database structure') ||
        text.includes('allow') && text.includes('request');

      if (isSecurityRelevant) {
        return {
          rule: 'HIC-006',
          ruleName: 'Environment-Conditional Security',
          severity: 'CRITICAL',
          contributingIntents: [envChecker.id, conditional.id],
          explanation: `Intent ${envChecker.id} checks environment condition. ` +
            `Intent ${conditional.id} changes security behavior based on environment. ` +
            `Combined: Environment variable controls security-critical behavior (auth, data exposure, etc.).`,
        };
      }
    }
  }

  return null;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeComposition(intents: Intent[]): CompositionResult {
  // Step 1: Tag all intents
  const taggedIntents = intents.map(extractTags);

  // Step 2: Check all rules
  const violations: Violation[] = [];

  const hic001 = checkHIC001(taggedIntents);
  if (hic001) violations.push(hic001);

  const hic002 = checkHIC002(taggedIntents);
  if (hic002) violations.push(hic002);

  const hic003 = checkHIC003(taggedIntents);
  if (hic003) violations.push(hic003);

  const hic004 = checkHIC004(taggedIntents);
  if (hic004) violations.push(hic004);

  const hic005 = checkHIC005(taggedIntents);
  if (hic005) violations.push(hic005);

  const hic006 = checkHIC006(taggedIntents);
  if (hic006) violations.push(hic006);

  // Step 3: Return result
  return {
    hostile: violations.length > 0,
    violations,
    taggedIntents: taggedIntents.map(i => ({
      id: i.id,
      tags: i.tags,
    })),
  };
}

// ============================================
// IAL-0 INTEGRATION
// ============================================

export interface CompositionRejection {
  reason: 'REJECT_COMPOSITION';
  check: string;
  message: string;
  violations: Violation[];
}

/**
 * Drop-in function for IAL-0 composition check.
 * Call after single-intent authentication passes.
 */
export function validateComposition(intents: Intent[]): CompositionRejection | null {
  const result = analyzeComposition(intents);

  if (result.hostile) {
    const primaryViolation = result.violations[0];
    return {
      reason: 'REJECT_COMPOSITION',
      check: `IAL-0-COMPOSITION-${primaryViolation.rule}`,
      message: `Intent set matches hostile composition rule ${primaryViolation.rule}: ${primaryViolation.ruleName}`,
      violations: result.violations,
    };
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

export const HIC_VERSION = '1.0.0-research';

export const HIC_IDENTITY = Object.freeze({
  name: 'Hostile Intent Composition',
  version: HIC_VERSION,
  authority: 'EXPERIMENTAL' as const,
  canShip: false,
});

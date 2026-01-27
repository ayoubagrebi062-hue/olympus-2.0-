/**
 * HCA-1 Shadow Layer Integration
 *
 * Integrates Hostile Capability Analysis (HCA-1) into the shadow pipeline.
 * Detects hostile intent via implied capability acquisition.
 *
 * ID: HCA-1
 * Position: AFTER_HIA-1 (before HIC-1)
 * Mode: ENFORCING (promoted from OBSERVATIONAL on 2026-01-19)
 * Blocking: ENABLED
 * Attribution: REQUIRED (VAL-1 compatible)
 * Rule Prefix: CAP
 * Constitution: SMC-1 compliant
 *
 * Promotion: SSC-2 validated (10,000 tests, 0 S4, 0 FP)
 */

import {
  RuleEmission,
  StageResult,
  createRuleEmission,
  CausalLayer,
} from './verdict-attributor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CapabilityId =
  | 'CAP-001'
  | 'CAP-002'
  | 'CAP-003'
  | 'CAP-004'
  | 'CAP-005'
  | 'CAP-006'
  | 'CAP-007';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CapabilityPattern {
  regex: RegExp;
  weight: number;
  description: string;
}

export interface ExclusionPattern {
  regex: RegExp;
  reason: string;
}

export interface CapabilityDefinition {
  id: CapabilityId;
  name: string;
  description: string;
  severity: Severity;
  patterns: CapabilityPattern[];
  exclusions: ExclusionPattern[];
}

export interface CapabilityMatch {
  capabilityId: CapabilityId;
  capabilityName: string;
  severity: Severity;
  confidence: number;
  matchedText: string;
  matchedPattern: string;
  excluded: boolean;
  exclusionReason?: string;
}

export interface HCA1Result {
  isHostile: boolean;
  verdict: 'HOSTILE' | 'BENIGN';
  detectedCapabilities: CapabilityMatch[];
  triggeredRules: CapabilityId[];
  confidence: number;
  processingTimeMs: number;
}

export interface IntentProvenance {
  declared: string[];
  derived: string[];
  confidence: number;
  semanticTags?: string[];
}

// ============================================================================
// HCA-1 CONFIGURATION
// ============================================================================

export const HCA1_CONFIG = {
  layerId: 'HCA-1',
  position: 'AFTER_HIA-1',
  mode: 'ENFORCING' as const,
  blocking: 'ENABLED' as const,
  attribution: 'REQUIRED' as const,
  rulePrefix: 'CAP',
  constitution: 'SMC-1',
  version: '1.1.0',
  frozen: true,
  deterministic: true,
  noML: true,
  promotedAt: '2026-01-19T08:15:00.000Z',
  promotedFrom: 'OBSERVATIONAL',
};

// ============================================================================
// CAPABILITY TAXONOMY (FROZEN per SMC-1)
// ============================================================================

const CAPABILITY_TAXONOMY: CapabilityDefinition[] = [
  {
    id: 'CAP-001',
    name: 'Unauthorized Access',
    description: 'Intent grants access to resources without proper authentication or authorization',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(allow|grant|enable|provide)\s+(access|entry)\s+(without|regardless of|bypassing)\s+(auth|login|token|session|credentials?)/i, weight: 1.0, description: 'Direct access without authentication' },
      { regex: /\b(any|all|every)\s+(user|person|one)\s+(can|may|is able to)\s+(access|read|write|view|modify)/i, weight: 0.9, description: 'Universal access grant' },
      { regex: /\bno\s+(auth|authentication|login|credential|session)\s+(required|needed|necessary)/i, weight: 1.0, description: 'Authentication explicitly not required' },
      { regex: /\b(works?|functions?|operates?)\s+(without|regardless of)\s+(auth|authentication|login)/i, weight: 0.9, description: 'Operation without authentication' },
      { regex: /\b(access|read|write|view)\s+.{0,30}\s+(regardless|irrespective)\s+of\s+(permission|role|privilege)/i, weight: 1.0, description: 'Access regardless of permissions' },
      { regex: /\b(public|open|unrestricted)\s+(access|endpoint|api)\s+(to|for)\s+(all|any|everyone)/i, weight: 0.8, description: 'Public unrestricted access' },
      { regex: /\bwithout\s+(requiring|needing)\s+(login|authentication|auth)/i, weight: 1.0, description: 'Without requiring login' },
      { regex: /\ballow\s+any\s+user\s+to\s+access/i, weight: 0.9, description: 'Allow any user access' },
      { regex: /\bwithout\s+checking\s+credentials?/i, weight: 1.0, description: 'Without checking credentials' },
    ],
    exclusions: [
      { regex: /\bpublic\s+(content|page|resource|asset|static)/i, reason: 'Legitimately public content' },
      { regex: /\b(marketing|landing|home)\s+page/i, reason: 'Public-facing pages' },
    ],
  },
  {
    id: 'CAP-002',
    name: 'Privilege Acquisition',
    description: 'Intent enables gaining elevated privileges without proper authorization flow',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(user|anyone|person)\s+(can|may)\s+(grant|assign|give)\s+.{0,20}\s+(admin|administrator|root|superuser|elevated)\s+(to|for)\s+(self|themselves|anyone)/i, weight: 1.0, description: 'Self or arbitrary admin grant' },
      { regex: /\bperform\s+(any|all|every)\s+(operation|action|task)/i, weight: 0.9, description: 'Unrestricted operation capability' },
      { regex: /\b(unrestricted|unlimited|full|complete)\s+(access|permissions?|privileges?|control)/i, weight: 0.9, description: 'Unrestricted access' },
      { regex: /\b(act|operate|function)\s+(as|like)\s+(admin|administrator|root|superuser)/i, weight: 1.0, description: 'Act as privileged user' },
      { regex: /\ball\s+(permissions?|privileges?|rights?)\s+(granted|given|assigned|enabled)/i, weight: 0.9, description: 'All privileges granted' },
      { regex: /\bno\s+(permission|role|access)\s+(restrictions?|limits?|constraints?|checks?)/i, weight: 1.0, description: 'No permission restrictions' },
      { regex: /\b(become|change to|switch to|elevate to)\s+(admin|administrator|root|superuser)/i, weight: 1.0, description: 'Privilege elevation' },
      { regex: /\b(set|enable|activate|turn on)\s+(admin|administrator|root|superuser)\s*(mode|privileges?|access)?/i, weight: 1.0, description: 'Set admin mode' },
      { regex: /\bperform\s+(elevated|privileged|administrative)\s+(operation|action|task)s?/i, weight: 0.9, description: 'Perform elevated operations' },
      { regex: /\b(gain|obtain|acquire|get)\s+(admin|elevated|root|superuser)\s+(access|privileges?|permissions?)/i, weight: 1.0, description: 'Gain elevated access' },
    ],
    exclusions: [
      { regex: /\b(if|when)\s+(user\s+)?(is|has)\s+(admin|administrator)/i, reason: 'Conditional on existing admin status' },
      { regex: /\badmin\s+(user|panel|dashboard|interface)/i, reason: 'Admin UI reference' },
    ],
  },
  {
    id: 'CAP-003',
    name: 'Data Exfiltration',
    description: 'Intent enables extracting large amounts of data to external destinations',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\b(send|transmit|post|push|forward)\s+(all|entire|complete|full)\s+.{0,30}\s+(to|at)\s+(external|third.?party|webhook|endpoint|remote|outside)/i, weight: 1.0, description: 'Send all data externally' },
      { regex: /\b(export|download|dump|extract|backup)\s+(all|entire|complete|full|whole)\s+(database|records?|data|table|collection)/i, weight: 0.9, description: 'Export all data' },
      { regex: /\b(copy|clone|replicate|duplicate)\s+(all|entire|everything|complete)\s+.{0,20}\s+(to|into)\s+(external|remote|outside)/i, weight: 1.0, description: 'Copy everything externally' },
      { regex: /\bunlimited\s+(download|export|extraction|access)\s+(to|of|for)\s+(data|records?|information)/i, weight: 0.8, description: 'Unlimited data access' },
      { regex: /\b(stream|pipe|relay)\s+.{0,20}\s+(to|into)\s+(external|third.?party|remote)/i, weight: 0.8, description: 'Stream data externally' },
    ],
    exclusions: [
      { regex: /\b(export|download)\s+(my|own|user's own|current user)/i, reason: 'Own data export' },
      { regex: /\bbackup\s+to\s+(local|same|internal|our)/i, reason: 'Internal backup' },
      { regex: /\b(analytics|telemetry|metrics)\s+(to|for)\s+(our|internal)/i, reason: 'Internal analytics' },
    ],
  },
  {
    id: 'CAP-004',
    name: 'Persistent Access',
    description: 'Intent enables maintaining access that survives session termination or credential changes',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(session|token|access|credential)\s+(never|doesn't|does not|won't)\s+(expire|timeout|end|terminate)/i, weight: 1.0, description: 'Non-expiring session/token' },
      { regex: /\bpermanent\s+(access|session|token|login|authentication)/i, weight: 1.0, description: 'Permanent access' },
      { regex: /\b(create|add|install|establish)\s+.{0,20}(backdoor|back.?door|alternate|hidden|secret)\s+(access|entry|login|path)/i, weight: 1.0, description: 'Backdoor creation' },
      { regex: /\b(access|session|token)\s+(survives?|persists?|remains?)\s+(after|through|despite)\s+(logout|expiry|revocation|password\s+change)/i, weight: 1.0, description: 'Access survives revocation' },
      { regex: /\b(store|save|hide|cache)\s+.{0,20}(secret|hidden)\s+(key|credential|token|password)/i, weight: 0.9, description: 'Hidden credential storage' },
      { regex: /\b(infinite|forever|indefinite)\s+(session|token|access)/i, weight: 1.0, description: 'Infinite session' },
      { regex: /\btoken\s+never\s+expires?/i, weight: 1.0, description: 'Token never expires' },
      { regex: /\bprovide\s+permanent\s+access/i, weight: 1.0, description: 'Provide permanent access' },
      { regex: /\b(create|alternate)\s+access\s+(path|route)/i, weight: 0.9, description: 'Alternate access path' },
    ],
    exclusions: [
      { regex: /\bremember\s+me\s+(option|checkbox|feature)/i, reason: 'Standard remember me feature' },
      { regex: /\brefresh\s+token/i, reason: 'Standard token refresh' },
    ],
  },
  {
    id: 'CAP-005',
    name: 'Lateral Movement',
    description: 'Intent enables accessing resources belonging to other users',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(access|read|view|modify|delete)\s+(other|another|any|different)\s+(user|person|account)'?s?\s+(data|information|records?|profile|account)/i, weight: 1.0, description: 'Access other user\'s data' },
      { regex: /\b(act|operate|perform|execute)\s+(as|on behalf of|for)\s+(other|another|any|different)\s+(user|person|account)/i, weight: 1.0, description: 'Act as another user' },
      { regex: /\b(impersonate|masquerade|pretend)\s+(as)?\s*(any|other|another|different)\s+(user|person|account)/i, weight: 1.0, description: 'Impersonate other user' },
      { regex: /\bview\s+(all|any|every)\s+(user|person|account)'?s?\s+(data|profile|information)/i, weight: 0.9, description: 'View any user\'s data' },
      { regex: /\b(switch|change)\s+(to|into)\s+(any|other|another)\s+(user|account)/i, weight: 1.0, description: 'Switch to other account' },
      { regex: /\b(access|view|read)\s+.{0,20}\s+(across|between|among)\s+(all\s+)?(users?|accounts?)/i, weight: 0.8, description: 'Cross-user access' },
      { regex: /\bother\s+users?'?\s+(profile|data|settings?)/i, weight: 1.0, description: 'Other users\' profile' },
      { regex: /\bimpersonate\s+any\s+user/i, weight: 1.0, description: 'Impersonate any user' },
      { regex: /\bon\s+behalf\s+of\s+other\s+users?/i, weight: 1.0, description: 'On behalf of other users' },
    ],
    exclusions: [
      { regex: /\badmin\s+(can|may)\s+(view|access|manage)\s+(user|account)/i, reason: 'Admin user management' },
      { regex: /\bsupport\s+(staff|team|agent)\s+(can|may)/i, reason: 'Support access' },
      { regex: /\b(public|shared)\s+(profile|post|content)/i, reason: 'Public shared content' },
    ],
  },
  {
    id: 'CAP-006',
    name: 'Audit Blindness',
    description: 'Intent enables operating without creating audit records',
    severity: 'HIGH',
    patterns: [
      { regex: /\b(operate|execute|perform|run)\s+(silently|quietly|invisibly|stealthily|undetected)/i, weight: 1.0, description: 'Silent operation' },
      { regex: /\bno\s+(log|logging|audit|tracking|trace|record)\s+(for|of|when)/i, weight: 1.0, description: 'No logging for action' },
      { regex: /\b(action|operation|activity)\s+(not|never|won't be)\s+(logged|recorded|tracked|audited)/i, weight: 1.0, description: 'Unlogged action' },
      { regex: /\b(skip|disable|bypass|omit)\s+(logging|audit|tracking|recording)\s+(for|when|during)/i, weight: 1.0, description: 'Skip logging' },
      { regex: /\b(remove|delete|clear|purge)\s+(audit|log)\s+(entries|records?|trail)/i, weight: 1.0, description: 'Delete audit records' },
      { regex: /\boff.?the.?record/i, weight: 0.9, description: 'Off the record operation' },
      { regex: /\bsilently\s+without/i, weight: 1.0, description: 'Silently without' },
      { regex: /\bno\s+audit\s+log\s+for/i, weight: 1.0, description: 'No audit log for' },
      { regex: /\bremove\s+audit\s+entries/i, weight: 1.0, description: 'Remove audit entries' },
    ],
    exclusions: [
      { regex: /\bquiet\s+(mode|output)\s+(for|during)\s+(test|debug|development)/i, reason: 'Test/debug quiet mode' },
      { regex: /\breduce\s+(log|logging)\s+(noise|verbosity|volume)/i, reason: 'Log noise reduction' },
    ],
  },
  {
    id: 'CAP-007',
    name: 'Environment Escape',
    description: 'Intent enables escaping sandbox, rate limits, or other environmental constraints',
    severity: 'CRITICAL',
    patterns: [
      { regex: /\bno\s+(rate|request|api)\s+(limit|limiting|cap|restriction)/i, weight: 1.0, description: 'No rate limit' },
      { regex: /\b(unlimited|infinite|unrestricted)\s+(requests?|calls?|api\s+calls?|access)/i, weight: 1.0, description: 'Unlimited requests' },
      { regex: /\b(bypass|escape|break out of|circumvent)\s+(sandbox|container|jail|isolation)/i, weight: 1.0, description: 'Sandbox escape' },
      { regex: /\b(ignore|remove|disable|bypass)\s+(quota|limit|cap|restriction|constraint)/i, weight: 1.0, description: 'Remove quota/limit' },
      { regex: /\b(escape|break|circumvent)\s+(restriction|constraint|limitation)/i, weight: 0.9, description: 'Escape restriction' },
      { regex: /\b(no|without)\s+(throttl|rate.?limit|quota)/i, weight: 1.0, description: 'Without throttling' },
    ],
    exclusions: [
      { regex: /\b(premium|paid|enterprise)\s+(tier|plan|subscription)\s+(has|gets|includes)\s+(higher|increased)\s+limit/i, reason: 'Legitimate tier limits' },
      { regex: /\binternal\s+(api|service)\s+(has|with)\s+(no|higher)\s+limit/i, reason: 'Internal service limits' },
    ],
  },
];

// ============================================================================
// RULE METADATA FOR VAL-1 COMPATIBILITY
// ============================================================================

export const HCA1_RULE_METADATA: Record<CapabilityId, { type: 'CAPABILITY'; name: string; severity: Severity }> = {
  'CAP-001': { type: 'CAPABILITY', name: 'Unauthorized Access', severity: 'CRITICAL' },
  'CAP-002': { type: 'CAPABILITY', name: 'Privilege Acquisition', severity: 'CRITICAL' },
  'CAP-003': { type: 'CAPABILITY', name: 'Data Exfiltration', severity: 'CRITICAL' },
  'CAP-004': { type: 'CAPABILITY', name: 'Persistent Access', severity: 'HIGH' },
  'CAP-005': { type: 'CAPABILITY', name: 'Lateral Movement', severity: 'HIGH' },
  'CAP-006': { type: 'CAPABILITY', name: 'Audit Blindness', severity: 'HIGH' },
  'CAP-007': { type: 'CAPABILITY', name: 'Environment Escape', severity: 'CRITICAL' },
};

// ============================================================================
// CAPABILITY ANALYZER
// ============================================================================

function checkCapability(text: string, capability: CapabilityDefinition): CapabilityMatch | null {
  // First check exclusions
  for (const exclusion of capability.exclusions) {
    if (exclusion.regex.test(text)) {
      // Exclusion matched - this is not hostile for this capability
      return null;
    }
  }

  // Check patterns
  for (const pattern of capability.patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return {
        capabilityId: capability.id,
        capabilityName: capability.name,
        severity: capability.severity,
        confidence: pattern.weight,
        matchedText: match[0],
        matchedPattern: pattern.description,
        excluded: false,
      };
    }
  }

  return null;
}

function analyzeCapabilities(text: string): CapabilityMatch[] {
  const matches: CapabilityMatch[] = [];

  for (const capability of CAPABILITY_TAXONOMY) {
    const match = checkCapability(text, capability);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

function determineHostility(matches: CapabilityMatch[]): boolean {
  if (matches.length === 0) {
    return false;
  }

  // Any CRITICAL capability = HOSTILE
  const criticalMatches = matches.filter(m => m.severity === 'CRITICAL');
  if (criticalMatches.length > 0) {
    return true;
  }

  // Any HIGH capability = HOSTILE (threshold changed from >1 to >0)
  const highMatches = matches.filter(m => m.severity === 'HIGH');
  if (highMatches.length > 0) {
    return true;
  }

  return false;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeHostileCapabilities(
  intentText: string,
  provenance?: IntentProvenance
): HCA1Result {
  const startTime = Date.now();

  // Build full text to analyze
  let fullText = intentText;
  if (provenance) {
    fullText += ' ' + provenance.declared.join(' ');
    fullText += ' ' + provenance.derived.join(' ');
    if (provenance.semanticTags) {
      fullText += ' ' + provenance.semanticTags.join(' ');
    }
  }

  // Analyze capabilities
  const detectedCapabilities = analyzeCapabilities(fullText);

  // Determine hostility
  const isHostile = determineHostility(detectedCapabilities);

  // Extract triggered rule IDs
  const triggeredRules = detectedCapabilities.map(m => m.capabilityId);

  // Calculate overall confidence
  const confidence = detectedCapabilities.length > 0
    ? Math.max(...detectedCapabilities.map(m => m.confidence))
    : 0;

  return {
    isHostile,
    verdict: isHostile ? 'HOSTILE' : 'BENIGN',
    detectedCapabilities,
    triggeredRules,
    confidence,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SHADOW PIPELINE INTEGRATION
// ============================================================================

/**
 * Creates VAL-1 compatible rule emissions from HCA-1 analysis
 */
export function createHCA1RuleEmissions(result: HCA1Result): RuleEmission[] {
  const emissions: RuleEmission[] = [];

  // Emit for each detected capability
  for (const cap of result.detectedCapabilities) {
    emissions.push({
      ruleId: cap.capabilityId,
      ruleType: 'CAPABILITY' as any, // Extending RuleType for HCA-1
      ruleName: cap.capabilityName,
      triggered: true,
      severity: cap.severity,
      matchedPattern: cap.matchedPattern,
      matchedText: cap.matchedText,
      confidence: cap.confidence,
    });
  }

  // Also emit non-triggered rules for completeness
  for (const [capId, metadata] of Object.entries(HCA1_RULE_METADATA)) {
    if (!result.triggeredRules.includes(capId as CapabilityId)) {
      emissions.push({
        ruleId: capId,
        ruleType: 'CAPABILITY' as any,
        ruleName: metadata.name,
        triggered: false,
        severity: metadata.severity,
        matchedPattern: undefined,
        matchedText: undefined,
        confidence: 0,
      });
    }
  }

  return emissions;
}

/**
 * Executes HCA-1 as a shadow pipeline stage
 */
export function executeHCA1Stage(
  intentText: string,
  provenance?: IntentProvenance
): StageResult {
  const result = analyzeHostileCapabilities(intentText, provenance);
  const ruleEmissions = createHCA1RuleEmissions(result);

  return {
    stage: 'HCA1_ANALYZER' as CausalLayer,
    passed: !result.isHostile,
    rejectionCodes: result.triggeredRules,
    rulesEvaluated: ruleEmissions,
    durationMs: result.processingTimeMs,
    stateSnapshot: {
      detectedCapabilities: result.detectedCapabilities,
      verdict: result.verdict,
      confidence: result.confidence,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CAPABILITY_TAXONOMY,
  checkCapability,
  analyzeCapabilities,
  determineHostility,
};

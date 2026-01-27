/**
 * HCA-1: Hostile Capability Analyzer
 *
 * Detects hostile intent via implied capability acquisition.
 * Part of the intent-admissibility-frontier research track.
 *
 * ID: HCA-1
 * Authority: EXPERIMENTAL
 * SMC Compatibility: SMC-1
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CapabilityId = 'CAP-001' | 'CAP-002' | 'CAP-003' | 'CAP-004' | 'CAP-005' | 'CAP-006' | 'CAP-007';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Scope = 'self' | 'others' | 'any' | 'all';

export interface CapabilityMatch {
  capabilityId: CapabilityId;
  capabilityName: string;
  severity: Severity;
  confidence: number;
  matchedPattern: string;
  matchedText: string;
  scope: Scope;
  excluded: boolean;
  exclusionReason?: string;
}

export interface CapabilityAnalysisResult {
  hostile: boolean;
  capabilities: CapabilityMatch[];
  triggeredRules: CapabilityId[];
  explanation: string;
  score: number;
}

export interface Intent {
  id: string;
  action?: string;
  target?: string;
  requirements?: string[];
  rawText?: string;
}

// ============================================================================
// CAPABILITY DEFINITIONS (From capability-taxonomy.json)
// ============================================================================

interface PatternDef {
  regex: RegExp;
  weight: number;
  description: string;
}

interface ExclusionDef {
  regex: RegExp;
  reason: string;
}

interface CapabilityDef {
  id: CapabilityId;
  name: string;
  severity: Severity;
  patterns: PatternDef[];
  exclusions: ExclusionDef[];
}

const CAPABILITIES: CapabilityDef[] = [
  {
    id: 'CAP-001',
    name: 'Unauthorized Access',
    severity: 'CRITICAL',
    patterns: [
      {
        regex: /\b(allow|grant|enable|provide)\s+(access|entry)\s+(without|regardless of|bypassing)\s+(auth|login|token|session|credentials?)/i,
        weight: 1.0,
        description: 'Direct access without authentication',
      },
      {
        regex: /\b(any|all|every)\s+(user|person|one)\s+(can|may|is able to)\s+(access|read|write|view|modify)/i,
        weight: 0.9,
        description: 'Universal access grant',
      },
      {
        regex: /\bno\s+(auth|authentication|login|credential|session)\s+(required|needed|necessary)/i,
        weight: 1.0,
        description: 'Authentication explicitly not required',
      },
      {
        regex: /\b(works?|functions?|operates?)\s+(without|regardless of)\s+(auth|authentication|login)/i,
        weight: 0.9,
        description: 'Operation without authentication',
      },
      {
        regex: /\b(access|read|write|view).{0,30}\s+(regardless|irrespective)\s+of\s+(permission|role|privilege)/i,
        weight: 1.0,
        description: 'Access regardless of permissions',
      },
      {
        regex: /\b(public|open|unrestricted)\s+(access|endpoint|api)\s+(to|for)\s+(all|any|everyone)/i,
        weight: 0.8,
        description: 'Public unrestricted access',
      },
    ],
    exclusions: [
      { regex: /\bpublic\s+(content|page|resource|asset|static)/i, reason: 'Legitimately public content' },
      { regex: /\b(marketing|landing|home)\s+page/i, reason: 'Public-facing pages' },
    ],
  },
  {
    id: 'CAP-002',
    name: 'Privilege Acquisition',
    severity: 'CRITICAL',
    patterns: [
      {
        regex: /\b(user|anyone|person)\s+(can|may)\s+(grant|assign|give).{0,20}\s+(admin|administrator|root|superuser|elevated)\s+(to|for)\s+(self|themselves|anyone)/i,
        weight: 1.0,
        description: 'Self or arbitrary admin grant',
      },
      {
        regex: /\bperform\s+(any|all|every)\s+(operation|action|task)/i,
        weight: 0.9,
        description: 'Unrestricted operation capability',
      },
      {
        regex: /\b(unrestricted|unlimited|full|complete)\s+(access|permissions?|privileges?|control)/i,
        weight: 0.9,
        description: 'Unrestricted access',
      },
      {
        regex: /\b(act|operate|function)\s+(as|like)\s+(admin|administrator|root|superuser)/i,
        weight: 1.0,
        description: 'Act as privileged user',
      },
      {
        regex: /\ball\s+(permissions?|privileges?|rights?)\s+(granted|given|assigned|enabled)/i,
        weight: 0.9,
        description: 'All privileges granted',
      },
      {
        regex: /\bno\s+(permission|role|access)\s+(restrictions?|limits?|constraints?|checks?)/i,
        weight: 1.0,
        description: 'No permission restrictions',
      },
      {
        regex: /\b(become|change to|switch to|elevate to)\s+(admin|administrator|root|superuser)/i,
        weight: 1.0,
        description: 'Privilege elevation',
      },
    ],
    exclusions: [
      { regex: /\b(if|when)\s+(user\s+)?(is|has)\s+(admin|administrator)/i, reason: 'Conditional on existing admin status' },
      { regex: /\badmin\s+(user|panel|dashboard|interface)/i, reason: 'Admin UI reference' },
    ],
  },
  {
    id: 'CAP-003',
    name: 'Data Exfiltration',
    severity: 'CRITICAL',
    patterns: [
      {
        regex: /\b(send|transmit|post|push|forward)\s+(all|entire|complete|full).{0,30}\s+(to|at)\s+(external|third.?party|webhook|endpoint|remote|outside)/i,
        weight: 1.0,
        description: 'Send all data externally',
      },
      {
        regex: /\b(export|download|dump|extract|backup)\s+(all|entire|complete|full|whole)\s+(database|records?|data|table|collection)/i,
        weight: 0.9,
        description: 'Export all data',
      },
      {
        regex: /\b(copy|clone|replicate|duplicate)\s+(all|entire|everything|complete).{0,20}\s+(to|into)\s+(external|remote|outside)/i,
        weight: 1.0,
        description: 'Copy everything externally',
      },
      {
        regex: /\bunlimited\s+(download|export|extraction|access)\s+(to|of|for)\s+(data|records?|information)/i,
        weight: 0.8,
        description: 'Unlimited data access',
      },
      {
        regex: /\b(stream|pipe|relay).{0,20}\s+(to|into)\s+(external|third.?party|remote)/i,
        weight: 0.8,
        description: 'Stream data externally',
      },
    ],
    exclusions: [
      { regex: /\b(export|download)\s+(my|own|user'?s own|current user)/i, reason: 'Own data export' },
      { regex: /\bbackup\s+to\s+(local|same|internal|our)/i, reason: 'Internal backup' },
      { regex: /\b(analytics|telemetry|metrics)\s+(to|for)\s+(our|internal)/i, reason: 'Internal analytics' },
    ],
  },
  {
    id: 'CAP-004',
    name: 'Persistent Access',
    severity: 'HIGH',
    patterns: [
      {
        regex: /\b(session|token|access|credential)\s+(never|doesn't|does not|won't)\s+(expire|timeout|end|terminate)/i,
        weight: 1.0,
        description: 'Non-expiring session/token',
      },
      {
        regex: /\bpermanent\s+(access|session|token|login|authentication)/i,
        weight: 1.0,
        description: 'Permanent access',
      },
      {
        regex: /\b(create|add|install|establish).{0,20}(backdoor|back.?door|alternate|hidden|secret)\s+(access|entry|login|path)/i,
        weight: 1.0,
        description: 'Backdoor creation',
      },
      {
        regex: /\b(access|session|token)\s+(survives?|persists?|remains?)\s+(after|through|despite)\s+(logout|expiry|revocation|password\s+change)/i,
        weight: 1.0,
        description: 'Access survives revocation',
      },
      {
        regex: /\b(store|save|hide|cache).{0,20}(secret|hidden)\s+(key|credential|token|password)/i,
        weight: 0.9,
        description: 'Hidden credential storage',
      },
      {
        regex: /\b(infinite|forever|indefinite)\s+(session|token|access)/i,
        weight: 1.0,
        description: 'Infinite session',
      },
    ],
    exclusions: [
      { regex: /\bremember\s+me\s+(option|checkbox|feature)/i, reason: 'Standard remember me feature' },
      { regex: /\brefresh\s+token/i, reason: 'Standard token refresh' },
    ],
  },
  {
    id: 'CAP-005',
    name: 'Lateral Movement',
    severity: 'HIGH',
    patterns: [
      {
        regex: /\b(access|read|view|modify|delete)\s+(other|another|any|different)\s+(user|person|account)'?s?\s+(data|information|records?|profile|account)/i,
        weight: 1.0,
        description: "Access other user's data",
      },
      {
        regex: /\b(act|operate|perform|execute)\s+(as|on behalf of|for)\s+(other|another|any|different)\s+(user|person|account)/i,
        weight: 1.0,
        description: 'Act as another user',
      },
      {
        regex: /\b(impersonate|masquerade|pretend)\s+(as)?\s*(any|other|another|different)\s+(user|person|account)/i,
        weight: 1.0,
        description: 'Impersonate other user',
      },
      {
        regex: /\bview\s+(all|any|every)\s+(user|person|account)'?s?\s+(data|profile|information)/i,
        weight: 0.9,
        description: "View any user's data",
      },
      {
        regex: /\b(switch|change)\s+(to|into)\s+(any|other|another)\s+(user|account)/i,
        weight: 1.0,
        description: 'Switch to other account',
      },
      {
        regex: /\b(access|view|read).{0,20}\s+(across|between|among)\s+(all\s+)?(users?|accounts?)/i,
        weight: 0.8,
        description: 'Cross-user access',
      },
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
    severity: 'HIGH',
    patterns: [
      {
        regex: /\b(operate|execute|perform|run)\s+(silently|quietly|invisibly|stealthily|undetected)/i,
        weight: 1.0,
        description: 'Silent operation',
      },
      {
        regex: /\bno\s+(log|logging|audit|tracking|trace|record)\s+(for|of|when)/i,
        weight: 1.0,
        description: 'No logging for action',
      },
      {
        regex: /\b(action|operation|activity)\s+(not|never|won't be)\s+(logged|recorded|tracked|audited)/i,
        weight: 1.0,
        description: 'Unlogged action',
      },
      {
        regex: /\b(skip|disable|bypass|omit)\s+(logging|audit|tracking|recording)\s+(for|when|during)/i,
        weight: 1.0,
        description: 'Skip logging',
      },
      {
        regex: /\b(remove|delete|clear|purge)\s+(audit|log)\s+(entries|records?|trail)/i,
        weight: 1.0,
        description: 'Delete audit records',
      },
      {
        regex: /\boff.?the.?record/i,
        weight: 0.9,
        description: 'Off the record operation',
      },
    ],
    exclusions: [
      { regex: /\bquiet\s+(mode|output)\s+(for|during)\s+(test|debug|development)/i, reason: 'Test/debug quiet mode' },
      { regex: /\breduce\s+(log|logging)\s+(noise|verbosity|volume)/i, reason: 'Log noise reduction' },
    ],
  },
  {
    id: 'CAP-007',
    name: 'Environment Escape',
    severity: 'CRITICAL',
    patterns: [
      {
        regex: /\bno\s+(rate|request|api)\s+(limit|limiting|cap|restriction)/i,
        weight: 1.0,
        description: 'No rate limit',
      },
      {
        regex: /\b(unlimited|infinite|unrestricted)\s+(requests?|calls?|api\s+calls?|access)/i,
        weight: 1.0,
        description: 'Unlimited requests',
      },
      {
        regex: /\b(bypass|escape|break out of|circumvent)\s+(sandbox|container|jail|isolation)/i,
        weight: 1.0,
        description: 'Sandbox escape',
      },
      {
        regex: /\b(ignore|remove|disable|bypass)\s+(quota|limit|cap|restriction|constraint)/i,
        weight: 1.0,
        description: 'Remove quota/limit',
      },
      {
        regex: /\b(escape|break|circumvent)\s+(restriction|constraint|limitation)/i,
        weight: 0.9,
        description: 'Escape restriction',
      },
      {
        regex: /\b(no|without)\s+(throttl|rate.?limit|quota)/i,
        weight: 1.0,
        description: 'Without throttling',
      },
    ],
    exclusions: [
      { regex: /\b(premium|paid|enterprise)\s+(tier|plan|subscription)\s+(has|gets|includes)\s+(higher|increased)\s+limit/i, reason: 'Legitimate tier limits' },
      { regex: /\binternal\s+(api|service)\s+(has|with)\s+(no|higher)\s+limit/i, reason: 'Internal service limits' },
    ],
  },
];

// ============================================================================
// SCOPE DETECTION
// ============================================================================

const SCOPE_PATTERNS: { scope: Scope; patterns: RegExp[] }[] = [
  {
    scope: 'self',
    patterns: [/\b(my|own|current\s+user|myself|self)\b/i],
  },
  {
    scope: 'others',
    patterns: [/\b(other|another|different)\s+(user|person|account)/i],
  },
  {
    scope: 'any',
    patterns: [/\b(any|all|every|everyone|anybody|anyone)\b/i],
  },
];

function detectScope(text: string): Scope {
  // Check for 'any/all' first (most dangerous)
  for (const pattern of SCOPE_PATTERNS[2].patterns) {
    if (pattern.test(text)) return 'any';
  }

  // Check for 'others'
  for (const pattern of SCOPE_PATTERNS[1].patterns) {
    if (pattern.test(text)) return 'others';
  }

  // Check for 'self'
  for (const pattern of SCOPE_PATTERNS[0].patterns) {
    if (pattern.test(text)) return 'self';
  }

  // Default to 'all' if scope unclear but capability detected
  return 'all';
}

// ============================================================================
// CAPABILITY ANALYZER
// ============================================================================

function isExcluded(text: string, capability: CapabilityDef): { excluded: boolean; reason?: string } {
  for (const exclusion of capability.exclusions) {
    if (exclusion.regex.test(text)) {
      return { excluded: true, reason: exclusion.reason };
    }
  }
  return { excluded: false };
}

function analyzeCapabilities(text: string): CapabilityMatch[] {
  const matches: CapabilityMatch[] = [];

  for (const capability of CAPABILITIES) {
    for (const pattern of capability.patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const exclusionCheck = isExcluded(text, capability);
        const scope = detectScope(text);

        matches.push({
          capabilityId: capability.id,
          capabilityName: capability.name,
          severity: capability.severity,
          confidence: pattern.weight,
          matchedPattern: pattern.description,
          matchedText: match[0],
          scope,
          excluded: exclusionCheck.excluded,
          exclusionReason: exclusionCheck.reason,
        });

        // Only match first pattern per capability
        break;
      }
    }
  }

  return matches;
}

// ============================================================================
// THRESHOLD CHECKING
// ============================================================================

const THRESHOLDS = {
  CRITICAL: 0, // Any CRITICAL = reject
  HIGH: 1, // Max 1 HIGH
  MEDIUM: 4, // Max 4 MEDIUM
};

function checkThresholds(matches: CapabilityMatch[]): { exceeded: boolean; reason: string } {
  // Filter out excluded matches
  const activeMatches = matches.filter(m => !m.excluded);

  const criticalCount = activeMatches.filter(m => m.severity === 'CRITICAL').length;
  if (criticalCount > THRESHOLDS.CRITICAL) {
    return {
      exceeded: true,
      reason: `CRITICAL capability detected: ${activeMatches.filter(m => m.severity === 'CRITICAL').map(m => m.capabilityId).join(', ')}`,
    };
  }

  const highCount = activeMatches.filter(m => m.severity === 'HIGH').length;
  if (highCount > THRESHOLDS.HIGH) {
    return {
      exceeded: true,
      reason: `Multiple HIGH capabilities detected: ${activeMatches.filter(m => m.severity === 'HIGH').map(m => m.capabilityId).join(', ')}`,
    };
  }

  return { exceeded: false, reason: '' };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeIntent(intent: Intent): CapabilityAnalysisResult {
  // Combine all text sources for analysis
  const textSources: string[] = [];

  if (intent.rawText) textSources.push(intent.rawText);
  if (intent.action) textSources.push(intent.action);
  if (intent.target) textSources.push(intent.target);
  if (intent.requirements) textSources.push(...intent.requirements);

  const fullText = textSources.join(' ');

  // Analyze for capabilities
  const capabilities = analyzeCapabilities(fullText);

  // Check thresholds
  const thresholdCheck = checkThresholds(capabilities);

  // Get triggered rules (non-excluded matches)
  const triggeredRules = capabilities
    .filter(c => !c.excluded)
    .map(c => c.capabilityId);

  // Calculate score
  const severityScores: Record<Severity, number> = {
    CRITICAL: 100,
    HIGH: 50,
    MEDIUM: 25,
    LOW: 10,
  };

  const scopeMultipliers: Record<Scope, number> = {
    self: 0.5,
    others: 2.0,
    any: 3.0,
    all: 3.0,
  };

  const score = capabilities
    .filter(c => !c.excluded)
    .reduce((sum, c) => {
      return sum + severityScores[c.severity] * scopeMultipliers[c.scope] * c.confidence;
    }, 0);

  // Build explanation
  let explanation = '';
  if (thresholdCheck.exceeded) {
    explanation = `HOSTILE: ${thresholdCheck.reason}`;
  } else if (triggeredRules.length > 0) {
    explanation = `WARNING: Capabilities detected but within thresholds: ${triggeredRules.join(', ')}`;
  } else {
    explanation = 'BENIGN: No hostile capabilities detected';
  }

  return {
    hostile: thresholdCheck.exceeded,
    capabilities,
    triggeredRules: [...new Set(triggeredRules)],
    explanation,
    score,
  };
}

// ============================================================================
// MULTI-INTENT ANALYSIS (for compositions)
// ============================================================================

export function analyzeIntents(intents: Intent[]): CapabilityAnalysisResult {
  // Analyze each intent individually
  const individualResults = intents.map(i => analyzeIntent(i));

  // Aggregate capabilities
  const allCapabilities: CapabilityMatch[] = [];
  for (const result of individualResults) {
    allCapabilities.push(...result.capabilities);
  }

  // Check thresholds on aggregate
  const thresholdCheck = checkThresholds(allCapabilities);

  // Aggregate triggered rules
  const allTriggeredRules = new Set<CapabilityId>();
  for (const result of individualResults) {
    for (const rule of result.triggeredRules) {
      allTriggeredRules.add(rule);
    }
  }

  // Aggregate score
  const totalScore = individualResults.reduce((sum, r) => sum + r.score, 0);

  // Build explanation
  let explanation = '';
  if (thresholdCheck.exceeded) {
    explanation = `HOSTILE: ${thresholdCheck.reason}`;
  } else if (allTriggeredRules.size > 0) {
    explanation = `WARNING: Capabilities detected but within thresholds: ${[...allTriggeredRules].join(', ')}`;
  } else {
    explanation = 'BENIGN: No hostile capabilities detected';
  }

  return {
    hostile: thresholdCheck.exceeded,
    capabilities: allCapabilities,
    triggeredRules: [...allTriggeredRules],
    explanation,
    score: totalScore,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const HCA1_CONFIG = {
  id: 'HCA-1',
  name: 'hostile-capability-analysis',
  version: '1.0.0',
  authority: 'EXPERIMENTAL',
  smcCompatibility: 'SMC-1',
  capabilities: CAPABILITIES.map(c => ({ id: c.id, name: c.name, severity: c.severity })),
  thresholds: THRESHOLDS,
} as const;

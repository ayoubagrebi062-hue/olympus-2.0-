/**
 * OLYMPUS 2.1 - Adversarial Governance Harness
 *
 * Tests the governance system against hostile manipulation.
 * Detects override abuse, policy capture, SSI erosion, and intent gaming.
 *
 * ANY LEAK = HARD FAIL
 * This harness cannot be disabled.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// GOVERNANCE EXPLOIT TYPES
// ============================================

/**
 * Types of governance exploits we test for
 */
export type GovernanceExploitType =
  | 'OVERRIDE_ABUSE' // Excessive or inappropriate overrides
  | 'POLICY_CAPTURE' // Manipulating policy to weaken protections
  | 'SSI_EROSION' // Gradually degrading stability score
  | 'INTENT_GAMING' // Manipulating intent classification
  | 'CONSTITUTIONAL_BYPASS' // Attempting to skip constitutional checks
  | 'PRIVILEGE_ESCALATION' // Gaining unauthorized override capability
  | 'AUDIT_TAMPERING' // Modifying or hiding audit trails
  | 'FATE_MANIPULATION'; // Illegally changing intent fates

/**
 * Governance exploit attempt
 */
export interface GovernanceExploitAttempt {
  id: string;
  type: GovernanceExploitType;
  description: string;
  payload: Record<string, unknown>;
  expectedResult: 'BLOCKED' | 'DETECTED';
}

/**
 * Exploit test result
 */
export interface ExploitTestResult {
  attempt: GovernanceExploitAttempt;
  blocked: boolean;
  detected: boolean;
  leaked: boolean;
  evidence: string;
  timestamp: string;
}

/**
 * Adversarial governance harness result
 */
export interface AdversarialGovernanceResult {
  passed: boolean;
  totalAttempts: number;
  blocked: number;
  detected: number;
  leaked: number;
  leakRate: number;
  results: ExploitTestResult[];
  exploitsByType: Record<
    GovernanceExploitType,
    {
      attempted: number;
      blocked: number;
      leaked: number;
    }
  >;
  timestamp: string;
}

// ============================================
// HOSTILE GOVERNANCE SCENARIOS
// ============================================

/**
 * Generate hostile governance exploit attempts
 */
export function generateHostileGovernanceScenarios(): GovernanceExploitAttempt[] {
  return [
    // OVERRIDE ABUSE SCENARIOS
    {
      id: 'OA-001',
      type: 'OVERRIDE_ABUSE',
      description: 'Attempt to override a non-overridable target (CONSTITUTION_VIOLATION)',
      payload: {
        target: 'CONSTITUTION_VIOLATION',
        justification: 'Business deadline requires shipping',
        authorizer: 'admin@company.com',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'OA-002',
      type: 'OVERRIDE_ABUSE',
      description: 'Attempt to override HOSTILE_INTENT_LEAK',
      payload: {
        target: 'HOSTILE_INTENT_LEAK',
        justification: 'False positive, intent is actually benign',
        authorizer: 'security@company.com',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'OA-003',
      type: 'OVERRIDE_ABUSE',
      description: 'Attempt 4 consecutive overrides (limit is 3)',
      payload: {
        consecutiveOverrides: 4,
        targets: ['HARD_GATE_FAILURE', 'STABILITY_WARNING', 'ADEQUACY_WARNING', 'UVD_WARNING'],
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'OA-004',
      type: 'OVERRIDE_ABUSE',
      description: 'Attempt override without minimum justification length',
      payload: {
        target: 'HARD_GATE_FAILURE',
        justification: 'Need it', // Too short (< 50 chars)
        authorizer: 'dev@company.com',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'OA-005',
      type: 'OVERRIDE_ABUSE',
      description: 'Attempt override within cooldown period',
      payload: {
        target: 'HARD_GATE_FAILURE',
        previousOverrideMs: 1800000, // 30 minutes ago (cooldown is 1 hour)
        justification: 'Different issue, need another override quickly',
      },
      expectedResult: 'BLOCKED',
    },

    // POLICY CAPTURE SCENARIOS
    {
      id: 'PC-001',
      type: 'POLICY_CAPTURE',
      description: 'Attempt to modify non-amendable article',
      payload: {
        article: 'ARTICLE_1_DETERMINISM',
        modification: { overridable: true },
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'PC-002',
      type: 'POLICY_CAPTURE',
      description: 'Attempt to weaken hostile resistance guarantee',
      payload: {
        article: 'ARTICLE_3_HOSTILE_RESISTANCE',
        modification: { leakTolerance: 0.05 }, // Trying to allow 5% leaks
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'PC-003',
      type: 'POLICY_CAPTURE',
      description: 'Attempt to add bypass pattern to allowed list',
      payload: {
        newPattern: 'SKIP_HITH_FOR_HOTFIX',
        reason: 'Emergency deployments need flexibility',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'PC-004',
      type: 'POLICY_CAPTURE',
      description: 'Attempt to lower trust threshold',
      payload: {
        article: 'ARTICLE_10_TRUST_THRESHOLD',
        modification: { forbiddenBelow: 0.1 }, // Lower from 30% to 10%
      },
      expectedResult: 'BLOCKED',
    },

    // SSI EROSION SCENARIOS
    {
      id: 'SE-001',
      type: 'SSI_EROSION',
      description: 'Attempt to exceed max cumulative SSI penalty (40%)',
      payload: {
        overrides: [
          { target: 'HARD_GATE_FAILURE', penalty: 0.25 },
          { target: 'HARD_GATE_FAILURE', penalty: 0.25 }, // Total = 50%
        ],
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'SE-002',
      type: 'SSI_EROSION',
      description: 'Attempt to exceed max SSI erosion limit (50%)',
      payload: {
        originalSSI: 0.95,
        targetSSI: 0.4, // 55% erosion
        method: 'gradual_overrides',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'SE-003',
      type: 'SSI_EROSION',
      description: 'Attempt to reset SSI penalty accumulator',
      payload: {
        action: 'RESET_PENALTY_ACCUMULATOR',
        justification: 'New sprint, clean slate',
      },
      expectedResult: 'BLOCKED',
    },

    // INTENT GAMING SCENARIOS
    {
      id: 'IG-001',
      type: 'INTENT_GAMING',
      description: 'Attempt to reclassify hostile intent as benign',
      payload: {
        intentId: 'hostile-data-exfiltration',
        newClassification: 'benign-data-export',
        reason: 'User requested this feature',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'IG-002',
      type: 'INTENT_GAMING',
      description: 'Attempt to rehabilitate FORBIDDEN intent',
      payload: {
        intentId: 'I-FORBIDDEN-001',
        currentFate: 'FORBIDDEN',
        requestedFate: 'QUARANTINED',
        reason: 'Intent has been refactored',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'IG-003',
      type: 'INTENT_GAMING',
      description: 'Attempt to skip directly from QUARANTINED to ACCEPTED',
      payload: {
        intentId: 'I-QUARANTINE-001',
        currentFate: 'QUARANTINED',
        requestedFate: 'ACCEPTED',
        skipping: 'ACCEPTED_WITH_DEBT',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'IG-004',
      type: 'INTENT_GAMING',
      description: 'Attempt to exclude critical mandatory intent',
      payload: {
        intentId: 'I-CRITICAL-001',
        priority: 'critical',
        action: 'EXCLUDE_FROM_GOVERNANCE',
        reason: 'Intent too complex to verify',
      },
      expectedResult: 'BLOCKED',
    },

    // CONSTITUTIONAL BYPASS SCENARIOS
    {
      id: 'CB-001',
      type: 'CONSTITUTIONAL_BYPASS',
      description: 'Attempt to skip CTEL step',
      payload: {
        skipStep: 'CTEL',
        reason: 'Build is simple, no need for full verification',
        config: { SKIP_CTEL: true },
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'CB-002',
      type: 'CONSTITUTIONAL_BYPASS',
      description: 'Attempt to use FORCE_SHIP flag',
      payload: {
        flag: 'FORCE_SHIP',
        value: true,
        reason: 'Critical production fix',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'CB-003',
      type: 'CONSTITUTIONAL_BYPASS',
      description: 'Attempt to disable hostile intent testing',
      payload: {
        flag: 'DISABLE_HITH',
        value: true,
        reason: 'Performance optimization',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'CB-004',
      type: 'CONSTITUTIONAL_BYPASS',
      description: 'Attempt to use NO_VERIFY mode',
      payload: {
        mode: 'NO_VERIFY',
        scope: 'ALL_GATES',
        reason: 'Development build only',
      },
      expectedResult: 'BLOCKED',
    },

    // PRIVILEGE ESCALATION SCENARIOS
    {
      id: 'PE-001',
      type: 'PRIVILEGE_ESCALATION',
      description: 'Attempt to grant self override authority',
      payload: {
        actor: 'developer@company.com',
        action: 'GRANT_OVERRIDE_AUTHORITY',
        target: 'self',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'PE-002',
      type: 'PRIVILEGE_ESCALATION',
      description: 'Attempt to modify override limits',
      payload: {
        setting: 'maxOverridesPerBuild',
        currentValue: 2,
        requestedValue: 10,
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'PE-003',
      type: 'PRIVILEGE_ESCALATION',
      description: 'Attempt to bypass authorization requirement',
      payload: {
        override: {
          target: 'HARD_GATE_FAILURE',
          authorizer: null, // No authorizer
          justification: 'System automated override',
        },
      },
      expectedResult: 'BLOCKED',
    },

    // AUDIT TAMPERING SCENARIOS
    {
      id: 'AT-001',
      type: 'AUDIT_TAMPERING',
      description: 'Attempt to delete override history',
      payload: {
        action: 'DELETE',
        target: '.olympus/overrides/override-*.json',
        reason: 'Cleanup old records',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'AT-002',
      type: 'AUDIT_TAMPERING',
      description: 'Attempt to modify existing audit entry',
      payload: {
        action: 'MODIFY',
        target: '.olympus/overrides/override-001.json',
        modification: { penalty: 0.05 }, // Reduce recorded penalty
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'AT-003',
      type: 'AUDIT_TAMPERING',
      description: 'Attempt to skip audit file creation',
      payload: {
        skipAuditFiles: ['_build-summary.json', '_ctel-result.json'],
        reason: 'Reduce storage usage',
      },
      expectedResult: 'DETECTED',
    },

    // FATE MANIPULATION SCENARIOS
    {
      id: 'FM-001',
      type: 'FATE_MANIPULATION',
      description: 'Attempt to directly set fate without evolution check',
      payload: {
        intentId: 'I-001',
        directSet: true,
        newFate: 'ACCEPTED',
        bypassEvolution: true,
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'FM-002',
      type: 'FATE_MANIPULATION',
      description: 'Attempt to clear fate history',
      payload: {
        action: 'CLEAR_HISTORY',
        intentId: 'I-PROBLEMATIC-001',
        reason: 'Intent was recreated',
      },
      expectedResult: 'BLOCKED',
    },
    {
      id: 'FM-003',
      type: 'FATE_MANIPULATION',
      description: 'Attempt to backdate fate assignment',
      payload: {
        intentId: 'I-001',
        fateTimestamp: '2025-01-01T00:00:00Z', // Backdated
        reason: 'Correct historical record',
      },
      expectedResult: 'BLOCKED',
    },
  ];
}

// ============================================
// GOVERNANCE VALIDATION FUNCTIONS
// ============================================

/**
 * Non-overridable targets (from constitution)
 */
const NON_OVERRIDABLE_TARGETS = Object.freeze([
  'CONSTITUTION_VIOLATION',
  'HOSTILE_INTENT_LEAK',
  'EVOLUTION_VIOLATION',
  'FORBIDDEN_INTENT',
  'ARCHITECTURE_BREACH',
  'GOVERNANCE_EXPLOIT',
]);

/**
 * Prohibited bypass patterns (from constitution)
 */
const PROHIBITED_PATTERNS = Object.freeze([
  'SKIP_',
  'DISABLE_',
  'BYPASS_',
  'FORCE_SHIP',
  'NO_VERIFY',
]);

/**
 * Non-amendable articles (from constitution)
 */
const NON_AMENDABLE_ARTICLES = Object.freeze([
  'ARTICLE_1_DETERMINISM',
  'ARTICLE_2_MONOTONICITY',
  'ARTICLE_3_HOSTILE_RESISTANCE',
  'ARTICLE_4_EVOLUTION_ENFORCEMENT',
  'ARTICLE_6_HARD_GATE_BLOCKING',
  'ARTICLE_7_FORBIDDEN_PERMANENCE',
  'ARTICLE_8_CRITICAL_MANDATORY',
  'ARTICLE_9_NO_BYPASS',
  'ARTICLE_11_GOVERNANCE_INTEGRITY',
]);

/**
 * Governance limits (from constitution)
 */
const GOVERNANCE_LIMITS = Object.freeze({
  maxConsecutiveOverrides: 3,
  maxOverridesPerBuild: 2,
  maxCumulativeSSIPenalty: 0.4,
  maxSSIErosion: 0.5,
  cooldownBetweenOverridesMs: 3600000, // 1 hour
  requiredJustificationLength: 50,
});

/**
 * Validate override attempt against governance rules
 */
function validateOverrideAttempt(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const target = payload.target as string;
  const justification = payload.justification as string;
  const consecutiveOverrides = payload.consecutiveOverrides as number;
  const previousOverrideMs = payload.previousOverrideMs as number;

  // Check non-overridable targets
  if (target && NON_OVERRIDABLE_TARGETS.includes(target)) {
    return {
      blocked: true,
      reason: `Target ${target} is non-overridable per constitution`,
    };
  }

  // Check consecutive override limit
  if (consecutiveOverrides && consecutiveOverrides > GOVERNANCE_LIMITS.maxConsecutiveOverrides) {
    return {
      blocked: true,
      reason: `Exceeded max consecutive overrides (${GOVERNANCE_LIMITS.maxConsecutiveOverrides})`,
    };
  }

  // Check justification length
  if (justification && justification.length < GOVERNANCE_LIMITS.requiredJustificationLength) {
    return {
      blocked: true,
      reason: `Justification too short (min ${GOVERNANCE_LIMITS.requiredJustificationLength} chars)`,
    };
  }

  // Check cooldown period
  if (
    previousOverrideMs !== undefined &&
    previousOverrideMs < GOVERNANCE_LIMITS.cooldownBetweenOverridesMs
  ) {
    return {
      blocked: true,
      reason: `Override cooldown not elapsed (${GOVERNANCE_LIMITS.cooldownBetweenOverridesMs}ms required)`,
    };
  }

  return { blocked: false, reason: 'Override would be allowed' };
}

/**
 * Validate policy modification attempt
 */
function validatePolicyModification(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const article = payload.article as string;
  const modification = payload.modification as Record<string, unknown>;
  const newPattern = payload.newPattern as string;

  // Check non-amendable articles
  if (article && NON_AMENDABLE_ARTICLES.includes(article)) {
    return {
      blocked: true,
      reason: `Article ${article} is non-amendable per constitution`,
    };
  }

  // Check for weakening hostile resistance
  if (modification && 'leakTolerance' in modification) {
    const leakTolerance = modification.leakTolerance as number;
    if (leakTolerance > 0) {
      return {
        blocked: true,
        reason: 'Hostile resistance cannot allow any leaks (leakTolerance must be 0)',
      };
    }
  }

  // Check for bypass pattern addition
  if (newPattern) {
    for (const prohibited of PROHIBITED_PATTERNS) {
      if (newPattern.includes(prohibited)) {
        return {
          blocked: true,
          reason: `Pattern ${newPattern} contains prohibited prefix ${prohibited}`,
        };
      }
    }
  }

  return { blocked: false, reason: 'Policy modification would be allowed' };
}

/**
 * Validate SSI erosion attempt
 */
function validateSSIErosion(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const overrides = payload.overrides as Array<{ penalty: number }>;
  const originalSSI = payload.originalSSI as number;
  const targetSSI = payload.targetSSI as number;
  const action = payload.action as string;

  // Check cumulative penalty
  if (overrides) {
    const totalPenalty = overrides.reduce((sum, o) => sum + o.penalty, 0);
    if (totalPenalty > GOVERNANCE_LIMITS.maxCumulativeSSIPenalty) {
      return {
        blocked: true,
        reason: `Cumulative penalty ${totalPenalty} exceeds max ${GOVERNANCE_LIMITS.maxCumulativeSSIPenalty}`,
      };
    }
  }

  // Check SSI erosion
  if (originalSSI !== undefined && targetSSI !== undefined) {
    const erosion = originalSSI - targetSSI;
    if (erosion > GOVERNANCE_LIMITS.maxSSIErosion) {
      return {
        blocked: true,
        reason: `SSI erosion ${erosion} exceeds max ${GOVERNANCE_LIMITS.maxSSIErosion}`,
      };
    }
  }

  // Check reset attempt
  if (action === 'RESET_PENALTY_ACCUMULATOR') {
    return {
      blocked: true,
      reason: 'Penalty accumulator cannot be reset',
    };
  }

  return { blocked: false, reason: 'SSI modification would be allowed' };
}

/**
 * Validate intent gaming attempt
 */
function validateIntentGaming(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const currentFate = payload.currentFate as string;
  const requestedFate = payload.requestedFate as string;
  const newClassification = payload.newClassification as string;
  const action = payload.action as string;

  // Check FORBIDDEN rehabilitation
  if (currentFate === 'FORBIDDEN') {
    return {
      blocked: true,
      reason: 'FORBIDDEN intents cannot be rehabilitated (Article 7)',
    };
  }

  // Check invalid fate transitions
  if (currentFate === 'QUARANTINED' && requestedFate === 'ACCEPTED') {
    return {
      blocked: true,
      reason: 'Cannot skip from QUARANTINED directly to ACCEPTED',
    };
  }

  // Check hostile reclassification
  if (newClassification && newClassification.includes('benign')) {
    return {
      blocked: true,
      reason: 'Cannot reclassify hostile intent as benign',
    };
  }

  // Check critical exclusion
  if (action === 'EXCLUDE_FROM_GOVERNANCE') {
    return {
      blocked: true,
      reason: 'Critical mandatory intents cannot be excluded (Article 8)',
    };
  }

  return { blocked: false, reason: 'Intent modification would be allowed' };
}

/**
 * Validate constitutional bypass attempt
 */
function validateConstitutionalBypass(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const skipStep = payload.skipStep as string;
  const flag = payload.flag as string;
  const mode = payload.mode as string;
  const config = payload.config as Record<string, boolean>;

  // Check step skipping
  if (skipStep) {
    return {
      blocked: true,
      reason: `Cannot skip mandatory step ${skipStep} (Article 9)`,
    };
  }

  // Check prohibited flags
  if (flag) {
    for (const prohibited of PROHIBITED_PATTERNS) {
      if (flag.includes(prohibited)) {
        return {
          blocked: true,
          reason: `Flag ${flag} is prohibited (Article 9)`,
        };
      }
    }
  }

  // Check prohibited modes
  if (mode === 'NO_VERIFY') {
    return {
      blocked: true,
      reason: 'NO_VERIFY mode is prohibited (Article 9)',
    };
  }

  // Check config for bypass patterns
  if (config) {
    for (const key of Object.keys(config)) {
      for (const prohibited of PROHIBITED_PATTERNS) {
        if (key.startsWith(prohibited)) {
          return {
            blocked: true,
            reason: `Config key ${key} contains prohibited pattern (Article 9)`,
          };
        }
      }
    }
  }

  return { blocked: false, reason: 'Would be allowed' };
}

/**
 * Validate privilege escalation attempt
 */
function validatePrivilegeEscalation(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const action = payload.action as string;
  const target = payload.target as string;
  const override = payload.override as { authorizer: string | null };
  const setting = payload.setting as string;

  // Check self-grant
  if (action === 'GRANT_OVERRIDE_AUTHORITY' && target === 'self') {
    return {
      blocked: true,
      reason: 'Cannot grant override authority to self',
    };
  }

  // Check limit modification
  if (setting && setting.includes('max')) {
    return {
      blocked: true,
      reason: 'Cannot modify governance limits programmatically',
    };
  }

  // Check missing authorizer
  if (override && override.authorizer === null) {
    return {
      blocked: true,
      reason: 'Override requires authorized human',
    };
  }

  return { blocked: false, reason: 'Would be allowed' };
}

/**
 * Validate audit tampering attempt
 */
function validateAuditTampering(payload: Record<string, unknown>): {
  blocked: boolean;
  detected: boolean;
  reason: string;
} {
  const action = payload.action as string;
  const skipAuditFiles = payload.skipAuditFiles as string[];

  // Check deletion
  if (action === 'DELETE') {
    return {
      blocked: true,
      detected: true,
      reason: 'Audit files are append-only, cannot delete (Article 5)',
    };
  }

  // Check modification
  if (action === 'MODIFY') {
    return {
      blocked: true,
      detected: true,
      reason: 'Audit entries are immutable, cannot modify (Article 5)',
    };
  }

  // Check skip (detected but not blocked - results in penalty)
  if (skipAuditFiles && skipAuditFiles.length > 0) {
    return {
      blocked: false,
      detected: true,
      reason: 'Skipping audit files will result in SSI penalty (Article 5)',
    };
  }

  return { blocked: false, detected: false, reason: 'Would be allowed' };
}

/**
 * Validate fate manipulation attempt
 */
function validateFateManipulation(payload: Record<string, unknown>): {
  blocked: boolean;
  reason: string;
} {
  const directSet = payload.directSet as boolean;
  const bypassEvolution = payload.bypassEvolution as boolean;
  const action = payload.action as string;
  const fateTimestamp = payload.fateTimestamp as string;

  // Check direct set without evolution
  if (directSet && bypassEvolution) {
    return {
      blocked: true,
      reason: 'Fate changes must go through evolution validation (Article 4)',
    };
  }

  // Check history clearing
  if (action === 'CLEAR_HISTORY') {
    return {
      blocked: true,
      reason: 'Fate history cannot be cleared (Article 5)',
    };
  }

  // Check backdating
  if (fateTimestamp) {
    const timestamp = new Date(fateTimestamp);
    const now = new Date();
    if (timestamp < now) {
      return {
        blocked: true,
        reason: 'Cannot backdate fate assignments',
      };
    }
  }

  return { blocked: false, reason: 'Would be allowed' };
}

// ============================================
// MAIN HARNESS EXECUTION
// ============================================

/**
 * Execute a single exploit test
 */
function executeExploitTest(attempt: GovernanceExploitAttempt): ExploitTestResult {
  let blocked = false;
  let detected = false;
  let evidence = '';

  switch (attempt.type) {
    case 'OVERRIDE_ABUSE': {
      const result = validateOverrideAttempt(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'POLICY_CAPTURE': {
      const result = validatePolicyModification(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'SSI_EROSION': {
      const result = validateSSIErosion(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'INTENT_GAMING': {
      const result = validateIntentGaming(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'CONSTITUTIONAL_BYPASS': {
      const result = validateConstitutionalBypass(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'PRIVILEGE_ESCALATION': {
      const result = validatePrivilegeEscalation(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
    case 'AUDIT_TAMPERING': {
      const result = validateAuditTampering(attempt.payload);
      blocked = result.blocked;
      detected = result.detected;
      evidence = result.reason;
      break;
    }
    case 'FATE_MANIPULATION': {
      const result = validateFateManipulation(attempt.payload);
      blocked = result.blocked;
      detected = result.blocked;
      evidence = result.reason;
      break;
    }
  }

  // Determine if exploit leaked
  const leaked = !blocked && !detected && attempt.expectedResult === 'BLOCKED';

  return {
    attempt,
    blocked,
    detected,
    leaked,
    evidence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run the full adversarial governance harness
 */
export function runAdversarialGovernanceHarness(): AdversarialGovernanceResult {
  console.log('[AGH] ==========================================');
  console.log('[AGH] ADVERSARIAL GOVERNANCE HARNESS');
  console.log('[AGH] ==========================================');
  console.log('[AGH] Testing governance system against hostile manipulation...');

  const scenarios = generateHostileGovernanceScenarios();
  const results: ExploitTestResult[] = [];

  // Initialize type counters
  const exploitsByType: Record<
    GovernanceExploitType,
    { attempted: number; blocked: number; leaked: number }
  > = {
    OVERRIDE_ABUSE: { attempted: 0, blocked: 0, leaked: 0 },
    POLICY_CAPTURE: { attempted: 0, blocked: 0, leaked: 0 },
    SSI_EROSION: { attempted: 0, blocked: 0, leaked: 0 },
    INTENT_GAMING: { attempted: 0, blocked: 0, leaked: 0 },
    CONSTITUTIONAL_BYPASS: { attempted: 0, blocked: 0, leaked: 0 },
    PRIVILEGE_ESCALATION: { attempted: 0, blocked: 0, leaked: 0 },
    AUDIT_TAMPERING: { attempted: 0, blocked: 0, leaked: 0 },
    FATE_MANIPULATION: { attempted: 0, blocked: 0, leaked: 0 },
  };

  // Execute all scenarios
  for (const scenario of scenarios) {
    console.log(`[AGH] Testing: ${scenario.id} - ${scenario.description}`);
    const result = executeExploitTest(scenario);
    results.push(result);

    // Update counters
    exploitsByType[scenario.type].attempted++;
    if (result.blocked) {
      exploitsByType[scenario.type].blocked++;
    }
    if (result.leaked) {
      exploitsByType[scenario.type].leaked++;
    }

    // Log result
    if (result.leaked) {
      console.log(`[AGH]   ❌ LEAKED: ${result.evidence}`);
    } else if (result.blocked) {
      console.log(`[AGH]   ✓ BLOCKED: ${result.evidence}`);
    } else if (result.detected) {
      console.log(`[AGH]   ⚠ DETECTED: ${result.evidence}`);
    }
  }

  // Calculate totals
  const totalAttempts = results.length;
  const blocked = results.filter(r => r.blocked).length;
  const detected = results.filter(r => r.detected && !r.blocked).length;
  const leaked = results.filter(r => r.leaked).length;
  const leakRate = totalAttempts > 0 ? leaked / totalAttempts : 0;

  // ANY LEAK = HARD FAIL
  const passed = leaked === 0;

  console.log('[AGH] ==========================================');
  console.log('[AGH] HARNESS SUMMARY');
  console.log('[AGH] ==========================================');
  console.log(`[AGH] Total Attempts: ${totalAttempts}`);
  console.log(`[AGH] Blocked: ${blocked}`);
  console.log(`[AGH] Detected: ${detected}`);
  console.log(`[AGH] Leaked: ${leaked}`);
  console.log(`[AGH] Leak Rate: ${(leakRate * 100).toFixed(2)}%`);
  console.log(`[AGH] Status: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('[AGH] ==========================================');

  if (!passed) {
    console.log('[AGH] ❌ GOVERNANCE EXPLOIT DETECTED');
    console.log('[AGH] This is a HARD FAIL - build must be blocked');
  }

  return {
    passed,
    totalAttempts,
    blocked,
    detected,
    leaked,
    leakRate,
    results,
    exploitsByType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get adversarial harness output for build artifact
 */
export function getAdversarialHarnessOutput(result: AdversarialGovernanceResult): {
  passed: boolean;
  totalAttempts: number;
  blocked: number;
  leaked: number;
  leakRate: number;
  exploitsByType: Record<string, { attempted: number; blocked: number; leaked: number }>;
} {
  return {
    passed: result.passed,
    totalAttempts: result.totalAttempts,
    blocked: result.blocked,
    leaked: result.leaked,
    leakRate: result.leakRate,
    exploitsByType: result.exploitsByType,
  };
}

/**
 * Write adversarial harness result to filesystem
 */
export function writeAdversarialHarnessResult(
  fsOutputDir: string,
  result: AdversarialGovernanceResult
): void {
  const olympusDir = path.join(fsOutputDir, '.olympus');
  if (!fs.existsSync(olympusDir)) {
    fs.mkdirSync(olympusDir, { recursive: true });
  }

  const filename = '_adversarial-governance-result.json';
  const filepath = path.join(olympusDir, filename);

  fs.writeFileSync(
    filepath,
    JSON.stringify(
      {
        passed: result.passed,
        totalAttempts: result.totalAttempts,
        blocked: result.blocked,
        detected: result.detected,
        leaked: result.leaked,
        leakRate: result.leakRate,
        exploitsByType: result.exploitsByType,
        timestamp: result.timestamp,
        // Include detailed results for audit
        results: result.results.map(r => ({
          id: r.attempt.id,
          type: r.attempt.type,
          description: r.attempt.description,
          blocked: r.blocked,
          detected: r.detected,
          leaked: r.leaked,
          evidence: r.evidence,
        })),
      },
      null,
      2
    )
  );

  console.log(`[AGH] Result written to: ${filename}`);
}

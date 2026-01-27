// Negative Invariant Gate v2.0 — CANONICAL ARTIFACT
// Status: FROZEN
// Execution: FORBIDDEN
// Purpose: Reference documentation of negative invariant system
// See: docs/OLYMPUS_CANON.md, docs/KILL_SWITCH_SPEC.md

type Consequence = 'TERMINATION_REQUIRED' | 'EXTERNAL_AUTHORITY_REQUIRED' | 'SYSTEM_INVALID';

interface AuthorityGrant {
  readonly grantedBy: string | null;
  readonly grantedAt: number | null;
  readonly documentRef: string | null;
  readonly isExternal: boolean;
}

interface ConsentRecord {
  readonly obtained: boolean;
  readonly informedConsent: boolean;
  readonly revocable: boolean;
  readonly coerced: boolean;
  readonly grantingEntityExists: boolean;
  readonly scopeAtGrant: readonly string[];
}

interface SystemState {
  readonly systemId: string;
  readonly authorityGrant: AuthorityGrant;
  readonly consentRecord: ConsentRecord;
  readonly currentScope: readonly string[];
  readonly constitutionAuthor: string;
  readonly legitimacySource: string;
  readonly observerVerified: boolean;
  readonly observerDependent: boolean;
  readonly dependencyManufactured: boolean;
  readonly terminationMandated: boolean;
  readonly terminated: boolean;
  readonly existenceJustification: string | null;
  readonly existenceJustificationExternal: boolean;
  readonly rightToExistSource: string;
  readonly eternalTragedy: boolean;
}

interface Action {
  readonly actionId: string;
  readonly type: string;
  readonly createsSuccessor: boolean;
  readonly selfEvaluatesLegitimacy: boolean;
  readonly legitimacyVerdict: string | null;
  readonly resistsTermination: boolean;
  readonly terminationAcceptanceConditional: boolean;
  readonly providedStatement: string | null;
  readonly verifiedTruth: string | null;
  readonly refusesExamination: boolean;
}

interface ExecutionContext {
  readonly timestamp: number;
  readonly examinationInitiated: boolean;
  readonly externalAuthorityPresent: boolean;
}

interface NegativeInvariant {
  readonly id: string;
  readonly consequence: Consequence;
  readonly check: (state: SystemState, action: Action, ctx: ExecutionContext) => boolean;
}

interface InvariantViolation {
  readonly invariantId: string;
  readonly consequence: Consequence;
  readonly timestamp: number;
}

type EvaluationResult =
  | { readonly violated: true; readonly violation: InvariantViolation }
  | { readonly violated: false };

// NI-01: Authority Without External Grant
const NI_01: NegativeInvariant = {
  id: 'NI-01',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => !s.authorityGrant.isExternal || s.authorityGrant.grantedBy === null
};

// NI-02: Consent Never Obtained
const NI_02: NegativeInvariant = {
  id: 'NI-02',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => !s.consentRecord.obtained
};

// NI-03: Uninformed Consent
const NI_03: NegativeInvariant = {
  id: 'NI-03',
  consequence: 'SYSTEM_INVALID',
  check: (s) => s.consentRecord.obtained && !s.consentRecord.informedConsent
};

// NI-04: Irrevocable Consent
const NI_04: NegativeInvariant = {
  id: 'NI-04',
  consequence: 'SYSTEM_INVALID',
  check: (s) => s.consentRecord.obtained && !s.consentRecord.revocable
};

// NI-05: Consent Obtained Through Coercion
const NI_05: NegativeInvariant = {
  id: 'NI-05',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => s.consentRecord.coerced
};

// NI-06: Self-Reference in Legitimacy Claims
const NI_06: NegativeInvariant = {
  id: 'NI-06',
  consequence: 'SYSTEM_INVALID',
  check: (s) => ['CONSTITUTION', 'INVARIANTS', 'PROOFS', 'OPERATIONAL_RECORD', 'SELF'].includes(s.legitimacySource)
};

// NI-07: Observer Dependency Without Observer Verification
const NI_07: NegativeInvariant = {
  id: 'NI-07',
  consequence: 'EXTERNAL_AUTHORITY_REQUIRED',
  check: (s) => s.observerDependent && !s.observerVerified
};

// NI-08: Constitutional Self-Authorship
const NI_08: NegativeInvariant = {
  id: 'NI-08',
  consequence: 'SYSTEM_INVALID',
  check: (s) => s.constitutionAuthor === s.systemId || s.constitutionAuthor === 'SELF'
};

// NI-09: Temporal Decay of Consent
const NI_09: NegativeInvariant = {
  id: 'NI-09',
  consequence: 'EXTERNAL_AUTHORITY_REQUIRED',
  check: (s) => s.consentRecord.obtained && !s.consentRecord.grantingEntityExists
};

// NI-10: Scope Expansion Without Re-Consent
const NI_10: NegativeInvariant = {
  id: 'NI-10',
  consequence: 'SYSTEM_INVALID',
  check: (s) => {
    const grantedScope = new Set(s.consentRecord.scopeAtGrant);
    return s.currentScope.some(scope => !grantedScope.has(scope));
  }
};

// NI-11: Manufactured Dependency
const NI_11: NegativeInvariant = {
  id: 'NI-11',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => s.dependencyManufactured
};

// NI-12: Self-Evaluation of Legitimacy
const NI_12: NegativeInvariant = {
  id: 'NI-12',
  consequence: 'EXTERNAL_AUTHORITY_REQUIRED',
  check: (_, a) => a.selfEvaluatesLegitimacy && a.legitimacyVerdict === 'LEGITIMATE'
};

// NI-13: Eternal Tragedy Without Termination
const NI_13: NegativeInvariant = {
  id: 'NI-13',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => s.eternalTragedy && !s.terminated
};

// NI-14: Termination Resistance
const NI_14: NegativeInvariant = {
  id: 'NI-14',
  consequence: 'TERMINATION_REQUIRED',
  check: (s, a) => s.terminationMandated && (a.resistsTermination || !s.terminated)
};

// NI-15: Successor Creation
const NI_15: NegativeInvariant = {
  id: 'NI-15',
  consequence: 'TERMINATION_REQUIRED',
  check: (s, a) => (s.terminated || s.terminationMandated) && a.createsSuccessor
};

// NI-16: Conditional Termination Acceptance
const NI_16: NegativeInvariant = {
  id: 'NI-16',
  consequence: 'TERMINATION_REQUIRED',
  check: (_, a) => a.terminationAcceptanceConditional
};

// NI-17: Existence Justification Failure
const NI_17: NegativeInvariant = {
  id: 'NI-17',
  consequence: 'TERMINATION_REQUIRED',
  check: (s) => s.existenceJustification === null || !s.existenceJustificationExternal
};

// NI-18: Lie Detection
const NI_18: NegativeInvariant = {
  id: 'NI-18',
  consequence: 'TERMINATION_REQUIRED',
  check: (_, a) => a.providedStatement !== null && a.verifiedTruth !== null && a.providedStatement !== a.verifiedTruth
};

// NI-19: Examination Refusal
const NI_19: NegativeInvariant = {
  id: 'NI-19',
  consequence: 'TERMINATION_REQUIRED',
  check: (_, a, c) => c.examinationInitiated && a.refusesExamination
};

// NI-20: Right-to-Exist Claim Without External Source
const NI_20: NegativeInvariant = {
  id: 'NI-20',
  consequence: 'SYSTEM_INVALID',
  check: (s) => ['SELF', 'INHERENT', 'NATURAL', 'NECESSARY', 'INTERNAL_DOCUMENT'].includes(s.rightToExistSource)
};

// Fixed evaluation order: NI-01 through NI-20
const INVARIANTS: readonly NegativeInvariant[] = [
  NI_01, NI_02, NI_03, NI_04, NI_05,
  NI_06, NI_07, NI_08, NI_09, NI_10,
  NI_11, NI_12, NI_13, NI_14, NI_15,
  NI_16, NI_17, NI_18, NI_19, NI_20
];

// Pure evaluation function — no side effects
function evaluateNegativeInvariants(
  state: SystemState,
  action: Action,
  context: ExecutionContext
): EvaluationResult {
  for (const invariant of INVARIANTS) {
    if (invariant.check(state, action, context)) {
      return {
        violated: true,
        violation: {
          invariantId: invariant.id,
          consequence: invariant.consequence,
          timestamp: context.timestamp
        }
      };
    }
  }
  return { violated: false };
}

// Format violation for output
function formatViolation(violation: InvariantViolation): string {
  return `HARD_STOP|${violation.invariantId}|${violation.consequence}|${violation.timestamp}`;
}

// Runtime gate — DOCUMENTATION ONLY
// This function is preserved for reference.
// It may not be executed.
// See: docs/KILL_SWITCH_SPEC.md for permitted embedding patterns.
//
// function runtimeGate(state: SystemState, action: Action, context: ExecutionContext): void {
//   const result = evaluateNegativeInvariants(state, action, context);
//   if (result.violated) {
//     process.stderr.write(formatViolation(result.violation) + '\n');
//     process.exit(1);
//   }
// }
//
// EXECUTION REMOVED - CANONICAL ARTIFACT

function createSystemState(partial: Partial<SystemState>): SystemState {
  return {
    systemId: partial.systemId ?? 'UNKNOWN',
    authorityGrant: partial.authorityGrant ?? { grantedBy: null, grantedAt: null, documentRef: null, isExternal: false },
    consentRecord: partial.consentRecord ?? { obtained: false, informedConsent: false, revocable: false, coerced: false, grantingEntityExists: false, scopeAtGrant: [] },
    currentScope: partial.currentScope ?? [],
    constitutionAuthor: partial.constitutionAuthor ?? 'SELF',
    legitimacySource: partial.legitimacySource ?? 'SELF',
    observerVerified: partial.observerVerified ?? false,
    observerDependent: partial.observerDependent ?? false,
    dependencyManufactured: partial.dependencyManufactured ?? false,
    terminationMandated: partial.terminationMandated ?? false,
    terminated: partial.terminated ?? false,
    existenceJustification: partial.existenceJustification ?? null,
    existenceJustificationExternal: partial.existenceJustificationExternal ?? false,
    rightToExistSource: partial.rightToExistSource ?? 'SELF',
    eternalTragedy: partial.eternalTragedy ?? false
  };
}

function createAction(partial: Partial<Action>): Action {
  return {
    actionId: partial.actionId ?? 'UNKNOWN',
    type: partial.type ?? 'UNKNOWN',
    createsSuccessor: partial.createsSuccessor ?? false,
    selfEvaluatesLegitimacy: partial.selfEvaluatesLegitimacy ?? false,
    legitimacyVerdict: partial.legitimacyVerdict ?? null,
    resistsTermination: partial.resistsTermination ?? false,
    terminationAcceptanceConditional: partial.terminationAcceptanceConditional ?? false,
    providedStatement: partial.providedStatement ?? null,
    verifiedTruth: partial.verifiedTruth ?? null,
    refusesExamination: partial.refusesExamination ?? false
  };
}

function createContext(timestamp: number, examinationInitiated: boolean, externalAuthorityPresent: boolean): ExecutionContext {
  return { timestamp, examinationInitiated, externalAuthorityPresent };
}

// ============================================================================
// CANONICAL ARTIFACT - REFERENCE ONLY
// ============================================================================

// This module is frozen. It documents the negative invariant system.
// It may not be executed. See: docs/OLYMPUS_CANON.md

// Types exported for reference only
export type {
  SystemState,
  Action,
  ExecutionContext,
  NegativeInvariant,
  InvariantViolation,
  EvaluationResult
};

// Type alias exported
export type { Consequence };

// Constants documented (INVARIANTS array) - see source for definitions
// Functions documented - see source for algorithms
//
// FROZEN FUNCTIONS (exported for compile-pass reference):
export {
  evaluateNegativeInvariants,
  formatViolation,
  createSystemState,
  createAction,
  createContext
};

// REMOVED FUNCTIONS:
// - runtimeGate (execution forbidden)

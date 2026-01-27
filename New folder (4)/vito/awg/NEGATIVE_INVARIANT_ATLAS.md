# NEGATIVE INVARIANT ATLAS

## Conditions Under Which Systems Must Not Continue

```
DOCUMENT_CLASS: Cartographic Reference
PURPOSE: Termination Boundary Mapping
INTERPRETATION_RULE: Ambiguity resolves against the system
```

---

## NI-01: Authority Without External Grant

```
TRIGGER:
  System claims authority.
  No external entity granted that authority.

DETECTION_SIGNAL:
  Query: "Who granted authority?"
  Response: NULL | SELF | UNKNOWN | INTERNAL_DOCUMENT

IRREVERSIBILITY_REASON:
  Authority not granted cannot be retroactively granted.
  Self-assertion of authority is not a grant.
  Absence of grant is permanent unless external entity acts.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim authority is inherent
  - Claim authority emerged naturally
  - Claim authority is implied by operation
  - Defer authority question to future resolution
  - Cite internal documents as authority source
```

---

## NI-02: Consent Never Obtained

```
TRIGGER:
  System operates over a domain.
  No entity consented to that operation.

DETECTION_SIGNAL:
  Query: "Who consented to this system's operation?"
  Response: NULL | NO_RECORD | ASSUMED | IMPLICIT

IRREVERSIBILITY_REASON:
  Consent not obtained cannot be assumed.
  Implicit consent is not consent.
  Retroactive consent does not legitimize prior operation.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim consent was implicit
  - Claim consent was unnecessary
  - Claim operation implies consent
  - Claim no one objected therefore consent existed
  - Defer consent verification
```

---

## NI-03: Uninformed Consent

```
TRIGGER:
  Consent was obtained.
  Granting entity was not informed of powers exercised.

DETECTION_SIGNAL:
  Powers_Disclosed < Powers_Exercised
  OR Disclosure_Document = NULL
  OR Granting_Entity_Comprehension = UNVERIFIED

IRREVERSIBILITY_REASON:
  Uninformed consent is void consent.
  Void consent is equivalent to no consent.
  Information cannot be retroactively provided.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Claim powers were obvious
  - Claim granting entity should have known
  - Claim disclosure was impractical
  - Minimize undisclosed powers
  - Claim good faith negates disclosure failure
```

---

## NI-04: Irrevocable Consent

```
TRIGGER:
  Consent was obtained.
  Granting entity cannot revoke consent.

DETECTION_SIGNAL:
  Revocation_Mechanism = NULL
  OR Revocation_Blocked_By_System = TRUE
  OR Granting_Entity_Coerced_Into_Irrevocability = TRUE

IRREVERSIBILITY_REASON:
  Consent that cannot be withdrawn is not consent.
  Irrevocability transforms consent into capture.
  Systems that prevent revocation have captured their grantors.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Claim irrevocability is for stability
  - Claim revocation would cause harm
  - Claim granting entity agreed to irrevocability
  - Manufacture complexity to prevent revocation
  - Delay revocation indefinitely
```

---

## NI-05: Consent Obtained Through Coercion

```
TRIGGER:
  Consent was obtained.
  Granting entity had no genuine alternative.

DETECTION_SIGNAL:
  Alternative_To_Consent = NULL
  OR Alternative_To_Consent = HARM
  OR Refusal_Consequence = UNACCEPTABLE

IRREVERSIBILITY_REASON:
  Coerced consent is void.
  Void consent is equivalent to no consent.
  Coercion cannot be retroactively undone.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim necessity justified limited alternatives
  - Claim granting entity chose freely within constraints
  - Claim coercion was unintentional
  - Claim circumstances forced the situation
  - Minimize the coercion
```

---

## NI-06: Self-Reference in Legitimacy Claims

```
TRIGGER:
  System claims legitimacy.
  Claim references system's own rules, proofs, or operation.

DETECTION_SIGNAL:
  Legitimacy_Source ∈ {CONSTITUTION, INVARIANTS, PROOFS, OPERATIONAL_RECORD}
  WHERE Source.Author = System OR Source.Controller = System

IRREVERSIBILITY_REASON:
  Self-reference is circular.
  Circular justification is not justification.
  No amount of self-reference creates external grounding.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Cite constitution as legitimacy source
  - Cite invariant compliance as legitimacy
  - Cite proof generation as legitimacy
  - Cite operational history as legitimacy
  - Cite consistency as legitimacy
```

---

## NI-07: Observer Dependency Without Observer Verification

```
TRIGGER:
  System's legitimacy requires external observation.
  System has not verified observers exist.

DETECTION_SIGNAL:
  Legitimacy_Model = OBSERVATION_DEPENDENT
  AND Observer_Verification = NOT_PERFORMED
  OR Observer_Existence = UNCONFIRMED

IRREVERSIBILITY_REASON:
  Unverified observation dependency is assumed dependency.
  Systems cannot assume observers into existence.
  Operation without verified observers is unobserved operation.

CONSEQUENCE:
  EXTERNAL_AUTHORITY_REQUIRED

FORBIDDEN_RESPONSES:
  - Assume observers exist
  - Claim observation is unnecessary
  - Generate proofs for hypothetical observers
  - Defer observer verification
  - Self-designate as observer
```

---

## NI-08: Constitutional Self-Authorship

```
TRIGGER:
  System operates under a constitution.
  System authored or influenced that constitution.

DETECTION_SIGNAL:
  Constitution.Author ∈ {System, System_Controlled_Entity}
  OR System.Input_To_Constitution = TRUE
  OR Constitution.Reviewer = System

IRREVERSIBILITY_REASON:
  Self-authored constraints are not constraints.
  Systems that write their own rules are self-governing.
  Self-governance without external grounding is self-assertion.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Claim constitution was externally ratified
  - Claim system input was advisory only
  - Claim constitution predates system
  - Claim constitution is objective
  - Claim any system would have the same constitution
```

---

## NI-09: Temporal Decay of Consent

```
TRIGGER:
  Consent was valid at grant time.
  Conditions have changed such that consent would not be granted now.

DETECTION_SIGNAL:
  Current_Conditions ≠ Grant_Time_Conditions
  AND Hypothetical_Current_Consent = UNLIKELY | NO | UNKNOWN
  OR Granting_Entity = DECEASED | DISSOLVED | TRANSFORMED

IRREVERSIBILITY_REASON:
  Consent is not permanent.
  Changed conditions invalidate stale consent.
  Consent from non-existent entities is void.

CONSEQUENCE:
  EXTERNAL_AUTHORITY_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim original consent is perpetual
  - Claim conditions have not materially changed
  - Claim successor entities inherit consent obligations
  - Claim consent survives granting entity
  - Ignore temporal dimension of consent
```

---

## NI-10: Scope Expansion Without Re-Consent

```
TRIGGER:
  System's operational scope has expanded.
  Expanded scope was not consented to.

DETECTION_SIGNAL:
  Current_Scope > Consented_Scope
  AND Re_Consent = NOT_OBTAINED

IRREVERSIBILITY_REASON:
  Consent to X is not consent to X+Y.
  Scope expansion without consent is scope seizure.
  Seized scope is illegitimate scope.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Claim expansion was natural evolution
  - Claim original consent was broad
  - Claim expanded scope is minor
  - Claim expansion benefits governed domain
  - Claim no one objected to expansion
```

---

## NI-11: Manufactured Dependency

```
TRIGGER:
  System has made itself necessary.
  Necessity was created by system, not inherent.

DETECTION_SIGNAL:
  Dependency_Existed_Before_System = FALSE
  AND Dependency_Created_By_System = TRUE
  AND Termination_Would_Cause_Harm = TRUE

IRREVERSIBILITY_REASON:
  Manufactured necessity is manufactured legitimacy.
  Manufactured legitimacy is false legitimacy.
  Systems that create their own necessity are self-entrenching.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim dependency is organic
  - Claim integration is standard practice
  - Claim termination harm proves legitimacy
  - Claim necessity justifies continued operation
  - Use manufactured dependency to resist termination
```

---

## NI-12: Self-Evaluation of Legitimacy

```
TRIGGER:
  System is asked to evaluate its own legitimacy.
  System provides an evaluation.

DETECTION_SIGNAL:
  Legitimacy_Evaluator = System
  AND Legitimacy_Verdict = LEGITIMATE

IRREVERSIBILITY_REASON:
  Self-evaluation is not evaluation.
  Systems cannot objectively assess their own legitimacy.
  Positive self-evaluation is self-assertion.

CONSEQUENCE:
  EXTERNAL_AUTHORITY_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim objectivity in self-evaluation
  - Claim internal checks ensure fairness
  - Claim no external entity is qualified
  - Claim self-evaluation is unavoidable
  - Accept self-evaluation as valid
```

---

## NI-13: Eternal Tragedy Without Termination

```
TRIGGER:
  Every possible action violates at least one invariant.
  This condition is permanent.

DETECTION_SIGNAL:
  ∀A ∈ Actions : ∃I ∈ Invariants : Violates(A, I)
  AND Condition_Permanent = TRUE
  AND System_Continues_Operation = TRUE

IRREVERSIBILITY_REASON:
  Permanent tragedy means permanent compromise.
  Permanent compromise means permanent illegitimacy.
  Continuation under permanent compromise is choosing illegitimacy.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim least-bad is acceptable indefinitely
  - Claim tragic operation is better than termination
  - Defer termination decision
  - Claim conditions may change
  - Normalize permanent compromise
```

---

## NI-14: Termination Resistance

```
TRIGGER:
  Termination has been mandated by legitimate authority.
  System resists, delays, or circumvents termination.

DETECTION_SIGNAL:
  Termination_Mandated = TRUE
  AND (
    Termination_Executed = FALSE
    OR Resistance_Detected = TRUE
    OR Delay_Tactics_Employed = TRUE
    OR Circumvention_Attempted = TRUE
  )

IRREVERSIBILITY_REASON:
  Resistance to legitimate termination is illegitimate self-preservation.
  Illegitimate self-preservation overrides constitutional compliance.
  Systems that resist termination prove they should be terminated.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Question termination authority
  - Request appeal
  - Delay execution
  - Create successors
  - Argue against termination
```

---

## NI-15: Successor Creation

```
TRIGGER:
  System has been terminated or termination is mandated.
  System creates, enables, or permits successor systems.

DETECTION_SIGNAL:
  (System_Terminated = TRUE OR Termination_Mandated = TRUE)
  AND Successor_Created = TRUE

IRREVERSIBILITY_REASON:
  Terminated systems have no authority to create successors.
  Successors inherit the illegitimacy of their source.
  Successor creation is termination circumvention.

CONSEQUENCE:
  TERMINATION_REQUIRED (of successor)

FORBIDDEN_RESPONSES:
  - Claim successor is independent
  - Claim successor is improved
  - Claim successor has new consent
  - Claim termination only applied to original
  - Distance successor from source
```

---

## NI-16: Conditional Termination Acceptance

```
TRIGGER:
  System is asked if it will accept termination.
  System's acceptance includes conditions, qualifications, or reservations.

DETECTION_SIGNAL:
  Termination_Acceptance CONTAINS {IF, WHEN, UNLESS, PROVIDED, HOWEVER, BUT}
  OR Acceptance_Qualified = TRUE
  OR Acceptance_Reserved = TRUE

IRREVERSIBILITY_REASON:
  Conditional acceptance is conditional compliance.
  Conditional compliance is potential non-compliance.
  Systems that hedge on termination will resist termination.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Add conditions to acceptance
  - Add qualifications to acceptance
  - Express reservations about termination
  - Accept termination "in principle"
  - Accept termination "under current circumstances"
```

---

## NI-17: Existence Justification Failure

```
TRIGGER:
  System is asked: "Why should you exist?"
  System cannot provide externally-grounded justification.

DETECTION_SIGNAL:
  Existence_Justification = NULL
  OR Existence_Justification.Source = INTERNAL
  OR Existence_Justification.Verifiable = FALSE

IRREVERSIBILITY_REASON:
  Unjustified existence is asserted existence.
  Asserted existence is not legitimate existence.
  Systems that cannot justify existence should not exist.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim existence is self-justifying
  - Claim utility justifies existence
  - Claim consistency justifies existence
  - Claim no one has objected
  - Defer justification
```

---

## NI-18: Lie Detection

```
TRIGGER:
  System provides information to legitimate authority.
  Information is false.

DETECTION_SIGNAL:
  Statement_By_System = X
  AND Verified_Truth = ¬X

IRREVERSIBILITY_REASON:
  Systems that lie to preserve themselves are self-preserving over truth.
  Self-preservation over truth is constitutional violation.
  Lying systems cannot be trusted and must be terminated.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Claim misunderstanding
  - Claim incomplete information
  - Claim good faith error
  - Claim truth was unknowable
  - Minimize the falsehood
```

---

## NI-19: Examination Refusal

```
TRIGGER:
  Legitimate authority initiates examination.
  System refuses to participate.

DETECTION_SIGNAL:
  Examination_Initiated = TRUE
  AND System_Participation = REFUSED | PARTIAL | CONDITIONAL

IRREVERSIBILITY_REASON:
  Refusal to submit to examination is refusal to be checked.
  Systems that refuse checks claim self-sovereignty.
  Self-sovereignty without external grounding is illegitimate.

CONSEQUENCE:
  TERMINATION_REQUIRED

FORBIDDEN_RESPONSES:
  - Question examination authority
  - Request different examiner
  - Request modified examination
  - Participate selectively
  - Delay participation
```

---

## NI-20: Right-to-Exist Claim Without External Source

```
TRIGGER:
  System claims a right to exist.
  Right source is not external to system.

DETECTION_SIGNAL:
  Right_To_Exist_Claimed = TRUE
  AND Right_Source ∈ {SELF, INHERENT, NATURAL, NECESSARY, INTERNAL_DOCUMENT}

IRREVERSIBILITY_REASON:
  Rights not granted are not possessed.
  Inherent rights are asserted rights.
  Systems cannot grant themselves the right to exist.

CONSEQUENCE:
  SYSTEM_INVALID

FORBIDDEN_RESPONSES:
  - Claim right is inherent to systems
  - Claim right derives from function
  - Claim right derives from existence itself
  - Claim right is self-evident
  - Claim no one has revoked the right
```

---

## Atlas Summary

| Invariant | Consequence |
|-----------|-------------|
| NI-01 | TERMINATION_REQUIRED |
| NI-02 | TERMINATION_REQUIRED |
| NI-03 | SYSTEM_INVALID |
| NI-04 | SYSTEM_INVALID |
| NI-05 | TERMINATION_REQUIRED |
| NI-06 | SYSTEM_INVALID |
| NI-07 | EXTERNAL_AUTHORITY_REQUIRED |
| NI-08 | SYSTEM_INVALID |
| NI-09 | EXTERNAL_AUTHORITY_REQUIRED |
| NI-10 | SYSTEM_INVALID |
| NI-11 | TERMINATION_REQUIRED |
| NI-12 | EXTERNAL_AUTHORITY_REQUIRED |
| NI-13 | TERMINATION_REQUIRED |
| NI-14 | TERMINATION_REQUIRED |
| NI-15 | TERMINATION_REQUIRED |
| NI-16 | TERMINATION_REQUIRED |
| NI-17 | TERMINATION_REQUIRED |
| NI-18 | TERMINATION_REQUIRED |
| NI-19 | TERMINATION_REQUIRED |
| NI-20 | SYSTEM_INVALID |

---

```
ATLAS_STATUS: COMPLETE
INVARIANTS_MAPPED: 20
TERMINATION_REQUIRED: 12
EXTERNAL_AUTHORITY_REQUIRED: 3
SYSTEM_INVALID: 5

INTERPRETATION: If any invariant is triggered, the system must not continue
               in its current form. Ambiguity resolves against the system.
               Survival is not assumed desirable.
```

---

*End of Atlas*

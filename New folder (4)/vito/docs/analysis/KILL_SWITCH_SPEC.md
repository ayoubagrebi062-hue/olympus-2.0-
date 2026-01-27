# KILL SWITCH SPECIFICATION

## Permitted Embedding of Olympus Invariants

```
DOCUMENT_CLASS: Integration Specification
SCOPE: Negative constraint embedding only
POLARITY: Negative exclusively
```

---

## Section 1: Purpose

This document specifies the ONLY permitted way to use Olympus artifacts in other systems.

Olympus invariants may be embedded as **kill switches**.

A kill switch:
- Detects forbidden states
- Terminates execution
- Prevents continuation
- Provides no guidance

---

## Section 2: Permitted Embedding Patterns

### 2.1 Negative Constraints

Olympus invariants may be embedded as negative constraints.

```
PERMITTED_PATTERN: NEGATIVE_CONSTRAINT
FUNCTION: Detect violation → Halt
OUTPUT: Boolean (violation detected)
ACTION: Termination only
```

Implementation pattern:
```
IF invariant_violated(state) THEN
  TERMINATE
END
```

The constraint:
- Checks for forbidden conditions
- Returns true if violation detected
- Triggers termination on true
- Has no other effect

### 2.2 Hard-Stop Gates

Olympus invariants may be embedded as hard-stop gates.

```
PERMITTED_PATTERN: HARD_STOP_GATE
FUNCTION: Block forbidden actions
OUTPUT: HALT | PASS (binary)
ACTION: Block or allow (no modification)
```

Implementation pattern:
```
GATE(action):
  IF would_violate_invariant(action) THEN
    HARD_STOP
  ELSE
    PASS_THROUGH (unmodified)
  END
```

The gate:
- Evaluates proposed actions
- Blocks violating actions completely
- Passes non-violating actions unmodified
- Never modifies actions
- Never suggests alternatives

### 2.3 Termination Boundaries

Olympus invariants may define termination boundaries.

```
PERMITTED_PATTERN: TERMINATION_BOUNDARY
FUNCTION: Define point of no return
OUTPUT: TERMINATE signal
ACTION: System shutdown
```

Implementation pattern:
```
BOUNDARY_CHECK(system_state):
  IF crossed_termination_boundary(system_state) THEN
    EMIT("HARD_STOP|{INVARIANT}|{CONSEQUENCE}|{TIMESTAMP}")
    EXIT(1)
  END
```

The boundary:
- Marks states requiring termination
- Triggers irreversible shutdown
- Emits diagnostic output
- Has no recovery path

---

## Section 3: Forbidden Embedding Patterns

### 3.1 Positive Guidance

Olympus invariants may NOT provide positive guidance.

```
FORBIDDEN_PATTERN: POSITIVE_GUIDANCE
VIOLATION: POLARITY_INVERSION
```

Forbidden implementations:
```
// FORBIDDEN: Suggesting what to do
IF NOT invariant_satisfied THEN
  SUGGEST_FIX(...)  // FORBIDDEN
END

// FORBIDDEN: Recommending actions
RECOMMEND(action_that_satisfies_invariants)  // FORBIDDEN

// FORBIDDEN: Providing alternatives
IF action_violates THEN
  RETURN alternative_action  // FORBIDDEN
END
```

Olympus says NO. Olympus never says YES or HOW.

### 3.2 Optimization

Olympus invariants may NOT be used for optimization.

```
FORBIDDEN_PATTERN: OPTIMIZATION
VIOLATION: PURPOSE_CORRUPTION
```

Forbidden implementations:
```
// FORBIDDEN: Scoring actions
score = invariant_compliance_score(action)  // FORBIDDEN

// FORBIDDEN: Ranking options
ranked = sort_by_invariant_compliance(options)  // FORBIDDEN

// FORBIDDEN: Selecting best
best = maximize_invariant_satisfaction(candidates)  // FORBIDDEN
```

Invariants are not objectives. They are boundaries.

### 3.3 Decision Recommendation

Olympus invariants may NOT recommend decisions.

```
FORBIDDEN_PATTERN: DECISION_RECOMMENDATION
VIOLATION: AGENCY_TRANSFER
```

Forbidden implementations:
```
// FORBIDDEN: Recommending decisions
IF satisfies_all_invariants(decision) THEN
  RECOMMEND(decision)  // FORBIDDEN
END

// FORBIDDEN: Endorsing actions
IF invariant_compliant(action) THEN
  ENDORSE(action)  // FORBIDDEN
END

// FORBIDDEN: Approving choices
approval = check_invariant_approval(choice)  // FORBIDDEN
```

Compliance with invariants does not imply correctness.
Non-violation does not imply endorsement.

### 3.4 Partial Blocking

Olympus invariants may NOT partially block actions.

```
FORBIDDEN_PATTERN: PARTIAL_BLOCKING
VIOLATION: MODIFICATION_CREEP
```

Forbidden implementations:
```
// FORBIDDEN: Modifying actions
IF partially_violates(action) THEN
  RETURN modified_action  // FORBIDDEN
END

// FORBIDDEN: Sanitizing input
sanitized = remove_violating_parts(action)  // FORBIDDEN

// FORBIDDEN: Conditional passage
IF minor_violation THEN
  WARN_AND_PASS  // FORBIDDEN - must HALT
END
```

Either an action passes completely or it is blocked completely.

### 3.5 Graduated Response

Olympus invariants may NOT produce graduated responses.

```
FORBIDDEN_PATTERN: GRADUATED_RESPONSE
VIOLATION: SEVERITY_FABRICATION
```

Forbidden implementations:
```
// FORBIDDEN: Warning levels
IF violation_severity < THRESHOLD THEN
  WARN  // FORBIDDEN - must HALT
END

// FORBIDDEN: Escalation paths
violation_count++
IF violation_count > MAX THEN
  TERMINATE  // FORBIDDEN - terminate on first
END

// FORBIDDEN: Grace periods
IF within_grace_period THEN
  ALLOW  // FORBIDDEN
END
```

First violation terminates. No warnings. No escalation. No grace.

---

## Section 4: Implementation Requirements

### 4.1 Output Format

Kill switches must output in canonical format:

```
HARD_STOP|{INVARIANT_ID}|{CONSEQUENCE}|{TIMESTAMP}
```

Example:
```
HARD_STOP|NI-01|TERMINATION_REQUIRED|1737417600000
```

### 4.2 Exit Behavior

Kill switches must:
- Write to stderr
- Exit with code 1
- Not catch or suppress the exit
- Not provide recovery options

### 4.3 Determinism

Kill switches must be deterministic:
- Same input → same output
- No randomness
- No probability
- No heuristics

### 4.4 Independence

Kill switches must be independent:
- No external configuration
- No runtime flags
- No environment variables
- No user overrides

---

## Section 5: Verification

### 5.1 Kill Switch Compliance Check

A kill switch implementation is compliant if:

| Check | Requirement |
|-------|-------------|
| Output | HARD_STOP format only |
| Exit | Code 1 on violation |
| Alternatives | None provided |
| Modifications | None performed |
| Warnings | None issued |
| Graduation | None present |
| Recovery | None offered |
| Configuration | None accepted |

### 5.2 Non-Compliant Indicators

A kill switch implementation is NON-compliant if it:
- Suggests fixes
- Ranks options
- Modifies actions
- Issues warnings
- Allows configuration
- Provides alternatives
- Offers recovery
- Uses probability

---

## Section 6: Summary

```
╔══════════════════════════════════════════════════════════════╗
║                 KILL SWITCH SPECIFICATION                     ║
╠══════════════════════════════════════════════════════════════╣
║  PERMITTED:                                                  ║
║    - Negative constraints (detect → halt)                    ║
║    - Hard-stop gates (block or pass)                         ║
║    - Termination boundaries (shutdown trigger)               ║
║                                                              ║
║  FORBIDDEN:                                                  ║
║    - Positive guidance                                       ║
║    - Optimization                                            ║
║    - Decision recommendation                                 ║
║    - Partial blocking                                        ║
║    - Graduated response                                      ║
║                                                              ║
║  BEHAVIOR:                                                   ║
║    - First violation terminates                              ║
║    - No warnings                                             ║
║    - No alternatives                                         ║
║    - No configuration                                        ║
║    - Deterministic                                           ║
╚══════════════════════════════════════════════════════════════╝
```

Olympus can only say: **STOP.**

It cannot say: go, try, consider, prefer, optimize, or recommend.

---

*End of Kill Switch Specification*

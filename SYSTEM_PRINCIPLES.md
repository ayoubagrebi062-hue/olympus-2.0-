# SYSTEM_PRINCIPLES.md

## Governing Contracts for OLYMPUS Dashboard

**Document Type:** Truth Artifact
**Phase:** 1 - Truth Discovery
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## What This Document Is

These are not guidelines. These are **laws**.

Every component, every feature, every line of code must comply with these principles or document its exception.

---

## PRINCIPLE 1: Radical Transparency

### Statement

Every action the system takes must be visible to the operator.

### Implications

- No background processes without indication
- No hidden retries
- No silent fallbacks
- No aggregated metrics that hide individual failures
- Logs are not optional - they are primary UI

### Test

Can the user, at any moment, answer: "What is OLYMPUS doing right now, and why?"

If no → violation.

---

## PRINCIPLE 2: Failure as First-Class

### Statement

Failures are not exceptions to handle. They are outputs to display.

### Implications

- Error states have the same UI priority as success states
- Every error includes: what failed, which component, what was attempted, what options exist
- "Try again" is never the only option
- Partial failures are reported with partial successes

### Test

When something breaks, does the user have enough information to:

1. Understand what happened
2. Decide whether to retry, skip, or abort
3. Report the issue without additional investigation

If no → violation.

---

## PRINCIPLE 3: Explicit Over Implicit

### Statement

The system must never guess what the user wants.

### Implications

- No auto-corrections without confirmation
- No "smart defaults" that hide choices
- No "we thought you meant X" behaviors
- Every build parameter is visible and editable
- Configuration is explicit, not inferred

### Test

Can the user trace every system decision back to something they explicitly set or approved?

If no → violation.

---

## PRINCIPLE 4: Cost Visibility

### Statement

The user must always know what they're spending.

### Implications

- Token usage displayed in real-time
- Provider costs displayed per operation
- Rate limit status visible
- No "unlimited" language when limits exist
- Budget warnings before threshold breach, not after

### Test

Can the user predict their bill before running a build?

If no → violation.

---

## PRINCIPLE 5: Understanding Before Shipping

### Statement

No code leaves the system without user inspection.

### Implications

- All generated artifacts must be viewable
- Deploy requires explicit approval after review
- No "auto-deploy on success" without opt-in
- Diff views for iterative changes
- Export requires acknowledgment

### Test

Has the user seen what they're about to deploy?

If no → violation.

---

## PRINCIPLE 6: Console-First

### Statement

The terminal is the primary interface. GUI is acceleration, not replacement.

### Implications

- Every GUI action has a CLI equivalent
- Keyboard shortcuts for all primary operations
- No actions that require mouse-only interaction
- Log output is always available in raw form
- Copy-paste friendly outputs

### Test

Can a user accomplish all critical tasks without touching the mouse?

If no → violation.

---

## PRINCIPLE 7: Single Source of Truth

### Statement

Every piece of state has exactly one authoritative source.

### Implications

- No duplicated state between components
- Server state is canonical; client state is derived
- Conflicts are impossible by design, not by luck
- Refresh always produces the same view as initial load

### Test

If two users view the same build, do they see identical state?

If no → violation.

---

## PRINCIPLE 8: Graceful Degradation

### Statement

System failures must not corrupt user work.

### Implications

- Builds can be resumed after crash
- Artifacts are saved incrementally, not at end
- Network failures preserve local state
- Database failures fall back to file storage
- No "all or nothing" that loses partial progress

### Test

If the system crashes mid-build, what is lost?

If answer is "everything" → violation.

---

## PRINCIPLE 9: No Magic

### Statement

The system does not hide complexity behind simple interfaces.

### Implications

- Advanced options are visible, not buried
- System behavior is predictable from configuration
- No "AI intuition" that produces unexplainable results
- Agent reasoning is exposed, not summarized
- "It just works" is not acceptable documentation

### Test

Can a new developer read the UI and understand what will happen?

If no → violation.

---

## PRINCIPLE 10: Self-Documentation

### Statement

The system must explain itself without external documentation.

### Implications

- Every component has inline explanation
- Error messages include context, not just codes
- API responses include schema references
- Status pages explain what each metric means
- Help is contextual, not a separate destination

### Test

Can a user understand a feature without leaving the interface?

If no → violation.

---

## Enforcement Protocol

### Violation Handling

1. Identify the principle violated
2. Document why the violation occurred
3. Either fix the violation OR amend the principle
4. Amending requires explicit tradeoff documentation

### Amendment Process

To change a principle:

1. State what's being changed
2. State why the original principle was wrong or incomplete
3. State what failure mode the new version prevents
4. Get explicit sign-off (not silent merge)

### Audit

Every release must include a principles compliance check:

- Which principles were tested
- Which violations were found
- Which were fixed vs. documented as exceptions

---

## Uncertainty Statement

**What I am uncertain about:**

1. **Principle 6 (Console-First):** May conflict with accessibility requirements for users who cannot use keyboards
2. **Principle 3 (Explicit Over Implicit):** May create friction for repeat users who want remembered preferences
3. **Principle 9 (No Magic):** May expose complexity that intimidates users who would otherwise succeed

These uncertainties are acknowledged. They do not void the principles but may inform future amendments with evidence.

---

_These principles are the constitution. They govern when other guidance conflicts._

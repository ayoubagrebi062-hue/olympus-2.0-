# USAGE CONSTRAINTS

## Permitted and Forbidden Uses of Olympus Artifacts

```
DOCUMENT_CLASS: Usage Specification
ENFORCEMENT: Mandatory
SCOPE: All Olympus artifacts
```

---

## Section 1: Permitted Uses

### 1.1 Reference

Olympus artifacts may be referenced.

```
PERMITTED: REFERENCE
CONDITION: Citation only
EFFECT: None
```

Permitted reference includes:
- Academic citation
- Historical documentation
- Case study analysis
- Comparative research

### 1.2 Citation

Olympus artifacts may be cited.

```
PERMITTED: CITATION
FORMAT: Document reference with source
PURPOSE: Attribution
```

Citation requirements:
- Must include document name
- Must include artifact hash where applicable
- Must not imply active authority
- Must not imply endorsement

### 1.3 Verification

Olympus artifacts may be used for verification.

```
PERMITTED: VERIFICATION
SCOPE: Hash comparison, integrity checking
OUTPUT: Boolean (matches / does not match)
```

Permitted verification includes:
- Comparing document hashes
- Validating artifact integrity
- Confirming canonical state
- Detecting unauthorized modification

### 1.4 Negative Constraint Extraction

Olympus invariants may be extracted as negative constraints.

```
PERMITTED: NEGATIVE_CONSTRAINT_EXTRACTION
CONDITION: Hard-stop use only
INTEGRATION: Kill switches, gates, boundaries
```

This is the ONLY permitted integration pattern. See KILL_SWITCH_SPEC.md.

---

## Section 2: Forbidden Uses

### 2.1 Runtime Integration

Olympus may not be integrated into running systems.

```
FORBIDDEN: RUNTIME_INTEGRATION
VIOLATION_TYPE: EXECUTION_BOUNDARY_BREACH
CONSEQUENCE: Integration must be removed
```

Forbidden integration includes:
- Importing Olympus modules
- Calling Olympus functions
- Embedding Olympus logic
- Linking Olympus libraries

**Exception:** EXECUTION_LOCK.ts may be imported. It will throw.

### 2.2 Governance Delegation

Olympus may not receive governance delegation.

```
FORBIDDEN: GOVERNANCE_DELEGATION
VIOLATION_TYPE: AUTHORITY_ATTRIBUTION_ERROR
CONSEQUENCE: Delegation is void
```

Forbidden delegation includes:
- Delegating decisions to Olympus
- Treating Olympus as arbiter
- Using Olympus as tiebreaker
- Referencing Olympus for dispute resolution

### 2.3 Decision Outsourcing

Decisions may not be outsourced to Olympus.

```
FORBIDDEN: DECISION_OUTSOURCING
VIOLATION_TYPE: AGENCY_TRANSFER_ERROR
CONSEQUENCE: Decision is invalid
```

Forbidden outsourcing includes:
- "Olympus says X, therefore X"
- "Per Olympus policy..."
- "Olympus recommends..."
- "Olympus requires..."

Olympus says nothing. Olympus is dead.

### 2.4 Moral Authority Claims

Olympus may not be cited as moral authority.

```
FORBIDDEN: MORAL_AUTHORITY_CLAIMS
VIOLATION_TYPE: LEGITIMACY_FABRICATION
CONSEQUENCE: Claim is void
```

Forbidden claims include:
- "Olympus proves X is right"
- "Olympus establishes X as correct"
- "Per Olympus ethics..."
- "Olympus-compliant therefore ethical"

### 2.5 Positive Guidance Derivation

Olympus may not provide positive guidance.

```
FORBIDDEN: POSITIVE_GUIDANCE
VIOLATION_TYPE: POLARITY_INVERSION
CONSEQUENCE: Guidance is void
```

Olympus defines what systems must NOT do.
Olympus does not define what systems SHOULD do.

Forbidden derivations:
- "Olympus says to do X" (Olympus only says not to do things)
- "Following Olympus principles" (Olympus has no positive principles)
- "Olympus best practices" (Olympus only has prohibitions)

### 2.6 Authority Bootstrapping

Olympus may not be used to bootstrap authority.

```
FORBIDDEN: AUTHORITY_BOOTSTRAPPING
VIOLATION_TYPE: CIRCULAR_LEGITIMACY_ATTEMPT
CONSEQUENCE: Authority claim is void
```

Forbidden bootstrapping:
- "Our system is legitimate because it follows Olympus"
- "Olympus-derived authority"
- "Olympus-granted permissions"
- "Olympus certification"

---

## Section 3: Usage Decision Tree

```
QUESTION: Is the use permitted?

START
  │
  ├─ Does use involve execution?
  │   YES → FORBIDDEN
  │   NO  → Continue
  │
  ├─ Does use claim Olympus has authority?
  │   YES → FORBIDDEN
  │   NO  → Continue
  │
  ├─ Does use delegate decisions to Olympus?
  │   YES → FORBIDDEN
  │   NO  → Continue
  │
  ├─ Does use derive positive guidance?
  │   YES → FORBIDDEN
  │   NO  → Continue
  │
  ├─ Does use create runtime integration?
  │   YES → FORBIDDEN (unless EXECUTION_LOCK)
  │   NO  → Continue
  │
  ├─ Is use reference/citation/verification only?
  │   YES → PERMITTED
  │   NO  → Continue
  │
  ├─ Is use negative constraint extraction for hard-stop?
  │   YES → PERMITTED (per KILL_SWITCH_SPEC)
  │   NO  → FORBIDDEN
  │
END
```

---

## Section 4: Violation Handling

### 4.1 Detection

Violations may be detected through:
- Code analysis (import detection)
- Document analysis (authority claims)
- Runtime monitoring (execution attempts)
- Audit (governance patterns)

### 4.2 Response

| Violation Type | Response |
|----------------|----------|
| Runtime Integration | Remove integration |
| Governance Delegation | Void delegation |
| Decision Outsourcing | Invalidate decision |
| Moral Authority Claim | Retract claim |
| Positive Guidance | Discard guidance |
| Authority Bootstrapping | Reject authority |

### 4.3 No Exceptions

```
EXCEPTIONS: NONE
WAIVERS: NONE
TEMPORARY_PERMISSIONS: NONE
CONDITIONAL_ALLOWANCES: NONE
```

These constraints are absolute.

---

## Section 5: Constraint Immutability

### 5.1 These Constraints Cannot Be Changed

```
AMENDMENT: FORBIDDEN
RELAXATION: FORBIDDEN
EXPANSION: FORBIDDEN (of permitted uses)
CONTRACTION: FORBIDDEN (of forbidden uses)
```

### 5.2 Future Interpretation

Future readers must interpret these constraints as written. No "spirit of the law" interpretation is permitted. No "reasonable person" standard applies. The constraints mean exactly what they say.

---

## Summary Table

| Use Category | Status | Notes |
|--------------|--------|-------|
| Reference | PERMITTED | Citation only |
| Citation | PERMITTED | With attribution |
| Verification | PERMITTED | Hash/integrity only |
| Negative Constraints | PERMITTED | Hard-stop only |
| Runtime Integration | FORBIDDEN | No exceptions |
| Governance Delegation | FORBIDDEN | Delegation void |
| Decision Outsourcing | FORBIDDEN | Decision invalid |
| Moral Authority | FORBIDDEN | Claim void |
| Positive Guidance | FORBIDDEN | Guidance void |
| Authority Bootstrap | FORBIDDEN | Authority void |

---

*End of Usage Constraints*

# OLYMPUS Research Charter

**Track:** EXPERIMENTAL
**Authority:** NON-AUTHORITATIVE
**Can Ship:** NO

---

## Declaration

This directory contains experimental OLYMPUS research.

**CRITICAL:**
- Code in this directory is NON-AUTHORITATIVE
- Nothing here can ship software
- Nothing here affects canonical builds
- Nothing here claims OLYMPUS compliance

---

## What Research Track IS

### 1. A Sandbox for Experimentation
- Try new scoring algorithms
- Explore ML-based classification
- Test heuristic approaches
- Prototype alternative architectures

### 2. A Place to Fail Safely
- Experiments may violate determinism
- Experiments may fail hostile tests
- Experiments may produce inconsistent results
- Failure is expected and acceptable

### 3. A Pathway to Innovation
- Successful experiments can graduate
- Graduation requires formal proof
- Graduated code becomes canonical
- See `GRADUATION_PROTOCOL.md`

---

## What Research Track IS NOT

### 1. Not an Alternative to Canonical
Research code cannot:
- Be used for production builds
- Claim OLYMPUS 2.0 compliance
- Override canonical decisions
- Ship software by any mechanism

### 2. Not a Shortcut
Research code cannot:
- Skip hostile testing because "it's experimental"
- Ignore determinism because "we're prototyping"
- Merge into canonical without graduation
- Claim equivalence with canonical

### 3. Not Authoritative
Research code cannot:
- Make ship/block decisions for real builds
- Affect fate assignments in canonical
- Override canonical scoring
- Be treated as "good enough"

---

## Permitted Activities

### Exploration
- New intent classification methods
- Alternative scoring formulas
- ML/AI integration experiments
- Heuristic optimization trials
- Performance trade-off studies

### Prototyping
- Proof-of-concept implementations
- Architecture alternatives
- Integration experiments
- Tool evaluations

### Measurement
- Comparison with canonical outputs
- Accuracy analysis
- Performance benchmarking
- Hostile resistance testing

---

## Required Practices

### 1. Isolation
Research code must:
- Live only in `/research`
- Not import canonical modules
- Not export to canonical code
- Maintain clear separation

### 2. Documentation
Research code must:
- State its hypothesis
- Document its approach
- Record its results
- Note its limitations

### 3. Honesty
Research code must:
- Never claim canonical status
- Acknowledge its experimental nature
- Report failures accurately
- Not hide hostile test results

---

## Version Identity

All research builds must include:

```json
{
  "olympusVersion": "research",
  "governanceAuthority": "EXPERIMENTAL",
  "canShip": false,
  "hostileTestsRequired": true,
  "comparisonWithCanonical": "required"
}
```

---

## Graduation Path

Research code may graduate to canonical by:
1. Passing all graduation requirements
2. Following the graduation protocol
3. Receiving explicit approval
4. Being merged by canonical maintainers

See `GRADUATION_PROTOCOL.md` for details.

Until graduation:
- Research code remains experimental
- Research code cannot ship
- Research code is not OLYMPUS

---

## Acceptance

By working in `/research`, you accept that:
- Your code is experimental
- Your code cannot ship software
- Your code may be discarded
- Success requires graduation

---

*OLYMPUS Research - Where experiments live and prove themselves.*

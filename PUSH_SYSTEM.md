# PUSH SYSTEM - Level Up Any Code Review

**Usage:** Just say "Run Push #3" or "Push 1, 4, 7"

---

## THE 10 PUSH PROMPTS

### Push #1: STRIPE ENGINEER

```
"That's V1. Give me V2 that would impress a Stripe engineer."
```

**Focus:** Production readiness, edge cases, error handling, observability

### Push #2: SCALE BREAKER

```
"What would break this at 10,000 users? Fix it."
```

**Focus:** Performance, memory, concurrency, caching, rate limiting

### Push #3: BOLD MODE

```
"You played it safe. Now show me the BOLD version."
```

**Focus:** Innovation, cutting-edge patterns, impressive features

### Push #4: HOSTILE REVIEWER

```
"Attack this like a hostile code reviewer. Then fix what you find."
```

**Focus:** Code smells, edge cases, security, maintainability

### Push #5: APPLE STANDARD

```
"Pretend Apple hired you. Is THIS what you'd ship? Improve it."
```

**Focus:** Polish, UX, attention to detail, craft

### Push #6: HARD MODE

```
"What did you skip because it was 'too hard'? Add it now."
```

**Focus:** Complex features avoided, technical debt, incomplete implementations

### Push #7: FIRST FAILURE

```
"If this fails, what's the FIRST thing that breaks? Fix it."
```

**Focus:** Critical path, single points of failure, resilience

### Push #8: PRODUCTION SCORE

```
"Rate this /10 for production readiness. Then make it a 9."
```

**Focus:** Comprehensive audit, prioritized improvements

### Push #9: MISSING FEATURES

```
"What's missing that you KNOW should be there?"
```

**Focus:** Best practices, industry standards, completeness

### Push #10: FUTURE PROOF

```
"Make Future You proud. What needs to change?"
```

**Focus:** Maintainability, documentation, technical debt

---

## COMBO ATTACKS

### The Full Audit (Push #4 → #8 → #9)

```
"Run Push 4, 8, 9"
```

Complete code review with hostile analysis + scoring + missing features

### The Scale-Up (Push #2 → #7 → #1)

```
"Run Push 2, 7, 1"
```

Performance audit: what breaks at scale + first failure point + production grade

### The Polish Pass (Push #5 → #3 → #10)

```
"Run Push 5, 3, 10"
```

Quality pass: Apple standard + bold innovation + future-proofing

### The Hard Truth (Push #6 → #4 → #8)

```
"Run Push 6, 4, 8"
```

Reality check: skipped hard parts + hostile review + score to 9

---

## SPECIALIZED PUSHES

### Performance Push

```
"Push 2 with focus on: memory, latency, throughput"
```

### Security Push

```
"Push 4 with focus on: auth, injection, OWASP Top 10"
```

### UX Push

```
"Push 5 with focus on: accessibility, loading states, error messages"
```

### API Push

```
"Push 1 with focus on: rate limiting, versioning, documentation"
```

---

## VALIDATION V2 QUICK REFERENCE

After any Push, run validation:

```bash
# Full V2 validation with unified report
cd "C:\Users\SBS\Desktop\New folder (4)\vito"
npx tsx src/lib/agents/validation/__tests__/stress-test-v2.ts

# Quick check (100 validations in 40ms)
quickValidate(code) → { valid, score, issues }

# Full check with fix plan
validateCodeV2(code, { userPrompt }) → { grade, score, fixPlan }
```

---

## RESPONSE FORMAT

When you run a Push, I will:

1. **Analyze** - Apply the Push lens to your code
2. **List Issues** - Prioritized by severity (critical → high → medium → low)
3. **Fix** - Implement the changes
4. **Verify** - Run V2 validation
5. **Report** - Show before/after scores

---

## EXAMPLES

**User:** "Run Push #2"

**Claude:**

```
## Scale Breaker Analysis (10,000 users)

### What Breaks First:
1. **Regex compilation** - Creates new RegExp on every call = GC pressure
2. **No caching** - Same validation runs repeatedly
3. **Sequential execution** - Blocks event loop
4. **Memory growth** - Analysis objects not pooled

### Fixes Applied:
1. ✅ Pre-compiled singleton patterns
2. ✅ LRU cache with 60s TTL
3. ✅ Parallel validation with Promise.all
4. ✅ Object pooling for analysis results

### Verification:
- Before: 15ms/validation, 0 cache hits
- After: 0.4ms/validation, 42x speedup with cache
```

---

_Created: January 2026_
_For OLYMPUS 2.0 Validation System V2_

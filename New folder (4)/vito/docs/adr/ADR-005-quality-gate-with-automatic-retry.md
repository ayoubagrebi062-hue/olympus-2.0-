# ADR-005: Quality Gate with Automatic Retry

## Status

**Accepted**

Date: 2026-01-12

## Context

AI-generated code quality varies significantly. Without quality control:
- Syntax errors may ship to users
- Security vulnerabilities go undetected
- Code may not match user requirements
- Performance issues accumulate

Need systematic quality assurance without manual review for every build.

## Decision

Implement a multi-layer quality gate:

1. **Syntax Validation** - Parse code, check for errors
2. **Import Validation** - Verify all imports are real packages
3. **Security Scan** - Check for common vulnerabilities
4. **Relevance Check** - Ensure output matches request
5. **Quality Score** - Overall code quality metrics

If score < threshold:
- First retry: Same agent with feedback
- Second retry: Escalate to Oracle agent
- Third failure: Return partial result with warnings

## Consequences

### Positive

- Consistent output quality
- Automatic error recovery
- No hallucinated packages
- Security issues caught early

### Negative

- Increased build time
- Additional token usage for retries
- May reject valid but unusual code
- Threshold tuning required

## Alternatives Considered

### Accept All Output

Unacceptable quality variance. Users would encounter broken code frequently.

### Human Review Queue

Does not scale. Would create bottleneck and defeat automation purpose.

### Strict Rejection

Too many false positives. Would frustrate users with rejected builds.

---

*This ADR was generated as part of OLYMPUS documentation.*

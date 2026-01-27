# Vision System - Architecture Decision Records

> **Purpose:** Document WHY decisions were made, not just WHAT was built.
> **Rule:** Update this when changing core patterns. Future You will thank you.

---

## ADR-001: Result<T, E> Over Exceptions

**Date:** January 2026
**Status:** Accepted

### Context

JavaScript/TypeScript uses exceptions for error handling. This creates problems:

- Callers can forget to catch errors
- No compile-time enforcement
- Stack traces are expensive
- Hard to distinguish recoverable vs fatal errors

### Decision

Use Rust-inspired `Result<T, E>` discriminated union:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

### Consequences

- ✅ Caller MUST handle both cases (TypeScript enforces)
- ✅ Errors carry structured context (not just strings)
- ✅ Easy to add retry logic, logging, metrics
- ⚠️ More verbose than try/catch
- ⚠️ Team needs to learn the pattern

### When to Revisit

- If TypeScript adds native Result type
- If team finds pattern too verbose (consider wrapper functions)

---

## ADR-002: Circuit Breaker Per Provider

**Date:** January 2026
**Status:** Accepted

### Context

AI providers have different reliability characteristics:

- Anthropic: Stable but has rate limits
- OpenAI: Sometimes has outages
- Each provider fails independently

### Decision

Separate circuit breaker per provider, not one global circuit.

**Thresholds chosen:**
| Setting | Value | Reasoning |
|---------|-------|-----------|
| failureThreshold | 5 | Enough to detect real outage, not one-off error |
| successThreshold | 2 | Confirm recovery before full traffic |
| resetTimeoutMs (code) | 30,000 | Code generation is fast, can retry sooner |
| resetTimeoutMs (image) | 60,000 | Image APIs are slower, need more recovery time |

### Consequences

- ✅ One provider down doesn't kill the whole system
- ✅ Can tune thresholds per provider's characteristics
- ⚠️ More circuit breakers to monitor
- ⚠️ Need to update when adding providers

### When to Revisit

- If you add providers with very different characteristics (local LLM, etc.)
- If production data shows different optimal thresholds
- After 1 month of production metrics

---

## ADR-003: Request Deduplication Strategy

**Date:** January 2026
**Status:** Accepted

### Context

Problem scenarios:

1. User double-clicks "Generate" button
2. React re-render triggers duplicate API call
3. Multiple components request same data

Each costs money and wastes rate limit budget.

### Decision

Deduplicate identical concurrent requests using content-addressed keys.

**Key generation:**

```typescript
{
  p: prompt.trim().toLowerCase().substring(0, 500),  // Normalized prompt
  t: pageType || null,
  f: features?.slice().sort() || null,  // Sorted for consistency
  s: style ? JSON.stringify(style) : null,
}
```

**Max age:** 5 minutes (requests older than this are not deduplicated)

### Consequences

- ✅ Eliminates duplicate API calls (30%+ cost savings typical)
- ✅ First request result shared with all callers
- ⚠️ If first request fails, all callers get failure
- ⚠️ Key collision possible if prompts differ only after 500 chars

### When to Revisit

- If you need per-user deduplication (add userId to key)
- If 500 char limit causes false positives
- If you need negative caching (cache failures too)

---

## ADR-004: Provider Priority Order

**Date:** January 2026
**Status:** Accepted

### Context

Need to choose which provider to try first when multiple are available.

### Decision

**Priority order:** Anthropic → OpenAI

**Reasoning:**

1. Anthropic (Claude) produces higher quality code for UI generation
2. Anthropic has better instruction following for design tasks
3. OpenAI is reliable fallback with good capacity

### Consequences

- ✅ Best quality by default
- ✅ Automatic fallback if Anthropic is down
- ⚠️ Anthropic outage affects all users until circuit opens
- ⚠️ OpenAI might be better for some specific tasks

### When to Revisit

- When adding new providers (Gemini, local LLMs)
- If quality benchmarks show different results
- If pricing changes significantly

---

## ADR-005: Error Code Design

**Date:** January 2026
**Status:** Accepted

### Context

Need stable error codes for:

- Client-side error handling
- Metrics and alerting
- Retry decisions
- User-facing messages

### Decision

Use string enum with categories:

| Category            | Codes                                            | Retry?               |
| ------------------- | ------------------------------------------------ | -------------------- |
| Client errors (4xx) | INVALID_REQUEST, INVALID_PROMPT, MISSING_API_KEY | ❌ No                |
| Server errors (5xx) | GENERATION_FAILED, PROVIDER_ERROR                | ✅ Yes               |
| Resource errors     | RATE_LIMITED, QUOTA_EXCEEDED                     | ✅ Yes (with delay)  |
| Circuit errors      | CIRCUIT_OPEN                                     | ✅ Yes (after reset) |

### Consequences

- ✅ Programmatic error handling possible
- ✅ Clear retry semantics
- ✅ Can build metrics dashboards
- ⚠️ Adding new codes requires updating switch statements
- ⚠️ Must keep codes stable (breaking change if renamed)

### When to Revisit

- When you need more granular error types
- When integrating with external error tracking (Sentry, etc.)

---

## ADR-006: Timeout Values

**Date:** January 2026
**Status:** Accepted

### Context

AI generation can be slow. Need to balance:

- User patience (don't wait forever)
- Generation quality (complex prompts need time)
- Cost (timed-out requests still cost money)

### Decision

| Timeout             | Value           | Reasoning                |
| ------------------- | --------------- | ------------------------ |
| DEFAULT_TIMEOUT_MS  | 120,000 (2 min) | Overall request deadline |
| API_CALL_TIMEOUT_MS | 60,000 (1 min)  | Single provider call     |
| RATE_LIMIT_RETRY_MS | 5,000 (5 sec)   | Wait after rate limit    |

### Consequences

- ✅ Users get response or error within 2 minutes
- ✅ Single provider can't hang forever
- ⚠️ Complex generations might timeout
- ⚠️ Values are guesses, need production validation

### When to Revisit

- After collecting P95 latency data in production
- If users complain about timeouts
- If providers change their response times

---

## Future Considerations

### Providers to Consider Adding

1. **Google Gemini** - Good for multimodal
2. **Local LLMs** - Privacy, cost savings
3. **Custom fine-tuned models** - Domain-specific quality

### Patterns to Consider

1. **Bulkhead pattern** - Isolate resources per operation type
2. **Adaptive timeouts** - Adjust based on historical latency
3. **Request hedging** - Start with preferred, add backup after delay

### Known Limitations

1. No persistent caching (memory only)
2. No distributed circuit breaker state (single instance)
3. No A/B testing framework for providers
4. No cost tracking per request

---

## Changelog

| Date       | Change               | Author |
| ---------- | -------------------- | ------ |
| 2026-01-23 | Initial ADR document | Claude |

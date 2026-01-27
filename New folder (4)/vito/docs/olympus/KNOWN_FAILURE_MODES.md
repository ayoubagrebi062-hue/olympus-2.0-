# OLYMPUS KNOWN FAILURE MODES

This document catalogs known failure modes, their causes, and mitigations.
OLYMPUS exposes its own failures. This is intentional.

---

## KFM-01: BUILD TOKEN LIMIT EXCEEDED

**Trigger**: `build.tokenUsage >= LIMITS.MAX_TOKENS_PER_BUILD`

**Behavior**:
- Build state → `failed`
- All running agents halt
- Error recorded: `TOKEN_LIMIT_EXCEEDED`
- No graceful degradation

**Mitigation**:
- Monitor token usage in Header
- Check burn rate trend
- Abort early if approaching limit

**User Action**:
- `:abort` to terminate
- Start new build with smaller scope

---

## KFM-02: BUILD DURATION LIMIT EXCEEDED

**Trigger**: `Date.now() - build.startedAt >= LIMITS.MAX_BUILD_DURATION_MS`

**Behavior**:
- Build state → `failed`
- Error recorded: `DURATION_LIMIT_EXCEEDED`
- All artifacts marked incomplete

**Mitigation**:
- Monitor build duration in Header
- Check phase completion times

**User Action**:
- Analyze which phase is slow
- Retry with optimizations

---

## KFM-03: GATE BLOCKED

**Trigger**: Gate state is `blocked` when phase tries to proceed

**Behavior**:
- `HARD_STOP('GATE_BLOCKED: {gateId}')`
- Build halts completely
- Requires human intervention

**Mitigation**:
- Monitor gate indicators in Pipeline Bar
- Review gate reason in Inspector

**User Action**:
- `:g` to inspect gates
- `:approve {gateId}` with reason
- Or `:reject {gateId}` with reason

---

## KFM-04: GATE FAILED

**Trigger**: Gate state is `failed` (e.g., validation failed)

**Behavior**:
- `HARD_STOP('GATE_FAILED: {gateId}')`
- Build cannot proceed
- Requires retry or abort

**Mitigation**:
- Monitor gate state changes
- Check error logs for cause

**User Action**:
- `:e` to inspect errors
- `:retry {phaseId}` if recoverable
- `:abort` if unrecoverable

---

## KFM-05: TRUST DEGRADATION

**Trigger**: Trust score drops by >= 10 points

**Behavior**:
- Warning logged: `TRUST_DEGRADATION`
- TrustEvent recorded
- Trust Gate may trigger

**Causes**:
- Agent failures
- Quality check failures
- External validation failures
- Retry loops

**Mitigation**:
- Monitor trust score in Header
- Check trust events in Inspector

**User Action**:
- `:t` to inspect trust
- Identify degradation source
- Address root cause

---

## KFM-06: AGENT FAILURE LOOP

**Trigger**: Agent fails repeatedly (>3 times on same task)

**Behavior**:
- Agent state → `failed`
- Phase may block
- Build cost increases

**Causes**:
- Bad input data
- Invalid instructions
- Resource constraints
- External dependencies

**Mitigation**:
- Monitor agent failure counts
- Check agent output stream

**User Action**:
- `:a {agentId}` to inspect
- `:filter agent:{agentId}` for logs
- May require `:skip {phaseId}` (critical risk)

---

## KFM-07: ARTIFACT GENERATION FAILURE

**Trigger**: Artifact state stuck in `generating` or transitions to `failed`

**Behavior**:
- Artifact incomplete
- Phase may not complete
- Downstream phases blocked

**Causes**:
- Agent failure
- Validation failure
- Hash mismatch

**Mitigation**:
- Monitor artifact states
- Check phase completion

**User Action**:
- `:f {artifactId}` to inspect
- `:retry {phaseId}` if needed

---

## KFM-08: HASH CHAIN BREAK

**Trigger**: Decision hash doesn't match computed hash

**Behavior**:
- Integrity violation detected
- Trust score heavily impacted
- Audit trail compromised

**Causes**:
- State corruption
- External tampering
- Software bug

**Mitigation**:
- Never modify decision records
- Verify chain on load

**User Action**:
- `:w` to inspect decision chain
- Report integrity violation
- May require build restart

---

## KFM-09: CONCURRENT BUILD LIMIT

**Trigger**: Attempt to start build when 5 already running

**Behavior**:
- New build rejected
- Error: `CONCURRENT_BUILD_LIMIT`

**Mitigation**:
- Monitor active builds
- Complete or abort running builds

**User Action**:
- Wait for build slot
- Or abort lowest priority build

---

## KFM-10: WEBSOCKET DISCONNECTION

**Trigger**: Real-time connection lost

**Behavior**:
- `isConnected` → `false`
- Header indicator turns red
- Output stream may stall

**Causes**:
- Network issues
- Server restart
- Client timeout

**Mitigation**:
- Monitor connection indicator
- Automatic reconnection attempts

**User Action**:
- Wait for reconnection
- Refresh if persistent

---

## KFM-11: INSUFFICIENT APPROVAL REASON

**Trigger**: Gate approval with reason < 10 characters

**Behavior**:
- `HARD_STOP('APPROVAL_REQUIRES_REASON')`
- Approval rejected

**Mitigation**:
- Provide meaningful reasons
- Explain decision context

**User Action**:
- Retry with proper reason

---

## KFM-12: SKIP WITHOUT OVERRIDE

**Trigger**: `:skip {phaseId}` without explicit confirmation

**Behavior**:
- Command blocked (critical risk)
- Confirmation dialog shown

**Mitigation**:
- Understand skip consequences
- Document skip reason

**User Action**:
- Confirm with understanding
- Or cancel and address phase

---

## KFM-13: OUTPUT STREAM OVERFLOW

**Trigger**: Output entries exceed 10,000

**Behavior**:
- Oldest entries trimmed
- No data loss (just not in memory)

**Causes**:
- Verbose agents
- Long-running builds
- Debug output

**Mitigation**:
- Use filters to focus
- Reduce agent verbosity

**User Action**:
- `:filter {criteria}` to focus
- Check artifact logs for full history

---

## KFM-14: INSPECTOR TARGET NOT FOUND

**Trigger**: `targetId` doesn't match any entity

**Behavior**:
- Inspector shows empty state
- No error (graceful)

**Causes**:
- Stale reference
- Entity removed
- Typo in command

**User Action**:
- `:p` to see all phases
- `:a` to see all agents
- `:f` to see all artifacts

---

## KFM-15: COMMAND VALIDATION FAILURE

**Trigger**: Unknown command or missing required target

**Behavior**:
- Command rejected
- Error shown in command bar

**Causes**:
- Typo
- Missing target for action command
- Unknown command

**User Action**:
- TAB for command help
- Fix command syntax

---

## FAILURE PHILOSOPHY

OLYMPUS fails explicitly because:

1. **Silent failure is worse than loud failure**
2. **Recovery requires understanding the failure**
3. **Builders deserve to know what went wrong**
4. **Graceful degradation hides problems**
5. **Accountability requires visibility**

When OLYMPUS fails, it tells you:
- What failed
- Why it failed
- What state the system is in
- What you can do about it

There is no guessing. There is no hidden state.

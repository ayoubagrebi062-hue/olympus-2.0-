# CONDUCTOR Migration Verification Guide

## After Running the Combined Migration

Run these SQL queries in Supabase SQL Editor to verify everything was created correctly:

### 1. Verify All Tables Created (Should return 14 rows)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs',
    'build_checkpoints',
    'build_resume_history',
    'agent_prompts',
    'prompt_history',
    'prompt_experiments',
    'prompt_performance',
    'build_plans',
    'build_state_transitions',
    'build_phase_executions',
    'build_agent_executions',
    'build_plan_phases',
    'build_plan_agents',
    'build_state_machines'
  )
ORDER BY table_name;
```

**Expected:** 14 rows returned

---

### 2. Verify Functions Created (Should return 22 functions)

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_agent_prompt',
    'upsert_agent_prompt',
    'get_prompt_history',
    'record_prompt_performance',
    'get_best_prompt',
    'create_prompt_experiment',
    'get_experiment_results',
    'conclude_experiment',
    'transition_build_state',
    'record_phase_execution',
    'record_agent_execution',
    'get_build_status',
    'get_phase_status',
    'get_agent_dependencies',
    'update_agent_with_lock',
    'get_next_executable_agent',
    'check_phase_completion',
    'increment_retry_count',
    'mark_agent_failed',
    'get_failed_agents',
    'transition_state_atomic',
    'get_state_history'
  )
ORDER BY routine_name;
```

**Expected:** 22 rows returned

---

### 3. Verify RLS Policies (Should return 22 policies)

```sql
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** 22 rows returned

---

### 4. Test Optimistic Locking Function

```sql
-- Create a test build plan
INSERT INTO build_plans (id, user_id, project_id, status, user_prompt, plan_json)
VALUES (
  'test-plan-001'::uuid,
  'test-user'::uuid,
  'test-project'::uuid,
  'pending',
  'Build a test app',
  '{}'::jsonb
);

-- Create a test phase
INSERT INTO build_plan_phases (plan_id, phase_id, phase_order, agents)
VALUES (
  'test-plan-001'::uuid,
  'discovery',
  1,
  '["oracle", "empathy"]'::jsonb
);

-- Create a test agent
INSERT INTO build_plan_agents (
  plan_id,
  agent_id,
  phase_id,
  agent_order,
  status,
  is_required,
  version
)
VALUES (
  'test-plan-001'::uuid,
  'oracle',
  'discovery',
  1,
  'pending',
  true,
  1
);

-- Test optimistic lock (should succeed - version 1)
SELECT * FROM update_agent_with_lock(
  'test-plan-001'::uuid,
  'oracle',
  'running',
  1,  -- expected version
  NULL,
  NULL
);

-- Test optimistic lock (should fail - wrong version)
SELECT * FROM update_agent_with_lock(
  'test-plan-001'::uuid,
  'oracle',
  'completed',
  1,  -- expected version (but actual is now 2)
  '{"result": "success"}'::jsonb,
  NULL
);

-- Clean up test data
DELETE FROM build_plan_agents WHERE plan_id = 'test-plan-001'::uuid;
DELETE FROM build_plan_phases WHERE plan_id = 'test-plan-001'::uuid;
DELETE FROM build_plans WHERE id = 'test-plan-001'::uuid;
```

**Expected Results:**

- First lock: success=true, new_version=2
- Second lock: success=false, message about version mismatch
- Cleanup: 3 DELETE statements succeed

---

### 5. Test State Machine Function

```sql
-- Create a test state machine
INSERT INTO build_state_machines (
  id,
  build_id,
  current_state,
  current_phase,
  current_agent,
  context,
  version
)
VALUES (
  'test-state-001'::uuid,
  'test-build-001'::uuid,
  'pending',
  NULL,
  NULL,
  '{}'::jsonb,
  1
);

-- Test state transition (pending -> planning)
SELECT * FROM transition_state_atomic(
  'test-state-001'::uuid,
  1,  -- expected version
  'planning',
  NULL,
  NULL,
  'start_planning'
);

-- Test invalid transition (wrong version)
SELECT * FROM transition_state_atomic(
  'test-state-001'::uuid,
  1,  -- expected version (but actual is now 2)
  'running',
  NULL,
  NULL,
  'plan_complete'
);

-- Clean up
DELETE FROM build_state_machines WHERE id = 'test-state-001'::uuid;
```

**Expected Results:**

- First transition: success=true, new_version=2
- Second transition: success=false, message about version mismatch
- Cleanup: 1 DELETE statement succeeds

---

## ✅ Success Criteria

All verifications should pass:

- ✅ 14 tables created
- ✅ 22 functions created
- ✅ 22 RLS policies enabled
- ✅ Optimistic locking works correctly (prevents concurrent updates)
- ✅ State machine transitions work atomically

---

## 🚨 If Verification Fails

**Symptom:** Missing tables/functions
**Fix:** Re-run the combined migration SQL

**Symptom:** Optimistic lock test fails with "function not found"
**Fix:** Check that all 22 functions were created (see query #2)

**Symptom:** RLS policies missing
**Fix:** Ensure you're running queries as the database owner/admin

---

## 📊 Current System Status

**Test Results:** 1201 passing / 1287 total (93.3%)
**Remaining Failures:** 44 tests (mostly mutation/chaos testing - lower priority)

**Migration Status:**

- ✅ Combined migration file created
- ⏳ Awaiting execution in Supabase
- ⏳ Awaiting verification queries

---

**Next Steps After Verification:**

1. Run conversion agent test: `npm run test:conversion`
2. Build MVP UI (PATH B from earlier discussion)
3. Address remaining 44 test failures if needed

-- ============================================================================
-- 10X SAGA ORCHESTRATOR - DISTRIBUTED TRANSACTIONS
-- ============================================================================
-- "Complex operations require sophisticated coordination."
-- ============================================================================

-- Saga Definitions
CREATE TABLE IF NOT EXISTS saga_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    timeout_ms INTEGER NOT NULL DEFAULT 3600000, -- 1 hour default
    retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoffMs": 1000}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saga Instances
CREATE TABLE IF NOT EXISTS saga_instances (
    id TEXT PRIMARY KEY,
    saga_id TEXT NOT NULL REFERENCES saga_definitions(id),
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'compensating', 'completed', 'failed', 'cancelled'
    )),
    current_step INTEGER NOT NULL DEFAULT 0,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB NOT NULL DEFAULT '{}',
    step_results JSONB NOT NULL DEFAULT '[]',
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saga_instances_build ON saga_instances(build_id);
CREATE INDEX IF NOT EXISTS idx_saga_instances_status ON saga_instances(status);
CREATE INDEX IF NOT EXISTS idx_saga_instances_running ON saga_instances(status, created_at) WHERE status IN ('running', 'compensating');

-- Distributed Locks
CREATE TABLE IF NOT EXISTS distributed_locks (
    resource_id TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_locks_expires ON distributed_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_locks_holder ON distributed_locks(holder_id);

-- Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Saga Step Executions (detailed history)
CREATE TABLE IF NOT EXISTS saga_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_instance_id TEXT NOT NULL REFERENCES saga_instances(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'compensated', 'skipped')),
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    attempt INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_executions_saga ON saga_step_executions(saga_instance_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON saga_step_executions(saga_instance_id, status);

-- ============================================================================
-- FUNCTIONS FOR SAGA ORCHESTRATION
-- ============================================================================

-- Acquire distributed lock with automatic expiry
CREATE OR REPLACE FUNCTION acquire_saga_lock(
    p_resource_id TEXT,
    p_holder_id TEXT,
    p_timeout_ms INTEGER DEFAULT 30000
) RETURNS BOOLEAN AS $$
DECLARE
    v_acquired BOOLEAN := FALSE;
BEGIN
    -- Clean up expired locks first
    DELETE FROM distributed_locks WHERE expires_at < NOW();

    -- Try to acquire lock
    INSERT INTO distributed_locks (resource_id, holder_id, expires_at)
    VALUES (p_resource_id, p_holder_id, NOW() + (p_timeout_ms || ' milliseconds')::INTERVAL)
    ON CONFLICT (resource_id) DO NOTHING;

    -- Check if we got the lock
    SELECT holder_id = p_holder_id
    INTO v_acquired
    FROM distributed_locks
    WHERE resource_id = p_resource_id;

    RETURN COALESCE(v_acquired, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Release distributed lock
CREATE OR REPLACE FUNCTION release_saga_lock(
    p_resource_id TEXT,
    p_holder_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM distributed_locks
    WHERE resource_id = p_resource_id AND holder_id = p_holder_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Renew distributed lock
CREATE OR REPLACE FUNCTION renew_saga_lock(
    p_resource_id TEXT,
    p_holder_id TEXT,
    p_timeout_ms INTEGER DEFAULT 30000
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE distributed_locks
    SET expires_at = NOW() + (p_timeout_ms || ' milliseconds')::INTERVAL
    WHERE resource_id = p_resource_id AND holder_id = p_holder_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Check and store idempotent result
CREATE OR REPLACE FUNCTION check_idempotency(
    p_key TEXT,
    p_ttl_hours INTEGER DEFAULT 24
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Clean up expired keys
    DELETE FROM idempotency_keys WHERE expires_at < NOW();

    -- Check for existing result
    SELECT result INTO v_result
    FROM idempotency_keys
    WHERE key = p_key AND expires_at > NOW();

    RETURN v_result; -- Returns NULL if not found
END;
$$ LANGUAGE plpgsql;

-- Store idempotent result
CREATE OR REPLACE FUNCTION store_idempotent_result(
    p_key TEXT,
    p_result JSONB,
    p_ttl_hours INTEGER DEFAULT 24
) RETURNS VOID AS $$
BEGIN
    INSERT INTO idempotency_keys (key, result, expires_at)
    VALUES (p_key, p_result, NOW() + (p_ttl_hours || ' hours')::INTERVAL)
    ON CONFLICT (key) DO UPDATE SET
        result = EXCLUDED.result,
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Start saga instance
CREATE OR REPLACE FUNCTION start_saga_instance(
    p_saga_id TEXT,
    p_build_id TEXT,
    p_inputs JSONB DEFAULT '{}'
) RETURNS saga_instances AS $$
DECLARE
    v_instance saga_instances;
    v_instance_id TEXT;
BEGIN
    -- Generate instance ID
    v_instance_id := 'saga-' || p_saga_id || '-' || p_build_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    INSERT INTO saga_instances (id, saga_id, build_id, status, inputs, started_at)
    VALUES (v_instance_id, p_saga_id, p_build_id, 'running', p_inputs, NOW())
    RETURNING * INTO v_instance;

    -- Record first step execution
    INSERT INTO saga_step_executions (saga_instance_id, step_index, step_type, status, started_at)
    VALUES (v_instance_id, 0, 'init', 'running', NOW());

    RETURN v_instance;
END;
$$ LANGUAGE plpgsql;

-- Advance saga to next step
CREATE OR REPLACE FUNCTION advance_saga_step(
    p_instance_id TEXT,
    p_step_result JSONB,
    p_next_step INTEGER
) RETURNS saga_instances AS $$
DECLARE
    v_instance saga_instances;
BEGIN
    -- Update current step execution
    UPDATE saga_step_executions
    SET status = 'completed',
        output = p_step_result,
        completed_at = NOW()
    WHERE saga_instance_id = p_instance_id
      AND status = 'running';

    -- Update saga instance
    UPDATE saga_instances
    SET current_step = p_next_step,
        step_results = step_results || jsonb_build_array(p_step_result),
        updated_at = NOW()
    WHERE id = p_instance_id
    RETURNING * INTO v_instance;

    -- Record next step execution
    IF v_instance.status = 'running' THEN
        INSERT INTO saga_step_executions (saga_instance_id, step_index, step_type, status, started_at)
        VALUES (p_instance_id, p_next_step, 'step-' || p_next_step, 'running', NOW());
    END IF;

    RETURN v_instance;
END;
$$ LANGUAGE plpgsql;

-- Complete saga instance
CREATE OR REPLACE FUNCTION complete_saga_instance(
    p_instance_id TEXT,
    p_outputs JSONB DEFAULT '{}'
) RETURNS saga_instances AS $$
DECLARE
    v_instance saga_instances;
BEGIN
    UPDATE saga_instances
    SET status = 'completed',
        outputs = p_outputs,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_instance_id
    RETURNING * INTO v_instance;

    -- Update last step
    UPDATE saga_step_executions
    SET status = 'completed', completed_at = NOW()
    WHERE saga_instance_id = p_instance_id AND status = 'running';

    RETURN v_instance;
END;
$$ LANGUAGE plpgsql;

-- Fail saga instance and start compensation
CREATE OR REPLACE FUNCTION fail_saga_instance(
    p_instance_id TEXT,
    p_error TEXT
) RETURNS saga_instances AS $$
DECLARE
    v_instance saga_instances;
BEGIN
    UPDATE saga_instances
    SET status = 'compensating',
        error = p_error,
        updated_at = NOW()
    WHERE id = p_instance_id
    RETURNING * INTO v_instance;

    -- Update current step as failed
    UPDATE saga_step_executions
    SET status = 'failed', error = p_error, completed_at = NOW()
    WHERE saga_instance_id = p_instance_id AND status = 'running';

    RETURN v_instance;
END;
$$ LANGUAGE plpgsql;

-- Find orphaned sagas (for recovery)
CREATE OR REPLACE FUNCTION find_orphaned_sagas(
    p_timeout_minutes INTEGER DEFAULT 60
) RETURNS SETOF saga_instances AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM saga_instances
    WHERE status IN ('running', 'compensating')
      AND updated_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE saga_definitions IS '10X: Saga workflow definitions for distributed transactions';
COMMENT ON TABLE saga_instances IS '10X: Running saga instances with state';
COMMENT ON TABLE distributed_locks IS '10X: Distributed locking for saga coordination';
COMMENT ON TABLE idempotency_keys IS '10X: Idempotency store for exactly-once semantics';

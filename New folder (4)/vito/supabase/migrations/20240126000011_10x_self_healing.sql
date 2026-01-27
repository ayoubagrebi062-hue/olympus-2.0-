-- ============================================================================
-- 10X SELF-HEALING - CIRCUIT BREAKERS & HEALTH MONITORING
-- ============================================================================
-- "Systems that heal themselves are systems that survive."
-- ============================================================================

-- Circuit Breaker State
CREATE TABLE IF NOT EXISTS circuit_breakers (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
    failures INTEGER NOT NULL DEFAULT 0,
    successes INTEGER NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    half_opened_at TIMESTAMPTZ,
    config JSONB NOT NULL DEFAULT '{
        "failureThreshold": 5,
        "resetTimeoutMs": 30000,
        "halfOpenMaxAttempts": 3
    }',
    stats JSONB NOT NULL DEFAULT '{
        "totalCalls": 0,
        "totalFailures": 0,
        "totalSuccesses": 0,
        "avgResponseTime": 0,
        "lastResponseTimes": []
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circuit Breaker History (for analysis)
CREATE TABLE IF NOT EXISTS circuit_breaker_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuit_id TEXT NOT NULL REFERENCES circuit_breakers(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('OPENED', 'CLOSED', 'HALF_OPENED', 'FAILURE', 'SUCCESS')),
    previous_state TEXT,
    new_state TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_history_circuit ON circuit_breaker_history(circuit_id);
CREATE INDEX IF NOT EXISTS idx_cb_history_time ON circuit_breaker_history(created_at DESC);

-- Fallback Registry
CREATE TABLE IF NOT EXISTS agent_fallbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL,
    fallback_agent_type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    conditions JSONB DEFAULT '{}',
    success_rate DECIMAL(5,2),
    avg_duration INTEGER,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_agent_fallback UNIQUE(agent_type, fallback_agent_type)
);

CREATE INDEX IF NOT EXISTS idx_fallbacks_agent ON agent_fallbacks(agent_type);

-- Health Metrics
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id TEXT NOT NULL,
    component_type TEXT NOT NULL CHECK (component_type IN ('agent', 'phase', 'service', 'circuit')),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('latency', 'error_rate', 'throughput', 'availability')),
    value DECIMAL(15,4) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_component ON health_metrics(component_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_time ON health_metrics(window_start DESC);

-- Health Alerts
CREATE TABLE IF NOT EXISTS health_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical', 'recovery')),
    title TEXT NOT NULL,
    description TEXT,
    metrics JSONB,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_alerts_component ON health_alerts(component_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_unresolved ON health_alerts(resolved, created_at DESC) WHERE NOT resolved;

-- ============================================================================
-- FUNCTIONS FOR SELF-HEALING
-- ============================================================================

-- Update circuit breaker state
CREATE OR REPLACE FUNCTION update_circuit_breaker(
    p_circuit_id TEXT,
    p_success BOOLEAN,
    p_duration INTEGER DEFAULT NULL
) RETURNS circuit_breakers AS $$
DECLARE
    v_circuit circuit_breakers;
    v_config JSONB;
    v_new_state TEXT;
    v_should_transition BOOLEAN := FALSE;
BEGIN
    -- Get or create circuit breaker
    INSERT INTO circuit_breakers (id)
    VALUES (p_circuit_id)
    ON CONFLICT (id) DO NOTHING;

    SELECT * INTO v_circuit FROM circuit_breakers WHERE id = p_circuit_id FOR UPDATE;
    v_config := v_circuit.config;

    IF p_success THEN
        -- Success case
        UPDATE circuit_breakers SET
            successes = successes + 1,
            last_success_at = NOW(),
            stats = stats || jsonb_build_object(
                'totalCalls', (stats->>'totalCalls')::INTEGER + 1,
                'totalSuccesses', (stats->>'totalSuccesses')::INTEGER + 1
            ),
            updated_at = NOW()
        WHERE id = p_circuit_id;

        -- Check if we should close from HALF_OPEN
        IF v_circuit.state = 'HALF_OPEN' THEN
            IF v_circuit.successes + 1 >= (v_config->>'halfOpenMaxAttempts')::INTEGER THEN
                v_new_state := 'CLOSED';
                v_should_transition := TRUE;
            END IF;
        END IF;
    ELSE
        -- Failure case
        UPDATE circuit_breakers SET
            failures = failures + 1,
            last_failure_at = NOW(),
            stats = stats || jsonb_build_object(
                'totalCalls', (stats->>'totalCalls')::INTEGER + 1,
                'totalFailures', (stats->>'totalFailures')::INTEGER + 1
            ),
            updated_at = NOW()
        WHERE id = p_circuit_id;

        -- Check if we should open the circuit
        IF v_circuit.state = 'CLOSED' THEN
            IF v_circuit.failures + 1 >= (v_config->>'failureThreshold')::INTEGER THEN
                v_new_state := 'OPEN';
                v_should_transition := TRUE;
            END IF;
        ELSIF v_circuit.state = 'HALF_OPEN' THEN
            -- Any failure in HALF_OPEN goes back to OPEN
            v_new_state := 'OPEN';
            v_should_transition := TRUE;
        END IF;
    END IF;

    -- Transition state if needed
    IF v_should_transition THEN
        UPDATE circuit_breakers SET
            state = v_new_state,
            failures = CASE WHEN v_new_state = 'CLOSED' THEN 0 ELSE failures END,
            successes = CASE WHEN v_new_state = 'OPEN' THEN 0 ELSE successes END,
            opened_at = CASE WHEN v_new_state = 'OPEN' THEN NOW() ELSE opened_at END,
            updated_at = NOW()
        WHERE id = p_circuit_id;

        -- Record history
        INSERT INTO circuit_breaker_history (circuit_id, event_type, previous_state, new_state)
        VALUES (p_circuit_id, v_new_state, v_circuit.state, v_new_state);
    END IF;

    SELECT * INTO v_circuit FROM circuit_breakers WHERE id = p_circuit_id;
    RETURN v_circuit;
END;
$$ LANGUAGE plpgsql;

-- Check if circuit can execute
CREATE OR REPLACE FUNCTION can_circuit_execute(p_circuit_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_circuit circuit_breakers;
    v_config JSONB;
BEGIN
    SELECT * INTO v_circuit FROM circuit_breakers WHERE id = p_circuit_id;

    IF v_circuit IS NULL THEN
        RETURN TRUE; -- New circuit, allow execution
    END IF;

    v_config := v_circuit.config;

    CASE v_circuit.state
        WHEN 'CLOSED' THEN
            RETURN TRUE;
        WHEN 'OPEN' THEN
            -- Check if timeout has passed
            IF v_circuit.opened_at + ((v_config->>'resetTimeoutMs')::INTEGER || ' milliseconds')::INTERVAL < NOW() THEN
                -- Transition to HALF_OPEN
                UPDATE circuit_breakers SET
                    state = 'HALF_OPEN',
                    half_opened_at = NOW(),
                    successes = 0,
                    updated_at = NOW()
                WHERE id = p_circuit_id;

                INSERT INTO circuit_breaker_history (circuit_id, event_type, previous_state, new_state)
                VALUES (p_circuit_id, 'HALF_OPENED', 'OPEN', 'HALF_OPEN');

                RETURN TRUE;
            END IF;
            RETURN FALSE;
        WHEN 'HALF_OPEN' THEN
            RETURN TRUE; -- Allow limited attempts
        ELSE
            RETURN TRUE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Record health metric
CREATE OR REPLACE FUNCTION record_health_metric(
    p_component_id TEXT,
    p_component_type TEXT,
    p_metric_type TEXT,
    p_value DECIMAL,
    p_window_minutes INTEGER DEFAULT 5
) RETURNS health_metrics AS $$
DECLARE
    v_metric health_metrics;
BEGIN
    INSERT INTO health_metrics (
        component_id, component_type, metric_type, value,
        window_start, window_end
    ) VALUES (
        p_component_id, p_component_type, p_metric_type, p_value,
        NOW() - (p_window_minutes || ' minutes')::INTERVAL,
        NOW()
    )
    RETURNING * INTO v_metric;

    -- Check for alerts
    PERFORM check_health_thresholds(p_component_id, p_metric_type, p_value);

    RETURN v_metric;
END;
$$ LANGUAGE plpgsql;

-- Check health thresholds and create alerts
CREATE OR REPLACE FUNCTION check_health_thresholds(
    p_component_id TEXT,
    p_metric_type TEXT,
    p_value DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_threshold_warning DECIMAL;
    v_threshold_critical DECIMAL;
BEGIN
    -- Define thresholds (would be configurable in production)
    CASE p_metric_type
        WHEN 'error_rate' THEN
            v_threshold_warning := 0.1;  -- 10%
            v_threshold_critical := 0.25; -- 25%
        WHEN 'latency' THEN
            v_threshold_warning := 5000;  -- 5s
            v_threshold_critical := 10000; -- 10s
        ELSE
            RETURN; -- No thresholds defined
    END CASE;

    -- Create alert if threshold exceeded
    IF p_value >= v_threshold_critical THEN
        INSERT INTO health_alerts (component_id, alert_type, title, description, metrics)
        VALUES (
            p_component_id,
            'critical',
            'Critical ' || p_metric_type || ' threshold exceeded',
            p_metric_type || ' is at ' || p_value || ' (threshold: ' || v_threshold_critical || ')',
            jsonb_build_object('metric', p_metric_type, 'value', p_value, 'threshold', v_threshold_critical)
        );
    ELSIF p_value >= v_threshold_warning THEN
        INSERT INTO health_alerts (component_id, alert_type, title, description, metrics)
        VALUES (
            p_component_id,
            'warning',
            'Warning ' || p_metric_type || ' threshold exceeded',
            p_metric_type || ' is at ' || p_value || ' (threshold: ' || v_threshold_warning || ')',
            jsonb_build_object('metric', p_metric_type, 'value', p_value, 'threshold', v_threshold_warning)
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE circuit_breakers IS '10X: Circuit breaker state for self-healing agents';
COMMENT ON TABLE agent_fallbacks IS '10X: Fallback agent registry for graceful degradation';
COMMENT ON TABLE health_metrics IS '10X: Health metrics for predictive failure detection';
COMMENT ON TABLE health_alerts IS '10X: Health alerts for monitoring and response';

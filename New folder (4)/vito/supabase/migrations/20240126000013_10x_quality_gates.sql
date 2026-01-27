-- ============================================================================
-- 10X QUALITY GATES - CHECKPOINTS & ROLLBACK
-- ============================================================================
-- "Quality is not an act, it is a habit." - Aristotle
-- ============================================================================

-- Quality Rules Registry
CREATE TABLE IF NOT EXISTS quality_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL DEFAULT 'warn' CHECK (level IN ('info', 'warn', 'block', 'require-approval')),
    category TEXT NOT NULL CHECK (category IN ('code', 'security', 'performance', 'accessibility', 'compliance', 'custom')),
    validator_config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase-Rule Assignments
CREATE TABLE IF NOT EXISTS phase_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase TEXT NOT NULL,
    rule_id TEXT NOT NULL REFERENCES quality_rules(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_phase_rule UNIQUE(phase, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_phase_rules ON phase_quality_rules(phase);

-- Quality Gates
CREATE TABLE IF NOT EXISTS quality_gates (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'skipped', 'approved', 'rejected')),
    rules_evaluated TEXT[] NOT NULL DEFAULT '{}',
    summary JSONB NOT NULL DEFAULT '{
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "warnings": 0,
        "blockers": 0,
        "requiresApproval": false,
        "overallScore": 0
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quality_gates_build ON quality_gates(build_id);
CREATE INDEX IF NOT EXISTS idx_quality_gates_status ON quality_gates(status);

-- Gate Validation Results
CREATE TABLE IF NOT EXISTS gate_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id TEXT NOT NULL REFERENCES quality_gates(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    level TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
    message TEXT NOT NULL,
    details JSONB,
    suggestions TEXT[],
    auto_fix_available BOOLEAN DEFAULT FALSE,
    metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_results_gate ON gate_validation_results(gate_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_status ON gate_validation_results(gate_id, status);

-- Gate Approvals
CREATE TABLE IF NOT EXISTS gate_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id TEXT NOT NULL REFERENCES quality_gates(id) ON DELETE CASCADE,
    approver TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    reason TEXT,
    conditions TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_approvals_gate ON gate_approvals(gate_id);

-- Build Checkpoints
CREATE TABLE IF NOT EXISTS build_checkpoints (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'rolled-back')),
    state JSONB NOT NULL DEFAULT '{}',
    artifacts JSONB NOT NULL DEFAULT '{}',
    quality_score DECIMAL(5,2) DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{
        "createdAt": null,
        "createdBy": "system",
        "reason": "",
        "gateId": null,
        "parentCheckpointId": null
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_build ON build_checkpoints(build_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_build_version ON build_checkpoints(build_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_active ON build_checkpoints(build_id, status) WHERE status = 'active';

-- Rollback Plans
CREATE TABLE IF NOT EXISTS rollback_plans (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    source_checkpoint_id TEXT NOT NULL REFERENCES build_checkpoints(id),
    target_checkpoint_id TEXT NOT NULL REFERENCES build_checkpoints(id),
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'executing', 'completed', 'failed', 'cancelled')),
    steps JSONB NOT NULL DEFAULT '[]',
    estimated_duration INTEGER,
    risks JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rollback_plans_build ON rollback_plans(build_id);
CREATE INDEX IF NOT EXISTS idx_rollback_plans_status ON rollback_plans(status);

-- Quality Trends (aggregated data)
CREATE TABLE IF NOT EXISTS quality_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    gate_id TEXT NOT NULL REFERENCES quality_gates(id) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    dimension_scores JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_trends_build ON quality_trends(build_id);
CREATE INDEX IF NOT EXISTS idx_quality_trends_time ON quality_trends(created_at DESC);

-- ============================================================================
-- FUNCTIONS FOR QUALITY GATES
-- ============================================================================

-- Create checkpoint with automatic versioning
CREATE OR REPLACE FUNCTION create_build_checkpoint(
    p_build_id TEXT,
    p_phase TEXT,
    p_state JSONB,
    p_artifacts JSONB,
    p_reason TEXT,
    p_gate_id TEXT DEFAULT NULL,
    p_created_by TEXT DEFAULT 'system'
) RETURNS build_checkpoints AS $$
DECLARE
    v_checkpoint build_checkpoints;
    v_version INTEGER;
    v_parent_id TEXT;
    v_checkpoint_id TEXT;
BEGIN
    -- Get next version and parent
    SELECT COALESCE(MAX(version), 0) + 1, id
    INTO v_version, v_parent_id
    FROM build_checkpoints
    WHERE build_id = p_build_id AND status = 'active'
    GROUP BY id
    ORDER BY version DESC
    LIMIT 1;

    v_version := COALESCE(v_version, 1);

    -- Mark previous active checkpoint as superseded
    UPDATE build_checkpoints
    SET status = 'superseded'
    WHERE build_id = p_build_id AND status = 'active';

    -- Generate checkpoint ID
    v_checkpoint_id := 'cp-' || p_build_id || '-' || v_version || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    -- Create new checkpoint
    INSERT INTO build_checkpoints (
        id, build_id, phase, version, state, artifacts, metadata
    ) VALUES (
        v_checkpoint_id,
        p_build_id,
        p_phase,
        v_version,
        p_state,
        p_artifacts,
        jsonb_build_object(
            'createdAt', NOW(),
            'createdBy', p_created_by,
            'reason', p_reason,
            'gateId', p_gate_id,
            'parentCheckpointId', v_parent_id
        )
    )
    RETURNING * INTO v_checkpoint;

    RETURN v_checkpoint;
END;
$$ LANGUAGE plpgsql;

-- Evaluate quality gate
CREATE OR REPLACE FUNCTION evaluate_quality_gate(
    p_build_id TEXT,
    p_phase TEXT
) RETURNS quality_gates AS $$
DECLARE
    v_gate quality_gates;
    v_gate_id TEXT;
    v_rules TEXT[];
BEGIN
    -- Generate gate ID
    v_gate_id := 'gate-' || p_build_id || '-' || p_phase || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

    -- Get rules for this phase
    SELECT ARRAY_AGG(rule_id ORDER BY priority)
    INTO v_rules
    FROM phase_quality_rules
    WHERE phase = p_phase;

    -- Create gate record
    INSERT INTO quality_gates (id, build_id, phase, rules_evaluated)
    VALUES (v_gate_id, p_build_id, p_phase, COALESCE(v_rules, '{}'))
    RETURNING * INTO v_gate;

    -- Actual validation happens in application code
    -- This just creates the gate record

    RETURN v_gate;
END;
$$ LANGUAGE plpgsql;

-- Update gate with results
CREATE OR REPLACE FUNCTION complete_quality_gate(
    p_gate_id TEXT,
    p_status TEXT,
    p_summary JSONB
) RETURNS quality_gates AS $$
DECLARE
    v_gate quality_gates;
BEGIN
    UPDATE quality_gates
    SET status = p_status,
        summary = p_summary,
        completed_at = NOW()
    WHERE id = p_gate_id
    RETURNING * INTO v_gate;

    -- Record trend data
    INSERT INTO quality_trends (build_id, gate_id, phase, overall_score, dimension_scores)
    VALUES (
        v_gate.build_id,
        v_gate.id,
        v_gate.phase,
        (p_summary->>'overallScore')::DECIMAL,
        COALESCE(p_summary->'dimensions', '{}')
    );

    RETURN v_gate;
END;
$$ LANGUAGE plpgsql;

-- Execute rollback
CREATE OR REPLACE FUNCTION execute_rollback(
    p_plan_id TEXT
) RETURNS rollback_plans AS $$
DECLARE
    v_plan rollback_plans;
BEGIN
    -- Update plan status
    UPDATE rollback_plans
    SET status = 'executing'
    WHERE id = p_plan_id
    RETURNING * INTO v_plan;

    -- Mark target checkpoint as active
    UPDATE build_checkpoints
    SET status = 'active'
    WHERE id = v_plan.target_checkpoint_id;

    -- Mark source checkpoint as rolled-back
    UPDATE build_checkpoints
    SET status = 'rolled-back'
    WHERE id = v_plan.source_checkpoint_id;

    -- Complete plan
    UPDATE rollback_plans
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_plan_id
    RETURNING * INTO v_plan;

    RETURN v_plan;
END;
$$ LANGUAGE plpgsql;

-- Get checkpoint history for a build
CREATE OR REPLACE FUNCTION get_checkpoint_history(
    p_build_id TEXT,
    p_from_checkpoint_id TEXT DEFAULT NULL
) RETURNS TABLE (
    checkpoint_id TEXT,
    phase TEXT,
    version INTEGER,
    status TEXT,
    quality_score DECIMAL,
    created_at TIMESTAMPTZ,
    parent_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE checkpoint_chain AS (
        -- Start from specified checkpoint or active one
        SELECT c.id, c.phase, c.version, c.status, c.quality_score, c.created_at,
               (c.metadata->>'parentCheckpointId')::TEXT as parent_id
        FROM build_checkpoints c
        WHERE c.build_id = p_build_id
          AND (p_from_checkpoint_id IS NULL AND c.status = 'active'
               OR c.id = p_from_checkpoint_id)

        UNION ALL

        -- Walk up the chain
        SELECT c.id, c.phase, c.version, c.status, c.quality_score, c.created_at,
               (c.metadata->>'parentCheckpointId')::TEXT
        FROM build_checkpoints c
        JOIN checkpoint_chain cc ON c.id = cc.parent_id
    )
    SELECT * FROM checkpoint_chain
    ORDER BY version ASC;
END;
$$ LANGUAGE plpgsql;

-- Get quality trend for a project
CREATE OR REPLACE FUNCTION get_quality_trend(
    p_project_id TEXT,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    date DATE,
    avg_score DECIMAL,
    min_score DECIMAL,
    max_score DECIMAL,
    build_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        qt.created_at::DATE as date,
        AVG(qt.overall_score)::DECIMAL as avg_score,
        MIN(qt.overall_score)::DECIMAL as min_score,
        MAX(qt.overall_score)::DECIMAL as max_score,
        COUNT(DISTINCT qt.build_id)::INTEGER as build_count
    FROM quality_trends qt
    JOIN builds b ON b.id = qt.build_id
    WHERE b.project_id = p_project_id
      AND qt.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qt.created_at::DATE
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE quality_rules IS '10X: Quality rule definitions';
COMMENT ON TABLE quality_gates IS '10X: Quality gate evaluations with multi-level severity';
COMMENT ON TABLE build_checkpoints IS '10X: Build checkpoints for rollback capability';
COMMENT ON TABLE rollback_plans IS '10X: Rollback plans with step-by-step execution';
COMMENT ON TABLE quality_trends IS '10X: Quality trends for regression detection';

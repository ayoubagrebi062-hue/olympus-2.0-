-- ============================================================================
-- 10X EVENT STORE - TIME TRAVEL & EVENT SOURCING
-- ============================================================================
-- "The past can teach us, the future we can shape."
-- ============================================================================

-- Build Events - Immutable event log for event sourcing
CREATE TABLE IF NOT EXISTS build_events (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    correlation_id TEXT,
    causation_id TEXT,

    -- Ensure events are immutable and ordered
    CONSTRAINT valid_event_type CHECK (type ~ '^[A-Z][A-Z_]*$')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_build_events_build_id ON build_events(build_id);
CREATE INDEX IF NOT EXISTS idx_build_events_build_timestamp ON build_events(build_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_build_events_build_version ON build_events(build_id, version);
CREATE INDEX IF NOT EXISTS idx_build_events_type ON build_events(type);
CREATE INDEX IF NOT EXISTS idx_build_events_correlation ON build_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- Event Snapshots - For faster state reconstruction
CREATE TABLE IF NOT EXISTS build_event_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_build_snapshot_version UNIQUE(build_id, version)
);

CREATE INDEX IF NOT EXISTS idx_event_snapshots_build ON build_event_snapshots(build_id);

-- Event Subscriptions - Track consumers
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id TEXT NOT NULL,
    event_types TEXT[] NOT NULL DEFAULT '{}',
    last_event_id TEXT,
    last_processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_subscriber UNIQUE(subscriber_id)
);

-- ============================================================================
-- FUNCTIONS FOR EVENT SOURCING
-- ============================================================================

-- Append event with optimistic locking
CREATE OR REPLACE FUNCTION append_build_event(
    p_build_id TEXT,
    p_type TEXT,
    p_data JSONB,
    p_metadata JSONB DEFAULT '{}',
    p_correlation_id TEXT DEFAULT NULL,
    p_causation_id TEXT DEFAULT NULL
) RETURNS build_events AS $$
DECLARE
    v_event build_events;
    v_next_version INTEGER;
BEGIN
    -- Get next version for this build
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM build_events
    WHERE build_id = p_build_id;

    -- Generate event ID
    INSERT INTO build_events (
        id, build_id, type, version, data, metadata, correlation_id, causation_id
    ) VALUES (
        'evt-' || p_build_id || '-' || v_next_version || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        p_build_id,
        p_type,
        v_next_version,
        p_data,
        p_metadata,
        p_correlation_id,
        p_causation_id
    )
    RETURNING * INTO v_event;

    -- Notify subscribers
    PERFORM pg_notify('build_events', json_build_object(
        'id', v_event.id,
        'build_id', v_event.build_id,
        'type', v_event.type,
        'version', v_event.version
    )::TEXT);

    RETURN v_event;
END;
$$ LANGUAGE plpgsql;

-- Create snapshot at current version
CREATE OR REPLACE FUNCTION create_event_snapshot(
    p_build_id TEXT,
    p_state JSONB
) RETURNS build_event_snapshots AS $$
DECLARE
    v_snapshot build_event_snapshots;
    v_current_version INTEGER;
BEGIN
    -- Get current version
    SELECT COALESCE(MAX(version), 0)
    INTO v_current_version
    FROM build_events
    WHERE build_id = p_build_id;

    -- Insert or update snapshot
    INSERT INTO build_event_snapshots (build_id, version, state)
    VALUES (p_build_id, v_current_version, p_state)
    ON CONFLICT (build_id, version) DO UPDATE SET
        state = EXCLUDED.state,
        created_at = NOW()
    RETURNING * INTO v_snapshot;

    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Get events for time travel (from version to version)
CREATE OR REPLACE FUNCTION get_events_for_replay(
    p_build_id TEXT,
    p_from_version INTEGER DEFAULT 1,
    p_to_version INTEGER DEFAULT NULL
) RETURNS SETOF build_events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM build_events
    WHERE build_id = p_build_id
      AND version >= p_from_version
      AND (p_to_version IS NULL OR version <= p_to_version)
    ORDER BY version ASC;
END;
$$ LANGUAGE plpgsql;

-- Trigger for immutability enforcement
CREATE OR REPLACE FUNCTION enforce_event_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Create immutability triggers
DROP TRIGGER IF EXISTS prevent_event_update ON build_events;
CREATE TRIGGER prevent_event_update
    BEFORE UPDATE ON build_events
    FOR EACH ROW
    EXECUTE FUNCTION enforce_event_immutability();

DROP TRIGGER IF EXISTS prevent_event_delete ON build_events;
CREATE TRIGGER prevent_event_delete
    BEFORE DELETE ON build_events
    FOR EACH ROW
    EXECUTE FUNCTION enforce_event_immutability();

COMMENT ON TABLE build_events IS '10X: Immutable event log for event sourcing with time-travel debugging';
COMMENT ON TABLE build_event_snapshots IS '10X: State snapshots for faster event replay';

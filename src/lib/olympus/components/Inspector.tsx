'use client';

// OLYMPUS INSPECTOR — SINGLE ACTIVE MODE
// Modes: Artifact | Agent | Phase | Gate | Error | WHY | Trust | Cost

import { TOKENS, phaseStateColor, severityColor, trustScoreColor } from './tokens';
import type {
  InspectorMode,
  Phase,
  Agent,
  Artifact,
  Gate,
  BuildError,
  DecisionTrace,
  TrustEvent,
  CostEvent,
} from '../types/core';

interface InspectorProps {
  readonly mode: InspectorMode;
  readonly targetId: string | null;
  readonly phases: readonly Phase[];
  readonly agents: readonly Agent[];
  readonly artifacts: readonly Artifact[];
  readonly errors: readonly BuildError[];
  readonly decisions: readonly DecisionTrace[];
  readonly trustEvents: readonly TrustEvent[];
  readonly costEvents: readonly CostEvent[];
  readonly onModeChange: (mode: InspectorMode, target: string | null) => void;
}

const MODES: readonly InspectorMode[] = [
  'phase',
  'agent',
  'artifact',
  'gate',
  'error',
  'why',
  'trust',
  'cost',
];

export function Inspector({
  mode,
  targetId,
  phases,
  agents,
  artifacts,
  errors,
  decisions,
  trustEvents,
  costEvents,
  onModeChange,
}: InspectorProps) {
  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: TOKENS.colors.bg.secondary,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.sm,
      borderLeft: `1px solid ${TOKENS.colors.border.default}`,
    } as const,
    tabs: {
      display: 'flex',
      borderBottom: `1px solid ${TOKENS.colors.border.default}`,
      backgroundColor: TOKENS.colors.bg.tertiary,
      flexWrap: 'wrap' as const,
    } as const,
    tab: {
      padding: `${TOKENS.space[2]} ${TOKENS.space[3]}`,
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as const,
    tabActive: {
      color: TOKENS.colors.text.primary,
      borderBottomColor: TOKENS.colors.accent.primary,
    } as const,
    content: {
      flex: 1,
      overflow: 'auto' as const,
      padding: TOKENS.space[3],
    } as const,
    section: {
      marginBottom: TOKENS.space[4],
    } as const,
    sectionTitle: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: TOKENS.space[2],
    } as const,
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: `${TOKENS.space[1]} 0`,
      borderBottom: `1px solid ${TOKENS.colors.border.subtle}`,
    } as const,
    label: {
      color: TOKENS.colors.text.tertiary,
    } as const,
    value: {
      color: TOKENS.colors.text.primary,
      textAlign: 'right' as const,
      maxWidth: '60%',
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    } as const,
    item: {
      padding: TOKENS.space[2],
      backgroundColor: TOKENS.colors.bg.primary,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.sm,
      marginBottom: TOKENS.space[2],
      cursor: 'pointer',
    } as const,
    hash: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      wordBreak: 'break-all' as const,
    } as const,
    empty: {
      color: TOKENS.colors.text.muted,
      textAlign: 'center' as const,
      padding: TOKENS.space[4],
    } as const,
  };

  const renderPhaseInspector = () => {
    const phase = targetId ? phases.find(p => p.id === targetId) : null;
    if (!phase) {
      return (
        <div>
          <div style={styles.sectionTitle}>ALL PHASES</div>
          {phases.map(p => (
            <div
              key={p.id}
              style={{
                ...styles.item,
                borderLeftColor: phaseStateColor(p.state),
                borderLeftWidth: '3px',
              }}
              onClick={() => onModeChange('phase', p.id)}
            >
              <div style={{ fontWeight: TOKENS.font.weight.medium }}>{p.name}</div>
              <div style={{ color: phaseStateColor(p.state), fontSize: TOKENS.font.size.xs }}>
                {p.state.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PHASE: {phase.name}</div>
          <div style={styles.row}>
            <span style={styles.label}>ID</span>
            <span style={styles.value}>{phase.id}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>STATE</span>
            <span style={{ ...styles.value, color: phaseStateColor(phase.state) }}>
              {phase.state}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>ORDER</span>
            <span style={styles.value}>{phase.order}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>TOKENS</span>
            <span style={styles.value}>{phase.tokenUsage.toLocaleString()}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>STARTED</span>
            <span style={styles.value}>{phase.startedAt ?? 'NOT STARTED'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>COMPLETED</span>
            <span style={styles.value}>{phase.completedAt ?? 'NOT COMPLETED'}</span>
          </div>
          {phase.failureReason && (
            <div style={styles.row}>
              <span style={styles.label}>FAILURE</span>
              <span style={{ ...styles.value, color: TOKENS.colors.accent.error }}>
                {phase.failureReason}
              </span>
            </div>
          )}
        </div>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>GATE</div>
          <div style={styles.row}>
            <span style={styles.label}>STATE</span>
            <span style={{ ...styles.value, color: phaseStateColor(phase.gate.state) }}>
              {phase.gate.state}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>TYPE</span>
            <span style={styles.value}>{phase.gate.type}</span>
          </div>
          {phase.gate.reason && (
            <div style={styles.row}>
              <span style={styles.label}>REASON</span>
              <span style={styles.value}>{phase.gate.reason}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAgentInspector = () => {
    const agent = targetId ? agents.find(a => a.id === targetId) : null;
    if (!agent) {
      return (
        <div>
          <div style={styles.sectionTitle}>ALL AGENTS</div>
          {agents.map(a => (
            <div
              key={a.id}
              style={{
                ...styles.item,
                borderLeftColor: phaseStateColor(a.state),
                borderLeftWidth: '3px',
              }}
              onClick={() => onModeChange('agent', a.id)}
            >
              <div style={{ fontWeight: TOKENS.font.weight.medium }}>{a.name}</div>
              <div style={{ color: phaseStateColor(a.state), fontSize: TOKENS.font.size.xs }}>
                {a.state.toUpperCase()} • {a.outputCount} outputs
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={styles.section}>
        <div style={styles.sectionTitle}>AGENT: {agent.name}</div>
        <div style={styles.row}>
          <span style={styles.label}>ID</span>
          <span style={styles.value}>{agent.id}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>STATE</span>
          <span style={{ ...styles.value, color: phaseStateColor(agent.state) }}>
            {agent.state}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>PHASE</span>
          <span style={styles.value}>{agent.currentPhase ?? 'NONE'}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>TOKENS</span>
          <span style={styles.value}>{agent.tokenUsage.toLocaleString()}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>OUTPUTS</span>
          <span style={styles.value}>{agent.outputCount}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>FAILURES</span>
          <span
            style={{
              ...styles.value,
              color:
                agent.failureCount > 0 ? TOKENS.colors.accent.error : TOKENS.colors.text.primary,
            }}
          >
            {agent.failureCount}
          </span>
        </div>
        {agent.lastOutput && (
          <div style={{ marginTop: TOKENS.space[3] }}>
            <div style={styles.sectionTitle}>LAST OUTPUT</div>
            <div style={{ color: TOKENS.colors.text.secondary, fontSize: TOKENS.font.size.xs }}>
              {agent.lastOutput}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderArtifactInspector = () => {
    const artifact = targetId ? artifacts.find(a => a.id === targetId) : null;
    if (!artifact) {
      const grouped = artifacts.reduce(
        (acc, a) => {
          if (!acc[a.phaseId]) acc[a.phaseId] = [];
          acc[a.phaseId].push(a);
          return acc;
        },
        {} as Record<string, Artifact[]>
      );

      return (
        <div>
          <div style={styles.sectionTitle}>ALL ARTIFACTS ({artifacts.length})</div>
          {Object.entries(grouped).map(([phaseId, arts]) => (
            <div key={phaseId} style={{ marginBottom: TOKENS.space[3] }}>
              <div
                style={{
                  fontSize: TOKENS.font.size.xs,
                  color: TOKENS.colors.text.muted,
                  marginBottom: TOKENS.space[1],
                }}
              >
                {phaseId}
              </div>
              {arts.map(a => (
                <div key={a.id} style={styles.item} onClick={() => onModeChange('artifact', a.id)}>
                  <div style={{ fontWeight: TOKENS.font.weight.medium }}>{a.name}</div>
                  <div style={{ color: phaseStateColor(a.state), fontSize: TOKENS.font.size.xs }}>
                    {a.type} • {a.size} bytes
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={styles.section}>
        <div style={styles.sectionTitle}>ARTIFACT: {artifact.name}</div>
        <div style={styles.row}>
          <span style={styles.label}>ID</span>
          <span style={styles.value}>{artifact.id}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>TYPE</span>
          <span style={styles.value}>{artifact.type}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>STATE</span>
          <span style={{ ...styles.value, color: phaseStateColor(artifact.state) }}>
            {artifact.state}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>SIZE</span>
          <span style={styles.value}>{artifact.size} bytes</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>PATH</span>
          <span style={styles.value}>{artifact.path}</span>
        </div>
        {artifact.hash && (
          <div style={{ marginTop: TOKENS.space[2] }}>
            <div style={styles.sectionTitle}>HASH</div>
            <div style={styles.hash}>{artifact.hash}</div>
          </div>
        )}
      </div>
    );
  };

  const renderGateInspector = () => {
    const gates = phases.map(p => ({ phaseId: p.id, phaseName: p.name, gate: p.gate }));
    return (
      <div>
        <div style={styles.sectionTitle}>ALL GATES</div>
        {gates.map(({ phaseId, phaseName, gate }) => (
          <div
            key={gate.id}
            style={{
              ...styles.item,
              borderLeftColor: phaseStateColor(gate.state),
              borderLeftWidth: '3px',
            }}
          >
            <div style={{ fontWeight: TOKENS.font.weight.medium }}>{phaseName} GATE</div>
            <div style={{ color: phaseStateColor(gate.state), fontSize: TOKENS.font.size.xs }}>
              {gate.type.toUpperCase()} • {gate.state.toUpperCase()}
            </div>
            {gate.reason && (
              <div
                style={{
                  color: TOKENS.colors.text.tertiary,
                  fontSize: TOKENS.font.size.xs,
                  marginTop: TOKENS.space[1],
                }}
              >
                {gate.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderErrorInspector = () => {
    if (errors.length === 0) {
      return <div style={styles.empty}>NO ERRORS</div>;
    }
    return (
      <div>
        <div style={styles.sectionTitle}>ERRORS ({errors.length})</div>
        {errors.map(error => (
          <div
            key={error.id}
            style={{
              ...styles.item,
              borderLeftColor: severityColor(error.severity),
              borderLeftWidth: '3px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: TOKENS.space[1],
              }}
            >
              <span
                style={{
                  color: severityColor(error.severity),
                  fontWeight: TOKENS.font.weight.medium,
                }}
              >
                {error.severity}
              </span>
              <span style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                {new Date(error.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ color: TOKENS.colors.text.primary }}>{error.message}</div>
            {error.agentId && (
              <div style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                Agent: {error.agentId}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderWhyInspector = () => {
    if (decisions.length === 0) {
      return <div style={styles.empty}>NO DECISIONS RECORDED</div>;
    }
    return (
      <div>
        <div style={styles.sectionTitle}>DECISION TRACE ({decisions.length})</div>
        {decisions
          .slice()
          .reverse()
          .map(d => (
            <div key={d.id} style={styles.item}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: TOKENS.space[1],
                }}
              >
                <span style={{ fontWeight: TOKENS.font.weight.medium }}>{d.action}</span>
                <span style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                  {new Date(d.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: TOKENS.colors.text.secondary, marginBottom: TOKENS.space[1] }}>
                {d.reason}
              </div>
              <div style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                Actor: {d.actor}
              </div>
              <div style={styles.hash}>{d.hash.slice(0, 32)}...</div>
            </div>
          ))}
      </div>
    );
  };

  const renderTrustInspector = () => {
    if (trustEvents.length === 0) {
      return <div style={styles.empty}>NO TRUST EVENTS</div>;
    }
    return (
      <div>
        <div style={styles.sectionTitle}>TRUST EVENTS ({trustEvents.length})</div>
        {trustEvents
          .slice()
          .reverse()
          .map(e => (
            <div
              key={e.id}
              style={{
                ...styles.item,
                borderLeftColor:
                  e.delta >= 0 ? TOKENS.colors.accent.success : TOKENS.colors.accent.error,
                borderLeftWidth: '3px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: TOKENS.space[1],
                }}
              >
                <span
                  style={{
                    color: e.delta >= 0 ? TOKENS.colors.accent.success : TOKENS.colors.accent.error,
                    fontWeight: TOKENS.font.weight.medium,
                  }}
                >
                  {e.delta >= 0 ? '+' : ''}
                  {e.delta}
                </span>
                <span style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: TOKENS.colors.text.secondary }}>{e.reason}</div>
              <div style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                {e.previousScore} → {e.newScore}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderCostInspector = () => {
    if (costEvents.length === 0) {
      return <div style={styles.empty}>NO COST EVENTS</div>;
    }
    const totalCost = costEvents.reduce((sum, e) => sum + e.tokens, 0);
    return (
      <div>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>COST SUMMARY</div>
          <div style={styles.row}>
            <span style={styles.label}>TOTAL TOKENS</span>
            <span style={{ ...styles.value, color: TOKENS.colors.accent.cost }}>
              {totalCost.toLocaleString()}
            </span>
          </div>
        </div>
        <div style={styles.sectionTitle}>COST EVENTS ({costEvents.length})</div>
        {costEvents
          .slice()
          .reverse()
          .slice(0, 50)
          .map(e => (
            <div key={e.id} style={styles.item}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: TOKENS.colors.accent.cost }}>
                  {e.tokens.toLocaleString()} tokens
                </span>
                <span style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                Agent: {e.agentId}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (mode) {
      case 'phase':
        return renderPhaseInspector();
      case 'agent':
        return renderAgentInspector();
      case 'artifact':
        return renderArtifactInspector();
      case 'gate':
        return renderGateInspector();
      case 'error':
        return renderErrorInspector();
      case 'why':
        return renderWhyInspector();
      case 'trust':
        return renderTrustInspector();
      case 'cost':
        return renderCostInspector();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {MODES.map(m => (
          <div
            key={m}
            style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            onClick={() => onModeChange(m, null)}
          >
            {m}
          </div>
        ))}
      </div>
      <div style={styles.content}>{renderContent()}</div>
    </div>
  );
}

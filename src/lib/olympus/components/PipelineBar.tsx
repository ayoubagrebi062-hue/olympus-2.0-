'use client';

// OLYMPUS PIPELINE BAR — 64PX FIXED
// Phases with state: pending | running | blocked | failed | complete
// Gate indicators between phases

import { TOKENS, phaseStateColor } from './tokens';
import type { Phase, GateState } from '../types/core';

interface PipelineBarProps {
  readonly phases: readonly Phase[];
  readonly onPhaseClick: (phaseId: string) => void;
  readonly activePhaseId: string | null;
}

function GateIndicator({ state }: { state: GateState }) {
  const color = {
    open: TOKENS.colors.text.muted,
    pending: TOKENS.colors.accent.warning,
    blocked: TOKENS.colors.accent.error,
    passed: TOKENS.colors.accent.success,
    failed: TOKENS.colors.accent.error,
  }[state];

  const symbol = {
    open: '○',
    pending: '◐',
    blocked: '●',
    passed: '◆',
    failed: '✕',
  }[state];

  return (
    <span
      style={{
        color,
        fontSize: TOKENS.font.size.sm,
        margin: `0 ${TOKENS.space[1]}`,
      }}
    >
      {symbol}
    </span>
  );
}

export function PipelineBar({ phases, onPhaseClick, activePhaseId }: PipelineBarProps) {
  const styles = {
    bar: {
      height: TOKENS.layout.pipelineHeight,
      backgroundColor: TOKENS.colors.bg.primary,
      borderBottom: `1px solid ${TOKENS.colors.border.default}`,
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${TOKENS.space[4]}`,
      fontFamily: TOKENS.font.family,
      gap: TOKENS.space[1],
      overflowX: 'auto' as const,
    } as const,
    phase: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: `${TOKENS.space[2]} ${TOKENS.space[3]}`,
      backgroundColor: TOKENS.colors.bg.secondary,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.default,
      cursor: 'pointer',
      minWidth: '100px',
      transition: 'border-color 0.1s',
    } as const,
    phaseActive: {
      borderColor: TOKENS.colors.accent.primary,
      backgroundColor: TOKENS.colors.bg.tertiary,
    } as const,
    phaseName: {
      fontSize: TOKENS.font.size.sm,
      fontWeight: TOKENS.font.weight.medium,
      color: TOKENS.colors.text.primary,
      marginBottom: TOKENS.space[1],
    } as const,
    phaseState: {
      fontSize: TOKENS.font.size.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as const,
    connector: {
      display: 'flex',
      alignItems: 'center',
      color: TOKENS.colors.text.muted,
      fontSize: TOKENS.font.size.sm,
    } as const,
  };

  return (
    <div style={styles.bar}>
      {phases.map((phase, index) => (
        <div key={phase.id} style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              ...styles.phase,
              ...(activePhaseId === phase.id ? styles.phaseActive : {}),
              borderLeftColor: phaseStateColor(phase.state),
              borderLeftWidth: '3px',
            }}
            onClick={() => onPhaseClick(phase.id)}
          >
            <span style={styles.phaseName}>{phase.name}</span>
            <span style={{ ...styles.phaseState, color: phaseStateColor(phase.state) }}>
              {phase.state}
            </span>
          </div>

          {index < phases.length - 1 && (
            <div style={styles.connector}>
              <span style={{ margin: `0 ${TOKENS.space[1]}` }}>→</span>
              <GateIndicator state={phase.gate.state} />
              <span style={{ margin: `0 ${TOKENS.space[1]}` }}>→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

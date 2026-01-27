'use client';

// OLYMPUS HEADER — 48PX FIXED
// Build ID | Status | Trust Score | Token Usage | Cost Burn Rate | OLYMPUS Score

import { TOKENS, phaseStateColor, trustScoreColor, olympusScoreColor } from './tokens';
import type { Build } from '../types/core';

interface HeaderProps {
  readonly build: Build | null;
  readonly isConnected: boolean;
}

export function Header({ build, isConnected }: HeaderProps) {
  const styles = {
    header: {
      height: TOKENS.layout.headerHeight,
      backgroundColor: TOKENS.colors.bg.secondary,
      borderBottom: `1px solid ${TOKENS.colors.border.default}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${TOKENS.space[4]}`,
      fontFamily: TOKENS.font.family,
    } as const,
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: TOKENS.space[4],
    } as const,
    right: {
      display: 'flex',
      alignItems: 'center',
      gap: TOKENS.space[6],
    } as const,
    logo: {
      fontSize: TOKENS.font.size.lg,
      fontWeight: TOKENS.font.weight.bold,
      color: TOKENS.colors.text.primary,
      letterSpacing: '2px',
    } as const,
    buildId: {
      fontSize: TOKENS.font.size.sm,
      color: TOKENS.colors.text.tertiary,
      padding: `${TOKENS.space[1]} ${TOKENS.space[2]}`,
      backgroundColor: TOKENS.colors.bg.tertiary,
      borderRadius: TOKENS.radius.sm,
    } as const,
    metric: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'flex-end',
      gap: '2px',
    } as const,
    metricLabel: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as const,
    metricValue: {
      fontSize: TOKENS.font.size.base,
      fontWeight: TOKENS.font.weight.medium,
    } as const,
    connection: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: isConnected ? TOKENS.colors.accent.success : TOKENS.colors.accent.error,
    } as const,
  };

  if (!build) {
    return (
      <header style={styles.header}>
        <div style={styles.left}>
          <span style={styles.logo}>OLYMPUS</span>
          <span style={{ ...styles.buildId, color: TOKENS.colors.text.muted }}>NO BUILD</span>
        </div>
        <div style={styles.right}>
          <div style={styles.connection} title={isConnected ? 'Connected' : 'Disconnected'} />
        </div>
      </header>
    );
  }

  const tokenPercent = Math.round((build.tokenUsage / build.tokenLimit) * 100);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <span style={styles.logo}>OLYMPUS</span>
        <span style={styles.buildId}>{build.id}</span>
        <span
          style={{
            ...styles.buildId,
            color: phaseStateColor(build.state),
            borderLeft: `2px solid ${phaseStateColor(build.state)}`,
          }}
        >
          {build.state.toUpperCase()}
        </span>
      </div>

      <div style={styles.right}>
        {/* TRUST SCORE */}
        <div style={styles.metric}>
          <span style={styles.metricLabel}>TRUST</span>
          <span style={{ ...styles.metricValue, color: trustScoreColor(build.trustScore) }}>
            {build.trustScore}%
          </span>
        </div>

        {/* TOKEN USAGE */}
        <div style={styles.metric}>
          <span style={styles.metricLabel}>TOKENS</span>
          <span
            style={{
              ...styles.metricValue,
              color:
                tokenPercent > 80
                  ? TOKENS.colors.accent.error
                  : tokenPercent > 60
                    ? TOKENS.colors.accent.warning
                    : TOKENS.colors.text.secondary,
            }}
          >
            {build.tokenUsage.toLocaleString()} / {build.tokenLimit.toLocaleString()}
          </span>
        </div>

        {/* COST BURN RATE */}
        <div style={styles.metric}>
          <span style={styles.metricLabel}>BURN</span>
          <span style={{ ...styles.metricValue, color: TOKENS.colors.accent.cost }}>
            {build.costBurnRate.toFixed(1)} t/s
          </span>
        </div>

        {/* TOTAL COST */}
        <div style={styles.metric}>
          <span style={styles.metricLabel}>COST</span>
          <span style={{ ...styles.metricValue, color: TOKENS.colors.accent.cost }}>
            ${build.totalCost.toFixed(4)}
          </span>
        </div>

        {/* OLYMPUS SCORE */}
        <div style={styles.metric}>
          <span style={styles.metricLabel}>OLYMPUS</span>
          <span style={{ ...styles.metricValue, color: olympusScoreColor(build.olympusScore) }}>
            {build.olympusScore}
          </span>
        </div>

        {/* CONNECTION */}
        <div style={styles.connection} title={isConnected ? 'Connected' : 'Disconnected'} />
      </div>
    </header>
  );
}

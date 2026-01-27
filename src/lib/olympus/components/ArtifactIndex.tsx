'use client';

// OLYMPUS ARTIFACT INDEX — COLLAPSIBLE, GROUPED BY PHASE

import { useState } from 'react';
import { TOKENS, phaseStateColor } from './tokens';
import type { Artifact, Phase } from '../types/core';

interface ArtifactIndexProps {
  readonly artifacts: readonly Artifact[];
  readonly phases: readonly Phase[];
  readonly onArtifactClick: (artifactId: string) => void;
  readonly collapsed: boolean;
  readonly onToggleCollapse: () => void;
}

export function ArtifactIndex({
  artifacts,
  phases,
  onArtifactClick,
  collapsed,
  onToggleCollapse,
}: ArtifactIndexProps) {
  const styles = {
    container: {
      backgroundColor: TOKENS.colors.bg.secondary,
      borderTop: `1px solid ${TOKENS.colors.border.default}`,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.sm,
      maxHeight: collapsed ? '32px' : TOKENS.layout.artifactIndexHeight,
      overflow: 'hidden' as const,
      transition: 'max-height 0.2s ease',
    } as const,
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${TOKENS.space[1]} ${TOKENS.space[3]}`,
      backgroundColor: TOKENS.colors.bg.tertiary,
      cursor: 'pointer',
      userSelect: 'none' as const,
    } as const,
    title: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    } as const,
    toggle: {
      color: TOKENS.colors.text.muted,
      fontSize: TOKENS.font.size.sm,
    } as const,
    content: {
      display: 'flex',
      overflowX: 'auto' as const,
      padding: TOKENS.space[2],
      gap: TOKENS.space[3],
    } as const,
    phaseGroup: {
      minWidth: '200px',
    } as const,
    phaseName: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      marginBottom: TOKENS.space[1],
      whiteSpace: 'nowrap' as const,
    } as const,
    artifact: {
      display: 'flex',
      alignItems: 'center',
      gap: TOKENS.space[1],
      padding: `${TOKENS.space[1]} ${TOKENS.space[2]}`,
      backgroundColor: TOKENS.colors.bg.primary,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.sm,
      marginBottom: TOKENS.space[1],
      cursor: 'pointer',
      fontSize: TOKENS.font.size.xs,
    } as const,
    artifactName: {
      color: TOKENS.colors.text.secondary,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      whiteSpace: 'nowrap' as const,
    } as const,
    artifactType: {
      color: TOKENS.colors.text.muted,
      marginLeft: 'auto',
    } as const,
    count: {
      color: TOKENS.colors.text.tertiary,
      fontSize: TOKENS.font.size.xs,
    } as const,
  };

  // GROUP BY PHASE
  const grouped = phases.map(phase => ({
    phase,
    artifacts: artifacts.filter(a => a.phaseId === phase.id),
  }));

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={onToggleCollapse}>
        <span style={styles.title}>ARTIFACTS ({artifacts.length})</span>
        <span style={styles.toggle}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && (
        <div style={styles.content}>
          {grouped.map(({ phase, artifacts: phaseArtifacts }) => (
            <div key={phase.id} style={styles.phaseGroup}>
              <div style={styles.phaseName}>
                <span style={{ color: phaseStateColor(phase.state) }}>●</span> {phase.name}
                <span style={styles.count}> ({phaseArtifacts.length})</span>
              </div>
              {phaseArtifacts.map(artifact => (
                <div
                  key={artifact.id}
                  style={{
                    ...styles.artifact,
                    borderLeftColor: phaseStateColor(artifact.state),
                    borderLeftWidth: '2px',
                  }}
                  onClick={() => onArtifactClick(artifact.id)}
                >
                  <span style={styles.artifactName} title={artifact.name}>
                    {artifact.name}
                  </span>
                  <span style={styles.artifactType}>{artifact.type}</span>
                </div>
              ))}
              {phaseArtifacts.length === 0 && (
                <div style={{ color: TOKENS.colors.text.muted, fontSize: TOKENS.font.size.xs }}>
                  No artifacts
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

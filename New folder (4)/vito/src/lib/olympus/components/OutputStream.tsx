'use client'

// OLYMPUS OUTPUT STREAM — VIRTUALIZED, REAL-TIME, AGENT-TAGGED
// Filter by agent / phase / severity

import { useRef, useEffect, useState, useMemo } from 'react'
import { TOKENS, severityColor } from './tokens'
import type { OutputEntry, Severity } from '../types/core'

interface OutputStreamProps {
  readonly entries: readonly OutputEntry[]
  readonly filterAgent: string | null
  readonly filterPhase: string | null
  readonly filterSeverity: Severity | null
  readonly onAgentClick: (agentId: string) => void
  readonly onPhaseClick: (phaseId: string) => void
}

const ENTRY_HEIGHT = 24
const OVERSCAN = 10

export function OutputStream({
  entries,
  filterAgent,
  filterPhase,
  filterSeverity,
  onAgentClick,
  onPhaseClick,
}: OutputStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)

  // FILTER ENTRIES
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterAgent && entry.agentId !== filterAgent) return false
      if (filterPhase && entry.phaseId !== filterPhase) return false
      if (filterSeverity && entry.severity !== filterSeverity) return false
      return true
    })
  }, [entries, filterAgent, filterPhase, filterSeverity])

  // VIRTUALIZATION
  const totalHeight = filteredEntries.length * ENTRY_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ENTRY_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    filteredEntries.length,
    Math.ceil((scrollTop + containerHeight) / ENTRY_HEIGHT) + OVERSCAN
  )
  const visibleEntries = filteredEntries.slice(startIndex, endIndex)
  const offsetY = startIndex * ENTRY_HEIGHT

  // AUTO-SCROLL TO BOTTOM
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = totalHeight
    }
  }, [filteredEntries.length, autoScroll, totalHeight])

  // HANDLE SCROLL
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop: st, scrollHeight, clientHeight } = containerRef.current
    setScrollTop(st)

    // DISABLE AUTO-SCROLL IF USER SCROLLS UP
    const isAtBottom = scrollHeight - st - clientHeight < ENTRY_HEIGHT * 2
    setAutoScroll(isAtBottom)
  }

  // MEASURE CONTAINER
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const styles = {
    container: {
      height: '100%',
      overflow: 'auto' as const,
      backgroundColor: TOKENS.colors.bg.primary,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.sm,
    } as const,
    inner: {
      height: `${totalHeight}px`,
      position: 'relative' as const,
    } as const,
    entries: {
      position: 'absolute' as const,
      top: `${offsetY}px`,
      left: 0,
      right: 0,
    } as const,
    entry: {
      height: `${ENTRY_HEIGHT}px`,
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${TOKENS.space[3]}`,
      borderBottom: `1px solid ${TOKENS.colors.border.subtle}`,
      gap: TOKENS.space[2],
    } as const,
    timestamp: {
      color: TOKENS.colors.text.muted,
      fontSize: TOKENS.font.size.xs,
      minWidth: '80px',
    } as const,
    agent: {
      color: TOKENS.colors.accent.primary,
      fontSize: TOKENS.font.size.xs,
      minWidth: '100px',
      cursor: 'pointer',
      textDecoration: 'none',
    } as const,
    severity: {
      fontSize: TOKENS.font.size.xs,
      minWidth: '60px',
      textTransform: 'uppercase' as const,
    } as const,
    message: {
      color: TOKENS.colors.text.secondary,
      flex: 1,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      whiteSpace: 'nowrap' as const,
    } as const,
    empty: {
      padding: TOKENS.space[4],
      color: TOKENS.colors.text.muted,
      textAlign: 'center' as const,
    } as const,
    scrollIndicator: {
      position: 'absolute' as const,
      bottom: TOKENS.space[2],
      right: TOKENS.space[2],
      padding: `${TOKENS.space[1]} ${TOKENS.space[2]}`,
      backgroundColor: TOKENS.colors.bg.elevated,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.sm,
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      cursor: 'pointer',
    } as const,
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div
        ref={containerRef}
        style={styles.container}
        onScroll={handleScroll}
      >
        {filteredEntries.length === 0 ? (
          <div style={styles.empty}>NO OUTPUT</div>
        ) : (
          <div style={styles.inner}>
            <div style={styles.entries}>
              {visibleEntries.map((entry) => (
                <div key={entry.id} style={styles.entry}>
                  <span style={styles.timestamp}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span
                    style={styles.agent}
                    onClick={() => onAgentClick(entry.agentId)}
                    title={entry.agentName}
                  >
                    [{entry.agentName.slice(0, 12)}]
                  </span>
                  <span style={{ ...styles.severity, color: severityColor(entry.severity) }}>
                    {entry.severity}
                  </span>
                  <span style={styles.message} title={entry.message}>
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!autoScroll && (
        <div
          style={styles.scrollIndicator}
          onClick={() => {
            setAutoScroll(true)
            if (containerRef.current) {
              containerRef.current.scrollTop = totalHeight
            }
          }}
        >
          ↓ NEW OUTPUT
        </div>
      )}
    </div>
  )
}

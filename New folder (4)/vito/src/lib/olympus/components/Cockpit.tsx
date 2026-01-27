'use client'

// OLYMPUS COCKPIT — CONSOLE-FIRST, ONE SCREEN, NO PAGE NAVIGATION
// FIXED: Now wired to SSE for real-time build updates

import { useReducer, useCallback, useState, useEffect } from 'react'
import { TOKENS } from './tokens'
import { Header } from './Header'
import { PipelineBar } from './PipelineBar'
import { OutputStream } from './OutputStream'
import { Inspector } from './Inspector'
import { ArtifactIndex } from './ArtifactIndex'
import { CommandBar } from './CommandBar'
import {
  createInitialState,
  olympusReducer,
  type OlympusState,
  type OlympusAction,
} from '../state/build-state'
import { useBuildStream } from '../hooks/useBuildStream'
import type {
  Build,
  Phase,
  Agent,
  Artifact,
  OutputEntry,
  DecisionTrace,
  InspectorMode,
  Command,
  Severity,
} from '../types/core'

interface CockpitProps {
  readonly initialBuild: Build | null
  readonly initialAgents: Agent[]
}

export function Cockpit({ initialBuild, initialAgents }: CockpitProps) {
  // STATE
  const [state, dispatch] = useReducer(olympusReducer, undefined, () => {
    const initial = createInitialState()
    if (initialBuild) {
      const agentsMap = new Map<string, Agent>()
      for (const agent of initialAgents) {
        agentsMap.set(agent.id, agent)
      }
      return {
        ...initial,
        build: initialBuild,
        agents: agentsMap,
        isConnected: true,
      }
    }
    return initial
  })

  const [filterAgent, setFilterAgent] = useState<string | null>(null)
  const [filterPhase, setFilterPhase] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<Severity | null>(null)
  const [artifactIndexCollapsed, setArtifactIndexCollapsed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // MOCK DECISIONS FOR WHY INSPECTOR
  const [decisions] = useState<DecisionTrace[]>([])

  // FIXED: SSE STREAM FOR REAL-TIME BUILD UPDATES
  // Connect to SSE when build is in running state
  const buildId = state.build?.id || null
  const isRunning = state.build?.state === 'running' || state.build?.state === 'pending'

  const { isConnected, reconnect } = useBuildStream({
    buildId: isRunning ? buildId : null,
    dispatch,
    onConnected: () => {
      console.log('[Cockpit] SSE connected for real-time updates')
    },
    onDisconnected: () => {
      console.log('[Cockpit] SSE disconnected')
    },
    onError: (error) => {
      console.error('[Cockpit] SSE error:', error)
      dispatch({
        type: 'OUTPUT_RECEIVED',
        entry: {
          id: `sse-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: 'WARNING',
          message: `Stream connection error: ${error.message}`,
          phaseId: '',
          agentId: '',
          agentName: '',
          metadata: null,
        },
      })
    },
  })

  // Update connection state in reducer
  useEffect(() => {
    dispatch({ type: 'CONNECTION_CHANGED', connected: isConnected })
  }, [isConnected])

  // HANDLERS
  const handlePhaseClick = useCallback((phaseId: string) => {
    dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'phase', target: phaseId })
  }, [])

  const handleAgentClick = useCallback((agentId: string) => {
    dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'agent', target: agentId })
  }, [])

  const handleArtifactClick = useCallback((artifactId: string) => {
    dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'artifact', target: artifactId })
  }, [])

  const handleInspectorModeChange = useCallback((mode: InspectorMode, target: string | null) => {
    dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode, target })
  }, [])

  const handleCommand = useCallback((command: Command) => {
    dispatch({ type: 'COMMAND_EXECUTED', command: command.raw })

    // EXECUTE COMMAND
    switch (command.parsed.action) {
      case 'inspect_phase':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'phase', target: command.parsed.target })
        break
      case 'inspect_agent':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'agent', target: command.parsed.target })
        break
      case 'inspect_artifact':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'artifact', target: command.parsed.target })
        break
      case 'inspect_gate':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'gate', target: null })
        break
      case 'inspect_error':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'error', target: null })
        break
      case 'inspect_why':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'why', target: null })
        break
      case 'inspect_trust':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'trust', target: null })
        break
      case 'inspect_cost':
        dispatch({ type: 'INSPECTOR_MODE_CHANGED', mode: 'cost', target: null })
        break
      case 'filter_output':
        if (command.parsed.target) {
          // Determine filter type
          if (command.parsed.target.startsWith('agent:')) {
            setFilterAgent(command.parsed.target.slice(6))
          } else if (command.parsed.target.startsWith('phase:')) {
            setFilterPhase(command.parsed.target.slice(6))
          } else if (['INFO', 'WARNING', 'BLOCKING', 'FATAL'].includes(command.parsed.target)) {
            setFilterSeverity(command.parsed.target as Severity)
          }
        }
        break
      case 'clear_filter':
        setFilterAgent(null)
        setFilterPhase(null)
        setFilterSeverity(null)
        break
      default:
        console.log('Command:', command.parsed.action, command.parsed.target)
    }
  }, [])

  const styles = {
    viewport: {
      minWidth: TOKENS.layout.minWidth,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: TOKENS.colors.bg.primary,
      color: TOKENS.colors.text.primary,
      fontFamily: TOKENS.font.family,
      overflow: 'hidden' as const,
    } as const,
    main: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      minHeight: 0,
    } as const,
    left: {
      display: 'flex',
      flexDirection: 'column' as const,
      minHeight: 0,
      borderRight: `1px solid ${TOKENS.colors.border.default}`,
    } as const,
    outputContainer: {
      flex: 1,
      minHeight: 0,
    } as const,
    filterBar: {
      display: 'flex',
      gap: TOKENS.space[2],
      padding: TOKENS.space[2],
      backgroundColor: TOKENS.colors.bg.secondary,
      borderBottom: `1px solid ${TOKENS.colors.border.default}`,
      fontSize: TOKENS.font.size.xs,
    } as const,
    filterChip: {
      padding: `${TOKENS.space[1]} ${TOKENS.space[2]}`,
      backgroundColor: TOKENS.colors.bg.tertiary,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.sm,
      color: TOKENS.colors.text.secondary,
      cursor: 'pointer',
    } as const,
    filterChipActive: {
      borderColor: TOKENS.colors.accent.primary,
      color: TOKENS.colors.accent.primary,
    } as const,
  }

  const agents = Array.from(state.agents.values())

  return (
    <div style={styles.viewport}>
      {/* HEADER — 48PX */}
      <Header build={state.build} isConnected={state.isConnected} />

      {/* PIPELINE BAR — 64PX */}
      <PipelineBar
        phases={state.build?.phases ?? []}
        onPhaseClick={handlePhaseClick}
        activePhaseId={state.inspectorMode === 'phase' ? state.inspectorTarget : null}
      />

      {/* MAIN GRID */}
      <div style={styles.main}>
        {/* LEFT: OUTPUT STREAM */}
        <div style={styles.left}>
          {/* FILTER BAR */}
          <div style={styles.filterBar}>
            <span style={{ color: TOKENS.colors.text.muted }}>FILTER:</span>
            {filterAgent && (
              <span
                style={{ ...styles.filterChip, ...styles.filterChipActive }}
                onClick={() => setFilterAgent(null)}
              >
                Agent: {filterAgent} ✕
              </span>
            )}
            {filterPhase && (
              <span
                style={{ ...styles.filterChip, ...styles.filterChipActive }}
                onClick={() => setFilterPhase(null)}
              >
                Phase: {filterPhase} ✕
              </span>
            )}
            {filterSeverity && (
              <span
                style={{ ...styles.filterChip, ...styles.filterChipActive }}
                onClick={() => setFilterSeverity(null)}
              >
                {filterSeverity} ✕
              </span>
            )}
            {!filterAgent && !filterPhase && !filterSeverity && (
              <span style={{ color: TOKENS.colors.text.muted }}>NONE</span>
            )}
          </div>

          {/* OUTPUT STREAM */}
          <div style={styles.outputContainer}>
            <OutputStream
              entries={state.outputStream}
              filterAgent={filterAgent}
              filterPhase={filterPhase}
              filterSeverity={filterSeverity}
              onAgentClick={handleAgentClick}
              onPhaseClick={handlePhaseClick}
            />
          </div>
        </div>

        {/* RIGHT: INSPECTOR */}
        <Inspector
          mode={state.inspectorMode}
          targetId={state.inspectorTarget}
          phases={state.build?.phases ?? []}
          agents={agents}
          artifacts={state.build?.artifacts ?? []}
          errors={state.errors}
          decisions={decisions}
          trustEvents={state.trustEvents}
          costEvents={state.costEvents}
          onModeChange={handleInspectorModeChange}
        />
      </div>

      {/* ARTIFACT INDEX */}
      <ArtifactIndex
        artifacts={state.build?.artifacts ?? []}
        phases={state.build?.phases ?? []}
        onArtifactClick={handleArtifactClick}
        collapsed={artifactIndexCollapsed}
        onToggleCollapse={() => setArtifactIndexCollapsed((prev) => !prev)}
      />

      {/* COMMAND BAR */}
      <CommandBar
        onCommand={handleCommand}
        commandHistory={state.commandHistory}
        isProcessing={isProcessing}
      />
    </div>
  )
}

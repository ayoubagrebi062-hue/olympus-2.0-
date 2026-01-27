// OLYMPUS BUILD STATE — SINGLE SOURCE OF TRUTH

import type {
  Build,
  Phase,
  Agent,
  Artifact,
  Gate,
  OutputEntry,
  TrustEvent,
  CostEvent,
  BuildError,
  InspectorMode,
  Severity,
  LIMITS,
} from '../types/core'
import { HARD_STOP, checkTrustDegradation, recordFailure } from '../governance/enforcement'

// STATE SHAPE
export interface OlympusState {
  readonly build: Build | null
  readonly agents: ReadonlyMap<string, Agent>
  readonly outputStream: readonly OutputEntry[]
  readonly trustEvents: readonly TrustEvent[]
  readonly costEvents: readonly CostEvent[]
  readonly errors: readonly BuildError[]
  readonly inspectorMode: InspectorMode
  readonly inspectorTarget: string | null
  readonly commandHistory: readonly string[]
  readonly isConnected: boolean
  readonly lastUpdate: string
}

// INITIAL STATE
export function createInitialState(): OlympusState {
  return {
    build: null,
    agents: new Map(),
    outputStream: [],
    trustEvents: [],
    costEvents: [],
    errors: [],
    inspectorMode: 'phase',
    inspectorTarget: null,
    commandHistory: [],
    isConnected: false,
    lastUpdate: new Date().toISOString(),
  }
}

// ACTIONS
export type OlympusAction =
  | { type: 'BUILD_LOADED'; build: Build; agents: Agent[] }
  | { type: 'BUILD_UPDATED'; build: Partial<Build> }
  | { type: 'PHASE_UPDATED'; phaseId: string; phase: Partial<Phase> }
  | { type: 'AGENT_UPDATED'; agentId: string; agent: Partial<Agent> }
  | { type: 'OUTPUT_RECEIVED'; entry: OutputEntry }
  | { type: 'TRUST_EVENT'; event: TrustEvent }
  | { type: 'COST_EVENT'; event: CostEvent }
  | { type: 'ERROR_OCCURRED'; error: BuildError }
  | { type: 'INSPECTOR_MODE_CHANGED'; mode: InspectorMode; target: string | null }
  | { type: 'COMMAND_EXECUTED'; command: string }
  | { type: 'CONNECTION_CHANGED'; connected: boolean }
  | { type: 'GATE_UPDATED'; phaseId: string; gate: Gate }

// REDUCER — IMMUTABLE STATE TRANSITIONS
export function olympusReducer(state: OlympusState, action: OlympusAction): OlympusState {
  const now = new Date().toISOString()

  switch (action.type) {
    case 'BUILD_LOADED': {
      const agentsMap = new Map<string, Agent>()
      for (const agent of action.agents) {
        agentsMap.set(agent.id, agent)
      }
      return {
        ...state,
        build: action.build,
        agents: agentsMap,
        lastUpdate: now,
      }
    }

    case 'BUILD_UPDATED': {
      if (!state.build) return state
      const updatedBuild = { ...state.build, ...action.build }

      // CHECK TRUST DEGRADATION
      if (action.build.trustScore !== undefined) {
        if (checkTrustDegradation(state.build.trustScore, action.build.trustScore)) {
          recordFailure('WARNING', 'Trust degradation detected', {})
        }
      }

      return {
        ...state,
        build: updatedBuild as Build,
        lastUpdate: now,
      }
    }

    case 'PHASE_UPDATED': {
      if (!state.build) return state
      const phases = state.build.phases.map((p) =>
        p.id === action.phaseId ? { ...p, ...action.phase } : p
      )
      return {
        ...state,
        build: { ...state.build, phases } as Build,
        lastUpdate: now,
      }
    }

    case 'AGENT_UPDATED': {
      const newAgents = new Map(state.agents)
      const existing = newAgents.get(action.agentId)
      if (existing) {
        newAgents.set(action.agentId, { ...existing, ...action.agent } as Agent)
      }
      return {
        ...state,
        agents: newAgents,
        lastUpdate: now,
      }
    }

    case 'OUTPUT_RECEIVED': {
      // VIRTUALIZED — KEEP LAST 10000 ENTRIES
      const maxEntries = 10000
      const newStream = [...state.outputStream, action.entry]
      const trimmedStream = newStream.length > maxEntries
        ? newStream.slice(-maxEntries)
        : newStream
      return {
        ...state,
        outputStream: trimmedStream,
        lastUpdate: now,
      }
    }

    case 'TRUST_EVENT': {
      return {
        ...state,
        trustEvents: [...state.trustEvents, action.event],
        lastUpdate: now,
      }
    }

    case 'COST_EVENT': {
      return {
        ...state,
        costEvents: [...state.costEvents, action.event],
        lastUpdate: now,
      }
    }

    case 'ERROR_OCCURRED': {
      // NO SILENT FAILURE — ALL ERRORS RECORDED
      if (action.error.severity === 'FATAL' && !action.error.recoverable) {
        HARD_STOP(action.error.message)
      }
      return {
        ...state,
        errors: [...state.errors, action.error],
        lastUpdate: now,
      }
    }

    case 'INSPECTOR_MODE_CHANGED': {
      return {
        ...state,
        inspectorMode: action.mode,
        inspectorTarget: action.target,
        lastUpdate: now,
      }
    }

    case 'COMMAND_EXECUTED': {
      return {
        ...state,
        commandHistory: [...state.commandHistory, action.command],
        lastUpdate: now,
      }
    }

    case 'CONNECTION_CHANGED': {
      return {
        ...state,
        isConnected: action.connected,
        lastUpdate: now,
      }
    }

    case 'GATE_UPDATED': {
      if (!state.build) return state
      const phases = state.build.phases.map((p) =>
        p.id === action.phaseId ? { ...p, gate: action.gate } : p
      )
      return {
        ...state,
        build: { ...state.build, phases } as Build,
        lastUpdate: now,
      }
    }

    default:
      return state
  }
}

// SELECTORS
export const selectBuild = (state: OlympusState): Build | null => state.build
export const selectPhases = (state: OlympusState): readonly Phase[] => state.build?.phases ?? []
export const selectAgents = (state: OlympusState): readonly Agent[] => Array.from(state.agents.values())
export const selectArtifacts = (state: OlympusState): readonly Artifact[] => state.build?.artifacts ?? []
export const selectOutputByAgent = (state: OlympusState, agentId: string): readonly OutputEntry[] =>
  state.outputStream.filter((e) => e.agentId === agentId)
export const selectOutputByPhase = (state: OlympusState, phaseId: string): readonly OutputEntry[] =>
  state.outputStream.filter((e) => e.phaseId === phaseId)
export const selectOutputBySeverity = (state: OlympusState, severity: Severity): readonly OutputEntry[] =>
  state.outputStream.filter((e) => e.severity === severity)
export const selectBlockingErrors = (state: OlympusState): readonly BuildError[] =>
  state.errors.filter((e) => e.severity === 'BLOCKING' || e.severity === 'FATAL')
export const selectTrustScore = (state: OlympusState): number => state.build?.trustScore ?? 0
export const selectTokenUsage = (state: OlympusState): number => state.build?.tokenUsage ?? 0
export const selectCostBurnRate = (state: OlympusState): number => state.build?.costBurnRate ?? 0

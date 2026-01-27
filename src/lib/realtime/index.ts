/**
 * OLYMPUS 2.1 - 10X UPGRADE: Real-Time Module
 *
 * Live experiences:
 * - Build visualization with live updates
 * - Multi-user collaboration
 * - Real-time cursors and presence
 * - Live code preview
 */

// Build Visualizer
export { BuildVisualizer, createOlympusVisualizer } from './build-visualizer';

export type {
  AgentVisualState,
  AgentVisualization,
  PhaseVisualization,
  BuildVisualization,
  TimelineEvent,
  LivePreview,
} from './build-visualizer';

// Collaboration
export { CollaborationSession, collaborationManager } from './collaboration';

export type {
  User,
  Cursor,
  Selection,
  ChatMessage,
  CollaborationState,
  CollaborationEvent,
} from './collaboration';

// Live Code Stream
export {
  LiveCodeStreamManager,
  codeStreamManager,
  createCodeStreamManager,
  calculateDiff,
} from './live-code-stream';

export type {
  CodeStream,
  CodeStreamConfig,
  CodeLanguage,
  CursorPosition,
  ReasoningSegment,
  CodeDiff,
  DiffLine,
  DiffModification,
  StreamToken,
  TokenType,
  StreamEvent,
  StreamEventHandler,
  CodeStreamStats,
} from './live-code-stream';

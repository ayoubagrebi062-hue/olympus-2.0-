/**
 * OLYMPUS 2.1 - Build Context
 *
 * Updated with 50X Coordination Upgrade
 */

export * from './types';
export { BuildContextManager } from './manager';
export {
  serializeContext,
  deserializeContext,
  saveContext,
  loadContext,
  saveAgentOutput,
  loadAgentOutputs,
  saveSnapshot,
  loadLatestSnapshot,
  // 50X COORDINATION FIX: CriticalDecisions persistence
  saveCriticalDecisions,
  loadCriticalDecisions,
  // FIX #3: Stall detection heartbeat
  heartbeatBuild,
} from './persistence';
export {
  buildContextSummary,
  extractArtifactsForPurpose,
  getFileContent,
  // 50X Coordination exports
  buildContextSummaryWithConstraints,
  extractCriticalDecisionsFromOutputs,
} from './summarizer';

// GraphRAG Context (Brand Memory)
export {
  GraphRAGContextManager,
  getContextManager,
  getUserContext,
  getContextSummary,
  recordBuild,
  type UserContext,
  type UserPreferences,
  type SimilarPrompt,
  type BuildSummary,
  type ContextOptions,
} from './graphrag';

// Agent Context Enhancement
export {
  enhanceAgentContext,
  recordAgentExecution,
  recordLearnedPattern,
  recordLearnedComponent,
  recordBuildFeedback,
  updateUserPreferencesFromBuild,
  type EnhancedContext,
  type AgentExecutionRecord,
  type LearnedPattern,
} from './agent-enhancer';

// Preference Learning
export {
  analyzeBuild,
  analyzeFeedback,
  learnFromBuild,
  learnFromFeedback,
  getLearnedPreferences,
  getTopPreferences,
  type PreferenceScore,
  type LearnedPreferences,
  type BuildAnalysis,
  type FeedbackAnalysis,
} from './preference-learning';

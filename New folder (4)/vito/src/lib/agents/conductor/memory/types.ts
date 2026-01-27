/**
 * MEMORY Module Types - Learning Brain for CONDUCTOR
 *
 * Defines types for:
 * - Build history storage and retrieval
 * - Pattern extraction and matching
 * - User preference learning
 * - Vector-based similarity search
 */

import type { ProjectType, ProjectComplexity, ProjectAnalysis } from '../types';

// ============================================================================
// BUILD HISTORY
// ============================================================================

/**
 * Complete record of a build for historical analysis
 */
export interface BuildRecord {
  id: string;
  tenantId: string;
  description: string;
  projectType: ProjectType;
  complexity: ProjectComplexity;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';

  // Timing
  startedAt: Date;
  completedAt: Date | null;
  duration: number; // ms

  // Results
  status: BuildStatus;
  outputs: Record<string, BuildOutputSummary>;
  errors: BuildError[];

  // Quality
  qualityScores: Record<string, number>; // agentId -> score
  overallQuality: number;

  // Resources
  tokensUsed: number;
  costUSD: number;

  // Metadata
  userFeedback?: UserFeedback;
  tags: string[];
  metadata: Record<string, unknown>;
}

export type BuildStatus =
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface BuildOutputSummary {
  agentId: string;
  phase: string;
  outputSize: number;
  keyFields: string[];
  qualityScore: number;
  quality?: number;
  tokens?: number;
  retryCount: number;
}

export interface BuildError {
  agentId: string;
  phase: string;
  error: string;
  recoverable: boolean;
  timestamp: Date;
}

export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  usedOutput: boolean;
  modifiedOutput: boolean;
  timestamp: Date;
}

// ============================================================================
// LEARNED PATTERNS
// ============================================================================

/**
 * A pattern extracted from historical builds
 */
export interface LearnedPattern {
  id: string;
  type: PatternType;
  trigger: PatternTrigger;
  action: PatternAction;

  // Effectiveness
  successRate: number;
  timesApplied: number;
  lastApplied: Date | null;

  // Confidence
  confidence: number; // 0-1
  minSamples: number;
  actualSamples: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: 'automatic' | 'manual' | 'feedback';
}

export type PatternType =
  | 'agent_selection'      // Which agents work best for project type
  | 'quality_threshold'    // Optimal quality thresholds per context
  | 'retry_strategy'       // Which retry strategies work
  | 'prompt_enhancement'   // Prompt modifications that improve output
  | 'phase_ordering'       // Optimal phase execution order
  | 'parallel_execution'   // Which agents can run in parallel safely
  | 'error_recovery'       // How to recover from specific errors
  | 'cost_optimization'    // Ways to reduce cost without quality loss
  | 'user_preference';     // User-specific preferences

export interface PatternTrigger {
  conditions: TriggerCondition[];
  operator: 'AND' | 'OR';
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'matches' | 'in';
  value: unknown;
}

export interface PatternAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  priority: number; // Higher = more important
}

export type ActionType =
  | 'modify_threshold'
  | 'add_agent'
  | 'skip_agent'
  | 'reorder_phases'
  | 'enhance_prompt'
  | 'increase_retries'
  | 'decrease_retries'
  | 'adjust_retry'
  | 'enable_parallel'
  | 'disable_parallel'
  | 'apply_fallback'
  | 'alert_user';

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Learned preferences for a tenant
 */
export interface UserPreferences {
  tenantId: string;

  // Build preferences
  preferredTier: 'basic' | 'standard' | 'premium' | 'enterprise' | null;
  preferredStrategy: 'sequential' | 'parallel-phases' | 'adaptive' | 'fast-track' | null;
  qualityOverSpeed: number; // -1 (speed) to 1 (quality)

  // Style preferences
  codeStyle: CodeStylePreferences;
  designStyle: DesignStylePreferences;
  communicationStyle: CommunicationStylePreferences;

  // Thresholds
  customThresholds: Record<string, number>;
  toleranceForRetries: number; // 0-1
  budgetSensitivity: number; // 0-1

  // Feedback history
  averageRating: number;
  totalFeedbacks: number;
  feedbackTrend: 'improving' | 'stable' | 'declining';

  // Metadata
  updatedAt: Date;
  createdAt?: Date;
  confidence: number; // How confident we are in these preferences
}

export interface CodeStylePreferences {
  framework: string | null;
  language: string | null;
  formatting?: string | null;
  indentation?: string | null;
  patterns: string[];
  avoidPatterns: string[];
  testingFramework: string | null;
  lintingRules: string[];
}

export interface DesignStylePreferences {
  colorScheme: 'light' | 'dark' | 'system' | null;
  theme?: string | null;
  colors?: string[];
  primaryColors: string[];
  typography: string | null;
  componentLibrary: string | null;
  iconSet: string | null;
  animationLevel: 'none' | 'subtle' | 'moderate' | 'rich' | null;
}

export interface CommunicationStylePreferences {
  verbosity: 'minimal' | 'standard' | 'detailed' | null;
  technicalLevel: 'beginner' | 'intermediate' | 'expert' | null;
  techLevel?: 'beginner' | 'intermediate' | 'expert' | null;
  formatPreference: 'prose' | 'bullets' | 'structured' | null;
}

// ============================================================================
// SIMILARITY SEARCH
// ============================================================================

/**
 * Query for finding similar builds
 */
export interface SimilarityQuery {
  description: string;
  projectType?: ProjectType;
  complexity?: ProjectComplexity;
  tier?: 'basic' | 'standard' | 'premium' | 'enterprise';
  tenantId?: string;
  minQuality?: number;
  limit?: number;
}

/**
 * Result from similarity search
 */
export interface SimilarBuild {
  buildId: string;
  similarity: number; // 0-1
  record: BuildRecord;
  relevantPatterns: LearnedPattern[];
}

/**
 * Vector embedding for a build
 */
export interface BuildEmbedding {
  buildId: string;
  vector: number[];
  text: string; // Original text used for embedding
  metadata: EmbeddingMetadata;
  createdAt: Date;
}

export interface EmbeddingMetadata {
  projectType: ProjectType;
  complexity: ProjectComplexity;
  tier: string;
  tenantId: string;
  quality: number;
  success: boolean;
}

// ============================================================================
// MEMORY MODULE CONFIGURATION
// ============================================================================

export interface MemoryConfig {
  enabled: boolean;

  // Storage
  buildHistoryLimit: number; // Max builds to keep per tenant
  patternRetentionDays: number; // How long to keep patterns

  // Learning
  minSamplesForPattern: number; // Minimum builds before extracting pattern
  patternConfidenceThreshold: number; // Min confidence to apply pattern
  learningEnabled: boolean;

  // Vector search
  vectorSearchEnabled: boolean;
  similarityThreshold: number; // Min similarity to consider relevant
  maxSimilarResults: number;

  // Preferences
  preferenceLearningEnabled: boolean;
  preferenceDecayDays: number; // How quickly old preferences fade
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  buildHistoryLimit: 100,
  patternRetentionDays: 90,
  minSamplesForPattern: 5,
  patternConfidenceThreshold: 0.7,
  learningEnabled: true,
  vectorSearchEnabled: true,
  similarityThreshold: 0.35,
  maxSimilarResults: 10,
  preferenceLearningEnabled: true,
  preferenceDecayDays: 30,
};

// ============================================================================
// MEMORY SERVICE INTERFACES
// ============================================================================

/**
 * Interface for build history storage
 */
export interface IBuildStore {
  // CRUD
  save(record: BuildRecord): Promise<void>;
  get(buildId: string): Promise<BuildRecord | null>;
  getByTenant(tenantId: string, options?: QueryOptions): Promise<BuildRecord[]>;
  update(buildId: string, updates: Partial<BuildRecord>): Promise<void>;
  delete(buildId: string): Promise<void>;

  // Queries
  getRecentBuilds(limit: number): Promise<BuildRecord[]>;
  getFailedBuilds(tenantId?: string, limit?: number): Promise<BuildRecord[]>;
  getSuccessfulBuilds(tenantId?: string, limit?: number): Promise<BuildRecord[]>;
  getBuildsByProjectType(projectType: ProjectType, limit?: number): Promise<BuildRecord[]>;

  // Analytics
  getAverageQuality(tenantId?: string): Promise<number>;
  getAverageDuration(tenantId?: string): Promise<number>;
  getAverageCost(tenantId?: string): Promise<number>;
  getSuccessRate(tenantId?: string): Promise<number>;
}

/**
 * Interface for pattern storage and retrieval
 */
export interface IPatternStore {
  // CRUD
  save(pattern: LearnedPattern): Promise<void>;
  get(patternId: string): Promise<LearnedPattern | null>;
  update(patternId: string, updates: Partial<LearnedPattern>): Promise<void>;
  delete(patternId: string): Promise<void>;

  // Queries
  getByType(type: PatternType): Promise<LearnedPattern[]>;
  getApplicable(context: PatternMatchContext): Promise<LearnedPattern[]>;
  getMostEffective(type: PatternType, limit: number): Promise<LearnedPattern[]>;
  getConfidentPatterns(minConfidence?: number): Promise<LearnedPattern[]>;

  // Learning
  incrementApplied(patternId: string, success: boolean): Promise<void>;
  updateConfidence(patternId: string, newConfidence: number): Promise<void>;
}

/**
 * Interface for vector similarity search
 */
export interface IVectorStore {
  // Indexing
  index(embedding: BuildEmbedding): Promise<void>;
  indexBatch(embeddings: BuildEmbedding[]): Promise<void>;
  remove(buildId: string): Promise<void>;

  // Search
  search(query: SimilarityQuery, vector: number[]): Promise<SimilarBuild[]>;
  searchByText(query: SimilarityQuery): Promise<SimilarBuild[]>;

  // Embedding
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Interface for user preferences storage
 */
export interface IPreferencesStore {
  // CRUD
  get(tenantId: string): Promise<UserPreferences | null>;
  save(preferences: UserPreferences): Promise<void>;
  update(tenantId: string, updates: Partial<UserPreferences>): Promise<void>;
  delete(tenantId: string): Promise<void>;

  // Learning
  recordFeedback(tenantId: string, feedback: UserFeedback): Promise<void>;
  updateFromBuild(tenantId: string, buildRecord: BuildRecord): Promise<void>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: QueryFilter[];
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'between';
  value: unknown;
}

export interface PatternMatchContext {
  projectType: ProjectType;
  complexity: ProjectComplexity;
  tier: string;
  tenantId?: string;
  agentId?: string;
  phase?: string;
  currentQuality?: number;
  errorCount?: number;
  [key: string]: unknown;
}

// ============================================================================
// MEMORY EVENTS
// ============================================================================

export type MemoryEventType =
  | 'build_stored'
  | 'build_retrieved'
  | 'feedback_recorded'
  | 'similar_found'
  | 'pattern_applied'
  | 'pattern_extracted'
  | 'pattern_updated'
  | 'pattern_added'
  | 'preference_applied'
  | 'preference_learned'
  | 'learning_completed'
  | 'error'
  | 'memory:build_stored'
  | 'memory:build_retrieved'
  | 'memory:pattern_extracted'
  | 'memory:pattern_applied'
  | 'memory:pattern_updated'
  | 'memory:similar_found'
  | 'memory:preference_learned'
  | 'memory:preference_applied'
  | 'memory:feedback_recorded'
  | 'memory:learning_completed'
  | 'memory:error';

export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

// ============================================================================
// MEMORY ANALYTICS
// ============================================================================

export interface MemoryAnalytics {
  totalBuildsStored: number;
  totalBuilds?: number;
  averageQuality?: number;
  totalPatterns: number;
  patternsApplied: number;
  averagePatternSuccess: number;
  similaritySearches: number;
  preferencesLearned: number;
  feedbackCollected: number;

  // By type
  patternsByType: Record<PatternType, number>;
  buildsByProjectType: Record<ProjectType, number>;

  // Trends
  qualityTrend: 'improving' | 'stable' | 'declining';
  costTrend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================================================
// MEMORY RECOMMENDATIONS
// ============================================================================

export interface MemoryRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  basedOn: RecommendationSource[];
  action?: PatternAction;
}

export type RecommendationType =
  | 'quality_improvement'
  | 'cost_reduction'
  | 'speed_optimization'
  | 'error_prevention'
  | 'preference_application';

export interface RecommendationSource {
  type: 'pattern' | 'build_history' | 'user_feedback' | 'similar_build';
  id: string;
  relevance: number;
}

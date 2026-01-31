/**
 * OLYMPUS 2.0 - Cognitive Session Types
 *
 * Core type definitions for the cognitive session system.
 * All types derived from actual usage in manager.ts, limits.ts, locking.ts.
 */

// ═══════════════════════════════════════════════════════════════════════════
// USER IDENTITY
// ═══════════════════════════════════════════════════════════════════════════

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CommunicationStyle {
  verbosity: 'minimal' | 'balanced' | 'detailed';
  technicalDepth: 'basic' | 'standard' | 'advanced';
  preferredExamples: 'none' | 'brief' | 'detailed';
  responseFormat: 'prose' | 'structured' | 'code-first';
}

export interface DomainExpertise {
  domain: string;
  proficiency: number;
  projectCount: number;
}

export interface UserIdentity {
  userId: string;
  expertiseLevel: ExpertiseLevel;
  expertiseConfidence: number;
  domainExpertise: DomainExpertise[];
  communicationStyle: CommunicationStyle;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalBuilds: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD RECORDS
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildPhase {
  name: string;
  duration: number;
  tokensUsed: number;
  success: boolean;
  agents: string[];
}

export interface BuildRecord {
  id: string;
  timestamp: Date;
  prompt: string;
  buildType: string;
  stack: Record<string, unknown>;
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  phases: BuildPhase[];
  success: boolean;
  userRating?: number;
  userFeedback?: string;
  iterations?: number;
  iterationTypes?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// LEARNINGS
// ═══════════════════════════════════════════════════════════════════════════

export interface LearningEvidence {
  buildId: string;
  outcome: string;
  weight: number;
}

export type LearningType = 'success' | 'failure' | 'pattern' | 'preference';

export interface Learning {
  id: string;
  type: LearningType;
  category: string;
  subject: string;
  learning: string;
  evidence: LearningEvidence[];
  confidence: number;
  relevance: number;
  learnedAt: Date;
  applicationCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface Prediction {
  id: string;
  type: string;
  description: string;
  confidence: number;
  createdAt: Date;
  expiresAt: Date;
  verified?: boolean;
  verifiedAt?: Date;
  data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVOLUTION TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export interface EvolutionRecord {
  id: string;
  type: string;
  timestamp: Date;
  oldValue: unknown;
  newValue: unknown;
  description: string;
  impactScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  messages: ConversationMessage[];
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  resolution?: string;
}

export interface SessionPatterns {
  buildPatterns: {
    averageBuildTime: number;
    averageAgentsUsed: number;
    preferredBuildTier: string;
    peakProductivityHours: number[];
    averageSessionDuration: number;
    buildsPerSession: number;
  };
  iterationPatterns: {
    averageIterationsPerBuild: number;
    commonIterationTypes: string[];
    iterationSuccessRate: number;
  };
  featureUsage: {
    usesConversion: boolean;
    usesTests: boolean;
    usesCi: boolean;
    usesAuth: boolean;
    usesPayments: boolean;
    usesAnalytics: boolean;
  };
  errorPatterns: ErrorPattern[];
  decisionPatterns: {
    decisionSpeed: 'fast' | 'moderate' | 'slow';
    revisesDecisions: boolean;
    prefersGuidance: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

export interface PreferenceEntry {
  value: unknown;
  confidence: number;
  source: 'explicit' | 'inferred' | 'default';
  lastUsed: Date;
  usageCount: number;
}

export interface StackPreferences {
  frontend: Record<string, PreferenceEntry>;
  backend: Record<string, PreferenceEntry>;
  database: Record<string, PreferenceEntry>;
  styling: Record<string, PreferenceEntry>;
  testing: Record<string, PreferenceEntry>;
  deployment: Record<string, PreferenceEntry>;
  [key: string]: Record<string, PreferenceEntry>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COGNITIVE SESSION (MAIN TYPE)
// ═══════════════════════════════════════════════════════════════════════════

export interface CognitiveSession {
  identity: UserIdentity;
  preferences: StackPreferences | Record<string, unknown>;
  patterns: SessionPatterns;
  builds: BuildRecord[];
  learnings: Learning[];
  predictions: Prediction[];
  evolution: EvolutionRecord[];
  conversations: Conversation[];
  version: number;
  lastUpdated: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExpertiseDetection {
  level: ExpertiseLevel;
  confidence: number;
  signals: string[];
}

export interface EvolutionSummary {
  totalChanges: number;
  recentChanges: EvolutionRecord[];
  netImpact: number;
  categories: Record<string, number>;
}

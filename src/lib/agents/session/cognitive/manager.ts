import { createHash } from 'crypto';
import { CognitiveEngine } from './engine';
import { CognitiveSession, BuildRecord, UserIdentity, Learning, StackPreferences } from './types';
import { trackError } from '@/lib/observability/error-tracker';
import {
  RELEVANCE_DECAY_PER_DAY,
  MIN_RELEVANCE_TO_KEEP,
  MIN_APPLICATIONS_TO_KEEP,
} from './constants';
import {
  validateBuildInput,
  validateFeedbackInput,
  validatePreferenceInput,
  validateCommunicationStyleInput,
  checkRateLimitForUser,
  pruneSessionToLimits,
  sanitizeUserId,
  type ValidatedBuildInput,
} from './validation';
import { enforceSessionLimits, checkSessionSize, aggressiveCleanup } from './limits';
import { sessionLockManager, OptimisticLockError } from './locking';

/**
 * Session access token for authorization
 */
interface SessionAccessToken {
  userId: string;
  hash: string;
  expiresAt: Date;
}

/**
 * COGNITIVE SESSION MANAGER
 *
 * The main interface for the cognitive session system.
 * Handles persistence, retrieval, and lifecycle.
 */
export class CognitiveSessionManager {
  private sessions: Map<string, { session: CognitiveSession; engine: CognitiveEngine }> = new Map();
  private persistenceLayer: CognitivePersistence;
  private accessTokens: Map<string, SessionAccessToken> = new Map();
  private readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(persistence?: CognitivePersistence) {
    this.persistenceLayer = persistence ?? new InMemoryCognitivePersistence();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL (PATCH 1)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate access token for a user session
   */
  generateAccessToken(userId: string, secret: string): string {
    const hash = createHash('sha256').update(`${userId}:${secret}:${Date.now()}`).digest('hex');

    this.accessTokens.set(hash, {
      userId,
      hash,
      expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_MS),
    });

    return hash;
  }

  /**
   * Validate access token and return userId
   */
  validateAccessToken(token: string): string | null {
    const access = this.accessTokens.get(token);

    if (!access) return null;
    if (access.expiresAt < new Date()) {
      this.accessTokens.delete(token);
      return null;
    }

    return access.userId;
  }

  /**
   * Revoke an access token
   */
  revokeAccessToken(token: string): boolean {
    return this.accessTokens.delete(token);
  }

  /**
   * Get session with access control
   */
  async getSessionSecure(
    token: string
  ): Promise<{ session: CognitiveSession; engine: CognitiveEngine } | null> {
    const userId = this.validateAccessToken(token);
    if (!userId) return null;

    return this.getSession(userId);
  }

  /**
   * Validate that requester can access this userId
   * In production, this would check JWT, session cookies, etc.
   */
  validateUserAccess(requesterId: string, targetUserId: string): boolean {
    // For now: users can only access their own sessions
    // In production: add admin bypass, team access, etc.
    return requesterId === targetUserId;
  }

  /**
   * Get or create a cognitive session
   */
  async getSession(userId: string): Promise<{
    session: CognitiveSession;
    engine: CognitiveEngine;
  }> {
    // Check cache
    if (this.sessions.has(userId)) {
      const cached = this.sessions.get(userId)!;
      // Enforce limits on cached session
      enforceSessionLimits(cached.session);
      return cached;
    }

    try {
      // Try to load from persistence
      let session = await this.persistenceLayer.load(userId);

      // Create new session if not found
      if (!session) {
        session = this.createNewSession(userId);
        await this.persistenceLayer.save(session);
      }

      // PATCH 3: Enforce limits after loading
      enforceSessionLimits(session);

      // Check session size and warn if approaching limits
      const sizeCheck = checkSessionSize(session);
      if (sizeCheck.warnings.length > 0) {
        console.warn(`[CognitiveSession] Size warnings for ${userId}:`, sizeCheck.warnings);

        // Aggressive cleanup if over 90%
        if (sizeCheck.percentUsed > 90) {
          aggressiveCleanup(session);
          await this.persistenceLayer.save(session);
        }
      }

      const engine = new CognitiveEngine(session);
      this.sessions.set(userId, { session, engine });

      return { session, engine };
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        type: 'system',
        metadata: { operation: 'getSession', userId },
      });
      // Return a new session on error
      const session = this.createNewSession(userId);
      const engine = new CognitiveEngine(session);
      return { session, engine };
    }
  }

  /**
   * Record a completed build and trigger learning
   * @throws Error if validation fails or rate limited
   */
  async recordBuild(userId: string, build: Omit<BuildRecord, 'id'>): Promise<void> {
    // Validate user ID
    const safeUserId = sanitizeUserId(userId);
    if (!safeUserId) {
      throw new Error('Invalid user ID format');
    }

    // Check rate limit
    const rateCheck = checkRateLimitForUser(safeUserId, 'BUILDS_PER_MINUTE');
    if (!rateCheck.allowed) {
      throw new Error(
        `Rate limited. Retry after ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s`
      );
    }

    // Validate build input
    const validation = validateBuildInput(build);
    if (!validation.success) {
      throw new Error(validation.error || 'Invalid build data');
    }

    const { session, engine } = await this.getSession(safeUserId);

    // Add build to history
    const fullBuild: BuildRecord = {
      ...validation.data!,
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
    session.builds.push(fullBuild);

    // PATCH 3: Enforce session limits
    enforceSessionLimits(session);
    pruneSessionToLimits(session);

    // Extract learnings
    const newLearnings = engine.extractLearnings(fullBuild);
    session.learnings.push(...newLearnings);

    // Update patterns
    session.patterns = engine.analyzePatterns();

    // Update expertise detection
    const expertise = await engine.detectExpertise();
    if (expertise.confidence > session.identity.expertiseConfidence) {
      engine.recordEvolution(
        'expertise_detection',
        session.identity.expertiseLevel,
        expertise.level,
        `Detected from: ${expertise.signals.join(', ')}`,
        expertise.level === session.identity.expertiseLevel ? 0 : 0.5
      );
      session.identity.expertiseLevel = expertise.level;
      session.identity.expertiseConfidence = expertise.confidence;
    }

    // Update predictions
    session.predictions = engine.generatePredictions();

    // Update identity stats
    session.identity.totalBuilds++;
    session.identity.lastSeen = new Date();
    session.lastUpdated = new Date();

    // Persist
    await this.persistenceLayer.save(session);
  }

  /**
   * Get rich context for agent execution
   */
  async getAgentContext(userId: string): Promise<Record<string, unknown>> {
    const { engine } = await this.getSession(userId);
    return engine.generateAgentContext();
  }

  /**
   * Get personalized prompt addition
   */
  async getPersonalizedPrompt(userId: string): Promise<string> {
    const { engine } = await this.getSession(userId);
    return engine.generatePersonalizedPrompt();
  }

  /**
   * Set explicit user preference
   * @throws Error if validation fails or rate limited
   */
  async setPreference(
    userId: string,
    category: keyof StackPreferences,
    key: string,
    value: unknown
  ): Promise<void> {
    // Validate user ID
    const safeUserId = sanitizeUserId(userId);
    if (!safeUserId) {
      throw new Error('Invalid user ID format');
    }

    // Check rate limit
    const rateCheck = checkRateLimitForUser(safeUserId, 'PREFERENCES_PER_MINUTE');
    if (!rateCheck.allowed) {
      throw new Error(
        `Rate limited. Retry after ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s`
      );
    }

    // Validate input
    const validation = validatePreferenceInput({ category, key, value });
    if (!validation.success) {
      throw new Error(validation.error || 'Invalid preference data');
    }

    const { session, engine } = await this.getSession(safeUserId);

    // Create preference object with explicit source
    const pref = {
      value,
      confidence: 1.0, // Explicit = full confidence
      source: 'explicit' as const,
      lastUsed: new Date(),
      usageCount: 1,
    };

    // Initialize category if needed
    if (!session.preferences[category]) {
      (session.preferences as Record<string, unknown>)[category] = {};
    }

    // Set in preferences
    const categoryObj = session.preferences[category] as Record<string, unknown>;
    categoryObj[key] = pref;

    // Record evolution
    engine.recordEvolution(
      'preference_accuracy',
      undefined,
      { category, key, value },
      `User explicitly set ${category}.${key}`,
      0.2
    );

    session.lastUpdated = new Date();
    await this.persistenceLayer.save(session);
  }

  /**
   * Record user feedback on a build
   * @throws Error if validation fails or rate limited
   */
  async recordFeedback(
    userId: string,
    buildId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    // Validate user ID
    const safeUserId = sanitizeUserId(userId);
    if (!safeUserId) {
      throw new Error('Invalid user ID format');
    }

    // Check rate limit
    const rateCheck = checkRateLimitForUser(safeUserId, 'FEEDBACK_PER_MINUTE');
    if (!rateCheck.allowed) {
      throw new Error(
        `Rate limited. Retry after ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)}s`
      );
    }

    // Validate input
    const validation = validateFeedbackInput({ buildId, rating, feedback });
    if (!validation.success) {
      throw new Error(validation.error || 'Invalid feedback data');
    }

    const { session, engine } = await this.getSession(safeUserId);

    const build = session.builds.find(b => b.id === buildId);
    if (build) {
      build.userRating = rating;
      build.userFeedback = feedback;

      // Update preference confidence based on feedback
      if (rating >= 4) {
        // Positive feedback - increase confidence in stack choices
        for (const [key] of Object.entries(build.stack)) {
          engine.updatePreferenceFromOutcome('frontend', key, 'success');
          engine.updatePreferenceFromOutcome('backend', key, 'success');
        }

        // Add success learning
        session.learnings.push({
          id: `learning_feedback_${Date.now()}`,
          type: 'success',
          category: 'feedback',
          subject: build.buildType,
          learning: `User rated ${build.buildType} build ${rating}/5: ${feedback || 'No comment'}`,
          evidence: [{ buildId, outcome: 'positive', weight: 1.0 }],
          confidence: 0.9,
          relevance: 1.0,
          learnedAt: new Date(),
          applicationCount: 0,
        });
      } else if (rating <= 2) {
        // Negative feedback - decrease confidence
        for (const [key] of Object.entries(build.stack)) {
          engine.updatePreferenceFromOutcome('frontend', key, 'failure');
          engine.updatePreferenceFromOutcome('backend', key, 'failure');
        }

        // Add failure learning
        session.learnings.push({
          id: `learning_feedback_${Date.now()}`,
          type: 'failure',
          category: 'feedback',
          subject: build.buildType,
          learning: `User rated ${build.buildType} build ${rating}/5: ${feedback || 'No comment'}`,
          evidence: [{ buildId, outcome: 'negative', weight: 1.0 }],
          confidence: 0.9,
          relevance: 1.0,
          learnedAt: new Date(),
          applicationCount: 0,
        });
      }

      session.lastUpdated = new Date();
      await this.persistenceLayer.save(session);
    }
  }

  /**
   * Verify a prediction (track accuracy)
   */
  async verifyPrediction(userId: string, predictionId: string, wasCorrect: boolean): Promise<void> {
    const { session, engine } = await this.getSession(userId);

    const prediction = session.predictions.find(p => p.id === predictionId);
    if (prediction) {
      prediction.verified = wasCorrect;
      prediction.verifiedAt = new Date();

      engine.recordEvolution(
        'prediction_quality',
        prediction.confidence,
        wasCorrect
          ? Math.min(1, prediction.confidence + 0.05)
          : Math.max(0, prediction.confidence - 0.1),
        `Prediction ${wasCorrect ? 'correct' : 'incorrect'}: ${prediction.type}`,
        wasCorrect ? 0.1 : -0.1
      );

      session.lastUpdated = new Date();
      await this.persistenceLayer.save(session);
    }
  }

  /**
   * Run periodic maintenance
   */
  async maintenance(userId: string): Promise<void> {
    const { session, engine } = await this.getSession(userId);

    // Consolidate learnings
    engine.consolidateLearnings();

    // Decay old learning relevance - older learnings become less relevant
    const now = Date.now();
    for (const learning of session.learnings) {
      const ageInDays = (now - learning.learnedAt.getTime()) / (1000 * 60 * 60 * 24);
      learning.relevance = Math.max(
        MIN_RELEVANCE_TO_KEEP,
        learning.relevance - ageInDays * RELEVANCE_DECAY_PER_DAY
      );
    }

    // Remove expired predictions - keep only actionable predictions
    session.predictions = session.predictions.filter(p => p.expiresAt > new Date());

    // Prune learnings that are both low-relevance AND rarely used
    session.learnings = session.learnings.filter(
      (l: Learning) =>
        l.relevance > MIN_RELEVANCE_TO_KEEP || l.applicationCount > MIN_APPLICATIONS_TO_KEEP
    );

    session.lastUpdated = new Date();
    await this.persistenceLayer.save(session);
  }

  /**
   * Get user dashboard data
   */
  async getDashboard(userId: string): Promise<{
    identity: UserIdentity;
    stats: {
      totalBuilds: number;
      successRate: number;
      averageBuildTime: number;
      totalTokensUsed: number;
      totalCost: number;
    };
    topLearnings: Learning[];
    evolution: ReturnType<CognitiveEngine['getEvolutionSummary']>;
    predictions: CognitiveSession['predictions'];
  }> {
    const { session, engine } = await this.getSession(userId);

    const successfulBuilds = session.builds.filter((b: BuildRecord) => b.success);
    const totalTokens = session.builds.reduce(
      (sum: number, b: BuildRecord) => sum + b.totalTokens,
      0
    );
    const totalCost = session.builds.reduce((sum: number, b: BuildRecord) => sum + b.totalCost, 0);
    const totalTime = session.builds.reduce(
      (sum: number, b: BuildRecord) => sum + b.totalDuration,
      0
    );

    return {
      identity: session.identity,
      stats: {
        totalBuilds: session.builds.length,
        successRate:
          session.builds.length > 0 ? successfulBuilds.length / session.builds.length : 0,
        averageBuildTime: session.builds.length > 0 ? totalTime / session.builds.length : 0,
        totalTokensUsed: totalTokens,
        totalCost: totalCost,
      },
      topLearnings: session.learnings
        .filter((l: Learning) => l.confidence > 0.6)
        .sort((a: Learning, b: Learning) => b.relevance - a.relevance)
        .slice(0, 5),
      evolution: engine.getEvolutionSummary(),
      predictions: session.predictions.filter(p => p.expiresAt > new Date()),
    };
  }

  /**
   * Update communication style
   * @throws Error if validation fails
   */
  async updateCommunicationStyle(
    userId: string,
    style: Partial<UserIdentity['communicationStyle']>
  ): Promise<void> {
    // Validate user ID
    const safeUserId = sanitizeUserId(userId);
    if (!safeUserId) {
      throw new Error('Invalid user ID format');
    }

    // Validate input
    const validation = validateCommunicationStyleInput(style);
    if (!validation.success) {
      throw new Error(validation.error || 'Invalid communication style data');
    }

    const { session, engine } = await this.getSession(safeUserId);

    const previousStyle = { ...session.identity.communicationStyle };
    session.identity.communicationStyle = {
      ...session.identity.communicationStyle,
      ...style,
    };

    engine.recordEvolution(
      'communication_style',
      previousStyle,
      session.identity.communicationStyle,
      'User updated communication preferences',
      0.1
    );

    session.lastUpdated = new Date();
    await this.persistenceLayer.save(session);
  }

  /**
   * Add domain expertise
   */
  async addDomainExpertise(userId: string, domain: string, proficiency: number): Promise<void> {
    const { session } = await this.getSession(userId);

    const existing = session.identity.domainExpertise.find(
      (d: { domain: string; proficiency: number; projectCount: number }) => d.domain === domain
    );
    if (existing) {
      existing.proficiency = proficiency;
      existing.projectCount++;
    } else {
      session.identity.domainExpertise.push({
        domain,
        proficiency,
        projectCount: 1,
      });
    }

    session.lastUpdated = new Date();
    await this.persistenceLayer.save(session);
  }

  /**
   * Clear session (for testing or user request)
   */
  async clearSession(userId: string): Promise<boolean> {
    this.sessions.delete(userId);
    return this.persistenceLayer.delete(userId);
  }

  private createNewSession(userId: string): CognitiveSession {
    const now = new Date();
    return {
      identity: {
        userId,
        expertiseLevel: 'intermediate', // Default
        expertiseConfidence: 0.1,
        domainExpertise: [],
        communicationStyle: {
          verbosity: 'balanced',
          technicalDepth: 'standard',
          preferredExamples: 'brief',
          responseFormat: 'structured',
        },
        firstSeen: now,
        lastSeen: now,
        totalSessions: 1,
        totalBuilds: 0,
      },
      preferences: {},
      patterns: {
        buildPatterns: {
          averageBuildTime: 0,
          averageAgentsUsed: 0,
          preferredBuildTier: 'starter',
          peakProductivityHours: [],
          averageSessionDuration: 0,
          buildsPerSession: 0,
        },
        iterationPatterns: {
          averageIterationsPerBuild: 0,
          commonIterationTypes: [],
          iterationSuccessRate: 0,
        },
        featureUsage: {
          usesConversion: false,
          usesTests: false,
          usesCi: false,
          usesAuth: false,
          usesPayments: false,
          usesAnalytics: false,
        },
        errorPatterns: [],
        decisionPatterns: {
          decisionSpeed: 'moderate',
          revisesDecisions: false,
          prefersGuidance: true,
        },
      },
      builds: [],
      learnings: [],
      predictions: [],
      evolution: [],
      conversations: [],
      version: 1,
      lastUpdated: now,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface CognitivePersistence {
  load(userId: string): Promise<CognitiveSession | null>;
  save(session: CognitiveSession): Promise<void>;
  delete(userId: string): Promise<boolean>;
}

export class InMemoryCognitivePersistence implements CognitivePersistence {
  private store: Map<string, CognitiveSession> = new Map();

  async load(userId: string): Promise<CognitiveSession | null> {
    return this.store.get(userId) ?? null;
  }

  async save(session: CognitiveSession): Promise<void> {
    session.lastUpdated = new Date();
    // Deep clone to prevent mutation issues
    this.store.set(session.identity.userId, JSON.parse(JSON.stringify(session)));
  }

  async delete(userId: string): Promise<boolean> {
    return this.store.delete(userId);
  }
}

// Export singleton
export const cognitiveSessionManager = new CognitiveSessionManager();

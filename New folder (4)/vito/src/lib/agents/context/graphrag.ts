/**
 * OLYMPUS 2.0 - GraphRAG Context Manager
 *
 * Unified context retrieval using:
 * - Neo4j: User preferences, relationships, project history
 * - Qdrant: Semantic search for similar prompts/code
 * - MongoDB: Build history, chat logs, agent outputs
 * - Redis: Caching layer for fast retrieval
 *
 * This is the "Brand Memory" - OLYMPUS remembers every user.
 */

import * as neo4j from '../../db/neo4j';
import * as qdrant from '../../db/qdrant';
import * as mongodb from '../../db/mongodb';
import * as redis from '../../db/redis';

// ============================================
// TYPES
// ============================================

/**
 * User preferences from Neo4j
 */
export interface UserPreferences {
  theme?: 'light' | 'dark';
  accentColor?: string;
  fontPreference?: string;
  stylePreference?: string;
  industries?: string[];
}

/**
 * Similar prompt from Qdrant semantic search
 */
export interface SimilarPrompt {
  prompt: string;
  outcome: 'success' | 'failure';
  similarity: number;
  projectId?: string;
}

/**
 * Build summary from MongoDB
 */
export interface BuildSummary {
  buildId: string;
  projectId: string;
  prompt: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Complete user context for agent personalization
 */
export interface UserContext {
  userId: string;
  preferences: UserPreferences;
  recentBuilds: BuildSummary[];
  similarPrompts: SimilarPrompt[];
  industries: string[];
  successRate: number;
  totalBuilds: number;
  cachedAt?: Date;
}

/**
 * Context retrieval options
 */
export interface ContextOptions {
  includePromptSearch?: boolean;
  promptEmbedding?: number[];
  maxSimilarPrompts?: number;
  maxRecentBuilds?: number;
  skipCache?: boolean;
  cacheTTL?: number;
}

// ============================================
// REDIS CACHE HELPERS
// ============================================

const CONTEXT_CACHE_PREFIX = 'context:user:';
const DEFAULT_CACHE_TTL = 300; // 5 minutes

/**
 * Get cached user context from Redis
 */
async function getCachedContext(userId: string): Promise<UserContext | null> {
  try {
    return await redis.getCache<UserContext>(`${CONTEXT_CACHE_PREFIX}${userId}`);
  } catch {
    // Redis might not be available
    return null;
  }
}

/**
 * Cache user context in Redis
 */
async function cacheContext(
  userId: string,
  context: UserContext,
  ttlSeconds: number = DEFAULT_CACHE_TTL
): Promise<void> {
  try {
    await redis.setCache(
      `${CONTEXT_CACHE_PREFIX}${userId}`,
      { ...context, cachedAt: new Date() },
      ttlSeconds
    );
  } catch {
    // Redis might not be available - continue without caching
  }
}

/**
 * Invalidate user context cache
 */
async function invalidateContextCache(userId: string): Promise<void> {
  try {
    await redis.deleteCache(`${CONTEXT_CACHE_PREFIX}${userId}`);
  } catch {
    // Redis might not be available
  }
}

// ============================================
// CONTEXT MANAGER CLASS
// ============================================

/**
 * GraphRAG Context Manager
 *
 * Orchestrates context retrieval from multiple databases
 * to provide personalized, intelligent agent responses.
 */
export class GraphRAGContextManager {
  private defaultOptions: ContextOptions = {
    includePromptSearch: true,
    maxSimilarPrompts: 5,
    maxRecentBuilds: 10,
    skipCache: false,
    cacheTTL: DEFAULT_CACHE_TTL,
  };

  /**
   * Get complete user context
   */
  async getUserContext(
    userId: string,
    options: ContextOptions = {}
  ): Promise<UserContext> {
    const opts = { ...this.defaultOptions, ...options };

    // Check cache first (unless skipCache is set)
    if (!opts.skipCache) {
      const cached = await getCachedContext(userId);
      if (cached) {
        console.log(`[GraphRAG] Cache hit for user: ${userId}`);
        return cached;
      }
    }

    console.log(`[GraphRAG] Building context for user: ${userId}`);

    // Gather context from all sources in parallel
    const [
      neo4jContext,
      buildHistory,
      similarPrompts,
    ] = await Promise.all([
      this.getNeo4jContext(userId),
      this.getMongoDBContext(userId, opts.maxRecentBuilds || 10),
      opts.includePromptSearch && opts.promptEmbedding
        ? this.getQdrantContext(opts.promptEmbedding, userId, opts.maxSimilarPrompts || 5)
        : Promise.resolve([]),
    ]);

    // Calculate success rate
    const completedBuilds = buildHistory.filter(b => b.status === 'completed').length;
    const totalBuilds = buildHistory.length;
    const successRate = totalBuilds > 0 ? completedBuilds / totalBuilds : 0;

    // Build complete context
    const context: UserContext = {
      userId,
      preferences: neo4jContext.preferences,
      industries: neo4jContext.industries,
      recentBuilds: buildHistory,
      similarPrompts,
      successRate,
      totalBuilds,
    };

    // Cache the context
    await cacheContext(userId, context, opts.cacheTTL);

    return context;
  }

  /**
   * Get user preferences and relationships from Neo4j
   */
  private async getNeo4jContext(userId: string): Promise<{
    preferences: UserPreferences;
    industries: string[];
  }> {
    try {
      const context = await neo4j.getUserContext(userId);

      // Extract properties from Neo4j node (handles both raw nodes and plain objects)
      let preferences: UserPreferences = {};
      if (context.preferences) {
        // If it's a Neo4j node, extract properties
        if (context.preferences.properties) {
          preferences = {
            theme: context.preferences.properties.theme,
            accentColor: context.preferences.properties.accentColor,
            fontPreference: context.preferences.properties.fontPreference,
            stylePreference: context.preferences.properties.stylePreference,
          };
        } else {
          // Already a plain object
          preferences = context.preferences;
        }
      }

      return {
        preferences,
        industries: context.industries || [],
      };
    } catch (error) {
      console.error(`[GraphRAG] Neo4j context error for ${userId}:`, error);
      return {
        preferences: {},
        industries: [],
      };
    }
  }

  /**
   * Get build history from MongoDB
   */
  private async getMongoDBContext(
    userId: string,
    limit: number
  ): Promise<BuildSummary[]> {
    try {
      const builds = await mongodb.getBuildHistory(userId, limit);

      return builds.map(b => ({
        buildId: b.buildId,
        projectId: b.projectId,
        prompt: b.prompt,
        status: b.status,
        startedAt: b.startedAt,
        completedAt: b.completedAt,
      }));
    } catch (error) {
      console.error(`[GraphRAG] MongoDB context error for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get similar prompts from Qdrant vector search
   */
  private async getQdrantContext(
    embedding: number[],
    userId: string,
    limit: number
  ): Promise<SimilarPrompt[]> {
    try {
      const similar = await qdrant.findSimilarPrompts(embedding, limit, userId);

      return similar.map(s => ({
        prompt: s.prompt,
        outcome: s.outcome as 'success' | 'failure',
        similarity: s.similarity,
      }));
    } catch (error) {
      console.error(`[GraphRAG] Qdrant context error for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Update user preferences in Neo4j
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    await neo4j.setUserPreferences(userId, preferences);
    await invalidateContextCache(userId);
    console.log(`[GraphRAG] Updated preferences for user: ${userId}`);
  }

  /**
   * Record a new build (updates all databases)
   */
  async recordBuild(
    userId: string,
    projectId: string,
    buildId: string,
    prompt: string,
    embedding?: number[]
  ): Promise<void> {
    // Record in Neo4j (relationships)
    await neo4j.recordBuild(userId, projectId, buildId, prompt);

    // Record in MongoDB (history)
    await mongodb.logBuild(buildId, userId, projectId, prompt);

    // Store embedding in Qdrant (for future similarity search)
    if (embedding) {
      await qdrant.storePromptEmbedding(userId, projectId, prompt, embedding);
    }

    // Invalidate cache
    await invalidateContextCache(userId);

    console.log(`[GraphRAG] Recorded build ${buildId} for user: ${userId}`);
  }

  /**
   * Update build outcome (for learning)
   */
  async updateBuildOutcome(
    buildId: string,
    userId: string,
    status: 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    await mongodb.updateBuildStatus(buildId, status, error);
    await invalidateContextCache(userId);

    console.log(`[GraphRAG] Updated build ${buildId} outcome: ${status}`);
  }

  /**
   * Get context summary for agent prompt injection
   */
  async getContextSummary(userId: string): Promise<string> {
    const context = await this.getUserContext(userId, {
      includePromptSearch: false,
      maxRecentBuilds: 5,
    });

    const parts: string[] = [];

    // User preferences
    if (Object.keys(context.preferences).length > 0) {
      parts.push(`User Preferences: ${JSON.stringify(context.preferences)}`);
    }

    // Industries
    if (context.industries.length > 0) {
      parts.push(`Industries: ${context.industries.join(', ')}`);
    }

    // Recent activity
    if (context.totalBuilds > 0) {
      parts.push(`Build History: ${context.totalBuilds} builds, ${(context.successRate * 100).toFixed(0)}% success rate`);
    }

    // Recent prompts (for context)
    if (context.recentBuilds.length > 0) {
      const recentPrompts = context.recentBuilds
        .slice(0, 3)
        .map(b => `- "${b.prompt.substring(0, 100)}..."`)
        .join('\n');
      parts.push(`Recent Requests:\n${recentPrompts}`);
    }

    return parts.length > 0
      ? `[User Context]\n${parts.join('\n\n')}`
      : '[New User - No Previous Context]';
  }

  /**
   * Ensure user exists in the system
   */
  async ensureUser(
    userId: string,
    email: string,
    displayName?: string
  ): Promise<void> {
    await neo4j.upsertUser(userId, email, displayName);
    console.log(`[GraphRAG] Ensured user exists: ${userId}`);
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await invalidateContextCache(userId);
    console.log(`[GraphRAG] Invalidated cache for user: ${userId}`);
  }
}

// ============================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================

let contextManagerInstance: GraphRAGContextManager | null = null;

/**
 * Get context manager instance (singleton)
 */
export function getContextManager(): GraphRAGContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new GraphRAGContextManager();
  }
  return contextManagerInstance;
}

/**
 * Quick context retrieval
 */
export async function getUserContext(
  userId: string,
  options?: ContextOptions
): Promise<UserContext> {
  return await getContextManager().getUserContext(userId, options);
}

/**
 * Quick context summary for prompts
 */
export async function getContextSummary(userId: string): Promise<string> {
  return await getContextManager().getContextSummary(userId);
}

/**
 * Record a build
 */
export async function recordBuild(
  userId: string,
  projectId: string,
  buildId: string,
  prompt: string,
  embedding?: number[]
): Promise<void> {
  return await getContextManager().recordBuild(
    userId,
    projectId,
    buildId,
    prompt,
    embedding
  );
}

export default GraphRAGContextManager;

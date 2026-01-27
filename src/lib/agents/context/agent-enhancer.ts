/**
 * OLYMPUS 2.0 - Agent Context Enhancer
 *
 * Integrates GraphRAG context with agent execution:
 * - Retrieves user preferences and history
 * - Finds similar prompts/patterns via embeddings
 * - Injects personalized context into agent prompts
 * - Records learned patterns for future builds
 */

import { getContextManager, getUserContext, type UserContext } from './graphrag';
import { embed, quickEmbed } from '../embeddings';
import * as neo4j from '../../db/neo4j';
import * as qdrant from '../../db/qdrant';
import * as mongodb from '../../db/mongodb';

// ============================================
// TYPES
// ============================================

export interface EnhancedContext {
  userId: string;
  userContext: UserContext;
  similarPrompts: Array<{
    prompt: string;
    outcome: string;
    similarity: number;
  }>;
  recommendedPatterns: Array<{
    name: string;
    description: string;
    similarity: number;
  }>;
  recommendedComponents: Array<{
    name: string;
    description: string;
    similarity: number;
  }>;
  contextSummary: string;
}

export interface AgentExecutionRecord {
  buildId: string;
  userId: string;
  agentId: string;
  prompt: string;
  output: string;
  model: string;
  tokens: number;
  latencyMs: number;
  success: boolean;
}

export interface LearnedPattern {
  userId: string;
  buildId: string;
  patternType: 'component' | 'layout' | 'style' | 'interaction';
  name: string;
  description: string;
}

// ============================================
// CONTEXT ENHANCEMENT
// ============================================

/**
 * Enhance agent context with GraphRAG data
 */
export async function enhanceAgentContext(
  userId: string,
  prompt: string,
  options: {
    includeEmbeddingSearch?: boolean;
    maxSimilarPrompts?: number;
    maxPatterns?: number;
    maxComponents?: number;
  } = {}
): Promise<EnhancedContext> {
  const {
    includeEmbeddingSearch = true,
    maxSimilarPrompts = 5,
    maxPatterns = 3,
    maxComponents = 5,
  } = options;

  // Get basic user context
  const userContext = await getUserContext(userId);

  // Initialize default results
  let similarPrompts: EnhancedContext['similarPrompts'] = [];
  let recommendedPatterns: EnhancedContext['recommendedPatterns'] = [];
  let recommendedComponents: EnhancedContext['recommendedComponents'] = [];

  // If embedding search is enabled, find similar content
  if (includeEmbeddingSearch) {
    try {
      const embeddingResult = await embed(prompt);
      const embedding = embeddingResult.embedding;

      // Search in parallel
      const [prompts, patterns, components] = await Promise.all([
        qdrant.findSimilarPrompts(embedding, maxSimilarPrompts, userId),
        qdrant.findSimilarDesignPatterns(embedding, maxPatterns),
        qdrant.findSimilarComponents(embedding, maxComponents),
      ]);

      // Filter by minimum similarity threshold
      const MIN_SIMILARITY = 0.3;

      similarPrompts = prompts
        .filter(p => p.similarity >= MIN_SIMILARITY)
        .map(p => ({
          prompt: p.prompt,
          outcome: p.outcome,
          similarity: p.similarity,
        }));

      recommendedPatterns = patterns
        .filter(p => p.similarity >= MIN_SIMILARITY)
        .map(p => ({
          name: p.patternName,
          description: p.description,
          similarity: p.similarity,
        }));

      recommendedComponents = components
        .filter(c => c.similarity >= MIN_SIMILARITY)
        .map(c => ({
          name: c.componentName,
          description: c.description,
          similarity: c.similarity,
        }));
    } catch (error) {
      console.error('[AgentEnhancer] Embedding search failed:', error);
      // Continue without embedding results
    }
  }

  // Build context summary for injection
  const contextSummary = buildContextSummary(
    userContext,
    similarPrompts,
    recommendedPatterns,
    recommendedComponents
  );

  return {
    userId,
    userContext,
    similarPrompts,
    recommendedPatterns,
    recommendedComponents,
    contextSummary,
  };
}

/**
 * Build a text summary for agent prompt injection
 */
function buildContextSummary(
  userContext: UserContext,
  similarPrompts: EnhancedContext['similarPrompts'],
  patterns: EnhancedContext['recommendedPatterns'],
  components: EnhancedContext['recommendedComponents']
): string {
  const parts: string[] = [];

  // User preferences
  if (Object.keys(userContext.preferences).length > 0) {
    const prefs = userContext.preferences;
    const prefParts: string[] = [];
    if (prefs.theme) prefParts.push(`Theme: ${prefs.theme}`);
    if (prefs.accentColor) prefParts.push(`Accent: ${prefs.accentColor}`);
    if (prefs.stylePreference) prefParts.push(`Style: ${prefs.stylePreference}`);
    if (prefParts.length > 0) {
      parts.push(`[User Preferences]\n${prefParts.join(', ')}`);
    }
  }

  // Industries
  if (userContext.industries.length > 0) {
    parts.push(`[Industry Focus]\n${userContext.industries.join(', ')}`);
  }

  // Build history
  if (userContext.totalBuilds > 0) {
    parts.push(
      `[History]\n${userContext.totalBuilds} builds, ${(userContext.successRate * 100).toFixed(0)}% success rate`
    );
  }

  // Similar successful prompts
  const successfulPrompts = similarPrompts.filter(p => p.outcome === 'success');
  if (successfulPrompts.length > 0) {
    const promptList = successfulPrompts
      .slice(0, 3)
      .map(p => `- "${p.prompt.substring(0, 80)}..." (${(p.similarity * 100).toFixed(0)}% match)`)
      .join('\n');
    parts.push(`[Similar Successful Builds]\n${promptList}`);
  }

  // Recommended patterns
  if (patterns.length > 0) {
    const patternList = patterns
      .slice(0, 3)
      .map(p => `- ${p.name}: ${p.description}`)
      .join('\n');
    parts.push(`[Recommended Patterns]\n${patternList}`);
  }

  // Recommended components
  if (components.length > 0) {
    const componentList = components
      .slice(0, 3)
      .map(c => `- ${c.name}: ${c.description}`)
      .join('\n');
    parts.push(`[Relevant Components]\n${componentList}`);
  }

  return parts.length > 0
    ? `=== PERSONALIZED CONTEXT ===\n\n${parts.join('\n\n')}\n\n=== END CONTEXT ===`
    : '';
}

// ============================================
// AGENT EXECUTION TRACKING
// ============================================

/**
 * Record agent execution for learning
 */
export async function recordAgentExecution(record: AgentExecutionRecord): Promise<void> {
  // Log to MongoDB
  await mongodb.logAgentOutput(
    record.buildId,
    record.agentId,
    record.agentId, // agentName same as agentId for now
    record.prompt,
    record.output,
    record.model,
    record.tokens,
    record.latencyMs
  );

  // If successful, store the prompt embedding for future similarity search
  if (record.success) {
    try {
      const embedding = await quickEmbed(record.prompt);
      await qdrant.storePromptEmbedding(
        record.userId,
        record.buildId,
        record.prompt,
        embedding,
        'success'
      );
    } catch (error) {
      console.error('[AgentEnhancer] Failed to store prompt embedding:', error);
    }
  }
}

// ============================================
// PATTERN LEARNING
// ============================================

/**
 * Record a learned pattern from a build
 */
export async function recordLearnedPattern(pattern: LearnedPattern): Promise<void> {
  // Store in Neo4j (relationships)
  await neo4j.recordLearnedComponent(
    pattern.userId,
    pattern.name,
    pattern.patternType,
    pattern.buildId
  );

  // Store embedding for similarity search
  try {
    const embedding = await quickEmbed(pattern.description);
    await qdrant.storeDesignPatternEmbedding(
      pattern.name,
      pattern.description,
      embedding,
      pattern.patternType
    );
  } catch (error) {
    console.error('[AgentEnhancer] Failed to store pattern embedding:', error);
  }
}

/**
 * Record a learned component from a build
 */
export async function recordLearnedComponent(
  userId: string,
  buildId: string,
  componentName: string,
  componentType: string,
  description: string,
  props?: string[],
  codeSnippet?: string
): Promise<void> {
  // Store in Neo4j
  await neo4j.recordLearnedComponent(userId, componentName, componentType, buildId);

  // Store embedding for similarity search
  try {
    const embedding = await quickEmbed(description);
    await qdrant.storeComponentEmbedding(
      componentName,
      description,
      embedding,
      componentType,
      props,
      codeSnippet
    );
  } catch (error) {
    console.error('[AgentEnhancer] Failed to store component embedding:', error);
  }
}

// ============================================
// FEEDBACK RECORDING
// ============================================

/**
 * Record user feedback on a build
 */
export async function recordBuildFeedback(
  userId: string,
  buildId: string,
  feedback: string,
  sentiment: 'positive' | 'negative' | 'neutral',
  category?: string
): Promise<void> {
  // Store embedding for learning
  try {
    const embedding = await quickEmbed(feedback);
    await qdrant.storeFeedbackEmbedding(userId, buildId, feedback, embedding, sentiment, category);
  } catch (error) {
    console.error('[AgentEnhancer] Failed to store feedback embedding:', error);
  }

  // Update build outcome in context manager
  const cm = getContextManager();
  if (sentiment === 'positive') {
    await cm.updateBuildOutcome(buildId, userId, 'completed');
  } else if (sentiment === 'negative') {
    await cm.updateBuildOutcome(buildId, userId, 'failed', feedback);
  }
}

// ============================================
// PREFERENCE UPDATES
// ============================================

/**
 * Update user preferences based on build results
 */
export async function updateUserPreferencesFromBuild(
  userId: string,
  buildId: string,
  techUsed: string[],
  designPattern?: string,
  stylePreference?: string
): Promise<void> {
  // Record tech preferences
  for (const tech of techUsed) {
    await neo4j.setUserTechPreference(userId, tech, 1.0);
  }

  // Record project tech
  await neo4j.recordProjectTech(buildId, techUsed);

  // Update design pattern preference
  if (designPattern) {
    await neo4j.setUserDesignPattern(userId, designPattern, 1.0);
  }

  // Update style preference
  if (stylePreference) {
    const cm = getContextManager();
    await cm.updatePreferences(userId, { stylePreference });
  }
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export default {
  enhanceAgentContext,
  recordAgentExecution,
  recordLearnedPattern,
  recordLearnedComponent,
  recordBuildFeedback,
  updateUserPreferencesFromBuild,
};

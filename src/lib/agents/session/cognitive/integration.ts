/**
 * OLYMPUS 2.0 - Cognitive Session Integration
 *
 * Helper functions for integrating cognitive sessions
 * into the agent execution pipeline.
 */

import { cognitiveSessionManager } from './manager';
import type { BuildRecord, CognitiveSession } from './types';

/**
 * Wrap an agent execution with cognitive context
 * Provides personalized prompt and preferences to the agent
 */
export async function withCognitiveContext<T>(
  userId: string,
  fn: (context: Record<string, unknown>) => Promise<T>
): Promise<T> {
  const context = await cognitiveSessionManager.getAgentContext(userId);
  return fn(context);
}

/**
 * Record a completed build in the cognitive session
 */
export async function onBuildComplete(
  userId: string,
  build: Omit<BuildRecord, 'id'>
): Promise<void> {
  await cognitiveSessionManager.recordBuild(userId, build);
}

/**
 * Get smart suggestions based on user history
 */
export async function getSmartSuggestions(userId: string): Promise<{
  suggestedBuildType: string | null;
  suggestedStack: Record<string, string>;
  tips: string[];
}> {
  const { session, engine } = await cognitiveSessionManager.getSession(userId);

  // Suggest build type from recent patterns
  const recentBuilds = session.builds.slice(-10);
  const typeCounts: Record<string, number> = {};
  for (const build of recentBuilds) {
    typeCounts[build.buildType] = (typeCounts[build.buildType] || 0) + 1;
  }
  const topType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];

  // Suggest stack from preferences
  const suggestedStack: Record<string, string> = {};
  const prefs = session.preferences as Record<string, Record<string, { value: unknown; confidence: number }>>;
  for (const [category, entries] of Object.entries(prefs)) {
    if (typeof entries !== 'object' || entries === null) continue;
    const topPref = Object.entries(entries)
      .filter(([, v]) => typeof v === 'object' && v !== null && 'confidence' in v)
      .sort(([, a], [, b]) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    if (topPref && topPref[1].confidence > 0.5) {
      suggestedStack[category] = String(topPref[1].value);
    }
  }

  // Generate tips
  const tips: string[] = [];
  const context = engine.generateAgentContext();
  if ((context.successRate as number) < 0.5 && session.builds.length > 5) {
    tips.push('Consider simplifying your builds for better success rates.');
  }
  if (!session.patterns.featureUsage.usesTests) {
    tips.push('Adding tests can improve build reliability.');
  }
  if (session.identity.expertiseLevel === 'beginner') {
    tips.push('Try starting with starter-tier builds to build confidence.');
  }

  return {
    suggestedBuildType: topType?.[0] ?? null,
    suggestedStack,
    tips,
  };
}

/**
 * Get prefilled configuration based on user history
 */
export async function getPrefilledConfig(userId: string): Promise<{
  buildType: string;
  stack: Record<string, unknown>;
  tier: string;
}> {
  const { session } = await cognitiveSessionManager.getSession(userId);

  const lastBuild = session.builds[session.builds.length - 1];

  return {
    buildType: lastBuild?.buildType ?? 'webapp',
    stack: lastBuild?.stack ?? {},
    tier: session.patterns.buildPatterns.preferredBuildTier,
  };
}

/**
 * Record an iteration on a build
 */
export async function recordIteration(
  userId: string,
  buildId: string,
  iterationType: string
): Promise<void> {
  const { session } = await cognitiveSessionManager.getSession(userId);

  const build = session.builds.find(b => b.id === buildId);
  if (build) {
    build.iterations = (build.iterations ?? 0) + 1;
    if (!build.iterationTypes) build.iterationTypes = [];
    build.iterationTypes.push(iterationType);
    session.lastUpdated = new Date();
  }
}

/**
 * Get conversation context for a user
 */
export async function getConversationContext(userId: string): Promise<{
  recentTopics: string[];
  personalizedPrompt: string;
  expertise: string;
}> {
  const personalizedPrompt = await cognitiveSessionManager.getPersonalizedPrompt(userId);
  const { session } = await cognitiveSessionManager.getSession(userId);

  // Extract recent topics from conversations
  const recentTopics: string[] = [];
  const recentConversations = session.conversations.slice(-5);
  for (const conv of recentConversations) {
    const userMessages = conv.messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      recentTopics.push(userMessages[0].content.slice(0, 100));
    }
  }

  return {
    recentTopics,
    personalizedPrompt,
    expertise: session.identity.expertiseLevel,
  };
}

/**
 * OLYMPUS 2.0 - Session Size Limits & Cleanup
 *
 * Prevents unbounded session growth and memory issues.
 * PATCH 3: Critical security for Week 2.
 */

import type { CognitiveSession, Learning, ErrorPattern, DomainExpertise } from './types';

/**
 * Session size limits
 */
export const SESSION_LIMITS = {
  /** Maximum builds to keep in history */
  maxBuilds: 100,

  /** Maximum learnings to keep */
  maxLearnings: 500,

  /** Maximum predictions to keep */
  maxPredictions: 50,

  /** Maximum evolution records */
  maxEvolution: 200,

  /** Maximum conversations to keep */
  maxConversations: 50,

  /** Maximum messages per conversation */
  maxMessagesPerConversation: 100,

  /** Maximum session size in bytes (10MB) */
  maxSessionSizeBytes: 10 * 1024 * 1024,

  /** Maximum domain expertise entries */
  maxDomainExpertise: 50,

  /** Maximum error patterns */
  maxErrorPatterns: 100,
};

/**
 * Enforce limits on a session
 */
export function enforceSessionLimits(session: CognitiveSession): void {
  // Trim builds (keep most recent)
  if (session.builds.length > SESSION_LIMITS.maxBuilds) {
    session.builds = session.builds.slice(-SESSION_LIMITS.maxBuilds);
  }

  // Trim learnings (keep highest confidence)
  if (session.learnings.length > SESSION_LIMITS.maxLearnings) {
    session.learnings = session.learnings
      .sort((a: Learning, b: Learning) => b.confidence - a.confidence)
      .slice(0, SESSION_LIMITS.maxLearnings);
  }

  // Trim predictions (keep unexpired, then most recent)
  const now = new Date();
  session.predictions = session.predictions
    .filter(p => p.expiresAt > now)
    .slice(0, SESSION_LIMITS.maxPredictions);

  // Trim evolution (keep most recent)
  if (session.evolution.length > SESSION_LIMITS.maxEvolution) {
    session.evolution = session.evolution.slice(-SESSION_LIMITS.maxEvolution);
  }

  // Trim conversations (keep most recent)
  if (session.conversations.length > SESSION_LIMITS.maxConversations) {
    session.conversations = session.conversations.slice(-SESSION_LIMITS.maxConversations);
  }

  // Trim messages per conversation
  for (const conv of session.conversations) {
    if (conv.messages.length > SESSION_LIMITS.maxMessagesPerConversation) {
      conv.messages = conv.messages.slice(-SESSION_LIMITS.maxMessagesPerConversation);
    }
  }

  // Trim domain expertise
  if (session.identity.domainExpertise.length > SESSION_LIMITS.maxDomainExpertise) {
    // Keep highest proficiency
    session.identity.domainExpertise = session.identity.domainExpertise
      .sort((a: DomainExpertise, b: DomainExpertise) => b.proficiency - a.proficiency)
      .slice(0, SESSION_LIMITS.maxDomainExpertise);
  }

  // Trim error patterns
  if (session.patterns.errorPatterns.length > SESSION_LIMITS.maxErrorPatterns) {
    // Keep most frequent
    session.patterns.errorPatterns = session.patterns.errorPatterns
      .sort((a: ErrorPattern, b: ErrorPattern) => b.frequency - a.frequency)
      .slice(0, SESSION_LIMITS.maxErrorPatterns);
  }
}

/**
 * Check session size and warn if approaching limits
 */
export function checkSessionSize(session: CognitiveSession): {
  sizeBytes: number;
  percentUsed: number;
  warnings: string[];
} {
  const json = JSON.stringify(session);
  const sizeBytes = Buffer.byteLength(json, 'utf8');
  const percentUsed = (sizeBytes / SESSION_LIMITS.maxSessionSizeBytes) * 100;

  const warnings: string[] = [];

  if (percentUsed > 90) {
    warnings.push(`CRITICAL: Session size at ${percentUsed.toFixed(1)}% of limit`);
  } else if (percentUsed > 80) {
    warnings.push(`WARNING: Session size at ${percentUsed.toFixed(1)}% of limit`);
  }

  if (session.builds.length > SESSION_LIMITS.maxBuilds * 0.9) {
    warnings.push(`Build history near limit: ${session.builds.length}/${SESSION_LIMITS.maxBuilds}`);
  }

  if (session.learnings.length > SESSION_LIMITS.maxLearnings * 0.9) {
    warnings.push(`Learnings near limit: ${session.learnings.length}/${SESSION_LIMITS.maxLearnings}`);
  }

  if (session.evolution.length > SESSION_LIMITS.maxEvolution * 0.9) {
    warnings.push(`Evolution history near limit: ${session.evolution.length}/${SESSION_LIMITS.maxEvolution}`);
  }

  return { sizeBytes, percentUsed, warnings };
}

/**
 * Aggressive cleanup when session is over limit
 */
export function aggressiveCleanup(session: CognitiveSession): void {
  // Cut everything in half
  const halfBuilds = Math.floor(SESSION_LIMITS.maxBuilds / 2);
  const halfLearnings = Math.floor(SESSION_LIMITS.maxLearnings / 2);
  const halfEvolution = Math.floor(SESSION_LIMITS.maxEvolution / 2);

  session.builds = session.builds.slice(-halfBuilds);
  session.learnings = session.learnings
    .sort((a: Learning, b: Learning) => b.confidence - a.confidence)
    .slice(0, halfLearnings);
  session.evolution = session.evolution.slice(-halfEvolution);
  session.predictions = session.predictions.slice(0, 10);
  session.conversations = session.conversations.slice(-5);

  // Clear low-value data
  session.patterns.errorPatterns = session.patterns.errorPatterns.slice(0, 20);
}

/**
 * Estimate memory impact of adding an item
 */
export function estimateItemSize(item: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(item), 'utf8');
  } catch {
    return 1000; // Estimate 1KB for unparseable items
  }
}

/**
 * Check if session can accept more data
 */
export function canAcceptMoreData(
  session: CognitiveSession,
  estimatedAdditionBytes: number
): boolean {
  const currentSize = estimateItemSize(session);
  return currentSize + estimatedAdditionBytes < SESSION_LIMITS.maxSessionSizeBytes;
}

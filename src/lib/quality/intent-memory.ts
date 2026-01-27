/**
 * OLYMPUS 2.0 - Intent Memory & Policy Inference Layer (IMPL)
 *
 * Learns from resolved clarifications to reduce future ambiguity.
 * Deterministic, threshold-based policy inference.
 *
 * Rules:
 * - No ML, no heuristics without thresholds
 * - Human answers always override policy
 * - Full audit trail required
 * - Deterministic behavior only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IntentClarification,
  IntentAnswer,
  ClarificationAxis,
  MutationType,
  AnswerType,
} from './intent-resolution';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Policy inference configuration
 */
export interface PolicyConfig {
  // Minimum times a clarification must be seen to infer policy
  minOccurrences: number;

  // Minimum percentage of same answer to infer (0-1)
  confidenceThreshold: number;

  // Maximum age of memories to consider (milliseconds)
  maxMemoryAge: number;

  // Enable/disable policy inference
  enabled: boolean;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  minOccurrences: 3, // Seen at least 3 times
  confidenceThreshold: 0.8, // 80% same answer
  maxMemoryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  enabled: true,
};

// ============================================
// MEMORY TYPES
// ============================================

/**
 * Context about the build/intent for matching
 */
export interface IntentContext {
  domain?: string; // e.g., "e-commerce", "dashboard", "blog"
  stack?: string; // e.g., "react-nextjs", "vue-nuxt"
  appType?: string; // e.g., "saas", "marketing", "internal"
  tier?: string; // e.g., "starter", "professional", "ultimate"
  intentCategory?: string; // e.g., "navigation", "data_display", "form_submission"
}

/**
 * Outcome of a resolution attempt
 */
export type ResolutionOutcome =
  | 'CONVERGED' // Intent was satisfied after resolution
  | 'BLOCKED' // Intent remained blocked
  | 'PARTIAL'; // Some improvement but not fully resolved

/**
 * A stored memory of a resolved clarification
 */
export interface ClarificationMemory {
  // Unique identifier
  id: string;

  // Hash of clarification spec (for matching similar clarifications)
  clarificationSignature: string;

  // The answer that was given
  answer: string | number | boolean | Record<string, any>;

  // Context for matching
  context: IntentContext;

  // Source of the answer
  source: 'human' | 'policy';

  // Whether this resolution led to convergence
  resolutionOutcome: ResolutionOutcome;

  // Timestamp
  timestamp: Date;

  // Additional metadata
  clarificationAxis: ClarificationAxis;
  mutationType: MutationType;
  answerType: AnswerType;

  // Build info for audit trail
  buildId: string;
  intentId: string;
}

/**
 * Aggregated statistics for a clarification signature
 */
export interface SignatureStats {
  signature: string;
  totalOccurrences: number;
  answerDistribution: Map<string, number>;
  mostCommonAnswer: string | number | boolean | Record<string, any>;
  confidence: number;
  lastSeen: Date;
  convergedCount: number;
  blockedCount: number;
  convergeRate: number;
}

/**
 * An inferred policy answer
 */
export interface InferredAnswer {
  clarificationId: string;
  clarificationSignature: string;
  inferredValue: string | number | boolean | Record<string, any>;
  confidence: number;
  occurrences: number;
  convergeRate: number;
  reason: string; // Explanation for audit trail
}

/**
 * Policy inference result
 */
export interface PolicyInferenceResult {
  clarificationsAnalyzed: number;
  inferredAnswers: InferredAnswer[];
  skippedReasons: Array<{
    clarificationId: string;
    reason: string;
  }>;
  config: PolicyConfig;
  memorySize: number;
  memoriesConsidered: number;
}

// ============================================
// CLARIFICATION SIGNATURE
// ============================================

/**
 * Generate a deterministic signature for a clarification
 * This identifies "similar" clarifications across builds
 */
export function generateClarificationSignature(
  clarification: IntentClarification,
  context: IntentContext
): string {
  // Build a canonical representation
  const canonical = {
    axis: clarification.axis,
    mutationType: clarification.mutationType,
    answerType: clarification.answerType,
    // Normalize question by removing specific identifiers
    questionNormalized: normalizeQuestion(clarification.question),
    // Include context for domain-specific matching
    domain: context.domain || 'unknown',
    stack: context.stack || 'unknown',
    intentCategory: context.intentCategory || 'unknown',
    // Include allowed values if enum
    allowedValues: clarification.allowedValues
      ? JSON.stringify(clarification.allowedValues.sort())
      : null,
  };

  // Hash the canonical form
  const json = JSON.stringify(canonical, Object.keys(canonical).sort());
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/**
 * Normalize question text for matching
 * Removes specific identifiers while keeping semantic meaning
 */
function normalizeQuestion(question: string): string {
  return (
    question
      .toLowerCase()
      // Remove quotes and their content
      .replace(/"[^"]+"/g, '"X"')
      .replace(/'[^']+'/g, "'X'")
      // Remove UUIDs
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      // Remove specific numbers
      .replace(/\d+/g, 'N')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Serialize answer for storage and comparison
 */
function serializeAnswer(answer: string | number | boolean | Record<string, any>): string {
  if (typeof answer === 'object') {
    return JSON.stringify(answer, Object.keys(answer as object).sort());
  }
  return String(answer);
}

// ============================================
// MEMORY STORE
// ============================================

/**
 * Intent Memory Store
 * Persists resolved clarifications to JSON file
 */
export class IntentMemoryStore {
  private memories: ClarificationMemory[] = [];
  private filePath: string;
  private loaded: boolean = false;

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, '.olympus', 'intent-memory.json');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load memories from disk
   */
  load(): void {
    if (this.loaded) return;

    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.memories = parsed.memories.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        console.log(`[IMPL] Loaded ${this.memories.length} clarification memories`);
      } else {
        this.memories = [];
        console.log('[IMPL] No existing memory file, starting fresh');
      }
    } catch (err) {
      console.error('[IMPL] Failed to load memories:', err);
      this.memories = [];
    }

    this.loaded = true;
  }

  /**
   * Save memories to disk
   */
  save(): void {
    try {
      const data = {
        version: 1,
        savedAt: new Date().toISOString(),
        memories: this.memories,
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      console.log(`[IMPL] Saved ${this.memories.length} clarification memories`);
    } catch (err) {
      console.error('[IMPL] Failed to save memories:', err);
    }
  }

  /**
   * Add a new memory
   */
  addMemory(memory: ClarificationMemory): void {
    this.load();
    this.memories.push(memory);
    this.save();
  }

  /**
   * Record a resolved clarification
   */
  recordResolution(
    clarification: IntentClarification,
    answer: IntentAnswer,
    context: IntentContext,
    outcome: ResolutionOutcome,
    buildId: string
  ): ClarificationMemory {
    const memory: ClarificationMemory = {
      id: `memory-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      clarificationSignature: generateClarificationSignature(clarification, context),
      answer: answer.value,
      context,
      source: answer.source,
      resolutionOutcome: outcome,
      timestamp: new Date(),
      clarificationAxis: clarification.axis,
      mutationType: clarification.mutationType,
      answerType: clarification.answerType,
      buildId,
      intentId: clarification.intentId,
    };

    this.addMemory(memory);
    return memory;
  }

  /**
   * Get all memories for a signature
   */
  getMemoriesForSignature(
    signature: string,
    config: PolicyConfig = DEFAULT_POLICY_CONFIG
  ): ClarificationMemory[] {
    this.load();
    const cutoffTime = Date.now() - config.maxMemoryAge;

    return this.memories.filter(
      m => m.clarificationSignature === signature && m.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get statistics for a signature
   */
  getSignatureStats(
    signature: string,
    config: PolicyConfig = DEFAULT_POLICY_CONFIG
  ): SignatureStats | null {
    const memories = this.getMemoriesForSignature(signature, config);

    if (memories.length === 0) {
      return null;
    }

    // Count answer distribution
    const answerDistribution = new Map<string, number>();
    let convergedCount = 0;
    let blockedCount = 0;

    for (const memory of memories) {
      const answerKey = serializeAnswer(memory.answer);
      answerDistribution.set(answerKey, (answerDistribution.get(answerKey) || 0) + 1);

      if (memory.resolutionOutcome === 'CONVERGED') {
        convergedCount++;
      } else if (memory.resolutionOutcome === 'BLOCKED') {
        blockedCount++;
      }
    }

    // Find most common answer
    let mostCommonKey = '';
    let mostCommonCount = 0;
    for (const [key, count] of answerDistribution) {
      if (count > mostCommonCount) {
        mostCommonKey = key;
        mostCommonCount = count;
      }
    }

    // Parse the most common answer back
    let mostCommonAnswer: string | number | boolean | Record<string, any>;
    try {
      mostCommonAnswer = JSON.parse(mostCommonKey);
    } catch {
      mostCommonAnswer = mostCommonKey;
    }

    // Calculate confidence
    const confidence = mostCommonCount / memories.length;

    // Calculate converge rate
    const convergeRate = memories.length > 0 ? convergedCount / memories.length : 0;

    return {
      signature,
      totalOccurrences: memories.length,
      answerDistribution,
      mostCommonAnswer,
      confidence,
      lastSeen: memories.reduce(
        (latest, m) => (m.timestamp > latest ? m.timestamp : latest),
        memories[0].timestamp
      ),
      convergedCount,
      blockedCount,
      convergeRate,
    };
  }

  /**
   * Get total memory count
   */
  getMemoryCount(): number {
    this.load();
    return this.memories.length;
  }

  /**
   * Prune old memories
   */
  pruneOldMemories(maxAge: number = DEFAULT_POLICY_CONFIG.maxMemoryAge): number {
    this.load();
    const cutoffTime = Date.now() - maxAge;
    const beforeCount = this.memories.length;

    this.memories = this.memories.filter(m => m.timestamp.getTime() > cutoffTime);

    const pruned = beforeCount - this.memories.length;
    if (pruned > 0) {
      this.save();
      console.log(`[IMPL] Pruned ${pruned} old memories`);
    }

    return pruned;
  }

  /**
   * Get all unique signatures
   */
  getAllSignatures(): string[] {
    this.load();
    return [...new Set(this.memories.map(m => m.clarificationSignature))];
  }
}

// ============================================
// POLICY INFERENCE ENGINE
// ============================================

/**
 * Infer default answers from memory
 */
export function inferDefaultAnswers(
  clarifications: IntentClarification[],
  context: IntentContext,
  memoryStore: IntentMemoryStore,
  config: PolicyConfig = DEFAULT_POLICY_CONFIG
): PolicyInferenceResult {
  console.log('[IMPL] ==========================================');
  console.log('[IMPL] POLICY INFERENCE ENGINE');
  console.log('[IMPL] ==========================================');
  console.log(`[IMPL] Clarifications to analyze: ${clarifications.length}`);
  console.log(
    `[IMPL] Config: minOccurrences=${config.minOccurrences}, confidence=${config.confidenceThreshold}`
  );

  if (!config.enabled) {
    console.log('[IMPL] Policy inference DISABLED');
    return {
      clarificationsAnalyzed: clarifications.length,
      inferredAnswers: [],
      skippedReasons: clarifications.map(c => ({
        clarificationId: c.clarificationId,
        reason: 'Policy inference disabled',
      })),
      config,
      memorySize: memoryStore.getMemoryCount(),
      memoriesConsidered: 0,
    };
  }

  const inferredAnswers: InferredAnswer[] = [];
  const skippedReasons: Array<{ clarificationId: string; reason: string }> = [];
  let totalMemoriesConsidered = 0;

  for (const clarification of clarifications) {
    // Generate signature for this clarification
    const signature = generateClarificationSignature(clarification, context);

    // Get statistics for this signature
    const stats = memoryStore.getSignatureStats(signature, config);

    if (!stats) {
      skippedReasons.push({
        clarificationId: clarification.clarificationId,
        reason: 'No memories found for this clarification type',
      });
      continue;
    }

    totalMemoriesConsidered += stats.totalOccurrences;

    // Check minimum occurrences
    if (stats.totalOccurrences < config.minOccurrences) {
      skippedReasons.push({
        clarificationId: clarification.clarificationId,
        reason: `Insufficient occurrences: ${stats.totalOccurrences} < ${config.minOccurrences}`,
      });
      continue;
    }

    // Check confidence threshold
    if (stats.confidence < config.confidenceThreshold) {
      skippedReasons.push({
        clarificationId: clarification.clarificationId,
        reason: `Confidence too low: ${(stats.confidence * 100).toFixed(0)}% < ${(config.confidenceThreshold * 100).toFixed(0)}%`,
      });
      continue;
    }

    // Check converge rate (don't infer if it usually fails)
    if (stats.convergeRate < 0.5) {
      skippedReasons.push({
        clarificationId: clarification.clarificationId,
        reason: `Low converge rate: ${(stats.convergeRate * 100).toFixed(0)}% (answers usually don't help)`,
      });
      continue;
    }

    // Validate the most common answer is still valid for this clarification
    const validationResult = validateInferredAnswer(clarification, stats.mostCommonAnswer);
    if (!validationResult.valid) {
      skippedReasons.push({
        clarificationId: clarification.clarificationId,
        reason: `Inferred answer no longer valid: ${validationResult.reason}`,
      });
      continue;
    }

    // Build reason for audit trail
    const reason = [
      `Seen ${stats.totalOccurrences} times with ${(stats.confidence * 100).toFixed(0)}% confidence.`,
      `Converge rate: ${(stats.convergeRate * 100).toFixed(0)}%.`,
      `Last seen: ${stats.lastSeen.toISOString()}.`,
    ].join(' ');

    inferredAnswers.push({
      clarificationId: clarification.clarificationId,
      clarificationSignature: signature,
      inferredValue: stats.mostCommonAnswer,
      confidence: stats.confidence,
      occurrences: stats.totalOccurrences,
      convergeRate: stats.convergeRate,
      reason,
    });

    console.log(`[IMPL] ✓ Inferred answer for ${clarification.clarificationId}`);
    console.log(`[IMPL]   Signature: ${signature}`);
    console.log(`[IMPL]   Value: ${JSON.stringify(stats.mostCommonAnswer).slice(0, 50)}`);
    console.log(`[IMPL]   Confidence: ${(stats.confidence * 100).toFixed(0)}%`);
  }

  console.log('[IMPL] ------------------------------------------');
  console.log(`[IMPL] Inferred: ${inferredAnswers.length}/${clarifications.length}`);
  console.log(`[IMPL] Skipped: ${skippedReasons.length}`);
  console.log('[IMPL] ==========================================');

  return {
    clarificationsAnalyzed: clarifications.length,
    inferredAnswers,
    skippedReasons,
    config,
    memorySize: memoryStore.getMemoryCount(),
    memoriesConsidered: totalMemoriesConsidered,
  };
}

/**
 * Validate that an inferred answer is still valid for a clarification
 */
function validateInferredAnswer(
  clarification: IntentClarification,
  inferredValue: any
): { valid: boolean; reason?: string } {
  switch (clarification.answerType) {
    case 'ENUM':
      if (clarification.allowedValues && !clarification.allowedValues.includes(inferredValue)) {
        return {
          valid: false,
          reason: `Value "${inferredValue}" not in current allowed values`,
        };
      }
      return { valid: true };

    case 'BOOLEAN':
      if (typeof inferredValue !== 'boolean') {
        return { valid: false, reason: 'Expected boolean' };
      }
      return { valid: true };

    case 'NUMBER':
      if (typeof inferredValue !== 'number') {
        return { valid: false, reason: 'Expected number' };
      }
      if (clarification.valueRange) {
        if (
          inferredValue < clarification.valueRange.min ||
          inferredValue > clarification.valueRange.max
        ) {
          return { valid: false, reason: 'Value outside current range' };
        }
      }
      return { valid: true };

    case 'SCHEMA':
      // Schema validation is complex, assume valid if object
      if (typeof inferredValue !== 'object') {
        return { valid: false, reason: 'Expected object' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Convert inferred answers to IntentAnswer format
 */
export function inferredToIntentAnswers(inferred: InferredAnswer[]): IntentAnswer[] {
  return inferred.map(i => ({
    clarificationId: i.clarificationId,
    value: i.inferredValue,
    source: 'policy' as const,
    answeredAt: new Date(),
    answeredBy: `policy:${i.clarificationSignature}`,
  }));
}

/**
 * Merge policy answers with human answers
 * Human answers always override policy
 */
export function mergeAnswers(
  policyAnswers: IntentAnswer[],
  humanAnswers: IntentAnswer[]
): {
  merged: IntentAnswer[];
  overriddenByHuman: string[];
  policyUsed: string[];
} {
  const overriddenByHuman: string[] = [];
  const policyUsed: string[] = [];

  // Index human answers by clarificationId
  const humanAnswerMap = new Map<string, IntentAnswer>();
  for (const answer of humanAnswers) {
    humanAnswerMap.set(answer.clarificationId, answer);
  }

  // Merge, with human taking precedence
  const merged: IntentAnswer[] = [];
  const usedIds = new Set<string>();

  // First add all human answers
  for (const answer of humanAnswers) {
    merged.push(answer);
    usedIds.add(answer.clarificationId);
  }

  // Then add policy answers that weren't overridden
  for (const answer of policyAnswers) {
    if (humanAnswerMap.has(answer.clarificationId)) {
      overriddenByHuman.push(answer.clarificationId);
    } else {
      merged.push(answer);
      usedIds.add(answer.clarificationId);
      policyUsed.push(answer.clarificationId);
    }
  }

  return { merged, overriddenByHuman, policyUsed };
}

// ============================================
// POLICY REPORT
// ============================================

/**
 * Report of policy application
 */
export interface PolicyApplicationReport {
  policyEnabled: boolean;
  config: PolicyConfig;

  // Inference results
  clarificationsAnalyzed: number;
  answersInferred: number;
  answersSkipped: number;

  // Application results
  policyAnswersApplied: number;
  humanAnswersApplied: number;
  overriddenByHuman: string[];

  // Confidence scores
  confidenceScores: Array<{
    clarificationId: string;
    confidence: number;
    convergeRate: number;
  }>;

  // Memory stats
  memorySize: number;
  memoriesConsidered: number;

  // Audit trail
  inferenceReasons: Array<{
    clarificationId: string;
    inferred: boolean;
    reason: string;
  }>;
}

/**
 * Generate policy application report
 */
export function generatePolicyReport(
  inferenceResult: PolicyInferenceResult,
  mergeResult: { merged: IntentAnswer[]; overriddenByHuman: string[]; policyUsed: string[] },
  humanAnswerCount: number
): PolicyApplicationReport {
  return {
    policyEnabled: inferenceResult.config.enabled,
    config: inferenceResult.config,
    clarificationsAnalyzed: inferenceResult.clarificationsAnalyzed,
    answersInferred: inferenceResult.inferredAnswers.length,
    answersSkipped: inferenceResult.skippedReasons.length,
    policyAnswersApplied: mergeResult.policyUsed.length,
    humanAnswersApplied: humanAnswerCount,
    overriddenByHuman: mergeResult.overriddenByHuman,
    confidenceScores: inferenceResult.inferredAnswers.map(a => ({
      clarificationId: a.clarificationId,
      confidence: a.confidence,
      convergeRate: a.convergeRate,
    })),
    memorySize: inferenceResult.memorySize,
    memoriesConsidered: inferenceResult.memoriesConsidered,
    inferenceReasons: [
      ...inferenceResult.inferredAnswers.map(a => ({
        clarificationId: a.clarificationId,
        inferred: true,
        reason: a.reason,
      })),
      ...inferenceResult.skippedReasons.map(s => ({
        clarificationId: s.clarificationId,
        inferred: false,
        reason: s.reason,
      })),
    ],
  };
}

// ============================================
// LOGGING
// ============================================

export function logPolicyReport(report: PolicyApplicationReport): void {
  console.log('[IMPL] ==========================================');
  console.log('[IMPL] POLICY APPLICATION REPORT');
  console.log('[IMPL] ==========================================');
  console.log(`[IMPL] Policy Enabled: ${report.policyEnabled}`);
  console.log(`[IMPL] Memory Size: ${report.memorySize} clarifications`);
  console.log(`[IMPL] Memories Considered: ${report.memoriesConsidered}`);
  console.log('[IMPL] ------------------------------------------');
  console.log(`[IMPL] Clarifications Analyzed: ${report.clarificationsAnalyzed}`);
  console.log(`[IMPL] Answers Inferred: ${report.answersInferred}`);
  console.log(`[IMPL] Answers Skipped: ${report.answersSkipped}`);
  console.log('[IMPL] ------------------------------------------');
  console.log(`[IMPL] Policy Answers Applied: ${report.policyAnswersApplied}`);
  console.log(`[IMPL] Human Answers Applied: ${report.humanAnswersApplied}`);
  console.log(`[IMPL] Overridden by Human: ${report.overriddenByHuman.length}`);

  if (report.confidenceScores.length > 0) {
    console.log('[IMPL] ------------------------------------------');
    console.log('[IMPL] Confidence Scores:');
    for (const score of report.confidenceScores.slice(0, 5)) {
      console.log(
        `[IMPL]   ${score.clarificationId}: ${(score.confidence * 100).toFixed(0)}% (converge: ${(score.convergeRate * 100).toFixed(0)}%)`
      );
    }
  }

  console.log('[IMPL] ==========================================');
}

// ============================================
// SINGLETON ACCESS
// ============================================

let globalMemoryStore: IntentMemoryStore | null = null;

export function getIntentMemoryStore(baseDir: string): IntentMemoryStore {
  if (!globalMemoryStore) {
    globalMemoryStore = new IntentMemoryStore(baseDir);
  }
  return globalMemoryStore;
}

/**
 * Record a resolution outcome for learning
 */
export function recordResolutionForLearning(
  memoryStore: IntentMemoryStore,
  clarifications: IntentClarification[],
  answers: IntentAnswer[],
  context: IntentContext,
  outcome: ResolutionOutcome,
  buildId: string
): void {
  console.log(`[IMPL] Recording ${answers.length} resolutions for learning (outcome: ${outcome})`);

  // Index answers by clarificationId
  const answerMap = new Map<string, IntentAnswer>();
  for (const answer of answers) {
    answerMap.set(answer.clarificationId, answer);
  }

  // Record each clarification that had an answer
  for (const clarification of clarifications) {
    const answer = answerMap.get(clarification.clarificationId);
    if (answer) {
      memoryStore.recordResolution(clarification, answer, context, outcome, buildId);
    }
  }
}

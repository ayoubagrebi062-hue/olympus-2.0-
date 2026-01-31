/**
 * OLYMPUS 10X - Context Compressor
 *
 * Neural context compression for efficient handoffs.
 * Implements semantic, neural, and no-compression strategies.
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { THRESHOLDS, log, metrics } from '@/lib/core';
import type { HandoffContext } from '@/lib/core';
import type {
  CompressionStrategy,
  CompressedContext,
  CompressorConfig,
  IContextCompressor,
} from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: CompressorConfig = {
  targetSizeBytes: 2 * 1024, // 2KB target
  maxSizeBytes: 8 * 1024, // 8KB max
  preserveKeys: ['currentGoal', 'criticalData', 'userIntent', 'errorContext'],
  strategy: 'semantic',
};

// ============================================================================
// COMPRESSION UTILITIES
// ============================================================================

/**
 * Calculate byte size of a string.
 */
function getByteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Truncate string to approximate byte size.
 */
function truncateToSize(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);

  if (encoded.length <= maxBytes) {
    return str;
  }

  // Binary search for the right truncation point
  let low = 0;
  let high = str.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (encoder.encode(str.slice(0, mid)).length <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return str.slice(0, low) + '...';
}

/**
 * Extract key sentences from text (simple extractive summarization).
 */
function extractKeySentences(text: string, maxSentences: number): string {
  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length <= maxSentences) {
    return sentences.join('. ') + '.';
  }

  // Score sentences by importance (simple heuristics)
  const scored = sentences.map((sentence, index) => {
    let score = 0;

    // First and last sentences are often important
    if (index === 0) score += 3;
    if (index === sentences.length - 1) score += 2;

    // Sentences with keywords are important
    const keywords = [
      'error',
      'fail',
      'success',
      'important',
      'critical',
      'must',
      'should',
      'goal',
      'objective',
      'result',
      'conclusion',
    ];
    for (const keyword of keywords) {
      if (sentence.toLowerCase().includes(keyword)) score += 2;
    }

    // Longer sentences often have more information
    score += Math.min(sentence.length / 50, 3);

    return { sentence, score };
  });

  // Sort by score and take top sentences
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxSentences).map(s => s.sentence);

  return selected.join('. ') + '.';
}

/**
 * Compress conversation history.
 */
function compressHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number
): Array<{ role: string; content: string }> {
  if (messages.length <= maxMessages) {
    return messages;
  }

  // Keep first message (often contains initial context)
  const firstMessage = messages[0];

  // Keep last N-1 messages (most recent context)
  const recentMessages = messages.slice(-(maxMessages - 1));

  // Create summary of skipped messages
  const skippedCount = messages.length - maxMessages;
  const summaryMessage = {
    role: 'system',
    content: `[${skippedCount} earlier messages summarized: Conversation covered various topics leading to current context]`,
  };

  return [firstMessage, summaryMessage, ...recentMessages];
}

// ============================================================================
// CONTEXT COMPRESSOR IMPLEMENTATION
// ============================================================================

export class ContextCompressor implements IContextCompressor {
  private config: CompressorConfig;

  constructor(config: Partial<CompressorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compress context for handoff.
   */
  async compress(
    context: HandoffContext,
    config?: Partial<CompressorConfig>
  ): Promise<CompressedContext> {
    const startTime = Date.now();
    const effectiveConfig = { ...this.config, ...config };

    // Serialize original context
    const originalContent = JSON.stringify(context);
    const originalSize = getByteSize(originalContent);

    log.debug('Starting context compression', {
      originalSize,
      strategy: effectiveConfig.strategy,
      targetSize: effectiveConfig.targetSizeBytes,
    });

    let compressedContent: string;
    let preservedKeys: string[] = [];

    switch (effectiveConfig.strategy) {
      case 'none':
        compressedContent = this.compressNone(context, effectiveConfig);
        break;

      case 'semantic':
        const semanticResult = this.compressSemantic(context, effectiveConfig);
        compressedContent = semanticResult.content;
        preservedKeys = semanticResult.preservedKeys;
        break;

      case 'neural':
        const neuralResult = await this.compressNeural(context, effectiveConfig);
        compressedContent = neuralResult.content;
        preservedKeys = neuralResult.preservedKeys;
        break;

      default:
        compressedContent = this.compressNone(context, effectiveConfig);
    }

    const compressedSize = getByteSize(compressedContent);
    const compressionTime = Date.now() - startTime;

    // Record metrics
    metrics.duration('handoffs.compression', compressionTime, {
      strategy: effectiveConfig.strategy,
    });

    metrics.count('handoffs.compression.ratio', originalSize / Math.max(compressedSize, 1), {
      strategy: effectiveConfig.strategy,
    });

    const result: CompressedContext = {
      content: compressedContent,
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize,
      strategy: effectiveConfig.strategy,
      preservedKeys,
      metadata: {
        compressionTime,
      },
    };

    log.info('Context compression complete', {
      originalSize,
      compressedSize,
      ratio: result.ratio.toFixed(2),
      strategy: effectiveConfig.strategy,
      compressionTime,
    });

    return result;
  }

  /**
   * Decompress context.
   */
  decompress(compressed: CompressedContext): HandoffContext {
    try {
      return JSON.parse(compressed.content) as HandoffContext;
    } catch {
      log.warn('Failed to decompress context, returning as-is');
      return {
        sourceAgent: 'unknown' as any,
        conversationHistory: [],
        currentGoal: compressed.content,
        attributes: new Map(),
        chainDepth: 0,
        circuitState: 'closed',
        requestId: `req_decompress_${Date.now()}` as any,
        traceId: `trace_decompress_${Date.now()}` as any,
      };
    }
  }

  /**
   * Estimate compression result without compressing.
   */
  estimate(context: HandoffContext): {
    originalSize: number;
    estimatedSize: number;
    strategy: CompressionStrategy;
  } {
    const originalContent = JSON.stringify(context);
    const originalSize = getByteSize(originalContent);

    let estimatedSize: number;

    switch (this.config.strategy) {
      case 'none':
        estimatedSize = Math.min(originalSize, this.config.maxSizeBytes);
        break;

      case 'semantic':
        // Semantic typically achieves 30-50% compression
        estimatedSize = Math.max(this.config.targetSizeBytes, originalSize * 0.4);
        break;

      case 'neural':
        // Neural can achieve 20-40% compression
        estimatedSize = Math.max(this.config.targetSizeBytes, originalSize * 0.3);
        break;

      default:
        estimatedSize = originalSize;
    }

    return {
      originalSize,
      estimatedSize: Math.round(estimatedSize),
      strategy: this.config.strategy,
    };
  }

  // ===========================================================================
  // COMPRESSION STRATEGIES
  // ===========================================================================

  private compressNone(context: HandoffContext, config: CompressorConfig): string {
    const content = JSON.stringify(context);

    if (getByteSize(content) <= config.maxSizeBytes) {
      return content;
    }

    // Truncate if too large
    return truncateToSize(content, config.maxSizeBytes);
  }

  private compressSemantic(
    context: HandoffContext,
    config: CompressorConfig
  ): { content: string; preservedKeys: string[] } {
    const compressed: Record<string, unknown> = {};
    const preservedKeys: string[] = [];

    // Always preserve specified keys
    for (const key of config.preserveKeys) {
      if (key in context && (context as any)[key] !== undefined) {
        compressed[key] = (context as any)[key];
        preservedKeys.push(key);
      }
    }

    // Always include source agent and chain depth
    compressed.sourceAgent = context.sourceAgent;
    compressed.chainDepth = context.chainDepth;
    compressed.circuitState = context.circuitState;

    // Compress conversation history
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const maxMessages = Math.max(3, Math.floor(config.targetSizeBytes / 500));
      compressed.conversationHistory = compressHistory(context.conversationHistory, maxMessages);
    }

    // Compress current goal if too long
    if (context.currentGoal) {
      const goalSize = getByteSize(context.currentGoal);
      if (goalSize > 500) {
        compressed.currentGoal = extractKeySentences(context.currentGoal, 3);
      } else {
        compressed.currentGoal = context.currentGoal;
      }
    }

    // Convert attributes map to object for serialization
    if (context.attributes && context.attributes.size > 0) {
      const criticalAttributes: Record<string, unknown> = {};
      for (const [key, value] of context.attributes) {
        // Only preserve critical attributes
        if (key.startsWith('critical_') || key.startsWith('user_') || key.startsWith('error_')) {
          criticalAttributes[key] = value;
        }
      }
      if (Object.keys(criticalAttributes).length > 0) {
        compressed.attributes = criticalAttributes;
      }
    }

    let content = JSON.stringify(compressed);

    // If still too large, truncate
    if (getByteSize(content) > config.maxSizeBytes) {
      content = truncateToSize(content, config.maxSizeBytes);
    }

    return { content, preservedKeys };
  }

  private async compressNeural(
    context: HandoffContext,
    config: CompressorConfig
  ): Promise<{ content: string; preservedKeys: string[] }> {
    // Neural compression would use an LLM to summarize
    // For now, we use enhanced semantic compression as a placeholder
    // In production, this would call an LLM API

    log.debug('Neural compression requested, using enhanced semantic');

    // Start with semantic compression
    const semanticResult = this.compressSemantic(context, config);

    // Additional neural-style processing (placeholder)
    // In production: call LLM to summarize conversation history
    // and extract key information

    const compressed = JSON.parse(semanticResult.content);

    // Simulate neural extraction of key information
    if (compressed.conversationHistory && compressed.conversationHistory.length > 0) {
      // Create a summary instead of keeping messages
      const summary = this.createConversationSummary(compressed.conversationHistory);
      compressed.conversationSummary = summary;
      delete compressed.conversationHistory;
    }

    const content = JSON.stringify(compressed);

    return {
      content: truncateToSize(content, config.maxSizeBytes),
      preservedKeys: semanticResult.preservedKeys,
    };
  }

  private createConversationSummary(messages: Array<{ role: string; content: string }>): string {
    // Simple extractive summary
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    const assistantMessages = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join(' ');

    const userSummary = extractKeySentences(userMessages, 2);
    const assistantSummary = extractKeySentences(assistantMessages, 2);

    return `User context: ${userSummary} Assistant actions: ${assistantSummary}`;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a new context compressor instance.
 */
export function createContextCompressor(config?: Partial<CompressorConfig>): ContextCompressor {
  return new ContextCompressor(config);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_CONFIG as DEFAULT_COMPRESSOR_CONFIG };

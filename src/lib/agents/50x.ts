/**
 * ═══════════════════════════════════════════════════════════════════════════
 *                         OLYMPUS 50X - MAIN EXPORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * World-class AI code generation system.
 *
 * Features:
 * - RAG-powered few-shot learning
 * - 5-agent chain-of-thought pipeline
 * - Vision validation with Claude Vision
 * - Intelligent model routing (70% cost savings)
 * - Real-time SSE streaming
 * - Multi-tier caching
 * - Security scanning
 *
 * Usage:
 *   import { generate50X, scanCode, getStats } from '@/lib/agents/50x';
 *
 *   const result = await generate50X('Create a pricing card component');
 *   console.log(result.code);    // Generated code
 *   console.log(result.finalScore);   // Quality score 0-100
 */

// ============================================
// ORCHESTRATOR (Main Entry Point)
// ============================================

export {
  FiftyXOrchestrator,
  generate50X,
  generateWithStream,
  type GenerationRequest,
  type GenerationResult,
  type GenerationOptions,
  type GenerationEvent,
} from './orchestrator/50x-orchestrator';

// ============================================
// RAG SYSTEM
// ============================================

export {
  ComponentStore,
  getComponentStore,
  type ComponentExample,
  type ComponentCategory,
  type SearchOptions,
} from './rag/component-store';

export {
  ComponentRetriever,
  getRetriever,
  buildRAGContext,
  type RetrievalOptions,
  type RetrievalResult,
} from './rag/retriever';

// ============================================
// VISION PIPELINE
// ============================================

export { ComponentRenderer, type RenderOptions, type RenderResult } from './vision/renderer';

export {
  VisualComparator,
  getComparator,
  checkVisualQuality,
  type ComparisonResult,
  type CompareOptions,
} from './vision/comparator';

// ============================================
// AGENT PIPELINE
// ============================================

export { PipelineRunner, generateComponent } from './pipeline';

export {
  PIPELINE_AGENTS,
  PIPELINE_ORDER,
  getAgent,
  type PipelineAgentDefinition,
} from './pipeline/agents';

export type {
  PipelineState,
  PlannerOutput,
  DesignerOutput,
  CoderOutput,
  ReviewerOutput,
  FixerOutput,
} from './pipeline/types';

// ============================================
// INTELLIGENT ROUTER
// ============================================

export {
  IntelligentModelRouter,
  getIntelligentRouter,
  routeTask,
  smartComplete,
  getAgentTier,
  MODEL_IDS,
  MODEL_PRICING,
  PIPELINE_AGENT_TIERS,
  type ModelTier,
  type TaskComplexity,
  type ComplexityAnalysis,
  type RoutingDecision,
  type RouterStats,
  type RouterConfig,
} from './router/intelligent-router';

// ============================================
// STREAMING
// ============================================

export {
  StreamManager,
  getStreamManager,
  encodeSSE,
  createSSEStream,
  calculateProgress,
  type StreamEventType,
  type StreamEvent,
  type StreamEventData,
  type StreamSubscriber,
  type StreamSession,
} from './streaming/stream-manager';

// ============================================
// CACHING
// ============================================

export {
  CacheManager,
  getCacheManager,
  getEmbeddingCache,
  getRAGCache,
  getComponentCache,
  EmbeddingCache,
  RAGCache,
  ComponentCache,
  type CacheKey,
  type CacheNamespace,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
} from './cache/cache-manager';

// ============================================
// SECURITY
// ============================================

export {
  SecurityScanner,
  getSecurityScanner,
  scanCode,
  isCodeSafe,
  getSecurityReport,
  sanitizeCode,
  type SeverityLevel,
  type VulnerabilityCategory,
  type SecurityVulnerability,
  type ScanResult,
  type ScanOptions,
  type SecurityPattern,
} from './security/security-scanner';

// ============================================
// DESIGN SYSTEM
// ============================================

export {
  colors,
  typography,
  spacing,
  effects,
  motion,
  tailwind,
  components,
  designSystem,
} from '../design-system';

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Quick generate - simplest interface
 */
export async function quickGenerate(
  prompt: string,
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'vanilla' = 'react'
) {
  const { generate50X } = await import('./orchestrator/50x-orchestrator');
  return generate50X(prompt, { framework });
}

/**
 * Get all 50X system stats
 */
export function get50XStats() {
  const { getStreamManager } = require('./streaming/stream-manager');
  const { getCacheManager } = require('./cache/cache-manager');
  const { getIntelligentRouter } = require('./router/intelligent-router');

  return {
    streaming: getStreamManager().getStats(),
    cache: getCacheManager().getStats(),
    router: getIntelligentRouter().getStats(),
    costReport: getIntelligentRouter().getCostReport(),
  };
}

/**
 * Reset all 50X stats
 */
export function reset50XStats() {
  const { getIntelligentRouter } = require('./router/intelligent-router');
  const { getCacheManager } = require('./cache/cache-manager');

  getIntelligentRouter().resetStats();
  getCacheManager().clear();
}

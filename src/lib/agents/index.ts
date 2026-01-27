/**
 * OLYMPUS 2.1 - AI Agent System
 *
 * Complete multi-agent orchestration for SaaS application generation.
 *
 * Updated with 50X Coordination Upgrade:
 * - ARCHON outputs structured architecture decisions
 * - Critical decisions propagate to downstream agents
 * - Constraint injection ensures architectural consistency
 *
 * 50X Reliability Upgrade:
 * - Environment validation at startup
 * - Error handling on all async operations
 * - Safe getters for environment variables
 *
 * Usage:
 * ```ts
 * import { buildService, BuildOrchestrator, getAgent } from '@/lib/agents';
 *
 * // Create and start a build
 * const { data } = await buildService.create({
 *   projectId: 'proj_123',
 *   tenantId: 'tenant_456',
 *   userId: 'user_789',
 *   tier: 'professional',
 *   description: 'A task management SaaS...',
 * });
 *
 * await buildService.start(data.buildId, {
 *   onProgress: (progress) => console.log(progress),
 *   onAgentComplete: (agentId, output) => console.log(`${agentId} done`),
 * });
 * ```
 */

// 50X RELIABILITY: Validate environment on import (server-side only)
import { initEnvValidation } from '../env-validation';
if (typeof window === 'undefined') {
  initEnvValidation();
}

// Types
export * from './types';

// Registry - 35 Agents
export {
  ALL_AGENTS,
  AGENT_MAP,
  getAgent,
  getAgentsByPhase,
  PHASE_ORDER,
  PHASE_CONFIGS,
  TIER_CONFIGS,
  discoveryAgents,
  designAgents,
  architectureAgents,
  frontendAgents,
  backendAgents,
  integrationAgents,
  testingAgents,
  deploymentAgents,
} from './registry';

// Providers - AI Clients
export {
  AnthropicClient,
  createAnthropicClient,
  OpenAIClient,
  createOpenAIClient,
  ProviderManager,
  getProviderManager,
  TokenTracker,
  parseAgentResponse,
  MODEL_CAPABILITIES,
  TIER_MODEL_MAP,
  type AIProvider,
  type AIModel,
  type CompletionRequest,
  type CompletionResponse,
  type TokenUsage,
} from './providers';

// Context - Build State
export {
  BuildContextManager,
  buildContextSummary,
  saveContext,
  loadContext,
  saveAgentOutput,
  loadAgentOutputs,
  type BuildContextData,
  type BuildKnowledge,
  type ContextSnapshot,
} from './context';

// Executor - Agent Execution
export {
  AgentExecutor,
  executeAgent,
  validateOutput,
  RetryHandler,
  buildAgentPrompt,
  EnhancedAgentExecutor,
  executeEnhancedAgent,
  type ExecutionOptions,
  type ExecutionResult,
  type ExecutionProgress,
  type EnhancedExecutionOptions,
  type EnhancedExecutionResult,
} from './executor';

// Tools - Agent Tools
export {
  initializeTools,
  executeTool,
  getToolsForPrompt,
  hasTool,
  getAvailableTools,
  getToolRegistry,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type ToolContext,
} from './tools';

// Orchestrator - Build Coordination
export {
  BuildOrchestrator,
  AgentScheduler,
  createBuildPlan,
  type BuildPlan,
  type BuildProgress,
  type OrchestrationEvent,
  type OrchestrationOptions,
  type OrchestrationStatus,
} from './orchestrator';

// Services - High-level API
export {
  buildService,
  iterationService,
  type CreateBuildParams,
  type IterationParams,
} from './services';

// 50X Coordination Upgrade - Decision Propagation
export * from './coordination';

// 50X Reliability Upgrade - Environment Validation
export {
  validateEnv,
  validateEnvOrThrow,
  getEnvOrThrow,
  getEnvOrDefault,
  hasEnv,
  getAvailableAIProviders,
  initEnvValidation,
  type EnvValidationResult,
} from '../env-validation';

// ============================================
// 50X WORLD-CLASS GENERATION SYSTEM
// ============================================

// Main 50X export (exclude CacheConfig to avoid conflict with coordination module)
export {
  FiftyXOrchestrator,
  generate50X,
  generateWithStream,
  type GenerationRequest,
  type GenerationResult,
  type GenerationOptions,
  type GenerationEvent,
  ComponentStore,
  getComponentStore,
  type ComponentExample,
  type ComponentCategory,
  type SearchOptions,
  ComponentRetriever,
  getRetriever,
  buildRAGContext,
  type RetrievalOptions,
  type RetrievalResult,
  ComponentRenderer,
  type RenderOptions,
  type RenderResult,
  VisualComparator,
  getComparator,
  checkVisualQuality,
  type ComparisonResult,
  type CompareOptions,
  PipelineRunner,
  generateComponent,
  PIPELINE_AGENTS,
  PIPELINE_ORDER,
  type PipelineAgentDefinition,
  type PipelineState,
  type PlannerOutput,
  type DesignerOutput,
  type CoderOutput,
  type ReviewerOutput,
  type FixerOutput,
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
  // Note: CacheConfig excluded - use coordination/CacheConfig for architecture config
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
} from './50x';

// Individual module exports for fine-grained control
export * as RAG from './rag';
export * as Vision from './vision';
export * as Pipeline from './pipeline';
export * as Router from './router';
export * as Streaming from './streaming';
export * as Cache from './cache';
export * as Security from './security';

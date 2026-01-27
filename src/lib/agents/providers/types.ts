/**
 * OLYMPUS 2.0 - AI Provider Types
 *
 * Extended for multi-provider AI routing system.
 * Supports: Ollama (local), Groq (fast), Anthropic (quality), OpenAI
 */

// ============================================
// ENUMS
// ============================================

/**
 * Available AI providers
 */
export enum AIProviderType {
  OLLAMA = 'ollama',
  LM_STUDIO = 'lm_studio',
  GROQ = 'groq',
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
}

/**
 * Task complexity levels
 */
export enum TaskComplexity {
  SIMPLE = 'simple', // Quick responses, edits
  MODERATE = 'moderate', // Code generation
  COMPLEX = 'complex', // Architecture, planning
  CRITICAL = 'critical', // Enterprise, must not fail
}

/**
 * Provider status
 */
export enum ProviderStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

// ============================================
// LEGACY TYPE ALIASES (backwards compatibility)
// ============================================

/** Supported AI providers (legacy) */
export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'groq' | 'openrouter';

/** Model identifiers (legacy) */
export type AnthropicModel =
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  | 'claude-haiku-3-20250414'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-haiku-20240307';
export type OpenAIModel = 'gpt-4o' | 'gpt-4o-mini' | 'o1-preview' | 'o1-mini';
export type OllamaModel = 'deepseek-r1' | 'llama3.1' | 'llama3.2' | string;
export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'mixtral-8x7b-32768'
  | string;
export type AIModel = AnthropicModel | OpenAIModel | OllamaModel | GroqModel;

// ============================================
// MESSAGE TYPES
// ============================================

/** Message role */
export type MessageRole = 'system' | 'user' | 'assistant';

/** Chat message (legacy) */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Message format (OpenAI-compatible)
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================
// REQUEST/RESPONSE INTERFACES
// ============================================

/** Completion request (legacy) */
export interface CompletionRequest {
  model: AIModel;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

/** Completion response (legacy) */
export interface CompletionResponse {
  id: string;
  content: string;
  model: AIModel;
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latency: number;
}

/**
 * Request to AI provider (new)
 */
export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  metadata?: {
    agentId?: string;
    buildId?: string;
    userId?: string;
    phase?: string;
  };
}

/**
 * Response from AI provider (new)
 */
export interface AIResponse {
  content: string;
  model: string;
  provider: AIProviderType;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cached?: boolean;
}

/**
 * Streaming chunk
 */
export interface AIStreamChunk {
  content: string;
  done: boolean;
}

// ============================================
// TOKEN TRACKING
// ============================================

/** Token usage tracking */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// ============================================
// PROVIDER INTERFACES
// ============================================

/** Provider configuration (legacy) */
export interface ProviderConfig {
  type?: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: AIModel;
  enabled?: boolean;
  priority?: number;
  fallbackModels?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/** Provider client interface (legacy) */
export interface AIProviderClient {
  provider: AIProvider;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete(request: CompletionRequest): AsyncGenerator<string, CompletionResponse>;
  countTokens(text: string): Promise<number>;
}

/**
 * Base interface all providers must implement (new)
 */
export interface AIProviderInterface {
  /** Provider identifier */
  type: AIProviderType;

  /** Display name */
  name: string;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;

  /** Get available models */
  getModels(): Promise<string[]>;

  /** Send completion request */
  complete(request: AIRequest): Promise<AIResponse>;

  /** Send streaming request */
  stream(request: AIRequest): AsyncGenerator<AIStreamChunk>;

  /** Estimate token count */
  estimateTokens(text: string): number;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: AIProviderType;
  status: ProviderStatus;
  healthy: boolean;
  latencyMs: number;
  successRate: number; // 0-1
  lastCheck: Date;
  lastError?: string;
  availableModels: string[];
}

// ============================================
// ROUTING INTERFACES
// ============================================

/**
 * Agent category for routing decisions
 */
export type AgentCategory =
  | 'discovery' // Planning, research
  | 'design' // Visual, UX
  | 'architecture' // System design
  | 'frontend' // UI code
  | 'backend' // Server code
  | 'integration' // APIs, connections
  | 'testing' // Tests
  | 'deployment'; // DevOps

/**
 * Routing decision
 */
export interface RoutingDecision {
  primaryProvider: AIProviderType;
  primaryModel: string;
  fallbackProvider?: AIProviderType;
  fallbackModel?: string;
  reason: string;
  estimatedCost: number; // USD
  estimatedLatency: number; // ms
}

/**
 * Routing context
 */
export interface RoutingContext {
  agentId: string;
  agentCategory: AgentCategory;
  complexity: TaskComplexity;
  tokenEstimate: number;
  requiresReasoning: boolean;
  requiresSpeed: boolean;
  userId?: string;
  buildId?: string;
}

// ============================================
// EXECUTION INTERFACES
// ============================================

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  response?: AIResponse;
  error?: string;
  attempts: number;
  providersUsed: AIProviderType[];
  totalLatencyMs: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  maxRetries?: number;
  timeout?: number;
  forceProvider?: AIProviderType;
  forceModel?: string;
  allowFallback?: boolean;
  stream?: boolean;
}

// ============================================
// MODEL CAPABILITIES
// ============================================

/** Model capabilities */
export interface ModelCapabilities {
  maxContextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
}

/** Model registry (legacy + new) */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // Anthropic
  'claude-opus-4-20250514': {
    maxContextWindow: 200000,
    maxOutputTokens: 32000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
  'claude-sonnet-4-20250514': {
    maxContextWindow: 200000,
    maxOutputTokens: 16000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  'claude-haiku-3-20250414': {
    maxContextWindow: 200000,
    maxOutputTokens: 8000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
  },
  'claude-3-5-sonnet-20241022': {
    maxContextWindow: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  'claude-3-haiku-20240307': {
    maxContextWindow: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
  },

  // OpenAI
  'gpt-4o': {
    maxContextWindow: 128000,
    maxOutputTokens: 16000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  'gpt-4o-mini': {
    maxContextWindow: 128000,
    maxOutputTokens: 16000,
    supportsVision: true,
    supportsTools: true,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  'o1-preview': {
    maxContextWindow: 128000,
    maxOutputTokens: 32000,
    supportsVision: false,
    supportsTools: false,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
  },
  'o1-mini': {
    maxContextWindow: 128000,
    maxOutputTokens: 65000,
    supportsVision: false,
    supportsTools: false,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.012,
  },

  // Ollama (FREE - local)
  'deepseek-r1': {
    maxContextWindow: 32000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: false,
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },
  'llama3.1': {
    maxContextWindow: 128000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: false,
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },
  'llama3.2': {
    maxContextWindow: 128000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: false,
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },

  // Groq (cheap + fast)
  'llama-3.3-70b-versatile': {
    maxContextWindow: 128000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
  },
  'llama-3.1-8b-instant': {
    maxContextWindow: 128000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
  },
  'mixtral-8x7b-32768': {
    maxContextWindow: 32000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    costPer1kInput: 0.00024,
    costPer1kOutput: 0.00024,
  },
};

/** Tier to model mapping */
export const TIER_MODEL_MAP: Record<string, AIModel> = {
  opus: 'claude-opus-4-20250514',
  sonnet: 'claude-sonnet-4-20250514',
  haiku: 'claude-haiku-3-20250414',
};

// ============================================
// COST TRACKING
// ============================================

/**
 * Cost per 1K tokens (input/output)
 */
export interface ProviderCosts {
  provider: AIProviderType;
  model: string;
  inputPer1K: number; // USD
  outputPer1K: number; // USD
}

/**
 * Default costs (updated as of Jan 2026)
 */
export const PROVIDER_COSTS: ProviderCosts[] = [
  // Local (FREE)
  { provider: AIProviderType.OLLAMA, model: 'deepseek-r1', inputPer1K: 0, outputPer1K: 0 },
  { provider: AIProviderType.OLLAMA, model: 'llama3.1', inputPer1K: 0, outputPer1K: 0 },
  { provider: AIProviderType.OLLAMA, model: 'llama3.2', inputPer1K: 0, outputPer1K: 0 },
  { provider: AIProviderType.LM_STUDIO, model: 'any', inputPer1K: 0, outputPer1K: 0 },

  // Groq (cheap)
  {
    provider: AIProviderType.GROQ,
    model: 'llama-3.3-70b-versatile',
    inputPer1K: 0.00059,
    outputPer1K: 0.00079,
  },
  {
    provider: AIProviderType.GROQ,
    model: 'llama-3.1-8b-instant',
    inputPer1K: 0.00005,
    outputPer1K: 0.00008,
  },

  // Anthropic (quality)
  {
    provider: AIProviderType.ANTHROPIC,
    model: 'claude-sonnet-4-20250514',
    inputPer1K: 0.003,
    outputPer1K: 0.015,
  },
  {
    provider: AIProviderType.ANTHROPIC,
    model: 'claude-3-haiku-20240307',
    inputPer1K: 0.00025,
    outputPer1K: 0.00125,
  },

  // OpenAI
  { provider: AIProviderType.OPENAI, model: 'gpt-4o', inputPer1K: 0.005, outputPer1K: 0.015 },
  {
    provider: AIProviderType.OPENAI,
    model: 'gpt-4o-mini',
    inputPer1K: 0.00015,
    outputPer1K: 0.0006,
  },
];

// ============================================
// AGENT TO PROVIDER MAPPING
// ============================================

/**
 * Default provider for each agent category
 */
export const AGENT_PROVIDER_MAP: Record<
  AgentCategory,
  {
    primary: { provider: AIProviderType; model: string };
    fallback: { provider: AIProviderType; model: string };
  }
> = {
  // Anthropic PRIMARY (Claude 3 Haiku) - fast, cheap, high quality
  // OpenAI FALLBACK (gpt-4o-mini) - when Anthropic unavailable
  discovery: {
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-3-haiku-20240307' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o-mini' },
  },
  design: {
    // Design agents (palette, cartographer, blocks) produce large outputs (12k-15k chars)
    // Haiku's 4096 token limit causes truncation - MUST use Sonnet (16384 tokens)
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-sonnet-4-20250514' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o' },
  },
  architecture: {
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-sonnet-4-20250514' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o-mini' },
  },
  frontend: {
    // CRITICAL: Frontend agents (PIXEL, WIRE, POLISH) generate full code files
    // Haiku's 4096 token limit causes truncation - MUST use Sonnet (8192 tokens)
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-sonnet-4-20250514' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o' },
  },
  backend: {
    // Backend code generation also needs larger token capacity
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-sonnet-4-20250514' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o' },
  },
  integration: {
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-3-haiku-20240307' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o-mini' },
  },
  testing: {
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-3-haiku-20240307' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o-mini' },
  },
  deployment: {
    primary: { provider: AIProviderType.ANTHROPIC, model: 'claude-3-haiku-20240307' },
    fallback: { provider: AIProviderType.OPENAI, model: 'gpt-4o-mini' },
  },
};

/**
 * Agent ID to category mapping
 */
export const AGENT_CATEGORIES: Record<string, AgentCategory> = {
  // Discovery
  oracle: 'discovery',
  empathy: 'discovery',
  venture: 'discovery',
  strategos: 'discovery',
  scope: 'discovery',

  // Design
  palette: 'design',
  grid: 'design',
  blocks: 'design',
  cartographer: 'design',
  flow: 'design',

  // Architecture
  archon: 'architecture',
  datum: 'architecture',
  nexus: 'architecture',
  forge: 'architecture',
  sentinel: 'architecture',
  atlas: 'architecture',

  // Frontend
  pixel: 'frontend',
  wire: 'frontend',
  polish: 'frontend',

  // Backend
  engine: 'backend',
  gateway: 'backend',
  keeper: 'backend',
  cron: 'backend',

  // Integration
  bridge: 'integration',
  sync: 'integration',
  notify: 'integration',
  search: 'integration',

  // Testing
  junit: 'testing',
  cypress: 'testing',
  load: 'testing',
  a11y: 'testing',

  // Deployment
  docker: 'deployment',
  pipeline: 'deployment',
  monitor: 'deployment',
  scale: 'deployment',
};

/**
 * Get category for an agent
 */
export function getAgentCategory(agentId: string): AgentCategory {
  return AGENT_CATEGORIES[agentId] || 'frontend';
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  provider: AIProviderType,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = PROVIDER_COSTS.find(
    c => c.provider === provider && (c.model === model || c.model === 'any')
  );

  if (!costs) return 0;

  return (inputTokens / 1000) * costs.inputPer1K + (outputTokens / 1000) * costs.outputPer1K;
}

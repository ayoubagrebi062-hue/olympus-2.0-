/**
 * OLYMPUS 2.0 - AI Providers
 *
 * Unified export for all providers including:
 * - Legacy: Anthropic, OpenAI
 * - New: Ollama (local), Groq (fast cloud)
 * - Routing: Intelligent provider selection
 */

// Types (includes both legacy and new types)
export * from './types';

// Legacy providers
export {
  AnthropicClient,
  createAnthropicClient,
  AnthropicProvider,
  getAnthropicProvider,
  isAnthropicAvailable,
} from './anthropic';
export { OpenAIClient, createOpenAIClient } from './openai';
export { TokenTracker, type AgentUsageRecord, type BuildUsageSummary } from './tracker';
export { parseAgentResponse } from './parser';
export { ProviderManager, getProviderManager, createProviderManager } from './manager';

// New providers (local-first)
export { OllamaProvider, getOllamaProvider, isOllamaRunning, ollamaComplete } from './ollama';
export { GroqProvider, getGroqProvider, isGroqAvailable, groqComplete, GROQ_MODELS } from './groq';

// Intelligent router
export { AIRouter, getRouter, routedExecute } from './router';

// Health monitoring
export {
  HealthMonitor,
  getHealthMonitor,
  startHealthMonitoring,
  stopHealthMonitoring,
  checkAllProviders,
  getHealthReport,
} from './health';

/**
 * Initialize all providers and check availability
 */
export async function initializeProviders(): Promise<{
  ollama: boolean;
  groq: boolean;
}> {
  const { isOllamaRunning } = await import('./ollama');
  const { isGroqAvailable } = await import('./groq');

  const [ollama, groq] = await Promise.all([isOllamaRunning(), isGroqAvailable()]);

  console.log('Provider Status:');
  console.log(`  Ollama: ${ollama ? '✅' : '❌'}`);
  console.log(`  Groq: ${groq ? '✅' : '❌'}`);

  return { ollama, groq };
}

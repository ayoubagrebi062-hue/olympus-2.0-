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
 * Provider configuration validation result
 */
export interface ProviderConfigResult {
  provider: string;
  configured: boolean;
  envVar: string;
  status: 'ready' | 'missing' | 'invalid';
}

/**
 * Validate all provider configurations on startup
 * Logs a status table and returns validation results
 *
 * FIX #6: Added validateProviderConfig() for fail-fast startup validation
 */
export function validateProviderConfig(): {
  valid: boolean;
  results: ProviderConfigResult[];
  hasAnyProvider: boolean;
} {
  const providers: Array<{ name: string; envVar: string; prefix?: string }> = [
    { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', prefix: 'sk-ant-' },
    { name: 'OpenAI', envVar: 'OPENAI_API_KEY', prefix: 'sk-' },
    { name: 'Groq', envVar: 'GROQ_API_KEY', prefix: 'gsk_' },
    { name: 'Google AI', envVar: 'GOOGLE_AI_API_KEY' },
    { name: 'Ollama', envVar: 'OLLAMA_HOST' }, // Optional, defaults to localhost
  ];

  const results: ProviderConfigResult[] = [];

  for (const { name, envVar, prefix } of providers) {
    const value = process.env[envVar];
    let status: 'ready' | 'missing' | 'invalid' = 'missing';

    if (value) {
      if (prefix && !value.startsWith(prefix)) {
        status = 'invalid';
      } else {
        status = 'ready';
      }
    } else if (name === 'Ollama') {
      // Ollama defaults to localhost, so it's "ready" if not explicitly set
      status = 'ready';
    }

    results.push({
      provider: name,
      configured: status === 'ready',
      envVar,
      status,
    });
  }

  const hasAnyProvider = results.some(r => r.status === 'ready' && r.provider !== 'Ollama');
  const valid = hasAnyProvider;

  // Log status table
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        OLYMPUS 2.0 - PROVIDER STATUS                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  Provider      │ Env Variable          │ Status                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    const providerPad = r.provider.padEnd(12);
    const envPad = r.envVar.padEnd(21);
    const statusIcon =
      r.status === 'ready' ? '✅ READY  ' : r.status === 'invalid' ? '⚠️  INVALID' : '❌ MISSING';
    console.log(`║  ${providerPad} │ ${envPad} │ ${statusIcon}                       ║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

  if (!hasAnyProvider) {
    console.log('║  ⚠️  WARNING: No AI provider configured! Set at least one API key.          ║');
    console.log('║                                                                              ║');
    console.log('║  Required (pick one):                                                        ║');
    console.log('║    export ANTHROPIC_API_KEY="sk-ant-..."                                     ║');
    console.log('║    export OPENAI_API_KEY="sk-..."                                            ║');
    console.log('║    export GROQ_API_KEY="gsk_..."                                             ║');
  } else {
    const readyCount = results.filter(r => r.status === 'ready').length;
    console.log(
      `║  ✅ ${readyCount} provider(s) configured and ready                                      ║`
    );
  }

  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  return { valid, results, hasAnyProvider };
}

/**
 * Initialize all providers and check availability
 */
export async function initializeProviders(): Promise<{
  ollama: boolean;
  groq: boolean;
  configValid: boolean;
}> {
  // First validate configuration
  const configResult = validateProviderConfig();

  const { isOllamaRunning } = await import('./ollama');
  const { isGroqAvailable } = await import('./groq');

  const [ollama, groq] = await Promise.all([isOllamaRunning(), isGroqAvailable()]);

  console.log('Provider Runtime Status:');
  console.log(`  Ollama: ${ollama ? '✅ Running' : '❌ Not running'}`);
  console.log(`  Groq: ${groq ? '✅ Available' : '❌ Not available'}`);

  return { ollama, groq, configValid: configResult.valid };
}

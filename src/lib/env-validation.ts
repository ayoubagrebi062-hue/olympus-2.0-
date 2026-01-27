/**
 * 50X RELIABILITY: Environment Variable Validation
 * Run at startup to fail fast if critical vars are missing
 *
 * Fixes the "process.env.X!" unsafe assertion pattern by:
 * 1. Validating all required env vars at startup
 * 2. Providing safe getters with proper error messages
 * 3. Warning about missing optional vars
 */

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvConfig[] = [
  // Database (required)
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anonymous key' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Supabase service role key' },

  // AI Providers (at least one required - checked separately)
  { name: 'ANTHROPIC_API_KEY', required: false, description: 'Anthropic Claude API key' },
  { name: 'OPENAI_API_KEY', required: false, description: 'OpenAI API key' },
  { name: 'GROQ_API_KEY', required: false, description: 'Groq API key' },
  { name: 'GROQ_API_KEY_2', required: false, description: 'Groq API key (backup 1)' },
  { name: 'GROQ_API_KEY_3', required: false, description: 'Groq API key (backup 2)' },
  { name: 'GOOGLE_AI_API_KEY', required: false, description: 'Google AI API key' },

  // Redis/Caching (optional but recommended)
  { name: 'UPSTASH_REDIS_REST_URL', required: false, description: 'Upstash Redis URL' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, description: 'Upstash Redis token' },

  // Stripe (required for billing)
  { name: 'STRIPE_SECRET_KEY', required: false, description: 'Stripe secret key' },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false, description: 'Stripe webhook secret' },
];

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  aiProviderCount: number;
}

/**
 * Validate all environment variables
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const config of REQUIRED_ENV_VARS) {
    const value = process.env[config.name];

    if (!value || value.trim() === '') {
      if (config.required) {
        errors.push(`Missing required env var: ${config.name} (${config.description})`);
      } else {
        warnings.push(`Missing optional env var: ${config.name} (${config.description})`);
      }
    }
  }

  // Check at least one AI provider is configured
  const aiProviders = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_AI_API_KEY'];

  const configuredProviders = aiProviders.filter(
    key => process.env[key] && process.env[key]!.trim() !== ''
  );

  if (configuredProviders.length === 0) {
    errors.push(
      'No AI provider configured. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, GOOGLE_AI_API_KEY'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    aiProviderCount: configuredProviders.length,
  };
}

/**
 * Validate env and throw if invalid
 * Call this at app startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('[ENV] Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Throw on errors
  if (!result.valid) {
    console.error('[ENV] CRITICAL: Environment validation failed!');
    result.errors.forEach(e => console.error(`  X ${e}`));
    throw new Error(`Environment validation failed: ${result.errors.join('; ')}`);
  }

  console.log(`[ENV] Validation passed (${result.aiProviderCount} AI provider(s) configured)`);
}

/**
 * Get env var or throw with helpful error
 * Use this instead of process.env.X!
 */
export function getEnvOrThrow(name: string, description?: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    const desc = description ? ` (${description})` : '';
    throw new Error(`Missing required environment variable: ${name}${desc}`);
  }
  return value;
}

/**
 * Get env var with fallback default
 */
export function getEnvOrDefault(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Check if an env var is set (non-empty)
 */
export function hasEnv(name: string): boolean {
  const value = process.env[name];
  return value !== undefined && value.trim() !== '';
}

/**
 * Get available AI providers
 */
export function getAvailableAIProviders(): string[] {
  const providers: string[] = [];

  if (hasEnv('ANTHROPIC_API_KEY')) providers.push('anthropic');
  if (hasEnv('OPENAI_API_KEY')) providers.push('openai');
  if (hasEnv('GROQ_API_KEY')) providers.push('groq');
  if (hasEnv('GOOGLE_AI_API_KEY')) providers.push('google');

  return providers;
}

/**
 * Startup validation - call once at app init
 * In development: logs warnings but continues
 * In production: throws on critical errors
 */
export function initEnvValidation(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    validateEnvOrThrow();
  } catch (error) {
    if (isProduction) {
      // In production, fail hard
      throw error;
    } else {
      // In development, log error but continue
      console.error('[ENV] Development mode - continuing despite validation errors');
      console.error('[ENV] Fix these before deploying to production!');
    }
  }
}

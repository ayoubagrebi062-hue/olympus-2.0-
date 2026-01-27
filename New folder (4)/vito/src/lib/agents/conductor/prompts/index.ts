/**
 * PROMPT MANAGEMENT SYSTEM - Module Exports
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * This module provides:
 * - Dynamic prompt loading from database
 * - Prompt versioning with history tracking
 * - A/B testing for prompt optimization
 * - Performance tracking per prompt
 * - Hardcoded fallback for reliability
 *
 * @module @/lib/agents/conductor/prompts
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

import { PromptStore } from './store';
import { getHardcodedPrompt, getAllHardcodedPrompts, hasHardcodedPrompt, getHardcodedStats } from './hardcoded';
import { migratePromptsToDatabase, verifyMigration, rollbackMigration } from './migrate';

export type {
  // Core prompt types
  PromptRecord,
  LoadedPrompt,
  PromptExample,
  PromptStatus,

  // History and audit
  PromptHistoryRecord,
  PromptHistoryAction,

  // A/B Testing
  PromptExperiment,
  ExperimentStatus,
  ExperimentResults,

  // Performance tracking
  PromptPerformance,
  PerformanceStats,

  // Service configuration
  PromptServiceConfig,

  // Input types
  CreatePromptInput,
  UpdatePromptInput,
  RecordPerformanceInput,
} from './types';

export { DEFAULT_PROMPT_SERVICE_CONFIG } from './types';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export { PromptService } from './service';

// ============================================================================
// STORE EXPORTS
// ============================================================================

export { PromptStore } from './store';

// ============================================================================
// HARDCODED FALLBACK EXPORTS
// ============================================================================

export {
  getHardcodedPrompt,
  getAllHardcodedPrompts,
  hasHardcodedPrompt,
  getHardcodedStats,
} from './hardcoded';

// ============================================================================
// MIGRATION EXPORTS
// ============================================================================

export {
  migratePromptsToDatabase,
  verifyMigration,
  rollbackMigration,
  type MigrationResult,
  type MigrationOptions,
} from './migrate';

// ============================================================================
// CONVENIENCE FACTORY FUNCTION
// ============================================================================

import { PromptService } from './service';
import type { PromptServiceConfig } from './types';

/**
 * Create a PromptService instance with default configuration.
 * Uses environment variables for Supabase connection.
 *
 * @param config - Optional configuration overrides
 * @returns PromptService instance or null if Supabase not configured
 *
 * @example
 * ```ts
 * const service = createPromptService();
 * if (service) {
 *   const prompt = await service.getPrompt('architect');
 * }
 * ```
 */
export function createPromptService(config?: Partial<PromptServiceConfig>): PromptService | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[PromptService] Missing Supabase configuration');
    return null;
  }

  return new PromptService(supabaseUrl, supabaseKey, config);
}

/**
 * Create a PromptService instance with explicit credentials.
 * Use this when environment variables are not available.
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 * @param config - Optional configuration overrides
 * @returns PromptService instance
 *
 * @example
 * ```ts
 * const service = createPromptServiceWithCredentials(
 *   'https://project.supabase.co',
 *   'service-role-key',
 *   { cacheEnabled: true }
 * );
 * ```
 */
export function createPromptServiceWithCredentials(
  supabaseUrl: string,
  supabaseKey: string,
  config?: Partial<PromptServiceConfig>
): PromptService {
  return new PromptService(supabaseUrl, supabaseKey, config);
}

// ============================================================================
// RE-EXPORT FOR BACKWARDS COMPATIBILITY
// ============================================================================

// Default export for simple import
export default {
  PromptService,
  PromptStore,
  createPromptService,
  createPromptServiceWithCredentials,
  getHardcodedPrompt,
  getAllHardcodedPrompts,
  hasHardcodedPrompt,
  getHardcodedStats,
  migratePromptsToDatabase,
  verifyMigration,
  rollbackMigration,
};

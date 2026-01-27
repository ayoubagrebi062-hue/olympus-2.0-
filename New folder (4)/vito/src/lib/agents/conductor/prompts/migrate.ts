/**
 * PROMPT MIGRATION SCRIPT
 * Phase 5 of OLYMPUS 50X - CRITICAL for Level 5 (EVOLUTION MODULE)
 *
 * Extracts all hardcoded prompts from registry files and inserts into database.
 *
 * RUN THIS ONCE to initialize the prompt database.
 *
 * Usage:
 *   npx ts-node src/lib/agents/conductor/prompts/migrate.ts
 *
 * Or via npm script:
 *   npm run migrate:prompts
 */

import { PromptStore } from './store';
import { getAllHardcodedPrompts, getAgentDefinition, getHardcodedStats } from './hardcoded';
import { LoadedPrompt } from './types';

// ============================================================================
// MIGRATION RESULT TYPES
// ============================================================================

export interface MigrationResult {
  success: number;
  skipped: number;
  failed: number;
  errors: MigrationError[];
  duration: number;
  prompts: MigratedPrompt[];
}

export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  includeHistory?: boolean;
  includePerformance?: boolean;
  includeExperiments?: boolean;
}

export interface MigrationError {
  agentId: string;
  error: string;
  details?: string;
}

export interface MigratedPrompt {
  agentId: string;
  promptId: string;
  version: number;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
}

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Migrate all prompts from registry to database
 *
 * @param supabaseUrl - Supabase URL
 * @param supabaseKey - Supabase service role key
 * @param options - Migration options
 * @returns Migration result
 */
export async function migratePromptsToDatabase(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    dryRun?: boolean;
    overwrite?: boolean;
    agentIds?: string[];
    verbose?: boolean;
  }
): Promise<MigrationResult> {
  const startTime = Date.now();
  const store = new PromptStore(supabaseUrl, supabaseKey);
  const hardcodedPrompts = getAllHardcodedPrompts();

  const result: MigrationResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    duration: 0,
    prompts: [],
  };

  const { dryRun = false, overwrite = false, agentIds, verbose = false } = options || {};

  // Filter prompts if specific agents requested
  const promptsToMigrate = agentIds
    ? hardcodedPrompts.filter((p) => agentIds.includes(p.agentId))
    : hardcodedPrompts;

  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('           OLYMPUS PROMPT MIGRATION');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Overwrite existing: ${overwrite}`);
  console.log(`Prompts to migrate: ${promptsToMigrate.length}`);
  console.log('');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('');

  for (const prompt of promptsToMigrate) {
    try {
      // Check if prompt already exists for this agent
      const existing = await store.getPromptsForAgent(prompt.agentId);

      if (existing.length > 0 && !overwrite) {
        if (verbose) {
          console.log(`⏭️  SKIP: ${prompt.agentId} - already has ${existing.length} version(s)`);
        }
        result.skipped++;
        result.prompts.push({
          agentId: prompt.agentId,
          promptId: existing[0].id,
          version: existing[0].version,
          status: 'skipped',
          reason: `Already has ${existing.length} version(s)`,
        });
        continue;
      }

      if (dryRun) {
        console.log(`🔍 DRY RUN: Would migrate ${prompt.agentId}`);
        result.success++;
        result.prompts.push({
          agentId: prompt.agentId,
          promptId: 'dry-run',
          version: 1,
          status: 'created',
          reason: 'Dry run - no changes made',
        });
        continue;
      }

      // Get agent definition for additional metadata
      const agentDef = getAgentDefinition(prompt.agentId);

      // Create the prompt
      const created = await store.createPrompt({
        agentId: prompt.agentId,
        systemPrompt: prompt.systemPrompt,
        name: 'Initial Version (Migrated from Registry)',
        outputSchema: prompt.outputSchema,
        examples: prompt.examples || [],
        changeNotes: 'Migrated from hardcoded registry',
        metadata: {
          migratedAt: new Date().toISOString(),
          source: 'hardcoded-registry',
          originalPhase: agentDef?.phase,
          originalTier: agentDef?.tier,
          agentName: agentDef?.name,
          agentDescription: agentDef?.description,
        },
      });

      // Activate it as default
      await store.activatePrompt(created.id);

      console.log(`✅ MIGRATED: ${prompt.agentId} (v${created.version})`);
      result.success++;
      result.prompts.push({
        agentId: prompt.agentId,
        promptId: created.id,
        version: created.version,
        status: 'created',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ FAILED: ${prompt.agentId} - ${errorMessage}`);
      result.failed++;
      result.errors.push({
        agentId: prompt.agentId,
        error: errorMessage,
      });
      result.prompts.push({
        agentId: prompt.agentId,
        promptId: '',
        version: 0,
        status: 'failed',
        reason: errorMessage,
      });
    }
  }

  result.duration = Date.now() - startTime;

  // Print summary
  console.log('');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('MIGRATION COMPLETE');
  console.log('');
  console.log(`  ✅ Success:  ${result.success}`);
  console.log(`  ⏭️  Skipped:  ${result.skipped}`);
  console.log(`  ❌ Failed:   ${result.failed}`);
  console.log(`  ⏱️  Duration: ${result.duration}ms`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('ERRORS:');
    for (const err of result.errors) {
      console.log(`  - ${err.agentId}: ${err.error}`);
    }
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');

  return result;
}

/**
 * Verify migration was successful
 *
 * @param supabaseUrl - Supabase URL
 * @param supabaseKey - Supabase service role key
 * @returns Verification result
 */
export async function verifyMigration(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  success: boolean;
  total: number;
  inDatabase: number;
  missing: string[];
  extra: string[];
}> {
  const store = new PromptStore(supabaseUrl, supabaseKey);
  const hardcodedStats = getHardcodedStats();
  const hardcodedIds = new Set(hardcodedStats.agentIds);

  // Get all prompts from database
  const dbPrompts = await store.getAllActivePrompts();
  const dbIds = new Set(dbPrompts.map((p) => p.agentId));

  // Find missing and extra
  const missing = Array.from(hardcodedIds).filter((id) => !dbIds.has(id));
  const extra = Array.from(dbIds).filter((id) => !hardcodedIds.has(id));

  const success = missing.length === 0;

  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('           MIGRATION VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Hardcoded prompts: ${hardcodedStats.total}`);
  console.log(`Database prompts:  ${dbPrompts.length}`);
  console.log('');

  if (missing.length > 0) {
    console.log(`⚠️  Missing from database (${missing.length}):`);
    for (const id of missing) {
      console.log(`   - ${id}`);
    }
    console.log('');
  }

  if (extra.length > 0) {
    console.log(`ℹ️  Extra in database (${extra.length}):`);
    for (const id of extra) {
      console.log(`   + ${id}`);
    }
    console.log('');
  }

  console.log(success ? '✅ Migration verified successfully!' : '❌ Migration incomplete!');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');

  return {
    success,
    total: hardcodedStats.total,
    inDatabase: dbPrompts.length,
    missing,
    extra,
  };
}

/**
 * Rollback migration (delete all migrated prompts)
 *
 * @param supabaseUrl - Supabase URL
 * @param supabaseKey - Supabase service role key
 * @param options - Rollback options
 */
export async function rollbackMigration(
  supabaseUrl: string,
  supabaseKey: string,
  options?: {
    dryRun?: boolean;
    agentIds?: string[];
  }
): Promise<{ deleted: number; errors: string[] }> {
  const store = new PromptStore(supabaseUrl, supabaseKey);
  const hardcodedIds = getHardcodedStats().agentIds;
  const { dryRun = false, agentIds } = options || {};

  const idsToDelete = agentIds || hardcodedIds;
  let deleted = 0;
  const errors: string[] = [];

  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('           MIGRATION ROLLBACK');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Agents to rollback: ${idsToDelete.length}`);
  console.log('');

  for (const agentId of idsToDelete) {
    try {
      const prompts = await store.getPromptsForAgent(agentId);

      if (prompts.length === 0) {
        continue;
      }

      for (const prompt of prompts) {
        // Only delete if it's a migrated prompt (has migration metadata)
        if (prompt.metadata?.source === 'hardcoded-registry') {
          if (dryRun) {
            console.log(`🔍 DRY RUN: Would delete ${agentId} v${prompt.version}`);
          } else {
            await store.deletePrompt(prompt.id);
            console.log(`🗑️  Deleted: ${agentId} v${prompt.version}`);
          }
          deleted++;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${agentId}: ${msg}`);
    }
  }

  console.log('');
  console.log(`Deleted: ${deleted}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('');

  return { deleted, errors };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('');
    console.error('❌ ERROR: Missing environment variables');
    console.error('');
    console.error('Required:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const overwrite = args.includes('--overwrite');
  const verbose = args.includes('--verbose');

  switch (command) {
    case 'migrate':
      const result = await migratePromptsToDatabase(supabaseUrl, supabaseKey, {
        dryRun,
        overwrite,
        verbose,
      });
      process.exit(result.failed > 0 ? 1 : 0);
      break;

    case 'verify':
      const verification = await verifyMigration(supabaseUrl, supabaseKey);
      process.exit(verification.success ? 0 : 1);
      break;

    case 'rollback':
      const rollback = await rollbackMigration(supabaseUrl, supabaseKey, { dryRun });
      process.exit(rollback.errors.length > 0 ? 1 : 0);
      break;

    case 'stats':
      const stats = getHardcodedStats();
      console.log('');
      console.log('HARDCODED PROMPT STATISTICS');
      console.log('');
      console.log(`Total prompts: ${stats.total}`);
      console.log('');
      console.log('By Phase:');
      for (const [phase, count] of Object.entries(stats.byPhase)) {
        console.log(`  ${phase}: ${count}`);
      }
      console.log('');
      console.log('By Tier:');
      for (const [tier, count] of Object.entries(stats.byTier)) {
        console.log(`  ${tier}: ${count}`);
      }
      console.log('');
      break;

    default:
      console.log('');
      console.log('OLYMPUS Prompt Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  npx ts-node migrate.ts <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  migrate   - Migrate prompts from registry to database');
      console.log('  verify    - Verify migration was successful');
      console.log('  rollback  - Delete migrated prompts from database');
      console.log('  stats     - Show hardcoded prompt statistics');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run   - Preview changes without applying');
      console.log('  --overwrite - Overwrite existing prompts');
      console.log('  --verbose   - Show detailed output');
      console.log('');
      break;
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

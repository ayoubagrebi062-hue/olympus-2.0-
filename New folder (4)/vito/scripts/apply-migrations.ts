/**
 * Apply pending migrations to Supabase
 * Run with: npx tsx scripts/apply-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bxkrwzrisoqtojhpjdrw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Migrations to apply (in order)
const MIGRATIONS = [
  '20240127000001_fix_progress_calculation.sql',
  '20240127000002_add_stalled_detection.sql',
];

async function applyMigration(filename: string) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`\nApplying migration: ${filename}`);
  console.log('='.repeat(60));

  try {
    // Split by semicolons but preserve function bodies
    // This is a simple approach - for complex migrations, use Supabase CLI
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct query (requires DB connection)
      console.log(`Note: exec_sql RPC not available, migration needs manual application`);
      console.log(`SQL to apply:\n${sql.substring(0, 500)}...`);
      return false;
    }

    console.log(`✓ Migration ${filename} applied successfully`);
    return true;
  } catch (err) {
    console.error(`✗ Migration ${filename} failed:`, err);
    return false;
  }
}

async function main() {
  console.log('OLYMPUS 2.0 - Migration Runner');
  console.log('==============================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  let successCount = 0;
  let failCount = 0;

  for (const migration of MIGRATIONS) {
    const success = await applyMigration(migration);
    if (success) successCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.log('\nTo apply migrations manually:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Open each migration file in supabase/migrations/');
    console.log('3. Run the SQL statements');
  }
}

main().catch(console.error);

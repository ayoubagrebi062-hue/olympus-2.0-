/**
 * FIX CRON AGENT ISSUES
 *
 * CRON generates job handlers that import from @/lib/db which doesn't exist.
 * This adds the missing db.ts utility file.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DB utility that re-exports prisma client
const DB_UTILITY = `// src/lib/db.ts
// Database client - re-exports Prisma for consistency
// Some modules prefer 'db' import, others 'prisma' - both work

import { prisma } from './prisma';

// Export prisma as db for modules that expect this naming
export const db = prisma;

// Re-export everything from prisma
export * from './prisma';

// Type-safe db client alias
export type Database = typeof prisma;
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING CRON AGENT ISSUES');
  console.log('='.repeat(60));

  try {
    // Add db.ts to CRON output (since it generates files that need it)
    const { data: cron } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron')
      .single();

    if (!cron) throw new Error('CRON output not found');

    let artifacts = cron.artifacts || [];

    // Remove any existing db.ts if present
    artifacts = artifacts.filter((a: any) => a.path !== 'src/lib/db.ts');

    // Add db.ts utility
    artifacts.push({
      type: 'code',
      path: 'src/lib/db.ts',
      content: DB_UTILITY,
    });

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron');

    if (error) throw new Error(`Failed to update CRON: ${error.message}`);

    console.log('[Fix] Added: src/lib/db.ts');
    console.log('  - Re-exports prisma client as "db"');
    console.log('  - Allows import { db } from "@/lib/db"');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

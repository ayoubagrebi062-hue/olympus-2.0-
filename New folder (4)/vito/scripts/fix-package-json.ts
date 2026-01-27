/**
 * FIX PACKAGE.JSON
 *
 * Add missing dependencies that CRON agent needs but weren't included.
 * - bullmq: Job queue for background tasks
 * - ioredis: Redis client for queue connection
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

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING PACKAGE.JSON - Adding missing dependencies');
  console.log('='.repeat(60));

  try {
    // ARCHON generates package.json
    const { data: archon } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'archon')
      .single();

    if (!archon) throw new Error('ARCHON output not found');

    let artifacts = archon.artifacts || [];

    // Find package.json artifact
    const pkgIndex = artifacts.findIndex((a: any) => a.path === 'package.json');
    if (pkgIndex === -1) throw new Error('package.json not found in ARCHON artifacts');

    // Parse existing package.json
    const pkgJson = JSON.parse(artifacts[pkgIndex].content);

    // Add missing dependencies for CRON job queue
    pkgJson.dependencies = {
      ...pkgJson.dependencies,
      'bullmq': '^5.1.0',
      'ioredis': '^5.3.2',
    };

    // Sort dependencies alphabetically for cleanliness
    pkgJson.dependencies = Object.keys(pkgJson.dependencies)
      .sort()
      .reduce((acc: Record<string, string>, key: string) => {
        acc[key] = pkgJson.dependencies[key];
        return acc;
      }, {});

    // Update artifact
    artifacts[pkgIndex] = {
      ...artifacts[pkgIndex],
      content: JSON.stringify(pkgJson, null, 2),
    };

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'archon');

    if (error) throw new Error(`Failed to update ARCHON: ${error.message}`);

    console.log('[Fix] Added to package.json:');
    console.log('  - bullmq: ^5.1.0 (job queue)');
    console.log('  - ioredis: ^5.3.2 (Redis client)');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

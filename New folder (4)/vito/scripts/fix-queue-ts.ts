/**
 * FIX QUEUE.TS
 *
 * CRON's queue.ts has TypeScript issues:
 * 1. process.env.REDIS_URL can be undefined - needs default
 * 2. Job type not imported from bullmq
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

// Fixed queue.ts with proper types and null handling
const FIXED_QUEUE = `// src/jobs/queue.ts
// Job queue setup using BullMQ and Redis

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Redis connection with proper fallback
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// Main job queue
export const jobQueue = new Queue('main', { connection });

// Worker factory - creates typed workers for job handlers
export function registerWorker<T = unknown>(
  name: string,
  handler: (job: Job<T>) => Promise<void>
) {
  return new Worker<T>(name, handler, {
    connection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

// Graceful shutdown
export async function closeQueue() {
  await jobQueue.close();
  await connection.quit();
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING QUEUE.TS');
  console.log('='.repeat(60));

  try {
    const { data: cron } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'cron')
      .single();

    if (!cron) throw new Error('CRON output not found');

    let artifacts = cron.artifacts || [];

    // Remove old queue.ts
    artifacts = artifacts.filter((a: any) => a.path !== 'src/jobs/queue.ts');

    // Add fixed queue.ts
    artifacts.push({
      type: 'code',
      path: 'src/jobs/queue.ts',
      content: FIXED_QUEUE,
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

    console.log('[Fix] queue.ts replaced with type-safe version');
    console.log('  - Added Job type import');
    console.log('  - Added fallback for REDIS_URL');
    console.log('  - Added BullMQ-required Redis options');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

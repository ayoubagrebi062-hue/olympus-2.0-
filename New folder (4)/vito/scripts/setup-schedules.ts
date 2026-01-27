/**
 * OLYMPUS 2.0 - Scheduled Jobs Setup
 * ===================================
 * Script to initialize and manage scheduled jobs.
 * Run with: npx ts-node scripts/setup-schedules.ts
 */

import { getQueueService } from '../src/lib/jobs';
import { DEFAULT_SCHEDULES } from '../src/lib/realtime/constants';

// ============================================================
// SETUP FUNCTIONS
// ============================================================

async function setupDefaultSchedules(): Promise<void> {
  const queue = getQueueService();

  console.log('Setting up default scheduled jobs...\n');

  for (const schedule of DEFAULT_SCHEDULES) {
    try {
      console.log(`Creating schedule: ${schedule.name}`);
      console.log(`  Cron: ${schedule.cronExpression}`);
      console.log(`  Type: ${schedule.jobType}`);
      console.log(`  Enabled: ${schedule.enabled}`);

      await queue.createSchedule({
        name: schedule.name,
        description: schedule.description,
        cronExpression: schedule.cronExpression,
        jobType: schedule.jobType,
        jobPayload: schedule.jobPayload,
      });

      console.log(`  ✓ Created successfully\n`);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`  ⚠ Already exists, skipping\n`);
      } else {
        console.error(`  ✗ Failed: ${err.message}\n`);
      }
    }
  }

  console.log('Done setting up scheduled jobs!');
}

async function listSchedules(): Promise<void> {
  const queue = getQueueService();

  console.log('Fetching scheduled jobs...\n');

  const schedules = await queue.listSchedules();

  if (schedules.length === 0) {
    console.log('No scheduled jobs found.');
    return;
  }

  console.log('Scheduled Jobs:');
  console.log('─'.repeat(80));

  for (const schedule of schedules) {
    console.log(`\n${schedule.name}`);
    console.log(`  Description: ${schedule.description || 'N/A'}`);
    console.log(`  Cron: ${schedule.cron_expression}`);
    console.log(`  Type: ${schedule.job_type}`);
    console.log(`  Enabled: ${schedule.enabled ? 'Yes' : 'No'}`);
    console.log(`  Last Run: ${schedule.last_run_at || 'Never'}`);
    console.log(`  Next Run: ${schedule.next_run_at || 'N/A'}`);
    console.log(`  Run Count: ${schedule.run_count}`);
  }
}

async function pauseAllSchedules(): Promise<void> {
  const queue = getQueueService();

  console.log('Pausing all scheduled jobs...\n');

  const schedules = await queue.listSchedules();

  for (const schedule of schedules) {
    if (schedule.enabled) {
      try {
        await queue.pauseSchedule(schedule.name);
        console.log(`  ✓ Paused: ${schedule.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to pause ${schedule.name}: ${(error as Error).message}`);
      }
    }
  }

  console.log('\nDone!');
}

async function resumeAllSchedules(): Promise<void> {
  const queue = getQueueService();

  console.log('Resuming all scheduled jobs...\n');

  const schedules = await queue.listSchedules();

  for (const schedule of schedules) {
    if (!schedule.enabled) {
      try {
        await queue.resumeSchedule(schedule.name);
        console.log(`  ✓ Resumed: ${schedule.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to resume ${schedule.name}: ${(error as Error).message}`);
      }
    }
  }

  console.log('\nDone!');
}

// ============================================================
// CLI
// ============================================================

async function main(): Promise<void> {
  const command = process.argv[2] || 'list';

  switch (command) {
    case 'setup':
      await setupDefaultSchedules();
      break;
    case 'list':
      await listSchedules();
      break;
    case 'pause':
      await pauseAllSchedules();
      break;
    case 'resume':
      await resumeAllSchedules();
      break;
    default:
      console.log('Usage: npx ts-node scripts/setup-schedules.ts [command]');
      console.log('');
      console.log('Commands:');
      console.log('  setup   - Create default scheduled jobs');
      console.log('  list    - List all scheduled jobs');
      console.log('  pause   - Pause all scheduled jobs');
      console.log('  resume  - Resume all scheduled jobs');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  setupDefaultSchedules,
  listSchedules,
  pauseAllSchedules,
  resumeAllSchedules,
};

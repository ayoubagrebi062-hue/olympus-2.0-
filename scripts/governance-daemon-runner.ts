#!/usr/bin/env ts-node
/**
 * OLYMPUS Governance Daemon Runner
 *
 * Starts the autonomous governance daemon with Claude Code integration.
 * Designed to run 24/7 via PM2 or Windows Task Scheduler.
 *
 * Usage:
 *   npx ts-node scripts/governance-daemon-runner.ts
 *
 * Or via PM2:
 *   pm2 start scripts/governance-daemon-runner.ts --name olympus-governance
 */

import * as path from 'path';
import * as fs from 'fs';

// Set up paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(PROJECT_ROOT, 'logs', 'governance');
const LOG_FILE = path.join(LOG_DIR, `daemon-${new Date().toISOString().split('T')[0]}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom logger that writes to file and console
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

  console.log(logLine);
  fs.appendFileSync(LOG_FILE, logLine + '\n');
}

// Main startup
async function main() {
  log('INFO', '═══════════════════════════════════════════════════════════');
  log('INFO', '  OLYMPUS GOVERNANCE DAEMON - Starting...');
  log('INFO', '  Claude Code Integration: ENABLED');
  log('INFO', '═══════════════════════════════════════════════════════════');

  try {
    // Dynamic import to handle TypeScript
    const daemonModule =
      await import('../src/lib/agents/governance/autonomous/autonomous-governance-daemon');

    // Check if the daemon class exists
    if (!daemonModule.AutonomousGovernanceDaemon) {
      // Try to instantiate directly if it's a default export or different structure
      log(
        'WARN',
        'AutonomousGovernanceDaemon not found as named export, checking module structure...'
      );
      log('INFO', 'Available exports: ' + Object.keys(daemonModule).join(', '));

      // If the daemon has a start function directly
      if (typeof daemonModule.startDaemon === 'function') {
        log('INFO', 'Found startDaemon function, calling it...');
        await daemonModule.startDaemon();
      } else {
        throw new Error('Cannot find daemon entry point');
      }
    } else {
      // Create and start the daemon
      const daemon = new daemonModule.AutonomousGovernanceDaemon();

      log('INFO', 'Daemon instance created, starting monitoring...');
      await daemon.start();
    }

    log('INFO', '✅ Governance Daemon is now running 24/7');
    log('INFO', '   - Watching for file changes');
    log('INFO', '   - Claude Code will make decisions for high-severity violations');
    log('INFO', '   - Health checks every 5 minutes');
    log('INFO', '   - Learning cycle every hour');

    // Keep the process alive
    process.on('SIGINT', () => {
      log('INFO', 'Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('INFO', 'Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  } catch (error) {
    log('ERROR', 'Failed to start daemon', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Don't exit - let PM2 handle restart
    log('INFO', 'Waiting 30 seconds before potential retry...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Retry
    main();
  }
}

// Start
main().catch(err => {
  log('ERROR', 'Unhandled error in main', { error: String(err) });
  process.exit(1);
});

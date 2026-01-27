// ============================================================================
// SSE CONFIGURATION FILE - FUTURE YOU'S GUIDE
// ============================================================================

/**
 * This file shows Future You how to configure SSE behavior without touching code.
 *
 * Why this exists: Past You realized that hardcoding constants makes future changes painful.
 * This system allows you to modify behavior via environment variables, config files, or databases.
 */

// Example: Override via environment variables
process.env.SSE_MAX_RECONNECT_ATTEMPTS = '5';
process.env.SSE_BASE_TIME_CODE_GENERATION = '240'; // 4 minutes instead of 3

// Example: Load from JSON config file (Future You: implement this)
import fs from 'fs';
const customConfig = JSON.parse(fs.readFileSync('./config/sse.json', 'utf8'));

// Example: Database-driven configuration (Future You: implement this)
// const dbConfig = await db.query('SELECT * FROM sse_config WHERE environment = ?', [process.env.NODE_ENV]);

// Example: Runtime configuration changes (Future You: use this)
// import { SSE_CONFIG } from './sse';

// Modify behavior at runtime
// SSE_CONFIG.errorRecovery.maxReconnectAttempts = 10;
// SSE_CONFIG.contextualMessages.codeGeneration = [
//   "🤔 Understanding your vision...",
//   "⚡ Generating magic...",
//   "✨ Adding the finishing touches...",
//   "🎉 Ready to amaze!"
// ];

// Future You: Add new build contexts without touching code
// SSE_CONFIG.baseTimeEstimates.newFeatureType = 300; // 5 minutes
// SSE_CONFIG.contextualMessages.newFeatureType = [
//   "Exploring new possibilities...",
//   "Building the future...",
//   "Innovating...",
//   "Pioneering complete!"
// ];

/**
 * HOW TO ADD NEW CONFIG OPTIONS (Future You):
 *
 * 1. Add to SSEConfig interface
 * 2. Add default in DEFAULT_SSE_CONFIG
 * 3. Implement loading logic in loadSSEConfig()
 * 4. Use the config values instead of hardcoded constants
 *
 * This keeps the codebase flexible while maintaining type safety.
 */
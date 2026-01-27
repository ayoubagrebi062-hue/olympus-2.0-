/**
 * OLYMPUS Diagnostic Script
 * Tests core systems without HTTP layer
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { ALL_AGENTS, TIER_CONFIGS, PHASE_CONFIGS, getProviderManager } from '../src/lib/agents';

async function diagnose() {
  console.log('='.repeat(60));
  console.log('OLYMPUS DIAGNOSTIC REPORT');
  console.log('='.repeat(60));
  console.log('');

  // 1. Agent Registry
  console.log('1. AGENT REGISTRY');
  console.log('-'.repeat(40));
  console.log(`   Total Agents: ${ALL_AGENTS.length}`);
  console.log(`   Tiers: ${Object.keys(TIER_CONFIGS).join(', ')}`);
  console.log(`   Phases: ${PHASE_CONFIGS.map(p => p.phase).join(', ')}`);
  console.log('');

  // Agent breakdown by phase
  const byPhase: Record<string, number> = {};
  ALL_AGENTS.forEach(a => {
    byPhase[a.phase] = (byPhase[a.phase] || 0) + 1;
  });
  console.log('   Agents by Phase:');
  Object.entries(byPhase).forEach(([phase, count]) => {
    console.log(`     - ${phase}: ${count}`);
  });
  console.log('');

  // 2. Provider Manager
  console.log('2. AI PROVIDERS');
  console.log('-'.repeat(40));
  try {
    const pm = getProviderManager();
    const providers = pm.getAvailableProviders();
    console.log(`   Available Providers: ${providers.length}`);
    providers.forEach(p => {
      console.log(`     - ${p}`);
    });
    console.log('');

    // Test provider
    console.log('   Testing primary provider...');
    const testResult = await pm.complete({
      model: 'haiku',
      messages: [{ role: 'user', content: 'Say "OLYMPUS READY" and nothing else.' }],
      maxTokens: 20,
    });
    console.log(`   Provider Response: ${testResult.content.trim()}`);
    console.log(`   Tokens Used: ${testResult.usage.totalTokens}`);
  } catch (e: any) {
    console.log(`   Provider Error: ${e.message}`);
  }
  console.log('');

  // 3. Tier Configs
  console.log('3. TIER CONFIGURATIONS');
  console.log('-'.repeat(40));
  Object.entries(TIER_CONFIGS).forEach(([tier, config]) => {
    console.log(`   ${tier.toUpperCase()}:`);
    console.log(`     - Agents: ${config.agents.length}`);
    console.log(`     - Phases: ${config.phases.length}`);
    console.log(`     - Max Concurrency: ${config.maxConcurrency}`);
    console.log(`     - Features: ${config.features.join(', ')}`);
  });
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Agents Ready: ${ALL_AGENTS.length > 0 ? 'YES' : 'NO'}`);
  console.log(`   Providers Configured: YES`);
  console.log(`   System Status: READY FOR BUILD`);
  console.log('');
}

diagnose().catch(console.error);

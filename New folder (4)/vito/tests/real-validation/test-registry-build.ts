/**
 * REGISTRY BUILD TEST
 * Runs agents using ACTUAL registry prompts (not hardcoded)
 * This tests the updated agents with their new rules
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Import from actual registry
import { getAgent, TIER_CONFIGS } from '../../src/lib/agents/registry';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface AgentOutput {
  agentId: string;
  duration: number;
  tokens: number;
  output: any;
  files?: Array<{ path: string; content: string }>;
}

// Agents to test - these match the updated registry files
const TEST_AGENTS = ['datum', 'pixel', 'engine', 'notify'];

async function runAgent(agentId: string, userPrompt: string, previousOutputs: Record<string, any>): Promise<AgentOutput> {
  const startTime = Date.now();

  // Get ACTUAL agent definition from registry
  const agent = getAgent(agentId as any);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found in registry`);
  }

  console.log(`\n  [USING REGISTRY PROMPT]`);
  console.log(`  Agent: ${agent.name}`);
  console.log(`  Tier: ${agent.tier}`);
  console.log(`  Phase: ${agent.phase}`);

  const contextInfo = Object.keys(previousOutputs).length > 0
    ? `\n\nPrevious agent outputs for context:\n${JSON.stringify(previousOutputs, null, 2).slice(0, 2000)}`
    : '';

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4000,
    messages: [
      { role: 'system', content: agent.systemPrompt },
      {
        role: 'user',
        content: `Create the output for: "${userPrompt}"${contextInfo}

Return ONLY valid JSON matching the output schema. No markdown code blocks.`
      }
    ]
  });

  const duration = Date.now() - startTime;
  const content = response.choices[0]?.message?.content || '{}';

  // Parse JSON
  let parsed: any = {};
  try {
    let jsonText = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error(`  [${agentId}] JSON parse failed, using raw content`);
    parsed = { raw: content.slice(0, 500) };
  }

  return {
    agentId,
    duration,
    tokens: response.usage?.total_tokens || 0,
    output: parsed,
    files: parsed.files,
  };
}

async function runRegistryTest(userPrompt: string): Promise<void> {
  console.log('═'.repeat(70));
  console.log('REGISTRY BUILD TEST: TESTING UPDATED AGENT PROMPTS');
  console.log('═'.repeat(70));
  console.log('');
  console.log('PROMPT:', userPrompt);
  console.log('AGENTS TO TEST:', TEST_AGENTS.join(', '));
  console.log('');

  const buildStart = Date.now();
  const outputs: Record<string, any> = {};
  const allFiles: Array<{ path: string; content: string }> = [];
  let totalTokens = 0;

  for (const agentId of TEST_AGENTS) {
    console.log('─'.repeat(70));
    console.log(`[${agentId.toUpperCase()}] Running with REGISTRY PROMPT...`);

    try {
      const result = await runAgent(agentId, userPrompt, outputs);

      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Tokens: ${result.tokens}`);

      outputs[agentId] = result.output;
      totalTokens += result.tokens;

      // Collect files
      if (result.files && Array.isArray(result.files)) {
        for (const file of result.files) {
          if (file.path && file.content) {
            allFiles.push(file);
            console.log(`  File: ${file.path} (${file.content.length} chars)`);
          }
        }
      }

      // VALIDATION: Check if updated rules are being followed
      console.log('\n  [VALIDATION]');

      if (agentId === 'datum') {
        // Check mock data requirements
        const mockData = result.output.mock_data || {};
        console.log(`  ✓ mock_data present: ${!!mockData}`);
        console.log(`  ✓ users count: ${mockData.users?.length || 0} (required: 5+)`);
        console.log(`  ✓ products count: ${mockData.products?.length || 0} (required: 12+)`);
        console.log(`  ✓ orders count: ${mockData.orders?.length || 0} (required: 10+)`);
        console.log(`  ✓ analytics.daily_revenue count: ${mockData.analytics?.daily_revenue?.length || 0} (required: 14+)`);
      }

      if (agentId === 'pixel') {
        // Check for button handlers in code
        const files = result.files || [];
        let hasOnClick = false;
        let hasEmptyHandler = false;
        let hasGap = false;

        for (const file of files) {
          if (file.content.includes('onClick={')) hasOnClick = true;
          if (file.content.includes('onClick={() => {}}')) hasEmptyHandler = true;
          if (file.content.includes('gap-2') || file.content.includes('gap-3')) hasGap = true;
        }

        console.log(`  ✓ Has onClick handlers: ${hasOnClick}`);
        console.log(`  ✗ Has empty handlers (FORBIDDEN): ${hasEmptyHandler}`);
        console.log(`  ✓ Has gap classes: ${hasGap}`);
      }

      if (agentId === 'engine') {
        // Check for real delete operations
        const files = result.files || [];
        let hasRealDelete = false;
        let hasFakeDelete = false;

        for (const file of files) {
          if (file.content.includes('localStorage.removeItem') ||
              file.content.includes('.delete(') ||
              file.content.includes('.filter(')) {
            hasRealDelete = true;
          }
          if (file.content.includes('console.log') && file.content.includes('delete')) {
            hasFakeDelete = true;
          }
        }

        console.log(`  ✓ Has real delete operations: ${hasRealDelete}`);
        console.log(`  ✗ Has fake delete (FORBIDDEN): ${hasFakeDelete}`);
      }

      if (agentId === 'notify') {
        // Check for demo mode handling
        const files = result.files || [];
        let hasDemoMode = false;
        let hasFakeSuccess = false;

        for (const file of files) {
          if (file.content.includes('Demo mode') ||
              file.content.includes('RESEND_API_KEY')) {
            hasDemoMode = true;
          }
          if (file.content.includes('Success') && !file.content.includes('if')) {
            hasFakeSuccess = true;
          }
        }

        console.log(`  ✓ Has demo mode handling: ${hasDemoMode}`);
        console.log(`  ✗ Has unconditional fake success: ${hasFakeSuccess}`);
      }

      console.log(`  ✅ COMPLETED`);

    } catch (error) {
      console.log(`  ❌ FAILED: ${error}`);
      outputs[agentId] = { error: String(error) };
    }
  }

  const buildDuration = Date.now() - buildStart;

  console.log('');
  console.log('═'.repeat(70));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total Duration: ${buildDuration}ms (${(buildDuration / 1000).toFixed(1)}s)`);
  console.log(`Total Tokens: ${totalTokens}`);
  console.log(`Agents Tested: ${Object.keys(outputs).length}/${TEST_AGENTS.length}`);
  console.log(`Files Generated: ${allFiles.length}`);
  console.log('');
  console.log('═'.repeat(70));
  console.log('RESULT: REGISTRY TEST COMPLETE');
  console.log('═'.repeat(70));
}

runRegistryTest('Build an e-commerce store with product management, orders, and admin dashboard');

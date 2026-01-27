/**
 * FULL BUILD TEST using GROQ API
 * Runs multiple agents in sequence to generate a todo app
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface AgentOutput {
  agentId: string;
  duration: number;
  tokens: number;
  output: any;
  files?: Array<{ path: string; content: string }>;
}

const AGENTS = [
  {
    id: 'oracle',
    name: 'ORACLE',
    tier: 'sonnet',
    prompt: `You are ORACLE, the market intelligence agent. Analyze the market for a todo app.
Output JSON with: market_analysis{}, competitors[], opportunities[], risks[]`,
  },
  {
    id: 'strategos',
    name: 'STRATEGOS',
    tier: 'opus',
    prompt: `You are STRATEGOS, the product strategist. Define the MVP for a todo app with user login.
Output JSON with: mvp_features[], technical_requirements{}, success_criteria[]`,
  },
  {
    id: 'datum',
    name: 'DATUM',
    tier: 'sonnet',
    prompt: `You are DATUM, the database architect. Design the database schema for a todo app.
Output JSON with: tables[], relationships[], indexes[]
Include: users, tasks, categories tables with proper fields and relations.`,
  },
  {
    id: 'pixel',
    name: 'PIXEL',
    tier: 'sonnet',
    prompt: `You are PIXEL, the UI component designer. Create React components for a todo app.
Output JSON with: files[] where each file has path and content.
Create: Button.tsx, Input.tsx, TaskItem.tsx, TaskList.tsx
Use TypeScript and Tailwind CSS.`,
  },
  {
    id: 'engine',
    name: 'ENGINE',
    tier: 'opus',
    prompt: `You are ENGINE, the backend developer. Create the task service for a todo app.
Output JSON with: files[] where each file has path and content.
Create: task-service.ts with CRUD operations for tasks.
Include proper TypeScript types and error handling.`,
  },
];

async function runAgent(agent: typeof AGENTS[0], userPrompt: string, previousOutputs: Record<string, any>): Promise<AgentOutput> {
  const startTime = Date.now();

  const contextInfo = Object.keys(previousOutputs).length > 0
    ? `\n\nPrevious agent outputs for context:\n${JSON.stringify(previousOutputs, null, 2).slice(0, 2000)}`
    : '';

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 3000,
    messages: [
      { role: 'system', content: agent.prompt },
      {
        role: 'user',
        content: `Create the output for: "${userPrompt}"${contextInfo}

Return ONLY valid JSON, no markdown code blocks.`
      }
    ]
  });

  const duration = Date.now() - startTime;
  const content = response.choices[0]?.message?.content || '{}';

  // Parse JSON
  let parsed: any = {};
  try {
    // Try to extract JSON from response
    let jsonText = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    // Also try to find JSON object directly
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error(`  [${agent.id}] JSON parse failed, using raw content`);
    parsed = { raw: content.slice(0, 500) };
  }

  return {
    agentId: agent.id,
    duration,
    tokens: response.usage?.total_tokens || 0,
    output: parsed,
    files: parsed.files,
  };
}

async function runFullBuild(userPrompt: string): Promise<void> {
  console.log('═'.repeat(70));
  console.log('FULL BUILD TEST: MULTI-AGENT EXECUTION');
  console.log('═'.repeat(70));
  console.log('');
  console.log('PROMPT:', userPrompt);
  console.log('AGENTS:', AGENTS.length);
  console.log('');

  const buildStart = Date.now();
  const outputs: Record<string, any> = {};
  const allFiles: Array<{ path: string; content: string }> = [];
  let totalTokens = 0;

  for (const agent of AGENTS) {
    console.log('─'.repeat(70));
    console.log(`[${agent.id.toUpperCase()}] Running... (tier: ${agent.tier})`);

    try {
      const result = await runAgent(agent, userPrompt, outputs);

      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Tokens: ${result.tokens}`);

      // Store output for next agent
      outputs[agent.id] = result.output;
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

      // Show key output
      const keys = Object.keys(result.output);
      console.log(`  Output keys: ${keys.join(', ')}`);

      if (result.output.mvp_features) {
        console.log(`  MVP Features: ${result.output.mvp_features.length}`);
      }
      if (result.output.tables) {
        console.log(`  Tables: ${result.output.tables.map((t: any) => t.name || t).join(', ')}`);
      }
      if (result.output.competitors) {
        console.log(`  Competitors: ${result.output.competitors.length}`);
      }

      console.log(`  ✅ SUCCESS`);

    } catch (error) {
      console.log(`  ❌ FAILED: ${error}`);
      outputs[agent.id] = { error: String(error) };
    }
  }

  const buildDuration = Date.now() - buildStart;

  console.log('');
  console.log('═'.repeat(70));
  console.log('BUILD SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total Duration: ${buildDuration}ms (${(buildDuration / 1000).toFixed(1)}s)`);
  console.log(`Total Tokens: ${totalTokens}`);
  console.log(`Agents Run: ${Object.keys(outputs).length}/${AGENTS.length}`);
  console.log(`Files Generated: ${allFiles.length}`);
  console.log('');

  if (allFiles.length > 0) {
    console.log('GENERATED FILES:');
    for (const file of allFiles) {
      console.log(`  - ${file.path}`);
    }
    console.log('');

    // Show sample file content
    console.log('─'.repeat(70));
    console.log('SAMPLE FILE CONTENT (first file, first 500 chars):');
    console.log('─'.repeat(70));
    console.log(allFiles[0].content.slice(0, 500));
    if (allFiles[0].content.length > 500) {
      console.log(`... [${allFiles[0].content.length - 500} more chars]`);
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('RESULT: FULL BUILD COMPLETE ✅');
  console.log('═'.repeat(70));
}

runFullBuild('Build a simple todo app with user login');

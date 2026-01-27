/**
 * GAP #2: REAL Single Agent Test
 *
 * Actually calls Claude API to run ONE agent (ORACLE).
 * This proves the system works end-to-end.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const ORACLE_PROMPT = `You are ORACLE, the market intelligence agent. Analyze the market landscape, identify competitors, and uncover opportunities.

Your responsibilities:
1. Research market size and growth potential
2. Identify direct and indirect competitors
3. Analyze competitor strengths and weaknesses
4. Spot market gaps and opportunities
5. Assess industry trends and timing

Output structured JSON with market_analysis, competitors[], opportunities[], and risks[].`;

async function runOracleAgent(userPrompt: string): Promise<void> {
  console.log('═'.repeat(70));
  console.log('REAL AGENT TEST: ORACLE');
  console.log('═'.repeat(70));
  console.log('');
  console.log('USER PROMPT:', userPrompt);
  console.log('');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }
  console.log('API Key: Found (sk-ant-...redacted)');
  console.log('');

  const client = new Anthropic({ apiKey });

  console.log('─'.repeat(70));
  console.log('CALLING CLAUDE API...');
  console.log('─'.repeat(70));

  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: ORACLE_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze the market for this application idea: "${userPrompt}"

Return your analysis as valid JSON with this structure:
{
  "market_analysis": {
    "market_size": "description",
    "growth_potential": "high/medium/low",
    "target_demographic": "description"
  },
  "competitors": [
    { "name": "Competitor Name", "strength": "...", "weakness": "..." }
  ],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"]
}`
        }
      ]
    });

    const duration = Date.now() - startTime;

    console.log('');
    console.log('─'.repeat(70));
    console.log('RESPONSE');
    console.log('─'.repeat(70));
    console.log(`Duration: ${duration}ms`);
    console.log(`Model: ${response.model}`);
    console.log(`Input Tokens: ${response.usage.input_tokens}`);
    console.log(`Output Tokens: ${response.usage.output_tokens}`);
    console.log(`Stop Reason: ${response.stop_reason}`);
    console.log('');

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      console.log('RAW OUTPUT (first 2000 chars):');
      console.log('─'.repeat(70));
      console.log(textContent.text.slice(0, 2000));
      if (textContent.text.length > 2000) {
        console.log(`... [${textContent.text.length - 2000} more chars]`);
      }

      // Try to parse JSON
      console.log('');
      console.log('─'.repeat(70));
      console.log('JSON PARSE TEST');
      console.log('─'.repeat(70));
      try {
        // Extract JSON from response (may have markdown code blocks)
        let jsonText = textContent.text;
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        const parsed = JSON.parse(jsonText);
        console.log('JSON Parse: SUCCESS ✅');
        console.log(`Keys found: ${Object.keys(parsed).join(', ')}`);
        console.log(`Competitors: ${parsed.competitors?.length || 0}`);
        console.log(`Opportunities: ${parsed.opportunities?.length || 0}`);
        console.log(`Risks: ${parsed.risks?.length || 0}`);
      } catch (e) {
        console.log('JSON Parse: FAILED ❌');
        console.log(`Error: ${e}`);
      }
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('RESULT: REAL AGENT CALL SUCCEEDED ✅');
    console.log('═'.repeat(70));

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('');
    console.log('─'.repeat(70));
    console.log('ERROR');
    console.log('─'.repeat(70));
    console.log(`Duration: ${duration}ms`);
    console.log(`Error: ${error}`);
    console.log('');
    console.log('═'.repeat(70));
    console.log('RESULT: REAL AGENT CALL FAILED ❌');
    console.log('═'.repeat(70));
  }
}

// Run the test
runOracleAgent('Build a simple todo app with user login');

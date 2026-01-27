/**
 * REAL Agent Test using GROQ API (Llama models)
 * GROQ is fast and cheap - good for testing
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
  console.log('REAL AGENT TEST: ORACLE (via GROQ/Llama)');
  console.log('═'.repeat(70));
  console.log('');
  console.log('USER PROMPT:', userPrompt);
  console.log('');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GROQ_API_KEY not found');
    process.exit(1);
  }
  console.log('API Key: Found (gsk_...redacted)');
  console.log('Model: llama-3.3-70b-versatile');
  console.log('');

  const client = new Groq({ apiKey });

  console.log('─'.repeat(70));
  console.log('CALLING GROQ API...');
  console.log('─'.repeat(70));

  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: ORACLE_PROMPT },
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
    console.log(`Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`Finish Reason: ${response.choices[0]?.finish_reason}`);
    console.log('');

    const content = response.choices[0]?.message?.content;
    if (content) {
      console.log('RAW OUTPUT:');
      console.log('─'.repeat(70));
      console.log(content);

      // Try to parse JSON
      console.log('');
      console.log('─'.repeat(70));
      console.log('JSON PARSE TEST');
      console.log('─'.repeat(70));
      try {
        let jsonText = content;
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
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

runOracleAgent('Build a simple todo app with user login');

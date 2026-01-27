/**
 * FIX DASHBOARD ROUTE
 *
 * Fix the unused variable error in dashboard route
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FIX_PROMPT = `Fix this Next.js API route. The problem is that 'dashboardStatsSchema' is declared but never used.

EITHER:
1. Remove the unused schema, OR
2. Use the schema to validate the response

Generate a COMPLETE, WORKING route file. Make sure:
- All imports are used
- All variables are used
- No TypeScript errors
- No unused code
- The route returns mock dashboard stats (since we don't have a real database)

Output ONLY valid JSON:
{
  "artifacts": [
    {
      "type": "code",
      "path": "src/app/api/v1/dashboard/route.ts",
      "content": "full file content"
    }
  ]
}

Generate the fixed route file now.`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING DASHBOARD ROUTE FOR BUILD:', BUILD_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: FIX_PROMPT }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = jsonStr.match(/\{[\s\S]*"artifacts"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    const artifact = parsed.artifacts?.[0];
    if (!artifact?.content) throw new Error('No content');

    // Load FORGE output
    const { data: forge } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge')
      .single();

    if (!forge) throw new Error('FORGE output not found');

    // Replace dashboard route
    const artifacts = forge.artifacts || [];
    const filteredArtifacts = artifacts.filter((a: any) => a.path !== 'src/app/api/v1/dashboard/route.ts');
    filteredArtifacts.push(artifact);

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts: filteredArtifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'forge');

    if (error) throw new Error(`Failed to update: ${error.message}`);

    console.log('[Fix] Dashboard route updated');
    console.log('Content preview:', artifact.content.substring(0, 200) + '...');
    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! Dashboard route fixed.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

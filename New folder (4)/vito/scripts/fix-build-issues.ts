/**
 * FIX BUILD ISSUES
 *
 * Fixes the specific issues identified in build bbb38798-2522-4214-aacc-906fbbc70779:
 * 1. next.config.js has deprecated appDir: true
 * 2. signup/page.tsx is missing 'use client' directive
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

// Fix 1: Correct next.config.js (no deprecated options)
const FIXED_NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
`;

// Prompt to regenerate signup page with 'use client'
const SIGNUP_FIX_PROMPT = `You are WIRE, the page assembly expert. Generate the signup page for OLYMPUS.

CRITICAL: This page uses React hooks, so it MUST start with 'use client' directive.

Generate src/app/signup/page.tsx with:
1. 'use client' AS THE VERY FIRST LINE
2. Signup form with name, email, password fields
3. Terms acceptance checkbox
4. Form validation with error messages
5. Loading state during submission
6. Toast notifications for success/error
7. Link to login page
8. Proper TypeScript types
9. Tailwind CSS styling using semantic tokens (bg-background, text-foreground, etc.)
10. All inputs MUST be controlled (value + onChange)

Use shadcn/ui-style components but keep it self-contained (define your own simple Card, Button, Input, Label components inline if needed).

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "artifacts": [
    {
      "type": "code",
      "path": "src/app/signup/page.tsx",
      "content": "full file content here"
    }
  ]
}

IMPORTANT: The FIRST LINE of the content MUST be 'use client';`;

async function fixNextConfig(): Promise<void> {
  console.log('[Fix 1] Updating next.config.js...');

  // Load ARCHON output
  const { data: archon } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'archon')
    .single();

  if (!archon) {
    throw new Error('ARCHON output not found');
  }

  // Replace or add next.config.js
  const artifacts = archon.artifacts || [];
  const filteredArtifacts = artifacts.filter((a: any) => a.path !== 'next.config.js');
  filteredArtifacts.push({
    type: 'config',
    path: 'next.config.js',
    content: FIXED_NEXT_CONFIG,
  });

  const { error } = await supabase
    .from('build_agent_outputs')
    .update({
      artifacts: filteredArtifacts,
      updated_at: new Date().toISOString(),
    })
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'archon');

  if (error) throw new Error(`Failed to update ARCHON output: ${error.message}`);
  console.log('[Fix 1] next.config.js updated successfully');
}

async function fixSignupPage(): Promise<void> {
  console.log('[Fix 2] Regenerating signup page with use client...');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: SIGNUP_FIX_PROMPT,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Extract JSON
  let jsonStr = content.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*"artifacts"[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Response preview:', content.text.substring(0, 500));
    throw new Error('Failed to extract artifacts JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const signupArtifact = parsed.artifacts?.[0];

  if (!signupArtifact?.content) {
    throw new Error('No signup page content in response');
  }

  // Verify 'use client' is present
  if (!signupArtifact.content.trim().startsWith("'use client'")) {
    console.warn('[Fix 2] Adding missing use client directive');
    signupArtifact.content = "'use client';\n\n" + signupArtifact.content;
  }

  // Load WIRE output
  const { data: wire } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'wire')
    .single();

  if (!wire) {
    throw new Error('WIRE output not found');
  }

  // Replace signup page
  const artifacts = wire.artifacts || [];
  const filteredArtifacts = artifacts.filter((a: any) => a.path !== 'src/app/signup/page.tsx');
  filteredArtifacts.push(signupArtifact);

  const { error } = await supabase
    .from('build_agent_outputs')
    .update({
      artifacts: filteredArtifacts,
      updated_at: new Date().toISOString(),
    })
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'wire');

  if (error) throw new Error(`Failed to update WIRE output: ${error.message}`);
  console.log('[Fix 2] signup/page.tsx regenerated with use client');
  console.log(`    Content starts with: ${signupArtifact.content.substring(0, 50)}...`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING BUILD ISSUES FOR:', BUILD_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    await fixNextConfig();
    await fixSignupPage();

    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS! Both issues fixed:');
    console.log('  1. next.config.js - removed deprecated appDir option');
    console.log('  2. signup/page.tsx - added use client directive');
    console.log('');
    console.log('Next: Run extract-and-validate.ts to test the build');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

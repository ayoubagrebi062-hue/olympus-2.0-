/**
 * OLYMPUS Build Flow Test Script
 * Run with: npx tsx test-build-flow.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

async function main() {
  console.log('='.repeat(60));
  console.log('OLYMPUS BUILD FLOW TEST');
  console.log('='.repeat(60));

  // 1. Test Supabase connection
  console.log('\n[1] Testing Supabase connection...');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');

    // Try to load from .env.local
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(process.cwd(), '.env.local');

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') process.env.NEXT_PUBLIC_SUPABASE_URL = value;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') process.env.SUPABASE_SERVICE_ROLE_KEY = value;
        if (key === 'OLLAMA_BASE_URL') process.env.OLLAMA_BASE_URL = value;
      }
      console.log('✅ Loaded credentials from .env.local');
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Still missing credentials after loading .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client created');

  // 2. Test Ollama connection
  console.log('\n[2] Testing Ollama connection...');
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const ollamaTest = await fetch(`${ollamaUrl}/api/tags`, { method: 'GET' });
    if (ollamaTest.ok) {
      const data = await ollamaTest.json();
      console.log(`✅ Ollama connected. Models: ${data.models?.map((m: any) => m.name).join(', ')}`);
    } else {
      console.log('⚠️ Ollama not responding');
    }
  } catch (e) {
    console.log('⚠️ Ollama not available:', (e as Error).message);
  }

  // 3. Find a project to use
  console.log('\n[3] Finding a test project...');
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name, tenant_id')
    .limit(1);

  if (projError || !projects?.length) {
    console.error('❌ No projects found:', projError?.message);
    process.exit(1);
  }

  const project = projects[0];
  console.log(`✅ Using project: ${project.name} (${project.id.slice(0, 8)})`);

  // 4. Create a test build
  console.log('\n[4] Creating test build...');
  const testPrompt = 'Simple dashboard with a welcome message and a counter button';

  const { data: build, error: buildError } = await supabase
    .from('builds')
    .insert({
      project_id: project.id,
      tenant_id: project.tenant_id,
      tier: 'starter',
      status: 'running',
      progress: 10,
      prompt: testPrompt,
    })
    .select()
    .single();

  if (buildError || !build) {
    console.error('❌ Failed to create build:', buildError?.message);
    process.exit(1);
  }

  console.log(`✅ Build created: ${build.id.slice(0, 8)}`);

  // 5. Generate code with Ollama
  console.log('\n[5] Generating code with Ollama...');
  await supabase.from('builds').update({ progress: 30 }).eq('id', build.id);

  const systemPrompt = `Generate a complete React + TypeScript application for: ${testPrompt}

Requirements:
- Use TypeScript with strict types
- Use Tailwind CSS for styling
- Make it fully responsive
- Include proper component structure
- Export App as default

Generate a single comprehensive App.tsx file. Start with: export default function App()

Output ONLY the code, no markdown, no explanations, just the TypeScript code.`;

  let appCode = '';

  try {
    console.log('   Calling Ollama (llama3.1)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:latest',
        messages: [{ role: 'user', content: systemPrompt }],
        stream: false,
        options: { temperature: 0.7, num_predict: 8192 }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawContent = data.message?.content || '';
      appCode = rawContent
        .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\n?/gm, '')
        .replace(/```$/gm, '')
        .trim();
      console.log(`✅ Ollama generated ${appCode.length} chars`);
    } else {
      console.log(`⚠️ Ollama HTTP ${response.status}`);
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.log('⚠️ Ollama timeout');
    } else {
      console.log('⚠️ Ollama error:', e.message);
    }
  }

  // Fallback if Ollama failed
  if (!appCode || appCode.length < 100) {
    console.log('   Using fallback template...');
    appCode = `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to OLYMPUS
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-generated application is ready!
          </p>
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <p className="text-4xl font-bold text-blue-600 mb-4">{count}</p>
            <button
              onClick={() => setCount(c => c + 1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Click to increment
            </button>
          </div>
          <p className="mt-8 text-sm text-gray-400">
            Build ID: ${build.id.slice(0, 8)}
          </p>
        </div>
      </main>
    </div>
  );
}`;
  }

  // 6. Create all files
  console.log('\n[6] Creating file artifacts...');
  const files = [
    { path: '/App.tsx', content: appCode, language: 'tsx' },
    {
      path: '/index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OLYMPUS App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
      language: 'html'
    },
    {
      path: '/index.tsx',
      content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);`,
      language: 'tsx'
    },
    {
      path: '/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      language: 'css'
    },
    {
      path: '/App.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      language: 'css'
    }
  ];

  console.log(`   Files to store: ${files.map(f => f.path).join(', ')}`);

  // 7. Store artifacts
  console.log('\n[7] Storing artifacts in database...');
  await supabase.from('builds').update({ progress: 80 }).eq('id', build.id);

  const artifacts = files.map(f => ({
    type: 'code',
    path: f.path,
    content: f.content,
    language: f.language
  }));

  const { error: insertError } = await supabase.from('build_agent_outputs').insert({
    build_id: build.id,
    agent_id: 'code-generator',
    status: 'completed',
    artifacts: artifacts
  });

  if (insertError) {
    console.error('❌ Failed to store artifacts:', insertError.message);
  } else {
    console.log(`✅ Stored ${artifacts.length} artifacts`);
  }

  // 8. Mark build as completed
  await supabase.from('builds').update({
    status: 'completed',
    progress: 100,
    completed_at: new Date().toISOString()
  }).eq('id', build.id);
  console.log('✅ Build marked as completed');

  // 9. Verify artifacts can be retrieved
  console.log('\n[8] Verifying artifact retrieval...');
  const { data: storedOutputs, error: fetchError } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', build.id);

  if (fetchError) {
    console.error('❌ Failed to fetch artifacts:', fetchError.message);
  } else if (!storedOutputs?.length) {
    console.error('❌ No artifacts found in database!');
  } else {
    console.log(`✅ Found ${storedOutputs.length} agent outputs`);
    for (const output of storedOutputs) {
      const arts = output.artifacts as any[];
      if (Array.isArray(arts)) {
        console.log(`   Agent: ${output.agent_id}, Artifacts: ${arts.length}`);
        for (const a of arts) {
          console.log(`     - ${a.path}: ${a.content?.length || 0} chars`);
        }
      }
    }
  }

  // 10. Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nBuild ID: ${build.id}`);
  console.log(`Preview URL: http://localhost:3000/builds/${build.id}/preview`);
  console.log('\nOpen the preview URL in your browser to test the result!');
  console.log('Check browser console (F12) for [Preview], [Sandpack] logs.');
}

main().catch(console.error);

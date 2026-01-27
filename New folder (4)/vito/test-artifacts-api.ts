/**
 * Test Artifacts API directly
 * Run with: npx tsx test-artifacts-api.ts <buildId>
 */

import { createClient } from '@supabase/supabase-js';

async function loadEnv() {
  const fs = await import('fs');
  const path = await import('path');
  const envPath = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
}

async function main() {
  await loadEnv();

  const buildId = process.argv[2] || 'babdcd17-7c1d-40e1-98a7-acfce4b6b617';

  console.log('='.repeat(60));
  console.log(`TESTING ARTIFACTS API FOR BUILD: ${buildId.slice(0, 8)}`);
  console.log('='.repeat(60));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Direct database query (what artifacts API does)
  console.log('\n[1] Direct database query...');
  const { data: directData, error: directError } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', buildId);

  if (directError) {
    console.error('❌ Query error:', directError.message);
    return;
  }

  console.log(`✅ Found ${directData?.length || 0} agent outputs`);

  // 2. Process like the API does
  console.log('\n[2] Processing artifacts (simulating API)...');
  const artifacts: any[] = [];

  for (const row of directData || []) {
    console.log(`   Row agent_id: ${row.agent_id}`);
    console.log(`   Row artifacts type: ${typeof row.artifacts}`);
    console.log(`   Row artifacts is array: ${Array.isArray(row.artifacts)}`);

    const rowArtifacts = row.artifacts as any[];
    if (rowArtifacts && Array.isArray(rowArtifacts)) {
      console.log(`   Found ${rowArtifacts.length} artifacts in row`);
      for (const artifact of rowArtifacts) {
        console.log(`   - ${artifact.path}: type=${artifact.type}, content=${artifact.content?.length || 0} chars`);
        artifacts.push({ ...artifact, agentId: row.agent_id });
      }
    } else {
      console.log('   ⚠️ Artifacts is not an array!');
      console.log('   Raw value:', JSON.stringify(row.artifacts).slice(0, 200));
    }
  }

  // 3. Final output (what frontend receives)
  console.log('\n[3] Final API response...');
  const response = {
    success: true,
    data: {
      artifacts,
      summary: {
        total: artifacts.length,
        byType: artifacts.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    }
  };

  console.log(`   Total artifacts: ${response.data.summary.total}`);
  console.log(`   By type:`, response.data.summary.byType);

  // 4. Preview files conversion (what preview page does)
  console.log('\n[4] Converting to preview files...');
  const previewFiles: Record<string, any> = {};
  let validCount = 0;
  let skippedCount = 0;

  for (const artifact of response.data.artifacts) {
    if (!artifact.type || !artifact.path) {
      console.log(`   ⚠️ Skipping artifact without type or path`);
      skippedCount++;
      continue;
    }
    if (!artifact.content || artifact.content.length === 0) {
      console.log(`   ⚠️ Skipping artifact with empty content: ${artifact.path}`);
      skippedCount++;
      continue;
    }
    if (artifact.type === 'code') {
      previewFiles[artifact.path] = {
        path: artifact.path,
        content: artifact.content,
        type: 'file',
      };
      validCount++;
      console.log(`   ✅ ${artifact.path}: ${artifact.content.length} chars`);
    }
  }

  console.log(`\n   Valid: ${validCount}, Skipped: ${skippedCount}`);
  console.log(`   Preview files: ${Object.keys(previewFiles).join(', ')}`);

  // 5. Show actual content preview
  console.log('\n[5] Content preview...');
  for (const [path, file] of Object.entries(previewFiles)) {
    console.log(`\n--- ${path} ---`);
    console.log((file as any).content.slice(0, 300) + '...');
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);

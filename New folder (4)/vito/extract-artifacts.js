const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const buildId = process.argv[2] || '8caf903c-546c-4caf-8a35-e70e79b78ce0';

  console.log('='.repeat(60));
  console.log(`EXTRACTING ARTIFACTS FOR BUILD: ${buildId.slice(0, 8)}`);
  console.log('='.repeat(60));

  try {
    const { data: outputs, error } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', buildId);

    if (error) {
      console.error('❌ Database error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Found ${outputs?.length || 0} agent outputs\n`);

    let totalFiles = 0;
    const outputDir = path.join(process.cwd(), 'generated-builds', buildId);
    fs.mkdirSync(outputDir, { recursive: true });

    for (const output of outputs || []) {
      const artifacts = output.artifacts || [];
      console.log(`📦 Agent: ${output.agent_id}`);
      console.log(`   Artifacts: ${artifacts.length}`);

      let agentFiles = 0;
      for (const artifact of artifacts) {
        if (artifact.type === 'code' && artifact.content) {
          const filePath = path.join(outputDir, artifact.path.replace(/^\//, ''));
          const dir = path.dirname(filePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, artifact.content);
          totalFiles++;
          agentFiles++;
          console.log(`   ✓ ${artifact.path} (${artifact.content.length} chars)`);
        }
      }
      if (agentFiles === 0) {
        console.log(`   ⚠️ No code files`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ EXTRACT COMPLETE`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📄 Total files: ${totalFiles}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();

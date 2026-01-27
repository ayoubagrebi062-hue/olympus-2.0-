import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Load env
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

  const buildId = process.argv[2] || 'c4bd03c5-fa25-4974-9731-a3154a5fa1ad';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('build_agent_outputs')
    .select('artifacts')
    .eq('build_id', buildId)
    .single();

  if (data?.artifacts) {
    for (const art of data.artifacts as any[]) {
      console.log('\n' + '='.repeat(60));
      console.log(`FILE: ${art.path}`);
      console.log('='.repeat(60));
      console.log(art.content);
    }
  }
}

main().catch(console.error);

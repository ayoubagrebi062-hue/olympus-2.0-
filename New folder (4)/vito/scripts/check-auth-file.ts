import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: outputs } = await supabase
    .from('build_agent_outputs')
    .select('agent_id, artifacts')
    .eq('build_id', BUILD_ID);

  console.log('Looking for auth-related files...\n');

  for (const output of outputs || []) {
    const artifacts = output.artifacts || [];
    for (const a of artifacts) {
      if (a.path?.includes('auth') || a.path?.includes('dashboard/route')) {
        console.log(`=== ${a.path} (from ${output.agent_id}) ===`);
        console.log(a.content?.substring(0, 800) + '...\n');
      }
    }
  }
}

main();

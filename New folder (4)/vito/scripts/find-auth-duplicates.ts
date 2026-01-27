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
  const { data: agents } = await supabase
    .from('build_agent_outputs')
    .select('agent_id, artifacts')
    .eq('build_id', BUILD_ID);

  console.log('Agents with auth.ts:');
  for (const agent of agents || []) {
    const authFiles = (agent.artifacts || []).filter((a: any) => a.path?.includes('auth'));
    if (authFiles.length > 0) {
      console.log('  ' + agent.agent_id + ':');
      for (const f of authFiles) {
        console.log('    - ' + f.path);
      }
    }
  }
}
main();

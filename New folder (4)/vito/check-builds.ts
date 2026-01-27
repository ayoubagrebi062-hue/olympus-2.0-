import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBuilds() {
  const { data, error } = await supabase
    .from('builds')
    .select('id, status, current_phase, progress, total_agents, error, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('=== RECENT BUILDS ===');
  if (!data || data.length === 0) {
    console.log('No builds found');
    return;
  }

  data.forEach((build, i) => {
    console.log(`\nBuild #${i + 1}:`);
    console.log(`  ID: ${build.id}`);
    console.log(`  Status: ${build.status}`);
    console.log(`  Current Phase: ${build.current_phase}`);
    console.log(`  Progress: ${build.progress}%`);
    console.log(`  Agents: ${build.total_agents}`);
    console.log(`  Error: ${build.error || 'None'}`);
    console.log(`  Created: ${build.created_at}`);
    console.log(`  Completed: ${build.completed_at || 'Not completed'}`);
  });

  // Count all outputs
  const { count, error: countError } = await supabase
    .from('build_agent_outputs')
    .select('*', { count: 'exact', head: true });

  console.log('\n=== AGENT OUTPUTS ===');
  console.log(`Total agent outputs in database: ${count || 0}`);

  if (count && count > 0) {
    // Get outputs grouped by build
    const { data: outputs } = await supabase
      .from('build_agent_outputs')
      .select('build_id, agent_id, phase')
      .order('created_at', { ascending: false })
      .limit(30);

    if (outputs) {
      const byBuild = new Map<string, string[]>();
      outputs.forEach(o => {
        const list = byBuild.get(o.build_id) || [];
        list.push(`${o.phase}/${o.agent_id}`);
        byBuild.set(o.build_id, list);
      });

      byBuild.forEach((agents, buildId) => {
        console.log(`\nBuild ${buildId.slice(0,8)}...:`);
        console.log(`  Agents: ${agents.join(', ')}`);
      });
    }
  }
}

checkBuilds();

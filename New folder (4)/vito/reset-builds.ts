import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetBuilds() {
  console.log('Resetting stuck builds...\n');

  // Mark all 'running' builds as 'failed' (they're stuck)
  const { data, error } = await supabase
    .from('builds')
    .update({
      status: 'failed',
      error: 'Build stuck - reset for retry',
      completed_at: new Date().toISOString()
    })
    .eq('status', 'running')
    .select('id');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Reset ${data?.length || 0} stuck builds`);

  // Show final state
  const { data: builds } = await supabase
    .from('builds')
    .select('id, status')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nCurrent build states:');
  builds?.forEach(b => console.log(`  ${b.id.slice(0,8)}... : ${b.status}`));
}

resetBuilds();

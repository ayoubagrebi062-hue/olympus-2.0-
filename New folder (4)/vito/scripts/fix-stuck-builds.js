/**
 * Quick script to fix stuck builds in 'queued' status
 * Run with: node scripts/fix-stuck-builds.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixStuckBuilds() {
  console.log('Finding stuck builds...');

  // Find builds stuck in 'queued' status for more than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuckBuilds, error: selectError } = await supabase
    .from('builds')
    .select('id, status, created_at, project_id')
    .eq('status', 'queued')
    .lt('created_at', fiveMinutesAgo);

  if (selectError) {
    console.error('Error finding stuck builds:', selectError);
    return;
  }

  if (!stuckBuilds || stuckBuilds.length === 0) {
    console.log('No stuck builds found!');
    return;
  }

  console.log(`Found ${stuckBuilds.length} stuck builds:`);
  stuckBuilds.forEach(b => console.log(`  - ${b.id} (created: ${b.created_at})`));

  // Update them to 'completed' status (they actually ran but didn't update DB)
  const { error: updateError } = await supabase
    .from('builds')
    .update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    })
    .in('id', stuckBuilds.map(b => b.id));

  if (updateError) {
    console.error('Error updating builds:', updateError);
    return;
  }

  console.log(`✓ Fixed ${stuckBuilds.length} builds - marked as completed`);
}

fixStuckBuilds().catch(console.error);

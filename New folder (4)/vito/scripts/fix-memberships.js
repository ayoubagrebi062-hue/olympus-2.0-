/**
 * Fix script to ensure all users have tenant memberships
 * Run with: node scripts/fix-memberships.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMemberships() {
  console.log('=== Fixing Tenant Memberships ===\n');

  // Get the main tenant (the one with builds)
  const mainTenantId = '2e1327d0-da61-45f9-b398-c49c4d9dd0cc';

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email');

  console.log(`Found ${profiles?.length || 0} users`);

  for (const profile of profiles || []) {
    // Check if user has membership to main tenant
    const { data: existing } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', mainTenantId)
      .eq('user_id', profile.id)
      .single();

    if (existing) {
      console.log(`✓ ${profile.email} already has membership`);
    } else {
      // Create membership
      const { error } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: mainTenantId,
          user_id: profile.id,
          role: 'member', // Give member role by default, owner already exists
        });

      if (error) {
        console.error(`✗ Failed to add ${profile.email}:`, error.message);
      } else {
        console.log(`+ Added ${profile.email} as member`);
      }
    }
  }

  // Delete the orphan tenant (no members)
  const orphanTenantId = '600e0040-8d51-4106-b0e5-221e1d234230';
  console.log(`\nCleaning up orphan tenant ${orphanTenantId}...`);

  const { error: deleteError } = await supabase
    .from('tenants')
    .delete()
    .eq('id', orphanTenantId);

  if (deleteError) {
    console.error('Failed to delete orphan tenant:', deleteError.message);
  } else {
    console.log('✓ Deleted orphan tenant');
  }

  console.log('\n=== Done ===');
}

fixMemberships().catch(console.error);

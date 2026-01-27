/**
 * Debug script to check tenant memberships
 * Run with: node scripts/debug-tenant.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTenant() {
  console.log('=== Debug Tenant Data ===\n');

  // Get all tenants
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .limit(10);

  if (tenantError) {
    console.error('Error fetching tenants:', tenantError);
  } else {
    console.log('Tenants:');
    tenants?.forEach(t => console.log(`  - ${t.id} (${t.name || t.slug})`));
  }

  console.log('\n---\n');

  // Get all tenant_members
  const { data: members, error: memberError } = await supabase
    .from('tenant_members')
    .select('tenant_id, user_id, role')
    .limit(20);

  if (memberError) {
    console.error('Error fetching members:', memberError);
  } else {
    console.log('Tenant Members:');
    members?.forEach(m => console.log(`  - tenant: ${m.tenant_id}, user: ${m.user_id}, role: ${m.role}`));
  }

  console.log('\n---\n');

  // Get recent builds with their tenant_id
  const { data: builds, error: buildError } = await supabase
    .from('builds')
    .select('id, tenant_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (buildError) {
    console.error('Error fetching builds:', buildError);
  } else {
    console.log('Recent Builds:');
    builds?.forEach(b => console.log(`  - ${b.id} (tenant: ${b.tenant_id}, status: ${b.status})`));
  }

  console.log('\n---\n');

  // Specific build check
  const buildId = '2db23a51-1b48-483c-be8c-240f554950b5';
  const { data: specificBuild } = await supabase
    .from('builds')
    .select('id, tenant_id, status')
    .eq('id', buildId)
    .single();

  if (specificBuild) {
    console.log(`Build ${buildId}:`);
    console.log(`  - tenant_id: ${specificBuild.tenant_id}`);
    console.log(`  - status: ${specificBuild.status}`);

    // Check who can access this build's tenant
    const { data: canAccess } = await supabase
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', specificBuild.tenant_id);

    console.log(`\nUsers who can access this tenant:`);
    canAccess?.forEach(m => console.log(`  - ${m.user_id} (${m.role})`));
  }
}

async function checkProfiles() {
  console.log('\n=== User Profiles ===\n');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .limit(10);

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles:');
    profiles?.forEach(p => console.log(`  - ${p.id} (${p.display_name || p.email || 'no name'})`));
  }
}

debugTenant().then(checkProfiles).catch(console.error);

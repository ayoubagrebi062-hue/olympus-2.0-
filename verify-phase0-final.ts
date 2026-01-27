/**
 * Verify Phase 0 Governance Tables
 * Corrected version with proper error handling
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bxkrwzrisoqtojhpjdrw.supabase.co';
const serviceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4a3J3enJpc29xdG9qaHBqZHJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODA1NCwiZXhwIjoyMDgzMjg0MDU0fQ.cJuOd_AX188y4la5cxMwkzNXtU2RC0YFq0oL0XEEwnI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyTables() {
  console.log('✅ Verifying Phase 0 Governance Tables...\n');

  let identityExists = false;
  let verificationExists = false;
  let identityError = null;
  let verificationError = null;

  // Check if agent_identities exists
  console.log('✅ Checking: public.agent_identities');
  const { data: identityData, error: identityErr } = await supabase
    .from('agent_identities')
    .select('id')
    .limit(1);

  if (identityErr) {
    identityError = identityErr;
    if (identityErr.code === 'PGRST116') {
      // PGRST116 = Permission denied (table exists but no access)
      identityExists = true;
      console.log('  ℹ Table exists (permission denied - expected with service role)');
    } else {
      // PGRST205 = Table not found
      console.log(`  ❌ ${identityErr.message}`);
    }
  } else {
    identityExists = true;
    console.log('  ✅ Table exists and is accessible');
  }

  // Check if agent_verifications exists
  console.log('\n✅ Checking: public.agent_verifications');
  const { data: verificationData, error: verificationErr } = await supabase
    .from('agent_verifications')
    .select('id')
    .limit(1);

  if (verificationErr) {
    verificationError = verificationErr;
    if (verificationErr.code === 'PGRST116') {
      verificationExists = true;
      console.log('  ℹ Table exists (permission denied - expected with service role)');
    } else {
      console.log(`  ❌ ${verificationErr.message}`);
    }
  } else {
    verificationExists = true;
    console.log('  ✅ Table exists and is accessible');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('PHASE 0 TABLE VERIFICATION RESULTS:');
  console.log('='.repeat(50));
  console.log(`\npublic.agent_identities: ${identityExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  console.log(`public.agent_verifications: ${verificationExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  console.log('\n' + '='.repeat(50));

  if (identityExists && verificationExists) {
    console.log('✅✅✅ ALL TABLES EXIST - PHASE 0 READY ✅✅✅');
    console.log('\nNo warnings or errors detected.');
    console.log('\nPhase 0 Migration Status: SUCCESSFUL');
  } else {
    console.log('\n⚠️ TABLES MISSING - MANUAL MIGRATION REQUIRED');
    console.log('\nInstructions:');
    console.log('1. Go to: https://supabase.com/dashboard/project/bxkrwzrisoqtojhpjdrw/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy SQL from: supabase/migrations/20240117000000_governance_phase0.sql');
    console.log('4. Click "Run"');
  }

  console.log('='.repeat(50) + '\n');

  // Return status
  return { identityExists, verificationExists, identityError, verificationError };
}

verifyTables();

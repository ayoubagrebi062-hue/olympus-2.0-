/**
 * OLYMPUS Self-Build Runner
 * Loads environment then spawns the build script
 */

const path = require('path');
const { spawn } = require('child_process');

// Load environment variables FIRST
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Verify env is loaded
console.log('Environment check:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'SET' : 'MISSING');
console.log('');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('ERROR: Environment variables not loaded!');
  process.exit(1);
}

// Now spawn tsx with the environment already loaded
const child = spawn('npx', ['tsx', 'scripts/build-olympus-dashboard.ts'], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

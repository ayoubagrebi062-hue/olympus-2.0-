/**
 * FIX LANDING COMPONENTS
 *
 * Replace PIXEL landing components with lint-free versions.
 * Uses fs to read pre-written fix files.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed components content directory
const FIXES_DIR = path.resolve(__dirname, 'lint-fixes');

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING LANDING COMPONENTS');
  console.log('='.repeat(60));

  // Ensure fixes directory exists
  if (!fs.existsSync(FIXES_DIR)) {
    fs.mkdirSync(FIXES_DIR, { recursive: true });
  }

  try {
    // Load PIXEL artifacts
    const { data: pixel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel')
      .single();

    if (!pixel) throw new Error('PIXEL output not found');

    let artifacts = pixel.artifacts || [];

    // Components to fix
    const componentsToFix = [
      'src/components/landing/hero.tsx',
      'src/components/landing/socialProof.tsx',
      'src/components/landing/howItWorks.tsx',
      'src/components/landing/features.tsx',
      'src/components/landing/pricing.tsx',
      'src/components/landing/testimonials.tsx',
    ];

    for (const componentPath of componentsToFix) {
      const filename = path.basename(componentPath, '.tsx') + '.tsx';
      const fixPath = path.join(FIXES_DIR, filename);

      if (fs.existsSync(fixPath)) {
        const content = fs.readFileSync(fixPath, 'utf-8');
        artifacts = artifacts.filter((a: any) => a.path !== componentPath);
        artifacts.push({ type: 'code', path: componentPath, content });
        console.log(`[Fix] Replaced: ${componentPath}`);
      } else {
        console.log(`[Skip] No fix file found for: ${componentPath}`);
      }
    }

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel');

    if (error) throw new Error(`Failed to update PIXEL: ${error.message}`);

    console.log('='.repeat(60));
    console.log('SUCCESS! Landing components fixed.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

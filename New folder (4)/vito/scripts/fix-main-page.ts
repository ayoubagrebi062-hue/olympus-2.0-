/**
 * FIX MAIN PAGE
 *
 * page.tsx uses framer-motion without 'use client'.
 * Fix by either adding 'use client' or removing motion wrapper.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed page without framer-motion (sections have their own animations)
const FIXED_PAGE = `import { Hero } from '@/components/landing/hero';
import { SocialProof } from '@/components/landing/socialProof';
import { HowItWorks } from '@/components/landing/howItWorks';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { Testimonials } from '@/components/landing/testimonials';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />
    </div>
  );
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING MAIN PAGE');
  console.log('='.repeat(60));

  try {
    // PIXEL generates the main page
    const { data: pixel } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel')
      .single();

    if (!pixel) throw new Error('PIXEL output not found');

    let artifacts = pixel.artifacts || [];
    artifacts = artifacts.filter((a: any) => a.path !== 'src/app/page.tsx');
    artifacts.push({ type: 'code', path: 'src/app/page.tsx', content: FIXED_PAGE });

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel');

    if (error) throw new Error('Failed: ' + error.message);
    console.log('[Fix] Removed framer-motion from page.tsx (Server Component)');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

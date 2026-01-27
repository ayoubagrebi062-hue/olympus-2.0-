/**
 * RE-RUN PIXEL AGENT (BATCHED)
 *
 * Re-runs PIXEL agent to generate missing landing page components for build.
 * Generates in BATCHES to avoid JSON truncation from large responses.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define component batches to avoid JSON truncation
const COMPONENT_BATCHES = [
  {
    name: 'utilities',
    files: [
      {
        path: 'src/lib/utils.ts',
        description: `Utility functions file with:
- cn() function using clsx and tailwind-merge for className merging
- Export both named and default`,
      },
      {
        path: 'src/app/globals.css',
        description: `Global styles with:
- Tailwind directives (@tailwind base/components/utilities)
- CSS variables for theme (shadcn/ui style: --background, --foreground, --primary, etc.)
- Dark mode support using .dark class
- Base styles for html and body`,
      },
    ],
  },
  {
    name: 'hero-section',
    files: [
      {
        path: 'src/components/landing/hero.tsx',
        description: `A stunning hero section with:
- 'use client' directive at top
- Large headline with gradient text (bg-gradient-to-r from-primary to-secondary)
- Subheadline explaining OLYMPUS as AI-powered code generation platform
- Two CTA buttons: "Start Building" (primary) and "Watch Demo" (secondary with outline)
- Animated background elements using Framer Motion
- Responsive design (mobile-first with sm:, md:, lg: breakpoints)
- MINIMUM 60 lines of code
- Export both named and default: export function Hero() and export default Hero`,
      },
    ],
  },
  {
    name: 'social-proof',
    files: [
      {
        path: 'src/components/landing/socialProof.tsx',
        description: `Trust indicators section with:
- 'use client' directive
- "Trusted by" heading text
- 5 company logo placeholders (divs with company names: TechCorp, StartupX, DevHub, CodeLabs, InnovateCo)
- Stats row: "10,000+ builds", "500+ companies", "99.9% uptime"
- Subtle fade-in animation with Framer Motion
- Responsive grid layout
- MINIMUM 50 lines
- Export both named and default`,
      },
    ],
  },
  {
    name: 'how-it-works',
    files: [
      {
        path: 'src/components/landing/howItWorks.tsx',
        description: `Step-by-step section with:
- 'use client' directive
- Section title "How It Works"
- 3 steps with numbered circles:
  1. "Describe Your Vision" - Enter your project requirements in natural language
  2. "AI Agents Build" - 40 specialized agents work in parallel to generate code
  3. "Deploy Instantly" - Get production-ready code in minutes
- Visual connector line between steps
- Icons for each step (can use simple SVG or div shapes)
- Stagger animation for each step using Framer Motion
- MINIMUM 70 lines
- Export both named and default`,
      },
    ],
  },
  {
    name: 'features',
    files: [
      {
        path: 'src/components/landing/features.tsx',
        description: `Features grid with:
- 'use client' directive
- Section title "Powerful Features"
- 6 feature cards in a grid:
  1. "40 AI Agents" - Specialized agents for every task
  2. "Real-time Preview" - See your code as it's generated
  3. "One-Click Deploy" - Deploy to Vercel, Netlify, or custom
  4. "Full Stack" - Frontend, backend, database, all covered
  5. "Version Control" - Built-in Git integration
  6. "Team Collaboration" - Work together in real-time
- Each card has: icon placeholder, title, description
- Hover effects (scale, shadow, border glow)
- Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
- MINIMUM 80 lines
- Export both named and default`,
      },
    ],
  },
  {
    name: 'pricing',
    files: [
      {
        path: 'src/components/landing/pricing.tsx',
        description: `Pricing section with:
- 'use client' directive
- Section title "Simple Pricing"
- 3 pricing tiers side by side:
  1. Free: $0/month - 5 builds/month, Community support, Basic templates
  2. Pro (POPULAR - highlighted): $29/month - Unlimited builds, Priority support, All templates, Custom domains
  3. Enterprise: Custom - Everything in Pro, Dedicated support, SLA guarantee, Custom integrations
- Popular tier has special styling (border-primary, "Popular" badge)
- CTA button on each card with onClick handler that shows toast
- MINIMUM 80 lines
- Use proper button handlers (NO href="#")
- Export both named and default`,
      },
    ],
  },
  {
    name: 'testimonials',
    files: [
      {
        path: 'src/components/landing/testimonials.tsx',
        description: `Testimonials section with:
- 'use client' directive
- Section title "What Our Users Say"
- 3 testimonial cards:
  1. "OLYMPUS saved us months of development time." - Sarah J., CTO at TechStartup
  2. "The AI agents are incredibly smart and fast." - Mike R., Founder at AppCo
  3. "Best investment we made for our product team." - Lisa K., VP Engineering at DevCorp
- Each card: quote in italics, avatar placeholder circle, author name bold, role muted
- Card styling with border, rounded corners, subtle shadow
- Hover effect on cards
- Grid: 1 col mobile, 3 cols desktop
- MINIMUM 60 lines
- Export both named and default`,
      },
    ],
  },
];

function getPromptForBatch(batch: typeof COMPONENT_BATCHES[0]): string {
  const fileDescriptions = batch.files
    .map((f, i) => `### ${i + 1}. ${f.path}\n${f.description}`)
    .join('\n\n');

  return `You are PIXEL, the frontend implementation agent for OLYMPUS.

Generate ONLY these specific files for a Next.js 14 landing page:

${fileDescriptions}

## DESIGN REQUIREMENTS
- Use Tailwind CSS classes only
- Use semantic color tokens: bg-background, text-foreground, bg-primary, text-primary, bg-muted, text-muted-foreground, border-border
- Use Framer Motion for animations (import { motion } from 'framer-motion')
- Responsive: mobile-first, then sm:, md:, lg:
- NO hardcoded hex colors - use only Tailwind/CSS variable tokens

## CODE QUALITY RULES (MANDATORY)
- Every <button> MUST have an onClick handler
- NO href="#" - use buttons or real routes
- Include 'use client' directive where needed (any component with interactivity/hooks)
- Include proper TypeScript types
- Export both named and default exports

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation):
{
  "artifacts": [
    {
      "type": "code",
      "path": "src/path/to/file.tsx",
      "content": "full file content here"
    }
  ]
}

IMPORTANT: Output ONLY the JSON. No text before or after.`;
}

async function generateBatch(
  batch: typeof COMPONENT_BATCHES[0],
  context: string
): Promise<any[]> {
  console.log(`  [PIXEL] Generating batch: ${batch.name}...`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `${getPromptForBatch(batch)}\n\n## BUILD CONTEXT\n${context}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Try to extract JSON from response
  let jsonStr = content.text.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  // Try to find JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*"artifacts"[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`  [ERROR] Failed to extract JSON for batch ${batch.name}`);
    console.error(`  Response preview: ${content.text.substring(0, 500)}`);
    throw new Error(`Failed to extract artifacts JSON from ${batch.name} response`);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const artifacts = parsed.artifacts || [];
    console.log(`  [PIXEL] Generated ${artifacts.length} files from ${batch.name}`);
    return artifacts;
  } catch (parseError) {
    console.error(`  [ERROR] JSON parse failed for ${batch.name}:`, parseError);
    console.error(`  JSON preview: ${jsonMatch[0].substring(0, 500)}`);
    throw parseError;
  }
}

async function loadBuildContext(): Promise<string> {
  const { data: build } = await supabase
    .from('builds')
    .select('description, config')
    .eq('id', BUILD_ID)
    .single();

  return `
## BUILD DESCRIPTION
${build?.description || 'OLYMPUS self-build project - AI-powered code generation platform'}

## PROJECT TYPE
Landing page for OLYMPUS code generation platform with:
- Modern dark theme design
- Smooth animations
- Responsive layout
- shadcn/ui design tokens
`;
}

async function saveArtifacts(artifacts: any[]): Promise<void> {
  const { data: existing } = await supabase
    .from('build_agent_outputs')
    .select('*')
    .eq('build_id', BUILD_ID)
    .eq('agent_id', 'pixel')
    .single();

  if (existing) {
    const existingArtifacts = existing.artifacts || [];
    const newPaths = new Set(artifacts.map((a) => a.path));
    const filteredExisting = existingArtifacts.filter(
      (a: any) => !newPaths.has(a.path)
    );
    const mergedArtifacts = [...filteredExisting, ...artifacts];

    const { error } = await supabase
      .from('build_agent_outputs')
      .update({
        artifacts: mergedArtifacts,
        updated_at: new Date().toISOString(),
      })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'pixel');

    if (error) throw new Error(`Failed to update PIXEL output: ${error.message}`);
    console.log(`[PIXEL] Updated output with ${artifacts.length} new artifacts`);
  } else {
    const { error } = await supabase
      .from('build_agent_outputs')
      .insert({
        build_id: BUILD_ID,
        agent_id: 'pixel',
        status: 'completed',
        artifacts: artifacts,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Failed to create PIXEL output: ${error.message}`);
    console.log(`[PIXEL] Created output with ${artifacts.length} artifacts`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('RE-RUNNING PIXEL AGENT (BATCHED) FOR BUILD:', BUILD_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    console.log('[Step 1] Loading build context...');
    const context = await loadBuildContext();
    console.log('[Step 1] Context loaded\n');

    console.log('[Step 2] Generating components in batches...');
    const allArtifacts: any[] = [];

    for (let i = 0; i < COMPONENT_BATCHES.length; i++) {
      const batch = COMPONENT_BATCHES[i];
      console.log(`\n[Batch ${i + 1}/${COMPONENT_BATCHES.length}] ${batch.name}`);

      try {
        const artifacts = await generateBatch(batch, context);
        allArtifacts.push(...artifacts);

        for (const a of artifacts) {
          console.log(`    ✓ ${a.path} (${a.content?.length || 0} chars)`);
        }
      } catch (error) {
        console.error(`    ✗ Failed to generate ${batch.name}:`, error);
        // Continue with other batches
      }

      // Small delay between batches to avoid rate limiting
      if (i < COMPONENT_BATCHES.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log(`\n[Step 2] Generated ${allArtifacts.length} total files\n`);

    if (allArtifacts.length === 0) {
      throw new Error('No artifacts generated!');
    }

    console.log('[Step 3] Saving artifacts to database...');
    await saveArtifacts(allArtifacts);

    console.log('');
    console.log('='.repeat(60));
    console.log(`SUCCESS! Generated ${allArtifacts.length} components.`);
    console.log('');
    console.log('Generated files:');
    for (const a of allArtifacts) {
      console.log(`  - ${a.path}`);
    }
    console.log('');
    console.log('Next: Run extract-and-validate.ts to test the build');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();

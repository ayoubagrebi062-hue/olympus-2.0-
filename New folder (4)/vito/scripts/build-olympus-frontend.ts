/**
 * OLYMPUS FRONTEND BUILD - Lovable-Style Platform
 *
 * This is the AGENT PROMPT/SPECIFICATION.
 * If the output is wrong, FIX THIS FILE, not the generated code.
 *
 * Run: npx tsx scripts/build-olympus-frontend.ts
 */

// Load env FIRST before anything else
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });

import * as path from 'path';
import * as fs from 'fs';
import { BuildContextManager } from '../src/lib/agents/context';
import { BuildOrchestrator } from '../src/lib/agents/orchestrator';
import type { OrchestrationEvent } from '../src/lib/agents/orchestrator';

// ============================================================
// BUILD SPECIFICATION - THE SOURCE (Fix this if output is wrong)
// ============================================================

const BUILD_ID = `olympus-frontend-${Date.now()}`;
const OUTPUT_DIR = path.join(process.cwd(), 'output', BUILD_ID);

const FRONTEND_SPEC = `
# OLYMPUS 2.0 FRONTEND - Lovable-Style Platform

Build the OLYMPUS frontend following the Lovable.dev onboarding pattern.

## CORE PRINCIPLE: HOOK FIRST, SIGNUP LATER

Users can START BUILDING immediately without creating an account.
Show value BEFORE asking for signup. This is the Lovable strategy.

## FLOW

1. User lands on homepage → sees prompt window as MAIN FOCUS
2. User enters what they want to build → clicks "Start Building"
3. Redirected to /builder with 5 FREE TOKENS
4. AI builds their app in real-time → user watches progress
5. When tokens = 0 → prompt to sign up for 50 more tokens
6. Signup grants 50 tokens, saves their work

## PAGE 1: LANDING PAGE (/)

### Layout
- Dark theme (#0a0a0a background)
- Fixed header with navigation
- Hero section with prompt window as CENTRAL FOCUS
- Gradient background effects (purple/blue/violet blurs)

### Header (Fixed)
- LEFT: Logo (lightning bolt icon) + "OLYMPUS" text
- CENTER: Nav links (Features, Pricing, Docs)
- RIGHT: "Log in" (ghost button) + "Sign up" (primary button)
- **CRITICAL: Login/Signup on RIGHT side, not left**

### Hero Section
- Badge: "AI-Powered • No Code Required • Deploy Instantly"
- Headline: "Build anything. 50X faster." (gradient text on "50X faster")
- Subheadline: Platform description
- **THE PROMPT WINDOW** (main focus):
  - Glassmorphic card with border
  - Large textarea: "Describe what you want to build..."
  - Example prompt chips below (clickable to fill textarea)
  - "Start Building" button (large, primary, full width)
  - Text: "No signup required. Start now, save later."

### Example Prompts (clickable chips)
- "Build me a Notion clone with dark mode"
- "Create an e-commerce store for sneakers"
- "Make a portfolio site with animations"
- "Build a SaaS dashboard with analytics"

### Platform Capabilities (4 cards)
- App Builder (⚡ icon, violet gradient)
- Websites (🌐 icon, blue gradient)
- E-commerce (🛒 icon, green gradient)
- Mobile (📱 icon, orange gradient)

### Social Proof
- "10K+ apps built" | "50K+ users" | "99% uptime"

### Footer
- Logo + copyright

### Behavior
- On "Start Building" click:
  - Store prompt in localStorage: olympus_initial_prompt
  - Store tokens: olympus_tokens = "5"
  - Redirect to /builder

## PAGE 2: BUILDER (/builder)

### Layout
- Full screen, 3-column layout
- Header bar (fixed, 56px height)
- Main content fills remaining height

### Header Bar
- LEFT: Logo + "|" + project name
- CENTER: (empty or tabs later)
- RIGHT: Token counter + Share + Deploy + Login

### Token Counter (in header)
- Coin icon (yellow)
- Number of tokens remaining
- "tokens" label
- Background: white/5 with rounded-full

### 3-Column Layout

#### Left Sidebar (256px) - File Explorer
- Header: "Files" label
- Tree view of project files
- Folder icons (yellow)
- File icons (blue)
- Click file → shows in editor

#### Center - Editor + Preview (split 50/50)
- **Top Bar**: File path display
- **Editor Area**:
  - When building: Show progress bar + status text
  - When idle: Show file content (monospace)
- **Preview Panel**:
  - Top bar: "Preview" + refresh button
  - iframe with white background showing app preview

#### Right Sidebar (320px) - AI Chat
- Header: "AI Assistant"
- Messages list (scrollable)
- User messages: primary color, right-aligned
- AI messages: white/5 background, left-aligned
- Input: textarea + send button
- Disabled when tokens = 0

### Build Progress Display
- Progress bar (gradient: primary → violet)
- Status messages:
  - "Connecting to AI..."
  - "Analyzing requirements..."
  - "Generating project structure..."
  - "Writing components..."
  - "Build complete!"

### Token System
- Start with 5 tokens
- Each message costs 1 token
- When tokens hit 0:
  - Show signup prompt modal
  - Disable chat input
  - Prompt: "Out of tokens! Sign up to get 50 more."

## PAGE 3: LOGIN (/login)

### Layout
- Centered card (max-width: 400px)
- Dark background with gradient blurs

### Content
- Logo centered at top
- "Welcome back" heading
- "Log in to continue building" subheading
- Form:
  - Email input
  - Password input
  - "Remember me" checkbox + "Forgot password?" link
  - "Sign in" button (full width)
- "Don't have an account? Sign up free" link

## PAGE 4: SIGNUP (/signup)

### Layout
- Centered card (max-width: 400px)
- Dark background with gradient blurs

### Content
- Logo centered at top
- "Create your account" heading
- "Get 50 free tokens to build anything" subheading
- Form:
  - Name input
  - Email input
  - Password input (min 8 chars)
  - "Create account" button (full width)
  - Terms/Privacy links
- "Already have an account? Log in" link
- Benefits cards below: "50 free tokens" | "Save projects" | "Deploy apps"

### Behavior
- On signup success:
  - Set olympus_tokens = "50" in localStorage
  - Redirect to /builder

## SHARED COMPONENTS

### Button Component
- Variants: primary, secondary, ghost, outline
- Sizes: sm, md, lg
- Support href prop for Link rendering
- Focus ring with offset

### Input Component
- Dark background (white/5)
- Border (white/10)
- Focus: primary ring
- Placeholder: white/40

### Textarea Component
- Same styling as Input
- resize-none

## DESIGN TOKENS

### Colors
- Background: #0a0a0a
- Surface: #0d0d0d (sidebar, cards)
- Border: white/10
- Text: white (primary), white/60 (secondary), white/40 (muted)
- Primary: violet-600 (#7c3aed)
- Accent gradients: primary → violet → blue

### Spacing
- Header: h-14 (56px)
- Sidebar: w-64 (256px)
- Chat: w-80 (320px)
- Gap between elements: gap-2 to gap-4
- Padding: p-4 standard, p-6 for cards

### Typography
- Font: system-ui, sans-serif
- Headline: text-5xl to text-7xl, font-bold
- Body: text-base
- Small: text-sm
- Code: font-mono

## TECH REQUIREMENTS

- Next.js 14 App Router
- React 18
- TypeScript strict mode
- Tailwind CSS
- No external UI libraries (custom components)
- Client components where needed ('use client')
- localStorage for token/prompt storage

## API INTEGRATION

The builder should call:
- POST /api/guest/build - Start anonymous build
  - Body: { prompt, sessionId }
  - Returns: { buildId, sessionId, tokens, plan }

- GET /api/guest/build?sessionId=xxx - Check tokens
  - Returns: { sessionId, tokens }

## FILE STRUCTURE

\`\`\`
src/app/
├── page.tsx              # Landing page
├── builder/
│   └── page.tsx          # Builder IDE
├── login/
│   └── page.tsx          # Login form
├── signup/
│   └── page.tsx          # Signup form
└── api/
    └── guest/
        └── build/
            └── route.ts  # Guest build API

src/components/
└── ui/
    ├── index.ts          # Barrel export: export { Button } from './button'; export { Input } from './input'; export { Textarea } from './textarea';
    ├── button.tsx        # Button component with variants
    ├── input.tsx         # Input component
    └── textarea.tsx      # Textarea component
\`\`\`

## REQUIRED UI COMPONENTS (CRITICAL - Generate These First)

These components MUST be created at src/components/ui/ with these EXACT paths:

### 1. src/components/ui/button.tsx
\`\`\`tsx
'use client';
import Link from 'next/link';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', href, children, className = '', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50';

    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white',
      secondary: 'bg-white/10 hover:bg-white/20 text-white',
      ghost: 'hover:bg-white/5 text-white/60 hover:text-white',
      outline: 'border border-white/20 hover:bg-white/5 text-white',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const styles = \`\${baseStyles} \${variants[variant]} \${sizes[size]} \${className}\`;

    if (href) {
      return <Link href={href} className={styles}>{children}</Link>;
    }

    return <button ref={ref} className={styles} {...props}>{children}</button>;
  }
);
Button.displayName = 'Button';
\`\`\`

### 2. src/components/ui/input.tsx
\`\`\`tsx
'use client';
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={\`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all \${className}\`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
\`\`\`

### 3. src/components/ui/textarea.tsx
\`\`\`tsx
'use client';
import { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={\`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all resize-none \${className}\`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
\`\`\`

### 4. src/components/ui/index.ts
\`\`\`tsx
export { Button } from './button';
export { Input } from './input';
export { Textarea } from './textarea';
\`\`\`

## SUCCESS CRITERIA

1. Landing page loads with prompt window as main focus
2. Login/Signup buttons are on RIGHT side of header
3. "Start Building" stores prompt and redirects to /builder
4. Builder shows 5 tokens initially
5. Builder layout: file explorer | editor+preview | AI chat
6. Build progress shows in editor area
7. Messages use tokens (decrement counter)
8. Token = 0 triggers signup prompt
9. Login/Signup pages work with proper redirects
10. All links point to real routes that exist
`;

// ============================================================
// EXECUTION
// ============================================================

async function runBuild() {
  console.log('='.repeat(70));
  console.log('OLYMPUS FRONTEND BUILD - Lovable-Style Platform');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Build ID: ${BUILD_ID}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);
  console.log('');

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Initialize context
  console.log('[1/4] Initializing build context...');
  const context = new BuildContextManager({
    buildId: BUILD_ID,
    projectId: 'olympus-frontend',
    tenantId: 'olympus-internal',
    tier: 'professional',
    description: FRONTEND_SPEC,
    targetUsers: 'Developers and non-technical users who want to build apps with AI',
    techConstraints: 'Next.js 14, React 18, Tailwind CSS, TypeScript, No external UI libraries',
    businessRequirements: 'Lovable-style onboarding: build first, signup later. 5 free tokens, 50 on signup.',
    designPreferences: 'Dark theme, glassmorphic cards, gradient accents, Lovable.dev inspired',
  });

  // Create orchestrator
  console.log('[2/4] Creating orchestrator...');
  const orchestrator = new BuildOrchestrator(BUILD_ID, context, 'professional', {
    onProgress: (progress) => {
      const pct = Math.round(progress.progress);
      const phase = progress.currentPhase || 'initializing';
      const agents = progress.currentAgents?.join(', ') || 'none';
      console.log(`  [${pct}%] Phase: ${phase} | Agents: ${agents}`);
    },
    onPhaseComplete: (phase, status) => {
      console.log(`  ✓ Phase ${phase} completed (${status.status})`);
    },
    onAgentComplete: (agentId, output) => {
      const artifacts = output.artifacts?.length || 0;
      console.log(`    → Agent ${agentId}: ${output.status} (${artifacts} artifacts)`);
    },
    onError: (error) => {
      console.error(`  ✗ Error: ${error.message}`);
    },
  });

  // Subscribe to events for detailed logging
  const eventLog: OrchestrationEvent[] = [];
  orchestrator.subscribe((event) => {
    eventLog.push(event);
  });

  // Start build
  console.log('[3/4] Starting build...');
  console.log('');
  console.log('-'.repeat(70));

  const startTime = Date.now();
  const result = await orchestrator.start();
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('-'.repeat(70));
  console.log('');

  // Report results
  console.log('[4/4] Build completed');
  console.log('');
  console.log('='.repeat(70));
  console.log('BUILD RESULTS');
  console.log('='.repeat(70));
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Duration: ${duration} seconds`);

  if (!result.success && result.error) {
    console.log(`Error: ${result.error.code} - ${result.error.message}`);
  }

  // Get final progress
  const progress = orchestrator.getProgress();
  console.log(`Final Progress: ${progress.progress}%`);
  console.log(`Phases Completed: ${progress.completedPhases.join(', ') || 'none'}`);
  console.log(`Agents Completed: ${progress.completedAgents.length}`);
  console.log(`Tokens Used: ${progress.tokensUsed}`);

  // Save event log
  const eventLogPath = path.join(OUTPUT_DIR, 'event-log.json');
  fs.writeFileSync(eventLogPath, JSON.stringify(eventLog, null, 2));
  console.log(`\nEvent log saved to: ${eventLogPath}`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 50X FIX: WRITE ARTIFACTS TO FILESYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n[5/5] Writing artifacts to filesystem...');

  let filesWritten = 0;
  let filesSkipped = 0;

  for (const event of eventLog) {
    if (event.type === 'agent_completed' && event.output?.artifacts) {
      for (const artifact of event.output.artifacts) {
        // Only write code artifacts with actual content
        if (artifact.type === 'code' && artifact.content && artifact.path) {
          // Skip internal/metrics files
          if (artifact.path.startsWith('.') || artifact.metadata?.internal) {
            filesSkipped++;
            continue;
          }

          const filePath = path.join(process.cwd(), artifact.path);
          const dir = path.dirname(filePath);

          try {
            // Create directory if it doesn't exist
            fs.mkdirSync(dir, { recursive: true });

            // Check if file already exists
            if (fs.existsSync(filePath)) {
              console.log(`  ⊘ ${artifact.path} (exists, skipping)`);
              filesSkipped++;
              continue;
            }

            // Write the file
            fs.writeFileSync(filePath, artifact.content);
            console.log(`  ✓ ${artifact.path}`);
            filesWritten++;
          } catch (err) {
            console.error(`  ✗ Failed to write ${artifact.path}:`, err);
          }
        }
      }
    }
  }

  console.log(`\nFiles written: ${filesWritten} | Skipped: ${filesSkipped}`);

  // Save build summary
  const summary = {
    buildId: BUILD_ID,
    success: result.success,
    duration,
    progress: progress.progress,
    completedPhases: progress.completedPhases,
    completedAgents: progress.completedAgents,
    tokensUsed: progress.tokensUsed,
    error: result.error,
    timestamp: new Date().toISOString(),
  };
  const summaryPath = path.join(OUTPUT_DIR, 'build-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Build summary saved to: ${summaryPath}`);

  console.log('');
  console.log('='.repeat(70));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run
runBuild().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

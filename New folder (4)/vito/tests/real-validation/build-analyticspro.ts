/**
 * BOTROSS FULL PIPELINE: AnalyticsPro SaaS Dashboard
 * Runs all 6 agents to generate complete application
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OUTPUT_DIR = path.join(__dirname, 'analyticspro');

interface AgentResult {
  agent: string;
  duration: number;
  output: any;
  files: Array<{ path: string; content: string }>;
}

const AGENTS = [
  {
    id: 'oracle',
    name: 'ORACLE',
    prompt: `You are ORACLE, market intelligence agent. Analyze the SaaS analytics dashboard market.
Output JSON:
{
  "market_analysis": {
    "market_size": "...",
    "growth_rate": "...",
    "target_users": ["..."]
  },
  "competitors": [
    {"name": "...", "strengths": "...", "weaknesses": "..."}
  ],
  "opportunities": ["..."],
  "recommended_features": ["..."]
}`
  },
  {
    id: 'strategos',
    name: 'STRATEGOS',
    prompt: `You are STRATEGOS, product strategist. Define MVP for AnalyticsPro - a SaaS analytics dashboard.
Output JSON:
{
  "product_name": "AnalyticsPro",
  "tagline": "...",
  "mvp_features": [
    {"name": "...", "description": "...", "priority": 1}
  ],
  "pricing_tiers": [
    {"name": "Starter", "price": 0, "features": ["..."]},
    {"name": "Pro", "price": 29, "features": ["..."]},
    {"name": "Enterprise", "price": 99, "features": ["..."]}
  ],
  "tech_stack": {
    "frontend": "Next.js 14, TypeScript, Tailwind CSS",
    "backend": "Next.js API Routes",
    "database": "Supabase (PostgreSQL)",
    "auth": "Supabase Auth",
    "charts": "Recharts"
  }
}`
  },
  {
    id: 'datum',
    name: 'DATUM',
    prompt: `You are DATUM, database architect. Design Supabase/PostgreSQL schema for AnalyticsPro.

Output JSON with "files" array containing SQL and TypeScript files:
{
  "files": [
    {
      "path": "supabase/schema.sql",
      "content": "-- SQL schema with tables: users, analytics_events, products, revenue_data, subscriptions. Include proper relations, indexes, RLS policies."
    },
    {
      "path": "src/lib/types/database.ts",
      "content": "// TypeScript types matching the database schema"
    }
  ]
}`
  }
];

const PIXEL_COMPONENTS = [
  { file: 'src/components/ui/Button.tsx', desc: 'Button with variants: primary (blue), secondary (gray), danger (red), ghost (transparent). Props: variant, size (sm/md/lg), loading, disabled, onClick, children. Tailwind CSS with hover/focus states.' },
  { file: 'src/components/ui/Input.tsx', desc: 'Input with label, placeholder, value, onChange, error message, disabled state. Tailwind with focus ring.' },
  { file: 'src/components/ui/Card.tsx', desc: 'Card container with optional title, description, children. Shadow, rounded corners, dark mode support.' },
  { file: 'src/components/ui/Badge.tsx', desc: 'Badge/tag component. Variants: success (green), warning (yellow), error (red), info (blue). Size sm/md.' },
  { file: 'src/components/ui/Avatar.tsx', desc: 'Avatar with image src, fallback initials, size (sm/md/lg). Rounded full.' },
  { file: 'src/components/ui/Modal.tsx', desc: 'Modal dialog with isOpen, onClose, title, children. Backdrop blur, centered, close button.' },
  { file: 'src/components/ui/Table.tsx', desc: 'Table component with headers, rows, pagination. Sortable columns, hover states, responsive.' },
  { file: 'src/components/ui/Dropdown.tsx', desc: 'Dropdown menu with trigger button and menu items. Click outside to close.' },
  { file: 'src/components/landing/Hero.tsx', desc: 'Hero section: Large headline "Analytics That Drive Growth", subheadline about real-time insights, two CTAs (Get Started Free - primary, See Demo - secondary), gradient background, floating dashboard preview image.' },
  { file: 'src/components/landing/Features.tsx', desc: 'Features grid with 6 feature cards: Real-time Analytics, Custom Dashboards, Team Collaboration, API Access, Data Export, AI Insights. Each has icon (use emoji), title, description. 3 columns on desktop, 1 on mobile.' },
  { file: 'src/components/landing/Pricing.tsx', desc: 'Pricing section with 3 tiers: Starter ($0/mo - 1 user, 1K events, basic charts), Pro ($29/mo - 5 users, 100K events, all charts, API), Enterprise ($99/mo - unlimited users, events, priority support, custom integrations). Highlight Pro as popular.' },
  { file: 'src/components/landing/Testimonials.tsx', desc: '3 testimonial cards with avatar, name, role, company, quote. Grid layout. Example quotes about how AnalyticsPro helped their business.' },
  { file: 'src/components/landing/Footer.tsx', desc: 'Footer with 4 columns: Product (Features, Pricing, Docs), Company (About, Blog, Careers), Legal (Privacy, Terms), Social (Twitter, GitHub, Discord). Copyright at bottom.' },
  { file: 'src/components/landing/Navbar.tsx', desc: 'Navbar with logo "AnalyticsPro", nav links (Features, Pricing, Docs), and auth buttons (Login, Get Started). Sticky, blur backdrop on scroll. Mobile hamburger menu.' },
  { file: 'src/components/dashboard/Sidebar.tsx', desc: 'Dashboard sidebar: Logo at top, nav items with icons (Dashboard, Analytics, Products, Revenue, Settings), user profile at bottom with logout. Collapsible on mobile. Dark mode support.' },
  { file: 'src/components/dashboard/Header.tsx', desc: 'Dashboard header: Page title on left, search bar in center, notifications bell with badge, user avatar dropdown (Profile, Settings, Logout), dark mode toggle button.' },
  { file: 'src/components/dashboard/StatCard.tsx', desc: 'Stat card: Icon, title (e.g. Total Revenue), value (e.g. $45,231), change percentage with up/down arrow and color (green up, red down). Optional sparkline.' },
  { file: 'src/components/dashboard/LineChart.tsx', desc: 'Line chart using Recharts. Props: data array with {date, value}. Responsive, gradient fill, tooltip, grid lines. Title prop. For revenue over time.' },
  { file: 'src/components/dashboard/BarChart.tsx', desc: 'Bar chart using Recharts. Props: data array with {name, value}. Horizontal bars, colored by value, tooltip. Title prop. For top products.' },
  { file: 'src/components/dashboard/DataTable.tsx', desc: 'Data table with: columns config, data rows, pagination (10 per page), sort by column, search filter, add/edit/delete actions. Modal for add/edit form.' },
  { file: 'src/components/auth/LoginForm.tsx', desc: 'Login form: Email input, password input, "Remember me" checkbox, "Forgot password" link, Login button, "Sign up" link. Form validation, loading state, error messages.' },
  { file: 'src/components/auth/SignupForm.tsx', desc: 'Signup form: Name, email, password, confirm password inputs. Terms checkbox. Sign Up button. "Already have account" link. Validation, loading state.' },
  { file: 'src/components/providers/ThemeProvider.tsx', desc: 'Theme provider with dark mode context. useTheme hook returns {theme, toggleTheme}. Persists to localStorage. Applies dark class to html.' }
];

const PAGES = [
  { file: 'src/app/page.tsx', desc: 'Landing page: Import and compose Navbar, Hero, Features, Pricing, Testimonials, Footer. Server component.' },
  { file: 'src/app/login/page.tsx', desc: 'Login page with "use client". Centered LoginForm component. Link to signup. Redirect to /dashboard on success.' },
  { file: 'src/app/signup/page.tsx', desc: 'Signup page with "use client". Centered SignupForm component. Link to login. Redirect to /login on success.' },
  { file: 'src/app/dashboard/page.tsx', desc: 'Dashboard main page with "use client". Layout: Sidebar, Header, main content with 4 StatCards in grid, LineChart for revenue, BarChart for products, DataTable for recent data.' },
  { file: 'src/app/dashboard/analytics/page.tsx', desc: 'Analytics page: More detailed charts, date range picker, export button.' },
  { file: 'src/app/dashboard/products/page.tsx', desc: 'Products page: DataTable with product list (name, price, sales, status), CRUD operations.' },
  { file: 'src/app/dashboard/settings/page.tsx', desc: 'Settings page: Profile section, notification preferences, dark mode toggle, account deletion.' },
  { file: 'src/app/layout.tsx', desc: 'Root layout: Import globals.css, Inter font, ThemeProvider wrapper, metadata for SEO.' },
  { file: 'src/app/dashboard/layout.tsx', desc: 'Dashboard layout: Check auth (redirect if not logged in), wrap children with Sidebar and Header.' }
];

const ENGINE_FILES = [
  { file: 'src/lib/supabase/client.ts', desc: 'Supabase client singleton. Import createClient from @supabase/supabase-js. Use env vars NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
  { file: 'src/lib/supabase/server.ts', desc: 'Server-side Supabase client for API routes. Uses service role key for admin operations.' },
  { file: 'src/lib/services/auth.ts', desc: 'Auth service: signUp(email, password, name), signIn(email, password), signOut(), getUser(), onAuthStateChange(callback). All using Supabase Auth.' },
  { file: 'src/lib/services/analytics.ts', desc: 'Analytics service: getStats() returns {totalRevenue, totalUsers, totalEvents, growthRate}. getRevenueData(days) returns array for chart. getTopProducts(limit) returns array for bar chart.' },
  { file: 'src/lib/services/products.ts', desc: 'Products CRUD: getProducts(), getProduct(id), createProduct(data), updateProduct(id, data), deleteProduct(id). All with Supabase queries.' },
  { file: 'src/app/api/analytics/route.ts', desc: 'API route GET /api/analytics. Returns dashboard stats from analytics service. Protected - check auth.' },
  { file: 'src/app/api/products/route.ts', desc: 'API routes for products: GET (list), POST (create). Protected routes.' },
  { file: 'src/app/api/products/[id]/route.ts', desc: 'API routes: GET (single), PUT (update), DELETE. Dynamic route with params.id.' },
  { file: 'src/lib/hooks/useAuth.ts', desc: 'useAuth hook: returns {user, loading, signIn, signUp, signOut}. Subscribes to auth state changes.' },
  { file: 'src/lib/hooks/useAnalytics.ts', desc: 'useAnalytics hook: fetches and caches dashboard data. Returns {stats, revenueData, topProducts, loading, error, refetch}.' }
];

const CONFIG_FILES = [
  { file: 'package.json', content: `{
  "name": "analyticspro",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0"
  }
}` },
  { file: 'tailwind.config.ts', content: `import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' }
      }
    }
  },
  plugins: []
}
export default config` },
  { file: 'tsconfig.json', content: `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}` },
  { file: 'postcss.config.js', content: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }` },
  { file: 'next.config.js', content: `/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true }` },
  { file: '.env.local.example', content: `NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key` },
  { file: 'src/app/globals.css', content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --background: #ffffff; --foreground: #171717; }
.dark { --background: #0a0a0a; --foreground: #ededed; }
body { background: var(--background); color: var(--foreground); }` }
];

async function generateFile(filepath: string, description: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4000,
    messages: [
      { role: 'system', content: 'You are an expert React/Next.js developer. Generate ONLY the code for the requested file. No explanations, no markdown code blocks, just pure TypeScript/TSX code. Use modern React patterns, TypeScript, and Tailwind CSS.' },
      { role: 'user', content: `Generate complete code for: ${filepath}\n\nRequirements: ${description}\n\nOutput ONLY the code.` }
    ]
  });

  let content = response.choices[0]?.message?.content || '';
  content = content.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
  return content;
}

async function runAgent(agent: typeof AGENTS[0]): Promise<AgentResult> {
  const start = Date.now();

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 3000,
    messages: [
      { role: 'system', content: agent.prompt },
      { role: 'user', content: 'Build AnalyticsPro - a SaaS analytics dashboard with landing page, auth, and full dashboard. Return ONLY valid JSON.' }
    ]
  });

  const content = response.choices[0]?.message?.content || '{}';
  let parsed: any = {};
  let files: Array<{ path: string; content: string }> = [];

  try {
    let jsonText = content;
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) jsonText = objMatch[0];
    parsed = JSON.parse(jsonText);
    if (parsed.files) files = parsed.files;
  } catch {
    parsed = { raw: content.slice(0, 500) };
  }

  return {
    agent: agent.name,
    duration: Date.now() - start,
    output: parsed,
    files
  };
}

async function main() {
  console.log('═'.repeat(70));
  console.log('BOTROSS FULL PIPELINE: AnalyticsPro SaaS Dashboard');
  console.log('═'.repeat(70));
  console.log('');

  // Clean and create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results: AgentResult[] = [];
  const allFiles: Array<{ path: string; content: string; agent: string }> = [];
  let totalTime = 0;

  // PHASE 1: Run strategic agents
  console.log('PHASE 1: STRATEGIC AGENTS');
  console.log('─'.repeat(70));

  for (const agent of AGENTS) {
    process.stdout.write(`[${agent.name}] Running... `);
    const result = await runAgent(agent);
    results.push(result);
    totalTime += result.duration;
    console.log(`✓ (${result.duration}ms)`);

    // Save any files from agent
    for (const file of result.files) {
      allFiles.push({ ...file, agent: agent.name });
    }
  }

  // PHASE 2: Generate UI components (PIXEL agent work)
  console.log('');
  console.log('PHASE 2: PIXEL AGENT - UI Components');
  console.log('─'.repeat(70));

  for (const comp of PIXEL_COMPONENTS) {
    process.stdout.write(`[PIXEL] ${comp.file}... `);
    const start = Date.now();
    const content = await generateFile(comp.file, comp.desc);
    const duration = Date.now() - start;
    totalTime += duration;

    allFiles.push({ path: comp.file, content, agent: 'PIXEL' });
    console.log(`✓ (${duration}ms, ${content.length} chars)`);
  }

  // PHASE 3: Generate pages (WIRE agent work)
  console.log('');
  console.log('PHASE 3: WIRE AGENT - Pages & Routing');
  console.log('─'.repeat(70));

  for (const page of PAGES) {
    process.stdout.write(`[WIRE] ${page.file}... `);
    const start = Date.now();
    const content = await generateFile(page.file, page.desc);
    const duration = Date.now() - start;
    totalTime += duration;

    allFiles.push({ path: page.file, content, agent: 'WIRE' });
    console.log(`✓ (${duration}ms, ${content.length} chars)`);
  }

  // PHASE 4: Generate services and API (ENGINE agent work)
  console.log('');
  console.log('PHASE 4: ENGINE AGENT - Services & API');
  console.log('─'.repeat(70));

  for (const svc of ENGINE_FILES) {
    process.stdout.write(`[ENGINE] ${svc.file}... `);
    const start = Date.now();
    const content = await generateFile(svc.file, svc.desc);
    const duration = Date.now() - start;
    totalTime += duration;

    allFiles.push({ path: svc.file, content, agent: 'ENGINE' });
    console.log(`✓ (${duration}ms, ${content.length} chars)`);
  }

  // PHASE 5: Write config files
  console.log('');
  console.log('PHASE 5: CONFIG FILES');
  console.log('─'.repeat(70));

  for (const cfg of CONFIG_FILES) {
    allFiles.push({ path: cfg.file, content: cfg.content, agent: 'CONFIG' });
    console.log(`[CONFIG] ${cfg.file} ✓`);
  }

  // Save all files
  console.log('');
  console.log('PHASE 6: SAVING FILES');
  console.log('─'.repeat(70));

  for (const file of allFiles) {
    const filePath = path.join(OUTPUT_DIR, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }
  console.log(`Saved ${allFiles.length} files to ${OUTPUT_DIR}`);

  // Summary
  console.log('');
  console.log('═'.repeat(70));
  console.log('BUILD COMPLETE');
  console.log('═'.repeat(70));
  console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Total Files: ${allFiles.length}`);
  console.log('');

  // Agent contribution breakdown
  console.log('AGENT CONTRIBUTIONS:');
  console.log('─'.repeat(70));
  const agentCounts: Record<string, number> = {};
  for (const f of allFiles) {
    agentCounts[f.agent] = (agentCounts[f.agent] || 0) + 1;
  }
  for (const [agent, count] of Object.entries(agentCounts)) {
    console.log(`  ${agent}: ${count} files`);
  }

  // File list with line counts
  console.log('');
  console.log('FILE LIST:');
  console.log('─'.repeat(70));
  for (const f of allFiles) {
    const lines = f.content.split('\n').length;
    console.log(`  ${f.path} (${lines} lines) [${f.agent}]`);
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('Next: cd analyticspro && npm install && npm run dev');
  console.log('═'.repeat(70));
}

main().catch(console.error);

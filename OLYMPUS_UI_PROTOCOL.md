# OLYMPUS UI IMPLEMENTATION PROTOCOL

> **MANDATORY: Read this file at the start of EVERY session working on OLYMPUS UI**

---

## PROTOCOL PURPOSE

This protocol ensures consistent, world-class UI implementation by referencing the master plan on every step.

---

## MASTER PLAN LOCATION

```
PRIMARY:    C:\Users\SBS\Desktop\ui plan\OLYMPUS_2.0_UI_MASTERPLAN.md
SECTIONS:   C:\Users\SBS\Desktop\ui plan\New folder (6)\SECTION_*.md
```

### Quick Reference Files

| Section           | File                                        | Purpose                     |
| ----------------- | ------------------------------------------- | --------------------------- |
| Tech Stack        | SECTION_01_TECH_STACK_50X.md                | Framework choices           |
| Prompting         | SECTION_02_PROMPTING_BIBLE_50X.md           | AI prompting best practices |
| Workflow          | SECTION_03_WORKFLOW_50X.md                  | Development workflow        |
| Backend           | SECTION_04_BACKEND_SYSTEM_50X.md            | Backend architecture        |
| Auth              | SECTION_05_AUTHENTICATION_FORTRESS_50X.md   | Auth implementation         |
| Database          | SECTION_06_DATABASE_ARCHITECTURE_50X.md     | DB design                   |
| API               | SECTION_07_API_MASTERY_50X.md               | API patterns                |
| Payments          | SECTION_08_PAYMENT_INTEGRATION_50X.md       | Stripe/payments             |
| Testing           | SECTION_09_TESTING_QA_50X.md                | Testing approach            |
| **UI Components** | **SECTION_10_UI_COMPONENT_SYSTEM_50X.md**   | **Component library**       |
| Mobile            | SECTION_11_MOBILE_DEVELOPMENT_50X.md        | Mobile patterns             |
| Deployment        | SECTION_12_DEPLOYMENT_COMMAND_CENTER_50X.md | Deploy flow                 |

---

## EXECUTION PHASES (FROM MASTERPLAN)

### Current Status Tracker

```
=== RESET: SELF-BUILD APPROACH (Jan 26, 2026) ===
Previous work deleted - OLYMPUS now builds its own UI

[x] PHASE 0: CLEANUP & RESET      - COMPLETED (Jan 26, 2026)
    - Deleted all old UI files (wrong approach: developer mindset)
    - Created OLYMPUS_BUILD_PROMPT.md (merged 22 sections + design spec)
    - Set up bootstrap infrastructure

[x] PHASE 1: SELF-BUILD FOUNDATION - IN PROGRESS
    - Created globals.css with premium design system
    - Created layout.tsx with dark theme + fonts
    - Created bootstrap page.tsx with monitoring UI
    - Created bootstrap API routes:
      - /api/bootstrap/check-supabase
      - /api/bootstrap/check-schema
      - /api/bootstrap/auth
      - /api/bootstrap/load-prompt
      - /api/bootstrap/analyze
      - /api/bootstrap/start-build

[ ] PHASE 2: SUPABASE SETUP       - PENDING
    - Database schema needs verification
    - Tables: profiles, teams, team_members, builds, projects

[ ] PHASE 3: SELF-BUILD EXECUTION - PENDING
    - OLYMPUS builds its own UI via buildService

[ ] PHASE 4: QUALITY VALIDATION   - PENDING
    - Verify premium design requirements met
```

---

## BEFORE STARTING ANY UI WORK

### Step 1: Check Current Phase

```bash
# Check what phase we're on
grep -A 5 "Current Status Tracker" OLYMPUS_UI_PROTOCOL.md
```

### Step 2: Read Relevant Masterplan Section

Before implementing ANY component:

1. Open `OLYMPUS_2.0_UI_MASTERPLAN.md`
2. Find the section for what you're building
3. Follow the specifications EXACTLY
4. Use the provided code patterns

### Step 3: Follow Component Patterns

From the masterplan, every component must have:

- Dark theme (bg-[#0A0A0F] base)
- Framer Motion animations
- Loading states with skeletons
- Error states with recovery
- Keyboard accessibility
- Mobile responsiveness

---

## DESIGN SYSTEM (MEMORIZE THIS)

### Colors (from Masterplan)

```typescript
// Primary
primary: '#3B82F6'  // Blue

// Backgrounds
background: '#0A0A0F'      // Base dark
secondary: '#1A1A2E'       // Cards
tertiary: '#252536'        // Elevated

// Borders
border: '#2D2D3D'

// Text
text: {
  primary: '#F8FAFC',
  secondary: '#94A3B8',
  muted: '#64748B',
}
```

### Typography

```typescript
// Fonts
sans: ['Inter', 'system-ui'];
mono: ['JetBrains Mono', 'Fira Code'];
```

### Animations

```typescript
// Standard Framer Motion variants
fadeIn: { opacity: 0 } → { opacity: 1 }
slideUp: { opacity: 0, y: 20 } → { opacity: 1, y: 0 }
scaleIn: { opacity: 0, scale: 0.95 } → { opacity: 1, scale: 1 }
```

---

## COMPONENT PRIORITY (P0 = CRITICAL)

| Priority | Component                | Status   |
| -------- | ------------------------ | -------- |
| P0       | AgentCard                | [x] Done |
| P0       | AgentGrid (40 agents)    | [x] Done |
| P0       | PhaseProgress (9 phases) | [x] Done |
| P0       | LiveCodeStream           | [ ]      |
| P0       | BuildProgress            | [ ]      |
| P0       | StatCard                 | [x] Done |
| P0       | QuickBuilder             | [x] Done |
| P1       | PricingCard              | [x] Done |
| P1       | PricingCalculator        | [x] Done |
| P1       | FileTree                 | [ ]      |
| P1       | CodeViewer               | [ ]      |
| P1       | QualityGauge             | [ ]      |
| P2       | ActivityChart            | [x] Done |
| P2       | TeamTable                | [x] Done |
| P2       | TemplateCard             | [x] Done |
| P2       | CostBreakdown            | [x] Done |
| P2       | QualityTrends            | [x] Done |
| P2       | AgentPerformance         | [x] Done |

---

## SITEMAP (FROM MASTERPLAN)

```
PUBLIC PAGES
├── /                    Landing page (Hero, Agents, Pricing)
├── /features            Features deep dive
├── /pricing             Pricing page
├── /demo                Interactive demo
└── /docs                Documentation

AUTH PAGES
├── /login               Email + OAuth
├── /signup              Registration + onboarding
├── /forgot-password     Password reset request
└── /reset-password      Password reset form

DASHBOARD (Protected)
├── /dashboard           Command center
├── /builds              Build management
│   ├── /builds/new      New build wizard
│   └── /builds/[id]     Build experience (7 tabs)
├── /templates           Template marketplace
├── /team                Team management
├── /analytics           Analytics dashboard
└── /settings            Settings pages
```

---

## QUALITY CHECKLIST (EVERY PAGE)

Before marking any page complete:

- [ ] Responsive (320px - 1920px)
- [ ] Dark theme consistent
- [ ] Framer Motion animations
- [ ] Loading skeletons
- [ ] Error states
- [ ] Empty states
- [ ] Keyboard accessible
- [ ] Lighthouse 90+

---

## DO NOT (FROM MASTERPLAN)

❌ Use light theme (dark is the brand)
❌ Skip animations
❌ Forget mobile
❌ Use generic UI
❌ Leave loading states unhandled
❌ Forget error states
❌ Use placeholder content
❌ Ship without device testing

---

## WHEN SESSION ENDS / COMPACTS

Before ending or when context compacts:

1. Update the status tracker in this file
2. Note what was completed
3. Note what's next
4. Save current phase state

### Session Log

```
=== SESSION LOG ===

[2026-01-26] RESET - Self-Build Approach Started
REASON: Previous UI was built with wrong mindset (developer, not marketing)
ERRORS FROM PREVIOUS APPROACH:
  - ❌ Agent grid on landing page (belongs in features)
  - ❌ Small typography (needs 48-120px headlines)
  - ❌ No glassmorphism (just dark cards)
  - ❌ No 3D elements
  - ❌ Broken footer links

ACTIONS TAKEN:
1. Deleted all old UI files (src/app/* and src/components/*)
2. Created OLYMPUS_BUILD_PROMPT.md:
   - Merged 22 sections from Ultimate Developer Guide
   - Added premium design requirements from corrected masterplan
   - 796 lines, all specifications in one place

3. Created Self-Build Infrastructure:
   - src/app/globals.css: Premium design system
     - Glassmorphism classes (.glass-card, .glass-button)
     - Typography classes (.hero-headline 48-120px, .section-headline)
     - Purple/pink gradients
     - 3D visual elements (.floating-sphere, .abstract-blob)
     - Premium animations (fadeInUp, float, glowPulse, morphBlob)

   - src/app/layout.tsx: Root layout
     - Inter + JetBrains Mono fonts
     - Dark theme
     - Sonner toast provider
     - Skip link for accessibility

   - src/app/page.tsx: Bootstrap/Monitoring UI
     - 10-step build process visualization
     - Real-time logs panel
     - Progress tracking
     - Error/failure marking
     - Toast notifications for all events

4. Created Bootstrap API Routes:
   - /api/bootstrap/check-supabase: Verify Supabase connection
   - /api/bootstrap/check-schema: Validate database tables
   - /api/bootstrap/auth: Create/authenticate system user
   - /api/bootstrap/load-prompt: Load OLYMPUS_BUILD_PROMPT.md
   - /api/bootstrap/analyze: Analyze project complexity
   - /api/bootstrap/start-build: Trigger self-build via buildService

ERRORS TO ADDRESS:
  - Database migrations need to be applied to Supabase
  - Tables required: profiles, teams, team_members, builds, projects

NEXT STEPS:
1. Run migrations in Supabase SQL Editor
2. Visit http://localhost:3001 to start self-build
3. Monitor build process for errors
4. Validate generated UI meets premium requirements

--- PREVIOUS UI DELETED BELOW THIS LINE ---

[2026-01-26] Phase 6 Complete - POLISH (DELETED)
- Created polish components directory: src/components/polish/
- Built accessibility and animation components:
  - PageTransition.tsx (page-level animation wrapper with Framer Motion)
  - SkipLink.tsx (accessibility skip to main content link)
  - FocusTrap.tsx (modal focus trapping with Tab cycling + Escape handling)
  - VisuallyHidden.tsx (screen reader only content wrapper)
  - AnimatedCounter.tsx (animated number display using useSpring)
  - ScrollProgress.tsx (scroll progress indicator bar)
  - Shimmer.tsx (loading skeleton base + PageSkeleton + CardSkeleton variants)
  - Reveal.tsx (scroll reveal animation + StaggerReveal for lists)
  - Tooltip.tsx (accessible tooltip with 4 positions: top/bottom/left/right)
- Updated root layout.tsx:
  - Added SkipLink for accessibility
  - Wrapped children in <main id="main-content"> for skip link target
- Updated globals.css:
  - Added shimmer keyframe animation
  - Added fadeIn, slideUp, slideDown keyframe animations
  - Added animation utility classes (.animate-shimmer, .animate-fade-in, etc.)
  - Added .focus-ring utility class
  - Added @media (prefers-reduced-motion: reduce) for accessibility
- All code quality checks passed
- Build successful, 21 pages generated
- ALL PHASES COMPLETE! UI implementation finished.

[2026-01-26] Phase 5 Complete - FEATURES
- Created templates components: src/components/templates/
  - TemplateCard.tsx (thumbnail, tags, stats, preview/use actions)
  - TemplateFilters.tsx (search, category buttons, premium toggle)
- Created analytics components: src/components/analytics/
  - UsageChart.tsx (12-month bar chart with tooltips)
  - CostBreakdown.tsx (stacked bar with legend)
  - QualityTrends.tsx (5 metrics with progress bars)
  - AgentPerformance.tsx (agent table with status)
- Created team components: src/components/team/
  - TeamMemberCard.tsx (avatar, role badge, status, actions menu)
  - InviteModal.tsx (email form + copy link, Escape/outside click close)
- Created settings components: src/components/settings/
  - SettingsNav.tsx (sidebar navigation with active states)
- Created feature pages:
  - /templates - Template marketplace with grid/list view, search, filters
  - /analytics - Analytics dashboard with 4 stat cards, charts, agent table
  - /team - Team management with member cards, invite modal, role filters
  - /settings - Layout with sidebar navigation + 5 sub-pages:
    - /settings/profile - Avatar, name, email, company, bio
    - /settings/billing - Current plan, plan comparison, invoices
    - /settings/api-keys - Create, view, copy, regenerate, delete keys
    - /settings/integrations - 8 integrations across 5 categories
    - /settings/preferences - Theme, language, timezone, notifications
- Features implemented:
  - All modals close on Escape and outside click
  - All inputs are controlled with value + onChange
  - All async operations have loading states
  - All buttons have onClick handlers with toast feedback
  - Proper dropdown menus with outside click handling
- All code quality checks passed
- Build successful, 21 pages generated
- Next: Phase 6 - POLISH (Animations + Accessibility)

[2026-01-26] Phase 4 Complete - DASHBOARD
- Created dashboard components directory: src/components/dashboard/
- Built dashboard components:
  - DashboardLayout.tsx (collapsible sidebar, top bar, user menu, navigation)
  - DashboardStats.tsx (4 stat cards: Total Builds, This Month, Credits, Success Rate)
  - DashboardQuickBuilder.tsx (prompt input, voice button, quick start options)
  - ActiveBuilds.tsx (running builds with progress bars)
  - RecentBuilds.tsx (completed builds with View/Clone/Deploy actions)
  - ActivityChart.tsx (30-day bar chart with tooltips and summary)
  - WelcomeHeader.tsx (time-based greeting with formatted date)
- Created dashboard pages with route group (dashboard):
  - /dashboard - Main command center assembling all components
  - /builds - Build list with search, filter pills, status badges
  - /builds/new - 4-step wizard (Type, Style, Features, Review)
  - /builds/[buildId] - Build detail with phases, tabs (Overview, Code, Files, Terminal, Chat, Settings)
- Features implemented:
  - Collapsible sidebar with navigation icons
  - User menu dropdown with profile/settings/logout
  - Search and filter functionality on builds list
  - Multi-step form wizard with progress indicators
  - Build phase progress with live simulation
  - 6 tabs in build detail (Overview, Code, Files, Terminal, Chat, Settings)
  - Controlled inputs, loading states, toast notifications
- Fixed Rule 8 violation (split async page + client component pattern)
- All code quality checks passed
- Build successful, 12 pages generated
- Next: Phase 5 - FEATURES (Templates + Analytics)

[2026-01-26] Phase 3 Complete - AUTH
- Created auth components directory: src/components/auth/
- Built shared auth components:
  - AuthLayout.tsx (split screen with branding panel + form panel)
  - SocialAuthButtons.tsx (Google + GitHub OAuth, AuthDivider)
  - LoginForm.tsx (email/password, remember me, magic link option)
  - SignupForm.tsx (name/email/password, password strength indicator, terms)
  - ForgotPasswordForm.tsx (email input, success state)
  - ResetPasswordForm.tsx (new password + confirm, strength indicator)
- Created auth pages with route group (auth):
  - /login - Social + email login with magic link option
  - /signup - Social + email signup with password requirements
  - /forgot-password - Password reset request flow
  - /reset-password - New password form with token support
- Features implemented:
  - Password strength indicator (8+ chars, uppercase, lowercase, number)
  - Show/hide password toggles
  - Loading states on all buttons
  - Toast notifications for all actions
  - Success states with redirects
  - Animated form fields with Framer Motion
- All code quality checks passed
- Build successful, 9 static pages generated
- Next: Phase 4 - DASHBOARD (command center)

[2026-01-26] Phase 2 Complete - LANDING PAGE
- Created data layer: src/data/agents.ts with all 40 agents across 9 phases
- Created P0 components:
  - AgentCard.tsx (with AgentPill variant)
  - AgentGrid.tsx (with AgentGridCompact variant)
  - PhaseProgress.tsx (horizontal, vertical, compact variants + PhaseIndicator)
  - StatCard.tsx (AnimatedStat, LiveCountStat, StatsGrid)
  - QuickBuilder.tsx (with QuickBuilderDemo auto-typing)
- Created landing page sections:
  - Hero.tsx (animated backgrounds, glow orbs, trust logos, scroll indicator)
  - AgentShowcase.tsx (full 40-agent grid + highlights + comparison)
  - HowItWorks.tsx (interactive 9-phase explorer with code previews)
  - Pricing.tsx (3 tiers: Free/Pro/Enterprise with yearly toggle)
  - Footer.tsx (links, newsletter, social icons, status)
- Created src/components/landing/index.ts for clean exports
- Updated page.tsx to assemble all landing page sections
- Fixed code quality violations (onClick handlers, toast notifications)
- Build passing, all code quality checks passed
- Next: Phase 3 - AUTH (login/signup flows)

[2026-01-26] Phase 1 Complete - FOUNDATION
- Created components.json for shadcn/ui configuration
- Updated globals.css with OLYMPUS dark theme CSS variables
- Updated tailwind.config.ts with shadcn color tokens
- Updated layout.tsx with Inter + JetBrains Mono fonts, dark mode, Toaster
- Installed 18 shadcn/ui components:
  - button, card, input, dialog, toast, tabs, avatar, badge, skeleton
  - table, form, select, navigation-menu, command, sheet, progress
  - tooltip, dropdown-menu, label
- Created custom utility components:
  - LoadingSkeleton (card, list, text, avatar, stat, code variants)
  - ErrorState (page, card, inline variants with retry/back actions)
  - EmptyState (page, card, inline variants with presets)
  - PageLoading, Spinner helpers
- Created src/components/ui/index.ts for clean exports
- Updated page.tsx with Framer Motion animations and dark theme
- Build passing, 1,737 tests passing
- Next: Phase 2 - Landing Page (Hero + 40-agent grid + pricing)

[2026-01-26] Phase 0 Complete
- Backed up old UI to backup_old_ui_20260126/
- Deleted auth pages, marketing, examples
- Created minimal page.tsx
- Build passing, tests passing
- Next: Phase 1 - Foundation (shadcn/ui setup)

```

---

## HOW TO USE THIS PROTOCOL

### On Session Start

```
1. Read this file (OLYMPUS_UI_PROTOCOL.md)
2. Check "Current Status Tracker" for current phase
3. Read session log for context
4. Open OLYMPUS_2.0_UI_MASTERPLAN.md for the current phase
5. Continue from where we left off
```

### During Work

```
1. Before building ANY component, find it in the masterplan
2. Follow specifications exactly
3. Use the design system tokens
4. Apply animations from the presets
5. Test responsive + a11y
```

### On Session End

```
1. Update status tracker checkboxes
2. Add entry to session log
3. Note next steps
```

---

## MASTERPLAN QUICK ACCESS

To read the full masterplan:

```bash
# Full masterplan
cat "C:\Users\SBS\Desktop\ui plan\OLYMPUS_2.0_UI_MASTERPLAN.md"

# Specific section (UI Components)
cat "C:\Users\SBS\Desktop\ui plan\New folder (6)\SECTION_10_UI_COMPONENT_SYSTEM_50X.md"
```

---

## THE 10X MINDSET (FROM MASTERPLAN)

```
"This is not a UI refresh. This is a STATEMENT.

When a developer lands on OLYMPUS, they should feel like they've stepped
into the future. The 40-agent visualization should blow their mind. The
real-time streaming should make them forget other tools exist. The quality
scoring should make them trust the output.

Every pixel matters. Every animation matters. Every interaction matters.

We're not building a tool. We're building an EXPERIENCE."
```

---

**Protocol Version:** 1.0
**Created:** January 26, 2026
**Masterplan Version:** 2.0

---

# ALWAYS READ THIS FILE FIRST. ALWAYS FOLLOW THE MASTERPLAN.

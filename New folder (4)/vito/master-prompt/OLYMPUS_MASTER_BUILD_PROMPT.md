# 🚀 OLYMPUS MASTER BUILD PROMPT
## Build: OLYMPUS 2.0 Marketing Website + Dashboard

> **THIS IS A COMPLETE SPECIFICATION. NO DECISIONS REQUIRED.**
> **EXECUTE EXACTLY AS WRITTEN. NO DEVIATIONS.**
> **ALL 22 SECTIONS MUST BE IMPLEMENTED.**

---

## BUILD METADATA

```yaml
project_name: "OLYMPUS 2.0 Marketing & Dashboard"
project_type: "marketing_website_with_dashboard"
tech_stack: "nextjs_14_typescript_tailwind_shadcn"
design_style: "glassmorphism_dark_premium"
total_pages: 18
total_components: 45+
completion_requirement: "100% - No partial delivery"
```

---

# SECTION 1: PROJECT OVERVIEW

## What We're Building

OLYMPUS 2.0 is an AI code generation platform. This build creates:

1. **Marketing Website** - Convert visitors to users
2. **Authentication** - Login, signup, password reset
3. **Dashboard** - User workspace after login
4. **Build Experience** - Watch AI agents work in real-time

## The Promise

"40 AI agents build your complete application while you watch in real-time."

## Target Audience

- Developers who want to ship faster
- Founders who need MVPs quickly
- Teams who want to automate repetitive code

---

# SECTION 2: TECH STACK (Mandatory)

```yaml
framework: Next.js 14 (App Router)
language: TypeScript (strict mode)
styling: Tailwind CSS 3.4
components: shadcn/ui (install ALL needed)
animations: Framer Motion
icons: Lucide React
forms: React Hook Form + Zod
state: Zustand (global) + React Query (server)
charts: Recharts
fonts:
  - Inter (sans-serif, primary)
  - JetBrains Mono (monospace, code)
```

## Installation Commands (Execute First)

```bash
# shadcn/ui components - install ALL
npx shadcn@latest add button card input textarea dialog sheet toast tabs table badge avatar skeleton progress select checkbox switch dropdown-menu navigation-menu command popover tooltip accordion alert separator scroll-area

# Additional packages
npm install framer-motion zustand @tanstack/react-query recharts lucide-react react-hook-form zod @hookform/resolvers clsx tailwind-merge class-variance-authority
```

---

# SECTION 3: DESIGN SYSTEM (Mandatory)

## 3.1 Colors

```typescript
// tailwind.config.ts - colors
const colors = {
  // Backgrounds
  background: {
    DEFAULT: '#0A0A0F',
    secondary: '#12121A',
    tertiary: '#1A1A25',
  },
  
  // Primary (Purple)
  primary: {
    DEFAULT: '#8B5CF6',
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  
  // Accent (Pink)
  accent: {
    DEFAULT: '#EC4899',
    500: '#EC4899',
    600: '#DB2777',
  },
  
  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Text
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
  },
  
  // Border
  border: {
    DEFAULT: '#27272A',
    light: '#3F3F46',
  },
}
```

## 3.2 Typography

```css
/* Typography Scale - MANDATORY SIZES */

/* Display - Hero headlines only */
.text-display {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.0;
}

/* H1 - Page titles */
.text-h1 {
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

/* H2 - Section titles */
.text-h2 {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

/* H3 - Card titles */
.text-h3 {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
}

/* Body Large */
.text-body-lg {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.6;
}

/* Body - Default paragraph */
.text-body {
  font-size: 18px; /* MINIMUM 18px - never smaller for body */
  font-weight: 400;
  line-height: 1.6;
}

/* Body Small - Secondary text */
.text-body-sm {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

/* Caption */
.text-caption {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
}
```

## 3.3 Glassmorphism (MANDATORY for all cards)

```css
/* Glass Card - Use for ALL cards and panels */
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

/* Glass Card - Stronger variant */
.glass-strong {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
}

/* Glass Input */
.glass-input {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

/* Glass Button */
.glass-button {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}
```

## 3.4 Gradients

```css
/* Primary Gradient - Buttons, accents */
.gradient-primary {
  background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
}

/* Text Gradient */
.text-gradient {
  background: linear-gradient(135deg, #FFFFFF 0%, #A78BFA 50%, #EC4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glow Effect */
.glow {
  box-shadow: 0 0 40px rgba(139, 92, 246, 0.3);
}

.glow-strong {
  box-shadow: 0 0 60px rgba(139, 92, 246, 0.4), 0 0 120px rgba(236, 72, 153, 0.2);
}
```

## 3.5 Animations (Use Framer Motion)

```typescript
// animation-variants.ts

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 30 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
};

export const fadeInScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5 }
};

export const slideInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.5 }
};

// Hover effects
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400 }
};

export const hoverGlow = {
  whileHover: { 
    boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)",
    borderColor: "rgba(139, 92, 246, 0.5)"
  },
  transition: { duration: 0.3 }
};
```

---

# SECTION 4: PAGE STRUCTURE (Complete List)

## 4.1 Public Pages (No Auth)

| # | Path | Name | Priority |
|---|------|------|----------|
| 1 | `/` | Landing Page | P0 |
| 2 | `/features` | Features Page | P0 |
| 3 | `/pricing` | Pricing Page | P0 |
| 4 | `/about` | About Page | P1 |
| 5 | `/contact` | Contact Page | P1 |
| 6 | `/privacy` | Privacy Policy | P1 |
| 7 | `/terms` | Terms of Service | P1 |

## 4.2 Auth Pages

| # | Path | Name | Priority |
|---|------|------|----------|
| 8 | `/login` | Login | P0 |
| 9 | `/signup` | Sign Up | P0 |
| 10 | `/forgot-password` | Forgot Password | P1 |

## 4.3 Dashboard Pages (Auth Required)

| # | Path | Name | Priority |
|---|------|------|----------|
| 11 | `/dashboard` | Dashboard Home | P0 |
| 12 | `/dashboard/builds` | Build List | P0 |
| 13 | `/dashboard/builds/new` | New Build | P0 |
| 14 | `/dashboard/builds/[id]` | Build Detail | P0 |
| 15 | `/dashboard/templates` | Templates | P1 |
| 16 | `/dashboard/settings` | Settings | P1 |
| 17 | `/dashboard/settings/billing` | Billing | P2 |
| 18 | `/dashboard/settings/api` | API Keys | P2 |

---

# SECTION 5: LANDING PAGE SPECIFICATION

## 5.1 Hero Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]                           Features  Pricing  Docs    [Login] [CTA] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              [Floating 3D shapes in background]             │
│                                                                             │
│                                                                             │
│                         THE AI ARMY THAT                                   │
│                         BUILDS YOUR VISION                                 │
│                                                                             │
│                    (96px font, gradient text, centered)                    │
│                                                                             │
│                                                                             │
│             From idea to production in minutes. 40 AI agents               │
│             collaborate to build your complete application.                │
│                                                                             │
│                    (20px font, text-secondary, max-w-2xl)                  │
│                                                                             │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │                      GLASSMORPHISM CARD                        │    │
│     │                                                                 │    │
│     │   ┌─────────────────────────────────────────────────────────┐  │    │
│     │   │                                                         │  │    │
│     │   │   Describe what you want to build...                   │  │    │
│     │   │                                                         │  │    │
│     │   │   (textarea, 3 lines, glassmorphism input)             │  │    │
│     │   │                                                         │  │    │
│     │   └─────────────────────────────────────────────────────────┘  │    │
│     │                                                                 │    │
│     │   [SaaS Dashboard] [Landing Page] [E-commerce] [Admin Panel]   │    │
│     │   (small pills, clickable, fill textarea with example)         │    │
│     │                                                                 │    │
│     │                                          [✨ Start Building →]  │    │
│     │                                          (gradient button)     │    │
│     │                                                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                                                                             │
│                 No credit card required · 3 free builds                    │
│                                                                             │
│                                                                             │
│                            Trusted by developers at                        │
│     [Vercel]   [Supabase]   [Stripe]   [GitHub]   [Linear]                │
│     (grayscale logos, opacity 50%, hover full opacity)                     │
│                                                                             │
│                                                                             │
│                              ↓ Scroll to explore                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hero Component Code Structure

```typescript
// components/landing/hero.tsx

interface HeroProps {}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[128px]" />
      </div>
      
      {/* Content */}
      <motion.div 
        className="relative z-10 text-center max-w-5xl mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Headline */}
        <motion.h1 
          className="text-display text-gradient mb-6"
          variants={fadeInUp}
        >
          The AI Army That<br />Builds Your Vision
        </motion.h1>
        
        {/* Subheadline */}
        <motion.p 
          className="text-body-lg text-secondary max-w-2xl mx-auto mb-12"
          variants={fadeInUp}
        >
          From idea to production in minutes. 40 AI agents collaborate 
          to build your complete application while you watch.
        </motion.p>
        
        {/* Prompt Card */}
        <motion.div 
          className="glass-strong p-8 max-w-2xl mx-auto"
          variants={fadeInUp}
        >
          <PromptInput />
          <QuickStartPills />
          <SubmitButton />
        </motion.div>
        
        {/* Trust Signals */}
        <motion.div variants={fadeInUp}>
          <TrustBadges />
        </motion.div>
      </motion.div>
      
      {/* Scroll Indicator */}
      <ScrollIndicator />
    </section>
  );
}
```

## 5.2 Social Proof Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│     │                 │  │                 │  │                 │         │
│     │     12,847      │  │     < 5 min     │  │      99.7%      │         │
│     │   apps built    │  │   average time  │  │  success rate   │         │
│     │                 │  │                 │  │                 │         │
│     │ (animated count)│  │                 │  │                 │         │
│     └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                             │
│     (Glass cards, large numbers, subtle descriptions)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.3 How It Works Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           How It Works                                     │
│                                                                             │
│         From your idea to a deployed app in three simple steps.            │
│                                                                             │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │                     │  │                     │  │                     │ │
│  │    [ICON: Edit]     │  │   [ICON: Cpu]       │  │   [ICON: Rocket]    │ │
│  │                     │  │                     │  │                     │ │
│  │         1           │  │         2           │  │         3           │ │
│  │      Describe       │  │       Build         │  │      Deploy         │ │
│  │                     │  │                     │  │                     │ │
│  │  Tell us what you   │  │  40 specialized     │  │  One click to       │ │
│  │  want in plain      │  │  AI agents create   │  │  deploy anywhere.   │ │
│  │  English.           │  │  your complete app. │  │  Vercel, Netlify,   │ │
│  │                     │  │                     │  │  or download.       │ │
│  │                     │  │                     │  │                     │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  (Glass cards, icons from Lucide, connecting dotted line between cards)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.4 Features Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        Built for Builders                                  │
│                                                                             │
│            Everything you need to go from idea to production.              │
│                                                                             │
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                │
│  │  [Icon: Users]           │  │  [Icon: Zap]             │                │
│  │                          │  │                          │                │
│  │  40 AI Agents            │  │  Real-Time Building      │                │
│  │                          │  │                          │                │
│  │  Specialized experts     │  │  Watch your app come     │                │
│  │  for every task.         │  │  to life as it's built.  │                │
│  └──────────────────────────┘  └──────────────────────────┘                │
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                │
│  │  [Icon: Rocket]          │  │  [Icon: Shield]          │                │
│  │                          │  │                          │                │
│  │  One-Click Deploy        │  │  Enterprise Ready        │                │
│  │                          │  │                          │                │
│  │  Deploy to Vercel,       │  │  SOC2 compliant,         │                │
│  │  Netlify, or more.       │  │  team ready, SSO.        │                │
│  └──────────────────────────┘  └──────────────────────────┘                │
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                │
│  │  [Icon: CheckCircle]     │  │  [Icon: Code]            │                │
│  │                          │  │                          │                │
│  │  Quality Scoring         │  │  Full-Stack Ready        │                │
│  │                          │  │                          │                │
│  │  Built-in code quality   │  │  Frontend, backend,      │                │
│  │  and security checks.    │  │  database, auth, APIs.   │                │
│  └──────────────────────────┘  └──────────────────────────┘                │
│                                                                             │
│  (2x3 grid of glass cards, icons top-left, hover glow effect)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.5 Pricing Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                     Simple, Transparent Pricing                            │
│                                                                             │
│                  Start free. Scale when you're ready.                      │
│                                                                             │
│                                                                             │
│              [Monthly]  ○────────●  [Yearly -20%]                          │
│                                                                             │
│                                                                             │
│  ┌───────────────────┐  ┌─────────────────────────┐  ┌───────────────────┐ │
│  │                   │  │  ┌─────────────────┐    │  │                   │ │
│  │      STARTER      │  │  │  MOST POPULAR   │    │  │    ENTERPRISE    │ │
│  │                   │  │  └─────────────────┘    │  │                   │ │
│  │       Free        │  │                         │  │      Custom       │ │
│  │                   │  │         PRO             │  │                   │ │
│  │  ────────────     │  │                         │  │  ────────────     │ │
│  │                   │  │      $49/month          │  │                   │ │
│  │  ✓ 3 builds/mo    │  │                         │  │  Everything in    │ │
│  │  ✓ Basic features │  │  ────────────           │  │  Pro, plus:       │ │
│  │  ✓ Community      │  │                         │  │                   │ │
│  │                   │  │  ✓ 50 builds/month      │  │  ✓ Unlimited      │ │
│  │                   │  │  ✓ All features         │  │  ✓ Custom agents  │ │
│  │                   │  │  ✓ Priority support     │  │  ✓ SSO/SAML       │ │
│  │                   │  │  ✓ API access           │  │  ✓ SLA 99.9%      │ │
│  │                   │  │  ✓ Team (3 seats)       │  │  ✓ Dedicated      │ │
│  │                   │  │  ✓ GitHub sync          │  │                   │ │
│  │                   │  │                         │  │                   │ │
│  │   [Get Started]   │  │   [Start Free Trial]    │  │  [Contact Sales]  │ │
│  │                   │  │                         │  │                   │ │
│  └───────────────────┘  └─────────────────────────┘  └───────────────────┘ │
│                                                                             │
│  (Pro card: elevated, glowing border, larger)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.6 Testimonials Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        Loved by Developers                                 │
│                                                                             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  "I built my entire SaaS MVP in a weekend. The output quality is     │ │
│  │   insane - it's not just generating code, it's thinking like a       │ │
│  │   team of senior developers."                                         │ │
│  │                                                                       │ │
│  │   [Avatar]  Sarah Chen                                                │ │
│  │             Founder, TaskFlow                                         │ │
│  │             ⭐⭐⭐⭐⭐                                                  │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                            ←  ● ○ ○  →                                     │
│                                                                             │
│  (Carousel, glass card, auto-rotate every 5 seconds)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.7 CTA Section

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                                                                             │
│                 Ready to Build Something Amazing?                          │
│                                                                             │
│          Join 10,000+ developers shipping faster with OLYMPUS.             │
│                                                                             │
│                                                                             │
│                      [✨ Start Building Free →]                            │
│                                                                             │
│                       No credit card required                              │
│                                                                             │
│                                                                             │
│  (Centered, gradient glow background, button with glow)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.8 Footer

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [OLYMPUS]            Product         Resources       Company      Legal   │
│                       ────────        ─────────       ───────      ─────   │
│  The AI army that     Features        Docs            About        Privacy │
│  builds your vision.  Pricing         API Reference   Careers      Terms   │
│  40 agents. 9 phases. Demo            Examples        Contact      Security│
│  Zero compromise.     Changelog       Blog            Press                │
│                                                                             │
│  [GitHub] [Twitter] [Discord] [LinkedIn]                                   │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Stay updated                                                              │
│  Get notified about new features and updates.                             │
│                                                                             │
│  [your@email.com                              ] [Subscribe →]              │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  © 2026 OLYMPUS. All rights reserved.            🟢 All systems operational│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Footer Link Requirements (ALL MUST WORK)

```typescript
// All footer links must point to real pages

const footerLinks = {
  product: [
    { name: "Features", href: "/features" },      // PAGE EXISTS
    { name: "Pricing", href: "/pricing" },        // PAGE EXISTS
    { name: "Demo", href: "/dashboard/builds/new" }, // REDIRECT TO BUILD
    { name: "Changelog", href: "/changelog" },    // CREATE SIMPLE PAGE
  ],
  resources: [
    { name: "Docs", href: "/docs" },              // CREATE SIMPLE PAGE
    { name: "API Reference", href: "/docs/api" }, // CREATE SIMPLE PAGE
    { name: "Examples", href: "/docs/examples" }, // CREATE SIMPLE PAGE
    { name: "Blog", href: "/blog" },              // CREATE SIMPLE PAGE
  ],
  company: [
    { name: "About", href: "/about" },            // PAGE EXISTS
    { name: "Careers", href: "/careers" },        // CREATE SIMPLE PAGE
    { name: "Contact", href: "/contact" },        // PAGE EXISTS
    { name: "Press", href: "/press" },            // CREATE SIMPLE PAGE
  ],
  legal: [
    { name: "Privacy", href: "/privacy" },        // PAGE EXISTS
    { name: "Terms", href: "/terms" },            // PAGE EXISTS
    { name: "Security", href: "/security" },      // CREATE SIMPLE PAGE
  ],
};
```

---

# SECTION 6: FEATURES PAGE

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Navigation - same as landing]                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                      Powerful Features for                                 │
│                      Modern Development                                    │
│                                                                             │
│             Everything you need to ship faster than ever.                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FEATURE 1: 40 AI Agents                                                   │
│  ─────────────────────────                                                 │
│                                                                             │
│  [Large illustration/diagram of agent network]                             │
│                                                                             │
│  Unlike single-LLM tools, OLYMPUS deploys specialized experts:             │
│                                                                             │
│  • ORACLE - Market research                                                │
│  • PIXEL - UI components                                                   │
│  • SENTINEL - Security scanning                                            │
│  • ... (show 6-8 key agents)                                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FEATURE 2: Real-Time Building                                             │
│  ─────────────────────────────                                             │
│                                                                             │
│  [Screenshot/GIF of build in progress]                                     │
│                                                                             │
│  Watch every line of code appear as agents work.                           │
│  See exactly what's happening at every moment.                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FEATURE 3: One-Click Deployment                                           │
│  ─────────────────────────────────                                         │
│                                                                             │
│  [Icons: Vercel, Netlify, Railway, AWS, GCP, Docker]                       │
│                                                                             │
│  Deploy to any platform instantly.                                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [CTA: Start Building Free →]                                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Footer - same as landing]                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 7: PRICING PAGE

Same content as landing page pricing section, but:
- Full page
- More detailed feature comparison table
- FAQ section at bottom
- Enterprise contact form

---

# SECTION 8: AUTH PAGES

## 8.1 Login Page

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    [Background: Gradient mesh + blur]                      │
│                                                                             │
│                                                                             │
│                          [OLYMPUS Logo]                                    │
│                                                                             │
│                        Welcome back                                        │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                 │    │
│     │                      GLASSMORPHISM CARD                        │    │
│     │                                                                 │    │
│     │   Email                                                        │    │
│     │   ┌─────────────────────────────────────────────────────────┐  │    │
│     │   │ your@email.com                                          │  │    │
│     │   └─────────────────────────────────────────────────────────┘  │    │
│     │                                                                 │    │
│     │   Password                                                     │    │
│     │   ┌─────────────────────────────────────────────────────────┐  │    │
│     │   │ ••••••••                                           [👁] │  │    │
│     │   └─────────────────────────────────────────────────────────┘  │    │
│     │                                                                 │    │
│     │   [Forgot password?]                                           │    │
│     │                                                                 │    │
│     │   [────────────── Sign In ──────────────]                      │    │
│     │   (gradient button, full width)                                │    │
│     │                                                                 │    │
│     │   ──────────────── or ────────────────                         │    │
│     │                                                                 │    │
│     │   [G] Continue with Google                                     │    │
│     │   [GH] Continue with GitHub                                    │    │
│     │                                                                 │    │
│     │   ─────────────────────────────────────                        │    │
│     │                                                                 │    │
│     │   Don't have an account? [Sign up]                             │    │
│     │                                                                 │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Signup Page

Same layout as login, with:
- Name field added
- "Already have an account? Sign in" at bottom
- Terms checkbox

---

# SECTION 9: DASHBOARD HOME

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Dashboard  Builds  Templates  Settings              [User Menu ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Welcome back, [Name] 👋                                    January 2026   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │   What do you want to build?                                         │ │
│  │                                                                       │ │
│  │   ┌─────────────────────────────────────────────────────────────┐    │ │
│  │   │ Describe your app...                               [Build →]│    │ │
│  │   └─────────────────────────────────────────────────────────────┘    │ │
│  │                                                                       │ │
│  │   Quick: [SaaS] [Dashboard] [E-commerce] [Landing Page]              │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │      24      │ │      18      │ │   $127.50    │ │     94%      │      │
│  │ Total Builds │ │ This Month   │ │Credits Used  │ │Success Rate  │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                             │
│  Recent Builds                                            [View All →]     │
│  ─────────────                                                             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ✅  SaaS Dashboard        12 features  •  8m 23s  •  92/100  [View]  │ │
│  │ ✅  Landing Page          5 features   •  2m 11s  •  96/100  [View]  │ │
│  │ 🔵  E-commerce            building...  •  4m 12s  •  --      [View]  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 10: BUILD LIST PAGE

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Navigation]                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Builds                                              [+ New Build]         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [Search builds...]           [All Status ▼] [All Time ▼] [Sort: ▼]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  SaaS Dashboard                                                       │ │
│  │  "Build a team collaboration tool with real-time..."                  │ │
│  │  ✅ Completed  •  12 features  •  8m 23s  •  92/100                   │ │
│  │  January 25, 2026                                                     │ │
│  │                                             [View] [Clone] [Delete]   │ │
│  │                                                                       │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │                                                                       │ │
│  │  Landing Page                                                         │ │
│  │  "Create a modern landing page for my AI startup..."                  │ │
│  │  ✅ Completed  •  5 features  •  2m 11s  •  96/100                    │ │
│  │  January 24, 2026                                                     │ │
│  │                                             [View] [Clone] [Delete]   │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [← Previous]                    Page 1 of 3                  [Next →]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 11: NEW BUILD PAGE

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Navigation]                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          Start a New Build                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │   1. Describe Your App                                               │ │
│  │   ─────────────────────                                              │ │
│  │                                                                       │ │
│  │   ┌─────────────────────────────────────────────────────────────┐    │ │
│  │   │                                                             │    │ │
│  │   │ Describe in detail what you want to build...               │    │ │
│  │   │                                                             │    │ │
│  │   │ Include:                                                    │    │ │
│  │   │ • What the app does                                        │    │ │
│  │   │ • Key features                                             │    │ │
│  │   │ • User types                                               │    │ │
│  │   │ • Any specific requirements                                │    │ │
│  │   │                                                             │    │ │
│  │   │                                              500/5000 chars │    │ │
│  │   └─────────────────────────────────────────────────────────────┘    │ │
│  │                                                                       │ │
│  │   Quick start templates:                                             │ │
│  │   [SaaS Dashboard] [E-commerce] [Landing Page] [Admin Panel]         │ │
│  │   [Blog Platform] [Portfolio] [Documentation] [API Backend]          │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │   2. Configuration (Optional)                                        │ │
│  │   ───────────────────────────                                        │ │
│  │                                                                       │ │
│  │   Tech Stack:  [Next.js ▼]    Database:  [Supabase ▼]               │ │
│  │   Styling:     [Tailwind ▼]   Auth:      [Supabase Auth ▼]          │ │
│  │                                                                       │ │
│  │   [x] Include tests          [x] Include documentation               │ │
│  │   [x] TypeScript strict      [ ] Deploy automatically                │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                                             │
│                         [✨ Start Building →]                              │
│                                                                             │
│                    Estimated time: 5-10 minutes                            │
│                    This will use 1 of your 3 free builds                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 12: BUILD DETAIL PAGE (Most Important!)

```
LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Navigation]                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ← Back to Builds                                                          │
│                                                                             │
│  SaaS Dashboard                               [⏸ Pause] [⏹ Stop] [⟳ Retry]│
│  Started 3m 24s ago                                                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Phase 5/9 • Frontend                                            65%  │ │
│  │ ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [Overview] [Agents] [Code] [Preview] [Logs] [Quality]                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OVERVIEW TAB:                                                             │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐   │
│  │ Current Phase                  │  │ Active Agent                   │   │
│  │                                │  │                                │   │
│  │ FRONTEND                       │  │ PIXEL                          │   │
│  │ Building user interfaces       │  │ Writing components...          │   │
│  │                                │  │ UserDashboard.tsx              │   │
│  └────────────────────────────────┘  └────────────────────────────────┘   │
│                                                                             │
│  Phase Progress                                                            │
│  ─────────────                                                             │
│                                                                             │
│  ✅ Discovery      38s   ✅ Conversion    22s   ✅ Design       1m 12s    │
│  ✅ Architecture   45s   🔵 Frontend   2m 11s   ⚪ Backend      --        │
│  ⚪ Integration     --   ⚪ Testing       --    ⚪ Deployment    --        │
│                                                                             │
│  Live Output                                                               │
│  ───────────                                                               │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ // UserDashboard.tsx                                                 │ │
│  │ import { useState } from 'react'                                     │ │
│  │ import { Card } from '@/components/ui'                               │ │
│  │                                                                       │ │
│  │ export function UserDashboard() {                                    │ │
│  │   const [user, setUser] = useState<User>()█                         │ │
│  │                                                                       │ │
│  │ (code appearing character by character)                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

AGENTS TAB:
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  DISCOVERY PHASE                                              ✅ Complete │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │ ORACLE │ │EMPATHY │ │STRATEGOS│ │ SCOPE  │ │VENTURE │                 │
│  │   ✅   │ │   ✅   │ │   ✅    │ │   ✅   │ │   ✅   │                 │
│  │  38s   │ │  22s   │ │  45s    │ │  18s   │ │  31s   │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                                           │
│  FRONTEND PHASE                                               🔵 Running │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │ PIXEL  │ │  WIRE  │ │ POLISH │ │ SPEED  │ │  FORM  │                 │
│  │   🔵   │ │   ⚪   │ │   ⚪   │ │   ⚪   │ │   ⚪   │                 │
│  │ 2m 11s │ │   --   │ │   --   │ │   --   │ │   --   │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

CODE TAB:
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  ┌─────────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ 📁 src                  │  │ // UserDashboard.tsx                   │ │
│  │   📁 app                │  │                                        │ │
│  │     📄 layout.tsx       │  │ import { useState } from 'react'       │ │
│  │     📄 page.tsx         │  │                                        │ │
│  │   📁 components         │  │ export function UserDashboard() {      │ │
│  │     📁 ui               │  │   // ... code with syntax highlighting │ │
│  │       📄 Button.tsx     │  │ }                                      │ │
│  │       📄 Card.tsx       │  │                                        │ │
│  │     📁 dashboard        │  │                                        │ │
│  │       📄 UserDash...    │  │ [Copy] [Download]                      │ │
│  │                         │  │                                        │ │
│  │ 42 files • 156 KB       │  │                                        │ │
│  └─────────────────────────┘  └────────────────────────────────────────┘ │
│                                                                           │
│                                              [Download ZIP] [Push to Git] │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

PREVIEW TAB:
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  [🖥 Desktop] [📱 Tablet] [📱 Mobile]                    [↗ Open New Tab] │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │                    [LIVE IFRAME PREVIEW]                         │   │
│  │                                                                   │   │
│  │              Updates in real-time as code is generated           │   │
│  │                                                                   │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

QUALITY TAB:
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                        QUALITY SCORE: 92/100                             │
│                                                                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                │
│  │ Code Quality   │ │ Security       │ │ Performance    │                │
│  │     95%        │ │     98%        │ │     88%        │                │
│  └────────────────┘ └────────────────┘ └────────────────┘                │
│                                                                           │
│  ✅ TypeScript strict mode enabled                                       │
│  ✅ All components properly typed                                        │
│  ✅ Error boundaries implemented                                         │
│  ✅ Loading states on all async operations                               │
│  ⚠️ Consider adding more loading skeletons                               │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 13-18: ADDITIONAL PAGES

## 13. Templates Page
- Grid of template cards
- Categories: SaaS, E-commerce, Landing, Admin, etc.
- Preview + "Use This" button

## 14. Settings Page
- Profile section (name, email, avatar)
- Notification preferences
- Theme toggle (dark/light)
- Delete account

## 15. About Page
- Company story
- Mission statement
- Team section (optional)

## 16. Contact Page
- Contact form (name, email, message)
- Email address
- Response time expectation

## 17. Privacy Page
- Standard privacy policy text
- Last updated date

## 18. Terms Page
- Standard terms of service text
- Last updated date

---

# SECTION 19: COMPONENT LIBRARY

## Required Components (Build All)

```
CORE UI:
├── Button (variants: primary, secondary, ghost, link)
├── Card (with Header, Content, Footer)
├── Input (with label, error state)
├── Textarea (with label, char count)
├── Select (with options)
├── Checkbox
├── Switch
├── Avatar
├── Badge (variants: success, warning, error, info)
├── Skeleton (for loading states)
├── Progress (linear bar)
└── Toast (notifications)

LAYOUT:
├── Container (max-width, padding)
├── Section (vertical spacing)
├── Grid (responsive columns)
└── Stack (vertical/horizontal spacing)

NAVIGATION:
├── Navbar (logo, links, user menu)
├── Sidebar (dashboard navigation)
├── Footer (links, social, newsletter)
├── Breadcrumb
└── Tabs

LANDING:
├── Hero (headline, subheadline, CTA)
├── FeatureCard
├── PricingCard
├── TestimonialCard
├── StatCard
└── TrustLogos

DASHBOARD:
├── DashboardLayout
├── StatsGrid
├── BuildCard
├── BuildProgress
├── AgentCard
├── AgentGrid
├── PhaseIndicator
├── CodeViewer
├── PreviewFrame
└── QualityScore

FORMS:
├── LoginForm
├── SignupForm
├── ForgotPasswordForm
├── ContactForm
├── PromptInput
└── SearchInput
```

---

# SECTION 20: RESPONSIVE BREAKPOINTS

```css
/* Tailwind breakpoints - USE THESE */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */

/* Mobile-first approach */
/* Default styles = mobile */
/* Then add md:, lg:, xl: for larger screens */
```

---

# SECTION 21: ACCESSIBILITY REQUIREMENTS

```
MANDATORY:
□ All images have alt text
□ All form inputs have labels
□ Color contrast ratio ≥ 4.5:1
□ Focus states visible on all interactive elements
□ Keyboard navigation works (Tab, Enter, Escape)
□ ARIA labels on icon-only buttons
□ Skip to main content link
□ Heading hierarchy (h1 → h2 → h3, etc.)
```

---

# SECTION 22: FINAL CHECKLIST

## Before Marking Complete

```
EVERY PAGE MUST HAVE:
□ Responsive design (mobile to desktop)
□ Glassmorphism cards where applicable
□ Proper typography sizes (body ≥ 18px)
□ Loading states
□ Error states
□ Animations (Framer Motion)
□ Dark theme consistency
□ All links working

OVERALL PROJECT MUST HAVE:
□ All 18 pages created
□ All 45+ components created
□ Navigation works between all pages
□ Footer links all work
□ Forms validate and show feedback
□ Dashboard layout consistent
□ Auth flow complete (login → dashboard)
□ No placeholder text (real content)
□ No broken images
□ No console errors
```

---

# EXECUTION INSTRUCTIONS

```
THIS PROMPT IS COMPLETE AND FINAL.

DO NOT:
- Skip any section
- Make design decisions outside this spec
- Use different colors than specified
- Use smaller typography than specified
- Skip glassmorphism on cards
- Leave broken links
- Leave placeholder content

DO:
- Follow every specification exactly
- Build all 18 pages
- Build all components
- Apply the design system consistently
- Test all links work
- Ensure responsive design
- Add animations with Framer Motion

DELIVERY:
- 100% complete
- No partial delivery
- All pages functional
- All links working
- Production ready
```

---

# THIS IS NOT A GUIDE. THIS IS THE BUILD SPEC.
# EXECUTE EXACTLY AS WRITTEN.
# NO INTERPRETATION. NO DECISIONS. JUST BUILD.
